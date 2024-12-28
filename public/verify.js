import { readFileSync } from 'fs';
const content = readFileSync('template.csv', { encoding: 'utf8' });
console.log(content);
