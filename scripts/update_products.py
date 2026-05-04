#!/usr/bin/env python3
"""
Restio Wellness — Product Updater
===================================
Fetches/simulates trending wellness products, generates
persuasive AI-style descriptions, and saves products.json.

Usage:
    python scripts/update_products.py

Requires (for real Amazon data - optional):
    pip install requests python-amazon-paapi

GitHub Actions will run this daily and auto-commit changes.
"""

import json
import random
import datetime
import os

# ──────────────────────────────────────────
# CONFIGURATION
# ──────────────────────────────────────────

AFFILIATE_TAG  = "restio-20"
OUTPUT_PATH    = os.path.join(os.path.dirname(__file__), "..", "data", "products.json")
AMAZON_BASE    = "https://www.amazon.com/dp/{asin}?tag=" + AFFILIATE_TAG

# ──────────────────────────────────────────
# PRODUCT CATALOG (seed data)
# Add/remove products here as needed.
# When Amazon PA-API is configured, ratings
# and review counts update automatically.
# ──────────────────────────────────────────

PRODUCT_CATALOG = [
    {
        "asin": "B07X3X7X5K",
        "title": "Manta Sleep Mask – 100% Blackout Eye Mask",
        "category": "sleep",
        "image": "https://images-na.ssl-images-amazon.com/images/I/71QZ3XQHOLL._AC_SL1500_.jpg",
        "base_rating": 4.5,
        "base_reviews": 12847,
        "badge": "Best Seller",
        "price": "$35.99",
        "features": [
            "100% blackout with zero eye pressure",
            "Adjustable eye cups fit any face shape",
            "Ultra-soft memory foam padding",
            "Machine washable & travel-friendly",
            "Blocks 100% of light without pressing on eyelids"
        ],
        "problem": "struggling to get deep, restorative sleep due to light intrusion",
        "hook": "Light intrusion is one of the top reasons people wake up groggy — the Manta Sleep Mask eliminates that completely.",
        "benefit": "zero-pressure blackout that lets your eyes move freely in REM sleep",
        "social_proof": "thousands of users report falling asleep faster and waking up genuinely rested for the first time in years"
    },
    {
        "asin": "B08HJXS7VM",
        "title": "URPOWER Essential Oil Diffuser – 500ml Aromatherapy Humidifier",
        "category": "stress",
        "image": "https://images-na.ssl-images-amazon.com/images/I/71vP7F2GKSL._AC_SL1500_.jpg",
        "base_rating": 4.6,
        "base_reviews": 38921,
        "badge": "Top Rated",
        "price": "$29.99",
        "features": [
            "500ml large water tank – runs up to 10 hours",
            "7 ambient LED color options",
            "4 timer settings and auto shut-off",
            "Whisper-quiet ultrasonic mist technology",
            "BPA-free materials, safe for home and office"
        ],
        "problem": "chronic stress and an inability to unwind after demanding days",
        "hook": "Your home should be your sanctuary — not an extension of the chaos.",
        "benefit": "transforms any room into a fragrant retreat with proven stress-lowering aromatherapy",
        "social_proof": "over 38,000 five-star reviews make this the go-to diffuser for wellness enthusiasts worldwide"
    },
    {
        "asin": "B07VXKL8JK",
        "title": "Hydro Flask Wide Mouth Water Bottle – 32 oz",
        "category": "energy",
        "image": "https://images-na.ssl-images-amazon.com/images/I/61KvS3HVOZL._AC_SL1500_.jpg",
        "base_rating": 4.8,
        "base_reviews": 67432,
        "badge": "Best Seller",
        "price": "$44.95",
        "features": [
            "TempShield double-wall vacuum insulation",
            "Keeps drinks cold 24 hours, hot 12 hours",
            "18/8 pro-grade stainless steel – no flavor transfer",
            "Dishwasher safe, BPA-free, phthalate-free",
            "Wide mouth fits ice cubes and most water filters"
        ],
        "problem": "chronic dehydration silently cutting energy and cognitive performance",
        "hook": "Even mild dehydration — just 1–2% below optimal — can slash energy and focus by up to 30%.",
        "benefit": "ice-cold water for 24 hours makes staying properly hydrated effortless and enjoyable",
        "social_proof": "trusted by athletes, office workers, and outdoor enthusiasts with 67k+ glowing reviews"
    },
    {
        "asin": "B082BZHZQM",
        "title": "Natural Vitality Calm – Magnesium Supplement Powder",
        "category": "stress",
        "image": "https://images-na.ssl-images-amazon.com/images/I/71mKMSSMCmL._AC_SL1500_.jpg",
        "base_rating": 4.5,
        "base_reviews": 29183,
        "badge": "Top Rated",
        "price": "$26.98",
        "features": [
            "Anti-stress magnesium formula",
            "Supports healthy magnesium levels",
            "Raspberry-lemon flavor – mixes easily in water",
            "Non-GMO, gluten-free, vegan certified",
            "Helps relax muscles and calm the nervous system"
        ],
        "problem": "chronic stress, poor sleep, and low energy caused by widespread magnesium deficiency",
        "hook": "Up to 50% of people don't get enough magnesium — the consequences are stress, tension, and brain fog.",
        "benefit": "replenishes magnesium to soothe your nervous system and shift from stressed to serene",
        "social_proof": "America's #1 selling magnesium supplement — customers call it their secret weapon for winding down"
    },
    {
        "asin": "B07D9YM6VL",
        "title": "Gaiam Essentials Premium Yoga Mat – 72\" x 24\"",
        "category": "focus",
        "image": "https://images-na.ssl-images-amazon.com/images/I/71fgKMfWLuL._AC_SL1500_.jpg",
        "base_rating": 4.7,
        "base_reviews": 45621,
        "badge": "Best Seller",
        "price": "$24.98",
        "features": [
            "Extra-thick 10mm cushioning for joint support",
            "Textured non-slip surface front and back",
            "Lightweight with easy-cinch carry strap",
            "Free from 6P certified phthalates and latex",
            "Available in 12 vibrant colors"
        ],
        "problem": "slipping, joint pain, and distraction during yoga that interrupts the mind-body connection",
        "hook": "Your yoga mat is the foundation of your practice — a poor one breaks the experience entirely.",
        "benefit": "thick cushioning and non-slip grip let you focus entirely on your breath and movement",
        "social_proof": "45k+ verified buyers confirm it's the perfect mat for beginners and seasoned practitioners alike"
    },
    {
        "asin": "B07M63VSKQ",
        "title": "TriggerPoint GRID Foam Roller – Original 13-Inch",
        "category": "energy",
        "image": "https://images-na.ssl-images-amazon.com/images/I/71Qn8DQTHZL._AC_SL1500_.jpg",
        "base_rating": 4.7,
        "base_reviews": 31847,
        "badge": "Top Rated",
        "price": "$36.99",
        "features": [
            "Multi-density exterior replicates a massage therapist's hands",
            "Hollow core construction holds up to 500 lbs",
            "Includes free access to online instructional videos",
            "Compact 13-inch size for targeted muscle relief",
            "Trusted by pro athletes and physical therapists"
        ],
        "problem": "chronic muscle tightness, soreness, and restricted mobility from sedentary modern life",
        "hook": "Tight muscles aren't just an athlete's problem — they're the silent tax of modern sitting culture.",
        "benefit": "penetrates 16mm deep into muscle tissue to flush lactic acid and restore mobility",
        "social_proof": "trusted by NBA and NFL athletes, recommended by physical therapists worldwide"
    },
    {
        "asin": "B08G9NBQS2",
        "title": "Eyejust Blue Light Blocking Glasses – Computer Glasses",
        "category": "sleep",
        "image": "https://images-na.ssl-images-amazon.com/images/I/61KKGxo5W0L._AC_SL1500_.jpg",
        "base_rating": 4.4,
        "base_reviews": 8932,
        "badge": "Best Seller",
        "price": "$49.00",
        "features": [
            "Blocks 100% of blue light 400-450nm",
            "Anti-glare coating reduces eye fatigue",
            "Lightweight TR90 frames – wear all day",
            "Suitable for screens, LED lights, and fluorescent lights",
            "Zero magnification – suitable for all vision types"
        ],
        "problem": "screen-induced melatonin suppression making it hard to fall and stay asleep",
        "hook": "Every evening screen session tells your brain it's high noon — blue light blocking fixes that.",
        "benefit": "blocks 100% of the most sleep-disrupting blue wavelengths to restore natural melatonin production",
        "social_proof": "thousands of customers report falling asleep faster and sleeping deeper from the very first night"
    },
    {
        "asin": "B07ZNQF8BD",
        "title": "Theragun Mini Percussive Therapy Massage Device",
        "category": "energy",
        "image": "https://images-na.ssl-images-amazon.com/images/I/61NnHWFnoxL._AC_SL1500_.jpg",
        "base_rating": 4.6,
        "base_reviews": 19283,
        "badge": "Top Rated",
        "price": "$149.00",
        "features": [
            "3 speeds: 1750, 2100, and 2400 PPM",
            "Whisper-quiet QuietForce Technology",
            "Compact and lightweight – fits in a purse or gym bag",
            "150-minute battery life (3x 50-min. sessions)",
            "Ergonomic triangle handle for easy self-treatment"
        ],
        "problem": "days of soreness and limited movement after exercise or long desk sessions",
        "hook": "Muscle soreness used to mean days of waiting — Theragun changes that in 60 seconds per muscle group.",
        "benefit": "professional-grade percussive therapy that accelerates recovery dramatically faster than rest alone",
        "social_proof": "used by NBA and NFL athletes, now compact enough for everyone to carry everywhere"
    }
]


