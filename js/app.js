
"use strict";

/* SIMHA API SUITE 2.1 */

const $ = id => document.getElementById(id);

const STORE = {
  history: "simha_api_history_v2",
  collection: "simha_api_collection_v2"
};

const state = {
  last: null,
  tests: [],
  history: [],
  collection: []
};

const el = {
  url: $("apiUrl"),
  method: $("methodSelect"),
  body: $("bodyInput"),
  headers: $("headersInput"),
  send: $("sendBtn"),
  message: $("message"),
  response: $("response"),
  status: $("status"),
  time: $("time"),
  size: $("size"),
  result: $("resultLabel"),
  responseType: $("responseType"),
  errorType: $("errorType"),
  errorDescription: $("errorDescription"),
  errorSolution: $("errorSolution"),
  assistant: $("assistantAnswer"),
  testCases: $("testCases"),
  testSummary: $("testSummary"),
  historyList: $("historyList"),
  collectionList: $("collectionList")
};

/* STORAGE */

function safeLoad(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function persist(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    showMessage("Browser storage is full or unavailable.");
    return false;
  }
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(2) + " KB";
  return (bytes / 1048576).toFixed(2) + " MB";
}

function showMessage(message) {
  el.message.textContent = message;
}

function currentRequest() {
  return {
    url: el.url.value.trim(),
    method: el.method.value,
    body: el.body.value,
    headers: el.headers.value
  };
}

/* NAVIGATION */

