export class ConsoleMessage {
    constructor(event) {
        this.event = event;
    }
    text() {
        return this.event.text || '';
    }
}

export class RequestHandle {
    constructor(page, event) {
        this.event = event;
        this.page = page;
        this.done = false;
    }
    url() {
        return this.event.url || '';
    }
    method() {
        return this.event.method || '';
    }
    isInterceptResolutionHandled() {
        return this.done;
    }
    async send(mode, value = {}) {
        if (this.done) return true;
        await this.page.browser.live.command('request.resolve', { ...value, mode, pageId: this.page.pageId, requestId: this.event.requestId || '' });
        this.done = true;
        return true;
    }
    abort() {
        return this.send('abort');
    }
    continue() {
        return this.send('observe');
    }
    respond(value = {}) {
        return this.send('fulfill', value);
    }
}