# ──────────────────────────────────────────
# DESCRIPTION GENERATOR
# ──────────────────────────────────────────

def generate_description(product: dict) -> str:
    """
    Generate a persuasive, conversion-focused product description.
    Structure: Problem → Emotional hook → Solution → Benefits → Social proof.
    """
    templates = [
        (
            "Are you {problem}? You're not alone — it's one of the most common wellness challenges people face today. "
            "{hook} "
            "The {short_title} was engineered to solve this exact problem. "
            "By delivering {benefit}, it creates the kind of meaningful daily improvement that compounds over time. "
            "And the results speak for themselves: {social_proof}. "
            "Whether you're just starting your wellness journey or optimizing an already solid routine, "
            "this is one of those tools you'll wonder how you ever lived without."
        ),
        (
            "If you're {problem}, science and thousands of real-world users agree: you need the right tools. "
            "{hook} "
            "That's exactly why the {short_title} has become a staple in the routines of wellness-focused people everywhere. "
            "Its core promise is simple: {benefit}. "
            "The community of users has spoken, and {social_proof}. "
            "Don't just take our word for it — the ratings and volume of reviews tell the whole story."
        ),
        (
            "The modern world has made {problem} almost unavoidable. "
            "{hook} "
            "The {short_title} exists to turn that around. "
            "Designed specifically to deliver {benefit}, it addresses the root cause rather than the symptoms. "
            "Here's what the evidence shows: {social_proof}. "
            "If you're ready to take your wellness seriously, this is exactly where to start."
        )
    ]

    template   = random.choice(templates)
    short_title = product["title"].split("–")[0].strip()

    return template.format(
        problem     = product.get("problem", "seeking better wellness"),
        hook        = product.get("hook", ""),
        short_title = short_title,
        benefit     = product.get("benefit", "meaningful wellness improvements"),
        social_proof= product.get("social_proof", "thousands of satisfied customers"),
    )


