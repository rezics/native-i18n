import {matchTag} from "./match"
import {
	materializeData,
	tryDehydrate,
	type ContractOf,
	type ExecutionContext,
	type HasCustomFunction,
	type SnapshotData
} from "./standard"
import {type DataFunction} from "./translation"

export {parseAcceptLanguage} from "./locale"
export {
	compact,
	currency,
	date,
	datetime,
	displayName,
	duration,
	insert,
	integer,
	list,
	number,
	ordinal,
	percent,
	plural,
	range,
	relativeTime,
	rich,
	select,
	time,
	unit,
	unused,
	value,
	type DurationInput,
	type FieldSpec,
	type Placeholders,
	type PluralOptions,
	type RangeCase,
	type UnusedMarker,
	type ValueMarker
} from "./functions"
export {
	createIntl,
	isStandardFunction,
	type ContractOf,
	type ExecutionContext,
	type StandardFunction
} from "./standard"

export type Data = {[K in string]: any}

export interface CreateOptions {
	/** The deterministic time zone used by date/time helpers. Defaults to UTC. */
	readonly timeZone?: string
	/**
	 * @deprecated Custom functions cannot cross a React Server Components boundary
	 * and cannot be represented by a translation snapshot. Prefer Native I18n's standard
	 * message and Intl helpers.
	 */
	readonly allowCustomFunctions?: true
}

export interface Language<
	T extends string,
	D extends Data,
	L extends boolean = true
> {
	readonly tag: T
	readonly data: L extends false ? D : D | (() => Promise<D>) | (() => D)
}

export type Languages<T extends string, D extends Data> = readonly [
	Language<T, D, false>,
	...(readonly Language<T, NoInfer<D>>[])
]

export type ValidLanguages<
	T extends string,
	D extends Data,
	O extends CreateOptions
> = Languages<T, D> &
	(true extends HasCustomFunction<D>
		? O extends {readonly allowCustomFunctions: true}
			? unknown
			: never
		: unknown)

export type Locale<T extends string> = {readonly current: T; readonly target: T}

export type Translation<T extends string, D extends Data> = {
	readonly data: ContractOf<D>
	readonly locale: Locale<T>
}

export type TranslationSnapshot<T extends string, D extends Data> = {
	readonly data: SnapshotData<D>
	readonly locale: Locale<T>
	readonly context: ExecutionContext
}

type SnapshotResult<T extends string, D extends Data> =
	true extends HasCustomFunction<D>
		? {readonly snapshot?: never}
		: {readonly snapshot: TranslationSnapshot<T, D>}

export type TranslationResult<T extends string, D extends Data> = Translation<
	T,
	D
> & {readonly t: DataFunction<ContractOf<D>>}

export type ServerTranslationResult<
	T extends string,
	D extends Data
> = TranslationResult<T, D> & SnapshotResult<T, D>

export const toTranslationSnapshot = <T extends string, D extends Data>(
	translation: Translation<T, D>,
	context: ExecutionContext
): TranslationSnapshot<T, D> | undefined => {
	const data = tryDehydrate(translation.data)
	return data === undefined
		? undefined
		: {data: data as SnapshotData<D>, locale: translation.locale, context}
}

export const create = <
	const T extends string,
	const D extends Data,
	const O extends CreateOptions = {}
>(
	languages: ValidLanguages<T, D, O>,
	options?: O
) => {
	const timeZone = options?.timeZone ?? "UTC"
	const allowCustomFunctions = options?.allowCustomFunctions === true
	const fallbackLanguage = languages[0]
	const fallback = materializeData(
		fallbackLanguage.data,
		{locale: fallbackLanguage.tag, timeZone},
		{allowCustomFunctions}
	)

	return (tags: string[]): DataPromise<T, ContractOf<D>> => {
		const target = matchTag(languages, tags)
		const locale = {current: fallbackLanguage.tag, target} as const
		const selected = languages.find(({tag}) => tag === target)!
		const context = {locale: selected.tag, timeZone}

		return new DataPromise(locale, fallback, context, (resolve, reject) => {
			try {
				const loaded =
					selected.data instanceof Function
						? selected.data()
						: selected.data
				resolve(
					Promise.resolve(loaded as D).then(data =>
						materializeData<D>(data, context, {
							allowCustomFunctions
						})
					)
				)
			} catch (error) {
				reject(error)
			}
		})
	}
}

export class DataPromise<T extends string, F extends Data> extends Promise<F> {
	static override get [Symbol.species]() {
		return Promise
	}

	get tag() {
		return this.locale.target
	}

	constructor(
		public readonly locale: Locale<T>,
		public readonly fallback: F,
		public readonly context: ExecutionContext,
		executor: (
			resolve: (value: F | PromiseLike<F>) => void,
			reject: (reason?: any) => void
		) => void
	) {
		super(executor)
	}
}
