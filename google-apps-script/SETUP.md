# General Inquiry Form Setup

The website form is static, so GitHub Pages cannot write to Google Sheets directly. This Apps Script Web App receives the form POST and writes to the Chapter's spreadsheet. Keep the spreadsheet private and deploy the script from a Chapter-controlled Google account.

## Before you start

- Use the existing spreadsheet named **PRC Baguio – Website Form Submissions**.
- Confirm its worksheet tab is named **General Inquiries** and has these exact headers in row 1 and order:

  `Timestamp`, `Inquiry ID`, `Full Name`, `Email Address`, `Mobile Number`, `Inquiry Category`, `Subject`, `Message`, `Privacy Consent`, `Inquiry Status`, `Admin Remarks`

- Keep the spreadsheet's general access set to **Restricted**. Share it only with authorized Chapter personnel.
- Confirm the Chapter's privacy notice, record-retention period, and privacy contact before allowing real submissions.

## Ten-step setup

1. Sign in to the Chapter-controlled Google account and open [script.google.com](https://script.google.com/). Select **New project** and give it a recognizable name.
2. Open the default `Code.gs`, replace its sample code with `google-apps-script/Code.gs` from this project, and save.
3. Add an HTML file named `response` and paste in `google-apps-script/response.html`. In **Project Settings**, enable the `appsscript.json` manifest, replace it with `google-apps-script/appsscript.json`, and save.
4. In **Project Settings > Script Properties**, add `SPREADSHEET_ID` using the text between `/d/` and `/edit` in the prepared spreadsheet URL. Do not put this ID in website JavaScript. After `https://prcbaguio.org` is live and HTTPS works, set `SITE_ORIGIN` to exactly `https://prcbaguio.org` with no trailing slash or path. Do not set it to the GitHub Pages default URL. Also set `PRIVACY_NOTICE_APPROVED` to `YES` only after the Chapter approves the privacy notice, access permissions, retention period, and privacy contact. `SHEET_NAME` is already `General Inquiries` in the code.
5. Authorize the script using the Chapter account when Google prompts you. Review the requested Sheets permission and grant it only to the Chapter-controlled project.
6. Choose **Deploy > New deployment**, select **Web app**, and set **Execute as** to **Me** (the deploying Chapter account).
7. Set access to **Anyone** or **Anyone, even anonymous**, if that is permitted by your Chapter's Google Workspace policy. The endpoint must accept public form posts, but the spreadsheet itself must remain **Restricted** and shared only with authorized personnel. If anonymous deployment is prohibited, stop and ask the Chapter's IT administrator for an approved alternative.
8. Complete deployment and copy the Web App URL ending in `/exec`. Do not use a `/dev` URL on the public website.
9. In `js/script.js`, replace the empty `generalInquiryEndpoint` string with the deployed `/exec` URL. First point Script Properties to a separate test spreadsheet with the exact required worksheet headers. Submit a clearly marked test inquiry; verify exactly one row, Manila-time timestamp, generated Inquiry ID, `New` status, success response, and no data exposed in the response. Also test missing required fields/consent, malformed email, invalid category, oversized values, the honeypot, too-fast submission, duplicate request IDs, rate limiting, and a server error. Do not test by submitting real personal data to the live sheet.
10. After changing `Code.gs` or `response.html`, save the project, choose **Deploy > Manage deployments**, click the edit icon, choose **New version**, and deploy. If the `/exec` URL changes, update `generalInquiryEndpoint` in `js/script.js` and publish the website again. Repeat the test-sheet checks before using the live spreadsheet.

The script uses a honeypot, minimum completion time, request deduplication cache, and per-email rate limit. These are basic protections, not a guarantee against automated abuse. Monitor Apps Script executions and quotas. A public endpoint may be called by anyone; if abuse occurs, pause the deployment and ask the Chapter's IT administrator to approve stronger abuse controls.
