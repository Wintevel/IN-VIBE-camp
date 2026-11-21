import { useEffect, useMemo, useState } from 'react'
import { api, PLACES, placeLabel, STATUS, CLAIM_STATUS, estimate, FEE_RATE } from './api.js'
import { won, num, day, today, useRoute, Icon, Field, QuestCard, Shots, Decide, Stat, mapLink } from './ui.jsx'

const TABS = [
  ['home', '소개'],
  ['new', '의뢰 만들기'],
  ['quests', '내 의뢰'],
  ['claims', '인증 확인'],
  ['report', '활동 리포트'],
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
            <span>집게표</span>
            <em>파트너</em>
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
                나가기
              </button>
            </div>
          ) : (
            <div className="who">
              <a className="btn small" href="#/new">
                시작하기
              </a>
            </div>
          )}
        </div>
      </header>

      {api.remote ? null : (
        <div className="demo" role="note">
          시연용 화면이에요. 입력한 내용은 이 브라우저에만 저장되고 앱에는 올라가지 않아요.
        </div>
      )}
      {down ? (
        <div className="demo" role="alert">
          서버에서 정보를 받지 못했어요. {down}
        </div>
      ) : null}

      <main>
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

      <footer>집게표 파트너 · 문의는 운영진에게 · 요금과 문구는 임시예요</footer>
    </div>
  )
}

