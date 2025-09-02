# InstantAutomator

InstantAutomator is a JSON-driven test automation framework built on top of Playwright. It allows you to write and execute automated tests using simple JSON configurations, making test automation accessible even without extensive programming knowledge.

## Features

- 🚀 JSON-driven test automation
- 🎭 Built on Playwright
- 📊 Automated test reporting
- 📷 Automatic screenshot capture on failures
- 🗺️ Object map support for better maintainability
- 💻 Cross-platform support (Windows & macOS)
- 🔄 Easy test execution and management

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (version 14 or higher)
- npm (usually comes with Node.js)
- A supported browser (Chrome, Firefox, or Safari)

## Installation

1. Clone the repository:
```bash
# Windows
git clone https://github.com/arjityadavv/InstantAutomator.git

# macOS
git clone https://github.com/arjityadavv/InstantAutomator.git
```

2. Navigate to the project directory:
```bash
# Windows
cd InstantAutomator

# macOS
cd InstantAutomator
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
InstantAutomator/
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
# Windows
atas run -t "./test-data/testscript.json" -o "./object__map.json" -r "./test-reports"

# macOS
./node_modules/.bin/atas run -t "./test-data/testscript.json" -o "./object__map.json" -r "./test-reports"
```

## Command Line Options

- `-t, --test-script`: Path to the test script JSON file
- `-o, --object-map`: Path to the object map JSON file
- `-r, --report-dir`: Directory where test reports will be generated

## Test Reports

Test reports are automatically generated in the specified report directory with the following:
- Detailed test execution results
- Test execution time
- Screenshots of failures
- Test history tracking

Reports are generated in HTML format and can be found in the `test-reports` directory.

## Best Practices

1. Organize test scripts logically in the `test-data` directory
2. Keep object map updated and well-maintained
3. Use meaningful names for test cases and actions
4. Review generated reports after test execution
5. Regularly backup test scripts and object maps
6. Use version control for managing test assets

## Troubleshooting

1. If tests fail to start:
   - Check if all dependencies are installed
   - Verify the paths in your test script
   - Ensure the browser is installed

2. If object map elements are not found:
   - Verify the selectors in object map
   - Check if the page structure has changed
   - Update selectors as needed

3. For permission issues on macOS:
   - Run `chmod +x ./node_modules/.bin/atas`
   - Use sudo if necessary for browser installations

## Contributing

Contributions are welcome! Please feel free to submit pull requests.

## License

This project is licensed under the ISC License.

## Support

For issues and feature requests, please create an issue in the repository.

---
Made with ❤️ using Playwright
