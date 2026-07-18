import {compilePattern, type CompiledPattern} from "./pattern"

export const RECIPE_VERSION = 2 as const

export type AnyFunction = (...arguments_: any[]) => any

export type ExecutionContext = {
	readonly locale: string
	readonly timeZone?: string
}

export type ConstructorName = "string" | "number" | "boolean" | "date"

export type FieldRecipe =
	| {readonly kind: "constructor"; readonly name: ConstructorName}
	| {readonly kind: "raw"}
	| {readonly kind: "format"; readonly recipe: FormatRecipe}

type RecipeBase = {
	readonly $nativeI18n: typeof RECIPE_VERSION
	readonly version: typeof RECIPE_VERSION
}

export type LiteralRecipe = RecipeBase & {
	readonly op: "literal"
	readonly value: string
}

export type BindingRecipe =
	| {readonly kind: "field"; readonly field: FieldRecipe}
	| {readonly kind: "message"; readonly recipe: MessageRecipe}

export type InsertRecipe = RecipeBase & {
	readonly op: "insert"
	readonly pattern: string
	readonly bindings: Readonly<Record<string, BindingRecipe>>
}

export type ChoiceRecipe = RecipeBase & {
	readonly op: "plural" | "ordinal" | "select"
	readonly cases: Readonly<Record<string, MessageRecipe>>
	readonly parameters: Readonly<Record<string, FieldRecipe>>
	readonly value: string
	readonly offset?: number
}

export type RangeRecipe = RecipeBase & {
	readonly op: "range"
	readonly cases: readonly {
		readonly min?: number
		readonly max?: number
		readonly value: MessageRecipe
	}[]
	readonly other: MessageRecipe
	readonly parameters: Readonly<Record<string, FieldRecipe>>
	readonly value: string
}

export type FormatOperation =
	| "number"
	| "integer"
	| "currency"
	| "percent"
	| "unit"
	| "compact"
	| "date"
	| "time"
	| "datetime"
	| "relativeTime"
	| "duration"
	| "list"
	| "displayName"

export type FormatRecipe = RecipeBase & {
	readonly op: FormatOperation
	readonly options: Readonly<Record<string, unknown>>
	readonly argument?: string
}

export type MessageRecipe =
	| LiteralRecipe
	| InsertRecipe
	| ChoiceRecipe
	| RangeRecipe

export type Recipe = MessageRecipe | FormatRecipe

const recipeSymbol: unique symbol = Symbol("native-i18n/recipe")

export type StandardFunction<F extends AnyFunction = AnyFunction> = F & {
	readonly [recipeSymbol]: Recipe
}

declare const messageContractSymbol: unique symbol
declare const formatterContractSymbol: unique symbol

export type MessageFunction<
	F extends AnyFunction = AnyFunction,
	Parameters extends Readonly<Record<string, unknown>> = Readonly<
		Record<string, unknown>
	>,
	Needs extends string = string,
	Output = ReturnType<F>
> = StandardFunction<F> & {
	readonly [messageContractSymbol]: {
		readonly parameters: Parameters
		readonly needs: Needs
		readonly output: Output
	}
}

export type FormatterFunction<F extends AnyFunction = AnyFunction> =
	StandardFunction<F> & {readonly [formatterContractSymbol]: true}

type Atomic =
	| Date
	| RegExp
	| Map<any, any>
	| Set<any>
	| WeakMap<any, any>
	| WeakSet<any>

type IsAny<T> = 0 extends 1 & T ? true : false

export type ContractOf<T> =
	IsAny<T> extends true
		? T
		: T extends StandardFunction<infer F>
			? F
			: T extends AnyFunction | Atomic
				? T
				: T extends readonly unknown[]
					? {[K in keyof T]: ContractOf<T[K]>}
					: T extends object
						? {[K in keyof T]: ContractOf<T[K]>}
						: T

export type HasCustomFunction<T> =
	IsAny<T> extends true
		? false
		: T extends StandardFunction
			? false
			: T extends AnyFunction
				? true
				: T extends Atomic
					? false
					: T extends readonly unknown[]
						? true extends HasCustomFunction<T[number]>
							? true
							: false
						: T extends object
							? true extends {
									[K in keyof T]: HasCustomFunction<T[K]>
								}[keyof T]
								? true
								: false
							: false

export type SnapshotData<T> =
	IsAny<T> extends true
		? T
		: T extends StandardFunction
			? Recipe
			: T extends AnyFunction
				? never
				: T extends Atomic
					? T
					: T extends readonly unknown[]
						? {[K in keyof T]: SnapshotData<T[K]>}
						: T extends object
							? {[K in keyof T]: SnapshotData<T[K]>}
							: T
