import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { loadActorFromHeaders } from "./actor";

/** Reuse Firebase verification and the actor query across Server Components in one render. */
export const loadCurrentActor = cache(async () =>
  loadActorFromHeaders(await headers()),
);
