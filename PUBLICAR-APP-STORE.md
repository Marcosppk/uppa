# Publicar os apps da UPPA na App Store (iPhone)

Este guia leva os dois apps à App Store, sem precisar de um Mac:

- **UPPA Associados**: na loja aberta, qualquer pessoa encontra.
- **UPPA Financeiro**: como **app não listado**. Não aparece na busca e só abre por um link que você manda para a equipe.

A compilação é feita na nuvem, pelo **Codemagic**, a partir do código no **GitHub**. Você faz uma única vez os passos 1 a 6. Depois disso, cada versão nova é o passo 7 e o 11.

> **O servidor precisa estar ligado.** O app do iPhone fala com `https://uppa.puxaiapp.com.br`. Se o computador do servidor estiver desligado quando a Apple for testar, o app é recusado. Durante a revisão, que costuma levar de 1 a 3 dias, deixe o servidor no ar o tempo todo. Para mudar o endereço, edite `VITE_API_URL` e `VITE_PUBLIC_URL` no `codemagic.yaml`.

---

## O que já está pronto no código

- `codemagic.yaml`: compila cada app e envia ao App Store Connect.
- `scripts/preparar-ios.mjs`: cria o projeto do iPhone com o ícone, a tela de abertura, as permissões de câmera e fotos em português, a versão do `package.json` e suporte só a iPhone. Com iPad, a Apple exigiria fotos de tela de iPad também.
- **Excluir minha conta** em *Meus dados*. A Apple exige essa opção em apps que deixam a pessoa criar uma conta.
- **Política de privacidade** em `https://uppa.puxaiapp.com.br/privacidade` e **ajuda** em `https://uppa.puxaiapp.com.br/suporte`. Os dois endereços são obrigatórios na ficha da loja.
- Os downloads (planilha CSV, cópia do banco, evento da agenda, desenho) abrem a folha de compartilhar do iPhone.

---

## 1. Conta de desenvolvedor da Apple (pessoal)

1. Num iPhone, instale o app **Apple Developer** e entre com o seu Apple ID. Ele precisa ter a verificação em duas etapas ligada.
2. Toque em **Account → Enroll Now** e escolha **Individual**. Também dá para fazer em https://developer.apple.com/programs/enroll/.
3. Pague a anuidade de **US$ 99**. A aprovação costuma sair em até 48 horas.

O nome que aparece como "vendedor" na loja é o seu nome completo. Se mais tarde a UPPA abrir uma conta de organização (com isenção da anuidade para associações sem fins lucrativos no Brasil), dá para transferir os apps para ela.

## 2. Registrar os identificadores dos apps

Em https://developer.apple.com/account/resources/identifiers → **+** → **App IDs** → **App**:

| Description | Bundle ID (Explicit) |
|---|---|
| UPPA Associados | `br.org.uppa.associados` |
| UPPA Financeiro | `br.org.uppa.financeiro` |

Não marque nenhuma "Capability" extra. Clique em **Continue → Register**.

## 3. Criar os apps no App Store Connect

Em https://appstoreconnect.apple.com → **Apps → + → New App**, faça uma vez para cada app:

- **Platforms:** iOS
- **Name:** `UPPA Associados` (e depois `UPPA Financeiro`). Se o nome já existir na loja, use `UPPA Roraima — Associados`.
- **Primary language:** Portuguese (Brazil)
- **Bundle ID:** escolha o do passo 2
- **SKU:** `uppa-associados` / `uppa-financeiro`
- **User access:** Full Access

## 4. Chave da API (para o Codemagic enviar os apps)

1. App Store Connect → **Users and Access → Integrations → App Store Connect API**. Se for a primeira vez, clique em **Request Access**.
2. Em **Team Keys → +**, dê o nome `Codemagic` e o acesso **App Manager**.
3. **Baixe o arquivo `.p8`**. A Apple só deixa baixar uma vez. Guarde-o num lugar seguro e **nunca** o coloque no GitHub.
4. Anote o **Issuer ID**, que fica no alto da página, e o **Key ID**, que aparece na linha da chave.

