// Popup script
document.addEventListener('DOMContentLoaded', async () => {
    const apiUrlInput = document.getElementById('apiUrl');
    const apiKeyInput = document.getElementById('apiKey');
    const saveBtn = document.getElementById('saveBtn');
    const testBtn = document.getElementById('testBtn');
    const statusDiv = document.getElementById('status');

    // Load saved settings
    const settings = await chrome.storage.sync.get(['apiUrl', 'apiKey']);
    apiUrlInput.value = settings.apiUrl || 'http://localhost:3001/api';
    apiKeyInput.value = settings.apiKey || '';

    // Save settings
    saveBtn.addEventListener('click', async () => {
        const apiUrl = apiUrlInput.value.trim().replace(/\/$/, ''); // Remove trailing slash
        const apiKey = apiKeyInput.value.trim();

        await chrome.storage.sync.set({ apiUrl, apiKey });

        showStatus('Settings saved!', false);
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
