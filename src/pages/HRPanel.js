import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { hrService } from "../services/apiService";
import "../styles/HRPanel.css";

// Import styles for reusable components
import "../styles/StatusBadge.css";
import "../styles/FacultyListItem.css";
import "../styles/TabPanel.css";
import "../styles/SearchBar.css";
import "../styles/PopupOverlay.css";
import "../styles/ApplicationDetails.css";
import "../styles/EvaluationDisplay.css";
import "../styles/DecisionPanel.css";

// Import reusable components
import LogoutButton from "../components/LogoutButton";
import TabPanel from "../components/TabPanel";
import SearchBar from "../components/SearchBar";
import FacultyListItem from "../components/FacultyListItem";
import PopupOverlay from "../components/PopupOverlay";
import ApplicationDetails from "../components/ApplicationDetails";
import RenewalDecisionPanel from "../components/RenewalDecisionPanel";
import TerminationDecisionPanel from "../components/TerminationDecisionPanel";

const HRPanel = () => {
  const { currentUser, logout } = useAuth();
  const [facultyList, setFacultyList] = useState([]);
  const [filteredList, setFilteredList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // State for faculty popup details
  const [showPopup, setShowPopup] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // HR clearance state
  const [securityCleared, setSecurityCleared] = useState(false);
  const [documentsReceived, setDocumentsReceived] = useState(false);
  const [readyForArchiving, setReadyForArchiving] = useState(false);

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
        const response = await hrService.getFacultyList();
        const faculty = response.data;

        setFacultyList(faculty);
        setFilteredList(faculty);

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

  const handleProcessDocument = async (applicationId) => {
    try {
      setLoading(true);
      setError("");

      const response = await hrService.processEvaluationDocument(
        applicationId
      );

      // Refresh faculty details to get the updated summary
      const updatedFaculty = await hrService.getFacultyDetails(
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
  const fetchTerminationRequests = async () => {
    try {
      const response = await hrService.getTerminationRequests();
      setTerminationRequests(response.data || []);
    } catch (err) {
      console.error("Error fetching termination requests:", err);
      // Don't set global error here, as this is a secondary feature
    }
  };

  // Handle search
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

  // Open faculty details popup
  const openPopup = async (facultyId) => {
    try {
      setLoading(true);
      const response = await hrService.getFacultyDetails(facultyId);
      const faculty = response.data;

      setSelectedFaculty(faculty);

      // Reset HR clearance checkboxes
      setSecurityCleared(false);
      setDocumentsReceived(false);
      setReadyForArchiving(false);

      setShowPopup(true);
      setLoading(false);
    } catch (err) {
      setError("Failed to load faculty details. Please try again.");
      setLoading(false);
      console.error("Error fetching faculty details:", err);
    }
  };

  // Close faculty details popup
  const closePopup = () => {
    setShowPopup(false);
    setSelectedFaculty(null);
    setSecurityCleared(false);
    setDocumentsReceived(false);
    setReadyForArchiving(false);
  };

  // Handle renewal decision
  const handleRenewalDecision = async (decisionData) => {
    // Validate HR clearance checkboxes
    // if (decisionData.status === "approve" && (!securityCleared || !documentsReceived)) {
    // if (decisionData.status === "approve" && (!securityCleared || !documentsReceived)) {
    //   setError("Please verify security clearance and documents before approving");
    //   return false;
    // }

    try {
      setSubmitting(true);

      const hrExtras = {
        securityCleared,
        documentsReceived,
        readyForArchiving
      };

      await hrService.submitDecision(selectedFaculty.faculty_id, {
        applicationId: selectedFaculty.application_id,
        status: decisionData.status,
        yearsGranted: decisionData.yearsGranted,
        comments: decisionData.comments || "",
        hrExtras
      });

      // Update faculty list after submission
      const response = await hrService.getFacultyList();
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
      const response = await hrService.getTerminationDetails(terminationId);
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
      await hrService.submitTerminationDecision(
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

  // Render HR security clearance section
  const renderHRClearance = () => {
    return (
      <div className="hr-clearance">
        <h4>HR Security Clearance</h4>
        <div className="clearance-options">
          <label>
            <input
              type="checkbox"
              name="securityCheck"
              checked={securityCleared}
              onChange={() => setSecurityCleared(!securityCleared)}
            />
            Security clearance verified
          </label>
          <label>
            <input
              type="checkbox"
              name="documentCheck"
              checked={documentsReceived}
              onChange={() => setDocumentsReceived(!documentsReceived)}
            />
            All documents received
          </label>
          <label>
            <input
              type="checkbox"
              name="archiveCheck"
              checked={readyForArchiving}
              onChange={() => setReadyForArchiving(!readyForArchiving)}
            />
            Ready for archiving
          </label>
        </div>
      </div>
    );
  };

  // Render loading state
  if (loading && facultyList.length === 0) {
    return <div className="loading">Loading faculty data...</div>;
  }

  return (
    <div className="hr-panel">
      <LogoutButton />

      {/* Main Container */}
      <div className="main-container">
        {/* Title & Search Bar */}
        <div className="header">
          <h2>HR Panel</h2>

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
          <div className="faculty-list-container">
            <div className="faculty-list">
              {filteredList.length === 0 ? (
                <p className="no-faculty">No faculty members found</p>
              ) : (
                filteredList.map((faculty) => (
                  <FacultyListItem
                    key={faculty.faculty_id}
                    faculty={faculty}
                    onViewDetails={openPopup}
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



            {/* Reusable RenewalDecisionPanel component */}
            {selectedFaculty.application_id && (
              <RenewalDecisionPanel
                facultyData={selectedFaculty}
                onSubmitDecision={handleRenewalDecision}
                roleType="HR"
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
              roleType="HR"
              previousDecisions={selectedTermination.approval_steps || []}
            />
          </>
        )}
      </PopupOverlay>
    </div>
  );
};

export default HRPanel;