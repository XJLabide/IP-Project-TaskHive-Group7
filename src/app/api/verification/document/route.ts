import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/api/response";
import { applyVerificationEvent } from "@/lib/verification/service";
import { deleteVerificationDocument, uploadVerificationDocument } from "@/lib/verification/document";

export const runtime = "nodejs";

const maxImageBytes = 8 * 1024 * 1024;

function imageFormat(file: File, bytes: Uint8Array): "jpg" | "png" | "webp" | null {
  if (file.type === "image/jpeg" && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (file.type === "image/png" && bytes.subarray(0, 8).join(",") === "137,80,78,71,13,10,26,10") return "png";
  if (file.type === "image/webp" && bytes.length >= 12 && new TextDecoder().decode(bytes.subarray(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.subarray(8, 12)) === "WEBP") return "webp";
  return null;
}

export async function POST(request: Request) {
  const gate = await requireCapability(request, "start_verification");
  if (gate.response) return gate.response;

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > maxImageBytes + 64 * 1024) {
    return NextResponse.json({ error: "The ID image must be 8 MB or smaller." }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Choose one image of your ID and try again." }, { status: 400 });
  }

  const file = form.get("document");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose one image of your ID." }, { status: 422 });
  if (form.get("consent") !== "true") return NextResponse.json({ error: "Consent is required to submit your ID for review." }, { status: 422 });
  if (file.size === 0 || file.size > maxImageBytes) return NextResponse.json({ error: "The ID image must be between 1 byte and 8 MB." }, { status: 413 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const format = imageFormat(file, bytes);
  if (!format) return NextResponse.json({ error: "Upload a valid JPG, PNG, or WebP image." }, { status: 415 });

  let document: Awaited<ReturnType<typeof uploadVerificationDocument>>;
  try {
    document = await uploadVerificationDocument(gate.actor.id, Buffer.from(bytes));
  } catch {
    return NextResponse.json({ error: "Secure ID upload is unavailable. Try again later." }, { status: 503 });
  }

  const result = await applyVerificationEvent(gate.actor.id, { type: "submitted" }, {
    document: { ...document, consentedAt: new Date() },
  });
  if (!result.ok) {
    await deleteVerificationDocument(document.publicId).catch(() => false);
    return NextResponse.json({ error: result.reason, code: result.code }, { status: 409 });
  }

  return NextResponse.json({ data: result.state }, {
    status: 202,
    headers: { "Cache-Control": "private, no-store" },
  });
}
