var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/config/env.ts
import dotenv from "dotenv";
var STORAGE_PROVIDERS, rawStorageProvider, ENV;
var init_env = __esm({
  "src/config/env.ts"() {
    "use strict";
    dotenv.config();
    STORAGE_PROVIDERS = ["CLOUDINARY", "AWS_S3", "AZURE_BLOB", "LOCAL"];
    rawStorageProvider = (process.env.STORAGE_PROVIDER || "CLOUDINARY").trim().toUpperCase();
    if (!STORAGE_PROVIDERS.includes(rawStorageProvider)) {
      throw new Error(`Invalid STORAGE_PROVIDER "${rawStorageProvider}". Expected one of: ${STORAGE_PROVIDERS.join(", ")}`);
    }
    ENV = {
      PORT: Number(process.env.PORT || 4e3),
      JWT_SECRET: process.env.JWT_SECRET,
      DATABASE_URL: process.env.DATABASE_URL,
      FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN,
      // Active Storage Provider: "CLOUDINARY" | "AWS_S3" | "AZURE_BLOB" | "LOCAL"
      STORAGE_PROVIDER: rawStorageProvider,
      CLOUD_NAME: process.env.CLOUD_NAME,
      CLOUD_API_KEY: process.env.CLOUD_API_KEY,
      CLOUD_API_SECRET: process.env.CLOUD_API_SECRET,
      CLOUD_FOLDER: process.env.CLOUD_FOLDER,
      // AWS S3 Credentials
      aws_s3_bucket: process.env.AWS_S3_BUCKET,
      aws_region: process.env.AWS_REGION,
      aws_access_key_id: process.env.AWS_ACCESS_KEY_ID,
      aws_secret_access_key: process.env.AWS_SECRET_ACCESS_KEY,
      // Azure Blob Storage Credentials
      azure_storage_account: process.env.AZURE_STORAGE_ACCOUNT,
      azure_storage_key: process.env.AZURE_STORAGE_KEY,
      azure_storage_container: process.env.AZURE_STORAGE_CONTAINER || "assets",
      azure_storage_connection_string: process.env.AZURE_STORAGE_CONNECTION_STRING,
      MODE: process.env.MODE,
      OLA_MAPS_API_KEY: process.env.OLA_MAPS_API_KEY,
      ADMIN_PIN: (process.env.ADMIN_PIN || "123456").trim()
    };
  }
});

// src/types/types.ts
var init_types = __esm({
  "src/types/types.ts"() {
    "use strict";
  }
});

// src/utils/response.util.ts
var ErrorResponse, SuccessResponse;
var init_response_util = __esm({
  "src/utils/response.util.ts"() {
    "use strict";
    ErrorResponse = class extends Error {
      constructor(message, statusCode2) {
        super(message);
        this.message = message;
        this.statusCode = statusCode2;
        this.statusCode = statusCode2;
        Error.captureStackTrace(this, this.constructor);
      }
      message;
      statusCode;
    };
    SuccessResponse = (res, message, data = {}, statusCode2 = 200) => {
      return res.status(statusCode2).json({
        success: true,
        message,
        data
      });
    };
  }
});

// src/lib/storage/providers/azure.provider.ts
import {
  BlobServiceClient,
  StorageSharedKeyCredential
} from "@azure/storage-blob";
var AzureBlobStorageProvider;
var init_azure_provider = __esm({
  "src/lib/storage/providers/azure.provider.ts"() {
    "use strict";
    init_env();
    AzureBlobStorageProvider = class {
      providerType = "AZURE_BLOB";
      account;
      container;
      client = null;
      constructor() {
        this.account = ENV.azure_storage_account || "";
        this.container = ENV.azure_storage_container || "assets";
        const key = ENV.azure_storage_key || "";
        const connectionString = ENV.azure_storage_connection_string;
        if (connectionString) {
          this.client = BlobServiceClient.fromConnectionString(connectionString);
        } else if (this.account && key) {
          const credential = new StorageSharedKeyCredential(this.account, key);
          this.client = new BlobServiceClient(
            `https://${this.account}.blob.core.windows.net`,
            credential
          );
        } else {
          console.warn(
            "[AzureBlobStorageProvider] Warning: Azure Storage credentials not fully configured in environment."
          );
        }
      }
      async upload(file, options) {
        if (!this.client) {
          throw new Error(
            "Azure Blob Storage credentials not configured. Please define AZURE_STORAGE_CONNECTION_STRING or AZURE_STORAGE_ACCOUNT and AZURE_STORAGE_KEY."
          );
        }
        const containerClient = this.client.getContainerClient(this.container);
        const blobName = `${options?.folder ? `${options.folder}/` : ""}${options?.publicId || `${Date.now()}-${file.originalname}`}`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        await blockBlobClient.uploadData(file.buffer, {
          blobHTTPHeaders: { blobContentType: file.mimetype }
        });
        const url = blockBlobClient.url;
        return {
          url,
          secureUrl: url,
          publicId: blobName,
          provider: "AZURE_BLOB",
          bytes: file.size,
          format: file.mimetype.split("/")[1] || "png"
        };
      }
      async delete(publicId) {
        if (!this.client) {
          return false;
        }
        try {
          const containerClient = this.client.getContainerClient(this.container);
          const blockBlobClient = containerClient.getBlockBlobClient(publicId);
          const response = await blockBlobClient.deleteIfExists();
          return Boolean(response.succeeded);
        } catch {
          return false;
        }
      }
      getUrl(publicId) {
        if (this.client) {
          const containerClient = this.client.getContainerClient(this.container);
          return containerClient.getBlockBlobClient(publicId).url;
        }
        return `https://${this.account}.blob.core.windows.net/${this.container}/${publicId}`;
      }
    };
  }
});

// src/lib/storage/providers/cloudinary.provider.ts
import { v2 as cloudinary } from "cloudinary";
var CloudinaryStorageProvider;
var init_cloudinary_provider = __esm({
  "src/lib/storage/providers/cloudinary.provider.ts"() {
    "use strict";
    init_env();
    CloudinaryStorageProvider = class {
      providerType = "CLOUDINARY";
      cloudName;
      apiKey;
      apiSecret;
      defaultFolder;
      constructor() {
        this.cloudName = ENV.CLOUD_NAME || "";
        this.apiKey = ENV.CLOUD_API_KEY || "";
        this.apiSecret = ENV.CLOUD_API_SECRET || "";
        this.defaultFolder = ENV.CLOUD_FOLDER || "garba";
        if (this.cloudName && this.apiKey && this.apiSecret) {
          cloudinary.config({
            cloud_name: this.cloudName,
            api_key: this.apiKey,
            api_secret: this.apiSecret,
            secure: true
          });
        } else {
          console.warn(
            "[CloudinaryStorageProvider] Warning: Cloudinary credentials not fully configured in environment."
          );
        }
      }
      async upload(file, options) {
        if (!this.cloudName || !this.apiKey || !this.apiSecret) {
          throw new Error(
            "Cloudinary credentials missing: CLOUD_NAME, CLOUD_API_KEY, and CLOUD_API_SECRET must be set."
          );
        }
        const folder = options?.folder || this.defaultFolder;
        const uploadOptions = {
          folder,
          resource_type: "image",
          format: "jpg"
        };
        if (options?.publicId !== void 0) {
          uploadOptions.public_id = options.publicId;
        }
        if (options?.overwrite !== void 0) {
          uploadOptions.overwrite = options.overwrite;
        }
        if (options?.tags !== void 0) {
          uploadOptions.tags = options.tags;
        }
        const result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, uploadResult2) => {
              if (error || !uploadResult2) {
                console.error("[Cloudinary Upload Error]", error);
                return reject(error || new Error("Cloudinary upload failed: No result returned"));
              }
              resolve(uploadResult2);
            }
          );
          uploadStream.end(file.buffer);
        });
        const uploadResult = {
          url: result.url,
          secureUrl: result.secure_url,
          publicId: result.public_id,
          provider: "CLOUDINARY",
          bytes: result.bytes || file.size,
          format: result.format || file.mimetype.split("/")[1] || "png"
        };
        if (result.width !== void 0) {
          uploadResult.width = result.width;
        }
        if (result.height !== void 0) {
          uploadResult.height = result.height;
        }
        return uploadResult;
      }
      async delete(publicId) {
        if (!this.cloudName || !this.apiKey || !this.apiSecret) {
          return false;
        }
        try {
          const result = await cloudinary.uploader.destroy(publicId);
          return result.result === "ok";
        } catch {
          return false;
        }
      }
      getUrl(publicId) {
        return cloudinary.url(publicId, { secure: true });
      }
    };
  }
});

