const { chromium } = require('@playwright/test');
const UIActions = require('../actions/UIActions');
const Reporter = require('../utils/Reporter');
const TestDataManager = require('../utils/TestDataManager');
const fs = require('fs').promises;
const path = require('path');

class Executor {
    constructor(testSuiteInfo) {
        this.uiActions = null;
        this.page = null;
        this.browser = null;
        this.reporter = new Reporter(testSuiteInfo.test_report_path);
        this.testDataManager = new TestDataManager();
        this.testSuiteInfo = testSuiteInfo;
    }

    async loadObjectMap() {
        try {
            if (this.testSuiteInfo.object_map_external) {
                const externalMap = await fs.readFile(this.testSuiteInfo.object_map_external, 'utf8');
                return { ...JSON.parse(externalMap), ...this.testSuiteInfo.object_map_internal };
            }
            return this.testSuiteInfo.object_map_internal || {};
        } catch (error) {
            console.error('Error loading object map:', error);
            return {};
        }
    }

    async executeTestCase(testCase) {
        await this.reporter.startTest(testCase.test_name);
        console.log(`Executing test case: ${testCase.test_name}`);
        
        if (testCase.execute.toLowerCase() !== 'yes') {
            await this.reporter.addStep('Skip Test', 'INFO', 'Test case execution is disabled');
            await this.reporter.endTest();
            return;
        }

        // Load variables if present
        if (testCase.variables) {
            Object.entries(testCase.variables).forEach(([key, value]) => {
                this.testDataManager.setVariable(key, value);
            });
        }

        const objectMap = await this.loadObjectMap();

        for (const action of testCase.test_actions) {
            try {
                // Process variables in action config
                const processedConfig = this.testDataManager.processActionConfig(action.action_config);
                action.action_config = processedConfig;

                const result = await this.executeAction(action, objectMap);
                await this.reporter.addStep(action.action_name, result.result, result.message);

                if (action.action_name === 'ui_open_browser' && result.page) {
                    this.page = result.page;
                    this.browser = result.browser;
                    this.uiActions = new UIActions(this.page);
                }

                // Capture screenshot for any of these conditions:
                // 1. Action failed
                // 2. Explicitly requested in action config
                // 3. Action is a verification/assertion
                if (result.result === 'FAIL' || 
                    action.action_config?.capture_screenshot || 
                    action.action_name.toLowerCase().includes('assert') || 
                    action.action_name.toLowerCase().includes('verify')) {
                    
                    const screenshotName = result.result === 'FAIL' ? 
                        `failed_${action.action_name}` : 
                        `${action.action_name}`;
                    
                    const screenshotPath = await this.reporter.captureScreenshot(this.page, screenshotName);
                    if (screenshotPath) {
                        await this.reporter.addStep('Screenshot', 'INFO', `Screenshot captured at: ${screenshotPath}`);
                    }
                }

                if (!result.continueTest) {
                    await this.reporter.addStep('Test Abort', 'FAIL', 'Test execution stopped due to failure');
                    // Always capture screenshot on test abortion
                    await this.reporter.captureScreenshot(this.page, 'test_abort');
                    break;
                }
            } catch (error) {
                await this.reporter.addStep(action.action_name, 'FAIL', `Error: ${error.message}`);
                await this.reporter.captureScreenshot(this.page, `error_${action.action_name}`);
                break;
            }
        }

        if (this.browser) {
            await this.browser.close();
        }

        await this.reporter.endTest();
    }

    async executeAction(action, objectMap) {
        if (action.action_name === 'ui_open_browser') {
            this.uiActions = new UIActions(null);
            return await this.uiActions.uiOpenBrowser(action.action_config);
        }

        if (!this.uiActions) {
            this.uiActions = new UIActions(this.page);
        }

        switch (action.action_name) {
            case 'ui_navigate':
                return await this.uiActions.uiNavigate(action.action_config);
            case 'ui_click':
                return await this.uiActions.uiClick(action.action_config, objectMap);
            default:
                throw new Error(`Unknown action: ${action.action_name}`);
        }
    }
    async executeTests(testScript) {
        console.log(`Executing test suite: ${testScript.testifact_info.testsuite_name}`);
        console.log(`Total test cases: ${testScript.testifact_items.length}`);
        
        await this.reporter.startTestSuite(testScript.testifact_info.testsuite_name);
        
        for (const testCase of testScript.testifact_items) {
            await this.executeTestCase(testCase);
        }
        
        await this.reporter.endTestSuite();
    }
}

module.exports = Executor;