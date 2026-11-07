import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';
import type { DOMWindow } from 'jsdom';

interface StartOptions { page?: string; languages?: string[]; saved?: Record<string, string>; storageThrows?: boolean; removeThrows?: boolean; dark?: boolean }
interface PreferencesWindow extends Pick<DOMWindow, 'document' | 'navigator' | 'dispatchEvent' | 'getSelection'> {
 eval(source: string): unknown; Event: typeof Event; CustomEvent: typeof CustomEvent; NodeFilter: typeof NodeFilter;
 SitePreferences: SitePreferencesApi; SiteDeferredMedia: Window['SiteDeferredMedia'];
 SiteSkeletonUI: Pick<Window['SiteSkeletonUI'], 'initWrapper'>;
 renderHeaderContent(target: HTMLElement): void; renderCtaContent(target: HTMLElement): void;
 matchMedia(query?: string): { matches: boolean; addEventListener(event: string, listener: (event: Pick<MediaQueryListEvent, 'matches'>) => void): void };
}


const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

async function start({ page = 'build', languages = ['ja-JP'], saved = {}, storageThrows = false, removeThrows = false, dark = false }: StartOptions = {}) {
    const errors: string[] = [];
    const virtualConsole = new VirtualConsole();
    virtualConsole.on('jsdomError', (error) => errors.push(error.message));
    const dom = new JSDOM(read(`${page === 'home' ? 'index' : page}.html`), {
        url: 'https://mc.snkisk.com/', runScripts: 'outside-only', virtualConsole,
    });
    const { window } = dom as unknown as { window: PreferencesWindow };
    const store = new Map(Object.entries(saved));
    const removals: string[] = [];
    let themeListener: ((event: Pick<MediaQueryListEvent, 'matches'>) => void) | undefined;
    Object.defineProperty(window.navigator, 'languages', { configurable: true, value: languages });
    Object.defineProperty(window.navigator, 'language', { configurable: true, value: languages[0] || '' });
    Object.defineProperty(window, 'localStorage', { value: {
        getItem(key: string) { if (storageThrows) throw new Error('storage unavailable'); return store.get(key) ?? null; },
        setItem(key: string, value: string) { if (storageThrows) throw new Error('storage unavailable'); store.set(key, value); },
        removeItem(key: string) { removals.push(key); if (storageThrows || removeThrows) throw new Error('storage unavailable'); store.delete(key); },
    } });
    window.matchMedia = (query?: string) => ({ matches: query === '(prefers-reduced-motion: reduce)' ? false : dark, addEventListener(_event: string, listener: (event: Pick<MediaQueryListEvent, 'matches'>) => void) { if (query !== '(prefers-reduced-motion: reduce)') themeListener = listener; } });
    const document = window.document;
    const originalTitle = document.title;
    const originalDescription = document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content;
    const hero = document.querySelector<HTMLElement>('.build-hero-text h1')!;
    const heroHtml = hero?.innerHTML;
    const heroNodes = hero ? [...hero.childNodes] : [];
    const decoration = document.querySelector<HTMLElement>('.build-hero-link span')!;
    const heroLinkText = document.querySelector<HTMLElement>('.build-hero-link')?.lastChild;
    const alt = document.querySelector<HTMLImageElement>('.build-hero img')!;
    const originalAlt = alt?.getAttribute('alt');
    window.eval(read('js/safe-dom.js'));
    window.eval(read('js/site-preferences.js'));
    if (document.readyState === 'loading') await new Promise<Event>((resolve) => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
    window.eval(read('js/header-include.js'));
    window.eval(read('js/cta-include.js'));
    function loadComponents() {
        const header = document.querySelector<HTMLElement>('#site-header')!;
        if (header) {
            header.innerHTML = read('components/header.html');
            window.renderHeaderContent(header);
            document.dispatchEvent(new window.CustomEvent('sitepreferencescontentready', { detail: { target: header } }));
        }
        const cta = document.querySelector<HTMLElement>('#cta')!;
        if (cta) {
            cta.innerHTML = read('components/cta.html');
            window.renderCtaContent(cta);
            document.dispatchEvent(new window.CustomEvent('sitepreferencescontentready', { detail: { target: cta } }));
        }
        const footer = document.querySelector<HTMLElement>('#footer');
        if (footer) {
            footer.innerHTML = read('components/footer.html');
            document.dispatchEvent(new window.CustomEvent('sitepreferencescontentready', { detail: { target: footer } }));
        }
        return { header, cta, footer };
    }
    return { dom, window, document, store, errors, removals, loadComponents,
        originalTitle, originalDescription, hero, heroHtml, heroNodes, decoration, heroLinkText, alt, originalAlt,
        changeTheme(matches: boolean) { dark = matches; themeListener?.({ matches }); },
        changeLanguages(value: string[]) {
            Object.defineProperty(window.navigator, 'languages', { configurable: true, value });
            Object.defineProperty(window.navigator, 'language', { configurable: true, value: value[0] || '' });
            window.dispatchEvent(new window.Event('languagechange'));
        },
    };
}

const languageKey = 'minecraft-fan-site-language';
const themeKey = 'minecraft-fan-site-theme';
type Context = Awaited<ReturnType<typeof start>>;
function choose(ctx: Context, preference: 'theme' | 'language', value: string) {
    const select = ctx.document.querySelector<HTMLSelectElement>(`[data-${preference}-select]`)!;
    select.value = value;
    select.dispatchEvent(new ctx.window.Event('change', { bubbles: true }));
    return select;
}
const toggleLanguage = (ctx: Context) => choose(ctx, 'language', ctx.window.SitePreferences.getState().language === 'ja' ? 'en' : 'ja');
const toggleTheme = (ctx: Context) => choose(ctx, 'theme', ctx.window.SitePreferences.getState().theme === 'dark' ? 'light' : 'dark');
const state = ({ window }: Awaited<ReturnType<typeof start>>) => ({ ...window.SitePreferences.getState() });
const assertNoReload = ({ errors }: Awaited<ReturnType<typeof start>>) => assert.deepEqual(errors, [], '再読み込み・navigation・未実装DOM処理を呼ばない');

test('初回ENの遅延header/CTAが日本語へ戻り、同じリンク/Textノードを保持する', async () => {
    const ctx = await start({ saved: { [languageKey]: 'en' } });
    try {
        const { header, cta } = ctx.loadComponents();
        const nav = header.querySelector<HTMLElement>('[data-header-nav] a')!;
        const navText = nav.firstChild;
        const title = cta.querySelector<HTMLElement>('.cta-title')!;
        const titleText = title.firstChild;
        const primary = cta.querySelector<HTMLElement>('.cta-primary')!;
        assert.equal(nav.textContent, 'Gallery');
        assert.equal(title.textContent, 'Now build your own landscape');
        toggleLanguage(ctx);
        assert.equal(nav.textContent, 'ギャラリー');
        assert.equal(title.textContent, '次は、あなたの景色を建てよう');
        assert.equal(nav.firstChild, navText);
        assert.equal(title.firstChild, titleText);
        assert.equal(cta.querySelector<HTMLElement>('.cta-primary')!, primary);
        assert.equal(primary.getAttribute('href'), 'https://www.minecraft.net/ja-jp');
        toggleLanguage(ctx);
        assert.equal(nav.textContent, 'Gallery');
        assert.equal(title.textContent, 'Now build your own landscape');
        assertNoReload(ctx);
    } finally { ctx.dom.window.close(); }
});

test('本文JA→EN→JAで改行・装飾span・属性を復元し、Text/Elementを作り直さない', async () => {
    const ctx = await start();
    try {
        ctx.loadComponents();
        const button = ctx.document.querySelector<HTMLElement>('[data-language-select]')!;
        button.focus();
        toggleLanguage(ctx);
        assert.equal(ctx.hero.textContent, 'Turn imaginationinto blocks.');
        assert.equal(ctx.document.querySelector<HTMLElement>('.build-hero-link span')!, ctx.decoration);
        assert.equal(ctx.document.querySelector<HTMLElement>('.build-hero-link')!.lastChild, ctx.heroLinkText);
        assert.equal(ctx.document.activeElement, button);
        assert.equal(ctx.document.documentElement.lang, 'en');
        assert.equal(ctx.alt.getAttribute('alt'), 'Grand Minecraft build by a lake at dusk');
        toggleLanguage(ctx);
        assert.equal(ctx.hero.innerHTML, ctx.heroHtml);
        assert.deepEqual([...ctx.hero.childNodes], ctx.heroNodes);
        assert.equal(ctx.alt.getAttribute('alt'), ctx.originalAlt);
        assert.equal(ctx.document.querySelector<HTMLMetaElement>('meta[name="description"]')!.content, ctx.originalDescription);
        assert.equal(ctx.document.documentElement.lang, 'ja');
        assert.equal(ctx.document.activeElement, button);
        assertNoReload(ctx);
    } finally { ctx.dom.window.close(); }
});

test('title/descriptionはホーム原文へ戻し、入力値とmediaノードを保持する', async () => {
    const ctx = await start({ page: 'home' });
    try {
        ctx.loadComponents();
        const input = ctx.document.createElement('textarea');
        input.value = '公式サイトで始める';
        ctx.document.body.appendChild(input);
        const media = ctx.document.querySelector<HTMLImageElement | HTMLVideoElement>('video, img')!;
        toggleLanguage(ctx);
        assert.equal(ctx.document.title, 'Home - Minecraft Fan Site');
        assert.equal(input.value, '公式サイトで始める');
        assert.equal(ctx.document.querySelector<HTMLImageElement | HTMLVideoElement>('video, img')!, media);
        toggleLanguage(ctx);
        assert.equal(ctx.document.title, ctx.originalTitle);
        assert.equal(ctx.document.querySelector<HTMLMetaElement>('meta[name="description"]')!.content, ctx.originalDescription);
        assert.equal(input.value, '公式サイトで始める');
        assertNoReload(ctx);
    } finally { ctx.dom.window.close(); }
});

for (const [languages, expected] of [
    [['en'], 'en'], [['en-US'], 'en'], [['ja-JP'], 'ja'], [['fr-FR'], 'ja'],
    [['fr-FR', 'en-GB'], 'en'], [['ja-JP', 'en'], 'ja'], [[], 'ja'],
] as Array<[string[], SiteLanguage]>) {
    test(`端末言語 ${JSON.stringify(languages)} は ${expected} にfallbackする`, async () => {
        const ctx = await start({ languages, saved: { [languageKey]: 'unsupported' } });
        try { assert.equal(state(ctx).language, expected); assert.equal(state(ctx).languageSource, 'auto'); }
        finally { ctx.dom.window.close(); }
    });
}

test('storage全操作が例外でも言語・テーマを反映し、自動設定へ戻せる', async () => {
    const ctx = await start({ storageThrows: true });
    try {
        ctx.loadComponents();
        toggleLanguage(ctx);
        assert.equal(state(ctx).language, 'en');
        toggleTheme(ctx);
        assert.equal(state(ctx).theme, 'dark');
        const theme = ctx.document.querySelector<HTMLSelectElement>('[data-theme-select]')!;
        theme.focus(); choose(ctx, 'theme', 'system');
        assert.equal(state(ctx).language, 'en', 'theme System leaves language unchanged');
        choose(ctx, 'language', 'system');
        assert.equal(state(ctx).language, 'ja');
        assert.equal(state(ctx).theme, 'light');
        assert.equal(state(ctx).themeSource, 'auto');
        assert.equal(state(ctx).languageSource, 'auto');
        assert.equal(ctx.document.activeElement, theme);
        assert.deepEqual(ctx.removals, [themeKey, languageKey]);
        assertNoReload(ctx);
    } finally { ctx.dom.window.close(); }
});

test('削除失敗で保存済み手動値を再採用せずSystemへ戻す', async () => {
    const ctx = await start({ saved: { [languageKey]: 'en', [themeKey]: 'dark' }, removeThrows: true });
    try {
        ctx.loadComponents();
        ctx.window.SitePreferences.resetToAutomatic();
        assert.equal(state(ctx).language, 'ja');
        assert.equal(state(ctx).theme, 'light');
        assert.equal(state(ctx).languageSource, 'auto');
        assert.equal(ctx.store.get(languageKey), 'en', '削除失敗を実際に再現');
        assert.deepEqual(ctx.removals, [themeKey, languageKey]);
        assertNoReload(ctx);
    } finally { ctx.dom.window.close(); }
});

test('Systemは端末変更に追従し、手動選択中は追従せずmetadataを同期する', async () => {
    const ctx = await start();
    try {
        ctx.loadComponents();
        ctx.changeLanguages(['en-US']);
        ctx.changeTheme(true);
        assert.equal(state(ctx).language, 'en');
        assert.equal(state(ctx).theme, 'dark');
        assert.equal(ctx.document.documentElement.style.colorScheme, 'dark');
        assert.equal(ctx.document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]')!.content, 'dark');
        assert.ok(ctx.document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')!.content);
        toggleLanguage(ctx);
        toggleTheme(ctx);
        ctx.changeLanguages(['en-GB']);
        ctx.changeTheme(true);
        assert.equal(state(ctx).language, 'ja');
        assert.equal(state(ctx).theme, 'light');
        assert.equal(ctx.document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]')!.content, 'light');
        assertNoReload(ctx);
    } finally { ctx.dom.window.close(); }
});

for (const page of ['home', 'survival', 'pvp', 'build', 'licenses', '404']) {
    test(`${page}画面は既存本文のTextノードを維持してJA→EN→JAを往復する`, async () => {
        const ctx = await start({ page });
        try {
            ctx.loadComponents();
            const walker = ctx.document.createTreeWalker(ctx.document.body, ctx.window.NodeFilter.SHOW_TEXT);
            const originals = new Map<Text, string>();
            while (walker.nextNode()) {
                const text = walker.currentNode as Text;
                if (!text.parentElement?.closest('[data-site-preferences]')) originals.set(text, text.data);
            }
            toggleLanguage(ctx);
            assert.equal(ctx.document.documentElement.lang, 'en');
            toggleLanguage(ctx);
            assert.equal(ctx.document.documentElement.lang, 'ja');
            for (const [node, original] of originals) {
                assert.equal(node.isConnected, true, '元Textノードを保持');
                assert.equal(node.data, original, '空白を含む原文を復元');
            }
            assertNoReload(ctx);
        } finally { ctx.dom.window.close(); }
    });
}

for (const language of ['ja', 'en']) {
    test(`${language}の選択範囲をtheme切替と同じ言語の再適用で維持する`, async () => {
        const ctx = await start({ saved: { [languageKey]: language } });
        try {
            ctx.loadComponents();
            const text = [...ctx.hero.childNodes].find((node): node is Text => node.nodeType === 3 && (node as Text).data.trim().length > 4)!;
            const selection = ctx.window.getSelection()!; const range = ctx.document.createRange();
            range.setStart(text, 1); range.setEnd(text, 4); selection.removeAllRanges(); selection.addRange(range);
            const selectedText = selection.toString();
            toggleTheme(ctx);
            ctx.window.SitePreferences.applyTextTranslations();
            assert.equal(selection.anchorNode, text); assert.equal(selection.anchorOffset, 1);
            assert.equal(selection.focusNode, text); assert.equal(selection.focusOffset, 4); assert.equal(selection.toString(), selectedText);
            assertNoReload(ctx);
        } finally { ctx.dom.window.close(); }
    });
}

test('言語往復で本文の前向き・後ろ向きSelectionの端点と非空範囲を維持する', async () => {
    const ctx = await start();
    try {
        ctx.loadComponents();
        const text = [...ctx.document.querySelector<HTMLElement>('.build-story h2')!.childNodes].find(node => node.nodeType === 3 && (node as Text).data.trim()) as Text;
        const selection = ctx.window.getSelection()!;
        for (const [anchor, focus] of [[1, 4], [4, 1]]) {
            selection.setBaseAndExtent(text, anchor, text, focus);
            toggleLanguage(ctx);
            assert.equal(selection.anchorNode, text); assert.equal(selection.anchorOffset, anchor);
            assert.equal(selection.focusNode, text); assert.equal(selection.focusOffset, focus); assert.notEqual(selection.toString(), '');
            toggleLanguage(ctx); assert.equal(selection.anchorOffset, anchor); assert.equal(selection.focusOffset, focus); assert.notEqual(selection.toString(), '');
        }
        assert.equal(ctx.document.documentElement.dir, 'ltr'); assertNoReload(ctx);
    } finally { ctx.dom.window.close(); }
});
test('現在のSurvival/PVP画像ラベルも英語と原文を往復する', async () => {
    for (const page of ['survival', 'pvp']) {
        const ctx = await start({ page });
        try {
            ctx.loadComponents(); const images = [...ctx.document.querySelectorAll<HTMLImageElement>('img[alt]')]; const originals = images.map(image => image.alt);
            toggleLanguage(ctx);
            for (const image of images) assert.equal(/[\u3040-\u30ff\u3400-\u9fff]/u.test(image.alt), false, image.alt);
            toggleLanguage(ctx); assert.deepEqual(images.map(image => image.alt), originals);
        } finally { ctx.dom.window.close(); }
    }
});
test('EN選択後に遅延挿入されるメディアもcontentreadyで翻訳する', async () => {
    const ctx = await start({ page: 'home', saved: { [languageKey]: 'en' } });
    try {
        ctx.loadComponents(); const wrapper = ctx.document.createElement('div');
        wrapper.dataset.deferredMedia = ''; wrapper.dataset.mediaSrc = '/image.webp'; wrapper.dataset.mediaAlt = '畑と家畜が揃ったサバイバル農場';
        ctx.document.body.appendChild(wrapper); ctx.window.SiteSkeletonUI = { initWrapper() {} };
        ctx.window.eval(read('js/deferred-media.js')); ctx.window.SiteDeferredMedia.ensureDeferredMedia(wrapper);
        const image = wrapper.querySelector<HTMLImageElement>('img')!; assert.equal(image.alt, 'Survival farm with crops and livestock');
        toggleLanguage(ctx); assert.equal(wrapper.querySelector<HTMLImageElement>('img')!, image); assert.equal(image.alt, wrapper.dataset.mediaAlt);
    } finally { ctx.dom.window.close(); }
});

test('短い翻訳へ戻す末尾Selectionも非空で方向を維持する', async () => {
    const ctx = await start({ saved: { [languageKey]: 'en' } });
    try {
        ctx.loadComponents(); const text = [...ctx.document.querySelector<HTMLElement>('.build-story h2')!.childNodes].find(node => node.nodeType === 3 && (node as Text).data.trim()) as Text;
        const selection = ctx.window.getSelection()!;
        for (const backwards of [false, true]) {
            if (ctx.document.documentElement.lang !== 'en') toggleLanguage(ctx);
            const start = text.length - 10; const end = text.length - 2;
            selection.setBaseAndExtent(text, backwards ? end : start, text, backwards ? start : end);
            toggleLanguage(ctx);
            assert.equal(selection.isCollapsed, false); assert.notEqual(selection.toString(), '');
            assert.equal(selection.anchorNode, text); assert.equal(selection.focusNode, text);
            assert.equal(selection.anchorOffset > selection.focusOffset, backwards);
            assert.ok(selection.anchorOffset <= text.length); assert.ok(selection.focusOffset <= text.length);
        }
    } finally { ctx.dom.window.close(); }
});

test('翻訳の長さ境界をまたぐSelectionも方向と到達可能な範囲を維持する', async () => {
    const ctx = await start({ saved: { [languageKey]: 'en' } });
    try {
        ctx.loadComponents();
        const text = [...ctx.document.querySelector<HTMLElement>('.build-story h2')!.childNodes].find(node => node.nodeType === 3 && (node as Text).data.trim()) as Text;
        toggleLanguage(ctx); const shortLength = text.length; toggleLanguage(ctx);
        const selection = ctx.window.getSelection()!;
        const intervals = [[shortLength - 1, shortLength + 1], [shortLength, shortLength + 1], [text.length - 1, text.length], [0, text.length]];
        for (const [start, end] of intervals) {
            for (const backwards of [false, true]) {
                if (ctx.document.documentElement.lang !== 'en') toggleLanguage(ctx);
                selection.setBaseAndExtent(text, backwards ? end : start, text, backwards ? start : end);
                toggleLanguage(ctx);
                assert.equal(selection.anchorNode, text); assert.equal(selection.focusNode, text);
                assert.equal(selection.isCollapsed, false); assert.notEqual(selection.toString(), '');
                assert.equal(selection.anchorOffset > selection.focusOffset, backwards);
                const low = Math.min(selection.anchorOffset, selection.focusOffset);
                const high = Math.max(selection.anchorOffset, selection.focusOffset);
                assert.ok(low >= 0 && high <= text.length);
                assert.ok(high - low <= end - start);
                if (start === 0) { assert.equal(low, 0); assert.equal(high, text.length); }
            }
        }
    } finally { ctx.dom.window.close(); }
});

for (const page of ['home', 'survival', 'pvp', 'build', 'licenses']) {
    test(`${page} keeps one preference group in the footer and preserves saved choices`, async () => {
        const ctx = await start({ page, saved: { [languageKey]: 'en', [themeKey]: 'dark' } });
        try {
            const { header, footer } = ctx.loadComponents();
            assert.equal(header.querySelector('[data-site-preferences]'), null);
            assert.equal(ctx.document.querySelectorAll('[data-site-preferences]').length, 1);
            const group = footer!.querySelector<HTMLElement>('[data-site-preferences]')!;
            assert.equal(group.getAttribute('role'), 'group');
            assert.equal(state(ctx).language, 'en');
            assert.equal(state(ctx).theme, 'dark');
            const language = group.querySelector<HTMLElement>('[data-language-select]')!;
            const theme = group.querySelector<HTMLElement>('[data-theme-select]')!;
            language.focus(); choose(ctx, 'language', 'ja');
            assert.equal(ctx.document.activeElement, language);
            assert.equal(ctx.store.get(languageKey), 'ja');
            choose(ctx, 'theme', 'light');
            assert.equal(ctx.store.get(themeKey), 'light');
            theme.focus(); choose(ctx, 'theme', 'system');
            assert.equal(ctx.store.has(themeKey), false);
            assert.equal(ctx.store.get(languageKey), 'ja');
            assert.equal(state(ctx).languageSource, 'manual');
            choose(ctx, 'language', 'system');
            assert.equal(ctx.store.has(languageKey), false);
            assert.equal(ctx.document.activeElement, theme);
            assert.equal(state(ctx).languageSource, 'auto');
            assert.equal(state(ctx).themeSource, 'auto');
            assertNoReload(ctx);
        } finally { ctx.dom.window.close(); }
    });
}

test('native selects expose their source, labels, options, and current values without a combined reset button', async () => {
    const ctx = await start();
    try {
        const { footer } = ctx.loadComponents();
        const group = footer!.querySelector('[data-site-preferences]')!;
        assert.equal(group.querySelector('[data-preferences-auto]'), null);
        const selects = [...group.querySelectorAll<HTMLSelectElement>('select')];
        assert.equal(selects.length, 2);
        for (const select of selects) {
            assert.equal(select.disabled, false);
            assert.equal(select.value, 'system');
            assert.equal(select.labels?.length, 1);
        }
        assert.deepEqual([...selects[0]!.options].map(o => o.value), ['system', 'light', 'dark']);
        assert.deepEqual([...selects[1]!.options].map(o => o.value), ['system', 'ja', 'en']);
        ctx.changeTheme(true); ctx.changeLanguages(['en-US']);
        assert.deepEqual(selects.map(select => select.value), ['system', 'system']);
        assert.equal(group.querySelector('[data-theme-label]')!.textContent, 'Appearance');
        assert.equal(group.querySelector('[data-language-label]')!.textContent, 'Language');
        assert.equal(selects[0]!.options[0]!.textContent, 'System');
        choose(ctx, 'theme', 'dark');
        assert.equal(selects[0]!.value, 'dark');
        assert.equal(selects[1]!.value, 'system');
        assert.equal(ctx.store.get(themeKey), 'dark');
        assert.equal(ctx.store.has(languageKey), false);
    } finally { ctx.dom.window.close(); }
});

for (const visible of [true, false]) {
    test(`direct footer language actions ${visible ? 'keep the visible group anchored' : 'do not scroll an offscreen group into view'}`, async () => {
        const ctx = await start({ page: 'pvp' });
        try {
            const { footer } = ctx.loadComponents();
            const group = footer!.querySelector<HTMLElement>('[data-site-preferences]')!;
            let y = visible ? 220 : 0;
            const initialY = y;
            Object.defineProperty(ctx.dom.window, 'scrollY', { configurable: true, get: () => y });
            Object.defineProperty(ctx.dom.window, 'innerHeight', { configurable: true, value: 844 });
            ctx.dom.window.scrollTo = ((_: number, top: number) => { y = top; }) as typeof ctx.dom.window.scrollTo;
            group.getBoundingClientRect = () => {
                const top = (ctx.document.documentElement.lang === 'en' ? 1138 : 1000) - y;
                return { top, bottom: top + 44, height: 44 } as DOMRect;
            };
            const before = group.getBoundingClientRect().top;
            toggleLanguage(ctx);
            assert.equal(y, initialY + (visible ? 138 : 0));
            if (visible) assert.equal(group.getBoundingClientRect().top, before);
            toggleLanguage(ctx);
            assert.equal(y, initialY);
            toggleLanguage(ctx);
            const language = group.querySelector<HTMLSelectElement>('[data-language-select]')!;
            language.focus(); choose(ctx, 'language', 'system');
            assert.equal(y, initialY);
            assert.equal(ctx.document.activeElement, language);
            assertNoReload(ctx);
        } finally { ctx.dom.window.close(); }
    });
}

test('OS changes and programmatic preference reset preserve absolute scroll instead of moving to the footer', async () => {
    const ctx = await start({ page: 'pvp' });
    try {
        const { footer } = ctx.loadComponents();
        const group = footer!.querySelector<HTMLElement>('[data-site-preferences]')!;
        let y = 220;
        Object.defineProperty(ctx.dom.window, 'scrollY', { configurable: true, get: () => y });
        ctx.dom.window.scrollTo = ((_: number, top: number) => { y = top; }) as typeof ctx.dom.window.scrollTo;
        group.getBoundingClientRect = () => ({ top: ctx.document.documentElement.lang === 'en' ? 918 : 780, bottom: 824 }) as DOMRect;
        ctx.changeLanguages(['en-US']);
        assert.equal(y, 220);
        ctx.window.SitePreferences.resetToAutomatic();
        assert.equal(y, 220);
        assertNoReload(ctx);
    } finally { ctx.dom.window.close(); }
});

for (const preference of ['theme', 'language'] as const) {
    test(`${preference} System resets only its key and preserves the other manual field across OS changes`, async () => {
        const ctx = await start({ saved: { [themeKey]: 'dark', [languageKey]: 'en' } });
        try {
            ctx.loadComponents();
            const select = ctx.document.querySelector<HTMLSelectElement>(`[data-${preference}-select]`)!;
            const optionNodes = [...select.options];
            select.focus(); choose(ctx, preference, 'system');
            assert.equal(ctx.document.activeElement, select);
            assert.deepEqual([...select.options], optionNodes);
            assert.deepEqual(ctx.removals, [preference === 'theme' ? themeKey : languageKey]);
            assert.equal(ctx.store.get(preference === 'theme' ? languageKey : themeKey), preference === 'theme' ? 'en' : 'dark');
            ctx.changeTheme(true); ctx.changeLanguages(['en-US']);
            ctx.changeTheme(false); ctx.changeLanguages(['ja-JP']);
            assert.equal(state(ctx).theme, preference === 'theme' ? 'light' : 'dark');
            assert.equal(state(ctx).language, preference === 'language' ? 'ja' : 'en');
            assert.equal(select.value, 'system');
            assertNoReload(ctx);
        } finally { ctx.dom.window.close(); }
    });
}

test('invalid native values and unrelated selects cannot mutate preferences or storage', async () => {
    const ctx = await start();
    try {
        ctx.loadComponents(); const before = state(ctx);
        choose(ctx, 'theme', 'untrusted'); choose(ctx, 'language', 'untrusted');
        const outside = ctx.document.createElement('select'); outside.dataset.themeSelect = '';
        outside.innerHTML = '<option value="dark">Dark</option>'; ctx.document.body.appendChild(outside);
        outside.dispatchEvent(new ctx.window.Event('change', { bubbles: true }));
        assert.deepEqual(state(ctx), before); assert.equal(ctx.store.size, 0);
        assertNoReload(ctx);
    } finally { ctx.dom.window.close(); }
});

test('native selections retain legacy stored values on relaunch and independent System reset after removal failure', async () => {
    const first = await start();
    first.loadComponents(); choose(first, 'theme', 'dark'); choose(first, 'language', 'en');
    const saved = Object.fromEntries(first.store); first.dom.window.close();
    const ctx = await start({ saved, removeThrows: true });
    try {
        assert.equal(ctx.document.documentElement.dataset.themeSource, 'manual');
        ctx.loadComponents();
        assert.equal(ctx.document.querySelector<HTMLSelectElement>('[data-theme-select]')!.value, 'dark');
        assert.equal(ctx.document.querySelector<HTMLSelectElement>('[data-language-select]')!.value, 'en');
        choose(ctx, 'language', 'system');
        assert.equal(state(ctx).languageSource, 'auto'); assert.equal(state(ctx).language, 'ja');
        assert.equal(state(ctx).themeSource, 'manual'); assert.equal(state(ctx).theme, 'dark');
        assert.equal(ctx.document.documentElement.dataset.themeSource, 'manual');
        assert.deepEqual(ctx.removals, [languageKey]);
        assert.equal(ctx.store.get(languageKey), 'en', 'failure fixture retains persisted value but does not reapply it');
        assertNoReload(ctx);
    } finally { ctx.dom.window.close(); }
});

test('404 standalone shares the native selection contract and keeps focus on the selected field', async () => {
    const ctx = await start({ page: '404', saved: { [themeKey]: 'dark' } });
    try {
        const group = ctx.document.querySelector('.site-preferences--standalone')!;
        assert.equal(group.getAttribute('role'), 'group'); assert.equal(ctx.document.querySelector('footer'), null);
        assert.equal(ctx.document.body.firstElementChild, group, 'reading order matches settings above the 404 content');
        const theme = group.querySelector<HTMLSelectElement>('[data-theme-select]')!;
        assert.equal(theme.labels?.length, 1); assert.equal(theme.value, 'dark'); theme.focus();
        choose(ctx, 'theme', 'system'); assert.equal(ctx.document.activeElement, theme);
        choose(ctx, 'language', 'en'); assert.equal(group.querySelector('[data-theme-label]')!.textContent, 'Appearance');
        assert.equal(ctx.document.querySelectorAll('[data-site-preferences]').length, 1); assertNoReload(ctx);
    } finally { ctx.dom.window.close(); }
});

test('uninitialized footer native selects are disabled and settings precede named social links', () => {
    const dom = new JSDOM(read('components/footer.html'));
    try {
        const toolbar = dom.window.document.querySelector('.footer-toolbar')!;
        assert.equal(toolbar.firstElementChild?.hasAttribute('data-site-preferences'), true);
        assert.equal(toolbar.lastElementChild?.className, 'footer-social');
        assert.deepEqual([...toolbar.querySelectorAll('select')].map(select => select.disabled), [true, true]);
        assert.deepEqual([...toolbar.querySelectorAll('.footer-social-link')].map(link => link.getAttribute('aria-label')), ['X: sinkaisoku_', 'GitHub: Special-Rapid']);
    } finally { dom.window.close(); }
});
