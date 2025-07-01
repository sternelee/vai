import databaseService from "./DatabaseService";

export interface UserScript {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  enabled: boolean;
  code: string;
  includes: string[]; // URL patterns where script should run
  excludes: string[]; // URL patterns where script should NOT run
  grants: string[]; // Permissions requested by script
  runAt: "document-start" | "document-ready" | "document-end" | "document-idle";
  updateUrl?: string;
  downloadUrl?: string;
  homepageUrl?: string;
  supportUrl?: string;
  installTime: string;
  lastUpdate?: string;
  runCount: number;
  isBuiltIn: boolean;
  icon?: string;
}

export interface ScriptMetadata {
  name?: string;
  description?: string;
  author?: string;
  version?: string;
  include?: string[];
  exclude?: string[];
  grant?: string[];
  "run-at"?: string;
  updateURL?: string;
  downloadURL?: string;
  homepageURL?: string;
  supportURL?: string;
  icon?: string;
}

class UserScriptService {
  private scripts: Map<string, UserScript> = new Map();
  private listeners: Set<(scripts: UserScript[]) => void> = new Set();
  private injectedScripts: Map<string, string[]> = new Map(); // tabId -> scriptIds

  constructor() {
    this.loadBuiltInScripts();
  }

  // Initialize service
  async initialize(): Promise<void> {
    try {
      await this.loadScriptsFromDB();
      console.log("User script service initialized");
    } catch (error) {
      console.error("Failed to initialize user script service:", error);
    }
  }

  // Load scripts from database
  private async loadScriptsFromDB(): Promise<void> {
    try {
      const savedScripts = await databaseService.getUserScripts();
      this.scripts.clear();

      savedScripts.forEach((script) => {
        this.scripts.set(script.id, script);
      });

      this.notifyListeners();
    } catch (error) {
      console.error("Failed to load scripts from database:", error);
    }
  }

