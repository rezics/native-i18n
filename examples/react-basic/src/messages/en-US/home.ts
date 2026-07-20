import {insert, plural} from "native-i18n"

export default {
	greeting: "Hello!",
	description: "This is a React i18n example using Native I18n.",
	welcome: insert("Welcome, {{name}}!", {name: String}),
	itemCount: plural({
		one: insert("You have {{value}} item."),
		other: insert("You have {{value}} items.")
	})
}
