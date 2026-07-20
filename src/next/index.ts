import {cookies, headers} from "next/headers"
import {cache} from "react"
import {
	create as createCore,
	parseAcceptLanguage,
	type AnyResources,
	type CreateOptions,
	type LocaleOf,
	type NamespaceSelection,
	type TranslationResult
} from ".."
import {normalizeLanguageTag} from "../locale"

export type NextCreateOptions = CreateOptions & {
	readonly cookieName?: string | false
}

export type NextCreateResult<R extends AnyResources> = {
	readonly getTranslation: <const Selection extends NamespaceSelection<R>>(
		selection: Selection,
		tags?: readonly string[]
	) => Promise<TranslationResult<R, Selection>>
	readonly getLocaleTags: () => Promise<string[]>
	readonly matchLocale: (tags: readonly string[]) => LocaleOf<R>
	readonly preload: <const Selection extends NamespaceSelection<R>>(
		selection: Selection,
		tags?: readonly string[]
	) => Promise<void>
}

const defaultCookieName = "NEXT_LOCALE"

export const create = <const R extends AnyResources>(
	resources: R,
	options: NextCreateOptions = {}
): NextCreateResult<R> => {
	const core = createCore(resources, options)
	const cookieName = options.cookieName ?? defaultCookieName
	const getLocaleTags = cache(async () => {
		const [cookieStore, headersList] = await Promise.all([
			cookieName === false ? Promise.resolve(undefined) : cookies(),
			headers()
		])
		const cookieLocale =
			cookieName === false
				? undefined
				: normalizeLanguageTag(cookieStore?.get(cookieName)?.value)
		const headerLocales = parseAcceptLanguage(
			headersList.get("accept-language")
		)

		return [cookieLocale, ...headerLocales].filter(
			(locale, index, locales): locale is string =>
				Boolean(locale) && locales.indexOf(locale) === index
		)
	})

	const resolveTags = async (tags?: readonly string[]) =>
		tags ?? (await getLocaleTags())

	return {
		getLocaleTags,
		matchLocale: core.matchLocale,
		getTranslation: async (selection, tags) =>
			core.getTranslation(selection, await resolveTags(tags)),
		preload: async (selection, tags) =>
			core.preload(selection, await resolveTags(tags))
	}
}
