import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock components that SRSettings depends on
vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({ user: { provider: 'local' } })
}));

vi.mock('../../lib/settings', () => ({
    loadSettings: () => ({
        requestRetention: 0.9,
        maxInterval: 365,
        sameDayRetry: true,
        minInterval: 1,
    }),
    saveSettings: vi.fn(),
    defaultSettings: {
        requestRetention: 0.9,
        maxInterval: 365,
        sameDayRetry: true,
        minInterval: 1,
    },
}));

// Import the component after mocks
import { SRSettings } from '../SRSettings';

describe('SRSettings FSRS Settings', () => {
    it('should render FSRS scheduling section', () => {
        render(<SRSettings />);

        expect(screen.getByText('FSRS Scheduling')).toBeInTheDocument();
        expect(screen.getByText('Target Retention')).toBeInTheDocument();
    });

    it('should render retention slider and max interval slider', () => {
        render(<SRSettings />);

        // Should find sliders (range inputs)
        const sliders = screen.getAllByRole('slider');
        expect(sliders.length).toBeGreaterThanOrEqual(2);
    });

    it('should display current retention value', () => {
        render(<SRSettings />);

        // Should show 90% (0.9 * 100)
        expect(screen.getByText('90%')).toBeInTheDocument();
    });

    it('should render same day retry toggle', () => {
        render(<SRSettings />);

        // Find the checkbox toggle
        const checkboxes = screen.getAllByRole('checkbox');
        expect(checkboxes.length).toBeGreaterThanOrEqual(1);
    });

    it('should render Reschedule All Problems button', () => {
        render(<SRSettings />);

        expect(screen.getByText('Reschedule All Problems')).toBeInTheDocument();
    });
});
