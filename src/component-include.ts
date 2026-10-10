(function () {
    function getLoadText(): NonNullable<Window["__siteInitialLoadFetchText"]> {
        if (typeof window.__siteInitialLoadFetchText === "function") {
            return window.__siteInitialLoadFetchText;
        }

        return async function loadText(url: string, options?: RequestInit) {
            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(`Failed to load ${url}: ${response.status}`);
            }

            return response.text();
        };
    }

    function createSafeFragment(html: string) {
        const parser = new DOMParser();
        const documentFragment = parser.parseFromString(html, "text/html");

        documentFragment.querySelectorAll("script").forEach((script) => script.remove());

        return documentFragment.body;
    }

    async function loadIntoTarget(target: HTMLElement, path: string) {
        const loadText = getLoadText();
        const html = await loadText(path, { cache: "no-cache" }, target.dataset.loadingTaskId);
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
