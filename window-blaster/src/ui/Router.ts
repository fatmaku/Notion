export interface Screen {
  el: HTMLElement;
  enter?(): void;
  exit?(): void;
}

/** Shows exactly one DOM screen inside #ui. */
export class Router {
  private current: Screen | null = null;
  constructor(private readonly host: HTMLElement) {}

  show(screen: Screen | null): void {
    this.current?.exit?.();
    while (this.host.firstChild) this.host.removeChild(this.host.firstChild);
    this.current = screen;
    if (screen) {
      this.host.append(screen.el);
      screen.enter?.();
    }
  }

  get active(): Screen | null {
    return this.current;
  }
}
