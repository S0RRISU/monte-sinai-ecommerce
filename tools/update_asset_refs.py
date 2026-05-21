from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from pathlib import Path
from typing import Iterable


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MANIFEST = ROOT / "assets" / "generated" / "v2" / "manifest.json"
PUBLIC_BASE_URL = "https://monte-sinai.netlify.app/"

ASSET_REF_RE = re.compile(
    r"(?P<path>(?:https://monte-sinai\.netlify\.app/|/|\.\./)?assets/[^\"'<>)]*?\.(?:png|jpe?g|webp|svg|gif|ico))",
    re.IGNORECASE,
)

SEED_ROW_RE = re.compile(
    r"\('(?P<name>(?:[^']|'')*)',\s*(?P<price>[0-9]+(?:\.[0-9]+)?),\s*'(?P<image>(?:[^']|'')*)',",
    re.IGNORECASE,
)

SPECIAL_SEED_MATCHES = [
    ("gas de cozinha", "gas-p13"),
    ("agua mineral", "agua-mineral-20l"),
    ("alcool perfumado", "alcool-perfumado"),
    ("amaciante", "amaciante-2l"),
    ("candida colorida", "candida-colorida"),
    ("candida", "candida-2l"),
    ("cloro 1l", "cloro-1l"),
    ("cloro 2l", "cloro-2l"),
    ("detergente", "detergente-2l"),
    ("desinfetante", "desinfetante-2l"),
    ("limpa aluminio", "limpa-aluminio"),
    ("limpa pedra 500", "limpa-pedra-500ml"),
    ("limpa pedra", "limpa-pedra-2l"),
    ("sabao de coco", "sabao-coco"),
    ("sabao omo", "sabao-omo"),
    ("sabonete liquido", "sabonete-liquido"),
    ("escova de roupa", "escova-roupa"),
    ("escova de vaso", "escova-vaso"),
    ("esponja de aco", "esponja-aco"),
    ("esponja de louca", "esponja-louca"),
    ("esponjao", "esponjao"),
    ("bombril", "bombril"),
    ("pasta de brilho", "pasta-brilho"),
    ("pedra de vaso", "pedra-vaso"),
    ("prendedor de madeira", "prendedor-madeira"),
    ("prendedor plastico", "prendedor-plastico"),
    ("rodinho", "rodinho-pia"),
    ("rodo grande", "rodo-grande"),
    ("rodo pequeno", "rodo-pequeno"),
    ("saco de lixo", "saco-lixo"),
    ("vassoura", "vassoura"),
    ("pa", "pa"),
]


def normalize(value: str) -> str:
    text = unicodedata.normalize("NFD", value or "")
    text = "".join(char for char in text if unicodedata.category(char) != "Mn")
    text = re.sub(r"[^a-z0-9]+", " ", text.lower())
    return re.sub(r"\s+", " ", text).strip()


def slash(path: str | Path) -> str:
    return str(path).replace("\\", "/")


def load_assets(manifest_path: Path) -> list[dict[str, str]]:
    raw = json.loads(manifest_path.read_text(encoding="utf-8"))
    assets = raw.get("assets", [])
    if not isinstance(assets, list):
        raise ValueError("manifest.json precisa conter uma lista em assets.")
    return [asset for asset in assets if isinstance(asset, dict)]


def default_files() -> list[Path]:
    files: list[Path] = []
    files.append(ROOT / "index.html")
    files.extend(sorted((ROOT / "pages").glob("*.html")))
    files.extend(sorted((ROOT / "css").glob("*.css")))
    files.extend(sorted((ROOT / "js").glob("*.js")))
    files.extend([
        ROOT / "site.webmanifest",
        ROOT / "sw.js",
        ROOT / "supabase" / "seed-produtos.sql",
    ])
    return [path for path in files if path.exists()]


def prefixed_pairs(old_path: str, new_path: str) -> Iterable[tuple[str, str]]:
    if not old_path or not new_path:
        return
    old_path = slash(old_path).lstrip("/")
    new_path = slash(new_path).lstrip("/")
    yield old_path, new_path
    yield f"../{old_path}", f"../{new_path}"
    yield f"/{old_path}", f"/{new_path}"
    yield f"{PUBLIC_BASE_URL}{old_path}", f"{PUBLIC_BASE_URL}{new_path}"


