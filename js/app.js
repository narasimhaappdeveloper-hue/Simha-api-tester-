
const urlInput = document.getElementById("apiUrl");
const sendBtn = document.getElementById("sendBtn");
const clearBtn = document.getElementById("clearBtn");
const copyBtn = document.getElementById("copyBtn");

const statusOutput = document.getElementById("status");
const timeOutput = document.getElementById("time");
const sizeOutput = document.getElementById("size");
const responseOutput = document.getElementById("response");
const messageOutput = document.getElementById("message");

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
        "HTTP Error: " + response.status;
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

// Show Error
function showError(message) {
  statusOutput.textContent = "Error";
  sizeOutput.textContent = "--";
  responseOutput.textContent = message;
  messageOutput.textContent = message;
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
