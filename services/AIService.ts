import { createAnthropic } from "@ai-sdk/anthropic";
import { createAzure } from "@ai-sdk/azure";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createMistral } from "@ai-sdk/mistral";
import { createOpenAI } from "@ai-sdk/openai";
import { createXai } from "@ai-sdk/xai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  convertToModelMessages,
  extractReasoningMiddleware,
  generateText,
  streamText,
  UIMessage,
} from "ai";
import { createZhipu } from "zhipu-ai-provider";
import { z } from "zod";
import { builtinToolsService } from "./BuiltinToolsService";
import { mcpService } from "./MCPService";

class AIError extends Error {
  constructor(
    message: string,
    public originalError?: Error,
  ) {
    super(message);
    this.name = "AIError";
  }
}

export enum Provider {
  OpenAI = "openai",
  Anthropic = "anthropic",
  Groq = "groq",
  XAI = "xai",
  DeepSeek = "deepseek",
  Zhipu = "zhipu",
  Azure = "azure",
  OpenRouter = "openrouter",
  AzureOpenAI = "azure",
  Google = "google",
  SiliconFlow = "siliconflow",
  Mistral = "mistral",
  Cerebras = "cerebras",
}

export const ProviderMap = {
  [Provider.OpenAI]: {
    apiKey: "OPENAI_API_KEY",
    // baseURL: "https://api.openai.com/v1",
  },
  [Provider.Anthropic]: {
    apiKey: "ANTHROPIC_API_KEY",
    // baseURL: "https://api.anthropic.com/v1",
  },
  [Provider.Groq]: {
    apiKey: "GROQ_API_KEY",
    // baseURL: "https://api.groq.com/v1",
  },
  [Provider.XAI]: {
    apiKey: "XAI_API_KEY",
    // baseURL: "https://api.xai.com/v1",
  },
  [Provider.DeepSeek]: {
    apiKey: "DEEPSEEK_API_KEY",
    // baseURL: "https://api.deepseek.com/v1",
  },
  [Provider.Zhipu]: {
    apiKey: "ZHIPU_API_KEY",
    // baseURL: "https://api.zhipu.com/v1",
  },
  [Provider.OpenRouter]: {
    apiKey: "OPENROUTER_API_KEY",
    // baseURL: "https://openrouter.ai/api/v1",
  },
  [Provider.AzureOpenAI]: {
    apiKey: "AZURE_OPENAI_API_KEY",
    baseURL:
      "https://{resourceName}.openai.azure.com/openai/deployments/{modelId}{path}",
  },
  [Provider.Google]: {
    apiKey: "GOOGLE_API_KEY",
    baseURL: "https://generativelanguage.googleapis.com/v1beta",
  },
  [Provider.SiliconFlow]: {
    apiKey: "SILICONFLOW_API_KEY",
    baseURL: "https://api.siliconflow.cn/v1",
  },
};

export interface AIResponse {
  content: string;
  tokens?: number;
}

export interface WebPageSummary {
  title: string;
  summary: string;
  keyPoints: string[];
  readingTime: number;
  relevanceScore: number;
}

export interface SearchSuggestion {
  query: string;
  type: "search" | "url" | "history" | "bookmark";
  confidence: number;
}

// AI Provider configurations
export interface AIProvider {
  id: string;
  name: string;
  icon: string;
  description: string;
  models: AIModel[];
  requiresApiKey: boolean;
  configFields: ConfigField[];
}

export interface AIModel {
  id: string;
  name: string;
  description: string;
  capabilities: {
    imageInput?: boolean;
    objectGeneration?: boolean;
    toolUsage?: boolean;
    toolStreaming?: boolean;
    imageGeneration?: boolean;
  };
}

export interface ConfigField {
  key: string;
  label: string;
  type: "text" | "password" | "select" | "number";
  required: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
}

export interface AIConfig {
  provider: string;
  model: string;
  apiKey?: string;
  baseURL?: string;
  region?: string;
  projectId?: string;
  [key: string]: any;
}

