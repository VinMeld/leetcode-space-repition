// Popup script
document.addEventListener('DOMContentLoaded', async () => {
    const apiUrlInput = document.getElementById('apiUrl');
    const saveBtn = document.getElementById('saveBtn');
    const testBtn = document.getElementById('testBtn');
    const statusDiv = document.getElementById('status');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const loggedInState = document.getElementById('loggedInState');

    // Load saved settings
    const settings = await chrome.storage.sync.get(['apiUrl', 'token']);
    apiUrlInput.value = settings.apiUrl || 'http://localhost:3001/api';
    updateUI(settings.token);

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
        const apiUrl = apiUrlInput.value.trim().replace(/\/$/, ''); // Remove trailing slash
        await chrome.storage.sync.set({ apiUrl });
        showStatus('Settings saved!', false);
    });

    // Login
    loginBtn.addEventListener('click', () => {
        // We assume the webapp is running on localhost:5173 for now
        // In production, this would be the deployed URL
        chrome.tabs.create({ url: 'http://localhost:5173/login?extension=true' });
    });

    // Logout
    logoutBtn.addEventListener('click', async () => {
        await chrome.storage.sync.remove('token');
        updateUI(null);
        showStatus('Logged out', false);
    });

    // Test connection
    testBtn.addEventListener('click', async () => {
        testBtn.disabled = true;
        testBtn.textContent = 'Testing...';

        try {
            const response = await chrome.runtime.sendMessage({ action: 'testConnection' });

            if (response.success) {
                showStatus('✓ Connected successfully!', false);
            } else {
                showStatus(`✗ ${response.error}`, true);
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

        // Hide after 3 seconds
        setTimeout(() => {
            statusDiv.className = 'status';
        }, 3000);
    }
});
