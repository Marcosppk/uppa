import { useEffect, useState } from 'react';
import { useDados, Estado, Campo, useAcao, Icone, useToast } from '@shared/ui';
import { api, nomePapel, PAPEIS, podeTudo, type Usuario } from './api';
import { PainelAcessibilidade } from '@shared/acessibilidade';
import { SobreVersao } from '@shared/Novidades';

const PLANILHA = 'https://docs.google.com/spreadsheets/d/1Y00-9TRPKGj2XAkia7sp-TdeYdnAYuBtF-rS7pi2JIM/edit?resourcekey#gid=2130497015';

interface Resumo {
  lidos: number;
  criados: number;
  atualizados: number;
  mensalidades: number;
  avisos: string[];
}

export function Config({ usuario, aoSair, aoMudarCampanha }: { usuario: Usuario; aoSair: () => void; aoMudarCampanha?: () => void }) {
  const admin = podeTudo(usuario);
  return (
    <>
      <div className="topo">
        <h1>Ajustes</h1>
        <button className="btn sec" onClick={aoSair}>
          <Icone nome="sair" /> Sair
        </button>
      </div>
      {admin && <Importar />}
      {admin && <AvisosInscricao />}
      {admin && <CopiasSeguranca />}
      <Associacao admin={admin} aoSalvar={aoMudarCampanha} />
      {admin && <PixSicredi />}
      {admin && <PagamentoCartao />}
      <Usuarios admin={admin} eu={usuario} />
      <MinhaSenha />
      <PainelAcessibilidade />
      <SobreVersao aoRefazerTour={() => window.dispatchEvent(new Event('uppa-tour'))} />
    </>
  );
}

