export async function searchLocations(query: string) {
  if (!process.env.MAPBOX_ACCESS_TOKEN) {
    return {
      provider: "mapbox",
      configured: false,
      results: [],
    };
  }

  const params = new URLSearchParams({
    access_token: process.env.MAPBOX_ACCESS_TOKEN,
    q: query,
    limit: "5",
  });

  const response = await fetch(`https://api.mapbox.com/search/geocode/v6/forward?${params}`);

  return response.json();
}
