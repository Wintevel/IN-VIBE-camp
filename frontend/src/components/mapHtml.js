import { colors, theme } from '../theme'

// 지도 문서(Leaflet + CARTO 기본 지도, OpenStreetMap 데이터). 네이티브는 WebView, 웹은 iframe 에 넣습니다.
// 네이버지도 SDK 는 개발 빌드와 키가 필요해, 그 전까지 키 없이 동작하는 지도로 둡니다.
// 2026-11-23: OSM 타일을 필터로 어둡게 뒤집던 방식(위성 사진처럼 탁해 보임)을 빼고, 화면 모드에 맞는 CARTO 다크·라이트 지도를 씁니다.
export function buildMapHtml({ center, me, markers }) {
  const style = theme.scheme === 'light' ? 'light_all' : 'dark_all'
  const data = JSON.stringify({ center, me, markers }).replace(/</g, '\\u003c')
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>html,body,#m{height:100%;margin:0;background:${colors.panel2}}
.leaflet-popup-content-wrapper,.leaflet-popup-tip{background:${colors.panel};color:${colors.fg}}
.leaflet-popup-content{margin:10px 12px;font:700 13px 'Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',system-ui,sans-serif}
.leaflet-popup-content small{display:block;font-weight:500;color:${colors.sub};margin-top:2px}
.leaflet-control-attribution{background:${colors.panel}!important;opacity:.85;color:${colors.sub}!important;font-size:9px}
.leaflet-control-attribution a{color:${colors.sub}!important}</style></head>
<body><div id="m"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>
var d=${data};
var send=function(id){var s=JSON.stringify({type:'report',id:id});if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(s);else window.parent.postMessage(s,'*')};
var map=L.map('m',{zoomControl:false}).setView([d.center.lat,d.center.lng],15);
L.tileLayer('https://{s}.basemaps.cartocdn.com/${style}/{z}/{x}/{y}{r}.png',{maxZoom:19,subdomains:'abcd',attribution:'&copy; OpenStreetMap &copy; CARTO'}).addTo(map);
d.markers.forEach(function(k){
  var c=L.circleMarker([k.lat,k.lng],{radius:9,color:'${colors.ink}',weight:2,fillColor:k.color,fillOpacity:.95}).addTo(map);
  c.on('click',function(){send(k.id)});
});
if(d.me){L.circleMarker([d.me.lat,d.me.lng],{radius:7,color:'${colors.panel}',weight:3,fillColor:'${colors.blue}',fillOpacity:1}).addTo(map)}
</script></body></html>`
}
