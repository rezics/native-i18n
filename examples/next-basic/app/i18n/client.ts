"use client"

import {create} from "native-i18n/next/client"
import {languages} from "./languages"

export const {
	TranslationProvider,
	useLocale,
	useSetLocale,
	useTranslation
} = create(languages)
