// Listen for messages from the webapp
window.addEventListener('message', (event) => {
    // We only accept messages from ourselves
    if (event.source !== window) {
        return;
    }

    if (event.data.type && event.data.type === 'EXTENSION_LOGIN_SUCCESS') {
        console.log('[LeetCode SR Extension] Received login token from webapp');

        // Forward to background script
        chrome.runtime.sendMessage({
            action: 'saveToken',
            token: event.data.token
        }, (response) => {
            if (response && response.success) {
                console.log('[LeetCode SR Extension] Token saved successfully');
            }
        });
    }
});
