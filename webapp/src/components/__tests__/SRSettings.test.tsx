import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock components that SRSettings depends on
vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({ user: { provider: 'local' } })
}));

vi.mock('../../lib/settings', () => ({
    loadSettings: () => ({
        easyMultiplier: 1.0,
        mediumMultiplier: 1.0,
        hardMultiplier: 1.0,
        sameDayRetry: true,
        wrongAnswerPenalty: 0.5,
        minInterval: 1,
    }),
    saveSettings: vi.fn(),
    defaultSettings: {
        easyMultiplier: 1.0,
        mediumMultiplier: 1.0,
        hardMultiplier: 1.0,
        sameDayRetry: true,
        wrongAnswerPenalty: 0.5,
        minInterval: 1,
    },
}));

// Import the component after mocks
import { SRSettings } from '../SRSettings';

describe('SRSettings Multiplier Selects', () => {
    it('should render all three difficulty rows', () => {
        render(<SRSettings />);

        expect(screen.getByText('Easy')).toBeInTheDocument();
        expect(screen.getByText('Medium')).toBeInTheDocument();
        expect(screen.getByText('Hard')).toBeInTheDocument();
    });

    it('should render select dropdowns for each row', () => {
        render(<SRSettings />);

        // Should find 3 select elements (combobox role)
        const selects = screen.getAllByRole('combobox');
        expect(selects).toHaveLength(3);
    });

    it('should allow changing Easy multiplier', () => {
        render(<SRSettings />);

        // Find the select in the Easy row
        const easyLabel = screen.getByText('Easy');
        const easyRow = easyLabel.closest('.sr-multiplier-row');
        const select = easyRow?.querySelector('select');
        expect(select).toBeInTheDocument();

        // Change value to 0.5
        fireEvent.change(select!, { target: { value: '0.5' } });

        // Value should update
        expect(select).toHaveValue('0.5');
    });

    it('should allow changing Hard multiplier', () => {
        render(<SRSettings />);

        // Find the select in the Hard row
        const hardLabel = screen.getByText('Hard');
        const hardRow = hardLabel.closest('.sr-multiplier-row');
        const select = hardRow?.querySelector('select');
        expect(select).toBeInTheDocument();

        // Change value to 2.0
        fireEvent.change(select!, { target: { value: '2' } });

        // Value should update
        expect(select).toHaveValue('2');
    });
});