// src/lib/storage/providers/s3.provider.ts
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
var AwsS3StorageProvider;
var init_s3_provider = __esm({
  "src/lib/storage/providers/s3.provider.ts"() {
    "use strict";
    init_env();
    AwsS3StorageProvider = class {
      providerType = "AWS_S3";
      bucket;
      region;
      client = null;
      constructor() {
        this.bucket = ENV.aws_s3_bucket || "";
        this.region = ENV.aws_region || "us-east-1";
        const accessKeyId = ENV.aws_access_key_id;
        const secretAccessKey = ENV.aws_secret_access_key;
        if (this.bucket && accessKeyId && secretAccessKey) {
          this.client = new S3Client({
            region: this.region,
            credentials: {
              accessKeyId,
              secretAccessKey
            }
          });
        } else {
          console.warn(
            "[AwsS3StorageProvider] Warning: AWS S3 credentials not fully configured in environment."
          );
        }
      }
      async upload(file, options) {
        if (!this.bucket || !this.client) {
          throw new Error(
            "AWS S3 credentials not configured. Please define AWS_S3_BUCKET, AWS_REGION, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY."
          );
        }
        const key = `${options?.folder ? `${options.folder}/` : ""}${options?.publicId || `${Date.now()}-${file.originalname}`}`;
        const command = new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype
        });
        await this.client.send(command);
        const url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
        return {
          url,
          secureUrl: url,
          publicId: key,
          provider: "AWS_S3",
          bytes: file.size,
          format: file.mimetype.split("/")[1] || "png"
        };
      }
      async delete(publicId) {
        if (!this.bucket || !this.client) {
          return false;
        }
        try {
          const command = new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: publicId
          });
          await this.client.send(command);
          return true;
        } catch {
          return false;
        }
      }
      getUrl(publicId) {
        return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${publicId}`;
      }
    };
  }
});

// src/lib/storage/storage.factory.ts
var StorageFactory;
var init_storage_factory = __esm({
  "src/lib/storage/storage.factory.ts"() {
    "use strict";
    init_env();
    init_azure_provider();
    init_cloudinary_provider();
    init_s3_provider();
    StorageFactory = class {
      static instance;
      static assertSelectedProviderIsConfigured(providerType) {
        const missing = (entries) => entries.filter(([, value]) => !value).map(([name]) => name);
        if (providerType === "CLOUDINARY") {
          const names = missing([
            ["CLOUD_NAME", ENV.CLOUD_NAME],
            ["CLOUD_API_KEY", ENV.CLOUD_API_KEY],
            ["CLOUD_API_SECRET", ENV.CLOUD_API_SECRET]
          ]);
          if (names.length) throw new Error(`Cloudinary is selected but these credentials are missing: ${names.join(", ")}`);
          return;
        }
        if (providerType === "AWS_S3") {
          const names = missing([
            ["AWS_S3_BUCKET", ENV.aws_s3_bucket],
            ["AWS_REGION", ENV.aws_region],
            ["AWS_ACCESS_KEY_ID", ENV.aws_access_key_id],
            ["AWS_SECRET_ACCESS_KEY", ENV.aws_secret_access_key]
          ]);
          if (names.length) throw new Error(`AWS S3 is selected but these credentials are missing: ${names.join(", ")}`);
          return;
        }
        if (providerType === "AZURE_BLOB") {
          const hasConnectionString = Boolean(ENV.azure_storage_connection_string);
          const hasAccountCredentials = Boolean(ENV.azure_storage_account && ENV.azure_storage_key);
          if (!hasConnectionString && !hasAccountCredentials) {
            throw new Error("Azure Blob is selected but credentials are missing. Set AZURE_STORAGE_CONNECTION_STRING or both AZURE_STORAGE_ACCOUNT and AZURE_STORAGE_KEY");
          }
          return;
        }
        throw new Error("LOCAL storage is not implemented. Select CLOUDINARY, AWS_S3, or AZURE_BLOB");
      }
      static getProvider(type) {
        if (this.instance && !type) {
          return this.instance;
        }
        const providerType = type || ENV.STORAGE_PROVIDER;
        this.assertSelectedProviderIsConfigured(providerType);
        let provider;
        switch (providerType) {
          case "AWS_S3":
            provider = new AwsS3StorageProvider();
            break;
          case "AZURE_BLOB":
            provider = new AzureBlobStorageProvider();
            break;
          case "CLOUDINARY":
            provider = new CloudinaryStorageProvider();
            break;
          default:
            throw new Error(`Unsupported storage provider: ${providerType}`);
        }
        if (!type) {
          this.instance = provider;
        }
        return provider;
      }
    };
  }
});

// src/lib/storage/storage.service.ts
var StorageService, storageService;
var init_storage_service = __esm({
  "src/lib/storage/storage.service.ts"() {
    "use strict";
    init_storage_factory();
    StorageService = class {
      constructor(provider = StorageFactory.getProvider()) {
        this.provider = provider;
      }
      provider;
      /**
       * Upload an asset to the active cloud storage provider.
       */
      async upload(file, options) {
        return this.provider.upload(file, options);
      }
      /**
       * Delete an asset from the active cloud storage provider.
       */
      async delete(publicId) {
        return this.provider.delete(publicId);
      }
      /**
       * Resolve public URL for an asset.
       */
      getUrl(publicId) {
        return this.provider.getUrl(publicId);
      }
      /**
       * Get the name of the currently active storage provider.
       */
      get activeProviderName() {
        return this.provider.providerType;
      }
    };
    storageService = new StorageService();
  }
});

// src/utils/upload.util.ts
var upload_util_exports = {};
__export(upload_util_exports, {
  assertSafeImage: () => assertSafeImage,
  cleanupUploads: () => cleanupUploads,
  uploadImages: () => uploadImages
});
import crypto from "node:crypto";
import sharp from "sharp";
function assertSafeImage(file) {
  const mime = (file.mimetype || "").toLowerCase();
  const isJpg = isJpeg(file.buffer) || mime.includes("jpeg") || mime.includes("jpg") || mime.includes("jfif") || mime.includes("pjpeg");
  const isPngFile = isPng(file.buffer) || mime.includes("png");
  const isWebpFile = isWebp(file.buffer) || mime.includes("webp");
  const valid = isJpg || isPngFile || isWebpFile || isJpeg(file.buffer) || isPng(file.buffer) || isWebp(file.buffer);
  if (!valid) throw new ErrorResponse("Uploaded file content is not a valid JPEG, PNG, or WebP image", 400 /* Bad_Request */);
}
async function compressUnder100KB(buffer) {
  let maxDim = 1280;
  let quality = 80;
  let outBuffer = await sharp(buffer, { failOn: "none", limitInputPixels: 4e7 }).rotate().resize({ width: maxDim, height: maxDim, fit: "inside", withoutEnlargement: true }).jpeg({ quality, progressive: true, mozjpeg: false }).toBuffer();
  if (outBuffer.length <= TARGET_MAX_BYTES) {
    return { buffer: outBuffer, mimetype: "image/jpeg" };
  }
  const steps = [
    { dim: 1024, q: 72 },
    { dim: 900, q: 65 },
    { dim: 800, q: 55 },
    { dim: 640, q: 48 },
    { dim: 500, q: 40 }
  ];
  for (const step of steps) {
    outBuffer = await sharp(buffer, { failOn: "none", limitInputPixels: 4e7 }).rotate().resize({ width: step.dim, height: step.dim, fit: "inside", withoutEnlargement: true }).jpeg({ quality: step.q, progressive: true, mozjpeg: false }).toBuffer();
    if (outBuffer.length <= TARGET_MAX_BYTES) {
      break;
    }
  }
  return { buffer: outBuffer, mimetype: "image/jpeg" };
}
async function normalizeImage(file) {
  try {
    const { buffer: compressedBuffer, mimetype } = await compressUnder100KB(file.buffer);
    return {
      buffer: compressedBuffer,
      originalname: file.originalname.replace(/\.[^/.]+$/, ".jpg"),
      mimetype,
      size: compressedBuffer.length
    };
  } catch (err) {
    console.error("[Image Processing Error]", err);
    throw new ErrorResponse(
      "One of the uploaded images is damaged or cannot be processed. Please upload a valid JPEG, PNG, or WebP image",
      400 /* Bad_Request */
    );
  }
}
async function uploadImages(files, folder) {
  files.forEach(assertSafeImage);
  const completed = [];
  try {
    const normalizedFiles = await Promise.all(files.map((file) => normalizeImage(file)));
    const uploadResults = await Promise.all(
      normalizedFiles.map(async (normalized) => {
        const res = await storageService.upload(normalized, {
          folder,
          publicId: crypto.randomUUID(),
          resourceType: "image"
        });
        completed.push(res);
        return res;
      })
    );
    return uploadResults;
  } catch (error) {
    await cleanupUploads(completed);
    console.error("[UploadImages Cloud Storage Error]", error);
    const errorMessage = error?.message || (error && typeof error === "object" && "http_code" in error ? "Cloud storage rejected an uploaded image. Please check credentials or retry with a valid image" : "Failed to upload image to cloud storage");
    throw new ErrorResponse(errorMessage, 400 /* Bad_Request */);
  }
}
async function cleanupUploads(uploads) {
  await Promise.allSettled(uploads.map((upload2) => storageService.delete(upload2.publicId)));
}
var isJpeg, isPng, isWebp, TARGET_MAX_BYTES;
var init_upload_util = __esm({
  "src/utils/upload.util.ts"() {
    "use strict";
    init_storage_service();
    init_types();
    init_response_util();
    isJpeg = (b) => b.length >= 3 && b[0] === 255 && b[1] === 216 && b[2] === 255;
    isPng = (b) => b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    isWebp = (b) => b.length >= 12 && b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP";
    TARGET_MAX_BYTES = 100 * 1024;
  }
});

// src/index.ts
import http from "http";

// src/app.ts
init_env();
import cors from "cors";
import express from "express";
import "morgan";

// src/middlewares/error.middleware.ts
init_types();
import { ZodError } from "zod";

// src/utils/utils.ts
var zodError = (error) => {
  let errors = {};
  error.issues.map((issue) => {
    const path2 = issue.path?.[0];
    if (path2) errors[path2] = issue.message;
  });
  return errors;
};

// src/middlewares/error.middleware.ts
init_env();
var errorMiddleware = (err, req, res, next) => {
  if (ENV.MODE !== "PRODUCTION") console.error(err);
  err.message ||= "Internal Server Error";
  err.statusCode ||= 500;
  if (err.name === "CastError") err.message = "Invalid ID";
  if ("code" in err && err.code === "P2025") {
    err.message = "Item not found";
    err.statusCode = 404 /* Not_Found */;
  }
  if ("code" in err && err.code === "P2002") {
    err.message = "An account or record with these unique details already exists";
    err.statusCode = 409 /* Conflict */;
  }
  if ("code" in err && err.code === "P2023") {
    err.message = "Invalid identifier";
    err.statusCode = 400 /* Bad_Request */;
  }
  if (err instanceof ZodError) {
    const errors = zodError(err);
    const firstErrorMessage = err.issues.length > 0 ? err?.issues?.[0]?.message : "Validation Error";
    return res.status(400 /* Bad_Request */).json({
      success: false,
      message: firstErrorMessage,
      errors
    });
  }
  const message = err.statusCode >= 500 && ENV.MODE === "PRODUCTION" ? "Internal Server Error" : err.message;
  return res.status(err.statusCode).json({
    success: false,
    message
  });
};

// src/app.ts
init_types();
init_response_util();

// src/modeles/user/user.routes.ts
import { Router } from "express";

// src/middlewares/upload.middleware.ts
init_response_util();
init_types();
import multer from "multer";
var MIME_PRESETS = {
  image: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/svg+xml",
    "image/gif"
  ],
  document: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "text/csv"
  ],
  media: [
    "video/mp4",
    "video/webm",
    "audio/mpeg",
    "audio/wav"
  ]
};
var DEFAULT_MAX_SIZE = 5 * 1024 * 1024;
var memoryStorage = multer.memoryStorage();
function parseMultipartBody(req) {
  if (!req.body || typeof req.body !== "object") return;
  for (const key of Object.keys(req.body)) {
    const val = req.body[key];
    if (typeof val === "string") {
      const trimmed = val.trim();
      if (trimmed.startsWith("{") && trimmed.endsWith("}") || trimmed.startsWith("[") && trimmed.endsWith("]")) {
        try {
          req.body[key] = JSON.parse(trimmed);
        } catch {
        }
      }
    }
  }
}
function createMulter(options) {
  const category = options?.category ?? "image";
  const allowedMimes = options?.allowedMimeTypes ?? (category === "all" ? [] : MIME_PRESETS[category] || []);
  const maxSize = options?.maxFileSize ?? DEFAULT_MAX_SIZE;
  return multer({
    storage: memoryStorage,
    limits: { fileSize: maxSize, files: 10, fields: 30, parts: 40, fieldSize: 100 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (allowedMimes.length === 0 || allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(
          new ErrorResponse(
            `Unsupported file format: ${file.mimetype}. Allowed formats: ${allowedMimes.join(", ")}`,
            400 /* Bad_Request */
          )
        );
      }
    }
  });
}
function wrapMiddleware(uploader, maxSize = DEFAULT_MAX_SIZE) {
  return (req, res, next) => {
    uploader(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            const mb = Math.round(maxSize / (1024 * 1024));
            return next(
              new ErrorResponse(
                `File size limit exceeded. Maximum allowed: ${mb}MB`,
                400 /* Bad_Request */
              )
            );
          }
          return next(new ErrorResponse(err.message, 400 /* Bad_Request */));
        }
        return next(err);
      }
      parseMultipartBody(req);
      next();
    });
  };
}
var upload = {
  /**
   * Single file upload middleware.
   * @param fieldName The multipart form field name (e.g., 'logo', 'avatar', 'file')
   */
  single(fieldName = "file", options) {
    const uploader = createMulter(options).single(fieldName);
    return wrapMiddleware(uploader, options?.maxFileSize);
  },
  /**
   * Multiple files upload middleware under the same field name.
   */
  array(fieldName = "files", maxCount = 10, options) {
    const uploader = createMulter(options).array(fieldName, maxCount);
    return wrapMiddleware(uploader, options?.maxFileSize);
  },
  /**
   * Multiple fields upload middleware with distinct field names.
   */
  fields(fields, options) {
    const uploader = createMulter(options).fields(fields);
    return wrapMiddleware(uploader, options?.maxFileSize);
  },
  /**
   * Accepts any files sent over multipart.
   */
  any(options) {
    const uploader = createMulter(options).any();
    return wrapMiddleware(uploader, options?.maxFileSize);
  },
  /**
   * Accepts only multipart fields without any files.
   */
  none() {
    return wrapMiddleware(multer().none());
  }
};

// src/modeles/user/user.controller.ts
init_types();
init_response_util();

// src/lib/prisma.ts
import { PrismaPg } from "@prisma/adapter-pg";

// generated/prisma/client.ts
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import "@prisma/client/runtime/client";

// generated/prisma/internal/class.ts
import * as runtime from "@prisma/client/runtime/client";
var config = {
  "previewFeatures": [],
  "clientVersion": "7.10.0",
  "engineVersion": "0edf323efd1d98336f3f0a68684b56f689b900d3",
  "activeProvider": "postgresql",
  "inlineSchema": 'generator client {\n  provider = "prisma-client"\n  output   = "../generated/prisma"\n}\n\ndatasource db {\n  provider = "postgresql"\n}\n\n// ----------------------------------------------------\n// ENUMS\n// ----------------------------------------------------\n\nenum Role {\n  CUSTOMER\n  PERFORMER\n  ORGANIZER\n  ADMIN\n}\n\nenum Gender {\n  MALE\n  FEMALE\n  OTHER\n}\n\nenum SkillLevel {\n  BEGINNER\n  INTERMEDIATE\n  ADVANCED\n  PRO\n  CHOREOGRAPHER\n}\n\nenum BookingStatus {\n  PENDING\n  PAYMENT_VERIFIED\n  CONFIRMED\n  IN_PROGRESS\n  COMPLETED\n  CANCELLED\n  EXPIRED\n  REJECTED\n}\n\nenum PaymentStatus {\n  PENDING\n  SUBMITTED\n  SUCCESS\n  FAILED\n  EXPIRED\n  REFUNDED\n}\n\nenum PaymentMethod {\n  UPI_QR_DYNAMIC\n  UPI_QR_STATIC\n  GATEWAY_RAZORPAY\n}\n\nenum EventStatus {\n  DRAFT\n  UPCOMING\n  ONGOING\n  COMPLETED\n  CANCELLED\n}\n\nenum AttendanceStatus {\n  GOING\n  INTERESTED\n  CANCELLED\n}\n\n// ----------------------------------------------------\n// MODELS\n// ----------------------------------------------------\n\nmodel User {\n  id String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid\n\n  // Basic & Auth Details\n  name         String\n  email        String  @unique\n  phone        String  @unique\n  passwordHash String\n  avatarUrl    String?\n  gender       Gender  @default(OTHER)\n  role         Role    @default(CUSTOMER)\n\n  // Physical & Personal Details\n  height      Decimal?  @db.Decimal(5, 2)\n  dateOfBirth DateTime? @db.Date\n  languages   String[]  @default(["Gujarati", "Hindi"])\n\n  // Location Details\n  address   String?\n  city      String?\n  state     String?\n  pincode   String?\n  latitude  Decimal? @db.Decimal(10, 7)\n  longitude Decimal? @db.Decimal(10, 7)\n\n  // Dance & Performer Profile\n  bio             String?    @db.Text\n  skillLevel      SkillLevel @default(INTERMEDIATE)\n  danceStyles     String[]   @default(["Traditional Garba", "Dodhiya", "Dandiya Raas"])\n  experienceYears Int?       @default(0)\n  instagramHandle String?\n\n  // Booking & Financial Details\n  hourlyRate  Decimal? @db.Decimal(10, 2)\n  upiId       String?\n  isAvailable Boolean  @default(true)\n\n  // Ratings & Stats\n  rating            Decimal @default(0.0) @db.Decimal(3, 2)\n  reviewCount       Int     @default(0)\n  totalBookingsDone Int     @default(0)\n\n  // Account State\n  isActive   Boolean @default(true)\n  isVerified Boolean @default(false)\n\n  // Relationships\n  photos           UserPhoto[]\n  bookingsReceived Booking[]       @relation("PerformerBookings")\n  organizedEvents  Event[]         @relation("OrganizerEvents")\n  attendingEvents  EventAttendee[] @relation("UserAttendingEvents")\n  favoriteEvents   EventFavorite[] @relation("UserFavoriteEvents")\n\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n\n  @@index([role, isAvailable, city])\n  @@index([skillLevel, city])\n  @@map("users")\n}\n\nmodel UserPhoto {\n  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid\n  userId    String   @db.Uuid\n  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)\n  imageUrl  String\n  publicId  String?\n  caption   String?\n  order     Int      @default(0)\n  createdAt DateTime @default(now())\n\n  @@index([userId])\n  @@map("user_photos")\n}\n\nmodel Booking {\n  id          String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid\n  bookingCode String @unique\n\n  // Booker / Client Contact & Personal Details (Self-contained, independent client details)\n  name    String\n  email   String\n  phone   String\n  address String\n  image   Json?\n  gender  Gender @default(OTHER)\n\n  // The performer/dancer being booked\n  performerId String @db.Uuid\n  performer   User   @relation("PerformerBookings", fields: [performerId], references: [id], onDelete: Restrict)\n\n  // Slot Timings\n  bookingDate   DateTime @db.Date\n  startTime     DateTime\n  endTime       DateTime\n  durationHours Decimal  @db.Decimal(4, 2)\n\n  // Event Location & Notes\n  eventAddress String?\n  city         String?\n  notes        String? @db.Text\n\n  // Financials\n  hourlyRate    Decimal @db.Decimal(10, 2)\n  totalAmount   Decimal @db.Decimal(10, 2)\n  advanceAmount Decimal @default(0) @db.Decimal(10, 2)\n\n  status    BookingStatus @default(PENDING)\n  expiresAt DateTime?\n\n  payments Payment[]\n\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n\n  @@index([performerId, bookingDate, status])\n  @@index([phone])\n  @@index([email])\n  @@map("bookings")\n}\n\nmodel Payment {\n  id        String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid\n  bookingId String  @db.Uuid\n  booking   Booking @relation(fields: [bookingId], references: [id], onDelete: Cascade)\n\n  amount        Decimal       @db.Decimal(10, 2)\n  currency      String        @default("INR")\n  paymentMethod PaymentMethod @default(UPI_QR_DYNAMIC)\n  paymentStatus PaymentStatus @default(PENDING)\n\n  // QR Code & Payment Data\n  qrCodeUrl            String?\n  upiPayload           String?\n  transactionRef       String  @unique\n  utrNumber            String?\n  paymentScreenshotUrl String?\n\n  // Gateway specific\n  gatewayOrderId   String?\n  gatewayPaymentId String?\n  metadata         Json?\n\n  paidAt    DateTime?\n  expiresAt DateTime?\n  createdAt DateTime  @default(now())\n  updatedAt DateTime  @updatedAt\n\n  @@index([bookingId])\n  @@index([transactionRef])\n  @@map("payments")\n}\n\nmodel QRCode {\n  id                String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid\n  title             String\n  imageUrl          String  @db.Text\n  upiId             String?\n  accountHolderName String?\n  bankName          String?\n  isActive          Boolean @default(true)\n  isPrimary         Boolean @default(false)\n  description       String? @db.Text\n\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n\n  @@index([isActive, isPrimary])\n  @@map("qr_codes")\n}\n\nmodel Event {\n  id          String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid\n  title       String\n  slug        String? @unique\n  description String  @db.Text\n\n  // Media / Banners\n  imageUrl      String   @db.Text\n  galleryImages String[] @default([])\n\n  // Schedule & Timing\n  eventDate DateTime  @db.Date\n  endDate   DateTime? @db.Date\n  startTime String // e.g. "07:30 PM"\n  endTime   String? // e.g. "01:00 AM"\n\n  // Venue & Location\n  venue     String\n  address   String?\n  city      String\n  state     String\n  pincode   String?\n  latitude  Decimal? @db.Decimal(10, 7)\n  longitude Decimal? @db.Decimal(10, 7)\n\n  // Ticketing & Capacity\n  pricePerPass  Decimal? @default(0) @db.Decimal(10, 2)\n  totalCapacity Int?\n\n  // Flags & Visibility\n  isFeatured Boolean     @default(false)\n  isActive   Boolean     @default(true)\n  status     EventStatus @default(UPCOMING)\n\n  // Organizer Link\n  organizerId      String? @db.Uuid\n  organizer        User?   @relation("OrganizerEvents", fields: [organizerId], references: [id], onDelete: SetNull)\n  organizerName    String?\n  organizerContact String?\n\n  // Guidelines & Dress Code\n  dressCode String?  @default("Traditional Garba Attire")\n  rules     String[] @default([])\n\n  // Relational Links\n  attendees   EventAttendee[]\n  favoritedBy EventFavorite[]\n\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n\n  @@index([city, eventDate, status])\n  @@index([isFeatured, status])\n  @@index([eventDate])\n  @@index([organizerId])\n  @@map("events")\n}\n\nmodel EventAttendee {\n  id String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid\n\n  eventId String @db.Uuid\n  event   Event  @relation(fields: [eventId], references: [id], onDelete: Cascade)\n\n  userId String @db.Uuid\n  user   User   @relation("UserAttendingEvents", fields: [userId], references: [id], onDelete: Cascade)\n\n  status            AttendanceStatus @default(GOING)\n  lookingForPartner Boolean          @default(false)\n\n  passCount Int     @default(1)\n  notes     String?\n\n  joinedAt  DateTime @default(now())\n  updatedAt DateTime @updatedAt\n\n  @@unique([eventId, userId])\n  @@index([eventId, lookingForPartner])\n  @@index([userId])\n  @@map("event_attendees")\n}\n\nmodel EventFavorite {\n  id String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid\n\n  eventId String @db.Uuid\n  event   Event  @relation(fields: [eventId], references: [id], onDelete: Cascade)\n\n  userId String @db.Uuid\n  user   User   @relation("UserFavoriteEvents", fields: [userId], references: [id], onDelete: Cascade)\n\n  createdAt DateTime @default(now())\n\n  @@unique([eventId, userId])\n  @@index([userId])\n  @@index([eventId])\n  @@map("event_favorites")\n}\n',
  "runtimeDataModel": {
    "models": {},
    "enums": {},
    "types": {}
  },
  "parameterizationSchema": {
    "strings": [],
    "graph": ""
  }
};
config.runtimeDataModel = JSON.parse('{"models":{"User":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"name","kind":"scalar","type":"String"},{"name":"email","kind":"scalar","type":"String"},{"name":"phone","kind":"scalar","type":"String"},{"name":"passwordHash","kind":"scalar","type":"String"},{"name":"avatarUrl","kind":"scalar","type":"String"},{"name":"gender","kind":"enum","type":"Gender"},{"name":"role","kind":"enum","type":"Role"},{"name":"height","kind":"scalar","type":"Decimal"},{"name":"dateOfBirth","kind":"scalar","type":"DateTime"},{"name":"languages","kind":"scalar","type":"String"},{"name":"address","kind":"scalar","type":"String"},{"name":"city","kind":"scalar","type":"String"},{"name":"state","kind":"scalar","type":"String"},{"name":"pincode","kind":"scalar","type":"String"},{"name":"latitude","kind":"scalar","type":"Decimal"},{"name":"longitude","kind":"scalar","type":"Decimal"},{"name":"bio","kind":"scalar","type":"String"},{"name":"skillLevel","kind":"enum","type":"SkillLevel"},{"name":"danceStyles","kind":"scalar","type":"String"},{"name":"experienceYears","kind":"scalar","type":"Int"},{"name":"instagramHandle","kind":"scalar","type":"String"},{"name":"hourlyRate","kind":"scalar","type":"Decimal"},{"name":"upiId","kind":"scalar","type":"String"},{"name":"isAvailable","kind":"scalar","type":"Boolean"},{"name":"rating","kind":"scalar","type":"Decimal"},{"name":"reviewCount","kind":"scalar","type":"Int"},{"name":"totalBookingsDone","kind":"scalar","type":"Int"},{"name":"isActive","kind":"scalar","type":"Boolean"},{"name":"isVerified","kind":"scalar","type":"Boolean"},{"name":"photos","kind":"object","type":"UserPhoto","relationName":"UserToUserPhoto"},{"name":"bookingsReceived","kind":"object","type":"Booking","relationName":"PerformerBookings"},{"name":"organizedEvents","kind":"object","type":"Event","relationName":"OrganizerEvents"},{"name":"attendingEvents","kind":"object","type":"EventAttendee","relationName":"UserAttendingEvents"},{"name":"favoriteEvents","kind":"object","type":"EventFavorite","relationName":"UserFavoriteEvents"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":"users","schema":null},"UserPhoto":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"userId","kind":"scalar","type":"String"},{"name":"user","kind":"object","type":"User","relationName":"UserToUserPhoto"},{"name":"imageUrl","kind":"scalar","type":"String"},{"name":"publicId","kind":"scalar","type":"String"},{"name":"caption","kind":"scalar","type":"String"},{"name":"order","kind":"scalar","type":"Int"},{"name":"createdAt","kind":"scalar","type":"DateTime"}],"dbName":"user_photos","schema":null},"Booking":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"bookingCode","kind":"scalar","type":"String"},{"name":"name","kind":"scalar","type":"String"},{"name":"email","kind":"scalar","type":"String"},{"name":"phone","kind":"scalar","type":"String"},{"name":"address","kind":"scalar","type":"String"},{"name":"image","kind":"scalar","type":"Json"},{"name":"gender","kind":"enum","type":"Gender"},{"name":"performerId","kind":"scalar","type":"String"},{"name":"performer","kind":"object","type":"User","relationName":"PerformerBookings"},{"name":"bookingDate","kind":"scalar","type":"DateTime"},{"name":"startTime","kind":"scalar","type":"DateTime"},{"name":"endTime","kind":"scalar","type":"DateTime"},{"name":"durationHours","kind":"scalar","type":"Decimal"},{"name":"eventAddress","kind":"scalar","type":"String"},{"name":"city","kind":"scalar","type":"String"},{"name":"notes","kind":"scalar","type":"String"},{"name":"hourlyRate","kind":"scalar","type":"Decimal"},{"name":"totalAmount","kind":"scalar","type":"Decimal"},{"name":"advanceAmount","kind":"scalar","type":"Decimal"},{"name":"status","kind":"enum","type":"BookingStatus"},{"name":"expiresAt","kind":"scalar","type":"DateTime"},{"name":"payments","kind":"object","type":"Payment","relationName":"BookingToPayment"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":"bookings","schema":null},"Payment":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"bookingId","kind":"scalar","type":"String"},{"name":"booking","kind":"object","type":"Booking","relationName":"BookingToPayment"},{"name":"amount","kind":"scalar","type":"Decimal"},{"name":"currency","kind":"scalar","type":"String"},{"name":"paymentMethod","kind":"enum","type":"PaymentMethod"},{"name":"paymentStatus","kind":"enum","type":"PaymentStatus"},{"name":"qrCodeUrl","kind":"scalar","type":"String"},{"name":"upiPayload","kind":"scalar","type":"String"},{"name":"transactionRef","kind":"scalar","type":"String"},{"name":"utrNumber","kind":"scalar","type":"String"},{"name":"paymentScreenshotUrl","kind":"scalar","type":"String"},{"name":"gatewayOrderId","kind":"scalar","type":"String"},{"name":"gatewayPaymentId","kind":"scalar","type":"String"},{"name":"metadata","kind":"scalar","type":"Json"},{"name":"paidAt","kind":"scalar","type":"DateTime"},{"name":"expiresAt","kind":"scalar","type":"DateTime"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":"payments","schema":null},"QRCode":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"title","kind":"scalar","type":"String"},{"name":"imageUrl","kind":"scalar","type":"String"},{"name":"upiId","kind":"scalar","type":"String"},{"name":"accountHolderName","kind":"scalar","type":"String"},{"name":"bankName","kind":"scalar","type":"String"},{"name":"isActive","kind":"scalar","type":"Boolean"},{"name":"isPrimary","kind":"scalar","type":"Boolean"},{"name":"description","kind":"scalar","type":"String"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":"qr_codes","schema":null},"Event":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"title","kind":"scalar","type":"String"},{"name":"slug","kind":"scalar","type":"String"},{"name":"description","kind":"scalar","type":"String"},{"name":"imageUrl","kind":"scalar","type":"String"},{"name":"galleryImages","kind":"scalar","type":"String"},{"name":"eventDate","kind":"scalar","type":"DateTime"},{"name":"endDate","kind":"scalar","type":"DateTime"},{"name":"startTime","kind":"scalar","type":"String"},{"name":"endTime","kind":"scalar","type":"String"},{"name":"venue","kind":"scalar","type":"String"},{"name":"address","kind":"scalar","type":"String"},{"name":"city","kind":"scalar","type":"String"},{"name":"state","kind":"scalar","type":"String"},{"name":"pincode","kind":"scalar","type":"String"},{"name":"latitude","kind":"scalar","type":"Decimal"},{"name":"longitude","kind":"scalar","type":"Decimal"},{"name":"pricePerPass","kind":"scalar","type":"Decimal"},{"name":"totalCapacity","kind":"scalar","type":"Int"},{"name":"isFeatured","kind":"scalar","type":"Boolean"},{"name":"isActive","kind":"scalar","type":"Boolean"},{"name":"status","kind":"enum","type":"EventStatus"},{"name":"organizerId","kind":"scalar","type":"String"},{"name":"organizer","kind":"object","type":"User","relationName":"OrganizerEvents"},{"name":"organizerName","kind":"scalar","type":"String"},{"name":"organizerContact","kind":"scalar","type":"String"},{"name":"dressCode","kind":"scalar","type":"String"},{"name":"rules","kind":"scalar","type":"String"},{"name":"attendees","kind":"object","type":"EventAttendee","relationName":"EventToEventAttendee"},{"name":"favoritedBy","kind":"object","type":"EventFavorite","relationName":"EventToEventFavorite"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":"events","schema":null},"EventAttendee":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"eventId","kind":"scalar","type":"String"},{"name":"event","kind":"object","type":"Event","relationName":"EventToEventAttendee"},{"name":"userId","kind":"scalar","type":"String"},{"name":"user","kind":"object","type":"User","relationName":"UserAttendingEvents"},{"name":"status","kind":"enum","type":"AttendanceStatus"},{"name":"lookingForPartner","kind":"scalar","type":"Boolean"},{"name":"passCount","kind":"scalar","type":"Int"},{"name":"notes","kind":"scalar","type":"String"},{"name":"joinedAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":"event_attendees","schema":null},"EventFavorite":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"eventId","kind":"scalar","type":"String"},{"name":"event","kind":"object","type":"Event","relationName":"EventToEventFavorite"},{"name":"userId","kind":"scalar","type":"String"},{"name":"user","kind":"object","type":"User","relationName":"UserFavoriteEvents"},{"name":"createdAt","kind":"scalar","type":"DateTime"}],"dbName":"event_favorites","schema":null}},"enums":{},"types":{}}');
config.parameterizationSchema = {
  strings: JSON.parse('["where","orderBy","cursor","user","photos","performer","booking","payments","_count","bookingsReceived","organizer","event","attendees","favoritedBy","organizedEvents","attendingEvents","favoriteEvents","User.findUnique","User.findUniqueOrThrow","User.findFirst","User.findFirstOrThrow","User.findMany","data","User.createOne","User.createMany","User.createManyAndReturn","User.updateOne","User.updateMany","User.updateManyAndReturn","create","update","User.upsertOne","User.deleteOne","User.deleteMany","having","_avg","_sum","_min","_max","User.groupBy","User.aggregate","UserPhoto.findUnique","UserPhoto.findUniqueOrThrow","UserPhoto.findFirst","UserPhoto.findFirstOrThrow","UserPhoto.findMany","UserPhoto.createOne","UserPhoto.createMany","UserPhoto.createManyAndReturn","UserPhoto.updateOne","UserPhoto.updateMany","UserPhoto.updateManyAndReturn","UserPhoto.upsertOne","UserPhoto.deleteOne","UserPhoto.deleteMany","UserPhoto.groupBy","UserPhoto.aggregate","Booking.findUnique","Booking.findUniqueOrThrow","Booking.findFirst","Booking.findFirstOrThrow","Booking.findMany","Booking.createOne","Booking.createMany","Booking.createManyAndReturn","Booking.updateOne","Booking.updateMany","Booking.updateManyAndReturn","Booking.upsertOne","Booking.deleteOne","Booking.deleteMany","Booking.groupBy","Booking.aggregate","Payment.findUnique","Payment.findUniqueOrThrow","Payment.findFirst","Payment.findFirstOrThrow","Payment.findMany","Payment.createOne","Payment.createMany","Payment.createManyAndReturn","Payment.updateOne","Payment.updateMany","Payment.updateManyAndReturn","Payment.upsertOne","Payment.deleteOne","Payment.deleteMany","Payment.groupBy","Payment.aggregate","QRCode.findUnique","QRCode.findUniqueOrThrow","QRCode.findFirst","QRCode.findFirstOrThrow","QRCode.findMany","QRCode.createOne","QRCode.createMany","QRCode.createManyAndReturn","QRCode.updateOne","QRCode.updateMany","QRCode.updateManyAndReturn","QRCode.upsertOne","QRCode.deleteOne","QRCode.deleteMany","QRCode.groupBy","QRCode.aggregate","Event.findUnique","Event.findUniqueOrThrow","Event.findFirst","Event.findFirstOrThrow","Event.findMany","Event.createOne","Event.createMany","Event.createManyAndReturn","Event.updateOne","Event.updateMany","Event.updateManyAndReturn","Event.upsertOne","Event.deleteOne","Event.deleteMany","Event.groupBy","Event.aggregate","EventAttendee.findUnique","EventAttendee.findUniqueOrThrow","EventAttendee.findFirst","EventAttendee.findFirstOrThrow","EventAttendee.findMany","EventAttendee.createOne","EventAttendee.createMany","EventAttendee.createManyAndReturn","EventAttendee.updateOne","EventAttendee.updateMany","EventAttendee.updateManyAndReturn","EventAttendee.upsertOne","EventAttendee.deleteOne","EventAttendee.deleteMany","EventAttendee.groupBy","EventAttendee.aggregate","EventFavorite.findUnique","EventFavorite.findUniqueOrThrow","EventFavorite.findFirst","EventFavorite.findFirstOrThrow","EventFavorite.findMany","EventFavorite.createOne","EventFavorite.createMany","EventFavorite.createManyAndReturn","EventFavorite.updateOne","EventFavorite.updateMany","EventFavorite.updateManyAndReturn","EventFavorite.upsertOne","EventFavorite.deleteOne","EventFavorite.deleteMany","EventFavorite.groupBy","EventFavorite.aggregate","AND","OR","NOT","id","eventId","userId","createdAt","equals","in","notIn","lt","lte","gt","gte","not","contains","startsWith","endsWith","AttendanceStatus","status","lookingForPartner","passCount","notes","joinedAt","updatedAt","title","slug","description","imageUrl","galleryImages","eventDate","endDate","startTime","endTime","venue","address","city","state","pincode","latitude","longitude","pricePerPass","totalCapacity","isFeatured","isActive","EventStatus","organizerId","organizerName","organizerContact","dressCode","rules","has","hasEvery","hasSome","upiId","accountHolderName","bankName","isPrimary","bookingId","amount","currency","PaymentMethod","paymentMethod","PaymentStatus","paymentStatus","qrCodeUrl","upiPayload","transactionRef","utrNumber","paymentScreenshotUrl","gatewayOrderId","gatewayPaymentId","metadata","paidAt","expiresAt","string_contains","string_starts_with","string_ends_with","array_starts_with","array_ends_with","array_contains","bookingCode","name","email","phone","image","Gender","gender","performerId","bookingDate","durationHours","eventAddress","hourlyRate","totalAmount","advanceAmount","BookingStatus","publicId","caption","order","passwordHash","avatarUrl","Role","role","height","dateOfBirth","languages","bio","SkillLevel","skillLevel","danceStyles","experienceYears","instagramHandle","isAvailable","rating","reviewCount","totalBookingsDone","isVerified","eventId_userId","every","some","none","is","isNot","connectOrCreate","upsert","createMany","set","disconnect","delete","connect","updateMany","deleteMany","push","increment","decrement","multiply","divide"]'),
  graph: "ugRQgAEoBAAAtwIAIAkAALgCACAOAAC5AgAgDwAAugIAIBAAALsCACCZAQAArwIAMJoBAAAUABCbAQAArwIAMJwBAQAAAAGfAUAAigIAIbEBQACKAgAhvAEBAIgCACG9AQEAiAIAIb4BAQCIAgAhvwEBAIgCACHAARAAsgIAIcEBEACyAgAhxQEgAIkCACHPAQEAiAIAIesBAQCHAgAh7AEBAAAAAe0BAQAAAAHwAQAAsALwASL1ARAAsgIAIfwBAQCHAgAh_QEBAIgCACH_AQAAsQL_ASKAAhAAsgIAIYECQACzAgAhggIAAPQBACCDAgEAiAIAIYUCAAC0AoUCIoYCAAD0AQAghwICALUCACGIAgEAiAIAIYkCIACJAgAhigIQALYCACGLAgIArgIAIYwCAgCuAgAhjQIgAIkCACEBAAAAAQAgCwMAAKoCACCZAQAAyQIAMJoBAAADABCbAQAAyQIAMJwBAQCGAgAhngEBAIYCACGfAUAAigIAIbUBAQCHAgAh-QEBAIgCACH6AQEAiAIAIfsBAgCuAgAhAwMAAIgEACD5AQAA0wIAIPoBAADTAgAgCwMAAKoCACCZAQAAyQIAMJoBAAADABCbAQAAyQIAMJwBAQAAAAGeAQEAhgIAIZ8BQACKAgAhtQEBAIcCACH5AQEAiAIAIfoBAQCIAgAh-wECAK4CACEDAAAAAwAgAQAABAAwAgAABQAgHAUAAKoCACAHAADIAgAgmQEAAMYCADCaAQAABwAQmwEAAMYCADCcAQEAhgIAIZ8BQACKAgAhrAEAAMcC-QEirwEBAIgCACGxAUAAigIAIbkBQACKAgAhugFAAIoCACG8AQEAhwIAIb0BAQCIAgAh4wFAALMCACHqAQEAhwIAIesBAQCHAgAh7AEBAIcCACHtAQEAhwIAIe4BAADEAgAg8AEAALAC8AEi8QEBAIYCACHyAUAAigIAIfMBEAC2AgAh9AEBAIgCACH1ARAAtgIAIfYBEAC2AgAh9wEQALYCACEHBQAAiAQAIAcAAIoEACCvAQAA0wIAIL0BAADTAgAg4wEAANMCACDuAQAA0wIAIPQBAADTAgAgHAUAAKoCACAHAADIAgAgmQEAAMYCADCaAQAABwAQmwEAAMYCADCcAQEAAAABnwFAAIoCACGsAQAAxwL5ASKvAQEAiAIAIbEBQACKAgAhuQFAAIoCACG6AUAAigIAIbwBAQCHAgAhvQEBAIgCACHjAUAAswIAIeoBAQAAAAHrAQEAhwIAIewBAQCHAgAh7QEBAIcCACHuAQAAxAIAIPABAACwAvABIvEBAQCGAgAh8gFAAIoCACHzARAAtgIAIfQBAQCIAgAh9QEQALYCACH2ARAAtgIAIfcBEAC2AgAhAwAAAAcAIAEAAAgAMAIAAAkAIBYGAADFAgAgmQEAAMECADCaAQAACwAQmwEAAMECADCcAQEAhgIAIZ8BQACKAgAhsQFAAIoCACHTAQEAhgIAIdQBEAC2AgAh1QEBAIcCACHXAQAAwgLXASLZAQAAwwLZASLaAQEAiAIAIdsBAQCIAgAh3AEBAIcCACHdAQEAiAIAId4BAQCIAgAh3wEBAIgCACHgAQEAiAIAIeEBAADEAgAg4gFAALMCACHjAUAAswIAIQoGAACJBAAg2gEAANMCACDbAQAA0wIAIN0BAADTAgAg3gEAANMCACDfAQAA0wIAIOABAADTAgAg4QEAANMCACDiAQAA0wIAIOMBAADTAgAgFgYAAMUCACCZAQAAwQIAMJoBAAALABCbAQAAwQIAMJwBAQAAAAGfAUAAigIAIbEBQACKAgAh0wEBAIYCACHUARAAtgIAIdUBAQCHAgAh1wEAAMIC1wEi2QEAAMMC2QEi2gEBAIgCACHbAQEAiAIAIdwBAQAAAAHdAQEAiAIAId4BAQCIAgAh3wEBAIgCACHgAQEAiAIAIeEBAADEAgAg4gFAALMCACHjAUAAswIAIQMAAAALACABAAAMADACAAANACABAAAACwAgIwoAAL8CACAMAAC6AgAgDQAAuwIAIJkBAAC8AgAwmgEAABAAEJsBAAC8AgAwnAEBAIYCACGfAUAAigIAIawBAAC9AscBIrEBQACKAgAhsgEBAIcCACGzAQEAiAIAIbQBAQCHAgAhtQEBAIcCACG2AQAA9AEAILcBQACKAgAhuAFAALMCACG5AQEAhwIAIboBAQCIAgAhuwEBAIcCACG8AQEAiAIAIb0BAQCHAgAhvgEBAIcCACG_AQEAiAIAIcABEACyAgAhwQEQALICACHCARAAsgIAIcMBAgC1AgAhxAEgAIkCACHFASAAiQIAIccBAQC-AgAhyAEBAIgCACHJAQEAiAIAIcoBAQCIAgAhywEAAPQBACAQCgAAiAQAIAwAAIUEACANAACGBAAgswEAANMCACC4AQAA0wIAILoBAADTAgAgvAEAANMCACC_AQAA0wIAIMABAADTAgAgwQEAANMCACDCAQAA0wIAIMMBAADTAgAgxwEAANMCACDIAQAA0wIAIMkBAADTAgAgygEAANMCACAjCgAAvwIAIAwAALoCACANAAC7AgAgmQEAALwCADCaAQAAEAAQmwEAALwCADCcAQEAAAABnwFAAIoCACGsAQAAvQLHASKxAUAAigIAIbIBAQCHAgAhswEBAAAAAbQBAQCHAgAhtQEBAIcCACG2AQAA9AEAILcBQACKAgAhuAFAALMCACG5AQEAhwIAIboBAQCIAgAhuwEBAIcCACG8AQEAiAIAIb0BAQCHAgAhvgEBAIcCACG_AQEAiAIAIcABEACyAgAhwQEQALICACHCARAAsgIAIcMBAgC1AgAhxAEgAIkCACHFASAAiQIAIccBAQC-AgAhyAEBAIgCACHJAQEAiAIAIcoBAQCIAgAhywEAAPQBACADAAAAEAAgAQAAEQAwAgAAEgAgKAQAALcCACAJAAC4AgAgDgAAuQIAIA8AALoCACAQAAC7AgAgmQEAAK8CADCaAQAAFAAQmwEAAK8CADCcAQEAhgIAIZ8BQACKAgAhsQFAAIoCACG8AQEAiAIAIb0BAQCIAgAhvgEBAIgCACG_AQEAiAIAIcABEACyAgAhwQEQALICACHFASAAiQIAIc8BAQCIAgAh6wEBAIcCACHsAQEAhwIAIe0BAQCHAgAh8AEAALAC8AEi9QEQALICACH8AQEAhwIAIf0BAQCIAgAh_wEAALEC_wEigAIQALICACGBAkAAswIAIYICAAD0AQAggwIBAIgCACGFAgAAtAKFAiKGAgAA9AEAIIcCAgC1AgAhiAIBAIgCACGJAiAAiQIAIYoCEAC2AgAhiwICAK4CACGMAgIArgIAIY0CIACJAgAhAQAAABQAIA4DAACqAgAgCwAAqQIAIJkBAACsAgAwmgEAABYAEJsBAACsAgAwnAEBAIYCACGdAQEAhgIAIZ4BAQCGAgAhrAEAAK0CrAEirQEgAIkCACGuAQIArgIAIa8BAQCIAgAhsAFAAIoCACGxAUAAigIAIQMDAACIBAAgCwAAhwQAIK8BAADTAgAgDwMAAKoCACALAACpAgAgmQEAAKwCADCaAQAAFgAQmwEAAKwCADCcAQEAAAABnQEBAIYCACGeAQEAhgIAIawBAACtAqwBIq0BIACJAgAhrgECAK4CACGvAQEAiAIAIbABQACKAgAhsQFAAIoCACGOAgAAqwIAIAMAAAAWACABAAAXADACAAAYACAJAwAAqgIAIAsAAKkCACCZAQAAqAIAMJoBAAAaABCbAQAAqAIAMJwBAQCGAgAhnQEBAIYCACGeAQEAhgIAIZ8BQACKAgAhAgMAAIgEACALAACHBAAgCgMAAKoCACALAACpAgAgmQEAAKgCADCaAQAAGgAQmwEAAKgCADCcAQEAAAABnQEBAIYCACGeAQEAhgIAIZ8BQACKAgAhjgIAAKcCACADAAAAGgAgAQAAGwAwAgAAHAAgAQAAABYAIAEAAAAaACADAAAAFgAgAQAAFwAwAgAAGAAgAwAAABoAIAEAABsAMAIAABwAIAEAAAADACABAAAABwAgAQAAABAAIAEAAAAWACABAAAAGgAgAQAAAAEAIBMEAACCBAAgCQAAgwQAIA4AAIQEACAPAACFBAAgEAAAhgQAILwBAADTAgAgvQEAANMCACC-AQAA0wIAIL8BAADTAgAgwAEAANMCACDBAQAA0wIAIM8BAADTAgAg9QEAANMCACD9AQAA0wIAIIACAADTAgAggQIAANMCACCDAgAA0wIAIIcCAADTAgAgiAIAANMCACADAAAAFAAgAQAAKAAwAgAAAQAgAwAAABQAIAEAACgAMAIAAAEAIAMAAAAUACABAAAoADACAAABACAlBAAA_QMAIAkAAP4DACAOAAD_AwAgDwAAgAQAIBAAAIEEACCcAQEAAAABnwFAAAAAAbEBQAAAAAG8AQEAAAABvQEBAAAAAb4BAQAAAAG_AQEAAAABwAEQAAAAAcEBEAAAAAHFASAAAAABzwEBAAAAAesBAQAAAAHsAQEAAAAB7QEBAAAAAfABAAAA8AEC9QEQAAAAAfwBAQAAAAH9AQEAAAAB_wEAAAD_AQKAAhAAAAABgQJAAAAAAYICAAD7AwAggwIBAAAAAYUCAAAAhQIChgIAAPwDACCHAgIAAAABiAIBAAAAAYkCIAAAAAGKAhAAAAABiwICAAAAAYwCAgAAAAGNAiAAAAABARYAACwAICCcAQEAAAABnwFAAAAAAbEBQAAAAAG8AQEAAAABvQEBAAAAAb4BAQAAAAG_AQEAAAABwAEQAAAAAcEBEAAAAAHFASAAAAABzwEBAAAAAesBAQAAAAHsAQEAAAAB7QEBAAAAAfABAAAA8AEC9QEQAAAAAfwBAQAAAAH9AQEAAAAB_wEAAAD_AQKAAhAAAAABgQJAAAAAAYICAAD7AwAggwIBAAAAAYUCAAAAhQIChgIAAPwDACCHAgIAAAABiAIBAAAAAYkCIAAAAAGKAhAAAAABiwICAAAAAYwCAgAAAAGNAiAAAAABARYAAC4AMAEWAAAuADAlBAAAwAMAIAkAAMEDACAOAADCAwAgDwAAwwMAIBAAAMQDACCcAQEAzQIAIZ8BQADOAgAhsQFAAM4CACG8AQEA3AIAIb0BAQDcAgAhvgEBANwCACG_AQEA3AIAIcABEADoAgAhwQEQAOgCACHFASAA2gIAIc8BAQDcAgAh6wEBAM0CACHsAQEAzQIAIe0BAQDNAgAh8AEAAJ4D8AEi9QEQAOgCACH8AQEAzQIAIf0BAQDcAgAh_wEAALwD_wEigAIQAOgCACGBAkAA5wIAIYICAAC9AwAggwIBANwCACGFAgAAvgOFAiKGAgAAvwMAIIcCAgDpAgAhiAIBANwCACGJAiAA2gIAIYoCEACUAwAhiwICANsCACGMAgIA2wIAIY0CIADaAgAhAgAAAAEAIBYAADEAICCcAQEAzQIAIZ8BQADOAgAhsQFAAM4CACG8AQEA3AIAIb0BAQDcAgAhvgEBANwCACG_AQEA3AIAIcABEADoAgAhwQEQAOgCACHFASAA2gIAIc8BAQDcAgAh6wEBAM0CACHsAQEAzQIAIe0BAQDNAgAh8AEAAJ4D8AEi9QEQAOgCACH8AQEAzQIAIf0BAQDcAgAh_wEAALwD_wEigAIQAOgCACGBAkAA5wIAIYICAAC9AwAggwIBANwCACGFAgAAvgOFAiKGAgAAvwMAIIcCAgDpAgAhiAIBANwCACGJAiAA2gIAIYoCEACUAwAhiwICANsCACGMAgIA2wIAIY0CIADaAgAhAgAAABQAIBYAADMAIAIAAAAUACAWAAAzACADAAAAAQAgHQAALAAgHgAAMQAgAQAAAAEAIAEAAAAUACATCAAAtwMAICMAALgDACAkAAC7AwAgJQAAugMAICYAALkDACC8AQAA0wIAIL0BAADTAgAgvgEAANMCACC_AQAA0wIAIMABAADTAgAgwQEAANMCACDPAQAA0wIAIPUBAADTAgAg_QEAANMCACCAAgAA0wIAIIECAADTAgAggwIAANMCACCHAgAA0wIAIIgCAADTAgAgI5kBAACgAgAwmgEAADoAEJsBAACgAgAwnAEBAN0BACGfAUAA3gEAIbEBQADeAQAhvAEBAOgBACG9AQEA6AEAIb4BAQDoAQAhvwEBAOgBACHAARAA9gEAIcEBEAD2AQAhxQEgAOYBACHPAQEA6AEAIesBAQDzAQAh7AEBAPMBACHtAQEA8wEAIfABAACZAvABIvUBEAD2AQAh_AEBAPMBACH9AQEA6AEAIf8BAAChAv8BIoACEAD2AQAhgQJAAPUBACGCAgAA9AEAIIMCAQDoAQAhhQIAAKIChQIihgIAAPQBACCHAgIA9wEAIYgCAQDoAQAhiQIgAOYBACGKAhAAjQIAIYsCAgDnAQAhjAICAOcBACGNAiAA5gEAIQMAAAAUACABAAA5ADAiAAA6ACADAAAAFAAgAQAAKAAwAgAAAQAgAQAAAAUAIAEAAAAFACADAAAAAwAgAQAABAAwAgAABQAgAwAAAAMAIAEAAAQAMAIAAAUAIAMAAAADACABAAAEADACAAAFACAIAwAAtgMAIJwBAQAAAAGeAQEAAAABnwFAAAAAAbUBAQAAAAH5AQEAAAAB-gEBAAAAAfsBAgAAAAEBFgAAQgAgB5wBAQAAAAGeAQEAAAABnwFAAAAAAbUBAQAAAAH5AQEAAAAB-gEBAAAAAfsBAgAAAAEBFgAARAAwARYAAEQAMAgDAAC1AwAgnAEBAM0CACGeAQEAzQIAIZ8BQADOAgAhtQEBAM0CACH5AQEA3AIAIfoBAQDcAgAh-wECANsCACECAAAABQAgFgAARwAgB5wBAQDNAgAhngEBAM0CACGfAUAAzgIAIbUBAQDNAgAh-QEBANwCACH6AQEA3AIAIfsBAgDbAgAhAgAAAAMAIBYAAEkAIAIAAAADACAWAABJACADAAAABQAgHQAAQgAgHgAARwAgAQAAAAUAIAEAAAADACAHCAAAsAMAICMAALEDACAkAAC0AwAgJQAAswMAICYAALIDACD5AQAA0wIAIPoBAADTAgAgCpkBAACfAgAwmgEAAFAAEJsBAACfAgAwnAEBAN0BACGeAQEA3QEAIZ8BQADeAQAhtQEBAPMBACH5AQEA6AEAIfoBAQDoAQAh-wECAOcBACEDAAAAAwAgAQAATwAwIgAAUAAgAwAAAAMAIAEAAAQAMAIAAAUAIAEAAAAJACABAAAACQAgAwAAAAcAIAEAAAgAMAIAAAkAIAMAAAAHACABAAAIADACAAAJACADAAAABwAgAQAACAAwAgAACQAgGQUAAK4DACAHAACvAwAgnAEBAAAAAZ8BQAAAAAGsAQAAAPkBAq8BAQAAAAGxAUAAAAABuQFAAAAAAboBQAAAAAG8AQEAAAABvQEBAAAAAeMBQAAAAAHqAQEAAAAB6wEBAAAAAewBAQAAAAHtAQEAAAAB7gGAAAAAAfABAAAA8AEC8QEBAAAAAfIBQAAAAAHzARAAAAAB9AEBAAAAAfUBEAAAAAH2ARAAAAAB9wEQAAAAAQEWAABYACAXnAEBAAAAAZ8BQAAAAAGsAQAAAPkBAq8BAQAAAAGxAUAAAAABuQFAAAAAAboBQAAAAAG8AQEAAAABvQEBAAAAAeMBQAAAAAHqAQEAAAAB6wEBAAAAAewBAQAAAAHtAQEAAAAB7gGAAAAAAfABAAAA8AEC8QEBAAAAAfIBQAAAAAHzARAAAAAB9AEBAAAAAfUBEAAAAAH2ARAAAAAB9wEQAAAAAQEWAABaADABFgAAWgAwGQUAAKADACAHAAChAwAgnAEBAM0CACGfAUAAzgIAIawBAACfA_kBIq8BAQDcAgAhsQFAAM4CACG5AUAAzgIAIboBQADOAgAhvAEBAM0CACG9AQEA3AIAIeMBQADnAgAh6gEBAM0CACHrAQEAzQIAIewBAQDNAgAh7QEBAM0CACHuAYAAAAAB8AEAAJ4D8AEi8QEBAM0CACHyAUAAzgIAIfMBEACUAwAh9AEBANwCACH1ARAAlAMAIfYBEACUAwAh9wEQAJQDACECAAAACQAgFgAAXQAgF5wBAQDNAgAhnwFAAM4CACGsAQAAnwP5ASKvAQEA3AIAIbEBQADOAgAhuQFAAM4CACG6AUAAzgIAIbwBAQDNAgAhvQEBANwCACHjAUAA5wIAIeoBAQDNAgAh6wEBAM0CACHsAQEAzQIAIe0BAQDNAgAh7gGAAAAAAfABAACeA_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_ACAOmQEAAIUCADCaAQAAggEAEJsBAACFAgAwnAEBAIYCACGfAUAAigIAIbEBQACKAgAhsgEBAIcCACG0AQEAiAIAIbUBAQCHAgAhxQEgAIkCACHPAQEAiAIAIdABAQCIAgAh0QEBAIgCACHSASAAiQIAIQS0AQAA0wIAIM8BAADTAgAg0AEAANMCACDRAQAA0wIAIAMAAACCAQAgAQAAgwEAMAIAAH8AIAMAAACCAQAgAQAAgwEAMAIAAH8AIAMAAACCAQAgAQAAgwEAMAIAAH8AIAucAQEAAAABnwFAAAAAAbEBQAAAAAGyAQEAAAABtAEBAAAAAbUBAQAAAAHFASAAAAABzwEBAAAAAdABAQAAAAHRAQEAAAAB0gEgAAAAAQEWAACHAQAgC5wBAQAAAAGfAUAAAAABsQFAAAAAAbIBAQAAAAG0AQEAAAABtQEBAAAAAcUBIAAAAAHPAQEAAAAB0AEBAAAAAdEBAQAAAAHSASAAAAABARYAAIkBADABFgAAiQEAMAucAQEAzQIAIZ8BQADOAgAhsQFAAM4CACGyAQEAzQIAIbQBAQDcAgAhtQEBAM0CACHFASAA2gIAIc8BAQDcAgAh0AEBANwCACHRAQEA3AIAIdIBIADaAgAhAgAAAH8AIBYAAIwBACALnAEBAM0CACGfAUAAzgIAIbEBQADOAgAhsgEBAM0CACG0AQEA3AIAIbUBAQDNAgAhxQEgANoCACHPAQEA3AIAIdABAQDcAgAh0QEBANwCACHSASAA2gIAIQIAAACCAQAgFgAAjgEAIAIAAACCAQAgFgAAjgEAIAMAAAB_ACAdAACHAQAgHgAAjAEAIAEAAAB_ACABAAAAggEAIAcIAACMAwAgJQAAjgMAICYAAI0DACC0AQAA0wIAIM8BAADTAgAg0AEAANMCACDRAQAA0wIAIA6ZAQAAhAIAMJoBAACVAQAQmwEAAIQCADCcAQEA3QEAIZ8BQADeAQAhsQFAAN4BACGyAQEA8wEAIbQBAQDoAQAhtQEBAPMBACHFASAA5gEAIc8BAQDoAQAh0AEBAOgBACHRAQEA6AEAIdIBIADmAQAhAwAAAIIBACABAACUAQAwIgAAlQEAIAMAAACCAQAgAQAAgwEAMAIAAH8AIAEAAAASACABAAAAEgAgAwAAABAAIAEAABEAMAIAABIAIAMAAAAQACABAAARADACAAASACADAAAAEAAgAQAAEQAwAgAAEgAgIAoAAIkDACAMAACKAwAgDQAAiwMAIJwBAQAAAAGfAUAAAAABrAEAAADHAQKxAUAAAAABsgEBAAAAAbMBAQAAAAG0AQEAAAABtQEBAAAAAbYBAACHAwAgtwFAAAAAAbgBQAAAAAG5AQEAAAABugEBAAAAAbsBAQAAAAG8AQEAAAABvQEBAAAAAb4BAQAAAAG_AQEAAAABwAEQAAAAAcEBEAAAAAHCARAAAAABwwECAAAAAcQBIAAAAAHFASAAAAABxwEBAAAAAcgBAQAAAAHJAQEAAAABygEBAAAAAcsBAACIAwAgARYAAJ0BACAdnAEBAAAAAZ8BQAAAAAGsAQAAAMcBArEBQAAAAAGyAQEAAAABswEBAAAAAbQBAQAAAAG1AQEAAAABtgEAAIcDACC3AUAAAAABuAFAAAAAAbkBAQAAAAG6AQEAAAABuwEBAAAAAbwBAQAAAAG9AQEAAAABvgEBAAAAAb8BAQAAAAHAARAAAAABwQEQAAAAAcIBEAAAAAHDAQIAAAABxAEgAAAAAcUBIAAAAAHHAQEAAAAByAEBAAAAAckBAQAAAAHKAQEAAAABywEAAIgDACABFgAAnwEAMAEWAACfAQAwAQAAABQAICAKAADsAgAgDAAA7QIAIA0AAO4CACCcAQEAzQIAIZ8BQADOAgAhrAEAAOoCxwEisQFAAM4CACGyAQEAzQIAIbMBAQDcAgAhtAEBAM0CACG1AQEAzQIAIbYBAADmAgAgtwFAAM4CACG4AUAA5wIAIbkBAQDNAgAhugEBANwCACG7AQEAzQIAIbwBAQDcAgAhvQEBAM0CACG-AQEAzQIAIb8BAQDcAgAhwAEQAOgCACHBARAA6AIAIcIBEADoAgAhwwECAOkCACHEASAA2gIAIcUBIADaAgAhxwEBANwCACHIAQEA3AIAIckBAQDcAgAhygEBANwCACHLAQAA6wIAIAIAAAASACAWAACjAQAgHZwBAQDNAgAhnwFAAM4CACGsAQAA6gLHASKxAUAAzgIAIbIBAQDNAgAhswEBANwCACG0AQEAzQIAIbUBAQDNAgAhtgEAAOYCACC3AUAAzgIAIbgBQADnAgAhuQEBAM0CACG6AQEA3AIAIbsBAQDNAgAhvAEBANwCACG9AQEAzQIAIb4BAQDNAgAhvwEBANwCACHAARAA6AIAIcEBEADoAgAhwgEQAOgCACHDAQIA6QIAIcQBIADaAgAhxQEgANoCACHHAQEA3AIAIcgBAQDcAgAhyQEBANwCACHKAQEA3AIAIcsBAADrAgAgAgAAABAAIBYAAKUBACACAAAAEAAgFgAApQEAIAEAAAAUACADAAAAEgAgHQAAnQEAIB4AAKMBACABAAAAEgAgAQAAABAAIBIIAADhAgAgIwAA4gIAICQAAOUCACAlAADkAgAgJgAA4wIAILMBAADTAgAguAEAANMCACC6AQAA0wIAILwBAADTAgAgvwEAANMCACDAAQAA0wIAIMEBAADTAgAgwgEAANMCACDDAQAA0wIAIMcBAADTAgAgyAEAANMCACDJAQAA0wIAIMoBAADTAgAgIJkBAADyAQAwmgEAAK0BABCbAQAA8gEAMJwBAQDdAQAhnwFAAN4BACGsAQAA-AHHASKxAUAA3gEAIbIBAQDzAQAhswEBAOgBACG0AQEA8wEAIbUBAQDzAQAhtgEAAPQBACC3AUAA3gEAIbgBQAD1AQAhuQEBAPMBACG6AQEA6AEAIbsBAQDzAQAhvAEBAOgBACG9AQEA8wEAIb4BAQDzAQAhvwEBAOgBACHAARAA9gEAIcEBEAD2AQAhwgEQAPYBACHDAQIA9wEAIcQBIADmAQAhxQEgAOYBACHHAQEA-QEAIcgBAQDoAQAhyQEBAOgBACHKAQEA6AEAIcsBAAD0AQAgAwAAABAAIAEAAKwBADAiAACtAQAgAwAAABAAIAEAABEAMAIAABIAIAEAAAAYACABAAAAGAAgAwAAABYAIAEAABcAMAIAABgAIAMAAAAWACABAAAXADACAAAYACADAAAAFgAgAQAAFwAwAgAAGAAgCwMAAOACACALAADfAgAgnAEBAAAAAZ0BAQAAAAGeAQEAAAABrAEAAACsAQKtASAAAAABrgECAAAAAa8BAQAAAAGwAUAAAAABsQFAAAAAAQEWAAC1AQAgCZwBAQAAAAGdAQEAAAABngEBAAAAAawBAAAArAECrQEgAAAAAa4BAgAAAAGvAQEAAAABsAFAAAAAAbEBQAAAAAEBFgAAtwEAMAEWAAC3AQAwCwMAAN4CACALAADdAgAgnAEBAM0CACGdAQEAzQIAIZ4BAQDNAgAhrAEAANkCrAEirQEgANoCACGuAQIA2wIAIa8BAQDcAgAhsAFAAM4CACGxAUAAzgIAIQIAAAAYACAWAAC6AQAgCZwBAQDNAgAhnQEBAM0CACGeAQEAzQIAIawBAADZAqwBIq0BIADaAgAhrgECANsCACGvAQEA3AIAIbABQADOAgAhsQFAAM4CACECAAAAFgAgFgAAvAEAIAIAAAAWACAWAAC8AQAgAwAAABgAIB0AALUBACAeAAC6AQAgAQAAABgAIAEAAAAWACAGCAAA1AIAICMAANUCACAkAADYAgAgJQAA1wIAICYAANYCACCvAQAA0wIAIAyZAQAA5AEAMJoBAADDAQAQmwEAAOQBADCcAQEA3QEAIZ0BAQDdAQAhngEBAN0BACGsAQAA5QGsASKtASAA5gEAIa4BAgDnAQAhrwEBAOgBACGwAUAA3gEAIbEBQADeAQAhAwAAABYAIAEAAMIBADAiAADDAQAgAwAAABYAIAEAABcAMAIAABgAIAEAAAAcACABAAAAHAAgAwAAABoAIAEAABsAMAIAABwAIAMAAAAaACABAAAbADACAAAcACADAAAAGgAgAQAAGwAwAgAAHAAgBgMAANICACALAADRAgAgnAEBAAAAAZ0BAQAAAAGeAQEAAAABnwFAAAAAAQEWAADLAQAgBJwBAQAAAAGdAQEAAAABngEBAAAAAZ8BQAAAAAEBFgAAzQEAMAEWAADNA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_AQEA6AEAIcABEAD2AQAhwQEQAPYBACHCARAA9gEAIcMBAgD3AQAhxAEgAOYBACHFASAA5gEAIccBAQD5AQAhyAEBAOgBACHJAQEA6AEAIcoBAQDoAQAhywEAAPQBACAOCAAA4AEAICUAAOMBACAmAADjAQAgoAEBAAAAAaEBAQAAAASiAQEAAAAEowEBAAAAAaQBAQAAAAGlAQEAAAABpgEBAAAAAacBAQCDAgAhqAEBAAAAAakBAQAAAAGqAQEAAAABBKABAQAAAAXMAQEAAAABzQEBAAAABM4BAQAAAAQLCAAA6gEAICUAAIICACAmAACCAgAgoAFAAAAAAaEBQAAAAAWiAUAAAAAFowFAAAAAAaQBQAAAAAGlAUAAAAABpgFAAAAAAacBQACBAgAhDQgAAOoBACAjAACAAgAgJAAAgAIAICUAAIACACAmAACAAgAgoAEQAAAAAaEBEAAAAAWiARAAAAAFowEQAAAAAaQBEAAAAAGlARAAAAABpgEQAAAAAacBEAD_AQAhDQgAAOoBACAjAAD-AQAgJAAA6gEAICUAAOoBACAmAADqAQAgoAECAAAAAaEBAgAAAAWiAQIAAAAFowECAAAAAaQBAgAAAAGlAQIAAAABpgECAAAAAacBAgD9AQAhBwgAAOABACAlAAD8AQAgJgAA_AEAIKABAAAAxwECoQEAAADHAQiiAQAAAMcBCKcBAAD7AccBIgsIAADqAQAgJQAA6wEAICYAAOsBACCgAQEAAAABoQEBAAAABaIBAQAAAAWjAQEAAAABpAEBAAAAAaUBAQAAAAGmAQEAAAABpwEBAPoBACELCAAA6gEAICUAAOsBACAmAADrAQAgoAEBAAAAAaEBAQAAAAWiAQEAAAAFowEBAAAAAaQBAQAAAAGlAQEAAAABpgEBAAAAAacBAQD6AQAhBwgAAOABACAlAAD8AQAgJgAA_AEAIKABAAAAxwECoQEAAADHAQiiAQAAAMcBCKcBAAD7AccBIgSgAQAAAMcBAqEBAAAAxwEIogEAAADHAQinAQAA_AHHASINCAAA6gEAICMAAP4BACAkAADqAQAgJQAA6gEAICYAAOoBACCgAQIAAAABoQECAAAABaIBAgAAAAWjAQIAAAABpAECAAAAAaUBAgAAAAGmAQIAAAABpwECAP0BACEIoAEIAAAAAaEBCAAAAAWiAQgAAAAFowEIAAAAAaQBCAAAAAGlAQgAAAABpgEIAAAAAacBCAD-AQAhDQgAAOoBACAjAACAAgAgJAAAgAIAICUAAIACACAmAACAAgAgoAEQAAAAAaEBEAAAAAWiARAAAAAFowEQAAAAAaQBEAAAAAGlARAAAAABpgEQAAAAAacBEAD_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-QEIpwEAAJsC-QEiBwgAAOABACAlAACcAgAgJgAAnAIAIKABAAAA-QECoQEAAAD5AQiiAQAAAPkBCKcBAACbAvkBIgSgAQAAAPkBAqEBAAAA-QEIogEAAAD5AQinAQAAnAL5ASIHCAAA4AEAICUAAJ4CACAmAACeAgAgoAEAAADwAQKhAQAAAPABCKIBAAAA8AEIpwEAAJ0C8AEiBKABAAAA8AECoQEAAADwAQiiAQAAAPABCKcBAACeAvABIgqZAQAAnwIAMJoBAABQABCbAQAAnwIAMJwBAQDdAQAhngEBAN0BACGfAUAA3gEAIbUBAQDzAQAh-QEBAOgBACH6AQEA6AEAIfsBAgDnAQAhI5kBAACgAgAwmgEAADoAEJsBAACgAgAwnAEBAN0BACGfAUAA3gEAIbEBQADeAQAhvAEBAOgBACG9AQEA6AEAIb4BAQDoAQAhvwEBAOgBACHAARAA9gEAIcEBEAD2AQAhxQEgAOYBACHPAQEA6AEAIesBAQDzAQAh7AEBAPMBACHtAQEA8wEAIfABAACZAvABIvUBEAD2AQAh_AEBAPMBACH9AQEA6AEAIf8BAAChAv8BIoACEAD2AQAhgQJAAPUBACGCAgAA9AEAIIMCAQDoAQAhhQIAAKIChQIihgIAAPQBACCHAgIA9wEAIYgCAQDoAQAhiQIgAOYBACGKAhAAjQIAIYsCAgDnAQAhjAICAOcBACGNAiAA5gEAIQcIAADgAQAgJQAApgIAICYAAKYCACCgAQAAAP8BAqEBAAAA_wEIogEAAAD_AQinAQAApQL_ASIHCAAA4AEAICUAAKQCACAmAACkAgAgoAEAAACFAgKhAQAAAIUCCKIBAAAAhQIIpwEAAKMChQIiBwgAAOABACAlAACkAgAgJgAApAIAIKABAAAAhQICoQEAAACFAgiiAQAAAIUCCKcBAACjAoUCIgSgAQAAAIUCAqEBAAAAhQIIogEAAACFAginAQAApAKFAiIHCAAA4AEAICUAAKYCACAmAACmAgAgoAEAAAD_AQKhAQAAAP8BCKIBAAAA_wEIpwEAAKUC_wEiBKABAAAA_wECoQEAAAD_AQiiAQAAAP8BCKcBAACmAv8BIgKdAQEAAAABngEBAAAAAQkDAACqAgAgCwAAqQIAIJkBAACoAgAwmgEAABoAEJsBAACoAgAwnAEBAIYCACGdAQEAhgIAIZ4BAQCGAgAhnwFAAIoCACElCgAAvwIAIAwAALoCACANAAC7AgAgmQEAALwCADCaAQAAEAAQmwEAALwCADCcAQEAhgIAIZ8BQACKAgAhrAEAAL0CxwEisQFAAIoCACGyAQEAhwIAIbMBAQCIAgAhtAEBAIcCACG1AQEAhwIAIbYBAAD0AQAgtwFAAIoCACG4AUAAswIAIbkBAQCHAgAhugEBAIgCACG7AQEAhwIAIbwBAQCIAgAhvQEBAIcCACG-AQEAhwIAIb8BAQCIAgAhwAEQALICACHBARAAsgIAIcIBEACyAgAhwwECALUCACHEASAAiQIAIcUBIACJAgAhxwEBAL4CACHIAQEAiAIAIckBAQCIAgAhygEBAIgCACHLAQAA9AEAIJICAAAQACCTAgAAEAAgKgQAALcCACAJAAC4AgAgDgAAuQIAIA8AALoCACAQAAC7AgAgmQEAAK8CADCaAQAAFAAQmwEAAK8CADCcAQEAhgIAIZ8BQACKAgAhsQFAAIoCACG8AQEAiAIAIb0BAQCIAgAhvgEBAIgCACG_AQEAiAIAIcABEACyAgAhwQEQALICACHFASAAiQIAIc8BAQCIAgAh6wEBAIcCACHsAQEAhwIAIe0BAQCHAgAh8AEAALAC8AEi9QEQALICACH8AQEAhwIAIf0BAQCIAgAh_wEAALEC_wEigAIQALICACGBAkAAswIAIYICAAD0AQAggwIBAIgCACGFAgAAtAKFAiKGAgAA9AEAIIcCAgC1AgAhiAIBAIgCACGJAiAAiQIAIYoCEAC2AgAhiwICAK4CACGMAgIArgIAIY0CIACJAgAhkgIAABQAIJMCAAAUACACnQEBAAAAAZ4BAQAAAAEOAwAAqgIAIAsAAKkCACCZAQAArAIAMJoBAAAWABCbAQAArAIAMJwBAQCGAgAhnQEBAIYCACGeAQEAhgIAIawBAACtAqwBIq0BIACJAgAhrgECAK4CACGvAQEAiAIAIbABQACKAgAhsQFAAIoCACEEoAEAAACsAQKhAQAAAKwBCKIBAAAArAEIpwEAAPEBrAEiCKABAgAAAAGhAQIAAAAEogECAAAABKMBAgAAAAGkAQIAAAABpQECAAAAAaYBAgAAAAGnAQIA4AEAISgEAAC3AgAgCQAAuAIAIA4AALkCACAPAAC6AgAgEAAAuwIAIJkBAACvAgAwmgEAABQAEJsBAACvAgAwnAEBAIYCACGfAUAAigIAIbEBQACKAgAhvAEBAIgCACG9AQEAiAIAIb4BAQCIAgAhvwEBAIgCACHAARAAsgIAIcEBEACyAgAhxQEgAIkCACHPAQEAiAIAIesBAQCHAgAh7AEBAIcCACHtAQEAhwIAIfABAACwAvABIvUBEACyAgAh_AEBAIcCACH9AQEAiAIAIf8BAACxAv8BIoACEACyAgAhgQJAALMCACGCAgAA9AEAIIMCAQCIAgAhhQIAALQChQIihgIAAPQBACCHAgIAtQIAIYgCAQCIAgAhiQIgAIkCACGKAhAAtgIAIYsCAgCuAgAhjAICAK4CACGNAiAAiQIAIQSgAQAAAPABAqEBAAAA8AEIogEAAADwAQinAQAAngLwASIEoAEAAAD_AQKhAQAAAP8BCKIBAAAA_wEIpwEAAKYC_wEiCKABEAAAAAGhARAAAAAFogEQAAAABaMBEAAAAAGkARAAAAABpQEQAAAAAaYBEAAAAAGnARAAgAIAIQigAUAAAAABoQFAAAAABaIBQAAAAAWjAUAAAAABpAFAAAAAAaUBQAAAAAGmAUAAAAABpwFAAIICACEEoAEAAACFAgKhAQAAAIUCCKIBAAAAhQIIpwEAAKQChQIiCKABAgAAAAGhAQIAAAAFogECAAAABaMBAgAAAAGkAQIAAAABpQECAAAAAaYBAgAAAAGnAQIA6gEAIQigARAAAAABoQEQAAAABKIBEAAAAASjARAAAAABpAEQAAAAAaUBEAAAAAGmARAAAAABpwEQAJcCACEDjwIAAAMAIJACAAADACCRAgAAAwAgA48CAAAHACCQAgAABwAgkQIAAAcAIAOPAgAAEAAgkAIAABAAIJECAAAQACADjwIAABYAIJACAAAWACCRAgAAFgAgA48CAAAaACCQAgAAGgAgkQIAABoAICMKAAC_AgAgDAAAugIAIA0AALsCACCZAQAAvAIAMJoBAAAQABCbAQAAvAIAMJwBAQCGAgAhnwFAAIoCACGsAQAAvQLHASKxAUAAigIAIbIBAQCHAgAhswEBAIgCACG0AQEAhwIAIbUBAQCHAgAhtgEAAPQBACC3AUAAigIAIbgBQACzAgAhuQEBAIcCACG6AQEAiAIAIbsBAQCHAgAhvAEBAIgCACG9AQEAhwIAIb4BAQCHAgAhvwEBAIgCACHAARAAsgIAIcEBEACyAgAhwgEQALICACHDAQIAtQIAIcQBIACJAgAhxQEgAIkCACHHAQEAvgIAIcgBAQCIAgAhyQEBAIgCACHKAQEAiAIAIcsBAAD0AQAgBKABAAAAxwECoQEAAADHAQiiAQAAAMcBCKcBAAD8AccBIgigAQEAAAABoQEBAAAABaIBAQAAAAWjAQEAAAABpAEBAAAAAaUBAQAAAAGmAQEAAAABpwEBAMACACEqBAAAtwIAIAkAALgCACAOAAC5AgAgDwAAugIAIBAAALsCACCZAQAArwIAMJoBAAAUABCbAQAArwIAMJwBAQCGAgAhnwFAAIoCACGxAUAAigIAIbwBAQCIAgAhvQEBAIgCACG-AQEAiAIAIb8BAQCIAgAhwAEQALICACHBARAAsgIAIcUBIACJAgAhzwEBAIgCACHrAQEAhwIAIewBAQCHAgAh7QEBAIcCACHwAQAAsALwASL1ARAAsgIAIfwBAQCHAgAh_QEBAIgCACH_AQAAsQL_ASKAAhAAsgIAIYECQACzAgAhggIAAPQBACCDAgEAiAIAIYUCAAC0AoUCIoYCAAD0AQAghwICALUCACGIAgEAiAIAIYkCIACJAgAhigIQALYCACGLAgIArgIAIYwCAgCuAgAhjQIgAIkCACGSAgAAFAAgkwIAABQAIAigAQEAAAABoQEBAAAABaIBAQAAAAWjAQEAAAABpAEBAAAAAaUBAQAAAAGmAQEAAAABpwEBAMACACEWBgAAxQIAIJkBAADBAgAwmgEAAAsAEJsBAADBAgAwnAEBAIYCACGfAUAAigIAIbEBQACKAgAh0wEBAIYCACHUARAAtgIAIdUBAQCHAgAh1wEAAMIC1wEi2QEAAMMC2QEi2gEBAIgCACHbAQEAiAIAIdwBAQCHAgAh3QEBAIgCACHeAQEAiAIAId8BAQCIAgAh4AEBAIgCACHhAQAAxAIAIOIBQACzAgAh4wFAALMCACEEoAEAAADXAQKhAQAAANcBCKIBAAAA1wEIpwEAAJUC1wEiBKABAAAA2QECoQEAAADZAQiiAQAAANkBCKcBAACTAtkBIgygAYAAAAABowGAAAAAAaQBgAAAAAGlAYAAAAABpgGAAAAAAacBgAAAAAHkAQEAAAAB5QEBAAAAAeYBAQAAAAHnAYAAAAAB6AGAAAAAAekBgAAAAAEeBQAAqgIAIAcAAMgCACCZAQAAxgIAMJoBAAAHABCbAQAAxgIAMJwBAQCGAgAhnwFAAIoCACGsAQAAxwL5ASKvAQEAiAIAIbEBQACKAgAhuQFAAIoCACG6AUAAigIAIbwBAQCHAgAhvQEBAIgCACHjAUAAswIAIeoBAQCHAgAh6wEBAIcCACHsAQEAhwIAIe0BAQCHAgAh7gEAAMQCACDwAQAAsALwASLxAQEAhgIAIfIBQACKAgAh8wEQALYCACH0AQEAiAIAIfUBEAC2AgAh9gEQALYCACH3ARAAtgIAIZICAAAHACCTAgAABwAgHAUAAKoCACAHAADIAgAgmQEAAMYCADCaAQAABwAQmwEAAMYCADCcAQEAhgIAIZ8BQACKAgAhrAEAAMcC-QEirwEBAIgCACGxAUAAigIAIbkBQACKAgAhugFAAIoCACG8AQEAhwIAIb0BAQCIAgAh4wFAALMCACHqAQEAhwIAIesBAQCHAgAh7AEBAIcCACHtAQEAhwIAIe4BAADEAgAg8AEAALAC8AEi8QEBAIYCACHyAUAAigIAIfMBEAC2AgAh9AEBAIgCACH1ARAAtgIAIfYBEAC2AgAh9wEQALYCACEEoAEAAAD5AQKhAQAAAPkBCKIBAAAA-QEIpwEAAJwC-QEiA48CAAALACCQAgAACwAgkQIAAAsAIAsDAACqAgAgmQEAAMkCADCaAQAAAwAQmwEAAMkCADCcAQEAhgIAIZ4BAQCGAgAhnwFAAIoCACG1AQEAhwIAIfkBAQCIAgAh-gEBAIgCACH7AQIArgIAIQAAAAGXAgEAAAABAZcCQAAAAAEFHQAAswQAIB4AALkEACCUAgAAtAQAIJUCAAC4BAAgmgIAABIAIAUdAACxBAAgHgAAtgQAIJQCAACyBAAglQIAALUEACCaAgAAAQAgAx0AALMEACCUAgAAtAQAIJoCAAASACADHQAAsQQAIJQCAACyBAAgmgIAAAEAIAAAAAAAAAGXAgAAAKwBAgGXAiAAAAABBZcCAgAAAAGeAgIAAAABnwICAAAAAaACAgAAAAGhAgIAAAABAZcCAQAAAAEFHQAAqQQAIB4AAK8EACCUAgAAqgQAIJUCAACuBAAgmgIAABIAIAUdAACnBAAgHgAArAQAIJQCAACoBAAglQIAAKsEACCaAgAAAQAgAx0AAKkEACCUAgAAqgQAIJoCAAASACADHQAApwQAIJQCAACoBAAgmgIAAAEAIAAAAAAAApcCAQAAAASdAgEAAAAFAZcCQAAAAAEFlwIQAAAAAZ4CEAAAAAGfAhAAAAABoAIQAAAAAaECEAAAAAEFlwICAAAAAZ4CAgAAAAGfAgIAAAABoAICAAAAAaECAgAAAAEBlwIAAADHAQIClwIBAAAABJ0CAQAAAAUHHQAAoAQAIB4AAKUEACCUAgAAoQQAIJUCAACkBAAgmAIAABQAIJkCAAAUACCaAgAAAQAgCx0AAPsCADAeAACAAwAwlAIAAPwCADCVAgAA_QIAMJYCAAD-AgAglwIAAP8CADCYAgAA_wIAMJkCAAD_AgAwmgIAAP8CADCbAgAAgQMAMJwCAACCAwAwCx0AAO8CADAeAAD0AgAwlAIAAPACADCVAgAA8QIAMJYCAADyAgAglwIAAPMCADCYAgAA8wIAMJkCAADzAgAwmgIAAPMCADCbAgAA9QIAMJwCAAD2AgAwBAMAANICACCcAQEAAAABngEBAAAAAZ8BQAAAAAECAAAAHAAgHQAA-gIAIAMAAAAcACAdAAD6AgAgHgAA-QIAIAEWAACjBAAwCgMAAKoCACALAACpAgAgmQEAAKgCADCaAQAAGgAQmwEAAKgCADCcAQEAAAABnQEBAIYCACGeAQEAhgIAIZ8BQACKAgAhjgIAAKcCACACAAAAHAAgFgAA-QIAIAIAAAD3AgAgFgAA-AIAIAeZAQAA9gIAMJoBAAD3AgAQmwEAAPYCADCcAQEAhgIAIZ0BAQCGAgAhngEBAIYCACGfAUAAigIAIQeZAQAA9gIAMJoBAAD3AgAQmwEAAPYCADCcAQEAhgIAIZ0BAQCGAgAhngEBAIYCACGfAUAAigIAIQOcAQEAzQIAIZ4BAQDNAgAhnwFAAM4CACEEAwAA0AIAIJwBAQDNAgAhngEBAM0CACGfAUAAzgIAIQQDAADSAgAgnAEBAAAAAZ4BAQAAAAGfAUAAAAABCQMAAOACACCcAQEAAAABngEBAAAAAawBAAAArAECrQEgAAAAAa4BAgAAAAGvAQEAAAABsAFAAAAAAbEBQAAAAAECAAAAGAAgHQAAhgMAIAMAAAAYACAdAACGAwAgHgAAhQMAIAEWAACiBAAwDwMAAKoCACALAACpAgAgmQEAAKwCADCaAQAAFgAQmwEAAKwCADCcAQEAAAABnQEBAIYCACGeAQEAhgIAIawBAACtAqwBIq0BIACJAgAhrgECAK4CACGvAQEAiAIAIbABQACKAgAhsQFAAIoCACGOAgAAqwIAIAIAAAAYACAWAACFAwAgAgAAAIMDACAWAACEAwAgDJkBAACCAwAwmgEAAIMDABCbAQAAggMAMJwBAQCGAgAhnQEBAIYCACGeAQEAhgIAIawBAACtAqwBIq0BIACJAgAhrgECAK4CACGvAQEAiAIAIbABQACKAgAhsQFAAIoCACEMmQEAAIIDADCaAQAAgwMAEJsBAACCAwAwnAEBAIYCACGdAQEAhgIAIZ4BAQCGAgAhrAEAAK0CrAEirQEgAIkCACGuAQIArgIAIa8BAQCIAgAhsAFAAIoCACGxAUAAigIAIQicAQEAzQIAIZ4BAQDNAgAhrAEAANkCrAEirQEgANoCACGuAQIA2wIAIa8BAQDcAgAhsAFAAM4CACGxAUAAzgIAIQkDAADeAgAgnAEBAM0CACGeAQEAzQIAIawBAADZAqwBIq0BIADaAgAhrgECANsCACGvAQEA3AIAIbABQADOAgAhsQFAAM4CACEJAwAA4AIAIJwBAQAAAAGeAQEAAAABrAEAAACsAQKtASAAAAABrgECAAAAAa8BAQAAAAGwAUAAAAABsQFAAAAAAQGXAgEAAAAEAZcCAQAAAAQDHQAAoAQAIJQCAAChBAAgmgIAAAEAIAQdAAD7AgAwlAIAAPwCADCWAgAA_gIAIJoCAAD_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_AQIClwIBAAAABJ0CAQAAAAUBlwIAAACFAgIClwIBAAAABJ0CAQAAAAULHQAA7wMAMB4AAPQDADCUAgAA8AMAMJUCAADxAwAwlgIAAPIDACCXAgAA8wMAMJgCAADzAwAwmQIAAPMDADCaAgAA8wMAMJsCAAD1AwAwnAIAAPYDADALHQAA4wMAMB4AAOgDADCUAgAA5AMAMJUCAADlAwAwlgIAAOYDACCXAgAA5wMAMJgCAADnAwAwmQIAAOcDADCaAgAA5wMAMJsCAADpAwAwnAIAAOoDADALHQAA1wMAMB4AANwDADCUAgAA2AMAMJUCAADZAwAwlgIAANoDACCXAgAA2wMAMJgCAADbAwAwmQIAANsDADCaAgAA2wMAMJsCAADdAwAwnAIAAN4DADALHQAAzgMAMB4AANIDADCUAgAAzwMAMJUCAADQAwAwlgIAANEDACCXAgAA_wIAMJgCAAD_AgAwmQIAAP8CADCaAgAA_wIAMJsCAADTAwAwnAIAAIIDADALHQAAxQMAMB4AAMkDADCUAgAAxgMAMJUCAADHAwAwlgIAAMgDACCXAgAA8wIAMJgCAADzAgAwmQIAAPMCADCaAgAA8wIAMJsCAADKAwAwnAIAAPYCADAECwAA0QIAIJwBAQAAAAGdAQEAAAABnwFAAAAAAQIAAAAcACAdAADNAwAgAwAAABwAIB0AAM0DACAeAADMAwAgARYAAI8EADACAAAAHAAgFgAAzAMAIAIAAAD3AgAgFgAAywMAIAOcAQEAzQIAIZ0BAQDNAgAhnwFAAM4CACEECwAAzwIAIJwBAQDNAgAhnQEBAM0CACGfAUAAzgIAIQQLAADRAgAgnAEBAAAAAZ0BAQAAAAGfAUAAAAABCQsAAN8CACCcAQEAAAABnQEBAAAAAawBAAAArAECrQEgAAAAAa4BAgAAAAGvAQEAAAABsAFAAAAAAbEBQAAAAAECAAAAGAAgHQAA1gMAIAMAAAAYACAdAADWAwAgHgAA1QMAIAEWAACOBAAwAgAAABgAIBYAANUDACACAAAAgwMAIBYAANQDACAInAEBAM0CACGdAQEAzQIAIawBAADZAqwBIq0BIADaAgAhrgECANsCACGvAQEA3AIAIbABQADOAgAhsQFAAM4CACEJCwAA3QIAIJwBAQDNAgAhnQEBAM0CACGsAQAA2QKsASKtASAA2gIAIa4BAgDbAgAhrwEBANwCACGwAUAAzgIAIbEBQADOAgAhCQsAAN8CACCcAQEAAAABnQEBAAAAAawBAAAArAECrQEgAAAAAa4BAgAAAAGvAQEAAAABsAFAAAAAAbEBQAAAAAEeDAAAigMAIA0AAIsDACCcAQEAAAABnwFAAAAAAawBAAAAxwECsQFAAAAAAbIBAQAAAAGzAQEAAAABtAEBAAAAAbUBAQAAAAG2AQAAhwMAILcBQAAAAAG4AUAAAAABuQEBAAAAAboBAQAAAAG7AQEAAAABvAEBAAAAAb0BAQAAAAG-AQEAAAABvwEBAAAAAcABEAAAAAHBARAAAAABwgEQAAAAAcMBAgAAAAHEASAAAAABxQEgAAAAAcgBAQAAAAHJAQEAAAABygEBAAAAAcsBAACIAwAgAgAAABIAIB0AAOIDACADAAAAEgAgHQAA4gMAIB4AAOEDACABFgAAjQQAMCMKAAC_AgAgDAAAugIAIA0AALsCACCZAQAAvAIAMJoBAAAQABCbAQAAvAIAMJwBAQAAAAGfAUAAigIAIawBAAC9AscBIrEBQACKAgAhsgEBAIcCACGzAQEAAAABtAEBAIcCACG1AQEAhwIAIbYBAAD0AQAgtwFAAIoCACG4AUAAswIAIbkBAQCHAgAhugEBAIgCACG7AQEAhwIAIbwBAQCIAgAhvQEBAIcCACG-AQEAhwIAIb8BAQCIAgAhwAEQALICACHBARAAsgIAIcIBEACyAgAhwwECALUCACHEASAAiQIAIcUBIACJAgAhxwEBAL4CACHIAQEAiAIAIckBAQCIAgAhygEBAIgCACHLAQAA9AEAIAIAAAASACAWAADhAwAgAgAAAN8DACAWAADgAwAgIJkBAADeAwAwmgEAAN8DABCbAQAA3gMAMJwBAQCGAgAhnwFAAIoCACGsAQAAvQLHASKxAUAAigIAIbIBAQCHAgAhswEBAIgCACG0AQEAhwIAIbUBAQCHAgAhtgEAAPQBACC3AUAAigIAIbgBQACzAgAhuQEBAIcCACG6AQEAiAIAIbsBAQCHAgAhvAEBAIgCACG9AQEAhwIAIb4BAQCHAgAhvwEBAIgCACHAARAAsgIAIcEBEACyAgAhwgEQALICACHDAQIAtQIAIcQBIACJAgAhxQEgAIkCACHHAQEAvgIAIcgBAQCIAgAhyQEBAIgCACHKAQEAiAIAIcsBAAD0AQAgIJkBAADeAwAwmgEAAN8DABCbAQAA3gMAMJwBAQCGAgAhnwFAAIoCACGsAQAAvQLHASKxAUAAigIAIbIBAQCHAgAhswEBAIgCACG0AQEAhwIAIbUBAQCHAgAhtgEAAPQBACC3AUAAigIAIbgBQACzAgAhuQEBAIcCACG6AQEAiAIAIbsBAQCHAgAhvAEBAIgCACG9AQEAhwIAIb4BAQCHAgAhvwEBAIgCACHAARAAsgIAIcEBEACyAgAhwgEQALICACHDAQIAtQIAIcQBIACJAgAhxQEgAIkCACHHAQEAvgIAIcgBAQCIAgAhyQEBAIgCACHKAQEAiAIAIcsBAAD0AQAgHJwBAQDNAgAhnwFAAM4CACGsAQAA6gLHASKxAUAAzgIAIbIBAQDNAgAhswEBANwCACG0AQEAzQIAIbUBAQDNAgAhtgEAAOYCACC3AUAAzgIAIbgBQADnAgAhuQEBAM0CACG6AQEA3AIAIbsBAQDNAgAhvAEBANwCACG9AQEAzQIAIb4BAQDNAgAhvwEBANwCACHAARAA6AIAIcEBEADoAgAhwgEQAOgCACHDAQIA6QIAIcQBIADaAgAhxQEgANoCACHIAQEA3AIAIckBAQDcAgAhygEBANwCACHLAQAA6wIAIB4MAADtAgAgDQAA7gIAIJwBAQDNAgAhnwFAAM4CACGsAQAA6gLHASKxAUAAzgIAIbIBAQDNAgAhswEBANwCACG0AQEAzQIAIbUBAQDNAgAhtgEAAOYCACC3AUAAzgIAIbgBQADnAgAhuQEBAM0CACG6AQEA3AIAIbsBAQDNAgAhvAEBANwCACG9AQEAzQIAIb4BAQDNAgAhvwEBANwCACHAARAA6AIAIcEBEADoAgAhwgEQAOgCACHDAQIA6QIAIcQBIADaAgAhxQEgANoCACHIAQEA3AIAIckBAQDcAgAhygEBANwCACHLAQAA6wIAIB4MAACKAwAgDQAAiwMAIJwBAQAAAAGfAUAAAAABrAEAAADHAQKxAUAAAAABsgEBAAAAAbMBAQAAAAG0AQEAAAABtQEBAAAAAbYBAACHAwAgtwFAAAAAAbgBQAAAAAG5AQEAAAABugEBAAAAAbsBAQAAAAG8AQEAAAABvQEBAAAAAb4BAQAAAAG_AQEAAAABwAEQAAAAAcEBEAAAAAHCARAAAAABwwECAAAAAcQBIAAAAAHFASAAAAAByAEBAAAAAckBAQAAAAHKAQEAAAABywEAAIgDACAXBwAArwMAIJwBAQAAAAGfAUAAAAABrAEAAAD5AQKvAQEAAAABsQFAAAAAAbkBQAAAAAG6AUAAAAABvAEBAAAAAb0BAQAAAAHjAUAAAAAB6gEBAAAAAesBAQAAAAHsAQEAAAAB7QEBAAAAAe4BgAAAAAHwAQAAAPABAvIBQAAAAAHzARAAAAAB9AEBAAAAAfUBEAAAAAH2ARAAAAAB9wEQAAAAAQIAAAAJACAdAADuAwAgAwAAAAkAIB0AAO4DACAeAADtAwAgARYAAIwEADAcBQAAqgIAIAcAAMgCACCZAQAAxgIAMJoBAAAHABCbAQAAxgIAMJwBAQAAAAGfAUAAigIAIawBAADHAvkBIq8BAQCIAgAhsQFAAIoCACG5AUAAigIAIboBQACKAgAhvAEBAIcCACG9AQEAiAIAIeMBQACzAgAh6gEBAAAAAesBAQCHAgAh7AEBAIcCACHtAQEAhwIAIe4BAADEAgAg8AEAALAC8AEi8QEBAIYCACHyAUAAigIAIfMBEAC2AgAh9AEBAIgCACH1ARAAtgIAIfYBEAC2AgAh9wEQALYCACECAAAACQAgFgAA7QMAIAIAAADrAwAgFgAA7AMAIBqZAQAA6gMAMJoBAADrAwAQmwEAAOoDADCcAQEAhgIAIZ8BQACKAgAhrAEAAMcC-QEirwEBAIgCACGxAUAAigIAIbkBQACKAgAhugFAAIoCACG8AQEAhwIAIb0BAQCIAgAh4wFAALMCACHqAQEAhwIAIesBAQCHAgAh7AEBAIcCACHtAQEAhwIAIe4BAADEAgAg8AEAALAC8AEi8QEBAIYCACHyAUAAigIAIfMBEAC2AgAh9AEBAIgCACH1ARAAtgIAIfYBEAC2AgAh9wEQALYCACEamQEAAOoDADCaAQAA6wMAEJsBAADqAwAwnAEBAIYCACGfAUAAigIAIawBAADHAvkBIq8BAQCIAgAhsQFAAIoCACG5AUAAigIAIboBQACKAgAhvAEBAIcCACG9AQEAiAIAIeMBQACzAgAh6gEBAIcCACHrAQEAhwIAIewBAQCHAgAh7QEBAIcCACHuAQAAxAIAIPABAACwAvABIvEBAQCGAgAh8gFAAIoCACHzARAAtgIAIfQBAQCIAgAh9QEQALYCACH2ARAAtgIAIfcBEAC2AgAhFpwBAQDNAgAhnwFAAM4CACGsAQAAnwP5ASKvAQEA3AIAIbEBQADOAgAhuQFAAM4CACG6AUAAzgIAIbwBAQDNAgAhvQEBANwCACHjAUAA5wIAIeoBAQDNAgAh6wEBAM0CACHsAQEAzQIAIe0BAQDNAgAh7gGAAAAAAfABAACeA_ABIvIBQADOAgAh8wEQAJQDACH0AQEA3AIAIfUBEACUAwAh9gEQAJQDACH3ARAAlAMAIRcHAAChAwAgnAEBAM0CACGfAUAAzgIAIawBAACfA_kBIq8BAQDcAgAhsQFAAM4CACG5AUAAzgIAIboBQADOAgAhvAEBAM0CACG9AQEA3AIAIeMBQADnAgAh6gEBAM0CACHrAQEAzQIAIewBAQDNAgAh7QEBAM0CACHuAYAAAAAB8AEAAJ4D8AEi8gFAAM4CACHzARAAlAMAIfQBAQDcAgAh9QEQAJQDACH2ARAAlAMAIfcBEACUAwAhFwcAAK8DACCcAQEAAAABnwFAAAAAAawBAAAA-QECrwEBAAAAAbEBQAAAAAG5AUAAAAABugFAAAAAAbwBAQAAAAG9AQEAAAAB4wFAAAAAAeoBAQAAAAHrAQEAAAAB7AEBAAAAAe0BAQAAAAHuAYAAAAAB8AEAAADwAQLyAUAAAAAB8wEQAAAAAfQBAQAAAAH1ARAAAAAB9gEQAAAAAfcBEAAAAAEGnAEBAAAAAZ8BQAAAAAG1AQEAAAAB-QEBAAAAAfoBAQAAAAH7AQIAAAABAgAAAAUAIB0AAPoDACADAAAABQAgHQAA-gMAIB4AAPkDACABFgAAiwQAMAsDAACqAgAgmQEAAMkCADCaAQAAAwAQmwEAAMkCADCcAQEAAAABngEBAIYCACGfAUAAigIAIbUBAQCHAgAh-QEBAIgCACH6AQEAiAIAIfsBAgCuAgAhAgAAAAUAIBYAAPkDACACAAAA9wMAIBYAAPgDACAKmQEAAPYDADCaAQAA9wMAEJsBAAD2AwAwnAEBAIYCACGeAQEAhgIAIZ8BQACKAgAhtQEBAIcCACH5AQEAiAIAIfoBAQCIAgAh-wECAK4CACEKmQEAAPYDADCaAQAA9wMAEJsBAAD2AwAwnAEBAIYCACGeAQEAhgIAIZ8BQACKAgAhtQEBAIcCACH5AQEAiAIAIfoBAQCIAgAh-wECAK4CACEGnAEBAM0CACGfAUAAzgIAIbUBAQDNAgAh-QEBANwCACH6AQEA3AIAIfsBAgDbAgAhBpwBAQDNAgAhnwFAAM4CACG1AQEAzQIAIfkBAQDcAgAh-gEBANwCACH7AQIA2wIAIQacAQEAAAABnwFAAAAAAbUBAQAAAAH5AQEAAAAB-gEBAAAAAfsBAgAAAAEBlwIBAAAABAGXAgEAAAAEBB0AAO8DADCUAgAA8AMAMJYCAADyAwAgmgIAAPMDADAEHQAA4wMAMJQCAADkAwAwlgIAAOYDACCaAgAA5wMAMAQdAADXAwAwlAIAANgDADCWAgAA2gMAIJoCAADbAwAwBB0AAM4DADCUAgAAzwMAMJYCAADRAwAgmgIAAP8CADAEHQAAxQMAMJQCAADGAwAwlgIAAMgDACCaAgAA8wIAMAAAAAAAEAoAAIgEACAMAACFBAAgDQAAhgQAILMBAADTAgAguAEAANMCACC6AQAA0wIAILwBAADTAgAgvwEAANMCACDAAQAA0wIAIMEBAADTAgAgwgEAANMCACDDAQAA0wIAIMcBAADTAgAgyAEAANMCACDJAQAA0wIAIMoBAADTAgAgEwQAAIIEACAJAACDBAAgDgAAhAQAIA8AAIUEACAQAACGBAAgvAEAANMCACC9AQAA0wIAIL4BAADTAgAgvwEAANMCACDAAQAA0wIAIMEBAADTAgAgzwEAANMCACD1AQAA0wIAIP0BAADTAgAggAIAANMCACCBAgAA0wIAIIMCAADTAgAghwIAANMCACCIAgAA0wIAIAcFAACIBAAgBwAAigQAIK8BAADTAgAgvQEAANMCACDjAQAA0wIAIO4BAADTAgAg9AEAANMCACAABpwBAQAAAAGfAUAAAAABtQEBAAAAAfkBAQAAAAH6AQEAAAAB-wECAAAAARacAQEAAAABnwFAAAAAAawBAAAA-QECrwEBAAAAAbEBQAAAAAG5AUAAAAABugFAAAAAAbwBAQAAAAG9AQEAAAAB4wFAAAAAAeoBAQAAAAHrAQEAAAAB7AEBAAAAAe0BAQAAAAHuAYAAAAAB8AEAAADwAQLyAUAAAAAB8wEQAAAAAfQBAQAAAAH1ARAAAAAB9gEQAAAAAfcBEAAAAAEcnAEBAAAAAZ8BQAAAAAGsAQAAAMcBArEBQAAAAAGyAQEAAAABswEBAAAAAbQBAQAAAAG1AQEAAAABtgEAAIcDACC3AUAAAAABuAFAAAAAAbkBAQAAAAG6AQEAAAABuwEBAAAAAbwBAQAAAAG9AQEAAAABvgEBAAAAAb8BAQAAAAHAARAAAAABwQEQAAAAAcIBEAAAAAHDAQIAAAABxAEgAAAAAcUBIAAAAAHIAQEAAAAByQEBAAAAAcoBAQAAAAHLAQAAiAMAIAicAQEAAAABnQEBAAAAAawBAAAArAECrQEgAAAAAa4BAgAAAAGvAQEAAAABsAFAAAAAAbEBQAAAAAEDnAEBAAAAAZ0BAQAAAAGfAUAAAAABJAkAAP4DACAOAAD_AwAgDwAAgAQAIBAAAIEEACCcAQEAAAABnwFAAAAAAbEBQAAAAAG8AQEAAAABvQEBAAAAAb4BAQAAAAG_AQEAAAABwAEQAAAAAcEBEAAAAAHFASAAAAABzwEBAAAAAesBAQAAAAHsAQEAAAAB7QEBAAAAAfABAAAA8AEC9QEQAAAAAfwBAQAAAAH9AQEAAAAB_wEAAAD_AQKAAhAAAAABgQJAAAAAAYICAAD7AwAggwIBAAAAAYUCAAAAhQIChgIAAPwDACCHAgIAAAABiAIBAAAAAYkCIAAAAAGKAhAAAAABiwICAAAAAYwCAgAAAAGNAiAAAAABAgAAAAEAIB0AAJAEACADAAAAFAAgHQAAkAQAIB4AAJQEACAmAAAAFAAgCQAAwQMAIA4AAMIDACAPAADDAwAgEAAAxAMAIBYAAJQEACCcAQEAzQIAIZ8BQADOAgAhsQFAAM4CACG8AQEA3AIAIb0BAQDcAgAhvgEBANwCACG_AQEA3AIAIcABEADoAgAhwQEQAOgCACHFASAA2gIAIc8BAQDcAgAh6wEBAM0CACHsAQEAzQIAIe0BAQDNAgAh8AEAAJ4D8AEi9QEQAOgCACH8AQEAzQIAIf0BAQDcAgAh_wEAALwD_wEigAIQAOgCACGBAkAA5wIAIYICAAC9AwAggwIBANwCACGFAgAAvgOFAiKGAgAAvwMAIIcCAgDpAgAhiAIBANwCACGJAiAA2gIAIYoCEACUAwAhiwICANsCACGMAgIA2wIAIY0CIADaAgAhJAkAAMEDACAOAADCAwAgDwAAwwMAIBAAAMQDACCcAQEAzQIAIZ8BQADOAgAhsQFAAM4CACG8AQEA3AIAIb0BAQDcAgAhvgEBANwCACG_AQEA3AIAIcABEADoAgAhwQEQAOgCACHFASAA2gIAIc8BAQDcAgAh6wEBAM0CACHsAQEAzQIAIe0BAQDNAgAh8AEAAJ4D8AEi9QEQAOgCACH8AQEAzQIAIf0BAQDcAgAh_wEAALwD_wEigAIQAOgCACGBAkAA5wIAIYICAAC9AwAggwIBANwCACGFAgAAvgOFAiKGAgAAvwMAIIcCAgDpAgAhiAIBANwCACGJAiAA2gIAIYoCEACUAwAhiwICANsCACGMAgIA2wIAIY0CIADaAgAhJAQAAP0DACAOAAD_AwAgDwAAgAQAIBAAAIEEACCcAQEAAAABnwFAAAAAAbEBQAAAAAG8AQEAAAABvQEBAAAAAb4BAQAAAAG_AQEAAAABwAEQAAAAAcEBEAAAAAHFASAAAAABzwEBAAAAAesBAQAAAAHsAQEAAAAB7QEBAAAAAfABAAAA8AEC9QEQAAAAAfwBAQAAAAH9AQEAAAAB_wEAAAD_AQKAAhAAAAABgQJAAAAAAYICAAD7AwAggwIBAAAAAYUCAAAAhQIChgIAAPwDACCHAgIAAAABiAIBAAAAAYkCIAAAAAGKAhAAAAABiwICAAAAAYwCAgAAAAGNAiAAAAABAgAAAAEAIB0AAJUEACARnAEBAAAAAZ8BQAAAAAGxAUAAAAAB1AEQAAAAAdUBAQAAAAHXAQAAANcBAtkBAAAA2QEC2gEBAAAAAdsBAQAAAAHcAQEAAAAB3QEBAAAAAd4BAQAAAAHfAQEAAAAB4AEBAAAAAeEBgAAAAAHiAUAAAAAB4wFAAAAAAQMAAAAUACAdAACVBAAgHgAAmgQAICYAAAAUACAEAADAAwAgDgAAwgMAIA8AAMMDACAQAADEAwAgFgAAmgQAIJwBAQDNAgAhnwFAAM4CACGxAUAAzgIAIbwBAQDcAgAhvQEBANwCACG-AQEA3AIAIb8BAQDcAgAhwAEQAOgCACHBARAA6AIAIcUBIADaAgAhzwEBANwCACHrAQEAzQIAIewBAQDNAgAh7QEBAM0CACHwAQAAngPwASL1ARAA6AIAIfwBAQDNAgAh_QEBANwCACH_AQAAvAP_ASKAAhAA6AIAIYECQADnAgAhggIAAL0DACCDAgEA3AIAIYUCAAC-A4UCIoYCAAC_AwAghwICAOkCACGIAgEA3AIAIYkCIADaAgAhigIQAJQDACGLAgIA2wIAIYwCAgDbAgAhjQIgANoCACEkBAAAwAMAIA4AAMIDACAPAADDAwAgEAAAxAMAIJwBAQDNAgAhnwFAAM4CACGxAUAAzgIAIbwBAQDcAgAhvQEBANwCACG-AQEA3AIAIb8BAQDcAgAhwAEQAOgCACHBARAA6AIAIcUBIADaAgAhzwEBANwCACHrAQEAzQIAIewBAQDNAgAh7QEBAM0CACHwAQAAngPwASL1ARAA6AIAIfwBAQDNAgAh_QEBANwCACH_AQAAvAP_ASKAAhAA6AIAIYECQADnAgAhggIAAL0DACCDAgEA3AIAIYUCAAC-A4UCIoYCAAC_AwAghwICAOkCACGIAgEA3AIAIYkCIADaAgAhigIQAJQDACGLAgIA2wIAIYwCAgDbAgAhjQIgANoCACEYBQAArgMAIJwBAQAAAAGfAUAAAAABrAEAAAD5AQKvAQEAAAABsQFAAAAAAbkBQAAAAAG6AUAAAAABvAEBAAAAAb0BAQAAAAHjAUAAAAAB6gEBAAAAAesBAQAAAAHsAQEAAAAB7QEBAAAAAe4BgAAAAAHwAQAAAPABAvEBAQAAAAHyAUAAAAAB8wEQAAAAAfQBAQAAAAH1ARAAAAAB9gEQAAAAAfcBEAAAAAECAAAACQAgHQAAmwQAIAMAAAAHACAdAACbBAAgHgAAnwQAIBoAAAAHACAFAACgAwAgFgAAnwQAIJwBAQDNAgAhnwFAAM4CACGsAQAAnwP5ASKvAQEA3AIAIbEBQADOAgAhuQFAAM4CACG6AUAAzgIAIbwBAQDNAgAhvQEBANwCACHjAUAA5wIAIeoBAQDNAgAh6wEBAM0CACHsAQEAzQIAIe0BAQDNAgAh7gGAAAAAAfABAACeA_ABIvEBAQDNAgAh8gFAAM4CACHzARAAlAMAIfQBAQDcAgAh9QEQAJQDACH2ARAAlAMAIfcBEACUAwAhGAUAAKADACCcAQEAzQIAIZ8BQADOAgAhrAEAAJ8D-QEirwEBANwCACGxAUAAzgIAIbkBQADOAgAhugFAAM4CACG8AQEAzQIAIb0BAQDcAgAh4wFAAOcCACHqAQEAzQIAIesBAQDNAgAh7AEBAM0CACHtAQEAzQIAIe4BgAAAAAHwAQAAngPwASLxAQEAzQIAIfIBQADOAgAh8wEQAJQDACH0AQEA3AIAIfUBEACUAwAh9gEQAJQDACH3ARAAlAMAISQEAAD9AwAgCQAA_gMAIA8AAIAEACAQAACBBAAgnAEBAAAAAZ8BQAAAAAGxAUAAAAABvAEBAAAAAb0BAQAAAAG-AQEAAAABvwEBAAAAAcABEAAAAAHBARAAAAABxQEgAAAAAc8BAQAAAAHrAQEAAAAB7AEBAAAAAe0BAQAAAAHwAQAAAPABAvUBEAAAAAH8AQEAAAAB_QEBAAAAAf8BAAAA_wECgAIQAAAAAYECQAAAAAGCAgAA-wMAIIMCAQAAAAGFAgAAAIUCAoYCAAD8AwAghwICAAAAAYgCAQAAAAGJAiAAAAABigIQAAAAAYsCAgAAAAGMAgIAAAABjQIgAAAAAQIAAAABACAdAACgBAAgCJwBAQAAAAGeAQEAAAABrAEAAACsAQKtASAAAAABrgECAAAAAa8BAQAAAAGwAUAAAAABsQFAAAAAAQOcAQEAAAABngEBAAAAAZ8BQAAAAAEDAAAAFAAgHQAAoAQAIB4AAKYEACAmAAAAFAAgBAAAwAMAIAkAAMEDACAPAADDAwAgEAAAxAMAIBYAAKYEACCcAQEAzQIAIZ8BQADOAgAhsQFAAM4CACG8AQEA3AIAIb0BAQDcAgAhvgEBANwCACG_AQEA3AIAIcABEADoAgAhwQEQAOgCACHFASAA2gIAIc8BAQDcAgAh6wEBAM0CACHsAQEAzQIAIe0BAQDNAgAh8AEAAJ4D8AEi9QEQAOgCACH8AQEAzQIAIf0BAQDcAgAh_wEAALwD_wEigAIQAOgCACGBAkAA5wIAIYICAAC9AwAggwIBANwCACGFAgAAvgOFAiKGAgAAvwMAIIcCAgDpAgAhiAIBANwCACGJAiAA2gIAIYoCEACUAwAhiwICANsCACGMAgIA2wIAIY0CIADaAgAhJAQAAMADACAJAADBAwAgDwAAwwMAIBAAAMQDACCcAQEAzQIAIZ8BQADOAgAhsQFAAM4CACG8AQEA3AIAIb0BAQDcAgAhvgEBANwCACG_AQEA3AIAIcABEADoAgAhwQEQAOgCACHFASAA2gIAIc8BAQDcAgAh6wEBAM0CACHsAQEAzQIAIe0BAQDNAgAh8AEAAJ4D8AEi9QEQAOgCACH8AQEAzQIAIf0BAQDcAgAh_wEAALwD_wEigAIQAOgCACGBAkAA5wIAIYICAAC9AwAggwIBANwCACGFAgAAvgOFAiKGAgAAvwMAIIcCAgDpAgAhiAIBANwCACGJAiAA2gIAIYoCEACUAwAhiwICANsCACGMAgIA2wIAIY0CIADaAgAhJAQAAP0DACAJAAD-AwAgDgAA_wMAIBAAAIEEACCcAQEAAAABnwFAAAAAAbEBQAAAAAG8AQEAAAABvQEBAAAAAb4BAQAAAAG_AQEAAAABwAEQAAAAAcEBEAAAAAHFASAAAAABzwEBAAAAAesBAQAAAAHsAQEAAAAB7QEBAAAAAfABAAAA8AEC9QEQAAAAAfwBAQAAAAH9AQEAAAAB_wEAAAD_AQKAAhAAAAABgQJAAAAAAYICAAD7AwAggwIBAAAAAYUCAAAAhQIChgIAAPwDACCHAgIAAAABiAIBAAAAAYkCIAAAAAGKAhAAAAABiwICAAAAAYwCAgAAAAGNAiAAAAABAgAAAAEAIB0AAKcEACAfCgAAiQMAIA0AAIsDACCcAQEAAAABnwFAAAAAAawBAAAAxwECsQFAAAAAAbIBAQAAAAGzAQEAAAABtAEBAAAAAbUBAQAAAAG2AQAAhwMAILcBQAAAAAG4AUAAAAABuQEBAAAAAboBAQAAAAG7AQEAAAABvAEBAAAAAb0BAQAAAAG-AQEAAAABvwEBAAAAAcABEAAAAAHBARAAAAABwgEQAAAAAcMBAgAAAAHEASAAAAABxQEgAAAAAccBAQAAAAHIAQEAAAAByQEBAAAAAcoBAQAAAAHLAQAAiAMAIAIAAAASACAdAACpBAAgAwAAABQAIB0AAKcEACAeAACtBAAgJgAAABQAIAQAAMADACAJAADBAwAgDgAAwgMAIBAAAMQDACAWAACtBAAgnAEBAM0CACGfAUAAzgIAIbEBQADOAgAhvAEBANwCACG9AQEA3AIAIb4BAQDcAgAhvwEBANwCACHAARAA6AIAIcEBEADoAgAhxQEgANoCACHPAQEA3AIAIesBAQDNAgAh7AEBAM0CACHtAQEAzQIAIfABAACeA_ABIvUBEADoAgAh_AEBAM0CACH9AQEA3AIAIf8BAAC8A_8BIoACEADoAgAhgQJAAOcCACGCAgAAvQMAIIMCAQDcAgAhhQIAAL4DhQIihgIAAL8DACCHAgIA6QIAIYgCAQDcAgAhiQIgANoCACGKAhAAlAMAIYsCAgDbAgAhjAICANsCACGNAiAA2gIAISQEAADAAwAgCQAAwQMAIA4AAMIDACAQAADEAwAgnAEBAM0CACGfAUAAzgIAIbEBQADOAgAhvAEBANwCACG9AQEA3AIAIb4BAQDcAgAhvwEBANwCACHAARAA6AIAIcEBEADoAgAhxQEgANoCACHPAQEA3AIAIesBAQDNAgAh7AEBAM0CACHtAQEAzQIAIfABAACeA_ABIvUBEADoAgAh_AEBAM0CACH9AQEA3AIAIf8BAAC8A_8BIoACEADoAgAhgQJAAOcCACGCAgAAvQMAIIMCAQDcAgAhhQIAAL4DhQIihgIAAL8DACCHAgIA6QIAIYgCAQDcAgAhiQIgANoCACGKAhAAlAMAIYsCAgDbAgAhjAICANsCACGNAiAA2gIAIQMAAAAQACAdAACpBAAgHgAAsAQAICEAAAAQACAKAADsAgAgDQAA7gIAIBYAALAEACCcAQEAzQIAIZ8BQADOAgAhrAEAAOoCxwEisQFAAM4CACGyAQEAzQIAIbMBAQDcAgAhtAEBAM0CACG1AQEAzQIAIbYBAADmAgAgtwFAAM4CACG4AUAA5wIAIbkBAQDNAgAhugEBANwCACG7AQEAzQIAIbwBAQDcAgAhvQEBAM0CACG-AQEAzQIAIb8BAQDcAgAhwAEQAOgCACHBARAA6AIAIcIBEADoAgAhwwECAOkCACHEASAA2gIAIcUBIADaAgAhxwEBANwCACHIAQEA3AIAIckBAQDcAgAhygEBANwCACHLAQAA6wIAIB8KAADsAgAgDQAA7gIAIJwBAQDNAgAhnwFAAM4CACGsAQAA6gLHASKxAUAAzgIAIbIBAQDNAgAhswEBANwCACG0AQEAzQIAIbUBAQDNAgAhtgEAAOYCACC3AUAAzgIAIbgBQADnAgAhuQEBAM0CACG6AQEA3AIAIbsBAQDNAgAhvAEBANwCACG9AQEAzQIAIb4BAQDNAgAhvwEBANwCACHAARAA6AIAIcEBEADoAgAhwgEQAOgCACHDAQIA6QIAIcQBIADaAgAhxQEgANoCACHHAQEA3AIAIcgBAQDcAgAhyQEBANwCACHKAQEA3AIAIcsBAADrAgAgJAQAAP0DACAJAAD-AwAgDgAA_wMAIA8AAIAEACCcAQEAAAABnwFAAAAAAbEBQAAAAAG8AQEAAAABvQEBAAAAAb4BAQAAAAG_AQEAAAABwAEQAAAAAcEBEAAAAAHFASAAAAABzwEBAAAAAesBAQAAAAHsAQEAAAAB7QEBAAAAAfABAAAA8AEC9QEQAAAAAfwBAQAAAAH9AQEAAAAB_wEAAAD_AQKAAhAAAAABgQJAAAAAAYICAAD7AwAggwIBAAAAAYUCAAAAhQIChgIAAPwDACCHAgIAAAABiAIBAAAAAYkCIAAAAAGKAhAAAAABiwICAAAAAYwCAgAAAAGNAiAAAAABAgAAAAEAIB0AALEEACAfCgAAiQMAIAwAAIoDACCcAQEAAAABnwFAAAAAAawBAAAAxwECsQFAAAAAAbIBAQAAAAGzAQEAAAABtAEBAAAAAbUBAQAAAAG2AQAAhwMAILcBQAAAAAG4AUAAAAABuQEBAAAAAboBAQAAAAG7AQEAAAABvAEBAAAAAb0BAQAAAAG-AQEAAAABvwEBAAAAAcABEAAAAAHBARAAAAABwgEQAAAAAcMBAgAAAAHEASAAAAABxQEgAAAAAccBAQAAAAHIAQEAAAAByQEBAAAAAcoBAQAAAAHLAQAAiAMAIAIAAAASACAdAACzBAAgAwAAABQAIB0AALEEACAeAAC3BAAgJgAAABQAIAQAAMADACAJAADBAwAgDgAAwgMAIA8AAMMDACAWAAC3BAAgnAEBAM0CACGfAUAAzgIAIbEBQADOAgAhvAEBANwCACG9AQEA3AIAIb4BAQDcAgAhvwEBANwCACHAARAA6AIAIcEBEADoAgAhxQEgANoCACHPAQEA3AIAIesBAQDNAgAh7AEBAM0CACHtAQEAzQIAIfABAACeA_ABIvUBEADoAgAh_AEBAM0CACH9AQEA3AIAIf8BAAC8A_8BIoACEADoAgAhgQJAAOcCACGCAgAAvQMAIIMCAQDcAgAhhQIAAL4DhQIihgIAAL8DACCHAgIA6QIAIYgCAQDcAgAhiQIgANoCACGKAhAAlAMAIYsCAgDbAgAhjAICANsCACGNAiAA2gIAISQEAADAAwAgCQAAwQMAIA4AAMIDACAPAADDAwAgnAEBAM0CACGfAUAAzgIAIbEBQADOAgAhvAEBANwCACG9AQEA3AIAIb4BAQDcAgAhvwEBANwCACHAARAA6AIAIcEBEADoAgAhxQEgANoCACHPAQEA3AIAIesBAQDNAgAh7AEBAM0CACHtAQEAzQIAIfABAACeA_ABIvUBEADoAgAh_AEBAM0CACH9AQEA3AIAIf8BAAC8A_8BIoACEADoAgAhgQJAAOcCACGCAgAAvQMAIIMCAQDcAgAhhQIAAL4DhQIihgIAAL8DACCHAgIA6QIAIYgCAQDcAgAhiQIgANoCACGKAhAAlAMAIYsCAgDbAgAhjAICANsCACGNAiAA2gIAIQMAAAAQACAdAACzBAAgHgAAugQAICEAAAAQACAKAADsAgAgDAAA7QIAIBYAALoEACCcAQEAzQIAIZ8BQADOAgAhrAEAAOoCxwEisQFAAM4CACGyAQEAzQIAIbMBAQDcAgAhtAEBAM0CACG1AQEAzQIAIbYBAADmAgAgtwFAAM4CACG4AUAA5wIAIbkBAQDNAgAhugEBANwCACG7AQEAzQIAIbwBAQDcAgAhvQEBAM0CACG-AQEAzQIAIb8BAQDcAgAhwAEQAOgCACHBARAA6AIAIcIBEADoAgAhwwECAOkCACHEASAA2gIAIcUBIADaAgAhxwEBANwCACHIAQEA3AIAIckBAQDcAgAhygEBANwCACHLAQAA6wIAIB8KAADsAgAgDAAA7QIAIJwBAQDNAgAhnwFAAM4CACGsAQAA6gLHASKxAUAAzgIAIbIBAQDNAgAhswEBANwCACG0AQEAzQIAIbUBAQDNAgAhtgEAAOYCACC3AUAAzgIAIbgBQADnAgAhuQEBAM0CACG6AQEA3AIAIbsBAQDNAgAhvAEBANwCACG9AQEAzQIAIb4BAQDNAgAhvwEBANwCACHAARAA6AIAIcEBEADoAgAhwgEQAOgCACHDAQIA6QIAIcQBIADaAgAhxQEgANoCACHHAQEA3AIAIcgBAQDcAgAhyQEBANwCACHKAQEA3AIAIcsBAADrAgAgBgQGAggACgkKAw4TBg8gBxAhCAEDAAEDBQABBw4ECAAFAQYAAwEHDwAECAAJChUBDBkHDR0IAgMAAQsABgIDAAELAAYCDB4ADR8ABQQiAAkjAA4kAA8lABAmAAAAAAUIAA8jABAkABElABImABMAAAAAAAUIAA8jABAkABElABImABMBAwABAQMAAQUIABgjABkkABolABsmABwAAAAAAAUIABgjABkkABolABsmABwBBQABAQUAAQUIACEjACIkACMlACQmACUAAAAAAAUIACEjACIkACMlACQmACUBBgADAQYAAwUIACojACskACwlAC0mAC4AAAAAAAUIACojACskACwlAC0mAC4AAAADCAA0JQA1JgA2AAAAAwgANCUANSYANgEKogEBAQqoAQEFCAA7IwA8JAA9JQA-JgA_AAAAAAAFCAA7IwA8JAA9JQA-JgA_AgMAAQsABgIDAAELAAYFCABEIwBFJABGJQBHJgBIAAAAAAAFCABEIwBFJABGJQBHJgBIAgMAAQsABgIDAAELAAYDCABNJQBOJgBPAAAAAwgATSUATiYATxECARInARMpARQqARUrARctARgvCxkwDBoyARs0Cxw1DR82ASA3ASE4Cyc7Dig8FCk9Aio-Ais_AixAAi1BAi5DAi9FCzBGFTFIAjJKCzNLFjRMAjVNAjZOCzdRFzhSHTlTAzpUAztVAzxWAz1XAz5ZAz9bC0BcHkFeA0JgC0NhH0RiA0VjA0ZkC0dnIEhoJklpBEpqBEtrBExsBE1tBE5vBE9xC1ByJ1F0BFJ2C1N3KFR4BFV5BFZ6C1d9KVh-L1mAATBagQEwW4QBMFyFATBdhgEwXogBMF-KAQtgiwExYY0BMGKPAQtjkAEyZJEBMGWSATBmkwELZ5YBM2iXATdpmAEGapkBBmuaAQZsmwEGbZwBBm6eAQZvoAELcKEBOHGkAQZypgELc6cBOXSpAQZ1qgEGdqsBC3euATp4rwFAebABB3qxAQd7sgEHfLMBB320AQd-tgEHf7gBC4ABuQFBgQG7AQeCAb0BC4MBvgFChAG_AQeFAcABB4YBwQELhwHEAUOIAcUBSYkBxgEIigHHAQiLAcgBCIwByQEIjQHKAQiOAcwBCI8BzgELkAHPAUqRAdEBCJIB0wELkwHUAUuUAdUBCJUB1gEIlgHXAQuXAdoBTJgB2wFQ"
};
async function decodeBase64AsWasm(wasmBase64) {
  const { Buffer: Buffer2 } = await import("node:buffer");
  const wasmArray = Buffer2.from(wasmBase64, "base64");
  return new WebAssembly.Module(wasmArray);
}
config.compilerWasm = {
  getRuntime: async () => await import("@prisma/client/runtime/query_compiler_fast_bg.postgresql.mjs"),
  getQueryCompilerWasmModule: async () => {
    const { wasm } = await import("@prisma/client/runtime/query_compiler_fast_bg.postgresql.wasm-base64.mjs");
    return await decodeBase64AsWasm(wasm);
  },
  importName: "./query_compiler_fast_bg.js"
};
function getPrismaClientClass() {
  return runtime.getPrismaClient(config);
}

// generated/prisma/internal/prismaNamespace.ts
import * as runtime2 from "@prisma/client/runtime/client";
var getExtensionContext = runtime2.Extensions.getExtensionContext;
var NullTypes2 = {
  DbNull: runtime2.NullTypes.DbNull,
  JsonNull: runtime2.NullTypes.JsonNull,
  AnyNull: runtime2.NullTypes.AnyNull
};
var TransactionIsolationLevel = runtime2.makeStrictEnum({
  ReadUncommitted: "ReadUncommitted",
  ReadCommitted: "ReadCommitted",
  RepeatableRead: "RepeatableRead",
  Serializable: "Serializable"
});
var defineExtension = runtime2.Extensions.defineExtension;

// generated/prisma/client.ts
globalThis["__dirname"] = path.dirname(fileURLToPath(import.meta.url));
var PrismaClient = getPrismaClientClass();

// src/lib/prisma.ts
init_env();
if (!ENV.DATABASE_URL) throw new Error("DATABASE_URL is required");
var adapter = new PrismaPg({ connectionString: ENV.DATABASE_URL });
var prisma = new PrismaClient({ adapter });

// src/modeles/user/user.service.ts
init_types();

// src/utils/normalization.util.ts
init_types();
init_response_util();
var normalizeEmail = (value) => value.trim().toLowerCase();
function normalizePhone(value) {
  const cleaned = value.trim().replace(/[\s()-]/g, "");
  if (!cleaned) throw new ErrorResponse("Phone number is required", 400 /* Bad_Request */);
  if (cleaned.startsWith("+")) {
    if (!/^\+[1-9]\d{6,14}$/.test(cleaned)) {
      throw new ErrorResponse("Please enter a valid phone number", 400 /* Bad_Request */);
    }
    return cleaned;
  }
  if (/^\d{10}$/.test(cleaned)) {
    return `+91${cleaned}`;
  }
  if (/^0\d{10}$/.test(cleaned)) {
    return `+91${cleaned.slice(1)}`;
  }
  if (/^\d{7,15}$/.test(cleaned)) {
    return `+${cleaned}`;
  }
  throw new ErrorResponse("Please enter a valid phone number", 400 /* Bad_Request */);
}

// src/utils/password.util.ts
import bcrypt from "bcryptjs";
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// src/modeles/user/user.service.ts
init_response_util();
init_upload_util();
var UserService = class {
  /**
   * CREATE: Create a new User / Performer model
   */
  async create(data, avatarFile, photoFiles) {
    const email = normalizeEmail(data.email);
    const phone = normalizePhone(data.phone);
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { phone }] }
    });
    if (existing) {
      throw new ErrorResponse("User with this email or phone already exists", 409 /* Conflict */);
    }
    const passwordHash = await hashPassword(data.password || "Garba@123");
    let avatarUrl = data.avatarUrl || null;
    if (avatarFile) {
      const [uploaded] = await uploadImages([avatarFile], "garba/avatars");
      avatarUrl = uploaded?.url || null;
    }
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email,
        phone,
        passwordHash,
        avatarUrl,
        gender: data.gender,
        role: data.role,
        height: data.height ? data.height : null,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        languages: data.languages || ["Gujarati", "Hindi"],
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        pincode: data.pincode || null,
        latitude: data.latitude ? data.latitude : null,
        longitude: data.longitude ? data.longitude : null,
        bio: data.bio || null,
        skillLevel: data.skillLevel || "INTERMEDIATE",
        danceStyles: data.danceStyles || ["Traditional Garba", "Dodhiya"],
        experienceYears: data.experienceYears ?? 0,
        instagramHandle: data.instagramHandle || null,
        hourlyRate: data.hourlyRate ? data.hourlyRate : null,
        upiId: data.upiId || null,
        isAvailable: data.isAvailable ?? true,
        isActive: data.isActive ?? true,
        isVerified: data.isVerified ?? false
      }
    });
    const rawPhotoUrls = [
      ...data.photoUrls && Array.isArray(data.photoUrls) ? data.photoUrls : [],
      ...data.photos && Array.isArray(data.photos) ? data.photos : []
    ].filter((u) => typeof u === "string" && u.trim().length > 0);
    const photosToInsert = [];
    let currentOrder = 0;
    if (photoFiles && photoFiles.length > 0) {
      try {
        const uploadedPhotos = await uploadImages(photoFiles, "garba/gallery");
        for (const p of uploadedPhotos) {
          photosToInsert.push({
            userId: user.id,
            imageUrl: p.url,
            publicId: p.publicId,
            caption: `Photo ${currentOrder + 1}`,
            order: currentOrder
          });
          currentOrder++;
        }
      } catch (uploadErr) {
        console.error("[Create User Gallery Upload Error]", uploadErr);
      }
    }
    if (rawPhotoUrls.length > 0) {
      for (const url of rawPhotoUrls) {
        photosToInsert.push({
          userId: user.id,
          imageUrl: url.trim(),
          caption: `Photo ${currentOrder + 1}`,
          order: currentOrder
        });
        currentOrder++;
      }
    }
    if (photosToInsert.length > 0) {
      await prisma.userPhoto.createMany({
        data: photosToInsert
      });
    }
    return this.getById(user.id);
  }
  /**
   * GET ALL: List & search users/models with multi-filters and pagination
   */
  async getAll(query) {
    const { search, role, city, state, gender, skillLevel, minRate, maxRate, isAvailable, isActive, page, limit } = query;
    const skip = (page - 1) * limit;
    const where = {};
    if (role) where.role = role;
    if (city) where.city = { contains: city, mode: "insensitive" };
    if (state) where.state = { contains: state, mode: "insensitive" };
    if (gender) where.gender = gender;
    if (skillLevel) where.skillLevel = skillLevel;
    if (isAvailable !== void 0) where.isAvailable = isAvailable === "true";
    if (isActive !== void 0) where.isActive = isActive === "true";
    if (minRate !== void 0 || maxRate !== void 0) {
      where.hourlyRate = {};
      if (minRate !== void 0) where.hourlyRate.gte = minRate;
      if (maxRate !== void 0) where.hourlyRate.lte = maxRate;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
        { city: { contains: search, mode: "insensitive" } },
        { bio: { contains: search, mode: "insensitive" } }
      ];
    }
    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          photos: {
            orderBy: { order: "asc" }
          }
        }
      })
    ]);
    const safeUsers = users.map(({ passwordHash: _, ...u }) => u);
    return {
      users: safeUsers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  /**
   * GET BY ID: Fetch single user/model details with photos
   */
  async getById(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        photos: {
          orderBy: { order: "asc" }
        }
      }
    });
    if (!user) {
      throw new ErrorResponse("User model not found", 404 /* Not_Found */);
    }
    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }
  /**
   * UPDATE: Update user/model details, optional avatar, and optional gallery photos
   */
  async update(userId, data, avatarFile, photoFiles) {
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      throw new ErrorResponse("User model not found", 404 /* Not_Found */);
    }
    let avatarUrl = data.avatarUrl !== void 0 ? data.avatarUrl : existing.avatarUrl;
    if (avatarFile) {
      const [uploaded] = await uploadImages([avatarFile], "garba/avatars");
      avatarUrl = uploaded?.url || avatarUrl;
    }
    const rawPhotoUrls = [
      ...data.photoUrls && Array.isArray(data.photoUrls) ? data.photoUrls : [],
      ...data.photos && Array.isArray(data.photos) ? data.photos : []
    ].filter((u) => typeof u === "string" && u.trim().length > 0);
    if (photoFiles && photoFiles.length > 0 || rawPhotoUrls.length > 0) {
      const photosToInsert = [];
      let currentOrder = 0;
      if (photoFiles && photoFiles.length > 0) {
        try {
          const uploadedPhotos = await uploadImages(photoFiles, "garba/gallery");
          for (const p of uploadedPhotos) {
            photosToInsert.push({
              userId,
              imageUrl: p.url,
              publicId: p.publicId,
              caption: `Photo ${currentOrder + 1}`,
              order: currentOrder
            });
            currentOrder++;
          }
        } catch (uploadErr) {
          console.error("[Update User Gallery Upload Error]", uploadErr);
        }
      }
      if (rawPhotoUrls.length > 0) {
        for (const url of rawPhotoUrls) {
          photosToInsert.push({
            userId,
            imageUrl: url.trim(),
            caption: `Photo ${currentOrder + 1}`,
            order: currentOrder
          });
          currentOrder++;
        }
      }
      if (photosToInsert.length > 0) {
        await prisma.userPhoto.deleteMany({ where: { userId } });
        await prisma.userPhoto.createMany({
          data: photosToInsert
        });
      }
    }
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name ?? void 0,
        email: data.email ? normalizeEmail(data.email) : void 0,
        phone: data.phone ? normalizePhone(data.phone) : void 0,
        avatarUrl: avatarUrl ?? void 0,
        gender: data.gender ?? void 0,
        role: data.role ?? void 0,
        height: data.height !== void 0 ? data.height : void 0,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : void 0,
        languages: data.languages ?? void 0,
        address: data.address !== void 0 ? data.address : void 0,
        city: data.city !== void 0 ? data.city : void 0,
        state: data.state !== void 0 ? data.state : void 0,
        pincode: data.pincode !== void 0 ? data.pincode : void 0,
        latitude: data.latitude !== void 0 ? data.latitude : void 0,
        longitude: data.longitude !== void 0 ? data.longitude : void 0,
        bio: data.bio !== void 0 ? data.bio : void 0,
        skillLevel: data.skillLevel ?? void 0,
        danceStyles: data.danceStyles ?? void 0,
        experienceYears: data.experienceYears ?? void 0,
        instagramHandle: data.instagramHandle !== void 0 ? data.instagramHandle : void 0,
        hourlyRate: data.hourlyRate !== void 0 ? data.hourlyRate : void 0,
        upiId: data.upiId !== void 0 ? data.upiId : void 0,
        isAvailable: data.isAvailable !== void 0 ? data.isAvailable : void 0,
        isActive: data.isActive !== void 0 ? data.isActive : void 0,
        isVerified: data.isVerified !== void 0 ? data.isVerified : void 0
      },
      include: {
        photos: {
          orderBy: { order: "asc" }
        }
      }
    });
    const { passwordHash: _, ...safeUser } = updated;
    return safeUser;
  }
  /**
   * DELETE: Delete user/model from database
   */
  async delete(userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new ErrorResponse("User model not found", 404 /* Not_Found */);
    }
    await prisma.user.delete({ where: { id: userId } });
    return { success: true, message: "User model deleted successfully" };
  }
  /**
   * Upload multiple gallery photos (at least 5 photos supported)
   */
  async uploadGalleryPhotos(userId, files) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new ErrorResponse("User model not found", 404 /* Not_Found */);
    }
    const existingPhotosCount = await prisma.userPhoto.count({ where: { userId } });
    const uploaded = await uploadImages(files, `garba/users/${userId}/gallery`);
    await prisma.userPhoto.createMany({
      data: uploaded.map((p, idx) => ({
        userId,
        imageUrl: p.url,
        publicId: p.publicId,
        caption: `Gallery Photo ${existingPhotosCount + idx + 1}`,
        order: existingPhotosCount + idx
      }))
    });
    return prisma.userPhoto.findMany({
      where: { userId },
      orderBy: { order: "asc" }
    });
  }
  /**
   * Delete a single gallery photo
   */
  async deleteGalleryPhoto(userId, photoId) {
    const photo = await prisma.userPhoto.findFirst({
      where: { id: photoId, userId }
    });
    if (!photo) {
      throw new ErrorResponse("Photo not found", 404 /* Not_Found */);
    }
    await prisma.userPhoto.delete({ where: { id: photoId } });
    return { success: true, message: "Photo deleted successfully" };
  }
  /**
   * Toggle Active / Availability / Verified status
   */
  async toggleStatus(userId, field) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ErrorResponse("User model not found", 404 /* Not_Found */);
    const currentValue = user[field];
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { [field]: !currentValue },
      select: { id: true, name: true, [field]: true }
    });
    return updated;
  }
};
var userService = new UserService();

// src/modeles/user/user.validation.ts
import { z } from "zod";
var RoleEnum = z.enum(["CUSTOMER", "PERFORMER", "ORGANIZER", "ADMIN"]);
var GenderEnum = z.enum(["MALE", "FEMALE", "OTHER"]);
var SkillLevelEnum = z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "PRO", "CHOREOGRAPHER"]);
var arrayPreprocessor = (val) => {
  if (!val) return void 0;
  if (Array.isArray(val)) {
    return val.map((item) => typeof item === "object" && item !== null && "imageUrl" in item ? item.imageUrl : String(item)).filter(Boolean);
  }
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => typeof item === "object" && item !== null && "imageUrl" in item ? item.imageUrl : String(item)).filter(Boolean);
      }
    } catch {
      return val.split(",").map((s) => s.trim()).filter(Boolean);
    }
    return [val];
  }
  return val;
};
var booleanPreprocessor = (val) => {
  if (val === "true" || val === true || val === 1 || val === "1") return true;
  if (val === "false" || val === false || val === 0 || val === "0") return false;
  return val;
};
var createUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  password: z.string().min(6, "Password must be at least 6 characters").default("Garba@123").optional(),
  avatarUrl: z.string().optional().nullable(),
  gender: GenderEnum.default("OTHER"),
  role: RoleEnum.default("PERFORMER"),
  // Physical & Personal Details
  height: z.preprocess((v) => v === "" || v === void 0 ? null : v, z.coerce.number().min(50).max(250).optional().nullable()),
  dateOfBirth: z.string().optional().nullable(),
  languages: z.preprocess(arrayPreprocessor, z.array(z.string()).default(["Gujarati", "Hindi"]).optional()),
  // Location
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  pincode: z.string().optional().nullable(),
  latitude: z.preprocess((v) => v === "" || v === void 0 ? null : v, z.coerce.number().optional().nullable()),
  longitude: z.preprocess((v) => v === "" || v === void 0 ? null : v, z.coerce.number().optional().nullable()),
  // Performer attributes
  bio: z.string().max(1e3).optional().nullable(),
  skillLevel: SkillLevelEnum.default("INTERMEDIATE").optional(),
  danceStyles: z.preprocess(arrayPreprocessor, z.array(z.string()).default(["Traditional Garba", "Dodhiya"]).optional()),
  experienceYears: z.preprocess((v) => v === "" || v === void 0 ? 0 : v, z.coerce.number().min(0).max(50).default(0).optional()),
  instagramHandle: z.string().optional().nullable(),
  // Booking & Rates
  hourlyRate: z.preprocess((v) => v === "" || v === void 0 ? null : v, z.coerce.number().min(0).optional().nullable()),
  upiId: z.string().optional().nullable(),
  isAvailable: z.preprocess(booleanPreprocessor, z.boolean().default(true).optional()),
  isActive: z.preprocess(booleanPreprocessor, z.boolean().default(true).optional()),
  isVerified: z.preprocess(booleanPreprocessor, z.boolean().default(false).optional()),
  photoUrls: z.preprocess(arrayPreprocessor, z.array(z.string()).optional()),
  photos: z.preprocess(arrayPreprocessor, z.array(z.string()).optional())
});
var updateUserSchema = createUserSchema.partial().omit({ password: true });
var queryUsersSchema = z.object({
  search: z.string().optional(),
  role: RoleEnum.optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  gender: GenderEnum.optional(),
  skillLevel: SkillLevelEnum.optional(),
  minRate: z.coerce.number().optional(),
  maxRate: z.coerce.number().optional(),
  isAvailable: z.enum(["true", "false"]).optional(),
  isActive: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10)
});

// src/modeles/user/user.controller.ts
function extractFiles(req) {
  let avatarFile = void 0;
  let photoFiles = void 0;
  if (Array.isArray(req.files)) {
    avatarFile = req.files.find((f) => f.fieldname === "avatar");
    const photos = req.files.filter(
      (f) => f.fieldname === "photos" || f.fieldname === "photo" || f.fieldname === "images" || f.fieldname === "gallery" || f.fieldname === "files" || f.fieldname.startsWith("photo")
    );
    if (photos.length > 0) photoFiles = photos;
    const firstFile = req.files[0];
    if (!avatarFile && (!photoFiles || photoFiles.length === 0) && firstFile) {
      if (firstFile.fieldname === "avatar") {
        avatarFile = firstFile;
      } else {
        photoFiles = req.files;
      }
    }
  } else if (req.files && typeof req.files === "object") {
    const filesDict = req.files;
    avatarFile = filesDict.avatar?.[0];
    photoFiles = filesDict.photos || filesDict.photo || filesDict.images || filesDict.files;
  } else if (req.file) {
    if (req.file.fieldname === "avatar") {
      avatarFile = req.file;
    } else {
      photoFiles = [req.file];
    }
  }
  return { avatarFile, photoFiles };
}
var UserController = class {
  /**
   * CREATE: POST /api/v1/users
   * Create a new User / Performer model with avatar and optional gallery photos
   */
  async create(req, res, next) {
    try {
      const validated = createUserSchema.parse(req.body);
      const { avatarFile, photoFiles } = extractFiles(req);
      const user = await userService.create(validated, avatarFile, photoFiles);
      return SuccessResponse(res, "User model created successfully", user, 201 /* Created */);
    } catch (err) {
      next(err);
    }
  }
  /**
   * GET ALL: GET /api/v1/users
   * Get all users/performers with search, filters (role, skill, city, rate), and pagination
   */
  async getAll(req, res, next) {
    try {
      const validated = queryUsersSchema.parse(req.query);
      const result = await userService.getAll(validated);
      return SuccessResponse(res, "Users fetched successfully", result);
    } catch (err) {
      next(err);
    }
  }
  /**
   * GET BY ID: GET /api/v1/users/:id
   * Get full user model details by ID with photo gallery
   */
  async getById(req, res, next) {
    try {
      const user = await userService.getById(req.params.id);
      return SuccessResponse(res, "User details fetched successfully", user);
    } catch (err) {
      next(err);
    }
  }
  /**
   * UPDATE: PATCH /api/v1/users/:id
   * Update user details (bio, rate, availability, height, dance styles, avatar, gallery photos)
   */
  async update(req, res, next) {
    try {
      const validated = updateUserSchema.parse(req.body);
      const { avatarFile, photoFiles } = extractFiles(req);
      const updated = await userService.update(req.params.id, validated, avatarFile, photoFiles);
      return SuccessResponse(res, "User model updated successfully", updated);
    } catch (err) {
      next(err);
    }
  }
  /**
   * DELETE: DELETE /api/v1/users/:id
   * Delete user model from database
   */
  async delete(req, res, next) {
    try {
      const result = await userService.delete(req.params.id);
      return SuccessResponse(res, "User model deleted successfully", result);
    } catch (err) {
      next(err);
    }
  }
  /**
   * UPLOAD PHOTOS: POST /api/v1/users/:id/photos
   * Upload multiple gallery photos for user (at least 5 photos supported)
   */
  async uploadPhotos(req, res, next) {
    try {
      let files = [];
      if (Array.isArray(req.files)) {
        files = req.files;
      } else if (req.files && typeof req.files === "object") {
        files = Object.values(req.files).flat();
      } else if (req.file) {
        files = [req.file];
      }
      if (!files || files.length === 0) {
        return SuccessResponse(res, "No files uploaded", [], 400 /* Bad_Request */);
      }
      const photos = await userService.uploadGalleryPhotos(req.params.id, files);
      return SuccessResponse(res, "Gallery photos uploaded successfully", photos, 201 /* Created */);
    } catch (err) {
      next(err);
    }
  }
  /**
   * DELETE PHOTO: DELETE /api/v1/users/:id/photos/:photoId
   * Delete a single photo from gallery
   */
  async deletePhoto(req, res, next) {
    try {
      const result = await userService.deleteGalleryPhoto(
        req.params.id,
        req.params.photoId
      );
      return SuccessResponse(res, "Photo deleted successfully", result);
    } catch (err) {
      next(err);
    }
  }
  /**
   * TOGGLE STATUS: PATCH /api/v1/users/:id/toggle-status
   * Toggle isActive, isAvailable, or isVerified
   */
  async toggleStatus(req, res, next) {
    try {
      const field = req.body.field || "isAvailable";
      const result = await userService.toggleStatus(req.params.id, field);
      return SuccessResponse(res, `${field} toggled successfully`, result);
    } catch (err) {
      next(err);
    }
  }
};
var userController = new UserController();

// src/modeles/user/user.routes.ts
var router = Router();
router.post(
  "/",
  upload.any(),
  userController.create.bind(userController)
);
router.get("/", userController.getAll.bind(userController));
router.get("/:id", userController.getById.bind(userController));
router.patch(
  "/:id",
  upload.any(),
  userController.update.bind(userController)
);
router.delete("/:id", userController.delete.bind(userController));
router.post(
  "/:id/photos",
  upload.any(),
  userController.uploadPhotos.bind(userController)
);
router.delete("/:id/photos/:photoId", userController.deletePhoto.bind(userController));
router.patch("/:id/toggle-status", userController.toggleStatus.bind(userController));
var user_routes_default = router;

// src/modeles/booking/booking.routes.ts
import { Router as Router2 } from "express";

// src/modeles/booking/booking.service.ts
import crypto2 from "node:crypto";

// src/utils/payment-qr.util.ts
import QRCode from "qrcode";
function buildUpiPayload(options) {
  const params = new URLSearchParams();
  params.set("pa", options.vpa);
  params.set("pn", options.payeeName);
  params.set("am", Number(options.amount).toFixed(2));
  params.set("cu", options.currency || "INR");
  params.set("tr", options.transactionRef);
  if (options.transactionNote) {
    params.set("tn", options.transactionNote);
  }
  return `upi://pay?${params.toString()}`;
}
async function generateUpiQrCode(options) {
  const upiPayload = buildUpiPayload(options);
  const qrCodeDataUrl = await QRCode.toDataURL(upiPayload, {
    errorCorrectionLevel: "M",
    margin: 2,
    scale: 8,
    color: {
      dark: "#000000",
      light: "#ffffff"
    }
  });
  return {
    upiPayload,
    qrCodeDataUrl
  };
}
function generateBookingCode() {
  const dateStr = (/* @__PURE__ */ new Date()).toISOString().slice(0, 7).replace("-", "");
  const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `GBK-${dateStr}-${randomSuffix}`;
}

