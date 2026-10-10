import type { Express } from "express";
import sharp from "sharp";
import path from "path";
import { contentTypeForName, localNameForObjectPath, readLocalObject } from "./localObjectStore";

/**
 * Отдача загруженных файлов (фото товаров, логотипы, аватары, фото сборки).
 *
 * Файлы хранятся **только на диске сервера**: `POST /api/upload` пишет их в
 * `<APP_DIR>/uploads/<name>`, а этот маршрут отдаёт их обратно:
 *
 *   GET /objects/uploads/<name>          → оригинал
 *   GET /objects/uploads/<name>?w=800    → webp-ресайз (кэшируется в памяти)
 *
 * Внешнее объектное хранилище (S3) не используется: если файла на диске нет,
 * отдаётся нейтральная заглушка, чтобы карточки товаров не ломались.
 */

/** Нейтральная заглушка, если файла нет на диске. */
const PLACEHOLDER_IMAGE = path.resolve(process.cwd(), "client/public/images/placeholder-bouquet.webp");

/**
 * Ресайз «на лету» через ?w=NNN. Результаты кэшируются в памяти и отдаются с
 * immutable-заголовками, поэтому мобильные клиенты получают webp в разы меньше.
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

export function registerObjectRoutes(app: Express): void {
  app.get("/objects/{*objectPath}", async (req, res) => {
    const rawParam = (req.params as any).objectPath;
    const objectPath = `/objects/${Array.isArray(rawParam) ? rawParam.join("/") : rawParam}`;
    const requestedWidth = clampInt(String(req.query.w ?? ""), 16, RESIZE_MAX_WIDTH, 0);
    const quality = clampInt(String(req.query.q ?? ""), 50, 90, 80);

    const localName = localNameForObjectPath(objectPath);
    if (!localName) {
      sendPlaceholder(res);
      return;
    }

    const original = await readLocalObject(localName);
    if (!original) {
      sendPlaceholder(res);
      return;
    }

    await sendObject(res, original, localName, requestedWidth, quality);
  });

  /** Заглушка, чтобы карточки товаров не показывали «битую» картинку. */
  function sendPlaceholder(res: any): void {
    res.set({
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=60",
      // Пусть nginx не кэширует заглушку: если файл появится, он отдастся сразу.
      "X-Accel-Expires": "0",
    });
    res.sendFile(PLACEHOLDER_IMAGE, (err: any) => {
      if (err && !res.headersSent) res.status(404).end();
    });
  }

  /** Отдать файл с диска, при `?w=` — уменьшенный webp. */
  async function sendObject(
    res: any,
    original: Buffer,
    name: string,
    requestedWidth: number,
    quality: number,
  ): Promise<void> {
    if (requestedWidth > 0) {
      const cacheKey = `${name}|w=${requestedWidth}|q=${quality}`;
      let cached = resizeCache.get(cacheKey);
      if (!cached && inflightResizes < MAX_INFLIGHT_RESIZES) {
        inflightResizes += 1;
        try {
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
      // Занято или ресайз не удался — отдаём оригинал ниже.
    }

    res.set({
      "Content-Type": contentTypeForName(name),
      "Content-Length": String(original.length),
      "Cache-Control": "public, max-age=31536000, immutable",
    });
    res.send(original);
  }
}
