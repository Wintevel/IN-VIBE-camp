import { colors } from '../theme'

// 지도 문서(Leaflet + OpenStreetMap). 네이티브는 WebView, 웹은 iframe 에 넣습니다.
// 네이버지도 SDK 는 개발 빌드와 키가 필요해, 그 전까지 키 없이 동작하는 지도로 둡니다.
export function buildMapHtml({ center, me, markers }) {
  const data = JSON.stringify({ center, me, markers }).replace(/</g, '\\u003c')
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>html,body,#m{height:100%;margin:0;background:#E4E9F2}
.leaflet-tile-pane{filter:saturate(.45) contrast(.92) brightness(1.04)}
.leaflet-popup-content-wrapper,.leaflet-popup-tip{background:${colors.panel};color:${colors.fg};box-shadow:6px 6px 14px #C2CBD9,-6px -6px 14px #fff}
.leaflet-popup-content{margin:10px 12px;font:700 13px 'Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',system-ui,sans-serif}
.leaflet-popup-content small{display:block;font-weight:500;color:${colors.sub};margin-top:2px}
.leaflet-control-attribution{background:rgba(228,233,242,.85)!important;color:${colors.sub}!important;font-size:9px}
.leaflet-control-attribution a{color:${colors.sub}!important}</style></head>
<body><div id="m"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>
var d=${data};
var send=function(id){var s=JSON.stringify({type:'report',id:id});if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(s);else window.parent.postMessage(s,'*')};
var map=L.map('m',{zoomControl:false}).setView([d.center.lat,d.center.lng],15);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(map);
d.markers.forEach(function(k){
  var c=L.circleMarker([k.lat,k.lng],{radius:9,color:'#FFFFFF',weight:3,fillColor:k.color,fillOpacity:.95}).addTo(map);
  c.on('click',function(){send(k.id)});
});
if(d.me){L.circleMarker([d.me.lat,d.me.lng],{radius:7,color:'#fff',weight:3,fillColor:'${colors.blue}',fillOpacity:1}).addTo(map)}
</script></body></html>`
}
