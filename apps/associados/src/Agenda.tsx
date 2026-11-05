import { Calendario } from '@shared/Calendario';
import type { DataDoMes, Evento } from '@shared/tipos';
import { api } from './api';

export function Agenda() {
  return (
    <>
      <h1>Calendário da UPPA</h1>
      <p className="muted">Reuniões, oficinas e eventos da associação, as datas da causa autista e os aniversários da sua família.</p>
      <Calendario carregar={(mes) => api.get<{ eventos: Evento[]; datas: DataDoMes[] }>(`/associado/agenda?mes=${mes}`)} />
    </>
  );
}
