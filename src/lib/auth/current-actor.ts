import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { loadActorFromHeaders } from "./actor";

/** Share one verified account snapshot across layouts, pages, and guards in this render. */
export const loadCurrentActor = cache(async () =>
  loadActorFromHeaders(await headers()),
);
