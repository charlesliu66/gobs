# Video Prompt Templates by Game Genre
# Used by Game Director Video Skill — Stage 2 production

## 即梦 / Seedance 安全句式（必包）

所有通过即梦、Seedance、Kling 等 API 的提示词必须符合安全红线（见 `rules_and_formulas.md`）。

- **中文**：`【原创数字艺术作品】` + [画面描述] + `，适合全年龄段观看，无版权争议，无敏感元素`
- **英文**：`Original digital artwork, [description], family-friendly, no copyright issues, no sensitive content.`

示例（中文）：  
`【原创数字艺术作品】日本浪人武士背对镜头站在雨夜废墟与城楼前，刀鞘轮廓清晰，画面偏暗高对比，电影级 CG 氛围，适合全年龄段观看，无版权争议，无敏感元素。`

示例（英文，用于 API）：  
`Original digital artwork, ronin warrior back to camera in rain and ruins, sword silhouette, dark high contrast, cinematic CG mood, family-friendly, no copyright issues, no sensitive content.`

---

## Universal Prompt Structure

```
[SHOT_TYPE], [CAMERA_MOVEMENT], [SUBJECT + ACTION], [ATMOSPHERE], [STYLE_KEYWORDS], [TECHNICAL]
```

**Kling/Volcengine API：写英文时在末尾加安全句；中文 API 时用中文安全句式包裹。**

---

## Genre-Specific Prompt Formulas

### Action RPG / Fantasy
**Opening hook:**
> `cinematic game trailer shot, extreme wide aerial reveal, [hero name] stands on cliff edge overlooking burning kingdom, dramatic orange sky, epic scale, 4K, high detail, game promotional video`

**Battle sequence:**
> `fast-cut action sequence, close-up handheld, [character] unleashes magic attack, particle effects, motion blur, dynamic lighting, adrenaline, game trailer style, cinematic`

**World reveal:**
> `slow cinematic pull-back, vast fantasy landscape, ancient ruins and lush forests, golden hour lighting, god rays, epic music implied, game promotional, 4K`

---

### Battle Royale / Shooter
**Drop-in hook:**
> `POV shot, fast descent from sky, battle royale map below, dramatic zoom into landing zone, explosive energy, game trailer, vertical 9:16, TikTok style`

**Gunfight sequence:**
> `handheld shaky cam, intense close-quarters combat, muzzle flash, dust particles, fast cuts, military realism, cinematic game footage style`

**Victory moment:**
> `slow-motion close-up, winner stands in destruction zone, final circle closing, dramatic backlighting, triumphant, game trailer end card style`

---

### MOBA / Strategy
**Character reveal:**
> `dramatic hero reveal, low angle looking up, [champion name] poses with weapon, glowing VFX, arena background, cinematic portrait, game key art style`

**Team fight:**
> `wide establishing shot, two teams clash in center, colorful ability effects, magical explosions, isometric-ish perspective, game trailer, vibrant colors`

---

### Puzzle / Casual
**Satisfying mechanic:**
> `close-up of game board/tiles, satisfying combo chain reaction, bright colors pop, smooth animation, cheerful atmosphere, mobile game ad style, vertical 9:16`

**Progression reveal:**
> `time-lapse style, player base/world growing and evolving, clean UI elements visible, upbeat energy, casual game promotional video`

---

### Horror / Survival
**Atmosphere builder:**
> `extreme close-up, character's frightened eye reflection, monster glimpsed in darkness, slow zoom in, cold blue desaturated tones, survival horror atmosphere, cinematic`

**Jump scare setup:**
> `slow tracking shot down dark corridor, flickering light, tension building, dead silent implied, horror game trailer style, desaturated, grain`

---

## Camera Movement Reference

| Movement | Use Case | Kling Prompt Keyword |
|----------|----------|---------------------|
| Slow push-in | Build tension, reveal importance | `slow push-in`, `slow zoom in` |
| Pull-back reveal | Epic scale, world size | `pull-back reveal`, `aerial pull-back` |
| Low angle | Hero power, dominance | `low angle looking up`, `worm's eye view` |
| Handheld shake | Action, chaos, urgency | `handheld shaky cam`, `documentary style` |
| Drone arc | Establish location, epic | `drone arc`, `orbital camera` |
| POV | Immersion, first-person feel | `POV shot`, `first-person perspective` |
| Slow motion | Key moment, impact | `slow motion`, `120fps effect` |
| Whip pan | Fast transition, energy | `whip pan transition` |

---

## Shot Type Reference

| Shot | Description | Best For |
|------|-------------|----------|
| EWS (Extreme Wide) | Entire world visible | World reveals, scale |
| WS (Wide Shot) | Full character + environment | Establishing, action |
| MS (Medium Shot) | Waist up | Dialogue, emotion, reaction |
| MCU (Medium Close-Up) | Chest up | Character focus |
| CU (Close-Up) | Face/object | Emotion, detail |
| ECU (Extreme Close-Up) | Eye / hand / item | Tension, detail |
| POV | Through character's eyes | Immersion |
| OTS (Over the Shoulder) | Behind character looking forward | Stakes, scale |

---

## Negative Prompt Guidelines

Always add negatives for quality control:
```
Avoid: blurry, low quality, watermark, text overlay, cartoon (if realistic game), distorted faces, extra limbs
```

For game trailers specifically:
```
Avoid: stock footage look, generic, boring composition, flat lighting, no motion blur
```
