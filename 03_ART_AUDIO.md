# 《一勺到底》美术、界面、音乐与音效制作执行书

## 1. 推荐生产组合

### 1.1 最省心组合

- 风格设定与背景：Adobe Firefly 或 Leonardo AI。
- 图标与宝物：Recraft。
- 同角色一致性：Leonardo AI / Scenario。
- 修图与分层：Krita 或 Photopea。
- 序列帧：Aseprite 或 Krita。
- 音乐样片：Suno / Udio / Stable Audio 类工具。
- 音效原料：ElevenLabs Sound Effects 或明确商用许可音效库。
- 音频剪辑：Audacity。
- 更专业音频处理：REAPER。
- 图集：Cocos 自动图集或 TexturePacker。

不要同时购买所有工具。先用免费试用完成风格测试，确定方案后只购买 1 个主要图片工具和 1 个音频工具的单月付费档。

### 1.2 推荐优先级

1. 先完成可玩灰盒。
2. 再确定主角、勺子、方块的统一风格。
3. 再生成 20 件 MVP 宝物。
4. 再做基地和第一、第二地层背景。
5. 最后做商店图与宣传素材。

---

## 2. 总美术方向

关键词：

- 2D cartoon excavation game。
- chunky shapes。
- thick readable outlines。
- hand-painted texture。
- construction workshop。
- absurd underground treasure。
- warm surface, cool underground。
- readable mobile game asset。

禁止关键词：

- photorealistic。
- hyper detailed。
- cinematic concept art。
- imitation of a named game。
- imitation of a living artist。
- recognizable brand logo。
- text, watermark, signature。

基础英文提示词：

```text
Original 2D cartoon game art for a lighthearted underground digging adventure, chunky readable shapes, thick clean outlines, hand-painted texture, playful construction workshop aesthetic, slightly worn materials, humorous but not childish, strong silhouette, mobile game readability, consistent three-quarter side view, no text, no logo, no watermark, transparent background where applicable
```

负面提示词：

```text
photorealistic, 3D render, anime character, overly detailed, thin lines, blurry silhouette, dark unreadable object, text, letters, numbers, logo, watermark, copyrighted character, branded product
```

---

## 3. 风格测试步骤

一次生成以下同一张风格板：

- 主角。
- 生锈饭勺。
- 松土方块。
- 旧手机宝物。
- 工具台。
- 主按钮。

要求：

- 六项放在白色或透明背景。
- 轮廓、明暗、材质细节统一。
- 缩小到 128 px 时仍可识别。
- 不允许每件物品有不同透视。

只选一版作为“母风格”，后续所有生成都上传该风格板作为参考。保存 seed、模型、提示词和生成参数。

---

## 4. 主角资产

### 4.1 角色设定

- 普通年轻挖掘爱好者，不设具体国家身份。
- 黄色旧安全帽。
- 青绿色工作服。
- 橙色手套。
- 小背包。
- 表情认真但略显滑稽。
- 身体比例约 3.5 头身。
- 侧面或四分之三侧面，面向右。

角色设定图提示词：

```text
Character sheet for an original 2D cartoon digging game protagonist, compact 3.5-head-tall body proportions, worn yellow safety helmet, teal work overalls, orange work gloves, tiny utility backpack, determined but slightly comedic expression, clear front view, side view and three-quarter view, consistent proportions, thick clean outlines, flat readable color groups, neutral studio background, no text, no watermark
```

### 4.2 游戏动画规格

原稿单帧建议：256 × 256，最终按设备缩放。

- `player_idle`：6 帧。
- `player_dig`：6 帧。
- `player_heavy_dig`：8 帧。
- `player_walk`：8 帧。
- `player_find`：8 帧。
- `player_hurt`：4 帧。
- `player_exhausted`：6 帧。
- `player_celebrate`：10 帧。

动画制作要求：

- 脚底锚点不跳动。
- 帽子轮廓每帧保持一致。
- 勺子动画与人物动画分层，方便替换工具。
- 所有帧使用相同画布和透明背景。

