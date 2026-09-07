/**
 * What the characters in a ring name mean. A shikona is built from a small
 * vocabulary — mountains, seas, dragons, the stable's own character — and an
 * English reader who knows that 山 is a mountain and 琴 marks the Sadogatake
 * stable reads the sheet differently. Hand-curated: every character that has
 * appeared in Makuuchi or Juryo since the archive begins (2025-11), plus the
 * two-character units that read as one word. Meanings are the character's
 * general sense, not an etymology of the particular name.
 *
 * Coverage is checked against the test fixtures only. New wrestlers bring new
 * characters; `npm run glossary-gaps` lists them (the deploy job runs it as a
 * warning), and the dialog shows a bare character until it is added here.
 */
export interface Gloss {
  en: string
  /** A stable's mark, a reading, or a piece of context worth a line. */
  note?: string
}

export const COMPOUNDS: Record<string, Gloss> = {
  富士: { en: 'Mount Fuji' },
  千代: {
    en: 'a thousand generations; forever',
    note: 'the Kokonoe stable’s mark, from Chiyonoyama, who founded it',
  },
  出羽: { en: 'Dewa, an old province in the north-west', note: 'the Dewanoumi stable’s mark' },
  日向: { en: 'Hyuga, an old province in Kyushu' },
  御嶽: { en: 'Mount Ontake' },
  熱海: { en: 'Atami, a hot-spring town' },
  湘南: { en: 'Shonan, the Kanagawa coast' },
  平戸: { en: 'Hirado, an island town in Nagasaki' },
  疾風: { en: 'a gale; hayate' },
  不動: { en: 'immovable' },
  凌駕: { en: 'to surpass' },
  阿武: {
    en: 'Abu, a district in Yamaguchi; read O- in the stable name Onomatsu',
    note: 'the Onomatsu stable’s mark',
  },
  佐田: { en: 'Sada, a place and family name' },
}

