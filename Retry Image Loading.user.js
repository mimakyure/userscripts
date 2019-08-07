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

   May need to do more to ensure styles aren't overridden by existing ones.
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


  // Add psuedo-selector/element related CSS to the page
  function addStyle(btn_height, img_count) {

    const style = document.createElement("style");

    style.textContent =
      `.${NS}-menu {
         opacity:    0.5;
       }

       .${NS}-menu > div {
         visibility: hidden;
       }

       .${NS}-menu > div:first-child {
         height:     ${btn_height}px;
         width:      ${btn_height + 4}px;
       }

       .${NS}-menu > div > button {
         height:     0;
         width:      ${btn_height + 4}px;
         background: black;
       }

       img:hover + .${NS}-menu > div:first-child,
       .${NS}-menu:hover > div:last-child > button {
         height:     ${btn_height}px;
         width:      100%;
         visibility: visible;
       }

       .${NS}-menu:hover {
         opacity:    1;
       }

       .${NS}-menu:hover > div:first-child {
         height:     0;
       }

       .${NS}-menu > div > button:hover {
         background: DarkSlateGray;
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

    const img = evt.currentTarget;

    img.removeAttribute(`${NS}-reloading`);

    // Override in-page hiding of unloaded images when reloading done
    if (img.style.display == "none") {

      img.style.display = "";
    }
    img.style.visibilty = "";

    updateNotification(-1);
  }



  // Re-set src attribute on img element to trigger reloading of data
  function refreshSrc(img) {

    // Check if reload already triggered on this img
    if (img.hasAttribute(`${NS}-reloading`)) {

      return;
    }

    // Perform reloading
    img.setAttribute(`${NS}-reloading`, "");
    updateNotification(1);
    addListener(img, "load error", finishLoad);

    img.src = img.src;
  }


  // Attempt to reload image data by refreshing src attribute
  function reloadImg(delay = 0) {

    // Use delay to avoid constant reloading on lost connection
    setTimeout(refreshSrc.bind(null, this), delay);

    // Hide menu button after clicked
    this.nextSibling.style.display = "none";
    return false;
  }


  // Reload all images on the page
  function reloadAllImg() {

    document.querySelectorAll('img').forEach(refreshSrc);

    // Hide menu button after clicked
    this.style.display = "none";
    return false;
  }


  // Create menu for reloading image src
  function createMenu(img) {

    // Set rules directly on elements to help ensure desired styling
    const css = {"shared": "color: white; text-align: center; border: none; border-radius: 0; margin: 0;display: block; box-shadow: none; min-height: 0;",
                 "toggle": `padding: 0; background: black; font-size: ${createMenu.btn_height}px; line-height: ${createMenu.btn_height}px;`,
                 "button": `padding: 0 5px; font-size: 14px;`};

    const menu = document.createElement("div");
    menu.className = `${NS}-menu`;
    menu.setAttribute("style", "position: absolute; z-index: 10;");
    menu.innerHTML = `<div style="${css.shared + css.toggle}">&#183;&#183;&#183;</div>
                      <div>
                        <button type="button" title="Reload Image" style="${css.shared + css.button}">Reload Image</button>
                        <button type="button" title="Reload All Images" style="${css.shared + css.button}">Reload All Images</button>
                      </div>`;

    menu.lastChild.firstElementChild.addEventListener("click", reloadImg.bind(img));
    menu.lastChild.lastElementChild.addEventListener("click", reloadAllImg.bind(menu));

    return menu;
  }


  // Reset menu display and position for future reveal when mouse leaves image
  function leaveImage(evt) {

    const menu = evt.currentTarget.nextSibling;

    menu.style.display = "";

    // Mouse did not move from image to menu
    if (evt.relatedTarget.offsetParent != menu) {

      menu.style.top = "";
    }
  }


  // Reset menu display and position for future reveal when mouse leaves menu
  function leaveMenu(evt) {

    const menu = evt.currentTarget;

    menu.style.display = "";

    // Mouse did not move from menu to image
    if (evt.relatedTarget != menu.previousSibling) {

      menu.style.top = "";
    }
  }


  // Place menu in a convenient location
  function positionMenu() {

    const img = this;
    const menu = img.nextSibling;

    menu.style.top = img.offsetTop + "px";
    menu.style.left = img.offsetLeft + "px";
  }


  // Add reloading menu to targeted images
  function addReloadMenu(img) {

    // Add helper menu only on larger images
    if (img.height*img.width < 40000 || (img.nextSibling && img.nextSibling.className == `${NS}-menu`)) {

      return;
    }

    const menu = createMenu(img);
    img.parentNode.insertBefore(menu, img.nextSibling);

    // Handle menu visibility and positioning
    img.addEventListener("mouseout", leaveImage);
    menu.addEventListener("mouseleave", leaveMenu);
    img.addEventListener("mouseover", positionMenu);
  }


  // Respond to image load error
  function errorHandler(evt) {

    reloadImg.call(evt.currentTarget, 3000);
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

    // Run some initializations
    const btn_height = 24;
    createMenu.btn_height =  btn_height;

    // Track and display count of reloading images
    initNotification();

    const imgs = Array.from(document.getElementsByTagName("img"));

    // Configure and add styles for created elements
    addStyle(btn_height, imgs.length);

    processImages(imgs);
  }

  init();

})();
