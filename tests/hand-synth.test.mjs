import {test} from 'node:test';import assert from 'node:assert/strict';import {PENTATONIC_MIDI,frameSound,HandSynth,surfBuffer} from '../hand-synth.js';
test('vertical motion selects pentatonic degrees across five octaves; horizontal opens cutoff and spread opens reverb',()=>{
 const rect={x:200,y:200,w:100,h:100};const a=frameSound(rect,960,540);assert.ok(PENTATONIC_MIDI.some(n=>Math.abs(a.frequency-440*2**((n-69)/12))<1e-9));
 assert.ok(frameSound({...rect,y:0},960,540).frequency>a.frequency);assert.equal(frameSound({...rect,x:700},960,540).frequency,a.frequency);assert.ok(frameSound({...rect,x:700},960,540).cutoff>a.cutoff);
 assert.ok(frameSound({...rect,w:400},960,540).wet>a.wet);assert.equal(PENTATONIC_MIDI.at(-1)-PENTATONIC_MIDI[0],60);assert.equal(PENTATONIC_MIDI.length,26);assert.ok(PENTATONIC_MIDI.every(n=>[0,2,4,7,9].includes((n-47)%12)));assert.ok(a.wet>=.55);assert.ok(a.gain<.03);assert.equal(frameSound(null,960,540),null);
});
test('note boundary hysteresis prevents vertical jitter but allows deliberate changes',()=>{
 const at=p=>({x:0,y:(1-p/PENTATONIC_MIDI.length)*1000,w:0,h:0});assert.equal(frameSound(at(3),960,1000,2).degree,2);assert.equal(frameSound(at(3.2),960,1000,2).degree,3);
});
test('theremin reuses its tone, vibrato and noise nodes, releases on frame loss and silences all outputs on stop',()=>{
 let starts=0;const scheduled=[];const param=()=>({value:0,setTargetAtTime(v,t,c){scheduled.push([v,c]);},cancelScheduledValues(){},setValueAtTime(v){scheduled.push([v,0]);}});const node=()=>({frequency:param(),detune:param(),Q:param(),gain:param(),pan:param(),connect(){},start(){starts++;}});
 const ctx={currentTime:1,sampleRate:8000,createOscillator:node,createBufferSource:node,createBiquadFilter:node,createGain:node,createStereoPanner:node,createWaveShaper:node,createConvolver:node,createBuffer(ch,n){const data=Array.from({length:ch},()=>new Float32Array(n));return {getChannelData:i=>data[i]};}};
 const synth=new HandSynth(ctx,{});for(let i=0;i<20;i++)synth.update({x:i,y:0,w:100,h:80},960,540);assert.equal(starts,5);assert.ok(synth.room.buffer.getChannelData(0).some(v=>v!==0));assert.equal(synth.room.buffer.getChannelData(0).length,40000);assert.equal(synth.oscillators[0].osc.type,'sine');assert.equal(synth.noise.loop,true);assert.equal(synth.surfMotion.frequency.value,.125);assert.equal(synth.vibrato.frequency.value,5.2);assert.ok(synth.noise.buffer.getChannelData(0).some(v=>v!==0));assert.notDeepEqual(synth.room.buffer.getChannelData(0),synth.room.buffer.getChannelData(1));synth.update(null,960,540);assert.deepEqual(scheduled.at(-1),[0,.06]);synth.silence();assert.deepEqual(scheduled.slice(-2),[[0,0],[0,0]]);
});

test('theremin range is transposed an octave and extends one additional octave above it',()=>{assert.equal(PENTATONIC_MIDI[0],47);assert.equal(PENTATONIC_MIDI.at(-1),107);});
test('surf noise has a strong slow swell and no discontinuity at its loop seam',()=>{
 const ctx={sampleRate:8000,createBuffer(c,n){const data=Array.from({length:c},()=>new Float32Array(n));return {getChannelData(i){return data[i];}};}};const data=surfBuffer(ctx).getChannelData(0);
 const rms=(start,end)=>Math.sqrt(data.slice(start,end).reduce((s,x)=>s+x*x,0)/(end-start));assert.equal(data.length,128000);assert.equal(data[0],0);assert.equal(data.at(-1),0);assert.ok(rms(28000,36000)>rms(2000,6000)*2);
});
