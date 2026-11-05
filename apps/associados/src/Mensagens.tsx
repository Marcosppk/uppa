import { Conversa } from '@shared/Conversa';
import type { Mensagem } from '@shared/tipos';
import { api } from './api';

/** Conversa privada do sócio com a diretoria. `aoLer` atualiza o contador de não lidas do Início. */
export function Mensagens({ aoLer }: { aoLer: () => void }) {
  return (
    <>
      <h1>Mensagens da diretoria</h1>
      <p className="muted">Conversa só entre você e a diretoria da UPPA. Ninguém mais vê.</p>
      <Conversa
        souDiretoria={false}
        carregar={() =>
          api.get<Mensagem[]>('/associado/mensagens').then((l) => {
            aoLer();
            return l;
          })
        }
        enviar={(texto) => api.post('/associado/mensagens', { texto })}
        vazio="Nenhuma mensagem ainda. Se precisar falar com a diretoria, escreva aqui."
      />
    </>
  );
}
