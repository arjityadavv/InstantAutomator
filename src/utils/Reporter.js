const fs = require('fs').promises;
const path = require('path');
const TestAnalytics = require('./TestAnalytics');
const BuildInfoCollector = require('./BuildInfoCollector');

class Reporter {
    constructor(reportPath) {
        this.reportPath = reportPath;
        this.testResults = [];
        this.currentTest = null;
        this.analytics = new TestAnalytics(reportPath);
        this.buildInfoCollector = new BuildInfoCollector();
        this.suites = new Map();
        this.currentSuite = null;
    }

    async startTestSuite(suiteName) {
        this.currentSuite = {
            name: suiteName,
            startTime: new Date(),
            tests: []
        };
    }

    async endTestSuite() {
        if (this.currentSuite) {
            this.currentSuite.endTime = new Date();
            this.currentSuite.duration = this.currentSuite.endTime - this.currentSuite.startTime;
            this.testResults.push(this.currentSuite);
            await this.generateReport();
        }
    }

    async startTest(testName, { suite = 'Default', owner = 'Unknown', component = 'Unknown' } = {}) {
        this.currentTest = {
            name: testName,
            suite,
            owner,
            component,
            startTime: new Date(),
            steps: [],
            status: 'PASS',
            screenshots: [],
            videos: [],
            logs: [],
            retryCount: 0
        };

        if (!this.suites.has(suite)) {
            this.suites.set(suite, { total: 0, passed: 0, failed: 0, skipped: 0 });
        }
        this.suites.get(suite).total++;
    }

    async addStep(action, status, message) {
        if (this.currentTest) {
            this.currentTest.steps.push({
                action,
                status,
                message,
                timestamp: new Date()
            });
            
            if (status === 'FAIL') {
                this.currentTest.status = 'FAIL';
                this.suites.get(this.currentTest.suite).failed++;
            } else if (status === 'SKIP') {
                this.currentTest.status = 'SKIP';
                this.suites.get(this.currentTest.suite).skipped++;
            }
        }
    }

    async addError(error, stackTrace) {
        if (this.currentTest) {
            this.currentTest.error = error;
            this.currentTest.stackTrace = stackTrace;
        }
    }

    async captureScreenshot(page, actionName) {
        if (!page) return null;

        const timestamp = new Date().toISOString().replace(/[:]/g, '-').replace(/\./g, '-');
        const screenshotName = `${actionName}_${timestamp}.png`;
        const screenshotPath = path.join(this.reportPath, 'screenshots', screenshotName);
        const relativeScreenshotPath = path.join('screenshots', screenshotName);
        
        try {
            await fs.mkdir(path.join(this.reportPath, 'screenshots'), { recursive: true });
            await page.screenshot({ path: screenshotPath, fullPage: true });
            
            if (this.currentTest) {
                this.currentTest.screenshots.push({
                    name: actionName,
                    path: relativeScreenshotPath,
                    timestamp: new Date()
                });
            }
            
            return relativeScreenshotPath;
        } catch (error) {
            console.error('Failed to capture screenshot:', error);
            return null;
        }
    }

    async captureVideo(page, actionName) {
        // Implementation for video recording
    }

    async addLogEntry(level, message) {
        if (this.currentTest) {
            this.currentTest.logs.push({
                level,
                message,
                timestamp: new Date()
            });
        }
    }

    async endTest() {
        if (this.currentTest) {
            this.currentTest.endTime = new Date();
            this.currentTest.duration = this.currentTest.endTime - this.currentTest.startTime;
            
            // Add test to current suite
            if (this.currentSuite) {
                this.currentTest.suite = this.currentSuite.name;
                this.currentSuite.tests.push(this.currentTest);
            }
            
            this.testResults.push(this.currentTest);
            this.currentTest = null;
        }
    }

