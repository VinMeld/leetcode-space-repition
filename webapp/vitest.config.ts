import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom',
        include: ['src/**/*.{test,spec}.{ts,tsx}'],
        setupFiles: ['./src/test/setup.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
            include: ['src/server/**/*.ts', 'src/lib/**/*.ts', 'src/components/**/*.tsx', 'src/pages/**/*.tsx', 'src/context/**/*.tsx'],
            exclude: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
        },
        testTimeout: 10000,
    },
});
