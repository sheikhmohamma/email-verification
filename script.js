// ============================================================
// GOOGLE APPS SCRIPT WEB APP URL
// ============================================================
const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyaZwGzzsPV1QTzX2hJz83F4tgRxPZ1pPs_vxdTJn4YJZ1ffb8CW1qwZX1rN-aAzsITbw/exec";

// ============================================================
// HELPERS
// ============================================================

function $(id) {
  return document.getElementById(id);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function setFieldError(fieldId, message) {
  const field = $(fieldId)?.closest(".field");
  const errorEl = $("err-" + fieldId);

  if (!field || !errorEl) return;

  if (message) {
    field.classList.add("has-error");
    errorEl.textContent = message;
  } else {
    field.classList.remove("has-error");
    errorEl.textContent = "";
  }
}

function clearAllErrors() {
  [
    "fullName",
    "email",
    "password",
    "confirmPassword"
  ].forEach((id) => {
    setFieldError(id, "");
  });
}

function showBanner(message, ok = false) {
  const banner = $("formBanner");

  if (!banner) return;

  banner.textContent = message;
  banner.hidden = false;
  banner.classList.toggle("ok", ok);
}

function hideBanner() {
  const banner = $("formBanner");

  if (banner) {
    banner.hidden = true;
  }
}

// ============================================================
// PASSWORD HASH
// ============================================================

async function sha256(text) {
  const data = new TextEncoder().encode(text);

  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    data
  );

  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

// ============================================================
// PASSWORD SHOW / HIDE
// ============================================================

document.querySelectorAll(".toggle-vis").forEach((button) => {

  button.addEventListener("click", () => {

    const targetId = button.getAttribute("data-target");
    const input = $(targetId);

    if (!input) return;

    const showing = input.type === "text";

    input.type = showing ? "password" : "text";

    button.textContent = showing ? "👁" : "🙈";

  });

});

// ============================================================
// FORM VALIDATION
// ============================================================

function validateForm() {

  clearAllErrors();

  let valid = true;

  const fullName = $("fullName").value.trim();
  const email = $("email").value.trim();
  const password = $("password").value;
  const confirmPassword = $("confirmPassword").value;

  // Name
  if (!fullName) {

    setFieldError(
      "fullName",
      "Please enter your full name."
    );

    valid = false;
  }

  // Email
  if (!email) {

    setFieldError(
      "email",
      "Please enter your email address."
    );

    valid = false;

  } else if (!isValidEmail(email)) {

    setFieldError(
      "email",
      "Please enter a valid email address."
    );

    valid = false;
  }

  // Password
  if (!password) {

    setFieldError(
      "password",
      "Please enter a password."
    );

    valid = false;

  } else if (password.length < 6) {

    setFieldError(
      "password",
      "Password must be at least 6 characters."
    );

    valid = false;
  }

  // Confirm password
  if (!confirmPassword) {

    setFieldError(
      "confirmPassword",
      "Please confirm your password."
    );

    valid = false;

  } else if (password !== confirmPassword) {

    setFieldError(
      "confirmPassword",
      "Passwords do not match."
    );

    valid = false;
  }

  return valid;
}

// ============================================================
// LOADING STATE
// ============================================================

function setLoading(isLoading) {

  const submitBtn = $("submitBtn");

  if (!submitBtn) return;

  submitBtn.disabled = isLoading;

  const label = submitBtn.querySelector(".btn-label");
  const spinner = submitBtn.querySelector(".btn-spinner");

  if (label) {
    label.textContent = isLoading
      ? "Creating account..."
      : "Create account";
  }

  if (spinner) {
    spinner.hidden = !isLoading;
  }
}

// ============================================================
// REGISTER USER
// ============================================================

const form = $("registerForm");

if (form) {

  form.addEventListener("submit", async (event) => {

    event.preventDefault();

    hideBanner();

    // Validate form
    if (!validateForm()) {
      return;
    }

    const fullName = $("fullName").value.trim();
    const email = $("email").value.trim().toLowerCase();
    const password = $("password").value;

    setLoading(true);

    try {

      // --------------------------------------------------------
      // Hash password in browser
      // --------------------------------------------------------

      const passwordHash = await sha256(password);

      // --------------------------------------------------------
      // Prepare request
      // --------------------------------------------------------

      const body = new URLSearchParams();

      body.append("action", "registerUser");
      body.append("name", fullName);
      body.append("email", email);
      body.append("passwordHash", passwordHash);

      console.log("Sending registration request...");

      // --------------------------------------------------------
      // Send request to Google Apps Script
      // --------------------------------------------------------

      const response = await fetch(SCRIPT_URL, {
        method: "POST",
        body: body,
        redirect: "follow"
      });

      console.log("Response status:", response.status);
      console.log("Response URL:", response.url);

      // --------------------------------------------------------
      // Check HTTP response
      // --------------------------------------------------------

      if (!response.ok) {

        throw new Error(
          "Server returned HTTP " + response.status
        );
      }

      // --------------------------------------------------------
      // Read JSON response
      // --------------------------------------------------------

      const data = await response.json();

      console.log("Server response:", data);

      // --------------------------------------------------------
      // Registration successful
      // --------------------------------------------------------

      if (data.success) {

        $("sentToEmail").textContent = email;

        $("registerCard").hidden = true;

        $("successCard").hidden = false;

      }

      // --------------------------------------------------------
      // Registration failed
      // --------------------------------------------------------

      else {

        showBanner(
          data.message ||
          "Something went wrong. Please try again.",
          false
        );
      }

    } catch (error) {

      console.error(
        "Registration error:",
        error
      );

      showBanner(
        "Could not connect to the server. " +
        "Please check the browser console for details.",
        false
      );

    } finally {

      setLoading(false);

    }

  });

}