const middleware = extractReasoningMiddleware({
  tagName: "think",
});

class AIService {
  private config: AIConfig | null = null;
  private providers: AIProvider[] = [
    {
      id: "openai",
      name: "OpenAI",
      icon: "🔥",
      description: "GPT-4o, GPT-4, o1 models",
      requiresApiKey: true,
      models: [
        {
          id: "gpt-4o",
          name: "GPT-4o",
          description: "Most capable multimodal model",
          capabilities: {
            imageInput: true,
            objectGeneration: true,
            toolUsage: true,
            toolStreaming: true,
          },
        },
        {
          id: "gpt-4o-mini",
          name: "GPT-4o Mini",
          description: "Affordable and intelligent small model",
          capabilities: {
            imageInput: true,
            objectGeneration: true,
            toolUsage: true,
            toolStreaming: true,
          },
        },
        {
          id: "gpt-4-turbo",
          name: "GPT-4 Turbo",
          description: "Latest GPT-4 model with vision",
          capabilities: {
            imageInput: true,
            objectGeneration: true,
            toolUsage: true,
            toolStreaming: true,
          },
        },
        {
          id: "o1",
          name: "o1",
          description: "Advanced reasoning model",
          capabilities: { objectGeneration: true },
        },
        {
          id: "o1-mini",
          name: "o1 Mini",
          description: "Fast reasoning model",
          capabilities: { objectGeneration: true },
        },
      ],
      configFields: [
        {
          key: "apiKey",
          label: "API Key",
          type: "password",
          required: true,
          placeholder: "sk-...",
        },
      ],
    },
    {
      id: "anthropic",
      name: "Anthropic",
      icon: "🎭",
      description: "Claude 3.5 Sonnet, Haiku models",
      requiresApiKey: true,
      models: [
        {
          id: "claude-3-5-sonnet-20241022",
          name: "Claude 3.5 Sonnet",
          description: "Most intelligent model",
          capabilities: {
            imageInput: true,
            objectGeneration: true,
            toolUsage: true,
            toolStreaming: true,
          },
        },
        {
          id: "claude-3-5-haiku-20241022",
          name: "Claude 3.5 Haiku",
          description: "Fast and lightweight",
          capabilities: {
            imageInput: true,
            objectGeneration: true,
            toolUsage: true,
            toolStreaming: true,
          },
        },
      ],
      configFields: [
        {
          key: "apiKey",
          label: "API Key",
          type: "password",
          required: true,
          placeholder: "sk-ant-...",
        },
      ],
    },
    {
      id: "google",
      name: "Google Generative AI",
      icon: "🌟",
      description: "Gemini 2.0 Flash, Gemini 1.5 models",
      requiresApiKey: true,
      models: [
        {
          id: "gemini-2.0-flash-exp",
          name: "Gemini 2.0 Flash",
          description: "Latest multimodal model",
          capabilities: {
            imageInput: true,
            objectGeneration: true,
            toolUsage: true,
            toolStreaming: true,
          },
        },
        {
          id: "gemini-1.5-pro",
          name: "Gemini 1.5 Pro",
          description: "Advanced reasoning model",
          capabilities: {
            imageInput: true,
            objectGeneration: true,
            toolUsage: true,
            toolStreaming: true,
          },
        },
        {
          id: "gemini-1.5-flash",
          name: "Gemini 1.5 Flash",
          description: "Fast and efficient",
          capabilities: {
            imageInput: true,
            objectGeneration: true,
            toolUsage: true,
            toolStreaming: true,
          },
        },
      ],
      configFields: [
        {
          key: "apiKey",
          label: "API Key",
          type: "password",
          required: true,
          placeholder: "AIza...",
        },
      ],
    },
    {
      id: "groq",
      name: "Groq",
      icon: "⚡",
      description: "Ultra-fast LLaMA, Mixtral models",
      requiresApiKey: true,
      models: [
        {
          id: "llama-3.3-70b-versatile",
          name: "LLaMA 3.3 70B",
          description: "Versatile large model",
          capabilities: {
            objectGeneration: true,
            toolUsage: true,
            toolStreaming: true,
          },
        },
        {
          id: "llama-3.1-8b-instant",
          name: "LLaMA 3.1 8B",
          description: "Fast and lightweight",
          capabilities: {
            objectGeneration: true,
            toolUsage: true,
            toolStreaming: true,
          },
        },
        {
          id: "mixtral-8x7b-32768",
          name: "Mixtral 8x7B",
          description: "Mixture of experts model",
          capabilities: {
            objectGeneration: true,
            toolUsage: true,
            toolStreaming: true,
          },
        },
      ],
      configFields: [
        {
          key: "apiKey",
          label: "API Key",
          type: "password",
          required: true,
          placeholder: "gsk_...",
        },
      ],
    },
    {
      id: "deepseek",
      name: "DeepSeek",
      icon: "🔍",
      description: "DeepSeek Chat, Reasoner models",
      requiresApiKey: true,
      models: [
        {
          id: "deepseek-chat",
          name: "DeepSeek Chat",
          description: "General purpose chat model",
          capabilities: {
            objectGeneration: true,
            toolUsage: true,
            toolStreaming: true,
          },
        },
        {
          id: "deepseek-reasoner",
          name: "DeepSeek Reasoner",
          description: "Advanced reasoning model",
          capabilities: {
            objectGeneration: true,
            toolUsage: true,
            toolStreaming: true,
          },
        },
      ],
      configFields: [
        {
          key: "apiKey",
          label: "API Key",
          type: "password",
          required: true,
          placeholder: "sk-...",
        },
      ],
    },
    {
      id: "mistral",
      name: "Mistral AI",
      icon: "🌪️",
      description: "Mistral Large, Small models",
      requiresApiKey: true,
      models: [
        {
          id: "mistral-large-latest",
          name: "Mistral Large",
          description: "Most capable model",
          capabilities: {
            imageInput: true,
            objectGeneration: true,
            toolUsage: true,
            toolStreaming: true,
          },
        },
        {
          id: "mistral-small-latest",
          name: "Mistral Small",
          description: "Fast and efficient",
          capabilities: {
            objectGeneration: true,
            toolUsage: true,
            toolStreaming: true,
          },
        },
        {
          id: "pixtral-large-latest",
          name: "Pixtral Large",
          description: "Multimodal model",
          capabilities: {
            imageInput: true,
            objectGeneration: true,
            toolUsage: true,
            toolStreaming: true,
          },
        },
      ],
      configFields: [
        {
          key: "apiKey",
          label: "API Key",
          type: "password",
          required: true,
          placeholder: "api-key-...",
        },
      ],
    },
    {
      id: "xai",
      name: "xAI Grok",
      icon: "🚀",
      description: "Grok 3, Grok 2 models",
      requiresApiKey: true,
      models: [
        {
          id: "grok-3",
          name: "Grok 3",
          description: "Latest Grok model",
          capabilities: {
            imageInput: true,
            objectGeneration: true,
            toolUsage: true,
            toolStreaming: true,
          },
        },
        {
          id: "grok-3-mini",
          name: "Grok 3 Mini",
          description: "Lightweight version",
          capabilities: {
            objectGeneration: true,
            toolUsage: true,
            toolStreaming: true,
          },
        },
        {
          id: "grok-2-vision-1212",
          name: "Grok 2 Vision",
          description: "Vision-enabled model",
          capabilities: {
            imageInput: true,
            objectGeneration: true,
            toolUsage: true,
            toolStreaming: true,
          },
        },
      ],
      configFields: [
        {
          key: "apiKey",
          label: "API Key",
          type: "password",
          required: true,
          placeholder: "xai-...",
        },
      ],
    },
    {
      id: "cerebras",
      name: "Cerebras",
      icon: "🧠",
      description: "Ultra-fast LLaMA models",
      requiresApiKey: true,
      models: [
        {
          id: "llama3.3-70b",
          name: "LLaMA 3.3 70B",
          description: "Large context model",
          capabilities: {
            objectGeneration: true,
            toolUsage: true,
            toolStreaming: true,
          },
        },
        {
          id: "llama3.1-8b",
          name: "LLaMA 3.1 8B",
          description: "Fast inference model",
          capabilities: {
            objectGeneration: true,
            toolUsage: true,
            toolStreaming: true,
          },
        },
      ],
      configFields: [
        {
          key: "apiKey",
          label: "API Key",
          type: "password",
          required: true,
          placeholder: "csk-...",
        },
      ],
    },
  ];

