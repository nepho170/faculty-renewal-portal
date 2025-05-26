import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { provostService } from "../services/apiService";
import "../styles/ProvostPanel.css";

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

const ProvostPanel = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [facultyList, setFacultyList] = useState([]);
  const [filteredList, setFilteredList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // State for faculty popup details
  const [showPopup, setShowPopup] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // State for renewal years edit
  const [isEditingYears, setIsEditingYears] = useState(false);
  const [renewalYears, setRenewalYears] = useState(0);
  const [originalRenewalYears, setOriginalRenewalYears] = useState(0);
  const [comment, setComment] = useState("");

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

  // Verify authentication
  useEffect(() => {
    if (!currentUser) {
      console.log("No current user in ProvostPanel, redirecting to login");
      navigate("/login");
    } else if (currentUser.role !== "Provost") {
      console.log(
        `User has ${currentUser.role} role, not Provost, redirecting`
      );
      navigate(`/${currentUser.role.toLowerCase()}`);
    }
  }, [currentUser, navigate]);

  // Fetch faculty list when component mounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch faculty list
        const response = await provostService.getFacultyList();
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

    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  // Renewal years edit functions
  const toggleRenewalEdit = () => {
    setIsEditingYears(true);
  };

  const saveRenewalDuration = () => {
    setIsEditingYears(false);
  };

  const cancelRenewalEdit = () => {
    setRenewalYears(originalRenewalYears);
    setIsEditingYears(false);
  };

  const handleRenewalChange = (e) => {
    setRenewalYears(parseInt(e.target.value));
  };

  const handleCommentChange = (e) => {
    setComment(e.target.value);
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

  const handleProcessDocument = async (applicationId) => {
    try {
      setLoading(true);
      setError("");

      const response = await provostService.processEvaluationDocument(
        applicationId
      );

      // Refresh faculty details to get the updated summary
      const updatedFaculty = await provostService.getFacultyDetails(
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

  // Open faculty details popup
  const openPopup = async (facultyId) => {
    try {
      setLoading(true);
      const response = await provostService.getFacultyDetails(facultyId);
      const faculty = response.data;

      setSelectedFaculty(faculty);

      // Get renewal years from previous step if available
      if (faculty.approval_steps && faculty.approval_steps.length > 0) {
        const deanStep = faculty.approval_steps.find(
          (step) => step.role_name === "Dean"
        );
        if (deanStep && deanStep.years_granted) {
          setRenewalYears(deanStep.years_granted);
          setOriginalRenewalYears(deanStep.years_granted);
        } else {
          setRenewalYears(faculty.renewal_years || 0);
          setOriginalRenewalYears(faculty.renewal_years || 0);
        }
      } else {
        setRenewalYears(faculty.renewal_years || 0);
        setOriginalRenewalYears(faculty.renewal_years || 0);
      }

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
    setIsEditingYears(false);
    setComment("");
  };

  // Handle renewal decision
  const handleRenewalDecision = async (decisionData) => {
    try {
      setSubmitting(true);

      await provostService.submitDecision(selectedFaculty.faculty_id, {
        applicationId: selectedFaculty.application_id,
        status: decisionData.status,
        yearsGranted: isEditingYears ? renewalYears : decisionData.yearsGranted,
        comments: decisionData.comments || "",
      });

      // Update faculty list after submission
      const response = await provostService.getFacultyList();
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

  // Termination related functions
  const openTerminationPopup = async (terminationId) => {
    try {
      setLoading(true);
      const response = await provostService.getTerminationDetails(terminationId);
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
      await provostService.submitTerminationDecision(
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

  const fetchTerminationRequests = async () => {
    try {
      const response = await provostService.getTerminationRequests();
      setTerminationRequests(response.data || []);
    } catch (err) {
      console.error("Error fetching termination requests:", err);
      // Don't set global error here, as this is a secondary feature
    }
  };

  // Render custom renewal years editor
  const renderRenewalYearsEditor = () => {
    if (!selectedFaculty) return null;

    return (
      <div className="info-box renewal-editor">
        <label>Contract Renewal Duration: </label>
        {!isEditingYears ? (
          <>
            <span className="renewal-text">
              {renewalYears} {renewalYears === "1" ? "Year" : "Years"}
            </span>
            {/* Floating Edit Icon Button */}
            <button className="edit-btn" onClick={toggleRenewalEdit} aria-label="Edit renewal duration">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
          </>
        ) : (
          <div className="edit-container">
            <select
              className="renewal-dropdown"
              value={renewalYears}
              onChange={handleRenewalChange}
            >
              <option value="0">0 Years (No Renewal)</option>
              <option value="1">1 Year</option>
              <option value="2">2 Years</option>
              <option value="3">3 Years</option>
              <option value="4">4 Years</option>
              <option value="5">5 Years</option>
            </select>

            {/* Save & Cancel Icons */}
            <div className="edit-actions">
              <button className="save-btn" onClick={saveRenewalDuration} aria-label="Save renewal duration">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </button>
              <button className="cancel-btn" onClick={cancelRenewalEdit} aria-label="Cancel editing">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render loading state
  if (loading && facultyList.length === 0) {
    return <div className="loading">Loading faculty data...</div>;
  }

  return (
    <div className="provost-panel">
      {/* Logout Button */}
      <LogoutButton />

      {/* Main Container */}
      <div className="main-container">
        {/* Title & Search Bar */}
        <div className="header">
          <h2>Provost Panel</h2>

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

            {/* Custom renewal years editor for Provost */}
            {renderRenewalYearsEditor()}


            {/* Reusable RenewalDecisionPanel component */}
            {selectedFaculty.application_id && (
              <RenewalDecisionPanel
                facultyData={selectedFaculty}
                onSubmitDecision={handleRenewalDecision}
                roleType="Provost"
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
              roleType="Provost"
              previousDecisions={selectedTermination.approval_steps || []}
            />
          </>
        )}
      </PopupOverlay>



    </div>
  );
};

export default ProvostPanel;