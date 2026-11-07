import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const languageKey = 'minecraft-fan-site-language';
const themeKey = 'minecraft-fan-site-theme';
interface Effect { element: Element; frames: Keyframe[]; duration: number; cancelled: boolean }

// A deterministic animation API/clock, not a visual rendering or performance test.
async function start() {
    const dom = new JSDOM(`<!doctype html><html data-view-theme="home"><head><title>Test</title>
<style>*{opacity:1}body{background-color:rgb(255,255,255);color:rgb(51,51,51)}
html[data-color-scheme="dark"] body{background-color:rgb(17,22,29);color:rgb(243,247,250)}
[data-site-preferences]{--preferences-surface:#fff}</style></head><body>
<nav data-header-nav><a data-header-link-index="0" href="#">survival</a></nav>
<p id="copy">もうちょっと知りたい？</p><p id="unchanged">Explore</p>
<div class="survival-cta-inner"><p>今すぐマインクラフトをプレイしよう</p></div>
<input id="editing" value="unchanged"><div contenteditable="true">draft</div>
${read('components/footer.html')}</body></html>`, { url: 'https://mc.snkisk.com/', runScripts: 'outside-only', pretendToBeVisual: true });
    const w = dom.window;
    const api = () => (w as unknown as { SitePreferences: SitePreferencesApi }).SitePreferences;
    let now = 0, nextId = 0, scrollY = 0, throwAnimation = false;
    const jobs = new Map<number, { at: number; callback: () => void }>();
    const effects: Effect[] = [];
    const media = new Map<string, { matches: boolean; listeners: Array<(event: { matches: boolean }) => void> }>();
    const schedule = (callback: () => void, delay = 0) => { const id = ++nextId; jobs.set(id, { at: now + delay, callback }); return id; };
    Object.defineProperties(w, {
        setTimeout: { value: (callback: () => void, delay: number) => schedule(callback, delay) },
        clearTimeout: { value: (id: number) => jobs.delete(id) },
        requestAnimationFrame: { value: (callback: () => void) => schedule(callback, 16) },
        cancelAnimationFrame: { value: (id: number) => jobs.delete(id) },
        scrollY: { get: () => scrollY },
        scrollTo: { value: (_x: number, y: number) => { scrollY = y; } },
        matchMedia: { value: (query: string) => {
            if (!media.has(query)) media.set(query, { matches: false, listeners: [] });
            const value = media.get(query)!;
            return { get matches() { return value.matches; }, addEventListener: (_name: string, listener: (event: { matches: boolean }) => void) => value.listeners.push(listener) };
        } },
    });
    Object.defineProperty(w.navigator, 'languages', { configurable: true, value: ['ja-JP'] });
    Object.defineProperty(w.navigator, 'language', { configurable: true, value: 'ja-JP' });
    Object.defineProperty(w.document.documentElement, 'scrollHeight', { configurable: true, value: 2000 });
    w.HTMLElement.prototype.getBoundingClientRect = function () {
        const en = w.document.documentElement.lang === 'en';
        const top = (this.matches('[data-site-preferences]') ? 500 + (en ? 40 : 0) : 100) - scrollY;
        const height = this.matches('.survival-cta-inner') && en ? 70 : 50;
        return { top, bottom: top + height, left: 10, right: 210, width: 200, height, x: 10, y: top, toJSON() {} };
    };
    Object.defineProperty(w.Element.prototype, 'animate', { configurable: true, value: function (this: Element, frames: Keyframe[], options: KeyframeAnimationOptions) {
        if (throwAnimation) throw new Error('unsupported animation backend');
        const effect: Effect = { element: this, frames, duration: Number(options.duration), cancelled: false };
        effects.push(effect);
        let reject!: (error: Error) => void;
        const finished = new Promise<void>((_resolve, failure) => { reject = failure; });
        return { finished, cancel() { effect.cancelled = true; reject(new Error('cancelled')); } };
    } });
    Object.defineProperty(w.Element.prototype, 'getAnimations', { value: () => [] });
    function advance(ms: number) {
        const target = now + ms;
        for (;;) {
            const entry = [...jobs].filter(([, job]) => job.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
            if (!entry) break;
            now = entry[1].at; jobs.delete(entry[0]); entry[1].callback();
        }
        now = target;
    }
    w.eval(read('js/site-preferences.js'));
    if (w.document.readyState === 'loading') await new Promise<void>(resolve => w.document.addEventListener('DOMContentLoaded', () => resolve(), { once: true }));
    advance(32);
    function choose(kind: 'language' | 'theme', value: string) {
        const element = w.document.querySelector<HTMLSelectElement>(`[data-${kind}-select]`)!;
        element.value = value;
        element.dispatchEvent(new w.Event('change', { bubbles: true }));
        return element;
    }
    function changeMedia(query: string, matches: boolean) {
        const value = media.get(query)!; value.matches = matches;
        value.listeners.forEach(listener => listener({ matches }));
    }
    return { dom, w, api, advance, choose, effects, jobs, changeMedia,
        live: () => effects.filter(effect => !effect.cancelled),
        throwAnimation: () => { throwAnimation = true; },
        setScroll: (value: number) => { scrollY = value; w.dispatchEvent(new w.Event('scroll')); },
        close: () => { w.dispatchEvent(new w.Event('pagehide')); dom.window.close(); },
    };
}

test('language publishes choice/storage immediately, commits after 100ms, cleans after 220ms and preserves nodes', async () => {
    const ctx = await start();
    try {
        const copy = ctx.w.document.querySelector('#copy')!; const text = copy.firstChild;
        const select = ctx.choose('language', 'en');
        assert.equal(select.value, 'en'); assert.equal(ctx.w.localStorage.getItem(languageKey), 'en');
        assert.equal(ctx.api().getState().language, 'ja'); assert.equal(copy.textContent, 'もうちょっと知りたい？');
        assert.ok(ctx.live().some(effect => effect.duration === 100));
        assert.ok(ctx.live().every(effect => !effect.element.closest('[data-site-preferences]')));
        assert.ok(ctx.live().every(effect => !effect.element.matches('[data-header-link-index], #unchanged')));
        ctx.advance(99); assert.equal(ctx.api().getState().language, 'ja');
        ctx.advance(1); assert.equal(ctx.api().getState().language, 'en'); assert.equal(copy.firstChild, text);
        assert.equal(copy.textContent, 'Want to learn more?'); assert.ok(ctx.live().some(effect => effect.duration === 220));
        ctx.advance(220); assert.equal(ctx.live().length, 0); assert.equal(ctx.jobs.size, 0);
        assert.equal(ctx.w.document.documentElement.hasAttribute('data-preference-language-moving'), false);
    } finally { ctx.close(); }
});

test('rapid language changes invalidate old commits and retain independent System storage', async () => {
    const ctx = await start();
    try {
        ctx.choose('theme', 'dark'); ctx.advance(280);
        ctx.choose('language', 'en'); ctx.advance(50); ctx.choose('language', 'ja'); ctx.advance(500);
        assert.equal(ctx.api().getState().language, 'ja'); assert.equal(ctx.live().length, 0);
        ctx.choose('language', 'en'); ctx.advance(100); ctx.choose('language', 'system'); ctx.advance(500);
        assert.equal(ctx.api().getState().languageSource, 'auto'); assert.equal(ctx.api().getState().language, 'ja');
        assert.equal(ctx.w.localStorage.getItem(languageKey), null); assert.equal(ctx.w.localStorage.getItem(themeKey), 'dark');
    } finally { ctx.close(); }
});

test('theme and delayed content settle pending latest language without resetting selected value', async () => {
    const ctx = await start();
    try {
        ctx.choose('language', 'en'); ctx.advance(40); ctx.choose('theme', 'dark');
        assert.equal(ctx.api().getState().language, 'en'); assert.equal(ctx.w.document.querySelector<HTMLSelectElement>('[data-language-select]')!.value, 'en');
        ctx.advance(500); assert.equal(ctx.api().getState().theme, 'dark');
        ctx.choose('language', 'ja'); ctx.w.document.dispatchEvent(new ctx.w.CustomEvent('sitepreferencescontentready', { detail: { target: ctx.w.document.body } }));
        assert.equal(ctx.api().getState().language, 'ja'); assert.equal(ctx.live().length, 0);
    } finally { ctx.close(); }
});

for (const event of ['resize', 'pagehide', 'pageshow', 'hashchange', 'blur']) {
    test(`${event} settles pending language and removes effects/timers`, async () => {
        const ctx = await start();
        try {
            ctx.choose('language', 'en'); ctx.w.dispatchEvent(new ctx.w.Event(event));
            assert.equal(ctx.api().getState().language, 'en'); assert.equal(ctx.live().length, 0); assert.equal(ctx.jobs.size, 0);
            ctx.advance(500); assert.equal(ctx.api().getState().language, 'en');
        } finally { ctx.close(); }
    });
}

test('reduced motion becoming active settles pending language and prevents new animation', async () => {
    const ctx = await start();
    try {
        ctx.choose('language', 'en'); ctx.changeMedia('(prefers-reduced-motion: reduce)', true);
        assert.equal(ctx.api().getState().language, 'en'); assert.equal(ctx.live().length, 0);
        const count = ctx.effects.length; ctx.choose('language', 'ja'); ctx.choose('theme', 'dark');
        assert.equal(ctx.api().getState().language, 'ja'); assert.equal(ctx.effects.length, count);
    } finally { ctx.close(); }
});

test('editing, composition, selected text, loader and intro bypass motion without replacing DOM', async () => {
    const ctx = await start();
    try {
        const input = ctx.w.document.querySelector<HTMLInputElement>('#editing')!;
        input.focus(); input.setSelectionRange(2, 5); ctx.choose('language', 'en');
        assert.equal(ctx.effects.length, 0); assert.equal(ctx.w.document.activeElement, input); assert.equal(input.selectionStart, 2); assert.equal(input.value, 'unchanged');
        input.blur(); ctx.w.document.dispatchEvent(new ctx.w.Event('compositionstart')); ctx.choose('language', 'ja');
        assert.equal(ctx.effects.length, 0); ctx.w.document.dispatchEvent(new ctx.w.Event('compositionend'));
        const text = ctx.w.document.querySelector('#copy')!.firstChild!; const range = ctx.w.document.createRange(); range.selectNodeContents(text);
        ctx.w.getSelection()!.addRange(range); ctx.choose('language', 'en'); assert.equal(ctx.effects.length, 0); assert.equal(text.isConnected, true);
        ctx.w.getSelection()!.removeAllRanges(); ctx.w.document.documentElement.classList.add('home-reveal-running');
        ctx.choose('language', 'ja'); assert.equal(ctx.effects.length, 0);
        ctx.w.document.documentElement.classList.remove('home-reveal-running');
        const overlay = ctx.w.document.createElement('div'); overlay.dataset.loadingOverlay = ''; ctx.w.document.body.prepend(overlay);
        ctx.choose('language', 'en'); assert.equal(ctx.effects.length, 0);
    } finally { ctx.close(); }
});

test('animation backend failure and missing WAAPI settle the requested state', async () => {
    const ctx = await start();
    try {
        ctx.throwAnimation(); ctx.choose('language', 'en'); assert.equal(ctx.api().getState().language, 'en'); assert.equal(ctx.jobs.size, 0);
        Object.defineProperty(ctx.w.Element.prototype, 'animate', { value: undefined }); ctx.choose('language', 'ja');
        assert.equal(ctx.api().getState().language, 'ja'); ctx.choose('theme', 'dark'); assert.equal(ctx.api().getState().theme, 'dark');
    } finally { ctx.close(); }
});

test('footer anchor follows translated layout and user scroll stops compensation without rollback', async () => {
    const ctx = await start();
    try {
        const group = ctx.w.document.querySelector('[data-site-preferences]')!;
        const top = group.getBoundingClientRect().top;
        ctx.choose('language', 'en'); ctx.advance(100);
        assert.equal(group.getBoundingClientRect().top, top);
        // FLIP uses viewport deltas: footer compensation must not be added twice.
        const incoming = ctx.live().find(effect => effect.element.id === 'copy' && effect.duration === 220)!;
        assert.equal(incoming.frames[0].translate, '0px 40px');
        ctx.setScroll(80); ctx.advance(400); assert.equal(ctx.w.scrollY, 80); assert.equal(ctx.live().length, 0); assert.equal(ctx.jobs.size, 0);
    } finally { ctx.close(); }
});

test('theme uses bounded 280ms effects, immediate control pairs and final metadata; rapid change snaps latest', async () => {
    const ctx = await start();
    try {
        const select = ctx.choose('theme', 'dark');
        assert.equal(ctx.api().getState().theme, 'dark'); assert.equal(select.value, 'dark');
        assert.ok(ctx.live().some(effect => effect.duration === 280));
        assert.ok(ctx.live().every(effect => !effect.element.matches('select, option, .footer-social-link')));
        assert.equal(ctx.w.document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')!.content, 'rgb(17, 22, 29)');
        ctx.advance(100); const count = ctx.effects.length; ctx.choose('theme', 'light');
        assert.equal(ctx.effects.length, count); assert.equal(ctx.live().length, 0); assert.equal(ctx.jobs.size, 0);
        assert.equal(ctx.w.document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')!.content, 'rgb(255, 255, 255)');
        ctx.choose('theme', 'dark'); ctx.advance(280); assert.equal(ctx.live().length, 0); assert.equal(ctx.jobs.size, 0);
    } finally { ctx.close(); }
});

test('System updates preserve manual other field and reset cancels pending work', async () => {
    const ctx = await start();
    try {
        ctx.choose('language', 'en'); ctx.changeMedia('(prefers-color-scheme: dark)', true);
        assert.equal(ctx.api().getState().language, 'en'); assert.equal(ctx.api().getState().theme, 'dark');
        assert.equal(ctx.w.localStorage.getItem(languageKey), 'en');
        ctx.api().resetToAutomatic(); assert.equal(ctx.api().getState().languageSource, 'auto');
        assert.equal(ctx.live().length, 0); assert.equal(ctx.jobs.size, 0); assert.equal(ctx.w.localStorage.getItem(languageKey), null);
    } finally { ctx.close(); }
});


test('programmatic focus interrupts outgoing and incoming effects before exposing the focus target', async () => {
    const ctx = await start();
    try {
        const link = ctx.w.document.querySelector<HTMLAnchorElement>('[data-header-link-index]')!;
        ctx.choose('language', 'en'); link.focus();
        assert.equal(ctx.api().getState().language, 'en'); assert.equal(ctx.live().length, 0);
        link.blur(); ctx.choose('language', 'ja'); ctx.advance(100); link.focus();
        assert.equal(ctx.live().length, 0); assert.equal(ctx.jobs.size, 0); assert.equal(ctx.w.document.activeElement, link);
    } finally { ctx.close(); }
});

test('hidden document settles pending latest language and leaves no asynchronous work', async () => {
    const ctx = await start();
    try {
        ctx.choose('language', 'en');
        Object.defineProperty(ctx.w.document, 'hidden', { configurable: true, value: true });
        ctx.w.document.dispatchEvent(new ctx.w.Event('visibilitychange'));
        assert.equal(ctx.api().getState().language, 'en'); assert.equal(ctx.live().length, 0); assert.equal(ctx.jobs.size, 0);
    } finally { ctx.close(); }
});


test('footer transactions keep document height atomic and need no animation-frame scroll loop', async () => {
    const ctx = await start();
    try {
        ctx.choose('language', 'en'); ctx.advance(100);
        assert.equal(ctx.w.scrollY, 40);
        assert.ok(ctx.live().every(effect => effect.frames.every(frame => frame.height === undefined)));
        assert.equal(ctx.jobs.size, 1, 'only the bounded incoming cleanup timer remains');
        ctx.advance(220); assert.equal(ctx.live().length, 0); assert.equal(ctx.w.scrollY, 40);
    } finally { ctx.close(); }
});


test('stale outgoing callback cannot commit after a newer request and finished listeners do no work', async () => {
    const ctx = await start();
    try {
        ctx.choose('language', 'en');
        const stale = [...ctx.jobs.values()].map(job => job.callback);
        ctx.choose('language', 'ja'); stale.forEach(callback => callback());
        assert.equal(ctx.api().getState().language, 'ja'); assert.equal(ctx.jobs.size, 0);
        let changes = 0; ctx.w.document.addEventListener('sitepreferenceschange', () => changes++);
        for (let i = 0; i < 20; i++) ctx.w.dispatchEvent(new ctx.w.Event('scroll'));
        ctx.w.dispatchEvent(new ctx.w.Event('pointerdown'));
        assert.equal(changes, 0); assert.equal(ctx.jobs.size, 0);
    } finally { ctx.close(); }
});

test('pending manual language ignores OS changes and System accepts the latest OS value', async () => {
    const ctx = await start();
    try {
        ctx.choose('language', 'en'); ctx.w.dispatchEvent(new ctx.w.Event('languagechange'));
        assert.equal(ctx.w.document.querySelector<HTMLSelectElement>('[data-language-select]')!.value, 'en');
        ctx.advance(320); assert.equal(ctx.api().getState().language, 'en');
        Object.defineProperty(ctx.w.navigator, 'languages', { configurable: true, value: ['en-GB'] });
        ctx.choose('language', 'system'); assert.equal(ctx.api().getState().languageSource, 'auto');
        Object.defineProperty(ctx.w.navigator, 'languages', { configurable: true, value: ['ja-JP'] });
        ctx.w.dispatchEvent(new ctx.w.Event('languagechange'));
        assert.equal(ctx.api().getState().language, 'ja'); assert.equal(ctx.live().length, 0);
    } finally { ctx.close(); }
});

test('theme animation failure and mid-flight reduce leave the latest theme and metadata', async () => {
    const ctx = await start();
    try {
        assert.equal(ctx.effects.length, 0, 'restoration is immediate');
        ctx.choose('theme', 'dark'); ctx.changeMedia('(prefers-reduced-motion: reduce)', true);
        assert.equal(ctx.api().getState().theme, 'dark'); assert.equal(ctx.live().length, 0); assert.equal(ctx.jobs.size, 0);
        ctx.changeMedia('(prefers-reduced-motion: reduce)', false); ctx.throwAnimation(); ctx.choose('theme', 'light');
        assert.equal(ctx.api().getState().theme, 'light'); assert.equal(ctx.jobs.size, 0);
        assert.equal(ctx.w.document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')!.content, 'rgb(255, 255, 255)');
    } finally { ctx.close(); }
});


test('OS theme events tolerate the head-only initialization phase', async () => {
    const ctx = await start();
    try {
        const body = ctx.w.document.body; body.remove();
        ctx.changeMedia('(prefers-color-scheme: dark)', true);
        assert.equal(ctx.api().getState().theme, 'dark'); assert.equal(ctx.jobs.size, 0);
        ctx.w.document.documentElement.appendChild(body);
        ctx.w.dispatchEvent(new ctx.w.Event('pagehide'));
        assert.equal(ctx.live().length, 0); assert.equal(ctx.jobs.size, 0);
    } finally { ctx.close(); }
});


test('unanchored text-only boxes retain bounded real-height motion', async () => {
    const ctx = await start();
    try {
        ctx.w.document.querySelector('.site-preferences--footer')!.classList.remove('site-preferences--footer');
        ctx.choose('language', 'en'); ctx.advance(100);
        const layout = ctx.live().find(effect => effect.frames[0].height !== undefined)!;
        assert.equal(layout.duration, 220); assert.equal(layout.frames[0].height, '50px'); assert.equal(layout.frames[1].height, '70px');
        ctx.advance(220); assert.equal(ctx.live().length, 0);
    } finally { ctx.close(); }
});


test('a delayed scroll event without position change does not cancel outgoing or discard its footer anchor', async () => {
    const ctx = await start();
    try {
        const group = ctx.w.document.querySelector('[data-site-preferences]')!;
        const top = group.getBoundingClientRect().top;
        ctx.choose('language', 'en');
        ctx.w.dispatchEvent(new ctx.w.Event('scroll'));
        assert.equal(ctx.api().getState().language, 'ja');
        assert.ok(ctx.live().some(effect => effect.duration === 100));
        ctx.advance(100); assert.equal(group.getBoundingClientRect().top, top);
        ctx.w.dispatchEvent(new ctx.w.Event('scroll'));
        assert.ok(ctx.live().some(effect => effect.duration === 220));
        ctx.advance(220); assert.equal(ctx.jobs.size, 0);
    } finally { ctx.close(); }
});


test('theme source is exposed at restoration and stays independent through manual, System and OS updates', async () => {
    const ctx = await start();
    try {
        const root = ctx.w.document.documentElement;
        assert.equal(root.dataset.themeSource, 'auto');
        ctx.choose('theme', 'dark');
        assert.equal(root.dataset.themeSource, 'manual');
        ctx.choose('language', 'en'); ctx.advance(320);
        assert.equal(root.dataset.themeSource, 'manual');
        ctx.choose('theme', 'system');
        assert.equal(root.dataset.themeSource, 'auto');
        ctx.changeMedia('(prefers-color-scheme: dark)', true);
        assert.equal(root.dataset.themeSource, 'auto');
        assert.equal(root.dataset.colorScheme, 'dark');
        ctx.choose('theme', 'light');
        ctx.changeMedia('(prefers-color-scheme: dark)', false);
        assert.equal(root.dataset.themeSource, 'manual');
        ctx.api().resetToAutomatic();
        assert.equal(root.dataset.themeSource, 'auto');
    } finally { ctx.close(); }
});


for (const pageClass of ['pvp-detail-page', 'build-detail-page', '']) {
    test(`${pageClass || 'standard'} footer keeps the intended atomic or smooth text/surface contract`, async () => {
        const ctx = await start();
        try {
            ctx.w.document.body.className = pageClass;
            const style = ctx.w.document.createElement('style');
            style.textContent = `footer{background-color:rgb(255,255,255);border-top:1px solid rgb(51,51,51)}
footer p{color:rgb(51,51,51)}
html[data-color-scheme="dark"] footer{background-color:rgb(17,22,29);border-top-color:rgb(243,247,250)}
html[data-color-scheme="dark"] footer p{color:rgb(243,247,250)}`;
            ctx.w.document.head.appendChild(style);
            ctx.choose('theme', 'dark');
            const footerEffects = ctx.live().filter(effect => effect.element.closest('footer'));
            const paintTween = footerEffects.some(effect => ['backgroundColor', 'color'].some(key => {
                const property = key as keyof Keyframe;
                return effect.frames[0][property] !== effect.frames[effect.frames.length - 1][property];
            }));
            assert.equal(paintTween, pageClass === '');
            assert.ok(footerEffects.some(effect => effect.frames[0].borderTopColor !== effect.frames[effect.frames.length - 1].borderTopColor), 'footer borders keep their smooth transition');
            assert.ok(ctx.live().some(effect => effect.element === ctx.w.document.body && effect.frames[0].backgroundColor !== effect.frames[effect.frames.length - 1].backgroundColor), 'other page paint still animates');
            ctx.advance(280);
            assert.equal(ctx.live().length, 0); assert.equal(ctx.jobs.size, 0);
        } finally { ctx.close(); }
    });
}
