const signupForm = document.getElementById("signupForm");
const BaseURL = "https://eduloop-backend.onrender.com";
const submitButton = signupForm.querySelector('.submit-btn');
const messageBox = document.querySelector(".already-exist-message");

signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!signupForm.checkValidity()) {
    signupForm.reportValidity();
    return;
  }

  messageBox.textContent = "";
  messageBox.style.color = "red";

  const fullName = document.getElementById("fullName").value.trim();
  const phoneNumber = document.getElementById("phoneNumber").value.trim();
  const email = document.getElementById("email").value.trim();
  const registrationNumber = document.getElementById("registrationNumber").value.trim();
  const password = document.getElementById("password").value.trim();
  const confirmPassword = document.getElementById("confirmPassword").value.trim();

  if (password !== confirmPassword) {
    messageBox.textContent = "Passwords do not match.";
    return;
  }

  const userData = {
    fullName,
    email,
    phoneNumber,
    registrationNumber,
    password
  };

  try {

    submitButton.disabled = true;
    const originalButtonText = submitButton.textContent;
    submitButton.textContent = "Creating Account...";

    const response = await fetch(`${BaseURL}/user/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok) {

      localStorage.removeItem("userId");
      localStorage.removeItem("authToken");

      localStorage.setItem("useremail", email);
      localStorage.setItem("studentName",fullName );
      const serverUserId = data.userId || (data.user && data.user._id);

      if (serverUserId) {
        localStorage.setItem("pendingUserId", serverUserId);
      }
      window.location.href = "verify.html";
      
    } else {

      messageBox.textContent = data.message || "Signup failed. Please try again.";
      
      submitButton.disabled = false;
      submitButton.textContent = originalButtonText;
    }

  } catch (error) {
    console.error("Connection Error:", error);
    messageBox.textContent = "Unable to connect to Eduloop servers. Try again later.";
    
    submitButton.disabled = false;
    submitButton.textContent = "Sign Up";
  }
});