import { useEffect, useMemo, useState } from 'react'
import { api, PLACES, placeLabel, STATUS, CLAIM_STATUS, estimate, FEE_RATE } from './api.js'
import { won, num, day, today, useRoute, Field, QuestCard, Shots, Decide, Stats, More, mapLink } from './ui.jsx'

const TABS = [
  ['home', '소개'],
  ['new', '의뢰 만들기'],
  ['quests', '내 의뢰'],
  ['claims', '인증 확인'],
  ['report', '리포트'],
]
// 고르는 목록에서는 빗물받이를 뺍니다(예전 기록 표시용으로 값은 남겨 둠).
const PLACE_PICK = PLACES.filter(([v]) => v !== 'drain')

export default function App() {
  const [route, go] = useRoute('home')
  const [partner, setPartner] = useState(api.partner())
  const [tick, setTick] = useState(0)
  const refresh = () => setTick((t) => t + 1)
  // 서버에 연결된 빌드는 로그인 상태와 업체 정보를 먼저 받아 옵니다.
  const [ready, setReady] = useState(!api.remote)
  const [down, setDown] = useState(null)
  useEffect(() => {
    if (!api.remote) return
    api
      .init()
      .then(() => setPartner(api.partner()))
      .catch((e) => setDown(e.message))
      .finally(() => setReady(true))
  }, [])
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [route])
  const needLogin = route !== 'home' && !partner
  // 확인을 기다리는 인증 수(메뉴에 표시). tick 이 바뀌면 다시 셉니다.
  const todo = useMemo(() => (partner && ready ? api.claims().filter((c) => c.status === 'submitted').length : 0), [partner, ready, tick])

  return (
    <div className="app">
      <header className="top">
        <div className="top-in">
          <a className="brand" href="#/home">
            <img src="./icon.png" alt="" />
            <span>
              집게표 <em>파트너</em>
            </span>
          </a>
          <nav aria-label="메뉴">
            {TABS.map(([k, label]) => (
              <a key={k} href={`#/${k}`} className={route === k ? 'on' : ''} aria-current={route === k ? 'page' : undefined}>
                {label}
                {k === 'claims' && todo > 0 ? <b className="count">{todo}</b> : null}
              </a>
            ))}
          </nav>
          {partner ? (
            <div className="who">
              <b>{partner.name}</b>
              <button
                className="link"
                onClick={async () => {
                  await api.leave()
                  setPartner(null)
                  go('home')
                }}
              >
                로그아웃
              </button>
            </div>
          ) : (
            <div className="who">
              <a className="link" href="#/new">
                로그인
              </a>
            </div>
          )}
        </div>
      </header>

      {api.remote ? null : (
        <div className="demo" role="note">
          시연 화면입니다. 입력한 내용은 이 브라우저에만 저장됩니다.
        </div>
      )}
      {down ? (
        <div className="demo" role="alert">
          서버에 연결하지 못했습니다. {down}
        </div>
      ) : null}

      <main className={route === 'home' && ready && !needLogin ? 'wide' : ''}>
        {!ready ? (
          <section className="tile narrow center">
            <p className="sub">불러오는 중…</p>
          </section>
        ) : needLogin ? (
          <Start onDone={setPartner} />
        ) : route === 'new' ? (
          <NewQuest partner={partner} onDone={() => (refresh(), go('quests'))} />
        ) : route === 'quests' ? (
          <Quests key={tick} onChange={refresh} />
        ) : route === 'claims' ? (
          <Claims key={tick} onChange={refresh} />
        ) : route === 'report' ? (
          <Report partner={partner} />
        ) : (
          <Home />
        )}
      </main>

      <footer>
        <div>집게표 파트너 · 요금은 시범 운영 기준이며 바뀔 수 있습니다.</div>
      </footer>
    </div>
  )
}

