// ==UserScript==
// @name        Gmail - Unread Filter
// @description Adds a toggle to persist 'is:unread' in email searches. Spam folder is ignored to allow Gmail's special handling.
// @include     https://mail.google.com/*
// @version     1.0
// @namespace   https://github.com/mimakyure
// @grant       none
// @updateURL   https://raw.github.com/mimakyure/Userscripts/master/Gmail - Unread Filter.user.js
// @author      mimakyure
// @license     MIT
// ==/UserScript==

/* TODO:
1) Filter label list
*/


(() => {

  // Script variables ==========================================================

  const NAME = "gm-gmail-unread-filter";

  // Retrieve filter settings
  // Default email to filter to on, label filter to off
  let email_active = !(localStorage.getItem(NAME + "-email") === "false");
  let label_active = (localStorage.getItem(NAME + "-label") === "true");

  // Track manual removal of email filter
  let filter_deleted = false;


  // Helper functions ==========================================================

  // Add styles to the page for inserted controls
  function addStyle(css, text_id) {
    const ss = document.createElement("style");
    ss.type = "text/css";
    ss.textContent = css;
    if (text_id) {
      ss.id = text_id;
    }
    document.head.appendChild(ss);
  }

  // Return querySelectorAll result
  function $qsa(sel, elm) {
    return (elm || document).querySelectorAll(sel);
  }

  // Return first result of xpath query
  function $xf(query, context) {
    return document.evaluate(query, context || document, null,
      XPathResult.FIRST_ORDERED_NODE_TYPE, null, null).singleNodeValue;
  }

  // Return element by id
  function $id(txt_id) {
    return document.getElementById(txt_id);
  }

  // Create promise to watch for element matching xpath query as page loads
  function promiseX(query) {

    return new Promise((resolve) => {

      const obs = new MutationObserver(() => {

        const res = $xf(query);

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


  // Label filtering ===========================================================


  function activateLabelFilter(menu, env = $id(NAME + "-label")) {

    env.style.visibility = "visible";

    // Clip menu icon to make space for filter icon
    menu.querySelector("svg").style.clipPath =
      "polygon(0 0, 100% 0, 100% 60%, 55% 60%, 55% 100%, 0 100%)";

    label_active = true;

    $id(NAME + "-style").disabled = false;
  }

  function removeLabelFilter(menu, env = $id(NAME + "-label")) {

    env.style.visibility = "hidden";
    menu.querySelector("svg").style.clipPath = "";

    label_active = false;

    $id(NAME + "-style").disabled = true;
  }

  // Mark labels to hide, analyzing from the last to first label
  function updateReadLabels(lbls) {

    // Hide read labels with no unread sublabels
    let prev_depth = "MAX";
    let is_read = false;
    let sublabel_read = false;

    for (let lbl of lbls) {

      // Unread status indicated by presence of unread count
      let curr_depth = lbl.style.marginLeft;
      is_read = !lbl.querySelector("span + div");

      // Hide label if it is read and doesn't have unread sublabels
      if (is_read) {

        if (!(!sublabel_read && curr_depth < prev_depth)) {

          lbl.setAttribute(NAME + "-read-sublabel", "");
        }
      } else {

        lbl.removeAttribute(NAME + "-read-sublabel");
        sublabel_read = false;
      }

      // Reset count when reaching top
      if (curr_depth == "0px") {

        sublabel_read = false;
      }

      prev_depth = curr_depth;
    }
  }

  // Initialize and monitor label changes
  async function watchLabels() {

    const xp = "//div[@id]/div[position()>1]//" +
               "div[contains(@style,'margin-left')]/../../..";
    const lbl_box = await promiseX(xp);

    // Hide labels based on initial status
    const sel = "div[style*='margin-left']";
    updateReadLabels(Array.from($qsa(sel, lbl_box)).reverse());

    // Trigger update for all mutations since all affect label list
    const obs = new MutationObserver(() => {

      updateReadLabels(Array.from($qsa(sel, lbl_box)).reverse());
    });

    obs.observe(lbl_box, { childList: true, subtree: true });
  }


  // Modify menu button to add view for unread labels
  function toggleLabelFilter(evt) {

    const menu = $xf("ancestor-or-self::div[@aria-expanded]", evt.target);
    const exp = menu.getAttribute("aria-expanded");

    // Label view cycles from ... -> All -> Unread -> Collapsed -> ...
    // Only need to modify behavior if labels are expanded
    if ("true" === exp) {

      // "Unread" state
      if (label_active) {

        removeLabelFilter(menu);

        // "All" state
      } else {

        activateLabelFilter(menu);

        if (evt) {

          evt.stopPropagation();
        }
      }

      localStorage.setItem(NAME + "-label", label_active)
    }
  }

  async function addLabelFilterToggle() {

    // Envelope character to indicate filter active
    const env = document.createElement("div");
    env.id = NAME + "-label";
    env.innerHTML = "&#9993;"
    env.style = `height:   1ex;
                 line-height: 1ex;
                 position:  absolute;
                 bottom:   13px;
                 right:    9px;`;

    // SVG belongs to different namespace so use local-name() to get element
    const menu = await promiseX("//*[local-name()='svg']/parent::div[@role]");
    menu.style.position = "relative";

    // Add inner element to catch clicks before handler toggles menu visibility
    const clicker = document.createElement("div");

    // Mirror style components of parent menu
    clicker.style = `position: absolute;
                     top:   0;
                     left:   0;
                     height:  24px;
                     width:  24px;
                     padding: 12px;`;
    menu.appendChild(clicker);

    if (label_active) {

      activateLabelFilter(menu, env);

    } else {

      removeLabelFilter(menu, env);
    }

    clicker.appendChild(menu.firstChild);
    clicker.appendChild(env);
    clicker.addEventListener("click", toggleLabelFilter, true);
  }

  // Attach filter toggle to menu button and insert indicator for filter active
  function setupLabelFilter() {

    addStyle(`div[` + NAME + `-read-sublabel] {
                display: none;
              }`, NAME + "-style");

    addLabelFilterToggle();

    watchLabels();
  }


  // Email filtering ===========================================================

  // Test if read filter in place
  function hasEmailFilter() {

    const hash = location.hash.split("/");
    return hash.length > 1 &&
           /\bis:(?:un)?read\b/.test(decodeURIComponent(hash[1]));
  }

  // Don't filter spam folder since GMail adds special commands for this folder
  function shouldEmailFilter() {

    return !/#spam/.test(location.hash);

  }

  // Add search term for unread emails
  function addEmailFilter() {

    $id(NAME + "-status").checked = true;

    if (!hasEmailFilter() && shouldEmailFilter()) {

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
  function removeEmailFilter() {

    const hash = location.hash.split("/");
    let new_hash = "#inbox";

    $id(NAME + "-status").checked = false;
    email_active = false;

    // Modify query to remove unread filter in search query
    const hash1 = decodeURIComponent(hash[1] || "").
                  replace(/\+*\bis:unread\b/, "");

    // View has a search string
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

  // Check if filter has been manually deleted
  function checkEmailFilterDeleted(evt) {

    if (email_active && !/\bis:(?:un)?read\b/.test(evt.currentTarget.value)) {

      filter_deleted = true;
    }
  }

  // Maintain filter search term
  function persistEmailFilter() {

    if (filter_deleted) {

      removeEmailFilter();
      filter_deleted = false;

    } else if (email_active) {

      addEmailFilter();
    }
  }

  // Watch for changes in page to actively persist filter
  function watchSearch(q) {

    // Prepare to unset filter on search execution if manually deleted
    q.addEventListener("input", checkEmailFilterDeleted);

    // Monitor changes in the url hash
    window.addEventListener("hashchange", persistEmailFilter);
  }

  // Switch filter state and update search
  function toggleEmailFilter(evt) {

    email_active = !email_active;
    localStorage.setItem(NAME + "-email", email_active);

    if (email_active) {

      addEmailFilter();

    } else {

      removeEmailFilter();
    }
  }

  // Style toggle button to match compose button style
  function styleEmailToggle(toggle, btn) {

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

  // Add button to toggle email filtering
  function addEmailFilterToggle(q) {

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

  // Add controls and monitoring for email filtering
  async function setupEmailFilter() {

    const q = await promiseX("//input[@name='q']");
    const toggle = addEmailFilterToggle(q);

    if (email_active) {

      addEmailFilter();
    }
    watchSearch(q);

    const xp = "//div[@role='button'][contains(text(),'Compose')]";
    const btn = await promiseX(xp);
    styleEmailToggle(toggle, btn);
  }


  // Add label and email filters to page =======================================

  setupLabelFilter();
  setupEmailFilter();


})();
