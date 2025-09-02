const { execSync } = require('child_process');
const os = require('os');
const playwright = require('@playwright/test');

class BuildInfoCollector {
    async collect() {
        return {
            timestamp: new Date().toISOString(),
            environment: {
                os: {
                    type: os.type(),
                    platform: os.platform(),
                    release: os.release(),
                    arch: os.arch()
                },
                node: process.version,
                playwright: playwright.version
            },
            git: this.getGitInfo(),
            browser: await this.getBrowserInfo(),
            system: {
                hostname: os.hostname(),
                cpus: os.cpus().length,
                memory: {
                    total: os.totalmem(),
                    free: os.freemem()
                }
            }
        };
    }

    getGitInfo() {
        try {
            const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
            const commit = execSync('git rev-parse HEAD').toString().trim();
            const author = execSync('git config user.name').toString().trim();
            return { branch, commit, author };
        } catch {
            return { branch: 'unknown', commit: 'unknown', author: 'unknown' };
        }
    }

    async getBrowserInfo() {
        try {
            const browser = await playwright.chromium.launch();
            const context = await browser.newContext();
            const page = await context.newPage();
            const version = await page.evaluate(() => navigator.userAgent);
            await browser.close();
            return { userAgent: version };
        } catch {
            return { userAgent: 'unknown' };
        }
    }
}

module.exports = BuildInfoCollector;
