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
 matchMedia(): { matches: boolean; addEventListener(event: string, listener: (event: Pick<MediaQueryListEvent, 'matches'>) => void): void };
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
    window.matchMedia = () => ({ matches: dark, addEventListener(_event: string, listener: (event: Pick<MediaQueryListEvent, 'matches'>) => void) { themeListener = listener; } });
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
        return { header, cta };
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
const toggleLanguage = ({ document }: Awaited<ReturnType<typeof start>>) => document.querySelector<HTMLElement>('[data-language-toggle]')!.click();
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
        const button = ctx.document.querySelector<HTMLElement>('[data-language-toggle]')!;
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
        ctx.document.querySelector<HTMLElement>('[data-theme-toggle]')!.click();
        assert.equal(state(ctx).theme, 'dark');
        const auto = ctx.document.querySelector<HTMLElement>('[data-preferences-auto]')!;
        auto.focus();
        auto.click();
        assert.equal(state(ctx).language, 'ja');
        assert.equal(state(ctx).theme, 'light');
        assert.equal(state(ctx).themeSource, 'auto');
        assert.equal(state(ctx).languageSource, 'auto');
        assert.equal(ctx.document.activeElement, ctx.document.querySelector<HTMLElement>('[data-theme-toggle]')!);
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
        ctx.document.querySelector<HTMLElement>('[data-theme-toggle]')!.click();
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
            ctx.document.querySelector<HTMLElement>('[data-theme-toggle]')!.click();
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
