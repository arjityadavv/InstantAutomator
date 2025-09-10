const Ajv = require('ajv');
const path = require('path');
const fs = require('fs').promises;
const chalk = require('chalk');

class SchemaValidator {
    constructor() {
        this.ajv = new Ajv({ allErrors: true });
    }

    validateJsonSyntax(jsonString) {
        try {
            JSON.parse(jsonString);
            return { valid: true };
        } catch (error) {
            // Get line and column number from the error message
            const match = error.message.match(/at position (\d+)/);
            let position = match ? parseInt(match[1]) : 0;
            
            // Find the line and column number from the position
            let line = 1;
            let column = 1;
            for (let i = 0; i < position; i++) {
                if (jsonString[i] === '\n') {
                    line++;
                    column = 1;
                } else {
                    column++;
                }
            }

            // Get surrounding lines for context (2 lines before and after)
            const lines = jsonString.split('\n');
            const startLine = Math.max(0, line - 3);
            const endLine = Math.min(lines.length, line + 2);
            const relevantLines = lines.slice(startLine, endLine);
            
            // Create the preview with line numbers and error pointer
            const preview = relevantLines.map((content, idx) => {
                const lineNumber = startLine + idx + 1;
                const isErrorLine = lineNumber === line;
                const lineNumStr = lineNumber.toString().padStart(4);
                const lineContent = isErrorLine ? chalk.red(content) : content;
                let output = `${chalk.gray(lineNumStr)} | ${lineContent}`;
                
                if (isErrorLine) {
                    // Add arrow pointer to the exact position
                    output += '\n' + ' '.repeat(6) + '| ' + ' '.repeat(column - 1) + chalk.red('^');
                    output += '\n' + ' '.repeat(6) + '| ' + ' '.repeat(column - 1) + chalk.red('⌃ Error here');
                }
                return output;
            }).join('\n');

            // Create a more descriptive error message
            const errorDesc = error.message.replace(/^.*position \d+/, '').trim();
            const friendlyMessage = `JSON Syntax Error at line ${line}, column ${column}: ${errorDesc}`;

            return {
                valid: false,
                error: {
                    message: chalk.red(friendlyMessage),
                    line,
                    column,
                    preview: `\n${preview}\n`
                }
            };
        }
    }

    async loadSchema() {
        try {
            const schemaPath = path.join(__dirname, '..', '..', 'schemas', 'testscript.schema.json');
            const schemaContent = await fs.readFile(schemaPath, 'utf8');
            this.schema = JSON.parse(schemaContent);
            this.validate = this.ajv.compile(this.schema);
        } catch (error) {
            throw new Error(`Failed to load schema: ${error.message}`);
        }
    }

    async validateTestScript(testScript, rawJson) {
        // First validate JSON syntax if raw JSON is provided
        if (rawJson) {
            const syntaxCheck = this.validateJsonSyntax(rawJson);
            if (!syntaxCheck.valid) {
                throw new Error(syntaxCheck.error.message + syntaxCheck.error.preview);
            }
        }

        // Then validate against schema
        if (!this.validate) {
            await this.loadSchema();
        }

        const valid = this.validate(testScript);
        
        if (!valid) {
            const errors = this.validate.errors.map(error => {
                return {
                    path: error.instancePath,
                    message: error.message,
                    params: error.params
                };
            });
            
            const errorMessage = errors.map(err => 
                `${chalk.red('✗')} Error at ${chalk.yellow(err.path || 'root')}: ${err.message}`
            ).join('\n');
            
            throw new Error(`Test script validation failed:\n${errorMessage}`);
        }

        return true;
    }
}

module.exports = SchemaValidator;
