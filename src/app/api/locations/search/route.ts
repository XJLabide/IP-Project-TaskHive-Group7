import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api/response";

type PhotonFeature = {
  properties?: {
    name?: unknown;
    housenumber?: unknown;
    street?: unknown;
    district?: unknown;
    city?: unknown;
    county?: unknown;
    state?: unknown;
    postcode?: unknown;
    country?: unknown;
  };
};

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function formatAddress(properties: PhotonFeature["properties"]): string | null {
  if (!properties) return null;

  const street = [text(properties.housenumber), text(properties.street)]
    .filter((part): part is string => Boolean(part))
    .join(" ");
  const name = text(properties.name);
  const firstLine = street || name;
  if (!firstLine) return null;

  const parts = [
    firstLine,
    text(properties.district),
    text(properties.city),
    text(properties.state) ?? text(properties.county),
    text(properties.postcode),
    text(properties.country),
  ];

  return parts
    .filter((part, index, all): part is string => Boolean(part) && all.indexOf(part) === index)
    .join(", ");
}

export async function POST(request: Request) {
  const authResult = await requireUser(request);
  if (authResult.response) return authResult.response;

  const body = (await request.json().catch(() => null)) as { query?: unknown } | null;
  const query = typeof body?.query === "string" ? body.query.trim() : "";

  if (!query) {
    return NextResponse.json({ error: "Search text is required." }, { status: 400 });
  }

  if (query.length < 4) {
    return NextResponse.json({ suggestions: [] }, { headers: { "Cache-Control": "no-store" } });
  }
  if (query.length > 160) {
    return NextResponse.json({ error: "Search text is too long." }, { status: 400 });
  }

  const endpoint = new URL("/api", process.env.PHOTON_URL ?? "https://photon.komoot.io");
  endpoint.searchParams.set("q", query);
  endpoint.searchParams.set("countrycode", "PH");
  endpoint.searchParams.set("lang", "en");
  endpoint.searchParams.set("limit", "5");

  try {
    const response = await fetch(endpoint, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) {
      return NextResponse.json({ error: "Address suggestions are temporarily unavailable." }, { status: 502 });
    }

    const payload = (await response.json()) as { features?: PhotonFeature[] };
    const suggestions = (payload.features ?? [])
      .slice(0, 5)
      .map((feature) => formatAddress(feature.properties))
      .filter((label): label is string => Boolean(label))
      .map((label, id) => ({ id: String(id), label }));

    return NextResponse.json({ suggestions }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Address suggestions are temporarily unavailable." }, { status: 502 });
  }
}