// src/modeles/booking/booking.service.ts
init_upload_util();
init_response_util();
init_types();
var DEFAULT_MERCHANT_VPA = process.env.MERCHANT_UPI_ID || "garbamitra.pay@okaxis";
var QR_EXPIRY_MINUTES = 15;
var BookingService = class {
  /**
   * Check for slot collisions to prevent double-booking a performer
   */
  async checkSlotCollision(performerId, bookingDate, start, end) {
    const now = /* @__PURE__ */ new Date();
    const conflicting = await prisma.booking.findFirst({
      where: {
        performerId,
        bookingDate,
        OR: [
          { status: { in: ["CONFIRMED", "PAYMENT_VERIFIED", "IN_PROGRESS"] } },
          {
            status: "PENDING",
            expiresAt: { gt: now }
          }
        ],
        AND: [
          { startTime: { lt: end } },
          { endTime: { gt: start } }
        ]
      },
      select: { id: true, bookingCode: true, startTime: true, endTime: true, status: true }
    });
    return conflicting;
  }
  /**
   * Initiate booking, calculate total amount, lock slot, and generate dynamic UPI QR code
   */
  async initiateBooking(data) {
    const performer = await prisma.user.findUnique({ where: { id: data.performerId } });
    if (!performer) {
      throw new ErrorResponse("Performer not found", 404 /* Not_Found */);
    }
    if (!performer.isAvailable) {
      throw new ErrorResponse("Performer is currently unavailable for bookings", 409 /* Conflict */);
    }
    const bDate = new Date(data.bookingDate);
    const start = new Date(data.startTime);
    const end = new Date(data.endTime);
    if (start >= end) {
      throw new ErrorResponse("Slot start time must be before end time", 400 /* Bad_Request */);
    }
    const durationMillis = end.getTime() - start.getTime();
    const durationHours = parseFloat((durationMillis / (1e3 * 60 * 60)).toFixed(2));
    if (durationHours < 0.5) {
      throw new ErrorResponse("Minimum booking duration is 30 minutes (0.5 hr)", 400 /* Bad_Request */);
    }
    const conflict = await this.checkSlotCollision(data.performerId, bDate, start, end);
    if (conflict) {
      throw new ErrorResponse(
        `This time slot overlaps with an existing booking (${conflict.bookingCode}). Please choose another time.`,
        409 /* Conflict */
      );
    }
    const hourlyRate = performer.hourlyRate ? Number(performer.hourlyRate) : 399;
    const totalAmount = hourlyRate;
    const advanceAmount = totalAmount;
    const bookingCode = generateBookingCode();
    const transactionRef = `TXN-${bookingCode}-${crypto2.randomBytes(3).toString("hex").toUpperCase()}`;
    const expiresAt = new Date(Date.now() + QR_EXPIRY_MINUTES * 60 * 1e3);
    let payeeVpa = DEFAULT_MERCHANT_VPA;
    let payeeName = "GarbaMitra Platform";
    let activeQrImageUrl = null;
    let activePaymentMethod = null;
    try {
      const activeQR = await prisma.qRCode.findFirst({
        where: { isActive: true, isPrimary: true }
      }) || await prisma.qRCode.findFirst({
        where: { isActive: true }
      });
      if (activeQR) {
        if (activeQR.upiId) payeeVpa = activeQR.upiId;
        if (activeQR.accountHolderName) payeeName = activeQR.accountHolderName;
        if (activeQR.imageUrl) {
          activeQrImageUrl = activeQR.imageUrl;
          activePaymentMethod = "UPI_QR_STATIC";
        }
      }
    } catch {
    }
    const { upiPayload, qrCodeDataUrl } = await generateUpiQrCode({
      vpa: payeeVpa,
      payeeName,
      amount: totalAmount,
      transactionRef,
      transactionNote: `Booking for ${performer.name} - ${bookingCode}`,
      currency: "INR"
    });
    const finalQrCodeUrl = activeQrImageUrl || qrCodeDataUrl;
    let clientImageJson = null;
    if (data.image) {
      clientImageJson = typeof data.image === "string" ? { url: data.image } : data.image;
    } else if (data.avatarUrl) {
      clientImageJson = { url: data.avatarUrl };
    }
    const [booking, payment] = await prisma.$transaction(async (tx) => {
      const newBooking = await tx.booking.create({
        data: {
          bookingCode,
          name: data.name,
          email: data.email,
          phone: data.phone,
          address: data.address,
          image: clientImageJson || void 0,
          gender: data.gender,
          performerId: data.performerId,
          bookingDate: bDate,
          startTime: start,
          endTime: end,
          durationHours,
          eventAddress: data.eventAddress || null,
          city: data.city || performer.city || null,
          notes: data.notes || null,
          hourlyRate,
          totalAmount,
          advanceAmount,
          status: "PENDING",
          expiresAt
        }
      });
      const newPayment = await tx.payment.create({
        data: {
          bookingId: newBooking.id,
          amount: totalAmount,
          currency: "INR",
          paymentMethod: data.paymentMethod || activePaymentMethod || "UPI_QR_DYNAMIC",
          paymentStatus: "PENDING",
          qrCodeUrl: finalQrCodeUrl,
          upiPayload,
          transactionRef,
          expiresAt
        }
      });
      return [newBooking, newPayment];
    });
    return {
      booking: {
        id: booking.id,
        bookingCode: booking.bookingCode,
        name: booking.name,
        bookingDate: data.bookingDate,
        durationHours: booking.durationHours,
        totalAmount: booking.totalAmount,
        status: booking.status,
        expiresAt: booking.expiresAt
      },
      performer: {
        id: performer.id,
        name: performer.name,
        hourlyRate: performer.hourlyRate,
        upiId: performer.upiId
      },
      payment: {
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        transactionRef: payment.transactionRef,
        upiPayload: payment.upiPayload,
        qrCodeUrl: payment.qrCodeUrl,
        // Base64 QR code to display in frontend
        expiresAt: payment.expiresAt
      }
    };
  }
  /**
   * Submit UTR / Payment proof after scanning QR
   */
  async submitPaymentProof(bookingId, data, proofFile) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payments: true }
    });
    if (!booking) {
      throw new ErrorResponse("Booking not found", 404 /* Not_Found */);
    }
    let screenshotUrl = data.paymentScreenshotUrl || null;
    if (proofFile) {
      const [uploaded] = await uploadImages([proofFile], "garba/payment_proofs");
      screenshotUrl = uploaded?.url || null;
    }
    const latestPayment = booking.payments[booking.payments.length - 1];
    if (latestPayment) {
      await prisma.payment.update({
        where: { id: latestPayment.id },
        data: {
          utrNumber: data.utrNumber,
          paymentScreenshotUrl: screenshotUrl || latestPayment.paymentScreenshotUrl,
          paymentStatus: "SUBMITTED"
        }
      });
    } else {
      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          amount: booking.totalAmount,
          currency: "INR",
          paymentMethod: "UPI_QR_DYNAMIC",
          paymentStatus: "SUBMITTED",
          utrNumber: data.utrNumber,
          paymentScreenshotUrl: screenshotUrl,
          transactionRef: `TXN-${booking.bookingCode}-${crypto2.randomBytes(3).toString("hex").toUpperCase()}`
        }
      });
    }
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: "PAYMENT_VERIFIED" },
      include: {
        performer: { select: { id: true, name: true, phone: true, upiId: true, avatarUrl: true } },
        payments: true
      }
    });
    return updatedBooking;
  }
  /**
   * Update booking status (e.g. Admin/Performer confirms or cancels)
   */
  async updateBookingStatus(bookingId, data) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payments: true, performer: true }
    });
    if (!booking) {
      throw new ErrorResponse("Booking not found", 404 /* Not_Found */);
    }
    const newStatus = data.status;
    const [updatedBooking] = await prisma.$transaction([
      prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: newStatus,
          notes: data.notes ? `${booking.notes || ""}
[Update]: ${data.notes}` : booking.notes
        },
        include: {
          performer: { select: { id: true, name: true, phone: true, upiId: true, avatarUrl: true } },
          payments: true
        }
      }),
      // If confirmed, mark payment SUCCESS
      ...newStatus === "CONFIRMED" && booking.payments[0] ? [
        prisma.payment.update({
          where: { id: booking.payments[0].id },
          data: {
            paymentStatus: "SUCCESS",
            paidAt: /* @__PURE__ */ new Date()
          }
        }),
        // Increment performer total bookings done
        prisma.user.update({
          where: { id: booking.performerId },
          data: { totalBookingsDone: { increment: 1 } }
        })
      ] : []
    ]);
    return updatedBooking;
  }
  /**
   * Get single booking by ID with full details
   */
  async getBookingDetails(bookingId) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        performer: {
          select: { id: true, name: true, email: true, phone: true, avatarUrl: true, hourlyRate: true, upiId: true, city: true }
        },
        payments: {
          orderBy: { createdAt: "desc" }
        }
      }
    });
    if (!booking) {
      throw new ErrorResponse("Booking not found", 404 /* Not_Found */);
    }
    return booking;
  }
  /**
   * Query & list all bookings with filters & pagination
   */
  async listBookings(query) {
    const { status, performerId, search, date, page, limit } = query;
    const skip = (page - 1) * limit;
    const where = {};
    if (status) where.status = status;
    if (performerId) where.performerId = performerId;
    if (date) where.bookingDate = new Date(date);
    if (search) {
      where.OR = [
        { bookingCode: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
        { email: { contains: search, mode: "insensitive" } }
      ];
    }
    const [total, bookings] = await Promise.all([
      prisma.booking.count({ where }),
      prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          performer: { select: { id: true, name: true, phone: true, upiId: true, hourlyRate: true, avatarUrl: true } },
          payments: {
            orderBy: { createdAt: "desc" },
            take: 1
          }
        }
      })
    ]);
    return {
      bookings,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  /**
   * Get booked & available slots for a performer on a specific date
   */
  async getPerformerSlots(performerId, dateStr) {
    const bDate = new Date(dateStr);
    const now = /* @__PURE__ */ new Date();
    const bookings = await prisma.booking.findMany({
      where: {
        performerId,
        bookingDate: bDate,
        OR: [
          { status: { in: ["CONFIRMED", "PAYMENT_VERIFIED", "IN_PROGRESS"] } },
          { status: "PENDING", expiresAt: { gt: now } }
        ]
      },
      select: {
        id: true,
        bookingCode: true,
        startTime: true,
        endTime: true,
        durationHours: true,
        status: true
      },
      orderBy: { startTime: "asc" }
    });
    return {
      date: dateStr,
      performerId,
      bookedIntervals: bookings.map((b) => ({
        bookingCode: b.bookingCode,
        startTime: b.startTime,
        endTime: b.endTime,
        durationHours: b.durationHours,
        status: b.status
      }))
    };
  }
};
var bookingService = new BookingService();

