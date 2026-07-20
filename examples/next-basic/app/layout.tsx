import {TranslationProvider} from "./i18n/client"
import {getTranslation} from "./i18n/server"

export default async function RootLayout({
	children
}: Readonly<{children: React.ReactNode}>) {
	const {locale, snapshot} = await getTranslation("common")

	return (
		<html lang={locale.current}>
			<body>
				<TranslationProvider initial={snapshot}>
					{children}
				</TranslationProvider>
			</body>
		</html>
	)
}
