/*
 * visitor-analytics.js — anonymous unique-browser counter.
 * Host this file on GitHub Pages with your site. Add to index.html:
 *   <script src="visitor-analytics.js" defer></script>
 * Optionally show the count anywhere with:
 *   <span id="unique-visit-count"></span>
 */
(function () {
  "use strict";

  // ===== CONFIGURE HERE: your Render backend URL (no trailing slash) =====
  var BACKEND_URL = "var BACKEND_URL = "https://visitor-analytics-backend-1.onrender.com";";
  // =======================================================================

  var ID_KEY = "tba_visitor_id";
  var REGISTERED_KEY = "tba_visitor_registered";
  var COUNT_EL_ID = "unique-visit-count";
  var TIMEOUT_MS = 10000;

  function show(count) {
    var el = document.getElementById(COUNT_EL_ID);
    if (el && typeof count === "number") el.textContent = count.toLocaleString();
  }

  function request(path, options) {
    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, TIMEOUT_MS) : null;
    options = options || {};
    if (controller) options.signal = controller.signal;
    return fetch(BACKEND_URL + path, options)
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .finally(function () { if (timer) clearTimeout(timer); });
  }

  function getStored(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function setStored(key, value) {
    try { localStorage.setItem(key, value); return true; } catch (e) { return false; }
  }

  function getOrCreateId() {
    var id = getStored(ID_KEY);
    if (id) return id;
    if (!window.crypto || typeof crypto.randomUUID !== "function") return null;
    id = crypto.randomUUID();
    return setStored(ID_KEY, id) ? id : null; // if storage is blocked, don't count (would inflate)
  }

  function fetchCount() {
    return request("/api/visits").then(function (d) { show(d.uniqueVisits); });
  }

  function run() {
    try {
      if (BACKEND_URL.indexOf("YOUR-SERVICE-NAME") !== -1) return; // not configured yet
      var id = getOrCreateId();
      var needsRegister = id && getStored(REGISTERED_KEY) !== id;

      var job = needsRegister
        ? request("/api/visit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ visitorId: id }),
            keepalive: true
          }).then(function (d) {
            setStored(REGISTERED_KEY, id);
            show(d.uniqueVisits);
          })
        : fetchCount();

      job.catch(function () { /* analytics must never break the menu */ });
    } catch (e) { /* ignore */ }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
