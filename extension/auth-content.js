// Listen for messages from the webapp (Firefox compatible)
window.addEventListener('message', (event) => {
    // We only accept messages from ourselves
    if (event.source !== window) {
        return;
    }

    if (event.data.type && event.data.type === 'EXTENSION_LOGIN_SUCCESS') {
        console.log('[LeetCode SR Extension] Received login token from webapp');

        // Use browser API for Firefox, chrome for Chrome
        const runtime = (typeof browser !== 'undefined') ? browser.runtime : chrome.runtime;

        // Forward to background script
        runtime.sendMessage({
            action: 'saveToken',
            token: event.data.token
        }).then((response) => {
            if (response && response.success) {
                console.log('[LeetCode SR Extension] Token saved successfully');
            } else {
                console.error('[LeetCode SR Extension] Failed to save token:', response);
            }
        }).catch((error) => {
            console.error('[LeetCode SR Extension] Error saving token:', error);
        });
    }
});

console.log('[LeetCode SR Extension] Auth content script loaded on', window.location.href);
