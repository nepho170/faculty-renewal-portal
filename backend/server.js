const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const path = require("path");
const { processPDF } = require("../utils/pdfProcessor");
const multer = require("multer");

// Load environment variables
dotenv.config();

const app = express();
console.log("Express app initialized");
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.originalUrl}`);
  next();
});
const PORT = process.env.PORT || 5003;

const PDFDocument = require("pdfkit");
const fs = require("fs");

// Configure storage for uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Define where the uploaded files should be stored
    cb(null, "uploads/termination-documents/");
  },
  filename: function (req, file, cb) {
    // Define how the uploaded files should be named
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

// Create the upload middleware
const upload = multer({ storage: storage });

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "faculty_renewal_portal",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  port: 3306,
});

// Verify database connection
db.getConnection((err, connection) => {
  if (err) {
    console.error("Database connection failed:", err.message);
  } else {
    console.log("Connected to the database successfully!");
    connection.release();
  }
});

// Middleware for token verification
const verifyToken = (req, res, next) => {
  console.log("verifyToken middleware started");
  const token = req.headers["authorization"]?.split(" ")[1];
  console.log("Verifying token:", token ? "Token present" : "No token");

  if (!token) {
    console.log("Token verification failed: No token provided");
    return res.status(403).json({ message: "No token provided" });
  }

  jwt.verify(token, process.env.JWT_SECRET || "", (err, decoded) => {
    if (err) {
      console.log("Token verification failed:", err.message);
      return res.status(401).json({ message: "Unauthorized" });
    }

    console.log("Token verified successfully:", {
      id: decoded.id,
      role: decoded.role,
      bannerId: decoded.bannerId,
    });

    req.userId = decoded.id;
    req.userRole = decoded.role;
    req.bannerId = decoded.bannerId;
    next();
  });
};

app.get("/api/test", (req, res) => {
  console.log("Test route hit");
  res.status(200).json({ message: "Server is responding" });
});
// Login route

app.post("/api/login", (req, res) => {
  const { banner_id, password, role } = req.body;
  console.log("Login attempt:", { banner_id, role });

  if (!banner_id || !password || !role) {
    console.log("Missing credentials");
    return res
      .status(400)
      .json({ message: "Banner ID, password, and role are required" });
  }

  // Query to check if user exists and has the specified role
  const query = `
    SELECT u.user_id, u.banner_id, u.password_hash, r.role_name
    FROM users u
    JOIN user_roles ur ON u.user_id = ur.user_id
    JOIN roles r ON ur.role_id = r.role_id
    WHERE u.banner_id = ? AND r.role_name = ? AND u.is_active = TRUE
  `;

  db.query(query, [banner_id, role], (err, results) => {
    if (err) {
      console.error("Login query error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    console.log("Query results:", results);

    if (results.length === 0) {
      console.log("No matching user found");
      return res.status(401).json({ message: "Invalid credentials or role" });
    }

    const user = results[0];
    console.log("Found user:", user);

    // For demo purposes, simple password check (in production, use bcrypt.compare)
    if (password === user.password_hash) {
      // Create token with a longer expiration
      const token = jwt.sign(
        { id: user.user_id, role: user.role_name, bannerId: user.banner_id },
        process.env.JWT_SECRET || "your_jwt_secret",
        { expiresIn: "24h" } // Extended from 1h to 24h
      );

      console.log("Login successful, token created with payload:", {
        id: user.user_id,
        role: user.role_name,
        bannerId: user.banner_id,
      });

      // Update last login timestamp
      db.query("UPDATE users SET last_login = NOW() WHERE user_id = ?", [
        user.user_id,
      ]);

      return res.status(200).json({
        token,
        user: {
          id: user.user_id,
          banner_id: user.banner_id,
          role: user.role_name,
        },
      });
    } else {
      console.log("Password mismatch");
      return res.status(401).json({ message: "Invalid credentials" });
    }
  });
});

// Get faculty's termination request
app.get("/api/faculty/termination-request", verifyToken, (req, res) => {


  if (req.userRole !== "Faculty") {
    console.log(`Access denied: user has role ${req.userRole}, not Faculty`);
    return res.status(403).json({ message: "Forbidden: Not a faculty user" });
  }

  // Simplify the query to directly find the termination by faculty_id
  const directQuery = `
    SELECT tr.termination_id, tr.faculty_id, tr.status, tr.termination_type, 
           tr.submission_date, tr.reason, tr.notice_period_accepted,
           tr.last_working_date, tr.notice_date, tr.months_in_lieu_of_notice,
           tr.document_path,
           f.first_name, f.last_name, f.banner_id, f.college_department
    FROM termination_requests tr
    JOIN faculty f ON tr.faculty_id = f.faculty_id
    WHERE f.banner_id = ?
    ORDER BY tr.submission_date DESC
    LIMIT 1
  `;

  db.query(directQuery, [req.bannerId], (err, results) => {
    if (err) {
      console.error("Database error in termination request lookup:", err);
      return res.status(500).json({ message: "Database error" });
    }



    if (results.length === 0) {
      console.log("No termination request found");
      return res.status(404).json({ message: "No termination request found" });
    }

    const termination = results[0];


    // Success - return just this data for now to confirm the endpoint works
    return res.status(200).json(termination);
  });
});



// Submit a new termination request
app.post("/api/faculty/termination-request", verifyToken, (req, res) => {
  if (req.userRole !== "Faculty") {
    return res.status(403).json({ message: "Forbidden: Not a faculty user" });
  }

  const {
    terminationType,
    reason,
    lastWorkingDate,
    noticeDate,
    noticePeriodAccepted,
    monthsInLieu,
  } = req.body;

  if (!terminationType || !reason || !lastWorkingDate || !noticeDate) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  // First, get the faculty_id from the banner_id
  const getFacultyIdQuery = "SELECT faculty_id FROM faculty WHERE banner_id = ?";

  db.query(getFacultyIdQuery, [req.bannerId], (err, results) => {
    if (err) {
      console.error("Error getting faculty_id:", err);
      return res.status(500).json({ message: "Database error" });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "Faculty not found" });
    }

    const facultyId = results[0].faculty_id;

    // Insert the termination request
    const insertQuery = `
      INSERT INTO termination_requests (
        faculty_id, 
        status, 
        termination_type, 
        reason, 
        notice_period_accepted, 
        last_working_date, 
        notice_date, 
        months_in_lieu_of_notice
      ) 
      VALUES (?, 'Submitted', ?, ?, ?, ?, ?, ?)
    `;

    db.query(
      insertQuery,
      [
        facultyId,
        terminationType,
        reason,
        noticePeriodAccepted ? 1 : 0,
        lastWorkingDate,
        noticeDate,
        monthsInLieu || 0,
      ],
      (insertErr, insertResults) => {
        if (insertErr) {
          console.error("Error inserting termination request:", insertErr);
          return res.status(500).json({ message: "Database error" });
        }

        const terminationId = insertResults.insertId;

        // Update faculty status to "Termination Pending"
        const updateStatusQuery = `
          UPDATE faculty 
          SET status = 'Termination Pending'
          WHERE faculty_id = ?
        `;

        db.query(updateStatusQuery, [facultyId], (statusErr) => {
          if (statusErr) {
            console.error("Error updating faculty status:", statusErr);
            return res.status(500).json({ message: "Database error" });
          }

          // Get all approval roles
          const rolesQuery = `
            SELECT role_id FROM roles 
            WHERE role_name IN ('Dean', 'Provost', 'HR', 'VC')
            ORDER BY FIELD(role_name, 'Dean', 'Provost', 'HR', 'VC')
          `;

          db.query(rolesQuery, (rolesErr, rolesResults) => {
            if (rolesErr) {
              console.error("Error fetching roles:", rolesErr);
              return res.status(500).json({ message: "Database error" });
            }

            // Get a dean user for approval
            const deanQuery = `
              SELECT u.user_id
              FROM users u
              JOIN user_roles ur ON u.user_id = ur.user_id
              JOIN roles r ON ur.role_id = r.role_id
              WHERE r.role_name = 'Dean'
              LIMIT 1
            `;

            db.query(deanQuery, (deanErr, deanResults) => {
              if (deanErr || deanResults.length === 0) {
                console.error("Error fetching dean user:", deanErr);
                return res.status(500).json({ message: "Database error" });
              }

              const deanUserId = deanResults[0].user_id;

              // Create initial approval step (dean)
              const approvalQuery = `
                INSERT INTO termination_approval_steps (
                  termination_id, role_id, user_id, status
                ) VALUES (?, ?, ?, 'Pending')
              `;

              db.query(
                approvalQuery,
                [terminationId, rolesResults[0].role_id, deanUserId],
                (approvalErr) => {
                  if (approvalErr) {
                    console.error("Error inserting approval step:", approvalErr);
                    return res.status(500).json({ message: "Database error" });
                  }

                  return res.status(201).json({
                    message: "Termination request submitted successfully",
                    terminationId,
                  });
                }
              );
            });
          });
        });
      }
    );
  });
});

// Upload document for termination request
app.post(
  "/api/faculty/termination/:terminationId/document",
  verifyToken,
  upload.single("document"),
  (req, res) => {
    if (req.userRole !== "Faculty") {
      return res.status(403).json({ message: "Forbidden: Not a faculty user" });
    }

    const terminationId = req.params.terminationId;

    if (!req.file) {
      return res.status(400).json({ message: "No document uploaded" });
    }

    const documentPath = req.file.path;

    // Update the document path in the termination request
    const updateQuery = `
    UPDATE termination_requests
    SET document_path = ?
    WHERE termination_id = ?
  `;

    db.query(updateQuery, [documentPath, terminationId], (err) => {
      if (err) {
        console.error("Error updating document path:", err);
        return res.status(500).json({ message: "Database error" });
      }

      return res.status(200).json({
        message: "Document uploaded successfully",
        documentPath,
      });
    });
  }
);

// Cancel termination request (faculty only)
app.delete("/api/faculty/termination/:terminationId", verifyToken, (req, res) => {
  if (req.userRole !== "Faculty") {
    return res.status(403).json({ message: "Forbidden: Not a faculty user" });
  }

  const terminationId = req.params.terminationId;

  // First, check if the termination request belongs to this faculty
  const checkQuery = `
    SELECT tr.termination_id, tr.faculty_id
    FROM termination_requests tr
    JOIN faculty f ON tr.faculty_id = f.faculty_id
    WHERE tr.termination_id = ? AND f.banner_id = ?
  `;

  db.query(checkQuery, [terminationId, req.bannerId], (err, results) => {
    if (err) {
      console.error("Error checking termination request:", err);
      return res.status(500).json({ message: "Database error" });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "Termination request not found or not authorized" });
    }

    const facultyId = results[0].faculty_id;

    // Check if the request is still in 'Submitted' status
    const statusQuery = `
      SELECT status FROM termination_requests WHERE termination_id = ?
    `;

    db.query(statusQuery, [terminationId], (statusErr, statusResults) => {
      if (statusErr) {
        console.error("Error checking status:", statusErr);
        return res.status(500).json({ message: "Database error" });
      }

      if (statusResults[0].status !== "Submitted") {
        return res.status(400).json({
          message: "Cannot cancel request that has already been processed",
        });
      }

      // Delete the termination request
      const deleteQuery = `
        DELETE FROM termination_requests WHERE termination_id = ?
      `;

      db.query(deleteQuery, [terminationId], (deleteErr) => {
        if (deleteErr) {
          console.error("Error deleting termination request:", deleteErr);
          return res.status(500).json({ message: "Database error" });
        }

        // Reset faculty status to Active
        const resetStatusQuery = `
          UPDATE faculty
          SET status = 'Active'
          WHERE faculty_id = ?
        `;

        db.query(resetStatusQuery, [facultyId], (resetErr) => {
          if (resetErr) {
            console.error("Error resetting faculty status:", resetErr);
            return res.status(500).json({ message: "Database error" });
          }

          return res.status(200).json({
            message: "Termination request cancelled successfully",
          });
        });
      });
    });
  });
});

// Dean Termination Endpoints

// Get list of termination requests for Dean
app.get("/api/dean/termination-requests", verifyToken, (req, res) => {
  if (req.userRole !== "Dean") {
    return res.status(403).json({ message: "Forbidden: Not a dean user" });
  }

  const query = `
    SELECT 
      tr.termination_id, 
      tr.status, 
      tr.termination_type, 
      tr.submission_date,
      tr.reason,
      tr.last_working_date,
      f.faculty_id, 
      f.first_name, 
      f.last_name, 
      f.banner_id,
      f.college_department,
      CASE
        WHEN EXISTS (
          SELECT 1 FROM termination_approval_steps tas
          JOIN roles r ON tas.role_id = r.role_id
          WHERE tas.termination_id = tr.termination_id
          AND r.role_name = 'Dean' AND tas.status = 'Pending'
        ) THEN 1
        ELSE 0
      END as needs_review,
      CASE
        WHEN EXISTS (
          SELECT 1 FROM termination_approval_steps tas
          JOIN roles r ON tas.role_id = r.role_id
          WHERE tas.termination_id = tr.termination_id
          AND r.role_name = 'Dean' AND (tas.status = 'Approved' OR tas.status = 'Rejected')
        ) THEN 1
        ELSE 0
      END as reviewed_by_dean
    FROM termination_requests tr
    JOIN faculty f ON tr.faculty_id = f.faculty_id
    ORDER BY needs_review DESC, tr.submission_date DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching termination requests for dean:", err);
      return res.status(500).json({ message: "Database error" });
    }

    return res.status(200).json(results);
  });
});

