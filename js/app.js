
const urlInput = document.getElementById("apiUrl");
const sendBtn = document.getElementById("sendBtn");
const clearBtn = document.getElementById("clearBtn");
const copyBtn = document.getElementById("copyBtn");

const statusOutput = document.getElementById("status");
const timeOutput = document.getElementById("time");
const sizeOutput = document.getElementById("size");
const responseOutput = document.getElementById("response");
const messageOutput = document.getElementById("message");

const errorType = document.getElementById("errorType");
const errorDescription = document.getElementById("errorDescription");
const errorSolution = document.getElementById("errorSolution");

let latestResponse = "";

// Send API Request
async function sendRequest() {
  const apiUrl = urlInput.value.trim();

  if (!apiUrl) {
    showError("Please enter an API URL.");
    return;
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(apiUrl);

    if (
      !["http:", "https:"].includes(parsedUrl.protocol) ||
      parsedUrl.username ||
      parsedUrl.password
    ) {
      throw new Error("Invalid URL");
    }
  } catch {
    showError("Please enter a valid HTTP or HTTPS URL.");
    return;
  }

  sendBtn.disabled = true;
  sendBtn.textContent = "Loading...";

  statusOutput.textContent = "Loading";
  timeOutput.textContent = "--";
  sizeOutput.textContent = "--";
  responseOutput.textContent = "Waiting for server response...";
  messageOutput.textContent = "Sending GET request...";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  const startTime = performance.now();

  try {
    const response = await fetch(parsedUrl.href, {
      method: "GET",
      headers: {
        "Accept": "application/json"
      },
      signal: controller.signal
    });

    const responseText = await response.text();

    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);

    latestResponse = responseText;

    let displayData;

    try {
      displayData = JSON.stringify(
        JSON.parse(responseText),
        null,
        2
      );
    } catch {
      displayData = responseText || "(Empty response)";
    }

    responseOutput.textContent = displayData;

    statusOutput.textContent =
      response.status + " " + response.statusText;
    diagnoseStatus(response.status);

    timeOutput.textContent = responseTime + " ms";

    const size = new Blob([responseText]).size;

    sizeOutput.textContent =
      size < 1024
        ? size + " B"
        : (size / 1024).toFixed(2) + " KB";

    if (response.ok) {
      messageOutput.textContent =
        "Success! API response received.";
    } else {
      messageOutput.textContent =
  response.ok
    ? "API request completed successfully."
    : "API returned HTTP " + response.status +
      " - " + response.statusText;
    }

  } catch (error) {
    latestResponse = "";

    if (error.name === "AbortError") {
      showError("Request timed out after 20 seconds.");
    } else if (error instanceof TypeError) {
      showError(
        "Network or CORS error. Check the URL, server and browser permissions."
      );
    } else {
      showError(error.message);
    }

    timeOutput.textContent =
      Math.round(performance.now() - startTime) + " ms";

  } finally {
    clearTimeout(timeout);
    sendBtn.disabled = false;
    sendBtn.textContent = "Send";
  }
}

function diagnoseStatus(status) {
  const diagnostics = {
    200: ["Success", "Request completed successfully.", "No action required."],
    201: ["Created", "Resource created successfully.", "No action required."],
    400: ["Bad Request", "Server rejected the request.", "Check request parameters."],
    401: ["Authentication Error", "Authentication is required.", "Check API credentials."],
    403: ["Permission Error", "Access is forbidden.", "Check access permissions."],
    404: ["Not Found", "Requested API resource was not found.", "Check the API URL."],
    429: ["Rate Limit", "Too many requests.", "Wait before sending another request."],
    500: ["Server Error", "Internal server error.", "Check the server."],
    502: ["Gateway Error", "Invalid response from upstream server.", "Try again later."],
    503: ["Service Unavailable", "Server is temporarily unavailable.", "Try again later."],
    504: ["Gateway Timeout", "Server took too long to respond.", "Check server availability."]
  };

  const result = diagnostics[status];

  if (result) {
    errorType.textContent = result[0];
    errorDescription.textContent = result[1];
    errorSolution.textContent = result[2];
  } else {
    errorType.textContent = "HTTP " + status;
    errorDescription.textContent = "Server returned an HTTP response.";
    errorSolution.textContent = "Inspect the response details.";
  }
}


// Show Error

function showError(message) {
  statusOutput.textContent = "Error";
  sizeOutput.textContent = "--";
  responseOutput.textContent = message;
  messageOutput.textContent = message;

  if (message.includes("valid HTTP")) {
    errorType.textContent = "Invalid URL";
    errorDescription.textContent = message;
    errorSolution.textContent = "Enter a valid HTTP or HTTPS URL.";
  } else if (message.includes("timed out")) {
    errorType.textContent = "Timeout";
    errorDescription.textContent = message;
    errorSolution.textContent = "Check Internet and server response.";
  } else {
    errorType.textContent = "Network / CORS Error";
    errorDescription.textContent = message;
    errorSolution.textContent =
      "Check Internet, API URL and server CORS settings.";
  }
}


// Clear Results
function clearResults() {
  urlInput.value = "";
  statusOutput.textContent = "--";
  timeOutput.textContent = "--";
  sizeOutput.textContent = "--";
  responseOutput.textContent =
    "Your API response will appear here.";
  messageOutput.textContent = "Ready to test your API.";
  latestResponse = "";
}

// Copy Response
async function copyResponse() {
  if (!latestResponse) {
    messageOutput.textContent = "No response to copy.";
    return;
  }

  try {
    await navigator.clipboard.writeText(latestResponse);
    messageOutput.textContent = "Response copied successfully.";
  } catch {
    messageOutput.textContent =
      "Copy unavailable. Try a secure browser context.";
  }
}

// Button Events
sendBtn.addEventListener("click", sendRequest);
clearBtn.addEventListener("click", clearResults);
copyBtn.addEventListener("click", copyResponse);

// Enter Key
urlInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    sendRequest();
  }
});