function Home() {
  return (
    <>
      <section className="band white">
        <div className="hero">
          <span className="eyebrow">집게표 파트너</span>
          <h1>
            치울 곳을 올리면,
            <br />
            동네가 치웁니다.
          </h1>
          <p className="lead">장소와 보상을 정해 의뢰하면 근처 주민이 치우고 사진으로 인증합니다.</p>
          <div className="row">
            <a className="btn" href="#/new">
              의뢰 만들기
            </a>
            <More href="#/report">리포트 예시 보기</More>
          </div>
          <div className="showcase">
            <QuestCard q={{ title: '호암지 산책로 쓰레기 줍기', partner: '충주시 제휴', place_type: 'park', reward_type: 'voucher', reward_amount: 5000 }} placeLabel={placeLabel} />
          </div>
          <p className="sub">앱 의뢰판 맨 위에 제휴 의뢰로 표시됩니다.</p>
        </div>
      </section>

      <section className="band">
        <div>
          <div className="title">
            <h2>확인된 활동에만 비용이 듭니다.</h2>
            <p>사진과 촬영 위치로 인증된 건만 정산합니다.</p>
          </div>
          <div className="facts">
            {[
              ['100', 'm', '인증 반경'],
              ['2', '장', '치우기 전·후 사진'],
              [Math.round(FEE_RATE * 100), '%', '운영 수수료 (시범)'],
              ['1', '일', '검토 기간'],
            ].map(([v, u, k]) => (
              <div key={k}>
                <b>
                  {v}
                  <small>{u}</small>
                </b>
                <span>{k}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band white">
        <div>
          <div className="title">
            <h2>네 단계면 끝납니다.</h2>
          </div>
          <div className="steps">
            {[
              ['의뢰 작성', '장소, 보상, 기간을 정합니다.'],
              ['운영진 검토', '영업일 하루 안에 공개 여부를 알려 드립니다.'],
              ['주민 해결', '앱 카메라로 치우기 전과 후를 찍습니다.'],
              ['리포트', '참여 인원과 결과를 PDF로 받습니다.'],
            ].map(([t, d], i) => (
              <div key={t}>
                <span>0{i + 1}</span>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="band">
        <div>
          <div className="title">
            <h2>받지 않는 의뢰</h2>
            <p>주민이 다칠 수 있는 일은 올릴 수 없습니다.</p>
          </div>
          <div className="nolist">
            {['깨진 유리, 주사기', '폐기물, 위험물', '사유지 무단 출입', '차도 위 작업', '환경 미화와 무관한 심부름'].map((t) => (
              <div key={t}>{t}</div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

function Start({ onDone }) {
  const [name, setName] = useState('')
  const [manager, setManager] = useState('')
  const [signedIn, setSignedIn] = useState(api.signedIn())
  const [mode, setMode] = useState('in')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const run = async (fn) => {
    setBusy(true)
    setMsg(null)
    try {
      await fn()
    } catch (e) {
      setMsg(e.message)
    }
    setBusy(false)
  }

  // 서버에 연결된 빌드: 먼저 이메일로 로그인합니다. 계정 하나가 업체 하나에 연결됩니다.
  if (!signedIn)
    return (
      <section className="tile narrow">
        <h2>{mode === 'in' ? '로그인' : '가입'}</h2>
        <p className="sub">업체 계정 하나에 업체 하나가 연결됩니다.</p>
        <div className="seg" role="radiogroup" aria-label="로그인 또는 가입">
          {[
            ['in', '로그인'],
            ['up', '가입'],
          ].map(([k, label]) => (
            <label key={k} className={mode === k ? 'on' : ''}>
              <input type="radio" name="mode" checked={mode === k} onChange={() => setMode(k)} />
              {label}
            </label>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            run(async () => {
              const d = await api.signIn(email.trim(), pw, mode)
              if (d === 'confirm') {
                setMode('in')
                setMsg('확인 메일을 보냈습니다. 메일의 링크를 누른 뒤 로그인하세요.')
                return
              }
              if (api.partner()) onDone(api.partner())
              else setSignedIn(true)
            })
          }}
        >
          <Field label="이메일">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </Field>
          <Field label="비밀번호" hint="6자 이상">
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} minLength={6} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} required />
          </Field>
          {msg ? <p className="err">{msg}</p> : null}
          <button className="btn" disabled={busy}>
            {busy ? '확인 중…' : mode === 'in' ? '로그인' : '가입'}
          </button>
        </form>
      </section>
    )

  return (
    <section className="tile narrow">
      <h2>업체 정보</h2>
      <p className="sub">{api.remote ? '등록하면 운영진이 사업자 확인을 위해 연락드립니다.' : '시연에서는 이름만 받습니다.'}</p>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (name.trim()) run(async () => onDone(await api.start(name, manager)))
        }}
      >
        <Field label="업체·기관 이름">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 충주시 자원순환과" maxLength={30} required />
        </Field>
        <Field label="담당자 이름 (선택)">
          <input value={manager} onChange={(e) => setManager(e.target.value)} maxLength={20} />
        </Field>
        {msg ? <p className="err">{msg}</p> : null}
        <button className="btn" disabled={!name.trim() || busy}>
          {busy ? '등록 중…' : '등록'}
        </button>
      </form>
    </section>
  )
}

const EMPTY = { title: '', description: '', place_type: 'park', place_name: '', address: '', proof_mode: 'before_after', reward_type: 'voucher', reward_amount: 5000, capacity: 20, starts_on: '', ends_on: '' }

function NewQuest({ partner, onDone }) {
  const [q, setQ] = useState(EMPTY)
  const [agree, setAgree] = useState(false)
  const set = (k) => (e) => setQ({ ...q, [k]: e.target.value })
  const cost = estimate(q)
  const errors = useMemo(() => {
    const e = []
    if (q.title.trim().length < 5) e.push('제목은 5자 이상')
    if (!q.place_name.trim()) e.push('장소 이름 필요')
    if (!q.address.trim()) e.push('주소 필요')
    if (!(q.reward_amount >= 1000)) e.push('1인 보상은 1,000원 이상')
    if (!(q.capacity >= 1 && q.capacity <= 500)) e.push('모집 인원은 1~500명')
    if (!q.starts_on || !q.ends_on) e.push('기간 필요')
    else if (q.ends_on < q.starts_on) e.push('종료일이 시작일보다 빠릅니다')
    if (!agree) e.push('안전 기준 확인 필요')
    return e
  }, [q, agree])

  return (
    <>
    <div className="head">
      <div>
        <h2>의뢰 만들기</h2>
        <p className="sub">운영진 확인 후 앱에 공개됩니다.</p>
      </div>
    </div>
    <div className="split">
      <form
        className="tile"
        onSubmit={async (e) => {
          e.preventDefault()
          if (errors.length) return
          try {
            await api.create({ ...q, reward_amount: Number(q.reward_amount), capacity: Number(q.capacity) })
            onDone()
          } catch (err) {
            window.alert(err.message)
          }
        }}
      >
        <Field label="제목" hint="앱 카드에 그대로 표시됩니다">
          <input value={q.title} onChange={set('title')} placeholder="예: 호암지 산책로 쓰레기 줍기" maxLength={30} />
        </Field>
        <Field label="설명">
          <textarea value={q.description} onChange={set('description')} rows={3} maxLength={200} placeholder="치울 범위와 주의할 점" />
        </Field>

        <div className="group">
          <span className="k">장소</span>
          <div className="grid2">
            <Field label="장소 유형">
              <select value={q.place_type} onChange={set('place_type')}>
                {PLACE_PICK.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="장소 이름">
              <input value={q.place_name} onChange={set('place_name')} placeholder="예: 호암지 생태공원" maxLength={30} />
            </Field>
          </div>
          <Field label="주소" hint="지도에서 고르기는 준비 중입니다">
            <input value={q.address} onChange={set('address')} placeholder="예: 충주시 호암동 568" maxLength={60} />
          </Field>
          <Field label="인증 방식">
            <div className="seg">
              {[
                ['before_after', '전·뒤 사진 2장'],
                ['single', '사진 1장'],
              ].map(([v, l]) => (
                <label key={v} className={q.proof_mode === v ? 'on' : ''}>
                  <input type="radio" name="proof" checked={q.proof_mode === v} onChange={() => setQ({ ...q, proof_mode: v })} />
                  {l}
                </label>
              ))}
            </div>
          </Field>
        </div>

        <div className="group">
          <span className="k">보상과 기간</span>
          <div className="grid2">
            <Field label="보상 종류">
              <select value={q.reward_type} onChange={set('reward_type')}>
                <option value="voucher">지역 상품권</option>
                <option value="coupon">매장 쿠폰</option>
                <option value="point">앱 포인트</option>
              </select>
            </Field>
            <Field label="1인 보상 (원)">
              <input type="number" min={1000} step={500} value={q.reward_amount} onChange={set('reward_amount')} />
            </Field>
            <Field label="모집 인원 (명)">
              <input type="number" min={1} max={500} value={q.capacity} onChange={set('capacity')} />
            </Field>
            <div />
            <Field label="시작일">
              <input type="date" value={q.starts_on} onChange={set('starts_on')} />
            </Field>
            <Field label="종료일">
              <input type="date" value={q.ends_on} onChange={set('ends_on')} />
            </Field>
          </div>
        </div>

        <label className="check">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          <span>위험물, 출입 제한 구역, 차도 위 작업이 없는 환경 미화 의뢰입니다.</span>
        </label>
        {errors.length ? <p className="err">{errors[0]}</p> : null}
        <button className="btn" disabled={errors.length > 0}>
          검토 요청하기
        </button>
      </form>

      <aside>
        <div className="tile dark">
          <span className="k">앱에서 보이는 모습</span>
          <QuestCard q={{ ...q, partner: `${partner.name} 제휴` }} placeLabel={placeLabel} />
        </div>
        <div className="tile">
          <span className="k">최대 예상 비용</span>
          <span className="total">
            {num(cost.total)}
            <small>원</small>
          </span>
          <dl className="cost">
              <dt>
                보상 {won(q.reward_amount)} × {num(q.capacity)}명
              </dt>
              <dd>{won(cost.reward)}</dd>
              <dt>운영 수수료 {Math.round(FEE_RATE * 100)}% (시범)</dt>
              <dd>{won(cost.fee)}</dd>
          </dl>
          <p className="d">인증된 인원만큼만 청구합니다. 정산 방법은 공개 전에 안내합니다.</p>
        </div>
      </aside>
    </div>
    </>
  )
}

function Quests({ onChange }) {
  const list = api.quests()
  if (!list.length)
    return (
      <section className="tile narrow center" style={{ padding: 48 }}>
        <h2>올린 의뢰가 없습니다.</h2>
        <a className="btn" href="#/new">
          의뢰 만들기
        </a>
      </section>
    )
  const by = (s) => list.filter((q) => q.status === s).length
  const done = list.reduce((a, q) => a + (q.completed || 0), 0)
  return (
    <>
      <div className="head">
        <div>
          <h2>내 의뢰</h2>
          <p className="sub">{list.length}건</p>
        </div>
        <a className="btn small" href="#/new">
          새 의뢰
        </a>
      </div>
      <Stats
        items={[
          ['검토 중', by('review'), '건'],
          ['모집 중', by('open'), '건'],
          ['인증 완료', num(done), '명'],
        ]}
      />
      <section className="cards">
        {list.map((q) => {
          const [label, tone] = STATUS[q.status] || STATUS.review
          const pct = q.capacity ? Math.round((q.completed / q.capacity) * 100) : 0
          return (
            <article key={q.id} className="tile">
              <div>
                <span className={`badge ${tone}`}>{label}</span>
                {q.sample ? <span className="badge plain">예시</span> : null}
              </div>
              <h3>{q.title}</h3>
              <p className="sub">
                {q.place_name} · {placeLabel(q.place_type)} · {day(q.starts_on)} ~ {day(q.ends_on)}
              </p>
              {q.status === 'review' ? (
                <div className="row" style={{ justifyContent: 'space-between', marginTop: 4 }}>
                  <span className="d">영업일 하루 안에 결과를 알려 드립니다.</span>
                  <button
                    className="btn ghost small"
                    onClick={async () => {
                      try {
                        await api.cancel(q.id)
                      } catch (err) {
                        window.alert(err.message)
                      }
                      onChange()
                    }}
                  >
                    요청 취소
                  </button>
                </div>
              ) : q.status === 'rejected' ? (
                <p className="d">반려 사유: {q.reject_reason || '운영진에게 문의하세요'}</p>
              ) : (
                <>
                  <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 }}>
                    <span className="prog">
                      {q.completed}
                      <small> / {q.capacity}명</small>
                    </span>
                    <span className="k">1인 {won(q.reward_amount)}</span>
                  </div>
                  <div className="bar" role="img" aria-label={`완료 ${q.completed}명, 모집 ${q.capacity}명`}>
                    <i style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <p className="d">
                    수락 {q.joined}명 · 완료율 {pct}%{q.pending ? ` · 확인 대기 ${q.pending}건` : ''}
                  </p>
                </>
              )}
            </article>
          )
        })}
      </section>
    </>
  )
}

// 앱 사용자가 올린 인증을 업체 담당자가 확인합니다. 승인해야 보상이 지급되고, 기한 없이 업체가 반드시 판단합니다.
function Claims({ onChange }) {
  const list = api.claims()
  const [busy, setBusy] = useState(null)
  const [err, setErr] = useState(null)
  const todo = list.filter((c) => c.status === 'submitted').length
  const decide = async (c, approve, reason) => {
    setBusy(c.id)
    setErr(null)
    try {
      await api.review(c.id, approve, reason)
      onChange()
    } catch (e) {
      setErr(e.message)
      setBusy(null)
    }
  }
  if (!list.length)
    return (
      <section className="tile narrow center" style={{ padding: 48 }}>
        <h2>확인할 인증이 없습니다.</h2>
        <p className="sub">주민이 사진을 올리면 여기에 표시됩니다.</p>
      </section>
    )
  return (
    <>
      <div className="head">
        <div>
          <h2>인증 확인</h2>
          <p className="sub">승인하면 보상이 지급됩니다. 최근 30일.</p>
        </div>
      </div>
      <Stats
        items={[
          ['확인 대기', todo, '건', todo > 0],
          ['승인', list.filter((c) => c.status === 'approved').length, '건'],
          ['반려', list.filter((c) => c.status === 'rejected').length, '건'],
        ]}
      />
      {err ? (
        <p className="err" role="alert">
          {err}
        </p>
      ) : null}
      <section className="stack">
        {list.map((c) => {
          const [label, tone] = CLAIM_STATUS[c.status] || CLAIM_STATUS.submitted
          return (
            <article key={c.id} className="tile">
              <div>
                <span className={`badge ${tone}`}>{label}</span>
                {c.sample ? <span className="badge plain">예시</span> : null}
              </div>
              <h3>{c.title}</h3>
              <p className="sub">
                {c.user || '주민'} · {day(c.submitted_at)} 제출
                {c.lat != null && c.lng != null ? (
                  <>
                    {' · '}
                    <a className="link" style={{ fontSize: 15 }} href={mapLink(c.lat, c.lng)} target="_blank" rel="noreferrer">
                      촬영 위치
                    </a>
                  </>
                ) : null}
              </p>
              <Shots c={c} />
              {c.status === 'submitted' ? (
                <Decide busy={busy === c.id} approveLabel="승인하고 보상 지급" rejectHint="예: 치운 뒤 사진에 쓰레기가 남아 있음 (주민에게 표시됨)" onDecide={(ok, why) => decide(c, ok, why)} />
              ) : c.status === 'staff_review' ? (
                <p className="d">운영진 검토 중</p>
              ) : (
                <p className="d">
                  {day(c.decided_at)} {c.status === 'approved' ? '승인' : `반려${c.reject_reason ? ` · ${c.reject_reason}` : ''}`}
                </p>
              )}
            </article>
          )
        })}
      </section>
    </>
  )
}

const DAYS = ['월', '화', '수', '목', '금', '토', '일']

function Report({ partner }) {
  const r = api.report()
  const max = Math.max(1, ...r.daily)
  const rate = r.joined ? Math.round((r.completed / r.joined) * 100) : 0
  return (
    <>
      <div className="head">
        <div>
          <h2>활동 리포트</h2>
          <p className="sub">
            {partner.name} · {today()} 기준{api.remote ? '' : ' · 예시 의뢰 포함'}
          </p>
        </div>
        <button className="btn ghost small noprint" onClick={() => window.print()}>
          PDF로 저장
        </button>
      </div>
      <Stats
        items={[
          ['인증 완료', num(r.completed), '건', true],
          ['완료율', rate, '%'],
          ['참여 주민', num(r.joined), '명'],
          ['지급 보상', num(r.paid), '원'],
        ]}
      />
      <div className="two">
        <section className="tile">
          <span className="k">요일별 인증</span>
          <div className="chart" role="img" aria-label={DAYS.map((d, i) => `${d} ${r.daily[i]}건`).join(', ')}>
            {r.daily.map((v, i) => (
              <div key={i} className="col">
                <span>{v}</span>
                <i style={{ height: `${(v / max) * 100}%` }} />
                <em>{DAYS[i]}</em>
              </div>
            ))}
          </div>
        </section>
        <section className="tile">
          <span className="k">장소별 완료</span>
          <div style={{ display: 'grid', gap: 14, marginTop: 6 }}>
            {r.byPlace.length ? (
              r.byPlace.map(([k, v]) => (
                <div key={k} className="hrow">
                  <span>{placeLabel(k)}</span>
                  <div className="bar">
                    <i style={{ width: `${(v / Math.max(1, r.completed)) * 100}%` }} />
                  </div>
                  <b>{v}</b>
                </div>
              ))
            ) : (
              <p className="d">완료된 인증 없음</p>
            )}
          </div>
        </section>
      </div>
      <section className="tile">
        <span className="k">의뢰별 결과 · 진행한 의뢰 {num(r.quests)}건</span>
        <div className="scroll">
          <table>
            <thead>
              <tr>
                <th>의뢰</th>
                <th>장소</th>
                <th>기간</th>
                <th className="n">수락</th>
                <th className="n">완료</th>
                <th className="n">지급 보상</th>
              </tr>
            </thead>
            <tbody>
              {r.rows.map((q) => (
                <tr key={q.id}>
                  <td>{q.title}</td>
                  <td>{q.place_name}</td>
                  <td>
                    {day(q.starts_on)} ~ {day(q.ends_on)}
                  </td>
                  <td className="n">{q.joined}</td>
                  <td className="n">{q.completed}</td>
                  <td className="n">{won(q.completed * q.reward_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
