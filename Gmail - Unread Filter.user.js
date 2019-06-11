// ==UserScript==
// @name        Gmail - Unread Filter
// @description Adds a toggle to persist 'is:unread' in email searches. Spam folder is ignored to allow Gmail's special handling.
// @include     https://mail.google.com/*
// @version     1.0
// @namespace   https://github.com/mimakyure
// @grant       none
// @updateURL   https://raw.github.com/mimakyure/Userscripts/master/Gmail - Unread Filter.user.js
// @author      Matthew Imakyure
// @license     MIT
// ==/UserScript==

/* TODO:
1) Filter label list
*/


(() => {

  // Script variables ==========================================================

  const NAME = "gm-gmail-unread-filter";

  // Retrive filter setting, default to filter on
  let filter_active = !(localStorage.getItem(NAME + "-active") === "false");
  // Track manual removal of email filter
  let filter_deleted = false;

  // Helper functions ==========================================================

  // Add styles to the page for inserted controls
  function addStyle(css) {
    const ss = document.createElement("style");
    ss.type = "text/css";
    ss.textContent = css;
    document.head.appendChild(ss);
  }

  // Return first result of xpath query
  function xf(xp, context) {
    return document.evaluate(xp, context || document, null,
      XPathResult.FIRST_ORDERED_NODE_TYPE, null, null).singleNodeValue;
  }

  // Create promise to watch for element matching xpath query as page loads
  function promiseX(xp_query) {


    return new Promise((resolve) => {

      const obs = new MutationObserver(() => {

        const res = xf(xp_query);

        if (res) {
          obs.disconnect();
          resolve(res);
        }
      });

      obs.observe(document, {childList: true, subtree: true});
    })
  }

  // Convert style declaration to string
  function stringifyStyle(elm) {
    const cs = getComputedStyle(elm);
    let style_rules = "";

    for (var n_prop in cs) {

      if (cs.hasOwnProperty(n_prop)) {

        style_rules = style_rules + cs[n_prop] + ":" +
          cs.getPropertyValue(cs[n_prop]) + ";";
      }
    }

    return style_rules;
  }

  // Page specific functions ===================================================

  // Test if read filter in place
  function hasFilter() {

    const hash = location.hash.split("/");
    return hash.length > 1 &&
           /\bis:(?:un)?read\b/.test(decodeURIComponent(hash[1]));
  }

  // Don't filter spam folder since GMail adds special commands for this folder
  function shouldFilter() {

    return !/#spam/.test(location.hash);

  }

  // Add search term for unread emails
  function addFilter() {

    const status = document.getElementById(NAME + "-status");
    status.checked = true;

    if (!hasFilter() && shouldFilter()) {

      const hash = location.hash.split("/");

      let fldr_str = "";

      // Use 'in:' handling for special labels
      if (!/#inbox|#search/.test(hash[0])) {

        fldr_str = (hash[0] == "#label") ?
          "label:" :
          hash[0].replace("#", "in:") + " ";
      }

      const srch_str = fldr_str + ((hash[1] || "") + " is:unread").trim();

      location.hash = "#search/" + srch_str;
    }
  }

  // Remove search for unread emails
  function removeFilter() {

    const status = document.getElementById(NAME + "-status");
    const hash = location.hash.split("/");
    let new_hash = "#inbox";

    status.checked = false;
    filter_active = false;

    // Modify query to remove unread filter in search query
    const hash1 = decodeURIComponent(hash[1] || "").
                  replace(/\+*\bis:unread\b/, "");

    if (hash1) {

      // Handle special folders
      if (/in:(snoozed|spam|drafts)/.test(hash1)) {

        new_hash = "#" + RegExp.$1;

      } else {

        new_hash = hash[0] + "/" + encodeURIComponent(hash1);
      }
    }


    location.hash = new_hash;
  }

  // Maintain filter search term
  function persistFilter() {

    if (filter_deleted) {

      removeFilter();
      filter_deleted = false;

    } else if (filter_active) {

      addFilter();
    }
  }

  // Watch for changes in page to actively persist filter
  function watchSearch(q) {

    // Prepare to unset filter on search execution if manually deleted
    q.addEventListener("input", () => {

      if (filter_active && !/\bis:(?:un)?read\b/.test(q.value)) {
        filter_deleted = true;
      }
    });

    // Monitor changes in the url hash
    window.addEventListener("hashchange", persistFilter);
  }

  // Switch filter state and update search
  function toggleFilter(evt) {

    filter_active = !filter_active;
    localStorage.setItem(NAME + "-active", filter_active);

    if (filter_active) {
      addFilter();

    } else {
      removeFilter();

    }
  }

  // Add button to control filtering
  function addToggle(q) {

    const toggle = document.createElement("button");
    toggle.id = NAME + "-toggle";
    toggle.type = "button";
    toggle.innerHTML = `<label>
                          <input id='` + NAME + `-status' 
                            type='checkbox' 
                            style='margin: 0 5px; vertical-align: middle;'>
                            Unread
                        </label>`;

    toggle.addEventListener("click", toggleEmailFilter);

    q.form.parentNode.insertBefore(toggle, q.form.parentNode.firstChild);

    return toggle;
  }

  // Style toggle button to match compose button style
  function styleToggle(toggle, btn) {

    let style = stringifyStyle(btn);

    // Adjust specific CSS properties
    Object.assign(toggle.style, {
      display: "block",
      float: "right",
      width: "auto",
      height: "auto",
      margin: "0 5px",
      padding: "0 15px 0 11px",
      top: "50%",
      transform: "perspective(1px) translateY(-50%)"
    });

    // Manually set focus style as can't seem to grab via script as
    // style applied using dynamic class name
    const cs = getComputedStyle(btn);
    const bs_color = cs["box-shadow"].match(/(rgb[^)]*\))/);
    const focus_style = "box-shadow: 0px 1px 2px 0px " + bs_color[0] +
      ", 0px 2px 4px 1px " + bs_color[1] +
      "; background-color: rgb(250,250,251)";

    // Add styling for filter toggle button
    addStyle(
      `button#` + NAME + `-toggle {`
      + style + `}
    button#` + NAME + `-toggle:hover, button#` + NAME + `-toggle:focus {`
      + focus_style + `}`);
  }

  async function modifyPage() {
    addStyle("." + NAME + "-read-label { display: none; }");

    const q = await promiseX("//input[@name='q']");
    const toggle = addToggle(q);

    if (filter_active) {
      addFilter();
    }
    watchSearch(q);

    const xp = "//div[@role='button'][contains(text(),'Compose')]";
    const btn = await promiseX(xp);
    styleToggle(toggle, btn);
  }

  modifyPage();


})();