AI 只适合先生成关键姿势。最终帧间动作应由 Aseprite/Krita 人工整理，否则容易出现手指、工具长度和服装细节漂移。

---

## 5. 工具资产

七级勺子必须一眼仍然看出“勺子”，不能升级到最后变成普通钻机。

统一提示词：

```text
Seven upgrade stages of the same absurd digging spoon for an original 2D cartoon game, from rusty household spoon to reinforced steel spoon, double-head engineering spoon, vibrating rockbreaker spoon, turbo drill spoon, plasma core spoon and antimatter spoon, each stage more powerful while preserving a clear spoon bowl silhouette, side view facing down-right, consistent scale progression, thick outlines, transparent background, no text, no watermark
```

每件工具交付：

- 游戏内侧视图 512 × 512。
- 商店展示图 768 × 768。
- 黑色剪影。
- 挥动残影。
- 命中特效颜色建议。

---

## 6. 方块资产

### 6.1 基础规格

- 原稿：256 × 256。
- 游戏逻辑：64 × 64。
- 边缘必须能无缝拼接。
- 中心细节不能太密。
- 每种方块 3 个完整表面变化。
- 每个变化有 3 层裂纹或共享独立裂纹遮罩。

推荐使用“基础方块＋裂纹遮罩”，减少总图片数。

### 6.2 第一章方块

- 松土：黄褐色、小石子、草根。
- 黏土：偏红、块状纹理。
- 碎石：灰褐、多边形石块。
- 砖块：旧红砖、灰浆。
- 管道方块：金属管穿过泥土。

第一章方块提示词：

```text
Seamless square tile set for an original 2D cartoon underground digging game, warm brown backyard soil, reddish clay, gray rubble, old brick and buried utility pipe variants, chunky readable texture, thick subtle outlines, top-down side-cutaway game tile, no perspective distortion, tileable edges, no text, no watermark
```

### 6.3 第二章方块

- 古砖。
- 硬岩。
- 铜锈金属。
- 壁画石。
- 机关方块。

第二章提示词：

```text
Seamless square tile set for an original 2D cartoon lost underground city, red-brown ancient brick, hard sandstone, oxidized bronze mechanisms, faded mural stone and sealed mechanism blocks, chunky readable shapes, archaeological but playful, tileable edges, no text, no symbols copied from real cultures, no watermark
```

---

## 7. 宝物制作

### 7.1 规格

- 每件原稿 512 × 512，透明背景。
- 物品朝向统一为右上方 15 度或正侧面。
- 周围留 12% 空白。
- 普通宝物少细节，传说宝物允许更多光效。
- 稀有度边框由游戏 UI 添加，不画进物品图。

### 7.2 批量提示词格式

```text
[基础风格提示词]. Single collectible treasure: [英文物品描述]. Centered isolated object, strong recognizable silhouette, consistent three-quarter view, transparent background, no frame, no text, no watermark.
```

示例：

```text
Original 2D cartoon collectible for a lighthearted underground digging game, chunky shape, thick clean outline, hand-painted texture. A dead old mobile phone covered with dry mud and one tiny plant root wrapped around it, centered isolated object, strong recognizable silhouette, consistent three-quarter view, transparent background, no frame, no text, no brand logo, no watermark.
```

荒诞宝物要靠“物件关系”制造笑点，而不是依赖文字。例如：

- 会响的塑料鸭：鸭子身体里露出老式机械铃。
- 古人外卖订单：泥板上画抽象食物符号，不出现可读文字。
- 恐龙会员卡：骨片制成的卡形物，印有抽象爪印。
- 防水烤面包机：潜水铜壳包住烤面包机结构，不使用品牌外形。
- 神明遗失的汤碗：巨大碗中悬浮微型星空。

### 7.3 审核

- 去掉任何随机文字。
- 去掉现实品牌标记。
- 检查轮廓是否和其他宝物过于相似。
- 检查透明边缘是否有白边。
- 缩小到 96 px 验证识别。