  async initialize(): Promise<void> {
    try {
      const savedConfig = await AsyncStorage.getItem("@ai_config");
      if (savedConfig) {
        this.config = JSON.parse(savedConfig);
      }
    } catch (error) {
      console.error("Failed to load AI config:", error);
    }
  }

  // Get all available providers
  getProviders(): AIProvider[] {
    return this.providers;
  }

  // Get specific provider
  getProvider(id: string): AIProvider | undefined {
    return this.providers.find((p) => p.id === id);
  }

  // Get current configuration
  getConfig(): AIConfig | null {
    return this.config;
  }

  // Check if AI is configured
  isConfigured(): boolean {
    return !!this.config && !!this.config.provider && !!this.config.model;
  }

  // Save AI configuration
  async saveConfig(config: AIConfig): Promise<void> {
    try {
      const provider = this.getProvider(config.provider);
      if (!provider) throw new AIError(`Invalid provider: ${config.provider}`);

      if (provider.requiresApiKey && !config.apiKey) {
        throw new AIError(`API key is required for ${config.provider}`);
      }

      this.config = config;
      await AsyncStorage.setItem("@ai_config", JSON.stringify(config));
    } catch (error) {
      console.error("Failed to save AI config:", error);
      throw new AIError(`Failed to save AI config`, error as Error);
    }
  }

