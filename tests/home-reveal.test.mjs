import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
const source = readFileSync('js/loading-overlay.js', 'utf8');
function fixture({ home = true, reduced = false, jquery = true, overlay = true, headerHeight = 0, scrollY = 0, hash = '' } = {}) {
    const dom = new JSDOM(`<html data-view-theme="${home ? 'home' : 'survival'}"><body>
        ${overlay ? '<div data-loading-overlay></div>' : ''}
        <div id="site-header"></div><div class="firstview-text-container">Minecraft</div>
        </body></html>`, { runScripts: 'outside-only', url: `https://mc.snkisk.com/${hash}` });
    const browser = dom.window;
    const root = browser.document.documentElement;
    Object.defineProperty(browser, 'scrollY', { value: scrollY, configurable: true });
    const header = browser.document.getElementById('site-header');
    header.getBoundingClientRect = () => ({ height: headerHeight });
    let resizeHeader;
    let observerDisconnects = 0;
    browser.ResizeObserver = class {
        constructor(callback) { resizeHeader = callback; }
        observe() { }
        unobserve() { }
        disconnect() { observerDisconnects++; }
    };
    const timers = new Map();
    const frames = [];
    const motion = new dom.window.EventTarget();
    const introRegistrations = [];
    const introTypes = new Set(['sitepreferencescontentready', 'resize', 'pointerdown', 'scroll', 'keydown', 'pageshow', 'change']);
    for (const target of [browser, browser.document, motion]) {
        const add = target.addEventListener.bind(target);
        target.addEventListener = (type, listener, options) => {
            if (introTypes.has(type))
                introRegistrations.push({ type, signal: typeof options === 'object' ? options.signal : undefined });
            add(type, listener, options);
        };
    }
    let nextId = 0;
    let fadeCallback;
    let hideCalls = 0;
    let hiddenEvents = 0;
    browser.matchMedia = () => Object.assign(motion, { matches: reduced });
    browser.setTimeout = ((callback, delay) => {
        const id = ++nextId;
        timers.set(id, { callback, delay });
        return id;
    });
    browser.clearTimeout = id => { timers.delete(id); };
    browser.requestAnimationFrame = callback => { frames.push(callback); return ++nextId; };
    if (jquery) {
        browser.jQuery = (() => ({ delay(delay) {
                assert.equal(delay, 80);
                return { fadeOut(duration, callback) {
                        assert.equal(duration, 650);
                        hideCalls++;
                        fadeCallback = callback;
                    } };
            } }));
    }
    browser.addEventListener('site:loading-overlay-hidden', () => hiddenEvents++);
    browser.eval(source);
    function runTimer(delay) {
        const entry = [...timers].find(([, timer]) => timer.delay === delay);
        assert.ok(entry, `Expected ${delay}ms timer`);
        timers.delete(entry[0]);
        entry[1].callback();
    }
    function complete() {
        browser.dispatchEvent(new dom.window.Event('site:initial-load-complete'));
        let budget = 100;
        while (frames.length && budget-- > 0)
            frames.shift()(0);
        assert.ok(budget > 0, 'Progress animation must settle');
    }
    return { dom, browser, root, timers, complete, runTimer, introRegistrations,
        fade: () => fadeCallback(), hideCalls: () => hideCalls, hiddenEvents: () => hiddenEvents,
        resizeHeader: (height) => { headerHeight = height; resizeHeader?.(); },
        observerDisconnects: () => observerDisconnects,
        reduceMotion: () => motion.dispatchEvent(Object.assign(new dom.window.Event('change'), { matches: true })),
        close: () => dom.window.close(), };
}
test('home reveal waits for the actual overlay fade then 1300ms before the 1000ms reveal', () => {
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
    f.runTimer(1000);
    assert.equal(f.root.className, '');
    f.complete();
    f.fade();
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
    assert.equal(f.browser.document.querySelector('[data-loading-overlay]').style.display, 'none');
    assert.equal(f.hiddenEvents(), 1);
    f.fade();
    assert.equal(f.hiddenEvents(), 1);
    f.runTimer(1300);
    f.runTimer(1000);
    assert.equal(f.root.className, '');
    f.close();
});
for (const phase of ['before-load', 'video-only', 'revealing']) {
    for (const action of ['keyboard', 'restored-page', 'reduced-motion', 'pointer', 'resize', 'scroll']) {
        test(`${action} bypasses decoration during ${phase}`, () => {
            const f = fixture();
            if (phase !== 'before-load') {
                f.complete();
                f.fade();
            }
            if (phase === 'revealing')
                f.runTimer(1300);
            if (action === 'keyboard')
                f.browser.dispatchEvent(new f.dom.window.KeyboardEvent('keydown', { key: 'Tab' }));
            if (action === 'restored-page')
                f.browser.dispatchEvent(new f.dom.window.PageTransitionEvent('pageshow', { persisted: true }));
            if (action === 'reduced-motion')
                f.reduceMotion();
            if (action === 'pointer')
                f.browser.dispatchEvent(new f.dom.window.Event('pointerdown'));
            if (action === 'resize')
                f.browser.dispatchEvent(new f.dom.window.Event('resize'));
            if (action === 'scroll') {
                Object.defineProperty(f.browser, 'scrollY', { value: 100 });
                f.browser.dispatchEvent(new f.dom.window.Event('scroll'));
            }
            assert.equal(f.root.className, '');
            assert.equal(f.timers.size, 0);
            assert.equal(f.introRegistrations.length, 7);
            assert.ok(f.introRegistrations.every(entry => entry.signal?.aborted));
            if (phase === 'before-load') {
                f.complete();
                f.fade();
            }
            assert.equal(f.root.className, '');
            assert.equal(f.timers.size, 0);
            f.close();
        });
    }
}
test('initial reduced motion skips both decorative delay and overlay animation', () => {
    const f = fixture({ reduced: true });
    f.complete();
    assert.equal(f.root.className, '');
    assert.equal(f.timers.size, 0);
    assert.equal(f.hideCalls(), 0);
    assert.equal(f.hiddenEvents(), 1);
    assert.equal(f.browser.document.querySelector('[data-loading-overlay]').style.display, 'none');
    f.close();
});
test('other pages and a missing overlay do not receive home reveal state', () => {
    const other = fixture({ home: false });
    other.complete();
    other.fade();
    assert.equal(other.root.className, '');
    assert.equal(other.timers.size, 0);
    other.close();
    const missing = fixture({ overlay: false });
    assert.equal(missing.root.className, '');
    assert.equal(missing.timers.size, 0);
    missing.close();
});
test('without jQuery the actual display fallback still precedes the video-only interval', () => {
    const f = fixture({ jquery: false });
    f.complete();
    assert.equal(f.browser.document.querySelector('[data-loading-overlay]').style.display, 'none');
    f.runTimer(1300);
    f.runTimer(1000);
    assert.equal(f.root.className, '');
    assert.equal(f.timers.size, 0);
    f.close();
});
test('mobile header measurement stays live while loading and releases if framing changes after overlay exit', () => {
    const f = fixture({ headerHeight: 82 });
    assert.equal(f.root.style.getPropertyValue('--home-intro-header-space'), '82px');
    f.resizeHeader(100);
    assert.equal(f.root.style.getPropertyValue('--home-intro-header-space'), '100px');
    f.complete();
    f.fade();
    f.resizeHeader(101);
    assert.equal(f.root.className, '');
    assert.equal(f.root.style.getPropertyValue('--home-intro-header-space'), '');
    assert.equal(f.timers.size, 0);
    assert.ok(f.observerDisconnects() > 0);
    f.close();
});
test('restored scroll positions and fragment destinations skip the decorative intro', () => {
    for (const options of [{ scrollY: 200 }, { hash: '#survival' }]) {
        const f = fixture(options);
        f.complete();
        f.fade();
        assert.equal(f.root.className, '');
        assert.equal(f.timers.size, 0);
        assert.equal(f.introRegistrations.length, 7);
        assert.ok(f.introRegistrations.every(entry => entry.signal?.aborted));
        f.close();
    }
});
test('normal completion releases every intro listener and later scroll does no cleanup work', () => {
    const f = fixture();
    f.complete();
    f.fade();
    f.runTimer(1300);
    f.runTimer(1000);
    assert.equal(f.introRegistrations.length, 7);
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
