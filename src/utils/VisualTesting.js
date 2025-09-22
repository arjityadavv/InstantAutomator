const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');

class VisualTesting {
    constructor(config) {
        this.config = config;
        this.threshold = config?.visual_threshold || 0.2;
        
        // Support hybrid, structured, and legacy paths
        if (config?.runPaths?.visual?.central) {
            // Hybrid approach - use centralized visual storage
            this.baselineDir = config.runPaths.visual.central.baselines;
            this.actualDir = config.runPaths.visual.central.actual;
            this.diffDir = config.runPaths.visual.central.diffs;
            this.comparisonsDir = config.runPaths.visual.central.comparisons;
            this.visualLinksDir = config.runPaths.visual.links;
            this.visualSummaryPath = config.runPaths.visual.summary;
            this.isHybrid = true;
            this.runId = config.runPaths?.visual?.central?.runDir ? 
                path.basename(config.runPaths.visual.central.runDir) : 'unknown';
        } else if (config?.runPaths?.visual) {
            // Structured approach (old) - use organized paths
            this.baselineDir = config.runPaths.baselines;
            this.actualDir = config.runPaths.visual.actual;
            this.diffDir = config.runPaths.visual.diffs;
            this.comparisonsDir = config.runPaths.visual.comparisons;
            this.isStructured = true;
        } else {
            // Legacy approach - use base directory
            const baseDir = config?.visual_testing_path || process.cwd();
            this.baselineDir = path.resolve(baseDir, 'visual-baselines');
            this.actualDir = path.resolve(baseDir, 'visual-actual');
            this.diffDir = path.resolve(baseDir, 'visual-diffs');
            this.isLegacy = true;
        }
        
        // Debug logging for troubleshooting
        const modeText = this.isHybrid ? ' (Hybrid)' : 
                        this.isStructured ? ' (Structured)' : ' (Legacy)';
        console.log(`🔍 Visual Testing Configuration${modeText}:`);
        console.log(`   📁 Baselines: ${this.baselineDir}`);
        console.log(`   📸 Actual: ${this.actualDir}`);
        console.log(`   🔍 Diffs: ${this.diffDir}`);
        if (this.comparisonsDir) {
            console.log(`   📊 Comparisons: ${this.comparisonsDir}`);
        }
        if (this.isHybrid) {
            console.log(`   🔗 Links: ${this.visualLinksDir}`);
            console.log(`   📋 Run ID: ${this.runId}`);
        }
        
        this.initialized = false;
    }

    /**
     * Update configuration with new paths (for hybrid mode setup)
     * @param {Object} config - Updated configuration with runPaths
     */
    updateConfig(config) {
        // Reconfigure paths based on updated config
        if (config?.run_paths?.visual?.central) {
            // Hybrid approach - use centralized visual storage
            this.baselineDir = config.run_paths.visual.central.baselines;
            this.actualDir = config.run_paths.visual.central.actual;
            this.diffDir = config.run_paths.visual.central.diffs;
            this.comparisonsDir = config.run_paths.visual.central.comparisons;
            this.visualLinksDir = config.run_paths.visual.links;
            this.visualSummaryPath = config.run_paths.visual.summary;
            this.isHybrid = true;
            this.isStructured = false;
            this.runId = config.run_paths?.visual?.central?.runDir ? 
                path.basename(config.run_paths.visual.central.runDir) : 'unknown';
                
            // Reset initialization flag to reconfigure with new paths
            this.initialized = false;
            
            // Re-log configuration to show hybrid mode
            const modeText = this.isHybrid ? ' (Hybrid)' : 
                            this.isStructured ? ' (Structured)' : ' (Legacy)';
            console.log(`🔄 Visual Testing Configuration${modeText}:`);
            console.log(`   📁 Baselines: ${this.baselineDir}`);
            console.log(`   📸 Actual: ${this.actualDir}`);
            console.log(`   🔍 Diffs: ${this.diffDir}`);
            if (this.comparisonsDir) {
                console.log(`   📊 Comparisons: ${this.comparisonsDir}`);
            }
            if (this.isHybrid) {
                console.log(`   🔗 Links: ${this.visualLinksDir}`);
                console.log(`   📋 Run ID: ${this.runId}`);
            }
        }
    }

