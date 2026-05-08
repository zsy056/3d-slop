import argparse
import json
from pathlib import Path

METADATA_KEY = "x-3d-slop"
PRESET_SUFFIX = ".presets.json"
SKIPPED_DIR_NAMES = {".git", ".cmake", "dist", "site"}
CATALOG_NAME_KEY = "Slop_catalog_name"
CATALOG_DESCRIPTION_KEY = "Slop_catalog_description"
CATALOG_TAGS_KEY = "Slop_catalog_tags"
CATALOG_PARAM_KEYS = {CATALOG_NAME_KEY, CATALOG_DESCRIPTION_KEY, CATALOG_TAGS_KEY}


def titleize_preset(preset_id):
    words = []
    for part in preset_id.replace("_", "-").split("-"):
        if part.endswith("x") and part[:-1].isdigit():
            words.append(part)
        elif "x" in part and all(piece.isdigit() for piece in part.split("x")):
            words.append(part)
        else:
            words.append(part.capitalize())
    return " ".join(words)


def titleize_id(value):
    return titleize_preset(value).replace("D Bricks", "D-Bricks")


def slug_from_name(value):
    return value.replace("_", "-").replace(" ", "-").lower()


def relative_posix(path, source_root):
    return path.relative_to(source_root).as_posix()


def should_skip(path, source_root):
    relative = path.relative_to(source_root)
    return any(part in SKIPPED_DIR_NAMES or part.startswith("build") for part in relative.parts)


def discover_preset_files(source_root):
    return sorted(
        path
        for path in source_root.rglob(f"*{PRESET_SUFFIX}")
        if path.is_file() and not should_skip(path, source_root)
    )


def default_source_for_preset(preset_path):
    model_base = preset_path.name[: -len(PRESET_SUFFIX)]
    return preset_path.with_name(f"{model_base}.scad")


def default_collection_id(preset_path, source_root):
    parts = preset_path.parent.relative_to(source_root).parts
    if parts:
        return parts[0]
    return "root"


def tags_for_preset(preset_id, params):
    tags = []
    for part in preset_id.replace("_", "-").split("-"):
        if part and part not in tags:
            tags.append(part)

    diameter = params.get("Cake_diameter_studs")
    if diameter:
        diameter_tag = f"{diameter}x"
        if diameter_tag not in tags:
            tags.append(diameter_tag)

    return tags


def tags_from_metadata(value):
    if not value:
        return []
    if isinstance(value, list):
        return [str(tag) for tag in value if str(tag)]
    return [tag.strip() for tag in str(value).split(",") if tag.strip()]


def collection_for_preset_file(preset_path, source_root, metadata):
    defaults_id = default_collection_id(preset_path, source_root)
    collection = metadata.get("collection", {})
    return {
        "id": collection.get("id", defaults_id),
        "name": collection.get("name", titleize_id(defaults_id)),
        "tagline": collection.get(
            "tagline",
            "Generated from preset JSON, because keeping a second catalog was apparently too dignified.",
        ),
    }


def model_for_preset_file(preset_path, source_root, preset_data):
    metadata = preset_data.get(METADATA_KEY, {})
    model_meta = metadata.get("model", {})
    source_path = source_root / model_meta["source"] if "source" in model_meta else default_source_for_preset(preset_path)
    source = relative_posix(source_path, source_root)
    model_name = Path(source).stem

    generated_model = {
        "id": model_meta.get("id", slug_from_name(model_name)),
        "name": model_meta.get("name", titleize_id(model_name)),
        "source": source,
        "description": model_meta.get(
            "description",
            "An OpenSCAD generator with presets, outputs, and enough paperwork to qualify as a hobby.",
        ),
        "presets": [],
    }

    for preset_id, params in preset_data.get("parameterSets", {}).items():
        model_params = {key: value for key, value in params.items() if key not in CATALOG_PARAM_KEYS}
        description = params.get(
            CATALOG_DESCRIPTION_KEY,
            "Freshly generated from preset data. The catalog wrote this one itself, and somehow that is legal.",
        )
        tags = tags_from_metadata(params.get(CATALOG_TAGS_KEY)) or tags_for_preset(
            preset_id,
            model_params,
        )
        generated_model["presets"].append(
            {
                "id": preset_id,
                "name": params.get(CATALOG_NAME_KEY, titleize_preset(preset_id)),
                "subtitle": description,
                "description": description,
                "stl": f"dist/stl/{model_name}.{preset_id}.stl",
                "image": f"dist/images/{model_name}.{preset_id}.png",
                "tags": tags,
            }
        )

    return generated_model


def build_catalog(source_root):
    collections = {}

    for preset_path in discover_preset_files(source_root):
        with preset_path.open("r", encoding="utf-8") as preset_file:
            preset_data = json.load(preset_file)

        if "parameterSets" not in preset_data:
            continue

        metadata = preset_data.get(METADATA_KEY, {})
        collection = collection_for_preset_file(preset_path, source_root, metadata)
        collection_id = collection["id"]
        if collection_id not in collections:
            collections[collection_id] = {**collection, "models": []}

        collections[collection_id]["models"].append(
            model_for_preset_file(preset_path, source_root, preset_data)
        )

    return {"collections": list(collections.values())}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    parser.add_argument("--source-root", required=True)
    args = parser.parse_args()

    output_path = Path(args.output)
    source_root = Path(args.source_root)

    catalog = build_catalog(source_root)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as output_file:
        json.dump(catalog, output_file, indent=2)
        output_file.write("\n")


if __name__ == "__main__":
    main()
