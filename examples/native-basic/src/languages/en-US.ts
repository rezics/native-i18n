import {insert, plural} from "@nmnmcc/intee"

export default {
	greeting: "Hello!",
	farewell: "Goodbye!",
	description: "This is a native TypeScript i18n example using IntEE.",
	items: {apple: "Apple", banana: "Banana", cherry: "Cherry"},
	welcome: insert("Welcome, {{name}}!", {name: String}),
	itemCount: plural({one: "You have # item.", other: "You have # items."})
}