## 5. Código no GitHub (repositório privado)

1. Em https://github.com/new, crie um repositório **Private** chamado `uppa`, sem README.
2. Na pasta do projeto, no terminal do VS Code:

   ```bash
   git add -A
   git commit -m "Versão 1.16.0"
   git remote add origin https://github.com/SEU-USUARIO/uppa.git
   git push -u origin master
   ```

O `.gitignore` já deixa de fora o banco (`*.db`), o `.env`, `node_modules` e as pastas `ios`/`android`, que são geradas.

## 6. Codemagic

1. Em https://codemagic.io, entre com a conta do GitHub. A conta pessoal tem **500 minutos grátis por mês** em Mac, e cada compilação leva de 10 a 15 minutos.
2. **Add application** → GitHub → repositório `uppa` → tipo **Other** (o arquivo `codemagic.yaml` é lido sozinho).
3. Em **Settings → Integrations → Developer Portal → Connect**:
   - **API key name:** `UPPA` (exatamente assim, porque o `codemagic.yaml` usa esse nome)
   - **Issuer ID** e **Key ID** do passo 4
   - **API key:** envie o arquivo `.p8`
4. Em **Settings → codemagic.yaml settings → Code signing identities**:
   - Aba **iOS certificates → Generate certificate**: escolha a chave `UPPA` e o tipo **Apple Distribution**, e dê a referência `uppa_distribuicao`. **Baixe e guarde o certificado e a senha**, porque servem para recuperar a assinatura.
   - Aba **iOS provisioning profiles → Fetch profiles**: escolha a chave `UPPA` e busque os perfis **App Store** de `br.org.uppa.associados` e `br.org.uppa.financeiro`. Se a lista vier vazia, crie os perfis em https://developer.apple.com/account/resources/profiles: **+ → App Store Connect**, escolha o App ID e o certificado gerado, e depois clique em **Fetch profiles** de novo.

## 7. Compilar e testar no seu iPhone (TestFlight)

1. Codemagic → o app → **Start new build** → branch `master` → fluxo **iPhone — UPPA Associados**.
2. Quando terminar (verde), em uns 15 minutos o build aparece no App Store Connect → o app → **TestFlight**.
3. Em **TestFlight → Internal Testing → +**, crie o grupo `Equipe` e adicione você e quem mais for testar. A pessoa precisa estar em *Users and Access*.
4. No iPhone, instale o app **TestFlight** e abra o convite que chega por e-mail.

Teste pelo menos o seguinte: entrar, ver a carteirinha, as mensalidades e o Pix, mandar foto e documento, salvar um desenho, levar um evento para a agenda e **Excluir minha conta**. Para este último, use a conta de teste do passo 8, e depois crie a conta de novo.

Faça o mesmo com o fluxo **iPhone — UPPA Financeiro**.

## 8. Conta de teste para a Apple

A Apple precisa entrar nos apps para testar. Crie as contas antes de enviar.

**Associados**: no Financeiro, cadastre um sócio:

- Nome: `Conta de Teste Apple`
- CPF: `529.982.247-25` (CPF fictício válido, muito usado em testes)
- Categoria: Apoiador. Isenção: "outro", para não gerar cobrança. Situação: **ativo**.
- Entre no Associados com esse CPF e a senha `12345678`, e crie a senha **`UppaTeste2026`**.

**Financeiro**: em Ajustes → Pessoas com acesso, crie o usuário `revisor.apple` com o perfil **Tesoureiro** e a senha `UppaTeste2026`. Entre uma vez para trocar a senha, se o app pedir.

> Se a Apple usar "Excluir minha conta" na conta de teste, ela some. Antes de cada envio, confira se a conta de teste existe.

## 9. Ficha da loja do UPPA Associados

App Store Connect → UPPA Associados → versão **1.0 Prepare for Submission**.

