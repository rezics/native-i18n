import {type PatternVariables} from "./pattern"
import {
	RECIPE_VERSION,
	createStandardFunction,
	describe,
	isMessageRecipe,
	type AnyFunction,
	type BindingRecipe,
	type FieldRecipe,
	type FormatterFunction,
	type MessageFunction,
	type MessageRecipe,
	type Recipe
} from "./standard"

const valueSymbol: unique symbol = Symbol("native-i18n/value")
const unusedSymbol: unique symbol = Symbol("native-i18n/unused")
const asValueSymbol: unique symbol = Symbol("native-i18n/as-value")

export type ValueMarker<T> = {readonly [valueSymbol]: T}
export type UnusedMarker<M> = {readonly [unusedSymbol]: M}
export type AsValueMarker<M> = {readonly [asValueSymbol]: M}

export const value = <T>(): ValueMarker<T> => ({[valueSymbol]: undefined as T})

export const unused = <M extends FieldSpec>(marker: M): UnusedMarker<M> => ({
	[unusedSymbol]: marker
})

/** Marks a named parameter as the semantic selector of a choice node. */
export const asValue = <M extends MessageFieldSpec>(
	marker: M
): AsValueMarker<M> => ({[asValueSymbol]: marker})

type Formatter = FormatterFunction<(value: any, ...rest: any[]) => string>
type Constructor =
	| StringConstructor
	| NumberConstructor
	| BooleanConstructor
	| DateConstructor

export type FieldSpec = Constructor | Formatter | ValueMarker<unknown>
type MessageFieldSpec = Exclude<FieldSpec, ValueMarker<unknown>>
type MaybeUnused<M extends FieldSpec = FieldSpec> = M | UnusedMarker<M>
type ParameterSpec =
	| MaybeUnused<MessageFieldSpec>
	| AsValueMarker<MessageFieldSpec>
type ParameterMap = Readonly<Record<string, ParameterSpec>>
type AnyMessage = MessageFunction<AnyFunction, any, any, any>
type MessageInput = string | AnyMessage

export type Placeholders<S extends string> = PatternVariables<S>

type UnwrapUnused<S> = S extends UnusedMarker<infer M> ? M : S
type UnwrapValue<S> =
	UnwrapUnused<S> extends AsValueMarker<infer M> ? M : UnwrapUnused<S>

type InputOf<S> =
	UnwrapValue<S> extends ValueMarker<infer T>
		? T
		: UnwrapValue<S> extends FormatterFunction<infer F>
			? Parameters<F>[0]
			: UnwrapValue<S> extends StringConstructor
				? string
				: UnwrapValue<S> extends NumberConstructor
					? number
					: UnwrapValue<S> extends BooleanConstructor
						? boolean
						: UnwrapValue<S> extends DateConstructor
							? Date | number
							: never

type Simplify<T> = {[K in keyof T]: T[K]} & {}
type UnionToIntersection<U> = (
	U extends unknown ? (value: U) => void : never
) extends (value: infer I) => void
	? I
	: never
type IntersectionOrEmpty<U> = [U] extends [never] ? {} : UnionToIntersection<U>

type MessageParameters<M> =
	M extends MessageFunction<AnyFunction, infer P, any, any> ? P : {}
type MessageNeeds<M> =
	M extends MessageFunction<AnyFunction, any, infer N, any> ? N : never
type MessageOutput<M> =
	M extends MessageFunction<AnyFunction, any, any, infer O> ? O : string

type FieldsInput<F extends Readonly<Record<string, unknown>>> = {
	-readonly [K in keyof F as F[K] extends AnyMessage ? never : K]: InputOf<
		F[K]
	>
}

type ChoiceFieldsInput<F extends ParameterMap, SelectorInput> = {
	-readonly [K in keyof F]: UnwrapUnused<F[K]> extends AsValueMarker<infer M>
		? Extract<InputOf<M>, SelectorInput>
		: InputOf<F[K]>
}

type ChildParameters<F extends Readonly<Record<string, unknown>>> =
	IntersectionOrEmpty<MessageParameters<Extract<F[keyof F], AnyMessage>>>
type BindingParameters<F extends Readonly<Record<string, unknown>>> = Simplify<
	FieldsInput<F> & ChildParameters<F>
>
type MessageBindingKeys<F extends Readonly<Record<string, unknown>>> = {
	[K in keyof F]: F[K] extends AnyMessage ? K : never
}[keyof F]

type ChildNeeds<F extends Readonly<Record<string, unknown>>> = MessageNeeds<
	Extract<F[keyof F], AnyMessage>
>

