chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed");

  chrome.sidePanel.setPanelBehavior({
    openPanelOnActionClick: true,
  });
});
