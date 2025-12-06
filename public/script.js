// === FULL FEATURED script.js ===
// - Firebase-authenticated app
// - Firestore-synced reminders (create / read / delete)
// - Simple calendar grid (month view) that shows reminders on each date
// - Firestore-backed user settings (notification sound + vibration)
// This file is written to be safe across the multiple HTML pages you uploaded.

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  addDoc,
  getDocs,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// ---------- CONFIG ----------
const firebaseConfig = {
  apiKey: "AIzaSyCerVXPxCyemW3QwNGOQ7Zwa80Wubz63aU",
  authDomain: "project-sawtooth.firebaseapp.com",
  projectId: "project-sawtooth",
  storageBucket: "project-sawtooth.firebasestorage.app",
  messagingSenderId: "828109452869",
  appId: "1:828109452869:web:267762490bbbed142bd52c",
  measurementId: "G-9P3EN7Y3VC",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ---------- HELPERS ----------
const $ = (id) => document.getElementById(id);
const create = (tag, props = {}) => { const el = document.createElement(tag); Object.assign(el, props); return el; };

// Format YYYY-MM-DD
function toYMD(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// ---------- AUTH FLOW (index redirect + global state) ----------
onAuthStateChanged(auth, (user) => {
  // If on index, redirect based on auth
  if (window.location.pathname.endsWith("index.html") || window.location.pathname === "/") {
    if (user) window.location.href = "calendar.html";
    else window.location.href = "login.html";
  }
});

// ---------- DOM READY for page-specific code ----------
document.addEventListener("DOMContentLoaded", () => {
  // --- LOGIN / SIGNUP HANDLERS ---
  const loginForm = $("login-form");
  const signupForm = $("signup-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = $("login-email").value;
      const password = $("login-password").value;
      try {
        await signInWithEmailAndPassword(auth, email, password);
        window.location.href = "calendar.html";
      } catch (err) { alert(err.message); }
    });
  }
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = $("signup-email").value;
      const password = $("signup-password").value;
      try {
        await createUserWithEmailAndPassword(auth, email, password);
        alert("Account created — please log in.");
        window.location.href = "login.html";
      } catch (err) { alert(err.message); }
    });
  }

  // --- LOGOUT BUTTON (if present) ---
  const logoutBtn = $("logout-btn");
  if (logoutBtn) logoutBtn.addEventListener("click", async () => { await signOut(auth); window.location.href = "login.html"; });

  // -------------------------------
  // REMINDERS (Firestore-backed)
  // -------------------------------
  const reminderForm = $("reminder-form");
  const reminderList = $("reminder-list");

  // Function to render a reminder entry in an <ul>
  function renderReminderItem(remDoc) {
    const li = create("li");
    const data = remDoc.data();
    const dateTime = data.time ? `${data.date} ${data.time}` : data.date;
    li.innerHTML = `<strong>${escapeHtml(data.text)}</strong> — ${dateTime} <button class=rem-delete>Delete</button>`;
    li.querySelector(".rem-delete").addEventListener("click", async () => {
      if (confirm("Delete this reminder?")) {
        await deleteDoc(doc(collection(db, "reminders"), remDoc.id));
        li.remove();
      }
    });
    reminderList.appendChild(li);
  }

  // Escape helper
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c])); }

  if (reminderForm && reminderList) {
    // When user submits a reminder, save to Firestore under collection 'reminders'
    reminderForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const text = ( $("reminder-text")?.value || $("reminder-title")?.value || "").trim();
      const date = $("reminder-date")?.value;
      const time = $("reminder-time")?.value || null;
      const repeat = $("repeat")?.value || $("reminder-repeat")?.value || "none";
      if (!text || !date) return alert("Please provide a reminder text and date.");

      const user = auth.currentUser;
      if (!user) return window.location.href = "login.html";

      try {
        const ref = collection(db, "reminders");
        await addDoc(ref, {
          uid: user.uid,
          text,
          date,
          time,
          repeat,
          createdAt: new Date(),
        });
        alert("Reminder saved");
        // reload list
        await loadUserReminders();
        reminderForm.reset();
      } catch (err) { alert(err.message); }
    });

    // Load reminders once user is available
    async function loadUserReminders() {
      reminderList.innerHTML = "";
      const user = auth.currentUser;
      if (!user) return reminderList.innerHTML = "<li>Please log in to see reminders.</li>";
      const q = query(collection(db, "reminders"), where("uid", "==", user.uid), orderBy("date"));
      const snap = await getDocs(q);
      if (snap.empty) reminderList.innerHTML = "<li>No reminders added yet.</li>";
      snap.forEach((docSnap) => {
        // attach id to doc for deletion convenience
        const enriched = docSnap;
        enriched.id = docSnap.id;
        renderReminderItem(enriched);
      });

      // also refresh calendar markers if calendar exists
      if (window._calendarInstance) window._calendarInstance.refreshWithReminders(snap.docs);
    }

    onAuthStateChanged(auth, (user) => { if (user) loadUserReminders(); else reminderList.innerHTML = "<li>Not logged in.</li>"; });
  }

  // ---------------------------------
  // SETTINGS (Firestore-backed)
  // ---------------------------------
  const settingsForm = $("settings-form") || $("notification-form");
  if (settingsForm) {
    // load user's settings
    async function loadSettings() {
      const user = auth.currentUser;
      if (!user) return;
      const settingsDoc = doc(collection(db, "settings"), user.uid);
      try {
        const snap = await getDoc(settingsDoc);
        if (snap.exists()) {
          const data = snap.data();
          if ($("sound") && data.sound) $("sound").value = data.sound;
          if ($("vibration") && data.vibration) $("vibration").value = data.vibration;
          if ($("notify-frequency") && data.frequency) $("notify-frequency").value = data.frequency;
        }
      } catch (err) { console.warn(err); }
    }

    settingsForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const user = auth.currentUser;
      if (!user) return window.location.href = "login.html";
      const sound = $("sound")?.value || $("notify-sound")?.value || "chime";
      const vibration = $("vibration")?.value || "on";
      const frequency = $("notify-frequency")?.value || "daily";
      try {
        const settingsDoc = doc(collection(db, "settings"), user.uid);
        await setDoc(settingsDoc, { sound, vibration, frequency, updatedAt: new Date() });
        alert("Settings saved");
      } catch (err) { alert(err.message); }
    });

    onAuthStateChanged(auth, (user) => { if (user) loadSettings(); });
  }

  // ---------------------------------
  // CALENDAR (simple grid, client-side)
  // ---------------------------------
  const calendarContainer = $("calendar");
  if (calendarContainer) {
    class SimpleCalendar {
      constructor(container) {
        this.container = container;
        this.today = new Date();
        this.current = new Date(this.today.getFullYear(), this.today.getMonth(), 1);
        this.reminders = []; // docs
        window._calendarInstance = this;
        this.render();
      }

      async refreshWithReminders(remDocs) {
        // remDocs: array of Firestore doc snapshots
        this.reminders = remDocs.map(d => ({ id: d.id, ...d.data() }));
        this.render();
      }

      render() {
        this.container.innerHTML = "";
        const header = create("div");
        const monthLabel = create("h3", { textContent: this.current.toLocaleString(undefined, { month: 'long', year: 'numeric' }) });
        const prev = create("button", { textContent: '<' });
        const next = create("button", { textContent: '>' });
        prev.addEventListener('click', () => { this.current.setMonth(this.current.getMonth()-1); this.render(); });
        next.addEventListener('click', () => { this.current.setMonth(this.current.getMonth()+1); this.render(); });
        header.appendChild(prev); header.appendChild(monthLabel); header.appendChild(next);
        this.container.appendChild(header);

        const grid = create('table');
        const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        const thead = create('thead');
        const tr = create('tr');
        days.forEach(d => tr.appendChild(create('th',{textContent:d}))); thead.appendChild(tr); grid.appendChild(thead);

        const tbody = create('tbody');
        const firstDay = new Date(this.current.getFullYear(), this.current.getMonth(), 1);
        const startDay = firstDay.getDay();
        const daysInMonth = new Date(this.current.getFullYear(), this.current.getMonth()+1, 0).getDate();

        let row = create('tr');
        // empty cells
        for (let i=0;i<startDay;i++) row.appendChild(create('td'));
        for (let date=1; date<=daysInMonth; date++) {
          const cell = create('td');
          const dateObj = new Date(this.current.getFullYear(), this.current.getMonth(), date);
          const ymd = toYMD(dateObj);
          const cellContent = create('div'); cellContent.textContent = date;

          // find reminders for this date
          const rems = this.reminders.filter(r => r.date === ymd);
          if (rems.length) {
            const badge = create('div'); badge.textContent = `${rems.length} reminder${rems.length>1?'s':''}`;
            badge.style.fontSize = '0.8em'; badge.style.marginTop = '6px';
            cellContent.appendChild(badge);
          }

          cell.appendChild(cellContent);

          // click to list reminders for that day
          cell.addEventListener('click', async () => {
            const list = document.getElementById('date-reminders');
            if (!list) return;
            list.innerHTML = '';
            if (rems.length===0) list.innerHTML = '<li>No reminders for this date.</li>';
            rems.forEach(r => {
              const li = create('li'); li.textContent = `${r.text} ${r.time?('@ '+r.time):''}`;
              list.appendChild(li);
            });
          });

          row.appendChild(cell);
          if (row.children.length === 7) { tbody.appendChild(row); row = create('tr'); }
        }
        // fill remaining
        while (row.children.length < 7) row.appendChild(create('td'));
        tbody.appendChild(row);
        grid.appendChild(tbody);
        this.container.appendChild(grid);
      }
    }

    const cal = new SimpleCalendar(calendarContainer);

    // Keep calendar in sync with Firestore reminders when user logs in / reminders change
    onAuthStateChanged(auth, async (user) => {
      if (!user) return cal.refreshWithReminders([]);
      const q = query(collection(db, 'reminders'), where('uid','==',user.uid));
      const snap = await getDocs(q);
      cal.refreshWithReminders(snap.docs);
    });
  }

}); // end DOMContentLoaded

// === END OF FILE ===