function showPage(pageName) {
  const validPages = [
    "workspace",
    "intelligence",
    "automation",
    "professional",
    "global"
  ];

  if (!validPages.includes(pageName)) {
    pageName = "workspace";
  }

  document.querySelectorAll("[data-page]").forEach(page => {
    page.classList.toggle(
      "hidden",
      page.dataset.page !== pageName
    );
  });

  document.querySelectorAll("[data-page-link]").forEach(link => {
    link.classList.toggle(
      "active",
      link.dataset.pageLink === pageName
    );
  });

  if (location.hash !== "#" + pageName) {
    history.replaceState(null, "", "#" + pageName);
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll("[data-page-link]").forEach(link => {
  link.addEventListener("click", event => {
    event.preventDefault();
    showPage(link.dataset.pageLink);
  });
});

window.addEventListener("hashchange", () => {
  showPage(location.hash.slice(1));
});

/* AUTHENTICATION */

function authUI() {
  const type = $("authType").value;

  $("authValueWrap").classList.toggle(
    "hidden",
    type === "none" || type === "basic"
  );

  $("authUserWrap").classList.toggle(
    "hidden",
    type !== "basic"
  );

  $("authPassWrap").classList.toggle(
    "hidden",
    type !== "basic"
  );

  $("apiKeyNameWrap").classList.toggle(
    "hidden",
    type !== "api"
  );
}

function buildHeaders() {
  let headers;

  try {
    headers = JSON.parse(el.headers.value || "{}");
  } catch {
    throw new Error("Headers JSON is invalid.");
  }

  if (
    !headers ||
    Array.isArray(headers) ||
    typeof headers !== "object"
  ) {
    throw new Error("Headers must be a JSON object.");
  }

  const clean = new Headers();

  Object.entries(headers).forEach(([key, value]) => {
    clean.set(key, String(value));
  });

  const type = $("authType").value;
  const value = $("authValue").value;

  if (type === "bearer" && value) {
    clean.set("Authorization", "Bearer " + value);
  }

  if (type === "basic") {
    const raw = $("authUser").value + ":" + $("authPass").value;
    clean.set(
      "Authorization",
      "Basic " + btoa(unescape(encodeURIComponent(raw)))
    );
  }

  if (type === "api" && value) {
    const keyName = $("apiKeyName").value.trim() || "x-api-key";
    clean.set(keyName, value);
  }

  return clean;
}

/* DIAGNOSIS */

function showDiagnostic(status, text, networkError) {
  if (networkError) {
    el.errorType.textContent = "Network / CORS Error";
    el.errorDescription.textContent =
      "The browser could not read a response. The server may be offline or may not allow browser CORS requests.";

    el.errorSolution.textContent =
      "Check the URL and internet connection. If the API is yours, configure its CORS policy.";

    return;
  }

  if (status >= 200 && status < 300) {
    el.errorType.textContent = "Success";
    el.errorDescription.textContent =
      "The server returned a successful HTTP status.";

    el.errorSolution.textContent =
      "Review the response data and validate that it matches your expected result.";

    return;
  }

  const tips = {
    400: [
      "Bad Request",
      "The server rejected the request format or data.",
      "Check endpoint, parameters, headers and JSON body."
    ],
    401: [
      "Unauthorized",
      "Authentication is missing or invalid.",
      "Check token, API key, expiry and authentication scheme."
    ],
    403: [
      "Forbidden",
      "The server refused access.",
      "Check account permissions and scopes."
    ],
    404: [
      "Not Found",
      "The endpoint or resource was not found.",
      "Check URL, route and resource ID."
    ],
    405: [
      "Method Not Allowed",
      "This endpoint does not accept the selected method.",
      "Check the API documentation."
    ],
    429: [
      "Rate Limited",
      "Too many requests were sent.",
      "Wait and respect the API rate limit."
    ],
    500: [
      "Internal Server Error",
      "The server encountered an unexpected problem.",
      "Inspect server logs or retry later."
    ],
    502: [
      "Bad Gateway",
      "A gateway received an invalid response.",
      "Check the upstream service."
    ],
    503: [
      "Service Unavailable",
      "The service is temporarily unavailable.",
      "Check service status and retry later."
    ],
    504: [
      "Gateway Timeout",
      "The gateway did not receive an upstream response.",
      "Check upstream latency."
    ]
  };

  const item = tips[status] || [
    "HTTP " + status,
    "The server returned an unsuccessful HTTP status.",
    "Read the response body and API documentation."
  ];

  el.errorType.textContent = item[0];
  el.errorDescription.textContent =
    item[1] + (text ? " Response: " + text.slice(0, 240) : "");

  el.errorSolution.textContent = item[2];
}

/* HISTORY */

function addHistory(item) {
  state.history.unshift(item);
  state.history = state.history.slice(0, 30);

  persist(STORE.history, state.history);
  renderHistory();
}

function renderHistory() {
  const search = ($("historySearch").value || "").toLowerCase();

  const items = state.history
    .map((item, index) => ({ item, index }))
    .filter(({ item }) =>
      (item.url || "").toLowerCase().includes(search) ||
      (item.method || "").toLowerCase().includes(search)
    );

  if (!items.length) {
    el.historyList.innerHTML =
      '<p class="muted">No matching request history.</p>';
    return;
  }

  el.historyList.innerHTML = items.map(({ item, index }) => `
    <div class="history-row">
      <div class="history-info">
        <b>${escapeHTML(item.method)} · HTTP ${escapeHTML(item.status || "")}</b>
        ${escapeHTML(item.url)}
        <div class="muted">${escapeHTML(item.timeLabel || "")}</div>
      </div>

      <div class="history-actions">
        <button class="btn secondary" data-history-load="${index}">Load</button>
        <button class="btn secondary" data-history-delete="${index}">Delete</button>
        <button class="btn primary" data-history-rerun="${index}">Re-run</button>
      </div>
    </div>
  `).join("");
}

/* COLLECTION */

function renderCollection() {
  const search = ($("collectionSearch").value || "").toLowerCase();

  const items = state.collection
    .map((item, index) => ({ item, index }))
    .filter(({ item }) =>
      (item.url || "").toLowerCase().includes(search) ||
      (item.method || "").toLowerCase().includes(search)
    );

  if (!items.length) {
    el.collectionList.innerHTML =
      '<p class="muted">No matching saved requests.</p>';
    return;
  }

  el.collectionList.innerHTML = items.map(({ item, index }) => `
    <div class="history-row">
      <div class="history-info">
        <b>${escapeHTML(item.method)}</b>
        ${escapeHTML(item.url)}
        <div class="muted">${escapeHTML(item.timeLabel || "")}</div>
      </div>

      <div class="history-actions">
        <button class="btn secondary" data-collection-load="${index}">Load</button>
        <button class="btn secondary" data-collection-delete="${index}">Delete</button>
      </div>
    </div>
  `).join("");
}

function saveCollection() {
  const request = currentRequest();

  if (!request.url) {
    showMessage("Enter a URL before saving.");
    return;
  }

  state.collection.unshift({
    ...request,
    timeLabel: new Date().toLocaleString()
  });

  state.collection = state.collection.slice(0, 30);

  persist(STORE.collection, state.collection);
  renderCollection();
  showMessage("Request saved to this browser.");
}

function loadRequest(item) {
  if (!item) return;

  el.url.value = item.url || "";
  el.method.value = item.method || "GET";
  el.body.value = item.body || "";

  if (item.headers) {
    el.headers.value = item.headers;
  }

  showPage("workspace");
  showMessage("Request loaded. Check credentials before sending.");
}

/* REQUEST ENGINE */

async function sendRequest(options = {}) {
  const req = options.request || currentRequest();

  if (!req.url) {
    showMessage("Please enter an API URL.");
    return null;
  }

  let parsed;

  try {
    parsed = new URL(req.url);

    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error();
    }
  } catch {
    showMessage("Enter a valid HTTP or HTTPS URL.");
    return null;
  }

  let headers;

  try {
    headers = options.headers || buildHeaders();
  } catch (error) {
    showMessage(error.message);
    return null;
  }

  const method = req.method.toUpperCase();

  const init = {
    method,
    headers
  };

  if (["POST", "PUT", "PATCH"].includes(method)) {
    try {
      if (req.body.trim()) {
        JSON.parse(req.body);
      }
    } catch {
      showMessage("Request body is not valid JSON.");
      return null;
    }

    if (req.body.trim()) {
      init.body = req.body;

      if (!headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }
    }
  }

  const controller = new AbortController();
  init.signal = controller.signal;

  const timeout = setTimeout(() => controller.abort(), 20000);
  const start = performance.now();

  el.send.disabled = true;
  el.send.textContent = "Sending...";
  showMessage("Sending request...");
  el.response.textContent = "Loading response...";

  try {
    const response = await fetch(parsed.href, init);
    const raw = await response.text();

    const duration = Math.round(performance.now() - start);

    let formatted = raw;

    try {
      formatted = JSON.stringify(JSON.parse(raw), null, 2);
    } catch {}

    const size = new Blob([raw]).size;

    const result = {
      url: parsed.href,
      method,
      requestBody: req.body,
      requestHeaders: req.headers,
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      duration,
      size,
      raw,
      formatted,
      contentType: response.headers.get("content-type") || "",
      headers: Array.from(response.headers.entries()),
      timestamp: new Date().toISOString()
    };

    state.last = result;

    el.response.textContent = formatted || "(Empty response)";
    el.status.textContent = response.status + " " + response.statusText;
    el.time.textContent = duration + " ms";
    el.size.textContent = formatSize(size);
    el.result.textContent = response.ok ? "Success" : "HTTP Error";
    el.responseType.textContent = result.contentType || "Unknown type";

    showDiagnostic(response.status, raw, false);

    $("performanceResult").textContent =
      "Measured response time: " + duration + " ms\n" +
      "Response size: " + formatSize(size) + "\n" +
      "HTTP status: " + response.status;

    showMessage(method + " request completed. HTTP " + response.status + ".");

    addHistory({
      method,
      url: parsed.href,
      status: response.status,
      timeLabel: new Date().toLocaleString(),
      body: req.body,
      headers: req.headers
    });

    if (options.onResult) {
      options.onResult(result);
    }

    return result;

  } catch (error) {
    const message = error.name === "AbortError"
      ? "Request timed out after 20 seconds."
      : "Network error or CORS restriction. Browser access may not be allowed.";

    el.response.textContent = message;
    el.status.textContent = "Error";
    el.time.textContent = Math.round(performance.now() - start) + " ms";
    el.size.textContent = "—";
    el.result.textContent = "Failed";

    showDiagnostic(0, "", true);
    showMessage(message);

    return null;

  } finally {
    clearTimeout(timeout);
    el.send.disabled = false;
    el.send.textContent = "Send";
  }
}

/* ASSISTANT */

function explainResult() {
  if (!state.last) {
    el.assistant.textContent =
      "First send an API request. Then I can explain its status and response.";
    return;
  }

  const r = state.last;

  let explanation =
    r.method + " " + r.url + "\n" +
    "HTTP " + r.status + " " + r.statusText + "\n" +
    "Response time: " + r.duration + " ms\n" +
    "Response size: " + formatSize(r.size) + "\n";

  if (r.status === 401) {
    explanation += "Suggestion: Verify authentication credentials and token expiry.";
  } else if (r.status === 403) {
    explanation += "Suggestion: Verify account permissions and access scopes.";
  } else if (r.status === 404) {
    explanation += "Suggestion: Verify endpoint path and resource ID.";
  } else if (r.status === 429) {
    explanation += "Suggestion: Wait and respect the API rate limit.";
  } else if (r.ok) {
    explanation += "The request succeeded. Validate the response fields.";
  } else {
    explanation += "Inspect the response body for API error details.";
  }

  el.assistant.textContent = explanation;
}

/* TEST GENERATOR */

function generateTests() {
  if (!el.url.value.trim()) {
    showMessage("Enter an API URL before generating tests.");
    return;
  }

  const method = el.method.value;

  state.tests = [
    {
      name: "HTTP response received",
      desc: "The endpoint returns a readable HTTP response.",
      type: "response"
    },
    {
      name: "Expected success status",
      desc: "Check whether status is in the 2xx range.",
      type: "success"
    },
    {
      name: "Response body is not empty",
      desc: "Check whether the server returned content.",
      type: "body"
    },
    {
      name: "Response time below 3 seconds",
      desc: "Basic performance threshold.",
      type: "time"
    },
    {
      name: "JSON response parses",
      desc: "Check JSON syntax when response declares JSON.",
      type: "json"
    }
  ];

  if (["POST", "PUT", "PATCH"].includes(method)) {
    state.tests.push({
      name: "Request payload supplied",
      desc: "A non-empty JSON request body was provided.",
      type: "payload"
    });
  }

  el.testCases.innerHTML = state.tests.map(test => `
    <div class="test-item">
      <span>
        <b>${escapeHTML(test.name)}</b><br>
        <span class="muted">${escapeHTML(test.desc)}</span>
      </span>
      <small class="test-state">Ready</small>
    </div>
  `).join("");

  el.testSummary.textContent =
    state.tests.length + " test cases generated. Tap Run Tests.";
}

async function runTests() {
  if (!state.tests.length) {
    generateTests();
  }

  if (!state.tests.length) return;

  const result = await sendRequest();

  if (!result) {
    el.testSummary.textContent =
      "Tests could not run because no HTTP response was received.";
    return;
  }

  const results = state.tests.map(test => {
    let pass = false;

    if (test.type === "response") pass = true;
    if (test.type === "success") pass = result.ok;
    if (test.type === "body") pass = result.raw.length > 0;
    if (test.type === "time") pass = result.duration < 3000;

    if (test.type === "json") {
      pass = !/json/i.test(result.contentType) ||
        (() => {
          try {
            JSON.parse(result.raw);
            return true;
          } catch {
            return false;
          }
        })();
    }

    if (test.type === "payload") {
      pass = !!el.body.value.trim();
    }

    return { ...test, pass };
  });

  el.testCases.innerHTML = results.map(test => `
    <div class="test-item">
      <span>
        <b>${test.pass ? "✓" : "✕"} ${escapeHTML(test.name)}</b><br>
        <span class="muted">${escapeHTML(test.desc)}</span>
      </span>
      <small class="test-state">${test.pass ? "PASS" : "FAIL"}</small>
    </div>
  `).join("");

  const passed = results.filter(test => test.pass).length;

  el.testSummary.textContent =
    passed + "/" + results.length + " tests passed.";

  state.last.testResults = results;
}

/* SECURITY */

function analyzeSecurity() {
  const box = $("securityResult");

  if (!state.last) {
    box.textContent = "Send a request first.";
    return;
  }

  const result = state.last;
  const url = new URL(result.url);
  const checks = [];

  checks.push(
    (url.protocol === "https:" ? "PASS" : "WARN") +
    " · HTTPS transport: " +
    (url.protocol === "https:" ? "used" : "not used")
  );

  const headers = Object.fromEntries(
    result.headers.map(([key, value]) => [
      key.toLowerCase(),
      value
    ])
  );

  checks.push(
    "HSTS: " +
    (headers["strict-transport-security"] || "Not visible")
  );

  checks.push(
    "X-Content-Type-Options: " +
    (headers["x-content-type-options"] || "Not visible")
  );

  checks.push(
    "Content-Security-Policy: " +
    (headers["content-security-policy"] ? "Present" : "Not visible")
  );

  checks.push(
    "LIMIT: This is a lightweight header review, not a penetration test."
  );

  box.textContent = checks.join("\n");
}

/* DOCUMENTATION */

function downloadText(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = name;

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function makeDocs() {
  if (!state.last) {
    showMessage("Send a request before generating documentation.");
    return;
  }

  const r = state.last;

  const doc =
    "# API Request Documentation\n\n" +
    "- Method: " + r.method + "\n" +
    "- Endpoint: " + r.url + "\n" +
    "- Status: " + r.status + "\n" +
    "- Response time: " + r.duration + " ms\n\n" +
    "## Request Body\n\n" +
    "```json\n" + (r.requestBody || "(No request body)") + "\n```\n\n" +
    "## Example Response\n\n" +
    "```\n" + r.formatted.slice(0, 12000) + "\n```\n";

  downloadText(
    "simha-api-documentation.md",
    doc,
    "text/markdown"
  );
}

/* REPORT */

function report() {
  if (!state.last) {
    showMessage("Send a request before downloading a report.");
    return;
  }

  const r = state.last;

  const data = {
    tool: "SIMHA API Suite",
    generatedAt: new Date().toISOString(),
    request: {
      url: r.url,
      method: r.method,
      headers: r.requestHeaders,
      body: r.requestBody
    },
    response: {
      status: r.status,
      statusText: r.statusText,
      ok: r.ok,
      durationMs: r.duration,
      sizeBytes: r.size,
      contentType: r.contentType,
      body: r.formatted
    },
    tests: r.testResults || []
  };

  downloadText(
    "simha-api-report.json",
    JSON.stringify(data, null, 2),
    "application/json"
  );
}

/* RESET */

function clearResults() {
  el.url.value = "";
  el.method.value = "GET";

  el.response.textContent =
    "Your API response will appear here...";

  el.status.textContent = "—";
  el.time.textContent = "—";
  el.size.textContent = "—";
  el.result.textContent = "Waiting";
  el.responseType.textContent = "JSON / TEXT";

  el.errorType.textContent = "Waiting for request";
  el.errorDescription.textContent =
    "HTTP status and network guidance will appear here.";
  el.errorSolution.textContent =
    "Suggested solution will appear here.";

  $("performanceResult").textContent = "No performance data yet.";
  $("securityResult").textContent = "Send a request first.";

  state.last = null;

  showMessage("Request form reset. History and collection were kept.");
}

/* LANGUAGE */

function translate(lang) {
  const te = lang === "te";

  const labels = {
    nav: [
      te ? "వర్క్‌స్పేస్" : "Workspace",
      te ? "ఇంటెలిజెన్స్" : "Intelligence",
      te ? "ఆటోమేషన్" : "Automation",
      te ? "ప్రొఫెషనల్" : "Professional",
      te ? "గ్లోబల్" : "Global"
    ],
    send: te ? "పంపండి" : "Send"
  };

  document.querySelectorAll("[data-page-link]").forEach((link, index) => {
    link.textContent = labels.nav[index];
  });

  el.send.textContent = labels.send;
  document.documentElement.lang = te ? "te" : "en";
}

function changeLanguage(lang) {
  $("languageSelect").value = lang;
  $("globalLanguage").value = lang;
  translate(lang);
}

/* EVENT LISTENERS */

el.send.addEventListener("click", () => sendRequest());

$("copyBtn").addEventListener("click", async () => {
  if (!state.last) {
    showMessage("No response to copy.");
    return;
  }

  try {
    await navigator.clipboard.writeText(state.last.formatted);
    showMessage("Response copied.");
  } catch {
    showMessage("Clipboard unavailable in this browser.");
  }
});

$("downloadResponseBtn").addEventListener("click", () => {
  if (!state.last) {
    showMessage("No response to download.");
    return;
  }

  downloadText(
    "simha-api-response.txt",
    state.last.formatted,
    "text/plain"
  );
});

$("clearBtn").addEventListener("click", clearResults);
$("explainBtn").addEventListener("click", explainResult);
$("generateTestsBtn").addEventListener("click", generateTests);
$("runTestsBtn").addEventListener("click", runTests);
$("securityBtn").addEventListener("click", analyzeSecurity);
$("docsBtn").addEventListener("click", makeDocs);
$("reportBtn").addEventListener("click", report);
$("saveCollectionBtn").addEventListener("click", saveCollection);

$("authType").addEventListener("change", authUI);

$("languageSelect").addEventListener("change", event => {
  changeLanguage(event.target.value);
});

$("globalLanguage").addEventListener("change", event => {
  changeLanguage(event.target.value);
});

el.url.addEventListener("keydown", event => {
  if (event.key === "Enter") sendRequest();
});

$("historySearch").addEventListener("input", renderHistory);
$("collectionSearch").addEventListener("input", renderCollection);

/* HISTORY AND COLLECTION BUTTONS */

el.historyList.addEventListener("click", event => {
  const load = event.target.closest("[data-history-load]");
  const remove = event.target.closest("[data-history-delete]");
  const rerun = event.target.closest("[data-history-rerun]");

  if (load) {
    loadRequest(state.history[Number(load.dataset.historyLoad)]);
  }

  if (remove) {
    const index = Number(remove.dataset.historyDelete);

    state.history.splice(index, 1);
    persist(STORE.history, state.history);
    renderHistory();

    showMessage("History item deleted.");
  }

  if (rerun) {
    const item = state.history[Number(rerun.dataset.historyRerun)];

    if (item) {
      loadRequest(item);
      showPage("workspace");
      sendRequest();
    }
  }
});

el.collectionList.addEventListener("click", event => {
  const load = event.target.closest("[data-collection-load]");
  const remove = event.target.closest("[data-collection-delete]");

  if (load) {
    loadRequest(state.collection[Number(load.dataset.collectionLoad)]);
  }

  if (remove) {
    const index = Number(remove.dataset.collectionDelete);

    state.collection.splice(index, 1);
    persist(STORE.collection, state.collection);
    renderCollection();

    showMessage("Saved request deleted.");
  }
});

$("clearHistoryBtn").addEventListener("click", () => {
  if (!confirm("Clear all request history from this browser?")) return;

  state.history = [];
  persist(STORE.history, state.history);
  renderHistory();
});

$("clearCollectionBtn").addEventListener("click", () => {
  if (!confirm("Clear all saved requests from this browser?")) return;

  state.collection = [];
  persist(STORE.collection, state.collection);
  renderCollection();
});

/* INITIALIZE */

state.history = safeLoad(STORE.history);
state.collection = safeLoad(STORE.collection);

renderHistory();
renderCollection();
authUI();

const initialPage = location.hash.replace("#", "") || "workspace";
showPage(initialPage);

console.log("SIMHA API Suite 2.1 Ready.");
