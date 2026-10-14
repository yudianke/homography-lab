import test from 'node:test';
import assert from 'node:assert/strict';
import { publicAsset } from '../src/assets.ts';
test('Public assets resolve under both root and GitHub Pages prefixes', () => {
 for(const base of ['/', '/homography-lab/']) {
  for(const path of ['comic/page-01.webp','/comic/page-15.webp','comic/original-comic.pdf','comic/robot-h.webp']) {
   const url=new URL(publicAsset(path,base),'https://example.test');
   assert.equal(url.pathname,base+path.replace(/^\/+/,''));
  }
 }
});
