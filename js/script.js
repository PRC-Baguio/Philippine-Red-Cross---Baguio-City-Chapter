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
const submissionEndpointPattern = /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/;
const submissionEndpointConfigured = submissionEndpointPattern.test(generalInquiryEndpoint);

const createSubmissionRequestId = () => {
	if (window.crypto && typeof window.crypto.randomUUID === "function") {
		return window.crypto.randomUUID();
	}
	return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

document.querySelectorAll("form[data-prc-form]").forEach((form) => {
	const formType = form.dataset.prcForm;
	const responseFrame = document.querySelector(`iframe[name="${form.dataset.responseFrame}"]`);
	const status = form.querySelector("[data-form-status]");
	const submitButton = form.querySelector("[data-form-submit]");
	const requestIdField = form.elements.namedItem("requestId");
	const startedAtField = form.elements.namedItem("startedAt");
	if (!responseFrame || !status || !submitButton || !requestIdField || !startedAtField) {
		return;
	}

	const defaultButtonLabel = submitButton.textContent.trim();
	let isSubmitting = false;
	let responseTimeout = 0;
	const resetSubmissionMetadata = () => {
		startedAtField.value = String(Date.now());
		requestIdField.value = createSubmissionRequestId();
	};
	const setStatus = (state, message) => {
		status.dataset.state = state;
		status.textContent = message;
	};
	const setFormLocked = (locked) => {
		form.querySelectorAll("input:not([type=hidden]), select, textarea").forEach((field) => {
			field.disabled = locked;
		});
		submitButton.disabled = locked || !submissionEndpointConfigured;
	};

	if (!submissionEndpointConfigured) {
		submitButton.disabled = true;
		setStatus("pending", "Online submission is not configured. Please email baguio@redcross.org.ph.");
		return;
	}

	form.action = generalInquiryEndpoint;
	form.elements.namedItem("formType").value = formType;
	resetSubmissionMetadata();
	setFormLocked(false);
	setStatus("ready", "Your submission will be sent to the Chapter for review.");

	form.addEventListener("submit", (event) => {
		event.preventDefault();
		if (isSubmitting || !form.reportValidity()) {
			return;
		}

		isSubmitting = true;
		setFormLocked(true);
		submitButton.textContent = "Submitting...";
		setStatus("pending", "Submitting. Please wait for confirmation before leaving this page.");
		responseTimeout = window.setTimeout(() => {
			setStatus("pending", "Still waiting for confirmation. Do not resubmit yet; contact the Chapter before trying again.");
		}, 30000);
		HTMLFormElement.prototype.submit.call(form);
	});

	window.addEventListener("message", (event) => {
		let hostname = "";
		try {
			hostname = new URL(event.origin).hostname;
		} catch {
			return;
		}

		const trustedOrigin = event.origin.startsWith("https://") && (
			hostname === "script.google.com" ||
			hostname === "script.googleusercontent.com" ||
			hostname.endsWith(".script.googleusercontent.com")
		);
		if (!isSubmitting || event.source !== responseFrame.contentWindow || !trustedOrigin) {
			return;
		}

		const result = event.data;
		if (!result || result.type !== "prc-inquiry-result" || result.requestId !== requestIdField.value || (result.formType && result.formType !== formType)) {
			return;
		}

		window.clearTimeout(responseTimeout);
		isSubmitting = false;
		submitButton.textContent = defaultButtonLabel;
		const succeeded = typeof result.success === "boolean" ? result.success : result.status === "success";
		if (succeeded) {
			form.reset();
			form.elements.namedItem("formType").value = formType;
			resetSubmissionMetadata();
			setFormLocked(false);
			setStatus("success", String(result.message || "Your submission was received by the Chapter."));
			return;
		}

		startedAtField.value = String(Date.now());
		setFormLocked(false);
		setStatus("error", String(result.message || "Your submission was not received. Please contact the Chapter."));
	});
});
