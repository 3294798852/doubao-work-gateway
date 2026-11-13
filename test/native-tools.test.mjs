import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {startNative} from '../native/gateway.mjs';

test('网关 HTTP 完成纯工具回复、结果回传与流内工具错误',async t=>{
  const root=await mkdtemp(join(tmpdir(),'doubao-tools-http-'));
  const tool={type:'function',function:{name:'lookup',parameters:{type:'object'}}};
  const call={index:0,id:'call_fixture',type:'function',function:{name:'lookup',arguments:'{}'}};
  const app=await startNative({dir:root,modelPort:0,panelPort:0,timer:false,readDevice:async()=>undefined,client:{
    identity:async()=>({identity:'fixture:0',name:'Fixture'}),models:async()=>['fixture'],
    async *chat(_session,body){
      assert.deepEqual(body.tools,[tool]);
      if(body.messages[0].content==='invalid'){
        yield {reasoning_content:'thinking'};
        throw Object.assign(Error('invalid tool response'),{status:502,type:'invalid_tool_call'});
      }
      if(body.messages.at(-1).role==='tool'){
        assert.equal(body.messages.at(-1).tool_call_id,call.id);yield {content:body.messages.at(-1).content};
      }else yield {tool_calls:[call]};
    },
  }});
  t.after(async()=>{await app.stop();await rm(root,{recursive:true,force:true});});
  await app.services.importCookies({cookieHeader:'sessionid=fixture'});
  const messages=[{role:'user',content:'lookup'}];
  const ask=extra=>fetch(app.modelOrigin+'/v1/chat/completions',{method:'POST',
    headers:{Authorization:'Bearer '+app.services.keys.defaultKey(),'Content-Type':'application/json'},
    body:JSON.stringify({model:'fixture',messages,tools:[tool],...extra})});
  const first=await ask({});
  assert.equal(first.status,200);
  const choice=(await first.json()).choices[0];
  assert.equal(choice.finish_reason,'tool_calls');assert.equal(choice.message.content,null);
  assert.equal(choice.message.tool_calls[0].id,call.id);
  const next=await ask({stream:true,messages:[...messages,choice.message,
    {role:'tool',tool_call_id:call.id,content:'lookup-result'}]});
  const completed=await next.text();
  assert.equal(next.status,200);assert.match(completed,/lookup-result/);assert.match(completed,/\[DONE\]/);
  const broken=await ask({stream:true,messages:[{role:'user',content:'invalid'}]});
  const error=await broken.text();
  assert.equal(broken.status,200);assert.match(error,/invalid_tool_call/);assert(!error.includes('[DONE]'));
  assert.equal(app.services.snapshot().accounts[0].state,'ready');
});
