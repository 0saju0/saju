// api/supabase.js — 풀이 저장/불러오기 서버 함수
// 환경변수: SUPABASE_URL, SUPABASE_SERVICE_KEY

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }

  const URL = process.env.SUPABASE_URL;
  const KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!URL || !KEY) { res.status(500).json({ error: 'Supabase 환경변수가 없습니다.' }); return; }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch(e) { body = {}; } }

  const { action, sub, data, id } = body;
  if (!sub) { res.status(400).json({ error: 'sub(사용자ID)가 없습니다.' }); return; }

  const headers = {
    'Content-Type': 'application/json',
    'apikey': KEY,
    'Authorization': `Bearer ${KEY}`,
  };

  try {
    if (action === 'save') {
      // 풀이 저장 (html은 용량 때문에 앞부분만)
      const r = await fetch(`${URL}/rest/v1/readings`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=representation' },
        body: JSON.stringify({
          user_sub: sub,
          name: data.name || '',
          reading_type: data.type || '',
          pkg: data.pkg || '',
          info: data.info || '',
          html: (data.html || '').slice(0, 50000), // 최대 50KB
        })
      });
      const result = await r.json();
      if (!r.ok) { res.status(500).json({ error: JSON.stringify(result) }); return; }
      res.status(200).json({ ok: true, id: result[0]?.id });

    } else if (action === 'load') {
      // 목록 불러오기 (html 제외)
      const r = await fetch(
        `${URL}/rest/v1/readings?user_sub=eq.${encodeURIComponent(sub)}&order=created_at.desc&limit=20&select=id,name,reading_type,pkg,info,created_at`,
        { method: 'GET', headers }
      );
      const result = await r.json();
      if (!r.ok) { res.status(500).json({ error: JSON.stringify(result) }); return; }
      res.status(200).json({ readings: result });

    } else if (action === 'view') {
      // 특정 풀이 전체 내용 불러오기 (html 포함)
      const r = await fetch(
        `${URL}/rest/v1/readings?id=eq.${id}&user_sub=eq.${encodeURIComponent(sub)}&limit=1`,
        { method: 'GET', headers }
      );
      const result = await r.json();
      if (!r.ok || !result.length) { res.status(404).json({ error: '풀이를 찾을 수 없습니다.' }); return; }
      res.status(200).json({ reading: result[0] });

    } else if (action === 'delete') {
      // 풀이 삭제
      const r = await fetch(
        `${URL}/rest/v1/readings?id=eq.${id}&user_sub=eq.${encodeURIComponent(sub)}`,
        { method: 'DELETE', headers }
      );
      if (!r.ok) { res.status(500).json({ error: '삭제 실패' }); return; }
      res.status(200).json({ ok: true });

    } else {
      res.status(400).json({ error: '알 수 없는 action입니다.' });
    }
  } catch(e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}
