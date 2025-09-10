// Import chalk v4 using CommonJS
const chalk = require('chalk');
const { validatePropertyValue } = require('./PropertyValidations');

class JsonValidator {
    validateSyntax(jsonString) {
        try {
            const jsonObj = JSON.parse(jsonString);
            
            // After successful JSON parse, validate property values
            const errors = this.validateProperties(jsonObj);
            if (errors.length > 0) {
                // Return the first error found
                const error = errors[0];
                // Find the line and column for this property
                const { line, column } = this.findPropertyLocation(jsonString, error.property);
                return this.formatErrorMessage(jsonString, line, column, {
                    type: error.type,
                    message: error.message,
                    suggestion: error.suggestion
                });
            }
            
            return { isValid: true };
        } catch (err) {
            const position = this.getErrorPosition(err);
            const { line, column } = this.getLineAndColumn(jsonString, position);
            const errorType = this.analyzeError(jsonString, line, column, err.message);
            return this.formatErrorMessage(jsonString, line, column, errorType);
        }
    }

    validateProperties(obj, parentPath = '') {
        const errors = [];
        
        for (const [key, value] of Object.entries(obj)) {
            const currentPath = parentPath ? `${parentPath}.${key}` : key;
            
            if (value && typeof value === 'object') {
                if (Array.isArray(value)) {
                    // Validate array property
                    const validation = validatePropertyValue(currentPath, value);
                    if (!validation.isValid) {
                        errors.push({
                            property: currentPath,
                            ...validation
                        });
                    }
                    // Validate array items if needed
                    value.forEach((item, index) => {
                        if (item && typeof item === 'object') {
                            errors.push(...this.validateProperties(item, `${currentPath}[${index}]`));
                        }
                    });
                } else {
                    // Validate object property
                    const validation = validatePropertyValue(currentPath, value);
                    if (!validation.isValid) {
                        errors.push({
                            property: currentPath,
                            ...validation
                        });
                    }
                    // Recursively validate nested objects
                    errors.push(...this.validateProperties(value, currentPath));
                }
            } else {
                // Validate primitive values
                const validation = validatePropertyValue(currentPath, value);
                if (!validation.isValid) {
                    errors.push({
                        property: currentPath,
                        ...validation
                    });
                }
            }
        }
        
        return errors;
    }

