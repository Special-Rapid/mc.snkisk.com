function renderFooterLinks(footerTarget: HTMLElement) {
    let raw = footerTarget.dataset.footerLinks;
    const linksContainer = footerTarget.querySelector<HTMLElement>(".footer-links");

    if (!linksContainer) return;

    linksContainer.innerHTML = "";

    // Backward compatibility for older attributes on existing pages.
    if (!raw && footerTarget.dataset.footerLinkText && footerTarget.dataset.footerLinkHref) {
        raw = JSON.stringify([
            {
                text: footerTarget.dataset.footerLinkText,
                href: footerTarget.dataset.footerLinkHref,
            },
        ]);
    }

    if (!raw) {
        linksContainer.style.display = "none";
        return;
    }

    try {
        const links = JSON.parse(raw) as SiteLinkConfig[];

        if (!Array.isArray(links) || links.length === 0) {
            linksContainer.style.display = "none";
            return;
        }

        const validLinks = links.filter((item) => {
            return item && item.href && item.text && isSafeUrl(item.href);
        });

        if (validLinks.length === 0) {
            linksContainer.style.display = "none";
            return;
        }

        linksContainer.style.display = "";

        validLinks.forEach((item, index) => {
            const a = document.createElement("a");
            applySafeLink(a, item);
            if (a.style.display !== "none") {
                linksContainer.appendChild(a);

                if (index < validLinks.length - 1) {
                    linksContainer.appendChild(document.createTextNode(" | "));
                }
            }
        });
    } catch (error) {
        console.error("Invalid data-footer-links:", error);
        linksContainer.style.display = "none";
    }
}

async function includeFooter(target: HTMLElement, path: string) {
    try {
        await window.SiteComponentInclude.loadIntoTarget(target, path);

        renderFooterLinks(target);
        document.dispatchEvent(new CustomEvent("sitepreferencescontentready", { detail: { target } }));
    } catch (error) {
        console.error(error);
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    const includeTargets = [
        ...document.querySelectorAll<HTMLElement>("[data-footer-include]"),
    ];

    const footerTarget = document.getElementById("footer");
    if (footerTarget && !footerTarget.dataset.footerInclude) {
        footerTarget.dataset.footerInclude = "components/footer.html";
        includeTargets.push(footerTarget);
    }

    await Promise.all(
        includeTargets.map((target) => includeFooter(target, target.dataset.footerInclude!))
    );
});
