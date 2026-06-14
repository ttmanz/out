import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import en from '../locales/en.json';
import el from '../locales/el.json';
import ru from '../locales/ru.json';
import { CONFIG } from '../constants/config';

const resources = {
  en: { translation: en },
  el: { translation: el },
  ru: { translation: ru },
};

// Detect device language and map to a supported language, fallback to default
const getDeviceLanguage = () => {
  const deviceLang = Localization.getLocales()?.[0]?.languageCode ?? CONFIG.defaultLanguage;
  return CONFIG.supportedLanguages.includes(deviceLang) ? deviceLang : CONFIG.defaultLanguage;
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getDeviceLanguage(),
    fallbackLng: CONFIG.defaultLanguage,
    interpolation: { escapeValue: false },
    compatibilityJSON: 'v3',
  });

export default i18n;
