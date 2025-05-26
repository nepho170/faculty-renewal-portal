import React, { useState } from "react";
import { facultyService } from "../services/apiService";
import "../styles/TerminationRequestForm.css";

const TerminationRequestForm = ({
    onRequestSubmitted,
    onCancel,
    facultyData,
}) => {
    const [formData, setFormData] = useState({
        terminationType: "",
        reason: "",
        lastWorkingDate: "",
        noticeDate: new Date().toISOString().split("T")[0],
        noticePeriodAccepted: true,
        monthsInLieu: 0,
    });

    const [selectedFile, setSelectedFile] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    // Calculate the minimum valid last working date (6 months from notice date)
    const calculateMinLastWorkingDate = (noticeDate) => {
        const date = new Date(noticeDate);
        date.setMonth(date.getMonth() + noticePeriod);
        return date.toISOString().split('T')[0];
    };

    // Validate if the last working date is valid (at least 6 months after notice date)
    const isLastWorkingDateValid = () => {
        if (!formData.noticeDate || !formData.lastWorkingDate) return true;

        const minDate = calculateMinLastWorkingDate(formData.noticeDate);
        return formData.lastWorkingDate >= minDate || !formData.noticePeriodAccepted;
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        if (name === "noticeDate") {
            // When notice date changes, we need to update the minimum last working date
            const newFormData = {
                ...formData,
                noticeDate: value
            };

            // If there's already a last working date, check if it's still valid
            if (formData.lastWorkingDate) {
                const minDate = calculateMinLastWorkingDate(value);
                if (formData.lastWorkingDate < minDate && formData.noticePeriodAccepted) {
                    // Update the last working date to the new minimum date
                    newFormData.lastWorkingDate = minDate;
                }
            }

            setFormData(newFormData);
        } else {
            setFormData({
                ...formData,
                [name]: type === "checkbox" ? checked : value,
            });
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files.length > 0) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.terminationType) {
            setError("Please select a termination type");
            return;
        }

        if (!formData.lastWorkingDate) {
            setError("Please specify the last working date");
            return;
        }

        // Validate the notice period
        if (formData.noticePeriodAccepted && !isLastWorkingDateValid()) {
            setError(`The last working date must be at least ${noticePeriod} months after the notice date`);
            return;
        }

        // Validate months in lieu if notice period is not accepted
        if (!formData.noticePeriodAccepted && (formData.monthsInLieu < 0 || formData.monthsInLieu > noticePeriod)) {
            setError(`Months in lieu must be between 0 and ${noticePeriod}`);
            return;
        }

        try {
            setSubmitting(true);
            setError("");

            // Submit the termination request
            const response = await facultyService.submitTerminationRequest(formData);

            // Upload document if one was selected
            if (selectedFile && response.data.terminationId) {
                await facultyService.uploadTerminationDocument(
                    response.data.terminationId,
                    selectedFile
                );
            }

            setSubmitting(false);

            // Notify parent component that the request was submitted
            if (onRequestSubmitted) {
                onRequestSubmitted(response.data);
            }
        } catch (err) {
            console.error("Error submitting termination request:", err);
            setError(
                err.response?.data?.message || "Failed to submit termination request"
            );
            setSubmitting(false);
        }
    };

    // Calculate notice period based on faculty data
    const calculateNoticePeriod = () => {
        // This is a placeholder - actual logic would depend on your requirements
        return 6; // 6 months
    };

    const noticePeriod = calculateNoticePeriod();

    return (
        <div className="termination-request-form">
            <h3>Separation Request Form</h3>

            {error && (
                <div className="error-message">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <span>{error}</span>
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="form-section">
                    <div className="form-group">
                        <label htmlFor="terminationType">Separation Type:</label>
                        <select
                            id="terminationType"
                            name="terminationType"
                            value={formData.terminationType}
                            onChange={handleChange}
                            required
                        >
                            <option value="">Select Type</option>
                            <option value="Resignation">Resignation</option>
                            <option value="Non-Renewal">Non-Renewal</option>
                            <option value="Termination">Termination</option>
                            <option value="Retirement">Retirement</option>
                            <option value="Deceased">Deceased</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="reason">Reason:</label>
                        <textarea
                            id="reason"
                            name="reason"
                            rows="3"
                            value={formData.reason}
                            onChange={handleChange}
                            placeholder="Please provide a detailed reason for this request"
                            required
                        ></textarea>
                    </div>
                </div>

                <div className="form-section">
                    <h4>Notice Information</h4>
                    <div className="date-group">
                        <div className="form-group">
                            <label htmlFor="noticeDate">Notice Date:</label>
                            <input
                                type="date"
                                id="noticeDate"
                                name="noticeDate"
                                value={formData.noticeDate}
                                onChange={handleChange}
                                required
                            />
                            <p className="form-note">Date when notice is being given</p>
                        </div>

                        <div className="form-group">
                            <label htmlFor="lastWorkingDate">Last Working Date:</label>
                            <input
                                type="date"
                                id="lastWorkingDate"
                                name="lastWorkingDate"
                                value={formData.lastWorkingDate}
                                onChange={handleChange}
                                min={formData.noticePeriodAccepted ? calculateMinLastWorkingDate(formData.noticeDate) : ""}
                                className={formData.noticePeriodAccepted && !isLastWorkingDateValid() ? "input-error" : ""}
                                required
                            />
                            <p className="form-note">
                                Required {noticePeriod} months notice period from notice date
                                {formData.noticeDate && formData.noticePeriodAccepted && (
                                    <span className="date-hint"> (minimum: {new Date(calculateMinLastWorkingDate(formData.noticeDate)).toLocaleDateString()})</span>
                                )}
                            </p>
                            {formData.noticePeriodAccepted && !isLastWorkingDateValid() && (
                                <p className="field-error">Last working date must be at least 6 months after notice date</p>
                            )}
                        </div>
                    </div>

                    <div className="form-group checkbox-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                name="noticePeriodAccepted"
                                checked={formData.noticePeriodAccepted}
                                onChange={handleChange}
                            />
                            <span className="checkbox-text">Notice Period Accepted</span>
                        </label>
                    </div>

                    {!formData.noticePeriodAccepted && (
                        <div className="form-group lieu-notice">
                            <label htmlFor="monthsInLieu">Months in Lieu of Notice:</label>
                            <div className="lieu-notice-content">
                                <input
                                    type="number"
                                    id="monthsInLieu"
                                    name="monthsInLieu"
                                    min="0"
                                    max={noticePeriod}
                                    value={formData.monthsInLieu}
                                    onChange={handleChange}
                                />
                                <div className="lieu-info">

                                </div>
                            </div>
                            <p className="form-note">
                                Value must be between 0 and {noticePeriod} months
                            </p>
                        </div>
                    )}
                </div>

                <div className="form-section">
                    <h4>Supporting Documentation</h4>
                    <div className="form-group file-upload">
                        <label htmlFor="document" className="file-label">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="12" y1="18" x2="12" y2="12"></line>
                                <line x1="9" y1="15" x2="15" y2="15"></line>
                            </svg>
                            <span>{selectedFile ? selectedFile.name : 'Choose a file'}</span>
                        </label>
                        <input
                            type="file"
                            id="document"
                            onChange={handleFileChange}
                            accept=".pdf,.doc,.docx"
                            className="file-input"
                        />
                        <p className="form-note">
                            Upload resignation letter, supporting documentation, etc.
                        </p>
                    </div>
                </div>

                <div className="form-actions">
                    <button
                        type="button"
                        className="cancel-btn"
                        onClick={onCancel}
                        disabled={submitting}
                    >
                        Cancel
                    </button>
                    <button type="submit" className="submit-btn" disabled={submitting}>
                        {submitting ? (
                            <>
                                <svg className="spinner" viewBox="0 0 50 50">
                                    <circle className="path" cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle>
                                </svg>
                                <span>Submitting...</span>
                            </>
                        ) : (
                            "Submit Request"
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default TerminationRequestForm;