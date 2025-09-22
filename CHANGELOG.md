# Changelog

All notable changes to SNAP (Simple No-code Automation Platform) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.7.0] - 2025-09-23 - Smart Visual Testing Optimization & Resource Management
### Added
- **Intelligent Visual Testing Pre-Analysis**: Revolutionary performance optimization
  - Smart detection of visual testing requirements before execution
  - Automatic scanning for `visual_check: "yes"` in test actions
  - Conditional visual testing initialization only when needed
  - Significant performance improvement for non-visual test suites
- **Resource-Optimized Directory Management**: Eliminates unnecessary overhead
  - Visual directories created only when visual testing is actually needed
  - Hybrid visual testing architecture with organized structure
  - Conditional TestResultsManager initialization with visual testing flag
  - Zero visual testing footprint for regular automation tests
- **Enhanced CLI Output for Optimization Status**: Clear visibility into resource usage
  - "⏩ Visual testing disabled - optimized mode" for non-visual tests
  - "👁️ Visual testing enabled" with detailed paths for visual tests
  - "🚀 Skipping visual testing initialization - faster startup!" performance indicator
  - Real-time feedback on optimization decisions and resource savings

### Performance Improvements
- **Startup Time**: Faster initialization for non-visual test suites (skips visual setup entirely)
- **Disk Usage**: Zero visual directories created when tests don't require visual validation
- **Resource Efficiency**: Conditional TestResultsManager initialization based on actual requirements
- **Hybrid Architecture**: Organized visual asset structure when visual testing is needed
- **Backwards Compatibility**: Existing test scripts work without modifications

### Technical Implementation
- **Pre-Analysis Function**: `checkIfVisualTestingNeeded()` scans test scripts before execution
- **Conditional Initialization**: TestResultsManager accepts `visualTestingEnabled` parameter
- **Smart Directory Creation**: Visual directories created only when `this.visualTestingEnabled` is true
- **Hybrid Path Structure**: Conditional runPaths object includes visual paths only when needed
- **CLI Optimization**: Fixed CLI to handle undefined visual paths gracefully
- **BaseActions Enhancement**: Conditional visual testing reset based on requirements

## [1.6.0] - 2025-09-22 - Enhanced Visual Testing with Auto-Baseline Management & Allure Integration
### Added
- **Auto-Baseline Creation System**: Revolutionary visual testing workflow
  - First run automatically creates baselines (no manual setup required)
  - Subsequent runs verify against existing baselines
  - Smart baseline detection with "🔍 Comparing with baseline" messaging
- **Enhanced Directory Management**: Optimized storage for visual testing assets
  - Latest-only storage: Only keeps current results and diffs (saves disk space)
  - Previous results automatically cleaned on each run
  - Persistent baselines in `visual-baselines/` directory
  - Current screenshots in `visual-actual/`, diffs in `visual-diffs/`
- **CLI Baseline Management Commands**: Complete baseline lifecycle management
  - `snap baseline --list`: List all existing baselines
  - `snap baseline --delete <name>`: Delete specific baseline by name
  - `snap baseline --delete-test <testname>`: Delete all baselines for a test
  - `snap baseline --clean`: Clean current results and diffs (preserve baselines)
  - `snap baseline --dir <path>`: Specify custom visual testing directory
- **Enhanced Allure Integration for Visual Debugging**:
  - Automatic visual failure attachments (baseline, current, diff images)
  - Rich visual comparison details in reports
  - Side-by-side image comparison in Allure reports
  - Visual failure detection with `visualFailure` flag

### Enhanced
- **VisualTesting.js**: Complete rewrite with auto-generate/verify logic
  - Auto-baseline creation on first visual check
  - Enhanced directory initialization with cleanup
  - Latest-only storage management
  - Improved error handling and fallback mechanisms
- **AllureReporter.js**: Added visual testing attachment support
  - `addVisualTestingAttachments()` method for failed visual tests
  - Automatic image attachment handling (PNG format)
  - Visual comparison details as text attachments
- **Directory Structure**: Streamlined visual testing organization
  - `visual-baselines/`: Stable baseline storage (never timestamped)
  - `visual-actual/`: Current run results (overwritten each run)
  - `visual-diffs/`: Latest diff images (overwritten each run)

### Fixed
- **Package Version Display**: Fixed CLI version reading from package.json dynamically
- **Configuration Validation**: Removed incorrect test_report_path requirement from test scripts