    /**
     * Initialize visual testing directories with comprehensive error handling
     */
    async initialize() {
        if (this.initialized) {
            return true;
        }
        
        try {
            console.log('📁 Creating visual testing directories...');
            
            // Create directories with detailed logging
            await this.createDirectoryWithLogging(this.baselineDir, 'Baselines');
            await this.createDirectoryWithLogging(this.actualDir, 'Current results');
            await this.createDirectoryWithLogging(this.diffDir, 'Visual diffs');
            
            // Create comparisons directory if using structured approach
            if (this.comparisonsDir) {
                await this.createDirectoryWithLogging(this.comparisonsDir, 'Comparisons');
            }
            
            // Clean previous run results to keep only latest
            await this.cleanPreviousResults();
            
            // Verify directories were created and are writable
            await this.verifyDirectories();
            
            this.initialized = true;
            console.log('✅ Visual testing directories initialized successfully');
            return true;
            
        } catch (error) {
            console.error('❌ Failed to create visual testing directories:', error.message);
            console.error('💡 Please check permissions for the current directory:', process.cwd());
            
            // Try alternative directory in user's home
            try {
                const homeDir = require('os').homedir();
                const fallbackDir = path.join(homeDir, '.snap-visual-testing');
                
                console.log(`🔄 Trying fallback directory: ${fallbackDir}`);
                
                this.baselineDir = path.join(fallbackDir, 'visual-baselines');
                this.actualDir = path.join(fallbackDir, 'visual-actual');
                this.diffDir = path.join(fallbackDir, 'visual-diffs');
                
                await this.createDirectoryWithLogging(this.baselineDir, 'Baselines (fallback)');
                await this.createDirectoryWithLogging(this.actualDir, 'Actual screenshots (fallback)');
                await this.createDirectoryWithLogging(this.diffDir, 'Visual diffs (fallback)');
                
                this.initialized = true;
                console.log('✅ Visual testing directories initialized in fallback location');
                return true;
                
            } catch (fallbackError) {
                console.error('❌ Fallback directory creation also failed:', fallbackError.message);
                return false;
            }
        }
    }

    /**
     * Clean previous run results to keep only latest
     */
    async cleanPreviousResults() {
        try {
            // Clear current results directory
            if (fsSync.existsSync(this.actualDir)) {
                const files = await fs.readdir(this.actualDir);
                for (const file of files) {
                    await fs.unlink(path.join(this.actualDir, file));
                }
                console.log('🧹 Cleaned previous current results');
            }
            
            // Clear diffs directory
            if (fsSync.existsSync(this.diffDir)) {
                const files = await fs.readdir(this.diffDir);
                for (const file of files) {
                    await fs.unlink(path.join(this.diffDir, file));
                }
                console.log('🧹 Cleaned previous visual diffs');
            }
        } catch (error) {
            console.warn('⚠️  Could not clean previous results:', error.message);
            // Don't fail initialization if cleanup fails
        }
    }

    /**
     * Create directory with detailed logging
     */
    async createDirectoryWithLogging(dirPath, description) {
        try {
            await fs.mkdir(dirPath, { recursive: true });
            console.log(`   ✓ ${description}: ${dirPath}`);
            
            // Test write permissions
            const testFile = path.join(dirPath, '.write-test');
            await fs.writeFile(testFile, 'test');
            await fs.unlink(testFile);
            
        } catch (error) {
            if (error.code === 'EACCES') {
                throw new Error(`Permission denied creating ${description} directory: ${dirPath}`);
            } else if (error.code === 'ENOTDIR') {
                throw new Error(`Path exists but is not a directory: ${dirPath}`);
            } else {
                throw new Error(`Failed to create ${description} directory: ${error.message}`);
            }
        }
    }

    /**
     * Verify all directories exist and are accessible
     */
    async verifyDirectories() {
        const directories = [
            { path: this.baselineDir, name: 'Baselines' },
            { path: this.actualDir, name: 'Actual' },
            { path: this.diffDir, name: 'Diffs' }
        ];

        for (const dir of directories) {
            try {
                const stats = await fs.stat(dir.path);
                if (!stats.isDirectory()) {
                    throw new Error(`${dir.name} path exists but is not a directory: ${dir.path}`);
                }
            } catch (error) {
                if (error.code === 'ENOENT') {
                    throw new Error(`${dir.name} directory was not created: ${dir.path}`);
                }
                throw error;
            }
        }
    }

