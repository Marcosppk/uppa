// Política de privacidade (LGPD), aberta em /privacidade. A Apple e o Google exigem um endereço público
// para ela, e o app mostra o link em "Sobre o app" e em "Excluir minha conta".
// O texto descreve o que o sistema faz de verdade: se mudar o que o app guarda ou com quem compartilha,
// atualize aqui e a data no fim.
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export const ATUALIZADA_EM = '09/11/2026';

export function paginaPrivacidade(config) {
  const nome = esc(config.nome_associacao || 'UPPA — União de Pais e Pessoas Autistas');
  const email = esc(config.email_associacao || '');
  const contato = email ? `pelo e-mail <a href="mailto:${email}">${email}</a>` : 'com a diretoria da associação';
  return `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Política de privacidade — UPPA</title>
<style>
body{font-family:system-ui,-apple-system,sans-serif;background:#f4f7fb;color:#13293d;margin:0;line-height:1.6}
main{max-width:720px;margin:0 auto;padding:32px 20px 64px}
h1{font-size:1.6rem;margin:0 0 4px}h2{font-size:1.15rem;margin:28px 0 8px}
p,li{font-size:1rem}ul{padding-left:1.2em}a{color:#1f6fb2}.muted{color:#5b6b7b;font-size:.92rem}
</style>
<main>
<h1>Política de privacidade</h1>
<p class="muted">Apps UPPA Associados e UPPA Financeiro · ${nome}</p>

<h2>Quem cuida dos seus dados</h2>
<p>A ${nome} (UPPA) é a responsável pelos dados tratados nos apps UPPA Associados e UPPA Financeiro, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018). Fale conosco ${contato}.</p>

<h2>Quais dados guardamos</h2>
<ul>
<li><b>Ficha de sócio:</b> nome, CPF, data de nascimento, e-mail, telefone, endereço, profissão, categoria de associado e as informações socioeconômicas da ficha de inscrição (como renda familiar e recebimento de BPC).</li>
<li><b>Família:</b> nome e data de nascimento das pessoas autistas da família e, quando houver, nome e CPF do dependente.</li>
<li><b>Foto e documentos</b> que você ou a diretoria enviam, como laudos, documento de identidade e comprovante de residência. Laudos são dados de saúde e recebem cuidado especial.</li>
<li><b>Mensalidades e pagamentos:</b> valores, meses, situação e forma de pagamento.</li>
<li><b>Mensagens</b> trocadas com a diretoria pelo app.</li>
<li><b>Dados de acesso:</b> sua senha, guardada de forma cifrada (nem a equipe consegue lê-la), e o endereço IP das tentativas de entrada, usado só para bloquear quem tenta adivinhar senhas.</li>
</ul>
<p>Os apps não usam publicidade, não rastreiam você em outros apps ou sites e não vendem dados.</p>

<h2>Para que usamos</h2>
<ul>
<li>Fazer e manter sua associação: inscrição, carteirinha digital, cadastro da família e verificação da carteirinha pelo QR Code.</li>
<li>Cobrar e dar baixa nas mensalidades e manter a contabilidade da associação.</li>
<li>Comunicar avisos, eventos e mensagens da diretoria.</li>
<li>Laudos e documentos: comprovar a condição da pessoa autista e permitir que a UPPA encaminhe e defenda os direitos da família. Esses dados só são tratados com o seu consentimento, dado ao enviá-los.</li>
</ul>

<h2>Quem vê os seus dados</h2>
<p>Só você e a equipe autorizada da UPPA (presidência, diretoria e tesouraria), pelo app UPPA Financeiro. Quem confere a sua carteirinha pelo QR Code vê apenas nome, número de matrícula, categoria, foto e se a associação está ativa.</p>
<p>Compartilhamos o mínimo necessário com estes serviços:</p>
<ul>
<li><b>Sicredi:</b> nome e CPF, para gerar a cobrança Pix da mensalidade.</li>
<li><b>Mercado Pago:</b> a mensalidade a pagar, quando você escolhe pagar com cartão. Os dados do cartão são digitados no site do Mercado Pago e não passam pela UPPA.</li>
<li><b>Avisos para a diretoria</b> (e-mail, WhatsApp ou SMS), quando chega uma inscrição: só o nome, a categoria e quem convidou. Não vão CPF, telefone nem dados de saúde.</li>
</ul>

<h2>Onde ficam e por quanto tempo</h2>
<p>Os dados ficam no servidor da UPPA e trafegam sempre de forma cifrada (HTTPS). Mantemos os dados enquanto você for sócio. O servidor faz uma cópia de segurança por dia: as cópias diárias são guardadas por 14 dias e a última de cada mês por 12 meses. Depois disso, são apagadas.</p>

<h2>Seus direitos</h2>
<p>Você pode, a qualquer momento:</p>
<ul>
<li><b>ver e corrigir</b> seus dados no app, em <b>Meus dados</b>. Para mudar nome, CPF ou categoria, fale com a diretoria;</li>
<li><b>apagar fotos e documentos</b> que enviou, em <b>Meus dados</b>;</li>
<li><b>excluir a sua conta</b> no próprio app, em <b>Meus dados → Excluir minha conta</b>. A exclusão é imediata e apaga a ficha, a família, as mensalidades, a foto, os documentos e as mensagens. Os lançamentos do caixa referentes a valores já pagos continuam, sem o seu nome, porque a associação precisa manter a contabilidade. As cópias de segurança antigas são apagadas no prazo descrito acima;</li>
<li><b>pedir informações</b> sobre o uso dos seus dados, retirar um consentimento ou fazer qualquer outro pedido previsto na LGPD ${contato}.</li>
</ul>

<h2>Crianças e adolescentes</h2>
<p>Os dados de crianças e adolescentes autistas da família são informados pelo pai, mãe ou responsável, no interesse da própria criança, para que a UPPA possa apoiá-la.</p>

<h2>Mudanças nesta política</h2>
<p>Se esta política mudar, a nova versão será publicada neste endereço, com a data abaixo.</p>
<p class="muted">Atualizada em ${ATUALIZADA_EM}.</p>
</main></html>`;
}