// Provost Termination Endpoints

// Get list of termination requests for Provost
app.get("/api/provost/termination-requests", verifyToken, (req, res) => {
  if (req.userRole !== "Provost") {
    return res.status(403).json({ message: "Forbidden: Not a provost user" });
  }

  const query = `
    SELECT tr.termination_id, tr.status, tr.termination_type, tr.submission_date,
           f.faculty_id, f.first_name, f.last_name, f.banner_id
    FROM termination_requests tr
    JOIN faculty f ON tr.faculty_id = f.faculty_id
    JOIN termination_approval_steps tas ON tr.termination_id = tas.termination_id
    JOIN roles r ON tas.role_id = r.role_id
    WHERE r.role_name = 'Provost' AND tas.status = 'Pending'
    ORDER BY tr.submission_date DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching termination requests for provost:", err);
      return res.status(500).json({ message: "Database error" });
    }

    return res.status(200).json(results);
  });
});

// HR Termination Endpoints

// Get list of termination requests for HR
app.get("/api/hr/termination-requests", verifyToken, (req, res) => {
  if (req.userRole !== "HR") {
    return res.status(403).json({ message: "Forbidden: Not an HR user" });
  }

  const query = `
    SELECT tr.termination_id, tr.status, tr.termination_type, tr.submission_date,
           f.faculty_id, f.first_name, f.last_name, f.banner_id
    FROM termination_requests tr
    JOIN faculty f ON tr.faculty_id = f.faculty_id
    JOIN termination_approval_steps tas ON tr.termination_id = tas.termination_id
    JOIN roles r ON tas.role_id = r.role_id
    WHERE r.role_name = 'HR' AND tas.status = 'Pending'
    ORDER BY tr.submission_date DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching termination requests for HR:", err);
      return res.status(500).json({ message: "Database error" });
    }

    return res.status(200).json(results);
  });
});

