#!/usr/bin/env python3
"""
Deterministic decision engine for the "Should I Cop This?" agent.

This is the 99% - pure, rule-based functions over a persona JSON file
(no LLM, no network). The agent layer calls these tools and only *narrates*
the result; it never invents numbers.

Run a demo:
    python engine/engine.py            # Maya's demo query (AirPods $250)
    python engine/engine.py daniel     # another persona
"""

import json
import sys
import datetime as dt
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "families"
AVG_DAYS_PER_MONTH = 30.44

# Categories that are not discretionary spend (excluded from "spending").
NON_SPEND_CATEGORIES = {"income", "transfer_in", "transfer_out"}
# Account products that hold spendable cash (not credit, not locked-in).
LIQUID_PRODUCTS = ("Chequing", "Savings")
NON_LIQUID_HINTS = ("Mastercard", "Credit", "GIC", "Mutual Fund", "RIF", "TFSA", "Children")

# Essentials - never flagged as a discretionary "leak" (don't shame someone's groceries).
NEEDS = {"groceries", "transit", "housing", "utilities", "pharmacy", "health"}

# Fallback keyword -> category for items that don't match the persona's own merchants.
# Scanned longest-key-first so "uber eats" (dining) beats "uber" (transit).
KEYWORD_CATEGORY = {
    "coffee": "coffee", "latte": "coffee", "espresso": "coffee", "cappuccino": "coffee",
    "starbucks": "coffee", "tim hortons": "coffee",
    "mcdonald": "dining", "burger": "dining", "pizza": "dining", "sushi": "dining",
    "fries": "dining", "doordash": "dining", "uber eats": "dining", "takeout": "dining",
    "restaurant": "dining", "dinner": "dining", "lunch": "dining", "chipotle": "dining",
    "nando": "dining", "five guys": "dining", "shawarma": "dining",
    "uber": "transit", "lyft": "transit", "presto": "transit", "ttc": "transit", "gas": "transit",
    "sephora": "shopping", "aritzia": "shopping", "amazon": "shopping", "winners": "shopping",
    "indigo": "shopping", "hoodie": "shopping", "shoes": "shopping", "sneaker": "shopping",
    "jordan": "shopping", "clothes": "shopping", "makeup": "shopping", "skincare": "shopping",
    "airpods": "shopping", "headphone": "shopping", "earbuds": "shopping", "laptop": "shopping",
    "iphone": "shopping", "ps5": "shopping", "playstation": "shopping", "console": "shopping",
    "xbox": "shopping", "nintendo": "shopping",
    "concert": "entertainment", "ticket": "entertainment", "movie": "entertainment",
    "festival": "entertainment", "steam": "gaming",
    "grocery": "groceries", "groceries": "groceries",
}


# ---------- loading ----------

def load_family(name: str = "maya") -> dict:
    path = DATA_DIR / f"{name}.json"
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _today(family: dict) -> dt.date:
    return dt.date.fromisoformat(family["as_of"])


def _window_months(family: dict) -> float:
    txns = family["transactions"]
    if not txns:
        return 1.0
    dates = [dt.date.fromisoformat(t["date"]) for t in txns]
    span = (max(dates) - min(dates)).days or 1
    return span / AVG_DAYS_PER_MONTH


def _is_internal_transfer(t: dict) -> bool:
    """A move between the user's own accounts (not real income or spend)."""
    m = t["merchant"].lower()
    return m.startswith("transfer to") or m.startswith("transfer from")


# ---------- tools (each returns plain dicts the agent can read) ----------

def monthly_income(family: dict) -> float:
    """Average monthly *external* inflow (pay + gifts), excluding internal transfers."""
    total = sum(
        t["amount"] for t in family["transactions"]
        if t["amount"] > 0 and not _is_internal_transfer(t)
    )
    return round(total / _window_months(family), 2)


def fixed_monthly(family: dict) -> float:
    """Sum of recurring monthly obligations (rent, subs, phone, etc.)."""
    return round(sum(abs(r["amount"]) for r in family.get("recurring", [])), 2)


def discretionary_monthly(family: dict) -> float:
    """Average monthly discretionary spend: outflows not in the recurring list."""
    recurring_merchants = {r["merchant"] for r in family.get("recurring", [])}
    total = 0.0
    for t in family["transactions"]:
        if t["amount"] >= 0 or t["category"] in NON_SPEND_CATEGORIES:
            continue
        if t["merchant"] in recurring_merchants:
            continue
        total += abs(t["amount"])
    return round(total / _window_months(family), 2)


