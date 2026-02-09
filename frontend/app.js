const API_BASE = "http://127.0.0.1:8000";

const state = {
  access: localStorage.getItem("access") || "",
  refresh: localStorage.getItem("refresh") || "",
  orgId: localStorage.getItem("orgId") || "",
  memberships: [],
  projects: [],
  tasks: [],
  members: [],
  savingTasks: new Set(),
};

const views = document.querySelectorAll(".view");
const navLinks = document.querySelectorAll(".nav-link");
const orgSelect = document.getElementById("orgSelect");
const roleBadge = document.getElementById("roleBadge");
const pageTitle = document.getElementById("pageTitle");
const pageSubtitle = document.getElementById("pageSubtitle");
const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");
const modalClose = document.getElementById("modalClose");
const modalCancel = document.getElementById("modalCancel");
const modalConfirm = document.getElementById("modalConfirm");
const modalBackdrop = modal ? modal.querySelector(".modal-backdrop") : null;
let modalConfirmHandler = null;

const addMemberModal = document.getElementById("addMemberModal");
const addMemberForm = document.getElementById("addMemberForm");
const addMemberError = document.getElementById("addMemberError");
const addMemberBtn = document.getElementById("addMemberBtn");
const addMemberSubmit = document.getElementById("addMemberSubmit");
const addMemberClose = document.getElementById("addMemberClose");
const addMemberCancel = document.getElementById("addMemberCancel");
const toastContainer = document.getElementById("toastContainer");
const orgCreateModal = document.getElementById("orgCreateModal");
const orgCreateForm = document.getElementById("orgCreateForm");
const orgCreateError = document.getElementById("orgCreateError");
const orgCreateSubmit = document.getElementById("orgCreateSubmit");
const orgCreateClose = document.getElementById("orgCreateClose");
const orgCreateCancel = document.getElementById("orgCreateCancel");

function setView(viewName) {
  views.forEach((view) => {
    view.classList.toggle("active", view.dataset.view === viewName);
  });
  navLinks.forEach((link) => {
    link.classList.toggle("active", link.dataset.viewTarget === viewName);
  });
  document.body.classList.toggle("auth-view", viewName === "auth");
  const titleMap = {
    dashboard: ["Dashboard", "Stay focused across your teams and tenants."],
    projects: ["Projects", "Organize initiatives by client or team."],
    tasks: ["Tasks", "Keep delivery on track with clear actions."],
    members: ["Members", "Manage access to this workspace."],
    auth: ["Welcome", "Sign in or create a new workspace."],
  };
  const [title, subtitle] = titleMap[viewName] || ["Dashboard", ""];
  pageTitle.textContent = title;
  pageSubtitle.textContent = subtitle;
}

async function apiFetch(path, options = {}) {
  const headers = options.headers || {};
  if (state.access) {
    headers["Authorization"] = `Bearer ${state.access}`;
  }
  if (state.orgId) {
    headers["X-ORG-ID"] = state.orgId;
  }
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && state.refresh) {
    const refreshed = await refreshToken();
    if (refreshed) {
      return apiFetch(path, options);
    }
  }

  return response;
}

