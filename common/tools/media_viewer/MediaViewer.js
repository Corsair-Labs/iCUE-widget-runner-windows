(function (global) {
  class MediaViewer {
    constructor(options = {}) {
      this.container = options.container;
      this.onMediaLoaded = options.onMediaLoaded || function () {};
      this.onMediaError = options.onMediaError || function () {};
      this.currentMediaPath = null;
      this.mediaElement = null;
      if (!this.container) throw new Error('MediaViewer: container is required');
    }

    loadMedia(config = {}) {
      const mediaPath = config.path || config.pathToAsset || '';
      if (!mediaPath) {
        this.clear();
        return;
      }
      if (this.currentMediaPath === mediaPath) return;

      this.clear();
      const ext = String(mediaPath).split('.').pop().toLowerCase();
      const isVideo = ['mp4', 'webm', 'ogg', 'mov', 'mkv'].includes(ext);
      const element = document.createElement(isVideo ? 'video' : 'img');
      element.className = 'media-viewer-element';

      if (isVideo) {
        element.autoplay = true;
        element.loop = true;
        element.muted = true;
        element.playsInline = true;
      }

      element.onload = () => this.onMediaLoaded(element);
      element.onloadeddata = () => {
        if (typeof element.play === 'function') element.play().catch(() => {});
        this.onMediaLoaded(element);
      };
      element.onerror = () => this.onMediaError(new Error('Failed to load media: ' + mediaPath));
      element.src = mediaPath;

      this.container.appendChild(element);
      this.mediaElement = element;
      this.currentMediaPath = mediaPath;
    }

    clear() {
      this.currentMediaPath = null;
      this.mediaElement = null;
      if (this.container) this.container.textContent = '';
    }

    destroy() {
      this.clear();
    }
  }

  global.MediaViewer = MediaViewer;
})(window);
