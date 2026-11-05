import { createRoot } from 'react-dom/client';
import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import '@shared/estilo.css';
import './app.css';
import { ToastProvider, useRota, Icone, Carregando, ir } from '@shared/ui';
import { api, type Eu } from './api';
import { Boasvindas } from './Boasvindas';
// As telas de dentro do app carregam só quando abertas: a tela de entrada fica bem mais leve.
const Inicio = lazy(() => import('./Inicio').then((m) => ({ default: m.Inicio })));
const Carteirinha = lazy(() => import('./Carteirinha').then((m) => ({ default: m.Carteirinha })));
const Verificar = lazy(() => import('./Carteirinha').then((m) => ({ default: m.Verificar })));
const MinhasMensalidades = lazy(() => import('./MinhasMensalidades').then((m) => ({ default: m.MinhasMensalidades })));
const MeusDados = lazy(() => import('./MeusDados').then((m) => ({ default: m.MeusDados })));
const Sala = lazy(() => import('./acolhimento/Sala').then((m) => ({ default: m.Sala })));
const Jogo = lazy(() => import('./acolhimento/Sala').then((m) => ({ default: m.Jogo })));
import { AvisoNovaVersao, VERSAO } from '@shared/versao';
import { passosAssociados } from './tour';
// Tour do primeiro acesso e "o que há de novo": só baixados quando há algo a mostrar.
const Recepcao = lazy(() => import('@shared/Recepcao'));
import { aplicarCampanha } from '@shared/campanhas';
const Agenda = lazy(() => import('./Agenda').then((m) => ({ default: m.Agenda })));
const Mensagens = lazy(() => import('./Mensagens').then((m) => ({ default: m.Mensagens })));
import { aplicarPreferencias, PularParaConteudo } from '@shared/acessibilidade';

aplicarPreferencias();
// Aberto como "/associados" (sem a barra): acerta o endereço sem recarregar — os links "#/…" contam com a barra.
if (location.pathname === '/associados') history.replaceState(null, '', `/associados/${location.search}${location.hash}`);
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
  const [recepcaoFeita, setRecepcaoFeita] = useState(false);
  const [refazerTour, setRefazerTour] = useState(false);
  // "Fazer o tour do app de novo" (Meus dados → Sobre o app).
  useEffect(() => {
    const tour = () => {
      ir('/');
      setRefazerTour(true);
      setRecepcaoFeita(false);
    };
    window.addEventListener('uppa-tour', tour);
    return () => window.removeEventListener('uppa-tour', tour);
  }, []);

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
  if (base === 'verificar')
    return (
      <Suspense fallback={<Carregando />}>
        <Verificar codigo={param ?? ''} />
      </Suspense>
    );

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
        <Suspense fallback={<Carregando />}>
          <Jogo key={param} id={param} />
        </Suspense>
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
      {!recepcaoFeita && (refazerTour || !eu.socio.tour_visto || eu.socio.versao_vista !== VERSAO) && (
        <Suspense fallback={null}>
          <Recepcao
            key={String(refazerTour)}
            tourVisto={!!eu.socio.tour_visto}
            versaoVista={eu.socio.versao_vista}
            refazerTour={refazerTour}
            passos={passosAssociados(eu.socio.nome)}
            marcar={(v) => api.post('/associado/visto', v)}
            aoFim={() => {
              setRecepcaoFeita(true);
              setRefazerTour(false);
            }}
          />
        </Suspense>
      )}
      <main className="app" id="conteudo" tabIndex={-1}>
        <Suspense fallback={<Carregando />}>{pagina}</Suspense>
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