// src/modeles/booking/booking.controller.ts
init_response_util();
init_types();

// src/modeles/booking/booking.validation.ts
import { z as z2 } from "zod";
var BookingStatusEnum = z2.enum([
  "PENDING",
  "PAYMENT_VERIFIED",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
  "REJECTED"
]);
var PaymentMethodEnum = z2.enum([
  "UPI_QR_DYNAMIC",
  "UPI_QR_STATIC",
  "GATEWAY_RAZORPAY"
]);
var initiateBookingSchema = z2.object({
  // Performer ID
  performerId: z2.string().uuid("Invalid performer ID"),
  // Booker / Client Contact Details
  name: z2.string().min(2, "Name must be at least 2 characters"),
  email: z2.string().email("Invalid email address"),
  phone: z2.string().min(10, "Phone number must be at least 10 digits"),
  address: z2.string().min(3, "Address is required"),
  gender: GenderEnum.default("OTHER"),
  avatarUrl: z2.string().optional().nullable(),
  image: z2.any().optional().nullable(),
  // Slot Timing
  bookingDate: z2.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid booking date format (expected YYYY-MM-DD)"
  }),
  startTime: z2.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid start time timestamp"
  }),
  endTime: z2.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid end time timestamp"
  }),
  // Location & notes
  eventAddress: z2.string().optional().nullable(),
  city: z2.string().optional().nullable(),
  notes: z2.string().max(500).optional().nullable(),
  // Payment Preference
  paymentMethod: PaymentMethodEnum.default("UPI_QR_DYNAMIC").optional()
});
var submitPaymentProofSchema = z2.object({
  utrNumber: z2.string().min(6, "UTR Number must be at least 6 alphanumeric digits"),
  paymentScreenshotUrl: z2.string().optional()
});
var updateBookingStatusSchema = z2.object({
  status: BookingStatusEnum,
  notes: z2.string().optional()
});
var queryBookingsSchema = z2.object({
  status: BookingStatusEnum.optional(),
  performerId: z2.string().uuid().optional(),
  search: z2.string().optional(),
  date: z2.string().optional(),
  page: z2.coerce.number().min(1).default(1),
  limit: z2.coerce.number().min(1).max(100).default(10)
});

