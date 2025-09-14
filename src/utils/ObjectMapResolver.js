class ObjectMapResolver {
    constructor(objectMap = {}) {
        this.objectMap = objectMap;
    }

    setObjectMap(objectMap) {
        this.objectMap = objectMap;
    }

    resolveObjectReference(text) {
        if (typeof text !== 'string') return text;
        
        // Handle {{obj.keyName}} format - return the keyName, not the selector value
        return text.replace(/\{\{obj\.([^}]+)\}\}/g, (match, objectKey) => {
            // Check if the key exists in the object map
            if (this.objectMap[objectKey]) {
                // Return the key itself, which will be used with getSelector()
                return objectKey;
            }
            return match; // Return original if not found
        });
    }

    processActionConfig(actionConfig) {
        if (typeof actionConfig !== 'object') return actionConfig;

        const processedConfig = {};
        for (const [key, value] of Object.entries(actionConfig)) {
            if (typeof value === 'string') {
                processedConfig[key] = this.resolveObjectReference(value);
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

module.exports = ObjectMapResolver;
