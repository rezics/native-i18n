import {
	RECIPE_VERSION,
	createStandardFunction,
	describe,
	type AnyFunction,
	type FieldRecipe,
	type Recipe,
	type StandardFunction
} from "./standard"

const valueSymbol: unique symbol = Symbol("native-i18n/value")
const unusedSymbol: unique symbol = Symbol("native-i18n/unused")

export type ValueMarker<T> = {readonly [valueSymbol]: T}
export type UnusedMarker<M> = {readonly [unusedSymbol]: M}

export const value = <T>(): ValueMarker<T> => ({[valueSymbol]: undefined as T})

export const unused = <M extends FieldSpec>(marker: M): UnusedMarker<M> => ({
	[unusedSymbol]: marker
})

type Formatter = StandardFunction<(value: any, ...rest: any[]) => string>
type Constructor =
	| StringConstructor
	| NumberConstructor
	| BooleanConstructor
	| DateConstructor

export type FieldSpec = Constructor | Formatter | ValueMarker<unknown>
type MessageFieldSpec = Exclude<FieldSpec, ValueMarker<unknown>>
type MaybeUnused<M extends FieldSpec = FieldSpec> = M | UnusedMarker<M>

type TrimLeft<S extends string> = S extends ` ${infer R}` ? TrimLeft<R> : S
type TrimRight<S extends string> = S extends `${infer R} ` ? TrimRight<R> : S
type Trim<S extends string> = TrimLeft<TrimRight<S>>

export type Placeholders<S extends string> =
	S extends `${string}{{${infer Name}}}${infer Rest}`
		? Trim<Name> | Placeholders<Rest>
		: never

type UnwrapUnused<S> = S extends UnusedMarker<infer M> ? M : S

type InputOf<S> =
	UnwrapUnused<S> extends ValueMarker<infer T>
		? T
		: UnwrapUnused<S> extends StandardFunction<infer F>
			? Parameters<F>[0]
			: UnwrapUnused<S> extends StringConstructor
				? string
				: UnwrapUnused<S> extends NumberConstructor
					? number
					: UnwrapUnused<S> extends BooleanConstructor
						? boolean
						: UnwrapUnused<S> extends DateConstructor
							? Date | number
							: never

type FieldsInput<F extends Readonly<Record<string, MaybeUnused>>> = {
	-readonly [K in keyof F]: InputOf<F[K]>
}

type ValidateFields<
	Names extends string,
	F extends Readonly<Record<string, MaybeUnused>>
> = F & {
	readonly [K in Names]: K extends keyof F
		? F[K] extends UnusedMarker<any>
			? never
			: F[K]
		: FieldSpec
} & {
	readonly [K in Exclude<keyof F, Names>]: F[K] extends UnusedMarker<any>
		? F[K]
		: never
}

type UsedSpec<
	S extends string,
	F extends Readonly<Record<string, MaybeUnused>>
> = F[Extract<Placeholders<S>, keyof F>]

type RawValueOf<S> = UnwrapUnused<S> extends ValueMarker<infer T> ? T : never

type InsertResult<
	S extends string,
	F extends Readonly<Record<string, MaybeUnused>>
> =
	Extract<UnwrapUnused<UsedSpec<S, F>>, ValueMarker<unknown>> extends never
		? string
		: readonly (string | RawValueOf<UsedSpec<S, F>>)[]

const unwrapUnused = (field: MaybeUnused) =>
	unusedSymbol in Object(field)
		? (field as UnusedMarker<FieldSpec>)[unusedSymbol]
		: field

const toFieldRecipe = (input: MaybeUnused): FieldRecipe => {
	const field = unwrapUnused(input)
	if (valueSymbol in Object(field)) return {kind: "raw"}
	if (field === String) return {kind: "constructor", name: "string"}
	if (field === Number) return {kind: "constructor", name: "number"}
	if (field === Boolean) return {kind: "constructor", name: "boolean"}
	if (field === Date) return {kind: "constructor", name: "date"}
	const recipe = describe(field)
	if (recipe) return {kind: "format", recipe}
	throw new TypeError(
		"An insert field must be a constructor, value(), or Native I18n standard formatter."
	)
}

const toFieldRecipes = (fields: Readonly<Record<string, MaybeUnused>>) =>
	Object.fromEntries(
		Object.entries(fields).map(([name, field]) => [
			name,
			toFieldRecipe(field)
		])
	)

