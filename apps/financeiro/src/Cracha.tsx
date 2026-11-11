// Crachá de identificação da equipe (presidência, diretoria, tesouraria): ver, pôr foto, definir o cargo e imprimir
// no tamanho de um crachá de verdade (54 × 86 mm, o mesmo de um cartão na vertical).
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useDados, Estado, Campo, Logo, Icone, useAcao } from '@shared/ui';
import { EditorFoto } from '@shared/Foto';
import { urlApi, ORIGEM_SERVIDOR } from '@shared/api';
import { useQr } from '@shared/useQr';
import { appNativo } from '@shared/arquivo';
import { api, nomePapel, podeTudo, type Usuario } from './api';

export interface DadosCracha {
  id: number;
  nome: string;
  papel: string;
  cargo: string;
  cargo_proprio: string;
  foto: string | null;
  codigo: string;
}

/** Endereço público que o QR abre (a página fica no app dos sócios, que não exige login). */
export const linkVerificacao = (codigo: string) => `${ORIGEM_SERVIDOR}/associados/#/cracha/${codigo}`;

const iniciais = (nome: string) =>
  nome
    .trim()
    .split(/\s+/)
    .map((p, i, a) => (i === 0 || i === a.length - 1 ? p[0] : ''))
    .join('')
    .toUpperCase();

/** O crachá em si (o mesmo desenho na tela e na impressão). */
export function Cartao({ c, qr }: { c: DadosCracha; qr: string | null }) {
  return (
    <div className={`cracha papel-${c.papel}`}>
      <div className="cracha-topo">
        <Logo tamanho={40} />
        <div>
          <b>UPPA Roraima</b>
          <span>União de Pais e Pessoas Autistas</span>
        </div>
      </div>
      <div className="cracha-corpo">
        {c.foto ? <img className="cracha-foto" src={urlApi(c.foto)} alt={`Foto de ${c.nome}`} /> : <div className="cracha-foto sem-foto">{iniciais(c.nome)}</div>}
        <div className="cracha-nome">{c.nome}</div>
        <div className="cracha-cargo">{c.cargo}</div>
      </div>
      <div className="cracha-pe">
        {qr ? <img className="cracha-qr" src={qr} alt="QR Code para conferir o crachá" /> : <span className="cracha-qr" />}
        <span>Aponte a câmera do celular para conferir este crachá.</span>
      </div>
      <div className="cracha-faixa">Equipe UPPA</div>
    </div>
  );
}

export function Cracha({ usuario, id }: { usuario: Usuario; id?: number }) {
  const alvo = id ?? usuario.id;
  const { dados, erro, recarregar } = useDados(() => api.get<DadosCracha>(id && id !== usuario.id ? `/admin/usuarios/${id}/cracha` : '/admin/cracha'), [alvo]);
  const qr = useQr(dados ? linkVerificacao(dados.codigo) : null);
  const [cargo, setCargo] = useState<string | null>(null);
  const { ocupado, rodar } = useAcao();
  const chefe = podeTudo(usuario);
  const proprio = alvo === usuario.id;

  if (!dados) return <Estado erro={erro} />;

  const imprimir = () => {
    document.body.classList.add('imprimir-cracha');
    const fim = () => {
      document.body.classList.remove('imprimir-cracha');
      window.removeEventListener('afterprint', fim);
    };
    window.addEventListener('afterprint', fim);
    window.print();
  };

  return (
    <>
      <div className="row between">
        <h1>{proprio ? 'Meu crachá' : `Crachá de ${dados.nome.split(' ')[0]}`}</h1>
        {!proprio && (
          <a className="btn ghost sm" href="#/config">
            <Icone nome="voltar" /> Ajustes
          </a>
        )}
      </div>
      <div className="cracha-tela">
        <div className="cracha-previa">
          <Cartao c={dados} qr={qr} />
        </div>
        <div className="stack">
          <div className="card stack">
            <h2>Foto</h2>
            <EditorFoto
              nome={dados.nome}
              foto={dados.foto}
              texto="Use uma foto de rosto, de frente e com fundo claro. Ela aparece no crachá e na conferência pelo QR Code."
              enviar={(b) => api.enviarArquivo(`/admin/usuarios/${alvo}/foto`, b, 'foto.jpg', { metodo: 'PUT' })}
              remover={() => api.del(`/admin/usuarios/${alvo}/foto`)}
              aoMudar={recarregar}
            />
          </div>
          <div className="card stack">
            <h2>Cargo no crachá</h2>
            {chefe ? (
              <form
                className="stack"
                onSubmit={(e) => {
                  e.preventDefault();
                  rodar(() => api.put(`/admin/usuarios/${alvo}/cargo`, { cargo: cargo ?? dados.cargo_proprio }), 'Cargo salvo.').then((ok) => ok && recarregar());
                }}
              >
                <Campo rotulo="Cargo" ajuda={`Ex.: Vice-presidente, Secretária, Tesoureira. Em branco, aparece "${nomePapel(dados.papel)}".`}>
                  <input className="input" maxLength={40} value={cargo ?? dados.cargo_proprio} placeholder={nomePapel(dados.papel)} onChange={(e) => setCargo(e.target.value)} />
                </Campo>
                <div>
                  <button className="btn sec" disabled={ocupado}>
                    Salvar cargo
                  </button>
                </div>
              </form>
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                <b>{dados.cargo}</b>. O cargo é definido pela presidência.
              </p>
            )}
          </div>
          <div className="card stack">
            <h2>Imprimir</h2>
            <p className="muted small" style={{ margin: 0 }}>
              Sai no tamanho de crachá (5,4 × 8,6 cm), com linha para recortar. Para guardar no celular, escolha "Salvar como PDF" na impressão.
            </p>
            {appNativo ? (
              // Dentro do app instalado o celular não abre a janela de impressão: imprime-se pelo navegador.
              <p className="small" style={{ margin: 0 }}>
                Para imprimir, abra o UPPA Financeiro no navegador do computador ou do celular.
              </p>
            ) : (
              <div>
                <button className="btn" onClick={imprimir} disabled={!qr}>
                  Imprimir crachá
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {createPortal(
        <div className="cracha-impressao" aria-hidden="true">
          <Cartao c={dados} qr={qr} />
        </div>,
        document.body,
      )}
    </>
  );
}
