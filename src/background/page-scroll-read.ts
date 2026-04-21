export const scrollPageTarget = (selector: string, index: number, deltaX: number, deltaY: number) => {
    const node = selector ? document.querySelectorAll(selector)[index || 0] as HTMLElement | null : null;
    if (selector && !node) throw new Error(`No element matches ${selector || ''}`);
    if (node) node.scrollBy({ left: deltaX || 0, top: deltaY || 0 });
    else window.scrollBy(deltaX || 0, deltaY || 0);
    const root = node || document.scrollingElement || document.documentElement;
    return {
        scrollHeight: root.scrollHeight,
        scrollLeft: node ? node.scrollLeft : window.scrollX,
        scrollTop: node ? node.scrollTop : window.scrollY,
        scrollWidth: root.scrollWidth
    };
};
