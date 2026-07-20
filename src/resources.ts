import {matchTag} from "./match"
import {
	materializeData,
	validateData,
	type ContractOf,
	type ExecutionContext,
	type StandardNode
} from "./standard"
import {toDataFunction, type DataFunction} from "./translation"

export type TranslationPrimitive = string | number | boolean | null

export type TranslationValue =
	| TranslationPrimitive
	| StandardNode
	| readonly TranslationValue[]
	| {readonly [key: string]: TranslationValue}

export type NamespaceData = Readonly<Record<string, TranslationValue>>

export type NamespaceLoader<D extends NamespaceData = NamespaceData> = () =>
	| D
	| Promise<D>

type LoaderLike = () => unknown
type LoaderMapLike = Readonly<
	Record<string, Readonly<Record<string, LoaderLike>>>
>

type ValidateLoader<L> = L extends () => infer Value
	? Awaited<Value> extends NamespaceData
		? L
		: never
	: never

type Loaded<L> = L extends () => infer Value ? Awaited<Value> : never

type HasSameContract<A, B> = [ContractOf<Loaded<A>>] extends [
	ContractOf<Loaded<B>>
]
	? [ContractOf<Loaded<B>>] extends [ContractOf<Loaded<A>>]
		? true
		: false
	: false

type ValidateLocaleLoaders<
	L extends Readonly<Record<string, LoaderLike>>,
	Fallback extends Readonly<Record<string, LoaderLike>>
> =
	Exclude<keyof Fallback, keyof L> extends never
		? Exclude<keyof L, keyof Fallback> extends never
			? {
					readonly [Namespace in keyof L]: Namespace extends keyof Fallback
						? HasSameContract<
								L[Namespace],
								Fallback[Namespace]
							> extends true
							? ValidateLoader<L[Namespace]>
							: never
						: never
				}
			: never
		: never

type ValidateLoaderMap<L extends LoaderMapLike, Fallback extends keyof L> = {
	readonly [Locale in keyof L]: ValidateLocaleLoaders<L[Locale], L[Fallback]>
}

export type ResourceDefinition<
	Fallback extends string = string,
	Loaders extends LoaderMapLike = LoaderMapLike
> = {readonly fallbackLocale: Fallback; readonly loaders: Loaders}

export const defineResources = <
	const Fallback extends string,
	const Loaders extends LoaderMapLike
>(
	definition: ResourceDefinition<Fallback, Loaders> &
		(Fallback extends keyof Loaders ? unknown : never) & {
			readonly loaders: ValidateLoaderMap<
				Loaders,
				Extract<Fallback, keyof Loaders>
			>
		}
): ResourceDefinition<Fallback, Loaders> => definition

export type AnyResources = ResourceDefinition<string, LoaderMapLike>

type LoadersOf<R extends AnyResources> = R["loaders"]

export type LocaleOf<R extends AnyResources> = Extract<
	keyof LoadersOf<R>,
	string
>

type FallbackOf<R extends AnyResources> = Extract<
	R["fallbackLocale"],
	LocaleOf<R>
>

type FallbackLoaders<R extends AnyResources> = LoadersOf<R>[FallbackOf<R>]

export type NamespaceOf<R extends AnyResources> = Extract<
	keyof FallbackLoaders<R>,
	string
>

type LoaderOf<
	R extends AnyResources,
	Locale extends LocaleOf<R>,
	Namespace extends NamespaceOf<R>
> = Extract<LoadersOf<R>[Locale][Namespace], LoaderLike>

export type NamespaceSource<
	R extends AnyResources,
	Namespace extends NamespaceOf<R>
> = Awaited<ReturnType<LoaderOf<R, FallbackOf<R>, Namespace>>>

export type NamespaceContract<
	R extends AnyResources,
	Namespace extends NamespaceOf<R>
> = Extract<ContractOf<NamespaceSource<R, Namespace>>, object>

