# Changelog

All notable changes to SNAP (Simple No-code Automation Platform) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
