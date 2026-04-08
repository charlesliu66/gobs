/** 一次性探测：loadEnv + GeeLark phone/list 分组（无需启动 HTTP） */
import '../src/loadEnv.ts';
import { fetchMatrixGroupTagOptions } from '../src/gobs/gobsPublishCatalog.ts';

const groups = await fetchMatrixGroupTagOptions();
console.log(JSON.stringify({ count: groups.length, sample: groups.slice(0, 12) }, null, 2));
