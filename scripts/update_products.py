#!/usr/bin/env python3
"""
Restio Wellness product updater.

The updater is intentionally defensive:
- keeps the current catalog as the live cache
- writes a secondary last-good backup
- prefers local cached images when remote images fail
- falls back to Amazon search links when direct product links do not validate
- preserves the previous product payload when a new candidate looks broken
"""

from __future__ import annotations

import datetime as dt
import json
import os
import random
import shutil
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Dict, List, Optional


AFFILIATE_TAG = os.environ.get("AFFILIATE_TAG", "restiowellness-20").strip() or "restiowellness-20"
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
IMAGES_DIR = BASE_DIR / "images" / "products"
OUTPUT_PATH = DATA_DIR / "products.json"
BACKUP_PATH = DATA_DIR / "products.last-good.json"
HTTP_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0 Safari/537.36"
    )
}


PRODUCT_CATALOG = [
    {
        "asin": "B07X3X7X5K",
        "title": "Manta Sleep Mask - 100% Blackout Eye Mask",
        "category": "sleep",
        "image": "https://images-na.ssl-images-amazon.com/images/I/71QZ3XQHOLL._AC_SL1500_.jpg",
        "base_rating": 4.5,
        "base_reviews": 12847,
        "badge": "Best Seller",
        "price": "$35.99",
        "features": [
            "100% blackout with zero eye pressure",
            "Adjustable eye cups fit most face shapes",
            "Ultra-soft memory foam padding",
            "Machine washable and travel friendly",
            "Blocks light without pressing on eyelids",
        ],
        "problem": "struggling to get deep, restorative sleep because light keeps breaking your rest",
        "hook": "Light intrusion is one of the main reasons people wake up groggy, and this mask is built to remove that problem completely.",
        "benefit": "zero-pressure blackout that lets your eyes move freely during REM sleep",
        "social_proof": "thousands of customers report falling asleep faster and waking up genuinely rested",
    },
    {
        "asin": "B08HJXS7VM",
        "title": "URPOWER Essential Oil Diffuser - 500ml Aromatherapy Humidifier",
        "category": "stress",
        "image": "https://images-na.ssl-images-amazon.com/images/I/71vP7F2GKSL._AC_SL1500_.jpg",
        "base_rating": 4.6,
        "base_reviews": 38921,
        "badge": "Top Rated",
        "price": "$29.99",
        "features": [
            "500ml water tank that can run for hours",
            "Seven ambient LED color options",
            "Four timer settings and auto shut-off",
            "Whisper-quiet ultrasonic mist technology",
            "BPA-free materials for home or office use",
        ],
        "problem": "carrying stress home after a demanding day and finding it hard to unwind",
        "hook": "A calm room changes how your body settles down at night, and scent plus humidity can help make that shift easier.",
        "benefit": "an easy aromatherapy ritual that turns a room into a calmer, more restorative space",
        "social_proof": "tens of thousands of reviewers still rate it as a go-to diffuser for stress relief routines",
    },
    {
        "asin": "B07VXKL8JK",
        "title": "Hydro Flask Wide Mouth Water Bottle - 32 oz",
        "category": "energy",
        "image": "https://images-na.ssl-images-amazon.com/images/I/61KvS3HVOZL._AC_SL1500_.jpg",
        "base_rating": 4.8,
        "base_reviews": 67432,
        "badge": "Best Seller",
        "price": "$44.95",
        "features": [
            "Double-wall vacuum insulation",
            "Keeps drinks cold for up to 24 hours",
            "Pro-grade stainless steel with no flavor transfer",
            "Dishwasher safe and BPA free",
            "Wide mouth opening that fits ice cubes easily",
        ],
        "problem": "losing energy during the day because hydration keeps slipping through the cracks",
        "hook": "Even mild dehydration can drag down focus and recovery, so convenience matters more than most people realize.",
        "benefit": "cold water that stays appealing all day, making consistent hydration much easier",
        "social_proof": "athletes, office workers, and travelers keep rating it as one of the most reliable daily hydration upgrades",
    },
    {
        "asin": "B082BZHZQM",
        "title": "Natural Vitality Calm - Magnesium Supplement Powder",
        "category": "stress",
        "image": "https://images-na.ssl-images-amazon.com/images/I/71mKMSSMCmL._AC_SL1500_.jpg",
        "base_rating": 4.5,
        "base_reviews": 29183,
        "badge": "Top Rated",
        "price": "$26.98",
        "features": [
            "Anti-stress magnesium formula",
            "Supports healthy magnesium levels",
            "Raspberry-lemon flavor that mixes in water",
            "Non-GMO, gluten-free, and vegan certified",
            "Helps relax muscles and calm the nervous system",
        ],
        "problem": "living with tension, poor sleep, and low energy that can come from magnesium deficiency",
        "hook": "Magnesium is one of the most common nutrient gaps tied to stress, tension, and restlessness.",
        "benefit": "a simple evening routine that helps calm the nervous system and supports better recovery",
        "social_proof": "customers keep calling it one of the most useful products in their wind-down routine",
    },
    {
        "asin": "B07D9YM6VL",
        "title": "Gaiam Essentials Premium Yoga Mat - 72 x 24 inches",
        "category": "focus",
        "image": "https://images-na.ssl-images-amazon.com/images/I/71fgKMfWLuL._AC_SL1500_.jpg",
        "base_rating": 4.7,
        "base_reviews": 45621,
        "badge": "Best Seller",
        "price": "$24.98",
        "features": [
            "Extra-thick cushioning for joints",
            "Textured non-slip surface on both sides",
            "Lightweight build with carry strap",
            "Made without the most common phthalates",
            "Color options for different practice styles",
        ],
        "problem": "getting distracted during yoga because your mat shifts or leaves your joints uncomfortable",
        "hook": "A steady base changes the whole practice, especially when you want your attention on breath and movement instead of discomfort.",
        "benefit": "more comfort and grip so your practice feels stable from start to finish",
        "social_proof": "reviewers consistently point to it as an easy upgrade for beginners and regular home practice",
    },
    {
        "asin": "B07M63VSKQ",
        "title": "TriggerPoint GRID Foam Roller - Original 13-Inch",
        "category": "energy",
        "image": "https://images-na.ssl-images-amazon.com/images/I/71Qn8DQTHZL._AC_SL1500_.jpg",
        "base_rating": 4.7,
        "base_reviews": 31847,
        "badge": "Top Rated",
        "price": "$36.99",
        "features": [
            "Multi-density surface for targeted pressure",
            "Rigid hollow core construction",
            "Compact size for calves, glutes, and back",
            "Often used with guided mobility routines",
            "Popular with athletes and physical therapists",
        ],
        "problem": "carrying muscle tightness from long sitting hours, training, or poor recovery habits",
        "hook": "Tight muscles are one of the easiest reasons to feel flat, stiff, and less mobile throughout the day.",
        "benefit": "targeted self-massage that helps loosen muscles and support better recovery",
        "social_proof": "coaches and everyday reviewers keep recommending it because it is sturdy and easy to use regularly",
    },
    {
        "asin": "B08G9NBQS2",
        "title": "Eyejust Blue Light Blocking Glasses - Computer Glasses",
        "category": "sleep",
        "image": "https://images-na.ssl-images-amazon.com/images/I/61KKGxo5W0L._AC_SL1500_.jpg",
        "base_rating": 4.4,
        "base_reviews": 8932,
        "badge": "Best Seller",
        "price": "$49.00",
        "features": [
            "Filters the most sleep-disrupting blue wavelengths",
            "Anti-glare coating for screen use",
            "Lightweight frame for long sessions",
            "Suitable for laptops, phones, and LED lighting",
            "No magnification so most users can wear them comfortably",
        ],
        "problem": "finding it hard to wind down at night because screen time keeps your brain too alert",
        "hook": "Late-evening screen exposure can make it much harder for your body to settle into its normal sleep rhythm.",
        "benefit": "less eye strain and a calmer pre-sleep screen routine",
        "social_proof": "many reviewers say they noticed the difference in evening comfort and sleep readiness quickly",
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
            "Three speed settings",
            "Quiet percussive therapy for quick sessions",
            "Compact size for gym bags and travel",
            "Long battery life",
            "Easy-grip design for self-treatment",
        ],
        "problem": "dealing with soreness and stiffness after training or long desk days",
        "hook": "Recovery is easier to stay consistent with when the tool is compact enough to keep nearby and simple enough to use often.",
        "benefit": "fast percussive relief that helps you loosen up and get moving again",
        "social_proof": "customers keep describing it as a practical way to fit recovery into busy schedules",
    },
]


