(function () {
    const VIDEO_BUFFER_EPSILON = 0.25;
    const VIDEO_DISPLAY_PROGRESS_CAP = 0.94;

    function clampProgress(value: number) {
        if (!Number.isFinite(value)) {
            return 0;
        }

        return Math.min(Math.max(value, 0), 1);
    }

    function getVideoBufferedProgress(video: Element | null) {
        if (!(video instanceof HTMLVideoElement)) {
            return 0;
        }

        if (!Number.isFinite(video.duration) || video.duration <= 0) {
            return 0;
        }

        if (!video.buffered || video.buffered.length === 0) {
            return 0;
        }

        // 最後のrangeの終端だけでは、途中が未取得でも100%になる。
        let bufferedEnd = 0;
        for (let index = 0; index < video.buffered.length; index += 1) {
            if (video.buffered.start(index) > bufferedEnd + VIDEO_BUFFER_EPSILON) break;
            bufferedEnd = Math.max(bufferedEnd, video.buffered.end(index));
        }
        return clampProgress(bufferedEnd / video.duration);
    }

    function isVideoFullyBuffered(video: Element | null) {
        if (!(video instanceof HTMLVideoElement)) {
            return false;
        }

        return getVideoBufferedProgress(video) >= 1 - VIDEO_BUFFER_EPSILON / Math.max(video.duration || 1, 1);
    }

    function isVideoStrictReady(video: Element | null) {
        if (!(video instanceof HTMLVideoElement)) {
            return false;
        }

        return video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA && isVideoFullyBuffered(video);
    }

    function getVideoDisplayProgress(video: Element | null) {
        if (!(video instanceof HTMLVideoElement)) {
            return 0;
        }

        if (isVideoStrictReady(video)) {
            return 1;
        }

        let progress = 0;

        if (video.networkState === HTMLMediaElement.NETWORK_LOADING || video.networkState === HTMLMediaElement.NETWORK_IDLE) {
            progress = 0.08;
        }

        if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
            progress = Math.max(progress, 0.2);
        }

        if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            progress = Math.max(progress, 0.38);
        }

        if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
            progress = Math.max(progress, 0.56);
        }

        const bufferedProgress = getVideoBufferedProgress(video);
        if (bufferedProgress > 0) {
            progress = Math.max(progress, 0.25 + bufferedProgress * 0.65);
        }

        return Math.min(clampProgress(progress), VIDEO_DISPLAY_PROGRESS_CAP);
    }

    function isMediaLoaded(media: Element | null) {
        if (media instanceof HTMLImageElement) {
            return media.complete && media.naturalWidth > 0;
        }

        if (media instanceof HTMLVideoElement) {
            return isVideoStrictReady(media);
        }

        return true;
    }

    function isMediaFailed(media: Element | null) {
        if (media instanceof HTMLImageElement) {
            return media.complete && media.naturalWidth === 0;
        }

        if (media instanceof HTMLVideoElement) {
            return media.networkState === HTMLMediaElement.NETWORK_NO_SOURCE || media.error !== null;
        }

        return false;
    }

    window.SiteMediaReady = {
        VIDEO_BUFFER_EPSILON,
        VIDEO_DISPLAY_PROGRESS_CAP,
        clampProgress,
        getVideoBufferedProgress,
        getVideoDisplayProgress,
        isVideoFullyBuffered,
        isVideoStrictReady,
        isMediaLoaded,
        isMediaFailed,
    };
}());
