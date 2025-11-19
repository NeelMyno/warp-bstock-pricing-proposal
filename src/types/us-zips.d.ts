declare module 'us-zips' {
  export interface UsZipEntry {
    latitude: number;
    longitude: number;
    city?: string;
    state?: string;
  }

  const zips: Record<string, UsZipEntry>;
  export default zips;
}

