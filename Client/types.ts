export interface User {
  username: string;
  role: 'admin' | 'dev';
}

export interface AuthResponse {
  success: boolean;
  token: string;
}

export interface DatabaseInfo {
  name: string;
  type?: string;
  connection_uri?: string;
  status?: string;
}

export interface AppData {
  app_name: string;
  git_repo_url: string;
  framework: string;
  app_type?: string;
  port: number;
  container_id?: string;
  access_url?: string;
  status: 'running' | 'stopped' | 'building' | 'failed';
  project_root?: string;
  createdAt?: string;
  updatedAt?: string;
  database?: DatabaseInfo | null;
}

export interface Database {
  id?: string;
  name: string;
  connection_uri: string;
  status?: string;
}

export interface CreateDatabaseRequest {
  name: string;
  demoMode?: boolean;
}

export interface DeployRequest {
  app_name: string;
  git_repo_url: string;
  framework: string;
  project_root?: string;
  ENV_KEYS: string;
}

export interface RedeployRequest {
  ENV_KEYS: string;
}

export const FRAMEWORKS = [
  'react', 'next', 'react-vite', 'nuxt', 'nest', 'angular', 
  'svelte', 'express', 'flask', 'fastapi', 'django', 'streamlit'
];