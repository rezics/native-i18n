import {
	create as createCore,
	type AnyResources,
	type CreateOptions,
	type LocaleOf,
	type NamespaceSelection,
	type TranslationResult
} from ".."

export type ServerCreateResult<R extends AnyResources> = {
	readonly getTranslation: <const Selection extends NamespaceSelection<R>>(
		selection: Selection,
		tags: readonly string[]
	) => Promise<TranslationResult<R, Selection>>
	readonly matchLocale: (tags: readonly string[]) => LocaleOf<R>
	readonly preload: <const Selection extends NamespaceSelection<R>>(
		selection: Selection,
		tags: readonly string[]
	) => Promise<void>
}

export const create = <const R extends AnyResources>(
	resources: R,
	options?: CreateOptions
): ServerCreateResult<R> => {
	const core = createCore(resources, options)

	return {
		getTranslation: (selection, tags) =>
			core.getTranslation(selection, tags),
		matchLocale: core.matchLocale,
		preload: (selection, tags) => core.preload(selection, tags)
	}
}
