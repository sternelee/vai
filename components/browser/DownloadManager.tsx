import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import React, { useState } from 'react';
import {
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Modal from 'react-native-modal';

export interface DownloadItem {
  id: string;
  url: string;
  filename: string;
  fileSize: number;
  downloadedSize: number;
  status: 'pending' | 'downloading' | 'completed' | 'paused' | 'error' | 'cancelled';
  startTime: string;
  endTime?: string;
  localPath?: string;
  mimeType?: string;
  error?: string;
  progress: number; // 0-1
  speed?: number; // bytes per second
}

interface DownloadManagerProps {
  isVisible: boolean;
  onClose: () => void;
  downloads: DownloadItem[];
  onPauseDownload: (id: string) => void;
  onResumeDownload: (id: string) => void;
  onCancelDownload: (id: string) => void;
  onRetryDownload: (id: string) => void;
  onClearCompleted: () => void;
  onClearAll: () => void;
}

export default function DownloadManager({
  isVisible,
  onClose,
  downloads,
  onPauseDownload,
  onResumeDownload,
  onCancelDownload,
  onRetryDownload,
  onClearCompleted,
  onClearAll,
}: DownloadManagerProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [filter, setFilter] = useState<'all' | 'downloading' | 'completed' | 'failed'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);

  // Filter downloads based on current filter
  const filteredDownloads = downloads.filter(item => {
    switch (filter) {
      case 'downloading':
        return item.status === 'downloading' || item.status === 'pending' || item.status === 'paused';
      case 'completed':
        return item.status === 'completed';
      case 'failed':
        return item.status === 'error' || item.status === 'cancelled';
      default:
        return true;
    }
  });

  // Calculate statistics
  const stats = {
    total: downloads.length,
    downloading: downloads.filter(d => d.status === 'downloading' || d.status === 'pending').length,
    completed: downloads.filter(d => d.status === 'completed').length,
    failed: downloads.filter(d => d.status === 'error' || d.status === 'cancelled').length,
    totalSize: downloads.reduce((sum, d) => sum + d.fileSize, 0),
    downloadedSize: downloads.reduce((sum, d) => sum + d.downloadedSize, 0),
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // Refresh download states
    setTimeout(() => setRefreshing(false), 1000);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSecond: number): string => {
    return formatFileSize(bytesPerSecond) + '/s';
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatDuration = (startTime: string, endTime?: string): string => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000);
    
    if (duration < 60) return `${duration}s`;
    if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`;
    return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`;
  };

  const getFileIcon = (filename: string, mimeType?: string): string => {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    if (mimeType?.startsWith('image/')) return 'image';
    if (mimeType?.startsWith('video/')) return 'videocam';
    if (mimeType?.startsWith('audio/')) return 'musical-notes';
    if (mimeType?.includes('pdf')) return 'document-text';
    
    switch (extension) {
      case 'jpg': case 'jpeg': case 'png': case 'gif': case 'webp':
        return 'image';
      case 'mp4': case 'avi': case 'mov': case 'mkv':
        return 'videocam';
      case 'mp3': case 'wav': case 'flac': case 'm4a':
        return 'musical-notes';
      case 'pdf':
        return 'document-text';
      case 'zip': case 'rar': case '7z':
        return 'archive';
      case 'doc': case 'docx': case 'txt':
        return 'document';
      case 'xls': case 'xlsx':
        return 'stats-chart';
      case 'ppt': case 'pptx':
        return 'easel';
      default:
        return 'document-outline';
    }
  };

  const getStatusColor = (status: DownloadItem['status']): string => {
    switch (status) {
      case 'downloading': return '#007AFF';
      case 'completed': return '#4CAF50';
      case 'paused': return '#FF9800';
      case 'error': case 'cancelled': return '#FF3B30';
      case 'pending': return '#8E8E93';
      default: return isDark ? '#8E8E93' : '#6B6B6B';
    }
  };

  const getStatusText = (status: DownloadItem['status']): string => {
    switch (status) {
      case 'downloading': return 'Downloading';
      case 'completed': return 'Completed';
      case 'paused': return 'Paused';
      case 'error': return 'Failed';
      case 'cancelled': return 'Cancelled';
      case 'pending': return 'Pending';
      default: return 'Unknown';
    }
  };

  const handleItemPress = async (item: DownloadItem) => {
    if (selectionMode) {
      toggleSelection(item.id);
      return;
    }

    if (item.status === 'completed' && item.localPath) {
      try {
        if ((await FileSystem.getInfoAsync(item.localPath)).exists) {
          // Try to open the file
          await Sharing.shareAsync(item.localPath);
        } else {
          Alert.alert('File Not Found', 'The downloaded file could not be found.');
        }
      } catch (error) {
        console.error('Error opening file:', error);
        Alert.alert('Error', 'Could not open the file.');
      }
    }
  };

  const handleItemLongPress = (item: DownloadItem) => {
    if (!selectionMode) {
      setSelectionMode(true);
      setSelectedItems([item.id]);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const handleActionPress = (item: DownloadItem, action: string) => {
    switch (action) {
      case 'pause':
        onPauseDownload(item.id);
        break;
      case 'resume':
        onResumeDownload(item.id);
        break;
      case 'cancel':
        Alert.alert(
          'Cancel Download',
          'Are you sure you want to cancel this download?',
          [
            { text: 'No', style: 'cancel' },
            { text: 'Yes', onPress: () => onCancelDownload(item.id) },
          ]
        );
        break;
      case 'retry':
        onRetryDownload(item.id);
        break;
      case 'share':
        if (item.localPath) {
          Sharing.shareAsync(item.localPath);
        }
        break;
      case 'delete':
        handleDeleteDownload(item);
        break;
    }
  };

  const handleDeleteDownload = (item: DownloadItem) => {
    Alert.alert(
      'Delete Download',
      `Delete "${item.filename}" from downloads?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete File', 
          style: 'destructive',
          onPress: async () => {
            if (item.localPath) {
              try {
                await FileSystem.deleteAsync(item.localPath);
              } catch (error) {
                console.log('Could not delete file:', error);
              }
            }
            onCancelDownload(item.id);
          }
        },
      ]
    );
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedItems([]);
  };

  const renderFilterTabs = () => (
    <View style={[styles.filterTabs, { backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7' }]}>
      {[
        { key: 'all', label: `All (${stats.total})` },
        { key: 'downloading', label: `Active (${stats.downloading})` },
        { key: 'completed', label: `Done (${stats.completed})` },
        { key: 'failed', label: `Failed (${stats.failed})` },
      ].map(tab => (
        <TouchableOpacity
          key={tab.key}
          style={[
            styles.filterTab,
            {
              backgroundColor: filter === tab.key 
                ? (isDark ? '#2C2C2E' : '#FFFFFF')
                : 'transparent',
            }
          ]}
          onPress={() => setFilter(tab.key as any)}
        >
          <Text
            style={[
              styles.filterTabText,
              {
                color: filter === tab.key 
                  ? '#007AFF'
                  : (isDark ? '#8E8E93' : '#6B6B6B'),
                fontWeight: filter === tab.key ? '600' : '400',
              }
            ]}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderDownloadItem = ({ item }: { item: DownloadItem }) => {
    const isSelected = selectedItems.includes(item.id);
    
    return (
      <TouchableOpacity
        style={[
          styles.downloadItem,
          {
            backgroundColor: isSelected 
              ? (isDark ? '#2C2C2E' : '#E3F2FD')
              : (isDark ? '#1C1C1E' : '#FFFFFF'),
          }
        ]}
        onPress={() => handleItemPress(item)}
        onLongPress={() => handleItemLongPress(item)}
        activeOpacity={0.8}
      >
        {/* Selection Checkbox */}
        {selectionMode && (
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => toggleSelection(item.id)}
          >
            <Ionicons
              name={isSelected ? "checkmark-circle" : "ellipse-outline"}
              size={24}
              color={isSelected ? '#007AFF' : (isDark ? '#8E8E93' : '#6B6B6B')}
            />
          </TouchableOpacity>
        )}

        {/* File Icon */}
        <View style={[styles.fileIcon, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}>
          <Ionicons
            name={getFileIcon(item.filename, item.mimeType) as any}
            size={24}
            color={getStatusColor(item.status)}
          />
        </View>

        {/* Download Info */}
        <View style={styles.downloadInfo}>
          <Text
            style={[styles.filename, { color: isDark ? '#FFFFFF' : '#000000' }]}
            numberOfLines={1}
          >
            {item.filename}
          </Text>
          
          <View style={styles.downloadDetails}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusText(item.status)}
            </Text>
            
            {item.status === 'downloading' && item.speed && (
              <Text style={[styles.detailText, { color: isDark ? '#8E8E93' : '#6B6B6B' }]}>
                • {formatSpeed(item.speed)}
              </Text>
            )}
            
            <Text style={[styles.detailText, { color: isDark ? '#8E8E93' : '#6B6B6B' }]}>
              • {formatFileSize(item.downloadedSize)}{item.fileSize > 0 && ` / ${formatFileSize(item.fileSize)}`}
            </Text>
          </View>

          {/* Progress Bar */}
          {(item.status === 'downloading' || item.status === 'paused') && (
            <View style={[styles.progressContainer, { backgroundColor: isDark ? '#2C2C2E' : '#E5E5EA' }]}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${item.progress * 100}%`,
                    backgroundColor: getStatusColor(item.status),
                  }
                ]}
              />
            </View>
          )}

          {/* Time Info */}
          <Text style={[styles.timeText, { color: isDark ? '#8E8E93' : '#6B6B6B' }]}>
            {item.status === 'completed' 
              ? `Completed ${formatTime(item.endTime || item.startTime)}`
              : `Started ${formatTime(item.startTime)}`}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {item.status === 'downloading' && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleActionPress(item, 'pause')}
            >
              <Ionicons name="pause" size={20} color="#FF9800" />
            </TouchableOpacity>
          )}
          
          {item.status === 'paused' && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleActionPress(item, 'resume')}
            >
              <Ionicons name="play" size={20} color="#007AFF" />
            </TouchableOpacity>
          )}
          
          {(item.status === 'error' || item.status === 'cancelled') && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleActionPress(item, 'retry')}
            >
              <Ionicons name="refresh" size={20} color="#007AFF" />
            </TouchableOpacity>
          )}
          
          {item.status === 'completed' && item.localPath && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleActionPress(item, 'share')}
            >
              <Ionicons name="share" size={20} color="#007AFF" />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleActionPress(item, 'delete')}
          >
            <Ionicons name="trash" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
      <View style={styles.headerContent}>
        <Text style={[styles.headerTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
          Downloads
        </Text>
        
        <View style={styles.headerActions}>
          {selectionMode ? (
            <>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={exitSelectionMode}
              >
                <Text style={[styles.headerButtonText, { color: '#007AFF' }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={onClearCompleted}
                disabled={stats.completed === 0}
              >
                <Text style={[
                  styles.headerButtonText,
                  { 
                    color: stats.completed > 0 ? '#007AFF' : (isDark ? '#8E8E93' : '#6B6B6B'),
                  }
                ]}>
                  Clear
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.headerButton}
                onPress={onClose}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={isDark ? '#FFFFFF' : '#000000'}
                />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Statistics */}
      {stats.total > 0 && (
        <View style={styles.statsContainer}>
          <Text style={[styles.statsText, { color: isDark ? '#8E8E93' : '#6B6B6B' }]}>
            {formatFileSize(stats.downloadedSize)} of {formatFileSize(stats.totalSize)} downloaded
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      style={styles.modal}
      useNativeDriver={true}
    >
      <View style={[styles.container, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
        {renderHeader()}
        {renderFilterTabs()}
        
        <FlatList
          data={filteredDownloads}
          renderItem={renderDownloadItem}
          keyExtractor={(item) => item.id}
          style={styles.downloadsList}
          contentContainerStyle={styles.downloadsContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={isDark ? '#FFFFFF' : '#000000'}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name="download-outline"
                size={64}
                color={isDark ? '#8E8E93' : '#6B6B6B'}
              />
              <Text style={[styles.emptyText, { color: isDark ? '#8E8E93' : '#6B6B6B' }]}>
                {filter === 'all' ? 'No downloads yet' : `No ${filter} downloads`}
              </Text>
            </View>
          }
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    margin: 0,
  },
  container: {
    flex: 1,
    marginTop: 50,
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
  headerButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  statsContainer: {
    marginTop: 8,
  },
  statsText: {
    fontSize: 14,
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginHorizontal: 2,
  },
  filterTabText: {
    fontSize: 14,
    textAlign: 'center',
  },
  downloadsList: {
    flex: 1,
  },
  downloadsContent: {
    padding: 16,
  },
  downloadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  checkbox: {
    marginRight: 12,
  },
  fileIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  downloadInfo: {
    flex: 1,
    minWidth: 0,
  },
  filename: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  downloadDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  detailText: {
    fontSize: 14,
    marginLeft: 4,
  },
  progressContainer: {
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  timeText: {
    fontSize: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
}); 