function setSafeText(element, text) {
    if (!element) {
        return;
    }
    element.textContent = text == null ? "" : String(text);
}
function isSafeUrl(url) {
    if (typeof url !== "string") {
        return false;
    }
    const trimmed = url.trim();
    if (!trimmed) {
        return false;
    }
    const forbiddenScheme = /^(javascript|vbscript|data):/i;
    if (forbiddenScheme.test(trimmed)) {
        return false;
    }
    const absoluteOrRelativeScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;
    if (absoluteOrRelativeScheme.test(trimmed)) {
        return /^(https?|mailto|tel|ftp):/i.test(trimmed);
    }
    return true;
}
function applySafeLink(anchor, config) {
    if (!anchor || !config || typeof config !== "object") {
        if (anchor) {
            anchor.style.display = "none";
        }
        return false;
    }
    const href = config.href ? String(config.href).trim() : "";
    const text = config.text ? String(config.text).trim() : "";
    if (!text || !href || !isSafeUrl(href)) {
        anchor.style.display = "none";
        return false;
    }
    anchor.style.display = "";
    anchor.href = href;
    anchor.textContent = text;
    if (config.target) {
        anchor.target = String(config.target);
    }
    else {
        anchor.removeAttribute("target");
    }
    if (anchor.target === "_blank") {
        const relTokens = new Set(String(config.rel || "")
            .split(/\s+/)
            .map((token) => token.trim().toLowerCase())
            .filter(Boolean));
        relTokens.add("noopener");
        relTokens.add("noreferrer");
        anchor.rel = [...relTokens].join(" ");
    }
    else if (config.rel) {
        anchor.rel = String(config.rel);
    }
    else {
        anchor.removeAttribute("rel");
    }
    return true;
}
