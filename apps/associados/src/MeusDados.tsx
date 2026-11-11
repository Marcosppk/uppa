import { useState } from 'react';
import { Campo, CampoSenha, Icone, useAcao } from '@shared/ui';
import { FormSocio, type DadosSocio } from '@shared/FormSocio';
import { cpfFormatado } from '@shared/formato';
import { CATEGORIAS, rotulo } from '@shared/opcoes.js';
import { api, type Eu } from './api';
import { PainelAcessibilidade } from '@shared/acessibilidade';
import { SobreVersao } from '@shared/Novidades';
import { EditorFoto } from '@shared/Foto';
import { Documentos } from '@shared/Documentos';
import type { Documento } from '@shared/tipos';
import { ORIGEM_SERVIDOR } from '@shared/api';
import { lembrarLogin } from '@shared/lembrar';

export function MeusDados({ eu, aoMudar, aoSair }: { eu: Eu; aoMudar: () => void; aoSair: () => void }) {
  const [d, setD] = useState<DadosSocio>(eu.socio);
  const [senha, setSenha] = useState({ atual: '', nova: '' });
  const { ocupado, rodar } = useAcao();

  return (
    <>
      <div className="row between">
        <h1 style={{ margin: 0 }}>Meus dados</h1>
        <button className="btn ghost sm" onClick={aoSair}>
          <Icone nome="sair" /> Sair
        </button>
      </div>
      <p className="muted small">
        CPF {cpfFormatado(eu.socio.cpf)} · {rotulo(CATEGORIAS, eu.socio.categoria)}. Para mudar nome, CPF ou categoria, fale com a diretoria.
      </p>
      <section className="card" style={{ marginBottom: 16 }} aria-label="Minha foto">
        <EditorFoto
          nome={eu.socio.nome}
          foto={eu.socio.foto}
          enviar={(b) => api.enviarArquivo('/associado/foto', b, 'foto.jpg', { metodo: 'PUT' })}
          remover={() => api.del('/associado/foto')}
          aoMudar={aoMudar}
        />
      </section>
      <FormSocio valor={d} onChange={setD} modo="proprio" />
      <button className="btn block" style={{ marginTop: 12 }} disabled={ocupado} onClick={() => rodar(() => api.put('/associado/me', d), 'Dados atualizados.').then((ok) => ok && aoMudar())}>
        Salvar meus dados
      </button>

      <form
        className="card stack"
        style={{ marginTop: 20 }}
        onSubmit={(e) => {
          e.preventDefault();
          rodar(() => api.post('/associado/senha', senha), 'Senha alterada.').then((ok) => ok && setSenha({ atual: '', nova: '' }));
        }}
      >
        <h2>Trocar senha</h2>
        <Campo rotulo="Senha atual">
          <CampoSenha value={senha.atual} onChange={(e) => setSenha({ ...senha, atual: e.target.value })} required autoComplete="current-password" />
        </Campo>
        <Campo rotulo="Nova senha">
          <CampoSenha value={senha.nova} onChange={(e) => setSenha({ ...senha, nova: e.target.value })} required autoComplete="new-password" />
        </Campo>
        <button className="btn sec" disabled={ocupado}>
          Trocar senha
        </button>
      </form>
      <div style={{ marginTop: 16 }}>
        <Documentos
          explicacao="Envie laudos e documentos para a diretoria: tire uma foto pelo celular ou escolha um PDF. Só você e a diretoria da UPPA veem."
          carregar={() => api.get<Documento[]>('/associado/documentos')}
          enviar={(b, nome, tipo, descricao) => api.enviarArquivo('/associado/documentos', b, nome, { cabecalhos: { 'X-Tipo-Documento': tipo, 'X-Descricao': descricao } })}
          remover={(id) => api.del(`/associado/documentos/${id}`)}
        />
      </div>
      <div style={{ marginTop: 16 }}>
        <PainelAcessibilidade />
        <SobreVersao aoRefazerTour={() => window.dispatchEvent(new Event('uppa-tour'))} />
      </div>
      <ExcluirConta aoExcluir={aoSair} />
    </>
  );
}

/** O sócio apaga a própria conta. Pede a senha e uma confirmação, porque não dá para desfazer. */
function ExcluirConta({ aoExcluir }: { aoExcluir: () => void }) {
  const [aberto, setAberto] = useState(false);
  const [senha, setSenha] = useState('');
  const [certeza, setCerteza] = useState(false);
  const { ocupado, rodar } = useAcao();

  return (
    <section className="card stack" style={{ marginTop: 16 }} aria-labelledby="titulo-excluir">
      <h2 id="titulo-excluir">Excluir minha conta</h2>
      <p className="muted small" style={{ margin: 0 }}>
        Apaga sua ficha de sócio, a família cadastrada, as mensalidades, a foto, os documentos e as mensagens. Os valores que você já pagou continuam no caixa da
        UPPA, sem o seu nome. Não dá para desfazer: para voltar, será preciso fazer uma nova inscrição.{' '}
        <a href={`${ORIGEM_SERVIDOR}/privacidade`} target="_blank" rel="noreferrer">
          Política de privacidade
        </a>
      </p>
      {!aberto ? (
        <div>
          <button className="btn ghost sm" onClick={() => setAberto(true)}>
            Quero excluir minha conta
          </button>
        </div>
      ) : (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            rodar(() => api.post('/associado/excluir-conta', { senha }), 'Sua conta foi excluída.').then((ok) => {
              if (!ok) return;
              lembrarLogin('uppa-associados').salvar(false, '');
              aoExcluir();
            });
          }}
        >
          <Campo rotulo="Sua senha">
            <CampoSenha value={senha} onChange={(e) => setSenha(e.target.value)} required autoComplete="current-password" />
          </Campo>
          <label className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
            <input type="checkbox" checked={certeza} onChange={(e) => setCerteza(e.target.checked)} />
            <span>Entendo que meus dados serão apagados e que isso não pode ser desfeito.</span>
          </label>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn danger" disabled={ocupado || !certeza || !senha}>
              {ocupado ? 'Excluindo…' : 'Excluir minha conta'}
            </button>
            <button type="button" className="btn ghost" onClick={() => (setAberto(false), setSenha(''), setCerteza(false))}>
              Cancelar
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
