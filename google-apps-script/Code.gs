const REQUEST_LIMIT = 5;
const RATE_WINDOW_SECONDS = 600;
const REQUEST_CACHE_SECONDS = 21600;
const MIN_FILL_TIME_MS = 3000;
const MAX_REQUEST_AGE_MS = 86400000;
const FORM_CONFIGS = {
  generalInquiry: {
    sheetName: "General Inquiries",
    idPrefix: "GEN",
    idHeader: "Inquiry ID",
    statusHeader: "Inquiry Status",
    fields: [
      { key: "fullName", header: "Full Name", required: true, maxLength: 150 },
      { key: "email", header: "Email Address", required: true, maxLength: 254, type: "email" },
      { key: "phone", header: "Mobile Number", maxLength: 40 },
      { key: "category", header: "Inquiry Category", required: true, maxLength: 80, choices: ["General Information", "Training Programs", "Volunteer Opportunities", "Emergency Medical Services", "Blood Services", "Disaster Management Services", "Partnerships and Donations", "Other"] },
      { key: "subject", header: "Subject", required: true, maxLength: 200 },
      { key: "message", header: "Message", required: true, maxLength: 5000, multiline: true }
    ]
  },
  volunteerApplication: {
    sheetName: "Volunteer Applications",
    idPrefix: "VOL",
    idHeader: "Application ID",
    statusHeader: "Application Status",
    fields: [
      { key: "fullName", header: "Full Name", required: true, maxLength: 150 },
      { key: "dateOfBirth", header: "Date of Birth", required: true, maxLength: 10, type: "date" },
      { key: "email", header: "Email Address", required: true, maxLength: 254, type: "email" },
      { key: "phone", header: "Mobile Number", required: true, maxLength: 40 },
      { key: "address", header: "Address", required: true, maxLength: 300 },
      { key: "preferredServiceArea", header: "Preferred Service Area", required: true, maxLength: 100, choices: ["Disaster Management", "Health Services", "Welfare Services", "Safety Services", "Blood Services", "Red Cross Youth", "Other"] },
      { key: "relevantSkills", header: "Relevant Skills", maxLength: 2000, multiline: true },
      { key: "trainingCertifications", header: "Training and Certifications", maxLength: 2000, multiline: true },
      { key: "availability", header: "Availability", required: true, maxLength: 500 },
      { key: "emergencyContact", header: "Emergency Contact", maxLength: 200 }
    ]
  },
  trainingRegistration: {
    sheetName: "Training Registrations",
    idPrefix: "TRN",
    idHeader: "Registration ID",
    statusHeader: "Registration Status",
    fields: [
      { key: "trainingProgram", header: "Training Program", required: true, maxLength: 120, choices: ["Standard First Aid", "Occupational First Aid", "Basic Life Support", "Other"] },
      { key: "trainingSchedule", header: "Training Schedule", required: true, maxLength: 200 },
      { key: "participantName", header: "Participant Name", required: true, maxLength: 150 },
      { key: "dateOfBirth", header: "Date of Birth", required: true, maxLength: 10, type: "date" },
      { key: "gender", header: "Gender", maxLength: 80 },
      { key: "email", header: "Email Address", required: true, maxLength: 254, type: "email" },
      { key: "phone", header: "Mobile Number", required: true, maxLength: 40 },
      { key: "organization", header: "Organization", maxLength: 200 },
      { key: "numberOfParticipants", header: "Number of Participants", required: true, maxLength: 6, type: "positiveInteger" },
      { key: "specialRequirements", header: "Special Requirements", maxLength: 1000, multiline: true }
    ]
  },
  medicalStandbyRequest: {
    sheetName: "Medical Standby Requests",
    idPrefix: "EMS",
    idHeader: "Request ID",
    statusHeader: "Request Status",
    fields: [
      { key: "requestingOrganization", header: "Requesting Organization", maxLength: 200 },
      { key: "eventName", header: "Event Name", required: true, maxLength: 200 },
      { key: "eventDate", header: "Event Date", required: true, maxLength: 10, type: "date" },
      { key: "venue", header: "Venue", required: true, maxLength: 300 },
      { key: "eventStart", header: "Event Start", required: true, maxLength: 5, type: "time" },
      { key: "eventEnd", header: "Event End", required: true, maxLength: 5, type: "time" },
      { key: "estimatedParticipants", header: "Estimated Participants", required: true, maxLength: 6, type: "positiveInteger" },
      { key: "requestedServices", header: "Requested Services", required: true, maxLength: 1000, multiline: true },
      { key: "contactPerson", header: "Contact Person", required: true, maxLength: 150 },
      { key: "contactNumber", header: "Contact Number", required: true, maxLength: 40 },
      { key: "email", header: "Email Address", required: true, maxLength: 254, type: "email" },
      { key: "additionalRequirements", header: "Additional Requirements", maxLength: 1000, multiline: true }
    ]
  },
  bloodServicesInquiry: {
    sheetName: "Blood Services Inquiries",
    idPrefix: "BLD",
    idHeader: "Inquiry ID",
    statusHeader: "Inquiry Status",
    fields: [
      { key: "fullName", header: "Full Name", required: true, maxLength: 150 },
      { key: "email", header: "Email Address", required: true, maxLength: 254, type: "email" },
      { key: "phone", header: "Mobile Number", maxLength: 40 },
      { key: "inquiryType", header: "Inquiry Type", required: true, maxLength: 100, choices: ["Blood donation", "Donor recruitment", "Blood collection activity", "Blood Samaritan information", "Other"] },
      { key: "message", header: "Message", required: true, maxLength: 4000, multiline: true },
      { key: "preferredContactMethod", header: "Preferred Contact Method", required: true, maxLength: 40, choices: ["Email", "Phone"] }
    ]
  }
};