def manifest_replacements(assets: list[dict[str, str]]) -> list[tuple[str, str]]:
    pairs: list[tuple[str, str]] = []
    for asset in assets:
      old_path = slash(asset.get("old_path", ""))
      new_path = slash(asset.get("new_path", ""))
      pairs.extend(prefixed_pairs(old_path, new_path))

      site_path = slash(asset.get("site_path", ""))
      if old_path.startswith("assets/produtos/") and site_path:
          old_site = old_path.replace("assets/produtos/", "assets/produtos/site/", 1)
          pairs.extend(prefixed_pairs(old_site, site_path))

    seen: set[tuple[str, str]] = set()
    unique: list[tuple[str, str]] = []
    for pair in pairs:
        if pair[0] == pair[1] or pair in seen:
            continue
        seen.add(pair)
        unique.append(pair)
    return sorted(unique, key=lambda pair: len(pair[0]), reverse=True)


def product_assets(assets: list[dict[str, str]]) -> dict[str, dict[str, str]]:
    return {
        asset.get("slug", ""): asset
        for asset in assets
        if asset.get("slug") and asset.get("new_path", "").startswith("assets/produtos/")
    }


def seed_asset_for_name(name: str, products: dict[str, dict[str, str]]) -> dict[str, str] | None:
    normalized_name = normalize(name)
    for needle, slug in SPECIAL_SEED_MATCHES:
        if needle in normalized_name and slug in products:
            return products[slug]

    for slug, asset in products.items():
        asset_name = normalize(asset.get("nome", ""))
        if asset_name and asset_name in normalized_name:
            return asset
        slug_words = normalize(slug)
        if slug_words and all(word in normalized_name for word in slug_words.split()[:2]):
            return asset
    return None


def update_seed_images(content: str, assets: list[dict[str, str]]) -> str:
    products = product_assets(assets)
    if not products:
        return content

    def replace(match: re.Match[str]) -> str:
        asset = seed_asset_for_name(match.group("name").replace("''", "'"), products)
        if not asset:
            return match.group(0)
        image = slash(asset.get("new_path", ""))
        return f"('{match.group('name')}', {match.group('price')}, '{image}',"

    return SEED_ROW_RE.sub(replace, content)


def rewrite_content(path: Path, content: str, assets: list[dict[str, str]], pairs: list[tuple[str, str]]) -> str:
    updated = content
    for old, new in pairs:
        updated = updated.replace(old, new)

    if slash(path.relative_to(ROOT)) == "supabase/seed-produtos.sql":
        updated = update_seed_images(updated, assets)
    return updated


def local_asset_path(ref: str) -> Path | None:
    clean = ref.strip()
    if clean.startswith(PUBLIC_BASE_URL):
        clean = clean[len(PUBLIC_BASE_URL):]
    clean = clean.lstrip("/")
    while clean.startswith("../"):
        clean = clean[3:]
    if not clean.startswith("assets/"):
        return None
    return ROOT / clean


def find_missing_asset_refs(files: Iterable[Path]) -> list[tuple[Path, str]]:
    missing: list[tuple[Path, str]] = []
    for path in files:
        text = path.read_text(encoding="utf-8", errors="ignore")
        for match in ASSET_REF_RE.finditer(text):
            ref = match.group("path")
            local = local_asset_path(ref)
            if local and not local.exists():
                missing.append((path, ref))
    return missing


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Atualiza referencias de assets usando assets/generated/v2/manifest.json.")
    parser.add_argument("--manifest", default=str(DEFAULT_MANIFEST), help="Caminho do manifest de assets.")
    parser.add_argument("--write", action="store_true", help="Grava as alteracoes. Sem isso, roda em dry-run.")
    parser.add_argument("--check", action="store_true", help="Falha se encontrar referencias de assets inexistentes.")
    parser.add_argument("--file", action="append", dest="files", help="Arquivo especifico para processar. Pode repetir.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    manifest_path = (ROOT / args.manifest).resolve() if not Path(args.manifest).is_absolute() else Path(args.manifest)
    assets = load_assets(manifest_path)
    pairs = manifest_replacements(assets)
    files = [ROOT / item for item in args.files] if args.files else default_files()
    files = [path.resolve() for path in files if path.exists()]

    changed: list[Path] = []
    for path in files:
        before = path.read_text(encoding="utf-8", errors="ignore")
        after = rewrite_content(path, before, assets, pairs)
        if after == before:
            continue
        changed.append(path)
        if args.write:
            path.write_text(after, encoding="utf-8", newline="")

    if args.write:
        print(f"Arquivos atualizados: {len(changed)}")
    else:
        print(f"Dry-run: {len(changed)} arquivo(s) seriam atualizados.")
    for path in changed:
        print(f" - {slash(path.relative_to(ROOT))}")

    missing = find_missing_asset_refs(files)
    if missing:
        print("\nReferencias de assets inexistentes:")
        for path, ref in missing:
            print(f" - {slash(path.relative_to(ROOT))}: {ref}")
        if args.check:
            return 1
    elif args.check:
        print("Nenhuma referencia de asset quebrada encontrada.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
