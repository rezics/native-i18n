import {describe, expect, test} from "vitest"
import {toDataFunction} from "./translation"

describe("toDataFunction", () => {
	test("prefers object access and supports typed keys stored as data", () => {
		const t = toDataFunction({
			greeting: "Hello",
			items: {apple: "Apple"},
			welcome: (name: string) => `Hello, ${name}`
		})

		expect(t.greeting).toBe("Hello")
		expect(t.items.apple).toBe("Apple")

		const itemKey = "items.apple" as const
		const welcomeKey = "welcome" as const
		expect(t(itemKey)).toBe("Apple")
		expect(t(welcomeKey)("Ada")).toBe("Hello, Ada")
	})
})
