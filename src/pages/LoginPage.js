import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useAuth } from "../contexts/AuthContext";
import "../styles/LoginPage.css";

const LoginPage = () => {
  const { currentUser, login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    console.log("LoginPage: currentUser check:", currentUser);

    // If user is already logged in, redirect based on role
    if (currentUser) {
      console.log("User already logged in, redirecting to appropriate page");

      switch (currentUser.role) {
        case "Faculty":
          navigate("/faculty");
          break;
        case "Department Chair":
          navigate("/chair");
          break;
        case "Dean":
          navigate("/dean");
          break;
        case "Provost":
          navigate("/provost");
          break;
        case "HR":
          navigate("/hr");
          break;
        case "VC":
          navigate("/vc");
          break;
        default:
          console.log("Unknown role, staying on login page");
      }
    }
  }, [currentUser, navigate]);

  // Formik form handling
  const formik = useFormik({
    initialValues: {
      banner_id: "",
      password: "",
      role: "Faculty",
    },
    validationSchema: Yup.object({
      banner_id: Yup.string().required("Banner ID is required"),
      password: Yup.string().required("Password is required"),
      role: Yup.string().required("Role is required"),
    }),
    onSubmit: async (values) => {
      console.log("Form submitted with values:", {
        ...values,
        password: "[REDACTED]",
      });
      setError("");
      setIsLoading(true);

      try {
        const user = await login(values);
        console.log("Login successful, received user:", user);

        // Small delay to ensure state updates fully
        setTimeout(() => {
          // Double check that we have user data before redirecting
          if (!user || !user.role) {
            console.error("Missing user data after login");
            setError("Login successful but received invalid user data");
            setIsLoading(false);
            return;
          }

          // Redirect based on user role
          switch (user.role) {
            case "Faculty":
              navigate("/faculty");
              break;
            case "Department Chair":
              navigate("/chair");
              break;
            case "Dean":
              navigate("/dean");
              break;
            case "Provost":
              navigate("/provost");
              break;
            case "HR":
              navigate("/hr");
              break;
            default:
              console.error("Unknown role received:", user.role);
              setError(`Unknown role: ${user.role}`);
              setIsLoading(false);
          }
        }, 100);
      } catch (error) {
        console.error("Login error in component:", error);
        setError(error.toString());
        setIsLoading(false);
      }
    },
  });

  return (
    <div className="login-page">
      <div className="glow-effect" style={{ top: "20%", left: "10%" }}></div>
      <div className="glow-effect" style={{ top: "70%", right: "10%" }}></div>

      <div className="login-container">
        <div className="login-box">
          <h2>Faculty Portal</h2>
          <p className="login-description">Secure Access for Faculty & Staff</p>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={formik.handleSubmit}>
            <div className="input-group">
              <label htmlFor="banner_id">Banner ID</label>
              <input
                type="text"
                id="banner_id"
                name="banner_id"
                placeholder="Enter your Banner ID"
                value={formik.values.banner_id}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                required
              />
              {formik.touched.banner_id && formik.errors.banner_id && (
                <div className="error">{formik.errors.banner_id}</div>
              )}
            </div>

            <div className="input-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                placeholder="Enter your password"
                value={formik.values.password}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                required
              />
              {formik.touched.password && formik.errors.password && (
                <div className="error">{formik.errors.password}</div>
              )}
            </div>

            <div className="input-group">
              <label htmlFor="role">Role</label>
              <select
                id="role"
                name="role"
                value={formik.values.role}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                required
              >
                <option value="Faculty">Faculty</option>
                <option value="Department Chair">Department Chair</option>
                <option value="Dean">Dean</option>
                <option value="Provost">Provost</option>
                <option value="HR">HR</option>
                <option value="VC">VC</option>
              </select>
              {formik.touched.role && formik.errors.role && (
                <div className="error">{formik.errors.role}</div>
              )}
            </div>

            <button type="submit" className="btn" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Login"}
            </button>
          </form>
          <p className="forgot-password">
            <a href="#">Forgot Password?</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
