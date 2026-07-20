import {insert, plural} from "native-i18n"

export default {
	description: "This example loads translations by locale and namespace.",
	welcome: insert("Welcome, {{name}}!", {name: String}),
	itemCount: plural({
		one: insert("You have {{value}} item."),
		other: insert("You have {{value}} items.")
	})
}
