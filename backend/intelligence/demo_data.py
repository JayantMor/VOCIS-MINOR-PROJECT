"""Realistic demo datasets. Content is designed for demonstration, but VOCIS analyzes
them through the exact same production pipeline — no hard-coded themes or conclusions.
Each dataset has a different schema to prove adaptivity. Text is composed from many
fragments so records are naturally varied (as real feedback is)."""
import random
import pandas as pd
from datetime import datetime, timedelta


def _c(rng, *fragment_lists):
    return " ".join(rng.choice(f) for f in fragment_lists).replace(" .", ".").replace("  ", " ").strip()


def build_fintech():
    """NimbusPay — FinTech app. Schema: review_text, created_at, stars, product, region.
    Contains an emerging payment-reliability problem that accelerates in recent weeks."""
    rng = random.Random(11)
    start = datetime(2025, 12, 1)
    products = ["NimbusPay Wallet", "NimbusPay Card", "NimbusPay Business"]
    regions = ["North America", "Europe", "Asia Pacific", "Latin America"]

    def onboarding(r):  # 5
        return _c(r, ["Signing up", "Account setup", "The onboarding", "Getting started", "Verification"],
                  ["took just a couple of minutes", "was smooth and clear", "was effortless",
                   "was the easiest I've tried", "went through instantly"],
                  ["and the ID check was instant.", "with no confusing steps.",
                   "and I was ready to pay right away.", "which impressed me.", "honestly."])

    def ui(r):  # 5
        return _c(r, ["The app", "The interface", "The dashboard", "Everything in the app", "The design"],
                  ["is clean and fast", "is beautifully laid out", "makes it easy",
                   "feels intuitive", "is a pleasure to use"],
                  ["to find what I need.", "and never gets in my way.", "every single day.",
                   "to track where my money goes.", "even for my parents."])

    def support(r):  # 2 negative
        return _c(r, ["Customer support", "Their help team", "The support chat", "Support"],
                  ["took days to reply", "never responded at all", "was impossible to reach",
                   "just loops through a useless bot", "closed my ticket without solving anything"],
                  ["when I actually needed help.", "and my issue is still open.",
                   "which was incredibly frustrating.", "with no human in sight.", "twice now."])

    def fees(r):  # 2 negative
        return _c(r, ["A hidden fee", "The monthly charge", "A foreign transaction fee", "Extra charges"],
                  ["appeared without warning", "went up without any notice", "was never disclosed",
                   "keeps stacking up", "surprised me on my statement"],
                  ["and nobody could explain it.", "for something that used to be free.",
                   "so I feel misled.", "which adds up quickly.", "and support shrugged."])

    def payment_fail(r):  # 1 negative — the emerging crisis
        return _c(r, ["My payment failed but", "A transaction showed as processed yet",
                       "The transfer said successful but", "My card was declined three times and then",
                       "Checkout failed but"],
                  ["the money was still deducted", "the merchant never received it",
                   "I was charged twice for one order", "my balance dropped anyway",
                   "the recipient got nothing"],
                  ["and support has gone silent.", "— I still have no refund.",
                   "for the second time this week.", "and I can't get anyone to fix it.",
                   "which is genuinely worrying."])

    def feature(r):  # 3 request
        return _c(r, ["I really wish they would add", "Please add", "It would be great to have",
                       "The app is missing", "I'd love the ability to add"],
                  ["support for joint accounts", "scheduled recurring transfers", "a built-in budgeting view",
                   "PDF statement exports", "per-card spending limits", "a savings pot feature"],
                  [".", " soon.", " like other apps.", " for families.", " please."])

    def speed(r):  # 5
        return _c(r, ["Transfers", "Payments", "Money to friends", "Instant transfers", "Settlements"],
                  ["arrive almost instantly", "clear far faster than my old bank", "land in seconds",
                   "are genuinely instant", "post immediately"],
                  ["which is fantastic.", "and it's a game changer.", "even on weekends.",
                   "with no waiting.", "every time."])

    topics = {"onboarding": (onboarding, 5), "ui": (ui, 5), "support": (support, 2),
              "fees": (fees, 2), "payment_fail": (payment_fail, 1), "feature": (feature, 3),
              "speed": (speed, 5)}
    rows = []
    n = 300
    for i in range(n):
        frac = i / n
        payment_bias = 0.02 + frac * 0.32
        if rng.random() < payment_bias:
            key = "payment_fail"
        else:
            key = rng.choice(["onboarding", "ui", "support", "fees", "feature", "speed", "ui", "speed"])
        fn, base = topics[key]
        stars = max(1, min(5, base + rng.choice([-1, 0, 0, 1])))
        date = start + timedelta(days=int(frac * 105) + rng.randint(0, 2))
        rows.append({"review_text": fn(rng), "created_at": date.strftime("%Y-%m-%d"),
                     "stars": stars, "product": rng.choice(products), "region": rng.choice(regions)})
    rng.shuffle(rows)
    return {"name": "NimbusPay — FinTech App", "industry": "consumer fintech mobile app",
            "brand": "NimbusPay", "df": pd.DataFrame(rows)}


