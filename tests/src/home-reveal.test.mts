import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const source = readFileSync('js/loading-overlay.js', 'utf8');
function fixture({ home = true, reduced = false, jquery = true, overlay = true, headerHeight = 0, scrollY = 0, hash = '', inlineStyles = false } = {}) {
    const dom = new JSDOM(`<html data-view-theme="${home ? 'home' : 'survival'}"><body>
        ${overlay ? '<div data-loading-overlay></div>' : ''}
        <div id="site-header"></div><div class="firstview-text-container">Minecraft</div>
        </body></html>`, { runScripts: 'outside-only', url: `https://mc.snkisk.com/${hash}` });
    const browser = dom.window as unknown as Window & { eval(source: string): unknown; ResizeObserver: typeof ResizeObserver };
    const root = browser.document.documentElement;
    if (inlineStyles) {
        root.style.cssText = "color: red; scroll-behavior: smooth";
        browser.document.body.style.cssText = "background-color: blue; overflow-x: clip";
    }
    Object.defineProperty(browser, 'scrollY', { value: scrollY, configurable: true });
    const header = browser.document.getElementById('site-header')!;
    header.getBoundingClientRect = () => ({ height: headerHeight }) as DOMRect;
    let resizeHeader: (() => void) | undefined;
    let observerDisconnects = 0;
    browser.ResizeObserver = class {
        constructor(callback: () => void) { resizeHeader = callback; }
        observe() {} unobserve() {}
        disconnect() { observerDisconnects++; }
    } as unknown as typeof ResizeObserver;
    const timers = new Map<number, { callback: () => void; delay: number }>();
    const frames: FrameRequestCallback[] = [];
    const motion = new dom.window.EventTarget();
    const introRegistrations: Array<{ type: string; signal?: AbortSignal }> = [];
    const introTypes = new Set(['sitepreferencescontentready', 'resize', 'pointerdown', 'wheel', 'touchmove', 'keydown', 'focusin', 'hashchange', 'pagehide', 'pageshow', 'change']);
    for (const target of [browser as unknown as EventTarget, browser.document, motion as unknown as EventTarget]) {
        const add = target.addEventListener.bind(target);
        target.addEventListener = (type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions) => {
            if (introTypes.has(type)) introRegistrations.push({ type, signal: typeof options === 'object' ? options.signal : undefined });
            add(type, listener, options);
        };
    }
    let nextId = 0;
    let fadeCallback: (() => void) | undefined;
    let hideCalls = 0;
    let hiddenEvents = 0;
    browser.matchMedia = () => Object.assign(motion, { matches: reduced }) as unknown as MediaQueryList;
    browser.setTimeout = ((callback: () => void, delay: number) => {
        const id = ++nextId;
        timers.set(id, { callback, delay });
        return id;
    }) as typeof browser.setTimeout;
    browser.clearTimeout = id => { timers.delete(id!); };
    browser.requestAnimationFrame = callback => { frames.push(callback); return ++nextId; };
    if (jquery) {
        browser.jQuery = (() => ({ delay(delay: number) {
            assert.equal(delay, 80);
            return { fadeOut(duration: number, callback: () => void) {
                assert.equal(duration, 650);
                hideCalls++;
                fadeCallback = callback;
            } };
        } })) as unknown as JQueryStatic;
    }
    browser.addEventListener('site:loading-overlay-hidden', () => hiddenEvents++);
    browser.eval(source);
    function runTimer(delay: number) {
        const entry = [...timers].find(([, timer]) => timer.delay === delay);
        assert.ok(entry, `Expected ${delay}ms timer`);
        timers.delete(entry[0]);
        entry[1].callback();
    }
    function complete() {
        browser.dispatchEvent(new dom.window.Event('site:initial-load-complete'));
        let budget = 100;
        while (frames.length && budget-- > 0) frames.shift()!(0);
        assert.ok(budget > 0, 'Progress animation must settle');
    }
    return { dom, browser, root, timers, complete, runTimer, introRegistrations,
        fade: () => fadeCallback!(), hideCalls: () => hideCalls, hiddenEvents: () => hiddenEvents,
        resizeHeader: (height: number) => { headerHeight = height; resizeHeader?.(); },
        observerDisconnects: () => observerDisconnects,
        reduceMotion: () => motion.dispatchEvent(Object.assign(new dom.window.Event('change'), { matches: true })),
        close: () => dom.window.close(),
    };
}

