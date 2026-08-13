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

// Beach preset labels are kept as i18next resources (rather than display
// strings in the screen) so the weather selector changes with the app locale.
i18n.addResourceBundle('ko', 'translation', { main: {
  nearbyLocation: '내 위치 기준', beachHaeundae: '해운대 해수욕장', beachGwangalli: '광안리 해수욕장',
  beachSongdo: '송도 해수욕장', beachDadaepo: '다대포 해수욕장', beachSongjeong: '송정 해수욕장',
  beachIlgwang: '일광 해수욕장', beachImrang: '임랑 해수욕장',
} }, true, true);
i18n.addResourceBundle('en', 'translation', { main: {
  nearbyLocation: 'Near my location', beachHaeundae: 'Haeundae Beach', beachGwangalli: 'Gwangalli Beach',
  beachSongdo: 'Songdo Beach', beachDadaepo: 'Dadaepo Beach', beachSongjeong: 'Songjeong Beach',
  beachIlgwang: 'Ilgwang Beach', beachImrang: 'Imrang Beach',
} }, true, true);
i18n.addResourceBundle('ko', 'translation', { common: { clearHistory: '기록 지우기' } }, true, true);
i18n.addResourceBundle('en', 'translation', { common: { clearHistory: 'Clear history' } }, true, true);

export default i18n;
