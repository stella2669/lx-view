import React, { useState, useEffect } from 'react';
import type { AppInfo } from '../../types/app';
import { apiFetch } from '../../utils/api';
import BaseModal from '../shared/BaseModal';
import { Plus, Save, RotateCcw, AlertTriangle, ShieldCheck, ShieldX, Settings } from 'lucide-react';

interface AppManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AppManagementModal: React.FC<AppManagementModalProps> = ({ isOpen, onClose }) => {
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newApp, setNewApp] = useState<Partial<AppInfo>>({
    appKey: '',
    appName: '',
    appType: 'SPRING_BOOT',
    isActive: true
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<AppInfo>>({});

  const fetchApps = async () => {
    setIsLoading(true);
    try {
      const resp = await apiFetch('/api/apps');
      if (resp.ok) {
        const data = await resp.json();
        setApps(data);
      }
    } catch (e) {
      console.error('Failed to fetch apps', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchApps();
    }
  }, [isOpen]);

  const handleCreate = async () => {
    if (!newApp.appKey || !newApp.appName) return;
    try {
      const resp = await apiFetch('/api/apps', {
        method: 'POST',
        body: JSON.stringify(newApp)
      });
      if (resp.ok) {
        setNewApp({ appKey: '', appName: '', appType: 'SPRING_BOOT', isActive: true });
        fetchApps();
      } else {
        const err = await resp.json();
        alert(err.message || 'Failed to create app');
      }
    } catch (e) {
      console.error('Create error', e);
    }
  };

  const handleUpdateActive = async (app: AppInfo) => {
    try {
      const resp = await apiFetch(`/api/apps/${app.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...app, isActive: !app.isActive })
      });
      if (resp.ok) {
        fetchApps();
      }
    } catch (e) {
      console.error('Toggle error', e);
    }
  };

  const handleSaveEdit = async (id: number) => {
   try {
      const resp = await apiFetch(`/api/apps/${id}`, {
        method: 'PUT',
        body: JSON.stringify(editFormData)
      });
      if (resp.ok) {
        setEditingId(null);
        fetchApps();
      }
    } catch (e) {
      console.error('Update error', e);
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="App Management" defaultWidth={950}>
      <div className="space-y-6">
        {/* Register New App */}
        <section className="p-4 rounded-xl border border-border-main/50 bg-panel-header/20">
          <h3 className="text-sm font-bold text-text-accent mb-4 flex items-center gap-2">
            <Plus size={16} /> Register New Service
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-1.5">
              <label className="text-xs text-text-muted font-semibold">App Key (Unique)</label>
              <input
                type="text"
                placeholder="e.g. PAYMENT-SERVICE"
                className="w-full bg-base border border-border-main rounded-lg px-3 py-2 text-sm focus:border-text-accent outline-none text-text-main"
                value={newApp.appKey}
                onChange={e => setNewApp({ ...newApp, appKey: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-text-muted font-semibold">App Name (Display)</label>
              <input
                type="text"
                placeholder="e.g. 결제 연동 서비스"
                className="w-full bg-base border border-border-main rounded-lg px-3 py-2 text-sm focus:border-text-accent outline-none text-text-main"
                value={newApp.appName}
                onChange={e => setNewApp({ ...newApp, appName: e.target.value })}
              />
            </div>
             <div className="space-y-1.5">
              <label className="text-xs text-text-muted font-semibold">Type</label>
              <select
                className="w-full bg-base border border-border-main rounded-lg px-3 py-2 text-sm focus:border-text-accent outline-none text-text-main"
                value={newApp.appType}
                onChange={e => setNewApp({ ...newApp, appType: e.target.value })}
              >
                <option value="SPRING_BOOT">Spring Boot</option>
                <option value="NODEJS">Node.js</option>
                <option value="PYTHON">Python</option>
              </select>
            </div>
            <button
              onClick={handleCreate}
              className="bg-text-accent hover:bg-text-accent/80 text-white font-bold py-2 px-4 rounded-lg text-sm transition-all shadow-lg shadow-text-accent/20"
            >
              Add App
            </button>
          </div>
        </section>

        {/* Apps List */}
        <div className="relative overflow-hidden border border-border-main rounded-xl">
           <table className="w-full text-sm text-left">
            <thead className="bg-panel-header/50 text-text-muted text-xs uppercase tracking-wider font-bold">
              <tr>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">App Key</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Created At</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-main">
              {apps.map((app) => (
                <tr key={app.id} className={`hover:bg-panel-header/30 transition-colors ${!app.isActive ? 'opacity-60 bg-black/10' : ''}`}>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleUpdateActive(app)}
                      className={`flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        app.isActive 
                        ? 'bg-green-500/10 border-green-500/30 text-green-500' 
                        : 'bg-red-500/10 border-red-500/30 text-red-500'
                      }`}
                    >
                      {app.isActive ? <ShieldCheck size={12} /> : <ShieldX size={12} />}
                      {app.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </button>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-text-main">{app.appKey}</td>
                  <td className="px-6 py-4 font-semibold text-text-main">
                    {editingId === app.id ? (
                      <input 
                        className="bg-base border border-border-main px-2 py-1 rounded text-sm w-full text-text-main"
                        value={editFormData.appName}
                        onChange={e => setEditFormData({...editFormData, appName: e.target.value})}
                      />
                    ) : app.appName}
                  </td>
                  <td className="px-6 py-4 text-xs text-text-muted">
                    {editingId === app.id ? (
                      <select
                      className="bg-base border border-border-main px-2 py-1 rounded text-sm w-full text-text-main"
                      value={editFormData.appType}
                      onChange={e => setEditFormData({...editFormData, appType: e.target.value})}
                    >
                      <option value="SPRING_BOOT">Spring Boot</option>
                      <option value="NODEJS">Node.js</option>
                      <option value="PYTHON">Python</option>
                    </select>
                    ) : app.appType}
                  </td>
                  <td className="px-6 py-4 text-xs text-text-muted">
                    {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                       {editingId === app.id ? (
                         <button 
                            onClick={() => handleSaveEdit(app.id!)}
                            className="p-1.5 hover:bg-green-500/20 text-green-500 rounded-lg transition-all"
                            title="Save"
                          >
                            <Save size={16} />
                          </button>
                       ) : (
                        <button 
                          onClick={() => {
                            setEditingId(app.id!);
                            setEditFormData(app);
                          }}
                          className="p-1.5 hover:bg-text-accent/20 text-text-accent rounded-lg transition-all"
                          title="Edit"
                        >
                          <Settings size={16} />
                        </button>
                       )}
                       {editingId === app.id && (
                         <button 
                           onClick={() => setEditingId(null)}
                           className="p-1.5 hover:bg-panel-header rounded-lg transition-all text-text-muted"
                         >
                           <RotateCcw size={16} />
                         </button>
                       )}
                    </div>
                  </td>
                </tr>
              ))}
              {apps.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-text-muted italic">
                    No applications registered yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Warning Policy */}
        <div className="bg-red-500/5 p-4 rounded-xl border border-red-500/20 flex gap-3">
          <AlertTriangle className="text-red-500 shrink-0" size={20} />
          <div className="text-xs leading-relaxed">
            <p className="text-red-500 font-bold mb-1">Strict Data Policy</p>
            <p className="text-text-muted text-[11px]">
              미등록된 App Key로 수신되는 데이터는 모두 무시(Drop)됩니다. <br/>
              사용여부(ACTIVE)가 N인 경우에도 데이터베이스에 적재되지 않으니 주의하시기 바랍니다.
            </p>
          </div>
        </div>
      </div>
    </BaseModal>
  );
};

export default AppManagementModal;
