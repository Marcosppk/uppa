import { useDados, Estado } from '@shared/ui';
import { dinheiro, mesExtenso, mesCurto, mudarMes } from '@shared/formato';
import { CATEGORIAS, rotulo } from '@shared/opcoes.js';
import { api } from './api';
import { Aniversariantes } from './Aniversariantes';

interface DadosPainel {
  competencia: string;
  socios: Record<string, number>;
  mes: { recebido: number; em_aberto: number; pagas: number; abertas: number; isentas: number };
  saldo: number;
  meses: { mes: string; receitas: number; despesas: number }[];
  categorias: { categoria: string | null; n: number }[];
  informadas: number;
  causa: { titulo: string; emoji: string }[];
  mensagens: number;
}

export function Painel() {
  const { dados: d, erro } = useDados(() => api.get<DadosPainel>('/admin/painel'));
  if (!d) return <Estado erro={erro} />;

  const ultimos = Array.from({ length: 6 }, (_, i) => mudarMes(d.competencia, i - 5));
  const porMes = new Map(d.meses.map((m) => [m.mes, m]));
  const maximo = Math.max(1, ...d.meses.flatMap((m) => [m.receitas, m.despesas]));
  const totalMes = (d.mes.pagas ?? 0) + (d.mes.abertas ?? 0);
  const ativos = d.socios.ativo ?? 0;

  return (
    <>
      <div className="topo">
        <h1>Painel</h1>
        <span className="muted">
          {mesExtenso(d.competencia)}
        </span>
      </div>

      {d.causa.map((c) => (
        <div key={c.titulo} className="alert info" style={{ marginBottom: 12 }}>
          {c.emoji} <b>Hoje é {c.titulo}.</b> O aviso de parabéns foi publicado automaticamente para todos os associados (dá para editar em Avisos).
        </div>
      ))}
      {(d.socios.pendente ?? 0) > 0 && (
        <a className="alert warn row" href="#/socios?status=pendente" style={{ textDecoration: 'none', marginBottom: 12 }}>
          <b>{d.socios.pendente}</b> inscrição(ões) nova(s) pelo app Associados aguardando aprovação →
        </a>
      )}
      {d.mensagens > 0 && (
        <a className="alert row" href="#/mensagens" style={{ textDecoration: 'none', marginBottom: 12 }}>
          ✉️ <b>{d.mensagens}</b> {d.mensagens === 1 ? 'mensagem nova de sócio' : 'mensagens novas de sócios'} — responder →
        </a>
      )}
      {d.informadas > 0 && (
        <a className="alert row" href="#/mensalidades" style={{ textDecoration: 'none', marginBottom: 12 }}>
          <b>{d.informadas}</b> sócio(s) informaram pagamento pelo app — confira e dê baixa →
        </a>
      )}

      <div className="grid-cards">
        <div className="card stat">
          <span className="l">Saldo em caixa</span>
          <span className="v" style={{ color: d.saldo < 0 ? 'var(--bad)' : undefined }}>
            {dinheiro(d.saldo)}
          </span>
        </div>
        <div className="card stat">
          <span className="l">Recebido no mês</span>
          <span className="v">{dinheiro(d.mes.recebido)}</span>
          <span className="l">{d.mes.pagas ?? 0} mensalidades pagas</span>
        </div>
        <div className="card stat">
          <span className="l">Em aberto no mês</span>
          <span className="v">{dinheiro(d.mes.em_aberto)}</span>
          <span className="l">{d.mes.abertas ?? 0} mensalidades</span>
        </div>
        <div className="card stat">
          <span className="l">Sócios ativos</span>
          <span className="v">{ativos}</span>
          <span className="l">
            {d.socios.inativo ?? 0} inativos · {d.mes.isentas ?? 0} isentos
          </span>
        </div>
      </div>

      <div className="grid2" style={{ marginTop: 12 }}>
        <div className="card">
          <div className="row between">
            <h3>Receitas e despesas</h3>
            <div className="legend">
              <span>
                <i style={{ background: 'var(--ok)' }} />
                Receitas
              </span>
              <span>
                <i style={{ background: 'var(--bad)' }} />
                Despesas
              </span>
            </div>
          </div>
          <div className="bars" style={{ marginTop: 12 }}>
            {ultimos.map((m) => {
              const v = porMes.get(m);
              return (
                <div className="b" key={m} title={`${mesCurto(m)}: receitas ${dinheiro(v?.receitas)}, despesas ${dinheiro(v?.despesas)}`}>
                  <i className="rec" style={{ height: `${((v?.receitas ?? 0) / maximo) * 100}%` }} />
                  <i className="des" style={{ height: `${((v?.despesas ?? 0) / maximo) * 100}%` }} />
                </div>
              );
            })}
          </div>
          <div className="bars-l">
            {ultimos.map((m) => (
              <span key={m}>{mesCurto(m)}</span>
            ))}
          </div>
        </div>

        <div className="card stack">
          <h3>Adimplência do mês</h3>
          <div>
            <div className="row between small">
              <span>{totalMes ? Math.round(((d.mes.pagas ?? 0) / totalMes) * 100) : 0}% pagas</span>
              <span className="muted">
                {d.mes.pagas ?? 0} de {totalMes}
              </span>
            </div>
            <div className="meter" style={{ marginTop: 6 }}>
              <i style={{ width: `${totalMes ? ((d.mes.pagas ?? 0) / totalMes) * 100 : 0}%` }} />
            </div>
          </div>
          <h3 style={{ marginTop: 8 }}>Sócios ativos por categoria</h3>
          <ul className="list">
            {d.categorias
              .sort((a, b) => b.n - a.n)
              .map((c) => (
                <li key={c.categoria ?? '-'}>
                  <span className="sp">{c.categoria ? rotulo(CATEGORIAS, c.categoria) : 'Sem categoria'}</span>
                  <b className="num">{c.n}</b>
                </li>
              ))}
          </ul>
        </div>
      </div>

      <Aniversariantes />
    </>
  );
}
