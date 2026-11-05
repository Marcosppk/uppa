import { useState } from 'react';
import { useDados, Estado, ir } from '@shared/ui';
import { dataBr, primeiroNome } from '@shared/formato';
import { api } from './api';

interface Aniversariante {
  tipo: 'socio' | 'autista';
  nome: string;
  socio_id: number;
  socio_nome: string;
  matricula: number | null;
  telefone: string | null;
  data: string;
  faltam: number;
  idade: number;
  whatsapp: string | null;
}

interface DataDaCausa {
  titulo: string;
  emoji: string;
  data: string;
  hoje: boolean;
  aviso_publicado: boolean;
}

const quando = (a: Aniversariante) => (a.faltam === 0 ? 'Hoje' : a.faltam === 1 ? 'Amanhã' : dataBr(a.data).slice(0, 5));

/** Rotina de parabéns: aniversariantes com a mensagem pronta para o WhatsApp e as datas da causa com aviso automático. */
export function Aniversariantes() {
  const [dias, setDias] = useState(7);
  const { dados, erro } = useDados(() => api.get<{ lista: Aniversariante[]; datas: DataDaCausa[] }>(`/admin/aniversariantes?dias=${dias}`), [dias]);

  return (
    <div className="card stack" style={{ marginTop: 12 }}>
      <div className="row between">
        <h3 style={{ margin: 0 }}>🎂 Aniversariantes</h3>
        <div className="seg">
          <button aria-pressed={dias === 7} onClick={() => setDias(7)}>
            7 dias
          </button>
          <button aria-pressed={dias === 31} onClick={() => setDias(31)}>
            30 dias
          </button>
        </div>
      </div>

      {!dados ? (
        <Estado erro={erro} />
      ) : dados.lista.length === 0 ? (
        <div className="empty">Nenhum aniversário nos próximos {dias === 7 ? '7' : '30'} dias.</div>
      ) : (
        <ul className="list">
          {dados.lista.map((a) => (
            <li key={`${a.tipo}-${a.socio_id}-${a.nome}`}>
              <span className={a.faltam === 0 ? 'tag ok' : 'tag'} style={{ minWidth: 64, textAlign: 'center' }}>
                {quando(a)}
              </span>
              <div className="sp" style={{ cursor: 'pointer' }} onClick={() => ir(`/socios/${a.socio_id}`)}>
                <b>{a.nome}</b>
                <div className="muted small">
                  {a.tipo === 'socio' ? 'Sócio(a)' : `Pessoa autista · família de ${primeiroNome(a.socio_nome)}`} · {a.faltam === 0 ? 'completa' : 'vai completar'} {a.idade} {a.idade === 1 ? 'ano' : 'anos'}
                </div>
              </div>
              {a.whatsapp ? (
                <a className={a.faltam === 0 ? 'btn ok sm' : 'btn sec sm'} href={a.whatsapp} target="_blank" rel="noreferrer" title={`Mandar parabéns para ${a.tipo === 'socio' ? a.nome : a.socio_nome} pelo WhatsApp`}>
                  WhatsApp
                </a>
              ) : (
                <span className="muted small">sem telefone</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {dados && (
        <div className="small muted">
          <b>Datas da causa:</b> o aviso de parabéns é publicado sozinho para todos os associados no próprio dia.
          <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
            {dados.datas.map((d) => (
              <li key={d.titulo}>
                {d.emoji} {dataBr(d.data).slice(0, 5)} — {d.titulo}
                {d.hoje && (d.aviso_publicado ? ' · aviso publicado hoje' : ' · publicando…')}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="muted small" style={{ margin: 0 }}>
        No dia, o sócio também vê os parabéns na tela inicial do app Associados. Os aniversários vêm da data de nascimento do sócio e das pessoas autistas da família.
      </p>
    </div>
  );
}
