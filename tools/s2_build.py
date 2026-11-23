# 세션 2 발표자료(권재열) PPTX → 16:9 HTML 덱 (session2.html)
# 원본 레이아웃(도형 위치 · 표 · 차트)을 그대로 두고, 색 · 서체만 메인 스크린 톤(어두운 배경 · 파랑/초록 강조)으로 바꿈.
# python3 s2_build.py SRC.pptx OUT_DIR   → OUT_DIR/session2.html, OUT_DIR/assets/s2/*.png
import sys, os, html, re
from pptx import Presentation
from pptx.enum.dml import MSO_FILL
from pptx.enum.shapes import MSO_SHAPE_TYPE
from lxml import etree
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from s2_custom import CUSTOM, SKIP, EXTRA, CHART_TITLE
CUR = [0]

SRC, OUT = sys.argv[1], sys.argv[2]
A = '{http://schemas.openxmlformats.org/drawingml/2006/main}'
P = '{http://schemas.openxmlformats.org/presentationml/2006/main}'
K = 2 / 12700          # EMU → px (960pt 슬라이드 → 1920px)
os.makedirs(f'{OUT}/assets/s2', exist_ok=True)

# ── 색 바꾸기: 원본(밝은 배경 · 주황/파랑) → 스크린 톤 ──
FILL = {
 'ED7D31': '#00ada9',      # 주황 태그 · 강조 박스 → 초록
 '4472C4': '#0081cc', '5B9BD5': '#0081cc',   # 파랑 → 스크린 파랑
 '1F3864': '#12263b',      # 남색
 'CFDDEE': 'rgba(0,129,204,.14)', 'E9EFF7': 'rgba(255,255,255,.055)',
 'FCE9DB': 'rgba(0,173,169,.13)', 'F2F2F2': 'rgba(255,255,255,.06)', 'FFFFFF': 'rgba(255,255,255,.06)',
 '7F7F7F': '#3a414c', 'AAE571': '#2f7a4f',
}
TXT = {'262626': '#E6EBF2', '2B3A4D': '#E6EBF2', '1B2430': '#E6EBF2', 'FFFFFF': '#FFFFFF',
       'ED7D31': '#00ada9', '4472C4': '#0081cc', '7F7F7F': '#8b95a5'}
THEME_FILL = {'ACCENT_1 (5)': '#0081cc', 'BACKGROUND_2 (16)': 'rgba(255,255,255,.06)', 'BACKGROUND_1 (14)': 'rgba(255,255,255,.06)'}
THEME_TXT = {'BACKGROUND_1 (14)': '#FFFFFF', 'TEXT_1 (13)': '#E6EBF2'}

def fcol(fill, default=None):
    try:
        if fill.type == MSO_FILL.SOLID:
            try: return FILL.get(str(fill.fore_color.rgb), '#' + str(fill.fore_color.rgb))
            except Exception: return THEME_FILL.get(str(fill.fore_color.theme_color), 'rgba(255,255,255,.06)')
        if fill.type == MSO_FILL.BACKGROUND: return None
        if fill.type is None: return default
    except Exception: return default
    return None

def tcol(font, default):
    try:
        c = font.color
        if c and c.type is not None:
            try: return TXT.get(str(c.rgb), '#E6EBF2')
            except Exception: return THEME_TXT.get(str(c.theme_color), default)
    except Exception: pass
    return default

def esc(t): return html.escape(t).replace('\v', '<br>')

MINPX = 23   # A안: 본문 최소 23px (원본 10pt → 23px)
def px(pt): return max(pt * 2, MINPX) if pt < 16 else pt * 2
FORCE = [None]  # 역할 색(머리글 · 강조)을 강제할 때
def rcol(f, dcol):
    if FORCE[0]: return FORCE[0]
    c = tcol(f, dcol)
    if c == '#00ada9':  # 원본 주황 글자: 큰 숫자 · 결론은 초록, 그 밖(예상 부담 라벨 등)은 주황 경고색
        c = '#00ada9' if (f.size and f.size.pt >= 18) else '#ffb74d'
    return c
