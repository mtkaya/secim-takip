/**
 * Firebase + data.js verilerinden rapor için pre-computed JSON üretir.
 * Bu JSON, /rapor sayfasında kullanılacak.
 * Kullanım: node scripts/build-rapor-data.js
 */
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'app', 'data.js');
const FIREBASE_FILE = path.join(__dirname, '..', 'secim-verileri.json');
const OUTPUT = path.join(__dirname, '..', 'app', 'rapor', 'rapor-data.json');

// data.js parse
const content = fs.readFileSync(DATA_FILE, 'utf-8');
const prefix = 'export const SECIM_DATA = ';
const jsonStr = content.slice(prefix.length).replace(/;\s*$/, '').trim();
const SECIM_DATA = JSON.parse(jsonStr);

// Firebase verileri
const raw = JSON.parse(fs.readFileSync(FIREBASE_FILE, 'utf-8'));
const geldi = raw.geldi || {};
const gelemez = raw.gelemez || {};

const makeKey = (kisi) => (kisi.ad + '_' + (kisi.sicil || '')).replace(/[.#$\/\[\]]/g, '_');

// --- REFERANS SORUMLU ---
const referansRapor = SECIM_DATA.roller.map(r => {
  const g = r.kisiler.filter(k => geldi[makeKey(k)]).length;
  const e = r.kisiler.filter(k => gelemez[makeKey(k)]).length;
  return { ad: r.ad, toplam: r.referans_sayisi, geldi: g, gelemez: e, bekleyen: r.referans_sayisi - g - e, yuzde: r.referans_sayisi > 0 ? Math.round(g / r.referans_sayisi * 100) : 0 };
}).sort((a, b) => b.yuzde - a.yuzde);

// --- SANDIK ---
const sandikRapor = SECIM_DATA.sandiklar.map(s => {
  const g = s.kisiler.filter(k => geldi[makeKey(k)]).length;
  const e = s.kisiler.filter(k => gelemez[makeKey(k)]).length;
  return { ad: s.ad, toplam: s.referans_sayisi, geldi: g, gelemez: e, bekleyen: s.referans_sayisi - g - e, yuzde: s.referans_sayisi > 0 ? Math.round(g / s.referans_sayisi * 100) : 0 };
});

// --- GENEL ---
let toplamKisi = 0, toplamGeldi = 0, toplamGelemez = 0;
SECIM_DATA.sandiklar.forEach(s => {
  s.kisiler.forEach(k => {
    toplamKisi++;
    if (geldi[makeKey(k)]) toplamGeldi++;
    else if (gelemez[makeKey(k)]) toplamGelemez++;
  });
});

// --- SAAT DAĞILIMI ---
const saatDagilimi = {};
Object.values(geldi).forEach(v => {
  if (v && v.saat) {
    const saat = v.saat.split(':')[0];
    saatDagilimi[saat] = (saatDagilimi[saat] || 0) + 1;
  }
});

// --- İŞARETLEYEN ---
const isaretleyenler = {};
Object.values(geldi).forEach(v => { if (v && v.isaretleyen) isaretleyenler[v.isaretleyen] = (isaretleyenler[v.isaretleyen] || 0) + 1; });
Object.values(gelemez).forEach(v => { if (v && v.isaretleyen) isaretleyenler[v.isaretleyen] = (isaretleyenler[v.isaretleyen] || 0) + 1; });
const isaretSirali = Object.entries(isaretleyenler).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([ad, sayi]) => ({ ad, sayi }));

// --- ÖZEL LİSTELER ---
const ozelListe = (kisiler) => {
  const t = kisiler.length;
  const g = kisiler.filter(k => geldi[makeKey(k)]).length;
  const e = kisiler.filter(k => gelemez[makeKey(k)]).length;
  return { toplam: t, geldi: g, gelemez: e, bekleyen: t - g - e, yuzde: t > 0 ? Math.round(g / t * 100) : 0 };
};

const result = {
  tarih: new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' }),
  genel: { toplamKisi, toplamGeldi, toplamGelemez, toplamBekleyen: toplamKisi - toplamGeldi - toplamGelemez, yuzde: toplamKisi > 0 ? Math.round(toplamGeldi / toplamKisi * 100) : 0 },
  referansRapor,
  sandikRapor,
  saatDagilimi,
  isaretSirali,
  referansli: ozelListe(SECIM_DATA.referansli.kisiler),
  referanssiz: ozelListe(SECIM_DATA.referanssiz.kisiler),
  cakisanlar: ozelListe(SECIM_DATA.cakisanlar.kisiler),
};

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, JSON.stringify(result), 'utf-8');
console.log('✅ Rapor verisi oluşturuldu:', OUTPUT);
console.log(`📊 ${toplamGeldi}/${toplamKisi} geldi (%${result.genel.yuzde})`);
