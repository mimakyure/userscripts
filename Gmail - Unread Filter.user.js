// ==UserScript==
// @name        Gmail - Unread Filter
// @description Add controls to filter for unread emails and labels
// @namespace   https://github.com/mimakyure
// @author      mimakyure
// @version     2.0.1
// @grant       none
// @match       https://mail.google.com/*
// @homepageURL https://github.com/mimakyure/Userscripts
// @supportURL  https://github.com/mimakyure/Userscripts/issues
// @updateURL   https://raw.github.com/mimakyure/Userscripts/master/Gmail - Unread Filter.user.js
// @license     MIT
// ==/UserScript==

/* TODO:
   - Avoid double search when unread condition is added to newly completed search
*/

(() => {

  // Script variables ==========================================================

  const NS = "gm-gmail-unread-filter";

  // Retrieve filter settings
  // Default email to filter to on, label filter to on
  let email_active = !(localStorage.getItem(`${NS}-email`) === "false");
  let label_active = !(localStorage.getItem(`${NS}-label`) === "false");

  // Track manual removal of email filter
  let filter_deleted = false;


  // Helper functions ==========================================================

  // Add styles to the page for inserted controls
  function addStyle(css, text_id) {

    const ss = document.createElement("style");
    ss.textContent = css;

    if (text_id) {
      ss.id = text_id;
    }
    document.head.appendChild(ss);
  }

  // Return querySelectorAll result
  const $qsa = (sel, elm) => (elm || document).querySelectorAll(sel);

  // Return first result of xpath query
  const $xf = (query, context) => document.evaluate(query, context || document,
      null, XPathResult.FIRST_ORDERED_NODE_TYPE, null, null).singleNodeValue;

  // Return element by id
  const $id = txt_id => document.getElementById(txt_id);

  // Create promise to watch for element matching xpath query
  const $promiseX = query => new Promise(resolve => {

      const obs = new MutationObserver(() => {

        const res = $xf(query);

        if (res) {
          obs.disconnect();
          resolve(res);
        }
      });

      obs.observe(document, {childList: true, subtree: true});
    });

  // Convert style declaration to string
  function stringifyStyle(elm) {

    const cs = getComputedStyle(elm);
    let rules = "";

    for (var prop in cs) {

      if (cs.hasOwnProperty(prop)) {

        rules = `${rules}${cs[prop]}: ${cs.getPropertyValue(cs[prop])};`;
      }
    }

    return rules;
  }

  // Encode for URI hash component
  const hashEncode = str => encodeURIComponent(str).replace("%20", "+");

  // Label filtering ===========================================================

  function activateLabelFilter(menu, env = $id(`${NS}-label`)) {

    env.style.visibility = "visible";

    // Clip menu icon to make space for filter icon
    menu.querySelector("svg").style.clipPath =
        "polygon(0 0, 100% 0, 100% 60%, 55% 60%, 55% 100%, 0 100%)";

    label_active = true;

    $id(`${NS}-style`).disabled = false;
  }

  function removeLabelFilter(menu, env = $id(`${NS}-label`)) {

    env.style.visibility = "hidden";
    menu.querySelector("svg").style.clipPath = "";

    label_active = false;

    $id(`${NS}-style`).disabled = true;
  }

  // Mark labels to hide, analyzing from the last to first label
  function updateReadLabels(lbls) {

    // Hide read labels with no unread sublabels
    // sublabel_read set to 'true' to allow marking of initial/bottom label
    let prev_depth = "MAX";
    let is_read = false;
    let sublabel_read = true;

    for (const lbl of lbls) {

      // Read status indicated unread count not being present
      let curr_depth = lbl.style.marginLeft;
      is_read = !lbl.querySelector("span + div");

      // Hide label if it is read and doesn't have unread sublabels
      if (is_read) {

        if (!(!sublabel_read && curr_depth < prev_depth)) {

          lbl.setAttribute(`${NS}-read-sublabel`, "");
        }
      } else {

        lbl.removeAttribute(`${NS}-read-sublabel`);
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
    const lbl_box = await $promiseX(xp);

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

      localStorage.setItem(`${NS}-label`, label_active)
    }
  }

  async function addLabelFilterToggle() {

    // Envelope character to indicate filter active
    const env = document.createElement("div");
    env.id = `${NS}-label`;
    env.innerHTML = "&#9993;"
    env.style = `height:      1ex;
                 line-height: 1ex;
                 position:    absolute;
                 bottom:      13px;
                 right:       9px;`;

    // SVG belongs to different namespace so use local-name() to get element
    const menu = await $promiseX("//*[local-name()='svg']/parent::div[@role]");
    menu.style.position = "relative";

    // Add inner element to catch clicks before handler toggles menu visibility
    const clicker = document.createElement("div");

    // Mirror style components of parent menu
    clicker.style = `position: absolute;
                     top:      0;
                     left:     0;
                     height:   24px;
                     width:    24px;
                     padding:  12px;`;
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

    addStyle(`div[${NS}-read-sublabel] {
                display: none;
              }`, `${NS}-style`);

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

  // Don't filter folders Gmail handles specially
  function shouldEmailFilter() {

    // These were the only two that I could find
    return !/#spam|#settings/.test(location.hash);
  }

  // Determine search parameter for label
  function hashToSearch(hash) {

    let lbl_str = "";

    switch (hash) {

      case "#label":

        lbl_str = "label:";
        break;

      case "#imp":

        lbl_str = "is:important";
        break;

      case "#starred":

        lbl_str = "is:starred";
        break;

      default:

        lbl_str = hash.replace("#", "in:");
    }

    return lbl_str
  }

  // Add search term for unread emails
  function addEmailFilter() {

    $id(`${NS}-status`).checked = true;

    if (!hasEmailFilter() && shouldEmailFilter()) {

      const hash = location.hash.split("/");
      let lbl_str = "";

      // Use 'in:'/'is:' handling for special labels
      if (!/#all|#search/.test(hash[0])) {

        lbl_str = hashToSearch(hash[0]);
      }

      // #label or #search will have additional hash parameters
      const srch_str = `${lbl_str}${hash[1] || ""} is:unread`;

      location.hash = `#search/${hashEncode(srch_str)}`;
    }
  }

  // Convert search terms into hash
  function searchToHash(srch_str) {

    let new_hash;

    // Handle labels
    // This does not account for grouping operators {}()
    if (!/\s/.test(srch_str) && /^(label|in|is):([^\s]+$)/.test(srch_str)) {

      // Normal labels
      if (RegExp.$1 === "label") {

        new_hash = srch_str.replace("label:", "#label/");

      // Extra special label
      } else if (RegExp.$2 === "important") {

        new_hash = "#imp";

      // Other special labels
      } else {

        new_hash = `#${RegExp.$2}`;
      }

    } else {

      // Modify search
      new_hash = `#search/${hashEncode(srch_str)}`;
    }

    return new_hash;
  }

  // Remove unread emails search parameter
  function removeEmailFilter() {

    if (hasEmailFilter()) {

      $id(`${NS}-status`).checked = false;

      // Remove unread filter
      // hash[1] will always exist if filter is being removed
      const hash1 = decodeURIComponent(location.hash.split("/")[1]).
                    replace(/\bis:unread\b/, "").replace(/\+/g, " ").trim();

      location.hash = hash1 ? searchToHash(hash1) : "#inbox";
    }
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
    localStorage.setItem(`${NS}-email`, email_active);

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
      display:   "block",
      float:     "right",
      width:     "auto",
      height:    "auto",
      margin:    "0 5px",
      padding:   "0 15px 0 11px",
      top:       "50%",
      transform: "perspective(1px) translateY(-50%)"
    });

    // Manually set focus style as can't seem to grab via script as
    // style applied using dynamic class name
    const cs = getComputedStyle(btn);
    const bs_color = cs["box-shadow"].match(/(rgb[^)]*\))/);
    const focus_style = `box-shadow: 0px 1px 2px 0 ${bs_color[0]},
                           0 2px 4px 1px ${bs_color[1]};
                         background-color: rgb(250,250,251)`;

    // Add styling for filter toggle button
    addStyle(
      `#${NS}-toggle {
         ${style}
       }
       #${NS}-toggle:hover,
       #${NS}-toggle:focus {
         ${focus_style}
       }
       #${NS}-toggle * {
         cursor: pointer;
       }
       #${NS}-status {
         margin: 0 5px;
         vertical-align: middle;
       }`);
  }

  // Add button to toggle email filtering
  function addEmailFilterToggle(q) {

    const toggle = document.createElement("button");
    toggle.id = `${NS}-toggle`;
    toggle.type = "button";
    toggle.innerHTML = `<label>
                          <input id='${NS}-status'
                            type='checkbox'>
                            Unread
                        </label>`;

    toggle.addEventListener("click", toggleEmailFilter);

    q.form.parentNode.insertBefore(toggle, q.form.parentNode.firstChild);

    return toggle;
  }

  // Add controls and monitoring for email filtering
  async function setupEmailFilter() {

    const q = await $promiseX("//input[@name='q']");
    const toggle = addEmailFilterToggle(q);

    if (email_active) {

      addEmailFilter();
    }
    watchSearch(q);

    const xp = "//div[@role='button'][contains(text(),'Compose')]";
    const btn = await $promiseX(xp);
    styleEmailToggle(toggle, btn);
  }


  // Add label and email filters to page =======================================

  setupLabelFilter();
  setupEmailFilter();


})();
