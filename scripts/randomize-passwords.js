/**
 * Kullanıcı şifrelerini rastgele 6 haneli şifrelerle günceller.
 * Superadmin (ARFHAUSE) hariç tüm kullanıcılar güncellenir.
 *
 * Çıktı:
 *   1. data.js dosyasındaki şifreleri günceller
 *   2. "sifre-listesi.txt" dosyasını oluşturur
 *
 * Kullanım: node scripts/randomize-passwords.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_FILE = path.join(__dirname, '..', 'app', 'data.js');
const OUTPUT_FILE = path.join(__dirname, '..', 'sifre-listesi.txt');

function generatePassword() {
  return crypto.randomInt(100000, 999999).toString();
}

// data.js'yi string olarak oku
let content = fs.readFileSync(DATA_FILE, 'utf-8');

// "kullanicilar" dizisini bul - regex ile her kullanıcıyı işle
// Gerçek format: {"ad":"İSİM","sifre":"123456","rol":"admin"}
const kullaniciRegex = /\{"ad":"([^"]+)","sifre":"([^"]+)","rol":"([^"]+)"\}/g;

const degisiklikler = [];
let atlanan = 0;

const yeniContent = content.replace(kullaniciRegex, (match, ad, eskiSifre, rol) => {
  if (rol === 'superadmin') {
    atlanan++;
    console.log(`⭐ ATLANDI (superadmin): ${ad}`);
    return match; // Değiştirme
  }

  const yeniSifre = generatePassword();
  degisiklikler.push({ ad, rol, eskiSifre, yeniSifre });
  return `{"ad":"${ad}","sifre":"${yeniSifre}","rol":"${rol}"}`;
});

if (degisiklikler.length === 0) {
  console.error('HATA: Hiç kullanıcı bulunamadı! data.js formatını kontrol edin.');
  process.exit(1);
}

// data.js'yi güncelle
fs.writeFileSync(DATA_FILE, yeniContent, 'utf-8');

// Şifre listesi dosyasını oluştur
const tarih = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });
let listeTxt = `SEÇİM TAKİP SİSTEMİ - YENİ ŞİFRELER\n`;
listeTxt += `Oluşturulma: ${tarih}\n`;
listeTxt += `${'='.repeat(60)}\n\n`;

// Rol bazlı grupla
const roller = {};
degisiklikler.forEach(d => {
  if (!roller[d.rol]) roller[d.rol] = [];
  roller[d.rol].push(d);
});

const rolSirasi = ['admin', 'moderator', 'referans', 'sandiklar', 'roldisi'];
const rolBasliklari = {
  admin: 'ADMİNLER',
  moderator: 'MODERATÖRLER',
  referans: 'REFERANS SORUMLULARI',
  sandiklar: 'SANDIKLAR',
  roldisi: 'DİĞER'
};

rolSirasi.forEach(rol => {
  if (!roller[rol]) return;
  listeTxt += `--- ${rolBasliklari[rol] || rol.toUpperCase()} ---\n`;
  roller[rol]
    .sort((a, b) => a.ad.localeCompare(b.ad, 'tr'))
    .forEach(d => {
      listeTxt += `${d.ad.padEnd(35)} Şifre: ${d.yeniSifre}\n`;
    });
  listeTxt += `\n`;
});

listeTxt += `${'='.repeat(60)}\n`;
listeTxt += `Toplam güncellenen: ${degisiklikler.length} kullanıcı\n`;
listeTxt += `Atlanan (superadmin): ${atlanan}\n`;

fs.writeFileSync(OUTPUT_FILE, listeTxt, 'utf-8');

// Konsol özeti
console.log(`\n✅ ${degisiklikler.length} kullanıcının şifresi güncellendi`);
console.log(`⭐ ${atlanan} superadmin atlandı`);
console.log(`📄 Şifre listesi: ${OUTPUT_FILE}`);
console.log(`💾 data.js güncellendi`);