function Home() {
  return (
    <>
      <section className="hero">
        <span className="eyebrow">
          <i />
          기업·기관용 환경 미화 의뢰
        </span>
        <h1>
          치울 곳만 알려 주세요.
          <br />
          동네 이웃이 <span className="hl">출동</span>합니다.
        </h1>
        <p className="lead">장소와 보상을 정해 올리면 근처 이웃이 치우고 사진으로 인증해요. 끝나면 활동 리포트로 정리해 드려요.</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <a className="btn" href="#/new">
            의뢰 만들기
          </a>
          <a className="btn ghost" href="#/report">
            리포트 예시 보기
          </a>
        </div>
      </section>

      <section className="bento" aria-label="집게표 의뢰 한눈에 보기">
        <div className="tile dark s2 r2 end">
          <div style={{ display: 'grid', gap: 6 }}>
            <span className="k">앱에 보이는 모습</span>
            <h3>의뢰판 맨 위에 제휴 의뢰로 떠요</h3>
          </div>
          <QuestCard q={{ title: '호암지 산책로 쓰레기 줍기', partner: '충주시 제휴', place_type: 'park', reward_type: 'voucher', reward_amount: 5000 }} placeLabel={placeLabel} />
        </div>
        <Stat cls="s2 m1" k="인증 반경" icon="pin" v="100" unit="m" d="의뢰 장소 100m 안에서 찍은 사진만 받아요" />
        <Stat cls="s2 m1" k="인증 사진" icon="camera" v="2" unit="장" d="치우기 전·뒤를 앱 카메라로만 찍어요" />
        <Stat cls="s2 m1" tone="blue" k="수수료 · 임시" icon="percent" v={Math.round(FEE_RATE * 100)} unit="%" d="인증된 인원만큼만 청구해요" />
        <Stat cls="s2 m1" k="검토 시간" icon="clock" v="1" unit="일" d="운영진 확인 뒤 앱에 공개해요" />

        <div className="tile s4 end">
          <span className="k">진행 순서</span>
          <div className="flow">
            {[
              ['01', '의뢰 작성'],
              ['02', '운영진 검토'],
              ['03', '이웃이 해결'],
              ['04', '리포트 받기'],
            ].map(([n, t], i) => (
              <FlowStep key={n} n={n} t={t} last={i === 3} />
            ))}
          </div>
        </div>
        <a className="tile s2 end" href="#/report">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="k">ESG 활동 리포트</span>
            <span className="ico violet">
              <Icon name="chart" />
            </span>
          </div>
          <div className="spark" aria-hidden="true">
            {[3, 5, 4, 7, 9, 6, 8].map((v, i) => (
              <i key={i} style={{ height: `${v * 10}%` }} />
            ))}
          </div>
          <span className="more">
            예시 보기 <Icon name="arrow" size={15} />
          </span>
        </a>

        <div className="tile s6">
          <div className="row">
            <span className="ico red">
              <Icon name="x" />
            </span>
            <h3>이런 의뢰는 받지 않아요</h3>
          </div>
          <div className="chips">
            {['깨진 유리·주사기', '폐기물·위험물', '사유지 무단 출입', '차도 위 작업', '환경 미화와 무관한 심부름'].map((t) => (
              <span key={t} className="chip no">
                <Icon name="x" size={14} />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

function FlowStep({ n, t, last }) {
  return (
    <>
      <div className="stepc">
        <span className="mono">{n}</span>
        <b>{t}</b>
      </div>
      {last ? null : (
        <span className="arrow">
          <Icon name="arrow" size={16} />
        </span>
      )}
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
        <h2>{mode === 'in' ? '로그인' : '가입하기'}</h2>
        <p className="sub">업체 계정은 이메일로 만들어요. 계정 하나에 업체 하나가 연결돼요.</p>
        <div className="seg" role="radiogroup" aria-label="로그인 또는 가입">
          {[
            ['in', '로그인'],
            ['up', '처음이에요'],
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
                setMsg('가입 확인 메일을 보냈어요. 메일의 링크를 누른 뒤 로그인해 주세요.')
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
            {busy ? '확인 중…' : mode === 'in' ? '로그인' : '가입하기'}
          </button>
        </form>
      </section>
    )

  return (
    <section className="tile narrow">
      <h2>업체 정보를 알려 주세요</h2>
      <p className="sub">{api.remote ? '등록하면 운영진에게 알림이 가요. 사업자 확인은 운영진이 따로 연락드려요.' : '시연용이라 이름만 받아요. 실제 서비스에서는 사업자 확인과 로그인이 들어가요.'}</p>
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
          {busy ? '등록 중…' : '시작하기'}
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
    if (q.title.trim().length < 5) e.push('제목을 5자 이상 적어 주세요')
    if (!q.place_name.trim()) e.push('장소 이름을 적어 주세요')
    if (!q.address.trim()) e.push('주소를 적어 주세요')
    if (!(q.reward_amount >= 1000)) e.push('1인 보상은 1,000원 이상이어야 해요')
    if (!(q.capacity >= 1 && q.capacity <= 500)) e.push('모집 인원은 1~500명이에요')
    if (!q.starts_on || !q.ends_on) e.push('기간을 정해 주세요')
    else if (q.ends_on < q.starts_on) e.push('종료일이 시작일보다 빨라요')
    if (!agree) e.push('안전 기준에 동의해 주세요')
    return e
  }, [q, agree])

  return (
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
        <div style={{ display: 'grid', gap: 4 }}>
          <h2>의뢰 만들기</h2>
          <p className="sub">운영진이 확인한 뒤 앱에 공개돼요.</p>
        </div>
        <Field label="제목" hint="앱 카드에 그대로 보여요">
          <input value={q.title} onChange={set('title')} placeholder="예: 호암지 산책로 쓰레기 줍기" maxLength={30} />
        </Field>
        <Field label="설명">
          <textarea value={q.description} onChange={set('description')} rows={3} maxLength={200} placeholder="무엇을 어디까지 치우면 되는지 적어 주세요" />
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
          <Field label="주소" hint="지도에서 위치를 찍는 기능은 다음에 들어가요">
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
          <span>다칠 수 있는 물건, 출입이 제한된 곳, 차도 위 작업이 아닌 환경 미화 의뢰예요.</span>
        </label>
        {errors.length ? <p className="err">{errors[0]}</p> : null}
        <button className="btn" disabled={errors.length > 0}>
          검토 요청하기
        </button>
      </form>

      <aside>
        <div className="tile dark">
          <span className="k">앱에 이렇게 보여요</span>
          <QuestCard q={{ ...q, partner: `${partner.name} 제휴` }} placeLabel={placeLabel} />
        </div>
        <div className="tile">
          <span className="k">최대 예상 비용</span>
          <span className="big">
            {num(cost.total)}
            <small>원</small>
          </span>
          <div className="inner">
            <dl className="cost">
              <dt>
                보상 {won(q.reward_amount)} × {num(q.capacity)}명
              </dt>
              <dd>{won(cost.reward)}</dd>
              <dt>운영 수수료 {Math.round(FEE_RATE * 100)}% · 임시</dt>
              <dd>{won(cost.fee)}</dd>
            </dl>
          </div>
          <p className="d">인증이 끝난 인원만큼만 청구하고, 정산 방법은 공개 전에 운영진이 안내해요.</p>
        </div>
      </aside>
    </div>
  )
}

function Quests({ onChange }) {
  const list = api.quests()
  if (!list.length)
    return (
      <section className="tile narrow center">
        <span className="ico">
          <Icon name="inbox" />
        </span>
        <h2>아직 올린 의뢰가 없어요</h2>
        <a className="btn" href="#/new">
          첫 의뢰 만들기
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
          <p className="sub">올린 의뢰 {list.length}건</p>
        </div>
        <a className="btn small" href="#/new">
          새 의뢰
        </a>
      </div>
      <section className="bento" style={{ gridAutoRows: 'minmax(120px, auto)' }}>
        <Stat cls="s2 m1" k="검토 중" v={by('review')} unit="건" />
        <Stat cls="s2 m1" k="모집 중" v={by('open')} unit="건" />
        <Stat cls="s2" tone="dark" k="인증 완료 누적" v={num(done)} unit="명" />
      </section>
      <section className="cards">
        {list.map((q) => {
          const [label, tone] = STATUS[q.status] || STATUS.review
          const pct = q.capacity ? Math.round((q.completed / q.capacity) * 100) : 0
          return (
            <article key={q.id} className="tile">
              <div>
                <span className={`badge ${tone}`}>{label}</span>
                {q.sample ? <span className="badge">예시</span> : null}
              </div>
              <h3>{q.title}</h3>
              <p className="sub">
                {q.place_name} · {placeLabel(q.place_type)} · {day(q.starts_on)} ~ {day(q.ends_on)}
              </p>
              {q.status === 'review' ? (
                <div className="inner row" style={{ justifyContent: 'space-between' }}>
                  <span className="d">운영진이 확인하고 있어요. 영업일 하루 안에 답을 드려요.</span>
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
                <div className="inner">
                  <span className="d">반려 사유 · {q.reject_reason || '운영진에게 문의해 주세요'}</span>
                </div>
              ) : (
                <>
                  <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span className="prog">
                      <span className="mid">
                        {q.completed}
                        <small> / {q.capacity}명</small>
                      </span>
                    </span>
                    <span className="k">1인 {won(q.reward_amount)}</span>
                  </div>
                  <div className="bar" role="img" aria-label={`완료 ${q.completed}명, 모집 ${q.capacity}명`}>
                    <i style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <p className="d">
                    수락 {q.joined}명 · 인증 완료 {pct}%{q.pending ? ` · 확인 대기 ${q.pending}건` : ''}
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
      <section className="tile narrow center">
        <span className="ico">
          <Icon name="camera" />
        </span>
        <h2>확인할 인증이 없어요</h2>
        <p className="sub">이웃이 의뢰를 해결하고 사진을 올리면 여기에 나타나요.</p>
      </section>
    )
  return (
    <>
      <div className="head">
        <div>
          <h2>인증 확인</h2>
          <p className="sub">사진을 보고 승인하면 그때 보상이 지급돼요 · 최근 30일</p>
        </div>
      </div>
      <section className="bento" style={{ gridAutoRows: 'minmax(110px, auto)' }}>
        <Stat cls="s2 m1" tone={todo ? 'blue' : ''} k="확인 대기" v={todo} unit="건" />
        <Stat cls="s2 m1" k="승인" v={list.filter((c) => c.status === 'approved').length} unit="건" />
        <Stat cls="s2" k="반려" v={list.filter((c) => c.status === 'rejected').length} unit="건" />
      </section>
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
                {c.sample ? <span className="badge">예시</span> : null}
              </div>
              <h3>{c.title}</h3>
              <p className="sub">
                {c.user || '이웃'} · {day(c.submitted_at)} 제출
                {c.lat != null && c.lng != null ? (
                  <>
                    {' · '}
                    <a className="more" href={mapLink(c.lat, c.lng)} target="_blank" rel="noreferrer">
                      촬영 위치
                    </a>
                  </>
                ) : null}
              </p>
              <Shots c={c} />
              {c.status === 'submitted' ? (
                <Decide busy={busy === c.id} approveLabel="승인하고 보상 지급" rejectHint="예: 치운 뒤 사진에 쓰레기가 남아 있어요 (이웃에게 보여요)" onDecide={(ok, why) => decide(c, ok, why)} />
              ) : c.status === 'staff_review' ? (
                <p className="d">운영진이 확인하고 있어요.</p>
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
          인쇄·PDF로 저장
        </button>
      </div>
      <section className="bento">
        <div className="tile dark s2 r2 end">
          <span className="k">인증 완료</span>
          <div style={{ display: 'grid', gap: 12 }}>
            <span className="big" style={{ fontSize: 'clamp(3rem, 6vw, 4.4rem)' }}>
              {num(r.completed)}
              <small>건</small>
            </span>
            <div className="bar">
              <i style={{ width: `${Math.min(rate, 100)}%` }} />
            </div>
            <p className="d">수락한 이웃 중 {rate}%가 끝까지 치웠어요</p>
          </div>
        </div>
        <Stat cls="s2 m1" k="진행한 의뢰" icon="flag" v={num(r.quests)} unit="건" />
        <Stat cls="s2 m1" k="참여한 이웃" icon="users" v={num(r.joined)} unit="명" />
        <div className="tile blue s4 end">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="k">지급한 보상</span>
            <span className="ico">
              <Icon name="gift" />
            </span>
          </div>
          <span className="big">
            {num(r.paid)}
            <small>원</small>
          </span>
        </div>

        <div className="tile s4">
          <span className="k">요일별 인증 완료</span>
          <div className="chart" role="img" aria-label={DAYS.map((d, i) => `${d} ${r.daily[i]}건`).join(', ')}>
            {r.daily.map((v, i) => (
              <div key={i} className="col">
                <span>{v}</span>
                <i style={{ height: `${(v / max) * 100}%` }} />
                <em>{DAYS[i]}</em>
              </div>
            ))}
          </div>
        </div>
        <div className="tile s2">
          <span className="k">장소별 완료</span>
          <div style={{ display: 'grid', gap: 12 }}>
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
              <p className="d">아직 완료된 인증이 없어요.</p>
            )}
          </div>
        </div>

        <div className="tile s6">
          <span className="k">의뢰별 결과</span>
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
        </div>
      </section>
    </>
  )
}
