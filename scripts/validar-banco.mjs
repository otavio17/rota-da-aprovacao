// Validação do banco antes do deploy (seção 9 da especificação).
// Verifica: gabarito válido, comentário presente, assunto existente no edital.
// Também mostra quantas questões faltam por assunto para chegar a 15.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'data');
const concursos = JSON.parse(readFileSync(join(raiz, 'concursos.json'), 'utf8'));
const META_POR_ASSUNTO = 15;
let erros = 0;

for (const c of concursos) {
  const edital = JSON.parse(readFileSync(join(raiz, c.pasta, 'edital.json'), 'utf8'));
  const arq = join(raiz, c.pasta, 'questoes.json');
  const questoes = existsSync(arq) ? JSON.parse(readFileSync(arq, 'utf8')) : [];
  const assuntos = new Set(edital.topicos.map((t) => t.id));
  const ids = new Set();

  console.log(`\n== ${c.nome} (${questoes.length} questões)`);
  for (const q of questoes) {
    const ctx = `${c.pasta}/${q.id}`;
    if (ids.has(q.id)) { console.error(`ERRO ${ctx}: id repetido`); erros++; }
    ids.add(q.id);
    if (!Array.isArray(q.alternativas) || q.alternativas.length < 2) { console.error(`ERRO ${ctx}: alternativas`); erros++; }
    if (!Number.isInteger(q.correta) || q.correta < 0 || q.correta >= q.alternativas?.length) { console.error(`ERRO ${ctx}: gabarito inválido`); erros++; }
    if (!q.comentario?.trim()) { console.error(`ERRO ${ctx}: sem comentário`); erros++; }
    if (!assuntos.has(q.topico)) { console.error(`ERRO ${ctx}: assunto "${q.topico}" não existe no edital`); erros++; }
  }

  for (const t of edital.topicos) {
    const n = questoes.filter((q) => q.topico === t.id).length;
    const falta = Math.max(0, META_POR_ASSUNTO - n);
    if (falta > 0) console.log(`  aviso: ${t.id} tem ${n}/${META_POR_ASSUNTO} questões (faltam ${falta})`);
  }
}

if (erros > 0) {
  console.error(`\n${erros} erro(s). Corrigir antes do deploy.`);
  process.exit(1);
}
console.log('\nBanco válido.');
