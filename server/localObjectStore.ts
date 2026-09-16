import fsp from "fs/promises";
import path from "path";

/**
 * Local disk mirror for uploaded objects.
 *
 * Product photos (and other uploads) are backed by Reg.ru S3, but that service
 * has frequent maintenance windows. To keep the storefront working we keep a
 * copy of every uploaded object on the server's own disk and serve from there:
 *
 *   /objects/uploads/<name>   ->   <APP_DIR>/uploads/<name>
 *
 * Serving order: local file first; only when it is missing do we pull the
 * object from S3 once and persist it. New uploads are written locally and to
 * S3 (best effort), so a failed S3 write never fails an upload.
 */
const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");

export function uploadsDir(): string {
  return UPLOADS_DIR;
}

/** Map a `/objects/uploads/<name>` object path to its local file name, or null. */
export function localNameForObjectPath(objectPath: string): string | null {
  const prefix = "/objects/uploads/";
  if (!objectPath.startsWith(prefix)) return null;
  const raw = objectPath.slice(prefix.length);
  if (!raw) return null;
  // Strip directories to make path traversal impossible.
  const name = path.basename(raw);
  if (!name || name === "." || name === "..") return null;
  return name;
}

export function localPathForName(name: string): string {
  return path.join(UPLOADS_DIR, path.basename(name));
}

export async function ensureUploadsDir(): Promise<void> {
  await fsp.mkdir(UPLOADS_DIR, { recursive: true });
}

export async function hasLocalObject(name: string): Promise<boolean> {
  try {
    const st = await fsp.stat(localPathForName(name));
    return st.isFile();
  } catch {
    return false;
  }
}

export async function readLocalObject(name: string): Promise<Buffer | null> {
  try {
    return await fsp.readFile(localPathForName(name));
  } catch {
    return null;
  }
}

export async function writeLocalObject(name: string, data: Buffer): Promise<void> {
  await ensureUploadsDir();
  const target = localPathForName(name);
  // Write to a temp file and rename so readers never see a partial file.
  const tmp = `${target}.tmp-${process.pid}-${Date.now()}`;
  await fsp.writeFile(tmp, data);
  await fsp.rename(tmp, target);
}

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
};

export function contentTypeForName(name: string): string {
  return CONTENT_TYPES[path.extname(name).toLowerCase()] || "application/octet-stream";
}
