// ==UserScript==
// @name        Gmail - Include Nested Labels in Search
// @description Flattens label viewing in Gmail to include emails in nested labels
// @include     https://mail.google.com/*
// @version     1
// @namespace   https://github.com/mimakyure
// @grant       none
// @updateURL   https://raw.github.com/mimakyure/Userscripts/master/Gmail - Include Nested Labels in Search.user.js
// @author      mimakyure 
// @license     MIT
// ==/UserScript==


(() => {

  // Parse label hierarchy (This assumes max depth of 1 nested label)
  function processLabels(lbls) {
    const lblData = [];
    let topLabel;
    let searchLabels;

    lbls.forEach((lbl) => {

      // Label depth identified based on left margin
      const marginLeft = lbl.style.marginLeft;

      // Label names extracted from link
      const link = lbl.querySelector("a");

      if ("0px" === marginLeft) {
        searchLabels = [];

        // Store info for setting up event listeners
        topLabel = {clickTarget: lbl.parentNode.parentNode, searchLabels: ""};

        lblData.push(topLabel);
      }

      searchLabels.push("\"" + link.href.split("#label/").pop() + "\"");
      topLabel.searchLabels = searchLabels.join(" ");
    });

    return lblData;
  }

  // Get labels when page finishes loading them
  function promiseLabels() {

    return new Promise((resolve) => {

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

  // Change action when clicking on top level labels
  function modifyClickAction(lblData) {

    lblData.forEach((topLabel) => {

      topLabel.clickTarget.addEventListener("click", (evt) => {
        const input = document.getElementsByName("q")[0];
        input.value = "label:{" + topLabel.searchLabels + "}";
        input.form.querySelector("button").click();

        evt.stopPropagation();
        evt.preventDefault();
      }, false);
    });
  }

  async function modifyPage() {
    const lbls = await promiseLabels();
    const lblData = processLabels(lbls);
    modifyClickAction(lblData);
  }

  modifyPage();

})();
