"use client"

import {create as createCore, type AnyResources, type CreateOptions} from ".."
import {createClient, type ClientCreateResult} from "../react/client"
import {
	type LocaleSetter,
	type NextLocaleOptions,
	type WithLocaleSetter,
	withLocaleSetter
} from "./locale-client"

export {type LocaleSetter, type NextLocaleOptions} from "./locale-client"

export type NextClientCreateOptions = CreateOptions & NextLocaleOptions

export type NextClientCreateResult<R extends AnyResources> =
	ClientCreateResult<R> & {readonly useSetLocale: () => LocaleSetter}

export type NextClientCreateResultWithoutLocaleSetter<R extends AnyResources> =
	ClientCreateResult<R>

type NextResultFor<
	R extends AnyResources,
	O extends NextClientCreateOptions
> = WithLocaleSetter<ClientCreateResult<R>, O>

export const create = <
	const R extends AnyResources,
	const O extends NextClientCreateOptions = {}
>(
	resources: R,
	options: O = {} as O
): NextResultFor<R, O> =>
	withLocaleSetter(
		createClient(createCore(resources, options)),
		options
	) as NextResultFor<R, O>
