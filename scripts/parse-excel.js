const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const wb = XLSX.readFile(path.join(__dirname, '..', '..', 'UYGULAMA İÇİN REFERANS LİSTESİ.xlsx'));
const ws = wb.Sheets['v3'];
const data = XLSX.utils.sheet_to_json(ws, {header:1});
const header = data[0];
const refNames = header.slice(5);
const refSutunIdx = refNames.indexOf('REFERANSLI');

// Tüm kişileri parse et
const kisiler = data.slice(1).map(row => {
  const sandikRaw = (row[1] || '').toString().trim();
  const sandikMatch = sandikRaw.match(/(\d+)/);
  const sandikNo = sandikMatch ? parseInt(sandikMatch[1]) : 0;
  const tel = (row[4] || '').toString().trim();

  const atananRefler = [];
  refNames.forEach((r, ri) => {
    if (r === 'REFERANSLI') return;
    if (row[5 + ri] && row[5 + ri].toString().trim() === '+') {
      if (r.startsWith('KARAMAN')) {
        if (!atananRefler.includes('KARAMAN LİSTE')) atananRefler.push('KARAMAN LİSTE');
      } else {
        atananRefler.push(r);
      }
    }
  });

  const isReferansli = refSutunIdx >= 0 && row[5 + refSutunIdx] && row[5 + refSutunIdx].toString().trim() === '+';

  return {
    sira: row[0],
    sandikNo,
    sicil: row[2],
    ad: (row[3] || '').toString().trim(),
    tel,
    referanslar: atananRefler,
    isReferansli,
    isReferanssiz: atananRefler.length === 0 && !isReferansli
  };
});

// Referans sorumluları listesi (unique, KARAMAN kısaltılmış, REFERANSLI hariç)
const referansSorumlulari = [];
const seen = new Set();
refNames.forEach(r => {
  if (r === 'REFERANSLI') return;
  let ad = r;
  if (r.startsWith('KARAMAN')) ad = 'KARAMAN LİSTE';
  if (seen.has(ad)) return;
  seen.add(ad);
  referansSorumlulari.push(ad);
});

// ROLLER - her referans sorumlusunun kendi kişi listesi
const roller = referansSorumlulari.map(refAd => {
  const refKisileri = kisiler.filter(k => k.referanslar.includes(refAd));
  return {
    ad: refAd,
    referans_sayisi: refKisileri.length,
    kisiler: refKisileri.map(k => ({
      ad: k.ad,
      tel: k.tel,
      sandik: k.sandikNo,
      sicil: k.sicil
    }))
  };
});

// SANDIKLAR - sandık bazlı tüm kişiler
const sandikMap = {};
kisiler.forEach(k => {
  if (!sandikMap[k.sandikNo]) sandikMap[k.sandikNo] = [];
  sandikMap[k.sandikNo].push({
    ad: k.ad,
    tel: k.tel,
    sicil: k.sicil
  });
});
const sandikRoller = Object.keys(sandikMap).sort((a, b) => a - b).map(no => ({
  ad: 'SANDIK ' + no,
  referans_sayisi: sandikMap[no].length,
  kisiler: sandikMap[no]
}));

// REFERANSLI - çoklu referansa atanmış kişiler
const referansliKisiler = kisiler.filter(k => k.isReferansli);
const referansliRol = {
  ad: 'REFERANSLI',
  referans_sayisi: referansliKisiler.length,
  kisiler: referansliKisiler.map(k => ({
    ad: k.ad,
    tel: k.tel,
    sandik: k.sandikNo,
    sicil: k.sicil,
    referanslar: k.referanslar
  }))
};

// REFERANSSIZ - hiç atanmamış kişiler (havuz + sandıkta görünsün)
const referanssizKisiler = kisiler.filter(k => k.isReferanssiz);
const referanssizRol = {
  ad: 'REFERANSSIZ',
  referans_sayisi: referanssizKisiler.length,
  kisiler: referanssizKisiler.map(k => ({
    ad: k.ad,
    tel: k.tel,
    sandik: k.sandikNo,
    sicil: k.sicil
  }))
};

// ÇAKIŞANLAR
const cakisanlar = kisiler.filter(k => k.referanslar.length > 1);
const cakisanRol = {
  ad: 'ÇAKIŞANLAR',
  referans_sayisi: cakisanlar.length,
  kisiler: cakisanlar.map(k => ({
    ad: k.ad,
    tel: k.tel,
    sandik: k.sandikNo,
    sicil: k.sicil,
    referanslar: k.referanslar
  }))
};

// KULLANICILAR listesi
const kullanicilar = [
  { ad: 'SÜPER ADMİN', sifre: '1234', rol: 'superadmin' },
  { ad: 'ADMİN', sifre: '1234', rol: 'admin' },
  { ad: 'MODERATÖR', sifre: '1234', rol: 'moderator' },
  { ad: 'SANDIKLAR', sifre: '1234', rol: 'moderator' },
  { ad: 'REFERANSLI', sifre: '1234', rol: 'moderator' },
  { ad: 'REFERANSSIZ', sifre: '1234', rol: 'moderator' },
  { ad: 'ÇAKIŞANLAR', sifre: '1234', rol: 'moderator' },
];
// Her referans sorumlusu da kullanıcı
referansSorumlulari.forEach(r => {
  kullanicilar.push({ ad: r, sifre: '1234', rol: 'referans' });
});

// SECIM_DATA oluştur
const SECIM_DATA = {
  roller: roller,
  sandiklar: sandikRoller,
  referansli: referansliRol,
  referanssiz: referanssizRol,
  cakisanlar: cakisanRol,
  kullanicilar: kullanicilar
};

// data.js dosyasına yaz
const output = 'export const SECIM_DATA = ' + JSON.stringify(SECIM_DATA) + ';\n';
fs.writeFileSync(path.join(__dirname, '..', 'app', 'data.js'), output);

console.log('=== VERİ ÖZETİ ===');
console.log('Referans sorumlusu:', referansSorumlulari.length);
console.log('Toplam kişi:', kisiler.length);
console.log('Sandık sayısı:', sandikRoller.length);
console.log('Referanslı:', referansliKisiler.length);
console.log('Referanssız:', referanssizKisiler.length);
console.log('Çakışan:', cakisanlar.length);
console.log('Kullanıcı:', kullanicilar.length);
console.log('\nReferans sorumlulari:');
roller.forEach(r => console.log('  ' + r.ad + ': ' + r.referans_sayisi + ' kişi'));
console.log('\nSandıklar:');
sandikRoller.forEach(s => console.log('  ' + s.ad + ': ' + s.referans_sayisi + ' kişi'));
console.log('\ndata.js dosyası oluşturuldu!');
console.log('Dosya boyutu:', (output.length / 1024).toFixed(1) + ' KB');
