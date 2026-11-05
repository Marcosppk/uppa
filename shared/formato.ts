const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export const dinheiro = (v: number | null | undefined) =>
  (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** "2026-04" → "Abril de 2026" */
export const mesExtenso = (comp: string) => {
  const [a, m] = comp.split('-').map(Number);
  const mes = MESES[m - 1];
  return `${mes[0].toUpperCase()}${mes.slice(1)} de ${a}`;
};
export const mesCurto = (comp: string) => {
  const [a, m] = comp.split('-').map(Number);
  return `${MESES[m - 1].slice(0, 3)}/${String(a).slice(2)}`;
};

/** "2026-04-15" ou ISO → "15/04/2026" */
export const dataBr = (s: string | null | undefined) => {
  if (!s) return '';
  const [a, m, d] = s.slice(0, 10).split('-');
  return d ? `${d}/${m}/${a}` : s;
};

export const idade = (nasc: string | null | undefined) => {
  if (!nasc) return null;
  const [a, m, d] = nasc.split('-').map(Number);
  const h = new Date();
  let i = h.getFullYear() - a;
  if (h.getMonth() + 1 < m || (h.getMonth() + 1 === m && h.getDate() < d)) i--;
  return i >= 0 && i < 130 ? i : null;
};

export const cpfFormatado = (cpf: string | null | undefined) => {
  const d = (cpf ?? '').replace(/\D/g, '');
  return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : d;
};

/** Máscara enquanto digita. */
export const mascaraCpf = (v: string) =>
  v.replace(/\D/g, '').slice(0, 11).replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');

export const mascaraTelefone = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

export const hojeIso = () => new Date().toLocaleDateString('sv-SE');
export const competenciaAtual = () => hojeIso().slice(0, 7);
export const mudarMes = (comp: string, delta: number) => {
  const [a, m] = comp.split('-').map(Number);
  const d = new Date(a, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0];
