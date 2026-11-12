# Prompt de continuidade — Plataforma de Estudos para Concursos

Cole o bloco abaixo no Antigravity (ou no assistente que for continuar o projeto).
Antes de colar, aponte o assistente para este repositório.

---

Você vai continuar o projeto "rota-da-aprovacao": um site pessoal de estudos para concursos, feito com React + TypeScript + Vite + CSS próprio, publicado no GitHub Pages. Idioma da interface e de toda a conversa: português do Brasil. Respostas curtas e práticas primeiro, detalhes depois.

## Contexto do usuário
- Otávio, engenheiro mecatrônico formado pela USP, programador Android há anos.
- Prepara dois concursos: TJ-SP Oficial de Justiça (Vunesp, prova em 14/03/2027) e SP Águas (FGV, prova em 31/01/2027).
- Estuda 4 horas por dia, de segunda a domingo. Aprende melhor com perguntas curtas e repetição.
- Quer interface bonita, prazos em destaque e um jeito simples de continuar o trabalho em outras ferramentas.

## Regras de estudo (fonte: especificação técnica v1.0, seção 6)
- Abaixo de 80% → Reforço. De 80% a 84% → Consolidação. 85% ou mais → Liberado.
- Revisão espaçada em 1, 7 e 30 dias. Erro na revisão reinicia a contagem.
- Mini-simulado toda sexta (20 questões: 70% assunto da semana, 30% reforço).
- Simulado geral todo sábado, com todo o edital, na proporção de cada bloco.
- Análise todo domingo.
- Uma questão não se repete para o mesmo usuário em menos de 30 dias.
- Se o banco não tiver questões suficientes, avisar quantas faltam. Nunca montar um simulado menor em silêncio.
- Cores fixas de estado: cinza (Novo), azul (Estudado), vermelho (Reforço), amarelo (Consolidação), verde (Liberado).
- Critério dos prazos: até 30 dias = urgente (vermelho); 31 a 90 = atenção (amarelo); mais de 90 = tranquilo (verde).

## Estado atual (commit de referência: "feat: plataforma de estudos para concursos")
- src/domain/regras.ts: funções puras (estados, revisão, próximo passo, montagem de simulados, pontuação, análise, prazos). Testadas em src/domain/regras.test.ts (24 testes). Rodar com `npm test`.
- src/telas/: Onboarding, Hoje (com cabeçalho, prazos e progresso), Cronograma, Simulado, Analise, Erros.
- src/dados/armazenamento.ts: dados no localStorage por enquanto. A camada Firebase (login e Firestore) ainda NÃO foi feita.
- public/data/: concursos.json, pastas tjsp-oficial e spaguas, cada uma com edital.json e questoes.json.
- scripts/validar-banco.mjs: valida gabarito, comentário e assunto existente. Roda com `npm run validar`.
- .github/workflows/deploy.yml: test → validar → build → deploy no Pages. Já funcionou.
- Site: https://otavio17.github.io/rota-da-aprovacao/ (vite base '/rota-da-aprovacao/').

## Pendências, em ordem de prioridade
1. Testar o fluxo do simulado no navegador de ponta a ponta (mini-simulado, simulado geral, resultado, caderno de erros). Ainda não foi testado depois das últimas mudanças.
2. SP Águas: preencher public/data/spaguas/edital.json com blocos, número de questões, duração e topicos a partir do Anexo I do edital nº 01/2026 (conhecimento.fgv.br/concursos/spaguas26). Hoje está vazio de propósito; NÃO inventar conteúdo.
3. TJ-SP: conferir a divisão de questões (15 Português, 40 Específicos, 15 Gerais) no Anexo VIII do edital oficial. Os assuntos "a detalhar" precisam de conteúdo real. Peso de cada assunto deve vir da contagem nas provas anteriores (campo peso), não de chute.
3b. TJ-SP: as datas de inscrição (28/10 a 10/12/2026) vieram de sites de cursos. Conferir no edital oficial.
4. Banco de questões: meta de 15 questões por assunto e cerca de 300 no total por concurso. Hoje há 4 questões.
5. Login e dados com Firebase (Auth e Firestore), conforme seção 5 da especificação: só 2 contas, regras por usuário, sem chave de serviço no repositório.
6. Resumos em Markdown e vídeos por assunto (seção 9 da especificação).
7. Modo escuro e funcionamento offline (seção 7 da especificação).
8. Exportar o plano de estudo em PDF (a confirmar com o usuário).

## Regras de trabalho
- Nunca colocar segredos no repositório. Configuração pública do Firebase pode ficar; chave de conta de serviço nunca.
- Não inventar dados de edital, datas ou conteúdo programático. Quando faltar informação, deixar o campo vazio e avisar na interface.
- Toda regra de estudo nova entra em src/domain com teste antes da tela.
- Antes de cada entrega: `npm test`, `npm run validar`, `npm run build`.
- Mensagens de commit curtas e padronizadas: feat, fix, content, chore.
- Não criar cadastro público. O cadastro é fechado, com duas contas criadas manualmente.
- Não misturar com o repositório do portfólio (otavio17.github.io).

## Primeiro passo ao continuar
Rode `npm install`, `npm test`, `npm run validar` e `npm run build`. Depois, faça a pendência 1 e mostre o resultado ao usuário antes de avançar.