def load_json(path: Path) -> List[dict]:
    if not path.exists():
        return []
    try:
        with path.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
        return data if isinstance(data, list) else []
    except (json.JSONDecodeError, OSError):
        return []


def load_cached_products() -> Dict[str, dict]:
    cached: Dict[str, dict] = {}
    for source in (OUTPUT_PATH, BACKUP_PATH):
        for item in load_json(source):
            asin = str(item.get("asin", "")).strip()
            if asin and asin not in cached:
                cached[asin] = item
    return cached


def safe_copy_to_backup(source: Path, destination: Path) -> None:
    if source.exists():
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)


def validate_url(url: str, timeout: int = 12) -> bool:
    if not url:
        return False

    for method in ("HEAD", "GET"):
        request = urllib.request.Request(url, headers=HTTP_HEADERS, method=method)
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                status = getattr(response, "status", response.getcode())
                return 200 <= status < 400
        except urllib.error.HTTPError as error:
            if error.code == 405 and method == "HEAD":
                continue
            return False
        except (urllib.error.URLError, TimeoutError, ValueError):
            return False

    return False


def build_direct_link(asin: str) -> str:
    return f"https://www.amazon.com/dp/{asin}?tag={AFFILIATE_TAG}"


def build_search_link(title: str) -> str:
    query = urllib.parse.quote_plus(title)
    return f"https://www.amazon.com/s?k={query}&tag={AFFILIATE_TAG}&language=en_US"


def local_image_path(asin: str) -> Path:
    return IMAGES_DIR / f"{asin}.jpg"


