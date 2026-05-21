from __future__ import annotations

import argparse
import base64
import json
import os
import re
import shutil
import socket
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen

try:
    import requests
except Exception:  # pragma: no cover - optional dependency
    requests = None

try:
    from tqdm import tqdm

    HAS_TQDM = True
except Exception:  # pragma: no cover - optional dependency
    HAS_TQDM = False

try:
    from PIL import Image, ImageDraw, ImageOps, ImageFilter, ImageEnhance

    HAS_PIL = True
except Exception:  # pragma: no cover - optional dependency
    HAS_PIL = False


ROOT = Path(__file__).resolve().parent
PRODUCT_DIR = ROOT / "assets" / "produtos"
SITE_PRODUCT_DIR = PRODUCT_DIR / "site"
TMP_DIR = ROOT / "tmp" / "product-imagegen"
GENERATED_V2_DIR = ROOT / "assets" / "generated" / "v2"
PRODUCT_V2_DIR = PRODUCT_DIR / "v2"
SITE_PRODUCT_V2_DIR = SITE_PRODUCT_DIR / "v2"
ASSET_MANIFEST = GENERATED_V2_DIR / "manifest.json"

DEFAULT_PROMPT = "water gallon 20 liters, professional studio photography, clean white background"
DEFAULT_OUTPUT_BASE = "foto_produto"
DEFAULT_TIMEOUT = 60
DEFAULT_RETRIES = 3
DEFAULT_BACKOFF = 1.0
DEFAULT_POLLINATIONS_MODEL = "flux"
DEFAULT_NEGATIVE_PROMPT = (
    "blurry, low quality, low resolution, cropped product, cut off product, deformed shape, distorted object, "
    "extra objects, hands, people, messy background, logo, brand name, readable text, watermark"
)
CHUNK_SIZE = 8192


PRESETS = {
    "3d": "3D render, octane render, highly detailed, photorealistic, studio lighting, soft shadows, ultra realistic, 4k",
    "octane": "Octane render, cinematic, highly detailed, photorealistic",
    "unreal": "Unreal Engine 5 render, cinematic, high detail, photorealistic",
    "clay": "clay render, neutral studio background, soft shadows, product clay mockup",
    "isometric": "isometric 3D render, flat lighting, crisp shadows",
    "product": "product photography, white background, high detail, studio lighting",
    "studio": "professional studio photography, white background, softbox lighting",
}

VIEW_MAP = {
    "front": "front view",
    "side": "side view",
    "back": "rear view",
    "top": "top view",
    "isometric": "isometric view",
    "three_quarter": "3/4 view",
    "three-quarter": "3/4 view",
    "3/4": "3/4 view",
}

PRODUCTS = [
    ("agua-mineral-20l.png", "20 liter mineral water gallon, transparent blue plastic bottle"),
    ("gas-p13.png", "Brazilian P13 kitchen gas cylinder, dark blue metal cylinder"),
    ("alcool-perfumado.png", "small perfumed alcohol cleaning bottle, translucent plastic"),
    ("amaciante-2l.png", "2 liter fabric softener bottle, pastel blue plastic"),
    ("bombril.png", "steel wool cleaning sponge package"),
    ("candida-2l.png", "2 liter bleach bottle, white plastic"),
    ("candida-colorida.png", "2 liter color-safe bleach bottle, white and violet plastic"),
    ("cloro-1l.png", "1 liter chlorine cleaner bottle, white plastic"),
    ("cloro-2l.png", "2 liter chlorine cleaner bottle, white plastic"),
    ("desinfetante-2l.png", "2 liter disinfectant cleaner bottle, green plastic"),
    ("detergente-2l.png", "2 liter liquid detergent bottle, yellow plastic"),
    ("escova-roupa.png", "laundry brush with short handle and bristles"),
    ("escova-vaso.png", "toilet brush with holder"),
    ("esponja-aco.png", "steel scrub sponge bundle"),
    ("esponja-louca.png", "yellow and green dishwashing sponge"),
    ("esponjao.png", "large cleaning sponge block"),
    ("limpa-aluminio.png", "small aluminum cleaner bottle, metallic silver label but no text"),
    ("limpa-pedra-2l.png", "2 liter stone floor cleaner bottle, sturdy plastic"),
    ("limpa-pedra-500ml.png", "500 ml stone cleaner bottle with trigger cap"),
    ("pa.png", "dustpan cleaning tool"),
    ("pasta-brilho.png", "round polishing paste container"),
    ("pedra-vaso.png", "toilet deodorizer block in simple holder"),
    ("prendedor-madeira.png", "wooden clothespins grouped together"),
    ("prendedor-plastico.png", "colorful plastic clothespins grouped together"),
    ("rodinho-pia.png", "small sink squeegee"),
    ("rodo-grande.png", "large floor squeegee with long handle"),
    ("rodo-pequeno.png", "small floor squeegee with handle"),
    ("sabao-coco.png", "2 liter coconut liquid soap bottle, white plastic"),
    ("sabao-omo.png", "2 liter laundry soap bottle, blue plastic, generic unbranded"),
    ("sabonete-liquido.png", "500 ml liquid hand soap pump bottle"),
    ("saco-lixo.png", "roll of black trash bags"),
    ("vassoura.png", "broom with long handle and bristles"),
]

