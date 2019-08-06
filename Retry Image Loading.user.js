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
   - Add toggle to hide menu
   - Smaller menu appearance until hovered
 */

(() => {

  const NS = "gm-retry-image-loading";


  // Attach a self-removing event listener
  function addListener(elm, types_str, callback) {

    // Handle multiple event types
    const types = types_str.split(" ");

    const cb = evt => {

      callback(evt);

      types.forEach(type => {

        elm.removeEventListener(type, cb);
      });
    };

    types.forEach(type => {

      elm.addEventListener(type, cb);
    });

  }


  // Add CSS to the page
  function addStyle(img_count) {

    const style = document.createElement("style");

    style.textContent =
      `.${NS}-menu {
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
       }
       #${NS}-notify:before {
         content:    'Reloading images: ';
       }
       #${NS}-notify:after {
         content: ' / ${img_count}';
       }`;

    document.head.appendChild(style);
  }


  // Hide count of auto-reloading items
  function hideNotification() {

    hideNotification.tid = setTimeout(() => {

      const notify = document.getElementById(`${NS}-notify`);
      notify.style.height     = 0;
      notify.style.visibility = "hidden";

    }, 3000);
  }


  // Make visible count of reloading images
  function showNotification(count) {

    clearTimeout(hideNotification.tid);

    const notify = document.getElementById(`${NS}-notify`);
    notify.textContent      = count;
    notify.style.height     = "";
    notify.style.visibility = "visible";

    if (!count) {

      hideNotification();
    }
  }


  // Update acount of auto-reloading items
  function updateNotification(inc) {

    updateNotification.count += inc;
    showNotification(updateNotification.count);
  }


  // Setup notification of current image reload count
  function initNotification() {

    const notify = document.createElement("div");
    notify.id = `${NS}-notify`;
    notify.textContent = "0";
    notify.setAttribute("style", "position: fixed; top: 0; right: 0; height: 0; padding: 5px; visibility: hidden; background: black; opacity: 0.5;");

    document.body.appendChild(notify);

    updateNotification.count = 0;
  }


  // Update indicators to show reload completed
  function finishLoad(evt) {

    updateNotification(-1);
  }


  // Attempt to reload image data by refreshing src attribute
  function reloadImg() {

    updateNotification(1);
    addListener(img, "load error", finishLoad);
    this.src = this.src;
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

    // Add helper menu only on larger images
    if (img.height*img.width < 40000 || (img.nextSibling && img.nextSibling.className == `${NS}-menu`)) {

      return;
    }

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

    // Handle menu visibility
    img.addEventListener("mouseout", unhideMenu);
    img.addEventListener("mouseover", positionMenu);
  }


  // Respond to image load error
  function errorHandler(evt) {

    reloadImg.call(evt.currentTarget);
    addReloadMenu(evt.currentTarget);
  }


  // Followup after successful load
  function loadHandler(evt) {

    const img = evt.currentTarget;

    addReloadMenu(img);

    img.removeEventListener("error", errorHandler);
    img.removeEventListener("load", loadHandler);
  }


  // Monitor image loading to run reload enhancements
  function processImages(imgs) {

    imgs.filter(img => !img.complete).forEach(img => {

      img.addEventListener("error", errorHandler);
      img.addEventListener("load", loadHandler);
    });
  }


  // Setup
  function init() {

    // Track and display count of reloading images
    initNotification();

    const imgs = Array.from(document.getElementsByTagName("img"));

    // Style menu appearance
    addStyle(img.length);

    processImages(imgs);
  }

  init();

})();
