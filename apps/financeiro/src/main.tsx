import { createRoot } from 'react-dom/client';
import { lazy, Suspense, useEffect, useState } from 'react';
import '@shared/estilo.css';
import './app.css';
import { ToastProvider, useRota, Icone, Logo, Carregando, ir } from '@shared/ui';
import { api, nomePapel, podeTudo, type Usuario } from './api';
import { Entrar } from './Entrar';
// As telas carregam só quando abertas: a tela de entrada fica bem mais leve.
const Painel = lazy(() => import('./Painel').then((m) => ({ default: m.Painel })));
const Socios = lazy(() => import('./Socios').then((m) => ({ default: m.Socios })));
const FichaSocio = lazy(() => import('./FichaSocio').then((m) => ({ default: m.FichaSocio })));
const Mensalidades = lazy(() => import('./Mensalidades').then((m) => ({ default: m.Mensalidades })));
const Caixa = lazy(() => import('./Caixa').then((m) => ({ default: m.Caixa })));
const Avisos = lazy(() => import('./Avisos').then((m) => ({ default: m.Avisos })));
const Config = lazy(() => import('./Config').then((m) => ({ default: m.Config })));
// Telas menos usadas carregam só quando abertas.
const Agenda = lazy(() => import('./Agenda').then((m) => ({ default: m.Agenda })));
const Cracha = lazy(() => import('./Cracha').then((m) => ({ default: m.Cracha })));
const CaixaMensagens = lazy(() => import('./Mensagens').then((m) => ({ default: m.CaixaMensagens })));
import { aplicarCampanha, campanhaDoMes, Laco } from '@shared/campanhas';
import { AvisoNovaVersao, VERSAO } from '@shared/versao';
import { passosFinanceiro } from './tour';
// Tour do primeiro acesso e "o que há de novo": só baixados quando há algo a mostrar.
const Recepcao = lazy(() => import('@shared/Recepcao'));
import { aplicarPreferencias, PularParaConteudo } from '@shared/acessibilidade';

aplicarPreferencias();
// Aberto como "/financeiro" (sem a barra): acerta o endereço sem recarregar — os links "#/…" contam com a barra.
if (location.pathname === '/financeiro') history.replaceState(null, '', `/financeiro/${location.search}${location.hash}`);
// Cor da campanha do mês (a diretoria pode desligar em Ajustes).
const campanhaLigada = () => api.get<{ campanhas: boolean }>('/publico/config').then((c) => aplicarCampanha(c.campanhas)).catch(() => aplicarCampanha(true));
aplicarCampanha(true);
campanhaLigada();

const MENU = [
  { r: '/', ico: 'inicio', t: 'Painel' },
  { r: '/socios', ico: 'socios', t: 'Sócios' },
  { r: '/mensalidades', ico: 'mensal', t: 'Mensalidades' },
  { r: '/caixa', ico: 'caixa', t: 'Caixa' },
  { r: '/avisos', ico: 'avisos', t: 'Avisos' },
  { r: '/mensagens', ico: 'mensagem', t: 'Mensagens' },
  { r: '/agenda', ico: 'agenda', t: 'Agenda' },
  { r: '/config', ico: 'config', t: 'Ajustes' },
];

