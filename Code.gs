/**
 * ============================================================
 * REGISTRATION + EMAIL VERIFICATION
 * Google Apps Script backend
 *
 * Google Sheet:
 * ID | Name | Email | PasswordHash | Verification Token |
 * Token Expiry | Verified | Created At
 * ============================================================
 */


// ============================================================
// CONFIGURATION
// ============================================================

const SPREADSHEET_ID =
  "18lZh8UhoZO2xoUhF2psdBqjj_1-s8ce8tMztMVFaW3k";

const SHEET_NAME = "Users";

const VERIFY_PAGE_URL =
  "https://sheikhmohamma.github.io/email-verification/verify.html";

const TOKEN_EXPIRY_MINUTES = 30;

const SITE_NAME = "My Website";


// ============================================================
// COLUMN NUMBERS
// ============================================================

const COL = {
  ID: 1,
  NAME: 2,
  EMAIL: 3,
  PASSWORD_HASH: 4,
  TOKEN: 5,
  TOKEN_EXPIRY: 6,
  VERIFIED: 7,
  CREATED_AT: 8
};


// ============================================================
// GET USERS SHEET
// ============================================================

function getUsersSheet() {

  const ss = SpreadsheetApp.openById(
    SPREADSHEET_ID
  );

  let sheet = ss.getSheetByName(
    SHEET_NAME
  );


  // Create sheet if it doesn't exist
  if (!sheet) {

    sheet = ss.insertSheet(
      SHEET_NAME
    );

  }


  // Create headers if sheet is empty
  if (sheet.getLastRow() === 0) {

    sheet.appendRow([
      "ID",
      "Name",
      "Email",
      "PasswordHash",
      "Verification Token",
      "Token Expiry",
      "Verified",
      "Created At"
    ]);

  }


  return sheet;
}


// ============================================================
// WEB APP — POST
// ============================================================

function doPost(e) {

  try {

    // Make sure a request exists
    if (!e || !e.parameter) {

      return jsonResponse({
        success: false,
        message: "No request data received."
      });

    }


    const action =
      e.parameter.action || "";


    console.log(
      "Received action: " + action
    );


    // --------------------------------------------------------
    // REGISTER
    // --------------------------------------------------------

    if (action === "registerUser") {

      return jsonResponse(
        registerUser(
          e.parameter.name,
          e.parameter.email,
          e.parameter.passwordHash
        )
      );

    }


    // --------------------------------------------------------
    // VERIFY EMAIL
    // --------------------------------------------------------

    if (action === "verifyEmail") {

      return jsonResponse(
        verifyEmail(
          e.parameter.token
        )
      );

    }


    // --------------------------------------------------------
    // RESEND EMAIL
    // --------------------------------------------------------

    if (action === "resendVerification") {

      return jsonResponse(
        resendVerification(
          e.parameter.email
        )
      );

    }


    // --------------------------------------------------------
    // UNKNOWN ACTION
    // --------------------------------------------------------

    return jsonResponse({
      success: false,
      message: "Unknown action: " + action
    });


  } catch (error) {

    console.error(
      "doPost error: " + error.message
    );


    return jsonResponse({
      success: false,
      message: "Server error: " + error.message
    });

  }
}


// ============================================================
// WEB APP — GET
// ============================================================

function doGet(e) {

  return jsonResponse({
    success: true,
    status: "Apps Script web app is running."
  });

}


// ============================================================
// JSON RESPONSE
// ============================================================

function jsonResponse(data) {

  return ContentService
    .createTextOutput(
      JSON.stringify(data)
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );

}


// ============================================================
// GENERATE VERIFICATION TOKEN
// ============================================================

function generateToken() {

  return Utilities
    .getUuid()
    .replace(/-/g, "");

}


// ============================================================
// FIND USER BY EMAIL
// ============================================================

function findRowByEmail(
  sheet,
  email
) {

  const data =
    sheet.getDataRange().getValues();

  const normalizedEmail =
    String(email || "")
      .trim()
      .toLowerCase();


  for (
    let row = 1;
    row < data.length;
    row++
  ) {

    const storedEmail =
      String(
        data[row][COL.EMAIL - 1]
      )
      .trim()
      .toLowerCase();


    if (
      storedEmail === normalizedEmail
    ) {

      return row + 1;

    }

  }


  return -1;

}


// ============================================================
// FIND USER BY VERIFICATION TOKEN
// ============================================================

function findRowByToken(
  sheet,
  token
) {

  const data =
    sheet.getDataRange().getValues();


  for (
    let row = 1;
    row < data.length;
    row++
  ) {

    const storedToken =
      String(
        data[row][COL.TOKEN - 1]
      );


    if (
      storedToken === String(token)
    ) {

      return row + 1;

    }

  }


  return -1;

}


// ============================================================
// REGISTER USER
// ============================================================

