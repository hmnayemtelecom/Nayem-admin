/* ==========================================================================
   HM-NAYEM-TELECOM BANGLADESH — Admin Panel Configuration
   এই ফাইলটি সব admin-*.html পেজ থেকে <script> ট্যাগ দিয়ে লোড হবে।
   ইউজার অ্যাপের মতো একই Firebase প্রজেক্ট ব্যবহার করা হচ্ছে (একই ডাটাবেস)।
   ========================================================================== */
const firebaseConfig = {
  apiKey: "AIzaSyBFi1-JvNby6Icj_Fj6ek7gmKo3U5akPXE",
  authDomain: "hm-nayem-telecom.firebaseapp.com",
  projectId: "hm-nayem-telecom",
  storageBucket: "hm-nayem-telecom.firebasestorage.app",
  messagingSenderId: "640135982172",
  appId: "1:640135982172:web:0e65779dca58aa6dfd4a99",
  measurementId: "G-YZQX3HZ4S8"
};

if (!firebase.apps || !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.database();

/* ==========================================================================
   অ্যাডমিন অথেনটিকেশন গার্ড
   ইমেইল/পাসওয়ার্ড দিয়ে লগইন + admins/{uid}=true + এই সেশনে ৬-ডিজিট পাসকোড ভেরিফাই — তিনটাই লাগবে।
   ========================================================================== */
function requireAdminAuth(callback) {
  auth.onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = "admin-login.html";
      return;
    }
    db.ref("admins/" + user.uid).once("value")
      .then((snap) => {
        if (snap.val() === true) {
          if (sessionStorage.getItem("hmAdminPasscodeOK") === "1") {
            callback(user);
          } else {
            window.location.href = "admin-passcode.html";
          }
        } else {
          auth.signOut().finally(() => {
            window.location.href = "admin-login.html?denied=1";
          });
        }
      })
      .catch(() => {
        // পারমিশন এরর বা নেটওয়ার্ক সমস্যা হলেও লগইন পেজে ফিরিয়ে দেওয়া হয়
        window.location.href = "admin-login.html";
      });
  });
}

function adminLogout() {
  sessionStorage.removeItem("hmAdminPasscodeOK");
  auth.signOut().then(() => { window.location.href = "admin-login.html"; });
}

// টপবারের লগআউট বাটনে ক্লিক করলে ভুলে চাপার ঝুঁকি এড়াতে কনফার্মেশন দেখানো হয়
function confirmLogout() {
  if (confirm("আপনি কি লগআউট করতে চান?")) adminLogout();
}

// শুধুমাত্র জরুরি/ব্যাকআপ অ্যাক্সেসের জন্য — এটা প্রকৃত নিরাপত্তার স্তর না (ক্লায়েন্ট-সাইড কোডে
// থাকা যেকোনো মান দেখা সম্ভব), আসল নিরাপত্তা দেয় Firebase Auth + admins/{uid}। পাসকোড শুধু
// ডিভাইসে দ্রুত লক হিসেবে কাজ করে।
const MASTER_PASSCODE = "111111";

/* ==========================================================================
   শেয়ার্ড হেল্পার ফাংশন
   ========================================================================== */
function showToast(message, type = "success") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }
  const icons = { success: "✅", error: "❌", info: "ℹ️" };
  const toast = document.createElement("div");
  toast.className = "toast " + (type === "success" ? "" : type);
  toast.textContent = `${icons[type] || icons.success} ${message}`;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 350);
  }, 2800);
}

// XSS আটকাতে — টেবিল/লিস্টে ইউজার-ইনপুট বসানোর আগে ব্যবহার করতে হবে
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmtMoney(n) {
  return "৳" + Number(n || 0).toFixed(2);
}

function fmtDate(ts) {
  if (!ts) return "-";
  return new Date(ts).toLocaleString("bn-BD", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
  });
}

// সাইড-মেনু খোলা/বন্ধ করা (ইউজার অ্যাপের প্যাটার্ন অনুযায়ী)
function openMenu() {
  document.getElementById("sideMenu").classList.add("open");
  document.getElementById("menuOverlay").classList.add("show");
}
function closeMenu() {
  document.getElementById("sideMenu").classList.remove("open");
  document.getElementById("menuOverlay").classList.remove("show");
}

// বর্তমান পেজ অনুযায়ী বটম-নেভ ও সাইড-মেনুতে active লিংক হাইলাইট করা
function markActiveNav() {
  const current = window.location.pathname.split("/").pop();
  document.querySelectorAll("[data-page]").forEach((a) => {
    a.classList.toggle("active", a.getAttribute("data-page") === current);
  });
}

