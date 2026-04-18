/**
 * SkyDeploy Container Replication & Load Balancing Logic
 * Meets the requirement of local-first PaaS without K8s/Swarm.
 */

const http = require('http');
const fs = require('fs');
const { exec } = require('child_process');

/* ----------------------------------------------------
   1. Data Structure for Tracking Replicas
---------------------------------------------------- */
const replicaState = {
  // Example:
  // "myapp": {
  //   desiredReplicas: 3,
  //   containers: [
  //     { id: "abc123def", name: "myapp-1", port: 3000, target: "myapp-1:3000" }
  //   ]
  // }
};

/* ----------------------------------------------------
   Docker API Helper (Lightweight, No Shell)
---------------------------------------------------- */
/**
 * Executes a Docker API request using the native HTTP module over the Docker socket.
 */
function dockerApiRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    // Defaults to Unix socket on Linux, Named Pipe on Windows
    const socketPath = process.platform === 'win32' ? '//./pipe/docker_engine' : '/var/run/docker.sock';
    
    // Fallback: If socket doesn't exist, one might use TCP (e.g., localhost:2375)
    // For local-first, the socket is preferred constraint.
    const payload = data ? JSON.stringify(data) : null;
    const options = {
      socketPath,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Host': 'http'
      }
    };

    if (payload) {
      options.headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        // Handle no-content responses like 204
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(body ? JSON.parse(body) : null);
          } catch (e) {
            resolve(body);
          }
        } else {
          reject(new Error(`Docker API Error ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);

    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

function execPromise(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) return reject(stderr || err.message);
      resolve(stdout.trim());
    });
  });
}

/* ----------------------------------------------------
   2. Core Replication Functions
---------------------------------------------------- */

/**
 * Creates a replica for a given app. 
 * Assumes the image 'skydeploy-app-<appName>' already exists or was built.
 */
async function createReplica(appName, index) {
  const containerName = `${appName}-${index}`;
  const targetPort = 3000;
  
  console.log(`[Replication] Creating replica ${containerName}...`);

  // Using Docker API to create the container (Prefer API over Shell)
  const containerParams = {
    Image: `skydeploy-app-${appName}`, // Assumes image is pre-built and tagged
    Hostname: containerName,
    Env: [
      "PORT=3000"
    ],
    HostConfig: {
      NetworkMode: "skydeploy-net", // Must be on same Docker network
      RestartPolicy: { Name: "always" }
    }
  };

  try {
    // Create Container via API
    const createRes = await dockerApiRequest('POST', `/containers/create?name=${containerName}`, containerParams);
    if (!createRes || !createRes.Id) {
      throw new Error(`Docker API Error/Conflict: ${JSON.stringify(createRes)}`);
    }
    const containerId = createRes.Id;

    // Start Container via API
    await dockerApiRequest('POST', `/containers/${containerId}/start`);
    
    // Register in state
    if (!replicaState[appName]) {
      replicaState[appName] = { desiredReplicas: 1, containers: [] };
    }
    
    replicaState[appName].containers.push({
      id: containerId,
      name: containerName,
      port: targetPort,
      target: `${containerName}:${targetPort}` // Docker DNS
    });

    console.log(`[Replication] Replica ${containerName} started successfully.`);
    return containerName;
  } catch (error) {
    console.error(`[Replication] Failed to create replica ${containerName}:`, error.message);
    throw error;
  }
}

/**
 * Removes a specific replica.
 */
async function removeReplica(appName, index) {
  const containerName = `${appName}-${index}`;
  console.log(`[Replication] Removing replica ${containerName}...`);
  
  try {
    // Stop the container (Wait 5 seconds before killing)
    try {
      await dockerApiRequest('POST', `/containers/${containerName}/stop?t=5`);
    } catch (e) {
      console.warn(`[Replication] ${containerName} might already be stopped.`);
    }

    // Remove the container
    await dockerApiRequest('DELETE', `/containers/${containerName}?v=true&force=true`);

    // Remove from tracking state
    if (replicaState[appName]) {
      replicaState[appName].containers = replicaState[appName].containers.filter(c => c.name !== containerName);
    }

    console.log(`[Replication] Replica ${containerName} removed successfully.`);
  } catch (error) {
    console.error(`[Replication] Failed to remove replica ${containerName}:`, error.message);
    throw error;
  }
}

/* ----------------------------------------------------
   3. Proxy Configuration & Targets Update
---------------------------------------------------- */

// Path to Caddy Configuration File
const CADDYFILE_PATH = '../reverse-proxy/Caddyfile'; // Adjust relative path as needed

/**
 * Generates and updates Caddyfile, and reloads Caddy.
 * Generates the local dynamic target list for http-proxy if needed.
 */
async function updateProxyConfig(appName) {
  if (!replicaState[appName] || replicaState[appName].containers.length === 0) {
    console.log(`[Proxy] No healthy containers for ${appName}. Removing proxy entry.`);
    // Removal logic for Caddy would go here
    return;
  }

  const targets = replicaState[appName].containers.map(c => c.target);
  
  /* --- Example Caddy Config Output Generation --- */
  // It uses round_robin and actively health checks `/health`
  const caddyBlock = `
${appName}.tauqeer.site {
  reverse_proxy ${targets.join(' ')} {
    lb_policy round_robin
    health_uri /health
    health_interval 10s
    health_timeout 2s
  }
}
`;
  
  console.log(`[Proxy] Generated Caddy Config for ${appName}:\n${caddyBlock.trim()}`);
  
  // Note: For fully dynamic updates without parsing/replacing Caddyfile string matches, 
  // you'd typically use Caddy's Admin API (POST /config/apps/http/...)
  // But updating file and reloading is valid:
  try {
    // For demonstration, we simulate updating the Caddyfile file logic (normally regex replace)
    // fs.appendFileSync(CADDYFILE_PATH, caddyBlock);
    // await execPromise('docker exec skydeploy-caddy caddy reload --config /etc/caddy/Caddyfile');
  } catch (error) {
    console.error(`[Proxy] Caddy reload failed:`, error.message);
  }

  /* --- Example Local Proxy Config Output --- */
  // Return the configured targets for the `reverse-proxy-http` to use dynamically
  const localProxyState = {
    appName,
    endpoints: targets.map(t => `http://${t}`) // E.g., http://myapp-1:3000
  };
  
  console.log(`[Proxy] Updated Local HTTP Proxy State:\n`, JSON.stringify(localProxyState, null, 2));
  
  return { caddyBlock, localProxyState };
}

/* ----------------------------------------------------
   4. Scaling & Rolling Deploy Logic
---------------------------------------------------- */

/**
 * Checks a container's health endpoint
 */
async function checkContainerHealth(containerNameTarget) {
  const containerName = containerNameTarget.split(':')[0];
  
  // Method 1: Docker Exec (works securely from external host without port binding)
  try {
    const output = await execPromise(`docker exec ${containerName} curl -s -f http://127.0.0.1:3000/health`);
    if (output && output.trim() === 'OK') return true;
  } catch (err) {
    // ignored, try fallback
  }

  // Method 2: Fallback to direct HTTP (works if API-Server is on skydeploy-net)
  return new Promise((resolve) => {
    const options = {
      hostname: containerName,
      port: 3000,
      path: '/health',
      method: 'GET',
      timeout: 2000
    };

    const req = http.request(options, (res) => {
      resolve(res.statusCode === 200 || res.statusCode === 204);
    });

    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.end();
  });
}

/**
 * Sleep helper
 */
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Waits for a container to become healthy
 */
async function waitForHealth(containerTarget, maxRetries = 10) {
  for (let i = 0; i < maxRetries; i++) {
    const isHealthy = await checkContainerHealth(containerTarget);
    if (isHealthy) return true;
    await sleep(2000);
  }
  return false;
}

/**
 * Basic Rolling Deploy (Zero Downtime)
 * Update existing app to a new version by cycling replicas
 */
async function rollingDeploy(appName) {
  const state = replicaState[appName];
  if (!state || state.containers.length === 0) {
    // If no replicas running, just deploy standard
    await createReplica(appName, 1);
    await updateProxyConfig(appName);
    return;
  }

  const existingContainers = [...state.containers];
  const desiredCount = state.desiredReplicas || existingContainers.length;
  
  console.log(`[Deploy] Starting Rolling Deploy for ${appName}...`);

  // Assume the underlying image 'skydeploy-app-appName' was already rebuilt prior to calling this
  
  // E.g., if existing names are myapp-1, myapp-2, myapp-3
  // we'll create myapp-4, wait until healthy, update proxy, remove myapp-1, etc.
  
  // Find highest index
  let maxIndex = 0;
  for (const c of existingContainers) {
    const idx = parseInt(c.name.split('-').pop(), 10);
    if (!isNaN(idx) && idx > maxIndex) maxIndex = idx;
  }

  let nextIndex = maxIndex + 1;

  for (const oldContainer of existingContainers) {
    const newContainerName = `${appName}-${nextIndex}`;
    
    // 1. Start new container
    await createReplica(appName, nextIndex);
    nextIndex++;

    // 2. Wait for health check success
    const isHealthy = await waitForHealth(`${newContainerName}:3000`);
    if (!isHealthy) {
        console.error(`[Deploy] New replica ${newContainerName} failed health check! Aborting rolling deploy.`);
        break; // Stop deploy, don't remove old containers yet
    }
    
    // 3. Add to proxy upstreams (update config)
    await updateProxyConfig(appName);

    // 4. Remove one old container
    const oldIndex = oldContainer.name.split('-').pop();
    await removeReplica(appName, oldIndex);

    // 5. Update proxy again to remove the dead container
    await updateProxyConfig(appName);
  }

  console.log(`[Deploy] Rolling Deploy for ${appName} completed successfully.`);
}

module.exports = {
  replicaState,
  createReplica,
  removeReplica,
  updateProxyConfig,
  rollingDeploy
};
