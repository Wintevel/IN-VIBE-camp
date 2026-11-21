// 웹은 ttf(한글 폰트 1개 6MB)를 번들에 넣지 않고 구글 폰트 스타일시트를 씁니다.
const HREF = 'https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Noto+Sans+KR:wght@400;500;700;800&family=JetBrains+Mono:wght@500;700&display=swap'

export function useAppFonts() {
  if (typeof document !== 'undefined' && !document.getElementById('jq-fonts')) {
    const link = document.createElement('link')
    link.id = 'jq-fonts'
    link.rel = 'stylesheet'
    link.href = HREF
    document.head.appendChild(link)
    // 한글이 글자 단위로 끊기지 않고 띄어쓰기에서 줄바꿈되게 합니다(긴 영문·숫자는 넘치면 끊음).
    const style = document.createElement('style')
    style.textContent = '#root, #root * { word-break: keep-all; overflow-wrap: anywhere; }'
    document.head.appendChild(style)
  }
  return true
}
