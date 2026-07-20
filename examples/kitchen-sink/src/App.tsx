import {useEffect, useState, type ReactNode} from "react"
import {useTranslation} from "./i18n"

const LOCALES = ["en-US", "de-DE", "ja-JP"] as const
const INSTANT = Date.UTC(2025, 4, 20, 14, 30)

type RowProps = {label: string; children: ReactNode}

function Row({label, children}: RowProps) {
	return (
		<div className="example-row">
			<code>{label}</code>
			<div className="example-output">{children}</div>
		</div>
	)
}

function Section({
	number,
	title,
	children
}: {
	number: number
	title: string
	children: ReactNode
}) {
	return (
		<section>
			<h2>
				<span>{number}.</span> {title}
			</h2>
			<div className="rows">{children}</div>
		</section>
	)
}

export default function App() {
	const [selectedLocale, setSelectedLocale] = useState<string>()
	const {t, locale} = useTranslation(
		selectedLocale ? [selectedLocale] : undefined
	)

	useEffect(() => {
		document.documentElement.lang = locale.current
	}, [locale.current])

	const duration = (() => {
		try {
			return t.formats.duration({hours: 1, minutes: 30})
		} catch {
			return t.chrome.durationUnavailable
		}
	})()

	return (
		<main>
			<header>
				<div>
					<h1>Native I18n Kitchen Sink</h1>
					<p className="locale-state">
						{t.chrome.current}: <strong>{locale.current}</strong>
						<span aria-hidden="true">·</span>
						{t.chrome.target}: <strong>{locale.target}</strong>
					</p>
				</div>
				<label className="locale-control">
					<span>{t.chrome.locale}</span>
					<select
						value={selectedLocale ?? ""}
						onChange={event =>
							setSelectedLocale(event.target.value || undefined)
						}>
						<option value="">{t.chrome.auto}</option>
						{LOCALES.map(tag => (
							<option key={tag}>{tag}</option>
						))}
					</select>
				</label>
			</header>

			<div className="intro">
				<h2>{t.chrome.intro}</h2>
				<p>{t.chrome.description}</p>
			</div>

			<div className="columns">
				<div>
					<Section number={1} title={t.chrome.messages}>
						<Row
							label={
								'insert("Hello, {{name}}!", {name: String})'
							}>
							{t.messages.greeting({name: "Ada"})}
						</Row>
						<Row label={'plural({"=0", one, other}) → 0'}>
							{t.messages.files(0)}
						</Row>
						<Row label={"plural({one, other}) → 1200"}>
							{t.messages.files(1200)}
						</Row>
						<Row label={"ordinal({one, two, few, other}) → 22"}>
							{t.messages.position(22)}
						</Row>
						<Row label={'select({admin, other}) → "guest"'}>
							{t.messages.role("guest")}
						</Row>
						<Row
							label={
								"range([{max: 0}, {min: 1, max: 9}, …]) → 4"
							}>
							{t.messages.bucket(4)}
						</Row>
						<Row label={"insert(…, {noun: plural(…)})"}>
							{t.messages.summary({name: "Ada", count: 2})}
						</Row>
						<Row label={"plural(…, {offset: 1}) → 3"}>
							{t.messages.offset(3)}
						</Row>
						<Row label={"unused(String)"}>
							{t.messages.age({name: "Ada", age: 37})}
						</Row>
						<Row label={"value<ReactNode>()"}>
							{t.messages.docs({
								link: (
									<a
										key="readme"
										href="https://github.com/rezics/native-i18n">
										README
									</a>
								)
							})}
						</Row>
					</Section>

					<Section number={2} title={t.chrome.numbers}>
						<Row label={"number({maximumFractionDigits: 2})"}>
							{t.formats.number(12345.678)}
						</Row>
						<Row label={"integer()"}>
							{t.formats.integer(12345.678)}
						</Row>
						<Row label={'currency("EUR")'}>
							{t.formats.currency(1234.56)}
						</Row>
						<Row label={"percent() → 0.1234"}>
							{t.formats.percent(0.1234)}
						</Row>
						<Row label={'unit("kilometer-per-hour")'}>
							{t.formats.unit(42)}
						</Row>
						<Row label={"compact()"}>
							{t.formats.compact(1234567)}
						</Row>
					</Section>
				</div>

				<div>
					<Section number={3} title={t.chrome.dateTime}>
						<Row label={'date({dateStyle: "long"})'}>
							{t.formats.date(INSTANT)}
						</Row>
						<Row label={'time({timeStyle: "medium"})'}>
							{t.formats.time(INSTANT)}
						</Row>
						<Row label={"datetime({dateStyle, timeStyle})"}>
							{t.formats.datetime(INSTANT)}
						</Row>
						<Row label={'relativeTime("day", {numeric: "auto"})'}>
							{t.formats.relative(-1)}
						</Row>
						<Row label={'duration({style: "long"})'}>
							{duration}
						</Row>
					</Section>

					<Section number={4} title={t.chrome.composition}>
						<Row label={'list({type: "conjunction"})'}>
							{t.formats.list(["Ada", "Lin", "Kai"])}
						</Row>
						<Row label={'displayName("region") → "DE"'}>
							{t.formats.region("DE")}
						</Row>
					</Section>
				</div>
			</div>

			<footer>{t.chrome.context}</footer>
		</main>
	)
}
