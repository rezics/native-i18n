import {insert, plural} from "@nmnmcc/intee"

export default {
	greeting: "Hello from Server Components!",
	farewell: "This page could not be found.",
	description: "This page uses IntEE's Next.js helpers.",
	switchLocale: "Switch locale:",
	welcome: insert("Welcome, {{name}}!", {name: String}),
	itemCount: plural({one: "You have # item.", other: "You have # items."})
}
