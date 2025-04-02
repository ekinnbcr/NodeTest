const { chromium, devices } = require('patchright');
const fs = require('fs');

const cityCoordinates = JSON.parse(fs.readFileSync('city_coordinates.json', 'utf-8'));

function getRandomCity() {
  const cities = Object.keys(cityCoordinates);
  const randomIndex = Math.floor(Math.random() * cities.length);
  console.log("Se\u00e7ilen \u015eehir:", cities[randomIndex]);
  return cities[randomIndex];
}

function getRandomDevice() {
  const mobile_devices = ['Galaxy S8', 'Galaxy S9+', 'Galaxy Tab S4', 'iPad (gen 5)', 'iPad (gen 6)', 'iPad (gen 7)', 'iPad Mini',
    'iPad Pro 11', 'iPhone 6', 'iPhone 6 Plus', 'iPhone 7', 'iPhone 7 Plus', 'iPhone 8', 'iPhone 8 Plus',
    'iPhone SE', 'iPhone X', 'iPhone XR', 'iPhone 11', 'iPhone 11 Pro', 'iPhone 11 Pro Max', 'iPhone 12',
    'iPhone 12 Pro', 'iPhone 12 Pro Max', 'iPhone 12 Mini', 'iPhone 13', 'iPhone 13 Pro', 'iPhone 13 Pro Max',
    'iPhone 13 Mini', 'iPhone 14', 'iPhone 14 Plus', 'iPhone 14 Pro', 'iPhone 14 Pro Max', 'iPhone 15',
    'iPhone 15 Plus', 'iPhone 15 Pro', 'iPhone 15 Pro Max', 'LG Optimus L70',
    'Microsoft Lumia 550', 'Microsoft Lumia 950', 'Nexus 10', 'Nexus 4', 'Nexus 5', 'Nexus 5X', 'Nexus 6',
    'Nexus 6P', 'Nexus 7', 'Nokia Lumia 520', 'Nokia N9', 'Pixel 2', 'Pixel 2 XL', 'Pixel 3', 'Pixel 4',
    'Pixel 4a (5G)', 'Pixel 5', 'Pixel 7'];
  const randomIndex = Math.floor(Math.random() * mobile_devices.length);
  const device = devices[mobile_devices[randomIndex]];
  console.log("Se\u00e7ilen Cihaz:", mobile_devices[randomIndex]);
  return device;
}

async function setupAntiFingerprint(page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });

    Object.defineProperty(navigator, 'mediaDevices', {
      get: () => ({
        enumerateDevices: async () => [
          { kind: 'audioinput', deviceId: 'default' },
          { kind: 'videoinput', deviceId: 'camera1' }
        ],
        getUserMedia: async () => ({})
      })
    });

    Object.defineProperty(navigator, 'userAgentData', {
      get: () => ({
        brands: [
          { brand: "Chromium", version: "120" },
          { brand: "Google Chrome", version: "120" }
        ],
        mobile: true,
        platform: "Android"
      })
    });



    Object.defineProperty(navigator, 'platform', {
      get: () => 'Linux armv81'
    });

    Object.defineProperty(navigator, 'deviceMemory', { get: () => 4 });
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 4 });

    const fakePermission = {
      state: 'granted',
      onchange: null
    };

    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => {
      if (parameters.name === 'geolocation' || parameters.name === 'notifications') {
        return Promise.resolve(fakePermission);
      }
      return originalQuery(parameters);
    };

    const oldToString = Function.prototype.toString;
    const nativeToStringMap = new WeakMap();
    Function.prototype.toString = new Proxy(oldToString, {
      apply: function(target, thisArg, args) {
        if (nativeToStringMap.has(thisArg)) {
          return nativeToStringMap.get(thisArg);
        }
        return target.apply(thisArg, args);
      }
    });

    const mockNative = (fn, name) => {
      const nativeStr = `function ${name || ''}() { [native code] }`;
      nativeToStringMap.set(fn, nativeStr);
    };
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(param) {
      if (param === 37445) return 'Qualcomm';
      if (param === 37446) return 'Adreno (TM) 640';
      return getParameter.call(this, param);
    };

    // AudioContext spoofing
    Object.defineProperty(AudioContext.prototype, 'sampleRate', {
      get: () => 44100
    });

    // screen spoofing
    Object.defineProperty(screen, 'colorDepth', { get: () => 24 });
    Object.defineProperty(screen, 'pixelDepth', { get: () => 24 });

    // navigator.connection spoofing
    Object.defineProperty(navigator, 'connection', {
      get: () => ({
        downlink: 10,
        effectiveType: '4g',
        rtt: 50,
        saveData: false,
        type: 'cellular'
      })
    });
    






    
    console.debug = () => {};
  });
}

(async () => {
  const coordinates = cityCoordinates[getRandomCity()];
  const userDataDir = "UserData" + Math.floor(Math.random() * 1000);
  const device = getRandomDevice();

  const browser = await chromium.launchPersistentContext(userDataDir, {
    channel: "chrome",
    headless: false,
    viewport: device.viewport,
    userAgent: device.userAgent,
    isMobile: true,
    hasTouch: true,
    geolocation: {
      latitude: coordinates.latitude,
      longitude: coordinates.longitude
    },
    permissions: ['geolocation']
  });

  const [page] = browser.pages();
  await setupAntiFingerprint(page);
  await page.goto('https://browserleaks.com/javascript');
  await page.waitForTimeout(40000);

  await browser.close();
  try {
    fs.unlinkSync(userDataDir);
    console.log(userDataDir, 'Dosyasi basariyla silindi.');
  } catch (err) {
    console.error('Dosya silinirken hata olustu:', err);
  }
})();
