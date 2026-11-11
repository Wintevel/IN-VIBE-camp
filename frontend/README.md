# frontend

줍퀘스트 모바일 앱 (React Native + Expo, JavaScript).

```bash
cp .env.example .env     # Supabase URL / anon key 입력
npm install
npx expo start           # 폰의 Expo Go 앱으로 QR 스캔, 또는 a(Android)·i(iOS 시뮬레이터)
```

- 카메라·위치는 실제 폰에서 확인하세요. 웹(`w`)은 지원 대상이 아닙니다.
- 패키지 추가는 `npx expo install <패키지>` 로 합니다.
- Supabase 클라이언트는 `src/lib/supabase.js` 에서 가져다 씁니다.

```js
import { supabase } from './src/lib/supabase'
const { data } = await supabase.from('reports').select('*')
```
