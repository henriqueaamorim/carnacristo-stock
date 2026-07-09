import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  CacheableResponsePlugin,
  ExpirationPlugin,
  Serwist,
  StaleWhileRevalidate,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/**
 * Fotos de produto vêm de signed URLs do Supabase Storage (token novo a
 * cada /api/produtos), então o cache ignora a query string para casar com
 * uma foto já vista mesmo com token diferente, revalidando em background.
 * O bucket "pix" fica de fora de propósito — é imagem crítica de pagamento.
 */
const productImagesRoute = {
  matcher({ url }: { url: URL }) {
    return (
      url.hostname.endsWith("supabase.co") &&
      url.pathname.includes("/storage/v1/object/sign/products/")
    );
  },
  handler: new StaleWhileRevalidate({
    cacheName: "product-images",
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
  matchOptions: { ignoreSearch: true },
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [...defaultCache, productImagesRoute],
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
