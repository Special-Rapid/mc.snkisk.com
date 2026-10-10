function redirectIfUnavailablePage() {
    const pathname = window.location.pathname.toLowerCase();
    const unavailablePages: string[] = [];

    const shouldRedirect = unavailablePages.some((page) => pathname.endsWith(page));

    if (shouldRedirect) {
        window.location.replace("404.html");
        return true;
    }

    return false;
}

function initSharedPageFeatures() {
    if (window.SiteHomePage && typeof window.SiteHomePage.initHomeHeroText === "function") {
        window.SiteHomePage.initHomeHeroText();
    }

    if (window.SiteUiMotion && typeof window.SiteUiMotion.initFadeInOnScroll === "function") {
        window.SiteUiMotion.initFadeInOnScroll();
    }

    if (window.SiteAnchorScroll && typeof window.SiteAnchorScroll.initAnchorScroll === "function") {
        window.SiteAnchorScroll.initAnchorScroll();
    }

    if (window.SiteTooltips && typeof window.SiteTooltips.initTooltips === "function") {
        window.SiteTooltips.initTooltips();
    }
}

if (!redirectIfUnavailablePage()) {
    document.addEventListener("DOMContentLoaded", initSharedPageFeatures);
}
