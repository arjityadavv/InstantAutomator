const { chromium, firefox, webkit } = require('@playwright/test');
const BaseActions = require('./BaseActions');
const path = require('path');
const fs = require('fs/promises');

class BrowserActions extends BaseActions {
    constructor(config) {
        super(config);
        this.browser = null;
        this.page = null;
    }

    async handleScreenshot(actionName, actionConfig, result) {
        // Take screenshot only if explicitly requested in action config or if the step failed
        if ((actionConfig.take_screenshot === 'yes' || result.result === 'FAIL') && this.page) {
            try {
                const timestamp = new Date().toISOString().replace(/:/g, '-');
                const status = result.result.toLowerCase();
                const screenshotPath = path.join(
                    this.config.test_report_path,
                    'screenshots',
                    `${actionName}_${status}_${timestamp}.png`
                );
                await fs.mkdir(path.dirname(screenshotPath), { recursive: true });
                await this.page.screenshot({ path: screenshotPath, fullPage: true });
            } catch (error) {
                console.error(`Failed to take screenshot for ${actionName}:`, error);
            }
        }
        return result;
    }

    async uiOpenBrowser(actionConfig, actionParameters = {}, actionIndex = 0) {
        try {
            const browserName = actionConfig.browser_name || 'chromium';
            const browserType = browserName === 'firefox' ? firefox :
                              browserName === 'webkit' ? webkit : chromium;

            // Process action parameters
            const params = this.processActionParameters(actionConfig, actionParameters);

            this.browser = await browserType.launch({
                headless: false
            });
            const context = await this.browser.newContext();
            this.page = await context.newPage();
            
            let result = {
                result: 'PASS',
                message: 'Browser opened successfully',
                continueTest: true
            };

            // Handle screenshot
            result = await this.handleScreenshot('ui_open_browser', params, result, this.page);

            // Handle visual testing
            const visualResult = await this.handleVisualTesting('ui_open_browser', actionConfig, params, this.page, actionIndex);
            if (visualResult) {
                result.visualResult = visualResult;
                if (visualResult.status === 'FAIL') {
                    result.result = 'FAIL';
                    result.message += ` | Visual check failed: ${visualResult.message}`;
                } else if (visualResult.status === 'BASELINE_CREATED') {
                    result.message += ` | Baseline created: ${visualResult.message}`;
                }
            }

            return result;
        } catch (e) {
            return {
                result: 'FAIL',
                message: `Failed to open browser: ${e.message}`,
                continueTest: false
            };
        }
    }

    async uiNavigate(actionConfig, actionParameters = {}) {
        try {
            if (!this.page) {
                throw new Error('No active browser page');
            }
            
            // Process config to handle {{var.keyName}} and {{obj.keyName}} substitutions
            const processedConfig = this.processConfig(actionConfig);
            
            // Process action parameters
            const params = this.processActionParameters(actionConfig, actionParameters);
            
            await this.page.goto(processedConfig.url);
            
            let result = {
                result: 'PASS',
                message: `Navigated to ${processedConfig.url} successfully`,
                continueTest: true
            };

            // Handle screenshot
            result = await this.handleScreenshot('ui_navigate', params, result, this.page);

            // Handle visual testing
            const visualResult = await this.handleVisualTesting('ui_navigate', actionConfig, params, this.page);
            if (visualResult) {
                result.visualResult = visualResult;
                if (visualResult.status === 'FAIL') {
                    result.result = 'FAIL';
                    result.message += ` | Visual check failed: ${visualResult.message}`;
                } else if (visualResult.status === 'BASELINE_CREATED') {
                    result.message += ` | Baseline created: ${visualResult.message}`;
                }
            }

            return result;
        } catch (e) {
            return {
                result: 'FAIL',
                message: `Failed to navigate: ${e.message}`,
                continueTest: false
            };
        }
    }

    async uiClick(actionConfig, actionParameters = {}) {
        try {
            if (!this.page) {
                throw new Error('No active browser page');
            }
            
            // Process config to handle {{var.keyName}} and {{obj.keyName}} substitutions
            const processedConfig = this.processConfig(actionConfig);
            
            // Process action parameters
            const params = this.processActionParameters(actionConfig, actionParameters);
            
            // Here we assume the object_name maps to a selector in the object map
            const selector = this.getSelector(processedConfig.object_name);
            await this.page.click(selector);
            
            let result = {
                result: 'PASS',
                message: `Clicked ${processedConfig.object_name} successfully`,
                continueTest: true
            };

            // Handle screenshot
            result = await this.handleScreenshot('ui_click', params, result, this.page);

            // Handle visual testing
            const visualResult = await this.handleVisualTesting('ui_click', actionConfig, params, this.page);
            if (visualResult) {
                result.visualResult = visualResult;
                if (visualResult.status === 'FAIL') {
                    result.result = 'FAIL';
                    result.message += ` | Visual check failed: ${visualResult.message}`;
                } else if (visualResult.status === 'BASELINE_CREATED') {
                    result.message += ` | Baseline created: ${visualResult.message}`;
                }
            }

            return result;
        } catch (e) {
            return {
                result: 'FAIL',
                message: `Failed to click: ${e.message}`,
                continueTest: false
            };
        }
    }