export type NamespaceSelection<R extends AnyResources> =
	| NamespaceOf<R>
	| readonly [NamespaceOf<R>, ...NamespaceOf<R>[]]

type SelectionNames<
	R extends AnyResources,
	Selection extends NamespaceSelection<R>
> = Selection extends readonly (infer Namespace)[]
	? Extract<Namespace, NamespaceOf<R>>
	: Extract<Selection, NamespaceOf<R>>

export type SelectedSource<
	R extends AnyResources,
	Selection extends NamespaceSelection<R>
> =
	Selection extends NamespaceOf<R>
		? NamespaceSource<R, Selection>
		: {
				readonly [Namespace in SelectionNames<
					R,
					Selection
				>]: NamespaceSource<R, Namespace>
			}

export type SelectedContract<
	R extends AnyResources,
	Selection extends NamespaceSelection<R>
> =
	Selection extends NamespaceOf<R>
		? NamespaceContract<R, Selection>
		: {
				readonly [Namespace in SelectionNames<
					R,
					Selection
				>]: NamespaceContract<R, Namespace>
			}

export type LocaleState<Locale extends string = string> = {
	readonly current: Locale
	readonly target: Locale
}

export type TranslationSnapshot<
	R extends AnyResources,
	Selection extends NamespaceSelection<R> = NamespaceSelection<R>
> = {
	readonly locale: LocaleState<LocaleOf<R>>
	readonly namespaces: {
		readonly [Namespace in SelectionNames<R, Selection>]: NamespaceSource<
			R,
			Namespace
		>
	}
	readonly context: ExecutionContext
}

export type TranslationResult<
	R extends AnyResources,
	Selection extends NamespaceSelection<R>
> = {
	readonly data: SelectedContract<R, Selection>
	readonly t: DataFunction<SelectedContract<R, Selection>>
	readonly locale: LocaleState<LocaleOf<R>>
	readonly snapshot: TranslationSnapshot<R, Selection>
}

export type CreateOptions = {
	/** The deterministic time zone used by date/time helpers. Defaults to UTC. */
	readonly timeZone?: string
}

export type CoreCreateResult<R extends AnyResources> = {
	readonly fallbackLocale: LocaleOf<R>
	readonly locales: readonly LocaleOf<R>[]
	readonly matchLocale: (tags: readonly string[]) => LocaleOf<R>
	readonly getTranslation: <const Selection extends NamespaceSelection<R>>(
		selection: Selection,
		tags?: readonly string[]
	) => Promise<TranslationResult<R, Selection>>
	readonly preload: <const Selection extends NamespaceSelection<R>>(
		selection: Selection,
		tags?: readonly string[]
	) => Promise<void>
}

const normalizeSelection = <R extends AnyResources>(
	selection: NamespaceSelection<R>
): NamespaceOf<R>[] => {
	const values = typeof selection === "string" ? [selection] : [...selection]
	return values.filter(
		(namespace, index) => values.indexOf(namespace) === index
	) as NamespaceOf<R>[]
}

const assertResourceShape = (definition: AnyResources): void => {
	const locales = Object.keys(definition.loaders)
	if (!locales.includes(definition.fallbackLocale))
		throw new TypeError(
			`Fallback locale ${JSON.stringify(definition.fallbackLocale)} has no resource loaders.`
		)
	const expected = Object.keys(
		definition.loaders[definition.fallbackLocale] ?? {}
	).sort()
	if (expected.length === 0)
		throw new TypeError("Native I18n requires at least one namespace.")

	for (const locale of locales) {
		const actual = Object.keys(definition.loaders[locale] ?? {}).sort()
		if (
			actual.length !== expected.length ||
			actual.some((namespace, index) => namespace !== expected[index])
		)
			throw new TypeError(
				`Locale ${JSON.stringify(locale)} must define exactly these namespaces: ${expected.join(", ")}.`
			)
		for (const namespace of actual)
			if (typeof definition.loaders[locale]?.[namespace] !== "function")
				throw new TypeError(
					`Resource loader ${JSON.stringify(`${locale}/${namespace}`)} must be a function.`
				)
	}
}