export class NativeI18nSerializationError extends TypeError {
	override readonly name = "NativeI18nSerializationError"
}

export class NativeI18nParameterError extends TypeError {
	override readonly name = "NativeI18nParameterError"
}

const defaultContext: ExecutionContext = {locale: "en", timeZone: "UTC"}
const intlCache = new Map<string, unknown>()
const MAX_INTL_CACHE_SIZE = 64

const stableKey = (value: unknown): string => {
	if (Array.isArray(value)) return `[${value.map(stableKey).join(",")}]`
	if (value && typeof value === "object")
		return `{${Object.entries(value)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([key, item]) => `${JSON.stringify(key)}:${stableKey(item)}`)
			.join(",")}}`
	return JSON.stringify(value) ?? String(value)
}

const cached = <T>(key: string, create: () => T): T => {
	const existing = intlCache.get(key)
	if (existing) return existing as T
	const value = create()
	if (intlCache.size >= MAX_INTL_CACHE_SIZE) {
		const oldest = intlCache.keys().next().value as string | undefined
		if (oldest) intlCache.delete(oldest)
	}
	intlCache.set(key, value)
	return value
}

const optionsWithTimeZone = (
	options: Readonly<Record<string, unknown>>,
	context: ExecutionContext
) =>
	context.timeZone && options["timeZone"] === undefined
		? {...options, timeZone: context.timeZone}
		: options

const numberFormatter = (
	context: ExecutionContext,
	options: Intl.NumberFormatOptions
) =>
	cached(
		`number:${context.locale}:${stableKey(options)}`,
		() => new Intl.NumberFormat(context.locale, options)
	)

const dateFormatter = (
	context: ExecutionContext,
	options: Intl.DateTimeFormatOptions
) => {
	const resolved = optionsWithTimeZone(
		options as Readonly<Record<string, unknown>>,
		context
	) as Intl.DateTimeFormatOptions
	return cached(
		`date:${context.locale}:${stableKey(resolved)}`,
		() => new Intl.DateTimeFormat(context.locale, resolved)
	)
}

const pluralRules = (context: ExecutionContext, type: Intl.PluralRuleType) =>
	cached(
		`plural:${context.locale}:${type}`,
		() => new Intl.PluralRules(context.locale, {type})
	)

const defineRecipe = <F extends AnyFunction>(fn: F, recipe: Recipe) => {
	Object.defineProperty(fn, recipeSymbol, {
		value: recipe,
		enumerable: false,
		configurable: false,
		writable: false
	})
	return fn as StandardFunction<F>
}

export const isStandardFunction = (value: unknown): value is StandardFunction =>
	typeof value === "function" && recipeSymbol in value

export const describe = (value: unknown): Recipe | undefined =>
	isStandardFunction(value) ? value[recipeSymbol] : undefined

const formatOperations = new Set<string>([
	"number",
	"integer",
	"currency",
	"percent",
	"unit",
	"compact",
	"date",
	"time",
	"datetime",
	"relativeTime",
	"duration",
	"list",
	"displayName"
])

const recipeOperations = new Set<string>([
	"literal",
	"insert",
	"plural",
	"ordinal",
	"select",
	"range",
	...formatOperations
])

export const isMessageRecipe = (recipe: Recipe): recipe is MessageRecipe =>
	!formatOperations.has(recipe.op)

const parseRecipe = (value: unknown): Recipe | undefined => {
	if (!value || typeof value !== "object" || !("$nativeI18n" in value))
		return undefined

	const envelope = value as {
		readonly $nativeI18n?: unknown
		readonly version?: unknown
		readonly op?: unknown
	}
	if (
		envelope.$nativeI18n !== RECIPE_VERSION ||
		envelope.version !== RECIPE_VERSION
	)
		throw new NativeI18nSerializationError(
			"Unsupported Native I18n recipe version: " +
				String(envelope.version)
		)
	if (typeof envelope.op !== "string" || !recipeOperations.has(envelope.op))
		throw new NativeI18nSerializationError(
			"Unsupported Native I18n recipe operation: " + String(envelope.op)
		)

	return value as Recipe
}

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
	if (!value || typeof value !== "object") return false
	const prototype = Object.getPrototypeOf(value) as unknown
	return prototype === Object.prototype || prototype === null
}