function Importar() {
  const [url, setUrl] = useState(PLANILHA);
  const [csv, setCsv] = useState<string | null>(null);
  const [arquivo, setArquivo] = useState('');
  const [resumo, setResumo] = useState<(Resumo & { simulado: boolean }) | null>(null);
  const { ocupado, rodar } = useAcao();

  const enviar = (simular: boolean) =>
    rodar(async () => {
      const r = await api.post<Resumo>('/admin/importar', csv ? { csv, simular } : { url, simular });
      setResumo({ ...r, simulado: simular });
    }, simular ? undefined : 'Planilha importada.');

  return (
    <div className="card stack">
      <h2>Importar planilha de inscrições</h2>
      <p className="muted small">
        Traz os cadastros da planilha do Google Forms (“Respostas ao formulário 1”). Quem já existe (mesmo CPF) é atualizado, ninguém é duplicado. Os itens “PG Mês/Ano” da coluna Controle de Contribuição
        viram mensalidades pagas. Pode importar de novo sempre que chegarem respostas novas.
      </p>
      <Campo rotulo="Link da planilha" ajuda='A planilha precisa estar compartilhada como "Qualquer pessoa com o link". Ou escolha o arquivo CSV abaixo.'>
        <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} disabled={!!csv} />
      </Campo>
      <div className="row">
        <label className="btn sec">
          <Icone nome="enviar" /> {arquivo || 'Escolher arquivo CSV'}
          <input
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setArquivo(f.name);
              setCsv(await f.text());
            }}
          />
        </label>
        {csv && (
          <button
            className="btn ghost sm"
            onClick={() => {
              setCsv(null);
              setArquivo('');
            }}
          >
            Usar o link
          </button>
        )}
      </div>
      <div className="row">
        <button className="btn sec" disabled={ocupado} onClick={() => enviar(true)}>
          Conferir antes (simular)
        </button>
        <button className="btn" disabled={ocupado} onClick={() => confirm('Importar os cadastros agora?') && enviar(false)}>
          Importar
        </button>
      </div>
      {resumo && (
        <div className={`alert ${resumo.simulado ? '' : 'ok'}`}>
          <b>{resumo.simulado ? 'Simulação (nada foi gravado):' : 'Importação concluída:'}</b> {resumo.lidos} linhas lidas · {resumo.criados} novos · {resumo.atualizados} atualizados ·{' '}
          {resumo.mensalidades} mensalidades pagas registradas.
          {resumo.avisos.length > 0 && (
            <ul className="small" style={{ margin: '8px 0 0', paddingLeft: 18 }}>
              {resumo.avisos.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

interface Notificacoes {
  emails: string;
  gmail: string;
  tem_senha_gmail: boolean;
  whats: { numero: string; tem_chave?: boolean; chave?: string }[];
  sms_provedor: '' | 'zenvia' | 'twilio';
  sms_numeros: string;
  sms_conta: string;
  sms_de: string;
  tem_token_sms: boolean;
  ultimo: { em: string; assunto: string; resultados: { canal: string; ok: boolean; erro?: string }[] } | null;
}

/** Quem recebe o aviso de nova inscrição pelo app, por e-mail, WhatsApp e SMS. */
function AvisosInscricao() {
  const { dados, erro, recarregar } = useDados(() => api.get<Notificacoes>('/admin/notificacoes'));
  const [f, setF] = useState<(Notificacoes & { senha_gmail?: string; sms_token?: string }) | null>(null);
  const { ocupado, rodar } = useAcao();
  const [teste, setTeste] = useState<Notificacoes['ultimo']>(null);
  useEffect(() => {
    if (dados) setF(dados);
  }, [dados]);
  if (!f) return <Estado erro={erro} />;
  const setWhats = (i: number, v: Partial<Notificacoes['whats'][number]>) => setF({ ...f, whats: f.whats.map((w, j) => (j === i ? { ...w, ...v } : w)) });
  const ultimo = teste ?? dados?.ultimo;
  return (
    <form
      className="card stack"
      onSubmit={(e) => {
        e.preventDefault();
        rodar(() => api.put('/admin/notificacoes', f), 'Avisos de inscrição salvos.').then((ok) => ok && recarregar());
      }}
    >
      <h2>Aviso de nova inscrição</h2>
      <p className="muted" style={{ margin: 0 }}>
        Quando alguém se inscrever pelo app UPPA Associados, chega uma mensagem por e-mail, WhatsApp e/ou SMS com o nome, a categoria e o link para autorizar. Nenhum CPF ou dado de saúde vai na mensagem.
      </p>

      <h3>E-mail</h3>
      <Campo rotulo="E-mails que recebem o aviso" ajuda="Pode colocar mais de um, separados por vírgula.">
        <input className="input" value={f.emails} onChange={(e) => setF({ ...f, emails: e.target.value })} placeholder="diretoria@exemplo.com, tesouraria@exemplo.com" autoComplete="off" />
      </Campo>
      <div className="grid2">
        <Campo rotulo="Gmail que envia os avisos">
          <input className="input" type="email" value={f.gmail} onChange={(e) => setF({ ...f, gmail: e.target.value })} placeholder="uppa.avisos@gmail.com" autoComplete="off" />
        </Campo>
        <Campo rotulo="Senha de app do Gmail" ajuda={f.tem_senha_gmail ? 'Já guardada. Deixe em branco para manter.' : 'Não é a senha normal: crie em Conta Google → Segurança → Senhas de app.'}>
          <input className="input" type="password" value={f.senha_gmail ?? ''} onChange={(e) => setF({ ...f, senha_gmail: e.target.value })} placeholder={f.tem_senha_gmail ? '•••• guardada' : '16 letras'} autoComplete="new-password" />
        </Campo>
      </div>

      <h3>WhatsApp</h3>
      <p className="muted small" style={{ margin: 0 }}>
        Usa o serviço gratuito CallMeBot. Cada pessoa que vai receber manda, do próprio WhatsApp, a mensagem de ativação indicada em <a href="https://www.callmebot.com/blog/free-api-whatsapp-messages/" target="_blank" rel="noreferrer">callmebot.com</a> e recebe uma chave (apikey). Coloque aqui o número e a chave.
      </p>
      {f.whats.map((w, i) => (
        <div key={i} className="row" style={{ alignItems: 'end' }}>
          <Campo rotulo={`Número ${i + 1} (com DDD)`}>
            <input className="input" inputMode="tel" value={w.numero} onChange={(e) => setWhats(i, { numero: e.target.value })} placeholder="95 99999-9999" />
          </Campo>
          <Campo rotulo="Chave do CallMeBot" ajuda={w.tem_chave ? 'Já guardada. Deixe em branco para manter.' : undefined}>
            <input className="input" value={w.chave ?? ''} onChange={(e) => setWhats(i, { chave: e.target.value })} placeholder={w.tem_chave ? '•••• guardada' : '1234567'} autoComplete="off" />
          </Campo>
          <button type="button" className="btn ghost sm" onClick={() => setF({ ...f, whats: f.whats.filter((_, j) => j !== i) })} aria-label={`Tirar o número ${i + 1}`}>
            Tirar
          </button>
        </div>
      ))}
      <button type="button" className="btn sec sm" style={{ justifySelf: 'start' }} onClick={() => setF({ ...f, whats: [...f.whats, { numero: '', chave: '' }] })}>
        <Icone nome="mais" /> Adicionar WhatsApp
      </button>

      <h3>SMS</h3>
      <p className="muted small" style={{ margin: 0 }}>
        SMS é pago por mensagem, numa conta da associação num serviço de SMS: a <a href="https://www.zenvia.com" target="_blank" rel="noreferrer">Zenvia</a> (brasileira, cobra em reais) ou a{' '}
        <a href="https://www.twilio.com" target="_blank" rel="noreferrer">Twilio</a>. O texto vai sem acentos para caber num SMS só.
      </p>
      <Campo rotulo="Serviço de SMS">
        <select className="input" value={f.sms_provedor} onChange={(e) => setF({ ...f, sms_provedor: e.target.value as Notificacoes['sms_provedor'] })}>
          <option value="">Não enviar SMS</option>
          <option value="zenvia">Zenvia</option>
          <option value="twilio">Twilio</option>
        </select>
      </Campo>
      {f.sms_provedor && (
        <>
          <Campo rotulo="Celulares que recebem o SMS (com DDD)" ajuda="Pode colocar mais de um, separados por vírgula.">
            <input className="input" inputMode="tel" value={f.sms_numeros} onChange={(e) => setF({ ...f, sms_numeros: e.target.value })} placeholder="95 99999-9999, 95 98888-8888" autoComplete="off" />
          </Campo>
          <div className="grid2">
            {f.sms_provedor === 'twilio' && (
              <Campo rotulo="Account SID (Twilio)">
                <input className="input" value={f.sms_conta} onChange={(e) => setF({ ...f, sms_conta: e.target.value.trim() })} placeholder="AC…" autoComplete="off" />
              </Campo>
            )}
            <Campo
              rotulo={f.sms_provedor === 'twilio' ? 'Auth Token (Twilio)' : 'Token da API (Zenvia)'}
              ajuda={f.tem_token_sms ? 'Já guardado. Deixe em branco para manter.' : f.sms_provedor === 'twilio' ? 'No painel da Twilio, em Account Info.' : 'No painel da Zenvia, em Integrações → Tokens e Webhooks.'}
            >
              <input className="input" type="password" value={f.sms_token ?? ''} onChange={(e) => setF({ ...f, sms_token: e.target.value })} placeholder={f.tem_token_sms ? '•••• guardado' : ''} autoComplete="new-password" />
            </Campo>
            <Campo rotulo={f.sms_provedor === 'twilio' ? 'Número Twilio que envia' : 'Remetente (Zenvia)'} ajuda={f.sms_provedor === 'twilio' ? 'Com + e o código do país, como aparece na Twilio.' : 'O nome/remetente de SMS cadastrado na sua conta Zenvia.'}>
              <input className="input" value={f.sms_de} onChange={(e) => setF({ ...f, sms_de: e.target.value })} placeholder={f.sms_provedor === 'twilio' ? '+15551234567' : 'uppa-rr'} autoComplete="off" />
            </Campo>
          </div>
        </>
      )}

      <div className="row">
        <button className="btn" disabled={ocupado}>
          Salvar
        </button>
        <button
          type="button"
          className="btn sec"
          disabled={ocupado}
          onClick={() => rodar(async () => setTeste({ em: new Date().toISOString(), assunto: 'Teste', resultados: await api.post('/admin/notificacoes/teste') }))}
        >
          Enviar teste
        </button>
      </div>
      <span className="muted small">Salve antes de testar.</span>
      {ultimo && (
        <div className="alert" role="status">
          <b>Último envio ({new Date(ultimo.em).toLocaleString('pt-BR')}):</b>
          <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
            {ultimo.resultados.map((r) => (
              <li key={r.canal}>
                {r.canal}: {r.ok ? 'enviado ✓' : `não enviado — ${r.erro}`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}

interface Copia {
  nome: string;
  tipo: 'auto' | 'manual' | 'antes';
  data: string;
  hora: string;
  tamanho: number;
}

const TIPO_COPIA = { auto: 'Automática do dia', manual: 'Feita em Ajustes', antes: 'Antes de importar ou restaurar' };
const tamanho = (b: number) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1).replace('.', ',')} MB`);

/** Cópias de segurança do banco: lista, cópia na hora e download. */
function CopiasSeguranca() {
  const { dados, erro, recarregar } = useDados(() => api.get<{ pasta: string; copias: Copia[] }>('/admin/copias'));
  const { ocupado, rodar } = useAcao();
  const ultima = dados?.copias[0];
  return (
    <div className="card stack">
      <h2>Cópias de segurança</h2>
      <p className="muted" style={{ margin: 0 }}>
        O sistema faz sozinho uma cópia por dia de todos os dados (sócios, mensalidades, caixa, avisos e anexos) e confere cada uma antes de guardar. Ficam as cópias dos últimos 14 dias e uma de cada mês por 12 meses.
      </p>
      {!dados ? (
        <Estado erro={erro} />
      ) : (
        <>
          <div className={`alert ${ultima ? 'ok' : 'warn'}`} role="status">
            {ultima ? (
              <>
                Última cópia: <b>{ultima.data.split('-').reverse().join('/')} às {ultima.hora}</b> ({TIPO_COPIA[ultima.tipo].toLowerCase()}, {tamanho(ultima.tamanho)}). Guardada em <code>{dados.pasta}</code>.
              </>
            ) : (
              'Ainda não há nenhuma cópia. A primeira é feita automaticamente alguns segundos depois de o servidor ligar, ou agora pelo botão abaixo.'
            )}
          </div>
          <div className="row">
            <button className="btn" disabled={ocupado} onClick={() => rodar(() => api.post('/admin/copias'), 'Cópia de segurança feita e verificada.').then(recarregar)}>
              {ocupado ? 'Copiando…' : 'Fazer uma cópia agora'}
            </button>
          </div>
          {dados.copias.length > 0 && (
            <div className="table-wrap">
              <table className="t">
                <caption className="sr-only">Cópias de segurança guardadas</caption>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Tipo</th>
                    <th className="r">Tamanho</th>
                    <th>
                      <span className="sr-only">Baixar</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dados.copias.slice(0, 15).map((c) => (
                    <tr key={c.nome}>
                      <td className="num" style={{ whiteSpace: 'nowrap' }}>
                        {c.data.split('-').reverse().join('/')} {c.hora}
                      </td>
                      <td className="small">{TIPO_COPIA[c.tipo]}</td>
                      <td className="r small num">{tamanho(c.tamanho)}</td>
                      <td className="r">
                        <button className="btn ghost sm" disabled={ocupado} onClick={() => rodar(() => api.baixar(`/admin/copias/${c.nome}`, c.nome))} aria-label={`Baixar a cópia de ${c.data.split('-').reverse().join('/')} ${c.hora}`}>
                          <Icone nome="baixar" /> Baixar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="muted small" style={{ margin: 0 }}>
            O arquivo baixado tem os dados pessoais de todos os sócios (CPF, saúde): guarde em lugar seguro. Para voltar o sistema a uma cópia, peça ao responsável pelo servidor (script <code>restaurar-copia.ps1</code>); antes de restaurar, o estado atual é guardado também.
          </p>
        </>
      )}
    </div>
  );
}

/** Lê o arquivo de certificado/chave: texto PEM como está; certificado binário (DER) vira PEM. */
async function lerPem(f: File, tipo: 'CERTIFICATE' | 'PRIVATE KEY') {
  const bytes = new Uint8Array(await f.arrayBuffer());
  const texto = new TextDecoder().decode(bytes);
  if (texto.includes('-----BEGIN')) return texto.trim();
  if (tipo === 'PRIVATE KEY') throw new Error('A chave privada precisa estar em PEM (o arquivo .key baixado do Portal do Sicredi).');
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return `-----BEGIN CERTIFICATE-----\n${btoa(bin).match(/.{1,64}/g)!.join('\n')}\n-----END CERTIFICATE-----`;
}

interface Sicredi {
  ativo: boolean;
  ambiente: 'producao' | 'homologacao';
  url_homologacao: string;
  client_id: string;
  tem_secret: boolean;
  tem_chave_privada: boolean;
  certificado: { valido_ate: string; titular: string } | null;
  chave: string;
  expiracao_horas: number;
}

/** Pix do Sicredi com baixa automática (API Pix do Banco Central, com certificado mTLS). */
function PixSicredi() {
  const { dados, erro, recarregar } = useDados(() => api.get<Sicredi>('/admin/sicredi'));
  const [f, setF] = useState<(Sicredi & { client_secret: string; certificado_novo: string; chave_privada: string }) | null>(null);
  const { ocupado, rodar } = useAcao();
  const toast = useToast();
  useEffect(() => {
    if (dados) setF({ ...dados, client_secret: '', certificado_novo: '', chave_privada: '' });
  }, [dados]);
  if (!f || !dados) return <Estado erro={erro} />;
  const dias = dados.certificado ? Math.floor((Date.parse(dados.certificado.valido_ate) - Date.now()) / 864e5) : null;
  const arquivo = (tipo: 'CERTIFICATE' | 'PRIVATE KEY') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const arq = e.target.files?.[0];
    e.target.value = '';
    if (!arq) return;
    lerPem(arq, tipo)
      .then((pem) => setF((x) => x && (tipo === 'CERTIFICATE' ? { ...x, certificado_novo: pem } : { ...x, chave_privada: pem })))
      .catch((er: Error) => toast(er.message));
  };
  return (
    <form
      className="card stack"
      onSubmit={(e) => {
        e.preventDefault();
        rodar(() => api.put('/admin/sicredi', { ...f, certificado: f.certificado_novo }), f.ativo ? 'Conexão com o Sicredi conferida. Pix automático ativo.' : 'Pix do Sicredi salvo (desligado).').then((ok) => ok && recarregar());
      }}
    >
      <h2>Pix do Sicredi (baixa automática)</h2>
      <p className="muted" style={{ margin: 0 }}>
        Cada mensalidade ganha um QR Pix próprio, gerado pelo Sicredi. Quando o sócio paga, o sistema confere com o Sicredi e <b>dá baixa sozinho</b> — sem "Já paguei" e sem conferência manual. Precisa da adesão à API Pix na cooperativa e do certificado e das credenciais do Portal do Desenvolvedor do Sicredi.
      </p>
      {dados.certificado && (
        <div className={`alert ${dias !== null && dias < 30 ? 'warn' : 'ok'}`}>
          Certificado de <b>{dados.certificado.titular}</b>, válido até <b>{new Date(dados.certificado.valido_ate).toLocaleDateString('pt-BR')}</b>
          {dias !== null && dias < 30 ? ` — vence em ${Math.max(dias, 0)} dia(s): renove no Portal do Sicredi para o Pix não parar.` : '.'}
        </div>
      )}
      <div className="grid2">
        <Campo rotulo="Ambiente">
          <select className="input" value={f.ambiente} onChange={(e) => setF({ ...f, ambiente: e.target.value as Sicredi['ambiente'] })}>
            <option value="producao">Produção (cobranças reais)</option>
            <option value="homologacao">Homologação (testes do Sicredi)</option>
          </select>
        </Campo>
        {f.ambiente === 'homologacao' ? (
          <Campo rotulo="URL de homologação" ajuda="A que a equipe do Sicredi informou na liberação do teste.">
            <input className="input" value={f.url_homologacao} onChange={(e) => setF({ ...f, url_homologacao: e.target.value })} placeholder="https://…" />
          </Campo>
        ) : (
          <Campo rotulo="Chave Pix da associação" ajuda="A chave cadastrada na conta Sicredi (CNPJ, e-mail, telefone ou aleatória).">
            <input className="input" value={f.chave} onChange={(e) => setF({ ...f, chave: e.target.value })} />
          </Campo>
        )}
        {f.ambiente === 'homologacao' && (
          <Campo rotulo="Chave Pix (de teste)">
            <input className="input" value={f.chave} onChange={(e) => setF({ ...f, chave: e.target.value })} />
          </Campo>
        )}
        <Campo rotulo="Client ID">
          <input className="input" value={f.client_id} onChange={(e) => setF({ ...f, client_id: e.target.value.trim() })} autoComplete="off" />
        </Campo>
        <Campo rotulo="Client Secret" ajuda={dados.tem_secret ? 'Já guardado. Deixe em branco para manter.' : undefined}>
          <input className="input" type="password" value={f.client_secret} onChange={(e) => setF({ ...f, client_secret: e.target.value })} placeholder={dados.tem_secret ? '•••• guardado' : ''} autoComplete="new-password" />
        </Campo>
        <Campo rotulo="Certificado (.pem, .crt ou .cer)" ajuda={f.certificado_novo ? 'Novo certificado carregado — será conferido ao salvar.' : dados.certificado ? 'Já guardado. Escolha outro só para trocar (renovação).' : 'O certificado assinado baixado no Portal do Sicredi.'}>
          <input className="input" type="file" accept=".pem,.crt,.cer,.cert" onChange={arquivo('CERTIFICATE')} />
        </Campo>
        <Campo rotulo="Chave privada (.key ou .pem)" ajuda={f.chave_privada ? 'Nova chave carregada.' : dados.tem_chave_privada ? 'Já guardada. Escolha outra só para trocar.' : 'A chave privada baixada junto com o certificado.'}>
          <input className="input" type="file" accept=".key,.pem" onChange={arquivo('PRIVATE KEY')} />
        </Campo>
        <Campo rotulo="Validade do QR (horas)" ajuda="Depois disso o app gera um QR novo para a mesma mensalidade.">
          <input className="input" type="number" min={1} max={720} value={f.expiracao_horas} onChange={(e) => setF({ ...f, expiracao_horas: Number(e.target.value) })} />
        </Campo>
      </div>
      <label className="check">
        <input type="checkbox" checked={f.ativo} onChange={(e) => setF({ ...f, ativo: e.target.checked })} />
        <span>
          <b>Usar o Pix do Sicredi</b> nas mensalidades (o sistema testa a conexão antes de ativar)
        </span>
      </label>
      <p className="muted small" style={{ margin: 0 }}>
        A chave privada e o Client Secret ficam guardados no servidor e nunca voltam para a tela. Com o Pix do Sicredi ativo, a conferência é feita a cada 2 minutos e, enquanto o sócio está na tela de pagamento, a cada poucos segundos.
      </p>
      <div>
        <button className="btn" disabled={ocupado}>
          {ocupado ? 'Conferindo com o Sicredi…' : 'Salvar'}
        </button>
      </div>
    </form>
  );
}

/** Cartão de crédito pelo Mercado Pago, com a taxa repassada ao sócio. */
function PagamentoCartao() {
  const { dados, erro, recarregar } = useDados(() => api.get<{ ativo: boolean; tem_token: boolean; taxa_pct: number; taxa_fixa: number }>('/admin/cartao'));
  const [f, setF] = useState<{ ativo: boolean; token: string; taxa_pct: string; taxa_fixa: string } | null>(null);
  const { ocupado, rodar } = useAcao();
  useEffect(() => {
    if (dados) setF({ ativo: dados.ativo, token: '', taxa_pct: String(dados.taxa_pct).replace('.', ','), taxa_fixa: String(dados.taxa_fixa).replace('.', ',') });
  }, [dados]);
  if (!f || !dados) return <Estado erro={erro} />;
  const pct = Number(f.taxa_pct.replace(',', '.')) || 0;
  const fixa = Number(f.taxa_fixa.replace(',', '.')) || 0;
  const exemplo = (v: number) => (Math.ceil(((v + fixa) / (1 - pct / 100)) * 100 - 1e-6) / 100).toFixed(2).replace('.', ',');
  return (
    <form
      className="card stack"
      onSubmit={(e) => {
        e.preventDefault();
        rodar(() => api.put('/admin/cartao', f), 'Pagamento com cartão salvo.').then((ok) => ok && recarregar());
      }}
    >
      <h2>Pagamento com cartão (Mercado Pago)</h2>
      <p className="muted" style={{ margin: 0 }}>
        O sócio paga a mensalidade com cartão no site seguro do Mercado Pago e a baixa é automática. A <b>taxa do cartão é paga pelo sócio</b>: o valor é aumentado para que, descontada a taxa, a associação receba a mensalidade inteira.
      </p>
      <Campo rotulo="Access Token de produção do Mercado Pago" ajuda={dados.tem_token ? 'Já guardado. Deixe em branco para manter.' : 'No Mercado Pago: Seu negócio → Configurações → Credenciais (começa com APP_USR-).'}>
        <input className="input" type="password" value={f.token} onChange={(e) => setF({ ...f, token: e.target.value })} placeholder={dados.tem_token ? '•••• guardado' : 'APP_USR-…'} autoComplete="new-password" />
      </Campo>
      <div className="grid2">
        <Campo rotulo="Taxa do cartão (%)" ajuda="A que o Mercado Pago cobra no seu plano (ex.: 4,98 para receber na hora).">
          <input className="input" inputMode="decimal" value={f.taxa_pct} onChange={(e) => setF({ ...f, taxa_pct: e.target.value })} />
        </Campo>
        <Campo rotulo="Taxa fixa por pagamento (R$)" ajuda="Se o seu plano tiver; senão, deixe 0.">
          <input className="input" inputMode="decimal" value={f.taxa_fixa} onChange={(e) => setF({ ...f, taxa_fixa: e.target.value })} />
        </Campo>
      </div>
      <p className="muted small" style={{ margin: 0 }}>
        Exemplo: mensalidade de R$ 10,00 → o sócio paga <b>R$ {exemplo(10)}</b> no cartão; de R$ 20,00 → <b>R$ {exemplo(20)}</b>.
      </p>
      <label className="check">
        <input type="checkbox" checked={f.ativo} onChange={(e) => setF({ ...f, ativo: e.target.checked })} />
        <span>
          <b>Oferecer pagamento com cartão</b> no app dos sócios
        </span>
      </label>
      <div>
        <button className="btn" disabled={ocupado}>
          {ocupado ? 'Conferindo com o Mercado Pago…' : 'Salvar'}
        </button>
      </div>
    </form>
  );
}

function Associacao({ admin, aoSalvar }: { admin: boolean; aoSalvar?: () => void }) {
  const { dados, erro } = useDados(() => api.get<Record<string, string>>('/admin/config'));
  const [f, setF] = useState<Record<string, string>>({});
  const { ocupado, rodar } = useAcao();
  useEffect(() => {
    if (dados) setF(dados);
  }, [dados]);
  if (!dados) return <Estado erro={erro} />;
  const campo = (k: string, rotulo: string, ajuda?: string, tipo = 'text') => (
    <Campo rotulo={rotulo} ajuda={ajuda}>
      <input className="input" type={tipo} value={f[k] ?? ''} onChange={(e) => setF({ ...f, [k]: e.target.value })} disabled={!admin} />
    </Campo>
  );
  return (
    <div className="card stack">
      <h2>Associação e PIX</h2>
      {campo('nome_associacao', 'Nome da associação')}
      {campo('email_associacao', 'E-mail para documentos', 'Aparece no app para o sócio enviar laudos e documentos.')}
      <div className="grid2">
        {campo('valor_ate_2sm', 'Mensalidade — renda até 2 SM (R$)', undefined, 'number')}
        {campo('valor_acima_2sm', 'Mensalidade — renda acima de 2 SM (R$)', undefined, 'number')}
      </div>
      <h3>PIX para receber as mensalidades</h3>
      <p className="muted small">Com a chave preenchida, o app Associados mostra o QR Code e o “PIX copia e cola” já com o valor da mensalidade.</p>
      {campo('pix_chave', 'Chave PIX', 'CNPJ, e-mail, telefone (+5595...) ou chave aleatória.')}
      <div className="grid2">
        {campo('pix_nome', 'Nome do recebedor')}
        {campo('pix_cidade', 'Cidade')}
      </div>
      <h3>Cores das campanhas do mês</h3>
      <label className="check">
        <input type="checkbox" checked={f.campanhas !== '0'} onChange={(e) => setF({ ...f, campanhas: e.target.checked ? '1' : '0' })} disabled={!admin} />
        <span>Mudar a cor dos apps conforme a campanha de conscientização do mês (Abril Azul, Setembro Verde, Outubro Rosa…) e mostrar a faixa da campanha no app dos sócios.</span>
      </label>
      {admin && (
        <div>
          <button className="btn" disabled={ocupado} onClick={() => rodar(() => api.put('/admin/config', f), 'Configurações salvas.').then((ok) => ok && aoSalvar?.())}>
            Salvar
          </button>
        </div>
      )}
    </div>
  );
}

function Usuarios({ admin, eu }: { admin: boolean; eu: Usuario }) {
  const { dados, recarregar } = useDados(() => api.get<Usuario[]>('/admin/usuarios'));
  const [f, setF] = useState({ nome: '', login: '', senha: '', papel: 'tesoureiro' });
  const { ocupado, rodar } = useAcao();
  return (
    <div className="card stack">
      <h2>Pessoas com acesso ao Financeiro</h2>
      <ul className="list">
        {dados?.map((u) => (
          <li key={u.id}>
            <div className="sp">
              <b>{u.nome}</b> <span className="muted small">({u.login})</span>
            </div>
            {admin && u.id !== eu.id ? (
              <select
                className="input sm"
                style={{ width: 'auto' }}
                aria-label={`Perfil de ${u.nome}`}
                value={u.papel}
                disabled={ocupado}
                onChange={(e) => {
                  const papel = e.target.value;
                  rodar(() => api.put(`/admin/usuarios/${u.id}`, { papel }), `${u.nome} agora é ${nomePapel(papel)}.`).then(recarregar);
                }}
              >
                {PAPEIS.map((x) => (
                  <option key={x.valor} value={x.valor}>
                    {x.nome}
                  </option>
                ))}
              </select>
            ) : (
              <span className="tag">{nomePapel(u.papel)}</span>
            )}
            {admin && u.id !== eu.id && (
              <button className="btn ghost sm" disabled={ocupado} onClick={() => confirm(`Remover o acesso de ${u.nome}?`) && rodar(() => api.del(`/admin/usuarios/${u.id}`), 'Acesso removido.').then(recarregar)}>
                Remover
              </button>
            )}
          </li>
        ))}
      </ul>
      {admin && (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            rodar(() => api.post('/admin/usuarios', f), 'Acesso criado.').then((ok) => {
              if (ok) {
                setF({ nome: '', login: '', senha: '', papel: 'tesoureiro' });
                recarregar();
              }
            });
          }}
        >
          <h3>Adicionar pessoa</h3>
          <div className="grid2">
            <Campo rotulo="Nome">
              <input className="input" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} required />
            </Campo>
            <Campo rotulo="Usuário">
              <input className="input" value={f.login} onChange={(e) => setF({ ...f, login: e.target.value })} required autoCapitalize="none" />
            </Campo>
            <Campo rotulo="Senha inicial" ajuda="Pelo menos 8 caracteres.">
              <input className="input" type="password" value={f.senha} onChange={(e) => setF({ ...f, senha: e.target.value })} required autoComplete="new-password" />
            </Campo>
            <Campo rotulo="Permissão">
              <select className="input" value={f.papel} onChange={(e) => setF({ ...f, papel: e.target.value })}>
                {PAPEIS.map((x) => (
                  <option key={x.valor} value={x.valor}>
                    {x.nome} ({x.descricao})
                  </option>
                ))}
              </select>
            </Campo>
          </div>
          <div>
            <button className="btn sec" disabled={ocupado}>
              Adicionar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function MinhaSenha() {
  const [f, setF] = useState({ atual: '', nova: '' });
  const { ocupado, rodar } = useAcao();
  return (
    <form
      className="card stack"
      onSubmit={(e) => {
        e.preventDefault();
        rodar(() => api.post('/admin/senha', f), 'Senha alterada.').then((ok) => ok && setF({ atual: '', nova: '' }));
      }}
    >
      <h2>Minha senha</h2>
      <div className="grid2">
        <Campo rotulo="Senha atual">
          <input className="input" type="password" value={f.atual} onChange={(e) => setF({ ...f, atual: e.target.value })} required autoComplete="current-password" />
        </Campo>
        <Campo rotulo="Nova senha">
          <input className="input" type="password" value={f.nova} onChange={(e) => setF({ ...f, nova: e.target.value })} required autoComplete="new-password" />
        </Campo>
      </div>
      <div>
        <button className="btn sec" disabled={ocupado}>
          Alterar senha
        </button>
      </div>
    </form>
  );
}