## [1.5.0] - 2025-09-22 - Advanced Visual Testing with Context-Aware Baseline Generation
### Added
- **Context-Aware Visual Baseline Generation**: Revolutionary baseline naming system that prevents visual testing conflicts
  - Action index tracking: Multiple instances of same action get unique identifiers (`_0`, `_1`, `_2`)
  - URL context hashing: Different URLs generate unique hash suffixes (e.g., `url_614d2a`, `url_7095ae`)
  - Element context inclusion: Different elements create distinct baselines (`el_login`, `el_signup`)
  - Text content hashing: Expected text values contribute to baseline uniqueness
- **Enhanced VisualTesting.js utility** with comprehensive baseline name generation
- **Action parameter system integration**: Visual testing now receives full action context including actionIndex
- **Intelligent name length management**: Auto-truncation for names over 100 characters with hash fallback

### Fixed
- **Critical Edge Case Resolution**: 
  - Multiple navigations to different URLs no longer overwrite same baseline
  - Same action on different elements creates separate baselines
  - Sequential actions of same type maintain visual validation integrity
  - Test name changes don't break existing baselines due to context preservation
- **Visual Testing Import Issues**: Fixed `fs.existsSync` undefined errors with proper synchronous fs imports

### Enhanced
- **BaseActions.js**: Updated `handleVisualTesting()` to accept and process action index
- **BrowserActions.js**: Enhanced all action methods to pass contextual information for visual testing
- **Executor.js**: Modified action processing loop to track and pass action indices
- **Schema validation**: Updated to support universal `action_parameters` across all action types

### Technical Improvements
- **Robust baseline naming algorithm**: 
  ```
  Format: {testName}_{actionName}_{actionIndex}_{contextParts}
  Example: multiple_navigation_test_ui_navigate_0_url_614d2a.png
  ```
- **Context-specific identifiers**:
  - URL actions: Include URL hash for uniqueness
  - Element interactions: Include element identifier
  - Verification actions: Include expected values hash
- **Production-ready visual regression detection**: Prevents false positives from baseline collisions

### Documentation
- Created comprehensive edge case test scenarios
- Added visual testing best practices guide
- Updated examples with new baseline naming patterns

## [1.4.0] - 2025-09-10 - Enhanced Variable and Object Reference Syntax
### Added
- Enhanced syntax for external variable references: `{{var.keyName}}`
- Enhanced syntax for external object map references: `{{obj.keyName}}`
- ObjectMapResolver utility for consistent object reference handling
- TestDataManager improvements for better variable and object substitution
- Full backward compatibility with legacy syntax (`$variable` and direct object keys)

### Enhanced
- Improved test script readability and maintainability
- Better separation of concerns between variables and object references
- More consistent reference syntax across the framework

### Documentation
- Added comprehensive Variable and Object Reference Guide
- Updated README with new syntax examples
- Migration guide for transitioning from legacy to new syntax

## [1.3.0] - 2025-09-08 - Enhanced Reporting and Configuration
### Added
- Custom HTML reporting system with:
  - Test execution details
  - Step-by-step results
  - Screenshot attachments
  - Execution time tracking
- Configuration support improvements:
  - Enhanced object mapping via JSON
  - Variable management system
  - Flexible test data handling
- Cross-platform execution support
- Improved error handling and logging

## [1.2.0] - 2025-09-05 - UI Automation Features
### Added
- Expanded UI automation capabilities:
  - Element interactions (click, fill, hover)
  - Navigation actions
  - Element assertions
  - Screenshot capture on test failure
- Parallel test execution support
- Command-line interface (CLI) enhancements

## [1.1.0] - 2025-09-01 - Foundation Release

### Added
- Core framework architecture using Playwright
- Initial project structure established:
  - Basic action handlers
  - Configuration setup
  - Utility functions
- JSON-based test script format for codeless automation
- Basic command-line interface (CLI)
- Fundamental test execution capabilities

### Technical Implementation
- Built with Node.js and Playwright
- Project structure established:
  - `/src` - Core framework code
    - `/actions` - UI interaction handlers
    - `/config` - Test execution configuration
    - `/utils` - Helper utilities
  - `/bin` - CLI implementation
  - `/test-data` - Test script storage
  - `/test-reports` - Report generation with screenshots

### Current State
- Framework successfully executes UI tests via JSON scripts
- Supports cross-platform execution
- Implements error handling and logging
- Generates detailed HTML reports
- Captures failure screenshots
- Handles test data and variables

---

*Note: This changelog documents the currently implemented features of SNAP (Simple No-code Automation Platform).*
