import {useEffect, useMemo, useState} from "react"
import {create as _create, type Data, type Languages} from ".."
import {type FromLeaves, type Leaves} from "../utils"

export const create = <const T extends string, const D extends Data>(
	languages: Languages<T, D>
) => {
	const match = _create(languages)

	let lastData: D = languages[0].data
	let lastTag: T = languages[0].tag

	return {
		useTranslation: (tags?: string[]) => {
			const _tags = useMemo(
				() => tags ?? [...(navigator ? navigator.languages : [])],
				[tags]
			)
			const result = useMemo(() => match(_tags), [_tags])
			const [data, setData] = useState<D>(() => lastData)
			const [tag, setTag] = useState<T>(() => lastTag)
			const df = useMemo(() => toDataFunction(data), [data])

			useEffect(() => {
				let stale = false
				result.then(data => {
					if (!stale) {
						lastData = data
						lastTag = result.tag
						setData(data)
						setTag(result.tag)
					}
				})
				return () => {
					stale = true
				}
			}, [result])

			return [df, tag] as const
		},
		match
	}
}

export type DataFunction<D extends Data, N = never> = {
	<L extends Leaves<D, N>>(leaves: L): FromLeaves<D, L, N>
} & D

export const toDataFunction = <D extends Data>(data: D): DataFunction<D> => {
	const translation = (leaves: Leaves<D>) => {
		let value: unknown = data

		for (const key of leaves.split(".")) {
			value = (value as Record<string, unknown>)[key]
		}

		return value
	}

	return Object.assign(translation, data) as DataFunction<D>
}
