import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {startNative} from '../native/gateway.mjs';

test('独立双端口：验证暂停持久化、明确复测、不接力；API Key 不具备管理权限',async t=>{
 const root=await mkdtemp(join(tmpdir(),'dw-native-'));
 let app,calls=[],challenged=true;
 const client={
  identity:async s=>({identity:s.cookieHeader.endsWith('alpha')?'alpha':'bravo',name:'测试账号'}),
  models:async()=>['test-model'],
  async *chat(s){calls.push(s.cookieHeader);if(challenged)throw {upstream_code:710022004};yield {content:'测试通过'};}
 };
 t.after(async()=>{await app?.stop();await rm(root,{recursive:true,force:true});});
 const start=()=>startNative({dir:root,modelPort:0,panelPort:0,client,timer:false});
 app=await start();
 const panel=(path,body)=>fetch(app.panelOrigin+path,{method:body===undefined?'GET':'POST',headers:{'X-Doubao-Panel':'1',...(body===undefined?{}:{Origin:app.panelOrigin,'Content-Type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body)});
 const key=(await (await panel('/api/key',{})).json()).key;
 assert.equal((await fetch(app.modelOrigin+'/api/key',{headers:{Authorization:'Bearer '+key}})).status,404);
 const a=await app.services.importCookies({cookieHeader:'sessionid=alpha'});
 const b=await app.services.importCookies({cookieHeader:'sessionid=bravo'});
 const ask=(stream=false)=>fetch(app.modelOrigin+'/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model:'test-model',messages:[{role:'user',content:'ping'}],stream})});
 const first=await ask();
 assert.equal(first.status,429);
 assert.equal((await first.json()).error.code,710022004);
 assert.deepEqual(calls,['sessionid=alpha']);
 let state=(await (await panel('/api/snapshot')).json()).accounts;
 assert.equal(state.find(x=>x.id===a.id).state,'needs_verification');
 assert.equal(state.find(x=>x.id===b.id).state,'ready');
 assert(!JSON.stringify(state).includes('sessionid'));
 await app.stop();app=await start();
 assert.equal((await (await panel('/api/snapshot')).json()).accounts.find(x=>x.id===a.id).state,'needs_verification');
 assert.equal((await panel('/api/verification/restore',{id:a.id,confirmed:false})).status,400);
 assert.equal((await panel('/api/verification/restore',{id:a.id,confirmed:true})).status,200);
 challenged=false;
 assert.equal((await ask()).status,200);
 assert.deepEqual(calls,['sessionid=alpha','sessionid=bravo']);
 const retest=await panel('/api/verification/retest',{id:a.id,model:'test-model'});
 assert.equal(retest.status,200);
 assert.deepEqual(calls,['sessionid=alpha','sessionid=bravo','sessionid=alpha']);
 assert.equal((await panel('/api/verification/retest',{id:a.id,model:'test-model'})).status,409);
 const stream=await ask(true);
 assert.match(await stream.text(),/data: \[DONE\]/);
});

test('流中触发验证返回错误事件，每个新请求重新取得上游结果',async t=>{
 const root=await mkdtemp(join(tmpdir(),'dw-native-stream-'));
 let calls=0;
 const app=await startNative({dir:root,modelPort:0,panelPort:0,timer:false,client:{
  identity:async()=>({identity:'fixture:stream',name:'测试'}),models:async()=>['fixture'],
  async *chat(){calls++;yield {content:'partial'};throw {code:0,error:{code:710022004}};},
 }});
 t.after(async()=>{await app.stop();await rm(root,{recursive:true,force:true});});
 const {id}=await app.services.importCookies({cookieHeader:'sessionid=fixture'});
 const ask=()=>fetch(app.modelOrigin+'/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+app.services.keys.defaultKey(),'Content-Type':'application/json'},body:JSON.stringify({model:'fixture',stream:true,messages:[{role:'user',content:'ping'}]})});
 const r=await ask();assert.equal(r.status,200);
 const text=await r.text();assert.match(text,/partial/);assert.match(text,/event: error/);assert.match(text,/710022004/);assert(!text.includes('[DONE]'));
 assert.equal(app.services.snapshot().accounts.find(a=>a.id===id).state,'needs_verification');
 const retried=await ask(),again=await retried.text();
 assert.equal(retried.status,200);assert.match(again,/710022004/);assert(!again.includes('[DONE]'));assert.equal(calls,2);
});

test('旧验证状态在新聊天成功后恢复，自动签到保留暂停直到确认成功',async t=>{
 const root=await mkdtemp(join(tmpdir(),'dw-verification-recovery-'));
 let verified=false,calls=0,checkins=0,failure={upstream_code:710022004};
 const app=await startNative({dir:root,modelPort:0,panelPort:0,timer:false,readDevice:async()=>undefined,client:{
  identity:async()=>({identity:'fixture:recover',name:'测试'}),models:async()=>['fixture'],
  async *chat(){calls++;if(!verified)throw failure;yield {content:'verified result'};},
  checkin:async()=>{checkins++;return {status:'done'};},
 }});
 t.after(async()=>{await app.stop();await rm(root,{recursive:true,force:true});});
 const {id}=await app.services.importCookies({cookieHeader:'sessionid=fixture'});
 await app.services.changeAccounts([id],{auto:true});
 await app.services.setSchedule({enabled:true,time:'00:00'});
 const ask=()=>fetch(app.modelOrigin+'/v1/chat/completions',{method:'POST',
  headers:{Authorization:'Bearer '+app.services.keys.defaultKey(),'Content-Type':'application/json'},
  body:JSON.stringify({model:'fixture',messages:[{role:'user',content:'verify'}]})});
 const first=await ask();assert.equal(first.status,429);await first.text();
 assert.equal(app.services.snapshot().accounts[0].state,'needs_verification');
 await app.services.tick();assert.equal(checkins,0);assert.equal(calls,1);
 verified=true;
 const next=await ask();assert.equal(next.status,200);assert.equal((await next.json()).choices[0].message.content,'verified result');
 assert.equal(calls,2);assert.equal(app.services.snapshot().accounts[0].state,'ready');
 assert.equal(app.services.snapshot().accounts[0].upstreamCode,0);
 await app.services.tick();assert.equal(checkins,1);
 verified=false;
 const challenged=await ask();assert.equal(challenged.status,429);await challenged.text();
 verified=true;
 const retest=await fetch(app.panelOrigin+'/api/verification/retest',{method:'POST',
  headers:{'X-Doubao-Panel':'1',Origin:app.panelOrigin,'Content-Type':'application/json'},
  body:JSON.stringify({id,model:'fixture'})});
 assert.equal(retest.status,200);await retest.text();assert.equal(calls,4);
 assert.equal(app.services.snapshot().accounts[0].state,'ready');
 verified=false;
 const again=await ask();assert.equal(again.status,429);await again.text();
 failure={status:401};
 const expired=await ask();assert.equal(expired.status,401);await expired.text();
 assert.equal(app.services.snapshot().accounts[0].state,'needs_login');
});
