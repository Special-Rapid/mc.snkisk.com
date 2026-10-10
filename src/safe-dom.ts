function setSafeText(element: Element | null, text: unknown) {
    if (!element) {
        return;
    }
    element.textContent = text == null ? "" : String(text);
}

function isSafeUrl(url: unknown) {
    if (typeof url !== "string") {
        return false;
    }

    const trimmed = url.trim();
    if (!trimmed) {
        return false;
    }

    try {
        // ブラウザと同じURL正規化で、改行等を含むschemeも検証する。
        const parsed = new URL(trimmed, window.location.href);
        return ["http:", "https:", "mailto:", "tel:", "ftp:"].includes(parsed.protocol);
    } catch {
        return false;
    }
}

function applySafeLink(anchor: HTMLAnchorElement | null, config: SiteLinkConfig | null | undefined) {
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
    } else {
        anchor.removeAttribute("target");
    }

    if (anchor.target === "_blank") {
        const relTokens = new Set(
            String(config.rel || "")
                .split(/\s+/)
                .map((token) => token.trim().toLowerCase())
                .filter(Boolean)
        );
        relTokens.add("noopener");
        relTokens.add("noreferrer");
        anchor.rel = [...relTokens].join(" ");
    } else if (config.rel) {
        anchor.rel = String(config.rel);
    } else {
        anchor.removeAttribute("rel");
    }

    return true;
}

// JSONは外部の境界として扱い、既知の文字列フィールドだけを採用する。
function siteConfigRecord(value: unknown): Record<string, unknown> {
    return value !== null && typeof value === "object" && !Array.isArray(value)
        ? value as Record<string, unknown> : {};
}
function siteStringFields<K extends string>(value: unknown, keys: readonly K[]): Partial<Record<K, string>> {
    const input = siteConfigRecord(value);
    const output: Partial<Record<K, string>> = {};
    keys.forEach(key => { if (Object.prototype.hasOwnProperty.call(input, key) && typeof input[key] === "string") output[key] = input[key]; });
    return output;
}
function parseSiteLink(value: unknown): SiteLinkConfig {
    return siteStringFields(value, ["href", "text", "target", "rel", "className", "ariaLabel"]);
}
function parseSiteHeaderConfig(raw: string): SiteHeaderConfig {
    const value: unknown = JSON.parse(raw);
    const record = siteConfigRecord(value);
    return { ...siteStringFields(value, ["headerClass", "brandClass", "brandAriaLabel", "homeHref", "navClass"]),
        links: Array.isArray(record.links) ? record.links.map(parseSiteLink) : [] };
}
function parseSiteCtaConfig(raw: string): SiteCtaConfig {
    const value: unknown = JSON.parse(raw);
    const record = siteConfigRecord(value);
    return { ...siteStringFields(value, ["kicker", "title", "body", "sub"]),
        primary: parseSiteLink(record.primary), secondary: parseSiteLink(record.secondary) };
}
function parseSiteFooterLinks(raw: string): SiteLinkConfig[] {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.map(parseSiteLink) : [];
}
