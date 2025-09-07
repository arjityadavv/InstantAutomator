const BaseActions = require('./BaseActions');

class VerificationActions extends BaseActions {
    async uiVerifyText(actionConfig, objectMap) {
        try {
            const selector = this._getSelector(actionConfig.element, objectMap);
            await this.page.waitForSelector(selector, { state: 'visible' });
            const elementText = await this.page.textContent(selector);
            const expectedText = actionConfig.expected_text;

            if (expectedText.toLowerCase() === elementText.toLowerCase()) {
                return {
                    result: 'PASS',
                    message: `Text verification passed. Expected: "${expectedText}" | Actual: "${elementText}"`,
                    continueTest: true
                };
            } else {
                return {
                    result: 'FAIL',
                    message: `Text verification failed. Expected: "${expectedText}" | Actual: "${elementText}"`,
                    continueTest: false
                };
            }
        } catch (e) {
            return {
                result: 'FAIL',
                message: `Text verification failed: ${e.message}`,
                continueTest: false
            };
        }
    }

    async uiVerifyCssProperty(actionConfig, objectMap) {
        try {
            const selector = this._getSelector(actionConfig.element, objectMap);
            await this.page.waitForSelector(selector, { state: 'visible' });
            const element = await this.page.locator(selector);
            
            const cssProperty = actionConfig.css_property;
            const expectedValue = actionConfig.expected_css_property_value;
            const actualValue = await element.evaluate((el, prop) => {
                return window.getComputedStyle(el).getPropertyValue(prop);
            }, cssProperty);

            if (expectedValue.toLowerCase() === actualValue.toLowerCase()) {
                return {
                    result: 'PASS',
                    message: `CSS property verification passed. Property: "${cssProperty}" | Expected: "${expectedValue}" | Actual: "${actualValue}"`,
                    continueTest: true
                };
            } else {
                return {
                    result: 'FAIL',
                    message: `CSS property verification failed. Property: "${cssProperty}" | Expected: "${expectedValue}" | Actual: "${actualValue}"`,
                    continueTest: false
                };
            }
        } catch (e) {
            return {
                result: 'FAIL',
                message: `CSS property verification failed: ${e.message}`,
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

    async uiVerifyPageTitle(actionConfig) {
        try {
            const expectedTitle = actionConfig.expected_title;
            const actualTitle = await this.page.title();
            
            if (expectedTitle.toLowerCase() === actualTitle.toLowerCase()) {
                return {
                    result: 'PASS',
                    message: `Page title verification passed. Expected: "${expectedTitle}" | Actual: "${actualTitle}"`,
                    continueTest: true
                };
            } else {
                return {
                    result: 'FAIL',
                    message: `Page title verification failed. Expected: "${expectedTitle}" | Actual: "${actualTitle}"`,
                    continueTest: actionConfig.continue_on_failure !== false
                };
            }
        } catch (e) {
            return {
                result: 'FAIL',
                message: `Page title verification failed: ${e.message}`,
                continueTest: false
            };
        }
    }
}

module.exports = VerificationActions;
