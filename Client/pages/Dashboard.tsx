import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getApps, deployApp } from '../services/api';
import { AppData, FRAMEWORKS } from '../types';
import { Button, Input, Select, Badge, Modal } from '../components/UI';
import { Plus, ExternalLink, GitBranch, Box, Terminal, ArrowRight, Server, Upload, Sparkles, Loader2 } from 'lucide-react';
import { deployZip, generateApp } from '../services/api';

const Dashboard: React.FC = () => {
  const { showToast } = useAuth();
  const [apps, setApps] = useState<AppData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [isDeployOpen, setIsDeployOpen] = useState(false);
  
  // Forms State
  const [deployMode, setDeployMode] = useState<'git' | 'zip' | 'ai'>('git');
  const [deployForm, setDeployForm] = useState({
    app_name: '',
    git_repo_url: '',
    framework: FRAMEWORKS[0],
    project_root: '',
    env_vars: '',
    memory_limit: '1g'
  });
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  
  const [actionLoading, setActionLoading] = useState(false);

  const fetchApps = async () => {
    try {
      setLoading(true);
      const data = await getApps();
      setApps(data);
    } catch (err) {
      showToast('Failed to load apps', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEnvProcessing = (raw: string): string => {
    return raw
      .split(',')
      .map(e => e.trim())
      .filter(e => e && !e.startsWith('PORT='))
      .join(',');
  };

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      if (deployMode === 'ai') {
        if (!aiPrompt) {
            showToast('Please provide an AI prompt', 'error');
            setActionLoading(false);
            return;
        }
        await generateApp(aiPrompt, deployForm.app_name);
      } else if (deployMode === 'git') {
        const payload = {
          ...deployForm,
          ENV_KEYS: handleEnvProcessing(deployForm.env_vars),
          memory_limit: deployForm.memory_limit
        };
        await deployApp(payload);
      } else {
        if (!zipFile) {
          showToast('Please select a Zip file', 'error');
          setActionLoading(false);
          return;
        }
        const formData = new FormData();
        formData.append('app_name', deployForm.app_name);
        formData.append('project_root', deployForm.project_root);
        formData.append('ENV_KEYS', handleEnvProcessing(deployForm.env_vars));
        formData.append('memory_limit', deployForm.memory_limit);
        formData.append('file', zipFile);
        await deployZip(formData);
      }

      showToast('Deployment started successfully', 'success');
      setIsDeployOpen(false);
      setDeployForm({ app_name: '', git_repo_url: '', framework: FRAMEWORKS[0], project_root: '', env_vars: '', memory_limit: '1g' });
      setZipFile(null);
      setAiPrompt('');
      fetchApps();
    } catch (err: any) {
      showToast(err?.response?.data?.error || 'Deployment failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Dashboard</h1>
          <p className="text-zinc-400 mt-1">Manage your deployments and instances.</p>
        </div>
        <Button onClick={() => setIsDeployOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Deploy New Project
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-lg border border-zinc-800 bg-zinc-900/50 animate-pulse" />
          ))}
        </div>
      ) : apps.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-zinc-800 rounded-xl">
          <Box className="mx-auto h-12 w-12 text-zinc-600 mb-4" />
          <h3 className="text-lg font-medium text-zinc-300">No apps deployed</h3>
          <p className="text-zinc-500 mb-6">Get started by deploying your first application.</p>
          <Button onClick={() => setIsDeployOpen(true)} variant="secondary">Deploy Now</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {apps.map((app) => (
            <Link 
              key={app.app_name} 
              to={`/apps/${app.app_name}`}
              className="group relative flex flex-col justify-between rounded-lg border border-zinc-800 bg-zinc-950 p-6 transition-all hover:border-zinc-500 hover:shadow-lg"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800">
                      <span className="font-bold text-zinc-400">{app.app_name.substring(0, 2).toUpperCase()}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-zinc-100 group-hover:text-white">{app.app_name}</h3>
                      <p className="text-xs text-zinc-500 flex items-center gap-1">
                        <GitBranch className="h-3 w-3" /> main
                      </p>
                    </div>
                  </div>
                  <Badge status={app.status} />
                </div>
                
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Framework</span>
                    <span className="text-zinc-300 capitalize">{app.framework}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Port</span>
                    <span className="font-mono text-zinc-300">{app.port}</span>
                  </div>
                  {app.access_url && (
                    <div className="flex items-center text-sm text-blue-400 mt-2 truncate">
                      <ExternalLink className="mr-1 h-3 w-3" />
                      <span className="truncate">{app.access_url}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-zinc-900 mt-auto">
                <span className="text-xs text-zinc-500">Manage App</span>
                <ArrowRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-300 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Deploy Modal */}
      <Modal 
        isOpen={isDeployOpen} 
        onClose={() => setIsDeployOpen(false)} 
        title="Deploy New Project"
      >
        <div className="flex gap-2 my-4 bg-zinc-900 border border-zinc-700/50 p-1 rounded-lg">
          <button 
            type="button"
            className={`flex-1 text-sm font-medium py-2 rounded-md transition-all ${deployMode === 'git' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
            onClick={() => setDeployMode('git')}
          >
             <GitBranch className="inline-block h-4 w-4 mr-2" /> Git Repo
          </button>
          <button 
            type="button"
            className={`flex-1 text-sm font-medium py-2 rounded-md transition-all ${deployMode === 'zip' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
            onClick={() => setDeployMode('zip')}
          >
             <Upload className="inline-block h-4 w-4 mr-2" /> Zip Upload
          </button>
          <button 
            type="button"
            className={`flex-1 text-sm font-medium py-2 rounded-md transition-all ${deployMode === 'ai' ? 'bg-indigo-600 text-white shadow-sm' : 'text-indigo-400 hover:text-indigo-300'}`}
            onClick={() => setDeployMode('ai')}
          >
             <Sparkles className="inline-block h-4 w-4 mr-2" /> AI App
          </button>
        </div>

        <form onSubmit={handleDeploy} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">App Name</label>
            <Input 
              required
              placeholder="my-awesome-app" 
              value={deployForm.app_name}
              onChange={e => setDeployForm({...deployForm, app_name: e.target.value})}
            />
          </div>
          {deployMode === 'git' ? (
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Git Repository URL</label>
              <Input 
                required
                placeholder="https://github.com/user/repo" 
                value={deployForm.git_repo_url}
                onChange={e => setDeployForm({...deployForm, git_repo_url: e.target.value})}
              />
            </div>
          ) : deployMode === 'zip' ? (
             <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Project Zip File</label>
              <input 
                type="file"
                accept=".zip"
                required
                onChange={e => {
                  if (e.target.files && e.target.files.length > 0) {
                    setZipFile(e.target.files[0]);
                  }
                }}
                className="w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-zinc-800 file:text-white hover:file:bg-zinc-700 cursor-pointer border border-zinc-800 rounded-md bg-zinc-950 p-2 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium text-indigo-400 flex items-center gap-2">
                 <Sparkles className="h-4 w-4" /> Prompt Phi-3 Mini to Generate
              </label>
              <textarea 
                required
                placeholder="A simple todo app with a stylish dark mode UI... (React/Vite project)" 
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-md p-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px]"
              />
            </div>
          )}

          {deployMode !== 'ai' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                {deployMode === 'git' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-400">Framework</label>
                    <Select 
                      value={deployForm.framework}
                      onChange={e => setDeployForm({...deployForm, framework: e.target.value})}
                    >
                      {FRAMEWORKS.map(fw => (
                        <option key={fw} value={fw}>{fw}</option>
                      ))}
                    </Select>
                  </div>
                )}
                <div className={`space-y-2 ${deployMode === 'zip' ? 'col-span-2' : ''}`}>
                  <label className="text-sm font-medium text-zinc-400">Project Root (Optional)</label>
                  <Input 
                    placeholder="./" 
                    value={deployForm.project_root}
                    onChange={e => setDeployForm({...deployForm, project_root: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Memory Limit</label>
                <Select 
                  value={deployForm.memory_limit}
                  onChange={e => setDeployForm({...deployForm, memory_limit: e.target.value})}
                >
                  <option value="512m">512 MB (Basic apps)</option>
                  <option value="1g">1 GB (Recommended)</option>
                  <option value="2g">2 GB (Heavy apps)</option>
                  <option value="4g">4 GB (Extreme)</option>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                  <Terminal className="h-3 w-3" /> Environment Variables
                </label>
                <Input 
                  placeholder="KEY=VALUE,KEY2=VALUE2" 
                  value={deployForm.env_vars}
                  onChange={e => setDeployForm({...deployForm, env_vars: e.target.value})}
                />
                <p className="text-xs text-zinc-500">Comma separated. PORT is handled automatically.</p>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 mt-6 border-t border-zinc-800 pt-4">
            <Button type="button" variant="ghost" onClick={() => setIsDeployOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={actionLoading} className={deployMode === 'ai' ? 'bg-indigo-600 hover:bg-indigo-700' : ''}>
              {actionLoading && deployMode === 'ai' ? (
                <><Loader2 className="animate-spin h-4 w-4 mr-2 block" /> Generating Source Code...</>
              ) : deployMode === 'ai' ? (
                <><Sparkles className="h-4 w-4 mr-2" /> Generate App</>
              ) : (
                'Deploy Project'
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Dashboard;