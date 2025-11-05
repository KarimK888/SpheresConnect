export const getMapboxToken = () => {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) {
    console.warn("Mapbox token is not configured.");
  }
  return token ?? "";
};
