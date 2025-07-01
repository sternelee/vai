import { useColorScheme } from "@/hooks/useColorScheme";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  MCPServer,
  MCPServerConfig,
  mcpService,
} from "../../services/MCPService";

interface MCPManagerProps {
  visible: boolean;
  onClose: () => void;
}

export default function MCPManager({ visible, onClose }: MCPManagerProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [servers, setServers] = useState<MCPServer[]>([]);
  const [selectedTab, setSelectedTab] = useState<"servers" | "tools" | "add">(
    "servers",
  );
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState<any>(null);

  // Add server form state
  const [newServer, setNewServer] = useState<Partial<MCPServerConfig>>({
    name: "",
    description: "",
    url: "",
    enabled: false,
    headers: {},
  });
  const [headerKey, setHeaderKey] = useState("");
  const [headerValue, setHeaderValue] = useState("");
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (visible) {
      loadData();

      // Listen for server updates
      const handleUpdate = (updatedServers: MCPServer[]) => {
        setServers(updatedServers);
        updateStatistics();
      };

      mcpService.addListener(handleUpdate);

      return () => {
        mcpService.removeListener(handleUpdate);
      };
    }
  }, [visible]);

  const loadData = async () => {
    try {
      setLoading(true);
      const serverList = mcpService.getServers();
      setServers(serverList);
      updateStatistics();
    } catch (error) {
      console.error("Failed to load MCP data:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatistics = () => {
    const stats = mcpService.getStatistics();
    setStatistics(stats);
  };

  const handleToggleServer = async (serverId: string) => {
    try {
      await mcpService.toggleServer(serverId);
      // State will be updated through listener
    } catch (error) {
      Alert.alert("Error", `Failed to toggle server: ${error}`);
    }
  };

  const handleRemoveServer = async (serverId: string) => {
    Alert.alert(
      "Remove Server",
      "Are you sure you want to remove this MCP server?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await mcpService.removeServer(serverId);
            } catch (error) {
              Alert.alert("Error", `Failed to remove server: ${error}`);
            }
          },
        },
      ],
    );
  };

  const handleAddHeader = () => {
    if (headerKey.trim() && headerValue.trim()) {
      setNewServer((prev) => ({
        ...prev,
        headers: {
          ...prev.headers,
          [headerKey.trim()]: headerValue.trim(),
        },
      }));
      setHeaderKey("");
      setHeaderValue("");
    }
  };

  const handleRemoveHeader = (key: string) => {
    setNewServer((prev) => {
      const newHeaders = { ...prev.headers };
      delete newHeaders[key];
      return { ...prev, headers: newHeaders };
    });
  };

  const handleTestServer = async () => {
    if (!newServer.url) {
      Alert.alert("Error", "Please enter a server URL");
      return;
    }

    setTesting(true);
    try {
      const result = await mcpService.testServerConnection({
        id: "", // Will be generated
        name: newServer.name || "Test Server",
        description: newServer.description || "",
        url: newServer.url,
        headers: newServer.headers,
        enabled: false,
      });

      if (result.success) {
        Alert.alert(
          "Connection Successful!",
          `Found ${result.tools?.length || 0} tools:\n${result.tools?.map((t) => `• ${t.name}`).join("\n")}`,
          [{ text: "OK" }],
        );
      } else {
        Alert.alert("Connection Failed", result.error);
      }
    } catch (error) {
      Alert.alert("Test Failed", `${error}`);
    } finally {
      setTesting(false);
    }
  };

  const handleAddServer = async () => {
    if (!newServer.name || !newServer.url) {
      Alert.alert("Error", "Please fill in name and URL");
      return;
    }

    try {
      const serverConfig: MCPServerConfig = {
        id: `mcp-${Date.now()}`,
        name: newServer.name,
        description: newServer.description || "",
        url: newServer.url,
        headers: newServer.headers || {},
        enabled: newServer.enabled || false,
      };

      await mcpService.addServer(serverConfig);

      // Reset form
      setNewServer({
        name: "",
        description: "",
        url: "",
        enabled: false,
        headers: {},
      });

      setSelectedTab("servers");
      Alert.alert("Success", "MCP server added successfully!");
    } catch (error) {
      Alert.alert("Error", `Failed to add server: ${error}`);
    }
  };

  const getStatusColor = (status: MCPServer["status"]) => {
    switch (status) {
      case "connected":
        return "#4CAF50";
      case "connecting":
        return "#FF9500";
      case "error":
        return "#FF3B30";
      default:
        return "#8E8E93";
    }
  };

  const getStatusText = (status: MCPServer["status"]) => {
    switch (status) {
      case "connected":
        return "Connected";
      case "connecting":
        return "Connecting...";
      case "error":
        return "Error";
      default:
        return "Disconnected";
    }
  };

  const renderServerCard = (server: MCPServer) => (
    <View
      key={server.id}
      style={[styles.serverCard, isDark && styles.serverCardDark]}
    >
      <View style={styles.serverHeader}>
        <View style={styles.serverInfo}>
          <View style={styles.serverTitleRow}>
            <Text style={[styles.serverName, isDark && styles.textDark]}>
              {server.name}
            </Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(server.status) },
              ]}
            >
              <Text style={styles.statusText}>
                {getStatusText(server.status)}
              </Text>
            </View>
          </View>
          <Text
            style={[
              styles.serverDescription,
              isDark && styles.textSecondaryDark,
            ]}
          >
            {server.description}
          </Text>
          <Text
            style={[styles.serverUrl, isDark && styles.textSecondaryDark]}
            numberOfLines={1}
          >
            {server.url}
          </Text>
        </View>

        <View style={styles.serverActions}>
          <Switch
            value={server.enabled}
            onValueChange={() => handleToggleServer(server.id)}
            trackColor={{ false: "#767577", true: "#007AFF" }}
            thumbColor={server.enabled ? "#FFFFFF" : "#f4f3f4"}
          />
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => handleRemoveServer(server.id)}
          >
            <Text style={styles.removeButtonText}>×</Text>
          </TouchableOpacity>
        </View>
      </View>

      {server.error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{server.error}</Text>
        </View>
      )}

      {server.tools && server.tools.length > 0 && (
        <View style={styles.toolsContainer}>
          <Text style={[styles.toolsTitle, isDark && styles.textDark]}>
            Tools ({server.tools.length})
          </Text>
          {server.tools.map((tool) => (
            <View key={tool.name} style={styles.toolItem}>
              <View style={styles.toolInfo}>
                <Text style={[styles.toolName, isDark && styles.textDark]}>
                  {tool.name}
                </Text>
                <Text
                  style={[
                    styles.toolDescription,
                    isDark && styles.textSecondaryDark,
                  ]}
                  numberOfLines={1}
                >
                  {tool.description}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {server.lastConnected && (
        <Text
          style={[styles.lastConnected, isDark && styles.textSecondaryDark]}
        >
          Last connected: {new Date(server.lastConnected).toLocaleString()}
        </Text>
      )}
    </View>
  );

  const renderServersTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {statistics && (
        <View style={[styles.statsCard, isDark && styles.statsCardDark]}>
          <Text style={[styles.statsTitle, isDark && styles.textDark]}>
            📊 Statistics
          </Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, isDark && styles.textDark]}>
                {statistics.totalServers}
              </Text>
              <Text
                style={[styles.statLabel, isDark && styles.textSecondaryDark]}
              >
                Servers
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, isDark && styles.textDark]}>
                {statistics.connectedServers}
              </Text>
              <Text
                style={[styles.statLabel, isDark && styles.textSecondaryDark]}
              >
                Connected
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, isDark && styles.textDark]}>
                {statistics.totalTools}
              </Text>
              <Text
                style={[styles.statLabel, isDark && styles.textSecondaryDark]}
              >
                Total Tools
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, isDark && styles.textDark]}>
                {statistics.enabledTools}
              </Text>
              <Text
                style={[styles.statLabel, isDark && styles.textSecondaryDark]}
              >
                Enabled
              </Text>
            </View>
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={[styles.loadingText, isDark && styles.textDark]}>
            Loading servers...
          </Text>
        </View>
      ) : servers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🔧</Text>
          <Text style={[styles.emptyText, isDark && styles.textDark]}>
            No MCP servers configured
          </Text>
          <Text
            style={[styles.emptySubtext, isDark && styles.textSecondaryDark]}
          >
            Add a server to start using external tools
          </Text>
        </View>
      ) : (
        servers.map(renderServerCard)
      )}
    </ScrollView>
  );

  const renderToolsTab = () => {
    const enabledToolGroups = mcpService.getEnabledTools();

    return (
      <ScrollView
        style={styles.tabContent}
        showsVerticalScrollIndicator={false}
      >
        {enabledToolGroups.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔧</Text>
            <Text style={[styles.emptyText, isDark && styles.textDark]}>
              No tools available
            </Text>
            <Text
              style={[styles.emptySubtext, isDark && styles.textSecondaryDark]}
            >
              Connect to MCP servers to access their tools
            </Text>
          </View>
        ) : (
          enabledToolGroups.map((group) => {
            const server = servers.find((s) => s.id === group.serverId);
            return (
              <View
                key={group.serverId}
                style={[
                  styles.toolGroupCard,
                  isDark && styles.toolGroupCardDark,
                ]}
              >
                <Text
                  style={[styles.toolGroupTitle, isDark && styles.textDark]}
                >
                  {server?.name || group.serverId}
                </Text>
                <Text
                  style={[
                    styles.toolGroupSubtitle,
                    isDark && styles.textSecondaryDark,
                  ]}
                >
                  {group.tools.length} tool{group.tools.length !== 1 ? "s" : ""}
                </Text>

                {group.tools.map((tool) => (
                  <View key={tool.name} style={styles.toolDetailItem}>
                    <View style={styles.toolDetailHeader}>
                      <Text
                        style={[
                          styles.toolDetailName,
                          isDark && styles.textDark,
                        ]}
                      >
                        {tool.name}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.toolDetailDescription,
                        isDark && styles.textSecondaryDark,
                      ]}
                    >
                      {tool.description}
                    </Text>
                  </View>
                ))}
              </View>
            );
          })
        )}
      </ScrollView>
    );
  };

  const renderAddTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={[styles.formCard, isDark && styles.formCardDark]}>
        <Text style={[styles.formTitle, isDark && styles.textDark]}>
          Add MCP Server
        </Text>

        <View style={styles.formField}>
          <Text style={[styles.fieldLabel, isDark && styles.textDark]}>
            Name *
          </Text>
          <TextInput
            style={[styles.fieldInput, isDark && styles.fieldInputDark]}
            value={newServer.name}
            onChangeText={(text) =>
              setNewServer((prev) => ({ ...prev, name: text }))
            }
            placeholder="Enter server name"
            placeholderTextColor={isDark ? "#8E8E93" : "#999"}
          />
        </View>

        <View style={styles.formField}>
          <Text style={[styles.fieldLabel, isDark && styles.textDark]}>
            Description
          </Text>
          <TextInput
            style={[styles.fieldInput, isDark && styles.fieldInputDark]}
            value={newServer.description}
            onChangeText={(text) =>
              setNewServer((prev) => ({ ...prev, description: text }))
            }
            placeholder="Enter description"
            placeholderTextColor={isDark ? "#8E8E93" : "#999"}
          />
        </View>

        <View style={styles.formField}>
          <Text style={[styles.fieldLabel, isDark && styles.textDark]}>
            URL *
          </Text>
          <TextInput
            style={[styles.fieldInput, isDark && styles.fieldInputDark]}
            value={newServer.url}
            onChangeText={(text) =>
              setNewServer((prev) => ({ ...prev, url: text }))
            }
            placeholder="https://example.com/sse"
            placeholderTextColor={isDark ? "#8E8E93" : "#999"}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.formField}>
          <Text style={[styles.fieldLabel, isDark && styles.textDark]}>
            Headers (Optional)
          </Text>

          {newServer.headers &&
            Object.entries(newServer.headers).map(([key, value]) => (
              <View key={key} style={styles.headerItem}>
                <Text style={[styles.headerText, isDark && styles.textDark]}>
                  {key}: {value}
                </Text>
                <TouchableOpacity onPress={() => handleRemoveHeader(key)}>
                  <Text style={styles.removeHeaderText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}

          <View style={styles.headerInputRow}>
            <TextInput
              style={[styles.headerKeyInput, isDark && styles.fieldInputDark]}
              value={headerKey}
              onChangeText={setHeaderKey}
              placeholder="Header name"
              placeholderTextColor={isDark ? "#8E8E93" : "#999"}
            />
            <TextInput
              style={[styles.headerValueInput, isDark && styles.fieldInputDark]}
              value={headerValue}
              onChangeText={setHeaderValue}
              placeholder="Header value"
              placeholderTextColor={isDark ? "#8E8E93" : "#999"}
            />
            <TouchableOpacity
              style={styles.addHeaderButton}
              onPress={handleAddHeader}
            >
              <Text style={styles.addHeaderText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.formField}>
          <View style={styles.switchRow}>
            <Text style={[styles.fieldLabel, isDark && styles.textDark]}>
              Enable automatically
            </Text>
            <Switch
              value={newServer.enabled || false}
              onValueChange={(value) =>
                setNewServer((prev) => ({ ...prev, enabled: value }))
              }
              trackColor={{ false: "#767577", true: "#007AFF" }}
              thumbColor={newServer.enabled ? "#FFFFFF" : "#f4f3f4"}
            />
          </View>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.testButton, testing && styles.buttonDisabled]}
            onPress={handleTestServer}
            disabled={testing}
          >
            {testing ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.testButtonText}>Test Connection</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.addButton,
              (!newServer.name || !newServer.url) && styles.buttonDisabled,
            ]}
            onPress={handleAddServer}
            disabled={!newServer.name || !newServer.url}
          >
            <Text style={styles.addButtonText}>Add Server</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.infoCard, isDark && styles.infoCardDark]}>
        <Text style={[styles.infoTitle, isDark && styles.textDark]}>
          ℹ️ About MCP
        </Text>
        <Text style={[styles.infoText, isDark && styles.textSecondaryDark]}>
          Model Context Protocol (MCP) allows AI to access external tools and
          services through standardized interfaces.
          {"\n\n"}• SSE transport for real-time communication
          {"\n"}• Secure authentication with custom headers
          {"\n"}• Tool discovery and execution
          {"\n"}• Perfect for extending AI capabilities
        </Text>
      </View>
    </ScrollView>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

        {/* Header */}
        <View style={[styles.header, isDark && styles.headerDark]}>
          <Text style={[styles.title, isDark && styles.textDark]}>
            🔧 MCP Tools
          </Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Done</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Bar */}
        <View style={[styles.tabBar, isDark && styles.tabBarDark]}>
          <TouchableOpacity
            style={[styles.tab, selectedTab === "servers" && styles.activeTab]}
            onPress={() => setSelectedTab("servers")}
          >
            <Text
              style={[
                styles.tabText,
                selectedTab === "servers" && styles.activeTabText,
                isDark && styles.textDark,
              ]}
            >
              Servers
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, selectedTab === "tools" && styles.activeTab]}
            onPress={() => setSelectedTab("tools")}
          >
            <Text
              style={[
                styles.tabText,
                selectedTab === "tools" && styles.activeTabText,
                isDark && styles.textDark,
              ]}
            >
              Tools
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, selectedTab === "add" && styles.activeTab]}
            onPress={() => setSelectedTab("add")}
          >
            <Text
              style={[
                styles.tabText,
                selectedTab === "add" && styles.activeTabText,
                isDark && styles.textDark,
              ]}
            >
              Add Server
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {selectedTab === "servers" && renderServersTab()}
        {selectedTab === "tools" && renderToolsTab()}
        {selectedTab === "add" && renderAddTab()}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  containerDark: {
    backgroundColor: "#000000",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  headerDark: {
    backgroundColor: "#1C1C1E",
    borderBottomColor: "#2C2C2E",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  textDark: {
    color: "#FFFFFF",
  },
  textSecondaryDark: {
    color: "#8E8E93",
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  tabBarDark: {
    backgroundColor: "#1C1C1E",
    borderBottomColor: "#2C2C2E",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#007AFF",
  },
  tabText: {
    fontSize: 16,
    color: "#666",
  },
  activeTabText: {
    color: "#007AFF",
    fontWeight: "600",
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  statsCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statsCardDark: {
    backgroundColor: "#1C1C1E",
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    color: "#333",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#007AFF",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  serverCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  serverCardDark: {
    backgroundColor: "#1C1C1E",
    borderColor: "#2C2C2E",
  },
  serverHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  serverInfo: {
    flex: 1,
  },
  serverTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    gap: 8,
  },
  serverName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
  },
  serverDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  serverUrl: {
    fontSize: 12,
    color: "#999",
    fontFamily: "monospace",
  },
  serverActions: {
    alignItems: "center",
    gap: 8,
  },
  removeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FF3B30",
    alignItems: "center",
    justifyContent: "center",
  },
  removeButtonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  errorContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: "#FFE6E6",
    borderRadius: 6,
  },
  errorText: {
    color: "#D32F2F",
    fontSize: 12,
  },
  toolsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  toolsTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  toolItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  toolInfo: {
    flex: 1,
  },
  toolName: {
    fontSize: 13,
    fontWeight: "500",
    color: "#333",
  },
  toolDescription: {
    fontSize: 11,
    color: "#666",
  },
  toolSwitch: {
    transform: [{ scale: 0.8 }],
  },
  lastConnected: {
    fontSize: 10,
    color: "#999",
    marginTop: 8,
    textAlign: "right",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  toolGroupCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  toolGroupCardDark: {
    backgroundColor: "#1C1C1E",
  },
  toolGroupTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  toolGroupSubtitle: {
    fontSize: 12,
    color: "#666",
    marginBottom: 12,
  },
  toolDetailItem: {
    marginBottom: 8,
  },
  toolDetailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toolDetailName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  toolEnabledBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#4CAF50",
    alignItems: "center",
    justifyContent: "center",
  },
  toolEnabledText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  toolDetailDescription: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  formCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  formCardDark: {
    backgroundColor: "#1C1C1E",
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  formField: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#FFF",
  },
  fieldInputDark: {
    backgroundColor: "#2C2C2E",
    borderColor: "#48484A",
    color: "#FFF",
  },
  headerItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F5F5F5",
    padding: 8,
    borderRadius: 6,
    marginBottom: 4,
  },
  headerText: {
    fontSize: 12,
    color: "#333",
    fontFamily: "monospace",
  },
  removeHeaderText: {
    color: "#FF3B30",
    fontSize: 18,
    fontWeight: "bold",
  },
  headerInputRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  headerKeyInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
  },
  headerValueInput: {
    flex: 2,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
  },
  addHeaderButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
  },
  addHeaderText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  testButton: {
    flex: 1,
    backgroundColor: "#FF9500",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  testButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  addButton: {
    flex: 1,
    backgroundColor: "#4CAF50",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  addButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  infoCard: {
    backgroundColor: "#F0F8FF",
    borderRadius: 12,
    padding: 16,
  },
  infoCardDark: {
    backgroundColor: "#1A1A2E",
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
});
