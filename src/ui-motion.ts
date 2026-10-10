(function () {
    function prefersReducedMotion() {
        return Boolean(
            window.matchMedia &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches
        );
    }

    function initFadeInOnScroll() {
        if (!window.jQuery || !document.querySelector(".fadein")) {
            return;
        }

        const $ = window.jQuery;

        function revealOnScroll() {
            $(".fadein").each(function () {
                const targetElement = $(this).offset();
                if (!targetElement) {
                    return;
                }

                const scroll = $(window).scrollTop()!;
                const windowHeight = $(window).height()!;

                if (scroll > targetElement.top - windowHeight + 400) {
                    $(this).css("opacity", "1");
                    $(this).css("transform", "translateY(0)");
                }
            });
        }

        $(window).on("scroll load", revealOnScroll);
        revealOnScroll();
    }

    window.SiteUiMotion = {
        prefersReducedMotion,
        initFadeInOnScroll,
    };
})();
