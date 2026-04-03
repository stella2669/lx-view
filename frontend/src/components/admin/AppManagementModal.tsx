import React, { useState, useEffect, useCallback } from 'react';
import type { AppInfo } from '../../types/app';
import { apiFetch } from '../../utils/api';
import BaseModal from '../shared/BaseModal';
import { Plus, Save, RotateCcw, AlertTriangle, ShieldCheck, ShieldX, Settings, Search, X } from 'lucide-react';

interface AppManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AppManagementModal: React.FC<AppManagementModalProps> = ({ isOpen, onClose }) => {
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [newApp, setNewApp] = useState<Partial<AppInfo>>({
    appKey: '',
    appName: '',
    appType: 'SPRING_BOOT',
    isActive: true
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<AppInfo>>({});

  const fetchApps = useCallback(async (query: string = '') => {
    setIsLoading(true);
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
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchApps(searchQuery);
    }
  }, [isOpen, fetchApps, searchQuery]);

  const handleCreate = async () => {
    if (!newApp.appKey || !newApp.appName) return;
    try {
      const resp = await apiFetch('/api/apps', {
        method: 'POST',
        body: JSON.stringify(newApp)
      });
      if (resp.ok) {
        setNewApp({ appKey: '', appName: '', appType: 'SPRING_BOOT', isActive: true });
        setIsRegistering(false);
        fetchApps(searchQuery);
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
        fetchApps(searchQuery);
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
        fetchApps(searchQuery);
      }
    } catch (e) {
      console.error('Update error', e);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="App Management" defaultWidth={950}>
      <div className="space-y-6">
        {/* Header Actions: Search & Add Button */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-panel-header/10 p-2 rounded-xl">
          <div className="relative w-full sm:w-80 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-text-accent transition-colors" />
            <input
              type="text"
              placeholder="Search by Key or Name..."
              className="w-full bg-base border border-border-main rounded-lg pl-10 pr-4 py-2 text-sm focus:border-text-accent outline-none text-text-main transition-all"
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={(e) => e.key === 'Enter' && fetchApps(searchQuery)}
            />
            {searchQuery && (
              <button 
                onClick={() => { setSearchQuery(''); fetchApps(''); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border ${
              isRegistering 
                ? 'bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20' 
                : 'bg-text-accent/10 border-text-accent/30 text-text-accent hover:bg-text-accent/20'
            }`}
          >
            {isRegistering ? <X size={16} /> : <Plus size={16} />}
            {isRegistering ? 'Cancel' : 'Add New App'}
          </button>
        </div>

        {/* Register New App (Toggle) */}
        {isRegistering && (
          <section className="p-4 rounded-xl border border-border-main/50 bg-panel-header/20 animate-in fade-in slide-in-from-top-2 duration-200">
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
        )}

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
                      className={`flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${
                        app.isActive 
                        ? 'bg-green-500/10 border-green-500/30 text-green-500 hover:bg-green-500/20' 
                        : 'bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20'
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
                    {searchQuery ? `No results found for "${searchQuery}"` : 'No applications registered yet.'}
                  </td>
                </tr>
              )}
              {isLoading && (
                 <tr>
                 <td colSpan={6} className="px-6 py-12 text-center text-text-muted italic">
                   Loading...
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
