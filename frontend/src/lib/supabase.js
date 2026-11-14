import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const url = process.env.EXPO_PUBLIC_SUPABASE_URL
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

// 값이 없으면 앱은 기기 저장소 모드(src/api/local.js)로 동작합니다.
export const hasSupabase = !!(url && anonKey)

// anon key 는 앱에 포함되는 공개 키입니다. 접근 제어는 Supabase RLS 정책으로 합니다.
export const supabase = createClient(url || 'http://localhost', anonKey || 'missing', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
