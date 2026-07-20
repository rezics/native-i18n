"use client"

import {create as createCore, type AnyResources, type CreateOptions} from ".."
import {createClient, type ClientCreateResult} from "./client"
import {
	createSeededClient,
	type SeededClientCreateResult
} from "./seeded-client"

export function create<const R extends AnyResources>(
	resources: R,
	options?: CreateOptions
): ClientCreateResult<R>
export function create<R extends AnyResources>(): SeededClientCreateResult<R>
export function create<R extends AnyResources>(
	resources?: R,
	options?: CreateOptions
): ClientCreateResult<R> | SeededClientCreateResult<R> {
	if (resources) return createClient(createCore(resources, options))
	return createSeededClient<R>()
}
