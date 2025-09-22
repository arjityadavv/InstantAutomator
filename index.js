const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
const Executor = require('./src/config/Executor');
const JsonValidator = require('./src/utils/JsonValidator');

function printUsage() {
    console.log(`
Usage: snap <path-to-testscript.json>

Example:
  snap ./test-data/testscript.json
`);
}

async function validateConfig(testScript) {
    const requiredFields = ['testsuite_name'];
    const missing = requiredFields.filter(field => !testScript.testifact_info[field]);
    
    if (missing.length > 0) {
        throw new Error(chalk.red(`Missing required fields in test script: ${missing.join(', ')}`));
    }
}

async function ensureDirectories(reportPath) {
    await fs.mkdir(reportPath, { recursive: true });
    await fs.mkdir(path.join(reportPath, 'screenshots'), { recursive: true });
}

/**
 * Check if visual testing is needed by scanning all test actions
 * @param {Object} testScript - Parsed test script
 * @returns {boolean} - True if any action has visual_check: "yes"
 */
function checkIfVisualTestingNeeded(testScript) {
    if (!testScript.testifact_items || !Array.isArray(testScript.testifact_items)) {
        return false;
    }

    for (const testItem of testScript.testifact_items) {
        // Skip tests that are not set to execute
        if (testItem.execute !== 'yes') {
            continue;
        }

        if (testItem.test_actions && Array.isArray(testItem.test_actions)) {
            for (const action of testItem.test_actions) {
                // Check both action_config and action_parameters for visual_check
                const visualCheckInConfig = action.action_config?.visual_check === 'yes';
                const visualCheckInParams = action.action_parameters?.visual_check === 'yes';
                
                if (visualCheckInConfig || visualCheckInParams) {
                    return true;
                }
            }
        }
    }

    return false;
}

async function runTests(testScriptPath, objectMapPath, reportPath, variableMapPath = null, visualTestingPath = null, config = {}) {
    const jsonValidator = new JsonValidator();
    const BaseActions = require('./src/actions/BaseActions');
    
    try {
        console.log('\n🔄 Starting test execution...');
        console.log('📄 Test script path:', path.resolve(testScriptPath));
        console.log('🗺️  Object map path:', objectMapPath ? path.resolve(objectMapPath) : 'Not provided');
        console.log('📊 Report path:', path.resolve(reportPath));
        if (variableMapPath) {
            console.log('🔧 Variable map path:', path.resolve(variableMapPath));
        }
        if (visualTestingPath) {
            console.log('👁️  Visual testing path:', path.resolve(visualTestingPath));
        }
        console.log();

        // Read and validate test script first to check if visual testing is needed
        let rawTestScript;
        try {
            rawTestScript = await fs.readFile(testScriptPath, 'utf8');
        } catch (error) {
            throw new Error(chalk.red(`Failed to read test script file: ${error.message}`));
        }

        // Validate JSON syntax first
        const testScriptValidation = jsonValidator.validateSyntax(rawTestScript);
        if (!testScriptValidation.isValid) {
            console.error('\n' + testScriptValidation.error.message);
            console.error(testScriptValidation.error.preview);
            console.error(chalk.red('\nProblem:'), testScriptValidation.error.details);
            console.error(chalk.blue('\nSuggestion:'), testScriptValidation.error.suggestion);
            process.exit(1);
        }

        let testScript = JSON.parse(rawTestScript);

        // Check if visual testing is needed to optimize resource usage
        const isVisualTestingNeeded = checkIfVisualTestingNeeded(testScript);
        console.log(isVisualTestingNeeded ? 
            '👁️  Visual testing enabled - found actions with visual_check: yes' : 
            '⏩ Visual testing disabled - no actions require visual validation (optimized mode)');

        // Initialize VisualTesting only if needed to save resources
        if (isVisualTestingNeeded) {
            const BaseActions = require('./src/actions/BaseActions');
            BaseActions.resetVisualTesting(config);
        } else {
            // Skip visual testing initialization entirely for better performance
            console.log('🚀 Skipping visual testing initialization - faster startup!');
        }

        // Read and validate object map (if provided)
        let objectMap = {};
        if (objectMapPath) {
            let rawObjectMap;
            try {
                rawObjectMap = await fs.readFile(objectMapPath, 'utf8');
            } catch (error) {
                throw new Error(chalk.red(`Failed to read object map file: ${error.message}`));
            }

            // Validate object map JSON syntax
            const objMapValidation = jsonValidator.validateSyntax(rawObjectMap);
            if (!objMapValidation.isValid) {
                console.error('\nObject Map ' + objMapValidation.error.message);
                console.error(objMapValidation.error.preview);
                console.error(chalk.red('\nDetails:'), objMapValidation.error.details);
                process.exit(1);
            }

            objectMap = JSON.parse(rawObjectMap);
        } else {
            console.log(chalk.yellow('No object map provided - using empty object map for legacy syntax compatibility'));
        }

        await validateConfig(testScript);
        await ensureDirectories(reportPath);

        const executor = new Executor({
            testScriptPath,
            objectMapPath,
            test_report_path: reportPath,
            visual_testing_path: visualTestingPath || process.cwd(),
            allure_results_path: config.allureResultsPath,
            html_report_path: config.htmlReportPath,
            run_paths: config.runPaths,
            browser: config.browser || 'chrome',
            headless: config.headless || false,
            visual_testing_enabled: isVisualTestingNeeded,
            ...testScript.testifact_info
        });

        const results = await executor.executeTests(testScript);

        // Create execution summary
        const summary = {
            success: results.success,
            totalTests: results.totalTests || 0,
            passedTests: results.passedTests || 0,
            failedTests: results.failedTests || 0,
            skippedTests: results.skippedTests || 0,
            executionTime: results.executionTime || 0,
            timestamp: new Date().toISOString(),
            testSuiteName: testScript.testifact_info?.testsuite_name || 'Unknown',
            browser: config.browser || 'chrome',
            headless: config.headless || false,
            logs: results.logs || []
        };

        if (results.success) {
            console.log(chalk.green('\n✅ Test execution completed successfully\n'));
        } else {
            console.error(chalk.red('\n❌ Test execution failed with errors:\n'));
            results.logs.forEach(log => console.error(log));
            // Don't exit here, let CLI handle the exit after cleanup
        }

        return summary;
    } catch (error) {
        console.error('\n❌ Test execution error: ' + (error.message || error));
        
        // Return error summary
        return {
            success: false,
            error: error.message || error.toString(),
            timestamp: new Date().toISOString(),
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            skippedTests: 0,
            executionTime: 0,
            logs: [error.message || error.toString()]
        };
    }
}

module.exports = { runTests };
