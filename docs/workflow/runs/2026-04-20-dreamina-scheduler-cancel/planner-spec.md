# Planner Spec 路 v0.65 鍗虫ⅵ鍏ㄥ钩鍙拌皟搴﹀櫒 + 鍙栨秷鎺掗槦

**Author**: Planner锛堟壙鎺?v0.64.2 瀵硅瘽鐨勮璁虹粨璁猴級
**Date**: 2026-04-20
**Audience**: Builder / Challenger
**Base Commit**: `0006d7a`锛坴0.64.2 宸查儴缃诧級

---

## 1. 鑳屾櫙涓庨棶棰?
v0.64 绯诲垪锛?0 / .1 / .2锛夋妸銆屽崟鐢ㄦ埛瑙嗚鐨勭姸鎬佸彲瑙佹€с€嶄慨瀹屼簡锛氬洓鎬佸窘鏍囥€佺灛鏃堕敊璇笉鍐嶈鏍囧け璐ャ€乺ecovery effect 涓嶅啀瑕嗙洊 SSE 鐘舵€併€備絾杩樻湁涓ょ被鍦烘櫙褰撳墠浠ｇ爜鏄潖鐨勶細

### 闂 A锛氬鐢ㄦ埛鎶㈠悓涓€涓嵆姊﹁处鍙锋椂瀹屽叏鏃犺皟搴?
- 鍗虫ⅵ璐﹀彿鏄?**骞冲彴绾у叡浜?*锛宍DREAMINA_MAX_CONCURRENT` 榛樿 1銆?- 褰撳墠 submit 鍐崇瓥鏉冨湪 **鍓嶇**锛屽悇鑷?HTTP 璋?`/api/video/dreamina/submit`銆?- 1310 `ExceedConcurrencyLimit` 鐨勯噸璇曢€昏緫锛坄ProductionWizard.tsx` L1515-1522 `waitForAnyJobCompletion`锛?*鍙闃呰嚜宸辩敤鎴风殑 SSE**锛坄routes/batchJobs.ts` L176 鎸?username 杩囨护锛夈€?- 缁撴灉锛氱敤鎴?B 鐐圭敓鎴愭椂濡傛灉鐢ㄦ埛 A 姝ｅ湪璺戯紝B 鐨勫墠绔唴瀛橀噷 await 姘歌繙绛変笉鍒?A 鐨?done 浜嬩欢锛岀浜屾閲嶈瘯浠?1310 灏辨姏閿欎涪浠诲姟銆?- 鍒锋柊椤甸潰 鈫?鍐呭瓨 await 涓㈠け 鈫?浠诲姟浠庢湭 submit 杩囧嵆姊︼紝scanner 涔熸晳涓嶅洖鏉ワ紙娌?prompt intent 鍖归厤鐩爣锛夈€?
### 闂 B锛氱敤鎴锋棤娉曞彇娑堟帓闃熶腑鐨勪换鍔?
- 鐢ㄦ埛鐪嬪埌鑷繁鐨勫垎闀滃湪"鍗虫ⅵ鎺掗槦"锛屾兂璋冩暣 prompt 閲嶆柊鐢熸垚锛?*娌℃湁鍙栨秷鍏ュ彛**銆?- 鐜版湁 `DELETE /api/batch-jobs/:id`锛圠93锛夊彧鏀?job.status='cancelled'锛屼笉娓?`production.json` 鐨?`pendingVideoSubmitId`锛孶I 浠嶆樉绀?鍗虫ⅵ鐢熸垚"鍋囪薄銆?- 娌℃湁 confirm 鏈哄埗鍛婄煡"鏅氭湡鍙栨秷浼氭氮璐圭Н鍒?銆?- Dreamina CLI 鏈韩**鏃?cancel 鍛戒护**锛堝凡閫氳繃 `dreamina -h` 楠岃瘉锛夛紝杩欐槸纭害鏉熴€?
### 闂 C锛氱敤鎴风湅涓嶅埌鑷繁鎺掑湪鍏ㄥ钩鍙扮鍑犱綅

- 鍗虫ⅵ鐨?`queue_info.queue_idx/queue_length` 鍙槸**鍗虫ⅵ璐﹀彿鍐?*鐨勯槦鍒楋紝宸插湪 v0.64.2 鐨?tooltip 灞曠ず銆?- 浣?鎴戝墠闈㈣繕鏈夊嚑涓敤鎴?/ 鏈」鐩?/ 鏈敤鎴风殑浠诲姟"杩欑被**鎴戜滑骞冲彴鑷繁鐨勯槦鍒椾綅**浠庢湭璁＄畻銆?- 鐢ㄦ埛鏃犳硶鍒ゆ柇"瑕佺瓑澶氫箙"锛屼篃涓嶇煡閬?骞冲彴蹇?鏄叏浣撶幇璞¤繕鏄嚜宸辩殑闂銆?
---

## 2. 鐩爣锛圓cceptance Criteria锛?
### AC1 鍚庣鍏ㄥ钩鍙?FIFO 璋冨害
**Given** 鍗虫ⅵ璐﹀彿骞跺彂涓婇檺 `DREAMINA_MAX_CONCURRENT=N`锛堥粯璁?1锛?**When** 浠绘剰鐢ㄦ埛 enqueue 鏂扮敓鎴愪换鍔?**Then**
- 浠诲姟绔嬪嵆浠?`status='awaiting_submit'` 钀?`jobs.json`锛堜笉璋?CLI锛?- 鍚庣 scheduler 姣忔 tick 妫€鏌?`active 鈭?{pending, queuing, processing}` 鏁伴噺
- `active < N` 鏃舵寜 `createdAt` 鍏ㄥ钩鍙?FIFO 鎸戜竴涓?awaiting_submit job 鍙?submit
- submit 1310 鈫?淇濇寔 awaiting_submit锛屼笅 tick 閲嶈瘯锛堜笉鍚戝墠绔姤閿欙級
- submit 闈?1310 寮傚父 鈫?status='failed' + failReason

### AC2 enqueue 鎺ュ彛
**Given** 鍓嶇鐧诲綍鐢ㄦ埛 U 鏈夐珮绾у埗鐗囬」鐩?P 鍜屽垎闀?S
**When** 鍓嶇 `POST /api/batch-jobs/enqueue` body={ projectId, shotIndex, submitParams }
**Then**
- 鍚庣鏍￠獙鍗?user/project 褰撳墠 awaiting_submit 鏁?< 20锛岃秴闄愯繑鍥?429
- 鍒涘缓 BatchJob { status='awaiting_submit', submitParams, source='production' }
- 杩斿洖 `{ jobId, globalQueuePos, etaSec }`
- SSE 绔嬪嵆鎺ㄩ€佹 job锛堥檮 globalQueuePos/etaSec锛?
### AC3 鍙栨秷鍔熻兘锛堜笁妗ｈ涔夛級
**Given** 鐢ㄦ埛鎷ユ湁鐨勪换涓€ active job锛坅waiting_submit / pending / queuing / processing锛?**When** 鐢ㄦ埛 `DELETE /api/batch-jobs/:id`
**Then** 杩斿洖 `CancelResult { ok, wasteCredit, note, reason? }`
- **awaiting_submit**: `wasteCredit=false`, note="宸蹭粠闃熷垪绉婚櫎锛屾湭娑堣€楃Н鍒?锛岀珛鍗?scheduler tick 鎺ュ姏涓嬩竴涓?- **pending / queuing**: `wasteCredit=false`, note="宸查€氱煡骞冲彴涓嶅啀璺熻繘锛屽嵆姊︿晶涓€鑸笉浼氭墸绉垎锛堟棤淇濊瘉锛?
- **processing**: `wasteCredit=true`, note="浠诲姟宸插湪鍗虫ⅵ GPU 娓叉煋涓紝鏈绉垎鏃犳硶閫€鍥?
- 鎵€鏈夋。浣嶉兘锛?  - job.status='cancelled' + cancelReason + cancelledAt
  - 娓?submitParams
  - 鍐欏洖 production.json锛氭竻 pendingVideoSubmitId + lastVideoError={cancelled:true, reason, at}
  - pollSingleJob race-safe锛氬彇娑堝悗鍒拌揪鐨?CLI 缁撴灉涓嶅啀鍐欒棰?- **缁堟€?*锛坉one/failed/cancelled锛夎繑鍥?`{ ok:false, reason:'already_terminal' }`锛屼笉鎶ラ敊

### AC4 鍏ㄥ钩鍙伴槦鍒楀揩鐓у箍鎾?**Given** 骞冲彴涓婅嚦灏?1 涓?active 鎴?awaiting_submit job
**When** 姣忔 scheduler tick 鎴?updateJob 瑙﹀彂
**Then**
- 璁＄畻 `QueueSnapshot { totalActive, totalWaiting, avgSecPerJob }`
- `avgSecPerJob` = 鏈€杩?20 涓?done job 鐨?`updatedAt - createdAt` 绉掓暟骞冲潎锛涚┖闆嗗悎鏃堕粯璁?120
- SSE 鍙?`event: queue-snapshot\ndata: {...}`锛?*涓嶅惈** username/prompt/shotDescription锛?- 鍚屼竴骞挎挱瀵规墍鏈夌敤鎴峰彲瑙?
### AC5 姣忎釜 job 鐨?`globalQueuePos` + `etaSec`
**Given** awaiting_submit job J锛坥wner=U锛?**When** updateJob / scheduler tick
**Then**
- `queueOrder = awaiting_submit jobs 鎸?createdAt 鍗囧簭`
- `J.globalQueuePos = active.length + queueOrder.indexOf(J)`锛?-based锛屽嵆鎴戝墠鏂圭殑浠诲姟鏁帮級
- `J.etaSec = Math.max(0, J.globalQueuePos * avgSecPerJob)`
- 涓ゅ瓧娈甸殢 job update 閫氳繃 SSE 鎺ㄧ粰**璇?job 鐨?owner**锛堟寜鍘?username 杩囨护瑙勫垯锛?
### AC6 鍓嶇寰芥爣浜旀€佺粺涓€
**Given** ProductionShot.shotIndex = i锛実lobalJobs 涓 shot 鐨勬渶鏂?active job = J
**Then** 娓叉煋浼樺厛绾э細
1. `J.status==='failed'` 涓?shot 鏃犺棰?鈫?绾⑩湑"鐢熸垚澶辫触" + tooltip failReason
2. `J.status==='cancelled'` 涓?shot 鏃犺棰?鈫?鐏拌壊"宸插彇娑? + tooltip `lastVideoError.reason`
3. `J.status==='processing'` 鈫?缁胯浆"鐢熸垚涓?+ tooltip "鍗虫ⅵ姝ｅ湪娓叉煋"
4. `J.status==='queuing'` 鎴?`'pending'` 鈫?钃濊剦鍐?鎺掗槦涓?+ tooltip "鍗虫ⅵ闃熷垪 #N/M"锛堟潵鑷?job.queueInfo锛?5. `J.status==='awaiting_submit'` 鈫?绱壊/鐏拌壊鑴夊啿"绛夊緟璋冨害"+ tooltip "骞冲彴闃熷垪 #3/7锛岄璁?~6 鍒嗛挓寮€濮?
6. 鍧囨棤 鈫?鏈夎棰戝垯鏄剧ず瑙嗛锛屽惁鍒欐棤寰芥爣
- **鍒犻櫎**鏃х殑 `isThisShotBusy==='video'`銆乣isQueued`锛坰hotQueuedMap锛変袱涓墠绔湰鍦版€佸垎鏀?
### AC7 鍙栨秷 UI
**Given** 鍒嗛暅 S 鏈?active job J
**Then**
- GenerateActions 鎿嶄綔鍖哄嚭鐜版寜閽細
  - J 鏄?awaiting_submit/pending/queuing 鈫?"鍙栨秷鎺掗槦"锛堢惀鐝€锛?  - J 鏄?processing 鈫?"鏀惧純鏈鐢熸垚"锛堢孩鑹茶鍛婃牱寮忥級
