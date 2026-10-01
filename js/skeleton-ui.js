(function () {
    const MEDIA_SELECTOR = "img, video";
    const CACHE_BUST_PARAM = "skeletonRetry";
    const mediaReady = window.SiteMediaReady;

    if (!mediaReady) {
        throw new Error("SiteMediaReady is required before skeleton-ui.js");
    }

    function normalizeRatio(ratio) {
        if (!ratio || !ratio.includes("/")) {
            return "";
        }

        return ratio
            .split("/")
            .map((part) => part.trim())
            .filter(Boolean)
            .join(" / ");
    }

    function setState(wrapper, state) {
        wrapper.classList.toggle("is-skeleton-active", state === "loading");
        wrapper.classList.toggle("is-media-loaded", state === "loaded");
        wrapper.classList.toggle("is-media-error", state === "error");
    }

    function getOriginalSource(media) {
        if (!media.dataset.skeletonOriginalSrc) {
            media.dataset.skeletonOriginalSrc = media.currentSrc || media.getAttribute("src") || "";
        }

        return media.dataset.skeletonOriginalSrc;
    }

    function getRetrySource(src) {
        try {
            const url = new URL(src, window.location.href);
            url.searchParams.set(CACHE_BUST_PARAM, String(Date.now()));
            return url.href;
        } catch (error) {
            const separator = src.includes("?") ? "&" : "?";
            return `${src}${separator}${CACHE_BUST_PARAM}=${Date.now()}`;
        }
    }

    function retryMedia(media, wrapper) {
        const originalSrc = getOriginalSource(media);

        if (!originalSrc) {
            return;
        }

        setState(wrapper, "loading");

        if (media instanceof HTMLImageElement) {
            media.src = getRetrySource(originalSrc);
            return;
        }

        if (media instanceof HTMLVideoElement) {
            media.load();
            if (media.autoplay) {
                media.play().catch(() => {});
            }
        }
    }

    function initWrapper(wrapper, options) {
        const shouldForce = Boolean(options && options.force);
        const media = wrapper.querySelector(MEDIA_SELECTOR);
        const ratio = normalizeRatio(wrapper.getAttribute("data-skeleton-ratio"));
        let retryButton = null;
        let errorStatus = null;
        let retryBusy = false;
        let restoreTabIndex = null;
        const previousMedia = wrapper.__siteSkeletonMedia;

        if (!shouldForce && wrapper.dataset.skeletonUiInitialized === "true" && previousMedia === media) {
            return;
        }

        if (typeof wrapper.__siteSkeletonCleanup === "function") {
            wrapper.__siteSkeletonCleanup();
            wrapper.__siteSkeletonCleanup = null;
        }

        const clearErrorUI = () => {
            if (retryButton && document.activeElement === retryButton && media) {
                const originalTabIndex = media.getAttribute("tabindex");
                media.setAttribute("tabindex", "-1");
                media.focus({ preventScroll: true });
                restoreTabIndex = () => {
                    if (originalTabIndex === null) media.removeAttribute("tabindex");
                    else media.setAttribute("tabindex", originalTabIndex);
                    media.removeEventListener("blur", restoreTabIndex);
                    restoreTabIndex = null;
                };
                media.addEventListener("blur", restoreTabIndex);
            }
            if (retryButton) retryButton.remove();
            if (errorStatus) errorStatus.remove();
            retryButton = null;
            errorStatus = null;
            retryBusy = false;
        };

        const showErrorUI = () => {
            const kind = media instanceof HTMLVideoElement ? "動画" : "画像";
            if (!retryButton) {
                errorStatus = document.createElement("span");
                errorStatus.className = "skeleton-media__status";
                errorStatus.setAttribute("role", "status");
                wrapper.appendChild(errorStatus);
                retryButton = document.createElement("button");
                retryButton.type = "button";
                retryButton.className = "skeleton-media__retry";
                retryButton.setAttribute("aria-label", `${media.getAttribute("alt") || kind}を再読み込み`);
                retryButton.addEventListener("click", () => {
                    if (retryBusy || !getOriginalSource(media)) return;
                    retryBusy = true;
                    retryButton.setAttribute("aria-disabled", "true");
                    retryButton.textContent = "再読み込み中…";
                    errorStatus.textContent = `${kind}を再読み込み中です。`;
                    wrapper.setAttribute("aria-busy", "true");
                    retryMedia(media, wrapper);
                });
                wrapper.appendChild(retryButton);
            }
            retryBusy = false;
            retryButton.setAttribute("aria-disabled", "false");
            retryButton.textContent = "再読み込み";
            errorStatus.textContent = `${kind}を読み込めませんでした。`;
        };

        const syncState = () => {
            if (mediaReady.isMediaLoaded(media)) {
                setState(wrapper, "loaded");
                wrapper.setAttribute("aria-busy", "false");
                clearErrorUI();
                return;
            }
            if (mediaReady.isMediaFailed(media)) {
                setState(wrapper, "error");
                wrapper.setAttribute("aria-busy", "false");
                showErrorUI();
                return;
            }
            setState(wrapper, "loading");
            wrapper.setAttribute("aria-busy", "true");
        };

        if (ratio) {
            wrapper.style.setProperty("--skeleton-ratio", ratio);
        }

        if (!media) {
            if (wrapper.hasAttribute("data-deferred-media")) {
                setState(wrapper, "loading");
            } else {
                setState(wrapper, "loaded");
            }
            return;
        }

        getOriginalSource(media);

        syncState();

        const mediaEvents = ["load", "loadeddata", "loadedmetadata", "canplay", "canplaythrough", "progress", "durationchange", "playing", "stalled", "suspend", "waiting", "error"];

        mediaEvents.forEach((eventName) => {
            media.addEventListener(eventName, syncState);
        });

        wrapper.dataset.skeletonUiInitialized = "true";
        wrapper.__siteSkeletonMedia = media;
        wrapper.__siteSkeletonCleanup = () => {
            mediaEvents.forEach((eventName) => {
                media.removeEventListener(eventName, syncState);
            });
            clearErrorUI();
            if (restoreTabIndex) restoreTabIndex();
        };
    }

    function initSkeletonMedia() {
        document.querySelectorAll("[data-skeleton-media]").forEach(initWrapper);
    }

    window.SiteSkeletonUI = {
        init: initSkeletonMedia,
        initWrapper,
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initSkeletonMedia);
    } else {
        initSkeletonMedia();
    }
}());
