const BaseURL = "https://eduloop-backend.onrender.com";
const verifyForm = document.querySelector(".verify-form");
const messageBox = document.querySelector(".invalid-code");
const submitButton = verifyForm.querySelector('.submit-btn');

verifyForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  messageBox.textContent = "";
  messageBox.style.color = "red";

  const otp = verifyForm.elements["verificationCode"].value.trim();

  if (!otp) {
    messageBox.textContent = "Please enter the OTP.";
    return;
  }

  let pendingUserId = localStorage.getItem("pendingUserId");

  if (pendingUserId === "undefined" || pendingUserId === "null") {
    pendingUserId = null;
  }

  if (!pendingUserId) {
    messageBox.textContent = "Missing signup details. Please sign up again.";
    return;
  }

  const payload = {
    userId: pendingUserId,
    otp: otp
  };

  try {
    submitButton.disabled = true;
    const originalButtonText = submitButton.textContent;
    submitButton.textContent = "Verifying...";

    const response = await fetch(`${BaseURL}/user/verifyUser`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok && data.message === "Otp verified") {
      
      messageBox.textContent = "OTP verified successfully!";
      messageBox.style.color = "green"; 

      localStorage.removeItem("pendingUserId");
      localStorage.removeItem("useremail");

      setTimeout(() => {
        window.location.href = "../Login/login.html"; 
      }, 1000);

    } else {
      messageBox.textContent = data.message || "Invalid OTP. Please try again.";
      
      submitButton.disabled = false;
      submitButton.textContent = originalButtonText;
    }

  } catch (error) {
    console.error("Connection Error:", error);
    messageBox.textContent = "Unable to connect to Eduloop servers. Try again later.";
    
    submitButton.disabled = false;
    submitButton.textContent = "Verify";
  }
});