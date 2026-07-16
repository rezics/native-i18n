import {TranslationProvider} from "./i18n/client"
import {getLocaleTags, getTranslation} from "./i18n/server"

export default async function RootLayout({
	children
}: Readonly<{children: React.ReactNode}>) {
	const tags = await getLocaleTags()
	const {locale, snapshot} = await getTranslation(tags)

	return (
		<html lang={locale.current}>
			<body>
				<TranslationProvider tags={tags} initial={snapshot}>
					{children}
				</TranslationProvider>
			</body>
		</html>
	)
}
