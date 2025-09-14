const fs = require('fs').promises;
const path = require('path');

class TestAnalytics {
    constructor(historyPath) {
        this.historyPath = historyPath;
        this.historyFile = path.join(historyPath, 'test_history.json');
        this.coverageFile = path.join(historyPath, 'coverage.json');
    }

    async saveTestRun(testResults, buildInfo) {
        const history = await this.loadHistory();
        const run = {
            timestamp: new Date().toISOString(),
            buildInfo,
            summary: {
                total: testResults.length,
                passed: testResults.filter(t => t.status === 'PASS').length,
                failed: testResults.filter(t => t.status === 'FAIL').length,
                skipped: testResults.filter(t => t.status === 'SKIP').length
            },
            testResults: testResults.map(test => ({
                name: test.name,
                suite: test.suite || 'Default',
                status: test.status,
                duration: test.duration,
                retryCount: test.retryCount || 0,
                owner: test.owner || 'Unknown',
                component: test.component || 'Unknown',
                error: test.error,
                stackTrace: test.stackTrace
            }))
        };

        history.unshift(run);
        history.splice(100); // Keep last 100 runs
        await fs.mkdir(path.dirname(this.historyFile), { recursive: true });
        await fs.writeFile(this.historyFile, JSON.stringify(history, null, 2));
        return history;
    }

    async loadHistory() {
        try {
            const data = await fs.readFile(this.historyFile, 'utf8');
            return JSON.parse(data);
        } catch {
            return [];
        }
    }

    calculateTrends(history = [], limit = 10) {
        // Default empty trends
        const emptyTrends = {
            passRate: [],
            duration: [],
            stability: [],
            failurePatterns: []
        };

        if (!Array.isArray(history) || history.length === 0) {
            return emptyTrends;
        }

        const recentRuns = history.slice(0, limit).filter(run => run && run.testResults);
        
        if (recentRuns.length === 0) {
            return emptyTrends;
        }

        return {
            passRate: recentRuns.map(run => ({
                date: run.timestamp || new Date().toISOString(),
                rate: run.summary && run.summary.total ? 
                    (run.summary.passed / run.summary.total) * 100 : 0
            })),
            duration: recentRuns.map(run => ({
                date: run.timestamp || new Date().toISOString(),
                mean: Array.isArray(run.testResults) && run.testResults.length ? 
                    run.testResults.reduce((acc, t) => acc + (t.duration || 0), 0) / run.testResults.length : 0,
                median: Array.isArray(run.testResults) && run.testResults.length ? 
                    this.calculateMedian(run.testResults.map(t => t.duration || 0)) : 0
            })),
            stability: this.calculateStability(recentRuns),
            failurePatterns: this.analyzeFailurePatterns(recentRuns)
        };
    }

    calculateStability(runs) {
        const testStability = new Map();
        
        runs.forEach(run => {
            if (run.testResults && Array.isArray(run.testResults)) {
                run.testResults.forEach(test => {
                    if (!testStability.has(test.name)) {
                        testStability.set(test.name, { passes: 0, total: 0 });
                    }
                    const stats = testStability.get(test.name);
                    stats.total++;
                    if (test.status === 'PASS') stats.passes++;
                });
            }
        });

        return Array.from(testStability.entries()).map(([name, stats]) => ({
            name,
            stability: (stats.passes / stats.total) * 100,
            isFlaky: stats.passes > 0 && stats.passes < stats.total
        }));
    }

    analyzeFailurePatterns(runs) {
        const patterns = new Map();
        
        runs.forEach(run => {
            if (run.testResults && Array.isArray(run.testResults)) {
                run.testResults.filter(t => t.status === 'FAIL').forEach(test => {
                    const key = test.error || 'Unknown error';
                    if (!patterns.has(key)) {
                        patterns.set(key, { count: 0, tests: new Set() });
                    }
                    const pattern = patterns.get(key);
                    pattern.count++;
                    pattern.tests.add(test.name);
                });
            }
        });

        return Array.from(patterns.entries()).map(([error, data]) => ({
            error,
            count: data.count,
            affectedTests: Array.from(data.tests)
        })).sort((a, b) => b.count - a.count);
    }

    calculateMedian(numbers) {
        const sorted = numbers.sort((a, b) => a - b);
        const middle = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0
            ? (sorted[middle - 1] + sorted[middle]) / 2
            : sorted[middle];
    }
}

module.exports = TestAnalytics;
