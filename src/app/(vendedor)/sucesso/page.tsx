import { Suspense } from "react";
import SucessoInner from "./sucesso-inner";

export default function SucessoPage() {
  return (
    <Suspense fallback={<p className="text-center text-[#233d4d]">Carregando…</p>}>
      <SucessoInner />
    </Suspense>
  );
}