const compileFormat = (recipe: FormatRecipe, context: ExecutionContext) => {
	const options = recipe.options
	switch (recipe.op) {
		case "number":
		case "integer":
		case "currency":
		case "percent":
		case "unit":
		case "compact": {
			const formatter = numberFormatter(
				context,
				options as Intl.NumberFormatOptions
			)
			return (value: number | bigint) => formatter.format(value)
		}
		case "date":
		case "time":
		case "datetime": {
			const formatter = dateFormatter(
				context,
				options as Intl.DateTimeFormatOptions
			)
			return (value: Date | number) => formatter.format(value)
		}
		case "relativeTime": {
			const formatter = cached(
				`relative:${context.locale}:${stableKey(options)}`,
				() => new Intl.RelativeTimeFormat(context.locale, options)
			)
			return (value: number, unit?: Intl.RelativeTimeFormatUnit) =>
				formatter.format(
					value,
					(recipe.argument ?? unit) as Intl.RelativeTimeFormatUnit
				)
		}
		case "list": {
			const formatter = cached(
				`list:${context.locale}:${stableKey(options)}`,
				() => new Intl.ListFormat(context.locale, options)
			)
			return (values: Iterable<string>) => formatter.format(values)
		}
		case "displayName": {
			const formatter = cached(
				`display:${context.locale}:${stableKey(options)}`,
				() =>
					new Intl.DisplayNames(
						context.locale,
						options as unknown as Intl.DisplayNamesOptions
					)
			)
			return (code: string) => formatter.of(code) ?? code
		}
		case "duration":
			return (value: Readonly<Record<string, number>>) => {
				const DurationFormat = (
					Intl as unknown as {
						DurationFormat?: new (
							locales?: string,
							options?: Readonly<Record<string, unknown>>
						) => {
							format(
								value: Readonly<Record<string, number>>
							): string
						}
					}
				).DurationFormat
				if (!DurationFormat)
					throw new Error(
						"Intl.DurationFormat is unavailable in this runtime. Add a standards-compliant polyfill."
					)
				const formatter = cached(
					"duration:" + context.locale + ":" + stableKey(options),
					() => new DurationFormat(context.locale, options)
				)
				return formatter.format(value)
			}
	}
}

type MessageScope = {
	readonly raw: (name: string) => unknown
	readonly formatted: (name: string) => unknown
}

type MessageEvaluator = (
	scope: MessageScope,
	locals: ReadonlyMap<string, unknown>
) => unknown

const appendPart = (parts: unknown[], value: unknown): void => {
	if (Array.isArray(value)) {
		for (const item of value) appendPart(parts, item)
		return
	}
	if (typeof value === "string" && typeof parts.at(-1) === "string") {
		parts[parts.length - 1] = String(parts.at(-1)) + value
		return
	}
	parts.push(value)
}

const renderPattern = (
	pattern: CompiledPattern,
	resolve: (name: string) => unknown
): string | readonly unknown[] => {
	const parts: unknown[] = []
	for (const token of pattern.tokens)
		appendPart(
			parts,
			token.kind === "text" ? token.value : resolve(token.name)
		)
	return parts.every(part => typeof part === "string")
		? parts.join("")
		: parts
}

