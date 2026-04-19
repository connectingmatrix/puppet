import { BrowserTab } from '@/src/sidepanel/types';
import { RemoteEvent } from '@/src/shared/remote-types';
import { RemoteLamp } from '@/src/sidepanel/components/RemoteLamp';

interface ToolbarProps {
    leftTabId: number;
    rightTabId: number;
    selector: string;
    loading: boolean;
    remoteEntries: RemoteEvent[];
    remoteInstanceId: string;
    remoteServerUrl: string;
    remoteSource: string;
    remoteStatus: 'connected' | 'connecting' | 'disconnected';
    tabs: BrowserTab[];
    onInspect: () => void;
    onRefresh: () => void;
    onLeftTabChange: (tabId: number) => void;
    onRightTabChange: (tabId: number) => void;
    onSelectorChange: (value: string) => void;
    onOpenInTab: () => void;
    onRestartBackground: () => void;
    onToggleSettings: () => void;
    showOpenInTab: boolean;
}

const RefreshIcon = () => (
    <svg aria-hidden="true" className="icon-svg" viewBox="0 0 24 24">
        <path d="M12 5a7 7 0 1 0 6.7 9h-2.1A5 5 0 1 1 12 7c1.3 0 2.5.5 3.4 1.3L13 10.6h7V3.7l-3.2 3.2A8.9 8.9 0 0 0 12 5Z" fill="currentColor" />
    </svg>
);

const SettingsIcon = () => (
    <svg aria-hidden="true" className="icon-svg" viewBox="0 0 24 24">
        <path d="M10.2 2h3.6l.7 2.6a7.8 7.8 0 0 1 1.8.8l2.4-1.2 2.6 2.6-1.2 2.4c.3.6.6 1.2.8 1.8l2.6.7v3.6l-2.6.7a7.8 7.8 0 0 1-.8 1.8l1.2 2.4-2.6 2.6-2.4-1.2a7.8 7.8 0 0 1-1.8.8l-.7 2.6h-3.6l-.7-2.6a7.8 7.8 0 0 1-1.8-.8L4.8 22l-2.6-2.6 1.2-2.4a7.8 7.8 0 0 1-.8-1.8L0 14.5v-3.6l2.6-.7c.2-.6.5-1.2.8-1.8L2.2 6l2.6-2.6 2.4 1.2c.6-.3 1.2-.6 1.8-.8L10.2 2Zm1.8 6.1A3.9 3.9 0 1 0 12 16a3.9 3.9 0 0 0 0-7.9Z" fill="currentColor" />
    </svg>
);

export const Toolbar = ({ leftTabId, rightTabId, selector, loading, remoteEntries, remoteInstanceId, remoteServerUrl, remoteSource, remoteStatus, showOpenInTab, tabs, onInspect, onRefresh, onLeftTabChange, onRightTabChange, onSelectorChange, onOpenInTab, onRestartBackground, onToggleSettings }: ToolbarProps) => (
    <section className="toolbar">
        <label className="control"><span>Left tab</span><select className="field" value={leftTabId || ''} onChange={(event) => onLeftTabChange(Number(event.target.value) || 0)}><option value="">Select</option>{tabs.map((tab) => <option key={tab.id} value={tab.id}>{tab.title}</option>)}</select></label>
        <label className="control"><span>Right tab</span><select className="field" value={rightTabId || ''} onChange={(event) => onRightTabChange(Number(event.target.value) || 0)}><option value="">Select</option>{tabs.map((tab) => <option key={tab.id} value={tab.id}>{tab.title}</option>)}</select></label>
        <label className="control"><span>Root selector</span><input className="field" value={selector} onChange={(event) => onSelectorChange(event.target.value)} placeholder="body, #app, .root" /></label>
        <div className="toolbar-actions">
            <button aria-label="Refresh tabs" className="btn subtle icon-btn" type="button" onClick={onRefresh}><RefreshIcon /></button>
            {showOpenInTab ? <button className="btn subtle toolbar-open" type="button" onClick={onOpenInTab}>Open in tab</button> : null}
            <RemoteLamp entries={remoteEntries} instanceId={remoteInstanceId} onRestart={onRestartBackground} serverUrl={remoteServerUrl} source={remoteSource} status={remoteStatus} />
            <button aria-label="Open settings" className="btn subtle icon-btn" type="button" onClick={onToggleSettings}><SettingsIcon /></button>
        </div>
        <button className="btn" type="button" disabled={loading} onClick={onInspect}>{loading ? 'Inspecting...' : 'Inspect DOM'}</button>
    </section>
);
