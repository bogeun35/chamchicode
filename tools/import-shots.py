# -*- coding: utf-8 -*-
"""Escape the Backrooms 스크린샷을 공략 페이지에 넣는 스크립트.

사용법
  1) 게임 안에서 F12 로 스샷을 찍는다
  2) python tools/import-shots.py          -> 새 스샷을 backrooms-shots/ 로 복사하고 목록 출력
  3) 복사된 파일 이름 앞에 레벨 진행번호를 붙인다   예) 16-suburbs.jpg
  4) python tools/import-shots.py --wire   -> 번호가 붙은 스샷을 해당 레벨 카드에 삽입

번호는 사이드바에 보이는 진행번호(01~31)와 같다.
"""
import glob
import io
import os
import re
import shutil
import sys

APPID = "1943950"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEST = os.path.join(ROOT, "backrooms-shots")
PAGE = os.path.join(ROOT, "backrooms.html")

STEAM_GLOBS = [
    r"C:\Program Files (x86)\Steam\userdata\*\760\remote\%s\screenshots\*.jpg" % APPID,
    r"D:\Steam\userdata\*\760\remote\%s\screenshots\*.jpg" % APPID,
    os.path.expanduser(r"~\AppData\Local\EscapeTheBackrooms\Saved\Screenshots\**\*.png"),
]


def find_sources():
    out = []
    for g in STEAM_GLOBS:
        out += [p for p in glob.glob(g, recursive=True) if "thumbnails" not in p.lower()]
    return sorted(set(out))


def copy_new():
    if not os.path.isdir(DEST):
        os.makedirs(DEST)
    have = {os.path.basename(p) for p in glob.glob(os.path.join(DEST, "*"))}
    srcs = find_sources()
    if not srcs:
        print("스팀 스크린샷 폴더에 %s 스샷이 없습니다." % APPID)
        print("게임 안에서 F12 로 찍은 뒤 다시 실행하세요.")
        return []
    new = []
    for p in srcs:
        b = os.path.basename(p)
        if b in have or any(h.endswith("-" + b) or h.endswith(b) for h in have):
            continue
        shutil.copy2(p, os.path.join(DEST, b))
        new.append(b)
    print("원본 %d장 발견 · 새로 복사 %d장 -> %s" % (len(srcs), len(new), DEST))
    for b in new:
        print("   " + b)
    if new:
        print()
        print("이름 앞에 레벨 진행번호를 붙이고 --wire 로 다시 실행하세요.  예) 16-%s" % new[0])
    return new


def wire():
    if not os.path.isdir(DEST):
        print("backrooms-shots/ 가 없습니다. 먼저 --wire 없이 실행하세요.")
        return
    shots = {}
    for p in sorted(glob.glob(os.path.join(DEST, "*"))):
        m = re.match(r"(\d{1,2})[-_]", os.path.basename(p))
        if m:
            shots.setdefault(int(m.group(1)), []).append(os.path.basename(p))
    if not shots:
        print("번호가 붙은 스샷이 없습니다. 파일명을 '16-....jpg' 형태로 바꾸세요.")
        return

    s = io.open(PAGE, encoding="utf-8").read()
    s = re.sub(r'\n\s*<figure class="shot">.*?</figure>', "", s, flags=re.S)
    n = 0
    for lv, files in sorted(shots.items()):
        m = re.search(r'<section class="panel" id="lv%02d">' % lv, s)
        if not m:
            print("  레벨 %02d 패널을 못 찾음" % lv)
            continue
        figs = []
        for f in files:
            figs.append('\n  <figure class="shot">\n'
                        '    <img src="backrooms-shots/%s" alt="레벨 %02d 스크린샷" loading="lazy">\n'
                        '    <figcaption>직접 찍은 스크린샷</figcaption>\n  </figure>' % (f, lv))
        s = s[:m.end()] + "".join(figs) + s[m.end():]
        n += len(files)
    io.open(PAGE, "w", encoding="utf-8").write(s)
    print("스샷 %d장을 레벨 %d개에 삽입했습니다." % (n, len(shots)))


if __name__ == "__main__":
    if "--wire" in sys.argv:
        wire()
    else:
        copy_new()
