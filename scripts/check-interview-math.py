"""Run the curriculum's independent numerical checks with the standard library."""

from pathlib import Path
import subprocess
import sys

directory = Path(__file__).resolve().parent
ranges = ("00-04", "05-12", "13-19", "20-24", "25-29")

for chapter_range in ranges:
    path = directory / f"check-math-{chapter_range}.py"
    if not path.is_file():
        raise SystemExit(f"Missing numerical validation: {path.name}")
    print(f"\nChapters {chapter_range}", flush=True)
    subprocess.run([sys.executable, str(path)], check=True)

print("\nAll five numerical validation suites passed.")
