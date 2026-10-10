(function () {
    const COMPLETE_EVENT = "site:initial-load-complete";
    const VIDEO_WAIT_TIMEOUT_MS = 40000;
    const initialMedia = Array.from(document.querySelectorAll("[data-initial-load-media]"));
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
        const navigationEntry = navigationEntries[0];
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
    function createLoadTracker() {
        const tasks = new Map();
        const listeners = new Set();
        function snapshotTask(task) {
            return {
                id: task.id,
                kind: task.kind,
                label: task.label,
                progress: clampProgress(task.progress),
                loadedBytes: task.loadedBytes,
                totalBytes: task.totalBytes,
                isComplete: task.isComplete,
                isFailed: task.isFailed,
                isIndeterminate: task.isIndeterminate,
            };
        }
        function computeProgress() {
            const taskList = Array.from(tasks.values());
            if (!taskList.length) {
                return {
                    progress: 1,
                    isComplete: true,
                    tasks: [],
                };
            }
            const totalProgress = taskList.reduce((sum, task) => {
                return sum + clampProgress(task.progress);
            }, 0);
            const isComplete = taskList.every((task) => task.isComplete || task.isFailed);
            return {
                progress: clampProgress(totalProgress / taskList.length),
                isComplete,
                tasks: taskList.map(snapshotTask),
            };
        }
        function notify() {
            const state = computeProgress();
            listeners.forEach((listener) => {
                listener(state);
            });
        }
        function ensureTask(id, defaults) {
            const existing = tasks.get(id);
            if (existing) {
                return existing;
            }
            const task = {
                id,
                kind: defaults && defaults.kind ? defaults.kind : "generic",
                label: defaults && defaults.label ? defaults.label : id,
                progress: 0,
                loadedBytes: 0,
                totalBytes: 0,
                isComplete: false,
                isFailed: false,
                isIndeterminate: false,
            };
            tasks.set(id, task);
            return task;
        }
        function syncTaskProgress(task) {
            if (Number.isFinite(task.totalBytes) && task.totalBytes > 0) {
                task.progress = clampProgress(task.loadedBytes / task.totalBytes);
                return;
            }
            task.progress = clampProgress(task.progress);
        }
        return {
            registerTask(id, defaults) {
                ensureTask(id, defaults);
                notify();
            },
            updateTask(id, patch) {
                const task = ensureTask(id, patch);
                const nextPatch = patch || {};
                if (nextPatch.kind) {
                    task.kind = nextPatch.kind;
                }
                if (nextPatch.label) {
                    task.label = nextPatch.label;
                }
                if (typeof nextPatch.loadedBytes === "number" && Number.isFinite(nextPatch.loadedBytes)) {
                    task.loadedBytes = Math.max(nextPatch.loadedBytes, 0);
                }
                if (typeof nextPatch.totalBytes === "number" && Number.isFinite(nextPatch.totalBytes)) {
                    task.totalBytes = Math.max(nextPatch.totalBytes, 0);
                }
                if (typeof nextPatch.progress === "number" && Number.isFinite(nextPatch.progress)) {
                    task.progress = clampProgress(nextPatch.progress);
                }
                if (typeof nextPatch.isIndeterminate === "boolean") {
                    task.isIndeterminate = nextPatch.isIndeterminate;
                }
                if (typeof nextPatch.isComplete === "boolean") {
                    task.isComplete = nextPatch.isComplete;
                }
                if (typeof nextPatch.isFailed === "boolean") {
                    task.isFailed = nextPatch.isFailed;
                }
                syncTaskProgress(task);
                notify();
            },
            completeTask(id) {
                const task = ensureTask(id);
                task.progress = 1;
                if (Number.isFinite(task.totalBytes) && task.totalBytes > 0) {
                    task.loadedBytes = task.totalBytes;
                }
                task.isComplete = true;
                task.isFailed = false;
                syncTaskProgress(task);
                notify();
            },
            failTask(id) {
                const task = ensureTask(id);
                task.progress = 1;
                if (Number.isFinite(task.totalBytes) && task.totalBytes > 0) {
                    task.loadedBytes = task.totalBytes;
                }
                task.isComplete = true;
                task.isFailed = true;
                syncTaskProgress(task);
                notify();
            },
            getProgress() {
                return computeProgress();
            },
            subscribe(listener) {
                listeners.add(listener);
                listener(computeProgress());
                return function unsubscribe() {
                    listeners.delete(listener);
                };
            },
        };
    }
    function registerIncludeTasks(tracker) {
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
            const targets = Array.from(document.querySelectorAll(definition.selector));
            const seenTargets = new Set();
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
    function ensureVideoPlayback(video) {
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
            playPromise.catch(() => { });
        }
    }
    function syncInitialVideoPlayback(video) {
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
    function waitForImage(image, tracker, taskId) {
        return new Promise((resolve) => {
            const complete = () => {
                tracker.completeTask(taskId);
                resolve();
            };
            const fail = () => {
                tracker.failTask(taskId);
                resolve();
            };
            if (image.complete) {
                complete();
                return;
            }
            image.addEventListener("load", complete, { once: true });
            image.addEventListener("error", fail, { once: true });
        });
    }
    function waitForVideo(video, tracker, taskId) {
        return new Promise((resolve) => {
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
            const settle = (didFail) => {
                if (isResolved) {
                    return;
                }
                isResolved = true;
                cleanup();
                if (didFail) {
                    tracker.failTask(taskId);
                }
                else {
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
                settle(false);
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
    function waitForMedia(media, tracker, taskId) {
        if (media instanceof HTMLImageElement) {
            return waitForImage(media, tracker, taskId);
        }
        if (media instanceof HTMLVideoElement) {
            return waitForVideo(media, tracker, taskId);
        }
        tracker.completeTask(taskId);
        return Promise.resolve();
    }
    async function fetchTrackedText(url, options, taskId) {
        const tracker = window.__siteInitialLoadTracker;
        if (!tracker || !taskId) {
            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(`Failed to load ${url}: ${response.status}`);
            }
            return response.text();
        }
        tracker.updateTask(taskId, {
            kind: "fetch",
            label: url,
            progress: 0,
        });
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(`Failed to load ${url}: ${response.status}`);
            }
            const totalBytes = Number.parseInt(response.headers.get("Content-Length") || "", 10);
            const canStream = response.body && typeof response.body.getReader === "function";
            if (!canStream) {
                tracker.updateTask(taskId, {
                    isIndeterminate: true,
                });
                const text = await response.text();
                tracker.completeTask(taskId);
                return text;
            }
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            const chunks = [];
            let loadedBytes = 0;
            tracker.updateTask(taskId, {
                totalBytes: Number.isFinite(totalBytes) && totalBytes > 0 ? totalBytes : 0,
                isIndeterminate: !(Number.isFinite(totalBytes) && totalBytes > 0),
            });
            while (true) {
                const result = await reader.read();
                if (result.done) {
                    break;
                }
                if (result.value) {
                    loadedBytes += result.value.byteLength;
                    chunks.push(decoder.decode(result.value, { stream: true }));
                    tracker.updateTask(taskId, {
                        loadedBytes,
                    });
                }
            }
            chunks.push(decoder.decode());
            tracker.completeTask(taskId);
            return chunks.join("");
        }
        catch (error) {
            tracker.failTask(taskId);
            throw error;
        }
    }
    initReloadScrollReset();
    const tracker = createLoadTracker();
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
    let unsubscribe = function () { };
    unsubscribe = tracker.subscribe((state) => {
        if (!state.isComplete) {
            return;
        }
        unsubscribe();
        finishInitialLoading();
    });
    Promise.all(mediaTasks).catch(() => { });
}());
