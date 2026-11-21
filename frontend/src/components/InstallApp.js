import { useState } from 'react'
import { Linking, Text, View } from 'react-native'
import { APK_URL, useInstall } from '../lib/install'
import { colors, text } from '../theme'
import Button from './Button'
import { Card } from './ListRows'

const fixed = { flexGrow: 0, flexShrink: 0, flexBasis: 'auto' } // 세로로 쌓을 때 높이가 늘어나지 않게

// 웹에서만 보이는 설치 버튼. 홈 화면 앱(PWA)으로 설치하거나, 안드로이드면 APK 를 받게 합니다.
// card: 내 정보용(카드 안에 제목과 설명), 아니면 첫 화면용(버튼만)
export default function InstallApp({ card }) {
  const { showInstall, showApk, ios, install } = useInstall()
  const [hint, setHint] = useState(false)
  if (!showInstall) return null

  const onInstall = async () => {
    if ((await install()) === 'manual') setHint(true)
  }
  const guide = ios ? '사파리 아래 공유 버튼을 누르고 "홈 화면에 추가"를 골라 주세요.' : '브라우저 메뉴(⋮)에서 "앱 설치" 또는 "홈 화면에 추가"를 눌러 주세요.'

  const body = (
    <View style={{ gap: 10 }}>
      <Button type={card ? 'weak' : 'ghost'} style={fixed} onPress={onInstall}>
        홈 화면에 앱으로 설치
      </Button>
      {showApk ? (
        <Button type="ghost" style={fixed} onPress={() => Linking.openURL(APK_URL)}>
          갤럭시·안드로이드 앱(APK) 받기
        </Button>
      ) : null}
      {hint ? <Text style={[text.caption, { color: colors.fg }]}>{guide}</Text> : null}
      {showApk ? <Text style={text.caption}>APK 는 받은 파일을 열 때 "출처를 알 수 없는 앱" 설치를 한 번 허용해야 해요.</Text> : null}
    </View>
  )
  if (!card) return body
  return (
    <Card style={{ gap: 12 }}>
      <View style={{ gap: 2 }}>
        <Text style={text.cardTitle}>앱으로 설치하기</Text>
        <Text style={text.small}>주소창 없이 앱처럼 열고, 홈 화면에서 바로 실행해요.</Text>
      </View>
      {body}
    </Card>
  )
}
