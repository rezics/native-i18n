import {useState} from "react"
import {useTranslation} from "./i18n"

const LOCALES = ["en-US", "zh-Hant", "ja-JP"] as const

export default function App() {
	const [locale, setLocale] = useState<string | undefined>(undefined)
	const {t} = useTranslation(
		["common", "home"],
		locale ? {tags: [locale]} : undefined
	)

	return (
		<div
			style={{
				fontFamily: "sans-serif",
				maxWidth: 480,
				margin: "60px auto",
				padding: "0 16px"
			}}>
			<h1>native-i18n React example</h1>
			<label>
				{t.common.switchLocale}{" "}
				<select
					value={locale ?? ""}
					onChange={e => setLocale(e.target.value || undefined)}>
					<option value="">Auto (browser)</option>
					{LOCALES.map(l => (
						<option key={l} value={l}>
							{l}
						</option>
					))}
				</select>
			</label>
			<div
				style={{
					background: "#f4f4f4",
					borderRadius: 6,
					padding: 20,
					marginTop: 16
				}}>
				<p>
					<strong>{t.home.greeting}</strong>
				</p>
				<p>{t.home.description}</p>
				<p>{t.home.welcome({name: "Alice"})}</p>
				<p>{t.home.itemCount(3)}</p>
				<p>{t.common.farewell}</p>
				<p>
					Items: {t.common.items.apple}, {t.common.items.banana},{" "}
					{t.common.items.cherry}
				</p>
			</div>
		</div>
	)
}