test('home reveal waits for the actual overlay fade then 1300ms before the 1500ms reveal', () => {
    const f = fixture();
    assert.ok(f.root.classList.contains('home-reveal-pending'));
    f.complete();
    assert.equal(f.hideCalls(), 1);
    assert.equal([...f.timers.values()].some(timer => timer.delay === 1300), false);
    f.fade();
    assert.equal(f.hiddenEvents(), 1);
    assert.ok(f.root.classList.contains('home-reveal-pending'));
    assert.equal([...f.timers.values()].some(timer => timer.delay === 1500), false);
    f.runTimer(1300);
    assert.ok(f.root.classList.contains('home-reveal-running'));
    assert.equal(f.root.classList.contains('home-reveal-pending'), false);
    f.runTimer(1500);
    assert.equal(f.root.className, '');
    f.complete(); f.fade();
    assert.equal(f.hiddenEvents(), 1);
    assert.equal(f.hideCalls(), 1);
    assert.equal(f.timers.size, 0);
    f.close();
});

test('the stopped-fade safety timer begins only after load completion and removes the actual overlay', () => {
    const f = fixture();
    assert.equal(f.timers.size, 0);
    f.complete();
    f.runTimer(1500);
    assert.equal(f.browser.document.querySelector<HTMLElement>('[data-loading-overlay]')!.style.display, 'none');
    assert.equal(f.hiddenEvents(), 1);
    f.fade();
    assert.equal(f.hiddenEvents(), 1);
    f.runTimer(1300); f.runTimer(1500);
    assert.equal(f.root.className, '');
    f.close();
});

for (const phase of ['before-load', 'video-only', 'revealing']) {
    for (const action of ['keyboard', 'escape', 'restored-page', 'reduced-motion', 'control', 'focus', 'resize', 'pagehide', 'hashchange']) {
        test(`${action} bypasses decoration during ${phase}`, () => {
            const f = fixture();
            if (phase !== 'before-load') { f.complete(); f.fade(); }
            if (phase === 'revealing') f.runTimer(1300);
            if (action === 'keyboard') f.browser.dispatchEvent(new f.dom.window.KeyboardEvent('keydown', { key: 'Tab' }));
            if (action === 'restored-page') f.browser.dispatchEvent(new f.dom.window.PageTransitionEvent('pageshow', { persisted: true }));
            if (action === 'reduced-motion') f.reduceMotion();
            if (action === 'escape') f.browser.dispatchEvent(new f.dom.window.KeyboardEvent('keydown', { key: 'Escape' }));
            if (action === 'control' || action === 'focus') {
                const button = f.browser.document.createElement('button');
                f.browser.document.body.append(button);
                if (action === 'focus') button.focus();
                else button.dispatchEvent(new f.dom.window.Event('pointerdown', { bubbles: true }));
            }
            if (action === 'pagehide' || action === 'hashchange') f.browser.dispatchEvent(new f.dom.window.Event(action));
            if (action === 'resize') f.browser.dispatchEvent(new f.dom.window.Event('resize'));
            assert.equal(f.root.className, '');
            assert.equal(f.timers.size, 0);
            assert.equal(f.introRegistrations.length, 11);
            assert.ok(f.introRegistrations.every(entry => entry.signal?.aborted));
            if (phase === 'before-load') { f.complete(); f.fade(); }
            assert.equal(f.root.className, '');
            assert.equal(f.timers.size, 0);
            f.close();
        });
    }
}