    async uiInput(actionConfig) {
        try {
            if (!this.page) {
                throw new Error('No active browser page');
            }
            
            // Process config to handle {{var.keyName}} and {{obj.keyName}} substitutions
            const processedConfig = this.processConfig(actionConfig);
            
            const selector = this.getSelector(processedConfig.element);
            await this.page.fill(selector, processedConfig.value);
            const result = {
                result: 'PASS',
                message: `Input entered in ${processedConfig.element} successfully`,
                continueTest: true
            };
            return await this.handleScreenshot('ui_input', actionConfig, result);
        } catch (e) {
            return {
                result: 'FAIL',
                message: `Failed to input text: ${e.message}`,
                continueTest: false
            };
        }
    }

    async uiWait(actionConfig) {
        try {
            const timeout = parseInt(actionConfig.timeout) || 1000;
            await this.page.waitForTimeout(timeout);
            return {
                result: 'PASS',
                message: `Waited for ${timeout}ms successfully`,
                continueTest: true
            };
        } catch (e) {
            return {
                result: 'FAIL',
                message: `Failed to wait: ${e.message}`,
                continueTest: false
            };
        }
    }

    async uiVerifyPageTitle(actionConfig) {
        try {
            if (!this.page) {
                throw new Error('No active browser page');
            }
            const actualTitle = await this.page.title();
            if (actualTitle !== actionConfig.expected_title) {
                throw new Error(`Expected title "${actionConfig.expected_title}" but got "${actualTitle}"`);
            }
            const result = {
                result: 'PASS',
                message: `Page title verified successfully`,
                continueTest: true
            };
            return await this.handleScreenshot('ui_verify_page_title', actionConfig, result);
        } catch (e) {
            return {
                result: 'FAIL',
                message: `Failed to verify page title: ${e.message}`,
                continueTest: false
            };
        }
    }

    async uiVerifyCssProperty(actionConfig) {
        try {
            if (!this.page) {
                throw new Error('No active browser page');
            }
            const selector = this.getSelector(actionConfig.element);
            const property = await this.page.$eval(selector, (el, prop) => {
                return window.getComputedStyle(el).getPropertyValue(prop);
            }, actionConfig.css_property);
            
            if (property !== actionConfig.expected_css_property_value) {
                throw new Error(`Expected CSS property "${actionConfig.css_property}" to be "${actionConfig.expected_css_property_value}" but got "${property}"`);
            }
            const result = {
                result: 'PASS',
                message: `CSS property verified successfully`,
                continueTest: true
            };
            return await this.handleScreenshot('ui_verify_css_property', actionConfig, result);
        } catch (e) {
            return {
                result: 'FAIL',
                message: `Failed to verify CSS property: ${e.message}`,
                continueTest: false
            };
        }
    }

    async uiVerifyText(actionConfig) {
        try {
            if (!this.page) {
                throw new Error('No active browser page');
            }
            const selector = this.getSelector(actionConfig.element);
            const text = await this.page.textContent(selector);
            if (text !== actionConfig.expected_text) {
                throw new Error(`Expected text "${actionConfig.expected_text}" but got "${text}"`);
            }
            const result = {
                result: 'PASS',
                message: `Text verified successfully`,
                continueTest: true
            };
            return await this.handleScreenshot('ui_verify_text', actionConfig, result);
        } catch (e) {
            return {
                result: 'FAIL',
                message: `Failed to verify text: ${e.message}`,
                continueTest: false
            };
        }
    }

    async uiCloseBrowser(actionConfig) {
        try {
            if (this.page) {
                await this.page.close();
            }
            if (this.browser) {
                await this.browser.close();
            }
            this.page = null;
            this.browser = null;
            return {
                result: 'PASS',
                message: 'Browser closed successfully',
                continueTest: true
            };
        } catch (e) {
            return {
                result: 'FAIL',
                message: `Failed to close browser: ${e.message}`,
                continueTest: false
            };
        }
    }
}

module.exports = BrowserActions;
