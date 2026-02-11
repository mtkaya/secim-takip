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

function guncelle(excelDosya, refAd) {
  const wb = XLSX.readFile(excelDosya);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, {header:1});

  // Bu formatda: SIRA NO, SANDIK, SİCİL NO, AD SOYAD, TELEFON NO, İSİM
  const refIdx = 5;

  const yeniSiciller = new Set();
  rows.slice(1).forEach(row => {
    if (row[refIdx] && row[refIdx].toString().trim() === '+') {
      yeniSiciller.add(row[2]); // SİCİL NO sütun 2
    }
  });
  console.log(refAd + ': ' + yeniSiciller.size + ' yeni referans');

  // Eski referanslardan kaldır
  const mevcutRol = data.roller.find(r => r.ad === refAd);
  const eskiSiciller = new Set();
  if (mevcutRol) {
    mevcutRol.kisiler.forEach(k => eskiSiciller.add(k.sicil));
    console.log('  Eski: ' + mevcutRol.referans_sayisi + ' kişi');
  }

  // Eski referanslardan temizle
  function temizle(kisiler) {
    kisiler.forEach(k => {
      if (eskiSiciller.has(k.sicil) && !yeniSiciller.has(k.sicil)) {
        if (k.referanslar && k.referanslar.includes(refAd)) {
          k.referanslar = k.referanslar.filter(ref => ref !== refAd);
        }
      }
    });
  }

  data.roller.forEach(r => temizle(r.kisiler));
  data.sandiklar.forEach(s => temizle(s.kisiler));
  temizle(data.referansli.kisiler);
  temizle(data.referanssiz.kisiler);

  // Yeni kişileri bul
  const yeniKisiler = [];
  yeniSiciller.forEach(sicil => {
    const kisi = tumKisiler.find(k => k.sicil === sicil);
    if (kisi) yeniKisiler.push(kisi);
    else console.log('  Bulunamadı sicil:', sicil);
  });

  // Rolü güncelle
  const rolIdx = data.roller.findIndex(r => r.ad === refAd);
  data.roller[rolIdx] = {
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

  // Tüm rollerdeki ve sandıklardaki kişilere referans ekle
  function refEkle(kisiler) {
    kisiler.forEach(k => {
      if (yeniSiciller.has(k.sicil)) {
        if (!k.referanslar) k.referanslar = [];
        if (!k.referanslar.includes(refAd)) k.referanslar.push(refAd);
      }
    });
  }

  data.roller.forEach(r => refEkle(r.kisiler));
  data.sandiklar.forEach(s => refEkle(s.kisiler));
  refEkle(data.referansli.kisiler);

  // Referanssız güncelle
  data.referanssiz.kisiler = data.referanssiz.kisiler.filter(k => !yeniSiciller.has(k.sicil));
  data.referanssiz.referans_sayisi = data.referanssiz.kisiler.length;

  console.log('  Yeni: ' + data.roller[rolIdx].referans_sayisi + ' kişi');
}

guncelle('/Users/tugrulkaya/Downloads/GÜNCELLENECEK TAHİR BEKDİK.xlsx', 'TAHİR BEKDİK');
guncelle('/Users/tugrulkaya/Downloads/GÜNCELLENECEK YİĞİTHAN YAZGAN.xlsx', 'YİĞİTHAN YAZGAN');

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
console.log('Referanssız:', data.referanssiz.referans_sayisi);

// Yaz
const output = 'export const SECIM_DATA = ' + JSON.stringify(data) + ';\n';
fs.writeFileSync(path.join(__dirname, '../app/data.js'), output);
console.log('data.js güncellendi!');
