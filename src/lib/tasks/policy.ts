export type FulfillmentMode = "local" | "remote";
export type HiringMode = "bidding" | "fixed_price";

export type LaunchCategory = {
  slug: string;
  label: string;
  fulfillment: readonly FulfillmentMode[];
};

/**
 * The launch allow-list from SRS 2.2. Tutoring is the one category that can be
 * delivered either in person or online; every other category belongs to one
 * fulfillment mode.
 */
export const launchCategories: readonly LaunchCategory[] = [
  { slug: "errands", label: "Errands", fulfillment: ["local"] },
  { slug: "delivery", label: "Delivery", fulfillment: ["local"] },
  { slug: "cleaning", label: "Cleaning", fulfillment: ["local"] },
  { slug: "repairs", label: "Repairs", fulfillment: ["local"] },
  { slug: "moving", label: "Moving", fulfillment: ["local"] },
  { slug: "tutoring", label: "Tutoring", fulfillment: ["local", "remote"] },
  { slug: "writing", label: "Writing", fulfillment: ["remote"] },
  { slug: "design", label: "Design", fulfillment: ["remote"] },
  { slug: "translation", label: "Translation", fulfillment: ["remote"] },
];

/**
 * High-risk work that stays unavailable even if someone tries to type it in.
 * Matching is deliberately broad so "medical transport" and "child-care" are
 * caught, not just the exact labels.
 */
export const excludedCategories = [
  "medical",
  "healthcare",
  "health care",
  "childcare",
  "child care",
  "nanny",
  "babysitting",
  "passenger transport",
  "ride hailing",
  "taxi",
  "hazardous",
  "chemical",
  "asbestos",
] as const;

export function normalizeCategoryName(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, " ");
}

export function findLaunchCategory(value: string): LaunchCategory | null {
  const normalized = normalizeCategoryName(value);
  return launchCategories.find((category) => category.slug === normalized) ?? null;
}

export function isExcludedCategory(value: string): boolean {
  const normalized = normalizeCategoryName(value);
  return excludedCategories.some(
    (excluded) => normalized === excluded || normalized.includes(excluded),
  );
}

export function categoriesFor(fulfillment: FulfillmentMode): LaunchCategory[] {
  return launchCategories.filter((category) => category.fulfillment.includes(fulfillment));
}

export type CategoryDecision =
  | { allowed: true; category: LaunchCategory }
  | {
      allowed: false;
      code: "excluded_category" | "unknown_category" | "fulfillment_mismatch";
      reason: string;
    };

/** Decides whether a category may be used for the chosen fulfillment mode. */
export function categoryForFulfillment(
  value: string,
  fulfillment: FulfillmentMode,
): CategoryDecision {
  if (isExcludedCategory(value)) {
    return {
      allowed: false,
      code: "excluded_category",
      reason: "This category is not available at launch because the work is high-risk.",
    };
  }

  const category = findLaunchCategory(value);

  if (!category) {
    return {
      allowed: false,
      code: "unknown_category",
      reason: "Choose a launch-approved category.",
    };
  }

  if (!category.fulfillment.includes(fulfillment)) {
    const available = category.fulfillment.join(" or ");
    return {
      allowed: false,
      code: "fulfillment_mismatch",
      reason: `${category.label} is only available for ${available} tasks.`,
    };
  }

  return { allowed: true, category };
}
