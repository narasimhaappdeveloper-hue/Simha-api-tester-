/* SIMHA API SUITE - browser-only edition
   No private API keys or AI secrets belong in this public file. */
"use strict";

const $ = (id) => document.getElementById(id);
const STORE = { history: "simha_api_history_v2", collection: "simha_api_collection_v2" };
const state = { last: null, tests: [], history: [], collection: [] };

const el = {
  url: $("apiUrl"), method: $("methodSelect"), body: $("bodyInput"),
  headers: $("headersInput"), send: $("sendBtn"), message: $("message"),
  response: $("response"), status: $("status"), time: $("time"), size: $("size"),
  result: $("resultLabel"), responseType: $("responseType"),
  errorType: $("errorType"), errorDescription: $("errorDescription"),
  errorSolution: $("errorSolution"), assistant: $("assistantAnswer"),
  testCases: $("testCases"), testSummary: $("testSummary"),
  historyList: $("historyList"), collectionList: $("collectionList")
};

function safeLoad(key) {
  try { const v = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(v) ? v : []; }
  catch (_) { return []; }
}
function persist(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch (_) { el.message.textContent = "Browser storage is full or unavailable. Clear old history."; return false; }
}
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(2) + " KB";
  return (bytes / 1048576).toFixed(2) + " MB";
}
function showMessage(text) { el.message.textContent = text; }
function currentRequest() {
  return { url: el.url.value.trim(), method: el.method.value, body: el.body.value, headers: el.headers.value };
}
function buildHeaders() {
  let headers;
  try { headers = JSON.parse(el.headers.value || "{}"); }
  catch (_) { throw new Error("Headers JSON is invalid. Please correct it."); }
  if (!headers || Array.isArray(headers) || typeof headers !== "object") throw new Error("Headers must be a JSON object.");
  const clean = new Headers();
  Object.entries(headers).forEach(([k,v]) => clean.set(k, String(v)));
  const authType = $("authType").value;
  const authValue = $("authValue").value;
  if (authType === "bearer" && authValue) clean.set("Authorization", "Bearer " + authValue);
  if (authType === "basic") {
    const raw = $("authUser").value + ":" + $("authPass").value;
    clean.set("Authorization", "Basic " + btoa(unescape(encodeURIComponent(raw))));
  }
  if (authType === "api" && authValue) clean.set($("apiKeyName").value.trim() || "x-api-key", authValue);
  return clean;
}
function showDiagnostic(status, text, networkError) {
  if (networkError) {
    el.errorType.textContent = "Network / CORS error";
    el.errorDescription.textContent = "The browser could not read a response. The server may be offline or may not allow browser CORS requests.";
    el.errorSolution.textContent = "Check the URL and internet connection. If the API is yours, configure its CORS policy. A browser-only app cannot bypass CORS.";
    return;
  }
  if (status >= 200 && status < 300) {
    el.errorType.textContent = "Success";
    el.errorDescription.textContent = "The server returned a successful HTTP status.";
    el.errorSolution.textContent = "Review the response data and validate that it matches your expected result.";
    return;
  }
  const tips = {
    400:["Bad Request","The server rejected the request format or data.","Check endpoint, parameters, headers and JSON body."],
    401:["Unauthorized","Authentication is missing or invalid.","Check token, API key, expiry and required authentication scheme."],
    403:["Forbidden","The server understood the request but refused access.","Check account permissions, scopes and resource access."],
    404:["Not Found","The endpoint or requested resource was not found.","Check the base URL, route, resource ID and API version."],
    405:["Method Not Allowed","This endpoint does not accept the selected method.","Check API documentation for supported methods."],
    408:["Request Timeout","The server timed out waiting for the request.","Retry carefully and check server health."],
    415:["Unsupported Media Type","The server does not accept the supplied content type.","Check Content-Type and supported payload format."],
    422:["Unprocessable Content","The server could not validate the submitted data.","Inspect validation details and required fields."],
    429:["Rate Limited","Too many requests were sent in a short period.","Respect rate limits and retry after the server's suggested delay."],
    500:["Internal Server Error","The server encountered an unexpected problem.","Inspect server logs; retry later if appropriate."],
    502:["Bad Gateway","A gateway received an invalid upstream response.","Check upstream service and gateway health."],
    503:["Service Unavailable","The service is temporarily unavailable.","Check service status and retry later."],
    504:["Gateway Timeout","A gateway did not receive an upstream response in time.","Check upstream latency and gateway timeout settings."]
  };
  const item = tips[status] || ["HTTP " + status,"The server returned an unsuccessful HTTP status.","Read the response body and API documentation for details."];
  el.errorType.textContent = item[0];
  el.errorDescription.textContent = item[1] + (text ? " Response: " + text.slice(0,240) : "");
  el.errorSolution.textContent = item[2];
}
function addHistory(item) {
  state.history.unshift(item);
  state.history = state.history.slice(0,30);
  persist(STORE.history, state.history);
  renderHistory();
}
function renderRows(target, items, kind) {
  if (!items.length) { target.innerHTML = '<p class="muted">No ' + (kind === "history" ? "request history" : "saved requests") + ' yet.</p>'; return; }
  target.innerHTML = items.map((x,i) => `<div class="history-row"><div class="history-info"><b>${escapeHTML(x.method)}</b>${escapeHTML(x.url)}<div class="muted">${escapeHTML(x.timeLabel || "")} ${x.status ? "· " + escapeHTML(x.status) : ""}</div></div><button class="btn secondary" data-${kind}-load="${i}">Load</button></div>`).join("");
}
function renderHistory() { renderRows(el.historyList,state.history,"history"); }
function renderCollection() { renderRows(el.collectionList,state.collection,"collection"); }

