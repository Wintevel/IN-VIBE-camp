// 집게표 전시 시연판용 작은 로컬 웹 서버(인터넷 불필요).
// zip 의 site 폴더를 http://localhost:8723/IN-VIBE-camp/ 로 열고, 기본 브라우저를 띄웁니다.
// 이 PC(127.0.0.1)에서만 접속할 수 있습니다. 창을 닫으면 서버도 꺼집니다.
//
// 빌드: scripts/build-offline.js 가 GOOS=windows 로 server/jipgepyo-server.exe 를 만듭니다(Go 가 있을 때만).
// 같은 동작을 PowerShell 로 한 server.ps1 이 있어, exe 를 못 쓰면 START.bat 이 그쪽으로 넘어갑니다.
package main

import (
	"fmt"
	"mime"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"
)

const (
	base      = "/IN-VIBE-camp/"
	probe     = "/__jipgepyo"
	firstPort = 8723
	lastPort  = 8732
)

var types = map[string]string{
	".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
	".json": "application/json", ".webmanifest": "application/manifest+json", ".map": "application/json",
	".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".svg": "image/svg+xml",
	".ico": "image/x-icon", ".webp": "image/webp", ".ttf": "font/ttf", ".otf": "font/otf", ".woff": "font/woff",
	".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8", ".wasm": "application/wasm",
}

func main() {
	root := ""
	if len(os.Args) > 1 {
		root = os.Args[1]
	} else if exe, err := os.Executable(); err == nil {
		root = filepath.Join(filepath.Dir(exe), "..", "site")
	}
	root, _ = filepath.Abs(root)
	if st, err := os.Stat(filepath.Join(root, "IN-VIBE-camp", "index.html")); err != nil || st.IsDir() {
		fmt.Println("[오류] site 폴더를 찾지 못했어요:", root)
		fmt.Println("zip 을 먼저 '압축 풀기' 한 뒤, 풀린 폴더 안의 START.bat 을 실행해 주세요.")
		os.Exit(2)
	}
	for k, v := range types {
		_ = mime.AddExtensionType(k, v)
	}

	for port := firstPort; port <= lastPort; port++ {
		url := fmt.Sprintf("http://localhost:%d%s", port, base)
		ln, err := net.Listen("tcp4", fmt.Sprintf("127.0.0.1:%d", port))
		if err != nil {
			// 이미 집게표 서버가 떠 있으면 그 주소를 다시 엽니다(같은 주소여야 이 PC 에 쌓인 기록이 이어짐).
			if ours(port) {
				fmt.Println("이미 실행 중이에요. 브라우저를 다시 엽니다:", url)
				open(url)
				return
			}
			continue
		}
		// 브라우저가 localhost 를 ::1 로 먼저 찾는 경우를 위해 IPv6 도 엽니다(안 되면 무시).
		if ln6, err := net.Listen("tcp6", fmt.Sprintf("[::1]:%d", port)); err == nil {
			go http.Serve(ln6, handler(root))
		}
		fmt.Println("집게표 시연판이 켜졌어요:", url)
		fmt.Println("이 창을 닫으면 꺼집니다. 브라우저가 안 열리면 위 주소를 직접 입력하세요.")
		go func() {
			time.Sleep(400 * time.Millisecond)
			open(url)
		}()
		if err := http.Serve(ln, handler(root)); err != nil {
			fmt.Println("[오류]", err)
			os.Exit(1)
		}
		return
	}
	fmt.Printf("[오류] %d~%d 포트를 모두 쓸 수 없어요.\n", firstPort, lastPort)
	os.Exit(1)
}

func ours(port int) bool {
	c := http.Client{Timeout: 2 * time.Second}
	r, err := c.Get(fmt.Sprintf("http://127.0.0.1:%d%s", port, probe))
	if err != nil {
		return false
	}
	defer r.Body.Close()
	b := make([]byte, 16)
	n, _ := r.Body.Read(b)
	return string(b[:n]) == "jipgepyo"
}

func handler(root string) http.Handler {
	index := filepath.Join(root, "IN-VIBE-camp", "index.html")
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		p := r.URL.Path
		switch {
		case p == probe:
			w.Write([]byte("jipgepyo"))
			return
		case p == "/" || p == strings.TrimSuffix(base, "/"):
			http.Redirect(w, r, base, http.StatusFound)
			return
		}
		file := filepath.Join(root, filepath.FromSlash(filepath.Clean("/"+p)))
		if !strings.HasPrefix(file, root) {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
		if st, err := os.Stat(file); err == nil && st.IsDir() {
			if !strings.HasSuffix(p, "/") {
				http.Redirect(w, r, p+"/", http.StatusFound)
				return
			}
			file = filepath.Join(file, "index.html")
		}
		if st, err := os.Stat(file); err != nil || st.IsDir() {
			// 앱 안 주소로 바로 들어오거나 새로고침하면 앱 첫 화면(index.html)을 돌려줍니다.
			if filepath.Ext(file) != "" || !strings.HasPrefix(p, base) {
				http.NotFound(w, r)
				return
			}
			file = index
		}
		if t, ok := types[strings.ToLower(filepath.Ext(file))]; ok {
			w.Header().Set("Content-Type", t)
		}
		if strings.HasSuffix(file, ".html") || strings.HasSuffix(file, "sw.js") {
			w.Header().Set("Cache-Control", "no-cache")
		}
		http.ServeFile(w, r, file)
	})
}

func open(url string) {
	switch runtime.GOOS {
	case "windows":
		exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
	case "darwin":
		exec.Command("open", url).Start()
	default:
		if os.Getenv("JIPGEPYO_NO_BROWSER") == "" {
			exec.Command("xdg-open", url).Start()
		}
	}
}
