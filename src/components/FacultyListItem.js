import React from "react";
import ApplicationStatusBadge from "./ApplicationStatusBadge";
import "../styles/FacultyListItem.css"; // Make sure this file exists in the same directory

/**
 * Reusable component for displaying faculty items in a list
 * Used in both renewal and termination lists
 */
const FacultyListItem = ({
    faculty,
    onViewDetails,
    onInitiateRenewal = null,
    initiatingRenewal = false,
    processType = "renewal" // 'renewal' or 'termination'
}) => {
    // Helper function to check if faculty needs renewal
    const needsRenewal = (faculty) => {
        if (processType !== "renewal") return false;

        const completedStatuses = [
            "Completed",
            "HR Rejected",
            "Provost Rejected",
            "Dean Rejected",
            "Department Chair Rejected",
        ];

        return (
            faculty.days_until_expiration <= 90 &&
            (!faculty.application_status ||
                completedStatuses.includes(faculty.application_status))
        );
    };

    return (
        <div className={processType === "renewal" ? "faculty-item" : "termination-item"}>
            <div className={processType === "renewal" ? "faculty-info" : "termination-info"}>
                <h3 className="faculty-name">
                    {faculty.first_name} {faculty.last_name}
                </h3>
                <p className="faculty-id">ID: {faculty.banner_id}</p>

                {processType === "renewal" && faculty.days_until_expiration && (
                    <>
                        {faculty.days_until_expiration <= 30 && (
                            <span className="contract-badge urgent">
                                Expiring Soon ({faculty.days_until_expiration} days)
                            </span>
                        )}
                        <div className="expiration-info">
                            {faculty.days_until_expiration <= 90 && faculty.days_until_expiration > 30 && (
                                <span className="contract-badge">
                                    Expiring Soon ({faculty.days_until_expiration} days)
                                </span>
                            )}
                        </div>
                    </>
                )}


                {processType === "termination" && faculty.submission_date && (
                    <p className="submission-date">
                        Submitted: {new Date(faculty.submission_date).toLocaleDateString()}
                    </p>
                )}
            </div>

            <div className="status-container">
                {faculty.application_status && (
                    <ApplicationStatusBadge status={faculty.application_status} />
                )}

                {faculty.status && (
                    <ApplicationStatusBadge status={faculty.status} />
                )}

                {/* {faculty.review_status === "Needs Review" && (
                    <span className="review-badge">Needs Review</span>
                )} */}
            </div>

            <div className="button-container">
                {needsRenewal(faculty) && onInitiateRenewal && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onInitiateRenewal(faculty.faculty_id);
                        }}
                        disabled={initiatingRenewal}
                        className="initiate-btn"
                    >
                        {initiatingRenewal ? "Initiating..." : "Initiate Renewal"}
                    </button>
                )}

                <button
                    onClick={() => onViewDetails(
                        processType === "renewal" ? faculty.faculty_id : faculty.termination_id
                    )}
                    className="view-details-btn"
                >
                    Review Request
                </button>
            </div>
        </div>
    );
};

export default FacultyListItem;