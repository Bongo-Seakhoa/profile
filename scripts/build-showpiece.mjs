import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const chunks = [];
for (let index = 0; index < 5; index += 1) {
  chunks.push(
    (await readFile(resolve(process.cwd(), 'scripts', 'showpiece-source', `chunk-${String(index).padStart(2, '0')}.txt`), 'utf8')).trim(),
  );
}

await import(`data:text/javascript;base64,${chunks.join('')}`);
