import { useEffect, useState } from 'react';
import { useDados, Estado, Icone, TagSocio, ir, useAcao, Campo } from '@shared/ui';
import { FormSocio, LinksDocumentos, type DadosSocio } from '@shared/FormSocio';
import { dinheiro, mesExtenso, dataBr, competenciaAtual } from '@shared/formato';
import type { Documento, Mensagem, Socio } from '@shared/tipos';
import { EditorFoto } from '@shared/Foto';
import { Documentos } from '@shared/Documentos';
import { Conversa } from '@shared/Conversa';
import { api, podeAutorizar, podeTudo, type Usuario } from './api';
import { AcoesMensalidade, LinhaMensalidade } from './Baixa';

interface Cfg {
  valor_ate_2sm: string;
  valor_acima_2sm: string;
}

type Aba = 'cadastro' | 'mensalidades' | 'documentos' | 'mensagens';

export function FichaSocio({ id, usuario, abaInicial }: { id: string; usuario: Usuario; abaInicial?: string }) {
  const novo = id === 'novo';
  const [aba, setAba] = useState<Aba>(['mensalidades', 'documentos', 'mensagens'].includes(abaInicial ?? '') ? (abaInicial as Aba) : 'cadastro');
  const [form, setForm] = useState<DadosSocio | null>(novo ? { status: 'ativo', autistas: [] } : null);
  const { ocupado, rodar } = useAcao();
  const cfg = useDados(() => api.get<Cfg>('/admin/config')).dados;
  const { dados: socio, erro, recarregar } = useDados(() => (novo ? Promise.resolve(null) : api.get<Socio>(`/admin/socios/${id}`)), [id]);
  const [comp, setComp] = useState(competenciaAtual());

  useEffect(() => {
    if (socio) setForm(socio);
  }, [socio]);

  if (!novo && !socio) return <Estado erro={erro} />;
  if (!form) return <Estado />;
  const valores = cfg ? { ate2: Number(cfg.valor_ate_2sm), acima2: Number(cfg.valor_acima_2sm) } : undefined;

  const salvar = () =>
    rodar(async () => {
      if (novo) {
        const s = await api.post<Socio>('/admin/socios', form);
        ir(`/socios/${s.id}`);
      } else {
        await api.put(`/admin/socios/${id}`, form);
        recarregar();
      }
    }, 'Cadastro salvo.');

  return (
    <>
      <div className="topo">
        <button className="btn ghost sm" onClick={() => ir('/socios')} aria-label="Voltar">
          <Icone nome="voltar" />
        </button>
        <h1>{novo ? 'Novo sócio' : socio!.nome}</h1>
        {socio && <TagSocio status={socio.status} />}
      </div>

      {socio && (
        <div className="card stack" style={{ marginBottom: 12 }}>
          <EditorFoto
            nome={socio.nome}
            foto={socio.foto}
            texto="Foto do perfil e da carteirinha. O próprio sócio também pode mudar em Meus dados."
            enviar={(b) => api.enviarArquivo(`/admin/socios/${id}/foto`, b, 'foto.jpg', { metodo: 'PUT' })}
            remover={() => api.del(`/admin/socios/${id}/foto`)}
            aoMudar={recarregar}
          />
          <div className="row">
            <div className="sp small">
              {socio.matricula ? <b>Matrícula {socio.matricula}</b> : <b>Sem matrícula</b>} · inscrito em {dataBr(socio.inscrito_em)} ·{' '}
              {socio.isencao ? 'isento de mensalidade' : `mensalidade ${dinheiro(socio.valor_mensal)}`} · app Associados: {socio.tem_senha ? 'já criou a própria senha' : 'primeiro acesso com CPF + senha padrão 12345678'}
              {socio.convidado_por && <div>Inscrição pelo link de cadastro de <b>{socio.convidado_por}</b></div>}
            </div>
            {socio.status === 'pendente' &&
              (podeAutorizar(usuario) ? (
                <button className="btn ok" disabled={ocupado} onClick={() => rodar(() => api.post(`/admin/socios/${id}/aprovar`), 'Inscrição autorizada e matrícula gerada.').then(recarregar)}>
                  <Icone nome="check" /> Autorizar inscrição
                </button>
              ) : (
                <span className="tag warn">Aguardando autorização da diretoria</span>
              ))}
          </div>
          <LinksDocumentos texto={socio.documentos} />
        </div>
      )}

      {!novo && (
        <div className="seg" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
          <button aria-pressed={aba === 'cadastro'} onClick={() => setAba('cadastro')}>
            Cadastro
          </button>
          <button aria-pressed={aba === 'mensalidades'} onClick={() => setAba('mensalidades')}>
            Mensalidades {socio?.mensalidades?.some((m) => m.status === 'pendente' || m.status === 'informada') ? '•' : ''}
          </button>
          <button aria-pressed={aba === 'documentos'} onClick={() => setAba('documentos')}>
            Documentos {socio?.n_documentos ? `(${socio.n_documentos})` : ''}
          </button>
          <button aria-pressed={aba === 'mensagens'} onClick={() => setAba('mensagens')}>
            Mensagens
          </button>
        </div>
      )}

      {aba === 'documentos' ? (
        <Documentos
          explicacao="Laudos e documentos do sócio (enviados por ele no app ou pela equipe). Os links abrem por 15 minutos."
          carregar={() => api.get<Documento[]>(`/admin/socios/${id}/documentos`)}
          enviar={(b, nome, tipo, descricao) => api.enviarArquivo(`/admin/socios/${id}/documentos`, b, nome, { cabecalhos: { 'X-Tipo-Documento': tipo, 'X-Descricao': descricao } })}
          remover={(doc) => api.del(`/admin/socios/${id}/documentos/${doc}`).then(recarregar)}
        />
      ) : aba === 'mensagens' ? (
        <div className="card stack">
          <h2 style={{ margin: 0 }}>Mensagens privadas</h2>
          <p className="muted small" style={{ margin: 0 }}>
            Só {socio!.nome.split(' ')[0]} e a equipe do Financeiro veem esta conversa. A mensagem aparece no app do sócio, com aviso na tela inicial.
          </p>
          <Conversa
            souDiretoria
            carregar={() => api.get<Mensagem[]>(`/admin/socios/${id}/mensagens`)}
            enviar={(texto) => api.post(`/admin/socios/${id}/mensagens`, { texto })}
            vazio="Nenhuma mensagem ainda. Escreva abaixo para começar a conversa."
          />
        </div>
      ) : aba === 'cadastro' ? (
        <>
          <FormSocio valor={form} onChange={setForm} modo="admin" valores={valores} />
          <div className="row" style={{ marginTop: 16 }}>
            <button className="btn" disabled={ocupado} onClick={salvar}>
              Salvar cadastro
            </button>
            {socio && socio.tem_senha && (
              <button
                className="btn sec"
                disabled={ocupado}
                onClick={() =>
                  confirm('Voltar a senha do app Associados para a senha padrão 12345678? No próximo acesso o sócio terá que criar uma senha nova.') &&
                  rodar(() => api.post(`/admin/socios/${id}/redefinir-senha`), 'Senha voltou para a padrão 12345678.').then(recarregar)
                }
              >
                Voltar senha para a padrão
              </button>
            )}
            <span className="sp" />
            {socio && podeTudo(usuario) && (
              <button
                className="btn ghost"
                style={{ color: 'var(--bad)' }}
                disabled={ocupado}
                onClick={() => confirm(`Excluir ${socio.nome} e todo o histórico? Prefira marcar como Inativo.`) && rodar(() => api.del(`/admin/socios/${id}`), 'Sócio excluído.').then((ok) => ok && ir('/socios'))}
              >
                Excluir
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="card">
          <div className="row" style={{ marginBottom: 8 }}>
            <Campo rotulo="Lançar mensalidade do mês">
              <input className="input" type="month" value={comp} onChange={(e) => setComp(e.target.value)} />
            </Campo>
            <button className="btn sec" style={{ alignSelf: 'end' }} disabled={ocupado} onClick={() => rodar(() => api.post(`/admin/socios/${id}/mensalidades`, { competencia: comp }), 'Mensalidade lançada.').then(recarregar)}>
              <Icone nome="mais" /> Lançar
            </button>
          </div>
          {socio!.mensalidades!.length === 0 ? (
            <div className="empty">Nenhuma mensalidade registrada.</div>
          ) : (
            <ul className="list">
              {socio!.mensalidades!.map((m) => (
                <li key={m.id}>
                  <div className="sp">
                    <b>{mesExtenso(m.competencia)}</b>
                    <div className="muted small num">{dinheiro(m.valor)}</div>
                  </div>
                  <div>
                    <LinhaMensalidade m={m} />
                  </div>
                  <AcoesMensalidade m={m} nome={socio!.nome} aoMudar={recarregar} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}
