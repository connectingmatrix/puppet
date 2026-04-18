import { resolveInterceptRequest } from '@/src/background/intercept-work';
import { RemoteMessage } from '@/src/shared/remote-types';

export const runRequestResolve = (message: RemoteMessage) => {
    const payload = message.payload || {};
    return resolveInterceptRequest(`${payload.pageId || ''}`, { ...(payload as any), type: 'resolve_request' });
};
