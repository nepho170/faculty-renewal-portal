import React from "react";
import "../styles/TerminationStatus.css";

const TerminationStatus = ({ terminationData, onCancel }) => {
    if (!terminationData) return null;

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    const getStatusStep = (status) => {
        if (!status) return 0;
        switch (status) {
            case "Submitted":
                return 1;
            case "Dean Approved":
                return 2;
            case "Provost Approved":
                return 3;
            case "HR Approved":
                return 4;
            case "VC Approved":
            case "Completed":
                return 5;
            default:
                return 0;
        }
    };

    const isRejected = (status) => {
        return status && status.includes("Rejected");
    };

    return (
        <div className="termination-status">
            <h3>Separation Request Status</h3>

            <div className="status-info">
                <div className="info-group">
                    <div className="info-label">Submitted on:</div>
                    <div className="info-value">
                        {formatDate(terminationData.submission_date)}
                    </div>
                </div>

                <div className="info-group">
                    <div className="info-label">Separation Type:</div>
                    <div className="info-value">{terminationData.termination_type}</div>
                </div>

                <div className="info-group">
                    <div className="info-label">Last Working Date:</div>
                    <div className="info-value">
                        {formatDate(terminationData.last_working_date)}
                    </div>
                </div>
            </div>

            {isRejected(terminationData.status) ? (
                <div className="rejected-status">
                    <div className="status-label">Status:</div>
                    <div className="status-value rejected">{terminationData.status}</div>

                    {terminationData.rejection_reason && (
                        <div className="rejection-reason">
                            <div className="reason-label">Reason:</div>
                            <div className="reason-value">
                                {terminationData.rejection_reason}
                            </div>
                        </div>
                    )}

                    <button className="action-btn" onClick={onCancel}>
                        Withdraw Request
                    </button>
                </div>
            ) : (
                <>
                    <div className="status-tracker">
                        <div className="status-steps">
                            <div
                                className={`status-step ${getStatusStep(terminationData.status) >= 1 ? "completed" : ""
                                    }`}
                            >
                                <div className="step-number">1</div>
                                <div className="step-label">Faculty</div>
                            </div>

                            <div
                                className={`status-step ${getStatusStep(terminationData.status) >= 2 ? "completed" : ""
                                    }`}
                            >
                                <div className="step-number">2</div>
                                <div className="step-label">Dean</div>
                            </div>

                            <div
                                className={`status-step ${getStatusStep(terminationData.status) >= 3 ? "completed" : ""
                                    }`}
                            >
                                <div className="step-number">3</div>
                                <div className="step-label">Provost</div>
                            </div>

                            <div
                                className={`status-step ${getStatusStep(terminationData.status) >= 4 ? "completed" : ""
                                    }`}
                            >
                                <div className="step-number">4</div>
                                <div className="step-label">HR</div>
                            </div>

                            <div
                                className={`status-step ${getStatusStep(terminationData.status) >= 5 ? "completed" : ""
                                    }`}
                            >
                                <div className="step-number">5</div>
                                <div className="step-label">VC</div>
                            </div>
                        </div>

                        <div className="status-bar">
                            <div
                                className="status-progress"
                                style={{
                                    width: `${(getStatusStep(terminationData.status) / 5) * 100
                                        }%`,
                                }}
                            ></div>
                        </div>
                    </div>

                    <div className="current-status">
                        Current Status:{" "}
                        <span className="status-value">{terminationData.status}</span>
                        {terminationData.status === "Submitted" && (
                            <button className="action-btn" onClick={onCancel}>
                                Cancel Request
                            </button>
                        )}
                    </div>

                    {/* Show approval steps if they exist */}
                    {terminationData.approval_steps &&
                        terminationData.approval_steps.length > 0 && (
                            <div className="approval-history">
                                <h4>Approval History</h4>

                                <div className="approval-steps">
                                    {terminationData.approval_steps.map((step) => (
                                        <div key={step.step_id} className="approval-step">
                                            <div className="step-header">
                                                <strong>{step.role_name}</strong>
                                                <span
                                                    className={`status-badge ${step.status.toLowerCase()}`}
                                                >
                                                    {step.status}
                                                </span>
                                            </div>
                                            {step.action_date && (
                                                <div className="step-date">
                                                    {formatDate(step.action_date)}
                                                </div>
                                            )}
                                            {step.comments && (
                                                <div className="step-comments">{step.comments}</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                </>
            )}
        </div>
    );
};

export default TerminationStatus;
