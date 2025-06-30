import { AppState, AppStateStatus } from 'react-native';

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface PerformanceMetrics {
  memoryUsage: MemoryInfo | null;
  loadTime: number;
  renderTime: number;
  tabCount: number;
  timestamp: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

class PerformanceService {
  private performanceMetrics: PerformanceMetrics[] = [];
  private memoryCache = new Map<string, CacheEntry<any>>();
  private imageCache = new Map<string, CacheEntry<string>>();
  private webViewRefs = new Map<string, any>();
  private isMonitoring = false;
  private monitoringInterval: number | null = null;

  // Cache configuration
  private readonly MAX_CACHE_SIZE = 100;
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes
  private readonly MAX_IMAGE_CACHE_SIZE = 50;
  private readonly MEMORY_THRESHOLD = 150 * 1024 * 1024; // 150MB

  constructor() {
    this.setupAppStateListener();
  }

  // Initialize performance monitoring
  async initialize(): Promise<void> {
    try {
      this.startMonitoring();
      await this.cleanupCache();
      console.log('Performance service initialized');
    } catch (error) {
      console.error('Failed to initialize performance service:', error);
    }
  }

  // Start performance monitoring
  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(async () => {
      await this.collectMetrics();
    }, 5000); // Collect metrics every 5 seconds
  }

  // Stop performance monitoring
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  // Collect performance metrics
  private async collectMetrics(): Promise<void> {
    try {
      const memoryInfo = await this.getMemoryInfo();

      const metrics: PerformanceMetrics = {
        memoryUsage: memoryInfo,
        loadTime: 0, // Will be set by WebView
        renderTime: 0, // Will be set by components
        tabCount: this.webViewRefs.size,
        timestamp: Date.now(),
      };

      this.performanceMetrics.push(metrics);

      // Keep only last 100 metrics
      if (this.performanceMetrics.length > 100) {
        this.performanceMetrics = this.performanceMetrics.slice(-100);
      }

      // Check memory threshold and cleanup if needed
      if (memoryInfo && memoryInfo.usedJSHeapSize > this.MEMORY_THRESHOLD) {
        await this.performMemoryCleanup();
      }

    } catch (error) {
      console.error('Failed to collect metrics:', error);
    }
  }

  // Get memory information
  private async getMemoryInfo(): Promise<MemoryInfo | null> {
    try {
      // For React Native, we'll use a simulated memory info based on runtime metrics
      // In a real implementation, you might use native modules
      const estimatedMemory = {
        usedJSHeapSize: Math.floor(Math.random() * 100 * 1024 * 1024) + 50 * 1024 * 1024, // 50-150MB
        totalJSHeapSize: 200 * 1024 * 1024, // 200MB
        jsHeapSizeLimit: 512 * 1024 * 1024, // 512MB
      };

      return estimatedMemory;
    } catch (error) {
      console.error('Failed to get memory info:', error);
      return null;
    }
  }

  // Register WebView reference for memory management
  registerWebView(tabId: string, webViewRef: any): void {
    this.webViewRefs.set(tabId, webViewRef);
  }

  // Unregister WebView reference
  unregisterWebView(tabId: string): void {
    const webViewRef = this.webViewRefs.get(tabId);
    if (webViewRef) {
      try {
        // Force garbage collection on WebView
        webViewRef.clearCache?.(true);
        webViewRef.clearHistory?.();
      } catch (error) {
        console.error('Failed to cleanup WebView:', error);
      }
    }
    this.webViewRefs.delete(tabId);
  }

  // Memory cache management
  setCache<T>(key: string, data: T): void {
    // Remove oldest entries if cache is full
    if (this.memoryCache.size >= this.MAX_CACHE_SIZE) {
      this.evictOldestCacheEntries();
    }

    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now(),
    });
  }

  getCache<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;

    // Check if entry is expired
    if (Date.now() - entry.timestamp > this.CACHE_TTL) {
      this.memoryCache.delete(key);
      return null;
    }

    // Update access info
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    return entry.data;
  }

  // Image cache management
  cacheImage(url: string, base64Data: string): void {
    if (this.imageCache.size >= this.MAX_IMAGE_CACHE_SIZE) {
      this.evictOldestImageCacheEntries();
    }

    this.imageCache.set(url, {
      data: base64Data,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now(),
    });
  }

  getCachedImage(url: string): string | null {
    const entry = this.imageCache.get(url);
    if (!entry) return null;

    // Check if entry is expired
    if (Date.now() - entry.timestamp > this.CACHE_TTL) {
      this.imageCache.delete(url);
      return null;
    }

    entry.accessCount++;
    entry.lastAccessed = Date.now();

    return entry.data;
  }

  // Cache cleanup methods
  private evictOldestCacheEntries(): void {
    const entries = Array.from(this.memoryCache.entries());
    entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

    // Remove oldest 20% of entries
    const toRemove = Math.ceil(entries.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      this.memoryCache.delete(entries[i][0]);
    }
  }

  private evictOldestImageCacheEntries(): void {
    const entries = Array.from(this.imageCache.entries());
    entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

    // Remove oldest 20% of entries
    const toRemove = Math.ceil(entries.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      this.imageCache.delete(entries[i][0]);
    }
  }

  // Perform aggressive memory cleanup
  private async performMemoryCleanup(): Promise<void> {
    console.log('Performing memory cleanup...');

    try {
      // Clear expired cache entries
      await this.cleanupCache();

      // Clear inactive WebViews
      this.cleanupInactiveWebViews();

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      console.log('Memory cleanup completed');
    } catch (error) {
      console.error('Memory cleanup failed:', error);
    }
  }

  // Cleanup expired cache entries
  async cleanupCache(): Promise<void> {
    const now = Date.now();

    // Cleanup memory cache
    for (const [key, entry] of this.memoryCache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        this.memoryCache.delete(key);
      }
    }

    // Cleanup image cache
    for (const [key, entry] of this.imageCache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        this.imageCache.delete(key);
      }
    }
  }

  // Cleanup inactive WebViews
  private cleanupInactiveWebViews(): void {
    for (const [tabId, webViewRef] of this.webViewRefs.entries()) {
      try {
        // Check if WebView is still active
        if (webViewRef && typeof webViewRef.clearCache === 'function') {
          webViewRef.clearCache(false); // Clear cache but keep history
        }
      } catch (error) {
        console.error(`Failed to cleanup WebView ${tabId}:`, error);
        // Remove broken reference
        this.webViewRefs.delete(tabId);
      }
    }
  }

  // App state management
  private setupAppStateListener(): void {
    const subscription = AppState.addEventListener('change', this.handleAppStateChange.bind(this));
    // Store subscription for cleanup if needed
    (this as any).appStateSubscription = subscription;
  }

  private handleAppStateChange(nextAppState: AppStateStatus): void {
    if (nextAppState === 'background') {
      // App going to background - cleanup resources
      this.performMemoryCleanup();
      this.stopMonitoring();
    } else if (nextAppState === 'active') {
      // App became active - resume monitoring
      this.startMonitoring();
    }
  }

  // Performance measurement utilities
  measureLoadTime(startTime: number): number {
    return Date.now() - startTime;
  }

  measureRenderTime(componentName: string, renderTime: number): void {
    console.log(`${componentName} render time: ${renderTime}ms`);

    // Store render time in latest metrics
    if (this.performanceMetrics.length > 0) {
      this.performanceMetrics[this.performanceMetrics.length - 1].renderTime = renderTime;
    }
  }

  // Get performance statistics
  getPerformanceStats(): {
    averageMemoryUsage: number;
    peakMemoryUsage: number;
    averageLoadTime: number;
    cacheHitRate: number;
    totalTabs: number;
  } {
    if (this.performanceMetrics.length === 0) {
      return {
        averageMemoryUsage: 0,
        peakMemoryUsage: 0,
        averageLoadTime: 0,
        cacheHitRate: 0,
        totalTabs: 0,
      };
    }

    const memoryUsages = this.performanceMetrics
      .map(m => m.memoryUsage?.usedJSHeapSize || 0)
      .filter(m => m > 0);

    const loadTimes = this.performanceMetrics
      .map(m => m.loadTime)
      .filter(t => t > 0);

    // Calculate cache hit rate
    const totalCacheAccesses = Array.from(this.memoryCache.values())
      .reduce((sum, entry) => sum + entry.accessCount, 0);
    const cacheHitRate = this.memoryCache.size > 0 ?
      (totalCacheAccesses - this.memoryCache.size) / totalCacheAccesses : 0;

    return {
      averageMemoryUsage: memoryUsages.length > 0 ?
        memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length : 0,
      peakMemoryUsage: memoryUsages.length > 0 ? Math.max(...memoryUsages) : 0,
      averageLoadTime: loadTimes.length > 0 ?
        loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length : 0,
      cacheHitRate: cacheHitRate * 100,
      totalTabs: this.webViewRefs.size,
    };
  }

  // Clear all caches
  clearAllCaches(): void {
    this.memoryCache.clear();
    this.imageCache.clear();

    // Clear WebView caches
    for (const webViewRef of this.webViewRefs.values()) {
      try {
        webViewRef.clearCache?.(true);
      } catch (error) {
        console.error('Failed to clear WebView cache:', error);
      }
    }
  }

  // Destroy service
  destroy(): void {
    this.stopMonitoring();
    this.clearAllCaches();
    this.webViewRefs.clear();
    this.performanceMetrics = [];
  }
}

// Export singleton instance
export const performanceService = new PerformanceService();