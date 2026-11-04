// ResumeCraft - Candidate Sign Up
// Determine the API base URL (works from file://, localhost dev servers, and production)
function getApiBase() {
  const origin = window.location.origin;
  // If running from file:// or on localhost (dev server like Live Server on 5500), point to backend on 3000
  if (location.protocol === "file:" ||
      origin.includes("localhost") ||
      origin.includes("127.0.0.1") ||
      origin.includes("0.0.0.0")) {
    return "http://localhost:3000";
  }
  return origin; // production: same origin
}
const API_BASE = getApiBase();

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("signupForm");
  const submitBtn = document.getElementById("submitBtn");
  const successBox = document.getElementById("successBox");
  const successMsg = document.getElementById("successMsg");
  const strengthBar = document.getElementById("strength");
  const strengthText = document.getElementById("strengthText");

  const el = (id) => document.getElementById(id);

  // ---------- Helpers ----------
  function setError(input, message) {
    const field = input.closest(".field");
    field.classList.add("invalid");
    field.classList.remove("valid");
    field.querySelector(".error").textContent = message;
  }

  function setValid(input) {
    const field = input.closest(".field");
    field.classList.remove("invalid");
    field.classList.add("valid");
    field.querySelector(".error").textContent = "";
  }

  function clearState(input) {
    const field = input.closest(".field");
    field.classList.remove("invalid", "valid");
    field.querySelector(".error").textContent = "";
  }

  // ---------- Resume Upload ----------
  const resumeInput = el("resume");
  const resumeUpload = el("resumeUpload");
  const resumePreview = el("resumePreview");
  const resumeFileName = el("resumeFileName");
  const resumeFileSize = el("resumeFileSize");
  const resumeRemove = el("resumeRemove");

  const ALLOWED_TYPES = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
  const MAX_SIZE = 20 * 1024 * 1024; // 20MB

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function validateResume(file) {
    if (!file) return "Resume is required.";
    // Check file extension - browsers sometimes report incorrect MIME types for DOC/DOCX
    const ext = file.name.split('.').pop().toLowerCase();
    const allowedExts = ['pdf', 'doc', 'docx'];
    if (!allowedExts.includes(ext)) return "Only PDF, DOC, or DOCX files are allowed.";
    // For PDF, verify MIME type if available (some browsers report docx incorrectly)
    if (ext === 'pdf' && file.type && file.type !== 'application/pdf') return "Only PDF, DOC, or DOCX files are allowed.";
    if (file.size > MAX_SIZE) return "File size must be less than 20MB.";
    return "";
  }

  function showPreview(file) {
    resumeFileName.textContent = file.name;
    resumeFileSize.textContent = formatFileSize(file.size);
    resumeUpload.classList.add("has-file");
    resumePreview.hidden = false;
    resumeUpload.querySelector(".file-upload-content").hidden = true;
  }

  function hidePreview() {
    resumeUpload.classList.remove("has-file");
    resumePreview.hidden = true;
    resumeUpload.querySelector(".file-upload-content").hidden = false;
    resumeInput.value = "";
  }

  // Drag and drop
  ["dragenter", "dragover", "dragleave", "drop"].forEach((evt) => {
    resumeUpload.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  });

  ["dragenter", "dragover"].forEach((evt) => {
    resumeUpload.addEventListener(evt, () => resumeUpload.classList.add("drag-over"));
  });

  ["dragleave", "drop"].forEach((evt) => {
    resumeUpload.addEventListener(evt, () => resumeUpload.classList.remove("drag-over"));
  });

  resumeUpload.addEventListener("drop", (e) => {
    const file = e.dataTransfer.files[0];
    if (file) {
      resumeInput.files = e.dataTransfer.files;
      const message = validateResume(file);
      if (message) {
        setError(resumeInput, message);
        resumeUpload.classList.add("invalid");
        resumeUpload.classList.remove("valid");
      } else {
        setValid(resumeInput);
        resumeUpload.classList.add("valid");
        resumeUpload.classList.remove("invalid");
        showPreview(file);
      }
    }
  });

  // Click to browse
  resumeUpload.querySelector(".upload-link").addEventListener("click", (e) => {
    e.preventDefault();
    resumeInput.click();
  });

  resumeUpload.querySelector(".file-upload-content").addEventListener("click", () => {
    resumeInput.click();
  });

  resumeInput.addEventListener("change", () => {
    const file = resumeInput.files[0];
    if (file) {
      const message = validateResume(file);
      if (message) {
        setError(resumeInput, message);
        resumeUpload.classList.add("invalid");
        resumeUpload.classList.remove("valid");
        hidePreview();
      } else {
        setValid(resumeInput);
        resumeUpload.classList.add("valid");
        resumeUpload.classList.remove("invalid");
        showPreview(file);
      }
    } else {
      clearState(resumeInput);
      resumeUpload.classList.remove("invalid", "valid");
      hidePreview();
    }
  });

  resumeRemove.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    hidePreview();
    clearState(resumeInput);
    resumeUpload.classList.remove("invalid", "valid");
  });

  // ---------- Validators (return error string or "") ----------
  const nameRe = /^[A-Za-z][A-Za-z\s.'-]*$/;
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const validators = {
    firstName(v) {
      v = v.trim();
      if (!v) return "First name is required.";
      if (v.length < 2) return "First name must be at least 2 characters.";
      if (!nameRe.test(v)) return "Use letters only.";
      return "";
    },
    middleName(v) {
      v = v.trim();
      if (!v) return ""; // optional
      if (!nameRe.test(v)) return "Use letters only.";
      return "";
    },
    lastName(v) {
      v = v.trim();
      if (!v) return "Last name is required.";
      if (!nameRe.test(v)) return "Use letters only.";
      return "";
    },
    email(v) {
      v = v.trim();
      if (!v) return "Email address is required.";
      if (!emailRe.test(v)) return "Enter a valid email address.";
      return "";
    },
    phone(v) {
      const digits = v.replace(/[\s-]/g, "");
      if (!digits) return "Phone number is required.";
      if (!/^\d+$/.test(digits)) return "Digits only, please.";
      if (digits.length < 7 || digits.length > 14) return "Enter a valid phone number.";
      if (el("countryCode").value === "+91" && !/^[6-9]\d{9}$/.test(digits)) {
        return "Enter a valid 10-digit Indian mobile number.";
      }
      return "";
    },
    password(v) {
      if (!v) return "Password is required.";
      if (v.length < 8) return "Password must be at least 8 characters.";
      if (!/[a-z]/.test(v)) return "Add a lowercase letter.";
      if (!/[A-Z]/.test(v)) return "Add an uppercase letter.";
      if (!/\d/.test(v)) return "Add a number.";
      if (!/[^A-Za-z0-9]/.test(v)) return "Add a symbol (e.g. ! @ # $).";
      return "";
    },
    confirmPassword(v) {
      if (!v) return "Please confirm your password.";
      if (v !== el("password").value) return "Passwords do not match.";
      return "";
    },
    candidateLevel(v) {
      return v ? "" : "Please select your candidate level.";
    },
  };

  function validateField(id) {
    const input = el(id);
    const message = validators[id](input.value);
    if (message) {
      setError(input, message);
      return false;
    }
    // Don't show green tick on empty optional field
    if (id === "middleName" && !input.value.trim()) clearState(input);
    else setValid(input);
    return true;
  }

  function validateTerms() {
    const box = el("terms");
    const field = box.closest(".field");
    if (!box.checked) {
      field.classList.add("invalid");
      field.querySelector(".error").textContent = "You must accept the terms to continue.";
      return false;
    }
    field.classList.remove("invalid");
    field.querySelector(".error").textContent = "";
    return true;
  }

  // ---------- Live validation ----------
  Object.keys(validators).forEach((id) => {
    const input = el(id);
    const evt = input.tagName === "SELECT" ? "change" : "blur";
    input.addEventListener(evt, () => validateField(id));
    input.addEventListener("input", () => {
      if (input.closest(".field").classList.contains("invalid")) validateField(id);
    });
  });

  el("countryCode").addEventListener("change", () => {
    if (el("phone").value) validateField("phone");
  });

  el("terms").addEventListener("change", validateTerms);

  // Phone: keep digits, spaces and dashes only
  el("phone").addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/[^\d\s-]/g, "");
  });

  // Re-check confirm password when password changes
  el("password").addEventListener("input", () => {
    updateStrength(el("password").value);
    if (el("confirmPassword").value) validateField("confirmPassword");
  });

  // ---------- Password strength ----------
  function updateStrength(v) {
    let score = 0;
    if (v.length >= 8) score++;
    if (/[a-z]/.test(v) && /[A-Z]/.test(v)) score++;
    if (/\d/.test(v)) score++;
    if (/[^A-Za-z0-9]/.test(v)) score++;
    if (!v) score = 0;

    strengthBar.dataset.level = score;
    const labels = ["Min. 8 characters with upper, lower, number & symbol.", "Weak", "Fair", "Good", "Strong"];
    strengthText.textContent = score === 0 ? labels[0] : "Password strength: " + labels[score];
  }

  // ---------- Show / hide password ----------
  document.querySelectorAll(".toggle-pw").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = el(btn.dataset.target);
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.textContent = show ? "Hide" : "Show";
      btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
    });
  });

  // ---------- Submit ----------
  form.addEventListener("submit", async (e) => {
    console.log("[SignUp] Form submit triggered");
    e.preventDefault();

    const ids = Object.keys(validators);
    let allValid = true;
    let firstInvalid = null;

    ids.forEach((id) => {
      if (!validateField(id)) {
        allValid = false;
        if (!firstInvalid) firstInvalid = el(id);
      }
    });
    if (!validateTerms()) {
      allValid = false;
      if (!firstInvalid) firstInvalid = el("terms");
    }

    console.log("[SignUp] Validation result:", allValid, "firstInvalid:", firstInvalid);

    if (!allValid) {
      console.log("[SignUp] Validation failed, focusing first invalid");
      firstInvalid.focus();
      return;
    }

    // Validate resume
    const resumeFile = resumeInput.files[0];
    console.log("[SignUp] Resume file:", resumeFile);
    const resumeError = validateResume(resumeFile);
    if (resumeError) {
      setError(resumeInput, resumeError);
      resumeUpload.classList.add("invalid");
      resumeUpload.classList.remove("valid");
      allValid = false;
      if (!firstInvalid) firstInvalid = resumeInput;
    }

    if (!allValid) {
      console.log("[SignUp] Resume validation failed");
      firstInvalid.focus();
      return;
    }

    // Build the payload (password is only sent to the server, never stored in the browser)
    const firstName = el("firstName").value.trim();
    const lastName = el("lastName").value.trim();
    const email = el("email").value.trim().toLowerCase();
    const phone = el("countryCode").value + el("phone").value.replace(/[\s-]/g, "");
    const candidateLevel = el("candidateLevel").value;
    const candidateLevelLabel = el("candidateLevel").selectedOptions[0].text;

    // The resume is sent as multipart/form-data so the server can stream it
    // straight to S3 (or the local fallback) — never held in browser memory.
    const data = new FormData();
    data.append("firstName", firstName);
    data.append("middleName", el("middleName").value.trim() || "");
    data.append("lastName", lastName);
    data.append("email", email);
    data.append("phone", phone);
    data.append("password", el("password").value);
    data.append("candidateLevel", candidateLevel);
    data.append("candidateLevelLabel", candidateLevelLabel);
    data.append("terms", "on");
    if (resumeFile) data.append("resume", resumeFile, resumeFile.name);

    console.log("[SignUp] FormData built, API_BASE:", API_BASE);

    submitBtn.disabled = true;
    submitBtn.textContent = "Creating account...";
    submitBtn.classList.add("loading");

    // Add a timeout to prevent "failed to fetch" on slow S3 uploads
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    try {
      console.log("[SignUp] Sending fetch request...");
      const res = await fetch(API_BASE + "/api/auth/signup", {
        method: "POST",
        body: data,
        signal: controller.signal,
      });
      console.log("[SignUp] Response received:", res.status, res.statusText);
      clearTimeout(timeoutId);
      const body = await res.json().catch(() => ({}));
      console.log("[SignUp] Response body:", body);
      if (!res.ok) {
        // Surface server-side resume errors on the upload field
        if (body.field === "resume") {
          setError(resumeInput, body.error || "Resume upload failed.");
          resumeUpload.classList.add("invalid");
          resumeUpload.classList.remove("valid");
        }
        throw new Error(body.error || "Sign up failed. Please try again.");
      }

      form.hidden = true;
      successMsg.textContent =
        `Thanks, ${firstName}! Your ${candidateLevelLabel} candidate account has been created for ${email}. Redirecting to dashboard...`;
      successBox.hidden = false;

      // Store auth token + user profile for the dashboard to use immediately
      localStorage.setItem("authToken", body.token);
      if (body.user) localStorage.setItem("resumecraft_user", JSON.stringify(body.user));

      setTimeout(() => {
        window.location.href = "../dashboard/Dashboard.html";
      }, 1000);
    } catch (err) {
      clearTimeout(timeoutId);
      console.error("[SignUp] Error:", err);
      if (err.name === "AbortError") {
        alert("The request took too long. Please check your connection and try again.");
      } else {
        alert(err.message || "Something went wrong. Please try again.");
      }
      submitBtn.disabled = false;
      submitBtn.textContent = "Create account";
      submitBtn.classList.remove("loading");
    }
  });
});
