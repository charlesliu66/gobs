import type { CampaignKnowledgePackType } from '../../services/campaignKnowledgeStore.js';

export const GOLD_AND_GLORY_GAME_ID = 'gold-and-glory';
export const GOLD_AND_GLORY_CANONICAL_TEMPLATE_ID = 'gold-and-glory-canonical';

export interface CanonicalKnowledgeSourceSeed {
  title: string;
  relativePath: string;
  content: string;
}

export interface CanonicalKnowledgePackSeed {
  type: CampaignKnowledgePackType;
  title: string;
  summary: string;
  facts: string[];
  preferences: string[];
  avoid: string[];
  hookSeeds: string[];
  visualCues: string[];
  sources: CanonicalKnowledgeSourceSeed[];
}

const fp = (relativePath: string): string => `fastpublishing/${relativePath}`;

export const GOLD_AND_GLORY_CANONICAL_PACKS: CanonicalKnowledgePackSeed[] = [
  {
    type: 'brand_tone',
    title: 'Gold and Glory Brand Tone',
    summary: 'A brave, tense, witty dungeon-adventure voice: dark fantasy stakes with a small human joke when it fits.',
    facts: [
      'GNG brand personality is a brave dungeon adventurer who still thinks about dinner in the most dangerous place.',
      'Core tone keywords: brave, thrilling, witty contrast, brotherhood, hardcore challenge.',
      'Malaysia-facing copy can use friendly Manglish touches such as lah, wei, and walao when they feel natural.',
      'Social copy should be mobile-first: first screen must carry hook plus value before the user taps to read more.',
    ],
    preferences: [
      'Lead with risk, reward, or player tension before explaining the feature.',
      'Use short lines, strong verbs, and a direct player-facing action.',
      'For community posts, ask answerable questions and invite comments instead of writing long announcements.',
      'For developer posts, keep the voice controlled, specific, and easy to track.',
    ],
    avoid: [
      'Avoid grand corporate slogans such as "leading the future of games".',
      'Avoid exaggerated claims such as "the strongest mobile game ever".',
      'Avoid literal Chinese joke translation when it sounds unnatural in English or Malay.',
      'Avoid writing dates, launch timing, or event urgency unless the source explicitly confirms it.',
    ],
    hookSeeds: [
      'Your gear, your pride, all on this run.',
      'No second chances in the dungeon.',
      'Loot first. Joke later. Extract if you can.',
      'Walao, that trap was personal.',
    ],
    visualCues: ['Short caption blocks', 'First-frame risk/reward contrast', 'Player POV lines', 'Comment-friendly prompts'],
    sources: [
      {
        title: 'Tone of Voice',
        relativePath: fp('knowledge/game/brand/tone-of-voice.md'),
        content: [
          'Brand personality: brave, thrilling, witty contrast, brotherhood, hardcore challenge.',
          'Do: emphasize extreme dungeon risk, tension, challenge, and player story moments.',
          'Do not: use political/religious references, discriminatory language, gambling hints, or unsupported "guaranteed" wording.',
          'Malaysia tone: friendly, lively, locally familiar gaming humor; Manglish can improve interaction when natural.',
        ].join('\n'),
      },
      {
        title: 'Mobile Social Copy Guidelines',
        relativePath: fp('knowledge/game/brand/gng-social-copy-mobile-guidelines.md'),
        content: [
          'OM style: hook with conflict/reward/risk, then action verb, then direct CTA.',
          'Official community style: topic, answerable player question, comment prompt.',
          'Developer talk style: what changed, what improves, what comes next.',
          'TikTok first-screen guidance: hook and core value within the first 60-90 characters.',
        ].join('\n'),
      },
    ],
  },
  {
    type: 'brand_compliance',
    title: 'Gold and Glory Compliance',
    summary: 'Hard red lines for public creative: no political/religious harm, gambling implication, unsupported promises, or direct competitor attacks.',
    facts: [
      'Any political stance, political figure, or political event is prohibited.',
      'Religious mockery or negative religious description is prohibited across markets.',
      'TikTok Ads require special care around gambling implication and ad labeling.',
      'Dreamina generation should avoid real people, copyrighted characters, excessive realistic blood, and generated text inside scenes.',
      'Malaysia adds high sensitivity around royalty, race relations, religion, politics, PDPA, and minors.',
    ],
    preferences: [
      'Tie claims to visible footage, known features, or confirmed event mechanics.',
      'Use fantasy-style and stylized descriptors for combat scenes.',
      'Route KOL/live-person content, UGC, pricing promises, and competitor comparisons to human review.',
      'Apply regional safety checks before publishing, especially for SEA/MY religious and cultural context.',
    ],
    avoid: [
      'Do not include political stances, political figures, political events, or religious disrespect.',
      'Do not imply guaranteed rewards, guaranteed drop rates, guaranteed income, or "must win" outcomes.',
      'Do not use direct competitor takedowns or negative competitor claims.',
      'Do not include real-world landmarks, celebrities, politicians, or recognizable copyrighted IP.',
      'Do not use excessive gore, sexualized framing, hate, discrimination, or adult-coded jokes.',
    ],
    hookSeeds: [],
    visualCues: ['Stylized fantasy combat', 'No real-person likeness', 'No generated text in Dreamina scenes', 'No modern landmarks'],
    sources: [
      {
        title: 'Compliance Red Lines',
        relativePath: fp('knowledge/game/brand/compliance.md'),
        content: [
          'Absolute prohibitions: politics, religious offense, excessive gore, sexual implication, gambling inducement, direct competitor attacks.',
          'Needs human review: KOL/live people, UGC, pricing promise, competitor comparison.',
          'Dreamina rejections: real people, copyrighted characters, excessive violence, scenes containing text.',
          'Malaysia local law/culture: PDPA, minors protection, royalty/race/religion/politics sensitivity.',
        ].join('\n'),
      },
      {
        title: 'Regional Safety Guidelines',
        relativePath: fp('knowledge/game/brand/gng-social-copy-mobile-guidelines.md'),
        content: [
          'SEA/MY style should stay community-friendly, clear, and controlled.',
          'Avoid religious disrespect, cultural misuse, exaggerated promises, and aggressive wording.',
          'Avoid unverified promises such as 100% drop, absolute fairness, or no false bans forever.',
        ].join('\n'),
      },
    ],
  },
  {
    type: 'visual_style',
    title: 'Gold and Glory Visual Style',
    summary: 'Dark medieval fantasy with gold/copper framing, dungeon atmosphere, dramatic contrast, and readable mobile-first hierarchy.',
    facts: [
      'World anchors: dark fantasy, medieval, mystery, sacred tree, abyss, dungeon, treasure hunters, pirates, demons, monsters, black market, faction conflict.',
      'Narrative axis: fight for gold, win for glory.',
      'Core palette direction is gold plus dark dungeon tone, supported by leather brown, iron gray, and stone gray.',
      'Prompt positives include medieval fantasy, dungeon atmosphere, dramatic lighting, high contrast, detailed armor/weapons, mystical effects.',
      'Key art levels range from S-level scene plus character plus atmosphere to C-level basic standalone character.',
    ],
    preferences: [
      'Use hero-first framing and make the first three seconds visually legible.',
      'Keep gold/copper decorative frames as accents, not clutter.',
      'Use cinematic lighting, high-contrast chiaroscuro, gritty textures, relic energy, and dungeon expedition cues.',
      'Keep CTA and on-screen text readable on mobile.',
    ],
    avoid: [
      'Avoid modern settings, sci-fi/cyberpunk neon city, bright cheerful pastel, cartoon/kawaii/chibi style.',
      'Avoid blurry, low-resolution, broken anatomy, extra limbs/fingers, watermark, and text artifacts.',
      'Do not invent precise HEX/RGB/CMYK values or font family names when VI source marks them as pending confirmation.',
      'Do not alter, recolor, distort, redraw, or add arbitrary effects to the logo.',
    ],
    hookSeeds: ['Show the relic before explaining the reward.', 'Open on a dungeon threat, then reveal the extraction payoff.'],
    visualCues: [
      'Dark blue-black dungeon base',
      'Gold/copper decorative frames',
      'Cinematic chiaroscuro',
      'Ancient relic glow',
      'Detailed armor and weapons',
      'Mobile-readable CTA',
    ],
    sources: [
      {
        title: 'Visual Style',
        relativePath: fp('knowledge/game/brand/visual-style.md'),
        content: [
          'Visual anchor: dark fantasy, medieval, mystery atmosphere, dungeon expedition, ancient relics, gold and glory.',
          'Positive prompt words: medieval fantasy, dungeon atmosphere, dark blue-black background, gold/copper frames, dramatic lighting, high contrast.',
          'Negative prompt words: modern setting, sci-fi, bright cheerful, cartoon/chibi, low quality, blurry, watermark, real person photo.',
          'Logo rules: use approved master logo, preserve safe area and minimum size, never distort/recolor/redraw.',
        ].join('\n'),
      },
    ],
  },
  {
    type: 'market_fundamentals',
    title: 'Malaysia Market Fundamentals',
    summary: 'Malaysia is a mobile-first, social-video-heavy, multicultural market where GNG should lead with extraction RPG payoff, local humor, and cultural care.',
    facts: [
      'Malaysia estimated population is around 34 million with high smartphone penetration and mobile gaming scale around 20 million players pending confirmation.',
      'Android is the expected primary device environment, roughly 70% Android to 30% iOS.',
      'TikTok, Facebook, YouTube, Instagram, and WhatsApp each matter, with TikTok as the strongest short-video growth channel.',
      'Mobile Legends: Bang Bang is a national-scale attention competitor even outside extraction RPG; Dark and Darker and Dungeonborne define extraction RPG expectations on PC.',
      'GNG opportunity window: mobile extraction RPG is still early, so mobile-first extraction plus local community can differentiate.',
      'Active Malaysia KOC/KOL names currently tracked: ShadowRavenz and CeoGamingAtlantis on YouTube.',
    ],
    preferences: [
      'Frame the product as mobile extraction RPG: loot, survive, outplay, extract.',
      'Use market language around community, competition, food humor, and multicultural resonance when safe.',
      'Prioritize TikTok-native video hooks and YouTube creator explainers for gameplay depth.',
      'Use KOC creators for recurring MY gameplay, patch/season explainers, PvP highlight reels, humor, squad content, and Malaysia-language clips.',
    ],
    avoid: [
      'Avoid overclaiming market size fields that are marked pending confirmation.',
      'Avoid disrespecting Malaysian royalty, religious practice, race relations, or politics.',
      'Avoid assuming Chinese-only, Malay-only, or English-only audience behavior.',
      'Avoid copying MLBB-style hero/MOBA positioning when GNG should own extraction RPG tension.',
    ],
    hookSeeds: [
      'Mobile dungeon extraction, built for quick high-risk runs.',
      'Loot, survive, extract: not another generic fantasy RPG.',
      'Your squad enters for gold. Only the smart ones leave with glory.',
    ],
    visualCues: ['TikTok-first cuts', 'YouTube explainer thumbnails', 'Squad gameplay moments', 'Localized comment prompts'],
    sources: [
      {
        title: 'Malaysia Market Fundamentals',
        relativePath: fp('knowledge/market/my/market-fundamentals.md'),
        content: [
          'Malaysia social ecosystem: Facebook broad reach, TikTok young users and viral spread, YouTube strategy/KOL content, Instagram visual urban youth, WhatsApp private sharing.',
          'Cultural preference: multilingual audience, family/community belonging, local jokes and Manglish, food culture, competitive and social gameplay.',
          'Payment environment includes Touch n Go eWallet, GrabPay, Boost, DuitNow, cards, and app-store IAP.',
          'Important red lines: royalty, race, religion, politics, PDPA, minors protection.',
        ].join('\n'),
      },
      {
        title: 'Competitors',
        relativePath: fp('knowledge/market/my/competitors.md'),
        content: [
          'Direct extraction RPG comparables: Dark and Darker and Dungeonborne on PC.',
          'Attention competitor: Mobile Legends: Bang Bang as a national-scale mobile game.',
          'Lane judgment: extraction mobile is still early and not fully settled.',
          'Defense strategy: deepen localization, build community moat, iterate versions quickly.',
        ].join('\n'),
      },
      {
        title: 'Malaysia KOL/KOC Map',
        relativePath: fp('knowledge/market/my/kol-koc/gng-malaysia-kol-koc-map.md'),
        content: [
          'ShadowRavenz: YouTube current KOC for core gameplay showcase, patch/season explainers, PvP highlights.',
          'CeoGamingAtlantis: YouTube current KOC for community collab, humor/squad content, Malaysia-language gameplay clips.',
          'Suggested view: maintain active relationship and add follower/performance data later.',
        ].join('\n'),
      },
    ],
  },
  {
    type: 'user_persona',
    title: 'Malaysia User Persona',
    summary: 'Primary audience hypothesis: 18-30 mobile players who like action RPG, survival pressure, PvP competition, and social video proof.',
    facts: [
      'Current persona confidence is low and must be treated as a hypothesis until user research upgrades it.',
      'Estimated age core is 18-30, Android-led, with language preference across Malay and English plus separate Chinese-language circles.',
      'Source-game affinity includes Dark and Darker fans, PUBG Mobile, and Free Fire.',
      'Gameplay preference clusters around action RPG, survival, and PvP competition.',
      'D1 churn risk: tutorial too hard/boring or death penalty too strong.',
      'D3-D7 churn risk: gear depletion and unfair matchmaking; D14-D30 risk: stale content or weak social systems.',
    ],
    preferences: [
      'State the audience tension before the CTA: fear of losing gear, pride in outplaying others, excitement of extraction.',
      'Translate hard-core mechanics into simple mass hooks for short video.',
      'For whale/core competitive users, lean into mastery, build, rank, and high-stakes loot.',
      'For free/minnow users, show fair progression, resources, events, social play, and comeback paths.',
    ],
    avoid: [
      'Do not treat low-confidence persona assumptions as verified research.',
      'Do not design only for hardcore PvP; adjacent and mass hooks still matter.',
      'Avoid jargon such as extraction loop without explaining the player payoff.',
    ],
    hookSeeds: [
      'One bad step, your loot is gone.',
      'Enter poor. Extract rich. Or become someone else’s story.',
      'Think you can outplay the dungeon and the squad behind you?',
    ],
    visualCues: ['POV survival tension', 'Gear loss/recovery moments', 'Squad pressure', 'Extraction countdown'],
    sources: [
      {
        title: 'Malaysia User Persona',
        relativePath: fp('knowledge/market/my/user-persona.md'),
        content: [
          'Core user estimate: 18-30, Android-led, action RPG/survival/PvP preference, TikTok/YouTube/Facebook consumption.',
          'Payment layers: whale, dolphin, minnow, free; paid triggers still pending confirmation.',
          'Churn map: D1 onboarding/death penalty, D3-D7 gear depletion/match fairness, D14-D30 content/social fatigue.',
          'Use must disclose low confidence until research validates the persona.',
        ].join('\n'),
      },
    ],
  },
  {
    type: 'live_ops_calendar',
    title: 'Live Ops Calendar',
    summary: 'Event timing should align GNG campaigns to Malaysia and global activity peaks, with Ramadan/Hari Raya, Lunar New Year, and year-end as major windows.',
    facts: [
      'Global high-potential periods include April, late July, and late December.',
      'Malaysia major peaks: Hari Raya Aidilfitri around April W1, Lunar New Year around February W3, and Christmas plus school holiday around December W4.',
      'Malaysia planning must consider Malay Muslim, Chinese, and Indian community festivals: Hari Raya, Lunar New Year, Deepavali.',
      'Ramadan content should avoid disrespectful religious treatment and follow the same sensitivity baseline as Indonesia.',
      'Version feature goals include new-player retention, battle feel improvements, camp/meta systems, hell/challenge modes, pirate map, economy changes, and matchmaking tuning.',
    ],
    preferences: [
      'Tie creative hooks to current event windows only when the date and event are confirmed.',
      'Use school holiday and year-end peaks for broader acquisition and comeback campaigns.',
      'Pair feature releases with corresponding operations: newbie trials for onboarding changes, map exploration for pirate map, challenge rankings for hell/challenge modes.',
      'Keep patriotic or religious holiday creative celebratory and respectful, not political or symbolic-risk heavy.',
    ],
    avoid: [
      'Avoid evergreen messaging when the campaign depends on a limited event window.',
      'Avoid inventing exact dates for date-changing religious holidays.',
      'Avoid using national/royalty/religious symbols as casual fantasy props.',
    ],
    hookSeeds: [
      'Holiday run, higher stakes: enter the dungeon before the event ends.',
      'New map, new route, same question: can you extract?',
      'This event rewards smart hunters, not loud ones.',
    ],
    visualCues: ['Holiday-safe framing', 'Event reward reveals', 'Seasonal but respectful accents', 'Map exploration beats'],
    sources: [
      {
        title: 'Regional Holiday Calendar',
        relativePath: fp('knowledge/live-ops/regional-holiday-calendar.md'),
        content: [
          'Malaysia: Lunar New Year February W3 high peak, Hari Raya Aidilfitri April W1 maximum peak, Christmas plus school holiday December W4 high peak.',
          'MY planning rules: account for Malay Muslim, Chinese, and Indian festivals; Ramadan content follows ID-style religious sensitivity.',
          'Global peaks: April Ramadan/Easter, late July summer, late December Christmas/New Year.',
        ].join('\n'),
      },
      {
        title: 'Version Event Calendar',
        relativePath: fp('knowledge/live-ops/event-calendar.md'),
        content: [
          'Retention feature goals: onboarding improvements, PvP/PvE combat value split, early economy, camp system, airdrop/patrol/hell modes, revive/safe box, pirate map.',
          'Combat feel goals: 3C animation/camera/feel improvements, faster pace and movement.',
          'Recommended operations pairings: newbie guide events, map exploration, challenge/ranking activity, wealth accumulation activity, community matching survey.',
        ].join('\n'),
      },
    ],
  },
  {
    type: 'live_ops_history',
    title: 'Live Ops History',
    summary: 'Past Sword in the Stone evidence supports multi-channel token collection, out-of-match raffle rewards, and region-specific participation tuning.',
    facts: [
      'Sword in the Stone combined in-match mechanism plus key-event exchange shop across ID, MX, and VN.',
      'Active level threshold was 6+, with in-match token acquisition at level 8+.',
      'Overall token acquisition rate was 51.80% across tracked active players.',
      'VN showed the strongest consumption willingness, with the lowest no-consumption ratio at 45.63%.',
      'High-rank players captured a large share of in-match tokens; Glory and Supreme Glory took 46% of in-match Sword in the Stone tokens.',
      'Rewards with broad appeal included gold weapon essence and gold armor essence, while rare items such as Ice Dragon Statue had extremely low acquisition.',
    ],
    preferences: [
      'Reuse token multi-source design: in-match plus shop plus BP.',
      'Use common consumable rewards for broad participation and rare cosmetics for aspiration.',
      'Add lower-rank or low-level acquisition paths when creative targets new or casual users.',
      'Tune region messaging separately when participation/consumption differs by market.',
    ],
    avoid: [
      'Avoid making high-rank-only mechanics the main promise for new users.',
      'Avoid relying on ultra-rare rewards as the only visible campaign payoff.',
      'Avoid applying ID/VN/MX conclusions to Malaysia without labeling the evidence as transferable but not local-validated.',
    ],
    hookSeeds: [
      'Collect tokens in the dungeon, spend them outside, chase the rare drop.',
      'More ways to earn means more reasons to run again.',
      'If low-rank hunters cannot feel progress, the event hook is too narrow.',
    ],
    visualCues: ['Token pickup moments', 'Reward ladder reveal', 'Raffle pull payoff', 'Low-rank progress path'],
    sources: [
      {
        title: 'Sword in the Stone Event History',
        relativePath: fp('knowledge/live-ops/event-history/20260304-sword-in-stone.md'),
        content: [
          'Event type: in-game mechanism plus Key Event exchange shop, targeting ID/MX/VN.',
          'Mechanics: in-match token from enemies/tasks, shop exchange, BP token, out-of-match raffle for cosmetics/materials.',
          'Findings: 51.80% total acquisition rate, VN strongest consumption willingness, high-rank players captured disproportionate in-match tokens.',
          'Reusable elements: token multi-channel framework, raffle plus essence/common rewards plus limited cosmetic rarity ladder.',
        ].join('\n'),
      },
    ],
  },
  {
    type: 'selling_point_playbook',
    title: 'Selling Point Playbook',
    summary: 'Extract conversion triggers, not feature lists: each angle needs internal truth, player/market proof, emotion, differentiation, scale, and risk.',
    facts: [
      'The playbook extracts conversion triggers, not feature lists.',
      'A usable selling point must pass internal truth, player truth, market truth, and differentiation.',
      'If evidence is missing, confidence must be downgraded rather than guessed.',
      'Each selling point needs player outcome plus one emotional trigger: greed, fear, pride, relief, excitement, or social bonding.',
      'Differentiation type must be parity, reframe, or exploit; reframe is the default and exploit is highest priority.',
      'Output must be marketing-usable: one-second scroll hooks, no internal jargon, no vague hype, no fabricated data.',
      'Big-game scaling requires core audience, adjacent audience, mass hooks, and scale potential labeling.',
    ],
    preferences: [
      'Start from player tension plus visible payoff, then name the mechanic only if needed.',
      'Prefer exploit/reframe angles over parity claims when competitor messaging is saturated.',
      'Mark weak claims as directional or internal-only hypothesis.',
      'Translate feature proof into scroll, install, or retention use cases.',
    ],
    avoid: [
      'Do not extract raw features as selling points.',
      'Do not copy competitor positioning or repeated hooks.',
      'Do not use SensorTower/review/market requirements as if completed when evidence has not been gathered.',
      'Do not lead with parity unless the market must hear it and the creative has a stronger second beat.',
    ],
    hookSeeds: [
      'Not just another dungeon. Every step can cost your loot.',
      'The win is not killing the boss. The win is leaving with the gold.',
      'One run, one mistake, one story your squad will not let you forget.',
    ],
    visualCues: ['Proof-first gameplay', 'Tension-to-payoff cut', 'Competitor gap angle', 'One-second scroll headline'],
    sources: [
      {
        title: 'Selling Point Extractor',
        relativePath: fp('knowledge/market/_playbooks/selling-point-extractor.md'),
        content: [
          'Core principle: extract conversion triggers that win in-market, not feature labels.',
          'Selling point layers: internal truth, player truth, market truth, differentiation.',
          'Required fields: player outcome, emotional trigger, feature proof, player/market proof, differentiation type, why we win, conversion use case, scale potential, confidence, risk.',
          'Marketing usability: hooks must pass one-second scroll test, avoid jargon, vague hype, and fabricated data.',
        ].join('\n'),
      },
    ],
  },
];
