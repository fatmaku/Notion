import './styles.css';
import { App } from './app/App';
import { readParams } from './app/params';

const app = new App(readParams());
void app.boot();
