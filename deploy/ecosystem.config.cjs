const fs = require('fs');
const path = require('path');

const envFile = path.join(__dirname, '..', '.env');
const env = { NODE_ENV: 'production', PORT: 5000 };

if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, 'utf8').split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) return;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (key) env[key] = val;
  });
}

module.exports = {
  apps: [
    {
      name: 'cvetomarket',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/cvetomarket',

      instances: 1,
      exec_mode: 'cluster',

      watch: false,
      max_memory_restart: '512M',

      env,

      error_file: '/var/log/cvetomarket/error.log',
      out_file: '/var/log/cvetomarket/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
};
