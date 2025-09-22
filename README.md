# SNAP - Simple No-code Automation Platform

SNAP is a JSON-driven test automation framework built on top of Playwright. It allows you to write and execute automated tests using simple JSON configurations, making test automation accessible even without extensive programming knowledge.

## Features

- 🚀 JSON-driven test automation
- 🎭 Built on Playwright
- 📊 Automated test reporting
- 📷 Automatic screenshot capture on failures
- 🗺️ Object map support for better maintainability
- 💻 Cross-platform support (Windows & macOS)
- 🔄 Easy test execution and management
- 🔗 Enhanced variable and object reference syntax with `{{var.keyName}}` and `{{obj.keyName}}`
- ⬅️ Full backward compatibility with legacy syntax
- 🎯 **NEW**: Advanced context-aware visual testing with intelligent baseline generation
- 🔍 **NEW**: Edge case resolution for visual regression testing (prevents baseline conflicts)
- 🚀 **NEW**: Smart visual testing optimization - automatic detection and resource management (v1.7.0)

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (version 14 or higher)
- npm (usually comes with Node.js)
- A supported browser (Chrome, Firefox, or Safari)

## Installation

1. Clone the repository:
```bash
# Windows
git clone https://github.com/arjityadavv/SNAP.git

# macOS
git clone https://github.com/arjityadavv/SNAP.git
```

2. Navigate to the project directory:
```bash
# Windows
cd SNAP

# macOS
cd SNAP
```

3. Install dependencies:
```bash
npm install
```

4. Install Playwright browsers:
```bash
npx playwright install
```

## Project Structure

```
SNAP/
├── bin/                    # CLI executable
├── src/                    # Source code
│   ├── actions/           # UI and API actions
│   ├── config/            # Framework configuration
│   └── utils/             # Utility functions
├── test-data/             # Test scripts in JSON format
├── test-reports/          # Generated test reports
│   └── screenshots/       # Captured screenshots
├── object__map.json       # Object repository
└── playwright.config.js   # Playwright configuration
```

## Getting Started

1. Create your test script in JSON format under the `test-data` directory. Example:

```json
{
  "testifact_info": {
    "testsuite_name": "My Test Suite",
    "testsuite_owner": "Your Name",
    "test_report_path": "./test-reports",
    "object_map_external": "./object__map.json"
  },
  "testifact_items": [
    {
      "test_name": "My First Test",
      "description": "Test description",
      "execute": "yes",
      "test_actions": [
        {
          "action_name": "ui_open_browser",
          "action_type": "ui",
          "action_config": {
            "browser_name": "chrome",
            "sso_login": "no"
          }
        }
        // Add more actions as needed
      ]
    }
  ]
}
```

2. Define your object map in `object__map.json`:

```json
{
  "login_page": {
    "username_field": "//input[@id='username']",
    "password_field": "//input[@id='password']",
    "login_button": "//button[@type='submit']"
  }
}
```

3. Run your tests:

```bash
# Windows - Legacy syntax (object map optional)
snap run -t "./test-data/testscript.json" -r "./test-reports"

# Windows - New {{var.}} and {{obj.}} syntax (object map required)
snap run -t "./test-data/testscript.json" -o "./object__map.json" -r "./test-reports"

# macOS - Legacy syntax (object map optional)  
./node_modules/.bin/snap run -t "./test-data/testscript.json" -r "./test-reports"

# macOS - New {{var.}} and {{obj.}} syntax (object map required)
./node_modules/.bin/snap run -t "./test-data/testscript.json" -o "./object__map.json" -r "./test-reports"
```

## Command Line Options

- `-t, --test-script`: Path to the test script JSON file (required)
- `-o, --object-map`: Path to the object map JSON file (required only when using `{{var.}}` or `{{obj.}}` syntax)
- `-v, --variables`: Path to the variable map JSON file (optional)
- `-r, --report-dir`: Directory where test reports will be generated (required)
- `--headless`: Run browser in headless mode (optional)
- `--browser`: Browser to use for testing - chrome, firefox, webkit (optional, defaults to chrome)

**Note**: The framework automatically detects if your test script uses the new `{{var.}}` or `{{obj.}}` syntax and will require the object map parameter only when needed. For legacy syntax test scripts, the object map is optional.

## Test Reports

Test reports are automatically generated in the specified report directory with the following:
- Detailed test execution results
- Test execution time
- Screenshots of failures
- Test history tracking

Reports are generated in HTML format and can be found in the `test-reports` directory.

## Running Visual Tests

SNAP automatically detects and optimizes visual testing based on your test configuration:

### Basic Visual Test Example

Create a test script with `visual_check: "yes"` to enable visual testing:

