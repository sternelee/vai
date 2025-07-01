# Vai Browser - AI-Powered Mobile Browser

VaiBrowser is an intelligent mobile browser that combines the lightweight efficiency of Via Browser with advanced AI capabilities and cutting-edge features including performance optimization, user script support, and **Model Context Protocol (MCP) tools integration**.

## 🚀 Core Features

### 🤖 Multi-AI Provider Support

- **8 Major AI Providers**: OpenAI, Anthropic, Google, Groq, DeepSeek, Mistral, xAI Grok, Cerebras
- **20+ Model Options**: GPT-4o, Claude 3.5, Gemini 2.0, LLaMA 3.3, and more
- **Intelligent Configuration**: API key management, custom headers, provider testing
- **Real-time Status**: Live AI provider status in browser interface

### 🔧 MCP Tools Integration (NEW!)

**Model Context Protocol** support allows AI to access external tools and services through standardized interfaces:

#### Key Features

- **SSE Transport Protocol**: HTTP-based real-time communication with MCP servers
- **Multiple Server Support**: Connect to unlimited MCP servers simultaneously
- **Tool Discovery**: Automatic discovery and registration of available tools
- **Smart Tool Management**: Enable/disable individual tools per server
- **Connection Management**: Real-time status monitoring and error handling
- **Authentication Support**: Custom headers for API keys and authentication

#### Built-in Demo Servers

1. **Weather Server** (Mock)

   - `get_weather`: Get current weather for any location
   - `get_forecast`: 5-day weather forecast

2. **GitHub Server** (Mock)

   - `search_repositories`: Search GitHub repositories
   - `create_issue`: Create new GitHub issues

3. **Custom Tools Server**
   - Extensible for business-specific tools

#### MCP Architecture

```
AI Assistant <-> VaiBrowser <-> MCP Service <-> External MCP Servers
                                     |
                              ┌─────────────┬─────────────┬─────────────┐
                              │ Weather API │ GitHub API  │ Custom APIs │
                              └─────────────┴─────────────┴─────────────┘
```

#### Configuration Interface

- **Three-tab Management**: Servers, Tools, Add Server
- **Connection Testing**: Verify server connectivity before saving
- **Statistics Dashboard**: Real-time server and tool metrics
- **Error Handling**: Detailed error messages and recovery suggestions

### 🚀 Performance Optimization System

- **Real-time Monitoring**: Memory usage, load times, tab management
- **Intelligent Cache Management**: LRU algorithm with automatic eviction
- **Memory Threshold Control**: 150MB limit with auto-cleanup
- **Performance Metrics**: 5-second interval monitoring

### 🐒 User Script System (Tampermonkey/Greasemonkey Compatible)

- **Full UserScript Engine**: Support for standard Greasemonkey format
- **Built-in Script Library**: Ad blocker, dark mode, auto-scroll
- **Script Editor**: Write and test scripts directly in browser
- **URL Pattern Matching**: Precise script execution control

### 🌐 Advanced Browser Features

- **Multi-tab Management**: Up to 10 tabs with incognito support
- **Smart Address Bar**: AI-powered search suggestions
- **Download Manager**: Comprehensive file download handling
- **History & Bookmarks**: Full browsing data management

## 🛠️ Technical Implementation

### MCP Service Architecture

```typescript
class MCPService {
  // Server Management
  async connectToServer(serverId: string): Promise<boolean>;
  async disconnectFromServer(serverId: string): Promise<void>;

  // Tool Management
  async getAvailableTools(): Promise<Record<string, any>>;
  async executeTool(
    serverId: string,
    toolName: string,
    parameters: any,
  ): Promise<any>;

  // Configuration
  async addServer(config: MCPServerConfig): Promise<void>;
  async testServerConnection(config: MCPServerConfig): Promise<TestResult>;
}
```

### AI Integration with MCP

```typescript
// AI Service automatically includes MCP tools
const mcpTools = await mcpService.getAvailableTools();

const result = await streamText({
  model,
  messages,
  tools: mcpTools, // 🔧 MCP tools included
  maxSteps: 5, // Multi-step tool usage
  onStepFinish: ({ toolCalls }) => {
    console.log("MCP tools used:", toolCalls);
  },
});
```

