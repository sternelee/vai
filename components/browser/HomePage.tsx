import { getThemeColors } from "@/constants/ArcTheme";
import { useColorScheme } from "@/hooks/useColorScheme";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface HomePageShortcut {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  addedAt: string;
}

interface HomePageProps {
  onNavigate: (url: string) => void;
  onShowAIChat: () => void;
  onShowResourceSniffer: () => void;
  onShowUserScripts: () => void;
  onShowDownloads: () => void;
  onShowBookmarks: () => void;
  onShowHistory: () => void;
  shortcuts: HomePageShortcut[];
  onUpdateShortcuts: (shortcuts: HomePageShortcut[]) => void;
  currentPageUrl?: string;
  currentPageTitle?: string;
  aiConfigured: boolean;
}

const { width: screenWidth } = Dimensions.get("window");
const SHORTCUT_WIDTH = (screenWidth - 60) / 3; // 3 columns with padding

export default function HomePage({
  onNavigate,
  onShowAIChat,
  onShowResourceSniffer,
  onShowUserScripts,
  onShowDownloads,
  onShowBookmarks,
  onShowHistory,
  shortcuts,
  onUpdateShortcuts,
  currentPageUrl,
  currentPageTitle,
  aiConfigured,
}: HomePageProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const themeColors = getThemeColors(isDark);

  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = () => {
    if (searchQuery.trim()) {
      const query = searchQuery.trim() || "";
      if (query.includes(".") && !query.includes(" ")) {
        // 看起来像URL
        const url = query.startsWith("http") ? query : `https://${query}`;
        onNavigate(url);
      } else {
        // 搜索查询
        onNavigate(
          `https://www.google.com/search?q=${encodeURIComponent(query)}`,
        );
      }
      setSearchQuery("");
    }
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case "ai":
        onShowAIChat();
        break;
      case "resources":
        onShowResourceSniffer();
        break;
      case "scripts":
        onShowUserScripts();
        break;
      case "downloads":
        onShowDownloads();
        break;
      case "bookmarks":
        onShowBookmarks();
        break;
      case "history":
        onShowHistory();
        break;
    }
  };

  const handleAddCurrentPage = () => {
    if (!currentPageUrl || !currentPageTitle) {
      Alert.alert("无法添加", "当前页面信息不完整");
      return;
    }

    // 检查是否已经存在
    const exists = shortcuts.some(
      (shortcut) => shortcut.url === currentPageUrl,
    );
    if (exists) {
      Alert.alert("已存在", "该页面已经添加到主页");
      return;
    }

    const newShortcut: HomePageShortcut = {
      id: Date.now().toString(),
      title: currentPageTitle,
      url: currentPageUrl,
      addedAt: new Date().toISOString(),
    };

    const updatedShortcuts = [...shortcuts, newShortcut];
    onUpdateShortcuts(updatedShortcuts);
    Alert.alert("添加成功", `"${currentPageTitle}" 已添加到主页`);
  };

  const quickActions = [
    {
      id: "ai_chat",
      title: "AI Chat",
      icon: "sparkles",
      color: "#007AFF",
      onPress: onShowAIChat,
    },
    {
      id: "resources",
      title: "资源嗅探",
      icon: "search-outline",
      color: "#34C759",
      onPress: onShowResourceSniffer,
    },
    {
      id: "downloads",
      title: "下载管理",
      icon: "download-outline",
      color: "#FF9500",
      onPress: onShowDownloads,
    },
    {
      id: "bookmarks",
      title: "书签",
      icon: "bookmark-outline",
      color: "#FF3B30",
      onPress: onShowBookmarks,
    },
    {
      id: "history",
      title: "历史记录",
      icon: "time-outline",
      color: "#5856D6",
      onPress: onShowHistory,
    },
    {
      id: "scripts",
      title: "用户脚本",
      icon: "code-outline",
      color: "#AF52DE",
      onPress: onShowUserScripts,
    },
  ];

  // 常用网站推荐
  const recommendedSites = [
    {
      id: "google",
      title: "Google",
      url: "https://www.google.com",
      favicon: "https://www.google.com/favicon.ico",
    },
    {
      id: "github",
      title: "GitHub",
      url: "https://github.com",
      favicon: "https://github.com/favicon.ico",
    },
    {
      id: "stackoverflow",
      title: "Stack Overflow",
      url: "https://stackoverflow.com",
      favicon: "https://stackoverflow.com/favicon.ico",
    },
    {
      id: "youtube",
      title: "YouTube",
      url: "https://www.youtube.com",
      favicon: "https://www.youtube.com/favicon.ico",
    },
    {
      id: "twitter",
      title: "Twitter",
      url: "https://twitter.com",
      favicon: "https://twitter.com/favicon.ico",
    },
    {
      id: "reddit",
      title: "Reddit",
      url: "https://www.reddit.com",
      favicon: "https://www.reddit.com/favicon.ico",
    },
  ];

  const handleRemoveShortcut = (shortcutId: string) => {
    Alert.alert("删除快捷方式", "确定要删除这个快捷方式吗？", [
      { text: "取消", style: "cancel" },
      {
        text: "删除",
        style: "destructive",
        onPress: () => {
          const updatedShortcuts = shortcuts.filter((s) => s.id !== shortcutId);
          onUpdateShortcuts(updatedShortcuts);
        },
      },
    ]);
  };

  const renderQuickAction = (action: (typeof quickActions)[0]) => (
    <TouchableOpacity
      key={action.id}
      style={[
        styles.quickActionCard,
        { backgroundColor: isDark ? "#2C2C2E" : "#FFFFFF" },
      ]}
      onPress={action.onPress}
    >
      <View
        style={[
          styles.quickActionIcon,
          { backgroundColor: `${action.color}20` },
        ]}
      >
        <Ionicons name={action.icon as any} size={24} color={action.color} />
      </View>
      <Text
        style={[
          styles.quickActionTitle,
          { color: isDark ? "#FFFFFF" : "#000000" },
        ]}
      >
        {action.title}
      </Text>
    </TouchableOpacity>
  );

  const renderShortcut = (
    shortcut: HomePageShortcut | (typeof recommendedSites)[0],
    isCustom = false,
  ) => (
    <TouchableOpacity
      key={shortcut.id}
      style={[
        styles.shortcutCard,
        { backgroundColor: isDark ? "#2C2C2E" : "#FFFFFF" },
      ]}
      onPress={() => onNavigate(shortcut.url)}
      onLongPress={
        isCustom ? () => handleRemoveShortcut(shortcut.id) : undefined
      }
    >
      <View style={styles.shortcutIcon}>
        {shortcut.favicon ? (
          <Image
            source={{ uri: shortcut.favicon }}
            style={styles.favicon}
            onError={() => {
              /* 处理图标加载失败 */
            }}
          />
        ) : (
          <Ionicons
            name="globe-outline"
            size={24}
            color={isDark ? "#8E8E93" : "#6B6B6B"}
          />
        )}
      </View>
      <Text
        style={[
          styles.shortcutTitle,
          { color: isDark ? "#FFFFFF" : "#000000" },
        ]}
        numberOfLines={2}
      >
        {shortcut.title}
      </Text>
      {isCustom && (
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveShortcut(shortcut.id)}
        >
          <Ionicons name="close-circle" size={16} color="#FF3B30" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: isDark ? "#000000" : "#F2F2F7" },
      ]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text
          style={[
            styles.welcomeText,
            { color: isDark ? "#FFFFFF" : "#000000" },
          ]}
        >
          欢迎使用 VaiBrowser
        </Text>
        <Text
          style={[
            styles.subtitleText,
            { color: isDark ? "#8E8E93" : "#6B6B6B" },
          ]}
        >
          智能浏览，AI助力
        </Text>
      </View>

      {/* Search Bar */}
      <View
        style={[
          styles.searchContainer,
          { backgroundColor: isDark ? "#2C2C2E" : "#FFFFFF" },
        ]}
      >
        <Ionicons
          name="search"
          size={20}
          color={isDark ? "#8E8E93" : "#6B6B6B"}
          style={styles.searchIcon}
        />
        <TextInput
          style={[
            styles.searchInput,
            { color: isDark ? "#FFFFFF" : "#000000" },
          ]}
          placeholder="搜索或输入网址"
          placeholderTextColor={isDark ? "#8E8E93" : "#6B6B6B"}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons
              name="close-circle"
              size={20}
              color={isDark ? "#8E8E93" : "#6B6B6B"}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Add Current Page Button */}
      {currentPageUrl && currentPageUrl !== "https://www.google.com" && (
        <TouchableOpacity
          style={[styles.addPageButton, { backgroundColor: "#007AFF" }]}
          onPress={handleAddCurrentPage}
        >
          <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
          <Text style={styles.addPageText}>添加当前页面到主页</Text>
        </TouchableOpacity>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text
          style={[
            styles.sectionTitle,
            { color: isDark ? "#FFFFFF" : "#000000" },
          ]}
        >
          快速操作
        </Text>
        <View style={styles.quickActionsGrid}>
          {quickActions.map(renderQuickAction)}
        </View>
      </View>

      {/* AI Chat Highlight */}
      {aiConfigured && (
        <TouchableOpacity
          style={[styles.aiChatHighlight, { backgroundColor: "#007AFF" }]}
          onPress={onShowAIChat}
        >
          <View style={styles.aiChatContent}>
            <Ionicons name="sparkles" size={32} color="#FFFFFF" />
            <View style={styles.aiChatTextContainer}>
              <Text style={styles.aiChatTitle}>AI 智能助手</Text>
              <Text style={styles.aiChatSubtitle}>
                点击开始智能对话，获得个性化帮助
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      )}

      {/* Custom Shortcuts */}
      {shortcuts.length > 0 && (
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              { color: isDark ? "#FFFFFF" : "#000000" },
            ]}
          >
            我的快捷方式
          </Text>
          <View style={styles.shortcutsGrid}>
            {shortcuts.map((shortcut) => renderShortcut(shortcut, true))}
          </View>
        </View>
      )}

      {/* Recommended Sites */}
      <View style={styles.section}>
        <Text
          style={[
            styles.sectionTitle,
            { color: isDark ? "#FFFFFF" : "#000000" },
          ]}
        >
          推荐网站
        </Text>
        <View style={styles.shortcutsGrid}>
          {recommendedSites.map((site) => renderShortcut(site, false))}
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text
          style={[styles.footerText, { color: isDark ? "#8E8E93" : "#6B6B6B" }]}
        >
          VaiBrowser - 让浏览更智能
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 16,
    fontWeight: "400",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
  },
  addPageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  addPageText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  quickActionCard: {
    width: (screenWidth - 60) / 2,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  aiChatHighlight: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  aiChatContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  aiChatTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  aiChatTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  aiChatSubtitle: {
    color: "#FFFFFF",
    fontSize: 14,
    opacity: 0.9,
  },
  shortcutsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  shortcutCard: {
    width: SHORTCUT_WIDTH,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  shortcutIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F2F2F7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  favicon: {
    width: 24,
    height: 24,
    borderRadius: 4,
  },
  shortcutTitle: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 16,
  },
  removeButton: {
    position: "absolute",
    top: 4,
    right: 4,
  },
  footer: {
    alignItems: "center",
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
    fontWeight: "400",
  },
});

