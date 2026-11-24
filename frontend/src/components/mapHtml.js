import { colors, theme } from '../theme'
import { DEMO } from '../lib/demo'

// 지도 문서(Leaflet + CARTO 기본 지도, OpenStreetMap 데이터). 네이티브는 WebView, 웹은 iframe 에 넣습니다.
// 네이버지도 SDK 는 개발 빌드와 키가 필요해, 그 전까지 키 없이 동작하는 지도로 둡니다.
// 2026-11-23: OSM 타일을 색 반전 필터로 어둡게 만들던 방식(위성 사진처럼 탁해 보임)을 뺐습니다.
// CARTO 지도는 키를 요구해서(api key required) 키 없이 되는 OSM 기본 지도를 그대로 쓰고, 다크 모드에서는 밝기만 조금 낮춥니다.
export function buildMapHtml({ center, me, markers }) {
  const dim = theme.scheme === 'light' ? '' : '.leaflet-tile-pane{filter:brightness(.82) saturate(.85)}'
  const data = JSON.stringify({ center, me, markers }).replace(/</g, '\\u003c')
  // 전시 시연판: 인터넷이 없어 지도 그림(타일)을 못 받으므로 Leaflet 은 zip 안의 파일을 쓰고, 바탕은 거리 격자 무늬로 대신합니다.
  const leaflet = DEMO ? '/IN-VIBE-camp/offline/leaflet/leaflet' : 'https://unpkg.com/leaflet@1.9.4/dist/leaflet'
  const grid = theme.scheme === 'light' ? ['#E9ECF0', '#FFFFFF', '#DCE1E7'] : ['#1A1D23', '#262A32', '#20242B']
  const offlineCss = DEMO
    ? `.grid{background-color:${grid[0]};background-image:linear-gradient(${grid[1]} 7px,transparent 7px),linear-gradient(90deg,${grid[1]} 7px,transparent 7px),linear-gradient(${grid[2]} 1px,transparent 1px),linear-gradient(90deg,${grid[2]} 1px,transparent 1px);background-size:256px 256px,256px 256px,64px 64px,64px 64px}
.note{position:absolute;left:10px;top:10px;z-index:500;font:600 11px 'Noto Sans KR','Malgun Gothic',sans-serif;color:${colors.sub};background:${colors.panel};opacity:.9;padding:5px 9px;border-radius:999px}`
    : ''
  // 지도와 같이 움직이는 격자 바탕(타일 대신). 인터넷 요청이 없습니다.
  const gridLayer = "var G=L.GridLayer.extend({createTile:function(){var t=document.createElement('div');t.className='grid';return t}});new G({tileSize:256,maxZoom:19}).addTo(map);"
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="${leaflet}.css">
<style>html,body,#m{height:100%;margin:0;background:${colors.panel2}}
${dim}
${offlineCss}
.leaflet-popup-content-wrapper,.leaflet-popup-tip{background:${colors.panel};color:${colors.fg}}
.leaflet-popup-content{margin:10px 12px;font:700 13px 'Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',system-ui,sans-serif}
.leaflet-popup-content small{display:block;font-weight:500;color:${colors.sub};margin-top:2px}
.leaflet-control-attribution{background:${colors.panel}!important;opacity:.85;color:${colors.sub}!important;font-size:9px}
.leaflet-control-attribution a{color:${colors.sub}!important}</style></head>
<body><div id="m"></div>${DEMO ? '<div class="note">시연판 · 인터넷 없이 보는 간이 지도</div>' : ''}<script src="${leaflet}.js"></script><script>
var d=${data};
var send=function(id){var s=JSON.stringify({type:'report',id:id});if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(s);else window.parent.postMessage(s,'*')};
var map=L.map('m',{zoomControl:false}).setView([d.center.lat,d.center.lng],15);
${DEMO ? gridLayer : "L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(map);"}
d.markers.forEach(function(k){
  var c=L.circleMarker([k.lat,k.lng],{radius:9,color:'${colors.ink}',weight:2,fillColor:k.color,fillOpacity:.95}).addTo(map);
  c.on('click',function(){send(k.id)});
});
if(d.me){L.circleMarker([d.me.lat,d.me.lng],{radius:7,color:'${colors.panel}',weight:3,fillColor:'${colors.blue}',fillOpacity:1}).addTo(map)}
</script></body></html>`
}
