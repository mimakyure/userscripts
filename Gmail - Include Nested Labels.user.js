// ==UserScript==
// @name        Gmail - Include Nested Labels
// @description Flattens label viewing in Gmail to include emails in nested labels
// @namespace   https://github.com/mimakyure
// @author      mimakyure
// @version     1.0.0
// @grant       none
// @match       https://mail.google.com/*
// @homepageURL https://github.com/mimakyure/Userscripts
// @supportURL  https://github.com/mimakyure/Userscripts/issues
// @updateURL   https://raw.github.com/mimakyure/Userscripts/master/Gmail - Include Nested Labels.user.js
// @license     MIT
// ==/UserScript==

/* TODO:
   - Handle multiply nested labels
 */


(() => {

  // Get labels when page finishes loading them
  function promiseLabels() {

    return new Promise(resolve => {

      const obs = new MutationObserver(() => {

        const q = "div:last-child > div:last-child > " +
          "div.aim div[style*='margin-left']"
        const lbls = document.querySelectorAll(q);

        if (lbls.length > 0) {
          obs.disconnect();
          resolve(lbls);
        }
      });

      obs.observe(document, {childList: true, subtree: true});
    });
  }

  // Parse label hierarchy (This assumes max depth of 1 nested label)
  function processLabels(lbls) {
    const lblData = [];
    let searchLabels = [];

    // Roll up nested labels into their parent label
    for (const i = lbls.length - 1, lbl; lbl = lbls[i]; i--) {

      // Label names extracted from link
      const link = lbl.querySelector("a");
      searchLabels.push("\"" + link.href.split("#label/").pop() + "\"");

      // Label depth identified based on left margin
      if ("0px" === lbl.style.marginLeft) {

        // Store info for setting up event listeners
        if (searchLabels.length > 1) {

          lblData.push({clickTarget: link.parentNode.parentNode,
            searchLabels: searchLabels.reverse().join(" ")});
        }

        searchLabels = [];
      }
    };

    return lblData;
  }

  // Helper to create event listeners
  function makeClickHandler(searchLabels) {

    return evt => {
      const input = document.getElementsByName("q")[0];
      input.value = "label:{" + searchLabels + "}";
      input.form.querySelector("button:last-of-type").click();

      evt.stopPropagation();
      evt.preventDefault();
    };
  }

  // Change action when clicking on top level labels
  function modifyClickAction(lblData) {

    lblData.forEach(topLabel => {
      topLabel.clickTarget.addEventListener("click",
        makeClickHandler(topLabel.searchLabels), false);
    });
  }

  // Watch for future changes in the label list
  function watchLabels(lblBox) {

    const obs = new MutationObserver(mutations => {

      const lbls = mutations.map(mutation => mutation.addedNodes[0].
        querySelector("div[style*='margin-left']"));
      const lblData = processLabels(lbls);

      modifyClickAction(lblData);
    });

    obs.observe(lblBox, {childList: true, subtree: true});
  }

  async function modifyPage() {
    const lbls = await promiseLabels();
    const lblData = processLabels(lbls);

    modifyClickAction(lblData);
    watchLabels(lbls[0].parentNode.parentNode.parentNode);
  }

  modifyPage();

})();