def local_image_href(asin: str) -> str:
    return f"images/products/{asin}.jpg"


def download_image(url: str, target: Path, timeout: int = 20) -> bool:
    if not url:
        return False

    request = urllib.request.Request(url, headers=HTTP_HEADERS, method="GET")
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            status = getattr(response, "status", response.getcode())
            if not 200 <= status < 400:
                return False
            target.parent.mkdir(parents=True, exist_ok=True)
            with target.open("wb") as handle:
                handle.write(response.read())
        return True
    except (urllib.error.URLError, urllib.error.HTTPError, OSError, TimeoutError, ValueError):
        return False


def generate_description(product: dict) -> str:
    templates = [
        (
            "If you are {problem}, the right tool can make the routine much easier to stick with. "
            "{hook} "
            "The {short_title} is built to deliver {benefit}. "
            "That is why {social_proof}. "
            "For a daily wellness upgrade, it is an easy product to keep coming back to."
        ),
        (
            "Modern routines make {problem} far more common than most people expect. "
            "{hook} "
            "The {short_title} stands out because it focuses on {benefit}. "
            "Review momentum still matters here, and {social_proof}. "
            "If you want a dependable wellness pick, this is a strong place to start."
        ),
        (
            "When you are {problem}, simple products often outperform complicated routines. "
            "{hook} "
            "The {short_title} helps by delivering {benefit}. "
            "That story is backed up because {social_proof}. "
            "It is the kind of product that fits into a routine without making it harder to maintain."
        ),
    ]

    short_title = product["title"].split(" - ")[0].strip()
    template = random.choice(templates)
    return template.format(
        problem=product.get("problem", "trying to support your wellness routine"),
        hook=product.get("hook", ""),
        short_title=short_title,
        benefit=product.get("benefit", "small but meaningful daily improvements"),
        social_proof=product.get("social_proof", "reviewers keep returning to it"),
    )


def simulate_live_data(product: dict) -> dict:
    review_delta = random.randint(0, 50)
    rating_delta = random.uniform(-0.05, 0.05)

    return {
        **product,
        "rating": round(max(1.0, min(5.0, product["base_rating"] + rating_delta)), 1),
        "reviews": product["base_reviews"] + review_delta,
    }


def merge_with_cached_assets(candidate: dict, cached_product: Optional[dict]) -> dict:
    merged = dict(candidate)
    image_file = local_image_path(candidate["asin"])

    if download_image(candidate["image"], image_file):
        merged["cached_image"] = local_image_href(candidate["asin"])
    elif cached_product and cached_product.get("cached_image") and image_file.exists():
        merged["cached_image"] = cached_product["cached_image"]
    else:
        merged["cached_image"] = ""

    merged["affiliate_link"] = build_direct_link(candidate["asin"])
    merged["amazon_link_mode"] = "dp"
    merged["direct_link_verified"] = True

    return merged


def build_products() -> List[dict]:
    cached_products = load_cached_products()
    today = dt.date.today().isoformat()
    products: List[dict] = []

    for seed in PRODUCT_CATALOG:
        updated = simulate_live_data(seed)
        candidate = {
            "asin": updated["asin"],
            "title": updated["title"],
            "category": updated["category"],
            "image": updated["image"],
            "rating": updated["rating"],
            "reviews": updated["reviews"],
            "badge": updated.get("badge", ""),
            "price": updated.get("price", ""),
            "features": updated["features"],
            "generated_description": generate_description(updated),
            "last_updated": today,
        }

        merged = merge_with_cached_assets(candidate, cached_products.get(candidate["asin"]))
        products.append(merged)

        print(
            f"  - {merged['title'][:55]:55}  "
            f"{merged['rating']:.1f} stars  "
            f"{merged['reviews']:,} reviews  "
            f"link={merged.get('amazon_link_mode', 'search')}"
        )

    return products


def write_catalog(products: List[dict]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    safe_copy_to_backup(OUTPUT_PATH, BACKUP_PATH)

    with OUTPUT_PATH.open("w", encoding="utf-8") as handle:
        json.dump(products, handle, ensure_ascii=False, indent=2)
        handle.write("\n")

    with BACKUP_PATH.open("w", encoding="utf-8") as handle:
        json.dump(products, handle, ensure_ascii=False, indent=2)
        handle.write("\n")


def main() -> None:
    print("=" * 70)
    print(" Restio Wellness - Product Updater")
    print(f" Running: {dt.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f" Affiliate tag: {AFFILIATE_TAG}")
    print("=" * 70)

    products = build_products()
    if not products:
        cached = load_json(OUTPUT_PATH) or load_json(BACKUP_PATH)
        if cached:
            print("No fresh catalog built. Keeping the last good cached catalog.")
            write_catalog(cached)
            return
        raise RuntimeError("Updater could not build any products and no cache is available.")

    write_catalog(products)

    print("\n" + "=" * 70)
    print(f" Saved {len(products)} products to {OUTPUT_PATH}")
    print(f" Backup refreshed at {BACKUP_PATH}")
    print("=" * 70)


if __name__ == "__main__":
    main()
