"use strict";

const draftKey = "parast-tunde.avaldus.v1";
const panel = document.getElementById("avalduse-paneel");
const form = document.getElementById("avalduse-vorm");
const clubInput = document.getElementById("ring");
const nameInput = document.getElementById("nimi");
const savedView = document.getElementById("salvestatud-avaldus");
const savedHeading = document.getElementById("salvestatud-pealkiri");
const saveError = document.getElementById("salvestamise-viga");
const deleteError = document.getElementById("kustutamise-viga");
const fallbackDownload = document.getElementById("laadi-varu");
const cancel = document.getElementById("tyhista");

const clubs = new Map();
for (const row of document.querySelectorAll("[data-club]")) {
  const id = row.dataset.club;
  const title = row.querySelector(".club-name").textContent;
  clubs.set(id, title);
  clubInput.add(new Option(title, id));

  const choose = row.querySelector(".choose-club");
  choose.hidden = false;
  choose.addEventListener("click", () => {
    const name = form.hidden ? savedDraft?.name : nameInput.value;
    panel.open = true;
    showEditor({ club: id, name }, nameInput);
  });
}

function readDraft() {
  try {
    const value = JSON.parse(localStorage.getItem(draftKey));
    if (clubs.has(value?.club) && typeof value.name === "string") {
      const name = value.name.trim();
      if (name && name.length <= nameInput.maxLength && !/[\r\n]/.test(name)) {
        return { club: value.club, name };
      }
    }
  } catch {
    // An unavailable or malformed draft leaves the editor empty.
  }
  return null;
}

function showFieldError(field, message = "") {
  const error = document.getElementById(field.id + "-viga");
  error.textContent = message;
  error.hidden = !message;
  if (message) {
    field.setAttribute("aria-invalid", "true");
    field.setAttribute("aria-describedby", error.id);
  } else {
    field.removeAttribute("aria-invalid");
    field.removeAttribute("aria-describedby");
  }
}

function readForm() {
  const club = clubInput.value;
  const name = nameInput.value.trim();
  const clubError = clubs.has(club) ? "" : "Vali huviring.";
  const nameError = name ? "" : "Sisesta osaleja nimi.";
  showFieldError(clubInput, clubError);
  showFieldError(nameInput, nameError);

  const firstInvalid = form.querySelector('[aria-invalid="true"]');
  if (firstInvalid) {
    firstInvalid.focus();
    return null;
  }

  return { club, name };
}

function showEditor(value, focusField) {
  form.reset();
  clubInput.value = value?.club ?? "";
  nameInput.value = value?.name ?? "";
  showFieldError(clubInput);
  showFieldError(nameInput);
  saveError.textContent = "";
  fallbackDownload.hidden = true;
  cancel.hidden = !savedDraft;

  savedView.hidden = true;
  form.hidden = false;
  focusField?.focus();
}

function showSaved(moveFocus = false) {
  document.getElementById("salvestatud-ring").textContent = clubs.get(savedDraft.club);
  document.getElementById("salvestatud-nimi").textContent = savedDraft.name;
  deleteError.textContent = "";
  form.hidden = true;
  savedView.hidden = false;
  if (moveFocus) savedHeading.focus();
}

let savedDraft = readDraft();
form.noValidate = true;

for (const field of [clubInput, nameInput]) {
  field.addEventListener("input", () => {
    if (field.value.trim()) showFieldError(field);
  });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = readForm();
  if (!value) return;

  try {
    localStorage.setItem(draftKey, JSON.stringify(value));
  } catch {
    saveError.textContent = "Brauser ei saanud avaldust salvestada. Saad selle otse alla laadida.";
    fallbackDownload.hidden = false;
    return;
  }

  savedDraft = value;
  showSaved(true);
});

function downloadDraft(value) {
  const content = [
    "Avaldus huviringiga liitumiseks",
    "",
    "Huviring: " + clubs.get(value.club),
    "Osaleja: " + value.name,
    ""
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "avaldus-" + value.club + ".txt";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

document.getElementById("laadi").addEventListener("click", () => downloadDraft(savedDraft));
fallbackDownload.addEventListener("click", () => {
  const value = readForm();
  if (value) downloadDraft(value);
});

document.getElementById("muuda").addEventListener("click", () => showEditor(savedDraft, clubInput));
cancel.addEventListener("click", () => showSaved(true));

document.getElementById("kustuta").addEventListener("click", () => {
  try {
    localStorage.removeItem(draftKey);
  } catch {
    deleteError.textContent = "Brauser ei saanud avaldust kustutada. Proovi uuesti.";
    return;
  }

  savedDraft = null;
  showEditor(null, clubInput);
});

window.addEventListener("hashchange", () => {
  if (location.hash === "#registreerumine") panel.open = true;
});

window.addEventListener("storage", (event) => {
  if (event.key !== null && event.key !== draftKey) return;

  savedDraft = readDraft();
  if (!form.hidden) {
    if (!savedDraft && document.activeElement === cancel) clubInput.focus();
    cancel.hidden = !savedDraft;
  } else if (savedDraft) {
    showSaved();
  } else {
    const moveFocus = savedView.contains(document.activeElement);
    showEditor(null, moveFocus ? clubInput : null);
  }
});

document.getElementById("registreerumise-varu").hidden = true;
if (savedDraft) {
  showSaved();
} else {
  showEditor();
}
