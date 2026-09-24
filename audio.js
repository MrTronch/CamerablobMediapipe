export class Sampler{
 constructor(){this.buffers=[];this.voices=new Set();this.muted=false;this.openness=0;this.bag=[];this.lastSample=-1;}
 async unlock(){
  if(!this.ctx){this.ctx=new(window.AudioContext||window.webkitAudioContext)();this.master=this.ctx.createGain();this.master.gain.value=.65;const limiter=this.ctx.createDynamicsCompressor();this.master.connect(limiter);limiter.connect(this.ctx.destination);
   // Original effect: eight discrete echoes spaced 120 ms apart.
   this.reverb=this.ctx.createConvolver();this.reverb.normalize=false;const impulse=this.ctx.createBuffer(2,Math.ceil(this.ctx.sampleRate*.97),this.ctx.sampleRate);
   for(let c=0;c<2;c++){const a=impulse.getChannelData(c);for(let i=0;i<8;i++)a[Math.round(this.ctx.sampleRate*.12*(i+1))]=.6*.75**i;}
   this.reverb.buffer=impulse;this.reverbGain=this.ctx.createGain();this.reverbGain.gain.value=.25;this.reverb.connect(this.reverbGain);this.reverbGain.connect(this.master);
  }await this.ctx.resume();
 }
 setOpenness(value){this.openness+=((value??0)-this.openness)*.25;if(this.reverbGain)this.reverbGain.gain.setTargetAtTime(.25+this.openness*1.1,this.ctx.currentTime,.12);}
 async load(){if(this.buffers.length===5)return;this.buffers=await Promise.all([1,2,3,4,5].map(async i=>{const r=await fetch(`assets/sound${i}.wav`);if(!r.ok)throw Error(`No se pudo cargar sound${i}.wav`);return this.ctx.decodeAudioData(await r.arrayBuffer());}));}
 nextSample(){if(!this.bag.length){this.bag=[0,1,2,3];for(let i=3;i>0;i--){const j=Math.floor(Math.random()*(i+1));[this.bag[i],this.bag[j]]=[this.bag[j],this.bag[i]];}if(this.bag.at(-1)===this.lastSample)[this.bag[0],this.bag[3]]=[this.bag[3],this.bag[0]];}return this.lastSample=this.bag.pop();}
 volume(value){if(this.master)this.master.gain.setTargetAtTime(this.muted?0:value,this.ctx.currentTime,.03);}
 play(index,parameters){
  if(!this.ctx||this.ctx.state!=='running'||this.muted||!this.buffers[index]||this.voices.size>=12)return false;
  const p=parameters??{rate:1,mouthRate:1,reverb:.5,pan:0};
  const source=this.ctx.createBufferSource(),gain=this.ctx.createGain(),wet=this.ctx.createGain(),pan=this.ctx.createStereoPanner();
  source.buffer=this.buffers[index];source.playbackRate.value=index===4?p.mouthRate:p.rate;
  const amount=index===4?Math.max(.5,p.reverb):p.reverb;
  gain.gain.value=.48/Math.sqrt(1+amount*.6);wet.gain.value=amount;pan.pan.value=p.pan*.65;
  source.connect(gain);gain.connect(pan);pan.connect(this.master);pan.connect(wet);wet.connect(this.reverb);
  this.voices.add(source);source.onended=()=>{this.voices.delete(source);source.disconnect();gain.disconnect();pan.disconnect();wet.disconnect();};source.start();return true;
 }
 stop(){for(const voice of this.voices)voice.stop();this.voices.clear();this.ctx?.suspend();}
}
