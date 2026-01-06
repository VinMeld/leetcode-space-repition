// Content script - runs on LeetCode and NeetCode pages
// Parses problem metadata from the DOM

(function () {
    'use strict';

    // Use browser API for Firefox, chrome for Chrome
    const runtime = (typeof browser !== 'undefined') ? browser.runtime : chrome.runtime;

    // Listen for messages from background script
    runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'getProblemMeta') {
            const meta = getProblemMeta();
            sendResponse(meta);
        }
        return true; // Keep channel open for async response
    });

    function getProblemMeta() {
        const url = window.location.href.split('?')[0].split('#')[0];
        const parts = url.split('/').filter(Boolean);
        // Expect .../problems/<slug>/...
        const slug = parts[2] === 'problems' ? parts[3] : (parts[2] || '');

        let title =
            document.querySelector('div[data-cy="question-title"]')?.innerText?.trim() || // LeetCode
            document.querySelector('h1')?.innerText?.trim() ||
            slug;

        let difficulty = 'medium'; // Default
        const host = window.location.hostname;

        if (host.includes('neetcode.io')) {
            // NeetCode: the green pill: <p class="button difficulty-btn ...">Easy</p>
            const diffEl = document.querySelector('p.button.difficulty-btn');
            if (diffEl && diffEl.textContent) {
                const text = diffEl.textContent.trim().toLowerCase();
                if (['easy', 'medium', 'hard'].includes(text)) {
                    difficulty = text;
                }
            }
        } else {
            // LeetCode heuristics
            const diffSpan =
                document.querySelector('div[diff]') ||
                document.querySelector('span[diff]') ||
                document.querySelector('span.text-difficulty');
            if (diffSpan && diffSpan.textContent) {
                const text = diffSpan.textContent.trim().toLowerCase();
                if (['easy', 'medium', 'hard'].includes(text)) {
                    difficulty = text;
                }
            } else {
                // Fallback: search body text
                const bodyText = document.body.innerText.toLowerCase();
                if (bodyText.includes('easy')) difficulty = 'easy';
                else if (bodyText.includes('hard')) difficulty = 'hard';
                else if (bodyText.includes('medium')) difficulty = 'medium';
            }
        }

        const meta = { slug, title, url, difficulty };
        console.log('[LeetCode SR] Parsed meta:', meta);
        return meta;
    }

    // Also expose for direct calls
    window.__leetcodeSRGetMeta = getProblemMeta;
})();