// VC Termination Endpoints

// Get list of termination requests for VC
app.get("/api/vc/termination-requests", verifyToken, (req, res) => {
  if (req.userRole !== "VC") {
    return res.status(403).json({ message: "Forbidden: Not a VC user" });
  }

  const query = `
    SELECT tr.termination_id, tr.status, tr.termination_type, tr.submission_date,
           f.faculty_id, f.first_name, f.last_name, f.banner_id, f.college_department
    FROM termination_requests tr
    JOIN faculty f ON tr.faculty_id = f.faculty_id
    JOIN termination_approval_steps tas ON tr.termination_id = tas.termination_id
    JOIN roles r ON tas.role_id = r.role_id
    WHERE r.role_name = 'VC' AND tas.status = 'Pending'
    ORDER BY tr.submission_date DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching termination requests for VC:", err);
      return res.status(500).json({ message: "Database error" });
    }

    return res.status(200).json(results);
  });
});

// Common Endpoints for Termination

// Get termination details by ID
app.get("/api/termination/:terminationId", verifyToken, (req, res) => {
  const terminationId = req.params.terminationId;
  const allowedRoles = ["Dean", "Provost", "HR", "VC"];

  if (!allowedRoles.includes(req.userRole)) {
    return res.status(403).json({ message: "Forbidden: Not authorized" });
  }

  const query = `
    SELECT tr.*, 
           f.first_name, f.last_name, f.banner_id, f.college_department,
           f.job_title, f.original_hire_date, f.contract_expiration_date
    FROM termination_requests tr
    JOIN faculty f ON tr.faculty_id = f.faculty_id
    WHERE tr.termination_id = ?
  `;

  db.query(query, [terminationId], (err, results) => {
    if (err) {
      console.error("Error fetching termination details:", err);
      return res.status(500).json({ message: "Database error" });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "Termination request not found" });
    }

    // Get approval steps
    const stepsQuery = `
      SELECT tas.*, r.role_name
      FROM termination_approval_steps tas
      JOIN roles r ON tas.role_id = r.role_id
      WHERE tas.termination_id = ?
    `;

    db.query(stepsQuery, [terminationId], (stepsErr, stepsResults) => {
      if (stepsErr) {
        console.error("Error fetching termination approval steps:", stepsErr);
        return res.status(500).json({ message: "Database error" });
      }

      const termination = results[0];
      termination.approval_steps = stepsResults;

      return res.status(200).json(termination);
    });
  });
});

// Submit decision for termination request
app.post(
  "/api/termination/:terminationId/decision",
  verifyToken,
  (req, res) => {
    const terminationId = req.params.terminationId;
    const { status, comments } = req.body;
    const allowedRoles = ["Dean", "Provost", "HR", "VC"];

    if (!allowedRoles.includes(req.userRole)) {
      return res.status(403).json({ message: "Forbidden: Not authorized" });
    }

    if (!status || (status !== "approve" && status !== "reject")) {
      return res
        .status(400)
        .json({ message: "Invalid status: must be 'approve' or 'reject'" });
    }

    // Find the current approval step
    const stepQuery = `
    SELECT tas.step_id, r.role_id, r.role_name
    FROM termination_approval_steps tas
    JOIN roles r ON tas.role_id = r.role_id
    WHERE tas.termination_id = ? AND r.role_name = ? AND tas.status = 'Pending'
  `;

    db.query(stepQuery, [terminationId, req.userRole], (err, results) => {
      if (err) {
        console.error("Error finding approval step:", err);
        return res.status(500).json({ message: "Database error" });
      }

      if (results.length === 0) {
        return res
          .status(404)
          .json({ message: "No pending approval step found for your role" });
      }

      const stepId = results[0].step_id;
      const roleId = results[0].role_id;
      const roleName = results[0].role_name;

      // Update the current step
      const updateStepQuery = `
      UPDATE termination_approval_steps
      SET status = ?, comments = ?, action_date = NOW()
      WHERE step_id = ?
    `;

      db.query(
        updateStepQuery,
        [
          status === "approve" ? "Approved" : "Rejected",
          comments || null,
          stepId,
        ],
        (updateErr) => {
          if (updateErr) {
            console.error("Error updating approval step:", updateErr);
            return res.status(500).json({ message: "Database error" });
          }

          // If rejected, update the termination request status
          if (status === "reject") {
            const rejectQuery = `
            UPDATE termination_requests
            SET status = ?
            WHERE termination_id = ?
          `;

            db.query(
              rejectQuery,
              [`${roleName} Rejected`, terminationId],
              (rejectErr) => {
                if (rejectErr) {
                  console.error(
                    "Error updating termination status:",
                    rejectErr
                  );
                  return res.status(500).json({ message: "Database error" });
                }

                return res.status(200).json({
                  message: "Decision submitted successfully",
                  status: "rejected",
                });
              }
            );
          } else {
            // If approved, update the termination request status and create next approval step
            const nextRoleQuery = `
            SELECT role_id, role_name
            FROM roles
            WHERE role_name IN ('Provost', 'HR', 'VC')
            AND role_name NOT IN (
              SELECT r.role_name
              FROM termination_approval_steps tas
              JOIN roles r ON tas.role_id = r.role_id
              WHERE tas.termination_id = ? AND tas.status != 'Pending'
            )
            ORDER BY FIELD(role_name, 'Dean', 'Provost', 'HR', 'VC')
            LIMIT 1
          `;

            db.query(
              nextRoleQuery,
              [terminationId],
              (nextRoleErr, nextRoleResults) => {
                if (nextRoleErr) {
                  console.error("Error finding next role:", nextRoleErr);
                  return res.status(500).json({ message: "Database error" });
                }

                // Update termination request status
                const updateStatusQuery = `
              UPDATE termination_requests
              SET status = ?
              WHERE termination_id = ?
            `;

                const newStatus = `${roleName} Approved`;

                db.query(
                  updateStatusQuery,
                  [newStatus, terminationId],
                  (updateStatusErr) => {
                    if (updateStatusErr) {
                      console.error(
                        "Error updating termination status:",
                        updateStatusErr
                      );
                      return res
                        .status(500)
                        .json({ message: "Database error" });
                    }

                    // If there's a next role, create the approval step
                    if (nextRoleResults.length > 0) {
                      const nextRoleId = nextRoleResults[0].role_id;
                      const nextRoleName = nextRoleResults[0].role_name;

                      // Get a user with the next role
                      const userQuery = `
                    SELECT u.user_id
                    FROM users u
                    JOIN user_roles ur ON u.user_id = ur.user_id
                    JOIN roles r ON ur.role_id = r.role_id
                    WHERE r.role_name = ?
                    LIMIT 1
                  `;

                      db.query(
                        userQuery,
                        [nextRoleName],
                        (userErr, userResults) => {
                          if (userErr || userResults.length === 0) {
                            console.error(
                              "Error finding user for next role:",
                              userErr
                            );
                            return res
                              .status(500)
                              .json({ message: "Database error" });
                          }

                          const userId = userResults[0].user_id;

                          // Create next approval step
                          const createStepQuery = `
                      INSERT INTO termination_approval_steps (
                        termination_id, role_id, user_id, status
                      ) VALUES (?, ?, ?, 'Pending')
                    `;

                          db.query(
                            createStepQuery,
                            [terminationId, nextRoleId, userId],
                            (createStepErr) => {
                              if (createStepErr) {
                                console.error(
                                  "Error creating next approval step:",
                                  createStepErr
                                );
                                return res
                                  .status(500)
                                  .json({ message: "Database error" });
                              }

                              return res.status(200).json({
                                message: "Decision submitted successfully",
                                status: "approved",
                                nextRole: nextRoleName,
                              });
                            }
                          );
                        }
                      );
                    } else {
                      if (req.userRole === 'VC') {
                        // Get the faculty ID associated with this termination
                        const facultyQuery = `
    SELECT faculty_id, last_working_date
    FROM termination_requests
    WHERE termination_id = ?
  `;

                        db.query(facultyQuery, [terminationId], (facultyErr, facultyResults) => {
                          if (facultyErr || facultyResults.length === 0) {
                            console.error("Error getting faculty ID:", facultyErr);
                            return res.status(500).json({ message: "Database error" });
                          }

                          const facultyId = facultyResults[0].faculty_id;
                          const lastWorkingDate = facultyResults[0].last_working_date;

                          // Update termination request status to "Terminated" - not "VC Approved"
                          const finalUpdateQuery = `
      UPDATE termination_requests
      SET status = 'Completed'
      WHERE termination_id = ?
    `;

                          db.query(finalUpdateQuery, [terminationId], (finalUpdateErr) => {
                            if (finalUpdateErr) {
                              console.error("Error updating final status:", finalUpdateErr);
                              return res.status(500).json({ message: "Database error" });
                            }

                            // Update the faculty's contract expiration date and status to "Terminated"
                            // not "Termination Pending"
                            const updateFacultyQuery = `
        UPDATE faculty
        SET contract_expiration_date = ?, status = 'Terminated'
        WHERE faculty_id = ?
      `;

                            db.query(updateFacultyQuery, [lastWorkingDate, facultyId], (updateFacultyErr) => {
                              if (updateFacultyErr) {
                                console.error("Error updating faculty record:", updateFacultyErr);
                                return res.status(500).json({ message: "Database error" });
                              }

                              return res.status(200).json({
                                message: "Termination approved and processed successfully",
                                status: "terminated",
                              });
                            });
                          });
                        });
                      } else {
                        // This is a safety check that shouldn't be reached in normal operation
                        // It would only happen if the role order logic has an issue
                        const finalUpdateQuery = `
      UPDATE termination_requests
      SET status = 'Pending Final Approval'
      WHERE termination_id = ?
    `;

                        db.query(finalUpdateQuery, [terminationId], (finalUpdateErr) => {
                          if (finalUpdateErr) {
                            console.error("Error updating final status:", finalUpdateErr);
                            return res.status(500).json({ message: "Database error" });
                          }

                          return res.status(200).json({
                            message: "Decision submitted successfully",
                            status: "completed",
                          });
                        });
                      }
                    }
                  }
                );
              }
            );
          }
        }
      );
    });
  }
);

// Process termination (vc only)
// Process termination (VC only)
app.post("/api/termination/:terminationId/process", verifyToken, (req, res) => {
  if (req.userRole !== "VC") {
    return res.status(403).json({ message: "Forbidden: Not a VC user" });
  }

  const terminationId = req.params.terminationId;

  // Update the termination request status to "Completed" (which is in the ENUM)
  const updateQuery = `
    UPDATE termination_requests
    SET status = 'Completed'
    WHERE termination_id = ?
  `;

  db.query(updateQuery, [terminationId], (err) => {
    if (err) {
      console.error("Error updating termination status:", err);
      return res.status(500).json({ message: "Database error" });
    }

    // Get the faculty ID associated with this termination
    const facultyQuery = `
      SELECT faculty_id, last_working_date
      FROM termination_requests
      WHERE termination_id = ?
    `;

    db.query(facultyQuery, [terminationId], (facultyErr, facultyResults) => {
      if (facultyErr || facultyResults.length === 0) {
        console.error("Error getting faculty ID:", facultyErr);
        return res.status(500).json({ message: "Database error" });
      }

      const facultyId = facultyResults[0].faculty_id;
      const lastWorkingDate = facultyResults[0].last_working_date;

      // Update the faculty's status to "Terminated" and set contract expiration date
      const updateFacultyQuery = `
        UPDATE faculty
        SET contract_expiration_date = ?, status = 'Terminated'
        WHERE faculty_id = ?
      `;

      db.query(
        updateFacultyQuery,
        [lastWorkingDate, facultyId],
        (updateFacultyErr) => {
          if (updateFacultyErr) {
            console.error("Error updating faculty record:", updateFacultyErr);
            return res.status(500).json({ message: "Database error" });
          }

          return res.status(200).json({
            message: "Termination processed successfully",
          });
        }
      );
    });
  });
});

// Get faculty profile (for faculty role)
app.get("/api/faculty/profile", verifyToken, (req, res) => {
  if (req.userRole !== "Faculty") {
    return res.status(403).json({ message: "Forbidden: Not a faculty user" });
  }

  // Query to get the faculty profile with status
  const query = `
    SELECT f.*, 
           DATEDIFF(f.contract_expiration_date, CURDATE()) as days_until_expiration
    FROM faculty f
    WHERE f.banner_id = ?
  `;

  db.query(query, [req.bannerId], (err, results) => {
    if (err) {
      console.error("Error fetching faculty profile:", err);
      return res.status(500).json({ message: "Database error" });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "Faculty profile not found" });
    }

    const profile = results[0];

    // Get renewal application if it exists
    const renewalQuery = `
      SELECT ra.*, 
             COALESCE(
               (SELECT action_date FROM approval_steps 
                WHERE application_id = ra.application_id 
                ORDER BY action_date DESC LIMIT 1), 
               ra.submission_date
             ) as last_update_date
      FROM renewal_applications ra
      JOIN faculty f ON ra.faculty_id = f.faculty_id
      WHERE f.banner_id = ?
      ORDER BY ra.submission_date DESC
      LIMIT 1
    `;

    db.query(renewalQuery, [req.bannerId], (renewalErr, renewalResults) => {
      if (renewalErr) {
        console.error("Error fetching renewal application:", renewalErr);
        return res.status(500).json({ message: "Database error" });
      }

      if (renewalResults.length > 0) {
        profile.renewal = renewalResults[0];
      }

      // Get termination request if it exists
      const terminationQuery = `
        SELECT tr.*
        FROM termination_requests tr
        JOIN faculty f ON tr.faculty_id = f.faculty_id
        WHERE f.banner_id = ?
        ORDER BY tr.submission_date DESC
        LIMIT 1
      `;

      db.query(terminationQuery, [req.bannerId], (terminationErr, terminationResults) => {
        if (terminationErr) {
          console.error("Error fetching termination request:", terminationErr);
          return res.status(500).json({ message: "Database error" });
        }

        if (terminationResults.length > 0) {
          profile.termination = terminationResults[0];
        }

        return res.status(200).json(profile);
      });
    });
  });
});
// Endpoint for faculty to download their contract information
app.get("/api/faculty/:facultyId/contract", verifyToken, async (req, res) => {
  // Check if user is authorized to access this faculty's contract
  if (req.userRole !== "Faculty") {
    return res.status(403).json({ message: "Access denied" });
  }

  const facultyId = req.params.facultyId;

  // Verify the requesting user is the same as the faculty member
  const [verifyResults] = await db.promise().query(
    `SELECT faculty_id FROM faculty 
       WHERE banner_id = ?`,
    [req.bannerId]
  );

  if (verifyResults.length === 0 || verifyResults[0].faculty_id != facultyId) {
    return res
      .status(403)
      .json({ message: "Unauthorized to access this contract" });
  }

  try {
    // Get faculty details including contract information
    const [facultyResults] = await db.promise().query(
      `SELECT f.*, 
                DATEDIFF(f.contract_expiration_date, CURDATE()) AS days_until_expiration
         FROM faculty f
         WHERE f.faculty_id = ?`,
      [facultyId]
    );

    if (facultyResults.length === 0) {
      return res.status(404).json({ message: "Faculty not found" });
    }

    // Get the most recent completed renewal application
    const [renewalResults] = await db.promise().query(
      `SELECT ra.*, 
                (SELECT action_date FROM approval_steps 
                 WHERE application_id = ra.application_id 
                 AND role_id = (SELECT role_id FROM roles WHERE role_name = 'HR')
                 AND status = 'Approved'
                 LIMIT 1) as approval_date
         FROM renewal_applications ra
         WHERE ra.faculty_id = ?
         AND ra.status = 'Completed'
         ORDER BY ra.submission_date DESC
         LIMIT 1`,
      [facultyId]
    );

    // Calculate the previous expiration date based on renewal years
    let previousExpirationDate = null;
    if (renewalResults.length > 0 && renewalResults[0].renewal_years) {
      const currentExpirationDate = new Date(
        facultyResults[0].contract_expiration_date
      );
      previousExpirationDate = new Date(currentExpirationDate);
      previousExpirationDate.setFullYear(
        previousExpirationDate.getFullYear() - renewalResults[0].renewal_years
      );
    }

    // Prepare contract data
    const contractData = {
      faculty: facultyResults[0],
      renewal: renewalResults.length > 0 ? renewalResults[0] : null,
      previous_expiration_date: previousExpirationDate,
      approval_date:
        renewalResults.length > 0 ? renewalResults[0].approval_date : null,
      renewal_years:
        renewalResults.length > 0 ? renewalResults[0].renewal_years : null,
    };

    res.status(200).json(contractData);
  } catch (error) {
    console.error("Error fetching contract data:", error);
    res.status(500).json({ message: "Error fetching contract data" });
  }
});
// Get faculty details for review
app.get("/api/faculty/:facultyId", verifyToken, (req, res) => {
  // Only allow certain roles to access faculty details
  if (!["Dean", "Department Chair", "Provost", "HR"].includes(req.userRole)) {
    return res.status(403).json({ message: "Access denied" });
  }

  const facultyId = req.params.facultyId;

  // First get the latest application
  const getLatestApplication = `
      SELECT ra.application_id 
      FROM renewal_applications ra
      WHERE ra.faculty_id = ?
      ORDER BY ra.submission_date DESC
      LIMIT 1`;

  db.query(getLatestApplication, [facultyId], (appErr, appResults) => {
    if (appErr) {
      console.error("Error fetching latest application:", appErr);
      return res.status(500).json({ message: "Database error" });
    }

    const latestApplicationId = appResults[0]?.application_id;

    // Query to get faculty details with latest renewal application
    const query = `
      SELECT f.*, 
             DATEDIFF(f.contract_expiration_date, CURDATE()) AS days_until_expiration,
             ra.application_id, ra.status AS application_status, 
             ra.renewal_years, ra.ai_summary, ra.submission_date,
             ra.teaching, ra.research, ra.service, ra.overall
      FROM faculty f
      LEFT JOIN renewal_applications ra ON ra.application_id = ?
      WHERE f.faculty_id = ?`;

    db.query(query, [latestApplicationId, facultyId], (err, results) => {
      if (err) {
        console.error("Faculty details query error:", err);
        return res.status(500).json({ message: "Database error" });
      }

      if (results.length === 0) {
        return res.status(404).json({ message: "Faculty not found" });
      }

      const faculty = results[0];

      // Get approval steps only for the latest application
      if (faculty.application_id) {
        const stepsQuery = `
            SELECT 
              ap.step_id,
              r.role_name,
              u.banner_id as reviewer_banner_id,
              CONCAT(f.first_name, ' ', f.last_name) as reviewer_name,
              ap.status,
              ap.years_granted,
              ap.comments,
              ap.action_date
            FROM approval_steps ap
            JOIN roles r ON ap.role_id = r.role_id
            JOIN users u ON ap.user_id = u.user_id
            LEFT JOIN faculty f ON u.banner_id = f.banner_id
            WHERE ap.application_id = ?
            ORDER BY ap.step_id`;

        db.query(
          stepsQuery,
          [faculty.application_id],
          (stepsErr, stepsResults) => {
            if (stepsErr) {
              console.error("Approval steps query error:", stepsErr);
              return res.status(500).json({ message: "Database error" });
            }

            faculty.approval_steps = stepsResults;

            // Get previous applications for history
            const historyQuery = `
              SELECT 
                ra.application_id,
                ra.submission_date,
                ra.status,
                ra.renewal_years,
                GROUP_CONCAT(
                  JSON_OBJECT(
                    'role', r.role_name,
                    'status', ap.status,
                    'years_granted', ap.years_granted,
                    'comments', ap.comments,
                    'action_date', ap.action_date
                  )
                ) as approval_history
              FROM renewal_applications ra
              LEFT JOIN approval_steps ap ON ra.application_id = ap.application_id
              LEFT JOIN roles r ON ap.role_id = r.role_id
              WHERE ra.faculty_id = ?
              AND ra.application_id != ?
              GROUP BY ra.application_id
              ORDER BY ra.submission_date DESC`;

            db.query(
              historyQuery,
              [facultyId, faculty.application_id],
              (historyErr, historyResults) => {
                if (historyErr) {
                  console.error("History query error:", historyErr);
                  return res.status(500).json({ message: "Database error" });
                }

                faculty.application_history = historyResults.map((app) => ({
                  ...app,
                  approval_history: app.approval_history
                    ? JSON.parse(`[${app.approval_history}]`)
                    : [],
                }));

                return res.status(200).json(faculty);
              }
            );
          }
        );
      } else {
        return res.status(200).json(faculty);
      }
    });
  });
});

// Process faculty decision (for Dean, Provost, HR)
app.post("/api/faculty/:facultyId/decision", verifyToken, (req, res) => {
  // Only allow certain roles to make decisions
  if (!["Dean", "Department Chair", "Provost", "HR"].includes(req.userRole)) {
    return res.status(403).json({ message: "Access denied" });
  }

  const facultyId = req.params.facultyId;
  const { applicationId, status, yearsGranted, comments } = req.body;

  if (!applicationId || !status || yearsGranted === undefined) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Get role ID for the current user
  const roleQuery = `SELECT role_id FROM roles WHERE role_name = ?`;

  db.query(roleQuery, [req.userRole], (roleErr, roleResults) => {
    if (roleErr || roleResults.length === 0) {
      console.error("Role query error:", roleErr);
      return res.status(500).json({ message: "Database error" });
    }

    const roleId = roleResults[0].role_id;

    // Begin transaction
    db.getConnection((connErr, connection) => {
      if (connErr) {
        console.error("Connection error:", connErr);
        return res.status(500).json({ message: "Database connection error" });
      }

      connection.beginTransaction(async (transErr) => {
        if (transErr) {
          connection.release();
          console.error("Transaction error:", transErr);
          return res.status(500).json({ message: "Transaction error" });
        }

        try {
          // 1. Insert approval step
          const insertStepQuery = `
            INSERT INTO approval_steps (application_id, role_id, user_id, status, years_granted, comments, action_date)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
          `;

          const approvalStatus = status === "approve" ? "Approved" : "Rejected";

          await connection
            .promise()
            .query(insertStepQuery, [
              applicationId,
              roleId,
              req.userId,
              approvalStatus,
              yearsGranted,
              comments,
            ]);

          // 2. Determine new application status based on role and decision
          let newAppStatus;
          switch (req.userRole) {
            case "Department Chair":
              newAppStatus =
                status === "approve"
                  ? "Department Chair Approved"
                  : "Department Chair Rejected";
              break;
            case "Dean":
              newAppStatus =
                status === "approve" ? "Dean Approved" : "Dean Rejected";
              break;
            case "Provost":
              newAppStatus =
                status === "approve" ? "Provost Approved" : "Provost Rejected";
              break;
            case "HR":
              newAppStatus = status === "approve" ? "Completed" : "HR Rejected";
              break;
          }

          // 3. Update application status
          const updateAppQuery = `
            UPDATE renewal_applications
            SET status = ?,
                renewal_years = CASE WHEN ? > 0 THEN ? ELSE renewal_years END
            WHERE application_id = ?
          `;

          await connection
            .promise()
            .query(updateAppQuery, [
              newAppStatus,
              yearsGranted,
              yearsGranted,
              applicationId,
            ]);

          // 4. If HR approved, update contract expiration date
          if (
            req.userRole === "HR" &&
            status === "approve" &&
            yearsGranted > 0
          ) {
            const updateContractQuery = `
              UPDATE faculty f
              JOIN renewal_applications ra ON f.faculty_id = ra.faculty_id
              SET f.contract_expiration_date = DATE_ADD(f.contract_expiration_date, INTERVAL ? YEAR)
              WHERE ra.application_id = ? AND f.faculty_id = ?
            `;

            await connection
              .promise()
              .query(updateContractQuery, [
                yearsGranted,
                applicationId,
                facultyId,
              ]);
          }

          // 5. Create notification for faculty member
          const notifyQuery = `
            INSERT INTO notifications (user_id, message)
            SELECT u.user_id, CONCAT('Your renewal application status has been updated to: ', ?) 
            FROM faculty f
            JOIN users u ON f.banner_id = u.banner_id
            WHERE f.faculty_id = ?
          `;

          await connection
            .promise()
            .query(notifyQuery, [newAppStatus, facultyId]);

          // Commit transaction
          connection.commit((commitErr) => {
            if (commitErr) {
              connection.rollback(() => connection.release());
              console.error("Commit error:", commitErr);
              return res.status(500).json({ message: "Commit error" });
            }

            connection.release();
            return res.status(200).json({
              message: "Decision processed successfully",
              newStatus: newAppStatus,
            });
          });
        } catch (error) {
          connection.rollback(() => connection.release());
          console.error("Error in transaction:", error);
          return res
            .status(500)
            .json({ message: "Transaction processing error" });
        }
      });
    });
  });
});

// Get provost's review list

app.get("/api/provost/faculty", verifyToken, (req, res) => {
  // Only allow provost to access this endpoint
  if (req.userRole !== "Provost") {
    return res.status(403).json({ message: "Access denied" });
  }
  // Query to get provost's review list with only latest applications
  const query = `
      WITH LatestApplications AS (
        SELECT
          ra.faculty_id,
          ra.application_id,
          ra.status,
          ra.submission_date,
          ROW_NUMBER() OVER (PARTITION BY ra.faculty_id ORDER BY ra.submission_date DESC) as rn
        FROM renewal_applications ra
      )
      SELECT
        f.faculty_id,
        f.banner_id,
        f.first_name,
        f.last_name,
        f.job_title,
        f.college_department,
        DATEDIFF(f.contract_expiration_date, CURDATE()) as days_until_expiration,
        la.application_id,
        la.status as application_status,
        CASE
          WHEN la.status = 'Dean Approved' THEN 'Needs Review'
          ELSE NULL
        END as review_status
      FROM faculty f
      LEFT JOIN LatestApplications la ON f.faculty_id = la.faculty_id AND la.rn = 1
      WHERE la.status = 'Dean Approved'
          OR la.status = 'Provost Approved'
          OR la.status = 'Provost Rejected'
      ORDER BY
        CASE
          WHEN la.status = 'Dean Approved' THEN 0
          WHEN la.status = 'Provost Approved' THEN 1
          WHEN la.status = 'Provost Rejected' THEN 2
          ELSE 3
        END,
        days_until_expiration ASC`;

  db.query(query, (err, results) => {
    if (err) {
      console.error("Provost list query error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    return res.status(200).json(results);
  });
});

// Get HR's review list
app.get("/api/hr/faculty", verifyToken, (req, res) => {
  // Only allow HR to access this endpoint
  if (req.userRole !== "HR") {
    return res.status(403).json({ message: "Access denied" });
  }

  // Query to get HR's review list with only latest applications
  const query = `
      WITH LatestApplications AS (
        SELECT 
          faculty_id,
          MAX(submission_date) as latest_submission
        FROM renewal_applications
        GROUP BY faculty_id
      )
      SELECT DISTINCT
        f.faculty_id, 
        f.banner_id, 
        f.first_name, 
        f.last_name, 
        f.job_title,
        f.college_department,
        DATEDIFF(f.contract_expiration_date, CURDATE()) as days_until_expiration,
        ra.application_id,
        ra.status as application_status,
        CASE 
          WHEN ra.status = 'Provost Approved' THEN 'Needs Review'
          ELSE ra.status
        END AS review_status
      FROM faculty f
      JOIN LatestApplications la ON f.faculty_id = la.faculty_id
      JOIN renewal_applications ra 
        ON f.faculty_id = ra.faculty_id 
        AND ra.submission_date = la.latest_submission
      WHERE ra.status IN ('Provost Approved', 'HR Approved', 'HR Rejected')
      ORDER BY 
        CASE 
          WHEN ra.status = 'Provost Approved' THEN 0
          WHEN ra.status = 'HR Approved' THEN 1
          ELSE 2
        END,
        days_until_expiration ASC`;

  db.query(query, (err, results) => {
    if (err) {
      console.error("HR list query error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    return res.status(200).json(results);
  });
});

// Get dean's review list
app.get("/api/dean/faculty", verifyToken, (req, res) => {
  if (req.userRole !== "Dean") {
    return res.status(403).json({ message: "Access denied" });
  }

  const query = `
      SELECT 
        f.faculty_id,
        f.banner_id,
        f.first_name,
        f.last_name,
        f.job_title,
        f.college_department,
        f.contract_expiration_date,
        DATEDIFF(f.contract_expiration_date, CURDATE()) as days_until_expiration,
        ra.application_id,
        ra.status as application_status,
        CASE 
          WHEN ra.status IS NULL THEN 4
          WHEN ra.status = 'Department Chair Approved' THEN 0
          WHEN ra.status = 'Dean Approved' THEN 1
          WHEN ra.status = 'Provost Approved' THEN 2
          WHEN ra.status = 'HR Approved' THEN 3
          WHEN ra.status = 'Completed' THEN 5
          ELSE 4
        END as status_priority
      FROM faculty f
      LEFT JOIN (
        SELECT ra1.*
        FROM renewal_applications ra1
        INNER JOIN (
          SELECT faculty_id, MAX(submission_date) as latest_date
          FROM renewal_applications
          GROUP BY faculty_id
        ) ra2 ON ra1.faculty_id = ra2.faculty_id 
        AND ra1.submission_date = ra2.latest_date
      ) ra ON f.faculty_id = ra.faculty_id
        WHERE f.status = 'Active'
      ORDER BY 
        status_priority ASC,
        days_until_expiration ASC
        `


    ;

  db.query(query, (err, results) => {
    if (err) {
      console.error("Dean list query error:", err);
      return res.status(500).json({ message: "Database error" });
    }
    return res.status(200).json(results);
  });
});

// Dean initiates renewal process endpoint
app.post(
  "/api/dean/initiate-renewal/:facultyId",
  verifyToken,
  async (req, res) => {
    if (req.userRole !== "Dean") {
      return res.status(403).json({ message: "Access denied" });
    }

    const facultyId = req.params.facultyId;

    try {
      // Check if faculty exists
      const [facultyResults] = await db
        .promise()
        .query("SELECT * FROM faculty WHERE faculty_id = ?", [facultyId]);

      if (facultyResults.length === 0) {
        return res.status(404).json({ message: "Faculty not found" });
      }

      // Check for existing active application
      const [activeResults] = await db.promise().query(
        `SELECT application_id 
         FROM renewal_applications 
         WHERE faculty_id = ? 
         AND status NOT IN ('Completed', 'Department Chair Rejected', 'Dean Rejected', 'Provost Rejected', 'HR Rejected')
         ORDER BY submission_date DESC 
         LIMIT 1`,
        [facultyId]
      );

      if (activeResults.length > 0) {
        return res
          .status(400)
          .json({ message: "Active renewal application already exists" });
      }

      // Begin transaction
      const connection = await db.promise().getConnection();
      await connection.beginTransaction();

      try {
        // Create new renewal application
        const [result] = await connection.query(
          'INSERT INTO renewal_applications (faculty_id, status) VALUES (?, "Submitted")',
          [facultyId]
        );

        const applicationId = result.insertId;

        // Get faculty user_id
        const [userResult] = await connection.query(
          `SELECT u.user_id 
           FROM users u 
           JOIN faculty f ON u.banner_id = f.banner_id 
           WHERE f.faculty_id = ?`,
          [facultyId]
        );

        if (userResult.length === 0) {
          throw new Error("Faculty user not found");
        }

        const facultyUserId = userResult[0].user_id;

        // Create notification for faculty
        await connection.query(
          `INSERT INTO notifications (user_id, message) 
           VALUES (?, 'A new contract renewal application has been initiated by the Dean')`,
          [facultyUserId]
        );

        // Commit transaction
        await connection.commit();
        connection.release();

        res.status(201).json({
          message: "Renewal application initiated successfully",
          applicationId: applicationId,
        });
      } catch (error) {
        await connection.rollback();
        connection.release();
        throw error;
      }
    } catch (error) {
      console.error("Error initiating renewal:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

// Endpoint to generate and download a renewal contract PDF
app.get(
  "/api/faculty/contract/:applicationId",
  verifyToken,
  async (req, res) => {
    // Only allow faculty to download their own contracts
    if (req.userRole !== "Faculty") {
      return res.status(403).json({ message: "Access denied" });
    }

    const applicationId = req.params.applicationId;

    try {
      // Get faculty information and application details
      const [facultyResults] = await db.promise().query(
        `SELECT f.*, ra.renewal_years, ra.status
         FROM faculty f
         JOIN renewal_applications ra ON f.faculty_id = ra.faculty_id
         WHERE ra.application_id = ? AND ra.status = 'Completed'`,
        [applicationId]
      );

      if (facultyResults.length === 0) {
        return res
          .status(404)
          .json({ message: "Completed renewal application not found" });
      }

      // Verify the faculty is requesting their own contract
      const faculty = facultyResults[0];
      if (faculty.banner_id !== req.bannerId) {
        return res
          .status(403)
          .json({ message: "You can only access your own contracts" });
      }

      // Get the approval steps information
      const [stepsResults] = await db.promise().query(
        `SELECT 
           ap.step_id,
           r.role_name,
           ap.status,
           ap.years_granted,
           ap.action_date
         FROM approval_steps ap
         JOIN roles r ON ap.role_id = r.role_id
         WHERE ap.application_id = ? AND ap.status = 'Approved'
         ORDER BY ap.action_date`,
        [applicationId]
      );

      // Create a PDF document
      const doc = new PDFDocument({
        margins: { top: 50, bottom: 50, left: 72, right: 72 },
        size: "A4",
      });

      // Set the content type and headers for PDF download
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=renewal_contract_${faculty.banner_id}.pdf`
      );

      // Pipe the PDF directly to the response
      doc.pipe(res);

      // Add university logo if available (optional)
      // const logoPath = path.join(__dirname, 'public/images/university_logo.png');
      // if (fs.existsSync(logoPath)) {
      //   doc.image(logoPath, {
      //     fit: [200, 100],
      //     align: 'center'
      //   });
      // }

      // Add document title
      doc
        .fontSize(18)
        .font("Helvetica-Bold")
        .text("FACULTY CONTRACT RENEWAL", { align: "center" })
        .moveDown(0.5);

      // Add document subtitle
      doc
        .fontSize(14)
        .font("Helvetica")
        .text("OFFICIAL RENEWAL CONFIRMATION", { align: "center" })
        .moveDown(2);

      // Add faculty information
      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .text("FACULTY INFORMATION")
        .moveDown(0.5);

      doc
        .font("Helvetica")
        .text(`Name: ${faculty.first_name} ${faculty.last_name}`)
        .text(`Banner ID: ${faculty.banner_id}`)
        .text(`Position: ${faculty.job_title}`)
        .text(`Department: ${faculty.college_department}`)
        .text(`Employee Class: ${faculty.employee_class}`)
        .moveDown(1);

      // Add renewal details
      doc.font("Helvetica-Bold").text("RENEWAL DETAILS").moveDown(0.5);

      // Calculate new contract dates
      const originalDate = new Date(faculty.contract_expiration_date);
      const newExpirationDate = new Date(originalDate);

      // Add renewal years to the date
      newExpirationDate.setFullYear(
        newExpirationDate.getFullYear() + faculty.renewal_years
      );

      // Format dates
      const formatDate = (date) => {
        return date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      };

      doc
        .font("Helvetica")
        .text(
          `Contract Renewed For: ${faculty.renewal_years} year${faculty.renewal_years !== 1 ? "s" : ""
          }`
        )
        .text(`Original Expiration Date: ${formatDate(originalDate)}`)
        .text(`New Expiration Date: ${formatDate(newExpirationDate)}`)
        .moveDown(1);

      // Add approval information
      doc.font("Helvetica-Bold").text("APPROVAL INFORMATION").moveDown(0.5);

      doc.font("Helvetica");
      stepsResults.forEach((step) => {
        doc.text(
          `${step.role_name} Approval Date: ${formatDate(
            new Date(step.action_date)
          )}`
        );
      });
      doc.moveDown(1);

      // Add terms and conditions
      doc.font("Helvetica-Bold").text("TERMS AND CONDITIONS").moveDown(0.5);

      doc
        .font("Helvetica")
        .text(
          "This document confirms the renewal of your faculty appointment under the terms and conditions of your original appointment, subject to the university policies and procedures. The renewal period is specified above and may be subject to additional review as per the universitys standard review processes.",
          { align: "justify" }
        )
        .moveDown(1);

      // Add signature section
      doc.font("Helvetica-Bold").text("SIGNATURES").moveDown(0.5);

      // Faculty signature line
      doc.font("Helvetica").text("Faculty Member:").moveDown(0.7);
      doc.lineWidth(1).moveTo(72, doc.y).lineTo(250, doc.y).stroke();
      doc.moveDown(0.3).text("Date:").moveDown(0.7);
      doc.lineWidth(1).moveTo(72, doc.y).lineTo(250, doc.y).stroke();
      doc.moveDown(1);

      // HR Director signature line
      doc.font("Helvetica").text("HR Director:").moveDown(0.7);
      doc.lineWidth(1).moveTo(72, doc.y).lineTo(250, doc.y).stroke();
      doc.moveDown(0.3).text("Date:").moveDown(0.7);
      doc.lineWidth(1).moveTo(72, doc.y).lineTo(250, doc.y).stroke();
      doc.moveDown(1);

      // Add footer with document generation information
      doc
        .fontSize(8)
        .text(`Document generated on ${formatDate(new Date())}`, {
          align: "center",
        })
        .text(
          "This is an official document of the university faculty renewal system.",
          { align: "center" }
        );

      // Finalize the PDF and end the response
      doc.end();
    } catch (error) {
      console.error("Error generating contract PDF:", error);
      res.status(500).json({ message: "Error generating contract" });
    }
  }
);

app.use("*", (req, res) => {
  console.log(`Unhandled route: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ message: "Route not found" });
});
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
