// Popup script with Firefox compatibility
document.addEventListener('DOMContentLoaded', async () => {
    const apiUrlInput = document.getElementById('apiUrl');
    const webappUrlInput = document.getElementById('webappUrl');
    const saveBtn = document.getElementById('saveBtn');
    const testBtn = document.getElementById('testBtn');
    const statusDiv = document.getElementById('status');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const loggedInState = document.getElementById('loggedInState');

    // Use browser API for Firefox, chrome for Chrome
    const storage = (typeof browser !== 'undefined' && browser.storage)
        ? browser.storage.local
        : chrome.storage.sync;

    // Helper to get from storage
    async function getStorage(keys) {
        try {
            if (typeof browser !== 'undefined' && browser.storage) {
                return await browser.storage.local.get(keys);
            } else {
                return await chrome.storage.sync.get(keys);
            }
        } catch (e) {
            console.error('Storage get error:', e);
            return {};
        }
    }

    // Helper to set storage
    async function setStorage(data) {
        try {
            if (typeof browser !== 'undefined' && browser.storage) {
                await browser.storage.local.set(data);
            } else {
                await chrome.storage.sync.set(data);
            }
            return true;
        } catch (e) {
            console.error('Storage set error:', e);
            return false;
        }
    }

    // Helper to remove from storage
    async function removeStorage(key) {
        try {
            if (typeof browser !== 'undefined' && browser.storage) {
                await browser.storage.local.remove(key);
            } else {
                await chrome.storage.sync.remove(key);
            }
        } catch (e) {
            console.error('Storage remove error:', e);
        }
    }

    // Load saved settings
    const settings = await getStorage(['apiUrl', 'webappUrl', 'token']);
    console.log('[LeetCode SR] Loaded settings:', settings);

    apiUrlInput.value = (settings && settings.apiUrl) || 'http://localhost:3001/api';
    webappUrlInput.value = (settings && settings.webappUrl) || 'http://localhost:5173';
    updateUI(settings && settings.token);

    // Update UI based on token presence
    function updateUI(token) {
        if (token) {
            loginBtn.style.display = 'none';
            loggedInState.style.display = 'block';
        } else {
            loginBtn.style.display = 'block';
            loggedInState.style.display = 'none';
        }
    }

    // Save settings
    saveBtn.addEventListener('click', async () => {
        const apiUrl = apiUrlInput.value.trim().replace(/\/$/, '');
        const webappUrl = webappUrlInput.value.trim().replace(/\/$/, '');

        console.log('[LeetCode SR] Saving settings:', { apiUrl, webappUrl });

        const success = await setStorage({ apiUrl, webappUrl });

        if (success) {
            // Verify it was saved
            const verify = await getStorage(['apiUrl', 'webappUrl']);
            console.log('[LeetCode SR] Verified saved settings:', verify);
            showStatus('Settings saved!', false);
        } else {
            showStatus('Failed to save settings', true);
        }
    });

    // Login
    loginBtn.addEventListener('click', () => {
        const webappUrl = webappUrlInput.value.trim().replace(/\/$/, '') || 'http://localhost:5173';
        console.log('[LeetCode SR] Opening login at:', webappUrl);

        if (typeof browser !== 'undefined') {
            browser.tabs.create({ url: `${webappUrl}/login?extension=true` });
        } else {
            chrome.tabs.create({ url: `${webappUrl}/login?extension=true` });
        }
    });

    // Logout
    logoutBtn.addEventListener('click', async () => {
        await removeStorage('token');
        updateUI(null);
        showStatus('Logged out', false);
    });

    // Test connection
    testBtn.addEventListener('click', async () => {
        testBtn.disabled = true;
        testBtn.textContent = 'Testing...';

        try {
            const sendMessage = (typeof browser !== 'undefined')
                ? browser.runtime.sendMessage
                : chrome.runtime.sendMessage;

            const response = await sendMessage({ action: 'testConnection' });

            if (response && response.success) {
                showStatus('✓ Connected successfully!', false);
            } else {
                showStatus(`✗ ${response?.error || 'Connection failed'}`, true);
            }
        } catch (error) {
            showStatus(`✗ ${error.message}`, true);
        } finally {
            testBtn.disabled = false;
            testBtn.textContent = 'Test Connection';
        }
    });

    function showStatus(message, isError) {
        statusDiv.textContent = message;
        statusDiv.className = `status ${isError ? 'error' : 'success'}`;

        setTimeout(() => {
            statusDiv.className = 'status';
        }, 3000);
    }

    // Handle customize shortcuts link
    const customizeLink = document.getElementById('customizeLink');
    if (customizeLink) {
        customizeLink.addEventListener('click', (e) => {
            e.preventDefault();
            // Firefox uses about:addons, Chrome uses chrome://extensions/shortcuts
            const isFirefox = typeof browser !== 'undefined';
            if (isFirefox) {
                // Firefox: Can't open about:addons, show instructions
                alert('To customize shortcuts in Firefox:\\n\\n1. Type about:addons in the address bar\\n2. Click the gear icon (⚙️)\\n3. Select "Manage Extension Shortcuts"');
            } else {
                // Chrome
                chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
            }
        });
    }
});

