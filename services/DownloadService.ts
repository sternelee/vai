import { DownloadItem } from "@/components/browser/DownloadManager";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import databaseService from "./DatabaseService";

export interface DownloadOptions {
  url: string;
  filename?: string;
  headers?: Record<string, string>;
  useDownloadManager?: boolean;
}

export interface DownloadProgress {
  totalBytesWritten: number;
  totalBytesExpectedToWrite: number;
}

class DownloadService {
  private downloads: Map<string, DownloadItem> = new Map();
  private activeDownloads: Map<string, FileSystem.DownloadResumable> =
    new Map();
  private listeners: Set<(downloads: DownloadItem[]) => void> = new Set();

  constructor() {
    this.loadDownloadsFromDB();
  }

  // Initialize service and load existing downloads
  async initialize(): Promise<void> {
    try {
      await this.loadDownloadsFromDB();
      await this.requestPermissions();
    } catch (error) {
      console.error("Failed to initialize download service:", error);
    }
  }

  // Request storage permissions
  private async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      return status === "granted";
    } catch (error) {
      console.error("Permission request failed:", error);
      return false;
    }
  }

  // Load downloads from database
  private async loadDownloadsFromDB(): Promise<void> {
    try {
      const savedDownloads = await databaseService.getDownloads();
      this.downloads.clear();

      savedDownloads.forEach((download) => {
        this.downloads.set(download.id, download);
      });

      this.notifyListeners();
    } catch (error) {
      console.error("Failed to load downloads from database:", error);
    }
  }

  // Save download to database
  private async saveDownloadToDB(download: DownloadItem): Promise<void> {
    try {
      await databaseService.saveDownload(download);
    } catch (error) {
      console.error("Failed to save download to database:", error);
    }
  }

  // Remove download from database
  private async removeDownloadFromDB(id: string): Promise<void> {
    try {
      await databaseService.removeDownload(id);
    } catch (error) {
      console.error("Failed to remove download from database:", error);
    }
  }

  // Generate filename from URL
  private generateFilename(url: string, customFilename?: string): string {
    if (customFilename) {
      return customFilename;
    }

    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.split("/").pop() || "download";

      // Add extension if missing
      if (!filename.includes(".")) {
        return `${filename}.bin`;
      }

      return filename;
    } catch {
      return `download_${Date.now()}.bin`;
    }
  }

  // Get download directory
  private getDownloadDirectory(): string {
    return `${FileSystem.documentDirectory}downloads/`;
  }

  // Ensure download directory exists
  private async ensureDownloadDirectory(): Promise<void> {
    const downloadDir = this.getDownloadDirectory();
    const dirInfo = await FileSystem.getInfoAsync(downloadDir);

    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(downloadDir, { intermediates: true });
    }
  }

  // Start a new download
  async startDownload(options: DownloadOptions): Promise<string> {
    try {
      await this.ensureDownloadDirectory();

      const id = Date.now().toString();
      const filename = this.generateFilename(options.url, options.filename);
      const localPath = `${this.getDownloadDirectory()}${filename}`;

      // Create download item
      const downloadItem: DownloadItem = {
        id,
        url: options.url,
        filename,
        fileSize: 0,
        downloadedSize: 0,
        status: "pending",
        startTime: new Date().toISOString(),
        localPath,
        progress: 0,
      };

      // Save to state and database
      this.downloads.set(id, downloadItem);
      await this.saveDownloadToDB(downloadItem);
      this.notifyListeners();

      // Start the download
      const downloadResumable = FileSystem.createDownloadResumable(
        options.url,
        localPath,
        options.headers ? { headers: options.headers } : undefined,
        (downloadProgress: DownloadProgress) => {
          this.handleDownloadProgress(id, downloadProgress);
        },
      );

      this.activeDownloads.set(id, downloadResumable);

      // Update status to downloading
      this.updateDownloadStatus(id, { status: "downloading" });

      try {
        const result = await downloadResumable.downloadAsync();

        if (result) {
          await this.handleDownloadComplete(id, result.uri);
        }
      } catch (error) {
        await this.handleDownloadError(id, error as Error);
      }

      return id;
    } catch (error) {
      console.error("Failed to start download:", error);
      throw error;
    }
  }

  // Handle download progress
  private handleDownloadProgress(id: string, progress: DownloadProgress): void {
    const download = this.downloads.get(id);
    if (!download) return;

    const progressRatio =
      progress.totalBytesExpectedToWrite > 0
        ? progress.totalBytesWritten / progress.totalBytesExpectedToWrite
        : 0;

    const speed = this.calculateDownloadSpeed(id, progress.totalBytesWritten);

    this.updateDownloadStatus(id, {
      downloadedSize: progress.totalBytesWritten,
      fileSize: progress.totalBytesExpectedToWrite,
      progress: progressRatio,
      speed,
    });
  }

  // Calculate download speed
  private calculateDownloadSpeed(id: string, bytesDownloaded: number): number {
    const download = this.downloads.get(id);
    if (!download) return 0;

    const now = Date.now();
    const startTime = new Date(download.startTime).getTime();
    const elapsedSeconds = (now - startTime) / 1000;

    if (elapsedSeconds <= 0) return 0;
    return Math.round(bytesDownloaded / elapsedSeconds);
  }

  // Handle download completion
  private async handleDownloadComplete(id: string, uri: string): Promise<void> {
    const download = this.downloads.get(id);
    if (!download) return;

    try {
      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(uri);

      this.updateDownloadStatus(id, {
        status: "completed",
        endTime: new Date().toISOString(),
        localPath: uri,
        fileSize: download.fileSize,
        downloadedSize: download.downloadedSize,
        progress: 1,
        speed: 0,
      });

      // Try to save to media library for images/videos
      if (
        download.mimeType?.startsWith("image/") ||
        download.mimeType?.startsWith("video/")
      ) {
        try {
          await MediaLibrary.saveToLibraryAsync(uri);
        } catch (error) {
          console.log("Could not save to media library:", error);
        }
      }

      // Clean up active download
      this.activeDownloads.delete(id);
    } catch (error) {
      await this.handleDownloadError(id, error as Error);
    }
  }

  // Handle download error
  private async handleDownloadError(id: string, error: Error): Promise<void> {
    console.error(`Download ${id} failed:`, error);

    this.updateDownloadStatus(id, {
      status: "error",
      error: error.message,
      endTime: new Date().toISOString(),
    });

    this.activeDownloads.delete(id);
  }

  // Update download status
  private updateDownloadStatus(
    id: string,
    updates: Partial<DownloadItem>,
  ): void {
    const download = this.downloads.get(id);
    if (!download) return;

    const updatedDownload = { ...download, ...updates };
    this.downloads.set(id, updatedDownload);

    // Save to database async
    this.saveDownloadToDB(updatedDownload).catch(console.error);

    this.notifyListeners();
  }

  // Pause download
  async pauseDownload(id: string): Promise<void> {
    const activeDownload = this.activeDownloads.get(id);
    if (!activeDownload) return;

    try {
      await activeDownload.pauseAsync();
      this.updateDownloadStatus(id, { status: "paused" });
    } catch (error) {
      console.error("Failed to pause download:", error);
    }
  }

  // Resume download
  async resumeDownload(id: string): Promise<void> {
    const activeDownload = this.activeDownloads.get(id);
    if (!activeDownload) return;

    try {
      await activeDownload.resumeAsync();
      this.updateDownloadStatus(id, { status: "downloading" });
    } catch (error) {
      console.error("Failed to resume download:", error);
      await this.handleDownloadError(id, error as Error);
    }
  }

  // Cancel download
  async cancelDownload(id: string): Promise<void> {
    const activeDownload = this.activeDownloads.get(id);
    const download = this.downloads.get(id);

    if (activeDownload) {
      try {
        await activeDownload.pauseAsync();
        this.activeDownloads.delete(id);
      } catch (error) {
        console.error("Failed to cancel download:", error);
      }
    }

    if (download?.localPath) {
      try {
        // Delete the partial file
        await FileSystem.deleteAsync(download.localPath, { idempotent: true });
      } catch (error) {
        console.log("Could not delete partial file:", error);
      }
    }

    // Remove from state and database
    this.downloads.delete(id);
    await this.removeDownloadFromDB(id);
    this.notifyListeners();
  }

  // Retry download
  async retryDownload(id: string): Promise<void> {
    const download = this.downloads.get(id);
    if (!download) return;

    // Reset download state
    this.updateDownloadStatus(id, {
      status: "pending",
      downloadedSize: 0,
      progress: 0,
      error: undefined,
      endTime: undefined,
      speed: 0,
    });

    // Start download again
    await this.startDownload({
      url: download.url,
      filename: download.filename,
    });
  }

  // Clear completed downloads
  async clearCompleted(): Promise<void> {
    const completedIds: string[] = [];

    for (const [id, download] of this.downloads) {
      if (download.status === "completed") {
        completedIds.push(id);
      }
    }

    for (const id of completedIds) {
      this.downloads.delete(id);
      await this.removeDownloadFromDB(id);
    }

    this.notifyListeners();
  }

  // Clear all downloads
  async clearAll(): Promise<void> {
    // Cancel all active downloads
    for (const [id] of this.activeDownloads) {
      await this.cancelDownload(id);
    }

    // Clear completed downloads
    for (const [id] of this.downloads) {
      await this.removeDownloadFromDB(id);
    }

    this.downloads.clear();
    this.notifyListeners();
  }

  // Get all downloads
  getDownloads(): DownloadItem[] {
    return Array.from(this.downloads.values()).sort(
      (a, b) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
    );
  }

  // Get download by ID
  getDownload(id: string): DownloadItem | undefined {
    return this.downloads.get(id);
  }

  // Add listener for download updates
  addListener(listener: (downloads: DownloadItem[]) => void): void {
    this.listeners.add(listener);
    // Immediately call with current downloads
    listener(this.getDownloads());
  }

  // Remove listener
  removeListener(listener: (downloads: DownloadItem[]) => void): void {
    this.listeners.delete(listener);
  }

  // Notify all listeners
  private notifyListeners(): void {
    const downloads = this.getDownloads();
    this.listeners.forEach((listener) => {
      try {
        listener(downloads);
      } catch (error) {
        console.error("Download listener error:", error);
      }
    });
  }

  // Check if URL is downloadable
  isDownloadableUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname.toLowerCase();

      // Common downloadable extensions
      const downloadableExtensions = [
        ".pdf",
        ".doc",
        ".docx",
        ".xls",
        ".xlsx",
        ".ppt",
        ".pptx",
        ".zip",
        ".rar",
        ".7z",
        ".tar",
        ".gz",
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
        ".webp",
        ".svg",
        ".mp4",
        ".avi",
        ".mov",
        ".mkv",
        ".mp3",
        ".wav",
        ".flac",
        ".exe",
        ".dmg",
        ".pkg",
        ".deb",
        ".rpm",
        ".apk",
        ".ipa",
      ];

      return downloadableExtensions.some((ext) => pathname.endsWith(ext));
    } catch {
      return false;
    }
  }

  // Get file type from URL
  getFileType(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname.toLowerCase();
      const extension = pathname.split(".").pop();

      switch (extension) {
        case "pdf":
          return "document";
        case "doc":
        case "docx":
        case "txt":
          return "document";
        case "xls":
        case "xlsx":
          return "spreadsheet";
        case "ppt":
        case "pptx":
          return "presentation";
        case "zip":
        case "rar":
        case "7z":
        case "tar":
        case "gz":
          return "archive";
        case "jpg":
        case "jpeg":
        case "png":
        case "gif":
        case "webp":
        case "svg":
          return "image";
        case "mp4":
        case "avi":
        case "mov":
        case "mkv":
          return "video";
        case "mp3":
        case "wav":
        case "flac":
        case "m4a":
          return "audio";
        case "exe":
        case "dmg":
        case "pkg":
        case "deb":
        case "rpm":
          return "application";
        default:
          return "file";
      }
    } catch {
      return "file";
    }
  }
}

// Export singleton instance
export const downloadService = new DownloadService();