    async generateReport() {
        const buildInfo = await this.buildInfoCollector.collect();
        
        // Make sure we have proper test data structure
        const allTests = this.currentSuite.tests || [];
        await this.analytics.saveTestRun(allTests, buildInfo);
        const history = await this.analytics.loadHistory();
        const trends = this.analytics.calculateTrends(history);
        const totalTests = allTests.length;
        const passedTests = allTests.filter(t => t.status === 'PASS').length;
        const failedTests = allTests.filter(t => t.status === 'FAIL').length;
        const skippedTests = allTests.filter(t => t.status === 'SKIP').length;

        const totalDuration = allTests.reduce((acc, test) => acc + (test.duration || 0), 0);
        const durationStr = new Date(totalDuration).toISOString().substr(11, 8);

        // Generate the HTML report template (shortened for brevity)
        const reportTemplate = this.generateHTMLReport({
            summary: {
                total: totalTests,
                passed: passedTests,
                failed: failedTests,
                skipped: skippedTests,
                duration: durationStr
            },
            buildInfo,
            trends,
            suites: [this.currentSuite],
            tests: allTests
        });

        const reportPath = path.join(this.reportPath, `report_${new Date().toISOString().replace(/:/g, '-')}.html`);
        await fs.mkdir(this.reportPath, { recursive: true });
        await fs.writeFile(reportPath, reportTemplate);
        return reportPath;
    }

    generateHTMLReport(data) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Comprehensive Test Execution Report</title>
            <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
            <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
            <script src="https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js"></script>
            <style>
                .card { @apply bg-white rounded-lg shadow p-6 mb-4; }
                .tab { @apply px-4 py-2 hover:bg-gray-100 cursor-pointer; }
                .tab.active { @apply bg-blue-500 text-white; }
                .status-dot {
                    @apply w-3 h-3 rounded-full inline-block mr-2;
                }
                .pass { @apply bg-green-500; }
                .fail { @apply bg-red-500; }
                .skip { @apply bg-yellow-500; }
            </style>
        </head>
        <body class="bg-gray-50 p-6">
            <!-- Build Info -->
            <div class="card">
                <h2 class="text-xl font-bold mb-4">Build Information</h2>
                <div class="grid grid-cols-3 gap-4">
                    <div>
                        <p><strong>Git Branch:</strong> ${data.buildInfo.git.branch}</p>
                        <p><strong>Commit:</strong> ${data.buildInfo.git.commit}</p>
                    </div>
                    <div>
                        <p><strong>OS:</strong> ${data.buildInfo.environment.os.type}</p>
                        <p><strong>Node:</strong> ${data.buildInfo.environment.node}</p>
                    </div>
                    <div>
                        <p><strong>Browser:</strong> ${data.buildInfo.browser.userAgent}</p>
                        <p><strong>Timestamp:</strong> ${data.buildInfo.timestamp}</p>
                    </div>
                </div>
            </div>

            <!-- Summary -->
            <div class="grid grid-cols-2 gap-4 mb-4">
                <div class="card">
                    <h2 class="text-xl font-bold mb-4">Test Summary</h2>
                    <div class="grid grid-cols-2 gap-4">
                        <div id="summaryChart" style="height: 300px;"></div>
                        <div>
                            <div class="mb-2">
                                <span class="status-dot pass"></span>
                                Passed: ${data.summary.passed} (${((data.summary.passed/data.summary.total)*100).toFixed(1)}%)
                            </div>
                            <div class="mb-2">
                                <span class="status-dot fail"></span>
                                Failed: ${data.summary.failed}
                            </div>
                            <div class="mb-2">
                                <span class="status-dot skip"></span>
                                Skipped: ${data.summary.skipped}
                            </div>
                            <div class="mt-4">
                                <p><strong>Total Duration:</strong> ${data.summary.duration}</p>
                                <p><strong>Total Tests:</strong> ${data.summary.total}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="card">
                    <h2 class="text-xl font-bold mb-4">Trends</h2>
                    <div id="trendChart" style="height: 300px;"></div>
                </div>
            </div>

