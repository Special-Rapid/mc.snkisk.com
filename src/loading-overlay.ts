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

    function hideOverlayWithFallback(onHide?: () => void) {
        if (prefersReducedMotion) {
            overlay.style.display = "none";
            if (typeof onHide === "function") {
                onHide();
            }
            return;
        }

        if (window.jQuery) {
            window.jQuery(overlay).delay(80).fadeOut(650, onHide!);
            return;
        }

        overlay.style.display = "none";
        if (typeof onHide === "function") {
            onHide();
        }
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

    const overlayController = createBarController()!;

    if (!overlayController) {
        return;
    }

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