**Capturas de tela (obrigatórias):** de 1 a 10 imagens de iPhone **6,9"** (1320 × 2868 ou 1290 × 2796 pixels, em pé). O mais simples é tirar print num iPhone Pro Max ou Plus com o app do TestFlight. Mostre a tela inicial, a carteirinha, as mensalidades, a agenda e a sala de acolhimento, todas com a conta de teste. **Nunca use dados de sócios reais.**

**Textos sugeridos:**

- **Subtítulo** (até 30 caracteres): `Sócios da UPPA Roraima`
- **Texto promocional:** `A carteirinha, as mensalidades e os avisos da UPPA no seu celular.`
- **Palavras-chave** (até 100 caracteres): `autismo,TEA,autista,associação,carteirinha,mensalidade,Roraima,pais,família,inclusão`
- **Descrição:**

  ```
  O app oficial dos sócios da UPPA Roraima — União de Pais e Pessoas Autistas.

  • Carteirinha digital com foto e QR Code de verificação.
  • Mensalidades: veja o que está em aberto e pague por Pix (QR Code ou copia e cola) ou cartão.
  • Avisos, eventos e o calendário da causa autista, com os aniversários da família.
  • Mensagens diretas com a diretoria.
  • Envie laudos e documentos pela câmera ou em PDF.
  • Sala de acolhimento: atividades calmas para crianças e adultos, como respiração, bolhas, pintura e memória.
  • Acessibilidade: letras maiores, alto contraste, menos animações e tema escuro.

  Ainda não é sócio? Faça a sua inscrição pelo próprio app.
  ```

- **Support URL:** `https://uppa.puxaiapp.com.br/suporte`
- **Marketing URL:** deixe em branco ou use o Instagram da UPPA.
- **Copyright:** `2026 UPPA Roraima`

**App Information** (menu à esquerda):

- **Category:** Primary **Lifestyle** (Estilo de vida). Secondary **Social Networking** ou deixe em branco.
- **Content Rights:** não usa conteúdo de terceiros.
- **Age Rating:** responda ao questionário (nada de violência, apostas etc.). Deve sair **4+**.

**App Privacy** (Privacidade do app):

- **Privacy Policy URL:** `https://uppa.puxaiapp.com.br/privacidade`
- **Data collection:** *Yes*. Marque os tipos abaixo. Para todos: **Linked to the user** = sim, **Tracking** = não, finalidade **App Functionality**.
  - Contact Info: *Name*, *Email Address*, *Phone Number*, *Physical Address*
  - Health & Fitness: *Health* (laudos)
  - Financial Info: *Other Financial Info* (renda familiar e BPC da ficha)
  - Identifiers: *User ID* (CPF e matrícula)
  - User Content: *Photos or Videos* (foto e documentos), *Other User Content* (mensagens)
  - Purchases: *Purchase History* (mensalidades pagas)

**Pricing and Availability:** preço **Free (Grátis)**, disponível no **Brasil** ou em todos os países.

**App Review Information:**

- **Sign-in required:** sim. **User name:** `52998224725`. **Password:** `UppaTeste2026`
- **Contact:** seu nome, telefone com +55 e e-mail.
- **Notes**, para colar:

  ```
  UPPA Associados is the members' app of UPPA Roraima, a non-profit association of parents and
  autistic people in Roraima, Brazil. The app is in Brazilian Portuguese.

  Demo account: log in with CPF 52998224725 and password UppaTeste2026.

  Membership dues: members pay a monthly membership fee to the association (a real-world,
  non-profit membership: in-person meetings, support groups and legal advocacy for families).
  No digital content or features are unlocked by paying. Payment is by Pix (Brazilian instant
  bank transfer) or by card on Mercado Pago's website, opened in Safari (guideline 3.1.3(e)).

  Account deletion: bottom tab "Meus dados" > scroll to the end > "Excluir minha conta".
  Privacy policy: https://uppa.puxaiapp.com.br/privacidade
  ```

