// 운영 웹(/dev): 제휴 의뢰 검토, 인증 검토, 신고·숨김 제보, 계정(포인트·정지)
import { useCallback, useEffect, useState } from 'react'
import { dev, CATEGORY, FLAG_REASON, ACTION_LABEL } from './devApi.js'
import { won, num, day, today, when, useRoute, Icon, Field, Shots, Decide, Stats, mapLink } from './ui.jsx'

const TABS = [
  ['home', '요약'],
  ['quests', '제휴 의뢰'],
  ['claims', '인증'],
  ['reports', '신고'],
  ['users', '계정'],
]
const PLACE = { park: '공원', street: '골목·거리', drain: '빗물받이', bus_stop: '버스정류장', etc: '기타' }
const REWARD = { voucher: '지역 상품권', coupon: '매장 쿠폰', point: '앱 포인트' }
const Q_STATUS = { review: ['검토 대기', 'wait'], open: ['모집 중', 'on'], scheduled: ['공개 예정', 'blue'], done: ['종료', ''], rejected: ['반려', 'bad'], cancelled: ['취소', ''] }
const C_STATUS = { staff_review: ['운영진 검토', 'wait'], submitted: ['확인 대기', 'blue'], approved: ['승인', 'on'], rejected: ['반려', 'bad'] }

// 목록을 불러오고, 처리 뒤 다시 불러오는 공통 훅
function useLoad(fn, deps) {
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)
  const load = useCallback(() => {
    setErr(null)
    return fn()
      .then(setData)
      .catch((e) => setErr(e.message))
  }, deps)
  useEffect(() => {
    load()
  }, [load])
  return [data, err, load, setErr]
}

export default function Dev() {
  const [route] = useRoute('home')
  const [me, setMe] = useState(null) // { signedIn, staff, name }
  const [tick, setTick] = useState(0)
  useEffect(() => {
    dev
      .init()
      .then(setMe)
      .catch((e) => setMe({ signedIn: false, error: e.message }))
  }, [])
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [route])
  const ok = me?.signedIn && me?.staff

  return (
    <div className="app">
      <header className="top">
        <div className="top-in">
          <a className="brand" href="#/home">
            <img src="./icon.png" alt="" />
            <span>
              집게표 <em>운영</em>
            </span>
          </a>
          {ok ? (
            <nav aria-label="메뉴">
              {TABS.map(([k, label]) => (
                <a key={k} href={`#/${k}`} className={route === k ? 'on' : ''} aria-current={route === k ? 'page' : undefined}>
                  {label}
                </a>
              ))}
            </nav>
          ) : null}
          {me?.signedIn ? (
            <div className="who">
              <b>{me.name || '운영진'}</b>
              {dev.remote ? (
                <button className="link" onClick={async () => (await dev.leave(), setMe({ signedIn: false }))}>
                  로그아웃
                </button>
              ) : (
                <button className="link" onClick={() => (dev.reset(), setTick((t) => t + 1))}>
                  시연 데이터 되돌리기
                </button>
              )}
            </div>
          ) : null}
        </div>
      </header>
      {dev.remote ? null : (
        <div className="demo" role="note">
          시연 화면입니다. 처리 결과는 이 브라우저에만 저장됩니다.
        </div>
      )}

      <main key={tick}>
        {!me ? (
          <section className="tile narrow center">
            <p className="sub">불러오는 중…</p>
          </section>
        ) : !me.signedIn ? (
          <Login onDone={setMe} note={me.error} />
        ) : !me.staff ? (
          <section className="tile narrow center" style={{ padding: 40 }}>
            <h2>운영진 계정이 아닙니다.</h2>
            <p className="sub">staff_members 에 이 계정을 추가한 뒤 다시 로그인하세요.</p>
            <button className="btn ghost small" onClick={async () => (await dev.leave(), setMe({ signedIn: false }))}>
              다른 계정으로 로그인
            </button>
          </section>
        ) : route === 'quests' ? (
          <Quests />
        ) : route === 'claims' ? (
          <Claims />
        ) : route === 'reports' ? (
          <Reports />
        ) : route === 'users' ? (
          <Users />
        ) : (
          <Overview />
        )}
      </main>
      <footer>
        <div>집게표 운영 · 모든 처리는 기록에 남습니다.</div>
      </footer>
    </div>
  )
}

