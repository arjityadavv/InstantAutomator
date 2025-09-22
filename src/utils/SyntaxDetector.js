class SyntaxDetector {
    /**
     * Detects if a test script uses the new {{var.}} or {{obj.}} syntax
     * @param {string} testScriptContent - Raw JSON content of the test script
     * @returns {object} - Detection result with flags for var and obj syntax usage
     */
    static detectNewSyntax(testScriptContent) {
        const result = {
            usesVarSyntax: false,
            usesObjSyntax: false,
            usesNewSyntax: false
        };

        // Regular expressions to detect the new syntax patterns
        const varPattern = /\{\{var\.[^}]+\}\}/g;
        const objPattern = /\{\{obj\.[^}]+\}\}/g;

        // Check for {{var.}} pattern
        result.usesVarSyntax = varPattern.test(testScriptContent);
        
        // Check for {{obj.}} pattern  
        result.usesObjSyntax = objPattern.test(testScriptContent);
        
        // Overall flag for any new syntax usage
        result.usesNewSyntax = result.usesVarSyntax || result.usesObjSyntax;

        return result;
    }

    /**
     * Validates if object map is required based on syntax detection
     * @param {string} testScriptContent - Raw JSON content of the test script
     * @returns {boolean} - True if object map is required, false otherwise
     */
    static isObjectMapRequired(testScriptContent) {
        const detection = this.detectNewSyntax(testScriptContent);
        
        // Object map is required if either {{var.}} or {{obj.}} syntax is used
        return detection.usesNewSyntax;
    }

    /**
     * Provides helpful feedback about syntax usage
     * @param {string} testScriptContent - Raw JSON content of the test script
     * @returns {object} - Feedback object with messages and recommendations
     */
    static getSyntaxFeedback(testScriptContent) {
        const detection = this.detectNewSyntax(testScriptContent);
        
        const feedback = {
            requiresObjectMap: detection.usesNewSyntax,
            messages: []
        };

        if (detection.usesVarSyntax) {
            feedback.messages.push('✓ Detected {{var.}} syntax - variable map will be used');
        }

        if (detection.usesObjSyntax) {
            feedback.messages.push('✓ Detected {{obj.}} syntax - object map is required');
        }

        if (!detection.usesNewSyntax) {
            feedback.messages.push('✓ No new syntax detected - object map is optional');
        }

        return feedback;
    }
}

module.exports = SyntaxDetector;