"use client";
import { useState, useEffect, useMemo } from 'react';
import { ref, onValue, set, remove } from 'firebase/database';
import { database } from './lib/firebase';
import { SECIM_DATA } from './data';

const KULLANICILAR = SECIM_DATA.kullanicilar;

// Türkçe karakter duyarsız arama
function turkceNormalize(str) {
  return str
    .replace(/İ/g, 'i').replace(/I/g, 'ı')
    .replace(/Ğ/g, 'ğ').replace(/Ü/g, 'ü')
    .replace(/Ş/g, 'ş').replace(/Ö/g, 'ö')
    .replace(/Ç/g, 'ç')
    .toLowerCase();
}

const BizimOdaLogo = ({ size = "normal" }) => {
  const fs = size === "large" ? 28 : 18;
  return (
    <span style={{fontFamily:'system-ui,-apple-system,sans-serif',fontWeight:800,fontSize:fs,letterSpacing:'1px',userSelect:'none'}}>
      <span style={{color:'#1a1a1a'}}>B</span>
      <span style={{color:'#1a1a1a'}}>İ</span>
      <span style={{color:'#1a1a1a'}}>Z</span>
      <span style={{color:'#e94560'}}>İ</span>
      <span style={{color:'#e94560'}}>M</span>
      <span style={{color:'#e94560'}}>O</span>
      <span style={{color:'#1a1a1a'}}>D</span>
      <span style={{color:'#1a1a1a'}}>A</span>
    </span>
  );
};

