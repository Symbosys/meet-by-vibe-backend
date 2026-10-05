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
      OLA_MAPS_API_KEY: process.env.OLA_MAPS_API_KEY
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

// src/utils/password.util.ts
var password_util_exports = {};
__export(password_util_exports, {
  comparePassword: () => comparePassword,
  hashPassword: () => hashPassword
});
import bcrypt from "bcryptjs";
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}
async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}
var init_password_util = __esm({
  "src/utils/password.util.ts"() {
    "use strict";
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
  const valid = file.mimetype === "image/jpeg" && isJpeg(file.buffer) || file.mimetype === "image/png" && isPng(file.buffer) || file.mimetype === "image/webp" && isWebp(file.buffer);
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
  "inlineSchema": 'generator client {\n  provider = "prisma-client"\n  output   = "../generated/prisma"\n}\n\ndatasource db {\n  provider = "postgresql"\n}\n\n// ----------------------------------------------------\n// ENUMS\n// ----------------------------------------------------\n\nenum Role {\n  CUSTOMER\n  PERFORMER\n  ORGANIZER\n  ADMIN\n}\n\nenum Gender {\n  MALE\n  FEMALE\n  OTHER\n}\n\nenum SkillLevel {\n  BEGINNER\n  INTERMEDIATE\n  ADVANCED\n  PRO\n  CHOREOGRAPHER\n}\n\nenum BookingStatus {\n  PENDING\n  PAYMENT_VERIFIED\n  CONFIRMED\n  IN_PROGRESS\n  COMPLETED\n  CANCELLED\n  EXPIRED\n  REJECTED\n}\n\nenum PaymentStatus {\n  PENDING\n  SUBMITTED\n  SUCCESS\n  FAILED\n  EXPIRED\n  REFUNDED\n}\n\nenum PaymentMethod {\n  UPI_QR_DYNAMIC\n  UPI_QR_STATIC\n  GATEWAY_RAZORPAY\n}\n\n// ----------------------------------------------------\n// MODELS\n// ----------------------------------------------------\n\nmodel User {\n  id String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid\n\n  // Basic & Auth Details\n  name         String\n  email        String  @unique\n  phone        String  @unique\n  passwordHash String\n  avatarUrl    String?\n  gender       Gender  @default(OTHER)\n  role         Role    @default(CUSTOMER)\n\n  // Physical & Personal Details\n  height      Decimal?  @db.Decimal(5, 2)\n  dateOfBirth DateTime? @db.Date\n  languages   String[]  @default(["Gujarati", "Hindi"])\n\n  // Location Details\n  address   String?\n  city      String?\n  state     String?\n  pincode   String?\n  latitude  Decimal? @db.Decimal(10, 7)\n  longitude Decimal? @db.Decimal(10, 7)\n\n  // Dance & Performer Profile\n  bio             String?    @db.Text\n  skillLevel      SkillLevel @default(INTERMEDIATE)\n  danceStyles     String[]   @default(["Traditional Garba", "Dodhiya", "Dandiya Raas"])\n  experienceYears Int?       @default(0)\n  instagramHandle String?\n\n  // Booking & Financial Details\n  hourlyRate  Decimal? @db.Decimal(10, 2)\n  upiId       String?\n  isAvailable Boolean  @default(true)\n\n  // Ratings & Stats\n  rating            Decimal @default(0.0) @db.Decimal(3, 2)\n  reviewCount       Int     @default(0)\n  totalBookingsDone Int     @default(0)\n\n  // Account State\n  isActive   Boolean @default(true)\n  isVerified Boolean @default(false)\n\n  // Relationships\n  photos           UserPhoto[]\n  bookingsMade     Booking[]   @relation("CustomerBookings")\n  bookingsReceived Booking[]   @relation("PerformerBookings")\n\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n\n  @@index([role, isAvailable, city])\n  @@index([skillLevel, city])\n  @@map("users")\n}\n\nmodel UserPhoto {\n  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid\n  userId    String   @db.Uuid\n  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)\n  imageUrl  String\n  publicId  String?\n  caption   String?\n  order     Int      @default(0)\n  createdAt DateTime @default(now())\n\n  @@index([userId])\n  @@map("user_photos")\n}\n\nmodel Booking {\n  id          String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid\n  bookingCode String @unique\n\n  // Booker / Client Contact & Personal Details\n  name    String\n  email   String\n  phone   String\n  address String\n  gender  Gender @default(OTHER)\n\n  // The customer who is booking (Foreign Key to User)\n  customerId String @db.Uuid\n  customer   User   @relation("CustomerBookings", fields: [customerId], references: [id], onDelete: Restrict)\n\n  // The performer/dancer being booked\n  performerId String @db.Uuid\n  performer   User   @relation("PerformerBookings", fields: [performerId], references: [id], onDelete: Restrict)\n\n  // Slot Timings\n  bookingDate   DateTime @db.Date\n  startTime     DateTime\n  endTime       DateTime\n  durationHours Decimal  @db.Decimal(4, 2)\n\n  // Event Location & Notes\n  eventAddress String?\n  city         String?\n  notes        String? @db.Text\n\n  // Financials\n  hourlyRate    Decimal @db.Decimal(10, 2)\n  totalAmount   Decimal @db.Decimal(10, 2)\n  advanceAmount Decimal @default(0) @db.Decimal(10, 2)\n\n  status    BookingStatus @default(PENDING)\n  expiresAt DateTime?\n\n  payments Payment[]\n\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n\n  @@index([performerId, bookingDate, status])\n  @@index([customerId, status])\n  @@index([phone])\n  @@index([email])\n  @@map("bookings")\n}\n\nmodel Payment {\n  id        String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid\n  bookingId String  @db.Uuid\n  booking   Booking @relation(fields: [bookingId], references: [id], onDelete: Cascade)\n\n  amount        Decimal       @db.Decimal(10, 2)\n  currency      String        @default("INR")\n  paymentMethod PaymentMethod @default(UPI_QR_DYNAMIC)\n  paymentStatus PaymentStatus @default(PENDING)\n\n  // QR Code & Payment Data\n  qrCodeUrl            String?\n  upiPayload           String?\n  transactionRef       String  @unique\n  utrNumber            String?\n  paymentScreenshotUrl String?\n\n  // Gateway specific\n  gatewayOrderId   String?\n  gatewayPaymentId String?\n  metadata         Json?\n\n  paidAt    DateTime?\n  expiresAt DateTime?\n  createdAt DateTime  @default(now())\n  updatedAt DateTime  @updatedAt\n\n  @@index([bookingId])\n  @@index([transactionRef])\n  @@map("payments")\n}\n\nmodel QRCode {\n  id                String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid\n  title             String\n  imageUrl          String  @db.Text\n  upiId             String?\n  accountHolderName String?\n  bankName          String?\n  isActive          Boolean @default(true)\n  isPrimary         Boolean @default(false)\n  description       String? @db.Text\n\n  createdAt DateTime @default(now())\n  updatedAt DateTime @updatedAt\n\n  @@index([isActive, isPrimary])\n  @@map("qr_codes")\n}\n',
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
config.runtimeDataModel = JSON.parse('{"models":{"User":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"name","kind":"scalar","type":"String"},{"name":"email","kind":"scalar","type":"String"},{"name":"phone","kind":"scalar","type":"String"},{"name":"passwordHash","kind":"scalar","type":"String"},{"name":"avatarUrl","kind":"scalar","type":"String"},{"name":"gender","kind":"enum","type":"Gender"},{"name":"role","kind":"enum","type":"Role"},{"name":"height","kind":"scalar","type":"Decimal"},{"name":"dateOfBirth","kind":"scalar","type":"DateTime"},{"name":"languages","kind":"scalar","type":"String"},{"name":"address","kind":"scalar","type":"String"},{"name":"city","kind":"scalar","type":"String"},{"name":"state","kind":"scalar","type":"String"},{"name":"pincode","kind":"scalar","type":"String"},{"name":"latitude","kind":"scalar","type":"Decimal"},{"name":"longitude","kind":"scalar","type":"Decimal"},{"name":"bio","kind":"scalar","type":"String"},{"name":"skillLevel","kind":"enum","type":"SkillLevel"},{"name":"danceStyles","kind":"scalar","type":"String"},{"name":"experienceYears","kind":"scalar","type":"Int"},{"name":"instagramHandle","kind":"scalar","type":"String"},{"name":"hourlyRate","kind":"scalar","type":"Decimal"},{"name":"upiId","kind":"scalar","type":"String"},{"name":"isAvailable","kind":"scalar","type":"Boolean"},{"name":"rating","kind":"scalar","type":"Decimal"},{"name":"reviewCount","kind":"scalar","type":"Int"},{"name":"totalBookingsDone","kind":"scalar","type":"Int"},{"name":"isActive","kind":"scalar","type":"Boolean"},{"name":"isVerified","kind":"scalar","type":"Boolean"},{"name":"photos","kind":"object","type":"UserPhoto","relationName":"UserToUserPhoto"},{"name":"bookingsMade","kind":"object","type":"Booking","relationName":"CustomerBookings"},{"name":"bookingsReceived","kind":"object","type":"Booking","relationName":"PerformerBookings"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":"users","schema":null},"UserPhoto":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"userId","kind":"scalar","type":"String"},{"name":"user","kind":"object","type":"User","relationName":"UserToUserPhoto"},{"name":"imageUrl","kind":"scalar","type":"String"},{"name":"publicId","kind":"scalar","type":"String"},{"name":"caption","kind":"scalar","type":"String"},{"name":"order","kind":"scalar","type":"Int"},{"name":"createdAt","kind":"scalar","type":"DateTime"}],"dbName":"user_photos","schema":null},"Booking":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"bookingCode","kind":"scalar","type":"String"},{"name":"name","kind":"scalar","type":"String"},{"name":"email","kind":"scalar","type":"String"},{"name":"phone","kind":"scalar","type":"String"},{"name":"address","kind":"scalar","type":"String"},{"name":"gender","kind":"enum","type":"Gender"},{"name":"customerId","kind":"scalar","type":"String"},{"name":"customer","kind":"object","type":"User","relationName":"CustomerBookings"},{"name":"performerId","kind":"scalar","type":"String"},{"name":"performer","kind":"object","type":"User","relationName":"PerformerBookings"},{"name":"bookingDate","kind":"scalar","type":"DateTime"},{"name":"startTime","kind":"scalar","type":"DateTime"},{"name":"endTime","kind":"scalar","type":"DateTime"},{"name":"durationHours","kind":"scalar","type":"Decimal"},{"name":"eventAddress","kind":"scalar","type":"String"},{"name":"city","kind":"scalar","type":"String"},{"name":"notes","kind":"scalar","type":"String"},{"name":"hourlyRate","kind":"scalar","type":"Decimal"},{"name":"totalAmount","kind":"scalar","type":"Decimal"},{"name":"advanceAmount","kind":"scalar","type":"Decimal"},{"name":"status","kind":"enum","type":"BookingStatus"},{"name":"expiresAt","kind":"scalar","type":"DateTime"},{"name":"payments","kind":"object","type":"Payment","relationName":"BookingToPayment"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":"bookings","schema":null},"Payment":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"bookingId","kind":"scalar","type":"String"},{"name":"booking","kind":"object","type":"Booking","relationName":"BookingToPayment"},{"name":"amount","kind":"scalar","type":"Decimal"},{"name":"currency","kind":"scalar","type":"String"},{"name":"paymentMethod","kind":"enum","type":"PaymentMethod"},{"name":"paymentStatus","kind":"enum","type":"PaymentStatus"},{"name":"qrCodeUrl","kind":"scalar","type":"String"},{"name":"upiPayload","kind":"scalar","type":"String"},{"name":"transactionRef","kind":"scalar","type":"String"},{"name":"utrNumber","kind":"scalar","type":"String"},{"name":"paymentScreenshotUrl","kind":"scalar","type":"String"},{"name":"gatewayOrderId","kind":"scalar","type":"String"},{"name":"gatewayPaymentId","kind":"scalar","type":"String"},{"name":"metadata","kind":"scalar","type":"Json"},{"name":"paidAt","kind":"scalar","type":"DateTime"},{"name":"expiresAt","kind":"scalar","type":"DateTime"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":"payments","schema":null},"QRCode":{"fields":[{"name":"id","kind":"scalar","type":"String"},{"name":"title","kind":"scalar","type":"String"},{"name":"imageUrl","kind":"scalar","type":"String"},{"name":"upiId","kind":"scalar","type":"String"},{"name":"accountHolderName","kind":"scalar","type":"String"},{"name":"bankName","kind":"scalar","type":"String"},{"name":"isActive","kind":"scalar","type":"Boolean"},{"name":"isPrimary","kind":"scalar","type":"Boolean"},{"name":"description","kind":"scalar","type":"String"},{"name":"createdAt","kind":"scalar","type":"DateTime"},{"name":"updatedAt","kind":"scalar","type":"DateTime"}],"dbName":"qr_codes","schema":null}},"enums":{},"types":{}}');
config.parameterizationSchema = {
  strings: JSON.parse('["where","orderBy","cursor","user","photos","customer","performer","booking","payments","_count","bookingsMade","bookingsReceived","User.findUnique","User.findUniqueOrThrow","User.findFirst","User.findFirstOrThrow","User.findMany","data","User.createOne","User.createMany","User.createManyAndReturn","User.updateOne","User.updateMany","User.updateManyAndReturn","create","update","User.upsertOne","User.deleteOne","User.deleteMany","having","_avg","_sum","_min","_max","User.groupBy","User.aggregate","UserPhoto.findUnique","UserPhoto.findUniqueOrThrow","UserPhoto.findFirst","UserPhoto.findFirstOrThrow","UserPhoto.findMany","UserPhoto.createOne","UserPhoto.createMany","UserPhoto.createManyAndReturn","UserPhoto.updateOne","UserPhoto.updateMany","UserPhoto.updateManyAndReturn","UserPhoto.upsertOne","UserPhoto.deleteOne","UserPhoto.deleteMany","UserPhoto.groupBy","UserPhoto.aggregate","Booking.findUnique","Booking.findUniqueOrThrow","Booking.findFirst","Booking.findFirstOrThrow","Booking.findMany","Booking.createOne","Booking.createMany","Booking.createManyAndReturn","Booking.updateOne","Booking.updateMany","Booking.updateManyAndReturn","Booking.upsertOne","Booking.deleteOne","Booking.deleteMany","Booking.groupBy","Booking.aggregate","Payment.findUnique","Payment.findUniqueOrThrow","Payment.findFirst","Payment.findFirstOrThrow","Payment.findMany","Payment.createOne","Payment.createMany","Payment.createManyAndReturn","Payment.updateOne","Payment.updateMany","Payment.updateManyAndReturn","Payment.upsertOne","Payment.deleteOne","Payment.deleteMany","Payment.groupBy","Payment.aggregate","QRCode.findUnique","QRCode.findUniqueOrThrow","QRCode.findFirst","QRCode.findFirstOrThrow","QRCode.findMany","QRCode.createOne","QRCode.createMany","QRCode.createManyAndReturn","QRCode.updateOne","QRCode.updateMany","QRCode.updateManyAndReturn","QRCode.upsertOne","QRCode.deleteOne","QRCode.deleteMany","QRCode.groupBy","QRCode.aggregate","AND","OR","NOT","id","title","imageUrl","upiId","accountHolderName","bankName","isActive","isPrimary","description","createdAt","updatedAt","equals","in","notIn","lt","lte","gt","gte","not","contains","startsWith","endsWith","bookingId","amount","currency","PaymentMethod","paymentMethod","PaymentStatus","paymentStatus","qrCodeUrl","upiPayload","transactionRef","utrNumber","paymentScreenshotUrl","gatewayOrderId","gatewayPaymentId","metadata","paidAt","expiresAt","string_contains","string_starts_with","string_ends_with","array_starts_with","array_ends_with","array_contains","bookingCode","name","email","phone","address","Gender","gender","customerId","performerId","bookingDate","startTime","endTime","durationHours","eventAddress","city","notes","hourlyRate","totalAmount","advanceAmount","BookingStatus","status","userId","publicId","caption","order","passwordHash","avatarUrl","Role","role","height","dateOfBirth","languages","state","pincode","latitude","longitude","bio","SkillLevel","skillLevel","danceStyles","experienceYears","instagramHandle","isAvailable","rating","reviewCount","totalBookingsDone","isVerified","has","hasEvery","hasSome","every","some","none","is","isNot","connectOrCreate","upsert","createMany","set","disconnect","delete","connect","updateMany","deleteMany","increment","decrement","multiply","divide","push"]'),
  graph: "3wIzUCYEAADPAQAgCgAA0AEAIAsAANABACBkAADGAQAwZQAAFQAQZgAAxgEAMGcBAAAAAWoBAJoBACFtIACbAQAhcEAAnAEAIXFAAJwBACGVAQEAmQEAIZYBAQAAAAGXAQEAAAABmAEBAJoBACGaAQAAxwGaASKiAQEAmgEAIaQBEADJAQAhrQEBAJkBACGuAQEAmgEAIbABAADIAbABIrEBEADJAQAhsgFAAMoBACGzAQAAuwEAILQBAQCaAQAhtQEBAJoBACG2ARAAyQEAIbcBEADJAQAhuAEBAJoBACG6AQAAywG6ASK7AQAAuwEAILwBAgDMAQAhvQEBAJoBACG-ASAAmwEAIb8BEADNAQAhwAECAM4BACHBAQIAzgEAIcIBIACbAQAhAQAAAAEAIAsDAADYAQAgZAAA2gEAMGUAAAMAEGYAANoBADBnAQCYAQAhaQEAmQEAIXBAAJwBACGpAQEAmAEAIaoBAQCaAQAhqwEBAJoBACGsAQIAzgEAIQMDAADGAgAgqgEAANsBACCrAQAA2wEAIAsDAADYAQAgZAAA2gEAMGUAAAMAEGYAANoBADBnAQAAAAFpAQCZAQAhcEAAnAEAIakBAQCYAQAhqgEBAJoBACGrAQEAmgEAIawBAgDOAQAhAwAAAAMAIAEAAAQAMAIAAAUAIB0FAADYAQAgBgAA2AEAIAgAANkBACBkAADWAQAwZQAABwAQZgAA1gEAMGcBAJgBACFwQACcAQAhcUAAnAEAIY0BQADKAQAhlAEBAJkBACGVAQEAmQEAIZYBAQCZAQAhlwEBAJkBACGYAQEAmQEAIZoBAADHAZoBIpsBAQCYAQAhnAEBAJgBACGdAUAAnAEAIZ4BQACcAQAhnwFAAJwBACGgARAAzQEAIaEBAQCaAQAhogEBAJoBACGjAQEAmgEAIaQBEADNAQAhpQEQAM0BACGmARAAzQEAIagBAADXAagBIgcFAADGAgAgBgAAxgIAIAgAAMcCACCNAQAA2wEAIKEBAADbAQAgogEAANsBACCjAQAA2wEAIB0FAADYAQAgBgAA2AEAIAgAANkBACBkAADWAQAwZQAABwAQZgAA1gEAMGcBAAAAAXBAAJwBACFxQACcAQAhjQFAAMoBACGUAQEAAAABlQEBAJkBACGWAQEAmQEAIZcBAQCZAQAhmAEBAJkBACGaAQAAxwGaASKbAQEAmAEAIZwBAQCYAQAhnQFAAJwBACGeAUAAnAEAIZ8BQACcAQAhoAEQAM0BACGhAQEAmgEAIaIBAQCaAQAhowEBAJoBACGkARAAzQEAIaUBEADNAQAhpgEQAM0BACGoAQAA1wGoASIDAAAABwAgAQAACAAwAgAACQAgFgcAANUBACBkAADRAQAwZQAACwAQZgAA0QEAMGcBAJgBACFwQACcAQAhcUAAnAEAIX0BAJgBACF-EADNAQAhfwEAmQEAIYEBAADSAYEBIoMBAADTAYMBIoQBAQCaAQAhhQEBAJoBACGGAQEAmQEAIYcBAQCaAQAhiAEBAJoBACGJAQEAmgEAIYoBAQCaAQAhiwEAANQBACCMAUAAygEAIY0BQADKAQAhCgcAAMUCACCEAQAA2wEAIIUBAADbAQAghwEAANsBACCIAQAA2wEAIIkBAADbAQAgigEAANsBACCLAQAA2wEAIIwBAADbAQAgjQEAANsBACAWBwAA1QEAIGQAANEBADBlAAALABBmAADRAQAwZwEAAAABcEAAnAEAIXFAAJwBACF9AQCYAQAhfhAAzQEAIX8BAJkBACGBAQAA0gGBASKDAQAA0wGDASKEAQEAmgEAIYUBAQCaAQAhhgEBAAAAAYcBAQCaAQAhiAEBAJoBACGJAQEAmgEAIYoBAQCaAQAhiwEAANQBACCMAUAAygEAIY0BQADKAQAhAwAAAAsAIAEAAAwAMAIAAA0AIAEAAAALACADAAAABwAgAQAACAAwAgAACQAgAQAAAAMAIAEAAAAHACABAAAABwAgAQAAAAEAICYEAADPAQAgCgAA0AEAIAsAANABACBkAADGAQAwZQAAFQAQZgAAxgEAMGcBAJgBACFqAQCaAQAhbSAAmwEAIXBAAJwBACFxQACcAQAhlQEBAJkBACGWAQEAmQEAIZcBAQCZAQAhmAEBAJoBACGaAQAAxwGaASKiAQEAmgEAIaQBEADJAQAhrQEBAJkBACGuAQEAmgEAIbABAADIAbABIrEBEADJAQAhsgFAAMoBACGzAQAAuwEAILQBAQCaAQAhtQEBAJoBACG2ARAAyQEAIbcBEADJAQAhuAEBAJoBACG6AQAAywG6ASK7AQAAuwEAILwBAgDMAQAhvQEBAJoBACG-ASAAmwEAIb8BEADNAQAhwAECAM4BACHBAQIAzgEAIcIBIACbAQAhEQQAAMMCACAKAADEAgAgCwAAxAIAIGoAANsBACCYAQAA2wEAIKIBAADbAQAgpAEAANsBACCuAQAA2wEAILEBAADbAQAgsgEAANsBACC0AQAA2wEAILUBAADbAQAgtgEAANsBACC3AQAA2wEAILgBAADbAQAgvAEAANsBACC9AQAA2wEAIAMAAAAVACABAAAWADACAAABACADAAAAFQAgAQAAFgAwAgAAAQAgAwAAABUAIAEAABYAMAIAAAEAICMEAADAAgAgCgAAwQIAIAsAAMICACBnAQAAAAFqAQAAAAFtIAAAAAFwQAAAAAFxQAAAAAGVAQEAAAABlgEBAAAAAZcBAQAAAAGYAQEAAAABmgEAAACaAQKiAQEAAAABpAEQAAAAAa0BAQAAAAGuAQEAAAABsAEAAACwAQKxARAAAAABsgFAAAAAAbMBAAC-AgAgtAEBAAAAAbUBAQAAAAG2ARAAAAABtwEQAAAAAbgBAQAAAAG6AQAAALoBArsBAAC_AgAgvAECAAAAAb0BAQAAAAG-ASAAAAABvwEQAAAAAcABAgAAAAHBAQIAAAABwgEgAAAAAQERAAAaACAgZwEAAAABagEAAAABbSAAAAABcEAAAAABcUAAAAABlQEBAAAAAZYBAQAAAAGXAQEAAAABmAEBAAAAAZoBAAAAmgECogEBAAAAAaQBEAAAAAGtAQEAAAABrgEBAAAAAbABAAAAsAECsQEQAAAAAbIBQAAAAAGzAQAAvgIAILQBAQAAAAG1AQEAAAABtgEQAAAAAbcBEAAAAAG4AQEAAAABugEAAAC6AQK7AQAAvwIAILwBAgAAAAG9AQEAAAABvgEgAAAAAb8BEAAAAAHAAQIAAAABwQECAAAAAcIBIAAAAAEBEQAAHAAwAREAABwAMCMEAACaAgAgCgAAmwIAIAsAAJwCACBnAQDfAQAhagEA4AEAIW0gAOEBACFwQADiAQAhcUAA4gEAIZUBAQDfAQAhlgEBAN8BACGXAQEA3wEAIZgBAQDgAQAhmgEAAPMBmgEiogEBAOABACGkARAAlQIAIa0BAQDfAQAhrgEBAOABACGwAQAAlAKwASKxARAAlQIAIbIBQADrAQAhswEAAJYCACC0AQEA4AEAIbUBAQDgAQAhtgEQAJUCACG3ARAAlQIAIbgBAQDgAQAhugEAAJcCugEiuwEAAJgCACC8AQIAmQIAIb0BAQDgAQAhvgEgAOEBACG_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-EAAAAAF_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_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-AEAMBkAAP0BADDLAQAA-QEAMMwBAAD6AQAwzQEAAPsBACDOAQAA_AEAMM8BAAD8AQAw0AEAAPwBADDRAQAA_AEAMNIBAAD-AQAw0wEAAP8BADARZwEAAAABcEAAAAABcUAAAAABfhAAAAABfwEAAAABgQEAAACBAQKDAQAAAIMBAoQBAQAAAAGFAQEAAAABhgEBAAAAAYcBAQAAAAGIAQEAAAABiQEBAAAAAYoBAQAAAAGLAYAAAAABjAFAAAAAAY0BQAAAAAECAAAADQAgGAAAgwIAIAMAAAANACAYAACDAgAgGQAAggIAIAERAADUAgAwFgcAANUBACBkAADRAQAwZQAACwAQZgAA0QEAMGcBAAAAAXBAAJwBACFxQACcAQAhfQEAmAEAIX4QAM0BACF_AQCZAQAhgQEAANIBgQEigwEAANMBgwEihAEBAJoBACGFAQEAmgEAIYYBAQAAAAGHAQEAmgEAIYgBAQCaAQAhiQEBAJoBACGKAQEAmgEAIYsBAADUAQAgjAFAAMoBACGNAUAAygEAIQIAAAANACARAACCAgAgAgAAAIACACARAACBAgAgFWQAAP8BADBlAACAAgAQZgAA_wEAMGcBAJgBACFwQACcAQAhcUAAnAEAIX0BAJgBACF-EADNAQAhfwEAmQEAIYEBAADSAYEBIoMBAADTAYMBIoQBAQCaAQAhhQEBAJoBACGGAQEAmQEAIYcBAQCaAQAhiAEBAJoBACGJAQEAmgEAIYoBAQCaAQAhiwEAANQBACCMAUAAygEAIY0BQADKAQAhFWQAAP8BADBlAACAAgAQZgAA_wEAMGcBAJgBACFwQACcAQAhcUAAnAEAIX0BAJgBACF-EADNAQAhfwEAmQEAIYEBAADSAYEBIoMBAADTAYMBIoQBAQCaAQAhhQEBAJoBACGGAQEAmQEAIYcBAQCaAQAhiAEBAJoBACGJAQEAmgEAIYoBAQCaAQAhiwEAANQBACCMAUAAygEAIY0BQADKAQAhEWcBAN8BACFwQADiAQAhcUAA4gEAIX4QAOgBACF_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_ARAA6AEAIcABAgCMAgAhwQECAIwCACHCASAA4QEAISIKAACbAgAgCwAAnAIAIGcBAN8BACFqAQDgAQAhbSAA4QEAIXBAAOIBACFxQADiAQAhlQEBAN8BACGWAQEA3wEAIZcBAQDfAQAhmAEBAOABACGaAQAA8wGaASKiAQEA4AEAIaQBEACVAgAhrQEBAN8BACGuAQEA4AEAIbABAACUArABIrEBEACVAgAhsgFAAOsBACGzAQAAlgIAILQBAQDgAQAhtQEBAOABACG2ARAAlQIAIbcBEACVAgAhuAEBAOABACG6AQAAlwK6ASK7AQAAmAIAILwBAgCZAgAhvQEBAOABACG-ASAA4QEAIb8BEADoAQAhwAECAIwCACHBAQIAjAIAIcIBIADhAQAhIgQAAMACACAKAADBAgAgZwEAAAABagEAAAABbSAAAAABcEAAAAABcUAAAAABlQEBAAAAAZYBAQAAAAGXAQEAAAABmAEBAAAAAZoBAAAAmgECogEBAAAAAaQBEAAAAAGtAQEAAAABrgEBAAAAAbABAAAAsAECsQEQAAAAAbIBQAAAAAGzAQAAvgIAILQBAQAAAAG1AQEAAAABtgEQAAAAAbcBEAAAAAG4AQEAAAABugEAAAC6AQK7AQAAvwIAILwBAgAAAAG9AQEAAAABvgEgAAAAAb8BEAAAAAHAAQIAAAABwQECAAAAAcIBIAAAAAECAAAAAQAgGAAA0AIAICIEAADAAgAgCwAAwgIAIGcBAAAAAWoBAAAAAW0gAAAAAXBAAAAAAXFAAAAAAZUBAQAAAAGWAQEAAAABlwEBAAAAAZgBAQAAAAGaAQAAAJoBAqIBAQAAAAGkARAAAAABrQEBAAAAAa4BAQAAAAGwAQAAALABArEBEAAAAAGyAUAAAAABswEAAL4CACC0AQEAAAABtQEBAAAAAbYBEAAAAAG3ARAAAAABuAEBAAAAAboBAAAAugECuwEAAL8CACC8AQIAAAABvQEBAAAAAb4BIAAAAAG_ARAAAAABwAECAAAAAcEBAgAAAAHCASAAAAABAgAAAAEAIBgAANICACARZwEAAAABcEAAAAABcUAAAAABfhAAAAABfwEAAAABgQEAAACBAQKDAQAAAIMBAoQBAQAAAAGFAQEAAAABhgEBAAAAAYcBAQAAAAGIAQEAAAABiQEBAAAAAYoBAQAAAAGLAYAAAAABjAFAAAAAAY0BQAAAAAEDAAAAFQAgGAAA0AIAIBkAANcCACAkAAAAFQAgBAAAmgIAIAoAAJsCACARAADXAgAgZwEA3wEAIWoBAOABACFtIADhAQAhcEAA4gEAIXFAAOIBACGVAQEA3wEAIZYBAQDfAQAhlwEBAN8BACGYAQEA4AEAIZoBAADzAZoBIqIBAQDgAQAhpAEQAJUCACGtAQEA3wEAIa4BAQDgAQAhsAEAAJQCsAEisQEQAJUCACGyAUAA6wEAIbMBAACWAgAgtAEBAOABACG1AQEA4AEAIbYBEACVAgAhtwEQAJUCACG4AQEA4AEAIboBAACXAroBIrsBAACYAgAgvAECAJkCACG9AQEA4AEAIb4BIADhAQAhvwEQAOgBACHAAQIAjAIAIcEBAgCMAgAhwgEgAOEBACEiBAAAmgIAIAoAAJsCACBnAQDfAQAhagEA4AEAIW0gAOEBACFwQADiAQAhcUAA4gEAIZUBAQDfAQAhlgEBAN8BACGXAQEA3wEAIZgBAQDgAQAhmgEAAPMBmgEiogEBAOABACGkARAAlQIAIa0BAQDfAQAhrgEBAOABACGwAQAAlAKwASKxARAAlQIAIbIBQADrAQAhswEAAJYCACC0AQEA4AEAIbUBAQDgAQAhtgEQAJUCACG3ARAAlQIAIbgBAQDgAQAhugEAAJcCugEiuwEAAJgCACC8AQIAmQIAIb0BAQDgAQAhvgEgAOEBACG_ARAA6AEAIcABAgCMAgAhwQECAIwCACHCASAA4QEAIQMAAAAVACAYAADSAgAgGQAA2gIAICQAAAAVACAEAACaAgAgCwAAnAIAIBEAANoCACBnAQDfAQAhagEA4AEAIW0gAOEBACFwQADiAQAhcUAA4gEAIZUBAQDfAQAhlgEBAN8BACGXAQEA3wEAIZgBAQDgAQAhmgEAAPMBmgEiogEBAOABACGkARAAlQIAIa0BAQDfAQAhrgEBAOABACGwAQAAlAKwASKxARAAlQIAIbIBQADrAQAhswEAAJYCACC0AQEA4AEAIbUBAQDgAQAhtgEQAJUCACG3ARAAlQIAIbgBAQDgAQAhugEAAJcCugEiuwEAAJgCACC8AQIAmQIAIb0BAQDgAQAhvgEgAOEBACG_ARAA6AEAIcABAgCMAgAhwQECAIwCACHCASAA4QEAISIEAACaAgAgCwAAnAIAIGcBAN8BACFqAQDgAQAhbSAA4QEAIXBAAOIBACFxQADiAQAhlQEBAN8BACGWAQEA3wEAIZcBAQDfAQAhmAEBAOABACGaAQAA8wGaASKiAQEA4AEAIaQBEACVAgAhrQEBAN8BACGuAQEA4AEAIbABAACUArABIrEBEACVAgAhsgFAAOsBACGzAQAAlgIAILQBAQDgAQAhtQEBAOABACG2ARAAlQIAIbcBEACVAgAhuAEBAOABACG6AQAAlwK6ASK7AQAAmAIAILwBAgCZAgAhvQEBAOABACG-ASAA4QEAIb8BEADoAQAhwAECAIwCACHBAQIAjAIAIcIBIADhAQAhGQUAAIQCACAGAACFAgAgZwEAAAABcEAAAAABcUAAAAABjQFAAAAAAZQBAQAAAAGVAQEAAAABlgEBAAAAAZcBAQAAAAGYAQEAAAABmgEAAACaAQKbAQEAAAABnAEBAAAAAZ0BQAAAAAGeAUAAAAABnwFAAAAAAaABEAAAAAGhAQEAAAABogEBAAAAAaMBAQAAAAGkARAAAAABpQEQAAAAAaYBEAAAAAGoAQAAAKgBAgIAAAAJACAYAADbAgAgAwAAAAcAIBgAANsCACAZAADfAgAgGwAAAAcAIAUAAPUBACAGAAD2AQAgEQAA3wIAIGcBAN8BACFwQADiAQAhcUAA4gEAIY0BQADrAQAhlAEBAN8BACGVAQEA3wEAIZYBAQDfAQAhlwEBAN8BACGYAQEA3wEAIZoBAADzAZoBIpsBAQDfAQAhnAEBAN8BACGdAUAA4gEAIZ4BQADiAQAhnwFAAOIBACGgARAA6AEAIaEBAQDgAQAhogEBAOABACGjAQEA4AEAIaQBEADoAQAhpQEQAOgBACGmARAA6AEAIagBAAD0AagBIhkFAAD1AQAgBgAA9gEAIGcBAN8BACFwQADiAQAhcUAA4gEAIY0BQADrAQAhlAEBAN8BACGVAQEA3wEAIZYBAQDfAQAhlwEBAN8BACGYAQEA3wEAIZoBAADzAZoBIpsBAQDfAQAhnAEBAN8BACGdAUAA4gEAIZ4BQADiAQAhnwFAAOIBACGgARAA6AEAIaEBAQDgAQAhogEBAOABACGjAQEA4AEAIaQBEADoAQAhpQEQAOgBACGmARAA6AEAIagBAAD0AagBIgQEBgIJAAYKCgMLEAMBAwABBAUAAQYAAQgOBAkABQEHAAMBCA8AAwQRAAoSAAsTAAAAAAUJAAseAAwfAA0gAA4hAA8AAAAAAAUJAAseAAwfAA0gAA4hAA8BAwABAQMAAQUJABQeABUfABYgABchABgAAAAAAAUJABQeABUfABYgABchABgCBQABBgABAgUAAQYAAQUJAB0eAB4fAB8gACAhACEAAAAAAAUJAB0eAB4fAB8gACAhACEBBwADAQcAAwUJACYeACcfACggACkhACoAAAAAAAUJACYeACcfACggACkhACoAAAADCQAwIAAxIQAyAAAAAwkAMCAAMSEAMgwCAQ0UAQ4XAQ8YARAZARIbARMdBxQeCBUgARYiBxcjCRokARslARwmByIpCiMqECQrAiUsAiYtAicuAigvAikxAiozBys0ESw2Ai04By45Ei86AjA7AjE8BzI_EzNAGTRBAzVCAzZDAzdEAzhFAzlHAzpJBztKGjxMAz1OBz5PGz9QA0BRA0FSB0JVHENWIkRXBEVYBEZZBEdaBEhbBEldBEpfB0tgI0xiBE1kB05lJE9mBFBnBFFoB1JrJVNsK1RuLFVvLFZyLFdzLFh0LFl2LFp4B1t5LVx7LF19B15-Ll9_LGCAASxhgQEHYoQBL2OFATM"
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
init_password_util();

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

// src/modeles/user/user.service.ts
init_upload_util();
init_response_util();
init_types();
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
    if (photoFiles && photoFiles.length > 0) {
      const uploadedPhotos = await uploadImages(photoFiles, "garba/gallery");
      await prisma.userPhoto.createMany({
        data: uploadedPhotos.map((p, idx) => ({
          userId: user.id,
          imageUrl: p.url,
          publicId: p.publicId,
          caption: `Photo ${idx + 1}`,
          order: idx
        }))
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
   * UPDATE: Update user/model details and optional avatar
   */
  async update(userId, data, avatarFile) {
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      throw new ErrorResponse("User model not found", 404 /* Not_Found */);
    }
    let avatarUrl = data.avatarUrl !== void 0 ? data.avatarUrl : existing.avatarUrl;
    if (avatarFile) {
      const [uploaded] = await uploadImages([avatarFile], "garba/avatars");
      avatarUrl = uploaded?.url || avatarUrl;
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

// src/modeles/user/user.controller.ts
init_response_util();
init_types();

// src/modeles/user/user.validation.ts
import { z } from "zod";
var RoleEnum = z.enum(["CUSTOMER", "PERFORMER", "ORGANIZER", "ADMIN"]);
var GenderEnum = z.enum(["MALE", "FEMALE", "OTHER"]);
var SkillLevelEnum = z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "PRO", "CHOREOGRAPHER"]);
var arrayPreprocessor = (val) => {
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return val.split(",").map((s) => s.trim()).filter(Boolean);
    }
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
  isVerified: z.preprocess(booleanPreprocessor, z.boolean().default(false).optional())
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
var UserController = class {
  /**
   * CREATE: POST /api/v1/users
   * Create a new User / Performer model with avatar and optional gallery photos
   */
  async create(req, res, next) {
    try {
      const validated = createUserSchema.parse(req.body);
      const files = req.files;
      const avatarFile = files?.avatar?.[0] || (req.file?.fieldname === "avatar" ? req.file : void 0);
      const photoFiles = files?.photos;
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
   * Update user details (bio, rate, availability, height, dance styles, avatar)
   */
  async update(req, res, next) {
    try {
      const validated = updateUserSchema.parse(req.body);
      const avatarFile = req.file;
      const updated = await userService.update(req.params.id, validated, avatarFile);
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
      const files = req.files;
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

// src/modeles/user/user.routes.ts
var router = Router();
router.post(
  "/",
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "photos", maxCount: 10 }
  ]),
  userController.create.bind(userController)
);
router.get("/", userController.getAll.bind(userController));
router.get("/:id", userController.getById.bind(userController));
router.patch(
  "/:id",
  upload.single("avatar"),
  userController.update.bind(userController)
);
router.delete("/:id", userController.delete.bind(userController));
router.post(
  "/:id/photos",
  upload.array("photos", 10),
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
    let customer = data.customerId ? await prisma.user.findUnique({ where: { id: data.customerId } }) : null;
    if (!customer) {
      customer = await prisma.user.findFirst({
        where: {
          OR: [{ email: data.email }, { phone: data.phone }]
        }
      });
    }
    if (!customer) {
      const { hashPassword: hashPassword2 } = await Promise.resolve().then(() => (init_password_util(), password_util_exports));
      const defaultHash = await hashPassword2("Customer@123");
      customer = await prisma.user.create({
        data: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          avatarUrl: data.avatarUrl || null,
          passwordHash: defaultHash,
          gender: data.gender,
          role: "CUSTOMER",
          address: data.address,
          city: data.city || "Ahmedabad",
          state: "Gujarat"
        }
      });
    } else if (data.avatarUrl) {
      customer = await prisma.user.update({
        where: { id: customer.id },
        data: {
          avatarUrl: data.avatarUrl,
          name: data.name,
          gender: data.gender,
          address: data.address
        }
      });
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
    const hourlyRate = performer.hourlyRate ? Number(performer.hourlyRate) : 1e3;
    const totalAmount = parseFloat((durationHours * hourlyRate).toFixed(2));
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
        if (activeQR.imageUrl) activeQrImageUrl = activeQR.imageUrl;
        if (activeQR.bankName) activePaymentMethod = `UPI_QR_${activeQR.bankName.toUpperCase().replace(/\s+/g, "_")}`;
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
    const [booking, payment] = await prisma.$transaction(async (tx) => {
      const newBooking = await tx.booking.create({
        data: {
          bookingCode,
          name: data.name,
          email: data.email,
          phone: data.phone,
          address: data.address,
          gender: data.gender,
          customerId: customer.id,
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
    }
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: "PAYMENT_VERIFIED" },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true, avatarUrl: true } },
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
          customer: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
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
        customer: {
          select: { id: true, name: true, email: true, phone: true, avatarUrl: true }
        },
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
    const { status, performerId, customerId, search, date, page, limit } = query;
    const skip = (page - 1) * limit;
    const where = {};
    if (status) where.status = status;
    if (performerId) where.performerId = performerId;
    if (customerId) where.customerId = customerId;
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
          customer: { select: { id: true, name: true, phone: true, email: true, avatarUrl: true } },
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
  // Customer & Performer IDs
  customerId: z2.string().uuid("Invalid customer ID").optional(),
  performerId: z2.string().uuid("Invalid performer ID"),
  // Booker / Client Contact Details
  name: z2.string().min(2, "Name must be at least 2 characters"),
  email: z2.string().email("Invalid email address"),
  phone: z2.string().min(10, "Phone number must be at least 10 digits"),
  address: z2.string().min(3, "Address is required"),
  gender: GenderEnum.default("OTHER"),
  avatarUrl: z2.string().optional().nullable(),
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
  customerId: z2.string().uuid().optional(),
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
app.use("/api/v1/users", user_routes_default);
app.use("/api/v1/bookings", booking_routes_default);
app.use("/api/v1/qr", qr_routes_default);
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
