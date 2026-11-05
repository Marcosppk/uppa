import { createRoot } from 'react-dom/client';
import { useEffect, useState } from 'react';
import '@shared/estilo.css';
import './app.css';
import { ToastProvider, useRota, Icone, Logo, Carregando, ir } from '@shared/ui';
import { api, type Usuario } from './api';
import { Entrar } from './Entrar';
import { Painel } from './Painel';
import { Socios } from './Socios';
import { FichaSocio } from './FichaSocio';
import { Mensalidades } from './Mensalidades';
import { Caixa } from './Caixa';
import { Avisos } from './Avisos';
import { Config } from './Config';
import { Agenda } from './Agenda';
import { CaixaMensagens } from './Mensagens';
import { aplicarCampanha, campanhaDoMes, Laco } from '@shared/campanhas';
import { AvisoNovaVersao, VERSAO } from '@shared/versao';
import { aplicarPreferencias, PularParaConteudo } from '@shared/acessibilidade';

aplicarPreferencias();
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
          <span>{usuario.nome}</span>
          <span className="muted small">Versão {VERSAO}</span>
          {document.documentElement.dataset.campanha && <span className="selo-campanha">
              <Laco cor={campanhaDoMes().cor} tamanho={18} /> {campanhaDoMes().nome}
            </span>}
          <button className="btn ghost sm" onClick={sair}>
            <Icone nome="sair" /> Sair
          </button>
        </div>
      </aside>
      <main className="conteudo" id="conteudo" tabIndex={-1}>
        {pagina}
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
