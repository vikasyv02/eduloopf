// --- Configuration ---
// Make sure this matches your app.js route (e.g., app.use('/note', noteRouter))
const API_BASE_URL = "https://eduloop-backend.onrender.com/note";

// --- DOM Elements ---
const form = document.getElementById("resourceUploadForm");
const gridContainer = document.querySelector(".resources-grid");
const searchInput = document.querySelector(".search-input");
const filterTabs = document.querySelectorAll(".filter-tab");
const fileInput = document.getElementById("pdfUploadInput");
const fileNameDisplay = document.getElementById("fileNameDisplay");
const newResourceDetails = document.querySelector(".new-resource-container");
const menuIcon = document.querySelector(".my-menu-icon");
const navLinks = document.querySelector(".nav-links");

// --- Global State ---
let allNotes = [];
let currentFilter = "all"; // 'all', 'sem1', 'sem2', etc.

// --- Mobile Menu Toggle ---
if (menuIcon && navLinks) {
  menuIcon.addEventListener("click", function () {
    navLinks.classList.toggle("active");
    if (navLinks.classList.contains("active")) {
      menuIcon.classList.remove("fa-bars");
      menuIcon.classList.add("fa-xmark");
    } else {
      menuIcon.classList.remove("fa-xmark");
      menuIcon.classList.add("fa-bars");
    }
  });
}

// --- Utilities ---
function getAuthToken() {
  // Using 'authToken' based on your previous confirmation
  return localStorage.getItem("authToken");
}

// Decode the JWT to know who is logged in (to show the delete button only to the author)
function getUserIdFromToken() {
  const token = getAuthToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.userId || payload.id || payload._id;
  } catch (e) {
    return null;
  }
}

// --- Initialization ---
document.addEventListener("DOMContentLoaded", () => {
  loadUserAvatar();
  fetchNotes();
  setupEventListeners();
});

