const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyaZwGzzsPV1QTzX2hJz83F4tgRxPZ1pPs_vxdTJn4YJZ1ffb8CW1qwZX1rN-aAzsITbw/exec";


function $(id) {
  return document.getElementById(id);
}


/* ============================================================
   EMAIL VALIDATION
   ============================================================ */

function isValidEmail(email) {

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

}


/* ============================================================
   FIELD ERRORS
   ============================================================ */

function setFieldError(fieldId, message) {

  const input = $(fieldId);

  const field = input.closest(".field");

  const errorEl = $("err-" + fieldId);


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
  ].forEach(id => {

    setFieldError(id, "");

  });

}


/* ============================================================
   BANNER
   ============================================================ */

function showBanner(message, success) {

  const banner = $("formBanner");

  banner.textContent = message;

  banner.hidden = false;

  banner.classList.toggle(
    "ok",
    success === true
  );

}


function hideBanner() {

  $("formBanner").hidden = true;

}


/* ============================================================
   PASSWORD HASH
   ============================================================ */

async function sha256(text) {

  const data =
    new TextEncoder().encode(text);

  const hashBuffer =
    await crypto.subtle.digest(
      "SHA-256",
      data
    );

  return Array.from(
    new Uint8Array(hashBuffer)
  )
    .map(
      b => b.toString(16).padStart(2, "0")
    )
    .join("");

}


/* ============================================================
   PASSWORD VISIBILITY
   ============================================================ */

document
  .querySelectorAll(".toggle-vis")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        const target =
          $(button.dataset.target);

        if (target.type === "password") {

          target.type = "text";

          button.textContent = "Hide";

        } else {

          target.type = "password";

          button.textContent = "Show";

        }

      }
    );

  });


/* ============================================================
   PASSWORD STRENGTH
   ============================================================ */

const passwordInput =
  $("password");


passwordInput.addEventListener(
  "input",
  () => {

    const password =
      passwordInput.value;

    const bars =
      document.querySelectorAll(
        ".strength-bar span"
      );

    const text =
      $("strengthText");


    bars.forEach(bar =>
      bar.className = ""
    );


    if (!password) {

      text.textContent =
        "At least 6 characters";

      return;

    }


    let strength = 0;


    if (password.length >= 6)
      strength++;

    if (password.length >= 10)
      strength++;

    if (/[A-Z]/.test(password))
      strength++;

    if (/[0-9!@#$%^&*]/.test(password))
      strength++;


    for (let i = 0; i < strength; i++) {

      bars[i].classList.add(
        strength <= 1
          ? "weak"
          : strength <= 2
          ? "medium"
          : "strong"
      );

    }


    if (strength <= 1) {

      text.textContent = "Weak password";

    } else if (strength <= 2) {

      text.textContent =
        "Moderate password";

    } else {

      text.textContent =
        "Strong password";

    }

  }
);


/* ============================================================
   VALIDATION
   ============================================================ */

function validateForm() {

  clearAllErrors();

  let valid = true;


  const fullName =
    $("fullName").value.trim();

  const email =
    $("email").value.trim();

  const password =
    $("password").value;

  const confirmPassword =
    $("confirmPassword").value;


  if (!fullName) {

    setFieldError(
      "fullName",
      "Please enter your full name."
    );

    valid = false;

  }


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


  if (!password) {

    setFieldError(
      "password",
      "Please enter a password."
    );

    valid = false;

  } else if (password.length < 6) {

    setFieldError(
      "password",
      "Password must contain at least 6 characters."
    );

    valid = false;

  }


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


/* ============================================================
   SUBMIT
   ============================================================ */

const form =
  $("registerForm");

const submitBtn =
  $("submitBtn");


form.addEventListener(
  "submit",
  async e => {

    e.preventDefault();

    hideBanner();


    if (!validateForm())
      return;


    const fullName =
      $("fullName").value.trim();

    const email =
      $("email").value.trim();

    const password =
      $("password").value;


    setLoading(true);


    try {

      const passwordHash =
        await sha256(password);


      const body =
        new URLSearchParams({

          action:
            "registerUser",

          name:
            fullName,

          email:
            email,

          passwordHash:
            passwordHash

        });


      const response =
        await fetch(
          SCRIPT_URL,
          {
            method: "POST",
            body: body
          }
        );


      const data =
        await response.json();


      if (data.success) {

        $("sentToEmail")
          .textContent = email;


        $("registerCard")
          .hidden = true;


        $("successCard")
          .hidden = false;


      } else {

        showBanner(
          data.message ||
          "Something went wrong. Please try again.",
          false
        );

      }


    } catch (error) {

      showBanner(
        "Could not reach the server. Please check your connection.",
        false
      );


    } finally {

      setLoading(false);

    }

  }
);


/* ============================================================
   LOADING
   ============================================================ */

function setLoading(loading) {

  submitBtn.disabled =
    loading;


  submitBtn.querySelector(
    ".btn-label"
  ).textContent =
    loading
      ? "Creating account..."
      : "Create account";


  submitBtn.querySelector(
    ".btn-spinner"
  ).hidden =
    !loading;

}
