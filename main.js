import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, doc, setDoc, onSnapshot, updateDoc, arrayUnion, getDoc 
} from 'firebase/firestore';
import { 
  getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken,
  linkWithPopup, GoogleAuthProvider 
} from 'firebase/auth';
import { 
  Heart, X, Users, Utensils, Wallet, Coins, 
  PlayCircle, ArrowRight, Ticket, ShieldCheck, 
  Lock, Info, Scale, Trash2, Film, CheckCircle2, Award, LogIn, Share2, Loader2
} from 'lucide-react';

// --- FIREBASE CONFIGURATIE ---
// Jouw persoonlijke configuratie is nu hieronder ingevuld.
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : {
      apiKey: "AIzaSyAZPIbmsy48MjRGElG7BpNxyiR9ydlvl-k",
      authDomain: "vibecheck-4f630.firebaseapp.com",
      projectId: "vibecheck-4f630",
      storageBucket: "vibecheck-4f630.firebasestorage.app",
      messagingSenderId: "995143530772",
      appId: "1:995143530772:web:f2aedbd148a51170d46a01",
      measurementId: "G-5VP59GQVE0"
    };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'vibecheck-production';

// --- API KONFIGURATIE ---
// Jouw TMDB API Key (Bearer Token)
const TMDB_BEARER_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIxYWYzYWIzYzk1NTk0MmM5YjA3ZmQyYmU5NGFhYjk1MCIsIm5iZiI6MTc2NjY2MjkxOC4wNDQsInN1YiI6IjY5NGQyMzA2YzQxZDgxZDE5NjA3MjgzZSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.nGJ_aApJYY2CMY7BdTubYCjXxsYYZOt4_2LHiXgEUJc"; 

const PRODUCTION_URL = window.location.origin;

