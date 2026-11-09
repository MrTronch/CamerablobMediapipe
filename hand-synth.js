// Major pentatonic theremin, B2–B7. Vertical position selects scale degrees.
export const PENTATONIC_MIDI=Array.from({length:26},(_,i)=>47+Math.floor(i/5)*12+[0,2,4,7,9][i%5]);
const clamp=v=>Math.max(0,Math.min(1,v));
export function frameSound(rect,width,height,previous=-1){
 if(!rect||width<=0||height<=0)return null;
 const x=clamp((rect.x+rect.w/2)/width),y=clamp((rect.y+rect.h/2)/height),position=(1-y)*PENTATONIC_MIDI.length;
 let degree=Math.min(PENTATONIC_MIDI.length-1,Math.floor(position));
 if(previous>=0&&position>=previous-.12&&position<previous+1.12)degree=previous;
 const spread=clamp(rect.w/width);
 return {degree,frequency:440*2**((PENTATONIC_MIDI[degree]-69)/12),cutoff:700*(7000/700)**x,q:.65,gain:.018*(rect.opacity??1),wet:.55+1.25*spread**1.2,pan:(x-.5)*.6};
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
// Stereo surf: low/mid colored turbulence, broad irregular swells, no raw hiss.
export function surfBuffer(ctx){
 const n=ctx.sampleRate*16,buffer=ctx.createBuffer(2,n,ctx.sampleRate);
 const lowA=Math.exp(-2*Math.PI*110/ctx.sampleRate),midA=Math.exp(-2*Math.PI*700/ctx.sampleRate);
 for(let channel=0;channel<2;channel++){
  const data=buffer.getChannelData(channel);let seed=1209+channel*1709,low=0,mid=0;
  for(let i=0;i<n;i++){
   seed=(seed*1664525+1013904223)>>>0;const white=seed/2147483648-1;
   low=lowA*low+(1-lowA)*white;mid=midA*mid+(1-midA)*white;
   const t=i/ctx.sampleRate,phase=(t%8)/8;
   // A broad crest recedes slowly; the second wave has a different strength.
   const wave=Math.sin(Math.PI*phase)**2;
   const swell=.035+.965*wave**1.3*(.85+.15*Math.cos(Math.PI*t/8));
   const seam=Math.min(1,i/(ctx.sampleRate*.08),(n-1-i)/(ctx.sampleRate*.08));
   data[i]=seam===0?0:(low*3+mid*.45)*swell*seam;
  }
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
  this.noiseFilter=ctx.createBiquadFilter();this.noiseFilter.type='lowpass';this.noiseFilter.frequency.value=750;this.noiseFilter.Q.value=.45;
  this.noiseGain=ctx.createGain();this.noiseGain.gain.value=.28;
  this.surfMotion=ctx.createOscillator();this.surfMotion.type='sine';this.surfMotion.frequency.value=.125;
  this.surfDepth=ctx.createGain();this.surfDepth.gain.value=400;this.surfMotion.connect(this.surfDepth);this.surfDepth.connect(this.noiseFilter.frequency);this.surfMotion.start();
  this.noise.connect(this.noiseFilter);this.noiseFilter.connect(this.noiseGain);this.noiseGain.connect(this.amp);this.noise.start();
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