```json
{
  "testifact_info": {
    "testsuite_name": "Visual Testing Example",
    "testsuite_owner": "Your Name"
  },
  "testifact_items": [
    {
      "test_name": "Homepage Visual Check",
      "execute": "yes",
      "test_actions": [
        {
          "action_name": "ui_open_browser",
          "action_type": "ui", 
          "action_config": {
            "browser_name": "chrome"
          },
          "action_parameters": {
            "visual_check": "yes"
          }
        },
        {
          "action_name": "ui_navigate",
          "action_type": "ui",
          "action_config": {
            "url": "https://example.com"
          },
          "action_parameters": {
            "visual_check": "yes"
          }
        }
      ]
    }
  ]
}
```

### Running Visual Tests

```bash
# Windows
snap run -t "./test-data/visual_test.json" -r "./test-results"

# macOS  
./node_modules/.bin/snap run -t "./test-data/visual_test.json" -r "./test-results"
```

### What Happens When You Run Visual Tests

1. **First Run**: Creates baseline images automatically
   ```
   👁️ Visual testing enabled - found actions with visual_check: yes
   ✨ Auto-created baseline: homepage_visual_check_ui_navigate_0_url_25b884.png
   ```

2. **Subsequent Runs**: Compares against baselines
   ```
   🔍 Comparing with baseline: homepage_visual_check_ui_navigate_0_url_25b884.png
   ✅ Visual verification passed: 0.00% pixels differ
   ```

3. **Performance Optimization**: Tests without visual checks run faster
   ```
   ⏩ Visual testing disabled - optimized mode
   🚀 Skipping visual testing initialization - faster startup!
   ```

### Visual Testing Commands

```bash
# List all existing baselines
snap baseline --list

# Delete specific baseline
snap baseline --delete "homepage_visual_check_ui_navigate_0_url_25b884.png"

# Delete all baselines for a specific test
snap baseline --delete-test "homepage_visual_check"

# Clean current results but keep baselines
snap baseline --clean
```

## Best Practices

1. Organize test scripts logically in the `test-data` directory
2. Keep object map updated and well-maintained
3. Use meaningful names for test cases and actions
4. Review generated reports after test execution
5. Regularly backup test scripts and object maps
6. Use version control for managing test assets

## Enhanced Variable and Object Reference Syntax

SNAP now supports enhanced syntax for better readability and consistency:

### New Syntax (Recommended)
- **Variables**: `{{var.keyName}}` - Reference variables from your variable map
- **Objects**: `{{obj.keyName}}` - Reference elements from your object map

### Example:
```json
{
  "action_name": "ui_input",
  "action_type": "ui",
  "action_config": {
    "element": "{{obj.username_field}}",
    "value": "{{var.username}}"
  }
}
```

### Legacy Syntax (Still Supported)
- **Variables**: `$variableName` or `${variableName}`
- **Objects**: Direct key reference

For detailed usage and migration guide, see [Variable and Object Reference Guide](./docs/VARIABLE_OBJECT_REFERENCE.md)

## Action Parameters

SNAP now supports universal action parameters that can be used with any action:

### Available Parameters:
- **take_screenshot**: `"yes"` | `"no"` - Take screenshot for this action
- **timeout**: `"5000"` - Timeout in milliseconds for this action
- **visual_check**: `"yes"` | `"no"` - Perform visual regression testing

### Example Usage:
```json
{
  "action_name": "ui_navigate",
  "action_type": "ui",
  "action_config": {
    "url": "https://example.com"
  },
  "action_parameters": {
    "take_screenshot": "yes",
    "visual_check": "yes",
    "timeout": "10000"
  }
}
```

## Visual Testing

SNAP includes **advanced visual regression testing** with intelligent optimization and context-aware baseline generation:

### 🚀 **NEW: Smart Visual Testing Optimization (v1.7.0)**
SNAP now **automatically detects** if visual testing is needed and optimizes performance:

#### **Intelligent Resource Management:**
- ✅ **Auto-Detection**: Scans for `visual_check: "yes"` before execution
- ✅ **Performance Optimized**: Skips visual setup for regular tests (faster startup)
- ✅ **Resource Efficient**: No visual directories created when not needed
- ✅ **Zero Configuration**: Optimization happens automatically

#### **Visual Testing Status Indicators:**
```bash
# When visual testing is NOT needed (optimized mode):
⏩ Visual testing disabled - optimized mode
🚀 Skipping visual testing initialization - faster startup!

# When visual testing IS needed (full mode):
👁️ Visual testing enabled - found actions with visual_check: yes
🔗 Visual links created for hybrid structure
```

### How it Works:
1. **Pre-Analysis**: Automatically scans test scripts for visual testing requirements
2. **Smart Initialization**: Only sets up visual testing when actions need it
3. **First Run**: Creates baseline images automatically with intelligent naming
4. **Subsequent Runs**: Compares current screenshots with baselines using context matching
5. **Results**: Reports pass/fail status with visual differences and baseline management

### 🚀 **NEW: Context-Aware Baseline Generation**
SNAP now generates **unique baseline names** based on action context to solve critical edge cases:

#### **Problem Solved:**
```bash
# OLD (BROKEN): Multiple navigations overwrite same baseline
ui_navigate → "test_ui_navigate.png"  # ❌ All URLs use same baseline!

# NEW (FIXED): Each action gets unique context-based baseline  
ui_navigate to google.com → "test_ui_navigate_0_url_614d2a.png"  # ✅
ui_navigate to github.com → "test_ui_navigate_1_url_7095ae.png"  # ✅
```

#### **Smart Naming Algorithm:**
- **Action Index**: `_0`, `_1`, `_2` for sequential actions
- **URL Context**: `url_614d2a` hash for different URLs  
- **Element Context**: `el_login`, `el_signup` for different elements
- **Content Context**: `txt_abc123` hash for different text values

### Visual Testing Features:
- 🚀 **Smart Performance Optimization** (v1.7.0): Automatic detection and conditional setup
- ✅ **Context-aware baseline generation** (prevents false positives/negatives)
- ✅ Automatic baseline creation with intelligent naming
- ✅ Cross-browser visual testing
- ✅ Element-specific and full-page comparisons
- ✅ Configurable sensitivity thresholds
- ✅ Visual diff reporting with timeline tracking
- ✅ **Edge case handling**: Multiple similar actions get unique baselines
- 💾 **Resource Efficient**: Zero visual overhead for non-visual tests

### Directory Structure:
```
SNAP/
├── visual-testing/               # Created ONLY when visual tests are present
│   ├── baselines/               # Smart-named baseline images
│   │   ├── test_ui_navigate_0_url_614d2a.png
│   │   ├── test_ui_navigate_1_url_7095ae.png
│   │   └── test_ui_click_0_el_login.png
│   ├── runs/                    # Organized by test run timestamp
│   │   └── 2025-09-22T18-45-49/
│   │       ├── actual/          # Current test screenshots
│   │       ├── diffs/           # Difference highlights  
│   │       └── comparisons/     # Comparison metadata
│   └── latest/                  # Symlinks to most recent results
├── test-results/                # Always created for all tests
│   └── run-2025-09-22T18-45-49/
│       ├── visual/              # Links to centralized visual data
│       ├── screenshots/         # Regular test screenshots
│       └── allure-report/       # Test execution reports
```

**Key Benefits:**
- 📁 `visual-testing/` directory created **only** when tests use `visual_check: "yes"`
- ⚡ Regular tests run faster without visual overhead
- 🔗 Hybrid structure organizes visual assets efficiently
- 💾 Saves disk space and improves performance for non-visual test suites

### **Advanced Example - Multiple Actions:**
```json
{
  "test_actions": [
    {
      "action_name": "ui_navigate",
      "action_config": { "url": "https://google.com" },
      "action_parameters": { "visual_check": "yes" }
    },
    {
      "action_name": "ui_navigate", 
      "action_config": { "url": "https://github.com" },
      "action_parameters": { "visual_check": "yes" }
    }
  ]
}
```

**Generated Baselines:**
- `multiple_test_ui_navigate_0_url_614d2a.png` (Google)
- `multiple_test_ui_navigate_1_url_7095ae.png` (GitHub)

**✅ Result**: Each navigation gets its own baseline - no conflicts!

### Example:
```json
{
  "action_name": "ui_click",
  "action_type": "ui",
  "action_config": {
    "element": "{{obj.login_button}}"
  },
  "action_parameters": {
    "visual_check": "yes"
  }
}
```

## Troubleshooting

1. **If tests fail to start:**
   - Check if all dependencies are installed
   - Verify the paths in your test script
   - Ensure the browser is installed

2. **If object map elements are not found:**
   - Verify the selectors in object map
   - Check if the page structure has changed
   - Update selectors as needed

3. **For permission issues on macOS:**
   - Run `chmod +x ./node_modules/.bin/snap`
   - Use sudo if necessary for browser installations

4. **Visual Testing Issues:**
   - **Baseline Conflicts**: With v1.5.0+, baseline conflicts are automatically resolved through context-aware naming
   - **False Positives**: If visual tests fail unexpectedly, check if multiple actions are creating conflicting baselines (fixed in v1.5.0+)
   - **Missing Baselines**: Baselines are created automatically on first run with intelligent naming
   - **Complex Scenarios**: Multiple navigations, clicks on different elements, or sequential actions now generate unique baselines

### **Visual Testing Best Practices:**
```bash
# ✅ GOOD: Each action gets unique baseline
test_ui_navigate_0_url_614d2a.png    # First navigation
test_ui_navigate_1_url_7095ae.png    # Second navigation  
test_ui_click_0_el_login.png         # Login button
test_ui_click_1_el_signup.png        # Signup button

# ❌ OLD PROBLEM (SOLVED): All actions shared same baseline
test_ui_navigate.png                 # Overwrites previous!
test_ui_click.png                    # Overwrites previous!
```

## Contributing

Contributions are welcome! Please feel free to submit pull requests.

## License

This project is licensed under the ISC License.

## Support

For issues and feature requests, please create an issue in the repository.

---
Made with ❤️ using Playwright
