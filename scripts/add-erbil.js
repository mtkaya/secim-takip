const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const REF_AD = 'ERBİL TELCİ';

// Excel oku - tüm satırlar referans
const wb = XLSX.readFile('/Users/tugrulkaya/Downloads/EKLENECEK ERBİL TELCİ.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, {header:1});

// Sicil numaralarını al (sütun 2 = SİCİL NO)
const yeniSiciller = new Set();
rows.slice(1).forEach(row => {
  if (row[2]) yeniSiciller.add(row[2]);
});
console.log(REF_AD + ': ' + yeniSiciller.size + ' kişi Excel\'den');

// data.js oku
const content = fs.readFileSync(path.join(__dirname, '../app/data.js'), 'utf8');
const dataStr = content.replace('export const SECIM_DATA = ', '').replace(/;\s*$/, '');
const data = JSON.parse(dataStr);

// Mevcut ERBİL TELCİ rolü var mı?
const mevcutRol = data.roller.find(r => r.ad === REF_AD);
const eskiSiciller = new Set();
if (mevcutRol) {
  mevcutRol.kisiler.forEach(k => eskiSiciller.add(k.sicil));
  console.log('Mevcut: ' + mevcutRol.referans_sayisi + ' kişi');
} else {
  console.log('Mevcut rol YOK - yeni oluşturulacak');
}

// Tüm kişileri sandıklardan al
const tumKisiler = [];
data.sandiklar.forEach(s => s.kisiler.forEach(k => tumKisiler.push(k)));

// Eşleştir
const yeniKisiler = [];
let bulunamayan = 0;
yeniSiciller.forEach(sicil => {
  const kisi = tumKisiler.find(k => k.sicil === sicil);
  if (kisi) yeniKisiler.push(kisi);
  else bulunamayan++;
});
console.log('Eşleşen: ' + yeniKisiler.length + ', Bulunamayan: ' + bulunamayan);

// Eski referanslardan temizle
function temizle(kisiler) {
  kisiler.forEach(k => {
    if (eskiSiciller.has(k.sicil) && !yeniSiciller.has(k.sicil)) {
      if (k.referanslar && k.referanslar.includes(REF_AD)) {
        k.referanslar = k.referanslar.filter(ref => ref !== REF_AD);
      }
    }
  });
}
if (mevcutRol) {
  data.roller.forEach(r => temizle(r.kisiler));
  data.sandiklar.forEach(s => temizle(s.kisiler));
  temizle(data.referansli.kisiler);
  temizle(data.referanssiz.kisiler);
}

// Rolü oluştur/güncelle
const rolObj = {
  ad: REF_AD,
  referans_sayisi: yeniKisiler.length,
  kisiler: yeniKisiler.map(k => {
    const entry = { ad: k.ad, tel: k.tel, sicil: k.sicil };
    const mevcutRef = k.referanslar ? [...k.referanslar] : [];
    if (!mevcutRef.includes(REF_AD)) mevcutRef.push(REF_AD);
    entry.referanslar = mevcutRef;
    return entry;
  })
};

if (mevcutRol) {
  const idx = data.roller.findIndex(r => r.ad === REF_AD);
  data.roller[idx] = rolObj;
} else {
  data.roller.push(rolObj);
}

// Tüm yerlerdeki kişilere referans ekle
function refEkle(kisiler) {
  kisiler.forEach(k => {
    if (yeniSiciller.has(k.sicil)) {
      if (!k.referanslar) k.referanslar = [];
      if (!k.referanslar.includes(REF_AD)) k.referanslar.push(REF_AD);
    }
  });
}
data.roller.forEach(r => refEkle(r.kisiler));
data.sandiklar.forEach(s => refEkle(s.kisiler));
refEkle(data.referansli.kisiler);

// Referanssız güncelle
data.referanssiz.kisiler = data.referanssiz.kisiler.filter(k => !yeniSiciller.has(k.sicil));
data.referanssiz.referans_sayisi = data.referanssiz.kisiler.length;

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

console.log('Yeni kişi sayısı: ' + rolObj.referans_sayisi);
console.log('Çakışanlar: ' + data.cakisanlar.referans_sayisi);
console.log('Referanssız: ' + data.referanssiz.referans_sayisi);
console.log('Toplam roller: ' + data.roller.length);

// Yaz
const output = 'export const SECIM_DATA = ' + JSON.stringify(data) + ';\n';
fs.writeFileSync(path.join(__dirname, '../app/data.js'), output);
console.log('data.js güncellendi!');
