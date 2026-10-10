# Minecraft Fan Site

Minecraftの多様な遊び方（サバイバル・PVP・建築）を紹介するウェブサイトです。

## 目的

このサイトはMinecraftの基本プレイや代表的な遊び方を、はじめての人にも楽しく伝えることを目的としています。 

## サイト

https://mc.snkisk.com

## セクション

- **Survival** - カード導線でサバイバルの進行ルートを選べる情報設計ページ
- **PVP** - 戦闘の基礎から実践テクニックまでをまとめた対人戦ガイドページ
- **Build** - 建築の世界観と手順をビジュアル重視で見せるガイドページ

## 特徴

- ゲーム風ローディング画面
- 初期待機対象メディアに限定したローディング制御
- `js/media-ready.js` で初期待機とSkeleton UIのメディア完了条件を共通化
- 動画の progress 表示は段階的に前進するが、待機解除条件は厳格動画判定のまま維持
- ヒーロー動画の再生維持は通常時の再試行を避け、初回開始・初期待機完了・可視復帰時だけ再確認
- `js/deferred-media.js` で非クリティカル画像を初期待機完了後かつ可視近傍で挿入できる
- `data-initial-load-media` を付けたメディアは優先コンテンツとして扱い、画像は `fetchpriority="high"` をセット
- 画像・動画領域ごとのSkeleton UIと失敗時の再読み込みボタン
- `components/header.html` / `components/cta.html` / `components/footer.html` を各ページ設定つきで差し込む共通コンポーネント構成
- `css/style.css` をエントリにした CSS 分割構成
- `js/main.js` を bootstrap に絞り、`ui-motion.js` / `anchor-scroll.js` / `tooltips.js` / `home-page.js` へ責務分割した共通 UI スクリプト構成
- ローテーティングテキストによるサブタイトル
- ナビゲーションバーによるセクション間のスムーズなスクロールアニメーション
- ビデオバックグラウンドを使用したダイナミックなファーストビュー
- グラデーションカラーによるセクション間の自然な区切り
- テキストのフェードインアニメーション
- モバイルレスポンシブ対応

## 配信用画像

HTMLの画像・遅延挿入画像・OGとCSS背景は`images.snkisk.com`の軽量WebPを参照します。配信コピーはrepoに置かず、[画像の由来と配信先](assets/images/README.md)にPNG原本・WebPの変換条件・SHA-256・確定CDN URLを記録しています。

## 対応デバイス

- PC（1200px以上）
- タブレット・モバイル（786px以下）

## 使用言語

- HTML
- CSS
- TypeScript（自作コードの正本は `src/`）
- JavaScript（ブラウザ配信用の生成物とvendor）

## ファイル構成

```
WebD_Minecraft_Site/
├── index.html                    # トップページ
├── 404.html                      # 404エラーページ
├── licenses.html                 # ライセンスページ
├── survival.html                 # サバイバルの情報設計ページ
├── pvp.html                      # PVPのガイドページ
├── build.html                    # 建築のガイドページ
├── components/                   # コンポーネントファイル
│   ├── header.html               # ヘッダーコンポーネント
│   ├── cta.html                  # CTAコンポーネント
│   └── footer.html               # フッターコンポーネント
├── css/                          # CSS ファイル
│   ├── style.css                 # CSS エントリポイント（分割 CSS の読み込み元）
│   ├── base.css                  # 共通レイアウト・header/footer・共通ユーティリティ
│   ├── loading.css               # Loading overlay / Skeleton UI / View Transition
│   ├── home.css                  # index.html 専用スタイル
│   ├── standalone.css            # licenses / 404 向けスタイル
│   ├── survival.css              # survival.html 専用スタイル
│   ├── pvp.css                   # pvp.html 専用スタイル
│   └── build.css                 # build.html 専用スタイル
├── README.md                     # このファイル
├── js/                           # JavaScript ファイル
    ├── main.js                   # 共通 UI の bootstrap
    ├── ui-motion.js              # reduced motion 判定と fade-in 制御
    ├── anchor-scroll.js          # header ナビのアンカースクロール制御
    ├── tooltips.js               # tooltip 生成とメディア URL 制御
    ├── home-page.js              # index.html の rotating text 制御
    ├── media-ready.js            # 初期待機とSkeleton UIで共有するメディア完了判定
    ├── initial-loading.js        # 初期待機対象メディアの読み込み制御
    ├── loading-overlay.js        # ローディングオーバーレイ表示制御
    ├── skeleton-ui.js            # メディア単位のSkeleton UIと再読み込み制御
    ├── deferred-media.js         # 非クリティカル画像の遅延挿入制御
    ├── safe-dom.js               # 安全なDOM操作のためのユーティリティスクリプト
    ├── header-include.js         # ヘッダーインクルードスクリプト
    ├── cta-include.js            # CTAインクルードスクリプト
    ├── footer-include.js         # フッターインクルードスクリプト
    ├── survival-page.js          # Survivalページ固有の補助スクリプト
    └── vendor/                   # サードパーティライブラリ
        ├── jquery.min.js         # jQuery ライブラリ
        └──progressbar.min.js     # ProgressBar.js ライブラリ
```

