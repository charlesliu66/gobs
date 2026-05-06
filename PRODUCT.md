# GOBS / QAS 鍔熻兘鏂囨。 & Changelog

> 鏈枃浠惰褰曞钩鍙版墍鏈夊姛鑳芥ā鍧楀強鍏剁敤娉曪紝骞惰拷韪瘡娆″彂甯冪殑鍙樻洿鍘嗗彶銆?
> 缁存姢瑙勫垯锛氭瘡娆″姛鑳戒笂绾挎垨 bug 淇鍚庯紝鍚屾鏇存柊 Changelog 绔犺妭銆?

鐩稿叧娌荤悊鏂囨。锛?
- [CHANGELOG.md](./CHANGELOG.md) 鈥?杩戞湡鐗堟湰娴佹按锛屽悗缁€愭浠?PRODUCT.md 鎷嗗嚭銆?
- [docs/product/user-journeys.md](./docs/product/user-journeys.md) 鈥?涓€閿垚鐗?/ 楂樼骇鍒剁墖 / 鍒嗗彂杩愯惀涓夋潯鐢ㄦ埛璺緞銆?
- [docs/product/status-model.md](./docs/product/status-model.md) 鈥?鐢ㄦ埛鎬佷换鍔＄姸鎬佸彛寰勩€?
- [docs/product/data-ownership-invariants.md](./docs/product/data-ownership-invariants.md) 鈥?鏁版嵁褰掑睘涓嶅彉閲忋€?

---

## 涓€銆佸姛鑳芥ā鍧楁€昏

### 1. 瑙嗛鐢熸垚锛圓I 鐭棰戯級

**鍏ュ彛锛?* 棣栭〉銆岀敓鎴愩€峊ab 鈫?`/generate`

**鍔熻兘锛?*
- 杈撳叆鏂囨/鑴氭湰锛岄€夋嫨鏃堕暱銆佺敾骞呮瘮渚嬶紙9:16 / 16:9 / 1:1锛夛紝涓€閿皟鐢?AI 鐢熸垚鐭棰?
- 鏀寔澶氬悗绔細Compass/VEO锛坄veo-2`锛夈€丏reamina銆並ling
- 鐢熸垚瀹屾垚鍚庡彲鍦ㄣ€屽巻鍙层€嶉〉闈㈡煡鐪嬪拰涓嬭浇
- 鏀寔灏侀潰甯ф埅鍙?

**浣跨敤鏂规硶锛?*
1. 杩涘叆銆岀敓鎴愩€嶉〉闈?
2. 濉啓瑙嗛鑴氭湰锛堟敮鎸佸垎闀滄弿杩帮級
3. 閫夋嫨鏃堕暱锛?s / 10s 绛夛級鍜岀敾骞?
4. 鐐瑰嚮銆岀敓鎴愩€嶏紝绛夊緟瀹屾垚锛堝紓姝ヨ疆璇級
5. 瀹屾垚鍚庡湪銆屽巻鍙层€嶆垨銆岀敾寤娿€嶆煡鐪?

---

### 2. AI 鍒嗛暅宸ヤ綔鍙帮紙Production Wizard锛?

**鍏ュ彛锛?* 棣栭〉銆岄」鐩€嶁啋 銆屽垱寤洪」鐩€嶁啋 `/studio/projects` 鈫?杩涘叆椤圭洰 鈫?`/studio/wizard`

**鍔熻兘锛堥€?Step锛夛細**

| Step | 鍚嶇О | 鍔熻兘 |
|---|---|---|
| 1 | 鑴氭湰璁惧畾 | 杈撳叆鏁呬簨寮с€侀鏍煎弬鑰冦€佽鑹茶瀹?|
| 2 | 鍒朵綔娓呭崟 | AI 鑷姩鐢熸垚瑙掕壊瀹氬銆佸満鏅編鏈€侀亾鍏锋竻鍗曪紱椤堕儴灏辩华搴︾湅鏉垮彲鐩存帴鏌ョ湅缂哄浘鎯呭喌锛岃鑹茬己鍥惧崱鏀寔鐐瑰崱鐩寸敓鍥撅紝瑙掕壊鐘舵€佽。姗辨敮鎸佽嚜瀹氫箟 prompt 鐢熸垚鍙椾激/绔ュ勾/鎹㈣绛夊鐘舵€佸彉浣撳浘 |
| 3 | 鍒嗛暅琛?| AI 鑷姩鐢熸垚閫愰暅鍒嗛暅锛屽彲鎵嬪姩缂栬緫 |
| 4 | 鍒嗛暅瑙嗛 | 姣忎釜鍒嗛暅鐢熸垚鍙傝€冭棰戯紙鏀寔鍗虫ⅵ澶氭ā鎬併€佹枃鐢熻棰戙€佸浘鐢熻棰戯級|
| 5 | 瀵煎嚭 | 鏀炬槧瀹よ繛缁鐗?+ 涓€閿鍏ュ壀杈戝伐浣滃彴 |

**鍒嗛暅宸ヤ綔鍙板寮哄姛鑳斤紙v0.42+锛夛細**
- **楂樼骇鍒剁墖 execution segment 鎵ц灞傦紙v0.130锛?*锛氫繚鐣?`shots[]` 浣滀负鍙欎簨鍒嗛暅涓昏鍥撅紝鏂板 `executionSegments[]` 浣滀负鍗虫ⅵ鎵ц鍒嗘锛沗<4s` 鐨勮繛缁煭闀滀細鑷姩鍚堝苟锛宍>15s` 鐨勯暱闀滀細鑷姩鎷嗗垎銆傚垎闀滄潯銆佸伐浣滃尯鍜屽鍑洪〉閮戒細鎸?segment 鑱氬悎鐘舵€侊紝浣嗕粛淇濇寔鍘熷鍒嗛暅涓轰富鐨勬祻瑙堝績鏅恒€?
- **楂樼骇鍒剁墖鍒嗛暅瀵兼紨瑙勫垯灞傦紙v0.129锛?*锛氬悗绔柊澧炵粺涓€ `productionStoryboardRules` 瑙勫垯灞傦紝鏀剁紪 `storyboard-studio`銆乣video-director` 涓庨」鐩嚜瀹氫箟鏃堕暱绾︽潫锛沗/api/studio/storyboard-table` 鐢熸垚闃舵浼氳嚜鍔ㄦ敞鍏ュ婕旇鍒欙紝auto-refine 闃舵涔熶細鏍℃闀滃ご鍐呭涓?`durationSec` 鐨勫尮閰嶅害锛屽噺灏戞槑鏄捐繃纰庢垨杩囬暱鐨?narrative shots銆?
- **楂樼骇鍒剁墖鏈嶅寲閬撲綋楠屼簩娆℃敹鍙ｏ紙v0.128锛?*锛歋tep 2 鏂板瑙掕壊 / 鍦烘櫙 / 閬撳叿灏辩华搴︾湅鏉裤€侀鏍奸敋瀹氭彁绀哄拰鎵归噺琛ュ浘 ETA / 瀹屾垚鎬荤粨锛涜鑹茬己鍥惧崱鏀寔鐐瑰崱鐩存帴鐢熸垚涓诲舰璞″苟鍦ㄥ崱闈㈠唴纭 / 閲嶈瘯锛岀姸鎬佽。姗卞叆鍙ｄ笂鎻愬埌涓诲崱鐗囷紱鍦烘櫙 / 閬撳叿鍗＄粺涓€缂哄浘銆佺敓鎴愪腑銆佸緟纭銆佸凡灏辩华鍙嶉锛涚姸鎬佽。姗辨敮鎸佹斁澶у熀纭€褰㈣薄涓庣姸鎬佸浘锛屽垎闀滀晶鏍忔槑纭尯鍒嗛粯璁ょ姸鎬併€佹墜鍔ㄨ鐩栧拰寤鸿鐘舵€侊紝骞跺湪涓荤紪杈戝尯鏄剧ず褰撳墠闀滃ご鐨勭姸鎬佸弬鑰冩憳瑕併€?
- **楂樼骇鍒剁墖鍒嗛暅瑙嗛褰掑睘涓庡鍑虹姸鎬佹敹鍙ｏ紙v0.127锛?*锛氭壒閲忓垎闀滀换鍔＄殑鍒涘缓銆佸彇娑堛€佹墜鍔ㄨ疆璇㈠拰瑙嗛鏂囦欢璁块棶缁熶竴鏍￠獙褰撳墠鐧诲綍璐﹀彿锛涘嵆姊﹀鍎夸换鍔℃仮澶嶄笉鍐嶆敞鍐岀己澶辫处鍙?椤圭洰/鍒嗛暅鐨勪换鍔★紱瀵煎嚭瀹＄墖椤靛鐢ㄥ垎闀滈〉鐘舵€佹ā鍨嬶紝灞曠ず宸插畬鎴愩€佹帓闃?鐢熸垚銆佸緟澶勭悊缁熻鍜屽钩鍙版帓闃熶綅娆★紝纭繚瑙嗛鍙洖鍒板搴旈」鐩搴斿垎闀滅殑鍘嗗彶閲屻€?
- **楂樼骇鍒剁墖鐢熷浘杩愯鏃惰剼鏈儴缃茶ˉ榻愶紙v0.126锛?*锛氬悗绔彂甯冧細鍚屾涓婁紶 Compass/Imagen Python 鐢熷浘鑴氭湰鍒?prod/staging 杩愯鏃?`scripts/` 鐩綍锛岃鐩栬鑹插畾濡嗐€佸舰璞＄姸鎬佽。姗便€佸満鏅?閬撳叿鍥俱€佸垎闀滈甯х瓑鍏辩敤鐢熷浘閾捐矾锛岄伩鍏嶇嚎涓婄己灏?`imagen_generate.py`銆?
- **榛樿璺緞鐦﹁韩銆佺姸鎬佸鑸笌涓绘搷浣滃寮猴紙v0.125锛?*锛氬垎闀滈〉榛樿淇濈暀鐢熸垚瑙嗛銆佹壒閲忕敓鎴愮己澶辫棰戙€佺姸鎬佸拰棰勮锛涢甯х敓鎴愩€丄I 瀹＄墖銆佸揩閫熻皟鏁淬€佽繛缁€ф鏌ャ€丄/B 瀵规瘮绛夋敹杩涒€滈珮绾у伐鍏封€濓紱鍒嗛暅鍒楄〃鏀寔鎸夊緟澶勭悊銆佹湭寮€濮嬨€佺瓑寰呮彁浜ゃ€佸钩鍙版帓闃熶腑銆佺敓鎴愪腑銆佸凡瀹屾垚銆佸け璐ャ€佸凡鍙栨秷绛涢€夛紝骞舵彁渚涗笂涓€闀?/ 涓嬩竴闀滃鑸紱鐘舵€佸鑸笂绉诲埌缂栬緫鍖哄墠锛岀敓鎴愬垎闀滆棰戝崌绾т负閱掔洰涓?CTA锛屽苟鎻愮ず鎺掗槦浣嶆锛涗粠鐘舵€佸鑸€変腑鍒嗛暅鍚庝細鐩磋揪涓绘搷浣滃尯銆?
- **鑻辨枃鐣岄潰娣卞眰鐘舵€佹敹鍙ｏ紙v0.120锛?*锛氶」鐩垪琛ㄣ€佸懡鍚嶅脊绐椼€佹湭鍛藉悕椤圭洰娌荤悊銆佸悓姝ユ壒閲忎换鍔°€佽ˉ鍏ㄧ己鍥俱€佸垎闀滆棰戠敓鎴?鍙栨秷/妫€鏌ョ瓑鐘舵€佹彁绀哄凡鎺ュ叆 `productionWizard.*` key锛屽苟鏀圭敤 locale-aware 鏃堕棿鏍煎紡銆?
- 涓€閿敓鎴愭墍鏈夌己澶辫棰戯紙鎵归噺鎻愪氦鑷宠嚜閫傚簲闃熷垪锛?
- AI 鑷姩瀹＄墖锛氬垎闀滅敓鎴愭椂鍚庣鑷姩浼樺寲 Prompt 璐ㄩ噺锛坴0.43 璧峰唴缃簬鐢熸垚娴佺▼锛夛紱鎵嬪姩瀹＄墖浠嶅彲鐢ㄤ簬浜屾妫€鏌?
- 蹇€熻皟鏁撮潰鏉匡細杩愰暅/鑺傚/鍏夊奖棰勮鎸夐挳锛屼竴閿慨鏀圭粨鏋勫寲鍙傛暟
- 杩炵画鎾斁瀹＄墖锛氬叏灞忔寜搴忔挱鏀炬墍鏈夐暅澶达紝閿洏蹇嵎閿帶鍒?
- 鐗堟湰 A/B 瀵规瘮锛氬乏鍙冲垎灞忓悓姝ユ挱鏀?+ 澶囨敞鏍囩
- 鍒嗛暅闂翠竴鑷存€ф鏌ワ細AI 妫€鏌ョ浉閭婚暅澶磋繛璐€э紝鎸変弗閲嶇▼搴﹀垎绾у睍绀?
- 鍒嗛暅鍙傛暟鎶樺彔锛氶粯璁ゆ敹璧峰瓧娈电紪杈戝櫒锛屽彧鏄剧ず鎽樿琛岋紙v0.43锛?

**瀵煎嚭椤典綋楠岋紙v0.30+锛夛細**
- **鏀炬槧瀹?*锛氶粯璁よ鍥撅紝鍒嗛暅瑙嗛涓茶仈杩炵画鎾斁锛涜兌鐗囨潯妯悜瀵艰埅锛岀豢鐐?鐏扮偣鏍囨敞鐢熸垚鐘舵€侊紝钃濊壊 vN 瑙掓爣鏄剧ず澶氱増鏈暟閲?
- **缃戞牸瑙嗗浘**锛? 鍒楀崱鐗囨€昏锛屾湁瑙嗛鐨勯暅澶寸洿鎺ユ挱鏀撅紙闈欏抚浣?poster锛?
- **鍦ㄥ壀杈戝櫒涓墦寮€**锛氫竴閿皢宸茬敓鎴愬垎闀滆棰戞寜椤哄簭瀵煎叆鍓緫宸ヤ綔鍙帮紝缁х画绮句慨閰嶉煶/BGM/杞満锛涜嚜鍔ㄦ惡甯﹀垎闀滃厓鏁版嵁锛堟櫙鍒?杩愰暅/涓讳綋/鍔ㄤ綔绛夛級鍜屾潵婧愰」鐩弻鍚戦摼鎺ワ紱宸叉湁鍏宠仈鍓緫椤圭洰鏃跺脊绐楁彁绀哄幓閲嶏紱瀵煎叆鍚庤嚜鍔ㄥ脊鍑哄紩瀵肩獥鍙ｆ帹鑽愪笅涓€姝ユ搷浣?
- **澧為噺鍚屾**锛坴0.46锛夛細鍓緫鍣ㄩ《鏍忋€岎煍?鍚屾鏇存柊銆嶆寜閽紝瀵规瘮鍒剁墖绔渶鏂伴€夊畾鐗堟湰涓庡壀杈戝櫒鍐呯増鏈紝宸紓鍒楄〃鏀寔鍕鹃€夋壒閲忔浛鎹紱鏇挎崲鏃惰嚜鍔ㄨ皟鏁存椂闀垮拰鍚庣画 clip 浣嶇Щ

**鍗虫ⅵ澶氭ā鎬侊紙Dreamina Multimodal锛夛細**
- 鏈€澶?9 寮犲弬鑰冨浘锛堣鑹插畾濡?鐘舵€佸浘 + 鍦烘櫙 + 閬撳叿锛夛紝鑷姩鍘嬬缉涓?JPEG 768px 浠ュ唴锛岄伩鍏?TOS 涓婁紶澶辫触
- **瑙掕壊鐘舵€佹劅鐭ワ紙v0.54锛?*锛氬垎闀滃紩鐢ㄨ鑹叉椂鑷姩鍖归厤鐘舵€佸浘锛堝彈浼?鎴樻枟/绔ュ勾绛夛級锛屼紭鍏堢骇锛氬垎闀滄墜鍔ㄨ鐩?> 瑙掕壊榛樿婵€娲荤姸鎬?> 瀹氱褰㈣薄
- 鏀寔骞跺彂鎻愪氦锛氬涓垎闀滃悓鏃惰繘鍏ラ槦鍒楋紝骞跺彂鏁伴€氳繃 `DREAMINA_MAX_CONCURRENT` 閰嶇疆
- **鍚庣鏅鸿兘杞 + SSE 鎺ㄩ€侊紙v0.35a+锛?*锛氬嵆姊︿换鍔＄敱鏈嶅姟绔悗鍙拌疆璇紝瑙嗛灏辩华鍚?SSE 瀹炴椂閫氱煡鍓嶇锛涘叧闂祻瑙堝櫒涔熶笉涓㈠け鐢熸垚缁撴灉
- 骞跺彂瓒呴檺锛坮et=1310锛夎嚜鍔ㄧ瓑寰?45s 閲嶈瘯锛屾渶缁堝け璐ョ粰鍑哄弸濂戒腑鏂囨彁绀?
- 鐢熸垚瀹屾垚瑙嗛閫氳繃鏈嶅姟 URL锛坄/api/video/file?path=...`锛夎闂紝涓嶄細鍦?localStorage 涓瓨鍌ㄥぇ浣撶Н data URL

---

### 3. 瑙嗛鍓緫宸ヤ綔鍙帮紙Editor锛?

**鍏ュ彛锛?* 棣栭〉銆屽壀杈戙€嶁啋 `/editor`

#### 3.1 椤圭洰绠＄悊
- Editor project loading keeps working across shared-data and legacy api/editor-projects layouts.

- **杩涘叆 `/editor` 鑷姩鎵撳紑鏈€杩戦」鐩?*锛氭湁宸蹭繚瀛橀」鐩椂鑷姩閫氳繃 URL param `?project=xxx` 鎵撳紑鏈€杩戠紪杈戠殑椤圭洰锛涙棤鍘嗗彶椤圭洰鏃跺睍绀虹┖鐧界紪杈戝櫒
- 椤堕儴鏍忥細椤圭洰鍚嶈緭鍏ユ锛堢紪杈戝悗 3 绉掕嚜鍔ㄤ繚瀛橈級+ 淇濆瓨鐘舵€佹寚绀?
- 銆屾垜鐨勯」鐩?(N)銆嶆寜閽細鏄剧ず椤圭洰鏁伴噺锛屾墦寮€椤圭洰绠＄悊寮圭獥
  - 椤圭洰鍒楄〃鎸夋渶杩戜慨鏀规帓搴忥紝鏄剧ず鐩稿鏃堕棿锛?3鍒嗛挓鍓?/"鏄ㄥぉ"绛夛級
  - 鏀寔琛屽唴閲嶅懡鍚嶏紙鐐瑰嚮銆岄噸鍛藉悕銆嶁啋 杈撳叆 鈫?鍥炶溅/淇濆瓨锛?
  - 鍒犻櫎鍓嶆湁纭姝ラ锛屼笉浼氳鍒?
  - 鎼滅储杩囨护
  - 銆? 鏂板缓鍓緫銆嶁啋 寮瑰嚭鍛藉悕瀵硅瘽妗?
- 銆? 鏂板缓銆嶆寜閽細鐐瑰嚮鍚庡脊鍑?*鍛藉悕瀵硅瘽妗?*锛屾敮鎸侀粯璁ゅ悕绉帮紙鍚棩鏈熸椂闂达級锛屽洖杞?鐐广€屽垱寤恒€嶅悗鐢熸晥锛汦sc 鍙栨秷

#### 3.2 绱犳潗搴?

- 鏀寔涓婁紶瑙嗛鏂囦欢锛堟渶澶?2GB锛屽彲鍦ㄨ缃腑璋冩暣锛?
- **鎵归噺涓婁紶锛坴0.57锛?*锛氭枃浠堕€夋嫨鍣ㄦ敮鎸佸閫夛紙Ctrl/Shift 澶氶€夛級锛屼篃鍙洿鎺ユ嫋鎷藉涓棰戞枃浠跺埌绱犳潗鍖哄煙锛涗笂浼犺繃绋嬩腑鏄剧ず鎵归噺闃熷垪闈㈡澘锛堟€昏繘搴︽潯 + 姣忎釜鏂囦欢鐨勭嫭绔嬬姸鎬?杩涘害锛夛紝閫愪釜椤哄簭涓婁紶骞跺疄鏃舵洿鏂板垪琛?
- 鎮仠瑙嗛鍗＄墖 300ms 鍚庡脊鍑洪瑙堬紙闈欓煶銆佽嚜鍔ㄥ惊鐜級
- 鐐瑰嚮绱犳潗鍗冲彲鍔犲叆鏃堕棿杞?

#### 3.3 鏃堕棿杞?

- 瑙嗛杞紙V1锛夛細鏀寔澶氱墖娈垫帓鍒?
- 闊抽杞紙A1 BGM / A2 閰嶉煶锛?
- 鏂囧瓧杞紙鏂囧瓧鐗堝紡锛?
- 闊抽娉㈠舰鍙鍖栵紙钃濈传鑹叉尝褰㈠浘鑳屾櫙锛?
- 鎷栨嫿杈圭紭 Trim锛氭嫋鍔ㄧ墖娈靛乏/鍙宠竟缂樺彲绮捐皟鍏ュ嚭鐐癸紙瑁佸ご/鍘诲熬锛?
- 鎾斁閫熷害瀹炴椂棰勮锛坄<video>.playbackRate` 鍚屾锛?
- 杞満锛氭敮鎸併€岀‖鍒囥€嶅拰銆屽彔鍖栵紙crossfade锛夈€嶏紝瀵煎嚭鏃朵娇鐢?FFmpeg xfade 瀹炵幇
- 鎾ら攢/閲嶅仛锛圕trl+Z / Ctrl+Shift+Z锛?

#### 3.4 鏂囧瓧鐗堝紡

棰勮鏍峰紡 8 绉嶏細
- `intro-minimal`锛氱墖澶绰风畝娲佸眳涓?
- `intro-impact`锛氱墖澶绰峰啿鍑荤传
- `outro-brand`锛氱墖灏韭峰搧鐗岄粦妗?
- `outro-follow`锛氱墖灏韭峰叧娉ㄧ传
- `sub-bottom`锛氬瓧骞暵峰簳閮?
- `sub-top`锛氬瓧骞暵烽《閮ㄩ粍
- `sub-highlight`锛氬瓧骞暵烽珮浜?
- `title-card`锛氭爣棰樎峰乏渚ц摑

#### 3.5 閰嶄箰锛圔GM锛?

- 鏀寔 AI 鐢熸垚 BGM锛歋uno API锛堜富寮曟搸锛? Compass/Lyria锛堝鐢ㄥ紩鎿庯級锛岃嚜鍔?fallback
- 鐢熸垚瀹屾垚鍚庢樉绀哄紩鎿庢潵婧?badge锛堢传鑹?Suno / 钃濊壊 Lyria锛?
- 楂樼骇鍒剁墖瀵煎嚭鍒板壀杈戝櫒鏃讹紝鑷姩棰勫～鍒剁墖闃舵鐨勯煶涔愰鏍兼弿杩帮紙鏉ヨ嚜 SoundMusicPlan锛夛紝涓€閿嵆鍙敓鎴愬尮閰嶉厤涔?
- 鍙皟鏁撮煶閲忋€丅PM銆侀鏍?
- 瀵煎嚭鏃舵敮鎸佹贰鍏ワ紙1s锛? 娣″嚭锛堝彲璋?0-3s锛?

#### 3.6 AI 鍓緫 Agent

- 鍦ㄣ€孉gent銆嶉潰鏉胯緭鍏ヨ嚜鐒惰瑷€鎸囦护锛?甯垜鎶婄 2 娈电Щ鍒扮 1 娈靛墠"锛?
- Agent 瑙ｆ瀽鎰忓浘骞舵搷浣滄椂闂磋酱
- **鏅鸿兘鍓緫鑳藉姏锛坴0.31+锛夛細**
  - 琛屼负缁嗗寲鍒嗙被锛氫簩绾ц涓轰綋绯伙紙primary + secondary + intensity + isTurningPoint锛?
  - 鍙欎簨缁撴瀯鎺掔墖锛氫笁濂楁ā鏉匡紙缁忓吀楂樺厜 / 瑙掕壊鏁呬簨 / 鑺傚娣峰壀锛夛紝鑷姩閫夋嫨
  - 闊充箰鍏堣鑺傛媿鍒嗘瀽锛欱GM 鑺傛媿妫€娴嬶紙librosa锛夛紝娈佃惤-鎯呯华瀵归綈鍓緫
  - 鍒囩偣璐ㄩ噺浼樺寲锛氬姩浣滈《鐐瑰抚妫€娴?+ 闀滃ご杩愬姩绫诲瀷璇嗗埆
  - 鍐呭澶氭牱鎬х害鏉燂細鍚岀被琛屼负 鈮? 杩炵画銆佸揩鍒囨參闀?3:1銆侀灏剧墖娈典紭閫夎鍒?
  - 鐢婚潰-闊充箰鎯呯华瀵归綈锛歵ension + emotionTag 缁村害锛孊GM 娈佃惤鑷姩鍖归厤鐢婚潰寮犲姏

#### 3.7 瀵煎嚭

- 鏀寔 720p / 1080p / 4K
- 鏀寔 fast / balanced / high 璐ㄩ噺
- 鏈嶅姟鍣ㄧ FFmpeg 鍚堟垚锛孲SE 瀹炴椂杩涘害
- 鏂囧瓧鍙犲姞锛氬惎鍔ㄦ椂棰勬 FFmpeg 鏄惁鏀寔 `drawtext`锛堢粨鏋滅紦瀛橈級锛屼笉鏀寔鏃剁洿鎺ヨ烦杩囨枃瀛楀眰骞舵彁绀猴紝涓嶆姤閿欓€€鍑猴紱缁撴灉缂撳瓨鑷宠繘绋嬬敓鍛藉懆鏈燂紙涓嶉噸澶嶆娴嬶級

#### 3.8 AI 鍓緫 Agent 閿欒澶勭悊

- Compass API 涓嶅彲杈炬椂锛堟湇鍔″櫒鍑虹綉闂锛夛紝缁欏嚭鏄庣‘鎻愮ず銆孉I 鏈嶅姟鏆傛椂涓嶅彲杈撅紝璇风◢鍚庨噸璇曘€嶈€岄潪鍘熷 `Network Error`
- 娴忚鍣ㄧ缃戠粶璇锋眰澶辫触缁熶竴缈昏瘧涓恒€屾棤娉曡繛鎺ュ埌鏈嶅姟鍣紝璇锋鏌ョ綉缁滃悗閲嶈瘯銆?

---

### 4. 绱犳潗搴擄紙Asset Library锛?

**鍏ュ彛锛?* 椤堕儴瀵艰埅銆岀礌鏉愬簱銆嶁啋 `/asset-library`

- **Tab 瀵艰埅**锛氭渶杩戜娇鐢?/ 鏀惰棌 / 鍏ㄩ儴绱犳潗 / Google Drive 鍥涗釜 Tab 鍒囨崲
- 鍗曢〉鐢诲粖甯冨眬锛? 鍒楃湡瀹炵缉鐣ュ浘缃戞牸锛堝浘鐗?`<img>` / 瑙嗛棣栧抚 + 鎾斁鎸夐挳锛?
- **AI 鏅鸿兘鍒嗙被**锛氫笂浼犳椂鑷姩璇嗗埆绱犳潗绫诲瀷锛堣鑹?姝﹀櫒閬撳叿/鍦烘櫙/UI绱犳潗/瀹ｄ紶鍥?瑙嗛鐗囨锛夛紝鐢熸垚 30 瀛椾互鍐呮弿杩?
- **宸︿晶鏍?*锛欰I 鍒嗙被铏氭嫙鏂囦欢澶癸紙鎸?category 鍒嗙粍鏄剧ず鏁伴噺锛? 鑷畾涔夋枃浠跺す锛堟敮鎸佸垱寤?閲嶅懡鍚?鍒犻櫎锛?
- **鏀惰棌**锛氱礌鏉愬崱鐗囨槦鏍囨敹钘忥紝鏀惰棌 Tab 蹇€熸煡鐪?
- **鎷栨嫿鏁寸悊**锛氭嫋鎷界礌鏉愬崱鐗囧埌宸︿晶鏂囦欢澶瑰嵆鍙綊妗ｏ紱閫変腑澶氫釜绱犳潗鍚庝篃鍙壒閲忕Щ鍔?
- **鍥剧墖鎮仠鏀惧ぇ**锛氶紶鏍囨偓鍋滃浘鐗囩礌鏉?400ms 寮瑰嚭澶у浘棰勮娴獥
- **瑙嗛鎮仠鎾斁**锛氶紶鏍囨偓鍋滆棰戠礌鏉愯嚜鍔ㄩ潤闊虫挱鏀?
- 鍙充晶璇︽儏鎶藉眽锛氬ぇ鍥鹃瑙堛€佹枃浠朵俊鎭€丄I 鍒嗙被/鎻忚堪銆佹爣绛俱€併€岀敤浜庣敓鎴愩€嶆寜閽?
- 搴曢儴涓婁紶闈㈡澘锛氭嫋鎷戒笂浼狅紝瀹屾垚鍚庤嚜鍔ㄥ叧闂苟鍒锋柊
- 鎼滅储 + 绛涢€夛細鍏抽敭璇嶏紙鏂囦欢鍚?+ AI 鎻忚堪锛夋悳绱?+ 姣斾緥/绫诲瀷/鏂瑰悜/鐢昏川 4 涓?dropdown
- **Google Drive 闆嗘垚**锛歄Auth 杩炴帴鍚庡彲娴忚 Drive 鏂囦欢锛屾寜闇€缂撳瓨鍒版湇鍔″櫒浣跨敤
- 澶氳处鍙锋暟鎹殧绂伙細涓嶅悓鐢ㄦ埛鐨勭礌鏉愪簰涓嶅彲瑙?

---

### 5. 鍘嗗彶璁板綍锛圚istory锛?

**鍏ュ彛锛?* 椤堕儴瀵艰埅銆屽巻鍙层€嶁啋 `/history`

- 鏌ョ湅鎵€鏈?AI 鐢熸垚浠诲姟璁板綍
- 鏀寔涓嬭浇銆佸垹闄?

---

### 6. 鐢诲粖锛圙allery锛?
- Server output gallery can fall back to legacy api/output files after the dual-env split.

**鍏ュ彛锛?* 椤堕儴瀵艰埅銆岀敾寤娿€嶁啋 `/gallery`

- 灞曠ず宸插畬鎴愯棰戠殑鍗＄墖缃戞牸
- 鍙挱鏀俱€佷笅杞?

---

### 7. 涓€閿垚鐗囷紙Quick Film锛?

**鍏ュ彛锛?* 棣栭〉銆屽揩鎷嶃€嶁啋 `/quick-film`

**鍔熻兘锛?*
- 杈撳叆鏁呬簨涓婚銆佷富瑙掋€侀鏍硷紝AI 鑷姩鐢熸垚瀹屾暣鍒嗛暅鑴氭湰
- 鏀寔涓婁紶瑙掕壊/鍦烘櫙鍙傝€冪礌鏉愶紝AI 鑷姩鍖归厤鍒板搴旈暅澶?
- 鐢ㄦ埛鍙€愰暅棰勮鍜岀紪杈戝悗纭鎻愪氦
- **涓茶鎻愪氦闃熷垪锛坴0.51锛?*锛氱‘璁ゅ悗鍙彁浜ょ涓€涓垎闀滃埌鍗虫ⅵ锛屽悗缁垎闀滄帓闃熺瓑寰咃紙`awaiting_submit`锛夛紝鍓嶄竴涓畬鎴愬悗鑷姩鎻愪氦涓嬩竴涓紝閬垮厤骞跺彂瓒呴檺锛坮et=1310锛?
- **鎵归噺鍙栨秷锛坴0.51锛?*锛氭壒閲忎换鍔＄湅鏉挎敮鎸併€屽彇娑堝叏閮ㄦ帓闃熴€嶏紝涓€閿噴鏀惧嵆姊﹀苟鍙戜綅
- 鏀寔淇濆瓨鑽夌銆佷細璇濇仮澶嶏紙鍒锋柊涓嶄涪澶憋級
- 鐢熸垚缁撴灉鍦ㄣ€屽巻鍙?鈫?鎵归噺浠诲姟鐪嬫澘銆嶅疄鏃舵煡鐪?

---

### 8. 骞冲彴杩愯惀涓績

- **鑸嗘儏鐩戞祴**锛坄/risk-sentiment`锛夛細鐩戞帶绀惧獟鑸嗘儏
- **杩愯惀妗嗘灦**锛坄/platform-framework`锛夛細骞冲彴绛栫暐妗嗘灦
- **瀛︿範瀹為獙瀹?*锛坄/platform-learning-lab`锛夛細鍐呭瀛︿範搴?
- **璁板繂搴?*锛坄/platform-memory`锛夛細骞冲彴鐭ヨ瘑璁板繂

---

### 9. 璐﹀彿绠＄悊

- **璐﹀彿璁剧疆**锛坄/settings/accounts`锛夛細缁戝畾骞冲彴璐﹀彿
- **鐢ㄩ噺鐩戞帶**锛坄/settings/usage-monitor`锛夛細鏌ョ湅 API 鐢ㄩ噺

---

### 10. 鍐呴儴寮€鍙戜笌鍙戝竷宸ュ叿

- **Repo Private Skills**: repo-private `gobs-release-guard`, `gobs-h5-smoke-test`, and `gobs-multi-agent-dev-loop` cover release gating, H5 smoke checks, and guarded multi-agent development.
- **Slash entry**: repo-local plugin `gobs-loop` adds a shorter `/gobs-loop` wrapper while `$gobs-multi-agent-dev-loop` remains the portable fallback.
- **鎶€鑳藉彲绉绘鎬?*锛歚gobs-multi-agent-dev-loop` 鐜板凡鍖呭惈 `agents/openai.yaml` 涓?`references/` 鐩綍锛屾敮鎸佹樉寮?`$gobs-multi-agent-dev-loop` 璋冪敤锛屽苟淇濇寔 repo 鐩稿璺緞锛屼究浜庡湪鍏朵粬鐢佃剳 `git pull` 鍚庣户缁娇鐢ㄣ€?
- **Run 鍒濆鍖栬剼鏈?*锛歚scripts/init_workflow_run.py` 鐢ㄤ竴鏉″懡浠ょ敓鎴?`SESSION-ANCHOR.md`銆乣planner-spec.md`銆乣challenger-review.md`銆乣builder-report.md`銆乣verifier-report.md`銆乣release-decision.md`锛屽噺灏戞瘡杞墜宸ユ惌楠ㄦ灦鐨勬椂闂淬€?
- **Workflow Guard**锛歚scripts/workflow_guard.py` 鍦?build / verify / release 鍓嶆鏌?run 璧勬枡鏄惁榻愬叏銆佹槸鍚﹁Е纰扮鍖烘枃浠躲€佹槸鍚﹁秺杩?`SESSION-ANCHOR.md` 閲屽０鏄庣殑 editable scope锛屼互鍙?verify/release 鍓嶆槸鍚﹀悓姝ユ洿鏂?`PRODUCT.md`銆?
- **鍙戝竷闂ㄧ鑴氭湰**锛歚gobs-release-guard/scripts/release_guard.ps1` 鏀寔 `preflight / staging-release / prod-release / post-release` 鍥涚妯″紡锛岀敤浜庣粺涓€妫€鏌?run 璧勬枡銆乬it 瀵归綈銆佺増鏈帴鍙ｄ笌 staging verified 鏉′欢銆?
- **鍐掔儫楠岃瘉鑴氭湰**锛歚gobs-h5-smoke-test/scripts/smoke_http.ps1` 鏀寔 `local / staging / prod` 涓?`quick / full` 涓ょ娣卞害锛岀敤浜庡揩閫熺‘璁ら〉闈€佹帴鍙ｃ€佺幆澧冩爣璇嗗拰閮ㄧ讲 SHA 鏄惁绗﹀悎棰勬湡銆?

---

## 浜屻€丆hangelog

### v0.138 - 2026-05-06
**Video progress wording and ETA clarity polish**

- **[production wizard] Main video action card, preview panel, and shot strip now use a single user-friendly progress language set** (h5-video-tool/src/studio/steps/StepStoryboardGenerateActions.tsx, h5-video-tool/src/studio/steps/StepStoryboardPreviewPanel.tsx, h5-video-tool/src/studio/steps/StepStoryboardShotStrip.tsx, h5-video-tool/src/studio/storyboardQueueState.ts): users now see “排队中 / 即将开始 / 正在生成 / 即将完成 / 已完成” instead of provider-centric wording.
- **[video progress] Queue and generation details now explain what is happening in business language and show friendlier time expectations** (h5-video-tool/src/studio/storyboardQueueState.ts, h5-video-tool/src/studio/steps/StepStoryboardWorkspace.tsx): waiting and active tasks now surface clearer estimated start / finish guidance based on recent successful video timing.
- **[global jobs] Global progress panel and batch job board now hide provider jargon from primary UI** (h5-video-tool/src/components/GlobalJobsPanel.tsx, h5-video-tool/src/components/BatchJobsBoard.tsx): removed technical terms like provider queue / tracking from the main user-facing labels and replaced them with easier-to-understand wording for operations and marketing teammates.

### v0.137 - 2026-05-06
**Production Wizard shot success-state reconciliation**

- **[production wizard] Shot strip and aggregate status now prefer any playable shot video result over the latest failed retry** (h5-video-tool/src/studio/executionSegmentStatus.ts, h5-video-tool/src/studio/steps/StepStoryboardShotStrip.tsx): if a shot already has at least one playable video version, the main status is shown as completed instead of failed.
- **[tests] Added a regression test for shot-level status reconciliation when playable versions and failed retries coexist** (h5-video-tool-api/tests/productionStoryboardStatus.test.ts): protects against the UI showing “failed” while the preview panel already has a valid video result.

### v0.136 - 2026-05-06
**Recent 10-success video duration baseline for Ark queue UX**

- **[video queue] Successful storyboard jobs now record real submit-to-video elapsed time** (h5-video-tool-api/src/services/batchJobsQueue.ts, h5-video-tool-api/src/services/queueSnapshot.ts): the backend persists actual successful duration at writeback time and computes a rolling average from the latest 10 successful videos.
- **[production wizard] Platform summary now shows a recent real-world speed baseline** (h5-video-tool/src/studio/steps/StepStoryboardWorkspace.tsx, h5-video-tool/src/studio/storyboardQueueState.ts, h5-video-tool/src/api/batchJobs.ts): users can see the recent average sec/job based on successful Ark videos, with a transparent fallback when there is not enough history yet.
- **[state sync] Queue snapshot DTOs now preserve recent-success average metadata through SSE and local fallback paths** (h5-video-tool/src/hooks/useGlobalJobs.ts, h5-video-tool/tests/storyboardQueueState.test.ts, h5-video-tool-api/tests/queueSnapshot.test.ts): the new duration baseline stays visible even while the storyboard page is still using a locally reconstructed snapshot.

### v0.135 - 2026-05-06
**Ark concurrency-3 queue UX refresh**

- **[video queue] Ark personal API concurrency is now modeled as 3 end-to-end** (h5-video-tool-api/src/services/queueSnapshot.ts, h5-video-tool-api/src/services/dreaminaScheduler.ts, h5-video-tool-api/src/services/batchJobsQueue.ts, h5-video-tool-api/src/routes/batchJobs.ts): platform scheduling, waiting ETA, queue positions, and active-slot accounting now align with Ark's 3-slot limit instead of the old single-lane Dreamina assumptions.
- **[production wizard] Storyboard queue states now distinguish platform queue / submitted to Ark / queued in Ark / rendering in Ark** (h5-video-tool/src/studio/steps/StepStoryboardGenerateActions.tsx, h5-video-tool/src/studio/steps/StepStoryboardPreviewPanel.tsx, h5-video-tool/src/studio/steps/StepStoryboardShotStrip.tsx, h5-video-tool/src/studio/steps/StepStoryboardWorkspace.tsx): users can tell whether a shot is still waiting locally, already accepted by Ark, or actively rendering.
- **[global status] Queue boards and bilingual status labels were updated for Ark semantics** (h5-video-tool/src/components/GlobalJobsPanel.tsx, h5-video-tool/src/components/BatchJobsBoard.tsx, h5-video-tool/src/i18n/messages.ts, h5-video-tool/src/api/batchJobs.ts): H5 now shows Ark slot usage, platform queue positions, processing-stop semantics, and clearer CN/EN labels across panels.
- **[notifications] Completed / failed / stopped jobs now emit browser reminders from the SSE global-jobs layer** (h5-video-tool/src/hooks/useGlobalJobs.ts): users who leave the page can still get completion reminders once the browser permission is granted.

### v0.134 - 2026-05-06
**Repo-local slash entry for the guarded GOBS multi-agent workflow**
- Added repo-local plugin plugins/gobs-loop plus .agents/plugins/marketplace.json so compatible clients can expose a slash-style /gobs-loop entry.
- Added plugins/gobs-loop/skills/gobs-loop-entry/SKILL.md as a thin wrapper that routes slash invocation back into the canonical repo skill gobs-multi-agent-dev-loop.
- Updated the core workflow skill metadata and invocation docs so /gobs-loop and $gobs-multi-agent-dev-loop are documented together, with the explicit skill call kept as the portable fallback.
### v0.133 - 2026-05-06
**Portable slash-invokable packaging for the repo multi-agent workflow skill**
**Internal / Dev Workflow:**
- Packaged `gobs-multi-agent-dev-loop` as a repo-local skill with valid frontmatter, `agents/openai.yaml`, and explicit `$gobs-multi-agent-dev-loop` invocation metadata.
- Added `.agents/skills/gobs-multi-agent-dev-loop/references/invocation.md` and `references/workflow-map.md` so the skill has a clear structure and portable repo-relative guidance after `git clone` or `git pull` on another computer.
- Removed machine-specific absolute path assumptions from the skill body and related references, keeping cross-computer use repo-relative.
- Revalidated the packaged skill after the slash/invocation packaging update.

### v0.132 - 2026-05-02
**Repo-local multi-agent self-loop workflow guardrails**
**Internal / Dev Workflow:**
- Added repo-private skill `gobs-multi-agent-dev-loop` so future Codex/Cursor/Claude sessions can follow a shared Orchestrator -> Planner -> Challenger -> Builder -> Verifier loop with less operator coordination.
- Added `scripts/init_workflow_run.py` to bootstrap a full 4+1 run folder, including a scope-first `SESSION-ANCHOR.md`.
- Added `scripts/workflow_guard.py` and `scripts/workflow_common.py` to enforce forbidden-file boundaries, editable-scope ownership, stage artifact completeness, and `PRODUCT.md` update requirements before verify/release.
- Added unit tests for the new workflow bootstrap and guard scripts, plus root npm shortcuts `workflow:init` and `workflow:guard`.
- Refreshed `docs/workflow/README.md`, `docs/workflow/prompts/orchestrator.md`, `docs/workflow/contracts/SessionAnchor.md`, and the run templates so the repo workflow is executable instead of prompt-only.

### v0.131 - 2026-04-24
**Legacy path fallbacks for dual-env shared-data layout**
**Backend / Compatibility:**
- Editor project routes now resolve shared-data first and automatically rehome legacy files from old api/editor-projects paths.
- Output gallery listing and /api/video/file can fall back to legacy api/output paths when shared-data output is empty.
- GeeLark config loading now checks ../../config/geelark-accounts.json for split staging/prod layouts.
- Imagen runtime script resolution now supports repo-root scripts/imagen_generate.py in deployed prod/api and staging/api layouts.
- init_dual_env_server now copies key legacy data directories into each env shared-data root during dual-env initialization.
**Tests:**
- Added targeted fallback tests for editor project storage, output gallery, GeeLark config path lookup, Imagen script lookup and dual-env init migration commands.

### v0.130 鈥?2026-04-24

**楂樼骇鍒剁墖鍒嗛暅鍏ラ槦鐘舵€佸洖濉笌鍋囨垚鍔熸彁绀轰慨澶?*

**Frontend / Storyboard Queue:**
- **[frontend] 淇鍏ラ槦鍋囨垚鍔熸彁绀?*锛坄h5-video-tool/src/pages/ProductionWizard.tsx`, `h5-video-tool/src/studio/storyboardQueueState.ts`锛夛細濡傛灉鍚庣鍦?enqueue 鏈熼棿宸茬粡鎶?job 鏍囨垚 `failed/cancelled`锛屽墠绔幇鍦ㄤ細鐩存帴灞曠ず澶辫触鍘熷洜骞朵繚鐣欏綋鍓嶅垎闀滈敊璇€侊紝涓嶅啀涓€寰?toast 鈥滃凡鍏ラ槦鈥濄€?
- **[frontend] 骞冲彴鐘舵€佹潯澧炲姞鏈湴鍥為€€蹇収**锛坄h5-video-tool/src/studio/storyboardQueueState.ts`, `h5-video-tool/src/pages/ProductionWizard.tsx`锛夛細褰撳叏灞€ `queue-snapshot` 杩樻病鍥炲埌鍓嶇锛屼絾褰撳墠椤圭洰宸茬粡瀛樺湪 `awaiting_submit/pending/queuing/processing` job 鏃讹紝椤甸潰涓嶅啀閿欒鏄剧ず鈥滃钩鍙扮┖闂测€濄€?

### v0.129 鈥?2026-04-24

**Repo 绉佹湁鍙戝竷闂ㄧ銆丠5 鍐掔儫鎶€鑳戒笌楂樼骇鍒剁墖鍒嗛暅瀵兼紨瑙勫垯灞傛枃妗ｈˉ榻?*

**Internal / Release Ops:**
- **[repo-private skills] 鏂板 `gobs-release-guard`**锛氭妸 GOBS/QAS 鐨?`preflight / staging-release / prod-release / post-release` 闂ㄧ妫€鏌ュ浐鍖栦负浠撳簱绉佹湁 skill锛岀粺涓€璇诲彇 `AGENTS.md`銆乣feedback.md`銆乣TASK-INDEX.md` 涓?run 璧勬枡锛屽苟閫氳繃 PowerShell 鑴氭湰杈撳嚭 `GO / NO-GO / GO WITH WARNINGS`銆?
- **[repo-private skills] 鏂板 `gobs-h5-smoke-test`**锛氭敮鎸?`local / staging / prod` 涓夌幆澧冪殑 `quick / full` 鍐掔儫妫€鏌ワ紝瑕嗙洊棣栭〉銆佸叧閿矾鐢便€乣/api/system/version`銆佺幆澧冩爣璇嗕笌 expected commit 姣斿锛屼究浜庡彂甯冨悗蹇€熺‘璁ょ嚎涓婂疄闄呰繍琛岀殑 SHA銆?
- **[docs] 琛ラ綈绉佹湁 skill 璁捐銆佸疄鏂戒笌 run 浜х墿**锛氭柊澧?design / implementation plan銆乺un anchor銆乸lanner銆乧hallenger銆乥uilder銆乿erifier銆乺elease decision 鏂囨。锛屼究浜庡悗缁户缁妸鍙戝竷 SOP 鑷姩鍖栨矇娣€鍒伴」鐩唴銆?

**Backend / Storyboard:**
- **[docs] 琛ヨ骞舵牎楠岀幇鏈?`productionStoryboardRules` 瑙勫垯灞?*锛坄h5-video-tool-api/src/services/productionStoryboardRules.ts`锛夛細纭褰撳墠涓诲共鍐呯殑楂樼骇鍒剁墖鍒嗛暅瑙勫垯灞傚凡缁忕粺涓€娌夋穩闀滃ご绫诲瀷/鏋勫浘/鏃堕暱鍩虹嚎銆乣4-15s` 骞冲彴绾︽潫鍜屽€欓€夊悎骞?鎷嗗垎鍒ゆ柇鍙ｅ緞锛屽苟琛ラ綈瀵瑰簲 design / implementation / run 鏂囨。銆?
- **[verify] 纭 `/api/studio/storyboard-table` 涓?auto-refine 宸叉帴鍏ュ婕旇鍒欎笂涓嬫枃**锛坄h5-video-tool-api/src/routes/studio.ts`锛夛細鏈疆閫氳繃鏋勫缓涓庤鍒欏眰鑷鍛戒护锛岄獙璇佺敓鎴愰樁娈典細鎷兼帴瀵兼紨瑙勫垯锛宺efine 闃舵涔熶細鏍℃闀滃ご鍐呭涓?`durationSec` 鐨勫尮閰嶅叧绯伙紝鍚屾椂淇濇寔 shot 鏁伴噺涓嶅彉銆?
- **[verify] 璁板綍鍙戝竷鏋勫缓鎵€渚濊禆鐨勭被鍨嬪畨鍏ㄥ墠缃潯浠?*锛氬綋鍓嶄富骞蹭腑鐨?`videoKling.ts` 鍝嶅簲澶村畧鍗笌 `googleDriveService.ts` 鏄惧紡绫诲瀷琛ラ綈宸查€氳繃鏈湴涓ユ牸缂栬瘧锛岀‘淇濊繖杞彂甯冮獙璇侀摼璺ǔ瀹氬彲澶嶇幇銆?

### v0.128 鈥?2026-04-24

**楂樼骇鍒剁墖鏈嶅寲閬撳氨缁害涓庣姸鎬佸紩鐢ㄤ綋楠屾敹鍙?*

**Frontend / UX:**
- **[frontend] Step 2 椤堕儴鍔犲叆灏辩华搴︾湅鏉裤€侀鏍奸敋瀹氫笌鎵归噺琛ュ浘鎬荤粨**锛坄h5-video-tool/src/studio/steps/StepDesignHeader.tsx`, `StepDesignWorkspace.tsx`, `src/studio/designAssetStatus.ts`锛夛細瑙掕壊 / 鍦烘櫙 / 閬撳叿缁熶竴璁＄畻 `missing / generating / review / ready / failed` 鐘舵€侊紝鍦ㄩ〉澶村睍绀?ready 姣斾緥銆佺己鍥炬暟閲忋€侀璁¤ˉ鍥炬椂闀垮拰瀹屾垚鎬荤粨銆?
- **[frontend] 瑙掕壊鍗′富璺緞鏀逛负缂哄浘鍗崇敓鍥?*锛坄StepDesignCharactersPanel.tsx`, `ProductionWizard.tsx`, `useProductionStep2Handlers.ts`锛夛細缂哄浘鎴栧け璐ョ殑瑙掕壊鍗＄偣鍑诲嵆鍙敤榛樿 prompt 鐢熸垚涓诲舰璞★紱棰勮瀹屾垚鍚庡彲鐩存帴鍦ㄥ崱闈㈢‘璁?/ 閲嶈瘯锛涚姸鎬佽。姗卞叆鍙ｆ彁鍗囧埌涓诲崱鍖哄煙銆?
- **[frontend] 鍦烘櫙 / 閬撳叿鍗＄粺涓€鐘舵€佸弽棣?*锛坄StepDesignScenesPanel.tsx`, `StepDesignPropsPanel.tsx`锛夛細缂哄浘鍗℃敼涓鸿櫄绾胯竟妗?+ 鈥滅偣鍑荤敓鍥锯€濓紝宸插嚭鍥?/ 鐢熸垚涓?/ 寰呯‘璁?/ 澶辫触浣跨敤缁熶竴瑙掓爣涓庤鐩栧眰鍙嶉锛屼繚鎸佽鑹?/ 鍦烘櫙 / 閬撳叿浣撻獙涓€鑷淬€?
- **[frontend] 鐘舵€佽。姗变笌鍒嗛暅鐘舵€佸紩鐢ㄩ摼璺ˉ榻?*锛坄CharacterPortraitEditorModal.tsx`, `CharacterWardrobePanel.tsx`, `StepStoryboardAssetsSidebar.tsx`, `StepStoryboardWorkspace.tsx`锛夛細鍩虹褰㈣薄涓庣姸鎬佸浘鏀寔鏀惧ぇ锛涚姸鎬佽。姗辨彁绀衡€滈粯璁ょ姸鎬佲€濅細浣滀负鍒嗛暅榛樿寮曠敤锛涘垎闀滀晶鏍忔槑纭尯鍒嗛粯璁ょ姸鎬併€佹墜鍔ㄨ鐩栧拰寤鸿鐘舵€侊紝骞跺湪涓荤紪杈戝尯鏄剧ず褰撳墠闀滃ご鐘舵€佸弬鑰冩憳瑕併€?

**Test:**
- **[test] 鏂板璧勪骇灏辩华搴︿笌鍒嗛暅鐘舵€佸紩鐢ㄥ洖褰?*锛坄h5-video-tool/tests/designAssetStatus.test.ts`, `storyboardCharacterStateReference.test.ts`锛夛細瑕嗙洊 Step 2 ready / review / generating / failed / missing 鍙ｅ緞锛屼互鍙婂垎闀滅姸鎬佸紩鐢ㄤ紭鍏堢骇 `鎵嬪姩瑕嗙洊 > 榛樿鐘舵€?> 涓诲舰璞銆?

### v0.127 鈥?2026-04-23

**楂樼骇鍒剁墖鍒嗛暅瑙嗛褰掑睘涓庡鍑虹姸鎬佹敹鍙?*

**Backend / Ownership:**
- **[backend] 鎵归噺鍒嗛暅浠诲姟璁块棶鏀逛负涓ユ牸 owner 鏍￠獙**锛坄h5-video-tool-api/src/routes/batchJobs.ts`锛夛細鍒涘缓銆佸彇娑堛€佹墜鍔ㄨ疆璇㈠拰 `/api/batch-jobs/video/:id` 鎾斁鍧囪姹傚綋鍓嶇櫥褰曡处鍙蜂笌浠诲姟 `username` 涓€鑷达紱鍘嗗彶缂哄け owner 鐨勪换鍔′笉鍐嶈浠绘剰璐﹀彿璇诲彇鎴栨搷浣滐紝閬垮厤璺ㄨ处鍙?璺ㄩ」鐩贩鍏ャ€?
- **[backend] 鍗虫ⅵ鎭㈠涓?Quickfilm 閾惧紡鎺掗槦琛ヨ处鍙疯竟鐣?*锛坄batchJobsQueue.ts`, `dreaminaRecovery.ts`锛夛細Quickfilm 鑷姩鎻愪氦涓嬩竴闀滄椂蹇呴』鍚岃处鍙峰悓椤圭洰锛涘鍎夸换鍔℃仮澶嶇己灏戣处鍙枫€侀」鐩垨鍒嗛暅绱㈠紩鏃跺彧璺宠繃涓嶆敞鍐岋紝闃叉浜х敓鏃犳硶褰掑睘鐨勫垎闀滆棰戙€?

**Frontend / UX:**
- **[frontend] 瀵煎嚭瀹＄墖椤靛鐢ㄥ垎闀滅姸鎬佹ā鍨?*锛坄StepExportStoryboardOverview.tsx`锛夛細瀵煎嚭椤垫柊澧炲凡瀹屾垚銆佹帓闃?鐢熸垚銆佸緟澶勭悊涓夌粍姹囨€诲崱锛岀綉鏍艰鍥炬樉绀烘瘡闀滅姸鎬併€佸钩鍙版帓闃熶綅娆℃垨鍗虫ⅵ闃熷垪浣嶆锛屽拰鍒嗛暅椤靛彛寰勪竴鑷淬€?
- **[test] 鏂板鍒嗛暅瀵煎嚭鐘舵€佷笌 Quickfilm 闃熷垪褰掑睘鍥炲綊**锛氳鐩栧鍑洪〉鐘舵€佹眹鎬诲拰鍚岃处鍙峰悓椤圭洰閾惧紡鎺掗槦鍒ゆ柇銆?

### v0.126 鈥?2026-04-23

**楂樼骇鍒剁墖鐢熷浘鑴氭湰閮ㄧ讲琛ラ綈**

**Ops / Backend:**
- **[ops] 鍚庣閮ㄧ讲鍚屾涓婁紶 Imagen Python 杩愯鏃惰剼鏈?*锛坄scripts/deploy_api.py`锛夛細鍙戝竷 `dist/` 鍚庨澶栨妸 `h5-video-tool-api/scripts/imagen_generate.py` 鏀惧埌 `/home/ubuntu/qas-h5/<env>/scripts/`锛屽尮閰嶈繍琛屾椂浠ｇ爜鏌ユ壘璺緞锛岀粺涓€淇瑙掕壊瀹氬銆佸舰璞＄姸鎬佽。姗便€佸満鏅?閬撳叿鍥惧拰鍒嗛暅棣栧抚绛?Compass/Imagen 鐢熷浘鍏ュ彛绾夸笂缂鸿剼鏈姤閿欍€?
- **[test] 琛ュ厖閮ㄧ讲鑴氭湰鍥炲綊**锛坄scripts/tests/test_deploy_api.py`锛夛細瑕嗙洊杩愯鏃惰剼鏈繙绔洰褰曡绠楀拰缂哄け鑴氭湰鎷︽埅锛岄伩鍏嶅悗缁彂甯冨啀娆℃紡鍙?`imagen_generate.py`銆?

### v0.125 鈥?2026-04-23

**楂樼骇鍒剁墖鍒嗛暅閫夋嫨鍚庣洿杈句富鎿嶄綔**

**Frontend / UX:**
- **[frontend] 鍒嗛暅瀵艰埅閫夋嫨鍚庡钩婊戝畾浣嶄富鎿嶄綔**锛坄h5-video-tool/src/studio/steps/StepStoryboardWorkspace.tsx`锛夛細浠庣姸鎬佸鑸垨鈥滆烦鍒板緟澶勭悊鈥濋€変腑闀滃ご鍚庤嚜鍔ㄦ粴鍔ㄥ埌褰撳墠鍒嗛暅涓绘搷浣滃崱鐗囷紝璁╃敤鎴锋洿蹇湅鍒扳€滅敓鎴愬垎闀滆棰?/ 閲嶆柊鐢熸垚鍒嗛暅瑙嗛鈥濄€?

### v0.124 鈥?2026-04-23

**楂樼骇鍒剁墖鍒嗛暅寰呭鐞嗗鑸?*

**Frontend / UX:**
- **[frontend] 鍒嗛暅鐘舵€佸鑸柊澧炲緟澶勭悊瑙嗗浘**锛坄h5-video-tool/src/studio/steps/StepStoryboardShotStrip.tsx`锛夛細灏嗘湭鐢熸垚銆佸け璐ャ€佸凡鍙栨秷闀滃ご鑱氬悎涓衡€滃緟澶勭悊鈥濓紝骞舵柊澧炲緟澶勭悊 / 闃熷垪涓?/ 宸插畬鎴愪笁缁勬眹鎬诲崱銆?
- **[frontend] 鏂板璺冲埌寰呭鐞嗗揩鎹锋搷浣?*锛坄h5-video-tool/src/studio/steps/StepStoryboardShotStrip.tsx`锛夛細鐢ㄦ埛鍙竴閿€変腑涓嬩竴鏉￠渶瑕佺敓鎴愭垨閲嶈瘯鐨勯暅澶达紝鍑忓皯鍦ㄥ鍒嗛暅缃戞牸涓悳绱€?

### v0.123 鈥?2026-04-23

**楂樼骇鍒剁墖鍒嗛暅鎿嶄綔鍖哄彲鐢ㄦ€у寮?*

**Frontend / UX:**
- **[frontend] 鍒嗛暅鐘舵€佸鑸笂绉?*锛坄h5-video-tool/src/studio/steps/StepStoryboardWorkspace.tsx`, `StepStoryboardShotStrip.tsx`锛夛細鐘舵€佸垪琛ㄤ粠鍒嗛暅椤靛簳閮ㄧЩ鍒板钩鍙扮姸鎬佷笅鏂广€佺紪杈戝尯涓婃柟锛屾壒閲忕敓鎴愩€佸彇娑堟帓闃熴€佸悓姝ョ姸鎬佷笌鍒嗛暅瀵艰埅鏀惧湪鍚屼竴鎿嶄綔鍖猴紝鍑忓皯涓婁笅婊氬姩銆?
- **[frontend] 鐢熸垚鍒嗛暅瑙嗛涓绘寜閽寮?*锛坄h5-video-tool/src/studio/steps/StepStoryboardGenerateActions.tsx`锛夛細褰撳墠鍒嗛暅鐢熸垚鎸夐挳鏀逛负澶у彿涓?CTA锛屾寜閽唴灞曠ず鎻愪氦鍚庝細鏄剧ず鎺掗槦浣嶆銆佸綋鍓嶉槦鍒椾綅娆℃垨閲嶆柊鐢熸垚璇存槑锛涘凡鏈夎棰戞椂鏂囨鏀逛负鈥滈噸鏂扮敓鎴愬垎闀滆棰戔€濄€?

### v0.122 鈥?2026-04-23

**楂樼骇鍒剁墖鍒嗛暅鐘舵€佹爣绛炬敹鍙?*

**Frontend / UX:**
- **[frontend] 鍒嗛暅鏉＄姸鎬佹枃妗堟敼涓哄叡浜敤鎴锋€?label key**锛坄h5-video-tool/src/studio/shotUserStatus.ts`, `h5-video-tool/src/studio/steps/StepStoryboardShotStrip.tsx`锛夛細鐘舵€佺瓫閫夊拰鍗＄墖鐘舵€佷笉鍐嶇淮鎶ょ粍浠跺唴 switch 鏂囨锛岀粺涓€閫氳繃 `productionWizard.status.*` key 灞曠ず锛岄檷浣庡悗缁法椤甸潰鐘舵€佸彛寰勬紓绉婚闄┿€?
- **[test] 琛ュ厖鍒嗛暅鐢ㄦ埛鎬佺姸鎬?label key 鍥炲綊**锛坄h5-video-tool/tests/shotUserStatus.test.ts`锛夛細楠岃瘉骞冲彴鎺掗槦绛夌姸鎬佽繑鍥炵ǔ瀹?i18n key锛屽苟涓?helper 鏆撮湶鐨?label key 淇濇寔涓€鑷淬€?

### v0.121 鈥?2026-04-23

**楂樼骇鍒剁墖榛樿璺緞鐦﹁韩涓庡垎闀滅姸鎬佸鑸?*

**Frontend / UX:**
- **[frontend] 楂樼骇鍒剁墖榛樿宸ュ叿鏀剁撼**锛坄h5-video-tool/src/studio/steps/StepStoryboardWorkspace.tsx`, `StepStoryboardGenerateActions.tsx`锛夛細榛樿涓昏矾寰勫彧淇濈暀鐢熸垚鍒嗛暅瑙嗛銆佹壒閲忕敓鎴愮己澶辫棰戙€佷换鍔＄姸鎬佸拰棰勮锛涢甯х敓鎴愩€丄I 瀹＄墖銆佸揩閫熻皟鏁淬€佽繛缁挱鏀俱€丄/B 瀵规瘮鍜岃繛缁€ф鏌ヨ繘鍏モ€滈珮绾у伐鍏封€濄€?
- **[frontend] 鍒嗛暅鐘舵€佸垪琛ㄤ笌瀵艰埅**锛坄StepStoryboardShotStrip.tsx`, `shotUserStatus.ts`锛夛細鍒嗛暅鏉″崌绾т负鍙瓫閫夌姸鎬佸垪琛紝瑕嗙洊鏈紑濮嬨€佺瓑寰呮彁浜ゃ€佸钩鍙版帓闃熶腑銆佹鍦ㄧ敓鎴愩€佸凡瀹屾垚銆佸け璐ャ€佸凡鍙栨秷锛屽苟鏂板涓婁竴闀?/ 涓嬩竴闀滀笌 `[` / `]` 蹇嵎閿€?
- **[frontend] 瑙掕壊褰㈣薄鍙樹綋绠€鍖?*锛坄StepDesignCharactersPanel.tsx`, `CharacterLookTreeCanvas.tsx`, `CharacterPortraitEditorModal.tsx`锛夛細褰㈣薄婕斿寲鏍戦粯璁や笉鍐嶅睍寮€锛屼富鍏ュ彛鏀逛负鈥滅紪杈戝舰璞″彉浣撯€濓紝鏍戝叧绯讳綔涓洪珮绾ф煡鐪嬭兘鍔涗繚鐣欍€?
- **[docs] 鐘舵€佹ā鍨嬨€佹暟鎹綊灞炰笌鐢ㄦ埛璺緞娌荤悊鏂囨。钀藉湴**锛坄docs/product/*.md`, `CHANGELOG.md`锛夛細涓哄悗缁法椤甸潰鐘舵€佺粺涓€鍜?PRODUCT / CHANGELOG 鎷嗗垎寤虹珛鍩虹嚎銆?

### v0.120 鈥?2026-04-23

**楂樼骇鍒剁墖椤圭洰涓庡垎闀滅姸鎬佽嫳鏂囨敹鍙?*

**Frontend / i18n:**
- **[frontend] 楂樼骇鍒剁墖椤圭洰寮圭獥鏀逛负 key 椹卞姩**锛坄h5-video-tool/src/studio/components/ProductionProjectListModal.tsx`, `h5-video-tool/src/i18n/messages.ts`锛夛細宸蹭繚瀛橀」鐩€佹悳绱€佺┖鐘舵€併€佹不鐞嗘湭鍛藉悕椤圭洰銆佹墦寮€/閲嶅懡鍚?鍒犻櫎纭涓庨」鐩洿鏂版椂闂村叏閮ㄨ窡闅?`uiLocale`锛屾椂闂存牸寮忎笉鍐嶇‖缂栫爜 `zh-CN`銆?
- **[frontend] 楂樼骇鍒剁墖杩愯鐘舵€佹彁绀鸿ˉ榻愯嫳鏂?*锛坄h5-video-tool/src/pages/ProductionWizard.tsx`锛夛細椤圭洰鍔犺浇澶辫触銆佸懡鍚嶄繚瀛樸€佹壒閲忎换鍔″悓姝ャ€佽ˉ鍏ㄧ己鍥俱€侀噸璇曠己鍥俱€侀鏍煎弬鑰冦€佸垎闀滃浘/瑙嗛鐢熸垚銆佸彇娑堥槦鍒椼€佹墜鍔ㄦ鏌ヨ繘搴︾瓑 toast / error / confirm 鏂囨缁熶竴杩涘叆 `productionWizard.*` key銆?
- **[frontend] 鑻辨枃鍐呭閾捐矾鍑忓皯涓枃 prompt 鍓嶇紑**锛坄h5-video-tool/src/pages/ProductionWizard.tsx`锛夛細鍒嗛暅瑙嗛鎻愪氦鏃惰拷鍔犵殑鍏夊奖銆佽壊璋冦€佹暣浣撹瑙夐鏍煎墠缂€鏀逛负璺熼殢鐣岄潰鏂囨 key锛岄伩鍏嶈嫳鏂囨ā寮忎笅缁х画娉ㄥ叆涓枃鎻愮ず澶淬€?
- **[test] 楂樼骇鍒剁墖楂橀 key 鍔犲叆鍥炲綊鏂█**锛坄h5-video-tool/src/i18n/locale.test.ts`锛夛細瑕嗙洊椤圭洰鍒楄〃銆佸懡鍚嶅脊绐椼€佷繚瀛橀」鐩悗鐢熸垚鍒嗛暅瑙嗛绛夎嫳鏂?key銆?

### v0.119 鈥?2026-04-23

**楂樼骇鍒剁墖鍘嗗彶鍥剧墖鍥炴樉淇**

**Backend / data migration:**
- **[backend] 楂樼骇鍒剁墖鍥剧墖璇诲彇鍏煎鏃т骇鐗╃洰褰?*锛坄h5-video-tool-api/src/routes/productionPersist.ts`锛夛細`/api/production/image` 鐜板湪浼氬湪鍏变韩鏁版嵁鐩綍缂哄浘鏃跺洖閫€鍒板巻鍙?`prod/api/output/production/images/<user>` 涓庢棫鏍圭洰褰曪紝閬垮厤椤圭洰 JSON 杩佺Щ鍚庡巻鍙茶鑹插浘銆佸満鏅浘銆佸垎闀滅缉鐣ュ浘 404 鍥捐銆?
- **[test] 琛ュ厖鍘嗗彶鍥剧墖鐩綍鍥炲綊娴嬭瘯**锛坄h5-video-tool-api/tests/productionImagePath.test.ts`锛夛細瑕嗙洊鈥滄柊鍏变韩鐩綍涓虹┖銆佹棫 prod/api 鍥剧墖瀛樺湪鈥濈殑瑙ｆ瀽鍦烘櫙銆?
- **[ops] 绾夸笂 prod 宸叉妸鏃х洰褰?83 寮犻珮绾у埗鐗囧浘鐗囧鍒跺洖 shared-data**锛氬彧琛ョ己澶辨枃浠讹紝涓嶅垹闄ゆ棫鏂囦欢锛屽巻鍙查」鐩埛鏂板悗鍙仮澶嶅浘鐗囨樉绀恒€?

### v0.118 鈥?2026-04-23

**Generate Video 鑻辨枃琛ㄥ崟涓庡啓绋挎彁绀烘敹鍙?*

**Frontend / i18n:**
- **[frontend] Generate Video 涓昏〃鍗曟敼涓?key 椹卞姩**锛坄h5-video-tool/src/pages/TabGenerate.tsx`, `h5-video-tool/src/i18n/messages.ts`锛夛細椤甸潰鏍囬銆佷笓瀹?绠€娲佹ā寮忋€佽棰戝垱鎰忔弿杩般€佸闀滃ご鏃堕暱銆佺煭鍓ф憳瑕併€丳ipeline 妯℃澘銆佹ā鍨?姣斾緥/鏃堕暱/鍒嗚鲸鐜囥€丳rompt 鎿嶄綔鎸夐挳銆佺礌鏉愰€夋嫨鍖轰笌 Drive 璁剧疆寮曞鏀逛负璺熼殢 `uiLocale`銆?
- **[frontend] Viral Dance 涓庣煭鍓у啓绋挎彁绀鸿ˉ榻愯嫳鏂?*锛坄h5-video-tool/src/pages/TabGenerate.tsx`锛夛細TikTok 鍙傝€冭棰戣緭鍏ャ€佸姩浣滆縼绉绘彁绀恒€佺煭鍓?drama-creator 鍐欑瑕佺偣銆佺尗鐚悗瀹彁绀恒€乂eo 鍐欑鎻愮ず鍧囨敹杩?`generate.*` key锛岃嫳鏂囨ā寮忎笅灞曞紑璇存槑涓嶅啀鏁村潡涓枃銆?
- **[frontend] Viral Dance 榛樿 prompt 璺熼殢鍐呭璇█**锛坄h5-video-tool/src/pages/TabGenerate.tsx`锛夛細褰撶敤鎴烽€夋嫨 English 鏃讹紝鑷姩棰勫～鐨?Seedance 鍔ㄤ綔杩佺Щ prompt 涓庡弬鑰冭棰戣鏄庢敼涓鸿嫳鏂囷紝閬垮厤鑻辨枃鍐呭閾捐矾閲岀洿鎺ユ彃鍏ヤ腑鏂囨ā鏉裤€?
- **[test] Generate Video 楂橀 key 鍔犲叆鍥炲綊鏂█**锛坄h5-video-tool/src/i18n/locale.test.ts`锛夛細瑕嗙洊绱犳潗鍖归厤銆乀ikTok 鍙傝€冦€丏rive 璁剧疆寮曞绛夋柊澧?key銆?

### v0.117 鈥?2026-04-23

**鑻辨枃鏈湴鍖栫浜屾壒 key 搴撴敹鍙ｏ紙Generate / Production Wizard Shell锛?*

**Frontend / i18n:**
- **[frontend] 楂樼骇鍒剁墖涓诲３灞傛敼涓虹粺涓€ key 椹卞姩**锛坄h5-video-tool/src/studio/ProductionWizardShell.tsx`, `h5-video-tool/src/pages/ProductionWizard.tsx`, `h5-video-tool/src/i18n/messages.ts`锛夛細椤圭洰鏍囬鍗犱綅銆佷繚瀛樼姸鎬併€侀」鐩垪琛ㄣ€丼tudio 杩斿洖鍏ュ彛銆佹竻绌鸿崏绋裤€佹楠ゆ潯銆佸簳閮ㄤ笂涓€姝?涓嬩竴姝ャ€乫ooter 寮曞璇€佹ā鏉垮悕绉般€佹帓闃?ETA 涓庡叆闃?toast 鏀逛负璺熼殢 `uiLocale`锛屽噺灏戣繘鍏ラ珮绾у埗鐗囧悗鍙堥湶涓枃鐨勪綋鎰熴€?
- **[frontend] Generate Video 鍏ュ彛琛ラ綈绗簩鎵瑰彲澶嶇敤 key**锛坄h5-video-tool/src/pages/TabGenerate.tsx`, `h5-video-tool/src/i18n/messages.ts`锛夛細Seedance 妯″瀷閫夐」銆丳rompt 椋庢牸銆佺煭鍓ф憳瑕佸啓鍏ャ€佺礌鏉愬尮閰嶉敊璇€丳rompt 娑﹁壊鐘舵€佺瓑鍏堟敹杩?`generate.*` namespace锛屼负鍚庣画鏁撮〉鏇挎崲鎵撳熀纭€銆?
- **[test] 鏈湴鍖?key 鍥炲綊娴嬭瘯瑕嗙洊 Generate 涓?Production Wizard**锛坄h5-video-tool/src/i18n/locale.test.ts`锛夛細鏂板鍏抽敭鑻辨枃 key lookup 鏂█锛岄伩鍏嶆柊 namespace 鍦ㄥ悗缁媶椤甸潰鏃舵紓绉绘垨婕忛厤銆?

### v0.116 鈥?2026-04-23

**楂樼骇鍒剁墖姝ｅ紡鐜鍘嗗彶椤圭洰鑷姩褰掍綅**

**Bug Fix:**
- **[api] 楂樼骇鍒剁墖椤圭洰璇诲彇琛ラ綈鏃х洰褰曞洖閫€涓庤嚜鍔ㄨ縼绉?*锛坄h5-video-tool-api/src/routes/productionPersist.ts`锛夛細姝ｅ紡鐜鐜板湪浼氫紭鍏堜粠鏂扮殑 `shared-data/output/production/projects` 璇诲彇椤圭洰锛涜嫢鍘嗗彶椤圭洰浠嶅湪鏃х殑 `api/output/production/projects` 鐩綍锛屼細鍦?`project/load` 涓?`project/list` 鏃惰嚜鍔ㄥ綊浣嶅埌鏂扮洰褰曪紝閬垮厤鍙戝竷鍚庡嚭鐜扳€滈」鐩垪琛ㄤ负绌?/ 椤圭洰鍔犺浇 404 / 椤甸潰绌虹櫧鈥濈殑闂銆?
- **[frontend] 澶辨晥 `projectId` 涓嶅啀鎶婇珮绾у埗鐗囬攣姝?*锛坄h5-video-tool/src/pages/ProductionWizard.tsx`锛夛細濡傛灉鏈湴璁颁綇鐨勯」鐩?ID 鍦ㄥ綋鍓嶇幆澧冮噷宸茬粡涓嶅瓨鍦紝椤甸潰浼氳嚜鍔ㄦ竻闄ゅけ鏁堝紩鐢ㄥ苟鍥炲埌鍙噸鏂伴€夐」鐩殑鐘舵€侊紝鑰屼笉鏄竴鐩村崱鍦ㄢ€滄殏鍋滆嚜鍔ㄤ繚瀛樹互閬垮厤瑕嗙洊浜戠鏁版嵁鈥濈殑閿欒椤点€?

### v0.115 鈥?2026-04-23

**鑻辨枃鏈湴鍖栫涓€鎵?key 搴撴敹鍙ｏ紙Gallery / History / Batch Jobs锛?*

**Frontend / i18n:**
- **[frontend] 鐢诲粖涓庡巻鍙查〉鏀逛负缁熶竴 message key 椹卞姩**锛坄h5-video-tool/src/i18n/messages.ts`, `h5-video-tool/src/pages/Gallery.tsx`, `h5-video-tool/src/components/GalleryView.tsx`, `h5-video-tool/src/pages/History.tsx`锛夛細`My Videos / Server Files / History / Kling Cloud / Local History / Merge Settings` 绛夐珮棰戞绾ч〉闈㈠３灞傘€乼oast銆佺┖鐘舵€併€佺瓫閫夐」銆佹寜閽笌鎻愮ず鏂囨缁熶竴鏀惰繘鍏变韩 key 搴擄紝鑻辨枃妯″紡涓嬩笉鍐嶆暣椤垫帀鍥炰腑鏂囥€?
- **[frontend] 鎵归噺浠诲姟鐪嬫澘琛ラ綈鑻辨枃鐘舵€佷笌鏃堕棿鏍煎紡**锛坄h5-video-tool/src/components/BatchJobsBoard.tsx`, `h5-video-tool/src/i18n/messages.ts`锛夛細鎵归噺浠诲姟鎽樿銆佺姸鎬佹爣绛俱€佸彇娑堟寜閽€佸鍏ユ椂闂磋酱銆佷笅杞借棰戜笌鎻愪氦鏃堕棿鏀逛负璺熼殢 `uiLocale`锛屽苟缁熶竴浣跨敤 locale-aware 鏃堕棿鏍煎紡銆?
- **[frontend] 閫氱敤閿欒涓庤緭鍑烘枃浠?helper 鏀跺彛鍒?locale-aware 宸ュ叿灞?*锛坄h5-video-tool/src/api/client.ts`, `h5-video-tool/src/components/outputGalleryUtils.ts`锛夛細缃戠粶閿欒 / 璇锋眰澶辫触鍏滃簳鏂囨鏀逛负浠庡瓧鍏歌鍙栵紝Dreamina 杈撳嚭鏂囦欢鍚嶃€佹潵婧愭爣绛句笌淇濆瓨鍒版湰鍦板巻鍙茬殑 prompt fallback 涔熶笉鍐嶅啓姝讳腑鏂囥€?
- **[test] 鏂板杈撳嚭鐢诲粖鏈湴鍖?helper 鍥炲綊娴嬭瘯锛屽苟娓呯悊鏃?preset 娈嬬暀娴嬭瘯**锛坄h5-video-tool/src/components/outputGalleryUtils.test.ts`, `h5-video-tool/src/i18n/locale.test.ts`, `h5-video-tool/src/i18n/locale.ts`锛夛細瑕嗙洊鏉ユ簮鏍囩銆丏reamina 鏂囦欢鍚嶅睍绀恒€乫allback prompt 涓?locale 褰掍竴鍖栵紝閬垮厤鏂?key 搴撳拰鐜版湁璇█鍗忚鍐嶆婕傜Щ銆?

### v0.114 鈥?2026-04-23

**楂樼骇鍒剁墖鑻辨枃缈昏瘧閾捐矾 JSON 瀹归敊鍏滃簳**

**Bug Fix:**
- **[api] `replyLocale` 鑻辨枃缈昏瘧缁撴灉鏀逛负瀹归敊瑙ｆ瀽**锛坄h5-video-tool-api/src/services/replyLocale.ts`锛夛細楂樼骇鍒剁墖鍦ㄨ嫳鏂囪緭鍑烘ā寮忎笅锛岀粨鏋勫寲鍐呭鐨勭炕璇戠粨鏋滅幇鍦ㄤ細鍏堝皾璇曟彁鍙栧钩琛?JSON锛屽啀鐢?`jsonrepair` 淇灏鹃€楀彿銆佷唬鐮佸潡鍖呰９鍜屽す甯﹁鏄庢枃鏈紝閬垮厤缈昏瘧灞傝嚜宸辩殑 `JSON.parse` 鍐嶆妸鎺ュ彛鎵撴垚 500銆?
- **[api] 鑻辨枃鏈湴鍖栭檷绾т负 best-effort**锛坄h5-video-tool-api/src/services/replyLocale.ts`锛夛細濡傛灉妯″瀷杩欒疆缈昏瘧杈撳嚭浠嶇劧涓嶅彲淇锛屾帴鍙ｄ細淇濈暀鍘熷缁撴瀯鍖栧唴瀹圭户缁繑鍥烇紝鑰屼笉鏄洜涓虹炕璇戝け璐ラ樆鏂?`storyboard-table / production-design` 涓婚摼璺€?
- **[tests] 鏂板 replyLocale 鑴?JSON 鍥炲綊娴嬭瘯**锛坄h5-video-tool-api/tests/replyLocale.test.ts`锛夛細瑕嗙洊 fenced JSON銆佸熬閫楀彿鍜?JSON 鍓嶅悗澶瑰甫璇存槑鏂囨湰鍦烘櫙锛岀‘淇濊繖娆＄嚎涓婃姤閿欎笉浼氬啀娆″洖褰掋€?

### v0.113 鈥?2026-04-23

**鍙戝竷闂ㄧ鑷姩鍖栦笌 staging verified 鎻愬崌鏈哄埗**

**Ops / Infra:**
- **[scripts] `deploy_all.py` 鍗囩骇涓哄甫闂ㄧ鐨勬寮忓彂甯冨叆鍙?*锛坄scripts/deploy_all.py`, `scripts/tests/test_deploy_all.py`锛夛細鍙戝竷鑴氭湰鐜板湪浼氳嚜鍔ㄩ樆姝?release-scope 鑴忔敼鍔ㄣ€侀樆姝㈡湭 push 鍒?`origin/main` 鐨?SHA 鍙戝竷锛屽苟鍦?`prod` 鍙戝竷鍓嶅己鍒舵牎楠屸€滃綋鍓嶆湰鍦?SHA = staging 绾夸笂 SHA = staging 宸查獙璇?SHA鈥濓紱鍚屾椂 `prod` 鍙戝竷浼氳嚜鍔ㄥ垏鎹?`preparing -> deploying -> verifying`锛屽苟鎶婄増鏈笉涓€鑷翠粠鏃х殑 warning 鎻愬崌涓虹‖澶辫触銆?
- **[scripts] 鏂板 staging 楠岃瘉纭鑴氭湰**锛坄scripts/mark_release_ready.py`, `scripts/release_guard.py`, `scripts/tests/test_release_guard.py`锛夛細浣犲湪娴嬭瘯鐜鑷祴閫氳繃鍚庯紝鍙互鏄惧紡鎶婂綋鍓?staging 鐗堟湰鏍囪涓衡€滃彲鎻愬崌鍒版寮忊€濈殑 release-ready SHA锛屽悗缁?prod 鍙厑璁告彁鍗囪繖涓?SHA銆?
- **[scripts] 鍚庣閮ㄧ讲琛ラ綈 PM2 online 纭鏌?*锛坄scripts/deploy_api.py`, `scripts/tests/test_deploy_api.py`锛夛細濡傛灉 PM2 閲嶅惎鍚庝笉鏄?`online` 鎴栨牴鏈病鎵惧埌鐩爣杩涚▼锛岄儴缃蹭細鐩存帴澶辫触锛屼笉鍐嶆妸鈥滈噸鍚簡浣嗘病璧锋潵鈥濊鍒や负鎴愬姛銆?
- **[docs] 鍙戝竷 Runbook 涓庨」鐩骇瑙勫垯鍚屾鏇存柊**锛坄docs/guides/2026-04-23-single-owner-staging-prod-release-runbook.md`, `AGENTS.md`, `CLAUDE.md`, `docs/CODEX-CLI-PROJECT-GUIDE.md`, `docs/plans/2026-04-23-release-guard-automation-plan.md`锛夛細浠撳簱鍐呯幇鍦ㄦ槑纭啓娓?staging 鑷祴銆乵ark ready銆佷竴閿?prod銆佺揣鎬?bypass 鐨勮竟鐣屽拰鎿嶄綔鏂瑰紡銆?

### v0.112 鈥?2026-04-23

**鍙岀幆澧冨彂甯冭鍒欏浐鍖栧埌椤圭洰绾ф寚浠?*

**Ops / Governance:**
- **[docs] `AGENTS.md` / `CLAUDE.md` 鏀规垚 staging-first 寮哄埗鍙ｅ緞**锛氶」鐩骇鎸囦护鐜板湪鏄庣‘瑕佹眰鎵€鏈夌嚎涓婂彂甯冨繀椤诲厛鍙?`staging`銆佸畬鎴愰獙璇併€佸啀鍙?`prod`锛屽苟琛ラ綈鍙岀幆澧冪洰褰曘€佸弻 PM2 杩涚▼銆佹寮忔彁绀虹獥鍙ｅ拰绂佹鐩村彂姝ｅ紡鐨勮鍒欍€?
- **[docs] `docs/CODEX-CLI-PROJECT-GUIDE.md` 琛ラ綈闀跨増鍙岀幆澧冨彂甯冭鏄?*锛氭妸鍗曚汉澶氱數鑴戝彂甯冦€乣scripts/.env`銆佹帹鑽愬懡浠ゅ拰渚嬪鏉′欢涓€璧峰啓杩?Codex 闀挎枃妗ｏ紝鍚庣画鎹㈢數鑴戞垨鎹㈡櫤鑳戒綋鏃朵篃浼氶粯璁ら伒瀹堝悓涓€濂楁祦绋嬨€?

### v0.111 鈥?2026-04-23

**鍗曚汉澶氱數鑴戝彂甯?Runbook 涓庣姸鎬佸垏鎹㈣剼鏈?*

**Ops / Infra:**
- **[scripts] 鏂板鏈湴鍙戝竷鐘舵€佸垏鎹㈣剼鏈?*锛坄scripts/set_deployment_state.py`, `scripts/tests/test_set_deployment_state.py`锛夛細鐜板湪鍙互鍦ㄤ换鎰忓凡閰嶇疆鍙戝竷鍑嵁鐨勭數鑴戜笂锛岀敤鍛戒护鐩存帴鏌ョ湅鎴栧垏鎹?`staging/prod` 鐨?`idle / preparing / deploying / verifying` 鐘舵€侊紝涓嶉渶瑕佸啀鎵嬪伐 SSH 鏀规湇鍔″櫒鏂囦欢銆?
- **[scripts] 鏂板姣忓彴鍙戝竷鐢佃剳鐨勬湰鍦伴厤缃牱鏉?*锛坄scripts/deploy.env.example`锛夛細鎶婇儴缃茬洰褰曘€丳M2 鍚嶇О銆佺増鏈鏌ュ湴鍧€鍜屾湇鍔″櫒杩炴帴淇℃伅鏀跺彛鎴愪竴浠藉彲澶嶅埗鏍锋澘锛屾柟渚夸綘鍦ㄤ笉鍚岀數鑴戜笂蹇€熷噯澶囧彂甯冪幆澧冿紝鍚屾椂缁х画淇濇寔鐪熷疄鍑嵁涓嶅叆 Git銆?
- **[docs] 鏂板鍗曚汉澶氱數鑴戝彂甯?Runbook**锛坄docs/guides/2026-04-23-single-owner-staging-prod-release-runbook.md`, `docs/DOCS-INDEX.md`锛夛細鎶娾€滃紑鍙?-> 娴嬭瘯鐜 -> 姝ｅ紡鐜 -> 鍙戝竷鎻愮ず -> 鍥炴粴 -> 鎹㈢數鑴戦噸鍙戔€濈殑瀹屾暣娴佺▼鍥哄畾鎴愭枃妗ｏ紝鍚庣画鍙戠増涓嶅啀闈犺蹇嗗拰涓存椂鍙ｅご绾﹀畾銆?

### v0.110 鈥?2026-04-23

**楂樼骇鍒剁墖鍒朵綔娓呭崟 JSON 瑙ｆ瀽鍏滃簳**

**Bug Fix:**
- **[api] `production-design` 澧炲姞瑙ｆ瀽澶辫触鑷姩閲嶈瘯鍏滃簳**锛坄h5-video-tool-api/src/routes/studio.ts`, `h5-video-tool-api/src/services/productionDesignFallback.ts`锛夛細褰撻珮绾у埗鐗?Step 3銆岃鑹猜峰満鏅烽亾鍏枫€嶉噷鐨勫埗浣滄竻鍗曠敓鎴愬洜妯″瀷杩斿洖鑴?JSON 澶辫触鏃讹紝璺敱灞傜幇鍦ㄤ細璇嗗埆 JSON 瑙ｆ瀽绫婚敊璇苟鑷姩璧颁竴杞洿涓ユ牸鐨?fallback 鐢熸垚锛岃€屼笉鏄妸搴曞眰 `JSON.parse` 寮傚父鐩存帴鎶涘洖鍓嶇绾㈡潯銆?
- **[api] 鏂板 production-design 淇瑙ｆ瀽鍣ㄤ笌榛樿鍊煎綊涓€鍖?*锛坄h5-video-tool-api/src/services/productionDesignFallback.ts`锛夛細鏀寔淇甯︿唬鐮佸潡鍖呰９銆佸熬閫楀彿銆佸墠鍚庤鏄庢枃鏈殑 L2 杈撳嚭锛屽悓鏃朵负缂哄け鐨?`wardrobe / props / sets / lighting / soundMusic` 瀛楁琛ラ綈瀹夊叏榛樿鍊硷紝闄嶄綆妯″瀷鍋跺彂鏍煎紡娉㈠姩瀵归〉闈㈠彲鐢ㄦ€х殑褰卞搷銆?
- **[tests] 鏂板 malformed JSON 鍥炲綊娴嬭瘯**锛坄h5-video-tool-api/tests/productionDesignFallback.test.ts`锛夛細瑕嗙洊 fenced JSON銆佸熬閫楀彿鍜岀己瀛楁鍦烘櫙锛岀‘淇濊繖绫绘埅鍥鹃噷鐨勬姤閿欎笉浼氬洜涓哄悗缁皟鏁村啀娆″洖褰掋€?

### v0.109 鈥?2026-04-23

**娴嬭瘯 / 姝ｅ紡鍙岀幆澧冮儴缃插熀纭€鑳藉姏棣栨壒钀藉湴**

**Feature / Infra:**
- **[api] 绯荤粺鐗堟湰鎺ュ彛琛ラ綈鐜淇℃伅锛屽苟鏂板閮ㄧ讲鐘舵€佽鍙栬兘鍔?*锛坄h5-video-tool-api/src/routes/system.ts`, `h5-video-tool-api/src/services/deploymentState.ts`锛夛細`/api/system/version` 鐜板湪浼氳繑鍥炲綋鍓嶈繍琛岀幆澧冿紝鍓嶇鍙槑纭尯鍒?`staging/prod`锛涘悓鏃舵柊澧?`/api/system/deployment-state`锛岀敤浜庡叕寮€璇诲彇褰撳墠鐜鐨勫彂甯冩彁绀虹姸鎬併€?
- **[api] 绠＄悊鍛樺彲璇诲啓閮ㄧ讲鐘舵€?*锛坄h5-video-tool-api/src/routes/adminSystem.ts`, `h5-video-tool-api/src/index.ts`锛夛細鏂板 `/api/admin/deployment-state` 鐨勭鐞嗗憳璇诲啓鎺ュ彛锛岀敤浜庡湪姝ｅ紡鍙戝竷鍓嶅垏鎹⑩€滃嵆灏嗗彂甯?/ 鍙戝竷涓?/ 楠岃瘉涓?/ 绌洪棽鈥濊繖浜涚姸鎬侊紝涓嶅啀渚濊禆鎵嬪伐鏀逛唬鐮佹垨涓存椂鍙ｅご閫氱煡銆?
- **[frontend] Layout 鏂板鍏ㄥ眬鍙戝竷鍏憡鏉′笌鐜鐗堟湰灞曠ず**锛坄h5-video-tool/src/components/Layout.tsx`, `h5-video-tool/src/utils/deploymentBanner.ts`锛夛細涓荤珯浼氳疆璇㈤儴缃茬姸鎬侊紝鍦ㄥ彂甯冪獥鍙ｉ《閮ㄦ樉绀哄叏灞€鎻愰啋锛涘簳閮ㄧ増鏈枃妗堜篃浼氬甫涓婄幆澧冩爣绛撅紝閬垮厤鑷祴鏃惰鎶婃祴璇曠幆澧冨綋姝ｅ紡鐜銆?
- **[scripts] 閮ㄧ讲鑴氭湰鏀逛负鐩爣鐜鍖栵紝绉婚櫎浠撳簱鍐呯‖缂栫爜姝ｅ紡鐩綍/瀵嗙爜**锛坄scripts/deploy_config.py`, `scripts/deploy_all.py`, `scripts/deploy_api.py`, `scripts/deploy_frontend.py`, `scripts/tests/test_deploy_config.py`, `h5-video-tool-api/.env.example`锛夛細閮ㄧ讲鑴氭湰鐜版敮鎸?`--target staging|prod`锛岃繙绔洰褰曘€丳M2 鍚嶇О銆佺増鏈鏌ュ湴鍧€鍜岃繛鎺ュ嚟鎹粺涓€浠庢湰鍦版湭鎻愪氦鐜鍙橀噺璇诲彇锛屼负鍚屾満鍙岀幆澧冮儴缃叉墦鍩虹锛屼篃鏀舵帀浜嗚剼鏈噷纭紪鐮佽繛鎺ヤ俊鎭殑瀹夊叏椋庨櫓銆?
- **[tests] 鏂板閮ㄧ讲鐘舵€佷笌閮ㄧ讲鑴氭湰鍥炲綊娴嬭瘯**锛坄h5-video-tool-api/tests/deploymentState.test.ts`, `h5-video-tool/tests/deploymentBanner.test.ts`, `scripts/tests/test_deploy_config.py`锛夛細瑕嗙洊閮ㄧ讲鐘舵€侀粯璁ゅ€笺€佺幆澧冭瘑鍒€乥anner 鏂囨鍥為€€銆乺untime 鐗堟湰鏍煎紡鍖栵紝浠ュ強 `staging/prod` 閮ㄧ讲閰嶇疆瑙ｆ瀽锛岄伩鍏嶅悗缁彂甯冭兘鍔涘洖閫€銆?

### v0.108 鈥?2026-04-23

**鍓緫鍣?/ 楂樼骇鍒剁墖鏈懡鍚嶉」鐩不鐞嗕笌鑽夌杞鏀跺彛**

**Feature / UX Polish:**
- **[frontend] 鍓緫鍣ㄦ敼涓衡€滆崏绋垮厛琛?+ 杞寮哄埗鍛藉悕鈥?*锛坄h5-video-tool/src/editor/hooks/useTimelineState.ts`, `h5-video-tool/src/pages/EditorWorkbench.tsx`, `h5-video-tool/src/utils/projectLifecycle.ts`锛夛細杩涘叆鍓緫鍣ㄦ椂涓嶅啀绔嬪埢鐢熸垚姝ｅ紡鈥滄湭鍛藉悕鍓緫椤圭洰鈥濓紱鍙湁鍦ㄧ礌鏉愩€佹椂闂磋酱鎴?Agent 缁撴灉褰㈡垚鏈夋晥鍐呭鏃讹紝鎵嶄細鎷︿竴娆″懡鍚嶏紝鍛藉悕瀹屾垚鍚庢墠杩涘叆姝ｅ紡椤圭洰鍒楄〃骞跺紑濮嬭嚜鍔ㄤ繚瀛樸€?
- **[frontend] 鍓緫鍣ㄩ」鐩鐞嗘柊澧炴湭鍛藉悕娌荤悊鍏ュ彛**锛坄h5-video-tool/src/editor/components/EditorProjectManager.tsx`锛夛細椤圭洰寮圭獥鐜板湪鏀寔鎼滅储锛屽苟鏂板鈥滄不鐞嗘湭鍛藉悕椤圭洰鈥濓紝浼氭寜鈥滅┖椤圭洰鍒犻櫎 / 鏈夊唴瀹归」鐩櫤鑳介噸鍛藉悕鈥濈殑瑙勫垯鎵归噺鏀跺彛鍘嗗彶閬楃暀鐨勬湭鍛藉悕鍓緫椤圭洰銆?
- **[frontend] 楂樼骇鍒剁墖鏀逛负鈥滄湰鍦拌崏绋夸紭鍏?+ 棣栨浜戠淇濆瓨寮哄埗鍛藉悕鈥?*锛坄h5-video-tool/src/pages/ProductionWizard.tsx`, `h5-video-tool/src/studio/components/ProductionProjectListModal.tsx`, `h5-video-tool/src/api/production.ts`, `h5-video-tool/src/utils/projectLifecycle.ts`锛夛細楂樼骇鍒剁墖杩涘叆椤甸潰鍚庡厛宸ヤ綔鍦ㄦ湰鍦拌崏绋挎€侊紝涓嶄細鍥犵┖鏍囬鑷姩鍐欏叆鏈嶅姟绔紱褰撴晠浜嬨€佸垎闀滄垨鍙傝€冪礌鏉愬舰鎴愭湁鏁堝唴瀹规椂锛岀郴缁熶細瑕佹眰鍏堝懡鍚嶏紝鍛藉悕鍚庢墠杩涘叆鏈嶅姟绔」鐩垪琛ㄣ€傞」鐩垪琛ㄤ篃琛ラ綈浜嗘悳绱€侀噸鍛藉悕銆佸垹闄ゅ拰鏈懡鍚嶆不鐞嗗叆鍙ｃ€?
- **[api] 鍓嶅悗绔粺涓€鏂板姝ｅ紡淇濆瓨瀹堝崼**锛坄h5-video-tool-api/src/routes/editorProjects.ts`, `h5-video-tool-api/src/routes/productionPersist.ts`, `h5-video-tool-api/src/services/projectPersistenceGuards.ts`锛夛細鍚庣鐜板湪浼氭嫆缁濃€滈娆℃寮忎繚瀛樹絾浠嶄负绌哄悕鈥濈殑鍓緫/鍒剁墖椤圭洰锛屽悓鏃朵繚鐣欏凡瀛樺湪鏃ч」鐩殑鍏煎鏇存柊璺緞锛岄伩鍏嶅巻鍙叉湭鍛藉悕椤圭洰琚浼ゃ€?
- **[tests] 鏂板缁熶竴椤圭洰鐢熷懡鍛ㄦ湡鍥炲綊娴嬭瘯**锛坄h5-video-tool/tests/projectLifecycle.test.ts`, `h5-video-tool-api/tests/projectPersistenceGuards.test.ts`锛夛細瑕嗙洊鈥滄湁鏁堣崏绋垮垽瀹氥€佸懡鍚嶉棬妲涖€佹櫤鑳藉懡鍚嶅缓璁€佹湭鍛藉悕娌荤悊鍔ㄤ綔銆佷繚瀛樺畧鍗€濊繖浜涘叧閿鍒欙紝闃叉鍚庣画鍐嶅洖閫€鎴愪竴杩涢〉闈㈠氨鍫嗘湭鍛藉悕椤圭洰銆?

### v0.107 鈥?2026-04-23

**鎴戠殑鎴愮墖鏈嶅姟绔枃浠惰ˉ鍥炴彁绀鸿瘝鎽樿**

**Bug Fix / UX Polish:**
- **[api] 鏈嶅姟绔枃浠跺垪琛ㄦ柊澧?`promptSummary` 鍥炲～**锛坄h5-video-tool-api/src/routes/video.ts`, `h5-video-tool-api/src/services/outputGalleryService.ts`, `h5-video-tool-api/src/services/batchJobsQueue.ts`, `h5-video-tool-api/src/services/dreaminaRecovery.ts`锛夛細鍚庣鐜板湪浼氬厛鎸夋湇鍔＄鏂囦欢閲岀殑 dreamina submitId锛屽洖鏌ュ綋鍓嶈处鍙峰悕涓嬬殑 batch-jobs 鍜?dreamina intents锛屼紭鍏堥€夋渶瀹屾暣鐨勬彁绀鸿瘝鎽樿闅忓垪琛ㄨ繑鍥烇紝閬垮厤鈥滄槑鏄庢槸鑷繁鐨勬垚鐗囷紝鍒楄〃閲屽嵈鍙墿鏈嶅姟绔矾寰勨€濄€?
- **[frontend] 浠庢湇鍔＄鏂囦欢淇濆瓨鍒版垜鐨勬垚鐗囨椂浼樺厛钀界湡瀹炴彁绀鸿瘝**锛坄h5-video-tool/src/components/GalleryView.tsx`, `h5-video-tool/src/components/outputGalleryUtils.ts`, `h5-video-tool/src/api/video.ts`锛夛細鏈嶅姟绔枃浠跺崱鐗囩洿鎺ュ睍绀哄洖濉嚭鐨勬彁绀鸿瘝鎽樿锛涚偣鍑烩€滀繚瀛樺埌鎴戠殑鎴愮墖鈥濇椂浼氫紭鍏堝啓鍏ヨ繖浠芥憳瑕侊紝鍙湁鍦ㄥ畬鍏ㄦ煡涓嶅埌褰掑睘 prompt 鏃舵墠閫€鍥?`[鏈嶅姟绔垚鐗嘳 path` 鍗犱綅鏂囨銆?
- **[tests] 鏂板 prompt summary 鍥炲綊娴嬭瘯**锛坄h5-video-tool-api/tests/outputGalleryService.test.ts`, `h5-video-tool/tests/outputGalleryUtils.test.ts`锛夛細瑕嗙洊鈥滃悓涓€ submitId 鍙栨渶楂樹紭鍏堢骇 prompt 鎽樿鈥濆拰鈥滀繚瀛樺巻鍙叉椂浼樺厛浣跨敤 promptSummary鈥濅袱鏉¤鍒欙紝闃叉鍚庣画鍐嶉€€鍥炲彧瀛樿矾寰勩€?

### v0.106 鈥?2026-04-23

**鎴戠殑鎴愮墖鍗虫ⅵ鍥炶ˉ鏀逛负鎸夎处鍙峰綊灞炶ˉ鍥?*

**Bug Fix / Ownership Boundary:**
- **[api] `dreaminaRecentSync` 鍙洖琛ュ綋鍓嶈处鍙锋湁褰掑睘璇佹嵁鐨?submitId**锛坄h5-video-tool-api/src/services/dreaminaRecentSync.ts`, `h5-video-tool-api/src/services/dreaminaRecovery.ts`锛夛細鏈嶅姟绔枃浠堕〉鐨勨€滃嵆姊︽渶杩戞垚鐗囧洖琛モ€濅笉鍐嶇洿鎺ユ壂鍏变韩鍗虫ⅵ璐﹀彿鐨勬墍鏈夋垚鍔熶换鍔★紝鑰屾槸鍏堜粠褰撳墠 GOBS 鐢ㄦ埛鍚嶅搴旂殑 batch-jobs 鍜?dreamina intents 閲屾彁鍙栧凡鐭?submitId锛屽啀鍙ˉ鍥炶繖浜涙槑纭睘浜庡綋鍓嶈处鍙风殑鍗虫ⅵ鎴愮墖銆?
- **[api] 鏂板 owner-gated 鍥炶ˉ娴嬭瘯**锛坄h5-video-tool-api/tests/dreaminaRecentSync.test.ts`锛夛細瑕嗙洊鈥滃彧鍏佽鏄庣‘ owned 鐨?submit key 杩涘叆鍥炶ˉ鍊欓€夆€濈殑瑙勫垯锛岄槻姝㈠悗缁啀娆℃妸鍒汉鐨勫嵆姊︽垚鐗囪ˉ杩涘綋鍓嶈处鍙风洰褰曘€?

### v0.105 鈥?2026-04-23

**鎴戠殑鎴愮墖鏈嶅姟绔枃浠舵敮鎸侀殣钘忋€佹悳绱笌绛涢€?*

**Feature / UX Polish:**
- **[api] 鏈嶅姟绔枃浠跺垪琛ㄦ柊澧炴悳绱?/ 鏉ユ簮 / 鏃堕棿 / 瑙嗗浘杩囨护鍗忚**锛坄h5-video-tool-api/src/routes/video.ts`, `h5-video-tool-api/src/services/outputGalleryService.ts`, `h5-video-tool/src/api/video.ts`锛夛細`/api/video/output-recent` 鐜板湪鏀寔鎸夊叧閿瓧銆佹潵婧愩€佽繎鍑犲ぉ鍜屸€滄甯稿垪琛?/ 宸查殣钘忊€濊鍥剧瓫閫夛紝骞惰繑鍥炲綋鍓嶈处鍙风殑闅愯棌璁℃暟锛屽墠绔笉鍐嶅彧鑳借鍔ㄥ睍绀烘暣鍖呯洰褰曠粨鏋溿€?
- **[api] 鏂板鏈嶅姟绔枃浠垛€滀粎褰撳墠璐﹀彿闅愯棌 / 鎭㈠鏄剧ず鈥濊兘鍔?*锛坄h5-video-tool-api/src/routes/video.ts`, `h5-video-tool-api/src/services/outputGalleryService.ts`锛夛細闅愯棌鐘舵€佹寜褰撳墠 GOBS 鐢ㄦ埛鍗曠嫭鎸佷箙鍖栵紝涓嶅垹闄ょ墿鐞?mp4锛屼篃涓嶅奖鍝嶅嵆姊﹀悗鍙帮紱鍗虫ⅵ鏂囦欢鎸?submit key 鐢熸垚绋冲畾闅愯棌閿紝閬垮厤鍚屼竴鎴愮墖鎹㈣矾寰勫悗鍙堥噸鏂板啋鍑烘潵銆?
- **[frontend] 鐢诲粖鏈嶅姟绔枃浠堕〉琛ラ綈鎼滅储妗嗐€佹潵婧?鏃堕棿/淇濆瓨鐘舵€佺瓫閫夊拰宸查殣钘忚鍥?*锛坄h5-video-tool/src/components/GalleryView.tsx`, `h5-video-tool/src/components/outputGalleryUtils.ts`锛夛細杩愯惀鍚屽鐜板湪鍙互鏇村揩鎵惧埌鍗虫ⅵ鍥炶ˉ鐗囥€佽繃婊ゅ凡淇濆瓨/鏈繚瀛樼墖锛屽苟鍦ㄥ綋鍓嶈处鍙蜂笅闅愯棌涓嶆兂鍐嶇湅鐨勬湇鍔＄鏂囦欢銆?
- **[tests] 鏂板 output gallery 杩囨护涓庨殣钘忓洖褰掓祴璇?*锛坄h5-video-tool-api/tests/outputGalleryService.test.ts`, `h5-video-tool/tests/outputGalleryUtils.test.ts`锛夛細瑕嗙洊鏉ユ簮鍒ゅ畾銆侀殣钘忚鍥俱€佸叧閿瘝/鏃堕棿杩囨护鍜屽墠绔瓫閫?query 瑙勫垯锛岄槻姝㈠悗缁妸杩欏潡鍙敤鎬ц兘鍔涘啀鏀瑰洖鍘汇€?

### v0.104 鈥?2026-04-23

**楂樼骇鍒剁墖鍒嗛暅骞冲彴鎺掍綅鍙鍖?*

**Feature / UX Polish:**
- **[frontend] 鍒嗛暅鎿嶄綔鍖恒€侀瑙堥潰鏉垮拰椤堕儴鎽樿缁熶竴灞曠ず鈥滃钩鍙版帓闃熺 N 浣嶁€?*锛坄h5-video-tool/src/studio/steps/StepStoryboardGenerateActions.tsx`, `StepStoryboardPreviewPanel.tsx`, `StepStoryboardWorkspace.tsx`锛夛細褰撳墠闀滃ご澶勪簬 `awaiting_submit` 鏃讹紝鐢ㄦ埛浼氱洿鎺ョ湅鍒拌嚜宸卞湪骞冲彴鍏变韩闃熷垪涓殑鍏蜂綋鎺掍綅鍜岄璁″紑濮嬫椂闂达紝涓嶅啀鍙湅鍒扳€滃墠鏂硅繕鏈夊嚑涓€濇垨妯＄硦鐨勨€滅瓑寰呰皟搴︿腑鈥濄€?
- **[frontend] 鍒嗛暅缂╃暐鍥炬潯涓虹瓑寰呭钩鍙拌皟搴︾殑闀滃ご鏂板浣嶆瑙掓爣**锛坄h5-video-tool/src/studio/steps/StepStoryboardShotStrip.tsx`锛夛細闀滃ご鍗＄墖鍦ㄥ钩鍙伴槦鍒楅樁娈典細鐩存帴甯?`骞冲彴#N` 瑙掓爣锛岀敤鎴锋壂涓€鐪煎氨鑳界煡閬撳摢浜涢暅澶磋繕鍦ㄥ钩鍙版帓闃熴€?
- **[frontend] 鍒嗛暅瑙嗛鐘舵€佹枃妗堟敼鎴愨€滄帓闃熶細鑷姩缁х画锛屽畬鎴愪細鑷姩鍥炲啓鈥?*锛坄h5-video-tool/src/studio/steps/StepStoryboardGenerateActions.tsx`, `StepStoryboardPreviewPanel.tsx`锛夛細缁熶竴婢勬竻鈥滃钩鍙版帓闃?鈫?宸叉彁浜ゅ嵆姊?鈫?姝ｅ湪鐢熸垚鈥濈殑闃舵锛屽苟鍘绘帀鈥滆鍕垮叧闂湰椤碘€濊繖绉嶈瀵兼€ф彁绀猴紝閬垮厤鐢ㄦ埛璇互涓虹寮€椤甸潰鍚庝换鍔″氨涓嶄細缁х画銆?

### v0.103 鈥?2026-04-23

**鍓緫 Agent 鑻辨枃璇锋眰鏍￠獙鍏滃簳**

**Bug Fix / Resilience:**
- **[api] Build 闃舵琛ュ厖绮剧‘ ID 鍙傝€?*锛坄h5-video-tool-api/src/services/editorAgentService.ts`锛夛細缁?Timeline JSON 鐢熸垚闃舵杩藉姞 `selectedAssetIds / assets / candidateWindows` 鍙傝€冨潡锛屾槑纭姹傞€愬瓧澶嶇敤 `assetId` 鍜?`candidateWindow.id`锛屽噺灏戣嫳鏂囪姹傛椂妯″瀷鎶婄礌鏉?ID 鏀瑰啓鎴愭枃浠跺悕鎴栨弿杩板悗琚牎楠屾竻绌虹殑鎯呭喌銆?
- **[api] 鍊欓€夌獥閲嶅缓鍏滃簳鏀跺彛 sanitize 鍏ㄨ繃婊ゅ満鏅?*锛坄h5-video-tool-api/src/services/editorAgentTimelineFallback.ts`, `h5-video-tool-api/src/services/editorAgentService.ts`锛夛細褰撴ā鍨嬫寫鍑虹殑 clip 鍦ㄦ渶缁堟牎楠屽悗鍏ㄩ儴琚繃婊ゆ椂锛屾湇鍔＄浼氳嚜鍔ㄧ敤鍊欓€夌獥閲嶅缓 `v1/a1` 鏃堕棿杞达紝鑰屼笉鏄洿鎺ヨ繑鍥?鈥渆very candidate clip was filtered out during validation鈥濄€?
- **[tests] 鏂板鍓緫鍊欓€夌獥 fallback 鍥炲綊娴嬭瘯**锛坄h5-video-tool-api/tests/editorAgentTimelineFallback.test.ts`锛夛細瑕嗙洊鈥滄寜鍊欓€夌獥杞浆鐢熸垚鐗囨鈥濆拰鈥渟anitize 娓呯┖鍚庡彲鎭㈠鏈夋晥鏃堕棿杞粹€濅袱鏉″洖褰掕矾寰勩€?

### v0.102 鈥?2026-04-22

**楂樼骇鍒剁墖 / 鍓緫宸ヤ綔鍙颁富澹冲眰鑻辨枃 UI 鏀跺彛**

**Feature / UX Polish:**
- **[frontend] 楂樼骇鍒剁墖涓昏矾寰勮ˉ榻愯嫳鏂囧３灞?*锛坄h5-video-tool/src/pages/ProductionWizard.tsx`, `h5-video-tool/src/studio/ProductionWizardShell.tsx`, `h5-video-tool/src/studio/steps/StepInput.tsx`, `StepStoryArc.tsx`, `StepDesignHeader.tsx`, `StepDesignActions.tsx`, `StepStoryboard*.tsx`, `StepExportWorkspace.tsx`锛夛細椤圭洰澶撮儴銆佹楠ゅ鑸€佽緭鍏ヤ笌澶х翰椤点€佽璁″伐浣滃彴澶撮儴銆佸垎闀滃伐浣滃彴鎸夐挳/鐘舵€併€佸垎闀滈瑙堝拰瀵煎嚭椤电鍏ㄩ儴鎺ュ叆 `uiLocale`锛岃嫳鏂囩晫闈笅鐨勪富娴佺▼涓嶅啀琚腑鏂囨寜閽拰鐘舵€佹墦鏂€?
- **[frontend] 鍓緫宸ヤ綔鍙颁富澹冲眰涓?Agent 闈㈡澘琛ラ綈鑻辨枃 UI**锛坄h5-video-tool/src/pages/EditorWorkbench.tsx`, `h5-video-tool/src/editor/components/AgentPanel.tsx`, `AgentMemoryPanel.tsx`, `EditorProjectManager.tsx`, `ImportGuideModal.tsx`, `SyncProductionModal.tsx`锛夛細鍙充晶 Agent銆侀」鐩脊绐椼€佸鍏?鍚屾鎻愮ず銆侀《閮ㄩ」鐩搷浣滃尯鍜?onboarding 缁熶竴鏀寔鑻辨枃澹冲眰锛岃嫳鏂囩敤鎴峰彲浠ョ嫭绔嬪畬鎴愨€滃鍏?鈫?Agent 娌熼€?鈫?棰勮/缂栬緫鈥濈殑涓昏矾寰勩€?
- **[frontend] 鏂板杞婚噺 `uiText` helper 涓庡叡浜繍琛岀姸鎬佽嫳鏂囧洖閫€**锛坄h5-video-tool/src/i18n/uiText.ts`, `h5-video-tool/src/components/RunningStatus.tsx`锛夛細涓烘笎杩涘紡鑻辨枃鍖栨彁渚涙渶灏忓叡鐢?helper锛屽苟璁?`RunningStatus` 鍦ㄨ嫳鏂囨ā寮忎笅鏄剧ず鑻辨枃 inline 鐘舵€併€佸叧闂腑鏂囧墽鍦鸿疆鎾紝閬垮厤澶勭悊涓姸鎬佸啀娆℃帀鍥炰腑鏂囥€?

### v0.101 鈥?2026-04-22

**楂樼骇鍒剁墖鍒嗛暅瑙嗛璺ㄩ」鐩巻鍙插綊浣?*

**Production Wizard / Storyboard Video Versions:**
- **[api] 淇濆瓨/鍔犺浇椤圭洰鏃朵笉鍐嶅彧鍋氣€滈敊椤圭洰鐗堟湰娓呯悊鈥濓紝鑰屾槸鍏堝垽鏂瘡鏉″垎闀滆棰戠殑鐪熷疄 owner 鍐嶅綊浣?*锛坄h5-video-tool-api/src/routes/productionPersist.ts`锛夛細鍚庣鐜板湪浼氫紭鍏堢粨鍚?`batchJobId`銆乣sourceProjectId / sourceShotIndex`锛屼互鍙婅法椤圭洰鍚?`version.id` 鐨勫敮涓€鍛戒腑缁撴灉锛屽垽鏂鐗堟湰鐪熸灞炰簬鍝釜椤圭洰銆佸摢涓暅澶淬€?
- **[api] 閿欐寕鍒板埆鐨勯」鐩?闀滃ご涓嬬殑鐗堟湰浼氳嚜鍔ㄥ啓鍥炲搴?owner shot 鐨勫巻鍙插垪琛?*锛坄h5-video-tool-api/src/routes/productionPersist.ts`锛夛細鍙湁褰撶洰鏍囬」鐩拰鐩爣闀滃ご閮藉瓨鍦ㄦ椂锛岀増鏈墠浼氫粠閿欒浣嶇疆绉昏蛋锛涜繖鏍蜂慨澶嶇殑鏄€滃綊浣嶁€濓紝涓嶆槸鈥滃垹鍘嗗彶鈥濄€?
- **[api] 褰掍綅鍚庣殑椤圭洰鏂囦欢浼氬悓姝ヨ惤鐩橈紝浣嗕笉浼氫吉閫犵敤鎴风紪杈戞椂闂?*锛坄h5-video-tool-api/src/routes/productionPersist.ts`锛夛細琚慨姝ｅ埌鐨勭洰鏍囬」鐩細涓€璧锋寔涔呭寲锛屼晶杈归」鐩垪琛ㄧ殑 `updatedAt` 涓嶄細鍥犱负绯荤粺鑷慨澶嶈€岃璇埛鏂般€?

### v0.100 鈥?2026-04-22

**楂樼骇鍒剁墖鍒嗛暅瑙嗛椤圭洰褰掑睘闅旂涓庤剰鐗堟湰娓呯悊**

**Production Wizard / Storyboard Video Versions:**
- **[frontend] 鏈湴楂樼骇鍒剁墖鑽夌寮€濮嬭褰曟墍灞為」鐩?id锛屽彧鍏佽鍚岄」鐩洖鐏屽垎闀滆棰戠増鏈?*锛坄h5-video-tool/src/pages/ProductionWizard.tsx`, `h5-video-tool/src/studio/productionWizardStorage.ts`锛夛細淇涔嬪墠鍏ㄥ眬鍗曚唤 localStorage 鑽夌鎸?`shotIndex` 鐩存帴 merge锛屽鑷?A 椤圭洰鐨勫垎闀滆棰戣甯﹁繘 B 椤圭洰鐨勯棶棰樸€?
- **[frontend] 椤圭洰鍔犺浇鏃朵細鎸夌増鏈綊灞炲拰 batch-job 褰掑睘娓呯悊閿欓」鐩棰戠増鏈?*锛坄h5-video-tool/src/pages/ProductionWizard.tsx`, `h5-video-tool/src/studio/productionTypes.ts`, `h5-video-tool/src/studio/productionWizardStorage.ts`锛夛細鍒嗛暅鏃堕棿绾跨幇鍦ㄤ細浼樺厛淇濈暀灞炰簬褰撳墠 `projectId + shotIndex` 鐨勭増鏈紝鎶婃槑鏄炬潵鑷叾浠栭」鐩殑 batch-job 瑙嗛鍜屾棫缂撳瓨鐗堟湰鎸″湪鍏ュ彛涔嬪銆?
- **[frontend+api] 鏂扮敓鎴愮殑瑙嗛鐗堟湰浼氬啓鍏?`sourceProjectId / sourceShotIndex / batchJobId`锛屾湇鍔＄淇濆瓨涓庡姞杞芥椂涔熶細鍋氬綊灞炴牎楠?*锛坄h5-video-tool/src/pages/ProductionWizard.tsx`, `h5-video-tool-api/src/services/batchJobsQueue.ts`, `h5-video-tool-api/src/routes/productionPersist.ts`锛夛細鍗充娇鏃у鎴风鎴栨湰鍦拌剰鐘舵€佸啀娆℃妸閿欑増鏈甫涓婃潵锛屽悗绔篃浼氬敖閲忓湪鎸佷箙鍖栧墠鎷︿綇锛屼笉鍐嶇户缁薄鏌撻」鐩?JSON銆?

### v0.99 鈥?2026-04-22

**楂樼骇鍒剁墖 / 鍓緫 Agent / 瑙嗛鍒嗗彂涓婚摼璺ˉ榻愯瑷€璺熼殢**

**Core Reply Locale / i18n Follow-up:**
- **[frontend+api] 鏂板 `replyLocale` 妫€娴嬩笌閫忎紶閾捐矾**锛坄h5-video-tool/src/i18n/replyLocale.ts`, `h5-video-tool-api/src/services/replyLocale.ts`, `h5-video-tool/src/api/studio.ts`, `h5-video-tool/src/api/editor.ts`, `h5-video-tool/src/api/editorCreative.ts`锛夛細涓夋潯涓婚摼璺幇鍦ㄤ細浼樺厛鏍规嵁鏈疆鐢ㄦ埛杈撳叆鏂囨湰鍒ゆ柇鍥炲璇█锛屽苟浠?`contentLocale` 浣滀负鍏滃簳锛屼笉鍐嶅彧鐪嬬晫闈㈣瑷€銆?
- **[frontend] 楂樼骇鍒剁墖璇锋眰寮€濮嬫樉寮忔惡甯?`replyLocale`**锛坄h5-video-tool/src/pages/ProductionWizard.tsx`, `h5-video-tool/src/i18n/locale.ts`锛夛細鍓ф湰澶х翰銆佸埗鐗囨竻鍗曘€佸垎闀滆〃銆佽鑹插弽瑙ｆ瀽銆侀鏍煎弽瑙ｆ瀽鍜屾彁绀鸿瘝缁勮閮戒細鎸夊綋鍓嶈緭鍏ヨ瑷€璇锋眰缁撴灉锛屽悓鏃朵慨澶?`contentLocale` 鎸佷箙鍖栬鍙栭€昏緫锛岄伩鍏嶅唴瀹硅瑷€琚?UI 璇█寮哄埗瑕嗙洊銆?
- **[api] 楂樼骇鍒剁墖璺敱灞傝ˉ榻愮粨鏋滄湰鍦板寲**锛坄h5-video-tool-api/src/routes/studio.ts`锛夛細鍦ㄤ笉鏀瑰姩搴曞眰 `studioPipeline.ts` 鐨勫墠鎻愪笅锛宍story-arc / production-design / storyboard-table / extract-* / assemble-prompts` 浼氭寜 `replyLocale` 瀵圭粨鏋勫寲缁撴灉鍋氬悗澶勭悊缈昏瘧锛岃鑻辨枃鐢ㄦ埛鑳藉厛璺戦€氭牳蹇冨墽鏈敓鎴愰摼璺€?
- **[frontend+api] 鍓緫 Agent 鑱婂ぉ涓?apply 涓婚摼璺紑濮嬭窡闅忕敤鎴疯瑷€**锛坄h5-video-tool/src/pages/EditorWorkbench.tsx`, `h5-video-tool-api/src/routes/editorAgent.ts`, `h5-video-tool-api/src/services/editorAgentChat.ts`, `h5-video-tool-api/src/services/editorAgentService.ts`, `h5-video-tool-api/src/services/editorCreativeBrief.ts`锛夛細鑱婂ぉ鍥炲銆侀粯璁?brief銆佸垱鎰忕瓥鐣ャ€佽繘搴︽枃妗堝拰鍓緫鎬荤粨鐜板湪閮戒細浼樺厛浣跨敤褰撳墠鐢ㄦ埛娑堟伅鐨勮瑷€銆?
- **[frontend+api] 瑙嗛鍒嗗彂 `DEFAULT` 璇█鏀逛负璺熼殢褰撳墠杈撳叆鍐呭**锛坄h5-video-tool/src/pages/TabDistribute.tsx`, `h5-video-tool-api/src/routes/prompt.ts`锛夛細鍒嗗彂鏂囨榛樿璇█涓嶅啀纭紪鐮佷负 `EN`锛岃€屾槸鏍规嵁褰撳墠 caption / hashtags / 鍘熷杈撳叆鑷姩鍒ゆ柇涓嫳鏂囥€?

### v0.98 鈥?2026-04-22

**楂樼骇鍒剁墖鍒嗛暅鐘舵€佷笌宸茬敓鎴愯棰戝彛寰勯噸鏂版敹鍙?*

**Production Wizard / Storyboard Status:**
- **[frontend] 鍒嗛暅鏉°€佸彸渚х敓鎴愭搷浣滃尯銆侀瑙堥潰鏉跨粺涓€鏀规垚鈥滅湡瀹炶棰戜紭鍏堬紝鏃?pending submitId 鍙綔鏃犺棰戝厹搴曗€?*锛坄h5-video-tool/src/studio/steps/StepStoryboardShotStrip.tsx`, `h5-video-tool/src/studio/steps/StepStoryboardGenerateActions.tsx`, `h5-video-tool/src/studio/steps/StepStoryboardPreviewPanel.tsx`, `h5-video-tool/src/studio/steps/StepStoryboardWorkspace.tsx`, `h5-video-tool/src/studio/productionTypes.ts`锛夛細褰撻暅澶村凡缁忔湁鍙挱鏀捐棰戞椂锛屼笉鍐嶅洜涓哄巻鍙叉畫鐣欑殑 `pendingVideoSubmitId` 琚鏄剧ず鎴愨€滅敓鎴愪腑鈥濓紝瀵煎嚭椤典笌鍒嗛暅椤靛鍚屼竴闀滃ご鐨勭姸鎬佸彛寰勯噸鏂颁竴鑷淬€?
- **[frontend] 椤圭洰鍔犺浇鍚庝細鎸夊綋鍓?batch-jobs 鑷姩娓呯悊澶辨晥鐨?`pendingVideoSubmitId`**锛坄h5-video-tool/src/pages/ProductionWizard.tsx`锛夛細濡傛灉鍚庡彴宸茬粡鍒ゅ畾浠诲姟瀹屾垚/澶辫触/鍙栨秷锛屾垨璇ラ暅澶村凡缁忔湁鐪熷疄瑙嗛锛屽墠绔細涓诲姩鎶婃棫 submitId 娓呮帀锛屽苟瑙﹀彂涓€娆℃湇鍔″櫒鍥炲啓锛岄伩鍏嶅埛鏂板悗鏃х姸鎬佸啀娆″娲汇€?
- **[frontend] 鏈嶅姟绔」鐩笌鏈湴缂撳瓨鍚堝苟鏃讹紝涓嶅啀鎶娾€滃凡鏈夎棰戦暅澶粹€濈殑鏈湴鏃?submitId 鍥炵亴鍒版渶鏂伴」鐩?*锛坄h5-video-tool/src/studio/productionWizardStorage.ts`锛夛細淇鍒锋柊/閲嶈繘楂樼骇鍒剁墖鍚庯紝宸插畬鎴愰暅澶村張琚敊璇爣鎴愬悗鍙扮敓鎴愪腑鐨勬牴鍥犮€?

### v0.97 鈥?2026-04-22

**鍓緫 Agent 璁板繂闈㈡澘涓庡彲鎺т慨姝ｄ笂绾?*

**Editor Agent / Memory / Controls:**
- **[frontend] 鍙充晶 Agent 闈㈡澘鏂板 `Agent 璁板繂` 鍖哄潡**锛坄h5-video-tool/src/editor/components/AgentMemoryPanel.tsx`, `h5-video-tool/src/editor/components/AgentPanel.tsx`, `h5-video-tool/src/pages/EditorWorkbench.tsx`锛夛細鐜板湪浼氱洿鎺ュ睍绀哄綋鍓嶉」鐩矇娣€鍑虹殑鍋忓ソ銆佽礋鍚戝亸濂姐€佺ǔ瀹氫簨瀹炪€佸紑鏀鹃棶棰橈紝浠ュ強璺ㄩ」鐩鐢ㄧ殑鐢ㄦ埛绾ф矡閫氱敾鍍忥紝甯傚満鍚屽鍜屽壀杈戝笀閮借兘鐪嬪埌绯荤粺鈥滆浣忎簡浠€涔堚€濄€?
- **[frontend+api] 鏀寔鎵嬪姩鈥滆浣忚繖涓亸濂?/ 涓嶈鍐嶈繖鏍峰仛鈥?*锛坄h5-video-tool/src/api/editorMemory.ts`, `h5-video-tool-api/src/routes/editorAgent.ts`, `h5-video-tool-api/src/services/editorMemoryControls.ts`锛夛細鐢ㄦ埛鍙互鎶婂綋鍓嶈緭鍏ヨ崏绋跨洿鎺ユ矇娣€涓洪」鐩蹇嗭紝涓嶇敤鍐嶇瓑澶氳疆瀵硅瘽鎵嶈绯荤粺瀛︿細銆?
- **[frontend+api] 鏀寔鍒犻櫎椤圭洰璁板繂椤瑰拰鍑忓急鐢ㄦ埛鐢诲儚缁村害**锛坄h5-video-tool/src/editor/components/AgentMemoryPanel.tsx`, `h5-video-tool-api/tests/editorMemoryControls.test.ts`, `h5-video-tool/tests/agentMemoryPanel.test.tsx`锛夛細閿欒鐨勫亸濂藉彲浠ュ綋鍦哄垹闄わ紝杩囧己鐨勬矡閫氱敾鍍忎篃鑳介檷鎴愭洿寮辨彁绀猴紝閬垮厤閿欒闀挎湡姹℃煋鍚庣画鍓緫銆?

### v0.96 鈥?2026-04-22

**鍓緫 Agent 璁板繂鍘嬬缉涓庝笂涓嬫枃娉ㄥ叆钀藉湴**

**Editor Agent / Memory / Prompt Assembly:**
- **[api] 鏂板 `editorMemoryCompression` 鍘嬬缉鏈嶅姟**锛坄h5-video-tool-api/src/services/editorMemoryCompression.ts`, `h5-video-tool-api/tests/editorMemoryCompression.test.ts`锛夛細鍚庣鐜板湪浼氭妸椤圭洰璁板繂鎷嗘垚绋冲畾浜嬪疄銆佸亸濂姐€佽礋鍚戝亸濂姐€佸紑鏀鹃棶棰樸€佸喅绛栬褰曞拰鏈€杩?10 杞師濮嬪璇濓紝骞舵妸浣庣疆淇″害鐢ㄦ埛鐢诲儚闄嶇骇鎴?weak hints銆?
- **[api] 鍓緫 Agent 鎻愮ず璇嶅紑濮嬫敞鍏ヨ蹇嗕笂涓嬫枃**锛坄h5-video-tool-api/src/services/editorAgentService.ts`锛夛細鍦?Plan 闃舵浼氭妸椤圭洰璁板繂鍧楀拰鐢ㄦ埛绾ф矡閫氱敾鍍忓潡鎻掑叆鍒?creative brief 涔嬪悗銆佸綋鍓嶆椂闂磋酱涔嬪墠锛屽苟鏄庣‘鈥滃綋鍓嶇敤鎴疯姹備笌鏈€杩戞槑纭寚浠ら珮浜庡巻鍙茶蹇嗏€濄€?
- **[api] `apply` 閾捐矾寮€濮嬮€忎紶 `projectMemory`**锛坄h5-video-tool-api/src/routes/editorAgent.ts`锛夛細鍓嶇褰撳墠椤圭洰閲屽凡缁忔矇娣€鐨勮蹇嗕細鐪熸杩涘叆鏈鍓緫璇锋眰锛屼笉鍐嶅彧淇濆瓨鍦ㄥ伐绋?JSON 閲岃€屾病鏈夊弬涓庢ā鍨嬫帹鐞嗐€?

### v0.95 鈥?2026-04-22

**瑙嗛鍒嗗彂璐﹀彿鏀寔鐩磋揪涓婚〉閾炬帴**

**Feature / UX Upgrade:**
- **[api] GeeLark 璐﹀彿閰嶇疆涓庢壒娆＄粨鏋滃紑濮嬮€忎紶 `profileUrl`**锛坄h5-video-tool-api/src/services/geelark.ts`锛夛細`/api/geelark/accounts` 鍜?`/api/geelark/publish` 鐜板湪閮戒細鎶婅处鍙烽厤缃腑鐨勪富椤靛湴鍧€涓€璧疯繑鍥烇紝鍓嶇鏃犻渶鍐嶈嚜琛岀寽娴?handle 鎴栨嫾鎺?TikTok 涓婚〉 URL銆?
- **[frontend] 鍒嗗彂璐﹀彿鍒楄〃涓庡彂甯冪粨鏋滃崱鏂板鈥滀富椤?Profile鈥濆叆鍙?*锛坄h5-video-tool/src/pages/TabDistribute.tsx` + `h5-video-tool/src/api/geelark.ts` + `h5-video-tool/src/utils/geelarkPublishBatch.ts` + `h5-video-tool/src/i18n/messages.ts`锛夛細鍙璐﹀彿閰嶇疆閲屽瓨鍦?`profileUrl`锛岀敤鎴峰氨鑳藉湪鍕鹃€夎处鍙锋椂鎴栨煡鐪嬫渶杩戜竴娆″彂甯冪粨鏋滄椂涓€閿墦寮€璇ヨ处鍙蜂富椤碉紝鑷鏌ョ湅 profile 淇℃伅銆?
- **[test] 鏂板 `profileUrl` 閫忎紶鍥炲綊娴嬭瘯**锛坄h5-video-tool-api/tests/geelarkAccounts.test.ts` + `h5-video-tool/tests/geelarkPublishBatch.test.ts`锛夛細瑕嗙洊璐﹀彿鍒楄〃鍜屸€滄彁浜や腑鈥濇壒娆￠瑙堥兘鑳戒繚鐣欎富椤甸摼鎺ワ紝閬垮厤鍚庣画鍙堟妸瀛楁涓㈠湪鍚庣鍒板墠绔殑閾捐矾涓€?

### v0.94 鈥?2026-04-22

**鍓緫 Agent 璁板繂绯荤粺 P0 棣栨壒钀藉湴**

**Editor Agent / Memory / Project Persistence:**
- **[api] 鏂板 `editorAgentMemory` 绫诲瀷灞備笌榛樿褰掍竴鍖?*锛坄h5-video-tool-api/src/types/editorAgentMemory.ts`, `h5-video-tool-api/tests/editorAgentMemorySchema.test.ts`锛夛細鍚庣鐜板湪鏈変簡椤圭洰璁板繂銆佺敤鎴风骇娌熼€氱敾鍍忋€佹憳瑕佸揩鐓х殑缁熶竴缁撴瀯锛屾棫椤圭洰缂哄け瀛楁鏃朵篃浼氳嚜鍔ㄨˉ榻愪负鍚堟硶 memory銆?
- **[api] 鏂板 `editorAgentMemoryStore` 瑙勫垯灞?*锛坄h5-video-tool-api/src/services/editorAgentMemoryStore.ts`, `h5-video-tool-api/tests/editorAgentMemoryStore.test.ts`锛夛細鏀寔鍘熷浜嬩欢杩藉姞銆佹渶杩?N 杞埅鏂€佺粨鏋勫寲鍋忓ソ娌夋穩锛屼互鍙婃妸 memory 涓庡壀杈戦」鐩?JSON 涓€璧疯鍐欍€?
- **[frontend+api] 鍓緫椤圭洰寮€濮嬮殢宸ョ▼淇濆瓨/鎵撳紑 `memory`**锛坄h5-video-tool/src/editor/hooks/useTimelineState.ts`, `h5-video-tool/src/api/editor.ts`, `h5-video-tool-api/src/routes/editorProjects.ts`锛夛細鍚屼竴涓」鐩噷鐨?Agent 瀵硅瘽鍜岀粨鏋勫寲璁板繂涓嶅啀鍙瓨鍦ㄩ〉闈㈠唴瀛橀噷锛岄」鐩噸鏂版墦寮€鏃跺彲浠ユ仮澶嶆渶杩戝璇濄€?
- **[api] 鏂板 `editorUserProfileService` 鐢ㄦ埛绾ф矡閫氱敾鍍忔湇鍔?*锛坄h5-video-tool-api/src/services/editorUserProfileService.ts`, `h5-video-tool-api/tests/editorUserProfileService.test.ts`锛夛細绯荤粺寮€濮嬫寜鏄惧紡琛ㄨ揪鎻愬彇鈥滅洿鎺ョ粰缁撴灉 / 鍏堢粰鏂规 / 涓嶈闀胯В閲娾€濈瓑娌熼€氫俊鍙凤紱閲嶅琛ㄨ揪浼氭彁楂?confidence锛屾渶杩戠煕鐩捐〃杈句細闄嶄綆鏃у亸濂界殑鏉冮噸銆?
- **[agent] 鑱婂ぉ涓庡壀杈戣姹傚紑濮嬭繑鍥炴渶鏂?`projectMemory` 骞跺閲忔洿鏂扮敤鎴风敾鍍?*锛坄h5-video-tool-api/src/routes/editorAgent.ts`, `h5-video-tool/src/pages/EditorWorkbench.tsx`, `h5-video-tool/src/api/editorCreative.ts`锛夛細Agent 姣忔鑱婂ぉ鎴栧壀杈戝悗锛屽墠绔兘浼氭嬁鍒版洿鏂板悗鐨勯」鐩蹇嗗苟鍥炲啓鍒板綋鍓嶅伐绋嬶紝涓轰笅涓€鎵逛笂涓嬫枃鍘嬬缉鍜岃蹇嗛潰鏉挎墦鍩虹銆?

### v0.93 鈥?2026-04-22

**GeeLark 鍒嗗彂浠ｇ悊瓒呮椂鑷姩鍥為€€**

**Bug Fix / Reliability:**
- **[api] GeeLark OpenAPI 璇锋眰鏂板鈥滀唬鐞嗕笉鍙揪鏃惰嚜鍔ㄧ洿杩為噸璇曗€?*锛坄h5-video-tool-api/src/services/geelark.ts`锛夛細褰?`GEELARK_HTTP_PROXY` 鎸囧悜鐨勪唬鐞嗚繛鎺ヨ秴鏃躲€佹嫆缁濊繛鎺ユ垨缃戠粶涓嶅彲杈炬椂锛屽悗绔細绔嬪埢鍥為€€涓虹洿杩?GeeLark锛岃€屼笉鏄妸鏁存鍙戝竷鍗″湪鈥滄彁浜や腑鈥濈洿鍒拌秴鏃跺け璐ャ€?
- **[test] 鏂板 GeeLark 浠ｇ悊杩炴帴瓒呮椂璇嗗埆鍥炲綊娴嬭瘯**锛坄h5-video-tool-api/tests/geelarkAccounts.test.ts`锛夛細瑕嗙洊鈥滈敊璇湴鍧€鍛戒腑褰撳墠浠ｇ悊 host/port 鏃舵墠瑙﹀彂鍥為€€鈥濈殑鍒ゆ柇锛岄伩鍏嶆妸鏅€?GeeLark 缃戠粶閿欒璇垽鎴愪唬鐞嗘晠闅溿€?
- **[ops] 浜戠娓呯悊璇厤鐨?`GEELARK_HTTP_PROXY`**锛堟湇鍔″櫒 `/home/ubuntu/qas-h5/api/.env` 涓?`/home/ubuntu/qas-h5/.env`锛夛細绉婚櫎涓嶅彲杈剧殑鍐呯綉浠ｇ悊閰嶇疆鍚庯紝鏈嶅姟鍣ㄦ湰鏈虹洿杩?GeeLark `taskHistory` 宸叉仮澶嶆甯搞€?

### v0.92 鈥?2026-04-22

**瑙嗛鍒嗗彂鎻愪氦鏈熻繘搴﹀彲瑙?*

**UX / Bug Fix:**
- **[frontend] 鐐瑰嚮鍙戝竷鍚庣珛鍗冲睍绀烘彁浜や腑鎵规鍗?*锛坄h5-video-tool/src/pages/TabDistribute.tsx` + `h5-video-tool/src/utils/geelarkPublishBatch.ts`锛夛細鍦?GeeLark 杩樻湭杩斿洖 `taskIds` 鍓嶏紝鍒嗗彂椤典細鍏堟寜宸查€夎处鍙锋樉绀衡€滄彁浜や腑鈥濈姸鎬侊紝涓嶅啀鍙墿鎸夐挳涓婄殑鈥滃彂甯冧腑...鈥濄€?
- **[frontend] 鍒嗗彂缁撴灉闈㈡澘鏂板鎻愪氦闃舵鎻愮ず涓庣姸鎬佹枃妗?*锛坄h5-video-tool/src/i18n/messages.ts`锛夛細鏂板鈥滄鍦ㄥ惎鍔ㄨ澶囥€佷笂浼犺棰戝苟鍒涘缓浠诲姟鈥濈瓑鎻愮ず锛屼互鍙?`鎻愪氦涓璥 鐘舵€佹爣绛撅紝鐢ㄦ埛鑳芥洿娓呮鍦板尯鍒嗏€滆姹傚皻鏈繑鍥炩€濅笌鈥滀换鍔″凡杩涘叆閫愯处鍙疯窡韪€濄€?
- **[test] 鎵规鐘舵€佹祴璇曟柊澧炴彁浜や腑棰勮瑕嗙洊**锛坄h5-video-tool/tests/geelarkPublishBatch.test.ts`锛夛細瑕嗙洊鎻愪氦鏈熸壒娆￠瑙堟瀯閫狅紝閬垮厤鍚庣画鍐嶆鍥為€€鎴愨€滅偣鍑诲悗瀹屽叏鏃犺繘搴﹂潰鏉库€濄€?

### v0.91 鈥?2026-04-22

**瑙嗛鍒嗗彂鍙戝竷鐘舵€佷笌缁撴灉椤靛唴鍙**

**Feature / UX Upgrade:**
- **[api] GeeLark 鍙戝竷鎺ュ彛杩斿洖鎵规绾ц处鍙蜂换鍔℃槧灏?*锛坄h5-video-tool-api/src/services/geelark.ts`锛夛細`/api/geelark/publish` 鐜板湪闄や簡 `taskIds` 涓?`planName`锛岃繕浼氬甫鍥?`batch.items[]`锛屾妸姣忎釜鎵€閫夎处鍙蜂笌瀵瑰簲 `taskId/envId` 缁戝畾璧锋潵锛屽墠绔笉鍐嶅彧鑳界洴浣忕涓€涓换鍔°€?
- **[api] 浠诲姟璇︽儏缁熶竴褰掍竴鍖栦负鍓嶇鍙洿鎺ユ覆鏌撶殑鏁版嵁缁撴瀯**锛坄h5-video-tool-api/src/services/geelark.ts`锛夛細`/api/geelark/task/:id` 鐜板湪浼氱粺涓€杈撳嚭 `statusText`銆乣failDesc`銆乣resultImages`銆乣logs` 鍜屽彲鐢ㄧ殑 `shareLink`锛岄伩鍏嶅墠绔户缁寽 GeeLark 鍘熷瀛楁銆?
- **[frontend] 鍒嗗彂椤垫敼涓洪〉鍐呮壒娆＄姸鎬侀潰鏉?*锛坄h5-video-tool/src/pages/TabDistribute.tsx` + `h5-video-tool/src/utils/geelarkPublishBatch.ts` + `h5-video-tool/src/api/geelark.ts`锛夛細鍙戝竷鍚庡綋鍓嶉〉浼氫繚鐣欐渶杩戜竴娆℃壒娆＄粨鏋滐紝閫愯处鍙锋樉绀烘彁浜ょ姸鎬併€佽繍琛屼腑/鎴愬姛/澶辫触銆佸け璐ュ師鍥犮€佹埅鍥惧拰杩斿洖閾炬帴锛屽苟瀵规湭缁撴潫浠诲姟鑷姩杞銆?
- **[frontend] 鍒嗗彂缁撴灉鏂囨琛ラ綈涓嫳鏂囧３灞?*锛坄h5-video-tool/src/i18n/messages.ts`锛夛細鏂板鈥滄渶杩戜竴娆″彂甯冪粨鏋溿€佸埛鏂颁腑銆佹彁浜ゅけ璐ャ€佹渶杩戞棩蹇椻€濈瓑鍏抽敭鐘舵€佹枃妗堬紝閬垮厤鏂扮粨鏋滈潰鏉垮嚭鐜拌８ key 鎴栦腑鏂?鑻辨枃鏂銆?
- **[test] 鏂板 GeeLark 鎵规鐘舵€佸墠鍚庣鍥炲綊娴嬭瘯**锛坄h5-video-tool-api/tests/geelarkAccounts.test.ts` + `h5-video-tool/tests/geelarkPublishBatch.test.ts`锛夛細瑕嗙洊鎵规鏄犲皠銆佷换鍔¤鎯呭綊涓€鍖栥€佸墠绔壒娆″垵濮嬪寲銆佽鎯呭悎骞朵笌寰呰疆璇换鍔＄瓫閫夛紝闃叉鍚庣画鍐嶆閫€鍥炲埌鈥滃彧璺熻釜绗竴涓?taskId鈥濄€?

### v0.90 鈥?2026-04-22

**鍓緫 Agent 璁板繂绯荤粺璁捐涓庡疄鏂借鍒掕ˉ榻?*

**Product Design / Planning:**
- **[docs] 鏂板鍓緫 Agent 璁板繂绯荤粺璁捐鏂囨。**锛坄docs/plans/2026-04-22-editor-agent-memory-system-design.md`锛夛細鏄庣‘椤圭洰绾ц蹇嗐€佺敤鎴风骇娌熼€氱敾鍍忋€佷笂涓嬫枃淇濈暀闀垮害銆佸帇缂╃瓥鐣ヤ笌鍛ㄦ湡鎬荤粨闂幆锛屾敹鏁涒€滈」鐩蹇嗙鍐呭锛岀敤鎴风敾鍍忕鍗忎綔鏂瑰紡锛屽懆鏈熸€荤粨绠″钩鍙颁紭鍖栤€濈殑涓昏璁°€?
- **[docs] 鏂板璁板繂绯荤粺瀹炴柦璁″垝**锛坄docs/plans/2026-04-22-editor-agent-memory-system-implementation-plan.md`锛夛細鎸?schema銆佹寔涔呭寲銆佸帇缂┿€佺敤鎴峰彲瑙佹帶鍒躲€佸懆鏈熸礊瀵熶簲涓柟鍚戞媶瑙ｅ悗缁惤鍦版楠わ紝鏂逛究鐩存帴鎺掓湡鍜岀爺鍙戞墽琛屻€?

### v0.89 鈥?2026-04-22

**璇█鍒囨崲鏀跺彛涓哄崟涓€涓嬫媺妗?*

**UX / i18n Simplification:**
- **[frontend] 璇█鍒囨崲鍣ㄦ敼涓哄崟涓€ dropdown锛屼粎淇濈暀 `绠€浣撲腑鏂嘸 / `English` 涓ら」**锛坄h5-video-tool/src/components/LocalePresetSwitcher.tsx`, `h5-video-tool/src/pages/Login.tsx`, `h5-video-tool/src/components/Layout.tsx`锛夛細鐧诲綍椤靛拰渚ц竟鏍忎笉鍐嶆樉绀哄 preset 鎸夐挳锛岀敤鎴峰彧鎸夎瑷€鍒囨崲锛屼笉闇€瑕佺悊瑙?`UI locale / content locale` 缁勫悎銆?
- **[frontend] 鑻辨枃閫夋嫨鑷姩鑱斿姩鍐呭璇█**锛坄h5-video-tool/src/i18n/LocaleContext.tsx`, `h5-video-tool/src/i18n/locale.ts`, `h5-video-tool/src/api/client.ts`锛夛細閫夋嫨 `English` 鍚庝細缁熶竴鍐欏叆 `uiLocale=en`銆乣contentLocale=en`锛屾棫鐨?`English UI + 涓枃鍐呭` 瀛樺偍涔熶細鍦ㄨ鍙栬姹傚ご鏃惰嚜鍔ㄥ綊涓€锛屼笉鍐嶆畫鐣欓殣褰㈡贩鍚堟ā寮忋€?
- **[test] locale 鍗忚鍥炲綊娴嬭瘯琛ュ厖璇█鏄犲皠瑕嗙洊**锛坄h5-video-tool/src/i18n/locale.test.ts`锛夛細鏂板鈥滀袱绉嶈瑷€閫夐」鏄犲皠鍒板浐瀹?ui/content locale 缁勫悎鈥濈殑鏂█锛岄伩鍏嶅悗缁張鎶婃贩鍚?preset 鏆撮湶鍥炲墠鍙般€?

### v0.88 鈥?2026-04-22

**Asset Library 鑻辨枃鐣岄潰琛ラ綈**

**Bug Fix / i18n Completion:**
- **[frontend] Asset Library 涓婚摼璺ˉ榻?locale 澹冲眰**锛坄h5-video-tool/src/pages/AssetLibraryPage/index.tsx`, `h5-video-tool/src/pages/AssetLibraryPage/AssetGallery.tsx`, `h5-video-tool/src/pages/AssetLibraryPage/AssetCard.tsx`, `h5-video-tool/src/pages/AssetLibraryPage/AssetDetailDrawer.tsx`锛夛細绱犳潗涓彴鏍囬銆乀ab銆佺瓫閫夈€佹枃浠跺す渚ф爮銆佹壒閲忔搷浣溿€佸崱鐗囨偓娴姩浣滃拰璇︽儏鎶藉眽鍏ㄩ儴鎺ュ叆 UI locale锛岃嫳鏂囨ā寮忎笅涓嶅啀鍑虹幇鏁撮〉涓枃鎿嶄綔鏂囨銆?
- **[frontend] 涓婁紶 / Drive / AI 鏍囩璇勫闈㈡澘鍚屾鍥介檯鍖?*锛坄h5-video-tool/src/pages/AssetLibraryPage/AssetUploadSheet.tsx`, `h5-video-tool/src/pages/AssetLibraryPage/AssetImportPanel.tsx`, `h5-video-tool/src/pages/AssetLibraryPage/AssetReviewQueue.tsx`, `h5-video-tool/src/pages/AssetLibraryPage/DriveBrowser.tsx`锛夛細涓婁紶绱犳潗銆佸鍏ヨ繘搴︺€丟oogle Drive 杩炴帴涓庣紦瀛樸€佸緟纭鏍囩瀹℃牳鍏ㄩ儴璺熼殢璇█妯″紡鍒囨崲锛岄伩鍏嶈嫳鏂囧悓浜嬭繘鍏ユ绾ч潰鏉垮悗鍙堥€€鍥炰腑鏂囥€?
- **[test] 鏂板 Asset Library locale helper 鍥炲綊娴嬭瘯**锛坄h5-video-tool/src/pages/AssetLibraryPage/localize.ts`, `h5-video-tool/src/pages/AssetLibraryPage/localize.test.ts`锛夛細閿佸畾鍒嗙被銆佺瓫閫夊€笺€乀ab 鍜屾爣绛?key 鐨勪腑鑻辨槧灏勶紝鍑忓皯鍚庣画缁х画鎵╅〉闈㈡椂鐨勫洖閫€椋庨櫓銆?

### v0.87 鈥?2026-04-22

**鍓緫 Agent TikTok 鍒涙剰 Brief 棣栫増钀藉湴**

**Feature / Workflow / Build Stability:**
- **[api] 鏂板 `editorCreativeBrief` 绾嚱鏁板眰涓庨粯璁?brief prompt**锛坄h5-video-tool-api/src/services/editorCreativeBrief.ts`, `h5-video-tool-api/src/routes/editorAgent.ts`, `h5-video-tool-api/tests/editorCreativeBrief.test.ts`锛夛細鍚庣鐜板湪鏀寔鎺ユ敹缁撴瀯鍖?`creativeBrief`锛屽湪娌℃湁鑷劧璇█鎸囦护鏃惰嚜鍔ㄧ敓鎴愰粯璁?TikTok 鍓緫闇€姹傦紝骞跺湪娴佸紡缁撴灉閲屽洖浼?`creativeStrategy`銆?
- **[frontend] 鍓緫鍣?Agent 闈㈡澘鍗囩骇涓?TikTok 鍒涙剰宸ヤ綔鍙?*锛坄h5-video-tool/src/editor/components/AgentPanel.tsx`, `h5-video-tool/src/pages/EditorWorkbench.tsx`, `h5-video-tool/src/api/editorCreative.ts`, `h5-video-tool/src/editor/utils/editorCreativeBrief.ts`, `h5-video-tool/tests/editorCreativeBrief.test.ts`锛夛細鏂板 TikTok 鍐呭 / 涔伴噺鍙屾ā寮忋€佸崠鐐逛笌 CTA 琛ㄥ崟銆佹帹鑽?Hook 绛栫暐鍗★紱甯?brief 鐨勮姹備細鐩存帴杩涘叆鍓緫閾捐矾锛屼笉鍐嶈璇垽鎴愯亰澶┿€?
- **[frontend] 绱犳潗搴撴湰鍦板寲瀵煎嚭琛ラ綈锛屾仮澶嶇敓浜ф瀯寤?*锛坄h5-video-tool/src/pages/AssetLibraryPage/localize.ts`锛夛細琛ュ叏鍒嗙被銆佺瓫閫夈€乀ab 鐨勬湰鍦板寲鍑芥暟涓庣被鍨嬶紝淇鍓嶇 `npm run build` 琚?Asset Library 缂哄け瀵煎嚭闃绘柇鐨勯棶棰樸€?

### v0.86 鈥?2026-04-22

**楂樼骇鍒剁墖绱犳潗搴撳弬鑰冨浘棰勮淇**

**Bug Fix:**
- **[frontend] 鍙傝€冨浘绱犳潗閫夋嫨寮瑰眰缂╃暐鍥剧粺涓€鏀硅蛋鍙椾繚鎶ょ殑绱犳潗鏂囦欢 URL**锛坄h5-video-tool/src/studio/steps/StepInput.tsx`锛夛細涓嶅啀鐩存帴淇′换鍒楄〃鎺ュ彛杩斿洖鐨?`thumbnail_url / file_url`锛岃€屾槸缁熶竴浣跨敤甯?token 鐨勭礌鏉愯闂湴鍧€锛屼慨澶嶁€滀粠绱犳潗搴撻€夋嫨鈥濆脊灞傞噷鍥剧墖鍏ㄩ儴瑁傚浘銆佷絾绱犳潗瀹為檯瀛樺湪鐨勯棶棰樸€?
- **[test] 鏂板棰勮 URL 閫夋嫨鍥炲綊娴嬭瘯**锛坄h5-video-tool/tests/stepInput.test.tsx`锛夛細閿佸畾绱犳潗鍗＄墖棰勮蹇呴』璧板彈淇濇姢鐨勬枃浠?URL锛岄伩鍏嶅悗缁啀娆″洖閫€鍒拌８鍦板潃銆?

### v0.85 鈥?2026-04-22

**瑙嗛鍒嗗彂鏂囨/鏍囩纭繃婊ゆ敹鍙?*

**Bug Fix / Quality Upgrade:**
- **[api] 鍒嗗彂鏂囨缁撴灉鏂板鍐呴儴宸ョ▼璇嶇‖杩囨护涓庤矾寰勬畫鐣欐竻娲?*锛坄h5-video-tool-api/src/services/promptPolish.ts`锛夛細瀵?`output`銆乣admin`銆乣dreamina`銆乣鏈嶅姟绔垚鐗嘸 绛夌郴缁熻瘝鍋氱粺涓€榛戝悕鍗曡繃婊わ紝骞跺湪 fallback 涓庢彁绀轰笂涓嬫枃閲屽悓姝ュ幓鑴忥紝閬垮厤鍐呴儴璺緞/宸ョ▼璇嶇户缁贩鍏ュ彂甯冪粨鏋溿€?
- **[api] caption 涓?hashtags 缁撴灉姝ｅ紡鎷嗗垎**锛坄h5-video-tool-api/src/services/promptPolish.ts`锛夛細鏂囨缁撴灉鐜板湪浼氫富鍔ㄥ墺绂?caption 鍐呰仈 hashtag锛屽苟鎶婂彲鐢ㄦ爣绛惧苟鍥?hashtag 缁勫悎锛屽悓鏃剁户缁繚鐣?TikTok 娴侀噺鏍囩涓庡唴瀹规爣绛撅紝鍑忓皯鈥滄枃妗堥噷甯︽暣涓叉爣绛俱€佹爣绛炬閲屽張鏄剰璇嶁€濈殑鎬紓缁撴灉銆?
- **[test] 鏂板绯荤粺璇嶆薄鏌撳洖褰掓祴璇?*锛坄h5-video-tool-api/tests/promptCaptionRules.test.ts`锛夛細瑕嗙洊鍐呴儴璇嶆爣绛捐繃婊ゃ€乧aption 鍐呰仈鏍囩鍓ョ銆佽矾寰勬畫鐣欐竻娲楋紝闃叉鍚庣画妯″瀷鎴?prompt 鍙樺姩鎶婂悓绫昏剰璇嶅啀娆″甫鍥炲垎鍙戦〉銆?

### v0.84 鈥?2026-04-22

**楂樼骇鍒剁墖鍙傝€冨浘鍙嶈В鏋愭敮鎸佷粠绱犳潗搴撶洿鎺ラ€夊浘**

**Feature / Usability:**
- **[frontend] Step 0 澧炲姞鈥滀粠绱犳潗搴撻€夋嫨鈥濆叆鍙?*锛坄h5-video-tool/src/studio/steps/StepInput.tsx`锛夛細楂樼骇鍒剁墖杈撳叆椤电幇鍦ㄩ櫎浜嗘湰鍦颁笂浼狅紝杩樿兘鐩存帴鎵撳紑绱犳潗搴撳浘鐗囬€夋嫨灞傦紝涓嶇敤鍐嶅厛鍘荤礌鏉愬簱涓嬭浇鍐嶅洖浼犮€?
- **[frontend] 閫変腑绱犳潗鍚庡鐢ㄦ棦鏈夊弬鑰冨浘澶勭悊閾捐矾**锛坄h5-video-tool/src/studio/steps/StepInput.tsx`锛夛細绱犳潗搴撳浘鐗囦細琚浆鎴?`File` 鍚庝氦缁欑幇鏈?`onStyleRefFileChange`锛岀户缁蛋棰勮銆乣production/images` 涓婁紶鍜?`/api/studio/extract-style-reference` 鍙嶈В鏋愶紝涓嶆柊澧炵浜屽閫昏緫銆?
- **[test] 鏂板 StepInput 鍏ュ彛鍥炲綊娴嬭瘯**锛坄h5-video-tool/tests/stepInput.test.tsx`锛夛細閿佸畾鈥滀粠绱犳潗搴撻€夋嫨鈥濆叆鍙ｅ瓨鍦紝閬垮厤鍚庣画 UI 鍥為€€銆?

### v0.83 鈥?2026-04-22

- 鍓緫 Agent 浜у搧瑙勫垝鍗囩骇锛氭柊澧?TikTok 娓告垙 `Campaign Creative Agent` 璁捐鏂规锛屾矇娣€甯傚満浜轰紭鍏堢殑 PRD銆丳0/P1 鎺掓湡涓庝俊鎭灦鏋勶紝鏄庣‘浠庘€滃壀杈戞墽琛屽姪鎵嬧€濆崌绾т负鈥渂rief 鍒板鐗堟湰涔伴噺/鍐呭绱犳潗宸ュ巶鈥濈殑浜у搧鏂瑰悜銆?

### v0.82 鈥?2026-04-21

**瑙嗛鍒嗗彂鏂囨璐ㄩ噺鍗囩骇涓鸿棰戞劅鐭ョ敓鎴?*

**Feature / Quality Upgrade:**
- **[api] 鍒嗗彂鏂囨鐢熸垚鏀逛负浼樺厛缁撳悎瑙嗛鍏抽敭甯с€佽处鍙蜂笂涓嬫枃鍜?Studio 鍒涙剰**锛坄h5-video-tool-api/src/services/promptPolish.ts` + `h5-video-tool-api/src/routes/prompt.ts`锛夛細`/api/prompt/generate-caption` 鐜板湪浼氫紭鍏堣В鏋愬垎鍙戣棰戞湰韬紝鎶藉彇鍏抽敭甯у苟缁撳悎鎵€閫夊钩鍙?鍦板尯璐﹀彿璇鐢熸垚鍙戝竷鏂囨锛屼笉鍐嶄富瑕佷緷璧栫敓浜?prompt 鐩存帹鍙戝竷鏂囨銆?
- **[api] 鏂板鍒嗗彂鏂囨璐ㄩ噺绛涢€変笌鏍囩缁撴瀯鍖栬鍒?*锛坄h5-video-tool-api/src/services/promptPolish.ts`锛夛細琛ュ叆浣庤川閲?caption 璇嗗埆銆佸€欓€夋墦鍒嗐€乀ikTok 鏍囩鍘嬬缉涓庡幓鍣€昏緫锛屼紭鍏堜繚鐣?hook-first銆佸崟璇█銆?-6 涓洿鍍忕湡瀹炲彂甯栫殑鏍囩缁勫悎锛岄伩鍏嶅啀鍥為€€鎴愬崐涓崐鑻辨ā鏉垮彞銆?
- **[frontend] 鍒嗗彂椤垫枃妗堣姹傝ˉ榻愯棰戜笌璐﹀彿涓婁笅鏂囷紝骞朵紭鍖栧彂甯冩彁绀烘枃妗?*锛坄h5-video-tool/src/api/promptPolish.ts` + `h5-video-tool/src/pages/TabDistribute.tsx` + `h5-video-tool/src/i18n/messages.ts`锛夛細鍓嶇鐜板湪浼氭妸 `videoPath/videoUrl` 涓庡凡閫夎处鍙蜂俊鎭竴骞朵紶缁欏悗绔紱椤甸潰鎻愮ず鏀逛负寮鸿皟鈥? 绉掗挬瀛?+ 鍙戝竷鍗崇敤鏍囩鈥濓紝鍗犱綅鏂囨涔熸洿璐磋繎 TikTok 鐖嗘鍐呭璇劅銆?
- **[test] 鏂板鍒嗗彂鏂囨璐ㄩ噺涓庤姹備綋鍥炲綊娴嬭瘯**锛坄h5-video-tool-api/tests/promptCaptionRules.test.ts` + `h5-video-tool/tests/promptPolish.test.ts`锛夛細瑕嗙洊浣庤川 fallback 璇嗗埆銆佸€欓€変紭閫夈€佹爣绛剧粨鏋勫寲锛屼互鍙婂墠绔姹備綋甯﹁棰?璐﹀彿涓婁笅鏂囷紝閬垮厤鍚庣画鍐嶆閫€鍥炲埌 prompt-only 鐢熸垚銆?

### v0.81 鈥?2026-04-21

**涓€閿垚鐗囨壒閲忎换鍔＄湅鏉挎仮澶嶅彲瑙?*

**Bug Fix:**
- **[api] QuickFilm 鍒涘缓 batch job 鏃惰ˉ榻?`username` 褰掑睘**锛坄h5-video-tool-api/src/routes/quickfilm.ts`锛夛細`/api/quickfilm/:jobId/confirm` 鐜板湪鏃犺鏄珛鍗虫彁浜ょ殑绗竴闀滐紝杩樻槸鍚庣画 `awaiting_submit` 鎺掗槦闀滃ご锛岄兘浼氭妸褰撳墠鐧诲綍鐢ㄦ埛鍐欏叆 batch job銆傝繖鏍峰巻鍙查〉鐨?`GET /api/batch-jobs` 鍜?SSE `/api/batch-jobs/stream` 鎵嶈兘姝ｇ‘鎸夌敤鎴疯繑鍥炰换鍔★紝涓嶅啀鍑虹幇鈥滃嵆姊﹀悗鍙板凡鍦ㄧ敓鎴愶紝浣嗘壒閲忎换鍔＄湅鏉夸负绌衡€濈殑閿欎綅銆?
- **[test] 鏂板 QuickFilm batch job 褰掑睘鍥炲綊娴嬭瘯**锛坄h5-video-tool-api/tests/quickfilmBatchJobs.test.ts`锛夛細瑕嗙洊 `pending` 涓?`awaiting_submit` 涓ょ被浠诲姟閮藉繀椤讳繚鐣?`username`锛岄槻姝㈠悗缁啀娆″嚭鐜颁换鍔″凡鍏ラ槦浣嗙湅鏉夸笉鍙鐨勯棶棰樸€?

### v0.80 鈥?2026-04-21

**鑻辨枃澹冲眰琛ラ綈涓庤瑷€鍒囨崲鍣ㄩ噸璁捐**

**Feature / UX Polish:**
- **[frontend] 瑙嗛鍒嗗彂椤佃ˉ榻愯嫳鏂囩晫闈㈠３灞備笌鎶ュ憡寮圭獥鍥介檯鍖?*锛坄h5-video-tool/src/pages/TabDistribute.tsx` + `h5-video-tool/src/i18n/messages.ts`锛夛細姝ラ鏍囬銆佽处鍙风瓫閫夈€佹枃妗堢敓鎴愩€佸彂甯冩寜閽€佽繍琛屾姤鍛婁笌绌虹姸鎬佺粺涓€鎺ュ叆 i18n锛岃嫳鏂?UI 涓嬩笉鍐嶅嚭鐜板ぇ娈典腑鏂囨搷浣滄枃妗堛€?
- **[frontend] 涓€閿垚鐗囧垎闀滅‘璁ら〉缁х画鏀跺彛鑻辨枃娈嬬暀**锛坄h5-video-tool/src/pages/QuickFilm.tsx`锛夛細琛ラ綈 `AI鐢熸垚 / 宸插尮閰嶇礌鏉?/ 鎵嬪姩鍖归厤绱犳潗 / 瑙掕壊 / 鍦烘櫙 / 閫夋嫨 / 鍙栨秷` 绛夐珮棰戞枃妗堬紝骞剁粺涓€鍒嗛暅鏃堕暱灞曠ず锛屽噺灏戣嫳鏂囧悓浜嬪湪纭椤电殑鐞嗚В鏂眰銆?
- **[frontend] 璇█鍒囨崲鍏ュ彛鏀逛负绱у噾妯″紡鍒囨崲鍣?*锛坄h5-video-tool/src/components/LocalePresetSwitcher.tsx` + `h5-video-tool/src/components/Layout.tsx` + `h5-video-tool/src/pages/Login.tsx`锛夛細鍘绘帀鈥滈璁炬寜閽?+ 鍘熺敓 select鈥濆弻灞傛帶浠讹紝鏀规垚鍗曚竴鎷ㄧ墖寮忚瑷€妯″紡鍒囨崲锛岀櫥褰曢〉涓庝富绔欎晶杈规爮瑙嗚淇濇寔涓€鑷淬€?
- **[test] locale 鏂囨鍥炲綊娴嬭瘯鍚屾瑕嗙洊鏂板垏鎹㈠櫒鏂囨**锛坄h5-video-tool/src/i18n/locale.test.ts`锛夛細纭繚璇█妯″紡鏍囬鍜屽叧閿嫳鏂囨枃妗堝湪鍚庣画鏀瑰姩涓笉浼氬洖閫€銆?

### v0.79 鈥?2026-04-21

**瑙嗛鍒嗗彂鏂囨閴存潈淇涓?TikTok 鏍囩鏀剁揣**

**Feature / Bug Fix:**
- **[frontend] 鍒嗗彂椤垫枃妗堢敓鎴?缈昏瘧璇锋眰琛ラ綈 JWT 閴存潈**锛坄h5-video-tool/src/api/promptPolish.ts`锛夛細`/api/prompt/expand-short-drama`銆乣/api/prompt/polish`銆乣/api/prompt/generate-caption`銆乣/api/prompt/translate-caption` 缁熶竴鑷姩鎼哄甫 `Authorization: Bearer gobs_token`锛屼慨澶嶅垎鍙戦〉鐐瑰嚮鐢熸垚鏂囨鏃舵姤鈥滄湭鎻愪緵璁よ瘉 token鈥濈殑闂銆?
- **[api] TikTok 鏂囨鏍囩鍥為€€閫昏緫鏀剁揣涓烘洿閫傚悎鍒嗗彂鐨勭粍鍚?*锛坄h5-video-tool-api/src/services/promptPolish.ts`锛夛細hashtags 鐜板湪浼氬幓閲嶃€佺Щ闄?`#shorts`銆佹帶鍒跺湪 6 涓互鍐咃紝骞剁粺涓€琛ラ綈鏇撮€傚悎 TikTok 鐨勬祦閲忔爣绛撅紱fallback 鏂囨鏀逛负 hook-first 鐨勭煭鍙ラ鏍硷紝閬垮厤鎶婄敓浜?prompt 鐩磋创鍒板彂甯冮〉銆?
- **[test] 鏂板鍒嗗彂鏂囨閴存潈涓?TikTok 鏍囩瑙勫垯鍥炲綊娴嬭瘯**锛坄h5-video-tool/tests/promptPolish.test.ts` + `h5-video-tool-api/tests/promptCaptionRules.test.ts`锛夛細瑕嗙洊鍓嶇璇锋眰澶存惡甯?JWT銆佹爣绛惧綊涓€鍖栥€乫allback caption/hashtags 琛屼负锛岄伩鍏嶅悓绫婚棶棰樺洖褰掋€?

### v0.78 鈥?2026-04-21

**鏂囨。鍏ュ彛鏁寸悊涓庝笁绔悓姝ヨˉ榻?*

**Chore / Docs:**
- **[docs] 琛ラ綈缁熶竴鏂囨。鍏ュ彛**锛坄docs/DOCS-INDEX.md` + `docs/TASK-INDEX.md` + `docs/plans/README.md`锛夛細鏄庣‘ `rules / reviews / runs / plans` 鍥涚被鏂囨。鍒嗗伐锛岃鍚庣画浠诲姟鍏堢湅鍏ュ彛椤靛啀杩涘叿浣撴柟妗堬紝鍑忓皯鏂囨。鏁ｈ惤鍜岄噸澶嶇淮鎶ゃ€?
- **[docs] 閲嶈鏂规鏂囨。姝ｅ紡鍏ュ簱**锛坄docs/i18n-涓嫳鏂囧垏鎹㈣璁℃柟妗?v2.md` + `docs/plans/2026-04-21-distribute-caption-auth-design.md` + `docs/plans/2026-04-21-distribute-caption-auth.md` + `docs/plans/2026-04-21-i18n-phase0-phase1-implementation-plan.md`锛夛細鎶婂綋鍓嶆渶娲昏穬鐨?i18n 涓庡垎鍙戦壌鏉冩柟妗堟矇娣€涓哄彲妫€绱㈢殑闀挎湡鏂囨。璧勪骇銆?
- **[repo] 鏈湴鏁忔劅/涓€娆℃€ф枃浠跺姞鍏ュ拷鐣ヨ鍒?*锛坄.gitignore`锛夛細蹇界暐鏈湴鏈嶅姟鍣ㄦ帓闅滆剼鏈€佷复鏃?PPT 閰嶇疆鍜屽鍑轰骇鐗╋紝閬垮厤鏁忔劅淇℃伅涓庢祴璇曞瀮鍦剧户缁薄鏌撳伐浣滃尯銆?

### v0.77 鈥?2026-04-21

**涓嫳鏂囩晫闈㈠垏鎹?Phase 1 涓婄嚎**

**Feature / Bug Fix:**
- **[frontend] 鐧诲綍鍓嶅嵆鍙垏鎹㈢晫闈㈣瑷€涓庡唴瀹硅瑷€棰勮**锛坄h5-video-tool/src/pages/Login.tsx` + `h5-video-tool/src/components/LocalePresetSwitcher.tsx`锛夛細鐧诲綍椤垫柊澧炶瑷€鍒囨崲鍏ュ彛锛屾敮鎸?`涓枃鐣岄潰 + 涓枃鍐呭`銆乣English UI + 涓枃鍐呭`銆乣English UI + English Content` 涓夌缁勫悎锛岃嫳鏂囧悓浜嬫棤闇€鍏堢櫥褰曞啀鎵捐缃€?
- **[frontend] 涓荤珯渚ц竟鏍忔帴鍏ュ叏灞€ locale 鍒囨崲涓庤姹傚ご閫忎紶**锛坄h5-video-tool/src/components/Layout.tsx` + `h5-video-tool/src/api/client.ts` + `h5-video-tool/src/i18n/locale.ts` + `h5-video-tool/src/i18n/LocaleContext.tsx`锛夛細鍓嶇缁熶竴娉ㄥ叆 `X-UI-Locale` / `X-Content-Locale`锛屽苟鍦ㄤ富甯冨眬搴曢儴鎻愪緵鎸佺画鍙鐨勮瑷€鍒囨崲鍏ュ彛锛岀‘淇濋〉闈㈠３灞備笌鍚庣画鍐呭鐢熸垚閾捐矾鏈変竴鑷寸殑 locale 涓婁笅鏂囥€?
- **[frontend] 鏂板鍩虹 i18n 瀛楀吀涓?QuickFilm 涓绘祦绋嬪３灞傚浗闄呭寲**锛坄h5-video-tool/src/i18n/messages.ts` + `h5-video-tool/src/pages/QuickFilm.tsx`锛夛細琛ラ綈鐧诲綍椤点€佷晶杈瑰鑸€佷竴閿垚鐗囦富鍏ュ彛銆佸鐞嗕腑鐘舵€併€佸垎闀滅‘璁ら〉绛夐珮棰戜腑鏂囨枃妗堢殑涓嫳鏄犲皠锛岄檷浣庤嫳鏂囧崗浣滃悓瀛﹂娆′娇鐢ㄩ棬妲涖€?
- **[test] 鏂板 locale 鍗忚涓庢枃妗堝洖褰掓祴璇?*锛坄h5-video-tool/src/i18n/locale.test.ts` + `h5-video-tool/tsconfig.app.json`锛夛細瑕嗙洊 locale 褰掍竴鍖栥€佽姹傚ご鐢熸垚銆侀璁惧尮閰嶃€佹枃妗?key 鏌ユ壘涓庝腑鏂囧厹搴曪紝閬垮厤鍚庣画鍒囪瑷€鑳藉姏鍥為€€銆?

### v0.76 鈥?2026-04-21

**GeeLark 瑙嗛鍒嗗彂鑷姩寮€鍏虫満**

**Feature / Bug Fix:**
- **[distribution] GeeLark 鍒嗗彂璐﹀彿琛ラ綈 5 涓凡缁戝畾鐜**锛坄config/geelark-accounts.json`锛夛細琛ュ叆 `web TH tt`銆乣TH test2`銆乣Test 3`銆乣ID test3`銆乣ID xianyu test`锛屽苟缁熶竴浣滀负瑙嗛鍒嗗彂鍙€夎处鍙锋簮銆?
- **[api] 瑙嗛鍒嗗彂璐﹀彿鏉冮檺鐪熸钀藉埌 GeeLark 鍒楄〃涓庡彂甯冩帴鍙?*锛坄h5-video-tool-api/src/routes/geelark.ts` + `h5-video-tool-api/src/services/geelark.ts`锛夛細`/api/geelark/accounts` 涓?`/api/geelark/publish` 鐜板湪閮戒細鎸?GOBS 褰撳墠鐧诲綍鐢ㄦ埛鐨?`publishAccountIds` 杩囨护锛岄伩鍏嶈缃〉鍒嗛厤缁撴灉涓庡疄闄呭垎鍙戣劚鑺傘€?
- **[api] GeeLark 鍒嗗彂鏀逛负鈥滃彂甯冨墠鑷姩寮€鏈猴紝鎴愬姛鍚庤嚜鍔ㄥ叧鏈衡€?*锛坄h5-video-tool-api/src/services/geelark.ts`锛夛細鍙戝竷鍓嶄細鍏堟鏌ョ洰鏍囦簯鎵嬫満鐘舵€侊紝鍙惎鍔ㄥ叧鏈轰腑鐨勮澶囧苟绛夊緟鍏?ready锛汫eeLark 杩斿洖 `taskIds` 鍚庣敱鍚庣鍚庡彴杞浠诲姟鐘舵€侊紝鍙湁浠诲姟鎴愬姛锛坄status=3`锛夋墠鑷姩鍏虫満锛屽け璐ユ垨鍙栨秷鏃朵繚鐣欒澶囩幇鍦虹敤浜庢帓鏌ャ€?
- **[test] 鏂板 GeeLark 鍒嗗彂鏉冮檺涓庤嚜鍔ㄥ紑鍏虫満绾€昏緫鍥炲綊娴嬭瘯**锛坄h5-video-tool-api/tests/geelarkAccounts.test.ts`锛夛細瑕嗙洊璐﹀彿杩囨护銆侀渶鍚姩璁惧绛涢€夈€佽澶?ready 鍒ゅ畾銆佷换鍔′笌 env 鏄犲皠銆佹垚鍔熷悗鍏虫満瑙勫垯銆?

### v0.75 鈥?2026-04-21

**鎴戠殑鎴愮墖鍗虫ⅵ鍥炶ˉ琛ラ綈鍚庣画鍒嗛〉婕忕墖**

**Bug Fix:**
- **[api] `dreaminaRecentSync` 鏀逛负鐩存帴鍒嗛〉鎵弿鍗虫ⅵ `list_task` 缁撴灉**锛坄h5-video-tool-api/src/services/dreaminaRecentSync.ts`锛夛細鍚屾鏈嶅姟涓嶅啀鍙緷璧栧崟娆″垪琛ㄧ粨鏋滐紝鑰屾槸鎸?`offset` 杩炵画鎵弿澶氶〉浠诲姟锛涘嵆浣垮墠鍑犻〉閮芥槸宸茬粡钀界洏鐨勬棫 submit锛屼篃浼氱户缁線鍚庢壘缂哄け鎴愮墖锛屼慨澶嶁€滃嵆姊﹀悗鍙拌繕鏈夎棰戯紝浣嗘湇鍔＄鏂囦欢濮嬬粓鎷変笉鍒扳€濈殑闂銆?
- **[api] 鍚屾灞傛柊澧炵嫭绔?wrapper 璋冪敤涓庡垎椤靛洖褰掓祴璇?*锛坄h5-video-tool-api/src/services/dreaminaRecentSync.ts` + `h5-video-tool-api/tests/dreaminaRecentSync.test.ts`锛夛細鍦ㄤ笉淇敼绂佹敼鐨?`dreaminaVideo.ts` 鍓嶆彁涓嬶紝鍥炶ˉ娴佺▼浼氭樉寮忓甫涓?Dreamina wrapper 璺緞鍜?`--offset` 鍙傛暟璺戝垎椤碉紱鍚屾椂鏂板鈥滅涓€椤靛叏鏄棫鐗囥€佺浜岄〉鎵嶆湁鏂扮墖鈥濇祴璇曪紝闃叉鍚庣画鍐嶉€€鍥炲彧鎵涓€椤电殑琛屼负銆?

### v0.74 鈥?2026-04-21

**鍗虫ⅵ鍚庡彴鍚屾琛ラ綈 Linux 杩愯鏃跺厹搴?*

**Bug Fix:**
- **[api] `dreaminaRecentSync` 鑷姩鎺㈡祴鏈嶅姟鍣ㄤ笂鐨?Dreamina CLI 涓?wrapper 璺緞**锛坄h5-video-tool-api/src/services/dreaminaRecentSync.ts`锛夛細褰撶嚎涓?`qas-api` 杩涚▼娌℃湁鏄惧紡娉ㄥ叆 `DREAMINA_BIN / DREAMINA_SCRIPTS_DIR` 鏃讹紝浼氳嚜鍔ㄥ皾璇?`/home/ubuntu/.local/bin/dreamina`銆乣~/.dreamina_cli/dreamina` 鍜岄儴缃茬洰褰曚笅鐨?`.cursor/skills/dreamina-cli-skill/scripts`锛岄伩鍏嶁€滃悓姝ユ帴鍙ｆ甯歌繑鍥炰絾瀹為檯涓婃病鏈夌湡姝ｈ皟鐢ㄥ嵆姊﹀悗鍙扳€濈殑鍋囨垚鍔熴€?

### v0.73 鈥?2026-04-21

**鎴戠殑鎴愮墖鍗虫ⅵ鍚屾鏀逛负鍚庡彴涓茶锛屼慨澶嶅崱椤夸笌閲嶅鏃х墖**

**Bug Fix:**
- **[api] 鏈嶅姟绔枃浠跺垪琛ㄦ敼鍥炲揩閫熻繑鍥烇紝骞跺鍗虫ⅵ钀界洏缁撴灉鍋氬幓閲嶅睍绀?*锛坄h5-video-tool-api/src/routes/video.ts` + `h5-video-tool-api/src/services/dreaminaRecentSync.ts`锛夛細`GET /api/video/output-recent` 涓嶅啀鍦ㄥ垪琛ㄦ帴鍙ｉ噷鍚屾闃诲璋冪敤鍗虫ⅵ鍚庡彴锛岃€屾槸鍏堝揩閫熻繑鍥炲綋鍓嶆湇鍔＄鏂囦欢锛涜繑鍥炲墠浼氭寜 `dreamina_<submitId鍓嶇紑>` 鍚堝苟閲嶅鏂囦欢锛屽彧淇濈暀鍚?submit 鐨勬渶浣冲壇鏈紝閬垮厤鍒楄〃閲屽嚭鐜板悓涓€涓棫瑙嗛澶氭銆?
- **[api] 鏂板鎸夌敤鎴蜂覆琛岀殑鍗虫ⅵ鍚庡彴鍚屾鎺ュ彛**锛坄POST /api/video/output-recent/sync-dreamina`锛夛細鍗虫ⅵ鏈€杩戞垚鐗囧悓姝ユ敼涓哄崟鐙帴鍙ｏ紝骞跺姞浜?per-user 閿侊紱鍚屼竴鐢ㄦ埛鍚屼竴鏃堕棿鍙細璺戜竴鏉″悓姝ヤ换鍔★紝鍚庣画璇锋眰鍙細澶嶇敤宸叉湁鍚屾锛屼笉浼氬啀鍥犱负澶氭鍒锋柊骞跺彂鍐欏嚭閲嶅 mp4銆?
- **[frontend] 鎴戠殑鎴愮墖鏀逛负鈥滃厛绉掑紑鍒楄〃锛屽啀鍚庡彴鍚屾鍗虫ⅵ鈥?*锛坄h5-video-tool/src/components/GalleryView.tsx` + `h5-video-tool/src/api/video.ts`锛夛細杩涘叆鈥滄湇鍔＄鏂囦欢鈥濋〉鏃跺厛蹇€熷姞杞界幇鏈夊垪琛紝鍐嶅悗鍙板彂璧峰嵆姊﹀悓姝ワ紱鍚屾鏈熼棿椤甸潰浠嶅彲鎿嶄綔锛屽畬鎴愬悗鑷姩鍒锋柊鍒楄〃骞?toast 鎻愮ず锛屼笉鍐嶆暣椤甸暱鏃堕棿鍗″湪鈥滃埛鏂颁腑 / 鍔犺浇涓€濄€?

### v0.72 鈥?2026-04-21

**鎴戠殑鎴愮墖琛ュ悓姝ュ嵆姊﹀悗鍙版渶杩戞垚鐗?*

**Bug Fix:**
- **[api] `/api/video/output-recent` 澧炲姞鍗虫ⅵ鏈€杩戞垚鐗囧洖娴?*锛坄h5-video-tool-api/src/routes/video.ts` + `h5-video-tool-api/src/services/dreaminaRecentSync.ts`锛夛細杩斿洖鈥滄湇鍔＄鏂囦欢鈥濆垪琛ㄥ墠锛屽悗绔細鍏堟壂鎻忓綋鍓嶇敤鎴?`output/` 宸茶惤鐩樻垚鐗囷紝鍐嶈皟鐢ㄥ嵆姊?`list_task` 鎵惧嚭鏈€杩?7 澶╁唴宸插畬鎴愪絾鏈湴杩樻病鏈夌殑鎴愮墖锛岄€愪釜澶嶇敤鐜版湁 `pollDreaminaTask + persistVideoUrlToOutput` 閫昏緫琛ユ媺鍥炴湇鍔″櫒锛岄殢鍚庨噸鏂版壂鎻忓苟杩斿洖鏈€鏂板垪琛ㄣ€?
- **[api] 鏂板鍗虫ⅵ鍥炴祦鍒ら噸/鏃堕棿绐?helper 涓庢祴璇?*锛坄h5-video-tool-api/tests/dreaminaRecentSync.test.ts`锛夛細閿佸畾鈥滃彧鍚屾鏈€杩戞垚鍔熶换鍔°€佽烦杩囧凡钀界洏 submitId銆佸幓閲嶅苟闄愬埗鍗曟鍥炴祦鏁伴噺鈥濈殑瑙勫垯锛岄伩鍏嶅悓涓€鎵瑰嵆姊︽垚鐗囬噸澶嶈惤鐩樻垨鎶婅繃鏃т换鍔￠噸鏂扮亴鍥炲垪琛ㄣ€?
- **[frontend] 鎴戠殑鎴愮墖璇诲彇鏈嶅姟绔枃浠舵椂灞曠ず鍚屾缁撴灉**锛坄h5-video-tool/src/api/video.ts` + `h5-video-tool/src/components/GalleryView.tsx`锛夛細濡傛灉鏈鍒锋柊椤烘墜浠庡嵆姊﹀悗鍙拌ˉ鍥炰簡鏂版垚鐗囷紝椤甸潰浼?toast 鎻愮ず鍚屾鏁伴噺锛屾柟渚跨敤鎴风‘璁ゆ渶杩戝嚑澶╃殑鎴愮墖宸茬粡鍥炴潵銆?

### v0.71 鈥?2026-04-21

**瀵煎嚭涓嬭浇閴存潈鍥炶烦 + 鐧诲綍鍚庨粦灞忛伄缃╀慨澶?*

**Bug Fix:**
- **[frontend] 涓嬭浇鎴愬搧鍓嶅厛琛ユ嬁 file-access-token锛屽苟缁熶竴璁板綍鐧诲綍鍚庡洖璺冲湴鍧€**锛坄h5-video-tool/src/api/client.ts` + `h5-video-tool/src/api/editor.ts`锛夛細瀵煎嚭涓嬭浇銆佺紪杈戝櫒涓婁紶鍜屽叾浠?401 鍦烘櫙涓嶅啀鐩存帴纭烦瑁?`/login`锛涗細鍏堜繚瀛樺綋鍓嶄笟鍔￠〉闈紝鐧诲綍鎴愬姛鍚庤嚜鍔ㄥ洖鍒板師椤甸潰锛岄伩鍏嶄笅杞藉け璐ユ妸浜轰涪鍥為椤点€?
- **[frontend] 鐧诲綍椤垫敮鎸?query/state/sessionStorage 涓夎矾鍥炶烦鎭㈠**锛坄h5-video-tool/src/pages/Login.tsx`锛夛細鏃犺鏄矾鐢卞畧鍗烦杞€佹帴鍙?401 璺宠浆锛岃繕鏄笅杞介摼璺Е鍙戠殑閲嶆柊鐧诲綍锛岀櫥褰曟垚鍔熷悗閮戒細鎭㈠鍒板師鏉ョ殑椤甸潰锛岃€屼笉鏄浐瀹氳惤鍒伴椤点€?

### v0.70 鈥?2026-04-21

**鍓緫鍣ㄨ繛缁挱鏀捐竟鐣屾姈鍔ㄤ慨澶?*

**Bug Fix:**
- **[frontend] 棰勮鎾斁鍣ㄦ寜鈥滃綋鍓嶆覆鏌?clip鈥濆鐞嗙粨鏉熶簨浠?*锛坄h5-video-tool/src/pages/EditorWorkbench.tsx`锛夛細杩炵画鎾斁鍒囧埌涓嬩竴闀滄椂锛屼笉鍐嶄緷璧栧彲鑳藉凡缁忓垏鎹㈠埌涓嬩竴娈电殑鍏ㄥ眬 `activeVideoClipRef`锛岃€屾槸鎶?`onCanPlay / onTimeUpdate / onEnded` 鍜屽綋鍓嶈繖鏀?`<video>` 瀵瑰簲鐨?clip 缁戝畾锛岄伩鍏嶇墖灏捐繜鍒颁簨浠舵妸鏃堕棿杞撮敊璇啓鍥炰笂涓€闀溿€?
- **[frontend] 鏂板鏃т簨浠堕槻涓叉壈淇濇姢**锛坄EditorWorkbench.tsx`锛夛細褰撻暅澶村垰鍒囨崲鍒颁笅涓€娈垫椂锛屼笂涓€娈?`<video>` 鐨勮繜鍒?`timeupdate/ended` 浜嬩欢浼氳鐩存帴蹇界暐锛屼笉鍐嶅嚭鐜板儚鈥滈暅10缁撴潫鍚庤繕榛忓湪闀?0锛屽繀椤绘墜鍔ㄦ嫋鍒伴暅11鈥濊繖鏍风殑杈圭晫鎶栧姩闂銆?

### v0.69 鈥?2026-04-21

**瀵煎嚭鎴愬搧涓嬭浇鎭㈠绋冲畾鐩撮摼**

**Bug Fix:**
- **[frontend] 涓嬭浇鎴愬搧浼樺厛璧板甫 `fat/token` 鐨勭洿閾句笅杞?*锛坄h5-video-tool/src/api/client.ts`锛夛細瀵煎嚭瀹屾垚鍚庣殑銆屼笅杞芥垚鍝併€嶄笉鍐嶅厛鎶婃暣涓?MP4 鎷夋垚 Blob 鍐嶇珛鍗抽噴鏀句复鏃?URL锛岃€屾槸浼樺厛澶嶇敤鐜版湁鏂囦欢璁块棶 token 浣撶郴瑙﹀彂娴忚鍣ㄥ師鐢熶笅杞斤紱瀵瑰ぇ鏂囦欢鍜屼笉鍚屾祻瑙堝櫒鐨勫吋瀹规€ф洿绋炽€?
- **[api] 瀵煎嚭涓嬭浇璺敱鎺ュ叆濯掍綋 token 瑙ｆ瀽**锛坄h5-video-tool-api/src/routes/editorExport.ts`锛夛細`/api/editor/export/download/:filename` 鐜板湪鍜岃棰?鍥剧墖棰勮閾捐矾涓€鑷达紝鏀寔閫氳繃 `fat` 鎴?`token` 璇嗗埆褰撳墠鐢ㄦ埛锛屼繚璇佺洿閾句笅杞戒粛鐒跺彧鍏佽璁块棶鏈汉瀵煎嚭鐨勬垚鍝併€?
- **[api] 閴存潈涓棿浠舵斁琛屽鍑轰笅杞?GET 璇锋眰**锛坄h5-video-tool-api/src/middleware/auth.ts`锛夛細娴忚鍣ㄥ師鐢熶笅杞借姹備笉浼氭惡甯?`Authorization` 澶达紝鏈鏀逛负鍦ㄨ矾鐢卞眰瀹屾垚浜屾鏍￠獙锛岄伩鍏嶁€滃鍑烘垚鍔熶絾鐐瑰嚮涓嬭浇鎶ラ敊鈥濈殑鏂摼闂銆?

### v0.68 鈥?2026-04-21

**鎵归噺浠诲姟閴存潈琛ラ綈 + SSE 鑷姩閲嶈繛 + 鐪熷疄鐗堟湰灞曠ず**

**Bug Fix / UX:**
- **[frontend] `batch-jobs` 鎴愮墖閾炬帴缁熶竴琛?FAT/JWT 閴存潈**锛坄BatchJobsBoard.tsx` + `History.tsx`锛夛細鎵归噺浠诲姟鐪嬫澘閲岀殑瑙嗛棰勮銆佷笅杞斤紝浠ュ強鍘嗗彶椤碘€滃鍏ュ埌鍓緫鍣ㄢ€濈幇鍦ㄩ兘浼氭妸鐩稿濯掍綋鍦板潃杞垚鐪熷疄 API URL锛屽苟鑷姩闄勫甫 file-access-token 鎴?JWT 鏃佽矾锛屼笉鍐嶅洜涓鸿８ `/api/batch-jobs/video/:id` 閾炬帴鑰屽湪鐪熷疄娴忚鍣ㄥ満鏅笅鍑虹幇 401銆?
- **[frontend] 鍓緫鍣ㄥ洖璺冲埗鐗囬」鐩敼鍒扮湡瀹炶矾鐢?*锛坄EditorWorkbench.tsx`锛夛細椤堕儴鈥滄潵鑷埗鐗囬」鐩€濆叆鍙ｄ粠鏃х殑 `/studio/wizard?project=...` 淇涓哄綋鍓嶅疄闄呬娇鐢ㄧ殑 `/studio/production?projectId=...`锛屾仮澶嶁€滃埗鐗?-> 鍓緫 -> 鍥炵湅鍒剁墖鈥濈殑闂幆銆?
- **[frontend] 渚ц竟鏍忕増鏈彿鏀逛负璇诲彇杩愯涓増鏈?*锛坄Layout.tsx`锛夛細涓嶅啀纭紪鐮?`GOBS v0.1`锛岃€屾槸鍦ㄧ晫闈㈠簳閮ㄥ睍绀?`/api/system/version` 杩斿洖鐨勭湡瀹?`branch@commit`锛屼究浜庣敤鎴峰拰寮€鍙戠‘璁ゅ綋鍓嶇嚎涓婃鍦ㄨ繍琛岀殑鏋勫缓銆?

### v0.67 鈥?2026-04-21

**瀵煎嚭鎴愬搧涓嬭浇鎭㈠绋冲畾鐩撮摼**

**Bug Fix:**
- **[frontend] 涓嬭浇鎴愬搧浼樺厛璧板甫 `fat/token` 鐨勭洿閾句笅杞?*锛坄h5-video-tool/src/api/client.ts`锛夛細瀵煎嚭瀹屾垚鍚庣殑銆屼笅杞芥垚鍝併€嶄笉鍐嶅厛鎶婃暣涓?MP4 鎷夋垚 Blob 鍐嶇珛鍗抽噴鏀句复鏃?URL锛岃€屾槸浼樺厛澶嶇敤鐜版湁鏂囦欢璁块棶 token 浣撶郴瑙﹀彂娴忚鍣ㄥ師鐢熶笅杞斤紱瀵瑰ぇ鏂囦欢鍜屼笉鍚屾祻瑙堝櫒鐨勫吋瀹规€ф洿绋炽€?
- **[api] 瀵煎嚭涓嬭浇璺敱鎺ュ叆濯掍綋 token 瑙ｆ瀽**锛坄h5-video-tool-api/src/routes/editorExport.ts`锛夛細`/api/editor/export/download/:filename` 鐜板湪鍜岃棰?鍥剧墖棰勮閾捐矾涓€鑷达紝鏀寔閫氳繃 `fat` 鎴?`token` 璇嗗埆褰撳墠鐢ㄦ埛锛屼繚璇佺洿閾句笅杞戒粛鐒跺彧鍏佽璁块棶鏈汉瀵煎嚭鐨勬垚鍝併€?
- **[api] 閴存潈涓棿浠舵斁琛屽鍑轰笅杞?GET 璇锋眰**锛坄h5-video-tool-api/src/middleware/auth.ts`锛夛細娴忚鍣ㄥ師鐢熶笅杞借姹備笉浼氭惡甯?`Authorization` 澶达紝鏈鏀逛负鍦ㄨ矾鐢卞眰瀹屾垚浜屾鏍￠獙锛岄伩鍏嶁€滃鍑烘垚鍔熶絾鐐瑰嚮涓嬭浇鎶ラ敊鈥濈殑鏂摼闂銆?

### v0.66 鈥?2026-04-21

**楂樼骇鍒剁墖瀵煎叆杩炵画鎾斁 + 涓€閿厤涔愬彲闈犳€т慨澶?*

**Bug Fix:**
- **[frontend] 瀵煎叆鍒嗛暅鍚庢椂闂磋酱杩炵画鎾斁鎭㈠**锛坄EditorWorkbench.tsx`锛夛細棰勮鎾斁鍣ㄥ湪鐗囨鑷劧 `ended` 鏃讹紝鑻ユ椂闂磋酱涓婅繕鏈変笅涓€娈佃棰戯紝浼氳嚜鍔ㄨ烦鍒颁笅涓€娈靛苟缁х画鎾斁锛屼笉鍐嶅洜涓哄埗鐗囬暅澶粹€滆鍒掓椂闀库€濆拰瀹為檯瑙嗛鏃堕暱瀛樺湪杞诲井鍋忓樊鑰屽仠鍦ㄧ涓€娈电粨灏俱€?
- **[frontend] 瀵煎叆寮曞寮圭獥鐨勩€屼竴閿敓鎴愰厤涔愩€嶇湡姝ｅ紑璺?*锛坄EditorWorkbench.tsx` + `BgmMixPanel.tsx`锛夛細浠庨珮绾у埗鐗囧鍏ュ壀杈戝櫒鍚庯紝寮圭獥閲岀殑閰嶄箰鍏ュ彛鐜板湪浼氬悓姝ュ乏涓?BGM 闈㈡澘 prompt锛屽苟鐩存帴瑙﹀彂鏅鸿兘閰嶄箰娴佺▼锛屼笉鍐嶅彧鏄啓涓€鏉℃棩蹇椼€?
- **[api] 閰嶄箰 prompt 娑﹁壊澧炲姞鏈湴鍏滃簳**锛坄editorMusicPromptPolish.ts`锛夛細褰撴ā鍨嬭繑鍥炵┖鍐呭銆丣SON 鏍煎紡寮傚父銆佸瓧娈靛悕涓嶈鑼冩垨娑﹁壊璇锋眰鏈韩澶辫触鏃讹紝鏈嶅姟绔細鎸夌敤鎴锋弿杩拌嚜鍔ㄧ敓鎴愬彲鐢ㄧ殑鑻辨枃鍣ㄤ箰 prompt/negativePrompt锛岄伩鍏嶁€滄ā鍨嬭繑鍥炴棤娉曡В鏋愪负閰嶄箰 JSON鈥濈洿鎺ヤ腑鏂嚜鍔ㄩ厤涔愩€?

### v0.65 鈥?2026-04-21

**鍗虫ⅵ鍏ㄥ钩鍙?FIFO 璋冨害鍣?+ 鍙彇娑堟帓闃?+ 澶氱敤鎴峰彲瑙侀槦鍒椾綅**

v0.64 瑙ｅ喅浜嗗崟鐢ㄦ埛瑙嗚鐨勭姸鎬佸彲瑙佹€э紝浣嗗鐢ㄦ埛鍚屾椂浣跨敤鍗虫ⅵ鏃朵粛浼氬嚭鐜颁换鍔′涪澶便€佹棤娉曞彇娑堛€佺湅涓嶅埌骞冲彴鎺掗槦浣嶇疆鐨勯棶棰樸€傛湰鐗堟妸璋冨害鏉冩敹褰掑悗绔紝鍓嶇缁熶竴娑堣垂鍏ㄥ眬闃熷垪鐘舵€侊細

**鏍稿績鍙樻洿锛?*
- **[api] 鏂板 `dreaminaScheduler`**锛氬叏骞冲彴 FIFO 璋冨害锛屾寜 `createdAt` 鎺掑簭鎻愪氦 awaiting_submit 浠诲姟锛?310 骞跺彂闄愬埗鑷姩鐣欏湪闃熷垪閲岀瓑寰呬笅娆?tick锛屼笉鍐嶆妸閿欒鐩存帴鎶涚粰鍓嶇
- **[api] 鏂板 `POST /api/batch-jobs/enqueue`**锛氶珮绾у埗鐗囬暅澶村厛钀界洏涓?`awaiting_submit`锛屽埛鏂伴〉闈篃涓嶄細涓换鍔?
- **[api] cancelJob 鍗囩骇涓轰笁妗ｈ涔?*锛歛waiting_submit 鏃犳崯绉婚櫎銆乸ending/queuing 鍋滄缁х画璺熻繘銆乸rocessing 鏄庣‘鎻愮ず绉垎閫氬父鏃犳硶杩藉洖
- **[api] SSE 鏂板 `queue-snapshot` 骞挎挱**锛氳法鐢ㄦ埛鍏变韩骞冲彴娲昏穬鏁?/ 鎺掗槦鏁?/ 骞冲潎鑰楁椂锛屼笉鏆撮湶鐢ㄦ埛闅愮
- **[frontend] 鍒犻櫎鍓嶇鏈湴 Dreamina 鎺掗槦閫昏緫**锛氱Щ闄?`dreaminaQueueRef`銆乣waitForAnyJobCompletion`銆?310 鏈湴閲嶈瘯锛岀粺涓€鏀硅蛋鍚庣 enqueue
- **[frontend] 鍒嗛暅浜旀€佺粺涓€**锛氱瓑寰呰皟搴?/ 鍗虫ⅵ鎺掗槦 / 鍗虫ⅵ鐢熸垚 / 宸插彇娑?/ 鐢熸垚澶辫触
- **[frontend] 鏂板鍙栨秷鍏ュ彛**锛氭搷浣滃尯鏀寔鈥滃彇娑堟帓闃?/ 鏀惧純鏈鐢熸垚鈥濓紝缂╃暐鍥?hover 鏀寔鍗曢暅蹇嵎鍙栨秷锛屽伐浣滃尯宸ュ叿鏍忔敮鎸佲€滃彇娑堟湰椤圭洰鎺掗槦鈥?
- **[frontend] 椤堕儴骞冲彴鐘舵€佹潯**锛氭樉绀哄綋鍓嶅钩鍙扮┖闂?/ 浣跨敤涓?/ 绻佸繖锛屼互鍙婂钩鍧囪€楁椂

**Acceptance锛?* 澶氱敤鎴峰苟鍙戦浂浠诲姟涓㈠け锛涘彇娑堣姹傚嵆鏃惰繑鍥烇紱鍒锋柊鍚庨槦鍒楃姸鎬佷笌瑙嗛鍥炲～鎸佺画鍙仮澶嶃€?

### v0.64.2 鈥?2026-04-20锛坔otfix锛?

**淇 v0.64 鍓嶇 recovery effect 璇妸"宸叉彁浜ゅ嵆姊?褰撲綔"鏈湴鎻愪氦涓? + 鏆撮湶鍗虫ⅵ闃熷垪浣嶇疆**

v0.64 涓婄嚎鍚庣敤鎴峰弽棣堬細鍚屾椂鐐归暅 10/11 鐢熸垚锛岄暅 10 鏄剧ず"鍗虫ⅵ鐢熸垚"銆侀暅 11 鏄剧ず"鍗虫ⅵ鎺掗槦"锛堢鍚堥鏈燂紝鍙嶆槧鍗虫ⅵ鏈嶅姟绔?GPU 璋冨害椤哄簭锛夛紝**浣嗛暅 7/8 涓€鐩村崱鍦ㄩ噾鑹?鎻愪氦涓?涓?鎵嬪姩妫€鏌ヨ繘搴?鎸夐挳娑堝け**銆傛帓鏌ュ彂鐜?`ProductionWizard` 鍒锋柊鎭㈠ effect 閿欐妸銆屾湁 `pendingVideoSubmitId` 鐨?shot銆嶅己琛屽啓鍏?`shotBusyMap='video'`锛岃€?`shotBusyMap='video'` 璇箟搴斾弗鏍奸檺瀹氫负銆屾湰浼氳瘽姝ｅ湪璋?`/api/video/submit` 鐨勯偅鍑犵銆嶃€傛贩鐢ㄥ鑷达細

1. ShotStrip 閲?`isThisShotBusy==='video'` 浼樺厛绾ч珮浜?`jobStatus`锛孲SE 鎺ㄦ潵鐨?鍗虫ⅵ鎺掗槦/鍗虫ⅵ鐢熸垚"寰芥爣琚鐩栵紝**姘歌繙鍙湅鍒?鎻愪氦涓?**銆?
2. `StepStoryboardGenerateActions` 鐨勩€屾墜鍔ㄦ鏌ヨ繘搴︺€嶆寜閽潯浠?`hasPendingBackend = pendingVideoSubmitId && !isSubmitting` 鍥?`shotBusyMap='video'` 瀵艰嚧 `isSubmitting=true`锛屾寜閽秷澶憋紝鐢ㄦ埛娌℃硶涓诲姩瑙﹀彂涓€娆?poll銆?

**淇锛堜竴娆℃€у埌浣嶏級锛?*
- **[frontend] `ProductionWizard.tsx` recovery effect**锛氫笉鍐嶇粰甯?`pendingVideoSubmitId` 鐨?shot 鍐?`shotBusyMap='video'`銆備繚鐣欍€宻hot 鍚屾椂鏈?`pendingVideoSubmitId` 鍜屽凡鎴愮墖瑙嗛銆嶆椂娓?stale pending 鐨勫厹搴曢€昏緫锛堣繖閮ㄥ垎鏄鐨勶級銆傚埛鏂板悗璇?shot 鐢?ShotStrip 榛樿鍒嗘敮 + SSE `jobStatus` 鍏卞悓娓叉煋锛氬悗绔珛鍒昏兘鎺ㄥ埌 queuing/processing/failed 鏃舵樉绀哄搴旂殑钃?缁?绾㈠窘鏍囥€?
- **[frontend] `StepStoryboardGenerateActions.tsx`**锛?
  - `hasPendingBackend` 浠?`pendingVideoSubmitId && !isSubmitting` 鏀逛负 `!!pendingVideoSubmitId`锛屽苟鎶娿€屾墜鍔ㄦ鏌ヨ繘搴︺€嶆寜閽潯浠舵樉寮忔敼涓?`hasPendingBackend && shotMediaBusy !== 'video'`锛堝嵆锛氬彧鍦ㄧ湡路HTTP submit 杩涜涓墠灞忚斀锛涘凡鎻愪氦鍗虫ⅵ灏遍殢鏃惰兘鐐癸級銆?
  - 鎸夐挳鏂囨/涓绘寜閽?label 鍖哄垎寮€銆屾鍦ㄨ皟 submit銆嶃€屾湰鍦伴槦鍒楁帓闃熴€嶃€屽凡鎻愪氦鍗虫ⅵ銆嶄笁绉嶇姸鎬併€?
- **[frontend] `StepStoryboardShotStrip.tsx`**锛氬窘鏍?tooltip 灞曠ず銆屽嵆姊﹂槦鍒?#N/M銆嶏紝鐢ㄦ埛 hover 鍒拌摑鑹?鍗虫ⅵ鎺掗槦"寰芥爣鍗冲彲鐪嬪埌鍗虫ⅵ鏈嶅姟绔湡瀹炵殑闃熷垪浣嶇疆锛屼笉鍐嶇寽"鏄笉鏄崱浣忎簡"銆?

**鍘熺悊鑳屾櫙锛堜负浠€涔堜細鏈?鍗虫ⅵ鐢熸垚"vs"鍗虫ⅵ鎺掗槦"涓ょ鎬侊級锛?*
- 鍚庣 `pollDreaminaTask` 璋?`query_result.py` 鎷垮洖鍗虫ⅵ渚х殑 `gen_status`锛?
  - `generate` 鈫?鍗虫ⅵ GPU 姝ｅ湪娓叉煋杩欎竴甯?鈫?job.status = `processing` 鈫?鍓嶇缁胯壊"鍗虫ⅵ鐢熸垚"
  - `queue`/`wait` 绛?鈫?鍦ㄥ嵆姊﹁处鍙风殑 GPU 闃熷垪涓帓闃?鈫?job.status = `queuing` 鈫?鍓嶇钃濊壊"鍗虫ⅵ鎺掗槦"
- 鍚屾椂鎻愪氦涓や釜浠诲姟鏃讹紝鍗虫ⅵ璐﹀彿鐨勬湇鍔＄骞跺彂妲戒綅锛堥€氬父 1-2 涓級鍐冲畾浜嗚皝鍏堣 GPU 鎺ヨ蛋銆傚厛鐐瑰嚮涓嶄繚璇佸厛琚皟搴︼紝杩欐槸鍗虫ⅵ鐨勮皟搴﹂€昏緫锛屼笉鏄垜浠悗绔湪鎺掗槦銆?

**鏁堟灉锛?*
- 闀?7/8 鍒锋柊鍚庝笉鍐嶅崱"鎻愪氦涓?锛屼細鎸?SSE 绔嬪嵆鍒囧埌"鍗虫ⅵ鎺掗槦"锛堣摑锛夋垨"鍗虫ⅵ鐢熸垚"锛堢豢锛夛紝纭疄澶辫触鎵嶆樉绀虹孩鍙夈€?
- 銆屾墜鍔ㄦ鏌ヨ繘搴︺€嶆寜閽湪"宸叉彁浜ゅ嵆姊?鎬佸缁堝彲鐢ㄣ€?
- 榧犳爣鎮仠钃濊壊寰芥爣鑳界湅鍒般€屽嵆姊﹂槦鍒?#3/12銆嶈繖鏍风殑鐪熷疄浣嶇疆銆?

---

### v0.64.1 鈥?2026-04-20锛坔otfix锛?

**淇 v0.64 鍓綔鐢細鐬椂 CLI 閿欒琚鍒や负"鐢熸垚澶辫触"**

v0.64 涓婄嚎鍚庡彂鐜?3 涓粛鍦ㄥ嵆姊?querying 鐨?submitId锛堥暅 7 `d5bfc8cb`/`8031c5a6`銆侀暅 8 `c65c6c38`锛夎 poller 鏍囪涓?`failed`锛屽墠绔殢鍗冲睍绀虹孩鍙?鐢熸垚澶辫触"锛屾瘮"鎻愪氦涓?杩樼碂銆傛牴鍥狅細`pollDreaminaTask` 鎶婁袱绫?*鐬椂/澶栭儴閿欒**褰撴垚浜?dreamina 鏈韩鐨?`fail`锛?
1. `query_result.py` wrapper 璋冪敤澶辫触锛圕LI 鎶栧姩銆?did not return parseable JSON"銆?exit code 1"锛?鈫?杩斿洖 `phase: 'failed'`锛?
2. 鍗虫ⅵ `genStatus === 'success'` 浣嗕笅杞芥垚鐗?URL 澶辫触 鈫?杩斿洖 `phase: 'failed'`锛?
3. `MAX_JOB_AGE_MS = 4h` 纭€ц秴鏃讹紝瀹為檯鍗虫ⅵ鍗曚换鍔℃帓闃?鐢熸垚鏈夋椂浼氳秴杩?4 灏忔椂銆?

**淇锛?*
- **[api] `dreaminaVideo.ts 鈫?pollDreaminaTask`**锛歚DreaminaTaskStatusResult` 鏂板 `transientError?: string` 瀛楁锛涗笂闈袱绉嶆儏鍐垫敼涓鸿繑鍥?`{ phase: 'querying', transientError }`锛屾妸 job 鐘舵€佺暀鍦?`queuing/processing`锛屼笅涓€娆?tick 缁х画閲嶈瘯锛岃€屼笉鏄洿鎺ュけ璐ャ€?
- **[api] `batchJobsQueue.ts 鈫?pollSingleJob`**锛氭敹鍒?`transientError` 鏃朵粎 `console.warn` 璁板綍锛屼笉鍐嶈繘鍏?failed 鍒嗘敮銆佷笉鍐?`writeBackFailedToProject`銆?
- **[api] `batchJobsQueue.ts`**锛歚MAX_JOB_AGE_MS` 浠?4h 鈫?**12h**锛岄伩鍏嶈窇寰楁參鐨勫嵆姊︿换鍔¤璇秴鏃躲€?
- **[ops] jobs.json 淇**锛氭妸 3 涓璇激鐨?submitId 浠?`failed` 閲嶇疆涓?`queuing` + 娓?`failReason`锛岃 poller 鎺ョ銆傞儴缃插悗 `d5bfc8cb` 棣栬疆灏辫繑鍥?`done`锛堝嵆姊︽棭宸插畬鎴愶紝鍙槸涔嬪墠涓嬭浇涓€娆″け璐ュ氨鎶?job 鏍囨浜嗭級锛屽彟澶?2 涓洖鍒?`queuing` 缁х画绛夈€?

**鏁堟灉锛?*
- 鍗虫ⅵ鐪熷け璐ワ紙`fail` 鐘舵€侊級鈫?渚濇棫绾㈠弶锛屼繚鎸?v0.64 鐨勪氦浜掋€?
- CLI 鎶栧姩/涓嬭浇鎶栧姩 鈫?鐜板湪鍙墦 warn锛宻hot 淇濇寔"鍗虫ⅵ鎺掗槦/鍗虫ⅵ鐢熸垚"锛屼笅娆?tick 浼氳嚜鎰堬紝鐢ㄦ埛鐪嬪埌鐨勭姸鎬佸缁堢湡瀹炪€?

---

### v0.64 鈥?2026-04-20

**楂樼骇鍒剁墖 鐢熸垚鐘舵€佸彲瑙佹€т竴娆℃€у埌浣嶏紙鎻愪氦涓?鈫?鍥涙€?+ 杩愮淮鎸夐挳 + 鎻愰€熻疆璇級**

鐢ㄦ埛鍙嶉锛氶暅 7 鍗虫ⅵ杩樺湪璺戯紝H5 鍗翠竴鐩存樉绀?鎻愪氦涓?锛涢暅 9 鎵嬪姩鐐逛簡鐢熸垚鐪嬩笉鍑烘槸宸插叆闃熻繕鏄病鏈夋彁浜ゃ€傛牴鍥犳槸 **"鎻愪氦涓?杩欎笁涓瓧鍚屾椂鎵挎媴浜?鍚庣鏈敞鍐?+"鍗虫ⅵ鎺掗槦"+"鍗虫ⅵ鐢熸垚"+"鍒氬け璐?鍥涚璇箟**锛岀敤鎴锋棤娉曞垎杈紝浣撻獙鐏鹃毦銆傛湰鐗堜竴娆℃€ч噸鏋勶細

**Feature / 鏍稿績鏀归€狅細**
- **[frontend] ProductionWizard 娲剧敓 shotJobStatusMap**锛歚useMemo` 鎸?projectId 杩囨护 SSE jobs锛屽悓 shot 澶氭潯 job 鎸?done > processing > queuing > failed 鐨勪紭鍏堢骇鎸戞渶鏈変俊鍙风殑閭ｆ潯锛涘叏 done 鍒欎笉灞曠ず浠讳綍 overlay锛岃窡涔嬪墠琛屼负涓€鑷淬€?
- **[frontend] 椤堕儴"鍚屾鍗虫ⅵ鐘舵€?鎸夐挳**锛坄StepStoryboardWorkspace.tsx`锛夛細宸ュ叿鏍忓彸渚ф柊澧炰竴閿厹搴曟寜閽紝鐐瑰嚮鍚庤皟 `/api/batch-jobs/sync-now`锛屽褰撳墠鐢ㄦ埛鎵€鏈?`pending/queuing/processing` 鐨?batch-job 骞跺彂锛?锛塸oll 涓€娆★紝骞堕『甯﹁Е鍙戝鍎?submitId 鎵弿锛屽畬鎴愬悗 toast "X 鏉″凡瀹屾垚 / Y 鏉″け璐?/ 鍏滃簳鎭㈠ Z 鏉?銆?
- **[api] pollSingleJob failed 鍒嗘敮鑷姩娓?`pendingVideoSubmitId`**锛坄batchJobsQueue.ts` 鈫?鏂板 `writeBackFailedToProject`锛夛細鍗虫ⅵ鎶ュけ璐?鎴戜滑杞澶辫触鏃讹紝鍙 production.json 閲?shot.pendingVideoSubmitId 浠嶆寚鍚戣繖涓?job 鐨?submitId锛屽氨娓呮帀 pending 骞跺啓鍏?`shot.lastVideoError = { submitId, jobId, reason, at }`锛岃鍓嶇鑷姩鍒囧埌"澶辫触锛屽彲閲嶈瘯"鎬侊紝涓嶅啀姘歌繙鍗?鎻愪氦涓?銆傚箓绛変繚鎶わ細shot 宸叉湁瑙嗛鎴?pending 宸茶鏂?submit 瑕嗙洊鏃朵笉鍔ㄣ€?
- **[api] production 杞鎻愰€?*锛坄batchJobsQueue.ts`锛夛細涓?tick 30s 鈫?20s锛沺roduction 閫€閬夸粠 45/90/180s 鏀逛负 **20/45/90s**锛?*褰诲簳鍘婚櫎 `PRODUCTION_DELAY_MS` 45 绉掗杞喎鍚姩寤舵椂**锛屾柊 job 鍦ㄤ笅涓€涓?tick锛堚墹20s锛夌珛鍗?poll銆傜鍒扮寤惰繜浠庢渶鍧?180s 鍘嬬缉鍒?20s銆?
- **[api] 瀛ゅ効 submitId 鎵弿鍣ㄦ彁閫?*锛坄dreaminaRecovery.ts`锛夛細`SCAN_INTERVAL_MS` 120s 鈫?**45s**锛宻ubmit 鍝嶅簲涓㈠け锛?310銆佺綉缁滄姈鍔級鐨?submitId 鏈€鎱?45s 灏辫兘琚?scanner 鎹炲洖骞剁粦鍥?shotIndex銆?
- **[api] 鏂板杩愮淮鎺ュ彛 `POST /api/batch-jobs/sync-now`**锛坄routes/batchJobs.ts`锛夛細杩斿洖 `{ polled, results[], scan }`锛屼笓渚?鍚屾鍗虫ⅵ鐘舵€?鎸夐挳浣跨敤锛涘苟鍙戜笂闄?5 閬垮厤瀵?dreamina CLI 鍘嬪姏杩囧ぇ銆?

**ProductionShot 鏁版嵁缁撴瀯鏂板锛?*
- `ProductionShot.lastVideoError?: { submitId?, jobId?, reason, at }` 鈥斺€?璁板綍璇ラ暅鏈€杩戜竴娆″け璐ョ殑鍘熷洜锛孶I 鐢ㄤ簬灞曠ず鍙噸璇曞崱鐗囥€傛垚鍔熸嬁鍒拌棰戝悗鍓嶇/鍚庣閮戒笉寮烘竻锛堜繚鐣欎负鍘嗗彶鍙緵鏌ヨ锛夈€?

**杩愮淮涓€娆℃€т慨澶嶏細**
- 娓呯悊 `d5bfc8cb3b69d3dc`锛堥暅 7 鐨勫彟涓€涓?submitId锛夊湪 jobs.json 閲岃璇爣涓?`failed` 鐨勭姸鎬?鈫?閲嶇疆涓?`queuing`锛岃 poller 缁х画璺熻繘銆?

**鏁堟灉锛?*
1. 闀?7/8/9 绛夊嵆姊﹀皻鍦?`querying` 鐨勫垎闀滅幇鍦ㄤ細鏄剧ず **"鍗虫ⅵ鎺掗槦"** 鎴?**"鍗虫ⅵ鐢熸垚"** 鑰屼笉鏄竴寰?鎻愪氦涓?銆?
2. 浠讳綍 batch-job `failed` 鍚?shot 绔嬪埢浠?鎻愪氦涓?鍙樼孩鍙?鐢熸垚澶辫触"锛屼笉鍐嶉渶瑕佸埛鏂版垨娓?localStorage銆?
3. 鐢ㄦ埛涓嶇‘瀹氱姸鎬佹椂鐐?鍚屾鍗虫ⅵ鐘舵€?鎸夐挳 10 绉掑唴灏辫兘鐪嬪埌鏈€鏂扮粨鏋滐紝鍐嶄篃涓嶇敤闈?F5銆?

**涓夌涓€缁燂細** 鏈湴 `tsc --noEmit`锛堝墠鍚庣鍧囬€氳繃锛夆啋 `npm run build` 鈫?`git push origin main` 鈫?SFTP 涓婁紶 `dist/` 鈫?`pm2 restart qas-api`銆?

### v0.63 鈥?2026-04-20

**鍓緫鍣ㄤ竴娆℃€у埌浣嶄紭鍖栵紙speed 缁熶竴 + 涓婁紶浣撻獙 + Agent 涓婁笅鏂?+ BGM 瀹圭伨 + 瀵煎嚭棰勬锛?*

鎸?涓嶈鎶樹腑鐗堟湰銆佷竴娆℃€у埌浣?鐨勬爣鍑嗭紝绯荤粺鎬т慨鎺変笂涓€杞?review 閬楃暀鐨?P1/P2 鍙婂叾琛嶇敓闂銆?

**Feature / 鏍稿績鏀归€狅細**
- **[frontend] 鍊嶉€?speed)鏃堕棿杞寸粺涓€**锛坄editor/types/timeline.ts` + 鍏ㄩ儴璋冪敤鐐癸級锛氭柊澧?`clipSpeed()` / `timelineDurationOf()` / `toSourceSec()` / `toTimelineOffset()` 鍥涗釜鍏叡甯姪鍑芥暟锛屾墍鏈?VideoClip / AudioClip 鐨勩€屾簮绉?鈫?鏃堕棿杞寸銆嶆崲绠楀叏閮ㄨ蛋杩欏銆備慨澶?`speed鈮?` 鏃堕瑙堛€佸垎鍓层€乼rim銆丅GM 瀵归綈銆丄gent 浜や粯琛ㄣ€佹椂闂磋酱娓叉煋瀹藉害銆侀煶棰戦暅鍍忚建鏃堕暱鍚勭畻鍚勭殑瀵艰嚧鐨勯敊浣嶏紱`AudioClip` 鏂板鍙€?`speed`锛宍syncSourceAudioClipsFromVideo` 浼氭妸瑙嗛鍊嶉€熷悓姝ュ埌闀滃儚闊抽杞ㄣ€?
- **[frontend] 鍒嗙墖涓婁紶骞跺彂 3 鐗?*锛坄api/editor.ts` 鈫?`uploadEditorAssetChunked`锛夛細鏀圭敤鍥哄畾 3 worker 鐨勫伐浣滄睜骞跺彂涓婁紶鍒嗙墖锛屽ぇ鏂囦欢涓婁紶閫熷害鎴愬€嶆彁鍗囷紱淇濈暀鍘熸湁"鍗曠墖澶辫触閲嶈瘯 2 娆?+ 鎸囨暟閫€閬?鍜?`expectedTotalSize` 鎬诲ぇ灏忔牎楠屻€?
- **[frontend] 涓婁紶鍓嶇疆澶у皬鏍￠獙 + 鍙嬪ソ 413**锛坄api/editor.ts`锛夛細`uploadEditorAsset` / `uploadEditorAssetChunked` 鍦ㄨ姹傚彂鍑哄墠璇诲彇 `getEditorUploadConfig().maxBytes`锛岃秴闄愮洿鎺ユ姏"璇ユ枃浠?XX MB锛岃秴杩囦笂闄?XXX MB"锛屼笉鍐嶈鐢ㄦ埛绛夋湇鍔″櫒 413 鎵嶇煡閬撹鎷掋€?
- **[api] 绱犳潗 SHA256 鍘婚噸**锛坄editorAssets.ts`锛夛細`StoredEditorAsset` 鏂板 `sha256` 瀛楁锛涘崟鏂囦欢涓庡垎鐗囧悎骞朵袱鏉′笂浼犺矾寰勮惤鐩樺悗鍧囦細娴佸紡璁＄畻鍝堝笇锛屽悓鐢ㄦ埛 `(sha256, size)` 鍛戒腑鍒欏垹闄ゆ柊鏂囦欢銆佺洿鎺ュ鐢ㄦ棫绱犳潗骞惰繑鍥?`deduped:true`锛岄噸澶嶄笂浼犱笉鍐嶅崰纾佺洏銆?
- **[api] 涓婁紶涓婇檺缁熶竴**锛坄localUpload.ts`锛夛細榛樿 `EDITOR_UPLOAD_MAX_MB` 浠?500 鎻愬埌 2048锛屼笌 `editorAssets.ts` 瀵归綈锛屾秷闄?鍒剁墖渚ц兘浼犮€佸壀杈戜晶浼犱笉杩?鐨勫壊瑁傘€?
- **[api] 瀵煎嚭纾佺洏绌洪棿棰勬**锛坄ffmpegExport.ts`锛夛細`runFfmpegExport` 寮€濮嬪墠鎸夈€屾椂闀?脳 鍒嗚鲸鐜?脳 3 鍊嶅畨鍏ㄧ郴鏁般€嶄及绠楁墍闇€绌洪棿锛岀敤 `fs.promises.statfs` 鍒嗗埆妫€鏌ヨ緭鍑虹洰褰曞拰 `os.tmpdir()` 涓や釜鍒嗗尯鍓╀綑绌洪棿锛屼笉瓒冲垯绔嬪埢浠ュ弸濂介敊璇腑姝紝閬垮厤杞爜鍒?95% 鎵嶅洜鍐欑洏澶辫触鍓嶅姛灏藉純銆?
- **[api] apply-sync 婧愭枃浠跺瓨鍦ㄦ€ф牎楠?*锛坄editorProjects.ts`锛夛細鍚屾鏂扮増鏈墠瀵?`version.videoPath` 鍋?`fs.existsSync` 妫€鏌ワ紝鏂囦欢缂哄け / stat 澶辫触鐨?shot 涓嶅啓鍏ョ礌鏉愬簱锛屽搷搴斾綋鏂板 `skipped: [{shotIndex, reason}]`锛岄伩鍏嶆妸宸茶 GC 鐨勬簮璺緞鍐欒繘 clip 瀵艰嚧鏃堕棿杞村ぇ闈㈢Н榛戝睆锛沗oldDur / durDelta / maxEnd` 涔熸敼涓烘寜 `speed` 鎶樼畻鐪熷疄鏃堕棿杞存椂闀裤€?
- **[api] Agent 杞ㄥ悎骞躲€岀┖濉弧銆佹湁鍒欑暀銆?*锛坄editorAgentService.ts`锛夛細鍦ㄤ笂涓€杞彧淇濈暀 `mix` 鐨勫熀纭€涓婅繘涓€姝ョ粏鍖栵細`a2`锛圔GM锛? `t1`锛堟枃瀛楋級/ `subtitles` 涓夋潯杞ㄧ幇鍦ㄦ寜銆屽綋鍓嶅伐绋嬩负绌烘墠鐢?Agent 濉厖锛屽凡鏈夊唴瀹瑰垯淇濈暀銆嶇瓥鐣ュ悎骞讹紝鍏奸【銆岄娆＄敓鎴愯嚜鍔ㄩ厤瀛楀箷/BGM銆嶅拰銆屾墜鍔ㄨ皟杩囦箣鍚庝笉鍐嶈瑕嗙洊銆嶄袱绉嶈瘔姹傘€?
- **[api] Agent Plan Prompt 涓婁笅鏂囧寮?*锛坄editorAgentService.ts` 鈫?`buildPlanSystemPrompt`锛夛細绯荤粺 Prompt 鍥哄畾娉ㄥ叆涓夋鏂颁笂涓嬫枃鈥斺€擿## 绱犳潗鍐呭鎬昏`锛坈ontentManifest锛夈€乣## BGM 鑺傛媿缁撴瀯`锛堝惎鐢?`EDITOR_BEAT_ANALYSIS` 鏃舵彁渚涚簿纭妭鎷嶆椂闂寸偣锛夈€乣## 褰撳墠宸ョ▼宸叉湁鐗囨`锛堜粠 VideoClip 鎶藉彇 `shotIndex / characters / note / sourceStart~sourceEnd` 褰㈡垚 Markdown 琛級銆侫gent 涓嶅啀闇€瑕佸畬鍏ㄩ噸寤烘椂闂磋酱锛屾敼鍔ㄥ彲浠ュ榻愮敤鎴峰凡鏈夌殑鍒嗛暅鍙?瑙掕壊/澶囨敞銆?
- **[frontend+api] BGM 鐢熸垚銆岄噸璇?/ 鍒囧紩鎿?/ 璺宠繃銆嶄笁鎸夐挳**锛坄BgmMixPanel.tsx` + `editorMusic.ts` + `api/editor.ts`锛夛細`POST /api/editor/music/generate` 鏂板鍙€?`provider: 'auto'|'suno'|'lyria'`锛屾樉寮忔寚瀹?`suno` 鏃惰嫢鏃?API Key 绔嬪嵆 400銆佸け璐ヤ篃涓嶅啀鑷姩闄嶇骇锛涘墠绔厤涔愬け璐ュ悗鍦ㄩ潰鏉块噷鏄剧ず绾㈣壊澶辫触鍗＄墖锛屾彁渚涖€岄噸璇?/ 鍒?Lyria鈫擲uno / 璺宠繃銆嶄笁涓仮澶嶅姩浣滐紝鐢ㄦ埛鏃犻渶鍒锋柊鎴栫炕鏃ュ織銆?
- **[frontend] Undo/Redo 鑷姩閽冲埗 currentTime**锛坄useTimelineState.ts`锛夛細鐩戝惉 `durationSec` 鍙樺寲锛岃嫢 `currentTime` 瓒呰繃鏂版椂闀胯嚜鍔?clamp 鍥炶竟鐣岋紝淇鎾ら攢鍒犻櫎鐗囨鍚庢挱鏀惧ご鍋滃湪绌虹櫧鍖哄煙瀵艰嚧鐢婚潰榛戝睆鐨勯棶棰樸€?
- **[frontend] getActiveTextClips 绋冲畾鎺掑簭**锛坄timeline.ts`锛夛細鏂囧瓧鐗囨鍏堟寜 `timelineStart` 鍐嶆寜 `id` 鎺掑簭锛屼慨澶嶃€屽悓涓€鏃跺埢澶氭潯瀛楀箷闅?React 閲嶆覆鏌撳伓鍙戜氦鎹㈤『搴忋€嶇殑鏄剧ず闂儊銆?

**Bug fix:**
- 淇鍊嶉€熺墖娈垫嫋鎷?trim 鏃跺儚绱犺窛绂绘病涔樹互 speed锛岃瑙変笂鎷?10px 瀹為檯鏀瑰姩 20px 婧愭椂闀跨殑閿欎綅銆?
- 淇 apply-sync 璁＄畻 `durDelta` 蹇樿闄?`speed`锛屽悓姝ュ€嶉€熺墖娈靛悗缁?clip 浼氳棰濆骞崇Щ銆?
- 淇 `AssetImportPanel.tsx` 涓?`ImportJob` 婕?`skipped: 0` 瀵艰嚧鐨勫墠绔瀯寤烘姤閿欙紙椤哄甫淇ソ锛夈€?

**涓夌涓€缁燂細** 鏈湴 `tsc --noEmit` 閫氳繃 鈫?`git push origin main` 鈫?SFTP 涓婁紶 `dist/` 鈫?`pm2 restart qas-api`銆?


### v0.62 鈥?2026-04-20

**鍗虫ⅵ瀛ゅ効浠诲姟鑷姩鎭㈠**

褰撳嵆姊﹀悗鍙板凡缁忓紑浜嗕换鍔′絾鍓嶇/鍚庣鍥犵綉缁滄姈鍔ㄣ€丆LI 瓒呮椂鎴栨湇鍔￠噸鍚瓑鍘熷洜娌℃嬁鍒?`submit_id` 鏃讹紝涔嬪墠浼氬彉鎴愭案杩滈涓嶅洖 H5 鐨?瀛ゅ効浠诲姟"銆傛湰鐗堝姞鍏ュ畬鏁存仮澶嶉摼璺細

- **[api] 鎻愪氦鎰忓浘棰勭櫥璁?*锛歚/api/video/dreamina/submit` 鍦ㄨ繘鍏?CLI 鍓嶅厛鎶婃彁浜ゆ剰鍥撅紙`projectId + shotIndex + 鏈€缁?prompt + submittedAt`锛夋寔涔呭寲鍒?`<API_DATA_DIR>/output/batch-jobs/dreamina-intents.json`銆傛嬁鍒?`submit_id` 鍚庣珛鍗虫爣 resolved锛涗换鎰忓け璐ヨ矾寰勪篃淇濈暀 intent 涓?pending锛屼互渚垮悗鍙板厹搴曘€?
- **[api] 鍚庡彴 scanner**锛氭湇鍔″惎鍔ㄥ悗姣?2 鍒嗛挓鑷姩璺戜竴娆?`runRecoveryScan()`鈥斺€旇皟鐢?`list_task.py --limit 50` 鎷夊嵆姊﹁处鍙疯繎 50 鏉′换鍔★紝瀵规瘡涓?pending intent 鎸?(1) prompt fingerprint 绮剧‘鍖归厤銆?2) prompt 鍓嶇紑鍙屽悜鍖呭惈銆?3) 鏃堕棿绐?+ 浠诲姟绫诲瀷鍏滃簳 鐨勯『搴忓弽鏌ュ€欓€?submit_id锛涘懡涓悗鑷姩 `addJob` 娉ㄥ唽杩?batch-jobs 闃熷垪锛岀幇鏈?poller 浼氭妸鎴愮墖钀界洏骞剁粡 SSE 鎺ㄥ洖 H5銆俻ending 瓒呰繃 30 鍒嗛挓鏍?expired 涓嶅啀鎵€?
- **[api] 璇婃柇/鎵嬪姩鎺ュ彛**锛氭柊澧?`GET /api/video/dreamina/recover/pending` 鏌ョ湅寰呮仮澶?intent銆乣POST /api/video/dreamina/recover/scan` 绔嬪嵆瑙﹀彂涓€娆℃壂鎻忋€?
- **[frontend] submit body 瀛楁琛ュ叏**锛歚ProductionWizard` 鐨勫嵆姊︽彁浜?body 鏂板 `projectId / shotIndex / shotDescription`锛岀粰鍚庣 intent 鐧昏鎻愪緵蹇呰閿氱偣銆?
- **[infra]** `h5-video-tool-api/src/services/dreaminaRecovery.ts`锛堟柊鏂囦欢锛寏300 琛岋級+ `dreaminaVideo.ts` 瀵煎嚭 `listDreaminaTasks()` + `index.ts` 鍚姩鏃?`startRecoveryScanner()`銆?

### v0.61 鈥?2026-04-20

**鍏ㄥ眬鐢熸垚闃熷垪鐪嬫澘 + 鐗堟湰鍘嗗彶鏃堕棿绾?*

- **[frontend] 鐗堟湰鍘嗗彶鏃堕棿绾?*锛氭柊澧?VersionTimeline 鍙鍖栨椂闂磋酱缁勪欢锛屾浛鎹?StepStoryboardPreviewPanel 涓殑绠€鍗曠増鏈垪琛紝浠ュ瀭鐩存椂闂寸嚎褰㈠紡灞曠ず姣忎釜瑙嗛鐗堟湰鐨勭敓鎴愭椂闂淬€佹潵婧愮被鍨嬶紙鎵归噺鐢熸垚/鍗虫ⅵ鐢熸垚/鎵嬪姩涓婁紶锛夈€佹寔涔呭寲鐘舵€侊紝鏀寔鎶樺彔/灞曞紑銆佷竴閿繚鐣欏綋鍓嶇増鏈?


### v0.60 鈥?2026-04-20

**楂樼骇鍒剁墖鍏ㄩ摼璺綋妫€锛歅0 闃绘柇淇 + P1 浣撻獙寮哄寲**

**Bug Fix (P0 闃绘柇鐐?:**
- **[frontend] A/B 瀵规瘮瑙嗛 URL 閿欎綅**锛歚StepStoryboardAbCompare.resolveUrl` 璇妸 `videoPath` 鎷兼垚 `/api/batch-jobs/video/<id>`锛涚粺涓€鏀硅蛋 `getVideoFileUrl`锛屽苟琛ヤ笂 `<video onError/onLoadStart>` 澶辫触鍙嶉锛圥0-1锛?
- **[frontend] AI 瀹＄墖鍒囬暅鏁版嵁涓蹭綅**锛歚useProductionShotReview` 鍒囨崲鍒嗛暅鏃朵笉鍐嶆畫鐣欐棫璇勫缁撴灉锛宍handleApplySuggestion` 鏍￠獙 `reviewedShotIdx === selectedShotIdx` 鎵嶅厑璁稿啓鍥烇紝閬垮厤"A 闀滃ご寤鸿钀藉埌 B 闀滃ご"锛圥0-2 / P0-3锛?
- **[api] batch-jobs 鍒楄〃/SSE 璺ㄧ敤鎴锋硠婕?*锛歚GET /api/batch-jobs` 鍜?SSE 娴佺粺涓€鎸?`req.user.username` 杩囨护锛宍GET /api/batch-jobs/video/:id` 鏂板鎵€鏈夋潈鏍￠獙锛圥0-4 / P1-3锛?
- **[api] /api/video/file 鏃?JWT 鏃佽矾**锛氭柊澧?`fileAccessToken`锛團AT锛孒MAC 绛惧悕鐭湡 token锛夛紝`/api/video/file` 涓?`/api/batch-jobs/video/:id` 蹇呴』甯?JWT 鎴?FAT锛岀櫥褰曟帴鍙ｈ繑鍥?FAT锛圥0-5锛?
- **[api] Dreamina 鎻愪氦涓?batch-job 娉ㄥ唽鍘熷瓙鍖?*锛氭敞鍐屽け璐?3 娆℃寚鏁伴€€閬块噸璇曪紝浠嶅け璐ユ椂娓呮鎻愮ず"璇锋墜鍔ㄧ偣銆屾鏌ヨ繘搴︺€?锛沺roduction 杞浠?10 min/5 min 姝荤瓑鏀逛负 45s/90s/180s 鎸囨暟閫€閬匡紙P0-6 / P1-2锛?
- **[api] asset-library 涓婁紶鏂板 fileFilter**锛氬彧鍏佽 image/video/audio MIME 鎴栫櫧鍚嶅崟鎵╁睍鍚嶏紝闃绘柇闈為鏈熸枃浠剁被鍨嬶紙P0-7锛?
- **[api] localUpload 鐢ㄦ埛闅旂**锛氫笂浼犵洰褰曟敼涓?`uploads/<username>/`锛岀Щ闄ゅ叏灞€ `uploadRegistry`锛涙墍鏈夋帴鍙ｅ己鍒?JWT 鏍￠獙锛圥0-8锛?
- **[frontend] 鐢熸垚鍒嗛暅琛ㄨ鐩栧凡鏈夊獟璧?*锛歚handleL3` 浜屾鐢熸垚鍓嶅脊纭锛屽苟鎸?`shotIndex` 鍚堝苟淇濈暀 `previewStill*/previewVideo*/pendingVideoSubmitId` 绛夊獟璧勫瓧娈碉紙P0-9锛?

**Feature / 浼樺寲 (P1):**
- **[api] Compass LLM 429/5xx 閫€閬夸笌 Key 杞崲**锛歚promptPolish.postCompassChatCompletions` 鏀寔 429/5xx 閲嶈瘯銆佸皧閲?`Retry-After`锛屽苟鍦ㄩ噸璇曟椂鑷姩鍒囨崲鍒?`COMPASS_API_KEY2`锛圥1-11锛?
- **[api] editorExport 鍙嶈В琛ラ綈 /api/production/image 璺緞**锛氬鍑烘椂鐨勫皝闈?棣栧抚鍥句篃鑳借姝ｇ‘鏄犲皠鍒版湰鍦版枃浠讹紙P1-12锛?
- **[api] editorAssets 鍒嗙墖涓婁紶纭寲**锛歚chunkUpload` 鏂板 `EDITOR_CHUNK_MAX_MB` 鍗曠墖涓婇檺锛堥粯璁?20 MB锛夛紝鏍￠獙 `totalChunks 鈮?鎺ㄥ涓婇檺`銆乣chunkIndex < totalChunks`锛涚粍瑁呮敼涓烘祦寮?pipe + 瑁呴厤鍓嶆€诲瓧鑺傞妫€锛圥1-8 / P1-9锛?
- **[api] sha256 娴佸紡璁＄畻**锛歚assetIngestService.sha256File` 涓嶅啀 `readFileSync` 鏁翠釜澶ц棰戯紝鏀逛负 `createReadStream` 鍒嗗潡 update锛圥1-10锛?
- **[frontend] 椋庢牸鍙傝€冨浘鏀瑰瓨鏈嶅姟绔?URL**锛氱珛椤逛笂浼?styleRef 鍚庡苟琛?`uploadProductionImage` 鎷垮洖 `/api/production/image?path=...`锛屾浛鎹?`meta.styleRefImageDataUrl`锛岃崏绋?JSON 涓嶅啀鎼哄甫 MB 绾?data: URL锛圥1-14锛?
- **[api] videoMultishot Dreamina 骞跺彂闂搁棬**锛歚runMultishotJob` 姣忎竴闀滆繘鍏?Dreamina CLI 鍓?`acquireDreaminaSlot()`锛屼笌 `/dreamina/submit` 鍏辩敤鍚屼竴淇″彿閲忥紝閬垮厤瓒呴厤锛圥1-1锛?
- **[api] videoMultishot 閲嶅惎鎭㈠**锛氭柊澧?`recoverMultishotJobsOnBoot()`锛屽惎鍔ㄦ椂鎶婃畫鐣?pending/running 浠诲姟钀戒负 error锛岄檮甯?鏈嶅姟閲嶅惎"鍘熷洜锛圥1-6锛?
- **[frontend] 杩炵画鎾斁鍣?onError 鍙**锛歚StepStoryboardContinuousPlay` 鐨?`play().catch` 涓嶅啀闈欓粯锛屽睍绀?褰撳墠鍒嗛暅鍔犺浇澶辫触锛坈ode X锛夛紝鍙烦杩?锛圥1-4锛?
- **[frontend] 鏈煙 /api/ 瑙嗛 URL 缁熶竴鍩哄潃**锛歚resolveProductionShotPreviewVideoSrc` 瀵?`/api/...` 涔熸嫾涓?`VITE_API_BASE_URL`锛圥1-5锛?
- **[frontend] 璧勪骇瀵煎叆杩涘害鍚?skipped**锛欼mportJob 鏆撮湶 `skipped`锛岃繘搴︽潯鏀逛负 (processed+failed+skipped)/total锛孶I 澶氬嚭"璺宠繃"缁熻锛圥1-7锛?
- **[frontend] CharacterLookTree 澶辫触灞傛毚闇?job.error**锛歚title` 灞曠ず鍚庣閿欒鍘熷洜锛屼究浜庢帓闅滐紙P1-15锛?
- **[api] editorExport 缂哄け鐗囨瀹归敊**锛氬崟涓礌鏉愭壘涓嶅埌鏃惰烦杩囪€岄潪鏁存潯澶辫触锛岃嚦灏戣繕鏈変竴娈靛彲鐢ㄥ嵆鍙鍑猴紙P1-18锛?
- **[api] editorExport /export/:jobId 鏄庣‘鎻愮ず**锛氭湇鍔￠噸鍚鑷?job 涓㈠け鏃惰繑鍥?`EXPORT_JOB_NOT_FOUND` 鍜屽弸濂芥枃妗堬紝鎻愮ず鐢ㄦ埛鍘汇€屽巻鍙插鍑恒€嶆煡鐪嬩骇鐗╋紙P1-17锛?
- **[api] productionPersist 娉ㄩ噴淇**锛氭妸"鍘绘帀鎵€鏈?data: URL"鐨勯敊璇敞閲婁慨姝ｄ负"浠呯櫧鍚嶅崟 previewStillDataUrl"锛岄槻姝㈡湭鏉ヨ浼?imageDataUrl / previewVideoUrl锛圥1-13锛?

**Skipped / 鍚庣画浼樺寲锛堟湰杞湭鍔級:**
- P1-16锛氬埗鐗囨壒閲忕敓鍥?CONCURRENCY=1 鏄埢鎰忚缃紝闇€閰嶅鍘嬫祴鍐嶆斁瀹?
- P1-19锛欰I 瀹＄墖鐗堟湰鍘嗗彶灞炰簬鏂板姛鑳芥嫇灞?

**Changed:**
- 鐧诲綍鍝嶅簲浣撴柊澧?`fileAccessToken` 瀛楁
- `.env.example` 寤鸿鏂板 `FILE_ACCESS_TOKEN_SECRET`銆乣EDITOR_CHUNK_MAX_MB`

---

### v0.59 鈥?2026-04-17

**涓夊ぇ鏍稿績鍔熻兘 UX 鍏ㄩ潰浼樺寲锛堥珮绾у埗鐗?+ 瑙嗛鍓緫 + 绱犳潗搴擄級**

**Feature:**
- **[frontend] App.tsx 璺敱鎳掑姞杞?*锛氭墍鏈夐〉闈㈢粍浠舵敼涓?React.lazy + Suspense 鍔ㄦ€佸鍏ワ紝棣栧睆鍔犺浇浣撶Н澶у箙鍑忓皯
- **[frontend] 鍏ㄥ眬 Error Boundary**锛氭柊澧?AppErrorBoundary 鍖呰９鏁翠釜璺敱锛屽瓙缁勪欢娓叉煋宕╂簝鏃跺睍绀哄弸濂介敊璇〉鑰岄潪鐧藉睆
- **[frontend] 绱犳潗搴撳垹闄ゅ姛鑳?*锛氱礌鏉愬崱鐗?hover 鏄剧ず鍒犻櫎鎸夐挳锛屾壒閲忛€変腑鍚庢敮鎸佹壒閲忓垹闄わ紱AssetGallery 鏂板娴姩鎿嶄綔鏍忥紙绉诲姩鍒版枃浠跺す / 鎵归噺鍒犻櫎 / 鍙栨秷閫夋嫨锛?
- **[api] 绱犳潗杞垹闄?API**锛氭柊澧?DELETE /assets/:id 鍗曚釜杞垹闄?+ POST /assets/batch-delete 鎵归噺杞垹闄わ紙鍗曟鏈€澶?200锛夛紱ssets 琛ㄦ柊澧?deleted_at 鍒楋紝鎵€鏈夋煡璇㈣嚜鍔ㄨ繃婊ゅ凡鍒犻櫎绱犳潗
- **[frontend] 绱犳潗搴?鈫?楂樼骇鍒剁墖/瑙嗛鐢熸垚娣卞害閾炬帴**锛氱礌鏉愯鎯呮娊灞夋柊澧炪€岀敤浜庨珮绾у埗鐗囥€嶆寜閽烦杞?/studio/production?assetId=...锛汼tudio 鍜?ProductionWizard 鑷姩鎺ユ敹绱犳潗骞惰涓哄弬鑰冨浘
- **[frontend] 绱犳潗涓彴 鈫?鍗虫ⅵ澶氭ā鎬佸紩鐢ㄦ墦閫?*锛欴reaminaMultimodalRefs 鏂板銆屼粠绱犳潗搴撻€夋嫨銆嶆寜閽紝鎵撳紑 AssetPicker 閫夋嫨绱犳潗鍚庤嚜鍔ㄨ浆鎹负澶氭ā鎬佸紩鐢ㄩ」
- **[frontend] 绱犳潗涓彴 鈫?鍓緫鍣ㄧ礌鏉愬簱鎵撻€?*锛歁ediaLibrary 娣诲姞绱犳潗鏃惰嚜鍔ㄨ褰曚娇鐢ㄦ棩蹇楋紙
ecordUsage锛夛紝鏀寔瑙嗛鍜屽浘鐗囦袱绉嶇被鍨?
- **[frontend] 楂樼骇鍒剁墖鏈浼樺寲**锛氥€屾湇鍖栭亾銆嶆敼涓恒€岃鑹插満鏅€嶃€併€屾晠浜嬪姬銆嶆敼涓恒€屾晠浜嬫瀯鎬濄€嶃€併€孲eedance 鍧椼€嶆敼涓恒€孉I 瑙嗛鎻忚堪銆嶇瓑锛岄檷浣庝笓涓氶棬妲?
- **[frontend] 鍓緫鍣ㄥ紩瀵煎脊绐?*锛氶娆¤繘鍏ュ壀杈戝伐浣滃彴寮瑰嚭 onboarding 寮曞锛涜棰戞簮鍒囨崲鏃舵柊澧?CSS 娣″叆鍔ㄧ敾
- **[frontend] BGM 鐢熸垚 UI 閲嶆瀯**锛氬揩鎹烽鏍兼寜閽浛鎹负銆屾儏缁垎绫汇€嶏紙Mood Categories锛夐€夋嫨鍣紝鏇寸洿瑙?
- **[frontend] 楂樼骇鍒剁墖瀵煎嚭椤?Tab 鍖?*锛氬鍑哄伐浣滃尯鎷嗗垎涓恒€屽鐗囦笌鍓緫銆嶅拰銆孉I 瑙嗛鎻忚堪銆嶄袱涓?Tab锛屽悇鍙稿叾鑱?
- **[frontend] 绱犳潗涓婁紶鍚庤嚜鍔ㄦ粴椤?+ 鏂扮礌鏉愰珮浜?*锛氫笂浼犲畬鎴愬悗椤甸潰鑷姩婊氬埌椤堕儴锛屾柊涓婁紶绱犳潗 3 绉掗珮浜棯鐑佹彁绀?
- **[api] 绱犳潗鍖归厤澧炲己**锛歮atchAssetsForShot 鍚屾椂鎼滅储 legacy JSON 璧勪骇鍜?SQLite 绱犳潗涓彴鏁版嵁锛屾彁鍗囧尮閰嶈鐩栫巼
- **[frontend] React key 璀﹀憡淇**锛欰ssetDetailDrawer 鍜?TemplateMarket 涓慨澶嶉潪鍞竴 key 瀵艰嚧鐨?console 璀﹀憡
- **[frontend] Layout 鍙闂€?*锛氫晶杈规爮鎸夐挳鏂板 ria-label锛宐ackdrop 鏂板 
ole="presentation"
- **[frontend] 瀵煎嚭鎻愮ず浼樺寲**锛歁ock 妯″紡瀵煎嚭瀹屾垚鎻愮ず鏀逛负銆屽鍑哄畬鎴愶紒鏂囦欢姝ｅ湪鍚庡彴澶勭悊涓紝璇风◢鍚庡湪鍘嗗彶璁板綍鏌ョ湅銆?
- **[frontend] 楂樼骇鍒剁墖瀵煎嚭鍘婚噸澧炲己**锛氥€屽湪鍓緫鍣ㄤ腑鎵撳紑銆嶄紭鍏堜娇鐢?sourceProductionProjectId 杩涜椤圭洰鍘婚噸鍖归厤
- **[frontend] 鍒剁墖鍚戝姝ラ鍙揪鎬?*锛氭牴鎹」鐩畬鎴愬害鍔ㄦ€佽绠楁渶澶у彲杈炬楠わ紝鏈В閿佹楠ゆ樉绀虹鐢ㄦ€?

### v0.58 - 2026-04-17

**Editor Agent intelligence upgrade: multi-model Plan -> Build pipeline with three-level fallback**

**Feature:**
- **[api] Plan -> Build two-stage architecture**: Split the previous single LLM call into a Plan stage for natural-language reasoning and a Build stage for TimelineProject JSON generation. The Plan stage uses DeepSeek-R1, while the Build stage uses GPT-4.1.
- **[api] Three-level fallback**: If the Build model fails to produce valid JSON, the API retries with GPT-4o, then falls back to a simplified prompt generation path.
- **[api] Per-call model override**: `compassChatCompletionWithUsage` now accepts a `model` parameter, with `EDITOR_AGENT_PLAN_MODEL`, `EDITOR_AGENT_BUILD_MODEL`, and `EDITOR_AGENT_FALLBACK_MODEL` environment variables.
- **[api] Prompt and candidate-window reduction**: The Plan prompt was reduced from 3000+ tokens to about 500 tokens, the Build prompt to about 300 tokens, and the candidate window to top 20.
- **[frontend] Quick command templates**: The Agent panel shows first-use presets such as battle remix, character showcase, TikTok teaser, and high-energy remix with music.

**Benchmark:**
- Previous approach: gemini-2.5-flash single call, 15.1s / 4388 tokens / higher JSON failure rate.
- New approach: DeepSeek-R1 Plan + GPT-4.1 Build, about 8s / about 2500 tokens / much lower failure rate after fallback.

---

### v0.57 鈥?2026-04-17

**鍓緫宸ヤ綔鍙帮細瑙嗛绱犳潗鎵归噺涓婁紶 + 鎷栨嫿涓婁紶**

**Feature:**
- **[editor] 鎵归噺瑙嗛涓婁紶**锛氭枃浠堕€夋嫨鍣ㄦ敮鎸佸閫夛紙`<input multiple>`锛夛紝涓€娆￠€夋嫨澶氫釜瑙嗛鏂囦欢鍚庨€愪釜椤哄簭涓婁紶锛涗笂浼犺繃绋嬩腑鏄剧ず鎵归噺闃熷垪闈㈡澘锛屽寘鍚€昏繘搴︽潯銆佹瘡涓枃浠剁殑鐙珛鐘舵€佸浘鏍囷紙寰呬笂浼?涓婁紶涓?瀹屾垚/澶辫触锛夊拰瀹炴椂杩涘害鐧惧垎姣?
- **[editor] 鎷栨嫿涓婁紶**锛氱礌鏉愬垪琛ㄥ尯鍩熸敮鎸?Drag & Drop锛屾嫋鍏ヨ棰戞枃浠舵椂鏄剧ず钃濊壊铏氱嚎瑕嗙洊鎻愮ず銆屾澗寮€榧犳爣涓婁紶瑙嗛銆嶏紱鑷姩杩囨护闈炶棰戞枃浠讹紝浠呭鐞嗚棰戞牸寮?
- **[editor] 绌烘€佸紩瀵间紭鍖?*锛氱礌鏉愬簱涓虹┖鏃舵樉绀鸿櫄绾挎嫋鎷藉尯鍩燂紝寮曞鐢ㄦ埛鎷栨嫿鏂囦欢鎴栫偣鍑绘寜閽笂浼?
- **[editor] 鏂囦欢澶у皬鏍￠獙澧炲己**锛氭壒閲忎笂浼犳椂閫愪釜鏍￠獙鏂囦欢澶у皬锛岃秴闄愭枃浠惰烦杩囧苟鎻愮ず鍏蜂綋鏂囦欢鍚嶅拰澶у皬锛屼笉褰卞搷鍏朵綑鏂囦欢涓婁紶

---

### v0.56 鈥?2026-04-17

**绱犳潗搴?鈫?楂樼骇鍒剁墖 鏁版嵁鎵撻€?*

**Bug Fix:**
- **[frontend] 绱犳潗涓彴銆岀敤浜庣敓鎴愩€嶆棤娉曚緵楂樼骇鍒剁墖浣跨敤**锛氱礌鏉愯鎯呮娊灞夋柊澧炪€岀敤浜庨珮绾у埗鐗囥€嶆寜閽紝鐩存帴璺宠浆 `/studio/production?assetId=...`锛涘師銆岀敤浜庣敓鎴愩€嶆寜閽洿鍚嶄负銆岀敤浜庤棰戠敓鎴愩€嶄互鍖哄垎涓や釜鍏ュ彛
- **[frontend] 楂樼骇鍒剁墖銆屼粠绱犳潗搴撻€夋嫨銆嶇湅涓嶅埌绱犳潗**锛歚CharacterWardrobePanel` 鍘熸潵璋冪敤鏃?`/api/assets` 绱㈠紩锛圝SON 鏂囦欢锛夛紝涓庢柊绱犳潗涓彴 `/api/asset-library` 鏄袱濂楁暟鎹簰涓嶇浉閫氥€傚凡鏀逛负浣跨敤 `listAssets()` 浠庢柊绱犳潗涓彴鍔犺浇鍥剧墖绫诲瀷绱犳潗锛岀缉鐣ュ浘鍜岄€夋嫨閫昏緫鍚屾閫傞厤 `buildAssetFileUrl`

---

### v0.55 鈥?2026-04-16

**鐧捐€佹眹绛戞ⅵ甯?鈥?Loading 浣撻獙鍏ㄩ噺鎺ュ叆**

**Feature:**
- **[frontend] Loading 缁勪欢浣撶郴閲嶆柊涓婚鍖?*锛坄src/components/loading/`锛夛細灏嗗湴鐗富棰樺叏闈㈡浛鎹负銆岀櫨鑰佹眹绛戞ⅵ甯堛€嶅墽闄㈤殣鍠汇€? 涓墽闄㈢┖闂达紙缂栧墽瀹?鎺掔粌鍘?绮句慨瀹?棣栨紨鍙?宸℃紨鍘?澶у巺/閬撳叿闂达級銆?1 涓箷鍚庤鑹诧紙鑱斿悎缂栧墽/鎽勫奖甯?鐏厜甯?鑸炲彴鐩戠潱/鍒剁墖浜?鍓緫甯?浣滄洸瀹?鍖栧甯?閬撳叿甯?缁忕邯浜?寮曞骇鍛橈級銆佷笁娈甸€掕繘鏂囨閾俱€佸墽闄富棰樺僵铔嬶紙鑱氬厜鐏嫋鍔?骞曞竷鎷夊紑/鎺屽０瑙﹀彂/鐏垫劅楠板瓙锛?
- **[frontend] `TheaterLoadingScreen` 鍏ㄥ睆鍓ч櫌 Loading 缁勪欢**锛氭浛浠?`DungeonLoadingScreen`锛屽墽闄㈤噾+娣辩孩閰嶈壊浣撶郴銆佽仛鍏夌伅鎵繃鑸炲彴杩涘害鏉°€佸満鏅爣璇嗗窘绔?
- **[frontend] `RunningStatus` 缁勪欢鍗囩骇**锛氭柊澧炲彲閫?`scene` prop锛屼紶鍏ュ墽闄㈠満鏅悗 >3s 鑷姩鍗囩骇涓哄崱鐗囧紡瑙掕壊鏂囨杞挱锛屼笉浼犳椂淇濇寔鍘熸湁琛屼负锛堝畬鍏ㄥ悜鍚庡吋瀹癸級
- **[frontend] 10+ 涓瓑寰呭満鏅叏閲忔帴鍏ュ墽闄綋楠?*锛?
  - 楂樹紭鍏堢骇锛歋tepVideo锛堣棰戠敓鎴愨啋鎺掔粌鍘咃級銆丵uickFilm锛堜竴閿垚鐗団啋缂栧墽瀹?棣栨紨鍙帮級銆丼tepDesignHeader锛堣ˉ鍏ㄧ己鍥锯啋閬撳叿闂达級
  - 涓紭鍏堢骇锛欱gmMixPanel锛圔GM鈫掔簿淇锛夈€丠istory锛堣棰戝悎骞垛啋绮句慨瀹わ級銆丒xportPanel锛堝鍑衡啋棣栨紨鍙帮級銆丆haracterWardrobePanel锛堝畾濡嗗浘鈫掗亾鍏烽棿锛?
  - 杞讳紭鍏堢骇锛歍abGenerate锛圥rompt 娑﹁壊鈫掔紪鍓у锛夈€乀abDistribute锛堟枃妗堢敓鎴愨啋宸℃紨鍘咃級銆丄ssetImportPanel锛堢礌鏉愪笂浼犫啋閬撳叿闂达級銆丳rojectList锛堥」鐩姞杞解啋澶у巺锛夈€丮ultiShotPromptInput锛堝垎闀滃抚鈫掓帓缁冨巺锛?
- **[api] Loading 璧勪骇鐢熸垚鑴氭湰鍗囩骇**锛坄scripts/generate-loading-assets.ts`锛夛細Prompt 鍏ㄩ潰鏀逛负鍓ч櫌涓婚锛堢紪鍓у妗岄潰/鎺掔粌鍘呰垶鍙?绮句慨瀹ゆ贩闊冲彴/棣栨紨澶у箷/宸℃紨鍔炲叕瀹?鍓ч櫌澶у巺/閬撳叿闂达級锛孲UNO 闊虫晥鏀逛负鍓ч櫌鐜闊筹紙鎵撳瓧鏈哄０/鑸炲彴鍥炲搷/璁惧鍡￠福/棣栨紨搴忔洸/鐖靛＋閽㈢惔/鎵嬪伐姘涘洿锛夛紝鍦烘櫙浠?5鈫? 涓?

---

### v0.54 鈥?2026-04-16

**楂樼骇鍒剁墖锛氳鑹茬姸鎬佸彉浣撲紭鍖?鈥?褰㈣薄婕斿寲 & 鐘舵€佽。姗卞姛鑳芥墦閫?*

**Feature:**
- **[frontend] 鐘舵€佽。姗?statePrompt 缂栬緫**锛氭瘡涓鑹茬姸鎬佹柊澧?宸紓鎻忚堪"鏂囨湰妗嗭紙`statePrompt`锛夛紝AI 鐢熷浘鏃朵互姝や负鏍稿績宸紓鎻忚堪锛堣€岄潪浠呯敤 label锛夛紝澶у箙鎻愬崌鍙椾激/绔ュ勾/鎹㈣绛夌姸鎬佸浘鐢熸垚璐ㄩ噺
- **[frontend] 棰勮妯℃澘澧炲己**锛氶璁句粠绾?label 鍗囩骇涓?`StatePresetItem`锛堝惈 label + statePrompt锛夛紝鏂板"骞撮緞鍙樺寲"棰勮缁勶紙绔ュ勾/闈掑勾/涓勾/鑰佸勾锛夛紝姣忎釜棰勮鑷甫璇︾粏宸紓鎻忚堪
- **[frontend] 鑷畾涔夌姸鎬?UX 閲嶆瀯**锛?+ 鑷畾涔?闈㈡澘鍚屾椂杈撳叆鍚嶇О鍜屽樊寮傛弿杩帮紝娣诲姞鍚庤嚜鍔ㄥ睍寮€缂栬緫闈㈡澘锛涚姸鎬佸崱鐗囨樉绀?prompt 鎽樿棰勮锛屾棤鎻忚堪鐨勬樉绀?+ 娣诲姞鎻忚堪"寮曞
- **[frontend] 鍒嗛暅瑙掕壊鐘舵€佸浘鎺ュ叆**锛歚buildShotMultimodalRefPack` 鍙婂叾寮傛鐗堟敼鐢?`getCharacterShotImage()`锛屾寜浼樺厛绾ч€夊彇鐘舵€佸浘锛堝垎闀滄墜鍔ㄨ鐩?> 瑙掕壊榛樿婵€娲荤姸鎬?> lookTree 瀹氱鍥撅級锛屽垎闀滀晶鏍忕缉鐣ュ浘鍜屽妯℃€佸紩鐢ㄩ潰鏉垮悓姝ュ垏鎹?
- **[frontend] 缁熶竴鐘舵€佹ā鍨?*锛?+ 娣诲姞鐘舵€?鎸夐挳浠庡湪 lookTree 涓婂垱寤哄瓙鑺傜偣鏀逛负鍦?`states[]` 涓婂垱寤?`CharacterState`锛屾秷闄や袱濂楀苟琛屾暟鎹粨鏋勭殑姒傚康娣蜂贡
- **[api] 褰㈣薄搴?lookTree 鎸佷箙鍖?*锛歚/api/character-library/save` 鍜?import 鎺ュ彛鎵╁睍 `lookTree` + `activeLookId` 瀛楁锛岃法椤圭洰瀵煎叆鏃惰嚜鍔ㄦ仮澶嶅舰璞℃紨鍖栨爲

**Bugfix:**
- **[api] 鐘舵€佽。姗?AI 鐢熷浘鎶?base64 padding 閿欒**锛氬綋 `baseImageDataUrl` 缁忚繃 `uploadProductionImage` 鍚庡彉涓?HTTP URL 鏃讹紝`dataUrlToRawBase64()` 鍘熸牱浼犵粰 Python 鑴氭湰瀵艰嚧 `binascii.Error: Incorrect padding`銆傛柊澧?`resolveToRawBase64()` 寮傛鍑芥暟锛岃嚜鍔ㄦ娴嬪苟 fetch HTTP URL 杞负 base64锛岃鐩?`/frames`锛堥闀?+ 闈為闀滐級鍜?`/portrait` 璺敱

---

### v0.53 鈥?2026-04-16

**绱犳潗搴撴€ц兘浼樺寲锛氱缉鐣ュ浘 + ReviewQueue 鍒嗛〉 + 閿欒鏍囩娓呯悊**

**Feature:**
- **[api] 缂╃暐鍥炬湇鍔?* (`assetThumbnailService.ts`)锛氫笂浼犳椂鑷姩鐢熸垚 300脳300 JPEG 缂╃暐鍥撅紙鍥剧墖鐢?sharp銆佽棰戠敤 ffmpeg 鍙栭甯э級锛屽瓨鏀句簬鍘熸枃浠跺悓鐩綍 `.thumbs/` 瀛愭枃浠跺す
- **[api] `GET /assets/:id/thumb`** 绔偣锛氫笓闂ㄦ湇鍔＄缉鐣ュ浘锛屾敮鎸?token query 璁よ瘉锛?4h 娴忚鍣ㄧ紦瀛橈紱缂╃暐鍥句笉瀛樺湪鏃惰Е鍙戝紓姝ョ敓鎴愬苟鍥為€€鍘熸枃浠?
- **[api] `POST /generate-thumbnails`** 绔偣锛氫竴閿壒閲忎负鎵€鏈夊瓨閲忕礌鏉愯ˉ鐢熸垚缂╃暐鍥?
- **[api] `GET /pending-tags`** 绔偣锛氬垎椤佃繑鍥炲緟纭鏍囩锛堟浛浠ｅ師鏉ヤ竴娆℃媺 100 鏉″叏閲忔柟妗堬級
- **[api] 鍏ㄩ儴 asset 鍒楄〃 API** 杩斿洖 `thumbnail_url` 瀛楁锛坅ssets/search/favorites/recent锛?
- **[frontend] AssetCard** 缃戞牸瑙嗗浘浣跨敤缂╃暐鍥炬覆鏌擄紝瑙嗛绱犳潗浠?hover 鏃跺姞杞藉師濮嬭棰戞祦
- **[frontend] ReviewQueue** 鍒嗛〉鍖栵紙姣忛〉 20 鏉★級锛屼笉鍐嶄竴娆″姞杞芥墍鏈夌礌鏉愮瓫閫?pending
- **[data] 娓呯悊 28 涓?ai_tag_error 閿欒鏍囩**锛屼粠閿欒淇℃伅涓仮澶?9 涓礌鏉愮殑 AI 鍒嗙被

---

### v0.52 鈥?2026-04-16

**H5 鍦扮墷涓婚 Loading 浣撻獙缁勪欢 & 璧勪骇鐢熸垚宸ュ叿**

**Feature:**
- **[frontend] Loading 缁勪欢浣撶郴鏂板缓**锛坄src/components/loading/`锛夛細缁熶竴绛夊緟绠＄悊鍣?`useLoadingOrchestrator` Hook + 鍏ㄥ睆涓婚鍖栧睍绀虹粍浠?`DungeonLoadingScreen`锛屾敮鎸?5 涓満鏅紙鍦扮墷鍏ュ彛/閰掗/閾佸尃閾?缁撶畻鍙?鏂嚎閲嶈繛锛夈€佹椂闀垮垎绾ц嚜鍔ㄥ崌绾э紙0-1s/1-3s/3-8s/8-15s/15s+锛夈€侀潪绾挎€ц繘搴︽潯銆佽鑹插寲鏂囨涓夋閫掕繘锛堝畧闂ㄤ汉/閰掗鑰佹澘/閾佸尃/缁撶畻鍚?鏃佺櫧锛夈€佸僵铔嬬郴缁燂紙鏁查棬鍥炲槾/鐏妸鐐逛寒/浠婃棩鍛界/瀹夋姎绀煎寘锛?
- **[api] Loading 璧勪骇鐢熸垚鑴氭湰**锛坄scripts/generate-loading-assets.ts`锛夛細璋冪敤 Compass/Imagen 鎵归噺鐢熸垚鍦烘櫙鑳屾櫙鍥撅紙16:9锛屾敮鎸佹父鎴忓師鐢荤敾椋庡弬鑰冮攣瀹氾級+ 璋冪敤 SUNO 鎵归噺鐢熸垚鍦烘櫙鐜闊虫晥锛堢函鍣ㄤ箰 MP3锛夛紝宸插瓨鍦ㄨ祫浜ц嚜鍔ㄨ烦杩囷紝鏀寔 `--images-only` / `--audio-only` 鍙傛暟
- **[frontend] shimmer 鍔ㄧ敾鍏抽敭甯?*锛歚index.css` 鏂板杩涘害鏉″厜娉芥祦鍔ㄥ姩鐢?

**璧勪骇娓呭崟锛坥utput/loading-assets/锛夛細**
- 5 寮?16:9 鍦烘櫙鑳屾櫙鍥撅紙Imagen + Gold And Glory 鍘熺敾鐢婚鍙傝€冿級
- 10 棣栧満鏅幆澧冮煶鏁堬紙SUNO V4.5 绾櫒涔愶紝姣忓満鏅?2 棣栧閫夛級

---

### v0.51 鈥?2026-04-16

**涓€閿垚鐗囦覆琛屾彁浜ら槦鍒?+ 鎵归噺鍙栨秷**

**Feature:**
- **[api] QuickFilm 涓茶鎻愪氦闃熷垪**锛歚POST /quickfilm/:jobId/confirm` 鏀逛负鍙彁浜ょ涓€涓垎闀滃埌鍗虫ⅵ锛屽叾浣欏垎闀滀互 `awaiting_submit` 鐘舵€佸瓨鍏?`batchJobsQueue`銆傚綋鍓嶄竴涓换鍔″畬鎴愭垨澶辫触鏃讹紝闃熷垪鑷姩鎻愪氦涓嬩竴涓€傞伩鍏嶅鍒嗛暅鍚屾椂鎻愪氦瑙﹀彂鍗虫ⅵ骞跺彂瓒呴檺锛坮et=1310 ExceedConcurrencyLimit锛?
- **[api] `batchJobsQueue` 澧炲己**锛氭柊澧?`awaiting_submit` 鐘舵€佸拰 `submitParams` 瀛楁锛涙柊澧?`submitNextQuickfilmShot()` 鑷姩鎻愪氦閫昏緫锛岀敱 `pollSingleJob` 鍦ㄤ换鍔＄粓鎬佹椂瑙﹀彂锛涙柊澧炴湇鍔″櫒閲嶅惎鎭㈠鏈哄埗锛坧oller tick 妫€娴嬪埌鏃犳椿璺冧换鍔′絾鏈?awaiting_submit 鏃惰嚜鍔ㄧ画鎺ワ級
- **[api] 鎵归噺鍙栨秷鎺ュ彛**锛氭柊澧?`DELETE /api/batch-jobs/project/:projectId`锛屼竴娆″彇娑堥」鐩唴鎵€鏈夋湭瀹屾垚浠诲姟锛坧ending / queuing / processing / awaiting_submit锛?
- **[frontend] 鎵归噺浠诲姟鐪嬫澘澧炲己**锛氭柊澧炪€屽彇娑堝叏閮ㄦ帓闃熴€嶆寜閽紱鐘舵€佹眹鎬昏鏂板銆屽緟鎻愪氦 N銆嶈鏁帮紱`awaiting_submit` 鐘舵€佹樉绀轰负銆岎煏?鎺掗槦寰呮彁浜ゃ€嶅苟鏀寔鍗曠嫭鍙栨秷

**璁捐瀵归綈锛?* 澶嶇敤楂樼骇鍒剁墖锛圥roductionWizard锛夌殑涓茶鎻愪氦鎬濊矾鈥斺€斿墠涓€涓畬鎴愭墠鏀捐涓嬩竴涓€傞珮绾у埗鐗囬潬鍓嶇 Promise 閾?+ SSE 鎱㈤€熸ā寮忓疄鐜帮紱涓€閿垚鐗囬潬鍚庣 batchJobsQueue 浜嬩欢椹卞姩瀹炵幇锛岄€傞厤鏃犲墠绔暱杩炴帴鐨勫満鏅€?

---

### v0.50 鈥?2026-04-16

**P1-G 澶栭儴渚濊禆鐘舵€佹満鏍囧噯鍖栵紙绗竴闃舵锛?*

**Feature:**
- **[api] `domain/job-status.ts` 澧炲己**锛氭柊澧?7 涓湇鍔￠€傞厤鍑芥暟 `fromBatchJobStatus`銆乣fromDreaminaPhase`銆乣fromKlingPhase`銆乣fromQuickFilmStatus`銆乣fromDreaminaHttpStatus`銆乣fromEditorExportStatus`銆乣fromRemixStatus`锛屽皢鍚勬湇鍔″師鐢熺姸鎬佹槧灏勫埌缁熶竴鏋氫妇 `queued | running | succeeded | failed | timeout | canceled`銆傛柊澧?`isTerminalStatus()` 鍒ゆ柇缁堟€佸伐鍏峰嚱鏁?
- **[api] Batch Jobs SSE 鎺ㄩ€侀檮鍔?`unifiedStatus`**锛歚GET /api/batch-jobs/stream` 鍜?`GET /api/batch-jobs` 鍝嶅簲涓檮鍔?`unifiedStatus` 瀛楁锛堝悜鍚庡吋瀹癸紝涓嶆敼鍙樺師鏈?`status` 瀛楁锛夛紝鍓嶇鍙笎杩涘紡杩佺Щ
- **[frontend] `types/jobStatus.ts` 鏂板缓**锛氬墠绔粺涓€浠诲姟鐘舵€佺被鍨嬪畾涔夛紝涓庡悗绔?`domain/job-status.ts` 瀵归綈锛屾彁渚?`toUnifiedStatus()` 閫氱敤閫傞厤鍑芥暟鍜?`isTerminalStatus()` 宸ュ叿鍑芥暟
- **[frontend] `BatchJobDto.unifiedStatus` 鍙€夊瓧娈?*锛氬墠绔被鍨嬪畾涔変腑娣诲姞鍚庣鑷姩闄勫姞鐨勭粺涓€鐘舵€佸瓧娈?

**鐘舵€佹槧灏勫鐓ц〃锛?*
| 鍘熺敓鐘舵€?| 缁熶竴鐘舵€?|
|---|---|
| `pending` / `awaiting_submit` / `queued` | `queued` |
| `running` / `processing` / `queuing` / `querying` / `rendering` | `running` |
| `done` / `completed` / `succeeded` / `success` | `succeeded` |
| `failed` / `error` | `failed` |
| `cancelled` / `canceled` | `canceled` |

---

### v0.49 鈥?2026-04-16

**宸ㄧ煶鏂囦欢鎷嗗垎绗簩闃舵 鈥?LLM 瑙ｆ瀽鍑芥暟鎻愬彇 + 鍓嶇 hooks 鎷嗗垎**

**Refactor:**
- **[api] `riskSentimentParsing.ts` 鏂板缓**锛?47 琛岋級锛氫粠 `riskSentimentService.ts` 鎻愬彇 28 涓?LLM 瑙ｆ瀽/褰掍竴鍖?蹇収琛ュ叏鍑芥暟锛屽寘鎷?`parseJsonRelaxed`銆乣extractJsonObject`銆乣normalizePct3`銆乣deriveOverviewScoreFromPcts`銆乣parseKeywordMatrix`銆乣normalizeCreators`銆乣rehydrateSnapshot` 绛夈€備富鏂囦欢浠?1744 琛岄檷鑷?1051 琛岋紙鍑忓皯 693 琛岋級锛岃烦杩?Apify 閲囬泦鐩稿叧鍑芥暟
- **[frontend] `useProductionShotReview.ts` 鏂板缓**锛?16 琛岋級锛欰I 瀹＄墖 + 鍒嗛暅闂翠竴鑷存€ф鏌?hook锛屽皝瑁?`handleAiReview`銆乣handleApplySuggestion`銆乣handleApplyAllAndRegenerate`銆乣handleContinuityCheck` 鍥涗釜鍥炶皟鍙婄浉鍏?state
- **[frontend] `useProductionShotVersions.ts` 鏂板缓**锛?06 琛岋級锛氬垎闀滆棰戠増鏈鐞?hook锛屽皝瑁?`shotVideoVersions`銆乣selectShotVideoVersion`銆乣keepOnlyShotVideoVersion` 绛夌増鏈€夋嫨/娓呯悊閫昏緫銆俙ProductionWizard.tsx` 浠?1981 琛岄檷鑷?1851 琛?

**鍚庣鏂囦欢鎷嗗垎杩涘害锛坮iskSentimentService.ts锛夛細**
- `riskSentimentTypes.ts` 鈫?140 琛岋紙绫诲瀷瀹氫箟锛孭hase 1锛?
- `riskSentimentParsing.ts` 鈫?747 琛岋紙瑙ｆ瀽/褰掍竴鍖栵紝Phase 2锛?
- `riskSentimentService.ts` 鈫?1051 琛岋紙涓氬姟閫昏緫 + Apify 閲囬泦锛?
- 鍘熷琛屾暟锛?889 琛?鈫?鎷嗗垎鍚庝富鏂囦欢锛?051 琛岋紙鍑忓皯 44%锛?

---

### v0.48 鈥?2026-04-16

**绱犳潗搴?AI 涓€閿暣鐞?+ 鏂囦欢澶硅鍥?+ 鎬ц兘浼樺寲**

**Feature:**
- **[asset-library] AI 涓€閿暣鐞?*锛氶《閮ㄦ柊澧炪€岎煪?AI 涓€閿暣鐞嗐€嶆寜閽紝涓€閿畬鎴愭湭鍒嗙被绱犳潗 AI 鎵撴爣 + 鎸夊垎绫?鏂囦欢鍚嶈嚜鍔ㄥ垱寤烘枃浠跺す + 褰掓。绱犳潗
- **[asset-library] 鏂囦欢澶圭綉鏍艰鍥?*锛氬叏閮ㄧ礌鏉?Tab 榛樿鍏堝睍绀烘枃浠跺す鍗＄墖锛堢被浼?Finder锛夛紝鐐瑰嚮杩涘叆鏌ョ湅鏂囦欢澶瑰唴瀹癸紝鏈綊鍏ョ殑绱犳潗鏄剧ず鍦ㄤ笅鏂?鏈暣鐞嗙礌鏉?鍖哄煙
- **[asset-library] IntersectionObserver 鎳掑姞杞?*锛氱礌鏉愬崱鐗囧彧鍦ㄨ繘鍏ヨ鍙?200px 鑼冨洿鍐呮墠寮€濮嬪姞杞藉浘鐗?瑙嗛锛屽ぇ骞呭噺灏戦灞忚姹傞噺
- **[asset-library] 鏂囦欢澶瑰鍏?*锛氫笂浼犻潰鏉挎柊澧炪€岄€夋嫨鏂囦欢澶广€嶆寜閽紝鏀寔 webkitdirectory 鏁翠釜鏂囦欢澶瑰鍏?+ 鎷栨嫿鏂囦欢澶硅嚜鍔ㄩ€掑綊鎵弿
- **[api] POST /auto-organize**锛氬悗绔嚜鍔ㄦ暣鐞嗘帴鍙ｏ紝绛栫暐 A锛圓I 鍒嗙被锛? 绛栫暐 B锛堟枃浠跺悕鍓嶇紑锛夊彔鍔?

---

### v0.48a 鈥?2026-04-16

**AI 鍓緫鏅鸿兘浼樺寲 路 鏂瑰悜7 鐢ㄦ埛鍙嶉瀛︿範锛堝熀纭€鐗堬級**

**Feature:**
- **[api] `userPreferenceService.ts` 鏂板缓**锛氳交閲忕骇鐢ㄦ埛鍋忓ソ鐢诲儚鏈嶅姟鈥斺€斿鍑烘椂鏀堕泦琛屼负缁熻锛堢墖娈?activity 绫诲瀷銆佸钩鍧囨椂闀裤€佹暟閲忥級锛屼娇鐢?EMA锛堟寚鏁扮Щ鍔ㄥ钩鍧囷紝伪=0.3锛夊钩婊戞洿鏂帮紝閬垮厤鍗曟瀵煎嚭瑕嗙洊鍘嗗彶鍋忓ソ
- **[api] `POST /api/editor/preference/report`**锛氭帴鏀跺墠绔鍑烘椂鐨勮涓烘姤鍛婏紝鏇存柊鐢ㄦ埛鍋忓ソ JSON 鏂囦欢锛堟寜鐢ㄦ埛鍚嶉殧绂诲瓨鍌級
- **[api] `GET /api/editor/preference`**锛氭煡鐪嬪綋鍓嶇敤鎴峰亸濂界敾鍍忥紙璋冭瘯鐢級
- **[api] `buildPreferencePromptSnippet`**锛氭牴鎹敤鎴峰巻鍙插亸濂界敓鎴?LLM prompt 鐗囨锛堝"鍋忓ソ鐨勫唴瀹圭被鍨嬶細鍑绘潃鐬棿銆佸洟鎴?銆?骞冲潎鐗囨鏃堕暱 2.1绉掞紙鍋忓ソ蹇垏锛?锛夛紝鑷姩娉ㄥ叆鍓緫 Agent 鎺掔墖鏃剁殑 system prompt
- **[editor-agent] 鍋忓ソ娉ㄥ叆**锛歚editorAgentService.ts` 鐨?`buildSystemPrompt` 鏂板 `userPreferenceSnippet` 鍙傛暟锛屾帓鐗囪皟鐢ㄦ椂鑷姩鍔犺浇褰撳墠鐢ㄦ埛鍋忓ソ锛沗runEditorAgentApply` 閫氳繃 `options.username` 浼犲叆鐢ㄦ埛韬唤
- **[frontend] 瀵煎嚭琛屼负闈欓粯涓婃姤**锛歚ExportPanel` 瀵煎嚭鎴愬姛鍚?fire-and-forget 璋冪敤 preference/report锛屾敹闆嗚棰戣建 clips 鐨?activity銆佹椂闀裤€乵eta 鏁版嵁

**璁捐瑕佺偣锛?*
- 鍋忓ソ鏁版嵁涓虹函 JSON 鏂囦欢锛坄{DATA_DIR}/.data/preferences/{username}.json`锛夛紝涓嶄緷璧栨暟鎹簱
- LLM prompt 涓槑纭爣娉?鐢ㄦ埛褰撳墠鎸囦护浼樺厛绾ч珮浜庡巻鍙插亸濂?锛岄伩鍏嶅亸濂藉共鎵版樉寮忛渶姹?
- 棣栨瀵煎嚭鍗冲缓绔嬬敾鍍忥紝鏃犻渶鐢ㄦ埛棰濆鎿嶄綔

---

### v0.47 鈥?2026-04-16

**绱犳潗搴撴櫤鑳戒紭鍖栵紙Phase 0-4 鍏ㄩ噺锛?*

**Feature:**
- **[asset-library] AI 鏅鸿兘鍒嗙被**锛氫笂浼犳椂鑷姩璇嗗埆 7 澶х被鍒紙瑙掕壊/姝﹀櫒閬撳叿/鍦烘櫙/UI绱犳潗/瀹ｄ紶鍥?瑙嗛鐗囨/鏈垎绫伙級+ 30 瀛楁弿杩帮紝缁撴灉瀛樺叆 assets 琛?`ai_category` / `ai_description`
- **[asset-library] Tab 瀵艰埅**锛氭柊澧炪€屾渶杩戜娇鐢ㄣ€嶃€屾敹钘忋€峊ab锛屽姞涓婂師鏈夈€屽叏閮ㄧ礌鏉愩€嶅拰銆孏oogle Drive銆?
- **[asset-library] 鏀惰棌绯荤粺**锛氱礌鏉愬崱鐗囨槦鏍囨敹钘?鍙栨秷鏀惰棌锛宍asset_favorites` 琛ㄦ寔涔呭寲
- **[asset-library] 鏈€杩戜娇鐢?*锛歚asset_usage_log` 璁板綍浣跨敤鍘嗗彶锛屾渶杩戜娇鐢?Tab 灞曠ず
- **[asset-library] AI 鍒嗙被铏氭嫙鏂囦欢澶?*锛氬乏渚ф爮鎸?ai_category 鍒嗙粍锛屾樉绀哄悇绫诲埆鏁伴噺锛岀偣鍑荤瓫閫?
- **[asset-library] 鑷畾涔夋枃浠跺す CRUD**锛氫晶鏍忓垱寤?閲嶅懡鍚?鍒犻櫎鏂囦欢澶癸紝鏀寔 3 绾у祵濂?
- **[asset-library] 鎷栨嫿褰掓。**锛氱礌鏉愬崱鐗囨敮鎸?HTML5 鍘熺敓鎷栨嫿鍒版枃浠跺す锛涢€変腑澶氫釜鍚庡彲鎵归噺绉诲姩
- **[asset-library] 鍥剧墖鎮仠鏀惧ぇ**锛氶紶鏍囨偓鍋滃浘鐗?400ms 寮瑰嚭 360px 澶у浘棰勮娴獥锛坒ixed 瀹氫綅锛?
- **[asset-library] 鎼滅储澧炲己**锛氭悳绱㈣寖鍥存墿灞曞埌 ai_description + ai_category
- **[asset-library] Google Drive 闆嗘垚**锛歄Auth 2.0 杩炴帴銆佹枃浠舵祻瑙堛€佹寜闇€缂撳瓨銆佺缉鐣ュ浘浠ｇ悊

**Schema 鍙樻洿锛?*
- `assets` 琛ㄦ柊澧?`ai_category TEXT`銆乣ai_description TEXT`銆乣folder_id TEXT`
- 鏂板 `asset_folders`銆乣asset_favorites`銆乣asset_usage_log` 涓夊紶琛?

---

### v0.47a 鈥?2026-04-16

**宸ㄧ煶鏂囦欢鎷嗗垎绗竴闃舵锛歳iskSentimentService 绫诲瀷鎻愬彇**

**Refactor:**
- **[api] `riskSentimentTypes.ts` 鏂板缓**锛氫粠 `riskSentimentService.ts`锛?744琛岋級鎻愬彇鍏ㄩ儴绫诲瀷瀹氫箟锛坄RiskVideo`銆乣RiskCreator`銆乣CommentTask`銆乣RiskSnapshot`銆乣RiskStrategyBlock` 绛?12 涓被鍨嬶紝128琛岋級锛屼富鏂囦欢閫氳繃 `export type` 閲嶅鍑猴紝娑堣垂鏂归浂鏀瑰姩
- 涓绘枃浠惰鏁?1744 鈫?1626锛?118琛岋級锛屽悗缁樁娈靛皢缁х画鎻愬彇 Apify 鏁版嵁閲囬泦鍜?LLM 瑙ｆ瀽鍑芥暟

---

### v0.46 鈥?2026-04-16

**楂樼骇鍒剁墖 鈫?鍓緫鍣?澧為噺鍚屾锛圥hase 3锛?*

**Feature:**
- **[editor] 鍚屾鏇存柊鎸夐挳**锛氫粠鍒剁墖瀵煎叆鐨勫壀杈戦」鐩《鏍忔柊澧炪€岎煍?鍚屾鏇存柊銆嶆寜閽紝鐐瑰嚮瀵规瘮鍒剁墖绔渶鏂伴€夊畾瑙嗛鐗堟湰涓庡壀杈戝櫒鍐呯増鏈?
- **[editor] SyncProductionModal 宸紓灞曠ず**锛氬脊绐楀紡宸紓鍒楄〃锛岄€愰暅鏄剧ず銆屾湁鏂扮増鏈?/ 鏃犲彉鍖栥€嶇姸鎬侊紝鏀寔鍕鹃€夋壒閲忔浛鎹㈡垨鍏ㄩ€?
- **[api] POST /sync-production**锛氬悗绔姣斿埗鐗囬」鐩?`selectedPreviewVideoVersionId` 涓庡壀杈戝櫒 clip `meta.productionVersionId`锛岃繑鍥為€愰暅宸紓
- **[api] PATCH /apply-sync**锛氬悗绔墽琛屾浛鎹⑩€斺€旀洿鏂扮礌鏉?URL銆乧lip sourceEnd銆乵eta.productionVersionId銆乵eta.syncedAt锛屽苟鑷姩浣嶇Щ鍚庣画 clip 閫傞厤鏃堕暱鍙樺寲
- **[editor] 鏃堕暱鍙樺寲鑷姩澶勭悊**锛氬悓姝ユ浛鎹㈡椂鑻ユ柊瑙嗛鏃堕暱涓庢棫鐗堜笉鍚岋紝鑷姩璋冩暣褰撳墠 clip 鐨?sourceEnd 骞朵綅绉诲悗缁墍鏈?clip 鐨?timelineStart锛屼繚鎸佹椂闂磋酱杩炵画鎬?
- **[editor] 鍚屾鍚庤嚜鍔ㄥ埛鏂?*锛氭浛鎹㈠畬鎴愬悗鑷姩閲嶆柊鍔犺浇缂栬緫鍣ㄩ」鐩紝纭繚 UI 涓庢寔涔呭寲鏁版嵁涓€鑷?

**鏂板鏂囦欢锛?*
- `h5-video-tool/src/editor/components/SyncProductionModal.tsx` 鈥?鍚屾宸紓寮圭獥缁勪欢

---

### v0.46a 鈥?2026-04-16

**闀滃ご鐗堟湰鍘嗗彶瀹屾暣瀹炵幇锛堢増鏈垏鎹?API + 鐗堟湰娓呯悊 + 涓婇檺鎻愮ず锛?*

**Feature:**
- **[api] PATCH `/api/production/project/:id/shots/:shotIndex/version`**锛氶暅澶寸増鏈垏鎹㈠嵆鏃舵寔涔呭寲鎺ュ彛鈥斺€斿垏鎹㈢増鏈椂涓嶅啀绛夊緟 auto-save锛?s 闃叉姈锛夛紝鑰屾槸绔嬪嵆灏?`selectedPreviewVideoVersionId` 鍐欏叆鏈嶅姟绔?JSON锛屾秷闄ゃ€屽垏鐗堟湰 鈫?鍒锋柊 鈫?鐗堟湰鍥為€€銆嶉棶棰?
- **[api] DELETE `/api/production/project/:id/shots/:shotIndex/versions`**锛氱増鏈竻鐞嗘帴鍙ｂ€斺€斾繚鐣欐寚瀹氱増鏈紝鍒犻櫎璇ラ暅澶村叾浠栫増鏈殑瑙嗛鏂囦欢骞舵洿鏂伴」鐩?JSON锛涜矾寰勭┛瓒婇槻鎶ょ‘淇濆彧鑳藉垹闄?`API_DATA_DIR` 涓嬬殑鏂囦欢
- **[frontend] `apiPatch` 閫氱敤璇锋眰鍑芥暟**锛歚api/client.ts` 鏂板 PATCH HTTP 鏂规硶鏀寔
- **[frontend] 鐗堟湰鍒囨崲鍗虫椂鍚屾**锛歚selectShotVideoVersion` 鍥炶皟鍦ㄦ洿鏂版湰鍦?state 鐨勫悓鏃?fire-and-forget 璋冪敤 PATCH API
- **[frontend] 鐗堟湰娓呯悊璋冪敤鍚庣**锛氥€屼粎淇濈暀褰撳墠銆嶆寜閽Е鍙戞椂鍚屾璋冪敤 DELETE API 娓呯悊鏈嶅姟鍣ㄤ笂鐨勬棫鐗堟湰瑙嗛鏂囦欢
- **[frontend] 鐗堟湰涓婇檺鎻愮ず**锛氬綋鏌愰暅澶磋棰戠増鏈?>= 5 涓椂锛岀増鏈垪琛ㄤ笂鏂规樉绀洪粍鑹叉彁绀恒€岀増鏈凡杈?N 涓紝寤鸿娓呯悊鏃х増鏈互鑺傜渷纾佺洏绌洪棿銆?

---

### v0.45 鈥?2026-04-16

**楂樼骇鍒剁墖 鈫?鍓緫鍣?浣撻獙涓叉帴浼樺寲锛圥hase 1锛?*

**Feature:**
- **[editor] 瀵煎叆寮曞寮圭獥**锛氫粠楂樼骇鍒剁墖瀵煎叆鍓緫鍣ㄥ悗锛岃嚜鍔ㄥ脊鍑哄紩瀵肩獥鍙ｏ紝鏄剧ず瀵煎叆鍒嗛暅鏁板拰鎬绘椂闀匡紝鎺ㄨ崘銆屼竴閿敓鎴愰厤涔愩€嶅拰銆屽厛棰勮涓€閬嶃€嶄袱涓笅涓€姝ユ搷浣滐紱鍚屼竴椤圭洰浠呮樉绀轰竴娆★紙localStorage 璁板綍锛?
- **[editor] 鏉ユ簮鍒剁墖椤圭洰鏍囪瘑**锛氫粠鍒剁墖瀵煎叆鐨勫壀杈戦」鐩紝椤堕儴鏍忔樉绀恒€岎煋?鏉ヨ嚜銆岄」鐩悕銆嶁啋銆嶆爣绛撅紝鐐瑰嚮鍙烦鍥炲埗鐗囧伐浣滃彴
- **[editor] 鍘婚噸妫€鏌?*锛氱偣鍑汇€屽湪鍓緫鍣ㄤ腑鎵撳紑銆嶆椂锛屽鏋滃凡瀛樺湪鍚屽悕鍏宠仈鍓緫椤圭洰锛屽脊鍑虹‘璁ゅ璇濇鈥斺€斿彲閫夋嫨鎵撳紑宸叉湁椤圭洰鎴栧垱寤烘柊椤圭洰锛岄伩鍏嶉噸澶嶅垱寤?
- **[studio鈫抏ditor] 鍒嗛暅鍏冩暟鎹紶閫?*锛氬鍏ュ壀杈戝櫒鏃讹紝姣忎釜 VideoClip 鐨?`meta` 瀛楁鑷姩濉厖鍒嗛暅缁撴瀯鍖栦俊鎭紙鏅埆銆佽繍闀溿€佷富浣撱€佸姩浣溿€佸満鏅€佹儏缁€佸厜褰便€佸彴璇嶏級锛屼负 AI Agent 鏅鸿兘鍓緫鎻愪緵涓婁笅鏂?
- **[type] VideoClip 鎵╁睍**锛氬墠鍚庣 `VideoClip` 鎺ュ彛鏂板 `meta?: Record<string, unknown>` 瀛楁
- **[type] TimelineProject 鎵╁睍**锛氬墠鍚庣 `TimelineProject` 鎺ュ彛鏂板 `sourceProductionProjectId` 鍜?`sourceProductionTitle` 瀛楁锛屾敮鎸佸弻鍚戦摼鎺?
- **[studio] 鍒嗛暅鎻忚堪鎴柇**锛氬鍏ユ椂 note 鎴柇闀垮害浠?60 瀛楃鎻愬崌鍒?120 瀛楃锛屼繚鐣欐洿澶氬垎闀滄弿杩颁俊鎭?

**鏂板鏂囦欢锛?*
- `h5-video-tool/src/editor/components/ImportGuideModal.tsx` 鈥?鍒剁墖瀵煎叆寮曞寮圭獥缁勪欢

---

### v0.44 鈥?2026-04-16

**鍓嶇璁捐绯荤粺寤虹珛 & UI 鍏ㄩ潰鍗囩骇**

**Feature:**
- **[design] DESIGN.md 璁捐绯荤粺**锛氬垱寤鸿瀺鍚?Framer锛堝伐鍏风簿搴︼級+ RunwayML锛堢數褰辫川鎰燂級鐨?GOBS 涓撳睘璁捐瑙勮寖锛屾兜鐩栬壊褰?Token銆佹帓鐗堝眰绾с€佺粍浠舵牱寮忋€佹繁搴︾郴缁熴€佸搷搴斿紡琛屼负鍏?9 绔犺妭
- **[design] Cyan 鍙岃壊绯?*锛氭柊澧?`--color-accent: #22d3ee` 浣滀负绗簩鑹插僵缁村害锛岃疮绌?Hero 鍏夋檿銆佸揩鎹峰叆鍙ｃ€佺敤鎴峰ご鍍忔笎鍙樸€丯EW 鏍囩绛夛紝瑙嗚灞傛浠庡崟鑹插崌绾т负鍙岃壊绯?
- **[css] Token 鍙屾簮鍐茬獊淇**锛氬垹闄?`@theme` 鍧椾腑涓?`:root` 閲嶅涓斾笉涓€鑷寸殑鍙橀噺瀹氫箟锛岀粺涓€涓哄崟涓€鏉ユ簮
- **[css] 鑳屾櫙姘涘洿鍗囩骇**锛歜ody 鑳屾櫙浠庝袱灞傛笎鍙樺崌绾т负涓夊眰寰勫悜娓愬彉锛堜富鑹插乏涓?22% + cyan 鍙充笂 12% + 搴曢儴寰厜 8%锛夛紝娣辩┖鑸炲彴鎰?
- **[css] 缁勪欢绫诲簱鎵╁厖**锛氭柊澧?`.btn-primary`锛堣嵂涓?鍏夋檿锛夈€乣.btn-secondary`锛堟瘺鐜荤拑锛夈€乣.btn-ghost`銆乣.chip` / `.chip-cyan`锛堟爣绛捐嵂涓革級銆乣.video-card`锛堥浂闃村奖鍐呭鍗＄墖锛夈€乣.section-overline`锛坲ppercase 寮曞璇嶏級
- **[css] 鍔ㄧ敾浣撶郴**锛氭柊澧?`animate-fade-in-up`锛堝脊鍑烘劅锛夈€乣animate-glow-pulse`锛堝厜鏅曞懠鍚革級銆乣.stagger-children`锛堝瓙鍏冪礌閿欏紑鍏ュ満锛夈€乣.nav-stagger`锛堜晶鏍忓鑸叆鍦猴級锛岀粺涓€寮规€х紦鍔?`cubic-bezier(0.16, 1, 0.3, 1)`
- **[layout] 渚ф爮閲嶈璁?*锛氬鑸垎缁勫姞 section-overline 鏍囩锛?鍒涗綔"/"鍚庢湡 & 绱犳潗"/"鍒嗗彂 & 宸ュ叿"锛夛紱Active 椤瑰乏渚?3px 鍙戝厜鎸囩ず鏉?+ 鍏夋檿闃村奖锛涘浘鏍囩粺涓€ 18px/1.8 stroke
- **[layout] 鐢ㄦ埛鍖哄崌绾?*锛氭笎鍙樺ご鍍忓湀锛坧rimary鈫抍yan锛夋樉绀洪瀛楁瘝 + 鐢ㄦ埛淇℃伅 + 鍥炬爣宸ュ叿鏍忥紙璁剧疆/鐩戞帶/閫€鍑猴級锛岄€€鍑烘寜閽?hover 鍙樼孩
- **[home] 棣栭〉鍗囩骇**锛欻ero 涓夊眰鍏夋檿锛堝惈鍛煎惛鍔ㄦ晥锛夛紱蹇嵎鍏ュ彛 emoji 鏇挎崲涓?5 涓粺涓€ SVG 鍥炬爣锛?瑙嗛鍒嗗彂"鐢?cyan accent 鑹插樊寮傚寲
- **[studio] 椤甸潰 Header 鍗囩骇**锛氭瘺鐜荤拑 backdrop-blur + `.page-title` / `.page-subtitle` 鎺掔増绫?+ Tab 鎸囩ず鍣ㄦ敼涓虹粷瀵瑰畾浣嶅渾瑙掑皬鏉?

---

### v0.43a 鈥?2026-04-16

**鍓緫宸ヤ綔鍙扳€斺€斿鍑轰慨澶?& 鎾斁杩炵画鎬т慨澶?*

**Fix:**
- **[backend] 瀵煎嚭绱犳潗鎵句笉鍒?prod_shot_* 淇**锛歚editorExport.ts` 鏂板 `resolveLocalPathFromUrl()` 鍑芥暟锛屾敮鎸佷粠 `/api/video/file?path=xxx`銆乣/api/batch-jobs/video/<jobId>`銆乣/api/editor/assets/files/<id>` 涓夌 URL 鏍煎紡鍙嶈В鏈湴鏂囦欢璺緞锛岃В鍐抽珮绾у埗鐗囧垎闀滃鍏ュ壀杈戝櫒鍚庡鍑烘姤閿欍€岀礌鏉愭枃浠朵笉瀛樺湪銆?
- **[frontend] 瀵煎嚭璇锋眰鎼哄甫 assets 鏄犲皠**锛歚ExportPanel` 鏂板 `assets` prop锛屽鍑烘椂涓€骞跺彂閫佺粰鍚庣锛屼娇鍚庣鑳介€氳繃 URL 瀹氫綅闈炴湰鍦颁笂浼犵殑绱犳潗鏂囦欢
- **[backend] 瀵煎嚭鎺ュ彛 schema 鎵╁睍**锛歚EditorExportRequestBody` 鏂板鍙€?`assets` 瀛楁锛屽悜鍚庡吋瀹?
- **[frontend] 鍒嗛暅闂存挱鏀句腑鏂慨澶?*锛氬壀杈戝伐浣滃彴鎾斁澶氭鍒嗛暅鏃讹紝鍒囨崲瑙嗛婧愬鑷?`play()` 琚?AbortError 涓柇浼氳璁?`isPlaying=false`锛涚幇蹇界暐 AbortError 骞舵柊澧?`onCanPlay` 鍥炶皟锛岃棰戝姞杞藉氨缁悗鑷姩鎭㈠鎾斁
- **[backend] 瀵煎嚭缂哄け BGM 淇**锛欱GM 鏂囦欢瀛樺偍鍦?`uploads/editor/music/` 涓嬶紝浣嗗鍑烘椂鏈悳绱㈣鐩綍锛涙柊澧?`uploads/editor/music/` 鍒版悳绱㈣矾寰勶紝骞舵敮鎸?`/api/editor/music/files/<id>` URL 鍙嶈В

---

### v0.43 鈥?2026-04-16

**楂樼骇鍒剁墖鈥斺€斿垎闀滅紪杈戜綋楠?& 鐗堟湰鎸佷箙鍖栦慨澶?*

**Feature:**
- **[frontend] 鍒嗛暅鍙傛暟鎶樺彔**锛歚StepStoryboardFieldsEditor` 榛樿鎶樺彔锛屽彧鏄剧ず鎽樿琛岋紙鍙傝€冨浘 + 涓讳綋 路 鏅埆 路 杩愰暅 路 鏃堕暱锛夛紝鐐瑰嚮銆屽睍寮€缂栬緫銆嶆墠鏄剧ず瀹屾暣瀛楁琛ㄥ崟锛屽ぇ骞呭噺灏戣瑙夊櫔闊?
- **[backend] AI 瀹＄墖铻嶅叆鍒嗛暅鐢熸垚**锛歚/api/studio/storyboard-table` 璺敱鏂板 `autoRefineShots()` 鍚庡鐞嗏€斺€斿崟娆?LLM 璋冪敤鎵归噺瀹℃煡骞朵紭鍖栨墍鏈夐暅澶寸殑 `structuredStill` / `structuredMotion` 瀛楁锛岀敓鎴愭椂鍗冲畬鎴愯川閲忔妸鎺э紝鏃犻渶棰濆鎵嬪姩瀹＄墖姝ラ

**Fix:**
- **[backend] 瑙嗛鐗堟湰涓㈠け淇**锛歚productionPersist.ts` `/project/save` 鎺ュ彛鏀逛负淇濆瓨鍓嶅厛璇诲彇鐜版湁鏂囦欢锛屽姣忎釜 shot 鐨?`previewVideoVersions` 鍋?union merge by id锛岄槻姝㈠墠绔嚜鍔ㄤ繚瀛樿鐩栧悗绔?`writeBackToProject` 宸插啓鍏ョ殑瑙嗛鐗堟湰

---

### v0.42 鈥?2026-04-15

**閰嶄箰閫昏緫淇锛歋uno 浼樺厛 + 鍐呭鎰熺煡閰嶄箰 + 楂樼骇鍒剁墖棰勫～**

**Fix:**
- **[backend] Suno API callBackUrl 400 淇**锛歚sunoMusic.ts` 涓Щ闄ょ┖瀛楃涓?`callBackUrl` 瀛楁锛圫uno API 鎷掔粷绌哄€硷級锛孲uno 鐜板湪鍙甯歌皟鐢?
- **[backend] 鏈嶅姟鍣?SUNO_API_KEY 閰嶇疆**锛氶儴缃茬幆澧?`.env` 琛ュ厖 `SUNO_API_KEY`锛屼竴閿厤涔愮幇鍦ㄧ湡姝ｄ紭鍏堣蛋 Suno API
- **[editor] Agent 鑷姩閰嶄箰鏃ュ織纭紪鐮佷慨澶?*锛歚EditorWorkbench.runAutoBgmFromAgentMessage` 涓?Lyria"纭紪鐮佹敼涓哄姩鎬佽鍙?`res.provider`锛屾棩蹇楁纭樉绀哄疄闄呭紩鎿庯紙Suno/Lyria锛?

**Feature:**
- **[editor] 鍐呭鎰熺煡閰嶄箰**锛氫竴閿櫤鑳介厤涔愭椂鑷姩浠庢椂闂磋酱瑙嗛鐗囨鐨?note 瀛楁鎻愬彇鍐呭鎽樿锛堝垎闀滄弿杩般€佸満鏅鏄庯級锛屾嫾鍏?polish 璇锋眰锛涘悗绔?`editorMusicPromptPolish` 澧炲己涓虹悊瑙?瑙嗛鍐呭"涓婁笅鏂囷紝鐢熸垚鐨?BGM 椋庢牸鍖归厤瀹為檯鐢婚潰鍐呭
- **[studio 鈫?editor] 楂樼骇鍒剁墖閰嶄箰棰勫～**锛氫粠楂樼骇鍒剁墖瀵煎嚭鍒板壀杈戝櫒鏃讹紝鑷姩浠?`SoundMusicPlan.music[].mood` 鎻愬彇閰嶄箰椋庢牸鎻忚堪锛屽啓鍏?`TimelineProject.mix.bgmPromptHint`锛汢gmMixPanel 棣栨鍔犺浇鏃堕濉鎻愮ず璇嶏紝鏄剧ず绱壊"鏉ヨ嚜鍒剁墖瑙勫垝"鏍囩
- **[editor] `TimelineMix` 绫诲瀷鎵╁睍**锛氭柊澧?`bgmPromptHint?: string` 瀛楁锛屾壙杞芥潵鑷笂娓革紙楂樼骇鍒剁墖锛夌殑閰嶄箰椋庢牸鎻愮ず

---

### v0.42a 鈥?2026-04-15

**楂樼骇鍒剁墖鈥斺€斿垎闀滃伐浣滃彴浣撻獙浼樺寲锛? 椤规柊鍔熻兘锛?*

**Feature:**
- **[P0] 鎵归噺鐢熸垚鎵€鏈夌己澶辫棰?*锛歋hotStrip 涓婃柟鏂板銆屼竴閿敓鎴愭墍鏈夌己澶辫棰戙€嶆寜閽紝鑷姩閬嶅巻鎵€鏈夊皻鏃犺棰戠殑鍒嗛暅骞堕€氳繃鑷€傚簲闃熷垪涓茶鎻愪氦銆傛牳蹇?`handleGenerateShotVideo` 閲嶆瀯涓哄弬鏁板寲 `generateVideoForShotIdx(idx)` 渚涘崟闀?鎵归噺鍏辩敤銆?
- **[P0] AI 瀹＄墖鍔╂墜锛堣瘎璁虹敓鎴?+ 缂栬緫鐢熸垚锛?*锛氬悗绔柊澧?`POST /api/studio/shot-review`锛圕ompass LLM 鏂囨湰瀹＄墖锛夛紝鍒嗘瀽鍗曢暅缁撴瀯鍖?Prompt 鐨勫畬鏁存€т笌涓€鑷存€э紝杈撳嚭缁煎悎璇勫垎锛?-10锛夊拰閫愬瓧娈垫敼杩涘缓璁€傚墠绔睍绀哄缓璁崱鐗囷紝姣忔潯鍙€岄噰绾炽€嶄竴閿慨鏀瑰搴斿瓧娈碉紝鏀寔銆屽叏閮ㄩ噰绾冲苟閲嶆柊鐢熸垚銆嶅畬鎴愰棴鐜€?
- **[P1] 蹇€熻皟鏁撮潰鏉?*锛氬垎闀滅紪杈戝尯鏂板杩愰暅锛堝浐瀹?缂撴帹/鎵嬫寔/鑸媿/鐜粫锛夈€佽妭濂忥紙鏋佹參~鏋侀€燂級銆佸厜褰憋紙鏄庝寒~闇撹櫣锛夈€佷竴閿皼鍥达紙鏇存垙鍓у寲/鏇村畨闈?鏇村揩鑺傚锛夐璁炬寜閽紝鐩存帴鏄犲皠鍒?`structuredStill` / `structuredMotion` 瀛楁銆?
- **[P1] 杩炵画鎾斁瀹＄墖妯″紡**锛氬伐鍏锋爮鏂板銆岃繛缁挱鏀俱€嶆寜閽紝鍏ㄥ睆 overlay 鑷姩鎸夊簭鎾斁鎵€鏈夋湁瑙嗛鐨勫垎闀滐紝鏀寔閿洏蹇嵎閿紙鈫?鈫?鍒囬暅 / 绌烘牸鏆傚仠 / Esc 閫€鍑猴級鍜屽簳閮ㄧ缉鐣ュ浘瀵艰埅锛岀粺璁℃€绘椂闀夸笌缂哄け闀滃ご鏁般€?
- **[P2] 鐗堟湰 A/B 瀵规瘮**锛氬綋鏈暅鏈?鈮? 涓増鏈椂鏄剧ず銆岀増鏈?A/B 瀵规瘮銆嶆寜閽紝鍏ㄥ睆宸﹀彸鍒嗗睆閫夋嫨涓嶅悓鐗堟湰鍚屾鎾斁锛屾敮鎸佷负姣忎釜鐗堟湰娣诲姞澶囨敞鏍囩銆?
- **[P2] 鍒嗛暅闂翠竴鑷存€ф鏌?*锛氬悗绔柊澧?`POST /api/studio/continuity-check`锛圕ompass LLM锛夛紝妫€鏌ョ浉閭婚暅澶寸殑鑹茶皟/瑙掕壊澶栬/鍦烘櫙杩囨浮/鍔ㄤ綔杩炶疮/鍏夌嚎涓€鑷存€э紝鎸?warning/error 鍒嗙骇銆傚墠绔睍绀洪棶棰樺垪琛紝鏀寔璺宠浆鍒伴棶棰橀暅澶淬€?

**鏂板鏂囦欢锛?*
- `h5-video-tool-api/src/routes/shotReview.ts` 鈥?鍚庣 AI 瀹＄墖 + 涓€鑷存€ф鏌ヨ矾鐢?
- `h5-video-tool/src/api/shotReview.ts` 鈥?鍓嶇 API 瀹㈡埛绔?
- `h5-video-tool/src/studio/steps/StepStoryboardAiReview.tsx` 鈥?AI 瀹＄墖闈㈡澘缁勪欢
- `h5-video-tool/src/studio/steps/StepStoryboardQuickAdjust.tsx` 鈥?蹇€熻皟鏁撮潰鏉跨粍浠?
- `h5-video-tool/src/studio/steps/StepStoryboardContinuousPlay.tsx` 鈥?杩炵画鎾斁 overlay 缁勪欢
- `h5-video-tool/src/studio/steps/StepStoryboardAbCompare.tsx` 鈥?A/B 鐗堟湰瀵规瘮 overlay 缁勪欢
- `h5-video-tool/src/studio/steps/StepStoryboardContinuityCheck.tsx` 鈥?涓€鑷存€ф鏌ラ潰鏉跨粍浠?

---

### v0.41 鈥?2026-04-15

**楂樼骇鍒剁墖鈥斺€旇嚜閫傚簲瑙嗛鐢熸垚闃熷垪 + 鍚庣淇″彿閲忔硠婕忎慨澶?*

**Feature:**
- **[鍓嶇] `ProductionWizard.tsx` 鑷€傚簲闃熷垪**锛氳繛缁偣鍑诲涓垎闀溿€岀敓鎴愯棰戙€嶆椂锛屽墠绔覆琛岄槦鍒楄嚜鍔ㄨ皟搴︺€傞粯璁ゅ揩閫熸ā寮忥紙鎷垮埌 submitId 鍗虫斁琛屼笅涓€涓級锛屽鏋滃嵆姊﹁繑鍥炲苟鍙戦檺鍒讹紙ret=1310锛夛紝鑷姩鍒囨崲涓烘參閫熸ā寮忊€斺€旂瓑鍓嶄竴涓棰戝畬鍏ㄧ敓鎴愬畬姣曞啀鎻愪氦涓嬩竴涓紝杩炵画 2 娆℃垚鍔熷悗鑷姩鎭㈠蹇€熸ā寮忋€?
- **[鍓嶇] 鎺掗槦鐘舵€佸彲瑙嗗寲**锛歋hot Strip 缂╃暐鏉″尯鍒嗕笁绉嶇姸鎬侊紙鎺掗槦涓?鎻愪氦涓?鍗虫ⅵ鐢熸垚涓級锛屾寜閽樉绀?鎺掗槦绛夊緟涓€︼紙鍓嶆柟 N 涓級"銆?

**Fix:**
- **[鍚庣] `videoDreamina.ts` 淇″彿閲忔硠婕忎慨澶?*锛歱roduction 婧愪换鍔℃彁浜ゆ垚鍔熷悗绔嬪嵆閲婃斁 Dreamina 淇″彿閲?slot锛堜箣鍓?slot 琚?hold 鍒板墠绔疆璇㈠畬鎴愶紝浣?production 浠诲姟宸叉敼涓哄悗绔?batch-job 杞锛屽鑷?slot 姘镐笉閲婃斁锛? 鍒嗛挓瓒呮椂鍚庢墠鍥炴敹锛夈€傛柊澧?`source` 璇锋眰鍙傛暟鍖哄垎鏉ユ簮銆?
- **[鍓嶇] `VideoGenerateRequest` 鏂板 `source` 瀛楁**锛歱roduction 妯″紡鎻愪氦鏃舵惡甯?`source: 'production'`锛屽悗绔嵁姝ゅ喅瀹氭槸鍚︾珛鍗抽噴鏀句俊鍙烽噺銆?

---

### v0.40 鈥?2026-04-15

**楂樼骇鍒剁墖鈥斺€旇棰戦鏍肩害鏉熶慨澶?*

**Fix:**
- **[鍓嶇] `productionAssets.ts` `buildProductionShotVideoStoryboardText`**锛氳ˉ鍏ュ師鏈仐婕忕殑 `sp_lighting`锛堝厜褰憋級鍜?`sp_style`锛堣壊璋?椋庢牸锛夊瓧娈碉紝纭繚瑙嗛 Prompt 鎼哄甫姣忛暅鐨勫厜褰变笌椋庢牸鎻忚堪銆傛柊澧炲彲閫夊弬鏁?`globalStyleRef`锛屽彲鍦?Prompt 鏈熬杩藉姞鍏ㄥ眬椋庢牸绾︽潫銆?
- **[鍓嶇] `ProductionWizard.tsx` `handleGenerateShotVideo`**锛氬湪鎵€鏈夋ā寮忥紙multimodal / text2video / image2video锛夋彁浜ゅ嵆姊︿箣鍓嶏紝缁熶竴妫€鏌ュ苟杩藉姞缂哄け鐨?`sp_lighting`銆乣sp_style`銆乣styleRefSummary`锛堝叏灞€瑙嗚椋庢牸鎻忚堪锛夛紝閬垮厤鍗虫ⅵ鍥犵己灏戣壊璋冩寚浠よ€岀敓鎴愪笌椤圭洰椋庢牸涓嶇锛堝榛戠櫧椤圭洰鍑哄僵鑹诧級鐨勮棰戙€?

---

### v0.39 鈥?2026-04-15

**鍓緫 Agent JSON 瑙ｆ瀽椴佹鎬у寮?*

**Fix:**
- **[api] `editorAgentService.ts` extractJson 閲嶅啓**锛氫粠浠呭尮閰嶇涓€涓?code block 鏀逛负涓夊眰鎻愬彇绛栫暐鈥斺€旀壂鎻忔墍鏈?`` ```json ``` `` code block 鍙栨渶闀?鈫?鑺辨嫭鍙烽厤瀵规壘鏈€澶栧眰 `{鈥` 鈫?鍘熸枃鍏滃簳锛岃В鍐虫ā鍨嬭緭鍑哄甫棰濆瑙ｉ噴鏂囧瓧鏃舵彁鍙栧け璐ョ殑闂銆?
- **[api] 鏂板 `repairJson` 淇灞?*锛氳嚜鍔ㄥ鐞?LLM 甯歌 JSON 缂洪櫡锛堝熬閫楀彿銆乣//` 琛屾敞閲娿€乼oken 鎴柇瀵艰嚧鐨勬湭闂悎鎷彿锛夛紝棣栨 parse 澶辫触鍚庤嚜鍔ㄤ慨澶嶉噸璇曘€?
- **[api] Compass API 璋冪敤鍔?`response_format: { type: 'json_object' }`**锛氫粠 API 灞傜害鏉?Gemini 杈撳嚭绾?JSON锛屽ぇ骞呴檷浣庨潪娉?JSON 姒傜巼銆?
- **[api] `promptPolish.ts`**锛歚compassChatCompletionWithUsage` 鏂板鍙€?`responseFormat` 鍙傛暟锛屾敮鎸佽皟鐢ㄦ柟鎸囧畾杈撳嚭鏍煎紡绾︽潫銆?
- **[api] 閿欒淇℃伅澧炲己**锛氫慨澶嶄粛鐒跺け璐ユ椂锛岄敊璇秷鎭寘鍚ā鍨嬪師濮嬭緭鍑哄墠 300 瀛楃鐗囨锛屼究浜庡揩閫熷畾浣嶉棶棰樸€?

**Root Cause锛?* Compass Gemini 妯″瀷鍋跺皵鍦?JSON 澶栧寘瑁?Markdown 璇存槑鏂囧瓧鎴?code block 鏍煎紡涓嶆爣鍑嗭紝鍘?`extractJson` 浠呭尮閰嶇涓€涓?`` ``` `` 瀵规棤娉曞簲瀵规墍鏈夊彉浣擄紝瀵艰嚧 `JSON.parse` 澶辫触鎶涘嚭"妯″瀷杩斿洖涓嶆槸鍚堟硶 JSON"銆?

---

### v0.38 鈥?2026-04-15

**鍗虫ⅵ ret=1310 ExceedConcurrencyLimit 鑷姩閲嶈瘯 + 鍙嬪ソ鎻愮ず**

**Fix:**
- **[api] `videoDreamina.ts` 鑷姩閲嶈瘯**锛氬妯℃€佸拰闈炲妯℃€佽矾寰勫潎鏂板 1310 閲嶈瘯鏈哄埗鈥斺€旈娆℃敹鍒?`ExceedConcurrencyLimit` 鏃惰嚜鍔ㄧ瓑寰?45s 鍚庨噸璇曚竴娆★紙涓嶉噴鏀惧苟鍙戞Ы锛夛紝閫忔槑瑙ｅ喅"鏈嶅姟閲嶅惎鍚庢棫浠诲姟娈嬬暀"鍦烘櫙锛涢噸璇曚粛澶辫触鍒欓噴鏀炬Ы骞舵姏鍑虹敤鎴峰弸濂介敊璇€?
- **[api] 鍙嬪ソ閿欒鏂囨**锛氭渶缁堝け璐ユ敼涓烘姏 `"鍗虫ⅵ璐﹀彿褰撳墠鏈夌敓鎴愪换鍔℃帓闃熶腑锛岃 2-3 鍒嗛挓鍚庨噸璇?`锛屼笉鍐嶆毚闇插師濮?`ret=1310, logid=...` 缁欑敤鎴枫€?
- **[frontend] `useVideoGeneration.ts` 鍏滃簳**锛歚normalizeError` 琛ュ厖 `ret=1310 / ExceedConcurrencyLimit` 璇嗗埆锛屽嵆浣垮悗绔湭澶勭悊涔熻兘鏄剧ず涓枃鎻愮ず銆?

**Root Cause锛?* 鏈嶅姟鍣ㄩ噸鍚悗鍐呭瓨淇″彿閲忛噸缃负"绌洪棽"锛屼絾鍗虫ⅵ璐﹀彿涓婁粛鏈変笂涓€娆?session 鐣欎笅鐨勪换鍔″湪璺戯紝鎻愪氦鏂颁换鍔″嵆琚嵆姊︽嫆缁濓紱涔嬪墠浠ｇ爜鐩存帴灏嗗師濮?API 閿欒閫忎紶鍓嶇鏄剧ず銆?

---

### v0.37 鈥?2026-04-15

**楂樼骇鍒剁墖 路 鏀炬槧瀹ゅ鐗囦綋楠屼紭鍖?*

- **[studio] 鍒嗛暅瑙嗛鍒囨崲鑷姩杩炴挱**锛氭斁鏄犲锛圫creeningRoomPlayer锛夊垏鍒颁笅涓€鍒嗛暅鍚庤棰戣嚜鍔ㄥ紑濮嬫挱鏀撅紝鏃犻渶鎵嬪姩鐐瑰嚮
  - 鏂板 `onCanPlay` 鍥炶皟锛屽湪瑙嗛鏁版嵁灏辩华鏃惰Е鍙?`play()`锛屽彇浠ｆ棫鐨?`useEffect` 鏂瑰紡锛堟棫鏂规鍦?`key` 鍒囨崲閲嶅缓 `<video>` 鍚庢椂鏈鸿繃鏃╁鑷翠笉鐢熸晥锛?
  - 娣诲姞 `autoPlay` 灞炴€т綔涓哄弻淇濋櫓
  - 鎾斁閾捐矾锛歚onEnded` 鈫?`goNext` 鈫?`key` 鍙樺寲閲嶅缓 `<video>` 鈫?鏂版簮鍔犺浇 鈫?`onCanPlay` 鈫?鑷姩鎾斁

---

### v0.36 鈥?2026-04-15

**AI 鍓緫鏅鸿兘浼樺寲 路 绗笁鎵癸紙鏂瑰悜6 鐢婚潰-闊充箰鎯呯华瀵归綈锛?*

- **[editor-agent] 鎯呯华寮犲姏缁村害锛堟柟鍚?锛?*锛?
  - `VisionFrameScore` 鏂板 `tension`锛堟儏缁紶鍔?0鈥?0锛屼笌鍓緫浠峰€?score 鍒嗙锛夊拰 `emotionTag`锛坈alm/tense/triumphant/sad/exciting锛?
  - Gemini 鎵撳垎 prompt 鏇存柊锛屾瘡甯у悓鏃惰緭鍑?tension + emotionTag
  - 鍐呭鍦板浘锛圕ontent Manifest锛夌幇鍦ㄦ樉绀烘儏缁垎甯冪粺璁★紙濡?`exciting脳5 / tense脳3 | 骞冲潎寮犲姏锛?.2/10`锛?
- **[editor-agent] BGM 娈佃惤 脳 鐢婚潰鎯呯华瀵归綈瑙勫垯**锛?
  - drop锛坔igh energy锛夋 鈫?浼樺厛 tension 鈮?7銆乪motionTag=exciting/triumphant 鐨勭敾闈?
  - build锛坢id energy锛夋 鈫?浼樺厛 tension 4-6銆乪motionTag=tense 鐨勭敾闈?
  - intro/outro锛坙ow energy锛夋 鈫?浼樺厛 tension 鈮?3銆乪motionTag=calm/sad 鐨勭敾闈?
  - 鏃?BGM 鏃舵寜鍙欎簨妯℃澘娈佃惤浣嶇疆鎺ㄦ柇寮犲姏鏈熸湜
  - 寮哄埗绾︽潫锛氬悓涓€ BGM 娈佃惤鍐呯敾闈㈠紶鍔涘彉鍖栧箙搴?鈮?5

---

### v0.35 鈥?2026-04-15

**AI 鍓緫鏅鸿兘浼樺寲 路 绗簩鎵癸紙鏂瑰悜2 鍙欎簨缁撴瀯 + 鏂瑰悜4 鍒囩偣璐ㄩ噺锛?*

- **[editor-agent] 涓ら樁娈靛彊浜嬬粨鏋勬帓鐗囷紙鏂瑰悜2锛?*锛?
  - 鏂板涓夊鍙欎簨妯℃澘锛歚缁忓吀楂樺厜`锛堟贩鍓埥鐐癸級/ `瑙掕壊鏁呬簨`锛堣鑹插浼狅級/ `鑺傚娣峰壀`锛圔GM 鍏堣锛?
  - 绯荤粺鏍规嵁鐢ㄦ埛鎰忓浘鑷姩閫夋ā鏉匡紙鏈?BGM 鈫?鑺傚娣峰壀锛涙垬鏂楃被 鈫?缁忓吀楂樺厜锛涘叾浠?鈫?瑙掕壊鏁呬簨锛?
  - 鏂板 `buildContentManifest()` 灏嗚瑙夎瘎鍒嗙粍缁囦负銆屽唴瀹瑰湴鍥俱€嶏紝鎸?閽╁瓙/鍔ㄤ綔椤剁偣/鎴樻枟楂樺厜/閾哄灚/骞抽潤 浜旂被鍒嗙粍锛屽甫鏃堕棿鎴虫爣娉?
  - LLM prompt 娉ㄥ叆鍙欎簨妯℃澘 + 鍐呭鍦板浘锛屽紩瀵?AI 鎸夊紑鍦衡啋閾哄灚鈫掗珮娼啋鏀跺熬缁撴瀯鎺掔墖锛屽憡鍒€岄珮鍒嗙墖娈靛爢鐮屻€?
- **[editor-agent] 鍒囩偣璐ㄩ噺浼樺寲锛堟柟鍚?锛?*锛?
  - `VisionFrameScore` 鏂板 `isActionPeak`锛堝姩浣滈《鐐瑰抚锛屽鍑绘潃鐬棿/鎶€鑳藉懡涓級鍜?`cameraMotion`锛堥暅澶磋繍鍔ㄧ被鍨嬶細static/pan/zoom/shake锛?
  - Gemini 鎵撳垎 prompt 鏇存柊锛岀幇鍦ㄨ繑鍥炰袱涓柊瀛楁
  - System prompt 娉ㄥ叆鍒囩偣瑙勫垯锛氬姩浣滈《鐐逛紭鍏堝垏鍏ャ€佸姩鎺ュ姩鍘熷垯銆佽繛缁潤鎬侀暅澶撮』鎻掑叆杩愬姩闀滃ご

---

### v0.35a 鈥?2026-04-15

**楂樼骇鍒剁墖 路 瑙嗛鐢熸垚鏋舵瀯鍗囩骇锛氬悗绔疆璇?+ SSE 鎺ㄩ€?*

鏍稿績鍙樻洿锛氬嵆姊﹁棰戠敓鎴愪粠銆屽墠绔?10 鍒嗛挓姝昏疆璇€嶈縼绉昏嚦銆屽悗绔櫤鑳借疆璇?+ SSE 瀹炴椂閫氱煡銆嶏紝褰诲簳瑙ｅ喅闀挎椂闂寸敓鎴愬鑷寸殑瑙嗛涓㈠け銆?

- **[arch] 鍚庣鏅鸿兘杞**锛歱roduction 鏉ユ簮鐨?batch-job 鎻愪氦鍚庡墠 10 鍒嗛挓涓嶈疆璇紝涔嬪悗姣?5 鍒嗛挓鑷姩妫€鏌ヤ竴娆″嵆姊︾姸鎬侊紱4 灏忔椂 TTL 闃插兊灏镐换鍔?
- **[feat] 鑷姩鍥炲啓椤圭洰 JSON**锛氳棰戣惤鐩樺悗鑷姩鏇存柊鏈嶅姟绔」鐩枃浠剁殑 `previewVideoVersions`锛屽叧闂祻瑙堝櫒涔熶笉涓㈠け
- **[feat] SSE 瀹炴椂鎺ㄩ€?*锛氳棰戝氨缁悗閫氳繃 batch-jobs SSE 閫氶亾鎺ㄩ€佸埌鍓嶇锛岃嚜鍔ㄥ～鍏ュ垎闀滈瑙堝苟 toast 鎻愮ず
- **[feat] 鎵嬪姩妫€鏌ヨ繘搴?*锛氬垎闀滈潰鏉挎柊澧炪€屾墜鍔ㄦ鏌ヨ繘搴︺€嶆寜閽紝鐢ㄦ埛鍙殢鏃剁珛鍗虫煡璇㈠嵆姊︾姸鎬侊紙`POST /api/batch-jobs/:id/poll-now`锛?
- **[fix] batch-jobs video 閴存潈鏀捐**锛歚GET /api/batch-jobs/video/:id` 鍔犲叆鍏嶉壌鏉冪櫧鍚嶅崟锛宍<video>` 鏍囩鍙洿鎺ユ挱鏀?

---

### v0.34 鈥?2026-04-15

**楂樼骇鍒剁墖 路 鍒嗛暅瑙嗛涓㈠け淇 & 鎸佷箙鍖栧仴澹€ф彁鍗?*

- **[fix] 鍒嗛暅瑙嗛杞瓒呮椂**锛歚submitAsync` 鐨?10 鍒嗛挓瓒呮椂涓嶅啀鍖呭惈鍚庣淇″彿閲忔帓闃熺瓑寰呮椂闂达紝姣忎釜鍗虫ⅵ浠诲姟鎷ユ湁鐙珛瀹屾暣鐨勮疆璇㈢獥鍙ｏ紙淇 `DREAMINA_MAX_CONCURRENT=1` 鏃跺悗鎺掍换鍔¤秴鏃朵涪澶辫棰戠殑闂锛?
- **[fix] 鍚庣瑙嗛涓嬭浇 fallback**锛歚persistVideoUrlToOutput` 钀界洏澶辫触鏃讹紝鑻ュ師濮嬪嵆姊?URL 涓?HTTPS锛岀洿鎺ヨ繑鍥炵粰鍓嶇浣滀负鎾斁 fallback锛屼笉鍐嶈繑鍥炵┖ videoUrl 瀵艰嚧杞姝诲惊鐜?
- **[fix] 鍒锋柊淇濇姢 鈥?鍚堝苟 localStorage 瑙嗛鏁版嵁**锛氶〉闈㈠姞杞戒粠鏈嶅姟绔鍙栭」鐩椂锛岃嚜鍔ㄥ悎骞?localStorage 涓凡淇濆瓨浣嗘湇鍔＄灏氭湭鍚屾鐨勮棰戠増鏈紝闃叉 3 绉掗槻鎶栫獥鍙ｅ唴鍒锋柊瀵艰嚧瑙嗛涓㈠け
- **[fix] 鍒囨崲瑙嗛鐗堟湰鍚屾椤跺眰瀛楁**锛歚selectShotVideoVersion` 鐜板湪鍚屾鏇存柊 `previewVideoPath`/`previewVideoUrl`锛屼慨澶嶅垏鎹㈢増鏈悗鍒嗛暅鏁村悎椤垫樉绀恒€屽皻鏈敓鎴愯棰戙€嶇殑闂
- **[opt] 瑙嗛淇濆瓨绔嬪嵆鍚屾**锛氬垎闀滆棰戜繚瀛樺悗绔嬪嵆涓婁紶鏈嶅姟绔紙缁曡繃 3 绉掗槻鎶栵級锛屽ぇ骞呯缉灏忓埛鏂版暟鎹涪澶辩獥鍙?

---

### v0.33 鈥?2026-04-15

**鏋舵瀯浼樺寲浠诲姟鍏ㄩ儴瀹屾垚锛圱ASK-01 ~ TASK-06锛?*

**宸插綊妗ｅ畬鎴愮殑鏋舵瀯浠诲姟锛?*
- **[arch] TASK-01 ProductionWizard 鎷嗗垎**锛氫粠 3994 琛屽法鐭虫枃浠舵媶鍒嗕负澶氫釜 Step 瀛愮粍浠讹紙StepExportWorkspace銆丼tepStoryboardWorkspace 绛夛級
- **[arch] TASK-02 缁熶竴瑙嗛鐢熸垚鏈嶅姟灞?*锛氭秷闄ゅ墠绔笁澶勯噸澶嶇殑鐢熸垚閫昏緫锛岀粺涓€閫氳繃 hook 璋冪敤
- **[arch] TASK-03 鍓緫鍣ㄦ寔涔呭寲 + 鎾ら攢**锛氬埛鏂颁笉涓㈠け椤圭洰锛屾敮鎸?Ctrl+Z 鎾ら攢鎿嶄綔
- **[arch] TASK-04 澶氶暅澶村紓姝ュ寲**锛氬垎闀滆棰戠敓鎴愪粠鍚屾闃诲鏀逛负 Job 闃熷垪锛屾敮鎸佸苟鍙戞彁浜?
- **[arch] TASK-05 澶氱敤鎴锋暟鎹殧绂?*锛氭墍鏈夌敤鎴锋暟鎹寜 username 鍒嗙洰褰曞瓨鍌紝localStorage 闅旂
- **[arch] TASK-06 鍗虫ⅵ鐧诲綍鎬佹娴?*锛氱敓鎴愬墠妫€娴?CLI 鐧诲綍鐘舵€侊紝闃叉"鍋囧畬鎴?闈欓粯澶辫触

---

### v0.32 鈥?2026-04-15

**楂樼骇鍒剁墖瀵煎嚭椤?路 P1 鐗堟湰瑙掓爣 + P2 鍦ㄥ壀杈戝櫒涓墦寮€**

**Feature:**
- **[studio] 鑳剁墖鏉＄増鏈鏍?*锛氬垎闀滄湁澶氭鐢熸垚鐗堟湰锛坴2銆乿3鈥︼級鏃讹紝鑳剁墖鏉＄缉鐣ュ浘宸︿笂瑙掓樉绀恒€寁N銆嶈摑鑹茶鏍?
- **[studio] 鍦ㄥ壀杈戝櫒涓墦寮€**锛氬鍑洪〉鏂板涓绘搷浣滄寜閽紝涓€閿皢鎵€鏈夊凡鐢熸垚鍒嗛暅瑙嗛鎸夐『搴忓鍏ュ壀杈戝伐浣滃彴
  - 鑷姩鏋勫缓 TimelineProject锛氭瘡涓垎闀滆棰戜綔涓?VideoClip 鎸?shotIndex 椤哄簭鎺掑垪锛岃嚜鍔ㄥ悓姝?A1 鍘熷０杞?
  - 椤圭洰鍚嶇О鑷姩鍛藉悕涓恒€寋鍒剁墖椤圭洰鍚峿-鍓緫銆嶏紝淇濆瓨鍚庤烦杞?`/editor?project=<id>`

---

### v0.31 鈥?2026-04-15

**AI 鍓緫鏅鸿兘浼樺寲锛堟柟鍚?+5+3 棣栨壒钀藉湴锛?*

**鏂瑰悜 1 路 琛屼负缁嗗寲鍒嗙被锛圔ehavior Taxonomy 浜岀骇浣撶郴锛夛細**
- `gameTaxonomy.ts` 鏂板 `ActivityGroup` 鎺ュ彛锛屾敮鎸?`activityGroups`锛堜竴绾?浜岀骇锛夐厤缃€傚彧闇€鍦?`config/game-taxonomy.json` 鍔犲叆 `activityGroups` 瀛楁鍗冲彲鍚敤
- `frameVisionRank.ts` 鎵╁睍 `VisionFrameScore`锛氭柊澧?`activitySecondary`锛堜簩绾ц涓虹粏鍒嗭級銆乣intensity`锛坙ow/mid/high 寮哄害锛夈€乣isTurningPoint`锛堝彊浜嬭浆鎶樼偣 flag锛?
- Gemini prompt 鑷姩鏍规嵁鏄惁閰嶇疆 `activityGroups` 鍒囨崲杈撳嚭鏍煎紡锛堝崟鏍囩 鈫?缁撴瀯鍖栦笁瀛楁锛?
- `editorAgentService.ts` 涓?`buildIntentPriorityWindows` 鍒╃敤鏂板瓧娈靛姞鏉冿細`isTurningPoint=true` +1.5鍒嗐€乣intensity=high` +0.5鍒嗭紝杞姌鐐瑰抚浼樺厛杩涘叆鍊欓€?

**鏂瑰悜 5 路 鍐呭澶氭牱鎬х害鏉燂細**
- LLM 鎺掔墖 prompt 鏂板寮哄埗澶氭牱鎬ц鍒欙細鍚岀被琛屼负杩炵画涓嶈秴杩?娆°€佹垬鏂楁蹇呴』绌挎彃缂撳啿鐗囨銆侀鐗囨浼橀€夐挬瀛?杞姌鐐广€佹湯鐗囨浼橀€夋渶楂樺垎銆佸揩鍒囦笌鎱㈤暅姣斾緥绾?3:1

**鏂瑰悜 3 路 闊充箰鍏堣 路 鑺傛媿鍒嗘瀽锛堝熀纭€鐗堬級锛?*
- 鏂板缓 `scripts/beat_analysis.py`锛堜緷璧?`librosa`锛夛細杈撳叆闊抽璺緞锛岃緭鍑?BPM銆佽妭鎷嶆椂闂寸偣鏁扮粍銆佽兘閲忔钀斤紙intro/build/drop/outro锛?
- 鏂板缓 `src/services/musicBeatAnalysis.ts`锛氳皟鐢?Python 鑴氭湰锛岃繑鍥?`BeatInfo`锛汸ython 鎴?librosa 涓嶅彲鐢ㄦ椂鑷姩闄嶇骇锛堣繑鍥?null锛屼笉褰卞搷姝ｅ父鍓緫锛?
- `editorAgentService.ts` 闆嗘垚锛氬綋 `EDITOR_BEAT_ANALYSIS=1` 涓旈」鐩湁 BGM audio 杞ㄦ椂锛岃嚜鍔ㄥ垎鏋?BGM 骞跺湪 LLM prompt 涓敞鍏ヨ妭鎷嶇害鏉燂紙娈佃惤鏃堕棿鍒嗛厤銆佸垏鐐瑰榻愬缓璁€乨rop 娈靛揩鍒囪鍒欙級

**鍚敤闊充箰鍏堣鍔熻兘锛?* 鍦?`.env` 涓姞 `EDITOR_BEAT_ANALYSIS=1`锛屽苟鍦ㄥ壀杈戝櫒閲屼负鏃堕棿杞存坊鍔?BGM 闊抽杞紝鍐嶈Е鍙?AI 鍓緫鍗冲彲銆?

---

### v0.30 鈥?2026-04-15

**楂樼骇鍒剁墖瀵煎嚭椤?路 鏀炬槧瀹よ繛缁挱鏀惧櫒锛圥0锛?*

**Feature:**
- **[studio] ScreeningRoomPlayer 缁勪欢**锛氬鍑洪〉鏂板鏀炬槧瀹よ鍥撅紝灏嗘墍鏈夊垎闀滆棰戞寜椤哄簭涓茶仈杩炵画鎾斁
  - 涓绘挱鏀惧尯锛?6:9锛夛細鏈夎棰戠殑闀滃ご鑷姩鎾斁锛岀粨鏉熷悗鑷姩鍒囦笅涓€闀滐紱鏃犺棰戦暅澶存樉绀洪潤甯э紝鍋滅暀 2 绉掕嚜鍔ㄨ烦涓嬩竴闀?
  - 椤堕儴瑕嗙洊灞傦細鏄剧ず銆岄暅N / 鍏盢闀溿€?+ 涓婁竴闀?涓嬩竴闀滄寜閽?
  - 搴曢儴瑕嗙洊灞傦細褰撳墠闀滃ご鎻忚堪鏂囧瓧
  - 鑳剁墖鏉★紙filmstrip锛夛細妯悜婊氬姩缂╃暐鍥撅紝鐐瑰嚮璺宠浆锛屽綋鍓嶉暅楂樹寒钃濇锛岀豢鐐?鐏扮偣鏍囨敞瑙嗛鐢熸垚鐘舵€?
  - 瀹炴椂杩涘害缁熻锛氥€屽凡鐢熸垚瑙嗛锛圢/N锛夈€?
- **[studio] 鏀炬槧瀹?鈫?缃戞牸瑙嗗浘鍒囨崲**锛氬彸涓婅鎸夐挳鍦ㄤ袱绉嶈鍥鹃棿鍒囨崲锛岄粯璁よ繘鍏ユ斁鏄犲

---

### v0.29 鈥?2026-04-15

**銆屾垜鐨勬垚鐗囥€嶉〉闈?UX 鍏ㄩ潰绮剧畝**

**UX:**
- **[gallery] 绉婚櫎椤堕儴璇存槑娈佃惤**锛氬垹闄ょ害 4 琛?姝ゅ鍙敹褰曗€﹀嵆姊?App 涓嶅悓姝?璇存槑鏂囧瓧锛岄灞忕洿鎺ュ憟鐜板唴瀹广€?
- **[gallery] Tab 鏍囩浼樺寲**锛歚鏈満鍘嗗彶 (N)` 鈫?`鎴戠殑鎴愮墖 (N)`锛沗鏈嶅姟绔?output 鎴愮墖` 鈫?`鏈嶅姟绔枃浠禶锛涙瘡涓?Tab 鏂板鎮诞 `?` tooltip 鍙栦唬鍐呰仈璇存槑娈佃惤銆?
- **[gallery] 鍒犻櫎鏈嶅姟绔?tab 鍐呬袱鍧楄鏄?Block**锛氱Щ闄?鍜屻€屾湰鏈哄巻鍙层€嶇殑鍖哄埆"4 鏉?bullet 涓?VITE_API_BASE_URL 璇存槑娈佃惤銆?
- **[gallery] 绌虹姸鎬佹敼涓虹畝娲?CTA**锛歚鎴戠殑鎴愮墖` 绌虹姸鎬?鈫?澶у浘鏍?+ 涓€鍙ヨ瘽 + 涓や釜琛屽姩鎸夐挳锛沗鏈嶅姟绔枃浠禶 绌虹姸鎬?鈫?鍥炬爣 + 鍒锋柊/杩斿洖鎸夐挳锛屾棤鎶€鏈枃瀛椼€?
- **[gallery] 鏂囦欢鍚嶅彲璇诲寲**锛氭湇鍔＄鏂囦欢鍗＄墖涓嶅啀灞曠ず鍘熷 hash 璺緞锛屾敼涓烘牸寮忓寲鍚嶇О锛堝嵆姊︽垚鐗囨樉绀?鍗虫ⅵ鎴愮墖 路 鏈?鏃?鏃?鍒?锛夈€?
- **[gallery] 鎸夐挳鏂囨**锛歚鍔犲叆鏈満鍘嗗彶` 鈫?`淇濆瓨鍒版垜鐨勬垚鐗嘸锛涘垹闄ゆ寜閽敼鐢?Trash 鍥炬爣銆?

---

### v0.28 鈥?2026-04-15

**楂樼骇鍒剁墖瀵煎嚭椤靛垎闀滃崱鐗?UI 浼樺寲**

**Feature:**
- **[studio] 瀵煎嚭鍒嗛暅鍗＄墖閲嶆瀯**锛氱粺涓€鍗＄墖涓恒€屽獟浣撳尯锛堜笂锛? 鎻忚堪锛堜笅锛夈€嶄袱灞傜粨鏋勶紝娑堥櫎鏈?鏃犺棰戞椂鍗＄墖楂樺害涓嶄竴鑷寸殑闂
  - 宸茬敓鎴愯棰戯細鐩存帴鍦ㄥ獟浣撳尯鏄剧ず `<video>` 鎾斁鍣紝闈欏抚浣滀负 `poster` 灏侀潰锛堢偣鍑绘挱鏀惧墠灞曠ず锛夛紝涓嶅啀鍙犲姞棰濆鐨勫浘鐗囧眰
  - 鏈敓鎴愯棰戯細濯掍綋鍖烘樉绀洪潤甯у浘锛屽彸涓嬭闄勩€屽皻鏈敓鎴愯棰戙€嶅皬瑙掓爣锛屾瘮鍘熸潵鏁磋鎻愮ず鏂囧瓧鏇磋交閲?
  - 鎵€鏈夊崱鐗囩瓑楂橈紝4 鍒楃綉鏍煎竷灞€鏁撮綈瀵归綈

---

### v0.27 鈥?2026-04-15

**绱犳潗搴?UI 閲嶈璁?+ 涓枃鏂囦欢鍚嶇紪鐮佷慨澶?+ 澶氳处鍙锋暟鎹殧绂?*

**Feature / Fix:**
- **[asset-library] 鍗曢〉鐢诲粖甯冨眬**锛氬簾寮?4-Tab 缁撴瀯锛岃繘鍏ュ嵆鏄剧ず鍏ㄩ儴绱犳潗鐪熷疄缂╃暐鍥剧綉鏍硷紙6 鍒楁鏂瑰舰瑁佸垏锛夛紱鍥剧墖 `<img>` 娓叉煋锛岃棰?`<video>` 灞曠ず棣栧抚 + 鎾斁鎸夐挳銆?
- **[asset-library] 鍙充晶璇︽儏鎶藉眽**锛氱偣鍗＄墖婊戝叆锛屾樉绀哄ぇ鍥鹃瑙堛€佹枃浠朵俊鎭€佸畬鏁?AI 鏍囩锛屽簳閮ㄣ€岀敤浜庣敓鎴愩€嶆寜閽€?
- **[asset-library] 搴曢儴涓婁紶闈㈡澘**锛氱偣銆屼笂浼犵礌鏉愩€嶄粠搴曢儴婊戝叆锛屽畬鎴愬悗鑷姩鍏抽棴骞跺埛鏂扮敾寤娿€?
- **[asset-library] 鍐呭祵鎼滅储 + 绛涢€?*锛氭悳绱㈡ + 姣斾緥/绫诲瀷/鏂瑰悜/鐢昏川 4 涓?dropdown 甯搁┗椤堕儴銆?
- **[asset-library/api] 鍚庣鍝嶅簲瑙勮寖鍖?*锛歚GET /assets` 涓?`GET /search` 杩斿洖 `assets` 瀛楁锛堝惈瀹屾暣 `tags` 鏁扮粍锛夈€?
- **[asset-library/encoding] 涓枃鏂囦欢鍚嶄贡鐮佷慨澶?*锛歁ulter 鍦?Node/Windows 涓嬪皢 UTF-8 鏂囦欢鍚嶉敊璇瘑鍒负 Latin-1锛屾柊澧?`decodeFilename` 宸ュ叿锛坄latin1 鈫?utf8`锛夊湪鍏ュ簱鍓嶄慨姝ｏ紱`fixGarbledFilenames()` 鍦ㄦ湇鍔″惎鍔ㄦ椂涓€娆℃€ц縼绉诲巻鍙茶剰鏁版嵁銆?
- **[asset-library] 瀵煎叆鐧藉睆 Bug 淇**锛氬墠绔?`getJobStatus` 鍝嶅簲褰掍竴鍖栵紙`id鈫抝obId`銆乣failed/interrupted鈫抏rror`锛夛紝`AssetImportPanel` 鍔犻槻寰℃€?`?? ''` 闃?jobId 涓?undefined 鏃跺穿婧冦€?
- **[auth/logout] 鐧诲嚭娓呯悊涓氬姟鏁版嵁**锛氶€€鍑烘椂棰濆娓呴櫎 `gobs_last_project_id`銆乣h5-production-project-v1`锛堥槻姝㈤珮绾у埗鐗囨姤銆岄」鐩姞杞藉け璐ャ€嶏級銆乣production_compass_api_key`锛堝畨鍏級銆乣quickfilm_active_job`銆乣gobs_multishot_job_id`銆?
- **[history] 鏈満瑙嗛鍘嗗彶鎸夎处鍙峰垎妗?*锛歬ey 鏀逛负 `h5-video-history-{username}`锛屼笉鍚岃处鍙风殑鏈満鍘嗗彶浜掍笉鍙銆?
- **[history] 浜戠鍒楄〃鏄熸爣/闅愯棌鍋忓ソ鎸夎处鍙峰垎妗?*锛歬ey 鍔?username 鍚庣紑锛岃处鍙烽棿鍋忓ソ鐙珛銆?

---

### v0.26 鈥?2026-04-15

**淇锛氳鑹?鍦烘櫙鍥剧墖鍥捐 + 鍒嗛暅瑙嗛鏃犳硶鎾斁**

**Root Cause 鍒嗘瀽锛?*
- **鍥捐**锛歚stripBase64` 鍑芥暟鍘熸湰鐢ㄤ簬闃叉澶т綋绉?base64 鎾戝ぇ椤圭洰 JSON锛屼絾閲囩敤浜嗐€屼竴鍒€鍒囥€嶇瓥鐣ワ紝鎶婃墍鏈?`data:` URL 瀛楃涓查兘鍒犻櫎锛屽寘鎷?`imageDataUrl`锛堣鑹?鍦烘櫙澶村儚锛夈€傝繖浜涙槸鐢ㄦ埛鐨勭湡瀹炴暟鎹紝涓嶅簲琚垹銆?
- **瑙嗛榛戝睆**锛歚/api/video/file` 鍦?auth 涓棿浠朵腑宸插 `<video>` 鏍囩鏀捐锛堟棤闇€ Bearer锛夛紝浣嗚矾鐢卞唴閮ㄤ粛鐢?`req.user?.username` 鍋氱敤鎴风洰褰曢壌鏉冦€傛棤 JWT 璁块棶鏃?`req.user` 涓?undefined 鈫?`username='_default'` 鈫?涓庡疄闄呯洰褰?`admin` 涓嶅尮閰?鈫?403 Forbidden銆?
- **鍥剧墖鏂囦欢缂哄け**锛氳鑹插浘鐗囨枃浠朵綅浜?`/home/ubuntu/gobs-data/output/production/images/admin/`锛堜箣鍓嶇敤 `API_DATA_DIR=/home/ubuntu/gobs-data` 涓婁紶锛夛紝浣嗗綋鍓?API 榛樿璇诲彇 `process.cwd()/output/...` 鍗?`/home/ubuntu/qas-h5/api/output/...`锛堟棤 `API_DATA_DIR` 閰嶇疆锛夈€?

**Fix:**
- **[api] `productionPersist.ts`**锛歚stripBase64` 鏀逛负瀛楁鍚嶆劅鐭ョ増鏈紝浠呭垹闄?`previewStillDataUrl`锛堝垎闀滈潤甯ч瑙堬紝~2MB/闀滐紝灞炲彲鍐嶇敓鎴愮紦瀛橈級锛屼繚鐣?`imageDataUrl`锛堣鑹?鍦烘櫙鍥撅級銆乣videoUrl`锛堣棰戠増鏈?URL锛夌瓑鎵€鏈夌敤鎴疯祫浜у瓧娈点€?
- **[api] `video.ts`**锛歚/api/video/file` 鏃?JWT 鏃讹紙`<video>` 鏍囩鐩存帴璁块棶锛夛紝璺宠繃鐢ㄦ埛鐩綍闄愬埗锛屽彧鏍￠獙璺緞鍦?`outputDir` 鏍圭洰褰曚笅锛堥槻鐩綍绌胯秺锛夛紝淇鍏紑瑙嗛鎾斁 403銆?
- **[server] 鍥剧墖鏂囦欢鎭㈠**锛氬皢 `/home/ubuntu/gobs-data/output/production/images/admin/` 鐨勬墍鏈夊浘鐗囧鍒跺埌 `/home/ubuntu/qas-h5/api/output/production/images/admin/`锛屾仮澶嶈鑹?鍦烘櫙/閬撳叿鍥剧墖璁块棶銆?

---

### v0.25 鈥?2026-04-15

**鍗虫ⅵ鎺掗槦鍒嗛暅鏄剧ず缁熶竴涓恒€岀敓鎴愪腑銆?*

**Fix / UX:**
- **[frontend] Shot Strip & 鎸夐挳**锛氱瓑寰呮彁浜ょ殑鍒嗛暅锛圚5 鍐呴儴鎺掗槦涓級缁熶竴鏄剧ず涓恒€岀敓鎴愪腑銆嶆棆杞姩鐢诲拰鏂囨锛屼笉鍐嶆樉绀洪粍鑹茶剦鍐层€屾帓闃熶腑銆嶏紝閬垮厤涓庡嵆姊﹀悗鍙扮姸鎬佷骇鐢熸涔夈€?
- **[api] DREAMINA_MAX_CONCURRENT 榛樿鍊兼敼鍥?1**锛氬嵆姊﹁处鍙峰疄闄呭苟鍙戣兘鍔涘洜璐﹀彿绫诲瀷鑰屽紓锛屼繚瀹堥粯璁?1 浠ラ伩鍏?ret=1310锛涢渶瑕佹洿楂樺苟鍙戞椂鍦?`.env` 涓墜鍔ㄨ缃?`DREAMINA_MAX_CONCURRENT=N`銆?

---

### v0.24 鈥?2026-04-15

**鍗虫ⅵ瑙嗛骞跺彂鏁版彁鍗囷紙1 鈫?5锛?*

**Feature:**
- **[api] DREAMINA_MAX_CONCURRENT 璁℃暟淇″彿閲?*锛氬皢鍘熷厛涓茶鍗曟Ы锛? 骞跺彂锛夋浛鎹负鍙厤缃殑璁℃暟淇″彿閲忥紙榛樿 5 涓苟鍙戞Ы锛夛紝鍏佽鍚屾椂鍚戝嵆姊︽彁浜ゅ涓棰戠敓鎴愪换鍔★紝涓庡嵆姊﹂珮绾т細鍛樿处鍙风殑瀹為檯鑳藉姏瀵归綈銆?
- **[api] ret=1310 閿欒涓撻」璀﹀憡**锛氬綋鍗虫ⅵ杩斿洖 `ExceedConcurrencyLimit (ret=1310)` 鏃讹紝绔嬪嵆閲婃斁妲戒綅骞跺湪 pm2 鏃ュ織涓墦鍗版彁绀猴紙寤鸿闄嶄綆 `DREAMINA_MAX_CONCURRENT`锛夛紝涓嶅啀璁╂Ы浣嶆案涔呴樆濉炪€?
- **[api] 瀹夊叏瓒呮椂寤堕暱**锛氭瘡妲戒綅瀹夊叏瓒呮椂浠?3 鍒嗛挓寤堕暱鑷?5 鍒嗛挓锛岄€傚簲骞跺彂鍦烘櫙涓嬮儴鍒嗕换鍔¤€楁椂杈冮暱鐨勬儏鍐点€?
- **[infra] .env.example 鏂板 `DREAMINA_MAX_CONCURRENT` 璇存槑**锛屾柟渚挎寜璐﹀彿瀹為檯骞跺彂鑳藉姏璋冩暣銆?

**鏍规湰鍘熷洜锛?* 鍘熷疄鐜板熀浜?鍏嶈垂璐﹀彿鍙厑璁?1 骞跺彂"鐨勪繚瀹堝亣璁撅紙娉ㄩ噴 `ret=1310`锛夛紝楂樼骇浼氬憳瀹為檯鏀寔鏇撮珮骞跺彂锛屽鑷?H5 鐐瑰嚮澶氫釜銆岀敓鎴愬垎闀滆棰戙€嶅悗锛屽悗缁换鍔″叏閮ㄥ崱鍦ㄦ湇鍔＄ `await`锛屽嵆姊﹀悗鍙板彧鏈?1 涓换鍔″湪璺戙€?

---

### v0.23 鈥?2026-04-15

**閰嶄箰寮曟搸鏉ユ簮鍙鍖?*

**UX:**
- **[BgmMixPanel] 寮曟搸 badge**锛氶厤涔愮敓鎴愬畬鎴愬悗锛屾爣棰樻梺鏄剧ず褰╄壊灏忔爣绛锯€斺€擿馃幍 Suno`锛堢传鑹诧級鎴?`馃幍 Lyria`锛堣摑鑹诧級锛岄紶鏍囨偓娴樉绀鸿鏄庢枃瀛楋紙"涓诲紩鎿?/"澶囩敤寮曟搸"锛?
- **[BgmMixPanel] 鏃ュ織鍙鎬ф彁鍗?*锛氬畬鎴愭棩蹇椾粠"閰嶄箰宸查摵婊★紙N 娈碉級"鏀逛负"鉁?閰嶄箰瀹屾垚锛堝紩鎿庯細Suno 路 鏃堕暱锛歑s 路 N 棣栵級"锛屾槑纭寘鍚紩鎿庡悕
- **[BgmMixPanel] 鍘婚櫎纭紪鐮?Lyria"**锛氭椂闀挎彁绀轰粠"闇€ N 娈?Lyria 閰嶄箰"鏀逛负"绾﹂渶 N 棣栭厤涔?锛屽寮曟搸涓珛
- **[BgmMixPanel] 瓒呮椂涓婇檺璋冩暣**锛氬墠绔瓑寰呰秴鏃朵粠 160s 鎻愬崌鑷?210s锛屼笌 Suno 鏈€闀跨敓鎴愭椂闂村尮閰?

---

### v0.22 鈥?2026-04-15

**闊充箰鐢熸垚鍙屽紩鎿庯細Suno API锛堜富锛? Lyria锛坆ackup锛?*

**Feature:**
- **[backend] 鏂板 `sunoMusic.ts` 鏈嶅姟**锛氬鎺?sunoapi.org Suno API锛屽叏寮傛娴佺▼锛堟彁浜や换鍔?鈫?6s 闂撮殧杞 鈫?涓嬭浇 MP3锛夛紝鏈€澶х瓑寰?3.5 鍒嗛挓锛屾瘡娆″浐瀹氳繑鍥?2 棣栧櫒涔愭洸鐩?
- **[backend] `editorMusic.ts` 鍙屽紩鎿庤矾鐢?*锛氶厤缃?`SUNO_API_KEY` 鏃堕粯璁よ皟鐢?Suno锛涙晱鎰熻瘝閿欒锛?00锛夌洿鎺ヨ繑鍥烇紝鍏朵綑 Suno 閿欒锛堥厤棰濊€楀敖 429銆並ey 鏃犳晥 401銆佺綉缁滆秴鏃剁瓑锛夎嚜鍔?fallback 鍒?Lyria锛汳P3/WAV 鍙屾牸寮忔枃浠舵湇鍔?
- **[backend] 鍝嶅簲鏂板瀛楁**锛歚provider: 'suno' | 'lyria'`锛屽憡鐭ュ墠绔疄闄呬娇鐢ㄥ紩鎿庯紱Suno 妯″紡涓嬫瘡棣?`durationSec` 浣跨敤鐪熷疄鏃堕暱锛堥潪鍥哄畾 32.8s锛?
- **[frontend] API 绫诲瀷鎵╁睍**锛歚GenerateEditorMusicBody` 鏂板 `style`/`title` 瀛楁锛圫uno customMode锛夛紝`GenerateEditorMusicResponse` 鏂板 `provider` 瀛楁
- **[config] `.env.example` 琛ュ厖**锛氭柊澧?`SUNO_API_KEY`銆乣SUNO_MODEL`锛堥粯璁?`V4_5ALL`锛夈€乣SUNO_API_BASE_URL` 涓変釜閰嶇疆椤硅鏄?

**浣跨敤璇存槑锛?*
鍦?`h5-video-tool-api/.env` 涓坊鍔?`SUNO_API_KEY=sk-xxx` 鍚庨噸鍚嵆鐢熸晥锛涗笉閰嶇疆鎴?Suno 澶辫触鏃剁郴缁熼€忔槑闄嶇骇鍒?Lyria锛屽姛鑳戒笉涓柇銆?

---

### v0.21 鈥?2026-04-15

**绱犳潗瀵煎叆鐧藉睆 Bug 淇**

**Fix:**
- **[asset-library/import] 鎵归噺瀵煎叆鐧藉睆淇**锛氫慨澶嶆壒閲忓鍏ュ浘鐗囧悗椤甸潰鐩存帴鐧藉睆鐨勯棶棰樸€傛牴鍥狅細鍚庣 `GET /import/:jobId` 杩斿洖 DB 琛屽瓧娈典负 `id`锛屽墠绔疆璇㈠悗璋冪敤 `job.jobId.slice(0,8)` 鏃?`jobId` 涓?`undefined` 瀵艰嚧 `TypeError`锛孯eact 缁勪欢鏍戝穿婧冦€?
- **[asset-library/import] 杞姘镐笉鍋滄淇**锛氬悗绔?job status 瀛樺湪 `'failed'` / `'interrupted'` 涓や釜缁堟€侊紝浣嗗墠绔粎妫€鏌?`'done'` / `'error'`锛屽鑷磋疆璇㈠唴瀛樻硠婕忋€傜幇鍦?`getJobStatus` API 鍑芥暟缁熶竴褰掍竴鍖栵細`failed`/`interrupted` 鈫?`error`銆?
- **[asset-library/import] 闃插尽鎬ф鏌?*锛歚job.jobId` 娓叉煋澶勫鍔犵┖鍊间繚鎶?`(job.jobId ?? '')` 闃叉鍚庣画娼滃湪宕╂簝銆?

---

### v0.20 鈥?2026-04-15

**瀵煎嚭鍘嗗彶绠＄悊闈㈡澘**

**Feature:**
- **[editor/export] 鍘嗗彶瀵煎嚭闈㈡澘**锛氬鍑烘寜閽彸渚ф柊澧?鈴?鍘嗗彶"鍥炬爣鎸夐挳锛岀偣鍑诲脊鍑洪潰鏉匡紝鍒楀嚭璇ヨ处鍙峰湪鏈嶅姟鍣ㄤ笂淇濆瓨鐨勬墍鏈夊鍑鸿棰戯紙鏈€鏂板湪鍓嶏級锛屾樉绀哄鍑烘椂闂村拰鏂囦欢澶у皬銆?
- **[editor/export] 鍒锋柊涓嶅啀涓㈠け**锛氶潰鏉夸粠鏈嶅姟鍣ㄦ枃浠剁郴缁熷疄鏃舵壂鎻忥紝涓嶄緷璧栧唴瀛樼姸鎬併€傚埛鏂伴〉闈€侀噸鏂版墦寮€缂栬緫鍣ㄥ悗锛屽巻鍙插鍑烘枃浠朵緷鐒跺彲瑙侊紝鏃犻渶閲嶆柊瀵煎嚭銆?
- **[editor/export] 鍘嗗彶涓嬭浇**锛氶潰鏉垮唴姣忔潯璁板綍鍧囨惡甯?JWT 閴存潈澶翠笅杞斤紙澶嶇敤 `apiDownload`锛夛紝鏃?401 闂銆?
- **[editor/export] 鍘嗗彶鍒犻櫎**锛氭瘡鏉¤褰曞彲鍗曠嫭鍒犻櫎锛堜簩娆＄‘璁わ級锛屾竻鐞嗕笉鍐嶉渶瑕佺殑瀵煎嚭鏂囦欢锛岄伩鍏嶆湇鍔″櫒绌洪棿鏃犻檺绱Н銆?
- **[editor/export] 鑷姩鍒锋柊鍒楄〃**锛氬綋鍓嶄細璇濆鍑哄畬鎴愬悗锛岄潰鏉垮垪琛ㄨ嚜鍔ㄨ拷鍔犳柊鏂囦欢锛屾棤闇€鎵嬪姩鍒锋柊銆?

**API锛堝悗绔級:**
- `GET /api/editor/export/files` 鈥?鍒楀嚭褰撳墠鐢ㄦ埛鎵€鏈?`.mp4/.mov` 瀵煎嚭鏂囦欢锛堝惈鏂囦欢澶у皬銆佸垱寤烘椂闂淬€佷笅杞?URL锛夛紝鎸夋椂闂村€掑簭
- `DELETE /api/editor/export/files/:filename` 鈥?鍒犻櫎鎸囧畾瀵煎嚭鏂囦欢

---

### v0.19 鈥?2026-04-15

**瀵煎嚭涓嬭浇閴存潈淇**

**Bug Fix:**
- **[editor/export] 涓嬭浇鎴愬搧 401 "闇€瑕佽幏寰楁巿鏉?**锛氬鍑哄畬鎴愬悗鐨勩€屸瑖 涓嬭浇鎴愬搧銆嶆寜閽師涓?`<a href>` 鐩存帴瀵艰埅锛屾祻瑙堝櫒涓嶆惡甯?`Authorization` 澶达紝鍚庣閴存潈涓棿浠惰繑鍥?401銆傛敼涓洪€氳繃 `fetch` + JWT 澶磋姹傦紝灏嗗搷搴旇浆涓?Blob URL 鍐嶈Е鍙戞祻瑙堝櫒淇濆瓨瀵硅瘽妗嗐€?
- **[frontend/client] 鏂板 `apiDownload` 宸ュ叿鍑芥暟**锛氬湪 `client.ts` 涓粺涓€灏佽甯﹂壌鏉冪殑鏂囦欢涓嬭浇鑳藉姏锛屼究浜庡悗缁叾浠栭渶瑕佽璇佷笅杞界殑鍦烘櫙澶嶇敤銆?

---

### v0.18 鈥?2026-04-15

**楂樼骇鍒剁墖鍒嗛暅瑙嗛鎭㈠杞淇**

**Bug Fix:**
- **[frontend] 鍒嗛暅瑙嗛鍒锋柊鍚庝笉鍐嶅洖濉?*锛氭仮澶嶈疆璇㈢殑 `useEffect(deps=[])` 鍦ㄧ粍浠舵寕杞芥椂绔嬪嵆鎵ц锛屼絾鏈嶅姟绔」鐩紓姝ュ姞杞藉皻鏈畬鎴愶紝`project.shots` 涓虹┖锛屽鑷?`pendingVideoSubmitId` 姘歌繙鏃犳硶琚娴嬪埌銆傛槰澶╂彁浜ょ殑鍗虫ⅵ浠诲姟鍒锋柊椤甸潰鍚庝笉浼氳嚜鍔ㄧ画鎺ヨ疆璇紝瑙嗛鐢熸垚缁撴灉涓㈠け銆?
- **[frontend] 淇鏂规**锛氬皢 `useEffect` 渚濊禆鏀逛负 `[isServerBootstrapping]`锛岀瓑寰呮湇鍔＄椤圭洰鍔犺浇瀹屾垚锛坄isServerBootstrapping=false`锛夊悗鍐嶆墽琛屾仮澶嶈疆璇紱鏂板 `hasResumedPollingRef` 闃叉鍥犲悗缁?`project` 鍙樺寲閲嶅瑙﹀彂銆?

**鏍规湰鍘熷洜锛?* React 涓や釜 `useEffect(deps=[])` 鍚屾椂鍦?mount 鎵ц锛屼絾鏈嶅姟绔」鐩姞杞芥槸寮傛鐨勶紝鎭㈠杞鎬诲厛浜庨」鐩暟鎹彲鐢ㄨ€岃繍琛屻€?

---

### v0.17 鈥?2026-04-15

**鍓緫浣撻獙涓夐」浼樺寲 & 閿欒淇℃伅鏀瑰杽**

**Feature / UX:**
- **[editor] 杩涘叆鑷姩鎵撳紑鏈€杩戦」鐩?*锛氶娆″姞杞?`/editor` 鏃讹紝鑻ユ湁宸蹭繚瀛橀」鐩紝鑷姩閫氳繃 URL param `?project=xxx` 鎵撳紑鏈€杩戠紪杈戠殑椤圭洰锛屼笉鍐嶆瘡娆￠兘灞曠ず绌虹櫧"鏈懡鍚嶅壀杈戦」鐩?锛沀RL 鍚屾鏇存柊锛屽埛鏂颁繚鎸侀」鐩笉涓?
- **[editor] 鏂板缓椤圭洰鍛藉悕寮圭獥**锛氱偣鍑汇€? 鏂板缓銆嶆垨椤圭洰绠＄悊鍣ㄤ腑鐨勩€屾柊寤哄壀杈戙€嶆椂锛屽脊鍑哄懡鍚嶅璇濇锛堥粯璁ゅ悕鍚棩鏈熸椂闂达紝濡?`鍓緫-0415-1030`锛夛紝鏀寔鍥炶溅纭 / Esc 鍙栨秷锛岄」鐩粠鍒涘缓璧峰氨鏈夎涔夊寲鍚嶇О
- **[editor] 椤舵爮 UI 浼樺寲**锛氥€岀鐞嗛」鐩€嶆敼涓恒€屾垜鐨勯」鐩?(N)銆嶆樉绀哄疄闄呮暟閲忥紱銆? 鏂板缓銆嶄娇鐢ㄤ富鑹茶皟绐佸嚭鏄剧ず

**Bug Fix:**
- **[editor/export] drawtext 棰勬**锛氬鍑哄墠鍏堥€氳繃 `ffmpeg -filters` 妫€娴?drawtext 鏄惁鍙敤锛堢粨鏋滅紦瀛橈級锛屾湇鍔″櫒 FFmpeg 缂哄皯 libfreetype 鏃剁洿鎺ヨ烦杩囨枃瀛楀眰锛屼笉鍐嶅湪杩愯鏃舵姤閿欏悗鎵嶉檷绾э紝娑堥櫎鍋跺彂鐨?瀵煎嚭澶辫触锛欶Fmpeg 閫€鍑虹爜 8"
- **[api] Compass 缃戠粶閿欒鎻愮ず**锛欳ompass API 杩炴帴澶辫触缁?3 娆￠噸璇曚粛涓嶅彲杈炬椂锛岄敊璇秷鎭粠瑁搁湶鐨?`"Network Error"` 鏀逛负銆孉I 鏈嶅姟鏆傛椂涓嶅彲杈撅紙宸查噸璇?3 娆★級锛岃绋嶅悗閲嶈瘯銆傚鎸佺画鍑虹幇锛岃妫€鏌ユ湇鍔″櫒鍑虹綉閰嶇疆鎴?COMPASS_API_URL銆?
- **[frontend] fetch 缃戠粶閿欒缁熶竴澶勭悊**锛歚apiGet` / `apiPost` 鏂板 `wrapFetchError()` 鎹曡幏 `fetch()` 鏈韩鎶涘嚭鐨勬祻瑙堝櫒缃戠粶寮傚父锛坄Failed to fetch / NetworkError / Load failed`锛夛紝缁熶竴杞负銆屾棤娉曡繛鎺ュ埌鏈嶅姟鍣紝璇锋鏌ョ綉缁滃悗閲嶈瘯銆?

---

### v0.17a 鈥?2026-04-15

**鏈嶅姟鍣ㄧ幆澧冨彉閲忎慨澶嶏紙Windows 璺緞 鈫?Linux 璺緞锛?*

**Bug Fix:**
- **[infra] `PYTHON_EXE` 璺緞淇**锛氭湇鍔″櫒 `.env` 涓?`PYTHON_EXE` 琚敊璇缃负 Windows 璺緞锛坄C:/Users/wei.liu/...`锛夛紝瀵艰嚧銆岀敓鎴愬垎闀滆棰戙€嶆椂鎶?`spawn ENOENT`銆傚凡鏀逛负 `/usr/bin/python3`锛圲buntu 瀹為檯璺緞锛?
- **[infra] `DREAMINA_BIN` 璺緞淇**锛歐indows 璺緞 鈫?`/home/ubuntu/.local/bin/dreamina`
- **[infra] `YT_DLP_PATH` 璺緞淇**锛歐indows 璺緞 鈫?`/home/ubuntu/.local/bin/yt-dlp`

**鏍规湰鍘熷洜锛?* 鏈湴 `.env`锛堝惈 Windows 璺緞锛夊湪鏌愭閮ㄧ讲鏃惰鏁翠綋瑕嗙洊鍒版湇鍔″櫒锛屾湇鍔″櫒闇€瑕佺殑鏄?Linux 缁濆璺緞銆傛湇鍔″櫒 `.env` 宸茬洿鎺ヤ慨澶嶏紝鏈敼鍔ㄤ唬鐮併€?

---

### v0.16 鈥?2026-04-15

**楂樼骇鍒剁墖椤圭洰鍔犺浇鎬ц兘浼樺寲**

**Bug Fix / Perf:**
- **[api] 淇濆瓨鍓?strip base64**锛歚/api/production/project/save` 鍦ㄥ啓纾佺洏鍓嶉€掑綊灏嗘墍鏈?`data:` URL 鏇挎崲涓?`null`锛岄槻姝㈡湭瀹屾垚涓婁紶鐨勪复鏃?base64 鍥剧墖锛堟瘡寮?~2MB锛夋拺澶ч」鐩?JSON锛堝師 18MB 鈫?棰勮 <1MB锛?
- **[api] sidecar `.meta.json`**锛氭瘡娆′繚瀛樻椂鍚屾鍐欎竴浠戒粎鍚?`{id, title, updatedAt, step}` 鐨勮交閲?sidecar 鏂囦欢锛垀100 瀛楄妭锛夛紝`/project/list` 浼樺厛璇?sidecar锛屼笉鍐嶈В鏋愬叏閲?JSON锛岄」鐩垪琛ㄥ姞杞戒粠绉掔骇闄嶈嚦姣绾э紱鏃?sidecar 鐨勬棫椤圭洰鑷姩鍥為€€瑙ｆ瀽鍏ㄩ噺 JSON锛堝悜鍚庡吋瀹癸級
- **[api] 鍒犻櫎鏃跺悓姝ユ竻鐞?sidecar**锛歚DELETE /api/production/project` 杩炲悓 `.meta.json` 涓€骞跺垹闄?

**鏍规湰鍘熷洜璇存槑锛?*
鑷姩淇濆瓨锛?s 闃叉姈锛夊湪鍥剧墖涓婁紶瀹屾垚鍓嶈Е鍙戯紝瀵艰嚧 base64 琚啓鍏ョ鐩橈紱`/project/list` 閫愪釜瑙ｆ瀽鍏ㄩ噺 JSON 鑾峰彇鍏冧俊鎭€傛湰娆′慨澶嶅湪鏈嶅姟绔厹搴曪紝涓嶄緷璧栧墠绔笂浼犳椂搴忋€?

---

### v0.16a 鈥?2026-04-15

**浠撳簱鐦﹁韩 & .gitignore 瀹夊叏淇**

**Chore:**
- **[repo] 鍒犻櫎鍘嗗彶閮ㄧ讲鍖?*锛氭竻鐞?`deploy-full-20260413-1620/`銆乣deploy/cloud-baseline/`銆?0 涓?`gobs-*.tar.gz`銆? 涓?`.zip` 绛夊叡 ~30MB 褰掓。锛屼粨搴撲綋绉樉钁楃缉鍑?
- **[repo] 鍒犻櫎涓存椂璋冭瘯鏂囦欢**锛歚debug_path.mjs`銆乣final_test.sh`銆乣test_api.sh`銆乣tmp_flash_image_test.png`銆乣gobs_ppt*.py`銆佺┖鍗犱綅鏂囦欢 `claude`銆佹棫鐗?`.cmd` 鍚姩鑴氭湰
- **[repo] 鍒犻櫎鍙啀鐢熸垚浜х墿**锛歚h5-video-tool/dist/`銆乣h5-video-tool-api/dist/`銆乣out/` 绛夌紪璇戣緭鍑虹洰褰?
- **[frontend] 鍒犻櫎姝讳唬鐮侀〉闈?*锛歚TabMaterials.tsx`锛堝叏椤圭洰鏃犺矾鐢?鏃犲紩鐢級
- **[security] 琛ュ叏 `.gitignore`**锛氭柊澧?`*.db`/`*.db-shm`/`*.db-wal`銆乣dreamina-login.json`銆乣editor-projects/`銆乣uploads/`銆乣.claude/settings.local.json` 绛夎鍒欙紝闃叉鏁版嵁搴撴枃浠跺拰鐧诲綍鍑瘉鎰忓杩涘叆 Git 鍘嗗彶

---

### v0.15 鈥?2026-04-15

**鍓嶇鐘舵€佺鐞嗗崌绾э紙React Query锛?*

**Feature:**
- **[frontend] React Query 鍩虹璁炬柦**锛氬畨瑁?`@tanstack/react-query`锛屽湪 `main.tsx` 鎸傝浇 `QueryClientProvider`锛坄staleTime=10s`銆乣retry=1`銆乣refetchOnWindowFocus=false`锛?
- **[frontend] `useVideoTaskQuery` hook**锛氭柊澧?`useDreaminaTaskQuery(submitId)` 鍜?`useKlingTaskQuery(taskId)`锛屼娇鐢?React Query 鐨?`refetchInterval` 瀹炵幇闈為樆濉炶棰戜换鍔¤疆璇紱浠诲姟瀹屾垚/澶辫触鍚庤嚜鍔ㄥ仠姝㈣疆璇?
- **[frontend] 绫诲瀷鎵╁睍**锛歚DreaminaTaskPollResponse` 鍜?`KlingTaskStatusResponse` 鍧囨柊澧炲彲閫?`errorCode` 瀛楁锛屼笌鍚庣鎵规 5 鐨勯敊璇爜瀵归綈

**鑳屾櫙璇存槑锛堟壒娆?7 鐜扮姸锛夛細**
鍓緫鍣ㄦ挙閿€/閲嶅仛锛坄useUndoRedo`锛宒epth=50锛夊拰鑷姩淇濆瓨锛?s 闃叉姈锛岄€氳繃 `/api/editor/projects`锛夊凡鍦ㄦ鍓嶇増鏈疄鐜帮紝鏈壒娆＄‘璁ゅ苟瀹屽杽浜嗙浉鍏冲熀纭€璁炬柦銆?

---

### v0.14 鈥?2026-04-15

**宸ㄧ煶鏂囦欢鎷嗗垎锛堟壒娆?6锛?*

**Refactor:**
- **[api] `videoMultishot.ts` 鐙珛璺敱**锛氬皢 `video.ts` 涓殑澶氶暅澶翠换鍔＄郴缁燂紙绫诲瀷瀹氫箟銆?50+ 琛屼换鍔″紩鎿庛€乫fmpeg 鎷兼帴銆乣/generate-multishot`銆乣/multishot-job/:jobId` 璺敱锛夋彁鍙栧埌鐙珛鏂囦欢锛宍video.ts` 琛屾暟浠?647 琛岄檷鑷?~400 琛?
- **[api] multishot 璺緞瑙勮寖鍖?*锛歚MULTISHOT_JOBS_ROOT` 鏀圭敤 `resolvePath('multishot-jobs')` 鑰岄潪 `path.join(getApiDataDir(), 'multishot-jobs')`锛屼笌 storageResolver 瀵归綈
- **[api] `/generate` 閿欒鍝嶅簲鍔犲叆 `errorCode`**锛欴reamina 鏈櫥褰曟椂闄勫甫 `errorCode: DREAMINA_NOT_LOGGED_IN`
- **[frontend] 鍚堝苟 `useVideoGenerate` 鈫?`useVideoGeneration`**锛氬垹闄ゅ弻杞?hook锛岀粺涓€浣跨敤 `useVideoGeneration`锛涘悜鍚庡吋瀹瑰湴瀵煎嚭 `generateMultishot`銆乣loading`銆乣error`銆乣clearError`銆乣setError`銆乣useMock` 绛夊睘鎬?

---

### v0.13 鈥?2026-04-15

**浠诲姟鐘舵€佹満鏍囧噯鍖栵紙job-status domain锛?*

**Refactor:**
- **[domain] 缁熶竴 `JobStatus` / `JobErrorCode` 鏋氫妇**锛氭柊澧?`src/domain/job-status.ts`锛屽畾涔?6 绉嶄换鍔＄姸鎬侊紙`queued/running/succeeded/failed/timeout/canceled`锛夊拰 15 绉嶅叿鍚嶉敊璇爜
- **[api] `classifyError()` 宸ュ叿鍑芥暟**锛氳嚜鍔ㄥ皢浠绘剰 Error 瀵硅薄鏄犲皠鍒扮粨鏋勫寲閿欒鐮侊紙瑕嗙洊 Dreamina 鏈櫥褰曘€丆ompass 429銆並ling 401銆佽秴鏃剁瓑鍦烘櫙锛?
- **[api] Dreamina 閿欒鍝嶅簲鍔犲叆 `errorCode`**锛歚/api/video/dreamina/submit` 鍜?`/task/:submitId` 鐨勬墍鏈夊け璐ヨ矾寰勫潎鎼哄甫 `errorCode`锛屽墠绔彲绮剧‘鍖归厤鎻愮ず鏂囨锛堝銆屽嵆姊︽湭鐧诲綍銆峷s銆屽唴瀹瑰鏍告嫤鎴€嶏級
- **[api] Kling 閿欒鍝嶅簲鍔犲叆 `errorCode`**锛氭墍鏈夊彲鐏佃矾鐢?catch 鍧楃粺涓€浣跨敤 `classifyError`锛屽憡鍒?`'鏈煡閿欒'` 瀛楃涓?

---

### v0.12 鈥?2026-04-15

**璺緞鎶借薄灞傦紙storageResolver锛?*

**Refactor:**
- **[infra] storageResolver 缁熶竴璺緞鍏ュ彛**锛氭柊澧?`src/infra/storage/resolver.ts`锛屽畾涔?20+ 绉嶄笟鍔¤矾寰勭被鍨嬶紙`db`銆乣video-output`銆乣uploads/editor`銆乣projects`銆乣character-library`銆乣.data` 绛夛級锛屾墍鏈変笟鍔′唬鐮侀€氳繃 `resolvePath(type, ...segments)` 鑾峰彇缁濆璺緞
- **[fix] 淇 6 澶?`process.cwd()` 鏃佽矾**锛歚assetDb.ts`銆乣localUpload.ts`銆乣characterLibrary.ts`銆乣projects.ts`銆乣assetIngestService.ts`銆乣gobsAuthStore.ts`銆乣riskSentimentService.ts` 鍏ㄩ儴鏀圭敤 resolver锛屾秷闄?鏇存崲 API_DATA_DIR 鍚庨儴鍒嗚矾寰勪笉璺熼殢"鐨勯殣鎮?
- **[infra] 鐩綍鑷鎵╁睍**锛氬惎鍔ㄦ椂鑷鐩綍鏂板 `db/` 鍜?`.data/`

---

### v0.11 鈥?2026-04-15

**鍩虹鏋舵瀯瀹夊叏鍔犲浐 & 杩愮淮鏍囧噯鍖栵紙鎵规 0-3锛?*

**瀹夊叏淇锛堢揣鎬ワ級锛?*
- **[infra] Nginx 璺緞淇**锛氭湇鍔″櫒 Nginx root 缁熶竴鎸囧悜 `/home/ubuntu/qas-h5/frontend`锛堟渶鏂版瀯寤轰骇鐗╋級锛屾秷闄?鐢ㄦ埛璁块棶鏃х増鏈?闂锛堝師鏈?3 浠藉壇鏈紝Nginx 鎸囧悜鐨勪笉鏄渶鏂扮増锛?
- **[infra] API 绔彛鏀舵暃**锛歚Express.listen` 缁戝畾鍦板潃浠?`0.0.0.0` 鏀逛负 `127.0.0.1`锛屽缃戞棤娉曠粫杩?Nginx 鐩磋繛 3001 绔彛
- **[infra] 鏈嶅姟鍣ㄥ瘑閽ユ竻鐞?*锛氫粠鏈嶅姟鍣?`.env` 绉婚櫎 `SERVER_PASSWORD`锛圫SH 鐧诲綍瀵嗙爜锛夛紝璇ュ瓧娈典粎渚涙湰鍦伴儴缃茶剼鏈娇鐢?

**鏁版嵁瀹夊叏锛?*
- **[infra] assets.db 杩佺Щ**锛歋QLite 绱犳潗鏁版嵁搴撲粠娣峰湪瑙嗛杈撳嚭鐩綍锛坄output/assets.db`锛夎縼绉诲埌涓撳睘鐩綍锛坄api/db/assets.db`锛夛紝娑堥櫎璇竻鐞嗗鑷存暟鎹涪澶辩殑椋庨櫓

**鐗堟湰鍙拷婧€э細**
- **[api] `/api/system/version` 鎺ュ彛**锛氭柊澧炴棤閴存潈鐗堟湰鏌ヨ鎺ュ彛锛岃繑鍥?`commitSha`銆乣branch`銆乣buildTime`锛屽彲闅忔椂楠岃瘉绾夸笂杩愯鐨勬槸鍝釜 commit
- **[build] build-info.json 娉ㄥ叆**锛歚npm run build` 鑷姩鐢熸垚 `dist/build-info.json`锛岃褰?git commit / branch / 鏋勫缓鏃堕棿

**閮ㄧ讲鏍囧噯鍖栵細**
- **[scripts] 缁熶竴閮ㄧ讲鑴氭湰**锛氭柊澧?`scripts/deploy_all.py` / `deploy_api.py` / `deploy_frontend.py`锛屼竴閿畬鎴愭瀯寤轰骇鐗╀笂浼?+ pm2 閲嶅惎 + 鐗堟湰涓€鑷存€ч獙璇侊紱鍓嶇涓婁紶鐩爣鐩綍缁熶竴锛屼笉鍐嶅嚭鐜板鍓湰闂

**鍚姩鑷锛?*
- **[api] env 鏍￠獙**锛氭湇鍔″惎鍔ㄦ椂鑷姩鏍￠獙蹇呭～鐜鍙橀噺锛坄COMPASS_API_URL`銆乣COMPASS_API_KEY`锛夛紝缂哄け鏃?10 绉掑唴鎶ラ敊骞舵槑纭墦鍗扮己澶卞瓧娈靛悕锛屼笉鍐嶉潤榛樺紓甯?
- **[api] 鐩綍鑷**锛氬惎鍔ㄦ椂鑷姩鍒涘缓 `output/`銆乣uploads/`銆乣uploads/editor/`銆乣db/` 绛夊繀瑕佺洰褰曪紝鏂扮幆澧冩棤闇€鎵嬪姩鍒濆鍖?
- **[docs] `.env.example` 瀹屽杽**锛氳ˉ鍏呭繀濉?鍙€?鏈湴涓撶敤涓夌被鍒嗗尯娉ㄩ噴锛屾柊澧?`SERVER_*` 瀛楁鐨勫畨鍏ㄨ鏄?

---

### v0.10 鈥?2026-04-14

**瑙嗛鍓緫涓夌被鏍稿績闂淇**

**Bug Fix:**
- **[editor] 涓嶅啀鑷姩鍒涘缓绌洪」鐩?*锛氳繘鍏?`/editor` 椤甸潰鏃讹紝鍙湁娣诲姞浜嗙礌鏉愶紙瑙嗛鐗囨銆侀煶棰戙€佸瓧骞曪級鍚庢墠瑙﹀彂鑷姩淇濆瓨锛屾秷闄ゆ瘡娆¤繘鍏ラ兘浜х敓"鏈懡鍚嶅壀杈戦」鐩?鐨勯棶棰?
- **[editor] 椤圭洰绠＄悊寮圭獥**锛氶《閮ㄦ爮銆岀鐞嗛」鐩€嶆寜閽墦寮€鍏ㄥ姛鑳介」鐩鐞嗗脊绐楋紝鏀寔锛?
  - 鏈€杩戜紭鍏堟帓搴?+ 鐩稿鏃堕棿鏄剧ず锛?3鍒嗛挓鍓?锛?
  - 琛屽唴閲嶅懡鍚嶏紙鍚庣鏂板 PATCH 鎺ュ彛锛?
  - 鍒犻櫎鍓嶇‘璁ゆ楠?
  - 椤圭洰鍚嶆悳绱㈣繃婊?
  - 绉婚櫎浜嗗師鏉ユ棤纭鐨勩€屽垹闄ゃ€嶆寜閽?
- **[editor] 瀵煎嚭涓嶅啀鍥犳枃瀛楄建鎶ラ敊閫€鍑虹爜 8**锛欶Fmpeg `drawtext` 杩囨护鍣ㄥ湪鏈嶅姟鍣?Linux apt 鐗堟湰涓己灏?`libfreetype` 鏃讹紝瀵煎嚭娴佺▼鐜板湪浼氾細
  1. 鍦?Linux 涓嬭嚜鍔ㄦ帰娴嬪苟娉ㄥ叆 `fontfile=` 鍙傛暟锛堜娇鐢ㄧ郴缁熷瓧浣擄級
  2. 鑻ヤ粛涓嶆敮鎸?`drawtext`锛屾崟鑾烽敊璇紝璺宠繃鏂囧瓧杞紝鍦ㄨ繘搴︿腑鏄剧ず 鈿狅笍 鎻愮ず锛屽鍑烘甯稿畬鎴愶紙涓嶅惈鏂囧瓧灞傦級

---

### v0.9 鈥?2026-04-14

**鍗虫ⅵ鍒嗛暅瑙嗛涓ょ被 Bug 淇**

**Bug Fix:**
- **[studio] 鍙傝€冨浘鍘嬬缉**锛氬寮犲弬鑰冨浘鎻愪氦鍗虫ⅵ鏃讹紝灏?PNG锛垀2-4MB锛夊帇缂╀负 JPEG锛坢ax 768px, quality 0.85锛寏150-250KB锛夛紝瑙ｅ喅 TOS 涓婁紶澶辫触锛?upload phase, no file upload"锛?
- **[studio] 鍒嗛暅瑙嗛鏄剧ず淇**锛氬嵆姊︾敓鎴愬畬鎴愬悗锛孉PI 涓嶅啀鍦?JSON 鍝嶅簲涓繑鍥炲畬鏁磋棰?data URL锛垀100MB锛夈€傛敼涓鸿繑鍥炴湇鍔?URL锛坄/api/video/file?path=...`锛夛紝褰诲簳瑙ｅ喅杞瓒呮椂鍜?localStorage 閰嶉婧㈠嚭闂

---

### v0.8 鈥?2026-04-13

**鍗虫ⅵ骞跺彂鎻愪氦 + 鎺掗槦鐘舵€?UX**

**Feature:**
- **[studio] 骞跺彂鍒嗛暅瑙嗛鎻愪氦**锛氬嵆姊︿换鍔″湪鏀跺埌 `submit_id` 鍚庣珛鍗抽噴鏀鹃槦鍒楁Ы锛堝師涓虹瓑寰呭畬鏁磋疆璇級锛屽涓垎闀滃彲骞跺彂鎻愪氦鍜岃疆璇?
- **[studio] 鎺掗槦涓?/ 鐢熸垚涓?鐘舵€?*锛氬垎闀滄潯鍜屻€岀敓鎴愬垎闀滆棰戙€嶆寜閽柊澧炪€屾帓闃熺瓑寰呬腑鈥︺€嶏紙榛勮壊锛夊拰銆屽嵆姊︽彁浜?鐢熸垚涓€︺€嶏紙鐞ョ弨鑹诧級涓ょ鐙珛鐘舵€?

---

### v0.7 鈥?2026-04-12 鑷?2026-04-13

**鍓緫鍙敤鎬ф彁鍗囷紙P0-P1 鍔熻兘锛?*

**Feature:**
- **[editor] 闊抽娉㈠舰鍙鍖?*锛氭椂闂磋酱闊抽鐗囨鑳屾櫙鏄剧ず FFmpeg showwavespic 鐢熸垚鐨勬尝褰㈠浘
- **[editor] crossfade 杞満瀵煎嚭**锛氫娇鐢?FFmpeg xfade filter 瀹炵幇鍙犲寲杞満锛屼笉鍐嶆槸纭垏
- **[editor] 鎷栨嫿杈圭紭 Trim**锛氭椂闂磋酱鐗囨宸﹀彸杈圭紭鍚勬湁 6px Resize Handle锛屾嫋鎷藉彲绮捐皟鍏ュ嚭鐐?
- **[editor] 绱犳潗鎮仠棰勮**锛氱礌鏉愬簱鍗＄墖鎮仠 300ms 寮瑰嚭瑙嗛棰勮
- **[editor] BGM 娣″叆娣″嚭**锛氬鍑烘椂 BGM 杞ㄨ嚜鍔ㄥ姞娣″叆锛?s锛夊拰娣″嚭锛堝彲璋?0-3s锛?
- **[editor] 鎾斁閫熷害瀹炴椂棰勮**锛氳缃皟閫熷悗棰勮瑙嗛鍚屾 playbackRate

---

### v0.6 鈥?2026-04-11 鑷?2026-04-12

**绋冲畾鎬т慨澶?*

**Bug Fix:**
- 鍗虫ⅵ鏈嶅姟绔苟鍙戞Ы锛堝悓璐﹀彿闄?1 涓苟鍙戯級锛屽鐢ㄦ埛瀹夊叏
- 鍗虫ⅵ澶氭ā鎬?TOS 涓婁紶鐬椂澶辫触鑷姩閲嶈瘯锛堟渶澶?2 娆★級
- editor 瑙嗛鏂囦欢閴存潈鏃佽矾瀵艰嚧榛戝睆闂淇
- `crypto.randomUUID()` 鏇挎崲涓?HTTP 瀹夊叏鐨?fallback锛屽吋瀹归潪 HTTPS 鐜

---

### v0.5 鈥?鏇存棭鐗堟湰

- 鍒濈増 AI 鍒嗛暅宸ヤ綔鍙帮紙5-Step 鍚戝锛?
- 鍒濈増鍓緫宸ヤ綔鍙帮紙鏃堕棿杞淬€佹枃瀛楃増寮忋€丅GM銆丄gent锛?
- 鍗虫ⅵ CLI 闆嗘垚銆並ling API 闆嗘垚
- 鐢ㄩ噺鐩戞帶銆佸巻鍙茶褰曘€佺敾寤?

---

*Last updated: 2026-05-06 (v0.138)*


Latest update 2026-05-06: Ark Seedance API now replaces the Dreamina CLI path for GOBS video generation.

Latest update 2026-05-06: Fixed Ark Seedance provider model IDs so production jobs submit to the actual callable Ark video models.




---

## v0.135 - 2026-05-06 (Campaign Creative Addendum)
- Added a dedicated /campaign-creative entry path from homepage and top navigation.
- Added a brief-first campaign workflow with Brand Content and TikTok UA modes.
- Added a strategy-card artifact and a brief-to-Editor handoff path.
- Added region and forbiddenClaims to the shared brief contract used by Editor Agent.

## v0.136 - 2026-05-06 (Strategy Productization Addendum)
- Added briefId and strategyId so Campaign Creative strategy objects can be traced across page, Editor handoff, and agent prompt paths.
- Expanded the shared strategy contract with targetAudience, sellingPointFocus, ctaType, assetNeeds, and riskNotes.
- Upgraded the Campaign Strategy Card and Editor-side strategy summary to surface richer creative-planning context.
- Fixed Campaign Creative handoff storage-key compatibility and replaced brittle JSON string equality with brief-aware matching.

## v0.137 - 2026-05-06 (Strategy Tuning Addendum)
- Added a lightweight strategy tuning layer on `/campaign-creative` so users can adjust hook direction, selling-point focus, and CTA type without rewriting the brief.
- Reworked local strategy generation so tuned strategy objects keep stable IDs while recomputing hook options, angle, tone, rationale, and CTA framing.
- Extended Editor handoff and creative prompt payloads to preserve `hookApproach`, making the tuned strategy visible in the Editor-side summary and agent context.
- Added regression coverage for default hook-approach generation and tuned strategy prompt composition.

## v0.138 - 2026-05-06 (Variant Pack MVP Addendum)
- Added a `Variant Pack` layer on `/campaign-creative` that expands one brief plus one strategy into exactly three structured variants before editing.
- Added stable `variantPackId` and `variantId` contracts plus per-variant hook, opening beat, selling-point focus, CTA, editing direction, asset suggestion, and difference summary fields.
- Upgraded Campaign Creative handoff so Editor receives the selected variant alongside the shared brief and strategy, and the first creative-agent apply can reuse that variant context.
- Added targeted regression coverage for variant-pack generation and variant handoff normalization on both the frontend and backend.
- Preserved explicit brief CTA wording inside generated variants and hardened variant normalization so legacy handoff payloads without variant fields still restore safely.
