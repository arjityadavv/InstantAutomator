const crypto = require('crypto');

class TestDataManager {
    constructor() {
        this.variables = new Map();
        this.encryptionKey = process.env.ENCRYPTION_KEY || 'default-encryption-key';
    }

    setVariable(name, value) {
        this.variables.set(name, value);
    }

    getVariable(name) {
        return this.variables.get(name);
    }

    substituteVariables(text) {
        if (typeof text !== 'string') return text;
        
        return text.replace(/\${(.*?)}/g, (match, variable) => {
            const value = this.variables.get(variable);
            return value !== undefined ? value : match;
        });
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
                // Check for encrypted values (assuming they start with 'ENC:')
                if (value.startsWith('ENC:')) {
                    processedConfig[key] = this.decrypt(value.substring(4));
                } else {
                    processedConfig[key] = this.substituteVariables(value);
                }
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
