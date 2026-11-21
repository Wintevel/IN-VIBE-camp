import React from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

// 같은 빌드를 /partner/ 와 /dev/ 에 올립니다. 주소가 /dev 로 끝나면 운영 화면을 엽니다.
// (로컬 개발 서버에서는 http://localhost:5173/?dev 로도 열 수 있어요)
const isDev = /\/dev(\/|\/index\.html)?$/.test(window.location.pathname) || new URLSearchParams(window.location.search).has('dev')
document.title = isDev ? '집게표 운영' : '집게표 파트너'

const root = createRoot(document.getElementById('root'))
;(isDev ? import('./Dev.jsx') : import('./App.jsx')).then(({ default: Page }) => root.render(<Page />))
