const BrowserActions = require('../actions/BrowserActions');
const ElementActions = require('../actions/ElementActions');
const NavigationActions = require('../actions/NavigationActions');
const VerificationActions = require('../actions/VerificationActions');
const WaitActions = require('../actions/WaitActions');
const Reporter = require('../utils/Reporter');
const path = require('path');

class Executor {
    constructor(config) {
        this.config = config;
        this.actions = {
            ui: new BrowserActions(config),
            element: new ElementActions(config),
            navigation: new NavigationActions(config),
            verification: new VerificationActions(config),
            wait: new WaitActions(config)
        };
        this.reporter = new Reporter(path.resolve(config.test_report_path));
    }

    async executeTests(testScript) {
        const results = {
            success: true,
            logs: []
        };

        try {
            // Start the test suite
            await this.reporter.startTestSuite(testScript.testifact_info.testsuite_name);

            // Process each test in the test suite
            for (const test of testScript.testifact_items) {
                if (test.execute !== 'yes') continue;

                console.log(`\nExecuting test: ${test.test_name}`);
                
                // Start test in reporter
                await this.reporter.startTest(test.test_name, {
                    suite: testScript.testifact_info.testsuite_name,
                    owner: testScript.testifact_info.testsuite_owner
                });
                
                try {
                    // Process each action in the test
                    for (const action of test.test_actions) {
                        try {
                            console.log(`  Executing action: ${action.action_name}`);
                            
                            const actionHandler = this.actions[action.action_type];
                            if (!actionHandler) {
                                throw new Error(`Unknown action type: ${action.action_type}`);
                            }

                            // Convert action name from snake_case to camelCase
                            const methodName = action.action_name.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
                            
                            if (!actionHandler[methodName]) {
                                throw new Error(`Unknown method ${methodName} for action type ${action.action_type}`);
                            }

                            const result = await actionHandler[methodName](action.action_config);
                            
                            // Log step to reporter
                            await this.reporter.addStep(
                                action.action_name,
                                result.result,
                                result.message
                            );

                            results.logs.push({ 
                                test: test.test_name,
                                action: action.action_name, 
                                status: result.result === 'PASS' ? 'success' : 'failed',
                                message: result.message 
                            });

                            if (result.result !== 'PASS' || !result.continueTest) {
                                throw new Error(result.message);
                            }

                        } catch (error) {
                            await this.reporter.addStep(
                                action.action_name,
                                'FAIL',
                                error.message
                            );

                            results.logs.push({ 
                                test: test.test_name,
                                action: action.action_name, 
                                status: 'failed', 
                                error: error.message 
                            });
                            results.success = false;
                            await this.reporter.addError(error.message, error.stack);
                            break;
                        }
                    }
                } catch (error) {
                    console.error(`Test failed: ${test.test_name}`, error);
                    results.success = false;
                } finally {
                    try {
                        await this.actions.ui.uiCloseBrowser();
                    } catch (error) {
                        console.error('Error closing browser:', error);
                    }
                    // End test in reporter
                    await this.reporter.endTest();
                }
            }
        } catch (error) {
            results.success = false;
            results.logs.push({ step: 'initialization', status: 'failed', error: error.message });
        } finally {
            // End test suite and generate report
            await this.reporter.endTestSuite();
        }

        return results;
    }
}

module.exports = Executor;
