"use client";

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0f172a] p-4">
      <div className="w-full max-w-sm rounded-[1.4rem] border-2 border-black bg-[#fff4e8] p-6 text-center shadow-[6px_6px_0_#000]">
        <h1 className="text-lg font-black text-black">Sem conexão</h1>
        <p className="mt-2 text-sm font-semibold text-[#233d4d]">
          Não foi possível carregar esta página. Verifique sua internet e tente novamente.
        </p>
        <button
          type="button"
          onClick={() => location.reload()}
          className="mt-6 w-full rounded-lg border-2 border-black bg-[#abcf85] py-3 font-black text-black hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          Tentar novamente
        </button>
      </div>
    </main>
  );
}
