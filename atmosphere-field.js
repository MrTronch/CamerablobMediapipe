export function createFieldRenderer(canvas,{width=256,height=144,columns=4,rows=2}={}){
 const ctx=canvas?.getContext('2d',{alpha:false});if(!ctx)return ()=>{};
 const w=width,h=height;canvas.width=w;canvas.height=h;
 const frame=ctx.createImageData(w,h),grain=Float32Array.from({length:w*h},()=>Math.random()-.5);
 const seeds=Array.from({length:columns*rows},(_,i)=>({x:(i%columns+.5)/columns,y:(Math.floor(i/columns)+.5)/rows,phase:i*2.399}));
 let last=0,phase=0,loudness=0,bass=0,treble=0,pulse=0,previous=0,inversion=0;
 return ({now,audio,targets=[],motion=1,open=false})=>{
  const dt=Math.min(100,now-last||64);last=now;
  inversion+=((open?1:0)-inversion)*.55;
  loudness+=(audio.level-loudness)*(audio.level>loudness?.8:.2);bass+=(audio.bass-bass)*.4;treble+=(audio.treble-treble)*.4;
  pulse=Math.max(pulse*.8,Math.max(0,audio.level-previous)*3);previous=audio.level;
  phase+=dt*.00016*(1+loudness*4+bass*3)*motion;
  const drive=(loudness*2+bass*1.7+pulse)*motion;
  const cells=seeds.map(s=>({x:s.x+Math.sin(phase+s.phase)*.07,y:s.y+Math.cos(phase*.8+s.phase)*.09}));
  const active=motion?targets.slice(0,4):[];
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const u=x/w,v=y/h;let warp=0,first=10,second=10;
   for(const b of active){const dx=u-b.x,dy=v-b.y;warp+=Math.exp(-(dx*dx+dy*dy)*24)*.3;}
   const px=u+Math.sin(v*5+phase+Math.sin(u*4-phase)*.7)*.11,py=v+Math.cos(u*5-phase+Math.cos(v*4+phase)*.7)*.1;
   for(const c of cells){const dx=(px-c.x)*1.5,dy=py-c.y,d=dx*dx+dy*dy;if(d<first){second=first;first=d;}else if(d<second)second=d;}
   const cellular=Math.exp(-(second-first)*(110-drive*18));
   const field=Math.sin(px*6+Math.sin(py*5+phase)*1.8+phase+warp*4+drive)
    +Math.cos(py*7-px*2-phase*.7)+Math.sin(px*4+py*3+phase*.5)*.6;
   const contour=Math.pow(.5+.5*Math.cos(field*8+drive*2),3.5);
   const cloud=Math.max(0,.5+.5*Math.sin(field*1.4+phase));
   const intensity=Math.min(1,contour*(.32+loudness*.35*motion)+cellular*.19+cloud*.07);
   const grainOffset=motion?Math.floor(phase*31)%grain.length:0;
   const n=grain[(y*w+x+grainOffset)%grain.length]*(5+treble*19*motion);
   const i=(y*w+x)*4;
   const tone=Math.min(1,intensity*1.9),shade=tone*(1-inversion)+(1-tone)*inversion;
   frame.data[i]=5+shade*85+n;frame.data[i+1]=3+shade*40+n*.5;frame.data[i+2]=9+shade*151+n;frame.data[i+3]=255;
  }
  ctx.putImageData(frame,0,0);
 };
}
