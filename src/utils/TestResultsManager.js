const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

/**
 * TestResultsManager - Manages organized test execution results
 * Creates timestamped test run directories with proper structure
 */
class TestResultsManager {
    constructor(baseResultsDir = 'test-results', visualTestingEnabled = true) {
        this.baseResultsDir = path.resolve(baseResultsDir);
        this.currentRunDir = null;
        this.currentRunId = null;
        this.visualTestingEnabled = visualTestingEnabled;
        this.visualBaselinesDir = path.resolve('visual-baselines'); // Persistent baselines
    }

    /**
     * Initialize a new test run with timestamped directory
     * @param {string} testSuiteName - Name of the test suite being run
     * @returns {Promise<Object>} - Paths object with all directory locations
     */
    async initializeTestRun(testSuiteName = 'TestRun') {
        try {
            // Create timestamp for this run
            this.currentRunId = new Date().toISOString().replace(/[:.]/g, '-');
            this.currentRunDir = path.join(this.baseResultsDir, `run-${this.currentRunId}`);

            // Create the main results directory if it doesn't exist
            await this.ensureDirectory(this.baseResultsDir);

            // Create basic directory structure
            const runPaths = {
                runDir: this.currentRunDir,
                allureReport: path.join(this.currentRunDir, 'allure-report'),
                allureResults: path.join(this.currentRunDir, 'allure-results'),
                htmlReport: path.join(this.currentRunDir, 'html-report.html'),
                screenshots: path.join(this.currentRunDir, 'screenshots'),
                metadata: path.join(this.currentRunDir, 'metadata.json')
            };

            // Add visual structure only if visual testing is enabled
            if (this.visualTestingEnabled) {
                const centralVisualDir = path.resolve('visual-testing');
                const runSpecificVisualDir = path.join(centralVisualDir, 'runs', this.currentRunId);
                
                runPaths.visual = {
                    // Per-run visual links and summaries (in test run folder)
                    base: path.join(this.currentRunDir, 'visual'),
                    links: path.join(this.currentRunDir, 'visual', 'links'),
                    report: path.join(this.currentRunDir, 'visual-report.html'),
                    summary: path.join(this.currentRunDir, 'visual-summary.json'),
                    
                    // Centralized visual storage (outside test runs)
                    central: {
                        base: centralVisualDir,
                        baselines: path.join(centralVisualDir, 'baselines'),
                        runs: path.join(centralVisualDir, 'runs'),
                        latest: path.join(centralVisualDir, 'latest'),
                        
                        // This run's centralized data
                        runDir: runSpecificVisualDir,
                        actual: path.join(runSpecificVisualDir, 'actual'),
                        diffs: path.join(runSpecificVisualDir, 'diffs'),
                        comparisons: path.join(runSpecificVisualDir, 'comparisons')
                    }
                };
                
                // Legacy compatibility (only when visual testing enabled)
                runPaths.baselines = path.join(centralVisualDir, 'baselines');
                runPaths.actualDir = path.join(runSpecificVisualDir, 'actual');
                diffDir: path.join(runSpecificVisualDir, 'diffs')
            };

            // Create basic directories
            const basicDirectories = [
                // Test run directories
                this.ensureDirectory(runPaths.runDir),
                this.ensureDirectory(runPaths.allureReport),
                this.ensureDirectory(runPaths.allureResults),
                this.ensureDirectory(runPaths.screenshots)
            ];

            // Create visual directories only if visual testing is enabled
            if (this.visualTestingEnabled) {
                const visualDirectories = [
                    this.ensureDirectory(runPaths.visual.base),
                    this.ensureDirectory(runPaths.visual.links),
                    
                    // Centralized visual directories
                    this.ensureDirectory(runPaths.visual.central.base),
                    this.ensureDirectory(runPaths.visual.central.baselines),
                    this.ensureDirectory(runPaths.visual.central.runs),
                    this.ensureDirectory(runPaths.visual.central.latest),
                    
                    // This run's centralized visual data
                    this.ensureDirectory(runPaths.visual.central.runDir),
                    this.ensureDirectory(runPaths.visual.central.actual),
                    this.ensureDirectory(runPaths.visual.central.diffs),
                    this.ensureDirectory(runPaths.visual.central.comparisons)
                ];
                
                await Promise.all([...basicDirectories, ...visualDirectories]);
                
                // Create links in the test run folder to centralized visual data
                await this.createVisualLinks(runPaths);
            } else {
                // Only create basic directories when visual testing is disabled
                await Promise.all(basicDirectories);
            }

            // Create metadata for this run
            const metadata = {
                runId: this.currentRunId,
                testSuiteName,
                startTime: new Date().toISOString(),
                version: this.getPackageVersion(),
                environment: {
                    node: process.version,
                    platform: process.platform,
                    arch: process.arch
                },
                paths: runPaths
            };

            await fs.writeFile(runPaths.metadata, JSON.stringify(metadata, null, 2));

            // Update latest symlink (Windows compatible)
            await this.updateLatestLink();

            console.log(`📁 Test run initialized: ${this.currentRunId}`);
            console.log(`📂 Results directory: ${this.currentRunDir}`);

            return runPaths;

        } catch (error) {
            console.error('❌ Failed to initialize test run:', error.message);
            throw error;
        }
    }