  // Clear configuration
  async clearConfig(): Promise<void> {
    try {
      this.config = null;
      await AsyncStorage.removeItem("@ai_config");
    } catch (error) {
      console.error("Failed to clear AI config:", error);
      throw new AIError("Failed to clear AI config", error as Error);
    }
  }

  // Get AI provider instance based on current config
  public static providerFactories = {
    [Provider.OpenAI]: (config: AIConfig) =>
      // @ts-ignore
      createOpenAI({ apiKey: config.apiKey, baseURL: config.baseURL }),
    [Provider.Anthropic]: (config: AIConfig) =>
      // @ts-ignore
      createAnthropic({ apiKey: config.apiKey }),
    [Provider.Google]: (config: AIConfig) =>
      // @ts-ignore
      createGoogleGenerativeAI({ apiKey: config.apiKey }),
    [Provider.Groq]: (config: AIConfig) =>
      createGroq({ apiKey: config.apiKey }),
    [Provider.DeepSeek]: (config: AIConfig) =>
      // @ts-ignore
      createDeepSeek({ apiKey: config.apiKey }),
    [Provider.Mistral]: (config: AIConfig) =>
      createMistral({ apiKey: config.apiKey }),
    [Provider.XAI]: (config: AIConfig) => createXai({ apiKey: config.apiKey }),
    [Provider.OpenRouter]: (config: AIConfig) =>
      createOpenRouter({ apiKey: config.apiKey }),
    [Provider.AzureOpenAI]: (config: AIConfig) =>
      createAzure({ apiKey: config.apiKey }),
    [Provider.Zhipu]: (config: AIConfig) =>
      createZhipu({ apiKey: config.apiKey }),
    [Provider.SiliconFlow]: (config: AIConfig) =>
      createOpenAI({
        apiKey: config.apiKey,
        baseURL: ProviderMap[config.provider as Provider.SiliconFlow]
          .baseURL as string,
      }),
    [Provider.Cerebras]: (config: AIConfig) =>
      createOpenAI({
        baseURL: "https://api.cerebras.ai/v1",
        apiKey: config.apiKey,
      }),
  };