            <!-- Suite Breakdown -->
            <div class="card">
                <h2 class="text-xl font-bold mb-4">Test Suites</h2>
                <div class="grid grid-cols-3 gap-4">
                    ${data.suites.map(suite => `
                        <div class="p-4 border rounded">
                            <h3 class="font-bold">${suite.name || 'Default Suite'}</h3>
                            <div class="mt-2">
                                <div>Tests: ${(suite.tests || []).length}</div>
                                <div>Duration: ${suite.duration ? (suite.duration/1000).toFixed(2) : '0.00'}s</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Test Details -->
            <div class="card">
                <h2 class="text-xl font-bold mb-4">Test Details</h2>
                <div class="overflow-x-auto">
                    <table class="min-w-full">
                        <thead>
                            <tr class="bg-gray-100">
                                <th class="p-3 text-left">Test Name</th>
                                <th class="p-3 text-left">Suite</th>
                                <th class="p-3 text-left">Status</th>
                                <th class="p-3 text-left">Duration</th>
                                <th class="p-3 text-left">Owner</th>
                                <th class="p-3 text-left">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.tests.map((test, index) => `
                                <tr class="border-b hover:bg-gray-50 cursor-pointer test-row" data-test-id="${index}">
                                    <td class="p-3">
                                        <div class="flex items-center">
                                            <span class="mr-2 transform transition-transform duration-200 arrow">▶</span>
                                            ${test.name}
                                        </div>
                                    </td>
                                    <td class="p-3">${test.suite || 'Default Suite'}</td>
                                    <td class="p-3">
                                        <span class="status-dot ${test.status ? test.status.toLowerCase() : 'unknown'}"></span>
                                        ${test.status || 'Unknown'}
                                    </td>
                                    <td class="p-3">${test.duration ? (test.duration/1000).toFixed(2) : '0.00'}s</td>
                                    <td class="p-3">${test.owner || 'Unknown'}</td>
                                    <td class="p-3">
                                        <button class="text-blue-500 hover:text-blue-700" onclick="toggleTestDetails(${index})">
                                            View Details
                                        </button>
                                    </td>
                                </tr>
                                <tr class="test-details hidden" id="test-details-${index}">
                                    <td colspan="6" class="p-0">
                                        <div class="bg-gray-50 p-6 border-t">
                                            <!-- Steps Timeline -->
                                            <div class="steps-timeline mb-6">
                                                ${test.steps.map((step, stepIndex) => `
                                                    <div class="step-item mb-4 ml-4 border-l-2 border-gray-200 pl-4 relative">
                                                        <div class="absolute w-3 h-3 rounded-full ${
                                                            step.status === 'PASS' ? 'bg-green-500' :
                                                            step.status === 'FAIL' ? 'bg-red-500' :
                                                            'bg-blue-500'
                                                        } left-[-7px] top-1"></div>
                                                        <div class="step-header flex justify-between items-center">
                                                            <h4 class="font-semibold">${step.action}</h4>
                                                            <span class="text-sm text-gray-500">
                                                                ${new Date(step.timestamp).toLocaleTimeString()}
                                                            </span>
                                                        </div>
                                                        <div class="step-content mt-2">
                                                            <p class="text-sm ${
                                                                step.status === 'FAIL' ? 'text-red-600' :
                                                                step.status === 'PASS' ? 'text-green-600' :
                                                                'text-gray-600'
                                                            }">${step.message}</p>
                                                        </div>
                                                    </div>
                                                `).join('')}
                                            </div>

                                            ${test.error ? `
                                                <!-- Error Details -->
                                                <div class="error-details bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                                                    <h4 class="text-red-700 font-semibold mb-2">Error Details</h4>
                                                    <p class="text-red-600 mb-2">${test.error}</p>
                                                    ${test.stackTrace ? `
                                                        <pre class="bg-red-100 p-3 rounded text-sm overflow-x-auto">${test.stackTrace}</pre>
                                                    ` : ''}
                                                </div>
                                            ` : ''}

                                            <!-- Screenshots Gallery -->
                                            ${test.screenshots.length > 0 ? `
                                                <div class="screenshots-gallery">
                                                    <h4 class="font-semibold mb-3">Screenshots</h4>
                                                    <div class="grid grid-cols-2 gap-4">
                                                        ${test.screenshots.map(screenshot => `
                                                            <div class="screenshot-item">
                                                                <p class="text-sm text-gray-600 mb-2">
                                                                    ${screenshot.name}
                                                                    <span class="text-gray-400 ml-2">
                                                                        ${new Date(screenshot.timestamp).toLocaleTimeString()}
                                                                    </span>
                                                                </p>
                                                                <img src="${screenshot.path}" 
                                                                     alt="${screenshot.name}"
                                                                     class="rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                                                                     onclick="showImageModal(this.src)">
                                                            </div>
                                                        `).join('')}
                                                    </div>
                                                </div>
                                            ` : ''}
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Image Modal -->
            <div id="imageModal" class="fixed inset-0 bg-black bg-opacity-75 hidden flex items-center justify-center z-50">
                <div class="relative max-w-4xl mx-auto">
                    <img id="modalImage" src="" alt="Screenshot" class="max-h-[90vh] max-w-full">
                    <button onclick="closeImageModal()" class="absolute top-4 right-4 text-white text-2xl">&times;</button>
                </div>
            </div>

            <script>
                function toggleTestDetails(testId) {
                    const detailsRow = document.getElementById(\`test-details-\${testId}\`);
                    const arrow = document.querySelector(\`[data-test-id="\${testId}"] .arrow\`);
                    
                    if (detailsRow.classList.contains('hidden')) {
                        // Hide all other open details
                        document.querySelectorAll('.test-details').forEach(row => {
                            row.classList.add('hidden');
                        });
                        document.querySelectorAll('.arrow').forEach(arrow => {
                            arrow.style.transform = 'rotate(0deg)';
                        });

                        // Show selected details
                        detailsRow.classList.remove('hidden');
                        arrow.style.transform = 'rotate(90deg)';
                    } else {
                        detailsRow.classList.add('hidden');
                        arrow.style.transform = 'rotate(0deg)';
                    }
                }

                function showImageModal(src) {
                    const modal = document.getElementById('imageModal');
                    const modalImage = document.getElementById('modalImage');
                    modal.classList.remove('hidden');
                    modalImage.src = src;
                }

                function closeImageModal() {
                    const modal = document.getElementById('imageModal');
                    modal.classList.add('hidden');
                }

                // Close modal on click outside
                document.getElementById('imageModal').addEventListener('click', function(e) {
                    if (e.target === this) {
                        closeImageModal();
                    }
                });
            </script>

            <script>
                // Initialize charts
                const summaryChart = echarts.init(document.getElementById('summaryChart'));
                summaryChart.setOption({
                    series: [{
                        type: 'pie',
                        data: [
                            { value: ${data.summary.passed}, name: 'Passed', itemStyle: { color: '#10B981' } },
                            { value: ${data.summary.failed}, name: 'Failed', itemStyle: { color: '#EF4444' } },
                            { value: ${data.summary.skipped}, name: 'Skipped', itemStyle: { color: '#F59E0B' } }
                        ],
                        radius: ['40%', '70%']
                    }]
                });

                const trendChart = echarts.init(document.getElementById('trendChart'));
                const trendsData = ${JSON.stringify(data.trends || { passRate: [] })};
                const passRateData = trendsData.passRate || [];
                
                trendChart.setOption({
                    xAxis: {
                        type: 'category',
                        data: passRateData.map(d => d.date ? d.date.split('T')[0] : 'Unknown')
                    },
                    yAxis: {
                        type: 'value',
                        max: 100
                    },
                    series: [{
                        data: passRateData.map(d => d.rate || 0),
                        type: 'line',
                        smooth: true
                    }],
                    tooltip: {
                        trigger: 'axis',
                        formatter: function(params) {
                            if (params.length === 0) return '';
                            const point = params[0];
                            return point.name + '<br/>Pass Rate: ' + point.value.toFixed(1) + '%';
                        }
                    }
                });
            </script>
        </body>
        </html>`;
    }
}

module.exports = Reporter;
