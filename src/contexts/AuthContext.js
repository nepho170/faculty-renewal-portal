import React, { createContext, useState, useEffect, useContext } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";

// Create the auth context
const AuthContext = createContext();

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in (token in localStorage)
    const checkLoggedInUser = () => {
      const token = localStorage.getItem("token");
      console.log("Token from localStorage:", token ? "Found" : "Not found");

      if (token) {
        try {
          // Verify token hasn't expired
          const decoded = jwtDecode(token);
          console.log("Decoded token:", decoded);

          const currentTime = Date.now() / 1000;

          if (decoded.exp > currentTime) {
            // Set axios default auth header
            axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

            // Set current user from token
            const userData = {
              id: decoded.id,
              role: decoded.role,
              bannerId: decoded.bannerId,
            };

            console.log("Setting current user:", userData);
            setCurrentUser(userData);
          } else {
            // Token expired, remove it
            console.log("Token expired, removing");
            localStorage.removeItem("token");
            delete axios.defaults.headers.common["Authorization"];
          }
        } catch (error) {
          // Invalid token
          console.error("Error decoding token:", error);
          localStorage.removeItem("token");
          delete axios.defaults.headers.common["Authorization"];
        }
      } else {
        console.log("No token found, user not authenticated");
      }

      setIsLoading(false);
    };

    checkLoggedInUser();
  }, []);

  // Login function
  // Login function
  const login = async (credentials) => {
    try {
      console.log("Attempting login with:", credentials);
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/login`,
        credentials
      );
      const { token, user } = response.data;

      console.log("Login successful, received:", {
        token: token ? "Token received" : "No token",
        user,
      });

      if (!token || !user) {
        throw new Error("Invalid response from server");
      }

      // Store token in localStorage
      localStorage.setItem("token", token);

      // Set axios default auth header
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      // Set current user
      setCurrentUser(user);

      return user;
    } catch (error) {
      console.error("Login error:", error.response?.data || error.message);
      throw error.response?.data?.message || "Login failed";
    }
  };

  // Logout function
  const logout = () => {
    console.log("Logging out user");
    // Remove token from localStorage
    localStorage.removeItem("token");

    // Remove axios auth header
    delete axios.defaults.headers.common["Authorization"];

    // Clear current user
    setCurrentUser(null);
  };

  // Provide the auth context value
  const value = {
    currentUser,
    isLoading,
    login,
    logout,
  };

  console.log("Auth context current state:", {
    isAuthenticated: !!currentUser,
    isLoading,
    userRole: currentUser?.role,
  });

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
