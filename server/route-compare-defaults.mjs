export const defaultRoutes = ['/'];

export const defaultSelectors = {
    aside: 'aside',
    badge: '[class*="badge" i]',
    body: 'body',
    button: 'button',
    card: '[class*="card" i]',
    combobox: '[role="combobox"]',
    header: 'header',
    input: 'input',
    main: 'main',
    nav: 'nav',
    panel: '[class*="panel" i]',
    svg: 'svg',
    table: 'table'
};

export const styleKeys = [
    'backgroundColor',
    'borderColor',
    'borderRadius',
    'boxShadow',
    'color',
    'fontSize',
    'fontWeight',
    'minHeight',
    'padding'
];

export const readRouteOptions = (body = {}) => ({
    artifactPath: body.artifactPath || '',
    currentBase: body.currentBase || body.rightBase || '',
    height: Number(body.height) || 1000,
    oldBase: body.oldBase || body.leftBase || '',
    routes: body.routes || defaultRoutes,
    selectors: body.selectors || defaultSelectors,
    settleMs: Number(body.settleMs) || 2200,
    styleKeys: body.styleKeys || styleKeys,
    timeoutMs: Number(body.timeoutMs) || 180000,
    waitUntil: body.waitUntil || 'domcontentloaded',
    width: Number(body.width) || 1440
});
