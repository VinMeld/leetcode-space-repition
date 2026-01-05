import React from 'react';
import './Heatmap.css';

interface HeatmapProps {
    data: Record<string, number>;  // date string -> count
}

export const Heatmap: React.FC<HeatmapProps> = ({ data }) => {
    // Generate 365 days of dates ending today
    const today = new Date();
    const days: { date: string; count: number; dayOfWeek: number }[] = [];

    for (let i = 364; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        // Format as YYYY-MM-DD in local time to match server
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        days.push({
            date: dateStr,
            count: data[dateStr] || 0,
            dayOfWeek: date.getDay(),
        });
    }

    // Group by weeks (for column layout)
    const weeks: typeof days[] = [];
    let currentWeek: typeof days = [];

    // Add empty cells at the beginning to align with day of week
    const firstDayOfWeek = days[0].dayOfWeek;
    for (let i = 0; i < firstDayOfWeek; i++) {
        currentWeek.push({ date: '', count: -1, dayOfWeek: i });
    }

    days.forEach(day => {
        currentWeek.push(day);
        if (currentWeek.length === 7) {
            weeks.push(currentWeek);
            currentWeek = [];
        }
    });

    if (currentWeek.length > 0) {
        weeks.push(currentWeek);
    }

    const getIntensity = (count: number): number => {
        if (count <= 0) return 0;
        if (count <= 2) return 1;
        if (count <= 4) return 2;
        if (count <= 6) return 3;
        return 4;
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return (
        <div className="heatmap-container">
            <div className="heatmap-months">
                {monthLabels.map((month) => (
                    <span key={month} className="heatmap-month">{month}</span>
                ))}
            </div>
            <div className="heatmap-wrapper">
                <div className="heatmap-days">
                    <span>Mon</span>
                    <span>Wed</span>
                    <span>Fri</span>
                </div>
                <div className="heatmap-grid">
                    {weeks.map((week, weekIndex) => (
                        <div key={weekIndex} className="heatmap-week">
                            {week.map((day, dayIndex) => (
                                <div
                                    key={`${weekIndex}-${dayIndex}`}
                                    className={`heatmap-cell heatmap-level-${day.count < 0 ? 'empty' : getIntensity(day.count)}`}
                                    title={day.date ? `${formatDate(day.date)}: ${day.count} review${day.count !== 1 ? 's' : ''}` : ''}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
            <div className="heatmap-legend">
                <span>Less</span>
                <div className="heatmap-cell heatmap-level-0" />
                <div className="heatmap-cell heatmap-level-1" />
                <div className="heatmap-cell heatmap-level-2" />
                <div className="heatmap-cell heatmap-level-3" />
                <div className="heatmap-cell heatmap-level-4" />
                <span>More</span>
            </div>
        </div>
    );
};

export default Heatmap;
