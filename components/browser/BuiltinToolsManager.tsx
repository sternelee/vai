import { useColorScheme } from '@/hooks/useColorScheme';
import { builtinToolsService, type ToolCategory } from '@/services/BuiltinToolsService';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface BuiltinToolsManagerProps {
  visible: boolean;
  onClose: () => void;
}

interface ConfigValues {
  [key: string]: string;
}

export default function BuiltinToolsManager({ visible, onClose }: BuiltinToolsManagerProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [toolCategories, setToolCategories] = useState<Record<string, ToolCategory>>({});
  const [enabledTools, setEnabledTools] = useState<string[]>([]);
  const [expandedTool, setExpandedTool] = useState<string | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, ConfigValues>>({});
  const [loading, setLoading] = useState(false);
  const [testingTool, setTestingTool] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible]);

  const loadData = async () => {
    try {
      const categories = builtinToolsService.getToolCategories();
      const enabled = builtinToolsService.getEnabledTools();
      
      setToolCategories(categories);
      setEnabledTools(enabled);

      // Load existing config values
      const configData: Record<string, ConfigValues> = {};
      for (const toolId of Object.keys(categories)) {
        const toolConfig = builtinToolsService.getToolConfig(toolId);
        if (toolConfig?.config) {
          configData[toolId] = { ...toolConfig.config };
        } else {
          configData[toolId] = {};
        }
      }
      setConfigValues(configData);
    } catch (error) {
      console.error('加载工具配置失败:', error);
    }
  };

  const handleToggleTool = async (toolId: string, enabled: boolean) => {
    try {
      setLoading(true);
      
      if (enabled) {
        const category = toolCategories[toolId];
        const config = configValues[toolId] || {};
        
        // Check required fields
        if (category.requiresConfig && category.configFields) {
          const missingFields = category.configFields
            .filter(field => field.required && !config[field.key])
            .map(field => field.label);
          
          if (missingFields.length > 0) {
            Alert.alert(
              '配置不完整',
              `请先配置以下必填项：\n${missingFields.join('\n')}`,
              [{ text: '确定' }]
            );
            setLoading(false);
            return;
          }
        }
        
        await builtinToolsService.enableTool(toolId, config);
        setEnabledTools(prev => [...prev.filter(id => id !== toolId), toolId]);
      } else {
        await builtinToolsService.disableTool(toolId);
        setEnabledTools(prev => prev.filter(id => id !== toolId));
      }
    } catch (error) {
      console.error('切换工具状态失败:', error);
      Alert.alert('错误', '操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = async (toolId: string, field: string, value: string) => {
    const newConfigValues = {
      ...configValues,
      [toolId]: {
        ...configValues[toolId],
        [field]: value
      }
    };
    setConfigValues(newConfigValues);

    // Auto-save if tool is enabled
    if (enabledTools.includes(toolId)) {
      try {
        await builtinToolsService.updateToolConfig(toolId, newConfigValues[toolId]);
      } catch (error) {
        console.error('保存配置失败:', error);
      }
    }
  };

  const handleTestTool = async (toolId: string) => {
    try {
      setTestingTool(toolId);
      const result = await builtinToolsService.testToolConnection(toolId);
      
      if (result.success) {
        Alert.alert(
          '测试成功',
          `工具配置正确，找到 ${result.toolCount} 个可用功能`,
          [{ text: '确定' }]
        );
      } else {
        Alert.alert('测试失败', result.error || '未知错误');
      }
    } catch (error) {
      Alert.alert('测试失败', `连接测试出错: ${error}`);
    } finally {
      setTestingTool(null);
    }
  };

  const renderConfigField = (toolId: string, field: any) => {
    const value = configValues[toolId]?.[field.key] || '';
    const isEnabled = enabledTools.includes(toolId);

    switch (field.type) {
      case 'password':
      case 'text':
        return (
          <View key={field.key} style={styles.configField}>
            <Text style={[styles.fieldLabel, isDark && styles.fieldLabelDark]}>
              {field.label}
              {field.required && <Text style={styles.required}> *</Text>}
            </Text>
            {field.description && (
              <Text style={[styles.fieldDescription, isDark && styles.fieldDescriptionDark]}>
                {field.description}
              </Text>
            )}
            <TextInput
              style={[
                styles.configInput,
                isDark && styles.configInputDark,
                !isEnabled && styles.configInputDisabled
              ]}
              value={value}
              onChangeText={(text) => handleConfigChange(toolId, field.key, text)}
              placeholder={field.placeholder}
              placeholderTextColor={isDark ? '#8E8E93' : '#999'}
              secureTextEntry={field.type === 'password'}
              editable={!loading}
            />
          </View>
        );

      case 'select':
        return (
          <View key={field.key} style={styles.configField}>
            <Text style={[styles.fieldLabel, isDark && styles.fieldLabelDark]}>
              {field.label}
              {field.required && <Text style={styles.required}> *</Text>}
            </Text>
            {field.description && (
              <Text style={[styles.fieldDescription, isDark && styles.fieldDescriptionDark]}>
                {field.description}
              </Text>
            )}
            <View style={[styles.selectContainer, isDark && styles.selectContainerDark]}>
              {field.options?.map((option: any) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.selectOption,
                    value === option.value && styles.selectOptionSelected,
                    value === option.value && isDark && styles.selectOptionSelectedDark
                  ]}
                  onPress={() => handleConfigChange(toolId, field.key, option.value)}
                  disabled={loading}
                >
                  <Text style={[
                    styles.selectOptionText,
                    value === option.value && styles.selectOptionTextSelected,
                    isDark && styles.selectOptionTextDark
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  const renderToolCategory = (toolId: string, category: ToolCategory) => {
    const isEnabled = enabledTools.includes(toolId);
    const isExpanded = expandedTool === toolId;
    const currentConfig = configValues[toolId] || {};
    const hasRequiredConfig = !category.requiresConfig || 
      category.configFields?.every(field => !field.required || currentConfig[field.key]) || false;

    return (
      <View key={toolId} style={[styles.toolCard, isDark && styles.toolCardDark]}>
        <TouchableOpacity
          style={styles.toolHeader}
          onPress={() => setExpandedTool(isExpanded ? null : toolId)}
        >
          <View style={styles.toolHeaderLeft}>
            <View style={[styles.toolIcon, { backgroundColor: category.color }]}>
              <Ionicons 
                name={category.icon as any} 
                size={24} 
                color="white" 
              />
            </View>
            <View style={styles.toolInfo}>
              <Text style={[styles.toolName, isDark && styles.toolNameDark]}>
                {category.name}
              </Text>
              <Text style={[styles.toolDescription, isDark && styles.toolDescriptionDark]}>
                {category.description}
              </Text>
              {category.requiresConfig && !hasRequiredConfig && (
                <Text style={styles.configRequired}>
                  需要配置
                </Text>
              )}
            </View>
          </View>
          <View style={styles.toolHeaderRight}>
            <Switch
              value={isEnabled}
              onValueChange={(enabled) => handleToggleTool(toolId, enabled)}
              disabled={loading}
              trackColor={{ false: '#767577', true: category.color }}
              thumbColor={isEnabled ? '#f4f3f4' : '#f4f3f4'}
            />
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={isDark ? '#8E8E93' : '#666'}
              style={styles.expandIcon}
            />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.toolContent}>
            {category.configFields && category.configFields.length > 0 && (
              <View style={styles.configSection}>
                <Text style={[styles.configSectionTitle, isDark && styles.configSectionTitleDark]}>
                  配置选项
                </Text>
                {category.configFields.map(field => renderConfigField(toolId, field))}
              </View>
            )}

            {isEnabled && (
              <TouchableOpacity
                style={[styles.testButton, { backgroundColor: category.color }]}
                onPress={() => handleTestTool(toolId)}
                disabled={testingTool === toolId || loading}
              >
                {testingTool === toolId ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons name="checkmark-circle" size={16} color="white" />
                )}
                <Text style={styles.testButtonText}>
                  {testingTool === toolId ? '测试中...' : '测试连接'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={[styles.container, isDark && styles.containerDark]}>
        <View style={[styles.header, isDark && styles.headerDark]}>
          <Text style={[styles.title, isDark && styles.titleDark]}>
            内置工具配置
          </Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <Ionicons
              name="close"
              size={24}
              color={isDark ? '#fff' : '#000'}
            />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={[styles.subtitle, isDark && styles.subtitleDark]}>
            启用和配置各种内置工具，增强 AI 助手的功能
          </Text>

          {Object.entries(toolCategories).map(([toolId, category]) =>
            renderToolCategory(toolId, category)
          )}

          <View style={styles.footer}>
            <Text style={[styles.footerText, isDark && styles.footerTextDark]}>
              工具配置会自动保存。启用工具后，AI 助手将能够使用相应的功能。
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
    backgroundColor: '#fff',
  },
  containerDark: {
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerDark: {
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  titleDark: {
    color: '#fff',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginVertical: 16,
    lineHeight: 20,
  },
  subtitleDark: {
    color: '#999',
  },
  toolCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  toolCardDark: {
    backgroundColor: '#1c1c1e',
  },
  toolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  toolHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toolIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  toolInfo: {
    flex: 1,
  },
  toolName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  toolNameDark: {
    color: '#fff',
  },
  toolDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  toolDescriptionDark: {
    color: '#999',
  },
  configRequired: {
    fontSize: 12,
    color: '#ff3b30',
    marginTop: 4,
    fontWeight: '500',
  },
  toolHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expandIcon: {
    marginLeft: 8,
  },
  toolContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  configSection: {
    marginBottom: 16,
  },
  configSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  configSectionTitleDark: {
    color: '#fff',
  },
  configField: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  fieldLabelDark: {
    color: '#fff',
  },
  required: {
    color: '#ff3b30',
  },
  fieldDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    lineHeight: 16,
  },
  fieldDescriptionDark: {
    color: '#999',
  },
  configInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#000',
  },
  configInputDark: {
    borderColor: '#333',
    backgroundColor: '#2c2c2e',
    color: '#fff',
  },
  configInputDisabled: {
    opacity: 0.6,
  },
  selectContainer: {
    gap: 8,
  },
  selectContainerDark: {
    // No specific dark styles needed
  },
  selectOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  selectOptionSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  selectOptionSelectedDark: {
    backgroundColor: '#0A84FF',
    borderColor: '#0A84FF',
  },
  selectOptionText: {
    fontSize: 14,
    color: '#000',
    textAlign: 'center',
  },
  selectOptionTextSelected: {
    color: '#fff',
    fontWeight: '500',
  },
  selectOptionTextDark: {
    color: '#fff',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },
  footerTextDark: {
    color: '#999',
  },
}); 