import {create} from "native-i18n/next"
import {languages} from "./languages"

export const {getLocaleTags, getTranslation, match} = create(languages)
