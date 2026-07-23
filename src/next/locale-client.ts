"use client"

import {useCallback, useTransition} from "react"
import {useRouter} from "next/navigation"
import {normalizeLanguageTag} from "../locale"

export type NextLocaleOptions = {
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

type LocaleSetterResult = {readonly useSetLocale: () => LocaleSetter}

export type WithLocaleSetter<Base, O extends NextLocaleOptions> = O extends {
	readonly cookieName: false
}
	? Base
	: "cookieName" extends keyof O
		? false extends O["cookieName"]
			? Base | (Base & LocaleSetterResult)
			: Base & LocaleSetterResult
		: Base & LocaleSetterResult

const defaultCookieName = "NEXT_LOCALE"
const defaultCookieMaxAge = 60 * 60 * 24 * 365
const defaultCookiePath = "/"

export const withLocaleSetter = <
	Base extends object,
	const O extends NextLocaleOptions
>(
	base: Base,
	options: O
): WithLocaleSetter<Base, O> => {
	const cookieName = options.cookieName ?? defaultCookieName

	if (cookieName === false)
		return base as unknown as WithLocaleSetter<Base, O>

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

	return {...base, useSetLocale} as WithLocaleSetter<Base, O>
}

const serializeCookie = (
	name: string,
	value: string | null | undefined,
	options: NextLocaleOptions
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
