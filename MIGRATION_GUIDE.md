# 数据库迁移指南：从 expo-sqlite 到 @op-engineering/op-sqlite + Drizzle

## 概述

本项目已成功从 `expo-sqlite` 迁移到 `@op-engineering/op-sqlite` + Drizzle ORM，并实现了与 `@ai-sdk/react` 兼容的 Message 结构和 Markdown 富文本支持。这次迁移带来了更好的性能、类型安全和开发体验。

## 主要更改

### 1. 依赖项更新

**移除的依赖：**
- `expo-sqlite` (~15.2.12)

**新增的依赖：**
- `@op-engineering/op-sqlite` (^14.1.1) - 更高性能的 SQLite 库
- `drizzle-orm` (^0.36.3) - 类型安全的 ORM
- `drizzle-kit` (^0.29.0) - 数据库迁移工具
- `@ai-sdk/react` - AI SDK React 集成
- `react-native-markdown-display` - Markdown 渲染支持

### 2. 配置文件更新

**app.json**
- 移除了 `expo-sqlite` 插件配置

**package.json**
- 新增了数据库相关脚本：
  - `db:generate` - 生成迁移文件
  - `db:migrate` - 执行数据库迁移
  - `db:studio` - 启动 Drizzle Studio

### 3. 新增文件

**services/database/schema.ts**
- 定义了所有数据表的 Drizzle 模式
- 包含类型安全的表定义和类型导出
- 新增 AI Chat 相关表：`chat_sessions` 和 `chat_messages`

**services/database/config.ts**
- 数据库连接配置
- Drizzle 实例初始化

**drizzle.config.ts**
- Drizzle Kit 配置文件
- 用于数据库迁移管理

**types/chat.ts**
- 与 `@ai-sdk/react` 兼容的 Message 类型定义
- 聊天会话管理类型
- 支持工具调用和附件

**services/ChatService.ts**
- 聊天管理服务
- 整合 AI 服务和数据库服务
- 提供完整的聊天功能 API

### 4. 重写的文件

**services/DatabaseService.ts**
- 完全重写以使用 Drizzle ORM
- 保持了与原有接口的兼容性
- 改进了错误处理和类型安全
- 新增 AI Chat 相关方法

**components/browser/AIChatPanel.tsx**
- 使用新的 Message 结构
- 集成 Markdown 渲染支持
- 支持实时流式响应
- 持久化聊天记录

## 数据库表结构

迁移后的数据库包含以下表：

1. **history** - 浏览历史记录
2. **bookmarks** - 书签数据
3. **downloads** - 下载管理
4. **user_scripts** - 用户脚本
5. **chat_sessions** - AI 聊天会话 (新增)
6. **chat_messages** - AI 聊天消息 (新增)

所有原有表结构保持不变，确保数据兼容性。

## AI Chat 功能

### Message 结构
新的 Message 结构与 `@ai-sdk/react` 完全兼容：

```typescript
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | Array<TextPart | ImagePart>;
  toolInvocations?: Array<ToolInvocation>;
  experimental_attachments?: Array<Attachment>;
  createdAt?: Date;
}
```

### Markdown 支持
- 支持代码高亮
- 支持表格、列表、引用块
- 自适应深色/浅色主题
- 优化的排版样式

### 聊天功能特性
- 实时流式响应
- 聊天记录持久化
- 会话管理
- 上下文感知（基于当前页面）
- MCP 工具集成
- 智能标题生成

## 迁移的优势

### 性能提升
- `@op-engineering/op-sqlite` 提供了更好的性能
- 原生 C++ 实现，比 expo-sqlite 更快
- 支持并发操作

### 类型安全
- Drizzle ORM 提供完整的 TypeScript 支持
- 编译时类型检查，减少运行时错误
- 与 `@ai-sdk/react` 类型兼容

### 开发体验
- 更好的 IDE 支持和自动补全
- 声明式的数据库操作
- 强大的查询构建器
- Markdown 富文本支持

### 数据库管理
- Drizzle Kit 提供专业的迁移管理
- Drizzle Studio 可视化数据库管理界面
- 支持复杂查询和事务

## 使用方法

### 基本数据库操作
```typescript
import DatabaseService from './services/DatabaseService';

// 初始化数据库
await DatabaseService.initialize();

// 添加历史记录
await DatabaseService.addHistoryItem({
  url: 'https://example.com',
  title: 'Example',
  visitedAt: new Date().toISOString(),
});

// 获取历史记录
const history = await DatabaseService.getHistory(10);
```

### AI Chat 使用
```typescript
import { chatService } from './services/ChatService';
import type { Message } from './types/chat';

// 创建聊天会话
const sessionId = await chatService.createSession('Page Title', 'https://example.com');

// 发送消息
const { userMessage, responseStream, assistantMessageId } = await chatService.sendMessage(
  'Hello, can you help me?',
  sessionId,
  'Page context here'
);

// 处理流式响应
const reader = responseStream.getReader();
let fullResponse = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  fullResponse += value;
  // 更新 UI
}

// 保存助手消息
await chatService.saveAssistantMessage(sessionId, assistantMessageId, fullResponse);
```

### Markdown 渲染
```typescript
import Markdown from 'react-native-markdown-display';

const MarkdownMessage = ({ content }: { content: string }) => (
  <Markdown style={markdownStyles}>
    {content}
  </Markdown>
);
```

### 数据库管理命令

```bash
# 生成迁移文件
npm run db:generate

# 执行迁移
npm run db:migrate

# 启动 Drizzle Studio
npm run db:studio
```

## API 变更

### 新增 API

**ChatService:**
- `createSession(pageTitle, pageUrl)` - 创建聊天会话
- `sendMessage(content, sessionId, context)` - 发送消息
- `getMessages(sessionId)` - 获取消息列表
- `getSessions()` - 获取会话列表
- `clearHistory(sessionId)` - 清除聊天记录

**DatabaseService:**
- `createChatSession()` - 创建聊天会话
- `saveChatMessage()` - 保存聊天消息
- `getChatMessages()` - 获取聊天消息
- `getChatSessions()` - 获取聊天会话

### 类型定义
- `Message` - AI 聊天消息
- `ChatSessionInfo` - 聊天会话信息
- `ToolInvocation` - 工具调用
- `Attachment` - 消息附件

## 注意事项

1. **数据兼容性：** 现有数据库文件完全兼容，无需额外迁移操作
2. **API 兼容性：** `DatabaseService` 的公共接口保持不变
3. **依赖要求：** 需要 React Native 0.60+ 和 New Architecture 支持
4. **Chat 功能：** 需要配置 AI 服务才能使用聊天功能

## 故障排除

如果遇到问题，请检查：

1. 确保所有依赖项正确安装
2. 验证 app.json 配置正确
3. 检查数据库文件权限
4. 查看控制台错误信息
5. 确认 AI 服务配置正确

## 总结

这次迁移显著提升了项目的数据库性能和开发体验，同时添加了强大的 AI Chat 功能。新的架构为未来的功能扩展提供了更好的基础，特别是：

- **兼容性**：与 @ai-sdk/react 完全兼容的 Message 结构
- **富文本**：原生 Markdown 渲染支持
- **性能**：更快的数据库操作和流式响应
- **可扩展性**：支持工具调用和附件功能
- **持久化**：完整的聊天记录管理

迁移完成后，您的浏览器应用现在具备了企业级的 AI 聊天功能！🎉 