import React, { useState } from "react";
import "../styles/DecisionPanel.css"; // Use the common CSS file
import { useAuth } from "../contexts/AuthContext";

/**
 * A reusable component for making renewal decisions by different roles
 * This focuses only on the decision making part, not displaying faculty details
 */
const RenewalDecisionPanel = ({
    facultyData,
    onSubmitDecision,
    roleType,
    previousDecisions = [],
    recommendedYears = 0
}) => {
    const { currentUser } = useAuth();
    const [decision, setDecision] = useState("");
    const [renewalYears, setRenewalYears] = useState(recommendedYears);
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

    // Handle renewal years change
    const handleRenewalYearsChange = (e) => {
        setRenewalYears(parseInt(e.target.value));
    };

    // Handle comment change
    const handleCommentChange = (e) => {
        setComment(e.target.value);
    };

    // Submit decision handler
    const submitDecision = async () => {
        if (!decision) {
            setError("Please select Approve or Not Approve");
            return;
        }

        if (decision === "approve" && renewalYears === 0 && roleType !== "HR") {
            setError("Please select renewal years");
            return;
        }

        try {
            setSubmitting(true);

            await onSubmitDecision({
                status: decision,
                yearsGranted: renewalYears,
                comments: comment || ""
            });

            setSubmitting(false);
        } catch (err) {
            setSubmitting(false);
            setError("Failed to submit decision. Please try again.");
            console.error("Error submitting decision:", err);
        }
    };


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

                {roleDecision.years_granted > 0 && (
                    <div className="decision-years">
                        <strong>Years Granted:</strong>{" "}
                        {roleDecision.years_granted}
                    </div>
                )}

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
                    <i>
                        Note: This decision has been submitted and cannot be
                        changed.
                    </i>
                </div>
            </div>
        );
    };

    return (
        <div className="decision-panel renewal-decision-panel">
            <h3>Renewal Decision - {roleType} Review</h3>

            {error && <div className="error-message">{error}</div>}



            {/* Decision Section */}
            {!hasRoleMadeDecision() ? (
                <div className="decision-section">
                    <h4>Make Decision</h4>

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

                    {decision === "approve" && (currentUser.role === "Provost" || currentUser.role === "Dean") && (
                        <div className="renewal-container">
                            <label htmlFor="renewYears">Years Until Renewal:</label>
                            <select
                                id="renewYears"
                                value={renewalYears}
                                onChange={handleRenewalYearsChange}
                                className="renewal-dropdown"
                            >
                                <option value="0">Select Years</option>
                                <option value="1">1 Year</option>
                                <option value="2">2 Years</option>
                                <option value="3">3 Years</option>
                                <option value="4">4 Years</option>
                                <option value="5">5 Years</option>
                            </select>
                        </div>
                    )}

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
                        onClick={submitDecision}
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

export default RenewalDecisionPanel;