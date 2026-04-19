import { useState } from 'react';
import { RemoteEvent } from '@/src/shared/remote-types';

interface RemoteLampProps {
    entries: RemoteEvent[];
    instanceId: string;
    onRestart: () => void;
    serverUrl: string;
    source: string;
    status: 'connected' | 'connecting' | 'disconnected';
}

const readTime = (value: number) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export const RemoteLamp = ({ entries, instanceId, onRestart, serverUrl, source, status }: RemoteLampProps) => {
    const [open, setOpen] = useState(false);
    return (
        <div className="lamp-wrap">
            <button aria-label={`Socket ${status}`} className="lamp-btn" title={`Socket ${status}`} type="button" onClick={() => setOpen((value) => !value)}>
                <span className={`status-lamp is-${status}`} />
            </button>
            {open ? <section className="lamp-popup">
                <strong>Socket Status</strong>
                <div className="lamp-meta">{status}</div>
                <div className="lamp-meta">{source}</div>
                <div className="lamp-meta">{instanceId}</div>
                <div className="lamp-meta">{serverUrl}</div>
                <button className="btn subtle lamp-restart" type="button" onClick={() => void onRestart()}>Restart background worker</button>
                <div className="lamp-list">
                    {entries.length ? entries.map((entry, index) => <div key={`${entry.at}-${index}`} className={`lamp-entry is-${entry.tone}`}><span>{readTime(entry.at)}</span><span>{entry.text}</span></div>) : <div className="empty">No socket events yet.</div>}
                </div>
            </section> : null}
        </div>
    );
};
