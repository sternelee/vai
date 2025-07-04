import AsyncStorage from '@react-native-async-storage/async-storage';
import { type Tool } from 'ai';

// Import all tool modules
import { discordTools } from '@/tools/discord';
import { exaTools } from '@/tools/exa-ai';
import { falTools } from '@/tools/fal';
import { giphyTools } from '@/tools/giphy';
import { githubTools } from '@/tools/github';
import { calculatorTools } from '@/tools/math';
import { perplexityTools } from '@/tools/perplexity';
import { replicateTools } from '@/tools/replicate';
import { telegramTools } from '@/tools/telegram';
import { vercelTools } from '@/tools/vercel';

export interface ToolConfig {
  type: 'github' | 'perplexity' | 'calculator' | 'discord' | 'telegram' | 'replicate' | 'fal' | 'exa' | 'giphy' | 'vercel';
  enabled: boolean;
  config?: Record<string, any>;
  excludeTools?: string[];
}

export interface BuiltinToolsConfig {
  tools: Record<string, ToolConfig>;
}

export interface ToolCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  requiresConfig: boolean;
  configFields?: {
    key: string;
    label: string;
    type: 'text' | 'password' | 'select' | 'boolean';
    required: boolean;
    placeholder?: string;
    options?: { value: string; label: string }[];
    description?: string;
  }[];
}

class BuiltinToolsService {
  private config: BuiltinToolsConfig = {
    tools: {}
  };
  
  private listeners: ((config: BuiltinToolsConfig) => void)[] = [];

