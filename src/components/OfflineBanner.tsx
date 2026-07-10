type Props = {
  message?: string;
};

export function OfflineBanner({
  message = "Sem conexão com a internet. Algumas ações podem não funcionar até a conexão voltar.",
}: Props) {
  return (
    <p
      role="status"
      aria-live="polite"
      className="rounded-lg border-2 border-amber-600 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900"
    >
      {message}
    </p>
  );
}
