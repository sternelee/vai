import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  AIConfig,
  AIModel,
  AIProvider,
  aiService,
} from "../../services/AIService";

interface AIProviderConfigProps {
  visible: boolean;
  onClose: () => void;
  onConfigSaved?: () => void;
}

export default function AIProviderConfig({
  visible,
  onClose,
  onConfigSaved,
}: AIProviderConfigProps) {
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<AIProvider | null>(
    null,
  );
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);
  const [config, setConfig] = useState<{ [key: string]: string }>({});
  const [currentConfig, setCurrentConfig] = useState<AIConfig | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible]);

  const loadData = async () => {
    try {
      const availableProviders = aiService.getProviders();
      setProviders(availableProviders);

      const savedConfig = aiService.getConfig();
      setCurrentConfig(savedConfig);

      if (savedConfig) {
        const provider = availableProviders.find(
          (p) => p.id === savedConfig.provider,
        );
        if (provider) {
          setSelectedProvider(provider);
          const model = provider.models.find((m) => m.id === savedConfig.model);
          if (model) {
            setSelectedModel(model);
          }

          // Load saved configuration values
          const configValues: { [key: string]: string } = {};
          provider.configFields.forEach((field) => {
            if (savedConfig[field.key]) {
              configValues[field.key] = savedConfig[field.key];
            }
          });
          setConfig(configValues);
        }
      }
    } catch (error) {
      console.error("Failed to load AI config:", error);
    }
  };

  const handleProviderSelect = (provider: AIProvider) => {
    setSelectedProvider(provider);
    setSelectedModel(null);

    // Initialize config with empty values
    const initialConfig: { [key: string]: string } = {};
    provider.configFields.forEach((field) => {
      initialConfig[field.key] = "";
    });
    setConfig(initialConfig);
  };

  const handleModelSelect = (model: AIModel) => {
    setSelectedModel(model);
  };

  const handleConfigChange = (key: string, value: string) => {
    setConfig((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const testConfiguration = async () => {
    if (!selectedProvider || !selectedModel) {
      Alert.alert("Error", "Please select a provider and model");
      return;
    }

    // Validate required fields
    const missingFields = selectedProvider.configFields
      .filter((field) => field.required && !config[field.key])
      .map((field) => field.label);

    if (missingFields.length > 0) {
      Alert.alert(
        "Error",
        `Please fill in required fields: ${missingFields.join(", ")}`,
      );
      return;
    }

    setTesting(true);
    try {
      const testConfig: AIConfig = {
        provider: selectedProvider.id,
        model: selectedModel.id,
        ...config,
      };

      const success = await aiService.testProvider(testConfig);

      if (success) {
        Alert.alert(
          "Success",
          "Configuration test passed! The AI provider is working correctly.",
        );
      } else {
        Alert.alert(
          "Error",
          "Configuration test failed. Please check your settings.",
        );
      }
    } catch (error) {
      Alert.alert("Error", `Test failed: ${error}`);
    } finally {
      setTesting(false);
    }
  };

  const saveConfiguration = async () => {
    if (!selectedProvider || !selectedModel) {
      Alert.alert("Error", "Please select a provider and model");
      return;
    }

    // Validate required fields
    const missingFields = selectedProvider.configFields
      .filter((field) => field.required && !config[field.key])
      .map((field) => field.label);

    if (missingFields.length > 0) {
      Alert.alert(
        "Error",
        `Please fill in required fields: ${missingFields.join(", ")}`,
      );
      return;
    }

    setSaving(true);
    try {
      const newConfig: AIConfig = {
        provider: selectedProvider.id,
        model: selectedModel.id,
        ...config,
      };

      await aiService.saveConfig(newConfig);

      Alert.alert("Success", "AI configuration saved successfully!", [
        {
          text: "OK",
          onPress: () => {
            onConfigSaved?.();
            onClose();
          },
        },
      ]);
    } catch (error) {
      Alert.alert("Error", `Failed to save configuration: ${error}`);
    } finally {
      setSaving(false);
    }
  };

  const clearConfiguration = () => {
    Alert.alert(
      "Clear Configuration",
      "Are you sure you want to clear the AI configuration?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              await aiService.clearConfig();
              setSelectedProvider(null);
              setSelectedModel(null);
              setConfig({});
              setCurrentConfig(null);
              Alert.alert("Success", "Configuration cleared successfully");
            } catch (error) {
              Alert.alert("Error", `Failed to clear configuration: ${error}`);
            }
          },
        },
      ],
    );
  };

  const renderProviderCard = (provider: AIProvider) => (
    <TouchableOpacity
      key={provider.id}
      style={[
        styles.providerCard,
        selectedProvider?.id === provider.id && styles.selectedProviderCard,
      ]}
      onPress={() => handleProviderSelect(provider)}
    >
      <View style={styles.providerHeader}>
        <Text style={styles.providerIcon}>{provider.icon}</Text>
        <View style={styles.providerInfo}>
          <Text style={styles.providerName}>{provider.name}</Text>
          <Text style={styles.providerDescription}>{provider.description}</Text>
        </View>
        {currentConfig?.provider === provider.id && (
          <View style={styles.currentBadge}>
            <Text style={styles.currentBadgeText}>Current</Text>
          </View>
        )}
      </View>
      <Text style={styles.modelCount}>
        {provider.models.length} models available
      </Text>
    </TouchableOpacity>
  );

  const renderModelCard = (model: AIModel) => (
    <TouchableOpacity
      key={model.id}
      style={[
        styles.modelCard,
        selectedModel?.id === model.id && styles.selectedModelCard,
      ]}
      onPress={() => handleModelSelect(model)}
    >
      <Text style={styles.modelName}>{model.name}</Text>
      <Text style={styles.modelDescription}>{model.description}</Text>

      <View style={styles.capabilityTags}>
        {model.capabilities.imageInput && (
          <View style={styles.capabilityTag}>
            <Text style={styles.capabilityText}>📷 Image</Text>
          </View>
        )}
        {model.capabilities.toolUsage && (
          <View style={styles.capabilityTag}>
            <Text style={styles.capabilityText}>🔧 Tools</Text>
          </View>
        )}
        {model.capabilities.objectGeneration && (
          <View style={styles.capabilityTag}>
            <Text style={styles.capabilityText}>📊 Objects</Text>
          </View>
        )}
        {model.capabilities.imageGeneration && (
          <View style={styles.capabilityTag}>
            <Text style={styles.capabilityText}>🎨 Generate</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderConfigField = (field: any) => (
    <View key={field.key} style={styles.configField}>
      <Text style={styles.configLabel}>
        {field.label}
        {field.required && <Text style={styles.required}> *</Text>}
      </Text>

      {field.type === "select" ? (
        <View style={styles.selectContainer}>
          {field.options?.map((option: any) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.selectOption,
                config[field.key] === option.value &&
                  styles.selectedSelectOption,
              ]}
              onPress={() => handleConfigChange(field.key, option.value)}
            >
              <Text
                style={[
                  styles.selectOptionText,
                  config[field.key] === option.value &&
                    styles.selectedSelectOptionText,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <TextInput
          style={styles.configInput}
          value={config[field.key] || ""}
          onChangeText={(value) => handleConfigChange(field.key, value)}
          placeholder={field.placeholder}
          secureTextEntry={field.type === "password"}
          keyboardType={field.type === "number" ? "numeric" : "default"}
          autoCapitalize="none"
          autoCorrect={false}
        />
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>🤖 AI Provider Configuration</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Current Status */}
          {currentConfig && (
            <View style={styles.statusCard}>
              <Text style={styles.statusTitle}>Current Configuration</Text>
              <Text style={styles.statusText}>
                Provider: {currentConfig.provider} | Model:{" "}
                {currentConfig.model}
              </Text>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={clearConfiguration}
              >
                <Text style={styles.clearButtonText}>Clear Configuration</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Provider Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Select AI Provider</Text>
            <Text style={styles.sectionDescription}>
              Choose from {providers.length} supported AI providers
            </Text>

            {providers.map(renderProviderCard)}
          </View>

          {/* Model Selection */}
          {selectedProvider && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>2. Select Model</Text>
              <Text style={styles.sectionDescription}>
                Choose from {selectedProvider.models.length} available models
              </Text>

              {selectedProvider.models.map(renderModelCard)}
            </View>
          )}

          {/* Configuration */}
          {selectedProvider && selectedModel && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>3. Configuration</Text>
              <Text style={styles.sectionDescription}>
                Configure your {selectedProvider.name} settings
              </Text>

              {selectedProvider.configFields.map(renderConfigField)}
            </View>
          )}

          {/* Actions */}
          {selectedProvider && selectedModel && (
            <View style={styles.actionSection}>
              <TouchableOpacity
                style={[styles.actionButton, styles.testButton]}
                onPress={testConfiguration}
                disabled={testing}
              >
                {testing ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.actionButtonText}>
                    🧪 Test Configuration
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.saveButton]}
                onPress={saveConfiguration}
                disabled={saving || testing}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.actionButtonText}>
                    💾 Save Configuration
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Information */}
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>ℹ️ Information</Text>
            <Text style={styles.infoText}>
              • All API keys are stored securely on your device{"\n"}• Test your
              configuration before saving{"\n"}• You can change providers
              anytime{"\n"}• Different models have different capabilities
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
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
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statusCard: {
    backgroundColor: "#E8F5E8",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2D5A2D",
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    color: "#5A7A5A",
    marginBottom: 12,
  },
  clearButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#FF6B6B",
    borderRadius: 6,
  },
  clearButtonText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  providerCard: {
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#E0E0E0",
  },
  selectedProviderCard: {
    borderColor: "#007AFF",
    backgroundColor: "#F0F8FF",
  },
  providerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  providerIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  providerDescription: {
    fontSize: 14,
    color: "#666",
  },
  currentBadge: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentBadgeText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
  },
  modelCount: {
    fontSize: 12,
    color: "#888",
  },
  modelCard: {
    backgroundColor: "#FFF",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  selectedModelCard: {
    borderColor: "#007AFF",
    backgroundColor: "#F0F8FF",
  },
  modelName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  modelDescription: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
  },
  capabilityTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  capabilityTag: {
    backgroundColor: "#F0F0F0",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  capabilityText: {
    fontSize: 10,
    color: "#666",
  },
  configField: {
    marginBottom: 16,
  },
  configLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  required: {
    color: "#FF6B6B",
  },
  configInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#FFF",
    fontSize: 14,
  },
  selectContainer: {
    gap: 8,
  },
  selectOption: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    backgroundColor: "#FFF",
  },
  selectedSelectOption: {
    borderColor: "#007AFF",
    backgroundColor: "#F0F8FF",
  },
  selectOptionText: {
    fontSize: 14,
    color: "#333",
  },
  selectedSelectOptionText: {
    color: "#007AFF",
    fontWeight: "600",
  },
  actionSection: {
    gap: 12,
    marginBottom: 32,
  },
  actionButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  testButton: {
    backgroundColor: "#FF9500",
  },
  saveButton: {
    backgroundColor: "#4CAF50",
  },
  actionButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  infoSection: {
    backgroundColor: "#F0F8FF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
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

