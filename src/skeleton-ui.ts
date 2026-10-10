(function () {
    const MEDIA_SELECTOR = "img, video";
    const MEDIA_WAIT_TIMEOUT_MS = 40000;
    const CACHE_BUST_PARAM = "skeletonRetry";
    const mediaReady = window.SiteMediaReady;

    if (!mediaReady) {
        throw new Error("SiteMediaReady is required before skeleton-ui.js");
    }

    function normalizeRatio(ratio: string | null) {
        if (!ratio || !ratio.includes("/")) {
            return "";
        }

        return ratio
            .split("/")
            .map((part) => part.trim())
            .filter(Boolean)
            .join(" / ");
    }

    function setState(wrapper: HTMLElement, state: SiteMediaState) {
        wrapper.classList.toggle("is-skeleton-active", state === "loading");
        wrapper.classList.toggle("is-media-loaded", state === "loaded");
        wrapper.classList.toggle("is-media-error", state === "error");
    }

    function getOriginalSource(media: SiteMedia) {
        if (!media.dataset.skeletonOriginalSrc) {
            media.dataset.skeletonOriginalSrc = media.currentSrc || media.getAttribute("src") || "";
        }

        return media.dataset.skeletonOriginalSrc;
    }

    function getRetrySource(src: string) {
        try {
            const url = new URL(src, window.location.href);
            url.searchParams.set(CACHE_BUST_PARAM, String(Date.now()));
            return url.href;
        } catch (error) {
            const separator = src.includes("?") ? "&" : "?";
            return `${src}${separator}${CACHE_BUST_PARAM}=${Date.now()}`;
        }
    }

    function retryMedia(media: SiteMedia, wrapper: HTMLElement) {
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

    function initWrapper(wrapper: HTMLElement, options?: { force?: boolean }) {
        const shouldForce = Boolean(options && options.force);
        const media = wrapper.querySelector<SiteMedia>(MEDIA_SELECTOR)!;
        const ratio = normalizeRatio(wrapper.getAttribute("data-skeleton-ratio"));
        let retryButton: HTMLButtonElement | null = null;
        let errorStatus: HTMLSpanElement | null = null;
        let retryBusy = false;
        let timeoutId = 0;
        let timedOut = false;
        let lazyObserver: IntersectionObserver | undefined;
        let restoreTabIndex: (() => void) | null = null;
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
                    media.removeEventListener("blur", restoreTabIndex!);
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

        const updateErrorText = () => {
            if (!retryButton || !errorStatus) return;
            const language = window.SitePreferences?.getState().language || "ja";
            const strings = window.SiteMediaMessages[language];
            const video = media instanceof HTMLVideoElement;
            const kind = video ? strings.video : strings.image;
            const statusKind = video ? strings.videoStatus : strings.imageStatus;
            const label = media.getAttribute("alt") || kind;
            retryButton.setAttribute("aria-label", strings.reloadLabel.replace("{label}", label));
            retryButton.textContent = retryBusy ? strings.reloading : strings.reload;
            errorStatus.textContent = (retryBusy ? strings.loadingStatus : strings.failedStatus).replace("{kind}", retryBusy ? statusKind : kind);
        };
        const startDeadline = () => {
            window.clearTimeout(timeoutId);
            timedOut = false;
            timeoutId = window.setTimeout(() => {
                timedOut = true;
                syncState();
            }, MEDIA_WAIT_TIMEOUT_MS);
        };
        const showErrorUI = () => {
            if (!retryButton) {
                errorStatus = document.createElement("span");
                errorStatus.className = "skeleton-media__status";
                errorStatus.setAttribute("role", "status");
                wrapper.appendChild(errorStatus);
                retryButton = document.createElement("button");
                retryButton.type = "button";
                retryButton.className = "skeleton-media__retry";
                retryButton.addEventListener("click", () => {
                    if (retryBusy || !getOriginalSource(media)) return;
                    retryBusy = true;
                    retryButton!.setAttribute("aria-disabled", "true");
                    updateErrorText();
                    startDeadline();
                    wrapper.setAttribute("aria-busy", "true");
                    retryMedia(media, wrapper);
                });
                wrapper.appendChild(retryButton);
            }
            retryBusy = false;
            retryButton!.setAttribute("aria-disabled", "false");
            updateErrorText();
        };

        const syncState = () => {
            if (mediaReady.isMediaLoaded(media)) {
                window.clearTimeout(timeoutId);
                setState(wrapper, "loaded");
                wrapper.setAttribute("aria-busy", "false");
                clearErrorUI();
                return;
            }
            if (timedOut || mediaReady.isMediaFailed(media)) {
                window.clearTimeout(timeoutId);
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

        if (media instanceof HTMLImageElement && media.loading === "lazy" && "IntersectionObserver" in window) {
            // 未要求のlazy画像を失敗にしない。可視近傍に入ってから期限を計る。
            lazyObserver = new IntersectionObserver(entries => {
                if (!entries.some(entry => entry.isIntersecting)) return;
                lazyObserver?.disconnect();
                startDeadline();
                syncState();
            }, { rootMargin: "300px 0px", threshold: 0.01 });
            lazyObserver.observe(wrapper);
        } else {
            if (media instanceof HTMLImageElement && media.loading === "lazy") media.loading = "eager";
            startDeadline();
        }
        syncState();
        document.addEventListener("sitepreferenceschange", updateErrorText);

        const mediaEvents = ["load", "loadeddata", "loadedmetadata", "canplay", "canplaythrough", "progress", "durationchange", "playing", "stalled", "suspend", "waiting", "error"];

        mediaEvents.forEach((eventName) => {
            media.addEventListener(eventName, syncState);
        });

        wrapper.dataset.skeletonUiInitialized = "true";
        wrapper.__siteSkeletonMedia = media;
        wrapper.__siteSkeletonCleanup = () => {
            window.clearTimeout(timeoutId);
            lazyObserver?.disconnect();
            document.removeEventListener("sitepreferenceschange", updateErrorText);
            mediaEvents.forEach((eventName) => {
                media.removeEventListener(eventName, syncState);
            });
            clearErrorUI();
            if (restoreTabIndex) restoreTabIndex();
        };
    }

    function initSkeletonMedia() {
        document.querySelectorAll<HTMLElement>("[data-skeleton-media]").forEach(initWrapper as (wrapper: HTMLElement, index: number, parent: NodeListOf<HTMLElement>) => void);
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
