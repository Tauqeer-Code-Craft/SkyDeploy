const express = require('express');
const bodyParser = require('body-parser');
const { Sequelize, DataTypes } = require('sequelize');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto'); // CommonJS
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const AdmZip = require('adm-zip');
const nodemailer = require('nodemailer');

const app = express();
app.use(bodyParser.json());

// Set up multer for zip uploads
const upload = multer({ dest: 'uploads/' });

const cors = require('cors');

// Allow all origins (not recommended for prod)
// app.use(cors());

// Or, allow only your dashboard domain:
app.use(cors({
  origin: ['http://localhost:3000'],
  methods: ['GET','POST','DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));


/* ----------------------------------------------------
   Environment / Proxy
---------------------------------------------------- */

const SKYDEPLOY_ENV = process.env.SKYDEPLOY_ENV || 'local';
const { addApp, removeApp } = require('../reverse-proxy-http/server');

const CADDY_CONTAINER = 'skydeploy-caddy';
const CADDYFILE_PATH = '../reverse-proxy/Caddyfile';

/* ----------------------------------------------------
   SQLite (Sequelize)
---------------------------------------------------- */

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './apps.sqlite',
  logging: false
});

sequelize.authenticate()
  .then(() => console.log('SQLite connected via Sequelize'))
  .catch(console.error);

/* ----------------------------------------------------
   Constants
---------------------------------------------------- */

const API_PORT = 4000;
let GLOBAL_APP_PORT = 5000;
let GLOBAL_AI_PORT = 6000;

const FRAMEWORKS = [
  'react', 'next', 'react-vite', 'nuxt',
  'nest', 'angular', 'svelte','express',
  'flask', 'fastapi', 'django', 'streamlit'
];

/* ----------------------------------------------------
   Helpers
---------------------------------------------------- */

function execPromise(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) return reject(stderr || err.message);
      resolve(stdout.trim());
    });
  });
}

function getNextPort() {
  while (GLOBAL_APP_PORT === API_PORT) {
    GLOBAL_APP_PORT++;
  }
  return GLOBAL_APP_PORT++;
}

function getNextAIPort() {
  while (GLOBAL_AI_PORT === API_PORT) {
    GLOBAL_AI_PORT++;
  }
  return GLOBAL_AI_PORT++;
}

function isPythonFramework(framework) {
  return ['flask', 'fastapi', 'django', 'streamlit'].includes(framework);
}

function addAppToCaddy(appName, port) {
  const block = `
${appName}.tauqeer.site {
  reverse_proxy localhost:${port}
}
`;
  fs.appendFileSync(CADDYFILE_PATH, block);
  exec(`docker exec ${CADDY_CONTAINER} caddy reload --config /etc/caddy/Caddyfile`);
}

function removeAppFromCaddy(appName) {
  const content = fs.readFileSync(CADDYFILE_PATH, 'utf8');
  const regex = new RegExp(`${appName}\\.tauqeer\\.site[\\s\\S]*?\\n}`, 'g');
  fs.writeFileSync(CADDYFILE_PATH, content.replace(regex, ''));
  return execPromise(`docker exec ${CADDY_CONTAINER} caddy reload --config /etc/caddy/Caddyfile`);
}

/* ----------------------------------------------------
   Schema
---------------------------------------------------- */

const AppModel = sequelize.define('App', {
  app_name: { type: DataTypes.STRING, unique: true, allowNull: false },
  git_repo_url: { type: DataTypes.STRING, allowNull: false },
  app_type: { type: DataTypes.STRING, allowNull: false },
  framework: { type: DataTypes.ENUM(...FRAMEWORKS), allowNull: false },
  project_root: { type: DataTypes.STRING, defaultValue: '' },
  port: DataTypes.INTEGER,
  container_id: DataTypes.STRING,
  access_url: DataTypes.STRING,
  status: { type: DataTypes.STRING, defaultValue: 'running' }
}, { timestamps: true });