export default function SecimTakipSistemi() {
  const [girisYapildi, setGirisYapildi] = useState(false);
  const [kullaniciAdi, setKullaniciAdi] = useState('');
  const [kullaniciRolu, setKullaniciRolu] = useState('');
  const [sifre, setSifre] = useState('');
  const [girisHatasi, setGirisHatasi] = useState('');
  const [girisTipi, setGirisTipi] = useState('');
  const [girisAdi, setGirisAdi] = useState('');
  const [seciliKullanici, setSeciliKullanici] = useState('');
  const [seciliSandik, setSeciliSandik] = useState('');
  const [geldiData, setGeldiData] = useState({});
  const [gelemezData, setGelemezData] = useState({});
  const [aramaMetni, setAramaMetni] = useState('');
  const [filtre, setFiltre] = useState('hepsi');
  const [sifirlaCOnay, setSifirlaOnay] = useState(false);
  const [raporGoster, setRaporGoster] = useState(false);
  const [geriSayim, setGeriSayim] = useState({ gun: 0, saat: 0, dakika: 0, saniye: 0, bitti: false });

  useEffect(() => {
    const geldiRef = ref(database, 'geldi');
    const unsub1 = onValue(geldiRef, (snapshot) => { setGeldiData(snapshot.val() || {}); });
    const gelemezRef = ref(database, 'gelemez');
    const unsub2 = onValue(gelemezRef, (snapshot) => { setGelemezData(snapshot.val() || {}); });
    return () => { unsub1(); unsub2(); };
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('secim_oturum');
    if (saved) {
      try {
        const { ad, rol } = JSON.parse(saved);
        setKullaniciAdi(ad);
        setKullaniciRolu(rol);
        setGirisYapildi(true);
      } catch(e) { localStorage.removeItem('secim_oturum'); }
    }
  }, []);

  useEffect(() => {
    const hedef = new Date('2026-02-14T10:00:00+03:00').getTime();
    const hesapla = () => {
      const fark = hedef - Date.now();
      if (fark <= 0) { setGeriSayim({ gun: 0, saat: 0, dakika: 0, saniye: 0, bitti: true }); return; }
      setGeriSayim({
        gun: Math.floor(fark / (1000 * 60 * 60 * 24)),
        saat: Math.floor((fark % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        dakika: Math.floor((fark % (1000 * 60 * 60)) / (1000 * 60)),
        saniye: Math.floor((fark % (1000 * 60)) / 1000),
        bitti: false
      });
    };
    hesapla();
    const interval = setInterval(hesapla, 1000);
    return () => clearInterval(interval);
  }, []);

  const makeKey = (kisi) => (kisi.ad + '_' + (kisi.sicil || '')).replace(/[.#$\/\[\]]/g, '_');

  const aktifListe = useMemo(() => {
    if (!kullaniciAdi) return [];
    if (kullaniciAdi === 'SANDIKLAR') {
      if (!seciliSandik) return [];
      const sandik = SECIM_DATA.sandiklar.find(s => s.ad === seciliSandik);
      return sandik ? sandik.kisiler : [];
    }
    if (kullaniciAdi === 'REFERANSLI') return SECIM_DATA.referansli.kisiler;
    if (kullaniciAdi === 'REFERANSSIZ') return SECIM_DATA.referanssiz.kisiler;
    if (kullaniciAdi === 'ÇAKIŞANLAR') return SECIM_DATA.cakisanlar.kisiler;
    if (['superadmin', 'admin', 'moderator'].includes(kullaniciRolu)) {
      if (!seciliKullanici) return [];
      if (seciliKullanici === 'TÜM LİSTE') {
        const tumKisiler = [];
        const gorulenSicil = new Set();
        SECIM_DATA.roller.forEach(r => {
          r.kisiler.forEach(k => {
            const sid = k.sicil || k.ad;
            if (!gorulenSicil.has(sid)) { gorulenSicil.add(sid); tumKisiler.push(k); }
          });
        });
        SECIM_DATA.referanssiz.kisiler.forEach(k => {
          const sid = k.sicil || k.ad;
          if (!gorulenSicil.has(sid)) { gorulenSicil.add(sid); tumKisiler.push(k); }
        });
        return tumKisiler;
      }
      if (seciliKullanici.startsWith('SANDIK ')) {
        const sandik = SECIM_DATA.sandiklar.find(s => s.ad === seciliKullanici);
        return sandik ? sandik.kisiler : [];
      }
      if (seciliKullanici === 'REFERANSLI') return SECIM_DATA.referansli.kisiler;
      if (seciliKullanici === 'REFERANSSIZ') return SECIM_DATA.referanssiz.kisiler;
      if (seciliKullanici === 'ÇAKIŞANLAR') return SECIM_DATA.cakisanlar.kisiler;
      const rol = SECIM_DATA.roller.find(r => r.ad === seciliKullanici);
      return rol ? rol.kisiler : [];
    }
    const rol = SECIM_DATA.roller.find(r => r.ad === kullaniciAdi);
    return rol ? rol.kisiler : [];
  }, [kullaniciAdi, kullaniciRolu, seciliKullanici, seciliSandik]);

  const referansAramaOranlari = useMemo(() => {
    return SECIM_DATA.roller.map(r => {
      const aranan = r.kisiler.filter(k => geldiData[makeKey(k)]).length;
      const gelemez = r.kisiler.filter(k => gelemezData[makeKey(k)]).length;
      return { ad: r.ad, toplam: r.referans_sayisi, aranan, gelemez };
    });
  }, [geldiData, gelemezData]);

  // Kendi referans oranı (herkes için)
  const kendiOran = useMemo(() => {
    const rol = SECIM_DATA.roller.find(r => r.ad === kullaniciAdi);
    if (!rol) return null;
    const aranan = rol.kisiler.filter(k => geldiData[makeKey(k)]).length;
    const gelemez = rol.kisiler.filter(k => gelemezData[makeKey(k)]).length;
    return { toplam: rol.referans_sayisi, aranan, gelemez, yuzde: rol.referans_sayisi > 0 ? Math.round(aranan / rol.referans_sayisi * 100) : 0 };
  }, [kullaniciAdi, geldiData, gelemezData]);

  // Rapor (sadece admin)
  const raporData = useMemo(() => {
    return SECIM_DATA.roller.map(r => {
      const aranan = r.kisiler.filter(k => geldiData[makeKey(k)]).length;
      const gelemez = r.kisiler.filter(k => gelemezData[makeKey(k)]).length;
      const aranmayanlar = r.kisiler.filter(k => !geldiData[makeKey(k)] && !gelemezData[makeKey(k)]);
      return { ad: r.ad, toplam: r.referans_sayisi, aranan, gelemez, aranmayanSayisi: aranmayanlar.length, aranmayanlar };
    });
  }, [geldiData, gelemezData]);

  const filtrelenmisListe = useMemo(() => {
    let liste = aktifListe;
    if (aramaMetni) {
      const aranan = turkceNormalize(aramaMetni);
      liste = liste.filter(k => turkceNormalize(k.ad).includes(aranan) || (k.tel && k.tel.includes(aramaMetni)));
    }
    if (filtre === 'geldi') {
      liste = liste.filter(k => geldiData[makeKey(k)]);
    } else if (filtre === 'aranmayan') {
      liste = liste.filter(k => !geldiData[makeKey(k)] && !gelemezData[makeKey(k)]);
    } else if (filtre === 'gelemez') {
      liste = liste.filter(k => gelemezData[makeKey(k)]);
    }
    return liste;
  }, [aktifListe, aramaMetni, filtre, geldiData, gelemezData]);

  const istatistikler = useMemo(() => {
    const toplam = aktifListe.length;
    const geldi = aktifListe.filter(k => geldiData[makeKey(k)]).length;
    const gelemez = aktifListe.filter(k => gelemezData[makeKey(k)]).length;
    return { toplam, geldi, gelemez, bekleyen: toplam - geldi - gelemez };
  }, [aktifListe, geldiData, gelemezData]);

  const girisYap = () => {
    if (!girisTipi) { setGirisHatasi('Lütfen rol seçin'); return; }
    if (!girisAdi) { setGirisHatasi('Lütfen kullanıcı seçin'); return; }
    const kullanici = KULLANICILAR.find(k => k.ad === girisAdi);
    if (!kullanici) { setGirisHatasi('Kullanıcı bulunamadı'); return; }
    if (sifre !== kullanici.sifre) { setGirisHatasi('Şifre hatalı'); return; }
    setKullaniciAdi(kullanici.ad);
    setKullaniciRolu(kullanici.rol);
    setGirisYapildi(true);
    setGirisHatasi('');
    setSifre('');
    setGirisAdi('');
    localStorage.setItem('secim_oturum', JSON.stringify({ ad: kullanici.ad, rol: kullanici.rol }));
  };

  const cikisYap = () => {
    setGirisYapildi(false); setKullaniciAdi(''); setKullaniciRolu('');
    setSeciliKullanici(''); setSeciliSandik(''); setSifre(''); setGirisTipi(''); setGirisAdi('');
    localStorage.removeItem('secim_oturum');
  };

  const toggleGeldi = async (kisi) => {
    const key = makeKey(kisi);
    if (geldiData[key]) {
      await remove(ref(database, 'geldi/' + key));
    } else {
      if (gelemezData[key]) await remove(ref(database, 'gelemez/' + key));
      await set(ref(database, 'geldi/' + key), { geldi: true, isaretleyen: kullaniciAdi, saat: new Date().toLocaleTimeString('tr-TR') });
    }
  };

  const toggleGelemez = async (kisi) => {
    const key = makeKey(kisi);
    if (gelemezData[key]) {
      await remove(ref(database, 'gelemez/' + key));
    } else {
      if (geldiData[key]) await remove(ref(database, 'geldi/' + key));
      await set(ref(database, 'gelemez/' + key), { isaretleyen: kullaniciAdi, saat: new Date().toLocaleTimeString('tr-TR') });
    }
  };

  const topluSifirla = async () => {
    if (kullaniciRolu !== 'superadmin') return;
    await remove(ref(database, 'geldi'));
    await remove(ref(database, 'gelemez'));
    setSifirlaOnay(false);
  };

  // -- GİRİŞ EKRANI --
  if (!girisYapildi) {
    const rolSecenekleri = [
      { key: 'superadmin', label: 'Superadmin', icon: '⭐', renk: '#7b1fa2', bg: 'rgba(156,39,176,0.08)', border: 'rgba(156,39,176,0.3)' },
      { key: 'admin', label: 'Admin', icon: '⚙️', renk: '#e65100', bg: 'rgba(255,152,0,0.08)', border: 'rgba(255,152,0,0.3)' },
      { key: 'moderator', label: 'Moderatör', icon: '🛡️', renk: '#00796b', bg: 'rgba(0,150,136,0.08)', border: 'rgba(0,150,136,0.3)' },
      { key: 'referans', label: 'Referans', icon: '👥', renk: '#1565c0', bg: 'rgba(33,150,243,0.08)', border: 'rgba(33,150,243,0.3)' },
      { key: 'sandiklar', label: 'Sandıklar', icon: '📦', renk: '#5d4037', bg: 'rgba(93,64,55,0.08)', border: 'rgba(93,64,55,0.3)' },
      { key: 'roldisi', label: 'Rol Dışı', icon: '📋', renk: '#546e7a', bg: 'rgba(84,110,122,0.08)', border: 'rgba(84,110,122,0.3)' },
    ];
    const seciliRol = rolSecenekleri.find(r => r.key === girisTipi);
    const rolKullanicilari = girisTipi ? KULLANICILAR.filter(k => k.rol === girisTipi) : [];
    return (
      <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#f0f2f5 0%,#e8edf2 50%,#dce3ea 100%)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'20px',fontFamily:'system-ui,-apple-system,sans-serif'}}>
        <div style={{background:'#fff',border:'1px solid #e0e0e0',borderRadius:'16px',padding:'32px',maxWidth:'400px',width:'100%',boxShadow:'0 4px 24px rgba(0,0,0,0.08)'}}>
          <style>{`*{box-sizing:border-box}select,input{background:#f8f9fa;border:1px solid #dee2e6;color:#333;padding:14px;border-radius:10px;font-size:1rem;width:100%;outline:none}select:focus,input:focus{border-color:#e94560}select option{background:#fff}.btn-login{background:linear-gradient(135deg,#e94560,#ff6b6b);border:none;color:#fff;padding:12px 20px;border-radius:10px;font-weight:600;cursor:pointer;width:100%;font-size:1rem}.btn-login:active{transform:scale(0.98)}`}</style>
          <div style={{textAlign:'center',marginBottom:'24px'}}>
            <BizimOdaLogo size="large" />
            <p style={{color:'#999',margin:'8px 0 0',fontSize:'0.85rem'}}>Seçim Takip Sistemi</p>
          </div>
          {/* Rol butonları */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'8px',marginBottom:'16px'}}>
            {rolSecenekleri.map(r => (
              <button key={r.key} onClick={() => { setGirisTipi(r.key); setGirisAdi(''); setGirisHatasi(''); }} style={{
                background: girisTipi === r.key ? r.bg : '#f8f9fa',
                border: `2px solid ${girisTipi === r.key ? r.border : '#e0e0e0'}`,
                borderRadius: '12px', padding: '14px 4px 10px', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                transition: 'all 0.2s', color: girisTipi === r.key ? r.renk : '#aaa'
              }}>
                <span style={{fontSize:'1.3rem'}}>{r.icon}</span>
                <span style={{fontSize:'0.65rem',fontWeight:700,color: girisTipi === r.key ? r.renk : '#999',letterSpacing:'0.3px'}}>{r.label}</span>
              </button>
            ))}
          </div>
          {/* Kullanıcı listesi ve şifre (rol seçildikten sonra) */}
          {girisTipi && (
            <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
              <select value={girisAdi} onChange={e => { setGirisAdi(e.target.value); setGirisHatasi(''); }}>
                <option value="">-- Kullanıcı Seçin --</option>
                {rolKullanicilari.map(k => <option key={k.ad} value={k.ad}>{k.ad}</option>)}
              </select>
              <input type="password" placeholder="Şifre (telefon son 6 hane)" value={sifre} onChange={e => setSifre(e.target.value)} onKeyDown={e => e.key === 'Enter' && girisYap()} />
            </div>
          )}
          {girisHatasi && <div style={{background:'rgba(233,69,96,0.1)',border:'1px solid rgba(233,69,96,0.3)',borderRadius:'8px',padding:'10px',marginTop:'12px',color:'#e94560',fontSize:'0.9rem',textAlign:'center'}}>{girisHatasi}</div>}
          {girisTipi && <button className="btn-login" onClick={girisYap} style={{marginTop:'16px'}}>Giriş Yap</button>}
          {/* Geri Sayım */}
          <div style={{marginTop:'20px',textAlign:'center'}}>
            <div style={{color:'#999',fontSize:'0.75rem',marginBottom:'8px',fontWeight:600}}>14 Şubat Saat 10:00</div>
            {geriSayim.bitti ? (
              <div style={{color:'#e94560',fontWeight:700,fontSize:'1rem'}}>SEÇİM BAŞLADI!</div>
            ) : (
              <div style={{display:'flex',justifyContent:'center',gap:'8px'}}>
                {[
                  { val: geriSayim.gun, label: 'GÜN' },
                  { val: geriSayim.saat, label: 'SAAT' },
                  { val: geriSayim.dakika, label: 'DAK' },
                  { val: geriSayim.saniye, label: 'SAN' },
                ].map(b => (
                  <div key={b.label} style={{background:'#f8f9fa',border:'1px solid #e0e0e0',borderRadius:'10px',padding:'8px 10px',minWidth:'52px'}}>
                    <div style={{fontSize:'1.2rem',fontWeight:800,color:'#e94560',fontFamily:'monospace'}}>{String(b.val).padStart(2,'0')}</div>
                    <div style={{fontSize:'0.6rem',color:'#999',fontWeight:600,marginTop:'2px'}}>{b.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* Footer */}
        <div style={{marginTop:'20px',textAlign:'center',fontSize:'0.75rem',color:'#aaa'}}>
          2026 <a href="https://arfhause.com" target="_blank" rel="noopener noreferrer" style={{color:'#e94560',textDecoration:'none',fontWeight:600}}>Arfhause</a>
        </div>
      </div>
    );
  }

  // -- ANA EKRAN --
  const dropdownSecenekler = (() => {
    const s = [];
    s.push({ ad: 'TÜM LİSTE', label: 'TÜM LİSTE ('+SECIM_DATA.roller.reduce((a,r)=>a+r.referans_sayisi,0)+' + '+SECIM_DATA.referanssiz.referans_sayisi+' referanssız)', grup: 'ozel' });
    referansAramaOranlari.forEach(r => {
      const yuzde = r.toplam > 0 ? Math.round(r.aranan / r.toplam * 100) : 0;
      s.push({ ad: r.ad, label: r.ad + ' (' + r.toplam + ') - ' + r.aranan + '/' + r.toplam + ' geldi %' + yuzde + (r.gelemez > 0 ? ' | ' + r.gelemez + ' gelemez' : ''), grup: 'referans' });
    });
    SECIM_DATA.sandiklar.forEach(x => { s.push({ ad: x.ad, label: x.ad + ' (' + x.referans_sayisi + ' kişi)', grup: 'sandik' }); });
    s.push({ ad: 'REFERANSLI', label: 'REFERANSLI (' + SECIM_DATA.referansli.referans_sayisi + ' kişi)', grup: 'ozel' });
    s.push({ ad: 'REFERANSSIZ', label: 'REFERANSSIZ (' + SECIM_DATA.referanssiz.referans_sayisi + ' kişi)', grup: 'ozel' });
    s.push({ ad: 'ÇAKIŞANLAR', label: 'ÇAKIŞANLAR (' + SECIM_DATA.cakisanlar.referans_sayisi + ' kişi)', grup: 'ozel' });
    return s;
  })();

  const isSpecialUser = ['SANDIKLAR', 'REFERANSLI', 'REFERANSSIZ', 'ÇAKIŞANLAR'].includes(kullaniciAdi);
  const showDropdown = ['superadmin', 'admin', 'moderator'].includes(kullaniciRolu) && !isSpecialUser;
  const showSandikDropdown = kullaniciRolu === 'sandiklar';
  const isAdmin = ['superadmin', 'admin'].includes(kullaniciRolu);

  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#f0f2f5 0%,#e8edf2 50%,#dce3ea 100%)',fontFamily:'system-ui,-apple-system,sans-serif'}}>
      <style>{`*{box-sizing:border-box}.card{background:#fff;border:1px solid #e0e0e0;border-radius:16px;box-shadow:0 2px 8px rgba(0,0,0,0.04)}.btn{background:linear-gradient(135deg,#e94560,#ff6b6b);border:none;color:#fff;padding:10px 20px;border-radius:10px;font-weight:600;cursor:pointer}.btn:active{transform:scale(0.98)}.btn-call{background:linear-gradient(135deg,#00b4d8,#0096c7);color:#fff;padding:6px 12px;border-radius:8px;font-weight:600;text-decoration:none;display:inline-block;border:none;font-size:0.8rem}.btn-call.disabled{background:#ccc;color:#999}.check{width:36px;height:36px;min-width:36px;border-radius:10px;border:2px solid #dee2e6;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:0.9rem;transition:all 0.2s}.check.geldi{background:linear-gradient(135deg,#00c853,#00e676);border-color:#00c853;color:#fff}.check.gelemez{background:linear-gradient(135deg,#ff5252,#ff1744);border-color:#ff5252;color:#fff}.stat{background:#fff;border-radius:12px;padding:14px;text-align:center;border:1px solid #e0e0e0}.stat b{font-size:1.6rem;font-family:monospace}.row{background:#fff;border:1px solid #e8e8e8;border-radius:12px;padding:12px 14px;margin-bottom:8px;display:flex;align-items:center;gap:10px;transition:all 0.2s}.row.geldi{background:#f0faf0;border-color:#a5d6a7}.row.gelemez{background:#fef0f0;border-color:#ffcdd2}select,input{background:#f8f9fa;border:1px solid #dee2e6;color:#333;padding:12px;border-radius:10px;font-size:0.95rem;width:100%;outline:none}select:focus,input:focus{border-color:#e94560}select option{background:#fff}.fbtn{background:#f8f9fa;border:1px solid #dee2e6;color:#666;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:0.85rem}.fbtn.on{background:linear-gradient(135deg,#e94560,#ff6b6b);border-color:#e94560;color:#fff}.bar{height:10px;background:#e8e8e8;border-radius:5px;overflow:hidden}.bar div{height:100%;border-radius:5px;transition:width 0.3s}.modal{position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:1000;padding:20px}.modal>div{background:#fff;border:1px solid #e0e0e0;border-radius:16px;padding:24px;max-width:400px;text-align:center;width:100%;box-shadow:0 8px 32px rgba(0,0,0,0.15)}.badge{display:inline-block;padding:4px 10px;border-radius:6px;font-size:0.75rem;font-weight:600}.isaretleyen{background:rgba(0,200,83,0.15);color:#2e7d32;padding:2px 8px;border-radius:4px;font-size:0.7rem;margin-left:6px}.gelemez-badge{background:rgba(255,82,82,0.15);color:#c62828;padding:2px 8px;border-radius:4px;font-size:0.7rem;margin-left:6px}`}</style>

      {/* Header */}
      <div style={{background:'#fff',borderBottom:'1px solid #e0e0e0',padding:'14px 16px',position:'sticky',top:0,zIndex:100,boxShadow:'0 2px 8px rgba(0,0,0,0.06)'}}>
        <div style={{maxWidth:'700px',margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'10px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
            <BizimOdaLogo />
            <div style={{borderLeft:'1px solid #e0e0e0',paddingLeft:'12px'}}>
              <div style={{color:'#333',fontWeight:600,fontSize:'0.95rem'}}>{kullaniciAdi}</div>
              <span className="badge" style={{background:kullaniciRolu==='superadmin'?'rgba(156,39,176,0.15)':kullaniciRolu==='admin'?'rgba(255,152,0,0.15)':kullaniciRolu==='moderator'?'rgba(0,150,136,0.15)':kullaniciRolu==='sandiklar'?'rgba(93,64,55,0.15)':kullaniciRolu==='roldisi'?'rgba(84,110,122,0.15)':'rgba(33,150,243,0.15)',color:kullaniciRolu==='superadmin'?'#7b1fa2':kullaniciRolu==='admin'?'#e65100':kullaniciRolu==='moderator'?'#00796b':kullaniciRolu==='sandiklar'?'#5d4037':kullaniciRolu==='roldisi'?'#546e7a':'#1565c0'}}>{{superadmin:'Superadmin',admin:'Admin',moderator:'Moderatör',sandiklar:'Sandıklar',roldisi:'Rol Dışı',referans:'Referans'}[kullaniciRolu] || kullaniciRolu}</span>
            </div>
          </div>
          <button onClick={cikisYap} style={{background:'#f8f9fa',border:'1px solid #dee2e6',color:'#666',padding:'8px 14px',borderRadius:'8px',cursor:'pointer',fontSize:'0.85rem'}}>Çıkış</button>
        </div>
      </div>

      <div style={{maxWidth:'700px',margin:'0 auto',padding:'16px'}}>

        {/* Kendi referans oranı (herkes) */}
        {kendiOran && !isSpecialUser && (
          <div className="card" style={{padding:'14px 16px',marginBottom:'16px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{color:'#333',fontSize:'0.9rem',fontWeight:500}}>📊 Senin Referansların</div>
            <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
              <span style={{color:'#2e7d32',fontWeight:700,fontSize:'1.1rem'}}>%{kendiOran.yuzde}</span>
              <span style={{color:'#666',fontSize:'0.85rem'}}>{kendiOran.aranan}/{kendiOran.toplam} geldi</span>
              {kendiOran.gelemez > 0 && <span style={{color:'#c62828',fontSize:'0.85rem'}}>{kendiOran.gelemez} gelemez</span>}
            </div>
          </div>
        )}

        {/* Admin/Mod dropdown */}
        {showDropdown && (
          <div style={{marginBottom:'16px'}}>
            <select value={seciliKullanici} onChange={e => setSeciliKullanici(e.target.value)}>
              <option value="">-- Liste Seçin --</option>
              <optgroup label="📋 Genel">{dropdownSecenekler.filter(s => s.grup === 'ozel').map(s => <option key={s.ad} value={s.ad}>{s.label}</option>)}</optgroup>
              <optgroup label="👤 Referans Sorumluları">{dropdownSecenekler.filter(s => s.grup === 'referans').map(s => <option key={s.ad} value={s.ad}>{s.label}</option>)}</optgroup>
              <optgroup label="📦 Sandıklar">{dropdownSecenekler.filter(s => s.grup === 'sandik').map(s => <option key={s.ad} value={s.ad}>{s.label}</option>)}</optgroup>
            </select>
          </div>
        )}

        {showSandikDropdown && (
          <div style={{marginBottom:'16px'}}>
            <select value={seciliSandik} onChange={e => setSeciliSandik(e.target.value)}>
              <option value="">-- Sandık Seçin --</option>
              {SECIM_DATA.sandiklar.map(s => <option key={s.ad} value={s.ad}>{s.ad} ({s.referans_sayisi} kişi)</option>)}
            </select>
          </div>
        )}

        {/* Rapor butonu (sadece admin) + Sıfırla */}
        {isAdmin && (
          <div style={{marginBottom:'16px',display:'flex',gap:'8px',flexWrap:'wrap'}}>
            <button className={`fbtn ${raporGoster ? 'on' : ''}`} onClick={() => setRaporGoster(!raporGoster)}>📊 Genel Rapor {raporGoster ? '(Kapat)' : ''}</button>
            {kullaniciRolu === 'superadmin' && (<button className="fbtn" style={{borderColor:'rgba(255,0,0,0.3)',color:'#c62828'}} onClick={() => setSifirlaOnay(true)}>🗑️ Toplu Sıfırla</button>)}
          </div>
        )}

        {/* Genel Rapor (sadece admin) */}
        {raporGoster && isAdmin && (
          <div className="card" style={{padding:'16px',marginBottom:'16px',maxHeight:'500px',overflowY:'auto'}}>
            <h3 style={{color:'#333',margin:'0 0 12px',fontSize:'1rem'}}>📊 Genel Rapor - Tüm Referans Sorumluları</h3>
            {raporData.map(h => {
              const yuzde = h.toplam > 0 ? Math.round(h.aranan / h.toplam * 100) : 0;
              return (
                <div key={h.ad} style={{marginBottom:'14px',padding:'10px',background:'#f8f9fa',borderRadius:'10px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px'}}>
                    <span style={{color:'#333',fontWeight:600,fontSize:'0.9rem'}}>{h.ad}</span>
                    <span style={{fontSize:'0.8rem'}}>
                      <span style={{color:'#2e7d32',fontWeight:700}}>%{yuzde}</span>
                      <span style={{color:'#666',marginLeft:'8px'}}>{h.aranan}/{h.toplam} geldi</span>
                      {h.gelemez > 0 && <span style={{color:'#c62828',marginLeft:'8px'}}>{h.gelemez} gelemez</span>}
                      <span style={{color:'#e65100',marginLeft:'8px'}}>{h.aranmayanSayisi} bekleyen</span>
                    </span>
                  </div>
                  <div className="bar"><div style={{width: yuzde + '%', background:'linear-gradient(90deg,#00c853,#00e676)'}}></div></div>
                  {h.aranmayanSayisi > 0 && (
                    <div style={{marginTop:'6px',paddingLeft:'8px'}}>
                      {h.aranmayanlar.slice(0, 3).map((k, i) => (<div key={i} style={{color:'#999',fontSize:'0.75rem'}}>{k.ad} {k.tel && <span style={{color:'#bbb'}}>({k.tel})</span>}</div>))}
                      {h.aranmayanSayisi > 3 && <div style={{color:'#bbb',fontSize:'0.7rem'}}>... ve {h.aranmayanSayisi - 3} kişi daha</div>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* İstatistikler */}
        {aktifListe.length > 0 && (
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'8px',marginBottom:'16px'}}>
            <div className="stat"><b style={{color:'#333'}}>{istatistikler.toplam}</b><br/><span style={{color:'#999',fontSize:'0.75rem'}}>Toplam</span></div>
            <div className="stat"><b style={{color:'#2e7d32'}}>{istatistikler.geldi}</b><br/><span style={{color:'#999',fontSize:'0.75rem'}}>Geldi</span></div>
            <div className="stat"><b style={{color:'#c62828'}}>{istatistikler.gelemez}</b><br/><span style={{color:'#999',fontSize:'0.75rem'}}>Gelemez</span></div>
            <div className="stat"><b style={{color:'#e65100'}}>{istatistikler.bekleyen}</b><br/><span style={{color:'#999',fontSize:'0.75rem'}}>Bekleyen</span></div>
          </div>
        )}

        {/* Progress bar */}
        {aktifListe.length > 0 && (
          <div className="bar" style={{marginBottom:'16px',display:'flex',overflow:'hidden'}}>
            <div style={{width:(istatistikler.toplam>0?(istatistikler.geldi/istatistikler.toplam*100):0)+'%',background:'linear-gradient(90deg,#00c853,#00e676)',height:'10px'}}></div>
            <div style={{width:(istatistikler.toplam>0?(istatistikler.gelemez/istatistikler.toplam*100):0)+'%',background:'linear-gradient(90deg,#ff5252,#ff1744)',height:'10px'}}></div>
          </div>
        )}

        {/* Arama ve filtre */}
        {aktifListe.length > 0 && (
          <div style={{marginBottom:'16px',display:'flex',flexDirection:'column',gap:'10px'}}>
            <input placeholder="🔍 İsim veya telefon ara..." value={aramaMetni} onChange={e => setAramaMetni(e.target.value)} />
            <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
              {[['hepsi','Hepsi'],['geldi','✅ Geldi'],['gelemez','❌ Gelemez'],['aranmayan','⏳ Bekleyen']].map(([f,label]) => (<button key={f} className={`fbtn ${filtre === f ? 'on' : ''}`} onClick={() => setFiltre(f)}>{label}</button>))}
            </div>
          </div>
        )}

        {/* Boş durumlar */}
        {aktifListe.length === 0 && !showSandikDropdown && !showDropdown && (<div style={{textAlign:'center',color:'#999',padding:'40px 0'}}>Listeniz bulunamadı</div>)}
        {aktifListe.length === 0 && (showSandikDropdown || showDropdown) && (<div style={{textAlign:'center',color:'#999',padding:'40px 0'}}>Lütfen bir liste seçin</div>)}

        <div style={{fontSize:'0.85rem',color:'#999',marginBottom:'8px'}}>{filtrelenmisListe.length > 0 && (filtrelenmisListe.length + ' kişi gösteriliyor')}</div>

        {/* Kişi listesi */}
        {filtrelenmisListe.map((kisi, idx) => {
          const key = makeKey(kisi);
          const geldi = geldiData[key];
          const gelemez = gelemezData[key];
          const telLink = kisi.tel ? kisi.tel.replace(/\s/g, '') : '';
          const rowClass = geldi ? 'row geldi' : gelemez ? 'row gelemez' : 'row';
          return (
            <div key={key + '_' + idx} className={rowClass}>
              <div style={{display:'flex',flexDirection:'column',gap:'4px'}}>
                <div className={`check ${geldi ? 'geldi' : ''}`} onClick={() => toggleGeldi(kisi)} title="Geldi">{geldi ? '✓' : '👍'}</div>
                <div className={`check ${gelemez ? 'gelemez' : ''}`} onClick={() => toggleGelemez(kisi)} title="Gelemeyecek" style={{width:'36px',height:'28px',minWidth:'36px',fontSize:'0.75rem'}}>{gelemez ? '✗' : '👎'}</div>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{color:'#333',fontWeight:500,fontSize:'0.95rem'}}>
                  {kisi.ad}
                  {kisi.sandik && <span style={{color:'#aaa',fontSize:'0.75rem',marginLeft:'6px'}}>S{kisi.sandik}</span>}
                  {geldi && <span className="isaretleyen">{geldi.isaretleyen} - {geldi.saat}</span>}
                  {gelemez && <span className="gelemez-badge">Gelemez - {gelemez.isaretleyen}</span>}
                </div>
                {kisi.referanslar && kisi.referanslar.length > 0 && (
                  <div style={{color:'#aaa',fontSize:'0.7rem',marginTop:'2px'}}>Ref: {kisi.referanslar.join(', ')}</div>
                )}
                {telLink && (
                  <a href={'tel:' + telLink} className={`btn-call ${geldi || gelemez ? 'disabled' : ''}`} style={{marginTop:'4px'}}>📞 {kisi.tel}</a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{textAlign:'center',padding:'24px 16px 16px',fontSize:'0.75rem',color:'#aaa'}}>
        2026 <a href="https://arfhause.com" target="_blank" rel="noopener noreferrer" style={{color:'#e94560',textDecoration:'none',fontWeight:600}}>Arfhause</a>
      </div>

      {/* Sıfırlama modalı */}
      {sifirlaCOnay && (
        <div className="modal" onClick={() => setSifirlaOnay(false)}>
          <div onClick={e => e.stopPropagation()}>
            <h3 style={{color:'#c62828',margin:'0 0 12px'}}>⚠️ Toplu Sıfırlama</h3>
            <p style={{color:'#666',fontSize:'0.9rem'}}>Tüm geldi ve gelemez kayıtları silinecek. Emin misiniz?</p>
            <div style={{display:'flex',gap:'10px',marginTop:'16px'}}>
              <button className="btn" style={{background:'#999',flex:1}} onClick={() => setSifirlaOnay(false)}>İptal</button>
              <button className="btn" style={{flex:1}} onClick={topluSifirla}>Sıfırla</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