PRODUCT_DETAILS = {
    "agua-mineral-20l.png": ("Agua mineral 20L", "Agua"),
    "gas-p13.png": ("Gas de cozinha P13", "Gas"),
    "alcool-perfumado.png": ("Alcool Perfumado 500ml", "Limpeza"),
    "amaciante-2l.png": ("Amaciante 2L", "Lavanderia"),
    "bombril.png": ("Bombril", "Cozinha"),
    "candida-2l.png": ("Candida 2L", "Limpeza"),
    "candida-colorida.png": ("Candida Colorida 2L", "Limpeza"),
    "cloro-1l.png": ("Cloro 1L", "Limpeza"),
    "cloro-2l.png": ("Cloro 2L", "Limpeza"),
    "desinfetante-2l.png": ("Desinfetante 2L", "Limpeza"),
    "detergente-2l.png": ("Detergente 2L", "Cozinha"),
    "escova-roupa.png": ("Escova de Roupa", "Lavanderia"),
    "escova-vaso.png": ("Escova de Vaso Sanitario", "Banheiro"),
    "esponja-aco.png": ("Esponja de Aco", "Cozinha"),
    "esponja-louca.png": ("Esponja de Louca", "Cozinha"),
    "esponjao.png": ("Esponjao", "Utensilios"),
    "limpa-aluminio.png": ("Limpa Aluminio 500ml", "Cozinha"),
    "limpa-pedra-2l.png": ("Limpa Pedra 2L", "Limpeza"),
    "limpa-pedra-500ml.png": ("Limpa Pedra 500ml", "Limpeza"),
    "pa.png": ("Pa", "Utensilios"),
    "pasta-brilho.png": ("Pasta de Brilho", "Cozinha"),
    "pedra-vaso.png": ("Pedra de Vaso", "Banheiro"),
    "prendedor-madeira.png": ("Prendedor de Madeira", "Organizacao"),
    "prendedor-plastico.png": ("Prendedor Plastico", "Organizacao"),
    "rodinho-pia.png": ("Rodinho de Pia", "Cozinha"),
    "rodo-grande.png": ("Rodo Grande", "Utensilios"),
    "rodo-pequeno.png": ("Rodo Pequeno", "Utensilios"),
    "sabao-coco.png": ("Sabao de Coco 2L", "Lavanderia"),
    "sabao-omo.png": ("Sabao Omo 2L", "Lavanderia"),
    "sabonete-liquido.png": ("Sabonete Liquido 500ml", "Higiene"),
    "saco-lixo.png": ("Saco de Lixo", "Organizacao"),
    "vassoura.png": ("Vassoura", "Utensilios"),
}


def safe_slug(value: str) -> str:
    value = (value or "").strip().lower()
    value = re.sub(r"[^a-z0-9]+", "_", value)
    value = re.sub(r"_+", "_", value).strip("_")
    return value or "img"


def extension_for_content_type(content_type: str) -> str:
    normalized = (content_type or "").lower().strip()
    if normalized in {"jpg", "jpeg"}:
        normalized = "image/jpeg"
    elif normalized in {"png", "webp", "gif", "avif"}:
        normalized = f"image/{normalized}"

    mapping = {
        "image/jpeg": ".jpg",
        "image/jpg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/gif": ".gif",
        "image/svg+xml": ".svg",
        "image/avif": ".avif",
    }
    return mapping.get(normalized, ".jpg")


def build_pollinations_url(
    prompt: str,
    width: int,
    height: int,
    api_base: str,
    seed: int | None = None,
    enhance: bool = False,
    model: str | None = None,
    negative: str | None = None,
    private: bool = False,
) -> str:
    params: dict[str, str] = {
        "width": str(width),
        "height": str(height),
        "nologo": "true",
    }
    if seed is not None:
        params["seed"] = str(seed)
    if enhance:
        params["enhance"] = "true"
    if model:
        params["model"] = model
    if negative:
        params["negative"] = negative
    if private:
        params["private"] = "true"

    base = api_base.rstrip("/")
    return f"{base}/prompt/{quote(prompt.strip())}?{urlencode(params)}"


def product_prompt(description: str, brand_aware: bool = False) -> str:
    if brand_aware:
        return (
            f"{description}, realistic 3D product render, branded-aware packaging when the product name implies a brand, "
            "clean catalog product image, isolated on a pure white studio background, "
            "soft professional lighting, subtle ground shadow, centered, full product visible, "
            "high detail, retail packshot, no watermark"
        )

    return (
        f"generic unbranded {description}, realistic 3D product render, "
        "clean catalog product image, isolated on a pure white studio background, "
        "soft professional lighting, subtle ground shadow, centered, full product visible, "
        "high detail, no brand, no logo, no readable text, no watermark"
    )


def compose_prompt(base: str, style: str | None, view: str | None, variation_index: int | None = None) -> str:
    parts: list[str] = []
    if base:
        parts.append(base.strip())
    if style and style in PRESETS:
        parts.append(PRESETS[style])
    if view:
        parts.append(VIEW_MAP.get(view, view))
    if variation_index is not None:
        parts.append(f"variation {variation_index}")
    return re.sub(r",\s*,+", ", ", ", ".join(parts))


