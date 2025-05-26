import React from "react";
import "../styles/StatusBadge.css";

/**
 * Reusable component for displaying application status
 * Works for both renewal and termination processes
 */
const ApplicationStatusBadge = ({ status }) => {
    // Helper function to get status color class
    const getStatusColor = (status) => {
        switch (status) {
            case "Department Chair Approved":
                return "status-badge-yellow";
            case "Dean Approved":
                return "status-badge-blue";
            case "Provost Approved":
                return "status-badge-purple";
            case "HR Approved":
                return "status-badge-green";
            case "Completed":
                return "status-badge-gray";
            case "Approved":
                return "status-badge-green";
            case "Rejected":
                return "status-badge-red";
            default:
                return "status-badge-red";
        }
    };

    return (
        <span className={`status-badge ${getStatusColor(status)}`}>
            {status}
        </span>
    );
};

export default ApplicationStatusBadge;