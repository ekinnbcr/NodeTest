const { chromium } = require('playwright');
const { newInjectedContext } = require('fingerprint-injector');
const fs = require('fs');

const cityCoordinates = JSON.parse(fs.readFileSync('city_coordinates.json', 'utf-8'));
const tasks = JSON.parse(fs.readFileSync('tasks.json', 'utf-8'));
const staticFingerprintOptions = {
    devices: ['mobile'],
    operatingSystems: ['android']
};

const staticViewport = {
    width: 360,
    height: 740,
    isMobile: true,
    hasTouch: true
};

const staticLang = {
    languages: ['tr-TR'],
    language: 'tr-TR'
};


function getRandomLanguageSet() {
    const languageSets = [
        { languages: ['tr-TR'], language: 'tr-TR' },
        { languages: ['tr', 'en', 'en-US'], language: 'tr' }
    ];
    return languageSets[Math.floor(Math.random() * languageSets.length)];
}

// Gerçek mobil swipe hareketi
async function swipeGesture(page, startX, startY, endX, endY, steps = 10) {
    const client = await page.context().newCDPSession(page);
    await client.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: startX, y: startY }],
    });

    const deltaX = (endX - startX) / steps;
    const deltaY = (endY - startY) / steps;

    for (let i = 1; i <= steps; i++) {
        await client.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{
                x: Math.round(startX + deltaX * i),
                y: Math.round(startY + deltaY * i),
            }],
        });
        await page.waitForTimeout(16);
    }

    await client.send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: [],
    });
}

// Reklama dokunma ve web sitesinde swipe ile gezinme
async function tapAdAndSwipeAround(page, adLink) {
    try {
        console.log("Reklama dokunmaya hazırlanıyor...");
        const box = await adLink.boundingBox();
        if (box) {
            await page.waitForTimeout(Math.random() * 2000); // 0-2 saniye içinde dokun
            await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);

            console.log("Reklama başarıyla dokunuldu!");

            await page.waitForTimeout(2000); // Sayfa yüklenmesi için bekle

            console.log("Sayfa aşağıya doğru kaydırılıyor (swipe down)...");
            await swipeGesture(page, 200, 600, 200, 200);
            await page.waitForTimeout(1500);

            console.log("Sayfa yukarıya doğru kaydırılıyor (swipe up)...");
            await swipeGesture(page, 200, 200, 200, 600);
            await page.waitForTimeout(1500);

            console.log("Geri tuşuna basılıyor...");
            await page.goBack();
            await page.waitForTimeout(2000);
        } else {
            console.log("Reklamın koordinatları alınamadı.");
        }
    } catch (error) {
        console.log("Reklama dokunurken hata oluştu:", error.message);
    }
}

// Google bildirimlerini kapatma
async function dismissGoogleNotification(page) {
    try {
        const notificationSelector = 'button:has-text("İptal"), button:has-text("Hayır"), button:has-text("Kapat"), button:has-text("Tamam"), button:has-text("Hayır, teşekkürler")';
        for (let i = 0; i < 5; i++) {
            const notificationButton = page.locator(notificationSelector);
            if (await notificationButton.count() > 0) {
                await page.touchscreen.tap(200, 400);
                await notificationButton.first().click();
                console.log("Google bildirimi kapatıldı.");
                return;
            }
            await page.waitForTimeout(1000);
        }
        console.log("Google bildirimi bulunamadı, devam ediliyor.");
    } catch (error) {
        console.log("Google bildirimi kapatılırken hata oluştu, devam ediliyor.");
    }
}

// Arama yap ve reklama dokun
async function searchKeywordAndTapAd(page, keyword) {
    try {
        await page.goto('https://www.google.com', { waitUntil: 'networkidle', timeout: 30000 });
        await dismissGoogleNotification(page);
        //await dismissDialog(page.context());


        await page.locator('[name=q]').click();
        console.log(`Arama kutusuna "${keyword}" yazılıyor...`);
        await typeLikeHuman(page, keyword);
        await page.keyboard.press('Enter');
        console.log(`"${keyword}" kelimesi arandı. Sonuçlar yükleniyor...`);

        await page.waitForTimeout(3000);
        await dismissGoogleNotification(page);

        const adSelector = 'div[data-text-ad] a';
        const adLinks = await page.locator(adSelector);
        if (await adLinks.count() > 0) {
            console.log(`"${keyword}" için reklam bulundu!`);
            const firstAd = await adLinks.first();
            await tapAdAndSwipeAround(page, firstAd);
 // reklamla etkileşim ve gezinme
        } else {
            console.log(`"${keyword}" için reklam bulunamadı.`);
        }
    } catch (error) {
        console.log(`Hata oluştu (${keyword}):`, error.message);
    }
}

