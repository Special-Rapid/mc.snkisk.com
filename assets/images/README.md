# 配信用画像

配信用WebPは`images.snkisk.com`へ同一bytesのまま移しました。`sources.json`の`cdnUrl`が配信先、`file`は移行前のWebP名を記録する履歴です。WebPのSHA-256・寸法・容量・変換条件と、保全されたPNG原本のURL・元SHA-256・寸法・容量を併記しています。repoには配信コピーを同梱しません。PNG原本への参照差し戻しはせず、軽量WebPを利用してください。

既存licenses.htmlではこのサイトのoriginal imagesをCC0と記載しています。Minecraftの権利表記は同ページのままです。画像の内容を生成・加筆せず、最大辺1600pxへLanczos縮小後WebP quality88/method6で圧縮しました（不可逆）。透明度は全原本で完全不透明であることを確認。

再生成例（Pillow）: Image.open(original).convert('RGB') → thumbnail((1600,1600), Image.Resampling.LANCZOS) → save(output, 'WEBP', quality=88, method=6)。R2原本やCloudflare変換設定の変更は不要です。
