import React from 'react';
import './Badge.css';

interface BadgeProps {
    variant?: 'default' | 'easy' | 'medium' | 'hard' | 'success' | 'warning' | 'danger';
    size?: 'sm' | 'md';
    children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
    variant = 'default',
    size = 'md',
    children,
}) => {
    return (
        <span className={`badge badge-${variant} badge-${size}`}>
            {children}
        </span>
    );
};

export default Badge;