  // Available tool categories
  private toolCategories: Record<string, ToolCategory> = {
    calculator: {
      id: 'calculator',
      name: '计算器工具',
      description: '数学计算、三角函数、对数等数学运算',
      icon: 'calculator',
      color: '#FF9500',
      requiresConfig: false,
    },
    github: {
      id: 'github',
      name: 'GitHub 工具',
      description: '仓库管理、Issue 跟踪、PR 处理等 GitHub 操作',
      icon: 'logo-github',
      color: '#24292e',
      requiresConfig: true,
      configFields: [
        {
          key: 'token',
          label: 'GitHub Token',
          type: 'password',
          required: true,
          placeholder: 'ghp_xxxxxxxxxxxxxxxxxxxx',
          description: '在 GitHub Settings > Developer settings > Personal access tokens 生成'
        },
        {
          key: 'baseUrl',
          label: 'GitHub Enterprise URL (可选)',
          type: 'text',
          required: false,
          placeholder: 'https://github.enterprise.com/api/v3',
          description: '如果使用 GitHub Enterprise，请填写 API 基础 URL'
        }
      ]
    },
    perplexity: {
      id: 'perplexity',
      name: 'Perplexity 搜索',
      description: '实时网络搜索和信息查询',
      icon: 'search',
      color: '#1D4ED8',
      requiresConfig: true,
      configFields: [
        {
          key: 'apiKey',
          label: 'Perplexity API Key',
          type: 'password',
          required: true,
          placeholder: 'pplx-xxxxxxxxxxxxxxxxxxxxxxxx',
          description: '在 Perplexity 控制台获取 API Key'
        },
        {
          key: 'model',
          label: '模型选择',
          type: 'select',
          required: false,
          options: [
            { value: 'sonar', label: 'Sonar (默认)' },
            { value: 'sonar-pro', label: 'Sonar Pro' },
            { value: 'sonar-reasoning', label: 'Sonar Reasoning' },
            { value: 'sonar-reasoning-pro', label: 'Sonar Reasoning Pro' }
          ],
          description: '选择使用的 Perplexity 模型'
        }
      ]
    },
    discord: {
      id: 'discord',
      name: 'Discord 工具',
      description: '发送消息、管理频道、机器人操作',
      icon: 'logo-discord',
      color: '#5865F2',
      requiresConfig: true,
      configFields: [
        {
          key: 'token',
          label: 'Discord Bot Token',
          type: 'password',
          required: true,
          placeholder: 'MTxxxxxxxxxxxxxxxxxxxxx.xxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxx',
          description: '在 Discord Developer Portal 获取 Bot Token'
        }
      ]
    },
         telegram: {
       id: 'telegram',
       name: 'Telegram 工具',
       description: '发送消息、文件传输、频道管理',
       icon: 'paper-plane',
       color: '#0088cc',
       requiresConfig: true,
       configFields: [
         {
           key: 'botToken',
           label: 'Telegram Bot Token',
           type: 'password',
           required: true,
           placeholder: '1234567890:AAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
           description: '通过 @BotFather 创建机器人并获取 Token'
         },
         {
           key: 'chatId',
           label: 'Chat ID',
           type: 'text',
           required: true,
           placeholder: '-1001234567890',
           description: '目标聊天、群组或频道的 ID'
         }
       ]
     },
         replicate: {
       id: 'replicate',
       name: 'Replicate AI',
       description: 'AI 模型推理、图像生成、文本处理',
       icon: 'sparkles',
       color: '#8B5CF6',
       requiresConfig: true,
       configFields: [
         {
           key: 'apiKey',
           label: 'Replicate API Key',
           type: 'password',
           required: true,
           placeholder: 'r8_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
           description: '在 Replicate 账户设置中获取 API Key'
         },
         {
           key: 'model',
           label: '模型选择',
           type: 'select',
           required: false,
           options: [
             { value: 'black-forest-labs/flux-1.1-pro', label: 'Flux 1.1 Pro (默认)' },
             { value: 'black-forest-labs/flux-dev', label: 'Flux Dev' },
             { value: 'black-forest-labs/flux-schnell', label: 'Flux Schnell' },
             { value: 'stability-ai/stable-diffusion-3.5-large', label: 'Stable Diffusion 3.5 Large' }
           ],
           description: '选择使用的 Replicate 模型'
         }
       ]
     },
    fal: {
      id: 'fal',
      name: 'Fal.ai 工具',
      description: '快速 AI 推理、图像生成、模型部署',
      icon: 'flash',
      color: '#F59E0B',
      requiresConfig: true,
      configFields: [
        {
          key: 'apiKey',
          label: 'Fal.ai API Key',
          type: 'password',
          required: true,
          placeholder: 'fal_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          description: '在 Fal.ai 控制台获取 API Key'
        }
      ]
    },
    exa: {
      id: 'exa',
      name: 'Exa 搜索',
      description: '高质量网络搜索和内容发现',
      icon: 'globe',
      color: '#10B981',
      requiresConfig: true,
      configFields: [
        {
          key: 'apiKey',
          label: 'Exa API Key',
          type: 'password',
          required: true,
          placeholder: 'exa_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          description: '在 Exa 控制台获取 API Key'
        }
      ]
    },
    giphy: {
      id: 'giphy',
      name: 'Giphy 工具',
      description: 'GIF 搜索、趋势内容、媒体管理',
      icon: 'play-circle',
      color: '#FF6B9D',
      requiresConfig: true,
      configFields: [
        {
          key: 'apiKey',
          label: 'Giphy API Key',
          type: 'password',
          required: true,
          placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          description: '在 Giphy Developers 获取 API Key'
        }
      ]
    },
    vercel: {
      id: 'vercel',
      name: 'Vercel 工具',
      description: '部署管理、项目配置、域名设置',
      icon: 'triangle',
      color: '#000000',
      requiresConfig: true,
      configFields: [
        {
          key: 'token',
          label: 'Vercel API Token',
          type: 'password',
          required: true,
          placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
          description: '在 Vercel 账户设置中生成 API Token'
        }
      ]
    }
  };

  async initialize(): Promise<void> {
    try {
      await this.loadConfig();
      console.log('内置工具服务已初始化');
    } catch (error) {
      console.error('内置工具服务初始化失败:', error);
      // Initialize with default config
      this.config = {
        tools: {
          calculator: { type: 'calculator', enabled: true }
        }
      };
    }
  }

