
/* =================================
   SIMHA API TESTER
   COMPLETE JAVASCRIPT
================================= */

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

const errorType = document.getElementById("errorType");
const errorDescription = document.getElementById("errorDescription");
const errorSolution = document.getElementById("errorSolution");

const REQUEST_TIMEOUT = 20000;


/* SEND REQUEST */

async function sendRequest() {

  const urlValue = apiUrl.value.trim();
  const method = methodSelect.value;

  if (!urlValue) {
    showError("Please enter an API URL.");
    return;
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(urlValue);

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("Invalid URL protocol");
    }

  } catch (error) {
    showError("Invalid URL. Enter a valid HTTP or HTTPS URL.");
    return;
  }

  let parsedBody;

  if (method === "POST" || method === "PUT") {
    try {
      parsedBody = JSON.parse(bodyInput.value);
    } catch (error) {
      showError("Invalid JSON. Please check Request Body.");
      return;
    }
  }

  sendBtn.disabled = true;
  sendBtn.textContent = "Sending...";

  messageOutput.textContent = "Sending API request...";
  responseOutput.textContent = "Loading response...";

  statusOutput.textContent = "-";
  timeOutput.textContent = "-";
  sizeOutput.textContent = "-";

  const controller = new AbortController();
  const startTime = performance.now();

  let timeoutReached = false;

  const timeoutId = setTimeout(() => {
    timeoutReached = true;
    controller.abort();
  }, REQUEST_TIMEOUT);

  const options = {
    method: method,
    headers: {
      "Accept": "application/json"
    },
    signal: controller.signal
  };

  if (method === "POST" || method === "PUT") {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(parsedBody);
  }

  try {

    const response = await fetch(parsedUrl.href, options);

    const responseText = await response.text();
    const responseTime = Math.round(performance.now() - startTime);

    let formattedResponse;

    try {
      formattedResponse = JSON.stringify(
        JSON.parse(responseText),
        null,
        2
      );
    } catch (error) {
      formattedResponse = responseText || "Empty response";
    }

    const responseSize = new Blob([responseText]).size;

    responseOutput.textContent = formattedResponse;

    statusOutput.textContent =
      response.status + " " + response.statusText;

    timeOutput.textContent = responseTime + " ms";
    sizeOutput.textContent = formatSize(responseSize);

    diagnoseStatus(response.status);

    if (response.ok) {
      messageOutput.textContent =
        method + " request completed successfully.";
    } else {
      messageOutput.textContent =
        "HTTP Error: " + response.status +
        " - " + response.statusText;
    }

  } catch (error) {

    if (timeoutReached) {
      showError("Request timeout. Server took too long to respond.");
    } else {
      showError(
        "Network error or CORS issue. Check URL and internet connection."
      );
    }

  } finally {

    clearTimeout(timeoutId);

    sendBtn.disabled = false;
    sendBtn.textContent = "Send";

  }
}


/* DIAGNOSTIC CENTER */

function diagnoseStatus(status) {

  if (status >= 200 && status < 300) {

    errorType.textContent = "Success";
    errorDescription.textContent =
      "Request completed successfully.";
    errorSolution.textContent = "No action required.";

    return;
  }

  const diagnostics = {

    400: {
      type: "Bad Request",
      description: "The server cannot understand the request.",
      solution: "Check URL and JSON body."
    },

    401: {
      type: "Unauthorized",
      description: "Authentication is required.",
      solution: "Check your API key or credentials."
    },

    403: {
      type: "Forbidden",
      description: "You do not have permission.",
      solution: "Check API access permissions."
    },

    404: {
      type: "Not Found",
      description: "API endpoint was not found.",
      solution: "Check the API URL."
    },

    405: {
      type: "Method Not Allowed",
      description: "HTTP method is not supported.",
      solution: "Choose a supported HTTP method."
    },

    408: {
      type: "Request Timeout",
      description: "The server timed out.",
      solution: "Try again."
    },

    429: {
      type: "Too Many Requests",
      description: "API request limit exceeded.",
      solution: "Wait before trying again."
    },

    500: {
      type: "Internal Server Error",
      description: "Something went wrong on the server.",
      solution: "Try again later."
    },

    502: {
      type: "Bad Gateway",
      description: "Invalid response from upstream server.",
      solution: "Try again later."
    },

    503: {
      type: "Service Unavailable",
      description: "Server is temporarily unavailable.",
      solution: "Try again later."
    },

    504: {
      type: "Gateway Timeout",
      description: "Server did not respond in time.",
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
      "The API returned an unsuccessful response.";
    errorSolution.textContent =
      "Check the API documentation.";

  }
}


/* ERROR HANDLING */

function showError(errorMessage) {

  responseOutput.textContent = errorMessage;
  messageOutput.textContent = errorMessage;

  statusOutput.textContent = "Error";
  timeOutput.textContent = "-";
  sizeOutput.textContent = "-";

  errorType.textContent = "Request Error";
  errorDescription.textContent = errorMessage;
  errorSolution.textContent =
    "Check API URL, JSON data and internet connection.";
}


/* FORMAT SIZE */

function formatSize(bytes) {

  if (bytes < 1024) {
    return bytes + " B";
  }

  if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(2) + " KB";
  }

  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}


/* CLEAR */

function clearResults() {

  apiUrl.value = "";
  bodyInput.value = "";

  responseOutput.textContent =
    "Your API response will appear here...";

  statusOutput.textContent = "-";
  timeOutput.textContent = "-";
  sizeOutput.textContent = "-";

  messageOutput.textContent = "";

  errorType.textContent = "Waiting for request";
  errorDescription.textContent =
    "API diagnostics will appear here.";
  errorSolution.textContent = "No action required yet.";

  methodSelect.value = "GET";
}


/* COPY RESPONSE */

async function copyResponse() {

  const text = responseOutput.textContent;

  if (
    !text ||
    text === "Your API response will appear here..." ||
    text === "Loading response..."
  ) {
    messageOutput.textContent = "No response to copy.";
    return;
  }

  try {

    await navigator.clipboard.writeText(text);
    messageOutput.textContent = "Response copied successfully.";

  } catch (error) {

    messageOutput.textContent =
      "Copy unavailable. Please copy manually.";

  }
}


/* BUTTON EVENTS */

sendBtn.addEventListener("click", sendRequest);
clearBtn.addEventListener("click", clearResults);
copyBtn.addEventListener("click", copyResponse);

apiUrl.addEventListener("keydown", function(event) {
  if (event.key === "Enter") {
    sendRequest();
  }
});


/* READY */

console.log("SIMHA API Tester is ready!");