def runs_html(par, dcol):
    out = []
    for r in par.runs:
        t = r.text
        if not t: continue
        f = r.font; st = []
        if f.size: st.append(f'font-size:{px(f.size.pt):.0f}px')
        b = f.bold
        nm = f.name or ''
        if 'ExtraBold' in nm or 'HGGothic' in nm: st.append('font-family:KakaoBig;font-weight:700')
        elif b: st.append('font-weight:700')
        st.append('color:' + rcol(f, dcol))
        out.append(f'<span style="{";".join(st)}">{esc(t)}</span>')
    # 줄바꿈(<a:br>) 반영
    xml = etree.tostring(par._p, encoding=str)
    if '<a:br' in xml:
        out = []
        for el in par._p:
            tag = etree.QName(el).localname
            if tag == 'br': out.append('<br>')
            elif tag == 'r':
                from pptx.text.text import _Run
                r = _Run(el, par); t = r.text
                if not t: continue
                f = r.font; st = []
                if f.size: st.append(f'font-size:{px(f.size.pt):.0f}px')
                nm = f.name or ''
                if 'ExtraBold' in nm or 'HGGothic' in nm: st.append('font-family:KakaoBig;font-weight:700')
                elif f.bold: st.append('font-weight:700')
                st.append('color:' + rcol(f, dcol))
                out.append(f'<span style="{";".join(st)}">{esc(t)}</span>')
    return ''.join(out)

ALG = {'CENTER': 'center', 'RIGHT': 'right', 'JUSTIFY': 'justify', 'LEFT': 'left'}
def tf_html(tf, dcol, dsize=None):
    ps = []
    for par in tf.paragraphs:
        inner = runs_html(par, dcol)
        pPr = par._p.find(A + 'pPr')
        bu = pPr is not None and pPr.find(A + 'buChar') is not None
        st = []
        if par.alignment is not None: st.append('text-align:' + ALG.get(str(par.alignment).split('.')[-1].split(' ')[0], 'left'))
        marL = int(pPr.get('marL', 0)) if pPr is not None else 0
        ind = int(pPr.get('indent', 0)) if pPr is not None else 0
        if bu:
            ml = max(marL * K, 22); st.append(f'padding-left:{ml:.0f}px;text-indent:-22px')  # 글머리 폭(22px)만큼 내어쓰기 → 둘째 줄이 첫 줄 글자에 맞음
        elif marL: st.append(f'padding-left:{marL*K:.0f}px')
        if par.space_before is not None: st.append(f'margin-top:{par.space_before.pt*2:.0f}px')
        if par.space_after is not None: st.append(f'margin-bottom:{par.space_after.pt*2:.0f}px')
        ls = par.line_spacing
        if isinstance(ls, float): st.append(f'line-height:{ls*1.22:.2f}')
        if not inner:
            sz = None
            epr = par._p.find(A + 'endParaRPr')
            if epr is not None and epr.get('sz'): sz = int(epr.get('sz')) / 100 * 2
            ps.append(f'<p style="height:{(sz or 20)*1.2:.0f}px"></p>'); continue
        if bu:
            buc = pPr.find(A + 'buChar').get('char', '•')
            inner = f'<i class="bu">{esc(buc if buc not in "§Ø" else "•")}</i>' + inner
        ps.append(f'<p style="{";".join(st)}">{inner}</p>')
    return ''.join(ps)

def body_style(tf_el):
    bp = tf_el.find(A + 'bodyPr') if tf_el is not None else None
    g = lambda k, d: int(bp.get(k)) * K if bp is not None and bp.get(k) is not None else d
    l, t, r, b = g('lIns', 91440 * K), g('tIns', 45720 * K), g('rIns', 91440 * K), g('bIns', 45720 * K)
    anc = bp.get('anchor', 't') if bp is not None else 't'
    jc = {'t': 'flex-start', 'ctr': 'center', 'b': 'flex-end'}.get(anc, 'flex-start')
    return f'padding:{t:.0f}px {r:.0f}px {b:.0f}px {l:.0f}px;justify-content:{jc}'

