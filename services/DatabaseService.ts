import * as SQLite from 'expo-sqlite';

export interface HistoryItem {
  id?: number;
  url: string;
  title: string;
  visitedAt: string;
  favicon?: string;
}

export interface BookmarkItem {
  id?: number;
  url: string;
  title: string;
  createdAt: string;
  favicon?: string;
  folder?: string;
}

export interface TabItem {
  id: string;
  url: string;
  title: string;
  canGoBack: boolean;
  canGoForward: boolean;
  isLoading: boolean;
  progress: number;
}

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;

  async initialize(): Promise<void> {
    try {
      this.db = await SQLite.openDatabaseAsync('vaibrowser.db');
      
      // Create tables
      await this.createTables();
      
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL,
        title TEXT NOT NULL,
        visited_at TEXT NOT NULL,
        favicon TEXT
      );
    `);

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS bookmarks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        created_at TEXT NOT NULL,
        favicon TEXT,
        folder TEXT DEFAULT 'default'
      );
    `);

    // Create indexes for better performance
    await this.db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_history_url ON history(url);
      CREATE INDEX IF NOT EXISTS idx_history_visited_at ON history(visited_at);
      CREATE INDEX IF NOT EXISTS idx_bookmarks_url ON bookmarks(url);
      CREATE INDEX IF NOT EXISTS idx_bookmarks_folder ON bookmarks(folder);
    `);
  }

  // History methods
  async addHistoryItem(item: HistoryItem): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Check if URL already exists in recent history (last 24 hours)
      const existing = await this.db.getFirstAsync(
        'SELECT id FROM history WHERE url = ? AND visited_at > datetime("now", "-1 day")',
        [item.url]
      );

      if (existing) {
        // Update the existing entry's timestamp
        await this.db.runAsync(
          'UPDATE history SET visited_at = ?, title = ? WHERE url = ?',
          [item.visitedAt, item.title, item.url]
        );
      } else {
        // Insert new entry
        await this.db.runAsync(
          'INSERT INTO history (url, title, visited_at, favicon) VALUES (?, ?, ?, ?)',
          [item.url, item.title, item.visitedAt, item.favicon || null]
        );
      }

      // Keep only the last 1000 history items
      await this.db.runAsync(`
        DELETE FROM history 
        WHERE id NOT IN (
          SELECT id FROM history 
          ORDER BY visited_at DESC 
          LIMIT 1000
        )
      `);
    } catch (error) {
      console.error('Failed to add history item:', error);
      throw error;
    }
  }

  async getHistory(limit: number = 100): Promise<HistoryItem[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.db.getAllAsync(
        'SELECT * FROM history ORDER BY visited_at DESC LIMIT ?',
        [limit]
      );

      return result.map(row => ({
        id: (row as any).id,
        url: (row as any).url,
        title: (row as any).title,
        visitedAt: (row as any).visited_at,
        favicon: (row as any).favicon,
      })) as HistoryItem[];
    } catch (error) {
      console.error('Failed to get history:', error);
      return [];
    }
  }

  async searchHistory(query: string, limit: number = 50): Promise<HistoryItem[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.db.getAllAsync(`
        SELECT * FROM history 
        WHERE title LIKE ? OR url LIKE ? 
        ORDER BY visited_at DESC 
        LIMIT ?
      `, [`%${query}%`, `%${query}%`, limit]);

      return result.map(row => ({
        id: (row as any).id,
        url: (row as any).url,
        title: (row as any).title,
        visitedAt: (row as any).visited_at,
        favicon: (row as any).favicon,
      })) as HistoryItem[];
    } catch (error) {
      console.error('Failed to search history:', error);
      return [];
    }
  }

  async clearHistory(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.runAsync('DELETE FROM history');
      console.log('History cleared successfully');
    } catch (error) {
      console.error('Failed to clear history:', error);
      throw error;
    }
  }

  async deleteHistoryItem(id: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.runAsync('DELETE FROM history WHERE id = ?', [id]);
    } catch (error) {
      console.error('Failed to delete history item:', error);
      throw error;
    }
  }

  // Bookmark methods
  async addBookmark(item: BookmarkItem): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.runAsync(
        'INSERT OR REPLACE INTO bookmarks (url, title, created_at, favicon, folder) VALUES (?, ?, ?, ?, ?)',
        [item.url, item.title, item.createdAt, item.favicon || null, item.folder || 'default']
      );
    } catch (error) {
      console.error('Failed to add bookmark:', error);
      throw error;
    }
  }

  async getBookmarks(folder?: string): Promise<BookmarkItem[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      let query = 'SELECT * FROM bookmarks';
      let params: any[] = [];

      if (folder && folder !== 'default') {
        query += ' WHERE folder = ?';
        params = [folder];
      }

      query += ' ORDER BY created_at DESC';

      const result = await this.db.getAllAsync(query, params);

      return result.map(row => ({
        id: (row as any).id,
        url: (row as any).url,
        title: (row as any).title,
        createdAt: (row as any).created_at,
        favicon: (row as any).favicon,
        folder: (row as any).folder,
      })) as BookmarkItem[];
    } catch (error) {
      console.error('Failed to get bookmarks:', error);
      return [];
    }
  }

  async removeBookmark(url: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.runAsync('DELETE FROM bookmarks WHERE url = ?', [url]);
    } catch (error) {
      console.error('Failed to remove bookmark:', error);
      throw error;
    }
  }

  async isBookmarked(url: string): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.db.getFirstAsync(
        'SELECT id FROM bookmarks WHERE url = ?',
        [url]
      );
      return !!result;
    } catch (error) {
      console.error('Failed to check bookmark status:', error);
      return false;
    }
  }

  async getAllBookmarkFolders(): Promise<string[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.db.getAllAsync(
        'SELECT DISTINCT folder FROM bookmarks ORDER BY folder'
      );

      const folders = result.map(row => (row as any).folder).filter(Boolean);
      
      // Always include 'default' folder
      if (!folders.includes('default')) {
        folders.unshift('default');
      }

      return folders as string[];
    } catch (error) {
      console.error('Failed to get bookmark folders:', error);
      return ['default'];
    }
  }

  async searchBookmarks(query: string, limit: number = 50): Promise<BookmarkItem[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const result = await this.db.getAllAsync(`
        SELECT * FROM bookmarks 
        WHERE title LIKE ? OR url LIKE ? 
        ORDER BY created_at DESC 
        LIMIT ?
      `, [`%${query}%`, `%${query}%`, limit]);

      return result.map(row => ({
        id: (row as any).id,
        url: (row as any).url,
        title: (row as any).title,
        createdAt: (row as any).created_at,
        favicon: (row as any).favicon,
        folder: (row as any).folder,
      })) as BookmarkItem[];
    } catch (error) {
      console.error('Failed to search bookmarks:', error);
      return [];
    }
  }

  // Utility methods
  async clearAllData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.runAsync('DELETE FROM history');
      await this.db.runAsync('DELETE FROM bookmarks');
      console.log('All data cleared successfully');
    } catch (error) {
      console.error('Failed to clear all data:', error);
      throw error;
    }
  }

  async getStats(): Promise<{ historyCount: number; bookmarkCount: number }> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const historyResult = await this.db.getFirstAsync('SELECT COUNT(*) as count FROM history');
      const bookmarkResult = await this.db.getFirstAsync('SELECT COUNT(*) as count FROM bookmarks');

      return {
        historyCount: (historyResult as any)?.count || 0,
        bookmarkCount: (bookmarkResult as any)?.count || 0,
      };
    } catch (error) {
      console.error('Failed to get stats:', error);
      return { historyCount: 0, bookmarkCount: 0 };
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
    }
  }

  // Download Management Methods
  async createDownloadsTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS downloads (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        filename TEXT NOT NULL,
        fileSize INTEGER DEFAULT 0,
        downloadedSize INTEGER DEFAULT 0,
        status TEXT NOT NULL,
        startTime TEXT NOT NULL,
        endTime TEXT,
        localPath TEXT,
        mimeType TEXT,
        error TEXT,
        progress REAL DEFAULT 0,
        speed INTEGER DEFAULT 0,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    await this.db.execAsync(query);
    
    // Create index for faster queries
    await this.db.execAsync('CREATE INDEX IF NOT EXISTS idx_downloads_status ON downloads(status);');
    await this.db.execAsync('CREATE INDEX IF NOT EXISTS idx_downloads_startTime ON downloads(startTime);');
  }

  async saveDownload(download: any): Promise<void> {
    const query = `
      INSERT OR REPLACE INTO downloads (
        id, url, filename, fileSize, downloadedSize, status, startTime,
        endTime, localPath, mimeType, error, progress, speed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await this.db.runAsync(query, [
      download.id,
      download.url,
      download.filename,
      download.fileSize || 0,
      download.downloadedSize || 0,
      download.status,
      download.startTime,
      download.endTime || null,
      download.localPath || null,
      download.mimeType || null,
      download.error || null,
      download.progress || 0,
      download.speed || 0
    ]);
  }

  async getDownloads(): Promise<any[]> {
    const query = `
      SELECT * FROM downloads 
      ORDER BY startTime DESC
    `;
    
    const result = await this.db.getAllAsync(query);
    return result as any[];
  }

  async getDownload(id: string): Promise<any | null> {
    const query = 'SELECT * FROM downloads WHERE id = ?';
    const result = await this.db.getFirstAsync(query, [id]);
    return result as any || null;
  }

  async removeDownload(id: string): Promise<void> {
    const query = 'DELETE FROM downloads WHERE id = ?';
    await this.db.runAsync(query, [id]);
  }

  async getDownloadsByStatus(status: string): Promise<any[]> {
    const query = 'SELECT * FROM downloads WHERE status = ? ORDER BY startTime DESC';
    const result = await this.db.getAllAsync(query, [status]);
    return result as any[];
  }

  async clearCompletedDownloads(): Promise<void> {
    const query = 'DELETE FROM downloads WHERE status = ?';
    await this.db.runAsync(query, ['completed']);
  }

  async clearAllDownloads(): Promise<void> {
    const query = 'DELETE FROM downloads';
    await this.db.runAsync(query);
  }

  async getDownloadStats(): Promise<{
    total: number;
    completed: number;
    downloading: number;
    failed: number;
    totalSize: number;
    downloadedSize: number;
  }> {
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status IN ('downloading', 'pending') THEN 1 ELSE 0 END) as downloading,
        SUM(CASE WHEN status IN ('error', 'cancelled') THEN 1 ELSE 0 END) as failed,
        SUM(fileSize) as totalSize,
        SUM(downloadedSize) as downloadedSize
      FROM downloads
    `;
    
    const result = await this.db.getFirstAsync(statsQuery) as any;
    
    if (!result) {
      return {
        total: 0,
        completed: 0,
        downloading: 0,
        failed: 0,
        totalSize: 0,
        downloadedSize: 0,
      };
    }
    
    return {
      total: result.total || 0,
      completed: result.completed || 0,
      downloading: result.downloading || 0,
      failed: result.failed || 0,
      totalSize: result.totalSize || 0,
      downloadedSize: result.downloadedSize || 0,
    };
  }

  // User Script Management Methods
  async createUserScriptsTable(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const query = `
      CREATE TABLE IF NOT EXISTS user_scripts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        author TEXT,
        version TEXT,
        enabled INTEGER DEFAULT 1,
        code TEXT NOT NULL,
        includes TEXT NOT NULL,
        excludes TEXT DEFAULT '[]',
        grants TEXT DEFAULT '["none"]',
        runAt TEXT DEFAULT 'document-ready',
        updateUrl TEXT,
        downloadUrl TEXT,
        homepageUrl TEXT,
        supportUrl TEXT,
        installTime TEXT NOT NULL,
        lastUpdate TEXT,
        runCount INTEGER DEFAULT 0,
        isBuiltIn INTEGER DEFAULT 0,
        icon TEXT
      );
    `;
    
    await this.db.execAsync(query);
    
    // Create indexes for faster queries
    await this.db.execAsync('CREATE INDEX IF NOT EXISTS idx_user_scripts_enabled ON user_scripts(enabled);');
    await this.db.execAsync('CREATE INDEX IF NOT EXISTS idx_user_scripts_builtin ON user_scripts(isBuiltIn);');
  }

  async saveUserScript(script: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const query = `
      INSERT OR REPLACE INTO user_scripts (
        id, name, description, author, version, enabled, code, includes,
        excludes, grants, runAt, updateUrl, downloadUrl, homepageUrl,
        supportUrl, installTime, lastUpdate, runCount, isBuiltIn, icon
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await this.db.runAsync(query, [
      script.id,
      script.name,
      script.description || null,
      script.author || null,
      script.version || null,
      script.enabled ? 1 : 0,
      script.code,
      JSON.stringify(script.includes || []),
      JSON.stringify(script.excludes || []),
      JSON.stringify(script.grants || ['none']),
      script.runAt || 'document-ready',
      script.updateUrl || null,
      script.downloadUrl || null,
      script.homepageUrl || null,
      script.supportUrl || null,
      script.installTime,
      script.lastUpdate || null,
      script.runCount || 0,
      script.isBuiltIn ? 1 : 0,
      script.icon || null
    ]);
  }

  async getUserScripts(): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    const query = `
      SELECT * FROM user_scripts 
      ORDER BY isBuiltIn DESC, name ASC
    `;
    
    const result = await this.db.getAllAsync(query);
    
    return result.map((row: any) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      author: row.author,
      version: row.version,
      enabled: !!row.enabled,
      code: row.code,
      includes: JSON.parse(row.includes || '[]'),
      excludes: JSON.parse(row.excludes || '[]'),
      grants: JSON.parse(row.grants || '["none"]'),
      runAt: row.runAt,
      updateUrl: row.updateUrl,
      downloadUrl: row.downloadUrl,
      homepageUrl: row.homepageUrl,
      supportUrl: row.supportUrl,
      installTime: row.installTime,
      lastUpdate: row.lastUpdate,
      runCount: row.runCount || 0,
      isBuiltIn: !!row.isBuiltIn,
      icon: row.icon,
    }));
  }

  async getUserScript(id: string): Promise<any | null> {
    const query = 'SELECT * FROM user_scripts WHERE id = ?';
    const result = await this.db.getFirstAsync(query, [id]) as any;
    
    if (!result) return null;
    
    return {
      id: result.id,
      name: result.name,
      description: result.description,
      author: result.author,
      version: result.version,
      enabled: !!result.enabled,
      code: result.code,
      includes: JSON.parse(result.includes || '[]'),
      excludes: JSON.parse(result.excludes || '[]'),
      grants: JSON.parse(result.grants || '["none"]'),
      runAt: result.runAt,
      updateUrl: result.updateUrl,
      downloadUrl: result.downloadUrl,
      homepageUrl: result.homepageUrl,
      supportUrl: result.supportUrl,
      installTime: result.installTime,
      lastUpdate: result.lastUpdate,
      runCount: result.runCount || 0,
      isBuiltIn: !!result.isBuiltIn,
      icon: result.icon,
    };
  }

  async removeUserScript(id: string): Promise<void> {
    const query = 'DELETE FROM user_scripts WHERE id = ? AND isBuiltIn = 0';
    await this.db.runAsync(query, [id]);
  }

  async updateUserScriptRunCount(id: string): Promise<void> {
    const query = 'UPDATE user_scripts SET runCount = runCount + 1 WHERE id = ?';
    await this.db.runAsync(query, [id]);
  }

  async setUserScriptEnabled(id: string, enabled: boolean): Promise<void> {
    const query = 'UPDATE user_scripts SET enabled = ? WHERE id = ?';
    await this.db.runAsync(query, [enabled ? 1 : 0, id]);
  }

  async getUserScriptStats(): Promise<{
    total: number;
    enabled: number;
    builtIn: number;
    user: number;
    totalRuns: number;
  }> {
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN enabled = 1 THEN 1 ELSE 0 END) as enabled,
        SUM(CASE WHEN isBuiltIn = 1 THEN 1 ELSE 0 END) as builtIn,
        SUM(CASE WHEN isBuiltIn = 0 THEN 1 ELSE 0 END) as user,
        SUM(runCount) as totalRuns
      FROM user_scripts
    `;
    
    const result = await this.db.getFirstAsync(statsQuery) as any;
    
    if (!result) {
      return {
        total: 0,
        enabled: 0,
        builtIn: 0,
        user: 0,
        totalRuns: 0,
      };
    }
    
    return {
      total: result.total || 0,
      enabled: result.enabled || 0,
      builtIn: result.builtIn || 0,
      user: result.user || 0,
      totalRuns: result.totalRuns || 0,
    };
  }
}

export const databaseService = new DatabaseService(); 