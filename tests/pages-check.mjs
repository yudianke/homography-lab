import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
const origin=process.env.PREVIEW_ORIGIN || 'http://127.0.0.1:4180';
const prefix='/homography-lab/';
const hash=b=>createHash('sha256').update(b).digest('hex');
const paths=['index.html',...readdirSync('dist/assets').map(n=>'assets/'+n),...readdirSync('dist/comic').map(n=>'comic/'+n)];
for(const path of paths){
 const response=await fetch(origin+prefix+path);
 if(!response.ok) throw Error(path+': HTTP '+response.status);
 const bytes=Buffer.from(await response.arrayBuffer());
 if(hash(bytes)!==hash(readFileSync('dist/'+path)))throw Error(path+': bytes differ / HTML fallback');
}
const html=await (await fetch(origin+prefix)).text();
if(!html.includes('src="/homography-lab/assets/')||!html.includes('href="/homography-lab/assets/'))throw Error('Incorrect bundle prefix');
console.log(`PASS ${paths.length} production files match exactly over HTTP at ${origin}${prefix}, including all comic pages, PDF, portrait, JS and CSS.`);