type ValidateBindings<
	Names extends string,
	F extends Readonly<Record<string, MaybeUnused | AnyMessage>>
> = F & {
	readonly [K in Exclude<keyof F, Names>]: F[K] extends UnusedMarker<any>
		? F[K]
		: never
}

type RawPart<S> =
	UnwrapValue<S> extends ValueMarker<infer T>
		? T
		: S extends AnyMessage
			? MessageOutput<S> extends readonly (infer P)[]
				? Exclude<P, string>
				: Exclude<MessageOutput<S>, string>
			: never

type InsertOutput<F extends Readonly<Record<string, unknown>>> = [
	RawPart<F[keyof F]>
] extends [never]
	? string
	: readonly (string | RawPart<F[keyof F]>)[]

type MessageCall<
	P extends Readonly<Record<string, unknown>>,
	Needs extends string,
	Output
> = [Needs] extends [never]
	? keyof P extends never
		? () => Output
		: (values: Simplify<P>) => Output
	: (values: never) => Output

type InsertMessage<
	S extends string,
	F extends Readonly<Record<string, MaybeUnused | AnyMessage>>
> = MessageFunction<
	MessageCall<
		BindingParameters<F>,
		Exclude<
			PatternVariables<S> | ChildNeeds<F>,
			| Extract<keyof BindingParameters<F>, string>
			| Extract<MessageBindingKeys<F>, string>
		>,
		InsertOutput<F>
	>,
	BindingParameters<F>,
	Exclude<
		PatternVariables<S> | ChildNeeds<F>,
		| Extract<keyof BindingParameters<F>, string>
		| Extract<MessageBindingKeys<F>, string>
	>,
	InsertOutput<F>
>

const unwrapUnused = (field: MaybeUnused) =>
	unusedSymbol in Object(field)
		? (field as UnusedMarker<FieldSpec>)[unusedSymbol]
		: field

const unwrapParameter = (field: ParameterSpec): MessageFieldSpec => {
	if (asValueSymbol in Object(field))
		return (field as AsValueMarker<MessageFieldSpec>)[asValueSymbol]
	return unwrapUnused(field as MaybeUnused) as MessageFieldSpec
}

const toFieldRecipe = (input: MaybeUnused): FieldRecipe => {
	const field = unwrapUnused(input)
	if (valueSymbol in Object(field)) return {kind: "raw"}
	if (field === String) return {kind: "constructor", name: "string"}
	if (field === Number) return {kind: "constructor", name: "number"}
	if (field === Boolean) return {kind: "constructor", name: "boolean"}
	if (field === Date) return {kind: "constructor", name: "date"}
	const described = describe(field)
	if (described && !isMessageRecipe(described))
		return {kind: "format", recipe: described}
	throw new TypeError(
		"A field must be a constructor, value(), or Native I18n formatter. Message nodes are output bindings, not field formatters."
	)
}

const recipe = <R extends Omit<Recipe, "$nativeI18n" | "version">>(input: R) =>
	({
		$nativeI18n: RECIPE_VERSION,
		version: RECIPE_VERSION,
		...input
	}) as unknown as Recipe

const literalRecipe = (value: string): MessageRecipe =>
	recipe({op: "literal", value}) as MessageRecipe

const toMessageRecipe = (message: MessageInput): MessageRecipe => {
	if (typeof message === "string") return literalRecipe(message)
	const described = describe(message)
	if (described && isMessageRecipe(described)) return described
	throw new TypeError(
		"A message branch must be a literal string or Native I18n message node. Wrap interpolation in insert()."
	)
}

const toBindingRecipe = (input: MaybeUnused | AnyMessage): BindingRecipe => {
	const described = describe(input)
	return described && isMessageRecipe(described)
		? {kind: "message", recipe: described}
		: {kind: "field", field: toFieldRecipe(input as MaybeUnused)}
}

export function insert<const S extends string>(pattern: S): InsertMessage<S, {}>
export function insert<
	const S extends string,
	const F extends Readonly<Record<string, MaybeUnused | AnyMessage>>
>(
	pattern: S,
	bindings: ValidateBindings<PatternVariables<S>, F>
): InsertMessage<S, F>
export function insert(
	pattern: string,
	bindings: Readonly<Record<string, MaybeUnused | AnyMessage>> = {}
): MessageFunction<AnyFunction, any, any, any> {
	return createStandardFunction(
		recipe({
			op: "insert",
			pattern,
			bindings: Object.fromEntries(
				Object.entries(bindings).map(([name, binding]) => [
					name,
					toBindingRecipe(binding)
				])
			)
		})
	) as MessageFunction<AnyFunction, any, any, any>
}

