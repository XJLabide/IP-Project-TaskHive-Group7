import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { verificationDocumentUrl } from "@/lib/verification/document";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ userId: string }> }) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  const { userId } = await context.params;
  const record = await prisma.taskerVerification.findUnique({
    where: { userId },
    select: { status: true, idDocumentPublicId: true, idDocumentFormat: true },
  });
  if (record?.status !== "PENDING" || !record.idDocumentPublicId || !record.idDocumentFormat) {
    return NextResponse.json({ error: "No pending ID image is available." }, { status: 404 });
  }

  return NextResponse.redirect(verificationDocumentUrl(record.idDocumentPublicId, record.idDocumentFormat), {
    status: 302,
    headers: { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" },
  });
}
