import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';

export interface MCPServer {
  id: string;
  name: string;
  description: string;
  url: string;
  enabled: boolean;
  headers?: Record<string, string>;
  tools?: MCPTool[];
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  lastConnected?: string;
  error?: string;
}

export interface MCPTool {
  name: string;
  description: string;
  parameters: any;
  enabled: boolean;
  schema?: z.ZodSchema;
}

export interface MCPServerConfig {
  id: string;
  name: string;
  description: string;
  url: string;
  headers?: Record<string, string>;
  enabled: boolean;
  toolSchemas?: Record<string, { parameters: z.ZodSchema }>;
}

// Temporary MCP Client implementation until AI SDK 5 Beta is available
class MockMCPClient {
  private url: string;
  private headers: Record<string, string>;

  constructor(config: { url: string; headers?: Record<string, string> }) {
    this.url = config.url;
    this.headers = config.headers || {};
  }

  async tools(): Promise<Record<string, any>> {
    // Mock tools for demonstration
    if (this.url.includes('weather')) {
      return {
        'get_weather': {
          description: 'Get weather information for a location',
          parameters: z.object({
            location: z.string().describe('The location to get weather for'),
            units: z.enum(['celsius', 'fahrenheit']).optional().describe('Temperature units'),
          }),
          execute: async ({ location, units = 'celsius' }: { location: string; units?: string }) => {
            return {
              location,
              temperature: Math.floor(Math.random() * 30) + 10,
              units,
              conditions: ['sunny', 'cloudy', 'rainy'][Math.floor(Math.random() * 3)],
              timestamp: new Date().toISOString(),
            };
          },
        },
        'get_forecast': {
          description: 'Get 5-day weather forecast',
          parameters: z.object({
            location: z.string().describe('The location for forecast'),
          }),
          execute: async ({ location }: { location: string }) => {
            return {
              location,
              forecast: Array.from({ length: 5 }, (_, i) => ({
                day: i + 1,
                temperature: Math.floor(Math.random() * 25) + 15,
                conditions: ['sunny', 'cloudy', 'rainy'][Math.floor(Math.random() * 3)],
              })),
            };
          },
        },
      };
    }

    if (this.url.includes('github')) {
      return {
        'search_repositories': {
          description: 'Search GitHub repositories',
          parameters: z.object({
            query: z.string().describe('Search query for repositories'),
            language: z.string().optional().describe('Programming language filter'),
          }),
          execute: async ({ query, language }: { query: string; language?: string }) => {
            return {
              query,
              language,
              results: [
                { name: 'example-repo', stars: 123, language: language || 'JavaScript' },
                { name: 'demo-project', stars: 456, language: language || 'TypeScript' },
              ],
            };
          },
        },
        'create_issue': {
          description: 'Create a new GitHub issue',
          parameters: z.object({
            title: z.string().describe('Issue title'),
            body: z.string().describe('Issue description'),
            repository: z.string().describe('Repository name (owner/repo)'),
          }),
          execute: async ({ title, body, repository }: { title: string; body: string; repository: string }) => {
            return {
              title,
              body,
              repository,
              issue_number: Math.floor(Math.random() * 1000) + 1,
              created_at: new Date().toISOString(),
            };
          },
        },
      };
    }

    // Default empty tools
    return {};
  }

  async close(): Promise<void> {
    // Mock close implementation
    console.log(`Mock MCP client closed for ${this.url}`);
  }
}

// Mock MCP client creator
async function createMCPClient(config: {
  transport: {
    type: 'sse';
    url: string;
    headers?: Record<string, string>;
  };
}): Promise<MockMCPClient> {
  // Simulate connection delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return new MockMCPClient({
    url: config.transport.url,
    headers: config.transport.headers,
  });
}

class MCPService {
  private servers: MCPServer[] = [];
  private clients: Map<string, MockMCPClient> = new Map();
  private listeners: ((servers: MCPServer[]) => void)[] = [];

  async initialize(): Promise<void> {
    try {
      await this.loadServers();
      console.log('MCP Service initialized (Mock Implementation)');
    } catch (error) {
      console.error('Failed to initialize MCP Service:', error);
    }
  }