    /**
     * Generate a unique name for the visual test based on comprehensive context
     * @param {string} testName - Name of the test
     * @param {string} actionName - Name of the action
     * @param {Object} actionConfig - Complete action configuration for context
     * @param {number} actionIndex - Index of action within the test (0-based)
     * @returns {string} - Unique baseline name
     */
    generateBaselineName(testName, actionName, actionConfig = {}, actionIndex = 0) {
        const sanitize = (str) => str.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        
        // Base name with test and action
        let name = `${sanitize(testName)}_${sanitize(actionName)}`;
        
        // Add action index to handle multiple instances of same action
        name += `_${actionIndex}`;
        
        // Add context-specific identifiers based on action type
        const contextParts = [];
        
        // For navigation actions - include URL hash
        if (actionConfig.url) {
            const urlHash = this.generateUrlHash(actionConfig.url);
            contextParts.push(`url_${urlHash}`);
        }
        
        // For element interactions - include element identifier
        if (actionConfig.element) {
            contextParts.push(`el_${sanitize(actionConfig.element)}`);
        }
        
        if (actionConfig.object_name) {
            contextParts.push(`obj_${sanitize(actionConfig.object_name)}`);
        }
        
        // For verification actions - include expected values
        if (actionConfig.expected_text) {
            const textHash = this.generateTextHash(actionConfig.expected_text);
            contextParts.push(`txt_${textHash}`);
        }
        
        if (actionConfig.expected_title) {
            const titleHash = this.generateTextHash(actionConfig.expected_title);
            contextParts.push(`title_${titleHash}`);
        }
        
        // Add context parts to name
        if (contextParts.length > 0) {
            name += `_${contextParts.join('_')}`;
        }
        
        // Ensure name length is reasonable (max 100 chars)
        if (name.length > 100) {
            const hash = this.generateHash(name);
            name = `${sanitize(testName)}_${sanitize(actionName)}_${actionIndex}_${hash}`;
        }
        
        return name;
    }

