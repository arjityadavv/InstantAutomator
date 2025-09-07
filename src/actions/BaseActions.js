const path = require('path');
const fs = require('fs');

class BaseActions {
    constructor(config) {
        this.config = config;
        this.objectMap = null;
        this.variableMap = null;
        
        // Load object map
        if (config && config.object_map_external) {
            const objectMapPath = path.resolve(process.cwd(), config.object_map_external);
            try {
                this.objectMap = JSON.parse(fs.readFileSync(objectMapPath, 'utf8'));
            } catch (e) {
                console.error('Failed to load object map:', e);
            }
        }

        // Load variable map
        if (config && config.variable_map_external) {
            const variableMapPath = path.resolve(process.cwd(), config.variable_map_external);
            try {
                this.variableMap = JSON.parse(fs.readFileSync(variableMapPath, 'utf8'));
            } catch (e) {
                console.error('Failed to load variable map:', e);
            }
        }
    }

    getSelector(elementKey) {
        if (!this.objectMap || !elementKey) {
            throw new Error('Object map or element key is missing');
        }
        const element = this.objectMap[elementKey];
        if (!element) {
            throw new Error(`Element '${elementKey}' not found in object map`);
        }
        if (element.locator_name === 'xpath') {
            return `xpath=${element.locator_value}`;
        }
        return element.locator_value;
    }
}

module.exports = BaseActions;
