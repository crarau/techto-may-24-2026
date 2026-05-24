#!/usr/bin/env python3
"""
Deterministic persona data generator for the TechTO May 24 demo.

Produces JSON files under data/families/ with 90 days of realistic
transactions, recurring obligations, goals, past-purchase outcomes,
and a set of sample queries each persona/role would ask.

Re-run anytime: output is seeded and stable.
"""

import json
import random
import datetime as dt
from pathlib import Path
from itertools import count

SEED = 42
TODAY = dt.date(2026, 5, 24)
WINDOW_DAYS = 90
START = TODAY - dt.timedelta(days=WINDOW_DAYS)

OUT_DIR = Path(__file__).parent / "families"

# Merchant catalogs (Canadian context)
GROCERY = ["Loblaws", "Metro", "Sobeys", "No Frills", "Whole Foods Market", "Costco Wholesale"]
COFFEE  = ["Tim Hortons", "Starbucks", "Second Cup", "Aroma Espresso Bar"]
DINING  = ["Chipotle", "Pizza Pizza", "Sushi Yu", "Mandy's Salads", "Earls Kitchen", "The Keg",
           "Boston Pizza", "Nando's", "Five Guys"]
GAS     = ["Petro-Canada", "Shell", "Esso", "Pioneer"]
TRANSIT = ["TTC PRESTO", "Uber", "Lyft"]
SHOPPING = ["Amazon", "Indigo", "Best Buy", "Canadian Tire", "IKEA", "SportChek", "Winners"]
PHARMACY = ["Shoppers Drug Mart", "Rexall"]


def make_txn_id():
    c = count(1)
    return lambda: f"t{next(c):04d}"


def add_monthly(transactions, txn_id, account_id, member_id, merchant, amount, category,
                day, start, today, location=None):
    """Append a monthly recurring transaction on a given day of the month."""
    year, month = start.year, start.month
    while True:
        try:
            d = dt.date(year, month, day)
        except ValueError:
            # day does not exist this month, use last day instead
            next_first = (dt.date(year + 1, 1, 1) if month == 12
                          else dt.date(year, month + 1, 1))
            d = next_first - dt.timedelta(days=1)
        if d > today:
            break
        if d >= start:
            transactions.append({
                "txn_id": txn_id(),
                "account_id": account_id,
                "member_id": member_id,
                "date": d.isoformat(),
                "amount": amount,
                "merchant": merchant,
                "category": category,
                "location": location,
            })
        if month == 12:
            year, month = year + 1, 1
        else:
            month += 1


def add_biweekly(transactions, txn_id, account_id, member_id, merchant, amount, category,
                 first_date, today):
    """Append a bi-weekly transaction from first_date through today."""
    d = first_date
    while d <= today:
        transactions.append({
            "txn_id": txn_id(),
            "account_id": account_id,
            "member_id": member_id,
            "date": d.isoformat(),
            "amount": amount,
            "merchant": merchant,
            "category": category,
            "location": None,
        })
        d += dt.timedelta(days=14)


def add_weekly_grocery(rng, transactions, txn_id, account_id, member_id, low, high,
                       start, today, weekday=5, top_up_prob=0.3):
    """Add weekly grocery runs plus occasional mid-week top-ups."""
    d = start
    while d.weekday() != weekday:
        d += dt.timedelta(days=1)
    while d <= today:
        transactions.append({
            "txn_id": txn_id(),
            "account_id": account_id,
            "member_id": member_id,
            "date": d.isoformat(),
            "amount": -round(rng.uniform(low, high), 2),
            "merchant": rng.choice(GROCERY),
            "category": "groceries",
            "location": "Toronto",
        })
        if rng.random() < top_up_prob:
            top = d + dt.timedelta(days=rng.randint(2, 4))
            if top <= today:
                transactions.append({
                    "txn_id": txn_id(),
                    "account_id": account_id,
                    "member_id": member_id,
                    "date": top.isoformat(),
                    "amount": -round(rng.uniform(low * 0.25, low * 0.55), 2),
                    "merchant": rng.choice(GROCERY),
                    "category": "groceries",
                    "location": "Toronto",
                })
        d += dt.timedelta(days=7)


def add_sprinkled(rng, transactions, txn_id, account_id, member_id, merchants, category,
                  low, high, n, today, start, location="Toronto"):
    """Sprinkle n transactions of a category across the window."""
    span = (today - start).days
    for _ in range(n):
        d = start + dt.timedelta(days=rng.randint(0, span))
        transactions.append({
            "txn_id": txn_id(),
            "account_id": account_id,
            "member_id": member_id,
            "date": d.isoformat(),
            "amount": -round(rng.uniform(low, high), 2),
            "merchant": rng.choice(merchants),
            "category": category,
            "location": location,
        })


def sort_txns(transactions):
    transactions.sort(key=lambda x: (x["date"], x["txn_id"]))


# ---------- Persona generators ----------

