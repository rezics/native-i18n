"use client"

import {
	createContext,
	createElement,
	type ReactNode,
	useContext,
	useMemo
} from "react"
import {
	type AnyResources,
	type LocaleOf,
	type LocaleState,
	type NamespaceOf,
	type NamespaceSelection,
	type SelectedContract,
	type TranslationBundleFactory,
	type TranslationSnapshot
} from "../resources"
import {defineTranslationBundle} from "../resources"
import {hydrate} from "../standard"
import {toDataFunction, type DataFunction} from "../translation"
import {NativeI18nNamespaceError} from "./error"

export type SeededTranslationProviderProps<
	R extends AnyResources,
	Selection extends NamespaceSelection<R> = NamespaceSelection<R>
> = {
	readonly initial?: TranslationSnapshot<R, Selection>
	readonly children?: ReactNode
}

export type SeededClientTranslationResult<
	R extends AnyResources,
	Selection extends NamespaceSelection<R>
> = {
	readonly data: SelectedContract<R, Selection>
	readonly t: DataFunction<SelectedContract<R, Selection>>
	readonly locale: LocaleState<LocaleOf<R>>
}

export type SeededClientCreateResult<R extends AnyResources> = {
	readonly defineTranslationBundle: TranslationBundleFactory<R>
	readonly TranslationProvider: <
		const Selection extends NamespaceSelection<R>
	>(
		props: SeededTranslationProviderProps<R, Selection>
	) => ReactNode
	readonly useTranslation: <const Selection extends NamespaceSelection<R>>(
		selection: Selection
	) => SeededClientTranslationResult<R, Selection>
	readonly useLocale: () => LocaleState<LocaleOf<R>>
}

type Entry = Readonly<Record<string, unknown>>

type ContextValue<R extends AnyResources> = {
	readonly entries: ReadonlyMap<string, Entry>
	readonly locale: LocaleState<LocaleOf<R>> | undefined
}

const keyFor = (locale: string, namespace: string) =>
	`${locale}\u0000${namespace}`

const normalizeSelection = <R extends AnyResources>(
	selection: NamespaceSelection<R>
): NamespaceOf<R>[] => {
	const values = typeof selection === "string" ? [selection] : [...selection]
	return values.filter(
		(namespace, index) => values.indexOf(namespace) === index
	) as NamespaceOf<R>[]
}

export const createSeededClient = <
	R extends AnyResources
>(): SeededClientCreateResult<R> => {
	const TranslationContext = createContext<ContextValue<R> | undefined>(
		undefined
	)

	const TranslationProvider = <
		const Selection extends NamespaceSelection<R>
	>({
		initial,
		children
	}: SeededTranslationProviderProps<R, Selection>) => {
		const parent = useContext(TranslationContext)
		const locale = initial?.locale ?? parent?.locale
		const entries = useMemo(() => {
			const next = new Map(parent?.entries)
			if (initial)
				for (const [namespace, source] of Object.entries(
					initial.namespaces
				))
					next.set(
						keyFor(initial.locale.current, namespace),
						hydrate(source, initial.context) as Entry
					)
			return next
		}, [initial, parent?.entries])
		const value = useMemo(() => ({entries, locale}), [entries, locale])

		return createElement(TranslationContext.Provider, {value}, children)
	}

	const useTranslation = <const Selection extends NamespaceSelection<R>>(
		selection: Selection
	): SeededClientTranslationResult<R, Selection> => {
		const context = useContext(TranslationContext)
		if (!context?.locale)
			throw new NativeI18nNamespaceError(
				"useTranslation requires a TranslationProvider with an initial snapshot."
			)
		const {entries, locale} = context
		const namespaces = normalizeSelection<R>(selection)
		const missing = namespaces.filter(
			namespace => !entries.has(keyFor(locale.current, namespace))
		)
		if (missing.length > 0)
			throw new NativeI18nNamespaceError(
				`TranslationProvider has not seeded namespace${missing.length === 1 ? "" : "s"} ${missing.map(namespace => JSON.stringify(namespace)).join(", ")} for locale ${JSON.stringify(locale.current)}.`
			)
		const data = useMemo(() => {
			const byNamespace = Object.fromEntries(
				namespaces.map(namespace => [
					namespace,
					entries.get(keyFor(locale.current, namespace))!
				])
			)
			return (
				typeof selection === "string"
					? byNamespace[selection]
					: byNamespace
			) as SelectedContract<R, Selection>
		}, [entries, locale.current, selection])

		return {data, t: toDataFunction(data), locale}
	}

	const useLocale = () => {
		const locale = useContext(TranslationContext)?.locale
		if (!locale)
			throw new NativeI18nNamespaceError(
				"useLocale requires a TranslationProvider with an initial snapshot."
			)
		return locale
	}

	return {
		defineTranslationBundle: defineTranslationBundle<R>(),
		TranslationProvider,
		useTranslation,
		useLocale
	}
}