def effective_negative_prompt(args: argparse.Namespace) -> str | None:
    if args.no_negative:
        return None
    return (args.negative or DEFAULT_NEGATIVE_PROMPT).strip() or None


def auth_headers(user_agent: str) -> dict[str, str]:
    headers = {"User-Agent": user_agent}
    api_key = os.getenv("POLLINATIONS_API_KEY", "").strip()
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    return headers


def remove_partial(path: Path | None) -> None:
    if path and path.exists():
        try:
            path.unlink()
        except OSError:
            pass


def download_image(
    url: str,
    output_base: Path,
    show_progress: bool = True,
    retries: int = DEFAULT_RETRIES,
    backoff: float = DEFAULT_BACKOFF,
    timeout: int = DEFAULT_TIMEOUT,
    verbose: bool = False,
) -> tuple[Path, str]:
    last_exception: Exception | None = None
    output_base.parent.mkdir(parents=True, exist_ok=True)

    for attempt in range(1, retries + 1):
        tmp_path: Path | None = None
        try:
            if verbose:
                print(f"Attempt {attempt}/{retries}: GET {url}")

            request = Request(url, headers=auth_headers("MonteSinaiImageGenerator/2.0"))
            with urlopen(request, timeout=timeout) as response:
                content_type = response.headers.get("Content-Type", "").split(";")[0].strip()
                if not content_type.startswith("image/"):
                    preview = response.read(1024).decode("utf-8", errors="replace")
                    raise RuntimeError(f"A API nao retornou uma imagem. Resposta: {preview}")

                ext = extension_for_content_type(content_type)
                final_path = output_base.with_suffix(ext)
                tmp_path = final_path.with_suffix(final_path.suffix + ".tmp")
                total = response.headers.get("Content-Length")
                total_bytes = int(total) if total and total.isdigit() else None

                downloaded = 0
                with open(tmp_path, "wb") as output:
                    if show_progress and HAS_TQDM:
                        with tqdm(total=total_bytes, unit="B", unit_scale=True, desc=final_path.name) as progress:
                            while True:
                                chunk = response.read(CHUNK_SIZE)
                                if not chunk:
                                    break
                                output.write(chunk)
                                downloaded += len(chunk)
                                progress.update(len(chunk))
                    else:
                        while True:
                            chunk = response.read(CHUNK_SIZE)
                            if not chunk:
                                break
                            output.write(chunk)
                            downloaded += len(chunk)
                            if show_progress:
                                if total_bytes:
                                    percent = downloaded * 100.0 / total_bytes
                                    print(
                                        f"\rBaixando {final_path.name}: {percent:.0f}% "
                                        f"({downloaded // 1024}KB/{total_bytes // 1024}KB)",
                                        end="",
                                        flush=True,
                                    )
                                else:
                                    print(f"\rBaixando {final_path.name}: {downloaded // 1024}KB", end="", flush=True)

                if show_progress and not HAS_TQDM:
                    print()

                tmp_path.replace(final_path)
                return final_path, content_type

        except HTTPError as error:
            last_exception = error
            code = int(getattr(error, "code", 0) or 0)
            retry_after = None
            try:
                retry_after_value = error.headers.get("Retry-After") if error.headers else None
                retry_after = int(retry_after_value) if retry_after_value else None
            except Exception:
                retry_after = None

            if code == 429 and attempt < retries:
                wait = retry_after if retry_after is not None else backoff * (2 ** (attempt - 1))
                if verbose:
                    print(f"HTTP 429 recebido. Tentando novamente em {wait}s.")
                time.sleep(wait)
                remove_partial(tmp_path)
                continue

            if 500 <= code < 600 and attempt < retries:
                wait = backoff * (2 ** (attempt - 1))
                if verbose:
                    print(f"HTTP {code} recebido. Tentando novamente em {wait}s.")
                time.sleep(wait)
                remove_partial(tmp_path)
                continue

            remove_partial(tmp_path)
            raise

        except URLError as error:
            last_exception = error
            reason = getattr(error, "reason", None)
            is_timeout = isinstance(reason, socket.timeout) or bool(getattr(reason, "timeout", False))
            if attempt < retries:
                wait = backoff * (2 ** (attempt - 1))
                if verbose:
                    label = "timeout" if is_timeout else reason
                    print(f"URLError ({label}). Tentando novamente em {wait}s.")
                time.sleep(wait)
                remove_partial(tmp_path)
                continue
            remove_partial(tmp_path)
            raise

        except Exception as error:
            last_exception = error
            remove_partial(tmp_path)
            raise

    raise last_exception or RuntimeError("Falha desconhecida ao baixar imagem.")


