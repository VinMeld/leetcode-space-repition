import React from 'react';
import './Tabs.css';

interface Tab {
    id: string;
    label: string;
    icon?: React.ReactNode;
    count?: number;
}

interface TabsProps {
    tabs: Tab[];
    activeTab: string;
    onTabChange: (tabId: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onTabChange }) => {
    return (
        <div className="tabs" role="tablist">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    className={`tab ${activeTab === tab.id ? 'tab-active' : ''}`}
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    onClick={() => onTabChange(tab.id)}
                >
                    {tab.icon && <span className="tab-icon">{tab.icon}</span>}
                    <span className="tab-label">{tab.label}</span>
                    {tab.count !== undefined && tab.count > 0 && (
                        <span className="tab-count">{tab.count}</span>
                    )}
                </button>
            ))}
        </div>
    );
};

interface TabPanelProps {
    id: string;
    activeTab: string;
    children: React.ReactNode;
}

export const TabPanel: React.FC<TabPanelProps> = ({ id, activeTab, children }) => {
    if (id !== activeTab) return null;

    return (
        <div role="tabpanel" className="tab-panel animate-fade-in">
            {children}
        </div>
    );
};

export default Tabs;
