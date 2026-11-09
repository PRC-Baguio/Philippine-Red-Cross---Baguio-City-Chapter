# Website Forms Setup

The website pages are static, so GitHub Pages cannot write to Google Sheets directly. This Apps Script Web App routes five form types to their matching worksheet tabs. Keep the workbook private and deploy the script from a Chapter-controlled Google account. The Apps Script code must be updated and redeployed before the new forms can write to their tabs; do not treat them as live until test submissions confirm the routing.

## Before you start

- Use the existing spreadsheet named **PRC Baguio – Website Form Submissions**.
- Confirm the workbook has five tabs with these exact names and row-1 headers, in order:

  - **Volunteer Applications**: `Timestamp`, `Application ID`, `Full Name`, `Date of Birth`, `Email Address`, `Mobile Number`, `Address`, `Preferred Service Area`, `Relevant Skills`, `Training and Certifications`, `Availability`, `Emergency Contact`, `Privacy Consent`, `Application Status`, `Admin Remarks`
  - **Training Registrations**: `Timestamp`, `Registration ID`, `Training Program`, `Training Schedule`, `Participant Name`, `Date of Birth`, `Gender`, `Email Address`, `Mobile Number`, `Organization`, `Number of Participants`, `Special Requirements`, `Privacy Consent`, `Registration Status`, `Admin Remarks`
  - **Medical Standby Requests**: `Timestamp`, `Request ID`, `Requesting Organization`, `Event Name`, `Event Date`, `Venue`, `Event Start`, `Event End`, `Estimated Participants`, `Requested Services`, `Contact Person`, `Contact Number`, `Email Address`, `Additional Requirements`, `Request Status`, `Admin Remarks`
  - **Blood Services Inquiries**: `Timestamp`, `Inquiry ID`, `Full Name`, `Email Address`, `Mobile Number`, `Inquiry Type`, `Message`, `Preferred Contact Method`, `Privacy Consent`, `Inquiry Status`, `Admin Remarks`
  - **General Inquiries**: `Timestamp`, `Inquiry ID`, `Full Name`, `Email Address`, `Mobile Number`, `Inquiry Category`, `Subject`, `Message`, `Privacy Consent`, `Inquiry Status`, `Admin Remarks`

- Keep the spreadsheet's general access set to **Restricted**. Share it only with authorized Chapter personnel.
- Confirm the Chapter's privacy notice, record-retention period, and privacy contact before allowing real submissions.

## Ten-step setup

1. Sign in to the Chapter-controlled Google account and open [script.google.com](https://script.google.com/). Select **New project** and give it a recognizable name.
2. Open the default `Code.gs`, replace its sample code with `google-apps-script/Code.gs` from this project, and save.
3. Add an HTML file named `response` and paste in `google-apps-script/response.html`. In **Project Settings**, enable the `appsscript.json` manifest, replace it with `google-apps-script/appsscript.json`, and save.
4. In **Project Settings > Script Properties**, add `SPREADSHEET_ID` using the text between `/d/` and `/edit` in the prepared spreadsheet URL. Do not put this ID in website JavaScript. After `https://prcbaguio.org` is live and HTTPS works, set `SITE_ORIGIN` to exactly `https://prcbaguio.org` with no trailing slash or path. Do not set it to the GitHub Pages default URL. Also set `PRIVACY_NOTICE_APPROVED` to `YES` only after the Chapter approves the privacy notice, access permissions, retention period, and privacy contact. The submitted `formType` selects the exact destination tab; the code defines all five tab names.
5. Authorize the script using the Chapter account when Google prompts you. Review the requested Sheets permission and grant it only to the Chapter-controlled project.
6. Choose **Deploy > New deployment**, select **Web app**, and set **Execute as** to **Me** (the deploying Chapter account).
7. Set access to **Anyone** or **Anyone, even anonymous**, if that is permitted by your Chapter's Google Workspace policy. The endpoint must accept public form posts, but the spreadsheet itself must remain **Restricted** and shared only with authorized personnel. If anonymous deployment is prohibited, stop and ask the Chapter's IT administrator for an approved alternative.
8. Complete deployment and copy the Web App URL ending in `/exec`. Do not use a `/dev` URL on the public website.
9. Confirm `generalInquiryEndpoint` in `js/script.js` exactly matches the `/exec` URL for the **new multi-form deployment**. It currently contains the existing URL, which may still serve the old single-form code until you redeploy. First point Script Properties to a separate test workbook containing all five tabs and exact headers. Submit one clearly marked test for each form type; verify each goes to its corresponding tab, has the correct Manila-time timestamp and prefixed reference ID, starts with status `New`, and returns a matching browser confirmation without exposing sheet data. Also test missing required fields/consent, invalid categories, malformed email, invalid dates/times, oversized values, the honeypot, too-fast submission, duplicate request IDs, rate limiting, and server errors. Do not test by submitting real personal data to the live workbook.
10. After changing `Code.gs` or `response.html`, save the project, choose **Deploy > Manage deployments**, click the edit icon, choose **New version**, and deploy. If the `/exec` URL changes, update `generalInquiryEndpoint` in `js/script.js` and publish the website again. Repeat the test-sheet checks before using the live spreadsheet.

The script uses a honeypot, minimum completion time, request deduplication cache, and per-email rate limit. These are basic protections, not a guarantee against automated abuse. Monitor Apps Script executions and quotas. A public endpoint may be called by anyone; if abuse occurs, pause the deployment and ask the Chapter's IT administrator to approve stronger abuse controls.

## Troubleshooting: execution ran but no row appeared

Do not submit again until you have checked whether a row was written; the first request may have been accepted even if the page did not receive its response.

1. In Apps Script, open **Executions** and select the latest `doPost` execution. Open its logs. The current `Code.gs` logs configuration gates and caught processing failures without logging submitted form data. If you do not see these messages, confirm the updated `Code.gs` was copied into this Apps Script project and deployed as a **New version**.
2. Check the Script Properties privately: `SPREADSHEET_ID` must be only the spreadsheet ID (not the full URL), and the executing Chapter account must have edit access to that spreadsheet. Never paste the ID or form data into public support channels.
3. Confirm `formType` matches one of the five configured forms and that its corresponding tab has the exact name and header order listed above. The script checks that tab's header row before appending.
4. Confirm `SITE_ORIGIN` is exactly `https://prcbaguio.org`, and `PRIVACY_NOTICE_APPROVED` is exactly `YES` after approval. Missing or invalid settings cause an early rejection before a row is appended.
5. After correcting a setting or code issue, deploy a new version, then make one clearly marked test submission to the test spreadsheet. Check the execution log, resulting row, and browser confirmation together.

If the execution shows a completed `doPost` but no row and no diagnostic message, first verify that the deployment points to this script project and that you opened the latest execution. Do not switch to real submissions until the test-sheet write and confirmation are both verified.
