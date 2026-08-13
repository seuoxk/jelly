import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ko from './src/locales/ko.json';
import en from './src/locales/en.json';
import zh from './src/locales/zh.json';
import ja from './src/locales/ja.json';
import encyclopedia from './src/locales/encyclopedia';

i18n.use(initReactI18next).init({
  resources: { ko: { translation: ko }, en: { translation: en }, zh: { translation: zh }, ja: { translation: ja } },
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
Object.entries(encyclopedia).forEach(([language, entries]) => i18n.addResourceBundle(language, 'translation', { encyclopedia: entries }, true, true));
const profileCopy = { ko: ['맨 처음 화면으로', '로그인이 필요합니다.', '개인 도감과 스캔 기록을 저장하려면 로그인해 주세요.', '아이디 / 비밀번호로 로그인하기', '로그인 상태 · 안전한 바다 탐험을 응원해요', '스캔', '내 도감'], en: ['Go to home', 'Sign in required', 'Sign in to save your personal guide and scan history.', 'Sign in with ID / password', 'Signed in · Enjoy exploring the ocean safely', 'Scans', 'My guide'] };
Object.entries(profileCopy).forEach(([language, value]) => i18n.addResourceBundle(language, 'translation', { profile: { goHome: value[0], loginRequired: value[1], loginHint: value[2], loginWithId: value[3], loggedIn: value[4], scans: value[5], collection: value[6] } }, true, true));
const emergencySteps = {
  ko: { jellyfish: [{ title: '1단계 · 바닷물로 세척', body: '즉시 물 밖으로 나온 뒤 상처 부위를 바닷물로 충분히 씻으세요.' }, { title: '2단계 · 촉수와 침 제거', body: '장갑이나 카드 가장자리로 촉수를 조심스럽게 제거하세요.' }, { title: '3단계 · 온찜질과 관찰', body: '따뜻한 물로 온찜질하고 심한 증상이 있으면 119에 신고하세요.' }], spine: [{ title: '1단계 · 안전한 곳으로 이동', body: '추가 접촉을 피하고 물 밖의 안전한 장소로 이동하세요.' }, { title: '2단계 · 보이는 가시만 제거', body: '피부 밖으로 나온 가시만 조심스럽게 제거하세요.' }, { title: '3단계 · 온찜질 후 진료', body: '통증이 지속되거나 감염이 의심되면 진료를 받으세요.' }] },
  en: { jellyfish: [{ title: 'Step 1 · Rinse with seawater', body: 'Leave the water and thoroughly rinse the affected area with seawater.' }, { title: 'Step 2 · Remove tentacles', body: 'Use gloves or a card edge to remove tentacles carefully.' }, { title: 'Step 3 · Warm compress and monitor', body: 'Apply warm water and call 119 if severe symptoms occur.' }], spine: [{ title: 'Step 1 · Move to safety', body: 'Avoid further contact and move to a safe place out of the water.' }, { title: 'Step 2 · Remove visible spines only', body: 'Carefully remove only spines protruding from the skin.' }, { title: 'Step 3 · Warm compress and medical care', body: 'Seek medical care if pain persists or infection is suspected.' }] },
  zh: { jellyfish: [{ title: '步骤 1 · 用海水冲洗', body: '立即离开水面，用海水充分冲洗受伤部位。' }, { title: '步骤 2 · 清除触手和刺细胞', body: '使用手套或卡片边缘小心去除触手。' }, { title: '步骤 3 · 热敷并观察', body: '用温水热敷，症状严重时立即拨打 119。' }], spine: [{ title: '步骤 1 · 移至安全地点', body: '避免再次接触，离开水面前往安全地点。' }, { title: '步骤 2 · 仅移除可见的刺', body: '仅小心移除露在皮肤外的刺。' }, { title: '步骤 3 · 热敷后就医', body: '疼痛持续或怀疑感染时请就医。' }] },
  ja: { jellyfish: [{ title: '手順 1 · 海水で洗浄', body: 'すぐに水から上がり、患部を海水で十分に洗ってください。' }, { title: '手順 2 · 触手と刺胞を除去', body: '手袋やカードの縁で触手を慎重に取り除いてください。' }, { title: '手順 3 · 温めて観察', body: '温水で温め、症状が重い場合はすぐ119へ連絡してください。' }], spine: [{ title: '手順 1 · 安全な場所へ移動', body: '追加の接触を避け、水から出て安全な場所へ移動してください。' }, { title: '手順 2 · 見える棘だけ除去', body: '皮膚から出ている棘だけを慎重に取り除いてください。' }, { title: '手順 3 · 温めて受診', body: '痛みが続く、または感染が疑われる場合は受診してください。' }] }
};
Object.entries(emergencySteps).forEach(([language, steps]) => i18n.addResourceBundle(language, 'translation', { emergency: { stepsData: steps } }, true, true));
const themeCopy = {
  ko: { title: '테마 선택', system: '시스템 설정', light: '노말 테마', dark: '다크 모드', ocean: '바다 에디션', pastel: '파스텔 에디션', cherry: '벚꽃 에디션', nightSea: '밤바다 에디션', arctic: '북극 에디션', halloween: '할로윈 테마', christmas: '크리스마스 테마', seasonLocked: '시즌 한정' },
  en: { title: 'Choose theme', system: 'Use system setting', light: 'Normal theme', dark: 'Dark mode', ocean: 'Ocean edition', pastel: 'Pastel edition', cherry: 'Cherry blossom edition', nightSea: 'Night sea edition', arctic: 'Arctic edition', halloween: 'Halloween theme', christmas: 'Christmas theme', seasonLocked: 'Seasonal only' },
  zh: { title: '选择主题', system: '跟随系统设置', light: '普通主题', dark: '深色模式', ocean: '海洋版主题', pastel: '粉彩主题', cherry: '樱花版主题', nightSea: '夜海主题', arctic: '北极主题', halloween: '万圣节主题', christmas: '圣诞节主题', seasonLocked: '仅限当季' },
  ja: { title: 'テーマを選択', system: 'システム設定を使用', light: 'ノーマルテーマ', dark: 'ダークモード', ocean: 'オーシャンエディション', pastel: 'パステルエディション', cherry: '桜エディション', nightSea: '夜の海エディション', arctic: '北極エディション', halloween: 'ハロウィンテーマ', christmas: 'クリスマステーマ', seasonLocked: 'シーズン限定' },
};
Object.entries(themeCopy).forEach(([language, theme]) => i18n.addResourceBundle(language, 'translation', { theme }, true, true));

export default i18n;
