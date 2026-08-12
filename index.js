import { registerRootComponent } from 'expo';
import '@expo/metro-runtime';
import App from './App';

// 웹 브라우저 html, body, #root 요소의 높이를 100%로 강제 설정
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    html, body, #root {
      height: 100%;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
    }
  `;
  document.head.appendChild(style);
}

registerRootComponent(App);