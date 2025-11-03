// ============================================
// BACKGROUND SERVICE WORKER
// Handles API requests that require CORS bypass
// ============================================

console.log('Background service worker loaded');

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Add widget API handlers here if needed
    return false;
});

// Listen for extension install/update events
chrome.runtime.onInstalled.addListener((details) => {
    console.log('Extension installed/updated', details.reason);
});