export const GLOSSARY: Record<string, Gloss> = {
  // Joining kana
  の: {
    en: 'of',
    note: 'the kana that links the parts of a name, as in Onosato, “Great Village”',
  },
  ノ: { en: 'of', note: 'the katakana form of the joining kana' },
  乃: { en: 'of', note: 'a classical character read no, used as “of”' },
  之: { en: 'of', note: 'a classical character read no, used as “of”' },
  // Numbers and size
  一: { en: 'one' },
  三: { en: 'three' },
  千: { en: 'thousand' },
  大: { en: 'great' },
  高: { en: 'high; tall' },
  // Land and water
  山: { en: 'mountain' },
  峰: { en: 'peak' },
  嶽: { en: 'high mountain; peak' },
  島: { en: 'island' },
  川: { en: 'river' },
  海: { en: 'sea' },
  津: { en: 'harbour' },
  田: { en: 'rice field' },
  里: { en: 'village; home' },
  戸: { en: 'door; household' },
  平: { en: 'flat; peaceful' },
  湘: { en: 'the character of Shonan' },
  熱: { en: 'heat' },
  出: { en: 'to emerge; to set out' },
  // Sky and weather
  天: { en: 'heaven; sky' },
  日: { en: 'sun; day' },
  旭: { en: 'the rising sun', note: 'the Ōshima stable’s mark, from its founder Asahikuni' },
  陽: { en: 'sunlight' },
  晴: { en: 'clear sky' },
  明: { en: 'bright; clear' },
  雲: { en: 'cloud' },
  雷: { en: 'thunder' },
  電: { en: 'lightning' },
  霧: { en: 'mist' },
  嵐: { en: 'storm' },
  風: { en: 'wind' },
  疾: { en: 'swift' },
  炎: { en: 'flame' },
  // Seasons and time
  春: { en: 'spring' },
  時: { en: 'time', note: 'the Tokitsukaze stable’s mark' },
  代: { en: 'generation; era' },
  元: { en: 'origin; source' },
  本: { en: 'origin; root' },
  // Colours and materials
  白: { en: 'white' },
  青: { en: 'blue-green' },
  紅: { en: 'crimson' },
  紫: { en: 'purple' },
  翠: { en: 'jade green' },
  丹: { en: 'red; cinnabar' },
  金: { en: 'gold' },
  玉: { en: 'jewel', note: 'the Kataonami stable’s mark' },
  錦: { en: 'brocade' },
  // Plants
  木: { en: 'tree' },
  花: { en: 'flower' },
  桜: { en: 'cherry blossom' },
  櫻: { en: 'cherry blossom (the older form)' },
  藤: { en: 'wisteria' },
  栃: { en: 'horse chestnut', note: 'the Kasugano stable’s mark, from Tochigiyama' },
  荒: { en: 'wild; rough' },
  // Creatures
  龍: { en: 'dragon' },
  竜: { en: 'dragon (the simpler form)' },
  鵬: { en: 'the peng, a vast mythical bird', note: 'the character of both Taiho and Hakuho' },
  鳳: { en: 'phoenix' },
  鷲: { en: 'eagle' },
  鷹: { en: 'hawk' },
  翔: { en: 'to soar' },
  羽: { en: 'feather; wing' },
  馬: { en: 'horse' },
  狼: { en: 'wolf' },
  熊: { en: 'bear' },
  猿: { en: 'monkey' },
  獅: { en: 'lion' },
  // Strength, virtue, fortune
  勝: { en: 'victory' },
  剋: { en: 'to overcome' },
  凌: { en: 'to endure; to surpass' },
  駕: { en: 'to surpass; a carriage' },
  武: { en: 'martial' },
  剣: { en: 'sword' },
  豪: { en: 'strong; magnificent' },
  雄: { en: 'hero; bold' },
  隆: { en: 'to rise; prosperity' },
  昇: { en: 'to ascend' },
  輝: { en: 'radiance' },
  栄: { en: 'to flourish; glory' },
  豊: { en: 'abundant' },
  富: { en: 'wealth; abundance' },
  寿: { en: 'long life; felicity' },
  嘉: { en: 'auspicious' },
  安: { en: 'peace; calm' },
  正: { en: 'correct; righteous' },
  義: { en: 'righteousness' },
  賢: { en: 'wise' },
  篤: { en: 'sincere; kind' },
  志: { en: 'will; aspiration' },
  意: { en: 'intention; mind' },
  尊: { en: 'revered; noble' },
  雅: { en: 'elegance' },
  美: { en: 'beauty', note: 'read chura in Churanoumi, Okinawan for beautiful' },
  良: { en: 'good' },
  英: { en: 'excellence' },
  景: { en: 'view; scene' },
  友: { en: 'friend' },
  御: { en: 'honourable (a prefix)' },
  伯: { en: 'elder; chief; also Hōki, an old province in Tottori' },
  王: { en: 'king' },
  司: { en: 'to govern; an official' },
  士: { en: 'warrior; gentleman' },
  生: { en: 'life; to be born' },
  治: { en: 'to govern; to heal' },
  動: { en: 'to move' },
  不: { en: 'not' },
  向: { en: 'to face toward' },
  目: { en: 'eye' },
  丸: { en: 'circle; a name ending for ships and boys' },
  佐: { en: 'to assist' },
  央: { en: 'centre' },
  宇: { en: 'the heavens; a roof' },
  若: { en: 'young' },
  朝: { en: 'morning', note: 'the Takasago stable’s mark' },
  琴: { en: 'koto, the zither', note: 'the Sadogatake stable’s mark' },
  欧: { en: 'Europe', note: 'the Naruto stable’s mark, from its master Kotooshu' },
  阿: { en: 'a nook; often just a sound, as in Abi' },
  // Directions
  東: { en: 'east' },
  西: { en: 'west' },
  南: { en: 'south' },
  北: { en: 'north' },
}

export interface NameSegment {
  text: string
  gloss: Gloss | null
}

/**
 * Splits a ring name into the units it is read in: a two-character compound
 * where one is known at the position, otherwise one character at a time.
 * Characters the glossary lacks come back with a null gloss, so the dialog can
 * still show them.
 */
export function explainShikona(jp: string): NameSegment[] {
  const chars = [...jp]
  const segments: NameSegment[] = []
  for (let i = 0; i < chars.length;) {
    const pair = chars[i] + (chars[i + 1] ?? '')
    if (chars[i + 1] !== undefined && COMPOUNDS[pair]) {
      segments.push({ text: pair, gloss: COMPOUNDS[pair] })
      i += 2
      continue
    }
    segments.push({ text: chars[i], gloss: GLOSSARY[chars[i]] ?? null })
    i += 1
  }
  return segments
}

/** Characters in `names` with no single-character entry, once each, sorted by code point. */
export function glossaryGaps(names: Iterable<string>): string[] {
  const missing = new Set<string>()
  for (const name of names) {
    for (const ch of name) {
      if (!GLOSSARY[ch] && !/\s/.test(ch)) missing.add(ch)
    }
  }
  return [...missing].sort((a, b) => a.codePointAt(0)! - b.codePointAt(0)!)
}
