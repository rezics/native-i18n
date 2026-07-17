export const RECIPE_VERSION = 1 as const

export type AnyFunction = (...arguments_: any[]) => any

export type ExecutionContext = {
	readonly locale: string
	readonly timeZone?: string
}

export type ConstructorName = "string" | "number" | "boolean" | "date"

export type FieldRecipe =
	| {readonly kind: "constructor"; readonly name: ConstructorName}
	| {readonly kind: "raw"}
	| {readonly kind: "format"; readonly recipe: Recipe}

type RecipeBase = {
	readonly $nativeI18n: typeof RECIPE_VERSION
	readonly version: typeof RECIPE_VERSION
}

export type InsertRecipe = RecipeBase & {
	readonly op: "insert"
	readonly template: string
	readonly fields: Readonly<Record<string, FieldRecipe>>
}

export type ChoiceRecipe = RecipeBase & {
	readonly op: "plural" | "ordinal" | "select"
	readonly cases: Readonly<Record<string, string>>
	readonly fields: Readonly<Record<string, FieldRecipe>>
	readonly offset?: number
}

export type RangeRecipe = RecipeBase & {
	readonly op: "range"
	readonly cases: readonly {
		readonly min?: number
		readonly max?: number
		readonly value: string
	}[]
	readonly other: string
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

export type Recipe = InsertRecipe | ChoiceRecipe | RangeRecipe | FormatRecipe

const recipeSymbol: unique symbol = Symbol("native-i18n/recipe")

export type StandardFunction<F extends AnyFunction = AnyFunction> = F & {
	readonly [recipeSymbol]: Recipe
}

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

const recipeOperations = new Set<string>([
	"insert",
	"plural",
	"ordinal",
	"select",
	"range",
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
			"Unsupported Native I18n recipe version: " + String(envelope.version)
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

const fieldValue = (
	field: FieldRecipe,
	value: unknown,
	context: ExecutionContext
): unknown => {
	switch (field.kind) {
		case "raw":
			return value
		case "constructor":
			switch (field.name) {
				case "string":
					return String(value)
				case "number":
					return String(Number(value))
				case "boolean":
					return String(Boolean(value))
				case "date":
					return dateFormatter(context, {}).format(
						value instanceof Date ? value : Number(value)
					)
			}
		case "format":
			return compile(field.recipe, context)(value)
	}
}

const render = (
	template: string,
	values: Readonly<Record<string, unknown>>,
	fields: Readonly<Record<string, FieldRecipe>>,
	context: ExecutionContext
) => {
	const pattern = /{{\s*([\w$.-]+)\s*}}/g
	const hasRaw = Object.values(fields).some(field => field.kind === "raw")
	if (!hasRaw)
		return template.replace(pattern, (_match, name: string) =>
			String(fieldValue(fields[name]!, values[name], context))
		)

	const parts: unknown[] = []
	let index = 0
	for (const match of template.matchAll(pattern)) {
		const start = match.index
		if (start > index) parts.push(template.slice(index, start))
		const name = match[1]!
		parts.push(fieldValue(fields[name]!, values[name], context))
		index = start + match[0].length
	}
	if (index < template.length) parts.push(template.slice(index))
	return parts
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

export const compile = <F extends AnyFunction = AnyFunction>(
	recipe: Recipe,
	context: ExecutionContext = defaultContext
): StandardFunction<F> => {
	const parsed = parseRecipe(recipe)
	if (!parsed) throw new NativeI18nSerializationError("Invalid Native I18n recipe.")
	recipe = parsed

	let fn: AnyFunction
	switch (recipe.op) {
		case "insert":
			fn = values =>
				render(recipe.template, values, recipe.fields, context)
			break
		case "plural":
		case "ordinal": {
			fn = input => {
				const values =
					typeof input === "number" ? {count: input} : input
				const count = Number(values.count)
				const exact = recipe.cases[`=${count}`]
				const adjusted = count - (recipe.offset ?? 0)
				const category = pluralRules(
					context,
					recipe.op === "ordinal" ? "ordinal" : "cardinal"
				).select(adjusted)
				const template =
					exact ?? recipe.cases[category] ?? recipe.cases["other"]!
				const withNumber = template.replace(
					/#/g,
					numberFormatter(context, {}).format(adjusted)
				)
				return render(withNumber, values, recipe.fields, context)
			}
			break
		}
		case "select":
			fn = input => {
				const values =
					typeof input === "object" && input !== null
						? input
						: {value: input}
				const template =
					recipe.cases[String(values.value)] ?? recipe.cases["other"]!
				return render(template, values, recipe.fields, context)
			}
			break
		case "range":
			fn = value => {
				const found = recipe.cases.find(
					item =>
						(item.min === undefined || value >= item.min) &&
						(item.max === undefined || value <= item.max)
				)
				return found?.value ?? recipe.other
			}
			break
		default:
			fn = compileFormat(recipe, context)
	}

	return defineRecipe(fn as F, recipe)
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
