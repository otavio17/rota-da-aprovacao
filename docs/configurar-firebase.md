# Configurar o Firebase

O login, o cadastro, o progresso salvo em cada conta e a lista de usuários do administrador usam o Firebase, no plano gratuito (Authentication e Firestore).

Os quatro valores de configuração (`apiKey`, `authDomain`, `projectId`, `appId`) não são segredos: eles vão junto com o site. O que protege os dados são as regras do Firestore, no arquivo `firestore.rules`.

## 1. Projeto e app web
1. Abra o console do Firebase e crie um projeto (ou use um que já exista para este app).
2. Em Configurações do projeto › Seus apps, clique em Web (`</>`) e registre o app.
3. Copie os quatro valores de `firebaseConfig`.

## 2. Login por e-mail e senha
1. Authentication › Começar › Método de login › E-mail/senha › Ativar.
2. Authentication › Configurações › Domínios autorizados › Adicionar domínio › `otavio17.github.io`. (`localhost` já vem na lista.)

## 3. Banco de dados
1. Firestore Database › Criar banco de dados › modo de produção › região `southamerica-east1`.
2. Aba Regras: apague o conteúdo, cole o conteúdo de `firestore.rules` e clique em Publicar.

## 4. Administrador
1. No site, crie a conta do administrador em "Criar cadastro".
2. Authentication › Usuários: copie o UID dessa conta.
3. Firestore › Iniciar coleção › ID `admins` › documento com ID igual ao UID copiado, com um campo `email` (texto) com o e-mail do administrador.
4. Entre de novo no site: aparece o link "Usuários".

## 5. Publicação
No GitHub: Settings › Secrets and variables › Actions › aba Variables. Crie `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID` e `VITE_FIREBASE_APP_ID`, com os valores do passo 1. O workflow de deploy já usa essas variáveis no build. Sem elas, o site mostra "Login não configurado".

## 6. Desenvolvimento local
1. Copie `.env.example` para `.env.local` e preencha os mesmos valores.
2. Rode `npm install` e depois `npm run dev`.

## Testes sem mexer no projeto real
Com os emuladores, nenhuma conta de teste vai para o seu projeto:
1. Instale o Java (o emulador do Firestore precisa dele) e rode, na pasta do projeto: `npx firebase-tools emulators:start --project demo-rota`.
2. Em `.env.local`, acrescente `VITE_USAR_EMULADOR=sim`. Os valores de `VITE_FIREBASE_*` podem ser quaisquer, por exemplo `demo-rota`.
3. Rode `npm run dev` e teste o cadastro, a entrada, o progresso salvo e o painel do administrador.

Nunca defina `VITE_USAR_EMULADOR` no build publicado.
