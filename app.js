var firebaseConfig = {
    apiKey: "AIzaSyBM8k1SltnksCRZ5NvgggfQ952H3DZIyDY",
    authDomain: "readium-33755.firebaseapp.com",
    databaseURL: "https://readium-33755-default-rtdb.firebaseio.com",
    projectId: "readium-33755",
    storageBucket: "readium-33755.firebasestorage.app",
    messagingSenderId: "1062133935488",
    appId: "1:1062133935488:web:a00716635022a998f32565"
  };
  firebase.initializeApp(firebaseConfig);
  var auth = firebase.auth();
  var db = firebase.database();

  var messagesRef = null;
  var roomListRef = null;
  var openGamesRef = null;
  var dmReqRef = null;
  var dmReqListRef = null;
  var dmConvoRef = null;
  var dmReqSeen = {};
  var dmReqFirst = true;
  var dmConvosRef = null;
  var dmMsgWatch = {};
  var mentionRef = null;
  var pinsRef = null;
  var dashReportsRef = null;
  var dashBansRef = null;
  var hoodFeedRef = null;
  var hoodCommentsRefs = {};
  var banMinutes = 10;
  var wantHood = false;
  var wantSuggest = false;
  var suggestRef = null;
  var suggestCommentsRefs = {};
  var suggestType = "idea";
  var suggestTab = "open";
  function sugIsRejected(s) { return !!(s && s.rejected); }
  var suggestData = null;
  var wantMsgs = false;
  var wantGames = false;
  var msgEls = {};
  var replyTarget = null;
  var editingId = null;
  var typingRef = null;
  var typingLast = 0;
  var chatReturn = "msgs";
  var usersByName = {};
  var ppUid = null;
  var firstAuth = true;
  var msgTimes = [];
  var mutedUntil = 0;
  var muteTimer = null;
  var painting = false;
  var isMod = false;
  var isFounder = false;
  var chatNearBottom = true;
  var confirmCb = null;
  var confirmNotes = false;
  var dmHas = false;
  var mentionHas = false;
  var presenceRef = null;
  var onlineListRef = null;
  var currentRefPath = null;
  var currentConvoKey = null;
  var currentChatTitle = null;

  /* ---------- word filter (catches tricks) ---------- */
  var BANNED = ["fuck","fucking","fucker","motherfucker","shit","shitty","bitch","bitches","bitchy","ass","asshole","dick","dickhead","pussy","cunt","whore","slut","slutty","bastard","tits","titty","boob","boobs","cock","cum","dildo","porn","hentai","nigger","nigga","faggot","fag","retard","retarded","horny","masturbate","sexy"];
  function leetReplace(s) {
    return String(s).toLowerCase()
      .replace(/0/g, "o").replace(/1/g, "i").replace(/3/g, "e").replace(/4/g, "a")
      .replace(/5/g, "s").replace(/7/g, "t").replace(/@/g, "a").replace(/\$/g, "s")
      .replace(/!/g, "i").replace(/\+/g, "t");
  }
  function lightNorm(s) { return leetReplace(s).replace(/(.)\1+/g, "$1"); }
  function aggroNorm(s) { return lightNorm(s).replace(/[^a-z]/g, ""); }
  var BANNED_NORM = [];
  for (var bi = 0; bi < BANNED.length; bi++) { BANNED_NORM.push(aggroNorm(BANNED[bi])); }
  /* innocent words that happen to contain a banned chunk */
  var SAFE_WORDS = ["password","classic","class","pass","grass","mass","bass","assist","asset","document","cucumber","title","peacock","scunthorpe","shitake","cocktail"];
  var SAFE_NORM = [];
  for (var si = 0; si < SAFE_WORDS.length; si++) { SAFE_NORM.push(aggroNorm(SAFE_WORDS[si])); }
  /* short banned words get a fuzzy boundary check so "was"/"has"/"ask" don't trip it */
  function fuzzyShortRe(norm) {
    return new RegExp("(^|[^a-z])" + norm.split("").join("[^a-z]*") + "([^a-z]|$)");
  }
  function filterHit(s) {
    var light = lightNorm(s);
    var n = light.replace(/[^a-z]/g, "");
    for (var i = 0; i < SAFE_NORM.length; i++) {
      if (SAFE_NORM[i]) { n = n.split(SAFE_NORM[i]).join(""); }
    }
    for (var j = 0; j < BANNED_NORM.length; j++) {
      var b = BANNED_NORM[j];
      if (!b) { continue; }
      if (b.length >= 4) {
        if (n.indexOf(b) !== -1) { return true; }
      } else {
        if (fuzzyShortRe(b).test(light)) { return true; }
      }
    }
    return false;
  }
  function hasBannedWord(s) { return filterHit(s); }
  /* simple inline starring for the obvious cases */
  var BANNED_RE = new RegExp("\\b(" + BANNED.join("|") + ")\\b", "gi");
  function censor(s) { return String(s).replace(BANNED_RE, "****"); }
  /* custom text emojis — plain ASCII so every Kindle can show them */
  var EMOJIS = ["<3", ":D", ":3", ":O", ":(", "+1", "-1"];

  /* ---------- city -> timezone ---------- */
  var CITY_TZ = {
    "navarre": "America/Chicago", "pensacola": "America/Chicago", "destin": "America/Chicago",
    "gulf breeze": "America/Chicago", "milton": "America/Chicago", "fort walton beach": "America/Chicago",
    "new york": "America/New_York", "nyc": "America/New_York", "buffalo": "America/New_York",
    "philadelphia": "America/New_York", "pittsburgh": "America/New_York", "boston": "America/New_York",
    "baltimore": "America/New_York", "washington": "America/New_York", "washington dc": "America/New_York",
    "atlanta": "America/New_York", "miami": "America/New_York", "orlando": "America/New_York",
    "tampa": "America/New_York", "jacksonville": "America/New_York", "charlotte": "America/New_York",
    "cleveland": "America/New_York", "columbus": "America/New_York", "cincinnati": "America/New_York",
    "detroit": "America/Detroit", "indianapolis": "America/Indiana/Indianapolis", "louisville": "America/Kentucky/Louisville",
    "chicago": "America/Chicago", "houston": "America/Chicago", "dallas": "America/Chicago",
    "austin": "America/Chicago", "san antonio": "America/Chicago", "nashville": "America/Chicago",
    "memphis": "America/Chicago", "new orleans": "America/Chicago", "st louis": "America/Chicago",
    "kansas city": "America/Chicago", "minneapolis": "America/Chicago", "milwaukee": "America/Chicago",
    "oklahoma city": "America/Chicago",
    "denver": "America/Denver", "phoenix": "America/Phoenix", "salt lake city": "America/Denver",
    "los angeles": "America/Los_Angeles", "la": "America/Los_Angeles", "san francisco": "America/Los_Angeles",
    "san diego": "America/Los_Angeles", "san jose": "America/Los_Angeles", "seattle": "America/Los_Angeles",
    "portland": "America/Los_Angeles", "las vegas": "America/Los_Angeles",
    "honolulu": "Pacific/Honolulu", "anchorage": "America/Anchorage",
    "toronto": "America/Toronto", "vancouver": "America/Vancouver", "montreal": "America/Toronto",
    "mexico city": "America/Mexico_City", "sao paulo": "America/Sao_Paulo",
    "buenos aires": "America/Argentina/Buenos_Aires",
    "london": "Europe/London", "paris": "Europe/Paris", "berlin": "Europe/Berlin",
    "rome": "Europe/Rome", "madrid": "Europe/Madrid", "amsterdam": "Europe/Amsterdam",
    "moscow": "Europe/Moscow", "dublin": "Europe/Dublin", "stockholm": "Europe/Stockholm",
    "cairo": "Africa/Cairo", "lagos": "Africa/Lagos", "johannesburg": "Africa/Johannesburg",
    "nairobi": "Africa/Nairobi", "dubai": "Asia/Dubai", "mumbai": "Asia/Kolkata",
    "delhi": "Asia/Kolkata", "kolkata": "Asia/Kolkata", "bangkok": "Asia/Bangkok",
    "singapore": "Asia/Singapore", "hong kong": "Asia/Hong_Kong", "beijing": "Asia/Shanghai",
    "shanghai": "Asia/Shanghai", "tokyo": "Asia/Tokyo", "seoul": "Asia/Seoul",
    "jakarta": "Asia/Jakarta", "manila": "Asia/Manila",
    "sydney": "Australia/Sydney", "melbourne": "Australia/Melbourne", "auckland": "Pacific/Auckland"
  };

  /* ---------- pixel pfps (canvas -> PNG, works everywhere) ---------- */
  var PALETTE = ["#ffffff", "#bbbbbb", "#666666", "#111111"];
  var pfpCache = {};
  function blankPfp() {
    // default face: gray bg (1), dark eyes and smile (3)
    var rows = [
      "1111111111111111",
      "1111111111111111",
      "1131111111111311",
      "1131111111111311",
      "1111111111111111",
      "1111111111111111",
      "1111111111111111",
      "1111311111113111",
      "1111133333331111",
      "1111111111111111",
      "1111111111111111",
      "1111111111111111",
      "1111111111111111",
      "1111111111111111",
      "1111111111111111",
      "1111111111111111"
    ];
    return rows.join("");
  }
  function pfpURL(pfpStr) {
    if (pfpCache[pfpStr]) { return pfpCache[pfpStr]; }
    var url = "";
    try {
      var cv = document.createElement("canvas");
      cv.width = 16; cv.height = 16;
      var ctx = cv.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 16, 16);
      for (var y = 0; y < 16; y++) {
        for (var x = 0; x < 16; x++) {
          var ci = pfpStr.charAt(y * 16 + x);
          if ("123".indexOf(ci) !== -1) {
            ctx.fillStyle = PALETTE[parseInt(ci, 10)];
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }
      url = cv.toDataURL("image/png");
    } catch (e) { url = ""; }
    pfpCache[pfpStr] = url;
    return url;
  }
  var pfpUserCache = {};
  function fillPfpImg(img, uid) {
    if (!uid) { return; }
    if (pfpUserCache[uid]) { img.src = pfpURL(pfpUserCache[uid]); return; }
    db.ref("users/" + uid + "/pfp").once("value", function (snap) {
      var s = snap.val() || blankPfp();
      pfpUserCache[uid] = s;
      try { img.src = pfpURL(s); } catch (e) {}
    });
  }
  function pfpImg(pfpStr, px) {
    var img = document.createElement("img");
    img.className = "pfp";
    img.src = pfpURL(pfpStr || blankPfp());
    img.style.width = (16 * px) + "px";
    img.style.height = (16 * px) + "px";
    img.alt = "";
    return img;
  }

  /* ---------- online presence ---------- */
  function isOnlineListOn() {
    try { return localStorage.getItem("readium_online_list") === "1"; } catch (e) { return false; }
  }
  function startPresence() {
    var u = auth.currentUser;
    if (!u) { return; }
    stopPresence();
    presenceRef = db.ref("presence/" + u.uid);
    var ref = presenceRef;
    var uid = u.uid;
    var writePresence = function () {
      db.ref("users/" + uid + "/name").once("value", function (snap) {
        var nm = snap.val() || displayName();
        ref.onDisconnect().remove();
        ref.set({ name: nm, at: firebase.database.ServerValue.TIMESTAMP });
      });
    };
    db.ref(".info/connected").on("value", function (snap) {
      if (snap.val() === true) { writePresence(); }
    });
  }
  function stopPresence() {
    try { db.ref(".info/connected").off(); } catch (e) {}
    if (presenceRef) {
      try { presenceRef.remove(); } catch (e2) {}
      presenceRef = null;
    }
  }
  function watchOnline() {
    if (onlineListRef) { onlineListRef.off(); }
    onlineListRef = db.ref("presence");
    onlineListRef.on("value", function (snap) { renderOnline(snap.val()); });
  }
  function renderOnline(data) {
    var box = document.getElementById("online-list");
    if (!box) { return; }
    box.innerHTML = "";
    var now = Date.now();
    var rows = [];
    if (data) {
      var keys = Object.keys(data);
      for (var i = 0; i < keys.length; i++) {
        var v = data[keys[i]] || {};
        if (now - (v.at || 0) > 5 * 60 * 1000) { continue; }
        if (v.name) { rows.push({ name: v.name, uid: keys[i] }); }
      }
    }
    rows.sort(function (a, b) {
      var x = a.name.toLowerCase(), y = b.name.toLowerCase();
      return x < y ? -1 : x > y ? 1 : 0;
    });
    document.getElementById("online-count").textContent = rows.length;
    if (!rows.length) { box.innerHTML = "<p>nobody yet</p>"; return; }
    for (var j = 0; j < rows.length; j++) {
      (function (r) {
        var row = document.createElement("div");
        row.className = "online-row";
        var dot = document.createElement("span");
        dot.className = "on-dot";
        var btn = document.createElement("button");
        btn.className = "on-name";
        btn.textContent = r.name;
        btn.onclick = function () { openProfileByName(r.name); };
        row.appendChild(dot);
        row.appendChild(btn);

        box.appendChild(row);
      })(rows[j]);
    }
  }
  function updateOnlinePanel() {
    var on = isOnlineListOn();
    var panel = document.getElementById("online-panel");
    if (panel) { panel.className = on ? "" : "hidden"; }
    var tgl = document.getElementById("set-online-toggle");
    if (tgl) { tgl.textContent = "online list: " + (on ? "on" : "off"); }
    if (on && auth.currentUser) { watchOnline(); }
    else if (onlineListRef) { onlineListRef.off(); onlineListRef = null; }
  }
  document.getElementById("set-online-toggle").onclick = function () {
    var on = !isOnlineListOn();
    try { localStorage.setItem("readium_online_list", on ? "1" : "0"); } catch (e) {}
    updateOnlinePanel();
  };

  /* ---------- helpers ---------- */
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function showError(msg) { document.getElementById("error").textContent = msg; }
  function clearError() { document.getElementById("error").textContent = ""; }
  function showRoomError(msg) { document.getElementById("room-error").textContent = msg; }
  function showJoinError(msg) { document.getElementById("join-error").textContent = msg; }
  function showDmError(msg) { document.getElementById("dm-error").textContent = msg; document.getElementById("dm-ok").textContent = ""; }
  function showDmOk(msg) { document.getElementById("dm-ok").textContent = msg; document.getElementById("dm-error").textContent = ""; }
  function myUid() { return auth.currentUser ? auth.currentUser.uid : null; }
  function displayName() {
    var u = auth.currentUser;
    return u ? (u.displayName || "Reader") : "Reader";
  }
  function showScreen(id) {
    var screens = ["home-screen", "msgs-screen", "mentions-screen", "hood-screen", "suggest-screen", "store-screen", "board-screen", "create-screen", "join-screen", "dm-screen", "dash-screen", "profile-screen", "settings-screen", "pfp-screen", "chat-screen", "games-screen", "gamemenu-screen", "life-screen", "ttt-screen", "c4-screen", "chess-screen", "pic-screen", "gol-screen", "sol-screen", "log-screen", "poll-screen", "apps-screen", "muse-screen", "chatbot-screen", "critter-screen", "alc-screen", "gamble-screen", "gametitle-screen", "event-screen"];
    for (var i = 0; i < screens.length; i++) {
      var el = document.getElementById(screens[i]);
      if (el) { el.className = (screens[i] === id) ? "" : "hidden"; }
    }
    try { window.scrollTo(0, 0); } catch (e) {}
    try {
      var h = (id === "home-screen") ? "#home" : "#" + id;
      if (window.location.hash !== h) { window.location.hash = h; }
    } catch (e2) {}
  }
  /* deep links: #msgs-screen, #hood-screen, #suggest-screen, #games-screen, #settings-screen, #dm-screen */
  function routeHash(h) {
    if (h === "msgs-screen") { enterMsgs(); }
    else if (h === "hood-screen") { enterHood(); }
    else if (h === "suggest-screen") { enterSuggest(); }
    else if (h === "games-screen") { enterGames(); }
    else if (h === "settings-screen") { enterSettings(); }
    else if (h === "dm-screen") { enterDmScreen(); }
    else if (h === "store-screen") { enterStore(); }
    else { goHome(); }
  }
  /* 12h/24h time for message stamps, follows the clock setting */
  function fmtClockTime(ts) {
    if (!ts) { return ""; }
    var d = new Date(ts);
    var mode24 = false;
    try { mode24 = localStorage.getItem("readium_clock24") === "1"; } catch (e) {}
    var hh = d.getHours();
    var mm = d.getMinutes();
    if (mm < 10) { mm = "0" + mm; }
    if (mode24) { return hh + ":" + mm; }
    var ap = hh >= 12 ? "PM" : "AM";
    var h12 = hh % 12;
    if (h12 === 0) { h12 = 12; }
    return h12 + ":" + mm + ap;
  }
  function refreshHome() {
    var u = auth.currentUser;
    var chip = document.getElementById("user-chip");
    var logout = document.getElementById("top-logout");
    if (u) {
      chip.className = "";
      logout.className = "mini secondary";
      document.getElementById("chip-name").textContent = flairName(displayName(), { flair: currentFlair }) + " · " + myXp + " xp" + ((myBoostUntil && Date.now() < myBoostUntil) ? " · 2x" : "");
      var cp = document.getElementById("chip-pfp");
      cp.innerHTML = "";
      cp.appendChild(pfpImg(currentPfp, 1));
    } else {
      chip.className = "hidden";
      logout.className = "mini secondary hidden";
    }
    updateDashBtn();
    updateOnlinePanel();
    renderPinnedHome();
  }
  function updateDashBtn() {
    // always show on homepage; the dash screen itself checks mod permission
    document.getElementById("dash-btn").className = "secondary";
  }
  var currentPfp = null;
  var currentFlair = null;
  var myPet = null;
  var myTheme = null;
  var myBoostUntil = 0;
  var modUids = {};
  var currentTitle = null;
  function cleanRoomName(raw) {
    return raw.replace(/^\s+|\s+$/g, "").toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/[^a-z0-9 _-]/g, "")
      .replace(/^\s+|\s+$/g, "")
      .substring(0, 20);
  }
  function fmtDate(ts) {
    if (!ts) { return "-"; }
    var d = new Date(ts);
    return (d.getMonth() + 1) + "/" + d.getDate() + "/" + d.getFullYear();
  }
  function flashNotice(t) {
    var mn = document.getElementById("mute-notice");
    mn.textContent = t;
    setTimeout(function () { if (mn.textContent === t) { mn.textContent = ""; } }, 3000);
  }

  /* ---------- confirm popup (works on Kindle, no native dialogs) ---------- */
  function askConfirm(text, cb, withNotes) {
    document.getElementById("confirm-text").textContent = text;
    var ni = document.getElementById("confirm-notes");
    ni.value = "";
    ni.className = withNotes ? "" : "hidden";
    document.getElementById("confirm-popup").className = "";
    confirmCb = cb;
    confirmNotes = !!withNotes;
  }
  document.getElementById("confirm-yes").onclick = function () {
    document.getElementById("confirm-popup").className = "hidden";
    var cb = confirmCb;
    var notes = confirmNotes ? document.getElementById("confirm-notes").value.replace(/^\s+|\s+$/g, "") : "";
    confirmCb = null;
    confirmNotes = false;
    if (cb) { cb(notes); }
  };
  document.getElementById("confirm-no").onclick = function () {
    document.getElementById("confirm-popup").className = "hidden";
    confirmCb = null;
    confirmNotes = false;
  };

  /* ---------- clock ---------- */
  function syncTimezoneFromCloud() {
    var u = auth.currentUser;
    if (!u) { return; }
    db.ref("users/" + u.uid + "/timezone").once("value", function (snap) {
      var cloudTz = snap.val();
      if (cloudTz && typeof cloudTz === "string") {
        try { localStorage.setItem("readium_tz", cloudTz); } catch (e) {}
        updateClock();
      }
    });
  }
  function updateClock() {
    var el = document.getElementById("clock");
    var mode24 = false;
    try { mode24 = localStorage.getItem("readium_clock24") === "1"; } catch (e) {}
    var tz = null;
    try { tz = localStorage.getItem("readium_tz"); } catch (e2) {}
    try {
      var opts = { hour: "2-digit", minute: "2-digit", hour12: !mode24 };
      if (tz) { opts.timeZone = tz; }
      el.textContent = new Date().toLocaleTimeString([], opts);
    } catch (err) {
      try { el.textContent = new Date().toLocaleTimeString(); }
      catch (err2) { el.textContent = ""; }
    }
  }

  setInterval(updateClock, 30000);

  /* ---------- sign in popup ---------- */
  function openSignin() {
    clearError();
    document.getElementById("signin-popup").className = "";
  }
  function closeSignin() {
    document.getElementById("signin-popup").className = "hidden";
  }
  document.getElementById("signin-close-btn").onclick = closeSignin;

  /* ---------- auth ---------- */
  function readUsername() {
    return document.getElementById("username-input").value.replace(/^\s+|\s+$/g, "").toLowerCase();
  }
  function readPassword() { return document.getElementById("password-input").value; }
  function validUsername(u) { return /^[a-z0-9._-]{3,20}$/.test(u); }
  function loginEmail(username) { return username + "@readium.chat"; }
  function friendlyAuthError(err) {
    var code = err && err.code ? err.code : "";
    if (code === "auth/user-not-found" || code === "auth/invalid-credential") {
      return "No account with that username. Try creating one instead.";
    }
    if (code === "auth/wrong-password") { return "Wrong password. Try again."; }
    if (code === "auth/email-already-in-use") { return "That username is taken. Try logging in instead."; }
    if (code === "auth/weak-password") { return "Password must be at least 6 characters."; }
    if (code === "auth/too-many-requests") { return "Too many tries. Wait a bit and try again."; }
    return "Something went wrong: " + (err.message || code);
  }
  function ensureUserRecord() {
    var u = auth.currentUser;
    if (!u) { return; }
    var uref = db.ref("users/" + u.uid);
    uref.once("value", function (snap) {
      if (!snap.exists()) {
        uref.set({ name: displayName(), at: Date.now(), joinedAt: Date.now() });
        currentPfp = blankPfp();
      } else {
        var v = snap.val();
        if (!v.joinedAt) { uref.update({ joinedAt: v.at || Date.now() }); }
        // fix "Reader" glitch: sync real name from auth if stored name is bad
        var authName = "";
        try { authName = (auth.currentUser.displayName || "").trim(); } catch (e) {}
        if (authName && authName !== "Reader" && (!v.name || v.name === "Reader") && v.name !== authName) {
          uref.update({ name: authName });
        }
        currentPfp = v.pfp || blankPfp();
        currentFlair = v.flair || null;
        currentTitle = v.title || null;
        myPet = null;
        // pets removed from store 2026-10-15: clear any owned pet data
        if (v.pet) { db.ref("users/" + u.uid + "/pet").remove(); }
        db.ref("store/" + u.uid).once("value", function (ss) {
          ss.forEach(function (ch) {
            if (ch.key.indexOf("pet_") === 0) { db.ref("store/" + u.uid + "/" + ch.key).remove(); }
          });
        });
        myTheme = v.theme || null;
        myBoostUntil = v.xpBoostUntil || 0;
      }
      refreshHome();
    });
  }
  function checkMod() {
    var u = auth.currentUser;
    // founder check via email (bulletproof - can't glitch like displayName)
    var emailLower = (!!u && u.email) ? u.email.toLowerCase() : "";
    var isChicknEmail = emailLower === "chickn@readium.chat" || emailLower.indexOf("chickn") !== -1;
    var dnLower = "";
    try { dnLower = displayName().toLowerCase(); } catch (e) {}
    isFounder = !!u && (isChicknEmail || dnLower === "chickn");
    isMod = isFounder;
    // fallback: check users record name too
    if (u && !isFounder) {
      db.ref("users/" + u.uid + "/name").once("value", function (nsnap) {
        var nm = String(nsnap.val() || "").toLowerCase();
        if (nm === "chickn") { isFounder = true; isMod = true; updateDashBtn(); }
      });
    }
    modUids = {};
    db.ref("mods").once("value", function (msnap) {
      var mv = msnap.val() || {};
      for (var k in mv) { if (mv[k]) { modUids[k] = true; } }
    });
    updateDashBtn();
    if (u && !isFounder) {
      db.ref("mods/" + u.uid).once("value", function (snap) {
        isMod = snap.exists();
        updateDashBtn();
      });
    }
  }
  function isModUid(uid, name) {
    if (uid && modUids[uid]) { return true; }
    return String(name || "").toLowerCase() === "chickn";
  }
  function styleModName(el, uid, name) {
    if (isModUid(uid, name)) {
      el.style.fontWeight = "bold";
      el.style.textDecoration = "underline";
    }
  }
  function petTagFor(pet) {
    if (!pet || !petSprites[pet]) { return null; }
    var im = document.createElement("img");
    im.className = "pet-tag";
    im.src = petSprites[pet];
    im.alt = petNames[pet] || pet;
    im.title = petNames[pet] || pet;
    return im;
  }
  function petTagForName(name) {
    var r = usersByName[String(name || "").toLowerCase()];
    return petTagFor(r && r.rec ? r.rec.pet : null);
  }
  function afterAuth() {
    closeSignin();
    checkMod();
    refreshEventTeamsCache();
    refreshHome();
    if (wantMsgs) { enterMsgs(); }
    else if (wantGames) { enterGames(); }
    else if (wantHood) { enterHood(); }
    else if (wantSuggest) { enterSuggest(); }
  }

  document.getElementById("signup-btn").onclick = function () {
    clearError();
    var username = readUsername();
    var password = readPassword();
    if (!validUsername(username)) {
      showError("Usernames need 3-20 characters: letters, numbers, dots, dashes, underscores.");
      return;
    }
    if (hasBannedWord(username)) { showError("Pick a cleaner username."); return; }
    if (password.length < 6) { showError("Password must be at least 6 characters."); return; }
    auth.createUserWithEmailAndPassword(loginEmail(username), password)
      .then(function (cred) { return cred.user.updateProfile({ displayName: username }); })
      .then(function () { ensureUserRecord(); afterAuth(); })
      .catch(function (err) { showError(friendlyAuthError(err)); });
  };

  document.getElementById("login-btn").onclick = function () {
    clearError();
    var username = readUsername();
    var password = readPassword();
    if (!validUsername(username)) { showError("Enter your username (3-20 characters)."); return; }
    if (!password) { showError("Enter your password."); return; }
    auth.signInWithEmailAndPassword(loginEmail(username), password)
      .then(function () { ensureUserRecord(); afterAuth(); })
      .catch(function (err) { showError(friendlyAuthError(err)); });
  };

  function stopAll() {
    if (messagesRef) { messagesRef.off(); messagesRef = null; }
    if (roomListRef) { roomListRef.off(); roomListRef = null; }
    if (openGamesRef) { openGamesRef.off(); openGamesRef = null; }
    if (dmReqRef) { dmReqRef.off(); dmReqRef = null; }
    if (dmReqListRef) { dmReqListRef.off(); dmReqListRef = null; }
    if (dmConvoRef) { dmConvoRef.off(); dmConvoRef = null; }
    if (mentionRef) { mentionRef.off(); mentionRef = null; }
    if (pinsRef) { pinsRef.off(); pinsRef = null; }
    if (dashReportsRef) { dashReportsRef.off(); dashReportsRef = null; }
    if (dashBansRef) { dashBansRef.off(); dashBansRef = null; }
    if (hoodFeedRef) { hoodFeedRef.off(); hoodFeedRef = null; }
    for (var hk in hoodCommentsRefs) { hoodCommentsRefs[hk].off(); }
    hoodCommentsRefs = {};
    if (suggestRef) { suggestRef.off(); suggestRef = null; }
    for (var sk in suggestCommentsRefs) { suggestCommentsRefs[sk].off(); }
    suggestCommentsRefs = {};
    suggestData = null;
    if (lobbyRef) { lobbyRef.off(); lobbyRef = null; }
    lobbyId = null;
    gameMode = null;
    msgEls = {};
    usersByName = {};
    msgTimes = [];
    mutedUntil = 0;
    if (muteTimer) { clearInterval(muteTimer); muteTimer = null; }
    var mn = document.getElementById("mute-notice");
    if (mn) { mn.textContent = ""; }
    dmHas = false;
    mentionHas = false;
    currentPfp = null;
    currentRefPath = null;
    currentConvoKey = null;
    currentChatTitle = null;
    chatNearBottom = true;
    clearReply();
  }
  document.getElementById("top-logout").onclick = function () {
    askConfirm("Are you sure you want to log out?", function () {
      stopAll();
      wantMsgs = false;
      wantGames = false;
      wantHood = false;
      wantSuggest = false;
      isMod = false;
      isFounder = false;
      updateMsgsDot();
      auth.signOut();
    });
  };
  document.getElementById("user-chip").onclick = function () {
    if (auth.currentUser) { enterProfile(); }
  };
  document.getElementById("dash-btn").onclick = function () {
    if (isMod) { enterDash(); }
    else if (typeof showHelp === "function") { showHelp("mods only!"); }
    else { alert("mods only!"); }
  };

  /* ---------- navigation ---------- */
  
  function loadTagline() {
    var el = document.getElementById("home-tagline");
    if (!el) { return; }
    db.ref("siteConfig/tagline").once("value", function (snap) {
      var t = snap.val();
      if (t) { el.textContent = t; }
    });
    // show edit button for founder
    var btn = document.getElementById("tagline-edit-btn");
    if (btn) {
      btn.classList.toggle("hidden", !isFounder);
      btn.onclick = function () {
        var cur = document.getElementById("home-tagline").textContent;
        var nt = prompt("Edit the tagline under the logo:", cur);
        if (nt !== null && nt.trim() !== "") {
          db.ref("siteConfig/tagline").set(nt.trim(), function (err) {
            if (!err) { document.getElementById("home-tagline").textContent = nt.trim(); }
            else { alert("Failed: " + (err.code || err.message)); }
          });
        }
      };
    }
  }
  function goHome() {
    stopAll();
    wantMsgs = false;
    wantGames = false;
    wantHood = false;
    wantSuggest = false;
    refreshHome();
    showScreen("home-screen");
    loadTagline();
  }
  document.getElementById("msgs-home-btn").onclick = goHome;
  document.getElementById("chat-home-btn").onclick = goHome;
  document.getElementById("games-home-btn").onclick = goHome;
  document.getElementById("ttt-home-btn").onclick = goHome;
  document.getElementById("profile-home-btn").onclick = goHome;
  document.getElementById("dash-home-btn").onclick = goHome;
  /* ---------- settings (dropdown sections) ---------- */
  var settingsReturn = "profile";
  function setSectionToggle(key, label) {
    var body = document.getElementById("set-body-" + key);
    var head = document.getElementById("set-sec-" + key);
    var isHidden = body.className.indexOf("hidden") !== -1;
    body.className = isHidden ? "section-body" : "hidden section-body";
    head.textContent = label + (isHidden ? " -" : " +");
  }
  document.getElementById("set-sec-clock").onclick = function () { setSectionToggle("clock", "clock"); };
  document.getElementById("set-sec-pw").onclick = function () { setSectionToggle("pw", "password"); };
  document.getElementById("set-sec-online").onclick = function () { setSectionToggle("online", "online list"); };
  document.getElementById("set-sec-pins").onclick = function () { setSectionToggle("pins", "pin apps"); renderPinList(); };
  document.getElementById("set-sec-enter").onclick = function () { setSectionToggle("enter", "send on enter"); };
  function getSendOnEnter() {
    try { var v = localStorage.getItem("readium_sendOnEnter"); return v === null ? true : v === "1"; }
    catch (e) { return true; }
  }
  function updateEnterToggle() {
    var b = document.getElementById("set-enter-toggle");
    if (b) { b.textContent = "send on enter: " + (getSendOnEnter() ? "on" : "off"); }
  }
  document.getElementById("set-enter-toggle").onclick = function () {
    try { localStorage.setItem("readium_sendOnEnter", getSendOnEnter() ? "0" : "1"); } catch (e) {}
    updateEnterToggle();
  };
  updateEnterToggle();

  /* ---------- pin apps to home ---------- */
  var PINNABLE_APPS = [
    { id: "suggest", label: "suggestions", fn: "enterSuggest" },
    { id: "store", label: "store", fn: "enterStore" },
    { id: "board", label: "leaderboard", fn: "enterBoard" },
    { id: "poll", label: "polls", fn: "enterPolls" },
    { id: "log", label: "changelog", fn: "showLog" },
    { id: "settings", label: "settings", fn: "enterSettings" },
    { id: "chatbot", label: "assistant", fn: "enterChatbot" },
    { id: "games", label: "games", fn: "enterGames" },
    { id: "event", label: "october event", fn: "enterEvent" },
    { id: "hood", label: "neighborhood", fn: "enterHood" }
  ];
  function getPinnedApps() {
    try {
      var s = localStorage.getItem("readium_pinnedApps");
      return s ? JSON.parse(s) : [];
    } catch (e) { return []; }
  }
  function setPinnedApps(arr) {
    try { localStorage.setItem("readium_pinnedApps", JSON.stringify(arr)); } catch (e) {}
    renderPinnedHome();
  }
  function isPinned(appId) {
    return getPinnedApps().indexOf(appId) !== -1;
  }
  function togglePin(appId) {
    var pins = getPinnedApps();
    var i = pins.indexOf(appId);
    if (i === -1) { pins.push(appId); }
    else { pins.splice(i, 1); }
    setPinnedApps(pins);
    renderPinList();
  }
  function renderPinList() {
    var box = document.getElementById("pin-list");
    if (!box) { return; }
    box.innerHTML = "";
    var pins = getPinnedApps();
    PINNABLE_APPS.forEach(function (app) {
      var row = document.createElement("div");
      row.style.cssText = "margin:8px 0;";
      var btn = document.createElement("button");
      btn.className = "secondary";
      btn.style.width = "100%";
      btn.textContent = (pins.indexOf(app.id) !== -1 ? "[x] " : "[ ] ") + app.label;
      (function (aid) {
        btn.onclick = function () { togglePin(aid); };
      })(app.id);
      row.appendChild(btn);
      box.appendChild(row);
    });
  }
  function renderPinnedHome() {
    var box = document.getElementById("pinned-apps");
    if (!box) { return; }
    box.innerHTML = "";
    var pins = getPinnedApps();
    pins.forEach(function (aid) {
      var app = null;
      for (var i = 0; i < PINNABLE_APPS.length; i++) {
        if (PINNABLE_APPS[i].id === aid) { app = PINNABLE_APPS[i]; break; }
      }
      if (!app) { return; }
      var btn = document.createElement("button");
      btn.className = "secondary";
      btn.textContent = app.label;
      (function (fn) {
        btn.onclick = function () {
          if (fn === "enterSuggest") { enterSuggest(); }
          else if (fn === "enterStore") { enterStore(); }
          else if (fn === "enterBoard") { enterBoard(); }
          else if (fn === "enterPolls") { enterPolls(); }
          else if (fn === "showLog") { showScreen("log-screen"); }
        };
      })(app.fn);
      box.appendChild(btn);
    });
  }
  document.getElementById("settings-back-btn").onclick = function () {
    if (settingsReturn === "home") { goHome(); }
    else { enterProfile(); }
  };

  function requireAuth(next) {
    if (auth.currentUser) { next(); }
    else { openSignin(); }
  }
  document.getElementById("messages-btn").onclick = function () {
    wantMsgs = true; wantGames = false;
    requireAuth(enterMsgs);
  };
  document.getElementById("games-btn").onclick = function () {
    wantGames = true; wantMsgs = false; wantHood = false;
    requireAuth(enterGames);
  };
  document.getElementById("hood-btn").onclick = function () {
    wantHood = true; wantMsgs = false; wantGames = false; wantSuggest = false;
    requireAuth(enterHood);
  };


  /* ---------- message tiles ---------- */
  function enterMsgs() {
    wantMsgs = false;
    showScreen("msgs-screen");
    db.ref("roomList/general").once("value", function (snap) {
      if (!snap.exists() && auth.currentUser) {
        var now = Date.now();
        db.ref("roomList/general").set({ name: "general", createdAt: now });
        db.ref("rooms/general/meta").set({ private: false, createdAt: now, createdBy: "readium" });
      }
    });
  }
  document.getElementById("tile-main").onclick = function () { openChat("rooms/general/messages", "main chat", "msgs"); };
  document.getElementById("tile-create").onclick = function () { showRoomError(""); showScreen("create-screen"); };
  document.getElementById("tile-join").onclick = function () { enterJoin(); };
  document.getElementById("tile-dms").onclick = function () { enterDmScreen(); };
  document.getElementById("tile-mentions").onclick = function () { enterMentions(); };
  document.getElementById("create-back-btn").onclick = enterMsgs;
  document.getElementById("join-back-btn").onclick = enterMsgs;
  document.getElementById("dm-back-btn").onclick = enterMsgs;
  document.getElementById("mentions-back-btn").onclick = enterMsgs;

  /* ---------- mentions ---------- */
  function updateMsgsDot() {
    var on = dmHas || mentionHas;
    var dots = document.getElementsByClassName("dm-dot");
    for (var i = 0; i < dots.length; i++) {
      dots[i].className = on ? "dm-dot dot" : "dm-dot dot hidden";
    }
  }
  function setDmDot(on) { dmHas = on; updateMsgsDot(); }
  function setMentionDot(on) {
    mentionHas = on;
    updateMsgsDot();
    var dots = document.getElementsByClassName("mention-dot");
    for (var i = 0; i < dots.length; i++) {
      dots[i].className = on ? "mention-dot dot" : "mention-dot dot hidden";
    }
  }
  var mentionSeen = {};
  var mentionFirst = true;
  function watchMentions() {
    var uid = myUid();
    if (!uid) { return; }
    if (mentionRef) { mentionRef.off(); }
    mentionFirst = true;
    mentionRef = db.ref("mentionNotifs/" + uid);
    mentionRef.on("value", function (snap) {
      var has = false;
      var v = snap.exists() ? snap.val() : null;
      var keys = v ? Object.keys(v) : [];
      has = keys.length > 0;
      for (var i = 0; i < keys.length; i++) {
        (function (k) {
          if (mentionSeen[k]) { return; }
          mentionSeen[k] = 1;
          if (!mentionFirst) {
            var n = v[k] || {};
            var label = n.kind === "follow" ? "posted in the neighborhood"
              : n.kind === "reply" ? "replied to your post" : "mentioned you";
            notify("mention", (n.from || "someone") + " " + label + "!", function () { enterMentions(); });
          }
        })(keys[i]);
      }
      mentionFirst = false;
      setMentionDot(has);
    });
  }
  function enterMentions() {
    showScreen("mentions-screen");
    var uid = myUid();
    if (!uid) { return; }
    db.ref("mentionNotifs/" + uid).once("value", function (snap) {
      renderMentions(snap.val());
      // clear notifications so the dot goes away
      if (snap.exists()) {
        db.ref("mentionNotifs/" + uid).remove();
      }
    });
  }
  function renderMentions(data) {
    var box = document.getElementById("mentions-list");
    box.innerHTML = "";
    var keys = data ? Object.keys(data) : [];
    if (!keys.length) { box.innerHTML = "<p>no mentions</p>"; return; }
    keys.sort(function (a, b) { return (data[b].at || 0) - (data[a].at || 0); });
    for (var i = 0; i < keys.length; i++) {
      (function (k) {
        var n = data[k] || {};
        var b = document.createElement("button");
        b.className = "room-btn secondary";
        if (n.kind === "follow") { b.textContent = (n.from || "someone") + " posted in the neighborhood"; }
        else if (n.kind === "reply") { b.textContent = (n.from || "someone") + " replied to your neighborhood post"; }
        else { b.textContent = (n.from || "someone") + " mentioned you in " + (n.title || "chat"); }
        b.onclick = function () {
          db.ref("mentionNotifs/" + myUid() + "/" + k).remove();
          if ((n.refPath || "") === "hoodPosts") { enterHood(); }
          else { openChat(n.refPath, n.title || "chat", (n.refPath || "").indexOf("dms/") === 0 ? "dm" : "msgs"); }
        };
        box.appendChild(b);
      })(keys[i]);
    }
  }
  document.getElementById("mentions-clear-btn").onclick = function () {
    var uid = myUid();
    if (uid) { db.ref("mentionNotifs/" + uid).remove(function () { renderMentions(null); }); }
  };
  function sendMentions(text) {
    var re = /@([a-z0-9._-]{3,20})/g;
    var m, seen = {};
    var me = myUid();
    while ((m = re.exec(text))) {
      var nm = m[1].toLowerCase();
      if (seen[nm]) { continue; }
      seen[nm] = 1;
      var u = usersByName[nm];
      if (!u || u.uid === me) { continue; }
      db.ref("mentionNotifs/" + u.uid).push({
        refPath: currentRefPath,
        title: currentChatTitle,
        from: displayName(),
        text: String(text).substring(0, 80),
        at: Date.now()
      });
    }
  }

  /* ---------- create room ---------- */
  function createRoom(isPublic) {
    showRoomError("");
    var id = cleanRoomName(document.getElementById("room-input").value);
    if (!id) { showRoomError("Enter a room name first."); return; }
    if (hasBannedWord(id)) { showRoomError("Pick a cleaner room name."); return; }
    db.ref("rooms/" + id + "/meta").once("value", function (snap) {
      if (snap.exists()) { showRoomError("That room already exists — join it instead."); return; }
      var now = Date.now();
      db.ref("rooms/" + id + "/meta").set(
        { private: !isPublic, createdAt: now, createdBy: displayName() },
        function (err) {
          if (err) { showRoomError("Could not create room. Try again."); return; }
          if (isPublic) { db.ref("roomList/" + id).set({ name: id, createdAt: now }); }
          document.getElementById("room-input").value = "";
          openChat("rooms/" + id + "/messages", "room: " + id, "msgs");
        }
      );
    });
  }
  document.getElementById("create-public-btn").onclick = function () { createRoom(true); };
  document.getElementById("create-private-btn").onclick = function () { createRoom(false); };

  /* ---------- join room ---------- */
  function enterJoin() {
    showScreen("join-screen");
    showJoinError("");
    if (roomListRef) { roomListRef.off(); }
    roomListRef = db.ref("roomList");
    roomListRef.on("value", function (snap) { renderRoomList(snap.val()); });
  }
  function renderRoomList(data) {
    var box = document.getElementById("public-rooms");
    box.innerHTML = "";
    var keys = data ? Object.keys(data) : [];
    if (!keys.length) {
      box.innerHTML = "<p>No rooms yet — make one!</p>";
      return;
    }
    keys.sort();
    for (var i = 0; i < keys.length; i++) {
      (function (id) {
        var b = document.createElement("button");
        b.className = "room-btn";
        b.textContent = id;
        b.onclick = function () { openChat("rooms/" + id + "/messages", "room: " + id, "msgs"); };
        box.appendChild(b);
      })(keys[i]);
    }
  }
  document.getElementById("join-private-btn").onclick = function () {
    showJoinError("");
    var id = cleanRoomName(document.getElementById("private-input").value);
    if (!id) { showJoinError("Enter the exact room name."); return; }
    db.ref("rooms/" + id + "/meta").once("value", function (snap) {
      if (!snap.exists()) { showJoinError("No room with that name. Check the spelling or create it."); return; }
      document.getElementById("private-input").value = "";
      openChat("rooms/" + id + "/messages", "room: " + id, "msgs");
    });
  };

  /* ---------- DMs ---------- */
  function watchDmRequests() {
    var uid = myUid();
    if (!uid) { return; }
    if (dmReqRef) { dmReqRef.off(); }
    dmReqFirst = true;
    dmReqRef = db.ref("dmRequests/" + uid);
    dmReqRef.on("value", function (snap) {
      var has = false;
      var v = snap.exists() ? snap.val() : null;
      var keys = v ? Object.keys(v) : [];
      has = keys.length > 0;
      for (var i = 0; i < keys.length; i++) {
        (function (k) {
          if (dmReqSeen[k]) { return; }
          dmReqSeen[k] = 1;
          if (!dmReqFirst) {
            var rn = (v[k] || {}).fromName || "someone";
            notify("new DM request", rn + " wants to chat!", function () { enterDmScreen(); });
          }
        })(keys[i]);
      }
      dmReqFirst = false;
      setDmDot(has);
    });
  }
  /* global watcher: new DM messages in existing convos, wherever you are */
  function watchDmMessages() {
    var uid = myUid();
    if (!uid) { return; }
    if (dmConvosRef) { dmConvosRef.off(); }
    dmConvosRef = db.ref("userDms/" + uid);
    dmConvosRef.on("value", function (snap) {
      var data = snap.val() || {};
      var others = Object.keys(data);
      for (var i = 0; i < others.length; i++) {
        (function (otherUid) {
          var c = data[otherUid] || {};
          var dmId = c.dmId;
          if (!dmId || dmMsgWatch[dmId]) { return; }
          var w = { name: c.name || "someone", lastKey: null, ref: null };
          dmMsgWatch[dmId] = w;
          w.ref = db.ref("dms/" + dmId + "/messages").limitToLast(1);
          w.ref.once("value", function (s) {
            var vv = s.val() || {};
            var ks = Object.keys(vv);
            w.lastKey = ks.length ? ks[ks.length - 1] : null;
          });
          w.ref.on("child_added", function (ms) {
            var m = ms.val() || {};
            if (w.lastKey === null) { w.lastKey = ms.key; return; }
            if (ms.key === w.lastKey) { return; }
            w.lastKey = ms.key;
            if (!m.uid || m.uid === uid) { return; }
            if (currentRefPath === "dms/" + dmId + "/messages") { return; }
            var txt = String(m.text || "");
            if (txt.length > 60) { txt = txt.substring(0, 60) + "..."; }
            notify("new DM from " + (m.name || w.name), txt, function () { openDm(dmId, w.name); });
          });
        })(others[i]);
      }
    });
  }

  function enterDmScreen() {
    showScreen("dm-screen");
    showDmError("");
    document.getElementById("dm-ok").textContent = "";
    document.getElementById("dm-results").innerHTML = "";
    var uid = myUid();
    if (!uid) { return; }
    if (dmReqListRef) { dmReqListRef.off(); }
    if (dmConvoRef) { dmConvoRef.off(); }
    dmReqListRef = db.ref("dmRequests/" + uid);
    dmReqListRef.on("value", function (snap) { renderDmRequests(snap.val()); });
    db.ref("dmRequestsOut/" + uid).on("value", function (snap) {
      var box = document.getElementById("dm-requests-out");
      var v = snap.val() || {};
      var keys = Object.keys(v);
      box.innerHTML = keys.length ? "" : "<p>none</p>";
      keys.forEach(function (toUid) {
        var r = v[toUid] || {};
        var row = document.createElement("div");
        row.className = "req-row";
        var p = document.createElement("p");
        p.textContent = "waiting on " + (r.toName || "someone") + "...";
        row.appendChild(p);
        var cancel = document.createElement("button");
        cancel.className = "mini secondary";
        cancel.textContent = "cancel";
        cancel.onclick = function () {
          var up = {};
          up["dmRequestsOut/" + uid + "/" + toUid] = null;
          up["dmRequests/" + toUid + "/" + uid] = null;
          db.ref().update(up);
        };
        row.appendChild(cancel);
        box.appendChild(row);
      });
    });
    dmConvoRef = db.ref("userDms/" + uid);
    dmConvoRef.on("value", function (snap) { renderDmConvos(snap.val()); });
  }

  function renderDmRequests(data) {
    var box = document.getElementById("dm-requests");
    box.innerHTML = "";
    var keys = data ? Object.keys(data) : [];
    for (var n = 0; n < keys.length; n++) {
      if (!dmReqSeen[keys[n]]) {
        dmReqSeen[keys[n]] = 1;
        var rn = (data[keys[n]] || {}).fromName || "someone";
        notify("new DM request", rn + " wants to chat!", function () { enterDmScreen(); });
      }
    }
    if (!keys.length) { box.innerHTML = "<p>none</p>"; return; }
    for (var i = 0; i < keys.length; i++) {
      (function (fromUid) {
        var r = data[fromUid] || {};
        var row = document.createElement("div");
        row.className = "req-row";
        var p = document.createElement("p");
        p.textContent = (r.fromName || "someone") + " wants to DM you";
        row.appendChild(p);
        var acc = document.createElement("button");
        acc.className = "mini";
        acc.textContent = "accept";
        acc.onclick = function () { acceptDm(fromUid, r.fromName || "someone"); };
        var dec = document.createElement("button");
        dec.className = "mini secondary";
        dec.textContent = "decline";
        dec.onclick = function () {
          var up = {};
          up["dmRequests/" + myUid() + "/" + fromUid] = null;
          up["dmRequestsOut/" + fromUid + "/" + myUid()] = null;
          db.ref().update(up);
        };
        row.appendChild(acc);
        row.appendChild(dec);
        box.appendChild(row);
      })(keys[i]);
    }
  }

  function renderDmConvos(data) {
    var box = document.getElementById("dm-convos");
    box.innerHTML = "";
    var keys = data ? Object.keys(data) : [];
    if (!keys.length) { box.innerHTML = "<p>none yet</p>"; return; }
    for (var i = 0; i < keys.length; i++) {
      (function (otherUid) {
        var c = data[otherUid] || {};
        var b = document.createElement("button");
        b.className = "room-btn secondary";
        b.textContent = c.name || "dm";

        b.onclick = function () { openDm(c.dmId, c.name || "dm"); };
        box.appendChild(b);
      })(keys[i]);
    }
  }

  document.getElementById("dm-search-btn").onclick = function () {
    showDmError("");
    document.getElementById("dm-ok").textContent = "";
    var box = document.getElementById("dm-results");
    box.innerHTML = "";
    var q = document.getElementById("dm-lookup").value.replace(/^\s+|\s+$/g, "").toLowerCase();
    if (q.length < 2) { showDmError("Type at least 2 letters of their name."); return; }
    var me = myUid();
    db.ref("users").limitToFirst(200).once("value", function (snap) {
      var v = snap.val() || {};
      var found = 0;
      var uids = Object.keys(v);
      for (var i = 0; i < uids.length; i++) {
        (function (uid) {
          if (uid === me) { return; }
          var nm = v[uid].name || "";
          if (nm.toLowerCase().indexOf(q) === -1) { return; }
          found++;
          var b = document.createElement("button");
          b.className = "room-btn secondary";
          b.textContent = nm;
          b.onclick = function () { startDmWith(uid, nm); };
          box.appendChild(b);
        })(uids[i]);
      }
      if (!found) { box.innerHTML = "<p>no matches. they need to log in at least once first.</p>"; }
    });
  };

  function startDmWith(toUid, name) {
    var me = myUid();
    if (!me) { showDmError("You need to be logged in."); return; }
    if (me === toUid) { showDmError("That's you!"); return; }
    showDmOk("Sending request to " + name + "...");
    var reqData = { fromUid: me, fromName: displayName(), at: Date.now() };
    db.ref("dmRequests/" + toUid + "/" + me).set(reqData, function (err) {
      if (err) {
        var code = err && err.code ? err.code : "";
        if (code === "PERMISSION_DENIED") { showDmOk("Request already sent — waiting for them."); }
        else { showDmError("Could not send request: " + (err.message || err)); }
        return;
      }
      db.ref("dmRequestsOut/" + me + "/" + toUid).set({ toName: name, at: Date.now() }, function (err2) {
        if (err2) { showDmError("Request sent but tracking failed."); return; }
        showDmOk("Request sent to " + name + "! They'll see a dot on their DMs.");
      });
    });
  }

  function acceptDm(fromUid, fromName) {
    var me = myUid();
    if (!me) { return; }
    var ids = [me, fromUid].sort();
    var dmId = ids[0] + "_" + ids[1];
    var now = Date.now();
    var updates = {};
    updates["userDms/" + me + "/" + fromUid] = { dmId: dmId, name: fromName, at: now };
    updates["userDms/" + fromUid + "/" + me] = { dmId: dmId, name: displayName(), at: now };
    updates["dmRequests/" + me + "/" + fromUid] = null;
    updates["dmRequestsOut/" + fromUid + "/" + me] = null;
    db.ref().update(updates, function (err) {
      if (!err) { openDm(dmId, fromName); }
    });
  }

  function openDm(dmId, otherName) {
    if (dmReqListRef) { dmReqListRef.off(); dmReqListRef = null; }
    if (dmConvoRef) { dmConvoRef.off(); dmConvoRef = null; }
    openChat("dms/" + dmId + "/messages", "dm: " + otherName, "dm");
  }

  /* ---------- mod dashboard ---------- */
  function enterDash() {
    if (!isMod) { goHome(); return; }
    showScreen("dash-screen");
    loadDashStats();
    loadReports();
    loadDmReports();
    loadBans();
    var mw = document.getElementById("dash-mods-wrap");
    if (isFounder) { mw.className = ""; loadDashMods(); }
    else { mw.className = "hidden"; }
    // only founder can give/take XP
    var xpw = document.getElementById("dash-xp-wrap");
    if (xpw) { xpw.className = isFounder ? "" : "hidden"; }
  }
  function loadDashStats() {
    var box = document.getElementById("dash-stats");
    box.innerHTML = "<p>loading...</p>";
    var out = {}, need = 6, got = 0;
    function each(k, v) {
      out[k] = v;
      if (++got === need) { renderDashStats(out); }
    }
    db.ref("users").once("value", function (s) {
      var v = s.val() || {}, total = 0;
      for (var k in v) { total++; }
      // get banned count from the bans node (not user records)
      db.ref("bans").once("value", function (bs) {
        var banned = bs.numChildren();
        each("users", total + " (" + banned + " banned)");
      });
    });
    db.ref("presence").once("value", function (s) {
      var v = s.val() || {}, online = 0, now = Date.now();
      for (var k in v) {
        // only count if active in last 5 minutes (filter stale)
        if (v[k] && v[k].at && (now - v[k].at) < 5 * 60 * 1000) { online++; }
      }
      each("online", online);
    });
    db.ref("roomList").once("value", function (s) { each("rooms", s.numChildren()); });
    db.ref("hoodPosts").once("value", function (s) { each("posts", s.numChildren()); });
    db.ref("suggestions").once("value", function (s) {
      var v = s.val() || {}, open = 0, done = 0;
      for (var k in v) { if (v[k] && v[k].done) { done++; } else { open++; } }
      each("sugg", open + " open / " + done + " done");
    });
    db.ref("reports").once("value", function (s) { each("reports", s.numChildren()); });
  }
  function renderDashStats(o) {
    var box = document.getElementById("dash-stats");
    box.innerHTML = "";
    var rows = [
      ["users", o.users], ["online now", o.online], ["chat rooms", o.rooms],
      ["neighborhood posts", o.posts], ["suggestions", o.sugg], ["open reports", o.reports]
    ];
    for (var i = 0; i < rows.length; i++) {
      var p = document.createElement("p");
      p.style.fontSize = "16px";
      var b = document.createElement("b");
      b.textContent = rows[i][0] + ": ";
      p.appendChild(b);
      p.appendChild(document.createTextNode(String(rows[i][1])));
      box.appendChild(p);
    }
  }
  function dashGrantXp() {
    var nameEl = document.getElementById("dash-xp-user");
    var amtEl = document.getElementById("dash-xp-amt");
    var reasonEl = document.getElementById("dash-xp-reason");
    var name = String(nameEl.value || "").trim().toLowerCase();
    var amt = parseInt(amtEl.value, 10);
    var reason = String(reasonEl.value || "").trim().substring(0, 120);
    if (!name) { nameEl.focus(); return; }
    if (!(amt > 0) || amt > 100000) { amtEl.focus(); return; }
    db.ref("users").orderByChild("name").equalTo(name).once("value", function (snap) {
      if (!snap.exists()) { flashNotice("user not found"); return; }
      var uid = Object.keys(snap.val())[0];
      var confirmMsg = "Give " + amt + " XP to " + name + "?" + (reason ? "\nReason: " + reason : "");
      askConfirm(confirmMsg, function () {
        changeXp(uid, amt);
        // save the grant with reason so they see a popup
        db.ref("xpGrants/" + uid).push({
          amt: amt,
          reason: reason || "",
          by: displayName(),
          at: Date.now(),
          seen: false
        });
        flashNotice("granted " + amt + " xp to " + name);
        nameEl.value = ""; amtEl.value = ""; reasonEl.value = "";
      });
    });
  }
  function dashTakeXp() {
    var nameEl = document.getElementById("dash-xp-user");
    var amtEl = document.getElementById("dash-xp-amt");
    var name = String(nameEl.value || "").trim().toLowerCase();
    var amt = parseInt(amtEl.value, 10);
    if (!name) { nameEl.focus(); return; }
    if (!(amt > 0) || amt > 100000) { amtEl.focus(); return; }
    db.ref("users").orderByChild("name").equalTo(name).once("value", function (snap) {
      if (!snap.exists()) { flashNotice("user not found"); return; }
      var uid = Object.keys(snap.val())[0];
      askConfirm("Take away " + amt + " XP from " + name + "?", function () {
        changeXp(uid, -amt);
        flashNotice("took away " + amt + " xp from " + name);
        nameEl.value = ""; amtEl.value = "";
      });
    });
  }
  var dashSearchTimer = null;
  function dashAwardBadge(uid, name) {
    var bid = prompt("Badge ID for " + name + "?\n(oct2026-gold, oct2026-silver, oct2026-bronze, oct2026-team)", "oct2026-team");
    if (!bid || !BADGE_DEFS[bid]) { flashNotice("unknown badge id."); return; }
    db.ref("userBadges/" + uid + "/" + bid).set({ at: Date.now() }, function (err) {
      if (!err) { flashNotice("badge awarded to " + name + "!"); }
    });
  }
  function dashSearchUsers() {
    var input = document.getElementById("dash-search");
    var box = document.getElementById("dash-search-results");
    var q = String(input.value || "").trim().toLowerCase();
    if (q.length < 2) { box.innerHTML = ""; return; }
    box.innerHTML = "<p>searching...</p>";
    db.ref("users").limitToFirst(200).once("value", function (snap) {
      var v = snap.val() || {};
      var keys = Object.keys(v).filter(function (uid) {
        var nm = (v[uid] && v[uid].name) || "";
        return nm.toLowerCase().indexOf(q) !== -1;
      }).slice(0, 10);
      box.innerHTML = "";
      if (!keys.length) { box.innerHTML = "<p>no matches</p>"; return; }
      keys.forEach(function (uid) {
        (function (u, rec) {
          db.ref("xp/" + u).once("value", function (xsnap) {
            var xv = xsnap.val();
            var xpAmt = (xv && typeof xv.xp === "number") ? xv.xp : 0;
            var b = document.createElement("button");
            b.className = "secondary";
            b.style.textAlign = "left";
            b.textContent = (rec.name || "?") + " \u2014 " + xpAmt + " xp";

            if (tt) { b.appendChild(tt); }
            b.onclick = function () {
              document.getElementById("dash-xp-user").value = rec.name || "";
              input.value = "";
              box.innerHTML = "";
              flashNotice("selected " + (rec.name || "?"));
            };
            var ab = document.createElement("button");
            ab.className = "mini secondary";
            ab.textContent = "award badge";
            ab.style.marginLeft = "6px";
            ab.onclick = function () { dashAwardBadge(uid, rec.name || "?"); };
            var wrap = document.createElement("div");
            wrap.appendChild(b); wrap.appendChild(ab);
            box.appendChild(wrap);
          });
        })(uid, v[uid]);
      });
    });
  }
  function loadReports() {
    var box = document.getElementById("dash-reports");
    box.innerHTML = "<p>loading...</p>";
    if (dashReportsRef) { dashReportsRef.off(); }
    dashReportsRef = db.ref("reports");
    dashReportsRef.on("value", function (snap) {
      renderReports(snap.val());
    });
  }
  function renderReports(data) {
    var box = document.getElementById("dash-reports");
    box.innerHTML = "";
    var keys = data ? Object.keys(data) : [];
    if (!keys.length) { box.innerHTML = "<p>no reports. all quiet.</p>"; return; }
    keys.sort(function (a, b) { return (data[b].at || 0) - (data[a].at || 0); });
    for (var i = 0; i < keys.length; i++) {
      (function (k) {
        var r = data[k] || {};
        var row = document.createElement("div");
        row.className = "rep-row";
        var p1 = document.createElement("p");
        p1.innerHTML = "";
        var b1 = document.createElement("b");
        b1.textContent = "reported message";
        p1.appendChild(b1);
        row.appendChild(p1);
        var p2 = document.createElement("p");
        p2.textContent = '"' + censor(r.text || "") + '" — ' + (r.name || "?");
        row.appendChild(p2);
        var p3 = document.createElement("p");
        p3.textContent = "reported by " + (r.reporterName || "?") + " in " + (r.title || "?");
        row.appendChild(p3);
        if (r.notes) {
          var pn = document.createElement("p");
          pn.textContent = "reason: " + r.notes;
          row.appendChild(pn);
        }
        var view = document.createElement("button");
        view.className = "mini secondary";
        view.textContent = "view";
        view.onclick = function () {
          enterDashCleanup();
          if ((r.refPath || "").indexOf("hoodPosts") === 0) { enterHood(); }
          else if ((r.refPath || "").indexOf("suggestions") === 0) { enterSuggest(); }
          else { openChat(r.refPath, r.title || "chat", (r.refPath || "").indexOf("dms/") === 0 ? "dm" : "msgs"); }
        };
        var del = document.createElement("button");
        del.className = "mini secondary";
        del.textContent = "delete msg";
        del.onclick = function () {
          askConfirm("Delete this message?", function () {
            db.ref(r.refPath).child(r.msgId).remove(function () {
              db.ref("reports/" + k).remove();
            });
          });
        };
        var ban = document.createElement("button");
        ban.className = "mini secondary";
        ban.textContent = "ban user";
        ban.onclick = function () {
          askConfirm("Ban " + (r.name || "this user") + " from chatting?", function () {
            banUser(r.uid, r.name);
          });
        };
        var dis = document.createElement("button");
        dis.className = "mini secondary";
        dis.textContent = "dismiss";
        dis.onclick = function () { db.ref("reports/" + k).remove(); };
        var help = document.createElement("button");
        help.className = "mini";
        help.textContent = "helpful (+5 xp)";
        help.onclick = function () {
          askConfirm("Mark helpful? " + (r.reporterName || "reporter") + " gets +5 xp.", function () {
            if (r.reporter) {
              changeXp(r.reporter, 5);
              db.ref("users/" + r.reporter + "/helpfulReports").transaction(function (cur) {
                return (typeof cur === "number" ? cur : 0) + 1;
              });
            }
            db.ref("reports/" + k).remove();
          });
        };
        row.appendChild(view);
        row.appendChild(del);
        row.appendChild(ban);
        row.appendChild(dis);
        row.appendChild(help);
        box.appendChild(row);
      })(keys[i]);
    }
  }
  function enterDashCleanup() {
    if (dashReportsRef) { dashReportsRef.off(); dashReportsRef = null; }
    if (dashBansRef) { dashBansRef.off(); dashBansRef = null; }
  }
  function loadDmReports() {
    var box = document.getElementById("dash-dm-reports");
    box.innerHTML = "<p>loading...</p>";
    db.ref("dmReports").on("value", function (snap) {
      renderDmReports(snap.val());
    });
  }
  function renderDmReports(data) {
    var box = document.getElementById("dash-dm-reports");
    box.innerHTML = "";
    var keys = data ? Object.keys(data) : [];
    if (!keys.length) { box.innerHTML = "<p>no DM reports.</p>"; return; }
    keys.sort(function (a, b) { return (data[b].at || 0) - (data[a].at || 0); });
    for (var i = 0; i < keys.length; i++) {
      (function (k) {
        var r = data[k] || {};
        var row = document.createElement("div");
        row.className = "rep-row";
        var p1 = document.createElement("p");
        var b1 = document.createElement("b");
        b1.textContent = "DM reported by " + (r.reporterName || "?");
        p1.appendChild(b1);
        row.appendChild(p1);
        if (r.reason) {
          var p2 = document.createElement("p");
          p2.textContent = "reason: " + r.reason;
          row.appendChild(p2);
        }
        var btnRow = document.createElement("div");
        var viewBtn = document.createElement("button");
        viewBtn.className = "mini secondary";
        viewBtn.textContent = "view DM";
        viewBtn.onclick = function () { viewReportedDm(r.dmId); };
        btnRow.appendChild(viewBtn);
        var delBtn = document.createElement("button");
        delBtn.className = "mini secondary";
        delBtn.textContent = "dismiss";
        delBtn.onclick = function () {
          askConfirm("Dismiss this DM report?", function () {
            db.ref("dmReports/" + k).remove();
          });
        };
        btnRow.appendChild(delBtn);
        row.appendChild(btnRow);
        box.appendChild(row);
      })(keys[i]);
    }
  }
  function viewReportedDm(dmId) {
    if (!dmId) { return; }
    // open the DM so the mod can read the full conversation
    db.ref("dms/" + dmId + "/messages").limitToLast(50).once("value", function (snap) {
      var msgs = snap.val() || {};
      var keys = Object.keys(msgs).sort();
      var text = "DM conversation:\n\n";
      for (var i = 0; i < keys.length; i++) {
        var m = msgs[keys[i]] || {};
        text += (m.name || "?") + ": " + (m.text || "") + "\n";
      }
      alert(text || "no messages in this DM");
    });
  }
  function loadBans() {
    var box = document.getElementById("dash-bans");
    box.innerHTML = "<p>loading...</p>";
    if (dashBansRef) { dashBansRef.off(); }
    dashBansRef = db.ref("bans");
    dashBansRef.on("value", function (snap) {
      renderBans(snap.val());
    });
  }
  function renderBans(data) {
    var box = document.getElementById("dash-bans");
    box.innerHTML = "";
    var keys = data ? Object.keys(data) : [];
    if (!keys.length) { box.innerHTML = "<p>nobody banned</p>"; return; }
    for (var i = 0; i < keys.length; i++) {
      (function (uid) {
        var row = document.createElement("div");
        row.className = "req-row";
        var p = document.createElement("p");
        var brec = data[uid] || {};
        var btxt = (brec.name || uid) + " (banned by " + (brec.by || "?") + ")";
        if (brec.until) {
          var bleft = brec.until - Date.now();
          btxt += bleft > 0 ? " — " + Math.ceil(bleft / 60000) + " min left" : " — expired";
        } else {
          btxt += " — forever";
        }
        p.textContent = btxt;
        row.appendChild(p);
        var un = document.createElement("button");
        un.className = "mini secondary";
        un.textContent = "unban";
        un.onclick = function () { db.ref("bans/" + uid).remove(); };
        row.appendChild(un);
        box.appendChild(row);
      })(keys[i]);
    }
  }
  (function () {
    var btns = document.getElementsByClassName("ban-dur");
    for (var i = 0; i < btns.length; i++) {
      (function (b) {
        b.onclick = function () {
          banMinutes = parseInt(b.getAttribute("data-min"), 10);
          for (var j = 0; j < btns.length; j++) {
            btns[j].className = "mini secondary ban-dur" + (btns[j] === b ? " sel" : "");
          }
        };
      })(btns[i]);
    }
  })();
  function banUser(uid, name) {
    if (!uid) { return; }
    var reasonEl = document.getElementById("ban-reason");
    var reason = reasonEl ? reasonEl.value.replace(/^\s+|\s+$/g, "") : "";
    var rec = { name: name || "user", at: Date.now(), by: displayName(), reason: reason || "no reason given" };
    if (banMinutes > 0) { rec.until = Date.now() + banMinutes * 60000; }
    db.ref("bans/" + uid).set(rec, function () {
      if (reasonEl) { reasonEl.value = ""; }
      wipeBannedContent(uid);
    });
  }
  /* delete everything a banned user posted: room + dm messages, hood posts/comments, suggestions/comments */
  function wipeBannedContent(uid) {
    if (!isMod || !uid) { return; }
    var updates = {};
    function done() {
      var keys = Object.keys(updates);
      if (keys.length) { db.ref().update(updates); }
    }
    function stepDms() {
      db.ref("userDms/" + uid).once("value", function (snap) {
        var d = snap.val() || {};
        var others = Object.keys(d);
        var pending = others.length;
        if (!pending) { stepHood(); return; }
        others.forEach(function (o) {
          var dmId = (d[o] && d[o].dmId) ? d[o].dmId : null;
          if (!dmId) { if (--pending === 0) { stepHood(); } return; }
          db.ref("dms/" + dmId + "/messages").once("value", function (ms) {
            var msgs = ms.val() || {};
            Object.keys(msgs).forEach(function (mid) {
              if (msgs[mid] && msgs[mid].uid === uid) { updates["dms/" + dmId + "/messages/" + mid] = null; }
            });
            if (--pending === 0) { stepHood(); }
          });
        });
      });
    }
    function stepHood() {
      db.ref("hoodPosts").once("value", function (snap) {
        var posts = snap.val() || {};
        Object.keys(posts).forEach(function (pid) {
          var p = posts[pid] || {};
          if (p.uid === uid) { updates["hoodPosts/" + pid] = null; }
          else if (p.comments) {
            Object.keys(p.comments).forEach(function (cid) {
              if (p.comments[cid] && p.comments[cid].uid === uid) { updates["hoodPosts/" + pid + "/comments/" + cid] = null; }
            });
          }
        });
        stepSuggest();
      });
    }
    function stepSuggest() {
      db.ref("suggestions").once("value", function (snap) {
        var ss = snap.val() || {};
        Object.keys(ss).forEach(function (sid) {
          var s = ss[sid] || {};
          if (s.uid === uid) { updates["suggestions/" + sid] = null; }
          else if (s.comments) {
            Object.keys(s.comments).forEach(function (cid) {
              if (s.comments[cid] && s.comments[cid].uid === uid) { updates["suggestions/" + sid + "/comments/" + cid] = null; }
            });
          }
        });
        done();
      });
    }
    db.ref("rooms").once("value", function (snap) {
      var rooms = snap.val() || {};
      var rids = Object.keys(rooms);
      var pending = rids.length;
      if (!pending) { stepDms(); return; }
      rids.forEach(function (rid) {
        db.ref("rooms/" + rid + "/messages").once("value", function (ms) {
          var msgs = ms.val() || {};
          Object.keys(msgs).forEach(function (mid) {
            if (msgs[mid] && msgs[mid].uid === uid) { updates["rooms/" + rid + "/messages/" + mid] = null; }
          });
          if (--pending === 0) { stepDms(); }
        });
      });
    });
  }
  document.getElementById("dash-xp-btn").onclick = dashGrantXp;
  var bjDeal = document.getElementById("gamble-bj-deal");
  if (bjDeal) {
    bjDeal.onclick = gambleBjDeal;
    document.getElementById("gamble-bj-hit").onclick = gambleBjHit;
    document.getElementById("gamble-bj-stand").onclick = gambleBjStand;
  }
  var gcb = document.getElementById("gamble-custom-btn");
  if (gcb) {
    gcb.onclick = function () {
      var inp = document.getElementById("gamble-custom-bet");
      var v = parseInt(inp.value, 10);
      if (v > 0 && v <= 1000000) {
        GAMBLE_BET = v;
        gambleRenderBet();
        inp.value = "";
      }
    };
  }
  document.getElementById("dm-report-btn").onclick = reportCurrentDm;
  document.getElementById("dash-xp-take-btn").onclick = dashTakeXp;
  document.getElementById("dash-search").oninput = function () {
    if (dashSearchTimer) { clearTimeout(dashSearchTimer); }
    dashSearchTimer = setTimeout(dashSearchUsers, 300);
  };
  document.getElementById("dash-bans-toggle").onclick = function () {
    var w = document.getElementById("dash-bans-wrap");
    var t = document.getElementById("dash-bans-toggle");
    var show = w.className.indexOf("hidden") >= 0;
    w.className = show ? "section-body" : "hidden section-body";
    t.textContent = show ? "banned list \u2212" : "banned list +";
  };
  document.getElementById("dash-mods-toggle").onclick = function () {
    var w = document.getElementById("dash-mods-list-wrap");
    var t = document.getElementById("dash-mods-toggle");
    var show = w.className.indexOf("hidden") >= 0;
    w.className = show ? "section-body" : "hidden section-body";
    t.textContent = show ? "moderator list \u2212" : "moderator list +";
  };
  document.getElementById("ban-add-btn").onclick = function () {
    var name = document.getElementById("ban-input").value.replace(/^\s+|\s+$/g, "").toLowerCase();
    if (!validUsername(name)) { return; }
    db.ref("users").orderByChild("name").equalTo(name).once("value", function (snap) {
      if (!snap.exists()) { return; }
      var uid = Object.keys(snap.val())[0];
      var me = myUid();
      if (uid === me) { return; }
      askConfirm("Ban " + name + "? all of their messages will be deleted too.", function () {
        banUser(uid, name);
        document.getElementById("ban-input").value = "";
      });
    });
  };
  /* moderators (founder only, lives in dashboard now) */
  function loadDashMods() {
    var box = document.getElementById("dash-mod-list");
    box.innerHTML = "<p>loading...</p>";
    db.ref("mods").once("value", function (snap) {
      var v = snap.val() || {};
      var ks = Object.keys(v);
      box.innerHTML = "";
      if (!ks.length) { box.innerHTML = "<p>no moderators yet</p>"; }
      for (var i = 0; i < ks.length; i++) {
        (function (uid) {
          var row = document.createElement("div");
          row.className = "req-row";
          var p = document.createElement("p");
          p.textContent = v[uid].name || uid;
          row.appendChild(p);
          var rm = document.createElement("button");
          rm.className = "mini secondary";
          rm.textContent = "remove";
          rm.onclick = function () {
            db.ref("mods/" + uid).remove(function () { loadDashMods(); });
          };
          row.appendChild(rm);
          box.appendChild(row);
        })(ks[i]);
      }
    });
  }
  document.getElementById("dash-mod-add-btn").onclick = function () {
    var name = document.getElementById("dash-mod-input").value.replace(/^\s+|\s+$/g, "").toLowerCase();
    if (!validUsername(name)) { return; }
    db.ref("users").orderByChild("name").equalTo(name).once("value", function (snap) {
      if (!snap.exists()) { return; }
      var uid = Object.keys(snap.val())[0];
      db.ref("mods/" + uid).set({ name: name, at: Date.now(), by: "chickn" }, function () {
        document.getElementById("dash-mod-input").value = "";
        loadDashMods();
      });
    });
  };

  /* ---------- profiles ---------- */
  function enterProfile() {
    var u = auth.currentUser;
    if (!u) { return; }
    db.ref("users/" + u.uid).once("value", function (snap) {
      var rec = snap.val() || {};
      currentPfp = rec.pfp || blankPfp();
      var mp = document.getElementById("my-pfp");
      mp.innerHTML = "";
      mp.appendChild(pfpImg(currentPfp, 4));
      document.getElementById("my-name").textContent = rec.name || displayName();
      document.getElementById("my-joined").textContent = fmtDate(rec.joinedAt);
      document.getElementById("bio-input").value = rec.bio || "";
      document.getElementById("birthday-input").value = rec.birthday || "";
      document.getElementById("profile-ok").textContent = "";
      refreshHome();
      showScreen("profile-screen");
      renderMyBadges();
      db.ref("users/" + u.uid + "/helpfulReports").once("value", function (snap) {
        document.getElementById("my-helpful").textContent = snap.val() || 0;
      });
    });
    db.ref("follows/" + u.uid).once("value", function (snap) {
      var box = document.getElementById("following-list");
      box.innerHTML = "";
      var v = snap.val() || {};
      var ks = Object.keys(v);
      if (!ks.length) { box.innerHTML = "<p>not following anyone yet</p>"; return; }
      for (var i = 0; i < ks.length; i++) {
        (function (k) {
          var b = document.createElement("button");
          b.className = "room-btn secondary";
          b.textContent = v[k].name || "user";
          b.onclick = function () { openProfileByName(v[k].name); };
          box.appendChild(b);
        })(ks[i]);
      }
    });
  }

  document.getElementById("save-profile-btn").onclick = function () {
    var u = auth.currentUser;
    if (!u) { return; }
    var bio = document.getElementById("bio-input").value.replace(/^\s+|\s+$/g, "").substring(0, 150);
    var okMsg = document.getElementById("profile-ok");
    if (filterHit(bio)) {
      okMsg.textContent = "Keep your bio clean.";
      okMsg.style.color = "#990000";
      return;
    }
    var birthday = document.getElementById("birthday-input").value;
    db.ref("users/" + u.uid).update({ bio: censor(bio), birthday: birthday }, function (err) {
      if (err) {
        okMsg.textContent = "Could not save.";
        okMsg.style.color = "#990000";
      } else {
        goHome();
      }
    });
  };

  document.getElementById("settings-btn").onclick = function () { settingsReturn = "profile"; enterSettings(); };

  /* ---------- settings ---------- */
  function enterSettings() {
    var tz = null;
    try { tz = localStorage.getItem("readium_tz"); } catch (e) {}
    document.getElementById("tz-status").textContent = tz ? ("current timezone: " + tz) : "no city set — clock shows your device time.";
    document.getElementById("pw-msg").textContent = "";
    document.getElementById("new-pw-input").value = "";
    showScreen("settings-screen");
  }
  document.getElementById("city-save-btn").onclick = function () {
    var city = document.getElementById("city-input").value.replace(/^\s+|\s+$/g, "").toLowerCase();
    var tz = CITY_TZ[city];
    var st = document.getElementById("tz-status");
    if (!tz) {
      st.textContent = "Don't know that city — try a bigger nearby city.";
      return;
    }
    try { localStorage.setItem("readium_tz", tz); } catch (e) {}
    var u = auth.currentUser;
    if (u) { db.ref("users/" + u.uid + "/timezone").set(tz); }
    st.textContent = "current timezone: " + tz;
    updateClock();
  };
  document.getElementById("clock12-btn").onclick = function () {
    try { localStorage.setItem("readium_clock24", "0"); } catch (e) {}
    updateClock();
  };
  document.getElementById("clock24-btn").onclick = function () {
    try { localStorage.setItem("readium_clock24", "1"); } catch (e) {}
    updateClock();
  };
  document.getElementById("change-pw-btn").onclick = function () {
    var np = document.getElementById("new-pw-input").value;
    var msg = document.getElementById("pw-msg");
    if (np.length < 6) { msg.textContent = "Password must be at least 6 characters."; msg.style.color = "#990000"; return; }
    var u = auth.currentUser;
    if (!u) { return; }
    u.updatePassword(np).then(function () {
      document.getElementById("new-pw-input").value = "";
      msg.textContent = "Password changed!";
      msg.style.color = "#115511";
    }).catch(function (err) {
      msg.style.color = "#990000";
      if (err && err.code === "auth/requires-recent-login") {
        msg.textContent = "For safety, log out and back in, then try again.";
      } else {
        msg.textContent = "Could not change password.";
      }
    });
  };

  /* pixel pfp editor — real 16x16 grid, draw + erase */
  var editPfpStr = null;
  var editColor = "3";
  document.getElementById("edit-pfp-btn").onclick = function () {
    var u = auth.currentUser;
    if (!u) { return; }
    db.ref("users/" + u.uid + "/pfp").once("value", function (snap) {
      editPfpStr = snap.val() || blankPfp();
      editColor = "3";
      buildPfpEditor();
      showScreen("pfp-screen");
    });
  };
  function buildPfpEditor() {
    var pal = document.getElementById("pfp-palette");
    pal.innerHTML = "";
    var labels = ["white", "light gray", "dark gray", "black", "eraser"];
    for (var c = 0; c < 5; c++) {
      (function (c) {
        var key = c < 4 ? String(c) : "e";
        var s = document.createElement("div");
        s.className = "swatch" + (editColor === key ? " sel" : "");
        s.title = labels[c];
        if (c < 4) {
          s.style.background = PALETTE[c];
        } else {
          s.style.background = "#ffffff";
          s.textContent = "X";
        }
        s.onclick = function () { editColor = key; buildPfpEditor(); };
        pal.appendChild(s);
      })(c);
    }
    var grid = document.getElementById("pfp-grid");
    grid.innerHTML = "";
    for (var i = 0; i < 256; i++) {
      (function (i) {
        var cell = document.createElement("div");
        cell.className = "px";
        var ci = editPfpStr.charAt(i);
        cell.style.background = PALETTE[parseInt(ci, 10)] || PALETTE[0];
        var paint = function () {
          var col = (editColor === "e") ? "0" : editColor;
          editPfpStr = editPfpStr.substring(0, i) + col + editPfpStr.substring(i + 1);
          cell.style.background = PALETTE[parseInt(col, 10)];
        };
        cell.onmousedown = function (e) {
          painting = true;
          paint();
          if (e && e.preventDefault) { e.preventDefault(); }
        };
        cell.onmouseover = function () { if (painting) { paint(); } };
        grid.appendChild(cell);
      })(i);
    }
  }
  document.onmouseup = function () { painting = false; };
  document.getElementById("pfp-clear-btn").onclick = function () {
    editPfpStr = blankPfp();
    buildPfpEditor();
  };
  document.getElementById("pfp-save-btn").onclick = function () {
    var u = auth.currentUser;
    if (!u || !editPfpStr) { return; }
    currentPfp = editPfpStr;
    pfpCache = {};
    try {
      var lk = String(displayName()).toLowerCase();
      if (usersByName[lk]) { usersByName[lk].rec.pfp = editPfpStr; }
    } catch (e2) {}
    db.ref("users/" + u.uid).update({ pfp: editPfpStr }, function () { refreshHome(); enterProfile(); });
  };
  document.getElementById("pfp-back-btn").onclick = enterProfile;

  /* profile popup */
  function openProfileByName(name) {
    db.ref("users").orderByChild("name").equalTo(name).once("value", function (snap) {
      if (!snap.exists()) { return; }
      var uid = Object.keys(snap.val())[0];
      showProfilePopup(uid, snap.val()[uid]);
    });
  }
  function showProfilePopup(uid, rec) {
    ppUid = uid;
    var pp = document.getElementById("pp-pfp");
    pp.innerHTML = "";
    pp.appendChild(pfpImg(rec.pfp || blankPfp(), 4));
    document.getElementById("pp-name").textContent = rec.name || "user";
    var ppn = document.getElementById("pp-name");
    var ppt = petTagFor(rec.pet);
    if (ppt) { ppt.style.width = "28px"; ppt.style.height = "28px"; ppn.appendChild(ppt); }
    var pcard = document.getElementById("profile-card");
    pcard.className = "";
    var ptd = themeDefFor(rec.theme);
    if (ptd) { pcard.className = ptd.cls; }
    document.getElementById("pp-bio").textContent = rec.bio || "no bio yet";
    document.getElementById("pp-birthday").textContent = rec.birthday || "-";
    document.getElementById("pp-joined").textContent = fmtDate(rec.joinedAt);
    var me = myUid();
    var fb = document.getElementById("pp-follow-btn");
    var dmb = document.getElementById("pp-dm-btn");
    if (uid === me) {
      fb.className = "mini secondary hidden";
      dmb.className = "mini secondary hidden";
    } else {
      fb.className = "mini secondary";
      dmb.className = "mini secondary";
      db.ref("follows/" + me + "/" + uid).once("value", function (snap) {
        fb.textContent = snap.exists() ? "unfollow" : "follow";
      });
    }
    renderPopupBadges(uid);
    document.getElementById("profile-popup").className = "";
  }
  document.getElementById("pp-close-btn").onclick = function () {
    document.getElementById("profile-popup").className = "hidden";
    ppUid = null;
  };
  document.getElementById("pp-follow-btn").onclick = function () {
    var me = myUid();
    if (!me || !ppUid || ppUid === me) { return; }
    var fref = db.ref("follows/" + me + "/" + ppUid);
    var fb = document.getElementById("pp-follow-btn");
    fref.once("value", function (snap) {
      if (snap.exists()) {
        fref.remove(function () { fb.textContent = "follow"; });
        db.ref("followers/" + ppUid + "/" + me).remove();
      } else {
        fref.set(
          { name: document.getElementById("pp-name").textContent, at: Date.now() },
          function () { fb.textContent = "unfollow"; }
        );
        db.ref("followers/" + ppUid + "/" + me).set({ at: Date.now() });
      }
    });
  };
  document.getElementById("pp-tip-btn").onclick = function () {
    if (!ppUid || ppUid === myUid()) { return; }
    var amtStr = prompt("How much xp to tip (1-50)?", "10");
    if (amtStr === null) { return; }
    var amt = parseInt(amtStr, 10);
    if (isNaN(amt) || amt < 1) { flashNotice("enter a number from 1 to 50."); return; }
    if (amt > 50) { amt = 50; }
    askConfirm("Tip " + amt + " xp to " + document.getElementById("pp-name").textContent + "?", function () { tipXp(ppUid, amt); });
  };
  document.getElementById("pp-dm-btn").onclick = function () {
    var name = document.getElementById("pp-name").textContent;
    document.getElementById("profile-popup").className = "hidden";
    enterDmScreen();
    document.getElementById("dm-lookup").value = name;
    document.getElementById("dm-search-btn").onclick();
  };

  /* ---------- chat ---------- */
  function reportCurrentDm() {
    if (!currentRefPath || currentRefPath.indexOf("dms/") !== 0) { return; }
    var dmId = currentRefPath.split("/")[1];
    var reason = prompt("Why are you reporting this DM?", "");
    if (reason === null) { return; } // cancelled
    reason = String(reason || "").trim().substring(0, 200);
    db.ref("dms/" + dmId).once("value", function (snap) {
      var dm = snap.val() || {};
      var otherUid = "";
      // find the other person in this DM
      db.ref("userDms/" + myUid()).once("value", function (usnap) {
        var convos = usnap.val() || {};
        for (var k in convos) {
          if (convos[k] && convos[k].dmId === dmId) { otherUid = k; break; }
        }
        db.ref("dmReports").push({
          dmId: dmId,
          reporter: myUid(),
          reporterName: displayName(),
          reportedUid: otherUid,
          reason: reason,
          at: Date.now(),
          seen: false
        }, function () {
          flashNotice("DM reported. mods will review it.");
        });
      });
    });
  }
  function openChat(refPath, title, returnTo) {
    if (messagesRef) { messagesRef.off(); }
    if (pinsRef) { pinsRef.off(); pinsRef = null; }
    msgEls = {};
    clearReply();
    cancelEdit();
    clearMute();
    chatNearBottom = true;
    document.getElementById("latest-btn").className = "mini secondary hidden";
    document.getElementById("chat-title").textContent = title;
    currentRefPath = refPath;
    // show report button only for DMs
    var isDmChat = refPath.indexOf("dms/") === 0;
    document.getElementById("dm-report-btn").className = isDmChat ? "mini secondary" : "mini secondary hidden";
    currentChatTitle = title;
    if (refPath.indexOf("rooms/") === 0) { currentConvoKey = "r_" + refPath.split("/")[1]; }
    else if (refPath.indexOf("dms/") === 0) { currentConvoKey = "d_" + refPath.split("/")[1]; }
    else { currentConvoKey = "x"; }
    var box = document.getElementById("messages");
    box.innerHTML = "<p>loading...</p>";
    chatReturn = returnTo || "msgs";
    showScreen("chat-screen");
    pinsRef = db.ref("pins/" + currentConvoKey);
    pinsRef.on("value", function (snap) { renderPins(snap.val()); });
    if (typingRef) { typingRef.off(); typingRef = null; }
    clearTyping();
    typingRef = db.ref("typing/" + currentConvoKey);
    typingRef.on("value", function (snap) { renderTyping(snap.val()); });
    db.ref("users").limitToFirst(200).once("value", function (snap) {
      usersByName = {};
      var v = snap.val() || {};
      var uids = Object.keys(v);
      for (var i = 0; i < uids.length; i++) {
        if (v[uids[i]].name) { usersByName[String(v[uids[i]].name).toLowerCase()] = { uid: uids[i], rec: v[uids[i]] }; }
      }
      box.innerHTML = "";
      messagesRef = db.ref(refPath);
      messagesRef.limitToLast(50).on("child_added", function (s2) {
        renderMessage(s2.key, s2.val() || {});
      });
      messagesRef.on("child_changed", function (s2) {
        updateReactions(s2.key, (s2.val() || {}).reactions);
      });
    });
  }
  document.getElementById("back-btn").onclick = function () {
    if (messagesRef) { messagesRef.off(); messagesRef = null; }
    if (pinsRef) { pinsRef.off(); pinsRef = null; }
    if (typingRef) { typingRef.off(); typingRef = null; }
    clearTyping();
    msgEls = {};
    usersByName = {};
    clearReply();
    clearMute();
    if (chatReturn === "dm") { enterDmScreen(); }
    else { enterMsgs(); }
  };
  document.getElementById("messages").onscroll = function () {
    var box = document.getElementById("messages");
    chatNearBottom = (box.scrollHeight - box.scrollTop - box.clientHeight) < 60;
    document.getElementById("latest-btn").className = chatNearBottom ? "mini secondary hidden" : "mini secondary";
  };
  document.getElementById("latest-btn").onclick = function () {
    var box = document.getElementById("messages");
    box.scrollTop = box.scrollHeight;
  };

  /* pinned messages */
  function renderPins(pins) {
    var box = document.getElementById("pins-box");
    box.innerHTML = "";
    var keys = pins ? Object.keys(pins) : [];
    if (!keys.length) { return; }
    var label = document.createElement("div");
    label.className = "pin-label";
    label.textContent = "pinned:";
    box.appendChild(label);
    for (var i = 0; i < keys.length; i++) {
      (function (k) {
        var p = pins[k] || {};
        var row = document.createElement("div");
        row.className = "pin-row";
        var sp = document.createElement("span");
        sp.textContent = (p.name || "?") + ": " + censor(p.text || "");
        row.appendChild(sp);
        if (isMod && auth.currentUser) {
          var un = document.createElement("button");
          un.className = "mini secondary";
          un.textContent = "unpin";
          un.onclick = function () { db.ref("pins/" + currentConvoKey + "/" + k).remove(); };
          row.appendChild(un);
        }
        box.appendChild(row);
      })(keys[i]);
    }
  }
  function pinMessage(pushId, m) {
    if (!isMod || !currentConvoKey) { return; }
    db.ref("pins/" + currentConvoKey).push({
      msgId: pushId,
      text: String(m.text || "").substring(0, 200),
      name: m.name || "Reader",
      at: Date.now()
    });
  }

  /* reports */
  function submitReport(pushId, m, refPath, title) {
    var me = myUid();
    if (!me || !refPath) { return; }
    askConfirm("Report this to moderators?", function (notes) {
      db.ref("reports/" + pushId + "_" + me).set({
        msgId: pushId,
        refPath: refPath,
        title: title || "chat",
        text: String(m.text || "").substring(0, 200),
        name: m.name || "Reader",
        uid: m.uid || "",
        reporter: me,
        reporterName: displayName(),
        notes: String(notes || "").substring(0, 200),
        at: Date.now()
      }, function () { flashNotice("reported. mods will take a look."); });
    }, true);
  }

  function renderBody(text) {
    var div = document.createElement("div");
    var parts = String(text).split(/(@[a-z0-9._-]{3,20})/g);
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (/^@[a-z0-9._-]{3,20}$/.test(p)) {
        var b = document.createElement("b");
        b.textContent = p;
        div.appendChild(b);
      } else {
        div.appendChild(document.createTextNode(p));
      }
    }
    return div;
  }

  function renderMessage(pushId, m) {
    var box = document.getElementById("messages");
    var wrap = document.createElement("div");
    wrap.className = "msg";

    var head = document.createElement("div");
    head.className = "msg-head";
    var pw = document.createElement("span");
    pw.className = "pfp-click";
    var urec = usersByName[String(m.name || "").toLowerCase()];
    var pfpStr = (urec && urec.rec.pfp) ? urec.rec.pfp : null;
    if (!pfpStr && m.uid && auth.currentUser && m.uid === auth.currentUser.uid) { pfpStr = currentPfp; }
    if (pfpStr) { pw.appendChild(pfpImg(pfpStr, 2)); }
    else {
      var ph = document.createElement("div");
      ph.className = "pfp";
      ph.style.width = "32px";
      ph.style.height = "32px";
      ph.style.background = "#ffffff";
      pw.appendChild(ph);
    }
    var ns = document.createElement("span");
    ns.className = "name";
    var urecF = usersByName[String(m.name || "").toLowerCase()];
    ns.textContent = censor(flairName(m.name || "Reader", urecF ? urecF.rec : null));
    styleModName(ns, urecF ? urecF.uid : null, m.name);
    var ptag = petTagFor(urecF && urecF.rec ? urecF.rec.pet : null);
    if (ptag) { ns.appendChild(ptag); }
    var cttag = teamTagForUid(urecF ? urecF.uid : null);
    if (cttag) { ns.appendChild(cttag); }
    // (old v1 titles removed)
    var ts = document.createElement("span");
    ts.className = "time";
    ts.textContent = fmtClockTime(m.ts) + (m.edited ? " (edited)" : "");
    var goFn = function () { openProfileByName(m.name || "Reader"); };
    pw.onclick = goFn;
    ns.onclick = goFn;
    head.appendChild(pw);
    head.appendChild(ns);
    head.appendChild(ts);
    wrap.appendChild(head);

    if (m.replyTo) {
      var snippet = String(m.replyTo.text || "");
      if (snippet.length > 60) { snippet = snippet.substring(0, 60) + "..."; }
      var rq = document.createElement("div");
      rq.className = "reply-quote";
      rq.textContent = "\u21B5 " + censor(m.replyTo.name || "") + ": " + censor(snippet);
      wrap.appendChild(rq);
    }
    wrap.appendChild(renderBody(censor(m.text || "")));

    var rest = document.createElement("div");
    rest.innerHTML = '<div class="reactions" style="display:none"></div>' +
      '<div class="msg-actions"><button class="tiny secondary react-toggle">react</button><button class="tiny secondary reply-to-btn">reply</button></div>' +
      '<div class="emoji-picker hidden"></div>';
    while (rest.firstChild) { wrap.appendChild(rest.firstChild); }

    var actionsDiv = wrap.getElementsByClassName("msg-actions")[0];
    var repBtn = document.createElement("button");
    repBtn.className = "tiny secondary";
    repBtn.textContent = "!";
    repBtn.title = "report";
    repBtn.onclick = function () {
      submitReport(pushId, m, currentRefPath, currentChatTitle || "chat");
    };
    actionsDiv.appendChild(repBtn);
    if (isMod && auth.currentUser) {
      (function () {
        var del = document.createElement("button");
        del.className = "tiny secondary";
        del.textContent = "delete";
        del.onclick = function () {
          askConfirm("Delete this message?", function () {
            messagesRef.child(pushId).remove();
          });
        };
        actionsDiv.appendChild(del);
        var pin = document.createElement("button");
        pin.className = "tiny secondary";
        pin.textContent = "^";
        pin.title = "pin to top";
        pin.onclick = function () { pinMessage(pushId, m); };
        actionsDiv.appendChild(pin);
      })();
    }

    var reactionsDiv = wrap.getElementsByClassName("reactions")[0];
    var picker = wrap.getElementsByClassName("emoji-picker")[0];
    for (var i = 0; i < EMOJIS.length; i++) {
      (function (emoji) {
        var b = document.createElement("button");
        b.className = "mini secondary emoji-btn";
        b.textContent = emoji;
        b.onclick = function () {
          toggleReaction(pushId, emoji);
          picker.className = "emoji-picker hidden";
        };
        picker.appendChild(b);
      })(EMOJIS[i]);
    }
    wrap.getElementsByClassName("react-toggle")[0].onclick = function () {
      picker.className = (picker.className.indexOf("hidden") === -1) ? "emoji-picker hidden" : "emoji-picker";
    };
    if (auth.currentUser && m.uid && m.uid === auth.currentUser.uid) {
      var editBtn = document.createElement("button");
      editBtn.className = "tiny secondary";
      editBtn.textContent = "edit";
      editBtn.onclick = function () {
        editingId = pushId;
        clearReply();
        document.getElementById("msg-input").value = m.text || "";
        document.getElementById("send-btn").textContent = "save";
        document.getElementById("msg-input").focus();
      };
      actionsDiv.appendChild(editBtn);
    }
    wrap.getElementsByClassName("reply-to-btn")[0].onclick = function () {
      replyTarget = { id: pushId, name: m.name || "Reader", text: m.text || "" };
      var snip = String(replyTarget.text);
      if (snip.length > 40) { snip = snip.substring(0, 40) + "..."; }
      document.getElementById("reply-text").textContent = "replying to " + replyTarget.name + ": " + snip;
      document.getElementById("reply-bar").className = "";
      document.getElementById("msg-input").focus();
    };

    box.appendChild(wrap);
    msgEls[pushId] = { reactionsDiv: reactionsDiv };
    updateReactions(pushId, m.reactions);
    if (chatNearBottom) { box.scrollTop = box.scrollHeight; }
  }

  function updateReactions(pushId, reactions) {
    var rec = msgEls[pushId];
    if (!rec) { return; }
    var counts = {};
    var uids = reactions ? Object.keys(reactions) : [];
    for (var i = 0; i < uids.length; i++) {
      var e = reactions[uids[i]];
      if (e) { counts[e] = (counts[e] || 0) + 1; }
    }
    var div = rec.reactionsDiv;
    var keys = Object.keys(counts);
    if (!keys.length) { div.style.display = "none"; div.textContent = ""; return; }
    div.style.display = "block";
    var parts = [];
    for (var j = 0; j < keys.length; j++) { parts.push(keys[j] + " " + counts[keys[j]]); }
    div.textContent = parts.join("   ");
  }

  function toggleReaction(pushId, emoji) {
    var u = auth.currentUser;
    if (!u || !messagesRef) { return; }
    var rref = messagesRef.child(pushId).child("reactions").child(u.uid);
    rref.once("value", function (snap) {
      if (snap.val() === emoji) { rref.remove(); }
      else { rref.set(emoji); }
    });
  }

  function renderTyping(data) {
    var el = document.getElementById("typing-ind");
    if (!el) { return; }
    var me = myUid();
    var now = Date.now();
    var names = [];
    if (data) {
      var ks = Object.keys(data);
      for (var i = 0; i < ks.length; i++) {
        var t = data[ks[i]] || {};
        if (ks[i] !== me && t.ts && (now - t.ts) < 6000 && t.name) { names.push(t.name); }
      }
    }
    if (!names.length) { el.textContent = ""; return; }
    el.textContent = names.length === 1 ? (names[0] + " is typing...") : (names.join(", ") + " are typing...");
  }
  function clearTyping() {
    var me = myUid();
    if (me && currentConvoKey) {
      try { db.ref("typing/" + currentConvoKey + "/" + me).remove(); } catch (e) {}
    }
    var el = document.getElementById("typing-ind");
    if (el) { el.textContent = ""; }
  }
  function pokeTyping() {
    var me = myUid();
    if (!me || !currentConvoKey || currentConvoKey === "x") { return; }
    var now = Date.now();
    if (now - typingLast < 3000) { return; }
    typingLast = now;
    var r = db.ref("typing/" + currentConvoKey + "/" + me);
    r.set({ name: displayName(), ts: now });
    try { r.onDisconnect().remove(); } catch (e) {}
  }
  function clearReply() {
    replyTarget = null;
    document.getElementById("reply-bar").className = "hidden";
    document.getElementById("reply-text").textContent = "";
  }
  function cancelEdit() {
    editingId = null;
    document.getElementById("send-btn").textContent = "Send";
    document.getElementById("msg-input").value = "";
  }
  document.getElementById("reply-cancel").onclick = function () { clearReply(); cancelEdit(); };

  /* spam protection: >6 messages in 10s = 30s mute */
  function clearMute() {
    msgTimes = [];
    mutedUntil = 0;
    if (muteTimer) { clearInterval(muteTimer); muteTimer = null; }
    var mn = document.getElementById("mute-notice");
    if (mn) { mn.textContent = ""; }
  }
  function startMuteCountdown() {
    var notice = document.getElementById("mute-notice");
    if (muteTimer) { clearInterval(muteTimer); }
    var tick = function () {
      var left = Math.ceil((mutedUntil - Date.now()) / 1000);
      if (left <= 0) {
        clearInterval(muteTimer);
        muteTimer = null;
        notice.textContent = "";
        return;
      }
      notice.textContent = "whoa, slow down! you can type again in " + left + "s";
    };
    tick();
    muteTimer = setInterval(tick, 1000);
  }
  function spamCheck() {
    var now = Date.now();
    if (now < mutedUntil) { return false; }
    msgTimes.push(now);
    var cutoff = now - 10000;
    var recent = [];
    for (var i = 0; i < msgTimes.length; i++) {
      if (msgTimes[i] > cutoff) { recent.push(msgTimes[i]); }
    }
    msgTimes = recent;
    if (msgTimes.length > 6) {
      mutedUntil = now + 30000;
      msgTimes = [];
      startMuteCountdown();
      return false;
    }
    return true;
  }

  function sendMessage() {
    var input = document.getElementById("msg-input");
    var text = input.value.replace(/^\s+|\s+$/g, "");
    if (!text || !auth.currentUser || !messagesRef) { return; }
    var me = myUid();
    db.ref("bans/" + me).once("value", function (snap) {
      var b = snap.val();
      if (b) {
        if (b.until && b.until <= Date.now()) { db.ref("bans/" + me).remove(); }
        else {
          flashNotice(b.until ? ("you are banned for " + Math.ceil((b.until - Date.now()) / 60000) + " more min.") : "you have been banned from chatting.");
          return;
        }
      }
      if (!isMod && filterHit(text)) { flashNotice("keep it clean!"); return; }
      if (!spamCheck()) { return; }
      if (editingId) {
        var eid = editingId;
        editingId = null;
        document.getElementById("send-btn").textContent = "Send";
        var upd = { text: isMod ? text : censor(text), edited: true };
        messagesRef.child(eid).update(upd);
        input.value = "";
        clearReply();
        return;
      }
      var msg = { name: displayName(), text: isMod ? text : censor(text), ts: Date.now(), uid: me };
      if (replyTarget) {
        msg.replyTo = { name: replyTarget.name, text: String(replyTarget.text).substring(0, 120) };
      }
      messagesRef.push(msg, function (err) {
        if (err) { alert("Send failed: " + (err.code || err.message || err)); }
        else { grantXp(1, "msg", 60000); }
      });
      clearTyping();
      sendMentions(text);
      input.value = "";
      clearReply();
    });
  }
  document.getElementById("send-btn").onclick = sendMessage;
  document.getElementById("msg-input").onkeydown = function (e) {
    if (e.keyCode === 13 && !e.shiftKey) {
      if (getSendOnEnter()) { e.preventDefault(); sendMessage(); }
      // if send-on-enter is off, let Enter create a new line naturally
    }
  };
  document.getElementById("msg-input").oninput = function () { pokeTyping(); };
  document.getElementById("password-input").onkeydown = function (e) {
    if (e.keyCode === 13) { document.getElementById("login-btn").onclick(); }
  };

  /* ---------- neighborhood ---------- */
  function fmtTime(ts) {
    if (!ts) { return ""; }
    var d = new Date(ts);
    return (d.getMonth() + 1) + "/" + d.getDate() + " " + fmtClockTime(ts);
  }
  function hoodBanActive(b) {
    return b && !(b.until && b.until <= Date.now());
  }
  function enterHood() {
    wantHood = false;
    showScreen("hood-screen");
    document.getElementById("hood-msg").textContent = "";
    var feed = document.getElementById("hood-feed");
    feed.innerHTML = "<p>loading...</p>";
    if (hoodFeedRef) { hoodFeedRef.off(); }
    for (var k in hoodCommentsRefs) { hoodCommentsRefs[k].off(); }
    hoodCommentsRefs = {};
    var first = true;
    hoodFeedRef = db.ref("hoodPosts").orderByChild("ts").limitToLast(20);
    hoodFeedRef.on("child_added", function (snap) {
      if (first) { first = false; feed.innerHTML = ""; }
      renderHoodPost(snap.key, snap.val() || {}, feed);
    });
    hoodFeedRef.on("child_removed", function (snap) {
      var el = document.getElementById("hood-" + snap.key);
      if (el && el.parentNode) { el.parentNode.removeChild(el); }
    });
    hoodFeedRef.on("child_changed", function (snap) {
      var p = snap.val() || {};
      var n = (p.comments) ? Object.keys(p.comments).length : 0;
      var btn = document.getElementById("hood-cc-" + snap.key);
      if (btn) { btn.textContent = "comments (" + n + ")"; }
    });
  }
  function renderHoodPost(postId, p, feed) {
    var wrap = document.createElement("div");
    wrap.className = "req-row";
    wrap.id = "hood-" + postId;
    var head = document.createElement("p");
    var b = document.createElement("b");
    b.textContent = censor(p.name || "Reader");
    styleModName(b, p.uid, p.name);
    head.appendChild(b);
    var hpt = petTagForName(p.name);
    if (hpt) { head.appendChild(hpt); }

    var ts = document.createElement("span");
    ts.style.fontSize = "14px";
    ts.style.color = "#555555";
    ts.textContent = "  " + fmtTime(p.ts);
    head.appendChild(ts);
    wrap.appendChild(head);
    var body = document.createElement("p");
    body.textContent = censor(p.text || "");
    wrap.appendChild(body);
    var row = document.createElement("div");
    var expanded = false;
    var cdiv = document.createElement("div");
    cdiv.className = "hidden";
    cdiv.id = "hood-c-" + postId;
    var cbtn = document.createElement("button");
    cbtn.className = "mini secondary";
    cbtn.id = "hood-cc-" + postId;
    var hcc = (p.comments) ? Object.keys(p.comments).length : 0;
    cbtn.textContent = "comments (" + hcc + ")";
    cbtn.onclick = function () {
      expanded = !expanded;
      cdiv.className = expanded ? "" : "hidden";
      if (expanded) { loadHoodComments(postId); }
      else if (hoodCommentsRefs[postId]) { hoodCommentsRefs[postId].off(); delete hoodCommentsRefs[postId]; }
    };
    row.appendChild(cbtn);
    if (auth.currentUser && p.uid && p.uid !== myUid()) {
      var apb = document.createElement("button");
      apb.className = "mini secondary";
      apb.textContent = "appreciate";
      apb.onclick = (function (pid, authorUid, authorName) {
        return function () {
          var k = "appr_" + pid;
          var last = 0;
          try { last = parseInt(localStorage.getItem(k) || "0", 10); } catch (e) {}
          if (Date.now() - last < 3600000) { flashNotice("you already appreciated this one!"); return; }
          try { localStorage.setItem(k, String(Date.now())); } catch (e2) {}
          changeXp(authorUid, 1);
          flashNotice("you gave " + authorName + " +1 xp for being awesome!");
        };
      })(postId, p.uid, p.name || "them");
      row.appendChild(apb);
    }
    if (auth.currentUser && (isMod || p.uid === myUid())) {
      var del = document.createElement("button");
      del.className = "mini secondary";
      del.textContent = "delete";
      del.onclick = function () {
        askConfirm("Delete this post?", function () { db.ref("hoodPosts/" + postId).remove(); });
      };
      row.appendChild(del);
    }
    var rep = document.createElement("button");
    rep.className = "mini secondary";
    rep.textContent = "report";
    rep.onclick = function () {
      submitReport(postId, { name: p.name, text: p.text }, "hoodPosts", "neighborhood");
    };
    row.appendChild(rep);
    wrap.appendChild(row);
    wrap.appendChild(cdiv);
    feed.insertBefore(wrap, feed.firstChild);
  }
  function loadHoodComments(postId) {
    var box = document.getElementById("hood-c-" + postId);
    if (!box) { return; }
    box.innerHTML = "<p>loading comments...</p>";
    if (hoodCommentsRefs[postId]) { hoodCommentsRefs[postId].off(); }
    var ref = db.ref("hoodPosts/" + postId + "/comments").orderByChild("ts").limitToLast(10);
    hoodCommentsRefs[postId] = ref;
    ref.on("value", function (snap) { renderHoodComments(postId, snap.val()); });
  }
  function renderHoodComments(postId, data) {
    var box = document.getElementById("hood-c-" + postId);
    if (!box) { return; }
    box.innerHTML = "";
    var keys = data ? Object.keys(data) : [];
    keys.sort(function (a, b) { return (data[b].ts || 0) - (data[a].ts || 0); });
    for (var i = 0; i < keys.length; i++) {
      (function (k) {
        var c = data[k] || {};
        var d = document.createElement("div");
        d.style.cssText = "font-size:17px;border-top:1px solid #999999;padding:6px 0;";
        if (c.uid) {
          var cpi = pfpImg(null, 1);
          cpi.style.verticalAlign = "middle"; cpi.style.marginRight = "6px";
          fillPfpImg(cpi, c.uid);
          d.appendChild(cpi);
        }
        var nm = document.createElement("b");
        nm.textContent = censor(c.name || "Reader") + ": ";
        var tx = document.createElement("span");
        tx.textContent = censor(c.text || "");
        d.appendChild(nm);

        d.appendChild(tx);
        if (auth.currentUser && (isMod || c.uid === myUid())) {
          var del = document.createElement("button");
          del.className = "mini secondary";
          del.textContent = "delete";
          del.onclick = function () { db.ref("hoodPosts/" + postId + "/comments/" + k).remove(); };
          d.appendChild(del);
        }
        var rep = document.createElement("button");
        rep.className = "mini secondary";
        rep.textContent = "report";
        rep.onclick = function () {
          submitReport(k, { name: c.name, text: c.text }, "hoodPosts/" + postId + "/comments", "neighborhood");
        };
        d.appendChild(rep);
        box.appendChild(d);
      })(keys[i]);
    }
    var inp = document.createElement("input");
    inp.type = "text";
    inp.maxLength = 300;
    inp.placeholder = "add a comment...";
    inp.style.marginTop = "6px";
    var btn = document.createElement("button");
    btn.className = "mini";
    btn.textContent = "comment";
    btn.onclick = function () {
      var t = inp.value.replace(/^\s+|\s+$/g, "");
      if (!t || !auth.currentUser) { return; }
      var me = myUid();
      db.ref("bans/" + me).once("value", function (snap) {
        if (hoodBanActive(snap.val())) { return; }
        if (!isMod && filterHit(t)) { return; }
        db.ref("hoodPosts/" + postId + "/comments").push(
          { name: displayName(), uid: me, text: isMod ? t : censor(t), ts: Date.now() },
          function (err) {
            inp.value = "";
            if (!err) { grantXp(2, "comment", 30000); }
            db.ref("hoodPosts/" + postId).once("value", function (ps) {
              var p = ps.val() || {};
              if (p.uid && p.uid !== me) {
                db.ref("mentionNotifs/" + p.uid).push({
                  kind: "reply",
                  from: displayName(),
                  title: "neighborhood",
                  text: String(t).substring(0, 80),
                  refPath: "hoodPosts",
                  at: Date.now()
                });
              }
            });
          }
        );
      });
    };
    box.appendChild(inp);
    box.appendChild(btn);
  }
  function notifyFollowers(text) {
    var me = myUid();
    if (!me) { return; }
    db.ref("followers/" + me).once("value", function (snap) {
      var fs = snap.val() || {};
      var ids = Object.keys(fs);
      for (var i = 0; i < ids.length; i++) {
        if (ids[i] === me) { continue; }
        db.ref("mentionNotifs/" + ids[i]).push({
          kind: "follow",
          from: displayName(),
          title: "neighborhood",
          text: String(text).substring(0, 80),
          refPath: "hoodPosts",
          at: Date.now()
        });
      }
    });
  }
  function hoodPost() {
    var input = document.getElementById("hood-input");
    var text = input.value.replace(/^\s+|\s+$/g, "");
    var msg = document.getElementById("hood-msg");
    if (!text || !auth.currentUser) { return; }
    var me = myUid();
    db.ref("bans/" + me).once("value", function (snap) {
      if (hoodBanActive(snap.val())) { msg.textContent = "you are banned."; msg.style.color = "#990000"; return; }
      if (!isMod && filterHit(text)) { msg.textContent = "keep it clean!"; msg.style.color = "#990000"; return; }
      var now = Date.now();
      db.ref("hoodLastPost/" + me).once("value", function (s2) {
        var last = s2.val();
        if (last && now - last.at < 600000) {
          var left = Math.ceil((600000 - (now - last.at)) / 60000);
          msg.textContent = "one post every 10 minutes — try again in " + left + " min.";
          msg.style.color = "#990000";
          return;
        }
        db.ref("hoodLastPost/" + me).transaction(function (cur) {
          if (cur && now - cur.at < 600000) { return; }
          return { at: now };
        }, function (err, committed) {
          if (!committed) { msg.textContent = "too soon — wait a bit."; msg.style.color = "#990000"; return; }
          db.ref("hoodPosts").push(
            { name: displayName(), uid: me, text: isMod ? text : censor(text), ts: now },
            function () {
              input.value = "";
              msg.textContent = "posted!";
              msg.style.color = "#115511";
              notifyFollowers(text);
              grantXp(5, "hoodpost", 60000);
            }
          );
        });
      });
    });
  }
  document.getElementById("hood-post-btn").onclick = hoodPost;
  document.getElementById("hood-input").onkeydown = function (e) {
    if (e.keyCode === 13 && !e.shiftKey) {
      if (getSendOnEnter()) { e.preventDefault(); hoodPost(); }
    }
  };
  document.getElementById("hood-home-btn").onclick = goHome;

  function applyTheme() {
    var dark = false;
    try { dark = localStorage.getItem("readium_theme") === "dark"; } catch (e) {}
    try { document.body.className = document.body.className.replace(/\bdark\b/g, "").replace(/^\s+|\s+$/g, ""); } catch (e2) {}
    if (dark) { document.body.className = (document.body.className + " dark").replace(/^\s+|\s+$/g, ""); }
    var lb = document.getElementById("theme-light-btn");
    var db = document.getElementById("theme-dark-btn");
    if (lb) { lb.textContent = dark ? "light mode" : "light mode \u2713"; }
    if (db) { db.textContent = dark ? "dark mode \u2713" : "dark mode"; }
  }
  document.getElementById("theme-light-btn").onclick = function () {
    try { localStorage.setItem("readium_theme", "light"); } catch (e) {}
    applyTheme();
  };
  document.getElementById("theme-dark-btn").onclick = function () {
    try { localStorage.setItem("readium_theme", "dark"); } catch (e) {}
    applyTheme();
  };
  applyTheme();
  function applyFontSize() {
    var big = false;
    try { big = localStorage.getItem("readium_bigfont") === "1"; } catch (e) {}
    try {
      if (big) { document.body.classList.add("bigfont"); }
      else { document.body.classList.remove("bigfont"); }
      // fallback for old browsers
      document.body.style.zoom = big ? "1.25" : "1";
    } catch (e2) {}
    var nb = document.getElementById("font-normal-btn");
    var lb = document.getElementById("font-large-btn");
    if (nb) { nb.textContent = big ? "normal text" : "normal text \u2713"; }
    if (lb) { lb.textContent = big ? "large text \u2713" : "large text"; }
  }
  document.getElementById("font-normal-btn").onclick = function () {
    try { localStorage.setItem("readium_bigfont", "0"); } catch (e) {}
    applyFontSize();
  };
  document.getElementById("font-large-btn").onclick = function () {
    try { localStorage.setItem("readium_bigfont", "1"); } catch (e) {}
    applyFontSize();
  };
  applyFontSize();

  /* ---------- games ---------- */
  var gameMode = null; // 'bot' | 'net'
  var lobbyId = null;
  var lobbyRef = null;
  var myMark = null;
  var botBoard = null;
  var botThinking = false;
  var gameOver = false;
  var WINS = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

  function emptyBoard() { return [null,null,null,null,null,null,null,null,null]; }
  function checkWin(b) {
    for (var i = 0; i < WINS.length; i++) {
      var w = WINS[i];
      if (b[w[0]] && b[w[0]] === b[w[1]] && b[w[0]] === b[w[2]]) { return b[w[0]]; }
    }
    for (var j = 0; j < 9; j++) { if (!b[j]) { return null; } }
    return "draw";
  }

  function enterGames() {
    wantGames = false;
    gameMode = null;
    showScreen("games-screen");
    stopOpenGames();
    openGamesRef = db.ref("gameLobbies");
    openGamesRef.on("value", function (snap) { renderOpenGames(snap.val()); });
  }
  function stopOpenGames() {
    if (openGamesRef) { openGamesRef.off(); openGamesRef = null; }
  }
  function renderOpenGames(data) {
    var box = document.getElementById("open-games");
    box.innerHTML = "";
    var now = Date.now();
    var me = myUid();
    var ids = data ? Object.keys(data) : [];
    var shown = 0;
    for (var i = 0; i < ids.length; i++) {
      (function (id) {
        var L = data[id];
        if (!L || L.status !== "waiting") { return; }
        if (L.host && L.host.uid === me) { return; }
        if (L.createdAt && now - L.createdAt > 3 * 3600 * 1000) { return; }
        shown++;
        var gname = (L.game === "connect4") ? "connect 4" : (L.game === "chess") ? "chess" : (L.game === "pictionary") ? "pictionary" : "tic tac toe";
        var b = document.createElement("button");
        b.className = "room-btn secondary";
        b.textContent = "join " + ((L.host && L.host.name) || "someone") + "'s " + gname + " game";
        b.onclick = function () { joinLobby(id); };
        box.appendChild(b);
      })(ids[i]);
    }
    if (!shown) { box.innerHTML = "<p>No open games right now — host one!</p>"; }
  }

  function drawBoard(board, clickable, onCell) {
    var bd = document.getElementById("ttt-board");
    bd.innerHTML = "";
    for (var r = 0; r < 3; r++) {
      var row = document.createElement("div");
      for (var ci = 0; ci < 3; ci++) {
        (function (i) {
          var c = document.createElement("button");
          var col = i % 3;
          var rw = Math.floor(i / 3);
          c.className = "cell" + (col < 2 ? " br" : "") + (rw < 2 ? " bb" : "");
          c.textContent = board[i] || "";
          c.disabled = !clickable || !!board[i];
          c.onclick = function () { if (onCell) { onCell(i); } };
          row.appendChild(c);
        })(r * 3 + ci);
      }
      bd.appendChild(row);
    }
  }

  /* bot game */
  function startBotGame() {
  gameXpGiven = false;
    gameMode = "bot";
    botBoard = emptyBoard();
    botThinking = false;
    gameOver = false;
    document.getElementById("ttt-title").textContent = "tic tac toe vs bot";
    document.getElementById("ttt-rematch-btn").className = "hidden";
    document.getElementById("ttt-leave-btn").textContent = "quit";
    showScreen("ttt-screen");
    renderBot();
  }
  function botPick(b) {
    var i, k;
    for (i = 0; i < 9; i++) { if (!b[i]) { b[i] = "O"; if (checkWin(b) === "O") { b[i] = null; return i; } b[i] = null; } }
    for (i = 0; i < 9; i++) { if (!b[i]) { b[i] = "X"; if (checkWin(b) === "X") { b[i] = null; return i; } b[i] = null; } }
    if (!b[4]) { return 4; }
    if (Math.random() < 0.25) {
      var empt = [];
      for (i = 0; i < 9; i++) { if (!b[i]) { empt.push(i); } }
      return empt[Math.floor(Math.random() * empt.length)];
    }
    var pref = [0, 2, 6, 8, 1, 3, 5, 7];
    for (k = 0; k < pref.length; k++) { if (!b[pref[k]]) { return pref[k]; } }
    return -1;
  }
  function renderBot() {
    var w = checkWin(botBoard);
    var st = document.getElementById("ttt-status");
    if (w === "X") { st.textContent = "you win! +10 xp"; gameOver = true; xpWinOnce(); }
    else if (w === "O") { st.textContent = "bot wins!"; gameOver = true; }
    else if (w === "draw") { st.textContent = "draw!"; gameOver = true; }
    else if (botThinking) { st.textContent = "bot is thinking..."; }
    else { st.textContent = "your turn (X)"; }
    document.getElementById("ttt-rematch-btn").className = gameOver ? "" : "hidden";
    drawBoard(botBoard, !gameOver && !botThinking, botCell);
  }
  function botCell(i) {
    if (gameOver || botThinking || botBoard[i]) { return; }
    botBoard[i] = "X";
    renderBot();
    if (checkWin(botBoard)) { return; }
    botThinking = true;
    renderBot();
    setTimeout(function () {
      var b = botPick(botBoard);
      if (b >= 0) { botBoard[b] = "O"; }
      botThinking = false;
      renderBot();
    }, 800);
  }
  /* game menu: tiles open this, then pick bot or online */
  var gmGame = null;
  /* ---------- popup notifications ---------- */
  function notify(title, msg, onclick) {
    var wrap = document.getElementById("notif-wrap");
    var d = document.createElement("div");
    d.className = "notif";
    var t = document.createElement("div");
    t.className = "notif-title";
    t.textContent = title;
    d.appendChild(t);
    if (msg) {
      var m = document.createElement("div");
      m.textContent = msg;
      d.appendChild(m);
    }
    d.onclick = function () {
      if (onclick) { try { onclick(); } catch (e) {} }
      if (d.parentNode) { d.parentNode.removeChild(d); }
    };
    wrap.appendChild(d);
    setTimeout(function () { if (d.parentNode) { d.parentNode.removeChild(d); } }, 8000);
    // keep max 3
    while (wrap.children.length > 3) { wrap.removeChild(wrap.children[0]); }
  }

  /* ---------- game title screens ---------- */
  var GAME_INFO = {
    ttt: { title: "tic tac toe", desc: "Get three in a row before your opponent! Play against the bot or challenge someone online.",
      settings: [{ id: "mode", label: "mode", opts: ["vs bot", "online"] }, { id: "diff", label: "bot difficulty", opts: ["easy", "hard"] }] },
    c4: { title: "connect four", desc: "Drop discs and connect four in a row! Play against the bot or challenge someone online.",
      settings: [{ id: "mode", label: "mode", opts: ["vs bot", "online"] }, { id: "diff", label: "bot difficulty", opts: ["easy", "hard"] }] },
    chess: { title: "chess", desc: "The classic game of strategy. Play against the bot or challenge someone online.",
      settings: [{ id: "mode", label: "mode", opts: ["vs bot", "online"] }, { id: "diff", label: "bot difficulty", opts: ["easy", "hard"] }] },
    pic: { title: "pictionary", desc: "Draw the word and have your partner guess it! Online multiplayer only.",
      settings: [] },
    life: { title: "life sim", desc: "Live a whole life! Go to school, get a job, find love, have kids, and see how it all turns out.",
      settings: [] },
    gol: { title: "Zaya's game of life", desc: "Watch cells live and die by simple rules. Draw patterns and see what happens!",
      settings: [{ id: "speed", label: "speed", opts: ["slow", "fast"] }] },
    sol: { title: "solitaire", desc: "Classic Klondike solitaire. Stack cards and clear all four suits to win!",
      settings: [{ id: "draw", label: "draw", opts: ["1", "3"] }] },
    critter: { title: "critter catch", desc: "Catch wild critters, battle them, and build your collection! 12 original critters to find.",
      settings: [] },
    alc: { title: "alchemy", desc: "Mix elements to discover new ones! Start with 4 basics and find all 60+.",
      settings: [] },
    gamble: { title: "play your luck", desc: "Bet your XP on coin flips, dice rolls, and slots! Wins grow your XP, losses shrink it. The biggest losers board tracks who lost the most.",
      settings: [] }
  };
  var gtGame = null, gtSettings = {};
  function showGameTitle(g) {
    var info = GAME_INFO[g];
    if (!info) { return; }
    gtGame = g;
    gtSettings = {};
    document.getElementById("gt-title").textContent = info.title;
    document.getElementById("gt-desc").textContent = info.desc;
    var box = document.getElementById("gt-settings");
    box.innerHTML = "";
    info.settings.forEach(function (s) {
      gtSettings[s.id] = s.opts[0];
      var row = document.createElement("div");
      row.className = "setting-row";
      var lab = document.createElement("p");
      lab.textContent = s.label + ":";
      row.appendChild(lab);
      s.opts.forEach(function (o) {
        (function (opt) {
          var b = document.createElement("button");
          b.textContent = opt;
          if (opt === s.opts[0]) { b.className = "sel"; }
          b.onclick = function () {
            gtSettings[s.id] = opt;
            var btns = row.getElementsByTagName("button");
            for (var i = 0; i < btns.length; i++) { btns[i].className = ""; }
            b.className = "sel";
          };
          row.appendChild(b);
        })(o);
      });
      box.appendChild(row);
    });
    showScreen("gametitle-screen");
  }
  function gtStart() {
    var g = gtGame;
    if (!g) { return; }
    if (g === "ttt" || g === "c4" || g === "chess" || g === "pic") {
      // use existing game menu flow but with settings
      if (gtSettings.mode === "online") { openGameMenu(g); document.getElementById("gm-host-btn").onclick(); }
      else { openGameMenu(g); document.getElementById("gm-bot-btn").onclick(); }
    }
    else if (g === "life") { enterLife(); }
    else if (g === "gol") { enterGol(); }
    else if (g === "sol") { enterSol(); }
    else if (g === "critter") { enterCritter(); }
    else if (g === "alc") { enterAlc(); }
    else if (g === "gamble") { enterGamble(); }
  }

  function openGameMenu(g) {
    gmGame = g;
    document.getElementById("gm-title").textContent = g === "ttt" ? "tic tac toe" : g === "c4" ? "connect four" : g === "chess" ? "chess" : "pictionary";
    document.getElementById("gm-bot-btn").className = (g === "pic") ? "hidden" : "";
    showScreen("gamemenu-screen");
  }
  document.getElementById("g-tile-ttt").onclick = function () { showGameTitle("ttt"); };
  document.getElementById("g-tile-c4").onclick = function () { showGameTitle("c4"); };
  document.getElementById("g-tile-chess").onclick = function () { showGameTitle("chess"); };
  document.getElementById("g-tile-pic").onclick = function () { showGameTitle("pic"); };
  document.getElementById("g-tile-life").onclick = function () { showGameTitle("life"); };
  document.getElementById("g-tile-gol").onclick = function () { showGameTitle("gol"); };
  document.getElementById("g-tile-sol").onclick = function () { showGameTitle("sol"); };
  document.getElementById("g-tile-critter").onclick = function () { showGameTitle("critter"); };
  document.getElementById("g-tile-alc").onclick = function () { showGameTitle("alc"); };
  document.getElementById("g-tile-gamble").onclick = function () { showGameTitle("gamble"); };
  document.getElementById("gt-start-btn").onclick = function () { gtStart(); };
  document.getElementById("gt-back-btn").onclick = function () { enterGames(); };
  document.getElementById("alc-mix-btn").onclick = function () { alcMix(); };
  document.getElementById("alc-clear-btn").onclick = function () { alcSel = []; document.getElementById("alc-msg").textContent = ""; alcRender(); };
  document.getElementById("alc-home-btn").onclick = function () { enterGames(); };
  document.getElementById("gamble-heads").onclick = function () { gambleCoin("heads"); };
  document.getElementById("gamble-tails").onclick = function () { gambleCoin("tails"); };
  document.getElementById("gamble-spin").onclick = function () { gambleSlots(); };
  document.getElementById("gamble-back-btn").onclick = function () { enterGames(); };
  document.getElementById("alc-search").oninput = function () { alcSearchQ = this.value; alcRender(); };
  function showHelp(t) {
    document.getElementById("help-text").textContent = t;
    var hp = document.getElementById("help-popup");
    hp.className = "";
    hp.style.display = "flex";
  }
  document.getElementById("help-close-btn").onclick = function () {
    var hp = document.getElementById("help-popup");
    hp.className = "hidden";
    hp.style.display = "none";
  };
  (function () {
    var btns = document.getElementsByClassName("game-help-btn");
    for (var i = 0; i < btns.length; i++) {
      (function (b) {
        b.onclick = function (ev) { if (ev) { ev.stopPropagation(); } showHelp(b.getAttribute("data-help")); };
      })(btns[i]);
    }
  })();
  document.getElementById("log-back-btn").onclick = goHome;
  document.getElementById("gm-bot-btn").onclick = function () { if (gmGame === "ttt") { startBotGame(); } else if (gmGame === "c4") { startC4Bot(); } else if (gmGame === "chess") { startChessBot(); } };
  document.getElementById("gm-host-btn").onclick = function () { if (gmGame === "ttt") { hostGame(); } else if (gmGame === "c4") { hostC4Game(); } else if (gmGame === "chess") { hostChessGame(); } else if (gmGame === "pic") { hostPicGame(); } };
  document.getElementById("gm-back-btn").onclick = enterGames;

  /* ---------- conway's game of life ---------- */
  var golCols = 28, golRows = 18, golCell = 16;
  var golGrid = null, golGen = 0, golTimer = null, golStamp = null;
  var GOL_PATTERNS = {
    glider: [[1,0],[2,1],[0,2],[1,2],[2,2]],
    blinker: [[0,0],[1,0],[2,0]],
    toad: [[1,0],[2,0],[3,0],[0,1],[1,1],[2,1]],
    beacon: [[0,0],[1,0],[0,1],[3,2],[2,3],[3,3]],
    pulsar: [[2,0],[3,0],[4,0],[8,0],[9,0],[10,0],[2,12],[3,12],[4,12],[8,12],[9,12],[10,12],
             [0,2],[5,2],[7,2],[12,2],[0,3],[5,3],[7,3],[12,3],[0,4],[5,4],[7,4],[12,4],
             [2,5],[3,5],[4,5],[8,5],[9,5],[10,5],[2,7],[3,7],[4,7],[8,7],[9,7],[10,7],
             [0,8],[5,8],[7,8],[12,8],[0,9],[5,9],[7,9],[12,9],[0,10],[5,10],[7,10],[12,10]]
  };
  function golNewGrid() {
    var g = [];
    for (var y = 0; y < golRows; y++) { var r = []; for (var x = 0; x < golCols; x++) { r.push(0); } g.push(r); }
    return g;
  }
  function golPop() {
    var n = 0;
    for (var y = 0; y < golRows; y++) { for (var x = 0; x < golCols; x++) { if (golGrid[y][x]) { n++; } } }
    return n;
  }
  function golRender() {
    var cv = document.getElementById("gol-canvas");
    if (!cv || !cv.getContext) { return; }
    var ctx = cv.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = "#000000";
    for (var y = 0; y < golRows; y++) {
      for (var x = 0; x < golCols; x++) {
        if (golGrid[y][x]) { ctx.fillRect(x * golCell, y * golCell, golCell, golCell); }
      }
    }
    ctx.strokeStyle = "#dddddd";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var gx = 0; gx <= golCols; gx++) { ctx.moveTo(gx * golCell + 0.5, 0); ctx.lineTo(gx * golCell + 0.5, cv.height); }
    for (var gy = 0; gy <= golRows; gy++) { ctx.moveTo(0, gy * golCell + 0.5); ctx.lineTo(cv.width, gy * golCell + 0.5); }
    ctx.stroke();
    document.getElementById("gol-stats").textContent = "gen " + golGen + " \u00b7 " + golPop() + " alive";
  }
  function golStep() {
    var next = golNewGrid();
    for (var y = 0; y < golRows; y++) {
      for (var x = 0; x < golCols; x++) {
        var n = 0;
        for (var dy = -1; dy <= 1; dy++) {
          for (var dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) { continue; }
            var nx = x + dx, ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < golCols && ny < golRows && golGrid[ny][nx]) { n++; }
          }
        }
        if (golGrid[y][x]) { next[y][x] = (n === 2 || n === 3) ? 1 : 0; }
        else { next[y][x] = (n === 3) ? 1 : 0; }
      }
    }
    golGrid = next;
    golGen++;
    golRender();
  }
  function golPause() {
    if (golTimer) { clearInterval(golTimer); golTimer = null; }
    var b = document.getElementById("gol-play-btn");
    if (b) { b.textContent = "play"; }
  }
  function golTogglePlay() {
    if (golTimer) { golPause(); return; }
    golTimer = setInterval(golStep, 600);
    document.getElementById("gol-play-btn").textContent = "pause";
  }
  function golStampAt(cx, cy, name) {
    var pat = GOL_PATTERNS[name] || [];
    var mw = 0, mh = 0, i;
    for (i = 0; i < pat.length; i++) { if (pat[i][0] > mw) { mw = pat[i][0]; } if (pat[i][1] > mh) { mh = pat[i][1]; } }
    var ox = cx - Math.floor(mw / 2), oy = cy - Math.floor(mh / 2);
    for (i = 0; i < pat.length; i++) {
      var px = ox + pat[i][0], py = oy + pat[i][1];
      if (px >= 0 && py >= 0 && px < golCols && py < golRows) { golGrid[py][px] = 1; }
    }
    golRender();
  }
  function enterGol() {
    golPause();
    golStamp = null;
    if (!golGrid) { golGrid = golNewGrid(); }
    showScreen("gol-screen");
    golRender();
  }
  document.getElementById("gol-play-btn").onclick = golTogglePlay;
  document.getElementById("gol-step-btn").onclick = function () { golPause(); golStep(); };
  document.getElementById("gol-clear-btn").onclick = function () { golPause(); golGrid = golNewGrid(); golGen = 0; golRender(); };
  document.getElementById("gol-random-btn").onclick = function () {
    golPause();
    golGrid = golNewGrid();
    for (var y = 0; y < golRows; y++) { for (var x = 0; x < golCols; x++) { golGrid[y][x] = Math.random() < 0.25 ? 1 : 0; } }
    golGen = 0;
    golRender();
  };
  document.getElementById("gol-back-btn").onclick = function () { golPause(); enterGames(); };
  document.getElementById("gol-canvas").onclick = function (e) {
    var r = this.getBoundingClientRect();
    var x = Math.floor(((e.clientX || 0) - r.left) / golCell);
    var y = Math.floor(((e.clientY || 0) - r.top) / golCell);
    if (x < 0 || y < 0 || x >= golCols || y >= golRows) { return; }
    if (golStamp) { golStampAt(x, y, golStamp); golStamp = null; }
    else { golGrid[y][x] = golGrid[y][x] ? 0 : 1; golRender(); }
  };
  (function () {
    var btns = document.getElementsByClassName("gol-stamp");
    for (var i = 0; i < btns.length; i++) {
      (function (b) {
        b.onclick = function () {
          golStamp = b.getAttribute("data-p");
          flashNotice("tap the grid to place the " + golStamp);
        };
      })(btns[i]);
    }
  })();

  /* ---------- solitaire (klondike, draw 1) ---------- */
  var solStock = [], solWaste = [], solFound = null, solTab = null, solSel = null;
  function solRank(r) { return r === 1 ? "A" : r === 11 ? "J" : r === 12 ? "Q" : r === 13 ? "K" : String(r); }
  function solRed(card) { return card.s === 1 || card.s === 2; }
  function solNewGame() {
    var deck = [];
    for (var s = 0; s < 4; s++) { for (var r = 1; r <= 13; r++) { deck.push({ r: r, s: s, up: false }); } }
    for (var i = deck.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = deck[i]; deck[i] = deck[j]; deck[j] = t;
    }
    solWaste = []; solFound = [[], [], [], []]; solTab = [[], [], [], [], [], [], []];
    var k = 0, p, c;
    for (p = 0; p < 7; p++) {
      for (c = 0; c <= p; c++) {
        var card = deck[k++];
        card.up = (c === p);
        solTab[p].push(card);
      }
    }
    solStock = deck.slice(k);
    solSel = null;
    gameXpGiven = false;
    document.getElementById("sol-msg").textContent = "";
    solRender();
  }
  var SOL_SUITS = ["\u2660", "\u2665", "\u2666", "\u2663"]; // spade heart diamond club
  function solCardDiv(card, selected, pileKind, pileIdx, cardIdx) {
    var d = document.createElement("div");
    var red = solRed(card);
    // light bg for red suits, dark bg for black suits
    var bg = card.up ? (red ? "#fffdf5" : "#2b2b2b") : "#5577aa";
    var fg = card.up ? (red ? "#cc0000" : "#f5f5f5") : "#fff";
    d.style.cssText = "width:52px;height:70px;border:2px solid #111;border-radius:8px;background:" + bg +
      ";color:" + fg + ";font-weight:bold;position:relative;" +
      (selected ? "outline:3px solid #ff8800;" : "") + "cursor:pointer;flex:none;" +
      "box-shadow:1px 1px 2px rgba(0,0,0,0.3);overflow:hidden;";
    if (card.up) {
      var rank = solRank(card.r);
      var suit = SOL_SUITS[card.s];
      // top-left corner
      var tl = document.createElement("div");
      tl.style.cssText = "position:absolute;top:2px;left:4px;font-size:13px;line-height:1.1;text-align:center;";
      tl.innerHTML = rank + "<br>" + suit;
      d.appendChild(tl);
      // center pip
      var cp = document.createElement("div");
      cp.style.cssText = "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:26px;";
      cp.textContent = suit;
      d.appendChild(cp);
      // bottom-right corner (rotated)
      var br = document.createElement("div");
      br.style.cssText = "position:absolute;bottom:2px;right:4px;font-size:13px;line-height:1.1;text-align:center;transform:rotate(180deg);";
      br.innerHTML = rank + "<br>" + suit;
      d.appendChild(br);
    } else {
      // card back pattern
      d.style.background = "repeating-linear-gradient(45deg,#5577aa,#5577aa 6px,#446688 6px,#446688 12px)";
    }
    d.onclick = (function (pk, pi, ci) {
      return function () { solTap(pk, pi, ci); };
    })(pileKind, pileIdx, cardIdx);
    d.ondblclick = (function (pk, pi, ci) {
      return function () { solAutoFound(pk, pi, ci); };
    })(pileKind, pileIdx, cardIdx);
    return d;
  }
  function solRender() {
    var top = document.getElementById("sol-top");
    top.innerHTML = "";
    // stock
    var st = document.createElement("div");
    st.style.cssText = "width:52px;height:70px;border:2px dashed #555;text-align:center;line-height:70px;font-size:16px;cursor:pointer;flex:none;";
    st.textContent = solStock.length ? ("" + solStock.length) : "↻";
    st.style.background = solStock.length ? "#5577aa" : "#eee";
    st.style.color = solStock.length ? "#fff" : "#111";
    st.onclick = function () { solFlipStock(); };
    top.appendChild(st);
    // waste
    var w = document.createElement("div");
    w.style.cssText = "width:52px;height:70px;flex:none;";
    if (solWaste.length) {
      var wc = solWaste[solWaste.length - 1];
      w.appendChild(solCardDiv(wc, solSel && solSel.pk === "w", "w", 0, solWaste.length - 1));
    } else {
      w.style.border = "2px dashed #555";
    }
    top.appendChild(w);
    var sp = document.createElement("div");
    sp.style.cssText = "width:20px;flex:none;";
    top.appendChild(sp);
    // foundations
    for (var f = 0; f < 4; f++) {
      (function (fi) {
        var fd = document.createElement("div");
        fd.style.cssText = "width:52px;height:70px;flex:none;";
        if (solFound[fi].length) {
          var fc = solFound[fi][solFound[fi].length - 1];
          fd.appendChild(solCardDiv(fc, solSel && solSel.pk === "f" && solSel.pi === fi, "f", fi, solFound[fi].length - 1));
        } else {
          fd.style.border = "2px dashed #555";
          fd.style.textAlign = "center"; fd.style.lineHeight = "70px"; fd.style.fontSize = "20px";
          fd.textContent = "A";
          fd.style.cursor = "pointer";
          fd.onclick = function () { solTap("f", fi, -1); };
        }
        top.appendChild(fd);
      })(f);
    }
    // tableau
    var tab = document.getElementById("sol-tab");
    tab.innerHTML = "";
    for (var p = 0; p < 7; p++) {
      (function (pi) {
        var col = document.createElement("div");
        col.style.cssText = "flex:none;width:56px;min-height:70px;";
        var pile = solTab[pi];
        if (!pile.length) {
          var emp = document.createElement("div");
          emp.style.cssText = "width:52px;height:70px;border:2px dashed #555;cursor:pointer;";
          emp.onclick = function () { solTap("t", pi, -1); };
          col.appendChild(emp);
        }
        for (var ci = 0; ci < pile.length; ci++) {
          (function (cj) {
            var cd = solCardDiv(pile[cj], solSel && solSel.pk === "t" && solSel.pi === pi && solSel.ci <= cj, "t", pi, cj);
            if (cj > 0) { cd.style.marginTop = pile[cj - 1].up ? "-48px" : "-58px"; }
            col.appendChild(cd);
          })(ci);
        }
        tab.appendChild(col);
      })(p);
    }
  }
  function solMovingCards() {
    if (!solSel) { return []; }
    if (solSel.pk === "w") { return solWaste.length ? [solWaste[solWaste.length - 1]] : []; }
    if (solSel.pk === "f") { var f = solFound[solSel.pi]; return f.length ? [f[f.length - 1]] : []; }
    if (solSel.pk === "t") { return solTab[solSel.pi].slice(solSel.ci); }
    return [];
  }
  function solCanTab(cards, pi) {
    if (!cards.length) { return false; }
    var pile = solTab[pi];
    var first = cards[0];
    if (!pile.length) { return first.r === 13; }
    var top = pile[pile.length - 1];
    return top.up && solRed(top) !== solRed(first) && top.r === first.r + 1;
  }
  function solCanFound(card, fi) {
    var pile = solFound[fi];
    if (!pile.length) { return card.r === 1; }
    var top = pile[pile.length - 1];
    return top.s === card.s && card.r === top.r + 1;
  }
  function solRemoveSel() {
    var cards = solMovingCards();
    if (solSel.pk === "w") { solWaste.pop(); }
    else if (solSel.pk === "f") { solFound[solSel.pi].pop(); }
    else if (solSel.pk === "t") { solTab[solSel.pi] = solTab[solSel.pi].slice(0, solSel.ci); }
    // flip exposed tableau card
    if (solSel.pk === "t") {
      var pile = solTab[solSel.pi];
      if (pile.length && !pile[pile.length - 1].up) { pile[pile.length - 1].up = true; }
    }
    return cards;
  }
  function solTap(pk, pi, ci) {
    if (solSel && solSel.pk === pk && solSel.pi === pi && solSel.ci === ci) { solSel = null; solRender(); return; }
    // if something is selected, try this tap as a move destination
    if (solSel && (pk === "f" || pk === "t")) {
      var cards = solMovingCards();
      var ok = false;
      if (pk === "f" && cards.length === 1 && solCanFound(cards[0], pi)) {
        solRemoveSel(); solFound[pi].push(cards[0]); ok = true;
      } else if (pk === "t" && !(solSel.pk === "t" && solSel.pi === pi) && solCanTab(cards, pi)) {
        solRemoveSel();
        for (var i = 0; i < cards.length; i++) { solTab[pi].push(cards[i]); }
        ok = true;
      }
      if (ok) { solSel = null; solAfterMove(); return; }
      // move failed: fall through and select the tapped card instead
    }
    // selection taps
    if (pk === "w" && solWaste.length) { solSel = { pk: "w", pi: 0, ci: solWaste.length - 1 }; }
    else if (pk === "f" && solFound[pi].length) { solSel = { pk: "f", pi: pi, ci: solFound[pi].length - 1 }; }
    else if (pk === "t" && ci >= 0 && solTab[pi][ci].up) { solSel = { pk: "t", pi: pi, ci: ci }; }
    else { solSel = null; }
    solRender();
  }
  function solAutoFound(pk, pi, ci) {
    var card = null;
    if (pk === "w" && solWaste.length) { card = solWaste[solWaste.length - 1]; }
    else if (pk === "t" && ci >= 0 && solTab[pi][ci].up) {
      var pile = solTab[pi];
      if (ci === pile.length - 1) { card = pile[ci]; }
    }
    if (!card) { return; }
    for (var f = 0; f < 4; f++) {
      if (solCanFound(card, f)) {
        if (pk === "w") { solWaste.pop(); }
        else { solTab[pi].pop(); var pl = solTab[pi]; if (pl.length && !pl[pl.length - 1].up) { pl[pl.length - 1].up = true; } }
        solFound[f].push(card);
        solSel = null;
        solAfterMove();
        return;
      }
    }
  }
  function solFlipStock() {
    if (solStock.length) {
      var c = solStock.pop();
      c.up = true;
      solWaste.push(c);
    } else {
      // recycle waste back to stock
      while (solWaste.length) {
        var w = solWaste.pop();
        w.up = false;
        solStock.push(w);
      }
    }
    solSel = null;
    solRender();
  }
  function solAfterMove() {
    var won = true;
    for (var f = 0; f < 4; f++) { if (solFound[f].length !== 13) { won = false; } }
    if (won) {
      document.getElementById("sol-msg").textContent = "you win! +10 xp";
      xpWinOnce();
    }
    solRender();
  }
  function enterSol() {
    solNewGame();
    showScreen("sol-screen");
  }
  document.getElementById("sol-new-btn").onclick = solNewGame;
  document.getElementById("sol-back-btn").onclick = enterGames;

  /* online game */
  function hostGame() {
    var u = auth.currentUser;
    if (!u) { return; }
    var now = Date.now();
    var ref = db.ref("gameLobbies").push();
    lobbyId = ref.key;
    ref.set({
      game: "tictactoe",
      status: "waiting",
      host: { uid: u.uid, name: displayName() },
      guest: null,
      state: { board: emptyBoard() },
      turnUid: u.uid,
      winner: null,
      winnerName: null,
      createdAt: now,
      updatedAt: now
    });
    enterNetGame();
  }


  function joinLobby(id) {
    var u = auth.currentUser;
    if (!u) { return; }
    db.ref("gameLobbies/" + id).transaction(function (cur) {
      if (cur && cur.status === "waiting" && !cur.guest && cur.host && cur.host.uid !== u.uid) {
        cur.guest = { uid: u.uid, name: displayName() };
        cur.status = "playing";
        cur.turnUid = cur.host.uid;
        cur.updatedAt = Date.now();
        return cur;
      }
      return;
    }, function (err, committed) {
      if (!err && committed) {
        lobbyId = id;
        db.ref("gameLobbies/" + id).once("value", function (snap) {
          var L = snap.val();
          if (L && L.game === "connect4") { enterC4Net(); } else if (L && L.game === "chess") { enterChessNet(); } else if (L && L.game === "pictionary") { enterPicNet(); } else { enterNetGame(); }
        });
      }
    });
  }

  function enterNetGame() {
  gameXpGiven = false;
    gameMode = "net";
    gameOver = false;
    stopOpenGames();
    document.getElementById("ttt-title").textContent = "tic tac toe online";
    document.getElementById("ttt-rematch-btn").className = "hidden";
    document.getElementById("ttt-leave-btn").textContent = "leave";
    if (lobbyRef) { lobbyRef.off(); }
    lobbyRef = db.ref("gameLobbies/" + lobbyId);
    lobbyRef.on("value", function (snap) { renderNet(snap.val()); });
    showScreen("ttt-screen");
  }
  function netCleanup() {
    if (lobbyRef) { lobbyRef.off(); lobbyRef = null; }
    lobbyId = null;
    gameMode = null;
  }

  function renderNet(L) {
    if (!L) { netCleanup(); enterGames(); return; }
    var me = myUid();
    myMark = (L.host && L.host.uid === me) ? "X" : "O";
    var board = (L.state && L.state.board) ? L.state.board.slice() : emptyBoard();
    var st = document.getElementById("ttt-status");
    if (L.status === "waiting") {
      st.textContent = "waiting for someone to join...";
      drawBoard(board, false, null);
      document.getElementById("ttt-rematch-btn").className = "hidden";
      document.getElementById("ttt-leave-btn").textContent = "cancel";
    } else if (L.status === "playing") {
      var mine = (L.turnUid === me);
      var opp = (myMark === "X") ? (L.guest && L.guest.name) : (L.host && L.host.name);
      st.textContent = mine ? ("your turn (" + myMark + ")") : ("waiting for " + (opp || "opponent") + "...");
      drawBoard(board, mine, netCell);
      document.getElementById("ttt-rematch-btn").className = "hidden";
      document.getElementById("ttt-leave-btn").textContent = "leave";
    } else if (L.status === "done") {
      gameOver = true;
      if (!L.winner) { gameXpGiven = false; }
      if (L.winner === "draw") { st.textContent = "it's a draw!"; }
      else if (L.winner === me) { st.textContent = "you win! +10 xp"; xpWinOnce(); }
      else { st.textContent = (L.winnerName || "opponent") + " wins!"; }
      drawBoard(board, false, null);
      document.getElementById("ttt-rematch-btn").className = "";
      document.getElementById("ttt-leave-btn").textContent = "leave";
    }
  }

  function netCell(i) {
    if (!lobbyRef || gameOver) { return; }
    var u = auth.currentUser;
    if (!u) { return; }
    lobbyRef.once("value", function (snap) {
      var L = snap.val();
      if (!L || L.status !== "playing") { return; }
      if (L.turnUid !== u.uid) { return; }
      var board = (L.state && L.state.board) ? L.state.board.slice() : emptyBoard();
      if (board[i]) { return; }
      var mark = (L.host && L.host.uid === u.uid) ? "X" : "O";
      board[i] = mark;
      var w = checkWin(board);
      var other = (L.turnUid === (L.host && L.host.uid)) ? (L.guest && L.guest.uid) : (L.host && L.host.uid);
      var upd = {
        state: { board: board },
        turnUid: w ? L.turnUid : other,
        updatedAt: Date.now()
      };
      if (w === "draw") { upd.status = "done"; upd.winner = "draw"; }
      else if (w) { upd.status = "done"; upd.winner = u.uid; upd.winnerName = displayName(); }
      lobbyRef.update(upd);
    });
  }

  document.getElementById("ttt-rematch-btn").onclick = function () {
    if (gameMode === "bot") { startBotGame(); return; }
    if (!lobbyRef) { return; }
    lobbyRef.once("value", function (snap) {
      var L = snap.val();
      if (!L || !L.host) { return; }
      lobbyRef.update({
        state: { board: emptyBoard() },
        status: "playing",
        turnUid: L.host.uid,
        winner: null,
        winnerName: null,
        updatedAt: Date.now()
      });
    });
  };

  document.getElementById("ttt-leave-btn").onclick = function () {
    if (gameMode === "net" && lobbyId) {
      var u = auth.currentUser;
      var lref = lobbyRef;
      netCleanup();
      if (u && lref) {
        lref.once("value", function (snap) {
          var L = snap.val();
          if (L && L.status === "waiting" && L.host && L.host.uid === u.uid) { lref.remove(); }
        });
      }
    } else {
      gameMode = null;
      botThinking = false;
    }
    enterGames();
  };

  /* ---------- connect four ---------- */
  function c4Empty() {
    var b = [];
    for (var i = 0; i < 42; i++) { b.push(null); }
    return b;
  }
  function c4Drop(b, col, mark) {
    for (var r = 5; r >= 0; r--) {
      var i = r * 7 + col;
      if (!b[i]) { b[i] = mark; return i; }
    }
    return -1;
  }
  function c4Winner(b) {
    for (var r = 0; r < 6; r++) {
      for (var c = 0; c < 7; c++) {
        var i = r * 7 + c;
        var v = b[i];
        if (!v) { continue; }
        if (c <= 3 && b[i + 1] === v && b[i + 2] === v && b[i + 3] === v) { return v; }
        if (r <= 2 && b[i + 7] === v && b[i + 14] === v && b[i + 21] === v) { return v; }
        if (c <= 3 && r <= 2 && b[i + 8] === v && b[i + 16] === v && b[i + 24] === v) { return v; }
        if (c >= 3 && r <= 2 && b[i + 6] === v && b[i + 12] === v && b[i + 18] === v) { return v; }
      }
    }
    for (var k = 0; k < 42; k++) { if (!b[k]) { return null; } }
    return "draw";
  }
  var c4Board = null;
  var c4Thinking = false;
  var c4Over = false;

  function drawC4(board, clickable, onCol) {
    var bd = document.getElementById("c4-board");
    bd.innerHTML = "";
    for (var r = 0; r < 6; r++) {
      var row = document.createElement("div");
      row.className = "c4-row";
      for (var c = 0; c < 7; c++) {
        (function (col) {
          var cell = document.createElement("button");
          cell.className = "c4-cell";
          var v = board[r * 7 + col];
          var dot = document.createElement("span");
          dot.className = "c4-dot" + (v === "X" ? " x" : (v === "O" ? " o" : ""));
          cell.appendChild(dot);
          cell.disabled = !clickable || !!board[col];
          cell.onclick = function () { if (onCol) { onCol(col); } };
          row.appendChild(cell);
        })(c);
      }
      bd.appendChild(row);
    }
  }

  function startC4Bot() {
  gameXpGiven = false;
    gameMode = "c4bot";
    c4Board = c4Empty();
    c4Thinking = false;
    c4Over = false;
    document.getElementById("c4-title").textContent = "connect four vs bot";
    document.getElementById("c4-rematch-btn").className = "hidden";
    document.getElementById("c4-leave-btn").textContent = "quit";
    showScreen("c4-screen");
    renderC4Bot();
  }
  function c4BotMove(b) {
    var c, t, i;
    for (c = 0; c < 7; c++) { t = b.slice(); i = c4Drop(t, c, "O"); if (i >= 0 && c4Winner(t) === "O") { return c; } }
    for (c = 0; c < 7; c++) { t = b.slice(); i = c4Drop(t, c, "X"); if (i >= 0 && c4Winner(t) === "X") { return c; } }
    var avail = [];
    for (c = 0; c < 7; c++) { if (!b[c]) { avail.push(c); } }
    if (!avail.length) { return -1; }
    if (Math.random() < 0.3) { return avail[Math.floor(Math.random() * avail.length)]; }
    var order = [3, 2, 4, 1, 5, 0, 6];
    for (var o = 0; o < order.length; o++) { if (avail.indexOf(order[o]) !== -1) { return order[o]; } }
    return avail[0];
  }
  function renderC4Bot() {
    var w = c4Winner(c4Board);
    var st = document.getElementById("c4-status");
    if (w === "X") { st.textContent = "you win! +10 xp"; c4Over = true; xpWinOnce(); }
    else if (w === "O") { st.textContent = "bot wins!"; c4Over = true; }
    else if (w === "draw") { st.textContent = "draw!"; c4Over = true; }
    else if (c4Thinking) { st.textContent = "bot is thinking..."; }
    else { st.textContent = "your turn — tap a column"; }
    document.getElementById("c4-rematch-btn").className = c4Over ? "" : "hidden";
    drawC4(c4Board, !c4Over && !c4Thinking, c4BotCol);
  }
  function c4BotCol(col) {
    if (c4Over || c4Thinking) { return; }
    if (c4Drop(c4Board, col, "X") < 0) { return; }
    renderC4Bot();
    if (c4Winner(c4Board)) { return; }
    c4Thinking = true;
    renderC4Bot();
    setTimeout(function () {
      var c = c4BotMove(c4Board);
      if (c >= 0) { c4Drop(c4Board, c, "O"); }
      c4Thinking = false;
      renderC4Bot();
    }, 700);
  }


  function hostC4Game() {
    var u = auth.currentUser;
    if (!u) { return; }
    var now = Date.now();
    var ref = db.ref("gameLobbies").push();
    lobbyId = ref.key;
    ref.set({
      game: "connect4",
      status: "waiting",
      host: { uid: u.uid, name: displayName() },
      guest: null,
      state: { board: c4Empty() },
      turnUid: u.uid,
      winner: null,
      winnerName: null,
      createdAt: now,
      updatedAt: now
    });
    enterC4Net();
  }


  function enterC4Net() {
  gameXpGiven = false;
    gameMode = "c4net";
    c4Over = false;
    stopOpenGames();
    document.getElementById("c4-title").textContent = "connect four online";
    document.getElementById("c4-rematch-btn").className = "hidden";
    document.getElementById("c4-leave-btn").textContent = "leave";
    if (lobbyRef) { lobbyRef.off(); }
    lobbyRef = db.ref("gameLobbies/" + lobbyId);
    lobbyRef.on("value", function (snap) { renderC4Net(snap.val()); });
    showScreen("c4-screen");
  }
  function renderC4Net(L) {
    if (!L) { netCleanup(); enterGames(); return; }
    var me = myUid();
    var myMark = (L.host && L.host.uid === me) ? "X" : "O";
    var board = (L.state && L.state.board) ? L.state.board.slice() : c4Empty();
    var st = document.getElementById("c4-status");
    if (L.status === "waiting") {
      st.textContent = "waiting for someone to join...";
      drawC4(board, false, null);
      document.getElementById("c4-rematch-btn").className = "hidden";
      document.getElementById("c4-leave-btn").textContent = "cancel";
    } else if (L.status === "playing") {
      var mine = (L.turnUid === me);
      var opp = (myMark === "X") ? (L.guest && L.guest.name) : (L.host && L.host.name);
      st.textContent = mine ? "your turn — tap a column" : ("waiting for " + (opp || "opponent") + "...");
      drawC4(board, mine, c4NetCell);
      document.getElementById("c4-rematch-btn").className = "hidden";
      document.getElementById("c4-leave-btn").textContent = "leave";
    } else if (L.status === "done") {
      c4Over = true;
      if (!L.winner) { gameXpGiven = false; }
      if (L.winner === "draw") { st.textContent = "it's a draw!"; }
      else if (L.winner === me) { st.textContent = "you win! +10 xp"; xpWinOnce(); }
      else { st.textContent = (L.winnerName || "opponent") + " wins!"; }
      drawC4(board, false, null);
      document.getElementById("c4-rematch-btn").className = "";
      document.getElementById("c4-leave-btn").textContent = "leave";
    }
  }
  function c4NetCell(col) {
    if (!lobbyRef || c4Over) { return; }
    var u = auth.currentUser;
    if (!u) { return; }
    lobbyRef.once("value", function (snap) {
      var L = snap.val();
      if (!L || L.status !== "playing") { return; }
      if (L.turnUid !== u.uid) { return; }
      var board = (L.state && L.state.board) ? L.state.board.slice() : c4Empty();
      var mark = (L.host && L.host.uid === u.uid) ? "X" : "O";
      if (c4Drop(board, col, mark) < 0) { return; }
      var w = c4Winner(board);
      var other = (L.turnUid === (L.host && L.host.uid)) ? (L.guest && L.guest.uid) : (L.host && L.host.uid);
      var upd = {
        state: { board: board },
        turnUid: w ? L.turnUid : other,
        updatedAt: Date.now()
      };
      if (w === "draw") { upd.status = "done"; upd.winner = "draw"; }
      else if (w) { upd.status = "done"; upd.winner = u.uid; upd.winnerName = displayName(); }
      lobbyRef.update(upd);
    });
  }
  document.getElementById("c4-rematch-btn").onclick = function () {
    if (gameMode === "c4bot") { startC4Bot(); return; }
    if (!lobbyRef) { return; }
    lobbyRef.once("value", function (snap) {
      var L = snap.val();
      if (!L || !L.host) { return; }
      lobbyRef.update({
        state: { board: c4Empty() },
        status: "playing",
        turnUid: L.host.uid,
        winner: null,
        winnerName: null,
        updatedAt: Date.now()
      });
    });
  };
  document.getElementById("c4-leave-btn").onclick = function () {
    if (gameMode === "c4net" && lobbyId) {
      var u = auth.currentUser;
      var lref = lobbyRef;
      netCleanup();
      if (u && lref) {
        lref.once("value", function (snap) {
          var L = snap.val();
          if (L && L.status === "waiting" && L.host && L.host.uid === u.uid) { lref.remove(); }
        });
      }
    } else {
      gameMode = null;
      c4Thinking = false;
    }
    enterGames();
  };
  document.getElementById("c4-home-btn").onclick = goHome;
  document.getElementById("chess-leave-btn").onclick = function () { chessLeave(false); enterGames(); };
  document.getElementById("chess-home-btn").onclick = function () { chessLeave(false); goHome(); };
  document.getElementById("pic-guess-btn").onclick = picGuess;
  document.getElementById("pic-guess-input").onkeydown = function (e) { if (e.keyCode === 13) { picGuess(); } };
  document.getElementById("pic-clear-btn").onclick = function () {
    if (lobbyRef && picCanDraw()) { lobbyRef.child("state/strokes").remove(); }
  };
  document.getElementById("pic-leave-btn").onclick = function () { picCleanup(); enterGames(); };
  document.getElementById("pic-home-btn").onclick = function () { picCleanup(); goHome(); };
  document.getElementById("chess-rematch-btn").onclick = function () {
    if (chessMode === "bot") { startChessBot(); }
    else if (lobbyRef) {
      lobbyRef.once("value", function (snap) {
        var L = snap.val();
        if (!L || !L.host) { return; }
        lobbyRef.update({ state: chessSer(chessNew()), status: "playing", turnUid: L.host.uid, winner: null, winnerName: null, updatedAt: Date.now() });
      });
    }
  };

/* ---------- chess ---------- */
// ---- chess engine (pure logic, testable) ----
function chessOpp(c){ return c==="w" ? "b" : "w"; }
function chessSer(st){ try { return JSON.stringify(st); } catch (e) { return ""; } }
function chessDeser(s){ try { return JSON.parse(s); } catch (e) { return chessNew(); } }
function chessNew(){
  var back=["r","n","b","q","k","b","n","r"];
  var b=[];
  for (var i=0;i<64;i++) b.push(null);
  for (var f=0;f<8;f++){ b[f]="b"+back[f]; b[8+f]="bp"; b[48+f]="wp"; b[56+f]="w"+back[f]; }
  return { b:b, turn:"w", cast:{wk:1,wq:1,bk:1,bq:1}, ep:-1 };
}
function chessAttacked(b, sq, by){
  var r=(sq/8)|0, f=sq%8;
  // pawns
  var pr = by==="w" ? r+1 : r-1;
  if (pr>=0&&pr<8){
    for (var df=-1;df<=1;df+=2){
      var pf=f+df;
      if (pf>=0&&pf<8 && b[pr*8+pf]===by+"p") return true;
    }
  }
  // knights
  var no=[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
  for (var k=0;k<no.length;k++){
    var rr=r+no[k][0], ff=f+no[k][1];
    if (rr>=0&&rr<8&&ff>=0&&ff<8 && b[rr*8+ff]===by+"n") return true;
  }
  // king
  for (var dr=-1;dr<=1;dr++) for (var df2=-1;df2<=1;df2++){
    if (!dr&&!df2) continue;
    var r2=r+dr, f2=f+df2;
    if (r2>=0&&r2<8&&f2>=0&&f2<8 && b[r2*8+f2]===by+"k") return true;
  }
  // sliders
  var dirs=[[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]];
  for (var d=0;d<dirs.length;d++){
    var r3=r+dirs[d][0], f3=f+dirs[d][1];
    while (r3>=0&&r3<8&&f3>=0&&f3<8){
      var q=b[r3*8+f3];
      if (q){
        if (q[0]===by){
          var t=q[1], diag=d<4;
          if (t==="q"||(diag&&t==="b")||(!diag&&t==="r")) return true;
        }
        break;
      }
      r3+=dirs[d][0]; f3+=dirs[d][1];
    }
  }
  return false;
}
function chessPseudo(st, i){
  var b=st.b, p=b[i], moves=[];
  if (!p) return moves;
  var c=p[0], t=p[1], r=(i/8)|0, f=i%8;
  function add(to,promo){ moves.push({from:i,to:to,promo:promo||null}); }
  function slide(drs){
    for (var k=0;k<drs.length;k++){
      var rr=r+drs[k][0], ff=f+drs[k][1];
      while (rr>=0&&rr<8&&ff>=0&&ff<8){
        var j=rr*8+ff, q=b[j];
        if (!q) add(j);
        else { if (q[0]!==c) add(j); break; }
        rr+=drs[k][0]; ff+=drs[k][1];
      }
    }
  }
  function hop(offs){
    for (var k=0;k<offs.length;k++){
      var rr=r+offs[k][0], ff=f+offs[k][1];
      if (rr<0||rr>7||ff<0||ff>7) continue;
      var j=rr*8+ff, q=b[j];
      if (!q||q[0]!==c) add(j);
    }
  }
  if (t==="p"){
    var dir=c==="w"?-1:1, r1=r+dir;
    if (r1>=0&&r1<8){
      if (!b[r1*8+f]){
        if (r1===0||r1===7) add(r1*8+f,"q"); else {
          add(r1*8+f);
          var r2=r+2*dir;
          if ((c==="w"&&r===6||c==="b"&&r===1)&&!b[r2*8+f]) add(r2*8+f);
        }
      }
      for (var df=-1;df<=1;df+=2){
        var ff2=f+df;
        if (ff2<0||ff2>7) continue;
        var j=r1*8+ff2, q=b[j];
        if (q&&q[0]!==c){ if (r1===0||r1===7) add(j,"q"); else add(j); }
        else if (!q&&st.ep===j) add(j);
      }
    }
  }
  else if (t==="n") hop([[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]);
  else if (t==="b") slide([[-1,-1],[-1,1],[1,-1],[1,1]]);
  else if (t==="r") slide([[-1,0],[1,0],[0,-1],[0,1]]);
  else if (t==="q") slide([[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]);
  else if (t==="k"){
    hop([[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]);
    var home = c==="w"?60:4, enemy = chessOpp(c);
    if (i===home){
      var kk = c==="w"?"wk":"bk", qq = c==="w"?"wq":"bq";
      if (st.cast[kk] && !b[home+1] && !b[home+2] &&
          !chessAttacked(b,home,enemy) && !chessAttacked(b,home+1,enemy) && !chessAttacked(b,home+2,enemy))
        add(home+2);
      if (st.cast[qq] && !b[home-1] && !b[home-2] && !b[home-3] &&
          !chessAttacked(b,home,enemy) && !chessAttacked(b,home-1,enemy) && !chessAttacked(b,home-2,enemy))
        add(home-2);
    }
  }
  return moves;
}
function chessApply(st, mv){
  var b=st.b.slice(), p=b[mv.from];
  b[mv.to]=mv.promo?p[0]+mv.promo:p;
  b[mv.from]=null;
  if (p[1]==="p"&&mv.to===st.ep) b[mv.to+(p[0]==="w"?8:-8)]=null;
  if (p[1]==="k"&&Math.abs(mv.to-mv.from)===2){
    if (mv.to===62){b[61]=b[63];b[63]=null;}
    else if (mv.to===58){b[59]=b[56];b[56]=null;}
    else if (mv.to===6){b[5]=b[7];b[7]=null;}
    else if (mv.to===2){b[3]=b[0];b[0]=null;}
  }
  return b;
}
function chessKingSq(b,c){
  for (var j=0;j<64;j++) if (b[j]===c+"k") return j;
  return -1;
}
function chessLegal(st,i){
  var out=[], ps=chessPseudo(st,i), c=st.turn, e=chessOpp(c);
  for (var k=0;k<ps.length;k++){
    var nb=chessApply(st,ps[k]);
    if (!chessAttacked(nb,chessKingSq(nb,c),e)) out.push(ps[k]);
  }
  return out;
}
function chessAllLegal(st,c){
  var out=[];
  for (var i=0;i<64;i++){
    var p=st.b[i];
    if (p&&p[0]===c){
      var save=st.turn; st.turn=c;
      var ms=chessLegal(st,i);
      st.turn=save;
      out=out.concat(ms);
    }
  }
  return out;
}
function chessNext(st,mv){
  var nb=chessApply(st,mv);
  var cast={wk:st.cast.wk,wq:st.cast.wq,bk:st.cast.bk,bq:st.cast.bq};
  var p=st.b[mv.from];
  if (p==="wk"){cast.wk=0;cast.wq=0;}
  if (p==="bk"){cast.bk=0;cast.bq=0;}
  var rs={63:"wk",56:"wq",7:"bk",0:"bq"};
  if (rs[mv.from]) cast[rs[mv.from]]=0;
  if (rs[mv.to]) cast[rs[mv.to]]=0;
  var ep=-1;
  if (p[1]==="p"&&Math.abs(mv.to-mv.from)===16) ep=(mv.from+mv.to)/2;
  return {b:nb,turn:chessOpp(st.turn),cast:cast,ep:ep};
}
function chessStatus(st){
  var moves=chessAllLegal(st,st.turn);
  var chk=chessAttacked(st.b,chessKingSq(st.b,st.turn),chessOpp(st.turn));
  if (!moves.length) return {over:true,result:chk?chessOpp(st.turn):"draw",check:chk};
  return {over:false,check:chk};
}

var chessSprites = {
"wp":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAA5ElEQVR4nO2Y2xKDIAxEl07//5fpC1qoWi5ZTJnueVRMdickAwJCCOFJmBg73pFvhoEz4dPyPliBEi3ie9ZVYVagEBXjUWMIh3Tm/OwKADgX/+25BZaBXVlN5Md7s6MpFbgTGfBGBhL7ODwZleXC8v1vjtErEzVzQ7nI8XrGIiU3uwKtonQW2niyAm20HBeYvaAxmhFbD2tpHWUbqQLeyECief9nHwC6D8iAPzKAgQbOPgSMjawKePP3Bob3fxYAMPTB8hUYvVnwf3K+6dK0fAWWN2C+EzN+mVvuyOoBb5Y3IISRFxzjQSt4Ix4vAAAAAElFTkSuQmCC",
"wn":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAz0lEQVR4nO2YwQqEMBBD02X//5e7F8vK4gqSTNNCHngS6rxmpqhACCGEMI9+XDJeysX+MIruvUtrBwA0+YpfOgCci26tyZ9ZmkDFjv9SJVDSLlfMmAEANe0DAG/1grjf/fMNicy0BC6Q9JhaYFrvD5wJSFAK3O5+VTLKU+Fx+yhOJmsLHcJUNCqB6cM7sA8xm4JdgCUCMPY/sEgCzBwsIcAQATcRcLOEAPNSt4QAQwTcRMBNBFjY72K7AMv2AswvjYqvmMf1bJ9ABNxsL7A9H0d2PSXbONskAAAAAElFTkSuQmCC",
"wb":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAA+UlEQVR4nO2YSw7DQAxCX6re/8ruJs2iUvozDIpkdtnMgAEnCgyy2Mznl/uum+PQHfXhWQKXgDOychFOBwCosgz+gKsD71hL73Q5cEZSPjBnhF7JXm4LgX9N2wWUu8T2LQTHJrIouTsO3VFVxbZ5U7TEAfC5YHsTu7P/xDIHwOOCQ8Cy6cNiB0DvglrA0umD/k35tYB9vbbvVzqwfPoQ6MATqi6oItQh0uIQ6YAq/xCKkHKVTonTGAH/QtUDlYBI/mEilEdUgKIHCgGx/MNEKI+4gG4PugKi+Yf/P2mdrH/iFI9QF5cX0P65q+hA5wfwdCCNywsYDJp4AAvVYwmSiP/RAAAAAElFTkSuQmCC",
"wr":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAk0lEQVR4nO2YQQqAMAwEN+L/v1wPHjwJ2sQuwZmrVDJ0k0AlgH8TibOjrIqL1/VsHxSxFAQkaYz7NM1+ewo94AYBN+0F9oqfZKZJRGaOMIX8tBfIBfBkFPTAdB3tbwABN1aBbP6lGoHILqMMRMgNAm4QcIOAG5tAxRaW6gRs25gIuWkvwKuEm/YCvMwVQw8AAKzlAJA9GFQpBObEAAAAAElFTkSuQmCC",
"wq":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAABD0lEQVR4nO2ZwRKDMAhEN53+/y/Ti6bqxGmARbTDu7WTEDYuJK1AkUsLji/Ra70igi7Ij88Uop6AAIDIN+fW+lLUNd/GeWxrmONZLMS2hiuedvc01hglMhzjsVpkEV+CtQam2O4sALTWBOQitgSbssYxeaDbw2K1UywW2gVfEpX9V+M6nBwb3oX6Iuvig8RmkMP8HlcDrYhXEWe7rx03C7ULzSbFSh74gzZaArLxHCoR12N1PqxT0dRVTg42FY+3UAnIJlWA8QqygyGAdi2wUBbKpgRkUwKyKQHZpAvwnsZeAamnMHCDJ+ClBGRj/TkXafxL/lq8DY8X4H4/wGijm7cy+rnGeVUDLB4voCicfADC0WwRKEhR1AAAAABJRU5ErkJggg==",
"wk":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAvUlEQVR4nO2ZwQ7CMAxDXcT//3I4sEkcOEDizjL4STsujRcn7TYgaFkbY9cV693YAa9mu4Cqd4XgwSxpJ9Px+vYWurMDfmKZtXiFj4V+mQJQ9fTUedGxr8DUg8yn2splPIUYG9VkKtlbyF6AfQ+wNrLq9MLh/VEO9haKADURgGYDHzcCw0mWCqiJADURoCYC1ESAmqmA9jHiJQAwOE78fQXkRICa7gv1zt8uX+VkXwF7AfbfRtMDauwFhDDkAdejLzgo9W3wAAAAAElFTkSuQmCC",
"bp":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAA6ElEQVR4nO2YwRKDMAhEodP//2V6ohOjjkQ20kz3XeMkLAtoFCGEkEp01sZmZrvDVOHnwTc8Cnx3KFDIC7WRSCz4keciwDLRB3WU5D5uhBNQB5yzuCa0AEZAm/2rINt1RClNceBJKKAaChDZjsOrvmzXf3aMnokAvr++QAfzyFhEfU5AHYgGxW+hhjdqIyeSXGQvcIw6ZmbR0lZVWBnRgWooQGSs/h1UH9CBaiigmrSAOw3sIBqZDlTz3wIy9e9k+2B5B26lD3mj6hm9bi7vwPIC0ndixA+GTEWmBUxshxDLl9DyAghJ8gEFYWQ9C6VJUAAAAABJRU5ErkJggg==",
"bn":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAA1ElEQVR4nO2ZywrEMAwD5aX//8vZSwMhdFmo5SgBzTGH4InsPgFjjDFmEe2GuefF3OyJseCIALl+BHW3gV54RIxriHGBwIe52Qy51kdKBFprbUXxQHECIxXtAxTMwK/Tn4eXJbMsgRnW5ZQqsLL3O7IEWNAE/p1+VTLld+KRWeKWTplJW+h+tEgNM0VAMbwd+RBnU5ALZLGAsv+BTRLIzMEWAhksoMYCarYQyLxubiGQwQJqLKDGAlmyX+zkAlmOF3gdHftPC/Due+nxCVhAzfECx/MFP6BSQq74K/cAAAAASUVORK5CYII=",
"bb":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAABB0lEQVR4nO2YQQ6DMBADh6r///L2UEEpAqll7awi7dy4hDi2kwA0tSzOwSMithcti+VdD8eg8D35s2cVFgFXk3WIsDmwYkrOhl2AKTkbFgFXhXUU2ebAcbLT7ULgm/Qeq4CIiOlLDO+dyHUOPB2Dwmf1p9yFznC5YDuJB/QXGOgAeFyQCxi5+jDYAdC7IBUwevVh0G30KErpgkxAxepDQQdWVC5ITuJ1Iu5T9wyp57/GKCJkN9WSCHWJd5SVWEULuIuqBxIBVfmHjlA9pQIUPUgLqMw/dITqKReQ7UFKQHX+4eZ12vWbEP7/IVweoSzTC0h/Uio6kElkWkDFd/Ce6SM0vYCmSfICpVGCRbkA0scAAAAASUVORK5CYII=",
"br":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAo0lEQVR4nO2YQQ7EMAgDTbX//zJ76rXqglvLWs81SsIoBCSAEP6bmm7s7mYGAgBV9XM8BzuIt4kAAFy9/HTt9t3TjfkDJCKgxl7gwzhkU022tYAi8EBBuo19CtkLrFthd/f2D0wa2In9C0RAjVRgm/8AQaCqKn1gQQTUREBNBNREYAqjCwO8wZasGyeF1NgLZDaqxl4gkzlGEBvsU8heIIRgzhet4Cta+fQBoQAAAABJRU5ErkJggg==",
"bq":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAABDElEQVR4nO2ZUQ+DMAiE6bL//5fxqUttqgMOxCZ8L8uSSu/0aBslKnJpkcWZmX8TtRYy1yeiKNFZ/Oq/FyF3pYsdb3rX7/0kvpaLvKOB1FNHyDsaaD2VW000VkKuxiBRC2vipzD1gJT5JjIzezexupg0GiudzGyK2h3qCM3FW2snEVfipWPDV6Fxkj7XLEzCKH74VSfCrYm7iX8apOOkuK5CUlGefbz9MloGsoE2sqATsgqXbrKuKquNTcv2ESoD2aQasBxBZmADnscCCxWhbMpANmUgmzKQTboBdDeGDGTvwkQveAIoZSAbU4CjPhcRPfRq8U1sbwD+PuCxjCKJhA1kvxvaPkLbGygKkAMkx5RW21CifgAAAABJRU5ErkJggg==",
"bk":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAz0lEQVR4nO2Yaw7DMAiDw9T7X9n7tUrrWq0Dp9SavwOQGAx5jGF6iVmBAeBjsQj6eg92wKuZLmBC0t/jswLtWebr4gR18hZa2AHPJDVRrEPoApibO4O8haafAxGxVsXnwA6ljGRG5+FGktUpNzHDFZU8yFtIXkDZQlfP/S2UsQYAmV4AUB6t8haygG4sINvAY6z3pNIYcwW6sYBuLKAbC+jGAropCahcI15UrxP/XYE7YAHdpDqQ+SO35ddHvnwF5AXI/43K/8zJW0hegDFFnnn2QFOd5yitAAAAAElFTkSuQmCC",
};
/* ---------- chess bot brain (minimax + alpha-beta + quiescence) ---------- */
var chessVal = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
var chessPST = {
p:[0,0,0,0,0,0,0,0,50,50,50,50,50,50,50,50,10,10,20,30,30,20,10,10,5,5,10,25,25,10,5,5,0,0,0,20,20,0,0,0,5,-5,-10,0,0,-10,-5,5,5,10,10,-20,-20,10,10,5,0,0,0,0,0,0,0,0],
n:[-50,-40,-30,-30,-30,-30,-40,-50,-40,-20,0,0,0,0,-20,-40,-30,0,10,15,15,10,0,-30,-30,5,15,20,20,15,5,-30,-30,0,15,20,20,15,0,-30,-30,5,10,15,15,10,5,-30,-40,-20,0,5,5,0,-20,-40,-50,-40,-30,-30,-30,-30,-40,-50],
b:[-20,-10,-10,-10,-10,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,10,10,5,0,-10,-10,5,5,10,10,5,5,-10,-10,0,10,10,10,10,0,-10,-10,10,10,10,10,10,10,-10,-10,5,0,0,0,0,5,-10,-20,-10,-10,-10,-10,-10,-10,-20],
r:[0,0,0,0,0,0,0,0,5,10,10,10,10,10,10,5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,0,0,0,5,5,0,0,0],
q:[-20,-10,-10,-5,-5,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,5,5,5,0,-10,-5,0,5,5,5,5,0,-5,0,0,5,5,5,5,0,-5,-10,5,5,5,5,5,0,-10,-10,0,5,0,0,0,0,-10,-20,-10,-10,-5,-5,-10,-10,-20],
k:[-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-20,-30,-30,-40,-40,-30,-30,-20,-10,-20,-20,-20,-20,-20,-20,-10,20,20,0,0,0,0,20,20,-30,-40,-40,-50,-50,-40,-40,-30]
};
function chessEvalAbs(b) {
  var s = 0;
  for (var i = 0; i < 64; i++) {
    var p = b[i];
    if (!p) { continue; }
    var sq = (p[0] === "w") ? i : (i ^ 56);
    var v = chessVal[p[1]] + chessPST[p[1]][sq];
    s += (p[0] === "w") ? v : -v;
  }
  return s;
}
function chessQuiesce(st, alpha, beta, ply) {
  var stand = ((st.turn === "w") ? 1 : -1) * chessEvalAbs(st.b);
  if (stand >= beta) { return beta; }
  if (stand > alpha) { alpha = stand; }
  if (ply >= 4) { return alpha; }
  var moves = chessAllLegal(st, st.turn);
  var caps = [];
  for (var i = 0; i < moves.length; i++) { if (st.b[moves[i].to]) { caps.push(moves[i]); } }
  caps.sort(function (a, b) { return chessVal[st.b[b.to][1]] - chessVal[st.b[a.to][1]]; });
  for (var j = 0; j < caps.length; j++) {
    var sc = -chessQuiesce(chessNext(st, caps[j]), -beta, -alpha, ply + 1);
    if (sc >= beta) { return beta; }
    if (sc > alpha) { alpha = sc; }
  }
  return alpha;
}
function chessSearch(st, depth, alpha, beta) {
  var moves = chessAllLegal(st, st.turn);
  if (!moves.length) {
    var kc = chessKingSq(st.b, st.turn);
    var inChk = kc >= 0 && chessAttacked(st.b, kc, chessOpp(st.turn));
    return inChk ? -100000 - depth : 0;
  }
  if (depth <= 0) { return chessQuiesce(st, alpha, beta, 0); }
  moves.sort(function (a, b) {
    return ((st.b[b.to] ? chessVal[st.b[b.to][1]] : 0) - (st.b[a.to] ? chessVal[st.b[a.to][1]] : 0));
  });
  var best = -Infinity;
  for (var i = 0; i < moves.length; i++) {
    var sc = -chessSearch(chessNext(st, moves[i]), depth - 1, -beta, -alpha);
    if (sc > best) { best = sc; }
    if (best > alpha) { alpha = best; }
    if (alpha >= beta) { break; }
  }
  return best;
}
function chessBotPick(st, color) {
  var moves = chessAllLegal(st, color);
  if (!moves.length) { return null; }
  for (var i = moves.length - 1; i > 0; i--) {
    var j = (Math.random() * (i + 1)) | 0;
    var t = moves[i]; moves[i] = moves[j]; moves[j] = t;
  }
  var best = moves[0], bestSc = -Infinity, alpha = -Infinity;
  for (var k = 0; k < moves.length; k++) {
    var sc = -chessSearch(chessNext(st, moves[k]), 2, -Infinity, -alpha);
    if (sc > bestSc) { bestSc = sc; best = moves[k]; }
    if (sc > alpha) { alpha = sc; }
  }
  return best;
}
/* ---------- chess.com-style board ---------- */
var chessLastMove = null;
function chessCaptured() {
  var start = { p: 8, n: 2, b: 2, r: 2, q: 1 };
  var w = { p: 0, n: 0, b: 0, r: 0, q: 0 }, b = { p: 0, n: 0, b: 0, r: 0, q: 0 };
  for (var i = 0; i < 64; i++) {
    var p = chessState.b[i];
    if (!p || p[1] === "k") { continue; }
    if (p[0] === "w") { w[p[1]]++; } else { b[p[1]]++; }
  }
  var cw = [], cb = [];
  for (var t in start) {
    for (var k = 0; k < start[t] - b[t]; k++) { cw.push("w" + t); }
    for (var k2 = 0; k2 < start[t] - w[t]; k2++) { cb.push("b" + t); }
  }
  return { byWhite: cw, byBlack: cb };
}
function renderChess() {
  var board = document.getElementById("chess-board");
  board.innerHTML = "";
  var flip = (chessMyColor === "b");
  var stt = chessStatus(chessState);
  var chkSq = -1;
  if (stt.check) { chkSq = chessKingSq(chessState.b, chessState.turn); }
  for (var d = 0; d < 64; d++) {
    (function (d) {
      var i = flip ? 63 - d : d;
      var r = (i / 8) | 0, f = i % 8;
      var sq = document.createElement("button");
      sq.className = "chess-sq " + (((r + f) % 2) ? "dark" : "light");
      var p = chessState.b[i];
      if (p && chessSprites[p]) {
        var im = document.createElement("img");
        im.src = chessSprites[p];
        im.className = "chess-piece";
        im.alt = p;
        sq.appendChild(im);
      }
      var isTgt = false, isCap = false;
      for (var k = 0; k < chessTgts.length; k++) {
        if (chessTgts[k].to === i) { isTgt = true; isCap = !!p; break; }
      }
      if (isTgt && !isCap) {
        var dot = document.createElement("span");
        dot.className = "chess-dot";
        dot.textContent = "•";
        sq.appendChild(dot);
      }
      if (isTgt && isCap) { sq.className += " tgtcap"; }
      if (chessLastMove && (i === chessLastMove.from || i === chessLastMove.to)) { sq.className += " lastmv"; }
      if (i === chessSel) { sq.className += " sel"; }
      if (i === chkSq) { sq.className += " incheck"; }
      sq.onclick = function () { chessTap(i); };
      board.appendChild(sq);
    })(d);
  }
  var cap = document.getElementById("chess-captured");
  if (cap) {
    cap.innerHTML = "";
    var c = chessCaptured();
    var line = document.createElement("div");
    line.style.fontSize = "13px";
    line.textContent = "captured by you: ";
    var mine = (chessMyColor === "w") ? c.byWhite : c.byBlack;
    var theirs = (chessMyColor === "w") ? c.byBlack : c.byWhite;
    for (var m1 = 0; m1 < mine.length; m1++) {
      var im1 = document.createElement("img");
      im1.src = chessSprites[mine[m1]];
      im1.className = "chess-cap";
      line.appendChild(im1);
    }
    cap.appendChild(line);
    var line2 = document.createElement("div");
    line2.style.fontSize = "13px";
    line2.textContent = "captured by opponent: ";
    for (var m2 = 0; m2 < theirs.length; m2++) {
      var im2 = document.createElement("img");
      im2.src = chessSprites[theirs[m2]];
      im2.className = "chess-cap";
      line2.appendChild(im2);
    }
    cap.appendChild(line2);
  }
}
function updateChessStatus() {
  var el = document.getElementById("chess-status");
  var stt = chessStatus(chessState);
  if (chessMode === "bot") {
    if (stt.over) {
      if (stt.result === "draw") { el.textContent = "draw."; }
      else if (stt.result === "w") { el.textContent = "you win! +10 xp"; }
      else { el.textContent = "bot wins."; }
    } else {
      el.textContent = (chessState.turn === "w" ? "your move." : "bot is thinking...") + (stt.check ? " check!" : "");
    }
  }
}
function chessTap(i) {
  if (chessThinking || !chessState) { return; }
  var stt = chessStatus(chessState);
  if (stt.over) { return; }
  if (chessState.turn !== chessMyColor) { return; }
  for (var k = 0; k < chessTgts.length; k++) {
    if (chessTgts[k].to === i) { chessDoMove(chessTgts[k]); return; }
  }
  var p = chessState.b[i];
  if (p && p[0] === chessMyColor) {
    chessSel = i;
    chessTgts = chessLegal(chessState, i);
  } else {
    chessSel = -1;
    chessTgts = [];
  }
  renderChess();
}
function chessDoMove(mv) {
  if (chessMode === "bot") {
    chessState = chessNext(chessState, mv);
    chessLastMove = { from: mv.from, to: mv.to };
    chessSel = -1; chessTgts = [];
    renderChess(); updateChessStatus();
    var stt = chessStatus(chessState);
    if (stt.over) {
      if (stt.result === "w") { xpWinOnce(); }
      return;
    }
    chessThinking = true;
    renderChess(); updateChessStatus();
    setTimeout(function () {
      var bm = chessBotPick(chessState, "b");
      if (bm) {
        chessState = chessNext(chessState, bm);
        chessLastMove = { from: bm.from, to: bm.to };
      }
      chessThinking = false;
      chessSel = -1; chessTgts = [];
      renderChess(); updateChessStatus();
    }, 450);
  } else if (chessMode === "net") {
    var u = auth.currentUser;
    if (!u || !lobbyRef) { return; }
    lobbyRef.once("value", function (snap) {
      var L = snap.val();
      if (!L || L.status !== "playing" || L.turnUid !== u.uid) { return; }
      var st = chessDeser(L.state);
      var legal = chessLegal(st, mv.from);
      var okM = null;
      for (var k = 0; k < legal.length; k++) { if (legal[k].to === mv.to) { okM = legal[k]; } }
      if (!okM) { return; }
      var ns = chessNext(st, okM);
      var other = (L.turnUid === (L.host && L.host.uid)) ? (L.guest && L.guest.uid) : (L.host && L.host.uid);
      var stt = chessStatus(ns);
      var upd = { state: chessSer(ns), turnUid: stt.over ? L.turnUid : other, updatedAt: Date.now(), lastFrom: mv.from, lastTo: mv.to };
      if (stt.over) {
        upd.status = "done";
        upd.winner = (stt.result === "draw") ? "draw" : u.uid;
        upd.winnerName = (stt.result === "draw") ? "draw" : displayName();
      }
      lobbyRef.update(upd);
    });
  }
}
function startChessBot() {
  gameXpGiven = false;
  gameMode = "bot";
  chessMode = "bot";
  chessMyColor = "w";
  chessState = chessNew();
  chessSel = -1; chessTgts = []; chessThinking = false;
  document.getElementById("chess-title").textContent = "chess vs bot";
  document.getElementById("chess-rematch-btn").className = "";
  document.getElementById("chess-leave-btn").textContent = "quit";
  stopOpenGames();
  showScreen("chess-screen");
  renderChess(); updateChessStatus();
}
function hostChessGame() {
  var u = auth.currentUser;
  if (!u) { return; }
  var now = Date.now();
  var ref = db.ref("gameLobbies").push();
  lobbyId = ref.key;
  ref.set({
    game: "chess",
    status: "waiting",
    host: { uid: u.uid, name: displayName() },
    guest: null,
    state: chessSer(chessNew()),
    turnUid: u.uid,
    winner: null,
    winnerName: null,
    createdAt: now,
    updatedAt: now
  });
  enterChessNet();
}
function enterChessNet() {
  gameXpGiven = false;
  gameMode = "net";
  chessMode = "net";
  stopOpenGames();
  document.getElementById("chess-title").textContent = "chess online";
  document.getElementById("chess-rematch-btn").className = "hidden";
  document.getElementById("chess-leave-btn").textContent = "leave";
  if (lobbyRef) { lobbyRef.off(); }
  lobbyRef = db.ref("gameLobbies/" + lobbyId);
  lobbyRef.on("value", function (snap) { renderChessNet(snap.val()); });
  showScreen("chess-screen");
}
function renderChessNet(L) {
  if (!L) { chessLeave(true); enterGames(); return; }
  var me = myUid();
  chessMyColor = (L.host && L.host.uid === me) ? "w" : "b";
  chessState = chessDeser(L.state);
  chessLastMove = (typeof L.lastFrom === "number") ? { from: L.lastFrom, to: L.lastTo } : null;
  chessSel = -1; chessTgts = [];
  renderChess();
  var el = document.getElementById("chess-status");
  var stt = chessStatus(chessState);
  if (L.status === "waiting") { el.textContent = "waiting for opponent..."; }
  else if (stt.over) {
    if (stt.result === "draw") { el.textContent = "draw."; }
    else {
      var iWon = (stt.result === chessMyColor);
      el.textContent = iWon ? "you win! +10 xp" : "you lose.";
      if (iWon) { xpWinOnce(); }
    }
    document.getElementById("chess-rematch-btn").className = "";
  }
  else if (L.turnUid !== me) { el.textContent = "opponent's move..." + (stt.check ? " check!" : ""); }
  else { el.textContent = "your move." + (stt.check ? " check!" : ""); }
}
function chessLeave(silent) {
  if (lobbyRef) {
    var lref = lobbyRef;
    var u = auth.currentUser;
    lobbyRef.off(); lobbyRef = null;
    if (u && !silent) {
      lref.once("value", function (snap) {
        var L = snap.val();
        if (L && L.status === "waiting" && L.host && L.host.uid === u.uid) { lref.remove(); }
      });
    }
  }
  chessMode = null;
  chessThinking = false;
  gameMode = null;
}

/* ---------- pictionary ---------- */
var picWords = ("apple banana cat dog house car tree sun moon star fish bird boat plane train bike pizza cake rainbow mountain river beach snowman robot dragon castle pirate guitar piano drum soccer phone computer book chair table door window key hat shoe shirt ball kite balloon cloud rain snow flower leaf spider ant bee frog turtle shark whale crab elephant lion tiger bear monkey zebra owl snake mushroom cactus volcano island forest desert ghost witch zombie alien knight princess king queen clown doctor teacher farmer chef camera watch lamp mirror bridge tower tent flag crown sword shield anchor wheel rocket submarine taxi bus truck helmet boots coat glasses umbrella wallet coin dice cards chess checkers dominoes puzzle kite surfboard skateboard").split(" ");
var picStrokes = [];
var picDrawing = false;
var picPts = [];
var picTimerInt = null;
var picRoundAdvancing = false;
function picRole(L) {
  var me = myUid();
  return (L.host && L.host.uid === me) ? "h" : "g";
}
function picName(L, r) {
  if (r === "h") { return (L.host && L.host.name) || "host"; }
  return (L.guest && L.guest.name) || "guest";
}
function hostPicGame() {
  var u = auth.currentUser;
  if (!u) { return; }
  var now = Date.now();
  var ref = db.ref("gameLobbies").push();
  lobbyId = ref.key;
  ref.set({
    game: "pictionary",
    status: "waiting",
    host: { uid: u.uid, name: displayName() },
    guest: null,
    state: { phase: "lobby", round: 0, drawer: "h", word: "", choices: [], strokes: null, scores: { h: 0, g: 0 }, endsAt: 0 },
    turnUid: u.uid,
    winner: null,
    winnerName: null,
    createdAt: now,
    updatedAt: now
  });
  enterPicNet();
}
function enterPicNet() {
  gameXpGiven = false;
  gameMode = "net";
  stopOpenGames();
  document.getElementById("pic-title").textContent = "pictionary online";
  if (lobbyRef) { lobbyRef.off(); }
  lobbyRef = db.ref("gameLobbies/" + lobbyId);
  lobbyRef.on("value", function (snap) { renderPicNet(snap.val()); });
  showScreen("pic-screen");
  picSetupCanvas();
}
function picSetupCanvas() {
  var cv = document.getElementById("pic-canvas");
  function pos(e) {
    var r = cv.getBoundingClientRect();
    var x, y;
    if (e.touches && e.touches.length) { x = e.touches[0].clientX; y = e.touches[0].clientY; }
    else { x = e.clientX; y = e.clientY; }
    return [Math.round((x - r.left) * (320 / r.width)), Math.round((y - r.top) * (240 / r.height))];
  }
  function start(e) {
    if (!picCanDraw()) { return; }
    picDrawing = true;
    picPts = [pos(e)];
    if (e.cancelable) { try { e.preventDefault(); } catch (e2) {} }
  }
  function move(e) {
    if (!picDrawing || !picCanDraw()) { return; }
    picPts.push(pos(e));
    picDrawLocal();
    if (e.cancelable) { try { e.preventDefault(); } catch (e2) {} }
  }
  function end() {
    if (!picDrawing) { return; }
    picDrawing = false;
    if (picPts.length > 1 && lobbyRef) {
      var flat = [];
      for (var i = 0; i < picPts.length; i++) { flat.push(picPts[i][0] + "," + picPts[i][1]); }
      lobbyRef.child("state/strokes").push({ pts: flat.join(" ") });
    }
    picPts = [];
  }
  cv.onmousedown = start;
  cv.onmousemove = move;
  cv.onmouseup = end;
  cv.ontouchstart = start;
  cv.ontouchmove = move;
  cv.ontouchend = end;
}
function picCanDraw() {
  return picCur && picCur.phase === "draw" && picCur.drawer === picRole(picCurLobby);
}
var picCur = null;
var picCurLobby = null;
function picDrawLocal() {
  var cv = document.getElementById("pic-canvas");
  var ctx = cv.getContext("2d");
  if (picPts.length > 1) {
    var a = picPts[picPts.length - 2], b = picPts[picPts.length - 1];
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
}
function picRenderStrokes(strokes) {
  var cv = document.getElementById("pic-canvas");
  var ctx = cv.getContext("2d");
  ctx.clearRect(0, 0, 320, 240);
  if (!strokes) { return; }
  var ks = Object.keys(strokes);
  ctx.strokeStyle = "#111111";
  ctx.lineWidth = 3;
  for (var i = 0; i < ks.length; i++) {
    var s = (strokes[ks[i]].pts || "").split(" ");
    ctx.beginPath();
    for (var j = 0; j < s.length; j++) {
      var xy = s[j].split(",");
      var x = parseInt(xy[0], 10), y = parseInt(xy[1], 10);
      if (j === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
    }
    ctx.stroke();
  }
}
function picPickWords() {
  var pool = picWords.slice(), out = [];
  for (var i = 0; i < 3 && pool.length; i++) {
    out.push(pool.splice((Math.random() * pool.length) | 0, 1)[0]);
  }
  return out;
}
function picStartRound() {
  if (!lobbyRef) { return; }
  lobbyRef.once("value", function (snap) {
    var L = snap.val();
    if (!L || L.status !== "playing") { return; }
    var me = myUid();
    var isHost = L.host && L.host.uid === me;
    var round = (L.state && L.state.round ? L.state.round : 0) + 1;
    if (round > 4) { return; }
    var drawer = (round % 2 === 1) ? "h" : "g";
    var drawerUid = drawer === "h" ? (L.host && L.host.uid) : (L.guest && L.guest.uid);
    if (drawerUid !== me && !isHost) { return; }
    var choices = (drawerUid === me) ? picPickWords() : [];
    lobbyRef.update({
      state: { phase: "pick", round: round, drawer: drawer, word: "", choices: choices, strokes: null, scores: (L.state && L.state.scores) || { h: 0, g: 0 }, endsAt: 0 },
      updatedAt: Date.now()
    });
  });
}
function picChooseWord(w) {
  if (!lobbyRef) { return; }
  lobbyRef.once("value", function (snap) {
    var L = snap.val();
    if (!L || !L.state || L.state.phase !== "pick") { return; }
    var me = myUid();
    var drawerUid = L.state.drawer === "h" ? (L.host && L.host.uid) : (L.guest && L.guest.uid);
    if (drawerUid !== me) { return; }
    var st = L.state;
    st.phase = "draw";
    st.word = w;
    st.choices = [];
    st.strokes = null;
    st.endsAt = Date.now() + 60000;
    lobbyRef.update({ state: st, updatedAt: Date.now() });
  });
}
function picGuess() {
  var inp = document.getElementById("pic-guess-input");
  var g = inp.value.replace(/^\s+|\s+$/g, "").toLowerCase();
  if (!g || !lobbyRef) { return; }
  inp.value = "";
  lobbyRef.once("value", function (snap) {
    var L = snap.val();
    if (!L || !L.state || L.state.phase !== "draw") { return; }
    var me = myUid();
    var drawerUid = L.state.drawer === "h" ? (L.host && L.host.uid) : (L.guest && L.guest.uid);
    if (drawerUid === me) { return; }
    if (g === String(L.state.word).toLowerCase()) {
      var st = L.state;
      var dr = st.drawer;
      var sc = st.scores || { h: 0, g: 0 };
      var guesser = dr === "h" ? "g" : "h";
      sc[guesser] = (sc[guesser] || 0) + 100;
      sc[dr] = (sc[dr] || 0) + 50;
      st.scores = sc;
      st.phase = "roundover";
      st.endedBy = "guessed";
      lobbyRef.update({ state: st, updatedAt: Date.now() });
    }
  });
}
function picAdvance() {
  if (picRoundAdvancing || !lobbyRef) { return; }
  picRoundAdvancing = true;
  setTimeout(function () {
    picRoundAdvancing = false;
    if (!lobbyRef) { return; }
    lobbyRef.once("value", function (snap) {
      var L = snap.val();
      if (!L || !L.state || L.state.phase !== "roundover") { return; }
      var me = myUid();
      var drawerUid = L.state.drawer === "h" ? (L.host && L.host.uid) : (L.guest && L.guest.uid);
      if (drawerUid !== me) { return; }
      var round = L.state.round || 0;
      if (round >= 4) {
        var sc = L.state.scores || { h: 0, g: 0 };
        var wRole = (sc.h >= sc.g) ? "h" : "g";
        var wUid = wRole === "h" ? (L.host && L.host.uid) : (L.guest && L.guest.uid);
        var wName = picName(L, wRole);
        lobbyRef.update({ status: "done", winner: wUid, winnerName: wName, updatedAt: Date.now() });
      } else {
        picStartRound();
      }
    });
  }, 4000);
}
function renderPicNet(L) {
  picCurLobby = L;
  if (!L) { picCleanup(); enterGames(); return; }
  var me = myUid();
  var role = picRole(L);
  var st = L.state || {};
  picCur = st;
  var status = document.getElementById("pic-status");
  var wordRow = document.getElementById("pic-word-row");
  var drawRow = document.getElementById("pic-draw-row");
  var guessRow = document.getElementById("pic-guess-row");
  var scores = document.getElementById("pic-scores");
  wordRow.className = "hidden";
  drawRow.className = "hidden";
  guessRow.className = "hidden";
  if (picTimerInt) { clearInterval(picTimerInt); picTimerInt = null; }
  document.getElementById("pic-timer").textContent = "";
  var sc = st.scores || { h: 0, g: 0 };
  scores.textContent = "scores: " + picName(L, "h") + " " + (sc.h || 0) + " - " + (sc.g || 0) + " " + picName(L, "g");
  if (L.status === "waiting") {
    status.textContent = "waiting for someone to join...";
    picRenderStrokes(null);
    return;
  }
  if (L.status === "playing" && (!st.phase || st.phase === "lobby")) {
    status.textContent = "starting...";
    if (L.host && L.host.uid === me) { picStartRound(); }
    return;
  }
  if (L.status === "done") {
    status.textContent = (L.winner === me) ? "you win! +10 xp" : ((L.winnerName || "someone") + " wins!");
    if (L.winner === me) { xpWinOnce(); }
    picRenderStrokes(st.strokes);
    return;
  }
  var drawerName = picName(L, st.drawer);
  var iDraw = (st.drawer === role);
  if (st.phase === "pick") {
    if (iDraw) {
      status.textContent = "round " + st.round + " of 4 - pick a word to draw:";
      wordRow.className = "";
      var box = document.getElementById("pic-word-choices");
      box.innerHTML = "";
      var ch = st.choices || [];
      if (!ch.length && lobbyRef) {
        ch = picPickWords();
        lobbyRef.child("state/choices").set(ch);
      }
      for (var i = 0; i < ch.length; i++) {
        (function (w) {
          var b = document.createElement("button");
          b.className = "mini";
          b.textContent = w;
          b.onclick = function () { picChooseWord(w); };
          box.appendChild(b);
        })(ch[i]);
      }
    } else {
      status.textContent = drawerName + " is picking a word...";
    }
    picRenderStrokes(null);
  } else if (st.phase === "draw") {
    picRenderStrokes(st.strokes);
    if (iDraw) {
      status.textContent = "draw: " + st.word;
      drawRow.className = "";
      var self = me;
      picTimerInt = setInterval(function () {
        var left = Math.max(0, Math.round(((st.endsAt || 0) - Date.now()) / 1000));
        document.getElementById("pic-timer").textContent = left + "s left";
        if (left <= 0 && lobbyRef) {
          clearInterval(picTimerInt); picTimerInt = null;
          lobbyRef.once("value", function (snap) {
            var L2 = snap.val();
            if (!L2 || !L2.state || L2.state.phase !== "draw") { return; }
            var dUid = L2.state.drawer === "h" ? (L2.host && L2.host.uid) : (L2.guest && L2.guest.uid);
            if (dUid !== self) { return; }
            var s2 = L2.state;
            s2.phase = "roundover";
            s2.endedBy = "timeout";
            lobbyRef.update({ state: s2, updatedAt: Date.now() });
          });
        }
      }, 1000);
    } else {
      var blanks = "";
      for (var b2 = 0; b2 < String(st.word).length; b2++) { blanks += "_ "; }
      status.textContent = drawerName + " is drawing: " + blanks;
      guessRow.className = "";
      picTimerInt = setInterval(function () {
        var left = Math.max(0, Math.round(((st.endsAt || 0) - Date.now()) / 1000));
        document.getElementById("pic-timer").textContent = left + "s left";
      }, 1000);
    }
  } else if (st.phase === "roundover") {
    picRenderStrokes(st.strokes);
    status.textContent = "the word was: " + st.word + (st.endedBy === "timeout" ? " (time up!)" : " (guessed!)");
    picAdvance();
  }
}
function picCleanup() {
  if (picTimerInt) { clearInterval(picTimerInt); picTimerInt = null; }
  picRoundAdvancing = false;
  picCur = null;
  picCurLobby = null;
  if (lobbyRef) {
    var lref = lobbyRef;
    var u = auth.currentUser;
    lobbyRef.off(); lobbyRef = null;
    if (u) {
      lref.once("value", function (snap) {
        var L = snap.val();
        if (L && L.status === "waiting" && L.host && L.host.uid === u.uid) { lref.remove(); }
      });
    }
  }
  gameMode = null;
}

var petSprites = {
  "cat": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAArUlEQVR4nN1UQQ7DMAizp/3/y+xSTTTBOM0qTRuXHMA2BlrgHyPuxD9uFplwpUBE7IjEgfMCGyIlOQA8DQokrYgiBxoHAEDScds66WAEVV3mGpJ1TcF9qursq2YybzuiYweWfGsHmVyJ5LwSsQ7yezVvBRx4JS8FVk/U1SuWsq3cbdPAKaEcTOhxFGI0+l5FXPnhlVyrg+6EWo6vOniTd6c4LHvis9/Bp/H7S34BnZlWDhv82BoAAAAASUVORK5CYII=",
  "dog": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAiUlEQVR4nO1SWw6AMAgbxvtfuX6YzcrkMaN/NFmMK7QUba1Q+AP4sl8c0uPS/WKQXJRJZNVJZHCRmGkRHWAu2aKKJ+EV3jUAMKbU0/K9Z5JOoEWse409MmARTgEgFG8tSMBr4FX01Vnru2noYa1C/h5P7wlt0wT94IwwnnTM/vBHdoxX+wuFlzgAqZFL+WWB36gAAAAASUVORK5CYII=",
  "frog": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAArUlEQVR4nO1TQQ7DMAgj+//Dwqu8E1nkGpJI3aWqbwXXBpeaPRm4g/9ZkHdNUr4yYNLKpORnG9yGvxu0pA7iVDFxv3Ezw+kVSb2dDQzIvVqrNcsrAmAAzN2luLsPTjZc+pHjpRBnE65XW7I7GL33Sy2rh0YIcoA4mUZh+ibN7Kk/2ohpPkEVW/Sjx/GUBsokg+CNBxXRz50mVMIzTw29Gu/knKTWev+10a7GC40vzUKPl1BIeBEAAAAASUVORK5CYII=",
  "penguin": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAv0lEQVR4nO1VWw7EIAiEzR5aT+Cx6cdmTREY0Cb7tZM0teLMgPVB9EcC3hgrJ/zXA3HUv2WQicB4ZjDJIlpn+Q5NkIERj97IBP0kzRbLZzZ00/GuiBMR9d5BLoqnTFZHt8xv9neTMcZHwFahtNNV5E3NTlyN9Z4VrTXTF3FnGTeDowzRNFV38jF+asBBewdGI60AzG8tnuiHZ5Ej7mplFUzSmmlFHAYWoLUKNar3QSTCiXl42FVNHt9oErSz2MQFniRuuZw8lhEAAAAASUVORK5CYII=",
  "dragon": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAAuElEQVR4nO1Uyw4CIQycGv//l+tBwTJMC0RjjHGSPWwp89iyAL8GfzfPtVi0V4gbLvRuAODurXk3kd+39fZuTiVAEIGZVYk89ipwggfnxGV4JoqP0cbJiBLgDd2pgFPfzFHwD6TqMyRJB5QJMuKT9UygD6+5ZLexHkSWxzR1yE6zOiM9pkymBrkiBzaG3MizIZP4+ZAFSVmf9q8EUPytlfNdgZPbVXJtJxD9WX3AcgafQnkX/fHduAGiPVoP3+FN4AAAAABJRU5ErkJggg==",
};
var petNames = { cat: "cat", dog: "dog", frog: "frog", penguin: "penguin", dragon: "dragon" };
/* ---------- XP + store ---------- */
var gameXpGiven = false;
var myXp = 0;
var myStore = {};
var xpRef = null;
function xpPad(n) { return (n < 10 ? "0" : "") + n; }
function xpDayKey(d) { return d.getFullYear() + "-" + xpPad(d.getMonth() + 1) + "-" + xpPad(d.getDate()); }
function xpMonthKey(d) { return d.getFullYear() + "-" + xpPad(d.getMonth() + 1); }
function xpWeekKey(d) {
  var t = new Date(d.getTime()); t.setHours(0, 0, 0, 0);
  t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7));
  var y = t.getFullYear();
  var w1 = new Date(y, 0, 4);
  var wk = 1 + Math.round(((t - w1) / 86400000 - 3 + ((w1.getDay() + 6) % 7)) / 7);
  return y + "-W" + xpPad(wk);
}
function bumpXp(path, n) {
  db.ref(path).transaction(function (cur) { return (typeof cur === "number" ? cur : 0) + n; });
}
function changeXp(uid, n) {
  if (!uid || !n) { return; }
  db.ref("xp/" + uid).transaction(function (cur) {
    var v = (cur && typeof cur.xp === "number") ? cur.xp : 0;
    return { xp: Math.max(0, v + n) };
  });
  var now2 = new Date();
  if (n > 0) {
    bumpXp("xpDaily/" + xpDayKey(now2) + "/" + uid, n);
    bumpXp("xpWeekly/" + xpWeekKey(now2) + "/" + uid, n);
    bumpXp("xpMonthly/" + xpMonthKey(now2) + "/" + uid, n);
  } else {
    bumpXpDown("xpDaily/" + xpDayKey(now2) + "/" + uid, n);
    bumpXpDown("xpWeekly/" + xpWeekKey(now2) + "/" + uid, n);
    bumpXpDown("xpMonthly/" + xpMonthKey(now2) + "/" + uid, n);
  }
}
function bumpXpDown(path, n) {
  db.ref(path).transaction(function (cur) {
    return Math.max(0, (typeof cur === "number" ? cur : 0) + n);
  });
}
function xpBoostMult() { return (myBoostUntil && Date.now() < myBoostUntil) ? 2 : 1; }
function grantXp(n, key, cooldownMs) {
  var u = auth.currentUser;
  if (!u) { return; }
  var k = "xp_cool_" + key;
  var last = 0;
  try { last = parseInt(localStorage.getItem(k) || "0", 10); } catch (e) {}
  if (Date.now() - last < cooldownMs) { return; }
  try { localStorage.setItem(k, String(Date.now())); } catch (e2) {}
  changeXp(u.uid, n * xpBoostMult());
}
function xpWinOnce() {
  if (gameXpGiven) { return; }
  gameXpGiven = true;
  grantXp(10, "gamewin", 30000);
}
function watchXp() {
  var u = auth.currentUser;
  if (xpRef) { xpRef.off(); xpRef = null; }
  if (!u) { myXp = 0; return; }
  xpRef = db.ref("xp/" + u.uid);
  xpRef.on("value", function (snap) {
    var v = snap.val();
    myXp = (v && typeof v.xp === "number") ? v.xp : 0;
    refreshHome();
    var sx = document.getElementById("store-xp");
    if (sx) { sx.textContent = myXp; }
  });
  db.ref("store/" + u.uid).on("value", function (snap) {
    myStore = snap.val() || {};
  });
}
function tipXp(toUid, amount) {
  var me = myUid();
  if (!me || !toUid || toUid === me) { return; }
  var k = "xp_cool_tip";
  var last = 0;
  try { last = parseInt(localStorage.getItem(k) || "0", 10); } catch (e) {}
  if (Date.now() - last < 60000) { flashNotice("wait a bit before tipping again."); return; }
  if (myXp < amount) { flashNotice("not enough xp to tip."); return; }
  try { localStorage.setItem(k, String(Date.now())); } catch (e2) {}
  changeXp(me, -amount);
  changeXp(toUid, amount);
  flashNotice("tipped " + amount + " xp!");
}
var storeItems = [
  { id: "theme_dots", kind: "theme", themeKey: "dots", name: "dots theme", desc: "dotted background for your profile", cost: 60 },
  { id: "theme_stripes", kind: "theme", themeKey: "stripes", name: "stripes theme", desc: "striped background for your profile", cost: 60 },
  { id: "theme_grid", kind: "theme", themeKey: "grid", name: "grid theme", desc: "grid background for your profile", cost: 60 },
  { id: "theme_checker", kind: "theme", themeKey: "checker", name: "checker theme", desc: "checkerboard background for your profile", cost: 60 },
  { id: "boost", kind: "boost", name: "xp boost", desc: "double xp for 24 hours", cost: 120 },
  { id: "box", kind: "box", name: "mystery box", desc: "a random surprise — could be anything", cost: 30 }
];
var themeDefs = [
  { id: "dots", name: "dots", cls: "ptheme-dots" },
  { id: "stripes", name: "stripes", cls: "ptheme-stripes" },
  { id: "grid", name: "grid", cls: "ptheme-grid" },
  { id: "checker", name: "checker", cls: "ptheme-checker" }
];
function themeDefFor(id) {
  for (var i = 0; i < themeDefs.length; i++) { if (themeDefs[i].id === id) { return themeDefs[i]; } }
  return null;
}
var boardTab = "day";
function enterBoard() { showScreen("board-screen"); loadBoard(); }
function loadBoard() {
  var tabs = document.getElementsByClassName("board-tab");
  for (var i = 0; i < tabs.length; i++) {
    (function (t) {
      t.className = "mini secondary board-tab" + (t.getAttribute("data-b") === boardTab ? " on" : "");
      t.onclick = function () { boardTab = t.getAttribute("data-b"); loadBoard(); };
    })(tabs[i]);
  }
  var list = document.getElementById("board-list");
  list.innerHTML = "<p>loading...</p>";
  var now = new Date();
  var isAll = boardTab === "all";
  var ref;
  if (isAll) { ref = db.ref("xp"); }
  else if (boardTab === "day") { ref = db.ref("xpDaily/" + xpDayKey(now)); }
  else if (boardTab === "week") { ref = db.ref("xpWeekly/" + xpWeekKey(now)); }
  else { ref = db.ref("xpMonthly/" + xpMonthKey(now)); }
  ref.once("value", function (snap) {
    var v = snap.val() || {};
    var rows = [];
    for (var uid in v) {
      var amt = isAll ? ((v[uid] && typeof v[uid].xp === "number") ? v[uid].xp : 0)
                      : (typeof v[uid] === "number" ? v[uid] : 0);
      if (amt > 0) { rows.push({ uid: uid, xp: amt }); }
    }
    rows.sort(function (a, b) { return b.xp - a.xp; });
    rows = rows.slice(0, 20);
    db.ref("users").once("value", function (usnap) {
      var users = usnap.val() || {};
      list.innerHTML = "";
      if (!rows.length) { list.innerHTML = "<p>nobody yet — be the first!</p>"; return; }
      var me = myUid();
      for (var i = 0; i < rows.length; i++) {
        (function (r, rank) {
          var row = document.createElement("div");
          row.className = "board-row" + (r.uid === me ? " me" : "");
          var rk = document.createElement("span");
          rk.className = "board-rank"; rk.textContent = (rank + 1) + ".";
          var nm = document.createElement("span");
          var urec = users[r.uid];
          nm.textContent = (urec && urec.name) || "???";
          if (nm.textContent === "???" && r.uid) {
            (function (nmEl, uid) {
              db.ref("users/" + uid + "/name").once("value", function (nsnap) {
                var n = nsnap.val();
                if (n) { nmEl.textContent = n; styleModName(nmEl, uid, n); }
              });
            })(nm, r.uid);
          }
          styleModName(nm, r.uid, nm.textContent);
          var ptt = petTagFor(urec ? urec.pet : null);

          var xp = document.createElement("span");
          xp.className = "board-xp"; xp.textContent = r.xp + " xp";
          row.appendChild(rk); row.appendChild(nm);
          if (ptt) { row.appendChild(ptt); }
          row.appendChild(xp);
          list.appendChild(row);
        })(rows[i], i);
      }
    });
  });
}
function enterStore() {
  showScreen("store-screen");
  renderStore();
}
function storeOwned(itemId) {
  return !!(myStore && myStore[itemId]);
}
function openStoreDetails(it) {
  var me = myUid();
  document.getElementById("store-d-name").textContent = it.name;
  document.getElementById("store-d-desc").textContent = it.desc;
  document.getElementById("store-d-cost").textContent = it.cost + " xp";
  var prev = document.getElementById("store-d-preview");
  prev.innerHTML = "";
  var opts = document.getElementById("store-d-options");
  opts.innerHTML = "";
  if (it.kind === "pet") {
    var img = document.createElement("img");
    img.src = petSprites[it.petKey];
    img.style.width = "96px"; img.style.height = "96px";
    img.style.imageRendering = "pixelated";
    prev.appendChild(img);
  } else if (it.kind === "theme") {
    // preview: mock profile with theme background
    var mock = document.createElement("div");
    mock.style.cssText = "border:2px solid #111;padding:16px;max-width:280px;margin:0 auto;";
    var def = themeDefFor(it.themeKey);
    if (def) { mock.className = def.cls; }
    mock.innerHTML = "<p><b>" + censor(displayName()) + "</b></p><p style='font-size:14px'>this is how your profile would look!</p>";
    prev.appendChild(mock);
    // option selector to preview other themes
    var lbl = document.createElement("p");
    lbl.style.fontSize = "15px"; lbl.textContent = "preview other themes:";
    opts.appendChild(lbl);
    themeDefs.forEach(function (td) {
      var b = document.createElement("button");
      b.className = "mini secondary";
      b.textContent = td.name;
      b.style.margin = "2px";
      b.onclick = function () {
        mock.className = "";
        mock.className = td.cls;
      };
      opts.appendChild(b);
    });
  } else if (it.kind === "boost") {
    prev.innerHTML = "<p style='font-size:48px'>\u26a1</p><p>2x xp for 24 hours!</p>";
  } else if (it.kind === "box") {
    prev.innerHTML = "<p style='font-size:48px'>?</p><p>could be xp, a pet, a theme, or a boost!</p>";
  }
  var buyBtn = document.getElementById("store-d-buy");
  if (storeOwned(it.id)) {
    buyBtn.textContent = "owned!";
    buyBtn.disabled = true;
  } else {
    buyBtn.textContent = "buy (" + it.cost + " xp)";
    buyBtn.disabled = false;
    buyBtn.onclick = function () { storeBuyItem(it); };
  }
  document.getElementById("store-modal").className = "";
}
document.getElementById("store-d-close").onclick = function () {
  document.getElementById("store-modal").className = "hidden";
};
function storeBuyItem(it) {
  var me = myUid();
  if (myXp < it.cost) { flashNotice("not enough xp!"); return; }
  if (it.kind === "box") {
    changeXp(me, -it.cost);
    openMysteryBox();
    document.getElementById("store-modal").className = "hidden";
    return;
  }
  if (it.kind === "boost") {
    changeXp(me, -it.cost);
    var until = Math.max(Date.now(), myBoostUntil || 0) + 24 * 3600 * 1000;
    db.ref("users/" + me + "/xpBoostUntil").set(until, function () {
      myBoostUntil = until; renderStore(); refreshHome();
      flashNotice("2x xp for 24 hours!");
      document.getElementById("store-modal").className = "hidden";
    });
    return;
  }
  // pet or theme: buy individual
  changeXp(me, -it.cost);
  var up = {};
  up["store/" + me + "/" + it.id] = true;
  db.ref().update(up, function (err) {
    if (!err) {
      if (!myStore) { myStore = {}; }
      myStore[it.id] = true;
      // auto-select the purchased item
      if (it.kind === "pet") {
        db.ref("users/" + me + "/pet").set(it.petKey, function () { myPet = it.petKey; });
      } else if (it.kind === "theme") {
        db.ref("users/" + me + "/theme").set(it.themeKey, function () { myTheme = it.themeKey; });
      }
      renderStore(); refreshHome();
      flashNotice(it.name + " purchased!");
      document.getElementById("store-modal").className = "hidden";
    } else {
      flashNotice("purchase failed.");
    }
  });
}
function renderStore() {
  var box = document.getElementById("store-items");
  if (!box) { return; }
  box.innerHTML = "";
  var sx = document.getElementById("store-xp");
  if (sx) { sx.textContent = myXp; }
  // owned pets/themes pickers
  var ownedPets = [], ownedThemes = [];
  for (var i = 0; i < storeItems.length; i++) {
    var it = storeItems[i];
    if (it.kind === "pet" && storeOwned(it.id)) { ownedPets.push(it.petKey); }
    if (it.kind === "theme" && storeOwned(it.id)) { ownedThemes.push(it.themeKey); }
  }
  if (ownedPets.length) {
    var pl = document.createElement("p");
    pl.style.fontSize = "15px"; pl.textContent = "your pets — pick one:";
    box.appendChild(pl);
    var prow = document.createElement("div");
    petPickerInto(prow, myPet, function (key) {
      db.ref("users/" + myUid() + "/pet").set(key, function () {
        myPet = key; renderStore(); refreshHome(); flashNotice("pet set!");
      });
    }, ownedPets);
    box.appendChild(prow);
  }
  if (ownedThemes.length) {
    var tl = document.createElement("p");
    tl.style.fontSize = "15px"; tl.textContent = "your themes — pick one:";
    box.appendChild(tl);
    var trow = document.createElement("div");
    themePickerInto(trow, myTheme, function (key) {
      db.ref("users/" + myUid() + "/theme").set(key, function () {
        myTheme = key; renderStore(); flashNotice("theme set!");
      });
    }, ownedThemes);
    box.appendChild(trow);
  }
  // item list (tap for details)
  for (var j = 0; j < storeItems.length; j++) {
    (function (it) {
      var row = document.createElement("div");
      row.className = "req-row";
      row.style.cursor = "pointer";
      var t = document.createElement("p");
      var b = document.createElement("b");
      b.textContent = it.name + " — " + it.cost + " xp" + (storeOwned(it.id) ? " (owned)" : "");
      t.appendChild(b);
      row.appendChild(t);
      var d = document.createElement("p");
      d.style.fontSize = "15px";
      d.textContent = it.desc;
      row.appendChild(d);
      row.onclick = function () { openStoreDetails(it); };
      box.appendChild(row);
    })(storeItems[j]);
  }
}
function storeBuyBtn(it, after, consumable) {
  var me = myUid();
  var buy = document.createElement("button");
  buy.className = "mini";
  buy.textContent = "buy (" + it.cost + " xp)";
  buy.onclick = function () {
    if (myXp < it.cost) { flashNotice("not enough xp!"); return; }
    changeXp(me, -it.cost);
    if (consumable) { if (after) { after(); } return; }
    var up = {}; up["store/" + me + "/" + it.id] = true;
    db.ref().update(up, function () { if (after) { after(); } });
  };
  return buy;
}
function petPickerInto(row, current, onPick, owned) {
  var keys = Object.keys(petSprites);
  if (owned) { keys = keys.filter(function (k) { return owned.indexOf(k) !== -1; }); }
  for (var i = 0; i < keys.length; i++) {
    (function (key) {
      var d = document.createElement("div");
      d.className = "pet-pick" + (current === key ? " sel" : "");
      var im = document.createElement("img");
      im.src = petSprites[key]; im.alt = petNames[key] || key; im.title = petNames[key] || key;
      d.appendChild(im);
      var lb = document.createElement("span");
      lb.style.fontSize = "13px"; lb.textContent = petNames[key] || key;
      d.appendChild(lb);
      d.onclick = function () { onPick(key); };
      row.appendChild(d);
    })(keys[i]);
  }
}
function themePickerInto(row, current, onPick, owned) {
  var defs = themeDefs;
  if (owned) { defs = defs.filter(function (td) { return owned.indexOf(td.id) !== -1; }); }
  for (var i = 0; i < defs.length; i++) {
    (function (td) {
      var d = document.createElement("div");
      d.className = "theme-swatch " + td.cls + (current === td.id ? " sel" : "");
      d.title = td.name;
      d.onclick = function () { onPick(td.id); };
      row.appendChild(d);
    })(defs[i]);
  }
}
function openMysteryBox() {
  var me = myUid();
  var r = Math.random();
  if (r < 0.55) {
    var amt = 25 + Math.floor(Math.random() * 36);
    changeXp(me, amt);
    flashNotice("mystery box: +" + amt + " xp!");
  } else if (r < 0.75) {
    var keys = Object.keys(petSprites);
    var pk = keys[Math.floor(Math.random() * keys.length)];
    if (pk === myPet) { changeXp(me, 50); flashNotice("mystery box: duplicate pet, +50 xp instead!"); }
    else {
      db.ref("users/" + me + "/pet").set(pk, function () {
        myPet = pk; flashNotice("mystery box: a " + (petNames[pk] || pk) + " pet!");
      });
    }
  } else if (r < 0.90) {
    var tk = themeDefs[Math.floor(Math.random() * themeDefs.length)].id;
    if (tk === myTheme) { changeXp(me, 50); flashNotice("mystery box: duplicate theme, +50 xp instead!"); }
    else {
      db.ref("users/" + me + "/theme").set(tk, function () {
        myTheme = tk; flashNotice("mystery box: " + tk + " theme!");
      });
    }
  } else {
    var until = Math.max(Date.now(), myBoostUntil || 0) + 12 * 3600 * 1000;
    db.ref("users/" + me + "/xpBoostUntil").set(until, function () {
      myBoostUntil = until; flashNotice("mystery box: 12h xp boost!");
    });
  }
  renderStore(); refreshHome();
}

function flairName(name, rec) {
  return name || "Reader";
}

    /* ---------- life sim (bitlife-style, 100% local) ---------- */
  var life = null;
  var lifeEventOpen = false;
  var lifePanelName = null;
  var LIFE_MALE = ["james","john","robert","michael","william","david","liam","noah","oliver","elijah","mateo","leo","owen","ezra","caleb","nathan","isaac","christian","hunter","jack","wyatt","carter","grayson","mason","logan","lucas","henry","theo","miles","jude"];
  var LIFE_FEMALE = ["mia","olivia","emma","ava","sophia","isabella","luna","harper","camila","ella","scarlett","zoey","nora","hazel","violet","aurora","ruby","chloe","stella","penelope","layla","aria","ellie","nova","isla","ivy","lucy","willow","mia","ada"];
  var LIFE_LAST = ["smith","johnson","williams","brown","jones","garcia","miller","davis","rodriguez","martinez","hernandez","lopez","gonzalez","wilson","anderson","taylor","thomas","moore","martin","lee","walker","hall","young","king","wright","scott","torres","nguyen","hill","flores","green","adams","nelson","baker","hall","rivera","campbell","mitchell","carter","roberts"];
  var LIFE_DEGREES = ["business","psychology","biology","engineering","english","history","art","computer science","nursing","education"];
  var LIFE_PET_KINDS = [["cat",16,300],["dog",13,500],["hamster",3,50],["parrot",25,400],["fish",5,40],["turtle",30,200]];
  var LIFE_PET_NAMES = ["mochi","biscuit","pepper","luna","rocky","coco","simba","oreo","ginger","shadow","lucky","daisy","max","bella","charlie","lola","zeus","nala","teddy","willow"];
  function ri(n) { return Math.floor(Math.random() * (n + 1)); }
  function rrange(a, b) { return a + ri(b - a); }
  function rpick(arr) { return arr[ri(arr.length - 1)]; }
  function rchance(p) { return Math.random() < p; }
  function fmtMoney(n) {
    n = Math.round(n);
    var neg = n < 0;
    var s = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return (neg ? "-$" : "$") + s;
  }
  function lifeBoyName() { return rpick(LIFE_MALE) + " " + rpick(LIFE_LAST); }
  function lifeGirlName() { return rpick(LIFE_FEMALE) + " " + rpick(LIFE_LAST); }
  function lifeRandName() { return rchance(0.5) ? lifeBoyName() : lifeGirlName(); }
  function lifeSetHabits() {
    // called yearly: consistent exercise + doctor visits = healthy habits
    if (!life.habitYears) { life.habitYears = 0; }
    // (incremented by mind+body actions)
  }
  function lifeClamp() {
    var s = life.stats;
    s.happy = Math.max(0, Math.min(100, s.happy));
    s.health = Math.max(0, Math.min(100, s.health));
    s.smarts = Math.max(0, Math.min(100, s.smarts));
    s.looks = Math.max(0, Math.min(100, s.looks));
    life.fame = Math.max(0, Math.min(100, life.fame));
    if (life.money < 0) { life.money = 0; }
  }
  function lifeSave() {
    try { localStorage.setItem("readium_life", JSON.stringify(life)); } catch (e) {}
  }
  function lifeLoad() {
    try {
      var s = localStorage.getItem("readium_life");
      return s ? JSON.parse(s) : null;
    } catch (e) { return null; }
  }
  function lifeClear() { try { localStorage.removeItem("readium_life"); } catch (e) {} }
  function lifeLog(t) {
    life.log.unshift("age " + life.age + ": " + t);
    if (life.log.length > 80) { life.log.length = 80; }
  }
  function lifeAfterAction() {
    lifeClamp();
    lifeSave();
    lifeRender();
    lifeRenderPanel();
  }
  function lifeMkBtn(parent, text, fn, cls) {
    var b = document.createElement("button");
    b.className = cls || "mini secondary";
    b.textContent = text;
    b.onclick = fn;
    parent.appendChild(b);
    return b;
  }
  function lifeP(text) {
    var p = document.createElement("p");
    p.textContent = text;
    return p;
  }
  function lifeNetWorth() {
    var n = life.money;
    for (var i = 0; i < life.assets.length; i++) { n += life.assets[i].value; }
    n -= life.loans;
    return Math.round(n);
  }
  function lifeGenParents(l) {
    l.parents = [
      { name: lifeBoyName(), age: rrange(22, 38), alive: true, rel: rrange(40, 80), dad: true },
      { name: lifeGirlName(), age: rrange(22, 38), alive: true, rel: rrange(40, 80), dad: false }
    ];
    var nsib = ri(3);
    l.siblings = [];
    for (var i = 0; i < nsib; i++) {
      l.siblings.push({ name: lifeRandName(), age: rrange(0, 10) - ri(6), alive: true, rel: rrange(30, 70) });
      if (l.siblings[i].age < 0) { l.siblings[i].age = 0; }
    }
  }
  function lifeMigrate(l) {
    if (!l || l.v === 2) { return l; }
    l.v = 2;
    if (!l.gender) { l.gender = rchance(0.5) ? "boy" : "girl"; }
    if (l.fame === undefined) { l.fame = 0; }
    if (!l.edu) { l.edu = { college: 0, degree: null, grad: 0, gradDegree: null, dropped: false }; }
    if (!l.parents) { l.parents = []; }
    if (!l.siblings) { l.siblings = []; }
    if (!l.friends) { l.friends = []; }
    if (!l.pets) { l.pets = []; }
    if (!l.kids) { l.kids = []; }
    if (l.loans === undefined) { l.loans = 0; }
    if (l.jailTotal === undefined) { l.jailTotal = 0; }
    if (l.gen === undefined) { l.gen = 1; }
    if (l.sick === undefined) { l.sick = null; }
    if (l.retired === undefined) { l.retired = false; }
    if (!l.parents.length && l.age < 70) { lifeGenParents(l); }
    var i;
    for (i = 0; i < l.kids.length; i++) { if (l.kids[i].rel === undefined) { l.kids[i].rel = 60; } }
    if (l.partner && l.partner.rel === undefined) { l.partner.rel = 60; }
    return l;
  }
  function lifeNewLife(nm, inherit) {
    var gender = rchance(0.5) ? "boy" : "girl";
    life = {
      v: 2, name: nm || lifeRandName(), gender: gender, age: 0,
      money: inherit || 0, dead: false,
      stats: { happy: 60 + ri(20), health: 70 + ri(20), smarts: 30 + ri(30), looks: 30 + ri(40) },
      fame: 0,
      edu: { college: 0, degree: null, grad: 0, gradDegree: null, dropped: false },
      job: null, retired: false,
      assets: [], partner: null, kids: [],
      parents: [], siblings: [], friends: [], pets: [],
      jail: 0, jailTotal: 0, loans: 0, sick: null,
      gen: (inherit && inherit.gen) ? inherit.gen : 1,
      log: []
    };
    lifeGenParents(life);
    lifeLog("was born to " + life.parents[0].name + " and " + life.parents[1].name + ".");
    if (inherit && inherit.money) { lifeLog("inherited " + fmtMoney(inherit.money) + "."); }
    lifeSave();
    showLifeGame();
  }
  function enterLife() {
    showScreen("life-screen");
    life = lifeMigrate(lifeLoad());
    lifeEventOpen = false;
    lifePanelName = null;
    if (life && !life.dead) { showLifeGame(); }
    else { showLifeStart(); }
  }
  function showLifeStart() {
    document.getElementById("life-start").className = "";
    document.getElementById("life-game").className = "hidden";
    document.getElementById("life-dead").className = "hidden";
  }
  function showLifeGame() {
    document.getElementById("life-start").className = "hidden";
    document.getElementById("life-game").className = "";
    document.getElementById("life-dead").className = "hidden";
    document.getElementById("life-event").innerHTML = "";
    document.getElementById("life-panel").innerHTML = "";
    lifeEventOpen = false;
    lifePanelName = null;
    lifeRender();
  }
  document.getElementById("life-start-btn").onclick = function () {
    var nm = document.getElementById("life-name-input").value.replace(/^\s+|\s+$/g, "").substring(0, 16);
    lifeNewLife(nm || null, null);
  };
  function statBar(label, val) {
    return '<div class="stat"><span>' + label + '</span><div class="bar"><div class="fill" style="width:' + val + '%"></div></div></div>';
  }
  function lifeStatusLine() {
    var bits = [];
    if (life.jail > 0) { bits.push("IN JAIL (" + life.jail + "y)"); }
    if (life.sick) { bits.push("sick: " + life.sick); }
    if (life.job) { bits.push(life.job.title + " (" + fmtMoney(life.job.salary) + "/yr)"); }
    else if (life.edu.college > 0 && !life.edu.degree) { bits.push("college student"); }
    else if (life.edu.grad > 0 && !life.edu.gradDegree) { bits.push("grad student"); }
    else if (life.retired) { bits.push("retired"); }
    if (life.partner) { bits.push(life.partner.married ? "married" : "dating " + life.partner.name.split(" ")[0]); }
    if (life.fame >= 50) { bits.push("FAMOUS"); }
    return bits.join(" - ");
  }
  function lifeRender() {
    try { lifeRefreshTabLocks(); } catch (e) {}
    if (!life) { return; }
    var h = "<p><b>" + escapeHtml(life.name) + "</b>, age " + life.age + " — " + fmtMoney(life.money) + "</p>";
    var st = lifeStatusLine();
    if (st) { h += "<p style=\"font-size:16px;color:#555\">" + escapeHtml(st) + "</p>"; }
    h += statBar("happy", life.stats.happy) + statBar("health", life.stats.health) +
         statBar("smarts", life.stats.smarts) + statBar("looks", life.stats.looks);
    if (life.fame > 0) { h += statBar("fame", life.fame); }
    if (life.loans > 0) { h += "<p style=\"font-size:16px\">debt: " + fmtMoney(life.loans) + "</p>"; }
    document.getElementById("life-stats").innerHTML = h;
    var ab = document.getElementById("life-age-btn");
    ab.textContent = life.jail > 0 ? "serve time +" : "age +";
    var log = document.getElementById("life-log");
    log.innerHTML = "";
    for (var i = 0; i < life.log.length; i++) {
      var p = document.createElement("p");
      p.textContent = life.log[i];
      log.appendChild(p);
    }
  }

  /* ----- aging ----- */
  document.getElementById("life-age-btn").onclick = function () {
    if (!life || life.dead || lifeEventOpen) { return; }
    lifeAge();
  };
  function lifeAgePerson(p) { p.age++; }
  function lifeAge() {
    life.age++;
    var i, k;
    // family ages
    for (i = 0; i < life.parents.length; i++) { if (life.parents[i].alive) { life.parents[i].age++; } }
    for (i = 0; i < life.siblings.length; i++) { if (life.siblings[i].alive) { life.siblings[i].age++; } }
    for (i = 0; i < life.kids.length; i++) { life.kids[i].age++; }
    for (i = 0; i < life.friends.length; i++) { life.friends[i].age++; }
    for (i = 0; i < life.pets.length; i++) { life.pets[i].age++; }
    if (life.partner) { life.partner.age++; }
    // jail
    if (life.jail > 0) {
      life.jail--;
      life.jailTotal++;
      lifeLog(life.jail > 0 ? "served a year in prison." : "was released from prison.");
      life.stats.happy -= 8;
      if (life.jail === 0 && rchance(0.5)) { lifeLog("is a free person again."); }
      lifeAfterAction();
      lifeMaybeEvent();
      return;
    }
    // parent deaths + inheritance
    for (i = 0; i < life.parents.length; i++) {
      var par = life.parents[i];
      if (par.alive && par.age > 60 && rchance(Math.min(0.3, (par.age - 60) * 0.02))) {
        par.alive = false;
        var inh = rrange(10000, 120000);
        var heirs = 1;
        for (k = 0; k < life.siblings.length; k++) { if (life.siblings[k].alive) { heirs++; } }
        var share = Math.round(inh / heirs);
        life.money += share;
        life.stats.happy -= 25;
        lifeLog(par.name + " passed away. Inherited " + fmtMoney(share) + ".");
      }
    }
    // sibling deaths (rare)
    for (i = 0; i < life.siblings.length; i++) {
      var sib = life.siblings[i];
      if (sib.alive && sib.age > 60 && rchance((sib.age - 60) * 0.015)) {
        sib.alive = false;
        life.stats.happy -= 15;
        lifeLog(sib.name + " passed away.");
      }
    }
    // partner death
    if (life.partner && life.partner.age > 65 && rchance((life.partner.age - 65) * 0.03)) {
      lifeLog(life.partner.name + " passed away.");
      life.stats.happy -= 30;
      life.partner = null;
    }
    // pet deaths
    for (i = life.pets.length - 1; i >= 0; i--) {
      var pet = life.pets[i];
      if (pet.age >= pet.lifespan) {
        life.pets.splice(i, 1);
        life.stats.happy -= 12;
        lifeLog(pet.name + " the " + pet.kind + " passed away.");
      }
    }
    // kids leave home at 18
    for (i = 0; i < life.kids.length; i++) {
      if (life.kids[i].age === 18) { lifeLog(life.kids[i].name + " moved out."); }
    }
    // allowance
    if (life.age < 18) {
      var alivePar = 0;
      for (i = 0; i < life.parents.length; i++) { if (life.parents[i].alive) { alivePar++; } }
      if (alivePar > 0) {
        var allow = rrange(200, 1500);
        life.money += allow;
        if (life.age % 3 === 0) { lifeLog("got " + fmtMoney(allow) + " allowance."); }
      }
    }
    // salary + job review
    if (life.job && !life.retired) {
      life.money += Math.round(life.job.salary / 1);
      life.job.yrs++;
      life.job.perf = Math.max(0, life.job.perf - rrange(0, 10));
      if (life.job.perf >= 70 && rchance(0.4)) {
        var raise = Math.round(life.job.salary * rrange(4, 10) / 100);
        life.job.salary += raise;
        lifeLog("got a raise! Now making " + fmtMoney(life.job.salary) + "/yr.");
        life.stats.happy += 5;
      } else if (life.job.perf >= 85 && rchance(0.25) && life.job.title.indexOf("Sr. ") !== 0) {
        life.job.title = "Sr. " + life.job.title;
        life.job.salary = Math.round(life.job.salary * 1.2);
        lifeLog("was promoted to " + life.job.title + "!");
        life.stats.happy += 10;
      } else if (life.job.perf < 25 && rchance(0.3)) {
        lifeLog("was fired from " + life.job.title + ".");
        life.stats.happy -= 12;
        life.job = null;
      }
    }
    if (life.retired && life.pension) {
      life.money += Math.round(life.pension);
    }
    // kid costs
    var kidCost = 0;
    for (i = 0; i < life.kids.length; i++) { if (life.kids[i].age < 18) { kidCost += 3000; } }
    if (kidCost > 0 && life.money > 0) {
      life.money -= Math.min(life.money, kidCost);
    }
    // asset upkeep
    var upkeep = 0;
    for (i = 0; i < life.assets.length; i++) {
      var a = life.assets[i];
      if (a.kind === "house" || a.kind === "mansion") { upkeep += Math.round(a.value * 0.01); }
      else if (a.kind === "car" || a.kind === "boat") { upkeep += 600; }
    }
    if (upkeep > 0 && life.money > 0) {
      life.money -= Math.min(life.money, upkeep);
    }
    // pet costs
    if (life.pets.length && life.money > 0) {
      life.money -= Math.min(life.money, life.pets.length * 300);
    }
    // loan interest
    if (life.loans > 0) {
      life.loans = Math.round(life.loans * 1.05);
      var pay = Math.min(life.money, Math.round(life.loans * 0.1));
      life.money -= pay;
      life.loans -= pay;
    }
    // exercise streak -> healthy habits (strategic longevity)
    if (life.exercisedThisYear) {
      life.exerciseYears = (life.exerciseYears || 0) + 1;
      if (life.exerciseYears >= 3 && !life.healthyHabits) {
        life.healthyHabits = true;
        lifeLog("has built healthy habits! (lower death risk)");
      }
    } else {
      life.exerciseYears = 0;
      if (life.healthyHabits && life.age > 50) {
        // habits fade if you stop
        life.healthyHabits = false;
      }
    }
    life.exercisedThisYear = false;
    // stat drift
    if (life.age > 40) { life.stats.health -= 1; }
    if (life.age > 60) { life.stats.health -= 2; }
    if (life.age > 75) { life.stats.health -= 2; }
    life.stats.happy += (50 - life.stats.happy) > 0 ? 1 : -1;
    if (life.partner) { life.stats.happy += 2; life.partner.rel = Math.min(100, life.partner.rel + 1); }
    // school progress
    var edu = life.edu;
    if (edu.college > 0 && !edu.degree) {
      edu.college++;
      if (edu.college >= 4) {
        edu.degree = rpick(LIFE_DEGREES);
        edu.college = 0;
        life.stats.smarts += 8;
        lifeLog("graduated college with a degree in " + edu.degree + "!");
        life.stats.happy += 10;
      } else {
        lifeLog("finished year " + edu.college + " of college.");
      }
    }
    if (edu.grad > 0 && !edu.gradDegree) {
      edu.grad++;
      if (edu.grad >= 2) {
        edu.gradDegree = edu.degree || rpick(LIFE_DEGREES);
        edu.grad = 0;
        life.stats.smarts += 6;
        lifeLog("finished grad school!");
        life.stats.happy += 8;
      }
    }
    // sickness worsens
    if (life.sick === "cancer" && rchance(0.25)) { return lifeDie("cancer"); }
    if (life.sick === "heart disease" && rchance(0.2)) { return lifeDie("a heart attack"); }
    // natural death (fixed: steeper curve, hard cap, "old age" only 70+)
    if (life.age >= 120) { return lifeDie("old age"); }
    var deathP = 0;
    if (life.age >= 50 && life.age < 60) { deathP = 0.005; }
    else if (life.age < 70) { deathP = 0.015; }
    else if (life.age < 80) { deathP = 0.05; }
    else if (life.age < 90) { deathP = 0.15; }
    else if (life.age < 100) { deathP = 0.35; }
    else { deathP = 0.6; }
    if (life.stats.health < 20) { deathP *= 3; }
    else if (life.stats.health < 40) { deathP *= 1.5; }
    // good habits protect you: exercise/diet reduce death risk
    if (life.healthyHabits) { deathP *= 0.7; }
    if (rchance(deathP)) { return lifeDie(life.age >= 70 ? "old age" : "a sudden illness"); }
    if (life.stats.health <= 0) { return lifeDie("failing health"); }
    lifeClamp();
    lifeSave();
    lifeRender();
    lifeRenderPanel();
    lifeMaybeEvent();
  }
  /* ----- death ----- */
  function lifeRibbon() {
    var nw = lifeNetWorth();
    if (life.age >= 95) { return "Geriatric"; }
    if (life.kids.length >= 4) { return "Fertile"; }
    if (nw >= 2000000) { return "Rich"; }
    if (life.fame >= 70) { return "Famous"; }
    if (life.jailTotal >= 8) { return "Criminal"; }
    if (life.edu.gradDegree) { return "Academic"; }
    if (life.age < 25) { return "Unlucky"; }
    if (!life.job && !life.retired && life.age >= 35) { return "Lazy"; }
    if (nw >= 500000) { return "Successful"; }
    if (life.age >= 85) { return "Long-lived"; }
    return "Unremarkable";
  }
  function lifeDie(cause) {
    life.dead = true;
    life.stats.health = 0;
    var nw = lifeNetWorth();
    var ribbon = lifeRibbon();
    lifeLog("died of " + cause + " at age " + life.age + ".");
    lifeSave();
    document.getElementById("life-start").className = "hidden";
    document.getElementById("life-game").className = "hidden";
    document.getElementById("life-dead").className = "";
    document.getElementById("life-dead-title").textContent = life.name + " — " + ribbon;
    var kids = life.kids.length;
    var career = life.job ? life.job.title : (life.retired ? "retiree" : "unemployed");
    document.getElementById("life-dead-summary").textContent =
      "lived to " + life.age + ", died of " + cause + ". net worth " + fmtMoney(nw) +
      ", worked as " + career + ", had " + kids + " kid" + (kids === 1 ? "" : "s") +
      ", generation " + life.gen + ". ribbon: " + ribbon + ".";
    var dead = document.getElementById("life-dead");
    var old = document.getElementById("life-cont-btn");
    if (old) { dead.removeChild(old); }
    var adultKids = [];
    for (var i = 0; i < life.kids.length; i++) { if (life.kids[i].age >= 0) { adultKids.push(life.kids[i]); } }
    if (adultKids.length) {
      var cb = document.createElement("button");
      cb.id = "life-cont-btn";
      cb.textContent = "continue as my child";
      cb.onclick = function () {
        var kid = adultKids[ri(adultKids.length - 1)];
        var share = Math.round(Math.max(0, nw) / adultKids.length);
        lifeClear();
        lifeNewLife(kid.name, { money: share, gen: life.gen + 1 });
      };
      dead.insertBefore(cb, document.getElementById("life-again-btn"));
    }
  }
  document.getElementById("life-again-btn").onclick = function () {
    askConfirm("Start a new life? Your current one will be lost.", function () {
      life = null;
      lifeClear();
      showLifeStart();
    });
  };
  document.getElementById("life-new-btn").onclick = function () {
    askConfirm("Start a new life? Your current one will be lost.", function () {
      life = null;
      lifeClear();
      showLifeStart();
    });
  };
  document.getElementById("life-home-btn").onclick = goHome;

  /* ----- jobs ----- */
  var LIFE_JOBS = [
    { t: "Retail Worker", s: 22000, sm: 0, deg: 0 },
    { t: "Barista", s: 24000, sm: 0, deg: 0 },
    { t: "Waiter", s: 26000, sm: 0, deg: 0 },
    { t: "Delivery Driver", s: 29000, sm: 0, deg: 0 },
    { t: "Factory Worker", s: 33000, sm: 10, deg: 0 },
    { t: "Chef", s: 40000, sm: 20, deg: 0 },
    { t: "Photographer", s: 38000, sm: 20, deg: 0 },
    { t: "Plumber", s: 52000, sm: 40, deg: 0 },
    { t: "Electrician", s: 56000, sm: 40, deg: 0 },
    { t: "Police Officer", s: 58000, sm: 45, deg: 0 },
    { t: "Firefighter", s: 54000, sm: 40, deg: 0 },
    { t: "Real Estate Agent", s: 60000, sm: 45, deg: 0 },
    { t: "Writer", s: 48000, sm: 55, deg: 0 },
    { t: "Teacher", s: 47000, sm: 50, deg: 1 },
    { t: "Nurse", s: 70000, sm: 55, deg: 1 },
    { t: "Accountant", s: 68000, sm: 60, deg: 1 },
    { t: "Engineer", s: 88000, sm: 70, deg: 1 },
    { t: "Software Developer", s: 98000, sm: 70, deg: 1 },
    { t: "Pilot", s: 92000, sm: 65, deg: 1 },
    { t: "Executive", s: 115000, sm: 70, deg: 1, minAge: 30 },
    { t: "Lawyer", s: 125000, sm: 75, deg: 2 },
    { t: "Doctor", s: 185000, sm: 85, deg: 2 },
    { t: "Surgeon", s: 260000, sm: 92, deg: 2 },
    { t: "Actor", s: 65000, sm: 20, deg: 0, looks: 60, fame: true },
    { t: "Musician", s: 58000, sm: 20, deg: 0, fame: true },
    { t: "Pro Athlete", s: 120000, sm: 15, deg: 0, health: 70, fame: true }
  ];
  function lifeJobOK(j) {
    if (life.stats.smarts < j.sm) { return false; }
    if (j.deg === 1 && !life.edu.degree) { return false; }
    if (j.deg === 2 && !life.edu.gradDegree) { return false; }
    if (j.looks && life.stats.looks < j.looks) { return false; }
    if (j.health && life.stats.health < j.health) { return false; }
    if (j.minAge && life.age < j.minAge) { return false; }
    return true;
  }
  function lifeFindJob(panel) {
    panel.appendChild(lifeP("pick a job:"));
    var shown = 0;
    var order = [];
    for (var i = 0; i < LIFE_JOBS.length; i++) { order.push(i); }
    for (var k = order.length - 1; k > 0; k--) { var r = ri(k); var tmp = order[k]; order[k] = order[r]; order[r] = tmp; }
    for (var q = 0; q < order.length && shown < 8; q++) {
      (function (j) {
        if (!lifeJobOK(j)) { return; }
        shown++;
        lifeMkBtn(panel, j.t + " — " + fmtMoney(j.s) + "/yr", function () {
          life.job = { title: j.t, salary: j.s + rrange(-3000, 3000), perf: 50, yrs: 0, fameJob: !!j.fame };
          life.retired = false;
          lifeLog("became a " + j.t + ".");
          life.stats.happy += 5;
          lifeAfterAction();
        });
      })(LIFE_JOBS[order[q]]);
    }
    if (!shown) { panel.appendChild(lifeP("no jobs match you. study up or get a degree!")); }
  }
  /* ----- panels ----- */
  function lifeRenderPanel() {
    var panel = document.getElementById("life-panel");
    panel.innerHTML = "";
    if (!life || life.dead) { return; }
    if (life.jail > 0) { return lifePanelPrison(panel); }
    if (lifePanelName === "school") { return lifePanelSchool(panel); }
    if (lifePanelName === "assets") { return lifePanelAssets(panel); }
    if (lifePanelName === "love") { return lifePanelLove(panel); }
    if (lifePanelName === "family") { return lifePanelFamily(panel); }
    if (lifePanelName === "social") { return lifePanelSocial(panel); }
    if (lifePanelName === "body") { return lifePanelBody(panel); }
    if (lifePanelName === "crime") { return lifePanelCrime(panel); }
    if (lifePanelName === "fun") { return lifePanelFun(panel); }
  }
  function lifePanelPrison(panel) {
    panel.appendChild(lifeP("prison life. " + life.jail + " years left."));
    lifeMkBtn(panel, "behave", function () {
      if (rchance(0.3) && life.jail > 1) { life.jail--; lifeLog("got time shaved off for good behavior."); }
      else { lifeLog("kept their head down."); }
      lifeAfterAction();
    });
    lifeMkBtn(panel, "start a riot", function () {
      if (rchance(0.5)) { life.jail += 2; life.stats.health -= 15; lifeLog("started a riot. +2 years."); }
      else { life.stats.happy += 10; lifeLog("started a riot and got away with it."); }
      lifeAfterAction();
    });
    lifeMkBtn(panel, "work out", function () {
      life.stats.health += 5; life.stats.happy += 3;
      lifeLog("worked out in the yard.");
      lifeAfterAction();
    });
  }
  function lifePanelSchool(panel) {
    if (life.age < 18) {
      panel.appendChild(lifeP("school days."));
      lifeMkBtn(panel, "study harder", function () {
        life.stats.smarts += rrange(2, 6); life.stats.happy -= 3;
        lifeLog("studied hard.");
        lifeAfterAction();
      });
      lifeMkBtn(panel, "library", function () {
        life.stats.smarts += rrange(1, 4); life.stats.happy += 1;
        lifeLog("hung out at the library.");
        lifeAfterAction();
      });
      lifeMkBtn(panel, "skip school", function () {
        life.stats.smarts -= 3; life.stats.happy += 6;
        lifeLog("skipped school.");
        if (rchance(0.2)) { life.stats.happy -= 10; lifeLog("got caught skipping. grounded!"); }
        lifeAfterAction();
      });
      return;
    }
    var edu = life.edu;
    if (!edu.degree && edu.college === 0 && !edu.dropped) {
      panel.appendChild(lifeP("what's next after high school?"));
      lifeMkBtn(panel, "go to college ($25k/yr)", function () {
        lifePayTuition(25000, function () {
          edu.college = 1;
          lifeLog("started college.");
          lifeAfterAction();
        });
      });
      lifeMkBtn(panel, "skip college", function () {
        edu.dropped = true;
        lifeLog("skipped college.");
        lifeAfterAction();
      });
      return;
    }
    if (edu.college > 0 && !edu.degree) {
      panel.appendChild(lifeP("college, year " + edu.college + " of 4."));
      lifeMkBtn(panel, "study hard", function () {
        life.stats.smarts += rrange(2, 5);
        lifeLog("studied hard in college.");
        lifeAfterAction();
      });
      lifeMkBtn(panel, "party", function () {
        life.stats.happy += 8; life.stats.smarts -= 2;
        lifeLog("partied in college.");
        lifeAfterAction();
      });
      lifeMkBtn(panel, "drop out", function () {
        edu.college = 0; edu.dropped = true;
        lifeLog("dropped out of college.");
        life.stats.happy -= 5;
        lifeAfterAction();
      });
      return;
    }
    if (edu.degree && !edu.gradDegree && edu.grad === 0) {
      panel.appendChild(lifeP("degree in " + edu.degree + ". grad school?"));
      lifeMkBtn(panel, "grad school ($30k/yr)", function () {
        lifePayTuition(30000, function () {
          edu.grad = 1;
          lifeLog("started grad school.");
          lifeAfterAction();
        });
      });
    }
    if (edu.grad > 0 && !edu.gradDegree) {
      panel.appendChild(lifeP("grad school, year " + edu.grad + " of 2."));
    }
    if (life.retired) {
      panel.appendChild(lifeP("retired. enjoying the good life."));
      return;
    }
    if (!life.job) {
      lifeFindJob(panel);
    } else {
      panel.appendChild(lifeP(life.job.title + " — " + fmtMoney(life.job.salary) + "/yr, " + life.job.yrs + " yrs."));
      lifeMkBtn(panel, "work hard", function () {
        life.job.perf = Math.min(100, life.job.perf + rrange(8, 18));
        life.stats.happy -= 4; life.stats.health -= 2;
        lifeLog("worked hard.");
        lifeAfterAction();
      });
      lifeMkBtn(panel, "ask for raise", function () {
        if (life.job.perf >= 60) {
          var r = Math.round(life.job.salary * rrange(3, 8) / 100);
          life.job.salary += r;
          lifeLog("got a raise of " + fmtMoney(r) + "!");
          life.stats.happy += 6;
        } else {
          life.job.perf -= 10;
          lifeLog("was denied a raise.");
          life.stats.happy -= 6;
        }
        lifeAfterAction();
      });
      lifeMkBtn(panel, "quit", function () {
        lifeLog("quit as " + life.job.title + ".");
        life.job = null;
        life.stats.happy += 3;
        lifeAfterAction();
      });
      if (life.age >= 60) {
        lifeMkBtn(panel, "retire", function () {
          life.pension = Math.round((life.job ? life.job.salary : 20000) * 0.3);
          lifeLog("retired with a " + fmtMoney(life.pension) + "/yr pension.");
          life.job = null;
          life.retired = true;
          life.stats.happy += 10;
          lifeAfterAction();
        });
      }
    }
  }
  function lifePayTuition(cost, done) {
    if (life.money >= cost) { life.money -= cost; }
    else {
      var short = cost - life.money;
      life.money = 0;
      life.loans += short;
      lifeLog("took a " + fmtMoney(short) + " student loan.");
    }
    done();
  }
  var LIFE_SHOP = [
    { name: "bike", kind: "bike", cost: 300 },
    { name: "car", kind: "car", cost: 15000 },
    { name: "sports car", kind: "car", cost: 80000 },
    { name: "boat", kind: "boat", cost: 60000 },
    { name: "jewelry", kind: "jewelry", cost: 5000 },
    { name: "art", kind: "art", cost: 25000 },
    { name: "house", kind: "house", cost: 150000 },
    { name: "mansion", kind: "mansion", cost: 1000000 }
  ];
  function lifePanelAssets(panel) {
    panel.appendChild(lifeP("net worth: " + fmtMoney(lifeNetWorth())));
    panel.appendChild(lifeP("buy:"));
    for (var i = 0; i < LIFE_SHOP.length; i++) {
      (function (item) {
        lifeMkBtn(panel, item.name + " — " + fmtMoney(item.cost), function () {
          if (life.money < item.cost) { lifeLog("couldn't afford a " + item.name + "."); lifeRender(); return; }
          life.money -= item.cost;
          life.assets.push({ name: item.name, kind: item.kind, value: item.cost });
          life.stats.happy += 6;
          lifeLog("bought a " + item.name + ".");
          lifeAfterAction();
        });
      })(LIFE_SHOP[i]);
    }
    if (life.assets.length) {
      panel.appendChild(lifeP("sell:"));
      for (var j = life.assets.length - 1; j >= 0; j--) {
        (function (idx) {
          var a = life.assets[idx];
          var price = Math.round(a.value * 0.9);
          lifeMkBtn(panel, "sell " + a.name + " (+" + fmtMoney(price) + ")", function () {
            life.assets.splice(idx, 1);
            life.money += price;
            lifeLog("sold the " + a.name + ".");
            lifeAfterAction();
          });
        })(j);
      }
    }
  }

  /* ----- love ----- */
  function lifeNewPartner() {
    var g = rchance(0.5);
    return {
      name: g ? lifeGirlName() : lifeBoyName(),
      age: Math.max(18, life.age + rrange(-4, 4)),
      looks: rrange(20, 100),
      rel: rrange(40, 70),
      married: false
    };
  }
  function lifeAddKid() {
    var nm = lifeRandName();
    life.kids.push({ name: nm, age: 0, rel: rrange(50, 80) });
    lifeLog("had a baby: " + nm + ".");
  }
  function lifePanelLove(panel) {
    if (life.age < 16) {
      panel.appendChild(lifeP("too young for love. focus on school!"));
      return;
    }
    if (!life.partner) {
      lifeMkBtn(panel, "find love", function () {
        life.partner = lifeNewPartner();
        life.stats.happy += 10;
        lifeLog("started dating " + life.partner.name + ".");
        lifeAfterAction();
      });
      return;
    }
    var p = life.partner;
    panel.appendChild(lifeP(p.name + ", " + p.age + " — love " + p.rel + "%" + (p.married ? " (married)" : "")));
    lifeMkBtn(panel, "spend time", function () {
      p.rel = Math.min(100, p.rel + rrange(3, 8));
      life.stats.happy += 5;
      lifeLog("spent time with " + p.name.split(" ")[0] + ".");
      lifeAfterAction();
    });
    lifeMkBtn(panel, "compliment", function () {
      p.rel = Math.min(100, p.rel + rrange(2, 6));
      life.stats.happy += 2;
      lifeLog("complimented " + p.name.split(" ")[0] + ".");
      lifeAfterAction();
    });
    lifeMkBtn(panel, "give gift ($500)", function () {
      if (life.money < 500) { lifeLog("couldn't afford a gift."); lifeRender(); return; }
      life.money -= 500;
      p.rel = Math.min(100, p.rel + rrange(5, 12));
      life.stats.happy += 4;
      lifeLog("gave " + p.name.split(" ")[0] + " a gift.");
      lifeAfterAction();
    });
    lifeMkBtn(panel, "argue", function () {
      p.rel -= rrange(5, 15);
      life.stats.happy -= 5;
      lifeLog("argued with " + p.name.split(" ")[0] + ".");
      if (p.rel <= 0) {
        lifeLog("broke up with " + p.name + ".");
        life.partner = null;
        life.stats.happy -= 15;
      }
      lifeAfterAction();
    });
    if (!p.married) {
      lifeMkBtn(panel, "propose", function () {
        if (p.rel >= 70) {
          p.married = true;
          p.rel = 100;
          life.money = Math.max(0, life.money - 5000);
          life.stats.happy += 20;
          lifeLog("married " + p.name + "!");
        } else {
          lifeLog(p.name.split(" ")[0] + " said no...");
          life.stats.happy -= 15;
          p.rel -= 10;
        }
        lifeAfterAction();
      });
    }
    if (life.age >= 18 && life.age <= 50) {
      lifeMkBtn(panel, "have a baby", function () {
        if (p.rel < 40) { lifeLog(p.name.split(" ")[0] + " isn't ready for a baby."); lifeRender(); return; }
        lifeAddKid();
        life.stats.happy += 12;
        p.rel += 5;
        lifeAfterAction();
      });
    }
    lifeMkBtn(panel, p.married ? "divorce" : "break up", function () {
      if (p.married && life.money > 0) {
        var loss = Math.round(life.money * 0.3);
        life.money -= loss;
        lifeLog("divorced " + p.name + ". Lost " + fmtMoney(loss) + ".");
      } else {
        lifeLog("broke up with " + p.name + ".");
      }
      life.partner = null;
      life.stats.happy -= 20;
      lifeAfterAction();
    });
    if (life.kids.length) {
      panel.appendChild(lifeP("kids:"));
      for (var i = 0; i < life.kids.length; i++) {
        (function (idx) {
          var k = life.kids[idx];
          var row = document.createElement("p");
          row.style.fontSize = "17px";
          row.textContent = k.name + ", " + k.age + " — love " + k.rel + "%";
          panel.appendChild(row);
          lifeMkBtn(panel, "time with " + k.name.split(" ")[0], function () {
            k.rel = Math.min(100, k.rel + rrange(3, 8));
            life.stats.happy += 4;
            lifeLog("spent time with " + k.name.split(" ")[0] + ".");
            lifeAfterAction();
          });
          lifeMkBtn(panel, "discipline " + k.name.split(" ")[0], function () {
            k.rel = Math.max(0, k.rel - rrange(3, 8));
            life.stats.happy -= 2;
            lifeLog("disciplined " + k.name.split(" ")[0] + ".");
            lifeAfterAction();
          });
        })(i);
      }
    }
  }
  /* ----- family ----- */
  function lifeRelRow(panel, person, label, onSpend, extra) {
    var row = document.createElement("p");
    row.style.fontSize = "17px";
    row.textContent = label + ": " + person.name + (person.age !== undefined ? ", " + person.age : "") +
      (person.alive === false ? " (deceased)" : "") + " — love " + person.rel + "%";
    panel.appendChild(row);
    if (person.alive === false) { return; }
    lifeMkBtn(panel, "spend time", function () {
      person.rel = Math.min(100, person.rel + rrange(3, 8));
      life.stats.happy += 4;
      lifeLog("spent time with " + person.name.split(" ")[0] + ".");
      if (onSpend) { onSpend(); }
      lifeAfterAction();
    });
    if (extra) { extra(); }
  }
  function lifePanelFamily(panel) {
    var i;
    panel.appendChild(lifeP("parents:"));
    for (i = 0; i < life.parents.length; i++) {
      (function (par) {
        lifeRelRow(panel, par, par.dad ? "dad" : "mom", null, function () {
          if (par.alive && life.age <= 30) {
            lifeMkBtn(panel, "ask for money", function () {
              if (rchance(0.5 + par.rel / 200)) {
                var amt = rrange(500, 5000);
                life.money += amt;
                lifeLog(par.name.split(" ")[0] + " gave " + fmtMoney(amt) + ".");
                life.stats.happy += 3;
              } else {
                lifeLog(par.name.split(" ")[0] + " said no.");
                life.stats.happy -= 3;
                par.rel -= 3;
              }
              lifeAfterAction();
            });
          }
        });
      })(life.parents[i]);
    }
    if (life.siblings.length) {
      panel.appendChild(lifeP("siblings:"));
      for (i = 0; i < life.siblings.length; i++) {
        (function (sib) {
          lifeRelRow(panel, sib, "sibling", null, function () {
            lifeMkBtn(panel, "argue", function () {
              sib.rel = Math.max(0, sib.rel - rrange(5, 12));
              life.stats.happy -= 3;
              lifeLog("fought with " + sib.name.split(" ")[0] + ".");
              lifeAfterAction();
            });
          });
        })(life.siblings[i]);
      }
    } else {
      panel.appendChild(lifeP("no siblings. only child energy."));
    }
  }
  /* ----- social ----- */
  function lifePanelSocial(panel) {
    lifeMkBtn(panel, "make a friend", function () {
      if (life.friends.length >= 8) { lifeLog("enough friends already."); lifeRender(); return; }
      var f = { name: lifeRandName(), age: Math.max(5, life.age + rrange(-5, 5)), rel: rrange(30, 60) };
      life.friends.push(f);
      life.stats.happy += 6;
      lifeLog("became friends with " + f.name + ".");
      lifeAfterAction();
    });
    for (var i = 0; i < life.friends.length; i++) {
      (function (idx) {
        var f = life.friends[idx];
        var row = document.createElement("p");
        row.style.fontSize = "17px";
        row.textContent = f.name + ", " + f.age + " — bond " + f.rel + "%";
        panel.appendChild(row);
        lifeMkBtn(panel, "hang out", function () {
          f.rel = Math.min(100, f.rel + rrange(3, 8));
          life.stats.happy += 6;
          lifeLog("hung out with " + f.name.split(" ")[0] + ".");
          lifeAfterAction();
        });
        lifeMkBtn(panel, "party ($200)", function () {
          if (life.money < 200) { lifeLog("couldn't afford to party."); lifeRender(); return; }
          life.money -= 200;
          f.rel = Math.min(100, f.rel + 8);
          life.stats.happy += 10;
          lifeLog("partied with " + f.name.split(" ")[0] + ".");
          if (rchance(0.1)) { life.stats.health -= 5; lifeLog("partied a little too hard."); }
          lifeAfterAction();
        });
        lifeMkBtn(panel, "insult", function () {
          f.rel -= rrange(10, 25);
          lifeLog("insulted " + f.name.split(" ")[0] + ".");
          if (f.rel <= 0) {
            life.friends.splice(idx, 1);
            lifeLog(f.name + " is no longer a friend.");
            life.stats.happy -= 8;
          }
          lifeAfterAction();
        });
      })(i);
    }
    panel.appendChild(lifeP("pets:"));
    lifeMkBtn(panel, "adopt a pet", function () {
      var kind = rpick(LIFE_PET_KINDS);
      if (life.money < kind[2]) { lifeLog("couldn't afford a " + kind[0] + "."); lifeRender(); return; }
      life.money -= kind[2];
      var pet = { name: rpick(LIFE_PET_NAMES), kind: kind[0], age: 0, lifespan: kind[1] };
      life.pets.push(pet);
      life.stats.happy += 12;
      lifeLog("adopted " + pet.name + " the " + pet.kind + "!");
      lifeAfterAction();
    });
    for (var j = 0; j < life.pets.length; j++) {
      (function (pet) {
        var row = document.createElement("p");
        row.style.fontSize = "17px";
        row.textContent = pet.name + " the " + pet.kind + ", age " + pet.age;
        panel.appendChild(row);
        lifeMkBtn(panel, "play with " + pet.name, function () {
          life.stats.happy += 6;
          lifeLog("played with " + pet.name + ".");
          lifeAfterAction();
        });
      })(life.pets[j]);
    }
  }

  /* ----- mind & body ----- */
  function lifePanelBody(panel) {
    lifeMkBtn(panel, "doctor ($500)", function () {
      if (life.money < 500) { lifeLog("couldn't afford the doctor."); lifeRender(); return; }
      life.money -= 500;
      life.stats.health += rrange(8, 18);
      if (life.sick) {
        if (life.sick === "cancer" || life.sick === "heart disease") {
          if (life.money >= 50000) {
            life.money -= 50000;
            lifeLog("got treated for " + life.sick + ". cured!");
            life.sick = null;
            life.stats.health += 10;
          } else {
            lifeLog("can't afford treatment for " + life.sick + ".");
          }
        } else {
          lifeLog("the doctor cured the " + life.sick + ".");
          life.sick = null;
          life.stats.health += 10;
        }
      } else {
        lifeLog("got a checkup.");
      }
      lifeAfterAction();
    });
    lifeMkBtn(panel, "gym ($50)", function () {
      if (life.money < 50) { lifeLog("couldn't afford the gym."); lifeRender(); return; }
      life.money -= 50;
      life.stats.health += rrange(3, 8);
      life.stats.happy += 2;
      life.exercisedThisYear = true;
      lifeLog("hit the gym.");
      if (rchance(0.05)) { life.stats.health -= 8; lifeLog("pulled a muscle at the gym."); }
      lifeAfterAction();
    });
    lifeMkBtn(panel, "go for a walk", function () {
      life.stats.health += rrange(1, 4);
      life.stats.happy += rrange(1, 4);
      life.exercisedThisYear = true;
      lifeLog("went for a walk.");
      lifeAfterAction();
    });
    lifeMkBtn(panel, "meditate", function () {
      life.stats.happy += rrange(4, 9);
      lifeLog("meditated.");
      lifeAfterAction();
    });
    lifeMkBtn(panel, "study", function () {
      life.stats.smarts += rrange(2, 6);
      life.stats.happy -= 2;
      lifeLog("studied.");
      lifeAfterAction();
    });
    lifeMkBtn(panel, "library", function () {
      life.stats.smarts += rrange(1, 4);
      life.stats.happy += 1;
      lifeLog("read at the library.");
      lifeAfterAction();
    });
    lifeMkBtn(panel, "salon ($200)", function () {
      if (life.money < 200) { lifeLog("couldn't afford the salon."); lifeRender(); return; }
      life.money -= 200;
      life.stats.looks += rrange(4, 10);
      life.stats.happy += 4;
      lifeLog("got a makeover.");
      lifeAfterAction();
    });
    lifeMkBtn(panel, "plastic surgery ($8k)", function () {
      if (life.money < 8000) { lifeLog("couldn't afford surgery."); lifeRender(); return; }
      life.money -= 8000;
      if (rchance(0.85)) {
        life.stats.looks += rrange(8, 20);
        lifeLog("got plastic surgery. looking sharp!");
        life.stats.happy += 8;
      } else {
        life.stats.looks -= rrange(5, 15);
        life.stats.happy -= 15;
        lifeLog("the surgery was botched...");
      }
      lifeAfterAction();
    });
  }
  /* ----- crime ----- */
  function lifeDoCrime(name, reward, catchP, yrs) {
    if (rchance(catchP)) {
      var y = rrange(yrs[0], yrs[1]);
      life.jail = y;
      life.jailTotal += y;
      life.job = null;
      lifeLog("got caught " + name + ". sentenced to " + y + " years.");
      life.stats.happy -= 20;
    } else {
      var amt = rrange(reward[0], reward[1]);
      life.money += amt;
      life.stats.happy += 6;
      lifeLog("pulled off " + name + ". +" + fmtMoney(amt) + ".");
      if (rchance(0.15)) { life.stats.happy -= 8; lifeLog("feels guilty about it."); }
    }
    lifeAfterAction();
  }
  function lifePanelCrime(panel) {
    panel.appendChild(lifeP("crime doesn't pay... unless it does."));
    lifeMkBtn(panel, "pickpocket", function () { lifeDoCrime("a pickpocket", [50, 300], 0.15, [1, 2]); });
    lifeMkBtn(panel, "shoplift", function () { lifeDoCrime("a shoplifting", [100, 600], 0.12, [1, 2]); });
    lifeMkBtn(panel, "burglary", function () { lifeDoCrime("a burglary", [2000, 10000], 0.25, [2, 4]); });
    lifeMkBtn(panel, "steal a car", function () { lifeDoCrime("a car theft", [5000, 20000], 0.3, [3, 5]); });
    lifeMkBtn(panel, "rob a bank", function () { lifeDoCrime("a bank robbery", [20000, 100000], 0.45, [5, 10]); });
  }
  /* ----- fun ----- */
  function lifePanelFun(panel) {
    lifeMkBtn(panel, "movies ($20)", function () {
      if (life.money < 20) { lifeLog("couldn't afford the movies."); lifeRender(); return; }
      life.money -= 20;
      life.stats.happy += rrange(4, 8);
      lifeLog("went to the movies.");
      lifeAfterAction();
    });
    lifeMkBtn(panel, "vacation ($2,000)", function () {
      if (life.money < 2000) { lifeLog("couldn't afford a vacation."); lifeRender(); return; }
      life.money -= 2000;
      life.stats.happy += rrange(10, 20);
      lifeLog("went on vacation!");
      if (rchance(0.05)) { life.stats.health -= 10; lifeLog("got food poisoning on vacation."); }
      lifeAfterAction();
    });
    lifeMkBtn(panel, "buy lottery ticket ($10)", function () {
      if (life.money < 10) { lifeLog("couldn't afford a ticket."); lifeRender(); return; }
      life.money -= 10;
      if (rchance(0.02)) {
        var win = rrange(50000, 500000);
        life.money += win;
        life.stats.happy += 25;
        lifeLog("WON THE LOTTERY! +" + fmtMoney(win) + "!!!");
      } else if (rchance(0.1)) {
        life.money += 100;
        lifeLog("won $100 on a scratcher.");
      } else {
        lifeLog("lost the lottery. again.");
        life.stats.happy -= 2;
      }
      lifeAfterAction();
    });
    lifeMkBtn(panel, "casino ($500 bet)", function () {
      if (life.money < 500) { lifeLog("couldn't afford the casino."); lifeRender(); return; }
      life.money -= 500;
      if (rchance(0.45)) {
        life.money += 1000;
        life.stats.happy += 10;
        lifeLog("won $1,000 at the casino!");
      } else {
        life.stats.happy -= 6;
        lifeLog("lost $500 at the casino.");
      }
      lifeAfterAction();
    });
    lifeMkBtn(panel, "post on social media", function () {
      var gain = rrange(0, 500);
      life.fame = Math.min(100, life.fame + gain / 200);
      life.stats.happy += 3;
      if (gain > 400) {
        lifeLog("a post went viral! +" + gain + " followers.");
        life.stats.happy += 8;
      } else {
        lifeLog("posted on social media. +" + gain + " followers.");
      }
      if (life.fame >= 50 && rchance(0.3)) {
        var deal = rrange(5000, 30000);
        life.money += deal;
        lifeLog("landed a sponsorship deal! +" + fmtMoney(deal) + ".");
      }
      lifeAfterAction();
    });
  }

  /* ----- events ----- */
  function LEV(min, max, text, choices, req, when) {
    return { min: min, max: max, text: text, choices: choices, req: req, when: when };
  }
  function CH(t, e, log, doFn) {
    return { t: t, e: e, log: log, do: doFn };
  }
  var LIFE_EVENTS = [
    // childhood
    LEV(4, 12, "You found $20 on the ground!", [
      CH("take it", { happy: 5, money: 20 }, "found $20."),
      CH("leave it", { happy: 3 }, "left $20 on the ground. what a saint.") ]),
    LEV(5, 10, "You lost a tooth!", [
      CH("tooth fairy!", { happy: 5, money: 5 }, "lost a tooth. $5!") ]),
    LEV(6, 14, "A bully is picking on you at school.", [
      CH("fight back", { happy: 6, health: -8 }, "fought the bully.", function () { if (rchance(0.3)) { life.stats.health -= 10; lifeLog("got beat up."); } }),
      CH("tell a teacher", { happy: 2 }, "told on the bully."),
      CH("cry", { happy: -6 }, "cried about the bully.") ]),
    LEV(3, 10, "You caught the chicken pox.", [
      CH("ugh", { health: -10, happy: -5 }, "had chicken pox.") ]),
    LEV(4, 12, "You ate WAY too much candy.", [
      CH("worth it", { happy: 8, health: -6 }, "ate too much candy.") ]),
    LEV(4, 9, "You have an imaginary friend named Blorp.", [
      CH("best friends", { happy: 8 }, "hung out with Blorp.") ]),
    LEV(5, 15, "Your parents are fighting.", [
      CH("hide in room", { happy: -8 }, "hid while parents fought.") ]),
    LEV(6, 14, "Report card day! You got straight A's.", [
      CH("yay!", { happy: 10, smarts: 3 }, "got straight A's!") ]),
    LEV(5, 12, "You fell off your bike and scraped your knee.", [
      CH("walk it off", { health: -5 }, "fell off a bike.") ]),
    LEV(6, 12, "You found a stray puppy following you home.", [
      CH("keep him!", { happy: 15 }, "adopted a stray puppy.", function () { life.pets.push({ name: rpick(LIFE_PET_NAMES), kind: "dog", age: 0, lifespan: 13 }); }),
      CH("leave it", { happy: -5 }, "left a stray puppy. cold.") ]),
    // teen
    LEV(13, 17, "You woke up with a huge zit on picture day.", [
      CH("pop it", { looks: -5, happy: -3 }, "had a bad zit.") ]),
    LEV(13, 17, "You have a massive crush on someone.", [
      CH("confess", { happy: 10 }, "confessed a crush!", function () { if (rchance(0.4)) { lifeLog("got rejected. ouch."); life.stats.happy -= 15; } else { lifeLog("the crush likes you back!"); } }),
      CH("keep it secret", { happy: -2 }, "kept a crush secret.") ]),
    LEV(14, 17, "You're invited to a wild party.", [
      CH("go!", { happy: 12, health: -4 }, "went to a wild party.", function () { if (rchance(0.2)) { lifeLog("got caught. grounded!"); life.stats.happy -= 10; } }),
      CH("stay home", { happy: -4, smarts: 2 }, "skipped the party.") ]),
    LEV(13, 17, "Big exam tomorrow and you haven't studied.", [
      CH("cram all night", { smarts: 5, health: -5 }, "crammed for an exam."),
      CH("wing it", { smarts: -3 }, "winged an exam.", function () { if (rchance(0.5)) { lifeLog("failed the exam."); life.stats.happy -= 8; } }) ]),
    LEV(14, 17, "Some kid offers you a cigarette behind the school.", [
      CH("sure", { health: -8 }, "smoked. gross.", function () { if (rchance(0.3)) { lifeLog("got caught smoking. grounded!"); } }),
      CH("no way", { smarts: 2, happy: 2 }, "turned down a cigarette.") ]),
    LEV(13, 17, "You're grounded for a month.", [
      CH("ughhh", { happy: -10 }, "got grounded.") ]),
    LEV(14, 17, "You had your first kiss!", [
      CH("magical", { happy: 15 }, "had a first kiss!") ]),
    LEV(13, 19, "A video of you doing something dumb went viral at school.", [
      CH("lean into it", { happy: 5 }, "went viral at school.", function () { life.fame = Math.min(100, life.fame + 5); }),
      CH("hide forever", { happy: -8 }, "was embarrassed at school.") ]),
    LEV(12, 16, "Growth spurt! You're suddenly tall.", [
      CH("nice", { looks: 5, happy: 5 }, "hit a growth spurt.") ]),
    // college years
    LEV(18, 24, "You pulled an all-nighter before finals.", [
      CH("coffee IV", { smarts: 5, health: -8 }, "pulled an all-nighter.") ], "college"),
    LEV(18, 24, "Spring break! Everyone's going to the beach.", [
      CH("go! ($1,000)", { happy: 15 }, "went wild for spring break.", function () { life.money = Math.max(0, life.money - 1000); }),
      CH("stay and study", { smarts: 4, happy: -3 }, "skipped spring break.") ], "college"),
    LEV(18, 24, "Your roommate ate your leftovers. AGAIN.", [
      CH("confront them", { happy: 3 }, "confronted a roommate."),
      CH("let it go", { happy: -3 }, "let the roommate slide.") ], "college"),
    // jobs
    LEV(18, 65, "Your boss is impressed with you!", [
      CH("keep it up", { happy: 5 }, "impressed the boss.", function () { life.job.salary = Math.round(life.job.salary * 1.15); }) ], "job"),
    LEV(18, 65, "The company is doing layoffs...", [
      CH("oh no", { happy: -10 }, "got laid off.", function () { life.job = null; }) ], "job"),
    LEV(18, 65, "A coworker took credit for your work.", [
      CH("confront them", { happy: 4 }, "confronted a credit-stealing coworker.", function () { life.job.perf += 5; }),
      CH("let it go", { happy: -4 }, "let a coworker take credit.") ], "job"),
    LEV(18, 65, "Holiday bonus season!", [
      CH("cha-ching", { happy: 8 }, "got a holiday bonus.", function () { var b = Math.round(life.job.salary * 0.05); life.money += b; lifeLog("bonus: " + fmtMoney(b) + "."); }) ], "job"),
    LEV(18, 50, "A cute coworker keeps flirting with you.", [
      CH("flirt back", { happy: 8 }, "started an office romance.", function () { if (!life.partner) { life.partner = lifeNewPartner(); } }),
      CH("not interested", { happy: 0 }, "shut down an office romance.") ], "job"),
    LEV(18, 65, "You hurt yourself at work.", [
      CH("ouch", { health: -10 }, "got hurt at work.", function () { var c = rrange(2000, 8000); life.money += c; lifeLog("workers comp: " + fmtMoney(c) + "."); }) ], "job"),
    LEV(18, 65, "The company wants to relocate you across the country.", [
      CH("new adventure!", { happy: -5 }, "relocated for work.", function () { life.job.salary = Math.round(life.job.salary * 1.2); lifeLog("got a relocation raise!"); }),
      CH("stay put", { happy: 2 }, "declined a relocation.") ], "job"),
    LEV(20, 60, "A rival company is headhunting you with a big offer.", [
      CH("take it!", { happy: 10 }, "jumped to a rival company.", function () { life.job.salary = Math.round(life.job.salary * 1.3); life.job.title = "Sr. " + life.job.title.replace(/^Sr\. /, ""); }),
      CH("stay loyal", { happy: 3 }, "stayed loyal.", function () { life.job.perf += 10; }) ], "job"),
    // money
    LEV(18, 99, "Your great-aunt left you something in her will.", [
      CH("thank you auntie", { happy: 10 }, "inherited from a great-aunt.", function () { var w = rrange(5000, 60000); life.money += w; lifeLog("inherited " + fmtMoney(w) + "."); }) ]),
    LEV(13, 99, "Someone is trying to mug you in a dark alley!", [
      CH("hand it over", { happy: -8 }, "got mugged.", function () { var l = Math.min(life.money, rrange(100, 2000)); life.money -= l; lifeLog("lost " + fmtMoney(l) + "."); }),
      CH("fight!", { health: -12, happy: 5 }, "fought off a mugger.", function () { if (rchance(0.4)) { var l2 = Math.min(life.money, rrange(100, 2000)); life.money -= l2; lifeLog("lost the fight and " + fmtMoney(l2) + "."); } }) ]),
    LEV(10, 99, "You found a wallet with $500 in it.", [
      CH("keep it", { happy: 5, money: 500 }, "kept a lost wallet."),
      CH("return it", { happy: 10 }, "returned a lost wallet.", function () { if (rchance(0.5)) { life.money += 50; lifeLog("got a $50 reward!"); } }) ]),
    LEV(18, 99, "You're being audited. The IRS wants their cut.", [
      CH("pay up", { happy: -8 }, "got audited.", function () { var t = Math.min(life.money, rrange(2000, 15000)); life.money -= t; lifeLog("paid " + fmtMoney(t) + " in taxes."); }) ]),
    LEV(18, 99, "A friend has a can't-miss stock tip.", [
      CH("invest $5k", { happy: 0 }, "took a stock tip.", function () {
        if (life.money < 5000) { lifeLog("couldn't afford to invest."); return; }
        life.money -= 5000;
        if (rchance(0.4)) { var w = rrange(8000, 25000); life.money += w; lifeLog("the stock MOONED! +" + fmtMoney(w) + "."); life.stats.happy += 10; }
        else { lifeLog("the stock tanked. rip $5k."); life.stats.happy -= 8; }
      }),
      CH("pass", { happy: 0 }, "passed on a stock tip.") ]),
    LEV(16, 99, "You scratched your car in a parking lot.", [
      CH("fix it ($800)", { happy: -3 }, "fixed a scratched car.", function () { life.money = Math.max(0, life.money - 800); }) ], "car"),
    // health
    LEV(5, 99, "You caught the flu.", [
      CH("rest up", { health: -8, happy: -4 }, "had the flu.", function () { life.sick = "the flu"; }) ]),
    LEV(10, 99, "Street tacos at 2am seemed like a good idea.", [
      CH("regret", { health: -10 }, "got food poisoning.") ]),
    LEV(18, 99, "You discovered you're allergic to bees. The dramatic way.", [
      CH("epi-pen!", { health: -8 }, "discovered a bee allergy.") ]),
    LEV(20, 99, "A migraine is ruining your whole week.", [
      CH("dark room", { happy: -6, health: -4 }, "had a migraine.") ]),
    LEV(40, 99, "The doctor found something. It's cancer.", [
      CH("fight it ($50k)", { happy: -10 }, "was diagnosed with cancer.", function () {
        life.sick = "cancer";
        lifeLog("needs $50k treatment. check the doctor.");
      }),
      CH("ignore it", { happy: -5 }, "ignored a cancer diagnosis.", function () { life.sick = "cancer"; }) ]),
    LEV(50, 99, "Your chest feels tight. Heart problems run in the family.", [
      CH("see a doctor", { happy: -5 }, "had a heart scare.", function () { life.sick = "heart disease"; lifeLog("needs $50k treatment. check the doctor."); }) ]),
    LEV(30, 99, "Best checkup of your life! The doctor is amazed.", [
      CH("flex", { happy: 8, health: 5 }, "had a perfect checkup.") ]),
    // love
    LEV(18, 99, "Your partner wants a baby.", [
      CH("let's do it", { happy: 8 }, "had a baby.", function () { lifeAddKid(); }),
      CH("not yet", { happy: -3 }, "said not yet to a baby.", function () { if (life.partner) { life.partner.rel -= 5; } }) ], "partner"),
    LEV(18, 99, "Your partner forgot your anniversary.", [
      CH("forgive them", { happy: 2 }, "forgave a forgotten anniversary.", function () { if (life.partner) { life.partner.rel += 3; } }),
      CH("big fight", { happy: -8 }, "had a huge anniversary fight.", function () { if (life.partner) { life.partner.rel -= 12; } }) ], "partner"),
    LEV(18, 99, "You saw a suspicious text on your partner's phone.", [
      CH("confront them", { happy: -5 }, "confronted a partner about cheating.", function () {
        if (rchance(0.4)) { lifeLog("they WERE cheating. it's over."); life.partner = null; life.stats.happy -= 20; }
        else { lifeLog("it was just their cousin. awkward."); if (life.partner) { life.partner.rel -= 8; } }
      }),
      CH("let it go", { happy: -2 }, "ignored a suspicious text.") ], "partner"),
    LEV(18, 99, "Your partner's ex keeps texting them.", [
      CH("trust them", { happy: 3 }, "trusted a partner about their ex.", function () { if (life.partner) { life.partner.rel += 5; } }),
      CH("jealous fight", { happy: -6 }, "fought about the ex.", function () { if (life.partner) { life.partner.rel -= 10; } }) ], "partner"),
    LEV(16, 99, "Someone left a love note in your locker.", [
      CH("swoon", { happy: 10 }, "got a secret love note!") ], "single"),
    LEV(18, 99, "Your partner just got a huge promotion!", [
      CH("celebrate!", { happy: 10 }, "celebrated a partner's promotion.", function () { if (life.partner) { life.partner.rel += 8; } }) ], "partner"),
    LEV(20, 60, "Your partner got down on one knee!", [
      CH("YES!", { happy: 25 }, "got engaged!", function () { if (life.partner) { life.partner.married = true; life.partner.rel = 100; life.money = Math.max(0, life.money - 5000); } }),
      CH("not yet", { happy: -10 }, "turned down a proposal.", function () { if (life.partner) { life.partner.rel -= 20; } }) ], "partner", function () { return life.partner && !life.partner.married && life.partner.rel >= 75; }),
    // family
    LEV(10, 99, "Your mom isn't feeling well.", [
      CH("visit her", { happy: -3 }, "visited a sick mom.", function () { for (var i = 0; i < life.parents.length; i++) { if (!life.parents[i].dad && life.parents[i].alive) { life.parents[i].rel = Math.min(100, life.parents[i].rel + 10); } } }),
      CH("too busy", { happy: -2 }, "ignored a sick mom.", function () { for (var j = 0; j < life.parents.length; j++) { if (!life.parents[j].dad) { life.parents[j].rel -= 10; } } }) ], "parent"),
    LEV(12, 99, "Your sibling just won a big award and won't shut up about it.", [
      CH("congrats!", { happy: 5 }, "celebrated a sibling's award."),
      CH("whatever", { happy: -3 }, "was jealous of a sibling.") ], "sibling"),
    LEV(16, 99, "Your sibling needs to borrow $1,000.", [
      CH("help out", { happy: 3 }, "lent a sibling $1,000.", function () { life.money = Math.max(0, life.money - 1000); if (rchance(0.5)) { life.money += 1000; lifeLog("sibling paid you back!"); } }),
      CH("nope", { happy: -2 }, "refused a sibling money.") ], "sibling"),
    LEV(5, 99, "Family reunion! Awkward hugs for everyone.", [
      CH("have fun", { happy: 8 }, "went to a family reunion.") ], "parent"),
    // fame
    LEV(13, 99, "One of your posts is going viral!", [
      CH("ride the wave", { happy: 12 }, "went viral!", function () { life.fame = Math.min(100, life.fame + rrange(5, 20)); }) ]),
    LEV(30, 99, "A fan recognized you on the street and screamed.", [
      CH("selfie!", { happy: 10 }, "met a screaming fan.") ], "famous"),
    LEV(30, 99, "A tabloid made up a wild rumor about you.", [
      CH("no comment", { happy: -6 }, "was in a tabloid rumor.", function () { life.fame = Math.min(100, life.fame + 5); }) ], "famous"),
    // crime victim
    LEV(18, 99, "You woke up and your car is GONE.", [
      CH("call police", { happy: -10 }, "had a car stolen.", function () {
        for (var i = 0; i < life.assets.length; i++) {
          if (life.assets[i].kind === "car") { life.assets.splice(i, 1); break; }
        }
      }) ], "car"),
    LEV(18, 99, "Someone broke into your house while you were out.", [
      CH("file a report", { happy: -10 }, "was robbed!", function () { var l = Math.min(life.money, rrange(1000, 10000)); life.money -= l; lifeLog("lost " + fmtMoney(l) + "."); }) ], "house"),
    LEV(10, 99, "You felt a hand in your pocket. Your wallet is gone!", [
      CH("damn", { happy: -6 }, "got pickpocketed.", function () { var l = Math.min(life.money, rrange(50, 500)); life.money -= l; }) ]),
    // freak
    LEV(10, 99, "LIGHTNING just struck the tree next to you!", [
      CH("holy crap", { happy: 5 }, "survived a lightning strike!", function () {
        if (rchance(0.05)) { lifeDie("a lightning strike"); }
      }) ]),
    LEV(10, 60, "A shark is circling way too close at the beach!", [
      CH("SWIM!", { health: -10, happy: -5 }, "fled from a shark.", function () {
        if (rchance(0.1)) { life.stats.health -= 30; lifeLog("got nipped by the shark!"); }
      }) ]),
    LEV(1, 99, "Scientists say a meteor might hit your neighborhood today.", [
      CH("what are the odds", { happy: 0 }, "ignored a meteor warning.", function () {
        if (rchance(0.02)) { lifeDie("a freak meteor strike"); }
        else { lifeLog("the meteor missed. phew."); }
      }) ]),
    LEV(8, 99, "You stepped on a wasp nest. THE WHOLE NEST.", [
      CH("RUN", { health: -12, happy: -8 }, "got swarmed by wasps.") ]),
    // old age
    LEV(60, 99, "Your retirement party! They got you a cake shaped like a briefcase.", [
      CH("sweet freedom", { happy: 15 }, "had a retirement party.") ]),
    LEV(65, 99, "Bingo night at the community center.", [
      CH("B-12!", { happy: 8 }, "played bingo.", function () { if (rchance(0.2)) { life.money += 200; lifeLog("won $200 at bingo!"); } }) ]),
    LEV(50, 99, "The grandkids are visiting!", [
      CH("spoiler mode", { happy: 15 }, "spoiled the grandkids rotten.", function () { life.money = Math.max(0, life.money - 300); }) ], "kid"),
    LEV(65, 99, "A publisher wants you to write your memoir.", [
      CH("tell all ($20k)", { happy: 8 }, "wrote a memoir.", function () { life.money += 20000; }) ], "famous"),
    // misc
    LEV(10, 99, "You had the weirdest deja vu.", [
      CH("whoa", { happy: 3 }, "had deja vu.") ]),
    LEV(16, 99, "Your car got a flat tire in the rain.", [
      CH("fix it ($200)", { happy: -4 }, "fixed a flat tire.", function () { life.money = Math.max(0, life.money - 200); }) ], "car"),
    LEV(13, 99, "You are having the BEST hair day of your life.", [
      CH("strut", { looks: 5, happy: 8 }, "had an amazing hair day.") ]),
    LEV(13, 99, "The barber misunderstood 'a little off the top.'", [
      CH("hats for a month", { looks: -8, happy: -5 }, "got a terrible haircut.") ]),
    LEV(10, 99, "A stranger said you have a great smile.", [
      CH("aww", { happy: 6, looks: 2 }, "got complimented by a stranger.") ]),
    LEV(12, 99, "You're stuck in an elevator between floors.", [
      CH("stay calm", { happy: -5 }, "got stuck in an elevator.") ]),
    LEV(8, 99, "Double rainbow across the sky!!", [
      CH("what does it mean", { happy: 8 }, "saw a double rainbow!") ]),
    LEV(16, 99, "It's 4am and you cannot sleep.", [
      CH("stare at ceiling", { health: -5, happy: -4 }, "had insomnia.") ]),
    LEV(18, 99, "Your horoscope says today is YOUR day.", [
      CH("let's gooo", { happy: 5 }, "trusted a horoscope.", function () { if (rchance(0.3)) { life.money += rrange(100, 1000); lifeLog("the horoscope was right?!"); } }) ])
  ];
  function lifeMaybeEvent() {
    if (!life || life.dead) { return; }
    if (life.jail > 0) { return; }
    if (Math.random() > 0.5) { return; }
    var pool = [];
    for (var i = 0; i < LIFE_EVENTS.length; i++) {
      var e = LIFE_EVENTS[i];
      if (life.age < e.min || life.age > e.max) { continue; }
      if (e.req === "job" && !life.job) { continue; }
      if (e.req === "college" && !(life.edu.college > 0)) { continue; }
      if (e.req === "partner" && !life.partner) { continue; }
      if (e.req === "single" && life.partner) { continue; }
      if (e.req === "kid" && !life.kids.length) { continue; }
      if (e.req === "parent" && !life.parents.some(function (p) { return p.alive; })) { continue; }
      if (e.req === "sibling" && !life.siblings.some(function (s) { return s.alive; })) { continue; }
      if (e.req === "car" && !life.assets.some(function (a) { return a.kind === "car"; })) { continue; }
      if (e.req === "house" && !life.assets.some(function (a) { return a.kind === "house" || a.kind === "mansion"; })) { continue; }
      if (e.req === "famous" && life.fame < 50) { continue; }
      if (e.when && !e.when()) { continue; }
      pool.push(e);
    }
    if (!pool.length) { return; }
    lifeShowEvent(pool[ri(pool.length - 1)]);
  }
  function lifeShowEvent(e) {
    lifeEventOpen = true;
    var box = document.getElementById("life-event");
    box.innerHTML = "";
    var card = document.createElement("div");
    card.className = "life-ev";
    var p = document.createElement("p");
    p.textContent = e.text;
    card.appendChild(p);
    for (var i = 0; i < e.choices.length; i++) {
      (function (ch) {
        var b = document.createElement("button");
        b.className = "mini secondary";
        b.textContent = ch.t;
        b.onclick = function () {
          var ef = ch.e || {};
          if (ef.happy) { life.stats.happy += ef.happy; }
          if (ef.health) { life.stats.health += ef.health; }
          if (ef.smarts) { life.stats.smarts += ef.smarts; }
          if (ef.looks) { life.stats.looks += ef.looks; }
          if (ef.money) { life.money += ef.money; }
          if (ch.do) { ch.do(); }
          if (life.dead) { return; }
          lifeClamp();
          lifeLog(ch.log || ch.t.toLowerCase() + ".");
          box.innerHTML = "";
          lifeEventOpen = false;
          lifeSave();
          lifeRender();
          lifeRenderPanel();
        };
        card.appendChild(b);
      })(e.choices[i]);
    }
    box.appendChild(card);
  }
  /* ----- menu wiring + age locks ----- */
  function lifeTabMinAge(tab) {
    if (tab === "school") { return 6; }
    if (tab === "assets") { return 18; }
    if (tab === "love") { return 16; }
    if (tab === "crime") { return 13; }
    return 0;
  }
  function lifeTabLocked(tab) { return life && life.age < lifeTabMinAge(tab); }
  function lifeRefreshTabLocks() {
    var tabs = { "lm-school-btn": "school", "lm-assets-btn": "assets", "lm-love-btn": "love", "lm-crime-btn": "crime" };
    for (var id in tabs) {
      var b = document.getElementById(id);
      if (b) { b.disabled = lifeTabLocked(tabs[id]); b.style.opacity = lifeTabLocked(tabs[id]) ? "0.4" : "1"; }
    }
  }
  document.getElementById("lm-school-btn").onclick = function () {
    if (lifeTabLocked("school")) { lifeLog("too young for school!"); return; }
    lifePanelName = "school"; lifeRenderPanel();
  };
  document.getElementById("lm-assets-btn").onclick = function () {
    if (lifeTabLocked("assets")) { lifeLog("too young to own assets!"); return; }
    lifePanelName = "assets"; lifeRenderPanel();
  };
  document.getElementById("lm-love-btn").onclick = function () {
    if (lifeTabLocked("love")) { lifeLog("too young for love!"); return; }
    lifePanelName = "love"; lifeRenderPanel();
  };
  document.getElementById("lm-family-btn").onclick = function () { lifePanelName = "family"; lifeRenderPanel(); };
  document.getElementById("lm-social-btn").onclick = function () { lifePanelName = "social"; lifeRenderPanel(); };
  document.getElementById("lm-body-btn").onclick = function () { lifePanelName = "body"; lifeRenderPanel(); };
  document.getElementById("lm-crime-btn").onclick = function () {
    if (lifeTabLocked("crime")) { lifeLog("too young for crime!"); return; }
    lifePanelName = "crime"; lifeRenderPanel();
  };
  document.getElementById("lm-fun-btn").onclick = function () { lifePanelName = "fun"; lifeRenderPanel(); };

  /* ---------- team members ---------- */
  function loadEventTeams() {
    var box = document.getElementById("event-teams-list");
    if (!box) { return; }
    db.ref("eventTeams").once("value", function (snap) {
      var teams = snap.val() || {};
      db.ref("users").once("value", function (usnap) {
        var users = usnap.val() || {};
        var byTeam = { pumpkin: [], blackcat: [], ghost: [], bat: [] };
        for (var uid in teams) {
          var t = teams[uid];
          var nm = (users[uid] && users[uid].name) || "???";
          if (byTeam[t]) { byTeam[t].push(nm); }
        }
        box.innerHTML = "";
        var names = { pumpkin: "pumpkin", blackcat: "black cat", ghost: "ghost", bat: "bat" };
        for (var key in byTeam) {
          var h = document.createElement("h2");
          h.textContent = names[key] + " (" + byTeam[key].length + ")";
          h.style.color = "#fff";
          box.appendChild(h);
          var p = document.createElement("p");
          p.style.color = "#fff";
          p.textContent = byTeam[key].sort().join(", ") || "no members yet";
          box.appendChild(p);
        }
      });
    });
  }
  document.getElementById("event-teams-toggle").onclick = function () {
    var w = document.getElementById("event-teams-wrap");
    var t = document.getElementById("event-teams-toggle");
    var show = w.className.indexOf("hidden") >= 0;
    w.className = show ? "section-body" : "hidden section-body";
    t.textContent = show ? "team members \u2212" : "team members +";
    if (show) { loadEventTeams(); }
  };

  /* ---------- event badges ---------- */
  // Badge images: 96x96 px PNG. Mia creates them; placeholders used until then.
  var BADGE_DEFS = {
    "oct2026-gold": { name: "October Event Champion", color: "#ffd700" },
    "oct2026-silver": { name: "October Event Runner-up", color: "#c0c0c0" },
    "oct2026-bronze": { name: "October Event 3rd Place", color: "#cd7f32" },
    "oct2026-team": { name: "Winning Team", color: "#ff6600" }
  };
  function badgeImg(badgeId, size) {
    var def = BADGE_DEFS[badgeId] || { name: badgeId, color: "#999999" };
    var s = size || 48;
    var d = document.createElement("div");
    d.style.cssText = "display:inline-block;width:" + s + "px;height:" + s + "px;border-radius:50%;background:" + def.color + ";border:3px solid #111;text-align:center;line-height:" + s + "px;font-size:" + Math.round(s/2) + "px;margin:4px;vertical-align:middle;";
    d.textContent = "\u2605";
    d.title = def.name;
    return d;
  }
  function renderMyBadges() {
    var box = document.getElementById("my-badges");
    if (!box || !myUid()) { return; }
    db.ref("userBadges/" + myUid()).once("value", function (snap) {
      var v = snap.val() || {};
      var keys = Object.keys(v);
      box.innerHTML = keys.length ? "" : "<p>no badges yet — win events to earn them!</p>";
      keys.forEach(function (bid) {
        box.appendChild(badgeImg(bid, 48));
      });
    });
  }
  // also show badges in profile popup (other users)
  function renderPopupBadges(uid) {
    var box = document.getElementById("pp-badges");
    if (!box) { return; }
    db.ref("userBadges/" + uid).once("value", function (snap) {
      var v = snap.val() || {};
      var keys = Object.keys(v);
      box.innerHTML = "";
      keys.forEach(function (bid) { box.appendChild(badgeImg(bid, 36)); });
    });
  }

  function checkBanMessage() {
    var u = auth.currentUser;
    if (!u) { return; }
    db.ref("bans/" + u.uid).once("value", function (snap) {
      var b = snap.val();
      if (!b) { return; }
      var active = !b.until || b.until > Date.now();
      if (!active) { return; }
      var untilStr = b.until ? new Date(b.until).toLocaleString() : "forever";
      var msg = "The account " + (b.name || "you") + " was banned for the following reason(s): " + (b.reason || "no reason given") + ". Ban in effect until " + untilStr + ".";
      // show as a prominent notice
      var card = document.getElementById("signin-card");
      if (card) {
        var div = document.createElement("div");
        div.style.cssText = "background:#ffdddd;border:2px solid #cc0000;padding:12px;margin:12px 0;font-size:17px;";
        div.textContent = msg;
        card.insertBefore(div, card.firstChild);
      } else {
        alert(msg);
      }
    });
  }

  /* ---------- gamble ---------- */
  var GAMBLE_BET = 5;
  var GAMBLE_BETS = [1, 5, 10, 25, 50];
  var GAMBLE_SLOTS = ["7", "*", "$", "@", "#"];
  function enterGamble() {
    document.getElementById("gamble-msg").textContent = "";
    gambleRenderBet();
    gambleRenderDice();
    gambleRefreshXp();
    gambleLoadBoards();
    showScreen("gamble-screen");
  }
  function gambleRefreshXp() {
    document.getElementById("gamble-xp").textContent = "your xp: " + myXp;
  }
  function gambleRenderBet() {
    var row = document.getElementById("gamble-betrow");
    row.innerHTML = "";
    for (var i = 0; i < GAMBLE_BETS.length; i++) {
      (function (b) {
        var btn = document.createElement("button");
        btn.textContent = b + " xp";
        if (b === GAMBLE_BET) { btn.className = "sel"; }
        btn.onclick = function () { GAMBLE_BET = b; gambleRenderBet(); };
        row.appendChild(btn);
      })(GAMBLE_BETS[i]);
    }
  }
  function gambleRenderDice() {
    var row = document.getElementById("gamble-dicerow");
    row.innerHTML = "";
    for (var n = 1; n <= 6; n++) {
      (function (pick) {
        var btn = document.createElement("button");
        btn.textContent = String(pick);
        btn.onclick = function () { gambleDice(pick); };
        row.appendChild(btn);
      })(n);
    }
  }
  function gambleRecord(lost, won) {
    var u = myUid();
    if (!u) { return; }
    db.ref("gambleStats/" + u).transaction(function (cur) {
      cur = cur || {};
      return {
        name: displayName(), lost: (cur.lost || 0) + lost,
        won: (cur.won || 0) + won, games: (cur.games || 0) + 1, at: Date.now()
      };
    });
  }
  function gambleBetOk() {
    if (!auth.currentUser) { flashNotice("sign in first!"); return false; }
    if (myXp < GAMBLE_BET) { flashNotice("not enough xp!"); return false; }
    return true;
  }
  function gambleSettle(win, profitMult, label, msgId) {
    var u = myUid();
    var msg = document.getElementById(msgId || "gamble-msg");
    if (!msg) { msg = document.getElementById("gamble-msg"); }
    if (win) {
      var profit = GAMBLE_BET * profitMult;
      changeXp(u, profit);
      gambleRecord(0, profit);
      msg.textContent = label + "you won +" + profit + " xp!";
    } else {
      changeXp(u, -GAMBLE_BET);
      gambleRecord(GAMBLE_BET, 0);
      msg.textContent = label + "you lost " + GAMBLE_BET + " xp.";
    }
    gambleRefreshXp();
  }
  function gambleCoin(pick) {
    if (!gambleBetOk()) { return; }
    var flip = Math.random() < 0.5 ? "heads" : "tails";
    gambleSettle(flip === pick, 1, flip + "! ", "gamble-coin-msg");
  }
  function gambleDice(pick) {
    if (!gambleBetOk()) { return; }
    var roll = 1 + Math.floor(Math.random() * 6);
    gambleSettle(roll === pick, 5, "rolled a " + roll + "! ", "gamble-dice-msg");
  }
  function gambleSlots() {
    if (!gambleBetOk()) { return; }
    var r = [0, 1, 2].map(function () {
      return GAMBLE_SLOTS[Math.floor(Math.random() * GAMBLE_SLOTS.length)];
    });
    var faces = r.join(" ");
    if (r[0] === "7" && r[1] === "7" && r[2] === "7") { gambleSettle(true, 19, faces + " JACKPOT! ", "gamble-slots-msg"); }
    else if (r[0] === r[1] && r[1] === r[2]) { gambleSettle(true, 9, faces + " triple! ", "gamble-slots-msg"); }
    else if (r[0] === r[1] || r[1] === r[2] || r[0] === r[2]) { gambleSettle(true, 1, faces + " pair! ", "gamble-slots-msg"); }
    else { gambleSettle(false, 0, faces + " ", "gamble-slots-msg"); }
  }
  // blackjack
  var BJ_DECK = null, BJ_PLAYER = null, BJ_DEALER = null;
  function bjCardValue(hand) {
    var total = 0, aces = 0;
    for (var i = 0; i < hand.length; i++) {
      var c = hand[i];
      if (c === 1) { aces++; total += 11; }
      else if (c > 10) { total += 10; }
      else { total += c; }
    }
    while (total > 21 && aces > 0) { total -= 10; aces--; }
    return total;
  }
  function bjCardName(c) {
    if (c === 1) { return "A"; }
    if (c === 11) { return "J"; }
    if (c === 12) { return "Q"; }
    if (c === 13) { return "K"; }
    return String(c);
  }
  function bjRender(hideDealer) {
    var el = document.getElementById("gamble-bj-cards");
    if (!el) { return; }
    var pStr = BJ_PLAYER.map(bjCardName).join(" ") + " (" + bjCardValue(BJ_PLAYER) + ")";
    var dStr;
    if (hideDealer) {
      dStr = bjCardName(BJ_DEALER[0]) + " ? (?)";
    } else {
      dStr = BJ_DEALER.map(bjCardName).join(" ") + " (" + bjCardValue(BJ_DEALER) + ")";
    }
    el.textContent = "you: " + pStr + " | dealer: " + dStr;
  }
  function bjDraw() {
    return 1 + Math.floor(Math.random() * 13);
  }
  function gambleBjDeal() {
    if (!gambleBetOk()) { return; }
    BJ_PLAYER = [bjDraw(), bjDraw()];
    BJ_DEALER = [bjDraw(), bjDraw()];
    document.getElementById("gamble-bj-msg").textContent = "";
    bjRender(true);
    document.getElementById("gamble-bj-deal").className = "secondary hidden";
    document.getElementById("gamble-bj-hit").className = "secondary";
    document.getElementById("gamble-bj-stand").className = "secondary";
    // check for blackjack
    if (bjCardValue(BJ_PLAYER) === 21) { gambleBjStand(); }
  }
  function gambleBjHit() {
    if (!BJ_PLAYER) { return; }
    BJ_PLAYER.push(bjDraw());
    bjRender(true);
    if (bjCardValue(BJ_PLAYER) > 21) {
      // bust
      bjRender(false);
      gambleBjEnd();
    } else if (bjCardValue(BJ_PLAYER) === 21) {
      gambleBjStand();
    }
  }
  function gambleBjStand() {
    if (!BJ_PLAYER) { return; }
    // dealer hits until 17
    while (bjCardValue(BJ_DEALER) < 17) { BJ_DEALER.push(bjDraw()); }
    bjRender(false);
    gambleBjEnd();
  }
  function gambleBjEnd() {
    var pv = bjCardValue(BJ_PLAYER), dv = bjCardValue(BJ_DEALER);
    var msg = "you: " + pv + ", dealer: " + dv + ". ";
    document.getElementById("gamble-bj-deal").className = "secondary";
    document.getElementById("gamble-bj-hit").className = "secondary hidden";
    document.getElementById("gamble-bj-stand").className = "secondary hidden";
    if (pv > 21) {
      gambleSettle(false, 0, msg + "bust! ", "gamble-bj-msg");
    } else if (dv > 21) {
      gambleSettle(true, 1, msg + "dealer busts! ", "gamble-bj-msg");
    } else if (pv > dv) {
      // blackjack pays 1.5x profit (2.5x total, but our settle uses profit mult)
      var isBj = (BJ_PLAYER.length === 2 && pv === 21);
      gambleSettle(true, isBj ? 1.5 : 1, msg + (isBj ? "blackjack! " : "you win! "), "gamble-bj-msg");
    } else if (pv < dv) {
      gambleSettle(false, 0, msg + "dealer wins. ", "gamble-bj-msg");
    } else {
      // push - return bet (no win, no loss)
      document.getElementById("gamble-bj-msg").textContent = msg + "push! bet returned.";
      gambleRefreshXp();
    }
    BJ_PLAYER = null; BJ_DEALER = null;
  }
  function gambleLoadBoards() {
    var lb = document.getElementById("gamble-losers");
    var wb = document.getElementById("gamble-winners");
    db.ref("gambleStats").once("value", function (snap) {
      var data = snap.val() || {};
      var arr = [];
      var ks = Object.keys(data);
      for (var i = 0; i < ks.length; i++) {
        var s = data[ks[i]] || {};
        arr.push({ name: s.name || "someone", lost: s.lost || 0, won: s.won || 0 });
      }
      lb.innerHTML = "";
      var losers = arr.slice().sort(function (a, b) { return b.lost - a.lost; }).slice(0, 10);
      if (!losers.length || !losers[0].lost) { lb.innerHTML = "<p>nobody has lost xp yet!</p>"; }
      else {
        for (var j = 0; j < losers.length; j++) {
          var pl = document.createElement("p");
          pl.textContent = (j + 1) + ". " + losers[j].name + " — lost " + losers[j].lost + " xp";
          lb.appendChild(pl);
        }
      }
      wb.innerHTML = "";
      var winners = arr.slice().sort(function (a, b) { return b.won - a.won; }).slice(0, 10);
      if (!winners.length || !winners[0].won) { wb.innerHTML = "<p>nobody has won xp yet!</p>"; }
      else {
        for (var k = 0; k < winners.length; k++) {
          var pw = document.createElement("p");
          pw.textContent = (k + 1) + ". " + winners[k].name + " — won " + winners[k].won + " xp";
          wb.appendChild(pw);
        }
      }
    }, function () {
      lb.innerHTML = "<p>couldn't load.</p>";
      wb.innerHTML = "<p>couldn't load.</p>";
    });
  }

  /* ---------- critter catch (pokemon-like) ---------- */
  var CRITTERS = [
    { id: "embercub", name: "Embercub", type: "fire", hp: 45, atk: 12, catch: 0.5 },
    { id: "aquafin", name: "Aquafin", type: "water", hp: 50, atk: 10, catch: 0.5 },
    { id: "leafhop", name: "Leafhop", type: "leaf", hp: 40, atk: 11, catch: 0.5 },
    { id: "sparkpup", name: "Sparkpup", type: "spark", hp: 35, atk: 14, catch: 0.45 },
    { id: "shadeling", name: "Shadeling", type: "shadow", hp: 55, atk: 9, catch: 0.4 },
    { id: "frostbite", name: "Frostbite", type: "water", hp: 42, atk: 13, catch: 0.45 },
    { id: "thornback", name: "Thornback", type: "leaf", hp: 60, atk: 8, catch: 0.4 },
    { id: "cindercub", name: "Cindercub", type: "fire", hp: 38, atk: 15, catch: 0.45 },
    { id: "voltpaw", name: "Voltpaw", type: "spark", hp: 33, atk: 16, catch: 0.4 },
    { id: "mistwing", name: "Mistwing", type: "water", hp: 48, atk: 11, catch: 0.45 },
    { id: "rootle", name: "Rootle", type: "leaf", hp: 52, atk: 10, catch: 0.45 },
    { id: "duskpaw", name: "Duskpaw", type: "shadow", hp: 44, atk: 13, catch: 0.4 }
  ];
  var CRITTER_BEATS = { fire: "leaf", water: "fire", leaf: "water", spark: "water", shadow: "spark" };
  var critterSave = null;
  var critterBattle = null;
  function critterLoad() {
    try {
      var s = localStorage.getItem("readium_critter");
      critterSave = s ? JSON.parse(s) : null;
    } catch (e) { critterSave = null; }
    if (!critterSave) { critterSave = { team: [], box: [], traps: 5 }; }
  }
  function critterStore() {
    try { localStorage.setItem("readium_critter", JSON.stringify(critterSave)); } catch (e) {}
  }
  function critterById(id) {
    for (var i = 0; i < CRITTERS.length; i++) { if (CRITTERS[i].id === id) { return CRITTERS[i]; } }
    return null;
  }
  function critterNew(id) {
    var base = critterById(id);
    return { id: id, name: base.name, type: base.type, maxHp: base.hp, hp: base.hp, atk: base.atk, lvl: 1 };
  }
  /* ---------- alchemy (little alchemy style) ---------- */
  var ALC_EMOJI = {
    air: "\uD83D\uDCA8", earth: "\uD83C\uDF0D", fire: "\uD83D\uDD25", water: "\uD83D\uDCA7",
    smoke: "\uD83D\uDCA8", rain: "\uD83C\uDF27", dust: "\uD83D\uDCA8", steam: "\uD83D\uDCA8",
    lava: "\uD83C\uDF0B", mud: "\uD83D\uDFE0", fog: "\uD83C\uDF2B", plant: "\uD83C\uDF31",
    ash: "\uD83C\uDF2B", cloud: "\u2601", stone: "\uD83E\uDEA8", brick: "\uD83E\uDDFB",
    grass: "\uD83C\uDF3F", metal: "\u2699", wall: "\uD83E\uDDFB", lightning: "\u26A1",
    moss: "\uD83C\uDF3F", geyser: "\uD83D\uDCA7", steel: "\u2699", house: "\uD83C\uDFE0",
    storm: "\uD83C\uDF29", sand: "\uD83C\uDFDC", swamp: "\uD83C\uDF33", glass: "\uD83E\uDD43",
    sword: "\uD83D\uDDE1", shield: "\uD83D\uDEE1", tool: "\uD83D\uDD27", wood: "\uD83E\uDEB5",
    tree: "\uD83C\uDF33", flower: "\uD83C\uDF38", fruit: "\uD83C\uDF4E", seed: "\uD83C\uDF31",
    garden: "\uD83C\uDF3B", pond: "\uD83D\uDCA7", river: "\uD83C\uDF0A", lake: "\uD83C\uDF0A",
    ocean: "\uD83C\uDF0A", island: "\uD83C\uDFDD", mountain: "\u26F0", volcano: "\uD83C\uDF0B",
    earthquake: "\uD83C\uDF0B", crystal: "\uD83D\uDC8E", gem: "\uD83D\uDC8E", gold: "\uD83E\uDE99",
    silver: "\uD83E\uDE88", copper: "\uD83E\uDE99", wire: "\uD83E\uDDE1", electricity: "\u26A1",
    light: "\uD83D\uDCA1", shadow: "\uD83C\uDF11", sun: "\u2600", moon: "\uD83C\uDF19",
    star: "\u2B50", sky: "\uD83C\uDF08", night: "\uD83C\uDF03", day: "\u2600",
    rainbow: "\uD83C\uDF08", snow: "\u2744", ice: "\uD83E\uDDCA", frost: "\u2744",
    hail: "\uD83C\uDF28", blizzard: "\uD83C\uDF2C", mist: "\uD83C\uDF2B", dew: "\uD83D\uDCA7",
    mudslide: "\uD83D\uDFE0", clay: "\uD83D\uDFE0", pottery: "\uD83C\uDFFA", kiln: "\uD83D\uDD25"
  };
  var ALC_RECIPES = {
    "air+fire": "smoke", "air+water": "rain", "air+earth": "dust",
    "fire+water": "steam", "fire+earth": "lava", "water+earth": "mud",
    "smoke+water": "fog", "rain+earth": "plant", "dust+fire": "ash",
    "steam+air": "cloud", "lava+water": "stone", "mud+fire": "brick",
    "plant+earth": "grass", "stone+fire": "metal", "brick+brick": "wall",
    "cloud+fire": "lightning", "fog+plant": "moss", "steam+earth": "geyser",
    "metal+fire": "steel", "wall+wall": "house", "lightning+water": "storm",
    "stone+water": "sand", "mud+plant": "swamp", "sand+fire": "glass",
    "metal+wood": "tool", "steel+fire": "sword", "steel+wood": "shield",
    "plant+plant": "grass", "grass+grass": "garden", "seed+earth": "plant",
    "plant+water": "flower", "flower+earth": "fruit", "fruit+earth": "seed",
    "water+water": "pond", "pond+water": "lake", "lake+water": "river",
    "river+water": "ocean", "ocean+earth": "island", "earth+earth": "mountain",
    "mountain+fire": "volcano", "mountain+lava": "volcano", "earth+fire": "lava",
    "stone+stone": "mountain", "sand+stone": "mountain", "lava+stone": "volcano",
    "metal+metal": "steel", "copper+fire": "wire", "wire+lightning": "electricity",
    "cloud+water": "rain", "fog+water": "rain", "steam+steam": "cloud",
    "air+cloud": "sky", "sky+fire": "sun", "sky+moon": "night",
    "sun+water": "rainbow", "rain+sun": "rainbow", "night+star": "sky",
    "cloud+ice": "snow", "water+ice": "frost", "rain+ice": "hail",
    "snow+snow": "blizzard", "fog+fog": "mist", "mist+plant": "dew",
    "mud+water": "swamp", "mud+mud": "clay", "clay+fire": "pottery",
    "pottery+fire": "kiln", "stone+air": "sand", "dust+stone": "sand",
    "lava+air": "stone", "smoke+smoke": "fog", "ash+water": "mud",
    "dust+water": "mud", "fire+plant": "ash", "lightning+plant": "fire",
    "storm+earth": "earthquake", "stone+pressure": "crystal", "sand+fire": "glass",
    "glass+glass": "crystal", "metal+stone": "gold", "gold+fire": "metal",
    "earth+water": "mud", "air+stone": "sand", "fire+stone": "metal"
  };
  var ALC_BASE = ["air", "earth", "fire", "water"];
  var alcDiscovered = {};
  var alcSel = [];
  function alcKey(a, b) { return [a, b].sort().join("+"); }
  function alcEmoji(n) { return ALC_EMOJI[n] || "\u2728"; }
  function alcSave() {
    try { localStorage.setItem("readium_alc", JSON.stringify(Object.keys(alcDiscovered))); } catch (e) {}
  }
  function alcLoad() {
    alcDiscovered = {};
    ALC_BASE.forEach(function (b) { alcDiscovered[b] = 1; });
    try {
      var s = JSON.parse(localStorage.getItem("readium_alc") || "[]");
      s.forEach(function (n) { alcDiscovered[n] = 1; });
    } catch (e) {}
  }
  function enterAlc() {
    alcLoad();
    alcSel = [];
    alcSearchQ = "";
    var si = document.getElementById("alc-search");
    if (si) { si.value = ""; }
    document.getElementById("alc-msg").textContent = "";
    showScreen("alc-screen");
    alcRender();
    alcLoadBoard();
  }
  function alcLoadBoard() {
    var box = document.getElementById("alc-board");
    box.innerHTML = "<p>loading...</p>";
    db.ref("alcScores").once("value", function (snap) {
      var v = snap.val() || {};
      var rows = [];
      for (var uid in v) {
        var r = v[uid] || {};
        if (r.count > 0) { rows.push({ uid: uid, name: r.name || "someone", count: r.count }); }
      }
      rows.sort(function (a, b) { return b.count - a.count; });
      rows = rows.slice(0, 20);
      box.innerHTML = "";
      if (!rows.length) { box.innerHTML = "<p>nobody yet — be the first!</p>"; return; }
      var me = myUid();
      for (var i = 0; i < rows.length; i++) {
        var p = document.createElement("p");
        p.textContent = (i + 1) + ". " + rows[i].name + " — " + rows[i].count;
        if (rows[i].uid === me) { p.style.fontWeight = "bold"; }
        box.appendChild(p);
      }
    }, function (err) { box.innerHTML = "<p>could not load.</p>"; });
  }
  var alcSearchQ = "";
  function alcRender() {
    var lib = document.getElementById("alc-lib");
    lib.innerHTML = "";
    var names = Object.keys(alcDiscovered).sort();
    document.getElementById("alc-count").textContent = names.length + " discovered";
    if (alcSearchQ) {
      var q = alcSearchQ.toLowerCase();
      names = names.filter(function (n) { return n.toLowerCase().indexOf(q) !== -1; });
    }
    for (var i = 0; i < names.length; i++) {
      (function (n) {
        var b = document.createElement("button");
        b.textContent = alcEmoji(n) + " " + n;
        if (alcSel.indexOf(n) !== -1) { b.className = "sel"; }
        b.onclick = function () { alcTap(n); };
        lib.appendChild(b);
      })(names[i]);
    }
    var mx = document.getElementById("alc-mix");
    mx.innerHTML = "";
    for (var j = 0; j < alcSel.length; j++) {
      (function (n) {
        var b = document.createElement("button");
        b.className = "sel";
        b.textContent = alcEmoji(n) + " " + n;
        b.onclick = function () { alcTap(n); };
        mx.appendChild(b);
      })(alcSel[j]);
    }
    if (!alcSel.length) { mx.innerHTML = "<p>tap two elements, then mix!</p>"; }
  }
  function alcTap(n) {
    var i = alcSel.indexOf(n);
    if (i !== -1) { alcSel.splice(i, 1); }
    else if (alcSel.length < 2) { alcSel.push(n); }
    else { alcSel = [n]; }
    document.getElementById("alc-msg").textContent = "";
    alcRender();
  }
  function alcMix() {
    var msg = document.getElementById("alc-msg");
    if (alcSel.length !== 2) { msg.textContent = "pick two elements first!"; return; }
    var r = ALC_RECIPES[alcKey(alcSel[0], alcSel[1])];
    if (!r) { msg.textContent = alcSel[0] + " + " + alcSel[1] + " = nothing..."; alcSel = []; alcRender(); return; }
    var isNew = !alcDiscovered[r];
    alcDiscovered[r] = 1;
    alcSave();
    if (isNew && myUid()) {
      var cnt = Object.keys(alcDiscovered).length;
      db.ref("alcScores/" + myUid()).set({ name: displayName(), count: cnt, at: Date.now() });
    }
    msg.textContent = alcSel[0] + " + " + alcSel[1] + " = " + alcEmoji(r) + " " + r + (isNew ? " (new! +2 xp)" : "");
    if (isNew && typeof changeXp === "function" && myUid()) { changeXp(myUid(), 2); }
    alcSel = [];
    alcRender();
  }
  function enterCritter() {
    critterLoad();
    showScreen("critter-screen");
    critterBattle = null;
    critterRender();
  }
  function critterRender() {
    var box = document.getElementById("critter-main");
    box.innerHTML = "";
    if (critterBattle) { return critterRenderBattle(box); }
    // starter choice if no team
    if (!critterSave.team.length) {
      var h = document.createElement("h2");
      h.textContent = "pick your starter!";
      box.appendChild(h);
      ["embercub", "aquafin", "leafhop"].forEach(function (id) {
        var base = critterById(id);
        var b = document.createElement("button");
        b.className = "secondary";
        b.style.display = "block"; b.style.margin = "8px 0";
        b.textContent = base.name + " (" + base.type + ") — HP " + base.hp + ", ATK " + base.atk;
        b.onclick = function () {
          critterSave.team.push(critterNew(id));
          critterStore();
          critterRender();
        };
        box.appendChild(b);
      });
      return;
    }
    // main menu
    var info = document.createElement("p");
    info.textContent = "traps: " + critterSave.traps + " | team: " + critterSave.team.length + " | caught: " + critterSave.box.length;
    box.appendChild(info);
    var ex = document.createElement("button");
    ex.textContent = "explore!";
    ex.onclick = critterExplore;
    box.appendChild(ex);
    var teamH = document.createElement("h2");
    teamH.textContent = "your team";
    box.appendChild(teamH);
    critterSave.team.forEach(function (c) {
      var p = document.createElement("p");
      p.textContent = c.name + " (" + c.type + ") Lv" + c.lvl + " — HP " + c.hp + "/" + c.maxHp;
      box.appendChild(p);
    });
    if (critterSave.box.length) {
      var boxH = document.createElement("h2");
      boxH.textContent = "collection (" + critterSave.box.length + "/12)";
      box.appendChild(boxH);
      var seen = {};
      critterSave.box.forEach(function (c) { seen[c.id] = true; });
      var p2 = document.createElement("p");
      p2.style.fontSize = "15px";
      p2.textContent = Object.keys(seen).map(function (id) { return critterById(id).name; }).join(", ");
      box.appendChild(p2);
    }
  }
  function critterExplore() {
    var r = Math.random();
    if (r < 0.2) {
      critterSave.traps += 2;
      critterStore();
      flashNotice("found 2 traps!");
      critterRender();
      return;
    }
    if (r < 0.3) {
      flashNotice("nothing here... keep exploring!");
      return;
    }
    // wild encounter!
    var wild = critterNew(CRITTERS[Math.floor(Math.random() * CRITTERS.length)].id);
    // scale wild to team strength
    var avgLvl = 1;
    critterSave.team.forEach(function (c) { avgLvl += c.lvl; });
    avgLvl = Math.round(avgLvl / critterSave.team.length);
    wild.lvl = Math.max(1, avgLvl + Math.floor(Math.random() * 3) - 1);
    wild.maxHp = Math.round(wild.maxHp * (1 + (wild.lvl - 1) * 0.15));
    wild.hp = wild.maxHp;
    wild.atk = Math.round(wild.atk * (1 + (wild.lvl - 1) * 0.12));
    critterBattle = { wild: wild, myIdx: 0, msg: "a wild " + wild.name + " appeared!" };
    // heal team slightly? no - keep damage
    critterRender();
  }
  function critterMyCritter() {
    return critterSave.team[critterBattle.myIdx];
  }
  function critterRenderBattle(box) {
    var b = critterBattle;
    var wild = b.wild;
    var mine = critterMyCritter();
    var h = document.createElement("h2");
    h.textContent = "wild " + wild.name + " (Lv" + wild.lvl + ")";
    box.appendChild(h);
    var wp = document.createElement("p");
    wp.textContent = "HP: " + wild.hp + "/" + wild.maxHp + " (" + wild.type + ")";
    box.appendChild(wp);
    var wbar = document.createElement("div");
    wbar.style.cssText = "width:200px;height:12px;border:1px solid #111;background:#eee;";
    var wfill = document.createElement("div");
    wfill.style.cssText = "height:100%;background:#cc0000;width:" + Math.round(wild.hp / wild.maxHp * 100) + "%;";
    wbar.appendChild(wfill);
    box.appendChild(wbar);
    var mh = document.createElement("h2");
    mh.textContent = mine.name + " (Lv" + mine.lvl + ")";
    box.appendChild(mh);
    var mp = document.createElement("p");
    mp.textContent = "HP: " + mine.hp + "/" + mine.maxHp + " (" + mine.type + ")";
    box.appendChild(mp);
    var mbar = document.createElement("div");
    mbar.style.cssText = "width:200px;height:12px;border:1px solid #111;background:#eee;";
    var mfill = document.createElement("div");
    mfill.style.cssText = "height:100%;background:#00aa00;width:" + Math.round(mine.hp / mine.maxHp * 100) + "%;";
    mbar.appendChild(mfill);
    box.appendChild(mbar);
    var msg = document.createElement("p");
    msg.style.fontSize = "16px";
    msg.textContent = b.msg;
    box.appendChild(msg);
    var row = document.createElement("div");
    var atk = document.createElement("button");
    atk.textContent = "attack";
    atk.onclick = critterAttack;
    row.appendChild(atk);
    var trap = document.createElement("button");
    trap.className = "secondary";
    trap.textContent = "trap (" + critterSave.traps + ")";
    trap.onclick = critterTrap;
    row.appendChild(trap);
    var run = document.createElement("button");
    run.className = "secondary";
    run.textContent = "run";
    run.onclick = critterRun;
    row.appendChild(run);
    box.appendChild(row);
    // switch critter
    if (critterSave.team.length > 1) {
      var sw = document.createElement("div");
      sw.style.marginTop = "8px";
      critterSave.team.forEach(function (c, idx) {
        if (idx === b.myIdx || c.hp <= 0) { return; }
        var sb = document.createElement("button");
        sb.className = "mini secondary";
        sb.textContent = "send " + c.name;
        sb.onclick = function () {
          b.myIdx = idx;
          b.msg = "go, " + c.name + "!";
          critterRender();
        };
        sw.appendChild(sb);
      });
      box.appendChild(sw);
    }
  }
  function critterEffectiveness(atkType, defType) {
    return CRITTER_BEATS[atkType] === defType ? 1.5 : 1;
  }
  function critterAttack() {
    var b = critterBattle;
    var wild = b.wild, mine = critterMyCritter();
    // player attacks
    var eff = critterEffectiveness(mine.type, wild.type);
    var dmg = Math.round((mine.atk + Math.random() * 5) * eff);
    wild.hp = Math.max(0, wild.hp - dmg);
    b.msg = mine.name + " dealt " + dmg + " damage!" + (eff > 1 ? " super effective!" : "");
    if (wild.hp <= 0) {
      // won!
      var xpGain = 5 + wild.lvl * 2;
      mine.lvl++;
      mine.maxHp = Math.round(mine.maxHp * 1.1);
      mine.hp = mine.maxHp;
      mine.atk = Math.round(mine.atk * 1.08);
      critterStore();
      b.msg = "wild " + wild.name + " fainted! " + mine.name + " grew to Lv" + mine.lvl + "! +" + xpGain + " xp";
      xpWinOnce();
      // heal a bit
      setTimeout(function () { critterBattle = null; critterRender(); }, 1500);
      critterRender();
      return;
    }
    // wild attacks back
    var weff = critterEffectiveness(wild.type, mine.type);
    var wdam = Math.round((wild.atk + Math.random() * 5) * weff);
    mine.hp = Math.max(0, mine.hp - wdam);
    b.msg += " wild " + wild.name + " dealt " + wdam + " back!" + (weff > 1 ? " super effective!" : "");
    if (mine.hp <= 0) {
      // find next alive
      var next = -1;
      for (var i = 0; i < critterSave.team.length; i++) {
        if (critterSave.team[i].hp > 0) { next = i; break; }
      }
      if (next === -1) {
        b.msg = "all your critters fainted... you run home!";
        critterStore();
        setTimeout(function () {
          // revive with half hp
          critterSave.team.forEach(function (c) { c.hp = Math.round(c.maxHp / 2); });
          critterStore();
          critterBattle = null;
          critterRender();
        }, 1500);
      } else {
        b.myIdx = next;
        b.msg += " " + mine.name + " fainted! go, " + critterSave.team[next].name + "!";
      }
    }
    critterStore();
    critterRender();
  }
  function critterTrap() {
    var b = critterBattle;
    if (critterSave.traps <= 0) { b.msg = "no traps left!"; critterRender(); return; }
    critterSave.traps--;
    var wild = b.wild;
    var base = critterById(wild.id).catch;
    var hpFactor = 1 - (wild.hp / wild.maxHp) * 0.6; // lower hp = easier
    var chance = base * hpFactor;
    if (Math.random() < chance) {
      // caught!
      var newC = critterNew(wild.id);
      newC.lvl = wild.lvl;
      critterSave.box.push(newC);
      if (critterSave.team.length < 6) {
        critterSave.team.push(newC);
        b.msg = "caught " + wild.name + "! added to your team!";
      } else {
        b.msg = "caught " + wild.name + "! sent to collection!";
      }
      critterStore();
      xpWinOnce();
      setTimeout(function () { critterBattle = null; critterRender(); }, 1500);
    } else {
      b.msg = "oh no! " + wild.name + " broke free!";
      // wild attacks
      var mine = critterMyCritter();
      var wdam = Math.round(wild.atk + Math.random() * 5);
      mine.hp = Math.max(0, mine.hp - wdam);
      b.msg += " it dealt " + wdam + " damage!";
      if (mine.hp <= 0) {
        b.msg += " " + mine.name + " fainted!";
      }
    }
    critterStore();
    critterRender();
  }
  function critterRun() {
    var b = critterBattle;
    if (Math.random() < 0.6) {
      b.msg = "got away safely!";
      setTimeout(function () { critterBattle = null; critterRender(); }, 800);
    } else {
      b.msg = "can't escape!";
      var mine = critterMyCritter();
      var wdam = Math.round(b.wild.atk + Math.random() * 5);
      mine.hp = Math.max(0, mine.hp - wdam);
      b.msg += " wild " + b.wild.name + " dealt " + wdam + "!";
    }
    critterStore();
    critterRender();
  }
  document.getElementById("critter-back-btn").onclick = enterGames;

  /* ---------- polls ---------- */
  var pollRef = null;
  function enterPolls() {
    showScreen("poll-screen");
    document.getElementById("poll-msg").textContent = "";
    // show create form for chickn only
    db.ref("users/" + myUid() + "/name").once("value", function (snap) {
      var nm = snap.val();
      document.getElementById("poll-create").className = (nm === "chickn") ? "" : "hidden";
    });
    if (pollRef) { pollRef.off(); }
    pollRef = db.ref("polls").orderByChild("createdAt");
    pollRef.on("value", function (snap) { renderPolls(snap.val()); });
    // mark seen
    try {
      db.ref("pollsMeta/lastPollAt").once("value", function (s) {
        var at = s.val() || 0;
        try { localStorage.setItem("readium_lastPollSeen", String(at)); } catch (e) {}
        updatePollDot();
      });
    } catch (e) {}
  }
  var pollNotifiedAt = 0;
  try { pollNotifiedAt = parseInt(localStorage.getItem("readium_pollNotified") || "0", 10); } catch (e) {}
  function updatePollDot() {
    var dot = document.getElementById("poll-dot2");
    if (!dot) { return; }
    var seen = 0, last = 0;
    try { seen = parseInt(localStorage.getItem("readium_lastPollSeen") || "0", 10); } catch (e) {}
    db.ref("pollsMeta/lastPollAt").once("value", function (snap) {
      last = snap.val() || 0;
      dot.className = (last > seen) ? "dot" : "dot hidden";
      if (last > pollNotifiedAt && last > seen) {
        pollNotifiedAt = last;
        try { localStorage.setItem("readium_pollNotified", String(last)); } catch (e) {}
        notify("new poll!", "someone posted a poll — go vote!", function () { enterPoll(); });
      }
    });
  }
  function renderPolls(data) {
    var box = document.getElementById("poll-list");
    box.innerHTML = "";
    var keys = data ? Object.keys(data) : [];
    keys.sort(function (a, b) { return (data[b].createdAt || 0) - (data[a].createdAt || 0); });
    if (!keys.length) { box.innerHTML = "<p>no polls yet.</p>"; return; }
    var me = myUid();
    keys.forEach(function (pid) {
      (function (p) {
        var wrap = document.createElement("div");
        wrap.className = "req-row";
        var q = document.createElement("p");
        var qb = document.createElement("b");
        qb.textContent = p.question || "(no question)";
        q.appendChild(qb);
        wrap.appendChild(q);
        var opts = p.options || [];
        var votes = p.votes || {};
        var total = 0;
        for (var i = 0; i < opts.length; i++) { total += (votes[i] || 0); }
        // check if I voted
        db.ref("pollVotes/" + pid + "/" + me).once("value", function (vsnap) {
          var myVote = vsnap.val();
          for (var i = 0; i < opts.length; i++) {
            (function (idx) {
              var row = document.createElement("div");
              row.style.cssText = "margin:6px 0;";
              var btn = document.createElement("button");
              btn.className = "mini secondary";
              btn.style.width = "100%";
              btn.style.textAlign = "left";
              var vc = votes[idx] || 0;
              var pct = total ? Math.round(vc / total * 100) : 0;
              btn.textContent = opts[idx] + " — " + vc + " (" + pct + "%)";
              if (myVote !== null && myVote !== undefined) {
                btn.disabled = true;
                if (myVote === idx) { btn.textContent = "\u2713 " + btn.textContent; }
              } else {
                btn.onclick = function () {
                  db.ref("pollVotes/" + pid + "/" + me).set(idx, function (err) {
                    if (!err) {
                      db.ref("polls/" + pid + "/votes/" + idx).transaction(function (cur) {
                        return (typeof cur === "number" ? cur : 0) + 1;
                      });
                    }
                  });
                };
              }
              row.appendChild(btn);
              wrap.appendChild(row);
            })(i);
          }
          var meta = document.createElement("p");
          meta.style.fontSize = "14px"; meta.style.color = "#555555";
          meta.textContent = total + " vote" + (total === 1 ? "" : "s");
          wrap.appendChild(meta);
        });
        box.appendChild(wrap);
      })(data[pid]);
    });
  }
  document.getElementById("home-apps-btn").onclick = function () { showScreen("apps-screen"); updateMuseBtn(); };

  /* ---------- muse assistant (founder only) ---------- */
  function updateMuseBtn() {
    var btn = document.getElementById("apps-muse-btn");
    if (btn) { btn.classList.toggle("hidden", !isFounder); }
  }
  document.getElementById("apps-muse-btn").onclick = function () { enterMuse(); };
  document.getElementById("muse-back-btn").onclick = function () { showScreen("apps-screen"); };
  document.getElementById("muse-send-btn").onclick = sendMuseCmd;
  document.getElementById("muse-input").onkeypress = function (e) {
    if (e.key === "Enter") { sendMuseCmd(); }
  };
  function enterMuse() {
    showScreen("muse-screen");
    loadMuseHistory();
  }
  function sendMuseCmd() {
    var input = document.getElementById("muse-input");
    var text = input.value.trim();
    if (!text) { return; }
    var uid = myUid();
    if (!uid) { return; }
    var cmd = { text: text, at: Date.now(), status: "pending", by: displayName() };
    db.ref("museCmds").push(cmd, function (err) {
      if (!err) {
        input.value = "";
        loadMuseHistory();
      } else {
        alert("Failed: " + (err.code || err.message));
      }
    });
  }
  function loadMuseHistory() {
    var box = document.getElementById("muse-history");
    if (!box) { return; }
    db.ref("museCmds").orderByChild("at").limitToLast(20).once("value", function (snap) {
      box.innerHTML = "";
      var v = snap.val() || {};
      var keys = Object.keys(v).sort(function (a, b) { return (v[a].at || 0) - (v[b].at || 0); });
      if (!keys.length) { box.innerHTML = "<p>no commands yet</p>"; return; }
      keys.forEach(function (k) {
        var c = v[k];
        var d = document.createElement("div");
        d.style.marginBottom = "8px";
        d.style.padding = "6px";
        d.style.borderBottom = "1px solid #eee";
        var statusColor = c.status === "done" ? "green" : (c.status === "failed" ? "red" : "orange");
        d.innerHTML = "<b>" + escapeHtml(c.by || "you") + ":</b> " + escapeHtml(c.text || "") +
          "<br><span style='color:" + statusColor + ";font-size:0.85em;'>" + escapeHtml(c.status || "pending") + "</span>" +
          (c.result ? "<br><span style='font-size:0.9em;'>" + escapeHtml(c.result) + "</span>" : "");
        box.appendChild(d);
      });
      box.scrollTop = box.scrollHeight;
    });
  }
  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /* ---------- chatbot (for everyone) ---------- */
  document.getElementById("apps-chatbot-btn").onclick = function () { enterChatbot(); };
  document.getElementById("chatbot-back-btn").onclick = function () { showScreen("apps-screen"); };
  document.getElementById("chatbot-send-btn").onclick = sendChatbotMsg;
  document.getElementById("chatbot-input").onkeypress = function (e) {
    if (e.key === "Enter") { sendChatbotMsg(); }
  };
  function enterChatbot() {
    showScreen("chatbot-screen");
    var box = document.getElementById("chatbot-history");
    if (box && !box.innerHTML) {
      addChatbotMsg("bot", "hey! i'm the readium assistant. ask me about the app, games, or just chat!");
    }
  }
  function addChatbotMsg(who, text) {
    var box = document.getElementById("chatbot-history");
    if (!box) { return; }
    var d = document.createElement("div");
    d.style.marginBottom = "8px";
    d.style.padding = "6px";
    if (who === "bot") {
      d.style.background = "#f0f0f0";
      d.style.borderRadius = "8px";
      d.innerHTML = "<b>bot:</b> " + escapeHtml(text);
    } else {
      d.style.textAlign = "right";
      d.innerHTML = "<b>you:</b> " + escapeHtml(text);
    }
    box.appendChild(d);
    box.scrollTop = box.scrollHeight;
  }
  function sendChatbotMsg() {
    var input = document.getElementById("chatbot-input");
    var text = input.value.trim();
    if (!text) { return; }
    addChatbotMsg("you", text);
    input.value = "";
    setTimeout(function () {
      addChatbotMsg("bot", chatbotReply(text));
    }, 500);
  }
  function chatbotReply(text) {
    var t = text.toLowerCase().trim();
    // greetings
    if (/^(hi|hello|hey|yo|sup|hello there|hey there)[!?.]*$/.test(t)) {
      var greets = ["hey! what's up?", "hi there! how's it going?", "hey hey! what can i do for you?"];
      return greets[Math.floor(Math.random() * greets.length)];
    }
    // how are you
    if (t.indexOf("how are you") !== -1 || t.indexOf("how r u") !== -1) {
      return "i'm doing great! thanks for asking! how are you doing?";
    }
    // name
    if (t.indexOf("your name") !== -1 || t.indexOf("who are you") !== -1) {
      return "i'm the readium assistant! i'm here to chat and help!";
    }
    // games
    if (t.indexOf("game") !== -1) {
      if (t.indexOf("chess") !== -1) return "chess is awesome! you can play against the bot or with friends in game lobbies!";
      if (t.indexOf("solitaire") !== -1) return "solitaire is classic! klondike style, draw 1. win for 10 xp!";
      if (t.indexOf("tic") !== -1) return "tic-tac-toe! play vs the bot with different difficulties!";
      if (t.indexOf("alchemy") !== -1) return "alchemy is so fun! mix elements to discover new ones. 2 xp per discovery!";
      if (t.indexOf("critter") !== -1 || t.indexOf("pokemon") !== -1) return "critter catch is like pokemon! catch 12 original critters, battle and level them up!";
      if (t.indexOf("life") !== -1) return "we have TWO life games! life sim (bitlife-style) and zaya's game of life (conway's)!";
      if (t.indexOf("pictionary") !== -1) return "pictionary is... having some issues right now, but we're working on it!";
      return "we've got 9 games! tic-tac-toe, connect four, chess, pictionary, life sim, zaya's game of life, solitaire, critter catch, and alchemy!";
    }
    // events
    if (t.indexOf("event") !== -1 || t.indexOf("halloween") !== -1 || t.indexOf("october") !== -1 || t.indexOf("candy") !== -1 || t.indexOf("door") !== -1) {
      return "the october event is live! knock on 6 doors every 2 hours to get candy. join a team - pumpkin, black cat, ghost, or bat - and climb the leaderboard!";
    }
    // xp
    if (t.indexOf("xp") !== -1) {
      return "you get xp for chatting (1 per message), winning games, and being active! check the leaderboard to see the top 20!";
    }
    // dms
    if (t.indexOf("dm") !== -1 || t.indexOf("direct message") !== -1) {
      return "to dm someone, go to messages, search for their username, and send a request! they'll get a notification.";
    }
    // chickn
    if (t.indexOf("chickn") !== -1) {
      return "chickn is the founder of readium! she built this whole thing!";
    }
    // store
    if (t.indexOf("store") !== -1 || t.indexOf("buy") !== -1 || t.indexOf("shop") !== -1) {
      return "the store has themes, xp boosts, and mystery boxes! spend your xp on cool stuff for your profile!";
    }
    // polls
    if (t.indexOf("poll") !== -1 || t.indexOf("vote") !== -1) {
      return "polls are created by chickn! vote on them and see live results!";
    }
    // help
    if (t.indexOf("help") !== -1) {
      return "i can answer questions about games, events, xp, dms, the store, and more! or just chat! say 'joke' for a laugh!";
    }
    // jokes
    if (t.indexOf("joke") !== -1) {
      var jokes = [
        "why don't scientists trust atoms? because they make up everything!",
        "what do you call fake spaghetti? an impasta!",
        "why did the scarecrow win an award? because he was outstanding in his field!",
        "what do you call a fish without eyes? a fsh!",
        "why did the math book look so sad? because it had too many problems!"
      ];
      return jokes[Math.floor(Math.random() * jokes.length)];
    }
    // love/like
    if (t.indexOf("i love you") !== -1 || t.indexOf("i like you") !== -1) {
      return "aww, i like you too! you're awesome!";
    }
    // bye
    if (t.indexOf("bye") !== -1 || t.indexOf("goodnight") !== -1 || t.indexOf("good night") !== -1) {
      return "bye! come back soon!";
    }
    // thanks
    if (t.indexOf("thank") !== -1) {
      return "you're welcome! happy to help!";
    }
    // questions - try to be helpful instead of generic
    if (t.indexOf("?") !== -1) {
      if (t.indexOf("what") !== -1) return "that's a good question! i'm still learning, but try asking about games, events, or xp!";
      if (t.indexOf("how") !== -1) return "great question! i can help with how things work - try asking about a specific feature like dms or games!";
      if (t.indexOf("when") !== -1) return "hmm, not sure about timing! the october event runs until nov 7 though!";
      if (t.indexOf("where") !== -1) return "everything's right here in readium! check the apps screen for all the features!";
      if (t.indexOf("why") !== -1) return "good question! i'm not sure, but chickn probably has a good reason!";
      return "hmm, i'm not sure about that one! try asking about games, events, xp, or say 'help'!";
    }
    // fallback - more conversational, less repetitive
    var fallbacks = [
      "oh interesting! tell me more about that.",
      "i see! what do you like to do on readium?",
      "cool! have you checked out the october event yet?",
      "nice! what's your favorite game here?"
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }
  document.getElementById("apps-back-btn").onclick = goHome;
  document.getElementById("apps-suggest-btn").onclick = function () { requireAuth(enterSuggest); };
  document.getElementById("apps-store-btn").onclick = function () { requireAuth(enterStore); };
  document.getElementById("apps-board-btn").onclick = enterBoard;
  document.getElementById("apps-poll-btn").onclick = function () { enterPolls(); };
  document.getElementById("apps-log-btn").onclick = function () { showScreen("log-screen"); };
  document.getElementById("apps-settings-btn").onclick = function () { settingsReturn = "home"; requireAuth(enterSettings); };

  document.getElementById("poll-back-btn").onclick = goHome;
  document.getElementById("poll-post-btn").onclick = function () {
    var q = document.getElementById("poll-q").value.replace(/^\s+|\s+$/g, "");
    var opts = [];
    for (var i = 1; i <= 4; i++) {
      var v = document.getElementById("poll-opt" + i).value.replace(/^\s+|\s+$/g, "");
      if (v) { opts.push(v); }
    }
    var msg = document.getElementById("poll-msg");
    if (!q || opts.length < 2) { msg.textContent = "need a question and at least 2 options."; return; }
    var ref = db.ref("polls").push();
    ref.set({ question: q, options: opts, votes: {}, createdBy: myUid(), createdAt: Date.now() }, function (err) {
      if (err) { msg.textContent = "could not post poll."; return; }
      db.ref("pollsMeta/lastPollAt").set(Date.now());
      document.getElementById("poll-q").value = "";
      for (var j = 1; j <= 4; j++) { document.getElementById("poll-opt" + j).value = ""; }
      msg.textContent = "poll posted! everyone will see a notification.";
    });
  };

  /* ---------- suggestions ---------- */
  function enterSuggest() {
    wantSuggest = false;
    showScreen("suggest-screen");
    document.getElementById("suggest-msg").textContent = "";
    if (suggestRef) { suggestRef.off(); }
    for (var k in suggestCommentsRefs) { suggestCommentsRefs[k].off(); }
    suggestCommentsRefs = {};
    suggestRef = db.ref("suggestions").orderByChild("ts").limitToLast(100);
    suggestRef.on("value", function (snap) {
      suggestData = snap.val();
      renderSuggest();
    });
  }
  function suggestScore(s) {
    var t = 0;
    if (s.votes) {
      for (var k in s.votes) {
        var v = s.votes[k];
        t += (v === true ? 1 : v);
      }
    }
    return t;
  }
  function renderSuggest() {
    var box = document.getElementById("suggest-list");
    if (!box) { return; }
    box.innerHTML = "";
    var data = suggestData || {};
    var keys = Object.keys(data);
    var open = [], done = [], rejected = [];
    for (var i = 0; i < keys.length; i++) {
      var s = data[keys[i]] || {};
      s._id = keys[i];
      if (s.rejected) { rejected.push(s); } else if (s.done) { done.push(s); } else { open.push(s); }
    }
    open.sort(function (a, b) { return suggestScore(b) - suggestScore(a) || (b.ts || 0) - (a.ts || 0); });
    done.sort(function (a, b) { return (b.doneAt || 0) - (a.doneAt || 0); });
    rejected.sort(function (a, b) { return (b.doneAt || 0) - (a.doneAt || 0); });
    var list = suggestTab === "open" ? open : (suggestTab === "rejected" ? rejected : done);
    if (!list.length) { box.innerHTML = "<p>nothing here yet</p>"; return; }
    for (var j = 0; j < list.length; j++) { renderSuggestItem(list[j], box); }
  }
  function renderSuggestItem(s, box) {
    var id = s._id;
    var wrap = document.createElement("div");
    wrap.className = "req-row";
    var head = document.createElement("p");
    var tag = document.createElement("b");
    tag.textContent = s.type === "bug" ? "[bug] " : "[idea] ";
    var body = document.createElement("span");
    body.textContent = s.text || "";
    if (s.done) { body.className = "sug-done-text"; }
    head.appendChild(tag);
    head.appendChild(body);
    wrap.appendChild(head);
    var meta = document.createElement("p");
    meta.style.fontSize = "14px";
    meta.style.color = "#555555";
    var sc = suggestScore(s);
    meta.innerHTML = "";
    var byx = document.createElement("span"); byx.textContent = "by ";
    var nmx = document.createElement("b"); nmx.textContent = s.name || "?";
    styleModName(nmx, s.uid, s.name);
    var ptx = petTagForName(s.name);
    var restx = document.createElement("span");
    restx.textContent = " \u2014 " + sc + " point" + (sc === 1 || sc === -1 ? "" : "s");
    meta.appendChild(byx); meta.appendChild(nmx);
    if (ptx) { meta.appendChild(ptx); }

    meta.appendChild(restx);
    wrap.appendChild(meta);
    var row = document.createElement("div");
    var me = myUid();
    var myVote = s.votes ? s.votes[me] : null;
    if (myVote === true) { myVote = 1; }
    var upBtn = document.createElement("button");
    upBtn.className = "mini" + (myVote === 1 ? "" : " secondary");
    upBtn.textContent = myVote === 1 ? "upvoted!" : "+1";
    upBtn.onclick = function () { toggleSuggestVote(id, 1); };
    row.appendChild(upBtn);
    var downBtn = document.createElement("button");
    downBtn.className = "mini" + (myVote === -1 ? "" : " secondary");
    downBtn.textContent = myVote === -1 ? "downvoted!" : "-1";
    downBtn.onclick = function () { toggleSuggestVote(id, -1); };
    row.appendChild(downBtn);
    var cdiv = document.createElement("div");
    cdiv.className = "hidden";
    cdiv.id = "sug-c-" + id;
    var expanded = false;
    var cbtn = document.createElement("button");
    cbtn.className = "mini secondary";
    var scc = (s.comments) ? Object.keys(s.comments).length : 0;
    cbtn.textContent = "comments (" + scc + ")";
    cbtn.onclick = function () {
      expanded = !expanded;
      cdiv.className = expanded ? "" : "hidden";
      if (expanded) { loadSuggestComments(id); }
      else if (suggestCommentsRefs[id]) { suggestCommentsRefs[id].off(); delete suggestCommentsRefs[id]; }
    };
    row.appendChild(cbtn);
    var rep = document.createElement("button");
    rep.className = "tiny secondary";
    rep.textContent = "!";
    rep.title = "report";
    rep.onclick = function () {
      submitReport(id, { name: s.name, text: s.text }, "suggestions", "suggestions");
    };
    row.appendChild(rep);
    if (auth.currentUser && (isMod || s.uid === me)) {
      var del = document.createElement("button");
      del.className = "mini secondary";
      del.textContent = "delete";
      del.onclick = function () {
        askConfirm("Delete this?", function () { db.ref("suggestions/" + id).remove(); });
      };
      row.appendChild(del);
    }
    if (isMod && auth.currentUser) {
      if (!s.done) {
        var dn = document.createElement("button");
        dn.className = "mini secondary";
        dn.textContent = "mark done";
        dn.onclick = function () {
          db.ref("suggestions/" + id).update({ done: true, rejected: false, doneAt: Date.now() });
        };
        row.appendChild(dn);
        var rj = document.createElement("button");
        rj.className = "mini secondary";
        rj.textContent = "reject";
        rj.onclick = function () {
          askConfirm("Reject this suggestion?", function () {
            db.ref("suggestions/" + id).update({ rejected: true, done: false, doneAt: Date.now() });
          });
        };
        row.appendChild(rj);
      } else {
        var ro = document.createElement("button");
        ro.className = "mini secondary";
        ro.textContent = "reopen";
        ro.onclick = function () {
          db.ref("suggestions/" + id).update({ done: false, rejected: false, doneAt: null });
        };
        row.appendChild(ro);
      }
    }
    wrap.appendChild(row);
    wrap.appendChild(cdiv);
    box.appendChild(wrap);
  }
  function toggleSuggestVote(id, dir) {
    var me = myUid();
    if (!me) { return; }
    var vref = db.ref("suggestions/" + id + "/votes/" + me);
    vref.once("value", function (snap) {
      var cur = snap.val();
      if (cur === true) { cur = 1; }
      if (cur === dir) { vref.remove(); } else { vref.set(dir); }
    });
  }
  function loadSuggestComments(id) {
    var box = document.getElementById("sug-c-" + id);
    if (!box) { return; }
    box.innerHTML = "<p>loading...</p>";
    if (suggestCommentsRefs[id]) { suggestCommentsRefs[id].off(); }
    var ref = db.ref("suggestions/" + id + "/comments").orderByChild("ts").limitToLast(20);
    suggestCommentsRefs[id] = ref;
    ref.on("value", function (snap) { renderSuggestComments(id, snap.val()); });
  }
  function renderSuggestComments(id, data) {
    var box = document.getElementById("sug-c-" + id);
    if (!box) { return; }
    box.innerHTML = "";
    var keys = data ? Object.keys(data) : [];
    keys.sort(function (a, b) { return (data[b].ts || 0) - (data[a].ts || 0); });
    for (var i = 0; i < keys.length; i++) {
      (function (k) {
        var c = data[k] || {};
        var d = document.createElement("div");
        d.style.cssText = "font-size:17px;border-top:1px solid #999999;padding:6px 0;";
        if (c.uid) {
          var spi = pfpImg(null, 1);
          spi.style.verticalAlign = "middle"; spi.style.marginRight = "6px";
          fillPfpImg(spi, c.uid);
          d.appendChild(spi);
        }
        var nm = document.createElement("b");
        nm.textContent = (c.name || "?") + ": ";
        var tx = document.createElement("span");
        tx.textContent = c.text || "";
        d.appendChild(nm);

        d.appendChild(tx);
        if (auth.currentUser && (isMod || c.uid === myUid())) {
          var del = document.createElement("button");
          del.className = "tiny secondary";
          del.textContent = "delete";
          del.onclick = function () { db.ref("suggestions/" + id + "/comments/" + k).remove(); };
          d.appendChild(del);
        }
        box.appendChild(d);
      })(keys[i]);
    }
    var inp = document.createElement("input");
    inp.type = "text";
    inp.maxLength = 300;
    inp.placeholder = "add a comment...";
    inp.style.marginTop = "6px";
    var btn = document.createElement("button");
    btn.className = "mini";
    btn.textContent = "comment";
    btn.onclick = function () {
      var t = inp.value.replace(/^\s+|\s+$/g, "");
      if (!t || !auth.currentUser) { return; }
      var me = myUid();
      db.ref("bans/" + me).once("value", function (snap) {
        if (hoodBanActive(snap.val())) { return; }
        var body = t;
        if (!isMod) {
          if (filterHit(t)) { return; }
          body = censor(t);
        }
        db.ref("suggestions/" + id + "/comments").push(
          { name: displayName(), uid: me, text: body, ts: Date.now() },
          function (err) { inp.value = ""; if (!err) { grantXp(2, "comment", 30000); } }
        );
      });
    };
    box.appendChild(inp);
    box.appendChild(btn);
  }
  function suggestPost() {
    var input = document.getElementById("suggest-input");
    var text = input.value.replace(/^\s+|\s+$/g, "");
    var msg = document.getElementById("suggest-msg");
    if (!text || !auth.currentUser) { return; }
    var me = myUid();
    db.ref("bans/" + me).once("value", function (snap) {
      if (hoodBanActive(snap.val())) { msg.textContent = "you are banned."; msg.style.color = "#990000"; return; }
      var body = text;
      if (!isMod) {
        if (filterHit(text)) { msg.textContent = "keep it clean!"; msg.style.color = "#990000"; return; }
        body = censor(text);
      }
      db.ref("suggestions").push(
        { name: displayName(), uid: me, text: body, ts: Date.now(), type: suggestType },
        function (err) {
          input.value = "";
          msg.textContent = "posted!";
          msg.style.color = "#115511";
          if (!err) { grantXp(3, "suggestpost", 60000); }
        }
      );
    });
  }
  document.getElementById("suggest-post-btn").onclick = suggestPost;
  document.getElementById("suggest-home-btn").onclick = goHome;
  /* ================= OCTOBER EVENT ================= */
  var EVENT_END = new Date(2026, 10, 8, 0, 0, 0).getTime(); /* midnight ending Nov 7 */
  var EVENT_DOOR_WINDOW = 2 * 3600 * 1000; /* 2 hours */
  var EVENT_DOOR_MAX = 6;
  var EVENT_TEAMS = ["pumpkin", "blackcat", "ghost", "bat"];
  var EVENT_TEAM_NAMES = { pumpkin: "pumpkin", blackcat: "black cat", ghost: "ghost", bat: "bat" };
  var EVENT_TEAM_LOGOS = {
    pumpkin: "data:image/png;base64,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",
    blackcat: "data:image/png;base64,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",
    ghost: "data:image/png;base64,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",
    bat: "data:image/png;base64,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"
  };
  var EVENT_SPECIAL_MSGS = [
    "a black cat crosses your path and drops a glowing treat...",
    "you hear giggling from inside... a little ghost floats out holding candy!",
    "a grinning pumpkin opens the door with candy-corn teeth...",
    "a bat swoops down and drops something shiny at your feet...",
    "the door creaks open all by itself... spooooky..."
  ];
  var myEventTeam = null;
  var myEventCandy = 0;
  var eventTab = "teams";
  var eventCountdownTimer = null;
  var eventTeamsCache = {};
  function refreshEventTeamsCache(cb) {
    db.ref("eventTeams").once("value", function (snap) {
      eventTeamsCache = snap.val() || {};
      if (cb) { cb(); }
    });
  }
  function teamTagForUid(uid) {
    var t = uid && eventTeamsCache[uid];
    if (!t || !EVENT_TEAM_LOGOS[t]) { return null; }
    var im = document.createElement("img");
    im.className = "team-tag";
    im.src = EVENT_TEAM_LOGOS[t];
    im.alt = EVENT_TEAM_NAMES[t];
    im.title = "team " + EVENT_TEAM_NAMES[t];
    return im;
  }

  function fmtEventCountdown(ms) {
    if (ms <= 0) { return "event over! thanks for playing!"; }
    var s = Math.floor(ms / 1000);
    var d = Math.floor(s / 86400); s -= d * 86400;
    var h = Math.floor(s / 3600); s -= h * 3600;
    var m = Math.floor(s / 60); s -= m * 60;
    return "event ends in " + d + "d " + h + "h " + m + "m " + s + "s";
  }
  function fmtEventWait(ms) {
    if (ms < 0) { ms = 0; }
    var s = Math.ceil(ms / 1000);
    var h = Math.floor(s / 3600); s -= h * 3600;
    var m = Math.floor(s / 60); s -= m * 60;
    return h + "h " + m + "m " + s + "s";
  }
  function eventKnocksInWindow(knocks, now) {
    var out = [];
    for (var k in knocks) {
      if (!knocks.hasOwnProperty(k)) { continue; }
      var ts = parseInt(k, 10);
      if (isNaN(ts) || now - ts >= EVENT_DOOR_WINDOW) { continue; }
      var v = knocks[k];
      var door, candy;
      if (v !== null && typeof v === "object") {
        door = (typeof v.d === "number") ? v.d : -1;
        candy = (typeof v.c === "number") ? v.c : -1;
      } else {
        door = (typeof v === "number") ? v : -1;
        candy = -1;
      }
      out.push({ ts: ts, door: door, candy: candy });
    }
    out.sort(function (a, b) { return a.ts - b.ts; });
    return out;
  }
  function saveKnock(uid, idx, candy) {
    var up = {};
    up[Date.now()] = { d: idx, c: candy };
    db.ref("eventKnocks/" + uid).update(up);
  }
  function eventLogosInto() {
    var ids = { pumpkin: "ev-b-pumpkin", blackcat: "ev-b-blackcat", ghost: "ev-b-ghost", bat: "ev-b-bat" };
    for (var t in ids) {
      if (!ids.hasOwnProperty(t)) { continue; }
      var im = document.getElementById(ids[t]);
      if (im) { im.src = EVENT_TEAM_LOGOS[t]; }
    }
  }
  function startEventCountdown() {
    stopEventCountdown();
    var el = document.getElementById("event-countdown");
    function tick() {
      if (el) { el.textContent = fmtEventCountdown(EVENT_END - Date.now()); }
    }
    tick();
    eventCountdownTimer = setInterval(tick, 1000);
  }
  function stopEventCountdown() {
    if (eventCountdownTimer) { clearInterval(eventCountdownTimer); eventCountdownTimer = null; }
  }
  function enterEvent() {
    showScreen("event-screen");
    eventLogosInto();
    startEventCountdown();
    var uid = myUid();
    var joinDiv = document.getElementById("event-join");
    var joinBtn = document.getElementById("event-join-btn");
    var joinText = document.getElementById("event-join-text");
    if (!uid) {
      document.getElementById("event-main").className = "hidden";
      joinDiv.className = "";
      joinBtn.className = "hidden";
      joinText.textContent = "you need an account to play — sign in from home first!";
      return;
    }
    joinBtn.className = "";
    joinText.textContent = "knock on doors, grab candy, and help your team win! tap below to get sorted onto a team.";
    document.getElementById("event-result").textContent = "";
    db.ref("eventTeams/" + uid).once("value", function (snap) {
      var team = snap.val();
      if (team && EVENT_TEAMS.indexOf(team) >= 0) {
        myEventTeam = team;
        showEventMain();
      } else {
        myEventTeam = null;
        joinDiv.className = "";
        document.getElementById("event-main").className = "hidden";
      }
    });
    db.ref("eventCandy/" + uid).once("value", function (snap) {
      myEventCandy = (typeof snap.val() === "number") ? snap.val() : 0;
    });
  }
  document.getElementById("event-join-btn").onclick = function () {
    var uid = myUid();
    if (!uid) { return; }
    var team = EVENT_TEAMS[Math.floor(Math.random() * EVENT_TEAMS.length)];
    db.ref("eventTeams/" + uid).set(team, function () {
      myEventTeam = team;
      eventTeamsCache[uid] = team;
      showEventMain();
      flashNotice("you're on team " + EVENT_TEAM_NAMES[team] + "!");
    });
  };
  function showEventMain() {
    document.getElementById("event-join").className = "hidden";
    document.getElementById("event-main").className = "";
    renderEventTeamLine();
    renderEventDoors();
    loadEventBoard();
  }
  function renderEventTeamLine() {
    var el = document.getElementById("event-team-line");
    el.innerHTML = "";
    var im = document.createElement("img");
    im.src = EVENT_TEAM_LOGOS[myEventTeam];
    im.alt = EVENT_TEAM_NAMES[myEventTeam];
    el.appendChild(im);
    var sp = document.createElement("span");
    sp.textContent = "team " + EVENT_TEAM_NAMES[myEventTeam];
    el.appendChild(sp);
    var cl = document.getElementById("event-candy-line");
    if (cl) { cl.textContent = "your candy: " + myEventCandy; }
  }
  function renderEventDoors() {
    var uid = myUid();
    if (!uid) { return; }
    var box = document.getElementById("event-doors");
    var note = document.getElementById("event-doors-note");
    if (!box || !note) { return; }
    box.innerHTML = "";
    note.textContent = "loading doors...";
    db.ref("eventKnocks/" + uid).once("value", function (snap) {
      var now = Date.now();
      var knocks = eventKnocksInWindow(snap.val() || {}, now);
      var left = EVENT_DOOR_MAX - knocks.length;
      var ended = now >= EVENT_END;
      box.innerHTML = "";
      for (var i = 0; i < EVENT_DOOR_MAX; i++) {
        (function (idx) {
          var b = document.createElement("button");
          b.className = "door-btn";
          var hit = null;
          for (var j = 0; j < knocks.length; j++) {
            if (knocks[j].door === idx) { hit = knocks[j]; break; }
          }
          var opened = !!hit;
          b.textContent = opened ? (hit.candy >= 0 ? "+" + hit.candy + " candy" : "opened!") : "door " + (idx + 1);
          b.disabled = opened || left <= 0 || ended;
          if (!b.disabled) { b.onclick = function () { knockDoor(idx); }; }
          box.appendChild(b);
        })(i);
      }
      if (ended) { note.textContent = "the event is over!"; }
      else if (left <= 0) {
        var next = knocks[0].ts + EVENT_DOOR_WINDOW - now;
        note.textContent = "out of doors! more in " + fmtEventWait(next);
      } else {
        note.textContent = left + " door" + (left === 1 ? "" : "s") + " left — new doors every 2 hours";
      }
    });
  }
  function knockDoor(idx) {
    var uid = myUid();
    if (!uid || !myEventTeam) { return; }
    if (Date.now() >= EVENT_END) { renderEventDoors(); return; }
    db.ref("eventKnocks/" + uid).once("value", function (snap) {
      var knocks = eventKnocksInWindow(snap.val() || {}, Date.now());
      if (knocks.length >= EVENT_DOOR_MAX) { renderEventDoors(); return; }
      var candy = 1 + Math.floor(Math.random() * 5);
      var special = Math.random() < 0.25;
      if (special) { openEventMinigame(candy, idx); }
      else {
        saveKnock(uid, idx, candy);
        awardEventCandy(uid, candy, "you got " + candy + " candy!");
      }
      renderEventDoors();
    });
  }
  function awardEventCandy(uid, candy, msg) {
    db.ref("eventCandy/" + uid).transaction(function (c) { return (c || 0) + candy; }, function () {
      db.ref("eventCandy/" + uid).once("value", function (s) {
        myEventCandy = (typeof s.val() === "number") ? s.val() : 0;
        var cl = document.getElementById("event-candy-line");
        if (cl) { cl.textContent = "your candy: " + myEventCandy; }
      });
    });
    if (myEventTeam) {
      db.ref("eventTeamCandy/" + myEventTeam).transaction(function (c) { return (c || 0) + candy; }, function () {
        loadEventBoard();
      });
    }
    var r = document.getElementById("event-result");
    if (r) { r.textContent = msg; }
  }
  function openEventMinigame(candy, idx) {
    var uid = myUid();
    var modal = document.getElementById("event-modal");
    var txt = document.getElementById("event-modal-text");
    var btns = document.getElementById("event-modal-btns");
    var msg = EVENT_SPECIAL_MSGS[Math.floor(Math.random() * EVENT_SPECIAL_MSGS.length)];
    var target = 1 + Math.floor(Math.random() * 5);
    var tries = 2;
    txt.textContent = msg + " a witch offers DOUBLE candy (" + (candy * 2) + ") if you guess her number from 1 to 5 — 2 tries!";
    btns.innerHTML = "";
    for (var n = 1; n <= 5; n++) {
      (function (num) {
        var b = document.createElement("button");
        b.className = "guess-btn";
        b.textContent = num;
        b.onclick = function () {
          if (num === target) {
            modal.className = "hidden";
            saveKnock(uid, idx, candy * 2);
            awardEventCandy(uid, candy * 2, "the witch cackles — DOUBLE candy! +" + (candy * 2));
          } else {
            tries--;
            b.disabled = true;
            if (tries <= 0) {
              modal.className = "hidden";
              saveKnock(uid, idx, candy);
              awardEventCandy(uid, candy, "wrong! the witch vanishes... you keep " + candy + " candy.");
            } else {
              txt.textContent = "nope — " + (num < target ? "too low." : "too high.") + " one try left...";
            }
          }
        };
        btns.appendChild(b);
      })(n);
    }
    modal.className = "";
  }
  function loadEventBoard() {
    var tabs = document.getElementsByClassName("eb-tab");
    for (var i = 0; i < tabs.length; i++) {
      (function (t) {
        t.className = "mini secondary eb-tab" + (t.getAttribute("data-eb") === eventTab ? " on" : "");
        t.onclick = function () { eventTab = t.getAttribute("data-eb"); loadEventBoard(); };
      })(tabs[i]);
    }
    var list = document.getElementById("event-board-list");
    if (!list) { return; }
    list.innerHTML = "<p>loading...</p>";
    if (eventTab === "teams") {
      db.ref("eventTeamCandy").once("value", function (snap) {
        var v = snap.val() || {};
        var rows = [];
        for (var i = 0; i < EVENT_TEAMS.length; i++) {
          var t = EVENT_TEAMS[i];
          rows.push({ team: t, candy: (typeof v[t] === "number") ? v[t] : 0 });
        }
        rows.sort(function (a, b) { return b.candy - a.candy; });
        list.innerHTML = "";
        for (var j = 0; j < rows.length; j++) {
          (function (r, rank) {
            var row = document.createElement("div");
            row.className = "team-row" + (r.team === myEventTeam ? " me" : "");
            var rk = document.createElement("span");
            rk.className = "board-rank"; rk.textContent = (rank + 1) + ".";
            var im = document.createElement("img");
            im.src = EVENT_TEAM_LOGOS[r.team]; im.alt = EVENT_TEAM_NAMES[r.team];
            var nm = document.createElement("span");
            nm.textContent = "team " + EVENT_TEAM_NAMES[r.team];
            var c = document.createElement("span");
            c.className = "board-xp"; c.textContent = r.candy + " candy";
            row.appendChild(rk); row.appendChild(im); row.appendChild(nm); row.appendChild(c);
            list.appendChild(row);
          })(rows[j], j);
        }
      });
    } else {
      db.ref("eventCandy").once("value", function (snap) {
        var v = snap.val() || {};
        var rows = [];
        for (var uid in v) {
          if (!v.hasOwnProperty(uid)) { continue; }
          if (typeof v[uid] === "number" && v[uid] > 0) { rows.push({ uid: uid, candy: v[uid] }); }
        }
        rows.sort(function (a, b) { return b.candy - a.candy; });
        rows = rows.slice(0, 20);
        db.ref("users").once("value", function (usnap) {
          var users = usnap.val() || {};
          list.innerHTML = "";
          if (!rows.length) { list.innerHTML = "<p>nobody has candy yet — knock on some doors!</p>"; return; }
          var me = myUid();
          for (var i = 0; i < rows.length; i++) {
            (function (r, rank) {
              var row = document.createElement("div");
              row.className = "board-row" + (r.uid === me ? " me" : "");
              var rk = document.createElement("span");
              rk.className = "board-rank"; rk.textContent = (rank + 1) + ".";
              var nm = document.createElement("span");
              var urec = users[r.uid];
              nm.textContent = (urec && urec.name) || "???";
              if (nm.textContent === "???" && r.uid) {
                (function (nmEl, uid) {
                  db.ref("users/" + uid + "/name").once("value", function (nsnap) {
                    var n = nsnap.val();
                    if (n) { nmEl.textContent = n; if (typeof styleModName === "function") { styleModName(nmEl, uid, n); } }
                  });
                })(nm, r.uid);
              }
              if (typeof styleModName === "function") { styleModName(nm, r.uid, nm.textContent); }
              var c = document.createElement("span");
              c.className = "board-xp"; c.textContent = r.candy + " candy";
              row.appendChild(rk); row.appendChild(nm);
              var cttag = (typeof teamTagForUid === "function") ? teamTagForUid(r.uid) : null;
              if (cttag) { row.appendChild(cttag); }
              row.appendChild(c);
              list.appendChild(row);
            })(rows[i], i);
          }
        });
      });
    }
  }
  document.getElementById("event-home-btn").onclick = function () { stopEventCountdown(); goHome(); };
  document.getElementById("event-btn").onclick = function () { enterEvent(); };
  /* ============== END OCTOBER EVENT ============== */

  document.getElementById("board-home-btn").onclick = goHome;
  document.getElementById("store-home-btn").onclick = goHome;
  document.getElementById("suggest-top-home-btn").onclick = goHome;
  document.getElementById("hood-top-home-btn").onclick = goHome;
  document.getElementById("apps-fullscreen-btn").onclick = function () {
    try {
      if (document.fullscreenElement) { document.exitFullscreen(); }
      else if (document.documentElement.requestFullscreen) { document.documentElement.requestFullscreen(); }
    } catch (e) {}
  };
  (function () {
    var tbtns = document.getElementsByClassName("sug-type");
    for (var i = 0; i < tbtns.length; i++) {
      (function (b) {
        b.onclick = function () {
          suggestType = b.getAttribute("data-t");
          for (var j = 0; j < tbtns.length; j++) {
            tbtns[j].className = "mini secondary sug-type" + (tbtns[j] === b ? " sel" : "");
          }
        };
      })(tbtns[i]);
    }
    var tabs = document.getElementsByClassName("sug-tab");
    for (var k = 0; k < tabs.length; k++) {
      (function (b) {
        b.onclick = function () {
          suggestTab = b.getAttribute("data-tab");
          for (var j = 0; j < tabs.length; j++) {
            tabs[j].className = "mini secondary sug-tab" + (tabs[j] === b ? " sel" : "");
          }
          renderSuggest();
        };
      })(tabs[k]);
    }
  })();

/* ---------- auth state ---------- */
  function checkXpGrants() {
    var uid = myUid();
    if (!uid) { return; }
    db.ref("xpGrants/" + uid).orderByChild("seen").equalTo(false).once("value", function (snap) {
      if (!snap.exists()) { return; }
      var grants = snap.val();
      var keys = Object.keys(grants);
      // show popup for each unseen grant
      keys.forEach(function (k) {
        var g = grants[k];
        var msg = "+" + (g.amt || 0) + " XP from " + (g.by || "a mod");
        if (g.reason) { msg += "\nReason: " + g.reason; }
        // use notify for the popup
        notify("you got XP!", msg, null);
        // mark as seen
        db.ref("xpGrants/" + uid + "/" + k + "/seen").set(true);
      });
    });
    // also watch for new grants while online
    db.ref("xpGrants/" + uid).orderByChild("seen").equalTo(false).on("child_added", function (snap) {
      var g = snap.val() || {};
      // skip if already shown (avoid duplicates from the once() above)
      if (g._shown) { return; }
      var msg = "+" + (g.amt || 0) + " XP from " + (g.by || "a mod");
      if (g.reason) { msg += "\nReason: " + g.reason; }
      notify("you got XP!", msg, null);
      db.ref("xpGrants/" + uid + "/" + snap.key + "/seen").set(true);
    });
  }
  auth.onAuthStateChanged(function (user) {
    refreshHome();
    if (user) {
      ensureUserRecord();
      watchXp();
      watchDmRequests();
      watchDmMessages();
      syncTimezoneFromCloud();
      updatePollDot();
      checkBanMessage();
      watchMentions();
      checkMod();
      startPresence();
      checkXpGrants();
      closeSignin();
      var startHash = "";
      try { startHash = String(window.location.hash || "").replace("#", ""); } catch (e3) {}
      if (startHash && startHash !== "home" && startHash !== "chat-screen") { routeHash(startHash); }
      else if (wantMsgs) { enterMsgs(); }
      else if (wantGames) { enterGames(); }
      else if (wantHood) { enterHood(); }
      else if (wantSuggest) { enterSuggest(); }
    } else {
      updateMsgsDot();
      stopPresence();
      if (xpRef) { xpRef.off(); xpRef = null; }
      if (dmReqRef) { dmReqRef.off(); dmReqRef = null; }
      if (dmConvosRef) { dmConvosRef.off(); dmConvosRef = null; }
      for (var wid in dmMsgWatch) {
        if (dmMsgWatch[wid] && dmMsgWatch[wid].ref) { dmMsgWatch[wid].ref.off(); }
      }
      dmMsgWatch = {};
      dmReqSeen = {};
      mentionSeen = {};
      myXp = 0;
      isMod = false;
      isFounder = false;
      if (firstAuth) {
        firstAuth = false;
        showScreen("home-screen");
        openSignin();
      } else {
        goHome();
      }
    }
  });

  showScreen("home-screen");
  refreshHome();
  updateClock();
  setInterval(updateClock, 1000);
