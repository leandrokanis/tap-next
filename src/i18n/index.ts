import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './en.json';
import ptBR from './pt-BR.json';

const deviceLanguage = Localization.getLocales()[0]?.languageCode ?? 'en';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    'pt-BR': { translation: ptBR },
  },
  lng: deviceLanguage === 'pt' ? 'pt-BR' : 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
