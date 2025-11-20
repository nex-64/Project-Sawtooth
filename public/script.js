// Wait for the page to load
document.addEventListener("DOMContentLoaded", () => {

  // ==== REMINDER SECTION ====
  const reminderForm = document.getElementById("reminder-form");
  const reminderList = document.getElementById("reminder-list");
  const reminderSection = document.getElementById("reminder-section");

  // Create a "Show Reminders" button
  const showRemindersBtn = document.createElement("button");
  showRemindersBtn.textContent = "Show All Reminders";
  showRemindersBtn.style.marginTop = "10px";
  reminderSection.appendChild(showRemindersBtn);

  reminderForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const title = document.getElementById("reminder-title").value.trim();
    const date = document.getElementById("reminder-date").value;
    const repeat = document.getElementById("reminder-repeat").value;

    if (!title || !date) return;

    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${title}</strong> — ${new Date(date).toLocaleString()} 
      <em>(${repeat})</em>
      <button class="delete-btn">❌</button>
    `;
    reminderList.appendChild(li);
    reminderForm.reset();

    li.querySelector(".delete-btn").addEventListener("click", () => {
      li.remove();
    });
  });

  // Toggle showing reminders
  showRemindersBtn.addEventListener("click", () => {
    if (reminderList.style.display === "none" || !reminderList.style.display) {
      reminderList.style.display = "block";
      showRemindersBtn.textContent = "Hide Reminders";
    } else {
      reminderList.style.display = "none";
      showRemindersBtn.textContent = "Show All Reminders";
    }
  });


  // ==== EXCLUSION SECTION ====
  const exclusionForm = document.getElementById("exclusion-form");
  const exclusionList = document.getElementById("exclusion-list");
  const exclusionSection = document.getElementById("exclusion-section");

  // Create a "Show Exclusions" button
  const showExclusionsBtn = document.createElement("button");
  showExclusionsBtn.textContent = "Show Exclusion Periods";
  showExclusionsBtn.style.marginTop = "10px";
  exclusionSection.appendChild(showExclusionsBtn);

  exclusionForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const start = document.getElementById("exclude-start").value;
    const end = document.getElementById("exclude-end").value;

    if (!start || !end) return;

    const li = document.createElement("li");
    li.innerHTML = `
      🕒 <strong>${start}</strong> to <strong>${end}</strong>
      <button class="delete-btn">❌</button>
    `;
    exclusionList.appendChild(li);
    exclusionForm.reset();

    li.querySelector(".delete-btn").addEventListener("click", () => {
      li.remove();
    });
  });

  // Toggle showing exclusions
  showExclusionsBtn.addEventListener("click", () => {
    if (exclusionList.style.display === "none" || !exclusionList.style.display) {
      exclusionList.style.display = "block";
      showExclusionsBtn.textContent = "Hide Exclusion Periods";
    } else {
      exclusionList.style.display = "none";
      showExclusionsBtn.textContent = "Show Exclusion Periods";
    }
  });


  // ==== NOTIFICATION SETTINGS ====
  const notificationForm = document.getElementById("notification-form");
  notificationForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const frequency = document.getElementById("notify-frequency").value;
    const sound = document.getElementById("notify-sound").value;

    alert(`Notification settings saved:\nFrequency: ${frequency}\nSound: ${sound}`);
  });


  // ==== CALENDAR DISPLAY ====
  const calendar = document.getElementById("calendar");
  const today = new Date();
  calendar.innerHTML = `<p>Today's date: <strong>${today.toDateString()}</strong></p>`;
});







// BELOW HERE IS THE SCRIPT FOR THE LOGIN AND SIGNUP

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDocs,
  collection,
  query,
  where
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";


// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCerVXPxCyemW3QwNGOQ7Zwa80Wubz63aU",
  authDomain: "project-sawtooth.firebaseapp.com",
  projectId: "project-sawtooth",
  storageBucket: "project-sawtooth.firebasestorage.app",
  messagingSenderId: "828109452869",
  appId: "1:828109452869:web:267762490bbbed142bd52c",
  measurementId: "G-9P3EN7Y3VC"
};


// Initialize
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Check what page we’re on:
const signupForm = document.getElementById("signup-form");
const loginForm = document.getElementById("login-form");
const logoutBtn = document.getElementById("logout-btn");
const itemForm = document.getElementById("item-form");
const itemList = document.getElementById("item-list");

// ========== SIGN UP ==========
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = e.target["signup-email"].value;
    const password = e.target["signup-password"].value;

    await createUserWithEmailAndPassword(auth, email, password);
    alert("Account created! Redirecting to home...");
    window.location.href = "home.html";
  });
}

// ========== LOGIN ==========
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = e.target["login-email"].value;
    const password = e.target["login-password"].value;

    await signInWithEmailAndPassword(auth, email, password);
    alert("Logged in! Redirecting...");
    window.location.href = "home.html";
  });
}

// ========== LOGOUT ==========
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    alert("Logged out!");
    window.location.href = "login.html";
  });
}  

// ========== ITEM HANDLING ==========
if (itemForm) {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      // Load user items
      const q = query(collection(db, "items"), where("uid", "==", user.uid));
      const querySnapshot = await getDocs(q);
      itemList.innerHTML = "";
      querySnapshot.forEach((docSnap) => {
        const item = docSnap.data();
        const li = document.createElement("li");
        li.textContent = item.text;
        itemList.appendChild(li);
      });

      // Add new item
      itemForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const text = e.target["item-input"].value;
        await setDoc(doc(collection(db, "items")), {
          uid: user.uid,
          text: text,
          createdAt: new Date(),
        });
        e.target.reset();
        alert("Item added!");
        location.reload();
      });
    } else {
      // If user not logged in, send them to login
      window.location.href = "login.html";
    }
  });
}
// ===== AUTO-REDIRECT FROM INDEX =====
if (window.location.pathname.endsWith("index.html") || window.location.pathname === "/") {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      window.location.href = "home.html";
    } else {
      window.location.href = "login.html";
    }
  });
}