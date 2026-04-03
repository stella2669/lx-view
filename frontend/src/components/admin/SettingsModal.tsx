import React, { useState, useEffect, useCallback } from 'react';
import type { AppInfo } from '../../types/app';
import { apiFetch } from '../../utils/api';
import BaseModal from '../shared/BaseModal';
import { Plus, Save, AlertTriangle, ShieldCheck, ShieldX, Settings, Search, X, Layers, Monitor } from 'lucide-react';
import { useDashboardStore, type WidgetInfo } from '../../store/useDashboardStore';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'apps' | 'widgets';

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('apps');
  
  // App Management State
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [isAppLoading, setIsAppLoading] = useState(false);
  const [isAppRegistering, setIsAppRegistering] = useState(false);
  const [appSearchQuery, setAppSearchQuery] = useState('');
  const [newApp, setNewApp] = useState<Partial<AppInfo>>({
    appKey: '',
    appName: '',
    appType: 'SPRING_BOOT',
    isActive: true
  });
  const [editingAppId, setEditingAppId] = useState<number | null>(null);
  const [editAppFormData, setEditAppFormData] = useState<Partial<AppInfo>>({});

  // Widget Management State
  const [widgets, setWidgets] = useState<WidgetInfo[]>([]);
  const [isWidgetLoading, setIsWidgetLoading] = useState(false);
  const [isWidgetRegistering, setIsWidgetRegistering] = useState(false);
  const [newWidget, setNewWidget] = useState<Partial<WidgetInfo>>({
    widgetType: '',
    label: '',
    description: '',
    minW: 8,
    minH: 8,
    isActive: true
  });

  const { fetchAvailableWidgets } = useDashboardStore();

  const fetchApps = useCallback(async (query: string = '') => {
    setIsAppLoading(true);
    try {
      const url = query ? `/api/apps?query=${encodeURIComponent(query)}` : '/api/apps';
      const resp = await apiFetch(url);
      if (resp.ok) {
        const data = await resp.json();
        setApps(data);
      }
    } catch (e) {
      console.error('Failed to fetch apps', e);
    } finally {
      setIsAppLoading(false);
    }
  }, []);

  const fetchWidgets = useCallback(async () => {
    setIsWidgetLoading(true);
    try {
      const resp = await apiFetch('/api/widgets');
      if (resp.ok) {
        const data = await resp.json();
        setWidgets(data);
      }
    } catch (e) {
      console.error('Failed to fetch widgets', e);
    } finally {
      setIsWidgetLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'apps') fetchApps(appSearchQuery);
      if (activeTab === 'widgets') fetchWidgets();
    }
  }, [isOpen, activeTab, fetchApps, appSearchQuery, fetchWidgets]);

  // App Handlers
  const handleCreateApp = async () => {
    if (!newApp.appKey || !newApp.appName) return;
    try {
      const resp = await apiFetch('/api/apps', {
        method: 'POST',
        body: JSON.stringify(newApp)
      });
      if (resp.ok) {
        setNewApp({ appKey: '', appName: '', appType: 'SPRING_BOOT', isActive: true });
        setIsAppRegistering(false);
        fetchApps(appSearchQuery);
      }
    } catch (e) {
      console.error('Create app error', e);
    }
  };

  const handleUpdateAppActive = async (app: AppInfo) => {
    try {
      const resp = await apiFetch(`/api/apps/${app.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...app, isActive: !app.isActive })
      });
      if (resp.ok) fetchApps(appSearchQuery);
    } catch (e) {
      console.error('Toggle app error', e);
    }
  };

  const handleSaveAppEdit = async (id: number) => {
    try {
      const resp = await apiFetch(`/api/apps/${id}`, {
        method: 'PUT',
        body: JSON.stringify(editAppFormData)
      });
      if (resp.ok) {
        setEditingAppId(null);
        fetchApps(appSearchQuery);
      }
    } catch (e) {
      console.error('Update app error', e);
    }
  };

  // Widget Handlers
  const handleCreateWidget = async () => {
    if (!newWidget.widgetType || !newWidget.label) return;
    try {
      const resp = await apiFetch('/api/widgets', {
        method: 'POST',
        body: JSON.stringify(newWidget)
      });
      if (resp.ok) {
        setNewWidget({ widgetType: '', label: '', description: '', minW: 8, minH: 8, isActive: true });
        setIsWidgetRegistering(false);
        fetchWidgets();
        fetchAvailableWidgets(); // 스토어 갱신
      }
    } catch (e) {
      console.error('Create widget error', e);
    }
  };

  const handleToggleWidgetActive = async (id: number) => {
    try {
      const resp = await apiFetch(`/api/widgets/${id}/toggle`, { method: 'PATCH' });
      if (resp.ok) {
        fetchWidgets();
        fetchAvailableWidgets(); // 스토어 갱신
      }
    } catch (e) {
      console.error('Toggle widget error', e);
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="System Settings" defaultWidth={1000}>
      <div className="flex flex-col h-full">
        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 border-b border-border-main pb-px">
          <button
            onClick={() => setActiveTab('apps')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-bold transition-all border-b-2 -mb-px ${
              activeTab === 'apps' 
                ? 'text-cyan-400 border-cyan-400 bg-cyan-400/5' 
                : 'text-text-muted border-transparent hover:text-text-main'
            }`}
          >
            <Layers size={16} />
            Applications
          </button>
          <button
            onClick={() => setActiveTab('widgets')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-bold transition-all border-b-2 -mb-px ${
              activeTab === 'widgets' 
                ? 'text-cyan-400 border-cyan-400 bg-cyan-400/5' 
                : 'text-text-muted border-transparent hover:text-text-main'
            }`}
          >
            <Monitor size={16} />
            Widgets
          </button>
        </div>

        {/* Tab Content: Apps */}
        {activeTab === 'apps' && (
          <div className="space-y-6 pb-10 animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-panel-header/10 p-2 rounded-xl">
              <div className="relative w-full sm:w-80 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-text-accent transition-colors" />
                <input
                  type="text"
                  placeholder="Search by Key or Name..."
                  className="w-full bg-base border border-border-main rounded-lg pl-10 pr-4 py-2 text-sm focus:border-text-accent outline-none text-text-main transition-all"
                  value={appSearchQuery}
                  onChange={e => setAppSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchApps(appSearchQuery)}
                />
              </div>

              <button
                onClick={() => setIsAppRegistering(!isAppRegistering)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border ${
                  isAppRegistering ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                }`}
              >
                {isAppRegistering ? <X size={16} /> : <Plus size={16} />}
                {isAppRegistering ? 'Cancel' : 'Add New App'}
              </button>
            </div>

            {isAppRegistering && (
              <section className="p-4 rounded-xl border border-border-main/50 bg-panel-header/20">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="space-y-1.5">
                    <label className="text-xs text-text-muted font-semibold">App Key</label>
                    <input
                      className="w-full bg-base border border-border-main rounded-lg px-3 py-2 text-sm text-text-main"
                      value={newApp.appKey}
                      onChange={e => setNewApp({ ...newApp, appKey: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-text-muted font-semibold">App Name</label>
                    <input
                      className="w-full bg-base border border-border-main rounded-lg px-3 py-2 text-sm text-text-main"
                      value={newApp.appName}
                      onChange={e => setNewApp({ ...newApp, appName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-text-muted font-semibold">Type</label>
                    <select
                      className="w-full bg-base border border-border-main rounded-lg px-3 py-2 text-sm text-text-main"
                      value={newApp.appType}
                      onChange={e => setNewApp({ ...newApp, appType: e.target.value })}
                    >
                      <option value="SPRING_BOOT">Spring Boot</option>
                      <option value="NODEJS">Node.js</option>
                      <option value="PYTHON">Python</option>
                    </select>
                  </div>
                  <button onClick={handleCreateApp} className="bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg text-sm">Add App</button>
                </div>
              </section>
            )}

            <div className="overflow-hidden border border-border-main rounded-xl">
              <table className="w-full text-sm text-left">
                <thead className="bg-panel-header/50 text-text-muted text-xs uppercase font-bold">
                  <tr>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">App Key</th>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-main">
                  {apps.map(app => (
                    <tr key={app.id} className={`hover:bg-panel-header/30 transition-colors ${!app.isActive ? 'opacity-60' : ''}`}>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleUpdateAppActive(app)}
                          className={`flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            app.isActive ? 'bg-green-500/10 border-green-500/30 text-green-500' : 'bg-red-500/10 border-red-500/30 text-red-500'
                          }`}
                        >
                          {app.isActive ? <ShieldCheck size={12} /> : <ShieldX size={12} />}
                          {app.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </button>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-text-main">{app.appKey}</td>
                      <td className="px-6 py-4 text-text-main font-semibold">
                        {editingAppId === app.id ? (
                          <input 
                            className="bg-base border border-border-main px-2 py-1 rounded text-sm w-full"
                            value={editAppFormData.appName}
                            onChange={e => setEditAppFormData({...editAppFormData, appName: e.target.value})}
                          />
                        ) : app.appName}
                      </td>
                      <td className="px-6 py-4 text-xs text-text-muted">{app.appType}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {editingAppId === app.id ? (
                            <button onClick={() => handleSaveAppEdit(app.id!)} className="p-1.5 text-green-500"><Save size={16} /></button>
                          ) : (
                            <button onClick={() => { setEditingAppId(app.id!); setEditAppFormData(app); }} className="p-1.5 text-cyan-400"><Settings size={16} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {isAppLoading && <div className="p-12 text-center text-text-muted italic">Loading...</div>}
            </div>
            
            <div className="bg-red-500/5 p-4 rounded-xl border border-red-500/20 flex gap-3 text-xs">
              <AlertTriangle className="text-red-500 shrink-0" size={18} />
              <div>
                <p className="text-red-500 font-bold">Strict Data Policy</p>
                <p className="text-text-muted">미등록된 App Key로 수신되는 데이터는 모두 무시(Drop)됩니다.</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: Widgets */}
        {activeTab === 'widgets' && (
          <div className="space-y-6 pb-10 animate-in fade-in duration-300">
            <div className="flex items-center justify-end">
              <button
                onClick={() => setIsWidgetRegistering(!isWidgetRegistering)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border ${
                  isWidgetRegistering ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                }`}
              >
                {isWidgetRegistering ? <X size={16} /> : <Plus size={16} />}
                {isWidgetRegistering ? 'Cancel' : 'Register New Widget'}
              </button>
            </div>

            {isWidgetRegistering && (
              <section className="p-4 rounded-xl border border-border-main/50 bg-panel-header/20">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-text-muted font-semibold">Widget Type (Key)</label>
                    <input
                      className="w-full bg-base border border-border-main rounded-lg px-3 py-2 text-sm text-text-main"
                      placeholder="e.g. MemoryChart"
                      value={newWidget.widgetType}
                      onChange={e => setNewWidget({ ...newWidget, widgetType: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-text-muted font-semibold">Display Label</label>
                    <input
                      className="w-full bg-base border border-border-main rounded-lg px-3 py-2 text-sm text-text-main"
                      placeholder="e.g. Memory Metrics"
                      value={newWidget.label}
                      onChange={e => setNewWidget({ ...newWidget, label: e.target.value })}
                    />
                  </div>
                   <div className="space-y-1.5">
                    <label className="text-xs text-text-muted font-semibold">Description</label>
                    <input
                      className="w-full bg-base border border-border-main rounded-lg px-3 py-2 text-sm text-text-main"
                      value={newWidget.description}
                      onChange={e => setNewWidget({ ...newWidget, description: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                   <div className="space-y-1.5">
                    <label className="text-xs text-text-muted font-semibold">Min Width (Grid)</label>
                    <input
                      type="number"
                      className="w-full bg-base border border-border-main rounded-lg px-3 py-2 text-sm text-text-main"
                      value={newWidget.minW}
                      onChange={e => setNewWidget({ ...newWidget, minW: parseInt(e.target.value) })}
                    />
                  </div>
                   <div className="space-y-1.5">
                    <label className="text-xs text-text-muted font-semibold">Min Height (Grid)</label>
                    <input
                      type="number"
                      className="w-full bg-base border border-border-main rounded-lg px-3 py-2 text-sm text-text-main"
                      value={newWidget.minH}
                      onChange={e => setNewWidget({ ...newWidget, minH: parseInt(e.target.value) })}
                    />
                  </div>
                  <button onClick={handleCreateWidget} className="bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg text-sm">Register</button>
                </div>
              </section>
            )}

            <div className="overflow-hidden border border-border-main rounded-xl">
              <table className="w-full text-sm text-left">
                <thead className="bg-panel-header/50 text-text-muted text-xs uppercase font-bold">
                  <tr>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Label</th>
                    <th className="px-6 py-4 text-center">Min Size</th>
                    <th className="px-6 py-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-main">
                  {widgets.map(w => (
                    <tr key={w.id} className={`hover:bg-panel-header/30 transition-colors ${!w.isActive ? 'opacity-60' : ''}`}>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleWidgetActive(w.id)}
                          className={`flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            w.isActive ? 'bg-green-500/10 border-green-500/30 text-green-500' : 'bg-red-500/10 border-red-500/30 text-red-500'
                          }`}
                        >
                          {w.isActive ? <ShieldCheck size={12} /> : <ShieldX size={12} />}
                          {w.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </button>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-text-main">{w.widgetType}</td>
                      <td className="px-6 py-4 text-text-main font-semibold">{w.label}</td>
                      <td className="px-6 py-4 text-center text-xs text-text-muted">
                        <span className="bg-panel px-2 py-0.5 rounded border border-border-main">{w.minW} x {w.minH}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Settings size={16} className="mx-auto text-text-muted cursor-not-allowed" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {isWidgetLoading && <div className="p-12 text-center text-text-muted italic">Loading...</div>}
            </div>
          </div>
        )}
      </div>
    </BaseModal>
  );
};

export default SettingsModal;
