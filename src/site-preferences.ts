(function () {
    "use strict";

    type Theme = "light" | "dark";
    type Language = "ja" | "en";
    type PreferenceSource = "manual" | "auto";
    interface PreferencesState {
        theme: Theme;
        language: Language;
        themeSource: PreferenceSource;
        languageSource: PreferenceSource;
    }
    type HeaderConfig = SiteHeaderConfig;

    const storageKeys = {
        theme: "minecraft-fan-site-theme",
        language: "minecraft-fan-site-language",
    };
    const supportedThemes = new Set<unknown>(["light", "dark"]);
    const supportedLanguages = new Set<unknown>(["ja", "en"]);

    const textTranslations: Record<string, string> = {
        "再読み込み": "Reload",
        "© 2026 新快速(Special-Rapid)": "© 2026 Special-Rapid",
        "Explore": "Explore",
        "初日の動き方、拠点づくり、探索の順番まで、迷いやすい判断をまとめて学べます。": "Learn the decisions that matter most: your first day, a reliable base, and the order to explore.",
        "最初に何を集め、どこで止まり、次に何を目指すか。初心者でも動きやすい実用ガイドです。": "What to gather first, when to pause, and what to aim for next—a practical guide for new players.",
        "初撃、距離管理、回復の判断など、勝敗を分ける基本を実戦の流れに沿って学べます。": "Learn the fundamentals that decide a fight—first hits, spacing, and recovery—in real match order.",
        "クリック速度だけに頼らず、引き際と立て直しまで整理した対人戦ガイドです。": "A player-versus-player guide that goes beyond click speed, covering resets and recoveries.",
        "シルエット、素材、光の置き方を通して、大きな作品をまとめる順番を学べます。": "Learn the order for shaping large projects through silhouette, materials, and lighting.",
        "どこから決めて、どこを後回しにするか。景色として映える建物づくりの考え方を短く整理しています。": "Decide what to settle first and what can wait. A concise approach to builds that look great in the landscape.",
        "Want to know more?": "Want to know more?",
        "もうちょっと知りたい？": "Want to learn more?",
        "サバイバルで初日を安定させるか、PVPで勝ち筋を覚えるか、建築で形づくりの順番を学ぶか。気になる入口から、次の行動に直結する内容だけをまとめています。": "Stabilize your first day in Survival, learn winning patterns in PVP, or shape a build in the right order. Choose the path that leads straight to your next action.",
        "初めてならサバイバル、勝負がしたいならPVP、作りたいならBuildから読むのがおすすめ。": "Start with Survival if you are new, PVP if you want to compete, or Build if you want to create.",
        "公式サイトで始める": "Start on the official site",
        "サバイバルから始める": "Start with Survival",
        "今すぐマインクラフトをプレイしよう": "Play Minecraft now",
        "ここまで読んだら、次は実戦です。最初の拠点を作るだけでも十分な一歩。たった1ワールドから、あなた専用の物語が始まります。": "You have read the guide—now put it into practice. Even building a first base is a real step. Your own story begins with one world.",
        "今日の目標はシンプルに「1日目を生き残る」。明日のあなたが続きを作ります。": "Keep today's goal simple: survive day one. Tomorrow, you can build on it.",
        "他のモードも見てみる": "Explore other modes",
        "おっと！ 探しているページが見つかりません。現在制作中のページか、存在しないページのようです。": "Oops! The page you are looking for is still in progress or does not exist.",
        "ホームに戻る": "Back to home",
        "想像を、ブロックに。": "Turn imagination into blocks.",
        "景色として映える建築を、形・素材・光の順で整える。": "Shape a striking build through form, material, and light.",
        "5つの手順を見る": "See the five steps",
        "大きな建物ほど、最初に決める順番で仕上がりが変わる。": "The larger the build, the more its finish depends on the order of your first decisions.",
        "テーマを決め、遠景の輪郭を置き、最後に入口まわりを締める。順番を意識するだけで、巨大建築でも迷いが減ります。": "Set a theme, establish the distant silhouette, then finish the entrance. This order keeps even huge builds clear.",
        "景色として残る建築を、切り取る。": "Frame builds that stay with the landscape.",
        "巨大建築は、順番で破綻しにくくなる。": "A clear order keeps grand builds from falling apart.",
        "次は、あなたの景色を建てよう": "Now build your own landscape",
        "壮大な建築は、テーマ、輪郭、素材、反復、光の順で整えると迷いにくくなります。最初の一ブロックから、景色として残る建物を育てていきましょう。": "Grand builds are easier to shape when you work through theme, silhouette, materials, repetition, and light. Start with one block and grow a building that belongs in the landscape.",
        "素材集めから始めるなら、サバイバルガイドで土台を整えてから戻ってこられます。": "If you need materials first, prepare in the Survival guide and return when you are ready.",
        "公式サイトで建築を始める": "Start building on the official site",
        "サバイバルで素材集めを見る": "Find materials in Survival",
        "次の冒険先を、カードで選ぼう": "Choose your next adventure from a card",
        "最初の夜を越える準備から、拠点づくり、資源集め、次の遠征先まで。今の進み具合に合わせて入口を選べるサバイバルガイドです。": "From surviving the first night to building a base, gathering resources, and choosing an expedition, this guide lets you pick a route for your current progress.",
        "スタートガイドを見る": "View the start guide",
        "スタートガイド": "Start guide",
        "注目カードを開く": "Open featured cards",
        "5 つの入口": "5 starting routes",
        "初日・拠点・探索": "First day · base · exploration",
        "悩み別に読む": "Read by your next need",
        "まず開くスタートガイド": "Start here",
        "最初の夜、食料、拠点、装備。迷いやすい入口をカードから選べます。": "First night, food, base, and gear. Pick the card for the decision in front of you.",
        "マインクラフトPVP完全攻略": "The complete Minecraft PVP guide",
        "対人戦で勝ちやすくなる判断を、基礎操作から実戦の立て直しまで順番に整理したガイドです。クリック速度だけではなく、初撃、距離管理、回復のタイミングを安定させたい初心者〜中級者向けにまとめています。": "A step-by-step guide to decisions that make PVP more winnable, from fundamentals to recovering in a real fight. Built for beginners and intermediate players who want consistent first hits, spacing, and recovery timing—not just faster clicks.",
        "クールダウン重視": "Respect cooldowns",
        "横移動で間合い維持": "Hold spacing by strafing",
        "半分前に一度引く": "Reset before half health",
    };

    const localizedConfigs: Record<string, { links: string[] }> = {
        home: {
            links: ["survival", "pvp", "build"],
        },
        survival: {
            links: ["Start guide", "Featured cards", "Progression", "Biome guides", "Practical themes"],
        },
        pvp: {
            links: ["Overview", "Combat basics", "Loadout", "Tactics", "Advanced"],
        },
        build: {
            links: ["Gallery", "Build guide", "Get started"],
        },
        licenses: {
            links: ["Third-party libraries", "MIT license", "Original content", "Source code"],
        },
    };

    Object.assign(textTranslations, {
        "最初の10分でやること": "What to do in the first 10 minutes", "原木、作業台、石ツール。夜までに必要な土台を最短で揃える流れです。": "Gather logs, make a crafting table, and upgrade to stone tools—the shortest route to a safe first night.", "初日ルートを見る": "View the first-day route",
        "最初の夜を越える": "Survive the first night", "食料、ベッド、安全な足場を先に確保し、夜の事故を減らす順番を整理します。": "Secure food, a bed, and safe footing first to reduce night-time mistakes.", "序盤の注目カードへ": "See early-game cards",
        "食料を安定させる": "Stabilize your food", "焼き肉でしのぐ段階から、畑と家畜で回復を切らさない形へつなげます。": "Move from getting by on cooked meat to farms and livestock that keep recovery steady.", "食料カードを開く": "Open food cards",
        "安全に洞窟へ入る": "Enter caves safely", "たいまつ、退路、引き返しライン。無理に深追いしない探索の基本を確認します。": "Torches, an exit route, and a turn-back line: the basics for exploring without overcommitting.", "地形別ガイドへ進む": "Continue to biome guides",
        "帰りやすい拠点を作る": "Build a base you can return to", "収納、かまど、寝床の位置を整え、戻るたびに立て直せる拠点を作ります。": "Arrange storage, furnaces, and a bed to create a base that resets you every time you return.", "拠点カードを開く": "Open base cards",
        "鉄装備へ更新する": "Upgrade to iron gear", "盾、バケツ、鉄防具を優先し、中盤に入る前の生存力を底上げします。": "Prioritize a shield, bucket, and iron armor to raise survivability before the mid-game.", "装備テーマを見る": "View gear themes",
        "迷ったらここから。人気テーマを、次の行き先つきでまとめています。": "Start here when unsure. Popular topics, each with a clear next route.", "人気": "Popular", "洞窟探索のすすめ": "A guide to cave exploration", "鉄や石炭を持ち帰るための照明、退路、撤退基準を短く押さえます。": "A concise guide to lighting, exit routes, and retreat rules for bringing home iron and coal.", "進行ルートから開く": "Open from progression",
        "食料と農業の基本": "Food and farming basics", "空腹で行動が止まらないよう、畑と家畜をどの順に整えるかをまとめます。": "Learn the order for setting up crops and livestock so hunger does not stop your progress.", "スタートガイドへ戻る": "Back to the start guide",
        "拠点建築のコツ": "Base-building tips", "見た目より先に、寝る・しまう・焼くが回る配置を作る考え方です。": "Build a layout where sleeping, storing, and smelting work smoothly before focusing on looks.", "実践テーマへ進む": "Continue to practical themes",
        "進行ルート": "Progression route", "初日からエンド攻略まで、次に何を揃えるかだけを短く追える導線です。": "A concise route from day one to the End, focused on what to obtain next.", "木材を確保": "Secure wood", "原木と石材を先に確保し、作業台と石ツールまで更新。たいまつ素材が見えたら夜対策へ進みます。": "Secure logs and stone, then upgrade to a crafting table and stone tools. Once torch materials are visible, prepare for night.",
        "夜の安全を固める": "Secure the night", "食料と仮拠点を整え、ベッドか安全な避難場所を確保。夜を越せる準備ができたら探索へ進みます。": "Prepare food and a temporary base, then secure a bed or safe shelter. Explore after you can survive the night.",
        "食料を安定": "Stabilize food", "焼き肉や畑で満腹度を安定させ、長めの採掘や移動に備えます。回復が止まらなくなったら鉄探しへ。": "Use cooked meat or crops to stabilize hunger for longer mining and travel. Once recovery is reliable, look for iron.",
        "鉄装備を揃える": "Complete iron gear", "盾、バケツ、鉄防具を優先して事故を減らします。防具が揃ったら深い洞窟や遠征が安定します。": "Prioritize a shield, bucket, and iron armor to reduce accidents. With armor complete, deep caves and expeditions become safer.",
        "拠点を育てる": "Grow your base", "収納、かまど、畑、作業台を近くにまとめ、戻るたびに立て直せる拠点へ育てます。交易やエンチャント準備もこの段階です。": "Keep storage, furnaces, crops, and crafting close together to create a base that supports every return. Start trading and enchanting preparation here.",
        "ネザーとエンドへ": "Head to the Nether and End", "黒曜石、火打石と打ち金、十分な食料をそろえてネザーへ。補給が整ったら要塞探索とエンド攻略の入口です。": "Gather obsidian, flint and steel, and plenty of food before the Nether. With supplies ready, you can begin fortress exploration and the End route.",
        "地形別ガイド": "Biome guides", "拠点向きか、資源向きか。地形ごとの進めやすさをカードで比べられます。": "Compare biomes by whether they suit a base or resources, using easy-to-scan cards.", "拠点向き": "Good for a base", "森のバイオーム": "Forest biome", "木材と食料を揃えやすく、最初の拠点候補に最適です。視界は狭いので、夜はたいまつで帰り道を残しておくと安心です。": "Wood and food are easy to collect here, making it a great first-base candidate. Visibility is tight, so leave a torch trail at night.", "初動カードへ": "Go to opening cards", "おすすめ資源: 木材・動物・花": "Recommended: wood · animals · flowers",
        "生活圏": "Living area", "村のある平原": "Plains with a village", "ベッド、畑、交易の入口を一気に確保できる地形です。開けているぶん、夜は周囲の湧き潰しを早めに進めます。": "A biome where you can quickly secure beds, farms, and a trading start. Because it is open, light up the area early at night.", "暮らしのカードへ": "Go to living cards", "おすすめ資源: ベッド・畑・交易": "Recommended: beds · farms · trading",
        "遠征向き": "Good for expeditions", "海辺のバイオーム": "Coastal biome", "船移動と釣りが強く、遠征拠点に向いた地形です。陸の資材が薄いこともあるので、木材だけは先に十分確保します。": "Boating and fishing are strong here, making it good for an expedition base. Land resources can be scarce, so secure plenty of wood first.", "移動テーマへ": "Go to travel themes", "おすすめ資源: 釣り・砂・海路": "Recommended: fishing · sand · sea routes",
        "装備準備": "Gear preparation", "雪山のバイオーム": "Snowy mountain biome", "見晴らしは良いですが高低差の事故が起きやすい地形です。足場ブロックと食料を多めに持つと探索が安定します。": "Visibility is great, but elevation accidents are common. Bring extra blocks and food for a steadier exploration run.", "進行ルートを見る": "View the progression route", "おすすめ資源: 氷雪・石材・見晴らし": "Recommended: ice and snow · stone · views",
        "資源採集": "Resource gathering", "沼地のバイオーム": "Swamp biome", "粘土やスライムを狙える一方、足元が悪く夜は危険になりがちです。船とたいまつで動線を切ると無駄な戦闘を減らせます。": "Clay and slimes are available, but footing is rough and nights get dangerous. Use a boat and torches to cut down needless fights.", "おすすめ資源: 粘土・スライム・葦": "Recommended: clay · slimes · sugar cane",
        "実践テーマ": "Practical themes", "装備、対策、回復、採集、発展。困りごと別にすぐ辿れるテーマ集です。": "Gear, protection, recovery, gathering, and growth—quick routes for the problem you face.", "装備": "Gear", "装備を更新する": "Upgrade your gear", "盾、鉄ツール、バケツの順で揃えると、被弾と事故死が一気に減ります。": "Pick up a shield, iron tools, and bucket in that order to sharply reduce damage and accidents.", "装備ルートを見る": "View the gear route", "対策": "Protection", "明るさを管理する": "Manage light", "洞窟や拠点周りの暗所を減らすと、戦わなくていい場面が増えて探索が安定します。": "Reducing dark spots around caves and your base means fewer fights and steadier exploration.", "洞窟カードへ進む": "Continue to cave cards", "回復": "Recovery", "拠点を整える": "Organize your base", "食料、予備ツール、回収品の置き場を決めると、戻った直後に次の行動へ移りやすくなります。": "Set places for food, backup tools, and loot so you can move to the next task as soon as you return.", "食料の入口へ戻る": "Return to food basics", "採集": "Gathering", "資源を回収する": "Collect resources", "今日は鉄、今日は石炭というように目的を決めて掘ると、持ち帰りと整理がぶれません。": "Set a purpose for each trip—iron today, coal tomorrow—to make bringing resources home and sorting them easier.", "地形別ガイドを見る": "View biome guides", "発展": "Progress", "次の世界へ進む": "Move to the next world", "ネザーやエンドに進む前に、補給、予備装備、帰還手段の抜け漏れを確認します。": "Before heading to the Nether or End, check supplies, backup gear, and your way home.", "次に開くカードを決める": "Choose your next card",
        "最初は細部より、遠景で残る輪郭を決める。": "Set the silhouette that reads from afar before refining details.",
        "塔の高さ、屋根の角度、基壇の幅を先に置くと、建築の主役がぶれません。装飾はシルエットが固まってから重ねます。": "Set tower height, roof angles, and the base width first so the build keeps a clear focal point. Add decoration after the silhouette is solid.",
        "明るい面と影の面を分けて、石の表情を作る。": "Use light and shadow to give stone its character.",
        "光源を置く前に、どこを暗く残すかを決めると、同じ素材でも建物に深さが出ます。夕暮れや夜景を意識すると配置が決めやすいです。": "Decide where darkness should remain before placing lights. It gives the same material more depth and makes placement easier in dusk or night scenes.",
        "入口まわりから密度を足して、近景の説得力を作る。": "Add density around the entrance to make the close view believable.",
        "通路、階段、柵、灯りを入口の近くから整えると、全部を飾り切らなくても「使われている建築」に見えます。": "Shape paths, stairs, fences, and lights near the entrance first. The build will feel lived in without decorating every surface.",
        "テーマと用途を決める": "Choose a theme and purpose",
        "神殿、城、倉庫など役割を先に決めると、必要な大きさと装飾の方向がぶれません。最初に「誰が使う建物か」を一言で決めます。": "Choose the role first—temple, castle, or storage—and the scale and decoration stay focused. Begin by stating who uses the building.",
        "遠景のシルエットを置く": "Block out the distant silhouette",
        "塔、屋根、壁の高さをざっくり配置し、遠くから見たときの主役を決めます。細部より先に、外形の強さを確認します。": "Roughly place towers, roofs, and wall heights, then choose what leads from a distance. Check the outer shape before the details.",
        "素材を二〜三系統に絞る": "Limit materials to two or three families",
        "石、木、装飾材を増やしすぎると全体が散ります。主素材、補助素材、差し色だけに絞ると大きな建築でもまとまりやすいです。": "Too many stone, wood, and decorative materials scatter the design. A main material, a support material, and one accent keep large builds cohesive.",
        "反復で秩序を作る": "Create order through repetition",
        "柱の間隔、窓の幅、灯りの位置をそろえると、巨大でも雑多に見えません。同じ単位を繰り返して、建物にリズムを作ります。": "Align column spacing, window widths, and light positions so even a huge build does not feel cluttered. Repeat one unit to give it rhythm.",
        "光と導線で仕上げる": "Finish with light and movement",
        "入口、階段、通路にだけ光を集めると、視線と移動の流れが自然にまとまります。最後は夜に見直して、暗さと明るさの差を調整します。": "Concentrate light at entrances, stairs, and paths to guide both the eye and movement. Review it at night and tune the contrast.",
        "基本的な戦闘の仕組みを理解する": "Understand the combat fundamentals",
        "最初の章では、まず「強く振る」より「外さない・欲張らない」を安定させることを目標にします。": "Start by making hits reliable and avoiding greed, rather than trying to swing harder.",
        "攻撃クールダウンを見る:": "Watch attack cooldowns:",
        "Java版の近接戦は連打より、剣のクールダウンが戻った瞬間に当てる方がダメージ効率が高い。まずは速さより、1発をしっかり通す感覚を覚える。": "In Java melee combat, hitting as the sword cooldown returns is more efficient than spamming. Learn to land one clean hit before chasing speed.",
        "間合いを固定する:": "Hold your spacing:",
        "相手に密着しすぎると視点が暴れ、離れすぎると空振りしやすい。相手の当たり判定の外周をなぞるように横移動し、一定の距離を保つ。": "Standing too close shakes your view; staying too far causes whiffs. Strafe around the edge of the opponent's hitbox and keep a consistent distance.",
        "ノックバックを読む:": "Read knockback:",
        "高所や崖際では1発の価値が大きくなる。自分が押し出される位置と、相手を落とせる位置を毎回意識するだけで勝率が上がる。": "At heights and cliffs, one hit matters more. Track where you can be pushed and where an opponent can fall to improve your odds.",
        "食料と回復を後回しにしない:": "Do not delay food and healing:",
        "不利になってから回復しようとすると追撃で潰されやすい。体力が半分を切る前に一度距離を作る判断を持つ。ここが安定すると、次の装備選択も活きやすくなります。": "Healing only after you are losing makes you easy to chase down. Create distance before health drops below half; once that is stable, your gear choices matter more.",
        "勝てないときはクリック速度より先に、距離管理と引き際を見直すと改善しやすいです。": "When you cannot win, review spacing and disengagement before click speed.",
        "PVP装備の選び方とエンチャント": "Choosing PVP gear and enchantments",
        "基本のテンポが分かったら、次は「何を持つと判断しやすいか」を装備単位で固めていきます。": "Once the basic tempo makes sense, decide what to carry so each choice is easier to make.",
        "ダイヤ剣 / ネザライト剣": "Diamond sword / Netherite sword",
        "必要素材:": "Materials:",
        "ダイヤまたはネザライト、棒": "Diamond or netherite, stick",
        "推奨エンチャント:": "Recommended enchantments:",
        "鋭さ、耐久力、修繕。まずは完璧な1本より、使い慣れた主力武器を1本決める意識で十分です。": "Sharpness, Unbreaking, Mending. Rather than chasing perfection, choose one main weapon you know well.",
        "盾": "Shield",
        "木材6 + 鉄インゴット1": "6 planks + 1 iron ingot",
        "推奨運用:": "Best use:",
        "弓対策、距離調整、再展開の時間稼ぎ。攻め急がず、立て直しの時間を作る道具として持つと安定します。": "Counter bows, adjust distance, and buy time to reset. Treat it as a tool for recovery instead of rushing attacks.",
        "弓": "Bow", "糸3 + 棒3": "3 string + 3 sticks", "パワー、無限、耐久力": "Power, Infinity, Unbreaking",
        "水入りバケツ": "Water bucket", "鉄インゴット3": "3 iron ingots", "用途:": "Use:",
        "落下対策、火消し、距離リセット。操作に慣れるまでは「逃げの一手」として使えるだけでも十分強いです。": "Prevent falls, extinguish fire, and reset distance. Until the controls feel natural, using it as an escape tool is already powerful.",
        "金のリンゴ": "Golden apple", "効果:": "Effect:", "追加体力と再生で打ち合いに強くなる": "Extra absorption and regeneration help you trade hits.", "使いどころ:": "When to use:", "仕掛ける前か、不利からの立て直し": "Before engaging or when recovering from a disadvantage.",
        "満腹度の高い食料": "High-saturation food", "回復量:": "Recovery:", "ステーキ、豚肉、金ニンジンが安定": "Steak, porkchops, and golden carrots are reliable.", "逃げながらの自然回復を止めない": "Keep natural regeneration running while you retreat.",
        "強い装備だけで押し切ろうとすると、回復タイミングと盾管理の差で逆転されやすいです。": "Relying on strong gear alone is risky; better healing timing and shield management can still turn the fight.",
        "状況別の立ち回り・戦術": "Situational movement and tactics",
        "装備が決まったら、ここからは状況別に「何を優先するか」を整理していきます。": "With gear chosen, decide what to prioritize in each situation.",
        "1対1:": "One-on-one:", "多人数戦:": "Group fight:", "逃げ方:": "Retreating:", "地形利用:": "Using terrain:", "チーム戦:": "Team fights:",
        "上級テクニックと練習方法": "Advanced techniques and practice", "上級テクニックは、基本戦闘と回復判断が崩れなくなってから少しずつ足すのが近道です。": "Add advanced techniques gradually after your basic combat and recovery decisions are reliable.",
        "クリティカルヒット:": "Critical hits:", "ストレイフ:": "Strafing:", "コンボ管理:": "Combo control:", "盾割りの判断:": "Shield-breaking decisions:", "練習サーバー活用:": "Using practice servers:",
        "負けから学ぶ - メンタルと成長サイクル": "Learn from losses: mindset and growth", "負け方を分類する:": "Classify losses:", "感情で連戦しない:": "Do not queue on emotion:", "録画やリプレイを見る:": "Review recordings and replays:", "成長の基準を変える:": "Change how you measure growth:",
        "相手の初撃を盾で受けるか、横移動で外してから反撃すると展開を作りやすい。焦って正面から連打しない。": "Take the first hit with a shield, or strafe it out before counterattacking. Do not panic-spam head-on.",
        "一番近い相手ではなく、一番削れている相手か弓を持っている相手を優先して処理する。": "Prioritize the weakest opponent or one holding a bow, not simply the closest target.",
        "真っすぐ逃げるより、ブロック設置や水バケツで視線を切って回復時間を作る方が安全。": "Instead of running in a straight line, use blocks or a water bucket to break line of sight and make recovery time.",
        "水場、段差、狭い通路では武器性能より位置取りの差が大きい。相手のジャンプ先を先読みして置きエイムする。": "At water, ledges, and narrow paths, positioning matters more than weapon stats. Read the opponent's landing spot and pre-aim.",
        "同じ敵を一気に削る、回復に入る味方の前に出る、追いすぎない。この3つだけでも連携の質が変わる。": "Focus one target, stand in front of teammates who are healing, and avoid overchasing. These three habits transform coordination.",
        "シチュエーション": "Situation", "推奨行動": "Recommended action", "注意点": "Watch out", "難易度": "Difficulty", "剣 vs 剣": "Sword vs sword", "横移動で初撃を外させてから最大火力で差し込む": "Make the first hit miss with a strafe, then punish with full damage.", "正面の殴り合いだけにしない": "Do not turn it into only a face-to-face trade.", "剣 vs 弓": "Sword vs bow", "盾を使って接近し、障害物で射線を切る": "Close with a shield and break their line of sight with cover.", "ジャンプしすぎると狙われやすい": "Jumping too much makes you easy to target.", "崖際の戦闘": "Cliff-edge combat", "無理に前進せず、ノックバック方向を優先して調整": "Do not force an advance; prioritize knockback direction.", "1発の落下が致命傷になる": "One fall can be fatal.", "体力不利": "Health disadvantage", "水、盾、ブロックで距離を切ってから回復": "Use water, a shield, or blocks to make space before healing.", "振り返り連打で止まらない": "Do not stop to spam hits while looking back.",
        "ジャンプの頂点ではなく、落下し始めた瞬間に当てる。無駄ジャンプを減らし、意図して差し込めるようにする。": "Hit as you begin to fall, not at the jump apex. Cut unnecessary jumps and learn to land deliberate strikes.",
        "一定方向に逃げ続けるのではなく、短く切り返して相手のエイムをずらす。近距離では視線誘導の効果が大きい。": "Do not flee in one direction; make short reversals to throw off aim. At close range, directing their view has a big effect.",
        "連続ヒットを狙うときは、自分が前に出すぎて距離を潰さないこと。1歩ずつ追う意識の方が安定する。": "When seeking consecutive hits, do not rush so far forward that you lose spacing. Following one step at a time is steadier.",
        "斧があるなら盾破壊を狙う価値があるが、外した直後は反撃を受けやすい。確実に触れる距離でだけ振る。": "If you have an axe, breaking a shield can be valuable, but a miss invites a counterattack. Swing only from a range where you can connect.",
        "1試合ごとに「初撃」「回復」「引き際」のどれが悪かったか1つだけ振り返ると改善点が見えやすい。": "After each match, review just one weak point—first hit, recovery, or disengagement—to make the next improvement clear.",
        "練習は「勝つこと」より、毎回1つだけ成功条件を決めて試す方が上達が早いです。": "Practice improves faster when you set one success condition per match instead of only trying to win.",
        "上級テクニックを増やしすぎると判断が遅れます。まずは基本戦闘と回復の精度を優先してください。": "Too many advanced techniques slow your decisions. Prioritize precise basic combat and recovery first.",
        "初撃負け、装備差、回復ミス、地形負けに分けると、何を直すべきかがすぐ見える。": "Sort losses into first-hit, gear-gap, healing-mistake, and terrain categories to see what to fix quickly.",
        "連敗直後は視野が狭くなりやすい。1分でも良いので間を空けて、次の試合で試すことを1つ決める。": "A losing streak narrows your view. Take even one minute, then choose one thing to test in the next match.",
        "自分では押しているつもりでも、実際は不用意に前へ出ていることが多い。見返すと癖が分かる。": "You may feel in control while actually stepping forward carelessly. Reviewing footage reveals the habit.",
        "今日は勝率より、初撃を3回取れたか、回復判断を遅らせなかったかで評価すると継続しやすい。": "It is easier to keep improving when you judge today by three first hits or timely recovery decisions, not just win rate.",
        "今すぐ戦場へ": "Enter the arena now", "知識は武器ですが、最初は初撃・距離・回復の3点だけでも勝ち筋は見えやすくなります。あとは実戦で一つずつ精度を上げていきましょう。": "Knowledge is a weapon, but first hits, spacing, and recovery alone already make winning routes easier to see. Improve one piece at a time in real matches.", "まだ装備が揃ってない？サバイバルガイドで基礎を固めてから戻ってこよう。": "Need more gear first? Build the basics in the Survival guide and come back.", "サバイバルガイドを見る": "View the Survival guide",
        "注目カード": "Featured cards", "次に開くカードを決めよう": "Choose the next card to open", "初日の立ち上がり、洞窟探索、拠点づくり、次の遠征準備まで。今いちばん困っている場面から読み進められるサバイバルハブです。": "From getting started on day one through cave exploration, base building, and preparing for the next expedition, this Survival hub lets you begin with the challenge you face now.", "迷ったらスタートガイド、次の目標を決めたいなら進行ルートから読むのがおすすめです。": "When unsure, start with the start guide; use the progression route to choose your next objective.", "トップへ戻る": "Back to top",
    });

    const elementTranslations: Record<string, Record<string, string>> = {
        home: {
            ".survival-p1": "Learn the decisions that matter most: your first day, a reliable base, and the order to explore.",
            ".survival-p2": "What to gather first, when to pause, and what to aim for next—a practical guide for new players.",
            ".pvp-p1": "Learn the fundamentals that decide a fight—first hits, spacing, and recovery—in real match order.",
            ".pvp-p2": "A player-versus-player guide that goes beyond click speed, covering resets and recoveries.",
            ".build-p1": "Learn the order for shaping large projects through silhouette, materials, and lighting.",
            ".build-p2": "Decide what to settle first and what can wait. A concise approach to builds that look great in the landscape.",
        },
        survival: {
            ".survival-hero-panel h1": "Choose your next adventure<br>from a card",
            ".survival-hero-copy": "From surviving the first night to building a base, gathering resources, and choosing an expedition, this guide lets you pick a route for your current progress.",
            ".survival-hero-primary": "View the start guide",
            ".survival-hero-secondary": "Open featured cards",
            "#quickstart .survival-section-heading h2": "Start here",
            "#quickstart .survival-section-lead": "First night, food, base, and gear. Pick the card for the decision in front of you.",
        },
        pvp: {
            ".pvp-hero-text h1": "The complete Minecraft<br>PVP guide",
            ".pvp-hero-text > p:not(.pvp-kicker)": "A step-by-step guide to decisions that make PVP more winnable, from fundamentals to recovering in a real fight. Built for beginners and intermediate players who want consistent first hits, spacing, and recovery timing—not just faster clicks.",
            ".pvp-stat:nth-of-type(1) .pvp-stat-label": "Respect cooldowns",
            ".pvp-stat:nth-of-type(2) .pvp-stat-label": "Hold spacing by strafing",
            ".pvp-stat:nth-of-type(3) .pvp-stat-label": "Reset before half health",
        },
        build: {
            ".build-hero-text h1": "Turn imagination<br>into blocks.",
            ".build-hero-text p": "Shape a striking build through form, material, and light.",
            ".build-hero-link": "See the five steps",
            ".build-story h2": "The larger the build, the more its finish depends on the order of your first decisions.",
            ".build-story p": "Set a theme, establish the distant silhouette, then finish the entrance. This order keeps even huge builds clear.",
            ".build-section-heading h2": "Frame builds that stay with the landscape.",
        },
    };

    function stored(key: string): string | null {
        try { return localStorage.getItem(key); } catch (_) { return null; }
    }

    function save(key: string, value: string): void {
        try { localStorage.setItem(key, value); } catch (_) { /* Private browsing can disable storage. */ }
    }

    function preferredTheme(): Theme {
        const saved = stored(storageKeys.theme);
        if (supportedThemes.has(saved)) return saved as Theme;
        return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }

    function preferredLanguage(): Language {
        const saved = stored(storageKeys.language);
        if (supportedLanguages.has(saved)) return saved as Language;
        return (navigator.language || "ja").toLowerCase().startsWith("ja") ? "ja" : "en";
    }

    let state: PreferencesState = {
        theme: preferredTheme(),
        language: preferredLanguage(),
        themeSource: supportedThemes.has(stored(storageKeys.theme)) ? "manual" : "auto",
        languageSource: supportedLanguages.has(stored(storageKeys.language)) ? "manual" : "auto",
    };

    // Apply before the stylesheet is parsed so the selected device/manual theme never flashes.
    document.documentElement.dataset.colorScheme = state.theme;
    document.documentElement.lang = state.language;

    function translateText(value: string): string;
    function translateText(value: unknown): unknown;
    function translateText(value: unknown): unknown {
        if (state.language !== "en" || typeof value !== "string") return value;
        return textTranslations[value] || value;
    }

    function applyTextTranslations(root?: Node | null): void {
        if (state.language !== "en") return;
        const walker = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT);
        const textNodes: Text[] = [];
        while (walker.nextNode()) textNodes.push(walker.currentNode as Text);
        textNodes.forEach((node) => {
            const original = node.nodeValue!.trim().replace(/\s+/g, " ");
            if (!original || !textTranslations[original]) return;
            const leading = node.nodeValue!.match(/^\s*/)![0];
            const trailing = node.nodeValue!.match(/\s*$/)![0];
            node.nodeValue = `${leading}${textTranslations[original]}${trailing}`;
        });

        const view = document.documentElement.dataset.viewTheme;
        const translations = elementTranslations[view!];
        if (!translations) return;
        Object.entries(translations).forEach(([selector, translation]) => {
            document.querySelectorAll<HTMLElement>(selector).forEach((element) => {
                if (element.dataset.i18nTranslated === "true") return;
                element.innerHTML = translation;
                element.dataset.i18nTranslated = "true";
            });
        });
    }

    function localizeHeaderConfig<T extends HeaderConfig | null | undefined>(config: T): T {
        if (state.language !== "en" || !config || !Array.isArray(config.links)) return config;
        const view = document.documentElement.dataset.viewTheme || (document.body.classList.contains("licenses-page") ? "licenses" : "");
        const localized = localizedConfigs[view];
        if (!localized) return config;
        return {
            ...config,
            links: config.links.map((link, index) => ({ ...link, text: localized.links[index] || translateText(link.text) })),
        } as T;
    }

    function updateMetadata() {
        document.documentElement.lang = state.language;
        const titles: Record<string, string> = {
            "": "Minecraft Fan Site",
            home: "Home - Minecraft Fan Site",
            survival: "Survival Guide - Minecraft Fan Site",
            pvp: "PVP Guide - Minecraft Fan Site",
            build: "Build Guide - Minecraft Fan Site",
            licenses: "Licenses - Minecraft Fan Site",
            notFound: "404 - Page Not Found",
        };
        const view = document.documentElement.dataset.viewTheme || (document.body.classList.contains("licenses-page") ? "licenses" : document.body.classList.contains("not-found-page") ? "notFound" : "");
        if (state.language === "en" && titles[view]) document.title = titles[view];
    }

    function updateLocalizedAttributes() {
        if (state.language !== "en") return;
        const attributes: Record<string, string> = {
            "サバイバルページ内メニュー": "Survival page navigation",
            "前のバイオームへ": "Previous biome",
            "次のバイオームへ": "Next biome",
            "草原でサバイバルを始めるプレイヤーの風景": "Player starting a Survival world in the plains",
            "洞窟で鉄鉱石を見つけたサバイバルの序盤": "Early Survival player finding iron ore in a cave",
            "畑と家畜が揃ったサバイバル農場": "Survival farm with crops and livestock",
            "たいまつで照らされた安全な洞窟探索ルート": "Safe cave route lit with torches",
            "木造のスターターハウスと小さな拠点": "Wooden starter house and small base",
            "装備強化に向けたエンチャント周辺のサバイバル風景": "Survival scene around enchanting for a gear upgrade",
            "畑と家畜が揃った春のサバイバル農場": "Spring Survival farm with crops and livestock",
            "花に囲まれた木造のスターターハウス": "Wooden starter house surrounded by flowers",
            "緑に囲まれた森のバイオーム": "Forest biome surrounded by greenery",
            "夜に明かりが灯る村のある平原": "Plains with a village lit at night",
            "海辺に建てた小さなサバイバル拠点": "Small Survival base built by the sea",
            "小さな拠点が見える雪山のバイオーム": "Snowy mountain biome with a small base in view",
            "水辺と湿地が広がる沼地のサバイバル風景": "Survival swamp landscape with water and wetlands",
            "盾を作るクラフトのイメージ": "Crafting a shield",
            "たいまつ作成のイメージ": "Crafting torches",
            "チェスト作成のイメージ": "Crafting a chest",
            "エンチャント部屋のイメージ": "Enchanting room",
            "ネザー準備のイメージ": "Preparing for the Nether",
            "マインクラフトのPVP戦闘シーン": "Minecraft PVP combat scene",
            "マインクラフトPVPの上級者イメージ": "Advanced Minecraft PVP player",
            "PVPの振り返りイメージ": "Reviewing a PVP match",
            "夕暮れの湖畔にそびえる巨大なマインクラフト建築": "Grand Minecraft build by a lake at dusk",
            "巨大な城郭と湖畔の建築を広く見渡す": "Wide view of a grand castle and lakeside build",
            "夕暮れの光を受ける建築の左側ディテール": "Left-side building detail in dusk light",
            "近景で見る建築の街並みディテール": "Close view of building streetscape details",
            "巨大建築の構造を確認するためのガイドビジュアル": "Guide visual for checking a grand build's structure",
        };
        document.querySelectorAll("[alt], [aria-label]").forEach((element) => {
            ["alt", "aria-label"].forEach((attribute) => {
                const source = element.getAttribute(attribute);
                if (source && attributes[source]) element.setAttribute(attribute, attributes[source]);
            });
        });

        const descriptions: Record<string, string> = {
            home: "Welcome to a Minecraft fan site with guides for Survival, PVP, and Build playstyles.",
            survival: "A Survival portal for learning the essentials of staying alive, building a base, and exploring.",
            pvp: "A practical Minecraft PVP guide from combat fundamentals to advanced techniques.",
            build: "An immersive visual guide to Minecraft construction, scale, and worldbuilding through grand temples.",
        };
        const view = document.documentElement.dataset.viewTheme;
        if (descriptions[view!]) {
            document.querySelectorAll<HTMLMetaElement>('meta[name="description"], meta[property="og:description"]').forEach((meta) => meta.content = descriptions[view!]);
        }
    }

    function updateControls(root?: ParentNode | null): void {
        (root || document).querySelectorAll("[data-site-preferences]").forEach((controls) => {
            controls.setAttribute("aria-label", state.language === "en" ? "Display preferences" : "表示設定");
            const themeToggle = controls.querySelector("[data-theme-toggle]");
            const languageToggle = controls.querySelector("[data-language-toggle]");
            const themeLabel = controls.querySelector("[data-theme-label]");
            const languageLabel = controls.querySelector("[data-language-label]");
            const autoButton = controls.querySelector<HTMLElement>("[data-preferences-auto]");
            const autoLabel = controls.querySelector("[data-auto-label]");
            if (themeToggle) {
                const next = state.theme === "dark" ? "light" : "dark";
                themeToggle.setAttribute("aria-pressed", String(state.theme === "dark"));
                themeToggle.setAttribute("aria-label", state.language === "en" ? `Switch to ${next} theme` : `${next === "light" ? "ライト" : "ダーク"}テーマに切り替え`);
            }
            if (languageToggle) {
                languageToggle.setAttribute("aria-pressed", String(state.language === "en"));
                languageToggle.setAttribute("aria-label", state.language === "en" ? "Switch to Japanese" : "Switch to English");
            }
            if (autoButton) {
                autoButton.hidden = state.themeSource === "auto" && state.languageSource === "auto";
                autoButton.setAttribute("aria-label", state.language === "en" ? "Use device preferences" : "端末の設定に戻す");
            }
            if (themeLabel) themeLabel.textContent = state.language === "en" ? (state.theme === "dark" ? "Light" : "Dark") : (state.theme === "dark" ? "ライト" : "ダーク");
            if (languageLabel) languageLabel.textContent = state.language === "en" ? "JA" : "EN";
            if (autoLabel) autoLabel.textContent = state.language === "en" ? "Auto" : "自動";
        });
    }

    function apply() {
        document.documentElement.dataset.colorScheme = state.theme;
        updateMetadata();
        applyTextTranslations();
        updateLocalizedAttributes();
        updateControls();
        document.dispatchEvent(new CustomEvent("sitepreferenceschange", { detail: { ...state } }));
    }

    function setTheme(theme: unknown): void {
        if (!supportedThemes.has(theme)) return;
        state.theme = theme as Theme;
        state.themeSource = "manual";
        save(storageKeys.theme, theme as Theme);
        apply();
    }

    function setLanguage(language: unknown): void {
        if (!supportedLanguages.has(language)) return;
        state.language = language as Language;
        state.languageSource = "manual";
        save(storageKeys.language, language as Language);
        window.location.reload();
    }

    document.addEventListener("click", (event) => {
        const themeToggle = (event.target as Element).closest("[data-theme-toggle]");
        if (themeToggle) {
            setTheme(state.theme === "dark" ? "light" : "dark");
            return;
        }
        if ((event.target as Element).closest("[data-language-toggle]")) {
            setLanguage(state.language === "ja" ? "en" : "ja");
            return;
        }
        if ((event.target as Element).closest("[data-preferences-auto]")) window.SitePreferences.resetToAutomatic();
    });

    if (window.matchMedia) {
        const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
        const updateAutomaticTheme = (event: MediaQueryListEvent) => {
            if (state.themeSource !== "auto") return;
            state.theme = event.matches ? "dark" : "light";
            apply();
        };
        if (typeof systemTheme.addEventListener === "function") systemTheme.addEventListener("change", updateAutomaticTheme);
        else if (typeof systemTheme.addListener === "function") systemTheme.addListener(updateAutomaticTheme);
    }

    document.addEventListener("DOMContentLoaded", () => {
        apply();
        if (!document.querySelector("[data-site-preferences]") && document.body.classList.contains("not-found-page")) {
            const controls = document.createElement("div");
            controls.className = "site-preferences site-preferences--standalone";
            controls.dataset.sitePreferences = "";
            controls.innerHTML = '<button class="site-preferences__control" type="button" data-theme-toggle><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20.5 15.3A8.5 8.5 0 0 1 8.7 3.5 8.5 8.5 0 1 0 20.5 15.3Z" /></svg><span class="site-preferences__text" data-theme-label></span></button><button class="site-preferences__control site-preferences__control--language" type="button" data-language-toggle><span data-language-label></span></button><button class="site-preferences__control site-preferences__control--auto" type="button" data-preferences-auto hidden><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 11a8 8 0 0 0-14.9-4M4 5v4h4M4 13a8 8 0 0 0 14.9 4M20 19v-4h-4" /></svg><span class="site-preferences__text" data-auto-label></span></button>';
            document.body.appendChild(controls);
            updateControls(controls);
        }
    });

    document.addEventListener("sitepreferencescontentready", (event) => {
        applyTextTranslations(event.detail && event.detail.target);
        updateLocalizedAttributes();
        updateControls(event.detail && event.detail.target);
    });

    window.SitePreferences = {
        getState: () => ({ ...state }),
        translateText,
        localizeHeaderConfig,
        applyTextTranslations,
        resetToAutomatic: () => {
            try {
                localStorage.removeItem(storageKeys.theme);
                localStorage.removeItem(storageKeys.language);
            } catch (_) { /* Storage may be unavailable. */ }
            state = { theme: preferredTheme(), language: preferredLanguage(), themeSource: "auto", languageSource: "auto" };
            window.location.reload();
        },
    };
}());