---

## 8. 五大地层背景

背景应分层输出：

- 远景。
- 中景。
- 前景遮挡。
- 雾尘或粒子。

不要输出一张不可拆分的大图。

### 8.1 后院与城市地下

```text
Layered 2D cartoon game background of a side-cutaway backyard and city underground, warm afternoon surface, grass roots, old brick foundations, utility pipes, abandoned cables and small maintenance structures, playful excavation mood, broad simple shapes, clear empty central area for gameplay, separate foreground and background depth, 16:9, no characters, no text, no watermark
```

### 8.2 失落古城

```text
Layered 2D cartoon underground lost city background, red-brown rock cavern, broken columns, original abstract murals, oxidized bronze mechanisms, faint teal reflected light, mysterious but friendly adventure tone, clear central gameplay area, 16:9, no real-world religious symbols, no text, no watermark
```

### 8.3 恐龙墓场

```text
Layered 2D cartoon fossil graveyard underground, enormous original creature skeleton silhouettes embedded in golden rock, amber glow, fossil ferns, broad readable shapes, adventurous and slightly mysterious, clear central gameplay area, 16:9, no text, no watermark
```

### 8.4 地下海

```text
Layered 2D cartoon underground ocean cavern, teal water, luminous algae, distant shipwreck, bubbles and gigantic harmless shadow far away, whimsical deep-sea mystery, clear gameplay area, broad readable shapes, 16:9, no text, no watermark
```

### 8.5 地心文明

```text
Layered 2D cartoon civilization near the planetary core, black obsidian cavern, warm orange lava, violet ancient energy machinery, impossible city arches, playful science fantasy, strong silhouettes, clear gameplay area, 16:9, no recognizable franchise design, no text, no watermark
```

---

## 9. UI 组件制作

### 9.1 UI 风格板

```text
Original 2D cartoon game UI kit combining worn construction equipment, old metal workshop panels and paper inventory labels, large orange primary button, dark teal secondary button, backpack slots, progress bars, toggle switches, slider, rarity frames, clean thick outlines, readable simple shapes, isolated components on transparent background, no text, no icons from existing games, no watermark
```

### 9.2 按钮资产

主按钮：

- 外形：圆角施工金属牌。
- 主色：橙黄。
- 边缘：深褐描边。
- 状态：
  - Normal。
  - Hover：更亮。
  - Pressed：内缩。
  - Disabled：灰褐。
  - Focused：独立描边层。

次按钮：

- 主色：深青。
- 用于返回、筛选、普通操作。

危险按钮：

- 主色：暗红。
- 只用于删除、放弃、确认损失。

不要让图片生成工具直接写中文按钮文字。按钮底图和文字必须分离，由 Cocos Label 显示。

### 9.3 图标

统一线宽、统一透视、统一画布：

- 金币。
- 体力。
- 工具力量。
- 背包。
- 幸运。
- 雷达。
- 保险。
- 设置。
- 声音。
- 暂停。
- 返回。
- 广告奖励。
- 锁定。
- 图鉴。
- 商店。
- 任务。

图标提示词：

```text
Set of original 2D cartoon game UI icons for coins, stamina, digging power, backpack, luck, treasure radar, insurance lock, settings, sound, pause, return, rewarded video, collection museum, shop and mission, consistent thick outline, simple two-color shapes, readable at 32 pixels, transparent background, no text, no watermark
```

---

## 10. 页面构图稿

每个页面先做黑白线框，不要直接生成成品。

### 10.1 基地页

- 左 25%：角色和装备。
- 中 50%：矿井入口与开始按钮。
- 右 25%：四个建筑入口。
- 顶部：金币、任务、设置。
- 底部：商店、图鉴、地层。

### 10.2 挖掘页

- 中央 70%：矿井。
- 左上：体力和工具。
- 顶部中间：深度。
- 右侧 22%：背包。
- 左下：主动道具。
- 底部中间：返程。

