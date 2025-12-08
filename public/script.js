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
  const addEventBtn = $("add-calendar-event");
if (addEventBtn) {
    addEventBtn.addEventListener("click", () => {
        openAddEventPopup();
    });
}

function openAddEventPopup() {
    const modal = document.createElement("div");
    modal.style.position = "fixed";
    modal.style.top = "0";
    modal.style.left = "0";
    modal.style.width = "100vw";
    modal.style.height = "100vh";
    modal.style.background = "rgba(0,0,0,0.4)";
    modal.style.display = "flex";
    modal.style.alignItems = "center";
    modal.style.justifyContent = "center";

    modal.innerHTML = `
        <div style="background:white; padding:20px; border-radius:10px; width:300px;">
            <h3>Add Event</h3>
            <label>Title</label>
            <input id="event-title" type="text" style="width:100%; padding:5px; margin-bottom:10px;">

            <label>Date</label>
            <input id="event-date" type="date" style="width:100%; padding:5px; margin-bottom:10px;">

            <label>Time</label>
            <input id="event-time" type="time" style="width:100%; padding:5px; margin-bottom:10px;">

            <button id="save-event">Save</button>
            <button id="cancel-event">Cancel</button>
        </div>
    `;

    document.body.appendChild(modal);

    $("cancel-event").onclick = () => modal.remove();
    $("save-event").onclick = saveEvent;
}

