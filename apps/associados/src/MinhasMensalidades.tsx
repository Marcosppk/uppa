import { useEffect, useState } from 'react';
import { Modal, TagMensalidade, Icone, useAcao, useToast, Campo } from '@shared/ui';
import { dinheiro, mesExtenso, dataBr } from '@shared/formato';
import type { Mensalidade } from '@shared/tipos';
import { api, type Eu } from './api';
import { useQr } from './Carteirinha';

export function MinhasMensalidades({ eu, aoMudar }: { eu: Eu; aoMudar: () => void }) {
  const [pagar, setPagar] = useState<Mensalidade | null>(null);
  const lista = eu.mensalidades;
  const abertas = lista.filter((m) => m.status === 'pendente');
  const toast = useToast();
  // Voltou do Mercado Pago: confere se o cartão foi aprovado (a baixa é automática).
  const foiAoCartao = abertas.some((m) => m.mp_preferencia);
  useEffect(() => {
    if (!foiAoCartao) return;
    api
      .post<{ pagas: number }>('/associado/mensalidades/conferir-cartao')
      .then((r) => {
        if (r.pagas > 0) {
          toast(r.pagas === 1 ? 'Pagamento com cartão confirmado. Obrigado!' : `${r.pagas} pagamentos com cartão confirmados. Obrigado!`);
          aoMudar();
        }
      })
      .catch(() => {});
  }, [foiAoCartao]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <h1>Mensalidades</h1>
      {eu.socio.isencao && <div className="alert ok">Você é isento da mensalidade.</div>}
      {abertas.length > 0 && (
        <p className="muted">
          Em aberto: <b>{dinheiro(abertas.reduce((t, m) => t + m.valor, 0))}</b>
        </p>
      )}
      <div className="card">
        {lista.length === 0 ? (
          <div className="empty">Nenhuma mensalidade registrada.</div>
        ) : (
          <ul className="list">
            {lista.map((m) => (
              <li key={m.id}>
                <div className="sp">
                  <b>{mesExtenso(m.competencia)}</b>
                  <div className="muted small">
                    {m.status === 'isenta' ? 'Isento' : dinheiro(m.valor)}
                    {m.status === 'paga' && m.pago_em ? ` · pago em ${dataBr(m.pago_em)}` : ''}
                    {m.status === 'informada' ? ' · aguardando confirmação da tesouraria' : ''}
                  </div>
                </div>
                {m.status === 'pendente' ? (
                  <button className="btn sm" onClick={() => setPagar(m)}>
                    Pagar
                  </button>
                ) : (
                  <TagMensalidade status={m.status} />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      {pagar && (
        <Pagar
          m={pagar}
          eu={eu}
          aoFechar={() => setPagar(null)}
          aoInformar={() => {
            setPagar(null);
            aoMudar();
          }}
        />
      )}
    </>
  );
}

function Pagar({ m, eu, aoFechar, aoInformar }: { m: Mensalidade; eu: Eu; aoFechar: () => void; aoInformar: () => void }) {
  const qr = useQr(m.pix ?? null);
  const toast = useToast();
  const [obs, setObs] = useState('');
  const { ocupado, rodar } = useAcao();
  // Pix do Sicredi: QR próprio da mensalidade e baixa automática. Se falhar, volta ao PIX comum + "Já paguei".
  const [semAutomatico, setSemAutomatico] = useState(false);
  const automatico = !!m.pix_auto && !semAutomatico;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(m.pix!);
      toast('Código PIX copiado. Cole no app do seu banco.');
    } catch {
      toast('Não consegui copiar. Selecione o código e copie manualmente.');
    }
  };

  return (
    <Modal titulo={`Mensalidade de ${mesExtenso(m.competencia)}`} aoFechar={aoFechar}>
      <div className="stack">
        <p className="center" style={{ fontSize: '1.6rem', fontWeight: 700, margin: 0 }}>
          {dinheiro(m.valor)}
        </p>
        {automatico ? (
          <PixAutomatico m={m} recebedor={eu.associacao.pix_nome} aoPagar={aoInformar} aoFalhar={() => setSemAutomatico(true)} />
        ) : m.pix ? (
          <>
            {qr && <img className="qr" src={qr} alt="QR Code PIX" />}
            <p className="muted small center" style={{ margin: 0 }}>
              Abra o app do seu banco, escolha PIX e leia o QR Code — ou copie o código abaixo.
              <br />
              Recebedor: <b>{eu.associacao.pix_nome}</b>
            </p>
            <div className="pix-code">{m.pix}</div>
            <button className="btn sec block" onClick={copiar}>
              <Icone nome="copiar" /> Copiar código PIX
            </button>
          </>
        ) : (
          <div className="alert">A tesouraria ainda não cadastrou a chave PIX no app. Combine o pagamento diretamente com a diretoria da UPPA.</div>
        )}
        {!automatico && (
          <>
            <hr style={{ border: 0, borderTop: '1px solid var(--line)', width: '100%' }} />
            <Campo rotulo="Já pagou? Avise a tesouraria" ajuda="Opcional: escreva um recado (ex.: paguei pela conta da minha esposa).">
              <input className="input" value={obs} onChange={(e) => setObs(e.target.value)} maxLength={300} />
            </Campo>
            <button className="btn ok block" disabled={ocupado} onClick={() => rodar(() => api.post(`/associado/mensalidades/${m.id}/informar`, { forma: 'pix', obs }), 'Pronto! A tesouraria vai confirmar.').then((ok) => ok && aoInformar())}>
              <Icone nome="check" /> Já paguei
            </button>
          </>
        )}
        {m.cartao && (
          <>
            <p className="muted small center" style={{ margin: '8px 0 0' }}>
              ou
            </p>
            <PagarCartao m={m} />
          </>
        )}
      </div>
    </Modal>
  );
}

/** Pix do Sicredi: gera a cobrança da mensalidade e fica conferindo; quando o Pix cai, a mensalidade é baixada sozinha. */
function PixAutomatico({ m, recebedor, aoPagar, aoFalhar }: { m: Mensalidade; recebedor: string; aoPagar: () => void; aoFalhar: () => void }) {
  const [cob, setCob] = useState<{ copiaECola: string; expira: string } | null>(null);
  const [paga, setPaga] = useState(false);
  const qr = useQr(cob?.copiaECola ?? null);
  const toast = useToast();

  useEffect(() => {
    let vivo = true;
    api
      .post<{ copiaECola: string; expira: string }>(`/associado/mensalidades/${m.id}/pix-sicredi`)
      .then((c) => vivo && setCob(c))
      .catch((e) => {
        if (!vivo) return;
        toast(`Não consegui gerar o Pix automático (${e.message}). Use o PIX abaixo e avise a tesouraria.`);
        aoFalhar();
      });
    return () => {
      vivo = false;
    };
  }, [m.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Confere a cada 6 segundos enquanto a tela está aberta.
  useEffect(() => {
    if (!cob || paga) return;
    const t = setInterval(() => {
      api
        .get<{ paga: boolean }>(`/associado/mensalidades/${m.id}/pix-sicredi`)
        .then((r) => {
          if (r.paga) {
            setPaga(true);
            toast('Pix recebido! Mensalidade paga. Obrigado!');
            setTimeout(aoPagar, 1800);
          }
        })
        .catch(() => {});
    }, 6000);
    return () => clearInterval(t);
  }, [cob, paga]); // eslint-disable-line react-hooks/exhaustive-deps

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(cob!.copiaECola);
      toast('Código Pix copiado. Cole no app do seu banco.');
    } catch {
      toast('Não consegui copiar. Selecione o código e copie manualmente.');
    }
  };

  if (paga)
    return (
      <div className="alert ok center" role="status" style={{ fontSize: '1.1rem' }}>
        ✅ <b>Pix recebido!</b> Sua mensalidade está paga.
      </div>
    );
  if (!cob) return <div className="spinner" role="status" aria-label="Gerando o Pix" />;
  return (
    <>
      {qr && <img className="qr" src={qr} alt="QR Code Pix da mensalidade" />}
      <p className="muted small center" style={{ margin: 0 }}>
        Abra o app do seu banco, escolha Pix e leia o QR Code — ou copie o código abaixo.
        <br />
        Recebedor: <b>{recebedor}</b> (Sicredi)
      </p>
      <div className="pix-code">{cob.copiaECola}</div>
      <button className="btn sec block" onClick={copiar}>
        <Icone nome="copiar" /> Copiar código Pix
      </button>
      <div className="alert info row" role="status" style={{ gap: 10 }}>
        <span className="spinner pequeno" aria-hidden="true" />
        <span className="sp">
          <b>Baixa automática:</b> assim que o Pix cair, a mensalidade fica paga sozinha. Não precisa avisar a tesouraria.
        </span>
      </div>
      <span className="muted small center">Código válido até {new Date(cob.expira).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}.</span>
    </>
  );
}

/** Cartão de crédito pelo Mercado Pago: o cartão é digitado no site do Mercado Pago. A taxa do cartão é do sócio. */
function PagarCartao({ m }: { m: Mensalidade }) {
  const { ocupado, rodar } = useAcao();
  const c = m.cartao!;
  return (
    <div className="card stack" style={{ background: 'var(--surface-2)' }}>
      <b>💳 Pagar com cartão</b>
      <table className="t small">
        <tbody>
          <tr>
            <td>Mensalidade</td>
            <td className="r num">{dinheiro(m.valor)}</td>
          </tr>
          <tr>
            <td>Taxa do cartão (paga por você)</td>
            <td className="r num">{dinheiro(c.taxa)}</td>
          </tr>
          <tr>
            <td>
              <b>Total no cartão</b>
            </td>
            <td className="r num">
              <b>{dinheiro(c.total)}</b>
            </td>
          </tr>
        </tbody>
      </table>
      <button
        className="btn block"
        disabled={ocupado}
        onClick={() =>
          rodar(async () => {
            const r = await api.post<{ url: string }>(`/associado/mensalidades/${m.id}/cartao`);
            location.href = r.url;
          })
        }
      >
        {ocupado ? 'Abrindo o Mercado Pago…' : `Pagar ${dinheiro(c.total)} no cartão`}
      </button>
      <span className="muted small">Você vai para o site seguro do Mercado Pago e volta para o app depois. A baixa da mensalidade é automática.</span>
    </div>
  );
}
