chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed");

  chrome.sidePanel.setPanelBehavior({
    openPanelOnActionClick: true,
  });
});

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type === 'OPEN_SIDEPANEL') {
    chrome.sidePanel.open({ tabId: sender.tab.id });
  }
});