  // Server Management
  async loadServers(): Promise<void> {
    try {
      const savedServers = await AsyncStorage.getItem('@mcp_servers');
      if (savedServers) {
        this.servers = JSON.parse(savedServers);
        
        // Auto-connect enabled servers
        for (const server of this.servers.filter(s => s.enabled)) {
          this.connectToServer(server.id);
        }
      } else {
        // Add default example servers
        this.servers = this.getDefaultServers();
        await this.saveServers();
      }
    } catch (error) {
      console.error('Failed to load MCP servers:', error);
    }
  }

  private getDefaultServers(): MCPServer[] {
    return [
      {
        id: 'demo-weather',
        name: 'Demo Weather Server',
        description: 'Example weather tool server (Mock)',
        url: 'https://demo-mcp-weather.example.com/sse',
        enabled: false,
        status: 'disconnected',
        tools: [],
      },
      {
        id: 'github-mcp',
        name: 'GitHub MCP Server',
        description: 'GitHub repository and issues management (Mock)',
        url: 'https://github-mcp-server.example.com/sse',
        enabled: false,
        status: 'disconnected',
        tools: [],
        headers: {
          'Authorization': 'Bearer YOUR_GITHUB_TOKEN'
        }
      },
      {
        id: 'custom-tools',
        name: 'Custom Tools Server',
        description: 'Custom business logic tools',
        url: 'https://custom-tools.example.com/sse',
        enabled: false,
        status: 'disconnected',
        tools: [],
      }
    ];
  }

  async saveServers(): Promise<void> {
    try {
      await AsyncStorage.setItem('@mcp_servers', JSON.stringify(this.servers));
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to save MCP servers:', error);
    }
  }

  // Server Connection Management
  async connectToServer(serverId: string): Promise<boolean> {
    const server = this.servers.find(s => s.id === serverId);
    if (!server) return false;

    try {
      this.updateServerStatus(serverId, 'connecting');

      const mcpClient = await createMCPClient({
        transport: {
          type: 'sse',
          url: server.url,
          headers: server.headers || {},
        },
      });

      // Test connection by getting available tools
      const tools = await mcpClient.tools();
      
      // Convert tools to our format
      const serverTools: MCPTool[] = Object.keys(tools).map(toolName => ({
        name: toolName,
        description: tools[toolName].description || `Tool: ${toolName}`,
        parameters: tools[toolName].parameters,
        enabled: true,
        schema: tools[toolName].parameters,
      }));

      // Store client and update server
      this.clients.set(serverId, mcpClient);
      
      const updatedServer = {
        ...server,
        status: 'connected' as const,
        tools: serverTools,
        lastConnected: new Date().toISOString(),
        error: undefined,
      };
      
      this.updateServer(serverId, updatedServer);
      
      console.log(`Connected to MCP server: ${server.name}`);
      return true;

    } catch (error) {
      console.error(`Failed to connect to MCP server ${server.name}:`, error);
      
      this.updateServer(serverId, {
        ...server,
        status: 'error',
        error: `Connection failed: ${error}`,
      });
      
      return false;
    }
  }

  async disconnectFromServer(serverId: string): Promise<void> {
    const client = this.clients.get(serverId);
    if (client) {
      try {
        await client.close();
        this.clients.delete(serverId);
        this.updateServerStatus(serverId, 'disconnected');
        console.log(`Disconnected from MCP server: ${serverId}`);
      } catch (error) {
        console.error(`Failed to disconnect from MCP server ${serverId}:`, error);
      }
    }
  }

  // Server CRUD Operations
  async addServer(config: MCPServerConfig): Promise<void> {
    const newServer: MCPServer = {
      ...config,
      status: 'disconnected',
      tools: [],
    };

    this.servers.push(newServer);
    await this.saveServers();

    if (newServer.enabled) {
      await this.connectToServer(newServer.id);
    }
  }

  async updateServer(serverId: string, updates: Partial<MCPServer>): Promise<void> {
    const index = this.servers.findIndex(s => s.id === serverId);
    if (index !== -1) {
      this.servers[index] = { ...this.servers[index], ...updates };
      await this.saveServers();
    }
  }

  async removeServer(serverId: string): Promise<void> {
    await this.disconnectFromServer(serverId);
    this.servers = this.servers.filter(s => s.id !== serverId);
    await this.saveServers();
  }

  async toggleServer(serverId: string): Promise<void> {
    const server = this.servers.find(s => s.id === serverId);
    if (!server) return;

    if (server.enabled) {
      await this.disconnectFromServer(serverId);
      await this.updateServer(serverId, { enabled: false });
    } else {
      await this.updateServer(serverId, { enabled: true });
      await this.connectToServer(serverId);
    }
  }

