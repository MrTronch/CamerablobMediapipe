import {test} from 'node:test';import assert from 'node:assert/strict';import {TrackingBridge} from '../tracking-bridge.js';
function harness(){const workers=[];const factory=()=>{const w={sent:[],postMessage(data){this.sent.push(data);},terminate(){this.stopped=true;}};workers.push(w);return w;};const bridge=new TrackingBridge(factory,async bitmap=>({...bitmap,cloned:true,close(){this.closed=true;}}));const events=[];bridge.onmessage=e=>events.push(e.data);return {bridge,workers,events};}
test('hands emit results without waiting for the busy face worker; face work never queues',async()=>{
 const {bridge,workers,events}=harness();await bridge.postMessage({type:'init'});await workers[0].onmessage({data:{type:'ready'}});assert.equal(events.length,0);await workers[1].onmessage({data:{type:'ready'}});assert.equal(events[0].type,'ready');
 const bitmap={close(){}};await bridge.postMessage({type:'frame',bitmap,time:100,epoch:1});assert.equal(workers[0].sent.length,2);assert.equal(workers[1].sent.length,2);
 await workers[0].onmessage({data:{type:'hands',hands:[[{x:.2,y:.3}]],time:100,epoch:1}});assert.equal(events.at(-1).hands.length,1);assert.deepEqual(events.at(-1).faces,[]);
 await bridge.postMessage({type:'frame',bitmap,time:300,epoch:1});assert.equal(workers[0].sent.length,3);assert.equal(workers[1].sent.length,2);
 await workers[1].onmessage({data:{type:'face',faces:[[{x:.5,y:.5}]],time:performance.now(),epoch:1}});
 await workers[0].onmessage({data:{type:'hands',hands:[],time:300,epoch:1}});assert.equal(events.at(-1).faces.length,1);
 bridge.terminate();assert.ok(workers.every(w=>w.stopped));
});
test('face results from an old camera session are discarded and their bitmaps are closed',async()=>{
 const {bridge,workers}=harness();let closed=false;await bridge.postMessage({type:'frame',bitmap:{close(){}},time:10,epoch:2});await workers[1].onmessage({data:{type:'face',faces:[],epoch:1,eyePatch:{close(){closed=true;}}}});assert.equal(closed,true);assert.equal(bridge.cache,null);bridge.terminate();
});