def gen_chen():
    rng = random.Random(SEED + 1)
    txn_id = make_txn_id()
    transactions = []

    accounts = [
        {"account_id": "a1", "product": "No-Fee Chequing",        "owner": "joint", "balance":   6420.55},
        {"account_id": "a2", "product": "Savings Account",        "owner": "joint", "balance":  18230.00},
        {"account_id": "a3", "product": "TFSA Savings",           "owner": "m1",    "balance":  41200.00},
        {"account_id": "a4", "product": "World Elite Mastercard", "owner": "m1",    "balance":  -1840.20},
        {"account_id": "a5", "product": "Mutual Fund (Balanced)", "owner": "m1",    "balance":  22100.00},
        {"account_id": "a6", "product": "Children's Savings",     "owner": "m3",    "balance":    312.00},
        {"account_id": "a7", "product": "Children's Savings",     "owner": "m4",    "balance":    145.00},
    ]

    # Income (bi-weekly paychecks)
    add_biweekly(transactions, txn_id, "a1", "m1", "Employer Inc.", 3120.00, "income",
                 dt.date(2026, 2, 27), TODAY)
    add_biweekly(transactions, txn_id, "a1", "m2", "Engineering Co.", 2480.00, "income",
                 dt.date(2026, 3, 5), TODAY)

    # Monthly obligations
    add_monthly(transactions, txn_id, "a1", "m1", "Mortgage Payment", -2150.00, "housing", 1, START, TODAY)
    add_monthly(transactions, txn_id, "a1", "m1", "Hydro One",         -140.00, "utilities", 15, START, TODAY)
    add_monthly(transactions, txn_id, "a1", "m1", "Enbridge Gas",       -95.00, "utilities", 18, START, TODAY)
    add_monthly(transactions, txn_id, "a1", "m1", "Rogers Internet",    -89.99, "utilities", 22, START, TODAY)
    add_monthly(transactions, txn_id, "a1", "m1", "Bell Mobility",      -75.00, "utilities", 25, START, TODAY)

    # Subscriptions (credit card)
    add_monthly(transactions, txn_id, "a4", "m1", "Netflix",          -22.99, "subscription",  5, START, TODAY)
    add_monthly(transactions, txn_id, "a4", "m1", "Spotify Family",   -16.99, "subscription",  8, START, TODAY)
    add_monthly(transactions, txn_id, "a4", "m1", "Disney+",          -14.99, "subscription", 12, START, TODAY)
    add_monthly(transactions, txn_id, "a4", "m1", "GoodLife Fitness", -45.00, "subscription",  1, START, TODAY)

    # Allowances to kids
    add_biweekly(transactions, txn_id, "a6", "m1", "Allowance from Sarah", 40.00, "allowance",
                 dt.date(2026, 2, 28), TODAY)
    add_biweekly(transactions, txn_id, "a7", "m1", "Allowance from Sarah", 20.00, "allowance",
                 dt.date(2026, 2, 28), TODAY)

    # Daily life
    add_weekly_grocery(rng, transactions, txn_id, "a1", "m1", 100, 220, START, TODAY)
    add_sprinkled(rng, transactions, txn_id, "a4", "m1", COFFEE,   "coffee",   4, 12, 30, TODAY, START)
    add_sprinkled(rng, transactions, txn_id, "a4", "m1", DINING,   "dining",  25, 90, 18, TODAY, START)
    add_sprinkled(rng, transactions, txn_id, "a4", "m1", GAS,      "gas",     50, 90, 12, TODAY, START)
    add_sprinkled(rng, transactions, txn_id, "a1", "m1", TRANSIT,  "transit",  3, 25, 28, TODAY, START)
    add_sprinkled(rng, transactions, txn_id, "a4", "m1", SHOPPING, "shopping",20, 200, 12, TODAY, START)
    add_sprinkled(rng, transactions, txn_id, "a4", "m1", PHARMACY, "pharmacy",15,  70,  8, TODAY, START)

    # Ben's transactions
    add_sprinkled(rng, transactions, txn_id, "a6", "m3",
                  ["Steam", "Microsoft Store", "Snack Shop", "School Cafeteria"],
                  "gaming", 5, 35, 14, TODAY, START)

    # Lisbon trip cluster
    lisbon = [
        ("TAP Air Portugal",      -1240.50, "travel",        "2026-03-14"),
        ("Lisbon Marriott",        -380.00, "lodging",       "2026-03-14"),
        ("Time Out Market",         -64.20, "dining",        "2026-03-15"),
        ("Castelo de S. Jorge",     -28.00, "entertainment", "2026-03-15"),
        ("Pingo Doce",              -42.10, "groceries",     "2026-03-16"),
        ("Ginjinha do Carmo",       -18.50, "dining",        "2026-03-16"),
        ("Tram 28",                 -12.00, "transit",       "2026-03-17"),
        ("Pasteis de Belem",        -22.40, "dining",        "2026-03-17"),
        ("Sintra Day Tour",        -180.00, "entertainment", "2026-03-18"),
        ("Cervejaria Ramiro",      -134.80, "dining",        "2026-03-19"),
        ("Pingo Doce",              -55.00, "groceries",     "2026-03-20"),
        ("Uber Lisboa",             -16.50, "transit",       "2026-03-21"),
        ("LX Factory Market",       -88.00, "shopping",      "2026-03-22"),
        ("Solar dos Presuntos",    -210.00, "dining",        "2026-03-23"),
        ("TAP Air Portugal",       -240.00, "travel",        "2026-03-28"),
    ]
    for merchant, amount, category, date in lisbon:
        transactions.append({
            "txn_id": txn_id(),
            "account_id": "a4",
            "member_id": "m1",
            "date": date,
            "amount": amount,
            "merchant": merchant,
            "category": category,
            "location": "Lisbon",
        })

    sort_txns(transactions)

    return {
        "family_id": "fam_chen",
        "family_name": "The Chen Family",
        "archetype": "Dual-income family of 4 in Toronto, mid-40s parents, two kids",
        "as_of": TODAY.isoformat(),
        "members": [
            {"member_id": "m1", "name": "Sarah Chen", "role": "guardian", "age": 42},
            {"member_id": "m2", "name": "Mike Chen",  "role": "partner",  "age": 44},
            {"member_id": "m3", "name": "Ben Chen",   "role": "teen",     "age": 15},
            {"member_id": "m4", "name": "Lily Chen",  "role": "kid",      "age": 10},
        ],
        "accounts": accounts,
        "transactions": transactions,
        "recurring": [
            {"merchant": "Mortgage Payment",  "amount": -2150.00, "cadence": "monthly", "account_id": "a1"},
            {"merchant": "Netflix",           "amount":   -22.99, "cadence": "monthly", "account_id": "a4"},
            {"merchant": "Spotify Family",    "amount":   -16.99, "cadence": "monthly", "account_id": "a4"},
            {"merchant": "Disney+",           "amount":   -14.99, "cadence": "monthly", "account_id": "a4"},
            {"merchant": "GoodLife Fitness",  "amount":   -45.00, "cadence": "monthly", "account_id": "a4", "flag": "unused_8_weeks"},
            {"merchant": "Hydro One",         "amount":  -140.00, "cadence": "monthly", "account_id": "a1"},
            {"merchant": "Enbridge Gas",      "amount":   -95.00, "cadence": "monthly", "account_id": "a1"},
            {"merchant": "Rogers Internet",   "amount":   -89.99, "cadence": "monthly", "account_id": "a1"},
            {"merchant": "Bell Mobility",     "amount":   -75.00, "cadence": "monthly", "account_id": "a1"},
        ],
        "goals": [
            {"goal_id": "g1", "scope": "family", "label": "Lisbon trip August",  "target":  6000, "current": 4200, "deadline": "2026-08-01"},
            {"goal_id": "g2", "scope": "m1",     "label": "Max TFSA 2026",       "target":  7000, "current": 4500, "deadline": "2026-12-31"},
            {"goal_id": "g3", "scope": "family", "label": "Home reno fund",      "target": 25000, "current": 9800, "deadline": "2027-06-01"},
            {"goal_id": "g4", "scope": "m3",     "label": "Ben's bike upgrade",  "target":   400, "current":  312, "deadline": "2026-09-01"},
        ],
        "obligations": [
            {"type": "mortgage", "monthly_payment": 2150.00, "remaining_balance": 412000.00, "rate_pct": 4.79},
        ],
        "purchase_history": [
            {"item": "Patio set",         "price": 480.00, "date": "2025-07-12", "used": "yes",     "owner": "m1"},
            {"item": "Treadmill",         "price": 950.00, "date": "2025-01-04", "used": "no",      "owner": "m1"},
            {"item": "Kids art supplies", "price":  85.00, "date": "2026-03-20", "used": "partial", "owner": "m4"},
            {"item": "Bike",              "price": 620.00, "date": "2024-05-01", "used": "yes",     "owner": "m3"},
            {"item": "Espresso machine",  "price": 380.00, "date": "2024-11-22", "used": "yes",     "owner": "m1"},
            {"item": "Robot vacuum",      "price": 450.00, "date": "2024-09-10", "used": "yes",     "owner": "m1"},
            {"item": "Stand mixer",       "price": 510.00, "date": "2025-12-15", "used": "no",      "owner": "m1"},
        ],
        "demo_targets": {
            "should_we_buy_query": {"item": "Bugaboo stroller", "price": 300.00, "asked_by": "m1"},
            "proactive_anomaly":   {"type": "unused_subscription", "merchant": "GoodLife Fitness",
                                    "weeks_unused": 8, "annualized_save": 540.00},
        },
        "sample_questions": [
            # --- Guardian (Sarah) ---
            {"by": "m1", "angle": "affordability",   "q": "Should we buy a $300 stroller for Lily this month?"},
            {"by": "m1", "angle": "goal_tracking",   "q": "Are we on track for the Lisbon trip in August?"},
            {"by": "m1", "angle": "time_comparison", "q": "How much did our family spend on dining out last month vs the month before?"},
            {"by": "m1", "angle": "cross_member",    "q": "How much did Ben spend on gaming this quarter?"},
            {"by": "m1", "angle": "trip_cost",       "q": "What did the Lisbon trip cost us total, broken down by category?"},
            {"by": "m1", "angle": "subscription",    "q": "Should I cancel my GoodLife membership? We have not used it in two months."},
            {"by": "m1", "angle": "what_if",         "q": "If we cut dining out by half, how much would we save by December?"},
            {"by": "m1", "angle": "affordability",   "q": "Can we afford a $5,000 patio renovation this summer without missing our home reno goal?"},
            {"by": "m1", "angle": "past_outcome",    "q": "Which of our past large purchases did we actually use?"},
            {"by": "m1", "angle": "category",        "q": "What is our biggest category of spending this quarter?"},
            {"by": "m1", "angle": "anomaly",         "q": "Was there anything unusual on the credit card this month?"},
            # --- Partner (Mike) ---
            {"by": "m2", "angle": "category",        "q": "How much did Sarah spend on her credit card last month?"},
            {"by": "m2", "angle": "goal_tracking",   "q": "Are we still on pace for the home reno fund by next June?"},
            # --- Teen (Ben) ---
            {"by": "m3", "angle": "affordability",   "q": "Can I afford an $80 gaming controller this month?"},
            {"by": "m3", "angle": "goal_tracking",   "q": "How much have I saved toward my bike upgrade?"},
            {"by": "m3", "angle": "category",        "q": "How much did I spend on Steam this month?"},
        ],
    }


