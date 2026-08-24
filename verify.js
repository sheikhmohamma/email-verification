const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyaZwGzzsPV1QTzX2hJz83F4tgRxPZ1pPs_vxdTJn4YJZ1ffb8CW1qwZX1rN-aAzsITbw/exec";


function $(id) {

  return document.getElementById(id);

}


/* ============================================================
   SHOW ONLY ONE CARD
   ============================================================ */

function showOnly(id) {

  [
    "checkingCard",
    "verifiedCard",
    "invalidCard",
    "resendCard"
  ].forEach(cardId => {

    const card = $(cardId);

    if (card) {

      card.hidden =
        cardId !== id;

    }

  });

}


/* ============================================================
   VERIFY TOKEN
   ============================================================ */

async function verifyToken(token) {

  showOnly("checkingCard");


  try {

    const body =
      new URLSearchParams({

        action:
          "verifyEmail",

        token:
          token

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

      showOnly(
        "verifiedCard"
      );

    } else {

      showOnly(
        "invalidCard"
      );

    }


  } catch (error) {

    showOnly(
      "invalidCard"
    );

  }

}


/* ============================================================
   PAGE LOAD
   ============================================================ */

(function init() {

  const params =
    new URLSearchParams(
      window.location.search
    );


  const token =
    params.get("token");


  if (!token) {

    showOnly(
      "resendCard"
    );

    return;

  }


  verifyToken(token);

})();


/* ============================================================
   RESEND BUTTON
   ============================================================ */

$("showResendBtn")
  .addEventListener(
    "click",
    () => {

      showOnly(
        "resendCard"
      );

    }
  );


/* ============================================================
   EMAIL VALIDATION
   ============================================================ */

function isValidEmail(email) {

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    .test(email);

}


/* ============================================================
   RESEND
   ============================================================ */

const resendForm =
  $("resendForm");

const resendBtn =
  $("resendBtn");


resendForm.addEventListener(
  "submit",
  async event => {

    event.preventDefault();


    const email =
      $("resendEmail")
        .value
        .trim();


    const error =
      $("err-resendEmail");

    const field =
      $("resendEmail")
        .closest(".field");


    const banner =
      $("resendBanner");


    banner.hidden = true;


    if (
      !email ||
      !isValidEmail(email)
    ) {

      field.classList.add(
        "has-error"
      );

      error.textContent =
        "Please enter a valid email address.";

      return;

    }


    field.classList.remove(
      "has-error"
    );

    error.textContent = "";


    resendBtn.disabled = true;


    resendBtn.querySelector(
      ".btn-label"
    ).textContent =
      "Sending email...";


    resendBtn.querySelector(
      ".btn-spinner"
    ).hidden = false;


    try {

      const body =
        new URLSearchParams({

          action:
            "resendVerification",

          email:
            email

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


      banner.hidden = false;


      if (data.success) {

        banner.classList.add(
          "ok"
        );

        banner.textContent =
          "Verification email sent! Check your inbox.";

      } else {

        banner.classList.remove(
          "ok"
        );

        banner.textContent =
          data.message ||
          "We couldn't send the verification email.";

      }


    } catch (error) {

      banner.hidden = false;

      banner.classList.remove(
        "ok"
      );

      banner.textContent =
        "Could not reach the server. Please try again.";

    }


    finally {

      resendBtn.disabled = false;


      resendBtn.querySelector(
        ".btn-label"
      ).textContent =
        "Send verification email";


      resendBtn.querySelector(
        ".btn-spinner"
      ).hidden = true;

    }

  }
);
