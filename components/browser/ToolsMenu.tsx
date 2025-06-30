import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import BottomSheet from '../ui/BottomSheet';

interface ToolItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  color: string;
  onPress: () => void;
  badge?: string;
  disabled?: boolean;
}

interface ToolsMenuProps {
  isVisible: boolean;
  onClose: () => void;
  tools: ToolItem[];
  title?: string;
  subtitle?: string;
}

export default function ToolsMenu({
  isVisible,
  onClose,
  tools,
  title = '工具菜单',
  subtitle = '选择要使用的功能',
}: ToolsMenuProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const handleToolPress = (tool: ToolItem) => {
    if (!tool.disabled) {
      tool.onPress();
      onClose();
    }
  };

  const renderToolItem = (tool: ToolItem) => (
    <TouchableOpacity
      key={tool.id}
      style={[
        styles.toolItem,
        {
          backgroundColor: isDark ? '#2C2C2E' : '#F8F9FA',
          opacity: tool.disabled ? 0.5 : 1,
        },
      ]}
      onPress={() => handleToolPress(tool)}
      disabled={tool.disabled}
      activeOpacity={0.7}
    >
      <View style={styles.toolItemLeft}>
        <View
          style={[
            styles.toolIcon,
            {
              backgroundColor: `${tool.color}20`,
            },
          ]}
        >
          <Ionicons
            name={tool.icon as any}
            size={24}
            color={tool.color}
          />
        </View>

        <View style={styles.toolInfo}>
          <View style={styles.toolTitleRow}>
            <Text
              style={[
                styles.toolTitle,
                { color: isDark ? '#FFFFFF' : '#000000' },
              ]}
            >
              {tool.title}
            </Text>
            {tool.badge && (
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: tool.color,
                  },
                ]}
              >
                <Text style={styles.badgeText}>{tool.badge}</Text>
              </View>
            )}
          </View>

          {tool.subtitle && (
            <Text
              style={[
                styles.toolSubtitle,
                { color: isDark ? '#8E8E93' : '#6B6B6B' },
              ]}
            >
              {tool.subtitle}
            </Text>
          )}
        </View>
      </View>

      <Ionicons
        name="chevron-forward"
        size={20}
        color={isDark ? '#8E8E93' : '#6B6B6B'}
      />
    </TouchableOpacity>
  );

  const groupedTools = tools.reduce((groups: { [key: string]: ToolItem[] }, tool) => {
    const category = tool.id.split('_')[0];
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(tool);
    return groups;
  }, {});

  const renderToolGroup = (category: string, tools: ToolItem[]) => (
    <View key={category} style={styles.toolGroup}>
      <Text
        style={[
          styles.groupTitle,
          { color: isDark ? '#8E8E93' : '#6B6B6B' },
        ]}
      >
        {getCategoryTitle(category)}
      </Text>
      <View style={styles.groupContent}>
        {tools.map(renderToolItem)}
      </View>
    </View>
  );

  const getCategoryTitle = (category: string): string => {
    const titles: { [key: string]: string } = {
      ai: '🤖 AI 功能',
      browser: '🌐 浏览器',
      tools: '🔧 工具',
      settings: '⚙️ 设置',
      data: '💾 数据管理',
      other: '📱 其他',
    };
    return titles[category] || '其他';
  };

  return (
    <BottomSheet
      isVisible={isVisible}
      onClose={onClose}
      height={600}
      enableBackdropClose={true}
      enableSwipeDown={true}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text
              style={[
                styles.title,
                { color: isDark ? '#FFFFFF' : '#000000' },
              ]}
            >
              {title}
            </Text>
            <Text
              style={[
                styles.subtitle,
                { color: isDark ? '#8E8E93' : '#6B6B6B' },
              ]}
            >
              {subtitle}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <Ionicons
              name="close"
              size={24}
              color={isDark ? '#8E8E93' : '#6B6B6B'}
            />
          </TouchableOpacity>
        </View>

        {/* Tools List */}
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {Object.keys(groupedTools).length > 1 ? (
            Object.entries(groupedTools).map(([category, tools]) =>
              renderToolGroup(category, tools)
            )
          ) : (
            <View style={styles.toolGroup}>
              <View style={styles.groupContent}>
                {tools.map(renderToolItem)}
              </View>
            </View>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <Text
              style={[
                styles.footerText,
                { color: isDark ? '#8E8E93' : '#6B6B6B' },
              ]}
            >
              向上滑动可关闭菜单
            </Text>
          </View>
        </ScrollView>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    marginBottom: 20,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  closeButton: {
    padding: 8,
    marginLeft: 16,
  },
  scrollView: {
    flex: 1,
  },
  toolGroup: {
    marginBottom: 24,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  groupContent: {
    gap: 12,
  },
  toolItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toolItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toolIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  toolInfo: {
    flex: 1,
  },
  toolTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  toolTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  toolSubtitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 14,
  },
});