// --- Fetch & Render Notes ---
async function fetchNotes() {
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/getAllNotes`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) throw new Error("Failed to fetch notes from the server.");

    allNotes = await response.json();
    renderNotes();
  } catch (error) {
    console.error("Fetch Error:", error);
    gridContainer.innerHTML = `<p style="text-align:center; width: 100%; color: red;">Error: ${error.message}</p>`;
  }
}

function renderNotes() {
  gridContainer.innerHTML = ""; // Clear current grid

  // Get search term
  const searchTerm = searchInput ? searchInput.value.toLowerCase() : "";
  const currentUserId = getUserIdFromToken();

  // Filter notes based on semester tab AND search bar
  const filteredNotes = allNotes.filter((note) => {
    // Match Semester ('all' or 'sem3' etc.)
    const semesterMatch =
      currentFilter === "all" || `sem${note.semester}` === currentFilter;

    // Match Search (checking title or subject)
    const searchMatch =
      (note.title && note.title.toLowerCase().includes(searchTerm)) ||
      (note.subject && note.subject.toLowerCase().includes(searchTerm));

    return semesterMatch && searchMatch;
  });

  // Handle Empty State
  if (filteredNotes.length === 0) {
    gridContainer.innerHTML =
      '<p style="text-align:center; width: 100%; color: #666; grid-column: 1 / -1;">No study materials found for this criteria.</p>';
    return;
  }

  // Generate HTML for each note
  filteredNotes.forEach((note) => {
    // Formatting Date
    const datePosted = new Date(note.createdAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    // Safely extract uploader info
    const uploaderName = note.uploadedBy?.fullName || "Anonymous Student";
    const uploaderImage =
      note.uploadedBy?.profilePic || "../assets/profile.png";

    // Check if the current user uploaded this note
    const isAuthor =
      currentUserId === (note.uploadedBy?._id || note.uploadedBy);

    const cardHTML = `
            <article class="resource-card" data-note-id="${note._id}">
              <div class="resource-header">
                <div class="file-badge badge-pdf">PDF</div>
                <span class="course-code-tag">${note.subject}</span>
              </div>

              <div class="resource-body">
                <h2 class="resource-title">${note.title}</h2>
                <p class="resource-desc">${note.description || "No description provided."}</p>

                <p class="resource-meta">
                  <span><i class="fa-solid fa-graduation-cap"></i> Semester ${note.semester}</span>
                  <span><i class="fa-regular fa-clock"></i> ${datePosted}</span>
                </p>
              </div>

              <div class="resource-footer" style="display: flex; justify-content: space-between; align-items: center;">
                <div class="uploader-info">
                  <img src="${uploaderImage}" alt="Uploader" class="micro-avatar" />
                  <span class="uploader-name">${uploaderName}</span>
                </div>
                
                <div style="display: flex; gap: 12px; align-items: center;">
                    ${
                      isAuthor
                        ? `
                    <button class="btn-icon-danger delete-note-btn" title="Delete Note" style="background: transparent; border: none; font-size: 1.1rem; cursor: pointer; color: #ef4444;">
                      <i class="fa-solid fa-trash"></i>
                    </button>`
                        : ""
                    }
                    <a href="${note.pdfUrl}" target="_blank" download class="btn-icon-download" title="Download PDF">
                        <i class="fa-solid fa-download"></i>
                    </a>
                </div>
              </div>
            </article>
        `;
    gridContainer.insertAdjacentHTML("beforeend", cardHTML);
  });
}

function loadUserAvatar() {
  // 1. Get the image from LocalStorage
  const userImageUrl = localStorage.getItem("profilePic");

  // 2. If an image exists, find all default avatars on the page and swap them!
  if (userImageUrl) {
    const avatars = document.querySelectorAll(".user-avatar");
    avatars.forEach((img) => {
      // Only update images that are currently the default profile.png
      if (img.src.includes("profile.png")) {
        img.src = userImageUrl;
      }
    });
  }
}
// --- Event Listeners ---
function setupEventListeners() {
  // 1. Handle File Input Change (Update Label UI)
  if (fileInput && fileNameDisplay) {
    fileInput.addEventListener("change", function () {
      if (this.files && this.files.length > 0) {
        fileNameDisplay.textContent = this.files[0].name;
      } else {
        fileNameDisplay.textContent = "Choose PDF File";
      }
    });
  }

  // 2. Handle Form Submission (PDF Upload)
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.innerText;
      submitBtn.innerText = "Uploading...";
      submitBtn.disabled = true;

      const formData = new FormData(form);

      try {
        const token = getAuthToken();
        const response = await fetch(`${API_BASE_URL}/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData, // Let the browser set the multipart/form-data boundary
        });

        const result = await response.json();

        if (response.ok) {
          alert(result.message || "Note uploaded to Vault successfully!");
          form.reset();
          if (fileNameDisplay) fileNameDisplay.textContent = "Choose PDF File";
          if (newResourceDetails) newResourceDetails.removeAttribute("open"); // Close accordion
          fetchNotes(); // Refresh grid
        } else {
          alert("Upload Error: " + (result.error || result.message));
        }
      } catch (error) {
        console.error("Submission error:", error);
        alert("Failed to upload file. Check your connection to the server.");
      } finally {
        submitBtn.innerText = originalText;
        submitBtn.disabled = false;
      }
    });
  }

  // 3. Handle Search Input
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      renderNotes();
    });
  }

  // 4. Handle Semester Filter Tabs
  if (filterTabs) {
    filterTabs.forEach((tab) => {
      tab.addEventListener("click", (e) => {
        // Update active class
        filterTabs.forEach((t) => t.classList.remove("is-active"));
        e.target.classList.add("is-active");

        // Update filter state and re-render
        currentFilter = e.target.getAttribute("data-filter");
        renderNotes();
      });
    });
  }

  // 5. Handle Deleting Notes (Event Delegation)
  if (gridContainer) {
    gridContainer.addEventListener("click", async (e) => {
      const deleteBtn = e.target.closest(".delete-note-btn");
      if (!deleteBtn) return;

      if (!confirm("Are you sure you want to delete this note from the Vault?"))
        return;

      const card = deleteBtn.closest(".resource-card");
      const noteId = card.getAttribute("data-note-id");

      try {
        const token = getAuthToken();
        const response = await fetch(`${API_BASE_URL}/${noteId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          // Remove note from local array and re-render
          allNotes = allNotes.filter((n) => n._id !== noteId);
          renderNotes();
        } else {
          const result = await response.json();
          alert(
            result.message ||
              "Error: You can only delete notes that you uploaded.",
          );
        }
      } catch (error) {
        console.error("Delete error:", error);
        alert("Failed to connect to the server.");
      }
    });
  }
}
