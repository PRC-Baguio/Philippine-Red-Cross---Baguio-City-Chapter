# Philippine Red Cross - Baguio City Chapter

Responsive static website for the Philippine Red Cross - Baguio City Chapter. Built with HTML, CSS, and vanilla JavaScript for GitHub Pages.

## Design system

Shared colors, typography, spacing, layout, and component styles are defined in `css/style.css`. The brand palette retains the selected red (`#fe0000`) and navy (`#212C62`); a deeper red is used for text and filled buttons to keep white-on-red text readable.

Reusable classes for upcoming pages include `.container`, `.section`, `.grid`, `.button`, and `.card`. Two- and three-column grids collapse to one column on narrow screens, and reduced-motion preferences are respected.

## Current structure

```text
index.html
about.html
services.html
blood-services.html
emergency-services.html
training.html
volunteer.html
news.html
donate.html
contact.html
css/
	style.css
js/
	script.js
google-apps-script/
	Code.gs
	response.html
	appsscript.json
	SETUP.md
assets/
	documents/
	icons/
	images/
```

The homepage and all listed information pages are in place. Chapter-specific service availability, leadership, schedules, fees, donation instructions, phone details, and news remain placeholders until verified.

## BloodGallonER boundary

`blood-services.html` is the public information page for donation, donor recruitment, collection activities, and Blood Samaritan inquiries. It links to BloodGallonER - Baguio separately for authorized personnel. This website does not embed the internal dashboard, access its database, expose donor records, or exchange data with the application. BloodGallonER remains independently deployed and must enforce its own user authorization.

No public API or approved integration interface was documented when this page was added. Any future technical integration requires an approved, documented interface and an authentication and authorization review first.

## Replacing placeholders

- Add optimized, authorized Chapter photos under `assets/images/` and use descriptive filenames.
- The hero currently uses an external photo placeholder. Replace its `src` in `index.html` with an authorized local photo path and update its alt text; local photos avoid a third-party image request.
- The Donate page directs inquiries to `baguio@redcross.org.ph`; no bank details or payment links are published. Confirm all contribution instructions directly with the Chapter.
- The public Blood Services page contains no donor records or internal platform functions. Update donation guidance and activity schedules only after confirmation by the Chapter.
- To publish a verified news item, copy the article structure in the `news-item-template` element in `news.html` into the news section and replace all sample text and dates.
- To publish a verified site-wide advisory, edit `chapterAnnouncement` in `js/script.js`, set `enabled` to `true`, and provide the confirmed label and message. Leave it disabled when there is no active advisory.
- Volunteer inquiries use email links. No Google Form has been connected because the Chapter has not supplied official form URLs.
- The General Inquiry form on `contact.html` is wired to an Apps Script endpoint, but its live Sheet write has not been verified. Test with a separate spreadsheet before using it for real inquiries. See `google-apps-script/SETUP.md` for deployment, the exact Sheet schema, privacy gate, response contract, and test checklist.
- Add official logos or other protected branding only when their use is authorized.
- Add approved public documents under `assets/documents/`; confirm they contain no private information.
- Update chapter information only after it has been confirmed by the Chapter.

## Preview locally

Open `index.html` in a browser. The static page does not require a local server; an internet connection is needed to load the temporary hero photo.

## Publish with GitHub Pages and a custom domain

1. Push this repository to GitHub.
2. In the repository, open **Settings > Pages**. Under **Build and deployment**, choose **Deploy from a branch**, select the publishing branch and repository root (`/`), then save. Wait for the default GitHub Pages URL to become available.
3. Before attaching the domain, verify `prcbaguio.org` in the `PRC-Baguio` GitHub organization that owns this repository. GitHub will provide a DNS TXT value; add that TXT record in Cloudflare, then complete verification in GitHub. See [GitHub's domain verification guide](https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages).
4. In the repository's **Settings > Pages**, enter `prcbaguio.org` under **Custom domain** and save. The root `CNAME` file in this repository is already set to this apex domain; keep the Pages setting aligned with it.
5. In Cloudflare DNS, add four `A` records for the apex (`@`), one for each GitHub Pages address: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, and `185.199.111.153`. Set them to **DNS only** (gray cloud) while establishing the GitHub Pages connection. Remove conflicting apex `A` records. Do not create wildcard records. GitHub's [current custom-domain guide](https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site) lists optional `AAAA` records and `www` setup if you decide to support those too.
6. Wait for DNS to propagate, then return to **Settings > Pages** and enable **Enforce HTTPS** when GitHub makes it available. DNS changes may take up to 24 hours.
7. Once `https://prcbaguio.org` loads successfully over HTTPS, set Apps Script's `SITE_ORIGIN` to exactly `https://prcbaguio.org` (no trailing slash or path). Keep page and asset links relative so they work on the custom domain.