export const rich: typeof insert = insert

type ChoiceCases = Readonly<Record<string, MessageInput>> & {
	readonly other: MessageInput
}
type CaseMessages<C extends ChoiceCases> = Extract<C[keyof C], AnyMessage>
type CaseParameters<C extends ChoiceCases> = IntersectionOrEmpty<
	MessageParameters<CaseMessages<C>>
>
type CaseNeeds<C extends ChoiceCases> = Exclude<
	MessageNeeds<CaseMessages<C>>,
	"pluralValue"
>
type CaseOutput<C extends ChoiceCases> = MessageOutput<C[keyof C]>
type SelectorKeys<F extends ParameterMap> = {
	[K in keyof F]: UnwrapUnused<F[K]> extends AsValueMarker<any> ? K : never
}[keyof F]
type SelectorName<F extends ParameterMap> = [SelectorKeys<F>] extends [never]
	? "value"
	: Extract<SelectorKeys<F>, string>
type DefaultParameter<F extends ParameterMap, Input> = [
	SelectorKeys<F>
] extends [never]
	? {value: Input}
	: {}
type ChoiceParameters<
	C extends ChoiceCases,
	F extends ParameterMap,
	DefaultInput
> = Simplify<
	ChoiceFieldsInput<F, DefaultInput> &
		CaseParameters<C> &
		DefaultParameter<F, DefaultInput>
>
type ChoiceNeeds<
	C extends ChoiceCases,
	F extends ParameterMap,
	DefaultInput
> = Exclude<
	CaseNeeds<C>,
	Extract<keyof ChoiceParameters<C, F, DefaultInput>, string>
>
type ChoiceCall<
	P extends Readonly<Record<string, unknown>>,
	Selector extends keyof P,
	Needs extends string,
	Output
> = [Needs] extends [never]
	? Exclude<keyof P, Selector> extends never
		? (value: P[Selector]) => Output
		: (values: Simplify<P>) => Output
	: (values: never) => Output

type ChoiceMessage<
	C extends ChoiceCases,
	F extends ParameterMap,
	DefaultInput
> = MessageFunction<
	ChoiceCall<
		ChoiceParameters<C, F, DefaultInput>,
		Extract<SelectorName<F>, keyof ChoiceParameters<C, F, DefaultInput>>,
		ChoiceNeeds<C, F, DefaultInput>,
		CaseOutput<C>
	>,
	ChoiceParameters<C, F, DefaultInput>,
	ChoiceNeeds<C, F, DefaultInput>,
	CaseOutput<C>
>

export type PluralOptions = {readonly offset?: number}

const defaultNumberParameter = (): FieldRecipe => ({
	kind: "format",
	recipe: recipe({op: "number", options: {}}) as Extract<
		Recipe,
		{readonly op: "number"}
	>
})

const toParameters = (
	fields: ParameterMap,
	defaultField: FieldRecipe
): {parameters: Readonly<Record<string, FieldRecipe>>; value: string} => {
	const parameters: Record<string, FieldRecipe> = {}
	let selector: string | undefined
	for (const [name, field] of Object.entries(fields)) {
		if (asValueSymbol in Object(field)) {
			if (selector)
				throw new TypeError(
					`A choice node has more than one asValue() parameter: ${selector}, ${name}.`
				)
			selector = name
		}
		parameters[name] = toFieldRecipe(unwrapParameter(field))
	}
	const value = selector ?? "value"
	if (!selector) parameters[value] = defaultField
	return {parameters, value}
}

const choice = (
	op: "plural" | "ordinal" | "select",
	cases: ChoiceCases,
	fields: ParameterMap,
	offset?: number
) => {
	const {parameters, value: selector} = toParameters(
		fields,
		op === "select"
			? {kind: "constructor", name: "string"}
			: defaultNumberParameter()
	)
	return createStandardFunction(
		recipe({
			op,
			cases: Object.fromEntries(
				Object.entries(cases).map(([key, branch]) => [
					key,
					toMessageRecipe(branch)
				])
			),
			parameters,
			value: selector,
			...(offset === undefined ? {} : {offset})
		})
	)
}

export function plural<const C extends ChoiceCases>(
	cases: C,
	fields?: undefined,
	options?: PluralOptions
): ChoiceMessage<C, {}, number>
export function plural<
	const C extends ChoiceCases,
	const F extends ParameterMap
>(cases: C, fields: F, options?: PluralOptions): ChoiceMessage<C, F, number>
export function plural(
	cases: ChoiceCases,
	fields?: ParameterMap,
	options?: PluralOptions
): MessageFunction<AnyFunction, any, any, any> {
	return choice(
		"plural",
		cases,
		fields ?? {},
		options?.offset
	) as MessageFunction<AnyFunction, any, any, any>
}

