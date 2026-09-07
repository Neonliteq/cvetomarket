module.exports = {
  apps: [
    {
      name: "cvetomarket",
      script: "/var/www/cvetomarket/dist/index.cjs",
      cwd: "/var/www/cvetomarket",

      instances: 2,
      exec_mode: "cluster",
      // Cluster shares the port via Node's cluster module; the app uses
      // Postgres-backed sessions and HTTP polling (no WebSockets), so no
      // sticky sessions are required.

      watch: false,
      max_memory_restart: "512M",

      // NOTE: runs as the same user PM2 was started with (root on this
      // host), matching the previous fork setup — avoids chown issues with
      // dist/node_modules owned by the deploy user.

      env: {
        NODE_ENV: "production",
        PORT: 5000,
      },

      error_file: "/var/log/cvetomarket/error.log",
      out_file: "/var/log/cvetomarket/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",

      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: "10s",
    },
  ],
};