- processing 鎬佺偣鍑?*蹇呭脊 confirm** "浠诲姟姝ｅ湪娓叉煋锛屽彇娑堟棤娉曟挙鍥炵Н鍒嗘秷鑰?
- 鍏朵粬鎬佺偣鍑荤洿鎺ュ彇娑堬紙鍙?toast 鎻愮ず `result.note`锛?- ShotStrip 瀵规湁 active job 鐨?shot 鍙充笂瑙掗紶鏍?hover 鏄剧ず 脳 鎸夐挳锛堝揩鎹峰彇娑堬紝浜や簰鍚屼笂锛?- 宸ュ叿鏍?鍙栨秷鏈」鐩墍鏈夋帓闃?鎵归噺鎸夐挳锛氬彧鍙栨秷鏈?project 涓斿睘鏈?user 鐨?awaiting_submit/pending/queuing锛堜笉鍚?processing锛岄伩鍏嶈浼わ級

### AC8 宸插彇娑?shot 鐨勯噸鐢熸垚
**Given** shot S 鐨?`lastVideoError.cancelled===true`
**When** 鐢ㄦ埛鐐?鐢熸垚鍒嗛暅瑙嗛"
**Then**
- 鍒涘缓鏂?enqueue job锛堟棫 cancelled job 淇濈暀涓哄璁★級
- 鏂?job 鍏ラ槦鎴愬姛鍚庢竻 `lastVideoError`
- 浜や簰涓庨娆＄敓鎴愬畬鍏ㄤ竴鑷?
### AC9 椤堕儴鍏ㄥ钩鍙扮姸鎬佹潯
**Given** StepStoryboardWorkspace 椤堕儴
**Then** 鏍规嵁 queue-snapshot 骞挎挱鏄剧ず锛?- `totalActive===0 && totalWaiting===0` 鈫?馃煝"骞冲彴绌洪棽"
- `totalActive>=1 && totalWaiting<=3` 鈫?馃煛"骞冲彴浣跨敤涓細鐢熸垚 X 涓紝鎺掗槦 Y 涓紙骞冲潎 Zs/涓級"
- `totalWaiting>=4` 鈫?馃敶"骞冲彴绻佸繖锛氶槦鍒?N 涓紝棰勮闇€绛?M 鍒嗛挓"