async function sendRequest(options = {}) {
  const req = options.request || currentRequest();
  if (!req.url) { showMessage("Please enter an API URL."); return null; }
  let parsed;
  try {
    parsed = new URL(req.url);
    if (!["http:","https:"].includes(parsed.protocol)) throw new Error();
  } catch (_) { showMessage("Enter a valid HTTP or HTTPS URL."); return null; }

  let headers;
  try { headers = options.headers || buildHeaders(); }
  catch (err) { showMessage(err.message); return null; }

  const method = req.method.toUpperCase();
  const init = { method, headers, signal: undefined };
  if (["POST","PUT","PATCH"].includes(method)) {
    try { if (req.body.trim()) JSON.parse(req.body); }
    catch (_) { showMessage("Request body is not valid JSON."); return null; }
    if (req.body.trim()) {
      init.body = req.body;
      if (!headers.has("Content-Type")) headers.set("Content-Type","application/json");
    }
  }

  const controller = new AbortController();
  init.signal = controller.signal;
  const timeout = setTimeout(() => controller.abort(), 20000);
  const start = performance.now();
  el.send.disabled = true;
  el.send.textContent = "Sending…";
  showMessage("Sending request…");
  el.response.textContent = "Loading response…";
  try {
    const response = await fetch(parsed.href, init);
    const raw = await response.text();
    const duration = Math.round(performance.now() - start);
    let formatted = raw;
    try { formatted = JSON.stringify(JSON.parse(raw), null, 2); } catch (_) {}
    const size = new Blob([raw]).size;
    const result = {
      url: parsed.href, method, requestBody: req.body, requestHeaders: req.headers,
      status: response.status, statusText: response.statusText, ok: response.ok,
      duration, size, raw, formatted, contentType: response.headers.get("content-type") || "",
      headers: Array.from(response.headers.entries()), timestamp: new Date().toISOString()
    };
    state.last = result;
    el.response.textContent = formatted || "(Empty response)";
    el.status.textContent = response.status + " " + response.statusText;
    el.time.textContent = duration + " ms";
    el.size.textContent = formatSize(size);
    el.result.textContent = response.ok ? "Success" : "HTTP Error";
    el.responseType.textContent = result.contentType || "Unknown type";
    showDiagnostic(response.status, raw, false);
    $("performanceResult").textContent = `Measured response time: ${duration} ms\nResponse size: ${formatSize(size)}\nHTTP status: ${response.status}`;
    showMessage(method + " request completed. HTTP " + response.status + ".");
    addHistory({method,url:parsed.href,status:response.status,timeLabel:new Date().toLocaleString(),body:req.body,headers:req.headers});
    if (options.onResult) options.onResult(result);
    return result;
  } catch (err) {
    const network = err.name === "AbortError" ? "Request timed out after 20 seconds." : "Network error or CORS restriction. Browser access to this API may not be allowed.";
    el.response.textContent = network;
    el.status.textContent = "Error";
    el.time.textContent = Math.round(performance.now()-start) + " ms";
    el.size.textContent = "—";
    el.result.textContent = "Failed";
    showDiagnostic(0, "", true);
    showMessage(network);
    return null;
  } finally {
    clearTimeout(timeout);
    el.send.disabled = false;
    el.send.textContent = "Send";
  }
}

