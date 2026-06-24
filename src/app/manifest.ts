import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hello Tropics",
    short_name: "Hello Tropics",
    description:
      "Der Treffpunkt für Familie und Freunde – Chatten, Videocalls machen und gemeinsame Zeiten finden",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#d6219b",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
