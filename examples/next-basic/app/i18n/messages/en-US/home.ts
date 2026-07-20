import {insert, plural} from "native-i18n"

export default {
	greeting: "Hello from Server Components!",
	description: "This page uses Native I18n's Next.js helpers.",
	welcome: insert("Welcome, {{name}}!", {name: String}),
	itemCount: plural({
		one: insert("You have {{value}} item."),
		other: insert("You have {{value}} items.")
	})
}
