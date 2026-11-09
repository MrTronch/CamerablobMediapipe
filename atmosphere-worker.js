import {createFieldRenderer} from './atmosphere-field.js';
let render;
onmessage=({data})=>{if(data.type==='init'){render=createFieldRenderer(data.canvas);return;}if(render){render(data);postMessage({type:'done'});}};
