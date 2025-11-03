import os
import sys
from ruamel.yaml import YAML
from ruamel.yaml.comments import CommentedMap

yaml = YAML(typ="rt")          # round-trip: preserve formatting/comments/flow styles
yaml.preserve_quotes = True
yaml.width = 10**9             # prevent line wrapping/reflow of long/multiline scalars
# Do NOT call yaml.indent(...) so we don't override original list/mapping indentation

# Ensure None stays as an explicit 'null' (not removed, not changed to empty)
from ruamel.yaml.representer import RoundTripRepresenter
def _repr_none(representer, data):
    return representer.represent_scalar('tag:yaml.org,2002:null', 'null')
yaml.Representer.add_representer(type(None), _repr_none)

def process_yaml_file(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = yaml.load(f)
    except Exception as e:
        print(f"Error parsing {path}: {e}")
        return

    if not isinstance(data, (dict, CommentedMap)):
        return  # not a mapping at root

    # Safely navigate to prototypeToken.texture.src
    pt = data.get("prototypeToken")
    if not isinstance(pt, (dict, CommentedMap)):
        return
    texture = pt.get("texture")
    if not isinstance(texture, (dict, CommentedMap)):
        return
    texture_src = texture.get("src")
    if texture_src is None:
        return  # nothing to compare or add

    changed = False

    # If root-level img is missing, add it and write back
    if "img" not in data:
        data["img"] = texture_src
        print(f"Added img to {path}: {texture_src}")
        changed = True
    else:
        # If it exists but differs, just report (do not modify)
        if data.get("img") != texture_src:
            print(f"Mismatch in {path}: img='{data.get('img')}' vs texture.src='{texture_src}'")

    if changed:
        try:
            with open(path, "w", encoding="utf-8") as f:
                yaml.dump(data, f)
        except Exception as e:
            print(f"Error writing {path}: {e}")

def walk(dir_path):
    for root, _, files in os.walk(dir_path):
        for name in files:
            if name.endswith((".yml", ".yaml")):
                process_yaml_file(os.path.join(root, name))

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python check_textures_preserve.py <directory>")
        sys.exit(1)
    walk(sys.argv[1])
