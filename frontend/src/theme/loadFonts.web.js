// 웹은 ttf(한글 폰트 1개 6MB)를 번들에 넣지 않고, 쓰는 글자만 뽑은 woff2(public/fonts/, 합계 1.2MB)를 같은 주소에서 받습니다.
// 구글 폰트는 현장 인터넷이 느리거나 막히면 윈도우 기본 글꼴로 바뀌어 보여서 쓰지 않습니다. 만드는 법은 scripts/make-web-fonts.py.
const HREF = '/IN-VIBE-camp/fonts/fonts.css'

export function useAppFonts() {
  if (typeof document !== 'undefined' && !document.getElementById('jq-fonts')) {
    // index.html 이 이미 같은 스타일시트를 불러왔으면 다시 넣지 않습니다.
    if (!document.querySelector(`link[href="${HREF}"]`)) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = HREF
      document.head.appendChild(link)
    }
    // 한글이 글자 단위로 끊기지 않고 띄어쓰기에서 줄바꿈되게 합니다(긴 영문·숫자는 넘치면 끊음).
    const style = document.createElement('style')
    style.id = 'jq-fonts' // 위 검사로 한 번만 넣기 위한 표시
    style.textContent = '#root, #root * { word-break: keep-all; overflow-wrap: anywhere; }'
    document.head.appendChild(style)
  }
  return true
}
