import { useEffect, useState } from 'react';
import { Logo, Carregando, Icone } from '@shared/ui';
import { dataBr } from '@shared/formato';
import { CATEGORIAS } from '@shared/opcoes.js';
import { api, URL_PUBLICA, type Eu } from './api';
import { urlApi } from '@shared/api';
import { RodapeEntrada } from './Boasvindas';

export function useQr(texto: string | null) {
  const [img, setImg] = useState<string | null>(null);
  useEffect(() => {
    if (!texto) return setImg(null);
    // A biblioteca do QR só é baixada quando algum QR aparece na tela.
    import('qrcode').then((m) => m.default.toDataURL(texto, { margin: 1, width: 420, errorCorrectionLevel: 'M' })).then(setImg);
  }, [texto]);
  return img;
}

export function Carteirinha({ eu }: { eu: Eu }) {
  const { socio, carteirinha } = eu;
  const qr = useQr(carteirinha ? `${URL_PUBLICA}/#/verificar/${carteirinha}` : null);
  const cat = CATEGORIAS.find((c) => c.valor === socio.categoria);

  if (!socio.matricula) {
    return (
      <>
        <h1>Carteirinha</h1>
        <div className="card empty">A carteirinha fica disponível depois que a diretoria aprovar sua inscrição.</div>
      </>
    );
  }

  return (
    <>
      <h1>Carteirinha de sócio</h1>
      <div className={`carteira ${socio.status !== 'ativo' ? 'inativa' : ''}`}>
        <div className="topo-c">
          <Logo tamanho={56} />
          <div>
            <b>UPPA Roraima</b>
            <span>União de Pais e Pessoas Autistas</span>
          </div>
        </div>
        <div className="meio-c">
          {socio.foto ? <img className="foto-c" src={urlApi(socio.foto)} alt={`Foto de ${socio.nome}`} /> : null}
          <div className="nome">{socio.nome}</div>
        </div>
        <div className="pe">
          <div>
            Matrícula
            <b>{String(socio.matricula).padStart(4, '0')}</b>
          </div>
          <div>
            Categoria
            <b>{cat?.tipo ?? '—'}</b>
          </div>
          <div>
            Desde
            <b>{dataBr(socio.inscrito_em).slice(3)}</b>
          </div>
        </div>
      </div>
      {!socio.foto && (
        <a className="alert info row" href="#/dados" style={{ textDecoration: 'none', marginTop: 12 }}>
          <span className="sp">📷 Coloque sua foto em Meus dados para ela aparecer na carteirinha.</span>
          <Icone nome="seta" />
        </a>
      )}
      <div className="card center" style={{ marginTop: 16 }}>
        {qr ? <img className="qr" src={qr} alt="QR Code de verificação da carteirinha" /> : <Carregando />}
        <p className="muted small" style={{ marginTop: 10 }}>
          Mostre este código para confirmar que você é sócio{socio.status === 'ativo' ? ' ativo' : ''} da UPPA.
        </p>
        {socio.status !== 'ativo' && <div className="alert bad">Cadastro inativo.</div>}
      </div>
    </>
  );
}

/** Página pública aberta pelo QR da carteirinha. */
export function Verificar({ codigo }: { codigo: string }) {
  const [r, setR] = useState<{ nome: string; matricula: number; categoria: string; ativo: boolean; foto: string | null } | null>(null);
  const [erro, setErro] = useState('');
  useEffect(() => {
    api.get<typeof r>(`/publico/verificar/${encodeURIComponent(codigo)}`).then(setR).catch((e) => setErro(e.message));
  }, [codigo]);
  return (
    <div className="tela-entrada">
      <main className="cartao-entrada center">
        <div className="marca-entrada">
          <Logo tamanho={32} /> UPPA Roraima
        </div>
        <h1>Verificação de sócio</h1>
        {erro ? (
          <div className="alert bad">{erro}</div>
        ) : !r ? (
          <Carregando />
        ) : (
          <>
            <span className={`tag ${r.ativo ? 'ok' : 'bad'}`} style={{ justifySelf: 'center', fontSize: '1rem' }}>
              {r.ativo ? 'Sócio ativo' : 'Cadastro inativo'}
            </span>
            {r.foto && <img src={urlApi(r.foto)} alt={`Foto de ${r.nome}`} style={{ width: 140, height: 140, borderRadius: 20, objectFit: 'cover', justifySelf: 'center' }} />}
            <h2 style={{ margin: 0 }}>{r.nome}</h2>
            <p className="muted" style={{ margin: 0 }}>
              Matrícula {String(r.matricula).padStart(4, '0')} · {r.categoria}
            </p>
          </>
        )}
      </main>
      <RodapeEntrada />
    </div>
  );
}