  private updateServerStatus(serverId: string, status: MCPServer['status']): void {
    const index = this.servers.findIndex(s => s.id === serverId);
    if (index !== -1) {
      this.servers[index].status = status;
      this.notifyListeners();
    }
  }

  // Tool Management
  async toggleTool(serverId: string, toolName: string): Promise<void> {
    const server = this.servers.find(s => s.id === serverId);
    if (!server || !server.tools) return;

    const tool = server.tools.find(t => t.name === toolName);
    if (tool) {
      tool.enabled = !tool.enabled;
      await this.saveServers();
    }
  }

  // Get tools for AI integration
  async getAvailableTools(): Promise<Record<string, any>> {
    const allTools: Record<string, any> = {};

    for (const server of this.servers) {
      if (server.status === 'connected' && server.enabled) {
        const client = this.clients.get(server.id);
        if (client) {
          try {
            const serverTools = await client.tools();
            
            // Filter enabled tools only
            const enabledTools = server.tools?.filter(t => t.enabled) || [];
            
            for (const tool of enabledTools) {
              if (serverTools[tool.name]) {
                allTools[`${server.id}:${tool.name}`] = serverTools[tool.name];
              }
            }
          } catch (error) {
            console.error(`Failed to get tools from server ${server.id}:`, error);
          }
        }
      }
    }

    return allTools;
  }

  // Execute MCP tool
  async executeTool(serverId: string, toolName: string, parameters: any): Promise<any> {
    const client = this.clients.get(serverId);
    if (!client) {
      throw new Error(`No connection to server ${serverId}`);
    }

    try {
      const tools = await client.tools();
      const tool = tools[toolName];
      
      if (!tool || !tool.execute) {
        throw new Error(`Tool ${toolName} not found or not executable`);
      }

      return await tool.execute(parameters);
    } catch (error) {
      console.error(`Failed to execute tool ${toolName}:`, error);
      throw error;
    }
  }

  // Test server connection
  async testServerConnection(config: MCPServerConfig): Promise<{ success: boolean; error?: string; tools?: MCPTool[] }> {
    try {
      const mcpClient = await createMCPClient({
        transport: {
          type: 'sse',
          url: config.url,
          headers: config.headers || {},
        },
      });

      const tools = await mcpClient.tools();
      await mcpClient.close();

      const serverTools: MCPTool[] = Object.keys(tools).map(toolName => ({
        name: toolName,
        description: tools[toolName].description || `Tool: ${toolName}`,
        parameters: tools[toolName].parameters,
        enabled: true,
        schema: tools[toolName].parameters,
      }));

      return {
        success: true,
        tools: serverTools,
      };

    } catch (error) {
      return {
        success: false,
        error: `Connection failed: ${error}`,
      };
    }
  }

  // Getters
  getServers(): MCPServer[] {
    return this.servers;
  }

  getServer(serverId: string): MCPServer | undefined {
    return this.servers.find(s => s.id === serverId);
  }

  getConnectedServers(): MCPServer[] {
    return this.servers.filter(s => s.status === 'connected');
  }

  getEnabledTools(): { serverId: string; tools: MCPTool[] }[] {
    return this.servers
      .filter(s => s.status === 'connected' && s.enabled)
      .map(s => ({
        serverId: s.id,
        tools: s.tools?.filter(t => t.enabled) || [],
      }))
      .filter(s => s.tools.length > 0);
  }

  // Statistics
  getStatistics() {
    const connectedServers = this.servers.filter(s => s.status === 'connected').length;
    const totalTools = this.servers.reduce((sum, s) => sum + (s.tools?.length || 0), 0);
    const enabledTools = this.servers.reduce((sum, s) => 
      sum + (s.tools?.filter(t => t.enabled).length || 0), 0
    );

    return {
      totalServers: this.servers.length,
      connectedServers,
      totalTools,
      enabledTools,
    };
  }

  // Event Listeners
  addListener(listener: (servers: MCPServer[]) => void): void {
    this.listeners.push(listener);
  }

  removeListener(listener: (servers: MCPServer[]) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.servers));
  }

  // Cleanup
  async cleanup(): Promise<void> {
    // Disconnect all clients
    for (const [serverId] of this.clients) {
      await this.disconnectFromServer(serverId);
    }
    
    this.clients.clear();
    this.listeners = [];
    
    console.log('MCP Service cleaned up');
  }
}

export const mcpService = new MCPService(); 