"use client"

export {
	NativeI18nNamespaceError,
	type ClientCreateResult,
	type ClientTranslationResult,
	type TranslationProviderProps,
	type UseTranslationOptions
} from "./client"
export {create} from "./factory"
export {
	type SeededClientCreateResult,
	type SeededClientTranslationResult,
	type SeededTranslationProviderProps
} from "./seeded-client"
export {
	type LocaleState,
	type NamespaceSelection,
	type TranslationSnapshot
} from ".."
