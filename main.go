package main

import (
	"io"
	"log"
	"net"
	"net/http"
	"syscall"
	"time"

	httpClient "github.com/bogdanfinn/fhttp"
	tls_client "github.com/bogdanfinn/tls-client"
	"github.com/bogdanfinn/tls-client/profiles"
)

func main() {
    proxyPort := ":7300"
    log.Printf("Proxy sunucusu %s portunda başlatılıyor...\n", proxyPort)

    server := &http.Server{
        Addr:    proxyPort,
        Handler: http.HandlerFunc(proxyHandler), // *all* requests
    }
    log.Fatal(server.ListenAndServe())
}


func proxyHandler(w http.ResponseWriter, r *http.Request) {
	// --- 0) Özel Dialer: Mac OS X TCP/IP fingerprint spoofing ---
	customDialer := net.Dialer{
		Timeout: 30 * time.Second,
		Control: func(network, address string, c syscall.RawConn) error {
			var ctrlErr error
			err := c.Control(func(fd uintptr) {
				// TTL: 64
				if err := syscall.SetsockoptInt(syscall.Handle(fd), syscall.IPPROTO_IP, syscall.IP_TTL, 64); err != nil {
					ctrlErr = err
					return
				}
				// RCVBUF: 65535
				if err := syscall.SetsockoptInt(syscall.Handle(fd), syscall.SOL_SOCKET, syscall.SO_RCVBUF, 65535); err != nil {
					ctrlErr = err
					return
				}
				// SNDBUF: 65535
				if err := syscall.SetsockoptInt(syscall.Handle(fd), syscall.SOL_SOCKET, syscall.SO_SNDBUF, 65535); err != nil {
					ctrlErr = err
					return
				}
			})
			if err != nil {
				return err
			}
			return ctrlErr
		},
	}

	// --- 1) CONNECT tünelleme desteği ---
	if r.Method == http.MethodConnect {
		hj, ok := w.(http.Hijacker)
		if !ok {
			http.Error(w, "Hijacking not supported", http.StatusInternalServerError)
			return
		}
		clientConn, clientBuf, err := hj.Hijack()
		if err != nil {
			log.Printf("Hijack hatası: %v", err)
			return
		}
		defer clientConn.Close()

		// custom dialer ile tünel
		destConn, err := customDialer.Dial("tcp", r.Host)
		if err != nil {
			log.Printf("Dial hatası: %v", err)
			clientBuf.WriteString("HTTP/1.1 502 Bad Gateway\r\n\r\n")
			clientBuf.Flush()
			return
		}
		defer destConn.Close()

		clientBuf.WriteString("HTTP/1.1 200 Connection Established\r\n\r\n")
		clientBuf.Flush()

		go io.Copy(destConn, clientConn)
		io.Copy(clientConn, destConn)
		return
	}
	// --- /CONNECT bloğu ---

	// 2) Normal HTTPS/HTTP proxy akışı
	targetURL := r.URL.String()
	if r.URL.Scheme == "" {
		targetURL = "https://" + r.Host + r.URL.String()
	}
	log.Printf("İstek alındı: %s %s", r.Method, targetURL)

	// 3) TLS-Client yapılandırması
	jar := tls_client.NewCookieJar()
	options := []tls_client.HttpClientOption{
		tls_client.WithTimeoutSeconds(30),
		tls_client.WithClientProfile(profiles.Safari_IOS_17_0),
		tls_client.WithNotFollowRedirects(),
		tls_client.WithCookieJar(jar),
		tls_client.WithRandomTLSExtensionOrder(),
		tls_client.WithDialer(customDialer), // custom dialer uygulandı
	}
	client, err := tls_client.NewHttpClient(tls_client.NewNoopLogger(), options...)
	if err != nil {
		http.Error(w, "HTTP istemcisi oluşturulamadı", http.StatusInternalServerError)
		log.Printf("HTTP istemcisi oluşturulamadı: %v", err)
		return
	}

	// 4) Gelen isteği kopyala
	req, err := httpClient.NewRequest(r.Method, targetURL, r.Body)
	if err != nil {
		http.Error(w, "İstek oluşturulamadı", http.StatusInternalServerError)
		log.Printf("İstek oluşturulamadı: %v", err)
		return
	}
	req.Header = make(httpClient.Header)
	for k, v := range r.Header {
		for _, vv := range v {
			req.Header.Add(k, vv)
		}
	}

	// 5) HTTP header spoofing
	req.Header.Set("User-Agent", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/133.0.6943.120 Mobile/15E148 Safari/604.1")
	req.Header.Set("Accept-Language", "tr-TR,tr;q=0.9")
	req.Header.Set("Accept", "*/*")
	req.Header.Set("Accept-Encoding", "gzip, deflate, br")
	req.Header.Set("Sec-Fetch-Site", "none")

	// 6) İsteği gönder ve yanıtı ilet
	resp, err := client.Do(req)
	if err != nil {
		http.Error(w, "İstek gönderilemedi", http.StatusBadGateway)
		log.Printf("İstek gönderilemedi: %v", err)
		return
	}
	defer resp.Body.Close()

	for k, v := range resp.Header {
		for _, vv := range v {
			w.Header().Add(k, vv)
		}
	}
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}