function App() {
  const rota = useRota();
  const [usuario, setUsuario] = useState<Usuario | null | undefined>(api.token() ? undefined : null);
  const [recepcaoFeita, setRecepcaoFeita] = useState(false);
  const [refazerTour, setRefazerTour] = useState(false);
  // "Fazer o tour do app de novo" (Ajustes → Sobre o app).
  useEffect(() => {
    const tour = () => {
      ir('/');
      setRefazerTour(true);
      setRecepcaoFeita(false);
    };
    window.addEventListener('uppa-tour', tour);
    return () => window.removeEventListener('uppa-tour', tour);
  }, []);

  useEffect(() => {
    if (api.token()) api.get<Usuario>('/admin/me').then(setUsuario).catch(() => setUsuario(null));
    const sair = () => setUsuario(null);
    window.addEventListener('uppa-sair', sair);
    return () => window.removeEventListener('uppa-sair', sair);
  }, []);

  if (usuario === undefined) return <Carregando />;
  if (!usuario) return <Entrar aoEntrar={setUsuario} />;

  const sair = async () => {
    await api.post('/admin/sair').catch(() => {});
    api.gravarToken(null);
    setUsuario(null);
    ir('/');
  };

  const [caminho, consulta] = rota.split('?');
  const [base, id] = caminho.split('/').filter(Boolean);
  const ativo = (r: string) => (r === '/' ? caminho === '/' : caminho.startsWith(r));

  let pagina;
  if (!base) pagina = <Painel />;
  else if (base === 'socios' && id) pagina = <FichaSocio key={id} id={id} usuario={usuario} abaInicial={new URLSearchParams(consulta).get('aba') ?? undefined} />;
  else if (base === 'socios') pagina = <Socios key={consulta} statusInicial={new URLSearchParams(consulta).get('status') ?? ''} />;
  else if (base === 'mensalidades') pagina = <Mensalidades />;
  else if (base === 'caixa') pagina = <Caixa />;
  else if (base === 'avisos') pagina = <Avisos />;
  else if (base === 'mensagens') pagina = <CaixaMensagens />;
  else if (base === 'agenda') pagina = <Agenda />;
  else if (base === 'cracha') pagina = <Cracha key={id ?? 'eu'} usuario={usuario} id={id ? Number(id) : undefined} />;
  else if (base === 'config') pagina = <Config usuario={usuario} aoSair={sair} aoMudarCampanha={campanhaLigada} />;
  else pagina = <Painel />;

  return (
    <div className="shell">
      <PularParaConteudo />
      <aside className="side">
        <div className="marca">
          <Logo tamanho={48} />
          <div>
            <b>UPPA</b>
            <span>Financeiro</span>
          </div>
        </div>
        <nav aria-label="Menu principal">
          {MENU.map((m) => (
            <a key={m.r} href={`#${m.r}`} aria-current={ativo(m.r) ? 'page' : undefined}>
              <Icone nome={m.ico} /> {m.t}
            </a>
          ))}
        </nav>
        <div className="quem">
          <a className="quem-nome" href="#/cracha" title="Ver meu crachá">
            <span>{usuario.nome}</span>
            <span className="muted small">{nomePapel(usuario.papel)} · meu crachá</span>
          </a>
          <span className="muted small">Versão {VERSAO}</span>
          {document.documentElement.dataset.campanha && <span className="selo-campanha">
              <Laco cor={campanhaDoMes().cor} tamanho={18} /> {campanhaDoMes().nome}
            </span>}
          <button className="btn ghost sm" onClick={sair}>
            <Icone nome="sair" /> Sair
          </button>
        </div>
      </aside>
      {!recepcaoFeita && (refazerTour || !usuario.tour_visto || usuario.versao_vista !== VERSAO) && (
        <Suspense fallback={null}>
          <Recepcao
            key={String(refazerTour)}
            tourVisto={!!usuario.tour_visto}
            versaoVista={usuario.versao_vista}
            refazerTour={refazerTour}
            passos={passosFinanceiro(usuario.nome, podeTudo(usuario))}
            marcar={(v) => api.post('/admin/visto', v)}
            aoFim={() => {
              setRecepcaoFeita(true);
              setRefazerTour(false);
            }}
          />
        </Suspense>
      )}
      <main className="conteudo" id="conteudo" tabIndex={-1}>
        <Suspense fallback={<Carregando />}>{pagina}</Suspense>
      </main>
      <nav className="tabbar" aria-label="Menu principal">
        {MENU.map((m) => (
          <a key={m.r} href={`#${m.r}`} aria-current={ativo(m.r) ? 'page' : undefined}>
            <Icone nome={m.ico} className="" />
            {m.t}
          </a>
        ))}
      </nav>
    </div>
  );
}

createRoot(document.getElementById('raiz')!).render(
  <ToastProvider>
    <App />
    <AvisoNovaVersao />
  </ToastProvider>,
);
