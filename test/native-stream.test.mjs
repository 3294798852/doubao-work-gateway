import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {startNative} from '../native/gateway.mjs';
import {decodeEvents} from '../native/doubao-stream.mjs';

test('网关 HTTP 返回完整消息短答与 usage，消息结束后的断流保留错误',async t=>{
  const root=await mkdtemp(join(tmpdir(),'doubao-sse-http-'));
  const frame=(event,value)=>'event: '+event+'\ndata: '+JSON.stringify(value)+'\n\n';
  const usage={prompt_tokens:7,completion_tokens:3,total_tokens:10};
  const snapshot=frame('FULL_MSG_NOTIFY',{message:{user_type:2,content:JSON.stringify([
    {block_type:10000,block_id:'answer',content:{text_block:{text:'缓存保存副本。'}}},
  ])}});
  let raw=frame('SSE_REPLY_END',{end_type:1})+snapshot+frame('SSE_REPLY_END',{end_type:3,usage});
  const app=await startNative({dir:root,modelPort:0,panelPort:0,timer:false,readDevice:async()=>undefined,client:{
    identity:async()=>({identity:'fixture:0',name:'Fixture'}),models:async()=>['fixture'],
    chat:()=>decodeEvents(new Response(raw)),
  }});
  t.after(async()=>{await app.stop();await rm(root,{recursive:true,force:true});});
  await app.services.importCookies({cookieHeader:'sessionid=fixture'});
  const ask=stream=>fetch(app.modelOrigin+'/v1/chat/completions',{method:'POST',
    headers:{Authorization:'Bearer '+app.services.keys.defaultKey(),'Content-Type':'application/json'},
    body:JSON.stringify({model:'fixture',messages:[{role:'user',content:'缓存'}],stream,stream_options:{include_usage:true}})});
  const complete=await ask(false),value=await complete.json();
  assert.equal(complete.status,200);assert.equal(value.choices[0].message.content,'缓存保存副本。');
  assert.deepEqual(value.usage,usage);
  const stream=await ask(true),wire=await stream.text();
  assert.match(wire,/缓存保存副本。/);assert.match(wire,/"choices":\[\],"usage"/);assert.match(wire,/\[DONE\]/);
  raw=snapshot+frame('SSE_REPLY_END',{end_type:1});
  const broken=await ask(true),error=await broken.text();
  assert.match(error,/upstream_stream_error/);assert.match(error,/正式结束标记/);assert(!error.includes('[DONE]'));
  assert.equal(app.services.snapshot().accounts[0].state,'ready');
});
