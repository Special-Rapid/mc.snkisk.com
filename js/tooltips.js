(function () {
    function resolveAllowedTooltipMediaUrl(urlString) {
        try {
            const url = new URL(urlString, window.location.href);
            if (url.protocol === "https:") {
                return url.href;
            }
            if (url.protocol === "http:") {
                const host = url.hostname.toLowerCase();
                if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") {
                    return url.href;
                }
            }
            return null;
        }
        catch (error) {
            return null;
        }
    }
    function initTooltips() {
        const tooltipTriggers = document.querySelectorAll("[data-tooltip], [data-tooltip-img], [data-tooltip-video]");
        if (!tooltipTriggers.length) {
            return;
        }
        tooltipTriggers.forEach((trigger) => {
            if (trigger.querySelector(".tooltip-box")) {
                return;
            }
            const tooltipText = trigger.getAttribute("data-tooltip");
            const tooltipImg = trigger.getAttribute("data-tooltip-img");
            const tooltipVideo = trigger.getAttribute("data-tooltip-video");
            const tooltipBox = document.createElement("div");
            tooltipBox.className = "tooltip-box";
            trigger.style.position = "relative";
            trigger.style.display = "inline-block";
            if (tooltipVideo) {
                const resolvedVideo = resolveAllowedTooltipMediaUrl(tooltipVideo);
                if (resolvedVideo) {
                    const video = document.createElement("video");
                    video.src = resolvedVideo;
                    video.className = "tooltip-video";
                    video.muted = true;
                    video.preload = "metadata";
                    tooltipBox.appendChild(video);
                    trigger.addEventListener("mouseenter", () => {
                        video.play().catch(() => { });
                    });
                    trigger.addEventListener("mouseleave", () => {
                        video.pause();
                        video.currentTime = 0;
                    });
                }
            }
            if (tooltipImg) {
                const resolvedImg = resolveAllowedTooltipMediaUrl(tooltipImg);
                if (resolvedImg) {
                    const img = document.createElement("img");
                    img.src = resolvedImg;
                    img.className = "tooltip-image";
                    tooltipBox.appendChild(img);
                }
            }
            if (tooltipText) {
                const textDiv = document.createElement("div");
                textDiv.textContent = tooltipText;
                textDiv.className = "tooltip-text";
                tooltipBox.appendChild(textDiv);
            }
            if (!tooltipBox.childNodes.length) {
                return;
            }
            trigger.appendChild(tooltipBox);
        });
    }
    window.SiteTooltips = {
        initTooltips,
        resolveAllowedTooltipMediaUrl,
    };
})();
