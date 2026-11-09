const menuToggle = document.querySelector(".menu-toggle");
const primaryMenu = document.querySelector("#primary-menu");

if (menuToggle && primaryMenu) {
	const setMenuExpanded = (expanded) => {
		menuToggle.setAttribute("aria-expanded", String(expanded));
		menuToggle.setAttribute("aria-label", expanded ? "Close navigation" : "Open navigation");
		primaryMenu.dataset.collapsed = String(!expanded);
	};

	menuToggle.hidden = false;
	setMenuExpanded(false);

	menuToggle.addEventListener("click", () => {
		const expanded = menuToggle.getAttribute("aria-expanded") === "true";
		setMenuExpanded(!expanded);
	});

	primaryMenu.addEventListener("click", (event) => {
		if (event.target instanceof Element && event.target.closest("a")) {
			setMenuExpanded(false);
		}
	});

	primaryMenu.addEventListener("keydown", (event) => {
		if (event.key === "Escape") {
			setMenuExpanded(false);
			menuToggle.focus();
		}
	});
}

const chapterAnnouncement = {
	enabled: false,
	label: "Chapter advisory",
	message: ""
};

const siteHeader = document.querySelector(".site-header");
const announcementMessage = chapterAnnouncement.message.trim();

if (siteHeader && chapterAnnouncement.enabled && announcementMessage) {
	const announcement = document.createElement("aside");
	announcement.className = "announcement-banner";
	announcement.setAttribute("role", "status");
	announcement.setAttribute("aria-label", chapterAnnouncement.label);

	const content = document.createElement("div");
	content.className = "container announcement-banner__inner";

	const label = document.createElement("p");
	label.className = "announcement-banner__label";
	label.textContent = chapterAnnouncement.label;

	const message = document.createElement("p");
	message.className = "announcement-banner__message";
	message.textContent = announcementMessage;

	content.append(label, message);
	announcement.append(content);
	siteHeader.insertAdjacentElement("afterend", announcement);
}

const generalInquiryEndpoint = "https://script.google.com/macros/s/AKfycbzVvMeE2yv0fp3TH5j3dHJ0UIdYygDUFWj79ml7a1sw72Z0Gj3ZlPKw-Hnzbj80DkxU/exec";
const generalInquiryForm = document.querySelector("#generalInquiryForm");
const generalInquiryFrame = document.querySelector('iframe[name="submissionFrame"]');
const generalInquiryStatus = document.querySelector("#formStatus");

if (generalInquiryForm && generalInquiryFrame && generalInquiryStatus) {
	const submitButton = generalInquiryForm.querySelector('button[type="submit"]');
	const startedAtField = generalInquiryForm.elements.namedItem("startedAt");
	const requestIdField = generalInquiryForm.elements.namedItem("requestId");
	const endpointPattern = /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/;
	const isConfigured = endpointPattern.test(generalInquiryEndpoint);
	let isSubmitting = false;
	let responseTimeout = 0;

	const createRequestId = () => {
		if (window.crypto && typeof window.crypto.randomUUID === "function") {
			return window.crypto.randomUUID();
		}
		return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
	};

	const resetRequestMetadata = () => {
		startedAtField.value = String(Date.now());
		requestIdField.value = createRequestId();
	};

	const setStatus = (state, message) => {
		generalInquiryStatus.dataset.state = state;
		generalInquiryStatus.textContent = message;
	};

	const setFormLocked = (locked) => {
		generalInquiryForm.querySelectorAll("input:not([type=hidden]), select, textarea").forEach((field) => {
			field.disabled = locked;
		});
		submitButton.disabled = locked || !isConfigured;
	};

	if (isConfigured) {
		generalInquiryForm.action = generalInquiryEndpoint;
		resetRequestMetadata();
		setFormLocked(false);
		setStatus("ready", "Your inquiry will be sent to the Chapter. A confirmation will appear only if the service returns a verified response.");

		generalInquiryForm.addEventListener("submit", (event) => {
			event.preventDefault();
			if (isSubmitting || !generalInquiryForm.reportValidity()) {
				return;
			}

			isSubmitting = true;
			setFormLocked(true);
			setStatus("pending", "Submitting your inquiry. Please wait for confirmation before leaving this page.");
			responseTimeout = window.setTimeout(() => {
				setStatus("pending", "Still waiting for confirmation. Do not resubmit yet; if no confirmation arrives, contact the Chapter before trying again.");
			}, 30000);
			HTMLFormElement.prototype.submit.call(generalInquiryForm);
		});

		window.addEventListener("message", (event) => {
			const hostname = (() => {
				try {
					return new URL(event.origin).hostname;
				} catch {
					return "";
				}
			})();
			const trustedOrigin = event.origin.startsWith("https://") && (
				hostname === "script.google.com" ||
				hostname === "script.googleusercontent.com" ||
				hostname.endsWith(".script.googleusercontent.com")
			);

			if (!isSubmitting || event.source !== generalInquiryFrame.contentWindow || !trustedOrigin) {
				return;
			}

			const result = event.data;
			const isSupportedResponse = result && (
				result.type === "prc-inquiry-result" ||
				result.type === "prc-baguio-general-inquiry"
			);
			if (!isSupportedResponse || result.requestId !== requestIdField.value) {
				return;
			}

			window.clearTimeout(responseTimeout);
			isSubmitting = false;
			const succeeded = typeof result.success === "boolean" ? result.success : result.status === "success";
			if (succeeded) {
				generalInquiryForm.reset();
				resetRequestMetadata();
				setFormLocked(false);
				setStatus("success", String(result.message || "Your inquiry was received by the Chapter."));
				return;
			}

			startedAtField.value = String(Date.now());
			setFormLocked(false);
			setStatus("error", String(result.message || "Your inquiry was not received. Please email the Chapter."));
		});
	} else {
		submitButton.disabled = true;
		setStatus("pending", "Online submission is pending Google Apps Script setup. For now, email baguio@redcross.org.ph.");
	}
}
