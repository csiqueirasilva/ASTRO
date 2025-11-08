#!/usr/bin/env python3
import datetime as dt
import math
import re
import ssl
import struct
import sys
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen

BODY_DEFINITIONS = [
    (10, "sun"),
    (399, "earth"),
    (501, "io"),
    (502, "europa"),
    (503, "ganymede"),
    (504, "callisto"),
]

BODIES = [body_id for body_id, _ in BODY_DEFINITIONS]
BODY_NAMES = {body_id: name for body_id, name in BODY_DEFINITIONS}

START_DATE = dt.datetime(2000, 1, 1)
END_DATE = dt.datetime(2079, 12, 31, 23, 59, 59)
SEGMENT_YEARS = 5
STEP_DAYS = 1 / 24.0 # x many hours of a day
API_BASE = "https://ssd.jpl.nasa.gov/api/horizons.api"

FLOAT_PATTERN = re.compile(r"[-+]?\d+\.\d+(?:E[+-]\d+)?")

ssl_context = ssl.create_default_context()
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.CERT_NONE


def daterange(start: dt.datetime, end: dt.datetime, step_years: int, step_days: float):
    segment_delta = dt.timedelta(days=step_years * 365.25)
    step_delta = dt.timedelta(days=step_days)
    current = start
    while current <= end:
        seg_end = current + segment_delta
        if seg_end > end:
            seg_end = end
        yield current, seg_end
        current = seg_end + step_delta


def parse_segment(text: str):
    section = text.split('$$SOE')[1].split('$$EOE')[0].strip()
    lines = section.splitlines()
    if len(lines) % 4 != 0:
        raise RuntimeError(f"Unexpected line count {len(lines)} in segment")
    data = []
    for i in range(0, len(lines), 4):
        jd_line = lines[i]
        pos_line = lines[i + 1]
        vel_line = lines[i + 2]
        jd = float(FLOAT_PATTERN.findall(jd_line)[0])
        x, y, z = [float(v) for v in FLOAT_PATTERN.findall(pos_line)]
        vx, vy, vz = [float(v) for v in FLOAT_PATTERN.findall(vel_line)]
        data.append((jd, x, y, z, vx, vy, vz))
    return data


def format_time(value: dt.datetime) -> str:
    return value.strftime("%Y-%m-%d %H:%M:%S")


def fetch_vectors(moon_id: int, start: dt.datetime, stop: dt.datetime):
    params = {
        "format": "text",
        "COMMAND": f"'{moon_id}'",
        "OBJ_DATA": "NO",
        "MAKE_EPHEM": "YES",
        "EPHEM_TYPE": "VECTORS",
        "CENTER": "'500@599'",
        "START_TIME": f"'{format_time(start)}'",
        "STOP_TIME": f"'{format_time(stop)}'",
        "STEP_SIZE": "'1 h'",
        "OUT_UNITS": "KM-S",
    }
    url = f"{API_BASE}?{urlencode(params)}"
    with urlopen(url, context=ssl_context) as response:
        text = response.read().decode('utf-8')
    if '$$SOE' not in text:
        raise RuntimeError(f"Unexpected response for moon {moon_id} segment {start} - {stop}\n{text[:200]}")
    return parse_segment(text)


def build_table(moon_id: int):
    records = []
    for seg_start, seg_end in daterange(START_DATE, END_DATE, SEGMENT_YEARS, STEP_DAYS):
        segment_records = fetch_vectors(moon_id, seg_start, seg_end)
        if records:
            existing_jd = records[-1][0]
            segment_records = [rec for rec in segment_records if rec[0] > existing_jd]
        records.extend(segment_records)
    return records


def write_dataset(output_path: Path, tables):
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open('wb') as f:
        f.write(struct.pack('<i', len(tables)))
        for moon_id, records in tables:
            if len(records) < 2:
                raise RuntimeError(f"Insufficient records for moon {moon_id}")
            start_jd = records[0][0]
            step = records[1][0] - records[0][0]
            if not math.isclose(step, STEP_DAYS, rel_tol=1e-6):
                raise RuntimeError(f"Unexpected step {step} for moon {moon_id}")
            f.write(struct.pack('<i', moon_id))
            f.write(struct.pack('<d', start_jd))
            f.write(struct.pack('<d', step))
            f.write(struct.pack('<i', len(records)))
            for jd, x, y, z, vx, vy, vz in records:
                f.write(struct.pack('<ffffff', x, y, z, vx, vy, vz))


def write_metadata(meta_path: Path, tables):
    import json
    meta = {
        "start_julian_day": tables[0][1][0][0],
        "end_julian_day": tables[0][1][-1][0],
        "step_days": STEP_DAYS,
        "bodies": [
            {
                "id": moon_id,
                "name": BODY_NAMES.get(moon_id, str(moon_id)),
                "records": len(records)
            }
            for moon_id, records in tables
        ]
    }
    meta_path.parent.mkdir(parents=True, exist_ok=True)
    meta_path.write_text(json.dumps(meta, indent=2))


def main():
    tables = []
    for body_id, name in BODY_DEFINITIONS:
        print(f"Fetching {name} ({body_id})...", file=sys.stderr, flush=True)
        records = build_table(body_id)
        print(f"  collected {len(records)} records", file=sys.stderr, flush=True)
        tables.append((body_id, records))
    dataset_path = Path('dotnet/Astro.Web/Data/galilean_ephemeris.bin')
    write_dataset(dataset_path, tables)
    meta_path = Path('dotnet/Astro.Web/Data/galilean_ephemeris.json')
    write_metadata(meta_path, tables)
    print(f"Dataset written to {dataset_path}")


if __name__ == '__main__':
    main()
