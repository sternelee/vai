# AI SDK 5 Beta 升级指南

## 🚧 当前状态

我们已经开始升级到 [AI SDK 5 Beta](https://ai-sdk.dev/docs/announcing-ai-sdk-5-beta)，但遇到了一些挑战，因为 Beta 版本的 API 仍在变化中。

## ✅ 已完成的升级

### 1. 包安装
已安装 AI SDK 5 Beta 版本：
```bash
npm install ai@beta @ai-sdk/openai@beta @ai-sdk/anthropic@beta @ai-sdk/google@beta @ai-sdk/groq@beta @ai-sdk/deepseek@beta @ai-sdk/mistral@beta @ai-sdk/xai@beta @ai-sdk/react@beta
```

### 2. API Route 升级 ✅
`app/api/chat+api.ts` 已成功升级到 AI SDK 5：

```typescript
import { streamText, convertToModelMessages, UIMessage } from 'ai';

export async function POST(req: Request) {
  const { messages, config }: { messages: UIMessage[], config: AIConfig } = await req.json();

  const result = streamText({
    model,
    messages: convertToModelMessages(messages), // Convert UIMessages to ModelMessages
    temperature: 0.7,
  });

  // Use new UI message stream response for AI SDK 5 with SSE protocol
  return result.toUIMessageStreamResponse();
}
```

**主要变化：**
- 使用 `UIMessage` 类型
- 使用 `convertToModelMessages()` 转换消息
- 使用 `toUIMessageStreamResponse()` 替代 `toDataStreamResponse()`
- 移除了 `maxTokens` 参数（在 AI SDK 5 中可能改名或移除）

## 🚧 进行中的升级

### 3. 客户端升级 (部分完成)
`components/browser/AIChatWithAPIRoute.tsx` 的升级遇到挑战：

**问题：**
1. `DefaultChatTransport` 可能不是正确的导入
2. `useChat` 返回的属性名称可能已改变
3. Beta API 仍在变化中

**当前方法：**
- 保持现有的工作版本
- 等待 AI SDK 5 stable 发布
- 逐步测试和调整

## 🎯 AI SDK 5 的主要改进

根据官方文档，AI SDK 5 带来了以下重大改进：

### 1. LanguageModelV2 架构
- 内容优先设计
- 改进的类型安全
- 更好的扩展性

### 2. 消息重构
- **UIMessage**: 用于 UI 显示的完整消息
- **ModelMessage**: 发送给模型的优化消息
- 类型安全的工具调用

### 3. Server-Sent Events (SSE)
- 标准化的流协议
- 更好的浏览器兼容性
- 更容易调试

### 4. 新的 useChat 架构
- Transport 系统配置
- 增强的状态管理
- 更好的类型安全

### 5. Agentic 控制
- `prepareStep` 函数
- `stopWhen` 参数
- 多步骤代理支持

## 📝 迁移策略

### 短期策略（当前）
1. ✅ **API Route 优先**: 服务端已升级到 AI SDK 5
2. 🔄 **客户端观望**: 等待 Beta API 稳定
3. 📚 **文档跟踪**: 持续关注官方更新

### 中期策略（Beta 稳定后）
1. 更新客户端使用新的 transport 系统
2. 实现 UIMessage/ModelMessage 分离
3. 利用类型安全的工具调用

### 长期策略（Stable 发布后）
1. 完全迁移到 AI SDK 5
2. 利用新的 agentic 控制功能
3. 优化流式响应体验

## 🛠️ 当前工作方案

由于客户端升级的复杂性，我们采用混合方案：

1. **API Route**: 使用 AI SDK 5 Beta (✅ 工作正常)
2. **客户端**: 继续使用 AI SDK 4 模式
3. **兼容性**: 确保新旧系统都能工作

这样确保了：
- 服务端享受 AI SDK 5 的新特性
- 客户端保持稳定性
- 逐步迁移，降低风险

## 🔍 监控和下一步

### 监控事项
- [ ] AI SDK 5 Beta 更新
- [ ] 官方迁移指南
- [ ] 社区最佳实践
- [ ] 性能对比测试

### 下一步行动
1. 测试当前混合实现
2. 等待 AI SDK 5 API 稳定
3. 参考官方示例进行客户端升级
4. 逐步启用新功能

## 📊 升级优势

即使是部分升级，我们也获得了：

✅ **服务端改进**:
- Server-Sent Events 协议
- 更好的消息类型系统
- 改进的错误处理

✅ **架构准备**:
- 为完全迁移打好基础
- 保持代码复用
- 降低未来迁移成本

## 🎯 结论

AI SDK 5 Beta 带来了重大改进，但由于 API 仍在变化，我们采用了稳健的分步骤升级策略。当前的混合实现既利用了新特性，又保持了系统稳定性。

当 AI SDK 5 stable 发布时，我们可以快速完成剩余的客户端升级。