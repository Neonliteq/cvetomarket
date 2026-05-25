import { build as esbuild } from "esbuild";
import { rm, readFile, unlink } from "fs/promises";
import { execSync } from "child_process";

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times
const allowlist = [
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  // Pre-compile vite.config.ts → vite.config.compiled.mjs at project root
  // so Vite loads it from outside node_modules (avoids ESM resolution bug
  // with node_modules/.vite-temp/ in Vite 7 + "type":"module" projects).
  const compiledConfig = "vite.config.compiled.mjs";
  await esbuild({
    entryPoints: ["vite.config.ts"],
    outfile: compiledConfig,
    format: "esm",
    platform: "node",
    bundle: true,
    packages: "external",
  });
  try {
    execSync(`node_modules/.bin/vite build --config ${compiledConfig}`, {
      stdio: "inherit",
    });
  } finally {
    await unlink(compiledConfig).catch(() => {});
  }

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