async function refreshToken() {
  const response = await fetch(`${API_BASE}/api/auth/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: state.refresh }),
  });
  if (!response.ok) {
    logout();
    return false;
  }
  const data = await response.json();
  state.access = data.access;
  localStorage.setItem("access", data.access);
  return true;
}

function logout() {
  state.access = "";
  state.refresh = "";
  state.orgId = "";
  state.memberships = [];
  state.projects = [];
  state.tasks = [];
  state.members = [];
  state.savingTasks.clear();
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  localStorage.removeItem("orgId");
  renderOrgs();
  renderDashboard();
  renderProjects();
  renderTasks();
  renderMembers();
  setView("auth");
}

function toast(message) {
  if (!toastContainer) return;
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  toastContainer.appendChild(el);
  setTimeout(() => {
    el.remove();
  }, 3000);
}

function openModal({
  title,
  body,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
}) {
  if (!modal) return;
  modalTitle.textContent = title;
  modalBody.textContent = body;
  modalConfirm.textContent = confirmText;
  modalCancel.textContent = cancelText;
  modalConfirmHandler = onConfirm || null;
  modal.classList.add("active");
}

function closeModal() {
  if (!modal) return;
  modal.classList.remove("active");
  modalConfirmHandler = null;
}

function openAddMemberModal() {
  if (!addMemberModal) return;
  if (addMemberBtn && addMemberBtn.disabled) return;
  addMemberError.textContent = "";
  addMemberForm.reset();
  addMemberModal.classList.add("active");
}

function closeAddMemberModal() {
  if (!addMemberModal) return;
  addMemberModal.classList.remove("active");
}

function openOrgCreateModal() {
  if (!orgCreateModal) return;
  if (orgCreateError) orgCreateError.textContent = "";
  if (orgCreateForm) orgCreateForm.reset();
  orgCreateModal.classList.add("active");
}

function closeOrgCreateModal() {
  if (!orgCreateModal) return;
  orgCreateModal.classList.remove("active");
}

function formatDate(value) {
  try {
    return new Date(value).toLocaleDateString();
  } catch (error) {
    return "";
  }
}

function renderStats() {
  const statOrgs = document.getElementById("statOrgs");
  const statProjects = document.getElementById("statProjects");
  const statTasks = document.getElementById("statTasks");
  const statMemberships = document.getElementById("statMemberships");

  if (!statOrgs) return;
  statOrgs.textContent = state.memberships.length;
  statProjects.textContent = state.projects.length;
  statTasks.textContent = state.tasks.length;
  statMemberships.textContent = state.memberships.length;
}

async function renderActivity() {
  const activityList = document.getElementById("activityList");
  if (!activityList) return;

  activityList.innerHTML = `<div class="muted">Loading activity...</div>`;
  const response = await apiFetch("/api/activity/");
  if (!response.ok) {
    activityList.innerHTML = `<div class="muted">Unable to load activity.</div>`;
    return;
  }

  const html = await response.text();
  activityList.innerHTML = html;
}


function renderRecentProjects() {
  const recentProjects = document.getElementById("recentProjects");
  if (!recentProjects) return;
  recentProjects.innerHTML = "";
  if (!state.projects.length) {
    recentProjects.innerHTML = `<div class="muted">No projects yet.</div>`;
    return;
  }

  state.projects.slice(0, 5).forEach((project) => {
    const item = document.createElement("div");
    item.className = "list-item";
    item.innerHTML = `
      <div>
        <strong>${project.name}</strong>
        <div class="muted">${project.description || "No description"}</div>
      </div>
      <div class="meta">${formatDate(project.created_at)}</div>
    `;
    recentProjects.appendChild(item);
  });
}

function getCurrentRole() {
  const membership = state.memberships.find((m) => m.organisation_id === state.orgId);
  return membership ? membership.role : "member";
}

function canAdmin() {
  const role = getCurrentRole();
  return role === "owner" || role === "admin";
}

function initialsFromName(name, email) {
  if (name) {
    const parts = name.trim().split(" ");
    const letters = parts.slice(0, 2).map((p) => p[0]);
    if (letters.length) return letters.join("").toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return "U";
}

function renderMembers() {
  const table = document.getElementById("membersTable");
  if (!table) return;
  table.innerHTML = "";

  if (!state.members.length) {
    table.innerHTML = `<div class="muted">No members yet.</div>`;
    return;
  }

  const currentRole = getCurrentRole();
  if (addMemberBtn) {
    const canAdd = ["owner", "admin"].includes(currentRole);
    addMemberBtn.disabled = !canAdd;
    addMemberBtn.textContent = canAdd ? "Add member" : "Members";
  }
  state.members.forEach((member) => {
    const row = document.createElement("div");
    row.className = "table-row";

    const roleClass = `role-${member.role}`;
    const canChangeRole = currentRole === "owner" && member.role !== "owner";
    const canRemove =
      (currentRole === "owner" && member.role !== "owner") ||
      (currentRole === "admin" && member.role !== "owner");

    row.innerHTML = `
      <div class="member-cell">
        <div class="avatar">${initialsFromName(member.name, member.email)}</div>
        <div>
          <div><strong>${member.name}</strong></div>
          <div class="muted">${member.role === "owner" ? "Workspace owner" : "Member"}</div>
        </div>
      </div>
      <div>${member.email}</div>
      <div>
        ${
          canChangeRole
            ? `<select class="input member-role" data-id="${member.id}">
                 <option value="admin" ${member.role === "admin" ? "selected" : ""}>Admin</option>
                 <option value="member" ${member.role === "member" ? "selected" : ""}>Member</option>
                 <option value="viewer" ${member.role === "viewer" ? "selected" : ""}>Viewer</option>
               </select>`
            : `<span class="role-badge ${roleClass}">${member.role}</span>`
        }
      </div>
      <div class="muted">${formatDate(member.joined_at)}</div>
      <div class="member-actions">
        ${canRemove ? `<button class="btn btn-ghost member-remove" data-id="${member.id}">Remove</button>` : ""}
      </div>
    `;
    table.appendChild(row);
  });

  table.querySelectorAll(".member-role").forEach((select) => {
    select.addEventListener("change", async (event) => {
      const memberId = event.target.dataset.id;
      const role = event.target.value;
      await updateMemberRole(memberId, role);
    });
  });

  table.querySelectorAll(".member-remove").forEach((button) => {
    button.addEventListener("click", () => {
      const memberId = button.dataset.id;
      openModal({
        title: "Remove member",
        body: "Are you sure you want to remove this member from the workspace?",
        confirmText: "Remove",
        onConfirm: () => removeMember(memberId),
      });
    });
  });
}

function renderDashboard() {
  renderStats();
  renderActivity();
  renderRecentProjects();
}

async function loadMe() {
  const response = await apiFetch("/api/auth/me/");
  if (!response.ok) return;
  const data = await response.json();
  state.memberships = data.memberships || [];
  renderOrgs();
  renderDashboard();
  updatePermissionUI();
}

function renderOrgs() {
  orgSelect.innerHTML = "";
  const orgList = document.getElementById("orgList");
  orgList.innerHTML = "";

  if (state.memberships.length === 0) {
    orgSelect.innerHTML = `<option value="">No orgs</option>`;
    const createOption = document.createElement("option");
    createOption.value = "__create__";
    createOption.textContent = "+ Create organization";
    orgSelect.appendChild(createOption);
    roleBadge.textContent = "Member";
    orgList.innerHTML = `<div class="muted">No organisations yet.</div>`;
    return;
  }

  state.memberships.forEach((m) => {
    const option = document.createElement("option");
    option.value = m.organisation_id;
    option.textContent = m.organisation_name;
    orgSelect.appendChild(option);

    const item = document.createElement("div");
    item.className = "list-item";
    item.innerHTML = `
      <div>
        <strong>${m.organisation_name}</strong>
        <div class="muted">${m.role.toUpperCase()}</div>
      </div>
      <div class="meta">${formatDate(m.joined_at)}</div>
    `;
    orgList.appendChild(item);
  });

  const createOption = document.createElement("option");
  createOption.value = "__create__";
  createOption.textContent = "+ Create organization";
  orgSelect.appendChild(createOption);

  if (!state.orgId) {
    state.orgId = state.memberships[0].organisation_id;
    localStorage.setItem("orgId", state.orgId);
  }
  orgSelect.value = state.orgId;
  updateRoleBadge();
}

function updateRoleBadge() {
  const membership = state.memberships.find((m) => m.organisation_id === state.orgId);
  roleBadge.textContent = membership ? membership.role.toUpperCase() : "MEMBER";
}

function updatePermissionUI() {
  const role = getCurrentRole();
  const projectForm = document.getElementById("projectCreateForm");
  const taskForm = document.getElementById("taskCreateForm");
  const orgForm = document.getElementById("orgCreateForm");

  if (projectForm) {
    const disabled = !canAdmin();
    projectForm.querySelectorAll("input, button").forEach((el) => {
      el.disabled = disabled;
    });
  }

  if (taskForm) {
    const disabled = role === "viewer";
    taskForm.querySelectorAll("input, select, button").forEach((el) => {
      el.disabled = disabled;
    });
  }

  if (orgForm) {
    const disabled = role === "viewer";
    orgForm.querySelectorAll("input, button").forEach((el) => {
      el.disabled = disabled;
    });
  }
}

async function createOrg(name) {
  const response = await apiFetch("/api/organisations/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    return;
  }
  await loadMe();
}

async function loadProjects() {
  if (!state.orgId) return;
  const response = await apiFetch("/api/projects/");
  if (!response.ok) return;
  state.projects = await response.json();
  renderProjects();
  renderProjectSelect();
  renderDashboard();
}

function renderProjects() {
  const list = document.getElementById("projectList");
  list.innerHTML = "";
  if (!state.projects.length) {
    list.innerHTML = `<div class="muted">No projects yet.</div>`;
    return;
  }
  state.projects.forEach((project) => {
    const item = document.createElement("div");
    item.className = "list-item";
    const actions = canAdmin()
      ? `<div class="list-actions">
           <button class="btn btn-ghost btn-sm" data-project-delete="${project.id}">Delete</button>
         </div>`
      : "";
    if (actions) item.classList.add("with-actions");
    item.innerHTML = `
      <div>
        <strong>${project.name}</strong>
        <div class="muted">${project.description || "No description"}</div>
      </div>
      <div class="meta">${formatDate(project.created_at)}</div>
      ${actions}
    `;
    list.appendChild(item);
  });

  list.querySelectorAll("[data-project-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      const projectId = button.dataset.projectDelete;
      openModal({
        title: "Delete project",
        body: "This will delete the project and its tasks. Continue?",
        confirmText: "Delete",
        onConfirm: () => deleteProject(projectId),
      });
    });
  });
}

function renderProjectSelect() {
  const select = document.getElementById("taskProjectSelect");
  select.innerHTML = "";
  state.projects.forEach((project) => {
    const option = document.createElement("option");
    option.value = project.id;
    option.textContent = project.name;
    select.appendChild(option);
  });
}

async function createProject(name, description) {
  const response = await apiFetch("/api/projects/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description }),
  });
  if (!response.ok) return;
  await loadProjects();
}

async function loadTasks() {
  if (!state.orgId) return;
  const response = await apiFetch("/api/tasks/");
  if (!response.ok) return;
  state.tasks = await response.json();
  renderTasks();
  renderDashboard();
}

function renderTasks() {
  const groups = document.getElementById("taskGroups");
  if (!groups) return;
  groups.innerHTML = "";

  const projectMap = new Map(state.projects.map((p) => [p.id, p.name]));
  const buckets = {
    todo: [],
    in_progress: [],
    done: [],
  };

  state.tasks.forEach((task) => {
    if (buckets[task.status]) {
      buckets[task.status].push(task);
    }
  });

  const sections = [
    { key: "todo", label: "TODO", badge: "status-todo" },
    { key: "in_progress", label: "IN PROGRESS", badge: "status-in-progress" },
    { key: "done", label: "DONE", badge: "status-done" },
  ];

  sections.forEach((section) => {
    const wrapper = document.createElement("div");
    wrapper.className = "task-section";
    wrapper.innerHTML = `
      <div class="task-section-header">
        <div>${section.label}</div>
        <div class="task-count">${buckets[section.key].length}</div>
      </div>
      <div class="task-list" id="taskList-${section.key}"></div>
    `;
    groups.appendChild(wrapper);

    const list = wrapper.querySelector(".task-list");
    if (!buckets[section.key].length) {
      list.innerHTML = `<div class="muted">No tasks</div>`;
      return;
    }

    buckets[section.key].forEach((task) => {
      const card = document.createElement("div");
      card.className = "task-card";
      const projectName = projectMap.get(task.project) || "Unassigned project";
      const dateLabel = task.due_date ? "Due" : "Created";
      const dateValue = task.due_date || task.created_at;
      const actions = canAdmin()
        ? `<div class="task-actions">
             <button class="btn btn-ghost btn-sm" data-task-delete="${task.id}">Delete</button>
           </div>`
        : "";
      const statusValue = task.status || section.key;
      const isSaving = state.savingTasks.has(task.id);
      card.innerHTML = `
        <div class="task-card-header">
          <div class="task-title">${task.title}</div>
          <select class="status-badge status-select ${section.badge} ${isSaving ? "is-saving" : ""}" data-task-status="${task.id}" ${isSaving ? "disabled" : ""}>
            <option value="todo" ${statusValue === "todo" ? "selected" : ""}>TODO</option>
            <option value="in_progress" ${statusValue === "in_progress" ? "selected" : ""}>IN_PROGRESS</option>
            <option value="done" ${statusValue === "done" ? "selected" : ""}>DONE</option>
          </select>
        </div>
        <div class="task-meta">
          <span>${projectName}</span>
          <span>${dateLabel}: ${formatDate(dateValue)}</span>
        </div>
        ${actions}
      `;
      list.appendChild(card);
    });
  });

  groups.querySelectorAll("[data-task-status]").forEach((select) => {
    select.addEventListener("change", async () => {
      const taskId = select.dataset.taskStatus;
      await updateTaskStatus(taskId, select.value);
    });
  });

  groups.querySelectorAll("[data-task-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      const taskId = button.dataset.taskDelete;
      openModal({
        title: "Delete task",
        body: "This task will be permanently removed. Continue?",
        confirmText: "Delete",
        onConfirm: () => deleteTask(taskId),
      });
    });
  });
}

async function createTask(title, project) {
  const response = await apiFetch("/api/tasks/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, project }),
  });
  if (!response.ok) return;
  await loadTasks();
}

async function deleteProject(projectId) {
  const response = await apiFetch(`/api/projects/${projectId}/`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    toast(payload.detail || "Unable to delete project.");
    return;
  }
  await loadProjects();
  await loadTasks();
  toast("Project deleted.");
}

async function deleteTask(taskId) {
  const response = await apiFetch(`/api/tasks/${taskId}/`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    toast(payload.detail || "Unable to delete task.");
    return;
  }
  await loadTasks();
  toast("Task deleted.");
}

function setTaskStatusLocal(taskId, status) {
  const task = state.tasks.find((t) => t.id === taskId);
  if (task) task.status = status;
}

async function updateTaskStatus(taskId, status) {
  if (state.savingTasks.has(taskId)) return;
  const previous = state.tasks.find((t) => t.id === taskId)?.status;
  state.savingTasks.add(taskId);
  setTaskStatusLocal(taskId, status);
  renderTasks();

  try {
    const response = await apiFetch(`/api/tasks/${taskId}/status/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: status.toUpperCase() }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.detail || "Unable to update status.");
    }
    const updated = await response.json();
    setTaskStatusLocal(taskId, updated.status);
  } catch (error) {
    setTaskStatusLocal(taskId, previous || "todo");
    toast(error.message || "Unable to update status.");
  } finally {
    state.savingTasks.delete(taskId);
    renderTasks();
  }
}

