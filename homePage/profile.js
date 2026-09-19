const BaseURL = "https://eduloop-backend.onrender.com";

// 1. Security Check: Grab the VIP Badge
const token = localStorage.getItem("authToken");
const userId = localStorage.getItem("userId");

// If they are not logged in, kick them out immediately
if (!token || !userId) {
  window.location.href = "../Login/login.html";
}

// 2. DOM Elements
const form = document.querySelector(".settings-form");
const logoutBtn = document.getElementById("logout-btn");
const deleteBtn = document.getElementById("delete-btn");
const changeAvatarBtn = document.getElementById("changeAvatarBtn");
const avatarImg = document.querySelector(".avatar-img");
const saveButton = document.getElementById("save-changes");

// Modal Elements
const modal = document.getElementById("confirmationModal");
const cancelBtn = document.getElementById("cancel-btn");
const confirmYesBtn = document.getElementById("yes-btn");
const modalText = document.getElementById("modal-text");

// Store the selected image file here before uploading
let selectedAvatarFile = null; 

// ==========================================
// A. FETCH & DISPLAY USER DATA ON LOAD
// ==========================================
async function loadProfile() {
  try {
    const response = await fetch(`${BaseURL}/user/${userId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    const user = await response.json().catch(() => ({}));

    if (response.ok) {
      // 1. Populate Text Fields
      document.querySelector(".display-name").textContent = user.fullName || "User";
      document.getElementById("nameValue").value = user.fullName || "";
      
      document.getElementById("registration").textContent = `Reg No: ${user.registrationNumber || "N/A"}`;
      document.getElementById("registrationValue").value = user.registrationNumber || "";
      
      document.getElementById("phoneValue").value = user.phoneNumber || "";
      document.getElementById("emailValue").value = user.email || "";
      
      document.getElementById("bio-input").value = user.bio || "";
      document.getElementById("courseValue").value = user.course || "";
      document.getElementById("branchValue").value = user.branch || "";
      document.getElementById("yearValue").value = user.year || "";
      document.getElementById("semesterValue").value = user.semester || "";

      // 2. Populate Avatar if they have one
      if (user.profilePic) {
        avatarImg.src = user.profilePic;
      }

      // Update character counter for bio
      updateBioCounter();
    } else {
      console.error("Failed to load profile:", user.message);
      if (response.status === 401) forceLogout(); // Token expired
    }
  } catch (error) {
    console.error("Error fetching profile:", error);
  }
}

// ==========================================
// B. HANDLE AVATAR SELECTION (PREVIEW)
// ==========================================
// Create a hidden file input so we don't have to change your HTML
const hiddenFileInput = document.createElement("input");
hiddenFileInput.type = "file";
hiddenFileInput.accept = "image/*";
hiddenFileInput.style.display = "none";
document.body.appendChild(hiddenFileInput);

// When they click the camera button, open the hidden file selector
changeAvatarBtn.addEventListener("click", () => {
  hiddenFileInput.click();
});

// When they choose a file, show a preview
hiddenFileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    selectedAvatarFile = file; // Save it for the update form
    
    // Create a temporary URL to preview the image immediately
    const previewUrl = URL.createObjectURL(file);
    avatarImg.src = previewUrl;
  }
});

// ==========================================
// C. UPDATE PROFILE (TEXT + IMAGE)
// ==========================================
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Loading State
  const originalText = saveButton.textContent;
  saveButton.disabled = true;
  saveButton.textContent = "Saving...";

  // We use FormData because we are sending an Image (multer needs this!)
  const formData = new FormData();
  formData.append("bio", document.getElementById("bio-input").value.trim());
  formData.append("course", document.getElementById("courseValue").value.trim());
  formData.append("branch", document.getElementById("branchValue").value.trim());
  formData.append("year", document.getElementById("yearValue").value);
  formData.append("semester", document.getElementById("semesterValue").value);
  
  // If they selected a new photo, add it to the envelope
  if (selectedAvatarFile) {
    formData.append("profilePic", selectedAvatarFile);
  }

  try {
    const response = await fetch(`${BaseURL}/user/edit`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`
        // NOTE: Do NOT set "Content-Type" when using FormData. The browser does it automatically!
      },
      body: formData
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok) {
      alert("Profile updated successfully!");
      localStorage.setItem("profilePic", selectedAvatarFile ? URL.createObjectURL(selectedAvatarFile) : avatarImg.src); // Update localStorage with new avatar
      // Reload to show fresh data
      loadProfile(); 
    } else {
      alert(data.message || "Failed to update profile");
    }
  } catch (error) {
    console.error("Error updating profile:", error);
    alert("Connection error. Try again.");
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = originalText;
  }
});

// ==========================================
// D. LOGOUT
// ==========================================
function forceLogout() {
  localStorage.clear(); // Wipes the tokens
  window.location.href = "../Login/login.html";
}

logoutBtn.addEventListener("click", async () => {
  try {
    // Tell the backend to clear the cookie (optional but good practice)
    await fetch(`${BaseURL}/user/logout`, { method: "POST" });
  } catch (error) {
    console.log("Server logout failed, clearing local session anyway.");
  }
  forceLogout();
});

// ==========================================
// E. DELETE ACCOUNT & MODAL LOGIC
// ==========================================
deleteBtn.addEventListener("click", () => {
  modalText.textContent = "Are you absolutely sure you want to delete your account? All your notes and data will be permanently lost.";
  modal.classList.add("active"); // Assuming you use an .active class to show the modal in CSS
  modal.style.display = "flex";  // Fallback to make sure it shows
});

cancelBtn.addEventListener("click", (e) => {
  e.preventDefault();
  modal.classList.remove("active");
  modal.style.display = "none";
});

confirmYesBtn.addEventListener("click", async (e) => {
  e.preventDefault();
  
  confirmYesBtn.disabled = true;
  confirmYesBtn.textContent = "Deleting...";

  try {
    const response = await fetch(`${BaseURL}/user/${userId}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (response.ok) {
      alert("Account deleted successfully. We are sorry to see you go!");
      forceLogout(); // Kick them to the login screen
    } else {
      const data = await response.json().catch(() => ({}));
      alert(data.message || "Failed to delete account");
      confirmYesBtn.disabled = false;
      confirmYesBtn.textContent = "Yes";
    }
  } catch (error) {
    console.error("Error deleting account:", error);
    alert("Connection error. Try again.");
    confirmYesBtn.disabled = false;
    confirmYesBtn.textContent = "Yes";
  }
});

// ==========================================
// MISC: Character Counter for Bio
// ==========================================
function updateBioCounter() {
  const bioInput = document.getElementById("bio-input");
  const countSpan = document.getElementById("current-count");
  if (bioInput && countSpan) {
    countSpan.textContent = bioInput.value.length;
  }
}
document.getElementById("bio-input").addEventListener("input", updateBioCounter);

// INITIALIZE PAGE
document.addEventListener("DOMContentLoaded", () => {
  loadProfile();
});