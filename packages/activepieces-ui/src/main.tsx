import './i18n';

import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';

import App from './app/app';

/* eslint-disable @typescript-eslint/no-non-null-assertion */

const rootId = (window as any).__AB_ROOT_ID__ || 'root';
const base =
  (window as any).__AB_BASE_PATH__ || import.meta.env.BASE_URL || '/';
console.log('base', base);
const root = ReactDOM.createRoot(
  document.getElementById(rootId)! as HTMLElement,
);
root.render(
  <StrictMode>
    <App base={base} />
  </StrictMode>,
);
