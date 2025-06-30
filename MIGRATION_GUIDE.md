# 数据库迁移指南：从 expo-sqlite 到 @op-engineering/op-sqlite + Drizzle

## 概述

本项目已成功从 `expo-sqlite` 迁移到 `@op-engineering/op-sqlite` + Drizzle ORM。这次迁移带来了更好的性能、类型安全和开发体验。

## 主要更改

### 1. 依赖项更新

**移除的依赖：**
- `expo-sqlite` (~15.2.12)

**新增的依赖：**
- `@op-engineering/op-sqlite` (^14.1.1) - 更高性能的 SQLite 库
- `drizzle-orm` (^0.36.3) - 类型安全的 ORM
- `drizzle-kit` (^0.29.0) - 数据库迁移工具

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

**services/database/config.ts**
- 数据库连接配置
- Drizzle 实例初始化

**drizzle.config.ts**
- Drizzle Kit 配置文件
- 用于数据库迁移管理

### 4. 重写的文件

**services/DatabaseService.ts**
- 完全重写以使用 Drizzle ORM
- 保持了与原有接口的兼容性
- 改进了错误处理和类型安全

## 数据库表结构

迁移后的数据库包含以下表：

1. **history** - 浏览历史记录
2. **bookmarks** - 书签数据
3. **downloads** - 下载管理
4. **user_scripts** - 用户脚本

所有表结构保持不变，确保数据兼容性。

## 迁移的优势

### 性能提升
- `@op-engineering/op-sqlite` 提供了更好的性能
- 原生 C++ 实现，比 expo-sqlite 更快

### 类型安全
- Drizzle ORM 提供完整的 TypeScript 支持
- 编译时类型检查，减少运行时错误

### 开发体验
- 更好的 IDE 支持和自动补全
- 声明式的数据库操作
- 强大的查询构建器

### 数据库管理
- Drizzle Kit 提供专业的迁移管理
- Drizzle Studio 可视化数据库管理界面

## 使用方法

### 基本操作
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

### 数据库管理命令

```bash
# 生成迁移文件
npm run db:generate

# 执行迁移
npm run db:migrate

# 启动 Drizzle Studio
npm run db:studio
```

## 注意事项

1. **数据兼容性：** 现有数据库文件完全兼容，无需额外迁移操作
2. **API 兼容性：** `DatabaseService` 的公共接口保持不变
3. **依赖要求：** 需要 React Native 0.60+ 和 New Architecture 支持

## 故障排除

如果遇到问题，请检查：

1. 确保所有依赖项正确安装
2. 验证 app.json 配置正确
3. 检查数据库文件权限
4. 查看控制台错误信息

## 总结

这次迁移显著提升了项目的数据库性能和开发体验，同时保持了完整的向后兼容性。新的架构为未来的功能扩展提供了更好的基础。 