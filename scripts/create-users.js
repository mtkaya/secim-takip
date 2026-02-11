/**
 * Seçim Takip Sistemi - Kullanıcı Oluşturma Scripti
 *
 * Bu script Firebase Authentication'da kullanıcı hesapları oluşturur
 * ve Realtime Database'e rol bilgilerini yazar.
 *
 * Kullanım:
 * 1. Firebase Console > Project Settings > Service Accounts > Generate New Private Key
 * 2. İndirilen dosyayı bu klasöre "serviceAccountKey.json" olarak kaydedin
 * 3. npm install firebase-admin
 * 4. node scripts/create-users.js
 *
 * NOT: Bu script sadece bir kez çalıştırılmalıdır.
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://secim-takip-ea62d-default-rtdb.europe-west1.firebasedatabase.app"
});

const users = [
  // Adminler
  { email: "abdulkadir.celepci@secim.app", password: "Secim2026!", displayName: "ABDULKADİR CELEPÇİ", role: "admin" },
  { email: "erdem.naltekin@secim.app", password: "Secim2026!", displayName: "ERDEM NALTEKİN", role: "admin" },

  // Moderatörler
  { email: "alparslan.demirel@secim.app", password: "Secim2026!", displayName: "ALPARSLAN RECEP DEMİREL", role: "moderator" },
  { email: "kazim.singil@secim.app", password: "Secim2026!", displayName: "KAZIM SİNGİL", role: "moderator" },
  { email: "tahir.bekdik@secim.app", password: "Secim2026!", displayName: "TAHİR BEKDİK", role: "moderator" },
  { email: "mert.aciyan@secim.app", password: "Secim2026!", displayName: "M.MERT ACIYAN", role: "moderator" },
  { email: "omer.deniz@secim.app", password: "Secim2026!", displayName: "ÖMER BATUHAN DENİZ", role: "moderator" },
  { email: "tarik.sen@secim.app", password: "Secim2026!", displayName: "İ.TARIK ŞEN", role: "moderator" },

  // Referans Sorumluları
  { email: "mustafa.kaygisiz@secim.app", password: "Secim2026!", displayName: "MUSTAFA KAYGISIZ", role: "referans" },
  { email: "yigithan.yazgan@secim.app", password: "Secim2026!", displayName: "YİĞİTHAN YAZGAN", role: "referans" },
  { email: "naltekin@secim.app", password: "Secim2026!", displayName: "NALTEKİN", role: "referans" },
  { email: "durmus.kupeli@secim.app", password: "Secim2026!", displayName: "DURMUŞ KÜPELİ", role: "referans" },
  { email: "rasit.karatas@secim.app", password: "Secim2026!", displayName: "RAŞİT KARATAŞ", role: "referans" },
  { email: "mehmet.tekin@secim.app", password: "Secim2026!", displayName: "MEHMET AKİF TEKİN", role: "referans" },
  { email: "mustafa.kaymaz@secim.app", password: "Secim2026!", displayName: "MUSTAFA ZAHİD KAYMAZ", role: "referans" },
  { email: "melih.ozturk@secim.app", password: "Secim2026!", displayName: "MELiH ÖZTÜRK", role: "referans" },
  { email: "ibrahim.tosunlu@secim.app", password: "Secim2026!", displayName: "İBRAHİM TOSUNLU", role: "referans" },
  { email: "ahmet.yagci@secim.app", password: "Secim2026!", displayName: "AHMET YAĞCI", role: "referans" },
  { email: "naciye.karanlik@secim.app", password: "Secim2026!", displayName: "NACİYE EZGİ KARANLIK", role: "referans" },
  { email: "durmus.yagci@secim.app", password: "Secim2026!", displayName: "DURMUŞ YAĞCI", role: "referans" },
  { email: "ali.aker@secim.app", password: "Secim2026!", displayName: "ALİ OSMAN AKER", role: "referans" },
  { email: "bulent.soyhan@secim.app", password: "Secim2026!", displayName: "BÜLENT SOYHAN", role: "referans" },
  { email: "ozgur.yilmaz@secim.app", password: "Secim2026!", displayName: "ÖZGÜR YILMAZ", role: "referans" },
  { email: "hasan.ulutas@secim.app", password: "Secim2026!", displayName: "HASAN ULUTAŞ", role: "referans" },
  { email: "ikbal.ozkan@secim.app", password: "Secim2026!", displayName: "İKBAL ÖZKAN", role: "referans" },
  { email: "eyup.ertugrul@secim.app", password: "Secim2026!", displayName: "EYÜP ERTUĞRUL", role: "referans" },
  { email: "alperen.yoldas@secim.app", password: "Secim2026!", displayName: "ALPEREN YOLDAŞ", role: "referans" },
  { email: "emre.yavuz@secim.app", password: "Secim2026!", displayName: "EMRE YAVUZ", role: "referans" },
  { email: "seyit.acar@secim.app", password: "Secim2026!", displayName: "SEYİT ACAR", role: "referans" },
  { email: "kaan.karakaya@secim.app", password: "Secim2026!", displayName: "KAAN KARAKAYA", role: "referans" },
  { email: "berkan.unal@secim.app", password: "Secim2026!", displayName: "BERKAN ÜNAL", role: "referans" },
  { email: "ali.caglar@secim.app", password: "Secim2026!", displayName: "ALİ ANDAÇ ÇAĞLAR", role: "referans" },
];

async function createUsers() {
  console.log(`\n🗳️  Seçim Takip - ${users.length} kullanıcı oluşturuluyor...\n`);

  let basarili = 0;
  let hatali = 0;

  for (const u of users) {
    try {
      // Firebase Auth'da kullanıcı oluştur
      const userRecord = await admin.auth().createUser({
        email: u.email,
        password: u.password,
        displayName: u.displayName,
      });

      // Realtime Database'e rol bilgisini yaz
      await admin.database().ref(`users/${userRecord.uid}`).set({
        ad: u.displayName,
        role: u.role,
      });

      console.log(`✅ ${u.displayName} (${u.role}) -> ${u.email} [UID: ${userRecord.uid}]`);
      basarili++;
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        // Kullanıcı zaten var, rolünü güncelle
        try {
          const existingUser = await admin.auth().getUserByEmail(u.email);
          await admin.database().ref(`users/${existingUser.uid}`).set({
            ad: u.displayName,
            role: u.role,
          });
          console.log(`⚠️  ${u.displayName} zaten mevcut, rolü güncellendi [UID: ${existingUser.uid}]`);
          basarili++;
        } catch (updateErr) {
          console.error(`❌ ${u.displayName}: ${updateErr.message}`);
          hatali++;
        }
      } else {
        console.error(`❌ ${u.displayName}: ${error.message}`);
        hatali++;
      }
    }
  }

  console.log(`\n📊 Sonuç: ${basarili} başarılı, ${hatali} hatalı`);
  console.log('\n📋 Kullanıcılara dağıtılacak bilgiler:');
  console.log('─'.repeat(60));
  users.forEach(u => {
    console.log(`${u.displayName.padEnd(30)} | ${u.email.padEnd(35)} | ${u.password}`);
  });
  console.log('─'.repeat(60));

  process.exit(0);
}

createUsers().catch(console.error);
