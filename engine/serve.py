#!/usr/bin/env python3
"""
Zero-dependency local web tester for the decision engine.

    python engine/serve.py          # then open http://localhost:8000

Two views:
  /                 verdict tester (pick persona, type item + price)
  /profile?persona= full financial profile for a persona

Pure stdlib (http.server) — no Flask, no pip install. Wraps engine.py.
"""

import html
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs

import engine  # engine/engine.py (same dir is on sys.path when run as a script)

PORT = 8000
DECISION_COLOR = {"COP": "#1f9d55", "WAIT": "#d97706", "DROP": "#dc2626"}

STYLE = """
  body { font: 16px/1.5 system-ui, sans-serif; max-width: 760px; margin: 32px auto;
         padding: 0 16px; color: #1a1a1a; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  a { color: #2563eb; text-decoration: none; }
  nav { margin: 8px 0 20px; font-size: 14px; color: #888; }
  nav a { margin-right: 10px; }
  form { display: flex; gap: 8px; flex-wrap: wrap; align-items: center;
         background: #f4f4f5; padding: 14px; border-radius: 10px; }
  select, input { padding: 8px; border: 1px solid #ccc; border-radius: 6px; font: inherit; }
  input[name=item] { flex: 1; min-width: 160px; }
  button { padding: 8px 18px; border: 0; border-radius: 6px; background: #111;
           color: #fff; font: inherit; cursor: pointer; }
  .card { margin-top: 20px; border: 1px solid #e5e5e5; border-radius: 12px;
          padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
  .verdict { display: inline-block; color: #fff; font-weight: 700; letter-spacing: 1px;
             padding: 6px 16px; border-radius: 999px; font-size: 18px; }
  .sub { color: #666; font-size: 13px; margin: 10px 0 4px; }
  .reasons li { margin: 6px 0; }
  .goal { background: #fff7ed; padding: 8px 12px; border-radius: 8px; }
  table { border-collapse: collapse; width: 100%; font-size: 14px; }
  td, th { border-bottom: 1px solid #eee; padding: 6px 4px; text-align: left; }
  td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
  h4 { margin: 18px 0 6px; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 14px 0; }
  .stat { background: #f8f8f9; border-radius: 10px; padding: 12px; }
  .stat .k { font-size: 12px; color: #777; }
  .stat .v { font-size: 20px; font-weight: 700; }
  .neg { color: #dc2626; }
  .badge { font-size: 11px; padding: 2px 8px; border-radius: 999px; font-weight: 600; }
  .b-flag { background: #fee2e2; color: #b91c1c; }
  .b-ok { background: #dcfce7; color: #166534; }
  .b-warn { background: #fef9c3; color: #854d0e; }
  .bar { background: #eee; border-radius: 999px; height: 8px; overflow: hidden; max-width: 220px; }
  .bar > span { display: block; height: 100%; background: #2563eb; }
"""


def personas() -> list[str]:
    return sorted(p.stem for p in engine.DATA_DIR.glob("*.json"))


def nav(active: str) -> str:
    links = [f'<a href="/profile?persona={p}">{p}</a>' for p in personas()]
    return (f'<nav><a href="/"><b>tester</b></a> | profiles: {" ".join(links)}'
            f'<span style="float:right">view: {html.escape(active)}</span></nav>')


def page(title: str, active: str, body: str) -> bytes:
    return (f"""<!doctype html><html><head><meta charset="utf-8">
    <title>{html.escape(title)}</title><style>{STYLE}</style></head><body>
    {nav(active)}{body}</body></html>""").encode("utf-8")


# ---------- verdict tester ----------

def render_result(fam: dict, item: str, price: float) -> str:
    r = engine.verdict(fam, item, price)
    color = DECISION_COLOR.get(r["decision"], "#333")
    reasons = "".join(f"<li>{html.escape(x)}</li>" for x in r["reasons"])
    freed = "".join(
        f"<li>{html.escape(f['action'])} &mdash; <b>${f['monthly']:.2f}/mo</b> "
        f"(${f['annual']:.2f}/yr)</li>" for f in r["freed_up"])
    gi = r["goal_impact"]
    goal_line = (f"Buying now sets back <b>{html.escape(str(gi['goal']))}</b> by "
                 f"<b>{gi['delay_days']} days</b>." if gi.get("delay_days")
                 else "No emergency-goal impact.")
    ctx = "".join(f"<tr><td>{html.escape(k)}</td><td class='num'>{v}</td></tr>"
                  for k, v in r["context"].items())
    return f"""
    <div class="card">
      <div class="verdict" style="background:{color}">{r['decision']}</div>
      <p class="sub">{html.escape(fam['family_name'])} &middot; {html.escape(item)} &middot;
         ${price:,.0f} &middot; affordable_now={r['affordable_now']}</p>
      <ul class="reasons">{reasons}</ul>
      {f'<h4>Freed up if you act</h4><ul>{freed}</ul>' if freed else ''}
      <p class="goal">{goal_line}</p>
      <p>In your terms: <b>{html.escape(r['aspiration_equiv'])}</b></p>
      <details><summary>numbers</summary><table>{ctx}</table></details>
    </div>"""


def render_tester(persona: str, item: str, price, result_html: str) -> bytes:
    opts = "".join(f'<option value="{p}"{" selected" if p == persona else ""}>{p}</option>'
                   for p in personas())
    body = f"""
    <h1>Should I Cop This? <span style="color:#888;font-weight:400">&mdash; engine tester</span></h1>
    <form method="get" action="/">
      <select name="persona">{opts}</select>
      <input name="item" value="{html.escape(str(item))}" placeholder="item">
      <input name="price" value="{html.escape(str(price))}" type="number" step="1" style="width:90px">
      <button type="submit">Check</button>
    </form>
    {result_html}"""
    return page("Should I Cop This? — tester", "tester", body)