### AC10 闄愭祦涓庡叕骞虫€?- 鍗?user 鍚岄」鐩?awaiting_submit 鏁?鈮?20 鏃舵嫆缁濇柊 enqueue锛岃繑鍥?429 + "鏈」鐩帓闃熷凡婊★紙20 涓級锛岃绛夌幇鏈変换鍔″畬鎴愭垨鍙栨秷閮ㄥ垎"
- submit 绱澶辫触 鈮?10 娆★紙闈?1310 寮傚父锛夆啋 寮哄埗 failed锛岄伩鍏嶆寰幆

---

## 3. 璇︾粏璁捐

### 3.1 鏂板绫诲瀷锛坄batchJobsQueue.ts`锛?
```ts
export type BatchJobStatus =
  | 'awaiting_submit' | 'pending' | 'queuing' | 'processing'
  | 'done' | 'failed' | 'cancelled';

export interface BatchJob {
  // ... existing ...
  submitParams?: {
    storyboardText: string;
    model: string;
    duration: number;
    aspectRatio: string;
    imageBase64?: string;
    imageMimeType?: string;
    multimodalImages?: { base64: string; mimeType?: string }[];
    dreaminaModelVersion?: string;
  };
  cancelReason?: 'user' | 'project_deleted' | 'admin';
  cancelledAt?: string;
  // v0.65 鏂板锛氬钩鍙扮骇闃熷垪浣嶄笌 ETA
  globalQueuePos?: number;  // 0-based锛氬墠鏂硅繕鏈夊嚑涓?  etaSec?: number;
  submitAttempts?: number;  // submit 绱灏濊瘯娆℃暟锛堥潪 1310 澶辫触锛?}

export interface CancelResult {
  ok: boolean;
  wasteCredit: boolean;
  note: string;
  reason?: 'not_found' | 'already_terminal' | 'forbidden';
}

export interface QueueSnapshot {
  totalActive: number;       // pending+queuing+processing
  totalWaiting: number;      // awaiting_submit
  avgSecPerJob: number;
}
```

