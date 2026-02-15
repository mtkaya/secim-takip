/**
 * Firebase'den seçim verilerini çekip grafikli HTML rapor oluşturur.
 * Kullanım: node scripts/export-rapor.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const DB_URL = 'https://secim-takip-ea62d-default-rtdb.europe-west1.firebasedatabase.app';
const DATA_FILE = path.join(__dirname, '..', 'app', 'data.js');
const OUTPUT_HTML = path.join(__dirname, '..', 'secim-rapor.html');
const OUTPUT_JSON = path.join(__dirname, '..', 'secim-verileri.json');

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('JSON parse hatası: ' + data.substring(0, 200))); }
      });
    }).on('error', reject);
  });
}

// data.js'yi parse et (sadece kullanicilar, roller, sandiklar, referansli, referanssiz, cakisanlar)
function parseDataJS() {
  const content = fs.readFileSync(DATA_FILE, 'utf-8');
  const prefix = 'export const SECIM_DATA = ';
  const jsonStr = content.slice(prefix.length).replace(/;\s*$/, '').trim();
  return JSON.parse(jsonStr);
}

async function main() {
  console.log('📡 Firebase\'den veriler çekiliyor...');

  const [geldiData, gelemezData] = await Promise.all([
    fetchJSON(DB_URL + '/geldi.json'),
    fetchJSON(DB_URL + '/gelemez.json'),
  ]);

  console.log('✅ Geldi kayıtları:', Object.keys(geldiData || {}).length);
  console.log('✅ Gelemez kayıtları:', Object.keys(gelemezData || {}).length);

  // Ham verileri JSON olarak kaydet
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify({ geldi: geldiData, gelemez: gelemezData, exportDate: new Date().toISOString() }, null, 2), 'utf-8');
  console.log('💾 Ham veriler kaydedildi:', OUTPUT_JSON);

  console.log('📊 data.js parse ediliyor...');
  const SECIM_DATA = parseDataJS();

  const makeKey = (kisi) => (kisi.ad + '_' + (kisi.sicil || '')).replace(/[.#$\/\[\]]/g, '_');
  const geldi = geldiData || {};
  const gelemez = gelemezData || {};

  // --- REFERANS SORUMLU ANALİZİ ---
  const referansRapor = SECIM_DATA.roller.map(r => {
    const geldiSayisi = r.kisiler.filter(k => geldi[makeKey(k)]).length;
    const gelemezSayisi = r.kisiler.filter(k => gelemez[makeKey(k)]).length;
    const bekleyen = r.referans_sayisi - geldiSayisi - gelemezSayisi;
    const yuzde = r.referans_sayisi > 0 ? Math.round(geldiSayisi / r.referans_sayisi * 100) : 0;
    return { ad: r.ad, toplam: r.referans_sayisi, geldi: geldiSayisi, gelemez: gelemezSayisi, bekleyen, yuzde };
  }).sort((a, b) => b.yuzde - a.yuzde);

  // --- SANDIK ANALİZİ ---
  const sandikRapor = SECIM_DATA.sandiklar.map(s => {
    const geldiSayisi = s.kisiler.filter(k => geldi[makeKey(k)]).length;
    const gelemezSayisi = s.kisiler.filter(k => gelemez[makeKey(k)]).length;
    const bekleyen = s.referans_sayisi - geldiSayisi - gelemezSayisi;
    const yuzde = s.referans_sayisi > 0 ? Math.round(geldiSayisi / s.referans_sayisi * 100) : 0;
    return { ad: s.ad, toplam: s.referans_sayisi, geldi: geldiSayisi, gelemez: gelemezSayisi, bekleyen, yuzde };
  });

  // --- GENEL İSTATİSTİK ---
  let toplamKisi = 0, toplamGeldi = 0, toplamGelemez = 0;
  SECIM_DATA.sandiklar.forEach(s => {
    s.kisiler.forEach(k => {
      toplamKisi++;
      if (geldi[makeKey(k)]) toplamGeldi++;
      else if (gelemez[makeKey(k)]) toplamGelemez++;
    });
  });
  const toplamBekleyen = toplamKisi - toplamGeldi - toplamGelemez;
  const genelYuzde = toplamKisi > 0 ? Math.round(toplamGeldi / toplamKisi * 100) : 0;

  // --- SAAT BAZLI ANALİZ ---
  const saatDagilimi = {};
  Object.values(geldi).forEach(v => {
    if (v && v.saat) {
      const saat = v.saat.split(':')[0];
      saatDagilimi[saat] = (saatDagilimi[saat] || 0) + 1;
    }
  });

  // --- KİM İŞARETLEDİ ANALİZİ ---
  const isaretleyenler = {};
  Object.values(geldi).forEach(v => {
    if (v && v.isaretleyen) {
      isaretleyenler[v.isaretleyen] = (isaretleyenler[v.isaretleyen] || 0) + 1;
    }
  });
  Object.values(gelemez).forEach(v => {
    if (v && v.isaretleyen) {
      isaretleyenler[v.isaretleyen] = (isaretleyenler[v.isaretleyen] || 0) + 1;
    }
  });
  const isaretSirali = Object.entries(isaretleyenler).sort((a, b) => b[1] - a[1]);

  // --- REFERANSLI / REFERANSSIZ / ÇAKIŞANLAR ---
  const ozelListe = (kisiler) => {
    const t = kisiler.length;
    const g = kisiler.filter(k => geldi[makeKey(k)]).length;
    const e = kisiler.filter(k => gelemez[makeKey(k)]).length;
    return { toplam: t, geldi: g, gelemez: e, bekleyen: t - g - e, yuzde: t > 0 ? Math.round(g / t * 100) : 0 };
  };
  const referansliIstat = ozelListe(SECIM_DATA.referansli.kisiler);
  const referanssizIstat = ozelListe(SECIM_DATA.referanssiz.kisiler);
  const cakisanlarIstat = ozelListe(SECIM_DATA.cakisanlar.kisiler);

  console.log(`\n📊 GENEL SONUÇ: ${toplamGeldi}/${toplamKisi} geldi (%${genelYuzde})`);

  // --- HTML RAPOR ---
  const tarih = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Seçim Raporu - ${tarih}</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,-apple-system,sans-serif;background:#f0f2f5;color:#333;padding:20px}
.container{max-width:1200px;margin:0 auto}
h1{text-align:center;color:#e94560;margin-bottom:8px;font-size:1.8rem}
.subtitle{text-align:center;color:#999;margin-bottom:30px;font-size:0.9rem}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-bottom:24px}
.card{background:#fff;border-radius:16px;padding:24px;box-shadow:0 2px 12px rgba(0,0,0,0.06);border:1px solid #e8e8e8}
.card h2{font-size:1.1rem;color:#333;margin-bottom:16px;display:flex;align-items:center;gap:8px}
.stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
.stat{background:#fff;border-radius:12px;padding:20px;text-align:center;border:1px solid #e8e8e8;box-shadow:0 2px 8px rgba(0,0,0,0.04)}
.stat .num{font-size:2.2rem;font-weight:800;font-family:monospace}
.stat .label{color:#999;font-size:0.8rem;margin-top:4px}
.bar-row{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #f0f0f0}
.bar-row:last-child{border-bottom:none}
.bar-name{width:200px;font-size:0.85rem;font-weight:500;flex-shrink:0}
.bar-wrap{flex:1;height:24px;background:#f0f0f0;border-radius:6px;overflow:hidden;display:flex}
.bar-g{background:linear-gradient(90deg,#00c853,#00e676);height:100%;transition:width 0.5s}
.bar-e{background:linear-gradient(90deg,#ff5252,#ff1744);height:100%;transition:width 0.5s}
.bar-b{background:#ffb74d;height:100%;transition:width 0.5s}
.bar-pct{width:50px;text-align:right;font-weight:700;font-size:0.85rem;color:#2e7d32;flex-shrink:0}
.bar-detail{width:120px;font-size:0.75rem;color:#999;flex-shrink:0;text-align:right}
.chart-wrap{position:relative;max-height:350px;margin:0 auto}
table{width:100%;border-collapse:collapse;font-size:0.85rem}
th{background:#f8f9fa;padding:10px;text-align:left;font-weight:600;border-bottom:2px solid #e0e0e0}
td{padding:8px 10px;border-bottom:1px solid #f0f0f0}
tr:hover{background:#f8f9fa}
.badge{display:inline-block;padding:3px 8px;border-radius:4px;font-size:0.75rem;font-weight:600}
.badge-g{background:#e8f5e9;color:#2e7d32}
.badge-e{background:#ffebee;color:#c62828}
.badge-b{background:#fff3e0;color:#e65100}
.footer{text-align:center;color:#aaa;font-size:0.75rem;margin-top:30px;padding:20px 0}
@media(max-width:600px){.stat-grid{grid-template-columns:repeat(2,1fr)}.bar-name{width:100px}.bar-detail{display:none}}
</style>
</head>
<body>
<div class="container">
<h1>🗳️ SEÇİM SONUÇ RAPORU</h1>
<p class="subtitle">Oluşturulma: ${tarih}</p>

<!-- GENEL İSTATİSTİKLER -->
<div class="stat-grid">
<div class="stat"><div class="num" style="color:#333">${toplamKisi}</div><div class="label">Toplam Üye</div></div>
<div class="stat"><div class="num" style="color:#2e7d32">${toplamGeldi}</div><div class="label">Oy Kullanan</div></div>
<div class="stat"><div class="num" style="color:#c62828">${toplamGelemez}</div><div class="label">Gelemez</div></div>
<div class="stat"><div class="num" style="color:#e65100">${toplamBekleyen}</div><div class="label">Belirsiz</div></div>
</div>

<div class="grid">
<!-- GENEL PASTA GRAFİĞİ -->
<div class="card">
<h2>📊 Genel Katılım Oranı</h2>
<div class="chart-wrap"><canvas id="genelPasta"></canvas></div>
</div>

<!-- SAAT BAZLI GRAFİK -->
<div class="card">
<h2>🕐 Saate Göre Gelme Dağılımı</h2>
<div class="chart-wrap"><canvas id="saatGrafik"></canvas></div>
</div>
</div>

<!-- REFERANS SORUMLU PERFORMANSI -->
<div class="card" style="margin-bottom:24px">
<h2>👤 Referans Sorumlusu Performansı (Başarı Sırasına Göre)</h2>
${referansRapor.map(r => `
<div class="bar-row">
<div class="bar-name">${r.ad}</div>
<div class="bar-wrap">
<div class="bar-g" style="width:${r.toplam > 0 ? (r.geldi / r.toplam * 100) : 0}%"></div>
<div class="bar-e" style="width:${r.toplam > 0 ? (r.gelemez / r.toplam * 100) : 0}%"></div>
</div>
<div class="bar-pct">%${r.yuzde}</div>
<div class="bar-detail">${r.geldi}✅ ${r.gelemez}❌ ${r.bekleyen}⏳ / ${r.toplam}</div>
</div>`).join('')}
</div>

<!-- SANDIK BAZLI TABLO -->
<div class="card" style="margin-bottom:24px">
<h2>📦 Sandık Bazlı Sonuçlar</h2>
<div class="chart-wrap" style="max-height:400px;margin-bottom:16px"><canvas id="sandikGrafik"></canvas></div>
<table>
<thead><tr><th>Sandık</th><th>Toplam</th><th>Geldi</th><th>Gelemez</th><th>Bekleyen</th><th>Oran</th></tr></thead>
<tbody>
${sandikRapor.map(s => `<tr>
<td><b>${s.ad}</b></td>
<td>${s.toplam}</td>
<td><span class="badge badge-g">${s.geldi}</span></td>
<td><span class="badge badge-e">${s.gelemez}</span></td>
<td><span class="badge badge-b">${s.bekleyen}</span></td>
<td><b style="color:${s.yuzde >= 50 ? '#2e7d32' : '#c62828'}">%${s.yuzde}</b></td>
</tr>`).join('')}
</tbody>
</table>
</div>

<div class="grid">
<!-- ÖZEL LİSTELER -->
<div class="card">
<h2>📋 Özel Liste İstatistikleri</h2>
<table>
<thead><tr><th>Liste</th><th>Toplam</th><th>Geldi</th><th>Gelemez</th><th>Oran</th></tr></thead>
<tbody>
<tr><td>Referanslı</td><td>${referansliIstat.toplam}</td><td class="badge-g">${referansliIstat.geldi}</td><td class="badge-e">${referansliIstat.gelemez}</td><td><b>%${referansliIstat.yuzde}</b></td></tr>
<tr><td>Referanssız</td><td>${referanssizIstat.toplam}</td><td class="badge-g">${referanssizIstat.geldi}</td><td class="badge-e">${referanssizIstat.gelemez}</td><td><b>%${referanssizIstat.yuzde}</b></td></tr>
<tr><td>Çakışanlar</td><td>${cakisanlarIstat.toplam}</td><td class="badge-g">${cakisanlarIstat.geldi}</td><td class="badge-e">${cakisanlarIstat.gelemez}</td><td><b>%${cakisanlarIstat.yuzde}</b></td></tr>
</tbody>
</table>
</div>

<!-- EN AKTİF KULLANICILAR -->
<div class="card">
<h2>🏆 En Aktif Kullanıcılar (İşaretleme)</h2>
<table>
<thead><tr><th>#</th><th>Kullanıcı</th><th>İşaretleme</th></tr></thead>
<tbody>
${isaretSirali.slice(0, 15).map(([ad, sayi], i) => `<tr><td>${i + 1}</td><td>${ad}</td><td><b>${sayi}</b></td></tr>`).join('')}
</tbody>
</table>
</div>
</div>

</div>

<div class="footer">
2026 BİZİMODA Seçim Takip Sistemi — <a href="https://arfhause.com" style="color:#e94560;text-decoration:none">Arfhause</a>
</div>

<script>
// Genel Pasta
new Chart(document.getElementById('genelPasta'),{
type:'doughnut',
data:{
labels:['Oy Kullanan (${toplamGeldi})','Gelemez (${toplamGelemez})','Belirsiz (${toplamBekleyen})'],
datasets:[{data:[${toplamGeldi},${toplamGelemez},${toplamBekleyen}],backgroundColor:['#00c853','#ff5252','#ffb74d'],borderWidth:2,borderColor:'#fff'}]
},
options:{responsive:true,plugins:{legend:{position:'bottom',labels:{font:{size:13}}},title:{display:true,text:'Genel Katılım: %${genelYuzde}',font:{size:18,weight:'bold'},color:'#333'}}}
});

// Saat Dağılımı
const saatler = ${JSON.stringify(Object.keys(saatDagilimi).sort())};
const saatVeriler = saatler.map(s => ${JSON.stringify(saatDagilimi)}[s] || 0);
new Chart(document.getElementById('saatGrafik'),{
type:'bar',
data:{
labels:saatler.map(s => s + ':00'),
datasets:[{label:'Geldi',data:saatVeriler,backgroundColor:'rgba(0,200,83,0.7)',borderRadius:6}]
},
options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,title:{display:true,text:'Kişi Sayısı'}},x:{title:{display:true,text:'Saat'}}}}
});

// Sandık Grafiği
new Chart(document.getElementById('sandikGrafik'),{
type:'bar',
data:{
labels:${JSON.stringify(sandikRapor.map(s => s.ad))},
datasets:[
{label:'Geldi',data:${JSON.stringify(sandikRapor.map(s => s.geldi))},backgroundColor:'rgba(0,200,83,0.7)',borderRadius:4},
{label:'Gelemez',data:${JSON.stringify(sandikRapor.map(s => s.gelemez))},backgroundColor:'rgba(255,82,82,0.7)',borderRadius:4},
{label:'Bekleyen',data:${JSON.stringify(sandikRapor.map(s => s.bekleyen))},backgroundColor:'rgba(255,183,77,0.7)',borderRadius:4}
]
},
options:{responsive:true,plugins:{legend:{position:'top'}},scales:{x:{stacked:true},y:{stacked:true,beginAtZero:true}}}
});
</script>
</body>
</html>`;

  fs.writeFileSync(OUTPUT_HTML, html, 'utf-8');
  console.log(`\n🎉 Rapor oluşturuldu: ${OUTPUT_HTML}`);
  console.log(`📊 Genel: ${toplamGeldi}/${toplamKisi} geldi (%${genelYuzde}), ${toplamGelemez} gelemez, ${toplamBekleyen} belirsiz`);
}

main().catch(err => { console.error('HATA:', err); process.exit(1); });
