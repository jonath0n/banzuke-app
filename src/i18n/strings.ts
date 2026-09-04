/**
 * UI strings in both languages. Wrestler data carries its own translations;
 * this table covers everything else the interface says.
 *
 * `jp` is typed as `Strings` (derived from `en`), so a missing key is a type
 * error, and `strings.test.ts` checks the two tables stay in step.
 */
import type { CareerStep } from '../data/profiles'
import type { Division, Language, Side } from '../types/banzuke'

const en = {
  appTitle: 'Grand Sumo Banzuke',
  skipLink: 'Skip to the banzuke',
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
  rank: 'Rank',
  sideLabel: 'Side',
  stable: 'Stable',
  from: 'From',
  status: 'Status',
  copyLink: 'Copy link',
  linkCopied: 'Link copied',
  officialProfile: 'Official profile',
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
  rank: '番付',
  sideLabel: '東西',
  stable: '部屋',
  from: '出身地',
  status: '備考',
  copyLink: 'リンクをコピー',
  linkCopied: 'コピーしました',
  officialProfile: '公式プロフィール',
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
