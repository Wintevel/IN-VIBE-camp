import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base 를 상대 경로로 두어 GitHub Pages 의 하위 폴더(/partner/)에서도 그대로 열립니다.
export default defineConfig({ base: './', plugins: [react()] })