  // Load built-in scripts
  private loadBuiltInScripts(): void {
    const builtInScripts: UserScript[] = [
      {
        id: "builtin-ad-blocker",
        name: "Simple Ad Blocker",
        description: "Blocks common advertisement elements",
        author: "VaiBrowser",
        version: "1.0.0",
        enabled: true,
        code: `
// ==UserScript==
// @name         Simple Ad Blocker
// @description  Blocks common advertisement elements
// @author       VaiBrowser
// @version      1.0.0
// @include      *
// @grant        none
// @run-at       document-ready
// ==/UserScript==

(function() {
    'use strict';

    // Common ad selectors
    const adSelectors = [
        '[class*="ad"]',
        '[id*="ad"]',
        '[class*="banner"]',
        '[class*="popup"]',
        '.advertisement',
        '.ads',
        '.google-ads',
        'iframe[src*="doubleclick"]',
        'iframe[src*="googleads"]',
        'iframe[src*="googlesyndication"]'
    ];

    function removeAds() {
        adSelectors.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    if (el && el.parentNode) {
                        el.style.display = 'none';
                        console.log('Blocked ad element:', el);
                    }
                });
            } catch (e) {
                // Ignore selector errors
            }
        });
    }

    // Run immediately and observe for new elements
    removeAds();

    // Observer for dynamically added content
    const observer = new MutationObserver(() => {
        removeAds();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
})();
        `,
        includes: ["*"],
        excludes: [],
        grants: ["none"],
        runAt: "document-ready",
        installTime: new Date().toISOString(),
        runCount: 0,
        isBuiltIn: true,
        icon: "🚫",
      },
      {
        id: "builtin-dark-mode",
        name: "Dark Mode Toggle",
        description: "Adds dark mode support to websites",
        author: "VaiBrowser",
        version: "1.0.0",
        enabled: false,
        code: `
// ==UserScript==
// @name         Dark Mode Toggle
// @description  Adds dark mode support to websites
// @author       VaiBrowser
// @version      1.0.0
// @include      *
// @grant        none
// @run-at       document-ready
// ==/UserScript==

(function() {
    'use strict';

    // Create dark mode toggle button
    const toggleButton = document.createElement('div');
    toggleButton.innerHTML = '🌙';
    toggleButton.style.cssText = \`
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        background: #333;
        color: white;
        border: none;
        border-radius: 50%;
        width: 50px;
        height: 50px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 20px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        transition: all 0.3s ease;
    \`;

    let isDarkMode = false;

    function toggleDarkMode() {
        isDarkMode = !isDarkMode;

        if (isDarkMode) {
            document.documentElement.style.filter = 'invert(1) hue-rotate(180deg)';
            document.documentElement.style.background = '#111';
            toggleButton.innerHTML = '☀️';

            // Fix images and videos
            const media = document.querySelectorAll('img, video, iframe, svg');
            media.forEach(el => {
                el.style.filter = 'invert(1) hue-rotate(180deg)';
            });
        } else {
            document.documentElement.style.filter = '';
            document.documentElement.style.background = '';
            toggleButton.innerHTML = '🌙';

            const media = document.querySelectorAll('img, video, iframe, svg');
            media.forEach(el => {
                el.style.filter = '';
            });
        }
    }

    toggleButton.addEventListener('click', toggleDarkMode);
    document.body.appendChild(toggleButton);
})();
        `,
        includes: ["*"],
        excludes: [],
        grants: ["none"],
        runAt: "document-ready",
        installTime: new Date().toISOString(),
        runCount: 0,
        isBuiltIn: true,
        icon: "🌙",
      },
      {
        id: "builtin-auto-scroll",
        name: "Auto Scroll",
        description: "Automatically scrolls page content",
        author: "VaiBrowser",
        version: "1.0.0",
        enabled: false,
        code: `
// ==UserScript==
// @name         Auto Scroll
// @description  Automatically scrolls page content
// @author       VaiBrowser
// @version      1.0.0
// @include      *
// @grant        none
// @run-at       document-ready
// ==/UserScript==

(function() {
    'use strict';

    let isAutoScrolling = false;
    let scrollInterval;
    let scrollSpeed = 2; // pixels per interval

    // Create control panel
    const controlPanel = document.createElement('div');
    controlPanel.style.cssText = \`
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 10000;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 10px;
        border-radius: 10px;
        font-family: Arial, sans-serif;
        font-size: 14px;
        display: flex;
        flex-direction: column;
        gap: 5px;
        min-width: 150px;
    \`;

    const toggleButton = document.createElement('button');
    toggleButton.textContent = 'Start Auto Scroll';
    toggleButton.style.cssText = \`
        background: #007AFF;
        color: white;
        border: none;
        padding: 8px;
        border-radius: 5px;
        cursor: pointer;
    \`;

    const speedSlider = document.createElement('input');
    speedSlider.type = 'range';
    speedSlider.min = '1';
    speedSlider.max = '10';
    speedSlider.value = '2';
    speedSlider.style.width = '100%';

    const speedLabel = document.createElement('div');
    speedLabel.textContent = 'Speed: 2';
    speedLabel.style.textAlign = 'center';

    function startAutoScroll() {
        if (scrollInterval) clearInterval(scrollInterval);
        scrollInterval = setInterval(() => {
            window.scrollBy(0, scrollSpeed);

            // Stop if reached bottom
            if (window.innerHeight + window.scrollY >= document.body.offsetHeight) {
                stopAutoScroll();
            }
        }, 50);

        isAutoScrolling = true;
        toggleButton.textContent = 'Stop Auto Scroll';
        toggleButton.style.background = '#FF3B30';
    }

    function stopAutoScroll() {
        if (scrollInterval) {
            clearInterval(scrollInterval);
            scrollInterval = null;
        }
        isAutoScrolling = false;
        toggleButton.textContent = 'Start Auto Scroll';
        toggleButton.style.background = '#007AFF';
    }

    toggleButton.addEventListener('click', () => {
        if (isAutoScrolling) {
            stopAutoScroll();
        } else {
            startAutoScroll();
        }
    });

    speedSlider.addEventListener('input', (e) => {
        scrollSpeed = parseInt(e.target.value);
        speedLabel.textContent = \`Speed: \${scrollSpeed}\`;
    });

    controlPanel.appendChild(toggleButton);
    controlPanel.appendChild(speedLabel);
    controlPanel.appendChild(speedSlider);

    document.body.appendChild(controlPanel);
})();
        `,
        includes: ["*"],
        excludes: [],
        grants: ["none"],
        runAt: "document-ready",
        installTime: new Date().toISOString(),
        runCount: 0,
        isBuiltIn: true,
        icon: "📜",
      },
    ];

    builtInScripts.forEach((script) => {
      this.scripts.set(script.id, script);
    });
  }

