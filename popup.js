const STORAGE_KEY = 'removeListEnabled';

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
  return new Promise((resolve) => {
    chrome.storage.sync.get({ [STORAGE_KEY]: true }, (result) => {
      resolve(Boolean(result[STORAGE_KEY]));
    });
  });
}

function setSetting(value) {
  return new Promise((resolve) => {
    chrome.storage.sync.set({ [STORAGE_KEY]: value }, () => {
      resolve();
    });
  });
}

async function copyCurrentTabLink() {
  const status = document.getElementById('status');

  try {
    const [tab, removeListEnabled] = await Promise.all([getActiveTab(), getSetting()]);

    if (!tab.url || !tab.url.startsWith('https://www.youtube.com/')) {
      status.textContent = 'Open a YouTube page first.';
      return;
    }

    const linkToCopy = removeListEnabled ? stripListParameter(tab.url) : tab.url;
    await navigator.clipboard.writeText(linkToCopy);

    status.textContent = 'Link copied.';
  } catch {
    status.textContent = 'Could not copy link.';
  }
}

async function initPopup() {
  const enabledInput = document.getElementById('enabled');
  enabledInput.checked = await getSetting();

  enabledInput.addEventListener('change', async () => {
    await setSetting(enabledInput.checked);
  });

  const copyButton = document.getElementById('copyButton');
  copyButton.addEventListener('click', copyCurrentTabLink);
}

initPopup();
