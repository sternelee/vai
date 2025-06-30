import AsyncStorage from '@react-native-async-storage/async-storage';

export interface HomePageShortcut {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  addedAt: string;
}

export interface HomePageSettings {
  isCustomHomeEnabled: boolean;
  homePageUrl: string;
  shortcuts: HomePageShortcut[];
}

class HomePageService {
  private static instance: HomePageService;
  private readonly STORAGE_KEY = 'homepage_settings';
  private readonly DEFAULT_HOME_URL = 'vai://home';

  public static getInstance(): HomePageService {
    if (!HomePageService.instance) {
      HomePageService.instance = new HomePageService();
    }
    return HomePageService.instance;
  }

  // 获取主页设置
  public async getHomePageSettings(): Promise<HomePageSettings> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      
      // 返回默认设置
      return {
        isCustomHomeEnabled: true,
        homePageUrl: this.DEFAULT_HOME_URL,
        shortcuts: [],
      };
    } catch (error) {
      console.error('Failed to get homepage settings:', error);
      return {
        isCustomHomeEnabled: true,
        homePageUrl: this.DEFAULT_HOME_URL,
        shortcuts: [],
      };
    }
  }

  // 保存主页设置
  public async saveHomePageSettings(settings: HomePageSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save homepage settings:', error);
      throw error;
    }
  }

  // 获取快捷方式列表
  public async getShortcuts(): Promise<HomePageShortcut[]> {
    const settings = await this.getHomePageSettings();
    return settings.shortcuts;
  }

  // 添加快捷方式
  public async addShortcut(shortcut: Omit<HomePageShortcut, 'id' | 'addedAt'>): Promise<HomePageShortcut> {
    const settings = await this.getHomePageSettings();
    
    // 检查是否已存在相同URL的快捷方式
    const exists = settings.shortcuts.some(s => s.url === shortcut.url);
    if (exists) {
      throw new Error('该页面已经添加到主页');
    }

    const newShortcut: HomePageShortcut = {
      ...shortcut,
      id: Date.now().toString(),
      addedAt: new Date().toISOString(),
    };

    settings.shortcuts.push(newShortcut);
    await this.saveHomePageSettings(settings);
    
    return newShortcut;
  }

  // 删除快捷方式
  public async removeShortcut(shortcutId: string): Promise<void> {
    const settings = await this.getHomePageSettings();
    settings.shortcuts = settings.shortcuts.filter(s => s.id !== shortcutId);
    await this.saveHomePageSettings(settings);
  }

  // 更新快捷方式
  public async updateShortcut(shortcutId: string, updates: Partial<HomePageShortcut>): Promise<void> {
    const settings = await this.getHomePageSettings();
    const index = settings.shortcuts.findIndex(s => s.id === shortcutId);
    
    if (index === -1) {
      throw new Error('快捷方式不存在');
    }

    settings.shortcuts[index] = { ...settings.shortcuts[index], ...updates };
    await this.saveHomePageSettings(settings);
  }

  // 批量更新快捷方式
  public async updateShortcuts(shortcuts: HomePageShortcut[]): Promise<void> {
    const settings = await this.getHomePageSettings();
    settings.shortcuts = shortcuts;
    await this.saveHomePageSettings(settings);
  }

  // 设置是否启用自定义主页
  public async setCustomHomeEnabled(enabled: boolean): Promise<void> {
    const settings = await this.getHomePageSettings();
    settings.isCustomHomeEnabled = enabled;
    await this.saveHomePageSettings(settings);
  }

  // 设置主页URL
  public async setHomePageUrl(url: string): Promise<void> {
    const settings = await this.getHomePageSettings();
    settings.homePageUrl = url;
    await this.saveHomePageSettings(settings);
  }

  // 获取主页URL
  public async getHomePageUrl(): Promise<string> {
    const settings = await this.getHomePageSettings();
    return settings.isCustomHomeEnabled ? settings.homePageUrl : 'https://www.google.com';
  }

  // 检查是否为自定义主页URL
  public isCustomHomePage(url: string): boolean {
    return url === this.DEFAULT_HOME_URL;
  }

  // 获取默认主页URL
  public getDefaultHomeUrl(): string {
    return this.DEFAULT_HOME_URL;
  }

  // 生成网站图标URL
  public generateFaviconUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.hostname}/favicon.ico`;
    } catch {
      return '';
    }
  }

  // 导出设置
  public async exportSettings(): Promise<string> {
    const settings = await this.getHomePageSettings();
    return JSON.stringify(settings, null, 2);
  }

  // 导入设置
  public async importSettings(settingsJson: string): Promise<void> {
    try {
      const settings = JSON.parse(settingsJson) as HomePageSettings;
      
      // 验证设置格式
      if (!settings.shortcuts || !Array.isArray(settings.shortcuts)) {
        throw new Error('Invalid settings format');
      }

      await this.saveHomePageSettings(settings);
    } catch (error) {
      console.error('Failed to import settings:', error);
      throw new Error('导入设置失败，请检查文件格式');
    }
  }

  // 重置为默认设置
  public async resetToDefault(): Promise<void> {
    const defaultSettings: HomePageSettings = {
      isCustomHomeEnabled: true,
      homePageUrl: this.DEFAULT_HOME_URL,
      shortcuts: [],
    };
    
    await this.saveHomePageSettings(defaultSettings);
  }

  // 清理过期的快捷方式（可选功能）
  public async cleanupOldShortcuts(daysOld: number = 30): Promise<number> {
    const settings = await this.getHomePageSettings();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const originalCount = settings.shortcuts.length;
    settings.shortcuts = settings.shortcuts.filter(shortcut => {
      const addedDate = new Date(shortcut.addedAt);
      return addedDate > cutoffDate;
    });

    await this.saveHomePageSettings(settings);
    return originalCount - settings.shortcuts.length;
  }

  // 搜索快捷方式
  public async searchShortcuts(query: string): Promise<HomePageShortcut[]> {
    const shortcuts = await this.getShortcuts();
    const lowerQuery = query.toLowerCase();
    
    return shortcuts.filter(shortcut => 
      shortcut.title.toLowerCase().includes(lowerQuery) ||
      shortcut.url.toLowerCase().includes(lowerQuery)
    );
  }

  // 获取使用统计
  public async getUsageStats(): Promise<{
    totalShortcuts: number;
    addedThisMonth: number;
    oldestShortcut?: HomePageShortcut;
    newestShortcut?: HomePageShortcut;
  }> {
    const shortcuts = await this.getShortcuts();
    
    if (shortcuts.length === 0) {
      return {
        totalShortcuts: 0,
        addedThisMonth: 0,
      };
    }

    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const addedThisMonth = shortcuts.filter(shortcut => {
      const addedDate = new Date(shortcut.addedAt);
      return addedDate >= thisMonth;
    }).length;

    const sortedByDate = [...shortcuts].sort((a, b) => 
      new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime()
    );

    return {
      totalShortcuts: shortcuts.length,
      addedThisMonth,
      oldestShortcut: sortedByDate[0],
      newestShortcut: sortedByDate[sortedByDate.length - 1],
    };
  }
}

export const homePageService = HomePageService.getInstance();
export default HomePageService; 