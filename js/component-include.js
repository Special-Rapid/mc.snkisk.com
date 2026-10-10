(function () {
    function getLoadText() {
        if (typeof window.__siteInitialLoadFetchText === "function") {
            return window.__siteInitialLoadFetchText;
        }
        return (url, options) => window.SiteTextLoader.load(url, options);
    }
    function createSafeFragment(html) {
        const parser = new DOMParser();
        const documentFragment = parser.parseFromString(html, "text/html");
        documentFragment.querySelectorAll("script").forEach((script) => script.remove());
        return documentFragment.body;
    }
    async function loadIntoTarget(target, path) {
        const loadText = getLoadText();
        let key;
        try {
            const url = new URL(path, window.location.href);
            key = Object.keys(window.SiteComponentTemplates)
                .find(candidate => new URL(candidate, window.location.href).href === url.href);
        }
        catch {
            // URLの構文エラーも取得失敗と同じく初期待機の終端へ進める。
        }
        if (!key) {
            if (target.dataset.loadingTaskId)
                window.__siteInitialLoadTracker?.failTask(target.dataset.loadingTaskId);
            throw new Error("Unknown component path");
        }
        let html;
        try {
            html = await loadText(path, { cache: "no-cache" }, target.dataset.loadingTaskId);
        }
        catch {
            // 同じbuildに含まれる原本で復旧し、ナビゲーションを取得失敗で失わない。
            html = window.SiteComponentTemplates[key];
        }
        const source = createSafeFragment(html);
        target.innerHTML = "";
        while (source.firstChild) {
            target.appendChild(source.firstChild);
        }
    }
    window.SiteComponentInclude = {
        loadIntoTarget,
    };
}());
