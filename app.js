const { chromium } = require('patchright');
const { newInjectedContext } = require('fingerprint-injector');
const fs = require('fs');
const cityCoordinates = JSON.parse(fs.readFileSync('city_coordinates.json', 'utf-8'));
const devices = JSON.parse(fs.readFileSync('MobilDevices.json', 'utf-8'));
function getRandomDevice() {
    try {
        // "landscape" içermeyen anahtarları filtrele
        const filteredKeys = Object.keys(devices).filter(key => !key.includes("landscape") && !key.includes("Desktop"));
        // Rastgele bir key seç
        const randomKey = filteredKeys[Math.floor(Math.random() * filteredKeys.length)];
        console.log(randomKey);
        return randomKey; // String olarak döndür
    } catch (error) {
        console.error("Hata:", error.message);
        return null;
    }
}
async function setupAntiFingerprint(page, languageSet) {
    // Outer/Inner boyut uyumsuzluğunu düzelt
    // Temel spoofingler
    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => false });

        Object.defineProperty(navigator, 'mediaDevices', {
            get: () => ({
                enumerateDevices: async () => [],
                getUserMedia: async () => { throw new Error("Permission denied"); }
            })
        });
        Object.defineProperty(navigator, 'userAgentData', { //virtual Machine sorununu ortadan kaldırdı.
            get: () => ({
                brands: [
                    { brand: "Chromium", version: "120" },
                    { brand: "Google Chrome", version: "120" }
                ],
                mobile: true,
                platform: "Android"
            })
        });

        console.debug = () => {};
    });
}

(async () => {
    const userDataDir = "firstScriptData";
    const coordinates = cityCoordinates["MERSİN"];
    const deviceName = getRandomDevice();
    for (let i = 0; i < 1; i++) {
        
        const browser = await chromium.launchPersistentContext(userDataDir, {
            channel: "chrome",
            headless: false,
            viewport: devices[deviceName].viewport,
            userAgent: devices[deviceName].userAgent,
            isMobile: true,
            hasTouch: true,
            geolocation: {
                latitude: coordinates.latitude,
                longitude: coordinates.longitude
            },
            permissions: ['geolocation'],
            
            // do NOT add custom browser headers or userAgent
        });
        const page = await browser.newPage();
        const languageSet = {
            languages: ['tr-TR', 'tr'],
            language: 'tr-TR'
        };
        await setupAntiFingerprint(page, languageSet);
        
        await page.goto('https://www.google.com', {
            waitUntil: 'networkidle',
            timeout: 30000,
        });
        const inputLocator = page.locator('[name=q]');
        await inputLocator.click();
        await page.keyboard.type('Hava durumu');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(40000);
        await browser.close();        
    }    
})();