function doPost(event) {
  const properties = PropertiesService.getScriptProperties();
  const spreadsheetId = properties.getProperty("SPREADSHEET_ID") || "";
  const siteOrigin = properties.getProperty("SITE_ORIGIN") || "";
  const request = event && event.parameter ? event.parameter : {};
  const formType = normalizeSingleLine_(request.formType);
  const formConfig = FORM_CONFIGS[formType];
  const requestId = normalizeRequestId_(request.requestId);
  const responseOrigin = isValidSiteOrigin_(siteOrigin) ? siteOrigin : "";

  if (!responseOrigin) {
    console.error("Web form configuration check failed: SITE_ORIGIN is missing or invalid.");
    return response_("error", "The submission service is not configured. Please contact the Chapter.", requestId, "", "", formType);
  }
  if (properties.getProperty("PRIVACY_NOTICE_APPROVED") !== "YES") {
    console.error("Web form configuration check failed: privacy notice approval is not enabled.");
    return response_("error", "The Chapter has not approved the privacy and retention settings. Please contact the Chapter.", requestId, responseOrigin, "", formType);
  }
  if (!spreadsheetId) {
    console.error("Web form configuration check failed: SPREADSHEET_ID is missing.");
    return response_("error", "The submission service is not configured. Please contact the Chapter.", requestId, responseOrigin, "", formType);
  }
  if (!formConfig) {
    console.error("Web form request rejected: unknown formType.");
    return response_("error", "This form is not recognized. Please contact the Chapter.", requestId, responseOrigin, "", formType);
  }

  try {
    const submission = validateSubmission_(request, formConfig);
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) {
      console.error("Web form request could not acquire the submission lock.");
      return response_("error", "The service is busy. Please wait or contact the Chapter.", requestId, responseOrigin, "", formType);
    }

    try {
      const cache = CacheService.getScriptCache();
      const requestCacheKey = "inquiry:" + formType + ":" + requestId;
      const previousInquiryId = cache.get(requestCacheKey);
      if (previousInquiryId) {
        return response_("success", "Your submission was already received. Reference: " + previousInquiryId, requestId, responseOrigin, previousInquiryId, formType);
      }

      const rateCacheKey = rateCacheKey_(formType + ":" + submission.email);
      const recentSubmissions = Number(cache.get(rateCacheKey) || 0);
      if (recentSubmissions >= REQUEST_LIMIT) {
        console.error("Web form request was rejected by the email rate limit.");
        return response_("error", "Too many submissions were received recently. Please contact the Chapter.", requestId, responseOrigin, "", formType);
      }

      const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
      const sheet = spreadsheet.getSheetByName(formConfig.sheetName);
      if (!sheet) {
        throw new Error("The configured worksheet was not found. Check the sheet tab name and spreadsheet access.");
      }
      if (!prepareSheet_(sheet, formConfig)) {
        console.error("Web form request stopped: worksheet headers do not match the configured form schema.");
        return response_("error", "The worksheet columns do not match the required form format.", requestId, responseOrigin, "", formType);
      }

      const inquiryId = createInquiryId_(formConfig.idPrefix);
      const timestamp = Utilities.formatDate(new Date(), "Asia/Manila", "yyyy-MM-dd HH:mm:ss");
      const row = [timestamp, inquiryId];
      formConfig.fields.forEach(function (field) {
        row.push(safeCellValue_(submission[field.key] || ""));
      });
      row.push("Yes", "New", "");
      sheet.appendRow(row);

      cache.put(requestCacheKey, inquiryId, REQUEST_CACHE_SECONDS);
      cache.put(rateCacheKey, String(recentSubmissions + 1), RATE_WINDOW_SECONDS);
      return response_("success", "Your submission was received. Reference: " + inquiryId, requestId, responseOrigin, inquiryId, formType);
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    console.error("Web form processing failed: " + String(error && error.message ? error.message : error));
    return response_("error", "We could not receive your submission. Please contact the Chapter and try again later.", requestId, responseOrigin, "", formType);
  }
}

