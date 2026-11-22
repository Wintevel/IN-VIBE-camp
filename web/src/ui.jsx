// 파트너 웹과 운영 웹(/dev)이 같이 쓰는 작은 조각들
import { useEffect, useState } from 'react'

export const won = (n) => `${Number(n || 0).toLocaleString('ko-KR')}원`
export const num = (n) => Number(n || 0).toLocaleString('ko-KR')
export const day = (s) => (s ? String(s).slice(0, 10).replaceAll('-', '.') : '')
export const today = () => {
  const d = new Date()
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}
export const when = (s) => {
  if (!s) return ''
  const d = new Date(s)
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export const useRoute = (fallback) => {
  const get = () => window.location.hash.replace('#/', '') || fallback
  const [route, setRoute] = useState(get)
  useEffect(() => {
    const on = () => setRoute(get())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return [route, (r) => (window.location.hash = `#/${r}`)]
}

const P = {
  camera: 'M4 8.5A2.5 2.5 0 0 1 6.5 6h1.6l1.2-1.8A1.5 1.5 0 0 1 10.5 3.5h3a1.5 1.5 0 0 1 1.2.7L15.9 6h1.6A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5zM12 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  pin: 'M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3.5 2',
  percent: 'M18 6 6 18M7.5 9.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM16.5 18.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  check: 'm5 12.5 4.5 4.5L19 7.5',
  x: 'M7 7l10 10M17 7 7 17',
  arrow: 'M5 12h13M13 6l6 6-6 6',
  chart: 'M4 20h16M7 16v-5M12 16V7M17 16v-8',
  shield: 'M12 3 5 6v5.5c0 4.4 3 8 7 9.5 4-1.5 7-5.1 7-9.5V6zM9 12l2.2 2.2L15.5 10',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5a7.5 7.5 0 0 1 15 0',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
  coin: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9 9.5h4.5a1.75 1.75 0 0 1 0 3.5H10.5a1.75 1.75 0 0 0 0 3.5H15M12 7.5v1.5M12 16.5V18',
  ban: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM5.7 5.7l12.6 12.6',
  inbox: 'M4 13h4.5l1.5 2.5h4L15.5 13H20M4 13l2.5-7.5h11L20 13v5.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5z',
  users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.3a3.5 3.5 0 0 1 0 6.4M18.5 14.2A6.5 6.5 0 0 1 21.5 20',
  gift: 'M4 11h16v9H4zM3 7h18v4H3zM12 7v13M12 7S10.5 3 8 3.5 7.5 7 12 7zM12 7s1.5-4 4-3.5S16.5 7 12 7z',
  search: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM20 20l-4.8-4.8',
  chev: 'm9 6 6 6-6 6',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
}

export function Icon({ name, size = 20, stroke = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[name]} />
    </svg>
  )
}

export function Field({ label, hint, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint ? <small>{hint}</small> : null}
    </label>
  )
}

// 앱의 어두운 의뢰판 카드처럼 그린 미리보기
export function QuestCard({ q, placeLabel }) {
  const reward = q.reward_type === 'point' ? `${num(q.reward_amount)}P` : won(q.reward_amount)
  return (
    <div className="phone" aria-label="앱 카드 미리보기">
      <div className="qc">
        <div className="thumb">
          <Icon name="gift" size={26} stroke={1.6} />
        </div>
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

export function Shots({ c }) {
  const shots = c.single ? [['사진', c.before]] : [['치우기 전', c.before], ['치운 뒤', c.after]]
  return (
    <div className="shots">
      {shots.map(([name, src]) => (
        <figure key={name}>
          {src ? (
            <a href={src} target="_blank" rel="noreferrer">
              <img src={src} alt={`${name} 사진`} loading="lazy" />
            </a>
          ) : (
            <div className="noshot">사진 없음</div>
          )}
          <figcaption>{name}</figcaption>
        </figure>
      ))}
    </div>
  )
}

export const mapLink = (lat, lng) => `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`

// 승인·반려 버튼. 반려는 사유를 받습니다.
export function Decide({ busy, onDecide, approveLabel = '승인', rejectHint, minReason = 2 }) {
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  if (rejecting)
    return (
      <div className="decide">
        <label className="field">
          <span>반려 사유</span>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={rejectHint} maxLength={80} autoFocus />
        </label>
        <div className="actions">
          <button className="btn ghost small" disabled={busy} onClick={() => (setRejecting(false), setReason(''))}>
            취소
          </button>
          <button className="btn small danger" disabled={busy || reason.trim().length < minReason} onClick={() => onDecide(false, reason.trim())}>
            반려하기
          </button>
        </div>
      </div>
    )
  return (
    <div className="actions">
      <button className="btn ghost small" disabled={busy} onClick={() => setRejecting(true)}>
        반려
      </button>
      <button className="btn small" disabled={busy} onClick={() => onDecide(true, '')}>
        {approveLabel}
      </button>
    </div>
  )
}

// 숫자 줄: [이름, 값, 단위, 강조] 목록을 아이콘 없이 한 줄로 보여 줍니다.
export function Stats({ items, plain }) {
  return (
    <div className={`stats${plain ? ' plain' : ''}`} style={{ '--n': items.length }}>
      {items.map(([k, v, unit, hot]) => (
        <div key={k}>
          <span className="k">{k}</span>
          <span className={`v${hot ? ' hot' : ''}`}>
            {v}
            {unit ? <small>{unit}</small> : null}
          </span>
        </div>
      ))}
    </div>
  )
}

// 오른쪽 꺾쇠가 붙은 파란 글자 링크
export function More({ href, children, small }) {
  return (
    <a className={`more${small ? ' small' : ''}`} href={href}>
      {children}
      <Icon name="chev" size={small ? 14 : 16} stroke={2} />
    </a>
  )
}