    /**
     * Create visual links that connect test run folder to centralized visual data
     * @param {Object} runPaths - The run paths object
     */
    async createVisualLinks(runPaths) {
        try {
            const linksDir = runPaths.visual.links;
            
            // Create link directories
            await this.ensureDirectory(path.join(linksDir, 'baselines'));
            await this.ensureDirectory(path.join(linksDir, 'actual'));
            await this.ensureDirectory(path.join(linksDir, 'diffs'));
            await this.ensureDirectory(path.join(linksDir, 'comparisons'));
            
            // Create reference files that point to centralized locations
            const linkReferences = {
                baselines: runPaths.visual.central.baselines,
                actual: runPaths.visual.central.actual,
                diffs: runPaths.visual.central.diffs,
                comparisons: runPaths.visual.central.comparisons
            };
            
            // Write reference files (Windows-compatible approach)
            await fs.writeFile(
                path.join(linksDir, 'visual-paths.json'), 
                JSON.stringify(linkReferences, null, 2)
            );
            
            console.log('🔗 Visual links created for hybrid structure');
            
        } catch (error) {
            console.warn('⚠️  Could not create visual links:', error.message);
        }
    }

    /**
     * Get paths for current test run
     * @returns {Object|null} - Current run paths or null if not initialized
     */
    getCurrentRunPaths() {
        if (!this.currentRunDir) {
            return null;
        }

        const runPaths = {
            runDir: this.currentRunDir,
            allureReport: path.join(this.currentRunDir, 'allure-report'),
            allureResults: path.join(this.currentRunDir, 'allure-results'),
            htmlReport: path.join(this.currentRunDir, 'html-report.html'),
            screenshots: path.join(this.currentRunDir, 'screenshots'),
            metadata: path.join(this.currentRunDir, 'metadata.json')
        };

        // Add visual structure only if visual testing is enabled
        if (this.visualTestingEnabled) {
            const centralVisualDir = path.resolve('visual-testing');
            const runSpecificVisualDir = path.join(centralVisualDir, 'runs', this.currentRunId);
            
            runPaths.visual = {
                // Per-run visual links and summaries
                base: path.join(this.currentRunDir, 'visual'),
                links: path.join(this.currentRunDir, 'visual', 'links'),
                report: path.join(this.currentRunDir, 'visual-report.html'),
                summary: path.join(this.currentRunDir, 'visual-summary.json'),
                
                // Centralized visual storage
                central: {
                    base: centralVisualDir,
                    baselines: path.join(centralVisualDir, 'baselines'),
                    runs: path.join(centralVisualDir, 'runs'),
                    latest: path.join(centralVisualDir, 'latest'),
                    
                    // This run's centralized data
                    runDir: runSpecificVisualDir,
                    actual: path.join(runSpecificVisualDir, 'actual'),
                    diffs: path.join(runSpecificVisualDir, 'diffs'),
                    comparisons: path.join(runSpecificVisualDir, 'comparisons')
                }
            };
            
            // Legacy compatibility (only when visual testing enabled)
            runPaths.baselines = path.join(centralVisualDir, 'baselines');
            runPaths.actualDir = path.join(runSpecificVisualDir, 'actual');
            runPaths.diffDir = path.join(runSpecificVisualDir, 'diffs');
        }

        return runPaths;
    }