### 10.3 结算页

- 左侧：宝物落台动画。
- 右侧：收益明细。
- 底部：领取、翻倍、再来一次。

线框验收后再制作 UI 底图，避免漂亮但不可操作。

---

## 11. 音乐生成提示词

AI 音乐提示中要求 instrumental、loopable、no vocals、no spoken words。

### 11.1 基地

```text
Instrumental loop for a playful 2D digging game workshop, light marimba, muted plucked strings, soft brushed percussion, quirky low bass, curious and industrious, 92 BPM, seamless loop, no vocals, no spoken words, no dramatic trailer build, 90 seconds
```

### 11.2 城市地下

```text
Instrumental loop for a lighthearted underground excavation level, playful plucked strings, subtle pipe percussion, small mechanical clicks, warm and curious, 100 BPM, seamless loop, no vocals, no melody resembling existing music, 90 seconds
```

### 11.3 古城

```text
Instrumental loop for a mysterious but family-friendly lost underground city, low wooden flute, hand drum, stone percussion, sparse warm strings, adventurous not scary, 82 BPM, seamless loop, no vocals, 90 seconds
```

### 11.4 恐龙墓场

```text
Instrumental loop for a whimsical fossil cavern in a cartoon digging game, deep wooden drums, soft low strings, insect-like shakers, sense of ancient scale with gentle humor, 76 BPM, seamless loop, no vocals, 90 seconds
```

### 11.5 地下海

```text
Instrumental loop for a whimsical underground ocean, soft underwater synth pads, glass bells, bubble-like percussion, mysterious and calm, 72 BPM, seamless loop, no vocals, 90 seconds
```

### 11.6 地心文明

```text
Instrumental loop for an absurd ancient machine city near the planet core, industrial percussion, pulsing analog synth, warm lava ambience, energetic but playful, 104 BPM, seamless loop, no vocals, no harsh distortion, 90 seconds
```

---

## 12. 音效生成提示词

一次只生成一种声音，不让模型把多个事件混在一起。

泥土命中：

```text
Short close-up impact of a small metal spoon striking compact dry soil, soft gritty thud, playful game sound, clean transient, no reverb, under 0.4 seconds
```

泥土破碎：

```text
Compact dry soil block breaking into several chunks, crisp granular crumble, satisfying casual game sound, no voice, no music, under 0.7 seconds
```

石头命中：

```text
Small reinforced metal spoon striking a hard cartoon rock, bright metallic tick followed by a solid stone knock, satisfying not painful, dry sound, under 0.4 seconds
```

宝物出现：

```text
Short whimsical treasure discovery chime for a casual game, three bright notes with a tiny dusty sparkle, original melody, no voice, under 1.2 seconds
```

传说宝物：

```text
Short legendary collectible reveal stinger, warm bell, rising shimmer and one humorous low pluck at the end, impressive but playful, no voice, under 3 seconds
```

背包满：

```text
Short comical canvas backpack overstuffed pop and strap creak, clear warning but friendly, no voice, under 0.8 seconds
```

升级成功：

```text
Short workshop upgrade success sound, ratchet clicks, metallic lock-in and bright confirmation chime, satisfying casual game feedback, under 1.5 seconds
```

每种高频声音生成 6 个候选，选 3 个差异小但不完全相同的版本。

---

## 13. 音频后期步骤

使用 Audacity：

1. 删除头尾静音。
2. 去掉明显底噪。
3. 淡入 5—10 ms，避免爆音。
4. 淡出 10—30 ms。
5. 高频挖掘音效峰值控制在约 -6 dBFS。
6. UI 音效峰值控制在约 -9 dBFS。
7. BGM 做统一响度，不压过挖掘声音。
8. 检查音乐循环点。
9. 导出 MP3；保留无损 WAV 母版。
10. 真机连续播放测试。

文件命名不得带“final2_new_ok”等临时字样。

---

## 14. 导入 Cocos 流程

图片：

