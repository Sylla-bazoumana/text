"use strict";

const storageKey = "mes-taches-v1";
const form = document.querySelector("#task-form");
const input = document.querySelector("#task-input");
const list = document.querySelector("#tasks");
const progress = document.querySelector("#progress");
const empty = document.querySelector("#empty");
const storageMessage = document.querySelector("#storage-message");
const tasks = loadTasks();

function loadTasks() {
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored === null) return [];

    const data = JSON.parse(stored);
    if (!Array.isArray(data) || !data.every((task) =>
      task && typeof task.title === "string" && typeof task.done === "boolean"
    )) {
      throw new Error("Format de sauvegarde invalide");
    }
    return data;
  } catch {
    storageMessage.hidden = false;
    storageMessage.textContent = "Impossible de charger les tâches sauvegardées.";
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(tasks));
    storageMessage.hidden = true;
  } catch {
    storageMessage.hidden = false;
    storageMessage.textContent = "Impossible de sauvegarder les modifications dans ce navigateur.";
  }
}

function updateProgress() {
  const completed = tasks.filter((task) => task.done).length;
  const plural = completed > 1 ? "s" : "";
  progress.textContent = `${completed} tâche${plural} terminée${plural} sur ${tasks.length}`;
  empty.hidden = tasks.length > 0;
}

function appendTask(task) {
  const row = document.createElement("li");
  row.className = "task";
  const label = document.createElement("label");
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = task.done;
  const title = document.createElement("span");
  title.textContent = task.title;
  label.append(checkbox, title);

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "delete";
  remove.textContent = "Supprimer";
  remove.setAttribute("aria-label", `Supprimer la tâche « ${task.title} »`);

  checkbox.addEventListener("change", () => {
    task.done = checkbox.checked;
    saveTasks();
    updateProgress();
  });

  remove.addEventListener("click", () => {
    const neighbor = row.nextElementSibling || row.previousElementSibling;
    tasks.splice(tasks.indexOf(task), 1);
    row.remove();
    saveTasks();
    updateProgress();
    const nextControl = neighbor?.querySelector("button") || input;
    nextControl.focus();
  });

  row.append(label, remove);
  list.append(row);
}

input.addEventListener("input", () => input.setCustomValidity(""));

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = input.value.trim();
  if (!title) {
    input.setCustomValidity("Saisissez le nom de la tâche.");
    input.reportValidity();
    return;
  }

  const task = { title, done: false };
  tasks.push(task);
  appendTask(task);
  saveTasks();
  updateProgress();
  form.reset();
  input.focus();
});

tasks.forEach(appendTask);
updateProgress();
