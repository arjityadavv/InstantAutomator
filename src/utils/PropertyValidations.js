const propertyValidations = {
    // Test Configuration Properties
    'test_report_path': {
        type: 'string',
        description: 'Path to the test report directory',
        example: './test-reports',
        validate: (value) => {
            if (typeof value !== 'string') return false;
            // Just check if it's a non-empty string - path validation is done elsewhere
            return value.trim().length > 0;
        },
        message: 'Must be a valid path string (e.g., "./test-reports", "C:\\reports", "/path/to/reports")'
    },

    'testsuite_name': {
        type: 'string',
        description: 'Name of the test suite',
        example: 'Login Test Suite',
        validate: (value) => {
            if (typeof value !== 'string') return false;
            // Must be 3-100 chars, alphanumeric with spaces and common punctuation
            return value.length >= 3 && 
                   value.length <= 100 && 
                   /^[\w\s\-_.()]+$/.test(value);
        },
        message: 'Must be 3-100 characters long, containing letters, numbers, spaces, and basic punctuation (-, _, ., ())'
    },

    'object_map_external': {
        type: 'string',
        description: 'Path to the object map file',
        example: './objectmap.json',
        validate: (value) => {
            if (typeof value !== 'string') return false;
            // Just check if it's a .json file and non-empty - path validation is done elsewhere
            return value.trim().length > 0 && value.endsWith('.json');
        },
        message: 'Must be a valid path to a JSON file (e.g., "./objectmap.json", "C:\\maps\\objectmap.json")'
    },

    'browser': {
        type: 'string',
        description: 'Browser to use for testing',
        example: 'chrome',
        validate: (value) => {
            const validBrowsers = ['chrome', 'firefox', 'edge', 'webkit'];
            return typeof value === 'string' && validBrowsers.includes(value.toLowerCase());
        },
        message: 'Must be one of: chrome, firefox, edge, webkit'
    },

    // 'testifact_items': {
    //     type: 'array',
    //     description: 'List of test items to execute',
    //     example: [{
    //         "name": "Login Test",
    //         "action": "click",
    //         "selector": "#login-button"
    //     }],
    //     validate: (value) => {
    //         if (!Array.isArray(value)) return false;
    //         // Validate each test item if array is not empty
    //         if (value.length > 0) {
    //             return value.every(item => 
    //                 typeof item === 'object' && 
    //                 item !== null && 
    //                 typeof item.name === 'string' &&
    //                 typeof item.action === 'string'
    //             );
    //         }
    //         return true;
    //     },
    //     message: 'Must be an array of test items, each with at least a name and action property'
    // },

    // 'timeout': {
    //     type: 'number',
    //     description: 'Global timeout in milliseconds',
    //     example: 30000,
    //     validate: (value) => {
    //         if (typeof value !== 'number') return false;
    //         // Must be between 1 second and 5 minutes
    //         return value >= 1000 && value <= 300000;
    //     },
    //     message: 'Must be a number between 1000 (1 second) and 300000 (5 minutes)'
    // },

    'retries': {
        type: 'number',
        description: 'Number of retry attempts',
        example: 3,
        validate: (value) => {
            if (typeof value !== 'number') return false;
            // Must be an integer between 0 and 10
            return Number.isInteger(value) && value >= 0 && value <= 10;
        },
        message: 'Must be an integer between 0 and 10'
    },

    'parallel': {
        type: 'boolean',
        description: 'Whether to run tests in parallel',
        example: false,
        validate: (value) => typeof value === 'boolean',
        message: 'Must be true or false'
    },

    // Test Item Properties
    'action': {
        type: 'string',
        description: 'Action to perform in the test',
        example: 'click',
        validate: (value) => {
            const validActions = [
                'click', 'type', 'select', 'hover', 'wait', 
                'assert', 'navigate', 'screenshot'
            ];
            return typeof value === 'string' && validActions.includes(value.toLowerCase());
        },
        message: 'Must be one of: click, type, select, hover, wait, assert, navigate, screenshot'
    },

    'selector': {
        type: 'string',
        description: 'Element selector for the action',
        example: '#login-button',
        validate: (value) => {
            if (typeof value !== 'string') return false;
            // Basic selector validation (CSS or XPath)
            return value.length > 0 && 
                   (value.startsWith('#') || 
                    value.startsWith('.') || 
                    value.startsWith('//') ||
                    /^[a-zA-Z]/.test(value));
        },
        message: 'Must be a valid CSS selector (e.g., "#id", ".class") or XPath'
    },

    'value': {
        type: 'string',
        description: 'Value to use in the action (e.g., text to type)',
        example: 'username123',
        validate: (value) => typeof value === 'string',
        message: 'Must be a string value'
    },

    'timeout_individual': {
        type: 'number',
        description: 'Timeout for individual test action',
        example: 5000,
        validate: (value) => {
            if (typeof value !== 'number') return false;
            // Must be between 100ms and 60 seconds
            return value >= 100 && value <= 60000;
        },
        message: 'Must be a number between 100 (100ms) and 60000 (60 seconds)'
    },

    'screenshot_on_failure': {
        type: 'boolean',
        description: 'Whether to take a screenshot on test failure',
        example: true,
        validate: (value) => typeof value === 'boolean',
        message: 'Must be true or false'
    }
};

// Helper function to get validation info for a property
function getPropertyValidation(propertyPath) {
    // Handle nested properties with dot notation (e.g., 'testifact_info.test_report_path')
    const parts = propertyPath.split('.');
    const key = parts[parts.length - 1];
    return propertyValidations[key];
}

// Helper function to validate a value against property rules
function validatePropertyValue(propertyPath, value) {
    const validation = getPropertyValidation(propertyPath);
    if (!validation) {
        // If no specific validation found, accept any valid JSON value
        return { 
            isValid: true 
        };
    }

    const isValid = validation.validate(value);
    if (!isValid) {
        return {
            isValid: false,
            type: `INVALID_${validation.type.toUpperCase()}_VALUE`,
            message: `Invalid value for ${propertyPath}`,
            suggestion: `${validation.message}\nExample: "${propertyPath}": ${JSON.stringify(validation.example)}`,
            expectedType: validation.type,
            example: validation.example
        };
    }

    return { isValid: true };
}

// Helper function to get all validations
function getAllValidations() {
    return propertyValidations;
}

module.exports = {
    validatePropertyValue,
    getPropertyValidation,
    getAllValidations
};
