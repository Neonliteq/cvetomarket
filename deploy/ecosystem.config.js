module.exports = {
  apps: [
    {
      name: "cvetomarket",
      script: "npm",
      args: "start",
      cwd: "/var/www/cvetomarket",

      instances: "max",
      exec_mode: "cluster",

      watch: false,
      max_memory_restart: "512M",

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
