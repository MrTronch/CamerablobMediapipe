import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bodyAudio} from '../logic.js';
import {Sampler,SAMPLE_OCTAVE_RATE} from '../audio.js';
function skeleton(){const w=Array.from({length:33},()=>({x:0,y:0,z:0,visibility:1}));for(const [i,x,y]of [[11,-.2,0],[12,.2,0],[13,-.5,0],[14,.5,0],[15,-.8,0],[16,.8,0],[0,0,-.3]])w[i]={x,y,z:0,visibility:1};const image=w.map(p=>({...p,x:.5+p.x/2,y:.5+p.y/2}));return {w,image};}
 test('pitch corporal estable al cambiar encuadre y escala',()=>{const {w,image}=skeleton(),p={x:.65,y:.35,kind:'face'};const a=bodyAudio(p,image,w,1);const b=bodyAudio({...p,x:p.x*.7+.1,y:p.y*.7+.05},image.map(v=>({...v,x:v.x*.7+.1,y:v.y*.7+.05})),w,1);assert.ok(Math.abs(a.rate-b.rate)<1e-10);});
 test('pitch responde a X, Y y profundidad corporal',()=>{const {w,image}=skeleton();const base=bodyAudio({x:.4,y:.5,kind:'hand'},image,w,1);assert.ok(bodyAudio({x:.55,y:.5,kind:'hand'},image,w,1).rate>base.rate);assert.ok(bodyAudio({x:.4,y:.35,kind:'hand'},image,w,1).rate>base.rate);w[15].z=-.2;assert.ok(bodyAudio({x:.4,y:.5,kind:'hand'},image,w,1).rate>base.rate);});
 test('sin esqueleto fiable no utiliza límites de pantalla',()=>{assert.equal(bodyAudio({x:1,y:1},null,null),null);const {w,image}=skeleton();image[15].visibility=.2;assert.equal(bodyAudio({x:1,y:1},image,w),null);});
 test('los cuatro samples aparecen sin repeticiones consecutivas',()=>{const s=new Sampler();const a=Array.from({length:40},()=>s.nextSample());for(let i=0;i<a.length;i+=4)assert.equal(new Set(a.slice(i,i+4)).size,4);for(let i=1;i<a.length;i++)assert.notEqual(a[i],a[i-1]);});

test('ambient samples remain low while the roar is one octave higher than its previous version',()=>{
 const rates=[];const sampler=new Sampler(),node=()=>({gain:{},pan:{},connect(){},disconnect(){}});
 sampler.ctx={state:'running',createBufferSource(){const s={playbackRate:{},connect(){},start(){rates.push(this.playbackRate.value);}};return s;},createGain:node,createStereoPanner:node};sampler.buffers=[{},null,null,null,{}];
 sampler.play(0,{rate:2,mouthRate:1.5,reverb:0,pan:0});sampler.play(4,{rate:2,mouthRate:1.5,reverb:0,pan:0});
 assert.equal(SAMPLE_OCTAVE_RATE,.5);assert.deepEqual(rates,[1,1.5]);
});

test('theremin volume defaults to 65 percent, is independent of samples and smoothly mutes its full output',()=>{
 const sampler=new Sampler(),changes=[];assert.equal(sampler.thereminLevel,.65);sampler.thereminVolume(.4);assert.equal(sampler.thereminLevel,.4);
 sampler.ctx={currentTime:3};sampler.master={gain:{value:.65}};sampler.thereminBus={gain:{setTargetAtTime(...a){changes.push(a);}}};sampler.thereminVolume(0);assert.deepEqual(changes.at(-1),[0,3,.03]);assert.equal(sampler.master.gain.value,.65);sampler.thereminVolume(2);assert.equal(sampler.thereminLevel,1);assert.deepEqual(changes.at(-1),[4,3,.03]);sampler.thereminVolume(.65);assert.deepEqual(changes.at(-1),[2.6,3,.03]);
});

test('samples volume controls only its own bus including reverb; global mute preserves both faders',()=>{
 const sampler=new Sampler(),samples=[],master=[],theremin=[];sampler.ctx={currentTime:2};sampler.sampleBus={gain:{setTargetAtTime(...a){samples.push(a);}}};sampler.master={gain:{setTargetAtTime(...a){master.push(a);}}};sampler.thereminBus={gain:{setTargetAtTime(...a){theremin.push(a);}}};
 sampler.volume(0);assert.deepEqual(samples.at(-1),[0,2,.03]);assert.deepEqual(master.at(-1),[1,2,.03]);assert.equal(theremin.length,0);assert.equal(sampler.thereminLevel,.65);
 sampler.thereminVolume(1);assert.deepEqual(theremin.at(-1),[4,2,.03]);assert.equal(sampler.sampleLevel,0);
 sampler.muted=true;sampler.volume(.4);assert.deepEqual(master.at(-1),[0,2,.03]);sampler.muted=false;sampler.volume(.4);assert.deepEqual(master.at(-1),[1,2,.03]);assert.equal(sampler.thereminLevel,1);
});
