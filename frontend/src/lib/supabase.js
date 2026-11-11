import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  console.warn('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 가 없습니다. frontend/.env.example 을 참고해 frontend/.env 를 만드세요.')
}

// anon key 는 브라우저에 노출되는 공개 키입니다. 접근 제어는 Supabase RLS 정책으로 합니다.
export const supabase = createClient(url ?? 'http://localhost', anonKey ?? 'missing')