async function loadMembers() {
  if (!state.orgId) return;
  const response = await apiFetch(`/api/workspaces/${state.orgId}/members/`);
  if (!response.ok) return;
  const data = await response.json();
  state.members = data.members || [];
  renderMembers();
}

async function addMember(email, role) {
  const tempId = `temp-${Date.now()}`;
  const optimistic = {
    id: tempId,
    name: email.split("@")[0],
    email,
    role,
    joined_at: new Date().toISOString(),
  };
  state.members = [optimistic, ...state.members];
  renderMembers();

  const response = await apiFetch(`/api/workspaces/${state.orgId}/members/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, role }),
  });

  if (!response.ok) {
    state.members = state.members.filter((m) => m.id !== tempId);
    renderMembers();
    const payload = await response.json().catch(() => ({}));
    const message = payload.detail || "Unable to add member.";
    throw new Error(message);
  }

  const payload = await response.json();
  state.members = state.members.filter((m) => m.id !== tempId);
  state.members = [payload.member, ...state.members];
  renderMembers();
}

async function updateMemberRole(memberId, role) {
  const response = await apiFetch(
    `/api/workspaces/${state.orgId}/members/${memberId}/role`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    }
  );
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    toast(payload.detail || "Unable to update role.");
    await loadMembers();
    return;
  }
  const payload = await response.json();
  state.members = state.members.map((m) => (m.id === memberId ? payload.member : m));
  renderMembers();
  toast("Role updated.");
}

async function removeMember(memberId) {
  const response = await apiFetch(`/api/workspaces/${state.orgId}/members/${memberId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    toast(payload.detail || "Unable to remove member.");
    return;
  }
  state.members = state.members.filter((m) => m.id !== memberId);
  renderMembers();
  toast("Member removed.");
}

document.getElementById("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target;
  const btn = form.querySelector("button[type='submit']");
  const msg = document.getElementById("loginMsg");
  msg.textContent = "";
  btn.disabled = true;
  btn.textContent = "Signing in...";
  try {
    const data = Object.fromEntries(new FormData(form).entries());
    const response = await fetch(`${API_BASE}/api/auth/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      msg.textContent = "Login failed. Check credentials.";
      return;
    }
    const payload = await response.json();
    state.access = payload.access;
    state.refresh = payload.refresh;
    localStorage.setItem("access", payload.access);
    localStorage.setItem("refresh", payload.refresh);
    msg.textContent = "Login successful.";
    await loadMe();
    await loadProjects();
    await loadTasks();
    await loadMembers();
    setView("dashboard");
  } catch (error) {
    msg.textContent = "Network error. Is the backend running?";
  } finally {
    btn.disabled = false;
    btn.textContent = "Login";
  }
});

document.getElementById("registerForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target;
  const btn = form.querySelector("button[type='submit']");
  const msg = document.getElementById("registerMsg");
  msg.textContent = "";
  btn.disabled = true;
  btn.textContent = "Creating...";
  try {
    const data = Object.fromEntries(new FormData(form).entries());
    const response = await fetch(`${API_BASE}/api/auth/register/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      msg.textContent = "Registration failed. Try a stronger password.";
      return;
    }
    const payload = await response.json();
    state.access = payload.access;
    state.refresh = payload.refresh;
    localStorage.setItem("access", payload.access);
    localStorage.setItem("refresh", payload.refresh);
    msg.textContent = "Account created.";
    await loadMe();
    setView("dashboard");
  } catch (error) {
    msg.textContent = "Network error. Is the backend running?";
  } finally {
    btn.disabled = false;
    btn.textContent = "Register";
  }
});