// src/modeles/booking/booking.controller.ts
var BookingController = class {
  /**
   * POST /api/v1/bookings
   * Initiates booking, checks slot conflict, and returns dynamic UPI QR code.
   */
  async initiateBooking(req, res, next) {
    try {
      const validated = initiateBookingSchema.parse(req.body);
      const result = await bookingService.initiateBooking(validated);
      return SuccessResponse(
        res,
        "Booking initiated successfully. Please scan QR to complete payment within 15 minutes.",
        result,
        201 /* Created */
      );
    } catch (err) {
      next(err);
    }
  }
  /**
   * POST /api/v1/bookings/:id/payment-proof
   * Submits 12-digit bank UTR / payment screenshot proof.
   */
  async submitPaymentProof(req, res, next) {
    try {
      const validated = submitPaymentProofSchema.parse(req.body);
      const proofFile = req.file;
      const result = await bookingService.submitPaymentProof(
        req.params.id,
        validated,
        proofFile
      );
      return SuccessResponse(res, "Payment proof submitted successfully for verification", result);
    } catch (err) {
      next(err);
    }
  }
  /**
   * GET /api/v1/bookings/:id
   * Get single booking with performer, customer, and QR payment details.
   */
  async getBooking(req, res, next) {
    try {
      const result = await bookingService.getBookingDetails(req.params.id);
      return SuccessResponse(res, "Booking details fetched successfully", result);
    } catch (err) {
      next(err);
    }
  }
  /**
   * PATCH /api/v1/bookings/:id/status
   * Confirm, Complete, or Cancel booking.
   */
  async updateStatus(req, res, next) {
    try {
      const validated = updateBookingStatusSchema.parse(req.body);
      const result = await bookingService.updateBookingStatus(req.params.id, validated);
      return SuccessResponse(res, "Booking status updated successfully", result);
    } catch (err) {
      next(err);
    }
  }
  /**
   * GET /api/v1/bookings
   * Query all bookings with status, date, customer, performer filters.
   */
  async listBookings(req, res, next) {
    try {
      const validated = queryBookingsSchema.parse(req.query);
      const result = await bookingService.listBookings(validated);
      return SuccessResponse(res, "Bookings fetched successfully", result);
    } catch (err) {
      next(err);
    }
  }
  /**
   * GET /api/v1/bookings/performers/:performerId/slots
   * Returns free and booked slots for a given performer and date.
   */
  async getPerformerSlots(req, res, next) {
    try {
      const dateStr = typeof req.query.date === "string" ? req.query.date : (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const result = await bookingService.getPerformerSlots(
        req.params.performerId,
        dateStr
      );
      return SuccessResponse(res, "Performer schedule fetched successfully", result);
    } catch (err) {
      next(err);
    }
  }
};
var bookingController = new BookingController();

// src/modeles/booking/booking.routes.ts
var router2 = Router2();
router2.post("/", bookingController.initiateBooking.bind(bookingController));
router2.post(
  "/:id/payment-proof",
  upload.single("screenshot"),
  bookingController.submitPaymentProof.bind(bookingController)
);
router2.get(
  "/performers/:performerId/slots",
  bookingController.getPerformerSlots.bind(bookingController)
);
router2.get("/:id", bookingController.getBooking.bind(bookingController));
router2.patch("/:id/status", bookingController.updateStatus.bind(bookingController));
router2.get("/", bookingController.listBookings.bind(bookingController));
var booking_routes_default = router2;

// src/modeles/qr/qr.routes.ts
import { Router as Router3 } from "express";

// src/modeles/qr/qr.service.ts
init_response_util();
init_types();
var QRService = class {
  /**
   * Get the active & primary QR code for customer booking payments
   */
  async getActiveQRCode() {
    let qr = await prisma.qRCode.findFirst({
      where: { isActive: true, isPrimary: true },
      orderBy: { updatedAt: "desc" }
    });
    if (!qr) {
      qr = await prisma.qRCode.findFirst({
        where: { isActive: true },
        orderBy: { updatedAt: "desc" }
      });
    }
    return qr;
  }
  /**
   * Get all QR codes (Admin view)
   */
  async getAllQRCodes() {
    return prisma.qRCode.findMany({
      orderBy: [
        { isPrimary: "desc" },
        { createdAt: "desc" }
      ]
    });
  }
  /**
   * Get a single QR code by ID
   */
  async getQRCodeById(id) {
    const qr = await prisma.qRCode.findUnique({
      where: { id }
    });
    if (!qr) {
      throw new ErrorResponse("QR Code not found", 404 /* Not_Found */);
    }
    return qr;
  }
  /**
   * Create and upload a new QR code
   */
  async createQRCode(data) {
    if (data.isPrimary) {
      await prisma.qRCode.updateMany({
        where: { isPrimary: true },
        data: { isPrimary: false }
      });
    }
    return prisma.qRCode.create({
      data: {
        title: data.title,
        imageUrl: data.imageUrl,
        upiId: data.upiId,
        accountHolderName: data.accountHolderName,
        bankName: data.bankName,
        isActive: data.isActive ?? true,
        isPrimary: data.isPrimary ?? false,
        description: data.description
      }
    });
  }
  /**
   * Update QR code details
   */
  async updateQRCode(id, data) {
    const existing = await prisma.qRCode.findUnique({
      where: { id }
    });
    if (!existing) {
      throw new ErrorResponse("QR Code not found", 404 /* Not_Found */);
    }
    if (data.isPrimary) {
      await prisma.qRCode.updateMany({
        where: { id: { not: id }, isPrimary: true },
        data: { isPrimary: false }
      });
    }
    return prisma.qRCode.update({
      where: { id },
      data
    });
  }
  /**
   * Set a specific QR code as primary/active
   */
  async setPrimaryQRCode(id) {
    const existing = await prisma.qRCode.findUnique({
      where: { id }
    });
    if (!existing) {
      throw new ErrorResponse("QR Code not found", 404 /* Not_Found */);
    }
    await prisma.qRCode.updateMany({
      where: { isPrimary: true },
      data: { isPrimary: false }
    });
    return prisma.qRCode.update({
      where: { id },
      data: {
        isActive: true,
        isPrimary: true
      }
    });
  }
  /**
   * Delete a QR code
   */
  async deleteQRCode(id) {
    const existing = await prisma.qRCode.findUnique({
      where: { id }
    });
    if (!existing) {
      throw new ErrorResponse("QR Code not found", 404 /* Not_Found */);
    }
    return prisma.qRCode.delete({
      where: { id }
    });
  }
};
var qrService = new QRService();

// src/modeles/qr/qr.controller.ts
init_response_util();
init_types();

// src/modeles/qr/qr.validation.ts
import { z as z3 } from "zod";
var createQRCodeSchema = z3.object({
  title: z3.string().min(2, "Title is required and must be at least 2 characters"),
  imageUrl: z3.string().min(1, "QR image is required (Base64 data or URL)"),
  upiId: z3.string().optional(),
  accountHolderName: z3.string().optional(),
  bankName: z3.string().optional(),
  isActive: z3.boolean().default(true),
  isPrimary: z3.boolean().default(false),
  description: z3.string().optional()
});
var updateQRCodeSchema = z3.object({
  title: z3.string().min(2).optional(),
  imageUrl: z3.string().optional(),
  upiId: z3.string().optional(),
  accountHolderName: z3.string().optional(),
  bankName: z3.string().optional(),
  isActive: z3.boolean().optional(),
  isPrimary: z3.boolean().optional(),
  description: z3.string().optional()
});

// src/modeles/qr/qr.controller.ts
var QRController = class {
  /**
   * GET /api/v1/qr/active
   * Retrieves the current primary / active payment QR code for bookings
   */
  async getActiveQRCode(req, res, next) {
    try {
      const qr = await qrService.getActiveQRCode();
      return SuccessResponse(res, "Active payment QR retrieved successfully", qr);
    } catch (err) {
      next(err);
    }
  }
  /**
   * GET /api/v1/qr/admin/all
   * Retrieves all QR codes for the admin dashboard
   */
  async getAllQRCodes(req, res, next) {
    try {
      const qrs = await qrService.getAllQRCodes();
      return SuccessResponse(res, "All QR codes retrieved successfully", qrs);
    } catch (err) {
      next(err);
    }
  }
  /**
   * GET /api/v1/qr/admin/:id
   * Retrieves a single QR code by ID
   */
  async getQRCodeById(req, res, next) {
    try {
      const qr = await qrService.getQRCodeById(req.params.id);
      return SuccessResponse(res, "QR code retrieved successfully", qr);
    } catch (err) {
      next(err);
    }
  }
  /**
   * POST /api/v1/qr/admin
   * Uploads and creates a new QR code
   */
  async createQRCode(req, res, next) {
    try {
      let imageUrl = req.body.imageUrl;
      if (req.file) {
        const { uploadImages: uploadImages2 } = await Promise.resolve().then(() => (init_upload_util(), upload_util_exports));
        const [uploaded] = await uploadImages2([req.file], "garba/qr_codes");
        if (uploaded?.url) {
          imageUrl = uploaded.url;
        }
      }
      const payload = { ...req.body, imageUrl };
      const validated = createQRCodeSchema.parse(payload);
      const newQR = await qrService.createQRCode(validated);
      return SuccessResponse(res, "QR code created successfully", newQR, 201 /* Created */);
    } catch (err) {
      next(err);
    }
  }
  /**
   * PATCH /api/v1/qr/admin/:id
   * Updates an existing QR code
   */
  async updateQRCode(req, res, next) {
    try {
      let imageUrl = req.body.imageUrl;
      if (req.file) {
        const { uploadImages: uploadImages2 } = await Promise.resolve().then(() => (init_upload_util(), upload_util_exports));
        const [uploaded] = await uploadImages2([req.file], "garba/qr_codes");
        if (uploaded?.url) {
          imageUrl = uploaded.url;
        }
      }
      const payload = { ...req.body, ...imageUrl ? { imageUrl } : {} };
      const validated = updateQRCodeSchema.parse(payload);
      const updated = await qrService.updateQRCode(req.params.id, validated);
      return SuccessResponse(res, "QR code updated successfully", updated);
    } catch (err) {
      next(err);
    }
  }
  /**
   * PATCH /api/v1/qr/admin/:id/primary
   * Sets this QR code as the active/primary payment QR
   */
  async setPrimaryQRCode(req, res, next) {
    try {
      const updated = await qrService.setPrimaryQRCode(req.params.id);
      return SuccessResponse(res, "QR code set as primary successfully", updated);
    } catch (err) {
      next(err);
    }
  }
  /**
   * DELETE /api/v1/qr/admin/:id
   * Deletes a QR code
   */
  async deleteQRCode(req, res, next) {
    try {
      const deleted = await qrService.deleteQRCode(req.params.id);
      return SuccessResponse(res, "QR code deleted successfully", deleted);
    } catch (err) {
      next(err);
    }
  }
};
var qrController = new QRController();

// src/modeles/qr/qr.routes.ts
var router3 = Router3();
router3.get("/active", qrController.getActiveQRCode.bind(qrController));
router3.get("/admin/all", qrController.getAllQRCodes.bind(qrController));
router3.get("/all", qrController.getAllQRCodes.bind(qrController));
router3.get("/", qrController.getAllQRCodes.bind(qrController));
router3.get("/admin/:id", qrController.getQRCodeById.bind(qrController));
router3.get("/:id", qrController.getQRCodeById.bind(qrController));
router3.post("/admin", upload.single("image"), qrController.createQRCode.bind(qrController));
router3.post("/upload", upload.single("image"), qrController.createQRCode.bind(qrController));
router3.post("/", upload.single("image"), qrController.createQRCode.bind(qrController));
router3.patch("/admin/:id", upload.single("image"), qrController.updateQRCode.bind(qrController));
router3.patch("/:id", upload.single("image"), qrController.updateQRCode.bind(qrController));
router3.patch("/admin/:id/primary", qrController.setPrimaryQRCode.bind(qrController));
router3.patch("/:id/primary", qrController.setPrimaryQRCode.bind(qrController));
router3.delete("/admin/:id", qrController.deleteQRCode.bind(qrController));
router3.delete("/:id", qrController.deleteQRCode.bind(qrController));
var qr_routes_default = router3;

// src/modeles/event/event.routes.ts
import { Router as Router4 } from "express";

// src/modeles/event/event.service.ts
init_response_util();
init_types();
var EventService = class {
  /**
   * List events with dynamic counts (attendeesCount, lookingForPartnerCount, avatars, isJoined, isFavorite)
   */
  async getEvents(params, currentUserId) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;
    const where = {};
    if (params.status === "ALL") {
    } else if (params.status) {
      where.status = params.status;
      where.isActive = true;
    } else {
      where.isActive = true;
      where.status = { notIn: ["DRAFT", "CANCELLED"] };
    }
    if (params.isFeatured !== void 0) {
      where.isFeatured = params.isFeatured;
    }
    if (params.city) {
      where.city = { contains: params.city, mode: "insensitive" };
    }
    if (params.state) {
      where.state = { contains: params.state, mode: "insensitive" };
    }
    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: "insensitive" } },
        { venue: { contains: params.search, mode: "insensitive" } },
        { city: { contains: params.search, mode: "insensitive" } },
        { description: { contains: params.search, mode: "insensitive" } }
      ];
    }
    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isFeatured: "desc" }, { eventDate: "asc" }],
        include: {
          attendees: {
            where: { status: "GOING" },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  avatarUrl: true
                }
              }
            }
          },
          favoritedBy: currentUserId ? {
            where: { userId: currentUserId },
            select: { userId: true }
          } : false,
          organizer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              avatarUrl: true
            }
          }
        }
      }),
      prisma.event.count({ where })
    ]);
    const formattedEvents = events.map((event) => {
      const attendeesCount = event.attendees.length;
      const lookingForPartnerCount = event.attendees.filter((a) => a.lookingForPartner).length;
      const attendeeAvatars = event.attendees.map((a) => a.user.avatarUrl).filter((url) => Boolean(url)).slice(0, 4);
      const isJoined = currentUserId ? event.attendees.some((a) => a.userId === currentUserId) : false;
      const isFavorite = currentUserId && event.favoritedBy ? event.favoritedBy.length > 0 : false;
      const dateStr = event.eventDate ? new Date(event.eventDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      }) : "";
      return {
        id: event.id,
        title: event.title,
        slug: event.slug,
        description: event.description,
        imageUrl: event.imageUrl,
        galleryImages: event.galleryImages,
        date: dateStr,
        rawDate: event.eventDate,
        time: event.startTime,
        endTime: event.endTime,
        venue: event.venue,
        address: event.address,
        city: event.city,
        state: event.state,
        pincode: event.pincode,
        pricePerPass: event.pricePerPass ? Number(event.pricePerPass) : 0,
        totalCapacity: event.totalCapacity,
        isFeatured: event.isFeatured,
        status: event.status,
        attendeesCount,
        lookingForPartnerCount,
        attendeeAvatars,
        isJoined,
        isFavorite,
        organizer: event.organizer
      };
    });
    return {
      events: formattedEvents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  /**
   * Get single event details by ID or Slug
   */
  async getEventById(id, currentUserId) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const event = await prisma.event.findFirst({
      where: isUuid ? { id } : { slug: id },
      include: {
        attendees: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
                gender: true,
                skillLevel: true
              }
            }
          }
        },
        favoritedBy: currentUserId ? {
          where: { userId: currentUserId },
          select: { userId: true }
        } : false,
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatarUrl: true
          }
        }
      }
    });
    if (!event) {
      throw new ErrorResponse("Event not found", 404 /* Not_Found */);
    }
    const goingAttendees = event.attendees.filter((a) => a.status === "GOING");
    const attendeesCount = goingAttendees.length;
    const lookingForPartnerCount = goingAttendees.filter((a) => a.lookingForPartner).length;
    const attendeeAvatars = goingAttendees.map((a) => a.user.avatarUrl).filter((url) => Boolean(url)).slice(0, 6);
    const isJoined = currentUserId ? event.attendees.some((a) => a.userId === currentUserId && a.status === "GOING") : false;
    const isFavorite = currentUserId && event.favoritedBy ? event.favoritedBy.length > 0 : false;
    const dateStr = event.eventDate ? new Date(event.eventDate).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    }) : "";
    return {
      id: event.id,
      title: event.title,
      slug: event.slug,
      description: event.description,
      imageUrl: event.imageUrl,
      galleryImages: event.galleryImages,
      date: dateStr,
      rawDate: event.eventDate,
      time: event.startTime,
      endTime: event.endTime,
      venue: event.venue,
      address: event.address,
      city: event.city,
      state: event.state,
      pincode: event.pincode,
      pricePerPass: event.pricePerPass ? Number(event.pricePerPass) : 0,
      totalCapacity: event.totalCapacity,
      isFeatured: event.isFeatured,
      status: event.status,
      dressCode: event.dressCode,
      rules: event.rules,
      attendeesCount,
      lookingForPartnerCount,
      attendeeAvatars,
      isJoined,
      isFavorite,
      organizer: event.organizer,
      attendees: goingAttendees.map((a) => ({
        id: a.id,
        user: a.user,
        lookingForPartner: a.lookingForPartner,
        joinedAt: a.joinedAt
      }))
    };
  }
  /**
   * Create a new event
   */
  async createEvent(input, creatorId) {
    const slug = input.slug || input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const event = await prisma.event.create({
      data: {
        title: input.title,
        slug: `${slug}-${Date.now().toString(36)}`,
        description: input.description,
        imageUrl: input.imageUrl,
        galleryImages: input.galleryImages,
        eventDate: new Date(input.eventDate),
        endDate: input.endDate ? new Date(input.endDate) : void 0,
        startTime: input.startTime,
        endTime: input.endTime,
        venue: input.venue,
        address: input.address,
        city: input.city,
        state: input.state,
        pincode: input.pincode,
        latitude: input.latitude,
        longitude: input.longitude,
        pricePerPass: input.pricePerPass,
        totalCapacity: input.totalCapacity,
        isFeatured: input.isFeatured,
        isActive: input.isActive,
        status: input.status,
        organizerId: input.organizerId || creatorId,
        organizerName: input.organizerName,
        organizerContact: input.organizerContact,
        dressCode: input.dressCode,
        rules: input.rules
      }
    });
    return event;
  }
  /**
   * Update an existing event
   */
  async updateEvent(id, input) {
    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing) {
      throw new ErrorResponse("Event not found", 404 /* Not_Found */);
    }
    const updateData = { ...input };
    if (input.eventDate) {
      updateData.eventDate = new Date(input.eventDate);
    }
    if (input.endDate) {
      updateData.endDate = new Date(input.endDate);
    }
    const updated = await prisma.event.update({
      where: { id },
      data: updateData
    });
    return updated;
  }
  /**
   * Delete / Deactivate event
   */
  async deleteEvent(id) {
    const existing = await prisma.event.findUnique({ where: { id } });
    if (!existing) {
      throw new ErrorResponse("Event not found", 404 /* Not_Found */);
    }
    await prisma.event.delete({ where: { id } });
    return { success: true, message: "Event deleted successfully" };
  }
  /**
   * RSVP to an event (Join / Leave / Toggle Looking for Partner)
   */
  async toggleRsvp(eventId, input) {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      throw new ErrorResponse("Event not found", 404 /* Not_Found */);
    }
    const existingAttendee = await prisma.eventAttendee.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId: input.userId
        }
      }
    });
    if (existingAttendee) {
      if (existingAttendee.status === input.status && !input.lookingForPartner && existingAttendee.status === "GOING") {
        await prisma.eventAttendee.delete({
          where: { id: existingAttendee.id }
        });
        return { isJoined: false, lookingForPartner: false, message: "Left event successfully" };
      }
      const updated = await prisma.eventAttendee.update({
        where: { id: existingAttendee.id },
        data: {
          status: input.status,
          lookingForPartner: input.lookingForPartner,
          passCount: input.passCount || existingAttendee.passCount,
          notes: input.notes
        }
      });
      return {
        isJoined: updated.status === "GOING",
        lookingForPartner: updated.lookingForPartner,
        message: "RSVP updated successfully"
      };
    }
    const created = await prisma.eventAttendee.create({
      data: {
        eventId,
        userId: input.userId,
        status: input.status,
        lookingForPartner: input.lookingForPartner,
        passCount: input.passCount,
        notes: input.notes
      }
    });
    return {
      isJoined: created.status === "GOING",
      lookingForPartner: created.lookingForPartner,
      message: "RSVP confirmed successfully"
    };
  }
  /**
   * Toggle bookmark/favorite on an event
   */
  async toggleFavorite(eventId, userId) {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      throw new ErrorResponse("Event not found", 404 /* Not_Found */);
    }
    const existingFav = await prisma.eventFavorite.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId
        }
      }
    });
    if (existingFav) {
      await prisma.eventFavorite.delete({
        where: { id: existingFav.id }
      });
      return { isFavorite: false, message: "Removed from favorites" };
    }
    await prisma.eventFavorite.create({
      data: {
        eventId,
        userId
      }
    });
    return { isFavorite: true, message: "Added to favorites" };
  }
};
var eventService = new EventService();

