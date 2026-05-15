/**
 * Coordinates keyboard command, capture completion, and badge feedback.
 */

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ includePortableCss: true });
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type === 'CAPTURE_DONE' && typeof message.html === 'string') {
    chrome.storage.local.set({
      lastCaptureHtml: message.html,
      lastCaptureAt: Date.now(),
      lastCaptureUrl: sender.tab?.url || ''
    });
    if (sender.tab?.id) {
      chrome.action.setBadgeText({ tabId: sender.tab.id, text: '✓' });
      chrome.action.setBadgeBackgroundColor({ tabId: sender.tab.id, color: '#15803d' });
      setTimeout(() => {
        chrome.action.setBadgeText({ tabId: sender.tab.id, text: '' });
      }, 4000);
    }
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'pick-element') return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  const url = tab.url || '';
  if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('edge://')) {
    return;
  }
  const { includePortableCss } = await chrome.storage.local.get('includePortableCss');
  try {
    await chrome.tabs.sendMessage(tab.id, {
      type: 'START_PICK',
      options: { includePortableCss: !!includePortableCss }
    });
  } catch {
    chrome.action.setBadgeText({ tabId: tab.id, text: '!' });
    chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: '#b45309' });
    setTimeout(() => chrome.action.setBadgeText({ tabId: tab.id, text: ''), 5000);
  }
});
