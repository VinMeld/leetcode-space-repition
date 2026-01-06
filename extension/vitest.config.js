import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'happy-dom',
        include: ['src/**/*.test.js', '__tests__/**/*.test.js'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
            include: ['*.js'],
            exclude: ['**/*.test.js', 'vitest.config.js', 'playwright.config.js'],
        },
    },
});
