import {insert, plural} from "native-i18n"

export default {
	greeting: "Hello!",
	farewell: "Goodbye!",
	description: "This is a React i18n example using Native I18n.",
	switchLocale: "Switch locale:",
	items: {apple: "Apple", banana: "Banana", cherry: "Cherry"},
	welcome: insert("Welcome, {{name}}!", {name: String}),
	itemCount: plural({one: "You have # item.", other: "You have # items."})
}
