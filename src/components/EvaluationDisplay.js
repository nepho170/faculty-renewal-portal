import React from "react";
import "../styles/EvaluationDisplay.css"; // Create a common CSS file

/**
 * Reusable component for displaying faculty evaluation metrics
 */
const EvaluationDisplay = ({
    teaching,
    research,
    service,
    overall
}) => {
    // Helper function to get evaluation color class
    const getEvaluationColor = (rating) => {
        switch (rating) {
            case "Excellent":
                return "evaluation-excellent";
            case "VeryGood":
                return "evaluation-verygood";
            case "Good":
                return "evaluation-good";
            case "Satisfactory":
                return "evaluation-satisfactory";
            case "Unsatisfactory":
                return "evaluation-unsatisfactory";
            default:
                return "";
        }
    };

    return (
        <div className="evaluation-section">
            <h4>Performance Evaluation</h4>
            <div className="evaluation-grid">
                <div className={`evaluation-item ${getEvaluationColor(teaching)}`}>
                    <strong>Teaching:</strong> {teaching || "Not Evaluated"}
                </div>
                <div className={`evaluation-item ${getEvaluationColor(research)}`}>
                    <strong>Research:</strong> {research || "Not Evaluated"}
                </div>
                <div className={`evaluation-item ${getEvaluationColor(service)}`}>
                    <strong>Service:</strong> {service || "Not Evaluated"}
                </div>
                <div className={`evaluation-item ${getEvaluationColor(overall)}`}>
                    <strong>Overall:</strong> {overall || "Not Evaluated"}
                </div>
            </div>
        </div>
    );
};

export default EvaluationDisplay;