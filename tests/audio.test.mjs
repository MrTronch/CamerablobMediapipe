import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bodyAudio} from '../logic.js';
import {Sampler} from '../audio.js';
function skeleton(){const w=Array.from({length:33},()=>({x:0,y:0,z:0,visibility:1}));for(const [i,x,y]of [[11,-.2,0],[12,.2,0],[13,-.5,0],[14,.5,0],[15,-.8,0],[16,.8,0],[0,0,-.3]])w[i]={x,y,z:0,visibility:1};const image=w.map(p=>({...p,x:.5+p.x/2,y:.5+p.y/2}));return {w,image};}
 test('pitch corporal estable al cambiar encuadre y escala',()=>{const {w,image}=skeleton(),p={x:.65,y:.35,kind:'face'};const a=bodyAudio(p,image,w,1);const b=bodyAudio({...p,x:p.x*.7+.1,y:p.y*.7+.05},image.map(v=>({...v,x:v.x*.7+.1,y:v.y*.7+.05})),w,1);assert.ok(Math.abs(a.rate-b.rate)<1e-10);});
 test('pitch responde a X, Y y profundidad corporal',()=>{const {w,image}=skeleton();const base=bodyAudio({x:.4,y:.5,kind:'hand'},image,w,1);assert.ok(bodyAudio({x:.55,y:.5,kind:'hand'},image,w,1).rate>base.rate);assert.ok(bodyAudio({x:.4,y:.35,kind:'hand'},image,w,1).rate>base.rate);w[15].z=-.2;assert.ok(bodyAudio({x:.4,y:.5,kind:'hand'},image,w,1).rate>base.rate);});
 test('sin esqueleto fiable no utiliza límites de pantalla',()=>{assert.equal(bodyAudio({x:1,y:1},null,null),null);const {w,image}=skeleton();image[15].visibility=.2;assert.equal(bodyAudio({x:1,y:1},image,w),null);});
 test('los cuatro samples aparecen sin repeticiones consecutivas',()=>{const s=new Sampler();const a=Array.from({length:40},()=>s.nextSample());for(let i=0;i<a.length;i+=4)assert.equal(new Set(a.slice(i,i+4)).size,4);for(let i=1;i<a.length;i++)assert.notEqual(a[i],a[i-1]);});
