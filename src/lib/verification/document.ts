import "server-only";

import { Readable } from "node:stream";
import { randomUUID } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export type VerificationImageType = "image/jpeg" | "image/png" | "image/webp";

export async function uploadVerificationDocument(
  userId: string,
  buffer: Buffer,
): Promise<{ publicId: string; format: string; uploadedAt: Date }> {
  const publicId = `taskhive/verification/${userId}/${randomUUID()}`;
  return new Promise<{ publicId: string; format: string; uploadedAt: Date }>((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        type: "authenticated",
        public_id: publicId,
        overwrite: false,
        unique_filename: false,
        use_filename: false,
        tags: ["taskhive-verification"],
      },
      (error, result) => {
        if (error || !result?.public_id) {
          reject(error ?? new Error("Verification image upload failed."));
          return;
        }
        const format = result.format === "jpeg" ? "jpg" : result.format;
        if (format !== "jpg" && format !== "png" && format !== "webp") {
          reject(new Error("Uploaded verification image has an unsupported format."));
          return;
        }
        resolve({ publicId: result.public_id, format, uploadedAt: new Date() });
      },
    );
    Readable.from(buffer).pipe(upload);
  });
}


export function verificationDocumentUrl(publicId: string, format: string) {
  return cloudinary.utils.private_download_url(publicId, format, {
    type: "authenticated",
    resource_type: "image",
    expires_at: Math.floor(Date.now() / 1000) + 60,
  });
}

export async function deleteVerificationDocument(publicId: string) {
  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
    type: "authenticated",
    invalidate: true,
  });
  return result.result === "ok" || result.result === "not found";
}
