# Variable and Object Map Reference Guide

## Overview

SNAP (Simple No-code Automation Platform) now supports enhanced syntax for referencing external variables and object map elements directly within test scripts. This new syntax provides better readability and consistency.

## New Syntax

### Variable References: `{{var.keyName}}`

Use `{{var.keyName}}` to reference variables from your variable map file.

**Example:**
```json
{
  "action_name": "ui_navigate",
  "action_type": "ui",
  "action_config": {
    "url": "{{var.baseUrl}}"
  }
}
```

**Variable Map (variable_map.json):**
```json
{
  "baseUrl": "https://www.saucedemo.com/v1/",
  "username": "standard_user",
  "password": "secret_sauce"
}
```

### Object Map References: `{{obj.keyName}}`

Use `{{obj.keyName}}` to reference object elements from your object map file.

**Example:**
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

**Object Map (objectmap.json):**
```json
{
  "username_field": {
    "locator_name": "css",
    "locator_value": "#user-name"
  },
  "password_field": {
    "locator_name": "css", 
    "locator_value": "#password"
  }
}
```

## Complete Test Script Example

```json
{
  "testifact_info": {
    "testsuite_name": "Login Test with New Syntax",
    "testsuite_owner": "Test Author",
    "test_report_path": "./test-reports",
    "object_map_external": "./objectmap.json",
    "variable_map_external": "./variable_map.json"
  },
  "testifact_items": [
    {
      "test_name": "User Login Flow",
      "description": "Login using new variable and object reference syntax",
      "execute": "yes",
      "test_actions": [
        {
          "action_name": "ui_open_browser",
          "action_type": "ui",
          "action_config": {
            "browser_name": "chrome"
          }
        },
        {
          "action_name": "ui_navigate",
          "action_type": "ui",
          "action_config": {
            "url": "{{var.baseUrl}}"
          }
        },
        {
          "action_name": "ui_input",
          "action_type": "ui",
          "action_config": {
            "element": "{{obj.username_field}}",
            "value": "{{var.username}}"
          }
        },
        {
          "action_name": "ui_input",
          "action_type": "ui",
          "action_config": {
            "element": "{{obj.password_field}}",
            "value": "{{var.password}}"
          }
        },
        {
          "action_name": "ui_click",
          "action_type": "ui",
          "action_config": {
            "object_name": "{{obj.login_button}}"
          }
        }
      ]
    }
  ]
}
```

## Backward Compatibility

The framework maintains full backward compatibility with the legacy syntax:

### Legacy Variable Syntax (Still Supported)
- `$variableName` - Direct variable reference
- `${variableName}` - Variable within string

### Legacy Object Map Usage (Still Supported)
- Direct object key references without `{{obj.}}` prefix

**Example of Legacy Syntax:**
```json
{
  "action_name": "ui_input",
  "action_type": "ui", 
  "action_config": {
    "element": "username_field",
    "value": "$username"
  }
}
```

## Benefits of New Syntax

1. **Consistency**: Both variables and object references use similar syntax
2. **Clarity**: Explicitly shows what type of reference is being used
3. **Readability**: Test scripts are more self-documenting
4. **IDE Support**: Better syntax highlighting and validation potential
5. **Future-Proof**: Extensible for additional reference types

## Migration Guide

### From Legacy to New Syntax

**Legacy:**
```json
{
  "element": "username_field",
  "value": "$username"
}
```

**New:**
```json
{
  "element": "{{obj.username_field}}",
  "value": "{{var.username}}"
}
```

### Mixed Usage

You can mix both syntaxes within the same test script during migration:

```json
{
  "action_config": {
    "element": "{{obj.username_field}}", // New syntax
    "value": "$username"                  // Legacy syntax
  }
}
```

## Best Practices

1. **Use New Syntax for New Tests**: Adopt `{{var.keyName}}` and `{{obj.keyName}}` for all new test scripts
2. **Gradual Migration**: Update existing scripts incrementally
3. **Consistent Naming**: Use descriptive names for variables and object keys
4. **Documentation**: Comment complex references in your test scripts
5. **Validation**: Test your scripts after migration to ensure functionality

## Error Handling

If a variable or object reference cannot be resolved:
- Variable: `{{var.nonexistent}}` → remains unchanged in the test
- Object: `{{obj.nonexistent}}` → remains unchanged, may cause test failure

Always ensure your variable and object map files contain the referenced keys.
