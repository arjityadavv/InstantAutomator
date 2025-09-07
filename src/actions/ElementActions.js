const BaseActions = require('./BaseActions');

class ElementActions extends BaseActions {
    async uiClick(actionConfig, objectMap) {
        try {
            const selector = this._getSelector(actionConfig.element, objectMap);
            await this.page.waitForSelector(selector, { state: 'visible' });
            await this.page.click(selector);

            await locator.waitFor({ state: 'visible' });
            await locator.click();

            return {
                result: 'PASS',
                message: `clicked on ${actionConfig.object_name}`,
                continueTest: true
            };
        } catch (e) {
            return {
                result: 'FAIL',
                message: `Click action failed: ${e.message}`,
                continueTest: false
            };
        }
    }

    async uiInput(actionConfig, objectMap) {
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

    async uiHover(actionConfig, objectMap) {
        try {
            const selector = this._getSelector(actionConfig.element, objectMap);
            await this.page.hover(selector);
            return {
                result: 'PASS',
                message: 'Hover action completed successfully',
                continueTest: true
            };
        } catch (e) {
            return {
                result: 'FAIL',
                message: `Hover action failed: ${e.message}`,
                continueTest: false
            };
        }
    }

    async uiDragAndDrop(actionConfig, objectMap) {
        try {
            const sourceSelector = this._getSelector(actionConfig.source_element, objectMap);
            const targetSelector = this._getSelector(actionConfig.target_element, objectMap);
            await this.page.dragAndDrop(sourceSelector, targetSelector);
            return {
                result: 'PASS',
                message: 'Drag and drop completed successfully',
                continueTest: true
            };
        } catch (e) {
            return {
                result: 'FAIL',
                message: `Drag and drop failed: ${e.message}`,
                continueTest: false
            };
        }
    }

    async uiUploadFile(actionConfig, objectMap) {
        try {
            const selector = this._getSelector(actionConfig.element, objectMap);
            await this.page.setInputFiles(selector, actionConfig.file_path);
            return {
                result: 'PASS',
                message: 'File uploaded successfully',
                continueTest: true
            };
        } catch (e) {
            return {
                result: 'FAIL',
                message: `File upload failed: ${e.message}`,
                continueTest: false
            };
        }
    }
}

module.exports = ElementActions;
