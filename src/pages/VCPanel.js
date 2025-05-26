import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { vcService } from "../services/apiService";
import "../styles/VCPanel.css";

// Import styles for reusable components
import "../styles/StatusBadge.css";
import "../styles/FacultyListItem.css";
import "../styles/SearchBar.css";
import "../styles/PopupOverlay.css";
import "../styles/ApplicationDetails.css";
import "../styles/DecisionPanel.css";

// Import reusable components
import LogoutButton from "../components/LogoutButton";
import SearchBar from "../components/SearchBar";
import FacultyListItem from "../components/FacultyListItem";
import PopupOverlay from "../components/PopupOverlay";
import ApplicationDetails from "../components/ApplicationDetails";
import TerminationDecisionPanel from "../components/TerminationDecisionPanel";

const VCPanel = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [terminationRequests, setTerminationRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // State for termination popup
  const [showTerminationPopup, setShowTerminationPopup] = useState(false);
  const [selectedTermination, setSelectedTermination] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Verify authentication
  useEffect(() => {
    if (!currentUser) {
      console.log("No current user in VCPanel, redirecting to login");
      navigate("/login");
    } else if (currentUser.role !== "VC") {
      console.log(`User has ${currentUser.role} role, not VC, redirecting`);
      navigate(`/${currentUser.role.toLowerCase()}`);
    }
  }, [currentUser, navigate]);

  // Fetch termination requests
  useEffect(() => {
    const fetchTerminationRequests = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await vcService.getTerminationRequests();
        const requests = response.data;

        setTerminationRequests(requests);
        setFilteredRequests(requests);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching termination requests:", err);
        setError("Failed to load termination requests. Please try again.");
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchTerminationRequests();
    }
  }, [currentUser]);

  // Handle search
  const handleSearch = (term) => {
    setSearchTerm(term);

    if (term.trim() === "") {
      setFilteredRequests(terminationRequests);
    } else {
      const filtered = terminationRequests.filter(
        (request) =>
          request.first_name.toLowerCase().includes(term.toLowerCase()) ||
          request.last_name.toLowerCase().includes(term.toLowerCase()) ||
          request.banner_id.toLowerCase().includes(term.toLowerCase())
      );
      setFilteredRequests(filtered);
    }
  };

  // Open termination details popup
  const openTerminationPopup = async (terminationId) => {
    try {
      setLoading(true);
      const response = await vcService.getTerminationDetails(terminationId);
      setSelectedTermination(response.data);
      setShowTerminationPopup(true);
      setLoading(false);
    } catch (err) {
      setError("Failed to load termination details. Please try again.");
      setLoading(false);
      console.error("Error fetching termination details:", err);
    }
  };

  // Close termination popup
  const closeTerminationPopup = () => {
    setShowTerminationPopup(false);
    setSelectedTermination(null);
  };

  // Handle termination decision
  const handleTerminationDecision = async (decision) => {
    try {
      setSubmitting(true);
      setError("");

      // Submit the decision
      await vcService.submitTerminationDecision(
        selectedTermination.termination_id,
        decision
      );

      // If approved, explicitly process the termination to ensure status updates properly
      if (decision.status === "approve") {
        try {
          await vcService.processTermination(selectedTermination.termination_id);
          console.log("Termination processed successfully");
        } catch (processErr) {
          console.error("Termination already processed or other error:", processErr);
          // Continue with flow, don't show error to user as the decision was submitted successfully
        }
      }

      // Refresh termination requests
      const response = await vcService.getTerminationRequests();
      setTerminationRequests(response.data);
      setFilteredRequests(response.data);

      setSubmitting(false);
      closeTerminationPopup();

      // Show success message
      alert("Decision submitted successfully!");
      return true;
    } catch (err) {
      setSubmitting(false);
      setError("Failed to submit decision. Please try again.");
      console.error("Error submitting decision:", err);
      return false;
    }
  };

  // Loading indicator
  if (loading && terminationRequests.length === 0) {
    return <div className="loading">Loading termination requests...</div>;
  }

  return (
    <div className="vc-panel">
      {/* Logout Button */}
      <LogoutButton />

      {/* Main Container */}
      <div className="main-container">
        {/* Title & Search Bar */}
        <div className="header">
          <h2>Vice Chancellor Panel</h2>


          {/* Reusable SearchBar component */}
          <SearchBar
            searchTerm={searchTerm}
            setSearchTerm={handleSearch}
            placeholder="🔍 Search by Name or ID..."
          />
        </div>

        {/* Error message */}
        {error && <div className="error-message">{error}</div>}

        {/* Termination Requests */}
        <div className="termination-list-container">
          {filteredRequests.length === 0 ? (
            <div className="no-requests">
              <p>No faculty separation requests pending approval</p>
            </div>
          ) : (
            <div className="termination-list">
              {filteredRequests.map((request) => (
                <FacultyListItem
                  key={request.termination_id}
                  faculty={request}
                  onViewDetails={openTerminationPopup}
                  processType="termination"
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reusable PopupOverlay for Termination Details */}
      <PopupOverlay show={showTerminationPopup} onClose={closeTerminationPopup}>
        {selectedTermination && (
          <>
            <ApplicationDetails
              facultyData={selectedTermination}
              processType="termination"
            />
            <TerminationDecisionPanel
              facultyData={selectedTermination}
              onSubmitDecision={handleTerminationDecision}
              roleType="VC"
              previousDecisions={selectedTermination.approval_steps || []}
            />
          </>
        )}
      </PopupOverlay>
    </div>
  );
};

export default VCPanel;