import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { deanService } from "../services/apiService";
import "../styles/DeanPanel.css";

// Import reusable components
import LogoutButton from "../components/LogoutButton";
import TabPanel from "../components/TabPanel";
import SearchBar from "../components/SearchBar";
import FacultyListItem from "../components/FacultyListItem";
import PopupOverlay from "../components/PopupOverlay";
import ApplicationDetails from "../components/ApplicationDetails";
import RenewalDecisionPanel from "../components/RenewalDecisionPanel";
import TerminationDecisionPanel from "../components/TerminationDecisionPanel";

const DeanPanel = () => {
  const { currentUser, logout } = useAuth();
  const [facultyList, setFacultyList] = useState([]);
  const [filteredList, setFilteredList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [initiatingRenewal, setInitiatingRenewal] = useState(false);

  // State for faculty popup details
  const [showPopup, setShowPopup] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // State for expiring contracts notification
  const [expiringContracts, setExpiringContracts] = useState([]);
  const [showNotification, setShowNotification] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState("renewals");
  const tabs = [
    { id: "renewals", label: "Renewals" },
    { id: "terminations", label: "Separation Requests" }
  ];

  // Termination related variables
  const [terminationRequests, setTerminationRequests] = useState([]);
  const [showTerminationPopup, setShowTerminationPopup] = useState(false);
  const [selectedTermination, setSelectedTermination] = useState(null);

  // Fetch faculty list when component mounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch faculty list
        const response = await deanService.getFacultyList();
        const faculty = response.data;

        // Sort by days until expiration (ascending)
        faculty.sort(
          (a, b) => a.days_until_expiration - b.days_until_expiration
        );

        setFacultyList(faculty);
        setFilteredList(faculty);

        // Check for expiring contracts (less than 90 days)
        const expiring = faculty.filter((f) => f.days_until_expiration <= 90);
        setExpiringContracts(expiring);
        setShowNotification(expiring.length > 0);

        // Fetch termination requests
        await fetchTerminationRequests();

        setLoading(false);
      } catch (err) {
        setError("Failed to load faculty list. Please try again.");
        setLoading(false);
        console.error("Error fetching faculty list:", err);
      }
    };

    fetchData();
  }, []);

  const fetchTerminationRequests = async () => {
    try {
      const response = await deanService.getTerminationRequests();
      setTerminationRequests(response.data || []);
    } catch (err) {
      console.error("Error fetching termination requests:", err);
      // Don't set global error here, as this is a secondary feature
    }
  };

  // Handle search input changes
  const handleSearch = (term) => {
    setSearchTerm(term);

    if (term.trim() === "") {
      setFilteredList(facultyList);
    } else {
      const filtered = facultyList.filter(
        (faculty) =>
          faculty.first_name.toLowerCase().includes(term.toLowerCase()) ||
          faculty.last_name.toLowerCase().includes(term.toLowerCase()) ||
          faculty.banner_id.toLowerCase().includes(term.toLowerCase())
      );
      setFilteredList(filtered);
    }
  };

  // Function to handle renewal initiation
  const handleInitiateRenewal = async (facultyId) => {
    try {
      setInitiatingRenewal(true);
      setError("");

      await deanService.initiateRenewal(facultyId);

      // Refresh faculty list
      const response = await deanService.getFacultyList();
      const faculty = response.data;
      faculty.sort((a, b) => a.days_until_expiration - b.days_until_expiration);
      setFacultyList(faculty);
      setFilteredList(faculty);

      alert("Renewal process initiated successfully!");
    } catch (err) {
      console.error("Error initiating renewal:", err);
      setError(
        err.response?.data?.message || "Failed to initiate renewal process"
      );
    } finally {
      setInitiatingRenewal(false);
    }
  };

  // Helper function to check if faculty needs renewal
  const needsRenewal = (faculty) => {
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

  // Popup related functions
  const openPopup = async (facultyId) => {
    try {
      setLoading(true);
      const response = await deanService.getFacultyDetails(facultyId);
      setSelectedFaculty(response.data);
      setShowPopup(true);
      setLoading(false);
    } catch (err) {
      setError("Failed to load faculty details. Please try again.");
      setLoading(false);
      console.error("Error fetching faculty details:", err);
    }
  };

  const closePopup = () => {
    setShowPopup(false);
    setSelectedFaculty(null);
  };

  // Handler for processing document
  const handleProcessDocument = async (applicationId) => {
    try {
      setLoading(true);
      setError("");

      const response = await deanService.processEvaluationDocument(
        applicationId
      );

      // Refresh faculty details to get the updated summary
      const updatedFaculty = await deanService.getFacultyDetails(
        selectedFaculty.faculty_id
      );
      setSelectedFaculty(updatedFaculty.data);

      setLoading(false);
    } catch (err) {
      setError("Failed to process document. Please try again.");
      setLoading(false);
      console.error("Error processing document:", err);
    }
  };

  // Submit renewal decision
  const handleRenewalDecision = async (decisionData) => {
    try {
      setSubmitting(true);

      await deanService.submitDecision(selectedFaculty.faculty_id, {
        applicationId: selectedFaculty.application_id,
        status: decisionData.status,
        yearsGranted: decisionData.yearsGranted,
        comments: decisionData.comments || "",
      });

      // Update faculty list after submission
      const response = await deanService.getFacultyList();
      const updatedFaculty = response.data;
      setFacultyList(updatedFaculty);
      setFilteredList(updatedFaculty);

      closePopup();

      // Show success message
      alert("Decision submitted successfully!");

      return true;
    } catch (err) {
      setError("Failed to submit decision. Please try again.");
      console.error("Error submitting decision:", err);
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  // Functions for termination process
  const openTerminationPopup = async (terminationId) => {
    try {
      setLoading(true);
      const response = await deanService.getTerminationDetails(terminationId);
      setSelectedTermination(response.data);
      setShowTerminationPopup(true);
      setLoading(false);
    } catch (err) {
      setError("Failed to load termination details. Please try again.");
      setLoading(false);
      console.error("Error fetching termination details:", err);
    }
  };

  const closeTerminationPopup = () => {
    setShowTerminationPopup(false);
    setSelectedTermination(null);
  };

  const handleTerminationDecision = async (decision) => {
    try {
      await deanService.submitTerminationDecision(
        selectedTermination.termination_id,
        decision
      );

      // Refresh termination list
      await fetchTerminationRequests();

      closeTerminationPopup();

      // Show success message
      alert("Decision submitted successfully!");
      return true;
    } catch (err) {
      setError("Failed to submit decision. Please try again.");
      console.error("Error submitting termination decision:", err);
      return false;
    }
  };

  // Render loading state
  if (loading && facultyList.length === 0) {
    return <div className="loading">Loading faculty data...</div>;
  }

  return (
    <div className="dean-panel">
      <LogoutButton />



      {/* Main Container */}
      <div className="main-container">
        {/* Title & Tabs */}
        <div className="header">
          <h2>Dean Panel</h2>

          {/* Reusable TabPanel component */}
          <TabPanel
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            tabs={tabs}
          />

          {/* Reusable SearchBar component */}
          <SearchBar
            searchTerm={searchTerm}
            setSearchTerm={handleSearch}
            placeholder="🔍 Search by Name or ID..."
          />
        </div>

        {/* Error message */}
        {error && <div className="error-message">{error}</div>}

        {/* Renewals Tab Content */}
        <div
          className="tab-content"
          style={{ display: activeTab === "renewals" ? "block" : "none" }}
        >
          {/* Notification Box for Expiring Contracts */}
          {showNotification && (
            <div className="notification-box" id="notificationBox">
              <h3>🚨 Contracts Expiring Soon</h3>
              <ul id="expiringList">
                {expiringContracts.map((faculty) => (
                  <li key={faculty.faculty_id}>
                    {faculty.first_name} {faculty.last_name} -{" "}
                    {faculty.days_until_expiration} days
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="faculty-list-container">
            <div className="faculty-list" id="facultyList">
              {filteredList.length === 0 ? (
                <p className="no-faculty">No faculty members found</p>
              ) : (
                filteredList.map((faculty) => (
                  <FacultyListItem
                    key={faculty.faculty_id}
                    faculty={faculty}
                    onViewDetails={openPopup}
                    onInitiateRenewal={
                      needsRenewal(faculty) ? handleInitiateRenewal : null
                    }
                    initiatingRenewal={initiatingRenewal}
                    processType="renewal"
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Terminations Tab Content */}
        <div
          className="tab-content"
          style={{ display: activeTab === "terminations" ? "block" : "none" }}
        >
          <div className="termination-list-container">
            {terminationRequests.length === 0 ? (
              <p className="no-terminations">
                No separation requests pending approval
              </p>
            ) : (
              terminationRequests.map((request) => (
                <FacultyListItem
                  key={request.termination_id}
                  faculty={request}
                  onViewDetails={openTerminationPopup}
                  processType="termination"
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Reusable PopupOverlay for Renewal Details */}
      <PopupOverlay show={showPopup} onClose={closePopup}>
        {selectedFaculty && (
          <>
            {/* Reusable ApplicationDetails component */}
            <ApplicationDetails
              facultyData={selectedFaculty}
              processType="renewal"
            />

            {/* Document Summary Controls */}
            {selectedFaculty.application_id && !selectedFaculty.ai_summary && (
              <div className="no-summary">
                <p>No AI summary available for this application.</p>
                <button
                  className="process-doc-btn"
                  onClick={() =>
                    handleProcessDocument(selectedFaculty.application_id)
                  }
                >
                  Generate AI Summary
                </button>
              </div>
            )}

            {/* Reusable RenewalDecisionPanel component */}
            {selectedFaculty.application_id && (
              <RenewalDecisionPanel
                facultyData={selectedFaculty}
                onSubmitDecision={handleRenewalDecision}
                roleType="Dean"
                previousDecisions={selectedFaculty.approval_steps || []}
                recommendedYears={selectedFaculty.renewal_years || 0}
              />
            )}
          </>
        )}
      </PopupOverlay>

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
              roleType="Dean"
              previousDecisions={selectedTermination.approval_steps || []}
            />
          </>
        )}
      </PopupOverlay>
    </div>
  );
};

export default DeanPanel;