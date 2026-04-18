function parseErrors(logs) {
  const detected_errors = [];
  const lines = logs.split('\n');

  for (const line of lines) {
    if (line.includes('EADDRINUSE')) {
      detected_errors.push({
        type: 'Port conflict',
        explanation: 'The application tried to bind to a port that is already in use.',
        fix: 'Change the application port or kill the process using this port.'
      });
    }
    if (line.includes('exit code 137') || line.includes('OOMKilled')) {
      detected_errors.push({
        type: 'Out of Memory (OOM)',
        explanation: 'Container exceeded its 512MB memory limit.',
        fix: 'Optimize application memory usage or increase the limit.'
      });
    }
    if (line.includes('MODULE_NOT_FOUND') || line.includes('Cannot find module')) {
      detected_errors.push({
        type: 'Missing dependency',
        explanation: 'A required npm module or python package is missing.',
        fix: 'Ensure all dependencies are listed in package.json or requirements.txt.'
      });
    }
    if (line.includes('ECONNREFUSED')) {
      detected_errors.push({
        type: 'Service unreachable',
        explanation: 'The app tried to connect to an external service (like a DB) but it refused the connection.',
        fix: 'Check if the external service is running and accessible.'
      });
    }
    if (line.includes('permission denied') || line.includes('EACCES')) {
      detected_errors.push({
        type: 'Permission issue',
        explanation: 'The application does not have the necessary file system permissions.',
        fix: 'Check file ownership or run the container/process with appropriate privileges.'
      });
    }
  }

  // Deduplicate
  const unique_errors = [];
  const seenTypes = new Set();
  for (const e of detected_errors) {
    if (!seenTypes.has(e.type)) {
      seenTypes.add(e.type);
      unique_errors.push(e);
    }
  }

  return unique_errors;
}

module.exports = {
  parseErrors
};
