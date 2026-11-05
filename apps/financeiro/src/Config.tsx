import { useEffect, useState } from 'react';
import { useDados, Estado, Campo, useAcao, Icone } from '@shared/ui';
import { api, type Usuario } from './api';
import { PainelAcessibilidade } from '@shared/acessibilidade';
import { SobreVersao } from '@shared/versao';

const PLANILHA = 'https://docs.google.com/spreadsheets/d/1Y00-9TRPKGj2XAkia7sp-TdeYdnAYuBtF-rS7pi2JIM/edit?resourcekey#gid=2130497015';

interface Resumo {
  lidos: number;
  criados: number;
  atualizados: number;
  mensalidades: number;
  avisos: string[];
}

export function Config({ usuario, aoSair }: { usuario: Usuario; aoSair: () => void }) {
  const admin = usuario.papel === 'admin';
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
      <Associacao admin={admin} />
      <Usuarios admin={admin} eu={usuario} />
      <MinhaSenha />
      <PainelAcessibilidade />
      <SobreVersao />
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

function Associacao({ admin }: { admin: boolean }) {
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
      {admin && (
        <div>
          <button className="btn" disabled={ocupado} onClick={() => rodar(() => api.put('/admin/config', f), 'Configurações salvas.')}>
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
            <span className="tag">{u.papel === 'admin' ? 'Administrador' : 'Tesoureiro'}</span>
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
                <option value="tesoureiro">Tesoureiro (sócios, mensalidades, caixa)</option>
                <option value="admin">Administrador (tudo, inclusive ajustes)</option>
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
