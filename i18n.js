import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ko from './src/locales/ko.json';
import en from './src/locales/en.json';

i18n.use(initReactI18next).init({
  resources: { ko: { translation: ko }, en: { translation: en } },
  lng: 'ko',
  fallbackLng: 'ko',
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v4',
});

export default i18n;
