import { ArcTheme, getThemeColors } from "@/constants/ArcTheme";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import BottomSheet from "../ui/BottomSheet";

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
  title = "浏览器工具",
  subtitle = "选择要使用的功能",
}: ToolsMenuProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const themeColors = getThemeColors(isDark);

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
          backgroundColor: themeColors.card,
          borderColor: themeColors.border,
          opacity: tool.disabled ? 0.5 : 1,
          // Arc-style shadow
          ...ArcTheme.shadows.sm,
        },
      ]}
      onPress={() => handleToolPress(tool)}
      disabled={tool.disabled}
      activeOpacity={0.8}
    >
      <View style={styles.toolItemContent}>
        {/* Arc-style icon container with gradient background */}
        <View
          style={[
            styles.toolIcon,
            {
              backgroundColor: `${tool.color}15`,
              borderColor: `${tool.color}25`,
            },
          ]}
        >
          <Ionicons name={tool.icon as any} size={24} color={tool.color} />
        </View>

        {/* Tool information */}
        <View style={styles.toolInfo}>
          <View style={styles.toolTitleRow}>
            <Text
              style={[styles.toolTitle, { color: themeColors.text.primary }]}
              numberOfLines={1}
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
                { color: themeColors.text.secondary },
              ]}
              numberOfLines={2}
            >
              {tool.subtitle}
            </Text>
          )}
        </View>

        {/* Arc-style chevron */}
        <View style={styles.chevronContainer}>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={themeColors.text.tertiary}
          />
        </View>
      </View>
    </TouchableOpacity>
  );

  const groupedTools = tools.reduce(
    (groups: { [key: string]: ToolItem[] }, tool) => {
      const category = tool.id.split("_")[0];
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(tool);
      return groups;
    },
    {},
  );

  const renderToolGroup = (category: string, tools: ToolItem[]) => (
    <View key={category} style={styles.toolGroup}>
      <Text style={[styles.groupTitle, { color: themeColors.text.secondary }]}>
        {getCategoryTitle(category)}
      </Text>
      <View style={styles.groupContent}>{tools.map(renderToolItem)}</View>
    </View>
  );

  const getCategoryTitle = (category: string): string => {
    const titles: { [key: string]: string } = {
      ai: "🤖 AI 功能",
      browser: "🌐 浏览器",
      tools: "🔧 工具",
      settings: "⚙️ 设置",
      data: "💾 数据管理",
      other: "📱 其他",
    };
    return titles[category] || "其他";
  };

  return (
    <BottomSheet
      isVisible={isVisible}
      onClose={onClose}
      height={Platform.OS === "ios" ? 650 : 600}
      enableBackdropClose={true}
      enableSwipeDown={true}
      showHandle={true}
    >
      <View style={styles.container}>
        {/* Arc-style header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={[styles.title, { color: themeColors.text.primary }]}>
              {title}
            </Text>
            <Text
              style={[styles.subtitle, { color: themeColors.text.secondary }]}
            >
              {subtitle}
            </Text>
          </View>

          {/* Arc-style close button */}
          <TouchableOpacity
            style={[
              styles.closeButton,
              {
                backgroundColor: themeColors.surface,
                borderColor: themeColors.border,
              },
            ]}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Ionicons
              name="close"
              size={18}
              color={themeColors.text.secondary}
            />
          </TouchableOpacity>
        </View>

        {/* Tools grid with Arc-style layout */}
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {Object.keys(groupedTools).length > 1 ? (
            Object.entries(groupedTools).map(([category, tools]) =>
              renderToolGroup(category, tools),
            )
          ) : (
            <View style={styles.toolGroup}>
              <View style={styles.groupContent}>
                {tools.map(renderToolItem)}
              </View>
            </View>
          )}

          {/* Arc-style footer with hint */}
          <View style={styles.footer}>
            <View
              style={[
                styles.footerHint,
                {
                  backgroundColor: themeColors.surface,
                  borderColor: themeColors.border,
                },
              ]}
            >
              <Ionicons
                name="information-circle"
                size={16}
                color={ArcTheme.colors.primary}
                style={styles.hintIcon}
              />
              <Text
                style={[
                  styles.footerText,
                  { color: themeColors.text.tertiary },
                ]}
              >
                向下滑动或点击背景可关闭菜单
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  } as const,
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: ArcTheme.spacing.lg,
    marginBottom: ArcTheme.spacing.base,
  } as const,
  headerContent: {
    flex: 1,
    paddingRight: ArcTheme.spacing.base,
  } as const,
  title: {
    fontSize: ArcTheme.typography.fontSize["2xl"],
    fontWeight: "700" as const,
    marginBottom: ArcTheme.spacing.xs,
    lineHeight:
      ArcTheme.typography.lineHeight.tight *
      ArcTheme.typography.fontSize["2xl"],
  } as const,
  subtitle: {
    fontSize: ArcTheme.typography.fontSize.base,
    fontWeight: "400" as const,
    lineHeight:
      ArcTheme.typography.lineHeight.normal * ArcTheme.typography.fontSize.base,
  } as const,
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: ArcTheme.borderRadius.base,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    ...ArcTheme.shadows.sm,
  } as const,
  scrollView: {
    flex: 1,
  } as const,
  scrollContent: {
    paddingBottom: ArcTheme.spacing.xl,
  } as const,
  toolGroup: {
    marginBottom: ArcTheme.spacing.xl,
  } as const,
  groupTitle: {
    fontSize: ArcTheme.typography.fontSize.lg,
    fontWeight: "600" as const,
    marginBottom: ArcTheme.spacing.base,
    paddingHorizontal: ArcTheme.spacing.xs,
  } as const,
  groupContent: {
    gap: ArcTheme.spacing.sm,
  } as const,
  toolItem: {
    borderRadius: ArcTheme.borderRadius.lg,
    borderWidth: 1,
    overflow: "hidden",
  } as const,
  toolItemContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: ArcTheme.spacing.base,
  } as const,
  toolIcon: {
    width: 48,
    height: 48,
    borderRadius: ArcTheme.borderRadius.base,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginRight: ArcTheme.spacing.base,
  } as const,
  toolInfo: {
    flex: 1,
    marginRight: ArcTheme.spacing.sm,
  } as const,
  toolTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: ArcTheme.spacing.xs,
  } as const,
  toolTitle: {
    fontSize: ArcTheme.typography.fontSize.base,
    fontWeight: "600" as const,
    flex: 1,
    lineHeight:
      ArcTheme.typography.lineHeight.tight * ArcTheme.typography.fontSize.base,
  } as const,
  toolSubtitle: {
    fontSize: ArcTheme.typography.fontSize.sm,
    fontWeight: "400" as const,
    lineHeight:
      ArcTheme.typography.lineHeight.normal * ArcTheme.typography.fontSize.sm,
  } as const,
  badge: {
    paddingHorizontal: ArcTheme.spacing.sm,
    paddingVertical: ArcTheme.spacing.xs,
    borderRadius: ArcTheme.borderRadius.full,
    marginLeft: ArcTheme.spacing.sm,
    minWidth: 20,
    alignItems: "center",
  } as const,
  badgeText: {
    color: "#FFFFFF",
    fontSize: ArcTheme.typography.fontSize.xs,
    fontWeight: "600" as const,
  } as const,
  chevronContainer: {
    padding: ArcTheme.spacing.xs,
  } as const,
  footer: {
    marginTop: ArcTheme.spacing.lg,
    alignItems: "center",
  } as const,
  footerHint: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: ArcTheme.spacing.base,
    paddingVertical: ArcTheme.spacing.sm,
    borderRadius: ArcTheme.borderRadius.full,
    borderWidth: 1,
  } as const,
  hintIcon: {
    marginRight: ArcTheme.spacing.xs,
  } as const,
  footerText: {
    fontSize: ArcTheme.typography.fontSize.sm,
    fontWeight: "400" as const,
  } as const,
});

