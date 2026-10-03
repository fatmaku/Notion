import './styles.css';
import { App } from './app/App';
import { readParams } from './app/params';

declare global {
  interface Window {
    __wbBooted?: boolean;
    __wbBootOk?: () => void;
    __wbResetting?: boolean;
    __wbReset?: (done: () => void) => void;
  }
}

// ?reset=1 in progress: the watchdog unregisters the service worker and reloads – don't race it
if (!window.__wbResetting) {
  const app = new App(readParams());
  // the app script ran: tell the boot watchdog in index.html to stand down
  window.__wbBooted = true;
  window.__wbBootOk?.();
  app.boot().catch((e: unknown) => {
    app.errors.push('boot', e);
    app.showStart();
  });
}
