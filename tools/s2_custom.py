# 세션 2 덱 — 장별 맞춤 레이아웃 (s2_build.py 에서 불러씀)
# CUSTOM[n](ctx) → 본문 HTML (장 머리는 그대로)  ·  SKIP[n] = 원본에서 그리지 않을 도형 이름  ·  EXTRA[n](ctx) → 덧붙일 HTML
# ctx: save_img(blob, ext), esc, slide(pptx slide)
import html
esc = lambda t: html.escape(t)

CHART_TITLE = {
    7: '이사 총수별 필요 독립이사 수 (명, 예시)',
    10: '감사위원 수별 분리선출 2인의 비중 (%, 예시)',
    18: '선임 이사 수별 1인 선임 필요 지분율 (%, 약)',
}

def p3(ctx):
    # 네 가지 문제: 큰 아이콘 · 번호 · 제목 · 설명의 세로 카드 4장
    s = ctx['slide']; pics = []
    for sh in s.shapes:
        if sh.shape_type == 6:
            for c in sh.shapes:
                if c.shape_type == 13: pics.append(ctx['save_img'](c.image.blob, c.image.ext))
    items = [('예측가능성의 훼손', '기업 활동의 기본법인 상법이 연이어 바뀌어 지배구조 설계의 전제가 흔들림'),
             ('중첩된 시행과 준수 부담', '시행 시점이 엇갈려 정관 개정·이사회 구성·총회 운영을 단계마다 반복 대응'),
             ('개정 간 정합성 부족', '자기주식 소각 의무화·집중투표제 등으로 적대적 M&A에 대한 방어 여지는 줄었으나 대체 장치 논의는 후행. 충실의무 확대의 경영판단 보호 기준도 불명확하다는 지적'),
             ('해석·하위규범의 후행', '법 시행 뒤에야 길라잡이·가이드라인이 마련되어 현장의 해석 혼선과 소송 위험이 커짐')]
    cards = ''.join(f'''<div class="p3c"><div class="p3i"><img src="{pics[i] if i < len(pics) else ''}" alt=""></div><p class="p3n">0{i+1}</p><h3>{esc(t)}</h3><p class="p3d">{esc(d)}</p></div>''' for i, (t, d) in enumerate(items))
    return f'<div class="p3">{cards}</div><div class="p3l"><span>상법 개정</span><i></i><span>지배구조 · 정관 · 총회 운영 전반의 재설계</span></div>'

def p4(ctx):
    before = ['충실의무의 상대방은 회사', '주주 이익은 회사 이익을 통해 간접적으로 보호', '주주 간 불평등 대우에 대한 이사 책임 추궁이 어려움']
    after = ['이사는 회사뿐 아니라 주주를 위해서도 충실하게 직무 수행', '총주주의 이익 보호, 주주의 이익을 공평하게 대우', '합병·분할 등 구조개편에서 일반주주 이익 고려 요구 강화']
    imp = [('의사결정 기준', '주주가치·소수주주 영향을 이사회 안건 심의에 반영'), ('기록의 중요성', '판단 근거·대안 검토를 의사록에 남기는 관행 정착'),
           ('책임 리스크', '주주 대표소송·손해배상 청구의 법적 근거 확대'), ('경영판단 보호', '경영판단원칙 명문화 논의와 함께 균형점 모색')]
    li = lambda xs: ''.join(f'<li>{esc(x)}</li>' for x in xs)
    cards = ''.join(f'<div class="p4c"><p class="p4n">0{i+1}</p><h4>{esc(t)}</h4><p>{esc(d)}</p></div>' for i, (t, d) in enumerate(imp))
    return f'''<div class="ba"><div class="ba-b"><p class="ba-h">개정 전</p><ul>{li(before)}</ul></div><div class="ba-ar"></div><div class="ba-a"><p class="ba-h">개정 후 <small>제382조의3</small></p><ul>{li(after)}</ul></div></div>
<div class="p4i" data-b="1"><p class="p4t"><b>경영에 미치는 영향</b><span>이사회의 판단 기준 · 기록 · 책임이 함께 바뀐다</span></p><div class="p4g">{cards}</div></div>'''

def p6(ctx):
    unc = [('공평대우의 범위', '모든 주주를 ‘동일하게’ 대우하라는 의미인지, 합리적 차등을 허용하는지'),
           ('경영판단원칙의 명문화', '충분한 정보에 따라 선의로 판단한 이사의 면책 기준을 법에 둘지 논의 중'),
           ('배임죄와의 관계', '민사상 책임 확대와 형사상 배임 위험이 맞물려 의사결정이 위축될 우려')]
    act = ['이사회 안건 심의 프로세스 정비: 주주별 영향 검토 항목 신설', '중요 거래의 외부 평가·공정성 의견 확보 기준 마련',
           '의사록에 정보 수집·대안 검토·판단 근거를 구체적으로 기록', '이해상충 이사의 의결 배제와 독립이사 역할 강화', 'D&O 보험·내부 지침 정비 및 입법·판례 모니터링']
    u = ''.join(f'<div class="p6u"><b>{esc(t)}</b><p>{esc(d)}</p></div>' for t, d in unc)
    a = ''.join(f'<li><i>0{i+1}</i><span>{esc(x)}</span></li>' for i, x in enumerate(act))
    return f'''<div class="p6l"><p class="p6h">불확실성</p>{u}</div><div class="p6ar"></div>
<div class="p6r" data-b="1"><p class="p6h g">기업의 대응 방향</p><ol>{a}</ol></div>'''

