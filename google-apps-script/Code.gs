const SHEET_NAME = "General Inquiries";
const EXPECTED_HEADERS = [
  "Timestamp",
  "Inquiry ID",
  "Full Name",
  "Email Address",
  "Mobile Number",
  "Inquiry Category",
  "Subject",
  "Message",
  "Privacy Consent",
  "Inquiry Status",
  "Admin Remarks"
];
const REQUEST_LIMIT = 5;
const RATE_WINDOW_SECONDS = 600;
const REQUEST_CACHE_SECONDS = 21600;
const MIN_FILL_TIME_MS = 3000;
const MAX_REQUEST_AGE_MS = 86400000;

function doPost(event) {
  const properties = PropertiesService.getScriptProperties();
  const spreadsheetId = properties.getProperty("SPREADSHEET_ID") || "";
  const siteOrigin = properties.getProperty("SITE_ORIGIN") || "";
  const request = event && event.parameter ? event.parameter : {};
  const requestId = normalizeRequestId_(request.requestId);
  const responseOrigin = isValidSiteOrigin_(siteOrigin) ? siteOrigin : "";

  if (!responseOrigin) {
    return response_("error", "The inquiry service is not configured. Please email the Chapter.", requestId, "");
  }
  if (properties.getProperty("PRIVACY_NOTICE_APPROVED") !== "YES") {
    return response_("error", "The Chapter has not approved the privacy and retention settings. Please email the Chapter.", requestId, responseOrigin);
  }
  if (!spreadsheetId) {
    return response_("error", "The inquiry service is not configured. Please email the Chapter.", requestId, responseOrigin);
  }

  try {
    const submission = validateSubmission_(request);
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) {
      return response_("error", "The service is busy. Please wait or email the Chapter.", requestId, responseOrigin);
    }

    try {
      const cache = CacheService.getScriptCache();
      const requestCacheKey = "inquiry:" + requestId;
      const previousInquiryId = cache.get(requestCacheKey);
      if (previousInquiryId) {
        return response_("success", "Your inquiry was already received. Reference: " + previousInquiryId, requestId, responseOrigin, previousInquiryId);
      }

      const rateCacheKey = rateCacheKey_(submission.email);
      const recentSubmissions = Number(cache.get(rateCacheKey) || 0);
      if (recentSubmissions >= REQUEST_LIMIT) {
        return response_("error", "Too many inquiries were received from this email recently. Please email the Chapter.", requestId, responseOrigin);
      }

      const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
      const sheet = spreadsheet.getSheetByName(SHEET_NAME);
      if (!sheet) {
        throw new Error("The configured worksheet was not found.");
      }
      if (!prepareSheet_(sheet)) {
        return response_("error", "The worksheet columns do not match the required General Inquiries format.", requestId, responseOrigin);
      }

      const inquiryId = createInquiryId_();
      const timestamp = Utilities.formatDate(new Date(), "Asia/Manila", "yyyy-MM-dd HH:mm:ss");
      sheet.appendRow([
        timestamp,
        inquiryId,
        safeCellValue_(submission.fullName),
        safeCellValue_(submission.email),
        safeCellValue_(submission.phone),
        safeCellValue_(submission.category),
        safeCellValue_(submission.subject),
        safeCellValue_(submission.message),
        "Yes",
        "New",
        ""
      ]);

      cache.put(requestCacheKey, inquiryId, REQUEST_CACHE_SECONDS);
      cache.put(rateCacheKey, String(recentSubmissions + 1), RATE_WINDOW_SECONDS);
      return response_("success", "Your inquiry was received. Reference: " + inquiryId, requestId, responseOrigin, inquiryId);
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    return response_("error", "We could not receive your inquiry. Please email the Chapter and try again later.", requestId, responseOrigin);
  }
}

function validateSubmission_(request) {
  const fullName = normalizeSingleLine_(request.fullName);
  const email = normalizeSingleLine_(request.email).toLowerCase();
  const phone = normalizeSingleLine_(request.phone);
  const category = normalizeSingleLine_(request.category);
  const subject = normalizeSingleLine_(request.subject);
  const message = String(request.message || "").replace(/\r\n?/g, "\n").trim();
  const consent = request.privacyConsent === "yes";
  const honeypot = normalizeSingleLine_(request.website);
  const startedAt = Number(request.startedAt);
  const now = Date.now();
  const requestId = normalizeRequestId_(request.requestId);
  const allowedCategories = [
    "General Information",
    "Training Programs",
    "Volunteer Opportunities",
    "Emergency Medical Services",
    "Blood Services",
    "Disaster Management Services",
    "Partnerships and Donations",
    "Other"
  ];

  if (honeypot) {
    throw new Error("Spam protection rejected the submission.");
  }
  if (!requestId || !consent || fullName.length < 2 || fullName.length > 150 || !isValidEmail_(email) || phone.length > 40 || !allowedCategories.includes(category) || subject.length < 1 || subject.length > 200 || message.length < 1 || message.length > 5000) {
    throw new Error("Submission validation failed.");
  }
  if (!Number.isFinite(startedAt) || now - startedAt < MIN_FILL_TIME_MS || now - startedAt > MAX_REQUEST_AGE_MS) {
    throw new Error("Submission timing check failed.");
  }

  return {
    fullName: fullName,
    email: email,
    phone: phone,
    category: category,
    subject: subject,
    message: message
  };
}

function prepareSheet_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow === 0) {
    sheet.appendRow(EXPECTED_HEADERS);
    return true;
  }

  const actualHeaders = sheet.getRange(1, 1, 1, EXPECTED_HEADERS.length).getDisplayValues()[0];
  return EXPECTED_HEADERS.every(function (header, index) {
    return actualHeaders[index] === header;
  });
}

function createInquiryId_() {
  const datePart = Utilities.formatDate(new Date(), "Asia/Manila", "yyyyMMdd-HHmmss");
  const randomPart = Utilities.getUuid().replace(/-/g, "").toUpperCase();
  return "PRCB-" + datePart + "-" + randomPart;
}

function normalizeSingleLine_(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizeRequestId_(value) {
  const requestId = String(value || "");
  return /^[a-zA-Z0-9-]{16,64}$/.test(requestId) ? requestId : "";
}

function isValidEmail_(email) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidSiteOrigin_(origin) {
  return /^https:\/\/[a-zA-Z0-9.-]+(?::\d{1,5})?$/.test(origin);
}

function rateCacheKey_(email) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, email, Utilities.Charset.UTF_8);
  return "rate:" + Utilities.base64EncodeWebSafe(digest).replace(/=+$/, "");
}

function safeCellValue_(value) {
  return /^[=+\-@]/.test(value) ? "'" + value : value;
}

function response_(status, message, requestId, siteOrigin, inquiryId) {
  const template = HtmlService.createTemplateFromFile("response");
  template.statusJson = JSON.stringify(status);
  template.successJson = JSON.stringify(status === "success");
  template.messageJson = JSON.stringify(message);
  template.requestIdJson = JSON.stringify(requestId || "");
  template.inquiryIdJson = JSON.stringify(inquiryId || "");
  template.siteOriginJson = JSON.stringify(isValidSiteOrigin_(siteOrigin) ? siteOrigin : "");

  return template.evaluate()
    .setTitle("General inquiry submission")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
