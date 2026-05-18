"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const ctrl = navigator.serviceWorker.controller;
    void navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(() => {
        if (!ctrl) return;
        void navigator.serviceWorker.ready;
      })
      .catch(() => {});
  }, []);

  return null;
}
