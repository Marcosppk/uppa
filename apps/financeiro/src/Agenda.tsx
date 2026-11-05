import { useState } from 'react';
import { Calendario } from '@shared/Calendario';
import { Campo, Icone, Modal, useAcao } from '@shared/ui';
import type { DataDoMes, Evento } from '@shared/tipos';
import { api } from './api';
import { CampoData } from '@shared/CampoData';

type Rascunho = Partial<Evento>;

/** Calendário da associação: a equipe cadastra os eventos; os publicados aparecem no app dos sócios. */
export function Agenda() {
  const [editando, setEditando] = useState<Rascunho | null>(null);
  const [versao, setVersao] = useState(0);
  const { ocupado, rodar } = useAcao();
  const novo = (): Rascunho => ({ titulo: '', data: new Date().toLocaleDateString('sv-SE'), hora_inicio: '', hora_fim: '', local: '', descricao: '', publicado: 1 });
  const salvar = () =>
    rodar(() => (editando!.id ? api.put(`/admin/eventos/${editando!.id}`, editando) : api.post('/admin/eventos', editando)), 'Evento salvo.').then((ok) => {
      if (ok) {
        setEditando(null);
        setVersao((v) => v + 1);
      }
    });
  const set = (k: keyof Evento, v: string | number) => setEditando({ ...editando!, [k]: v });

  return (
    <>
      <div className="topo">
        <h1>Agenda</h1>
      </div>
      <p className="muted">Reuniões, oficinas, palestras e eventos. Os publicados aparecem no calendário do app UPPA Associados, junto com as datas da causa autista.</p>
      <Calendario
        key={versao}
        carregar={(mes) => api.get<{ eventos: Evento[]; datas: DataDoMes[] }>(`/admin/agenda?mes=${mes}`)}
        topo={
          <button className="btn" onClick={() => setEditando(novo())}>
            <Icone nome="mais" /> Novo evento
          </button>
        }
        acoesEvento={(e) => (
          <>
            <button className="btn ghost sm" onClick={() => setEditando({ ...e, hora_inicio: e.hora_inicio ?? '', hora_fim: e.hora_fim ?? '', local: e.local ?? '', descricao: e.descricao ?? '' })}>
              Editar
            </button>
            <button
              className="btn ghost sm"
              disabled={ocupado}
              onClick={() => confirm(`Excluir o evento "${e.titulo}"?`) && rodar(() => api.del(`/admin/eventos/${e.id}`), 'Evento excluído.').then((ok) => ok && setVersao((v) => v + 1))}
            >
              Excluir
            </button>
          </>
        )}
      />
      {editando && (
        <Modal titulo={editando.id ? 'Editar evento' : 'Novo evento'} aoFechar={() => setEditando(null)}>
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              salvar();
            }}
          >
            <Campo rotulo="Título">
              <input className="input" value={editando.titulo ?? ''} onChange={(e) => set('titulo', e.target.value)} required maxLength={120} placeholder="Ex.: Reunião de famílias" />
            </Campo>
            <div className="grid2">
              <Campo rotulo="Data">
                <CampoData valor={editando.data} aoMudar={(v) => set('data', v)} required />
              </Campo>
              <Campo rotulo="Local">
                <input className="input" value={editando.local ?? ''} onChange={(e) => set('local', e.target.value)} maxLength={200} placeholder="Ex.: Sede da UPPA" />
              </Campo>
              <Campo rotulo="Começa às (opcional)">
                <input className="input" type="time" value={editando.hora_inicio ?? ''} onChange={(e) => set('hora_inicio', e.target.value)} />
              </Campo>
              <Campo rotulo="Termina às (opcional)">
                <input className="input" type="time" value={editando.hora_fim ?? ''} onChange={(e) => set('hora_fim', e.target.value)} />
              </Campo>
            </div>
            <Campo rotulo="Descrição (opcional)" ajuda="Links escritos aqui viram clicáveis no app.">
              <textarea className="input" rows={4} value={editando.descricao ?? ''} onChange={(e) => set('descricao', e.target.value)} maxLength={3000} />
            </Campo>
            <label className="check">
              <input type="checkbox" checked={!!editando.publicado} onChange={(e) => set('publicado', e.target.checked ? 1 : 0)} />
              <span>Mostrar no calendário do app dos sócios</span>
            </label>
            <div className="acoes">
              <button className="btn" disabled={ocupado}>
                Salvar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