### Real-time Status Monitoring

```typescript
// Performance indicator shows all system status
🚀 3 tabs • 📊 45MB • ⚡ 250ms • 🤖 AI • 🔧 MCP
```

## 📱 User Interface

### MCP Manager Interface

1. **Servers Tab**: View and manage all MCP servers

   - Connection status (Connected/Connecting/Error/Disconnected)
   - Tool count per server
   - Last connected timestamp
   - Enable/disable toggles

2. **Tools Tab**: Browse all available tools

   - Grouped by server
   - Tool descriptions and capabilities
   - Individual tool enable/disable

3. **Add Server Tab**: Configure new MCP servers
   - Server name and description
   - SSE endpoint URL
   - Custom headers (for authentication)
   - Connection testing
   - Auto-enable option

### Settings Integration

- **MCP Tools Section**: Dedicated configuration area
- **Status Indicators**: Real-time connection status
- **Statistics Display**: Server count, tool count, connection status
- **Quick Access**: Direct link to MCP Manager

## 🔧 Development Features

### Debug & Monitoring

- **Console Logging**: Detailed MCP operation logs
- **Error Tracking**: Connection failures and recovery
- **Performance Metrics**: Tool execution times
- **Status Broadcasting**: Real-time UI updates

### Extensibility

- **Plugin Architecture**: Easy addition of new MCP servers
- **Tool Templates**: Standard tool implementation patterns
- **Custom Transports**: Support for future MCP transport protocols
- **API Flexibility**: RESTful and GraphQL endpoint support

## 🚀 Getting Started with MCP

### 1. Configure MCP Server

```typescript
const serverConfig = {
  name: "My Weather Server",
  description: "Real-time weather data",
  url: "https://my-weather-mcp.example.com/sse",
  headers: {
    Authorization: "Bearer your-api-key",
  },
  enabled: true,
};
```

### 2. Test Connection

The built-in connection tester validates:

- Server connectivity
- Tool discovery
- Authentication
- Response format

### 3. Use in AI Chat

Once configured, MCP tools are automatically available to AI:

```
User: "What's the weather in Tokyo?"
AI: *Uses MCP weather tool* "Let me check the current weather in Tokyo..."
```

## 🎯 Benefits

### For Users

- **Extended AI Capabilities**: Access to real-world data and services
- **Seamless Integration**: Tools work transparently with AI chat
- **Privacy Control**: Local tool management and authentication
- **Performance Monitoring**: Real-time system status

### For Developers

- **Standard Protocol**: MCP compliance ensures compatibility
- **Easy Integration**: Simple server configuration
- **Scalable Architecture**: Support for unlimited tools
- **Debug Friendly**: Comprehensive logging and error handling

## 🔮 Future Roadmap

### MCP Enhancements

- **AI SDK 5 Beta Integration**: Full official MCP support when available
- **Stdio Transport**: Local tool server support
- **Tool Marketplace**: Discoverable public MCP servers
- **Custom Tool Builder**: Visual tool creation interface

### Advanced Features

- **Multi-modal MCP Tools**: Image and file processing tools
- **Workflow Automation**: Chain multiple MCP tools together
- **Enterprise Integration**: Corporate MCP server support
- **Security Enhancements**: Advanced authentication methods

## 📊 System Requirements

- React Native 0.79+
- Expo SDK 53+
- AI SDK 4.3+ (with MCP mock implementation)
- Modern device with 2GB+ RAM

## 🏆 Achievement Unlocked

VaiBrowser now supports the **complete AI ecosystem**:

- ✅ **Multi-AI Providers** (8 providers, 20+ models)
- ✅ **Performance Optimization** (Advanced monitoring)
- ✅ **User Scripts** (Tampermonkey compatible)
- ✅ **MCP Tools** (External service integration)

**Result**: A truly intelligent browser that can access any external service or data source through standardized interfaces, making it the most capable mobile browser for AI-enhanced browsing! 🎉

---

_VaiBrowser v1.0.0 - The Future of Intelligent Mobile Browsing_