    findPropertyLocation(jsonString, propertyPath) {
        const lines = jsonString.split('\n');
        const parts = propertyPath.split('.');
        const propertyName = parts[parts.length - 1];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.includes(`"${propertyName}":`)) {
                return {
                    line: i + 1,
                    column: line.indexOf(`"${propertyName}"`) + 1
                };
            }
        }
        
        return { line: 1, column: 1 }; // fallback
    }

    getErrorPosition(error) {
        const match = error.message.match(/at position (\d+)/);
        return match ? parseInt(match[1]) : 0;
    }

    getLineAndColumn(text, position) {
        let line = 1;
        let column = 1;
        
        for (let i = 0; i < position; i++) {
            if (text[i] === '\n') {
                line++;
                column = 1;
            } else {
                column++;
            }
        }
        
        return { line, column };
    }

    analyzeError(jsonString, line, column, errorMessage) {
        const lines = jsonString.split('\n');
        const currentLine = lines[line - 1] || '';
        const nextLine = lines[line] || '';
        const prevLine = lines[line - 2] || '';
        
        // Search all lines for missing value pattern (colon followed by comma or end of line)
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.match(/:\s*,/) || line.match(/:\s*$/)) {
                const propertyMatch = line.match(/"([^"]+)"/);
                if (propertyMatch) {
                    const propertyName = propertyMatch[1];
                    return {
                        type: 'MISSING_VALUE',
                        message: `Missing value for property "${propertyName}"`,
                        suggestion: `A property must have a value after the colon. Add one of:\n` +
                                  `- String: "${propertyName}": "your text here"\n` +
                                  `- Number: "${propertyName}": 42\n` +
                                  `- Boolean: "${propertyName}": true\n` +
                                  `- Null: "${propertyName}": null\n` +
                                  `- Object: "${propertyName}": { }\n` +
                                  `- Array: "${propertyName}": [ ]`
                    };
                }
            }
        }
        
        // Check for trailing comma and closing brace pattern
        if (prevLine.trim().endsWith(',') && currentLine.trim().match(/^[}\]]/)) {
            return {
                type: 'TRAILING_COMMA',
                message: 'Found trailing comma before closing brace/bracket',
                suggestion: 'Remove the trailing comma. The last item in an object/array should not have a comma.'
            };
        }

        // Check for missing closing brace/bracket or structure issues
        const openBraces = (jsonString.match(/{/g) || []).length;
        const closeBraces = (jsonString.match(/}/g) || []).length;
        const openBrackets = (jsonString.match(/\[/g) || []).length;
        const closeBrackets = (jsonString.match(/\]/g) || []).length;
        
        // First check for brace/bracket mismatches
        if (openBraces > closeBraces || errorMessage.includes('Unexpected string')) {
            // Check if we're missing a closing brace in an object
            const indentStack = [];
            const lines = jsonString.split('\n');
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (line.includes('{')) indentStack.push('{');
                if (line.includes('}')) indentStack.pop();
                
                // If we find a property at the wrong indent level, it's likely a missing brace
                if (i === line - 1) {  // if this is our error line
                    if (indentStack.length > 0 && line.trim().startsWith('"')) {
                        return {
                            type: 'MISSING_BRACE',
                            message: 'Missing closing brace before this line',
                            suggestion: `Add a closing brace } after "object_map_external". The object that started with { needs to be closed.`
                        };
                    }
                }
            }
            
            if (openBraces > closeBraces) {
                const missingCount = openBraces - closeBraces;
                const location = currentLine.trim().startsWith('"') ? 'before this property' : 'at the end of the file';
                return {
                    type: 'MISSING_BRACE',
                    message: `Missing ${missingCount} closing brace${missingCount > 1 ? 's' : ''} ${location}`,
                    suggestion: `Add ${missingCount} closing brace${missingCount > 1 ? 's' : ''} (}) to properly close the object${missingCount > 1 ? 's' : ''}.`
                };
            }
        }
        
        if (openBrackets > closeBrackets) {
            return {
                type: 'MISSING_BRACKET',
                message: `Missing ${openBrackets - closeBrackets} closing bracket(s)`,
                suggestion: 'Add the missing closing bracket(s) ]. Each opening [ must have a matching ].'
            };
        }

        // Check for missing value after colon
        if (errorMessage.includes('Expected value') || 
            (errorMessage.includes('Unexpected token') && errorMessage.includes('","'))) {
            const colonIndex = currentLine.indexOf(':');
            if (colonIndex !== -1) {
                const afterColon = currentLine.substring(colonIndex + 1);
                const propertyName = currentLine.substring(0, colonIndex).trim().replace(/['"]/g, '');
                if (!afterColon.trim() || afterColon.trim() === ',' || afterColon.trim() === '}') {
                    return {
                        type: 'MISSING_VALUE',
                        message: `Missing value for property "${propertyName}"`,
                        suggestion: `A property must have a value after the colon. Add one of:\n` +
                                  `- String: "${propertyName}": "your text here"\n` +
                                  `- Number: "${propertyName}": 42\n` +
                                  `- Boolean: "${propertyName}": true\n` +
                                  `- Null: "${propertyName}": null\n` +
                                  `- Object: "${propertyName}": { }\n` +
                                  `- Array: "${propertyName}": [ ]`
                    };
                }
            }
        }
        
        // Also check for immediate comma after colon which indicates missing value
        if (currentLine.match(/:\s*,/) || currentLine.match(/:\s*$/)) {
            const propertyMatch = currentLine.match(/"([^"]+)"/);
            const propertyName = propertyMatch ? propertyMatch[1] : 'property';
            return {
                type: 'MISSING_VALUE',
                message: `Missing value for property "${propertyName}"`,
                suggestion: `A property must have a value after the colon. Add one of:\n` +
                          `- String: "${propertyName}": "your text here"\n` +
                          `- Number: "${propertyName}": 42\n` +
                          `- Boolean: "${propertyName}": true\n` +
                          `- Null: "${propertyName}": null\n` +
                          `- Object: "${propertyName}": { }\n` +
                          `- Array: "${propertyName}": [ ]`
            };
        }

        // Check for missing colon
        const unquotedPropMatch = currentLine.match(/"([^"]+)"\s+([^:,\s])/);
        if (unquotedPropMatch || currentLine.match(/"\s+[^:]/)) {
            const propertyName = unquotedPropMatch ? unquotedPropMatch[1] : currentLine.match(/"([^"]+)"/)?.[1];
            return {
                type: 'MISSING_COLON',
                message: `Missing colon after property "${propertyName}"`,
                suggestion: `Add a colon after the property name. Change:\n` +
                          `"${propertyName}" value\n` +
                          `to:\n` +
                          `"${propertyName}": value`
            };
        }

        // Check for invalid values
        if (errorMessage.includes('Unexpected token') || errorMessage.includes('Unexpected identifier')) {
            const invalidMatch = currentLine.match(/:\s*([^,}]+)/);
            if (invalidMatch) {
                const invalidValue = invalidMatch[1].trim();
                const propertyName = currentLine.match(/"([^"]+)"/)?.[1] || '';
                return {
                    type: 'INVALID_VALUE',
                    message: `Invalid JSON value: ${invalidValue}`,
                    suggestion: `The value "${invalidValue}" is not valid JSON. For property "${propertyName}", use:\n` +
                              `- Strings: wrap in quotes ("value")\n` +
                              `- Numbers: use plain numbers (42, 3.14)\n` +
                              `- Booleans: use true or false\n` +
                              `- Null: use null\n` +
                              `- Objects: use {}\n` +
                              `- Arrays: use []`
                };
            }
        }

        // Check for invalid escape sequences
        if (errorMessage.includes('Invalid or unexpected token') && currentLine.includes('\\')) {
            const match = currentLine.match(/\\([^"\\\/bfnrt])/);
            if (match) {
                const invalidEscape = match[1];
                return {
                    type: 'INVALID_ESCAPE',
                    message: `Invalid escape sequence: \\${invalidEscape}`,
                    suggestion: `Fix the escape sequence. Valid escape sequences are:\n` +
                              `- \\": For double quotes\n` +
                              `- \\\\: For backslash\n` +
                              `- \\\/: For forward slash\n` +
                              `- \\b, \\f, \\n, \\r, \\t: For control characters\n` +
                              `- \\uXXXX: For unicode characters (where XXXX is a hex code)`
                };
            }
            
            // For Windows paths specifically
            if (currentLine.match(/:\s*"[^"]*\\[^"]*"/)) {
                return {
                    type: 'INVALID_ESCAPE',
                    message: 'Invalid Windows path format',
                    suggestion: `Use forward slashes or escape backslashes in Windows paths:\n` +
                              `- Use forward slashes: "c:/path/to/file"\n` +
                              `- Or escape backslashes: "c:\\\\path\\\\to\\\\file"`
                };
            }
        }
        
        // Check for expected property name error which often indicates a trailing comma
        if (errorMessage.includes('Expected property name') || errorMessage.includes('Unexpected token')) {
            const linesBefore = lines.slice(0, line);
            const lastNonEmptyLine = linesBefore.reverse().find(l => l.trim());
            if (lastNonEmptyLine && lastNonEmptyLine.trim().endsWith(',')) {
                return {
                    type: 'TRAILING_COMMA',
                    message: 'Found trailing comma before closing brace/bracket',
                    suggestion: 'Remove the trailing comma. The last item in an object/array should not have a comma.'
                };
            }
        }

        // Check for unquoted property names
        const unquotedMatch = currentLine.match(/^\s*(\w+)\s*:/);
        if (unquotedMatch) {
            const propertyName = unquotedMatch[1];
            return {
                type: 'MISSING_QUOTES',
                message: `Property name "${propertyName}" must be in double quotes`,
                suggestion: `Change ${propertyName}: to "${propertyName}":`
            };
        }
        
        // Check for double commas
        if (currentLine.includes(',,')) {
            return {
                type: 'DOUBLE_COMMA',
                message: 'Found multiple consecutive commas',
                suggestion: 'Remove one of the commas. Properties should be separated by exactly one comma.'
            };
        }

        // Already handled by the first trailing comma check above
        if (currentLine.trim().endsWith(',') && (nextLine.trim().startsWith('}') || nextLine.trim().startsWith(']'))) {
            return {
                type: 'TRAILING_COMMA',
                message: 'Found trailing comma before closing brace/bracket',
                suggestion: 'Remove the trailing comma. The last property in an object/array should not have a comma.'
            };
        }

        if (errorMessage.includes('Unexpected token')) {
            const unexpectedChar = errorMessage.match(/Unexpected token (.+)/)?.[1];
            if (unexpectedChar) {
                return {
                    type: 'UNEXPECTED_TOKEN',
                    message: `Found unexpected character: ${unexpectedChar}`,
                    suggestion: unexpectedChar === ','
                        ? 'Remove the extra comma or add a property after it'
                        : `Remove or fix the unexpected character: ${unexpectedChar}`
                };
            }
        }

        if (errorMessage.includes('Expected \',\' or \'}\'')) {
            return {
                type: 'MISSING_COMMA',
                message: 'Missing comma between properties',
                suggestion: 'Add a comma to separate properties. Each property except the last one should be followed by a comma.'
            };
        }

        if (errorMessage.includes('Expected double-quoted property name')) {
            // Look for unquoted property names (word characters followed by colon)
            const unquotedMatch = currentLine.match(/\s*(\w+)\s*:/);
            if (unquotedMatch) {
                const propertyName = unquotedMatch[1];
                return {
                    type: 'MISSING_QUOTES',
                    message: `Property name "${propertyName}" is missing quotes`,
                    suggestion: `Add double quotes around the property name: "${propertyName}": value`
                };
            }
            return {
                type: 'INVALID_PROPERTY',
                message: 'Invalid or missing property name',
                suggestion: 'Property names must be strings in double quotes followed by a colon.'
            };
        }

        if (errorMessage.includes('Expected \',\' or \'}\'')) {
            return {
                type: 'MISSING_COMMA',
                message: 'Missing comma between properties',
                suggestion: 'Add a comma to separate properties. Each property except the last one should be followed by a comma.'
            };
        }

        if (errorMessage.includes('Unexpected end of JSON input')) {
            const openBraces = (jsonString.match(/{/g) || []).length;
            const closeBraces = (jsonString.match(/}/g) || []).length;
            const openBrackets = (jsonString.match(/\[/g) || []).length;
            const closeBrackets = (jsonString.match(/\]/g) || []).length;
            
            if (openBraces > closeBraces) {
                return {
                    type: 'UNCLOSED_OBJECT',
                    message: `Missing ${openBraces - closeBraces} closing brace(s) }`,
                    suggestion: 'Add the missing closing brace(s) }. Each opening brace { must have a matching closing brace }.'
                };
            }
            if (openBrackets > closeBrackets) {
                return {
                    type: 'UNCLOSED_ARRAY',
                    message: `Missing ${openBrackets - closeBrackets} closing bracket(s) ]`,
                    suggestion: 'Add the missing closing bracket(s) ]. Each opening bracket [ must have a matching closing bracket ].'
                };
            }
            return {
                type: 'INCOMPLETE_JSON',
                message: 'JSON structure is incomplete',
                suggestion: 'Check for missing closing braces } or brackets ] and ensure all properties have values.'
            };
        }

        // Default error
        return {
            type: 'SYNTAX_ERROR',
            message: errorMessage,
            suggestion: 'Double-check your JSON syntax, ensuring all properties and values are properly formatted.'
        };
    }

    formatErrorMessage(jsonString, line, column, error) {
        const lines = jsonString.split('\n');
        const startLine = Math.max(0, line - 2);
        const endLine = Math.min(lines.length, line + 1);
        
        let preview = '';
        for (let i = startLine; i < endLine; i++) {
            const lineNum = String(i + 1).padStart(4, ' ');
            if (i + 1 === line) {
                preview += `${chalk.gray(lineNum)} | ${chalk.red(lines[i])}\n`;
                preview += `     | ${' '.repeat(column - 1)}${chalk.red('^')}\n`;
                preview += `     | ${' '.repeat(column - 1)}${chalk.red('⌄')} ${error.type}\n`;
            } else {
                preview += `${chalk.gray(lineNum)} | ${lines[i]}\n`;
            }
        }

        return {
            isValid: false,
            error: {
                message: `JSON Syntax Error at line ${chalk.yellow(line)}, column ${chalk.yellow(column)}:`,
                preview: preview,
                details: error.message,
                suggestion: error.suggestion
            }
        };
    }

    formatJsonError(error, jsonString) {
        const lines = jsonString.split('\n');
        const position = this.getErrorPosition(error);
        const { line, column } = this.getLineAndColumn(jsonString, position);
        
        // Get 2 lines before and after for context
        const contextStart = Math.max(0, line - 3);
        const contextEnd = Math.min(lines.length, line + 2);
        
        let errorPreview = '';
        for (let i = contextStart; i < contextEnd; i++) {
            const lineNum = String(i + 1).padStart(4, ' ');
            if (i + 1 === line) {
                // Highlight the error line
                errorPreview += `${chalk.gray(lineNum)} | ${chalk.red(lines[i])}\n`;
                // Add pointer to the error position
                errorPreview += `     | ${' '.repeat(column - 1)}${chalk.red('^')}\n`;
                errorPreview += `     | ${' '.repeat(column - 1)}${chalk.red('⌄')} Syntax error here\n`;
            } else {
                errorPreview += `${chalk.gray(lineNum)} | ${lines[i]}\n`;
            }
        }

        const errorMessage = this.getErrorMessage(error);
        
        return {
            isValid: false,
            error: {
                message: `JSON Syntax Error at line ${chalk.yellow(line)}, column ${chalk.yellow(column)}:`,
                details: errorMessage,
                preview: errorPreview,
                line,
                column
            }
        };
    }

    getErrorPosition(error) {
        const match = error.message.match(/at position (\d+)/);
        return match ? parseInt(match[1]) : 0;
    }

    getLineAndColumn(text, position) {
        let line = 1;
        let column = 1;
        
        for (let i = 0; i < position; i++) {
            if (text[i] === '\n') {
                line++;
                column = 1;
            } else {
                column++;
            }
        }
        
        return { line, column };
    }

    getErrorMessage(error) {
        const basicMessage = error.message.replace(/^.*position \d+/, '').trim();
        
        // Make error messages more user-friendly
        const errorMap = {
            'Expected double-quoted property name': 'Missing or invalid property name. Make sure property names are in double quotes.',
            'Expected comma': 'Missing comma between properties.',
            'Expected property name or \'}\'': 'Extra comma found or missing property.',
            'Unexpected token': 'Unexpected character or symbol found.',
            'Unexpected end of JSON input': 'JSON file is incomplete. Check for missing closing brackets/braces.'
        };

        for (const [key, value] of Object.entries(errorMap)) {
            if (basicMessage.includes(key)) {
                return value;
            }
        }

        return basicMessage;
    }
}

module.exports = JsonValidator;
