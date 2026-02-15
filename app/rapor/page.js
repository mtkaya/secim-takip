"use client";
import { useEffect, useRef } from 'react';
import raporData from './rapor-data.json';

const BizimOdaLogo = ({ size = "normal" }) => {
  const fs = size === "large" ? 32 : 18;
  return (
    <span style={{fontFamily:'system-ui,-apple-system,sans-serif',fontWeight:800,fontSize:fs,letterSpacing:'1px',userSelect:'none'}}>
      <span style={{color:'#1a1a1a'}}>B</span><span style={{color:'#1a1a1a'}}>İ</span><span style={{color:'#1a1a1a'}}>Z</span>
      <span style={{color:'#e94560'}}>İ</span><span style={{color:'#e94560'}}>M</span><span style={{color:'#e94560'}}>O</span>
      <span style={{color:'#1a1a1a'}}>D</span><span style={{color:'#1a1a1a'}}>A</span>
    </span>
  );
};

function DonutChart({ geldi, gelemez, bekleyen, toplam, yuzde, size = 120 }) {
  const r = size * 0.38, cx = size / 2, cy = size / 2, c = 2 * Math.PI * r, sw = size * 0.14;
  const pG = toplam > 0 ? geldi / toplam : 0;
  const pE = toplam > 0 ? gelemez / toplam : 0;
  const pB = toplam > 0 ? bekleyen / toplam : 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e8e8e8" strokeWidth={sw}/>
      {pB > 0 && <circle cx={cx} cy={cy} r={r} fill="none" stroke="#ffb74d" strokeWidth={sw} strokeDasharray={`${pB*c} ${c}`} strokeDashoffset={-(pG+pE)*c} transform={`rotate(-90 ${cx} ${cy})`}/>}
      {pE > 0 && <circle cx={cx} cy={cy} r={r} fill="none" stroke="#ff5252" strokeWidth={sw} strokeDasharray={`${pE*c} ${c}`} strokeDashoffset={-pG*c} transform={`rotate(-90 ${cx} ${cy})`}/>}
      {pG > 0 && <circle cx={cx} cy={cy} r={r} fill="none" stroke="#00c853" strokeWidth={sw} strokeDasharray={`${pG*c} ${c}`} strokeDashoffset={0} transform={`rotate(-90 ${cx} ${cy})`}/>}
      <text x={cx} y={cy-2} textAnchor="middle" fontSize={size*0.2} fontWeight="800" fill="#333">%{yuzde}</text>
      <text x={cx} y={cy+size*0.1} textAnchor="middle" fontSize={size*0.065} fill="#999">KATILIM</text>
    </svg>
  );
}

function BarChart({ canvasId, type, data, options }) {
  const ref = useRef(null);
  useEffect(() => {
    let chart;
    const loadChart = async () => {
      const { Chart, registerables } = await import('chart.js');
      Chart.register(...registerables);
      if (ref.current) {
        chart = new Chart(ref.current, { type, data, options });
      }
    };
    loadChart();
    return () => { if (chart) chart.destroy(); };
  }, []);
  return <canvas ref={ref} id={canvasId}></canvas>;
}

