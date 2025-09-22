const path = require('path');
const fs = require('fs');
const TestDataManager = require('../utils/TestDataManager');
const VisualTesting = require('../utils/VisualTesting');

// Shared VisualTesting instance to prevent duplicate configuration logging
let sharedVisualTesting = null;

class BaseActions {
    constructor(config) {
        this.config = config;
        this.objectMap = null;
        this.variableMap = null;
        this.testDataManager = null;
        this.visualTesting = null;
        this.currentTest = null;
        this.currentAction = null;
        
        // Load object map
        if (config && config.object_map_external) {
            const objectMapPath = path.resolve(process.cwd(), config.object_map_external);
            try {
                this.objectMap = JSON.parse(fs.readFileSync(objectMapPath, 'utf8'));
            } catch (e) {
                console.error('Failed to load object map:', e);
                this.objectMap = {};
            }
        }

        // Load variable map
        if (config && config.variable_map_external) {
            const variableMapPath = path.resolve(process.cwd(), config.variable_map_external);
            try {
                this.variableMap = JSON.parse(fs.readFileSync(variableMapPath, 'utf8'));
            } catch (e) {
                console.error('Failed to load variable map:', e);
                this.variableMap = {};
            }
        }

        // Initialize TestDataManager with both variable and object maps
        this.testDataManager = new TestDataManager(this.variableMap || {}, this.objectMap || {});
        
        // Use shared VisualTesting instance to prevent duplicate logging
        // Only initialize if visual testing is enabled
        if (config?.visual_testing_enabled !== false) {
            if (!sharedVisualTesting) {
                sharedVisualTesting = new VisualTesting(config);
            }
            this.visualTesting = sharedVisualTesting;
        } else {
            // Visual testing is disabled - use null to avoid initialization
            this.visualTesting = null;
        }
    }

    /**
     * Set current test context for visual testing baseline naming
     * @param {string} testName - Current test name
     * @param {string} actionName - Current action name
     */
    setCurrentContext(testName, actionName) {
        this.currentTest = testName;
        this.currentAction = actionName;
    }

    /**
     * Process action parameters and extract common parameters
     * @param {Object} actionConfig - The action configuration
     * @param {Object} actionParameters - The action parameters
     * @returns {Object} - Processed parameters with defaults
     */
    processActionParameters(actionConfig = {}, actionParameters = {}) {
        return {
            take_screenshot: actionParameters.take_screenshot || actionConfig.take_screenshot || 'no',
            timeout: parseInt(actionParameters.timeout || actionConfig.timeout || '5000'),
            visual_check: actionParameters.visual_check || 'no'
        };
    }

    /**
     * Handle screenshot functionality
     * @param {string} actionName - Name of the action
     * @param {Object} params - Processed action parameters
     * @param {Object} result - Action result
     * @param {Object} page - Playwright page object
     */
    async handleScreenshot(actionName, params, result, page) {
        if ((params.take_screenshot === 'yes' || 
            (params.take_screenshot === 'on_failure' && result.result === 'FAIL')) && page) {
            try {
                const timestamp = new Date().toISOString().replace(/:/g, '-');
                const status = result.result.toLowerCase();
                const screenshotPath = path.join(
                    this.config.test_report_path || './test-reports',
                    'screenshots',
                    `${actionName}_${status}_${timestamp}.png`
                );
                await fs.promises.mkdir(path.dirname(screenshotPath), { recursive: true });
                await page.screenshot({ path: screenshotPath, fullPage: true });
                result.screenshotPath = screenshotPath;
            } catch (error) {
                console.error(`Failed to take screenshot for ${actionName}:`, error);
            }
        }
        return result;
    }

    /**
     * Handle visual testing functionality
     * @param {string} actionName - Name of the action
     * @param {Object} actionConfig - Action configuration
     * @param {Object} params - Processed action parameters
     * @param {Object} page - Playwright page object
     * @returns {Object} - Visual testing result
     */
    async handleVisualTesting(actionName, actionConfig, params, page, actionIndex = 0) {
        if (params.visual_check === 'yes' && page) {
            try {
                // Use the enhanced baseline generation with context
                const visualResult = await this.visualTesting.performVisualCheck(
                    page, 
                    this.currentTest || 'unknown_test',
                    actionName,
                    actionConfig,
                    actionIndex
                );

                return visualResult;
            } catch (error) {
                return {
                    status: 'ERROR',
                    message: `Visual testing failed: ${error.message}`,
                    error: error.message
                };
            }
        }
        return null;
    }

    getSelector(elementKey) {
        if (!this.objectMap || !elementKey) {
            throw new Error('Object map or element key is missing');
        }
        const element = this.objectMap[elementKey];
        if (!element) {
            throw new Error(`Element '${elementKey}' not found in object map`);
        }
        if (element.locator_name === 'xpath') {
            return `xpath=${element.locator_value}`;
        }
        return element.locator_value;
    }

    // Process action config to substitute variables and object map references
    processConfig(actionConfig) {
        return this.testDataManager.processActionConfig(actionConfig);
    }

    /**
     * Reset shared VisualTesting instance for new test runs
     * @param {Object} config - New configuration for visual testing
     */
    static resetVisualTesting(config) {
        sharedVisualTesting = new VisualTesting(config);
        return sharedVisualTesting;
    }

    /**
     * Update shared VisualTesting instance configuration (for hybrid mode setup)
     * @param {Object} config - Updated configuration with runPaths
     */
    static updateVisualTestingConfig(config) {
        if (sharedVisualTesting) {
            // Update the existing instance with new configuration
            sharedVisualTesting.updateConfig(config);
        } else {
            // Create new instance if none exists
            sharedVisualTesting = new VisualTesting(config);
        }
        return sharedVisualTesting;
    }

    /**
     * Get current shared VisualTesting instance
     */
    static getSharedVisualTesting() {
        return sharedVisualTesting;
    }
}

module.exports = BaseActions;
