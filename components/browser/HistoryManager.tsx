import { useColorScheme } from '@/hooks/useColorScheme';
import { databaseService, HistoryItem } from '@/services/DatabaseService';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Modal from 'react-native-modal';

interface HistoryManagerProps {
  isVisible: boolean;
  onClose: () => void;
  onNavigateToUrl: (url: string) => void;
}

export default function HistoryManager({
  isVisible,
  onClose,
  onNavigateToUrl,
}: HistoryManagerProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<HistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (isVisible) {
      loadHistory();
    }
  }, [isVisible]);

  useEffect(() => {
    filterHistory();
  }, [searchQuery, historyItems]);

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      const history = await databaseService.getHistory(1000);
      setHistoryItems(history);
    } catch (error) {
      console.error('Failed to load history:', error);
      Alert.alert('Error', 'Failed to load browsing history');
    } finally {
      setIsLoading(false);
    }
  };

  const filterHistory = () => {
    if (!searchQuery.trim()) {
      setFilteredItems(historyItems);
      return;
    }

    const filtered = historyItems.filter(item =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.url.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredItems(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const handleNavigate = (url: string) => {
    onNavigateToUrl(url);
    onClose();
  };

  const deleteHistoryItem = async (id: number) => {
    try {
      // Since we don't have a delete by ID method, we'll need to implement it
      // For now, we'll reload the history
      Alert.alert(
        'Delete Item',
        'Are you sure you want to delete this history item?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              // This would need to be implemented in DatabaseService
              console.log('Delete history item:', id);
              await loadHistory();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Failed to delete history item:', error);
      Alert.alert('Error', 'Failed to delete history item');
    }
  };

  const clearAllHistory = () => {
    Alert.alert(
      'Clear All History',
      'Are you sure you want to clear all browsing history? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await databaseService.clearHistory();
              setHistoryItems([]);
              setFilteredItems([]);
              Alert.alert('Success', 'All browsing history cleared');
            } catch (error) {
              console.error('Failed to clear history:', error);
              Alert.alert('Error', 'Failed to clear history');
            }
          },
        },
      ]
    );
  };

  const searchInHistory = async (query: string) => {
    try {
      setIsLoading(true);
      const results = await databaseService.searchHistory(query, 100);
      setFilteredItems(results);
    } catch (error) {
      console.error('Failed to search history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else if (diffInHours < 168) { // 7 days
      const days = Math.floor(diffInHours / 24);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getDomainFromUrl = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return domain.replace('www.', '');
    } catch {
      return url;
    }
  };

  const getFaviconUrl = (url: string) => {
    try {
      const domain = new URL(url).origin;
      return `${domain}/favicon.ico`;
    } catch {
      return null;
    }
  };

  const renderHistoryItem = ({ item }: { item: HistoryItem }) => (
    <TouchableOpacity
      style={[
        styles.historyItem,
        { 
          backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
          borderBottomColor: isDark ? '#2C2C2E' : '#E5E5EA',
        }
      ]}
      onPress={() => handleNavigate(item.url)}
    >
      <View style={styles.itemLeft}>
        <View style={styles.faviconContainer}>
          {item.favicon ? (
            <Image
              source={{ uri: item.favicon }}
              style={styles.favicon}
              onError={() => {
                // Fallback to default icon if favicon fails to load
              }}
            />
          ) : (
            <Ionicons
              name="globe-outline"
              size={20}
              color={isDark ? '#8E8E93' : '#6B6B6B'}
            />
          )}
        </View>
        
        <View style={styles.itemContent}>
          <Text
            style={[
              styles.itemTitle,
              { color: isDark ? '#FFFFFF' : '#000000' }
            ]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text
            style={[
              styles.itemUrl,
              { color: isDark ? '#8E8E93' : '#6B6B6B' }
            ]}
            numberOfLines={1}
          >
            {getDomainFromUrl(item.url)}
          </Text>
          <Text
            style={[
              styles.itemTime,
              { color: isDark ? '#8E8E93' : '#6B6B6B' }
            ]}
          >
            {formatDate(item.visitedAt)}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deleteHistoryItem(item.id!)}
      >
        <Ionicons
          name="trash-outline"
          size={18}
          color="#FF3B30"
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons
        name="time-outline"
        size={64}
        color={isDark ? '#8E8E93' : '#C7C7CC'}
        style={styles.emptyIcon}
      />
      <Text style={[styles.emptyTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
        {searchQuery ? 'No Results Found' : 'No History Yet'}
      </Text>
      <Text style={[styles.emptyMessage, { color: isDark ? '#8E8E93' : '#6B6B6B' }]}>
        {searchQuery 
          ? 'Try adjusting your search terms'
          : 'Your browsing history will appear here'
        }
      </Text>
    </View>
  );

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      onSwipeComplete={onClose}
      swipeDirection="down"
      style={styles.modal}
      backdropOpacity={0.5}
      useNativeDriver={true}
      hideModalContentWhileAnimating={true}
    >
      <View style={[
        styles.container,
        { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }
      ]}>
        {/* Header */}
        <View style={[
          styles.header,
          { borderBottomColor: isDark ? '#2C2C2E' : '#E5E5EA' }
        ]}>
          <View style={styles.handleBar} />
          
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <Ionicons name="time" size={24} color="#007AFF" />
              <Text style={[
                styles.headerTitle,
                { color: isDark ? '#FFFFFF' : '#000000' }
              ]}>
                History
              </Text>
            </View>
            
            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={clearAllHistory}
                disabled={historyItems.length === 0}
              >
                <Ionicons
                  name="trash-outline"
                  size={20}
                  color={historyItems.length === 0 ? '#8E8E93' : '#FF3B30'}
                />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.headerButton}
                onPress={onClose}
              >
                <Ionicons name="close" size={24} color={isDark ? '#FFFFFF' : '#000000'} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Bar */}
          <View style={[
            styles.searchContainer,
            { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }
          ]}>
            <Ionicons
              name="search"
              size={18}
              color={isDark ? '#8E8E93' : '#6B6B6B'}
              style={styles.searchIcon}
            />
            <TextInput
              style={[
                styles.searchInput,
                { color: isDark ? '#FFFFFF' : '#000000' }
              ]}
              placeholder="Search history..."
              placeholderTextColor={isDark ? '#8E8E93' : '#6B6B6B'}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              onSubmitEditing={() => searchInHistory(searchQuery)}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.clearSearch}
              >
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={isDark ? '#8E8E93' : '#6B6B6B'}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* History List */}
        <FlatList
          data={filteredItems}
          renderItem={renderHistoryItem}
          keyExtractor={(item, index) => `${item.id || index}`}
          style={styles.list}
          contentContainerStyle={[
            styles.listContent,
            filteredItems.length === 0 && styles.emptyListContent
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={isDark ? '#FFFFFF' : '#000000'}
            />
          }
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />

        {/* Footer Stats */}
        {historyItems.length > 0 && (
          <View style={[
            styles.footer,
            { borderTopColor: isDark ? '#2C2C2E' : '#E5E5EA' }
          ]}>
            <Text style={[
              styles.footerText,
              { color: isDark ? '#8E8E93' : '#6B6B6B' }
            ]}>
              {filteredItems.length === historyItems.length
                ? `${historyItems.length} total items`
                : `${filteredItems.length} of ${historyItems.length} items`
              }
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  container: {
    height: '85%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D1D6',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 4,
    marginLeft: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
  },
  clearSearch: {
    marginLeft: 8,
  },
  list: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
  },
  emptyListContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  faviconContainer: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  favicon: {
    width: 20,
    height: 20,
    borderRadius: 3,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  itemUrl: {
    fontSize: 14,
    marginBottom: 2,
  },
  itemTime: {
    fontSize: 12,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
  },
}); 