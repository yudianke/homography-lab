import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../src/App';
import '../src/styles/index.css';
const fixture = document.querySelector<HTMLElement>('#fixture')!;
const output = document.querySelector('#results')!;
const assert = (condition: unknown, message: string) => { if (!condition) throw new Error(message); };
const tick = () => new Promise(r => setTimeout(r, 120));
const wait = async (condition: () => boolean) => { for (let i=0;i<120;i++) { if(condition())return; await tick(); } throw new Error('Timed out'); };
const button = (text: string) => Array.from(fixture.querySelectorAll('button')).find(b=>b.textContent?.includes(text))!;
document.querySelector<HTMLButtonElement>('#run')!.onclick = async () => {
 const trigger=document.querySelector<HTMLButtonElement>('#run')!; trigger.disabled=true;
 const logs:string[]=[]; const log=(s:string)=>{logs.push(s);output.textContent=logs.join('\n');};
 let root:ReturnType<typeof createRoot>|undefined;
 const proto=WebGLRenderingContext.prototype as any;
 const originals=new Map<string,any>();
 const resources:{gl:WebGLRenderingContext; kind:string; handle:any}[]=[];
 let uploads=0;
 const getContext=HTMLCanvasElement.prototype.getContext;
 try {
  for(const kind of ['Texture','Buffer','Program','Shader','Framebuffer','Renderbuffer']) {
   const method='create'+kind; const original=proto[method]; originals.set(method,original);
   proto[method]=function(...args:any[]){const handle=original.apply(this,args);if(handle)resources.push({gl:this,kind,handle});return handle;};
  }
  const upload=proto.texImage2D; originals.set('texImage2D',upload);
  proto.texImage2D=function(...args:any[]){uploads++;return upload.apply(this,args);};
  for(let cycle=0;cycle<3;cycle++) {
   root=createRoot(fixture);root.render(<App/>);
   await wait(()=>!!button('Rectify View')&&!button('Rectify View').disabled);
   const canvas=fixture.querySelector<HTMLCanvasElement>('.interactive-map canvas')!;
   const before=uploads; const count=resources.length;
   const handle=fixture.querySelector<SVGElement>('[data-corner="0"]')!;
   for(let i=0;i<100;i++) handle.dispatchEvent(new KeyboardEvent('keydown',{key:i%2?'ArrowLeft':'ArrowRight',bubbles:true}));
   fixture.style.maxWidth='480px'; window.dispatchEvent(new Event('resize')); await tick();
   assert(fixture.querySelector('.interactive-map canvas')===canvas,'Canvas replaced');
   assert(uploads===before,'Texture uploaded during corner updates');
   assert(resources.length===count,'GPU resources allocated during corner updates');
   for(let i=0;i<3;i++) {
    button('Reset Transformation').click(); await tick();
    button('Rectify View').click();
    await wait(()=>!!fixture.querySelector('.rectification-panel canvas')&&!fixture.querySelector('.rectification-status'));
    button('Back to Editing').click(); await tick();
    assert(!fixture.querySelector('.rectification-panel'),'Panel not removed');
   }
   root.unmount();root=undefined;await tick();
   for(const r of resources) assert(!(r.gl as any)['is'+r.kind](r.handle),'Live GPU '+r.kind+' after unmount');
   log(`PASS cycle ${cycle+1}: 100 corner updates, resize, 3 Reset/Rectify/close sequences, GPU handles released; no drag texture/resource allocations`);
  }
  HTMLCanvasElement.prototype.getContext=function(type:any,...args:any[]){return type==='webgl'?null:(getContext as any).call(this,type,...args);} as any;
  root=createRoot(fixture);root.render(<App/>);
  await wait(()=>!!fixture.querySelector('.gpu-status')?.textContent?.includes('WebGL is unavailable'));
  assert(button('Rectify View').disabled,'Rectification enabled without WebGL');
  assert(fixture.querySelector<HTMLElement>('.interactive-map canvas')?.style.visibility==='hidden','Broken canvas visible');
  button('Angles').click(); await tick();
  assert(!!fixture.querySelector('.interactive-map'),'Geometry removed');
  button('Explore the Original Comic').click();
  await wait(()=>!!fixture.querySelector<HTMLImageElement>('.comic-page img')?.naturalWidth);
  log('PASS forced WebGL initialization failure: clear message, hidden canvas, disabled Rectify, geometry and comic available');
  root.unmount();root=undefined;
  log('ALL RELEASE CHECKS PASSED');
 } catch(error) {log('FAIL '+String(error));}
 finally {root?.unmount();HTMLCanvasElement.prototype.getContext=getContext;for(const [key,value]of originals)proto[key]=value;fixture.style.maxWidth='';trigger.disabled=false;}
};
