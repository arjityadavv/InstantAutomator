const fs = require('fs').promises;
const path = require('path');

class HistoryTracker {
    constructor(reportPath) {
        this.historyFile = path.join(reportPath, 'test_history.json');
        this.maxHistory = 100; // Keep last 100 test runs
    }

    async loadHistory() {
        try {
            const data = await fs.readFile(this.historyFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return [];
        }
    }

    async saveHistory(testResults) {
        const history = await this.loadHistory();
        const entry = {
            timestamp: new Date().toISOString(),
            summary: {
                total: testResults.length,
                passed: testResults.filter(t => t.status === 'PASS').length,
                failed: testResults.filter(t => t.status === 'FAIL').length,
                skipped: testResults.filter(t => t.status === 'SKIP').length,
            },
            testCases: testResults.map(test => ({
                name: test.name,
                status: test.status,
                duration: test.duration,
                failureReason: test.failureReason
            }))
        };

        history.unshift(entry);
        // Keep only the last maxHistory entries
        history.splice(this.maxHistory);

        await fs.mkdir(path.dirname(this.historyFile), { recursive: true });
        await fs.writeFile(this.historyFile, JSON.stringify(history, null, 2));
        return history;
    }

    calculateTrends(history) {
        if (!history.length) return null;

        const last10Runs = history.slice(0, 10);
        const passRate = last10Runs.map(run => 
            (run.summary.passed / run.summary.total) * 100
        );

        const commonTests = new Map();
        last10Runs.forEach(run => {
            run.testCases.forEach(test => {
                if (!commonTests.has(test.name)) {
                    commonTests.set(test.name, {
                        passes: 0,
                        total: 0,
                        avgDuration: 0,
                        durations: []
                    });
                }
                const stats = commonTests.get(test.name);
                stats.total++;
                if (test.status === 'PASS') stats.passes++;
                if (test.duration) stats.durations.push(test.duration);
            });
        });

        // Calculate averages and identify flaky tests
        const testStats = Array.from(commonTests.entries()).map(([name, stats]) => ({
            name,
            reliability: (stats.passes / stats.total) * 100,
            avgDuration: stats.durations.reduce((a, b) => a + b, 0) / stats.durations.length,
            isFlaky: stats.passes > 0 && stats.passes < stats.total
        }));

        return {
            passRate,
            testStats,
            overallTrend: passRate[0] > passRate[passRate.length - 1] ? 'improving' : 'declining'
        };
    }
}

module.exports = HistoryTracker;
