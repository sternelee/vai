import { useColorScheme } from '@/hooks/useColorScheme';
import databaseService, { BookmarkItem } from '@/services/DatabaseService';
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

interface BookmarkManagerProps {
  isVisible: boolean;
  onClose: () => void;
  onNavigateToUrl: (url: string) => void;
}

export default function BookmarkManager({
  isVisible,
  onClose,
  onNavigateToUrl,
}: BookmarkManagerProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [filteredBookmarks, setFilteredBookmarks] = useState<BookmarkItem[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>('default');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState<BookmarkItem | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formFolder, setFormFolder] = useState('default');

  useEffect(() => {
    if (isVisible) {
      loadBookmarks();
      loadFolders();
    }
  }, [isVisible]);

  useEffect(() => {
    loadBookmarksForFolder();
  }, [selectedFolder, bookmarks]);

  useEffect(() => {
    filterBookmarks();
  }, [searchQuery, filteredBookmarks.length === 0 ? bookmarks : []]);

  const loadBookmarks = async () => {
    try {
      setIsLoading(true);
      const allBookmarks = await databaseService.getBookmarks();
      setBookmarks(allBookmarks);
    } catch (error) {
      console.error('Failed to load bookmarks:', error);
      Alert.alert('Error', 'Failed to load bookmarks');
    } finally {
      setIsLoading(false);
    }
  };

  const loadFolders = async () => {
    try {
      const folderList = await databaseService.getAllBookmarkFolders();
      setFolders(folderList);
    } catch (error) {
      console.error('Failed to load folders:', error);
    }
  };

  const loadBookmarksForFolder = async () => {
    try {
      const folderBookmarks = await databaseService.getBookmarks(selectedFolder);
      setFilteredBookmarks(folderBookmarks);
    } catch (error) {
      console.error('Failed to load folder bookmarks:', error);
    }
  };

  const filterBookmarks = () => {
    if (!searchQuery.trim()) {
      return;
    }

    const filtered = filteredBookmarks.filter(item =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.url.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredBookmarks(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadBookmarks(), loadFolders()]);
    setRefreshing(false);
  };

  const handleNavigate = (url: string) => {
    onNavigateToUrl(url);
    onClose();
  };

  const openAddDialog = () => {
    setFormTitle('');
    setFormUrl('');
    setFormFolder(selectedFolder);
    setEditingBookmark(null);
    setShowAddDialog(true);
  };

  const openEditDialog = (bookmark: BookmarkItem) => {
    setFormTitle(bookmark.title);
    setFormUrl(bookmark.url);
    setFormFolder(bookmark.folder || 'default');
    setEditingBookmark(bookmark);
    setShowAddDialog(true);
  };

  const closeDialog = () => {
    setShowAddDialog(false);
    setEditingBookmark(null);
    setFormTitle('');
    setFormUrl('');
    setFormFolder('default');
  };

  const saveBookmark = async () => {
    if (!formTitle.trim() || !formUrl.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      const bookmarkData: BookmarkItem = {
        url: formUrl.trim(),
        title: formTitle.trim(),
        createdAt: editingBookmark?.createdAt || new Date().toISOString(),
        folder: formFolder,
      };

      if (editingBookmark) {
        // Update existing bookmark
        await databaseService.removeBookmark(editingBookmark.url);
        await databaseService.addBookmark(bookmarkData);
        Alert.alert('Success', 'Bookmark updated');
      } else {
        // Add new bookmark
        await databaseService.addBookmark(bookmarkData);
        Alert.alert('Success', 'Bookmark added');
      }

      closeDialog();
      await Promise.all([loadBookmarks(), loadFolders()]);
    } catch (error) {
      console.error('Failed to save bookmark:', error);
      Alert.alert('Error', 'Failed to save bookmark');
    }
  };

  const deleteBookmark = (bookmark: BookmarkItem) => {
    Alert.alert(
      'Delete Bookmark',
      `Are you sure you want to delete "${bookmark.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await databaseService.removeBookmark(bookmark.url);
              await loadBookmarks();
              Alert.alert('Success', 'Bookmark deleted');
            } catch (error) {
              console.error('Failed to delete bookmark:', error);
              Alert.alert('Error', 'Failed to delete bookmark');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getDomainFromUrl = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return domain.replace('www.', '');
    } catch {
      return url;
    }
  };

  const renderBookmarkItem = ({ item }: { item: BookmarkItem }) => (
    <View
      style={[
        styles.bookmarkItem,
        {
          backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
          borderBottomColor: isDark ? '#2C2C2E' : '#E5E5EA',
        }
      ]}
    >
      <TouchableOpacity
        style={styles.itemContent}
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
                name="bookmark"
                size={20}
                color="#007AFF"
              />
            )}
          </View>

          <View style={styles.textContent}>
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
                styles.itemDate,
                { color: isDark ? '#8E8E93' : '#6B6B6B' }
              ]}
            >
              Added {formatDate(item.createdAt)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      <View style={styles.itemActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => openEditDialog(item)}
        >
          <Ionicons
            name="pencil"
            size={18}
            color="#007AFF"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => deleteBookmark(item)}
        >
          <Ionicons
            name="trash-outline"
            size={18}
            color="#FF3B30"
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFolderTab = (folder: string) => (
    <TouchableOpacity
      key={folder}
      style={[
        styles.folderTab,
        {
          backgroundColor: selectedFolder === folder
            ? '#007AFF'
            : (isDark ? '#2C2C2E' : '#F2F2F7'),
        }
      ]}
      onPress={() => setSelectedFolder(folder)}
    >
      <Text
        style={[
          styles.folderTabText,
          {
            color: selectedFolder === folder
              ? '#FFFFFF'
              : (isDark ? '#FFFFFF' : '#000000'),
          }
        ]}
      >
        {folder === 'default' ? 'All' : folder}
      </Text>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons
        name="bookmark-outline"
        size={64}
        color={isDark ? '#8E8E93' : '#C7C7CC'}
        style={styles.emptyIcon}
      />
      <Text style={[styles.emptyTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
        {searchQuery ? 'No Results Found' : 'No Bookmarks Yet'}
      </Text>
      <Text style={[styles.emptyMessage, { color: isDark ? '#8E8E93' : '#6B6B6B' }]}>
        {searchQuery
          ? 'Try adjusting your search terms'
          : 'Your saved bookmarks will appear here'
        }
      </Text>
      {!searchQuery && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={openAddDialog}
        >
          <Text style={styles.addButtonText}>Add Bookmark</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderAddDialog = () => (
    <Modal
      isVisible={showAddDialog}
      onBackdropPress={closeDialog}
      style={styles.dialogModal}
      backdropOpacity={0.5}
      useNativeDriver={true}
    >
      <View style={[
        styles.dialogContainer,
        { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }
      ]}>
        <Text style={[
          styles.dialogTitle,
          { color: isDark ? '#FFFFFF' : '#000000' }
        ]}>
          {editingBookmark ? 'Edit Bookmark' : 'Add Bookmark'}
        </Text>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: isDark ? '#FFFFFF' : '#000000' }]}>
            Title
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
                color: isDark ? '#FFFFFF' : '#000000',
                borderColor: isDark ? '#2C2C2E' : '#E5E5EA',
              }
            ]}
            value={formTitle}
            onChangeText={setFormTitle}
            placeholder="Bookmark title"
            placeholderTextColor={isDark ? '#8E8E93' : '#6B6B6B'}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: isDark ? '#FFFFFF' : '#000000' }]}>
            URL
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
                color: isDark ? '#FFFFFF' : '#000000',
                borderColor: isDark ? '#2C2C2E' : '#E5E5EA',
              }
            ]}
            value={formUrl}
            onChangeText={setFormUrl}
            placeholder="https://example.com"
            placeholderTextColor={isDark ? '#8E8E93' : '#6B6B6B'}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: isDark ? '#FFFFFF' : '#000000' }]}>
            Folder
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
                color: isDark ? '#FFFFFF' : '#000000',
                borderColor: isDark ? '#2C2C2E' : '#E5E5EA',
              }
            ]}
            value={formFolder}
            onChangeText={setFormFolder}
            placeholder="default"
            placeholderTextColor={isDark ? '#8E8E93' : '#6B6B6B'}
          />
        </View>

        <View style={styles.dialogActions}>
          <TouchableOpacity
            style={[styles.dialogButton, styles.cancelButton]}
            onPress={closeDialog}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dialogButton, styles.saveButton]}
            onPress={saveBookmark}
          >
            <Text style={styles.saveButtonText}>
              {editingBookmark ? 'Update' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <>
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
                <Ionicons name="bookmark" size={24} color="#007AFF" />
                <Text style={[
                  styles.headerTitle,
                  { color: isDark ? '#FFFFFF' : '#000000' }
                ]}>
                  Bookmarks
                </Text>
              </View>

              <View style={styles.headerRight}>
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={openAddDialog}
                >
                  <Ionicons name="add" size={24} color="#007AFF" />
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
                placeholder="Search bookmarks..."
                placeholderTextColor={isDark ? '#8E8E93' : '#6B6B6B'}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
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

            {/* Folder Tabs */}
            {folders.length > 1 && (
              <View style={styles.folderTabs}>
                <FlatList
                  data={folders}
                  renderItem={({ item }) => renderFolderTab(item)}
                  keyExtractor={(item) => item}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.folderTabsContent}
                />
              </View>
            )}
          </View>

          {/* Bookmarks List */}
          <FlatList
            data={filteredBookmarks}
            renderItem={renderBookmarkItem}
            keyExtractor={(item, index) => `${item.url}_${index}`}
            style={styles.list}
            contentContainerStyle={[
              styles.listContent,
              filteredBookmarks.length === 0 && styles.emptyListContent
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
          {filteredBookmarks.length > 0 && (
            <View style={[
              styles.footer,
              { borderTopColor: isDark ? '#2C2C2E' : '#E5E5EA' }
            ]}>
              <Text style={[
                styles.footerText,
                { color: isDark ? '#8E8E93' : '#6B6B6B' }
              ]}>
                {filteredBookmarks.length} bookmark{filteredBookmarks.length !== 1 ? 's' : ''}
                {selectedFolder !== 'default' && ` in ${selectedFolder}`}
              </Text>
            </View>
          )}
        </View>
      </Modal>

      {renderAddDialog()}
    </>
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
    marginBottom: 12,
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
  folderTabs: {
    marginBottom: 8,
  },
  folderTabsContent: {
    paddingHorizontal: 4,
  },
  folderTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginHorizontal: 4,
  },
  folderTabText: {
    fontSize: 14,
    fontWeight: '500',
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
  bookmarkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemContent: {
    flex: 1,
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
  textContent: {
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
  itemDate: {
    fontSize: 12,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
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
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
  // Dialog styles
  dialogModal: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogContainer: {
    width: '90%',
    borderRadius: 12,
    padding: 20,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  dialogActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  dialogButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F2F2F7',
  },
  cancelButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});