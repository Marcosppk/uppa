// Campos de data e de mês em que dá para DIGITAR (dd/mm/aaaa ou mm/aaaa, as barras entram sozinhas),
// com o botão de calendário ao lado para quem prefere escolher. O valor continua no formato do sistema
// (aaaa-mm-dd ou aaaa-mm), então nada muda para quem usa o campo.
import { useEffect, useRef, useState } from 'react';
import { Icone } from './ui';

type Tipo = 'data' | 'mes';
const TAM = { data: 8, mes: 6 }; // quantidade de dígitos

/** "1/5/85" → "01/05/1985"; "12052024" → "12/05/2024". Barra digitada completa o número com zero. */
function mascarar(bruto: string, tipo: Tipo) {
  const partes = bruto.split(/\D+/);
  const nPartes = tipo === 'data' ? 2 : 1; // partes antes do ano
  let d = '';
  partes.forEach((p, i) => {
    d += i < nPartes && i < partes.length - 1 && p.length === 1 ? '0' + p : p;
  });
  d = d.slice(0, TAM[tipo]);
  if (tipo === 'mes') return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  return d.length > 4 ? `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}` : d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

/** Texto digitado → valor do sistema ('' se vazio, null se incompleto ou inválido). */
function paraValor(texto: string, tipo: Tipo): string | null {
  const d = texto.replace(/\D/g, '');
  if (!d) return '';
  if (d.length < TAM[tipo]) return null;
  if (tipo === 'mes') {
    const [m, a] = [Number(d.slice(0, 2)), Number(d.slice(2))];
    return m >= 1 && m <= 12 && a >= 1900 ? `${a}-${String(m).padStart(2, '0')}` : null;
  }
  const [dia, m, a] = [Number(d.slice(0, 2)), Number(d.slice(2, 4)), Number(d.slice(4))];
  const dt = new Date(Date.UTC(a, m - 1, dia));
  if (a < 1900 || dt.getUTCFullYear() !== a || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== dia) return null;
  return `${a}-${String(m).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

/** Valor do sistema → texto do campo. */
function paraTexto(valor: string | null | undefined, tipo: Tipo) {
  if (!valor) return '';
  const [a, m, d] = valor.split('-');
  return tipo === 'mes' ? `${m}/${a}` : `${d}/${m}/${a}`;
}

const suporta = (tipo: string) => {
  const i = document.createElement('input');
  i.setAttribute('type', tipo);
  return i.type === tipo;
};

function CampoTempo({
  tipo,
  valor,
  aoMudar,
  min,
  max,
  required,
  autoComplete,
}: {
  tipo: Tipo;
  valor: string | null | undefined;
  aoMudar: (v: string) => void;
  min?: string;
  max?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  const [texto, setTexto] = useState(() => paraTexto(valor, tipo));
  const emitido = useRef(valor ?? '');
  const campo = useRef<HTMLInputElement>(null);
  const nativo = useRef<HTMLInputElement>(null);
  const [temCalendario] = useState(() => suporta(tipo === 'mes' ? 'month' : 'date'));

  // Mudou por fora (outro registro, formulário limpo): mostra o novo valor.
  useEffect(() => {
    if ((valor ?? '') !== emitido.current) {
      emitido.current = valor ?? '';
      setTexto(paraTexto(valor, tipo));
    }
  }, [valor, tipo]);

  // Avisa no próprio campo quando a data está incompleta, inválida ou fora do permitido.
  const validar = (t: string) => {
    const v = paraValor(t, tipo);
    const exemplo = tipo === 'mes' ? 'mm/aaaa' : 'dd/mm/aaaa';
    let msg = '';
    if (v === null) msg = `Data incompleta ou inválida. Use ${exemplo}.`;
    else if (v && max && v > max) msg = `A data não pode ser depois de ${paraTexto(max, tipo)}.`;
    else if (v && min && v < min) msg = `A data não pode ser antes de ${paraTexto(min, tipo)}.`;
    campo.current?.setCustomValidity(msg);
    return v;
  };

  const mudar = (t: string) => {
    setTexto(t);
    const v = validar(t);
    const novo = v ?? '';
    if (novo !== emitido.current) {
      emitido.current = novo;
      aoMudar(novo);
    }
  };

  useEffect(() => {
    validar(texto);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  // Ano com 2 dígitos ao sair do campo: 85 → 1985, 24 → 2024.
  const aoSair = () => {
    const d = texto.replace(/\D/g, '');
    const semAno = TAM[tipo] - 4;
    if (d.length === semAno + 2) {
      const aa = Number(d.slice(semAno));
      const seculo = aa > (new Date().getFullYear() % 100) + 1 ? 1900 : 2000;
      mudar(mascarar(d.slice(0, semAno) + String(seculo + aa), tipo));
    }
  };

  const abrirCalendario = () => {
    try {
      nativo.current?.showPicker();
    } catch {
      /* navegador sem showPicker: o toque no campo nativo já abre o calendário */
    }
  };

  return (
    <span className="campo-data">
      <input
        ref={campo}
        className="input"
        inputMode="numeric"
        placeholder={tipo === 'mes' ? 'mm/aaaa' : 'dd/mm/aaaa'}
        maxLength={tipo === 'mes' ? 7 : 10}
        value={texto}
        onChange={(e) => mudar(mascarar(e.target.value, tipo))}
        onBlur={aoSair}
        required={required}
        autoComplete={autoComplete ?? 'off'}
      />
      {temCalendario && (
        <span className="abrir-calendario" title="Escolher no calendário">
          <Icone nome="agenda" />
          <input
            ref={nativo}
            type={tipo === 'mes' ? 'month' : 'date'}
            tabIndex={-1}
            aria-hidden="true"
            value={paraValor(texto, tipo) || ''}
            min={min}
            max={max}
            onClick={abrirCalendario}
            onChange={(e) => mudar(paraTexto(e.target.value, tipo))}
          />
        </span>
      )}
    </span>
  );
}

type Props = { valor: string | null | undefined; aoMudar: (v: string) => void; min?: string; max?: string; required?: boolean; autoComplete?: string };
/** Data (valor aaaa-mm-dd). */
export const CampoData = (p: Props) => <CampoTempo tipo="data" {...p} />;
/** Mês (valor aaaa-mm). */
export const CampoMes = (p: Props) => <CampoTempo tipo="mes" {...p} />;