// src/modeles/event/event.controller.ts
init_response_util();
init_types();

// src/modeles/event/event.validation.ts
import { z as z4 } from "zod";
var emptyToUndefined = (val) => typeof val === "string" && val.trim() === "" ? void 0 : val;
var coerceNumber = (val) => {
  if (val === "" || val === void 0 || val === null) return void 0;
  const num = Number(val);
  return isNaN(num) ? void 0 : num;
};
var coerceBoolean = (val) => {
  if (typeof val === "string") return val.toLowerCase() === "true";
  if (typeof val === "boolean") return val;
  return void 0;
};
var coerceArray = (val) => {
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return val.split("\n").map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
};
var createEventSchema = z4.object({
  title: z4.string().min(2, "Title must be at least 2 characters"),
  slug: z4.preprocess(emptyToUndefined, z4.string().optional()),
  description: z4.string().min(5, "Description must be at least 5 characters"),
  imageUrl: z4.string().min(1, "Event banner image is required"),
  galleryImages: z4.preprocess(coerceArray, z4.array(z4.string()).default([])),
  eventDate: z4.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid event date format (YYYY-MM-DD or ISO)"
  }),
  endDate: z4.preprocess(
    emptyToUndefined,
    z4.string().optional().refine((val) => !val || !isNaN(Date.parse(val)), {
      message: "Invalid end date format"
    })
  ),
  startTime: z4.string().min(1, "Start time is required (e.g. 07:30 PM)"),
  endTime: z4.preprocess(emptyToUndefined, z4.string().optional()),
  venue: z4.string().min(2, "Venue is required"),
  address: z4.preprocess(emptyToUndefined, z4.string().optional()),
  city: z4.string().min(2, "City is required"),
  state: z4.string().min(2, "State is required"),
  pincode: z4.preprocess(emptyToUndefined, z4.string().optional()),
  latitude: z4.preprocess(coerceNumber, z4.number().optional()),
  longitude: z4.preprocess(coerceNumber, z4.number().optional()),
  pricePerPass: z4.preprocess((val) => val === "" || val === void 0 || val === null ? 0 : Number(val), z4.number().min(0).default(0)),
  totalCapacity: z4.preprocess(coerceNumber, z4.number().int().positive().optional()),
  isFeatured: z4.preprocess((val) => val === void 0 ? false : coerceBoolean(val) ?? false, z4.boolean().default(false)),
  isActive: z4.preprocess((val) => val === void 0 ? true : coerceBoolean(val) ?? true, z4.boolean().default(true)),
  status: z4.enum(["DRAFT", "UPCOMING", "ONGOING", "COMPLETED", "CANCELLED"]).default("UPCOMING"),
  organizerId: z4.preprocess(emptyToUndefined, z4.string().uuid().optional()),
  organizerName: z4.preprocess(emptyToUndefined, z4.string().optional()),
  organizerContact: z4.preprocess(emptyToUndefined, z4.string().optional()),
  dressCode: z4.preprocess(emptyToUndefined, z4.string().optional().default("Traditional Garba Attire")),
  rules: z4.preprocess(coerceArray, z4.array(z4.string()).default([]))
});
var updateEventSchema = createEventSchema.partial();
var queryEventsSchema = z4.object({
  city: z4.string().optional(),
  state: z4.string().optional(),
  isFeatured: z4.string().optional().transform((val) => val === "true" ? true : val === "false" ? false : void 0),
  status: z4.enum(["DRAFT", "UPCOMING", "ONGOING", "COMPLETED", "CANCELLED", "ALL"]).optional(),
  search: z4.string().optional(),
  userId: z4.string().uuid().optional(),
  page: z4.string().optional().transform((val) => val ? Math.max(1, parseInt(val, 10)) : 1),
  limit: z4.string().optional().transform((val) => val ? Math.min(50, Math.max(1, parseInt(val, 10))) : 20)
});
var rsvpEventSchema = z4.object({
  userId: z4.string().uuid("Valid user ID is required"),
  status: z4.enum(["GOING", "INTERESTED", "CANCELLED"]).default("GOING"),
  lookingForPartner: z4.boolean().default(false),
  passCount: z4.number().int().min(1).default(1),
  notes: z4.string().optional()
});
var toggleFavoriteSchema = z4.object({
  userId: z4.string().uuid("Valid user ID is required")
});

