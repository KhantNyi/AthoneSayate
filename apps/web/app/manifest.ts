import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Athonesayate",
    short_name: "Athonesayate",
    description: "A practical expense tracker for accounts, budgets, bills and goals.",
    id: "/",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f8fc",
    theme_color: "#f6f8fc",
    shortcuts: [
      {
        name: "Add expense",
        short_name: "Add",
        description: "Jump straight to the quick-add form",
        url: "/?action=quick-add",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }]
      }
    ],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png"
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  };
}
