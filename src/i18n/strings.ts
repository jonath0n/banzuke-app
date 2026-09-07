/**
 * UI strings in both languages. Wrestler data carries its own translations;
 * this table covers everything else the interface says.
 *
 * `jp` is typed as `Strings` (derived from `en`), so a missing key is a type
 * error, and `strings.test.ts` checks the two tables stay in step.
 */
import type { CareerStep } from '../data/profiles'
import type { GuideKey } from '../utils/guide'
import type { Division, Language, Side } from '../types/banzuke'

const en = {
  appTitle: 'Grand Sumo Banzuke',
  skipLink: 'Skip to the banzuke',
  scrollToTop: 'Scroll to top',
  languageGroup: 'Language selection',

  // Hero
  announcedOn: (date: string) => `Banzuke announced ${date}`,
  statusLive: (day: number) => `Day ${day}`,
  statusSenshuraku: 'Senshuraku · Day 15',
  statusUpcomingTomorrow: 'Starts tomorrow',
  statusUpcoming: (days: number) => `Starts in ${days} days`,
  statusCompleted: 'Completed',
  dataFrom: 'Data from sumo.or.jp',
  checked: (relative: string) => `checked ${relative}`,
  sampleData: 'Bundled sample data',
  division: { makuuchi: 'Makuuchi', juryo: 'Juryo' } satisfies Record<Division, string>,
  divisionGroup: 'Division',

  // View
  viewGroup: 'Layout',
  viewSheet: 'Sheet',
  viewList: 'List',
  sheetLabel: 'The banzuke as printed: East on the right, West on the left, ranked by size.',

  // Changes since the previous banzuke
  changes: 'Changes',
  changesSince: (basho: string) => `Changes since ${basho}`,
  changesUnavailable: 'The previous banzuke could not be loaded.',
  movementNew: 'New',
  movementToEast: 'W→E',
  movementToWest: 'E→W',
  since: (basho: string) => `since ${basho}`,
  departedHeading: (division: string, basho: string) => `Left ${division} since ${basho}`,
  departedMovedTo: (division: string) => `Now in ${division}`,
  departedGone: 'No longer on the sheet',
  departedWas: (rank: string) => `was ${rank}`,
  departedNow: (rank: string) => `now ${rank}`,
  departedNone: 'Nobody left.',

  // Tournament results
  results: 'Results',
  resultsThrough: (day: number) => `Results through day ${day}`,
  kachikoshi: 'Kachi-koshi',
  makekoshi: 'Make-koshi',
  yusho: 'Yusho',
  record: 'Record',
  boutsHeading: (day: number) => `Day ${day}`,
  boutsNone: 'The card for this day has not been published.',
  previousDay: 'Previous day',
  nextDay: 'Next day',
  leadersAfter: (day: number) => `Leaders after day ${day}`,
  undecided: 'Not yet fought',
  boutAgainst: (opponent: string) => `vs ${opponent}`,
  absentDay: 'Absent',
  fusenWin: 'Forfeit win',
  fusenLoss: 'Forfeit loss',

  // How to read a banzuke
  guideTitle: 'How to read a banzuke',
  guideOpen: 'How to read a banzuke',
  guideClose: 'Hide the guide',
  guideIntro:
    'A banzuke is the ranking sheet the Japan Sumo Association publishes before each of the six tournaments a year. Every wrestler in the top two divisions is on it, and the sheet itself tells you their standing: how large the name is, which half it is on, and where along the band it sits.',
  guideItem: {
    size: 'Rank is written in size. The highest ranks are printed largest and the names shrink down the sheet; on the real banzuke the lowest divisions are so small they are barely legible.',
    east: 'East is on the right and West on the left, because the sheet is read right to left. At the same rank, East is the slightly higher position.',
    tier: 'The band of heavy characters at the top of each column is the rank: 横綱 Yokozuna, 大関 Ozeki, 関脇 Sekiwake, 小結 Komusubi, 前頭 Maegashira, 十両 Juryo. The printed sheet writes only the tier, because the position along the band already says which Maegashira this is.',
    numeral:
      'The small numeral beneath the tier is added here, because a screen has no fixed sheet to count along: 十七 is Maegashira 17.',
    origin:
      'Between the rank and the name is the wrestler’s home: a prefecture, or a country for wrestlers born abroad.',
    name: 'The ring name, the shikona, reads top to bottom. A wrestler takes one on joining a stable, and it often shares a character with the stablemaster or the stable’s tradition.',
    gold: 'The gold rule at the head of a column marks a Yokozuna, the one rank this sheet gives a colour of its own.',
    changes:
      'With Changes on, the small mark under a name is the rank the wrestler held on the previous banzuke: ▲ for a rise, ▼ for a fall, New for a newcomer to the division.',
    results:
      'With Results on during a tournament, the score under each name is wins and losses so far. Eight wins is kachi-koshi, a winning record; a hairline 優 marks the champion.',
  } satisfies Record<GuideKey, string>,

  // Search
  searchPlaceholder: 'Search wrestlers, stables, regions, or ranks…',
  searchLabel: 'Search wrestlers',
  searchClear: 'Clear search',
  showAll: 'Show all wrestlers',
  showMatchesIn: (count: number, division: string) => `Show ${count} in ${division}`,
  searchCount: (matched: number, total: number) => `${matched} of ${total} wrestlers`,
  noMatches: (query: string) => `Nothing on the sheet for “${query}”.`,
  noMatchesHint:
    'Try a ring name, stable, region, or a rank like "M5" or "ozeki", in either language.',
  noData: 'No rikishi available right now.',
  noDataHint: 'Check back when the next banzuke is announced.',
  loading: 'Loading the banzuke…',

  // Grid and modal
  side: { east: 'East', west: 'West' } satisfies Record<Side, string>,
  viewDetails: 'View details',
  closeDetails: 'Close wrestler details',
  nameMeaning: 'Name',
  rank: 'Rank',
  sideLabel: 'Side',
  stable: 'Stable',
  from: 'From',
  status: 'Status',
  copyLink: 'Copy link',
  linkCopied: 'Link copied',
  officialProfile: 'Official profile',
  previousWrestler: (name: string) => `Previous: ${name}`,
  nextWrestler: (name: string) => `Next: ${name}`,
  realName: 'Real name',
  born: 'Born',
  age: (years: number) => `(${years})`,
  height: 'Height',
  weight: 'Weight',
  kimarite: 'Signature moves',
  highestRank: 'Highest rank',
  career: 'Career',
  milestone: {
    debut: 'Debut',
    juryo: 'Juryo',
    makuuchi: 'Makuuchi',
    sanyaku: 'Sanyaku',
    ozeki: 'Ozeki',
    yokozuna: 'Yokozuna',
  } satisfies Record<CareerStep, string>,

  // Data problems
  errorSample: 'Live data unavailable. Showing bundled sample data.',
  errorStale: 'Could not refresh the banzuke. Showing the last saved copy.',
  errorNone: 'Could not load the banzuke. Please check your connection and refresh to try again.',

  // Shortcuts
  shortcuts: 'Keyboard shortcuts',
  shortcutSearch: 'Focus the search box',
  shortcutLanguage: 'Switch language',
  shortcutEscape: 'Close the dialog or clear the search',
  shortcutHelp: 'Show or hide this help',
  shortcutArrows: 'Move between wrestlers; ← → in the dialog',

  // Footer
  footerMadeBy: 'Made by',
  footerDataSource: 'Data:',
  footerJsa: 'Japan Sumo Association',
  footerType: 'Type:',
  footerFontBy: 'by',
  footerDisclaimer:
    'This is an unofficial fan project and is not affiliated with the Japan Sumo Association.',
  footerRights: (year: number) => `© ${year} Jon Allen. All Rights Reserved.`,
}