  // Parse user script metadata
  parseScriptMetadata(code: string): ScriptMetadata {
    const metadata: ScriptMetadata = {};
    const lines = code.split("\n");
    let inMetadataBlock = false;

    for (const line of lines) {
      const trimmed = line.trim() || "";

      if (trimmed === "// ==UserScript==") {
        inMetadataBlock = true;
        continue;
      }

      if (trimmed === "// ==/UserScript==") {
        break;
      }

      if (inMetadataBlock && trimmed.startsWith("// @")) {
        const match = trimmed.match(/^\/\/ @(\w+)\s+(.+)$/);
        if (match) {
          const [, key, value] = match;

          switch (key) {
            case "name":
              metadata.name = value;
              break;
            case "description":
              metadata.description = value;
              break;
            case "author":
              metadata.author = value;
              break;
            case "version":
              metadata.version = value;
              break;
            case "include":
              if (!metadata.include) metadata.include = [];
              metadata.include.push(value);
              break;
            case "exclude":
              if (!metadata.exclude) metadata.exclude = [];
              metadata.exclude.push(value);
              break;
            case "grant":
              if (!metadata.grant) metadata.grant = [];
              metadata.grant.push(value);
              break;
            case "run-at":
              metadata["run-at"] = value as any;
              break;
            case "updateURL":
              metadata.updateURL = value;
              break;
            case "downloadURL":
              metadata.downloadURL = value;
              break;
            case "homepageURL":
              metadata.homepageURL = value;
              break;
            case "supportURL":
              metadata.supportURL = value;
              break;
            case "icon":
              metadata.icon = value;
              break;
          }
        }
      }
    }

    return metadata;
  }

  // Install script from code
  async installScript(code: string): Promise<UserScript> {
    const metadata = this.parseScriptMetadata(code);

    if (!metadata.name) {
      throw new Error("Script must have a name");
    }

    const script: UserScript = {
      id: Date.now().toString(),
      name: metadata.name,
      description: metadata.description || "No description",
      author: metadata.author || "Unknown",
      version: metadata.version || "1.0.0",
      enabled: true,
      code,
      includes: metadata.include || ["*"],
      excludes: metadata.exclude || [],
      grants: metadata.grant || ["none"],
      runAt: (metadata["run-at"] as any) || "document-ready",
      updateUrl: metadata.updateURL,
      downloadUrl: metadata.downloadURL,
      homepageUrl: metadata.homepageURL,
      supportUrl: metadata.supportURL,
      installTime: new Date().toISOString(),
      runCount: 0,
      isBuiltIn: false,
      icon: metadata.icon,
    };

    this.scripts.set(script.id, script);
    await databaseService.saveUserScript(script);
    this.notifyListeners();

    return script;
  }

