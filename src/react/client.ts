"use client"

import {
	createContext,
	createElement,
	type ReactNode,
	use,
	useCallback,
	useContext,
	useMemo,
	useSyncExternalStore
} from "react"
import {
	hydrate,
	toDataFunction,
	type AnyResources,
	type CoreCreateResult,
	type LocaleOf,
	type LocaleState,
	type NamespaceOf,
	type NamespaceSelection,
	type SelectedContract,
	type TranslationResult,
	type TranslationSnapshot
} from ".."

export {NativeI18nNamespaceError} from "./error"

export type TranslationProviderProps<
	R extends AnyResources,
	Selection extends NamespaceSelection<R> = NamespaceSelection<R>
> = {
	readonly tags?: readonly string[]
	readonly initial?: TranslationSnapshot<R, Selection>
	readonly children?: ReactNode
}

export type UseTranslationOptions = {readonly tags?: readonly string[]}

export type ClientTranslationResult<
	R extends AnyResources,
	Selection extends NamespaceSelection<R>
> = Omit<TranslationResult<R, Selection>, "snapshot">

export type ClientCreateResult<R extends AnyResources> = {
	readonly TranslationProvider: <
		const Selection extends NamespaceSelection<R>
	>(
		props: TranslationProviderProps<R, Selection>
	) => ReactNode
	readonly useTranslation: <const Selection extends NamespaceSelection<R>>(
		selection: Selection,
		options?: UseTranslationOptions
	) => ClientTranslationResult<R, Selection>
	readonly useLocale: () => LocaleState<LocaleOf<R>>
} & {
	readonly preload: <const Selection extends NamespaceSelection<R>>(
		selection: Selection,
		tags?: readonly string[]
	) => Promise<void>
}

type Store = {
	version: number
	readonly entries: Map<string, Readonly<Record<string, unknown>>>
	readonly pending: Map<string, Promise<void>>
	readonly listeners: Set<() => void>
}

type ContextValue<R extends AnyResources> = {
	readonly tags: readonly string[] | undefined
	readonly locale: LocaleState<LocaleOf<R>> | undefined
	readonly seeded: ReadonlyMap<string, Readonly<Record<string, unknown>>>
	readonly store: Store
}

const keyFor = (locale: string, namespace: string) =>
	`${locale}\u0000${namespace}`

const selectionKey = (locale: string, namespaces: readonly string[]) =>
	`${locale}\u0000${namespaces.join("\u0000")}`

const normalizeSelection = <R extends AnyResources>(
	selection: NamespaceSelection<R>
): NamespaceOf<R>[] => {
	const values = typeof selection === "string" ? [selection] : [...selection]
	return values.filter(
		(namespace, index) => values.indexOf(namespace) === index
	) as NamespaceOf<R>[]
}

const createStore = (): Store => ({
	version: 0,
	entries: new Map(),
	pending: new Map(),
	listeners: new Set()
})

const notify = (store: Store) => {
	store.version += 1
	for (const listener of store.listeners) listener()
}

const writeSnapshot = <
	R extends AnyResources,
	Selection extends NamespaceSelection<R>
>(
	store: Store,
	snapshot: TranslationSnapshot<R, Selection>
) => {
	let changed = false
	for (const [namespace, source] of Object.entries(snapshot.namespaces)) {
		const key = keyFor(snapshot.locale.current, namespace)
		if (store.entries.has(key)) continue
		store.entries.set(
			key,
			hydrate(source, snapshot.context) as Readonly<
				Record<string, unknown>
			>
		)
		changed = true
	}
	if (changed) notify(store)
}

const emptyTags: readonly string[] = []
const browserTags = () =>
	typeof navigator === "undefined" ? emptyTags : navigator.languages

