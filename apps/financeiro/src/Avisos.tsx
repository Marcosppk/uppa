import { useState } from 'react';
import { useDados, Estado, Icone, Modal, Campo, useAcao, useToast } from '@shared/ui';
import { dataBr } from '@shared/formato';
import type { Anexo, Aviso } from '@shared/tipos';
import { AnexosAviso, ACEITOS, MAX_ARQUIVO, MAX_VIDEO, ehVideo, prepararArquivo, tamanhoArquivo } from '@shared/Anexos';
import { TextoAviso } from '@shared/TextoAviso';
import { api } from './api';

const MAX_ANEXOS = 8;

export function Avisos() {
  const { dados, erro, recarregar } = useDados(() => api.get<Aviso[]>('/admin/avisos'));
  const [editando, setEditando] = useState<Partial<Aviso> | null>(null);
  const [novos, setNovos] = useState<File[]>([]);
  const { ocupado, rodar } = useAcao();
  const toast = useToast();

  const abrir = (a: Partial<Aviso>) => {
    setNovos([]);
    setEditando(a);
  };

  const removerAnexo = (a: Anexo) => {
    if (!editando?.id || !confirm(`Remover o anexo "${a.nome}"?`)) return;
    rodar(() => api.del(`/admin/avisos/${editando.id}/anexos/${a.id}`), 'Anexo removido.').then((ok) => {
      if (ok) {
        setEditando({ ...editando, anexos: editando.anexos?.filter((x) => x.id !== a.id) });
        recarregar();
      }
    });
  };

  const salvar = () =>
    rodar(async () => {
      const aviso = editando!;
      let id = aviso.id;
      if (id) await api.put(`/admin/avisos/${id}`, aviso);
      else {
        id = (await api.post<{ id: number }>('/admin/avisos', aviso)).id;
        setEditando({ ...aviso, id, anexos: [] });
      }
      // Os anexos vão um por um. Se algum for recusado, o aviso já fica salvo e só os recusados continuam na lista.
      const recusados: File[] = [];
      const motivos: string[] = [];
      for (const f of novos) {
        const { arquivo, nome } = await prepararArquivo(f);
        await api.enviarArquivo(`/admin/avisos/${id}/anexos`, arquivo, nome).catch((e: Error) => {
          recusados.push(f);
          motivos.push(e.message);
        });
      }
      setNovos(recusados);
      if (recusados.length) {
        recarregar();
        throw new Error(`Aviso salvo, mas ${recusados.length === 1 ? 'um anexo não entrou' : `${recusados.length} anexos não entraram`}: ${motivos.join(' ')}`);
      }
    }, 'Aviso salvo.').then((ok) => {
      if (ok) {
        setEditando(null);
        recarregar();
      }
    });

  const totalAnexos = (editando?.anexos?.length ?? 0) + novos.length;

  return (
    <>
      <div className="topo">
        <h1>Avisos</h1>
        <button className="btn" onClick={() => abrir({ titulo: '', texto: '', publicado: 1 })}>
          <Icone nome="mais" /> Novo aviso
        </button>
      </div>
      <p className="muted">Os avisos publicados aparecem na tela inicial do app UPPA Associados. Dá para anexar imagens e arquivos de texto.</p>
      {!dados ? (
        <Estado erro={erro} />
      ) : dados.length === 0 ? (
        <div className="card empty">Nenhum aviso ainda. Use para reuniões, eventos, campanhas e lembretes.</div>
      ) : (
        dados.map((a) => (
          <div key={a.id} className="card">
            <div className="row between">
              <h3 style={{ margin: 0 }}>{a.titulo}</h3>
              <span className={`tag ${a.publicado ? 'ok' : ''}`}>{a.publicado ? 'Publicado' : 'Rascunho'}</span>
            </div>
            <p className="muted small">{dataBr(a.criado_em)}</p>
            <TextoAviso texto={a.texto} />
            <AnexosAviso anexos={a.anexos} />
            <div className="acoes" style={{ marginTop: 10 }}>
              <button className="btn sec sm" onClick={() => abrir(a)}>
                Editar
              </button>
              <button className="btn ghost sm" disabled={ocupado} onClick={() => confirm('Excluir este aviso e os anexos dele?') && rodar(() => api.del(`/admin/avisos/${a.id}`), 'Aviso excluído.').then(recarregar)}>
                Excluir
              </button>
            </div>
          </div>
        ))
      )}
      {editando && (
        <Modal titulo={editando.id ? 'Editar aviso' : 'Novo aviso'} aoFechar={() => setEditando(null)}>
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              salvar();
            }}
          >
            <Campo rotulo="Título">
              <input className="input" value={editando.titulo ?? ''} onChange={(e) => setEditando({ ...editando, titulo: e.target.value })} required autoFocus />
            </Campo>
            <Campo rotulo="Texto">
              <textarea className="input" rows={6} value={editando.texto ?? ''} onChange={(e) => setEditando({ ...editando, texto: e.target.value })} required />
            </Campo>

            <div className="stack" style={{ gap: 8 }}>
              <b>Anexos</b>
              <AnexosAviso anexos={editando.anexos} aoRemover={removerAnexo} />
              {novos.map((f, i) => (
                <div key={`${f.name}-${i}`} className="anexo-novo">
                  <span aria-hidden="true">{f.type.startsWith('image/') ? '🖼️' : ehVideo(f) ? '🎬' : '📄'}</span>
                  <span className="sp">{f.name}</span>
                  <span className="muted small">{tamanhoArquivo(f.size)}</span>
                  <button type="button" className="btn ghost sm" onClick={() => setNovos(novos.filter((_, j) => j !== i))}>
                    Tirar
                  </button>
                </div>
              ))}
              {totalAnexos < MAX_ANEXOS && (
                <label className="btn sec sm" style={{ justifySelf: 'start', cursor: 'pointer' }}>
                  <Icone nome="mais" /> Anexar imagem, vídeo ou arquivo
                  <input
                    type="file"
                    accept={ACEITOS}
                    multiple
                    hidden
                    onChange={(e) => {
                      const lista = Array.from(e.target.files ?? []);
                      // Fotos JPG/PNG/WEBP grandes são reduzidas antes do envio; vídeos vão até 60 MB e os demais até 10 MB.
                      const grandes = lista.filter((f) => (ehVideo(f) ? f.size > MAX_VIDEO : f.size > MAX_ARQUIVO && !/^image\/(jpeg|png|webp)$/.test(f.type)));
                      if (grandes.length) toast(`Grande demais (máximo de 10 MB; vídeos até 60 MB): ${grandes.map((f) => f.name).join(', ')}`);
                      setNovos([...novos, ...lista.filter((f) => !grandes.includes(f))].slice(0, MAX_ANEXOS - (editando.anexos?.length ?? 0)));
                      e.target.value = '';
                    }}
                  />
                </label>
              )}
              <span className="muted small">Imagens (JPG, PNG, WEBP, GIF), vídeos (MP4, MOV, WEBM, até 60 MB) e textos (PDF, DOC, DOCX, ODT, RTF, TXT, até 10 MB), {MAX_ANEXOS} por aviso. Fotos grandes são reduzidas antes de enviar. Links escritos no texto viram clicáveis, e vídeos do YouTube tocam no mural.</span>
            </div>

            <label className="check">
              <input type="checkbox" checked={!!editando.publicado} onChange={(e) => setEditando({ ...editando, publicado: e.target.checked ? 1 : 0 })} />
              <span>Publicar no app dos associados</span>
            </label>
            <div className="acoes">
              <button className="btn" disabled={ocupado}>
                {ocupado ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