def generate_with_stability(
    prompt: str,
    output_base: Path,
    width: int,
    height: int,
    steps: int,
    cfg_scale: float,
    samples: int,
    engine: str,
    timeout: int,
    negative: str | None = None,
    verbose: bool = False,
) -> tuple[Path, str]:
    if requests is None:
        raise RuntimeError("Instale requests ou use --provider pollinations.")

    api_key = os.getenv("STABILITY_API_KEY") or os.getenv("STABILITY_KEY")
    if not api_key:
        raise RuntimeError("STABILITY_API_KEY nao configurada no ambiente.")

    url = f"https://api.stability.ai/v1/generation/{engine}/text-to-image"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    text_prompts: list[dict[str, Any]] = [{"text": prompt, "weight": 1.0}]
    if negative:
        text_prompts.append({"text": negative, "weight": -1.0})

    payload = {
        "text_prompts": text_prompts,
        "cfg_scale": cfg_scale,
        "height": height,
        "width": width,
        "samples": samples,
        "steps": steps,
    }

    if verbose:
        preview = prompt[:80] + ("..." if len(prompt) > 80 else "")
        print(f"POST {url} prompt={preview!r}")

    output_base.parent.mkdir(parents=True, exist_ok=True)
    response = requests.post(url, json=payload, headers=headers, timeout=timeout)
    if not response.ok:
        raise HTTPError(url, response.status_code, response.text, response.headers, None)

    data = response.json()
    encoded = None
    mime = "image/png"

    candidates = []
    if isinstance(data, dict):
        candidates = data.get("artifacts") or data.get("output") or data.get("data") or []
    elif isinstance(data, list):
        candidates = data

    for item in candidates:
        if not isinstance(item, dict):
            continue
        for key in ("b64_json", "base64", "b64"):
            if item.get(key):
                encoded = item[key]
                mime = item.get("mime") or item.get("format") or mime
                break
        if encoded:
            break

    if not encoded:
        raise RuntimeError("Resposta do Stability API nao contem imagem valida.")

    final_path = output_base.with_suffix(extension_for_content_type(mime))
    final_path.write_bytes(base64.b64decode(encoded))
    return final_path, mime


def selected_provider(args: argparse.Namespace) -> str:
    provider = args.provider.lower()
    if provider == "auto":
        return "stability" if (os.getenv("STABILITY_API_KEY") or os.getenv("STABILITY_KEY")) else "pollinations"
    return provider


def generate_to_base(
    prompt: str,
    output_base: Path,
    args: argparse.Namespace,
    seed: int | None = None,
    enhance: bool = False,
    width: int | None = None,
    height: int | None = None,
) -> tuple[Path, str, str, str | None]:
    provider = selected_provider(args)
    negative = effective_negative_prompt(args)

    # resolucao efetiva para geracao (permite supersampling)
    gen_width = int(width or args.width)
    gen_height = int(height or args.height)

    if provider == "stability":
        try:
            saved, content_type = generate_with_stability(
                prompt,
                output_base,
                width=gen_width,
                height=gen_height,
                steps=args.steps,
                cfg_scale=args.cfg_scale,
                samples=args.samples,
                engine=args.stability_engine,
                timeout=args.timeout,
                negative=negative,
                verbose=args.verbose,
            )
            return saved, content_type, "stability", None
        except Exception as error:
            print(f"Falha no provedor stability: {error}")
            print("Tentando fallback para Pollinations...")

    url = build_pollinations_url(
        prompt,
        width=gen_width,
        height=gen_height,
        api_base=args.api,
        seed=seed,
        enhance=enhance,
        model=args.model,
        negative=negative,
        private=args.private,
    )
    if args.verbose:
        print(f"URL: {url}")

    try:
        saved, content_type = download_image(
            url,
            output_base,
            show_progress=not args.no_progress,
            retries=args.retries,
            timeout=args.timeout,
            verbose=args.verbose,
        )
        return saved, content_type, "pollinations", url
    except HTTPError as error:
        code = getattr(error, "code", None)
        if code != 402:
            raise

        print("A API retornou HTTP 402. Tentando placeholder temporario em picsum.photos...")
        placeholder_url = f"https://picsum.photos/{gen_width}/{gen_height}"
        saved, content_type = download_image(
            placeholder_url,
            output_base,
            show_progress=not args.no_progress,
            retries=1,
            timeout=args.timeout,
            verbose=args.verbose,
        )
        return saved, content_type, "picsum-placeholder", placeholder_url