  async loadConfig(): Promise<void> {
    try {
      const configStr = await AsyncStorage.getItem('builtin_tools_config');
      if (configStr) {
        this.config = JSON.parse(configStr);
      } else {
        // Default configuration - enable calculator by default
        this.config = {
          tools: {
            calculator: { type: 'calculator', enabled: true }
          }
        };
        await this.saveConfig();
      }
    } catch (error) {
      console.error('加载内置工具配置失败:', error);
      throw error;
    }
  }

  async saveConfig(): Promise<void> {
    try {
      await AsyncStorage.setItem('builtin_tools_config', JSON.stringify(this.config));
      this.notifyListeners();
    } catch (error) {
      console.error('保存内置工具配置失败:', error);
      throw error;
    }
  }

  // Tool management
  async enableTool(toolId: string, config?: Record<string, any>): Promise<void> {
    const category = this.toolCategories[toolId];
    if (!category) {
      throw new Error(`未知的工具类型: ${toolId}`);
    }

    this.config.tools[toolId] = {
      type: toolId as any,
      enabled: true,
      config: config || {}
    };

    await this.saveConfig();
  }

  async disableTool(toolId: string): Promise<void> {
    if (this.config.tools[toolId]) {
      this.config.tools[toolId].enabled = false;
      await this.saveConfig();
    }
  }

  async updateToolConfig(toolId: string, config: Record<string, any>): Promise<void> {
    if (this.config.tools[toolId]) {
      this.config.tools[toolId].config = { ...this.config.tools[toolId].config, ...config };
      await this.saveConfig();
    }
  }

  async setToolExclusions(toolId: string, excludeTools: string[]): Promise<void> {
    if (this.config.tools[toolId]) {
      this.config.tools[toolId].excludeTools = excludeTools;
      await this.saveConfig();
    }
  }

  // Get available tools for AI integration
  async getAvailableTools(): Promise<Record<string, Tool>> {
    const allTools: Record<string, Tool> = {};

    for (const [toolId, toolConfig] of Object.entries(this.config.tools)) {
      if (!toolConfig.enabled) continue;

      try {
        const tools = await this.getToolsForCategory(toolId, toolConfig);
        Object.assign(allTools, tools);
      } catch (error) {
        console.error(`获取工具失败 ${toolId}:`, error);
      }
    }

    return allTools;
  }

  private async getToolsForCategory(toolId: string, toolConfig: ToolConfig): Promise<Record<string, Tool>> {
    const config = toolConfig.config || {};
    const excludeTools = toolConfig.excludeTools || [];

    switch (toolConfig.type) {
      case 'calculator':
        return calculatorTools({ excludeTools: excludeTools as any });

      case 'github':
        if (!config.token) {
          console.warn('GitHub 工具需要配置 token');
          return {};
        }
        return githubTools(
          { token: config.token, baseUrl: config.baseUrl },
          { excludeTools: excludeTools as any }
        );

      case 'perplexity':
        if (!config.apiKey) {
          console.warn('Perplexity 工具需要配置 apiKey');
          return {};
        }
        return perplexityTools(
          {
            apiKey: config.apiKey,
            model: config.model || 'sonar',
            maxTokens: config.maxTokens,
            systemPrompt: config.systemPrompt,
            temperature: config.temperature,
            topP: config.topP,
            frequencyPenalty: config.frequencyPenalty
          },
          { excludeTools: excludeTools as any }
        );

      case 'discord':
        if (!config.token) {
          console.warn('Discord 工具需要配置 token');
          return {};
        }
        return discordTools(
          { token: config.token },
          { excludeTools: excludeTools as any }
        );

      case 'telegram':
        if (!config.botToken || !config.chatId) {
          console.warn('Telegram 工具需要配置 botToken 和 chatId');
          return {};
        }
        return telegramTools(
          { botToken: config.botToken, chatId: config.chatId },
          { excludeTools: excludeTools as any }
        );

      case 'replicate':
        if (!config.apiKey) {
          console.warn('Replicate 工具需要配置 apiKey');
          return {};
        }
        return replicateTools(
          { apiKey: config.apiKey, model: config.model },
          { excludeTools: excludeTools as any }
        );

      case 'fal':
        if (!config.apiKey) {
          console.warn('Fal.ai 工具需要配置 apiKey');
          return {};
        }
        return falTools(
          { apiKey: config.apiKey },
          { excludeTools: excludeTools as any }
        );

      case 'exa':
        if (!config.apiKey) {
          console.warn('Exa 工具需要配置 apiKey');
          return {};
        }
        return exaTools(
          { apiKey: config.apiKey },
          { excludeTools: excludeTools as any }
        );

      case 'giphy':
        if (!config.apiKey) {
          console.warn('Giphy 工具需要配置 apiKey');
          return {};
        }
        return giphyTools(
          { apiKey: config.apiKey },
          { excludeTools: excludeTools as any }
        );

      case 'vercel':
        if (!config.token) {
          console.warn('Vercel 工具需要配置 token');
          return {};
        }
        return vercelTools(
          { token: config.token },
          { excludeTools: excludeTools as any }
        );

      default:
        console.warn(`未知的工具类型: ${toolConfig.type}`);
        return {};
    }
  }