function validateSubmission_(request, formConfig) {
  const consent = request.privacyConsent === "yes";
  const honeypot = normalizeSingleLine_(request.website);
  const startedAt = Number(request.startedAt);
  const now = Date.now();
  const requestId = normalizeRequestId_(request.requestId);
  const submission = {};

  if (honeypot) {
    throw new Error("Spam protection rejected the submission.");
  }
  if (!requestId || !consent) {
    throw new Error("Request ID or privacy consent is missing.");
  }
  if (!Number.isFinite(startedAt) || now - startedAt < MIN_FILL_TIME_MS || now - startedAt > MAX_REQUEST_AGE_MS) {
    throw new Error("Submission timing check failed.");
  }

  formConfig.fields.forEach(function (field) {
    const rawValue = String(request[field.key] || "");
    const value = field.multiline
      ? rawValue.replace(/\r\n?/g, "\n").trim()
      : normalizeSingleLine_(rawValue);

    if (field.required && !value) {
      throw new Error("A required field is missing: " + field.header);
    }
    if (value.length > field.maxLength) {
      throw new Error("A field exceeds its maximum length: " + field.header);
    }
    if (field.type === "email" && value && !isValidEmail_(value)) {
      throw new Error("Email address is invalid.");
    }
    if (field.type === "date" && value && !isValidDate_(value)) {
      throw new Error("Date is invalid.");
    }
    if (field.type === "time" && value && !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
      throw new Error("Time is invalid.");
    }
    if (field.type === "positiveInteger" && value && (!/^\d+$/.test(value) || Number(value) < 1)) {
      throw new Error("A positive whole number is required: " + field.header);
    }
    if (field.choices && value && !field.choices.includes(value)) {
      throw new Error("Selection is invalid: " + field.header);
    }

    submission[field.key] = value;
  });

  if (request.formType === "bloodServicesInquiry" && submission.preferredContactMethod === "Phone" && !submission.phone) {
    throw new Error("A mobile number is required when phone contact is selected.");
  }

  return submission;
}

function prepareSheet_(sheet, formConfig) {
  const headers = ["Timestamp", formConfig.idHeader]
    .concat(formConfig.fields.map(function (field) { return field.header; }))
    .concat(["Privacy Consent", formConfig.statusHeader, "Admin Remarks"]);
  const lastRow = sheet.getLastRow();
  if (lastRow === 0) {
    sheet.appendRow(headers);
    return true;
  }

  if (sheet.getLastColumn() < headers.length) {
    return false;
  }
  const actualHeaders = sheet.getRange(1, 1, 1, headers.length).getDisplayValues()[0];
  return headers.every(function (header, index) {
    return actualHeaders[index] === header;
  });
}

function createInquiryId_(prefix) {
  const datePart = Utilities.formatDate(new Date(), "Asia/Manila", "yyyyMMdd-HHmmss");
  const randomPart = Utilities.getUuid().replace(/-/g, "").toUpperCase();
  return prefix + "-" + datePart + "-" + randomPart;
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

function isValidDate_(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(value + "T00:00:00Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
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

function response_(status, message, requestId, siteOrigin, inquiryId, formType) {
  const template = HtmlService.createTemplateFromFile("response");
  template.statusJson = JSON.stringify(status);
  template.successJson = JSON.stringify(status === "success");
  template.messageJson = JSON.stringify(message);
  template.requestIdJson = JSON.stringify(requestId || "");
  template.inquiryIdJson = JSON.stringify(inquiryId || "");
  template.formTypeJson = JSON.stringify(formType || "");
  template.siteOriginJson = JSON.stringify(isValidSiteOrigin_(siteOrigin) ? siteOrigin : "");

  return template.evaluate()
    .setTitle("General inquiry submission")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
