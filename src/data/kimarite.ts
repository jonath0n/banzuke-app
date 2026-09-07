/**
 * The eighty-two kimarite (winning techniques) the JSA recognises, in its six
 * groups, plus the five non-technique decisions, the foul and the forfeit.
 * Keys are sumo-api.com's romaji, which is what the results carry; the
 * Japanese is what the hoshitori and the bout list print.
 */
import type { Language } from '../types/banzuke'

export const KIMARITE: Record<string, { jp: string; en: string }> = {
  // 基本技 — basic techniques
  tsukidashi: { jp: '突き出し', en: 'frontal thrust out' },
  tsukitaoshi: { jp: '突き倒し', en: 'frontal thrust down' },
  oshidashi: { jp: '押し出し', en: 'frontal push out' },
  oshitaoshi: { jp: '押し倒し', en: 'frontal push down' },
  yorikiri: { jp: '寄り切り', en: 'frontal force out' },
  yoritaoshi: { jp: '寄り倒し', en: 'frontal crush out' },
  abisetaoshi: { jp: '浴せ倒し', en: 'backward force down' },
  // 投げ手 — throws
  uwatenage: { jp: '上手投げ', en: 'overarm throw' },
  shitatenage: { jp: '下手投げ', en: 'underarm throw' },
  kotenage: { jp: '小手投げ', en: 'armlock throw' },
  sukuinage: { jp: '掬い投げ', en: 'beltless arm throw' },
  uwatedashinage: { jp: '上手出し投げ', en: 'pulling overarm throw' },
  shitatedashinage: { jp: '下手出し投げ', en: 'pulling underarm throw' },
  koshinage: { jp: '腰投げ', en: 'hip throw' },
  kubinage: { jp: '首投げ', en: 'headlock throw' },
  ipponzeoi: { jp: '一本背負い', en: 'one-armed shoulder throw' },
  nichonage: { jp: '二丁投げ', en: 'body drop throw' },
  yaguranage: { jp: '櫓投げ', en: 'inner thigh throw' },
  kakenage: { jp: '掛け投げ', en: 'hooking inner thigh throw' },
  tsukaminage: { jp: '掴み投げ', en: 'lifting throw' },
  // 掛け手 — leg trips
  uchigake: { jp: '内掛け', en: 'inside leg trip' },
  sotogake: { jp: '外掛け', en: 'outside leg trip' },
  chongake: { jp: 'ちょん掛け', en: 'pulling heel hook' },
  kirikaeshi: { jp: '切り返し', en: 'twisting backward knee trip' },
  kawazugake: { jp: '河津掛け', en: 'hooking backward counter throw' },
  kekaeshi: { jp: '蹴返し', en: 'minor inner foot sweep' },
  ketaguri: { jp: '蹴手繰り', en: 'pulling inside ankle sweep' },
  mitokorozeme: { jp: '三所攻め', en: 'triple attack force out' },
  watashikomi: { jp: '渡し込み', en: 'thigh grabbing push down' },
  nimaigeri: { jp: '二枚蹴り', en: 'ankle kicking twist down' },
  komatasukui: { jp: '小股掬い', en: 'over thigh scooping body drop' },
  sotokomata: { jp: '外小股', en: 'under thigh scooping body drop' },
  omata: { jp: '大股', en: 'thigh scooping body drop' },
  tsumatori: { jp: '褄取り', en: 'rear foot sweep' },
  kozumatori: { jp: '小褄取り', en: 'ankle pick' },
  ashitori: { jp: '足取り', en: 'leg pick' },
  susotori: { jp: '裾取り', en: 'ankle pick' },
  susoharai: { jp: '裾払い', en: 'rear foot sweep' },
  // 反り手 — backward body drops
  izori: { jp: '居反り', en: 'backward body drop' },
  shumokuzori: { jp: '撞木反り', en: 'bell hammer backward body drop' },
  kakezori: { jp: '掛け反り', en: 'hooking backward body drop' },
  tasukizori: { jp: 'たすき反り', en: 'reverse backward body drop' },
  sototasukizori: { jp: '外たすき反り', en: 'outer reverse backward body drop' },
  tsutaezori: { jp: '伝え反り', en: 'underarm forward body drop' },
  // 捻り手 — twist downs
  tsukiotoshi: { jp: '突き落とし', en: 'thrust down' },
  makiotoshi: { jp: '巻き落とし', en: 'twist down' },
  tottari: { jp: 'とったり', en: 'arm bar throw' },
  sakatottari: { jp: '逆とったり', en: 'arm bar throw counter' },
  katasukashi: { jp: '肩透かし', en: 'under shoulder swing down' },
  sotomuso: { jp: '外無双', en: 'outer thigh propping twist down' },
  uchimuso: { jp: '内無双', en: 'inner thigh propping twist down' },
  zubuneri: { jp: '頭捻り', en: 'head pivot throw' },
  uwatehineri: { jp: '上手捻り', en: 'twisting overarm throw' },
  shitatehineri: { jp: '下手捻り', en: 'twisting underarm throw' },
  amiuchi: { jp: '網打ち', en: 'fisherman’s throw' },
  sabaori: { jp: '鯖折り', en: 'forward force down' },
  harimanage: { jp: '波離間投げ', en: 'backward belt throw' },
  osakate: { jp: '大逆手', en: 'backward twisting overarm throw' },
  kainahineri: { jp: '腕捻り', en: 'two-handed arm twist down' },
  gasshohineri: { jp: '合掌捻り', en: 'clasped hand twist down' },
  tokkurinage: { jp: '徳利投げ', en: 'two-handed head twist down' },
  kubihineri: { jp: '首捻り', en: 'head twisting throw' },
  kotehineri: { jp: '小手捻り', en: 'armlock twist down' },
  // 特殊技 — special techniques
  hikiotoshi: { jp: '引き落とし', en: 'hand pull down' },
  hikkake: { jp: '引っ掛け', en: 'arm grabbing force out' },
  hatakikomi: { jp: '叩き込み', en: 'slap down' },
  sokubiotoshi: { jp: '素首落とし', en: 'head chop down' },
  tsuridashi: { jp: '吊り出し', en: 'lift out' },
  okuritsuridashi: { jp: '送り吊り出し', en: 'rear lift out' },
  tsuriotoshi: { jp: '吊り落とし', en: 'lifting body slam' },
  okuritsuriotoshi: { jp: '送り吊り落とし', en: 'rear lifting body slam' },
  okuridashi: { jp: '送り出し', en: 'rear push out' },
  okuritaoshi: { jp: '送り倒し', en: 'rear push down' },
  okurinage: { jp: '送り投げ', en: 'rear throw down' },
  okurigake: { jp: '送り掛け', en: 'rear leg trip' },
  okurihikiotoshi: { jp: '送り引き落とし', en: 'rear pull down' },
  waridashi: { jp: '割り出し', en: 'upper arm force out' },
  utchari: { jp: 'うっちゃり', en: 'backward pivot throw' },
  kimedashi: { jp: '極め出し', en: 'arm barring force out' },
  kimetaoshi: { jp: '極め倒し', en: 'arm barring force down' },
  ushiromotare: { jp: '後ろもたれ', en: 'backward lean out' },
  yobimodoshi: { jp: '呼び戻し', en: 'pulling body slam' },
  // 非技 — non-techniques, and the two decisions that are not techniques at all
  isamiashi: { jp: '勇み足', en: 'forward step out' },
  koshikudake: { jp: '腰砕け', en: 'inadvertent collapse' },
  tsukite: { jp: 'つき手', en: 'hand touch down' },
  tsukihiza: { jp: 'つきひざ', en: 'knee touch down' },
  fumidashi: { jp: '踏み出し', en: 'rear step out' },
  hansoku: { jp: '反則', en: 'foul' },
  fusen: { jp: '不戦', en: 'forfeit' },
}

/** Kanji in Japanese, romaji in English; unknown keys pass through. */
export function kimariteLabel(key: string, language: Language): string {
  if (language === 'jp') return KIMARITE[key]?.jp ?? key
  return key
}

export function kimariteGloss(key: string): string | null {
  return KIMARITE[key]?.en ?? null
}
