import Svg, { Circle, Path, Rect } from 'react-native-svg'

const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }

export function TabIcon({ name, color, size = 24 }) {
  const p = { ...base, stroke: color }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'board' && (
        <>
          <Rect x="4" y="3" width="16" height="18" rx="3" {...p} />
          <Path d="M8 8h8M8 12h8M8 16h5" {...p} />
        </>
      )}
      {name === 'map' && (
        <>
          <Path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" {...p} />
          <Path d="M9 4v14M15 6v14" {...p} />
        </>
      )}
      {name === 'crew' && (
        <>
          <Path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" {...p} />
          <Path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4" {...p} />
        </>
      )}
      {name === 'me' && (
        <>
          <Circle cx="12" cy="8" r="4" {...p} />
          <Path d="M4 21a8 8 0 0 1 16 0" {...p} />
        </>
      )}
    </Svg>
  )
}

export function HeartIcon({ filled, color, size = 18 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 21s-7.5-4.6-9.5-9.2C1.2 8.7 3 5.5 6.2 5.5c2 0 3.4 1.1 4.3 2.4l1.5 1.9 1.5-1.9c.9-1.3 2.3-2.4 4.3-2.4 3.2 0 5 3.2 3.7 6.3C19.5 16.4 12 21 12 21Z"
        {...base}
        stroke={color}
        fill={filled ? color : 'none'}
      />
    </Svg>
  )
}
