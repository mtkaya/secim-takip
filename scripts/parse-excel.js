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

// ROLLER - her referans sorumlusunun kendi kişi listesi (tüm referans bilgisiyle)
const roller = referansSorumlulari.map(refAd => {
  const refKisileri = kisiler.filter(k => k.referanslar.includes(refAd));
  return {
    ad: refAd,
    referans_sayisi: refKisileri.length,
    kisiler: refKisileri.map(k => {
      const entry = { ad: k.ad, tel: k.tel, sandik: k.sandikNo, sicil: k.sicil };
      if (k.referanslar.length > 0) entry.referanslar = k.referanslar;
      return entry;
    })
  };
});

// SANDIKLAR - sandık bazlı tüm kişiler (referans bilgisi ile)
const sandikMap = {};
kisiler.forEach(k => {
  if (!sandikMap[k.sandikNo]) sandikMap[k.sandikNo] = [];
  const entry = { ad: k.ad, tel: k.tel, sicil: k.sicil };
  if (k.referanslar.length > 0) entry.referanslar = k.referanslar;
  sandikMap[k.sandikNo].push(entry);
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

// İsim eşleştirme haritası (kullanıcı listesindeki ad -> Excel'deki referans adı)
const isimEslestirme = {
  'M. MERT ACIYAN': 'M.MERT ACIYAN',
  'MEHMET MERT ACIYAN': 'M.MERT ACIYAN',
  'ABDULKADİR ÇELEPÇİ': 'ABDULKADİR CELEPÇİ',
  'İBRAHİM TARIK ŞEN': 'İ.TARIK ŞEN',
};

// Admin listesi (referans listesindeki isimleriyle eşleştirilmiş)
const adminIsimler = ['ERDEM NALTEKİN', 'MUSTAFA ZAHİD KAYMAZ', 'M.MERT ACIYAN', 'İSMAİL HAKKI GÖKŞEN'];

// Moderatör listesi (unique, referans listesindeki isimleriyle)
const modIsimlerRaw = [
  'AHMET ÇETİNTAŞ', 'DURMUŞ KÜPELİ', 'ERDEM NALTEKİN', 'ALPARSLAN RECEP DEMİREL',
  'ABDULKADİR CELEPÇİ', 'KAZIM SİNGİL', 'ÖMER BATUHAN DENİZ', 'M.MERT ACIYAN',
  'TAHİR BEKDİK', 'İ.TARIK ŞEN', 'AHMET YAĞCI', 'BAHAR BAŞIBEYAZ',
  'GÜLBEYAZ BÜYÜKAĞAÇCI', 'YİĞİTHAN YAZGAN', 'BURAK ATCI', 'HALİL İBRAHİM BABAYİĞİT',
  'SEMİH BAŞARAN', 'MÜRSEL ADA', 'SENA ER', 'MUSTAFA KAYGISIZ',
  'İBRAHİM TOSUNLU', 'MUSTAFA ZAHİD KAYMAZ', 'MEHMET AKİF TEKİN', 'ERBİL TELCİ',
  'MELİH ÖZTÜRK', 'MUSTAFA TÜRKOĞLU', 'AHMET SEFA SELÇUK'
];
const modIsimler = [...new Set(modIsimlerRaw)];

// Telefon numarasından şifre üret (son 6 hane)
function telefonSifre(ad) {
  // Kişi listesinde bu adı bul
  const kisi = kisiler.find(k => k.ad === ad);
  if (kisi && kisi.tel) {
    const rakamlar = kisi.tel.replace(/\D/g, '');
    if (rakamlar.length >= 6) {
      return rakamlar.slice(-6);
    }
  }
  // Telefon bulunamazsa varsayılan
  return '123456';
}

// KULLANICILAR listesi
const kullanicilar = [
  { ad: 'MEHMET TUGRUL KAYA', sifre: '611561', rol: 'superadmin' },
];

// Admin kullanıcıları
adminIsimler.forEach(ad => {
  kullanicilar.push({ ad, sifre: telefonSifre(ad), rol: 'admin' });
});

// Sandık kullanıcısı
kullanicilar.push({ ad: 'SANDIKLAR', sifre: '123456', rol: 'sandiklar' });

// Rol Dışı kullanıcıları
['REFERANSLI', 'REFERANSSIZ', 'ÇAKIŞANLAR'].forEach(ad => {
  kullanicilar.push({ ad, sifre: '123456', rol: 'roldisi' });
});

// Moderatörler (admin olmayanlar)
modIsimler.forEach(ad => {
  if (!adminIsimler.includes(ad)) {
    kullanicilar.push({ ad, sifre: telefonSifre(ad), rol: 'moderator' });
  }
});

// Kalan referans sorumluları (admin veya moderatör olmayanlar)
referansSorumlulari.forEach(r => {
  const isAdmin = adminIsimler.includes(r);
  const isMod = modIsimler.includes(r);
  if (!isAdmin && !isMod) {
    kullanicilar.push({ ad: r, sifre: telefonSifre(r), rol: 'referans' });
  }
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
console.log('\nKullanıcı şifreleri (telefon son 6 hane):');
kullanicilar.forEach(k => {
  const varsayilan = k.sifre === '123456' ? ' ⚠️ VARSAYILAN' : '';
  console.log('  ' + k.ad + ' [' + k.rol + ']: ' + k.sifre + varsayilan);
});
console.log('\ndata.js dosyası oluşturuldu!');
console.log('Dosya boyutu:', (output.length / 1024).toFixed(1) + ' KB');
