#!/usr/bin/env node

const { program } = require('commander');
const path = require('path');
const chalk = require('chalk');
const fs = require('fs');
const { runTests } = require('../index');
const SyntaxDetector = require('../src/utils/SyntaxDetector');
const TestResultsManager = require('../src/utils/TestResultsManager');

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

// Read version from package.json
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));

program
  .name('snap')
  .description(`SNAP - Simple No-code Automation Platform

  Advanced JSON-driven test automation framework with context-aware visual testing.

  Example usage:
    $ snap run -t "./test-data/testscript.json" -o "./object__map.json" -r "./test-reports"
    $ snap run --test "path/to/testscript.json" --objects "path/to/objectmap.json" --report "path/to/reports"
    
  For more information:
    - Run 'snap run --help' for detailed test execution options
    - Visit https://github.com/arjityadavv/snap for documentation`)
  .version(packageJson.version);

program
  .command('run')
  .description(`Run automated test suite
  
  This command executes the test cases defined in your test script JSON file.
  The test script should follow the SNAP format with test cases and actions.
  
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
  .option('-o, --objects <path>', 'Path to the object map JSON file. This file maps element identifiers to actual selectors.')
  .option('-v, --variables <path>', 'Path to the variable map JSON file. This file contains test variables and their values.')
  .option('-r, --results <path>', 'Base directory for organized test results. Each run will create a timestamped subdirectory.', 'test-results')
  .option('--baseline-dir <path>', 'Directory where visual testing baselines are stored (persistent across runs).', 'visual-baselines')
  .option('--keep-runs <number>', 'Number of recent test runs to keep during cleanup.', '20')
  .option('--headless', 'Run browser in headless mode')
  .option('--browser <type>', 'Browser to use for testing (chrome, firefox, webkit)', 'chrome')
  .action(async (options) => {
    try {
      console.log(chalk.blue('🚀 Starting SNAP test execution...\n'));
      
      // Validate test script file path
      const testPath = path.resolve(options.test);
      if (!fs.existsSync(testPath)) {
        throw new Error(`Test script file not found: ${testPath}`);
      }

      // Read test script to analyze syntax
      const testScriptContent = fs.readFileSync(testPath, 'utf8');
      const syntaxFeedback = SyntaxDetector.getSyntaxFeedback(testScriptContent);
      
      // Extract test suite name and check if visual testing is needed
      let testSuiteName = 'TestSuite';
      let isVisualTestingNeeded = false;
      try {
        const testScript = JSON.parse(testScriptContent);
        testSuiteName = testScript.testifact_info?.testsuite_name || 
                       path.basename(testPath, '.json') || 'TestSuite';
        
        // Check if visual testing is needed early to optimize directory creation
        isVisualTestingNeeded = checkIfVisualTestingNeeded(testScript);
      } catch (e) {
        testSuiteName = path.basename(testPath, '.json');
      }
      
      // Display syntax analysis
      console.log(chalk.cyan('📋 Syntax Analysis:'));
      syntaxFeedback.messages.forEach(message => console.log(`  ${message}`));
      
      // Initialize TestResultsManager with visual testing requirement
      const resultsManager = new TestResultsManager(options.results, isVisualTestingNeeded);
      
      // Cleanup old runs if requested
      const keepRuns = parseInt(options.keepRuns) || 20;
      if (keepRuns > 0) {
        await resultsManager.cleanupOldRuns(keepRuns);
      }
      
      // Initialize new test run with organized structure
      const runPaths = await resultsManager.initializeTestRun(testSuiteName);
      
      // Determine object map requirements
      let objectsPath = null;
      if (syntaxFeedback.requiresObjectMap) {
        if (!options.objects) {
          throw new Error('Object map is required when using {{var.}} or {{obj.}} syntax. Please provide -o/--objects parameter.');
        }
        objectsPath = path.resolve(options.objects);
        if (!fs.existsSync(objectsPath)) {
          throw new Error(`Object map file not found: ${objectsPath}`);
        }
      } else {
        // Object map is optional for legacy syntax
        if (options.objects) {
          objectsPath = path.resolve(options.objects);
          if (!fs.existsSync(objectsPath)) {
            console.log(chalk.yellow(`⚠️  Object map file not found: ${objectsPath}. Proceeding without it.`));
            objectsPath = null;
          }
        }
      }
      
      const variablesPath = options.variables ? path.resolve(options.variables) : null;

      // Display configuration
      console.log(chalk.yellow('\n⚙️  Test Configuration:'));
      console.log(`📄 Test Script: ${testPath}`);
      console.log(`🗺️  Object Map: ${objectsPath || 'Not provided (optional for legacy syntax)'}`);
      console.log(`📊 Results Directory: ${runPaths.runDir}`);
      console.log(`📸 Screenshots: ${runPaths.screenshots}`);
      
      // Only show visual testing paths if visual testing is enabled
      if (runPaths.visual) {
        console.log(`👁️  Visual Baselines: ${runPaths.baselines}`);
        console.log(`🔍 Visual Testing: ${runPaths.visual.base}`);
      } else {
        console.log(`⏩ Visual Testing: Disabled (optimized mode)`);
      }
      if (variablesPath) {
        console.log(`🔧 Variable Map: ${variablesPath}`);
      }
      console.log(`🌐 Browser: ${options.browser}${options.headless ? ' (headless)' : ''}`);
      console.log('');

      // Prepare configuration with run paths
      const testConfig = {
        // Additional configuration
        runPaths: runPaths,
        allureResultsPath: runPaths.allureResults,
        htmlReportPath: runPaths.htmlReport,
        browser: options.browser,
        headless: options.headless
      };



      // Run tests with organized paths
      const testSummary = await runTests(
        testPath, 
        objectsPath, 
        runPaths.screenshots,  // screenshots directory
        variablesPath, 
        runPaths.visual?.base,  // visual testing base directory (may be undefined)
        testConfig
      );
      
      // Finalize test run
      await resultsManager.finalizeTestRun(testSummary);
      
      console.log(chalk.green('\n✅ Test suite completed successfully'));
      console.log(chalk.blue(`📂 Results available in: ${runPaths.runDir}`));
      
      // Display quick access paths
      if (fs.existsSync(runPaths.htmlReport)) {
        console.log(chalk.cyan(`📄 HTML Report: ${runPaths.htmlReport}`));
      }
      if (fs.existsSync(path.join(runPaths.allureReport, 'index.html'))) {
        console.log(chalk.cyan(`📊 Allure Report: ${path.join(runPaths.allureReport, 'index.html')}`));
      }
      
    } catch (error) {
      console.error(chalk.red('\n❌ Test execution error:'), error.message);
      process.exit(1);
    }
  });

// Baseline management commands
program
  .command('baseline')
  .description('Manage visual testing baselines')
  .option('--list', 'List all existing baselines')
  .option('--delete <baseline>', 'Delete specific baseline by name')
  .option('--delete-test <testname>', 'Delete all baselines for a specific test')
  .option('--clean', 'Clean all current results and diffs (keep baselines)')
  .option('--dir <directory>', 'Visual testing directory', process.cwd())
  .action(async (options) => {
    try {
      const visualDir = path.resolve(options.dir);
      const baselinesDir = path.join(visualDir, 'visual-baselines');
      const currentDir = path.join(visualDir, 'visual-actual');
      const diffsDir = path.join(visualDir, 'visual-diffs');
      
      if (options.list) {
        // List all baselines
        if (!fs.existsSync(baselinesDir)) {
          console.log(chalk.yellow('No baselines directory found.'));
          return;
        }
        
        const baselines = fs.readdirSync(baselinesDir).filter(file => file.endsWith('.png'));
        if (baselines.length === 0) {
          console.log(chalk.yellow('No baselines found.'));
        } else {
          console.log(chalk.green(`\nFound ${baselines.length} baseline(s):`));
          baselines.forEach(baseline => {
            console.log(`  📸 ${baseline}`);
          });
        }
      }
      
      if (options.delete) {
        // Delete specific baseline
        const baselineFile = options.delete.endsWith('.png') ? options.delete : `${options.delete}.png`;
        const baselinePath = path.join(baselinesDir, baselineFile);
        
        if (fs.existsSync(baselinePath)) {
          fs.unlinkSync(baselinePath);
          console.log(chalk.green(`✅ Deleted baseline: ${baselineFile}`));
        } else {
          console.log(chalk.red(`❌ Baseline not found: ${baselineFile}`));
        }
      }
      
      if (options.deleteTest) {
        // Delete all baselines for a test
        if (!fs.existsSync(baselinesDir)) {
          console.log(chalk.yellow('No baselines directory found.'));
          return;
        }
        
        const testPattern = options.deleteTest.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const baselines = fs.readdirSync(baselinesDir).filter(file => 
          file.toLowerCase().startsWith(testPattern) && file.endsWith('.png')
        );
        
        if (baselines.length === 0) {
          console.log(chalk.yellow(`No baselines found for test: ${options.deleteTest}`));
        } else {
          baselines.forEach(baseline => {
            fs.unlinkSync(path.join(baselinesDir, baseline));
            console.log(chalk.green(`✅ Deleted baseline: ${baseline}`));
          });
        }
      }
      
      if (options.clean) {
        // Clean current results and diffs
        let cleaned = 0;
        
        [currentDir, diffsDir].forEach(dir => {
          if (fs.existsSync(dir)) {
            const files = fs.readdirSync(dir);
            files.forEach(file => {
              fs.unlinkSync(path.join(dir, file));
              cleaned++;
            });
          }
        });
        
        console.log(chalk.green(`✅ Cleaned ${cleaned} files from current results and diffs`));
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Baseline management error:'), error.message);
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
  console.log('  snap-test --help');
  console.log('  snap-test run --help\n');
  process.exit(1);
});

program.parse();