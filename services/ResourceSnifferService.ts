interface ResourceItem {
  id: string;
  url: string;
  type: 'image' | 'video' | 'audio' | 'document' | 'script' | 'style' | 'other';
  name: string;
  size?: string;
  extension?: string;
  thumbnail?: string;
}

class ResourceSnifferService {
  private static instance: ResourceSnifferService;

  public static getInstance(): ResourceSnifferService {
    if (!ResourceSnifferService.instance) {
      ResourceSnifferService.instance = new ResourceSnifferService();
    }
    return ResourceSnifferService.instance;
  }

  // 生成用于注入WebView的资源嗅探脚本
  public generateResourceSnifferScript(): string {
    return `
      (function() {
        const extractResources = () => {
          const resources = [];
          const baseUrl = window.location.origin;
          
          // 辅助函数：获取绝对URL
          const getAbsoluteUrl = (url) => {
            if (!url) return '';
            if (url.startsWith('http://') || url.startsWith('https://')) {
              return url;
            }
            if (url.startsWith('//')) {
              return window.location.protocol + url;
            }
            if (url.startsWith('/')) {
              return baseUrl + url;
            }
            return new URL(url, window.location.href).href;
          };
          
          // 辅助函数：获取文件扩展名
          const getFileExtension = (url) => {
            try {
              const pathname = new URL(url).pathname;
              const match = pathname.match(/\\.([^.]+)$/);
              return match ? match[1].toLowerCase() : '';
            } catch {
              return '';
            }
          };
          
          // 辅助函数：获取文件名
          const getFileName = (url) => {
            try {
              const pathname = new URL(url).pathname;
              const segments = pathname.split('/');
              return segments[segments.length - 1] || 'unknown';
            } catch {
              return 'unknown';
            }
          };
          
          // 辅助函数：确定资源类型
          const getResourceType = (url, tagName, mimeType) => {
            const extension = getFileExtension(url);
            
            // 根据标签类型判断
            if (tagName === 'IMG') return 'image';
            if (tagName === 'VIDEO') return 'video';
            if (tagName === 'AUDIO') return 'audio';
            if (tagName === 'SCRIPT') return 'script';
            if (tagName === 'LINK' && mimeType && mimeType.includes('css')) return 'style';
            
            // 根据文件扩展名判断
            const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];
            const videoExts = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', 'm4v'];
            const audioExts = ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'wma'];
            const documentExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf'];
            const scriptExts = ['js', 'ts', 'jsx', 'tsx'];
            const styleExts = ['css', 'scss', 'sass', 'less'];
            
            if (imageExts.includes(extension)) return 'image';
            if (videoExts.includes(extension)) return 'video';
            if (audioExts.includes(extension)) return 'audio';
            if (documentExts.includes(extension)) return 'document';
            if (scriptExts.includes(extension)) return 'script';
            if (styleExts.includes(extension)) return 'style';
            
            return 'other';
          };
          
          // 提取图片资源
          const images = document.querySelectorAll('img[src]');
          images.forEach((img, index) => {
            const src = getAbsoluteUrl(img.src);
            if (src && !src.startsWith('data:')) {
              resources.push({
                id: 'img_' + index,
                url: src,
                type: 'image',
                name: getFileName(src) || img.alt || 'Image',
                extension: getFileExtension(src),
                thumbnail: src, // 图片本身作为缩略图
              });
            }
          });
          
          // 提取视频资源
          const videos = document.querySelectorAll('video[src], video source[src]');
          videos.forEach((video, index) => {
            const src = getAbsoluteUrl(video.src);
            if (src) {
              resources.push({
                id: 'video_' + index,
                url: src,
                type: 'video',
                name: getFileName(src) || 'Video',
                extension: getFileExtension(src),
              });
            }
          });
          
          // 提取音频资源
          const audios = document.querySelectorAll('audio[src], audio source[src]');
          audios.forEach((audio, index) => {
            const src = getAbsoluteUrl(audio.src);
            if (src) {
              resources.push({
                id: 'audio_' + index,
                url: src,
                type: 'audio',
                name: getFileName(src) || 'Audio',
                extension: getFileExtension(src),
              });
            }
          });
          
          // 提取链接资源（可能是文档）
          const links = document.querySelectorAll('a[href]');
          links.forEach((link, index) => {
            const href = getAbsoluteUrl(link.href);
            if (href && href !== window.location.href) {
              const type = getResourceType(href, 'A');
              if (type === 'document' || type === 'other') {
                resources.push({
                  id: 'link_' + index,
                  url: href,
                  type: type,
                  name: link.textContent?.trim() || getFileName(href) || 'Link',
                  extension: getFileExtension(href),
                });
              }
            }
          });
          
          // 提取脚本资源
          const scripts = document.querySelectorAll('script[src]');
          scripts.forEach((script, index) => {
            const src = getAbsoluteUrl(script.src);
            if (src) {
              resources.push({
                id: 'script_' + index,
                url: src,
                type: 'script',
                name: getFileName(src) || 'Script',
                extension: getFileExtension(src),
              });
            }
          });
          
          // 提取样式表资源
          const stylesheets = document.querySelectorAll('link[rel="stylesheet"][href]');
          stylesheets.forEach((link, index) => {
            const href = getAbsoluteUrl(link.href);
            if (href) {
              resources.push({
                id: 'style_' + index,
                url: href,
                type: 'style',
                name: getFileName(href) || 'Stylesheet',
                extension: getFileExtension(href),
              });
            }
          });
          
          // 提取背景图片（CSS中的）
          const elementsWithBg = document.querySelectorAll('*');
          elementsWithBg.forEach((element, index) => {
            const style = window.getComputedStyle(element);
            const bgImage = style.backgroundImage;
            if (bgImage && bgImage !== 'none') {
              const match = bgImage.match(/url\\(["']?([^"'\\)]+)["']?\\)/);
              if (match && match[1]) {
                const src = getAbsoluteUrl(match[1]);
                if (src && !src.startsWith('data:')) {
                  resources.push({
                    id: 'bg_' + index,
                    url: src,
                    type: 'image',
                    name: getFileName(src) || 'Background Image',
                    extension: getFileExtension(src),
                    thumbnail: src,
                  });
                }
              }
            }
          });
          
          return resources;
        };
        
        // 监听资源嗅探请求
        window.addEventListener('message', (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'extract_resources') {
              const resources = extractResources();
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'resources_extracted',
                resources: resources,
                timestamp: Date.now()
              }));
            }
          } catch (error) {
            console.error('Resource sniffer error:', error);
          }
        });
        
        // 自动提取资源并发送
        const resources = extractResources();
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'resources_extracted',
          resources: resources,
          timestamp: Date.now()
        }));
        
      })();
      
      true; // Required for iOS
    `;
  }

