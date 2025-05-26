const axios = require("axios");
require("dotenv").config();

// Ollama API configuration - Force IPv4 address
const OLLAMA_API_URL = "http://127.0.0.1:11434"; // Use IPv4 explicitly
const OLLAMA_MODEL = "llama3:8b";

/**
 * Test the connection to Ollama with IPv4
 */
async function testOllamaConnection() {
  console.log(`Testing connection to Ollama at ${OLLAMA_API_URL} (IPv4)`);
  console.log(`Using model: ${OLLAMA_MODEL}`);

  try {
    console.log("Sending test prompt to Ollama...");

    const response = await axios({
      method: "post",
      url: `${OLLAMA_API_URL}/api/generate`,
      data: {
        model: OLLAMA_MODEL,
        prompt: "Hello, world!",
        stream: false,
      },
      timeout: 30000, // 30 second timeout
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("\n--- Ollama Response ---");
    console.log(response.data.response);
    console.log("--- End of Response ---\n");

    console.log("✅ Ollama connection test successful!");
    return true;
  } catch (error) {
    console.error("❌ Failed to connect to Ollama:");

    if (error.response) {
      console.error("Response data:", error.response.data);
      console.error("Status code:", error.response.status);
    } else if (error.request) {
      console.error("No response received. Is Ollama running?");
    } else {
      console.error("Error:", error.message);
    }

    return false;
  }
}

// Run the test
testOllamaConnection()
  .then((success) => process.exit(success ? 0 : 1))
  .catch((err) => {
    console.error("Unexpected error:", err);
    process.exit(1);
  });