export function createClient<R extends AnyResources>(
	core: CoreCreateResult<R>
): ClientCreateResult<R> {
	const TranslationContext = createContext<ContextValue<R> | undefined>(
		undefined
	)
	const clientStore = createStore()

	const resolveTags = (
		tags: readonly string[] | undefined,
		contextTags: readonly string[] | undefined,
		contextLocale?: LocaleState<LocaleOf<R>>
	) =>
		tags ??
		contextTags ??
		(contextLocale ? [contextLocale.current] : browserTags())

	const resolveLocale = (
		tags: readonly string[]
	): LocaleState<LocaleOf<R>> => {
		const locale = core.matchLocale(tags)
		return {current: locale, target: locale}
	}

	const load = <Selection extends NamespaceSelection<R>>(
		store: Store,
		tags: readonly string[],
		selection: Selection
	): Promise<void> => {
		const locale = core.matchLocale(tags)
		const namespaces = normalizeSelection<R>(selection)
		const key = selectionKey(locale, namespaces)
		const active = store.pending.get(key)
		if (active) return active
		const pending = core.getTranslation(selection, tags).then(
			translation => {
				store.pending.delete(key)
				writeSnapshot(store, translation.snapshot)
			},
			error => {
				store.pending.delete(key)
				throw error
			}
		)
		store.pending.set(key, pending)
		return pending
	}

	const TranslationProvider = <
		const Selection extends NamespaceSelection<R>
	>({
		tags,
		initial,
		children
	}: TranslationProviderProps<R, Selection>) => {
		const parent = useContext(TranslationContext)
		const ownStore = useMemo(
			() => (typeof window === "undefined" ? createStore() : clientStore),
			[]
		)
		const store = parent?.store ?? ownStore
		const resolvedTags = tags ?? parent?.tags
		const locale = useMemo(
			() =>
				initial?.locale ??
				resolveLocale(
					resolveTags(resolvedTags, parent?.tags, parent?.locale)
				),
			[initial?.locale, parent?.locale, parent?.tags, resolvedTags]
		)
		const seeded = useMemo(() => {
			const entries = new Map(parent?.seeded)
			if (initial)
				for (const [namespace, source] of Object.entries(
					initial.namespaces
				))
					entries.set(
						keyFor(initial.locale.current, namespace),
						hydrate(source, initial.context) as Readonly<
							Record<string, unknown>
						>
					)
			return entries
		}, [initial, parent?.seeded])
		const value = useMemo(
			() => ({tags: resolvedTags, locale, seeded, store}),
			[locale, resolvedTags, seeded, store]
		)

		return createElement(TranslationContext.Provider, {value}, children)
	}

	const useTranslation = <const Selection extends NamespaceSelection<R>>(
		selection: Selection,
		options: UseTranslationOptions = {}
	): ClientTranslationResult<R, Selection> => {
		const context = useContext(TranslationContext)
		const store = context?.store ?? clientStore
		const tags = useMemo(
			() => resolveTags(options.tags, context?.tags, context?.locale),
			[context?.locale, context?.tags, options.tags]
		)
		const locale = useMemo(
			() => resolveLocale(tags),
			[context?.locale, tags]
		)
		const namespaces = normalizeSelection<R>(selection)
		const key = selectionKey(locale.current, namespaces)
		const subscribe = useCallback(
			(listener: () => void) => {
				store.listeners.add(listener)
				return () => {
					store.listeners.delete(listener)
				}
			},
			[store]
		)
		const getSnapshot = useCallback(() => store.version, [store])
		const version = useSyncExternalStore(
			subscribe,
			getSnapshot,
			getSnapshot
		)
		const missing = namespaces.filter(namespace => {
			const namespaceKey = keyFor(locale.current, namespace)
			return (
				!context?.seeded.has(namespaceKey) &&
				!store.entries.has(namespaceKey)
			)
		})
		if (missing.length > 0) {
			use(load(store, tags, [missing[0]!, ...missing.slice(1)]))
		}

		const data = useMemo(() => {
			const byNamespace = Object.fromEntries(
				namespaces.map(namespace => [
					namespace,
					context?.seeded.get(keyFor(locale.current, namespace)) ??
						store.entries.get(keyFor(locale.current, namespace))!
				])
			)
			return (
				typeof selection === "string"
					? byNamespace[selection]
					: byNamespace
			) as SelectedContract<R, Selection>
		}, [context?.seeded, key, store, version])

		return {data, t: toDataFunction(data), locale}
	}

	const useLocale = () => {
		const context = useContext(TranslationContext)
		const tags = useMemo(
			() => resolveTags(undefined, context?.tags, context?.locale),
			[context?.locale, context?.tags]
		)
		const locale = useMemo(
			() => resolveLocale(tags),
			[context?.locale, tags]
		)
		return locale
	}

	return {
		TranslationProvider,
		useTranslation,
		useLocale,
		preload: (selection, tags) =>
			load(clientStore, resolveTags(tags, undefined), selection)
	}
}