  // 处理从WebView接收到的资源数据
  public processExtractedResources(rawResources: any[]): ResourceItem[] {
    const processedResources: ResourceItem[] = [];
    const seenUrls = new Set<string>();

    rawResources.forEach((resource) => {
      // 去重
      if (seenUrls.has(resource.url)) {
        return;
      }
      seenUrls.add(resource.url);

      // 处理并验证资源
      const processedResource: ResourceItem = {
        id: resource.id || this.generateId(),
        url: resource.url,
        type: this.validateResourceType(resource.type),
        name: this.sanitizeResourceName(resource.name),
        extension: resource.extension,
        thumbnail: resource.thumbnail,
      };

      // 估算文件大小（如果没有提供）
      if (!resource.size) {
        processedResource.size = this.estimateFileSize(processedResource);
      }

      processedResources.push(processedResource);
    });

    return processedResources;
  }

  // 生成唯一ID
  private generateId(): string {
    return 'resource_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // 验证资源类型
  private validateResourceType(type: string): ResourceItem['type'] {
    const validTypes: ResourceItem['type'][] = ['image', 'video', 'audio', 'document', 'script', 'style', 'other'];
    return validTypes.includes(type as ResourceItem['type']) ? type as ResourceItem['type'] : 'other';
  }

  // 清理资源名称
  private sanitizeResourceName(name: string): string {
    if (!name || name.trim() === '') {
      return 'Unknown Resource';
    }
    return name.trim().substring(0, 100); // 限制长度
  }

  // 估算文件大小
  private estimateFileSize(resource: ResourceItem): string {
    // 根据资源类型和扩展名估算大小
    const estimates: { [key: string]: string } = {
      image: '~500KB',
      video: '~5MB',
      audio: '~3MB',
      document: '~1MB',
      script: '~100KB',
      style: '~50KB',
      other: '~unknown',
    };

    return estimates[resource.type] || '~unknown';
  }

  // 根据URL判断是否为有效的可下载资源
  public isDownloadableResource(url: string): boolean {
    try {
      const urlObj = new URL(url);
      
      // 排除一些不适合下载的协议
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return false;
      }
      
      // 排除过大的文件（通过扩展名简单判断）
      const largeFileExts = ['iso', 'dmg', 'exe', 'msi', 'deb', 'rpm'];
      const extension = this.getFileExtension(url);
      if (largeFileExts.includes(extension)) {
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }

  // 获取文件扩展名
  private getFileExtension(url: string): string {
    try {
      const pathname = new URL(url).pathname;
      const match = pathname.match(/\.([^.]+)$/);
      return match ? match[1].toLowerCase() : '';
    } catch {
      return '';
    }
  }

  // 获取资源的建议下载文件名
  public getSuggestedFilename(resource: ResourceItem): string {
    try {
      const url = new URL(resource.url);
      const pathname = url.pathname;
      const segments = pathname.split('/');
      const filename = segments[segments.length - 1];
      
      if (filename && filename.includes('.')) {
        return filename;
      }
      
      // 如果没有文件名，根据类型生成
      const typeExtensions: { [key: string]: string } = {
        image: 'jpg',
        video: 'mp4',
        audio: 'mp3',
        document: 'pdf',
        script: 'js',
        style: 'css',
      };
      
      const extension = typeExtensions[resource.type] || 'txt';
      const baseName = resource.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
      return `${baseName}.${extension}`;
      
    } catch {
      return `resource_${Date.now()}.txt`;
    }
  }
}

export const resourceSnifferService = ResourceSnifferService.getInstance();
export type { ResourceItem };
