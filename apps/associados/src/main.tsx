import { createRoot } from 'react-dom/client';
import { useCallback, useEffect, useState } from 'react';
import '@shared/estilo.css';
import './app.css';
import { ToastProvider, useRota, Icone, Carregando, ir } from '@shared/ui';
import { api, type Eu } from './api';
import { Boasvindas } from './Boasvindas';
import { Inicio } from './Inicio';
import { Carteirinha, Verificar } from './Carteirinha';
import { MinhasMensalidades } from './MinhasMensalidades';
import { MeusDados } from './MeusDados';
import { Sala, Jogo } from './acolhimento/Sala';
import { AvisoNovaVersao } from '@shared/versao';
import { aplicarCampanha } from '@shared/campanhas';
import { Agenda } from './Agenda';
import { Mensagens } from './Mensagens';
import { aplicarPreferencias, PularParaConteudo } from '@shared/acessibilidade';

aplicarPreferencias();
aplicarCampanha(true);

const MENU = [
  { r: '/', ico: 'inicio', t: 'Início' },
  { r: '/carteirinha', ico: 'cartao', t: 'Carteirinha' },
  { r: '/mensalidades', ico: 'mensal', t: 'Mensalidades' },
  { r: '/acolhimento', ico: 'coracao', t: 'Acolhimento' },
  { r: '/dados', ico: 'perfil', t: 'Meus dados' },
];

function App() {
  const rota = useRota();
  const [logado, setLogado] = useState(!!api.token());
  const [eu, setEu] = useState<Eu | null>(null);
  const [erro, setErro] = useState('');

  const carregar = useCallback(() => {
    setErro('');
    return api
      .get<Eu>('/associado/me')
      .then((e) => {
        aplicarCampanha(e.associacao.campanhas);
        setEu(e);
      })
      .catch((e) => {
        // Sessão do primeiro acesso sem a senha trocada: volta para o login.
        if (e.status === 403) {
          api.gravarToken(null);
          setLogado(false);
        } else setErro(e.message);
      });
  }, []);

  useEffect(() => {
    if (logado) carregar();
    else setEu(null);
  }, [logado, carregar]);

  useEffect(() => {
    const sair = () => setLogado(false);
    window.addEventListener('uppa-sair', sair);
    return () => window.removeEventListener('uppa-sair', sair);
  }, []);

  const [caminho, consulta] = rota.split('?');
  const [base, param] = caminho.split('/').filter(Boolean);
  if (base === 'verificar') return <Verificar codigo={param ?? ''} />;

  const entrar = (token: string, lembrar = true) => {
    api.gravarToken(token, lembrar);
    setLogado(true);
    setEu(null);
    ir('/');
  };

  // Link de cadastro (#/inscricao?convite=...): abre direto a ficha, mesmo com alguém já logado neste aparelho.
  if (base === 'inscricao') return <Boasvindas key={rota} inicial="inscricao" convite={new URLSearchParams(consulta).get('convite') ?? undefined} aoEntrar={entrar} />;

  if (!logado) return <Boasvindas aoEntrar={entrar} />;

  const sair = async () => {
    await api.post('/associado/sair').catch(() => {});
    api.gravarToken(null);
    setLogado(false);
    ir('/');
  };

  if (!eu)
    return erro ? (
      <div className="app">
        <div className="alert bad">{erro}</div>
        <button className="btn" style={{ marginTop: 12 }} onClick={carregar}>
          Tentar de novo
        </button>
      </div>
    ) : (
      <Carregando />
    );

  // Dentro de uma atividade da sala de acolhimento a barra some, para a criança não sair sem querer.
  if (base === 'acolhimento' && param)
    return (
      <main className="app sala-jogo" id="conteudo" tabIndex={-1}>
        <Jogo key={param} id={param} />
      </main>
    );

  const atual = `/${base ?? ''}`;
  let pagina;
  if (base === 'carteirinha') pagina = <Carteirinha eu={eu} />;
  else if (base === 'mensalidades') pagina = <MinhasMensalidades eu={eu} aoMudar={carregar} />;
  else if (base === 'acolhimento') pagina = <Sala />;
  else if (base === 'agenda') pagina = <Agenda />;
  else if (base === 'mensagens') pagina = <Mensagens aoLer={carregar} />;
  else if (base === 'dados') pagina = <MeusDados eu={eu} aoMudar={carregar} aoSair={sair} />;
  else pagina = <Inicio eu={eu} />;

  return (
    <>
      <PularParaConteudo />
      <main className="app" id="conteudo" tabIndex={-1}>
        {pagina}
      </main>
      <nav className="tabbar" aria-label="Menu principal">
        {MENU.map((m) => (
          <a key={m.r} href={`#${m.r}`} aria-current={atual === m.r ? 'page' : undefined}>
            <Icone nome={m.ico} className="" />
            {m.t}
          </a>
        ))}
      </nav>
    </>
  );
}

createRoot(document.getElementById('raiz')!).render(
  <ToastProvider>
    <App />
    <AvisoNovaVersao />
  </ToastProvider>,
);