### 3.2 鏂板妯″潡 `services/dreaminaScheduler.ts`

```ts
// 鏍稿績寰幆锛堢敱 batchJobsQueue poller tick 鏈熬 + 姣忔 updateJob 鏃惰Е鍙戯級
export async function scheduleTick(): Promise<void> {
  const MAX = Number(process.env.DREAMINA_MAX_CONCURRENT || 1);
  await loadJobs();
  const all = Array.from(_jobs.values());
  const activeCount = all.filter(j => isActive(j.status)).length;
  if (activeCount >= MAX) return;

  const waiting = all
    .filter(j => j.status === 'awaiting_submit' && j.submitParams)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const slotsAvail = MAX - activeCount;
  for (const next of waiting.slice(0, slotsAvail)) {
    try {
      const { submitId, taskId } = await callDreaminaSubmit(next.submitParams!);
      await updateJob(next.id, {
        status: 'pending',
        submitId,
        taskId: taskId || `dreamina-${submitId}`,
        submitParams: undefined,
        submitAttempts: (next.submitAttempts || 0) + 1,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (is1310Error(msg)) {
        // 妲戒綅鍙堣鎶紝淇濇寔 awaiting_submit锛屼笅涓€ tick 缁х画
        return;
      }
      const attempts = (next.submitAttempts || 0) + 1;
      if (attempts >= 10) {
        await updateJob(next.id, {
          status: 'failed',
          failReason: `鎻愪氦澶辫触 ${attempts} 娆★細${msg}`,
          submitAttempts: attempts,
        });
        continue;
      }
      await updateJob(next.id, { submitAttempts: attempts });
      // 鍏朵粬涓存椂閿欒涓嬩竴 tick 閲嶈瘯
    }
  }
}

function isActive(s: BatchJobStatus): boolean {
  return s === 'pending' || s === 'queuing' || s === 'processing';
}
function is1310Error(msg: string): boolean {
  return /ret[=:]\s*1310|ExceedConcurrency/i.test(msg);
}

// 璋?Dreamina CLI submit锛屾娊鍑烘潵鏂逛究娴嬭瘯
async function callDreaminaSubmit(params: NonNullable<BatchJob['submitParams']>) {
  // 鏍规嵁 model 瀛楁璺敱鍒颁笉鍚?wrapper
  // 鍙傝€?routes/videoDreamina.ts 鐜版湁閫昏緫
}
```

**鏃舵満**锛?- `startBatchJobsPoller` 鐨?tick 鏈熬杩藉姞 `void scheduleTick()`
- `updateJob` 涓?job 杩涘叆 done/failed/cancelled 鏃惰拷鍔?`void scheduleTick()`锛堢珛鍗虫帴鍔涳級
- `addJob` 涓?status='awaiting_submit' 鏃惰拷鍔?`void scheduleTick()`锛堟柊鍏ラ槦绔嬪嵆灏濊瘯锛?
### 3.3 鏂板妯″潡 `services/queueSnapshot.ts`

