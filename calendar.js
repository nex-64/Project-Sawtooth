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

// testchange