imgn = [0]
def save_img(blob, ext):
    imgn[0] += 1; fn = f'img{imgn[0]}.{ext}'
    open(f'{OUT}/assets/s2/{fn}', 'wb').write(blob); return f'assets/s2/{fn}'

def chart_html(ch, x, y, w, h):
    pl = ch.plots[0]; cats = list(pl.categories); ser = list(pl.series)
    vmax = max(max(v for v in s.values if v is not None) for s in ser) * 1.18
    cols = ['rgba(242,245,250,.38)', '#0081cc']
    if len(ser) == 1: cols = ['#0081cc']
    gw = w / len(cats); bw = min(46, gw * .7 / len(ser))
    ttl = CHART_TITLE.get(CUR[0])
    out = [f'<div class="chart{" t" if ttl else ""}" style="left:{x:.0f}px;top:{y:.0f}px;width:{w:.0f}px;height:{h:.0f}px">' + (f'<p class="ct">{esc(ttl)}</p>' if ttl else '')]
    ph = h - 54 - (34 if len(ser) > 1 else 0) - (44 if ttl else 0)
    for i, c in enumerate(cats):
        cx = gw * i + gw / 2
        for j, s in enumerate(ser):
            v = s.values[i]; bh = v / vmax * ph
            bx = cx - bw * len(ser) / 2 + j * bw
            lab = f'{v:g}' if v != int(v) else f'{int(v)}'
            out.append(f'<div class="cb" style="left:{bx:.0f}px;width:{bw-4:.0f}px;height:{bh:.0f}px;bottom:44px;background:{cols[j%len(cols)]}"><i>{lab}</i></div>')
        out.append(f'<div class="cl" style="left:{gw*i:.0f}px;width:{gw:.0f}px">{esc(str(c))}</div>')
    if len(ser) > 1:
        out.append('<div class="clg">' + ''.join(f'<span><b style="background:{cols[j]}"></b>{esc(s.name)}</span>' for j, s in enumerate(ser)) + '</div>')
    out.append('</div>'); return ''.join(out)

def raw(fill):
    try:
        if fill.type == MSO_FILL.SOLID:
            try: return str(fill.fore_color.rgb)
            except Exception: return 'T:' + str(fill.fore_color.theme_color)
    except Exception: pass
    return None
STRONG = ('ED7D31', '4472C4', '5B9BD5', '1F3864', '7F7F7F', 'T:ACCENT_1 (5)')

def table_html(tb, x, y, w, h):
    colw = [c.width * K for c in tb.columns]
    rows = list(tb.rows)
    # "경영상 ~" 열 = 결론 열 (옅은 초록)
    hi = set(); lo = set()
    for ci, cell in enumerate(rows[0].cells):
        if '경영상' in cell.text_frame.text or '파급' in cell.text_frame.text: hi.add(ci)
        if '개정 전' in cell.text_frame.text or '기존' in cell.text_frame.text: lo.add(ci)
    out = [f'<table class="tb" style="left:{x:.0f}px;top:{y:.0f}px;width:{sum(colw):.0f}px"><colgroup>' + ''.join(f'<col style="width:{cw:.0f}px">' for cw in colw) + '</colgroup>']
    for ri, row in enumerate(rows):
        out.append(f'<tr style="height:{row.height*K*.92:.0f}px">')
        for ci, cell in enumerate(row.cells):
            if cell.is_spanned: continue
            span = ''
            if cell.is_merge_origin:
                if cell.span_width > 1: span += f' colspan="{cell.span_width}"'
                if cell.span_height > 1: span += f' rowspan="{cell.span_height}"'
            r = raw(cell.fill)
            hdr = r in STRONG
            first = (ci == 0 and not hdr and r in ('CFDDEE', 'E9EFF7', None) and len(colw) > 2)
            cls = 'th' if hdr else ('c1' if first else ('hi' if ci in hi else ('lo' if ci in lo else '')))
            FORCE[0] = '#9AA6B5' if hdr else ('#0081cc' if first else None)
            tcPr = cell._tc.find(A + 'tcPr')
            anc = tcPr.get('anchor', 't') if tcPr is not None else 't'
            va = {'t': 'top', 'ctr': 'middle', 'b': 'bottom'}.get(anc, 'top')
            mg = lambda k, d: int(tcPr.get(k)) * K if tcPr is not None and tcPr.get(k) else d
            pad = f'{mg("marT", 7.2)*.8:.0f}px {mg("marR", 14.4):.0f}px {mg("marB", 7.2)*.8:.0f}px {mg("marL", 14.4):.0f}px'
            out.append(f'<td{span} class="{cls}" style="vertical-align:{va};padding:{pad}">{tf_html(cell.text_frame, "#E6EBF2")}</td>')
            FORCE[0] = None
        out.append('</tr>')
    out.append('</table>'); return ''.join(out)

