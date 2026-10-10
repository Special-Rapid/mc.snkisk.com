function buildHeaderNav(nav, links) {
    nav.innerHTML = "";
    if (!Array.isArray(links) || links.length === 0) {
        nav.hidden = true;
        return;
    }
    const fragment = document.createDocumentFragment();
    links.forEach((item) => {
        if (!item || typeof item !== "object") {
            return;
        }
        const li = document.createElement("li");
        const a = document.createElement("a");
        if (!applySafeLink(a, item)) {
            return;
        }
        if (item.className) {
            a.className = String(item.className);
        }
        if (item.ariaLabel) {
            a.setAttribute("aria-label", String(item.ariaLabel));
        }
        li.appendChild(a);
        fragment.appendChild(li);
    });
    if (!fragment.childNodes.length) {
        nav.hidden = true;
        return;
    }
    nav.hidden = false;
    nav.appendChild(fragment);
}
function renderHeaderContent(headerTarget) {
    const raw = headerTarget.dataset.headerConfig;
    if (!raw) {
        return;
    }
    const header = headerTarget.querySelector("header");
    const brand = headerTarget.querySelector("[data-header-brand]");
    const nav = headerTarget.querySelector("[data-header-nav]");
    if (!header || !brand || !nav) {
        return;
    }
    try {
        let config = JSON.parse(raw);
        if (window.SitePreferences && typeof window.SitePreferences.localizeHeaderConfig === "function") {
            config = window.SitePreferences.localizeHeaderConfig(config);
        }
        if (config.headerClass) {
            header.className = String(config.headerClass);
        }
        else {
            header.removeAttribute("class");
        }
        if (config.brandClass) {
            brand.className = String(config.brandClass);
        }
        else {
            brand.removeAttribute("class");
        }
        if (config.brandAriaLabel) {
            brand.setAttribute("aria-label", String(config.brandAriaLabel));
        }
        else {
            brand.removeAttribute("aria-label");
        }
        if (config.homeHref && isSafeUrl(config.homeHref)) {
            brand.href = String(config.homeHref);
        }
        else {
            brand.href = "index.html";
        }
        if (config.navClass) {
            nav.className = String(config.navClass);
        }
        else {
            nav.removeAttribute("class");
        }
        buildHeaderNav(nav, config.links);
    }
    catch (error) {
        console.error("Invalid data-header-config:", error);
    }
}
async function includeHeader(target, path) {
    try {
        await window.SiteComponentInclude.loadIntoTarget(target, path);
        renderHeaderContent(target);
        document.dispatchEvent(new CustomEvent("sitepreferencescontentready", { detail: { target } }));
    }
    catch (error) {
        console.error(error);
    }
}
document.addEventListener("DOMContentLoaded", async () => {
    const includeTargets = [
        ...document.querySelectorAll("[data-header-include]"),
    ];
    const headerTarget = document.getElementById("site-header");
    if (headerTarget && !headerTarget.dataset.headerInclude) {
        headerTarget.dataset.headerInclude = "components/header.html";
        includeTargets.push(headerTarget);
    }
    await Promise.all(includeTargets.map((target) => includeHeader(target, target.dataset.headerInclude)));
});