# ──────────────────────────────────────────
# SIMULATE LIVE DATA UPDATE
# (Replace with real Amazon PA-API calls when ready)
# ──────────────────────────────────────────

def simulate_live_data(product: dict) -> dict:
    """
    Simulate small daily fluctuations in ratings & reviews
    to mimic a live data feed. Replace with real API calls
    when Amazon PA-API credentials are configured.
    """
    # Small random review count increase (0–50 new reviews per day)
    review_delta = random.randint(0, 50)
    new_reviews  = product["base_reviews"] + review_delta

    # Tiny rating fluctuation (±0.1 max, clamped 1–5)
    rating_delta = random.uniform(-0.05, 0.05)
    new_rating   = round(max(1.0, min(5.0, product["base_rating"] + rating_delta)), 1)

    return {
        **product,
        "rating":  new_rating,
        "reviews": new_reviews,
    }


# ──────────────────────────────────────────
# OPTIONAL: Real Amazon PA-API Integration
# Uncomment and configure to use live data
# ──────────────────────────────────────────

# from paapi5_python_sdk.api.default_api import DefaultApi
# from paapi5_python_sdk.models.partner_type import PartnerType
# from paapi5_python_sdk.models.get_items_request import GetItemsRequest
# from paapi5_python_sdk.models.get_items_resource import GetItemsResource
#
# def fetch_amazon_data(asins: list) -> dict:
#     """Fetch live product data from Amazon PA-API 5.0"""
#     client = DefaultApi(
#         access_key  = os.environ.get("AMAZON_ACCESS_KEY"),
#         secret_key  = os.environ.get("AMAZON_SECRET_KEY"),
#         host        = "webservices.amazon.com",
#         region      = "us-east-1"
#     )
#     request = GetItemsRequest(
#         partner_tag   = AFFILIATE_TAG,
#         partner_type  = PartnerType.ASSOCIATES,
#         marketplace   = "www.amazon.com",
#         item_ids      = asins,
#         resources     = [
#             GetItemsResource.ITEMINFO_TITLE,
#             GetItemsResource.OFFERS_LISTINGS_PRICE,
#             GetItemsResource.CUSTOMERREVIEWS_STARRATING,
#             GetItemsResource.CUSTOMERREVIEWS_COUNT,
#             GetItemsResource.IMAGES_PRIMARY_LARGE,
#         ]
#     )
#     response = client.get_items(request)
#     results  = {}
#     if response.items_result:
#         for item in response.items_result.items:
#             results[item.asin] = {
#                 "rating":  float(item.customer_reviews.star_rating.value) if item.customer_reviews else None,
#                 "reviews": int(item.customer_reviews.count)               if item.customer_reviews else None,
#                 "price":   item.offers.listings[0].price.display_amount   if item.offers else None,
#                 "image":   item.images.primary.large.url                  if item.images else None,
#             }
#     return results


