// ==UserScript==
// @name        Prev-Next Navigation Hotkeys
// @description Adds left/right arrow hotkeys to navigate 'next'/'prev' links
// @namespace   https://github.com/mimakyure
// @author      mimakyure
// @version     1.1.0
// @require     https://greasemonkey.github.io/gm4-polyfill/gm4-polyfill.js
// @grant       GM.openInTab
// @grant       GM_openInTab
// @match       https://*/*
// @match       http://*/*
// @homepageURL https://github.com/mimakyure/Userscripts
// @supportURL  https://github.com/mimakyure/Userscripts/issues
// @updateURL   https://raw.github.com/mimakyure/Userscripts/master/Prev-Next Navigation Hotkeys.user.js
// @license     MIT
// ==/UserScript==


(() => {

  const $xf = query => document.evaluate(query, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null, null).singleNodeValue;


  function navigatePage(prev, next, evt) {

    // Do not navigate if text is being edited
    if (evt.target.nodeName == "INPUT" || evt.target.nodeName == "TEXTAREA" || evt.target.isContentEditable) {

      return;
    }

    const nav = evt.ctrlKey ? href => GM.openInTab(href) : href => window.location = href;

    // Left arrow pressed
    if (evt.keyCode == 37 && prev) {

      nav(prev.href);

    // Right arrow pressed
    } else if (evt.keyCode == 39 && next) {

      nav(next.href);
    }
  }


  function init() {

    // Use additional criteria to limit chances of incorrect matching of words starting with 'prev'
    const prev = $xf("//a[starts-with(translate(.,'PREV','prev'),'prev ')]|" +
                     "//a[contains(translate(.,'PREVIOUS','previous'),'previous')]|" +
                     "//a[translate(substring(.,string-length(.)-string-length('prev')+1),'PREV','prev')='prev']");

    const next = $xf("//a[contains(translate(.,'NEXT','next'),'next')]");

    if (prev || next) {

      window.addEventListener("keyup", navigatePage.bind(null, prev, next));
    }
  }

  init();

})();