function explainResult() {
  if (!state.last) { el.assistant.textContent = "First send an API request. I can then explain its status, timing and response."; return; }
  const r = state.last;
  let explanation = `${r.method} ${r.url}\n`;
  explanation += `HTTP ${r.status} ${r.statusText}: ${r.ok ? "The server accepted the request successfully." : "The server returned an error status."}\n`;
  explanation += `Response time: ${r.duration} ms. Response size: ${formatSize(r.size)}.\n`;
  if (r.status === 401) explanation += "Next: verify authentication credentials and token expiry.";
  else if (r.status === 403) explanation += "Next: verify the account's permissions and scopes.";
  else if (r.status === 404) explanation += "Next: verify the endpoint path and resource ID.";
  else if (r.status === 429) explanation += "Next: wait and respect the API rate limit.";
  else if (r.ok) explanation += "Next: validate required fields in the response and compare them with your expected result.";
  else explanation += "Next: inspect the response body for the API's error details.";
  el.assistant.textContent = explanation;
}

function generateTests() {
  if (!el.url.value.trim()) { showMessage("Enter an API URL before generating tests."); return; }
  const method = el.method.value;
  state.tests = [
    {name:"HTTP response received",desc:"The endpoint returns a readable HTTP response.",type:"response"},
    {name:"Expected success status",desc:"Check whether status is in the 2xx range.",type:"success"},
    {name:"Response body is not empty",desc:"Check whether the server returned content.",type:"body"},
    {name:"Response time below 3 seconds",desc:"Basic performance threshold (3,000 ms).",type:"time"},
    {name:"JSON response parses",desc:"Check JSON syntax when the response declares JSON.",type:"json"}
  ];
  if (["POST","PUT","PATCH"].includes(method)) state.tests.push({name:"Request payload supplied",desc:"A non-empty JSON request body was provided.",type:"payload"});
  el.testCases.innerHTML = state.tests.map((t,i)=>`<label class="test-item"><input type="checkbox" checked disabled><span><b>${escapeHTML(t.name)}</b><br><span class="muted">${escapeHTML(t.desc)}</span></span><small class="test-state">Ready</small></label>`).join("");
  el.testSummary.textContent = state.tests.length + " test cases generated. Tap Run generated tests to execute them.";
}
async function runTests() {
  if (!state.tests.length) generateTests();
  if (!state.tests.length) return;
  const r = await sendRequest();
  if (!r) { el.testSummary.textContent = "Tests could not run because the request failed before an HTTP response was received."; return; }
  const results = state.tests.map(t => {
    let pass = false;
    if (t.type==="response") pass = true;
    if (t.type==="success") pass = r.ok;
    if (t.type==="body") pass = r.raw.length > 0;
    if (t.type==="time") pass = r.duration < 3000;
    if (t.type==="json") pass = !/json/i.test(r.contentType) || (()=>{try{JSON.parse(r.raw);return true}catch(_){return false}})();
    if (t.type==="payload") pass = !!el.body.value.trim();
    return {...t,pass};
  });
  el.testCases.innerHTML = results.map(t=>`<div class="test-item"><span>${t.pass?"✓":"✕"} <b>${escapeHTML(t.name)}</b><br><span class="muted">${escapeHTML(t.desc)}</span></span><small class="test-state">${t.pass?"PASS":"FAIL"}</small></div>`).join("");
  const passed = results.filter(x=>x.pass).length;
  el.testSummary.textContent = `${passed}/${results.length} tests passed. These are basic client-side checks, not a full contract test suite.`;
  state.last.testResults = results;
}
function analyzeSecurity() {
  const box = $("securityResult");
  if (!state.last) { box.textContent = "Send a request first."; return; }
  const r = state.last;
  const checks = [];
  checks.push((new URL(r.url).protocol === "https:" ? "PASS" : "WARN") + " · HTTPS transport: " + (new URL(r.url).protocol === "https:" ? "used" : "not used"));
  const h = Object.fromEntries(r.headers.map(([k,v])=>[k.toLowerCase(),v]));
  checks.push((h["strict-transport-security"] ? "INFO" : "NOTE") + " · HSTS header: " + (h["strict-transport-security"] || "not visible"));
  checks.push((h["x-content-type-options"] ? "INFO" : "NOTE") + " · X-Content-Type-Options: " + (h["x-content-type-options"] || "not visible"));
  checks.push((h["content-security-policy"] ? "INFO" : "NOTE") + " · Content-Security-Policy: " + (h["content-security-policy"] ? "present" : "not visible"));
  checks.push("LIMIT · Browser CORS may hide some headers. This is a lightweight header review, not a vulnerability scan or penetration test.");
  box.textContent = checks.join("\n");
}
function makeDocs() {
  if (!state.last) { showMessage("Send a request before generating documentation."); return; }
  const r=state.last;
  const doc = `# API Request Documentation\n\n- **Method:** ${r.method}\n- **Endpoint:** ${r.url}\n- **Last status:** ${r.status} ${r.statusText}\n- **Response time:** ${r.duration} ms\n- **Response content type:** ${r.contentType || "Unknown"}\n\n## Request body\n\n\`\`\`json\n${r.requestBody || "(No request body)"}\n\`\`\`\n\n## Example response\n\n\`\`\`\n${r.formatted.slice(0,12000)}\n\`\`\`\n\n> Generated by SIMHA API Suite. Confirm authentication, parameters and schemas against the official API specification.`;
  downloadText("simha-api-documentation.md",doc,"text/markdown");
}
function report() {
  if (!state.last) { showMessage("Send a request before downloading a report."); return; }
  const r=state.last;
  const data={tool:"SIMHA API Suite",generatedAt:new Date().toISOString(),request:{url:r.url,method:r.method,headers:r.requestHeaders,body:r.requestBody},response:{status:r.status,statusText:r.statusText,ok:r.ok,durationMs:r.duration,sizeBytes:r.size,contentType:r.contentType,body:r.formatted},tests:r.testResults||[]};
  downloadText("simha-api-report.json",JSON.stringify(data,null,2),"application/json");
}
function downloadText(name,content,type) {
  const blob=new Blob([content],{type});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}
