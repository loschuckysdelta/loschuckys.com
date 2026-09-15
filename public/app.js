const state = {
  selectedFile: null,
  type: "",
  search: "",
  debounce: null
};

const el = {
  uploadForm: document.querySelector("#uploadForm"),
  fileInput: document.querySelector("#archivo"),
  dropzone: document.querySelector("#dropzone"),
  previewWrap: document.querySelector("#previewWrap"),
  preview: document.querySelector("#preview"),
  fileName: document.querySelector("#fileName"),
  fileSize: document.querySelector("#fileSize"),
  uploadButton: document.querySelector("#uploadButton"),
  clearButton: document.querySelector("#clearButton"),
  uploadMessage: document.querySelector("#uploadMessage"),
  progressWrap: document.querySelector("#progressWrap"),
  progressBar: document.querySelector("#progressBar"),
  progressText: document.querySelector("#progressText"),
  searchInput: document.querySelector("#searchInput"),
  filters: [...document.querySelectorAll(".filter")],
  grid: document.querySelector("#resourcesGrid"),
  emptyState: document.querySelector("#emptyState"),
  resultCount: document.querySelector("#resultCount"),
  refreshButton: document.querySelector("#refreshButton"),
  toast: document.querySelector("#toast"),
  serverStatus: document.querySelector("#serverStatus")
};

function bytes(value = 0) {
  if (!Number.isFinite(value) || value < 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let index = 0;

  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index++;
  }

  return `${size < 10 && index > 0 ? size.toFixed(1) : Math.round(size)} ${units[index]}`;
}

function dateLabel(value) {
  try {
    return new Intl.DateTimeFormat("es-PE", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(value));
  } catch {
    return "";
  }
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message) {
  el.toast.textContent = message;
  el.toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => el.toast.classList.remove("show"), 2200);
}

function setMessage(message = "", type = "") {
  el.uploadMessage.textContent = message;
  el.uploadMessage.className = `message ${type}`.trim();
}

function setProgress(percent) {
  const safe = Math.max(0, Math.min(100, Math.round(percent)));
  el.progressBar.style.width = `${safe}%`;
  el.progressText.textContent = `${safe}%`;
}

function clearSelection() {
  state.selectedFile = null;
  el.fileInput.value = "";
  el.previewWrap.hidden = true;
  el.preview.innerHTML = "";
  el.fileName.textContent = "";
  el.fileSize.textContent = "";
  el.uploadButton.disabled = true;
  el.clearButton.disabled = true;
  el.progressWrap.hidden = true;
  setProgress(0);
}

function previewFile(file) {
  if (!file) {
    clearSelection();
    return;
  }

  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");

  if (!isImage && !isVideo) {
    setMessage("Selecciona una imagen o un video permitido.", "error");
    clearSelection();
    return;
  }

  state.selectedFile = file;
  el.fileName.textContent = file.name;
  el.fileSize.textContent = bytes(file.size);
  el.preview.innerHTML = "";

  const objectUrl = URL.createObjectURL(file);
  const media = document.createElement(isImage ? "img" : "video");
  media.src = objectUrl;

  if (isVideo) {
    media.muted = true;
    media.controls = true;
  }

  media.addEventListener("load", () => URL.revokeObjectURL(objectUrl), { once: true });
  media.addEventListener("loadeddata", () => URL.revokeObjectURL(objectUrl), { once: true });

  el.preview.appendChild(media);
  el.previewWrap.hidden = false;
  el.uploadButton.disabled = false;
  el.clearButton.disabled = false;
  setMessage("");
}

function uploadResource(file) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("archivo", file);

    xhr.open("POST", "/api/resources");

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        setProgress((event.loaded / event.total) * 100);
      }
    });

    xhr.addEventListener("load", () => {
      let response = {};

      try {
        response = JSON.parse(xhr.responseText || "{}");
      } catch {}

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(response);
      } else {
        reject(new Error(response.message || "No se pudo subir el archivo."));
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Error de red durante la subida."));
    });

    xhr.send(formData);
  });
}