export default function RaporPage() {
  const d = raporData;
  const g = d.genel;

  const saatLabels = Object.keys(d.saatDagilimi).sort();
  const saatValues = saatLabels.map(s => d.saatDagilimi[s]);

  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#f0f2f5 0%,#e8edf2 50%,#dce3ea 100%)',fontFamily:'system-ui,-apple-system,sans-serif',padding:'20px'}}>
      <style>{`
        *{box-sizing:border-box}
        .container{max-width:1000px;margin:0 auto}
        .card{background:#fff;border-radius:16px;padding:24px;box-shadow:0 2px 12px rgba(0,0,0,0.06);border:1px solid #e8e8e8;margin-bottom:20px}
        .stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}
        .stat{background:#fff;border-radius:12px;padding:20px;text-align:center;border:1px solid #e8e8e8;box-shadow:0 2px 8px rgba(0,0,0,0.04)}
        .stat .num{font-size:2rem;font-weight:800;font-family:monospace}
        .stat .label{color:#999;font-size:0.8rem;margin-top:4px}
        .grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px}
        .bar-row{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #f5f5f5}
        .bar-row:last-child{border-bottom:none}
        .bar-name{width:180px;font-size:0.8rem;font-weight:500;flex-shrink:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .bar-wrap{flex:1;height:22px;background:#f0f0f0;border-radius:6px;overflow:hidden;display:flex}
        .bar-g{background:linear-gradient(90deg,#00c853,#00e676);height:100%}
        .bar-e{background:linear-gradient(90deg,#ff5252,#ff1744);height:100%}
        .bar-pct{width:45px;text-align:right;font-weight:700;font-size:0.85rem;color:#2e7d32;flex-shrink:0}
        .bar-detail{width:130px;font-size:0.7rem;color:#999;flex-shrink:0;text-align:right}
        table{width:100%;border-collapse:collapse;font-size:0.85rem}
        th{background:#f8f9fa;padding:10px;text-align:left;font-weight:600;border-bottom:2px solid #e0e0e0}
        td{padding:8px 10px;border-bottom:1px solid #f0f0f0}
        tr:hover{background:#f8f9fa}
        .badge{display:inline-block;padding:3px 8px;border-radius:4px;font-size:0.75rem;font-weight:600}
        .bg{background:#e8f5e9;color:#2e7d32}.be{background:#ffebee;color:#c62828}.bb{background:#fff3e0;color:#e65100}
        .legend{display:flex;gap:16px;justify-content:center;margin:12px 0;flex-wrap:wrap}
        .legend-item{display:flex;align-items:center;gap:6px;font-size:0.8rem;color:#666}
        .legend-dot{width:12px;height:12px;border-radius:3px}
        @media(max-width:700px){.stat-grid{grid-template-columns:repeat(2,1fr)}.grid2{grid-template-columns:1fr}.bar-name{width:120px}.bar-detail{display:none}}
      `}</style>

      <div className="container">
        {/* HEADER */}
        <div style={{textAlign:'center',marginBottom:'24px'}}>
          <BizimOdaLogo size="large" />
          <h1 style={{color:'#e94560',margin:'8px 0 4px',fontSize:'1.6rem'}}>🗳️ SEÇİM SONUÇ RAPORU</h1>
          <p style={{color:'#999',fontSize:'0.85rem'}}>{d.tarih}</p>
        </div>

        {/* GENEL İSTATİSTİKLER */}
        <div className="stat-grid">
          <div className="stat"><div className="num" style={{color:'#333'}}>{g.toplamKisi}</div><div className="label">Toplam Üye</div></div>
          <div className="stat"><div className="num" style={{color:'#2e7d32'}}>{g.toplamGeldi}</div><div className="label">Oy Kullanan</div></div>
          <div className="stat"><div className="num" style={{color:'#c62828'}}>{g.toplamGelemez}</div><div className="label">Gelemez</div></div>
          <div className="stat"><div className="num" style={{color:'#e65100'}}>{g.toplamBekleyen}</div><div className="label">Belirsiz</div></div>
        </div>

        <div className="grid2">
          {/* DONUT */}
          <div className="card" style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
            <h2 style={{fontSize:'1rem',color:'#333',marginBottom:'12px'}}>📊 Genel Katılım Oranı</h2>
            <DonutChart geldi={g.toplamGeldi} gelemez={g.toplamGelemez} bekleyen={g.toplamBekleyen} toplam={g.toplamKisi} yuzde={g.yuzde} size={180} />
            <div className="legend" style={{marginTop:'12px'}}>
              <div className="legend-item"><div className="legend-dot" style={{background:'#00c853'}}/> Geldi ({g.toplamGeldi})</div>
              <div className="legend-item"><div className="legend-dot" style={{background:'#ff5252'}}/> Gelemez ({g.toplamGelemez})</div>
              <div className="legend-item"><div className="legend-dot" style={{background:'#ffb74d'}}/> Belirsiz ({g.toplamBekleyen})</div>
            </div>
          </div>

          {/* SAAT GRAFİĞİ */}
          <div className="card">
            <h2 style={{fontSize:'1rem',color:'#333',marginBottom:'12px'}}>🕐 Saate Göre Gelme Dağılımı</h2>
            <BarChart canvasId="saatChart" type="bar" data={{
              labels: saatLabels.map(s => s + ':00'),
              datasets: [{ label: 'Geldi', data: saatValues, backgroundColor: 'rgba(0,200,83,0.7)', borderRadius: 6 }]
            }} options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, title: { display: true, text: 'Kişi' } }, x: { title: { display: true, text: 'Saat' } } } }} />
          </div>
        </div>

        {/* REFERANS SORUMLU PERFORMANSI */}
        <div className="card">
          <h2 style={{fontSize:'1rem',color:'#333',marginBottom:'16px'}}>👤 Referans Sorumlusu Performansı</h2>
          <div className="legend">
            <div className="legend-item"><div className="legend-dot" style={{background:'#00c853'}}/> Geldi</div>
            <div className="legend-item"><div className="legend-dot" style={{background:'#ff5252'}}/> Gelemez</div>
            <div className="legend-item"><div className="legend-dot" style={{background:'#f0f0f0',border:'1px solid #ddd'}}/> Bekleyen</div>
          </div>
          {d.referansRapor.map((r, i) => (
            <div className="bar-row" key={i}>
              <div className="bar-name">{r.ad}</div>
              <div className="bar-wrap">
                <div className="bar-g" style={{width: r.toplam > 0 ? (r.geldi / r.toplam * 100) + '%' : '0%'}}></div>
                <div className="bar-e" style={{width: r.toplam > 0 ? (r.gelemez / r.toplam * 100) + '%' : '0%'}}></div>
              </div>
              <div className="bar-pct">%{r.yuzde}</div>
              <div className="bar-detail">{r.geldi}✅ {r.gelemez}❌ {r.bekleyen}⏳ /{r.toplam}</div>
            </div>
          ))}
        </div>

        {/* SANDIK GRAFİĞİ + TABLO */}
        <div className="card">
          <h2 style={{fontSize:'1rem',color:'#333',marginBottom:'12px'}}>📦 Sandık Bazlı Sonuçlar</h2>
          <div style={{maxHeight:400,marginBottom:16}}>
            <BarChart canvasId="sandikChart" type="bar" data={{
              labels: d.sandikRapor.map(s => s.ad),
              datasets: [
                { label: 'Geldi', data: d.sandikRapor.map(s => s.geldi), backgroundColor: 'rgba(0,200,83,0.7)', borderRadius: 4 },
                { label: 'Gelemez', data: d.sandikRapor.map(s => s.gelemez), backgroundColor: 'rgba(255,82,82,0.7)', borderRadius: 4 },
                { label: 'Bekleyen', data: d.sandikRapor.map(s => s.bekleyen), backgroundColor: 'rgba(255,183,77,0.7)', borderRadius: 4 },
              ]
            }} options={{ responsive: true, plugins: { legend: { position: 'top' } }, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } } }} />
          </div>
          <table>
            <thead><tr><th>Sandık</th><th>Toplam</th><th>Geldi</th><th>Gelemez</th><th>Bekleyen</th><th>Oran</th></tr></thead>
            <tbody>
              {d.sandikRapor.map((s, i) => (
                <tr key={i}>
                  <td><b>{s.ad}</b></td>
                  <td>{s.toplam}</td>
                  <td><span className="badge bg">{s.geldi}</span></td>
                  <td><span className="badge be">{s.gelemez}</span></td>
                  <td><span className="badge bb">{s.bekleyen}</span></td>
                  <td><b style={{color: s.yuzde >= 50 ? '#2e7d32' : s.yuzde >= 30 ? '#e65100' : '#c62828'}}>%{s.yuzde}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid2">
          {/* ÖZEL LİSTELER */}
          <div className="card">
            <h2 style={{fontSize:'1rem',color:'#333',marginBottom:'12px'}}>📋 Özel Liste İstatistikleri</h2>
            <table>
              <thead><tr><th>Liste</th><th>Toplam</th><th>Geldi</th><th>Gelemez</th><th>Oran</th></tr></thead>
              <tbody>
                <tr><td>Referanslı</td><td>{d.referansli.toplam}</td><td><span className="badge bg">{d.referansli.geldi}</span></td><td><span className="badge be">{d.referansli.gelemez}</span></td><td><b>%{d.referansli.yuzde}</b></td></tr>
                <tr><td>Referanssız</td><td>{d.referanssiz.toplam}</td><td><span className="badge bg">{d.referanssiz.geldi}</span></td><td><span className="badge be">{d.referanssiz.gelemez}</span></td><td><b>%{d.referanssiz.yuzde}</b></td></tr>
                <tr><td>Çakışanlar</td><td>{d.cakisanlar.toplam}</td><td><span className="badge bg">{d.cakisanlar.geldi}</span></td><td><span className="badge be">{d.cakisanlar.gelemez}</span></td><td><b>%{d.cakisanlar.yuzde}</b></td></tr>
              </tbody>
            </table>
          </div>

          {/* EN AKTİF KULLANICILAR */}
          <div className="card">
            <h2 style={{fontSize:'1rem',color:'#333',marginBottom:'12px'}}>🏆 En Aktif Kullanıcılar</h2>
            <table>
              <thead><tr><th>#</th><th>Kullanıcı</th><th>İşaretleme</th></tr></thead>
              <tbody>
                {d.isaretSirali.map((u, i) => (
                  <tr key={i}>
                    <td>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</td>
                    <td>{u.ad}</td>
                    <td><b>{u.sayi}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FOOTER */}
        <div style={{textAlign:'center',padding:'20px 0',fontSize:'0.75rem',color:'#aaa'}}>
          2026 <a href="https://arfhause.com" target="_blank" rel="noopener noreferrer" style={{color:'#e94560',textDecoration:'none',fontWeight:600}}>Arfhause</a> — Seçim Takip Sistemi
        </div>
      </div>
    </div>
  );
}
