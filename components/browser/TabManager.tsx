import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Dimensions,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_WIDTH = Math.min(180, SCREEN_WIDTH / 2.5);

export interface Tab {
  id: string;
  url: string;
  title: string;
  canGoBack: boolean;
  canGoForward: boolean;
  isLoading: boolean;
  progress: number;
  favicon?: string;
  isActive: boolean;
  isIncognito?: boolean;
  lastVisited?: string;
}

interface TabManagerProps {
  tabs: Tab[];
  activeTabId: string;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onNewTab: (isIncognito?: boolean) => void;
  onCloseAllTabs: () => void;
  maxTabs?: number;
}

export default function TabManager({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onNewTab,
  onCloseAllTabs,
  maxTabs = 10,
}: TabManagerProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [showActions, setShowActions] = useState(false);
  const translateX = useRef(new Animated.Value(0)).current;

  const handleTabClose = (tabId: string) => {
    if (tabs.length <= 1) {
      Alert.alert(
        'Cannot Close Tab',
        'You need at least one tab open.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Close Tab',
      'Are you sure you want to close this tab?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close',
          style: 'destructive',
          onPress: () => onTabClose(tabId),
        },
      ]
    );
  };

  const handleNewTab = () => {
    if (tabs.length >= maxTabs) {
      Alert.alert(
        'Maximum Tabs Reached',
        `You can only have ${maxTabs} tabs open at once.`,
        [{ text: 'OK' }]
      );
      return;
    }
    onNewTab();
  };

  const handleNewIncognitoTab = () => {
    if (tabs.length >= maxTabs) {
      Alert.alert(
        'Maximum Tabs Reached',
        `You can only have ${maxTabs} tabs open at once.`,
        [{ text: 'OK' }]
      );
      return;
    }
    onNewTab(true);
  };

  const handleCloseAllTabs = () => {
    Alert.alert(
      'Close All Tabs',
      'Are you sure you want to close all tabs? This will create a new tab.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close All',
          style: 'destructive',
          onPress: onCloseAllTabs,
        },
      ]
    );
  };

  const getDomainFromUrl = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return domain.replace('www.', '');
    } catch {
      return 'New Tab';
    }
  };

  const getTabTitle = (tab: Tab) => {
    if (tab.title && tab.title !== 'Loading...') {
      return tab.title.length > 20 ? `${tab.title.substring(0, 20)}...` : tab.title;
    }
    const domain = getDomainFromUrl(tab.url);
    return domain === 'New Tab' ? 'New Tab' : domain;
  };

  const getTabIcon = (tab: Tab) => {
    if (tab.isIncognito) {
      return 'eye-off';
    }
    if (tab.isLoading) {
      return 'reload';
    }
    if (tab.url.startsWith('https://')) {
      return 'lock-closed';
    }
    return 'globe';
  };

  const renderTabItem = ({ item: tab, index }: { item: Tab; index: number }) => {
    const isActive = tab.id === activeTabId;
    
    return (
      <TouchableOpacity
        style={[
          styles.tabItem,
          {
            backgroundColor: isActive 
              ? (isDark ? '#2C2C2E' : '#FFFFFF')
              : (isDark ? '#1C1C1E' : '#F2F2F7'),
            borderColor: isActive 
              ? '#007AFF' 
              : (isDark ? '#2C2C2E' : '#E5E5EA'),
            ...(tab.isIncognito && {
              backgroundColor: isDark ? '#1A1A1A' : '#F0F0F0',
              borderLeftWidth: 4,
              borderLeftColor: '#8E44AD',
            }),
          }
        ]}
        onPress={() => onTabSelect(tab.id)}
        activeOpacity={0.8}
      >
        {/* Tab Header */}
        <View style={styles.tabHeader}>
          <View style={styles.tabInfo}>
            <Ionicons
              name={getTabIcon(tab) as any}
              size={16}
              color={
                tab.isIncognito 
                  ? '#8E44AD'
                  : isActive 
                    ? '#007AFF' 
                    : (isDark ? '#8E8E93' : '#6B6B6B')
              }
              style={styles.tabIcon}
            />
            
            <Text
              style={[
                styles.tabTitle,
                {
                  color: isActive 
                    ? (isDark ? '#FFFFFF' : '#000000')
                    : (isDark ? '#8E8E93' : '#6B6B6B'),
                  fontWeight: isActive ? '600' : '400',
                }
              ]}
              numberOfLines={1}
            >
              {getTabTitle(tab)}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => handleTabClose(tab.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="close"
              size={16}
              color={isDark ? '#8E8E93' : '#6B6B6B'}
            />
          </TouchableOpacity>
        </View>

        {/* Tab URL */}
        <Text
          style={[
            styles.tabUrl,
            { color: isDark ? '#8E8E93' : '#6B6B6B' }
          ]}
          numberOfLines={1}
        >
          {getDomainFromUrl(tab.url)}
        </Text>

        {/* Loading Progress */}
        {tab.isLoading && tab.progress > 0 && (
          <View style={styles.progressContainer}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${tab.progress * 100}%`,
                  backgroundColor: tab.isIncognito ? '#8E44AD' : '#007AFF',
                }
              ]}
            />
          </View>
        )}

        {/* Active Indicator */}
        {isActive && (
          <View
            style={[
              styles.activeIndicator,
              { backgroundColor: tab.isIncognito ? '#8E44AD' : '#007AFF' }
            ]}
          />
        )}
      </TouchableOpacity>
    );
  };

  const renderTabActions = () => (
    <View style={[styles.actionsContainer, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}
        onPress={handleNewTab}
      >
        <Ionicons name="add" size={24} color="#007AFF" />
        <Text style={[styles.actionText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
          New Tab
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}
        onPress={handleNewIncognitoTab}
      >
        <Ionicons name="eye-off" size={24} color="#8E44AD" />
        <Text style={[styles.actionText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
          Incognito
        </Text>
      </TouchableOpacity>

      {tabs.length > 1 && (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}
          onPress={handleCloseAllTabs}
        >
          <Ionicons name="close-circle" size={24} color="#FF3B30" />
          <Text style={[styles.actionText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
            Close All
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
            Tabs ({tabs.length}/{maxTabs})
          </Text>
          
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setShowActions(!showActions)}
            >
              <Ionicons
                name={showActions ? "chevron-up" : "chevron-down"}
                size={24}
                color={isDark ? '#FFFFFF' : '#000000'}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      {showActions && renderTabActions()}

      {/* Tabs List */}
      <FlatList
        data={tabs}
        renderItem={renderTabItem}
        keyExtractor={(item) => item.id}
        style={styles.tabsList}
        contentContainerStyle={styles.tabsContent}
        showsVerticalScrollIndicator={false}
        numColumns={2}
        columnWrapperStyle={styles.tabsRow}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />

      {/* Quick Add Button */}
      <View style={styles.floatingActions}>
        <TouchableOpacity
          style={[styles.floatingButton, { backgroundColor: '#007AFF' }]}
          onPress={handleNewTab}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
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
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 4,
    marginLeft: 12,
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  tabsList: {
    flex: 1,
  },
  tabsContent: {
    padding: 16,
  },
  tabsRow: {
    justifyContent: 'space-between',
    gap: 12,
  },
  tabItem: {
    width: TAB_WIDTH,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  tabHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    paddingBottom: 8,
  },
  tabInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tabIcon: {
    marginRight: 8,
  },
  tabTitle: {
    fontSize: 16,
    flex: 1,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
  tabUrl: {
    fontSize: 12,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#E5E5EA',
  },
  progressBar: {
    height: '100%',
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  floatingActions: {
    position: 'absolute',
    bottom: 20,
    right: 20,
  },
  floatingButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
}); 