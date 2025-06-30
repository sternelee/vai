import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Tab } from './TabManager';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_MIN_WIDTH = 120;
const TAB_MAX_WIDTH = 180;

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onNewTab: () => void;
  onShowTabManager: () => void;
  isVisible?: boolean;
}

export default function TabBar({
  tabs,
  activeTabId,
  onTabSelect,
  onTabClose,
  onNewTab,
  onShowTabManager,
  isVisible = true,
}: TabBarProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  if (!isVisible) return null;

  const getTabWidth = () => {
    const availableWidth = SCREEN_WIDTH - 60; // Reserve space for new tab button
    const calculatedWidth = availableWidth / Math.max(tabs.length, 1);
    return Math.max(TAB_MIN_WIDTH, Math.min(TAB_MAX_WIDTH, calculatedWidth));
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
      return tab.title.length > 15 ? `${tab.title.substring(0, 15)}...` : tab.title;
    }
    const domain = getDomainFromUrl(tab.url);
    return domain === 'New Tab' ? 'New Tab' : domain;
  };

  const renderTab = (tab: Tab, index: number) => {
    const isActive = tab.id === activeTabId;
    const tabWidth = getTabWidth();

    return (
      <TouchableOpacity
        key={tab.id}
        style={[
          styles.tab,
          {
            width: tabWidth,
            backgroundColor: isActive 
              ? (isDark ? '#2C2C2E' : '#FFFFFF')
              : (isDark ? '#1C1C1E' : '#F2F2F7'),
            borderTopColor: isActive ? '#007AFF' : 'transparent',
            borderBottomColor: isDark ? '#2C2C2E' : '#E5E5EA',
            ...(tab.isIncognito && {
              backgroundColor: isDark ? '#1A1A1A' : '#F0F0F0',
              borderTopColor: isActive ? '#8E44AD' : '#8E44AD',
              borderTopWidth: isActive ? 3 : 1,
            }),
          }
        ]}
        onPress={() => onTabSelect(tab.id)}
        activeOpacity={0.8}
      >
        {/* Tab Content */}
        <View style={styles.tabContent}>
          {/* Tab Icon and Title */}
          <View style={styles.tabInfo}>
            <Ionicons
              name={
                tab.isIncognito 
                  ? 'eye-off' 
                  : tab.isLoading 
                    ? 'reload' 
                    : tab.url.startsWith('https://') 
                      ? 'lock-closed' 
                      : 'globe'
              }
              size={14}
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

          {/* Close Button */}
          {tabs.length > 1 && (
            <TouchableOpacity
              style={styles.closeButton}
              onPress={(e) => {
                e.stopPropagation();
                onTabClose(tab.id);
              }}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            >
              <Ionicons
                name="close"
                size={12}
                color={isDark ? '#8E8E93' : '#6B6B6B'}
              />
            </TouchableOpacity>
          )}
        </View>

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
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
      {/* Tabs ScrollView */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScrollView}
        contentContainerStyle={styles.tabsContainer}
      >
        {tabs.map((tab, index) => renderTab(tab, index))}
      </ScrollView>

      {/* Actions */}
      <View style={styles.actions}>
        {/* Tab Count Button */}
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}
          onPress={onShowTabManager}
        >
          <Text style={[styles.tabCount, { color: isDark ? '#FFFFFF' : '#000000' }]}>
            {tabs.length}
          </Text>
        </TouchableOpacity>

        {/* New Tab Button */}
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}
          onPress={onNewTab}
        >
          <Ionicons
            name="add"
            size={20}
            color={isDark ? '#FFFFFF' : '#000000'}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 40,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
  },
  tabsScrollView: {
    flex: 1,
  },
  tabsContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  tab: {
    borderTopWidth: 3,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: '#E5E5EA',
    position: 'relative',
  },
  tabContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  tabInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  tabIcon: {
    marginRight: 6,
  },
  tabTitle: {
    fontSize: 13,
    flex: 1,
    minWidth: 0,
  },
  closeButton: {
    padding: 2,
    marginLeft: 4,
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
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 4,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabCount: {
    fontSize: 14,
    fontWeight: '600',
  },
}); 