export const createCore = <const R extends AnyResources>(
	definition: R,
	options: CreateOptions = {}
): CoreCreateResult<R> => {
	assertResourceShape(definition)
	const locales = Object.keys(definition.loaders) as LocaleOf<R>[]
	const fallbackLocale = definition.fallbackLocale as LocaleOf<R>
	const raw = new Map<string, Promise<NamespaceData>>()
	const materialized = new Map<
		string,
		Promise<Readonly<Record<string, unknown>>>
	>()
	const timeZone = options.timeZone ?? "UTC"
	const keyFor = (locale: string, namespace: string) =>
		`${locale}\u0000${namespace}`

	const matchLocale = (tags: readonly string[]) =>
		matchTag(locales, fallbackLocale, tags)

	const loadRaw = (
		locale: LocaleOf<R>,
		namespace: NamespaceOf<R>
	): Promise<NamespaceData> => {
		const key = keyFor(locale, namespace)
		const existing = raw.get(key)
		if (existing) return existing
		const loader = definition.loaders[locale]?.[namespace] as
			| NamespaceLoader
			| undefined
		if (!loader)
			return Promise.reject(
				new TypeError(
					`Unknown Native I18n resource ${JSON.stringify(`${locale}/${namespace}`)}.`
				)
			)
		const pending = Promise.resolve()
			.then(loader)
			.then(value => validateData(value) as NamespaceData)
			.catch(error => {
				raw.delete(key)
				materialized.delete(key)
				throw error
			})
		raw.set(key, pending)
		return pending
	}

	const loadMaterialized = (
		locale: LocaleOf<R>,
		namespace: NamespaceOf<R>
	): Promise<Readonly<Record<string, unknown>>> => {
		const key = keyFor(locale, namespace)
		const existing = materialized.get(key)
		if (existing) return existing
		const context = {locale, timeZone}
		const pending = loadRaw(locale, namespace).then(value =>
			materializeData<Readonly<Record<string, unknown>>>(
				value as Readonly<Record<string, unknown>>,
				context
			)
		) as Promise<Readonly<Record<string, unknown>>>
		materialized.set(key, pending)
		return pending
	}

	const getTranslation = async <
		const Selection extends NamespaceSelection<R>
	>(
		selection: Selection,
		tags: readonly string[] = []
	): Promise<TranslationResult<R, Selection>> => {
		const locale = matchLocale(tags)
		const namespaces = normalizeSelection<R>(selection)
		if (namespaces.length === 0)
			throw new TypeError("At least one namespace must be requested.")
		const entries = await Promise.all(
			namespaces.map(async namespace => {
				const [source, data] = await Promise.all([
					loadRaw(locale, namespace),
					loadMaterialized(locale, namespace)
				])
				return {namespace, source, data}
			})
		)
		const sources = Object.fromEntries(
			entries.map(entry => [entry.namespace, entry.source])
		)
		const dataByNamespace = Object.fromEntries(
			entries.map(entry => [entry.namespace, entry.data])
		)
		const data = (
			typeof selection === "string"
				? dataByNamespace[selection]
				: dataByNamespace
		) as SelectedContract<R, Selection>
		const localeState = {current: locale, target: locale} as const
		return {
			data,
			t: toDataFunction(data),
			locale: localeState,
			snapshot: {
				locale: localeState,
				namespaces: sources,
				context: {locale, timeZone}
			} as unknown as TranslationSnapshot<R, Selection>
		}
	}

	return {
		fallbackLocale,
		locales,
		matchLocale,
		getTranslation,
		preload: async (selection, tags) => {
			await getTranslation(selection, tags)
		}
	}
}
