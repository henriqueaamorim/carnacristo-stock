import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Carnacristo Stock",
    short_name: "Carnacristo",
    description: "Vendas e estoque centralizados",
    start_url: "/",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#0f172a",
    lang: "pt-BR",
    orientation: "portrait-primary",
    icons: [],
  };
}