function Login({ onDone, note }) {
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(note || null)
  return (
    <section className="tile narrow">
      <h2>운영진 로그인</h2>
      <p className="sub">등록된 운영진 계정만 들어올 수 있습니다.</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          setMsg(null)
          try {
            const r = await dev.signIn(email.trim(), pw)
            onDone({ signedIn: true, ...r })
          } catch (err) {
            setMsg(err.message)
          }
          setBusy(false)
        }}
      >
        <Field label="이메일">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </Field>
        <Field label="비밀번호">
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" required />
        </Field>
        {msg ? <p className="err">{msg}</p> : null}
        <button className="btn dark" disabled={busy}>
          {busy ? '확인 중…' : '로그인'}
        </button>
      </form>
    </section>
  )
}

function Problem({ err }) {
  return err ? (
    <p className="err" role="alert">
      {err}
    </p>
  ) : null
}

function Overview() {
  const [o, err] = useLoad(() => dev.overview(), [])
  if (!o) return err ? <Problem err={err} /> : <p className="sub">불러오는 중…</p>
  const todo = o.quest_review + o.claim_review + o.flagged
  return (
    <>
      <div className="head">
        <div>
          <h2>{todo ? `처리할 일 ${todo}건` : '처리할 일 없음'}</h2>
          <p className="sub">{today()} 기준</p>
        </div>
      </div>
      <div className="list">
        {[
          ['quests', '제휴 의뢰 검토', o.quest_review],
          ['claims', '인증 검토', o.claim_review],
          ['reports', '신고·숨김 제보', o.flagged],
        ].map(([k, t, n]) => (
          <a key={k} href={`#/${k}`}>
            <span>{t}</span>
            <span className="row" style={{ gap: 8 }}>
              <span className="num" style={n ? { color: 'var(--ink)', fontWeight: 600 } : null}>
                {n}
              </span>
              <span className="chev">
                <Icon name="chev" size={16} stroke={2} />
              </span>
            </span>
          </a>
        ))}
      </div>
      <h3 className="section-title">오늘</h3>
      <Stats
        items={[
          ['올라온 인증', num(o.today_claims), '건'],
          ['올라온 제보', num(o.today_reports), '건'],
          ['전체 계정', num(o.users), '명'],
          ['정지 중', num(o.banned), '명'],
        ]}
      />
      <h3 className="section-title">최근 처리</h3>
      <section className="tile" style={{ paddingTop: 12, paddingBottom: 12 }}>
        {o.recent?.length ? (
          <div className="log">
            {o.recent.map((a, i) => (
              <div key={i}>
                <span>
                  {ACTION_LABEL[a.action] || a.action} · <span className="mono">{a.target}</span>
                  {a.detail?.reason ? ` · ${a.detail.reason}` : ''}
                </span>
                <span>
                  {a.by || '운영진'} · {when(a.at)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="d" style={{ padding: '12px 0' }}>
            기록 없음
          </p>
        )}
      </section>
    </>
  )
}

function Filter({ value, onChange, options }) {
  return (
    <div className="seg" style={{ maxWidth: 320 }}>
      {options.map(([v, l]) => (
        <label key={v} className={value === v ? 'on' : ''}>
          <input type="radio" checked={value === v} onChange={() => onChange(v)} />
          {l}
        </label>
      ))}
    </div>
  )
}

function Empty({ title }) {
  return (
    <section className="tile center" style={{ padding: 40 }}>
      <p className="sub">{title}</p>
    </section>
  )
}

function Quests() {
  const [status, setStatus] = useState('review')
  const [list, err, load, setErr] = useLoad(() => dev.quests(status), [status])
  const [busy, setBusy] = useState(null)
  const decide = async (q, ok, why) => {
    setBusy(q.id)
    try {
      await dev.reviewQuest(q.id, ok, why)
      await load()
    } catch (e) {
      setErr(e.message)
    }
    setBusy(null)
  }
  return (
    <>
      <div className="head">
        <div>
          <h2>제휴 의뢰 검토</h2>
          <p className="sub">승인하면 시작일에 공개됩니다. 반려 사유는 업체에 표시됩니다.</p>
        </div>
        <Filter value={status} onChange={setStatus} options={[['review', '검토 대기'], ['all', '최근 60일']]} />
      </div>
      <Problem err={err} />
      {list && !list.length ? <Empty title="검토할 의뢰 없음" /> : null}
      <section className="cards">
        {(list || []).map((q) => {
          const [label, tone] = Q_STATUS[q.status] || [q.status, '']
          return (
            <article key={q.id} className="tile">
              <div>
                <span className={`badge ${tone}`}>{label}</span>
                <span className="badge plain">{q.org_name}</span>
              </div>
              <h3>{q.title}</h3>
              {q.description ? <p className="d">{q.description}</p> : null}
              <dl className="cost" style={{ marginTop: 4 }}>
                <dt>장소</dt>
                <dd>
                  {q.place_name} · {PLACE[q.place_type] || q.place_type}
                </dd>
                <dt>주소</dt>
                <dd>{q.address}</dd>
                <dt>기간</dt>
                <dd>
                  {day(q.starts_on)} ~ {day(q.ends_on)}
                </dd>
                <dt>인증</dt>
                <dd>{q.proof_mode === 'single' ? '사진 1장' : '전·후 사진 2장'}</dd>
                <dt>보상</dt>
                <dd>
                  {REWARD[q.reward_type] || q.reward_type} {q.reward_type === 'point' ? `${num(q.reward_amount)}P` : won(q.reward_amount)} × {q.capacity}명
                </dd>
              </dl>
              {q.status === 'review' ? (
                <Decide busy={busy === q.id} approveLabel="승인하고 공개" rejectHint="예: 차도와 붙어 있어 위험함 (업체에 표시됨)" onDecide={(ok, why) => decide(q, ok, why)} />
              ) : q.status === 'rejected' ? (
                <p className="d">반려 · {q.reject_reason}</p>
              ) : (
                <p className="d">
                  수락 {q.joined ?? 0}명 · 완료 {q.completed ?? 0}명
                </p>
              )}
            </article>
          )
        })}
      </section>
    </>
  )
}

function Claims() {
  const [status, setStatus] = useState('staff_review')
  const [list, err, load, setErr] = useLoad(() => dev.claims(status), [status])
  const [busy, setBusy] = useState(null)
  const decide = async (c, ok, why) => {
    setBusy(c.id)
    try {
      await dev.reviewClaim(c.id, ok, why)
      await load()
    } catch (e) {
      setErr(e.message)
    }
    setBusy(null)
  }
  return (
    <>
      <div className="head">
        <div>
          <h2>인증 검토</h2>
          <p className="sub">이의가 모였거나 확인할 주민이 없던 인증입니다. 승인하면 보상이 지급됩니다.</p>
        </div>
        <Filter value={status} onChange={setStatus} options={[['staff_review', '운영진 검토'], ['all', '최근 14일']]} />
      </div>
      <Problem err={err} />
      {list && !list.length ? <Empty title="검토할 인증 없음" /> : null}
      <section className="stack">
        {(list || []).map((c) => {
          const [label, tone] = C_STATUS[c.status] || [c.status, '']
          return (
            <article key={c.id} className="tile">
              <div>
                <span className={`badge ${tone}`}>{label}</span>
                <span className="badge plain">{CATEGORY[c.kind] || c.kind}</span>
                {c.disputed_at ? <span className="badge bad">이의 {when(c.disputed_at)}</span> : null}
              </div>
              <h3>{c.title}</h3>
              <p className="sub">
                {c.user || '주민'} · {when(c.submitted_at)} 제출 · <span className="mono">#{c.id}</span>
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
              {c.status === 'staff_review' ? (
                <Decide busy={busy === c.id} approveLabel="승인하고 보상 지급" rejectHint="예: 같은 사진 재사용 (해결한 주민에게 표시됨)" onDecide={(ok, why) => decide(c, ok, why)} />
              ) : (
                <p className="d">
                  {when(c.decided_at)} {c.status === 'approved' ? '승인' : c.status === 'rejected' ? `반려${c.reject_reason ? ` · ${c.reject_reason}` : ''}` : ''}
                  {c.decided_by ? ` · ${{ auto: '자동', vote: '주민 확인', partner: '업체', staff: '운영진' }[c.decided_by] || c.decided_by}` : ''}
                </p>
              )}
            </article>
          )
        })}
      </section>
    </>
  )
}

function Reports() {
  const [list, err, load, setErr] = useLoad(() => dev.reports(), [])
  const [busy, setBusy] = useState(null)
  const act = async (r, action) => {
    setBusy(r.id)
    try {
      await dev.setReport(r.id, action)
      await load()
    } catch (e) {
      setErr(e.message)
    }
    setBusy(null)
  }
  return (
    <>
      <div className="head">
        <div>
          <h2>신고·숨김 제보</h2>
          <p className="sub">신고가 쌓이면 자동으로 숨겨집니다. 확인 후 확정하거나 되돌립니다.</p>
        </div>
      </div>
      <Problem err={err} />
      {list && !list.length ? <Empty title="확인할 신고 없음" /> : null}
      <section className="cards">
        {(list || []).map((r) => (
          <article key={r.id} className="tile">
            <div>
              {r.hidden_at ? <span className="badge bad">숨김</span> : null}
              {r.flags ? <span className="badge wait">신고 {r.flags}</span> : null}
              {r.gone_flagged_at ? <span className="badge blue">치워짐 표시</span> : null}
            </div>
            <div className="row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
              {r.photo ? (
                <a href={r.photo} target="_blank" rel="noreferrer">
                  <img src={r.photo} alt="제보 사진" style={{ width: 84, height: 84, objectFit: 'cover', borderRadius: 12, display: 'block' }} />
                </a>
              ) : (
                <div className="noshot" style={{ width: 84, height: 84, flex: 'none', aspectRatio: 'auto' }}>
                  사진 없음
                </div>
              )}
              <div style={{ display: 'grid', gap: 4, minWidth: 0 }}>
                <h3>{r.title}</h3>
                <p className="d">
                  {r.category}
                  {r.spot ? ` · ${r.spot}` : ''}
                </p>
                <p className="d">
                  {r.author || '알 수 없음'} · {when(r.created_at)} · <span className="mono">#{r.id}</span>
                </p>
              </div>
            </div>
            {r.reasons?.length ? (
              <div>
                {Object.entries(r.reasons.reduce((m, x) => ((m[x] = (m[x] || 0) + 1), m), {})).map(([k, n]) => (
                  <span key={k} className="badge plain">
                    {FLAG_REASON[k] || k} {n}
                  </span>
                ))}
              </div>
            ) : null}
            <div className="actions">
              {r.lat != null ? (
                <a className="btn ghost small" href={mapLink(r.lat, r.lng)} target="_blank" rel="noreferrer">
                  위치
                </a>
              ) : null}
              {r.hidden_at ? (
                <button className="btn ghost small" disabled={busy === r.id} onClick={() => act(r, 'restore')}>
                  다시 보이기
                </button>
              ) : (
                <>
                  <button className="btn ghost small" disabled={busy === r.id} onClick={() => act(r, 'dismiss')}>
                    신고 기각
                  </button>
                  <button className="btn small danger" disabled={busy === r.id} onClick={() => act(r, 'hide')}>
                    숨기기
                  </button>
                </>
              )}
              {r.hidden_at && r.flags ? (
                <button className="btn small danger" disabled={busy === r.id} onClick={() => act(r, 'hide')}>
                  숨김 확정
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </section>
    </>
  )
}

function Users() {
  const [query, setQuery] = useState('')
  const [q, setQ] = useState('')
  const [list, err, load] = useLoad(() => dev.users(q), [q])
  const [open, setOpen] = useState(null)
  return (
    <>
      <div className="head">
        <div>
          <h2>계정</h2>
          <p className="sub">닉네임 일부 또는 이메일 전체로 찾습니다.</p>
        </div>
        <form
          className="search"
          onSubmit={(e) => {
            e.preventDefault()
            setQ(query.trim())
          }}
        >
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="닉네임 또는 이메일" aria-label="계정 찾기" />
          <button className="btn dark small" aria-label="찾기">
            <Icon name="search" size={16} />
          </button>
        </form>
      </div>
      <Problem err={err} />
      {list && !list.length ? <Empty title="일치하는 계정 없음" /> : null}
      <section className="stack">
        {(list || []).map((u) => (
          <article key={u.id} className="tile">
            <div className="user">
              <span className="avatar">{(u.nickname || '?').slice(0, 1)}</span>
              <div style={{ display: 'grid', gap: 4, minWidth: 0 }}>
                <div className="row" style={{ gap: 6 }}>
                  <h3>{u.nickname || '(닉네임 없음)'}</h3>
                  {u.staff ? <span className="badge dark">운영진</span> : null}
                  {u.banned_until ? <span className="badge bad">{day(u.banned_until)}까지 정지</span> : null}
                  {u.anonymous ? <span className="badge plain">익명</span> : null}
                </div>
                <div className="kv">
                  <span>{u.email || '이메일 없음'}</span>
                  <span>
                    Lv <b>{u.level}</b>
                  </span>
                  <span>
                    포인트 <b>{num(u.points)}</b>
                  </span>
                  <span>
                    해결 <b>{u.solved}</b>
                  </span>
                  <span>
                    제보 <b>{u.reports}</b>
                  </span>
                  <span>가입 {day(u.created_at)}</span>
                </div>
              </div>
              <button className="btn ghost small" onClick={() => setOpen(open === u.id ? null : u.id)} aria-expanded={open === u.id}>
                {open === u.id ? '닫기' : '관리'}
              </button>
            </div>
            {open === u.id ? <Manage u={u} onDone={load} /> : null}
          </article>
        ))}
      </section>
    </>
  )
}

function Manage({ u, onDone }) {
  const [delta, setDelta] = useState('')
  const [why, setWhy] = useState('')
  const [days, setDays] = useState(7)
  const [banWhy, setBanWhy] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const run = async (fn, done) => {
    setBusy(true)
    setMsg(null)
    try {
      await fn()
      setMsg(done)
      await onDone()
    } catch (e) {
      setMsg(e.message)
    }
    setBusy(false)
  }
  const d = parseInt(delta, 10)
  return (
    <div className="cards" style={{ gap: 10 }}>
      <div className="inner" style={{ display: 'grid', gap: 10 }}>
        <span className="k">포인트 조정</span>
        <div className="grid2" style={{ gap: 8 }}>
          <input type="number" value={delta} onChange={(e) => setDelta(e.target.value)} placeholder="예: 100 또는 -50" aria-label="더하거나 뺄 포인트" />
          <input value={why} onChange={(e) => setWhy(e.target.value)} placeholder="사유" maxLength={60} aria-label="조정 사유" />
        </div>
        <button className="btn small" disabled={busy || !d || why.trim().length < 2} onClick={() => run(() => dev.adjustPoints(u.id, d, why.trim()), `${d > 0 ? '+' : ''}${d}P 반영됨`)}>
          반영
        </button>
      </div>
      <div className="inner" style={{ display: 'grid', gap: 10 }}>
        <span className="k">로그인 정지</span>
        {u.banned_until ? (
          <button className="btn ghost small" disabled={busy || u.staff} onClick={() => run(() => dev.ban(u.id, 0, '정지 해제'), '정지 해제됨')}>
            정지 풀기
          </button>
        ) : (
          <>
            <div className="grid2" style={{ gap: 8 }}>
              <select value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="정지 기간">
                {[1, 3, 7, 30, 365].map((n) => (
                  <option key={n} value={n}>
                    {n === 365 ? '1년' : `${n}일`}
                  </option>
                ))}
              </select>
              <input value={banWhy} onChange={(e) => setBanWhy(e.target.value)} placeholder="사유" maxLength={60} aria-label="정지 사유" />
            </div>
            <button className="btn small danger" disabled={busy || u.staff || banWhy.trim().length < 2} onClick={() => run(() => dev.ban(u.id, days, banWhy.trim()), `${days}일 정지됨`)}>
              {u.staff ? '운영진은 정지 불가' : '정지'}
            </button>
          </>
        )}
      </div>
      {msg ? <p className="d" style={{ gridColumn: '1 / -1' }}>{msg}</p> : null}
    </div>
  )
}
