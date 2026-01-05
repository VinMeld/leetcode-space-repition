import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Heatmap from '../Heatmap';

describe('Heatmap Component', () => {
    it('renders month labels', () => {
        render(<Heatmap data={{}} />);
        expect(screen.getByText('Jan')).toBeInTheDocument();
        expect(screen.getByText('Dec')).toBeInTheDocument();
    });

    it('renders cells with correct intensity', () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;

        const data = {
            [todayStr]: 5, // Intensity 3
        };

        const { container } = render(<Heatmap data={data} />);

        // Find cell with intensity 3
        const cell = container.querySelector('.heatmap-level-3');
        expect(cell).toBeInTheDocument();
        expect(cell).toHaveAttribute('title', expect.stringContaining('5 reviews'));
    });

    it('handles empty data gracefully', () => {
        const { container } = render(<Heatmap data={{}} />);
        // Should render cells with level 0
        const emptyCells = container.querySelectorAll('.heatmap-level-0');
        expect(emptyCells.length).toBeGreaterThan(0);
    });
});