  private getProviderInstance() {
    if (!this.config) throw new AIError("AI not configured");
    // @ts-ignore
    const factory = AIService.providerFactories[this.config.provider];
    if (!factory)
      throw new AIError(`Unsupported provider: ${this.config.provider}`);
    return factory(this.config);
  }

  // Generate text using current provider with MCP tools support
  async generateText(prompt: string, context?: string): Promise<string> {
    if (!this.config) {
      throw new AIError("AI service not configured");
    }

    try {
      const provider = this.getProviderInstance();
      const model = provider(this.config.model);

      const messages: UIMessage[] = [];

      if (context) {
        messages.push({
          id: Date.now().toString(),
          role: "system",
          parts: [
            {
              type: "text",
              text: `Context: ${context}`,
            },
          ],
        });
      }

      messages.push({
        id: Date.now().toString(),
        role: "user",
        parts: [
          {
            type: "text",
            text: prompt,
          },
        ],
      });
      console.log("Messages:", messages);

      // Get available tools (both MCP and builtin)
      const mcpTools = await mcpService.getAvailableTools();
      // console.log("MCP tools:", mcpTools);
      // const builtinTools = await builtinToolsService.getAvailableTools();
      // console.log("Builtin tools:", builtinTools);
      const allTools = {
        ...mcpTools,
        // ...builtinTools
      };

      const newMessages = convertToModelMessages(messages);

      const result = await generateText({
        model,
        messages: newMessages,
        tools: Object.keys(allTools).length > 0 ? allTools : undefined,
        temperature: 0.7,
      });

      return result.text;
    } catch (error) {
      console.error("AI generation error:", error);
      throw new AIError(
        // @ts-ignore
        `AI generation failed: ${error.message}`,
        error as Error,
      );
    }
  }

  private async prepareStreamConfig(
    message: string,
    context?: string,
    conversationHistory: UIMessage[] = [],
    emphasizeMCP: boolean = false,
  ) {
    if (!this.isConfigured() || !this.config) {
      throw new AIError("AI service not configured");
    }

    const messages: UIMessage[] = [];

    // Add context if provided
    if (context) {
      messages.push({
        id: "0",
        role: "system",
        parts: [
          {
            type: "text",
            text: `You are a helpful AI assistant for a web browser with access to external tools via MCP. Context: ${context}`,
          },
        ],
      });
    }

    // Add conversation history
    conversationHistory.forEach((msg) => {
      messages.push(msg);
    });

    // Add current message
    messages.push({
      id: Date.now().toString(),
      role: "user",
      parts: [
        {
          type: "text",
          text: message,
        },
      ],
    });

    const mcpTools = await mcpService.getAvailableTools();
    // const builtinTools = await builtinToolsService.getAvailableTools();
    const allTools = {
      ...mcpTools,
      // ...builtinTools
    };
    const hasTools = Object.keys(allTools).length > 0;

    return {
      model: this.getProviderInstance()(this.config.model),
      messages: convertToModelMessages(messages),
      tools: hasTools ? allTools : undefined,
      maxSteps: hasTools ? 5 : undefined,
      maxTokens: 1000,
      temperature: 0.7,
      onStepFinish: hasTools
        ? async ({ toolCalls }: any) => {
            if (toolCalls && toolCalls.length > 0) {
              console.log(
                "Tools used:",
                toolCalls.map((tc: any) => tc.toolName),
              );
            }
          }
        : undefined,
    };
  }

  // Stream AI responses for chat
  async streamFetch(_: string, option: RequestInit) {
    const {
      message,
      context = "",
      conversationHistory = [],
    } = JSON.parse(option.body as string) as {
      message: string;
      context?: string;
      conversationHistory: UIMessage[];
    };
    console.log("AI message:", message);
    try {
      const streamConfig = await this.prepareStreamConfig(
        message,
        context,
        conversationHistory,
      );
      const result = streamText({
        ...streamConfig,
        onChunk: (chunk) => {
          console.log("Stream chunk:", chunk);
        },
        providerOptions: {
          google: {
            thinkingConfig: {
              thinkingBudget: 2048,
            },
          },
          anthropic: {
            thinking: {
              type: "enabled",
              budgetTokens: 12000,
            },
          },
        },
      });
      result.consumeStream();
      console.log("Stream result:", result);

      return result.toUIMessageStreamResponse({
        sendReasoning: true,
      });
    } catch (error) {
      console.error("Streaming error:", error);
      // @ts-ignore
      throw new AIError(`Streaming failed: ${error.message}`, error as Error);
    }
  }

