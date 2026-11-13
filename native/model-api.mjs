import {randomUUID} from 'node:crypto';
import {once} from 'node:events';
import {parseChat,completionError,completionChunks} from './completion.mjs';
export {parseChat} from './completion.mjs';

const fail=(status,message,type='invalid_request_error')=>Object.assign(Error(message),{status,type});
export function sendJson(res,status,value){
 if(res.destroyed)return;
 res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
 res.end(JSON.stringify(value));
}
export async function readJson(req,limit=262144){
 if((req.headers['content-type']||'').split(';')[0].trim().toLowerCase()!=='application/json')throw fail(415,'请使用 application/json。');
 if(Number(req.headers['content-length'])>limit)throw fail(413,'请求体过大。');
 const chunks=[];let len=0;
 for await(const c of req.iterator({destroyOnReturn:false})){len+=c.length;if(len>limit){req.resume();throw fail(413,'请求体过大。');}chunks.push(c);}
 let v;try{v=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw fail(400,'JSON 请求格式有误。');}
 if(!v||typeof v!=='object'||Array.isArray(v))throw fail(400,'请提交 JSON 对象。');
 return v;
}
export function createModelHandler({services,accepts,shutdown}){
 return async(req,res)=>{
  const id='dw-'+randomUUID();
  res.setHeader('X-Request-Id',id);
  const stop=new AbortController(),signal=shutdown?AbortSignal.any([shutdown,stop.signal]):stop.signal;
  const disconnect=()=>{if(!res.writableEnded)stop.abort();};
  res.once('close',disconnect);
  try{
   if(!accepts(req)||req.headers.origin||req.headers['sec-fetch-site']==='cross-site')throw fail(403,'模型接口不接受此请求来源。');
   if(!['/v1/models','/v1/chat/completions'].includes(req.url))throw fail(404,'未找到该模型接口。');
   const match=/^Bearer ([A-Za-z0-9_-]{16,256})$/i.exec(req.headers.authorization||''),key=match&&services.keys.authenticate(match[1]);
   if(!key)throw fail(401,'API Key 无效或已停用。','invalid_api_key');
   const ids=services.catalog().filter(m=>!key.allowedModels.length||key.allowedModels.includes(m));
   if(req.method==='GET'&&req.url==='/v1/models')return sendJson(res,200,{object:'list',data:ids.map(id=>({id,object:'model',owned_by:'doubaowork'}))});
   if(req.method!=='POST'||req.url!=='/v1/chat/completions')throw fail(405,'请求方法有误。');
   const body=parseChat(await readJson(req));
   if(!ids.includes(body.model))throw fail(404,'模型未接入或不在此 Key 的可用范围内。','model_not_found');
   const deltas=services.chat(body,{signal,requestId:id});
   for await(const output of completionChunks(deltas,body,{signal,requestId:id})){
    if(!body.stream)return sendJson(res,200,output);
    if(!res.headersSent){
     res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-store','X-Accel-Buffering':'no','X-Content-Type-Options':'nosniff'});
    }
    if(!res.write(output))await once(res,'drain',{signal});
   }
   res.end();
  }catch(e){
   if(signal.aborted||res.destroyed){res.destroy();return;}
   const err=completionError(e,id);
   if(res.headersSent)res.end('event: error\ndata: '+JSON.stringify(err.body)+'\n\n');
   else sendJson(res,err.status,err.body);
  }finally{res.removeListener('close',disconnect);}
 };
}
