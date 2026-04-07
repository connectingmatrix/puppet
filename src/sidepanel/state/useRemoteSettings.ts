import { useEffect, useState } from 'react';
import { readRemoteSettings, saveRemoteSettings } from '@/src/shared/remote-store';
import { RemoteSettings, remoteServerUrl } from '@/src/shared/remote-types';
import { readRemoteUrlOverride } from '@/src/shared/remote-url';

const emptySettings: RemoteSettings = { debugForeground: false, remoteEnabled: true, serverUrl: '', updatedAt: 0 };
const readActive = (settings: RemoteSettings) => {
    const serverUrl = readRemoteUrlOverride();
    return serverUrl ? { ...settings, serverUrl } : settings;
};

export const useRemoteSettings = () => {
    const [message, setMessage] = useState('');
    const [messageTone, setMessageTone] = useState<'base' | 'danger'>('base');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<RemoteSettings>(emptySettings);
    const [activeSettings, setActiveSettings] = useState<RemoteSettings>(emptySettings);

    useEffect(() => {
        readRemoteSettings().then((next) => {
            setSettings(next);
            setActiveSettings(readActive(next));
            setMessage('');
            setMessageTone('base');
        }).catch((error) => {
            setSettings((current) => ({ ...current, serverUrl: current.serverUrl || remoteServerUrl }));
            setActiveSettings((current) => readActive({ ...current, serverUrl: current.serverUrl || remoteServerUrl }));
            setMessage(error instanceof Error ? error.message : 'Could not load remote settings.');
            setMessageTone('danger');
        }).finally(() => {
            setLoading(false);
        });
    }, []);

    const update = (name: keyof RemoteSettings, value: string | boolean) => {
        setSettings((current) => ({ ...current, [name]: value }));
    };

    const save = async () => {
        setSaving(true);
        try {
            const next = await saveRemoteSettings(settings);
            setSettings(next);
            setActiveSettings(readActive(next));
            setMessage(readRemoteUrlOverride() ? 'Settings saved. This page keeps its URL-bound server.' : 'Settings saved. Reconnecting socket.');
            setMessageTone('base');
            return true;
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Could not save remote settings.');
            setMessageTone('danger');
            return false;
        } finally {
            setSaving(false);
        }
    };

    return { activeSettings, loading, message, messageTone, save, saving, settings, update };
};
