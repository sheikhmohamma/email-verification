// ============================================================
// GOOGLE APPS SCRIPT WEB APP URL
// Same URL used in script.js
// ============================================================

const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyaZwGzzsPV1QTzX2hJz83F4tgRxPZ1pPs_vxdTJn4YJZ1ffb8CW1qwZX1rN-aAzsITbw/exec";


// ============================================================
// HELPER
// ============================================================

function $(id) {
  return document.getElementById(id);
}


// ============================================================
// SHOW ONLY ONE CARD
// ============================================================

function showOnly(id) {

  const cards = [
    "checkingCard",
    "verifiedCard",
    "invalidCard",
    "resendCard"
  ];

  cards.forEach((cardId) => {

    const card = $(cardId);

    if (card) {
      card.hidden = cardId !== id;
    }

  });
}


// ============================================================
// EMAIL VALIDATION
// ============================================================

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}


// ============================================================
// VERIFY EMAIL ON PAGE LOAD
// ============================================================

async function verifyFromURL() {

  const params = new URLSearchParams(
    window.location.search
  );

  const token = params.get("token");


  // ----------------------------------------------------------
  // No token
  // ----------------------------------------------------------

  if (!token) {

    console.log("No verification token found.");

    showOnly("resendCard");

    return;
  }


  // ----------------------------------------------------------
  // Token found
  // ----------------------------------------------------------

  console.log("Verification token found.");

  showOnly("checkingCard");


  try {

    const body = new URLSearchParams();

    body.append("action", "verifyEmail");
    body.append("token", token);


    console.log("Sending verification request...");


    const response = await fetch(SCRIPT_URL, {

      method: "POST",

      body: body,

      redirect: "follow"

    });


    console.log(
      "Verification response status:",
      response.status
    );

    console.log(
      "Verification response URL:",
      response.url
    );


    // --------------------------------------------------------
    // Check HTTP response
    // --------------------------------------------------------

    if (!response.ok) {

      throw new Error(
        "Server returned HTTP " + response.status
      );

    }


    // --------------------------------------------------------
    // Read response
    // --------------------------------------------------------

    const data = await response.json();

    console.log(
      "Verification server response:",
      data
    );


    // --------------------------------------------------------
    // Verification successful
    // --------------------------------------------------------

    if (data.success) {

      showOnly("verifiedCard");

    }

    // --------------------------------------------------------
    // Verification failed
    // --------------------------------------------------------

    else {

      showOnly("invalidCard");

      console.warn(
        "Verification failed:",
        data.message
      );

    }

  } catch (error) {

    console.error(
      "Verification error:",
      error
    );

    showOnly("invalidCard");

  }

}


// ============================================================
// SHOW RESEND CARD BUTTON
// ============================================================

const showResendBtn = $("showResendBtn");

if (showResendBtn) {

  showResendBtn.addEventListener(
    "click",
    () => showOnly("resendCard")
  );

}


// ============================================================
// RESEND VERIFICATION EMAIL
// ============================================================

const resendForm = $("resendForm");
const resendBtn = $("resendBtn");


if (resendForm && resendBtn) {

  resendForm.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();


      const banner = $("resendBanner");
      const emailInput = $("resendEmail");
      const errorEl = $("err-resendEmail");

      if (!banner || !emailInput || !errorEl) {
        console.error(
          "Required resend form elements are missing."
        );
        return;
      }


      // ------------------------------------------------------
      // Reset banner
      // ------------------------------------------------------

      banner.hidden = true;
      banner.classList.remove("ok");


      // ------------------------------------------------------
      // Get email
      // ------------------------------------------------------

      const email = emailInput.value
        .trim()
        .toLowerCase();


      const field = emailInput.closest(".field");


      // ------------------------------------------------------
      // Validate email
      // ------------------------------------------------------

      if (!email || !isValidEmail(email)) {

        if (field) {
          field.classList.add("has-error");
        }

        errorEl.textContent =
          "Please enter a valid email address.";

        return;
      }


      // Valid
      if (field) {
        field.classList.remove("has-error");
      }

      errorEl.textContent = "";


      // ------------------------------------------------------
      // Loading state
      // ------------------------------------------------------

      resendBtn.disabled = true;


      const label =
        resendBtn.querySelector(".btn-label");

      const spinner =
        resendBtn.querySelector(".btn-spinner");


      if (label) {
        label.textContent = "Sending...";
      }

      if (spinner) {
        spinner.hidden = false;
      }


      // ------------------------------------------------------
      // Send request
      // ------------------------------------------------------

      try {

        const body = new URLSearchParams();

        body.append(
          "action",
          "resendVerification"
        );

        body.append(
          "email",
          email
        );


        console.log(
          "Sending resend request..."
        );


        const response = await fetch(
          SCRIPT_URL,
          {
            method: "POST",
            body: body,
            redirect: "follow"
          }
        );


        console.log(
          "Resend response status:",
          response.status
        );


        if (!response.ok) {

          throw new Error(
            "Server returned HTTP " +
            response.status
          );

        }


        const data =
          await response.json();


        console.log(
          "Resend server response:",
          data
        );


        // ----------------------------------------------------
        // Success
        // ----------------------------------------------------

        banner.hidden = false;


        if (data.success) {

          banner.classList.add("ok");

          banner.textContent =
            "A new verification email is on its way. " +
            "Check your inbox!";

        }

        // ----------------------------------------------------
        // Server-side failure
        // ----------------------------------------------------

        else {

          banner.classList.remove("ok");

          banner.textContent =
            data.message ||
            "We couldn't find an account with that email.";

        }


      } catch (error) {

        console.error(
          "Resend verification error:",
          error
        );


        banner.hidden = false;

        banner.classList.remove("ok");

        banner.textContent =
          "Could not reach the server. " +
          "Please try again.";

      }


      // ------------------------------------------------------
      // Restore button
      // ------------------------------------------------------

      finally {

        resendBtn.disabled = false;


        if (label) {
          label.textContent =
            "Resend verification email";
        }


        if (spinner) {
          spinner.hidden = true;
        }

      }

    }
  );

}


// ============================================================
// START VERIFICATION
// ============================================================

verifyFromURL();
