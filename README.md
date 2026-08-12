# Jelly Safety (Expo React Native)

해운대 해수욕장 해파리 위험도와 사진 기반 해양 생물 도감을 위한 화면 예시입니다.

## 폴더 구조

```
jelly/
├── App.js                 # NavigationContainer와 Stack 등록
├── MainScreen.js          # 해운대 위험도 홈
├── DictionaryScreen.js    # 촬영·갤러리·AI 분석 모의 도감
├── services/
│   ├── jellyfishApi.js    # 위험도 API 호출
│   └── speciesAi.js       # 이미지 AI 분석 API 호출
└── assets/
```

## 설치 및 연결

```bash
npx expo install expo-image-picker @expo/vector-icons
npm install @react-navigation/native @react-navigation/native-stack
npx expo install react-native-screens react-native-safe-area-context
```

`App.js`의 Stack에 `Main`과 `Dictionary`를 각각 `MainScreen`, `DictionaryScreen`으로 등록하면 됩니다. 현재 `DictionaryScreen`은 실제 API 대신 1.8초의 분석 모의 과정을 거쳐 결과를 표시합니다.
