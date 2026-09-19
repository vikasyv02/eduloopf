const loginForm = document.getElementById("loginForm");
const BaseURL = "https://eduloop-backend.onrender.com";
const submitButton = loginForm.querySelector('.submit-btn');
const messageBox = document.querySelector(".login-message");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  messageBox.textContent = "";
  messageBox.style.color = "red";

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    messageBox.textContent = "Please fill in all fields.";
    return;
  }

  try {
    submitButton.disabled = true;
    const originalButtonText = submitButton.textContent;
    submitButton.textContent = "Logging in...";

    const response = await fetch(`${BaseURL}/user/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const textResponse = await response.text();
    let data = {};
    try {
      data = JSON.parse(textResponse);
    } catch (err) {
      data = { message: textResponse }; 
    }

    if (response.ok && data.token) {
      messageBox.style.color = "green";
      messageBox.textContent = "Login successful! Redirecting...";

      localStorage.setItem("authToken", data.token);
      if (data.user && data.user._id) {
        localStorage.setItem("userId", data.user._id);
      }

      setTimeout(() => {
        window.location.href = "../homePage/home.html"; // Make sure this path is correct for your folder structure
      }, 1000);

    } else {
      const errorMessage = data.message || "Login failed. Please try again.";
      messageBox.textContent = errorMessage;
      
      if (errorMessage.toLowerCase().includes("not verified")) {
        messageBox.textContent = "Account not verified. Redirecting to verification...";
        localStorage.setItem("useremail", email); // Save email so the verify page knows who it is
        
        setTimeout(() => {
          window.location.href = "../signup/verify.html"; // Make sure this path is correct for your folder structure
        }, 2000);
      }

      // Stop Loading State
      submitButton.disabled = false;
      submitButton.textContent = originalButtonText;
    }

  } catch (error) {
    console.error("Connection Error:", error);
    messageBox.textContent = "Unable to connect to Eduloop servers. Try again later.";
    
    submitButton.disabled = false;
    submitButton.textContent = "Login";
  }
});