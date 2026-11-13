import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {startNative} from '../native/gateway.mjs';
import {createNativeServices} from '../native/services.mjs';
import {createDoubaoClient} from '../native/doubao-client.mjs';

const noDevice = async()=>assert.fail('Portable accounts must not read host device files.');
const json = value=>Response.json(value);
function fixtureClient() {
  return createDoubaoClient({readDevice:noDevice,fetchImpl:async(raw,options)=>{
    const url=new URL(raw);
    if(url.pathname==='/passport/account/info/v2/')
      return json({message:'success',data:{user_id_str:'12345',name:'Fixture'}});
    assert.equal(url.searchParams.get('device_id'),'source-device');
    assert.equal(url.searchParams.get('fp'),'verify_source-device');
    assert.equal(options.headers['User-Agent'],'fixture-agent');
    if(url.pathname==='/alice/user/launch')return json({data:{assistant_bot_id:'fixture-bot'}});
    if(url.pathname==='/alice/slot/action_bar_v3/brief_list')return json({data:{entry_list:[{
      active_switch_conf:{menu_conf:{item_list:[{model_item_key:'fixture-model'}]}}
    }]}});
    assert.equal(url.pathname,'/chat/completion');
    return new Response('event: CHUNK_DELTA\ndata: {"text":"portable"}\n\nevent: SSE_REPLY_END\ndata: {}\n\n',
      {headers:{'Content-Type':'text/event-stream'}});
  }});
}
function panel(app,path,body) {
  return fetch(app.panelOrigin+path,{method:'POST',
    headers:{'X-Doubao-Panel':'1',Origin:app.panelOrigin,'Content-Type':'application/json'},
    body:JSON.stringify(body)});
}

test('面板导出、空白主机导入、核验和重启均保留完整设备上下文',async t=>{
  const root=await mkdtemp(join(tmpdir(),'dw-portability-'));
  let source,target;
  t.after(async()=>{await source?.stop();await target?.stop();await rm(root,{recursive:true,force:true});});
  source=await startNative({dir:join(root,'source'),modelPort:0,panelPort:0,timer:false,
    client:fixtureClient(),readDevice:async()=> 'source-device'});
  const account=await source.services.importCookies({cookieHeader:'sessionid=fixture',userAgent:'fixture-agent'});
  const response=await panel(source,'/api/backup/export',{ids:[account.id],confirmSecrets:true});
  assert.equal(response.status,200);
  const backup=await response.json();
  assert.equal(backup.accounts[0].session.deviceId,'source-device');
  assert.equal(backup.accounts[0].session.fingerprint,'verify_source-device');
  await source.stop();

  const start=()=>startNative({dir:join(root,'destination'),modelPort:0,panelPort:0,timer:false,
    client:fixtureClient(),readDevice:noDevice});
  target=await start();
  const preview=await (await panel(target,'/api/backup/preview',backup)).json();
  const imported=await (await panel(target,'/api/backup/import',{token:preview.token,duplicates:'skip'})).json();
  assert.equal(imported.added,1);
  assert.equal((await panel(target,'/api/accounts/verify-import',{id:account.id})).status,200);
  const ask=stream=>fetch(target.modelOrigin+'/v1/chat/completions',{method:'POST',
    headers:{Authorization:'Bearer '+target.services.keys.defaultKey(),'Content-Type':'application/json'},
    body:JSON.stringify({model:'fixture-model',messages:[{role:'user',content:'ping'}],stream})});
  const first=await ask(false);
  assert.equal(first.status,200);
  assert.equal((await first.json()).choices[0].message.content,'portable');
  await target.stop();target=await start();
  const stream=await ask(true);
  assert.equal(stream.status,200);
  const text=await stream.text();
  assert.match(text,/portable/);
  assert.match(text,/\[DONE\]/);
  assert.deepEqual(target.services.exportAccounts().accounts[0].session,backup.accounts[0].session);
});

test('既有网关账号启动升级固化设备信息并保留账号状态',async()=>{
  let data={accounts:[{id:'legacy',epoch:'legacy-generation',state:'needs_verification',enabled:true,
    session:{cookieHeader:'sessionid=fixture'},upstreamCode:710022004}],keys:[],
    scheduler:{enabled:false,time:'09:30',attempted:{}},records:[],requests:[]};
  const store={snapshot:()=>structuredClone(data),async mutate(change){
    const next=structuredClone(data),result=await change(next);data=next;return result;
  }};
  const service=await createNativeServices({store,client:{},readDevice:async()=> 'legacy-device'});
  assert.equal(data.accounts[0].session.deviceId,'legacy-device');
  assert.equal(data.accounts[0].session.fingerprint,'verify_legacy-device');
  assert.equal(data.accounts[0].state,'needs_verification');
  assert.equal(data.accounts[0].epoch,'legacy-generation');
  assert.equal(data.accounts[0].upstreamCode,710022004);
  assert.equal(service.exportAccounts().accounts[0].session.deviceId,'legacy-device');
  service.close();
});
