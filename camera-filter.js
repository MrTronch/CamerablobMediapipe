export function monochromePixels(data){
 for(let i=0;i<data.length;i+=4){const gray=((data[i]*.2126+data[i+1]*.7152+data[i+2]*.0722)-127.5)*1.35+127.5;const v=Math.max(0,Math.min(255,gray*.96));data[i]=data[i+1]=data[i+2]=v;}
 return data;
}
// Four cached grain tiles; no full-frame getImageData or per-frame random noise.
export function createCameraFilter(makeCanvas=()=>document.createElement('canvas')){
 const image=makeCanvas(),ic=image.getContext('2d'),small=makeCanvas(),gc=small.getContext('2d'),tiles=[];
 for(let n=0;n<4;n++){const tile=makeCanvas();tile.width=tile.height=96;const tc=tile.getContext('2d'),pixels=tc.createImageData(96,96);for(let i=0;i<pixels.data.length;i+=4){const v=Math.random()*255;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=v;pixels.data[i+3]=255;}tc.putImageData(pixels,0,0);tiles.push(tile);}
 const nativeFilter=typeof gc.filter==='string';
 let patterns=null,lastRevision=null;
 return {
  image(source,enabled,revision){if(!enabled)return source;if(revision!==undefined&&revision===lastRevision&&image.width===source.width&&image.height===source.height)return image;lastRevision=revision;if(image.width!==source.width||image.height!==source.height){image.width=source.width;image.height=source.height;}const w=Math.min(480,source.width),h=Math.round(source.height*w/source.width);if(small.width!==w||small.height!==h){small.width=w;small.height=h;}if(nativeFilter)gc.filter='grayscale(1) contrast(1.35) brightness(0.96)';gc.drawImage(source,0,0,w,h);if(!nativeFilter){const pixels=gc.getImageData(0,0,w,h);monochromePixels(pixels.data);gc.putImageData(pixels,0,0);}ic.drawImage(small,0,0,image.width,image.height);return image;},
  grain(ctx,width,height,now,enabled){if(!enabled)return;if(!patterns)patterns=tiles.map(tile=>ctx.createPattern(tile,'repeat'));ctx.save();ctx.globalAlpha=.065;ctx.globalCompositeOperation='source-over';ctx.fillStyle=patterns[Math.floor(now/100)%4];ctx.fillRect(0,0,width,height);ctx.restore();}
 };
}

export function contrastPixels(data,amount=1.6,monochrome=false){
 for(let i=0;i<data.length;i+=4){const gray=data[i]*.2126+data[i+1]*.7152+data[i+2]*.0722;for(let c=0;c<3;c++)data[i+c]=Math.max(0,Math.min(255,((monochrome?gray:data[i+c])-127.5)*amount+127.5));}
 return data;
}