```ts
export async function computeSnapshot(): Promise<QueueSnapshot> {
  await loadJobs();
  const all = Array.from(_jobs.values());
  const active = all.filter(j => isActive(j.status)).length;
  const waiting = all.filter(j => j.status === 'awaiting_submit').length;
  const doneRecent = all
    .filter(j => j.status === 'done')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 20);
  const avg = doneRecent.length
    ? doneRecent.reduce((s, j) =>
        s + (new Date(j.updatedAt).getTime() - new Date(j.createdAt).getTime()) / 1000, 0
      ) / doneRecent.length
    : 120;
  return {
    totalActive: active,
    totalWaiting: waiting,
    avgSecPerJob: Math.round(avg),
  };
}

/** 缁欐瘡涓?awaiting_submit job 璁＄畻 globalQueuePos + etaSec 骞跺洖鍐?*/
export async function recomputeQueuePositions(): Promise<void> {
  await loadJobs();
  const all = Array.from(_jobs.values());
  const activeCount = all.filter(j => isActive(j.status)).length;
  const waiting = all
    .filter(j => j.status === 'awaiting_submit')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const snap = await computeSnapshot();
  for (let i = 0; i < waiting.length; i++) {
    const j = waiting[i]!;
    const pos = activeCount + i;
    const eta = Math.max(0, pos * snap.avgSecPerJob);
    if (j.globalQueuePos !== pos || j.etaSec !== eta) {
      await updateJob(j.id, { globalQueuePos: pos, etaSec: eta });
    }
  }
  // 骞挎挱 snapshot锛堜笉鍚殣绉佸瓧娈碉級
  batchJobEvents.emit('queue-snapshot', snap);
}
```

**璋冪敤鏃舵満**锛歱oller tick 鏈熬 + 姣忔 job 鐘舵€佸垏鎹㈠悗銆?
### 3.4 `cancelJob` 鍗囩骇锛坄batchJobsQueue.ts`锛?
瑙?SESSION-ANCHOR / 涓婁竴杞璁虹殑浼爜锛屾敞鎰忥細
- 涓夋。 note 鏂囨鎸?AC3
- `writeBackCancelledToProject` 鍙湪 `source==='production'` 鏃惰皟
- `pollSingleJob` 鎵€鏈?updateJob 鍒嗘敮鍓嶅姞 `const current = _jobs.get(job.id); if (current?.status === 'cancelled') return null;`
- cancel 瀹屾垚鍚庢樉寮?`void dreaminaScheduler.scheduleTick()`

### 3.5 鏂板璺敱

```ts
// POST /api/batch-jobs/enqueue
router.post('/enqueue', async (req, res) => {
  const username = req.user?.username;
  if (!username) return res.status(401).json({ error: 'unauthorized' });
  const { projectId, shotIndex, submitParams } = req.body;
  if (!projectId || typeof shotIndex !== 'number' || !submitParams) {
    return res.status(400).json({ error: 'invalid params' });
  }
  // 闄愭祦
  const all = await getAllJobs();
  const mine = all.filter(j =>
    j.username === username && j.projectId === projectId && j.status === 'awaiting_submit'
  );
  if (mine.length >= 20) {
    return res.status(429).json({
      error: '鏈」鐩帓闃熷凡婊★紙20 涓級锛岃绛夌幇鏈変换鍔″畬鎴愭垨鍙栨秷閮ㄥ垎',
    });
  }
  const id = `bj_${Date.now()}_${randomBytes(3).toString('hex')}`;
  const now = new Date().toISOString();
  const job: BatchJob = {
    id,
    submitId: '',  // 鍏ラ槦鏃惰繕娌℃湁
    taskId: '',
    projectId,
    source: 'production',
    username,
    shotIndex,
    shotDescription: submitParams.storyboardText.slice(0, 120),
    model: submitParams.model,
    status: 'awaiting_submit',
    submitParams,
    createdAt: now,
    updatedAt: now,
  };
  await addJob(job);
  await recomputeQueuePositions();
  const fresh = await getJobById(id);
  res.json({ jobId: id, globalQueuePos: fresh?.globalQueuePos ?? 0, etaSec: fresh?.etaSec ?? 0 });
});

// DELETE /api/batch-jobs/:id锛堝凡鏈夛紝鏀硅繑鍥?CancelResult锛?router.delete('/:id', async (req, res) => {
  const result = await cancelJob(req.params.id, 'user');
  res.json(result);
});

// DELETE /api/batch-jobs/project/:projectId?shotIndexes=1,3,5
// 宸叉湁鐨?鍏ㄩ」鐩彇娑?鎵╁睍 query filter
```

### 3.6 SSE stream 鎵╁睍