function saveCollection() {
  const req=currentRequest();
  if(!req.url){showMessage("Enter a URL before saving.");return;}
  state.collection.unshift({...req,timeLabel:new Date().toLocaleString()});
  state.collection=state.collection.slice(0,30);
  persist(STORE.collection,state.collection);renderCollection();showMessage("Request saved to this browser's collection.");
}
function loadRequest(item) {
  el.url.value=item.url||"";el.method.value=item.method||"GET";el.body.value=item.body||"";
  if(item.headers)el.headers.value=item.headers;
  showMessage("Request loaded. Check credentials before sending.");
}
function clearResults() {
  el.url.value="";el.method.value="GET";
  el.response.textContent="Your API response will appear here...";
  el.status.textContent=el.time.textContent=el.size.textContent="—";
  el.result.textContent="Waiting";el.responseType.textContent="JSON / TEXT";
  el.errorType.textContent="Waiting for request";el.errorDescription.textContent="HTTP status and network guidance will appear here.";
  el.errorSolution.textContent="Suggested solution will appear here.";
  state.last=null;showMessage("Request form reset. History and collection were kept.");
}
function translate(lang) {
  const dict={
    te:{ready:"సిద్ధంగా ఉంది",nav_workspace:"వర్క్‌స్పేస్",nav_intelligence:"ఇంటెలిజెన్స్",nav_automation:"ఆటోమేషన్",nav_professional:"ప్రొఫెషనల్",nav_global:"గ్లోబల్",hero_title:"APIలను పరీక్షించండి. సమస్యలను అర్థం చేసుకోండి.",hero_sub:"మీ బ్రౌజర్‌లో పనిచేసే API టెస్టింగ్ వర్క్‌స్పేస్.",request_title:"API రిక్వెస్ట్",request_hint:"POST, PUT, PATCH పద్ధతులకు సరైన JSON ఇవ్వండి. అనుమతి ఉన్న APIలనే పరీక్షించండి.",response_title:"రిస్పాన్స్",intelligence_title:"ఇంటెలిజెన్స్ & స్మార్ట్ డీబగ్గర్",automation_title:"ఆటోమేషన్ & టెస్ట్ జనరేటర్",professional_title:"ప్రొఫెషనల్ టూల్స్",global_title:"గ్లోబల్ & ప్రీమియం రోడ్‌మ్యాప్"},
    en:{ready:"Ready",nav_workspace:"Workspace",nav_intelligence:"Intelligence",nav_automation:"Automation",nav_professional:"Professional",nav_global:"Global",hero_title:"Test APIs. Understand problems. Build with confidence.",hero_sub:"A practical API workspace that runs in your browser.",request_title:"API Request",request_hint:"POST, PUT and PATCH usually need a valid JSON body. Use only APIs you are authorized to test.",response_title:"Response",intelligence_title:"Intelligence & Smart Debugger",automation_title:"Automation & Test Generator",professional_title:"Professional Tools",global_title:"Global & Premium Roadmap"}
  };
  document.documentElement.lang=lang==="te"?"te":"en";
  document.querySelectorAll("[data-i18n]").forEach(node=>{const key=node.dataset.i18n;if(dict[lang][key])node.textContent=dict[lang][key];});
}
function authUI() {
  const type=$("authType").value;
  $("authValueWrap").classList.toggle("hidden",type==="none"||type==="basic");
  $("authUserWrap").classList.toggle("hidden",type!=="basic");
  $("authPassWrap").classList.toggle("hidden",type!=="basic");
  $("apiKeyNameWrap").classList.toggle("hidden",type!=="api");
}

