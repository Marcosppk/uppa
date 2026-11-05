// Calendário do mês: eventos da associação, datas da causa e aniversários (no app do sócio).
// Cada evento pode ir para a agenda do celular (.ics).
import { useState, type ReactNode } from 'react';
import { Estado, Icone, useDados } from './ui';
import { mesExtenso, mudarMes } from './formato';
import { campanhaDoMes, Laco } from './campanhas';
import { TextoAviso } from './TextoAviso';
import type { DataDoMes, Evento } from './tipos';

const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const hojeLocal = () => new Date().toLocaleDateString('sv-SE');
const mesAtual = () => hojeLocal().slice(0, 7);

const diaLongo = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
export const horario = (e: Evento) => (e.hora_inicio ? `${e.hora_inicio}${e.hora_fim ? `–${e.hora_fim}` : ''}` : 'dia todo');

/** Arquivo .ics: abre na agenda do celular ou do computador. */
export function baixarIcs(e: Evento) {
  const d = e.data.replace(/-/g, '');
  const h = (x: string) => `${x.replace(':', '')}00`;
  const fim = e.hora_fim ?? (e.hora_inicio ? `${String(Number(e.hora_inicio.slice(0, 2)) + 1).padStart(2, '0')}${e.hora_inicio.slice(2)}` : null);
  const proximoDia = new Date(`${e.data}T12:00:00`);
  proximoDia.setDate(proximoDia.getDate() + 1);
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, (c) => `\\${c}`);
  const linhas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//UPPA//Agenda//PT-BR',
    'BEGIN:VEVENT',
    `UID:uppa-evento-${e.id}@uppa`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
    ...(e.hora_inicio ? [`DTSTART;TZID=America/Boa_Vista:${d}T${h(e.hora_inicio)}`, `DTEND;TZID=America/Boa_Vista:${d}T${h(fim!)}`] : [`DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${proximoDia.toLocaleDateString('sv-SE').replace(/-/g, '')}`]),
    `SUMMARY:${esc(e.titulo)}`,
    ...(e.local ? [`LOCATION:${esc(e.local)}`] : []),
    ...(e.descricao ? [`DESCRIPTION:${esc(e.descricao)}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  const url = URL.createObjectURL(new Blob([linhas.join('\r\n')], { type: 'text/calendar;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: `uppa-${e.data}.ics` });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function Calendario({
  carregar,
  acoesEvento,
  topo,
}: {
  carregar: (mes: string) => Promise<{ eventos: Evento[]; datas: DataDoMes[] }>;
  /** Botões extras em cada evento (o Financeiro usa para editar). */
  acoesEvento?: (e: Evento) => ReactNode;
  topo?: ReactNode;
}) {
  const [mes, setMes] = useState(mesAtual());
  const [dia, setDia] = useState<string | null>(null);
  const { dados, erro } = useDados(() => carregar(mes), [mes]);
  const camp = campanhaDoMes(new Date(`${mes}-15T12:00:00`));

  const primeiro = new Date(`${mes}-01T12:00:00`);
  const diasNoMes = new Date(primeiro.getFullYear(), primeiro.getMonth() + 1, 0).getDate();
  const vazios = primeiro.getDay();
  const hoje = hojeLocal();
  const porDia = new Map<string, number>();
  for (const e of dados?.eventos ?? []) porDia.set(e.data, (porDia.get(e.data) ?? 0) + 1);
  const especiais = new Map((dados?.datas ?? []).map((d) => [d.data, d]));

  const eventos = (dados?.eventos ?? []).filter((e) => !dia || e.data === dia);
  const datas = (dados?.datas ?? []).filter((d) => !dia || d.data === dia);

  return (
    <div className="stack">
      <div className="row between">
        <div className="mes-nav" role="group" aria-label="Mês">
          <button className="btn ghost sm" onClick={() => (setMes(mudarMes(mes, -1)), setDia(null))} aria-label="Mês anterior">
            <Icone nome="voltar" />
          </button>
          <b aria-live="polite">{mesExtenso(mes)}</b>
          <button className="btn ghost sm" onClick={() => (setMes(mudarMes(mes, 1)), setDia(null))} aria-label="Próximo mês">
            <Icone nome="seta" />
          </button>
        </div>
        {topo}
      </div>
      <p className="muted small row" style={{ margin: 0, gap: 6 }}>
        <Laco cor={camp.cor} tamanho={20} /> {camp.nome} — {camp.tema}
      </p>

      <div className="card calendario" role="grid" aria-label={`Calendário de ${mesExtenso(mes)}`}>
        {SEMANA.map((s) => (
          <span key={s} className="cal-semana" role="columnheader">
            {s}
          </span>
        ))}
        {Array.from({ length: vazios }, (_, i) => (
          <span key={`v${i}`} />
        ))}
        {Array.from({ length: diasNoMes }, (_, i) => {
          const d = `${mes}-${String(i + 1).padStart(2, '0')}`;
          const n = porDia.get(d) ?? 0;
          const esp = especiais.get(d);
          const rotulo = `${diaLongo(d)}${n ? `, ${n} evento${n > 1 ? 's' : ''}` : ''}${esp ? `, ${esp.titulo}` : ''}`;
          return (
            <button key={d} role="gridcell" className={`cal-dia${d === hoje ? ' hoje' : ''}${d === dia ? ' escolhido' : ''}`} aria-label={rotulo} aria-pressed={d === dia} onClick={() => setDia(d === dia ? null : d)}>
              <span>{i + 1}</span>
              <span className="cal-marcas" aria-hidden="true">
                {n > 0 && <i className="cal-ponto" />}
                {esp && <small>{esp.emoji}</small>}
              </span>
            </button>
          );
        })}
      </div>

      {!dados ? (
        <Estado erro={erro} />
      ) : (
        <div className="stack">
          <h2 style={{ margin: 0 }}>{dia ? diaLongo(dia) : `Em ${mesExtenso(mes).toLowerCase()}`}</h2>
          {datas.map((d) => (
            <div key={`${d.data}${d.titulo}`} className="card row cal-data">
              <span aria-hidden="true" style={{ fontSize: '1.6rem' }}>
                {d.emoji}
              </span>
              <div className="sp">
                <b>{d.titulo}</b>
                <div className="muted small">{diaLongo(d.data)}</div>
              </div>
            </div>
          ))}
          {eventos.map((e) => (
            <article key={e.id} className="card stack evento">
              <div className="row between">
                <div>
                  <h3 style={{ margin: 0 }}>{e.titulo}</h3>
                  <div className="muted small">
                    {diaLongo(e.data)} · {horario(e)}
                    {e.local ? ` · ${e.local}` : ''}
                  </div>
                </div>
                {!e.publicado && <span className="tag">Rascunho</span>}
              </div>
              {e.descricao && <TextoAviso texto={e.descricao} />}
              <div className="row" style={{ gap: 8 }}>
                <button className="btn sec sm" onClick={() => baixarIcs(e)}>
                  <Icone nome="agenda" /> Adicionar à minha agenda
                </button>
                {acoesEvento?.(e)}
              </div>
            </article>
          ))}
          {datas.length === 0 && eventos.length === 0 && <div className="card empty">{dia ? 'Nada marcado neste dia.' : 'Nenhum evento neste mês.'}</div>}
        </div>
      )}
    </div>
  );
}