export function ordinal<const C extends ChoiceCases>(
	cases: C,
	fields?: undefined,
	options?: PluralOptions
): ChoiceMessage<C, {}, number>
export function ordinal<
	const C extends ChoiceCases,
	const F extends ParameterMap
>(cases: C, fields: F, options?: PluralOptions): ChoiceMessage<C, F, number>
export function ordinal(
	cases: ChoiceCases,
	fields?: ParameterMap,
	options?: PluralOptions
): MessageFunction<AnyFunction, any, any, any> {
	return choice(
		"ordinal",
		cases,
		fields ?? {},
		options?.offset
	) as MessageFunction<AnyFunction, any, any, any>
}

export function select<const C extends ChoiceCases>(
	cases: C,
	fields?: undefined
): ChoiceMessage<C, {}, string | number>
export function select<
	const C extends ChoiceCases,
	const F extends ParameterMap
>(cases: C, fields: F): ChoiceMessage<C, F, string | number>
export function select(
	cases: ChoiceCases,
	fields?: ParameterMap
): MessageFunction<AnyFunction, any, any, any> {
	return choice("select", cases, fields ?? {}) as MessageFunction<
		AnyFunction,
		any,
		any,
		any
	>
}
export type RangeCase<M extends MessageInput = MessageInput> = {
	readonly min?: number
	readonly max?: number
	readonly value: M
}

type RangeMessages<
	C extends readonly RangeCase[],
	O extends MessageInput
> = Extract<C[number]["value"] | O, AnyMessage>
type RangeParameters<
	C extends readonly RangeCase[],
	O extends MessageInput,
	F extends ParameterMap
> = Simplify<
	FieldsInput<F> &
		IntersectionOrEmpty<MessageParameters<RangeMessages<C, O>>> &
		DefaultParameter<F, number>
>
type RangeNeeds<
	C extends readonly RangeCase[],
	O extends MessageInput,
	F extends ParameterMap
> = Exclude<
	MessageNeeds<RangeMessages<C, O>>,
	Extract<keyof RangeParameters<C, O, F>, string>
>
type RangeOutput<
	C extends readonly RangeCase[],
	O extends MessageInput
> = MessageOutput<C[number]["value"] | O>

export const range = <
	const C extends readonly RangeCase[],
	const O extends MessageInput,
	const F extends ParameterMap = {}
>(
	cases: C,
	other: O,
	fields?: F
): MessageFunction<
	ChoiceCall<
		RangeParameters<C, O, F>,
		Extract<SelectorName<F>, keyof RangeParameters<C, O, F>>,
		RangeNeeds<C, O, F>,
		RangeOutput<C, O>
	>,
	RangeParameters<C, O, F>,
	RangeNeeds<C, O, F>,
	RangeOutput<C, O>
> => {
	const {parameters, value: selector} = toParameters(
		fields ?? {},
		defaultNumberParameter()
	)
	return createStandardFunction(
		recipe({
			op: "range",
			cases: cases.map(item => ({
				...item,
				value: toMessageRecipe(item.value)
			})),
			other: toMessageRecipe(other),
			parameters,
			value: selector
		})
	) as never
}
type NumberInput = number | bigint
type NumberOptions = Intl.NumberFormatOptions
type NumberFunction = FormatterFunction<(value: NumberInput) => string>

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
type DateFunction = FormatterFunction<(value: DateInput) => string>

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
): FormatterFunction<(value: number) => string>
export function relativeTime(
	options?: Intl.RelativeTimeFormatOptions
): FormatterFunction<
	(value: number, unit: Intl.RelativeTimeFormatUnit) => string
>
export function relativeTime(
	unitOrOptions:
		| Intl.RelativeTimeFormatUnit
		| Intl.RelativeTimeFormatOptions = {},
	options: Intl.RelativeTimeFormatOptions = {}
): FormatterFunction<(...arguments_: any[]) => string> {
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
): FormatterFunction<(value: DurationInput) => string> =>
	createStandardFunction(recipe({op: "duration", options}))

export const list = (
	options: Intl.ListFormatOptions = {}
): FormatterFunction<(values: Iterable<string>) => string> =>
	createStandardFunction(recipe({op: "list", options}))

export const displayName = (
	type: Intl.DisplayNamesType,
	options: Omit<Intl.DisplayNamesOptions, "type"> = {}
): FormatterFunction<(code: string) => string> =>
	createStandardFunction(
		recipe({op: "displayName", argument: type, options: {type, ...options}})
	)