if (orgCreateForm) {
  orgCreateForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (orgCreateError) orgCreateError.textContent = "";
    if (orgCreateSubmit) {
      orgCreateSubmit.disabled = true;
      orgCreateSubmit.textContent = "Creating...";
    }
    try {
      const data = Object.fromEntries(new FormData(event.target).entries());
      await createOrg(data.name);
      closeOrgCreateModal();
      toast("Organization created.");
    } catch (error) {
      if (orgCreateError) {
        orgCreateError.textContent = "Unable to create organization.";
      }
    } finally {
      if (orgCreateSubmit) {
        orgCreateSubmit.disabled = false;
        orgCreateSubmit.textContent = "Create";
      }
    }
  });
}

document.getElementById("projectCreateForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.target).entries());
  await createProject(data.name, data.description);
  event.target.reset();
});

document.getElementById("taskCreateForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.target).entries());
  await createTask(data.title, data.project);
  event.target.reset();
});

orgSelect.addEventListener("change", async (event) => {
  const selected = event.target.value;
  if (selected === "__create__") {
    openOrgCreateModal();
    orgSelect.value = state.orgId || "";
    return;
  }
  state.orgId = selected;
  localStorage.setItem("orgId", state.orgId);
  updateRoleBadge();
  updatePermissionUI();
  await loadProjects();
  await loadTasks();
  await loadMembers();
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  openModal({
    title: "Sign out",
    body: "Are you sure you want to sign out of this workspace?",
    confirmText: "Sign out",
    onConfirm: logout,
  });
});

