import './styles.css';
import { App } from './app/App';
import { readParams } from './app/params';

declare global {
  interface Window {
    __wbBooted?: boolean;
    __wbReset?: (done: () => void) => void;
  }
}

const app = new App(readParams());
// the app script ran: tell the boot watchdog in index.html to stand down
window.__wbBooted = true;
app.boot().catch((e: unknown) => {
  app.errors.push('boot', e);
  app.showStart();
});
