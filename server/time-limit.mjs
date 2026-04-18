export const runWithLimit = (work, timeoutMs, label) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${label}.`)), timeoutMs);
    work.then((value) => {
        clearTimeout(timer);
        resolve(value);
    }).catch((error) => {
        clearTimeout(timer);
        reject(error);
    });
});