// পেন্ডিং অর্ডার/ডিপোজিট থাকলে বটম-নেভ ও সাইড-মেনুতে লাল ডট/কাউন্ট ব্যাজ দেখানো
function watchPendingBadges() {
  db.ref("orders").orderByChild("status").equalTo("pending").on("value", (snap) => {
    const c = snap.numChildren();
    document.querySelectorAll(".js-order-dot").forEach(el => el.style.display = c > 0 ? "block" : "none");
    document.querySelectorAll(".js-order-count").forEach(el => { el.textContent = c; el.style.display = c > 0 ? "inline-block" : "none"; });
  }, () => {
    // পারমিশন এরর হলে ব্যাজ চুপচাপ লুকিয়ে রাখা হবে, বাকি পেজ কাজ করতে থাকবে
    document.querySelectorAll(".js-order-dot, .js-order-count").forEach(el => el.style.display = "none");
  });
  db.ref("deposits").orderByChild("status").equalTo("pending").on("value", (snap) => {
    const c = snap.numChildren();
    document.querySelectorAll(".js-deposit-dot").forEach(el => el.style.display = c > 0 ? "block" : "none");
    document.querySelectorAll(".js-deposit-count").forEach(el => { el.textContent = c; el.style.display = c > 0 ? "inline-block" : "none"; });
  }, () => {
    document.querySelectorAll(".js-deposit-dot, .js-deposit-count").forEach(el => el.style.display = "none");
  });
}

/* ==========================================================================
   বটম-নেভ স্ক্রল-হাইড — নিচে স্ক্রল করলে লুকাবে, উপরে স্ক্রল করলে আবার দেখাবে
   ========================================================================== */
function initScrollHideNav() {
  const nav = document.querySelector(".bottom-nav");
  if (!nav) return;
  let lastY = window.scrollY;
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const curY = window.scrollY;
      if (curY > lastY && curY > 60) {
        nav.classList.add("hide-nav");
      } else {
        nav.classList.remove("hide-nav");
      }
      lastY = curY;
      ticking = false;
    });
  }, { passive: true });
}

/* ==========================================================================
   ক্লিপবোর্ডে কপি করা (শুধু নির্দিষ্ট কপি-বাটন থেকে ব্যবহারের জন্য)
   ========================================================================== */
function copyText(text, label) {
  if (!text) return;
  const done = () => showToast(label || "কপি হয়েছে", "success");
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
  } else {
    fallbackCopy(text, done);
  }
}
function fallbackCopy(text, done) {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    done();
  } catch (e) {
    showToast("কপি করা যায়নি", "error");
  }
}

/* ==========================================================================
   অ্যাভাটার হেল্পার — ইউজারের ছবি না থাকলে প্লেসহোল্ডার দেখাবে
   ========================================================================== */
function avatarHtml(photoUrl, extraClass, extraAttrs) {
  const src = photoUrl ? escapeHtml(photoUrl) : "https://placehold.co/80x80/000/0ff?text=U";
  return `<img class="avatar ${extraClass || ''}" src="${src}" ${extraAttrs || ''} onerror="this.onerror=null;this.src='https://placehold.co/80x80/000/0ff?text=U'">`;
}

/* ==========================================================================
   ইউজার কার্ডের অ্যাভাটারে ক্লিক করলে আসল Firebase UID দেখানো/লুকানো (কপি বাটনসহ)
   ========================================================================== */
function toggleUidReveal(boxId, uid) {
  const box = document.getElementById(boxId);
  if (!box) return;
  const show = !box.classList.contains("show");
  box.classList.toggle("show", show);
  if (show) {
    box.innerHTML = `<span>UID: ${escapeHtml(uid)}</span><button class="copy-btn" onclick="event.stopPropagation(); copyText('${uid.replace(/'/g, "\\'")}', 'UID কপি হয়েছে')"><i class="fa-solid fa-copy"></i></button>`;
  }
}

/* ==========================================================================
   সেটিংস পেজের ইনপুট লক/আনলক টগল করা
   ========================================================================== */
function toggleFieldLock(inputId, btnEl) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const unlocking = input.disabled;
  input.disabled = !unlocking;
  btnEl.classList.toggle("editing", unlocking);
  btnEl.innerHTML = unlocking ? '<i class="fa-solid fa-lock-open"></i>' : '<i class="fa-solid fa-pen"></i>';
  if (unlocking) { input.focus(); }
}

/* ==========================================================================
   নোটিফিকেশনের মেয়াদ বাকি কতক্ষণ — মানুষের পড়ার মতো টেক্সট বানানো
   ========================================================================== */
function timeLeftLabel(expiresAt) {
  if (!expiresAt) return "মেয়াদ নেই";
  const diff = expiresAt - Date.now();
  if (diff <= 0) return "মেয়াদ শেষ";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return mins + " মিনিট বাকি";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + " ঘণ্টা বাকি";
  const days = Math.floor(hrs / 24);
  return days + " দিন বাকি";
}

// মেয়াদ পার হয়ে যাওয়া নোটিফিকেশন স্বয়ংক্রিয়ভাবে ডিলিট করে দেওয়া (পেজ লোড হওয়ার সময় চেক হয়)
function cleanupExpiredNotifications() {
  return db.ref("notifications").once("value").then((snap) => {
    const now = Date.now();
    const updates = {};
    snap.forEach((child) => {
      const n = child.val();
      if (n.expiresAt && n.expiresAt <= now) updates[child.key] = null;
    });
    if (Object.keys(updates).length > 0) return db.ref("notifications").update(updates);
  }).catch(() => {});
}