const compileMessage = (
	root: MessageRecipe,
	context: ExecutionContext
): AnyFunction => {
	const parameters = new Map<string, FieldRecipe>()
	const patterns = new Map<InsertRecipe, CompiledPattern>()
	const visited = new Set<MessageRecipe>()
	const active = new Set<MessageRecipe>()

	const addParameter = (name: string, field: FieldRecipe) => {
		const previous = parameters.get(name)
		if (previous && stableKey(previous) !== stableKey(field))
			throw new NativeI18nParameterError(
				`Conflicting parameter contracts for ${JSON.stringify(name)}.`
			)
		parameters.set(name, previous ?? field)
	}

	const collect = (message: MessageRecipe): void => {
		if (visited.has(message)) return
		if (active.has(message))
			throw new NativeI18nSerializationError(
				"Circular Native I18n message recipe."
			)
		active.add(message)
		switch (message.op) {
			case "literal":
				break
			case "insert":
				patterns.set(message, compilePattern(message.pattern))
				for (const [name, binding] of Object.entries(
					message.bindings
				)) {
					if (binding.kind === "field")
						addParameter(name, binding.field)
					else collect(binding.recipe)
				}
				break
			case "plural":
			case "ordinal":
			case "select":
				for (const [name, field] of Object.entries(message.parameters))
					addParameter(name, field)
				for (const branch of Object.values(message.cases))
					collect(branch)
				break
			case "range":
				for (const [name, field] of Object.entries(message.parameters))
					addParameter(name, field)
				for (const branch of message.cases) collect(branch.value)
				collect(message.other)
				break
		}
		active.delete(message)
		visited.add(message)
	}

	collect(root)

	const fieldFunctions = new Map<string, (value: unknown) => unknown>()
	for (const [name, field] of parameters) {
		switch (field.kind) {
			case "raw":
				fieldFunctions.set(name, value => value)
				break
			case "constructor":
				switch (field.name) {
					case "string":
						fieldFunctions.set(name, value => String(value))
						break
					case "number":
						fieldFunctions.set(name, value => String(Number(value)))
						break
					case "boolean":
						fieldFunctions.set(name, value =>
							String(Boolean(value))
						)
						break
					case "date":
						fieldFunctions.set(name, value =>
							dateFormatter(context, {}).format(
								value instanceof Date ? value : Number(value)
							)
						)
						break
				}
				break
			case "format": {
				const format = compileFormat(
					field.recipe,
					context
				) as AnyFunction
				fieldFunctions.set(name, value => format(value))
				break
			}
		}
	}

	const evaluators = new Map<MessageRecipe, MessageEvaluator>()
	const prepare = (message: MessageRecipe): MessageEvaluator => {
		const existing = evaluators.get(message)
		if (existing) return existing
		let evaluator: MessageEvaluator
		switch (message.op) {
			case "literal":
				evaluator = () => message.value
				break
			case "insert": {
				const pattern = patterns.get(message)!
				const bindings = Object.fromEntries(
					Object.entries(message.bindings).map(([name, binding]) => [
						name,
						binding.kind === "message"
							? prepare(binding.recipe)
							: undefined
					])
				) as Readonly<Record<string, MessageEvaluator | undefined>>
				evaluator = (scope, locals) =>
					renderPattern(pattern, name => {
						const child = bindings[name]
						if (child) return child(scope, locals)
						if (locals.has(name)) return locals.get(name)
						return scope.formatted(name)
					})
				break
			}
			case "plural":
			case "ordinal": {
				const branches = Object.fromEntries(
					Object.entries(message.cases).map(([key, branch]) => [
						key,
						prepare(branch)
					])
				) as Readonly<Record<string, MessageEvaluator>>
				evaluator = (scope, locals) => {
					const raw = Number(scope.raw(message.value))
					const exact = branches[`=${raw}`]
					const adjusted = raw - (message.offset ?? 0)
					const category = pluralRules(
						context,
						message.op === "ordinal" ? "ordinal" : "cardinal"
					).select(adjusted)
					const branch =
						exact ?? branches[category] ?? branches["other"]
					if (!branch)
						throw new NativeI18nParameterError(
							`${message.op} requires an other branch.`
						)
					const branchLocals = new Map(locals)
					branchLocals.set(
						"pluralValue",
						numberFormatter(context, {}).format(adjusted)
					)
					return branch(scope, branchLocals)
				}
				break
			}
			case "select": {
				const branches = Object.fromEntries(
					Object.entries(message.cases).map(([key, branch]) => [
						key,
						prepare(branch)
					])
				) as Readonly<Record<string, MessageEvaluator>>
				evaluator = (scope, locals) => {
					const branch =
						branches[String(scope.raw(message.value))] ??
						branches["other"]
					if (!branch)
						throw new NativeI18nParameterError(
							"select requires an other branch."
						)
					return branch(scope, locals)
				}
				break
			}
			case "range": {
				const branches = message.cases.map(item => ({
					...item,
					value: prepare(item.value)
				}))
				const other = prepare(message.other)
				evaluator = (scope, locals) => {
					const value = Number(scope.raw(message.value))
					const found = branches.find(
						item =>
							(item.min === undefined || value >= item.min) &&
							(item.max === undefined || value <= item.max)
					)
					return (found?.value ?? other)(scope, locals)
				}
				break
			}
		}
		evaluators.set(message, evaluator)
		return evaluator
	}

	const evaluate = prepare(root)
	const scalarParameter =
		root.op === "plural" ||
		root.op === "ordinal" ||
		root.op === "select" ||
		root.op === "range"
			? root.value
			: undefined

	return input => {
		const values = isPlainObject(input)
			? input
			: scalarParameter
				? {[scalarParameter]: input}
				: {}
		const formatted = new Map<string, unknown>()
		const raw = (name: string) => {
			if (!parameters.has(name))
				throw new NativeI18nParameterError(
					`No parameter contract defines ${JSON.stringify(name)}.`
				)
			if (!Object.prototype.hasOwnProperty.call(values, name))
				throw new NativeI18nParameterError(
					`Missing message parameter ${JSON.stringify(name)}.`
				)
			return values[name]
		}
		const scope: MessageScope = {
			raw,
			formatted: name => {
				if (formatted.has(name)) return formatted.get(name)
				const format = fieldFunctions.get(name)
				if (!format)
					throw new NativeI18nParameterError(
						`No parameter contract defines ${JSON.stringify(name)}.`
					)
				const value = format(raw(name))
				formatted.set(name, value)
				return value
			}
		}
		return evaluate(scope, new Map())
	}
}

