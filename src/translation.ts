import {type FromLeaves, type Leaves} from "./utils"

export type DataFunction<D extends object, N = never> = {
	<L extends Leaves<D, N>>(leaves: L): FromLeaves<D, L, N>
} & D

export const toDataFunction = <D extends object>(data: D): DataFunction<D> => {
	const translation = (leaves: Leaves<D>) => {
		let value: unknown = data

		for (const key of leaves.split(".")) {
			value = (value as Record<string, unknown>)[key]
		}

		return value
	}

	return Object.assign(translation, data) as DataFunction<D>
}
