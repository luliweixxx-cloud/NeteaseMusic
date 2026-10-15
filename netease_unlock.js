/*
 * Quantumult X - 解锁网易云音乐灰色歌曲（本地 Rewrite 方案）
 * 作用：拦截 NetEase API 响应，把 song privilege 状态改写为"可播放"，
 *      从而解除 VIP / 部分下架灰歌的播放限制。
 * 适用：Quantumult X 的 script-response-body（响应改写）。
 * 注意：本方案仅修改"可播放标志"，对纯无版权/地区限制且客户端本地
 *      没有音源的歌曲，可能只是"可点击"但仍放不出声。
 *      要真正换源播放，请配合 UnblockNeteaseMusic 服务器（见 conf 注释）。
 */

let body;
try {
  body = JSON.parse($response.body);
} catch (e) {
  // 非 JSON 响应，原样返回
  $done({});
  return;
}

// 把单个 privilege 对象改写为可播放
function setPlayable(p) {
  if (!p || typeof p !== "object") return;
  p.st = 0;        // 歌曲状态：0 = 正常
  p.flag = 0;      // 标志位清零
  p.pl = 320000;   // 播放码率（320k）
  p.dl = 320000;   // 下载码率
  p.sp = 7;        // 试听码率
  p.subp = 1;
  p.paid = false;
  p.free = true;
  p.preSell = false;
  if (typeof p.fee !== "undefined") p.fee = 0;
  if (typeof p.payed !== "undefined") p.payed = false;
  if (typeof p.cp !== "undefined") p.cp = 1;
}

// 处理顶层 privileges 数组（如 /weapi/v3/song/detail）
if (body.privileges && Array.isArray(body.privileges)) {
  body.privileges.forEach(setPlayable);
}

// 处理 data.privileges（部分接口外层包了 data）
if (body.data && body.data.privileges && Array.isArray(body.data.privileges)) {
  body.data.privileges.forEach(setPlayable);
}

// 处理嵌套 playlist 内的 privileges
if (body.playlist && body.playlist.privileges && Array.isArray(body.playlist.privileges)) {
  body.playlist.privileges.forEach(setPlayable);
}

// 处理 songs 数组里的 fee 字段（标记为免费）
function fixSongs(arr) {
  if (!Array.isArray(arr)) return;
  arr.forEach((s) => {
    if (s && typeof s === "object") {
      if (typeof s.fee !== "undefined") s.fee = 0;
      if (typeof s.payed !== "undefined") s.payed = false;
    }
  });
}
if (Array.isArray(body.songs)) fixSongs(body.songs);
if (body.data && Array.isArray(body.data.songs)) fixSongs(body.data.songs);
if (body.playlist && Array.isArray(body.playlist.tracks)) fixSongs(body.playlist.tracks);
if (body.result && Array.isArray(body.result.songs)) fixSongs(body.result.songs);

// 处理 player url 接口返回为空的情况（给个占位，让客户端继续尝试）
if (body.data && Array.isArray(body.data)) {
  body.data.forEach((d) => {
    if (d && typeof d === "object") {
      if (d.code && d.code !== 200) d.code = 200;
      if (typeof d.fee !== "undefined") d.fee = 0;
    }
  });
}

$done({ body: JSON.stringify(body) });