def write_metadata(
    saved: Path,
    aggregate_dir: Path,
    metadata: dict[str, Any],
    write_sidecar: bool = True,
) -> None:
    aggregate_dir.mkdir(parents=True, exist_ok=True)
    metadata = dict(metadata)
    metadata.update(
        {
            "filename": saved.name,
            "path": str(saved.resolve()),
            "size_bytes": saved.stat().st_size,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    )

    if write_sidecar:
        sidecar = saved.parent / f"{saved.name}.json"
        sidecar.write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")

    aggregate = aggregate_dir / "metadata.json"
    try:
        data = json.loads(aggregate.read_text(encoding="utf-8")) if aggregate.exists() else []
        if not isinstance(data, list):
            data = []
    except Exception:
        data = []
    data.append(metadata)
    aggregate.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def project_path(path: Path | str) -> str:
    path = Path(path)
    try:
        return path.resolve().relative_to(ROOT).as_posix()
    except ValueError:
        return path.as_posix()


def catalog_product_meta(filename: str) -> tuple[str, str]:
    if filename in PRODUCT_DETAILS:
        return PRODUCT_DETAILS[filename]
    stem = Path(filename).stem.replace("-", " ").title()
    return stem, "Produtos"


def load_asset_manifest(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {
            "version": "v2",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "assets": [],
        }

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        data = {}

    if not isinstance(data, dict):
        data = {}
    if not isinstance(data.get("assets"), list):
        data["assets"] = []
    data.setdefault("version", "v2")
    return data


def upsert_asset_manifest_entry(path: Path, entry: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    data = load_asset_manifest(path)
    assets = [asset for asset in data.get("assets", []) if isinstance(asset, dict)]
    slug = entry.get("slug")
    replaced = False
    for index, asset in enumerate(assets):
        if asset.get("slug") == slug:
            assets[index] = {**asset, **entry}
            replaced = True
            break
    if not replaced:
        assets.append(entry)

    data["assets"] = assets
    data["generated_at"] = datetime.now(timezone.utc).isoformat()
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def save_catalog_png(source: Path, target: Path, width: int, height: int, padding: int = 70) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    if HAS_PIL:
        image = Image.open(source)
        image = ImageOps.exif_transpose(image).convert("RGBA")
        max_width = max(1, width - padding * 2)
        max_height = max(1, height - padding * 2)
        image.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)

        canvas = Image.new("RGBA", (width, height), (255, 255, 255, 0))
        x = (width - image.width) // 2
        y = (height - image.height) // 2
        canvas.alpha_composite(image, (x, y))
        canvas.save(target, format="PNG", optimize=True)
        return

    print("Aviso: Pillow nao esta instalado; copiando imagem sem converter para PNG.")
    shutil.copy2(source, target)


def create_contact_sheet(items: list[tuple[Path, str]], output: Path, thumb_size: int = 260) -> None:
    if not HAS_PIL or not items:
        return

    columns = min(4, len(items))
    rows = (len(items) + columns - 1) // columns
    label_height = 34
    gap = 16
    width = columns * thumb_size + (columns + 1) * gap
    height = rows * (thumb_size + label_height) + (rows + 1) * gap
    sheet = Image.new("RGB", (width, height), "#f8fafc")
    draw = ImageDraw.Draw(sheet)

    for index, (path, label) in enumerate(items):
        column = index % columns
        row = index // columns
        x = gap + column * (thumb_size + gap)
        y = gap + row * (thumb_size + label_height + gap)
        image = Image.open(path)
        image = ImageOps.exif_transpose(image).convert("RGBA")
        image.thumbnail((thumb_size, thumb_size), Image.Resampling.LANCZOS)
        tile = Image.new("RGBA", (thumb_size, thumb_size), (255, 255, 255, 255))
        tile.alpha_composite(image, ((thumb_size - image.width) // 2, (thumb_size - image.height) // 2))
        sheet.paste(tile.convert("RGB"), (x, y))
        draw.text((x + 8, y + thumb_size + 8), label[:42], fill="#0f172a")

    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output, format="PNG", optimize=True)


def optimize_image_file(path: Path, quality: int = 86) -> tuple[bool, int, int]:
    if not HAS_PIL:
        raise RuntimeError("Pillow nao esta instalado.")

    original_size = path.stat().st_size
    suffix = path.suffix.lower()
    temp = path.with_name(f"{path.stem}.optimized{path.suffix}")

    image = Image.open(path)
    image = ImageOps.exif_transpose(image)

    if suffix in {".jpg", ".jpeg"}:
        image.convert("RGB").save(temp, format="JPEG", quality=quality, optimize=True, progressive=True)
    elif suffix == ".png":
        image.save(temp, format="PNG", optimize=True)
    elif suffix == ".webp":
        image.save(temp, format="WEBP", quality=quality, method=6)
    else:
        return False, original_size, original_size

    optimized_size = temp.stat().st_size
    if optimized_size < original_size:
        temp.replace(path)
        return True, original_size, optimized_size

    temp.unlink(missing_ok=True)
    return False, original_size, optimized_size


def upscale_image_file(path: Path, factor: int = 2, sharpen: bool = True) -> Path:
    if not HAS_PIL:
        raise RuntimeError("Pillow nao esta instalado.")

    image = Image.open(path)
    image = ImageOps.exif_transpose(image)
    if image.mode not in ("RGB", "RGBA"):
        image = image.convert("RGB")

    new_size = (max(1, image.width * factor), max(1, image.height * factor))
    up = image.resize(new_size, Image.Resampling.LANCZOS)
    if sharpen:
        try:
            up = up.filter(ImageFilter.UnsharpMask(radius=1, percent=150, threshold=3))
        except Exception:
            pass

    temp = path.with_suffix(path.suffix + f".up{factor}.tmp")
    suffix = path.suffix.lower()
    if suffix in {".jpg", ".jpeg"}:
        up.convert("RGB").save(temp, format="JPEG", quality=95, optimize=True, progressive=True)
    elif suffix == ".png":
        up.save(temp, format="PNG", optimize=True)
    elif suffix == ".webp":
        up.save(temp, format="WEBP", quality=95, method=6)
    else:
        up.save(temp)

    temp.replace(path)
    return path


def downscale_image_file(path: Path, target_w: int, target_h: int, sharpen: bool = True) -> Path:
    if not HAS_PIL:
        raise RuntimeError("Pillow nao esta instalado.")

    image = Image.open(path)
    image = ImageOps.exif_transpose(image)
    if image.mode not in ("RGB", "RGBA"):
        image = image.convert("RGB")

    resized = image.resize((max(1, target_w), max(1, target_h)), Image.Resampling.LANCZOS)
    if sharpen:
        try:
            resized = resized.filter(ImageFilter.UnsharpMask(radius=0.8, percent=120, threshold=3))
        except Exception:
            pass

    temp = path.with_suffix(path.suffix + ".ds.tmp")
    suffix = path.suffix.lower()
    if suffix in {".jpg", ".jpeg"}:
        resized.convert("RGB").save(temp, format="JPEG", quality=95, optimize=True, progressive=True)
    elif suffix == ".png":
        resized.save(temp, format="PNG", optimize=True)
    elif suffix == ".webp":
        resized.save(temp, format="WEBP", quality=95, method=6)
    else:
        resized.save(temp)

    temp.replace(path)
    return path


def optimize_assets(args: argparse.Namespace) -> int:
    if not HAS_PIL:
        print("Instale Pillow primeiro: python -m pip install -r requirements.txt")
        return 1

    asset_dir = ROOT / "assets"
    patterns = ("*.png", "*.jpg", "*.jpeg", "*.webp")
    files: list[Path] = []
    for pattern in patterns:
        files.extend(asset_dir.rglob(pattern))

    changed = 0
    saved_bytes = 0
    for path in sorted(files):
        try:
            optimized, before, after = optimize_image_file(path, quality=args.quality)
        except Exception as error:
            print(f"Falhou: {path.relative_to(ROOT)} ({error})")
            continue

        if optimized:
            changed += 1
            saved_bytes += before - after
            print(f"Otimizou: {path.relative_to(ROOT)} ({before // 1024}KB -> {after // 1024}KB)")

    print(f"Concluido: {changed} arquivo(s) otimizados, {saved_bytes // 1024}KB economizados.")
    return 0


def product_filter(products_arg: str | None) -> set[str] | None:
    if not products_arg:
        return None
    selected = {safe_slug(part) for part in products_arg.split(",") if part.strip()}
    return selected or None


def product_is_selected(filename: str, description: str, selected: set[str] | None) -> bool:
    if not selected:
        return True
    name = safe_slug(Path(filename).stem)
    desc = safe_slug(description)
    return name in selected or any(item in desc for item in selected)


def generate_catalog(args: argparse.Namespace) -> int:
    selected = product_filter(args.products)
    items = [
        (index, filename, description)
        for index, (filename, description) in enumerate(PRODUCTS, start=1)
        if product_is_selected(filename, description, selected)
    ]

    if not items:
        print("Nenhum produto encontrado para o filtro informado.")
        return 1

    target_dir = PRODUCT_DIR if args.legacy_output else PRODUCT_V2_DIR
    site_dir = SITE_PRODUCT_DIR if args.legacy_output else SITE_PRODUCT_V2_DIR
    manifest_path = (ROOT / args.manifest).resolve() if not Path(args.manifest).is_absolute() else Path(args.manifest)

    print(f"Gerando {len(items)} imagem(ns) do catalogo em {target_dir.relative_to(ROOT)}...")
    successes = 0
    failures: list[tuple[str, str]] = []

    for item_number, (product_index, filename, description) in enumerate(items, start=1):
        prompt = product_prompt(description, brand_aware=args.brand_aware)
        target = target_dir / filename
        tmp_base = TMP_DIR / Path(filename).stem
        seed = args.seed_base + product_index

        print(f"[{item_number:02d}/{len(items):02d}] {filename}")
        try:
            gen_width = args.width * args.upscale_factor if getattr(args, "supersample", False) else args.width
            gen_height = args.height * args.upscale_factor if getattr(args, "supersample", False) else args.height
            generated, content_type, provider, url = generate_to_base(
                prompt, tmp_base, args, seed=seed, enhance=True, width=gen_width, height=gen_height
            )
            save_catalog_png(generated, target, args.width, args.height, padding=args.padding)

            # optional local upscale applied to final catalog image (only when not supersampling)
            if getattr(args, "upscale", False) and not getattr(args, "supersample", False):
                try:
                    upscale_image_file(target, factor=args.upscale_factor, sharpen=not getattr(args, "no_upscale_sharpen", False))
                except Exception as e:
                    print(f"Aviso: falha ao aplicar upscaler local: {e}")

            if not args.no_site_copy:
                site_dir.mkdir(parents=True, exist_ok=True)
                shutil.copy2(target, site_dir / filename)
            remove_partial(generated)

            # recompute content_type a partir do arquivo final para metadata
            suffix = target.suffix.lower()
            if suffix == ".png":
                final_content_type = "image/png"
            elif suffix in {".jpg", ".jpeg"}:
                final_content_type = "image/jpeg"
            elif suffix == ".webp":
                final_content_type = "image/webp"
            else:
                final_content_type = content_type

            if not args.no_metadata:
                write_metadata(
                    target,
                    TMP_DIR,
                    {
                        "prompt": prompt,
                        "product": filename,
                        "width": args.width,
                        "height": args.height,
                        "padding": args.padding,
                        "provider": provider,
                        "model": args.model,
                        "negative": effective_negative_prompt(args),
                        "content_type": final_content_type,
                        "seed": seed,
                        "url": url,
                    },
                    write_sidecar=False,
                )

            if not args.no_manifest:
                nome, categoria = catalog_product_meta(filename)
                now = datetime.now(timezone.utc).isoformat()
                upsert_asset_manifest_entry(
                    manifest_path,
                    {
                        "slug": Path(filename).stem,
                        "nome": nome,
                        "categoria": categoria,
                        "old_path": project_path(PRODUCT_DIR / filename),
                        "new_path": project_path(target),
                        "site_path": "" if args.no_site_copy else project_path(site_dir / filename),
                        "status": "generated",
                        "prompt": prompt,
                        "generated_at": now,
                    },
                )

            print(f"  Salvo: {target.relative_to(ROOT)}")
            successes += 1
            time.sleep(args.delay)
        except (HTTPError, URLError, RuntimeError, OSError) as error:
            print(f"  Falhou: {error}")
            failures.append((filename, str(error)))
            if args.stop_on_error:
                break

    print(f"Concluido: {successes} salvo(s), {len(failures)} falha(s).")
    if failures:
        print("Falhas:")
        for filename, message in failures:
            print(f" - {filename}: {message}")

    return 0 if successes else 1


def generate_custom(args: argparse.Namespace) -> int:
    base_text = args.prompt or args.object or DEFAULT_PROMPT
    views = [view.strip() for view in args.views.split(",") if view.strip()]
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    tasks: list[tuple[str, Path, str, int | None]] = []
    for view in views:
        for number in range(1, max(1, args.count) + 1):
            variation = number if args.count > 1 else None
            prompt = compose_prompt(base_text, args.style, view, variation)
            output_name = f"{args.base_name}_{safe_slug(view)}"
            if variation:
                output_name = f"{output_name}_{variation}"
            tasks.append((prompt, output_dir / output_name, view, variation))

    if not tasks:
        print("Nenhuma tarefa de geracao configurada.")
        return 1

    successes = 0
    failures: list[tuple[str, str]] = []
    saved_outputs: list[tuple[Path, str]] = []
    print(f"Usando provedor: {selected_provider(args)}")

    for index, (prompt, output_base, view, variation) in enumerate(tasks, start=1):
        print(f"[{index}/{len(tasks)}] Gerando: {prompt}")
        try:
            gen_width = args.width * args.upscale_factor if getattr(args, "supersample", False) else args.width
            gen_height = args.height * args.upscale_factor if getattr(args, "supersample", False) else args.height
            saved, content_type, provider, url = generate_to_base(prompt, output_base, args, width=gen_width, height=gen_height)

            # if supersample: downscale to desired final size (improves detail)
            if getattr(args, "supersample", False):
                try:
                    downscale_image_file(saved, args.width, args.height, sharpen=not getattr(args, "no_upscale_sharpen", False))
                except Exception as e:
                    print(f"Aviso: falha ao redimensionar (supersample): {e}")
            elif getattr(args, "upscale", False):
                try:
                    upscale_image_file(saved, factor=args.upscale_factor, sharpen=not getattr(args, "no_upscale_sharpen", False))
                except Exception as e:
                    print(f"Aviso: falha ao aplicar upscaler local: {e}")

            print(f"Salvo: {saved.resolve()}")
            label = f"{view} {variation}".strip() if variation else view
            saved_outputs.append((saved, label))

            if not args.no_metadata:
                write_metadata(
                    saved,
                    output_dir,
                    {
                        "prompt": prompt,
                        "style": args.style,
                        "view": view,
                        "variation": variation,
                        "width": args.width,
                        "height": args.height,
                        "provider": provider,
                        "model": args.model,
                        "negative": effective_negative_prompt(args),
                        "api": args.api,
                        "url": url,
                        "content_type": content_type,
                        "retries_config": args.retries,
                    },
                    write_sidecar=True,
                )

            successes += 1
        except HTTPError as error:
            code = getattr(error, "code", None)
            print(f"Erro HTTP {code}: a API recusou a requisicao.")
            failures.append((prompt, str(error)))
            if args.stop_on_error:
                break
        except URLError as error:
            print(f"Erro de conexao: {error.reason}")
            failures.append((prompt, str(error)))
            if args.stop_on_error:
                break
        except Exception as error:
            print(f"Erro ao gerar a imagem: {error}")
            failures.append((prompt, str(error)))
            if args.stop_on_error:
                break

    print(f"Concluido: {successes} salvo(s), {len(failures)} falha(s).")
    if failures:
        print("Falhas:")
        for prompt, message in failures:
            print(f" - {prompt}: {message}")

    if saved_outputs and len(saved_outputs) > 1 and not args.no_contact_sheet:
        contact_sheet = output_dir / f"{safe_slug(args.base_name)}_preview.png"
        try:
            create_contact_sheet(saved_outputs, contact_sheet)
            print(f"Preview salvo: {contact_sheet.resolve()}")
        except Exception as error:
            print(f"Aviso: nao foi possivel gerar o preview: {error}")

    return 0 if successes else 1


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Gerador unico de imagens da Monte Sinai: prompt avulso ou catalogo completo."
    )

    parser.add_argument("--optimize-assets", action="store_true", help="Otimiza imagens existentes dentro de assets/.")
    parser.add_argument("--quality", type=int, default=86, help="Qualidade para JPG/WebP no modo --optimize-assets.")

    parser.add_argument("--catalog", action="store_true", help="Regera as imagens do catalogo em assets/produtos/v2.")
    parser.add_argument("--products", help="No modo --catalog, filtra produtos por slug ou palavras, separados por virgula.")
    parser.add_argument("--no-site-copy", action="store_true", help="No modo --catalog, nao copia para assets/produtos/site.")
    parser.add_argument("--legacy-output", action="store_true", help="No modo --catalog, grava nos caminhos antigos assets/produtos.")
    parser.add_argument("--manifest", default=str(ASSET_MANIFEST.relative_to(ROOT)), help="Manifest JSON atualizado no modo --catalog.")
    parser.add_argument("--no-manifest", action="store_true", help="No modo --catalog, nao atualiza assets/generated/v2/manifest.json.")
    parser.add_argument("--brand-aware", action="store_true", help="Permite prompts com embalagens/marcas quando o produto pedir.")
    parser.add_argument("--seed-base", type=int, default=5240, help="Seed base usada no modo catalogo.")
    parser.add_argument("--delay", type=float, default=0.8, help="Pausa entre produtos no modo catalogo.")
    parser.add_argument("--padding", type=int, default=70, help="Margem interna das imagens PNG do catalogo.")

    parser.add_argument("--prompt", "-p", help="Prompt completo. Se informado, substitui --object.")
    parser.add_argument("--object", "-o", default=DEFAULT_PROMPT, help="Objeto generico a renderizar.")
    parser.add_argument("--style", "-s", choices=list(PRESETS.keys()), help="Preset de estilo.")
    parser.add_argument("--views", "-v", default="front", help="Vistas separadas por virgula.")
    parser.add_argument("--count", "-n", type=int, default=1, help="Numero de variacoes por vista.")
    parser.add_argument("--width", type=int, help="Largura da imagem.")
    parser.add_argument("--height", type=int, help="Altura da imagem.")
    parser.add_argument("--output-dir", "-d", default=".", help="Diretorio para imagens avulsas.")
    parser.add_argument("--base-name", "-b", default=DEFAULT_OUTPUT_BASE, help="Base do nome para imagens avulsas.")

    parser.add_argument("--provider", choices=["auto", "pollinations", "stability"], default="auto")
    parser.add_argument("--api", default="https://image.pollinations.ai", help="Endpoint base da API Pollinations.")
    parser.add_argument("--model", default=DEFAULT_POLLINATIONS_MODEL, help="Modelo do Pollinations, exemplo: flux.")
    parser.add_argument("--negative", help="Prompt negativo para evitar logos, cortes e baixa qualidade.")
    parser.add_argument("--no-negative", action="store_true", help="Desativa o prompt negativo padrao.")
    parser.add_argument("--private", action="store_true", help="Pede ao Pollinations para nao listar a geracao em feed publico.")
    parser.add_argument("--stability-engine", default="stable-diffusion-512-v2-1")
    parser.add_argument("--steps", type=int, default=30)
    parser.add_argument("--cfg-scale", type=float, default=7.0)
    parser.add_argument("--samples", type=int, default=1)

    parser.add_argument("--upscale", action="store_true", help="Aplicar upscaling local (Pillow LANCZOS + unsharp) apos geracao.")
    parser.add_argument("--upscale-factor", type=int, default=2, help="Fator de upscaling / supersampling (ex: 2).")
    parser.add_argument("--supersample", action="store_true", help="Gerar em resolucao maior e redimensionar para o tamanho final (melhora detalhes).")
    parser.add_argument("--no-upscale-sharpen", action="store_true", help="Desativa sharpen apos upscaling/supersampling.")

    parser.add_argument("--timeout", type=int, default=DEFAULT_TIMEOUT)
    parser.add_argument("--retries", type=int, default=DEFAULT_RETRIES)
    parser.add_argument("--no-progress", action="store_true")
    parser.add_argument("--no-metadata", action="store_true")
    parser.add_argument("--no-contact-sheet", action="store_true")
    parser.add_argument("--stop-on-error", action="store_true")
    parser.add_argument("--verbose", action="store_true")

    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.optimize_assets:
        return optimize_assets(args)

    if args.catalog:
        args.width = args.width or 900
        args.height = args.height or 900
        return generate_catalog(args)

    args.width = args.width or 800
    args.height = args.height or 800
    return generate_custom(args)


if __name__ == "__main__":
    sys.exit(main())
