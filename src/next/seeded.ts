"use client"

import {type AnyResources} from ".."
import {
	createSeededClient,
	type SeededClientCreateResult
} from "../react/seeded-client"
import {
	type LocaleSetter,
	type NextLocaleOptions,
	type WithLocaleSetter,
	withLocaleSetter
} from "./locale-client"

export {NativeI18nNamespaceError} from "../react/error"
export {type LocaleSetter, type NextLocaleOptions} from "./locale-client"

export type NextSeededClientCreateOptions = NextLocaleOptions

export type NextSeededClientCreateResult<R extends AnyResources> =
	SeededClientCreateResult<R> & {readonly useSetLocale: () => LocaleSetter}

export type NextSeededClientCreateResultWithoutLocaleSetter<
	R extends AnyResources
> = SeededClientCreateResult<R>

type NextSeededResultFor<
	R extends AnyResources,
	O extends NextSeededClientCreateOptions
> = WithLocaleSetter<SeededClientCreateResult<R>, O>

export const create = <
	R extends AnyResources,
	const O extends NextSeededClientCreateOptions = {}
>(
	options: O = {} as O
): NextSeededResultFor<R, O> =>
	withLocaleSetter(createSeededClient<R>(), options) as NextSeededResultFor<
		R,
		O
	>
