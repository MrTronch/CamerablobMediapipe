// Chromatic theremin-style voice, B2–B7. Vertical position selects semitones.
export const CHROMATIC_MIDI=Array.from({length:61},(_,i)=>47+i);
const clamp=v=>Math.max(0,Math.min(1,v));
export function frameSound(rect,width,height,previous=-1){
 if(!rect||width<=0||height<=0)return null;
 const x=clamp((rect.x+rect.w/2)/width),y=clamp((rect.y+rect.h/2)/height),position=(1-y)*CHROMATIC_MIDI.length;
 let degree=Math.min(CHROMATIC_MIDI.length-1,Math.floor(position));
 if(previous>=0&&position>=previous-.12&&position<previous+1.12)degree=previous;
 const spread=clamp(rect.w/width);
 return {degree,frequency:440*2**((CHROMATIC_MIDI[degree]-69)/12),cutoff:700*(7000/700)**x,q:.65,gain:.018*(rect.opacity??1),wet:.55+1.25*spread**1.2,pan:(x-.5)*.6};
}
// Sine-led theremin, quiet upper harmonic, vibrato and filtered breath noise.
// Dedicated long stereo convolution space; no runtime library.
export function roomImpulse(ctx){
 const duration=5,buffer=ctx.createBuffer(2,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate);let seed=7301;
 for(let ch=0;ch<2;ch++){
  const data=buffer.getChannelData(ch);let smooth=0;
  for(let i=0;i<data.length;i++){seed=(seed*1664525+1013904223)>>>0;const noise=seed/2147483648-1;smooth=smooth*.45+noise*.55;const t=i/ctx.sampleRate;data[i]=smooth*Math.min(1,t/.018)*Math.exp(-t*1.25);}
 }
 return buffer;
}
// Colored noise with a slow surf swell; an 8-second loop has faded seams.
export function surfBuffer(ctx){
 const n=ctx.sampleRate*8,buffer=ctx.createBuffer(1,n,ctx.sampleRate),data=buffer.getChannelData(0);let seed=1209,low=0;
 for(let i=0;i<n;i++){
  seed=(seed*1664525+1013904223)>>>0;const white=seed/2147483648-1;low=low*.92+white*.08;
  const phase=i/n*Math.PI*2,swell=.25+.75*((1-Math.cos(phase))*.5)**1.5;
  const seam=Math.min(1,i/(ctx.sampleRate*.015),(n-1-i)/(ctx.sampleRate*.015));
  data[i]=(low*2+white*.18)*swell*seam;
 }
 return buffer;
}
export class HandSynth{
 constructor(ctx,destination){
  this.ctx=ctx;this.degree=-1;this.filter=ctx.createBiquadFilter();this.filter2=ctx.createBiquadFilter();this.amp=ctx.createGain();this.pan=ctx.createStereoPanner();
  this.filter.type=this.filter2.type='lowpass';this.amp.gain.value=0;
  this.oscillators=[[0,'sine',1,.85],[0,'triangle',2,.10]].map(([detune,type,ratio,level])=>{
   const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=type;osc.detune.value=detune;gain.gain.value=level;osc.connect(gain);gain.connect(this.filter);osc.start();return {osc,ratio};
  });
  this.vibrato=ctx.createOscillator();this.vibrato.type='sine';this.vibrato.frequency.value=5.2;
  this.vibratoDepth=ctx.createGain();this.vibratoDepth.gain.value=9;this.vibrato.connect(this.vibratoDepth);
  for(const {osc} of this.oscillators)this.vibratoDepth.connect(osc.detune);this.vibrato.start();
  this.noise=ctx.createBufferSource();this.noise.buffer=surfBuffer(ctx);this.noise.loop=true;
  this.noiseFilter=ctx.createBiquadFilter();this.noiseFilter.type='lowpass';this.noiseFilter.frequency.value=1800;this.noiseFilter.Q.value=.45;
  this.noiseGain=ctx.createGain();this.noiseGain.gain.value=.18;
  this.surfMotion=ctx.createOscillator();this.surfMotion.type='sine';this.surfMotion.frequency.value=.125;
  this.surfDepth=ctx.createGain();this.surfDepth.gain.value=1050;this.surfMotion.connect(this.surfDepth);this.surfDepth.connect(this.noiseFilter.frequency);this.surfMotion.start();
  this.noise.connect(this.noiseFilter);this.noiseFilter.connect(this.noiseGain);this.noiseGain.connect(this.filter);this.noise.start();
  this.saturator=ctx.createWaveShaper();const curve=new Float32Array(1024);for(let i=0;i<curve.length;i++){const x=i/(curve.length-1)*2-1;curve[i]=Math.tanh(x*1.3)/Math.tanh(1.3);}this.saturator.curve=curve;
  this.room=ctx.createConvolver();this.room.buffer=roomImpulse(ctx);this.roomGain=ctx.createGain();this.roomGain.gain.value=0;
  this.roomTone=ctx.createBiquadFilter();this.roomTone.type='lowpass';this.roomTone.frequency.value=4200;
  this.filter.connect(this.filter2);this.filter2.connect(this.saturator);this.saturator.connect(this.amp);this.amp.connect(this.pan);this.dry=ctx.createGain();this.dry.gain.value=.75;this.pan.connect(this.dry);this.dry.connect(destination);
  this.pan.connect(this.room);this.room.connect(this.roomTone);this.roomTone.connect(this.roomGain);this.roomGain.connect(destination);
 }
 update(rect,width,height){
  const now=this.ctx.currentTime,p=frameSound(rect,width,height,this.degree);
  if(!p){this.degree=-1;this.amp.gain.setTargetAtTime(0,now,.06);return;}
  this.degree=p.degree;
  for(const {osc,ratio} of this.oscillators)osc.frequency.setTargetAtTime(p.frequency*ratio,now,.045);
  const cutoff=Math.min(p.cutoff,this.ctx.sampleRate*.4);
  this.filter.frequency.setTargetAtTime(cutoff,now,.04);this.filter2.frequency.setTargetAtTime(cutoff,now,.04);
  this.filter.Q.setTargetAtTime(p.q,now,.05);this.filter2.Q.setTargetAtTime(.707,now,.05);
  this.pan.pan.setTargetAtTime(p.pan,now,.05);this.amp.gain.setTargetAtTime(p.gain,now,.035);this.roomGain.gain.setTargetAtTime(p.wet,now,.08);
 }
 silence(){this.degree=-1;for(const gain of [this.amp.gain,this.roomGain.gain]){gain.cancelScheduledValues(this.ctx.currentTime);gain.setValueAtTime(0,this.ctx.currentTime);}}
}