async function loadResources() {
  try {
    const params = new URLSearchParams();
    if (state.search) params.set("search", state.search);
    if (state.type) params.set("tipo", state.type);
    params.set("limit", "100");

    const response = await fetch(`/api/resources?${params.toString()}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "No se pudieron cargar los recursos.");
    }

    renderResources(data.items || []);
    el.resultCount.textContent = `${data.total || 0} recurso${data.total === 1 ? "" : "s"}`;
  } catch (error) {
    el.grid.innerHTML = "";
    el.emptyState.hidden = false;
    showToast(error.message);
  }
}

function renderResources(items) {
  el.grid.innerHTML = "";
  el.emptyState.hidden = items.length > 0;

  for (const item of items) {
    const card = document.createElement("article");
    card.className = "resource-card";

    const mediaHtml = item.tipo === "image"
      ? `<img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.nombreOriginal)}" loading="lazy">`
      : `<video src="${escapeHtml(item.url)}" preload="metadata" muted controls></video>`;

    card.innerHTML = `
      <div class="media">
        ${mediaHtml}
        <span class="badge">${item.tipo === "image" ? "IMAGEN" : "VIDEO"}</span>
      </div>
      <div class="card-body">
        <p class="file-title" title="${escapeHtml(item.nombreOriginal)}">${escapeHtml(item.nombreOriginal)}</p>
        <div class="meta">
          <span>${escapeHtml(bytes(item.size))}</span>
          <span>•</span>
          <span>${escapeHtml(dateLabel(item.fechaCreacion))}</span>
        </div>
        <input class="url-field" value="${escapeHtml(item.url)}" readonly aria-label="URL pública">
        <div class="card-actions">
          <button class="icon-btn copy-btn" type="button">Copiar URL</button>
          <button class="icon-btn open-btn" type="button">Abrir</button>
          <button class="icon-btn danger delete-btn" type="button">Eliminar</button>
        </div>
      </div>
    `;

    card.querySelector(".copy-btn").addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(item.url);
        showToast("URL copiada.");
      } catch {
        const input = card.querySelector(".url-field");
        input.select();
        document.execCommand("copy");
        showToast("URL copiada.");
      }
    });

    card.querySelector(".open-btn").addEventListener("click", () => {
      window.open(item.url, "_blank", "noopener,noreferrer");
    });

    card.querySelector(".delete-btn").addEventListener("click", async () => {
      const yes = confirm(`¿Eliminar "${item.nombreOriginal}"?`);
      if (!yes) return;

      try {
        const response = await fetch(`/api/resources/${encodeURIComponent(item._id)}`, {
          method: "DELETE"
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "No se pudo eliminar.");
        }

        showToast("Recurso eliminado.");
        await loadResources();
      } catch (error) {
        showToast(error.message);
      }
    });

    el.grid.appendChild(card);
  }
}

async function checkHealth() {
  try {
    const response = await fetch("/api/health", { cache: "no-store" });

    if (!response.ok) throw new Error();

    el.serverStatus.classList.remove("offline");
    el.serverStatus.classList.add("online");
    el.serverStatus.querySelector("span:last-child").textContent = "Servidor online";
  } catch {
    el.serverStatus.classList.remove("online");
    el.serverStatus.classList.add("offline");
    el.serverStatus.querySelector("span:last-child").textContent = "Servidor sin respuesta";
  }
}

el.fileInput.addEventListener("change", () => {
  previewFile(el.fileInput.files?.[0]);
});

["dragenter", "dragover"].forEach((eventName) => {
  el.dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    el.dropzone.classList.add("dragging");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  el.dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    el.dropzone.classList.remove("dragging");
  });
});

el.dropzone.addEventListener("drop", (event) => {
  const file = event.dataTransfer?.files?.[0];
  if (file) previewFile(file);
});

el.clearButton.addEventListener("click", clearSelection);

el.uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!state.selectedFile) return;

  el.uploadButton.disabled = true;
  el.clearButton.disabled = true;
  el.progressWrap.hidden = false;
  setProgress(0);
  setMessage("Subiendo archivo...");

  try {
    await uploadResource(state.selectedFile);
    setProgress(100);
    setMessage("Archivo subido correctamente.", "success");
    showToast("Archivo subido.");
    clearSelection();
    await loadResources();
  } catch (error) {
    setMessage(error.message, "error");
    showToast(error.message);
  } finally {
    el.uploadButton.disabled = !state.selectedFile;
    el.clearButton.disabled = !state.selectedFile;
  }
});

el.searchInput.addEventListener("input", () => {
  clearTimeout(state.debounce);
  state.debounce = setTimeout(() => {
    state.search = el.searchInput.value.trim();
    loadResources();
  }, 260);
});

el.filters.forEach((button) => {
  button.addEventListener("click", () => {
    el.filters.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    state.type = button.dataset.type || "";
    loadResources();
  });
});

el.refreshButton.addEventListener("click", loadResources);

checkHealth();
loadResources();
