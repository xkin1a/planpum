import { getStore } from "@netlify/blobs";
export const config = { path: "/api" };
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } });
export default async (req) => {
  try {
    const store = getStore("plan");
    const d = (await store.get("data", { type: "json" })) || { events: [], ann: [] };
    d.events ||= []; d.ann ||= [];
    d.ann = d.ann.filter(a => Date.now() - a.ts < 14 * 864e5);
    if (req.method === "GET") return json(d);
    if (req.method !== "POST") return json({ error: "method" }, 405);
    let b; try { b = await req.json(); } catch { return json({ error: "bad json" }, 400); }
    if (!process.env.STAROSTA_KEY) return json({ error: "brak zmiennej STAROSTA_KEY w Netlify" }, 500);
    if (b.key !== process.env.STAROSTA_KEY) return json({ error: "złe hasło" }, 403);
    const t = (v, n) => String(v ?? "").slice(0, n);
    if (b.op === "addEvent") d.events.push({ id: crypto.randomUUID(), title: t(b.title, 120), date: t(b.date, 10), from: t(b.from, 5), to: t(b.to, 5), place: t(b.place, 120) });
    else if (b.op === "addAnn") d.ann.push({ id: crypto.randomUUID(), text: t(b.text, 300), ts: Date.now() });
    else if (b.op === "del" && (b.kind === "events" || b.kind === "ann")) d[b.kind] = d[b.kind].filter(x => x.id !== b.id);
    else return json({ error: "bad op" }, 400);
    await store.setJSON("data", d);
    return json(d);
  } catch (e) {
    return json({ error: String(e && e.message || e) }, 500);
  }
};