def gen_luca():
    rng = random.Random(SEED + 2)
    txn_id = make_txn_id()
    transactions = []

    accounts = [
        {"account_id": "a1", "product": "No-Fee Chequing",     "owner": "m1", "balance":  812.40},
        {"account_id": "a2", "product": "Savings Account",     "owner": "m1", "balance":  640.00},
    ]

    # Part-time barista income (bi-weekly)
    add_biweekly(transactions, txn_id, "a1", "m1", "Coffee Co. Payroll", 420.00, "income",
                 dt.date(2026, 2, 27), TODAY)

    # Occasional parental e-transfer
    for date_str, amount in [("2026-03-05", 150.00), ("2026-04-02", 200.00), ("2026-05-08", 100.00)]:
        transactions.append({
            "txn_id": txn_id(),
            "account_id": "a1",
            "member_id": "m1",
            "date": date_str,
            "amount": amount,
            "merchant": "E-transfer from Mom",
            "category": "transfer_in",
            "location": None,
        })

    # Auto-transfer to savings (small)
    for date_str in ["2026-02-28", "2026-03-28", "2026-04-28"]:
        transactions.append({
            "txn_id": txn_id(),
            "account_id": "a1",
            "member_id": "m1",
            "date": date_str,
            "amount": -75.00,
            "merchant": "Transfer to Savings",
            "category": "transfer_out",
            "location": None,
        })
        transactions.append({
            "txn_id": txn_id(),
            "account_id": "a2",
            "member_id": "m1",
            "date": date_str,
            "amount":  75.00,
            "merchant": "Transfer from Chequing",
            "category": "transfer_in",
            "location": None,
        })

    # Rent (room in shared apartment)
    add_monthly(transactions, txn_id, "a1", "m1", "Roommate Rent E-transfer", -900.00, "housing", 1, START, TODAY)
    # Subscriptions
    add_monthly(transactions, txn_id, "a1", "m1", "Spotify Student",       -5.99, "subscription", 8, START, TODAY)
    add_monthly(transactions, txn_id, "a1", "m1", "Netflix Standard",     -16.49, "subscription", 5, START, TODAY)
    add_monthly(transactions, txn_id, "a1", "m1", "Apple Music",           -5.99, "subscription", 14, START, TODAY)
    add_monthly(transactions, txn_id, "a1", "m1", "Audible",              -16.95, "subscription", 20, START, TODAY)
    # Phone (Freedom Mobile)
    add_monthly(transactions, txn_id, "a1", "m1", "Freedom Mobile",       -35.00, "utilities", 22, START, TODAY)

    # Daily life
    add_weekly_grocery(rng, transactions, txn_id, "a1", "m1", 35, 75, START, TODAY, top_up_prob=0.2)
    add_sprinkled(rng, transactions, txn_id, "a1", "m1", COFFEE,  "coffee",  3.5,  8, 38, TODAY, START)
    add_sprinkled(rng, transactions, txn_id, "a1", "m1", DINING,  "dining",  12, 35, 14, TODAY, START)
    add_sprinkled(rng, transactions, txn_id, "a1", "m1", TRANSIT, "transit",  3, 12, 32, TODAY, START)
    add_sprinkled(rng, transactions, txn_id, "a1", "m1",
                  ["Indigo", "Amazon", "Sephora", "Aritzia", "Winners"],
                  "shopping",  15,  85, 10, TODAY, START)
    add_sprinkled(rng, transactions, txn_id, "a1", "m1", PHARMACY, "pharmacy", 10, 35, 5, TODAY, START)

    sort_txns(transactions)

    return {
        "family_id": "fam_luca",
        "family_name": "Luca (solo)",
        "archetype": "Gen Z college student in Toronto, part-time barista, lives in shared apartment",
        "as_of": TODAY.isoformat(),
        "members": [
            {"member_id": "m1", "name": "Luca Romano", "role": "guardian", "age": 19},
        ],
        "accounts": accounts,
        "transactions": transactions,
        "recurring": [
            {"merchant": "Roommate Rent E-transfer", "amount": -900.00, "cadence": "monthly", "account_id": "a1"},
            {"merchant": "Spotify Student",           "amount":  -5.99, "cadence": "monthly", "account_id": "a1"},
            {"merchant": "Netflix Standard",          "amount": -16.49, "cadence": "monthly", "account_id": "a1"},
            {"merchant": "Apple Music",               "amount":  -5.99, "cadence": "monthly", "account_id": "a1",
             "flag": "duplicate_music_sub"},
            {"merchant": "Audible",                   "amount": -16.95, "cadence": "monthly", "account_id": "a1",
             "flag": "unused_3_months"},
            {"merchant": "Freedom Mobile",            "amount": -35.00, "cadence": "monthly", "account_id": "a1"},
        ],
        "goals": [
            {"goal_id": "g1", "scope": "m1", "label": "Emergency fund $2,000", "target": 2000, "current": 640, "deadline": "2026-12-31"},
            {"goal_id": "g2", "scope": "m1", "label": "AirPods Pro",            "target":  250, "current":  90, "deadline": "2026-08-01"},
        ],
        "obligations": [],
        "purchase_history": [
            {"item": "Backpack",          "price":  85.00, "date": "2025-09-02", "used": "yes",     "owner": "m1"},
            {"item": "Yoga mat",          "price":  45.00, "date": "2025-11-10", "used": "no",      "owner": "m1"},
            {"item": "Textbook bundle",   "price": 320.00, "date": "2026-01-08", "used": "yes",     "owner": "m1"},
            {"item": "Bluetooth speaker", "price":  60.00, "date": "2025-12-22", "used": "partial", "owner": "m1"},
        ],
        "demo_targets": {
            "should_we_buy_query": {"item": "AirPods Pro", "price": 250.00, "asked_by": "m1"},
            "proactive_anomaly":   {"type": "duplicate_subscription", "merchants": ["Spotify Student", "Apple Music"],
                                    "annualized_save": 71.88},
        },
        "sample_questions": [
            {"by": "m1", "angle": "affordability",   "q": "Can I afford $250 AirPods this month?"},
            {"by": "m1", "angle": "goal_tracking",   "q": "How much have I saved vs my $2,000 emergency goal?"},
            {"by": "m1", "angle": "subscription",    "q": "Which of my subscriptions am I paying for but barely using?"},
            {"by": "m1", "angle": "subscription",    "q": "Am I paying for two music services? Should I cancel one?"},
            {"by": "m1", "angle": "category",        "q": "How much did I spend on coffee this month?"},
            {"by": "m1", "angle": "what_if",         "q": "If I cut my Starbucks habit in half, what would I save by December?"},
            {"by": "m1", "angle": "time_comparison", "q": "Am I spending more on food this month than last?"},
            {"by": "m1", "angle": "category",        "q": "What is my biggest spending category outside of rent?"},
            {"by": "m1", "angle": "what_if",         "q": "If I save $75 every two weeks, when will I hit my emergency goal?"},
            {"by": "m1", "angle": "past_outcome",    "q": "Have I actually used the things I bought in the last 6 months?"},
        ],
    }