async function saveEvent() {
    const title = $("event-title").value.trim();
    const date = $("event-date").value;
    const time = $("event-time").value || null;

    if (!title || !date) {
        alert("Please provide a title and date.");
        return;
    }

    const user = auth.currentUser;
    if (!user) {
        alert("You must be logged in.");
        return;
    }

    try {
        await addDoc(collection(db, "reminders"), {
            uid: user.uid,
            text: title,
            date: date,
            time: time,
            repeat: "none",
            createdAt: new Date(),
        });

        alert("Event added!");

        // Refresh reminders
        const q = query(collection(db, "reminders"), where("uid", "==", user.uid));
        const snap = await getDocs(q);
        if (window._calendarInstance) window._calendarInstance.refreshWithReminders(snap.docs);

        // Close modal
        document.body.lastChild.remove();
    } catch (err) {
        alert(err.message);
    }
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
      // Get raw text
      let dateInput = $("reminder-date")?.value.trim();

      // Validate and convert MM/DD/YYYY → YYYY-MM-DD
      function convertMMDDYYYY(input) {
          const parts = input.split("/");
          if (parts.length !== 3) return null;
      
          let [mm, dd, yyyy] = parts;
          if (!mm || !dd || !yyyy) return null;
          if (mm.length > 2 || dd.length > 2 || yyyy.length !== 4) return null;
      
          // Convert to numbers
          mm = mm.padStart(2, "0");
          dd = dd.padStart(2, "0");
      
          // Check valid date
          const testDate = new Date(`${yyyy}-${mm}-${dd}`);
          if (isNaN(testDate.getTime())) return null;
      
          return `${yyyy}-${mm}-${dd}`;
      }

      const date = convertMMDDYYYY(dateInput);
      if (!date) return alert("Please enter a valid date in MM/DD/YYYY format.");

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

// ================================
// Generate the calendar structure
// ================================

// Get today's date
const today = new Date();
const year = today.getFullYear();
const month = today.getMonth(); // 0 = January

// Get number of days in the month
const daysInMonth = new Date(year, month + 1, 0).getDate();

// Get which day of the week the month starts on (0 = Sunday)
const firstDayOfWeek = new Date(year, month, 1).getDay();

// Calendar container
const calendarDiv = document.getElementById("calendar");

// ================================
// Build blank slots before day 1
// ================================
for (let i = 0; i < firstDayOfWeek; i++) {
    const blank = document.createElement("div");
    blank.classList.add("day");
    calendarDiv.appendChild(blank);
}

// ================================
// Add days with date numbers
// ================================
let dayElements = [];
for (let day = 1; day <= daysInMonth; day++) {
    const dayDiv = document.createElement("div");
    dayDiv.classList.add("day");

    const number = document.createElement("div");
    number.classList.add("date-number");
    number.textContent = day;

    dayDiv.appendChild(number);
    calendarDiv.appendChild(dayDiv);
    dayElements.push(dayDiv);
}

// =====================================
// Fetch reminders from reminders.html
// =====================================
// Expects reminders.html to contain a JSON list inside a <script> tag like:
// <script id="reminder-data" type="application/json">
//     [ {"date": 5, "text": "Doctor appointment"}, ... ]
// </script>

fetch("reminders.html")
    .then(response => response.text())
    .then(html => {
        // Create a parser to read the HTML file
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        // Get the JSON stored in the script tag
        const jsonTag = doc.getElementById("reminder-data");
        if (!jsonTag) return;

        const reminders = JSON.parse(jsonTag.textContent);

        // ================================
        // Add reminders to appropriate day
        // ================================
        reminders.forEach(rem => {
            const dayIndex = rem.date - 1;
            if (dayIndex >= 0 && dayIndex < dayElements.length) {
                const reminderDiv = document.createElement("div");
                reminderDiv.classList.add("reminder");
                reminderDiv.textContent = rem.text;
                dayElements[dayIndex].appendChild(reminderDiv);
            }
        });
    })
    .catch(err => console.error("Could not load reminders:", err));

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
      expandRepeatingReminders(reminders) {
    const expanded = [];

    const year = this.current.getFullYear();
    const month = this.current.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let rem of reminders) {
        const baseDate = new Date(rem.date);

        for (let day = 1; day <= daysInMonth; day++) {
            const current = new Date(year, month, day);

            // Convert to YYYY-MM-DD
            const ymd = toYMD(current);

            // Non-repeating, include only exact date
            if (rem.repeat === "none") {
                if (rem.date === ymd) expanded.push({ ...rem, date: ymd });
            }

            // Daily = every day
            else if (rem.repeat === "daily") {
                expanded.push({ ...rem, date: ymd });
            }

            // Weekly = same day of week
            else if (rem.repeat === "weekly") {
                if (current.getDay() === baseDate.getDay()) {
                    expanded.push({ ...rem, date: ymd });
                }
            }

            // Monthly = same day of month
            else if (rem.repeat === "monthly") {
                if (current.getDate() === baseDate.getDate()) {
                    expanded.push({ ...rem, date: ymd });
                }
            }
        }
    }

    return expanded;
}

      async refreshWithReminders(remDocs) {
        // remDocs: array of Firestore doc snapshots
        const raw = remDocs.map(d => ({ id: d.id, ...d.data() }));
        this.reminders = this.expandRepeatingReminders(raw);
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

  // find reminders for this date from the calendar instance
  const rems = this.reminders.filter(r => r.date === ymd);

  // Create cell content and bubble (rounded-square)
  const cellContent = create('div');
  cellContent.style.display = "flex";
  cellContent.style.flexDirection = "column";
  cellContent.style.alignItems = "center";

// Create the bubble container
const bubble = document.createElement("div");
bubble.classList.add("date-bubble");

// Date number at the top
const numberEl = document.createElement("div");
numberEl.classList.add("bubble-date");
numberEl.textContent = date;
bubble.appendChild(numberEl);

// Find all reminders for this date
const todaysReminders = this.reminders.filter(r => r.date === ymd);

// Yellow reminder rectangles INSIDE the bubble
todaysReminders.forEach(rem => {
    const rEl = document.createElement("div");
    rEl.classList.add("bubble-reminder");
    rEl.textContent = rem.text + (rem.time ? " @ " + rem.time : "");
    bubble.appendChild(rEl);
});

// Add the bubble to the cell visual content
cellContent.appendChild(bubble);
// Make bubble clickable like the whole cell
bubble.addEventListener("click", (ev) => {
    ev.stopPropagation();
    cell.click();
});



  cell.appendChild(cellContent);

  // clicking still shows date reminders list (no changes)
  cell.addEventListener('click', async () => {
    const list = document.getElementById('date-reminders');
    if (!list) return;
    list.innerHTML = '';

    if (rems.length === 0) {
      list.innerHTML = '<li>No reminders for this date.</li>';
      return;
    }

    rems.forEach(r => {
      const li = create('li');

      const text = create("span", {
        textContent: `${r.text}${r.time ? " @ " + r.time : ""}`
      });

      const delBtn = create("button", {
        textContent: "Delete",
        style: "margin-left:10px; padding:2px 6px;"
      });

      delBtn.addEventListener("click", async () => {
        if (!confirm("Delete this event?")) return;

        await deleteDoc(doc(collection(db, "reminders"), r.id));

        // Refresh reminders after deletion
        const user = auth.currentUser;
        const q = query(collection(db, "reminders"), where("uid", "==", user.uid));
        const snap = await getDocs(q);

        // Update the calendar
        window._calendarInstance.refreshWithReminders(snap.docs);

        // Update the list
        li.remove();
      });

      li.appendChild(text);
      li.appendChild(delBtn);
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
   //this section below is an attempt at adding todays events to home
// ------------ HOME PAGE REMINDER LIST (TODAY ONLY) ------------
  const homeList = $("home-reminder-list");

  if (homeList) {
      onAuthStateChanged(auth, async (user) => {
          if (!user) {
              homeList.innerHTML = "<li>Please log in to see reminders.</li>";
              return;
          }

          // Get today's date in YYYY-MM-DD format
          const today = new Date();
          const yyyy = today.getFullYear();
          const mm = String(today.getMonth() + 1).padStart(2, "0");
          const dd = String(today.getDate()).padStart(2, "0");
          const todayYMD = `${yyyy}-${mm}-${dd}`;

          // Query ONLY reminders for today
          const q = query(
              collection(db, "reminders"),
              where("uid", "==", user.uid),
              where("date", "==", todayYMD)
          );

          const snap = await getDocs(q);

          if (snap.empty) {
              homeList.innerHTML = `<li>No reminders for today (${todayYMD}).</li>`;
              return;
          }

          homeList.innerHTML = "";

          snap.forEach(docSnap => {
              const r = docSnap.data();

              const li = document.createElement("li");
              li.textContent = `${r.text}${r.time ? " @ " + r.time : ""}`;

              homeList.appendChild(li);
          });
      });
  }

}); // end DOMContentLoaded
document.addEventListener("DOMContentLoaded", () => {
    const currentDateEl = document.getElementById("current-date");

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const ymd = `${yyyy}-${mm}-${dd}`;

    // Display current date
    currentDateEl.textContent = `Today: ${today.toDateString()}`;

    // Create a container for today’s reminders
    const remindersContainer = document.createElement("ul");
    remindersContainer.id = "today-reminders";
    currentDateEl.insertAdjacentElement("afterend", remindersContainer);

    // Wait until auth is ready
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            remindersContainer.innerHTML = "<li>Please log in to see reminders.</li>";
            return;
        }

        try {
            // Fetch reminders for today
            const q = query(
                collection(db, "reminders"),
                where("uid", "==", user.uid),
                where("date", "==", ymd),
                orderBy("time")
            );
            const snap = await getDocs(q);

            if (snap.empty) {
                remindersContainer.innerHTML = "<li>No reminders for today.</li>";
            } else {
                remindersContainer.innerHTML = ""; // clear container
                snap.forEach(docSnap => {
                    const data = docSnap.data();
                    const li = document.createElement("li");
                    li.textContent = data.time 
                        ? `${data.time} — ${data.text}` 
                        : data.text;
                    remindersContainer.appendChild(li);
                });
            }
        } catch (err) {
            console.error(err);
            remindersContainer.innerHTML = "<li>Error loading reminders.</li>";
        }
    });
});

// === END OF FILE ===