const recipe = <R extends Omit<Recipe, "$nativeI18n" | "version">>(input: R) =>
	({
		$nativeI18n: RECIPE_VERSION,
		version: RECIPE_VERSION,
		...input
	}) as unknown as Recipe

export const insert = <
	const S extends string,
	const F extends Readonly<Record<string, MaybeUnused>>
>(
	template: S,
	fields: ValidateFields<Placeholders<S>, F>
): StandardFunction<(values: FieldsInput<F>) => InsertResult<S, F>> =>
	createStandardFunction(
		recipe({op: "insert", template, fields: toFieldRecipes(fields)})
	)

export const rich: typeof insert = insert

type CaseTemplates<C extends Readonly<Record<string, string>>> = C[keyof C]
type CasePlaceholders<C extends Readonly<Record<string, string>>> =
	CaseTemplates<C> extends infer S
		? S extends string
			? Placeholders<S>
			: never
		: never

type MessageFields = Readonly<Record<string, MaybeUnused<MessageFieldSpec>>>
type ChoiceCases = Readonly<Record<string, string>> & {readonly other: string}
type ChoiceFieldNames<
	C extends Readonly<Record<string, string>>,
	Reserved extends string
> = Exclude<CasePlaceholders<C>, Reserved>
type WithoutChoiceFields<
	C extends Readonly<Record<string, string>>,
	Reserved extends string
> = [ChoiceFieldNames<C, Reserved>] extends [never] ? unknown : never

export type PluralOptions = {readonly offset?: number}

const choice = <F extends MessageFields>(
	op: "plural" | "ordinal" | "select",
	cases: Readonly<Record<string, string>>,
	fields: F | undefined,
	offset?: number
) => {
	const builtInFields: Readonly<Record<string, FieldRecipe>> =
		op === "select"
			? {value: {kind: "constructor", name: "string"}}
			: {
					count: {
						kind: "format",
						recipe: recipe({op: "number", options: {}})
					}
				}

	return createStandardFunction(
		recipe({
			op,
			cases,
			fields: {...builtInFields, ...toFieldRecipes(fields ?? {})},
			...(offset === undefined ? {} : {offset})
		})
	)
}

export function plural<const C extends ChoiceCases>(
	cases: C & WithoutChoiceFields<C, "count">,
	fields?: undefined,
	options?: PluralOptions
): StandardFunction<(input: number) => string>
export function plural<
	const C extends ChoiceCases,
	const F extends MessageFields
>(
	cases: C,
	fields: ValidateFields<ChoiceFieldNames<C, "count">, F>,
	options?: PluralOptions
): StandardFunction<(input: {count: number} & FieldsInput<F>) => string>
export function plural(
	cases: ChoiceCases,
	fields?: MessageFields,
	options?: PluralOptions
): StandardFunction<AnyFunction> {
	return choice("plural", cases, fields, options?.offset)
}

export function ordinal<const C extends ChoiceCases>(
	cases: C & WithoutChoiceFields<C, "count">,
	fields?: undefined,
	options?: PluralOptions
): StandardFunction<(input: number) => string>
export function ordinal<
	const C extends ChoiceCases,
	const F extends MessageFields
>(
	cases: C,
	fields: ValidateFields<ChoiceFieldNames<C, "count">, F>,
	options?: PluralOptions
): StandardFunction<(input: {count: number} & FieldsInput<F>) => string>
export function ordinal(
	cases: ChoiceCases,
	fields?: MessageFields,
	options?: PluralOptions
): StandardFunction<AnyFunction> {
	return choice("ordinal", cases, fields, options?.offset)
}

export function select<const C extends ChoiceCases>(
	cases: C & WithoutChoiceFields<C, "value">
): StandardFunction<(input: string | number) => string>
export function select<
	const C extends ChoiceCases,
	const F extends MessageFields
>(
	cases: C,
	fields: ValidateFields<ChoiceFieldNames<C, "value">, F>
): StandardFunction<
	(input: {value: string | number} & FieldsInput<F>) => string
>
export function select(
	cases: ChoiceCases,
	fields?: MessageFields
): StandardFunction<AnyFunction> {
	return choice("select", cases, fields)
}

export type RangeCase = {
	readonly min?: number
	readonly max?: number
	readonly value: string
}