# ---------- persona profile ----------

def category_breakdown(fam: dict) -> list[tuple[str, float]]:
    recurring = {r["merchant"] for r in fam.get("recurring", [])}
    months = engine._window_months(fam)
    totals: dict[str, float] = {}
    for t in fam["transactions"]:
        if t["amount"] >= 0 or t["category"] in engine.NON_SPEND_CATEGORIES:
            continue
        if t["merchant"] in recurring:
            continue
        totals[t["category"]] = totals.get(t["category"], 0) + abs(t["amount"])
    return sorted(((c, round(v / months, 2)) for c, v in totals.items()),
                  key=lambda x: -x[1])


def render_profile(fam: dict) -> bytes:
    members = ", ".join(f"{m['name']} ({m['age']})" for m in fam["members"])
    income = engine.monthly_income(fam)
    fixed = engine.fixed_monthly(fam)
    disc = engine.discretionary_monthly(fam)
    net = round(income - fixed - disc, 2)
    liquid = engine.liquid_balance(fam)
    save = engine.monthly_save_rate(fam)

    def stat(k, v, neg=False):
        cls = " neg" if neg else ""
        return f'<div class="stat"><div class="k">{k}</div><div class="v{cls}">{v}</div></div>'

    stats = (stat("monthly income", f"${income:,.0f}")
             + stat("fixed / mo", f"${fixed:,.0f}")
             + stat("discretionary / mo", f"${disc:,.0f}")
             + stat("net / mo", f"${net:,.0f}", neg=net < 0)
             + stat("liquid cash", f"${liquid:,.0f}")
             + stat("saving / mo", f"${save:,.0f}"))

    accounts = "".join(
        f"<tr><td>{html.escape(a['product'])}</td>"
        f"<td class='num'>${a['balance']:,.2f}</td></tr>" for a in fam["accounts"])

    subs = ""
    for r in fam.get("recurring", []):
        flag = r.get("flag", "")
        badge = (f'<span class="badge b-flag">{html.escape(flag.replace("_", " "))}</span>'
                 if flag else "")
        subs += (f"<tr><td>{html.escape(r['merchant'])} {badge}</td>"
                 f"<td class='num'>${abs(r['amount']):,.2f}/mo</td></tr>")

    goals = ""
    for g in fam.get("goals", []):
        pct = min(100, round(g["current"] / g["target"] * 100)) if g["target"] else 0
        goals += (f"<tr><td>{html.escape(g['label'])}</td>"
                  f"<td class='num'>${g['current']:,.0f} / ${g['target']:,.0f}</td>"
                  f"<td><div class='bar'><span style='width:{pct}%'></span></div></td></tr>")

    cats = "".join(f"<tr><td>{html.escape(c)}</td><td class='num'>${v:,.0f}/mo</td></tr>"
                   for c, v in category_breakdown(fam))

    used_badge = {"yes": "b-ok", "no": "b-flag", "partial": "b-warn"}
    purchases = "".join(
        f"<tr><td>{html.escape(p['item'])}</td><td class='num'>${p['price']:,.0f}</td>"
        f"<td><span class='badge {used_badge.get(p['used'], 'b-warn')}'>used: {p['used']}</span></td></tr>"
        for p in fam.get("purchase_history", []))

    questions = "".join(f"<li>{html.escape(q['q'])}</li>"
                        for q in fam.get("sample_questions", []))

    body = f"""
    <h1>{html.escape(fam['family_name'])}</h1>
    <p class="sub">{html.escape(fam.get('archetype', ''))}<br>{html.escape(members)}
       &middot; as of {html.escape(fam['as_of'])}</p>
    <div class="grid">{stats}</div>

    <h4>Accounts</h4><table>{accounts}</table>
    <h4>Recurring / subscriptions</h4><table>{subs}</table>
    <h4>Goals</h4><table>{goals}</table>
    <h4>Spending by category (avg/mo)</h4><table>{cats}</table>
    <h4>Past purchases</h4><table>{purchases}</table>
    <h4>Questions this persona asks</h4><ul>{questions}</ul>
    <p style="margin-top:20px"><a href="/?persona={fam['family_id'].replace('fam_','')}">
       &rarr; test a purchase for this persona</a></p>"""
    return page(f"{fam['family_name']} — profile", fam["family_name"], body)


# ---------- server ----------

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        q = parse_qs(parsed.query)
        persona = q.get("persona", ["maya"])[0]
        try:
            fam = engine.load_family(persona)
        except (FileNotFoundError, OSError):
            persona, fam = "maya", engine.load_family("maya")

        if parsed.path == "/profile":
            body = render_profile(fam)
        elif parsed.path in ("/", ""):
            item = q.get("item", [""])[0]
            price_raw = q.get("price", [""])[0]
            if not item or not price_raw:
                tgt = fam.get("demo_targets", {}).get("should_we_buy_query", {})
                item = item or tgt.get("item", "AirPods Pro")
                price_raw = price_raw or str(tgt.get("price", 250))
            try:
                result_html = render_result(fam, item, float(price_raw))
            except ValueError:
                result_html = '<p class="card">Enter a numeric price.</p>'
            body = render_tester(persona, item, price_raw, result_html)
        else:
            self.send_error(404)
            return

        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *a):  # quieter console
        pass


if __name__ == "__main__":
    print(f"Engine tester running -> http://localhost:{PORT}  (Ctrl+C to stop)")
    HTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
