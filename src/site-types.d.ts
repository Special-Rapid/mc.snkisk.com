type SiteMedia = HTMLImageElement | HTMLVideoElement;
type SiteMediaState = 'loading' | 'loaded' | 'error';
type SiteTheme = 'light' | 'dark';
type SiteLanguage = 'ja' | 'en';
type PreferenceSource = 'auto' | 'manual';
interface SitePreferencesState { theme: SiteTheme; language: SiteLanguage; themeSource: PreferenceSource; languageSource: PreferenceSource }
interface SiteLinkConfig { href?: string; text?: string; target?: string; rel?: string; className?: string; ariaLabel?: string }
interface SiteHeaderConfig { headerClass?: string; brandClass?: string; brandAriaLabel?: string; homeHref?: string; navClass?: string; links?: SiteLinkConfig[] }
interface SiteCtaConfig { kicker?: string; title?: string; body?: string; sub?: string; primary?: SiteLinkConfig; secondary?: SiteLinkConfig }
interface SiteLoadTask { id: string; kind: string; label: string; progress: number; loadedBytes: number; totalBytes: number; isComplete: boolean; isFailed: boolean; isIndeterminate: boolean }
interface SiteLoadState { progress: number; isComplete: boolean; tasks: SiteLoadTask[] }
type SiteTaskDefaults = Partial<Pick<SiteLoadTask, 'kind' | 'label'>>;
type SiteTaskPatch = Partial<Omit<SiteLoadTask, 'id'>>;
interface SiteLoadTracker {
 registerTask(id: string, defaults?: SiteTaskDefaults): void;
 updateTask(id: string, patch?: SiteTaskPatch): void;
 completeTask(id: string): void;
 failTask(id: string): void;
 getProgress(): SiteLoadState;
 subscribe(listener: (state: SiteLoadState) => void): () => void;
}
interface SitePreferencesApi {
 getState(): SitePreferencesState;
 translateText(value: string): string;
 translateText(value: unknown): unknown;
 localizeHeaderConfig<T extends SiteHeaderConfig | null | undefined>(config: T): T;
 applyTextTranslations(root?: Node | null): void;
 resetToAutomatic(): void;
}
interface HTMLElement {
 __siteSkeletonMedia?: SiteMedia | null;
 __siteSkeletonCleanup?: (() => void) | null;
}
interface SiteTextProgress { loadedBytes: number; totalBytes: number; isIndeterminate: boolean }
type SiteComponentPath = "components/header.html" | "components/cta.html" | "components/footer.html";
interface Window {
 SiteMediaMessages: Record<SiteLanguage, { image: string; video: string; imageStatus: string; videoStatus: string; reload: string; reloading: string; reloadLabel: string; loadingStatus: string; failedStatus: string }>;
 SiteTextLoader: { load(url: string, options?: RequestInit, onProgress?: (progress: SiteTextProgress) => void): Promise<string>; TIMEOUT_MS: number };
 SiteLoadTracker: { create(): SiteLoadTracker };
 SiteComponentTemplates: Readonly<Record<SiteComponentPath, string>>;
 jQuery: JQueryStatic;
 ProgressBar: typeof import('progressbar.js');
 SiteMediaReady: {
  VIDEO_BUFFER_EPSILON: number; VIDEO_DISPLAY_PROGRESS_CAP: number;
  clampProgress(value: number): number;
  getVideoBufferedProgress(video: Element | null): number;
  getVideoDisplayProgress(video: Element | null): number;
  isVideoFullyBuffered(video: Element | null): boolean;
  isVideoStrictReady(video: Element | null): boolean;
  isMediaLoaded(media: Element | null): boolean;
  isMediaFailed(media: Element | null): boolean;
 };
 SiteSkeletonUI: { init(): void; initWrapper(wrapper: HTMLElement, options?: { force?: boolean }): void };
 SiteDeferredMedia: { init(): void; ensureDeferredMedia(wrapper: HTMLElement): void };
 SiteUiMotion: { prefersReducedMotion(): boolean; initFadeInOnScroll(): void };
 SiteAnchorScroll: { initAnchorScroll(): void };
 SiteTooltips: { initTooltips(): void; resolveAllowedTooltipMediaUrl(url: string): string | null };
 SiteHomePage: { initHomeHeroText(): void };
 SiteComponentInclude: { loadIntoTarget(target: HTMLElement, path: string): Promise<void> };
 SitePreferences: SitePreferencesApi;
 __siteInitialLoadComplete?: boolean;
 __siteInitialLoadEventName?: string;
 __siteInitialLoadTracker?: SiteLoadTracker;
 __siteInitialLoadFetchText?: (url: string, options?: RequestInit, taskId?: string) => Promise<string>;
}
interface DocumentEventMap {
 sitepreferencescontentready: CustomEvent<{ target?: HTMLElement } | undefined>;
 sitepreferenceschange: CustomEvent<SitePreferencesState>;
}
