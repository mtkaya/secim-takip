"use client";
import { useState, useEffect, useMemo } from 'react';
import { ref, onValue, set, remove } from 'firebase/database';
import { database } from './lib/firebase';
import { SECIM_DATA } from './data';

const KULLANICILAR = SECIM_DATA.kullanicilar;

const Logo = ({ size = "normal" }) => {
  const s = size === "large" ? 48 : 32;
  return (<svg width={s} height={s} viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="url(#g)"/><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e94560"/><stop offset="1" stopColor="#ff6b6b"/></linearGradient></defs><text x="50" y="52" textAnchor="middle" dominantBaseline="central" fontSize="40" fontWeight="bold" fill="#fff">ST</text></svg>);
};

export default function SecimTakipSistemi() {
  const [girisYapildi, setGirisYapildi] = useState(false);
  const [kullaniciAdi, setKullaniciAdi] = useState('');
  const [kullaniciRolu, setKullaniciRolu] = useState('');
  const [sifre, setSifre] = useState('');
  const [girisHatasi, setGirisHatasi] = useState('');
  const [girisTipi, setGirisTipi] = useState('');
  const [seciliKullanici, setSeciliKullanici] = useState('');
  const [seciliSandik, setSeciliSandik] = useState('');
  const [geldiData, setGeldiData] = useState({});
  const [aramaMetni, setAramaMetni] = useState('');
  const [filtre, setFiltre] = useState('hepsi');
  const [sifirlaCOnay, setSifirlaOnay] = useState(false);
  const [havuzListeGoster, setHavuzListeGoster] = useState(false);

  useEffect(() => {
    const geldiRef = ref(database, 'geldi');
    const unsubscribe = onValue(geldiRef, (snapshot) => {
      setGeldiData(snapshot.val() || {});
    });
    return () => unsubscribe();
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
      const aranan = r.kisiler.filter(k => {
        const key = (k.ad + '_' + (k.sicil || '')).replace(/[.#$\/\[\]]/g, '_');
        return geldiData[key];
      }).length;
      return { ad: r.ad, toplam: r.referans_sayisi, aranan };
    });
  }, [geldiData]);

  const havuzListe = useMemo(() => {
    return SECIM_DATA.roller.map(r => {
      const aranmayanlar = r.kisiler.filter(k => {
        const key = (k.ad + '_' + (k.sicil || '')).replace(/[.#$\/\[\]]/g, '_');
        return !geldiData[key];
      });
      return { ad: r.ad, aranmayanlar };
    }).filter(r => r.aranmayanlar.length > 0);
  }, [geldiData]);

  const filtrelenmisListe = useMemo(() => {
    let liste = aktifListe;
    if (aramaMetni) {
      const aranan = aramaMetni.toUpperCase();
      liste = liste.filter(k => k.ad.toUpperCase().includes(aranan) || (k.tel && k.tel.includes(aramaMetni)));
    }
    if (filtre === 'aranan') {
      liste = liste.filter(k => {
        const key = (k.ad + '_' + (k.sicil || '')).replace(/[.#$\/\[\]]/g, '_');
        return geldiData[key];
      });
    } else if (filtre === 'aranmayan') {
      liste = liste.filter(k => {
        const key = (k.ad + '_' + (k.sicil || '')).replace(/[.#$\/\[\]]/g, '_');
        return !geldiData[key];
      });
    }
    return liste;
  }, [aktifListe, aramaMetni, filtre, geldiData]);

  const istatistikler = useMemo(() => {
    const toplam = aktifListe.length;
    const aranan = aktifListe.filter(k => {
      const key = (k.ad + '_' + (k.sicil || '')).replace(/[.#$\/\[\]]/g, '_');
      return geldiData[key];
    }).length;
    return { toplam, aranan, aranmayan: toplam - aranan };
  }, [aktifListe, geldiData]);

  const girisYap = () => {
    if (!girisTipi) { setGirisHatasi('Lütfen kullanıcı seçin'); return; }
    const kullanici = KULLANICILAR.find(k => k.ad === girisTipi);
    if (!kullanici) { setGirisHatasi('Kullanıcı bulunamadı'); return; }
    if (sifre !== kullanici.sifre) { setGirisHatasi('Şifre hatalı'); return; }
    setKullaniciAdi(kullanici.ad);
    setKullaniciRolu(kullanici.rol);
    setGirisYapildi(true);
    setGirisHatasi('');
    setSifre('');
    localStorage.setItem('secim_oturum', JSON.stringify({ ad: kullanici.ad, rol: kullanici.rol }));
  };

  const cikisYap = () => {
    setGirisYapildi(false);
    setKullaniciAdi('');
    setKullaniciRolu('');
    setSeciliKullanici('');
    setSeciliSandik('');
    setSifre('');
    setGirisTipi('');
    localStorage.removeItem('secim_oturum');
  };

  const toggleGeldi = async (kisi) => {
    const key = (kisi.ad + '_' + (kisi.sicil || '')).replace(/[.#$\/\[\]]/g, '_');
    const geldiRef = ref(database, 'geldi/' + key);
    if (geldiData[key]) {
      await remove(geldiRef);
    } else {
      await set(geldiRef, { geldi: true, isaretleyen: kullaniciAdi, saat: new Date().toLocaleTimeString('tr-TR') });
    }
  };

  const topluSifirla = async () => {
    if (kullaniciRolu !== 'superadmin') return;
    await remove(ref(database, 'geldi'));
    setSifirlaOnay(false);
  };

  if (!girisYapildi) {
    const adminler = KULLANICILAR.filter(k => ['superadmin', 'admin'].includes(k.rol));
    const moderatorler = KULLANICILAR.filter(k => k.rol === 'moderator');
    const referanslar = KULLANICILAR.filter(k => k.rol === 'referans');
    return (
      <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)',display:'flex',alignItems:'center',justifyContent:'center',padding:'20px',fontFamily:'system-ui,-apple-system,sans-serif'}}>
        <div className="card" style={{padding:'32px',maxWidth:'380px',width:'100%'}}>
          <style>{`*{box-sizing:border-box}.card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:16px}.btn{background:linear-gradient(135deg,#e94560,#ff6b6b);border:none;color:#fff;padding:10px 20px;border-radius:10px;font-weight:600;cursor:pointer;width:100%}.btn:active{transform:scale(0.98)}select,input{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#fff;padding:14px;border-radius:10px;font-size:1rem;width:100%;outline:none}select option{background:#1a1a2e}`}</style>
          <div style={{textAlign:'center',marginBottom:'24px'}}>
            <Logo size="large" />
            <h2 style={{color:'rgba(255,255,255,0.9)',margin:'12px 0 8px',fontSize:'1.1rem',fontWeight:'500'}}>Hoş Geldiniz</h2>
            <p style={{color:'#e94560',margin:0,fontSize:'0.95rem',fontWeight:'600'}}>🗳️ Seçim Takip Asistanı</p>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
            <select value={girisTipi} onChange={e => { setGirisTipi(e.target.value); setGirisHatasi(''); }}>
              <option value="">-- Kullanıcı Seçin --</option>
              <optgroup label="👑 Yönetim">{adminler.map(k => <option key={k.ad} value={k.ad}>{k.ad}</option>)}</optgroup>
              <optgroup label="🛡️ Moderatörler">{moderatorler.map(k => <option key={k.ad} value={k.ad}>{k.ad}</option>)}</optgroup>
              <optgroup label="👤 Referans Sorumluları">{referanslar.map(k => <option key={k.ad} value={k.ad}>{k.ad}</option>)}</optgroup>
            </select>
            <input type="password" placeholder="Şifre" value={sifre} onChange={e => setSifre(e.target.value)} onKeyDown={e => e.key === 'Enter' && girisYap()} />
          </div>
          {girisHatasi && <div style={{background:'rgba(233,69,96,0.2)',border:'1px solid rgba(233,69,96,0.4)',borderRadius:'8px',padding:'10px',marginTop:'12px',color:'#ff6b6b',fontSize:'0.9rem',textAlign:'center'}}>{girisHatasi}</div>}
          <button className="btn" onClick={girisYap} style={{marginTop:'16px'}}>Giriş Yap</button>
        </div>
      </div>
    );
  }

  const dropdownSecenekler = (() => {
    const s = [];
    referansAramaOranlari.forEach(r => { s.push({ ad: r.ad, label: r.ad + ' (' + r.toplam + ' kişi) - ' + r.aranan + '/' + r.toplam + ' arandı', grup: 'referans' }); });
    SECIM_DATA.sandiklar.forEach(x => { s.push({ ad: x.ad, label: x.ad + ' (' + x.referans_sayisi + ' kişi)', grup: 'sandik' }); });
    s.push({ ad: 'REFERANSLI', label: 'REFERANSLI (' + SECIM_DATA.referansli.referans_sayisi + ' kişi)', grup: 'ozel' });
    s.push({ ad: 'REFERANSSIZ', label: 'REFERANSSIZ (' + SECIM_DATA.referanssiz.referans_sayisi + ' kişi)', grup: 'ozel' });
    s.push({ ad: 'ÇAKIŞANLAR', label: 'ÇAKIŞANLAR (' + SECIM_DATA.cakisanlar.referans_sayisi + ' kişi)', grup: 'ozel' });
    return s;
  })();

  const isSpecialUser = ['SANDIKLAR', 'REFERANSLI', 'REFERANSSIZ', 'ÇAKIŞANLAR'].includes(kullaniciAdi);
  const showDropdown = ['superadmin', 'admin', 'moderator'].includes(kullaniciRolu) && !isSpecialUser;
  const showSandikDropdown = kullaniciAdi === 'SANDIKLAR';

  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)',fontFamily:'system-ui,-apple-system,sans-serif'}}>
      <style>{`*{box-sizing:border-box}.card{background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:16px}.btn{background:linear-gradient(135deg,#e94560,#ff6b6b);border:none;color:#fff;padding:10px 20px;border-radius:10px;font-weight:600;cursor:pointer}.btn:active{transform:scale(0.98)}.btn-call{background:linear-gradient(135deg,#00d9ff,#00b4d8);color:#1a1a2e;padding:8px 14px;border-radius:8px;font-weight:600;text-decoration:none;display:inline-block;border:none}.btn-call.disabled{background:#444;color:#888}.check{width:40px;height:40px;min-width:40px;border-radius:10px;border:2px solid rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;cursor:pointer}.check.on{background:linear-gradient(135deg,#00c853,#00e676);border-color:#00c853}.stat{background:rgba(255,255,255,0.05);border-radius:12px;padding:14px;text-align:center;border:1px solid rgba(255,255,255,0.08)}.stat b{font-size:1.8rem;font-family:monospace}.row{background:rgba(233,69,96,0.08);border:1px solid rgba(233,69,96,0.2);border-radius:12px;padding:12px 14px;margin-bottom:8px;display:flex;align-items:center;gap:12px}.row.on{background:rgba(0,200,83,0.1);border-color:rgba(0,200,83,0.3)}select,input{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#fff;padding:14px;border-radius:10px;font-size:1rem;width:100%;outline:none}select option{background:#1a1a2e}.fbtn{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.7);padding:8px 14px;border-radius:8px;cursor:pointer;font-size:0.85rem}.fbtn.on{background:linear-gradient(135deg,#e94560,#ff6b6b);border-color:#e94560;color:#fff}.bar{height:10px;background:rgba(255,255,255,0.1);border-radius:5px;overflow:hidden}.bar div{height:100%;background:linear-gradient(90deg,#00c853,#00e676);border-radius:5px;transition:width 0.3s}.modal{position:fixed;inset:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:1000;padding:20px}.modal>div{background:#1a1a2e;border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:24px;max-width:360px;text-align:center;width:100%}.badge{display:inline-block;padding:4px 10px;border-radius:6px;font-size:0.75rem;font-weight:600}.isaretleyen{background:rgba(0,200,83,0.2);color:#00e676;padding:2px 8px;border-radius:4px;font-size:0.7rem;margin-left:6px}`}</style>

      <div style={{background:'rgba(0,0,0,0.3)',borderBottom:'1px solid rgba(255,255,255,0.08)',padding:'14px 16px',position:'sticky',top:0,zIndex:100,backdropFilter:'blur(20px)'}}>
        <div style={{maxWidth:'700px',margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'10px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
            <Logo />
            <div>
              <div style={{color:'#fff',fontWeight:600,fontSize:'0.95rem'}}>{kullaniciAdi}</div>
              <span className="badge" style={{background:kullaniciRolu==='superadmin'?'rgba(255,0,0,0.2)':kullaniciRolu==='admin'?'rgba(255,193,7,0.2)':kullaniciRolu==='moderator'?'rgba(0,217,255,0.2)':'rgba(0,200,83,0.2)',color:kullaniciRolu==='superadmin'?'#ff4444':kullaniciRolu==='admin'?'#ffc107':kullaniciRolu==='moderator'?'#00d9ff':'#00c853'}}>{kullaniciRolu==='superadmin'?'🔑 Süper Admin':kullaniciRolu==='admin'?'⚙️ Admin':kullaniciRolu==='moderator'?'🛡️ Moderatör':'👤 Referans'}</span>
            </div>
          </div>
          <button onClick={cikisYap} style={{background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)',color:'#fff',padding:'8px 14px',borderRadius:'8px',cursor:'pointer',fontSize:'0.85rem'}}>Çıkış</button>
        </div>
      </div>

      <div style={{maxWidth:'700px',margin:'0 auto',padding:'16px'}}>
        {showDropdown && (
          <div style={{marginBottom:'16px'}}>
            <select value={seciliKullanici} onChange={e => setSeciliKullanici(e.target.value)}>
              <option value="">-- Liste Seçin --</option>
              <optgroup label="👤 Referans Sorumluları">{dropdownSecenekler.filter(s => s.grup === 'referans').map(s => <option key={s.ad} value={s.ad}>{s.label}</option>)}</optgroup>
              <optgroup label="📦 Sandıklar">{dropdownSecenekler.filter(s => s.grup === 'sandik').map(s => <option key={s.ad} value={s.ad}>{s.label}</option>)}</optgroup>
              <optgroup label="📋 Özel Listeler">{dropdownSecenekler.filter(s => s.grup === 'ozel').map(s => <option key={s.ad} value={s.ad}>{s.label}</option>)}</optgroup>
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

        {['superadmin', 'admin', 'moderator'].includes(kullaniciRolu) && (
          <div style={{marginBottom:'16px',display:'flex',gap:'8px',flexWrap:'wrap'}}>
            <button className={`fbtn ${havuzListeGoster ? 'on' : ''}`} onClick={() => setHavuzListeGoster(!havuzListeGoster)}>📋 Havuz Liste {havuzListeGoster ? '(Kapat)' : '(Aranmayanlar)'}</button>
            {kullaniciRolu === 'superadmin' && (<button className="fbtn" style={{borderColor:'rgba(255,0,0,0.3)',color:'#ff6b6b'}} onClick={() => setSifirlaOnay(true)}>🗑️ Toplu Sıfırla</button>)}
          </div>
        )}

        {havuzListeGoster && (
          <div className="card" style={{padding:'16px',marginBottom:'16px',maxHeight:'400px',overflowY:'auto'}}>
            <h3 style={{color:'#fff',margin:'0 0 12px',fontSize:'1rem'}}>📋 Havuz Liste - Aranmayanlar</h3>
            {havuzListe.map(h => (
              <div key={h.ad} style={{marginBottom:'12px'}}>
                <div style={{color:'#e94560',fontWeight:600,fontSize:'0.9rem',marginBottom:'4px'}}>{h.ad} ({h.aranmayanlar.length} kişi aranmadı)</div>
                <div style={{paddingLeft:'12px'}}>
                  {h.aranmayanlar.slice(0, 5).map((k, i) => (<div key={i} style={{color:'rgba(255,255,255,0.5)',fontSize:'0.8rem'}}>{k.ad} {k.tel && <span style={{color:'rgba(255,255,255,0.3)'}}>({k.tel})</span>}</div>))}
                  {h.aranmayanlar.length > 5 && <div style={{color:'rgba(255,255,255,0.3)',fontSize:'0.75rem'}}>... ve {h.aranmayanlar.length - 5} kişi daha</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        {aktifListe.length > 0 && (
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'10px',marginBottom:'16px'}}>
            <div className="stat"><b style={{color:'#fff'}}>{istatistikler.toplam}</b><br/><span style={{color:'rgba(255,255,255,0.5)',fontSize:'0.8rem'}}>Toplam</span></div>
            <div className="stat"><b style={{color:'#00e676'}}>{istatistikler.aranan}</b><br/><span style={{color:'rgba(255,255,255,0.5)',fontSize:'0.8rem'}}>Aranan</span></div>
            <div className="stat"><b style={{color:'#ff6b6b'}}>{istatistikler.aranmayan}</b><br/><span style={{color:'rgba(255,255,255,0.5)',fontSize:'0.8rem'}}>Aranmayan</span></div>
          </div>
        )}

        {aktifListe.length > 0 && (
          <div className="bar" style={{marginBottom:'16px'}}><div style={{width: (istatistikler.toplam > 0 ? (istatistikler.aranan / istatistikler.toplam * 100) : 0) + '%'}}></div></div>
        )}

        {aktifListe.length > 0 && (
          <div style={{marginBottom:'16px',display:'flex',flexDirection:'column',gap:'10px'}}>
            <input placeholder="🔍 İsim veya telefon ara..." value={aramaMetni} onChange={e => setAramaMetni(e.target.value)} />
            <div style={{display:'flex',gap:'8px'}}>
              {['hepsi', 'aranan', 'aranmayan'].map(f => (<button key={f} className={`fbtn ${filtre === f ? 'on' : ''}`} onClick={() => setFiltre(f)}>{f === 'hepsi' ? 'Hepsi' : f === 'aranan' ? '✅ Aranan' : '❌ Aranmayan'}</button>))}
            </div>
          </div>
        )}

        {aktifListe.length === 0 && !showSandikDropdown && !showDropdown && (<div style={{textAlign:'center',color:'rgba(255,255,255,0.4)',padding:'40px 0'}}>Listeniz bulunamadı</div>)}
        {aktifListe.length === 0 && (showSandikDropdown || showDropdown) && (<div style={{textAlign:'center',color:'rgba(255,255,255,0.4)',padding:'40px 0'}}>Lütfen bir liste seçin</div>)}

        <div style={{fontSize:'0.85rem',color:'rgba(255,255,255,0.4)',marginBottom:'8px'}}>{filtrelenmisListe.length > 0 && (filtrelenmisListe.length + ' kişi gösteriliyor')}</div>

        {filtrelenmisListe.map((kisi, idx) => {
          const key = (kisi.ad + '_' + (kisi.sicil || '')).replace(/[.#$\/\[\]]/g, '_');
          const geldi = geldiData[key];
          const telLink = kisi.tel ? kisi.tel.replace(/\s/g, '') : '';
          return (
            <div key={key + '_' + idx} className={`row ${geldi ? 'on' : ''}`}>
              <div className={`check ${geldi ? 'on' : ''}`} onClick={() => toggleGeldi(kisi)}>{geldi ? '✓' : ''}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{color:'#fff',fontWeight:500,fontSize:'0.95rem'}}>
                  {kisi.ad}
                  {kisi.sandik && <span style={{color:'rgba(255,255,255,0.3)',fontSize:'0.75rem',marginLeft:'6px'}}>S{kisi.sandik}</span>}
                  {geldi && <span className="isaretleyen">{geldi.isaretleyen} - {geldi.saat}</span>}
                </div>
                {kisi.referanslar && kisi.referanslar.length > 0 && (<div style={{color:'rgba(255,255,255,0.3)',fontSize:'0.7rem',marginTop:'2px'}}>Ref: {kisi.referanslar.join(', ')}</div>)}
                {telLink && (<a href={'tel:' + telLink} className={`btn-call ${geldi ? 'disabled' : ''}`} style={{marginTop:'4px',fontSize:'0.8rem'}}>📞 {kisi.tel}</a>)}
              </div>
            </div>
          );
        })}
      </div>

      {sifirlaCOnay && (
        <div className="modal" onClick={() => setSifirlaOnay(false)}>
          <div onClick={e => e.stopPropagation()}>
            <h3 style={{color:'#ff6b6b',margin:'0 0 12px'}}>⚠️ Toplu Sıfırlama</h3>
            <p style={{color:'rgba(255,255,255,0.7)',fontSize:'0.9rem'}}>Tüm arama kayıtları silinecek. Emin misiniz?</p>
            <div style={{display:'flex',gap:'10px',marginTop:'16px'}}>
              <button className="btn" style={{background:'#444'}} onClick={() => setSifirlaOnay(false)}>İptal</button>
              <button className="btn" onClick={topluSifirla}>Sıfırla</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
