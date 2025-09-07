const BaseActions = require('./BaseActions');

class WaitActions extends BaseActions {
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
}

module.exports = WaitActions;