export type Strings = typeof en

const jp: Strings = {
  appTitle: '大相撲 番付表',
  skipLink: '番付表へ移動',
  scrollToTop: 'ページの先頭へ',
  languageGroup: '言語の選択',

  announcedOn: (date: string) => `番付発表 ${date}`,
  statusLive: (day: number) => `${day}日目`,
  statusSenshuraku: '千秋楽',
  statusUpcomingTomorrow: '明日初日',
  statusUpcoming: (days: number) => `初日まであと${days}日`,
  statusCompleted: '終了',
  dataFrom: 'データ提供: 日本相撲協会',
  checked: (relative: string) => `${relative}に確認`,
  sampleData: 'サンプルデータを表示中',
  division: { makuuchi: '幕内', juryo: '十両' },
  divisionGroup: '階級',

  viewGroup: '表示',
  viewSheet: '番付表',
  viewList: '一覧',
  sheetLabel: '実際の番付の形式。右が東、左が西、番付順に字が大きくなります。',

  changes: '変動',
  changesSince: (basho: string) => `${basho}からの変動`,
  changesUnavailable: '前回の番付を読み込めませんでした。',
  movementNew: '新',
  movementToEast: '西→東',
  movementToWest: '東→西',
  since: (basho: string) => `${basho}から`,
  departedHeading: (division: string, basho: string) => `${basho}から${division}を離れた力士`,
  departedMovedTo: (division: string) => `${division}へ`,
  departedGone: '番付外へ',
  departedWas: (rank: string) => `旧 ${rank}`,
  departedNow: (rank: string) => `現 ${rank}`,
  departedNone: '該当なし',

  results: '星取',
  resultsThrough: (day: number) => `${day}日目までの星取`,
  kachikoshi: '勝ち越し',
  makekoshi: '負け越し',
  yusho: '優勝',
  record: '星取',
  boutsHeading: (day: number) => `${day}日目`,
  boutsNone: 'この日の取組はまだ発表されていません。',
  previousDay: '前日',
  nextDay: '翌日',
  leadersAfter: (day: number) => `${day}日目終了時の首位`,
  undecided: '未了',
  boutAgainst: (opponent: string) => `対 ${opponent}`,
  absentDay: '休場',
  fusenWin: '不戦勝',
  fusenLoss: '不戦敗',

  guideTitle: '番付の読み方',
  guideOpen: '番付の読み方',
  guideClose: '読み方を閉じる',
  guideIntro:
    '番付は、年六回の本場所ごとに日本相撲協会が発表する力士の序列表です。字の大きさ、東西、そして段の中の位置が、そのまま力士の地位を表します。',
  guideItem: {
    size: '地位は字の大きさで表されます。上位ほど大きく、下に行くほど小さくなり、実際の番付では下位の力士の名は虫眼鏡が要るほどの細字になります。',
    east: '右が東、左が西。番付は右から左へ読み、同じ地位では東がわずかに上位です。',
    tier: '各列の上にある太い文字が地位です（横綱・大関・関脇・小結・前頭・十両）。実際の番付には枚数は書かれず、段の中の位置で何枚目かがわかります。',
    numeral:
      '地位の下の小さな数字はこのサイトが添えたものです。画面では位置を数えにくいため、十七なら前頭十七枚目と読めるようにしています。',
    origin: '地位と四股名の間には出身地が入ります。都道府県、外国出身の力士なら国名です。',
    name: '四股名は上から下へ読みます。入門時に師匠や部屋の伝統にちなんだ字を受け継ぐことが多く、部屋ごとの字が見て取れます。',
    gold: '列の頭の金の線は横綱の印です。この番付表でただひとつ色を持つ地位です。',
    changes:
      '「変動」をつけると、四股名の下に前の番付での地位が出ます。▲は昇進、▼は降格、新は新入幕・新十両です。',
    results:
      '場所中に「星取」をつけると、四股名の下にこれまでの勝敗が出ます。八勝で勝ち越し、優の印は優勝力士です。',
  },

  searchPlaceholder: '四股名・部屋・出身地・番付で検索…',
  searchLabel: '力士を検索',
  searchClear: '検索をクリア',
  showAll: 'すべての力士を表示',
  showMatchesIn: (count: number, division: string) => `${division}の${count}人を表示`,
  searchCount: (matched: number, total: number) => `${total}人中 ${matched}人`,
  noMatches: (query: string) => `「${query}」に該当する力士はいません。`,
  noMatchesHint: '四股名、部屋、出身地、または「前頭五」「大関」などの番付で検索できます。',
  noData: '現在表示できる力士がいません。',
  noDataHint: '次の番付発表をお待ちください。',
  loading: '番付表を読み込み中…',

  side: { east: '東', west: '西' },
  viewDetails: '詳細を見る',
  closeDetails: '力士の詳細を閉じる',
  nameMeaning: '四股名の字',
  rank: '番付',
  sideLabel: '東西',
  stable: '部屋',
  from: '出身地',
  status: '備考',
  copyLink: 'リンクをコピー',
  linkCopied: 'コピーしました',
  officialProfile: '公式プロフィール',
  previousWrestler: (name: string) => `前へ: ${name}`,
  nextWrestler: (name: string) => `次へ: ${name}`,
  realName: '本名',
  born: '生年月日',
  age: (years: number) => `（${years}歳）`,
  height: '身長',
  weight: '体重',
  kimarite: '得意技',
  highestRank: '最高位',
  career: '昇進の歩み',
  milestone: {
    debut: '初土俵',
    juryo: '新十両',
    makuuchi: '新入幕',
    sanyaku: '新三役',
    ozeki: '大関昇進',
    yokozuna: '横綱昇進',
  },

  errorSample: '最新データを取得できないため、サンプルデータを表示しています。',
  errorStale: '最新データを取得できないため、保存済みの番付を表示しています。',
  errorNone: '番付を読み込めませんでした。接続を確認して再読み込みしてください。',

  shortcuts: 'キーボードショートカット',
  shortcutSearch: '検索欄にフォーカス',
  shortcutLanguage: '言語を切り替え',
  shortcutEscape: 'ダイアログを閉じる / 検索をクリア',
  shortcutHelp: 'このヘルプの表示・非表示',
  shortcutArrows: '力士の間を移動（ダイアログ内は ← →）',

  footerMadeBy: '制作:',
  footerDataSource: 'データ提供:',
  footerJsa: '日本相撲協会',
  footerType: '書体:',
  footerFontBy: '作',
  footerDisclaimer: '本サイトは非公式のファンプロジェクトであり、日本相撲協会とは関係ありません。',
  footerRights: (year: number) => `© ${year} Jon Allen. All Rights Reserved.`,
}

export const STRINGS: Record<Language, Strings> = { en, jp }

/** Language attribute for markup in the given UI language. */
export function langAttr(language: Language): 'en' | 'ja' {
  return language === 'jp' ? 'ja' : 'en'
}
