export default class MockPdfDocument {
  private handlers: Record<string, Function[]> = {};

  on(event: string, handler: Function) {
    if (!this.handlers[event]) {
      this.handlers[event] = [];
    }
    this.handlers[event].push(handler);
  }

  end() {
    this.handlers['end']?.forEach((handler) => handler());
  }

  fontSize() {
    return this;
  }

  text() {
    return this;
  }

  moveDown() {
    return this;
  }
}