/* ----------------------------------------------------
    User model
---------------------------------------------------- */
const UserModel = sequelize.define('User', {
  username: { type: DataTypes.STRING, unique: true, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { 
    type: DataTypes.ENUM('admin', 'user', 'ai role'), 
    defaultValue: 'user' 
  }
});

UserModel.beforeSave(async (user, options) => {
  if (user.changed('password')) {
    user.password = await bcrypt.hash(user.password, 10);
  }
});

/* ----------------------------------------------------
    DB model
---------------------------------------------------- */
const DBModel = sequelize.define('Database', {
  name: { type: DataTypes.STRING, unique: true, allowNull: false },
  type: { type: DataTypes.STRING, defaultValue: 'postgres' },
  connection_uri: { type: DataTypes.STRING, allowNull: false },
  container_id: DataTypes.STRING,
  volume: DataTypes.STRING,
  status: { type: DataTypes.STRING, defaultValue: 'running' }
}, { timestamps: true });

// Sync all models
sequelize.sync({ alter: true }).then(() => console.log('All models synchronized'));

// register
app.post('/register', async (req, res) => {
  try {
    const { username, password, role = 'user' } = req.body;
     console.log("BODY:", req.body);
    
    // Check if user exists
    const exists = await UserModel.findOne({ where: { username } });
    if (exists) return res.status(400).json({ success: false, error: 'Username already taken' });

    // Create user
    const user = await UserModel.create({ username, password, role });

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      "skedeploy",
      { expiresIn: '8h' }
    );

    res.json({ success: true, token });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// auth route 
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await UserModel.findOne({ where: { username } });
  if (!user) return res.status(401).json({ success: false, error: 'Invalid credentials' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ success: false, error: 'Invalid credentials' });

  const token = jwt.sign(
    { userId: user.id, username: user.username, role: user.role },
    "skedeploy",
    { expiresIn: '8h' }
  );

  res.json({ success: true, token });
});

// middleware 
function authMiddleware(requiredRole) {
  return (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ success: false, error: 'No token provided' });

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, "skedeploy");
      req.user = decoded;

      if (requiredRole && decoded.role !== requiredRole) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
      }

      next();
    } catch (err) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }
  };
}


/* ----------------------------------------------------
   Docker Deploy Functions (NO DB HERE)
---------------------------------------------------- */

async function deployApp({ app_name, git_repo_url, project_root, ENV_KEYS, port, app_type, local_app_path, memory_limit }) {
  let volumeMount = '';
  // If no git repo (or local path provided), map local directory to container
  if (local_app_path) {
    // Ensure absolute path
    const absPath = path.resolve(local_app_path);
    volumeMount = `-v "${absPath}":/home/app/repo`;
  }

  const cmd = `
docker run -d \
--name skydeploy-${app_name} \
--restart unless-stopped \
--cap-drop=ALL \
--security-opt no-new-privileges:true \
--memory="512m" --cpus="1.0" --pids-limit=100 \
-p ${port}:3000 \
${volumeMount} \
${git_repo_url ? `-e GIT_REPOSITORY__URL="${git_repo_url}"` : ''} \
-e PROJECT_ROOT="${project_root}" \
-e PORT=3000 \
-e APP_TYPE="${app_type}" \
${ENV_KEYS ? `-e ENV_KEYS="${ENV_KEYS}"` : ''} \
skydeploy-build-server
`.trim();

  return execPromise(cmd);
}

async function deployPython({ app_name, git_repo_url, project_root, ENV_KEYS, port, local_app_path, memory_limit }) {
  let volumeMount = '';
  if (local_app_path) {
    const absPath = path.resolve(local_app_path);
    volumeMount = `-v "${absPath}":/home/app/repo`;
  }

  const cmd = `
docker run -d \
--name skydeploy-${app_name} \
--restart on-failure:3 \
--cap-drop=ALL \
--security-opt no-new-privileges:true \
--memory="${memory_limit || '1g'}" --cpus="1.0" --pids-limit=100 \
-p ${port}:3000 \
${volumeMount} \
${git_repo_url ? `-e GIT_REPOSITORY__URL="${git_repo_url}"` : ''} \
-e PROJECT_ROOT="${project_root}" \
-e PORT=3000 \
${ENV_KEYS ? `-e ENV_KEYS="${ENV_KEYS}"` : ''} \
skydeploy-build-python
`.trim();

  return execPromise(cmd);
}

/* ----------------------------------------------------
   Email Notifications
---------------------------------------------------- */
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  auth: {
    user: process.env.SMTP_USER || 'test@ethereal.email',
    pass: process.env.SMTP_PASS || 'password123'
  }
});

