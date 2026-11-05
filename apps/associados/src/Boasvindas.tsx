import { useEffect, useState, type FormEvent } from 'react';
import { Campo, Logo, Icone, useAcao } from '@shared/ui';
import { FormSocio, type DadosSocio } from '@shared/FormSocio';
import { mascaraCpf } from '@shared/formato';
import { lembrarLogin } from '@shared/lembrar';
import { api } from './api';

type Tela = 'inicio' | 'entrar' | 'primeiro' | 'inscricao' | 'enviada';
export type AoEntrar = (token: string, lembrar?: boolean) => void;

const memoria = lembrarLogin('uppa-associados');

/** `inicial="inscricao"` abre direto a ficha de cadastro (link de cadastro: #/inscricao?convite=...). */
export function Boasvindas({ aoEntrar, inicial = 'inicio', convite }: { aoEntrar: AoEntrar; inicial?: Tela; convite?: string }) {
  const [tela, setTela] = useState<Tela>(inicial);
  const voltar = (
    <button type="button" className="btn ghost sm" onClick={() => setTela('inicio')} style={{ justifySelf: 'start' }}>
      <Icone nome="voltar" /> Voltar
    </button>
  );

  if (tela === 'inscricao') return <Inscricao voltar={voltar} convite={convite} aoEnviar={(t) => (t ? aoEntrar(t) : setTela('enviada'))} />;

  return (
    <div className="hero">
      <div className="marca">
        <Logo tamanho={150} />
        <h1>UPPA Associados</h1>
        <span className="muted">União de Pais e Pessoas Autistas</span>
      </div>
      {tela === 'inicio' && (
        <div className="stack">
          <button className="btn block" onClick={() => setTela('entrar')}>
            Entrar
          </button>
          <button className="btn sec block" onClick={() => setTela('primeiro')}>
            Primeiro acesso (já sou sócio)
          </button>
          <button className="btn ghost block" onClick={() => setTela('inscricao')}>
            Quero me associar
          </button>
        </div>
      )}
      {tela === 'enviada' && (
        <div className="card stack center">
          <h2>Inscrição enviada!</h2>
          <p>Seu cadastro agora aguarda a autorização de um administrador da UPPA. Para entrar no app, use seu CPF e a senha padrão 12345678 — o app vai pedir para você criar a sua.</p>
          <button className="btn" onClick={() => setTela('entrar')}>
            Entrar
          </button>
        </div>
      )}
      {(tela === 'entrar' || tela === 'primeiro') && <Entrar key={tela} voltar={voltar} primeiro={tela === 'primeiro'} aoEntrar={aoEntrar} />}
    </div>
  );
}

function Entrar({ voltar, primeiro, aoEntrar }: { voltar: React.ReactNode; primeiro: boolean; aoEntrar: AoEntrar }) {
  const [cpf, setCpf] = useState(memoria.usuario);
  const [senha, setSenha] = useState('');
  const [lembrar, setLembrar] = useState(memoria.lembrar);
  const [erro, setErro] = useState('');
  const [provisorio, setProvisorio] = useState<string | null>(null);
  const { ocupado, rodar } = useAcao();

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    setErro('');
    rodar(async () => {
      try {
        const r = await api.post<{ token: string; trocarSenha?: boolean }>('/associado/login', { cpf, senha, lembrar });
        memoria.salvar(lembrar, cpf.replace(/\D/g, ''));
        if (r.trocarSenha) {
          api.gravarToken(r.token, false);
          setProvisorio(r.token);
        } else aoEntrar(r.token, lembrar);
      } catch (e) {
        setErro((e as Error).message);
      }
    });
  };

  if (provisorio) return <CriarSenha aoCriar={() => aoEntrar(provisorio, lembrar)} />;

  return (
    <form className="card stack" onSubmit={enviar}>
      {voltar}
      {primeiro && (
        <div className="alert">
          No primeiro acesso, entre com o seu <b>CPF</b> e a senha padrão <b>12345678</b>. Em seguida você cria a sua própria senha.
        </div>
      )}
      <Campo rotulo="CPF">
        <input className="input" inputMode="numeric" value={mascaraCpf(cpf)} onChange={(e) => setCpf(e.target.value)} required autoComplete="username" placeholder="000.000.000-00" />
      </Campo>
      <Campo rotulo="Senha" ajuda={primeiro ? undefined : 'Primeiro acesso? Use a senha padrão 12345678.'}>
        <input className="input" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required autoComplete="current-password" />
      </Campo>
      <label className="check">
        <input type="checkbox" checked={lembrar} onChange={(e) => setLembrar(e.target.checked)} />
        <span>
          Lembrar de mim <span className="muted small">(não marque em aparelho de outra pessoa)</span>
        </span>
      </label>
      {erro && <div className="alert bad">{erro}</div>}
      <button className="btn block" disabled={ocupado}>
        Entrar
      </button>
    </form>
  );
}

/** Troca obrigatória da senha padrão no primeiro acesso. */
function CriarSenha({ aoCriar }: { aoCriar: () => void }) {
  const [f, setF] = useState({ nova: '', repetir: '' });
  const [erro, setErro] = useState('');
  const { ocupado, rodar } = useAcao();
  const enviar = (e: FormEvent) => {
    e.preventDefault();
    setErro('');
    if (f.nova !== f.repetir) return setErro('As duas senhas não são iguais.');
    rodar(async () => {
      try {
        await api.post('/associado/definir-senha', { nova: f.nova });
        aoCriar();
      } catch (e) {
        setErro((e as Error).message);
      }
    });
  };
  return (
    <form className="card stack" onSubmit={enviar}>
      <h2>Crie sua senha</h2>
      <p className="small">Bem-vindo(a)! Por segurança, troque a senha padrão por uma senha só sua. Você vai usá-la com o seu CPF nas próximas vezes.</p>
      <Campo rotulo="Nova senha" ajuda="Pelo menos 6 caracteres, diferente de 12345678.">
        <input className="input" type="password" value={f.nova} onChange={(e) => setF({ ...f, nova: e.target.value })} required autoComplete="new-password" autoFocus />
      </Campo>
      <Campo rotulo="Repita a nova senha">
        <input className="input" type="password" value={f.repetir} onChange={(e) => setF({ ...f, repetir: e.target.value })} required autoComplete="new-password" />
      </Campo>
      {erro && <div className="alert bad">{erro}</div>}
      <button className="btn block" disabled={ocupado}>
        Salvar senha e entrar
      </button>
    </form>
  );
}

function Inscricao({ voltar, convite, aoEnviar }: { voltar: React.ReactNode; convite?: string; aoEnviar: (token: string | null) => void }) {
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
          <input className="input" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" />
        </Campo>
      </fieldset>
      {erro && <div className="alert bad">{erro}</div>}
      <button className="btn block" disabled={ocupado}>
        Enviar inscrição
      </button>
    </form>
  );
}