---

© 2026 新快速(Special-Rapid)

https://mc.snkisk.com (以下このウェブサイト) は、ファンが独自に作成した情報サイトであり、Mojang Studiosとは一切関係がなく、Mojang Studiosによる承認やスポンサーシップも受けていません。MinecraftはMojang Studiosの商標です。Minecraftに関するすべての商標および知的財産は、それぞれの所有者に帰属します。

このウェブサイトは情報提供およびファン活動のみを目的としています。

このウェブサイトのオリジナルコンテンツは、CC0 1.0 Universal (パブリックドメイン)ライセンスの下で公開されています。

すべてのライセンス情報を表示するには、[こちら](https://mc.snkisk.com/licenses.html)をご覧ください。

## 開発と型検査

自作スクリプト20本の正本は `src/*.ts` です（移行対象の既存17本と、内部改善で追加した3本）。classic scriptの公開グローバル、HTMLの読み込み順と `js/*.js` のURLを保持するため、バンドラーやframeworkへの置換は行いません。`src/site-types.d.ts` にDOM・設定・読み込み状態・共有APIの契約を置きます。

```sh
npm ci
npm run check
python3 -m http.server 4173 --bind 127.0.0.1
```

`npm run typecheck` はstrict型検査とコンパイル専用の境界テスト、`npm run build` は `src/` から `js/` への生成、`npm test` は画像・動画・URL・リンクの境界検証を実施します。HTMLは生成JSを直接読むため、生成物をコミットし、ソースと一致させます。CIも再生成の差分を検査します。

移行は `allowJs` / `checkJs` の入口、メディア判定とリンクの純粋処理、読み込み・コンポーネント境界、ページUI・表示設定の順で進めました。17本の型消去後の実行構文を `npm run compare:runtime` で基準main `f6fc2ab` と比較できます。この比較は挙動変更を分離した型移行PR専用です。

`js/vendor/` は第三者の配布物としてTS移行の対象外です。HTML/CSS、Nodeの検証スクリプト、設定とメディアのmanifestもそれぞれの形式を維持します。コンパイル専用 `*.type-test.ts` はJavaScriptへ出力しません。依存は開発用のTypeScript・既存vendor用の型宣言・DOMテスト用jsdomで、利用者へ新しいライブラリを配信しません。

[型移行Issue #8](https://github.com/Special-Rapid/mc.snkisk.com/issues/8) と、挙動を変える内部改善は別のPRでレビューします。


## 読み込み・復旧・表示設定の内部契約

Node用fallback生成処理の正本は `scripts/src/build-component-fallbacks.mts` です。`tsconfig.node-tools.json` でstrict検査し、`npm run build` が既存の `scripts/build-component-fallbacks.mjs` へ生成してから実行します。生成MJSもコミットし、CIで再生成の差分を検査します。ブラウザ用20本のTSとは別のNode ESM設定を使い、呼出先とcomponent出力を保持します。

Node用コードの移行は [Issue #12](https://github.com/Special-Rapid/mc.snkisk.com/issues/12) のこの1本から進めます。`scripts/compare-runtime.mjs` と `tests/*.test.mjs` 3本は手書きMJSのままで、Node全体の移行完了には含めません。

componentのテキスト取得は15秒、初期待機とSkeletonのメディア待機は40秒で失敗へ移ります。失敗を成功と区別したまま初期待機を解除し、メディアは個別の再読み込みで復旧できます。component取得失敗時は、`npm run build` が同じ `components/*.html` から生成した原本を使用し、headerの導線を保持します。`js/component-fallbacks.js` を手で変更しません。

動画の完了は先頭から連続したbufferとreadyStateで判定します。URLはブラウザと同じ正規化後のprotocolで検証し、JSON設定は既知の文字列フィールドだけ採用します。

言語・テーマ・自動設定への復帰はページを再読み込みせず、原文、既存DOMノード、入力値、スクロールとフォーカスを保持します。端末言語は対応するexact/base localeを優先し、未対応なら日本語です。自動設定中だけ端末の変更を反映し、storage例外でも現在の画面に設定を適用します。

`npm run check` はstrict型検査、生成、読み込み失敗・期限・復旧・URL・進捗・実DOMでの全6画面の言語往復を検査します。layout・メディア再生・keyboard導線はブラウザで別途検証します。型移行だけの `compare:runtime` は、この挙動改善branchの同一性検査には使いません。[内部改善Issue #9](https://github.com/Special-Rapid/mc.snkisk.com/issues/9) で型移行と分けてレビューします。
