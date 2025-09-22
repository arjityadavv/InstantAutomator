const { AllureRuntime, Status, ContentType, Stage } = require('allure-js-commons');
const fs = require('fs').promises;
const path = require('path');

class AllureReporter {
    constructor(config) {
        this.resultsDir = path.join(config.test_report_path, 'allure-results');
        this.runtime = new AllureRuntime({ resultsDir: this.resultsDir });
        this.currentTest = null;
        this.currentSuite = null;
        this.config = config;
        this.suiteResults = new Map();
    }

    async startTestSuite(suiteName) {
        this.currentSuite = {
            name: suiteName,
            tests: []
        };
    }

    async startTest(testName, { suite = '', owner = 'Unknown', description = '' } = {}) {
        const test = {
            name: testName,
            fullName: `${suite} - ${testName}`,
            suite: suite,
            status: Status.PASSED,
            stage: 'running',
            steps: [],
            attachments: [],
            parameters: [],
            labels: [
                { name: 'suite', value: suite },
                { name: 'owner', value: owner }
            ],
            startTime: Date.now()
        };

        if (description) {
            test.description = description;
        }

        this.currentTest = test;
        this.currentSuite.tests.push(test);
    }

    async addStep(stepName, status, message = '') {
        if (!this.currentTest) return;

        const step = {
            name: stepName,
            status: this._mapStatus(status),
            stage: 'finished',
            start: Date.now(),
            stop: Date.now(),
            parameters: [],
            steps: [],
            attachments: [],
            statusDetails: message ? { message } : undefined
        };

        this.currentTest.steps.push(step);

        if (status.toUpperCase() === 'FAIL') {
            this.currentTest.status = Status.FAILED;
        }
    }

    async addAttachment(name, content, type) {
        if (!this.currentTest) return;

        const fileName = `${Date.now()}-${name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`;
        const filePath = path.join(this.resultsDir, fileName);
        await fs.writeFile(filePath, content);

        this.currentTest.attachments.push({
            name,
            type,
            source: fileName
        });
    }

    async addScreenshot(name, buffer) {
        await this.addAttachment(name, buffer, ContentType.PNG);
    }

    /**
     * Add visual testing attachments for debugging failed visual tests
     * @param {Object} visualResult - Result from visual testing with paths
     */
    async addVisualTestingAttachments(visualResult) {
        if (!this.currentTest || !visualResult.visualFailure) return;
        
        try {
            // Add baseline image
            if (visualResult.baselinePath && require('fs').existsSync(visualResult.baselinePath)) {
                const baselineBuffer = await fs.readFile(visualResult.baselinePath);
                await this.addAttachment('Baseline Image', baselineBuffer, ContentType.PNG);
            }
            
            // Add current screenshot
            if (visualResult.actualPath && require('fs').existsSync(visualResult.actualPath)) {
                const actualBuffer = await fs.readFile(visualResult.actualPath);
                await this.addAttachment('Current Screenshot', actualBuffer, ContentType.PNG);
            }
            
            // Add diff image if available
            if (visualResult.diffPath && require('fs').existsSync(visualResult.diffPath)) {
                const diffBuffer = await fs.readFile(visualResult.diffPath);
                await this.addAttachment('Visual Difference', diffBuffer, ContentType.PNG);
            }
            
            // Add comparison details as text
            if (visualResult.comparison) {
                const comparisonText = `Visual Comparison Details:
Status: ${visualResult.status}
Message: ${visualResult.message}
Baseline: ${visualResult.baselineName}
Comparison Result: ${JSON.stringify(visualResult.comparison, null, 2)}`;
                
                await this.addAttachment('Visual Comparison Details', comparisonText, ContentType.TEXT);
            }
            
        } catch (error) {
            console.error('Failed to add visual testing attachments:', error.message);
        }
    }

    async addError(error, trace) {
        if (!this.currentTest) return;

        this.currentTest.statusDetails = {
            message: error,
            trace: trace
        };
        this.currentTest.status = Status.FAILED;
    }

    async endTest() {
        if (!this.currentTest) return;

        this.currentTest.stage = 'finished';
        this.currentTest.stop = Date.now();
        await this._writeTestResult(this.currentTest);
        this.currentTest = null;
    }

    async endTestSuite() {
        if (!this.currentSuite) return;
        this.currentSuite = null;
    }

    _mapStatus(status) {
        switch (status.toUpperCase()) {
            case 'PASS':
                return Status.PASSED;
            case 'FAIL':
                return Status.FAILED;
            case 'SKIP':
                return Status.SKIPPED;
            default:
                return Status.BROKEN;
        }
    }

    async _writeTestResult(test) {
        try {
            const testResult = {
                name: test.name,
                fullName: test.fullName,
                status: test.status,
                stage: test.stage,
                start: test.startTime,
                stop: test.stop,
                parameters: test.parameters,
                steps: test.steps,
                attachments: test.attachments,
                labels: test.labels,
                statusDetails: test.statusDetails
            };

            const fileName = `${test.startTime}-${test.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-result.json`;
            const filePath = path.join(this.resultsDir, fileName);
            await fs.mkdir(path.dirname(filePath), { recursive: true });
            await fs.writeFile(filePath, JSON.stringify(testResult, null, 2));
        } catch (error) {
            console.error('Failed to write test result:', error);
        }
    }
}

module.exports = AllureReporter;
