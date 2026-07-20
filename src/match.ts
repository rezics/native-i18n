import {match as _match} from "@formatjs/intl-localematcher"
import {normalizeLanguageTag} from "./locale"

export const matchTag = <const T extends string>(
	availableLocales: readonly T[],
	fallbackLocale: T,
	tags: readonly string[]
): T => {
	const normalizedTags = tags
		.map(normalizeLanguageTag)
		.filter((tag): tag is string => Boolean(tag))

	return _match(normalizedTags, availableLocales, fallbackLocale, {
		algorithm: "best fit"
	}) as T
}
