import React from "react";
import "../styles/TabPanel.css"; // Create a common CSS file

/**
 * Reusable tab panel component to toggle between different content sections
 * Used for switching between renewals and terminations
 */
const TabPanel = ({ activeTab, setActiveTab, tabs }) => {
    return (
        <div className="panel-tabs">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
                    onClick={() => setActiveTab(tab.id)}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
};

export default TabPanel;