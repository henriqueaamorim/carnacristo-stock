"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ProductDTO } from "@/types";
import { useCartStore } from "@/store/cartStore";

async function fetchProducts(): Promise<ProductDTO[]> {
  const res = await fetch("/api/produtos");
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error || "Erro ao carregar produtos");
  }
  return res.json();
}

export function useProducts() {
  const queryClient = useQueryClient();
  const reconcileFromProducts = useCartStore((s) => s.reconcileFromProducts);

  const query = useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (query.data) {
      reconcileFromProducts(query.data);
    }
  }, [query.data, reconcileFromProducts]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("public:products")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["products"] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}
