(function () {
    const COMPLETE_EVENT = "site:initial-load-complete";
    const VIDEO_WAIT_TIMEOUT_MS = 40000;
    const initialMedia = Array.from(document.querySelectorAll<SiteMedia>("[data-initial-load-media]"));
    const mediaReady = window.SiteMediaReady;

    if (!mediaReady) {
        throw new Error("SiteMediaReady is required before initial-loading.js");
    }

    window.__siteInitialLoadComplete = false;
    window.__siteInitialLoadEventName = COMPLETE_EVENT;

    const clampProgress = mediaReady.clampProgress;

    function setManualScrollRestoration() {
        if (!window.history || typeof window.history.scrollRestoration !== "string") {
            return;
        }

        window.history.scrollRestoration = "manual";
    }

    function isReloadNavigation() {
        if (!window.performance) {
            return false;
        }

        const navigationEntries = typeof window.performance.getEntriesByType === "function"
            ? window.performance.getEntriesByType("navigation")
            : [];
        const navigationEntry = navigationEntries[0] as PerformanceNavigationTiming | undefined;

        if (navigationEntry && navigationEntry.type) {
            return navigationEntry.type === "reload";
        }

        if (!window.performance.navigation) {
            return false;
        }

        return window.performance.navigation.type === window.performance.navigation.TYPE_RELOAD;
    }

    function forceScrollToTop() {
        window.scrollTo(0, 0);
    }

    function initReloadScrollReset() {
        setManualScrollRestoration();

        if (!isReloadNavigation()) {
            return;
        }

        forceScrollToTop();
        window.addEventListener("pageshow", forceScrollToTop, { once: true });
        window.addEventListener("load", forceScrollToTop, { once: true });
    }

    function registerIncludeTasks(tracker: SiteLoadTracker) {
        const includeDefinitions = [
            {
                selector: "[data-header-include], #site-header",
                prefix: "header",
                defaultPath: "components/header.html",
                attribute: "headerInclude",
                label: "Header include",
            },
            {
                selector: "[data-cta-include], #cta",
                prefix: "cta",
                defaultPath: "components/cta.html",
                attribute: "ctaInclude",
                label: "CTA include",
            },
            {
                selector: "[data-footer-include], #footer",
                prefix: "footer",
                defaultPath: "components/footer.html",
                attribute: "footerInclude",
                label: "Footer include",
            },
        ];

        includeDefinitions.forEach((definition) => {
            const targets = Array.from(document.querySelectorAll<HTMLElement>(definition.selector));
            const seenTargets = new Set<HTMLElement>();

            targets.forEach((target, index) => {
                if (!target || seenTargets.has(target)) {
                    return;
                }

                seenTargets.add(target);

                const path = target.dataset[definition.attribute] || definition.defaultPath;
                const taskId = `${definition.prefix}:${path}:${index}`;

                target.dataset.loadingTaskId = taskId;
                if (!target.dataset[definition.attribute]) {
                    target.dataset[definition.attribute] = path;
                }

                tracker.registerTask(taskId, {
                    kind: "fetch",
                    label: definition.label,
                });
            });
        });
    }

    function ensureVideoPlayback(video: Element | null) {
        if (!(video instanceof HTMLVideoElement) || !video.autoplay) {
            return;
        }

        video.muted = true;
        video.playsInline = true;

        if (!video.paused && !video.ended) {
            return;
        }

        const playPromise = video.play();

        if (playPromise && typeof playPromise.catch === "function") {
            playPromise.catch(() => {});
        }
    }

    function syncInitialVideoPlayback(video: HTMLVideoElement) {
        if (!(video instanceof HTMLVideoElement) || !video.autoplay) {
            return;
        }

        ensureVideoPlayback(video);

        window.addEventListener(COMPLETE_EVENT, () => {
            ensureVideoPlayback(video);
        }, { once: true });

        document.addEventListener("visibilitychange", () => {
            if (!document.hidden) {
                ensureVideoPlayback(video);
            }
        });
    }

    function finishInitialLoading() {
        if (window.__siteInitialLoadComplete) {
            return;
        }

        window.__siteInitialLoadComplete = true;
        document.body.classList.remove("is-initial-loading");
        window.dispatchEvent(new CustomEvent(COMPLETE_EVENT));

        initialMedia.forEach((media) => {
            if (media instanceof HTMLVideoElement) {
                ensureVideoPlayback(media);
            }
        });
    }

    function waitForImage(image: HTMLImageElement, tracker: SiteLoadTracker, taskId: string) {
        return new Promise<void>((resolve) => {
            let settled = false;
            let timer = 0;
            const settle = (failed: boolean) => {
                if (settled) return;
                settled = true;
                window.clearTimeout(timer);
                image.removeEventListener("load", complete);
                image.removeEventListener("error", fail);
                if (failed) tracker.failTask(taskId);
                else tracker.completeTask(taskId);
                resolve();
            };
            const complete = () => settle(!mediaReady.isMediaLoaded(image));
            const fail = () => settle(true);
            if (image.complete) { complete(); return; }
            image.addEventListener("load", complete);
            image.addEventListener("error", fail);
            timer = window.setTimeout(fail, VIDEO_WAIT_TIMEOUT_MS);
        });
    }

    function waitForVideo(video: HTMLVideoElement, tracker: SiteLoadTracker, taskId: string) {
        return new Promise<void>((resolve) => {
            function syncProgress() {
                tracker.updateTask(taskId, {
                    progress: mediaReady.getVideoDisplayProgress(video),
                });
            }

            if (mediaReady.isMediaLoaded(video)) {
                syncProgress();
                ensureVideoPlayback(video);
                tracker.completeTask(taskId);
                resolve();
                return;
            }

            let isResolved = false;
            let hasSeenCanPlayThrough = false;
            let waitTimeoutId = 0;

            const cleanup = () => {
                window.clearTimeout(waitTimeoutId);
                video.removeEventListener("canplaythrough", onCanPlayThrough);
                video.removeEventListener("canplay", onBufferUpdate);
                video.removeEventListener("progress", onBufferUpdate);
                video.removeEventListener("loadeddata", onBufferUpdate);
                video.removeEventListener("loadedmetadata", onBufferUpdate);
                video.removeEventListener("durationchange", onBufferUpdate);
                video.removeEventListener("stalled", onPlaybackBlocked);
                video.removeEventListener("suspend", onPlaybackBlocked);
                video.removeEventListener("waiting", onPlaybackBlocked);
                video.removeEventListener("error", onError);
            };

            const settle = (didFail: boolean) => {
                if (isResolved) {
                    return;
                }

                isResolved = true;
                cleanup();
                if (didFail) {
                    tracker.failTask(taskId);
                } else {
                    tracker.completeTask(taskId);
                }
                resolve();
            };

            const trySettle = () => {
                syncProgress();

                if (!hasSeenCanPlayThrough && !mediaReady.isMediaLoaded(video)) {
                    return;
                }

                if (!mediaReady.isMediaLoaded(video)) {
                    return;
                }

                ensureVideoPlayback(video);
                settle(false);
            };

            const onCanPlayThrough = () => {
                hasSeenCanPlayThrough = true;
                trySettle();
            };

            const onBufferUpdate = () => {
                trySettle();
            };

            const onPlaybackBlocked = () => {
                syncProgress();
                ensureVideoPlayback(video);
            };

            const onError = () => {
                settle(true);
            };

            waitTimeoutId = window.setTimeout(() => {
                syncProgress();
                settle(true);
            }, VIDEO_WAIT_TIMEOUT_MS);

            video.addEventListener("canplaythrough", onCanPlayThrough);
            video.addEventListener("canplay", onBufferUpdate);
            video.addEventListener("progress", onBufferUpdate);
            video.addEventListener("loadeddata", onBufferUpdate);
            video.addEventListener("loadedmetadata", onBufferUpdate);
            video.addEventListener("durationchange", onBufferUpdate);
            video.addEventListener("stalled", onPlaybackBlocked);
            video.addEventListener("suspend", onPlaybackBlocked);
            video.addEventListener("waiting", onPlaybackBlocked);
            video.addEventListener("error", onError);

            syncProgress();
            ensureVideoPlayback(video);
        });
    }

    function waitForMedia(media: SiteMedia, tracker: SiteLoadTracker, taskId: string) {
        if (media instanceof HTMLImageElement) {
            return waitForImage(media, tracker, taskId);
        }

        if (media instanceof HTMLVideoElement) {
            return waitForVideo(media, tracker, taskId);
        }

        tracker.completeTask(taskId);
        return Promise.resolve();
    }

    async function fetchTrackedText(url: string, options?: RequestInit, taskId?: string) {
        const tracker = window.__siteInitialLoadTracker;
        if (tracker && taskId) tracker.updateTask(taskId, { kind: "fetch", label: url });
        try {
            const text = await window.SiteTextLoader.load(url, options, (progress) => {
                if (tracker && taskId) tracker.updateTask(taskId, progress);
            });
            if (tracker && taskId) tracker.completeTask(taskId);
            return text;
        } catch (error) {
            if (tracker && taskId) tracker.failTask(taskId);
            throw error;
        }
    }

    initReloadScrollReset();

    const tracker = window.SiteLoadTracker.create();
    window.__siteInitialLoadTracker = tracker;
    window.__siteInitialLoadFetchText = fetchTrackedText;

    document.body.classList.add("is-initial-loading");

    initialMedia.forEach((media, index) => {
        const taskId = `media:${index}`;
        media.dataset.loadingTaskId = taskId;
        tracker.registerTask(taskId, {
            kind: media instanceof HTMLVideoElement ? "video" : "image",
            label: media.currentSrc || media.getAttribute("src") || `media-${index}`,
        });

        if (media instanceof HTMLVideoElement) {
            syncInitialVideoPlayback(media);
        }
    });

    registerIncludeTasks(tracker);

    const mediaTasks = initialMedia.map((media, index) => {
        const taskId = media.dataset.loadingTaskId || `media:${index}`;
        return waitForMedia(media, tracker, taskId);
    });

    if (!mediaTasks.length && tracker.getProgress().isComplete) {
        window.setTimeout(finishInitialLoading, 0);
        return;
    }

    let unsubscribe = function () {};
    unsubscribe = tracker.subscribe((state) => {
        if (!state.isComplete) {
            return;
        }

        unsubscribe();
        finishInitialLoading();
    });

    // subscribeは現在値を同期通知する。購読時点で完了済みの場合も解除する。
    if (tracker.getProgress().isComplete) unsubscribe();

    Promise.all(mediaTasks).catch(() => {});
}());
