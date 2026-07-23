"use client"

import {create} from "native-i18n/next/client"
import {resources} from "./resources"

export const {
	TranslationProvider,
	preload,
	useLocale,
	useSetLocale,
	useTranslation
} = create(resources)
