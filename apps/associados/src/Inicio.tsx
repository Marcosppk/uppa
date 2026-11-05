import { useDados, Logo, TagMensalidade, Icone } from '@shared/ui';
import { dinheiro, mesExtenso, primeiroNome, dataBr, competenciaAtual } from '@shared/formato';
import type { Aviso, Evento } from '@shared/tipos';
import { Avatar } from '@shared/Foto';
import { FaixaCampanha } from '@shared/campanhas';
import { horario } from '@shared/Calendario';
import { LinkCadastro, type Convite } from '@shared/LinkCadastro';
import { AnexosAviso } from '@shared/Anexos';
import { TextoAviso } from '@shared/TextoAviso';
import { BotaoOuvir } from '@shared/acessibilidade';
import { Presente } from './Presente';
import { api, type Eu } from './api';

export function Inicio({ eu }: { eu: Eu }) {
  const { socio, mensalidades } = eu;
  const avisos = useDados(() => api.get<Aviso[]>('/associado/avisos')).dados;
  const proximos = useDados(() => api.get<Evento[]>('/associado/agenda/proximos')).dados;
  const abertas = mensalidades.filter((m) => m.status === 'pendente');
  const doMes = mensalidades.find((m) => m.competencia === competenciaAtual());

  return (
    <>
      <div className="ola">
        {socio.foto ? <Avatar nome={socio.nome} foto={socio.foto} tamanho={60} /> : <Logo tamanho={60} />}
        <div className="sp">
          <h1>Olá, {primeiroNome(socio.nome)}!</h1>
          <p className="muted small">{eu.associacao.nome}</p>
        </div>
        <a className="btn sec sm botao-mensagens" href="#/mensagens" aria-label={eu.nao_lidas ? `Mensagens da diretoria, ${eu.nao_lidas} nova(s)` : 'Mensagens da diretoria'}>
          <Icone nome="mensagem" />
          {eu.nao_lidas > 0 && <span className="selo-numero">{eu.nao_lidas}</span>}
        </a>
      </div>

      {eu.associacao.campanhas && <FaixaCampanha />}

      {eu.nao_lidas > 0 && (
        <a className="alert info row" href="#/mensagens" style={{ textDecoration: 'none', marginBottom: 12 }}>
          <span className="sp">
            ✉️ Você tem <b>{eu.nao_lidas}</b> {eu.nao_lidas === 1 ? 'mensagem nova' : 'mensagens novas'} da diretoria.
          </span>
          <Icone nome="seta" />
        </a>
      )}

      {eu.comemoracoes.length > 0 && <Presente comemoracoes={eu.comemoracoes} nome={primeiroNome(socio.nome)} />}

      {!socio.nascimento && (
        <a className="alert info row" href="#/dados" style={{ textDecoration: 'none', marginBottom: 12 }}>
          <span className="sp">🎂 Informe sua data de nascimento em Meus dados para receber os parabéns da UPPA no seu aniversário.</span>
          <Icone nome="seta" />
        </a>
      )}

      {socio.status === 'pendente' && (
        <div className="alert warn" style={{ marginBottom: 12 }}>
          <b>Sua inscrição está em análise.</b> Assim que a diretoria aprovar, sua carteirinha de sócio aparece aqui. Envie os laudos e documentos em <a href="#/dados">Meus dados</a> (dá para tirar foto pelo celular).
        </div>
      )}
      {socio.status === 'inativo' && (
        <div className="alert bad" style={{ marginBottom: 12 }}>
          Seu cadastro está inativo. Fale com a diretoria da UPPA para reativar.
        </div>
      )}

      {socio.status === 'ativo' && doMes && (
        <a className="card mens-atual row" href="#/mensalidades" style={{ textDecoration: 'none', color: 'inherit', display: 'flex' }}>
          <div className="sp">
            <span className="muted small">Mensalidade de</span>
            <h2 style={{ margin: 0 }}>{mesExtenso(doMes.competencia)}</h2>
            <span className="num">{doMes.status === 'isenta' ? 'Isento' : dinheiro(doMes.valor)}</span>
          </div>
          <TagMensalidade status={doMes.status} />
          <Icone nome="seta" />
        </a>
      )}
      {abertas.length > 1 && (
        <div className="alert warn" style={{ marginTop: 12 }}>
          Você tem {abertas.length} mensalidades em aberto. <a href="#/mensalidades">Ver mensalidades</a>
        </div>
      )}

      <a className="card row sala-convite" href="#/acolhimento" style={{ marginTop: 16, textDecoration: 'none', color: 'inherit', display: 'flex' }}>
        <span style={{ fontSize: '2.2rem' }} aria-hidden="true">
          🧸
        </span>
        <div className="sp">
          <h3 style={{ margin: 0 }}>Sala de acolhimento</h3>
          <p className="muted small" style={{ margin: 0 }}>
            Jogos e brincadeiras calmas: respirar, bolhas, memória, cores, pintar e piano.
          </p>
        </div>
        <Icone nome="seta" />
      </a>

      <div className="card stack" style={{ marginTop: 16 }}>
        <div>
          <h3 style={{ marginBottom: 2 }}>Convide alguém para a UPPA</h3>
          <p className="muted small" style={{ margin: 0 }}>
            Gere um link que abre direto a ficha de inscrição e mande para outras famílias.
          </p>
        </div>
        <LinkCadastro carregar={() => api.get<Convite>('/associado/convite')} />
      </div>

      <div className="row between" style={{ marginTop: 24 }}>
        <h2 style={{ margin: 0 }}>Próximos eventos</h2>
        <a className="btn ghost sm" href="#/agenda">
          <Icone nome="agenda" /> Ver calendário
        </a>
      </div>
      {!proximos ? null : proximos.length === 0 ? (
        <a className="card empty" href="#/agenda" style={{ display: 'block', textDecoration: 'none', marginTop: 8 }}>
          Nenhum evento marcado. Veja o calendário do mês.
        </a>
      ) : (
        <ul className="card list" style={{ marginTop: 8 }}>
          {proximos.map((e) => (
            <li key={e.id} className="click" onClick={() => (location.hash = '#/agenda')}>
              <span className="tag" style={{ minWidth: 64, textAlign: 'center' }}>
                {e.data.split('-').reverse().slice(0, 2).join('/')}
              </span>
              <div className="sp">
                <b>{e.titulo}</b>
                <div className="muted small">
                  {horario(e)}
                  {e.local ? ` · ${e.local}` : ''}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <h2 style={{ marginTop: 24 }}>Avisos da UPPA</h2>
      {!avisos ? null : avisos.length === 0 ? (
        <div className="card empty">Nenhum aviso no momento.</div>
      ) : (
        avisos.map((a) => (
          <article key={a.id} className="card aviso">
            <h3 style={{ marginBottom: 2 }}>{a.titulo}</h3>
            <div className="row between" style={{ marginBottom: 6 }}>
              <span className="muted small">{dataBr(a.criado_em)}</span>
              <BotaoOuvir texto={`${a.titulo}. ${a.texto}`} rotulo="Ouvir o aviso" />
            </div>
            <TextoAviso texto={a.texto} />
            <AnexosAviso anexos={a.anexos} />
          </article>
        ))
      )}
    </>
  );
}
