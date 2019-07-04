// ==UserScript==
// @name        Retry Image Loading
// @description Automatically tries to reload an image when a load error occurs. Also adds menu for image reloading.
// @namespace   https://github.com/mimakyure
// @author      mimakyure
// @version     1.0.0
// @grant       none
// @match       https://*/*
// @match       http://*/*
// @homepageURL https://github.com/mimakyure/Userscripts
// @supportURL  https://github.com/mimakyure/Userscripts/issues
// @updateURL   https://raw.github.com/mimakyure/Userscripts/master/Retry Image Loading.user.js
// @license     MIT
// ==/UserScript==

/* Comments:
   Another script to compensate for my poor internet connection.

   TODO:
   - Notify while trying auto-reload (allow cancel)
   - Add toggle to hide menu
   - Smaller menu appearance until hovered
 */

(() => {

  const NS = "gm-retry-image-loading";


  // Add CSS to the page
  function addStyle(css) {

    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
  }


  // Attempt to reload image data by refreshing src attribute
  function reloadImg() {

    this.src = this.src;
  }


  // Cleanup after image load
  function loadHandler(evt) {

    const img = this;

    img.removeEventListener("error", reloadImg);
    img.removeEventListener("load", loadHandler);
  }

  // Place menu in a convenient location
  function positionMenu() {

    const img = this;
    const menu = img.nextSibling;

    menu.style.top = img.offsetTop + "px";
    menu.style.left = img.offsetLeft + "px";
  }


  // Make menu visible if it was temporarily hidden after performing a reload
  function unhideMenu() {

    this.nextSibling.style.visibility = "";
  }


  // Create image menu for reloading src
  // Not sure what a good UI would be for this...
  function addReloadMenu(img) {

    const menu = document.createElement("div");
    menu.className = `${NS}-menu`;
    menu.innerHTML =
      `<input type="button" value="Reload Image"
         onclick="const img = this.parentNode.previousSibling;
                  img.src = img.src;
                  this.parentNode.style.visibility = 'hidden';"/>
       <input type="button" value="Reload All Images"
         onclick="document.querySelectorAll('img').forEach(img => {
                    img.src = img.src;
                  });
                  this.parentNode.style.visibility = 'hidden';"/>`;

    img.parentNode.insertBefore(menu, img.nextSibling);
  }


  // Add image reload enhancements
  function processImages() {

    const imgs = document.getElementsByTagName("img");

    for (const img of imgs) {

      // Add helper to manually reload images
      addReloadMenu(img);

      // Handle menu visibility
      img.addEventListener("mouseout", unhideMenu);
      img.addEventListener("mouseover", positionMenu);

      // Attempt to reload images if a load error occurs
      if (!img.complete) {

        img.addEventListener("error", reloadImg);
        img.addEventListener("load", loadHandler);
      }
    }
  }


  // Setup
  function init() {

    // Style menu appearance
    addStyle(`.${NS}-menu {
                visibility: hidden;
                opacity: 0.3;
                position: absolute;
                background-color: black;
                color: white;
                z-index: 10;
                font-size: 10pt;
              }
              img:hover + .${NS}-menu {
                visibility: visible;
              }
              .${NS}-menu:hover {
                visibility: visible;
                opacity: 1;
              }
              .${NS}-menu > input {
                display: block;
                width: 100%;
              }
              .${NS}-menu + input:hover {
                background-color: darkslategray;
              }`);

    processImages();
  }

  init();

})();