def p19(ctx):
    person = '<svg viewBox="0 0 40 40"><circle cx="20" cy="12" r="7"/><path d="M6 38c0-8 6-14 14-14s14 6 14 14z"/></svg>'
    cand = lambda c: f'<span class="cd {c}">{person}</span>'
    return f'''<div class="p19l">
 <div class="p19q"><p class="lbl">청구 요건</p><p>발행주식총수의 1% 이상 보유 주주</p><p>의결권 없는 주식을 제외한 발행주식총수 기준.<br>주주총회일 <b>6주 전까지</b> 서면 또는 전자문서로 청구</p></div>
 <div class="p19k"><p class="lbl">집중투표란</p><p>이사 선임 시 1주당 1표가 아니라 <b>선임할 이사 수만큼</b> 의결권을 주고, 특정 후보에게 몰아서 또는 나눠서 투표할 수 있게 하는 제도</p></div>
</div>
<div class="p19d"><p class="p19dt">단순투표제와 집중투표제의 차이 <small>이사 3명 선임 · 소수주주 1주 기준</small></p>
 <div class="vt"><p class="vh">단순투표제 <small>후보마다 1표씩, 따로 표결</small></p>
  <div class="vr"><span class="sh2">{person}<em>소수주주</em></span>
   <svg class="va" viewBox="0 0 220 300" preserveAspectRatio="none"><path d="M10 150 C100 150 110 33 205 33"/><path d="M10 150 L205 150"/><path d="M10 150 C100 150 110 267 205 267"/></svg>
   <div class="cs"><p>{cand("a")}<em class="o">찬성 1</em></p><p>{cand("b")}<em>반대 1</em></p><p>{cand("b")}<em>반대 1</em></p></div></div>
  <p class="vf">표가 후보별로 나뉘어 <b>다수 주주의 뜻대로</b> 결정</p></div>
 <div class="vt g"><p class="vh">집중투표제 <small>1주 × 3표를 한 후보에게</small></p>
  <div class="vr"><span class="sh2">{person}<em>소수주주</em></span>
   <svg class="va" viewBox="0 0 220 300" preserveAspectRatio="none"><path d="M10 138 C110 138 115 27 205 27"/><path d="M10 150 C110 150 115 33 205 33"/><path d="M10 162 C110 162 115 39 205 39"/></svg>
   <div class="cs"><p>{cand("a")}<em class="o">3표 집중</em></p><p class="dim">{cand("b")}<em>의결 포기</em></p><p class="dim">{cand("b")}<em>의결 포기</em></p></div></div>
  <p class="vf">표를 모아 <b>소수주주 추천 이사</b> 선임 가능</p></div>
 <p class="src">※ 출처: 경향신문(2020.9.27.) 도식 재구성</p>
</div>
<div class="tk flat" data-b="1" style="left:34px;top:888px;width:1852px"><b>경영상 파급</b><div><p>이사 수 상한을 정관에 두면 소수주주가 이사를 선임하는 데 필요한 지분율이 높아져 방어 효과 (이사 수가 많을수록 문턱은 낮아짐)</p><p>시차임기제(분산 임기) 도입, 이사 임기 만료 현황 점검 등이 선제 대응 방안으로 거론됨</p><p>행동주의 펀드·소수주주 연대의 이사 추천 전략이 현실화될 가능성</p></div></div>'''

def p30(ctx):
    return '''<div class="end"><p class="end-s">Session 2.</p><p class="end-t">감사합니다</p><p class="end-e">Thank you</p><div class="end-r"></div>
<p class="end-ti">상법 개정과 전자주총이 몰고 올 기업 경영의 지각변동</p><p class="end-w"><b>권재열</b>한국주주총회연구소장, 경희대 법학전문대학원 교수</p></div>'''

CUSTOM = {3: p3, 4: p4, 6: p6, 19: p19, 30: p30}

# 18장: 8.0% 상자를 한 덩어리로 (세로 가운데)
SKIP = {18: {'Rectangle 7', 'TextBox 8', 'TextBox 9'}}
EXTRA = {18: lambda ctx: '<div class="stat" style="left:34px;top:716px;width:472px;height:268px"><p class="sv">8.0%</p><p>대규모 상장회사 264곳 중<br>도입 21곳 (’25.6.30. 기준)</p></div>'}