1. 检查透明背景。
2. 统一裁切空白边缘。
3. 保留原始大图到 `source_assets`，不要放进游戏包。
4. 游戏用图放入 Cocos `assets/art`。
5. 设置 SpriteFrame。
6. UI 九宫格设置正确边距。
7. 小图标关闭不必要 mipmap。
8. 方块和图标加入图集。
9. Web 使用 PNG/JPG 或合适压缩回退。
10. Android 可设置 ASTC，同时保留兼容格式。

音频：

1. BGM 放 `assets/audio/bgm`。
2. SFX 按类型分目录。
3. 音乐由 AudioSource 播放。
4. 短音效使用 `playOneShot`。
5. Web 首次点击后解锁音频。
6. 每个音效通过配置 ID 调用，不在业务代码中写路径。

---

## 15. 商店资产

### 15.1 图标

- 原稿 1024 × 1024。
- 中央为“巨大改造勺子挖向发光地心”。
- 不放细小文字。
- 缩小到 64 × 64 仍看得出勺子和地下。

提示词：

```text
Square mobile game icon for an original cartoon digging game, a ridiculously upgraded metal spoon drilling downward toward a glowing planetary core, strong orange and deep teal contrast, one clear focal object, thick outline, simple readable silhouette, no character face close-up, no text, no logo, no watermark
```

### 15.2 商店截图

至少 5 张：

1. “一把勺子，开始挖掘”：核心挖掘画面。
2. “越深，宝物越离谱”：稀有宝物画面。
3. “背包装不下，你会丢哪个”：背包选择。
4. “升级你的魔改勺子”：工具升级。
5. “从后院挖到地心文明”：五地层拼图。

商店文字必须后期排版，不让图片模型生成。

### 15.3 CrazyGames 封面与预览

根据当前官方要求准备：

- 横版封面：1920 × 1080。
- 竖版封面：800 × 1200。
- 方形封面：800 × 800。
- 横版预览：1080p、16:9。
- 竖版预览：1080p、2:3。
- 视频长度：15—20 秒。
- 文件大小：不超过 50 MB。
- 预览视频无声音、无默认鼠标、无黑边、无“Play Now”等促销文字。
- 第一帧使用对应静态封面，形成平滑过渡。

正式提交前再次查阅 CrazyGames 官方文档，平台尺寸可能更新。

### 15.4 Google Play 素材

- 应用图标：512 × 512 PNG。
- Feature Graphic：1024 × 500。
- 至少 2 张手机截图，建议准备 6 张真实 1920 × 1080 横屏截图。
- 推荐画面依次展示：挖掘、宝物、背包选择、工具升级、地层变化、密室。
- 宣传视频建议 30—45 秒，主体必须是实际游戏录屏。

正式提交前再次检查 Google Play Console 当期要求。

### 15.5 宣传视频

15 秒版本：

- 0—2 秒：普通勺子敲泥土。
- 2—5 秒：连续破碎并挖到旧手机。
- 5—8 秒：背包满，钻石与恐龙头二选一。
- 8—11 秒：勺子快速升级到涡轮形态。
- 11—14 秒：地下海、岩浆、地心文明快速切换。
- 14—15 秒：Logo 和“再挖一格就回去”。

30 秒版本增加：

- 返程结算。
- 博物馆。
- 炸药。
- 密室。

宣传视频必须展示真实玩法，不能制作游戏中不存在的假操作。

---

## 16. 每批资产验收

视觉：

- 风格一致。
- 无随机文字和水印。
- 无现实品牌。
- 透明边缘干净。
- 缩小后可识别。
- 与 UI 对比足够。
- 不遮挡交互信息。

技术：

- 尺寸符合清单。
- 命名符合规则。
- 没有重复导入。
- 图集没有超大空白。
- 包体增量记录。

版权：

- 生成工具与套餐已记录。
- 商用条款已保存。
- 参考图来源明确。
- 没有使用未授权角色、Logo、音乐或声音。

只有三项都通过，资产才能进入正式分支。