  // Enhanced streaming with explicit MCP support
  async streamFetchWithMCP(
    message: string,
    context?: string,
    conversationHistory: UIMessage[] = [],
  ) {
    return this.streamFetch("", {
      body: JSON.stringify({
        message,
        context,
        conversationHistory,
      }),
    });
  }

  // Get MCP statistics
  getMCPStatistics() {
    return mcpService.getStatistics();
  }

  // Check if MCP tools are available
  async hasMCPTools(): Promise<boolean> {
    try {
      const tools = await mcpService.getAvailableTools();
      return Object.keys(tools).length > 0;
    } catch (error) {
      console.error("Failed to check MCP tools:", error);
      return false;
    }
  }

  // Get available MCP tools summary
  async getMCPToolsSummary(): Promise<string[]> {
    try {
      const tools = await mcpService.getAvailableTools();
      return Object.keys(tools).map((toolName) => {
        const [serverId, name] = toolName.split(":");
        return `${name} (from ${serverId})`;
      });
    } catch (error) {
      console.error("Failed to get MCP tools summary:", error);
      return [];
    }
  }

  // Stream text generation
  async *streamText(prompt: string, context?: string): AsyncIterable<string> {
    if (!this.config) {
      throw new AIError("AI service not configured");
    }

    try {
      const provider = this.getProviderInstance();
      const model = provider(this.config.model);

      const messages = [];

      if (context) {
        messages.push({
          role: "system",
          content: `Context: ${context}`,
        });
      }

      messages.push({
        role: "user",
        content: prompt,
      });

      const result = await streamText({
        model,
        messages: convertToModelMessages(messages as unknown as UIMessage[]),
        temperature: 0.7,
      });

      for await (const delta of result.textStream) {
        yield delta;
      }
    } catch (error) {
      console.error("AI streaming error:", error);
      throw new AIError(
        // @ts-ignore
        `AI streaming failed: ${error.message}`,
        error as Error,
      );
    }
  }

  // Test provider configuration
  async testProvider(config: AIConfig): Promise<boolean> {
    try {
      const tempConfig = this.config;
      this.config = config;

      const result = await this.generateText("Hello");

      this.config = tempConfig;
      return result.length > 0;
    } catch (error) {
      console.error("Provider test failed:", error);
      return false;
    }
  }

  // Get provider status
  getProviderStatus(): {
    configured: boolean;
    provider?: string;
    model?: string;
    ready: boolean;
  } {
    if (!this.config) {
      return { configured: false, ready: false };
    }

    return {
      configured: true,
      provider: this.config.provider,
      model: this.config.model,
      ready: this.isConfigured(),
    };
  }

  // Summarize web page content
  async summarizeWebPage(
    content: string,
    url: string,
  ): Promise<WebPageSummary> {
    if (!this.isConfigured() || !this.config) {
      throw new AIError("AI service not configured");
    }

    const prompt = `Summarize the following web page content from ${url}:

${content.substring(0, 3000)}

Please provide:
1. A brief summary (2-3 sentences)
2. Key points or main topics
3. Relevance score (1-10)`;

    try {
      const provider = this.getProviderInstance();
      const model = provider(this.config.model);

      const result = await generateText({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      });

      // Parse the response (simplified)
      return {
        title: url.split("/")[2] || "Web Page",
        summary: result.text,
        keyPoints: [],
        relevanceScore: 8,
        readingTime: Math.ceil(content.length / 1000),
      };
    } catch (error) {
      console.error("Summarization error:", error);
      throw new AIError(
        // @ts-ignore
        `Failed to summarize content: ${error.message}`,
        error as Error,
      );
    }
  }

