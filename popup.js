const STORAGE_KEY = 'removeListEnabled';
const YOUTUBE_HOSTS = new Set(['www.youtube.com', 'youtube.com', 'm.youtube.com', 'youtu.be']);

function stripListParameter(urlString) {
  const url = new URL(urlString);
  url.searchParams.delete('list');
  return url.toString();
}

function getActiveTab() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (!tabs.length || !tabs[0].url) {
        reject(new Error('Unable to find an active tab URL.'));
        return;
      }

      resolve(tabs[0]);
    });
  });
}

function getSetting() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get({ [STORAGE_KEY]: true }, (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve(Boolean(result[STORAGE_KEY]));
    });
  });
}

function setSetting(value) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set({ [STORAGE_KEY]: value }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve();
    });
  });
}

async function copyCurrentTabLink() {
  const status = document.getElementById('status');

  try {
    const [tab, removeListEnabled] = await Promise.all([getActiveTab(), getSetting()]);
    const tabUrl = new URL(tab.url);

    if (!YOUTUBE_HOSTS.has(tabUrl.hostname)) {
      status.textContent = 'Open a YouTube page first.';
      return;
    }

    const linkToCopy = removeListEnabled ? stripListParameter(tab.url) : tab.url;
    await navigator.clipboard.writeText(linkToCopy);

    status.textContent = 'Link copied.';
  } catch (error) {
    console.error(error);
    status.textContent =
      error?.name === 'NotAllowedError'
        ? 'Clipboard permission denied.'
        : 'Could not copy link.';
  }
}

async function initPopup() {
  const enabledInput = document.getElementById('enabled');
  const status = document.getElementById('status');

  try {
    enabledInput.checked = await getSetting();

    enabledInput.addEventListener('change', async () => {
      try {
        await setSetting(enabledInput.checked);
      } catch (error) {
        console.error(error);
        status.textContent = 'Could not save setting.';
      }
    });

    const copyButton = document.getElementById('copyButton');
    copyButton.addEventListener('click', copyCurrentTabLink);
  } catch (error) {
    console.error(error);
    status.textContent = 'Could not load setting.';
  }
}

initPopup();