# ──────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────

def build_products() -> list:
    """Build the final products list with updated data and descriptions."""
    products = []
    today    = datetime.date.today().isoformat()

    for p in PRODUCT_CATALOG:
        updated = simulate_live_data(p)

        product_entry = {
            "asin":                 updated["asin"],
            "title":                updated["title"],
            "category":             updated["category"],
            "image":                updated["image"],
            "rating":               updated["rating"],
            "reviews":              updated["reviews"],
            "badge":                updated.get("badge", ""),
            "price":                updated.get("price", ""),
            "features":             updated["features"],
            "generated_description": generate_description(updated),
            "last_updated":         today,
            "affiliate_link":       AMAZON_BASE.format(asin=updated["asin"]),
        }
        products.append(product_entry)
        print(f"  ✓ {product_entry['title'][:55]}…  ★{product_entry['rating']}  ({product_entry['reviews']:,} reviews)")

    return products


def main():
    print("=" * 60)
    print("  Restio Wellness — Product Updater")
    print(f"  Running: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    products = build_products()

    # Ensure output directory exists
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)

    # Write JSON
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(products, f, ensure_ascii=False, indent=2)

    print("\n" + "=" * 60)
    print(f"  ✅ Saved {len(products)} products to {OUTPUT_PATH}")
    print("=" * 60)


if __name__ == "__main__":
    main()
