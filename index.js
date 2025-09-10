const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
const Executor = require('./src/config/Executor');
const JsonValidator = require('./src/utils/JsonValidator');

function printUsage() {
    console.log(`
Usage: atas <path-to-testscript.json>

Example:
  atas ./test-data/testscript.json
`);
}

async function validateConfig(config) {
    const requiredFields = ['testsuite_name', 'test_report_path'];
    const missing = requiredFields.filter(field => !config.testifact_info[field]);
    
    if (missing.length > 0) {
        throw new Error(chalk.red(`Missing required fields in config: ${missing.join(', ')}`));
    }
}

async function ensureDirectories(reportPath) {
    await fs.mkdir(reportPath, { recursive: true });
    await fs.mkdir(path.join(reportPath, 'screenshots'), { recursive: true });
}

async function runTests(testScriptPath, objectMapPath, reportPath, variableMapPath = null) {
    const jsonValidator = new JsonValidator();
    
    try {
        console.log('\nStarting test execution...');
        console.log('Test script path:', path.resolve(testScriptPath));
        console.log('Object map path:', path.resolve(objectMapPath));
        console.log('Report path:', path.resolve(reportPath));
        if (variableMapPath) {
            console.log('Variable map path:', path.resolve(variableMapPath));
        }
        console.log();

        // Read and validate test script
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

        // Read and validate object map
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

        let objectMap = JSON.parse(rawObjectMap);

        await validateConfig(testScript);
        await ensureDirectories(reportPath);

        const executor = new Executor({
            testScriptPath,
            objectMapPath,
            test_report_path: reportPath,
            ...testScript.testifact_info
        });

        const results = await executor.executeTests(testScript);

        if (results.success) {
            console.log(chalk.green('\n✓ Test suite completed successfully\n'));
        } else {
            console.error(chalk.red('\n✗ Test suite failed with errors:\n'));
            results.logs.forEach(log => console.error(log));
            process.exit(1);
        }
    } catch (error) {
        console.error('\n' + (error.message || error));
        process.exit(1);
    }
}

module.exports = { runTests };
