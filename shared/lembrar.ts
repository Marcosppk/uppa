// "Lembrar de mim" no login: guarda no aparelho a escolha e o CPF/usuário para preencher da próxima vez.
const ler = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const gravar = (k: string, v: string | null) => {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {
    /* sem armazenamento: só não lembra */
  }
};

export function lembrarLogin(chave: string) {
  return {
    /** Marcado por padrão; desmarca se a pessoa desmarcou da última vez. */
    lembrar: ler(`${chave}-lembrar`) !== 'nao',
    usuario: ler(`${chave}-usuario`) ?? '',
    salvar(lembrar: boolean, usuario: string) {
      gravar(`${chave}-lembrar`, lembrar ? 'sim' : 'nao');
      gravar(`${chave}-usuario`, lembrar ? usuario : null);
    },
  };
}