def liquid_balance(family: dict) -> float:
    """Spendable cash across chequing + savings (excludes credit / locked-in)."""
    total = 0.0
    for a in family["accounts"]:
        product = a["product"]
        if any(h in product for h in NON_LIQUID_HINTS):
            continue
        if any(p in product for p in LIQUID_PRODUCTS) and a["balance"] > 0:
            total += a["balance"]
    return round(total, 2)


def monthly_save_rate(family: dict) -> float:
    """Deliberate monthly saving: internal transfers out to a savings account."""
    total = sum(
        abs(t["amount"]) for t in family["transactions"]
        if t["category"] == "transfer_out" and _is_internal_transfer(t)
        and "saving" in t["merchant"].lower()
    )
    return round(total / _window_months(family), 2)


def subscription_waste(family: dict) -> dict:
    """Flagged recurring charges (unused / duplicate) the user could cut."""
    items = []
    for r in family.get("recurring", []):
        flag = r.get("flag", "")
        if any(k in flag for k in ("unused", "duplicate")):
            monthly = round(abs(r["amount"]), 2)
            items.append({
                "merchant": r["merchant"],
                "monthly": monthly,
                "annual": round(monthly * 12, 2),
                "reason": flag,
            })
    return {
        "items": items,
        "monthly_total": round(sum(i["monthly"] for i in items), 2),
        "annual_total": round(sum(i["annual"] for i in items), 2),
    }


def find_similar_purchases(family: dict, price: float, band: float = 0.4) -> dict:
    """Past purchases in a similar price band, with a regret signal (used?)."""
    lo, hi = price * (1 - band), price * (1 + band)
    matches = [
        {"item": p["item"], "price": p["price"], "date": p["date"], "used": p["used"]}
        for p in family.get("purchase_history", [])
        if lo <= p["price"] <= hi
    ]
    regretted = [m for m in matches if m["used"] in ("no", "partial")]
    regret_rate = round(len(regretted) / len(matches), 2) if matches else 0.0
    return {"matches": matches, "regret_rate": regret_rate}


def recent_discretionary_count(family: dict, days: int = 7) -> int:
    """How many discretionary buys in the last `days` (impulse-frequency signal)."""
    cutoff = _today(family) - dt.timedelta(days=days)
    recurring = {r["merchant"] for r in family.get("recurring", [])}
    n = 0
    for t in family["transactions"]:
        if t["amount"] >= 0 or t["category"] in NON_SPEND_CATEGORIES:
            continue
        if t["merchant"] in recurring:
            continue
        if dt.date.fromisoformat(t["date"]) >= cutoff:
            n += 1
    return n


def _ordinal(n: int) -> str:
    if 11 <= (n % 100) <= 13:
        return f"{n}th"
    return f"{n}{ {1: 'st', 2: 'nd', 3: 'rd'}.get(n % 10, 'th') }"


def _category_lookup(family: dict) -> dict:
    """Map merchant names (and first words) the persona actually uses -> category,
    then overlay the static keyword fallbacks."""
    lut: dict[str, str] = {}
    for t in family["transactions"]:
        if t["amount"] >= 0 or t["category"] in NON_SPEND_CATEGORIES:
            continue
        m = t["merchant"].lower()
        lut[m] = t["category"]
        first = m.split()[0] if m.split() else ""
        if len(first) >= 4:
            lut.setdefault(first, t["category"])
    for kw, cat in KEYWORD_CATEGORY.items():
        lut.setdefault(kw, cat)
    return lut


def classify_item(family: dict, item: str) -> tuple[str | None, bool]:
    """Classify a typed item into a spend category and whether it's a need.
    Grounded in the persona's real merchants first, keyword fallback second."""
    item_l = item.lower()
    lut = _category_lookup(family)
    for key in sorted(lut, key=len, reverse=True):  # longest = most specific
        if len(key) >= 4 and key in item_l:
            cat = lut[key]
            return cat, cat in NEEDS
    return None, False


