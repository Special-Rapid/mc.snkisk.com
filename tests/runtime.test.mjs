import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

class ImageElement { complete = false; naturalWidth = 0; }
class VideoElement {
  duration = 10; readyState = 0; networkState = 0; error = null;
  buffered = { length: 0, end: () => 0 };
}
const constants = { HAVE_METADATA: 1, HAVE_CURRENT_DATA: 2, HAVE_FUTURE_DATA: 3, HAVE_ENOUGH_DATA: 4, NETWORK_IDLE: 1, NETWORK_LOADING: 2, NETWORK_NO_SOURCE: 3 };
Object.assign(VideoElement, constants);
function context() {
 const window = { location: { href: 'https://mc.snkisk.com/' } };
 const sandbox = vm.createContext({ window, HTMLImageElement: ImageElement, HTMLVideoElement: VideoElement, HTMLMediaElement: VideoElement, URL });
 for (const file of ['media-ready', 'safe-dom', 'tooltips']) vm.runInContext(readFileSync(`js/${file}.js`, 'utf8'), sandbox);
 return { sandbox, window };
}
test('画像の成功・失敗を区別し、未完了を成功にしない', () => {
 const { window } = context(); const image = new ImageElement();
 assert.equal(window.SiteMediaReady.isMediaLoaded(image), false);
 assert.equal(window.SiteMediaReady.isMediaFailed(image), false);
 image.complete = true;
 assert.equal(window.SiteMediaReady.isMediaFailed(image), true);
 image.naturalWidth = 100;
 assert.equal(window.SiteMediaReady.isMediaLoaded(image), true);
 assert.equal(window.SiteMediaReady.isMediaFailed(image), false);
});
test('動画の表示進捗と厳格完了条件を分離する', () => {
 const { window } = context(); const video = new VideoElement(); const ready = window.SiteMediaReady;
 video.readyState = 3; video.networkState = 2; video.buffered = { length: 1, end: () => 10 };
 assert.equal(ready.isVideoStrictReady(video), false);
 assert.ok(ready.getVideoDisplayProgress(video) <= .94);
 video.readyState = 4;
 assert.equal(ready.isVideoStrictReady(video), true);
 assert.equal(ready.getVideoDisplayProgress(video), 1);
 video.duration = Number.NaN;
 assert.equal(ready.isVideoStrictReady(video), false);
 for (const value of [Number.NaN, Infinity, -Infinity]) assert.equal(ready.clampProgress(value), 0);
 assert.equal(ready.clampProgress(2), 1);
 assert.equal(ready.clampProgress(-1), 0);
});
test('リンクの公開URLと既存相対URLを保持し危険schemeを拒否する', () => {
 const { sandbox } = context();
 for (const url of ['index.html', '#steps', 'https://mc.snkisk.com/', 'mailto:hello@example.com', 'tel:123']) assert.equal(sandbox.isSafeUrl(url), true);
 for (const url of ['', null, 'javascript:alert(1)', 'data:text/html,x', 'vbscript:x']) assert.equal(sandbox.isSafeUrl(url), false);
});
test('tooltipメディアはHTTPSと開発loopbackのみ許可する', () => {
 const { window } = context(); const resolve = window.SiteTooltips.resolveAllowedTooltipMediaUrl;
 assert.equal(resolve('/image.webp'), 'https://mc.snkisk.com/image.webp');
 assert.equal(resolve('http://localhost:4173/image.webp'), 'http://localhost:4173/image.webp');
 assert.equal(resolve('http://example.com/a'), null);
 assert.equal(resolve('data:video/mp4,x'), null);
});
test('外部リンクはnoopener/noreferrerを保持し、無効設定を表示しない', () => {
 const { sandbox } = context();
 const anchor = { style: {}, removeAttribute(name) { delete this[name]; } };
 assert.equal(sandbox.applySafeLink(anchor, { href: 'https://example.com/', text: '外部', target: '_blank', rel: 'author' }), true);
 assert.equal(anchor.textContent, '外部');
 assert.deepEqual(new Set(anchor.rel.split(' ')), new Set(['author', 'noopener', 'noreferrer']));
 assert.equal(sandbox.applySafeLink(anchor, { href: 'javascript:x', text: '不正' }), false);
 assert.equal(anchor.style.display, 'none');
});
