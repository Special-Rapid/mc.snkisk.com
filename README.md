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
- JavaScript

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