def category_pace(family: dict, category: str | None) -> dict | None:
    """Both windows at once: chronic monthly rate + acute 7-day spike for a category."""
    if not category:
        return None
    today = _today(family)
    recurring = {r["merchant"] for r in family.get("recurring", [])}
    week_n = month_n = 0
    spend30 = 0.0
    for t in family["transactions"]:
        if t["amount"] >= 0 or t["category"] != category or t["merchant"] in recurring:
            continue
        days = (today - dt.date.fromisoformat(t["date"])).days
        if days < 7:
            week_n += 1
        if days < 30:
            month_n += 1
            spend30 += abs(t["amount"])
    weekly_avg = month_n / 4.3
    return {
        "category": category,
        "week_count": week_n,
        "month_count": month_n,
        "weekly_avg": round(weekly_avg, 1),
        "annual_cost": round(spend30 * 12, 2),
        "spike": week_n >= max(3, round(1.5 * weekly_avg)),  # acute: well over her norm
    }


def matching_goal(family: dict, item: str):
    """Find a savings goal whose label references this item (planned purchase)."""
    item_l = item.lower()
    for g in family.get("goals", []):
        label = g["label"].lower()
        if item_l in label or any(w in label for w in item_l.split() if len(w) > 3):
            return g
    return None


def project_goal_impact(family: dict, amount: float) -> dict:
    """Days a discretionary spend of `amount` would delay the emergency goal."""
    rate = monthly_save_rate(family)
    emergency = next(
        (g for g in family.get("goals", []) if "emergency" in g["label"].lower()), None
    )
    if not emergency or rate <= 0:
        return {"goal": emergency["label"] if emergency else None, "delay_days": None}
    delay_days = round(amount / rate * AVG_DAYS_PER_MONTH)
    return {"goal": emergency["label"], "delay_days": delay_days}


def aspiration_equiv(family: dict, price: float) -> str:
    """Translate a price into the persona's own terms."""
    coffee = [t for t in family["transactions"] if t["category"] == "coffee"]
    if coffee:
        avg = sum(abs(t["amount"]) for t in coffee) / len(coffee)
        return f"about {round(price / avg)} coffee runs"
    return f"${price:.0f}"


# ---------- the verdict (rule-based decision tree) ----------

