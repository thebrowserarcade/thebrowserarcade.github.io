/*
 * visitor-analytics.js — anonymous unique-browser counter.
 * Host this file on GitHub Pages with your site. Add to index.html:
 *   <script src="visitor-analytics.js" defer></script>
 * Optionally show the count anywhere with:
 *   <span id="unique-visit-count"></span>  (total)
 *   <span id="visits-24h"></span>  (last 24 hours)
 *   <span id="visits-7d"></span>  (last 7 days)
 */
(function () {
  "use strict";

  // ===== CONFIGURE HERE: your Render backend URL (no trailing slash) =====
  var BACKEND_URL = "https://visitor-analytics-backend-1.onrender.com";
  // =======================================================================

  var ID_KEY = "tba_visitor_id";
  var PING_KEY = "tba_visitor_last_ping";
  var PING_EVERY_MS = 6 * 60 * 60 * 1000; // check in at most every 6 hours
  var COUNT_EL_ID = "unique-visit-count";
  var TIMEOUT_MS = 10000;

  function setText(id, v) {
    var el = document.getElementById(id);
    if (el && typeof v === "number") el.textContent = v.toLocaleString();
  }
  function show(d) {
    setText(COUNT_EL_ID, d.uniqueVisits); // total unique visitors
    setText("visits-24h", d.last24Hours); // visitors active in last 24 hours
    setText("visits-7d", d.last7Days);    // visitors active in last 7 days
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
    return request("/api/visits").then(show);
  }

  function run() {
    try {
      if (BACKEND_URL.indexOf("YOUR-SERVICE-NAME") !== -1) return; // not configured yet
      var id = getOrCreateId();
      var needsRegister = id && !(Date.now() - Number(getStored(PING_KEY)) < PING_EVERY_MS);

      var job = needsRegister
        ? request("/api/visit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ visitorId: id }),
            keepalive: true
          }).then(function (d) {
            setStored(PING_KEY, String(Date.now()));
            show(d);
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
