#!/usr/bin/env python3
import json
import os
import sys
import time
import urllib.parse
import urllib.request
import urllib.error

ARTWORKS = [
    {
        "title": "Mona Lisa",
        "source_file": "Mona Lisa.jpg",
        "target": "mona_lisa.jpg",
    },
    {
        "title": "The Starry Night",
        "source_file": "Vincent van Gogh Starry Night.jpg",
        "target": "the_starry_night.jpg",
    },
    {
        "title": "The Night Watch",
        "source_file": "The Night Watch - HD.jpg",
        "target": "the_night_watch.jpg",
    },
    {
        "title": "The Birth of Venus",
        "source_file": "El nacimiento de Venus, por Sandro Botticelli.jpg",
        "target": "the_birth_of_venus.jpg",
    },
    {
        "title": "The Creation of Adam",
        "source_file": "The Creation of Adam by Michelangelo.JPG",
        "target": "the_creation_of_adam.jpg",
    },
    {
        "title": "The School of Athens",
        "source_file": "The School of Athens by Raffaello Sanzio da Urbino.jpg",
        "target": "the_school_of_athens.jpg",
    },
    {
        "title": "Girl with a Pearl Earring",
        "source_file": "1665 Girl with a Pearl Earring.jpg",
        "target": "girl_with_a_pearl_earring.jpg",
    },
    {
        "title": "The Scream",
        "source_file": "Edvard Munch, 1893, The Scream, oil, tempera and pastel on cardboard, 91 x 73 cm, National Gallery of Norway.jpg",
        "target": "the_scream.jpg",
    },
    {
        "title": "American Gothic",
        "source_file": "Grant Wood - American Gothic (1930).jpg",
        "target": "american_gothic.jpg",
    },
    {
        "title": "The Last Supper",
        "source_file": "Leonardo da Vinci (1452-1519) - The Last Supper (1495-1498).jpg",
        "target": "the_last_supper.jpg",
    },
    {
        "title": "Sistine Chapel Ceiling",
        "source_file": "Sistine Chapel Ceiling by Michelangelo (48466107736).jpg",
        "target": "sistine_ceiling.jpg",
    },
]

API_URL = "https://commons.wikimedia.org/w/api.php"
USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) VRGallery/1.0 Safari/537.36"
MAX_RETRIES = 8
BASE_DELAY = 4.0


def open_url(url: str):
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "*/*",
        },
    )
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            return urllib.request.urlopen(request)
        except urllib.error.HTTPError as exc:
            if exc.code in (429, 503):
                retry_after = exc.headers.get("Retry-After")
                if retry_after:
                    try:
                        delay = float(retry_after)
                    except ValueError:
                        delay = BASE_DELAY * attempt
                else:
                    delay = BASE_DELAY * attempt
                delay += (attempt % 3) * 1.3
                print(f"  Rate limited ({exc.code}). Waiting {delay:.1f}s...")
                time.sleep(delay)
                continue
            raise


def fetch_file_url(source_file: str) -> str:
    params = {
        "action": "query",
        "titles": f"File:{source_file}",
        "prop": "imageinfo",
        "iiprop": "url",
        "iiurlwidth": 4096,
        "format": "json",
    }
    url = API_URL + "?" + urllib.parse.urlencode(params)
    with open_url(url) as response:
        payload = json.loads(response.read().decode("utf-8"))

    pages = payload.get("query", {}).get("pages", {})
    page = next(iter(pages.values()), {})
    imageinfo = page.get("imageinfo")
    if not imageinfo:
        raise RuntimeError(f"No imageinfo for {source_file}")
    info = imageinfo[0]
    return info.get("thumburl") or info["url"]


def download(url: str, dest: str) -> None:
    with open_url(url) as response, open(dest, "wb") as f:
        total = response.length
        downloaded = 0
        while True:
            chunk = response.read(1024 * 1024)
            if not chunk:
                break
            f.write(chunk)
            downloaded += len(chunk)
            if total:
                pct = downloaded / total * 100
                print(f"  {pct:5.1f}%", end="\r", flush=True)
    print("  done")


def main() -> int:
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    assets_dir = os.path.join(base_dir, "assets")
    os.makedirs(assets_dir, exist_ok=True)

    only = None
    if len(sys.argv) > 1:
        only = " ".join(sys.argv[1:]).strip().lower()

    for index, art in enumerate(ARTWORKS, start=1):
        if only and only not in (art["title"].lower(), art["target"].lower()):
            continue
        target_path = os.path.join(assets_dir, art["target"])
        if os.path.exists(target_path):
            print(f"Skipping {art['title']} (already exists)")
            continue

        print(f"Downloading {art['title']}...")
        try:
            url = fetch_file_url(art["source_file"])
            download(url, target_path)
        except Exception as exc:
            print(f"  Failed: {exc}")
        time.sleep(1.2 + (index % 3) * 0.6)

    print("Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