def gen_daniel():
    rng = random.Random(SEED + 3)
    txn_id = make_txn_id()
    transactions = []

    accounts = [
        {"account_id": "a1", "product": "No-Fee Chequing",          "owner": "m1", "balance":  4180.00},
        {"account_id": "a2", "product": "Savings Account",          "owner": "m1", "balance":  2200.00},
        {"account_id": "a3", "product": "TFSA Savings",             "owner": "m1", "balance": 18450.00},
        {"account_id": "a4", "product": "Money-Back World Mastercard", "owner": "m1", "balance": -1120.45},
        {"account_id": "a5", "product": "Mutual Fund (Equity)",     "owner": "m1", "balance":  6300.00},
    ]

    # Salary bi-weekly
    add_biweekly(transactions, txn_id, "a1", "m1", "TechCo Payroll", 2050.00, "income",
                 dt.date(2026, 2, 27), TODAY)

    # Rent
    add_monthly(transactions, txn_id, "a1", "m1", "Landlord E-transfer", -2000.00, "housing", 1, START, TODAY)

    # Auto-contribute TFSA monthly
    for date_str in ["2026-03-01", "2026-04-01", "2026-05-01"]:
        transactions.append({
            "txn_id": txn_id(),
            "account_id": "a1",
            "member_id": "m1",
            "date": date_str,
            "amount": -400.00,
            "merchant": "Transfer to TFSA",
            "category": "transfer_out",
            "location": None,
        })
        transactions.append({
            "txn_id": txn_id(),
            "account_id": "a3",
            "member_id": "m1",
            "date": date_str,
            "amount":  400.00,
            "merchant": "Transfer from Chequing",
            "category": "transfer_in",
            "location": None,
        })

    # Subscriptions on credit card
    add_monthly(transactions, txn_id, "a4", "m1", "Netflix Premium",     -24.99, "subscription",  5, START, TODAY)
    add_monthly(transactions, txn_id, "a4", "m1", "Spotify Premium",     -10.99, "subscription",  8, START, TODAY)
    add_monthly(transactions, txn_id, "a4", "m1", "Crave",               -19.99, "subscription", 12, START, TODAY)
    add_monthly(transactions, txn_id, "a4", "m1", "Apple TV+",            -9.99, "subscription", 18, START, TODAY)
    add_monthly(transactions, txn_id, "a4", "m1", "F45 Training",        -89.00, "subscription",  4, START, TODAY)
    add_monthly(transactions, txn_id, "a4", "m1", "ChatGPT Plus",        -28.00, "subscription", 14, START, TODAY)
    add_monthly(transactions, txn_id, "a1", "m1", "Rogers Internet",     -89.99, "utilities",     22, START, TODAY)
    add_monthly(transactions, txn_id, "a1", "m1", "Bell Mobility",       -85.00, "utilities",     25, START, TODAY)
    add_monthly(transactions, txn_id, "a1", "m1", "Toronto Hydro",       -65.00, "utilities",     15, START, TODAY)

    # Daily life
    add_weekly_grocery(rng, transactions, txn_id, "a4", "m1", 65, 130, START, TODAY)
    add_sprinkled(rng, transactions, txn_id, "a4", "m1", COFFEE,   "coffee",   4,  10, 28, TODAY, START)
    add_sprinkled(rng, transactions, txn_id, "a4", "m1", DINING,   "dining",  30, 110, 22, TODAY, START)
    add_sprinkled(rng, transactions, txn_id, "a1", "m1", TRANSIT,  "transit",  4,  35, 26, TODAY, START)
    add_sprinkled(rng, transactions, txn_id, "a4", "m1", SHOPPING, "shopping",25, 250, 14, TODAY, START)
    add_sprinkled(rng, transactions, txn_id, "a4", "m1", PHARMACY, "pharmacy",15,  55,  6, TODAY, START)
    add_sprinkled(rng, transactions, txn_id, "a4", "m1",
                  ["LCBO", "Wine Rack", "Beer Store"],
                  "alcohol", 18, 65, 12, TODAY, START)

    sort_txns(transactions)

    return {
        "family_id": "fam_daniel",
        "family_name": "Daniel (solo)",
        "archetype": "Gen Z software professional in Toronto, salaried, saving for first home",
        "as_of": TODAY.isoformat(),
        "members": [
            {"member_id": "m1", "name": "Daniel Kim", "role": "guardian", "age": 26},
        ],
        "accounts": accounts,
        "transactions": transactions,
        "recurring": [
            {"merchant": "Landlord E-transfer",  "amount": -2000.00, "cadence": "monthly", "account_id": "a1"},
            {"merchant": "Netflix Premium",      "amount":   -24.99, "cadence": "monthly", "account_id": "a4"},
            {"merchant": "Spotify Premium",      "amount":   -10.99, "cadence": "monthly", "account_id": "a4"},
            {"merchant": "Crave",                "amount":   -19.99, "cadence": "monthly", "account_id": "a4",
             "flag": "watched_once_in_60d"},
            {"merchant": "Apple TV+",            "amount":    -9.99, "cadence": "monthly", "account_id": "a4"},
            {"merchant": "F45 Training",         "amount":   -89.00, "cadence": "monthly", "account_id": "a4"},
            {"merchant": "ChatGPT Plus",         "amount":   -28.00, "cadence": "monthly", "account_id": "a4"},
            {"merchant": "Rogers Internet",      "amount":   -89.99, "cadence": "monthly", "account_id": "a1"},
            {"merchant": "Bell Mobility",        "amount":   -85.00, "cadence": "monthly", "account_id": "a1"},
            {"merchant": "Toronto Hydro",        "amount":   -65.00, "cadence": "monthly", "account_id": "a1"},
        ],
        "goals": [
            {"goal_id": "g1", "scope": "m1", "label": "Downpayment fund",     "target": 40000, "current": 18450, "deadline": "2027-12-31"},
            {"goal_id": "g2", "scope": "m1", "label": "Max TFSA 2026",        "target":  7000, "current":  1200, "deadline": "2026-12-31"},
            {"goal_id": "g3", "scope": "m1", "label": "Vacation: Tokyo 2027", "target":  5000, "current":   400, "deadline": "2027-04-01"},
        ],
        "obligations": [],
        "purchase_history": [
            {"item": "Standing desk",       "price": 580.00, "date": "2024-08-12", "used": "yes",     "owner": "m1"},
            {"item": "Espresso machine",    "price": 450.00, "date": "2025-02-04", "used": "yes",     "owner": "m1"},
            {"item": "Air fryer",           "price": 180.00, "date": "2025-06-22", "used": "partial", "owner": "m1"},
            {"item": "DSLR camera",         "price": 1200.00,"date": "2024-11-30", "used": "no",      "owner": "m1"},
            {"item": "Mechanical keyboard", "price": 240.00, "date": "2025-09-15", "used": "yes",     "owner": "m1"},
            {"item": "Peloton bike",        "price": 1995.00,"date": "2024-02-14", "used": "no",      "owner": "m1"},
        ],
        "demo_targets": {
            "should_we_buy_query": {"item": "Sony WH-1000XM5 headphones", "price": 499.00, "asked_by": "m1"},
            "proactive_anomaly":   {"type": "rarely_used_subscription", "merchant": "Crave",
                                    "annualized_save": 239.88},
        },
        "sample_questions": [
            {"by": "m1", "angle": "affordability",   "q": "Should I buy the Sony WH-1000XM5 headphones for $499 this month?"},
            {"by": "m1", "angle": "goal_tracking",   "q": "Am I on track for the downpayment fund by end of 2027?"},
            {"by": "m1", "angle": "recommendation",  "q": "Should I move my chequing surplus to TFSA this month?"},
            {"by": "m1", "angle": "category",        "q": "How much did I spend on dining vs groceries this month?"},
            {"by": "m1", "angle": "what_if",         "q": "If I cancel Crave and Apple TV+, what is my annual save?"},
            {"by": "m1", "angle": "subscription",    "q": "Which streaming services have I barely opened in the last 60 days?"},
            {"by": "m1", "angle": "time_comparison", "q": "Am I spending more on food this quarter than last?"},
            {"by": "m1", "angle": "past_outcome",    "q": "I keep buying expensive gear. How many of those purchases did I actually use?"},
            {"by": "m1", "angle": "what_if",         "q": "If I increase my TFSA transfer by $200/mo, when do I max out 2026?"},
            {"by": "m1", "angle": "category",        "q": "How much am I spending on alcohol per month?"},
            {"by": "m1", "angle": "anomaly",         "q": "Was there anything unusual on my credit card this month?"},
        ],
    }


