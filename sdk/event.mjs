export class ConsoleMessage {
    constructor(page, event) {
        this.pageRef = page;
        this.event = event;
    }
    at() {
        return Number(this.event.at || 0);
    }
    args() {
        const items = [];
        for (const item of this.event.args || []) items.push(item);
        return items;
    }
    json() {
        return { ...this.event, args: this.args(), location: this.location() };
    }
    location() {
        return { ...(this.event.location || { columnNumber: 0, lineNumber: 0, url: '' }) };
    }
    page() {
        return this.pageRef;
    }
    source() {
        return this.event.source || 'console';
    }
    text() {
        return this.event.text || '';
    }
    type() {
        return this.event.type || 'log';
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
