import { created, requireUser } from "@/lib/api/response";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authResult = await requireUser(request);
  if (authResult.response) return authResult.response;

  return created({
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? "not_configured",
    uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET ?? "taskhive_unsigned_demo",
    folder: `taskhive/${authResult.session.user.id}`,
  });
}
