"""웹 배포용 폰트 조각 만들기: python3 scripts/make-web-fonts.py (frontend 폴더에서, pip install fonttools brotli)
구글 폰트에 기대지 않고 같은 출처에서 폰트를 받게, @expo-google-fonts 의 ttf 에서 쓰는 글자만 woff2 로 뽑아 public/fonts/ 에 둡니다.
글자: ASCII + 완성형 한글 2350자(KS X 1001) + 기호·한자 영역의 기호. 그 밖의 글자(옛 한글·이모지)는 시스템 글꼴로 대신 나옵니다."""
import os
from fontTools import subset

ROOT = os.path.join(os.path.dirname(__file__), '..')
NM = os.path.join(ROOT, 'node_modules', '@expo-google-fonts')
OUT = os.path.join(ROOT, 'public', 'fonts')
os.makedirs(OUT, exist_ok=True)

chars = set(chr(c) for c in range(0x20, 0x7F))
for hi in range(0xA1, 0xFE):
    for lo in range(0xA1, 0xFF):
        try:
            ch = bytes([hi, lo]).decode('euc-kr')
        except UnicodeDecodeError:
            continue
        # 기호(A1~AF 줄)·완성형 한글(B0~C8 줄)만. 한자(CA~FD 줄)는 뺍니다.
        if hi <= 0xAF or 0xB0 <= hi <= 0xC8:
            chars.add(ch)
chars |= set('·‘’“”…›‹→←↑↓★☆♥♡✓✕₩~•‧ㆍ ')
chars |= set(chr(c) for c in range(0x3131, 0x3164))  # 호환 자모(ㅋㅋ 같은 글자)
# 완성형 2350자에 없는 글자(웠·됬 같은 것)가 앱 문구에 있으면 빠지지 않게, 소스의 한글·기호도 모두 넣습니다.
for base, _dirs, files in os.walk(os.path.join(ROOT, 'src')):
    for f in files:
        if f.endswith('.js'):
            chars |= set(c for c in open(os.path.join(base, f), encoding='utf-8').read() if ord(c) >= 0x80 and not (0x1F000 <= ord(c) <= 0x1FFFF))

FONTS = [
    ('black-han-sans', 'black-han-sans/400Regular/BlackHanSans_400Regular.ttf', True),
    ('noto-sans-kr-400', 'noto-sans-kr/400Regular/NotoSansKR_400Regular.ttf', True),
    ('noto-sans-kr-500', 'noto-sans-kr/500Medium/NotoSansKR_500Medium.ttf', True),
    ('noto-sans-kr-700', 'noto-sans-kr/700Bold/NotoSansKR_700Bold.ttf', True),
    ('noto-sans-kr-800', 'noto-sans-kr/800ExtraBold/NotoSansKR_800ExtraBold.ttf', True),
    ('jetbrains-mono-500', 'jetbrains-mono/500Medium/JetBrainsMono_500Medium.ttf', False),
    ('jetbrains-mono-700', 'jetbrains-mono/700Bold/JetBrainsMono_700Bold.ttf', False),
]
for name, src, korean in FONTS:
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['*']
    opts.name_IDs = [1, 2]
    opts.notdef_outline = True
    font = subset.load_font(os.path.join(NM, src), opts)
    sub = subset.Subsetter(opts)
    sub.populate(text=''.join(sorted(chars)) if korean else ''.join(chr(c) for c in range(0x20, 0x7F)) + '·→←✓')
    sub.subset(font)
    dst = os.path.join(OUT, name + '.woff2')
    subset.save_font(font, dst, opts)
    print(name, os.path.getsize(dst) // 1024, 'KB')
