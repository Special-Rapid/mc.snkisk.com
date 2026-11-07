(function () {
    const SMOOTHING_FACTOR = 0.18;
    const MIN_VISIBLE_DELTA = 0.0015;
    const COMPLETE_HIDE_THRESHOLD = 0.995;
    const overlay = document.querySelector<HTMLElement>("[data-loading-overlay]")!;
    const completeEvent = window.__siteInitialLoadEventName || "site:initial-load-complete";
    const tracker = window.__siteInitialLoadTracker;
    const prefersReducedMotion = Boolean(
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );

    if (!overlay) {
        return;
    }

    // Decorative home-only reveal starts after the overlay is actually gone.
    // Keep the existing tracker, buffer requirements and include waits untouched.
    const root = document.documentElement;
    const hasHomeHero = root.dataset.viewTheme === "home" &&
        Boolean(document.querySelector(".firstview-text-container"));
    let revealTimer = 0;
    let cleanupTimer = 0;
    let overlayHideStarted = false;
    let overlayHidden = false;
    let headerObserver: ResizeObserver | undefined;
    let introEvents: AbortController | undefined;
    let isHomeRevealFinished = false;

    function finishHomeReveal() {
        if (isHomeRevealFinished) return;
        isHomeRevealFinished = true;
        introEvents?.abort();
        window.clearTimeout(revealTimer);
        window.clearTimeout(cleanupTimer);
        root.classList.remove("home-reveal-pending", "home-reveal-running");
        root.style.removeProperty("--home-intro-header-space");
        headerObserver?.disconnect();
    }

    if (hasHomeHero && !prefersReducedMotion) {
        introEvents = new AbortController();
        const listenerOptions = { signal: introEvents.signal };
        root.classList.add("home-reveal-pending");
        const header = document.getElementById("site-header");
        let headerSpace = 0;
        const measureHeader = () => {
            if (!root.classList.contains("home-reveal-pending") &&
                !root.classList.contains("home-reveal-running")) return;
            const height = header?.getBoundingClientRect().height || 0;
            // Avoid changing the framing under an already visible animation.
            if (overlayHidden && Math.abs(height - headerSpace) > 0.5) {
                finishHomeReveal();
                return;
            }
            headerSpace = height;
            root.style.setProperty("--home-intro-header-space", `${height}px`);
        };
        measureHeader();
        if (header && window.ResizeObserver) {
            headerObserver = new ResizeObserver(measureHeader);
            headerObserver.observe(header);
        }
        document.addEventListener("sitepreferencescontentready", measureHeader, listenerOptions);
        window.addEventListener("resize", finishHomeReveal, listenerOptions);
        window.addEventListener("pointerdown", finishHomeReveal, listenerOptions);
        window.addEventListener("scroll", () => {
            if (window.scrollY > 0) finishHomeReveal();
        }, { ...listenerOptions, passive: true });
        // Keyboard navigation and restored pages must never wait for decoration.
        window.addEventListener("keydown", finishHomeReveal, listenerOptions);
        window.addEventListener("pageshow", (event) => {
            if (event.persisted) finishHomeReveal();
        }, listenerOptions);
        window.matchMedia?.("(prefers-reduced-motion: reduce)")
            .addEventListener?.("change", (event) => {
                if (event.matches) finishHomeReveal();
            }, listenerOptions);
        if (window.scrollY > 0 || window.location.hash) finishHomeReveal();
    }

    function didHideOverlay() {
        if (overlayHidden) return;
        overlayHidden = true;
        overlay.dataset.loadingOverlayHidden = "true";
        window.dispatchEvent(new CustomEvent("site:loading-overlay-hidden"));
        if (!root.classList.contains("home-reveal-pending")) return;
        revealTimer = window.setTimeout(() => {
            root.classList.replace("home-reveal-pending", "home-reveal-running");
            cleanupTimer = window.setTimeout(finishHomeReveal, 1500);
        }, 1300);
    }

    function hideOverlayWithFallback(onHide?: () => void) {
        if (overlayHideStarted) return;
        overlayHideStarted = true;
        let fallbackTimer = 0;
        const complete = () => {
            window.clearTimeout(fallbackTimer);
            didHideOverlay();
            onHide?.();
        };
        if (prefersReducedMotion) {
            overlay.style.display = "none";
            complete();
            return;
        }

        if (window.jQuery) {
            // A stopped animation must not leave the home UI permanently hidden.
            fallbackTimer = window.setTimeout(() => {
                overlay.style.display = "none";
                complete();
            }, 1500);
            window.jQuery(overlay).delay(80).fadeOut(650, complete);
            return;
        }

        overlay.style.display = "none";
        complete();
    }

    function createBarController() {
        const loadingProgress = overlay.querySelector<HTMLElement>("[data-loading-progress]");

        if (!loadingProgress || !window.ProgressBar) {
            return null;
        }

        const bar = new ProgressBar.Line(loadingProgress, {
            strokeWidth: 0.2,
            easing: "easeInOut",
            duration: prefersReducedMotion ? 0 : 220,
            color: "#555",
            trailColor: "#bbb",
            trailWidth: 0.2,
            svgStyle: { width: "100%", height: "100%" },
            text: {
                style: {
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    padding: "0",
                    margin: "-30px 0 0 0",
                    transform: "translate(-50%, -50%)",
                    "font-size": "2rem",
                    color: "#fff",
                },
                autoStyleContainer: false,
            },
            step: function (state, progressBar) {
                (progressBar as unknown as InstanceType<typeof ProgressBar.Line>).setText(Math.round(progressBar.value() * 100) + " %");
            },
        });

        bar.set(0);

        return {
            setProgress(progress: number) {
                bar.set(progress);
            },
            getProgress() {
                return bar.value();
            },
            hide(done?: () => void) {
                hideOverlayWithFallback(done);
            },
        };
    }

    const overlayController = createBarController() || {
        setProgress(_progress: number) {},
        getProgress() { return 1; },
        hide: hideOverlayWithFallback,
    };


    let isHidden = false;
    let targetProgress = 0;
    let visibleProgress = 0;
    let animationFrameId = 0;
    let shouldHideWhenSettled = false;

    function clampProgress(progress: number) {
        return Math.min(Math.max(progress, 0), 1);
    }

    function setProgress(progress: number) {
        targetProgress = Math.max(targetProgress, clampProgress(progress));

        if (prefersReducedMotion) {
            visibleProgress = targetProgress;
            overlayController.setProgress(visibleProgress);

            if (shouldHideWhenSettled && visibleProgress >= COMPLETE_HIDE_THRESHOLD) {
                overlayController.hide();
            }
            return;
        }

        startAnimationLoop();
    }

    function tick() {
        animationFrameId = 0;

        const delta = targetProgress - visibleProgress;
        if (delta > MIN_VISIBLE_DELTA) {
            visibleProgress = Math.min(
                targetProgress,
                visibleProgress + delta * SMOOTHING_FACTOR
            );
        } else {
            visibleProgress = targetProgress;
        }

        overlayController.setProgress(visibleProgress);

        if (shouldHideWhenSettled && visibleProgress >= COMPLETE_HIDE_THRESHOLD) {
            visibleProgress = 1;
            targetProgress = 1;
            overlayController.setProgress(1);
            overlayController.hide();
            return;
        }

        if (targetProgress - visibleProgress > 0) {
            startAnimationLoop();
        }
    }

    function startAnimationLoop() {
        if (animationFrameId) {
            return;
        }

        animationFrameId = window.requestAnimationFrame(tick);
    }

    function hideOverlay() {
        if (isHidden) {
            return;
        }

        isHidden = true;

        if (prefersReducedMotion) {
            visibleProgress = 1;
            targetProgress = 1;
            overlayController.setProgress(1);
            overlayController.hide();
            return;
        }

        shouldHideWhenSettled = true;
        setProgress(1);
    }

    if (tracker) {
        tracker.subscribe((state) => {
            setProgress(state.progress);

            if (state.isComplete) {
                hideOverlay();
            }
        });
    }

    if (window.__siteInitialLoadComplete) {
        setProgress(1);
        hideOverlay();
    } else {
        window.addEventListener(completeEvent, function () {
            setProgress(1);
            hideOverlay();
        }, { once: true });
    }
}());
