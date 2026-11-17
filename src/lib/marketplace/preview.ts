/** Preview stores are a local development aid and never a production data source. */
export function shouldUseMarketplacePreview(
  isPreview: boolean,
  environment = process.env.NODE_ENV,
): boolean {
  return isPreview && environment !== "production";
}
