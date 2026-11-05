import { useEffect, useState, type FormEvent } from 'react';
import { Campo, CampoSenha, Logo, useAcao } from '@shared/ui';
import { FormSocio, type DadosSocio } from '@shared/FormSocio';
import { api } from './api';

/** Ficha de inscrição de quem quer se associar (também aberta pelo link de cadastro). */
export function Inscricao({ voltar, convite, aoEnviar }: { voltar: React.ReactNode; convite?: string; aoEnviar: (token: string | null) => void }) {
  const [d, setD] = useState<DadosSocio>({ autistas: [{ nome: '', nascimento: null }] });
  const [senha, setSenha] = useState('');
  const [valores, setValores] = useState<{ ate2: number; acima2: number }>();
  const [quem, setQuem] = useState<string | null>(null);
  const [erro, setErro] = useState('');
  const { ocupado, rodar } = useAcao();

  useEffect(() => {
    api.get<{ valor_ate_2sm: number; valor_acima_2sm: number }>('/publico/config').then((c) => setValores({ ate2: c.valor_ate_2sm, acima2: c.valor_acima_2sm })).catch(() => {});
    if (convite) api.get<{ de: string }>(`/publico/convite/${encodeURIComponent(convite)}`).then((r) => setQuem(r.de)).catch(() => {});
  }, [convite]);

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    setErro('');
    if (!d.categoria) return setErro('Escolha a categoria de associado.');
    if (!d.ciente_estatuto) return setErro('Marque a declaração de ciência do Estatuto.');
    rodar(async () => {
      try {
        const r = await api.post<{ token: string | null }>('/publico/inscricao', { ...d, senha: senha || undefined, convite });
        aoEnviar(r.token);
      } catch (e) {
        setErro((e as Error).message);
        window.scrollTo({ top: document.body.scrollHeight });
      }
    });
  };

  return (
    <form className="app stack" onSubmit={enviar} style={{ paddingBottom: 32 }}>
      {voltar}
      <div className="row" style={{ flexWrap: 'nowrap' }}>
        <Logo tamanho={64} />
        <div>
          <h1 style={{ marginBottom: 4 }}>Ficha de inscrição</h1>
          <p className="muted" style={{ margin: 0 }}>
            UPPA Roraima — União de Pais e Pessoas Autistas
          </p>
        </div>
      </div>
      {quem && (
        <div className="alert ok">
          Você foi convidado(a) por <b>{quem}</b> para fazer parte da UPPA.
        </div>
      )}
      <p className="muted" style={{ margin: 0 }}>
        Se você deseja tornar-se associado da UPPA, este é o primeiro passo. Depois de enviada, a inscrição é analisada e autorizada por um administrador da associação.
      </p>
      <FormSocio valor={d} onChange={setD} modo="inscricao" valores={valores} />
      <fieldset>
        <legend>Acesso ao app</legend>
        <Campo rotulo="Crie uma senha para o app (opcional)" ajuda="Para entrar com seu CPF. Se deixar em branco, use a senha padrão 12345678 no primeiro acesso e o app pede para trocar.">
          <CampoSenha value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" />
        </Campo>
      </fieldset>
      {erro && <div className="alert bad">{erro}</div>}
      <button className="btn block" disabled={ocupado}>
        Enviar inscrição
      </button>
    </form>
  );
}
