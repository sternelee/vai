import { and, count, desc, eq, sql } from "drizzle-orm";
import type { ChatSessionInfo, Message } from "../types/chat";
import { database, sqlite } from "../db/drizzle";
import {
  bookmarks,
  chatMessages,
  chatSessions,
  downloads,
  history,
  userScripts,
} from "../db/schema";

// Legacy interfaces for backward compatibility
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
  private initialized = false;

  async initialize(): Promise<void> {
    try {
      // Create tables using Drizzle migrations or direct SQL if needed
      await this.createTables();

      this.initialized = true;
      console.log("Database initialized successfully with Drizzle ORM");
    } catch (error) {
      console.error("Failed to initialize database:", error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    try {
      // Create tables using raw SQL for initial setup
      await database.run(
        `
        CREATE TABLE IF NOT EXISTS history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          url TEXT NOT NULL,
          title TEXT NOT NULL,
          visited_at TEXT NOT NULL,
          favicon TEXT
        )
      `,
      );

      await database.run(`
        CREATE TABLE IF NOT EXISTS bookmarks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          url TEXT NOT NULL UNIQUE,
          title TEXT NOT NULL,
          created_at TEXT NOT NULL,
          favicon TEXT,
          folder TEXT DEFAULT 'default'
        )
      `);

      await database.run(`
        CREATE TABLE IF NOT EXISTS downloads (
          id TEXT PRIMARY KEY,
          url TEXT NOT NULL,
          filename TEXT NOT NULL,
          file_size INTEGER DEFAULT 0,
          downloaded_size INTEGER DEFAULT 0,
          status TEXT NOT NULL,
          start_time TEXT NOT NULL,
          end_time TEXT,
          local_path TEXT,
          mime_type TEXT,
          error TEXT,
          progress REAL DEFAULT 0,
          speed INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await database.run(`
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
          run_at TEXT DEFAULT 'document-ready',
          update_url TEXT,
          download_url TEXT,
          homepage_url TEXT,
          support_url TEXT,
          install_time TEXT NOT NULL,
          last_update TEXT,
          run_count INTEGER DEFAULT 0,
          is_built_in INTEGER DEFAULT 0,
          icon TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create chat-related tables
      await database.run(`
        CREATE TABLE IF NOT EXISTS chat_sessions (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          page_url TEXT,
          page_title TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          is_active INTEGER DEFAULT 1
        )
      `);

      await database.run(`
        CREATE TABLE IF NOT EXISTS chat_messages (
          id TEXT PRIMARY KEY,
          chat_session_id TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
          content TEXT NOT NULL,
          tool_invocations TEXT,
          attachments TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (chat_session_id) REFERENCES chat_sessions (id) ON DELETE CASCADE
        )
      `);

      // Create indexes
      await database.run(
        `CREATE INDEX IF NOT EXISTS idx_history_url ON history(url)`,
      );
      await database.run(
        `CREATE INDEX IF NOT EXISTS idx_history_visited_at ON history(visited_at)`,
      );
      await database.run(
        `CREATE INDEX IF NOT EXISTS idx_bookmarks_url ON bookmarks(url)`,
      );
      await database.run(
        `CREATE INDEX IF NOT EXISTS idx_bookmarks_folder ON bookmarks(folder)`,
      );
      await database.run(
        `CREATE INDEX IF NOT EXISTS idx_downloads_status ON downloads(status)`,
      );
      await database.run(
        `CREATE INDEX IF NOT EXISTS idx_downloads_start_time ON downloads(start_time)`,
      );

      // Chat indexes
      await database.run(
        `CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(chat_session_id)`,
      );
      await database.run(
        `CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at)`,
      );
      await database.run(
        `CREATE INDEX IF NOT EXISTS idx_chat_sessions_is_active ON chat_sessions(is_active)`,
      );
      await database.run(
        `CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at ON chat_sessions(updated_at)`,
      );
    } catch (error) {
      console.error("Failed to create tables:", error);
      throw error;
    }
  }

  // History methods
  async addHistoryItem(item: HistoryItem): Promise<void> {
    if (!this.initialized) throw new Error("Database not initialized");

    try {
      // Check if URL already exists in recent history (last 24 hours)
      const existing = await database
        .select({ id: history.id })
        .from(history)
        .where(
          and(
            eq(history.url, item.url),
            sql`visited_at > datetime('now', '-1 day')`,
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        // Update the existing entry's timestamp
        await database
          .update(history)
          .set({
            visitedAt: item.visitedAt,
            title: item.title,
          })
          .where(eq(history.url, item.url));
      } else {
        // Insert new entry
        await database.insert(history).values({
          url: item.url,
          title: item.title,
          visitedAt: item.visitedAt,
          favicon: item.favicon || null,
        });
      }

      // Keep only the last 1000 history items
      const oldestItems = await database
        .select({ id: history.id })
        .from(history)
        .orderBy(desc(history.visitedAt))
        .offset(1000);

      if (oldestItems.length > 0) {
        const idsToDelete = oldestItems.map((item) => item.id);
        await database
          .delete(history)
          .where(sql`id NOT IN (${sql.join(idsToDelete)})`);
      }
    } catch (error) {
      console.error("Failed to add history item:", error);
      throw error;
    }
  }

  async getHistory(limit: number = 100): Promise<HistoryItem[]> {
    if (!this.initialized) throw new Error("Database not initialized");

    try {
      const result = await database
        .select()
        .from(history)
        .orderBy(desc(history.visitedAt))
        .limit(limit);

      return result.map((row) => ({
        id: row.id,
        url: row.url,
        title: row.title,
        visitedAt: row.visitedAt,
        favicon: row.favicon || undefined,
      }));
    } catch (error) {
      console.error("Failed to get history:", error);
      return [];
    }
  }

  async searchHistory(
    query: string,
    limit: number = 50,
  ): Promise<HistoryItem[]> {
    if (!this.initialized) throw new Error("Database not initialized");

    try {
      const result = await database
        .select()
        .from(history)
        .where(
          sql`title LIKE ${"%" + query + "%"} OR url LIKE ${"%" + query + "%"}`,
        )
        .orderBy(desc(history.visitedAt))
        .limit(limit);

      return result.map((row) => ({
        id: row.id,
        url: row.url,
        title: row.title,
        visitedAt: row.visitedAt,
        favicon: row.favicon || undefined,
      }));
    } catch (error) {
      console.error("Failed to search history:", error);
      return [];
    }
  }

  async clearHistory(): Promise<void> {
    if (!this.initialized) throw new Error("Database not initialized");

    try {
      await database.delete(history);
      console.log("History cleared successfully");
    } catch (error) {
      console.error("Failed to clear history:", error);
      throw error;
    }
  }

  async deleteHistoryItem(id: number): Promise<void> {
    if (!this.initialized) throw new Error("Database not initialized");

    try {
      await database.delete(history).where(eq(history.id, id));
    } catch (error) {
      console.error("Failed to delete history item:", error);
      throw error;
    }
  }

  // Bookmark methods
  async addBookmark(item: BookmarkItem): Promise<void> {
    if (!this.initialized) throw new Error("Database not initialized");

    try {
      // Check if bookmark already exists
      const existing = await database
        .select({ id: bookmarks.id })
        .from(bookmarks)
        .where(eq(bookmarks.url, item.url))
        .limit(1);

      if (existing.length > 0) {
        // Update existing bookmark
        await database
          .update(bookmarks)
          .set({
            title: item.title,
            favicon: item.favicon || null,
            folder: item.folder || "default",
          })
          .where(eq(bookmarks.url, item.url));
      } else {
        // Insert new bookmark
        await database.insert(bookmarks).values({
          url: item.url,
          title: item.title,
          createdAt: item.createdAt,
          favicon: item.favicon || null,
          folder: item.folder || "default",
        });
      }
    } catch (error) {
      console.error("Failed to add bookmark:", error);
      throw error;
    }
  }

  async getBookmarks(folder?: string): Promise<BookmarkItem[]> {
    if (!this.initialized) throw new Error("Database not initialized");

    try {
      let result;

      if (folder && folder !== "default") {
        result = await database
          .select()
          .from(bookmarks)
          .where(eq(bookmarks.folder, folder))
          .orderBy(desc(bookmarks.createdAt));
      } else {
        result = await database
          .select()
          .from(bookmarks)
          .orderBy(desc(bookmarks.createdAt));
      }

      return result.map((row) => ({
        id: row.id,
        url: row.url,
        title: row.title,
        createdAt: row.createdAt,
        favicon: row.favicon || undefined,
        folder: row.folder || undefined,
      }));
    } catch (error) {
      console.error("Failed to get bookmarks:", error);
      return [];
    }
  }

  async removeBookmark(url: string): Promise<void> {
    if (!this.initialized) throw new Error("Database not initialized");

    try {
      await database.delete(bookmarks).where(eq(bookmarks.url, url));
    } catch (error) {
      console.error("Failed to remove bookmark:", error);
      throw error;
    }
  }

  async isBookmarked(url: string): Promise<boolean> {
    if (!this.initialized) throw new Error("Database not initialized");

    try {
      const result = await database
        .select({ id: bookmarks.id })
        .from(bookmarks)
        .where(eq(bookmarks.url, url))
        .limit(1);

      return result.length > 0;
    } catch (error) {
      console.error("Failed to check bookmark status:", error);
      return false;
    }
  }

  async getAllBookmarkFolders(): Promise<string[]> {
    if (!this.initialized) throw new Error("Database not initialized");

    try {
      const result = await database
        .selectDistinct({ folder: bookmarks.folder })
        .from(bookmarks)
        .orderBy(bookmarks.folder);

      const folders = result.map((row) => row.folder).filter(Boolean);

      // Always include 'default' folder
      if (!folders.includes("default")) {
        folders.unshift("default");
      }

      return folders as string[];
    } catch (error) {
      console.error("Failed to get bookmark folders:", error);
      return ["default"];
    }
  }

  async searchBookmarks(
    query: string,
    limit: number = 50,
  ): Promise<BookmarkItem[]> {
    if (!this.initialized) throw new Error("Database not initialized");

    try {
      const result = await database
        .select()
        .from(bookmarks)
        .where(
          sql`title LIKE ${"%" + query + "%"} OR url LIKE ${"%" + query + "%"}`,
        )
        .orderBy(desc(bookmarks.createdAt))
        .limit(limit);

      return result.map((row) => ({
        id: row.id,
        url: row.url,
        title: row.title,
        createdAt: row.createdAt,
        favicon: row.favicon || undefined,
        folder: row.folder || undefined,
      }));
    } catch (error) {
      console.error("Failed to search bookmarks:", error);
      return [];
    }
  }

  // Utility methods
  async clearAllData(): Promise<void> {
    if (!this.initialized) throw new Error("Database not initialized");

    try {
      await database.delete(history);
      await database.delete(bookmarks);
      console.log("All data cleared successfully");
    } catch (error) {
      console.error("Failed to clear all data:", error);
    }
  }

  async getStats(): Promise<{ historyCount: number; bookmarkCount: number }> {
    if (!this.initialized) throw new Error("Database not initialized");

    try {
      const [historyResult] = await database
        .select({ count: count() })
        .from(history);

      const [bookmarkResult] = await database
        .select({ count: count() })
        .from(bookmarks);

      return {
        historyCount: historyResult?.count || 0,
        bookmarkCount: bookmarkResult?.count || 0,
      };
    } catch (error) {
      console.error("Failed to get stats:", error);
      return { historyCount: 0, bookmarkCount: 0 };
    }
  }

  async close(): Promise<void> {
    // Note: op-sqlite doesn't require explicit closing like expo-sqlite
    this.initialized = false;
  }

  // Download Management Methods
  async createDownloadsTable(): Promise<void> {
    // Table creation is handled in createTables()
  }

  async saveDownload(download: any): Promise<void> {
    if (!this.initialized) throw new Error("Database not initialized");

    try {
      // Check if download already exists
      const existing = await database
        .select({ id: downloads.id })
        .from(downloads)
        .where(eq(downloads.id, download.id))
        .limit(1);

      if (existing.length > 0) {
        // Update existing download
        await database
          .update(downloads)
          .set({
            fileSize: download.fileSize || 0,
            downloadedSize: download.downloadedSize || 0,
            status: download.status,
            endTime: download.endTime || null,
            localPath: download.localPath || null,
            error: download.error || null,
            progress: download.progress || 0,
            speed: download.speed || 0,
          })
          .where(eq(downloads.id, download.id));
      } else {
        // Insert new download
        await database.insert(downloads).values({
          id: download.id,
          url: download.url,
          filename: download.filename,
          fileSize: download.fileSize || 0,
          downloadedSize: download.downloadedSize || 0,
          status: download.status,
          startTime: download.startTime,
          endTime: download.endTime || null,
          localPath: download.localPath || null,
          mimeType: download.mimeType || null,
          error: download.error || null,
          progress: download.progress || 0,
          speed: download.speed || 0,
        });
      }
    } catch (error) {
      console.error("Failed to save download:", error);
      throw error;
    }
  }

  async getDownloads(): Promise<any[]> {
    if (!this.initialized) throw new Error("Database not initialized");

    try {
      const result = await database
        .select()
        .from(downloads)
        .orderBy(desc(downloads.startTime));

      return result;
    } catch (error) {
      console.error("Failed to get downloads:", error);
      return [];
    }
  }

  async getDownload(id: string): Promise<any | null> {
    if (!this.initialized) throw new Error("Database not initialized");

    try {
      const result = await database
        .select()
        .from(downloads)
        .where(eq(downloads.id, id))
        .limit(1);

      return result[0] || null;
    } catch (error) {
      console.error("Failed to get download:", error);
      return null;
    }
  }

  async removeDownload(id: string): Promise<void> {
    if (!this.initialized) throw new Error("Database not initialized");

    try {
      await database.delete(downloads).where(eq(downloads.id, id));
    } catch (error) {
      console.error("Failed to remove download:", error);
      throw error;
    }
  }

  async getDownloadsByStatus(status: string): Promise<any[]> {
    if (!this.initialized) throw new Error("Database not initialized");

    try {
      const result = await database
        .select()
        .from(downloads)
        .where(eq(downloads.status, status))
        .orderBy(desc(downloads.startTime));

      return result;
    } catch (error) {
      console.error("Failed to get downloads by status:", error);
      return [];
    }
  }

  async clearCompletedDownloads(): Promise<void> {
    if (!this.initialized) throw new Error("Database not initialized");

    try {
      await database.delete(downloads).where(eq(downloads.status, "completed"));
    } catch (error) {
      console.error("Failed to clear completed downloads:", error);
      throw error;
    }
  }

  async clearAllDownloads(): Promise<void> {
    if (!this.initialized) throw new Error("Database not initialized");

    try {
      await database.delete(downloads);
    } catch (error) {
      console.error("Failed to clear all downloads:", error);
      throw error;
    }
  }

  async getDownloadStats(): Promise<{
    total: number;
    completed: number;
    downloading: number;
    failed: number;
    totalSize: number;
    downloadedSize: number;
  }> {
    if (!this.initialized) throw new Error("Database not initialized");

    try {
      const [result] = await database
        .select({
          total: count(),
          completed: sql<number>`SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)`,
          downloading: sql<number>`SUM(CASE WHEN status IN ('downloading', 'pending') THEN 1 ELSE 0 END)`,
          failed: sql<number>`SUM(CASE WHEN status IN ('error', 'cancelled') THEN 1 ELSE 0 END)`,
          totalSize: sql<number>`SUM(file_size)`,
          downloadedSize: sql<number>`SUM(downloaded_size)`,
        })
        .from(downloads);

      return {
        total: result?.total || 0,
        completed: result?.completed || 0,
        downloading: result?.downloading || 0,
        failed: result?.failed || 0,
        totalSize: result?.totalSize || 0,
        downloadedSize: result?.downloadedSize || 0,
      };
    } catch (error) {
      console.error("Failed to get download stats:", error);
      return {
        total: 0,
        completed: 0,
        downloading: 0,
        failed: 0,
        totalSize: 0,
        downloadedSize: 0,
      };
    }
  }

  // User Script Management Methods
  async createUserScriptsTable(): Promise<void> {
    // Table creation is handled in createTables()
  }

  async saveUserScript(script: any): Promise<void> {
    if (!this.initialized) throw new Error("Database not initialized");

    try {
      // Check if script already exists
      const existing = await database
        .select({ id: userScripts.id })
        .from(userScripts)
        .where(eq(userScripts.id, script.id))
        .limit(1);

      if (existing.length > 0) {
        // Update existing script
        await database
          .update(userScripts)
          .set({
            name: script.name,
            description: script.description || null,
            author: script.author || null,
            version: script.version || null,
            enabled: script.enabled !== false,
            code: script.code,
            includes: script.includes,
            excludes: script.excludes || "[]",
            grants: script.grants || '["none"]',
            runAt: script.runAt || "document-ready",
            updateUrl: script.updateUrl || null,
            downloadUrl: script.downloadUrl || null,
            homepageUrl: script.homepageUrl || null,
            supportUrl: script.supportUrl || null,
            lastUpdate: script.lastUpdate || null,
            runCount: script.runCount || 0,
            isBuiltIn: script.isBuiltIn || false,
            icon: script.icon || null,
          })
          .where(eq(userScripts.id, script.id));
      } else {
        // Insert new script
        await database.insert(userScripts).values({
          id: script.id,
          name: script.name,
          description: script.description || null,
          author: script.author || null,
          version: script.version || null,
          enabled: script.enabled !== false,
          code: script.code,
          includes: script.includes,
          excludes: script.excludes || "[]",
          grants: script.grants || '["none"]',
          runAt: script.runAt || "document-ready",
          updateUrl: script.updateUrl || null,
          downloadUrl: script.downloadUrl || null,
          homepageUrl: script.homepageUrl || null,
          supportUrl: script.supportUrl || null,
          installTime: script.installTime,
          lastUpdate: script.lastUpdate || null,
          runCount: script.runCount || 0,
          isBuiltIn: script.isBuiltIn || false,
          icon: script.icon || null,
        });
      }
    } catch (error) {
      console.error("Failed to save user script:", error);
      throw error;
    }
  }

  async getUserScripts(): Promise<any[]> {
    if (!this.initialized) throw new Error("Database not initialized");

    try {
      const result = await database
        .select()
        .from(userScripts)
        .orderBy(userScripts.name);

      return result.map((row) => ({
        ...row,
        enabled: Boolean(row.enabled),
        isBuiltIn: Boolean(row.isBuiltIn),
        includes: JSON.parse(row.includes),
        excludes: JSON.parse(row.excludes || "[]"),
        grants: JSON.parse(row.grants || '["none"]'),
      }));
    } catch (error) {
      console.error("Failed to get user scripts:", error);
      return [];
    }
  }

  async getUserScript(id: string): Promise<any | null> {
    if (!this.initialized) throw new Error("Database not initialized");

    try {
      const result = await database
        .select()
        .from(userScripts)
        .where(eq(userScripts.id, id))
        .limit(1);

      if (result.length === 0) return null;

      const row = result[0];
      return {
        ...row,
        enabled: Boolean(row.enabled),
        isBuiltIn: Boolean(row.isBuiltIn),
        includes: JSON.parse(row.includes),
        excludes: JSON.parse(row.excludes || "[]"),
        grants: JSON.parse(row.grants || '["none"]'),
      };
    } catch (error) {
      console.error("Failed to get user script:", error);
      return null;
    }
  }

  async removeUserScript(id: string): Promise<void> {
    if (!this.initialized) throw new Error("Database not initialized");

    try {
      await database.delete(userScripts).where(eq(userScripts.id, id));
    } catch (error) {
      console.error("Failed to remove user script:", error);
      throw error;
    }
  }

  async updateUserScriptRunCount(id: string): Promise<void> {
    if (!this.initialized) throw new Error("Database not initialized");

    try {
      await database
        .update(userScripts)
        .set({ runCount: sql`run_count + 1` })
        .where(eq(userScripts.id, id));
    } catch (error) {
      console.error("Failed to update user script run count:", error);
      throw error;
    }
  }

  async setUserScriptEnabled(id: string, enabled: boolean): Promise<void> {
    if (!this.initialized) throw new Error("Database not initialized");

    try {
      await database
        .update(userScripts)
        .set({ enabled })
        .where(eq(userScripts.id, id));
    } catch (error) {
      console.error("Failed to set user script enabled status:", error);
      throw error;
    }
  }

  async getUserScriptStats(): Promise<{
    total: number;
    enabled: number;
    builtIn: number;
    user: number;
    totalRuns: number;
  }> {
    if (!this.initialized) throw new Error("Database not initialized");

    try {
      const [result] = await database
        .select({
          total: count(),
          enabled: sql<number>`SUM(CASE WHEN enabled = 1 THEN 1 ELSE 0 END)`,
          builtIn: sql<number>`SUM(CASE WHEN is_built_in = 1 THEN 1 ELSE 0 END)`,
          user: sql<number>`SUM(CASE WHEN is_built_in = 0 THEN 1 ELSE 0 END)`,
          totalRuns: sql<number>`SUM(run_count)`,
        })
        .from(userScripts);

      return {
        total: result?.total || 0,
        enabled: result?.enabled || 0,
        builtIn: result?.builtIn || 0,
        user: result?.user || 0,
        totalRuns: result?.totalRuns || 0,
      };
    } catch (error) {
      console.error("Failed to get user script stats:", error);
      return {
        total: 0,
        enabled: 0,
        builtIn: 0,
        user: 0,
        totalRuns: 0,
      };
    }
  }

  // Chat Management Methods
  async createChatSession(
    pageTitle: string,
    pageUrl?: string,
  ): Promise<string> {
    if (!this.initialized) throw new Error("Database not initialized");

    try {
      const sessionId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      await database.insert(chatSessions).values({
        id: sessionId,
        title: pageTitle,
        pageUrl: pageUrl || null,
        pageTitle: pageTitle,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
      });

      return sessionId;
    } catch (error) {
      console.error("Failed to create chat session:", error);
      throw error;
    }
  }

  async saveChatMessage(message: Message, sessionId: string): Promise<void> {
    if (!this.initialized) throw new Error("Database not initialized");

    try {
      const content =
        typeof message.content === "string"
          ? message.content
          : JSON.stringify(message.content);

      await database.insert(chatMessages).values({
        id: message.id,
        chatSessionId: sessionId,
        role: message.role,
        content,
        toolInvocations: message.toolInvocations
          ? JSON.stringify(message.toolInvocations)
          : null,
        attachments: message.experimental_attachments
          ? JSON.stringify(message.experimental_attachments)
          : null,
        createdAt: message.createdAt
          ? message.createdAt.toISOString()
          : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Update session timestamp
      await database
        .update(chatSessions)
        .set({ updatedAt: new Date().toISOString() })
        .where(eq(chatSessions.id, sessionId));
    } catch (error) {
      console.error("Failed to save chat message:", error);
      throw error;
    }
  }

  async getChatMessages(
    sessionId: string,
    limit: number = 100,
  ): Promise<Message[]> {
    if (!this.initialized) throw new Error("Database not initialized");

    try {
      const result = await database
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.chatSessionId, sessionId))
        .orderBy(chatMessages.createdAt)
        .limit(limit);

      return result.map((row) => {
        let content: string | any[];
        try {
          // Try to parse as JSON for complex content
          content = JSON.parse(row.content);
        } catch {
          // Fallback to string content
          content = row.content;
        }

        const message: Message = {
          id: row.id,
          role: row.role as any,
          content,
          createdAt: new Date(row.createdAt || new Date().toISOString()),
        };

        if (row.toolInvocations) {
          try {
            message.toolInvocations = JSON.parse(row.toolInvocations);
          } catch (e) {
            console.warn("Failed to parse tool invocations:", e);
          }
        }

        if (row.attachments) {
          try {
            message.experimental_attachments = JSON.parse(row.attachments);
          } catch (e) {
            console.warn("Failed to parse attachments:", e);
          }
        }

        return message;
      });
    } catch (error) {
      console.error("Failed to get chat messages:", error);
      return [];
    }
  }

  async getChatSessions(limit: number = 50): Promise<ChatSessionInfo[]> {
    if (!this.initialized) throw new Error("Database not initialized");

    try {
      // Get sessions with message count and last message
      const result = await database
        .select({
          id: chatSessions.id,
          title: chatSessions.title,
          pageUrl: chatSessions.pageUrl,
          pageTitle: chatSessions.pageTitle,
          createdAt: chatSessions.createdAt,
          updatedAt: chatSessions.updatedAt,
          isActive: chatSessions.isActive,
          messageCount: sql<number>`(
            SELECT COUNT(*) FROM chat_messages
            WHERE chat_session_id = chat_sessions.id
          )`,
          lastMessage: sql<string>`(
            SELECT content FROM chat_messages
            WHERE chat_session_id = chat_sessions.id
            ORDER BY created_at DESC
            LIMIT 1
          )`,
        })
        .from(chatSessions)
        .where(eq(chatSessions.isActive, true))
        .orderBy(desc(chatSessions.updatedAt))
        .limit(limit);

      return result.map((row) => ({
        id: row.id,
        title: row.title,
        pageUrl: row.pageUrl || undefined,
        pageTitle: row.pageTitle || undefined,
        createdAt: new Date(row.createdAt || new Date().toISOString()),
        updatedAt: new Date(row.updatedAt || new Date().toISOString()),
        isActive: Boolean(row.isActive),
        messageCount: row.messageCount || 0,
        lastMessage: row.lastMessage || undefined,
      }));
    } catch (error) {
      console.error("Failed to get chat sessions:", error);
      return [];
    }
  }

  async deleteChatSession(sessionId: string): Promise<void> {
    if (!this.initialized) throw new Error("Database not initialized");

    try {
      // Delete messages first (though CASCADE should handle this)
      await database
        .delete(chatMessages)
        .where(eq(chatMessages.chatSessionId, sessionId));

      // Delete session
      await database.delete(chatSessions).where(eq(chatSessions.id, sessionId));
    } catch (error) {
      console.error("Failed to delete chat session:", error);
      throw error;
    }
  }

  async clearChatHistory(sessionId: string): Promise<void> {
    if (!this.initialized) throw new Error("Database not initialized");

    try {
      await database
        .delete(chatMessages)
        .where(eq(chatMessages.chatSessionId, sessionId));

      // Update session timestamp
      await database
        .update(chatSessions)
        .set({ updatedAt: new Date().toISOString() })
        .where(eq(chatSessions.id, sessionId));
    } catch (error) {
      console.error("Failed to clear chat history:", error);
      throw error;
    }
  }

  async updateChatSessionTitle(
    sessionId: string,
    title: string,
  ): Promise<void> {
    if (!this.initialized) throw new Error("Database not initialized");

    try {
      await database
        .update(chatSessions)
        .set({
          title,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(chatSessions.id, sessionId));
    } catch (error) {
      console.error("Failed to update chat session title:", error);
      throw error;
    }
  }

  async getChatStats(): Promise<{
    totalSessions: number;
    totalMessages: number;
    activeSessions: number;
  }> {
    if (!this.initialized) throw new Error("Database not initialized");

    try {
      const [sessionStats] = await database
        .select({
          totalSessions: count(),
          activeSessions: sql<number>`SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END)`,
        })
        .from(chatSessions);

      const [messageStats] = await database
        .select({
          totalMessages: count(),
        })
        .from(chatMessages);

      return {
        totalSessions: sessionStats?.totalSessions || 0,
        totalMessages: messageStats?.totalMessages || 0,
        activeSessions: sessionStats?.activeSessions || 0,
      };
    } catch (error) {
      console.error("Failed to get chat stats:", error);
      return {
        totalSessions: 0,
        totalMessages: 0,
        activeSessions: 0,
      };
    }
  }
}

export default new DatabaseService();
