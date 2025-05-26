import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { facultyService } from "../services/apiService";
import TerminationRequestForm from "../components/TerminationRequestForm";
import TerminationStatus from "../components/TerminationStatus";
import "../styles/FacultyDashboard.css";
import { jwtDecode } from "jwt-decode";

console.log("TerminationRequestForm:", TerminationRequestForm);
console.log("TerminationStatus:", TerminationStatus);

const FacultyDashboard = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isStartingRenewal, setIsStartingRenewal] = useState(false);
  const [generatingContract, setGeneratingContract] = useState(false);

  // New state for termination feature
  const [terminationRequest, setTerminationRequest] = useState(null);
  const [showTerminationForm, setShowTerminationForm] = useState(false);
  const [loadingTermination, setLoadingTermination] = useState(false);
  const [activeTab, setActiveTab] = useState("renewal");

  console.log("FacultyDashboard: currentUser =", currentUser);

  const getFacultyStatusColor = (status) => {
    switch (status) {
      case "Active":
        return "status-active";
      case "Termination Pending":
        return "status-pending";
      case "Terminated":
        return "status-terminated";
      default:
        return "";
    }
  };

  const handleStartRenewal = async () => {
    try {
      setIsStartingRenewal(true);
      setError("");

      const response = await facultyService.startRenewal();
      console.log("Renewal started:", response.data);

      // Refresh the profile to get updated status
      const updatedProfile = await facultyService.getProfile();
      setProfile(updatedProfile.data);

      // Show success message
      alert("Renewal application started successfully!");
    } catch (err) {
      console.error("Error starting renewal:", err);
      setError(
        err.response?.data?.message || "Failed to start renewal process"
      );
    } finally {
      setIsStartingRenewal(false);
    }
  };

  // New handler for starting termination process
  const handleStartTermination = () => {
    setShowTerminationForm(true);
  };

  // Handle termination form submission
  const handleTerminationSubmitted = async (data) => {
    setShowTerminationForm(false);
    setTerminationRequest(data);

    // Refresh termination data
    await fetchTerminationRequest();
  };

  // Handle termination form cancellation
  const handleTerminationFormCancel = () => {
    setShowTerminationForm(false);
  };

  // Handle cancellation of termination request
  const handleCancelTermination = async () => {
    if (!terminationRequest || !terminationRequest.termination_id) {
      return;
    }

    if (
      !window.confirm(
        "Are you sure you want to cancel this termination request?"
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      await facultyService.cancelTerminationRequest(
        terminationRequest.termination_id
      );
      setTerminationRequest(null);
      setLoading(false);
    } catch (err) {
      console.error("Error cancelling termination request:", err);
      setError("Failed to cancel termination request");
      setLoading(false);
    }
  };

  // Fetch termination request data
  // Fetch termination request data
  const fetchTerminationRequest = async () => {
    console.log("Starting fetchTerminationRequest function");
    try {
      setLoadingTermination(true);
      setError(""); // Clear any previous errors

      console.log("Making API call to get termination request");
      const response = await facultyService.getTerminationRequest();
      console.log("Termination request API call successful:", response);

      setTerminationRequest(response.data || null);
      console.log("Termination request state updated:", response.data);
    } catch (err) {
      console.error("Error in fetchTerminationRequest:", err);
      console.error("Error response:", err.response);
      console.error("Error status:", err.response?.status);
      console.error("Error data:", err.response?.data);

      if (err.response) {
        if (err.response.status === 404) {
          // This is normal when no request exists
          console.log("No termination request found (404)");
          setTerminationRequest(null);
        } else {
          // For other error statuses
          setError(
            `Error loading termination data: ${err.response.data?.message || "Unknown error"
            }`
          );
        }
      } else if (err.request) {
        // Request was made but no response received
        console.error("No response received from server");
        setError("Network error: No response from server");
      } else {
        // Something else happened
        console.error("Error setting up request:", err.message);
        setError(`Error: ${err.message}`);
      }
    } finally {
      setLoadingTermination(false);
      console.log("fetchTerminationRequest function completed");
    }
  };
  useEffect(() => {
    // Verify user is authenticated
    if (!currentUser) {
      console.log("No current user in FacultyDashboard, redirecting to login");
      navigate("/login");
      return;
    }

    // Verify user has Faculty role
    if (currentUser.role !== "Faculty") {
      console.log(
        `User has ${currentUser.role} role, not Faculty, redirecting`
      );
      navigate(`/${currentUser.role.toLowerCase()}`);
      return;
    }

    const fetchData = async () => {
      try {
        console.log("Fetching faculty profile and termination data");
        setLoading(true);
        setError("");

        // Fetch profile first
        try {
          const profileResponse = await facultyService.getProfile();
          console.log("Profile data received:", profileResponse.data);
          setProfile(profileResponse.data);
        } catch (profileErr) {
          console.error("Error fetching profile:", profileErr);
          setError("Failed to load profile data. Please try again.");
          throw profileErr; // Rethrow to be caught by the outer try-catch
        }

        // Then try to fetch termination request separately
        await fetchTerminationRequest();

        setLoading(false);
      } catch (err) {
        console.error("Error fetching faculty data:", err);
        setLoading(false);

        // Don't logout on profile fetch failure, just show the error
        if (err.response && err.response.status === 401) {
          console.log("Unauthorized - token likely expired");
          logout();
          navigate("/login");
        }
      }
    };
    fetchData();
  }, [currentUser, navigate]);

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
    switch (status) {
      case "Submitted":
        return 1;
      case "Department Chair Approved":
        return 2;
      case "Dean Approved":
        return 3;
      case "Provost Approved":
        return 4;
      case "HR Approved":
      case "Completed":
        return 5;
      default:
        return 0;
    }
  };

  const handleLogout = () => {
    console.log("Logging out");
    logout();
    navigate("/login");
  };

  const handleDownloadContract = async () => {
    try {
      setGeneratingContract(true);
      setError("");

      // Call the API to generate and download the contract
      const response = await facultyService.downloadRenewalContract(
        profile.renewal.application_id
      );

      // Create a blob from the PDF data
      const blob = new Blob([response.data], { type: "application/pdf" });

      // Create a URL for the blob
      const url = window.URL.createObjectURL(blob);

      // Create a temporary anchor element and trigger download
      const a = document.createElement("a");
      a.href = url;
      a.download = `renewal_contract_${profile.banner_id}.pdf`;
      document.body.appendChild(a);
      a.click();

      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setGeneratingContract(false);
    } catch (err) {
      console.error("Error downloading contract:", err);
      setError("Failed to download contract. Please try again.");
      setGeneratingContract(false);
    }
  };

  // Helper function to check if renewal is completed
  const isRenewalCompleted = () => {
    return profile?.renewal?.status === "Completed";
  };

  if (loading) {
    return <div className="loading">Loading profile data...</div>;
  }

  return (
    <div className="faculty-dashboard">
      {/* Logout Button */}
      <button className="logout-btn" onClick={handleLogout}>
        Logout
      </button>

      <div className="main-container">
        <div className="header">
          <h2>Faculty Portal</h2>
          <p className="subtitle">
            Manage your renewal and separation requests
          </p>
        </div>

        {error && <div className="error-message">{error}</div>}

        {profile && (
          <>
            {/* Faculty Info Cards */}
            <div className="info-cards">
              <div className="info-card">
                <div className="info-label">Name:</div>
                <div className="info-value">
                  {profile.first_name} {profile.last_name}
                </div>
              </div>

              <div className="info-card">
                <div className="info-label">Job Title:</div>
                <div className="info-value">{profile.job_title}</div>
              </div>

              <div className="info-card">
                <div className="info-label">Department:</div>
                <div className="info-value">{profile.college_department}</div>
              </div>
              <div className="info-card">
                <div className="info-label">Status:</div>
                <div
                  className={`info-value faculty-status ${getFacultyStatusColor(
                    profile.status
                  )}`}
                >
                  {profile.status}
                </div>
              </div>
            </div>
            {/* Contract Expiration */}
            <div className="contract-expiration">
              <h3>Contract Expiration Countdown</h3>
              <p className="expiration-date">
                Your contract will expire on:{" "}
                <span>{formatDate(profile.contract_expiration_date)}</span>
              </p>

              <div className="countdown">
                <div className="countdown-item">
                  <div className="countdown-value">
                    {Math.floor(profile.days_until_expiration / 30)}
                  </div>
                  <div className="countdown-label">Months</div>
                </div>

                <div className="countdown-item">
                  <div className="countdown-value">
                    {profile.days_until_expiration % 30}
                  </div>
                  <div className="countdown-label">Days</div>
                </div>
              </div>
            </div>
            {/* Tab Navigation */}
            <div className="dashboard-tabs">
              <button
                className={`tab-button ${activeTab === "renewal" ? "active" : ""
                  }`}
                onClick={() => setActiveTab("renewal")}
              >
                Renewal
              </button>
              <button
                className={`tab-button ${activeTab === "termination" ? "active" : ""
                  }`}
                onClick={() => setActiveTab("termination")}
              >
                Separation
              </button>
            </div>
            {/* Renewal Status */}
            <div
              className="tab-content"
              style={{ display: activeTab === "renewal" ? "block" : "none" }}
            >
              {profile.renewal ? (
                <div className="renewal-status">
                  <h3>Renewal Application Status</h3>
                  <p className="application-date">
                    Submitted on: {formatDate(profile.renewal.submission_date)}
                  </p>

                  <div className="status-tracker">
                    <div className="status-steps">
                      <div
                        className={`status-step ${getStatusStep(profile.renewal.status) >= 1
                          ? "completed"
                          : ""
                          }`}
                      >
                        <div className="step-number">1</div>
                        <div className="step-label">Faculty</div>
                      </div>

                      <div
                        className={`status-step ${getStatusStep(profile.renewal.status) >= 3
                          ? "completed"
                          : ""
                          }`}
                      >
                        <div className="step-number">3</div>
                        <div className="step-label">Dean</div>
                      </div>

                      <div
                        className={`status-step ${getStatusStep(profile.renewal.status) >= 4
                          ? "completed"
                          : ""
                          }`}
                      >
                        <div className="step-number">4</div>
                        <div className="step-label">Provost</div>
                      </div>

                      <div
                        className={`status-step ${getStatusStep(profile.renewal.status) >= 5
                          ? "completed"
                          : ""
                          }`}
                      >
                        <div className="step-number">5</div>
                        <div className="step-label">HR</div>
                      </div>
                    </div>

                    <div className="status-bar">
                      <div
                        className="status-progress"
                        style={{
                          width: `${(getStatusStep(profile.renewal.status) / 5) * 100
                            }%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="current-status">
                    Current Status:{" "}
                    <span className="status-value">
                      {profile.renewal.status}
                    </span>
                    {/* Download Contract Button - Only shown when renewal is completed */}
                    {isRenewalCompleted() && (
                      <button
                        className="download-contract-btn"
                        onClick={handleDownloadContract}
                        disabled={generatingContract}
                      >
                        {generatingContract ? (
                          <span>Generating...</span>
                        ) : (
                          <>
                            <span>Download Contract</span>
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="download-icon"
                            >
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                              <polyline points="7 10 12 15 17 10"></polyline>
                              <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                          </>
                        )}
                      </button>
                    )}
                  </div>


                </div>
              ) : (
                <div className="no-renewal">
                  <h3>No Active Renewal Application</h3>
                  <p>
                    You don't have an active renewal application at this time.
                  </p>
                  <button
                    className="start-renewal-btn"
                    onClick={handleStartRenewal}
                    disabled={isStartingRenewal}
                  >
                    {isStartingRenewal
                      ? "Starting Renewal..."
                      : "Start Renewal Process"}
                  </button>
                </div>
              )}
            </div>
            {/* Termination Section */}

            <div
              className="tab-content"
              style={{
                display: activeTab === "termination" ? "block" : "none",
              }}
            >
              {/* Loading state */}
              {loadingTermination ? (
                <div className="loading">Loading termination data...</div>
              ) : (
                <>
                  {/* Error state */}
                  {error && <div className="error-message">{error}</div>}

                  {/* Form state */}
                  {showTerminationForm ? (
                    <TerminationRequestForm
                      onRequestSubmitted={handleTerminationSubmitted}
                      onCancel={handleTerminationFormCancel}
                      facultyData={profile}
                    />
                  ) : (
                    <>
                      {/* Active request state */}
                      {terminationRequest ? (
                        <TerminationStatus
                          terminationData={terminationRequest}
                          onCancel={handleCancelTermination}
                        />
                      ) : (
                        /* No request state */
                        <div className="no-termination">
                          <h3>No Active Separation Request</h3>
                          <p>
                            You don't have an active separation request at this
                            time.
                          </p>
                          <button
                            className="start-termination-btn"
                            onClick={handleStartTermination}
                          >
                            Start Separation Process
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
export default FacultyDashboard;
