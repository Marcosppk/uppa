# UPPA — União de Pais e Pessoas Autistas

Dois apps integrados, com um servidor (API + banco de dados) em comum:

| App | Para quem | O que faz |
|---|---|---|
| **UPPA Financeiro** | Tesouraria e diretoria | Cadastro de sócios (campos da ficha de inscrição/planilha), aprovação de inscrições, mensalidades, caixa (receitas e despesas), avisos, importação da planilha, exportação CSV |
| **UPPA Associados** | Sócios | Ficha de inscrição, carteirinha digital com QR de verificação, mensalidades com PIX (QR e copia-e-cola), "Já paguei", avisos, atualizar os próprios dados |

## Como os dois se integram

- A **inscrição** feita no Associados chega ao Financeiro como *Aguardando aprovação*. Quando a inscrição é aprovada, o sócio recebe a matrícula e a carteirinha.
- O sócio toca em **"Já paguei"**. A mensalidade aparece no Financeiro como *Pagamento informado*, e a tesouraria confere e confirma. A receita entra no caixa sozinha.
- Pagamento registrado pela tesouraria → aparece como **pago** no app do sócio.
- **Avisos** publicados no Financeiro → aparecem na tela inicial do Associados.
- Mudanças de **valores e chave PIX** feitas em Ajustes valem na hora para todos.

## Rodar no computador

Precisa do Node.js 22.13 ou mais novo.

```bash
npm install
npm run build
npm start
```

Abra http://localhost:3333. Os endereços são `/financeiro/` e `/associados/`.

No primeiro acesso ao **Financeiro**, você cria o usuário administrador. Depois disso:

1. Vá em **Ajustes → Importar planilha** e clique em *Conferir antes (simular)*. Se o resultado estiver certo, clique em *Importar*.
2. Em Ajustes, preencha a **chave PIX** da associação.
3. **Primeiro acesso dos sócios** no Associados: **CPF + senha padrão `12345678`**. Logo em seguida o app obriga a criar uma senha própria (diferente da padrão); a sessão aberta com a senha padrão não mostra nenhum dado até a troca e expira em 30 minutos. No Financeiro, "Voltar senha para a padrão" na ficha do sócio refaz esse processo.

Para desenvolver com recarga automática: `npm run dev` (API na porta 3333, Financeiro na 5173, Associados na 5174).

## Link de cadastro

- Qualquer sócio (app Associados → Início → "Convide alguém") ou pessoa do Financeiro (Sócios → **Link de cadastro**) gera o seu link. Ele abre direto a ficha de inscrição: `/associados/#/inscricao?convite=...`. Sem o código (`/associados/#/inscricao`), o link também abre a ficha.
- A inscrição feita pelo link entra como *Aguardando aprovação* e mostra quem convidou. **Só um usuário Administrador do Financeiro pode autorizar.** O tesoureiro vê a inscrição e pode editar os dados, mas não aprova.

## Parabéns automáticos

- **Aniversários.** No dia do aniversário do sócio (campo *Data de nascimento* da ficha) ou de uma pessoa autista da família, a tela inicial do Associados mostra um **envelope de presente**. Ao tocar, ele abre com fogos e confetes e mostra a mensagem. Se o aparelho estiver configurado para reduzir movimentos, a mensagem aparece direto.
- **Datas da causa.** Em **2 de abril** (Dia Mundial de Conscientização sobre o Autismo) e **18 de junho** (Dia do Orgulho Autista):
  - o servidor publica sozinho um aviso para todos os associados, uma vez por ano (fuso de Boa Vista);
  - o aviso pode ser editado ou excluído em Avisos;
  - no mesmo dia, o envelope também aparece para cada sócio.
- **Financeiro → Painel → Aniversariantes.** Lista os aniversários dos próximos 7 ou 30 dias, de sócios ativos e de pessoas autistas da família. Cada nome tem um botão **WhatsApp** com a mensagem de parabéns pronta para enviar.
- **Data de nascimento.** A planilha não tem a data de nascimento do sócio. O sócio informa em *Meus dados* (o Início lembra) ou a tesouraria preenche na ficha. Quando o sócio também está na lista de pessoas autistas, usa-se a data de lá.

## Anexos nos avisos

Em Financeiro → Avisos, cada aviso aceita até **8 anexos de até 10 MB**:

- **imagens:** JPG, PNG, WEBP e GIF;
- **arquivos de texto:** PDF, DOC, DOCX, ODT, RTF e TXT.

