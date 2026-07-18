export type PatternTextToken = {readonly kind: "text"; readonly value: string}

export type PatternVariableToken = {
	readonly kind: "variable"
	readonly name: string
}

export type PatternToken = PatternTextToken | PatternVariableToken

export type CompiledPattern = {
	readonly source: string
	readonly tokens: readonly PatternToken[]
	readonly variables: readonly string[]
}

export class NativeI18nPatternError extends SyntaxError {
	override readonly name = "NativeI18nPatternError"

	constructor(
		message: string,
		readonly position: number
	) {
		super(`${message} at character ${position}.`)
	}
}

const variableName = /^[A-Za-z_$][A-Za-z0-9_$-]*$/
const unsupportedTag = new Set(["#", "/", "^", ">", "!", "{", "&", "."])

const fail = (message: string, position: number): never => {
	throw new NativeI18nPatternError(message, position)
}

const parseDelimiters = (
	content: string,
	position: number
): readonly [string, string] => {
	if (!content.endsWith("="))
		return fail("A delimiter-change tag must end with =", position)

	const declaration = content.slice(1, -1).trim()
	const delimiters = declaration.split(/\s+/)
	if (
		delimiters.length !== 2 ||
		!delimiters[0] ||
		!delimiters[1] ||
		delimiters.some(delimiter => /[\s=]/.test(delimiter))
	)
		return fail(
			"A delimiter-change tag must contain two non-empty delimiters",
			position
		)

	return [delimiters[0], delimiters[1]]
}

/**
 * Compiles the Native I18n Pattern subset of Mustache.
 *
 * Variable tags and delimiter-change tags are supported. Sections, comments,
 * partials, unescaped variables, dotted names and HTML escaping are deliberately
 * not part of Pattern.
 */
export const compilePattern = (source: string): CompiledPattern => {
	const tokens: PatternToken[] = []
	const variables: string[] = []
	const seen = new Set<string>()
	let open = "{{"
	let close = "}}"
	let position = 0

	while (position < source.length) {
		const start = source.indexOf(open, position)
		if (start < 0) {
			if (position < source.length)
				tokens.push({kind: "text", value: source.slice(position)})
			break
		}

		if (start > position)
			tokens.push({kind: "text", value: source.slice(position, start)})

		const contentStart = start + open.length
		const end = source.indexOf(close, contentStart)
		if (end < 0) return fail("Unclosed Pattern tag", start)

		const content = source.slice(contentStart, end).trim()
		if (!content) return fail("An empty Pattern tag is not allowed", start)

		if (content.startsWith("=")) {
			;[open, close] = parseDelimiters(content, start)
		} else {
			const first = content[0]!
			if (unsupportedTag.has(first))
				return fail(
					`Unsupported Mustache tag ${JSON.stringify(first)}`,
					start
				)
			if (!variableName.test(content))
				return fail(
					`Invalid Pattern variable ${JSON.stringify(content)}`,
					start
				)
			tokens.push({kind: "variable", name: content})
			if (!seen.has(content)) {
				seen.add(content)
				variables.push(content)
			}
		}

		position = end + close.length
	}

	return {source, tokens, variables}
}

type TrimLeft<S extends string> = S extends ` ${infer R}`
	? TrimLeft<R>
	: S extends `\n${infer R}`
		? TrimLeft<R>
		: S extends `\t${infer R}`
			? TrimLeft<R>
			: S
type TrimRight<S extends string> = S extends `${infer R} `
	? TrimRight<R>
	: S extends `${infer R}\n`
		? TrimRight<R>
		: S extends `${infer R}\t`
			? TrimRight<R>
			: S
type Trim<S extends string> = TrimLeft<TrimRight<S>>

type Delimiters<S extends string> =
	Trim<S> extends `${infer Open} ${infer Close}`
		? readonly [Trim<Open>, Trim<Close>]
		: never

export type PatternVariables<
	S extends string,
	Open extends string = "{{",
	Close extends string = "}}"
> = string extends S
	? string
	: S extends `${string}${Open}${infer Tag}${Close}${infer Rest}`
		? Trim<Tag> extends `=${infer Declaration}=`
			? Delimiters<Declaration> extends readonly [
					infer NextOpen extends string,
					infer NextClose extends string
				]
				? PatternVariables<Rest, NextOpen, NextClose>
				: never
			: Trim<Tag> | PatternVariables<Rest, Open, Close>
		: never
