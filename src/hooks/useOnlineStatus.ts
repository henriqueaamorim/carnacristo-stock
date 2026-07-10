"use client";

import { useEffect, useState } from "react";

/**
 * Baseado em navigator.onLine + eventos online/offline — detecta só a
 * interface de rede (ex: wifi conectado sem internet real ainda reporta
 * true). Complementa, mas não substitui, o tratamento de erro de cada
 * fetch (ver src/utils/network.ts).
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return online;
}