// Doğal yazma simülasyonu
async function typeLikeHuman(page, text) {
    for (let char of text) {
        await page.keyboard.type(char, { delay: Math.floor(Math.random() * 100) + 200 });

        // %15 ihtimalle yanlış yazıp geri silsin
        if (Math.random() < 0.15) {
            const wrongChar = getSimilarWrongChar(char); // Yanlış harfi al
            await page.keyboard.type(wrongChar, { delay: Math.floor(Math.random() * 100) + 200 });
            await page.waitForTimeout(Math.floor(Math.random() * 500) + 300); // Yanlış yazdıktan sonra bekleme (300-800ms)
            await page.keyboard.press("Backspace");
            await page.waitForTimeout(Math.floor(Math.random() * 200) + 200); // Geri silerken bekleme (200-400ms)
            await page.keyboard.press("Backspace");
            await page.waitForTimeout(Math.floor(Math.random() * 200) + 300); // Tekrar yazmadan önce bekleme (300-500ms)
            await page.keyboard.type(char, { delay: Math.floor(Math.random() * 100) + 200 });
        }

        // %10 ihtimalle kısa bir duraksama yapsın (düşünüyormuş gibi)
        if (Math.random() < 0.10) {
            await page.waitForTimeout(Math.floor(Math.random() * 1000) + 300);
        }
    }
}

// Yanlış harfi seçen fonksiyon
function getSimilarWrongChar(char) {
    const turkishAlphabet = "abcçdefgğhıijklmnoöprsştuüvyz"; // Türkçe harfler
    const index = turkishAlphabet.indexOf(char.toLowerCase()); // Harfin indeksini bul

    if (index === -1) return char; // Eğer harf değilse aynısını döndür

    const randomOffset = Math.random() < 0.5 ? -1 : 1; // Yanlış harf için +1 veya -1 kaydır
    const wrongIndex = (index + randomOffset + turkishAlphabet.length) % turkishAlphabet.length;
    
    return turkishAlphabet[wrongIndex];
}


// Ana işlem
(async () => {
    for (const task of tasks) {
        console.log(`İşlem yapılıyor: ${task.Location}`);

        const coordinates = cityCoordinates[task.Location.toLocaleUpperCase('tr')];
        if (!coordinates) {
            console.log(`Koordinatlar bulunamadı: ${task.Location}`);
            continue;
        }

        console.log(`Koordinatlar: ${coordinates.latitude}, ${coordinates.longitude}`);

        const browser = await chromium.launch({ headless: false });
        const context = await newInjectedContext(browser, {
            fingerprintOptions: staticFingerprintOptions,
            newContextOptions: {
                geolocation: {
                    latitude: coordinates.latitude,
                    longitude: coordinates.longitude
                },
                permissions: ['geolocation'],
                viewport: staticViewport,
                hasTouch: true
                
            }
        });
        await context.addInitScript(() => {
            Object.defineProperty(window, 'matchMedia', {
                value: (query) => ({
                    matches: query === '(prefers-color-scheme: light)',
                    addListener: () => {},
                    removeListener: () => {}
                })
            });
        });
        

        const randomLangs = getRandomLanguageSet();
        await context.addInitScript((langs) => {
            Object.defineProperty(navigator, 'languages', { get: () => langs.languages });
            Object.defineProperty(navigator, 'language', { get: () => langs.language });
        }, randomLangs);

        const page = await context.newPage();

        for (const keyword of task.Keywords) {
            console.log(`🔍 Arama yapılıyor: ${keyword}`);
            await searchKeywordAndTapAd(page, keyword);
            await page.waitForTimeout(2000+Math.random()*3000);
        }

        await context.close();
        await browser.close();
    }

    console.log("✅ Tüm görevler tamamlandı. Program sonlanıyor.");
    process.exit(0);
})();