export const range = (
	cases: readonly RangeCase[],
	other: string
): StandardFunction<(value: number) => string> =>
	createStandardFunction(recipe({op: "range", cases, other}))

type NumberInput = number | bigint
type NumberOptions = Intl.NumberFormatOptions
type NumberFunction = StandardFunction<(value: NumberInput) => string>

export const number = (options: NumberOptions = {}): NumberFunction =>
	createStandardFunction(recipe({op: "number", options}))

export const integer = (
	options: Omit<
		NumberOptions,
		"maximumFractionDigits" | "minimumFractionDigits"
	> = {}
): NumberFunction =>
	createStandardFunction(
		recipe({
			op: "integer",
			options: {
				...options,
				minimumFractionDigits: 0,
				maximumFractionDigits: 0
			}
		})
	)

export const currency = (
	currencyCode: string,
	options: Omit<NumberOptions, "style" | "currency"> = {}
): NumberFunction =>
	createStandardFunction(
		recipe({
			op: "currency",
			argument: currencyCode,
			options: {style: "currency", currency: currencyCode, ...options}
		})
	)

export const percent = (
	options: Omit<NumberOptions, "style"> = {}
): NumberFunction =>
	createStandardFunction(
		recipe({op: "percent", options: {style: "percent", ...options}})
	)

export const unit = (
	unitName: Intl.NumberFormatOptions["unit"],
	options: Omit<NumberOptions, "style" | "unit"> = {}
): NumberFunction =>
	createStandardFunction(
		recipe({
			op: "unit",
			argument: unitName,
			options: {style: "unit", unit: unitName, ...options}
		})
	)

export const compact = (
	options: Omit<NumberOptions, "notation"> = {}
): NumberFunction =>
	createStandardFunction(
		recipe({op: "compact", options: {notation: "compact", ...options}})
	)

type DateInput = Date | number
type DateFunction = StandardFunction<(value: DateInput) => string>

export const date = (
	options: Intl.DateTimeFormatOptions = {dateStyle: "medium"}
): DateFunction => createStandardFunction(recipe({op: "date", options}))

export const time = (
	options: Intl.DateTimeFormatOptions = {timeStyle: "medium"}
): DateFunction => createStandardFunction(recipe({op: "time", options}))

export const datetime = (
	options: Intl.DateTimeFormatOptions = {
		dateStyle: "medium",
		timeStyle: "medium"
	}
): DateFunction => createStandardFunction(recipe({op: "datetime", options}))

export function relativeTime(
	unit: Intl.RelativeTimeFormatUnit,
	options?: Intl.RelativeTimeFormatOptions
): StandardFunction<(value: number) => string>
export function relativeTime(
	options?: Intl.RelativeTimeFormatOptions
): StandardFunction<
	(value: number, unit: Intl.RelativeTimeFormatUnit) => string
>
export function relativeTime(
	unitOrOptions:
		| Intl.RelativeTimeFormatUnit
		| Intl.RelativeTimeFormatOptions = {},
	options: Intl.RelativeTimeFormatOptions = {}
): StandardFunction<(...arguments_: any[]) => string> {
	const fixedUnit =
		typeof unitOrOptions === "string" ? unitOrOptions : undefined
	return createStandardFunction(
		recipe({
			op: "relativeTime",
			options:
				typeof unitOrOptions === "string" ? options : unitOrOptions,
			...(fixedUnit === undefined ? {} : {argument: fixedUnit})
		})
	)
}

export type DurationInput = Readonly<
	Partial<
		Record<
			| "years"
			| "months"
			| "weeks"
			| "days"
			| "hours"
			| "minutes"
			| "seconds"
			| "milliseconds"
			| "microseconds"
			| "nanoseconds",
			number
		>
	>
>

export const duration = (
	options: Readonly<Record<string, unknown>> = {}
): StandardFunction<(value: DurationInput) => string> =>
	createStandardFunction(recipe({op: "duration", options}))

export const list = (
	options: Intl.ListFormatOptions = {}
): StandardFunction<(values: Iterable<string>) => string> =>
	createStandardFunction(recipe({op: "list", options}))

export const displayName = (
	type: Intl.DisplayNamesType,
	options: Omit<Intl.DisplayNamesOptions, "type"> = {}
): StandardFunction<(code: string) => string> =>
	createStandardFunction(
		recipe({op: "displayName", argument: type, options: {type, ...options}})
	)