def verdict(family: dict, item: str, price: float) -> dict:
    income = monthly_income(family)
    fixed = fixed_monthly(family)
    disc = discretionary_monthly(family)
    net = round(income - fixed - disc, 2)            # monthly cash-flow headroom
    liquid = liquid_balance(family)
    waste = subscription_waste(family)
    save_rate = monthly_save_rate(family)
    goal = matching_goal(family, item)
    similar = find_similar_purchases(family, price)
    goal_hit = project_goal_impact(family, price)

    category, is_need = classify_item(family, item)
    pace = category_pace(family, category)
    is_want = pace is not None and not is_need
    emergency = next((g for g in family.get("goals", [])
                      if "emergency" in g["label"].lower()), None)
    leak_threshold = max(0.15 * income * 12, emergency["target"] if emergency else 0)
    spike = is_want and pace["spike"]
    chronic_leak = is_want and pace["annual_cost"] >= leak_threshold

    reasons = []
    freed = [
        {"action": f"cancel {i['merchant']} ({i['reason'].replace('_', ' ')})",
         "monthly": i["monthly"], "annual": i["annual"]}
        for i in waste["items"]
    ]

    # Effective weekly savings pace, optionally accelerated by cutting waste.
    weekly_rate = (save_rate + waste["monthly_total"]) / (AVG_DAYS_PER_MONTH / 7)

    if goal:  # planned purchase the user is already saving toward
        gap = round(price - goal["current"], 2)
        reasons.append(
            f"You've already put ${goal['current']:.0f} toward '{goal['label']}' "
            f"- ${gap:.0f} to go."
        )
        if gap <= max(net, 0):
            decision = "COP"
            reasons.append(f"Your monthly cash flow (${net:.0f}) covers the gap without touching savings.")
        elif weekly_rate > 0 and gap / weekly_rate <= 8:
            decision = "WAIT"
            weeks = round(gap / weekly_rate, 1)
            reasons.append(
                f"Don't raid your ${liquid:.0f} cushion. At your save pace plus cutting "
                f"${waste['monthly_total']:.0f}/mo of dead subs, you cover the gap in ~{weeks} weeks."
            )
        else:
            decision = "DROP"
            reasons.append("It's too far outside your current pace to be smart right now.")
    else:  # impulse / unplanned - magnitude AND habit pace together
        treat_cap = max(25.0, round(0.03 * income, 2))   # a trivial "treat" for this income
        half_month = round((fixed + disc) / 2, 2)
        too_big = price > max(net, 0) and liquid - price < half_month
        trivial = price <= treat_cap
        cat = category or "discretionary"

        def leak_line() -> str:
            line = f"You're running ${pace['annual_cost']:.0f}/yr on {cat}"
            tgt = emergency["target"] if emergency else 0
            if tgt and pace["annual_cost"] >= tgt:
                line += f" - that's your {emergency['label']} {pace['annual_cost'] / tgt:.1f}x over"
            return line + "."

        if is_need:
            # essentials: pure magnitude, never shamed for the category
            if trivial or price <= max(net, 0) or liquid - price >= half_month:
                decision = "COP"
                reasons.append(f"${price:.0f} on {cat} - that's a need, handle it.")
            elif liquid >= price:
                decision = "WAIT"
                reasons.append(f"It's a need, but ${price:.0f} is tight right now - spread it if you can.")
            else:
                decision = "DROP"
                reasons.append(f"${price:.0f} is more than your cushion can cover this month.")
        elif too_big:
            decision = "DROP"
            reasons.append(
                f"${price:.0f} in one shot is too big a hit on your ${liquid:.0f} cushion right now."
            )
        elif spike:
            decision = "SKIP"
            reasons.append(
                f"Pump the brakes - that's your {_ordinal(pace['week_count'])} {cat} THIS WEEK, "
                f"way over your usual ~{pace['weekly_avg']:.0f}/wk."
            )
            reasons.append(leak_line())
        elif chronic_leak:
            decision = "SKIP"
            reasons.append(f"${price:.0f} on its own is fine, but {cat} is your leak. " + leak_line())
            reasons.append("Skip this one and bank it toward a goal.")
        elif trivial:
            decision = "COP"
            reasons.append(f"It's only ${price:.0f} - cop it.")
            if is_want and pace["month_count"] >= 3:
                reasons.append(
                    f"Heads up: ~{pace['month_count']} {cat} a month "
                    f"(${pace['annual_cost']:.0f}/yr) - chronic, not a crisis."
                )
        elif price <= max(net, 0):
            decision = "COP"
            reasons.append(f"It fits this month's ${net:.0f} of breathing room.")
        else:
            decision = "WAIT"
            reasons.append(
                f"You *can* cover the ${price:.0f} from your ${liquid:.0f}, but it'd tighten your "
                f"cushion. Sleep on it a day."
            )

    if waste["items"] and decision != "COP":
        names = " + ".join(i["merchant"] for i in waste["items"])
        reasons.append(f"Easy win: {names} are flagged unused/duplicate - ${waste['annual_total']:.0f}/yr back.")

    if similar["regret_rate"] >= 0.5 and similar["matches"]:
        reasons.append(
            f"Heads up: {int(similar['regret_rate'] * 100)}% of your past buys around this price "
            f"went unused or barely used."
        )

    return {
        "item": item,
        "price": price,
        "decision": decision,
        "affordable_now": liquid >= price,   # has the cash - separate from "should you"
        "reasons": reasons,
        "freed_up": freed,
        "goal_impact": goal_hit,
        "aspiration_equiv": aspiration_equiv(family, price),
        "category": category,
        "category_pace": pace,
        "context": {
            "monthly_income": income, "fixed_monthly": fixed,
            "discretionary_monthly": disc, "net_monthly": net,
            "liquid_balance": liquid, "monthly_save_rate": save_rate,
        },
    }


# ---------- demo ----------

if __name__ == "__main__":
    # Usage: python engine/engine.py [persona] [item] [price]
    name = sys.argv[1] if len(sys.argv) > 1 else "maya"
    fam = load_family(name)
    target = fam.get("demo_targets", {}).get("should_we_buy_query", {})
    item = sys.argv[2] if len(sys.argv) > 2 else target.get("item", "AirPods Pro")
    price = float(sys.argv[3]) if len(sys.argv) > 3 else target.get("price", 250.0)

    result = verdict(fam, item, price)
    print(f"\n=== {fam['family_name']} - \"Should I cop the {item} (${price:.0f})?\" ===\n")
    print(f"  VERDICT: {result['decision']}  (affordable_now={result['affordable_now']})\n")
    for r in result["reasons"]:
        print(f"   - {r}")
    if result["freed_up"]:
        print("\n  Freed up if you act:")
        for f in result["freed_up"]:
            print(f"   - {f['action']}: ${f['monthly']:.2f}/mo (${f['annual']:.2f}/yr)")
    print(f"\n  Goal impact: {result['goal_impact']}")
    print(f"  In your terms: {result['aspiration_equiv']}")
    print(f"\n  Context: {json.dumps(result['context'], indent=2)}\n")