// src/modeles/event/event.controller.ts
var EventController = class {
  /**
   * GET /api/v1/events
   * Query & list events with dynamic attendee counts and user status
   */
  async getEvents(req, res, next) {
    try {
      const parsedQuery = queryEventsSchema.parse(req.query);
      const currentUserId = req.query.userId || req.headers["x-user-id"];
      const result = await eventService.getEvents(parsedQuery, currentUserId);
      return SuccessResponse(res, "Events retrieved successfully", result);
    } catch (err) {
      next(err);
    }
  }
  /**
   * GET /api/v1/events/:id
   * Get single event details
   */
  async getEventById(req, res, next) {
    try {
      const currentUserId = req.query.userId || req.headers["x-user-id"];
      const event = await eventService.getEventById(req.params.id, currentUserId);
      return SuccessResponse(res, "Event details retrieved successfully", event);
    } catch (err) {
      next(err);
    }
  }
  /**
   * POST /api/v1/events
   * Create a new event
   */
  async createEvent(req, res, next) {
    try {
      const files = req.files;
      const bannerFile = files?.image?.[0] || files?.file?.[0] || (req.file?.fieldname === "image" || req.file?.fieldname === "file" ? req.file : void 0);
      const galleryFiles = files?.gallery;
      let imageUrl = req.body.imageUrl;
      let galleryImages = Array.isArray(req.body.galleryImages) ? req.body.galleryImages : [];
      if (bannerFile) {
        const { uploadImages: uploadImages2 } = await Promise.resolve().then(() => (init_upload_util(), upload_util_exports));
        const [uploaded] = await uploadImages2([bannerFile], "garba/events");
        if (uploaded?.url) {
          imageUrl = uploaded.url;
        }
      }
      if (galleryFiles && galleryFiles.length > 0) {
        const { uploadImages: uploadImages2 } = await Promise.resolve().then(() => (init_upload_util(), upload_util_exports));
        const uploadedList = await uploadImages2(galleryFiles, "garba/events/gallery");
        const urls = uploadedList.map((u) => u.url);
        galleryImages = [...galleryImages, ...urls];
      }
      const payload = {
        ...req.body,
        ...imageUrl ? { imageUrl } : {},
        ...galleryImages.length > 0 ? { galleryImages } : {}
      };
      const parsedData = createEventSchema.parse(payload);
      const creatorId = req.headers["x-user-id"] || parsedData.organizerId;
      const event = await eventService.createEvent(parsedData, creatorId);
      return SuccessResponse(res, "Event created successfully", event, 201 /* Created */);
    } catch (err) {
      next(err);
    }
  }
  /**
   * PATCH/PUT /api/v1/events/:id
   * Update an existing event
   */
  async updateEvent(req, res, next) {
    try {
      const files = req.files;
      const bannerFile = files?.image?.[0] || files?.file?.[0] || (req.file?.fieldname === "image" || req.file?.fieldname === "file" ? req.file : void 0);
      const galleryFiles = files?.gallery;
      let imageUrl = req.body.imageUrl;
      let galleryImages = req.body.galleryImages ? Array.isArray(req.body.galleryImages) ? req.body.galleryImages : [req.body.galleryImages] : void 0;
      if (bannerFile) {
        const { uploadImages: uploadImages2 } = await Promise.resolve().then(() => (init_upload_util(), upload_util_exports));
        const [uploaded] = await uploadImages2([bannerFile], "garba/events");
        if (uploaded?.url) {
          imageUrl = uploaded.url;
        }
      }
      if (galleryFiles && galleryFiles.length > 0) {
        const { uploadImages: uploadImages2 } = await Promise.resolve().then(() => (init_upload_util(), upload_util_exports));
        const uploadedList = await uploadImages2(galleryFiles, "garba/events/gallery");
        const urls = uploadedList.map((u) => u.url);
        galleryImages = [...galleryImages || [], ...urls];
      }
      const payload = {
        ...req.body,
        ...imageUrl ? { imageUrl } : {},
        ...galleryImages !== void 0 ? { galleryImages } : {}
      };
      const parsedData = updateEventSchema.parse(payload);
      const updated = await eventService.updateEvent(req.params.id, parsedData);
      return SuccessResponse(res, "Event updated successfully", updated);
    } catch (err) {
      next(err);
    }
  }
  /**
   * DELETE /api/v1/events/:id
   * Delete an event
   */
  async deleteEvent(req, res, next) {
    try {
      const result = await eventService.deleteEvent(req.params.id);
      return SuccessResponse(res, result.message, null);
    } catch (err) {
      next(err);
    }
  }
  /**
   * POST /api/v1/events/:id/rsvp
   * Join/Leave event and toggle Looking for Partner
   */
  async toggleRsvp(req, res, next) {
    try {
      const parsedData = rsvpEventSchema.parse(req.body);
      const result = await eventService.toggleRsvp(req.params.id, parsedData);
      return SuccessResponse(res, result.message, result);
    } catch (err) {
      next(err);
    }
  }
  /**
   * POST /api/v1/events/:id/favorite
   * Toggle event favorite/bookmark status
   */
  async toggleFavorite(req, res, next) {
    try {
      const parsedData = toggleFavoriteSchema.parse(req.body);
      const result = await eventService.toggleFavorite(req.params.id, parsedData.userId);
      return SuccessResponse(res, result.message, result);
    } catch (err) {
      next(err);
    }
  }
};
var eventController = new EventController();