test('initial reduced motion skips both decorative delay and overlay animation', () => {
    const f = fixture({ reduced: true }); f.complete();
    assert.equal(f.root.className, ''); assert.equal(f.timers.size, 0);
    assert.equal(f.hideCalls(), 0); assert.equal(f.hiddenEvents(), 1);
    assert.equal(f.browser.document.querySelector<HTMLElement>('[data-loading-overlay]')!.style.display, 'none');
    f.close();
});

test('other pages and a missing overlay do not receive home reveal state', () => {
    const other = fixture({ home: false }); other.complete(); other.fade();
    assert.equal(other.root.className, ''); assert.equal(other.timers.size, 0); other.close();
    const missing = fixture({ overlay: false });
    assert.equal(missing.root.className, ''); assert.equal(missing.timers.size, 0); missing.close();
});

test('without jQuery the actual display fallback still precedes the video-only interval', () => {
    const f = fixture({ jquery: false }); f.complete();
    assert.equal(f.browser.document.querySelector<HTMLElement>('[data-loading-overlay]')!.style.display, 'none');
    f.runTimer(1300); f.runTimer(1500);
    assert.equal(f.root.className, ''); assert.equal(f.timers.size, 0); f.close();
});


test('flowing header measurement stays live while loading and releases if framing changes after overlay exit', () => {
    const f = fixture({ headerHeight: 82 });
    assert.equal(f.root.style.getPropertyValue('--home-intro-header-space'), '82px');
    f.resizeHeader(100);
    assert.equal(f.root.style.getPropertyValue('--home-intro-header-space'), '100px');
    f.complete(); f.fade();
    f.resizeHeader(101);
    assert.equal(f.root.className, '');
    assert.equal(f.root.style.getPropertyValue('--home-intro-header-space'), '');
    assert.equal(f.timers.size, 0);
    assert.ok(f.observerDisconnects() > 0);
    f.close();
});

test('restored scroll positions and fragment destinations skip the decorative intro', () => {
    for (const options of [{ scrollY: 200 }, { hash: '#survival' }]) {
        const f = fixture(options); f.complete(); f.fade();
        assert.equal(f.root.className, ''); assert.equal(f.timers.size, 0);
        assert.equal(f.introRegistrations.length, 11);
        assert.ok(f.introRegistrations.every(entry => entry.signal?.aborted));
        f.close();
    }
});


test('normal completion releases every intro listener and later scroll does no cleanup work', () => {
    const f = fixture(); f.complete(); f.fade(); f.runTimer(1300); f.runTimer(1500);
    assert.equal(f.introRegistrations.length, 11);
    assert.ok(f.introRegistrations.every(entry => entry.signal?.aborted));
    const disconnects = f.observerDisconnects();
    Object.defineProperty(f.browser, 'scrollY', { value: 500 });
    f.browser.dispatchEvent(new f.dom.window.Event('scroll'));
    f.browser.dispatchEvent(new f.dom.window.KeyboardEvent('keydown', { key: 'Tab' }));
    f.browser.document.dispatchEvent(new f.dom.window.Event('sitepreferencescontentready'));
    assert.equal(f.observerDisconnects(), disconnects);
    assert.equal(f.timers.size, 0);
    f.close();
});


