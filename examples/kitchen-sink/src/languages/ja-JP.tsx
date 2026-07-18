import type {ReactNode} from "react"
import {
	asValue,
	compact,
	currency,
	date,
	datetime,
	displayName,
	duration,
	insert,
	integer,
	list,
	number,
	ordinal,
	percent,
	plural,
	range,
	relativeTime,
	select,
	time,
	unit,
	unused,
	value
} from "native-i18n"

export default {
	chrome: {
		intro: "標準的なシナリオを、ひとつの実行可能な例に。",
		description:
			"各行が一般的な i18n 機能を示し、選択したロケールで更新されます。",
		locale: "言語",
		auto: "自動（ブラウザ）",
		current: "現在",
		target: "対象",
		messages: "メッセージ",
		numbers: "数値",
		dateTime: "日付と時刻",
		composition: "組み合わせ",
		context: "フォーマットコンテキスト：選択中のロケール · Asia/Shanghai",
		durationUnavailable: "Intl.DurationFormat は利用できません"
	},
	messages: {
		greeting: insert("こんにちは、{{name}}！", {name: String}),
		files: plural({
			"=0": "ファイルはありません",
			"other": insert("{{value}} 個のファイル")
		}),
		position: ordinal({other: insert("第 {{value}} 位")}),
		role: select({admin: "管理者", other: "メンバー"}),
		bucket: range(
			[
				{max: 0, value: "空"},
				{min: 1, max: 9, value: "小"},
				{min: 10, value: "大"}
			],
			"不明"
		),
		summary: insert("{{name}}さんには{{count}}件の{{noun}}があります", {
			noun: plural(
				{other: "メッセージ"},
				{name: String, count: asValue(number())}
			)
		}),
		offset: plural(
			{other: insert("あなたと他 {{pluralValue}} 人がいいねしました")},
			undefined,
			{offset: 1}
		),
		age: insert("{{age}}歳です。", {name: unused(String), age: integer()}),
		docs: insert("実装ノートは{{link}}を参照してください。", {
			link: value<ReactNode>()
		})
	},
	formats: {
		number: number({maximumFractionDigits: 2}),
		integer: integer(),
		currency: currency("EUR"),
		percent: percent({maximumFractionDigits: 1}),
		unit: unit("kilometer-per-hour"),
		compact: compact(),
		date: date({dateStyle: "long"}),
		time: time({timeStyle: "medium"}),
		datetime: datetime({dateStyle: "medium", timeStyle: "short"}),
		relative: relativeTime("day", {numeric: "auto"}),
		duration: duration({style: "long"}),
		list: list({type: "conjunction"}),
		region: displayName("region")
	}
} satisfies typeof import("./en-US").default
