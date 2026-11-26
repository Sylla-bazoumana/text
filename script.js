"use strict";

const storageKey = "mes-taches-v1";
const preferencesKey = "mes-taches-preferences-v1";
const form = document.querySelector("#task-form");
const input = document.querySelector("#task-input");
const list = document.querySelector("#tasks");
const progress = document.querySelector("#progress");
const remaining = document.querySelector("#remaining");
const empty = document.querySelector("#empty");
const storageMessage = document.querySelector("#storage-message");
const themeButton = document.querySelector("#theme");
const filters = document.querySelector("#filters");
const preferences = loadPreferences();
const tasks = loadTasks();
let editingTask = null;
let draftTitle = "";

function loadPreferences() {
  const defaultTheme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  try {
    const saved = JSON.parse(localStorage.getItem(preferencesKey));
    return {
      theme: ["light", "dark"].includes(saved?.theme) ? saved.theme : defaultTheme,
      filter: ["all", "active", "completed"].includes(saved?.filter) ? saved.filter : "all",
    };
  } catch {
    return { theme: defaultTheme, filter: "all" };
  }
}

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

function savePreferences() {
  try {
    localStorage.setItem(preferencesKey, JSON.stringify(preferences));
  } catch {
    storageMessage.hidden = false;
    storageMessage.textContent = "Impossible de sauvegarder les préférences dans ce navigateur.";
  }
}

function applyTheme() {
  document.documentElement.dataset.theme = preferences.theme;
  themeButton.setAttribute("aria-pressed", String(preferences.theme === "dark"));
}

function visibleTasks() {
  if (preferences.filter === "active") return tasks.filter((task) => !task.done);
  if (preferences.filter === "completed") return tasks.filter((task) => task.done);
  return tasks;
}

function updateProgress(visibleCount) {
  const completed = tasks.filter((task) => task.done).length;
  const completedSuffix = completed > 1 ? "s" : "";
  progress.textContent = `${completed} tâche${completedSuffix} terminée${completedSuffix} sur ${tasks.length}`;

  const pending = tasks.length - completed;
  const pendingSuffix = pending > 1 ? "s" : "";
  remaining.textContent = `${pending} tâche${pendingSuffix} restante${pendingSuffix}`;
  empty.hidden = visibleCount > 0;

  if (tasks.length === 0) {
    empty.textContent = "Aucune tâche pour le moment.";
  } else if (preferences.filter === "active") {
    empty.textContent = "Aucune tâche en cours.";
  } else {
    empty.textContent = "Aucune tâche terminée.";
  }
}

function readTitle(field) {
  const title = field.value.trim();
  if (!title) {
    field.setCustomValidity("Saisissez le nom de la tâche.");
    field.reportValidity();
  }
  return title;
}

function createEditor(task) {
  const editor = document.createElement("form");
  editor.className = "editor";

  const field = document.createElement("input");
  field.type = "text";
  field.required = true;
  field.value = draftTitle;
  field.setAttribute("aria-label", "Modifier le nom de la tâche");
  field.addEventListener("input", () => {
    draftTitle = field.value;
    field.setCustomValidity("");
  });

  const save = document.createElement("button");
  save.type = "submit";
  save.className = "primary";
  save.textContent = "Enregistrer";

  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.textContent = "Annuler";

  function closeEditor() {
    editingTask = null;
    render().get(task)?.querySelector(".edit").focus();
  }

  cancel.addEventListener("click", closeEditor);
  editor.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeEditor();
  });
  editor.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = readTitle(field);
    if (!title) return;
    task.title = title;
    saveTasks();
    closeEditor();
  });

  editor.append(field, save, cancel);
  return editor;
}

function createTaskRow(task, visible, index) {
  const row = document.createElement("li");
  row.className = "task";
  if (task === editingTask) {
    row.append(createEditor(task));
    return row;
  }

  const label = document.createElement("label");
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = task.done;
  const title = document.createElement("span");
  title.textContent = task.title;
  label.append(checkbox, title);

  const edit = document.createElement("button");
  edit.type = "button";
  edit.className = "edit";
  edit.textContent = "Modifier";
  edit.setAttribute("aria-label", `Modifier la tâche « ${task.title} »`);
  edit.addEventListener("click", () => {
    editingTask = task;
    draftTitle = task.title;
    const field = render().get(task).querySelector(".editor input");
    field.focus();
    field.select();
  });

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "delete";
  remove.textContent = "Supprimer";
  remove.setAttribute("aria-label", `Supprimer la tâche « ${task.title} »`);

  function renderAndFocus(selector, keepTask) {
    const neighbor = visible[index + 1] || visible[index - 1];
    const rows = render();
    const control = (keepTask ? rows.get(task) : undefined)?.querySelector(selector)
      || rows.get(neighbor)?.querySelector(selector)
      || rows.get(neighbor)?.querySelector("input");
    (control || input).focus();
  }

  checkbox.addEventListener("change", () => {
    task.done = checkbox.checked;
    saveTasks();
    renderAndFocus('input[type="checkbox"]', true);
  });

  remove.addEventListener("click", () => {
    tasks.splice(tasks.indexOf(task), 1);
    saveTasks();
    renderAndFocus(".delete", false);
  });

  row.append(label, edit, remove);
  return row;
}

function render() {
  const visible = visibleTasks();
  const rows = new Map(visible.map((task, index) => [task, createTaskRow(task, visible, index)]));
  list.replaceChildren(...rows.values());
  updateProgress(visible.length);
  return rows;
}

input.addEventListener("input", () => input.setCustomValidity(""));
form.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = readTitle(input);
  if (!title) return;

  const task = { title, done: false };
  tasks.push(task);
  saveTasks();
  render();
  form.reset();
  input.focus();
});

themeButton.addEventListener("click", () => {
  preferences.theme = preferences.theme === "dark" ? "light" : "dark";
  applyTheme();
  savePreferences();
});

filters.addEventListener("change", (event) => {
  preferences.filter = event.target.value;
  editingTask = null;
  savePreferences();
  render();
});

applyTheme();
filters.querySelector(`input[value="${preferences.filter}"]`).checked = true;
render();
