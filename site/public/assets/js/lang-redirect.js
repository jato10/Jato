/* Sends first-time visitors at "/" to their language, without trapping anyone.
   The gateway page stays fully usable when this never runs. */
(function () {
  'use strict';
  var supported = ["en","es"];
  var fallback = "en";
  try {
    if (sessionStorage.getItem('gb-lang-gate') === 'seen') return;
    sessionStorage.setItem('gb-lang-gate', 'seen');
  } catch (error) { /* private mode: just redirect once */ }
  var preferred = (navigator.languages || [navigator.language || fallback])
    .map(function (tag) { return String(tag).slice(0, 2).toLowerCase(); })
    .filter(function (tag) { return supported.indexOf(tag) !== -1; })[0] || fallback;
  location.replace('/' + preferred + '/');
})();
