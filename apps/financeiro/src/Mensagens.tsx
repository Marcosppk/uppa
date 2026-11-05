import { useEffect, useState } from 'react';
import { Estado, Icone, ir, useDados } from '@shared/ui';
import { Avatar } from '@shared/Foto';
import type { Socio } from '@shared/tipos';
import { api } from './api';

interface Linha {
  socio_id: number;
  nome: string;
  matricula: number | null;
  ultima: string;
  ultima_de: 'diretoria' | 'socio';
  quando: string;
  nao_lidas: number;
}

/** Caixa de mensagens privadas: uma conversa por sócio (a conversa abre na ficha do sócio). */
export function CaixaMensagens() {
  const { dados, erro } = useDados(() => api.get<Linha[]>('/admin/mensagens'));
  const [q, setQ] = useState('');
  const [achados, setAchados] = useState<Socio[]>([]);
  useEffect(() => {
    if (q.trim().length < 2) return setAchados([]);
    const t = setTimeout(() => api.get<Socio[]>(`/admin/socios?q=${encodeURIComponent(q)}`).then((l) => setAchados(l.slice(0, 6))), 250);
    return () => clearTimeout(t);
  }, [q]);
  const abrir = (id: number) => ir(`/socios/${id}?aba=mensagens`);

  return (
    <>
      <div className="topo">
        <h1>Mensagens</h1>
      </div>
      <p className="muted">Mensagens privadas entre a diretoria e cada sócio. Só o sócio e a equipe do Financeiro veem.</p>

      <div className="card stack" style={{ marginBottom: 12 }}>
        <label className="busca">
          <Icone nome="busca" />
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Escrever para um sócio: busque pelo nome, CPF ou matrícula" aria-label="Buscar sócio para escrever" />
        </label>
        {achados.length > 0 && (
          <ul className="list">
            {achados.map((s) => (
              <li key={s.id} className="click" onClick={() => abrir(s.id)}>
                <Avatar nome={s.nome} foto={s.foto} />
                <span className="sp">
                  <b>{s.nome}</b>
                  <span className="muted small">{s.matricula ? ` · matrícula ${s.matricula}` : ''}</span>
                </span>
                <Icone nome="seta" />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        {!dados ? (
          <Estado erro={erro} />
        ) : dados.length === 0 ? (
          <div className="empty">Nenhuma conversa ainda. Busque um sócio acima para mandar a primeira mensagem.</div>
        ) : (
          <ul className="list">
            {dados.map((c) => (
              <li key={c.socio_id} className="click" onClick={() => abrir(c.socio_id)}>
                <Avatar nome={c.nome} />
                <div className="sp" style={{ minWidth: 0 }}>
                  <b>{c.nome}</b>
                  <div className="muted small" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.ultima_de === 'diretoria' ? 'Você: ' : ''}
                    {c.ultima}
                  </div>
                </div>
                <span className="muted small">{new Date(c.quando).toLocaleDateString('pt-BR')}</span>
                {c.nao_lidas > 0 && (
                  <span className="selo-numero" aria-label={`${c.nao_lidas} não lida(s)`}>
                    {c.nao_lidas}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
