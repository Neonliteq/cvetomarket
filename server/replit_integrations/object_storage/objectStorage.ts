import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { PassThrough } from "stream";
import type { Response } from "express";
import {
  ObjectAclPolicy,
  ObjectPermission,
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
} from "./objectAcl";

function createS3Client(): S3Client {
  return new S3Client({
    endpoint: process.env.REGRU_S3_ENDPOINT || "https://s3.regru.ru",
    region: process.env.REGRU_S3_REGION || "ru-1",
    credentials: {
      accessKeyId: process.env.REGRU_S3_ACCESS_KEY || "",
      secretAccessKey: process.env.REGRU_S3_SECRET_KEY || "",
    },
    forcePathStyle: true,
  });
}

let _s3: S3Client | null = null;
function getS3(): S3Client {
  if (!_s3) _s3 = createS3Client();
  return _s3;
}

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class S3File {
  constructor(
    public readonly bucket: string,
    public readonly key: string,
  ) {}

  get name(): string {
    return this.key;
  }

  async exists(): Promise<[boolean]> {
    try {
      await getS3().send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: this.key }),
      );
      return [true];
    } catch {
      return [false];
    }
  }

  async getMetadata(): Promise<[{ contentType?: string; size?: string }]> {
    const resp = await getS3().send(
      new HeadObjectCommand({ Bucket: this.bucket, Key: this.key }),
    );
    return [
      {
        contentType: resp.ContentType,
        size: resp.ContentLength?.toString(),
      },
    ];
  }

  createReadStream(): NodeJS.ReadableStream {
    const pass = new PassThrough();
    getS3()
      .send(new GetObjectCommand({ Bucket: this.bucket, Key: this.key }))
      .then(({ Body }) => {
        if (!Body) {
          pass.end();
          return;
        }
        (Body as unknown as NodeJS.ReadableStream).pipe(pass);
      })
      .catch((err) => pass.destroy(err));
    return pass;
  }

  async save(
    buffer: Buffer,
    opts: { contentType?: string; resumable?: boolean },
  ): Promise<void> {
    if (!process.env.REGRU_S3_ACCESS_KEY) {
      console.warn(
        "REGRU_S3_ACCESS_KEY not set — file upload skipped (dev mode without S3)",
      );
      return;
    }
    await getS3().send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: this.key,
        Body: buffer,
        ContentType: opts.contentType,
      }),
    );
  }
}

class S3Bucket {
  constructor(private readonly bucketName: string) {}

  file(objectName: string): S3File {
    return new S3File(this.bucketName, objectName);
  }
}

function resolveActualBucket(parsedName: string): string {
  return process.env.REGRU_S3_BUCKET || parsedName;
}

export const objectStorageClient = {
  bucket(name: string): S3Bucket {
    return new S3Bucket(resolveActualBucket(name));
  },
};

export class ObjectStorageService {
  constructor() {}

  getPublicObjectSearchPaths(): Array<string> {
    const bucket = process.env.REGRU_S3_BUCKET;
    if (bucket) return [`/${bucket}/public`];

    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    const paths = Array.from(
      new Set(
        pathsStr
          .split(",")
          .map((p) => p.trim())
          .filter((p) => p.length > 0),
      ),
    );
    if (paths.length === 0) {
      throw new Error(
        "REGRU_S3_BUCKET or PUBLIC_OBJECT_SEARCH_PATHS not set.",
      );
    }
    return paths;
  }

  getPrivateObjectDir(): string {
    const bucket = process.env.REGRU_S3_BUCKET;
    if (bucket) return `/${bucket}/.private`;

    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new Error(
        "REGRU_S3_BUCKET or PRIVATE_OBJECT_DIR not set.",
      );
    }
    return dir;
  }

  async searchPublicObject(filePath: string): Promise<S3File | null> {
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const fullPath = `${searchPath}/${filePath}`;
      const { bucketName, objectName } = parseObjectPath(fullPath);
      const file = new S3File(resolveActualBucket(bucketName), objectName);
      const [exists] = await file.exists();
      if (exists) return file;
    }
    return null;
  }

  async downloadObject(
    file: S3File,
    res: Response,
    cacheTtlSec: number = 3600,
  ): Promise<void> {
    try {
      const [metadata] = await file.getMetadata();
      const aclPolicy = await getObjectAclPolicy(file);
      const isPublic = aclPolicy?.visibility === "public";

      const headers: Record<string, string> = {
        "Content-Type": metadata.contentType || "application/octet-stream",
        "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}`,
      };
      if (metadata.size) headers["Content-Length"] = metadata.size;
      res.set(headers);

      const stream = file.createReadStream();
      stream.on("error", (err) => {
        console.error("Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });
      stream.pipe(res as any);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  async getObjectEntityUploadURL(): Promise<string> {
    throw new Error(
      "Presigned URLs are not supported for Reg.ru S3 in this adapter. Use POST /api/upload instead.",
    );
  }

  async getObjectEntityFile(objectPath: string): Promise<S3File> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) throw new ObjectNotFoundError();

    const entityId = parts.slice(1).join("/");
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) entityDir = `${entityDir}/`;

    const objectEntityPath = `${entityDir}${entityId}`;
    const { bucketName, objectName } = parseObjectPath(objectEntityPath);
    const file = new S3File(resolveActualBucket(bucketName), objectName);

    const [exists] = await file.exists();
    if (!exists) throw new ObjectNotFoundError();

    return file;
  }

  normalizeObjectEntityPath(rawPath: string): string {
    if (!rawPath.startsWith("https://")) return rawPath;
    try {
      const url = new URL(rawPath);
      return url.pathname;
    } catch {
      return rawPath;
    }
  }

  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy,
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/")) return normalizedPath;
    const objectFile = await this.getObjectEntityFile(normalizedPath);
    await setObjectAclPolicy(objectFile, aclPolicy);
    return normalizedPath;
  }

  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: S3File;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    return canAccessObject({
      userId,
      objectFile,
      requestedPermission: requestedPermission ?? ObjectPermission.READ,
    });
  }
}

function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith("/")) path = `/${path}`;
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }
  return {
    bucketName: pathParts[1],
    objectName: pathParts.slice(2).join("/"),
  };
}
