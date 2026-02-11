const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// data.js oku
const content = fs.readFileSync(path.join(__dirname, '../app/data.js'), 'utf8');
const dataStr = content.replace('export const SECIM_DATA = ', '').replace(/;\s*$/, '');
const data = JSON.parse(dataStr);

// Tüm kişileri sandıklardan al
const tumKisiler = [];
data.sandiklar.forEach(s => s.kisiler.forEach(k => tumKisiler.push(k)));

const refAd = 'ERBİL TELCİ';

// v46 Excel dosyasını oku - v3 sayfası
const wb = XLSX.readFile('/Users/tugrulkaya/Downloads/2026 hazırlık - durum listesiv46.xlsx');
const ws = wb.Sheets['v3'];
const rows = XLSX.utils.sheet_to_json(ws, {header:1});

const header = rows[0];

// ERBİL TELCİ sütununu bul (index 79)
let erbilIdx = -1;
header.forEach((h, i) => {
  if (h && String(h).toUpperCase().includes('ERBİL')) {
    erbilIdx = i;
    console.log('ERBİL TELCİ sütunu:', i, '-', h);
  }
});

if (erbilIdx < 0) {
  console.log('ERBİL TELCİ sütunu bulunamadı!');
  process.exit(1);
}

// SİCİL NO sütun 2, ADI SOYADI sütun 3
const sicilIdx = 2;
const adIdx = 3;

// + işaretli sicilleri bul
const yeniSiciller = new Set();
rows.slice(1).forEach(row => {
  if (row[erbilIdx] && String(row[erbilIdx]).trim() === '+') {
    const sicil = row[sicilIdx];
    if (sicil) yeniSiciller.add(sicil);
  }
});

console.log(refAd + ': ' + yeniSiciller.size + ' kişi bulundu Excel\'de');

// Sandıklardan eşleşen kişileri bul
const yeniKisiler = [];
const bulunamayanlar = [];
yeniSiciller.forEach(sicil => {
  const kisi = tumKisiler.find(k => k.sicil === sicil);
  if (kisi) {
    yeniKisiler.push(kisi);
  } else {
    // Sicil'i number olarak da dene
    const kisi2 = tumKisiler.find(k => String(k.sicil) === String(sicil));
    if (kisi2) {
      yeniKisiler.push(kisi2);
    } else {
      bulunamayanlar.push(sicil);
    }
  }
});

console.log('Eşleşen kişi:', yeniKisiler.length);
if (bulunamayanlar.length > 0) {
  console.log('Bulunamayan siciller (' + bulunamayanlar.length + '):', bulunamayanlar.join(', '));
}

// Mevcut ERBİL TELCİ rolü var mı kontrol et
const mevcutRolIdx = data.roller.findIndex(r => r.ad === refAd);
if (mevcutRolIdx >= 0) {
  console.log('Mevcut rol bulundu, güncellenecek. Eski:', data.roller[mevcutRolIdx].referans_sayisi);
} else {
  console.log('Yeni rol eklenecek.');
}

// Yeni rol oluştur
const yeniRol = {
  ad: refAd,
  referans_sayisi: yeniKisiler.length,
  kisiler: yeniKisiler.map(k => {
    const entry = { ad: k.ad, tel: k.tel, sicil: k.sicil };
    const mevcutRef = k.referanslar ? [...k.referanslar] : [];
    if (!mevcutRef.includes(refAd)) mevcutRef.push(refAd);
    entry.referanslar = mevcutRef;
    return entry;
  })
};

// Roller'a ekle veya güncelle
if (mevcutRolIdx >= 0) {
  data.roller[mevcutRolIdx] = yeniRol;
} else {
  data.roller.push(yeniRol);
}

// Tüm sandıklardaki kişilere referans ekle
function refEkle(kisiler) {
  kisiler.forEach(k => {
    if (yeniSiciller.has(k.sicil) || yeniSiciller.has(String(k.sicil))) {
      if (!k.referanslar) k.referanslar = [];
      if (!k.referanslar.includes(refAd)) k.referanslar.push(refAd);
    }
  });
}

data.roller.forEach(r => refEkle(r.kisiler));
data.sandiklar.forEach(s => refEkle(s.kisiler));
refEkle(data.referansli.kisiler);

// Referanssız'dan çıkar (artık referansı var)
const oncekiRefSiz = data.referanssiz.kisiler.length;
data.referanssiz.kisiler = data.referanssiz.kisiler.filter(k => {
  return !yeniSiciller.has(k.sicil) && !yeniSiciller.has(String(k.sicil));
});
data.referanssiz.referans_sayisi = data.referanssiz.kisiler.length;
console.log('Referanssız: ' + oncekiRefSiz + ' -> ' + data.referanssiz.referans_sayisi);

// Referanslı'ya ekle (eğer yoksa)
const refliSiciller = new Set(data.referansli.kisiler.map(k => k.sicil));
yeniKisiler.forEach(k => {
  if (!refliSiciller.has(k.sicil)) {
    const entry = { ad: k.ad, tel: k.tel, sicil: k.sicil };
    entry.referanslar = k.referanslar ? [...k.referanslar] : [refAd];
    if (!entry.referanslar.includes(refAd)) entry.referanslar.push(refAd);
    data.referansli.kisiler.push(entry);
  }
});
data.referansli.referans_sayisi = data.referansli.kisiler.length;

// Çakışanları yeniden hesapla
const cakisanMap = {};
data.sandiklar.forEach(s => {
  s.kisiler.forEach(k => {
    if (k.referanslar && k.referanslar.length > 1) {
      cakisanMap[k.sicil] = { ad: k.ad, tel: k.tel, sicil: k.sicil, referanslar: k.referanslar };
    }
  });
});
data.cakisanlar.kisiler = Object.values(cakisanMap);
data.cakisanlar.referans_sayisi = data.cakisanlar.kisiler.length;

console.log('Çakışanlar:', data.cakisanlar.referans_sayisi);
console.log('Referanslı:', data.referansli.referans_sayisi);
console.log('Roller sayısı:', data.roller.length);

// İlk 10 kişiyi göster
console.log('\nEklenen kişiler (ilk 10):');
yeniRol.kisiler.slice(0, 10).forEach(k => {
  console.log('  ' + k.ad + ' (sicil: ' + k.sicil + ')');
});

// Yaz
const output = 'export const SECIM_DATA = ' + JSON.stringify(data) + ';\n';
fs.writeFileSync(path.join(__dirname, '../app/data.js'), output);
console.log('\ndata.js güncellendi!');
