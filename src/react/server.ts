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

export type ServerCreateResult<T extends string, D extends Data> = {
	readonly getTranslation: (
		tags: readonly string[]
	) => Promise<ServerTranslationResult<T, D>>
	readonly match: ReturnType<typeof _create<T, D>>
}

export const create = <
	const T extends string,
	const D extends Data,
	const O extends CreateOptions = {}
>(
	languages: ValidLanguages<T, D>,
	options?: O
): ServerCreateResult<T, D> => {
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

		return {...base, snapshot} as ServerTranslationResult<T, D>
	}

	return {getTranslation, match}
}