**Build:** clique em **+** e escolha o build enviado pelo Codemagic. **Version Release:** *Manually release*, para você escolher o dia em que o app aparece na loja.

## 10. Enviar para revisão

Clique em **Add for Review → Submit for Review**. A resposta chega por e-mail. Se vier uma recusa, ela vem em **App Review → Resolution Center**, com o motivo. Copie o texto e a gente corrige.

## 11. UPPA Financeiro como app não listado

1. Preencha a ficha do Financeiro como no passo 9, com estas diferenças:
   - **Descrição:** `App interno da equipe da UPPA Roraima (diretoria e tesouraria): cadastro de sócios, mensalidades, caixa, avisos e crachá de identificação. Uso restrito a pessoas autorizadas pela associação.`
   - **Category:** Business. **Sign-in:** usuário `revisor.apple`, senha `UppaTeste2026`.
   - **App Privacy:** os mesmos tipos do Associados, porque a equipe vê os dados dos sócios.
   - Em **Notes**, comece com: `This app is intended for UNLISTED distribution: it is an internal tool for the staff of a non-profit association. Demo staff login: revisor.apple / UppaTeste2026.`
   - Em **Pricing and Availability**, o método de distribuição precisa estar como **Public** (ele muda para *Unlisted* quando a Apple aprova o pedido).
2. Envie para revisão (passo 10).
3. Logo depois, preencha o pedido em https://developer.apple.com/contact/request/unlisted-app/ com o nome do app e o **Apple ID** do app (App Store Connect → App Information → Apple ID, um número). Sugestão de respostas:
   - *Problema que o app resolve:* a diretoria e a tesouraria da associação usam o app para cadastrar sócios, dar baixa em mensalidades e controlar o caixa. Só pessoas autorizadas recebem login.
   - *Por que não público:* o app não tem utilidade para quem não é da equipe e não deve aparecer na busca.
   - *Por que não Apple Business Manager:* a associação é pequena, sem estrutura de TI, e a equipe usa os próprios celulares.
4. Com a aprovação, o link para mandar à equipe fica em **App Store Connect → Pricing and Availability → App Distribution Methods**. As próximas versões continuam não listadas.

## 12. Versões novas

1. Suba a versão no `package.json` e escreva o que mudou no `CHANGELOG.md`, como sempre.
2. `git push`.
3. No Codemagic, rode o fluxo do app. O número da compilação sobe sozinho.
4. No App Store Connect → **+ Version or Platform → iOS**, use o mesmo número do `package.json`, escolha o build e envie para revisão.

O servidor (`publicar.ps1`) continua sendo atualizado do jeito de sempre. O app do iPhone só precisa de versão nova quando muda algo **nas telas**. Mudança só no servidor vale na hora para todo mundo.

---

## Problemas comuns

| Mensagem | O que fazer |
|---|---|
| *No matching profiles found* (Codemagic) | Refaça o "Fetch profiles" do passo 6 e confira se o Bundle ID é exatamente `br.org.uppa.associados`. |
| *Missing compliance* no TestFlight | Não deveria aparecer, porque o app já declara que não usa criptografia própria. Se aparecer, responda *None of the algorithms mentioned above*. |
| Recusa **2.1 – App Completeness** | Em geral o servidor estava fora do ar ou a conta de teste não funcionava. Confira as duas coisas e responda no Resolution Center. |
| Recusa **3.1.1 – In-App Purchase** | Responda no Resolution Center reforçando que a mensalidade é de uma associação real, sem fins lucrativos, e não libera conteúdo digital (3.1.3(e)). Se insistirem, dá para esconder o pagamento por cartão no app do iPhone e deixar só o Pix. |
| Recusa **4.2 – Minimum Functionality** | Destaque nas notas o que é próprio do app: carteirinha com QR, câmera para documentos, sala de acolhimento, compartilhar arquivos. |
| Recusa **5.1.1(v)** | Mostre o caminho de "Excluir minha conta" nas notas, como no texto do passo 9. |