el.send.addEventListener("click",()=>sendRequest());
$("copyBtn").addEventListener("click",async()=>{
  if(!state.last){showMessage("No response to copy.");return;}
  try{await navigator.clipboard.writeText(state.last.formatted);showMessage("Response copied.");}
  catch(_){showMessage("Clipboard unavailable in this browser.");}
});
$("downloadResponseBtn").addEventListener("click",()=>{if(!state.last){showMessage("No response to download.");return;}downloadText("simha-api-response.txt",state.last.formatted,"text/plain");});
$("clearBtn").addEventListener("click",clearResults);
$("explainBtn").addEventListener("click",explainResult);
$("generateTestsBtn").addEventListener("click",generateTests);
$("runTestsBtn").addEventListener("click",runTests);
$("securityBtn").addEventListener("click",analyzeSecurity);
$("docsBtn").addEventListener("click",makeDocs);
$("reportBtn").addEventListener("click",report);
$("saveCollectionBtn").addEventListener("click",saveCollection);
$("clearHistoryBtn").addEventListener("click",()=>{if(confirm("Clear all request history from this browser?")){state.history=[];persist(STORE.history,state.history);renderHistory();}});
$("clearCollectionBtn").addEventListener("click",()=>{if(confirm("Clear all saved requests from this browser?")){state.collection=[];persist(STORE.collection,state.collection);renderCollection();}});
$("authType").addEventListener("change",authUI);
$("languageSelect").addEventListener("change",e=>translate(e.target.value));
el.url.addEventListener("keydown",e=>{if(e.key==="Enter")sendRequest();});
el.historyList.addEventListener("click",e=>{const b=e.target.closest("[data-history-load]");if(b)loadRequest(state.history[Number(b.dataset.historyLoad)]);});
el.collectionList.addEventListener("click",e=>{const b=e.target.closest("[data-collection-load]");if(b)loadRequest(state.collection[Number(b.dataset.collectionLoad)]);});
document.querySelectorAll(".main-nav a").forEach(a=>a.addEventListener("click",()=>{document.querySelectorAll(".main-nav a").forEach(x=>x.classList.remove("active"));a.classList.add("active");}));

state.history=safeLoad(STORE.history);
state.collection=safeLoad(STORE.collection);
renderHistory();renderCollection();authUI();
console.log("SIMHA API Suite ready.");
