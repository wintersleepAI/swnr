import os, re, sys
from ruamel.yaml import YAML

yaml = YAML(typ="rt")
yaml.preserve_quotes = True

TOP_LEVEL_KEY = re.compile(r'^[^\s#][^:]*:\s*.*$')  # a root key line

def read_vals(path):
    with open(path, 'r', encoding='utf-8') as f:
        data = yaml.load(f)
    pt = (data or {}).get('prototypeToken', {})
    tx = (pt or {}).get('texture', {})
    return (data, tx.get('src'))

def surgical_insert_img(path, img_value):
    with open(path, 'r', encoding='utf-8') as f:
        text = f.read()

    # If 'img:' already present at root, do nothing
    if re.search(r'(?m)^img:\s*.*$', text):
        return False

    # Find first root-level key line to insert after (e.g. after 'name:' or 'type:')
    m = TOP_LEVEL_KEY.search(text)
    if not m:
        return False

    insert_pos = m.end()
    # Insert as a new line *after* the first root key, keeping Unix/Windows endings intact
    newline = "\n"
    if "\r\n" in text and not "\n" in text.replace("\r\n", ""):
        newline = "\r\n"

    # Place right after the matched line
    new_text = text[:insert_pos] + f"{newline}img: {img_value}" + text[insert_pos:]

    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_text)
    return True

def process(path):
    try:
        data, texture_src = read_vals(path)
    except Exception as e:
        print(f"Error parsing {path}: {e}")
        return

    if not isinstance(data, dict) or not texture_src:
        return

    if "img" not in data:
        if surgical_insert_img(path, texture_src):
            print(f"Added img to {path}: {texture_src}")
    elif data.get("img") != texture_src:
        print(f"Mismatch in {path}: img='{data.get('img')}' vs texture.src='{texture_src}'")

def walk(d):
    for root, _, files in os.walk(d):
        for n in files:
            if n.endswith(('.yml', '.yaml')):
                process(os.path.join(root, n))

if __name__ == '__main__':
    print("Never got working. Keeping as reference for now.")
    sys.exit(1)
    # if len(sys.argv) != 2:
    #     print("Usage: python surgical-img-update.py <directory>")
    #     sys.exit(1)
    # walk(sys.argv[1])