    /**
     * Generate a short hash for URL to make it unique but concise
     * @param {string} url - URL to hash
     * @returns {string} - Short hash
     */
    generateUrlHash(url) {
        // Simple hash function for URLs
        let hash = 0;
        for (let i = 0; i < url.length; i++) {
            const char = url.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(16).substring(0, 6);
    }

    /**
     * Generate a short hash for text content
     * @param {string} text - Text to hash
     * @returns {string} - Short hash
     */
    generateTextHash(text) {
        return this.generateUrlHash(text);
    }

    /**
     * Generate a hash for long strings
     * @param {string} input - Input string to hash
     * @returns {string} - Short hash
     */
    generateHash(input) {
        return this.generateUrlHash(input);
    }

    /**
     * Perform visual check for an action
     * @param {Object} page - Playwright page object
     * @param {string} testName - Name of the test
     * @param {string} actionName - Name of the action
     * @param {Object} actionConfig - Complete action configuration
     * @param {number} actionIndex - Index of action within the test
     * @returns {Object} - Result of visual check
     */
    async performVisualCheck(page, testName, actionName, actionConfig = {}, actionIndex = 0) {
        try {
            // Ensure directories exist before taking screenshots
            const initSuccess = await this.initialize();
            if (!initSuccess) {
                return {
                    status: 'error',
                    message: 'Visual testing failed: Could not initialize directories. Check permissions and try again.',
                    error: 'Directory initialization failed'
                };
            }
            
            const baselineName = this.generateBaselineName(testName, actionName, actionConfig, actionIndex);
            
            // Generate screenshot filename (no timestamp - keep latest only)
            const screenshotName = `${baselineName}.png`;
            const screenshotPath = path.join(this.actualDir, screenshotName);
            
            // Take screenshot
            await page.screenshot({ 
                path: screenshotPath, 
                fullPage: true,
                timeout: 10000 
            });
            
            console.log(`📸 Current screenshot taken: ${screenshotName}`);
            
            // Check if baseline exists
            const baselinePath = path.join(this.baselineDir, `${baselineName}.png`);
            
            if (!fsSync.existsSync(baselinePath)) {
                // Auto-generate baseline on first run
                fsSync.copyFileSync(screenshotPath, baselinePath);
                console.log(`✨ Auto-created baseline: ${baselineName}.png`);
                
                return {
                    status: 'baseline_created',
                    message: `New visual baseline auto-created: ${baselineName}.png`,
                    baselinePath: baselinePath,
                    actualPath: screenshotPath,
                    baselineName: baselineName,
                    visualFailure: false
                };
            } else {
                // Verify against existing baseline
                console.log(`🔍 Comparing with baseline: ${baselineName}.png`);
                const comparisonResult = await this.compareImages(baselinePath, screenshotPath);
                
                if (comparisonResult.status === 'PASS') {
                    console.log(`✅ Visual verification passed: ${baselineName}`);
                    
                    const result = {
                        status: 'passed',
                        message: `Visual verification passed for ${baselineName}`,
                        baselinePath: baselinePath,
                        actualPath: screenshotPath,
                        comparison: comparisonResult,
                        baselineName: baselineName,
                        visualFailure: false
                    };
                    
                    // Update hybrid summary if enabled
                    if (this.isHybrid) {
                        await this.updateVisualSummary(baselineName, result);
                        await this.createVisualTestLinks(baselineName, {
                            baseline: baselinePath,
                            actual: screenshotPath,
                            diff: null,
                            comparison: null
                        });
                    }
                    
                    return result;
                } else {
                    console.log(`❌ Visual verification failed: ${baselineName}`);
                    
                    // Generate diff image (no timestamp - keep latest only)
                    const diffPath = path.join(this.diffDir, `${baselineName}_diff.png`);
                    
                    // Create multiple diff images for better visualization
                    let comparisonPath = null;
                    try {
                        await this.generateDiffImages(baselinePath, screenshotPath, diffPath, comparisonResult);
                        comparisonPath = this.comparisonsDir ? 
                            path.join(this.comparisonsDir, `${baselineName}_comparison.png`) : null;
                        console.log(`🔍 Diff images generated: ${baselineName}_diff.png (${comparisonResult.diffPercentage} pixels differ)`);
                    } catch (diffError) {
                        console.warn('⚠️  Could not generate diff images:', diffError.message);
                    }
                    
                    const result = {
                        status: 'failed',
                        message: `Visual verification failed for ${baselineName}: ${comparisonResult.message}`,
                        baselinePath: baselinePath,
                        actualPath: screenshotPath,
                        diffPath: diffPath,
                        comparisonPath: comparisonPath,
                        comparison: comparisonResult,
                        baselineName: baselineName,
                        visualFailure: true
                    };
                    
                    // Update hybrid summary if enabled
                    if (this.isHybrid) {
                        await this.updateVisualSummary(baselineName, result);
                        await this.createVisualTestLinks(baselineName, {
                            baseline: baselinePath,
                            actual: screenshotPath,
                            diff: diffPath,
                            comparison: comparisonPath
                        });
                    }
                    
                    return result;
                }
            }
            
        } catch (error) {
            console.error('❌ Visual testing error:', error.message);
            return {
                status: 'error',
                message: `Visual testing failed: ${error.message}`,
                error: error
            };
        }
    }

    /**
     * Compare two images and return result using proper pixel-level comparison
     * @param {string} baselinePath - Path to baseline image
     * @param {string} actualPath - Path to actual image
     * @returns {Object} - Comparison result
     */
    async compareImages(baselinePath, actualPath) {
        console.log(`🔍 Starting image comparison: baseline vs actual`);
        
        try {
            // First check file sizes as a quick filter
            const baselineStats = await fs.stat(baselinePath);
            const actualStats = await fs.stat(actualPath);
            
            const sizeDifference = Math.abs(baselineStats.size - actualStats.size) / baselineStats.size;
            console.log(`📊 File size difference: ${(sizeDifference * 100).toFixed(2)}%`);
            
            // If file sizes differ significantly, it's definitely different
            if (sizeDifference > 0.1) { // 10% size difference threshold
                console.log(`❌ Significant size difference detected: ${(sizeDifference * 100).toFixed(2)}%`);
                
                // Generate a simple diff image by copying the actual image
                const diffPath = path.join(this.diffDir, `${path.basename(actualPath, '.png')}_diff.png`);
                try {
                    fsSync.copyFileSync(actualPath, diffPath);
                    console.log(`🔍 Diff image created (copy of actual): ${path.basename(diffPath)}`);
                } catch (copyError) {
                    console.warn('⚠️  Could not create diff image:', copyError.message);
                }
                
                return {
                    status: 'FAIL',
                    message: `Visual difference detected - ${(sizeDifference * 100).toFixed(2)}% size difference`,
                    match: false,
                    sizeDifference: (sizeDifference * 100).toFixed(2) + '%',
                    diffGenerated: true
                };
            }
            
            // Try pixel-level comparison for similar-sized images
            try {
                const { PNG } = require('pngjs');
                const pixelmatch = await import('pixelmatch');
                
                // Read both images
                const baselineBuffer = fsSync.readFileSync(baselinePath);
                const actualBuffer = fsSync.readFileSync(actualPath);
                
                // Parse PNG images
                const baselineImg = PNG.sync.read(baselineBuffer);
                const actualImg = PNG.sync.read(actualBuffer);
                
                // Check if dimensions match
                if (baselineImg.width !== actualImg.width || baselineImg.height !== actualImg.height) {
                    console.log(`❌ Dimension mismatch detected`);
                    
                    // Create diff image for dimension mismatch
                    const diffPath = path.join(this.diffDir, `${path.basename(actualPath, '.png')}_diff.png`);
                    try {
                        fsSync.copyFileSync(actualPath, diffPath);
                        console.log(`🔍 Diff image created for dimension mismatch: ${path.basename(diffPath)}`);
                    } catch (copyError) {
                        console.warn('⚠️  Could not create diff image:', copyError.message);
                    }
                    
                    return {
                        status: 'FAIL',
                        message: `Image dimensions differ - Baseline: ${baselineImg.width}x${baselineImg.height}, Actual: ${actualImg.width}x${actualImg.height}`,
                        match: false,
                        dimensionMismatch: true,
                        diffGenerated: true
                    };
                }
                
                // Perform pixel-level comparison
                const { width, height } = baselineImg;
                const diff = new PNG({ width, height });
                
                const numDiffPixels = pixelmatch.default(
                    baselineImg.data, 
                    actualImg.data, 
                    diff.data, 
                    width, 
                    height, 
                    { 
                        threshold: 0.1,
                        includeAA: false,
                        alpha: 0.1
                    }
                );
                
                const totalPixels = width * height;
                const diffPercentage = (numDiffPixels / totalPixels) * 100;
                
                // Consider images similar if less than 1% different pixels
                const passThreshold = 1.0;
                console.log(`🔬 Pixel comparison: ${diffPercentage.toFixed(2)}% pixels differ (threshold: ${passThreshold}%)`);
                
                if (diffPercentage < passThreshold) {
                    return {
                        status: 'PASS',
                        message: `Visual check passed - ${diffPercentage.toFixed(2)}% pixels differ (threshold: ${passThreshold}%)`,
                        match: true,
                        diffPixels: numDiffPixels,
                        diffPercentage: diffPercentage.toFixed(2) + '%',
                        totalPixels: totalPixels
                    };
                } else {
                    // Save diff image for failed comparison
                    const diffPath = path.join(this.diffDir, `${path.basename(actualPath, '.png')}_diff.png`);
                    try {
                        const diffBuffer = PNG.sync.write(diff);
                        fsSync.writeFileSync(diffPath, diffBuffer);
                        console.log(`🔍 Diff image created: ${path.basename(diffPath)}`);
                    } catch (saveError) {
                        console.warn('⚠️  Could not save diff image:', saveError.message);
                    }
                    
                    return {
                        status: 'FAIL',
                        message: `Visual difference detected - ${diffPercentage.toFixed(2)}% pixels differ (threshold: ${passThreshold}%)`,
                        match: false,
                        diffPixels: numDiffPixels,
                        diffPercentage: diffPercentage.toFixed(2) + '%',
                        totalPixels: totalPixels,
                        diffGenerated: true
                    };
                }
                
            } catch (pixelError) {
                // Fallback to simple comparison if pixel comparison fails
                console.warn('⚠️  Pixel comparison failed, using fallback:', pixelError.message);
                
                if (sizeDifference < this.threshold) {
                    return {
                        status: 'PASS',
                        message: `Visual check passed (size fallback) - ${(sizeDifference * 100).toFixed(2)}% size difference`,
                        match: true,
                        sizeDifference: (sizeDifference * 100).toFixed(2) + '%',
                        fallback: true
                    };
                } else {
                    // Create diff image for fallback failure
                    const diffPath = path.join(this.diffDir, `${path.basename(actualPath, '.png')}_diff.png`);
                    try {
                        fsSync.copyFileSync(actualPath, diffPath);
                        console.log(`🔍 Diff image created (fallback): ${path.basename(diffPath)}`);
                    } catch (copyError) {
                        console.warn('⚠️  Could not create diff image:', copyError.message);
                    }
                    
                    return {
                        status: 'FAIL',
                        message: `Visual difference detected (size fallback) - ${(sizeDifference * 100).toFixed(2)}% size difference`,
                        match: false,
                        sizeDifference: (sizeDifference * 100).toFixed(2) + '%',
                        fallback: true,
                        diffGenerated: true
                    };
                }
            }
            
        } catch (error) {
            console.error('❌ Image comparison error:', error.message);
            return {
                status: 'ERROR',
                message: `Image comparison failed: ${error.message}`,
                match: false,
                error: error.message
            };
        }
    }

    /**
     * Get paths for visual testing files
     * @param {string} baselineName - Name of the baseline
     * @returns {Object} - File paths for baseline, actual, and diff images
     */
    getVisualPaths(baselineName) {
        return {
            baseline: path.join(this.baselineDir, `${baselineName}.png`),
            actual: path.join(this.actualDir, `${baselineName}-actual.png`),
            diff: path.join(this.diffDir, `${baselineName}-diff.png`)
        };
    }

    /**
     * Check if baseline exists for a given test
     * @param {string} baselineName - Name of the baseline
     * @returns {boolean} - True if baseline exists
     */
    async hasBaseline(baselineName) {
        try {
            const baselinePath = path.join(this.baselineDir, `${baselineName}.png`);
            await fs.access(baselinePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Generate visual diff images showing highlighted differences
     * @param {string} baselinePath - Path to baseline image
     * @param {string} actualPath - Path to actual image
     * @param {string} diffPath - Path where diff image will be saved
     * @param {Object} diffData - Pixelmatch comparison result
     * @returns {Promise<boolean>} - True if diff images were created successfully
     */
    async generateDiffImages(baselinePath, actualPath, diffPath, diffData) {
        try {
            console.log('🎨 Generating visual diff images...');
            
            // Try to use pixelmatch for proper diff visualization
            try {
                // Dynamic import for ES module compatibility
                const { default: pixelmatch } = await import('pixelmatch');
                const PNG = require('pngjs').PNG;
                
                // Read baseline image
                const baselineBuffer = fsSync.readFileSync(baselinePath);
                const baselineImg = PNG.sync.read(baselineBuffer);
                
                // Read actual image
                const actualBuffer = fsSync.readFileSync(actualPath);
                const actualImg = PNG.sync.read(actualBuffer);
                
                // Ensure images have same dimensions
                const width = Math.max(baselineImg.width, actualImg.width);
                const height = Math.max(baselineImg.height, actualImg.height);
                
                // Create properly sized images if needed
                let resizedBaseline = baselineImg;
                let resizedActual = actualImg;
                
                if (baselineImg.width !== width || baselineImg.height !== height) {
                    resizedBaseline = new PNG({ width, height });
                    PNG.bitblt(baselineImg, resizedBaseline, 0, 0, baselineImg.width, baselineImg.height, 0, 0);
                }
                
                if (actualImg.width !== width || actualImg.height !== height) {
                    resizedActual = new PNG({ width, height });
                    PNG.bitblt(actualImg, resizedActual, 0, 0, actualImg.width, actualImg.height, 0, 0);
                }
                
                // Create diff image
                const diffImg = new PNG({ width, height });
                
                // Compare images and generate diff
                const numDiffPixels = pixelmatch(
                    resizedBaseline.data,
                    resizedActual.data,
                    diffImg.data,
                    width,
                    height,
                    {
                        threshold: 0.1,
                        diffColor: [255, 0, 100], // Pink/magenta for differences
                        diffColorAlt: [255, 100, 0], // Orange for alternate differences
                        aaColor: [255, 255, 0], // Yellow for anti-aliasing
                        alpha: 0.8,
                        includeAA: true
                    }
                );
                
                // Save the diff image
                const diffBuffer = PNG.sync.write(diffImg);
                fsSync.writeFileSync(diffPath, diffBuffer);
                
                // Create side-by-side comparison image
                const sideByBydePath = this.comparisonsDir ? 
                    path.join(this.comparisonsDir, `${path.basename(diffPath, '_diff.png')}_comparison.png`) :
                    diffPath.replace('_diff.png', '_sidebyside.png');
                    
                const sideByImg = new PNG({ width: width * 2, height });
                
                // Copy baseline to left side
                PNG.bitblt(resizedBaseline, sideByImg, 0, 0, width, height, 0, 0);
                // Copy actual to right side
                PNG.bitblt(resizedActual, sideByImg, 0, 0, width, height, width, 0);
                
                const sideByBuffer = PNG.sync.write(sideByImg);
                fsSync.writeFileSync(sideByBydePath, sideByBuffer);
                
                console.log(`✅ Generated diff visualization: ${path.basename(diffPath)}`);
                console.log(`✅ Generated side-by-side comparison: ${path.basename(sideByBydePath)}`);
                console.log(`🔍 Found ${numDiffPixels} different pixels`);
                
                return true;
                
            } catch (pixelError) {
                console.warn('⚠️  Pixelmatch diff generation failed:', pixelError.message);
                
                // Fallback: Create simple side-by-side comparison
                await this.createFallbackDiff(baselinePath, actualPath, diffPath);
                return true;
            }
            
        } catch (error) {
            console.error('❌ Diff generation failed:', error.message);
            
            // Last resort: copy actual image as diff
            try {
                fsSync.copyFileSync(actualPath, diffPath);
                console.log('📋 Created fallback diff (copy of actual image)');
                return true;
            } catch (copyError) {
                console.error('❌ Even fallback diff creation failed:', copyError.message);
                return false;
            }
        }
    }
    
    /**
     * Create a simple fallback diff when pixelmatch is not available
     * @param {string} baselinePath - Path to baseline image
     * @param {string} actualPath - Path to actual image
     * @param {string} diffPath - Path where diff image will be saved
     */
    async createFallbackDiff(baselinePath, actualPath, diffPath) {
        try {
            const PNG = require('pngjs').PNG;
            
            // Read images
            const baselineBuffer = fsSync.readFileSync(baselinePath);
            const baselineImg = PNG.sync.read(baselineBuffer);
            
            const actualBuffer = fsSync.readFileSync(actualPath);
            const actualImg = PNG.sync.read(actualBuffer);
            
            // Create side-by-side image
            const width = Math.max(baselineImg.width, actualImg.width);
            const height = Math.max(baselineImg.height, actualImg.height);
            const sideByImg = new PNG({ width: width * 2, height });
            
            // Copy baseline to left side
            PNG.bitblt(baselineImg, sideByImg, 0, 0, baselineImg.width, baselineImg.height, 0, 0);
            // Copy actual to right side  
            PNG.bitblt(actualImg, sideByImg, 0, 0, actualImg.width, actualImg.height, width, 0);
            
            // Save side-by-side comparison
            const sideByBuffer = PNG.sync.write(sideByImg);
            fsSync.writeFileSync(diffPath, sideByBuffer);
            
            console.log('📊 Created fallback side-by-side comparison');
            
        } catch (error) {
            // If everything fails, just copy the actual image
            fsSync.copyFileSync(actualPath, diffPath);
            console.log('📋 Created basic diff (copy of actual)');
        }
    }

    /**
     * Update visual summary for hybrid approach
     * @param {string} testName - Name of the test
     * @param {Object} visualResult - Result of visual testing
     */
    async updateVisualSummary(testName, visualResult) {
        if (!this.isHybrid || !this.visualSummaryPath) {
            return; // Only for hybrid mode
        }

        try {
            let summary = {};
            
            // Read existing summary if it exists
            if (fsSync.existsSync(this.visualSummaryPath)) {
                const content = fsSync.readFileSync(this.visualSummaryPath, 'utf8');
                summary = JSON.parse(content);
            }

            // Initialize summary structure
            if (!summary.runInfo) {
                summary.runInfo = {
                    runId: this.runId,
                    startTime: new Date().toISOString(),
                    totalTests: 0,
                    passedTests: 0,
                    failedTests: 0
                };
            }

            if (!summary.tests) {
                summary.tests = {};
            }

            // Update test results
            summary.tests[testName] = {
                status: visualResult.status,
                message: visualResult.message,
                timestamp: new Date().toISOString(),
                baseline: visualResult.baselinePath ? path.basename(visualResult.baselinePath) : null,
                actual: visualResult.actualPath ? path.basename(visualResult.actualPath) : null,
                diff: visualResult.diffPath ? path.basename(visualResult.diffPath) : null,
                comparison: visualResult.comparisonPath ? path.basename(visualResult.comparisonPath) : null,
                match: visualResult.match,
                sizeDifference: visualResult.sizeDifference,
                pixelDifference: visualResult.pixelDifference
            };

            // Update counters
            summary.runInfo.totalTests = Object.keys(summary.tests).length;
            summary.runInfo.passedTests = Object.values(summary.tests).filter(t => t.status === 'PASS').length;
            summary.runInfo.failedTests = Object.values(summary.tests).filter(t => t.status === 'FAIL').length;
            summary.runInfo.lastUpdated = new Date().toISOString();

            // Write updated summary
            fsSync.writeFileSync(this.visualSummaryPath, JSON.stringify(summary, null, 2));
            
            console.log(`📋 Updated visual summary for test: ${testName}`);

        } catch (error) {
            console.warn('⚠️  Could not update visual summary:', error.message);
        }
    }

    /**
     * Create links to centralized visual data for this test run
     * @param {string} testName - Name of the test
     * @param {Object} visualPaths - Paths to visual files
     */
    async createVisualTestLinks(testName, visualPaths) {
        if (!this.isHybrid || !this.visualLinksDir) {
            return; // Only for hybrid mode
        }

        try {
            const linkFile = path.join(this.visualLinksDir, `${testName}-links.json`);
            
            const links = {
                testName,
                timestamp: new Date().toISOString(),
                centralPaths: {
                    baseline: visualPaths.baseline,
                    actual: visualPaths.actual,
                    diff: visualPaths.diff,
                    comparison: visualPaths.comparison
                },
                relativePaths: {
                    baseline: visualPaths.baseline ? path.relative(this.visualLinksDir, visualPaths.baseline) : null,
                    actual: visualPaths.actual ? path.relative(this.visualLinksDir, visualPaths.actual) : null,
                    diff: visualPaths.diff ? path.relative(this.visualLinksDir, visualPaths.diff) : null,
                    comparison: visualPaths.comparison ? path.relative(this.visualLinksDir, visualPaths.comparison) : null
                }
            };

            fsSync.writeFileSync(linkFile, JSON.stringify(links, null, 2));

            // Create actual file references in links subdirectories
            await this.createFileReferences(testName, visualPaths);
            
            console.log(`🔗 Created visual links for test: ${testName}`);

        } catch (error) {
            console.warn('⚠️  Could not create visual test links:', error.message);
        }
    }

    /**
     * Create file references in links subdirectories for easy access
     * @param {string} testName - Name of the test
     * @param {Object} visualPaths - Paths to visual files
     */
    async createFileReferences(testName, visualPaths) {
        const linkDirs = {
            baselines: path.join(this.visualLinksDir, 'baselines'),
            actual: path.join(this.visualLinksDir, 'actual'),
            diffs: path.join(this.visualLinksDir, 'diffs'),
            comparisons: path.join(this.visualLinksDir, 'comparisons')
        };

        // Create reference files that contain the path to the actual file
        const createReference = async (linkDir, fileName, targetPath) => {
            if (!targetPath || !fsSync.existsSync(targetPath)) return;
            
            // Create a reference text file
            const linkPath = path.join(linkDir, `${fileName}.txt`);
            const referenceContent = `Target File: ${targetPath}\nRelative Path: ${path.relative(linkDir, targetPath)}\nCreated: ${new Date().toISOString()}\n\nTo open the file, copy the Target File path above.`;
            
            fsSync.writeFileSync(linkPath, referenceContent);

            // Also copy the actual file for direct access (hybrid convenience)
            const directCopyPath = path.join(linkDir, path.basename(targetPath));
            try {
                fsSync.copyFileSync(targetPath, directCopyPath);
            } catch (error) {
                // File copy failed, but reference file still works
                console.log(`   ℹ️  Reference created: ${fileName}.txt (direct copy skipped)`);
            }
        };

        // Create references for each type of visual file
        const references = [];
        if (visualPaths.baseline) {
            references.push(createReference(linkDirs.baselines, path.basename(visualPaths.baseline, '.png'), visualPaths.baseline));
        }
        if (visualPaths.actual) {
            references.push(createReference(linkDirs.actual, path.basename(visualPaths.actual, '.png'), visualPaths.actual));
        }
        if (visualPaths.diff) {
            references.push(createReference(linkDirs.diffs, path.basename(visualPaths.diff, '.png'), visualPaths.diff));
        }
        if (visualPaths.comparison) {
            references.push(createReference(linkDirs.comparisons, path.basename(visualPaths.comparison, '.png'), visualPaths.comparison));
        }

        // Wait for all references to be created
        await Promise.all(references);
    }
}

module.exports = VisualTesting;