async function sendDeploymentEmail(appName, accessUrl) {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'tauqeerahmed90673@gmail.com';
    const info = await transporter.sendMail({
      from: '"SkyDeploy" <noreply@skydeploy.local>',
      to: adminEmail,
      subject: `Deployment Success: ${appName}`,
      html: `
        <h2>Deployment Successful!</h2>
        <p>App <strong>${appName}</strong> has been successfully deployed and is running.</p>
        <p>Access it here: <a href="${accessUrl}">${accessUrl}</a></p>
      `
    });
    console.log(`Email sent successfully: ${info.messageId}`);
  } catch (err) {
    console.error(`Failed to send email for ${appName}:`, err);
  }
}

function execPromised(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) return reject(stderr || err.message);
      resolve(stdout.trim());
    });
  });
}

/**
 * Deploy a PostgreSQL container
 * @param {Object} options
 * @param {string} options.name - DB name
 * @param {boolean} options.demoMode - If true, expose to localhost for PgAdmin
 * @returns {Object} { container_id, volume, connection_uri }
 */
async function deployPostgres({ name, demoMode = false }) {
  const user = `user_${name}`;
  const password = crypto.randomBytes(12).toString('hex');
  const database = name;
  const volume = `skydeploy-pg-${name}`;

  const portMapping = demoMode ? '-p 5433:5432' : '';

  const cmd = `
docker run -d \
--name skydeploy-db-${name} \
--network skydeploy-net \
-e POSTGRES_USER=${user} \
-e POSTGRES_PASSWORD=${password} \
-e POSTGRES_DB=${database} \
-v ${volume}:/var/lib/postgresql/data \
${portMapping} \
postgres:16
`.trim();

  const container_id = await execPromised(cmd);

  const connection_uri = demoMode
    ? `postgresql://${user}:${password}@localhost:5433/${database}`
    : `postgresql://${user}:${password}@skydeploy-db-${name}:5432/${database}`;

  return { container_id, volume, connection_uri };
}


/* ----------------------------------------------------
   Routes
---------------------------------------------------- */

app.get('/health', (_, res) => res.send('OK'));

/* ---------- Deploy ---------- */

