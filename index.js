const fs = require('fs').promises;
const path = require('path');
const Executor = require('./src/config/Executor');

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
        throw new Error(`Missing required fields in config: ${missing.join(', ')}`);
    }
}

async function ensureDirectories(reportPath) {
    await fs.mkdir(reportPath, { recursive: true });
    await fs.mkdir(path.join(reportPath, 'screenshots'), { recursive: true });
}

async function runTests(testScriptPath, objectMapPath, reportPath) {
    try {
        // Validate test script path
        if (!testScriptPath) {
            throw new Error('Test script path is required');
        }
        
        // Read test script
        const absolutePath = path.resolve(testScriptPath);
        const testScript = JSON.parse(
            await fs.readFile(absolutePath, 'utf8')
        );

        // Read object map if provided
        let objectMap = null;
        if (objectMapPath) {
            objectMap = JSON.parse(await fs.readFile(objectMapPath, 'utf8'));
        }

        // Create executor instance with correct path structure
        const executor = new Executor({
            ...testScript.testifact_info,
            test_report_path: reportPath,
            object_map_external: objectMapPath
        });

        // Execute tests and return the result
        return await executor.executeTests(testScript);
    } catch (error) {
        throw error;
    }
}

module.exports = { runTests };