// src/modeles/event/event.routes.ts
var router4 = Router4();
router4.get("/", eventController.getEvents.bind(eventController));
router4.get("/:id", eventController.getEventById.bind(eventController));
var eventUploadMiddleware = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "file", maxCount: 1 },
  { name: "gallery", maxCount: 10 }
]);
router4.post("/", eventUploadMiddleware, eventController.createEvent.bind(eventController));
router4.put("/:id", eventUploadMiddleware, eventController.updateEvent.bind(eventController));
router4.patch("/:id", eventUploadMiddleware, eventController.updateEvent.bind(eventController));
router4.delete("/:id", eventController.deleteEvent.bind(eventController));
router4.post("/:id/rsvp", eventController.toggleRsvp.bind(eventController));
router4.post("/:id/favorite", eventController.toggleFavorite.bind(eventController));
var event_routes_default = router4;

// src/modeles/auth/auth.routes.ts
import { Router as Router5 } from "express";

// src/modeles/auth/auth.service.ts
init_env();
init_types();
init_response_util();
import jwt from "jsonwebtoken";
var AuthService = class {
  /**
   * Verify the 6-digit admin password/PIN
   */
  async verifyAdminPin(pin) {
    if (!pin || typeof pin !== "string") {
      throw new ErrorResponse("Please enter a valid 6-digit PIN", 400 /* Bad_Request */);
    }
    const trimmedPin = pin.trim();
    if (trimmedPin.length !== 6) {
      throw new ErrorResponse("PIN must be exactly 6 digits", 400 /* Bad_Request */);
    }
    const correctPin = (process.env.ADMIN_PIN || ENV.ADMIN_PIN || "123456").trim();
    if (trimmedPin !== correctPin) {
      throw new ErrorResponse("Invalid admin password. Access denied.", 401 /* Unauthorized */);
    }
    const secret = ENV.JWT_SECRET || "garba-admin-secret-key-2026";
    const token = jwt.sign({ role: "ADMIN", access: "FULL" }, secret, { expiresIn: "7d" });
    return {
      authenticated: true,
      token,
      message: "Admin access granted successfully"
    };
  }
};
var authService = new AuthService();

// src/modeles/auth/auth.controller.ts
init_response_util();
init_types();
var AuthController = class {
  /**
   * POST /api/v1/auth/admin/verify-pin
   * Verify the 6-digit admin security PIN
   */
  async verifyAdminPin(req, res, next) {
    try {
      const { pin } = req.body;
      const result = await authService.verifyAdminPin(pin);
      return SuccessResponse(res, result.message, result, 200 /* OK */);
    } catch (err) {
      next(err);
    }
  }
};
var authController = new AuthController();

// src/modeles/auth/auth.routes.ts
var router5 = Router5();
router5.post("/admin/verify-pin", authController.verifyAdminPin);
var auth_routes_default = router5;

// src/app.ts
var app = express();
var allowedOrigins = ENV.FRONTEND_ORIGIN?.split(",").map((value) => value.trim()).filter(Boolean);
app.disable("x-powered-by");
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});
app.use(cors({
  origin: allowedOrigins?.length ? allowedOrigins.includes("*") ? true : allowedOrigins : true,
  credentials: true
}));
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));
app.get("/", (_req, res) => res.status(200).json({ message: "Welcome to GarbaMitra API", success: true, mode: ENV.MODE }));
app.use("/api/v1/auth", auth_routes_default);
app.use("/api/v1/users", user_routes_default);
app.use("/api/v1/bookings", booking_routes_default);
app.use("/api/v1/qr", qr_routes_default);
app.use("/api/v1/events", event_routes_default);
app.use((_req, _res, next) => next(new ErrorResponse("Route not found", 404 /* Not_Found */)));
app.use(errorMiddleware);
var app_default = app;

// src/index.ts
init_env();
var PORT = Number(process.env.PORT || ENV.PORT || 4e3);
if (!ENV.DATABASE_URL) {
  console.warn("\u26A0\uFE0F Warning: DATABASE_URL is not set. Database connections will fail.");
}
if (!ENV.JWT_SECRET || ENV.JWT_SECRET.length < 32) {
  console.warn("\u26A0\uFE0F Warning: JWT_SECRET is missing or less than 32 characters.");
}
var httpServer = http.createServer(app_default);
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`\u{1F680} Server running on port ${PORT} in ${ENV.MODE || "development"} mode`);
});