Fotos grandes são reduzidas antes do envio. O servidor confere o conteúdo de cada arquivo e recusa outros tipos, como .exe, .html e .svg. No Associados:

- as imagens aparecem em miniatura (tocar abre grande);
- os arquivos aparecem como links.

Os anexos ficam guardados no banco (`uppa.db`), então entram na cópia de segurança.

## Mural de avisos: links e vídeos

- Endereços (`https://…`, `www.…`) e e-mails escritos no texto do aviso viram **links clicáveis**.
- Um link do **YouTube** no texto vira um player que toca no próprio mural. Funciona com `watch`, `youtu.be`, `shorts` e `live`.
- **Vídeos** (MP4, MOV e WEBM, até 60 MB) podem ir como anexo e tocam no mural, sem precisar baixar antes.
- No Associados, cada aviso tem o botão **🔊 Ouvir o aviso**, que lê o texto em voz alta com a voz do celular.

## Aviso de nova inscrição (e-mail, WhatsApp e SMS)

Em Financeiro → Ajustes → **Aviso de nova inscrição** (só administradores):

- **E-mail.** Coloque os e-mails que recebem o aviso, um Gmail da associação que envia as mensagens e a **senha de app** desse Gmail. A senha de app é criada em Conta Google → Segurança → Verificação em duas etapas → Senhas de app; a senha normal não serve.
- **WhatsApp.** Usa o serviço gratuito [CallMeBot](https://www.callmebot.com/blog/free-api-whatsapp-messages/):
  1. Cada pessoa que vai receber manda, do próprio WhatsApp, a mensagem de ativação indicada no site.
  2. A pessoa recebe uma chave (apikey).
  3. Cadastre o número e a chave em Ajustes.
- **SMS.** SMS é **pago por mensagem**, então precisa de uma conta da associação num serviço de SMS. Escolha um dos dois:
  - [Zenvia](https://www.zenvia.com), brasileira, cobra em reais. Precisa do **token da API** (painel → Integrações) e do **remetente** cadastrado.
  - [Twilio](https://www.twilio.com). Precisa do **Account SID** (começa com AC), do **Auth Token** e do **número Twilio** que envia.
  Coloque os celulares que recebem, separados por vírgula. O texto vai sem acentos para caber num SMS só, por exemplo: "UPPA: nova inscricao de Fulano pelo app. Autorize no UPPA Financeiro: …".
- **Enviar teste** confere se está tudo certo e mostra o resultado de cada canal.
- **O que vai na mensagem:** só o nome, a categoria, quem convidou e o link para autorizar. Nada de CPF ou de dados de saúde.
- **Onde ficam as credenciais:** a senha do Gmail, as chaves do WhatsApp e o token do SMS ficam guardados no banco e nunca aparecem na tela.

## Cópias de segurança

O servidor faz sozinho **uma cópia por dia** do banco inteiro (sócios, mensalidades, caixa, avisos e anexos), confere a integridade e guarda em `C:\UPPA\dados\copias`. Ficam guardadas:

- as cópias dos **últimos 14 dias**;
- **uma de cada mês**, por 12 meses;
- as **20 mais novas** feitas pelo botão ou antes de importar.

Antes de cada importação da planilha também é feita uma cópia. Em Ajustes → **Cópias de segurança** (só administradores) dá para:

- ver a última cópia;
- fazer uma cópia na hora;
- baixar uma cópia. O arquivo tem dados pessoais: guarde em lugar seguro.

Para mandar também uma cópia para outra pasta (nuvem, HD externo), defina `UPPA_BACKUP_EXTRA` no serviço.

**Voltar a uma cópia:** no PC do servidor, como administrador:

```
powershell -ExecutionPolicy Bypass -File C:\UPPA\servico\restaurar-copia.ps1 uppa-auto-AAAA-MM-DD_HHMMSS.db
```

O banco atual é guardado antes como `uppa-antes-…db`, então dá para desfazer.

## Versões

- O número da versão fica no `package.json`, e as novidades de cada versão ficam em `CHANGELOG.md`.
- Os dois apps mostram a versão em Ajustes / Meus dados, em **Sobre o app**. O Financeiro também mostra no menu lateral.
- Quando o servidor recebe uma versão nova, quem está com o app aberto vê o aviso **Atualizar agora**.
- O código fica num repositório git local, e cada versão publicada ganha uma etiqueta (`v1.5.0`).

**Publicar uma versão:**
1. Suba o número em `package.json` e escreva as novidades no `CHANGELOG.md`.
2. Na pasta do projeto, rode o comando abaixo. Ele compila, guarda a versão em `C:\UPPA\versoes\<versão>` e coloca no ar. O Windows pede confirmação para reiniciar o serviço.

```
powershell -ExecutionPolicy Bypass -File scripts\publicar.ps1
```

**Voltar a uma versão anterior:**

```
powershell -ExecutionPolicy Bypass -File C:\UPPA\servico\ativar-versao.ps1 1.4.0
```

Os dados não mudam, porque as versões novas só acrescentam colunas ao banco.

## Acessibilidade

Em Ajustes (Financeiro) e Meus dados (Associados) há opções que ficam guardadas no aparelho:

- **Tamanho da letra:** Normal, Grande ou Maior.
- **Alto contraste:** preto e branco, ou amarelo sobre preto no tema escuro.
- **Menos animações:** desliga os fogos, os confetes e os movimentos. Nos jogos, só o movimento da própria atividade continua.

Além disso:

- **"Pular para o conteúdo"** é o primeiro item ao usar a tecla Tab.
- Nas janelas, o foco fica dentro delas e volta ao lugar de antes ao fechar.
- As mensagens são anunciadas pelo leitor de tela.
- Os botões só com ícone têm descrição.

## Foto do sócio

O sócio coloca a foto em **Meus dados → Adicionar foto**. Pode tirar na hora ou escolher da galeria. O app recorta a foto em quadrado e reduz o tamanho.

A foto aparece:
- no Início;
- na **carteirinha**;
- na página que abre ao ler o QR da carteirinha, para quem confere ver que é a mesma pessoa;
- na lista de sócios do Financeiro.

A equipe também pode colocar ou trocar a foto na ficha do sócio.

## Laudos e documentos

Em **Meus dados → Laudos e documentos**, o sócio:
1. escolhe o tipo: laudo, identidade, comprovante de residência, comprovante de benefício ou outro;
2. escreve uma descrição, se quiser;
3. toca em **Tirar foto do documento** (abre a câmera) ou **Escolher foto ou PDF**.

A diretoria vê, anexa e remove documentos na ficha do sócio, na aba **Documentos**. Quem enviou cada documento fica registrado.

Os arquivos ficam no banco e entram nas cópias de segurança. Como têm dados de saúde, o link de cada documento só funciona por **15 minutos** e só é gerado para o próprio sócio ou para a equipe.

## Campanhas do mês

As cores dos apps seguem a campanha de conscientização do mês:

| Mês | Campanha |
|---|---|
| Janeiro | Branco |
| Fevereiro | Roxo |
| Março | Lilás |
| Abril | **Azul (autismo)** |
| Maio | Laranja |
| Junho | Vermelho |
| Julho | Amarelo |
| Agosto | Dourado |
| Setembro | **Verde (inclusão da pessoa com deficiência)** |
| Outubro | Rosa |
| Novembro | Azul |
| Dezembro | Vermelho |

O app dos sócios mostra uma faixa com o laço e o tema do mês.

O alto contraste da acessibilidade tem prioridade sobre a cor da campanha. Para desligar as cores: Ajustes → Associação → **Cores das campanhas do mês**.

## Cartão de crédito (Mercado Pago)

**Configuração:** Ajustes → **Pagamento com cartão** (só administradores):
1. Cole o **Access Token de produção** da conta Mercado Pago da associação (começa com `APP_USR-`). O sistema confere o token com o Mercado Pago antes de guardar.
2. Informe a **taxa do cartão** do seu plano, em porcentagem, e uma taxa fixa, se o plano tiver.
3. Marque **Oferecer pagamento com cartão**.

**A taxa é paga pelo sócio.** O valor no cartão é calculado para que, descontada a taxa, a associação receba a mensalidade inteira. Com taxa de 4,98%:
- mensalidade de R$ 10,00 → R$ 10,53 no cartão;
- mensalidade de R$ 20,00 → R$ 21,05 no cartão.

**Pagamento:** o sócio toca em **Pagar → Pagar no cartão**. O pagamento é feito no site seguro do Mercado Pago, à vista, e o número do cartão nunca passa pelo servidor da UPPA.

**Baixa automática:** a mensalidade é baixada como "Cartão (Mercado Pago)" e entra no caixa com o valor da mensalidade. Isso acontece de dois jeitos:
- pelo aviso que o Mercado Pago manda para `/api/publico/mercadopago/aviso`;
- quando o sócio volta para o app.

Nos dois casos o servidor **consulta o pagamento no Mercado Pago** antes de dar baixa, então um aviso falso não paga nada.

## Calendário

No Financeiro, o menu **Agenda** tem reuniões, oficinas e eventos, com data, horário, local e descrição. Os eventos publicados aparecem:
- no **calendário do app dos sócios**, junto com o 2 de abril, o 18 de junho e os aniversários da família;
- em **Próximos eventos**, no Início.

Cada evento tem o botão **Adicionar à minha agenda**, que gera um arquivo .ics para a agenda do celular.

## Mensagens privadas

A diretoria escreve para um sócio na ficha dele, aba **Mensagens**, ou pelo menu **Mensagens**, que tem a caixa de conversas e a busca de sócio.

No app do sócio:
- o Início mostra o aviso de mensagem nova, com contador;
- o sócio lê e responde em **Mensagens**.

Respostas não lidas aparecem no Painel do Financeiro. Cada conversa só é vista pelo sócio e pela equipe.

## Sala de acolhimento

No app Associados, aba **Acolhimento**, há um cantinho calmo com 7 atividades:

- **Como estou**: figuras de sentimentos e necessidades que aparecem em tela cheia, para mostrar a alguém.
- **Respirar**: respiração guiada.
- **Bolhas**: estourar bolhas.
- **Jogo da memória**.
- **Separar cores**.
- **Pintar**: com carimbos.
- **Piano de cores**: tocar livre ou seguir a música.

Não tem tempo, pontuação negativa nem jeito de perder. Os sons começam desligados. Dentro de uma atividade a barra de navegação some, para a criança não sair sem querer. Nada é enviado ao servidor.

## Lembrar de mim

O login dos dois apps tem **Lembrar de mim**, marcado por padrão. Marcado: o acesso fica salvo no aparelho por 30 dias e o CPF ou usuário já vem preenchido. Desmarcado: o acesso vale por até 12 horas e sai ao fechar o app.

## Importação da planilha

- Ninguém é duplicado. O mesmo CPF atualiza o cadastro (sem CPF, vale o mesmo nome). Pode importar de novo sempre que chegarem respostas novas.
- As pessoas autistas (até 5 por família) viram uma lista com nome e data de nascimento. Quando a data na planilha não é legível, o texto original fica guardado.
- A taxa "R$ 10 / R$ 20 / isento" vira o valor da mensalidade ou a isenção (dependente, diretoria ou outro motivo).
- Cada "PG Abr2026" da coluna *Controle de Contribuição* vira uma mensalidade **paga** daquele mês. A data do pagamento fica como dia 1, porque a planilha não informa o dia. Essas mensalidades **não** entram no caixa. O texto original da coluna aparece na ficha do sócio.

## Publicar na internet

O `render.yaml` publica no Render com um **disco persistente**, que é o plano pago *Starter*. Sem esse disco, o banco SQLite é apagado a cada reinício. Também dá para rodar o servidor num computador da associação (`npm start`). O banco fica no arquivo `data/uppa.db`, ou no caminho definido em `UPPA_DB`. **Faça cópia de segurança desse arquivo.**

## Apps de celular (Android / iOS)

Os dois apps também funcionam como PWA: dá para abrir no navegador do celular e usar *Adicionar à tela inicial*. Para gerar os apps nativos com o Capacitor:

```bash
VITE_API_URL=https://endereco-do-servidor VITE_PUBLIC_URL=https://endereco-do-servidor/associados npm run app:associados:android
```

O comando cria `apps/associados/android`, que você abre no Android Studio. O equivalente para iOS é `app:associados:ios`, que precisa do Xcode num Mac. Para o Financeiro, use `app:financeiro:android` e `app:financeiro:ios`. Os identificadores são `br.org.uppa.associados` e `br.org.uppa.financeiro`.

## Estrutura

```
server/          API (Express + SQLite nativo do Node)
shared/          código comum: opções do formulário, formulário do sócio, estilo, componentes
apps/financeiro  app da tesouraria (React)
apps/associados  app do sócio (React)
```

## Dados pessoais (LGPD)

O cadastro tem CPF, endereço e informações de saúde (autismo, BPC). Siga estes cuidados:

- Dê acesso ao Financeiro só a quem precisa. Cada pessoa usa o próprio usuário.
- Publique sempre com **HTTPS**.
- A planilha do Google está aberta para "qualquer pessoa com o link". Depois da importação, vale restringir o compartilhamento. Se fizer isso, importe por arquivo CSV (Arquivo → Fazer download → .csv).