```ts
// routes/batchJobs.ts 鐨?/stream 鍐?const sendSnap = (snap: QueueSnapshot) => {
  res.write(`event: queue-snapshot\ndata: ${JSON.stringify(snap)}\n\n`);
};
batchJobEvents.on('queue-snapshot', sendSnap);
// 杩炴帴鏃剁珛鍗虫帹涓€娆℃渶鏂板揩鐓?void computeSnapshot().then(sendSnap);
// req.on('close') 閲?off('queue-snapshot', sendSnap)
```

### 3.7 鍓嶇鏀归€?
**`generateVideoForShotIdx` 绠€鍖?*锛圥roductionWizard.tsx L1418-1618锛夛細
```ts
const generateVideoForShotIdx = useCallback(async (shotIdx: number) => {
  const s = project.shots[shotIdx];
  if (!s) return;
  const submitParams = buildSubmitParams(s, project, ar);  // 鎶藉嚭鍙傛暟缁勮
  if (!submitParams) return;  // buildSubmitParams 閲?setErr 鍚庤繑鍥?null
  try {
    const { jobId, globalQueuePos, etaSec } = await apiPost('/api/batch-jobs/enqueue', {
      projectId: serverProjectId,
      shotIndex: s.shotIndex,
      submitParams,
    });
    toast.success(`鍒嗛暅 #${s.shotIndex} 宸插叆闃燂紝骞冲彴绗?${globalQueuePos + 1} 浣嶏紝绾?${formatEta(etaSec)} 鍚庡紑濮媊);
  } catch (e) {
    if (e?.status === 429) toast.error(e.message);
    else setErr(e?.message || '鍏ラ槦澶辫触');
  }
}, [project, serverProjectId, ar]);
```

**鍒犻櫎**锛?- `dreaminaQueueRef`銆乣setShotQueuedMap`銆乣shotQueuedMap` 鍏ㄩ儴寮曠敤
- `waitForAnyJobCompletion`銆乣sseCompletionListenersRef`
- `dreaminaSlowModeRef`銆乣slowModeSuccessCountRef`
- `submitDreaminaAsync` 璋冪敤
- 鏈湴 submitBatchJobs 3 娆￠噸璇曢€昏緫
- 1310 鎹曡幏 + 鎱㈡ā寮忎唬鐮?
**`useGlobalJobs` 鎵╁睍**锛氳闃?`queue-snapshot` 浜嬩欢锛屾毚闇?`{ jobs, snapshot }`銆?
**`StepStoryboardShotStrip` 浜旀€?*锛氬弬鑰?AC6锛宍showFailed` / `showCancelled` / `processing` / `queuing|pending` / `awaiting_submit`銆?
**`StepStoryboardGenerateActions` 鍙栨秷鎸夐挳**锛?```tsx
{activeJob && (
  <button
    onClick={() => handleCancel(activeJob.id, activeJob.status)}
    className={activeJob.status === 'processing'
      ? 'border-rose-500/50 bg-rose-500/15 text-rose-200'
      : 'border-amber-500/40 bg-amber-500/10 text-amber-200'}
  >
    {activeJob.status === 'processing' ? '鏀惧純鏈鐢熸垚' : '鍙栨秷鎺掗槦'}
  </button>
)}
```

