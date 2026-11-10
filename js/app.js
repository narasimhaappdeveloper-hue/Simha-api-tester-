
// =====================================
// SIMHA API TESTER
// Complete JavaScript Application
// =====================================

// HTML Elements
const apiUrl = document.getElementById("apiUrl");
const methodSelect = document.getElementById("methodSelect");
const bodyInput = document.getElementById("bodyInput");

const sendBtn = document.getElementById("sendBtn");
const clearBtn = document.getElementById("clearBtn");
const copyBtn = document.getElementById("copyBtn");

const statusOutput = document.getElementById("status");
const timeOutput = document.getElementById("time");
const sizeOutput = document.getElementById("size");
const responseOutput = document.getElementById("response");
const messageOutput = document.getElementById("message");

// Diagnostic Center
const errorType = document.getElementById("errorType");
const errorDescription = document.getElementById("errorDescription");
const errorSolution = document.getElementById("errorSolution");

// Request timeout
const REQUEST_TIMEOUT = 20000;


// =====================================
// SEND API REQUEST
// =====================================

async function sendRequest() {

  const urlValue = apiUrl.value.trim();
  const method = methodSelect.value;

  // Check empty URL
  if (!urlValue) {
    showError("Please enter an API URL.");
    return;
  }

  // Validate URL
  let parsedUrl;

  try {
    parsedUrl = new URL(urlValue);

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("Invalid protocol");
    }

  } catch (error) {
    showError("Invalid URL. Please enter a valid HTTP or HTTPS URL.");
    return;
  }

  // Prepare request body
  let parsedBody;

  if (method === "POST" || method === "PUT") {

    try {
      parsedBody = JSON.parse(bodyInput.value);
    } catch (error) {
      showError("Invalid JSON. Please check your Request Body.");
      return;
    }

  }

  // Disable Send button
  sendBtn.disabled = true;
  sendBtn.textContent = "Sending...";

  messageOutput.textContent = "Sending API request...";

  responseOutput.textContent = "Loading response...";

  const startTime = performance.now();

  let timeoutReached = false;
  let timeoutId;

  const controller = new AbortController();

  // Timeout controller
  timeoutId = setTimeout(() => {
    timeoutReached = true;
    controller.abort();
  }, REQUEST_TIMEOUT);

  // Request options
  const options = {
    method: method,
    headers: {
      "Accept": "application/json"
    },
    signal: controller.signal
  };

  // Add JSON body for POST and PUT
  if (method === "POST" || method === "PUT") {

    options.headers["Content-Type"] = "application/json";

    options.body = JSON.stringify(parsedBody);

  }

  try {

    // Send request
    const response = await fetch(parsedUrl.href, options);

    const endTime = performance.now();

    const responseTime = Math.round(endTime - startTime);

    // Read response
    const responseText = await response.text();

    // Format JSON response
    let formattedResponse;

    try {

      const jsonData = JSON.parse(responseText);

      formattedResponse = JSON.stringify(jsonData, null, 2);

    } catch (error) {

      formattedResponse = responseText || "Empty response";

    }

    // Calculate response size
    const responseSize = new Blob([responseText]).size;

    // Display response
    responseOutput.textContent = formattedResponse;

    // Display statistics
    statusOutput.textContent =
      response.status + " " + response.statusText;

    timeOutput.textContent = responseTime + " ms";

    sizeOutput.textContent = formatSize(responseSize);

    // HTTP status diagnosis
    diagnoseStatus(response.status);

    // Success or HTTP error message
    if (response.ok) {

      messageOutput.textContent =
        "API request completed successfully.";

    } else {

      messageOutput.textContent =
        "API returned HTTP " +
        response.status +
        " - " +
        response.statusText;

    }

  } catch (error) {

    // Network and timeout errors
    if (timeoutReached) {

      showError("Request timeout. Server took too long to respond.");

    } else {

      showError(
        "Network error or CORS issue. Please check the URL and internet connection."
      );

    }

  } finally {

    clearTimeout(timeoutId);

    sendBtn.disabled = false;
    sendBtn.textContent = "Send";

  }

}


// =====================================
// DIAGNOSTIC CENTER
// =====================================

