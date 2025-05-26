// scripts/uploadDocument.js
const fs = require("fs-extra");
const path = require("path");
const mysql = require("mysql2/promise");
const { processPDF } = require("../utils/pdfProcessor");
require("dotenv").config();

async function uploadDocument(sourceFilePath, facultyId, applicationId) {
  // Create database connection
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "faculty_renewal_portal",
    port: 3306,
  });

  try {
    // 1. Make sure the destination directory exists
    const uploadsDir = path.join(__dirname, "../uploads/evaluation_documents");
    await fs.ensureDir(uploadsDir);

    // 2. Generate a unique filename
    const filename = `faculty_${facultyId}_application_${applicationId}_${Date.now()}.pdf`;
    const destinationPath = path.join(uploadsDir, filename);

    // 3. Copy the file
    await fs.copy(sourceFilePath, destinationPath);

    // 4. Store the relative path in the database
    const relativePath = path.relative(
      path.join(__dirname, ".."),
      destinationPath
    );

    // 5. Insert into documents table
    await connection.execute(
      "INSERT INTO documents (application_id, document_type, file_path) VALUES (?, ?, ?)",
      [applicationId, "Evaluation Report", relativePath]
    );

    console.log("Document uploaded successfully");

    // 6. Process the document and update the ai_summary
    console.log("Processing document...");
    const summary = await processPDF(destinationPath);

    // 7. Update the renewal_applications table
    await connection.execute(
      "UPDATE renewal_applications SET ai_summary = ? WHERE application_id = ?",
      [summary, applicationId]
    );

    console.log("Document processed and summary generated");
    console.log("Summary:", summary);
  } catch (error) {
    console.error("Error uploading document:", error);
  } finally {
    await connection.end();
  }
}

// Example usage (you can call this function from another script):
// uploadDocument('/path/to/your/document.pdf', 123, 456);

// Command line usage
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length !== 3) {
    console.log(
      "Usage: node uploadDocument.js <pdfPath> <facultyId> <applicationId>"
    );
    process.exit(1);
  }

  const [pdfPath, facultyId, applicationId] = args;
  uploadDocument(pdfPath, facultyId, applicationId)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { uploadDocument };
