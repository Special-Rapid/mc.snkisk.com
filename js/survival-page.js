(function () {
    function prefersReducedMotion() {
        return Boolean(window.matchMedia &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    }
    function getScrollStep(track) {
        const firstCard = track.children[0];
        const secondCard = track.children[1];
        if (!firstCard) {
            return 0;
        }
        if (!secondCard) {
            return firstCard.getBoundingClientRect().width;
        }
        return secondCard.offsetLeft - firstCard.offsetLeft;
    }
    function updateRailState(track, prevButton, nextButton) {
        const maxScrollLeft = Math.max(track.scrollWidth - track.clientWidth, 0);
        const hasOverflow = maxScrollLeft > 4;
        const currentScrollLeft = track.scrollLeft;
        if (prevButton) {
            prevButton.disabled = !hasOverflow || currentScrollLeft <= 4;
        }
        if (nextButton) {
            nextButton.disabled = !hasOverflow || currentScrollLeft >= maxScrollLeft - 4;
        }
    }
    function scrollRail(track, direction) {
        const step = getScrollStep(track);
        if (step <= 0) {
            return;
        }
        track.scrollBy({
            left: step * direction,
            behavior: prefersReducedMotion() ? "auto" : "smooth",
        });
    }
    function initRail(root) {
        const track = root.querySelector("[data-biome-rail-track]");
        const prevButton = root.querySelector("[data-biome-rail-prev]");
        const nextButton = root.querySelector("[data-biome-rail-next]");
        if (!track) {
            return;
        }
        const syncState = () => {
            updateRailState(track, prevButton, nextButton);
        };
        if (prevButton) {
            prevButton.addEventListener("click", () => {
                scrollRail(track, -1);
            });
        }
        if (nextButton) {
            nextButton.addEventListener("click", () => {
                scrollRail(track, 1);
            });
        }
        track.addEventListener("scroll", syncState, { passive: true });
        window.addEventListener("resize", syncState);
        syncState();
    }
    function initSurvivalPage() {
        document.querySelectorAll("[data-biome-rail]").forEach(initRail);
    }
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initSurvivalPage);
    }
    else {
        initSurvivalPage();
    }
}());
