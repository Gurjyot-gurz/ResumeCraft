// ResumeCraft - Candidate Log In
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
  const form = document.getElementById("loginForm");
  const submitBtn = document.getElementById("submitBtn");
  const successBox = document.getElementById("successBox");
  const successMsg = document.getElementById("successMsg");
  const captchaBox = document.getElementById("captchaBox");
  const captchaRefresh = document.getElementById("captchaRefresh");

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

  // ---------- Captcha ----------
  function generateCaptcha() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let captcha = "";
    for (let i = 0; i < 6; i++) {
      captcha += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    captchaBox.textContent = captcha;
    captchaBox.dataset.value = captcha;
  }

  function validateCaptcha(input) {
    const value = input.value.trim().toUpperCase();
    const expected = captchaBox.dataset.value;
    if (!value) return "Please enter the captcha.";
    if (value !== expected) {
      generateCaptcha();
      return "Captcha does not match. Please try again.";
    }
    return "";
  }

  // ---------- Validators (return error string or "") ----------
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const validators = {
    email(v) {
      v = v.trim();
      if (!v) return "Email address is required.";
      if (!emailRe.test(v)) return "Enter a valid email address.";
      return "";
    },
    password(v) {
      if (!v) return "Password is required.";
      return "";
    },
    captcha(v) {
      return validateCaptcha(el("captcha"));
    },
  };

  function validateField(id) {
    const input = el(id);
    const message = validators[id](input.value);
    if (message) {
      setError(input, message);
      return false;
    }
    setValid(input);
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

  // Refresh captcha
  captchaRefresh.addEventListener("click", () => {
    generateCaptcha();
    el("captcha").value = "";
    clearState(el("captcha"));
  });

  // Generate initial captcha
  generateCaptcha();

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

    if (!allValid) {
      firstInvalid.focus();
      return;
    }

    // Build the payload
    const payload = {
      email: el("email").value.trim().toLowerCase(),
      password: el("password").value,
      remember: el("remember").checked,
    };

    submitBtn.disabled = true;
    submitBtn.textContent = "Logging in...";

    try {
      const res = await fetch(API_BASE + "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Log in failed");

      // Store auth token + user profile for future requests
      localStorage.setItem("authToken", body.token);
      if (body.user) localStorage.setItem("resumecraft_user", JSON.stringify(body.user));

      form.hidden = true;
      successMsg.textContent = `Welcome back! You're logged in as ${payload.email}. Redirecting to dashboard...`;
      successBox.hidden = false;

      setTimeout(() => {
        window.location.href = "../dashboard/Dashboard.html";
      }, 1000);
    } catch (err) {
      alert(err.message || "Something went wrong. Please try again.");
      submitBtn.disabled = false;
      submitBtn.textContent = "Log in";
    }
  });
});