export const compile = <F extends AnyFunction = AnyFunction>(
	recipe: Recipe,
	context: ExecutionContext = defaultContext
): StandardFunction<F> => {
	const parsed = parseRecipe(recipe)
	if (!parsed)
		throw new NativeI18nSerializationError("Invalid Native I18n recipe.")
	const fn = isMessageRecipe(parsed)
		? compileMessage(parsed, context)
		: compileFormat(parsed, context)
	return defineRecipe(fn as F, parsed)
}

export const createStandardFunction = <F extends AnyFunction>(recipe: Recipe) =>
	compile<F>(recipe, defaultContext)
type WalkMode = "materialize" | "dehydrate" | "hydrate"

const walk = (
	value: unknown,
	mode: WalkMode,
	context: ExecutionContext,
	allowCustomFunctions: boolean,
	path: string,
	active: WeakSet<object>
): unknown => {
	if (isStandardFunction(value))
		return mode === "dehydrate"
			? value[recipeSymbol]
			: compile(value[recipeSymbol], context)
	if (mode === "hydrate") {
		const recipe = parseRecipe(value)
		if (recipe) return compile(recipe, context)
	}
	if (typeof value === "function") {
		if (mode === "materialize" && allowCustomFunctions) return value
		throw new NativeI18nSerializationError(
			`Custom function at ${path} is not serializable. Use a Native I18n standard function.`
		)
	}
	if (!Array.isArray(value) && !isPlainObject(value)) return value
	if (active.has(value))
		throw new NativeI18nSerializationError(
			`Circular translation data at ${path}`
		)
	active.add(value)
	const result = Array.isArray(value)
		? value.map((item, index) =>
				walk(
					item,
					mode,
					context,
					allowCustomFunctions,
					`${path}[${index}]`,
					active
				)
			)
		: Object.fromEntries(
				Object.entries(value).map(([key, item]) => [
					key,
					walk(
						item,
						mode,
						context,
						allowCustomFunctions,
						`${path}.${key}`,
						active
					)
				])
			)
	active.delete(value)
	return result
}

export const materializeData = <T>(
	data: T,
	context: ExecutionContext,
	options: {readonly allowCustomFunctions?: boolean} = {}
) =>
	walk(
		data,
		"materialize",
		context,
		options.allowCustomFunctions ?? false,
		"data",
		new WeakSet()
	) as ContractOf<T>

export const dehydrate = <T>(data: T): SnapshotData<T> =>
	walk(
		data,
		"dehydrate",
		defaultContext,
		false,
		"data",
		new WeakSet()
	) as SnapshotData<T>

export const hydrate = <T>(
	data: SnapshotData<T>,
	context: ExecutionContext
): ContractOf<T> =>
	walk(
		data,
		"hydrate",
		context,
		false,
		"data",
		new WeakSet()
	) as ContractOf<T>

export const tryDehydrate = <T>(data: T): SnapshotData<T> | undefined => {
	try {
		return dehydrate(data)
	} catch (error) {
		if (error instanceof NativeI18nSerializationError) return undefined
		throw error
	}
}

export const createIntl = (context: ExecutionContext) => ({
	numberFormat: (options: Intl.NumberFormatOptions = {}) =>
		numberFormatter(context, options),
	dateTimeFormat: (options: Intl.DateTimeFormatOptions = {}) =>
		dateFormatter(context, options),
	pluralRules: (options: Intl.PluralRulesOptions = {}) =>
		cached(
			`plural:${context.locale}:${stableKey(options)}`,
			() => new Intl.PluralRules(context.locale, options)
		),
	relativeTimeFormat: (options: Intl.RelativeTimeFormatOptions = {}) =>
		cached(
			`relative:${context.locale}:${stableKey(options)}`,
			() => new Intl.RelativeTimeFormat(context.locale, options)
		),
	listFormat: (options: Intl.ListFormatOptions = {}) =>
		cached(
			`list:${context.locale}:${stableKey(options)}`,
			() => new Intl.ListFormat(context.locale, options)
		),
	displayNames: (options: Intl.DisplayNamesOptions) =>
		cached(
			`display:${context.locale}:${stableKey(options)}`,
			() => new Intl.DisplayNames(context.locale, options)
		)
})
