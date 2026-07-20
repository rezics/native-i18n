"use client"

import {useCallback, useTransition} from "react"
import {useRouter} from "next/navigation"
import {
	createSeededClient,
	type SeededClientCreateResult
} from "../react/seeded-client"
import {type AnyResources} from ".."
import {normalizeLanguageTag} from "../locale"

export type NextClientCreateOptions = {
	readonly cookieName?: string | false
	readonly cookieMaxAge?: number
	readonly cookiePath?: string
	readonly cookieSameSite?: "lax" | "strict" | "none"
	readonly cookieSecure?: boolean
}

export type LocaleSetter = {
	readonly isPending: boolean
	readonly setLocale: (locale?: string | null) => void
}

type NextClientCreateResultBase<R extends AnyResources> =
	SeededClientCreateResult<R>

export type NextClientCreateResult<R extends AnyResources> =
	NextClientCreateResultBase<R> & {readonly useSetLocale: () => LocaleSetter}

export type NextClientCreateResultWithoutLocaleSetter<R extends AnyResources> =
	NextClientCreateResultBase<R>

type NextResultFor<
	R extends AnyResources,
	O extends NextClientCreateOptions
> = O extends {readonly cookieName: false}
	? NextClientCreateResultWithoutLocaleSetter<R>
	: "cookieName" extends keyof O
		? false extends O["cookieName"]
			?
					| NextClientCreateResultWithoutLocaleSetter<R>
					| NextClientCreateResult<R>
			: NextClientCreateResult<R>
		: NextClientCreateResult<R>

const defaultCookieName = "NEXT_LOCALE"
const defaultCookieMaxAge = 60 * 60 * 24 * 365
const defaultCookiePath = "/"

export const create = <
	R extends AnyResources,
	const O extends NextClientCreateOptions = {}
>(
	options: O = {} as O
): NextResultFor<R, O> => {
	const react = createSeededClient<R>()
	const cookieName = options.cookieName ?? defaultCookieName
	const base: NextClientCreateResultBase<R> = {
		TranslationProvider: react.TranslationProvider,
		useTranslation: react.useTranslation,
		useLocale: react.useLocale
	}

	if (cookieName === false) return base as unknown as NextResultFor<R, O>

	const useSetLocale = (): LocaleSetter => {
		const router = useRouter()
		const [isPending, startTransition] = useTransition()
		const setLocale = useCallback(
			(locale?: string | null) => {
				const target = locale ? normalizeLanguageTag(locale) : locale
				if (locale && !target) return
				document.cookie = serializeCookie(cookieName, target, options)
				if (typeof window === "undefined") {
					router.refresh()
					return
				}
				startTransition(() => {
					router.refresh()
				})
			},
			[cookieName, options, router, startTransition]
		)

		return {isPending, setLocale}
	}

	return {...base, useSetLocale} as unknown as NextResultFor<R, O>
}

const serializeCookie = (
	name: string,
	value: string | null | undefined,
	options: NextClientCreateOptions
) => {
	const secure =
		options.cookieSecure ??
		(typeof location !== "undefined" && location.protocol === "https:")
	const sameSite =
		options.cookieSameSite === "none" && !secure
			? "lax"
			: (options.cookieSameSite ?? "lax")
	const parts = [
		`${encodeURIComponent(name)}=${encodeURIComponent(value ?? "")}`,
		`Path=${options.cookiePath ?? defaultCookiePath}`,
		`Max-Age=${value ? (options.cookieMaxAge ?? defaultCookieMaxAge) : 0}`,
		`SameSite=${sameSite}`
	]

	if (secure) parts.push("Secure")

	return parts.join("; ")
}
