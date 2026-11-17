import React from 'react';
import ReactDOM from 'react-dom/client';
import { Theme } from '@astryxdesign/core/theme';
import { InternationalizationProvider } from '@astryxdesign/core/i18n';
import zhCN from '@astryxdesign/core/locales/zh-CN.generated.js';
import { neutralTheme } from '@astryxdesign/theme-neutral/built';
import '@astryxdesign/core/astryx.css';
import '@astryxdesign/theme-neutral/theme.css';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Theme theme={neutralTheme} mode="light">
      <InternationalizationProvider locale="zh-CN" messages={{ 'zh-CN': zhCN }}>
        <App />
      </InternationalizationProvider>
    </Theme>
  </React.StrictMode>
);
