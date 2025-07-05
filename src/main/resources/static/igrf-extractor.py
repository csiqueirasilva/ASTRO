#!/usr/bin/env python3
import urllib.request, re, sys, json

URL              = 'https://www.ngdc.noaa.gov/IAGA/vmod/igrf14.f'
START_YEAR       = 1900
PRINT_RAW_MATRIX = False
PRINT_JSON       = False
SAVE_TO_DISK     = True
OUTPUT_FILE      = 'igrf-v14.json'

def capture_matrix_section(src: str) -> str:
    start_re = re.compile(rf'^\s*data.*{START_YEAR}\s*$', re.IGNORECASE|re.MULTILINE)
    m = start_re.search(src)
    if not m: return ''
    tail = src[m.start():]
    sec_re = re.compile(r'(.*?data\s+gt/[^/]*?/)', re.IGNORECASE|re.DOTALL)
    m2 = sec_re.search(tail)
    return m2.group(1) if m2 else tail

def expand_multipliers(s: str) -> str:
    def repl(m):
        cnt, val = int(m.group(1)), m.group(2)
        return ','.join([val]*cnt)
    return re.sub(r'(\d+)\*([\-\d\.]+)', repl, s)

def clean_and_split(block: str) -> list[float]:
    s = expand_multipliers(block)
    s = re.sub(r'^\s+([a-z0-9])\s+', '', s, flags=re.MULTILINE)
    s = re.sub(r'^\s+data g(\d|[a-z])/', '', s, flags=re.IGNORECASE|re.MULTILINE)
    s = s.replace('/', ',')
    s = re.sub(r'\d{4}$', '', s, flags=re.MULTILINE)
    s = re.sub(r'\s+', '', s, flags=re.MULTILINE)
    parts = [p for p in s.split(',') if p]
    return [float(p) for p in parts]

def raw_to_dict(raw: str) -> dict[str, list[float]]:
    d = {}
    blk_re = re.compile(r'^\s*data\s+([a-z]\w?)/([\s\S]*?)/', re.IGNORECASE|re.MULTILINE)
    for m in blk_re.finditer(raw):
        key = m.group(1).lower()
        d[key] = clean_and_split(m.group(0))
    return d

def main():
    print(f'downloading file from {URL}...')
    try:
        with urllib.request.urlopen(URL) as resp:
            src = resp.read().decode('utf-8')
    except Exception as e:
        print(f'Error: {e}', file=sys.stderr)
        sys.exit(1)

    matrix_raw = capture_matrix_section(src)
    if not matrix_raw:
        print('No matrix section found.', file=sys.stderr)
        sys.exit(1)

    if PRINT_RAW_MATRIX:
        print('=== RAW ===', matrix_raw, '=== END ===', file=sys.stderr)

    data = raw_to_dict(matrix_raw)

    # flatten into one array
    flat = [None]
    for lst in data.values():
        flat.extend(lst)

    json_str = json.dumps(flat, separators=(',', ':'), ensure_ascii=False)

    if PRINT_JSON:
        print(json_str)

    if SAVE_TO_DISK:
        print(f'saving file to {OUTPUT_FILE}...')
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            f.write(json_str)
        print(f'saved file has {len(flat)} records')

if __name__ == '__main__':
    main()