// Ajuda e contato, aberta em /suporte: a App Store exige um endereço de suporte ("Support URL") na página do app.
export function paginaSuporte(config) {
  const nome = esc(config.nome_associacao || 'UPPA — União de Pais e Pessoas Autistas');
  const email = esc(config.email_associacao || '');
  const contato = email ? `Escreva para <a href="mailto:${email}">${email}</a>.` : 'Fale com a diretoria da associação.';
  return `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ajuda — Apps da UPPA</title>
<style>
body{font-family:system-ui,-apple-system,sans-serif;background:#f4f7fb;color:#13293d;margin:0;line-height:1.6}
main{max-width:720px;margin:0 auto;padding:32px 20px 64px}
h1{font-size:1.6rem;margin:0 0 4px}h2{font-size:1.15rem;margin:28px 0 8px}a{color:#1f6fb2}.muted{color:#5b6b7b;font-size:.92rem}
</style>
<main>
<h1>Ajuda — apps da UPPA</h1>
<p class="muted">UPPA Associados e UPPA Financeiro · ${nome}</p>
<h2>Fale com a UPPA</h2>
<p>${contato} Respondemos dúvidas sobre a associação, a carteirinha, as mensalidades e o uso dos apps.</p>
<h2>Esqueci minha senha</h2>
<p>Peça à diretoria para voltar a sua senha para a padrão. No próximo acesso, entre com o seu CPF e a senha padrão, e o app pede para criar uma senha nova.</p>
<h2>Como me associo?</h2>
<p>No app UPPA Associados, toque em <b>Ainda não sou sócio — quero me associar</b> e preencha a ficha de inscrição. A diretoria confere e aprova a inscrição.</p>
<h2>Excluir minha conta</h2>
<p>No app UPPA Associados, abra <b>Meus dados</b> e, no fim da tela, toque em <b>Excluir minha conta</b>. Veja o que é apagado na <a href="/privacidade">política de privacidade</a>.</p>
</main></html>`;
}
