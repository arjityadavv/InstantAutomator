const { chromium, firefox, webkit } = require('@playwright/test');

class UIActions {
    constructor(page) {
        this.page = page;
    }

    async uiOpenBrowser(actionConfig) {
        try {
            const browserType = actionConfig.browser_name === 'firefox' ? firefox :
                              actionConfig.browser_name === 'webkit' ? webkit : chromium;

            const browser = await browserType.launch({
                headless: false
            });
            const context = await browser.newContext();
            this.page = await context.newPage();
            return {
                result: 'PASS',
                message: 'Browser opened successfully',
                continueTest: true,
                browser: browser,
                page: this.page
            };
        } catch (e) {
            return {
                result: 'FAIL',
                message: `Failed to open browser: ${e.message}`,
                continueTest: false
            };
        }
    }

    async uiNavigate(actionConfig) {
        try {
            await this.page.goto(actionConfig.url);
            return {
                result: 'PASS',
                message: 'URL navigated successfully',
                continueTest: true
            };
        } catch (e) {
            return {
                result: 'FAIL',
                message: `Navigation failed: ${e.message}`,
                continueTest: false
            };
        }
    }

    async uiType(actionConfig, objectMap) {
        try {
            const selector = this._getSelector(actionConfig.element, objectMap);
            await this.page.fill(selector, actionConfig.value);
            return {
                result: 'PASS',
                message: 'Text entered successfully',
                continueTest: true
            };
        } catch (e) {
            return {
                result: 'FAIL',
                message: `Type action failed: ${e.message}`,
                continueTest: false
            };
        }
    }

    async uiWait(actionConfig) {
        try {
            const timeout = parseInt(actionConfig.timeout) || 5000;
            await this.page.waitForTimeout(timeout);
            return {
                result: 'PASS',
                message: `Waited for ${timeout}ms`,
                continueTest: true
            };
        } catch (e) {
            return {
                result: 'FAIL',
                message: `Wait failed: ${e.message}`,
                continueTest: false
            };
        }
    }

    async uiAssertText(actionConfig, objectMap) {
        try {
            const selector = this._getSelector(actionConfig.element, objectMap);
            const elementText = await this.page.textContent(selector);
            const expected = actionConfig.expected_text;
            
            if (elementText.includes(expected)) {
                return {
                    result: 'PASS',
                    message: 'Text assertion passed',
                    continueTest: true
                };
            } else {
                return {
                    result: 'FAIL',
                    message: `Text assertion failed. Expected: ${expected}, Found: ${elementText}`,
                    continueTest: actionConfig.continue_on_failure !== false
                };
            }
        } catch (e) {
            return {
                result: 'FAIL',
                message: `Text assertion failed: ${e.message}`,
                continueTest: false
            };
        }
    }

    _getSelector(elementKey, objectMap) {
        if (!objectMap || !elementKey) {
            throw new Error('Object map or element key is missing');
        }
        
        const element = objectMap[elementKey];
        if (!element) {
            throw new Error(`Element '${elementKey}' not found in object map`);
        }

        return element;
    }

    async uiNavigate(actionConfig) {
        try {
            await this.page.goto(actionConfig.url, {
                waitUntil: 'networkidle'
            });
            return {
                result: 'pass',
                message: 'url navigated',
                continueTest: true
            };
        } catch (e) {
            return {
                result: 'fail',
                message: `Navigation failed: ${e.message}`,
                continueTest: false
            };
        }
    }

    async uiClick(actionConfig, objectMap) {
        try {
            const object = objectMap[actionConfig.object_name];
            if (!object) {
                throw new Error(`Object ${actionConfig.object_name} not found in object map`);
            }

            const locator = object.locator_name === 'xpath' ? 
                this.page.locator(`xpath=${object.locator_value}`) :
                this.page.locator(object.locator_value);

            await locator.waitFor({ state: 'visible' });
            await locator.click();

            return {
                result: 'pass',
                message: `clicked on ${actionConfig.object_name}`,
                continueTest: true
            };
        } catch (e) {
            return {
                result: 'fail',
                message: `Click failed: ${e.message}`,
                continueTest: false
            };
        }
    }
}

module.exports = UIActions;