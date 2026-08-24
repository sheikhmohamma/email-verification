/* =========================================================
   CONFIGURATION
========================================================= */

const SPREADSHEET_ID = "18lZh8UhoZO2xoUhF2psdBqjj_1-s8ce8tMztMVFaW3k";

const SHEET_NAME = "Users";

/*
   Your GitHub Pages website URL.
   Change this to your real URL.
*/
const WEBSITE_URL =
  "https://sheikhmohamma.github.io/email-verification/";


/* =========================================================
   WEB APP - GET REQUESTS
   Opens the verification page.
========================================================= */
/* =========================================================
   WEB APP - GET REQUEST
   Opens the verification page
========================================================= */

function doGet(e) {

  const token = e && e.parameter
    ? String(e.parameter.token || "").trim()
    : "";

  const template =
    HtmlService.createTemplateFromFile("verify");

  /*
     Pass verification token to verify.html
  */
  template.token = token;

  /*
     Pass website URL to verify.html
  */
  template.WEBSITE_URL = WEBSITE_URL;

  return template
    .evaluate()
    .setTitle("Verify your email");
}


/* =========================================================
   WEB APP - POST REQUESTS
   Used by your GitHub Pages registration form.
========================================================= */

function doPost(e) {

  try {

    const data =
      JSON.parse(e.postData.contents);

    const action =
      data.action || "";


    let result;


    if (action === "register") {

      result = registerUser(data);

    } else if (action === "verify") {

      result = verifyEmail(data.token);

    } else if (action === "resend") {

      result =
        resendVerification(data.email);

    } else {

      result = {
        success: false,
        message: "Invalid request."
      };

    }


    return jsonResponse(result);

  } catch (error) {

    console.error(error);

    return jsonResponse({
      success: false,
      message: error.message ||
        "Something went wrong."
    });

  }

}


/* =========================================================
   REGISTER USER
========================================================= */

function registerUser(data) {

  const name =
    String(data.name || "").trim();

  const email =
    String(data.email || "")
      .trim()
      .toLowerCase();

  const passwordHash =
    String(data.passwordHash || "").trim();


  /* Validation */

  if (!name) {

    return {
      success: false,
      message: "Full name is required."
    };

  }


  if (!email || !isValidEmail(email)) {

    return {
      success: false,
      message: "Please enter a valid email."
    };

  }


  if (!passwordHash) {

    return {
      success: false,
      message: "Password is missing."
    };

  }


  const sheet =
    getUsersSheet();


  /* Check duplicate email */

  const lastRow =
    sheet.getLastRow();


  if (lastRow > 1) {

    const emails =
      sheet
        .getRange(
          2,
          3,
          lastRow - 1,
          1
        )
        .getValues()
        .flat()
        .map(function(value) {

          return String(value)
            .trim()
            .toLowerCase();

        });


    if (emails.includes(email)) {

      return {
        success: false,
        message:
          "An account with this email already exists."
      };

    }

  }


  /* Create user */

  const id =
    Utilities.getUuid();

  const token =
    generateVerificationToken();

  const expiry =
    new Date(
      Date.now() +
      30 * 60 * 1000
    );

  const createdAt =
    new Date();


  /*
     Sheet columns:

     A = ID
     B = Name
     C = Email
     D = Password Hash
     E = Verification Token
     F = Token Expiry
     G = Verified
     H = Created At
  */

  sheet.appendRow([

    id,
    name,
    email,
    passwordHash,
    token,
    expiry,
    false,
    createdAt

  ]);


  /* Send verification email */

  sendVerificationEmail(
    name,
    email,
    token
  );


  return {

    success: true,

    message:
      "Account created. Please check your email to verify your account."

  };

}


/* =========================================================
   VERIFY EMAIL
   Called from verify-js.html using google.script.run
========================================================= */

function verifyEmail(token) {

  try {

    token =
      String(token || "").trim();


    if (!token) {

      return {
        success: false,
        message: "Verification token is missing."
      };

    }


    const sheet =
      getUsersSheet();


    const lastRow =
      sheet.getLastRow();


    if (lastRow < 2) {

      return {
        success: false,
        message: "No users found."
      };

    }


    /*
       Get columns E to G:

       E = Token
       F = Expiry
       G = Verified
    */

    const data =
      sheet
        .getRange(
          2,
          5,
          lastRow - 1,
          3
        )
        .getValues();


    for (
      let i = 0;
      i < data.length;
      i++
    ) {

      const row =
        data[i];


      const storedToken =
        String(row[0] || "");

      const expiry =
        row[1];

      const verified =
        row[2];


      if (storedToken === token) {

        const sheetRow =
          i + 2;


        /* Already verified */

        if (
          verified === true ||
          String(verified).toUpperCase() === "TRUE"
        ) {

          return {
            success: true,
            alreadyVerified: true,
            message:
              "This email is already verified."
          };

        }


        /* Invalid expiry date */

        if (
          !(expiry instanceof Date) ||
          isNaN(expiry.getTime())
        ) {

          return {
            success: false,
            message:
              "Invalid verification link."
          };

        }


        /* Token expired */

        if (
          new Date() > expiry
        ) {

          return {
            success: false,
            expired: true,
            message:
              "This verification link has expired."
          };

        }


        /*
           Mark Verified = TRUE

           Column G = 7
        */

        sheet
          .getRange(
            sheetRow,
            7
          )
          .setValue(true);


        return {

          success: true,

          message:
            "Email verified successfully."

        };

      }

    }


    return {

      success: false,

      message:
        "Invalid verification link."

    };

  } catch (error) {

    console.error(error);

    return {

      success: false,

      message:
        error.message ||
          "Verification failed."

    };

  }

}


