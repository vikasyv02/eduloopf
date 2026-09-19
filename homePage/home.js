const studentBanner = document.querySelector(".student-name-banner");
studentBanner.textContent = localStorage.getItem("studentName") || "Student";