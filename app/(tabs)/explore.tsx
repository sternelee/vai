import AIProviderConfig from '@/components/browser/AIProviderConfig';
import MCPManager from '@/components/browser/MCPManager';
import { useColorScheme } from '@/hooks/useColorScheme';
import { aiService } from '@/services/AIService';
import { databaseService } from '@/services/DatabaseService';
import { mcpService } from '@/services/MCPService';
import { performanceService } from '@/services/PerformanceService';
import { userScriptService } from '@/services/UserScriptService';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [showAIConfig, setShowAIConfig] = useState(false);
  const [showMCPManager, setShowMCPManager] = useState(false);
  const [aiStatus, setAiStatus] = useState<any>(null);
  const [mcpStats, setMcpStats] = useState<any>(null);
  const [performanceStats, setPerformanceStats] = useState<any>(null);
  const [scriptStats, setScriptStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState({
    autoSaveHistory: true,
    incognitoMode: false,
    darkTheme: isDark,
    javascriptEnabled: true,
    popupBlocked: true,
    adBlockEnabled: false,
    performanceMonitoring: true,
    userScriptsEnabled: true,
    mcpEnabled: true,
  });

  useEffect(() => {
    loadSettings();
    loadStats();
  }, []);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      
      // Load AI status
      const status = aiService.getProviderStatus();
      setAiStatus(status);

      // Load MCP statistics
      const mcpStatistics = mcpService.getStatistics();
      setMcpStats(mcpStatistics);

      // Load other settings
      const savedSettings = await AsyncStorage.getItem('app_settings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsedSettings }));
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Load performance stats
      const perfStats = performanceService.getPerformanceStats();
      setPerformanceStats(perfStats);

      // Load script stats
      const scriptStats = userScriptService.getScriptStats();
      setScriptStats(scriptStats);

      // Load MCP stats
      const mcpStatistics = mcpService.getStatistics();
      setMcpStats(mcpStatistics);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const updateSetting = async (key: string, value: any) => {
    try {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      await AsyncStorage.setItem('app_settings', JSON.stringify(newSettings));
    } catch (error) {
      console.error('Failed to save setting:', error);
    }
  };

  const clearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'This will clear all browsing data including history, bookmarks, user scripts, and settings. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear all storage
              await AsyncStorage.clear();
              
              // Clear database
              await databaseService.clearAllData();
              
              // Clear performance data
              performanceService.clearAllCaches();
              
              // Reset state
              setSettings({
                autoSaveHistory: true,
                incognitoMode: false,
                darkTheme: isDark,
                javascriptEnabled: true,
                popupBlocked: true,
                adBlockEnabled: false,
                performanceMonitoring: true,
                userScriptsEnabled: true,
                mcpEnabled: true,
              });
              
              setAiStatus(null);
              
              Alert.alert('Success', 'All data cleared successfully');
            } catch (error) {
              console.error('Failed to clear data:', error);
              Alert.alert('Error', 'Failed to clear data');
            }
          },
        },
      ]
    );
  };

  const clearCacheOnly = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear performance cache and temporary data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          onPress: () => {
            performanceService.clearAllCaches();
            Alert.alert('Success', 'Cache cleared successfully');
          },
        },
      ]
    );
  };

  const exportData = () => {
    Alert.alert(
      'Export Data',
      'Export browsing data and user scripts (feature coming soon)',
      [{ text: 'OK' }]
    );
  };

  const showAbout = () => {
    Alert.alert(
      'About VaiBrowser',
      'VaiBrowser v1.0.0\n\n🚀 Performance Optimized\n🐒 User Scripts Support\n🤖 Multi-AI Provider Support\n📱 Built with React Native & Expo\n\nCombining the lightweight design of Via Browser with modern AI capabilities and advanced performance optimization.',
      [{ text: 'OK' }]
    );
  };

  const SettingSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
        {title}
      </Text>
      <View style={[styles.sectionContent, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
        {children}
      </View>
    </View>
  );

  const SettingRow = ({ 
    icon, 
    title, 
    subtitle, 
    rightComponent,
    onPress,
    badge 
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    rightComponent?: React.ReactNode;
    onPress?: () => void;
    badge?: string;
  }) => (
    <TouchableOpacity
      style={[
        styles.settingRow,
        { borderBottomColor: isDark ? '#2C2C2E' : '#E5E5EA' }
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingLeft}>
        <Ionicons name={icon as any} size={22} color="#007AFF" />
        <View style={styles.settingText}>
          <View style={styles.settingTitleRow}>
            <Text style={[styles.settingTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
              {title}
            </Text>
            {badge && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{badge}</Text>
              </View>
            )}
          </View>
          {subtitle && (
            <Text style={[styles.settingSubtitle, { color: isDark ? '#8E8E93' : '#6B6B6B' }]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {rightComponent}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
        <Text style={[styles.headerTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
          Settings
        </Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* AI Configuration */}
        <SettingSection title="🤖 AI Configuration">
          <SettingRow
            icon="sparkles"
            title="AI Provider"
            subtitle={aiStatus?.configured 
              ? `${aiStatus.provider} - ${aiStatus.model}` 
              : 'Not configured'
            }
            onPress={() => setShowAIConfig(true)}
            rightComponent={
              <View style={styles.statusRow}>
                <View style={[styles.statusBadge, { 
                  backgroundColor: aiStatus?.ready ? '#34C759' : '#FF3B30' 
                }]}>
                  <Text style={styles.statusText}>
                    {aiStatus?.ready ? 'READY' : 'OFF'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
              </View>
            }
          />
        </SettingSection>

        {/* Performance */}
        <SettingSection title="🚀 Performance">
          <SettingRow
            icon="speedometer"
            title="Performance Monitoring"
            subtitle={performanceStats 
              ? `${performanceStats.totalTabs} tabs • ${Math.round(performanceStats.averageMemoryUsage / 1024 / 1024)}MB`
              : 'Monitor memory and performance'
            }
            rightComponent={
              <Switch
                value={settings.performanceMonitoring}
                onValueChange={(value) => updateSetting('performanceMonitoring', value)}
                trackColor={{ false: '#767577', true: '#007AFF' }}
                thumbColor={settings.performanceMonitoring ? '#FFFFFF' : '#f4f3f4'}
              />
            }
          />
          
          <SettingRow
            icon="refresh"
            title="Clear Cache"
            subtitle="Clear performance cache and temporary data"
            onPress={clearCacheOnly}
            rightComponent={
              <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
            }
          />
        </SettingSection>

        {/* User Scripts */}
        <SettingSection title="🐒 User Scripts">
          <SettingRow
            icon="code-slash"
            title="User Scripts"
            subtitle={scriptStats 
              ? `${scriptStats.totalScripts} scripts • ${scriptStats.enabledScripts} enabled`
              : 'Manage user scripts'
            }
            rightComponent={
              <Switch
                value={settings.userScriptsEnabled}
                onValueChange={(value) => updateSetting('userScriptsEnabled', value)}
                trackColor={{ false: '#767577', true: '#007AFF' }}
                thumbColor={settings.userScriptsEnabled ? '#FFFFFF' : '#f4f3f4'}
              />
            }
          />
        </SettingSection>

        {/* Privacy & Security */}
        <SettingSection title="🔒 Privacy & Security">
          <SettingRow
            icon="eye-off"
            title="Incognito Mode"
            subtitle="Private browsing"
            rightComponent={
              <Switch
                value={settings.incognitoMode}
                onValueChange={(value) => updateSetting('incognitoMode', value)}
                trackColor={{ false: '#767577', true: '#007AFF' }}
                thumbColor={settings.incognitoMode ? '#FFFFFF' : '#f4f3f4'}
              />
            }
          />
          
          <SettingRow
            icon="time"
            title="Auto-save History"
            subtitle="Automatically save browsing history"
            rightComponent={
              <Switch
                value={settings.autoSaveHistory}
                onValueChange={(value) => updateSetting('autoSaveHistory', value)}
                trackColor={{ false: '#767577', true: '#007AFF' }}
                thumbColor={settings.autoSaveHistory ? '#FFFFFF' : '#f4f3f4'}
              />
            }
          />
          
          <SettingRow
            icon="shield"
            title="Block Popups"
            subtitle="Prevent popup windows"
            rightComponent={
              <Switch
                value={settings.popupBlocked}
                onValueChange={(value) => updateSetting('popupBlocked', value)}
                trackColor={{ false: '#767577', true: '#007AFF' }}
                thumbColor={settings.popupBlocked ? '#FFFFFF' : '#f4f3f4'}
              />
            }
          />
        </SettingSection>

        {/* Browser Settings */}
        <SettingSection title="🌐 Browser">
          <SettingRow
            icon="code"
            title="JavaScript"
            subtitle="Enable JavaScript execution"
            rightComponent={
              <Switch
                value={settings.javascriptEnabled}
                onValueChange={(value) => updateSetting('javascriptEnabled', value)}
                trackColor={{ false: '#767577', true: '#007AFF' }}
                thumbColor={settings.javascriptEnabled ? '#FFFFFF' : '#f4f3f4'}
              />
            }
          />
          
          <SettingRow
            icon="moon"
            title="Dark Theme"
            subtitle="Follow system setting"
            rightComponent={
              <Switch
                value={settings.darkTheme}
                onValueChange={(value) => updateSetting('darkTheme', value)}
                trackColor={{ false: '#767577', true: '#007AFF' }}
                thumbColor={settings.darkTheme ? '#FFFFFF' : '#f4f3f4'}
              />
            }
          />
          
          <SettingRow
            icon="ban"
            title="Ad Blocker"
            subtitle="Block advertisements"
            rightComponent={
              <Switch
                value={settings.adBlockEnabled}
                onValueChange={(value) => updateSetting('adBlockEnabled', value)}
                trackColor={{ false: '#767577', true: '#007AFF' }}
                thumbColor={settings.adBlockEnabled ? '#FFFFFF' : '#f4f3f4'}
              />
            }
          />
        </SettingSection>

        {/* Data Management */}
        <SettingSection title="💾 Data">
          <SettingRow
            icon="download"
            title="Export Data"
            subtitle="Export browsing data and scripts"
            onPress={exportData}
            badge="Soon"
            rightComponent={
              <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
            }
          />
          
          <SettingRow
            icon="trash"
            title="Clear All Data"
            subtitle="Clear history, bookmarks, scripts, and settings"
            onPress={clearAllData}
            rightComponent={
              <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
            }
          />
        </SettingSection>

        {/* About */}
        <SettingSection title="ℹ️ About">
          <SettingRow
            icon="information-circle"
            title="About VaiBrowser"
            subtitle="Version 1.0.0 - Multi-AI & Performance Optimized"
            onPress={showAbout}
            rightComponent={
              <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
            }
          />
        </SettingSection>

        {/* MCP Tools */}
        <SettingSection title="🔧 MCP Tools">
          <SettingRow
            icon="extension-puzzle"
            title="MCP Servers"
            subtitle={mcpStats 
              ? `${mcpStats.connectedServers}/${mcpStats.totalServers} connected • ${mcpStats.enabledTools} tools`
              : 'Model Context Protocol tools'
            }
            onPress={() => setShowMCPManager(true)}
            rightComponent={
              <View style={styles.statusRow}>
                <View style={[styles.statusBadge, { 
                  backgroundColor: mcpStats?.connectedServers > 0 ? '#4CAF50' : '#8E8E93' 
                }]}>
                  <Text style={styles.statusText}>
                    {mcpStats?.connectedServers > 0 ? 'ACTIVE' : 'OFF'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
              </View>
            }
          />
          
          <SettingRow
            icon="settings"
            title="Enable MCP Tools"
            subtitle="Allow AI to use external tools via MCP"
            rightComponent={
              <Switch
                value={settings.mcpEnabled}
                onValueChange={(value) => updateSetting('mcpEnabled', value)}
                trackColor={{ false: '#767577', true: '#007AFF' }}
                thumbColor={settings.mcpEnabled ? '#FFFFFF' : '#f4f3f4'}
              />
            }
          />
        </SettingSection>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: isDark ? '#8E8E93' : '#6B6B6B' }]}>
            VaiBrowser - Smart browsing with AI, Performance & Scripts 🚀✨🐒
          </Text>
        </View>
      </ScrollView>

      {/* AI Provider Config Modal */}
      <AIProviderConfig
        visible={showAIConfig}
        onClose={() => setShowAIConfig(false)}
        onConfigSaved={() => {
          loadSettings();
          loadStats();
        }}
      />

      {/* MCP Manager Modal */}
      <MCPManager
        visible={showMCPManager}
        onClose={() => {
          setShowMCPManager(false);
          loadStats(); // Refresh stats when closing
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 20,
    marginBottom: 8,
  },
  sectionContent: {
    borderRadius: 12,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  badge: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