/* =========================================================
   RESEND VERIFICATION
   Called from verify-js.html using google.script.run
========================================================= */

function resendVerification(email) {

  try {

    email =
      String(email || "")
        .trim()
        .toLowerCase();


    if (
      !email ||
      !isValidEmail(email)
    ) {

      return {

        success: false,

        message:
          "Please enter a valid email address."

      };

    }


    const sheet =
      getUsersSheet();


    const lastRow =
      sheet.getLastRow();


    if (lastRow < 2) {

      return {

        success: false,

        message:
          "No account found with this email."

      };

    }


    /*
       Get columns:

       B = Name
       C = Email
       G = Verified
    */

    const users =
      sheet
        .getRange(
          2,
          2,
          lastRow - 1,
          6
        )
        .getValues();


    for (
      let i = 0;
      i < users.length;
      i++
    ) {

      const row =
        users[i];


      const name =
        String(row[0] || "");

      const storedEmail =
        String(row[1] || "")
          .trim()
          .toLowerCase();


      /*
         Range B:G:

         B index 0 = Name
         C index 1 = Email
         D index 2 = Password
         E index 3 = Token
         F index 4 = Expiry
         G index 5 = Verified
      */

      const verified =
        row[5];


      if (storedEmail === email) {

        if (
          verified === true ||
          String(verified).toUpperCase() === "TRUE"
        ) {

          return {

            success: false,

            message:
              "This email is already verified."

          };

        }


        /* New token */

        const newToken =
          generateVerificationToken();


        const newExpiry =
          new Date(
            Date.now() +
            30 * 60 * 1000
          );


        const sheetRow =
          i + 2;


        /*
           E = Verification Token
           F = Token Expiry
        */

        sheet
          .getRange(
            sheetRow,
            5
          )
          .setValue(newToken);


        sheet
          .getRange(
            sheetRow,
            6
          )
          .setValue(newExpiry);


        /* Send new email */

        sendVerificationEmail(
          name,
          email,
          newToken
        );


        return {

          success: true,

          message:
            "A new verification email has been sent."

        };

      }

    }


    return {

      success: false,

      message:
        "No account found with this email."

    };

  } catch (error) {

    console.error(error);

    return {

      success: false,

      message:
        error.message ||
          "Could not resend the email."

    };

  }

}


/* =========================================================
   SEND VERIFICATION EMAIL
========================================================= */

function sendVerificationEmail(
  name,
  email,
  token
) {

  /*
     Gets your deployed Apps Script Web App URL.

     Example:
     https://script.google.com/macros/s/XXXXX/exec
  */

  const webAppUrl =
    ScriptApp.getService().getUrl();


  const verificationUrl =
    webAppUrl +
    "?token=" +
    encodeURIComponent(token);


  /* Load Email.html */

  const template =
    HtmlService.createTemplateFromFile("Email");


  /* Pass variables into Email.html */

  template.name =
    name;

  template.verificationUrl =
    verificationUrl;


  const htmlBody =
    template
      .evaluate()
      .getContent();


  GmailApp.sendEmail(

    email,

    "Verify your ENTRY account",

    "Please verify your email by opening this link: " +
      verificationUrl,

    {

      htmlBody: htmlBody,

      name: "ENTRY"

    }

  );

}


/* =========================================================
   GET GOOGLE SHEET
========================================================= */

function getUsersSheet() {

  const spreadsheet =
    SpreadsheetApp.openById(
      SPREADSHEET_ID
    );


  let sheet =
    spreadsheet.getSheetByName(
      SHEET_NAME
    );


  /*
     Automatically create the sheet
     if it does not exist.
  */

  if (!sheet) {

    sheet =
      spreadsheet.insertSheet(
        SHEET_NAME
      );


    sheet.appendRow([

      "ID",
      "Name",
      "Email",
      "Password Hash",
      "Verification Token",
      "Token Expiry",
      "Verified",
      "Created At"

    ]);


    sheet
      .getRange(
        "A1:H1"
      )
      .setFontWeight("bold");

  }


  return sheet;

}


/* =========================================================
   GENERATE TOKEN
========================================================= */

function generateVerificationToken() {

  return Utilities
    .getUuid()
    .replace(/-/g, "") +

    Utilities
      .getUuid()
      .replace(/-/g, "");

}


/* =========================================================
   EMAIL VALIDATION
========================================================= */

function isValidEmail(email) {

  const pattern =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


  return pattern.test(email);

}


/* =========================================================
   JSON RESPONSE FOR GITHUB PAGES
========================================================= */

function jsonResponse(data) {

  return ContentService
    .createTextOutput(
      JSON.stringify(data)
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );

}


/* =========================================================
   INCLUDE HTML FILE
========================================================= */

function include(filename) {

  return HtmlService
    .createHtmlOutputFromFile(filename)
    .getContent();

}