navLinks.forEach((link) => {
  link.addEventListener("click", async () => {
    const target = link.dataset.viewTarget;
    setView(target);
    if (target === "projects") await loadProjects();
    if (target === "tasks") await loadTasks();
    if (target === "members") await loadMembers();
  });
});

document.querySelectorAll("[data-view-target]").forEach((button) => {
  button.addEventListener("click", async () => {
    const target = button.dataset.viewTarget;
    setView(target);
    if (target === "projects") await loadProjects();
    if (target === "tasks") await loadTasks();
    if (target === "members") await loadMembers();
  });
});

if (modalClose) modalClose.addEventListener("click", closeModal);
if (modalCancel) modalCancel.addEventListener("click", closeModal);
if (modalBackdrop) modalBackdrop.addEventListener("click", closeModal);
if (modalConfirm) {
  modalConfirm.addEventListener("click", () => {
    if (modalConfirmHandler) modalConfirmHandler();
    closeModal();
  });
}

if (addMemberBtn) addMemberBtn.addEventListener("click", openAddMemberModal);
if (addMemberClose) addMemberClose.addEventListener("click", closeAddMemberModal);
if (addMemberCancel) addMemberCancel.addEventListener("click", closeAddMemberModal);
if (addMemberModal) {
  const backdrop = addMemberModal.querySelector(".modal-backdrop");
  if (backdrop) backdrop.addEventListener("click", closeAddMemberModal);
}

if (orgCreateModal) {
  const backdrop = orgCreateModal.querySelector(".modal-backdrop");
  if (backdrop) backdrop.addEventListener("click", closeOrgCreateModal);
}

if (orgCreateClose) orgCreateClose.addEventListener("click", closeOrgCreateModal);
if (orgCreateCancel) orgCreateCancel.addEventListener("click", closeOrgCreateModal);

if (addMemberForm) {
  addMemberForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    addMemberError.textContent = "";
    addMemberSubmit.disabled = true;
    addMemberSubmit.textContent = "Inviting...";
    try {
      const data = Object.fromEntries(new FormData(addMemberForm).entries());
      await addMember(data.email, data.role);
      toast("Member added.");
      closeAddMemberModal();
    } catch (error) {
      addMemberError.textContent = error.message || "Unable to add member.";
    } finally {
      addMemberSubmit.disabled = false;
      addMemberSubmit.textContent = "Invite";
    }
  });
}

function initialize() {
  if (state.access) {
    loadMe().then(async () => {
      await loadProjects();
      await loadTasks();
      await loadMembers();
      setView("dashboard");
    });
  } else {
    setView("auth");
  }
}

initialize();