for (const phase of ['before-load', 'video-only', 'revealing']) {
    test(`page-scroll intentions do not finish the intro during ${phase}`, () => {
        const f = fixture();
        if (phase !== 'before-load') { f.complete(); f.fade(); }
        if (phase === 'revealing') f.runTimer(1300);
        const beforeClass = f.root.className;
        const beforeTimers = [...f.timers.keys()];
        f.browser.document.body.dispatchEvent(new f.dom.window.Event('pointerdown', { bubbles: true }));
        f.browser.dispatchEvent(new f.dom.window.Event('scroll'));
        const wheel = new f.dom.window.WheelEvent('wheel', { deltaY: 200, cancelable: true });
        f.browser.dispatchEvent(wheel);
        assert.equal(wheel.defaultPrevented, true);
        const touch = Object.assign(new f.dom.window.Event('touchmove', { cancelable: true }), { touches: [{}] });
        f.browser.dispatchEvent(touch);
        assert.equal(touch.defaultPrevented, true);
        for (const key of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Spacebar']) {
            const event = new f.dom.window.KeyboardEvent('keydown', { key, cancelable: true });
            f.browser.dispatchEvent(event);
            assert.equal(event.defaultPrevented, true, key);
        }
        assert.equal(f.root.className, beforeClass);
        assert.deepEqual([...f.timers.keys()], beforeTimers);
        if (phase === 'before-load') { f.complete(); f.fade(); }
        if (phase !== 'revealing') f.runTimer(1300);
        f.runTimer(1500);
        assert.equal(f.root.className, '');
        for (const event of [
            new f.dom.window.WheelEvent('wheel', { deltaY: 200, cancelable: true }),
            Object.assign(new f.dom.window.Event('touchmove', { cancelable: true }), { touches: [{}] }),
            new f.dom.window.KeyboardEvent('keydown', { key: 'PageDown', cancelable: true }),
        ]) {
            f.browser.dispatchEvent(event);
            assert.equal(event.defaultPrevented, false);
        }
        assert.ok(f.introRegistrations.every(entry => entry.signal?.aborted));
        f.close();
    });
}

test('pinch zoom and modified shortcuts are not prevented or treated as intro skips', () => {
    const f = fixture(); f.complete(); f.fade();
    const events = [
        Object.assign(new f.dom.window.Event('touchmove', { cancelable: true }), { touches: [{}, {}] }),
        new f.dom.window.WheelEvent('wheel', { ctrlKey: true, deltaY: 100, cancelable: true }),
        new f.dom.window.WheelEvent('wheel', { metaKey: true, deltaY: 100, cancelable: true }),
        ...['ctrlKey', 'metaKey', 'altKey'].map(modifier => new f.dom.window.KeyboardEvent('keydown', { key: 'Home', [modifier]: true, cancelable: true })),
    ];
    for (const event of events) {
        f.browser.dispatchEvent(event);
        assert.equal(event.defaultPrevented, false);
        assert.ok(f.root.classList.contains('home-reveal-pending'));
    }
    f.runTimer(1300); f.runTimer(1500); f.close();
});

for (const tag of ['input', 'textarea', 'select', 'button', 'editable']) {
    test(`${tag} scroll-key semantics remain available and release the intro`, () => {
        const f = fixture();
        const control = f.browser.document.createElement(tag === 'editable' ? 'div' : tag);
        if (tag === 'editable') control.setAttribute('contenteditable', 'true');
        f.browser.document.body.append(control);
        const event = new f.dom.window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
        control.dispatchEvent(event);
        assert.equal(event.defaultPrevented, false);
        assert.equal(f.root.className, '');
        assert.ok(f.introRegistrations.every(entry => entry.signal?.aborted));
        f.close();
    });
}

test('completion and lifecycle escapes preserve pre-existing inline style declarations', () => {
    for (const escape of [false, true]) {
        const f = fixture({ inlineStyles: true });
        const rootStyle = f.root.getAttribute('style');
        const bodyStyle = f.browser.document.body.getAttribute('style');
        f.complete(); f.fade();
        if (escape) f.browser.dispatchEvent(new f.dom.window.Event('pagehide'));
        else { f.runTimer(1300); f.runTimer(1500); }
        assert.equal(f.root.getAttribute('style'), rootStyle!.replace(/ --home-intro-header-space: [^;]+;/, ''));
        assert.equal(f.browser.document.body.getAttribute('style'), bodyStyle);
        assert.equal(f.root.style.getPropertyValue('--home-intro-header-space'), '');
        assert.equal(f.timers.size, 0);
        f.close();
    }
});
