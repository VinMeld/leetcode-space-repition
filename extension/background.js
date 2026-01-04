// Background service worker
// Handles keyboard commands and API communication

const DEFAULT_API_URL = 'http://localhost:3001/api';

// Get settings from storage
async function getSettings() {
    const result = await chrome.storage.sync.get(['apiUrl', 'apiKey']);
    return {
        apiUrl: result.apiUrl || DEFAULT_API_URL,
        apiKey: result.apiKey || '',
    };
}

// Make API request
async function apiRequest(endpoint, method = 'GET', body = null) {
    const { apiUrl, apiKey } = await getSettings();

    if (!apiKey) {
        throw new Error('API key not configured. Open extension popup to set it.');
    }

    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`${apiUrl}${endpoint}`, options);

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
}

// Get problem metadata from active tab
async function getProblemFromTab(tabId) {
    try {
        const response = await chrome.tabs.sendMessage(tabId, { action: 'getProblemMeta' });
        return response;
    } catch (error) {
        console.error('[LeetCode SR] Failed to get problem meta:', error);
        return null;
    }
}

// Add problem to tracker
async function addProblem(meta) {
    const result = await apiRequest('/problems', 'POST', {
        title: meta.title,
        leetcodeUrl: meta.url,
        difficulty: meta.difficulty,
        notes: '',
    });
    return result;
}

// Rate/review a problem
async function reviewProblem(slug, quality) {
    // First, we need to find the problem by URL
    // For now, we'll fetch all problems and find by URL
    const problemsResponse = await apiRequest('/problems');
    const problems = problemsResponse.json ? await problemsResponse.json() : problemsResponse;

    // Find problem by slug in URL
    const problem = problems.find(p => p.leetcode_url.includes(slug));

    if (!problem) {
        throw new Error('Problem not found. Add it first with Alt+1.');
    }

    const result = await apiRequest('/problems/review', 'POST', {
        problemId: problem.id,
        quality,
    });
    return result;
}

// Show notification
function showNotification(title, message, isError = false) {
    // Use badge text for quick feedback
    chrome.action.setBadgeText({ text: isError ? '!' : '✓' });
    chrome.action.setBadgeBackgroundColor({ color: isError ? '#f85149' : '#3fb950' });

    // Clear badge after 2 seconds
    setTimeout(() => {
        chrome.action.setBadgeText({ text: '' });
    }, 2000);

    console.log(`[LeetCode SR] ${isError ? 'Error' : 'Success'}: ${title} - ${message}`);
}

// Handle keyboard commands
chrome.commands.onCommand.addListener(async (command) => {
    console.log('[LeetCode SR] Command:', command);

    try {
        // Get active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab || !tab.url) {
            showNotification('Error', 'No active tab', true);
            return;
        }

        // Check if we're on a supported site
        if (!tab.url.includes('leetcode.com/problems') && !tab.url.includes('neetcode.io/problems')) {
            showNotification('Error', 'Navigate to a LeetCode or NeetCode problem first', true);
            return;
        }

        // Get problem metadata
        const meta = await getProblemFromTab(tab.id);
        if (!meta) {
            showNotification('Error', 'Could not parse problem. Refresh and try again.', true);
            return;
        }

        if (command === 'add-problem') {
            await addProblem(meta);
            showNotification('Added', `${meta.title} (${meta.difficulty})`);
        } else if (command.startsWith('rate-')) {
            const quality = parseInt(command.split('-')[1], 10);
            await reviewProblem(meta.slug, quality);
            showNotification('Reviewed', `${meta.title} rated ${quality}`);
        }
    } catch (error) {
        console.error('[LeetCode SR] Command failed:', error);
        showNotification('Error', error.message, true);
    }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'testConnection') {
        apiRequest('/health')
            .then(data => sendResponse({ success: true, data }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Keep channel open
    }
});
