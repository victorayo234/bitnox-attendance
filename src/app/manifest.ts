import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bitnox Attendance",
    short_name: "Bitnox",
    description: "Scan in. Scan out. Stay on track.",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#0B1B3F",
    icons: [
      {
        src: "/icon",
        sizes: "48x48",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