def build_competitive():
    """CloudVault vs competitors. Schema: feedback, brand, rating, date."""
    rng = random.Random(23)
    start = datetime(2025, 10, 1)
    profiles = {
        "CloudVault": {"reliability": 0.5, "support": 0.82, "price": 0.4, "speed": 0.72},
        "DropBase": {"reliability": 0.86, "support": 0.42, "price": 0.5, "speed": 0.6},
        "StoreMax": {"reliability": 0.6, "support": 0.58, "price": 0.86, "speed": 0.48},
    }
    frags = {
        "reliability": (
            [["Files", "Sync", "Everything"], ["syncs reliably", "never drops", "just works", "stays consistent"],
             ["and I never lose anything.", "across all my devices.", "even offline.", "without conflicts."]],
            [["Sync", "Uploads", "Files"], ["fails constantly", "randomly disappear", "break mid-transfer", "corrupt"],
             ["and I lost a document.", "at the worst times.", "with no warning.", "again this week."]]),
        "support": (
            [["Support", "Their help team", "Customer service"], ["replied within the hour", "is knowledgeable", "fixed it fast", "is friendly"],
             ["and solved my problem.", "every time.", "with real people.", "impressively."]],
            [["Support", "Customer service", "Their help desk"], ["never got back to me", "took a week to reply", "was useless", "only sent canned articles"],
             ["and my issue is unresolved.", "which is unacceptable.", "with no human help.", "so I gave up."]]),
        "price": (
            [["Pricing", "The plans", "The cost"], ["is fair", "is great value", "scales affordably", "beats competitors"],
             ["for the storage.", "as my team grows.", "by a wide margin.", "honestly."]],
            [["Pricing", "The plan cost", "The subscription"], ["is far too high", "keeps rising", "hides charges", "is overpriced"],
             ["for what you get.", "every renewal.", "beyond the advertised rate.", "compared to rivals."]]),
        "speed": (
            [["Uploads", "Downloads", "Previews"], ["are lightning fast", "load instantly", "fly through", "never lag"],
             ["even for big files.", "on any connection.", "which I love.", "consistently."]],
            [["Uploads", "Large downloads", "Shared folders"], ["crawl", "time out", "lag badly", "take forever"],
             ["on big files.", "constantly.", "and stall.", "even on fast wifi."]]),
    }
    rows = []
    for _ in range(340):
        brand = rng.choice(list(profiles.keys()))
        dim = rng.choice(list(frags.keys()))
        good = rng.random() < profiles[brand][dim]
        pos, neg = frags[dim]
        text = _c(rng, *(pos if good else neg))
        rating = rng.choice([4, 5] if good else [1, 2])
        date = start + timedelta(days=rng.randint(0, 120))
        rows.append({"feedback": text, "brand": brand, "rating": rating, "date": date.strftime("%Y-%m-%d")})
    rng.shuffle(rows)
    return {"name": "CloudVault — Competitive Set", "industry": "cloud storage SaaS",
            "brand": "CloudVault", "df": pd.DataFrame(rows)}


def build_simple():
    """BrewHouse Coffee. Schema: comment + rating only (no dates, no product)."""
    rng = random.Random(31)
    good = [["The flat white", "The espresso", "The cold brew", "My latte", "The pastry selection"],
            ["is the best in town", "is consistently excellent", "is rich and smooth", "never disappoints", "is worth the trip"],
            ["and the staff are lovely.", "in a cozy atmosphere.", "with quick friendly service.", "and they remember my order.", "every morning."]]
    ok = [["Nice spot,", "Solid coffee,", "Good place,", "Reliable,"],
          ["though it gets crowded", "but the wifi is slow", "yet seating is limited", "but a little pricey"],
          ["at peak times.", "when I want to work.", "on weekends.", "for the area."]]
    bad = [["The coffee", "My order", "The service", "The espresso"],
           ["was lukewarm", "came out wrong", "took twenty minutes", "was burnt and bitter"],
           ["and the queue was huge.", "despite a long wait.", "from rude staff.", "so I won't return."]]
    rows = []
    for _ in range(170):
        rating = rng.choice([5, 5, 4, 4, 2, 1])
        frags = good if rating >= 4 else bad if rating <= 2 else ok
        rows.append({"comment": _c(rng, *frags), "rating": rating})
    rng.shuffle(rows)
    return {"name": "BrewHouse — Coffee Retail", "industry": "coffee retail chain",
            "brand": "BrewHouse", "df": pd.DataFrame(rows)}


DEMOS = {"fintech": build_fintech, "competitive": build_competitive, "simple": build_simple}


def list_demos():
    return [
        {"key": "fintech", "name": "NimbusPay — FinTech App",
         "description": "Single brand with dates, ratings, products & regions — full temporal & emerging-issue intelligence.",
         "records": 300},
        {"key": "competitive", "name": "CloudVault — Competitive Set",
         "description": "Three brands with ratings & dates — dynamic competitive dimension comparison.",
         "records": 340},
        {"key": "simple", "name": "BrewHouse — Coffee Retail",
         "description": "Text & ratings only — pure semantic customer intelligence with honest limitations.",
         "records": 170},
    ]