    /**
     * Finalize the test run with completion metadata
     * @param {Object} summary - Test execution summary
     */
    async finalizeTestRun(summary = {}) {
        if (!this.currentRunDir) {
            console.warn('⚠️  No active test run to finalize');
            return;
        }

        try {
            const metadataPath = path.join(this.currentRunDir, 'metadata.json');
            let metadata = {};
            
            if (fsSync.existsSync(metadataPath)) {
                const content = await fs.readFile(metadataPath, 'utf8');
                metadata = JSON.parse(content);
            }

            // Add completion metadata
            metadata.endTime = new Date().toISOString();
            metadata.duration = metadata.startTime ? 
                new Date(metadata.endTime) - new Date(metadata.startTime) : 0;
            metadata.summary = summary;

            await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

            console.log(`✅ Test run finalized: ${this.currentRunId}`);
            console.log(`📊 Duration: ${Math.round(metadata.duration / 1000)}s`);

        } catch (error) {
            console.error('❌ Failed to finalize test run:', error.message);
        }
    }

    /**
     * List previous test runs
     * @param {number} limit - Maximum number of runs to return
     * @returns {Promise<Array>} - Array of run information
     */
    async listPreviousRuns(limit = 10) {
        try {
            if (!fsSync.existsSync(this.baseResultsDir)) {
                return [];
            }

            const entries = await fs.readdir(this.baseResultsDir);
            const runDirs = entries
                .filter(entry => entry.startsWith('run-'))
                .sort()
                .reverse()
                .slice(0, limit);

            const runs = [];
            for (const runDir of runDirs) {
                const metadataPath = path.join(this.baseResultsDir, runDir, 'metadata.json');
                if (fsSync.existsSync(metadataPath)) {
                    try {
                        const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
                        runs.push({
                            id: runDir.replace('run-', ''),
                            path: path.join(this.baseResultsDir, runDir),
                            ...metadata
                        });
                    } catch (parseError) {
                        console.warn(`⚠️  Could not parse metadata for ${runDir}`);
                    }
                }
            }

            return runs;
        } catch (error) {
            console.error('❌ Failed to list previous runs:', error.message);
            return [];
        }
    }

    /**
     * Clean up old test runs (keep only the last N runs)
     * @param {number} keepCount - Number of recent runs to keep
     */
    async cleanupOldRuns(keepCount = 20) {
        try {
            const runs = await this.listPreviousRuns(1000); // Get all runs
            
            if (runs.length <= keepCount) {
                console.log(`🧹 No cleanup needed. ${runs.length} runs (keeping ${keepCount})`);
                return;
            }

            const runsToDelete = runs.slice(keepCount);
            console.log(`🧹 Cleaning up ${runsToDelete.length} old test runs...`);

            for (const run of runsToDelete) {
                await this.deleteDirectory(run.path);
                console.log(`🗑️  Deleted: ${run.id}`);
            }

        } catch (error) {
            console.error('❌ Failed to cleanup old runs:', error.message);
        }
    }

    /**
     * Ensure directory exists
     * @param {string} dirPath - Directory path to create
     */
    async ensureDirectory(dirPath) {
        try {
            await fs.mkdir(dirPath, { recursive: true });
        } catch (error) {
            if (error.code !== 'EEXIST') {
                throw error;
            }
        }
    }

    /**
     * Delete directory recursively
     * @param {string} dirPath - Directory path to delete
     */
    async deleteDirectory(dirPath) {
        try {
            await fs.rm(dirPath, { recursive: true, force: true });
        } catch (error) {
            console.warn(`⚠️  Could not delete ${dirPath}: ${error.message}`);
        }
    }

    /**
     * Update latest symlink to point to current run
     */
    async updateLatestLink() {
        const latestLink = path.join(this.baseResultsDir, 'latest');
        
        try {
            // Remove existing latest link if it exists
            if (fsSync.existsSync(latestLink)) {
                await fs.unlink(latestLink).catch(() => {}); // Ignore errors
            }

            // On Windows, create a directory link instead of symlink for compatibility
            if (process.platform === 'win32') {
                // Create a simple text file with the path instead
                const latestFile = path.join(this.baseResultsDir, 'latest.txt');
                await fs.writeFile(latestFile, this.currentRunDir);
            } else {
                // Create symlink on Unix systems
                await fs.symlink(path.basename(this.currentRunDir), latestLink);
            }
        } catch (error) {
            console.warn('⚠️  Could not update latest link:', error.message);
        }
    }

    /**
     * Get package version
     * @returns {string} - Package version or 'unknown'
     */
    getPackageVersion() {
        try {
            const packagePath = path.join(process.cwd(), 'package.json');
            if (fsSync.existsSync(packagePath)) {
                const packageJson = JSON.parse(fsSync.readFileSync(packagePath, 'utf8'));
                return packageJson.version || 'unknown';
            }
        } catch (error) {
            console.warn('⚠️  Could not read package version');
        }
        return 'unknown';
    }
}

module.exports = TestResultsManager;