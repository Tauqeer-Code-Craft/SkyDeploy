import React, { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login, register } from '../services/api';
import { Button, Input, Select } from '../components/UI';
import { Cloud } from 'lucide-react';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login: authLogin, showToast, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await login(username, password);
      if (data.success) {
        authLogin(data.token);
        showToast('Welcome back!', 'success');
        navigate('/dashboard');
      }
    } catch (err) {
      showToast('Invalid credentials', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Log in to SkyDeploy">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-400">Username</label>
          <Input 
            required 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            placeholder="dev_wizard"
          />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-sm font-medium text-zinc-400">Password</label>
            <span className="text-xs text-blue-400 cursor-pointer">Forgot?</span>
          </div>
          <Input 
            required 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
          />
        </div>
        <Button type="submit" className="w-full" isLoading={loading}>Log In</Button>
      </form>
      <div className="mt-6 text-center text-sm text-zinc-500">
        Don't have an account? <Link to="/register" className="text-zinc-100 hover:underline">Sign Up</Link>
      </div>
    </AuthLayout>
  );
};

export const Register: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('dev');
  const [loading, setLoading] = useState(false);
  const { login: authLogin, showToast, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await register(username, password, role);
      if (data.success) {
        authLogin(data.token);
        showToast('Account created successfully', 'success');
        navigate('/dashboard');
      }
    } catch (err) {
      showToast('Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Create your account">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-400">Username</label>
          <Input 
            required 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            placeholder="jdoe"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-400">Password</label>
          <Input 
            required 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-400">Role</label>
          <Select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="dev">Developer</option>
            <option value="admin">Admin</option>
          </Select>
        </div>
        <Button type="submit" className="w-full" isLoading={loading}>Sign Up</Button>
      </form>
      <div className="mt-6 text-center text-sm text-zinc-500">
        Already have an account? <Link to="/login" className="text-zinc-100 hover:underline">Log in</Link>
      </div>
    </AuthLayout>
  );
};

const AuthLayout: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="flex min-h-screen items-center justify-center p-4">
    <div className="w-full max-w-sm">
      <div className="flex flex-col items-center mb-8">
        <div className="h-10 w-10 bg-zinc-100 rounded-xl flex items-center justify-center mb-4">
          <Cloud className="h-6 w-6 text-black" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">{title}</h1>
      </div>
      <div className="border border-zinc-800 bg-zinc-950/50 p-6 rounded-xl shadow-xl">
        {children}
      </div>
    </div>
  </div>
);