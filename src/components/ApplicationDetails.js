import React, { useState } from "react";
import ApplicationStatusBadge from "./ApplicationStatusBadge";
import EvaluationDisplay from "./EvaluationDisplay";
import "../styles/ApplicationDetails.css";

/**
 * Reusable component for displaying application details
 * Common between renewal and termination processes
 */
const ApplicationDetails = ({
    facultyData,
    processType = "renewal" // 'renewal' or 'termination'
}) => {
    const [showHistory, setShowHistory] = useState(false);

    // Format date helper function
    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    // Render faculty basic information
    const renderFacultyInfo = () => (
        <div className="faculty-info-container">
            <div className="info-box">
                <label>Name:</label>
                <span>
                    {facultyData.first_name} {facultyData.last_name}
                </span>
            </div>

            <div className="info-box">
                <label>Banner ID:</label>
                <span>{facultyData.banner_id}</span>
            </div>

            <div className="info-box">
                <label>Job Title:</label>
                <span>{facultyData.job_title}</span>
            </div>

            <div className="info-box">
                <label>Department:</label>
                <span>{facultyData.college_department}</span>
            </div>

            {processType === "renewal" && facultyData.contract_expiration_date && (
                <div className="info-box">
                    <label>Contract Expires:</label>
                    <span>
                        {formatDate(facultyData.contract_expiration_date)}
                        {facultyData.days_until_expiration &&
                            ` (${facultyData.days_until_expiration} days remaining)`
                        }
                    </span>
                </div>
            )}

            {processType === "termination" && (
                <>
                    <div className="info-box">
                        <label>Separation Type:</label>
                        <span>{facultyData.termination_type}</span>
                    </div>

                    <div className="info-box">
                        <label>Submission Date:</label>
                        <span>{formatDate(facultyData.submission_date)}</span>
                    </div>

                    <div className="info-box">
                        <label>Last Working Date:</label>
                        <span>{formatDate(facultyData.last_working_date)}</span>
                    </div>

                    <div className="info-box">
                        <label>Notice Date:</label>
                        <span>{formatDate(facultyData.notice_date)}</span>
                    </div>
                </>
            )}
        </div>
    );

    // Render separation reason if exists
    const renderSeparationReason = () => {
        if (processType !== "termination" || !facultyData.reason) return null;

        return (
            <div className="termination-reason">
                <h4>Reason for Separation</h4>
                <p>{facultyData.reason}</p>
            </div>
        );
    };

    // Render current application details
    const renderApplicationDetails = () => {
        const applicationId =
            processType === "renewal"
                ? facultyData.application_id
                : facultyData.termination_id;

        if (!applicationId) return null;

        return (
            <>
                <h4>Current Application</h4>
                <div className="application-info">
                    <p>
                        Submitted:{" "}
                        {formatDate(facultyData.submission_date)}
                    </p>

                    {facultyData.application_status && (
                        <p>
                            Status:{" "}
                            <ApplicationStatusBadge status={facultyData.application_status} />
                        </p>
                    )}

                    {/* Document Summary Section */}
                    {facultyData.ai_summary ? (
                        <div className="ai-summary-section">
                            <h4>Document Summary</h4>
                            <div className="ai-summary">
                                <p>{facultyData.ai_summary}</p>
                            </div>
                        </div>
                    ) : (<div className="no-summary">

                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <p>No document summary available yet.</p>
                    </div>)}


                    {/* Approval Steps */}
                    {facultyData.approval_steps && facultyData.approval_steps.length > 0 && (
                        <div className="approval-steps">
                            <h4>Approval Steps</h4>
                            {facultyData.approval_steps.map((step, index) => (
                                <div key={step.step_id || index} className="approval-step">
                                    <div className="step-header">
                                        <strong>{step.role_name}</strong>
                                        <ApplicationStatusBadge status={step.status} />
                                    </div>
                                    {step.action_date && (
                                        <div className="step-date">
                                            {formatDate(step.action_date)}
                                        </div>
                                    )}
                                    {step.years_granted > 0 && (
                                        <div className="years-granted">
                                            Recommended Years: {step.years_granted}
                                        </div>
                                    )}
                                    {step.comments && (
                                        <div className="step-comments">{step.comments}</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </>
        );
    };

    // Render application history section if available
    const renderApplicationHistory = () => {
        if (!facultyData.application_history ||
            facultyData.application_history.length === 0) {
            return null;
        }

        return (
            <>
                <div
                    className="history-header"
                    onClick={() => setShowHistory(!showHistory)}
                >
                    <h4>Previous Applications</h4>
                    <span className={`toggle-arrow ${showHistory ? "rotate-180" : ""}`}>
                        ▼
                    </span>
                </div>

                {showHistory && (
                    <div className="application-history">
                        {facultyData.application_history.map((app, index) => (
                            <div key={app.application_id || index} className="history-item">
                                <p>
                                    Submitted: {formatDate(app.submission_date)}
                                </p>
                                <p>
                                    Final Status: <ApplicationStatusBadge status={app.status} />
                                </p>
                                {app.renewal_years && (
                                    <p>Years Granted: {app.renewal_years}</p>
                                )}

                                {/* Approval History */}
                                {app.approval_history && app.approval_history.length > 0 && (
                                    <div className="history-approvals">
                                        {app.approval_history.map((approval, i) => (
                                            <div key={i} className="history-approval-step">
                                                <strong>{approval.role}:</strong>
                                                <span>{approval.status}</span>
                                                {approval.years_granted && (
                                                    <span>({approval.years_granted} years)</span>
                                                )}
                                                {approval.comments && (
                                                    <p className="history-comments">{approval.comments}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </>
        );
    };

    return (
        <div className="application-details">
            <h3>Faculty Details</h3>

            {renderFacultyInfo()}
            {renderSeparationReason()}

            {/* Faculty Evaluation Section - Only for renewal */}
            {processType === "renewal" && facultyData.application_id && (
                <EvaluationDisplay
                    teaching={facultyData.teaching}
                    research={facultyData.research}
                    service={facultyData.service}
                    overall={facultyData.overall}
                />
            )}

            {renderApplicationDetails()}
            {renderApplicationHistory()}
        </div>
    );
};

export default ApplicationDetails;