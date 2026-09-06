import type { Express } from "express";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import sharp from "sharp";

/**
 * On-the-fly image resizing (used via ?w=NNN on /objects/uploads/... URLs).
 * Results are cached in memory and served with immutable cache headers, so
 * mobile clients download a webp a fraction of the original size.
 */
const RESIZE_MAX_WIDTH = 1600;
const RESIZE_CACHE_LIMIT = 120;
const resizeCache = new Map<string, { data: Buffer; length: number }>();
let inflightResizes = 0;
const MAX_INFLIGHT_RESIZES = 2;

function clampInt(value: string | undefined, min: number, max: number, fallback: number): number {
  const n = parseInt(value ?? "", 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

async function resizeImage(buffer: Buffer, width: number, quality: number): Promise<Buffer> {
  return sharp(buffer, { limitInputPixels: 60 * 1000 * 1000 })
    .rotate() // honour EXIF orientation
    .resize({ width, withoutEnlargement: true })
    .webp({ quality })
    .toBuffer();
}

/**
 * Register object storage routes for file uploads.
 *
 * This provides example routes for the presigned URL upload flow:
 * 1. POST /api/uploads/request-url - Get a presigned URL for uploading
 * 2. The client then uploads directly to the presigned URL
 *
 * IMPORTANT: These are example routes. Customize based on your use case:
 * - Add authentication middleware for protected uploads
 * - Add file metadata storage (save to database after upload)
 * - Add ACL policies for access control
 */
export function registerObjectStorageRoutes(app: Express): void {
  const objectStorageService = new ObjectStorageService();

  /**
   * Request a presigned URL for file upload.
   *
   * Request body (JSON):
   * {
   *   "name": "filename.jpg",
   *   "size": 12345,
   *   "contentType": "image/jpeg"
   * }
   *
   * Response:
   * {
   *   "uploadURL": "https://storage.googleapis.com/...",
   *   "objectPath": "/objects/uploads/uuid"
   * }
   *
   * IMPORTANT: The client should NOT send the file to this endpoint.
   * Send JSON metadata only, then upload the file directly to uploadURL.
   */
  app.post("/api/uploads/request-url", async (req, res) => {
    try {
      const { name, size, contentType } = req.body;

      if (!name) {
        return res.status(400).json({
          error: "Missing required field: name",
        });
      }

      const uploadURL = await objectStorageService.getObjectEntityUploadURL();

      // Extract object path from the presigned URL for later reference
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

      res.json({
        uploadURL,
        objectPath,
        // Echo back the metadata for client convenience
        metadata: { name, size, contentType },
      });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  /**
   * Serve uploaded objects.
   *
   * GET /objects/:objectPath(*)
   *
   * This serves files from object storage. For public files, no auth needed.
   * For protected files, add authentication middleware and ACL checks.
   */
  app.get("/objects/{*objectPath}", async (req, res) => {
    try {
      const rawParam = (req.params as any).objectPath;
      const objectPath = `/objects/${Array.isArray(rawParam) ? rawParam.join("/") : rawParam}`;
      const objectFile = await objectStorageService.getObjectEntityFile(objectPath);

      // Resized variant requested: /objects/uploads/....jpg?w=800
      const requestedWidth = clampInt(String(req.query.w ?? ""), 16, RESIZE_MAX_WIDTH, 0);
      if (requestedWidth > 0 && objectPath.startsWith("/objects/uploads/")) {
        const quality = clampInt(String(req.query.q ?? ""), 50, 90, 80);
        const cacheKey = `${objectPath}|w=${requestedWidth}|q=${quality}`;

        let cached = resizeCache.get(cacheKey);
        if (!cached && inflightResizes < MAX_INFLIGHT_RESIZES) {
          inflightResizes += 1;
          try {
            const original = await objectFile.getBuffer();
            const resized = await resizeImage(original, requestedWidth, quality);
            cached = { data: resized, length: resized.length };
            resizeCache.set(cacheKey, cached);
            if (resizeCache.size > RESIZE_CACHE_LIMIT) {
              const oldest = resizeCache.keys().next().value;
              if (oldest !== undefined) resizeCache.delete(oldest);
            }
          } catch (err) {
            console.error("Error resizing object:", err);
          } finally {
            inflightResizes -= 1;
          }
        }

        if (cached) {
          res.set({
            "Content-Type": "image/webp",
            "Content-Length": String(cached.length),
            "Cache-Control": "public, max-age=31536000, immutable",
          });
          res.send(cached.data);
          return;
        }
        // Busy or resize failed — fall through to the original file below.
      }

      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "Object not found" });
      }
      return res.status(500).json({ error: "Failed to serve object" });
    }
  });
}