**Confirm dialog**锛氬鐢ㄧ幇鏈?`confirmDialog` 宸ュ叿锛堝鏋滄病鏈夛紝鐢?window.confirm 鍏堣繃锛屽悗缁娊缁勪欢锛夈€?
**椤堕儴鐘舵€佹潯**锛歚StepStoryboardWorkspace.tsx` 宸ュ叿鏍忎笂鏂规柊澧炰竴琛岋紝娑堣垂 `useGlobalJobs().snapshot`銆?
---

## 4. 椋庨櫓涓庡绛?
| 椋庨櫓 | 瀵圭瓥 |
|---|---|
| 鍙栨秷 processing 鐢ㄦ埛涓嶇煡閬撴墸绉垎 | 蹇呭脊 confirm + toast warning + PRODUCT.md 鏄庣‘ |
| 鍒峰睆鍒风垎闃熷垪 | 鍗?user/project awaiting_submit 鈮?20锛?29 |
| scheduler 鎸傛帀鏁翠釜骞冲彴鐦棯 | scheduleTick 姣忔 try-catch锛屽紓甯稿彧 warn 涓嶆姏锛沠allback 鍒?poller tick 鑷剤 |
| race锛歝ancel 鍜?poll 鍑犱箮鍚屾椂 | pollSingleJob 鎵€鏈夊啓鐩?鍥炲啓鍓嶄簩娆℃煡 status |
| 杩佺Щ鍏煎锛氬巻鍙?jobs.json 鏈夎€佺殑 shape | BatchJob 鎵€鏈夋柊瀛楁 optional锛涜鍙栨椂 `submitParams ?? undefined` |
| 1310 鎭掑畾鏃舵寰幆 | submitAttempts 鈮?10 寮哄埗 failed锛堝惈闈?1310 閿欒锛?|
| SSE 骞挎挱闃诲 HTTP 绾跨▼ | `batchJobEvents.emit` 鏄悓姝?EventEmitter锛屽悇 listener 鍐?res 鏄潪闃诲鐨勶紝OK |
| 鍓嶇鐘舵€佹潯闂儊 | queue-snapshot 鍘绘姈锛氬悓鍊硷紙JSON stringify 姣旇緝锛変笉閲嶅鎺?|

---

## 5. 娴嬭瘯鐭╅樀锛堢粰 Verifier锛?
### 5.1 鍗曚换鍔★紙鍥炲綊锛?- T1 鐢ㄦ埛 A 鍒涘缓 1 椤圭洰 3 shot锛屼緷娆?enqueue 3 娆?鈫?3 涓?awaiting_submit 绔嬪嵆鍏ラ槦锛宻cheduler 鎸夐『搴忛€愪竴 submit 鈫?閮?done 鈫?瑙嗛鍥炲～
- T2 鍚屼笂浣嗕腑闂?1 娆?CLI 鐬椂閿欒 鈫?鑷剤涓?tick 鎴愬姛锛坴0.64.1 淇濊瘉锛?- T3 鍚屼笂浣?1 娆″嵆姊?fail 鈫?job=failed + UI 绾⑩湑 + 缁х画鎻愪氦鍚庣画锛堜笉闃诲锛?
### 5.2 澶氱敤鎴峰苟鍙?- T4 A 鍜?B 鍚屾椂 enqueue 鍚?3 涓?鈫?scheduler 涓ユ牸鎸夊叏骞冲彴 createdAt FIFO 澶勭悊 鈫?6 涓緷娆?done
- T5 A 鐨?job 鍦?processing 鏃?B enqueue 鈫?B 鐨?awaiting_submit 鏄剧ず globalQueuePos=1, etaSec鈮坅vg
- T6 SSE锛欰 鐪嬩笉鍒?B 鐨?job 璇︽儏锛堟寜 username 杩囨护锛夛紝浣嗚兘鐪嬪埌 queue-snapshot 骞挎挱锛坱otalActive=1 绛夛級

### 5.3 鍙栨秷
- T7 awaiting_submit 鍙栨秷 鈫?`wasteCredit=false`锛宻cheduler 绔嬪嵆鎺ュ姏涓嬩竴涓?- T8 queuing 鍙栨秷 鈫?`wasteCredit=false`锛宲ollSingleJob 鐨?done 琚簩娆?check 涓㈠純
- T9 processing 鍙栨秷 鈫?confirm 寮圭獥锛宍wasteCredit=true`锛孶I 鐏拌壊"宸插彇娑?
- T10 缁堟€?done 鍙栨秷 鈫?杩斿洖 `ok=false, reason=already_terminal`锛孶I 涓嶆姤閿?- T11 cancel 涔嬪悗閲嶆柊鐐圭敓鎴?鈫?鏂?job 鎴愬姛鍏ラ槦锛屾棫 cancelled job 淇濈暀

### 5.4 杈圭晫
- T12 鐢ㄦ埛 A 鍚岄」鐩?enqueue 绗?21 娆?鈫?429
- T13 submit 绱 10 娆″紓甯?鈫?job=failed, failReason 鍚?10 娆?
- T14 鍒锋柊椤甸潰 鈫?awaiting_submit job 渚濇棫瀛樺湪锛孲SE 鎺ㄨ繃鏉ュ窘鏍囨仮澶?- T15 pm2 閲嶅惎 鈫?poller + scheduler 鍧囨仮澶嶏紝jobs.json 涓墍鏈?awaiting_submit 鑷姩缁х画璋冨害

### 5.5 闅愮
- T16 鐢ㄦ埛 A SSE 杩炴帴锛岀敤鎴?B 鐨?job update 涓嶆帹閫佸埌 A锛坲sername 杩囨护锛?- T17 queue-snapshot 骞挎挱浣撲笉鍚?username/prompt/shotDescription/projectId

---

## 6. PRODUCT.md v0.65 鏉＄洰锛堣崏绋匡級

