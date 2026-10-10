(function () {
    function prefersReducedMotion() {
        if (window.SiteUiMotion && typeof window.SiteUiMotion.prefersReducedMotion === "function") {
            return window.SiteUiMotion.prefersReducedMotion();
        }
        return false;
    }
    function initAnchorScroll() {
        if (!window.jQuery) {
            return;
        }
        const $ = window.jQuery;
        $(document).off("click.siteAnchorScroll", "[data-header-nav] a[href^='#']");
        $(document).on("click.siteAnchorScroll", "[data-header-nav] a[href^='#']", function (event) {
            const href = $(this).attr("href");
            const target = $(href === "#" || href === "" ? "html" : href);
            if (!target.length) {
                return;
            }
            event.preventDefault();
            const header = document.querySelector("header");
            const headerOffset = header ? header.getBoundingClientRect().height : 0;
            const scrollTop = Math.max(target.offset().top - headerOffset - 12, 0);
            if (prefersReducedMotion()) {
                $("html, body").stop(true, true);
                window.scrollTo(0, scrollTop);
                return;
            }
            $("html, body").animate({ scrollTop }, 800, "swing");
        });
    }
    window.SiteAnchorScroll = {
        initAnchorScroll,
    };
})();
