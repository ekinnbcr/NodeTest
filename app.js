import { chromium, devices } from "patchright";

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
  console.log("Seçilen cihaz:", singleDevice);

  try {
    browser = await chromium.launchPersistentContext(userDataDir, {
      extraHTTPHeaders: {
        //"Sec-Fetch-Site": "none",
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

      //useragent sahteciliğ
      /*
      const fakeUserAgentData = {
        brands: [
          { brand: "Not=A?Brand", version: "99" },
          { brand: "Chromium", version: "133" },
          { brand: "Google Chrome", version: "133" },
        ],
        mobile: true,
        platform: "iOS",
        getHighEntropyValues: async () => ({
          architecture: "arm",
          model: "iPhone",
          platform: "iOS",
          platformVersion: "17.3.1",
          uaFullVersion: "133.0.6943.120",
          fullVersionList: [
            { brand: "Chromium", version: "133.0.6943.120" },
            { brand: "Google Chrome", version: "133.0.6943.120" },
            { brand: "Not=A?Brand", version: "99" },
          ],
          bitness: "64",
          wow64: false,
        }),
      };

      Object.defineProperty(desiredNavigator, "userAgentData", {
        get: function () {
          return fakeUserAgentData;
        },
        configurable: true,
      });
      Object.defineProperty(
        Object.getOwnPropertyDescriptor(desiredNavigator, "userAgentData").get,
        "toString",
        {
          value: () => "function get userAgentData() { [native code] }",
        }
      );
      */

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
      Object.defineProperty(window, "speechSynthesis", {
        get: function () {
          // Sahte SpeechSynthesisVoice constructor'ı
          function FakeSpeechSynthesisVoice({ lang, name }) {
            this.voiceURI = name; // voiceURI olarak name kullanılıyor
            this.name = name.split(".").pop(); // name, URI'nin son kısmından türetiliyor (örneğin, "Meijia")
            this.lang = lang;
            this.localService = true; // Tüm sesler yerel hizmet olarak işaretleniyor
            this.default = false;
          }

          // Sesler listesi (verdiğiniz sırayla 185 ses + eksik Samantha sesi eklendi)
          const voices = [
            new FakeSpeechSynthesisVoice({
              lang: "ar-001",
              name: "com.apple.voice.compact.ar-001.Maged",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "bg-BG",
              name: "com.apple.voice.compact.bg-BG.Daria",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "ca-ES",
              name: "com.apple.voice.compact.ca-ES.Montserrat",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "cs-CZ",
              name: "com.apple.voice.compact.cs-CZ.Zuzana",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "da-DK",
              name: "com.apple.voice.compact.da-DK.Sara",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "de-DE",
              name: "com.apple.eloquence.de-DE.Sandy",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "de-DE",
              name: "com.apple.eloquence.de-DE.Shelley",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "de-DE",
              name: "com.apple.eloquence.de-DE.Grandma",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "de-DE",
              name: "com.apple.eloquence.de-DE.Grandpa",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "de-DE",
              name: "com.apple.eloquence.de-DE.Eddy",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "de-DE",
              name: "com.apple.eloquence.de-DE.Reed",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "de-DE",
              name: "com.apple.voice.compact.de-DE.Anna",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "de-DE",
              name: "com.apple.eloquence.de-DE.Rocko",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "de-DE",
              name: "com.apple.eloquence.de-DE.Flo",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "el-GR",
              name: "com.apple.voice.compact.el-GR.Melina",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "en-AU",
              name: "com.apple.voice.compact.en-AU.Karen",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "en-GB",
              name: "com.apple.eloquence.en-GB.Rocko",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "en-GB",
              name: "com.apple.eloquence.en-GB.Shelley",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "en-GB",
              name: "com.apple.voice.compact.en-GB.Daniel",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "en-GB",
              name: "com.apple.eloquence.en-GB.Grandma",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "en-GB",
              name: "com.apple.eloquence.en-GB.Grandpa",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "en-GB",
              name: "com.apple.eloquence.en-GB.Flo",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "en-GB",
              name: "com.apple.eloquence.en-GB.Eddy",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "en-GB",
              name: "com.apple.eloquence.en-GB.Reed",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "en-GB",
              name: "com.apple.eloquence.en-GB.Sandy",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "en-IE",
              name: "com.apple.voice.compact.en-IE.Moira",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "en-IN",
              name: "com.apple.voice.compact.en-IN.Rishi",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "en-US",
              name: "com.apple.eloquence.en-US.Flo",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "en-US",
              name: "com.apple.speech.synthesis.voice.Bahh",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "en-US",
              name: "com.apple.speech.synthesis.voice.Albert",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "en-US",
              name: "com.apple.speech.synthesis.voice.Fred",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "en-US",
              name: "com.apple.speech.synthesis.voice.Hysterical",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "en-US",
              name: "com.apple.speech.synthesis.voice.Organ",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "en-US",
              name: "com.apple.speech.synthesis.voice.Cellos",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "en-US",
              name: "com.apple.speech.synthesis.voice.Zarvox",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "en-US",
              name: "com.apple.eloquence.en-US.Rocko",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "en-US",
              name: "com.apple.eloquence.en-US.Shelley",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "en-US",
              name: "com.apple.speech.synthesis.voice.Princess",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "en-US",
              name: "com.apple.eloquence.en-US.Grandma",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "en-US",
              name: "com.apple.eloquence.en-US.Eddy",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "en-US",
              name: "com.apple.speech.synthesis.voice.Bells",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "en-US",
              name: "com.apple.eloquence.en-US.Grandpa",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "en-US",
              name: "com.apple.speech.synthesis.voice.Trinoids",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "en-US",
              name: "com.apple.speech.synthesis.voice.Kathy",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "en-US",
              name: "com.apple.eloquence.en-US.Reed",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "en-US",
              name: "com.apple.speech.synthesis.voice.Boing",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "en-US",
              name: "com.apple.speech.synthesis.voice.Whisper",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "en-US",
              name: "com.apple.speech.synthesis.voice.Deranged",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "en-US",
              name: "com.apple.speech.synthesis.voice.GoodNews",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "en-US",
              name: "com.apple.speech.synthesis.voice.BadNews",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "en-US",
              name: "com.apple.speech.synthesis.voice.Bubbles",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "en-US",
              name: "com.apple.eloquence.en-US.Sandy",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "en-US",
              name: "com.apple.speech.synthesis.voice.Junior",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "en-US",
              name: "com.apple.speech.synthesis.voice.Ralph",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "en-ZA",
              name: "com.apple.voice.compact.en-ZA.Tessa",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "es-ES",
              name: "com.apple.eloquence.es-ES.Shelley",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "es-ES",
              name: "com.apple.eloquence.es-ES.Grandma",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "es-ES",
              name: "com.apple.eloquence.es-ES.Rocko",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "es-ES",
              name: "com.apple.eloquence.es-ES.Grandpa",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "es-ES",
              name: "com.apple.voice.compact.es-ES.Monica",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "es-ES",
              name: "com.apple.eloquence.es-ES.Sandy",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "es-ES",
              name: "com.apple.eloquence.es-ES.Flo",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "es-ES",
              name: "com.apple.eloquence.es-ES.Eddy",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "es-ES",
              name: "com.apple.eloquence.es-ES.Reed",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "es-MX",
              name: "com.apple.eloquence.es-MX.Rocko",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "es-MX",
              name: "com.apple.voice.compact.es-MX.Paulina",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "es-MX",
              name: "com.apple.eloquence.es-MX.Flo",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "es-MX",
              name: "com.apple.eloquence.es-MX.Sandy",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "es-MX",
              name: "com.apple.eloquence.es-MX.Eddy",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "es-MX",
              name: "com.apple.eloquence.es-MX.Shelley",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "es-MX",
              name: "com.apple.eloquence.es-MX.Grandma",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "es-MX",
              name: "com.apple.eloquence.es-MX.Reed",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "es-MX",
              name: "com.apple.eloquence.es-MX.Grandpa",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "fi-FI",
              name: "com.apple.eloquence.fi-FI.Shelley",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "fi-FI",
              name: "com.apple.eloquence.fi-FI.Grandma",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "fi-FI",
              name: "com.apple.eloquence.fi-FI.Grandpa",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "fi-FI",
              name: "com.apple.eloquence.fi-FI.Sandy",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "fi-FI",
              name: "com.apple.voice.compact.fi-FI.Satu",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "fi-FI",
              name: "com.apple.eloquence.fi-FI.Eddy",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "fi-FI",
              name: "com.apple.eloquence.fi-FI.Rocko",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "fi-FI",
              name: "com.apple.eloquence.fi-FI.Reed",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "fi-FI",
              name: "com.apple.eloquence.fi-FI.Flo",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "fr-CA",
              name: "com.apple.eloquence.fr-CA.Shelley",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "fr-CA",
              name: "com.apple.eloquence.fr-CA.Grandma",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "fr-CA",
              name: "com.apple.eloquence.fr-CA.Grandpa",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "fr-CA",
              name: "com.apple.eloquence.fr-CA.Rocko",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "fr-CA",
              name: "com.apple.eloquence.fr-CA.Eddy",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "fr-CA",
              name: "com.apple.eloquence.fr-CA.Reed",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "fr-CA",
              name: "com.apple.voice.compact.fr-CA.Amelie",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "fr-CA",
              name: "com.apple.eloquence.fr-CA.Flo",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "fr-CA",
              name: "com.apple.eloquence.fr-CA.Sandy",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "fr-FR",
              name: "com.apple.eloquence.fr-FR.Grandma",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "fr-FR",
              name: "com.apple.eloquence.fr-FR.Flo",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "fr-FR",
              name: "com.apple.eloquence.fr-FR.Rocko",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "fr-FR",
              name: "com.apple.eloquence.fr-FR.Grandpa",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "fr-FR",
              name: "com.apple.eloquence.fr-FR.Sandy",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "fr-FR",
              name: "com.apple.eloquence.fr-FR.Eddy",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "fr-FR",
              name: "com.apple.voice.compact.fr-FR.Thomas",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "fr-FR",
              name: "com.apple.eloquence.fr-FR.Jacques",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "fr-FR",
              name: "com.apple.eloquence.fr-FR.Shelley",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "he-IL",
              name: "com.apple.voice.compact.he-IL.Carmit",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "hi-IN",
              name: "com.apple.voice.compact.hi-IN.Lekha",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "hr-HR",
              name: "com.apple.voice.compact.hr-HR.Lana",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "hu-HU",
              name: "com.apple.voice.compact.hu-HU.Mariska",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "id-ID",
              name: "com.apple.voice.compact.id-ID.Damayanti",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "it-IT",
              name: "com.apple.eloquence.it-IT.Eddy",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "it-IT",
              name: "com.apple.eloquence.it-IT.Sandy",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "it-IT",
              name: "com.apple.eloquence.it-IT.Reed",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "it-IT",
              name: "com.apple.eloquence.it-IT.Shelley",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "it-IT",
              name: "com.apple.eloquence.it-IT.Grandma",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "it-IT",
              name: "com.apple.eloquence.it-IT.Grandpa",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "it-IT",
              name: "com.apple.eloquence.it-IT.Flo",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "it-IT",
              name: "com.apple.eloquence.it-IT.Rocko",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "it-IT",
              name: "com.apple.voice.compact.it-IT.Alice",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "ja-JP",
              name: "com.apple.voice.compact.ja-JP.Kyoko",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "ko-KR",
              name: "com.apple.voice.compact.ko-KR.Yuna",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "ms-MY",
              name: "com.apple.voice.compact.ms-MY.Amira",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "nb-NO",
              name: "com.apple.voice.compact.nb-NO.Nora",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "nl-BE",
              name: "com.apple.voice.compact.nl-BE.Ellen",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "nl-NL",
              name: "com.apple.voice.compact.nl-NL.Xander",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "pl-PL",
              name: "com.apple.voice.compact.pl-PL.Zosia",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "pt-BR",
              name: "com.apple.eloquence.pt-BR.Reed",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "pt-BR",
              name: "com.apple.voice.compact.pt-BR.Luciana",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "pt-BR",
              name: "com.apple.eloquence.pt-BR.Shelley",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "pt-BR",
              name: "com.apple.eloquence.pt-BR.Grandma",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "pt-BR",
              name: "com.apple.eloquence.pt-BR.Grandpa",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "pt-BR",
              name: "com.apple.eloquence.pt-BR.Rocko",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "pt-BR",
              name: "com.apple.eloquence.pt-BR.Flo",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "pt-BR",
              name: "com.apple.eloquence.pt-BR.Sandy",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "pt-BR",
              name: "com.apple.eloquence.pt-BR.Eddy",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "pt-PT",
              name: "com.apple.voice.compact.pt-PT.Joana",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "ro-RO",
              name: "com.apple.voice.compact.ro-RO.Ioana",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "ru-RU",
              name: "com.apple.voice.compact.ru-RU.Milena",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "sk-SK",
              name: "com.apple.voice.compact.sk-SK.Laura",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "sv-SE",
              name: "com.apple.voice.compact.sv-SE.Alva",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "th-TH",
              name: "com.apple.voice.compact.th-TH.Kanya",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "uk-UA",
              name: "com.apple.voice.compact.uk-UA.Lesya",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "vi-VN",
              name: "com.apple.voice.compact.vi-VN.Linh",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "zh-CN",
              name: "com.apple.voice.compact.zh-CN.Tingting",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "zh-HK",
              name: "com.apple.voice.compact.zh-HK.Sinji",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "zh-TW",
              name: "com.apple.voice.compact.zh-TW.Meijia",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "ca-ES",
              name: "com.apple.voice.super-compact.ca-ES.Montserrat",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "en-GB",
              name: "com.apple.voice.super-compact.en-GB.Daniel",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "zh-HK",
              name: "com.apple.voice.super-compact.zh-HK.Sinji",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "fr-CA",
              name: "com.apple.voice.super-compact.fr-CA.Amelie",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "fr-FR",
              name: "com.apple.voice.super-compact.fr-FR.Thomas",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "en-US",
              name: "com.apple.voice.super-compact.en-US.Samantha",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "id-ID",
              name: "com.apple.voice.super-compact.id-ID.Damayanti",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "es-ES",
              name: "com.apple.voice.super-compact.es-ES.Monica",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "pl-PL",
              name: "com.apple.voice.super-compact.pl-PL.Zosia",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "hr-HR",
              name: "com.apple.voice.super-compact.hr-HR.Lana",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "pt-BR",
              name: "com.apple.voice.super-compact.pt-BR.Luciana",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "ro-RO",
              name: "com.apple.voice.super-compact.ro-RO.Ioana",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "en-IE",
              name: "com.apple.voice.super-compact.en-IE.Moira",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "nb-NO",
              name: "com.apple.voice.super-compact.nb-NO.Nora",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "nl-NL",
              name: "com.apple.voice.super-compact.nl-NL.Xander",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "ko-KR",
              name: "com.apple.voice.super-compact.ko-KR.Yuna",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "en-IN",
              name: "com.apple.voice.super-compact.en-IN.Rishi",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "it-IT",
              name: "com.apple.voice.super-compact.it-IT.Alice",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "th-TH",
              name: "com.apple.voice.super-compact.th-TH.Kanya",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "ja-JP",
              name: "com.apple.voice.super-compact.ja-JP.Kyoko",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "vi-VN",
              name: "com.apple.voice.super-compact.vi-VN.Linh",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "es-MX",
              name: "com.apple.voice.super-compact.es-MX.Paulina",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "zh-CN",
              name: "com.apple.voice.super-compact.zh-CN.Tingting",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "en-AU",
              name: "com.apple.voice.super-compact.en-AU.Karen",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "el-GR",
              name: "com.apple.voice.super-compact.el-GR.Melina",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "hi-IN",
              name: "com.apple.voice.super-compact.hi-IN.Lekha",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "ms-MY",
              name: "com.apple.voice.super-compact.ms-MY.Amira",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "fi-FI",
              name: "com.apple.voice.super-compact.fi-FI.Satu",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "hu-HU",
              name: "com.apple.voice.super-compact.hu-HU.Mariska",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "pt-PT",
              name: "com.apple.voice.super-compact.pt-PT.Joana",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "bg-BG",
              name: "com.apple.voice.super-compact.bg-BG.Daria",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "nl-BE",
              name: "com.apple.voice.super-compact.nl-BE.Ellen",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "zh-TW",
              name: "com.apple.voice.super-compact.zh-TW.Meijia",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "sk-SK",
              name: "com.apple.voice.super-compact.sk-SK.Laura",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "uk-UA",
              name: "com.apple.voice.super-compact.uk-UA.Lesya",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "ar-001",
              name: "com.apple.voice.super-compact.ar-001.Maged",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "cs-CZ",
              name: "com.apple.voice.super-compact.cs-CZ.Zuzana",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "ru-RU",
              name: "com.apple.voice.super-compact.ru-RU.Milena",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "en-ZA",
              name: "com.apple.voice.super-compact.en-ZA.Tessa",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "de-DE",
              name: "com.apple.voice.super-compact.de-DE.Anna",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "tr-TR",
              name: "com.apple.voice.super-compact.tr-TR.Yelda",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "sv-SE",
              name: "com.apple.voice.super-compact.sv-SE.Alva",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "da-DK",
              name: "com.apple.voice.super-compact.da-DK.Sara",
            }),
            new FakeSpeechSynthesisVoice({
              lang: "he-IL",
              name: "com.apple.voice.super-compact.he-IL.Carmit",
            }),
          ];

          // Varsayılan sesi ayarla
          voices.forEach((voice) => {
            if (voice.voiceURI === "com.apple.voice.compact.ar-001.Maged") {
              voice.default = true;
              voice.name = "Maged"; // Varsayılan sesin adı Maged olmalı
            } else {
              voice.default = false;
            }
          });

          return {
            getVoices() {
              return voices;
            },
            speak() {},
            cancel() {},
            pause() {},
            resume() {},
            speaking: false,
            pending: false,
            paused: false,
            onvoiceschanged: null,
          };
        },
        configurable: true,
      });

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
        // iPhone'da var gibi gösterilecek fontlar
        const spoofedFonts = {
          "Arial": 90.0,
          "Arial Hebrew": 90.1,
          "Arial Rounded MT Bold": 90.2,
          "Courier": 90.3,
          "Courier New": 90.4,
          "Georgia": 90.5,
          "Helvetica": 90.6,
          "Helvetica Neue": 90.7,
          "Impact": 90.8,
          "Palatino": 90.9,
          "Times": 91.0,
          "Times New Roman": 91.1,
          "Trebuchet MS": 91.2,
          "Verdana": 91.3,
          "System Font": 91.4,
          "Chalkduster": 91.5,
          "PingFang SC": 91.6,
          "PingFang TC": 91.7,
          "PingFang HK": 91.8,
          "Optima": 91.9,
          "Zapfino": 92.0,
          "Hiragino Mincho ProN": 92.1,
          "Noteworthy": 92.2,
          "Didot": 92.3,
          "Hiragino Sans": 92.4,
          "Avenir": 92.5,
          "Hoefler Text": 92.6,
          "Papyrus": 92.7,
          "Kohinoor Bangla": 92.8,
          "Sinhala Sangam MN": 92.9,
          "Symbol": 93.0,
          "Hiragino Kaku Gothic StdN": 93.1,
          "Khmer Sangam MN": 93.2,
          "Noto Nastaliq Urdu": 93.3,
          "Avenir Next": 93.4,
          "SignPainter": 93.5,
          "Snell Roundhand": 93.6,
          "Futura": 93.7,
          "Kohinoor Devanagari": 93.8,
          "Marker Felt": 93.9,
          "Apple SD Gothic Neo": 94.0,
          "Bodoni Ornaments": 94.1,
          "Kohinoor Telugu": 94.2,
          "American Typewriter": 94.3,
          "Lao Sangam MN": 94.4,
          "DIN Alternate": 94.5,
          "Chalkboard SE": 94.6,
          "Damascus": 94.7,
          "Kefa": 94.8,
          "Thonburi": 94.9,
          "Malayalam Sangam MN": 95.0,
          "Bodoni 72 Smallcaps": 95.1,
          "Sukhumvit Set": 95.2,
          "Hiragino Maru Gothic ProN": 95.3,
          "Bodoni 72 Oldstyle": 95.4,
          "Devanagari Sangam MN": 95.5,
          "AppleGothic": 95.6,
          "STIXGeneral": 95.7,
          "Bangla Sangam MN": 95.8,
          "Baskerville": 95.9,
          "Heiti TC": 96.0,
          "Heiti SC": 96.1,
          "Avenir Next Condensed": 96.2,
          "Myanmar Sangam MN": 96.3,
          "Telugu Sangam MN": 96.4,
          "Bodoni 72": 96.5,
          "Kailasa": 96.6,
          "Tamil Sangam MN": 96.7,
          "Gill Sans": 96.8,
          "Apple Symbols": 96.9,
          "Copperplate": 97.0,
          "Bradley Hand": 97.1,
          "Geeza Pro": 97.2,
          "Savoye LET": 97.3,
          "DIN Condensed": 97.4,
          "Mishafi": 97.5,
          "Menlo": 97.6,
          "Apple Color Emoji": 97.7,
          "Rockwell": 97.8,
          "Euphemia UCAS": 97.9,
          "Cochin": 98.0,
          "Charter": 98.1,
          "Al Nile": 98.2,
          "Farah": 98.3,
          "Microsoft JhengHei": 98.4,
        };
        
        
      
        // Windows ortamına özel fontlar — gizlenecekler
        const windowsFonts = [
          "Arial Black", "Arial Narrow", "Book Antiqua", "Bookman Old Style", "Calibri",
          "Cambria", "Cambria Math", "Century", "Century Gothic", "Comic Sans MS",
          "Consolas", "Lucida Console", "Lucida Handwriting", "Lucida Sans Unicode",
          "Microsoft Sans Serif", "Monotype Corsiva", "MS Gothic", "MS PGothic",
          "MS Reference Sans Serif", "MS Serif", "Palatino Linotype", "Segoe Print",
          "Segoe Script", "Segoe UI", "Segoe UI Light", "Segoe UI Semibold",
          "Segoe UI Symbol", "Wingdings", "Wingdings 2", "Wingdings 3", "Marlett",
          "Webdings", "Gabriola", "Franklin Gothic", "Corbel", "Constantia", "Candara",
          "Ebrima", "MS UI Gothic", "MV Boli", "Malgun Gothic", "Microsoft Himalaya",
          "Microsoft New Tai Lue", "Microsoft PhagsPa", "Microsoft Tai Le",
          "Microsoft YaHei", "Microsoft Yi Baiti", "MingLiU-ExtB",
          "MingLiU_HKSCS-ExtB", "Mongolian Baiti", "PMingLiU-ExtB", "SimSun",
          "Sylfaen", "Yu Gothic", "Bahnschrift", "Courier New", "Georgia", "Impact",
          "Symbol", "Verdana"
        ];
      
        const getFontName = (fontString) => {
          const match = fontString?.match(/["']?([^,"']+)["']?/);
          return match ? match[1].trim() : "";
        };
      
        const defaultWidth = 89.0; // Windows fontları "yokmuş gibi" davranacak
      
        const getSpoofedWidth = (fontName) => {
          if (spoofedFonts[fontName]) return spoofedFonts[fontName];
          if (windowsFonts.includes(fontName)) return defaultWidth;
          return null;
        };
      
        // 1. measureText spoofing
        const realMeasureText = CanvasRenderingContext2D.prototype.measureText;
        CanvasRenderingContext2D.prototype.measureText = function (text) {
          const name = getFontName(this.font);
          const spoofed = getSpoofedWidth(name);
          if (spoofed && text === "mmmmmmmmmmlli") {
            return { width: spoofed, actualBoundingBoxLeft: 0, actualBoundingBoxRight: spoofed };
          }
          return realMeasureText.call(this, text);
        };
      
        // 2. getBoundingClientRect spoofing
        const realGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;
        HTMLElement.prototype.getBoundingClientRect = function () {
          const style = this.style || {};
          const name = getFontName(style.fontFamily || this.getAttribute("font-family") || "");
          const spoofed = getSpoofedWidth(name);
          if (spoofed) {
            return {
              width: spoofed,
              height: 20,
              top: 0, left: 0, right: spoofed, bottom: 20,
              x: 0, y: 0,
              toJSON: () => "{}"
            };
          }
          return realGetBoundingClientRect.call(this);
        };
      
        // 3. offsetWidth spoofing
        Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
          get() {
            const name = getFontName(this.style?.fontFamily || "");
            const spoofed = getSpoofedWidth(name);
            return spoofed || 100;
          },
          configurable: true,
        });
      
        // 4. clientWidth spoofing
        Object.defineProperty(HTMLElement.prototype, "clientWidth", {
          get() {
            const name = getFontName(this.style?.fontFamily || "");
            const spoofed = getSpoofedWidth(name);
            return spoofed || 100;
          },
          configurable: true,
        });
      
        // Native-like toString'ler
        [CanvasRenderingContext2D.prototype.measureText, HTMLElement.prototype.getBoundingClientRect].forEach(fn => {
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

    // Sayfaya git
    await page.goto("https://pixelscan.net/ ", {
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

    console.log("Navigator Bilgileri:", navigatorInfo);

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
