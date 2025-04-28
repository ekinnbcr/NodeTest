import { chromium, devices } from "patchright";
import { spawn } from "child_process";
import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";

(async () => {
  console.log("Tarayıcı başlatılıyor...");
  let browser;

  const randomNumber = Math.floor(Math.random() * 100000000) + 1;
  const formattedNumber = String(randomNumber).padStart(8, "0");
  const userDataDir = `user-data-dir-${formattedNumber}`;
  console.log(userDataDir);
  

  // iPhone 14 Pro Max cihazı seçildi
  const singleDevice = devices["iPhone 14 Pro Max"];
  

  try {
    browser = await chromium.launchPersistentContext(userDataDir, {
      extraHTTPHeaders: {
        "Accept-Language": "tr-TR,tr;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
      },
      channel: "chrome",
      ...singleDevice,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--touch-events=enabled",
        "--disable-client-side-phishing-detection",
        "--disable-component-extensions-with-background-pages",
        "--allow-pre-commit-input",
        "--disable-ipc-flooding-protection",
        "--metrics-recording-only",
        "--unsafely-disable-devtools-self-xss-warnings",
        "--disable-back-forward-cache",
        "--disable-features=ImprovedCookieControls,LazyFrameLoading,GlobalMediaControls,DestroyProfileOnBrowserClose,MediaRouter,DialMediaRouteProvider,AcceptCHFrame,AutoExpandDetailsElement,CertificateTransparencyComponentUpdater,AvoidUnnecessaryBeforeUnloadCheckSync,Translate,HttpsUpgrades,PaintHolding,ThirdPartyStoragePartitioning,LensOverlay,PlzDedicatedWorker",
        "--force-webrtc-ip-handling-policy=default_public_interface_only",
        "--disable-webrtc-hw-decoding",
        "--disable-webrtc-encryption",
        "--disable-features=WebRtcHideLocalIpsWithMdns",
      ],
      headless: false,
      viewport: { width: 430, height: 873 }, // iPhone 14 Pro Max viewport
      screen: { width: 430, height: 932 }, // iPhone 14 Pro Max ekran boyutu
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/133.0.6943.120 Mobile/15E148 Safari/604.1",
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 3,
      bypassCSP: true,
      // iPhone 14 Pro Max için devicePixelRatio
    });
    console.log("Tarayıcı başarıyla başlatıldı.");

    const pages = browser.pages();
    const page = pages.length > 0 ? pages[0] : await browser.newPage();
    
    console.log("Kullanılan sayfa:", page.url());

    // Sahteleme scriptlerini ekliyoruz

    await page.addInitScript(() => {
      //WEBRTC
      const originalRTCPeerConnection =
        window.RTCPeerConnection || window.webkitRTCPeerConnection;
      if (originalRTCPeerConnection) {
        const fakeRTC = function (...args) {
          const pc = new originalRTCPeerConnection(...args);
          pc.createDataChannel = () => {};
          pc.onicecandidate = null;
          return pc;
        };
        window.RTCPeerConnection = fakeRTC;
        window.webkitRTCPeerConnection = fakeRTC;
      }
      Object.defineProperty(window.RTCPeerConnection, "toString", {
        value: () => "function RTCPeerConnection() { [native code] }",
      });
      Object.defineProperty(Intl.NumberFormat.prototype, "resolvedOptions", {
        value: function () {
          return {
            locale: "tr-TR",
            numberingSystem: "latn",
            style: "decimal",
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          };
        },
        writable: false,
        configurable: true,
      });

      Object.defineProperty(Intl.Collator.prototype, "resolvedOptions", {
        value: function () {
          return {
            locale: "tr-TR",
            usage: "sort",
            sensitivity: "variant",
            ignorePunctuation: false,
            numeric: false,
            caseFirst: "false",
          };
        },
        writable: false,
        configurable: true,
      });
      window.addEventListener(
        "error",
        (event) => {
          if (event.target.tagName === "IMG") {
            event.target.width = 20;
            event.target.height = 20;
          }
        },
        true
      );
      const originalMatchMedia = window.matchMedia;
      window.matchMedia = (query) => {
        const result = originalMatchMedia(query);
        const normalizedQuery = query.toLowerCase().replace(/\s/g, "");
        if (
          normalizedQuery.includes("(color-gamut:srgb)") ||
          normalizedQuery.includes("(color-gamut:p3)")
        ) {
          const mediaQueryList = {
            matches: true,
            media: query,
            onchange: null,
            addListener: (callback) => {
              mediaQueryList.onchange = callback;
            },
            removeListener: (callback) => {
              if (mediaQueryList.onchange === callback) {
                mediaQueryList.onchange = null;
              }
            },
            addEventListener: (type, listener) => {
              if (type === "change") {
                mediaQueryList.onchange = listener;
              }
            },
            removeEventListener: (type, listener) => {
              if (type === "change" && mediaQueryList.onchange === listener) {
                mediaQueryList.onchange = null;
              }
            },
            dispatchEvent: (event) => {
              if (event.type === "change" && mediaQueryList.onchange) {
                mediaQueryList.onchange(event);
                return true;
              }
              return false;
            },
          };
          Object.setPrototypeOf(mediaQueryList, MediaQueryList.prototype);
          return mediaQueryList;
        }
        return result;
      };
      // **Screen Özellikleri için sahteleme**
      const screenProxy = new Proxy(screen, {
        get(target, prop) {
          if (prop === "width") return 430;
          if (prop === "height") return 932;
          if (prop === "availWidth") return 430;
          if (prop === "availHeight") return 932;
          if (prop === "colorDepth") return 24;
          if (prop === "pixelDepth") return 24;
          if (prop === "availTop") return 0;
          if (prop === "availLeft") return 0;
          if (prop === "orientation") {
            return {
              type: "portrait-primary",
              angle: 0,
              onchange: null,
              addEventListener: () => {},
              removeEventListener: () => {},
              dispatchEvent: () => {},
            };
          }
          return Reflect.get(target, prop);
        },
      });

      Object.defineProperty(navigator, "webdriver", {
        get: () => false,
        configurable: true,
        enumerable: true,
      });

      Object.defineProperty(window, "screen", {
        value: screenProxy,
        writable: false,
        configurable: true,
        enumerable: true,
      });

      // **Window Özellikleri**
      Object.defineProperty(window, "innerWidth", {
        get: () => 430,
        configurable: true,
      });
      Object.defineProperty(window, "innerHeight", {
        get: () => 873,
        configurable: true,
      });
      Object.defineProperty(window, "outerWidth", {
        get: () => 430,
        configurable: true,
      });
      Object.defineProperty(window, "outerHeight", {
        get: () => 932,
        configurable: true,
      });
      Object.defineProperty(window, "devicePixelRatio", {
        get: () => 3,
        configurable: true,
      });

      // **div.clientHeight için sahteleme**
      Object.defineProperty(HTMLElement.prototype, "clientHeight", {
        get: function () {
          if (this.tagName === "DIV" && this.id === "test-div") {
            return 873; // browserleaks'in test div'i için
          }
          const style = window.getComputedStyle(this);
          return (
            parseInt(style.height) || this.getBoundingClientRect().height || 873
          );
        },
        configurable: true,
      });

      // **Navigator için Proxy ile tam kontrol**
      const desiredNavigator = {
        // Temel özellikler (Navigator Object için)
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/133.0.6943.120 Mobile/15E148 Safari/604.1",
        appVersion:
          "5.0 (iPhone; CPU iPhone OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/133.0.6943.120 Mobile/15E148 Safari/604.1",
        //appName: "Netscape",
        appCodeName: "Mozilla",
        product: "Gecko",
        productSub: "20030107",
        vendor: "Apple Computer, Inc.",
        vendorSub: "empty",
        platform: "iPhone",
        onLine: true,
        doNotTrack: undefined,
        cookieEnabled: true,
        maxTouchPoints: 5,
        pdfViewerEnabled: true,

        sendBeacon: function sendBeacon() {
          throw new Error("sendBeacon is not implemented");
        },
        requestMediaKeySystemAccess: function requestMediaKeySystemAccess() {
          throw new Error("requestMediaKeySystemAccess is not implemented");
        },
        getGamepads: function getGamepads() {
          throw new Error("getGamepads is not implemented");
        },
        javaEnabled: function javaEnabled() {
          throw new Error("javaEnabled is not implemented");
        },
        canShare: function canShare() {
          throw new Error("canShare is not implemented");
        },
        share: function share() {
          throw new Error("share is not implemented");
        },
      };

      // Fonksiyonların toString değerlerini native code gibi göster
      const spoofFunction = (fn, name) => {
        Object.defineProperty(fn, "toString", {
          value: () => `function ${name}() { [native code] }`,
          configurable: true,
        });
        return fn;
      };

      desiredNavigator.sendBeacon = spoofFunction(
        desiredNavigator.sendBeacon,
        "sendBeacon"
      );
      desiredNavigator.requestMediaKeySystemAccess = spoofFunction(
        desiredNavigator.requestMediaKeySystemAccess,
        "requestMediaKeySystemAccess"
      );
      desiredNavigator.getGamepads = spoofFunction(
        desiredNavigator.getGamepads,
        "getGamepads"
      );
      desiredNavigator.javaEnabled = spoofFunction(
        desiredNavigator.javaEnabled,
        "javaEnabled"
      );
      desiredNavigator.canShare = spoofFunction(
        desiredNavigator.canShare,
        "canShare"
      );
      desiredNavigator.share = spoofFunction(desiredNavigator.share, "share");

      // Navigator nesnesini Proxy ile sar

      const navigatorProxy = new Proxy(desiredNavigator, {
        get(target, prop) {
          if (prop === "appName") return "Netscape";
          if (prop === "language") return "tr-TR";
          if (prop === "languages") return ["tr-TR"];

          return Reflect.get(target, prop);
        },
        has(target, prop) {
          return Reflect.has(target, prop);
        },
        ownKeys(target) {
          return Reflect.ownKeys(target);
        },
        getOwnPropertyDescriptor(target, prop) {
          if (prop === "appName") {
            return {
              value: "Netscape",
              writable: false,
              enumerable: true,
              configurable: false,
            };
          }
          if (prop === "language") {
            return {
              value: "tr-TR",
              writable: false,
              enumerable: true,
              configurable: false,
            };
          }
          if (prop === "languages") {
            return {
              value: ["tr-TR"],
              writable: false,
              enumerable: true,
              configurable: false,
            };
          }
          return Reflect.getOwnPropertyDescriptor(target, prop);
        },
      });

      // Navigator'ı Proxy ile değiştir
      Object.defineProperty(window, "navigator", {
        value: navigatorProxy,
        configurable: true,
        writable: false,
      });

      const fakePermissions = {
        query: function query(permissionDescriptor) {
          return Promise.resolve({
            state: "prompt",
            onchange: null,
          });
        },
      };

      Object.defineProperty(fakePermissions, Symbol.toStringTag, {
        value: "Permissions",
      });

      Object.defineProperty(fakePermissions.query, "toString", {
        value: () => "function query() { [native code] }",
      });

      Object.defineProperty(desiredNavigator, "permissions", {
        get: function () {
          return fakePermissions;
        },
        enumerable: true,
        configurable: true,
      });
      Object.defineProperty(
        Object.getOwnPropertyDescriptor(desiredNavigator, "permissions").get,
        "toString",
        {
          value: () => "function get permissions() { [native code] }",
        }
      );

      //Devicememory çözümü
      Object.defineProperty(desiredNavigator, "deviceMemory", {
        get: function () {
          return 8; // Örnek bir değer, isteğe göre değiştirilebilir
        },
        enumerable: true,
        configurable: true,
      });

      Object.defineProperty(
        Object.getOwnPropertyDescriptor(desiredNavigator, "deviceMemory").get,
        "toString",
        {
          value: () => "function get deviceMemory() { [native code] }",
        }
      );
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (
        contextType,
        attributes
      ) {
        if (contextType === "webgl" || contextType === "experimental-webgl") {
          const context = originalGetContext.call(
            this,
            contextType,
            attributes
          );
          if (context) {
            const originalGetParameter = context.getParameter;
            context.getParameter = function (param) {
              if (param === 0x1f02) {
                // gl.VERSION
                return "WebGL 1.0";
              }
              return originalGetParameter.call(this, param);
            };
          }
          return context;
        }
        return originalGetContext.call(this, contextType, attributes);
      };

      // hardwareConcurrency spoofing (getter + native-like toString)
      Object.defineProperty(desiredNavigator, "hardwareConcurrency", {
        get: function () {
          return 4; // iPhone 14 Pro Max gerçek değerine daha yakın
        },
        enumerable: true,
        configurable: true,
      });

      Object.defineProperty(
        Object.getOwnPropertyDescriptor(desiredNavigator, "hardwareConcurrency")
          .get,
        "toString",
        {
          value: () => "function get hardwareConcurrency() { [native code] }",
        }
      );
      Object.defineProperty(desiredNavigator, "userAgent", {
        get: function () {
          return "Mozilla/5.0 (iPhone; CPU iPhone OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/133.0.6943.120 Mobile/15E148 Safari/604.1";
        },
        enumerable: true,
        configurable: true,
      });
      Object.defineProperty(
        Object.getOwnPropertyDescriptor(desiredNavigator, "userAgent").get,
        "toString",
        {
          value: () => "function get userAgent() { [native code] }",
        }
      );

      Object.defineProperty(desiredNavigator, "appVersion", {
        get: function () {
          return "5.0 (iPhone; CPU iPhone OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/133.0.6943.120 Mobile/15E148 Safari/604.1";
        },
        enumerable: true,
        configurable: true,
      });

      Object.defineProperty(
        Object.getOwnPropertyDescriptor(desiredNavigator, "appVersion").get,
        "toString",
        {
          value: () => "function get appVersion() { [native code] }",
        }
      );

      Object.defineProperty(desiredNavigator, "appCodeName", {
        get: function () {
          return "Mozilla";
        },
        enumerable: true,
        configurable: true,
      });
      Object.defineProperty(
        Object.getOwnPropertyDescriptor(desiredNavigator, "appCodeName").get,
        "toString",
        {
          value: () => "function get appCodeName() { [native code] }",
        }
      );
      Object.defineProperty(desiredNavigator, "productSub", {
        get: function () {
          return "20030107";
        },
        enumerable: true,
        configurable: true,
      });
      Object.defineProperty(
        Object.getOwnPropertyDescriptor(desiredNavigator, "productSub").get,
        "toString",
        {
          value: () => "function get productSub() { [native code] }",
        }
      );
      Object.defineProperty(desiredNavigator, "vendor", {
        get: function () {
          return "Apple Computer, Inc.";
        },
        enumerable: true,
        configurable: true,
      });
      Object.defineProperty(
        Object.getOwnPropertyDescriptor(desiredNavigator, "vendor").get,
        "toString",
        {
          value: () => "function get vendor() { [native code] }",
        }
      );
      Object.defineProperty(desiredNavigator, "vendorSub", {
        get: function () {
          return "";
        },
        enumerable: true,
        configurable: true,
      });
      Object.defineProperty(
        Object.getOwnPropertyDescriptor(desiredNavigator, "vendorSub").get,
        "toString",
        {
          value: () => "function get vendorSub() { [native code] }",
        }
      );
      Object.defineProperty(desiredNavigator, "product", {
        get: function () {
          return "Gecko";
        },
        enumerable: true,
        configurable: true,
      });
      Object.defineProperty(
        Object.getOwnPropertyDescriptor(desiredNavigator, "product").get,
        "toString",
        {
          value: () => "function get product() { [native code] }",
        }
      );
      Object.defineProperty(desiredNavigator, "platform", {
        get: function () {
          return "iPhone";
        },
        enumerable: true,
        configurable: true,
      });
      Object.defineProperty(
        Object.getOwnPropertyDescriptor(desiredNavigator, "platform").get,
        "toString",
        {
          value: () => "function get platform() { [native code] }",
        }
      );
      Object.defineProperty(desiredNavigator, "cookieEnabled", {
        get: function () {
          return true;
        },
        enumerable: true,
        configurable: true,
      });
      Object.defineProperty(
        Object.getOwnPropertyDescriptor(desiredNavigator, "cookieEnabled").get,
        "toString",
        {
          value: () => "function get cookieEnabled() { [native code] }",
        }
      );
      Object.defineProperty(desiredNavigator, "maxTouchPoints", {
        get: function () {
          return 5; // iPhone 14 Pro Max için doğru değer
        },
        enumerable: true,
        configurable: true,
      });
      Object.defineProperty(
        Object.getOwnPropertyDescriptor(desiredNavigator, "maxTouchPoints").get,
        "toString",
        {
          value: () => "function get maxTouchPoints() { [native code] }",
        }
      );
      Object.defineProperty(desiredNavigator, "pdfViewerEnabled", {
        get: function () {
          return true;
        },
        enumerable: true,
        configurable: true,
      });
      Object.defineProperty(
        Object.getOwnPropertyDescriptor(desiredNavigator, "pdfViewerEnabled")
          .get,
        "toString",
        {
          value: () => "function get pdfViewerEnabled() { [native code] }",
        }
      );
      Object.defineProperty(desiredNavigator, "onLine", {
        get: function () {
          return true; // veya navigator.connection.isConnected gibi dinamik de yapılabilir
        },
        enumerable: true,
        configurable: true,
      });
      Object.defineProperty(
        Object.getOwnPropertyDescriptor(desiredNavigator, "onLine").get,
        "toString",
        {
          value: () => "function get onLine() { [native code] }",
        }
      );
      Object.defineProperty(desiredNavigator, "standalone", {
        get: function () {
          return false; // Mobil tarayıcıda normalde böyledir
        },
        enumerable: true,
        configurable: true,
      });
      Object.defineProperty(
        Object.getOwnPropertyDescriptor(desiredNavigator, "standalone").get,
        "toString",
        {
          value: () => "function get standalone() { [native code] }",
        }
      );

      Object.defineProperty(HTMLMediaElement.prototype, "canPlayType", {
        value: function (type) {
          console.log("canPlayType called with type:", type); // Hata ayıklama için log (isteğe bağlı, testten sonra kaldırılabilir)

          // Önce video codec'lerini kontrol et
          if (type.includes("video/ogg")) return ""; // ogg: desteklenmiyor
          if (type.includes("video/mp4") && type.includes("avc1"))
            return "probably"; // h264: probably
          if (type.includes("video/webm")) return ""; // webm: desteklenmiyor
          if (type.includes("video/mp4") && type.includes("mp4v"))
            return "probably"; // mpeg4v: probably
          if (type.includes("video/mp4") && type.includes("mp4a"))
            return "probably"; // mpeg4a: probably
          if (type.includes("theora")) return ""; // theora: desteklenmiyor

          // Sonra ses codec'lerini kontrol et
          if (type.includes("audio/ogg")) return ""; // ogg: desteklenmiyor
          if (type.includes("audio/mpeg")) return "maybe"; // mp3: maybe
          if (type.includes("audio/wav")) return "probably"; // wav: probably
          if (
            type.includes("audio/mp4") ||
            type.includes("audio/x-m4a") ||
            (type.includes("mp4a") && !type.includes("video/"))
          )
            return "maybe"; // m4a: maybe
          if (type.includes("audio/aac")) return "maybe"; // aac: maybe

          // Diğer medya türleri için varsayılan davranış
          return "";
        },
        writable: true,
        configurable: true,
      });

      const fakeClipboard = {
        writeText: async () => {},
        readText: async () => "",
        // Gerekirse daha fazla fonksiyon eklenebilir
      };

      Object.defineProperty(fakeClipboard, Symbol.toStringTag, {
        value: "Clipboard",
      });

      Object.defineProperty(desiredNavigator, "clipboard", {
        get: function () {
          return fakeClipboard;
        },
        enumerable: true,
        configurable: true,
      });

      Object.defineProperty(
        Object.getOwnPropertyDescriptor(desiredNavigator, "clipboard").get,
        "toString",
        {
          value: () => "function get clipboard() { [native code] }",
        }
      );
      const fakeAudioSession = {};
      Object.defineProperty(fakeAudioSession, Symbol.toStringTag, {
        value: "AudioSession",
      });

      Object.defineProperty(desiredNavigator, "audioSession", {
        get: function () {
          return fakeAudioSession;
        },
        enumerable: true,
        configurable: true,
      });

      Object.defineProperty(
        Object.getOwnPropertyDescriptor(desiredNavigator, "audioSession").get,
        "toString",
        {
          value: () => "function get audioSession() { [native code] }",
        }
      );
      const fakeCredentials = {};
      Object.defineProperty(fakeCredentials, Symbol.toStringTag, {
        value: "CredentialsContainer",
      });

      Object.defineProperty(desiredNavigator, "credentials", {
        get: function () {
          return fakeCredentials;
        },
        enumerable: true,
        configurable: true,
      });

      Object.defineProperty(
        Object.getOwnPropertyDescriptor(desiredNavigator, "credentials").get,
        "toString",
        {
          value: () => "function get credentials() { [native code] }",
        }
      );
      const fakeGeolocation = {
        getCurrentPosition: () => {},
        watchPosition: () => {},
        clearWatch: () => {},
      };

      Object.defineProperty(fakeGeolocation, Symbol.toStringTag, {
        value: "Geolocation",
      });

      Object.defineProperty(desiredNavigator, "geolocation", {
        get: function () {
          return fakeGeolocation;
        },
        enumerable: true,
        configurable: true,
      });

      Object.defineProperty(
        Object.getOwnPropertyDescriptor(desiredNavigator, "geolocation").get,
        "toString",
        {
          value: () => "function get geolocation() { [native code] }",
        }
      );
      const fakeMediaCapabilities = {};
      Object.defineProperty(fakeMediaCapabilities, Symbol.toStringTag, {
        value: "MediaCapabilities",
      });

      Object.defineProperty(desiredNavigator, "mediaCapabilities", {
        get: function () {
          return fakeMediaCapabilities;
        },
        enumerable: true,
        configurable: true,
      });

      Object.defineProperty(
        Object.getOwnPropertyDescriptor(desiredNavigator, "mediaCapabilities")
          .get,
        "toString",
        {
          value: () => "function get mediaCapabilities() { [native code] }",
        }
      );
      // mediaSession
      const fakeMediaSession = {};
      Object.defineProperty(fakeMediaSession, Symbol.toStringTag, {
        value: "MediaSession",
      });
      Object.defineProperty(desiredNavigator, "mediaSession", {
        get: () => fakeMediaSession,
        enumerable: true,
        configurable: true,
      });
      Object.defineProperty(
        Object.getOwnPropertyDescriptor(desiredNavigator, "mediaSession").get,
        "toString",
        {
          value: () => "function get mediaSession() { [native code] }",
        }
      );

      // Sahte MediaDeviceInfo constructor'ı
      function FakeMediaDeviceInfo(kind, deviceId, label, groupId) {
        this.kind = kind;
        this.deviceId = deviceId;
        this.label = label;
        this.groupId = groupId;
      }

      // Sahte cihazlar listesi (1 mikrofon, 1 webcam)
      const fakeDevices = [
        new FakeMediaDeviceInfo(
          "audioinput",
          "microphone-1",
          "Built-in Microphone",
          "group-1"
        ), // Mikrofon
        new FakeMediaDeviceInfo(
          "videoinput",
          "webcam-1",
          "Built-in Webcam",
          "group-1"
        ), // Webcam
      ];

      // MediaDevices objesi için sahteleme
      const fakeMediaDevices = {
        enumerateDevices: async () => {
          console.log(
            "enumerateDevices çağrıldı, dönen cihazlar:",
            fakeDevices
          );
          return fakeDevices;
        },
        getUserMedia: async () => {
          throw new Error("getUserMedia is not implemented");
        },
      };

      // MediaDevices objesinin toStringTag'ini ayarla
      Object.defineProperty(fakeMediaDevices, Symbol.toStringTag, {
        value: "MediaDevices",
      });

      // enumerateDevices metodunun toString değerini native gibi göster
      Object.defineProperty(fakeMediaDevices.enumerateDevices, "toString", {
        value: () => "function enumerateDevices() { [native code] }",
        configurable: true,
      });

      // navigator.mediaDevices özelliğini sahteleştir
      Object.defineProperty(desiredNavigator, "mediaDevices", {
        get: () => fakeMediaDevices,
        enumerable: true,
        configurable: true,
      });
      Object.defineProperty(
        Object.getOwnPropertyDescriptor(desiredNavigator, "mediaDevices").get,
        "toString",
        {
          value: () => "function get mediaDevices() { [native code] }",
        }
      );

      // wakeLock
      const fakeWakeLock = {};
      Object.defineProperty(fakeWakeLock, Symbol.toStringTag, {
        value: "WakeLock",
      });
      Object.defineProperty(desiredNavigator, "wakeLock", {
        get: () => fakeWakeLock,
        enumerable: true,
        configurable: true,
      });
      Object.defineProperty(
        Object.getOwnPropertyDescriptor(desiredNavigator, "wakeLock").get,
        "toString",
        {
          value: () => "function get wakeLock() { [native code] }",
        }
      );

      // locks
      const fakeLocks = {};
      Object.defineProperty(fakeLocks, Symbol.toStringTag, {
        value: "LockManager",
      });
      Object.defineProperty(desiredNavigator, "locks", {
        get: () => fakeLocks,
        enumerable: true,
        configurable: true,
      });
      Object.defineProperty(
        Object.getOwnPropertyDescriptor(desiredNavigator, "locks").get,
        "toString",
        {
          value: () => "function get locks() { [native code] }",
        }
      );

      // userActivation
      const fakeUserActivation = {};
      Object.defineProperty(fakeUserActivation, Symbol.toStringTag, {
        value: "UserActivation",
      });
      Object.defineProperty(desiredNavigator, "userActivation", {
        get: () => fakeUserActivation,
        enumerable: true,
        configurable: true,
      });
      Object.defineProperty(
        Object.getOwnPropertyDescriptor(desiredNavigator, "userActivation").get,
        "toString",
        {
          value: () => "function get userActivation() { [native code] }",
        }
      );

      // serviceWorker
      const fakeServiceWorker = {};
      Object.defineProperty(fakeServiceWorker, Symbol.toStringTag, {
        value: "ServiceWorkerContainer",
      });
      Object.defineProperty(desiredNavigator, "serviceWorker", {
        get: () => fakeServiceWorker,
        enumerable: true,
        configurable: true,
      });
      Object.defineProperty(
        Object.getOwnPropertyDescriptor(desiredNavigator, "serviceWorker").get,
        "toString",
        {
          value: () => "function get serviceWorker() { [native code] }",
        }
      );

      // storage
      const fakeStorage = {};
      Object.defineProperty(fakeStorage, Symbol.toStringTag, {
        value: "StorageManager",
      });
      Object.defineProperty(desiredNavigator, "storage", {
        get: () => fakeStorage,
        enumerable: true,
        configurable: true,
      });
      Object.defineProperty(
        Object.getOwnPropertyDescriptor(desiredNavigator, "storage").get,
        "toString",
        {
          value: () => "function get storage() { [native code] }",
        }
      );

      (() => {
        // Plugin örneği oluştur
        const plugins = [
          {
            name: "PDF Viewer",
            description: "Portable Document Format",
            filename: "internal-pdf-viewer",
            __proto__: Plugin.prototype,
          },
          {
            name: "Chrome PDF Viewer",
            description: "Portable Document Format",
            filename: "internal-pdf-viewer",
            __proto__: Plugin.prototype,
          },
          {
            name: "Chromium PDF Viewer",
            description: "Portable Document Format",
            filename: "internal-pdf-viewer",
            __proto__: Plugin.prototype,
          },
          {
            name: "Microsoft Edge PDF Viewer",
            description: "Portable Document Format",
            filename: "internal-pdf-viewer",
            __proto__: Plugin.prototype,
          },
          {
            name: "WebKit built-in PDF",
            description: "Portable Document Format",
            filename: "internal-pdf-viewer",
            __proto__: Plugin.prototype,
          },
        ];

        // Plugins dizisi oluştur
        const pluginArray = {
          length: plugins.length,
          item(index) {
            return this[index];
          },
          namedItem(name) {
            return plugins.find((p) => p.name === name) || null;
          },
          refresh: () => {},
          [Symbol.iterator]: function* () {
            for (let i = 0; i < plugins.length; i++) yield this[i];
          },
          __proto__: PluginArray.prototype,
        };
        plugins.forEach((p, i) => (pluginArray[i] = p));
        Object.defineProperty(pluginArray, Symbol.toStringTag, {
          value: "PluginArray",
        });

        // MimeType örneği oluştur
        const mimeTypes = [
          {
            type: "application/pdf",
            suffixes: "pdf",
            description: "Portable Document Format",
            enabledPlugin: plugins[0],
            __proto__: MimeType.prototype,
          },
          {
            type: "text/pdf",
            suffixes: "pdf",
            description: "Portable Document Format",
            enabledPlugin: plugins[0],
            __proto__: MimeType.prototype,
          },
        ];

        // MimeTypes dizisi oluştur
        const mimeTypeArray = {
          length: mimeTypes.length,
          item(index) {
            return this[index];
          },
          namedItem(name) {
            return mimeTypes.find((m) => m.type === name) || null;
          },
          [Symbol.iterator]: function* () {
            for (let i = 0; i < mimeTypes.length; i++) yield this[i];
          },
          __proto__: MimeTypeArray.prototype,
        };
        mimeTypes.forEach((m, i) => (mimeTypeArray[i] = m));
        Object.defineProperty(mimeTypeArray, Symbol.toStringTag, {
          value: "MimeTypeArray",
        });

        // Proxy navigator'a ekle
        Object.defineProperty(desiredNavigator, "plugins", {
          get: () => pluginArray,
          enumerable: true,
          configurable: true,
        });
        Object.defineProperty(
          Object.getOwnPropertyDescriptor(desiredNavigator, "plugins").get,
          "toString",
          {
            value: () => "function get plugins() { [native code] }",
          }
        );

        Object.defineProperty(desiredNavigator, "mimeTypes", {
          get: () => mimeTypeArray,
          enumerable: true,
          configurable: true,
        });
        Object.defineProperty(
          Object.getOwnPropertyDescriptor(desiredNavigator, "mimeTypes").get,
          "toString",
          {
            value: () => "function get mimeTypes() { [native code] }",
          }
        );
      })();

      // **DateTimeFormat sahtelemesi**
      Object.defineProperty(Intl.DateTimeFormat.prototype, "resolvedOptions", {
        value: function () {
          return {
            hourcycle: "h23",
            locale: "tr-TR",
            calendar: "gregory",
            numberingSystem: "latn",
            timeZone: "Europe/Istanbul",
            year: "numeric",
            month: "2-digit",
            day: "numeric",
          };
        },
      });

      // **Eklentiler ve mimeType sahtelemesi**
      (() => {
        const makePluginArray = () => {
          const plugins = [
            {
              name: "PDF Viewer",
              description: "Portable Document Format",
              filename: "internal-pdf-viewer",
              __proto__: Plugin.prototype,
            },
            {
              name: "Chrome PDF Viewer",
              description: "Portable Document Format",
              filename: "internal-pdf-viewer",
              __proto__: Plugin.prototype,
            },
            {
              name: "Chromium PDF Viewer",
              description: "Portable Document Format",
              filename: "internal-pdf-viewer",
              __proto__: Plugin.prototype,
            },
            {
              name: "Microsoft Edge PDF Viewer",
              description: "Portable Document Format",
              filename: "internal-pdf-viewer",
              __proto__: Plugin.prototype,
            },
            {
              name: "WebKit built-in PDF",
              description: "Portable Document Format",
              filename: "internal-pdf-viewer",
              __proto__: Plugin.prototype,
            },
          ];

          const pluginArray = {
            length: plugins.length,
            item(index) {
              return this[index];
            },
            namedItem(name) {
              return plugins.find((p) => p.name === name) || null;
            },
            refresh: () => {},
            [Symbol.iterator]: function* () {
              for (let i = 0; i < plugins.length; i++) yield this[i];
            },
            __proto__: PluginArray.prototype,
          };
          plugins.forEach((p, i) => (pluginArray[i] = p));
          return pluginArray;
        };

        const makeMimeTypeArray = (plugin) => {
          const mimeTypes = [
            {
              type: "application/pdf",
              suffixes: "pdf",
              description: "PDF (Taşınabilir Belge Biçimi)",
              enabledPlugin: plugin,
              __proto__: MimeType.prototype,
            },
            {
              type: "text/pdf",
              suffixes: "pdf",
              description: "PDF (Taşınabilir Belge Biçimi)",
              enabledPlugin: plugin,
              __proto__: MimeType.prototype,
            },
          ];

          const mimeTypeArray = {
            length: mimeTypes.length,
            item(index) {
              return this[index];
            },
            namedItem(name) {
              return mimeTypes.find((m) => m.type === name) || null;
            },
            [Symbol.iterator]: function* () {
              for (let i = 0; i < mimeTypes.length; i++) yield this[i];
            },
            __proto__: MimeTypeArray.prototype,
          };
          mimeTypes.forEach((m, i) => (mimeTypeArray[i] = m));
          return mimeTypeArray;
        };

        const pluginArray = makePluginArray();
        const mimeTypeArray = makeMimeTypeArray(pluginArray[0]);

        // Proxy navigator'a plugins ve mimeTypes ekle
        desiredNavigator.plugins = pluginArray;
        desiredNavigator.mimeTypes = mimeTypeArray;
      })();

      // **WebGL Sahtelemesi**
      const spoofWebGL = (context) => {
        const proto = context.prototype;

        const fakeVendor = "Apple Inc.";
        const fakeRenderer = "Apple GPU";

        const originalGetParameter = proto.getParameter;
        proto.getParameter = function (param) {
          // UNMASKED_VENDOR_WEBGL = 37445
          if (param === 37445) return fakeVendor;
          // UNMASKED_RENDERER_WEBGL = 37446
          if (param === 37446) return fakeRenderer;
          return originalGetParameter.call(this, param);
        };
      };

      if (window.WebGLRenderingContext) spoofWebGL(WebGLRenderingContext);
      if (window.WebGL2RenderingContext) spoofWebGL(WebGL2RenderingContext);

      const originalNaturalWidth = Object.getOwnPropertyDescriptor(
        HTMLImageElement.prototype,
        "naturalWidth"
      );
      const originalNaturalHeight = Object.getOwnPropertyDescriptor(
        HTMLImageElement.prototype,
        "naturalHeight"
      );

      Object.defineProperty(HTMLImageElement.prototype, "naturalWidth", {
        get() {
          // Yüklenememişse => 0 döner, sahtele
          if (this.complete && originalNaturalWidth.get.call(this) === 0) {
            return 20;
          }
          return originalNaturalWidth.get.call(this);
        },
      });

      Object.defineProperty(HTMLImageElement.prototype, "naturalHeight", {
        get() {
          if (this.complete && originalNaturalHeight.get.call(this) === 0) {
            return 20;
          }
          return originalNaturalHeight.get.call(this);
        },
      });

      // Worker içindeki WebGL sahteciliği için override
      const originalWorker = window.Worker;
      window.Worker = new Proxy(Worker, {
        construct(Target, args) {
          const workerScript = `
      const spoofWebGLInWorker = (context) => {
        const proto = context.prototype;
        const originalGetParameter = proto.getParameter;
        proto.getParameter = function(param) {
          if (param === 37445) return "Apple Inc."; // UNMASKED_VENDOR_WEBGL
          if (param === 37446) return "Apple GPU";  // UNMASKED_RENDERER_WEBGL
          return originalGetParameter.call(this, param);
        };
      };
      if (self.WebGLRenderingContext) spoofWebGLInWorker(WebGLRenderingContext);
      if (self.WebGL2RenderingContext) spoofWebGLInWorker(WebGL2RenderingContext);
      Object.defineProperty(self.navigator, 'platform', {
          get: () => "iPhone"
        });

        Object.defineProperty(self.navigator, 'hardwareConcurrency', {
          get: () => 4
        });

        Object.defineProperty(self.navigator, 'languages', {
          get: () => ["tr-TR"]
        });
    `;

          const fullScript = `
      ${workerScript}
      importScripts(${JSON.stringify(args[0])});
    `;

          const blob = new Blob([fullScript], {
            type: "application/javascript",
          });
          const blobURL = URL.createObjectURL(blob);
          return new Target(blobURL);
        },
      });

      (() => {
        const spoofedFonts = {
          "Arial": 90.0, "Arial Hebrew": 90.1, "Arial Rounded MT Bold": 90.2,
          "Courier": 90.3, "Courier New": 90.4, "Georgia": 90.5, "Helvetica": 90.6,
          "Helvetica Neue": 90.7, "Impact": 90.8, "Palatino": 90.9, "Times": 91.0,
          "Times New Roman": 91.1, "Trebuchet MS": 91.2, "Verdana": 91.3, "System Font": 91.4,
          "Chalkduster": 91.5, "PingFang SC": 91.6, "PingFang TC": 91.7, "PingFang HK": 91.8,
          "Optima": 91.9, "Zapfino": 92.0, "Hiragino Mincho ProN": 92.1, "Noteworthy": 92.2,
          "Didot": 92.3, "Hiragino Sans": 92.4, "Avenir": 92.5, "Hoefler Text": 92.6,
          "Papyrus": 92.7, "Kohinoor Bangla": 92.8, "Sinhala Sangam MN": 92.9,
          "Symbol": 93.0, "Hiragino Kaku Gothic StdN": 93.1, "Khmer Sangam MN": 93.2,
          "Noto Nastaliq Urdu": 93.3, "Avenir Next": 93.4, "SignPainter": 93.5,
          "Snell Roundhand": 93.6, "Futura": 93.7, "Kohinoor Devanagari": 93.8,
          "Marker Felt": 93.9, "Apple SD Gothic Neo": 94.0, "Bodoni Ornaments": 94.1,
          "Kohinoor Telugu": 94.2, "American Typewriter": 94.3, "Lao Sangam MN": 94.4,
          "DIN Alternate": 94.5, "Chalkboard SE": 94.6, "Damascus": 94.7, "Kefa": 94.8,
          "Thonburi": 94.9, "Malayalam Sangam MN": 95.0, "Bodoni 72 Smallcaps": 95.1,
          "Sukhumvit Set": 95.2, "Hiragino Maru Gothic ProN": 95.3, "Bodoni 72 Oldstyle": 95.4,
          "Devanagari Sangam MN": 95.5, "AppleGothic": 95.6, "STIXGeneral": 95.7,
          "Bangla Sangam MN": 95.8, "Baskerville": 95.9, "Heiti TC": 96.0, "Heiti SC": 96.1,
          "Avenir Next Condensed": 96.2, "Myanmar Sangam MN": 96.3, "Telugu Sangam MN": 96.4,
          "Bodoni 72": 96.5, "Kailasa": 96.6, "Tamil Sangam MN": 96.7, "Gill Sans": 96.8,
          "Apple Symbols": 96.9, "Copperplate": 97.0, "Bradley Hand": 97.1, "Geeza Pro": 97.2,
          "Savoye LET": 97.3, "DIN Condensed": 97.4, "Mishafi": 97.5, "Menlo": 97.6,
          "Apple Color Emoji": 97.7, "Rockwell": 97.8, "Euphemia UCAS": 97.9,
          "Cochin": 98.0, "Charter": 98.1, "Al Nile": 98.2, "Farah": 98.3,
          "Microsoft JhengHei": 98.4
        };
      
        const fakeFonts = new Set(Object.keys(spoofedFonts));
      
        const getFontName = (fontString) => {
          const match = fontString?.match(/["']?([^,"']+)["']?/);
          return match ? match[1].trim() : "";
        };
      
        const getSpoofedWidth = (fontName) => spoofedFonts[fontName] || null;
      
        // 1. document.fonts sahteleştirme
        const originalFonts = document.fonts;
        const fakeDocumentFonts = {
          check(font) {
            const fontName = getFontName(font);
            return fakeFonts.has(fontName);
          },
          forEach(callback) {
            fakeFonts.forEach((font) => {
              callback({ family: font, status: "loaded", weight: "normal", style: "normal" });
            });
          },
          entries() {
            return Array.from(fakeFonts).map((font) => [{ family: font }])[Symbol.iterator]();
          },
          keys() {
            return fakeFonts.values();
          },
          values() {
            return Array.from(fakeFonts).map((font) => ({ family: font }))[Symbol.iterator]();
          },
          add() {},
          clear() {},
          delete() {},
          has(font) {
            const fontName = getFontName(font);
            return fakeFonts.has(fontName);
          },
          ready: Promise.resolve(),
          size: fakeFonts.size,
          [Symbol.iterator]() {
            return Array.from(fakeFonts).map((font) => ({ family: font }))[Symbol.iterator]();
          },
          addEventListener() {},
          removeEventListener() {},
          dispatchEvent() { return true; }
        };
      
        Object.defineProperty(document, "fonts", {
          value: Object.create(originalFonts.__proto__ || FontFaceSet.prototype, {
            ...Object.getOwnPropertyDescriptors(fakeDocumentFonts),
            toString: { value: () => "[object FontFaceSet]" }
          }),
          writable: false,
          configurable: true
        });
      
        // 2. DOM tabanlı font tespitini engelleme (Sadece Pixelscan için)
        if (window.location.hostname.includes("pixelscan.net")) {
          const originalCreateElement = document.createElement;
          document.createElement = function (tagName) {
            const element = originalCreateElement.call(document, tagName);
            const originalStyleDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "style");
            const originalStyleGetter = originalStyleDescriptor.get;
            const originalStyleSetter = originalStyleDescriptor.set;
      
            Object.defineProperty(element, "style", {
              get() {
                const style = originalStyleGetter.call(this);
                const proxy = new Proxy(style, {
                  get(target, prop) {
                    if (prop === "fontFamily") {
                      const originalFontFamily = target.fontFamily || "";
                      const fontList = originalFontFamily
                        .split(",")
                        .map((font) => font.replace(/['"]/g, "").trim())
                        .filter((font) => fakeFonts.has(font))
                        .join(", ");
                      return fontList || "Arial";
                    }
                    if (prop === "getPropertyValue" && typeof target.getPropertyValue === "function") {
                      return (property) => {
                        if (property === "font-family") {
                          const originalFontFamily = target.fontFamily || "";
                          const fontList = originalFontFamily
                            .split(",")
                            .map((font) => font.replace(/['"]/g, "").trim())
                            .filter((font) => fakeFonts.has(font))
                            .join(", ");
                          return fontList || "Arial";
                        }
                        return target.getPropertyValue(property);
                      };
                    }
                    return Reflect.get(target, prop);
                  },
                  set(target, prop, value) {
                    if (prop === "fontFamily") {
                      const fontList = value
                        .split(",")
                        .map((font) => font.replace(/['"]/g, "").trim())
                        .filter((font) => fakeFonts.has(font))
                        .join(", ");
                      return Reflect.set(target, prop, fontList || "Arial");
                    }
                    return Reflect.set(target, prop, value);
                  },
                  has(target, prop) {
                    return prop in target;
                  },
                  ownKeys(target) {
                    return Reflect.ownKeys(target);
                  },
                  getOwnPropertyDescriptor(target, prop) {
                    return Reflect.getOwnPropertyDescriptor(target, prop);
                  }
                });
      
                // Proxy'nin doğal bir CSSStyleDeclaration gibi davranmasını sağla
                Object.setPrototypeOf(proxy, Object.getPrototypeOf(style));
                return proxy;
              },
              set(value) {
                originalStyleSetter.call(this, value);
              }
            });
            return element;
          };
        }
      
        // 3. window.getComputedStyle sahteleştirme
        const originalGetComputedStyle = window.getComputedStyle;
        window.getComputedStyle = function (element, pseudoElement) {
          const style = originalGetComputedStyle.call(window, element, pseudoElement);
          if (!style) return style;
      
          const originalFontFamily = style.fontFamily || "";
          const fontList = originalFontFamily
            .split(",")
            .map((font) => font.replace(/['"]/g, "").trim())
            .filter((font) => fakeFonts.has(font))
            .join(", ");
      
          const spoofedStyle = new Proxy(style, {
            get(target, prop) {
              if (prop === "fontFamily") {
                return fontList || "Arial";
              }
              if (prop === "getPropertyValue" && typeof target.getPropertyValue === "function") {
                return (property) => {
                  if (property === "font-family") {
                    return fontList || "Arial";
                  }
                  return target.getPropertyValue(property);
                };
              }
              return Reflect.get(target, prop);
            }
          });
          return spoofedStyle;
        };
      
        // 4. Canvas measureText sahteleştirme
        const realMeasureText = CanvasRenderingContext2D.prototype.measureText;
        CanvasRenderingContext2D.prototype.measureText = function (text) {
          const name = getFontName(this.font);
          const spoofed = getSpoofedWidth(name);
          if (spoofed) {
            const scale = text.length / "mmmmmmmmmmlli".length;
            return {
              width: spoofed * scale,
              actualBoundingBoxLeft: -spoofed * scale * 0.1,
              actualBoundingBoxRight: spoofed * scale * 0.9,
              actualBoundingBoxAscent: 10,
              actualBoundingBoxDescent: 2,
              fontBoundingBoxAscent: 12,
              fontBoundingBoxDescent: 3
            };
          }
          this.font = this.font.replace(name, "Arial");
          return realMeasureText.call(this, text);
        };
      
        // 5. Canvas font sahteleştirme
        const originalFontDescriptor = Object.getOwnPropertyDescriptor(
          CanvasRenderingContext2D.prototype,
          "font"
        );
        const originalSetFont = originalFontDescriptor.set;
        const originalGetFont = originalFontDescriptor.get;
        Object.defineProperty(CanvasRenderingContext2D.prototype, "font", {
          set(value) {
            const fontName = getFontName(value);
            if (!fakeFonts.has(fontName)) {
              value = value.replace(fontName, "Arial");
            }
            originalSetFont.call(this, value);
          },
          get() {
            const value = originalGetFont.call(this);
            const fontName = getFontName(value);
            if (!fakeFonts.has(fontName)) {
              return value.replace(fontName, "Arial");
            }
            return value;
          }
        });
      
        // 6. getBoundingClientRect sahteleştirme
        const realGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
        HTMLElement.prototype.getBoundingClientRect = function () {
          const style = window.getComputedStyle(this);
          const name = getFontName(style.fontFamily || this.getAttribute("font-family") || "");
          const spoofed = getSpoofedWidth(name);
          if (spoofed) {
            return {
              width: spoofed,
              height: 20,
              top: 0,
              left: 0,
              right: spoofed,
              bottom: 20,
              x: 0,
              y: 0,
              toJSON: () => "{}"
            };
          }
          return realGetBoundingClientRect.call(this);
        };
      
        // 7. offsetWidth sahteleştirme
        const originalOffsetWidthDescriptor = Object.getOwnPropertyDescriptor(
          HTMLElement.prototype,
          "offsetWidth"
        );
        const originalOffsetWidth = originalOffsetWidthDescriptor.get;
        Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
          get() {
            const style = window.getComputedStyle(this);
            const name = getFontName(style.fontFamily || "");
            const spoofed = getSpoofedWidth(name);
            if (spoofed) {
              return spoofed;
            }
            return originalOffsetWidth.call(this);
          },
          configurable: true
        });
      
        // 8. clientWidth sahteleştirme
        const originalClientWidthDescriptor = Object.getOwnPropertyDescriptor(
          HTMLElement.prototype,
          "clientWidth"
        );
        const originalClientWidth = originalClientWidthDescriptor.get;
        Object.defineProperty(HTMLElement.prototype, "clientWidth", {
          get() {
            const style = window.getComputedStyle(this);
            const name = getFontName(style.fontFamily || "");
            const spoofed = getSpoofedWidth(name);
            if (spoofed) {
              return spoofed;
            }
            return originalClientWidth.call(this);
          },
          configurable: true
        });
      
        // 9. FontFace constructor sahteleştirme
        const OriginalFontFace = window.FontFace;
        window.FontFace = function (family, source, descriptors) {
          if (!fakeFonts.has(family)) {
            throw new Error("Font not supported");
          }
          return new OriginalFontFace(family, source, descriptors);
        };
        window.FontFace.prototype = OriginalFontFace.prototype;
      
        // Native-like toString'ler
        [
          window.getComputedStyle,
          CanvasRenderingContext2D.prototype.measureText,
          CanvasRenderingContext2D.prototype.font,
          HTMLElement.prototype.getBoundingClientRect,
          HTMLElement.prototype.offsetWidth,
          HTMLElement.prototype.clientWidth,
          window.FontFace,
          document.createElement
        ].forEach((fn) => {
          Object.defineProperty(fn, "toString", {
            value: () => "function () { [native code] }"
          });
        });
      })();
    });

    const client = await page.context().newCDPSession(page);
    await client.send("Network.setExtraHTTPHeaders", {
      headers: {
        // Burada "Sec-Fetch-Site" başlığını "none" olarak ekliyoruz.
        "Sec-Fetch-Site": "none",
      },
    });
    const targetUrl = "https://pixelscan.net/";

    // scapy_script.py'yi hedef URL ile çalıştıran asenkron fonksiyon
    async function runScapy() {
      return new Promise((resolve, reject) => {
        console.log("scapy.py çalıştırılıyor...");
        // targetUrl, scapy_script.py'ye argüman olarak aktarılıyor.
        const pythonProcess = spawn("python", ["scapy_script.py", targetUrl]);

        pythonProcess.stdout.on("data", (data) => {
          console.log(`[scapy.py stdout]: ${data.toString()}`);
        });

        pythonProcess.stderr.on("data", (data) => {
          console.error(`[scapy.py stderr]: ${data.toString()}`);
        });

        pythonProcess.on("close", (code) => {
          if (code === 0) {
            console.log("scapy.py başarıyla tamamlandı.");
            resolve();
          } else {
            reject(new Error(`scapy.py ${code} hata kodu ile sonlandı.`));
          }
        });
      });
    }
    await runScapy();
    // Sayfaya git
    await page.goto(targetUrl, {
      waitUntil: "networkidle",
    });

    // Bilgileri kontrol et
    const navigatorInfo = await page.evaluate(() => {
      const props = {};
      for (const key in navigator) {
        props[key] = navigator[key];
      }
      return {
        ...props,
        width: screen.width,
        height: screen.height,
        availWidth: screen.availWidth,
        availHeight: screen.availHeight,
        colorDepth: screen.colorDepth,
        pixelDepth: screen.pixelDepth,
        availTop: screen.availTop,
        availLeft: screen.availLeft,
        orientationType: screen.orientation?.type,
        orientationAngle: screen.orientation?.angle,
        devicePixelRatio: window.devicePixelRatio,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        outerWidth: window.outerWidth,
        outerHeight: window.outerHeight,
        dateFormat: new Intl.DateTimeFormat("tr-TR").format(new Date()),
      };
    });
    // 5 dakika bekle
    await page.waitForTimeout(300000000);

    console.log("Tarayıcı kapatılıyor...");
    await browser.close();
    console.log("Tarayıcı başarıyla kapatıldı.");
  } catch (error) {
    console.error("Hata oluştu:", error);
    if (browser) {
      console.log("Hata sonrası tarayıcı kapatılıyor...");
      await browser.close();
    }
  }
})();
