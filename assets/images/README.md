# 配信用画像

元画像は既存images.snkisk.comのURLにそのまま保全しています。sources.jsonに元URL・元SHA-256・寸法・容量とWebP変換条件を記録しています。

既存licenses.htmlではこのサイトのoriginal imagesをCC0と記載しています。Minecraftの権利表記は同ページのままです。画像の内容を生成・加筆せず、最大辺1600pxへLanczos縮小後WebP quality88/method6で圧縮しました（不可逆）。透明度は全原本で完全不透明であることを確認。

再生成例（Pillow）: Image.open(original).convert('RGB') → thumbnail((1600,1600), Image.Resampling.LANCZOS) → save(output, 'WEBP', quality=88, method=6)。R2原本やCloudflare変換設定の変更は不要です。
