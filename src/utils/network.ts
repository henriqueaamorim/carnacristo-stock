/**
 * A spec do fetch garante que qualquer falha de rede (sem conexão, DNS,
 * conexão recusada) rejeita com TypeError — diferente dos Error comuns que
 * o próprio código lança para respostas HTTP não-ok. Isso permite distinguir
 * os dois casos sem comparar texto de mensagem, que varia entre navegadores.
 */
export function isNetworkError(e: unknown): boolean {
  return e instanceof TypeError;
}