const INITIAL_CATEGORIES = {
  movies: {
    title: 'Films',
    icon: <Film size={24} />,
    items: [
      { id: 'm1', name: 'Laden...', desc: 'Even geduld aub.', img: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400' }
    ]
  },
  food: {
    title: 'Eten',
    icon: <Utensils size={24} />,
    items: [
      { id: 'f1', name: 'Sushi Express', desc: 'Verse maki en nigiri.', img: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400' },
      { id: 'f2', name: 'Pizza Palace', desc: 'Klassieke houtoven pizza\'s.', img: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400' }
    ]
  }
};

export default function App() {
  const [user, setUser] = useState(null);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [view, setView] = useState('landing'); 
  const [balance, setBalance] = useState(0);
  const [roomCode, setRoomCode] = useState('');
  const [roomData, setRoomData] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [vouchers, setVouchers] = useState([]);
  const [lastClaimedCode, setLastClaimedCode] = useState('');

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) { console.error("Auth mislukt:", err); }
    };
    initAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        setIsAnonymous(u.isAnonymous);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;
    const walletRef = doc(db, 'artifacts', appId, 'users', user.uid, 'data', 'wallet');
    const unsubWallet = onSnapshot(walletRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setBalance(data.balance || 0);
        setVouchers(data.vouchers || []);
      } else {
        setDoc(walletRef, { balance: 1.50, vouchers: [], createdAt: Date.now() });
      }
    });

    let unsubRoom = () => {};
    if (roomCode) {
      const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode);
      unsubRoom = onSnapshot(roomRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setRoomData(data);
          const pCount = data.participants.length;
          const matchId = Object.keys(data.votes || {}).find(id => data.votes[id].length === pCount && pCount > 1);
          if (matchId) setView('match');
        }
      });
    }
    return () => { unsubWallet(); unsubRoom(); };
  }, [user, roomCode]);

  const fetchRealData = async (category) => {
    if (category === 'movies') {
      try {
        setIsLoadingData(true);
        const response = await fetch(`https://api.themoviedb.org/3/movie/popular?language=nl-NL&page=1`, {
          headers: {
            accept: 'application/json',
            Authorization: `Bearer ${TMDB_BEARER_TOKEN}`
          }
        });
        const data = await response.json();
        setIsLoadingData(false);
        return data.results.slice(0, 15).map(m => ({
          id: m.id.toString(),
          name: m.title,
          desc: m.overview ? (m.overview.substring(0, 120) + "...") : "Geen beschrijving beschikbaar.",
          img: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400'
        }));
      } catch (err) {
        console.error("TMDB Fetch Fout", err);
        setIsLoadingData(false);
        return INITIAL_CATEGORIES.movies.items;
      }
    }
    return INITIAL_CATEGORIES.food.items;
  };

  const handleShare = async () => {
    const shareUrl = `${PRODUCTION_URL}?room=${roomCode}`;
    const shareData = {
      title: 'VibeCheck',
      text: `Help me kiezen! Doe mee in mijn kamer met code: ${roomCode}`,
      url: shareUrl,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch (err) { console.log(err); }
    } else {
      navigator.clipboard.writeText(shareData.text + " " + shareUrl);
      alert("Link gekopieerd naar klembord!");
    }
  };

  const handleCreateRoom = async (cat) => {
    const fetchedItems = await fetchRealData(cat);
    const code = Math.random().toString(36).substring(2, 7).toUpperCase();
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', code);
    
    await setDoc(roomRef, {
      code, 
      category: cat, 
      participants: [user.uid], 
      votes: {}, 
      items: fetchedItems,
      createdAt: Date.now()
    });
    setRoomCode(code);
    setView('lobby');
  };

  const handleJoinRoom = async (code) => {
    if (!code) return;
    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', code.toUpperCase());
    const snap = await getDoc(roomRef);
    if (snap.exists()) {
      await updateDoc(roomRef, { participants: arrayUnion(user.uid) });
      setRoomCode(code.toUpperCase());
      setView('lobby');
    } else { alert("Kamer niet gevonden."); }
  };

  const handleVote = async (isLike) => {
    if (!roomData) return;
    const items = roomData.items || [];
    const currentItem = items[currentIndex];

    if (isLike) {
      const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', roomCode);
      await updateDoc(roomRef, { [`votes.${currentItem.id}`]: arrayUnion(user.uid) });
    }

    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setView('waiting');
    }
  };

  const handleWatchAd = async () => {
    setIsWatchingAd(true);
    setTimeout(async () => {
      const walletRef = doc(db, 'artifacts', appId, 'users', user.uid, 'data', 'wallet');
      await updateDoc(walletRef, { balance: balance + 0.15 });
      setIsWatchingAd(false);
    }, 3000);
  };

  const handleClaimVoucher = async () => {
    if (balance < 5) return;
    const newCode = "TAKE-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const walletRef = doc(db, 'artifacts', appId, 'users', user.uid, 'data', 'wallet');
    await updateDoc(walletRef, { 
      balance: balance - 5,
      vouchers: arrayUnion(newCode)
    });
    setLastClaimedCode(newCode);
    setView('voucher_success');
  };

  const handleSecureAccount = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await linkWithPopup(auth.currentUser, provider);
      setIsAnonymous(false);
      alert("Account beveiligd!");
    } catch (error) {
      console.error("Koppelingsfout", error);
    }
  };

  if (!user) return <div className="h-screen flex items-center justify-center font-black text-indigo-600 animate-pulse text-2xl tracking-tighter">VIBECHECK</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col max-w-md mx-auto shadow-2xl relative border-x border-slate-200 overflow-hidden">
      
      <header className="p-4 bg-white border-b flex justify-between items-center sticky top-0 z-30">
        <h1 onClick={() => setView('landing')} className="text-xl font-black text-indigo-600 cursor-pointer tracking-tighter uppercase italic">VIBECHECK</h1>
        <div onClick={() => setView('wallet')} className="bg-green-50 text-green-700 px-4 py-1.5 rounded-2xl border border-green-100 flex items-center space-x-2 cursor-pointer active:scale-95 transition-all">
          <Wallet size={16} />
          <span className="font-bold text-sm">€{balance.toFixed(2)}</span>
        </div>
      </header>

      <main className="flex-1 p-6 overflow-y-auto pb-24">
        
        {view === 'landing' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
              <h2 className="text-2xl font-black mb-2 leading-tight">Swipe & Bespaar. 🍿</h2>
              <p className="text-indigo-100 text-sm mb-6">Beslis samen wat jullie gaan doen en spaar voor korting op je eten.</p>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => handleCreateRoom('food')} className="bg-white/20 p-5 rounded-2xl flex flex-col items-center backdrop-blur-md active:scale-95 transition-all">
                  <Utensils size={28} className="mb-2" /> <span className="text-xs font-black uppercase">Eten</span>
                </button>
                <button onClick={() => handleCreateRoom('movies')} className="bg-white/20 p-5 rounded-2xl flex flex-col items-center backdrop-blur-md active:scale-95 transition-all">
                  {isLoadingData ? <Loader2 size={28} className="animate-spin mb-2" /> : <Film size={28} className="mb-2" />}
                  <span className="text-xs font-black uppercase">Films</span>
                </button>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-100 flex items-center justify-between shadow-sm">
              <div className="flex items-center space-x-4">
                <div className="bg-green-100 p-3 rounded-2xl text-green-600"><Coins /></div>
                <div>
                  <h3 className="font-bold text-sm">Snel sparen?</h3>
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest leading-none">Bekijk een korte ad</p>
                </div>
              </div>
              <button onClick={() => setView('wallet')} className="bg-slate-900 text-white p-2 rounded-xl active:scale-90 transition-all"><ArrowRight size={20}/></button>
            </div>
          </div>
        )}

        {view === 'lobby' && roomData && (
          <div className="flex flex-col items-center py-10 space-y-8 animate-in slide-in-from-bottom-4">
            <h2 className="text-3xl font-black tracking-tighter">De Lobby</h2>
            <div className="bg-indigo-50 px-8 py-5 rounded-[2.5rem] border-2 border-dashed border-indigo-200 text-center relative">
               <p className="text-4xl font-mono font-black text-indigo-600 tracking-widest">{roomCode}</p>
               <button onClick={handleShare} className="absolute -bottom-4 -right-4 bg-indigo-600 text-white p-3 rounded-full shadow-lg active:scale-90 transition-all">
                 <Share2 size={20} />
               </button>
            </div>
            <div className="w-full bg-white p-6 rounded-[2rem] border border-slate-100 text-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Groepsleden:</span>
              <div className="flex justify-center gap-2 mt-4">
                {roomData.participants.map((p, i) => (
                  <div key={i} className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 border-2 border-white shadow-sm font-bold uppercase text-xs">
                    {i === 0 ? 'H' : 'G'}
                  </div>
                ))}
              </div>
            </div>
            <button onClick={() => setView('swiping')} className="w-full bg-slate-900 text-white py-5 rounded-[2rem] text-xl font-bold shadow-xl active:scale-95 transition-all uppercase tracking-tight">Begin met Swipen</button>
          </div>
        )}

        {view === 'swiping' && roomData && (
          <div className="h-full flex flex-col space-y-4 animate-in fade-in">
            <div className="flex-1 bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col">
              <img src={roomData.items[currentIndex].img} className="h-1/2 w-full object-cover" alt="Kaart" />
              <div className="p-8 text-center flex-1 flex flex-col justify-center">
                <h3 className="text-2xl font-black mb-2 leading-none">{roomData.items[currentIndex].name}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{roomData.items[currentIndex].desc}</p>
              </div>
              <div className="p-8 flex justify-center space-x-6 pb-12">
                <button onClick={() => handleVote(false)} className="w-16 h-16 rounded-full bg-white border border-slate-100 text-red-500 flex items-center justify-center shadow-xl active:scale-90 transition-all"><X size={32} strokeWidth={3} /></button>
                <button onClick={() => handleVote(true)} className="w-16 h-16 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xl active:scale-90 transition-all"><Heart size={32} fill="white" /></button>
              </div>
            </div>
          </div>
        )}

        {view === 'match' && roomData && (
          <div className="text-center space-y-8 py-10 animate-in zoom-in duration-500">
            <div className="inline-block bg-yellow-400 p-6 rounded-full text-white shadow-2xl animate-bounce">
              <Award size={48} />
            </div>
            <h2 className="text-5xl font-black italic tracking-tighter leading-none">MATCH!</h2>
            <div className="bg-white rounded-[2.5rem] shadow-2xl border-4 border-yellow-400 overflow-hidden transform rotate-2 mx-2">
               {(() => {
                 const matchId = Object.keys(roomData.votes).find(id => roomData.votes[id].length === roomData.participants.length);
                 const item = roomData.items.find(i => i.id === matchId) || roomData.items[0];
                 return (
                   <>
                    <img src={item.img} className="h-56 w-full object-cover" />
                    <div className="p-6">
                      <h3 className="text-2xl font-black mb-4">{item.name}</h3>
                      <button className="w-full bg-green-500 text-white py-4 rounded-2xl font-black shadow-lg uppercase tracking-tight">Korting Pakken</button>
                    </div>
                   </>
                 );
               })()}
            </div>
            <button onClick={() => setView('landing')} className="text-indigo-600 font-bold bg-indigo-50 px-8 py-3 rounded-2xl">Opnieuw beginnen</button>
          </div>
        )}

        {view === 'wallet' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl text-center border border-slate-50 relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1.5 bg-green-500"></div>
               <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center text-green-600 mx-auto mb-4">
                  <Coins size={32} />
               </div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Actueel Saldo</p>
               <h2 className="text-5xl font-black text-slate-900">€{balance.toFixed(2)}</h2>
               {balance < 5 && (
                 <div className="mt-4">
                   <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 transition-all duration-1000" style={{width: `${(balance/5)*100}%`}}></div>
                   </div>
                   <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-tight">Nog €{(5-balance).toFixed(2)} tot je €5 voucher</p>
                 </div>
               )}
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {isAnonymous ? <Lock className="text-orange-400" size={20}/> : <ShieldCheck className="text-green-500" size={20}/>}
                  <div>
                    <h4 className="text-sm font-bold">{isAnonymous ? "Gast Account" : "Account Beveiligd"}</h4>
                    <p className="text-[9px] text-slate-400 leading-none">Koppel Google om je saldo nooit te verliezen.</p>
                  </div>
                </div>
                {isAnonymous && (
                  <button onClick={handleSecureAccount} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-black active:scale-90 transition-all">KOPPELEN</button>
                )}
            </div>

            <div className="space-y-3">
              <button onClick={handleWatchAd} disabled={isWatchingAd} className="w-full bg-slate-900 text-white p-5 rounded-[2rem] font-black flex items-center justify-center shadow-xl active:scale-95 disabled:opacity-50 transition-all uppercase tracking-tight">
                {isWatchingAd ? 'Video speelt af...' : <><PlayCircle className="mr-2" /> Bekijk Video (+ €0,15)</>}
              </button>
              <button onClick={handleClaimVoucher} disabled={balance < 5} className={`w-full p-5 rounded-[2rem] font-black flex items-center justify-center border-2 transition-all uppercase tracking-tight ${balance >= 5 ? 'bg-green-500 text-white border-green-500 shadow-xl' : 'bg-white text-slate-200 border-slate-100 cursor-not-allowed'}`}>
                <Ticket className="mr-2" /> Claim €5 Voucher
              </button>
            </div>
            
            {vouchers.length > 0 && (
              <div className="pt-4">
                <h3 className="text-xs font-black text-slate-400 uppercase mb-4 tracking-widest px-2">Mijn Vouchers</h3>
                {vouchers.map((code, i) => (
                  <div key={i} className="bg-white p-4 rounded-2xl border border-dashed border-slate-300 flex justify-between items-center mb-2 animate-in slide-in-from-right">
                    <span className="font-mono font-bold text-indigo-600 tracking-wider">{code}</span>
                    <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-lg font-black uppercase">Actief</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'voucher_success' && (
          <div className="text-center space-y-8 py-10 animate-in zoom-in">
             <div className="bg-green-500 w-24 h-24 rounded-full flex items-center justify-center text-white mx-auto shadow-2xl">
                <CheckCircle2 size={48} strokeWidth={3} />
             </div>
             <div className="px-6">
                <h2 className="text-3xl font-black tracking-tighter">Code Gereed!</h2>
                <p className="text-slate-500 mt-2 text-sm">Gefeliciteerd! Gebruik de code hieronder bij het afrekenen voor €5 korting.</p>
             </div>
             <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] relative overflow-hidden shadow-2xl mx-2">
                <p className="text-[10px] text-slate-400 uppercase mb-2 font-black tracking-[0.3em]">Jouw Voucher</p>
                <p className="text-4xl font-mono font-black text-yellow-400 tracking-widest select-all uppercase">{lastClaimedCode}</p>
                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/5 rounded-full"></div>
             </div>
             <button onClick={() => setView('wallet')} className="bg-indigo-50 text-indigo-600 px-8 py-4 rounded-2xl font-bold active:scale-95 transition-all">Terug naar Wallet</button>
          </div>
        )}

        {view === 'info' && (
          <div className="space-y-6 animate-in fade-in py-4">
            <h2 className="text-3xl font-black italic tracking-tighter leading-none">Hulp & Info</h2>
            <div className="space-y-4">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <h3 className="font-black text-indigo-600 mb-2 flex items-center uppercase text-xs tracking-widest"><ShieldCheck size={16} className="mr-2"/> Privacy</h3>
                <p className="text-xs text-slate-500 leading-relaxed">VibeCheck respecteert jouw privacy. We verkopen je data nooit en gebruiken je locatie alleen om relevante opties te tonen.</p>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <h3 className="font-black text-green-600 mb-2 flex items-center uppercase text-xs tracking-widest"><Scale size={16} className="mr-2"/> Voorwaarden</h3>
                <p className="text-xs text-slate-500 leading-relaxed">Punten zijn virtueel en uitsluitend inwisselbaar voor digitale vouchers. Misbruik van het ad-systeem leidt tot uitsluiting.</p>
              </div>
              <button onClick={() => alert("Account verwijderen...")} className="w-full flex items-center justify-between p-6 bg-red-50 rounded-3xl text-red-700 font-bold text-sm border border-red-100">
                <span>Account & Data Wissen</span>
                <Trash2 size={20} className="text-red-400" />
              </button>
            </div>
          </div>
        )}

        {view === 'waiting' && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6 animate-pulse py-20">
            <Users size={64} className="text-indigo-200" />
            <h2 className="text-2xl font-black px-10 leading-tight">Wachten op de rest...</h2>
            <p className="text-slate-400 text-sm italic">Zodra iedereen klaar is, verschijnt de match hier automatisch!</p>
          </div>
        )}

      </main>

      <footer className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-md border-t border-slate-100 p-4 flex justify-around items-center z-40">
        <button onClick={() => setView('landing')} className={`flex flex-col items-center space-y-1 transition-all ${['landing', 'swiping', 'lobby'].includes(view) ? 'text-indigo-600' : 'text-slate-300'}`}>
          <Heart size={20} fill={['landing', 'swiping', 'lobby'].includes(view) ? 'currentColor' : 'none'} />
          <span className="text-[10px] font-black uppercase tracking-tighter">Swipe</span>
        </button>
        <button onClick={() => setView('wallet')} className={`flex flex-col items-center space-y-1 transition-all ${['wallet', 'voucher_success'].includes(view) ? 'text-green-600' : 'text-slate-300'}`}>
          <Wallet size={20} />
          <span className="text-[10px] font-black uppercase tracking-tighter">Wallet</span>
        </button>
        <button onClick={() => setView('info')} className={`flex flex-col items-center space-y-1 transition-all ${view === 'info' ? 'text-slate-900' : 'text-slate-300'}`}>
          <Info size={20} />
          <span className="text-[10px] font-black uppercase tracking-tighter">Info</span>
        </button>
      </footer>

      {isWatchingAd && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center text-white p-10 animate-in fade-in">
           <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] mb-12">Ad loopt...</p>
           <PlayCircle size={80} className="text-indigo-500 animate-pulse mb-8" />
           <p className="text-lg font-bold text-center mt-10">Je saldo wordt verhoogd... <br/><span className="text-indigo-400 text-sm font-normal italic">Bedankt voor het kijken</span></p>
           <div className="w-48 h-1 bg-white/10 rounded-full mt-10 overflow-hidden">
              <div className="h-full bg-indigo-500 animate-[loading_3s_linear]" />
           </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes loading { from { width: 0%; } to { width: 100%; } }
      `}} />
    </div>
  );
}