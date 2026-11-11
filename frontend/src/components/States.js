import { ActivityIndicator, RefreshControl, Text, View } from 'react-native'
import { colors, text } from '../theme'
import Button from './Button'

export function Empty({ title, sub, action, onAction }) {
  return (
    <View style={{ alignItems: 'center', gap: 8, paddingVertical: 40 }}>
      <Text style={[text.section, { textAlign: 'center' }]}>{title}</Text>
      {sub ? <Text style={[text.small, { textAlign: 'center' }]}>{sub}</Text> : null}
      {action ? (
        <Button type="ghost" style={{ flex: 0, paddingHorizontal: 20, marginTop: 8 }} onPress={onAction}>
          {action}
        </Button>
      ) : null}
    </View>
  )
}

export function Loading() {
  return (
    <View style={{ paddingVertical: 40 }}>
      <ActivityIndicator color={colors.sub} />
    </View>
  )
}

export const refresher = (app) => <RefreshControl refreshing={app.loading} onRefresh={() => app.refresh({ relocate: true })} tintColor={colors.sub} />
