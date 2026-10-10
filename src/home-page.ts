(function () {
    function initHomeHeroText() {
        const rotatingElement = document.querySelector(".rotating-item");

        if (!rotatingElement) {
            return;
        }

        const texts = ["Explore", "Create", "Survive", "Battle"];
        let index = 0;

        rotatingElement.textContent = texts[index];
        rotatingElement.addEventListener("animationiteration", () => {
            index = (index + 1) % texts.length;
            rotatingElement.textContent = texts[index];
        });
    }

    window.SiteHomePage = {
        initHomeHeroText,
    };
})();
