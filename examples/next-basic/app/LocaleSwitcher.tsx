"use client"

import {useSetLocale, useTranslation} from "./i18n/client"

const locales = ["en-US", "zh-Hant", "ja-JP"] as const

export function LocaleSwitcher() {
	const {t, locale} = useTranslation(["common", "widget"])
	const {isPending, setLocale} = useSetLocale()

	return (
		<section>
			<p>{t.widget.loaded}</p>
			<label style={{display: "grid", gap: 6, maxWidth: 220}}>
				<span>{t.common.switchLocale}</span>
				<select
					disabled={isPending}
					value={locale.target}
					onChange={event => setLocale(event.currentTarget.value)}>
					{locales.map(locale => (
						<option key={locale} value={locale}>
							{locale}
						</option>
					))}
				</select>
			</label>
		</section>
	)
}
