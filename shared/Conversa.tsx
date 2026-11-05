// Conversa privada entre a diretoria e um sócio (mesmo componente nos dois apps).
import { useEffect, useRef, useState } from 'react';
import { Estado, Icone, useAcao, useDados } from './ui';
import { TextoAviso } from './TextoAviso';
import type { Mensagem } from './tipos';

const quando = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export function Conversa({
  carregar,
  enviar,
  souDiretoria,
  vazio,
}: {
  carregar: () => Promise<Mensagem[]>;
  enviar: (texto: string) => Promise<unknown>;
  souDiretoria: boolean;
  vazio: string;
}) {
  const { dados, erro, recarregar } = useDados(carregar);
  const [texto, setTexto] = useState('');
  const { ocupado, rodar } = useAcao();
  const fim = useRef<HTMLDivElement>(null);
  useEffect(() => {
    fim.current?.scrollIntoView({ block: 'nearest' });
  }, [dados]);
  // Confere novas mensagens a cada 30 s enquanto a conversa está aberta.
  useEffect(() => {
    const t = setInterval(recarregar, 30e3);
    return () => clearInterval(t);
  }, [recarregar]);

  return (
    <div className="stack">
      <div className="conversa" role="log" aria-live="polite" aria-label="Mensagens">
        {!dados ? (
          <Estado erro={erro} />
        ) : dados.length === 0 ? (
          <div className="empty">{vazio}</div>
        ) : (
          dados.map((m) => {
            const minha = (m.de === 'diretoria') === souDiretoria;
            return (
              <div key={m.id} className={`balao ${minha ? 'minha' : 'outra'}`}>
                <span className="balao-autor">{m.de === 'diretoria' ? `${m.autor} · Diretoria UPPA` : m.autor}</span>
                <TextoAviso texto={m.texto} />
                <span className="balao-hora">
                  {quando(m.criado_em)}
                  {minha && m.lida_em ? ' · lida' : ''}
                </span>
              </div>
            );
          })
        )}
        <div ref={fim} />
      </div>
      <form
        className="row conversa-escrever"
        onSubmit={(e) => {
          e.preventDefault();
          rodar(() => enviar(texto)).then((ok) => {
            if (ok) {
              setTexto('');
              recarregar();
            }
          });
        }}
      >
        <label className="sr-only" htmlFor="nova-mensagem">
          Escrever mensagem
        </label>
        <textarea id="nova-mensagem" className="input sp" rows={2} maxLength={2000} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escreva sua mensagem…" required />
        <button className="btn" disabled={ocupado || !texto.trim()}>
          <Icone nome="enviar" /> Enviar
        </button>
      </form>
    </div>
  );
}
