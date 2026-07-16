import {
	create as _create,
	toTranslationSnapshot,
	type CreateOptions,
	type Data,
	type Translation,
	type ServerTranslationResult,
	type ValidLanguages
} from ".."
import {toDataFunction} from "../translation"

export type ServerCreateResult<
	T extends string,
	D extends Data,
	O extends CreateOptions = CreateOptions
> = {
	readonly getTranslation: (
		tags: readonly string[]
	) => Promise<ServerTranslationResult<T, D>>
	readonly match: ReturnType<typeof _create<T, D, O>>
}

export const create = <
	const T extends string,
	const D extends Data,
	const O extends CreateOptions = {}
>(
	languages: ValidLanguages<T, D, O>,
	options?: O
): ServerCreateResult<T, D, O> => {
	const match = _create(languages, options)

	const getTranslation = async (tags: readonly string[]) => {
		const result = match([...tags])
		const data = await result
		const translation: Translation<T, D> = {
			data,
			locale: {
				current: result.context.locale as T,
				target: result.locale.target
			}
		}
		const base = {...translation, t: toDataFunction(data)}
		const snapshot = toTranslationSnapshot(translation, result.context)

		return (snapshot
			? {...base, snapshot}
			: base) as unknown as ServerTranslationResult<T, D>
	}

	return {getTranslation, match}
}
