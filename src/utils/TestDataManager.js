const crypto = require('crypto');
const ObjectMapResolver = require('./ObjectMapResolver');

class TestDataManager {
    constructor(variableMap = {}, objectMap = {}) {
        this.variables = new Map();
        this.encryptionKey = process.env.ENCRYPTION_KEY || 'default-encryption-key';
        this.objectMapResolver = new ObjectMapResolver(objectMap);
        this.loadVariables(variableMap);
    }

    setObjectMap(objectMap) {
        this.objectMapResolver.setObjectMap(objectMap);
    }

    loadVariables(variableMap) {
        Object.entries(variableMap).forEach(([key, value]) => {
            this.setVariable(key, value);
        });
    }

    setVariable(name, value) {
        this.variables.set(name, value);
    }

    getVariable(name) {
        return this.variables.get(name);
    }

    resolveValue(value) {
        if (typeof value === 'string' && value.startsWith('$')) {
            const varName = value.substring(1);
            return this.getVariable(varName) || value;
        }
        return value;
    }

    substituteVariables(text) {
        if (typeof text !== 'string') return text;
        
        // Handle {{var.keyName}} format
        text = text.replace(/\{\{var\.([^}]+)\}\}/g, (match, variable) => {
            const value = this.variables.get(variable);
            return value !== undefined ? value : match;
        });
        
        // Handle legacy ${variable} format for backward compatibility
        text = text.replace(/\${(.*?)}/g, (match, variable) => {
            const value = this.variables.get(variable);
            return value !== undefined ? value : match;
        });
        
        return text;
    }

    encrypt(text) {
        const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return encrypted;
    }

    decrypt(encryptedText) {
        try {
            const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
            let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        } catch (error) {
            console.error('Decryption failed:', error);
            return encryptedText;
        }
    }

    processActionConfig(actionConfig) {
        if (typeof actionConfig !== 'object') return actionConfig;

        const processedConfig = {};
        for (const [key, value] of Object.entries(actionConfig)) {
            if (typeof value === 'string') {
                let processedValue = value;
                
                // First resolve object map references {{obj.keyName}}
                processedValue = this.objectMapResolver.resolveObjectReference(processedValue);
                
                // Then handle encrypted values
                if (processedValue.startsWith('ENC:')) {
                    processedValue = this.decrypt(processedValue.substring(4));
                } 
                // Handle {{var.keyName}} format
                else if (processedValue.includes('{{var.')) {
                    processedValue = this.substituteVariables(processedValue);
                }
                
                processedConfig[key] = processedValue;
            } else if (Array.isArray(value)) {
                processedConfig[key] = value.map(item => this.processActionConfig(item));
            } else if (typeof value === 'object') {
                processedConfig[key] = this.processActionConfig(value);
            } else {
                processedConfig[key] = value;
            }
        }
        return processedConfig;
    }
}

module.exports = TestDataManager;
