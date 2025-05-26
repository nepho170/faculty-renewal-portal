import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

// Pages
import LoginPage from "./pages/LoginPage";
import FacultyDashboard from "./pages/FacultyDashboard";
import DeanPanel from "./pages/DeanPanel";
import ProvostPanel from "./pages/ProvostPanel";
import HRPanel from "./pages/HRPanel";
import VCPanel from "./pages/VCPanel";
import NotFoundPage from "./pages/NotFoundPage";

// Protected route component
const ProtectedRoute = ({ element, allowedRoles }) => {
  const { currentUser, isLoading } = useAuth();
  const location = useLocation();

  console.log("ProtectedRoute check:", {
    path: location.pathname,
    currentUser,
    isLoading,
    allowedRoles,
    isAuthenticated: !!currentUser,
    hasAllowedRole: currentUser && allowedRoles?.includes(currentUser.role),
  });

  // Show loading indicator while auth state is being checked
  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  // If user is not logged in, redirect to login
  if (!currentUser) {
    console.log("User not authenticated, redirecting to login");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If roles are specified and user's role is not allowed, redirect to appropriate dashboard
  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    console.log(
      "User doesn't have required role, redirecting to appropriate dashboard"
    );

    // Redirect based on user role
    switch (currentUser.role) {
      case "Faculty":
        return <Navigate to="/faculty" replace />;
      case "VC":
        return <Navigate to="/vc" replace />;
      case "Dean":
        return <Navigate to="/dean" replace />;
      case "Provost":
        return <Navigate to="/provost" replace />;
      case "HR":
        return <Navigate to="/hr" replace />;
      default:
        console.warn("Unknown role:", currentUser.role);
        return <Navigate to="/login" replace />;
    }
  }

  // If all checks pass, render the protected component
  console.log(
    "User authenticated and authorized, rendering protected component"
  );
  return element;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected routes */}
          <Route
            path="/faculty"
            element={
              <ProtectedRoute
                element={<FacultyDashboard />}
                allowedRoles={["Faculty"]}
              />
            }
          />
          <Route
            path="/dean"
            element={
              <ProtectedRoute element={<DeanPanel />} allowedRoles={["Dean"]} />
            }
          />
          <Route
            path="/provost"
            element={
              <ProtectedRoute
                element={<ProvostPanel />}
                allowedRoles={["Provost"]}
              />
            }
          />
          <Route
            path="/hr"
            element={
              <ProtectedRoute element={<HRPanel />} allowedRoles={["HR"]} />
            }
          />
          <Route
            path="/vc"
            element={
              <ProtectedRoute element={<VCPanel />} allowedRoles={["VC"]} />
            }
          />

          {/* Redirect root to login */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Catch all other routes */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
