#!/usr/bin/env node

const { program } = require('commander');
const path = require('path');
const chalk = require('chalk');
const { runTests } = require('../index');

program
  .name('atas')
  .description(`Playwright ATAS Test Runner - JSON-driven UI Test Automation Framework

  Example usage:
    $ atas run -t "./test-data/testscript.json" -o "./object__map.json" -r "./test-reports"
    $ atas run --test "path/to/testscript.json" --objects "path/to/objectmap.json" --report "path/to/reports"
    
  For more information:
    - Run 'atas run --help' for detailed test execution options
    - Visit https://github.com/arjityadavv/ATAS_Runner for documentation`)
  .version('1.0.0');

program
  .command('run')
  .description(`Run automated test suite
  
  This command executes the test cases defined in your test script JSON file.
  The test script should follow the ATAS format with test cases and actions.
  
  Required files:
  - Test Script JSON: Defines your test cases and actions
  - Object Map JSON: Maps UI element identifiers to actual selectors
  
  Example test script structure:
  {
    "testifact_info": {
      "testsuite_name": "My Test Suite",
      "testsuite_owner": "Owner Name"
    },
    "testifact_items": [
      {
        "test_name": "Test Case 1",
        "execute": "yes",
        "test_actions": [
          {
            "action_name": "ui_open_browser",
            "action_type": "ui",
            "action_config": {
              "browser_name": "chrome"
            }
          }
        ]
      }
    ]
  }`)
  .option('-t, --test <path>', 'Path to the test script JSON file. This file contains your test cases and actions.', 'test-data/testscript.json')
  .option('-o, --objects <path>', 'Path to the object map JSON file. This file maps element identifiers to actual selectors.', 'object__map.json')
  .option('-v, --variables <path>', 'Path to the variable map JSON file. This file contains test variables and their values.', 'variable_map.json')
  .option('-r, --report <path>', 'Directory where test execution reports will be generated. HTML reports with screenshots will be saved here.', 'test-reports')
  .option('--headless', 'Run browser in headless mode')
  .option('--browser <type>', 'Browser to use for testing (chrome, firefox, webkit)', 'chrome')
  .action(async (options) => {
    try {
      console.log(chalk.blue('Starting test execution...'));
      
      // Validate file paths
      const testPath = path.resolve(options.test);
      const objectsPath = path.resolve(options.objects);
      const reportPath = path.resolve(options.report);
      const variablesPath = options.variables ? path.resolve(options.variables) : null;

      // Display configuration
      console.log(chalk.yellow('\nUsing configurations:'));
      console.log(`Test Script: ${testPath}`);
      console.log(`Object Map: ${objectsPath}`);
      console.log(`Report Path: ${reportPath}`);
      if (variablesPath) {
        console.log(`Variable Map: ${variablesPath}`);
      }
      console.log(`Browser: ${options.browser}${options.headless ? ' (headless)' : ''}\n`);

      await runTests(testPath, objectsPath, reportPath, variablesPath);
      console.log(chalk.green('\n✓ Test suite completed successfully'));
    } catch (error) {
      console.error(chalk.red('\n✗ Test execution error:'), error.message);
      process.exit(1);
    }
  });

// Handle unknown commands
program.on('command:*', () => {
  console.error(chalk.red('\nError: Invalid command'));
  console.log(chalk.yellow('\nAvailable commands:'));
  console.log('  run     Run test suite');
  console.log('  help    Show help information\n');
  console.log('For more details, run:');
  console.log('  atas --help');
  console.log('  atas run --help\n');
  process.exit(1);
});

program.parse();