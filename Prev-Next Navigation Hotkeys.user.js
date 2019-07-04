// ==UserScript==
// @name        Prev-Next Navigation Hotkeys
// @description Adds left/right arrow hotkeys to navigate prev/next links in page
// @namespace   https://github.com/mimakyure
// @author      mimakyure
// @version     1.0.0
// @grant       none
// @match       https://*/*
// @match       http://*/*
// @homepageURL https://github.com/mimakyure/Userscripts
// @supportURL  https://github.com/mimakyure/Userscripts/issues
// @updateURL   https://raw.github.com/mimakyure/Userscripts/master/Prev-Next Navigation Hotkeys.user.js
// @license     MIT
// ==/UserScript==


(() => {

  function $xf(query) {
    return document.evaluate(query, document, null,
           XPathResult.FIRST_ORDERED_NODE_TYPE, null, null).singleNodeValue;
  }

  function navigatePage(prev, next, evt) {

    // Do not navigate if text is being edited
    if (evt.target.nodeName == "INPUT" ||
        evt.target.nodeName == "TEXTAREA" ||
        evt.target.isContentEditable) {
      return;
    }

    // Left arrow pressed
    if (evt.keyCode == 37 && prev) {

      window.location = prev.href;

    // Right arrow pressed
    } else if (evt.keyCode == 39 && next) {

      window.location = next.href;
    }
  }

  function init() {

    // Don't match non-targeted words starting with 'prev'
    const prev = $xf(
      "//a[starts-with(translate(.,'PREV','prev'),'prev ')]|" +
      "//a[starts-with(translate(.,'PREVIOUS','previous'),'previous')]|" +
      "//a[translate(substring(.,string-length(.)-string-length('prev')+1)," +
        "'PREV','prev')='prev']");

    const next = $xf("//a[starts-with(translate(.,'NEXT','next'),'next')]");

    if (prev || next) {
      window.addEventListener("keyup", navigatePage.bind(null, prev, next));
    }
  }

  init();

})();
