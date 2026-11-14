import { useEffect, useMemo, useState } from 'react'
import { api, PLACES, placeLabel, STATUS, estimate, FEE_RATE } from './api.js'

const won = (n) => `${Number(n || 0).toLocaleString('ko-KR')}원`
const day = (s) => (s ? s.slice(0, 10).replaceAll('-', '.') : '')
const TABS = [
  ['home', '소개'],
  ['new', '의뢰 만들기'],
  ['quests', '내 의뢰'],
  ['report', '활동 리포트'],
]

const useRoute = () => {
  const get = () => window.location.hash.replace('#/', '') || 'home'
  const [route, setRoute] = useState(get)
  useEffect(() => {
    const on = () => setRoute(get())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return [route, (r) => (window.location.hash = `#/${r}`)]
}

export default function App() {
  const [route, go] = useRoute()
  const [partner, setPartner] = useState(api.partner())
  const [tick, setTick] = useState(0)
  const refresh = () => setTick((t) => t + 1)
  const needLogin = route !== 'home' && !partner

  return (
    <div className="app">
      <header className="top">
        <a className="brand" href="#/home">
          <img src="./icon.png" alt="" />
          <span>집게표</span>
          <em>파트너</em>
        </a>
        <nav aria-label="메뉴">
          {TABS.map(([k, label]) => (
            <a key={k} href={`#/${k}`} className={route === k ? 'on' : ''} aria-current={route === k ? 'page' : undefined}>
              {label}
            </a>
          ))}
        </nav>
        {partner ? (
          <div className="who">
            <b>{partner.name}</b>
            <button
              className="link"
              onClick={() => {
                api.leave()
                setPartner(null)
                go('home')
              }}
            >
              나가기
            </button>
          </div>
        ) : (
          <a className="btn small" href="#/new">
            시작하기
          </a>
        )}
      </header>

      <div className="demo" role="note">
        시연용 화면입니다. 아직 서버에 연결되지 않아 입력한 내용은 이 브라우저에만 저장되고, 앱에는 올라가지 않습니다.
      </div>

      <main>
        {needLogin ? (
          <Start onDone={setPartner} />
        ) : route === 'new' ? (
          <NewQuest partner={partner} onDone={() => (refresh(), go('quests'))} />
        ) : route === 'quests' ? (
          <Quests key={tick} onChange={refresh} />
        ) : route === 'report' ? (
          <Report partner={partner} />
        ) : (
          <Home />
        )}
      </main>

      <footer>집게표 파트너 · 문의는 운영진에게 · 요금과 문구는 임시입니다</footer>
    </div>
  )
}

function Home() {
  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">기업·기관용 환경 미화 의뢰</p>
          <h1>
            치울 곳만 알려 주세요.
            <br />
            동네 이웃이 <mark>출동</mark>합니다.
          </h1>
          <p className="lead">장소와 보상을 정해 의뢰를 올리면 근처 집게표 사용자가 치우고, 전후 사진과 위치로 인증합니다. 끝나면 활동 리포트로 정리해 드려요.</p>
          <div className="row">
            <a className="btn" href="#/new">
              의뢰 만들기
            </a>
            <a className="btn ghost" href="#/report">
              리포트 예시 보기
            </a>
          </div>
        </div>
        <QuestCard q={{ title: '호암지 산책로 쓰레기 줍기', partner: '충주시 제휴', place_type: 'park', reward_type: 'voucher', reward_amount: 5000 }} />
      </section>

      <section className="steps">
        {[
          ['1', '의뢰 작성', '장소, 기간, 모집 인원, 보상을 적어요. 앱에 보일 모습을 바로 확인할 수 있어요.'],
          ['2', '운영진 검토', '위험한 장소나 환경 미화와 무관한 내용이 아닌지 확인한 뒤 앱에 공개해요.'],
          ['3', '이웃이 해결', '의뢰 장소 100m 안에서 앱 카메라로 찍은 사진만 인증돼요.'],
          ['4', '리포트 받기', '참여 인원, 완료 건수, 전후 사진을 ESG 활동 자료로 정리해요.'],
        ].map(([n, t, d]) => (
          <article key={n} className="card">
            <span className="num">{n}</span>
            <h3>{t}</h3>
            <p>{d}</p>
          </article>
        ))}
      </section>

      <section className="card note">
        <h3>이런 의뢰는 받지 않아요</h3>
        <p>깨진 유리·주사기·폐기물처럼 다칠 수 있는 것, 사유지 무단 출입이 필요한 곳, 차도 한가운데, 환경 미화와 관계없는 심부름은 올릴 수 없어요.</p>
      </section>
    </>
  )
}

function Start({ onDone }) {
  const [name, setName] = useState('')
  const [manager, setManager] = useState('')
  return (
    <section className="card narrow">
      <h2>업체 정보를 알려 주세요</h2>
      <p className="sub">지금은 시연용이라 이름만 받아요. 실제 서비스에서는 사업자 확인과 로그인이 들어갑니다.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (name.trim()) onDone(api.start(name, manager))
        }}
      >
        <Field label="업체·기관 이름">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 충주시 자원순환과" maxLength={30} required />
        </Field>
        <Field label="담당자 이름 (선택)">
          <input value={manager} onChange={(e) => setManager(e.target.value)} maxLength={20} />
        </Field>
        <button className="btn" disabled={!name.trim()}>
          시작하기
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
        className="card"
        onSubmit={(e) => {
          e.preventDefault()
          if (errors.length) return
          api.create({ ...q, reward_amount: Number(q.reward_amount), capacity: Number(q.capacity) })
          onDone()
        }}
      >
        <h2>의뢰 만들기</h2>
        <Field label="제목" hint="앱 카드에 그대로 보여요">
          <input value={q.title} onChange={set('title')} placeholder="예: 호암지 산책로 쓰레기 줍기" maxLength={30} />
        </Field>
        <Field label="설명">
          <textarea value={q.description} onChange={set('description')} rows={3} maxLength={200} placeholder="무엇을 어디까지 치우면 되는지 적어 주세요" />
        </Field>
        <div className="grid2">
          <Field label="장소 유형">
            <select value={q.place_type} onChange={set('place_type')}>
              {PLACES.map(([v, l]) => (
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
        <Field label="주소" hint="지도에서 위치를 찍는 기능은 서버 연결 뒤에 들어가요">
          <input value={q.address} onChange={set('address')} placeholder="예: 충주시 호암동 568" maxLength={60} />
        </Field>
        <Field label="인증 방식">
          <div className="seg">
            {[
              ['before_after', '치우기 전·뒤 사진 2장'],
              ['single', '사진 1장 (상태 알리기)'],
            ].map(([v, l]) => (
              <label key={v} className={q.proof_mode === v ? 'on' : ''}>
                <input type="radio" name="proof" checked={q.proof_mode === v} onChange={() => setQ({ ...q, proof_mode: v })} />
                {l}
              </label>
            ))}
          </div>
        </Field>
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
        <label className="check">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          <span>다칠 수 있는 물건, 출입이 제한된 곳, 차도 위 작업이 아니에요. 환경 미화 목적의 의뢰예요.</span>
        </label>
        {errors.length ? <p className="err">{errors[0]}</p> : null}
        <button className="btn" disabled={errors.length > 0}>
          검토 요청하기
        </button>
        <p className="sub">요청하면 운영진이 확인한 뒤 앱에 공개해요. 결제는 지금 단계에서는 받지 않고, 공개 전에 운영진이 정산 방법을 안내해요.</p>
      </form>

      <aside>
        <div className="card">
          <h3>앱에 이렇게 보여요</h3>
          <QuestCard q={{ ...q, partner: `${partner.name} 제휴` }} />
        </div>
        <div className="card">
          <h3>예상 비용</h3>
          <dl className="cost">
            <dt>
              보상 ({won(q.reward_amount)} × {Number(q.capacity || 0)}명)
            </dt>
            <dd>{won(cost.reward)}</dd>
            <dt>운영 수수료 ({Math.round(FEE_RATE * 100)}%, 임시)</dt>
            <dd>{won(cost.fee)}</dd>
            <dt className="total">최대 합계</dt>
            <dd className="total">{won(cost.total)}</dd>
          </dl>
          <p className="sub">실제 청구는 인증이 완료된 인원만큼만 해요.</p>
        </div>
      </aside>
    </div>
  )
}

function Quests({ onChange }) {
  const list = api.quests()
  if (!list.length)
    return (
      <section className="card narrow center">
        <h2>아직 올린 의뢰가 없어요</h2>
        <a className="btn" href="#/new">
          첫 의뢰 만들기
        </a>
      </section>
    )
  return (
    <section>
      <div className="head">
        <h2>내 의뢰</h2>
        <a className="btn small" href="#/new">
          새 의뢰
        </a>
      </div>
      <div className="list">
        {list.map((q) => {
          const [label, tone] = STATUS[q.status]
          const pct = q.capacity ? Math.round((q.completed / q.capacity) * 100) : 0
          return (
            <article key={q.id} className="card quest">
              <div className="head">
                <div>
                  <span className={`badge ${tone}`}>{label}</span>
                  {q.sample ? <span className="badge">예시</span> : null}
                  <h3>{q.title}</h3>
                  <p className="sub">
                    {q.place_name} · {placeLabel(q.place_type)} · {day(q.starts_on)} ~ {day(q.ends_on)}
                  </p>
                </div>
                <div className="right">
                  <b>{won(q.reward_amount)}</b>
                  <span className="sub">1인 보상</span>
                </div>
              </div>
              {q.status === 'review' ? (
                <div className="head">
                  <p className="sub">운영진이 확인하고 있어요. 보통 영업일 기준 하루 안에 답을 드려요.</p>
                  <button
                    className="btn ghost small"
                    onClick={() => {
                      api.cancel(q.id)
                      onChange()
                    }}
                  >
                    요청 취소
                  </button>
                </div>
              ) : (
                <>
                  <div className="bar" role="img" aria-label={`완료 ${q.completed}명, 모집 ${q.capacity}명`}>
                    <i style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <p className="sub">
                    수락 {q.joined}명 · 인증 완료 {q.completed}명 / 모집 {q.capacity}명 ({pct}%)
                  </p>
                </>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}

const DAYS = ['월', '화', '수', '목', '금', '토', '일']

function Report({ partner }) {
  const r = api.report()
  const max = Math.max(1, ...r.daily)
  return (
    <section className="report">
      <div className="head">
        <div>
          <h2>활동 리포트</h2>
          <p className="sub">
            {partner.name} · {day(new Date().toISOString())} 기준 · 예시 의뢰가 포함된 숫자입니다
          </p>
        </div>
        <button className="btn ghost small noprint" onClick={() => window.print()}>
          인쇄·PDF로 저장
        </button>
      </div>
      <div className="stats">
        {[
          ['진행한 의뢰', `${r.quests}건`],
          ['참여한 이웃', `${r.joined}명`],
          ['인증 완료', `${r.completed}건`],
          ['지급한 보상', won(r.paid)],
        ].map(([k, v]) => (
          <div key={k} className="card stat">
            <span className="sub">{k}</span>
            <b>{v}</b>
          </div>
        ))}
      </div>
      <div className="split even">
        <div className="card">
          <h3>요일별 인증 완료</h3>
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
        <div className="card">
          <h3>장소 유형별 완료</h3>
          {r.byPlace.length ? (
            r.byPlace.map(([k, v]) => (
              <div key={k} className="hrow">
                <span>{placeLabel(k)}</span>
                <div className="bar">
                  <i style={{ width: `${(v / Math.max(1, r.completed)) * 100}%` }} />
                </div>
                <b>{v}건</b>
              </div>
            ))
          ) : (
            <p className="sub">아직 완료된 인증이 없어요.</p>
          )}
        </div>
      </div>
      <div className="card">
        <h3>의뢰별 결과</h3>
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
        <p className="sub">전후 사진 모음은 서버 연결 뒤에 리포트에 함께 들어갑니다.</p>
      </div>
    </section>
  )
}

function Field({ label, hint, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint ? <small>{hint}</small> : null}
    </label>
  )
}

// 앱 의뢰판 카드와 비슷하게 그린 미리보기입니다.
function QuestCard({ q }) {
  const reward = q.reward_type === 'point' ? `${Number(q.reward_amount || 0).toLocaleString('ko-KR')}P` : won(q.reward_amount)
  return (
    <div className="phone" aria-label="앱 카드 미리보기">
      <div className="qc">
        <div className="thumb">🎁</div>
        <div>
          <span className="tag">제휴 의뢰</span>
          <strong>{q.title || '의뢰 제목'}</strong>
          <span className="meta">
            {q.partner} · {placeLabel(q.place_type)}
          </span>
          <span className="pill">{reward}</span>
        </div>
      </div>
    </div>
  )
}