app.post('/deploy',authMiddleware('admin'), async (req, res) => {
  try {
    const { app_name, git_repo_url, framework, project_root = '', ENV_KEYS = '', memory_limit } = req.body;

    if (!FRAMEWORKS.includes(framework)) {
      throw new Error('Invalid framework');
    }

    const exists = await AppModel.findOne({ where: { app_name } });
    if (exists) throw new Error('App already exists');

    const port = getNextPort();

    const app_type = isPythonFramework(framework)
      ? 'python'
      : ['react', 'react-vite', 'nuxt', 'svelte', 'angular'].includes(framework)
        ? 'static'
        : 'server'; // Node backend apps

    const deployFn = isPythonFramework(framework) ? deployPython : deployApp;
    const container_id = await deployFn({ app_name, git_repo_url, project_root, ENV_KEYS, port, app_type, memory_limit });

    const access_url =
      SKYDEPLOY_ENV === 'local'
        ? `http://${app_name}.127.0.0.1.nip.io:8080`
        : `https://${app_name}.tauqeer.site`;

    if (SKYDEPLOY_ENV === 'local') addApp(app_name, port);
    else addAppToCaddy(app_name, port);

    const appDoc = await AppModel.create({
      app_name,
      git_repo_url: git_repo_url || '',
      framework,
      project_root,
      port,
      container_id,
      access_url,
      app_type,
      status: "running"
    });

    // Send email notification non-blocking
    sendDeploymentEmail(app_name, access_url);

    res.json({ success: true, app: appDoc });

  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/* ---------- Deploy ZIP ---------- */

function detectFramework(extractDir) {
  let framework = 'express'; // default
  let app_type = 'server';

  // Check for Node
  if (fs.existsSync(path.join(extractDir, 'package.json'))) {
    const pkg = JSON.parse(fs.readFileSync(path.join(extractDir, 'package.json'), 'utf8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    
    if (deps['next']) { framework = 'next'; app_type = 'static'; }
    else if (deps['react']) { framework = 'react'; app_type = 'static'; } // react-vite could also be checked
    else if (deps['nuxt']) { framework = 'nuxt'; app_type = 'static'; }
    else if (deps['svelte']) { framework = 'svelte'; app_type = 'static'; }
    else if (deps['@angular/core']) { framework = 'angular'; app_type = 'static'; }
    else { framework = 'express'; app_type = 'server'; }
  } 
  // Check for Python
  else if (fs.existsSync(path.join(extractDir, 'requirements.txt')) || fs.existsSync(path.join(extractDir, 'main.py')) || fs.existsSync(path.join(extractDir, 'app.py'))) {
    app_type = 'python';
    if (fs.existsSync(path.join(extractDir, 'requirements.txt'))) {
      const reqs = fs.readFileSync(path.join(extractDir, 'requirements.txt'), 'utf8').toLowerCase();
      if (reqs.includes('django')) framework = 'django';
      else if (reqs.includes('fastapi')) framework = 'fastapi';
      else if (reqs.includes('flask')) framework = 'flask';
      else if (reqs.includes('streamlit')) framework = 'streamlit';
      else framework = 'flask'; // generic fallback
    } else {
      framework = 'flask';
    }
  }

  return { framework, app_type };
}

app.post('/deploy/zip', authMiddleware('admin'), upload.single('file'), async (req, res) => {
  try {
    const { app_name, project_root = '', ENV_KEYS = '', memory_limit } = req.body;
    
    if (!req.file) throw new Error('Zip file is required');
    if (!app_name) throw new Error('app_name is required');

    const exists = await AppModel.findOne({ where: { app_name } });
    if (exists) throw new Error('App already exists');

    // Make target directory
    const targetDir = path.join(__dirname, 'apps', app_name);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Extract ZIP with Zip Slip prevention
    const zip = new AdmZip(req.file.path);
    const zipEntries = zip.getEntries();
    zipEntries.forEach((entry) => {
      if (entry.entryName.includes('..') || entry.entryName.startsWith('/')) {
         throw new Error('Security Violation: Zip slip path traversal detected in archive.');
      }
    });
    zip.extractAllTo(targetDir, true);

    // Clean up uploaded zip
    fs.unlinkSync(req.file.path);

    // Auto-detect framework
    const searchDir = project_root ? path.join(targetDir, project_root) : targetDir;
    const { framework, app_type } = detectFramework(searchDir);

    const port = getNextPort();
    const deployFn = isPythonFramework(framework) ? deployPython : deployApp;
    
    // Deploy container
    const container_id = await deployFn({ 
      app_name, 
      git_repo_url: '', // explicit empty for zip
      project_root, 
      ENV_KEYS, 
      port, 
      app_type,
      local_app_path: targetDir,
      memory_limit
    });

    const access_url =
      SKYDEPLOY_ENV === 'local'
        ? `http://${app_name}.127.0.0.1.nip.io:8080`
        : `https://${app_name}.tauqeer.site`;

    if (SKYDEPLOY_ENV === 'local') addApp(app_name, port);
    else addAppToCaddy(app_name, port);

    const appDoc = await AppModel.create({
      app_name,
      git_repo_url: 'ZIP_UPLOAD',
      framework,
      project_root,
      port,
      container_id,
      access_url,
      app_type,
      status: "running"
    });

    // Send email notification non-blocking
    sendDeploymentEmail(app_name, access_url);

    res.json({ success: true, app: appDoc });

  } catch (err) {
    if (req.file) fs.unlinkSync(req.file.path); // clean if error
    res.status(400).json({ success: false, error: err.message });
  }
});

/* ---------- AI Generate & Deploy ---------- */

app.post('/generate', authMiddleware('admin'), async (req, res) => {
  try {
    const { prompt, app_name } = req.body;

    if (!app_name || !prompt) {
      throw new Error('app_name and prompt are required');
    }

    const exists = await AppModel.findOne({ where: { app_name } });
    if (exists) throw new Error('App already exists');

    const systemPrompt = `You are an expert Frontend React Developer and UI/UX Designer. You MUST generate a beautiful, feature-rich, and highly polished MVP application based on the user's request.
CRITICAL REQUIREMENTS:
1. Do NOT generate bare minimum code. The UI must be stunning, well-structured, and use modern design principles (gradients, shadows, hover effects, proper padding).
2. The project scaffolding (Vite config, index.html, main.jsx, Dockerfile) is ALREADY provided automatically. Do NOT generate them.
3. You can use ANY external npm library you need via normal import statements (e.g., import { motion } from 'framer-motion'). They will be auto-installed.
4. You MUST NOT use UI component libraries like Chakra-UI, Material-UI, NextUI, or Ant-Design that require a App-level Provider wrapper, because you cannot edit main.jsx. You MUST use TailwindCSS for all styling.
5. You MUST generate 'src/App.jsx' file with the main functionality, and any additional component files you need.
6. Use TailwindCSS inline for all styling. Use 'lucide-react' for beautiful icons.
7. Output ONLY the files in the following strict XML format. NEVER output markdown wrappers (\`\`\`). Do not add any text outside the XML tags.

<file path="src/App.jsx">
import React from 'react';
import { Sparkles } from 'lucide-react';
export default function App() { return <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center"><Sparkles className="text-blue-500 mr-2"/> Hello Beautiful World</div>; }
</file>`;

    console.log(`Sending prompt to AI model for app: ${app_name}`);

    let generatedText = "";
    
    // Multi-LLM Routing
    const provider = process.env.AI_PROVIDER || 'ollama';

    if (provider === 'gemini') {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY is not set in environment");
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\nUser Request: ${prompt}` }] }]
        })
      });
      if (!response.ok) throw new Error('Failed to connect to Gemini API');
      const aiData = await response.json();
      generatedText = aiData.candidates[0].content.parts[0].text;
    } 
    else if (provider === 'claude') {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set in environment");
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 8192,
          messages: [{ role: "user", content: `${systemPrompt}\n\nUser Request: ${prompt}` }]
        })
      });
      if (!response.ok) throw new Error('Failed to connect to Anthropic API');
      const aiData = await response.json();
      generatedText = aiData.content[0].text;
    } 
    else {
      // Default to local Ollama
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'phi3',
          prompt: `${systemPrompt}\n\nUser Request: ${prompt}`,
          stream: false,
          options: {
            num_predict: 4096,
            temperature: 0.1
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to connect to local Phi-3 model. Is Ollama running on localhost:11434?');
      }
      const aiData = await response.json();
      generatedText = aiData.response;
    }

    // Sanitize AI Generated Text
    const suspiciousPatterns = [/child_process/, /exec\(/, /spawn\(/, /fs\./, /eval\(/];
    if (suspiciousPatterns.some(pattern => pattern.test(generatedText))) {
      throw new Error("Security Violation: AI output contains forbidden system calls or eval.");
    }

    // Parse XML-like format from AI
    const fileRegex = /<file path="([^"]+)">([\s\S]*?)<\/file>/g;
    let match;
    const files = [];
    let customDependencies = {};

    while ((match = fileRegex.exec(generatedText)) !== null) {
      const p = match[1].replace(/\\/g, '/');
      
      // Skip if AI hallucinated boilerplate
      if (p.includes('package.json') || p.includes('index.html') || p.includes('main.jsx') || p.includes('vite.config.js') || p.includes('Dockerfile')) {
          continue;
      }
      
      const content = match[2].trim();
      files.push({ path: p, content: content });

      // Auto-detect dependencies by parsing import statements
      if (p.endsWith('.js') || p.endsWith('.jsx')) {
        const importRegex = /from\s+['"]([a-zA-Z@][^'"]*)['"]/g;
        let importMatch;
        while ((importMatch = importRegex.exec(content)) !== null) {
          const fullPkg = importMatch[1];
          let pkgName = fullPkg;
          if (fullPkg.startsWith('@')) {
            const parts = fullPkg.split('/');
            if (parts.length >= 2) pkgName = parts[0] + '/' + parts[1];
          } else {
            pkgName = fullPkg.split('/')[0];
          }
          // Exclude react built-ins
          if (!['react', 'react-dom'].includes(pkgName)) {
             customDependencies[pkgName] = 'latest';
          }
        }
      }
    }

    // Merge AI dependencies with core Vite React dependencies
    const finalDependencies = {
      "react": "^18.2.0",
      "react-dom": "^18.2.0",
      "lucide-react": "^0.263.1", // Standardize lucide to a stable version
      ...customDependencies
    };

    if (files.length === 0) {
      console.error("AI Output:", generatedText);
      throw new Error('AI generated invalid output format. No files found.');
    }

    // Inject boilerplate files automatically
    files.push({
      path: 'package.json',
      content: `{
  "name": "${app_name}",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": ${JSON.stringify(finalDependencies, null, 4)},
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.3",
    "tailwindcss": "^3.4.1",
    "postcss": "^8.4.35",
    "autoprefixer": "^10.4.18",
    "vite": "^4.4.5"
  }
}`
    });

    files.push({
      path: 'index.html',
      content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AI App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`
    });

    files.push({
      path: 'src/main.jsx',
      content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);`
    });

    files.push({
      path: 'src/index.css',
      content: `@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
`
    });

    files.push({
      path: 'tailwind.config.js',
      content: `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}`
    });

    files.push({
      path: 'postcss.config.js',
      content: `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`
    });

    files.push({
      path: 'vite.config.js',
      content: `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
})`
    });

    files.push({
      path: 'Dockerfile',
      content: `FROM node:18-slim
WORKDIR /usr/src/app
COPY package*.json ./
COPY . .
RUN npm install
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]`
    });

    // Make target directory
    const targetDir = path.join(__dirname, 'apps', app_name);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Write generated files to the directory
    for (const file of files) {
      const filePath = path.join(targetDir, file.path);
      const dirPath = path.dirname(filePath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      fs.writeFileSync(filePath, file.content);
    }

    const port = getNextAIPort();
    
    // Deploy container directly from written files mapped as volume
    const container_id = await deployApp({ 
      app_name, 
      git_repo_url: '', // explicit empty so we don't try to git clone
      project_root: '', 
      ENV_KEYS: '', 
      port, 
      app_type: 'static',
      local_app_path: targetDir,
      memory_limit: '1g'
    });

    const access_url =
      SKYDEPLOY_ENV === 'local'
        ? `http://${app_name}.127.0.0.1.nip.io:8080`
        : `https://${app_name}.tauqeer.site`;

    if (SKYDEPLOY_ENV === 'local') addApp(app_name, port);
    else addAppToCaddy(app_name, port);

    const appDoc = await AppModel.create({
      app_name,
      git_repo_url: 'AI_GENERATED',
      framework: 'react',
      project_root: '',
      port,
      container_id,
      access_url,
      app_type: 'static',
      status: "running"
    });

    sendDeploymentEmail(app_name, access_url);

    res.json({ success: true, app: appDoc });

  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/apps/:app_name/logs', async (req, res) => {
  const { app_name } = req.params;

  // Verify app exists
  const appDoc = await AppModel.findOne({ where: { app_name } });
  if (!appDoc) {
    return res.status(404).json({ error: 'App not found' });
  }

  // Set SSE Headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  const dockerLogProcess = spawn('docker', ['logs', '-f', '--tail', '100', `skydeploy-${app_name}`]);

  dockerLogProcess.stdout.on('data', (data) => {
    const lines = data.toString().split('\n').filter(Boolean);
    lines.forEach(line => res.write(`data: ${line}\n\n`));
  });

  dockerLogProcess.stderr.on('data', (data) => {
    const lines = data.toString().split('\n').filter(Boolean);
    lines.forEach(line => res.write(`data: [ERR] ${line}\n\n`));
  });

  req.on('close', () => {
    dockerLogProcess.kill();
  });
});

/* ---------- Redeploy ---------- */

app.post('/apps/:app_name/redeploy',authMiddleware('admin') ,async (req, res) => {
  try {
    const { app_name } = req.params;
    const { ENV_KEYS = '' } = req.body;

    const appDoc = await AppModel.findOne({ where: { app_name } });
    if (!appDoc) throw new Error('App not found');

    if (appDoc.container_id) {
      await execPromise(`docker rm -f ${appDoc.container_id}`);
    }

    const isZip = appDoc.git_repo_url === 'ZIP_UPLOAD' || !appDoc.git_repo_url;
    const local_app_path = isZip ? path.join(__dirname, 'apps', app_name) : undefined;

    const deployFn = appDoc.app_type === 'python' ? deployPython : deployApp;
    const container_id = await deployFn({
      app_name,
      git_repo_url: appDoc.git_repo_url === 'ZIP_UPLOAD' ? '' : appDoc.git_repo_url,
      project_root: appDoc.project_root,
      ENV_KEYS,
      port: appDoc.port,
      app_type: appDoc.app_type,
      local_app_path
    });

    appDoc.container_id = container_id;
    appDoc.status = 'running';
    await appDoc.save();

    res.json({ success: true, app: appDoc });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ---------- Delete ---------- */

app.delete('/apps/:app_name', authMiddleware('admin'),async (req, res) => {
  try {
    const appDoc = await AppModel.findOne({ where: { app_name: req.params.app_name } });
    if (!appDoc) throw new Error('App not found');

    if (appDoc.container_id) {
      await execPromise(`docker rm -f ${appDoc.container_id}`);
    }

    if (SKYDEPLOY_ENV === 'local') removeApp(appDoc.app_name);
    else await removeAppFromCaddy(appDoc.app_name);

    await AppModel.destroy({ where: { app_name: appDoc.app_name } });

    res.json({ success: true, message: 'App deleted' });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ---------- List ---------- */

app.get('/apps', async (_, res) => {
  res.json(await AppModel.findAll());
});

app.get('/apps/:app_name', async (req, res) => {
  const app = await AppModel.findOne({ where: { app_name: req.params.app_name } });
  if (!app) return res.status(404).json({ error: 'Not found' });
  res.json(app);
});

// DB route
// POST /databases — create DB
app.post('/databases', async (req, res) => {
  try {
    const { name, demoMode = false } = req.body;

    // Check if DB already exists
    if (await DBModel.findOne({ where: { name } })) {
      throw new Error('Database already exists');
    }

    // Deploy Postgres
    const result = await deployPostgres({ name, demoMode });

    // Save DB in Mongo
    const db = await DBModel.create({
      name,
      type: 'postgres',
      container_id: result.container_id,
      volume: result.volume,
      connection_uri: result.connection_uri,
      status: 'running'
    });

    res.json({
      success: true,
      database: {
        name: db.name,
        connection_uri: db.connection_uri
      }
    });

  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /apps/:app_name/details — fetch full app info for frontend
app.get('/apps/:app_name/details', async (req, res) => {
  try {
    const { app_name } = req.params;

    // Find the app
    const app = await AppModel.findOne({ where: { app_name } });
    if (!app) return res.status(404).json({ success: false, error: 'App not found' });

    // Optional: if this app is linked to a DB, you can include DB info
    // Example: suppose you store database name in appDoc (you can adjust if needed)
    let database = null;
    if (app.database_name) {
      database = await DBModel.findOne({ where: { name: app.database_name } });
      if (database) {
        database = {
          name: database.name,
          type: database.type,
          connection_uri: database.connection_uri,
          status: database.status
        };
      }
    }

    // Send combined info
    res.json({
      success: true,
      app: {
        app_name: app.app_name,
        framework: app.framework,
        app_type: app.app_type,
        git_repo_url: app.git_repo_url,
        project_root: app.project_root,
        port: app.port,
        container_id: app.container_id,
        access_url: app.access_url,
        status: app.status,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
        database // null if none
      }
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


/* ----------------------------------------------------
   Reliability & Debugging Endpoints
---------------------------------------------------- */
const { analyzeFailure, summarizeLogs } = require('./aiEngine.js');
const { parseErrors } = require('./reliabilityEngine.js');

app.post('/apps/:app_name/debug', async (req, res) => {
  try {
    const { app_name } = req.params;
    const appDoc = await AppModel.findOne({ where: { app_name } });
    if (!appDoc) throw new Error('App not found');

    // Fetch container details
    let logs = '';
    let stats = {};
    let restarts = 0;
    let exitCode = 0;

    try {
      logs = await execPromise(`docker logs --tail 200 skydeploy-${app_name}`);
    } catch(e) { logs = String(e); }

    try {
      const statsStr = await execPromise(`docker stats --no-stream --format '{"cpu":"{{.CPUPerc}}","mem":"{{.MemUsage}}"}' skydeploy-${app_name}`);
      stats = JSON.parse(statsStr);
    } catch(e) { stats = { cpu: "Unknown", mem: "Unknown" }; }

    try {
      const countStr = await execPromise(`docker inspect -f "{{.RestartCount}}" skydeploy-${app_name}`);
      restarts = parseInt(countStr) || 0;
    } catch(e) {}
    
    try {
      const codeStr = await execPromise(`docker inspect -f "{{.State.ExitCode}}" skydeploy-${app_name}`);
      exitCode = parseInt(codeStr) || 0;
    } catch(e) {}

    const detected_errors = parseErrors(logs);

    const inputData = {
       logs: logs.substring(Math.max(0, logs.length - 2000)), // prevent overwhelming context
       detected_errors,
       exit_code: exitCode,
       memory_usage: stats.mem || "Unknown",
       cpu_usage: stats.cpu || "Unknown",
       restart_count: restarts,
       status: appDoc.status
    };

    const insight = await analyzeFailure(inputData);
    res.json({ success: true, insight });
  } catch(e) {
    res.status(500).json({ success: false, error: e.message });
  }
});


app.post('/apps/:app_name/logs/summary', async (req, res) => {
  try {
    const { app_name } = req.params;
    let logs = '';
    try {
      logs = await execPromise(`docker logs --tail 200 skydeploy-${app_name}`);
    } catch(e) { logs = String(e); }
    
    // Fallback if logs too large
    logs = logs.length > 5000 ? logs.substring(logs.length - 5000) : logs;
    
    const summary = await summarizeLogs(logs);
    res.json({ success: true, summary });
  } catch(e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/* ----------------------------------------------------
   Monitoring Loop
---------------------------------------------------- */
const restartTracker = {};

async function monitorContainers() {
  try {
    const apps = await AppModel.findAll();
    for (const app of apps) {
      if (!app.container_id) continue;

      // Ensure tracker exists
      if (!restartTracker[app.app_name]) restartTracker[app.app_name] = { lastCount: 0, timestamps: [] };
      const tracker = restartTracker[app.app_name];

      // 1. Crash Loop Detection
      try {
        const countStr = await execPromise(`docker inspect -f "{{.RestartCount}}" skydeploy-${app.app_name}`);
        const count = parseInt(countStr) || 0;
        
        if (count > tracker.lastCount) {
          const diff = count - tracker.lastCount;
          tracker.lastCount = count;
          const now = Date.now();
          for (let i = 0; i < diff; i++) tracker.timestamps.push(now);
        }

        // keep only last 60s
        tracker.timestamps = tracker.timestamps.filter(t => Date.now() - t < 60000);

        if (tracker.timestamps.length > 3 && app.status !== 'crash loop detected') {
          app.status = 'crash loop detected';
          await app.save();
          await execPromise(`docker stop skydeploy-${app.app_name}`);
          // Best effort trigger AI
          fetch(`http://127.0.0.1:${API_PORT}/apps/${app.app_name}/debug`, { method: 'POST' }).catch(() => {});
          continue; // skip health checks if crashed
        }
      } catch(e) {}

      // 2. Health Checks (Grace period + Timeout)
      if (app.status === 'running') {
        try {
          const startedAtStr = await execPromise(`docker inspect -f "{{.State.StartedAt}}" skydeploy-${app.app_name}`);
          const startedAt = new Date(startedAtStr).getTime();
          const uptimeSec = (Date.now() - startedAt) / 1000;
          
          if (uptimeSec > 15) { // 15s grace period
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
            try {
              const res = await fetch(`http://localhost:${app.port}/health`, { signal: controller.signal });
              clearTimeout(timeoutId);
              if (!res.ok) throw new Error("Not OK");
            } catch(e) {
              clearTimeout(timeoutId);
              app.status = 'unhealthy';
              await app.save();
              fetch(`http://127.0.0.1:${API_PORT}/apps/${app.app_name}/debug`, { method: 'POST' }).catch(() => {});
            }
          }
        } catch(e) {}
      }

      // 3. Traffic Protection (Log warnings if >90% usage)
      try {
        const statsStr = await execPromise(`docker stats --no-stream --format "{{.CPUPerc}}" skydeploy-${app.app_name}`);
        const cpuRaw = statsStr.replace('%', '');
        if (parseFloat(cpuRaw) > 90) {
          console.warn(`[WARNING] High CPU usage on ${app.app_name}: ${statsStr}`);
        }
      } catch(e) {}

    }
  } catch(e) {
    console.error("Monitor loop error:", e);
  }
}

// Start monitoring every 15 seconds
setInterval(monitorContainers, 15000);

/* ----------------------------------------------------
   Start
---------------------------------------------------- */

app.listen(API_PORT, () => {
  console.log(`🚀 SkyDeploy API running on http://localhost:${API_PORT}`);
});
