import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createServer } from 'node:http';
import { JSDOM } from 'jsdom';
const source = (name) => readFileSync(`js/${name}.js`, 'utf8');
function textLoader(fetch) {
    const timers = new Map();
    let sequence = 0;
    const window = { setTimeout(callback) { const id = ++sequence; timers.set(id, callback); return id; }, clearTimeout(id) { timers.delete(id); } };
    vm.runInNewContext(source('text-loader'), { window, fetch, AbortController, DOMException, TextDecoder });
    return { load: window.SiteTextLoader.load, timers };
}
test('text loaderは分割UTF8と未知の長さを正しく扱いtimerを解放する', async () => {
    const bytes = new TextEncoder().encode('読み込み');
    let index = 0;
    const response = new Response(new ReadableStream({ pull(controller) { if (index < bytes.length)
            controller.enqueue(bytes.slice(index, ++index));
        else
            controller.close(); } }));
    const { load, timers } = textLoader(async () => response);
    const progress = [];
    assert.equal(await load('/component', {}, state => progress.push(state)), '読み込み');
    assert.equal(progress.at(-1).loadedBytes, bytes.length);
    assert.equal(progress.at(-1).isIndeterminate, true);
    assert.equal(timers.size, 0);
});
test('text loaderはHTTP失敗、期限切れ、呼出元cancelを成功扱いしない', async () => {
    const failed = textLoader(async () => new Response('missing', { status: 404 }));
    await assert.rejects(failed.load('/missing'), /404/);
    assert.equal(failed.timers.size, 0);
    const pendingFetch = (_url, { signal }) => new Promise((_resolve, reject) => { if (signal.aborted)
        reject(signal.reason);
    else
        signal.addEventListener('abort', () => reject(signal.reason), { once: true }); });
    const timed = textLoader(pendingFetch);
    const result = timed.load('/pending');
    [...timed.timers.values()][0]();
    await assert.rejects(result, error => error.name === 'TimeoutError');
    assert.equal(timed.timers.size, 0);
    const caller = new AbortController();
    const canceled = textLoader(pendingFetch);
    const cancellation = canceled.load('/pending', { signal: caller.signal });
    caller.abort();
    await assert.rejects(cancellation, error => error.name === 'AbortError');
    assert.equal(canceled.timers.size, 0);
});
function dom(markup) {
    const value = new JSDOM(markup, { url: 'https://mc.snkisk.com/', runScripts: 'outside-only' });
    const timers = new Map();
    let sequence = 0;
    value.window.setTimeout = callback => { const id = ++sequence; timers.set(id, callback); return id; };
    value.window.clearTimeout = id => timers.delete(id);
    value.window.scrollTo = () => { };
    for (const file of ['media-ready', 'load-tracker', 'media-messages'])
        value.window.eval(source(file));
    return { value, window: value.window, timers };
}
test('壊れたcomplete画像は失敗として終端化しoverlayを解除する', () => {
    const { value, window } = dom('<body><img data-initial-load-media></body>');
    const image = window.document.querySelector('img');
    Object.defineProperty(image, 'complete', { value: true });
    Object.defineProperty(image, 'naturalWidth', { value: 0 });
    let completions = 0;
    window.addEventListener('site:initial-load-complete', () => completions++);
    window.eval(source('initial-loading'));
    const state = window.__siteInitialLoadTracker.getProgress();
    assert.equal(state.isComplete, true);
    assert.equal(state.tasks[0].isFailed, true);
    assert.equal(window.document.body.classList.contains('is-initial-loading'), false);
    assert.equal(completions, 1);
    image.dispatchEvent(new window.Event('load'));
    assert.equal(completions, 1);
    value.window.close();
});
test('無応答の画像にも期限があり、Skeleton再試行も期限後に操作可能になる', () => {
    const { value, window, timers } = dom('<body><div data-skeleton-media><img src="/image.webp" alt="冒険"></div></body>');
    const image = window.document.querySelector('img');
    const wrapper = image.parentElement;
    Object.defineProperty(image, 'complete', { configurable: true, value: false });
    window.SitePreferences = { getState: () => ({ language: 'en' }) };
    window.eval(source('skeleton-ui'));
    window.SiteSkeletonUI.init();
    [...timers.values()][0]();
    const button = wrapper.querySelector('button');
    assert.equal(button.textContent, 'Reload');
    assert.equal(wrapper.getAttribute('aria-busy'), 'false');
    button.click();
    const firstSource = image.src;
    button.click();
    assert.equal(image.src, firstSource);
    assert.equal(button.getAttribute('aria-disabled'), 'true');
    [...timers.values()][0]();
    assert.equal(button.getAttribute('aria-disabled'), 'false');
    assert.equal(button.textContent, 'Reload');
    Object.defineProperty(image, 'complete', { value: true });
    Object.defineProperty(image, 'naturalWidth', { value: 100 });
    image.dispatchEvent(new window.Event('load'));
    assert.equal(wrapper.classList.contains('is-media-loaded'), true);
    assert.equal(wrapper.querySelector('button'), null);
    assert.equal(timers.size, 0);
    wrapper.__siteSkeletonCleanup();
    value.window.close();
});
test('component取得失敗時に同じbuild原本でnavを復旧し未知のpathを拒否する', async () => {
    const { value, window } = dom('<body><div id="target"></div></body>');
    window.eval(source('component-fallbacks'));
    window.eval(source('component-include'));
    window.SiteTextLoader = { load: async () => { throw new Error('network unavailable'); } };
    const target = window.document.getElementById('target');
    await window.SiteComponentInclude.loadIntoTarget(target, 'components/header.html');
    assert.ok(target.querySelector('header'));
    assert.equal(target.querySelector('script'), null);
    await assert.rejects(window.SiteComponentInclude.loadIntoTarget(target, 'https://other.example/component.html'), /Unknown component/);
    value.window.close();
});
test('lazy画像は可視近傍で要求されるまで期限を開始しない', () => {
    const { value, window, timers } = dom('<body><div data-skeleton-media><img loading="lazy" src="/later.webp"></div></body>');
    const image = window.document.querySelector('img');
    image.loading = 'lazy';
    Object.defineProperty(image, 'complete', { value: false });
    let intersection;
    let disconnects = 0;
    window.IntersectionObserver = class {
        constructor(callback) { intersection = callback; }
        observe() { }
        disconnect() { disconnects++; }
    };
    window.eval(source('skeleton-ui'));
    window.SiteSkeletonUI.init();
    assert.equal(timers.size, 0);
    assert.equal(image.parentElement.querySelector('button'), null);
    intersection([{ isIntersecting: false }]);
    assert.equal(timers.size, 0);
    intersection([{ isIntersecting: true }]);
    assert.equal(timers.size, 1);
    assert.equal(disconnects, 1);
    [...timers.values()][0]();
    assert.equal(image.parentElement.classList.contains('is-media-error'), true);
    image.parentElement.__siteSkeletonCleanup();
    assert.equal(timers.size, 0);
    value.window.close();
});
test('不正構文のcomponent URLも失敗として終端化し初期待機を残さない', async () => {
    const { value, window } = dom('<body><div id="target" data-header-include="http://["></div></body>');
    window.eval(source('component-fallbacks'));
    window.eval(source('component-include'));
    window.eval(source('initial-loading'));
    const target = window.document.getElementById('target');
    await assert.rejects(window.SiteComponentInclude.loadIntoTarget(target, 'http://['), /Unknown component/);
    const state = window.__siteInitialLoadTracker.getProgress();
    assert.equal(state.isComplete, true);
    assert.equal(state.tasks[0].isFailed, true);
    assert.equal(window.__siteInitialLoadComplete, true);
    assert.equal(window.document.body.classList.contains('is-initial-loading'), false);
    value.window.close();
});
for (const reason of ['timeout', 'caller-cancel']) {
    test(`native fetchの転送途中${reason}でbodyを中断し期限を解放する`, async () => {
        const server = createServer((_request, response) => { response.writeHead(200, { 'Content-Type': 'text/plain' }); response.write('partial body'); });
        await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
        try {
            const { load, timers } = textLoader(fetch);
            const caller = new AbortController();
            let seen = false;
            const loading = load(`http://127.0.0.1:${server.address().port}/stream`, { signal: caller.signal }, progress => {
                if (seen || !progress.loadedBytes)
                    return;
                seen = true;
                if (reason === 'timeout')
                    [...timers.values()][0]();
                else
                    caller.abort();
            });
            await assert.rejects(loading, error => error.name === 'AbortError' || error.name === 'TimeoutError');
            assert.equal(seen, true);
            assert.equal(timers.size, 0);
        }
        finally {
            server.closeAllConnections();
            await new Promise(resolve => server.close(resolve));
        }
    });
}
test('動画40秒失敗終端後の遅着イベントは終端と完了通知を変えない', () => {
    const { value, window, timers } = dom('<body><video data-initial-load-media></video></body>');
    const video = window.document.querySelector('video');
    Object.defineProperty(video, 'duration', { value: 10 });
    Object.defineProperty(video, 'readyState', { value: 1 });
    let completions = 0;
    window.addEventListener('site:initial-load-complete', () => completions++);
    window.eval(source('initial-loading'));
    assert.equal(window.__siteInitialLoadTracker.getProgress().isComplete, false);
    [...timers.values()][0]();
    assert.equal(window.__siteInitialLoadTracker.getProgress().tasks[0].isFailed, true);
    assert.equal(completions, 1);
    assert.equal(timers.size, 0);
    for (const event of ['error', 'canplaythrough', 'progress'])
        video.dispatchEvent(new window.Event(event));
    assert.equal(completions, 1);
    assert.equal(window.__siteInitialLoadTracker.getProgress().tasks[0].isFailed, true);
    value.window.close();
});
for (const reduced of [false, true]) {
    test(`ProgressBarとjQuery欠落でもoverlayを解除する（reduced=${reduced}）`, () => {
        const { value, window } = dom('<body><div data-loading-overlay><div data-loading-progress></div></div></body>');
        const frames = [];
        window.requestAnimationFrame = callback => { frames.push(callback); return frames.length; };
        window.matchMedia = () => ({ matches: reduced });
        window.eval(source('loading-overlay'));
        window.dispatchEvent(new window.Event('site:initial-load-complete'));
        for (let index = 0; frames.length && index < 100; index++)
            frames.shift()();
        assert.equal(window.document.querySelector('[data-loading-overlay]').style.display, 'none');
        value.window.close();
    });
}