  // Get all scripts
  getScripts(): UserScript[] {
    return Array.from(this.scripts.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }

  // Get script by ID
  getScript(id: string): UserScript | undefined {
    return this.scripts.get(id);
  }

  // Enable/disable script
  async setScriptEnabled(id: string, enabled: boolean): Promise<void> {
    const script = this.scripts.get(id);
    if (!script) return;

    script.enabled = enabled;
    this.scripts.set(id, script);

    if (!script.isBuiltIn) {
      await databaseService.saveUserScript(script);
    }

    this.notifyListeners();
  }

  // Update script
  async updateScript(id: string, updates: Partial<UserScript>): Promise<void> {
    const script = this.scripts.get(id);
    if (!script || script.isBuiltIn) return;

    const updatedScript = { ...script, ...updates };
    this.scripts.set(id, updatedScript);

    await databaseService.saveUserScript(updatedScript);
    this.notifyListeners();
  }

  // Delete script
  async deleteScript(id: string): Promise<void> {
    const script = this.scripts.get(id);
    if (!script || script.isBuiltIn) return;

    this.scripts.delete(id);
    await databaseService.removeUserScript(id);
    this.notifyListeners();
  }

  // Check if script should run on URL
  shouldRunScript(script: UserScript, url: string): boolean {
    if (!script.enabled) return false;

    // Check includes
    const includeMatch = script.includes.some((pattern) =>
      this.matchPattern(pattern, url),
    );

    if (!includeMatch) return false;

    // Check excludes
    const excludeMatch = script.excludes.some((pattern) =>
      this.matchPattern(pattern, url),
    );

    return !excludeMatch;
  }

  // Pattern matching for URLs
  private matchPattern(pattern: string, url: string): boolean {
    if (pattern === "*") return true;

    // Convert wildcard pattern to regex
    const regexPattern = pattern
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&") // Escape special chars
      .replace(/\\\*/g, ".*"); // Convert * to .*

    try {
      return new RegExp(`^${regexPattern}$`).test(url);
    } catch {
      return false;
    }
  }

  // Get scripts for URL
  getScriptsForUrl(url: string): UserScript[] {
    return this.getScripts().filter((script) =>
      this.shouldRunScript(script, url),
    );
  }

  // Inject scripts into page
  async injectScripts(tabId: string, url: string): Promise<string[]> {
    const scriptsToRun = this.getScriptsForUrl(url);
    const injectedScriptIds: string[] = [];

    for (const script of scriptsToRun) {
      try {
        // Update run count
        script.runCount++;
        if (!script.isBuiltIn) {
          await databaseService.saveUserScript(script);
        }

        injectedScriptIds.push(script.id);
        console.log(`Injected script: ${script.name} into tab ${tabId}`);
      } catch (error) {
        console.error(`Failed to inject script ${script.name}:`, error);
      }
    }

    this.injectedScripts.set(tabId, injectedScriptIds);
    return injectedScriptIds;
  }

  // Get injected scripts for tab
  getInjectedScripts(tabId: string): string[] {
    return this.injectedScripts.get(tabId) || [];
  }

  // Clear injected scripts for tab
  clearInjectedScripts(tabId: string): void {
    this.injectedScripts.delete(tabId);
  }

  // Export script
  exportScript(id: string): string {
    const script = this.scripts.get(id);
    if (!script) return "";

    return script.code;
  }

  // Import script from URL
  async importScriptFromUrl(url: string): Promise<UserScript> {
    try {
      const response = await fetch(url);
      const code = await response.text();
      return await this.installScript(code);
    } catch (error) {
      throw new Error(`Failed to import script from URL: ${error}`);
    }
  }

  // Get script statistics
  getScriptStats(): {
    totalScripts: number;
    enabledScripts: number;
    totalRuns: number;
    builtInScripts: number;
    userScripts: number;
  } {
    const scripts = this.getScripts();

    return {
      totalScripts: scripts.length,
      enabledScripts: scripts.filter((s) => s.enabled).length,
      totalRuns: scripts.reduce((sum, s) => sum + s.runCount, 0),
      builtInScripts: scripts.filter((s) => s.isBuiltIn).length,
      userScripts: scripts.filter((s) => !s.isBuiltIn).length,
    };
  }

  // Add listener for script updates
  addListener(listener: (scripts: UserScript[]) => void): void {
    this.listeners.add(listener);
    // Immediately call with current scripts
    listener(this.getScripts());
  }

  // Remove listener
  removeListener(listener: (scripts: UserScript[]) => void): void {
    this.listeners.delete(listener);
  }

  // Notify all listeners
  private notifyListeners(): void {
    const scripts = this.getScripts();
    this.listeners.forEach((listener) => {
      try {
        listener(scripts);
      } catch (error) {
        console.error("Script listener error:", error);
      }
    });
  }
}

// Export singleton instance
export const userScriptService = new UserScriptService();
