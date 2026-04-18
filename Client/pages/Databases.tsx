import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { createDatabase, getDatabases } from '../services/api';
import { Database } from '../types';
import { Button, Input, Modal } from '../components/UI';
import { Database as DbIcon, Plus, Copy, Check, AlertTriangle, Server } from 'lucide-react';

const Databases: React.FC = () => {
  const { showToast } = useAuth();
  const [databases, setDatabases] = useState<Database[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [dbName, setDbName] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  
  // Success State
  const [createdDb, setCreatedDb] = useState<Database | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchDatabases = async () => {
    try {
      setLoading(true);
      const data = await getDatabases();
      // Ensure data is an array
      setDatabases(Array.isArray(data) ? data : []);
    } catch (err) {
      // Silent fail for listing if API isn't ready
      setDatabases([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatabases();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreatedDb(null);
    try {
      // demoMode is hardcoded to true as per requirements
      const newDb = await createDatabase({ name: dbName, demoMode: true });
      setCreatedDb(newDb);
      showToast('Database created successfully', 'success');
      setDbName('');
      fetchDatabases();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to create database';
      showToast(msg, 'error');
    } finally {
      setCreateLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast('Connection URI copied to clipboard', 'success');
  };

  // Close modal and reset specific states
  const closeCreateModal = () => {
    setIsCreateOpen(false);
    setCreatedDb(null);
    setDbName('');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Databases</h1>
          <p className="text-zinc-400 mt-1">Provision and manage serverless databases.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Create Database
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 rounded-lg border border-zinc-800 bg-zinc-900/50 animate-pulse" />
          ))}
        </div>
      ) : databases.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
          <DbIcon className="mx-auto h-12 w-12 text-zinc-600 mb-4" />
          <h3 className="text-lg font-medium text-zinc-300">No databases found</h3>
          <p className="text-zinc-500 mb-6">Create your first database to get started.</p>
          <Button onClick={() => setIsCreateOpen(true)} variant="secondary">Create Database</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {databases.map((db, idx) => (
            <div key={idx} className="flex flex-col justify-between rounded-lg border border-zinc-800 bg-zinc-950 p-6 transition-all hover:border-zinc-600">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-zinc-900 rounded-md border border-zinc-800">
                    <DbIcon className="h-5 w-5 text-zinc-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-zinc-100">{db.name}</h3>
                    <span className="text-xs text-green-500 flex items-center gap-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-green-500" /> Active
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-2 bg-zinc-900/50 rounded p-2 border border-zinc-800/50">
                <code className="text-xs text-zinc-500 font-mono break-all line-clamp-2">
                  {db.connection_uri}
                </code>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Database Modal */}
      <Modal 
        isOpen={isCreateOpen} 
        onClose={closeCreateModal} 
        title="Create New Database"
      >
        {!createdDb ? (
          <form onSubmit={handleCreate} className="space-y-4 mt-4">
            <p className="text-sm text-zinc-400">
              Provision a new Postgres database. This will generate a unique connection URI for your application.
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Database Name</label>
              <Input 
                required
                placeholder="my-db-prod" 
                value={dbName}
                onChange={e => setDbName(e.target.value)}
              />
            </div>
            
            <div className="bg-blue-900/10 border border-blue-900/30 rounded-md p-3 flex gap-3 items-start">
               <Server className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
               <div className="text-xs text-blue-200">
                  <span className="font-semibold block mb-1">Development Mode</span>
                  This database will be created in Demo Mode (Ephemeral storage).
               </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button type="button" variant="ghost" onClick={closeCreateModal}>Cancel</Button>
              <Button type="submit" isLoading={createLoading}>Create Database</Button>
            </div>
          </form>
        ) : (
          <div className="mt-4 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-green-400 bg-green-900/10 p-4 rounded-lg border border-green-900/30">
              <Check className="h-5 w-5" />
              <span className="font-medium">Database created successfully!</span>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Connection URI</label>
              <div className="relative group">
                <div className="w-full rounded-md border border-zinc-700 bg-zinc-900 p-3 pr-10 font-mono text-sm text-zinc-100 break-all">
                  {createdDb.connection_uri}
                </div>
                <button
                  onClick={() => copyToClipboard(createdDb.connection_uri)}
                  className="absolute right-2 top-2 p-1.5 rounded-md hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                >
                  {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-yellow-900/10 border border-yellow-900/30 p-3 rounded-md">
              <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0" />
              <p className="text-xs text-yellow-200/80">
                Please copy your connection string now. For security reasons, full credentials might not be shown again.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={closeCreateModal}>Done</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Databases;