```
### v0.65 鈥?2026-04-21

**鍗虫ⅵ鍏ㄥ钩鍙?FIFO 璋冨害鍣?+ 鍙彇娑堟帓闃?+ 澶氱敤鎴峰彲瑙侀槦鍒椾綅**

v0.64 瑙ｅ喅浜嗗崟鐢ㄦ埛瑙嗚鐨勭姸鎬佸彲瑙佹€э紝浣嗗鐢ㄦ埛鍚屾椂浣跨敤鍗虫ⅵ鏃朵唬鐮佹槸鍧忕殑鈥斺€?鍓嶇鍚勮嚜 1310 閲嶈瘯鐨?SSE 鐩戝惉鍙闃呰嚜宸辩敤鎴凤紝鐢ㄦ埛 B 姘歌繙绛変笉鍒扮敤鎴?A 鐨勫畬鎴愪簨浠讹紝
浠诲姟鍦ㄧ浜屾閲嶈瘯澶辫触鏃惰涓㈠純銆傛湰鐗堟妸璋冨害鏉冩敹褰掑悗绔細

**鏍稿績鍙樻洿锛?*
- [api] 鏂板 dreaminaScheduler锛氬叏骞冲彴 FIFO锛屼弗鏍兼寜 createdAt 鎺掑簭锛?310 鑷姩閲嶈瘯
- [api] 鏂板 POST /api/batch-jobs/enqueue锛氫换鍔＄珛鍗宠惤鐩樹负 awaiting_submit锛屽埛鏂颁笉涓?- [api] cancelJob 鍗囩骇锛氫笁妗?CancelResult锛坅waiting_submit 鏃犳崯 / queuing 鍩烘湰鏃犳崯 / processing 鎵ｇН鍒嗭級
- [api] SSE 鏂板 queue-snapshot 浜嬩欢锛氳法鐢ㄦ埛骞挎挱骞冲彴绻佸繖搴︼紙涓嶅惈涓汉淇℃伅锛?- [frontend] 鍒犻櫎 dreaminaQueueRef + waitForAnyJobCompletion + 1310 鏈湴閲嶈瘯锛堝叏閮ㄥ簾寮冿級
- [frontend] ShotStrip 缁熶竴涓轰簲鎬侊細绛夊緟璋冨害/鎺掗槦涓?鐢熸垚涓?宸插彇娑?澶辫触
- [frontend] 鏂板鍙栨秷鎸夐挳锛坅waiting/queuing "鍙栨秷鎺掗槦"锛沺rocessing "鏀惧純鐢熸垚" + confirm锛?- [frontend] 椤堕儴骞冲彴鐘舵€佹潯锛氭樉绀哄綋鍓嶆椿璺?鎺掗槦鏁?+ 骞冲潎鏃堕暱
- [frontend] tooltip 鏄剧ず globalQueuePos + etaSec 涓庡嵆姊︿晶 queueInfo 鍖哄垎寮€

**Acceptance锛?* 澶氱敤鎴峰苟鍙戦浂浠诲姟涓㈠け锛涘彇娑堝搷搴?<500ms锛涘埛鏂伴噸杩為浂鏁版嵁涓㈠け銆?```

---

## 7. 浜や粯娓呭崟锛圔uilder checklist锛?
- [x] `services/dreaminaScheduler.ts` 鏂版枃浠?- [x] `services/queueSnapshot.ts` 鏂版枃浠?- [x] `services/batchJobsQueue.ts`锛歝ancelJob 鍗囩骇 + writeBackCancelledToProject + pollSingleJob race-safe + 鏂板瓧娈?+ poller 鏈熬瑙﹀彂 scheduleTick/recomputeQueuePositions
- [x] `routes/batchJobs.ts`锛歅OST /enqueue + DELETE 杩斿洖 CancelResult + SSE queue-snapshot 璁㈤槄
- [x] `api/batchJobs.ts`锛欱atchJobDto 鎵╁睍 + enqueueProductionShot 鏂板嚱鏁?- [x] `hooks/useGlobalJobs.ts`锛氳闃?queue-snapshot锛岃繑鍥?{ jobs, snapshot }
- [x] `pages/ProductionWizard.tsx`锛歡enerateVideoForShotIdx 绠€鍖?+ 鍒犳湰鍦伴槦鍒?- [x] `studio/steps/StepStoryboardShotStrip.tsx`锛氫簲鎬佸窘鏍?+ 鎮诞 脳 鎸夐挳
- [x] `studio/steps/StepStoryboardWorkspace.tsx`锛氶《閮ㄧ姸鎬佹潯 + 鎵归噺鍙栨秷鎸夐挳
- [x] `studio/steps/StepStoryboardGenerateActions.tsx`锛氬彇娑堟寜閽?+ confirm
- [x] `studio/productionTypes.ts`锛歭astVideoError.cancelled
- [x] `PRODUCT.md` 鏂?v0.65 鏉＄洰 + NEXT_VERSION 閫掑鍒?v0.66
- [x] `_deploy_v065.py` 鑴氭湰锛堝弬鑰?`_deploy_v064_2.py`锛?- [x] tsc check 鍓嶅悗绔潎閫氳繃
- [x] 閮ㄧ讲 + pm2 restart + 楠岃瘉 /api/system/version
- [x] git commit + push main
- [x] `builder-report.md` 鍐欏湪鏈洰褰曪紝閫愰」 AC 鏄犲皠瀹炵幇

