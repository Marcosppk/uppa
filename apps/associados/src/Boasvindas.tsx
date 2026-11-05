import { lazy, Suspense, useState, type FormEvent } from 'react';
import { Campo, CampoSenha, Logo, Icone, useAcao, Carregando } from '@shared/ui';
import { mascaraCpf } from '@shared/formato';
import { lembrarLogin } from '@shared/lembrar';
import { api } from './api';
// A ficha de inscrição (formulário completo) só carrega quando alguém vai se inscrever.
const Inscricao = lazy(() => import('./Inscricao').then((m) => ({ default: m.Inscricao })));
import { VERSAO } from '@shared/versao';

/** Rodapé discreto das telas de entrada. */
export const RodapeEntrada = () => (
  <footer className="rodape-entrada">
    <span>UPPA Roraima — União de Pais e Pessoas Autistas</span>
    <span>Seus dados são protegidos pela LGPD</span>
    <span>Versão {VERSAO}</span>
  </footer>
);

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

  if (tela === 'inscricao')
    return (
      <Suspense fallback={<Carregando />}>
        <Inscricao voltar={voltar} convite={convite} aoEnviar={(t) => (t ? aoEntrar(t) : setTela('enviada'))} />
      </Suspense>
    );

  return (
    <div className="tela-entrada">
      <main className="cartao-entrada">
        <div className="marca-entrada">
          <Logo tamanho={32} /> UPPA Associados
        </div>
        {tela === 'inicio' && (
          <>
            <div className="ilustracao-entrada">
              <Logo tamanho={96} prioridade />
            </div>
            <h1>Boas-vindas à UPPA</h1>
            <p className="subtitulo">Carteirinha, mensalidades, avisos e a sala de acolhimento, tudo num só lugar.</p>
            <button className="btn block" onClick={() => setTela('entrar')}>
              Entrar
            </button>
            <button className="btn sec block" onClick={() => setTela('primeiro')}>
              Primeiro acesso (já sou sócio)
            </button>
            <button type="button" className="link-entrada" onClick={() => setTela('inscricao')}>
              Ainda não sou sócio — quero me associar
            </button>
          </>
        )}
        {tela === 'enviada' && (
          <>
            <h1>Inscrição enviada!</h1>
            <p className="subtitulo">Seu cadastro agora aguarda a autorização de um administrador da UPPA. Para entrar no app, use seu CPF e a senha padrão 12345678 — o app vai pedir para você criar a sua.</p>
            <button className="btn block" onClick={() => setTela('entrar')}>
              Entrar
            </button>
          </>
        )}
        {(tela === 'entrar' || tela === 'primeiro') && <Entrar key={tela} voltar={voltar} primeiro={tela === 'primeiro'} aoEntrar={aoEntrar} />}
      </main>
      <RodapeEntrada />
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
    <form className="stack" onSubmit={enviar}>
      {voltar}
      {memoria.usuario && !primeiro && (
        <span className="pilula" aria-label="CPF lembrado neste aparelho">
          <Icone nome="perfil" /> {mascaraCpf(memoria.usuario)}
        </span>
      )}
      <h1>{primeiro ? 'Primeiro acesso' : 'Entrar'}</h1>
      {primeiro && (
        <div className="alert">
          No primeiro acesso, entre com o seu <b>CPF</b> e a senha padrão <b>12345678</b>. Em seguida você cria a sua própria senha.
        </div>
      )}
      <Campo rotulo="CPF">
        <input className="input" inputMode="numeric" value={mascaraCpf(cpf)} onChange={(e) => setCpf(e.target.value)} required autoComplete="username" placeholder="000.000.000-00" />
      </Campo>
      <Campo rotulo="Senha" ajuda={primeiro ? undefined : 'Primeiro acesso? Use a senha padrão 12345678.'}>
        <CampoSenha value={senha} onChange={(e) => setSenha(e.target.value)} required autoComplete="current-password" />
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
    <form className="stack" onSubmit={enviar}>
      <h1>Crie sua senha</h1>
      <p className="subtitulo">Bem-vindo(a)! Por segurança, troque a senha padrão por uma senha só sua. Você vai usá-la com o seu CPF nas próximas vezes.</p>
      <Campo rotulo="Nova senha" ajuda="Pelo menos 6 caracteres, diferente de 12345678.">
        <CampoSenha value={f.nova} onChange={(e) => setF({ ...f, nova: e.target.value })} required autoComplete="new-password" autoFocus />
      </Campo>
      <Campo rotulo="Repita a nova senha">
        <CampoSenha value={f.repetir} onChange={(e) => setF({ ...f, repetir: e.target.value })} required autoComplete="new-password" />
      </Campo>
      {erro && <div className="alert bad">{erro}</div>}
      <button className="btn block" disabled={ocupado}>
        Salvar senha e entrar
      </button>
    </form>
  );
}
