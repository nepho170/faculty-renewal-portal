import React, { useState } from "react";
import "../styles/DecisionPanel.css"; // Use the common CSS file we created

/**
 * A reusable component for making termination decisions by different roles
 * This component focuses only on the decision making part
 */
const TerminationDecisionPanel = ({
    facultyData,
    onSubmitDecision,
    roleType,
    previousDecisions = []
}) => {
    const [decision, setDecision] = useState("");
    const [comment, setComment] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

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

    // Function to determine if this role has already made a decision
    const hasRoleMadeDecision = () => {
        return previousDecisions.some(
            (step) =>
                step.role_name === roleType &&
                (step.status === "Approved" || step.status === "Rejected")
        );
    };

    // Get previous decision if exists
    const getRoleDecision = () => {
        return previousDecisions.find(
            (step) =>
                step.role_name === roleType &&
                (step.status === "Approved" || step.status === "Rejected")
        );
    };

    // Handle decision selection
    const handleDecisionChange = (e) => {
        setDecision(e.target.value);
    };

    // Handle comment change
    const handleCommentChange = (e) => {
        setComment(e.target.value);
    };

    // Submit decision handler
    const handleSubmit = async () => {
        if (!decision) {
            setError("Please select Approve or Not Approve");
            return;
        }

        try {
            setSubmitting(true);
            setError("");

            await onSubmitDecision({
                status: decision,
                comments: comment || ""
            });

            setSubmitting(false);
        } catch (err) {
            setSubmitting(false);
            setError("Failed to submit decision. Please try again.");
            console.error("Error submitting decision:", err);
        }
    };

    // Render previous approvers' decisions
    // const renderPreviousApprovals = () => {
    //     // Filter decisions that are not from the current role
    //     const otherDecisions = previousDecisions.filter(
    //         (step) => step.role_name !== roleType
    //     );

    //     if (otherDecisions.length === 0) return null;

    //     return (
    //         <div className="previous-decisions">
    //             <h4>Previous Decisions</h4>
    //             {otherDecisions.map((decision, index) => (
    //                 <div key={index} className="decision-item">
    //                     <div className="decision-header">
    //                         <span className="decision-role">{decision.role_name}</span>
    //                         <span className={`decision-status ${decision.status.toLowerCase()}`}>
    //                             {decision.status}
    //                         </span>
    //                     </div>
    //                     {decision.action_date && (
    //                         <div className="decision-date">
    //                             {formatDate(decision.action_date)}
    //                         </div>
    //                     )}
    //                     {decision.comments && (
    //                         <div className="decision-comment">{decision.comments}</div>
    //                     )}
    //                 </div>
    //             ))}
    //         </div>
    //     );
    // };

    // Render read-only view of previous decision
    const renderPreviousDecision = () => {
        const roleDecision = getRoleDecision();

        if (!roleDecision) {
            return (
                <div className="no-decision-message">
                    No decision data found. Please refresh the page or
                    contact support if this issue persists.
                </div>
            );
        }

        return (
            <div className="previous-decision">
                <div className="decision-status">
                    <strong>Status:</strong>
                    <span
                        className={`decision-badge ${roleDecision.status === "Approved" ? "approved" : "rejected"
                            }`}
                    >
                        {roleDecision.status}
                    </span>
                </div>

                {roleDecision.comments && (
                    <div className="decision-comments">
                        <strong>Your Comments:</strong>
                        <p>{roleDecision.comments}</p>
                    </div>
                )}

                <div className="decision-date">
                    <strong>Decision Date:</strong>{" "}
                    {formatDate(roleDecision.action_date)}
                </div>

                <div className="readonly-message">
                    <i>Note: This decision has been submitted and cannot be changed.</i>
                </div>
            </div>
        );
    };

    return (
        <div className="decision-panel termination-decision-panel">
            <h3>Separation Decision - {roleType} Review</h3>

            {error && <div className="error-message">{error}</div>}

            {/* {renderPreviousApprovals()} */}

            {/* Decision Section */}
            {!hasRoleMadeDecision() ? (
                <div className="decision-section">
                    <h4>Make Your Decision</h4>

                    <div className="radio-group">
                        <label>
                            <input
                                type="radio"
                                name="approval"
                                value="approve"
                                checked={decision === "approve"}
                                onChange={handleDecisionChange}
                            />{" "}
                            Approve
                        </label>
                        <label>
                            <input
                                type="radio"
                                name="approval"
                                value="reject"
                                checked={decision === "reject"}
                                onChange={handleDecisionChange}
                            />{" "}
                            Not Approve
                        </label>
                    </div>

                    <div className="comment-section">
                        <label>Comments:</label>
                        <textarea
                            rows="3"
                            placeholder="Enter your comments..."
                            value={comment}
                            onChange={handleCommentChange}
                        ></textarea>
                    </div>

                    <button
                        className="submit-btn"
                        onClick={handleSubmit}
                        disabled={submitting}
                    >
                        {submitting ? "Submitting..." : "Submit Decision"}
                    </button>
                </div>
            ) : (
                <div className="decision-section readonly">
                    <h4>Your Decision</h4>
                    {renderPreviousDecision()}
                </div>
            )}
        </div>
    );
};

export default TerminationDecisionPanel;