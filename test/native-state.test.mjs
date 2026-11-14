import {test} from 'node:test';
import assert from 'node:assert/strict';
import {onFailure,restore,routable,chatRoutable,onChatSuccess} from '../native/account-state.mjs';
test('验证状态保留自动任务暂停，新聊天和旧恢复入口均可取得实际复测结果',()=>{
 const account={id:'A',enabled:true,state:'ready'},paused=onFailure(account,{upstream_code:710022004},{now:100,requestId:'REQ_FIXTURE'});
 assert.equal(paused.state,'needs_verification');assert.equal(paused.upstreamCode,710022004);assert.equal(routable(paused,99999999),false);assert.equal(paused.enabled,true);
 assert.equal(chatRoutable(paused),true);assert.equal(chatRoutable({...paused,enabled:false}),false);
 assert.equal(onChatSuccess(paused).state,'ready');assert.equal(onChatSuccess(paused).upstreamCode,0);
 assert.throws(()=>restore(paused,{confirmed:false}),/确认/);const ready=restore(paused,{confirmed:true});assert.equal(ready.state,'ready');assert.equal(routable(ready),true);assert.equal(ready.verificationRestored,true);
 assert.equal(onFailure(ready,{upstream_code:710022004}).state,'needs_verification');
});
