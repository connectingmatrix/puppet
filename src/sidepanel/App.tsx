import { ClassPanel } from '@/src/sidepanel/components/ClassPanel';
import { SettingsPanel } from '@/src/sidepanel/components/SettingsPanel';
import { Toolbar } from '@/src/sidepanel/components/Toolbar';
import { TreePane } from '@/src/sidepanel/components/TreePane';
import { StylePanel } from '@/src/sidepanel/components/StylePanel';
import { readStructureMarks } from '@/src/sidepanel/lib/structure-diff';
import { useDomCompare } from '@/src/sidepanel/state/useDomCompare';
import { useRemoteSettings } from '@/src/sidepanel/state/useRemoteSettings';
import { useRemoteSocket } from '@/src/sidepanel/state/useRemoteSocket';
import { readCurrentTab, readRuntimeApi, readTabsApi } from '@/src/shared/extension-api';
import { useEffect, useState } from 'react';

const App = () => {
    const state = useDomCompare();
    const remote = useRemoteSettings();
    const [showSettings, setShowSettings] = useState(false);
    const [showOpenInTab, setShowOpenInTab] = useState(true);
    const marks = readStructureMarks(state.leftSnapshot.tree, state.rightSnapshot.tree);
    const remoteSocket = useRemoteSocket(remote.loading, remote.activeSettings);
    const openInTab = () => readTabsApi().create({ url: readRuntimeApi().getURL(`sidepanel.html${window.location.search || ''}`) });
    const saveSettings = async () => {
        const ok = await remote.save();
        if (ok) setShowSettings(false);
    };
    useEffect(() => {
        readCurrentTab().then((tab) => setShowOpenInTab(!tab)).catch(() => setShowOpenInTab(true));
    }, []);
    return (
        <main className="app-shell">
            <Toolbar leftTabId={state.leftTabId} rightTabId={state.rightTabId} selector={state.selector} loading={state.loading} remoteEntries={remoteSocket.entries} remoteInstanceId={remoteSocket.instanceId} remoteServerUrl={remote.activeSettings.serverUrl} remoteStatus={remoteSocket.status} showOpenInTab={showOpenInTab} tabs={state.tabs} onInspect={state.inspect} onRefresh={state.refreshTabs} onLeftTabChange={state.setLeftTabId} onRightTabChange={state.setRightTabId} onSelectorChange={state.setSelector} onOpenInTab={openInTab} onToggleSettings={() => setShowSettings((value) => !value)} />
            {state.error ? <div className="banner error">{state.error}</div> : null}
            {!state.error && remote.message && !showSettings ? <div className={`banner${remote.messageTone === 'danger' ? ' error' : ''}`}>{remote.message}</div> : null}
            {!state.error && state.loading ? <div className="banner">Reading DOM and computed styles from both tabs.</div> : null}
            {showSettings ? <SettingsPanel instanceId={remoteSocket.instanceId} loading={remote.loading} message={remote.message} saving={remote.saving} settings={remote.settings} onChange={remote.update} onSave={saveSettings} /> : null}
            <section className="compare-rows">
                <div className="compare-row">
                    <TreePane title="Left tree" root={state.leftSnapshot.tree} marks={marks.leftMarks} selectedPath={state.selectedPath} onSelect={(path) => void state.selectPath(path)} />
                    <TreePane title="Right tree" root={state.rightSnapshot.tree} marks={marks.rightMarks} selectedPath={state.selectedPath} onSelect={(path) => void state.selectPath(path)} />
                </div>
                <div className="compare-row">
                    <ClassPanel title="Left classes" detail={state.leftDetail} other={state.rightDetail} />
                    <ClassPanel title="Right classes" detail={state.rightDetail} other={state.leftDetail} />
                </div>
                <div className="compare-row">
                    <StylePanel title="Left computed styles" detail={state.leftDetail} other={state.rightDetail} />
                    <StylePanel title="Right computed styles" detail={state.rightDetail} other={state.leftDetail} />
                </div>
            </section>
        </main>
    );
};

export default App;