PRST_CLIP = {
 'homePlate': 'polygon(0 0,calc(100% - var(--ar)) 0,100% 50%,calc(100% - var(--ar)) 100%,0 100%)',
 'chevron': 'polygon(0 0,calc(100% - var(--ar)) 0,100% 50%,calc(100% - var(--ar)) 100%,0 100%,var(--ar) 50%)',
 'rightArrow': 'polygon(0 25%,60% 25%,60% 0,100% 50%,60% 100%,60% 75%,0 75%)',
}

def shape_html(sh, tx=lambda x, y: (x, y), sx=1, sy=1, slide_no=0):
    t = sh.shape_type
    x0, y0 = tx(sh.left or 0, sh.top or 0)
    x, y, w, h = x0 * K, y0 * K, (sh.width or 0) * sx * K, (sh.height or 0) * sy * K
    nm = sh.name or ''
    if '編號' in nm or '번호' in nm: return f'<div class="pno" style="left:{x:.0f}px;top:{y:.0f}px;width:{w:.0f}px;height:{h:.0f}px">{esc(sh.text_frame.text) if sh.has_text_frame else ""}</div>'
    if t == MSO_SHAPE_TYPE.GROUP:
        xf = sh._element.find(P + 'grpSpPr').find(A + 'xfrm')
        off, ext, cho, che = [xf.find(A + k) for k in ('off', 'ext', 'chOff', 'chExt')]
        ox, oy, ex, ey = int(off.get('x')), int(off.get('y')), int(ext.get('cx')), int(ext.get('cy'))
        cx, cy, cex, cey = int(cho.get('x')), int(cho.get('y')), int(che.get('cx')), int(che.get('cy'))
        fx, fy = ex / cex, ey / cey
        sub = lambda X, Y: tx(ox + (X - cx) * fx, oy + (Y - cy) * fy)
        return ''.join(shape_html(c, sub, sx * fx, sy * fy, slide_no) for c in sh.shapes)
    if t == MSO_SHAPE_TYPE.TABLE: return table_html(sh.table, x, y, w, h)
    if getattr(sh, 'has_chart', False) and sh.has_chart: return chart_html(sh.chart, x, y, w, h)
    if t == MSO_SHAPE_TYPE.PICTURE:
        src = save_img(sh.image.blob, sh.image.ext)
        cls = 'pic'
        if w < 80 and h < 80: cls += ' icon'
        return f'<img class="{cls}" data-s="{slide_no}" src="{src}" style="left:{x:.0f}px;top:{y:.0f}px;width:{w:.0f}px;height:{h:.0f}px" alt="">'
    if t == MSO_SHAPE_TYPE.LINE or (t == MSO_SHAPE_TYPE.AUTO_SHAPE and False):
        return f'<div class="ln" style="left:{x:.0f}px;top:{y:.0f}px;width:{max(w,2):.0f}px;height:{max(h,2):.0f}px"></div>'
    # 단계 화살표(homePlate) → 단계 머리: 번호 배지 + 이름, 다음 단계가 있으면 사이에 원형 화살표
    pg0 = sh._element.find('.//' + A + 'prstGeom')
    if pg0 is not None and pg0.get('prst') in ('homePlate', 'chevron') and sh.has_text_frame:
        txt = ' '.join(sh.text_frame.text.split())
        m = re.match(r'(\d)\s*단계\s*(.*)', txt)
        nx = id(sh) in STEP_NEXT
        cls = 'step' + (' nx' if nx else ' last')
        if m: inner = f'<b class="sn">{int(m.group(1)):02d}</b><span>{esc(m.group(2))}</span>'
        else: inner = f'<span>{esc(txt)}</span>'
        return f'<div class="{cls}" style="left:{x:.0f}px;top:{y:.0f}px;width:{w:.0f}px;height:{h:.0f}px">{inner}</div>'
    # 도형 · 글상자
    is_auto = t in (MSO_SHAPE_TYPE.AUTO_SHAPE, MSO_SHAPE_TYPE.PLACEHOLDER) or (t == MSO_SHAPE_TYPE.FREEFORM)
    has_style = sh._element.find(P + 'style') is not None
    r = raw(sh.fill) if hasattr(sh, 'fill') else None
    if r is None and is_auto and has_style:
        try: r = 'T:ACCENT_1 (5)' if sh.fill.type is None else None
        except Exception: r = None
    txt = sh.text_frame.text if sh.has_text_frame else ''
    role = None
    if r in STRONG:   # 원본 색 면(머리글 · 단계 · 표지) → 같은 회색 면 + 역할 글자색
        bg = 'rgba(255,255,255,.075)'
        role = {'ED7D31': '#ffb74d' if '부담' in txt else ('#00ada9' if re.search(r'개정 후|대응|경영상 변화', txt) else '#0081cc'), '1F3864': '#FFFFFF', '7F7F7F': '#9AA6B5'}.get(r, '#0081cc')
    elif r is None: bg = None
    else: bg = {'CFDDEE': 'rgba(255,255,255,.035)', 'AAE571': 'rgba(255,255,255,.05)'}.get(r, 'rgba(255,255,255,.045)')
    prst = None
    pg = sh._element.find('.//' + A + 'prstGeom')
    if pg is not None: prst = pg.get('prst')
    st = [f'left:{x:.0f}px;top:{y:.0f}px;width:{w:.0f}px;height:{h:.0f}px']
    if bg: st.append(f'background:{bg}')
    try:
        ln = sh.line
        if ln.fill.type == MSO_FILL.SOLID:
            try: lc = FILL.get(str(ln.color.rgb), '#' + str(ln.color.rgb))
            except Exception: lc = '#0081cc'
            if lc.startswith('rgba'): lc = 'rgba(0,129,204,.35)'
            st.append(f'box-shadow:inset 0 0 0 2px {lc}')
    except Exception: pass
    if prst == 'roundRect': st.append(f'border-radius:{min(w,h)*.18:.0f}px')
    elif prst == 'ellipse': st.append('border-radius:50%')
    elif prst in PRST_CLIP: st.append(f'--ar:{h*.38:.0f}px;clip-path:{PRST_CLIP[prst]}')
    inner = ''
    if sh.has_text_frame and sh.text_frame.text.strip():
        FORCE[0] = role
        inner = tf_html(sh.text_frame, '#E6EBF2')
        FORCE[0] = None
        if role: st.append('font-weight:700')
        if txt.strip().startswith('※'): return f'<div class="sh foot" style="{";".join(st)}">{inner}</div>'
        if id(sh) in STEP_BODY: return f'<div class="sh stepb" style="{";".join(st)}">{inner}</div>'
        st.append(body_style(sh._element.find('.//' + P + 'txBody')))
    elif not bg and 'box-shadow' not in ';'.join(st): return ''
    kc = ' hdr' if role else (' pnl' if bg else '')
    if role: st.append(f'--rc:{role}')
    return f'<div class="sh{kc}" style="{";".join(st)}">{inner}</div>'

