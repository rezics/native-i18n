import {useEffect, useMemo, useState} from "react"
import {match, type Data, type Languages} from ".."

export const createTranslation = <const T extends string, const D extends Data>(
	...languages: Languages<T, D>
) => {
	let lastData: D = languages[0].data
	let lastTag: T = languages[0].tag

	return {
		useTranslation: (tags?: string[]) => {
			const _tags = useMemo(
				() => tags ?? [...(navigator ? navigator.languages : [])],
				[tags]
			)
			const result = useMemo(() => match(_tags, ...languages), [_tags])
			const [data, setData] = useState<D>(() => lastData)
			const [tag, setTag] = useState<T>(() => lastTag)

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

			return [data, tag] as const
		}
	}
}
