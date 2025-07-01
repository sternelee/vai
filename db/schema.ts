import { sql } from 'drizzle-orm';
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// History table
export const history = sqliteTable('history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  url: text('url').notNull(),
  title: text('title').notNull(),
  visitedAt: text('visited_at').notNull(),
  favicon: text('favicon'),
});

// Bookmarks table
export const bookmarks = sqliteTable('bookmarks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  url: text('url').notNull().unique(),
  title: text('title').notNull(),
  createdAt: text('created_at').notNull(),
  favicon: text('favicon'),
  folder: text('folder').default('default'),
});

// Downloads table
export const downloads = sqliteTable('downloads', {
  id: text('id').primaryKey(),
  url: text('url').notNull(),
  filename: text('filename').notNull(),
  fileSize: integer('file_size').default(0),
  downloadedSize: integer('downloaded_size').default(0),
  status: text('status').notNull(),
  startTime: text('start_time').notNull(),
  endTime: text('end_time'),
  localPath: text('local_path'),
  mimeType: text('mime_type'),
  error: text('error'),
  progress: real('progress').default(0),
  speed: integer('speed').default(0),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// User Scripts table
export const userScripts = sqliteTable('user_scripts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  author: text('author'),
  version: text('version'),
  enabled: integer('enabled', { mode: 'boolean' }).default(true),
  code: text('code').notNull(),
  includes: text('includes').notNull(), // JSON string array
  excludes: text('excludes').default('[]'), // JSON string array
  grants: text('grants').default('["none"]'), // JSON string array
  runAt: text('run_at').default('document-ready'),
  updateUrl: text('update_url'),
  downloadUrl: text('download_url'),
  homepageUrl: text('homepage_url'),
  supportUrl: text('support_url'),
  installTime: text('install_time').notNull(),
  lastUpdate: text('last_update'),
  runCount: integer('run_count').default(0),
  isBuiltIn: integer('is_built_in', { mode: 'boolean' }).default(false),
  icon: text('icon'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Chat Messages table - compatible with @ai-sdk/react Message structure
export const chatMessages = sqliteTable('chat_messages', {
  id: text('id').primaryKey(),
  chatSessionId: text('chat_session_id').notNull(),
  role: text('role', { enum: ['user', 'assistant', 'system', 'tool'] }).notNull(),
  content: text('content').notNull(), // JSON string for complex content
  toolInvocations: text('tool_invocations'), // JSON string array for tool calls
  attachments: text('attachments'), // JSON string array for experimental_attachments
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

// Chat Sessions table for organizing conversations
export const chatSessions = sqliteTable('chat_sessions', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  pageUrl: text('page_url'),
  pageTitle: text('page_title'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
});

// Export types
export type HistoryItem = typeof history.$inferSelect;
export type NewHistoryItem = typeof history.$inferInsert;

export type BookmarkItem = typeof bookmarks.$inferSelect;
export type NewBookmarkItem = typeof bookmarks.$inferInsert;

export type DownloadItem = typeof downloads.$inferSelect;
export type NewDownloadItem = typeof downloads.$inferInsert;

export type UserScriptItem = typeof userScripts.$inferSelect;
export type NewUserScriptItem = typeof userScripts.$inferInsert;

export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;

export type ChatSession = typeof chatSessions.$inferSelect;
export type NewChatSession = typeof chatSessions.$inferInsert; 