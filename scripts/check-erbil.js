const XLSX = require('xlsx');
const wb = XLSX.readFile('/Users/tugrulkaya/Downloads/EKLENECEK ERBİL TELCİ.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, {header:1});

// Son sütundaki (5) unique değerleri say
const values = {};
data.slice(1).forEach(row => {
  const v = (row[5] !== undefined && row[5] !== null) ? String(row[5]).trim() : 'BOŞ';
  values[v] = (values[v] || 0) + 1;
});
console.log('Sütun 5 (ERBİL TELCİ) değerleri:', values);

// Toplam satır (başlık hariç)
console.log('Toplam satır:', data.length - 1);

// Boş olmayanlar (referans olanlar?)
const dolu = data.slice(1).filter(row => row[5] !== undefined && row[5] !== null && String(row[5]).trim() !== '');
console.log('Dolu satır:', dolu.length);
if (dolu.length > 0) {
  console.log('İlk 10 dolu:');
  dolu.slice(0, 10).forEach(r => console.log('  ', r[3], '|', r[5]));
}

// Belki tüm 750 satır ERBİL TELCİ'nin referansları
// Başlıkta "ERBİL TELCİ" yazıyor ve dosyada 750 kişi var
console.log('\nDosya adı: EKLENECEK ERBİL TELCİ.xlsx');
console.log('Muhtemelen tüm ' + (data.length - 1) + ' kişi ERBİL TELCİ referansı');
