import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";

const pageSize = 10;

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  const requestedPage = Number(new URL(request.url).searchParams.get("page") ?? "1");
  if (!Number.isInteger(requestedPage) || requestedPage < 1) {
    return NextResponse.json({ error: "Choose a valid page." }, { status: 422 });
  }

  const where = { status: "PENDING" as const, idDocumentPublicId: { not: null } };
  const total = await prisma.taskerVerification.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const items = await prisma.taskerVerification.findMany({
    where,
    orderBy: [{ submittedAt: "asc" }, { userId: "asc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: {
      userId: true,
      submittedAt: true,
      user: { select: { name: true } },
    },
  });

  return NextResponse.json({ data: {
    items: items.map((item) => ({ userId: item.userId, name: item.user.name, submittedAt: item.submittedAt })),
    pagination: { page, pageSize, total, totalPages },
  } });
}
