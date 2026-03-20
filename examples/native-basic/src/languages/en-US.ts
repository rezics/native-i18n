export default {
	greeting: "Hello!",
	farewell: "Goodbye!",
	description: "This is a native TypeScript i18n example using IntEE.",
	items: {apple: "Apple", banana: "Banana", cherry: "Cherry"},
	welcome: (name: string) => `Welcome, ${name}!`,
	itemCount: (n: number) => `You have ${n} item${n === 1 ? "" : "s"}.`
}