function diagnoseStatus(status) {

  // All successful 2xx responses
  if (status >= 200 && status < 300) {

    errorType.textContent = "Success";

    errorDescription.textContent =
      "Request completed successfully.";

    errorSolution.textContent =
      "No action required.";

    return;

  }

  const diagnostics = {

    400: {
      type: "Bad Request",
      description: "The server cannot understand the request.",
      solution: "Check your URL and JSON request body."
    },

    401: {
      type: "Unauthorized",
      description: "Authentication is required.",
      solution: "Check your API key or login credentials."
    },

    403: {
      type: "Forbidden",
      description: "You do not have permission.",
      solution: "Check your API access permissions."
    },

    404: {
      type: "Not Found",
      description: "The requested API endpoint was not found.",
      solution: "Check the API URL and endpoint."
    },

    405: {
      type: "Method Not Allowed",
      description: "This HTTP method is not supported.",
      solution: "Choose a method supported by the API."
    },

    408: {
      type: "Request Timeout",
      description: "The server timed out waiting for the request.",
      solution: "Try sending the request again."
    },

    429: {
      type: "Too Many Requests",
      description: "API request limit exceeded.",
      solution: "Wait before sending another request."
    },

    500: {
      type: "Internal Server Error",
      description: "Something went wrong on the server.",
      solution: "Try again later or contact the API provider."
    },

    502: {
      type: "Bad Gateway",
      description: "The server received an invalid response.",
      solution: "Try again later."
    },

    503: {
      type: "Service Unavailable",
      description: "The API server is temporarily unavailable.",
      solution: "Try again after some time."
    },

    504: {
      type: "Gateway Timeout",
      description: "The server did not receive a timely response.",
      solution: "Try again later."
    }

  };

  const result = diagnostics[status];

  if (result) {

    errorType.textContent = result.type;

    errorDescription.textContent = result.description;

    errorSolution.textContent = result.solution;

  } else {

    errorType.textContent = "HTTP Error: " + status;

    errorDescription.textContent =
      "The API returned an unsuccessful HTTP status.";

    errorSolution.textContent =
      "Check the API documentation and response.";

  }

}


// =====================================
// ERROR HANDLING
// =====================================

function showError(errorMessage) {

  responseOutput.textContent = errorMessage;

  messageOutput.textContent = errorMessage;

  statusOutput.textContent = "Error";

  timeOutput.textContent = "-";

  sizeOutput.textContent = "-";

  errorType.textContent = "Request Error";

  errorDescription.textContent = errorMessage;

  errorSolution.textContent =
    "Check your API URL, request data and internet connection.";

}


// =====================================
// FORMAT RESPONSE SIZE
// =====================================

function formatSize(bytes) {

  if (bytes < 1024) {

    return bytes + " B";

  }

  if (bytes < 1024 * 1024) {

    return (bytes / 1024).toFixed(2) + " KB";

  }

  return (bytes / (1024 * 1024)).toFixed(2) + " MB";

}


// =====================================
// CLEAR RESULTS
// =====================================

function clearResults() {

  apiUrl.value = "";

  bodyInput.value = "";

  responseOutput.textContent = "";

  statusOutput.textContent = "-";

  timeOutput.textContent = "-";

  sizeOutput.textContent = "-";

  messageOutput.textContent = "";

  errorType.textContent = "-";

  errorDescription.textContent = "";

  errorSolution.textContent = "";

  methodSelect.value = "GET";

}


// =====================================
// COPY RESPONSE
// =====================================

async function copyResponse() {

  const text = responseOutput.textContent;

  if (!text) {

    messageOutput.textContent = "No response to copy.";

    return;

  }

  try {

    await navigator.clipboard.writeText(text);

    messageOutput.textContent = "Response copied successfully.";

  } catch (error) {

    messageOutput.textContent =
      "Unable to copy. Please select and copy manually.";

  }

}


// =====================================
// BUTTON EVENTS
// =====================================

sendBtn.addEventListener("click", sendRequest);

clearBtn.addEventListener("click", clearResults);

copyBtn.addEventListener("click", copyResponse);


// Press Enter to send request
apiUrl.addEventListener("keydown", function(event) {

  if (event.key === "Enter") {

    sendRequest();

  }

});


// =====================================
// SIMHA API TESTER READY
// =====================================

console.log("SIMHA API Tester is ready!");