function registerUser(
  name,
  email,
  passwordHash
) {

  name =
    String(name || "").trim();

  email =
    String(email || "")
      .trim()
      .toLowerCase();

  passwordHash =
    String(passwordHash || "").trim();


  // ----------------------------------------------------------
  // Validate
  // ----------------------------------------------------------

  if (
    !name ||
    !email ||
    !passwordHash
  ) {

    return {
      success: false,
      message: "All fields are required."
    };

  }


  // ----------------------------------------------------------
  // Get sheet
  // ----------------------------------------------------------

  const sheet =
    getUsersSheet();


  // ----------------------------------------------------------
  // Check existing account
  // ----------------------------------------------------------

  const existingRow =
    findRowByEmail(
      sheet,
      email
    );


  if (existingRow !== -1) {

    const alreadyVerified =
      sheet
        .getRange(
          existingRow,
          COL.VERIFIED
        )
        .getValue();


    if (
      alreadyVerified === true ||
      alreadyVerified === "TRUE"
    ) {

      return {
        success: false,
        message:
          "An account with this email already exists."
      };

    }


    // Existing but not verified.
    // Generate and send a fresh token.

    return resendVerification(
      email
    );

  }


  // ----------------------------------------------------------
  // Create new user
  // ----------------------------------------------------------

  const id =
    Utilities.getUuid();


  const token =
    generateToken();


  const expiry =
    new Date(
      Date.now() +
      TOKEN_EXPIRY_MINUTES *
      60 *
      1000
    );


  sheet.appendRow([
    id,
    name,
    email,
    passwordHash,
    token,
    expiry,
    false,
    new Date()
  ]);


  // ----------------------------------------------------------
  // Send verification email
  // ----------------------------------------------------------

  sendVerificationEmail(
    name,
    email,
    token
  );


  return {
    success: true,
    message:
      "Account created. Please check your email to verify."
  };

}


// ============================================================
// VERIFY EMAIL
// ============================================================

function verifyEmail(token) {

  token =
    String(token || "").trim();


  if (!token) {

    return {
      success: false,
      message: "Missing verification token."
    };

  }


  const sheet =
    getUsersSheet();


  const row =
    findRowByToken(
      sheet,
      token
    );


  if (row === -1) {

    return {
      success: false,
      message:
        "Invalid or unknown verification link."
    };

  }


  const expiry =
    new Date(
      sheet
        .getRange(
          row,
          COL.TOKEN_EXPIRY
        )
        .getValue()
    );


  const alreadyVerified =
    sheet
      .getRange(
        row,
        COL.VERIFIED
      )
      .getValue();


  // Already verified
  if (
    alreadyVerified === true ||
    alreadyVerified === "TRUE"
  ) {

    return {
      success: true,
      message:
        "Email already verified."
    };

  }


  // Expired
  if (
    isNaN(expiry.getTime()) ||
    new Date() > expiry
  ) {

    return {
      success: false,
      message:
        "This verification link has expired."
    };

  }


  // ----------------------------------------------------------
  // Mark verified
  // ----------------------------------------------------------

  sheet
    .getRange(
      row,
      COL.VERIFIED
    )
    .setValue(true);


  // Prevent token reuse
  sheet
    .getRange(
      row,
      COL.TOKEN
    )
    .setValue("");


  return {
    success: true,
    message:
      "Email verified successfully."
  };

}


// ============================================================
// RESEND VERIFICATION EMAIL
// ============================================================

function resendVerification(
  email
) {

  email =
    String(email || "")
      .trim()
      .toLowerCase();


  if (!email) {

    return {
      success: false,
      message:
        "Please enter your email address."
    };

  }


  const sheet =
    getUsersSheet();


  const row =
    findRowByEmail(
      sheet,
      email
    );


  if (row === -1) {

    return {
      success: false,
      message:
        "We couldn't find an account with that email."
    };

  }


  const alreadyVerified =
    sheet
      .getRange(
        row,
        COL.VERIFIED
      )
      .getValue();


  if (
    alreadyVerified === true ||
    alreadyVerified === "TRUE"
  ) {

    return {
      success: false,
      message:
        "This email is already verified. Try logging in."
    };

  }


  // ----------------------------------------------------------
  // New token
  // ----------------------------------------------------------

  const newToken =
    generateToken();


  const newExpiry =
    new Date(
      Date.now() +
      TOKEN_EXPIRY_MINUTES *
      60 *
      1000
    );


  sheet
    .getRange(
      row,
      COL.TOKEN
    )
    .setValue(newToken);


  sheet
    .getRange(
      row,
      COL.TOKEN_EXPIRY
    )
    .setValue(newExpiry);


  const name =
    sheet
      .getRange(
        row,
        COL.NAME
      )
      .getValue();


  sendVerificationEmail(
    name,
    email,
    newToken
  );


  return {
    success: true,
    message:
      "Verification email sent."
  };

}


// ============================================================
// SEND VERIFICATION EMAIL
// ============================================================

function sendVerificationEmail(
  name,
  email,
  token
) {

  const verifyLink =
    VERIFY_PAGE_URL +
    "?token=" +
    encodeURIComponent(token);


  const template =
    HtmlService.createTemplateFromFile(
      "Email"
    );


  template.name = name;
  template.verifyLink = verifyLink;
  template.siteName = SITE_NAME;
  template.expiryMinutes =
    TOKEN_EXPIRY_MINUTES;


  const htmlBody =
    template
      .evaluate()
      .getContent();


  GmailApp.sendEmail(
    email,
    "Verify your email for " +
      SITE_NAME,
    "",
    {
      htmlBody: htmlBody,
      name: SITE_NAME
    }
  );

}


// ============================================================
// TEST GOOGLE SHEET CONNECTION
// ============================================================
// Run this manually ONCE from Apps Script.
// After confirming that a row appears in the Users sheet,
// you can delete this function.
// ============================================================

function testSheet() {

  const sheet =
    getUsersSheet();


  sheet.appendRow([
    "TEST-ID",
    "Test User",
    "test@example.com",
    "test-hash",
    "test-token",
    new Date(
      Date.now() +
      30 * 60 * 1000
    ),
    false,
    new Date()
  ]);


  console.log(
    "Test row successfully added."
  );

}
