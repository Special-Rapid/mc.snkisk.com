// コンパイル専用。HTMLから読み込まず、公開境界の型退行を検出する。
function checkSiteContracts(tracker: SiteLoadTracker, link: SiteLinkConfig, media: HTMLImageElement) {
 tracker.updateTask('image', { progress: .5, isFailed: false });
 applySafeLink(null, link);
 window.SiteSkeletonUI.initWrapper(media, { force: true });
 // @ts-expect-error progressはnumber
 tracker.updateTask('image', { progress: 'half' });
 // @ts-expect-error 状態flagはboolean
 tracker.updateTask('image', { isComplete: 'yes' });
 // @ts-expect-error DOM境界は文字列ではない
 window.SiteComponentInclude.loadIntoTarget('header', 'components/header.html');
 // @ts-expect-error URL設定は文字列
 applySafeLink(null, { href: 123, text: 'link' });
}
