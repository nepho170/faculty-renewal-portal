import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5003/api";

// Create axios instance with base URL
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor to include auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      console.log("Adding auth token to request");
      config.headers["Authorization"] = `Bearer ${token}`;
    } else {
      console.log("No token found for request");
    }
    return config;
  },
  (error) => {
    console.error("Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// Add response interceptor to handle token expiration
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error("API response error:", error.response?.status, error.message);

    if (error.response && error.response.status === 401) {
      // Token expired or invalid
      console.log("401 Unauthorized response - logging out");
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Authentication services
export const authService = {
  login: (credentials) => {
    console.log("authService.login called with:", {
      ...credentials,
      password: "[REDACTED]",
    });
    return apiClient.post("/login", credentials);
  },
};

// Faculty services
export const facultyService = {
  getProfile: () => {
    console.log("facultyService.getProfile called");

    console.log("Headers:", apiClient.defaults.headers);
    return apiClient.get("/faculty/profile");
  },

  startRenewal: () => {
    console.log("facultyService.startRenewal called");
    return apiClient.post("/faculty/start-renewal");
  },

  downloadRenewalContract: (applicationId) => {
    console.log(
      "facultyService.downloadRenewalContract called for applicationId:",
      applicationId
    );
    return apiClient.get(`/faculty/contract/${applicationId}`, {
      responseType: "blob",
    });
  },

  // Termination-related functions
  submitTerminationRequest: (terminationData) => {
    console.log(
      "facultyService.submitTerminationRequest called with data:",
      terminationData
    );
    return apiClient.post("/faculty/termination-request", terminationData);
  },

  getTerminationRequest: () => {
    console.log("facultyService.getTerminationRequest called");
    return apiClient.get("/faculty/termination-request").catch((error) => {
      console.error(
        "API error in getTerminationRequest:",
        error.response?.status,
        error.message
      );
      // Re-throw to be handled by the component
      throw error;
    });
  },

  uploadTerminationDocument: (terminationId, file) => {
    console.log(
      "facultyService.uploadTerminationDocument called for terminationId:",
      terminationId
    );
    const formData = new FormData();
    formData.append("document", file);

    return apiClient.post(
      `/faculty/termination/${terminationId}/document`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
  },

  cancelTerminationRequest: (terminationId) => {
    console.log(
      "facultyService.cancelTerminationRequest called for terminationId:",
      terminationId
    );
    return apiClient.delete(`/faculty/termination/${terminationId}`);
  },
};

// Dean services
export const deanService = {
  getFacultyList: (department) => {
    console.log("deanService.getFacultyList called, department:", department);
    return apiClient.get(
      `/dean/faculty${department ? `?department=${department}` : ""}`
    );
  },
  getFacultyDetails: (facultyId) => {
    console.log("deanService.getFacultyDetails called, facultyId:", facultyId);
    return apiClient.get(`/faculty/${facultyId}`);
  },
  submitDecision: (facultyId, decision) => {
    console.log(
      "deanService.submitDecision called, facultyId:",
      facultyId,
      "decision:",
      decision
    );
    return apiClient.post(`/faculty/${facultyId}/decision`, decision);
  },
  initiateRenewal: (facultyId) => {
    console.log("deanService.initiateRenewal called for facultyId:", facultyId);
    return apiClient.post(`/dean/initiate-renewal/${facultyId}`);
  },
  processEvaluationDocument: (applicationId) => {
    console.log(
      "deanService.processEvaluationDocument called, applicationId:",
      applicationId
    );
    return apiClient.post(`/applications/${applicationId}/process-document`);
  },

  getApplicationSummary: (applicationId) => {
    console.log(
      "deanService.getApplicationSummary called, applicationId:",
      applicationId
    );
    return apiClient.get(`/applications/${applicationId}/summary`);
  },

  // Termination-related functions
  getTerminationRequests: () => {
    console.log("deanService.getTerminationRequests called");
    return apiClient.get("/dean/termination-requests");
  },

  getTerminationDetails: (terminationId) => {
    console.log(
      "deanService.getTerminationDetails called, terminationId:",
      terminationId
    );
    return apiClient.get(`/termination/${terminationId}`);
  },

  submitTerminationDecision: (terminationId, decision) => {
    console.log(
      "deanService.submitTerminationDecision called, terminationId:",
      terminationId,
      "decision:",
      decision
    );
    return apiClient.post(`/termination/${terminationId}/decision`, decision);
  },
};

// Provost services
export const provostService = {
  getFacultyList: () => {
    console.log("provostService.getFacultyList called");
    return apiClient.get("/provost/faculty");
  },
  getFacultyDetails: (facultyId) => {
    console.log(
      "provostService.getFacultyDetails called, facultyId:",
      facultyId
    );
    return apiClient.get(`/faculty/${facultyId}`);
  },
  submitDecision: (facultyId, decision) => {
    console.log("provostService.submitDecision called, facultyId:", facultyId);
    return apiClient.post(`/faculty/${facultyId}/decision`, decision);
  },

  // Termination-related functions
  getTerminationRequests: () => {
    console.log("provostService.getTerminationRequests called");
    return apiClient.get("/provost/termination-requests");
  },

  getTerminationDetails: (terminationId) => {
    console.log(
      "provostService.getTerminationDetails called, terminationId:",
      terminationId
    );
    return apiClient.get(`/termination/${terminationId}`);
  },

  submitTerminationDecision: (terminationId, decision) => {
    console.log(
      "provostService.submitTerminationDecision called, terminationId:",
      terminationId,
      "decision:",
      decision
    );
    return apiClient.post(`/termination/${terminationId}/decision`, decision);
  },
};

// HR services
export const hrService = {
  getFacultyList: () => {
    console.log("hrService.getFacultyList called");
    return apiClient.get("/hr/faculty");
  },
  getFacultyDetails: (facultyId) => {
    console.log("hrService.getFacultyDetails called, facultyId:", facultyId);
    return apiClient.get(`/faculty/${facultyId}`);
  },
  submitDecision: (facultyId, decision) => {
    console.log("hrService.submitDecision called, facultyId:", facultyId);
    return apiClient.post(`/faculty/${facultyId}/decision`, decision);
  },

  // Termination-related functions
  getTerminationRequests: () => {
    console.log("hrService.getTerminationRequests called");
    return apiClient.get("/hr/termination-requests");
  },

  getTerminationDetails: (terminationId) => {
    console.log(
      "hrService.getTerminationDetails called, terminationId:",
      terminationId
    );
    return apiClient.get(`/termination/${terminationId}`);
  },

  submitTerminationDecision: (terminationId, decision) => {
    console.log(
      "hrService.submitTerminationDecision called, terminationId:",
      terminationId,
      "decision:",
      decision
    );
    return apiClient.post(`/termination/${terminationId}/decision`, decision);
  },

  // processTermination: (terminationId) => {
  //   console.log(
  //     "hrService.processTermination called, terminationId:",
  //     terminationId
  //   );
  //   return apiClient.post(`/termination/${terminationId}/process`);
  // },
};

// VC services (new)

export const vcService = {
  getTerminationRequests: () => {
    console.log("vcService.getTerminationRequests called");
    return apiClient.get("/vc/termination-requests");
  },

  getTerminationDetails: (terminationId) => {
    console.log(
      "vcService.getTerminationDetails called, terminationId:",
      terminationId
    );
    return apiClient.get(`/termination/${terminationId}`);
  },

  submitTerminationDecision: (terminationId, decision) => {
    console.log(
      "vcService.submitTerminationDecision called, terminationId:",
      terminationId,
      "decision:",
      decision
    );
    return apiClient.post(`/termination/${terminationId}/decision`, decision);
  },

  // Add process termination function
  processTermination: (terminationId) => {
    console.log(
      "vcService.processTermination called, terminationId:",
      terminationId
    );
    return apiClient.post(`/termination/${terminationId}/process`);
  }
};
