(function () {
    const DEFERRED_SELECTOR = "[data-deferred-media]";
    const COMPLETE_EVENT = window.__siteInitialLoadEventName || "site:initial-load-complete";
    const OBSERVER_ROOT_MARGIN = "300px 0px";

    function createDeferredImage(wrapper: HTMLElement) {
        const image = document.createElement("img");
        const src = wrapper.dataset.mediaSrc || "";

        image.src = src;
        image.alt = wrapper.dataset.mediaAlt || "";

        if (wrapper.dataset.mediaLoading) {
            image.loading = wrapper.dataset.mediaLoading as HTMLImageElement["loading"];
        }

        if (wrapper.dataset.mediaDecoding) {
            image.decoding = wrapper.dataset.mediaDecoding as HTMLImageElement["decoding"];
        }

        if (wrapper.dataset.mediaFetchpriority) {
            image.setAttribute("fetchpriority", wrapper.dataset.mediaFetchpriority);
        }

        if (wrapper.dataset.mediaSrcset) {
            image.srcset = wrapper.dataset.mediaSrcset;
        }

        if (wrapper.dataset.mediaSizes) {
            image.sizes = wrapper.dataset.mediaSizes;
        }

        return image;
    }

    function ensureDeferredMedia(wrapper: HTMLElement) {
        if (!wrapper || wrapper.dataset.deferredMediaInserted === "true") {
            return;
        }

        const image = createDeferredImage(wrapper);
        const retryButton = wrapper.querySelector(".skeleton-media__retry");

        wrapper.insertBefore(image, retryButton || null);
        wrapper.dataset.deferredMediaInserted = "true";

        if (window.SiteSkeletonUI && typeof window.SiteSkeletonUI.initWrapper === "function") {
            window.SiteSkeletonUI.initWrapper(wrapper, { force: true });
        }
    }

    function observeDeferredMedia() {
        const wrappers = Array.from(document.querySelectorAll<HTMLElement>(DEFERRED_SELECTOR));

        if (!wrappers.length) {
            return;
        }

        if (!("IntersectionObserver" in window)) {
            wrappers.forEach(ensureDeferredMedia);
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) {
                    return;
                }

                ensureDeferredMedia(entry.target as HTMLElement);
                observer.unobserve(entry.target);
            });
        }, {
            root: null,
            rootMargin: OBSERVER_ROOT_MARGIN,
            threshold: 0.01,
        });

        wrappers.forEach((wrapper) => {
            if (wrapper.dataset.deferredMediaInserted === "true") {
                return;
            }

            observer.observe(wrapper);
        });
    }

    function init() {
        observeDeferredMedia();
    }

    window.SiteDeferredMedia = {
        init,
        ensureDeferredMedia,
    };

    if (window.__siteInitialLoadComplete) {
        init();
    } else {
        window.addEventListener(COMPLETE_EVENT, init, { once: true });
    }
}());