  // Generate smart search suggestions
  async generateSearchSuggestions(
    input: string,
    historyItems: string[] = [],
    bookmarks: string[] = [],
  ): Promise<SearchSuggestion[]> {
    if (!this.isConfigured() || !this.config) {
      // Fallback to simple suggestions without AI
      return this.generateFallbackSuggestions(input, historyItems, bookmarks);
    }

    const prompt = `Based on the search input "${input}" and user's browsing history, generate 5 smart search suggestions.

History: ${historyItems.slice(0, 10).join(", ")}
Bookmarks: ${bookmarks.slice(0, 5).join(", ")}

Return JSON array of suggestions with title, url, and type.`;

    try {
      const provider = this.getProviderInstance();
      const model = provider(this.config.model);

      const result = await generateText({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.5,
      });

      // Parse AI response and fallback if needed
      try {
        const suggestions = JSON.parse(result.text);
        return suggestions.map((s: any) => ({
          title: s.title,
          url: s.url,
          type: s.type || "suggestion",
        }));
      } catch {
        return this.generateFallbackSuggestions(input, historyItems, bookmarks);
      }
    } catch (error) {
      console.error("Search suggestion error:", error);
      return this.generateFallbackSuggestions(input, historyItems, bookmarks);
    }
  }

  // Fallback suggestions without AI
  private generateFallbackSuggestions(
    input: string,
    historyItems: string[],
    bookmarks: string[],
  ): SearchSuggestion[] {
    const suggestions: SearchSuggestion[] = [];

    // Check if input looks like a URL
    if (this.isValidUrl(input)) {
      suggestions.push({
        query: input,
        type: "url",
        confidence: 0.9,
      });
    }

    // Search in history
    const historyMatches = historyItems
      .filter((item) => item.toLowerCase().includes(input.toLowerCase()))
      .slice(0, 3);

    historyMatches.forEach((match) => {
      suggestions.push({
        query: match,
        type: "history",
        confidence: 0.7,
      });
    });

    // Search in bookmarks
    const bookmarkMatches = bookmarks
      .filter((item) => item.toLowerCase().includes(input.toLowerCase()))
      .slice(0, 2);

    bookmarkMatches.forEach((match) => {
      suggestions.push({
        query: match,
        type: "bookmark",
        confidence: 0.8,
      });
    });

    // Default search suggestions
    if (input.length > 2) {
      suggestions.push({
        query: `Search for "${input}"`,
        type: "search",
        confidence: 0.6,
      });
    }

    return suggestions.slice(0, 5);
  }

  // Translate text
  async translateText(
    text: string,
    targetLanguage: string = "en",
  ): Promise<string> {
    if (!this.isConfigured() || !this.config) {
      throw new AIError("AI service not configured");
    }

    const prompt = `Translate the following text to ${targetLanguage}:

${text}

Provide only the translation, no explanations.`;

    try {
      const provider = this.getProviderInstance();
      const model = provider(this.config.model);

      const result = await generateText({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      });

      return result.text.trim();
    } catch (error) {
      console.error("Translation error:", error);
      // @ts-ignore
      throw new AIError(`Translation failed: ${error.message}`, error as Error);
    }
  }

  // Utility function to check if string is a valid URL
  private isValidUrl(string: string): boolean {
    try {
      new URL(string);
      return true;
    } catch (_) {
      // Check if it could be a domain without protocol
      return /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}/.test(
        string,
      );
    }
  }

  // Format URL - add protocol if missing
  formatUrl(input: string): string {
    if (this.isValidUrl(input)) {
      if (input.includes("://")) {
        return input;
      }
      return `https://${input}`;
    }

    // If not a URL, create a search query
    return `https://www.google.com/search?q=${encodeURIComponent(input)}`;
  }
}

export const aiService = new AIService();

export const MetadataSchema = z.object({
  duration: z.number().optional(),
  model: z.string().optional(),
  totalTokens: z.number().optional(),
});