def gen_margaret():
    rng = random.Random(SEED + 4)
    txn_id = make_txn_id()
    transactions = []

    accounts = [
        {"account_id": "a1", "product": "No-Fee Chequing",   "owner": "m1", "balance":  4820.00},
        {"account_id": "a2", "product": "Savings Account",   "owner": "m1", "balance": 28400.00},
        {"account_id": "a3", "product": "RIF Savings",       "owner": "m1", "balance": 142000.00},
        {"account_id": "a4", "product": "GIC 2-year",        "owner": "m1", "balance":  30000.00},
    ]

    # Pension monthly
    add_monthly(transactions, txn_id, "a1", "m1", "Service Canada (CPP)", 1180.00, "income", 27, START, TODAY)
    add_monthly(transactions, txn_id, "a1", "m1", "Old Age Security",      720.00, "income", 27, START, TODAY)
    # RIF withdrawal monthly
    add_monthly(transactions, txn_id, "a1", "m1", "RIF Withdrawal", 1200.00, "income", 5, START, TODAY)
    add_monthly(transactions, txn_id, "a3", "m1", "RIF Withdrawal", -1200.00, "transfer_out", 5, START, TODAY)

    # Property tax monthly installment
    add_monthly(transactions, txn_id, "a1", "m1", "City of Toronto Property Tax", -380.00, "housing", 10, START, TODAY)
    # Utilities
    add_monthly(transactions, txn_id, "a1", "m1", "Toronto Hydro",        -110.00, "utilities", 15, START, TODAY)
    add_monthly(transactions, txn_id, "a1", "m1", "Enbridge Gas",          -85.00, "utilities", 18, START, TODAY)
    add_monthly(transactions, txn_id, "a1", "m1", "Rogers Internet",       -69.99, "utilities", 22, START, TODAY)
    add_monthly(transactions, txn_id, "a1", "m1", "Bell Home Phone",       -42.00, "utilities", 24, START, TODAY)
    # Insurance
    add_monthly(transactions, txn_id, "a1", "m1", "Home Insurance",        -95.00, "insurance", 12, START, TODAY)
    # Charitable
    add_monthly(transactions, txn_id, "a1", "m1", "United Way Donation",   -50.00, "charity",   20, START, TODAY)
    # Light subscriptions
    add_monthly(transactions, txn_id, "a1", "m1", "Crave",                 -19.99, "subscription", 8, START, TODAY)
    add_monthly(transactions, txn_id, "a1", "m1", "The Globe and Mail",    -29.99, "subscription", 12, START, TODAY)

    # Daily life (lower volume, more pharmacy)
    add_weekly_grocery(rng, transactions, txn_id, "a1", "m1", 45, 95, START, TODAY, weekday=2, top_up_prob=0.15)
    add_sprinkled(rng, transactions, txn_id, "a1", "m1", PHARMACY, "pharmacy",  15,  85, 14, TODAY, START)
    add_sprinkled(rng, transactions, txn_id, "a1", "m1",
                  ["Tim Hortons", "Second Cup"], "coffee", 3, 7, 8, TODAY, START)
    add_sprinkled(rng, transactions, txn_id, "a1", "m1",
                  ["Swiss Chalet", "The Keg", "Boston Pizza"], "dining", 25, 65, 5, TODAY, START)
    add_sprinkled(rng, transactions, txn_id, "a1", "m1",
                  ["TTC PRESTO Senior", "Beck Taxi"], "transit", 3, 22, 18, TODAY, START)
    add_sprinkled(rng, transactions, txn_id, "a1", "m1",
                  ["Canadian Tire", "Home Hardware", "Bouclair"], "shopping", 15, 95, 6, TODAY, START)
    # Gifts to grandchildren
    transactions.append({
        "txn_id": txn_id(),
        "account_id": "a1",
        "member_id": "m1",
        "date": "2026-04-12",
        "amount": -150.00,
        "merchant": "Indigo (gift for grandchild)",
        "category": "gift",
        "location": "Toronto",
    })

    # One unexpected medical expense
    transactions.append({
        "txn_id": txn_id(),
        "account_id": "a1",
        "member_id": "m1",
        "date": "2026-04-22",
        "amount": -420.00,
        "merchant": "Dental Clinic",
        "category": "health",
        "location": "Toronto",
    })

    sort_txns(transactions)

    return {
        "family_id": "fam_margaret",
        "family_name": "Margaret (solo)",
        "archetype": "Retired widow in Toronto, late 60s, owns home outright, lives on pension and RIF",
        "as_of": TODAY.isoformat(),
        "members": [
            {"member_id": "m1", "name": "Margaret Doyle", "role": "guardian", "age": 68},
        ],
        "accounts": accounts,
        "transactions": transactions,
        "recurring": [
            {"merchant": "City of Toronto Property Tax", "amount": -380.00, "cadence": "monthly", "account_id": "a1"},
            {"merchant": "Toronto Hydro",                "amount": -110.00, "cadence": "monthly", "account_id": "a1"},
            {"merchant": "Enbridge Gas",                 "amount":  -85.00, "cadence": "monthly", "account_id": "a1"},
            {"merchant": "Rogers Internet",              "amount":  -69.99, "cadence": "monthly", "account_id": "a1"},
            {"merchant": "Bell Home Phone",              "amount":  -42.00, "cadence": "monthly", "account_id": "a1"},
            {"merchant": "Home Insurance",               "amount":  -95.00, "cadence": "monthly", "account_id": "a1"},
            {"merchant": "United Way Donation",          "amount":  -50.00, "cadence": "monthly", "account_id": "a1"},
            {"merchant": "Crave",                        "amount":  -19.99, "cadence": "monthly", "account_id": "a1",
             "flag": "watched_once_in_60d"},
            {"merchant": "The Globe and Mail",           "amount":  -29.99, "cadence": "monthly", "account_id": "a1"},
        ],
        "goals": [
            {"goal_id": "g1", "scope": "m1", "label": "Grandchildren gift fund 2026", "target":  3000, "current":  1200, "deadline": "2026-12-20"},
            {"goal_id": "g2", "scope": "m1", "label": "Emergency cushion",            "target": 30000, "current": 28400, "deadline": "2026-12-31"},
        ],
        "obligations": [],
        "purchase_history": [
            {"item": "Reclining chair",   "price":  780.00, "date": "2025-10-08", "used": "yes",     "owner": "m1"},
            {"item": "Hearing aid",       "price": 2400.00, "date": "2025-04-15", "used": "yes",     "owner": "m1"},
            {"item": "Tablet",            "price":  399.00, "date": "2024-12-20", "used": "partial", "owner": "m1"},
            {"item": "Garden tools",      "price":  140.00, "date": "2025-05-12", "used": "yes",     "owner": "m1"},
        ],
        "demo_targets": {
            "voice_persona": "slow_deliberate_elder_advisor",
            "reassurance_query": {"q": "Did all my bills get paid this month?", "asked_by": "m1"},
            "proactive_anomaly": {"type": "rarely_used_subscription", "merchant": "Crave", "annualized_save": 239.88},
        },
        "sample_questions": [
            {"by": "m1", "angle": "reassurance",     "q": "Did all my bills get paid this month?"},
            {"by": "m1", "angle": "category",        "q": "How much did I spend on groceries this month?"},
            {"by": "m1", "angle": "anomaly",         "q": "Was there anything unusual in my account this month?"},
            {"by": "m1", "angle": "goal_tracking",   "q": "Am I on track for my grandchildren gift fund?"},
            {"by": "m1", "angle": "time_comparison", "q": "Am I spending more or less than last month?"},
            {"by": "m1", "angle": "subscription",    "q": "Which of my subscriptions do I actually use?"},
            {"by": "m1", "angle": "affordability",   "q": "Can I afford a $1,200 trip to visit my sister in Halifax this fall?"},
            {"by": "m1", "angle": "recommendation",  "q": "Should I move some of my savings into a GIC for a better return?"},
            {"by": "m1", "angle": "category",        "q": "How much have I spent on health this year?"},
            {"by": "m1", "angle": "what_if",         "q": "If I keep saving at this pace, what will I have by the end of the year?"},
        ],
    }


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for name, gen in [
        ("chen",     gen_chen),
        ("luca",     gen_luca),
        ("daniel",   gen_daniel),
        ("margaret", gen_margaret),
    ]:
        data = gen()
        out_path = OUT_DIR / f"{name}.json"
        with out_path.open("w") as f:
            json.dump(data, f, indent=2)
        n_txn = len(data["transactions"])
        n_q   = len(data["sample_questions"])
        print(f"{out_path}: {n_txn} transactions, {n_q} sample questions")


if __name__ == "__main__":
    main()
