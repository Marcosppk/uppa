// Cliente da API usado pelos dois apps. No navegador a API fica no mesmo endereço;
// no app nativo (Capacitor) o endereço do servidor vem de VITE_API_URL.
const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

/** Endereço completo de um caminho devolvido pela API (ex.: anexos), também no app nativo. */
export const urlApi = (caminho: string) => `${BASE}${caminho}`;

export class ErroApi extends Error {
  constructor(public status: number, mensagem: string) {
    super(mensagem);
  }
}

export function criarApi(chaveToken: string, aoExpirar: () => void) {
  // "Lembrar de mim": o acesso fica no aparelho (localStorage). Sem ele, some ao fechar o app/aba (sessionStorage).
  let tokenMemoria: string | null = null;
  const lerToken = () => {
    try {
      return localStorage.getItem(chaveToken) ?? sessionStorage.getItem(chaveToken) ?? tokenMemoria;
    } catch {
      return tokenMemoria;
    }
  };
  const gravarToken = (t: string | null, lembrar = true) => {
    tokenMemoria = t;
    try {
      localStorage.removeItem(chaveToken);
      sessionStorage.removeItem(chaveToken);
      if (t) (lembrar ? localStorage : sessionStorage).setItem(chaveToken, t);
    } catch {
      /* armazenamento indisponível: a sessão dura só enquanto a página estiver aberta */
    }
  };

  async function pedir<T = unknown>(metodo: string, caminho: string, corpo?: unknown, extras: Record<string, string> = {}): Promise<T> {
    const token = lerToken();
    // Arquivo (Blob) vai como está no corpo; o resto vai em JSON.
    const arquivo = corpo instanceof Blob;
    let resp: Response;
    try {
      resp = await fetch(`${BASE}/api${caminho}`, {
        method: metodo,
        headers: {
          ...(corpo !== undefined ? { 'Content-Type': arquivo ? corpo.type || 'application/octet-stream' : 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...extras,
        },
        body: corpo === undefined ? undefined : arquivo ? corpo : JSON.stringify(corpo),
      });
    } catch {
      throw new ErroApi(0, 'Sem conexão com o servidor. Verifique sua internet.');
    }
    const tipo = resp.headers.get('content-type') ?? '';
    const dados = tipo.includes('json') ? await resp.json() : await resp.text();
    if (!resp.ok) {
      if (resp.status === 401 && token) {
        gravarToken(null);
        aoExpirar();
      }
      throw new ErroApi(resp.status, (dados as { erro?: string })?.erro ?? 'Algo deu errado.');
    }
    return dados as T;
  }

  return {
    token: lerToken,
    gravarToken,
    get: <T>(c: string) => pedir<T>('GET', c),
    post: <T>(c: string, b: unknown = {}) => pedir<T>('POST', c, b),
    put: <T>(c: string, b: unknown) => pedir<T>('PUT', c, b),
    del: <T>(c: string) => pedir<T>('DELETE', c),
    /** Envia um arquivo (o nome segue no cabeçalho X-Nome-Arquivo). */
    enviarArquivo: <T>(c: string, arquivo: Blob, nome: string) => pedir<T>('POST', c, arquivo, { 'X-Nome-Arquivo': encodeURIComponent(nome) }),
    /** Baixa um arquivo autenticado (ex.: exportação CSV). */
    async baixar(caminho: string, nome: string) {
      const resp = await fetch(`${BASE}/api${caminho}`, { headers: { Authorization: `Bearer ${lerToken()}` } });
      if (!resp.ok) throw new ErroApi(resp.status, 'Não foi possível baixar o arquivo.');
      const url = URL.createObjectURL(await resp.blob());
      const a = Object.assign(document.createElement('a'), { href: url, download: nome });
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    },
  };
}