prs = Presentation(SRC)
STEP_NEXT = set(); STEP_BODY = set()
slides = []
E = 12700
for i, s in enumerate(prs.slides, 1):
    shs = list(s.shapes)
    hd = {}
    body_sh = []
    for sh in shs:
        t = sh.shape_type
        top = (sh.top or 0) / E
        nm = sh.name or ''
        if 2 <= i <= 29 and top < 150 and t not in (MSO_SHAPE_TYPE.TABLE, MSO_SHAPE_TYPE.CHART, MSO_SHAPE_TYPE.PICTURE, MSO_SHAPE_TYPE.GROUP) and '編號' not in nm:
            tx_ = sh.text_frame.text.strip() if sh.has_text_frame else ''
            if t == MSO_SHAPE_TYPE.LINE or not tx_: continue
            if (sh.width or 0) / E < 60: hd['no'] = tx_
            elif top < 60: hd['title'] = tx_
            elif top < 115: hd['tag'] = tx_
            else: hd['head'] = tx_
            continue
        body_sh.append(sh)
    # 단계 화살표: 같은 줄 오른쪽에 다음 단계가 있는지
    hp = [sh for sh in body_sh if sh.shape_type == MSO_SHAPE_TYPE.AUTO_SHAPE and sh._element.find('.//' + A + 'prstGeom') is not None and sh._element.find('.//' + A + 'prstGeom').get('prst') in ('homePlate', 'chevron')]
    for a_ in hp:
        if any(b_ is not a_ and abs(b_.top - a_.top) < 6 * E and b_.left > a_.left for b_ in hp): STEP_NEXT.add(id(a_))
        for t_ in body_sh:   # 단계 바로 아래 글상자(설명) → 단계에 붙은 상자로
            if t_.shape_type == MSO_SHAPE_TYPE.TEXT_BOX and abs(t_.left - a_.left) < 4 * E and 0 <= t_.top - (a_.top + a_.height) < 12 * E and t_.height < 90 * E: STEP_BODY.add(id(t_))
    # 핵심 · 시사점: 글상자 + 그 아래 면을 하나로
    tk = [sh for sh in body_sh if sh.has_text_frame and re.match(r'\s*(핵심|시사점|경영상 파급)', sh.text_frame.text)]
    skip = set(); tkbox = {}
    for t_ in tk:
        tx0, ty0, tw, th = t_.left, t_.top, t_.width, t_.height
        for sh in body_sh:
            if sh is t_ or sh.shape_type != MSO_SHAPE_TYPE.AUTO_SHAPE: continue
            if sh.has_text_frame and sh.text_frame.text.strip(): continue
            ox = max(0, min(tx0 + tw, sh.left + sh.width) - max(tx0, sh.left)); oy = max(0, min(ty0 + th, sh.top + sh.height) - max(ty0, sh.top))
            if ox * oy > .6 * tw * th:
                skip.add(id(sh)); tkbox[id(t_)] = (min(tx0, sh.left), min(ty0, sh.top), max(tx0 + tw, sh.left + sh.width) - min(tx0, sh.left), max(ty0 + th, sh.top + sh.height) - min(ty0, sh.top))
    CUR[0] = i
    parts = []
    ctx = {'save_img': save_img, 'slide': s}
    if i in CUSTOM:
        body_sh = [sh for sh in body_sh if '編號' in (sh.name or '') or '번호' in (sh.name or '')]
        parts.append(CUSTOM[i](ctx))
    body_sh = [sh for sh in body_sh if (sh.name or '') not in SKIP.get(i, ())]
    if i in EXTRA: parts.append(EXTRA[i](ctx))
    for sh in body_sh:
        if id(sh) in skip: continue
        if sh in tk:
            bx, by, bw, bh = tkbox.get(id(sh), (sh.left, sh.top, sh.width, sh.height))
            paras = []
            for par in sh.text_frame.paragraphs:
                t = ''.join(r.text for r in par.runs).strip()
                if t: paras.append(t)
            first = paras[0]
            m = re.match(r'(핵심|시사점|경영상 파급)\s*(.*)', first)
            lab, rest = m.group(1), m.group(2)
            body = ([rest] if rest else []) + paras[1:]
            li = ''.join(f'<p>{esc(t.lstrip("·• "))}</p>' for t in body)
            parts.append(f'<div class="tk" data-b="1" style="left:{bx*K:.0f}px;top:{by*K:.0f}px;width:{bw*K:.0f}px;min-height:{bh*K:.0f}px"><b>{esc(lab)}</b><div>{li}</div></div>')
            continue
        parts.append(shape_html(sh, slide_no=i))
    head = ''
    if hd:
        eb = f'<span class="rn">{esc(hd.get("no",""))}</span>{esc(hd.get("title",""))}'
        h = esc(hd.get('head', ''))
        if hd.get('tag'): h = f'<span class="tag">{esc(hd["tag"])}</span>' + h   # 원본 첫 박스(구분 태그): 헤드라인 앞 블록으로
        head = f'<header class="hd"><p class="eb">{eb}</p><h2>{h}</h2></header>'
    slides.append((i, head + ''.join(parts)))

