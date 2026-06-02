const STORAGE_KEY = 'removeListEnabled';

// Get the setting from storage
function getSetting() {
  return new Promise((resolve) => {
    chrome.storage.sync.get({ [STORAGE_KEY]: true }, (result) => {
      resolve(Boolean(result[STORAGE_KEY]));
    });
  });
}

// Strip the list parameter from URL
function stripListParameter(urlString) {
  try {
    const url = new URL(urlString);
    url.searchParams.delete('list');
    return url.toString();
  } catch {
    return urlString;
  }
}

// Get the video URL from an element
function getVideoUrl(element) {
  // Check if element is a link
  if (element.tagName === 'A' && element.href) {
    return element.href;
  }
  
  // Check for parent link
  const link = element.closest('a[href*="youtube.com"], a[href*="youtu.be"]');
  if (link && link.href) {
    return link.href;
  }
  
  return null;
}

// Create and inject hover button
function createHoverButton(videoUrl, removeList) {
  const button = document.createElement('button');
  button.className = 'yt-copy-hover-btn';
  button.title = 'Copy video link';
  button.innerHTML = '📋';
  
  button.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const linkToCopy = removeList ? stripListParameter(videoUrl) : videoUrl;
    
    try {
      await navigator.clipboard.writeText(linkToCopy);
      button.innerHTML = '✓';
      button.classList.add('copied');
      
      setTimeout(() => {
        button.innerHTML = '📋';
        button.classList.remove('copied');
      }, 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      button.innerHTML = '✗';
      setTimeout(() => {
        button.innerHTML = '📋';
      }, 1500);
    }
  });
  
  return button;
}

// Handle hover for video elements
function setupVideoHover(element, removeList) {
  element.addEventListener('mouseenter', () => {
    // Don't add if button already exists
    if (element.querySelector('.yt-copy-hover-btn')) {
      return;
    }
    
    const videoUrl = getVideoUrl(element);
    if (!videoUrl) return;
    
    const button = createHoverButton(videoUrl, removeList);
    element.style.position = 'relative';
    element.appendChild(button);
  });
  
  element.addEventListener('mouseleave', () => {
    const button = element.querySelector('.yt-copy-hover-btn');
    if (button) {
      button.remove();
    }
  });
}

// Find and setup all video containers
async function setupVideoButtons() {
  const removeList = await getSetting();
  
  // Selectors for various YouTube video containers
  const selectors = [
    'a[href*="youtube.com/watch"]',
    'a[href*="youtu.be/"]',
    '[data-video-id]',
    'ytd-video-renderer',
    'ytd-compact-video-renderer',
    'ytd-playlist-video-renderer',
    '.video-list-item',
    'a.yt-simple-endpoint[href*="watch"]'
  ];
  
  selectors.forEach(selector => {
    try {
      document.querySelectorAll(selector).forEach(element => {
        // Skip if already setup
        if (element.dataset.videoHoverSetup) return;
        element.dataset.videoHoverSetup = 'true';
        setupVideoHover(element, removeList);
      });
    } catch (e) {
      console.debug('Selector error:', selector, e);
    }
  });
}

// Watch for dynamically added videos (for infinite scroll)
function watchForNewVideos() {
  const observer = new MutationObserver(() => {
    setupVideoButtons();
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Listen for setting changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && STORAGE_KEY in changes) {
    // Re-setup all videos with new setting
    document.querySelectorAll('[data-video-hover-setup]').forEach(el => {
      delete el.dataset.videoHoverSetup;
    });
    setupVideoButtons();
  }
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setupVideoButtons();
    watchForNewVideos();
  });
} else {
  setupVideoButtons();
  watchForNewVideos();
}
