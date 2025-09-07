const BaseActions = require('./BaseActions');

class NavigationActions extends BaseActions {
    async uiNavigate(actionConfig) {
        try {
            await this.page.goto(actionConfig.url, {
                waitUntil: 'networkidle'
            });
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
}

module.exports = NavigationActions;
