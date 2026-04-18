export const runWithLimit = <T,>(work: Promise<T>, timeoutMs: number, label: string) => new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${label}.`)), timeoutMs);
    work.then((value) => {
        clearTimeout(timer);
        resolve(value);
    }).catch((error) => {
        clearTimeout(timer);
        reject(error);
    });
});