# ── 덱 HTML ──
HEAD = open(os.path.join(os.path.dirname(__file__), 's2_shell.html'), encoding='utf-8').read()
secs = '\n'.join(f'<section class="s" id="P{i:02d}" data-n="{i}">{b}</section>' for i, b in slides)
# 오른쪽 끝선 통일: 오른쪽 끝이 1800~1900px 사이인 상자·표·단계는 모두 1886px(좌 여백 34px과 대칭)에 맞춤
def _rx(m):
    l, w = float(m.group(2)), float(m.group(4))
    if 1800 <= l + w <= 1900 and 'class="pno"' not in m.group(0): return f'{m.group(1)}{m.group(2)}px{m.group(3)}width:{RX - l:.0f}px'
    return m.group(0)
RX = 1886
ST = re.compile(r'(<(?:div|table|p)[^>]*?style="left:)(-?[\d.]+)px(;top:-?[\d.]+px;)width:([\d.]+)px')
def _steps(sec):
    # 단계(.step) 열은 간격을 유지한 채 균등 폭으로 다시 나눠 오른쪽 끝을 RX에 맞춤
    cols = sorted({(float(a), float(b)) for a, b in re.findall(r'class="step[^"]*" style="left:([\d.]+)px;top:[\d.]+px;width:([\d.]+)px', sec)})
    if len(cols) < 2 or not (1800 <= cols[-1][0] + cols[-1][1] <= 1900): return sec
    gap = cols[1][0] - (cols[0][0] + cols[0][1]); n = len(cols); L0 = cols[0][0]
    nw = (RX - L0 - gap * (n - 1)) / n
    mp = {(round(l), round(l + w)): (L0 + i * (nw + gap), nw) for i, (l, w) in enumerate(cols)}
    def f(m):
        l, w = float(m.group(2)), float(m.group(4)); k = (round(l), round(l + w))
        if k in mp: nl, nw_ = mp[k]; return f'{m.group(1)}{nl:.0f}px{m.group(3)}width:{nw_:.0f}px'
        return m.group(0)
    return ST.sub(f, sec)
secs = re.sub(r'<section.*?</section>', lambda m: _steps(m.group(0)), secs, flags=re.S)
secs = re.sub(r'(<(?:div|table|p)[^>]*?style="left:)(-?[\d.]+)px(;top:-?[\d.]+px;)width:([\d.]+)px', _rx, secs)
open(f'{OUT}/session2.html', 'w', encoding='utf-8').write(HEAD.replace('<!--SLIDES-->', secs))
print(len(slides), 'slides,', imgn[0], 'images')
