import {cookies, headers} from "next/headers"
import {
	create as _create,
	toTranslationSnapshot,
	type CreateOptions,
	type Data,
	type Translation,
	type ServerTranslationResult,
	type ValidLanguages
} from ".."
import {normalizeLanguageTag, parseAcceptLanguage} from "../locale"
import {toDataFunction} from "../translation"

export type NextCreateOptions = CreateOptions & {
	readonly cookieName?: string | false
}

export type NextCreateResult<
	T extends string,
	D extends Data,
	O extends NextCreateOptions = NextCreateOptions
> = {
	readonly getTranslation: (
		tags?: readonly string[]
	) => Promise<ServerTranslationResult<T, D>>
	readonly getLocaleTags: () => Promise<string[]>
	readonly match: ReturnType<typeof _create<T, D, O>>
}

const defaultCookieName = "NEXT_LOCALE"

export const create = <
	const T extends string,
	const D extends Data,
	const O extends NextCreateOptions = {}
>(
	languages: ValidLanguages<T, D, O>,
	options: O = {} as O
): NextCreateResult<T, D, O> => {
	const match = _create(languages, options)
	const cookieName = options.cookieName ?? defaultCookieName

	const getLocaleTags = async () => {
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
	}

	const getTranslation = async (tags?: readonly string[]) => {
		const result = match([...(tags ?? (await getLocaleTags()))])
		const data = await result
		const translation: Translation<T, D> = {
			data,
			locale: {
				current: result.context.locale as T,
				target: result.locale.target
			}
		}
		const base = {...translation, t: toDataFunction(data)}
		const snapshot = toTranslationSnapshot(translation, result.context)

		return (snapshot
			? {...base, snapshot}
			: base) as unknown as ServerTranslationResult<T, D>
	}

	return {getTranslation, getLocaleTags, match}
}
