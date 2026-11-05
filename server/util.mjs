import crypto from 'node:crypto';

export const soDigitos = (s) => String(s ?? '').replace(/\D/g, '');

export function cpfValido(cpf) {
  const d = soDigitos(cpf);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const dv = (n) => {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(d[i]) * (n + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
}

export function hashSenha(senha) {
  const sal = crypto.randomBytes(16).toString('hex');
  const h = crypto.scryptSync(String(senha), sal, 64).toString('hex');
  return `${sal}:${h}`;
}

export function conferirSenha(senha, guardado) {
  if (!guardado) return false;
  const [sal, h] = guardado.split(':');
  const calc = crypto.scryptSync(String(senha), sal, 64);
  return crypto.timingSafeEqual(calc, Buffer.from(h, 'hex'));
}

export const novoToken = () => crypto.randomBytes(32).toString('base64url');

/** Código curto e estável usado no QR da carteirinha (não revela o CPF). */
export function codigoCarteirinha(socio, segredo) {
  return crypto.createHmac('sha256', segredo).update(`socio:${socio.id}`).digest('base64url').slice(0, 16);
}

// ---- PIX "copia e cola" (BR Code estático, padrão EMV do Banco Central) ----
const campo = (id, valor) => `${id}${String(valor.length).padStart(2, '0')}${valor}`;
const semAcento = (s, max) =>
  String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9 ]/g, '').toUpperCase().slice(0, max);

function crc16(payload) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    crc &= 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function pixCopiaECola({ chave, nome, cidade, valor, txid }) {
  const conta = campo('00', 'br.gov.bcb.pix') + campo('01', chave);
  let p =
    campo('00', '01') +
    campo('26', conta) +
    campo('52', '0000') +
    campo('53', '986') +
    (valor ? campo('54', Number(valor).toFixed(2)) : '') +
    campo('58', 'BR') +
    campo('59', semAcento(nome, 25) || 'UPPA') +
    campo('60', semAcento(cidade, 15) || 'BOA VISTA') +
    campo('62', campo('05', (semAcento(txid || '***', 25).replace(/ /g, '') || '***')));
  p += '6304';
  return p + crc16(p);
}

export class ErroHttp extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}
export const erro = (status, mensagem) => new ErroHttp(status, mensagem);
