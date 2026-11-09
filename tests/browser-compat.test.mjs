import {test} from 'node:test';import assert from 'node:assert/strict';
import {createCameraFilter} from '../camera-filter.js';import {trackerBitmap} from '../browser-compat.js';import {setupPresentation} from '../presentation.js';
test('canvas without filter support produces grayscale pixels with contrast',()=>{
 let processed;const make=()=>({width:0,height:0,getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(image){if(image.data.length===4)processed=image.data;},drawImage(){},getImageData:()=>({data:new Uint8ClampedArray([200,80,20,255])})})});
 const filter=createCameraFilter(make);filter.image({width:960,height:540},true,1);assert.ok(processed);assert.equal(processed[0],processed[1]);assert.equal(processed[1],processed[2]);assert.equal(processed[3],255);
});
test('bitmap conversion retries through a small canvas when video resize options are rejected',async()=>{
 const oldBitmap=globalThis.createImageBitmap,oldDocument=globalThis.document,calls=[];
 const canvas={width:0,height:0,getContext:()=>({drawImage(){}})};
 try{globalThis.document={createElement:()=>canvas};globalThis.createImageBitmap=async(...args)=>{calls.push(args);if(args.length>1)throw Error('Unsupported video options');return {ok:true};};
 const result=await trackerBitmap({videoWidth:1280,videoHeight:720});assert.equal(result.ok,true);assert.equal(calls.length,2);assert.equal(calls[1][0],canvas);assert.equal(canvas.width,480);assert.equal(canvas.height,270);
 }finally{globalThis.createImageBitmap=oldBitmap;globalThis.document=oldDocument;}
});
test('fullscreen uses an in-page view when the native API is missing',async()=>{
 const oldDocument=globalThis.document,oldWindow=globalThis.window;
 const classes=()=>{const set=new Set();return {contains:v=>set.has(v),add:v=>set.add(v),remove:v=>set.delete(v),toggle(v,on){on?set.add(v):set.delete(v);}};};
 try{globalThis.document={documentElement:{classList:classes()},body:{classList:classes()},addEventListener(){},fullscreenElement:null};globalThis.window={addEventListener(){},visualViewport:{addEventListener(){}}};
 const stage={classList:classes()},button={},exit={hidden:true};let resized=0;
 setupPresentation({stage,button,exitButton:exit,onResize:()=>resized++,onError:message=>{throw Error(message);}});await button.onclick();assert.equal(stage.classList.contains('immersive'),true);assert.equal(exit.hidden,false);await exit.onclick();assert.equal(stage.classList.contains('immersive'),false);assert.equal(exit.hidden,true);assert.ok(resized>=2);
 }finally{globalThis.document=oldDocument;globalThis.window=oldWindow;}
});
test('portrait analysis bounds the longest side to 480 rather than allocating a tall full-width bitmap',async()=>{
 const oldBitmap=globalThis.createImageBitmap,oldDocument=globalThis.document,calls=[];
 try{globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({drawImage(){}})})};globalThis.createImageBitmap=async(...args)=>{calls.push(args);if(args.length>1)throw Error('Unsupported video options');return {};};await trackerBitmap({videoWidth:720,videoHeight:1280});const canvas=calls[1][0];assert.equal(canvas.width,270);assert.equal(canvas.height,480);
 }finally{globalThis.createImageBitmap=oldBitmap;globalThis.document=oldDocument;}
});