  // Configuration management
  getConfig(): BuiltinToolsConfig {
    return { ...this.config };
  }

  getToolCategories(): Record<string, ToolCategory> {
    return { ...this.toolCategories };
  }

  getEnabledTools(): string[] {
    return Object.entries(this.config.tools)
      .filter(([_, config]) => config.enabled)
      .map(([toolId]) => toolId);
  }

  getToolConfig(toolId: string): ToolConfig | undefined {
    return this.config.tools[toolId];
  }

  isToolEnabled(toolId: string): boolean {
    return this.config.tools[toolId]?.enabled || false;
  }

  // Statistics
  getStatistics() {
    const enabledTools = this.getEnabledTools();
    const configuredTools = enabledTools.filter(toolId => {
      const category = this.toolCategories[toolId];
      const toolConfig = this.config.tools[toolId];
      
      if (!category.requiresConfig) return true;
      
      return category.configFields?.every(field => {
        if (!field.required) return true;
        return toolConfig.config && toolConfig.config[field.key];
      }) || false;
    });

    const toolsByCategory = Object.entries(this.toolCategories).map(([id, category]) => ({
      id,
      name: category.name,
      enabled: this.isToolEnabled(id),
      configured: configuredTools.includes(id),
      requiresConfig: category.requiresConfig
    }));

    return {
      totalCategories: Object.keys(this.toolCategories).length,
      enabledTools: enabledTools.length,
      configuredTools: configuredTools.length,
      toolsByCategory,
      healthStatus: configuredTools.length > 0 ? 'healthy' : 'needs_config'
    };
  }

  // Test tool configuration
  async testToolConnection(toolId: string): Promise<{
    success: boolean;
    error?: string;
    toolCount?: number;
  }> {
    try {
      const toolConfig = this.config.tools[toolId];
      if (!toolConfig || !toolConfig.enabled) {
        return { success: false, error: '工具未启用' };
      }

      const tools = await this.getToolsForCategory(toolId, toolConfig);
      const toolCount = Object.keys(tools).length;

      if (toolCount === 0) {
        return { success: false, error: '未找到可用工具' };
      }

      return { success: true, toolCount };
    } catch (error) {
      return { success: false, error: `连接测试失败: ${error}` };
    }
  }

  // Event listeners
  addConfigListener(listener: (config: BuiltinToolsConfig) => void): void {
    this.listeners.push(listener);
  }

  removeConfigListener(listener: (config: BuiltinToolsConfig) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.config);
      } catch (error) {
        console.error('配置监听器错误:', error);
      }
    });
  }

  // Cleanup
  async cleanup(): Promise<void> {
    this.listeners = [];
  }
}

export const builtinToolsService = new BuiltinToolsService();
export default builtinToolsService; 