function renderCtaContent(ctaTarget) {
    let raw = ctaTarget.dataset.ctaConfig;
    const kicker = ctaTarget.querySelector(".cta-kicker");
    const title = ctaTarget.querySelector(".cta-title");
    const body = ctaTarget.querySelector(".cta-body");
    const sub = ctaTarget.querySelector(".cta-sub");
    const primary = ctaTarget.querySelector(".cta-primary");
    const secondary = ctaTarget.querySelector(".cta-secondary");
    if (!raw && ctaTarget.dataset.ctaTitle) {
        raw = JSON.stringify({
            kicker: ctaTarget.dataset.ctaKicker,
            title: ctaTarget.dataset.ctaTitle,
            body: ctaTarget.dataset.ctaBody,
            sub: ctaTarget.dataset.ctaSub,
            primary: {
                text: ctaTarget.dataset.ctaPrimaryText,
                href: ctaTarget.dataset.ctaPrimaryHref,
                target: ctaTarget.dataset.ctaPrimaryTarget,
                rel: ctaTarget.dataset.ctaPrimaryRel,
            },
            secondary: {
                text: ctaTarget.dataset.ctaSecondaryText,
                href: ctaTarget.dataset.ctaSecondaryHref,
                target: ctaTarget.dataset.ctaSecondaryTarget,
                rel: ctaTarget.dataset.ctaSecondaryRel,
            },
        });
    }
    if (!raw)
        return;
    try {
        const config = parseSiteCtaConfig(raw);
        const translate = window.SitePreferences && typeof window.SitePreferences.translateText === "function"
            ? window.SitePreferences.translateText
            : (value) => value;
        if (kicker) {
            if (config.kicker) {
                kicker.style.display = "";
                setSafeText(kicker, translate(config.kicker));
            }
            else {
                kicker.style.display = "none";
            }
        }
        if (title && config.title)
            setSafeText(title, translate(config.title));
        if (body && config.body)
            setSafeText(body, translate(config.body));
        if (sub) {
            if (config.sub) {
                sub.style.display = "";
                setSafeText(sub, translate(config.sub));
            }
            else {
                sub.style.display = "none";
            }
        }
        applySafeLink(primary, config.primary && { ...config.primary, text: translate(config.primary.text) });
        applySafeLink(secondary, config.secondary && { ...config.secondary, text: translate(config.secondary.text) });
    }
    catch (error) {
        console.error("Invalid data-cta-config:", error);
    }
}
async function includeCta(target, path) {
    try {
        await window.SiteComponentInclude.loadIntoTarget(target, path);
        renderCtaContent(target);
        document.dispatchEvent(new CustomEvent("sitepreferencescontentready", { detail: { target } }));
    }
    catch (error) {
        console.error(error);
    }
}
document.addEventListener("DOMContentLoaded", async () => {
    const includeTargets = [...document.querySelectorAll("[data-cta-include]")];
    const ctaTarget = document.getElementById("cta");
    if (ctaTarget && !ctaTarget.dataset.ctaInclude) {
        ctaTarget.dataset.ctaInclude = "components/cta.html";
        includeTargets.push(ctaTarget);
    }
    await Promise.all(includeTargets.map((target) => includeCta(target, target.dataset.ctaInclude)));
});
