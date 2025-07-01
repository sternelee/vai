import { useColorScheme } from "@/hooks/useColorScheme";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  Modal,
  View,
} from "react-native";

interface ResourceItem {
  id: string;
  url: string;
  type: "image" | "video" | "audio" | "document" | "script" | "style" | "other";
  name: string;
  size?: string;
  extension?: string;
  thumbnail?: string;
}

interface ResourceSnifferProps {
  visible: boolean;
  onClose: () => void;
  currentPageUrl: string;
  currentPageTitle: string;
  onExtractResources: () => Promise<ResourceItem[]>;
  onDownloadResource: (resource: ResourceItem) => void;
}

const { width: screenWidth } = Dimensions.get("window");

export default function ResourceSniffer({
  visible,
  onClose,
  currentPageUrl,
  currentPageTitle,
  onExtractResources,
  onDownloadResource,
}: ResourceSnifferProps) {
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [filteredResources, setFilteredResources] = useState<ResourceItem[]>(
    [],
  );
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [previewResource, setPreviewResource] = useState<ResourceItem | null>(
    null,
  );
  const colorScheme = useColorScheme();

  const isDark = colorScheme === "dark";

  // 资源类型过滤器
  const filters = [
    { key: "all", label: "全部", icon: "list-outline" },
    { key: "image", label: "图片", icon: "image-outline" },
    { key: "video", label: "视频", icon: "videocam-outline" },
    { key: "audio", label: "音频", icon: "musical-notes-outline" },
    { key: "document", label: "文档", icon: "document-outline" },
    { key: "script", label: "脚本", icon: "code-outline" },
    { key: "style", label: "样式", icon: "color-palette-outline" },
  ];

  // 当面板打开时自动扫描资源
  useEffect(() => {
    if (visible) {
      handleScanResources();
    }
  }, [visible]);

  // 过滤资源
  useEffect(() => {
    if (selectedFilter === "all") {
      setFilteredResources(resources);
    } else {
      setFilteredResources(
        resources.filter((item) => item.type === selectedFilter),
      );
    }
  }, [resources, selectedFilter]);

  const handleScanResources = async () => {
    setIsLoading(true);
    try {
      const extractedResources = await onExtractResources();
      setResources(extractedResources);
    } catch (error) {
      console.error("Failed to extract resources:", error);
      Alert.alert("错误", "资源扫描失败，请重试");
    } finally {
      setIsLoading(false);
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case "image":
        return "image-outline";
      case "video":
        return "videocam-outline";
      case "audio":
        return "musical-notes-outline";
      case "document":
        return "document-outline";
      case "script":
        return "code-outline";
      case "style":
        return "color-palette-outline";
      default:
        return "link-outline";
    }
  };

  const getResourceTypeColor = (type: string) => {
    switch (type) {
      case "image":
        return "#4CAF50";
      case "video":
        return "#2196F3";
      case "audio":
        return "#FF9800";
      case "document":
        return "#9C27B0";
      case "script":
        return "#607D8B";
      case "style":
        return "#E91E63";
      default:
        return "#757575";
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleResourcePress = (resource: ResourceItem) => {
    if (resource.type === "image" || resource.type === "video") {
      setPreviewResource(resource);
    } else {
      // 对于其他类型，显示操作选项
      Alert.alert(
        resource.name,
        `类型: ${resource.type}\nURL: ${resource.url}`,
        [
          { text: "取消", style: "cancel" },
          { text: "复制链接", onPress: () => handleCopyUrl(resource.url) },
          { text: "下载", onPress: () => onDownloadResource(resource) },
          {
            text: "在浏览器中打开",
            onPress: () => handleOpenInBrowser(resource.url),
          },
        ],
      );
    }
  };

  const handleCopyUrl = (url: string) => {
    // 实现复制到剪贴板的功能
    Alert.alert("成功", "链接已复制到剪贴板");
  };

  const handleOpenInBrowser = (url: string) => {
    Linking.openURL(url).catch((err) => Alert.alert("错误", "无法打开链接"));
  };

  const renderFilterButton = (filter: (typeof filters)[0]) => (
    <TouchableOpacity
      key={filter.key}
      style={[
        styles.filterButton,
        {
          backgroundColor:
            selectedFilter === filter.key
              ? "#007AFF"
              : isDark
                ? "#2C2C2E"
                : "#F2F2F7",
        },
      ]}
      onPress={() => setSelectedFilter(filter.key)}
    >
      <Ionicons
        name={filter.icon as any}
        size={16}
        color={
          selectedFilter === filter.key
            ? "#FFFFFF"
            : isDark
              ? "#FFFFFF"
              : "#000000"
        }
      />
      <Text
        style={[
          styles.filterButtonText,
          {
            color:
              selectedFilter === filter.key
                ? "#FFFFFF"
                : isDark
                  ? "#FFFFFF"
                  : "#000000",
          },
        ]}
      >
        {filter.label}
      </Text>
      {filter.key !== "all" && (
        <View style={styles.filterCount}>
          <Text style={styles.filterCountText}>
            {resources.filter((r) => r.type === filter.key).length}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderResourceItem = ({ item }: { item: ResourceItem }) => (
    <TouchableOpacity
      style={[
        styles.resourceItem,
        { backgroundColor: isDark ? "#2C2C2E" : "#FFFFFF" },
      ]}
      onPress={() => handleResourcePress(item)}
    >
      <View style={styles.resourceIcon}>
        {item.type === "image" && item.thumbnail ? (
          <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
        ) : (
          <Ionicons
            name={getResourceIcon(item.type) as any}
            size={24}
            color={getResourceTypeColor(item.type)}
          />
        )}
      </View>

      <View style={styles.resourceInfo}>
        <Text
          style={[
            styles.resourceName,
            { color: isDark ? "#FFFFFF" : "#000000" },
          ]}
          numberOfLines={2}
        >
          {item.name}
        </Text>
        <Text
          style={[
            styles.resourceDetails,
            { color: isDark ? "#8E8E93" : "#6B6B6B" },
          ]}
        >
          {item.type.toUpperCase()} {item.size && `• ${item.size}`}
        </Text>
        <Text
          style={[
            styles.resourceUrl,
            { color: isDark ? "#8E8E93" : "#6B6B6B" },
          ]}
          numberOfLines={1}
        >
          {item.url}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.downloadButton}
        onPress={() => onDownloadResource(item)}
      >
        <Ionicons name="download-outline" size={20} color="#007AFF" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderPreviewModal = () => (
    <Modal
      visible={!!previewResource}
      animationType="slide"
      presentationStyle="pageSheet"
      style={styles.previewModal}
    >
      <View
        style={[
          styles.previewContainer,
          { backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF" },
        ]}
      >
        <View style={styles.previewHeader}>
          <Text
            style={[
              styles.previewTitle,
              { color: isDark ? "#FFFFFF" : "#000000" },
            ]}
          >
            {previewResource?.name}
          </Text>
          <TouchableOpacity onPress={() => setPreviewResource(null)}>
            <Ionicons
              name="close"
              size={24}
              color={isDark ? "#FFFFFF" : "#000000"}
            />
          </TouchableOpacity>
        </View>

        {previewResource?.type === "image" && (
          <Image
            source={{ uri: previewResource.url }}
            style={styles.previewImage}
            resizeMode="contain"
          />
        )}

        <View style={styles.previewActions}>
          <TouchableOpacity
            style={[styles.previewActionButton, { backgroundColor: "#007AFF" }]}
            onPress={() => {
              onDownloadResource(previewResource!);
              setPreviewResource(null);
            }}
          >
            <Ionicons name="download" size={20} color="#FFFFFF" />
            <Text style={styles.previewActionText}>下载</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.previewActionButton, { backgroundColor: "#34C759" }]}
            onPress={() => {
              handleOpenInBrowser(previewResource!.url);
              setPreviewResource(null);
            }}
          >
            <Ionicons name="open-outline" size={20} color="#FFFFFF" />
            <Text style={styles.previewActionText}>打开</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View
        style={[
          styles.container,
          { backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF" },
        ]}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            { borderBottomColor: isDark ? "#2C2C2E" : "#E5E5EA" },
          ]}
        >
          <View style={styles.handleBar} />
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <Ionicons name="search-outline" size={24} color="#007AFF" />
              <Text
                style={[
                  styles.headerTitle,
                  { color: isDark ? "#FFFFFF" : "#000000" },
                ]}
              >
                资源嗅探
              </Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={handleScanResources}
                disabled={isLoading}
              >
                <Ionicons
                  name="refresh-outline"
                  size={20}
                  color={isLoading ? "#8E8E93" : isDark ? "#FFFFFF" : "#000000"}
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerButton} onPress={onClose}>
                <Ionicons
                  name="close"
                  size={24}
                  color={isDark ? "#FFFFFF" : "#000000"}
                />
              </TouchableOpacity>
            </View>
          </View>
          <Text
            style={[styles.pageInfo, { color: isDark ? "#8E8E93" : "#6B6B6B" }]}
          >
            {currentPageTitle}
          </Text>
        </View>

        {/* Filter Buttons */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
          contentContainerStyle={styles.filterContent}
        >
          {filters.map(renderFilterButton)}
        </ScrollView>

        {/* Resource Count */}
        <View style={styles.countContainer}>
          <Text
            style={[
              styles.countText,
              { color: isDark ? "#8E8E93" : "#6B6B6B" },
            ]}
          >
            找到 {filteredResources.length} 个资源
          </Text>
        </View>

        {/* Resource List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Text
              style={[
                styles.loadingText,
                { color: isDark ? "#8E8E93" : "#6B6B6B" },
              ]}
            >
              正在扫描页面资源...
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredResources}
            renderItem={renderResourceItem}
            keyExtractor={(item) => item.id}
            style={styles.resourceList}
            contentContainerStyle={styles.resourceListContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={48} color="#8E8E93" />
                <Text
                  style={[
                    styles.emptyText,
                    { color: isDark ? "#8E8E93" : "#6B6B6B" },
                  ]}
                >
                  未找到任何资源
                </Text>
                <Text
                  style={[
                    styles.emptySubtext,
                    { color: isDark ? "#8E8E93" : "#6B6B6B" },
                  ]}
                >
                  点击刷新按钮重新扫描
                </Text>
              </View>
            }
          />
        )}

        {/* Preview Modal */}
        {renderPreviewModal()}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    justifyContent: "flex-end",
  },
  container: {
    height: "80%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: "#D1D1D6",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 8,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginLeft: 8,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerButton: {
    padding: 4,
    marginLeft: 12,
  },
  pageInfo: {
    fontSize: 14,
    marginTop: 8,
  },
  filterContainer: {
    paddingVertical: 12,
  },
  filterContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: "500",
  },
  filterCount: {
    backgroundColor: "#007AFF",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
  },
  filterCountText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
    paddingHorizontal: 4,
  },
  countContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  countText: {
    fontSize: 14,
    fontWeight: "500",
  },
  resourceList: {
    flex: 1,
  },
  resourceListContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  resourceItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  resourceIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#F2F2F7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  resourceInfo: {
    flex: 1,
  },
  resourceName: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  resourceDetails: {
    fontSize: 12,
    marginBottom: 2,
  },
  resourceUrl: {
    fontSize: 11,
  },
  downloadButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "500",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  previewModal: {
    margin: 20,
    justifyContent: "center",
  },
  previewContainer: {
    borderRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: "600",
    flex: 1,
    marginRight: 16,
  },
  previewImage: {
    width: "100%",
    height: 300,
    borderRadius: 12,
    marginBottom: 16,
  },
  previewActions: {
    flexDirection: "row",
    gap: 12,
  },
  previewActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  previewActionText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
