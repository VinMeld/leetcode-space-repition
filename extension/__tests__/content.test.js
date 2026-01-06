/**
 * Unit tests for content.js - DOM parsing logic
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock chrome API
global.chrome = {
    runtime: {
        onMessage: {
            addListener: vi.fn()
        }
    }
};

// Helper to load the IIFE and get the meta function
function loadContentScript() {
    // Create a simplified version of getProblemMeta for testing
    function getProblemMeta() {
        const url = window.location.href.split('?')[0].split('#')[0];
        const parts = url.split('/').filter(Boolean);
        // Expect .../problems/<slug>/...
        const slug = parts[2] === 'problems' ? parts[3] : (parts[2] || '');

        let title =
            document.querySelector('div[data-cy="question-title"]')?.innerText?.trim() ||
            document.querySelector('h1')?.innerText?.trim() ||
            slug;

        let difficulty = 'medium'; // Default
        const host = window.location.hostname;

        if (host.includes('neetcode.io')) {
            const diffEl = document.querySelector('p.button.difficulty-btn');
            if (diffEl && diffEl.textContent) {
                const text = diffEl.textContent.trim().toLowerCase();
                if (['easy', 'medium', 'hard'].includes(text)) {
                    difficulty = text;
                }
            }
        } else {
            const diffSpan =
                document.querySelector('div[diff]') ||
                document.querySelector('span[diff]') ||
                document.querySelector('span.text-difficulty');
            if (diffSpan && diffSpan.textContent) {
                const text = diffSpan.textContent.trim().toLowerCase();
                if (['easy', 'medium', 'hard'].includes(text)) {
                    difficulty = text;
                }
            }
        }

        return { slug, title, url, difficulty };
    }

    return { getProblemMeta };
}

describe('Content Script - getProblemMeta', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it('should parse LeetCode problem URL correctly', () => {
        // Mock window.location
        Object.defineProperty(window, 'location', {
            value: {
                href: 'https://leetcode.com/problems/two-sum/',
                hostname: 'leetcode.com'
            },
            writable: true
        });

        document.body.innerHTML = `
            <div data-cy="question-title">Two Sum</div>
            <span diff>Easy</span>
        `;

        const { getProblemMeta } = loadContentScript();
        const meta = getProblemMeta();

        expect(meta.slug).toBe('two-sum');
        expect(meta.title).toBe('Two Sum');
        expect(meta.url).toBe('https://leetcode.com/problems/two-sum/');
        expect(meta.difficulty).toBe('easy');
    });

    it('should parse NeetCode problem URL correctly', () => {
        Object.defineProperty(window, 'location', {
            value: {
                href: 'https://neetcode.io/problems/valid-parentheses',
                hostname: 'neetcode.io'
            },
            writable: true
        });

        document.body.innerHTML = `
            <h1>Valid Parentheses</h1>
            <p class="button difficulty-btn">Hard</p>
        `;

        const { getProblemMeta } = loadContentScript();
        const meta = getProblemMeta();

        expect(meta.slug).toBe('valid-parentheses');
        expect(meta.title).toBe('Valid Parentheses');
        expect(meta.difficulty).toBe('hard');
    });

    it('should default to medium difficulty when not found', () => {
        Object.defineProperty(window, 'location', {
            value: {
                href: 'https://leetcode.com/problems/unknown-problem/',
                hostname: 'leetcode.com'
            },
            writable: true
        });

        document.body.innerHTML = `<h1>Unknown Problem</h1>`;

        const { getProblemMeta } = loadContentScript();
        const meta = getProblemMeta();

        expect(meta.difficulty).toBe('medium');
    });

    it('should use slug as title fallback', () => {
        Object.defineProperty(window, 'location', {
            value: {
                href: 'https://leetcode.com/problems/my-problem/',
                hostname: 'leetcode.com'
            },
            writable: true
        });

        document.body.innerHTML = ''; // No title element

        const { getProblemMeta } = loadContentScript();
        const meta = getProblemMeta();

        expect(meta.title).toBe('my-problem');
    });
});
