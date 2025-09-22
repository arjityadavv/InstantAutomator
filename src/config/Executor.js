const chalk = require('chalk');
const BrowserActions = require('../actions/BrowserActions');
const ElementActions = require('../actions/ElementActions');
const NavigationActions = require('../actions/NavigationActions');
const VerificationActions = require('../actions/VerificationActions');
const WaitActions = require('../actions/WaitActions');
const Reporter = require('../utils/Reporter');
const AllureReporter = require('../utils/AllureReporter');
const SchemaValidator = require('../utils/SchemaValidator');
const path = require('path');
const fs = require('fs').promises;

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
        // Initialize both reporters and validator
        this.reporter = new Reporter(path.resolve(config.test_report_path));
        this.allureReporter = new AllureReporter(config);
        this.schemaValidator = new SchemaValidator();
    }

    async executeTests(testScript, rawJson) {
        try {
            // Validate both JSON syntax and schema
            await this.schemaValidator.validateTestScript(testScript, rawJson);
            console.log(chalk.green('✓'), 'Test script validation successful');
        } catch (error) {
            console.error('\n' + chalk.red('Validation Error:'));
            console.error(error.message);
            return {
                success: false,
                logs: [error.message]
            };
        }

        const results = {
            success: true,
            logs: []
        };

        try {
            // Start the test suite
            await this.reporter.startTestSuite(testScript.testifact_info.testsuite_name);
            await this.allureReporter.startTestSuite(testScript.testifact_info.testsuite_name);

            // Process each test in the test suite
            for (const test of testScript.testifact_items) {
                if (test.execute !== 'yes') continue;

                console.log(`\nExecuting test: ${test.test_name}`);
                
                // Start test in both reporters
                await this.reporter.startTest(test.test_name, {
                    suite: testScript.testifact_info.testsuite_name,
                    owner: testScript.testifact_info.testsuite_owner
                });
                await this.allureReporter.startTest(test.test_name, {
                    suite: testScript.testifact_info.testsuite_name,
                    owner: testScript.testifact_info.testsuite_owner,
                    description: test.description
                });
                
                try {
                    // Process each action in the test
                    for (let actionIndex = 0; actionIndex < test.test_actions.length; actionIndex++) {
                        const action = test.test_actions[actionIndex];
                        try {
                            console.log(`  Executing action ${actionIndex + 1}/${test.test_actions.length}: ${action.action_name}`);
                            
                            const actionHandler = this.actions[action.action_type];
                            if (!actionHandler) {
                                throw new Error(`Unknown action type: ${action.action_type}`);
                            }

                            // Set current context for visual testing baseline naming
                            if (actionHandler.setCurrentContext) {
                                actionHandler.setCurrentContext(test.test_name, action.action_name, actionIndex);
                            }

                            // Convert action name from snake_case to camelCase
                            const methodName = action.action_name.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
                            
                            if (!actionHandler[methodName]) {
                                throw new Error(`Unknown method ${methodName} for action type ${action.action_type}`);
                            }

                            // Pass action_config, action_parameters, and action index
                            const result = await actionHandler[methodName](
                                action.action_config,
                                action.action_parameters,
                                actionIndex
                            );
                            
                            // Log step to both reporters
                            await this.reporter.addStep(
                                action.action_name,
                                result.result,
                                result.message
                            );
                            await this.allureReporter.addStep(
                                action.action_name,
                                result.result,
                                result.message
                            );

                            // Handle visual testing (only if enabled and requested)
                            const visualCheckRequested = action.action_config?.visual_check === 'yes' || 
                                                        action.action_parameters?.visual_check === 'yes';
                            
                            if (visualCheckRequested && actionHandler.page) {
                                if (this.config.visual_testing_enabled && actionHandler.visualTesting) {
                                    // Use the existing VisualTesting instance from BaseActions
                                    const visualResult = await actionHandler.visualTesting.performVisualCheck(
                                    actionHandler.page,
                                    test.test_name,
                                    action.action_name,
                                    action.action_config,
                                    actionIndex
                                );
                                
                                // Add visual testing attachments to Allure if test failed
                                if (visualResult.visualFailure) {
                                    await this.allureReporter.addVisualTestingAttachments(visualResult);
                                    
                                    // Mark step as failed for visual differences
                                    await this.allureReporter.addStep(
                                        `Visual Check: ${action.action_name}`,
                                        'FAIL',
                                        visualResult.message
                                    );
                                    
                                    console.log(`❌ Visual test failed: ${visualResult.message}`);
                                } else {
                                    // Visual test passed or baseline created
                                    await this.allureReporter.addStep(
                                        `Visual Check: ${action.action_name}`,
                                        'PASS',
                                        visualResult.message
                                    );
                                    
                                    console.log(`✅ Visual test: ${visualResult.message}`);
                                }
                                } else {
                                    // Visual testing is disabled but requested
                                    console.log(`⚠️  Visual testing requested but disabled for optimization - skipping visual check for ${action.action_name}`);
                                }
                            }

                            // Handle regular screenshots
                            if ((action.action_config.take_screenshot === 'yes' || result.result === 'FAIL') && actionHandler.page) {
                                const timestamp = new Date().toISOString().replace(/:/g, '-');
                                const screenshotPath = path.join(
                                    this.config.test_report_path,
                                    'screenshots',
                                    `${action.action_name}_${result.result.toLowerCase()}_${timestamp}.png`
                                );
                                await fs.mkdir(path.dirname(screenshotPath), { recursive: true });
                                const buffer = await actionHandler.page.screenshot({ fullPage: true });
                                await fs.writeFile(screenshotPath, buffer);
                                await this.allureReporter.addScreenshot(action.action_name, buffer);
                            }

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
                            // Log failure to both reporters
                            await this.reporter.addStep(
                                action.action_name,
                                'FAIL',
                                error.message
                            );
                            await this.allureReporter.addStep(
                                action.action_name,
                                'FAIL',
                                error.message
                            );

                            // Take failure screenshot
                            if (this.actions.ui.page) {
                                const buffer = await this.actions.ui.page.screenshot({ fullPage: true });
                                const timestamp = new Date().toISOString().replace(/:/g, '-');
                                const screenshotPath = path.join(
                                    this.config.test_report_path,
                                    'screenshots',
                                    `${action.action_name}_fail_${timestamp}.png`
                                );
                                await fs.writeFile(screenshotPath, buffer);
                                await this.allureReporter.addScreenshot(`${action.action_name}_failure`, buffer);
                            }

                            results.logs.push({ 
                                test: test.test_name,
                                action: action.action_name, 
                                status: 'failed', 
                                error: error.message 
                            });
                            results.success = false;
                            await this.reporter.addError(error.message, error.stack);
                            await this.allureReporter.addError(error.message, error.stack);
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
                    // End test in both reporters
                    await this.reporter.endTest();
                    await this.allureReporter.endTest();
                }
            }
        } catch (error) {
            results.success = false;
            results.logs.push({ step: 'initialization', status: 'failed', error: error.message });
        } finally {
            // End test suite and generate reports
            await this.reporter.endTestSuite();
            await this.allureReporter.endTestSuite();

            // Generate Allure report if allure-results directory exists
            const allureResultsPath = path.join(this.config.test_report_path, 'allure-results');
            const fs = require('fs');
            
            if (fs.existsSync(allureResultsPath)) {
                try {
                    console.log('📊 Generating Allure report...');
                    const allureCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
                    const { execSync } = require('child_process');
                    
                    execSync(`${allureCommand} allure generate "${allureResultsPath}" -o "${path.join(this.config.test_report_path, 'allure-report')}" --clean`, {
                        stdio: 'inherit',
                        cwd: process.cwd()
                    });
                    
                    console.log(`📄 Allure report generated: ${path.join(this.config.test_report_path, 'allure-report', 'index.html')}`);
                } catch (error) {
                    console.log('⚠️  Allure report directory was not found. Check if SNAP generated the report properly.');
                    console.log('💡 Make sure allure-commandline is installed: npm install -g allure-commandline');
                }
            } else {
                console.log('⚠️  Allure report directory was not found. Check if SNAP generated the report properly.');
            }
        }

        return results;
    }
}

module.exports = Executor;
