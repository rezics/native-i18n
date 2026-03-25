type AnyRecord = Record<any, any>

type Is<T, A, N> = T extends N ? false : T extends A ? true : false

export type Leaves<T, N = never> =
	true extends Is<T, AnyRecord, Function | N>
		? {
				[K in keyof T]: K extends `$${string}`
					? `${K}`
					: `${Exclude<K, symbol>}${Leaves<T[K], N> extends never ? "" : `.${Leaves<T[K], N>}`}`
			}[keyof T]
		: never

export type FromLeaves<
	T,
	L extends Leaves<T, N>,
	N = never
> = L extends `${infer Key}.${infer Rest}`
	? Key extends keyof T
		? Rest extends Leaves<T[Key], N>
			? FromLeaves<T[Key], Rest, N>
			: never
		: never
	: L extends keyof T
		? T[L]
		: never
