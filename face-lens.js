// Inverse radial mapping: magnifies the center while pinning all four edges.
export function lensPoint(x,y,strength){
 const k=Math.max(0,Math.min(1,strength))*.8;
 const factor=1-k*(1-x*x)*(1-y*y);
 return {x:x*factor,y:y*factor};
}
export function createFaceLens(makeCanvas=()=>document.createElement('canvas')){
 let input,output,key='',map;
 function image(source,crop,strength,revision){
  if(!input){input=makeCanvas();output=makeCanvas();}
  const scale=Math.min(1,256/Math.max(crop.w,crop.h)),w=Math.max(2,Math.round(crop.w*scale)),h=Math.max(2,Math.round(crop.h*scale));
  const next=[revision,crop.x,crop.y,crop.w,crop.h,strength,w,h].join(':');
  if(key===next)return output;
  const mapKey=[w,h,strength].join(':');
  if(map?.key!==mapKey){
   const values=new Float32Array(w*h*2);
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p=lensPoint(x/(w-1)*2-1,y/(h-1)*2-1,strength),i=(y*w+x)*2;values[i]=(p.x+1)*.5*(w-1);values[i+1]=(p.y+1)*.5*(h-1);}
   map={key:mapKey,values};
  }
  if(input.width!==w||input.height!==h){input.width=output.width=w;input.height=output.height=h;}
  const ic=input.getContext('2d',{willReadFrequently:true}),oc=output.getContext('2d');
  ic.drawImage(source,crop.x,crop.y,crop.w,crop.h,0,0,w,h);
  const src=ic.getImageData(0,0,w,h).data,dst=oc.createImageData(w,h);
  for(let i=0;i<w*h;i++){
   const sx=map.values[i*2],sy=map.values[i*2+1],x=Math.floor(sx),y=Math.floor(sy),fx=sx-x,fy=sy-y;
   const a=(y*w+x)*4,b=(y*w+Math.min(w-1,x+1))*4,c=(Math.min(h-1,y+1)*w+x)*4,d=(Math.min(h-1,y+1)*w+Math.min(w-1,x+1))*4;
   for(let channel=0;channel<4;channel++)dst.data[i*4+channel]=(src[a+channel]*(1-fx)+src[b+channel]*fx)*(1-fy)+(src[c+channel]*(1-fx)+src[d+channel]*fx)*fy;
  }
  oc.putImageData(dst,0,0);key=next;return output;
 }
 return {image};
}
