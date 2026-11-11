# frontend

줍퀘스트 웹 프론트엔드 (Vite + React). 모바일 화면 기준으로 만듭니다.

```bash
cp .env.example .env   # Supabase URL / anon key 입력
npm install
npm run dev            # http://localhost:5173
npm run build          # 배포용 빌드
npm run lint
```

Supabase 클라이언트는 `src/lib/supabase.js` 에서 가져다 씁니다.

```js
import { supabase } from './lib/supabase'
const { data } = await supabase.from('reports').select('*')
```
