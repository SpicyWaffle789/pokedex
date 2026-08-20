/* ============================================================
   PokeClicker Extra - Extension module for PokeClicker
   Adds: PokeBank, Wild Pokemon, Shiny clicks, Click Streaks,
   Elite buildings, Legacy system, Ascension system,
   Options menu, Stats tab, more upgrades, persistence
   ============================================================ */
(function(){
'use strict';

// ==================== CSS INJECTION ====================
var css = "\n\
/* Legacy panel */\n\
.ck-legacy{background:var(--surface);border:1px solid rgba(147,130,220,0.3);border-radius:10px;padding:10px 14px;margin-top:10px;text-align:center}\n\
.ck-legacy-title{font-size:11px;font-weight:700;color:rgba(147,130,220,0.8);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px}\n\
.ck-legacy-level{font-size:20px;font-weight:800;color:rgba(147,130,220,1);font-family:monospace}\n\
.ck-legacy-mult{font-size:12px;color:var(--text-dim);margin-top:2px}\n\
.ck-legacy-bar{width:100%;height:6px;background:var(--surface-hover);border-radius:3px;margin-top:6px;overflow:hidden}\n\
.ck-legacy-bar-fill{height:100%;background:linear-gradient(90deg,#7c3aed,#a78bfa);border-radius:3px;transition:width .3s}\n\
.ck-legacy-progress{font-size:10px;color:var(--text-muted);margin-top:4px}\n\
/* Ascension panel */\n\
.ck-ascension{background:var(--surface);border:1px solid rgba(0,188,212,0.3);border-radius:10px;padding:10px 14px;margin-top:10px;text-align:center}\n\
.ck-asc-title{font-size:11px;font-weight:700;color:rgba(0,188,212,0.8);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px}\n\
.ck-asc-level{font-size:20px;font-weight:800;color:rgba(0,188,212,1);font-family:monospace}\n\
.ck-asc-mult{font-size:12px;color:var(--text-dim);margin-top:2px}\n\
.ck-asc-bar{width:100%;height:6px;background:var(--surface-hover);border-radius:3px;margin-top:6px;overflow:hidden}\n\
.ck-asc-bar-fill{height:100%;background:linear-gradient(90deg,#00acc1,#00e5ff);border-radius:3px;transition:width .3s}\n\
.ck-asc-progress{font-size:10px;color:var(--text-muted);margin-top:4px}\n\
.ck-asc-btn{margin-top:6px;padding:4px 14px;border-radius:8px;border:1px solid rgba(0,188,212,0.4);background:rgba(0,188,212,0.1);color:rgba(0,188,212,1);font-size:11px;font-weight:700;cursor:pointer;transition:.2s}\n\
.ck-asc-btn:hover{background:rgba(0,188,212,0.2);border-color:rgba(0,188,212,0.6)}\n\
/* Options */\n\
.ck-options{padding:4px}\n\
.ck-opt-row{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;margin-bottom:6px;border-radius:10px;border:1px solid var(--border-light,rgba(205,214,244,0.06));background:var(--bg-mid,#1e1e2e)}\n\
.ck-opt-label{font-size:13px;font-weight:600;color:var(--text)}\n\
.ck-opt-desc{font-size:10px;color:var(--text-muted)}\n\
.ck-opt-toggle{position:relative;width:40px;height:22px;cursor:pointer;display:inline-block}\n\
.ck-opt-toggle input{opacity:0;width:0;height:0;position:absolute}\n\
.ck-opt-slider{position:absolute;inset:0;background:var(--surface-hover);border-radius:11px;transition:.2s}\n\
.ck-opt-slider:before{content:'';position:absolute;width:16px;height:16px;left:3px;top:3px;background:var(--text-muted);border-radius:50%;transition:.2s}\n\
.ck-opt-toggle input:checked+.ck-opt-slider{background:rgba(166,227,161,0.6)}\n\
.ck-opt-toggle input:checked+.ck-opt-slider:before{transform:translateX(18px);background:var(--ctp-green)}\n\
.ck-opt-btn{padding:8px 16px;border-radius:8px;border:1px solid var(--border);background:var(--surface-hover);color:var(--text);font-size:12px;font-weight:600;cursor:pointer;transition:.2s;text-align:center}\n\
.ck-opt-btn:hover{background:var(--surface-raise);border-color:var(--text-muted)}\n\
.ck-opt-btn.danger{border-color:rgba(243,139,168,0.4);color:var(--ctp-red)}\n\
.ck-opt-btn.danger:hover{background:rgba(243,139,168,0.15)}\n\
.ck-opt-info{font-size:11px;color:var(--text-muted);text-align:center;padding:8px;margin-top:4px}\n\
/* Stats grid */\n\
.ck-stats-grid{display:grid;grid-template-columns:1fr 1fr;gap:2px 16px;padding:4px}\n\
.ck-stats-grid .ck-sr{padding:5px 0;border-bottom:1px solid var(--border-light,rgba(205,214,244,0.06))}\n\
.ck-stats-grid .ck-sr .sl{font-size:12px}\n\
.ck-stats-grid .ck-sr .sv{font-size:12px}\n\
/* Milk background */\n\
.ck-milk{position:absolute;bottom:0;left:0;right:0;height:180px;background:linear-gradient(to top,rgba(205,214,244,0.06),transparent);pointer-events:none;z-index:0;overflow:hidden;border-radius:0 0 12px 12px}\n\
.ck-milk-pkmn{position:absolute;bottom:0;font-size:28px;animation:ckParadeWalk linear infinite;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.3))}\n\
@keyframes ckParadeWalk{0%{transform:translateX(-40px)}100%{transform:translateX(calc(100vw + 40px))}}\n\
/* Wild Pokemon */\n\
.ck-wild{position:fixed;width:52px;height:52px;cursor:pointer;z-index:9998;animation:ckWildRun 4s linear forwards;font-size:36px;filter:drop-shadow(0 0 10px rgba(166,227,161,0.5));transition:transform .1s}\n\
.ck-wild:hover{transform:scale(1.3)!important}\n\
@keyframes ckWildRun{0%{left:-60px}100%{left:calc(100vw + 60px)}}\n\
/* Click streak */\n\
.ck-streak{position:absolute;top:-28px;left:50%;transform:translateX(-50%);font-size:14px;font-weight:800;color:var(--ctp-peach);opacity:0;transition:opacity .2s;pointer-events:none;white-space:nowrap;text-shadow:0 0 10px rgba(250,179,135,0.6)}\n\
.ck-streak.active{opacity:1}\n\
/* Shiny click flash */\n\
.ck-shiny-flash{position:fixed;inset:0;background:radial-gradient(circle at 50% 50%,rgba(247,201,72,0.3),transparent 60%);pointer-events:none;z-index:9997;animation:ckShinyFlash .6s ease-out forwards}\n\
@keyframes ckShinyFlash{0%{opacity:1}100%{opacity:0}}\n\
/* PokeBank */\n\
.ck-bank{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:10px 14px;margin-top:10px;text-align:center}\n\
.ck-bank-title{font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px}\n\
.ck-bank-row{display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:6px}\n\
.ck-bank-row span{font-size:12px;color:var(--text-dim)}\n\
.ck-bank-row strong{color:var(--ctp-yellow);font-family:monospace}\n\
.ck-bank-btns{display:flex;gap:6px;justify-content:center}\n\
.ck-bank-btn{padding:4px 12px;border-radius:6px;border:1px solid var(--border);background:var(--surface-hover);color:var(--text);font-size:11px;font-weight:600;cursor:pointer;transition:.2s}\n\
.ck-bank-btn:hover{background:var(--surface-raise);border-color:var(--text-muted)}\n\
.ck-bank-btn.deposit{border-color:rgba(166,227,161,0.4);color:var(--ctp-green)}\n\
.ck-bank-btn.withdraw{border-color:rgba(243,139,168,0.4);color:var(--ctp-red)}\n\
/* Prestige upgrades */\n\
.ck-prestige-upg{display:flex;align-items:center;gap:10px;padding:10px 12px;margin-bottom:6px;border-radius:10px;border:1px solid rgba(247,201,72,0.15);background:rgba(247,201,72,0.05);cursor:pointer;transition:all .2s}\n\
.ck-prestige-upg:hover:not(.locked):not(.bought){border-color:var(--ctp-yellow);background:rgba(247,201,72,0.1);transform:translateX(3px)}\n\
.ck-prestige-upg.locked{opacity:.35;cursor:not-allowed}\n\
.ck-prestige-upg.bought{border-color:var(--ctp-green);opacity:.6;cursor:default}\n\
.ck-prestige-upg .ck-pui{font-size:22px;min-width:32px;text-align:center}\n\
.ck-prestige-upg .ck-puu{font-size:12px;font-weight:700;color:var(--ctp-yellow)}\n\
.ck-prestige-upg .ck-pud{font-size:10px;color:var(--text-muted)}\n\
.ck-prestige-upg .ck-puc{font-size:11px;color:var(--ctp-yellow);font-weight:600;margin-top:2px}\n\
.ck-prestige-upg .ck-pub{font-size:10px;color:var(--ctp-green);font-weight:600}\n\
/* Legacy upgrades */\n\
.ck-legacy-upg{display:flex;align-items:center;gap:10px;padding:10px 12px;margin-bottom:6px;border-radius:10px;border:1px solid rgba(147,130,220,0.15);background:rgba(147,130,220,0.05);cursor:pointer;transition:all .2s}\n\
.ck-legacy-upg:hover:not(.locked):not(.bought){border-color:rgba(147,130,220,0.6);background:rgba(147,130,220,0.1);transform:translateX(3px)}\n\
.ck-legacy-upg.locked{opacity:.35;cursor:not-allowed}\n\
.ck-legacy-upg.bought{border-color:var(--ctp-green);opacity:.6;cursor:default}\n\
.ck-legacy-upg .ck-lui{font-size:22px;min-width:32px;text-align:center}\n\
.ck-legacy-upg .ck-luu{font-size:12px;font-weight:700;color:rgba(147,130,220,1)}\n\
.ck-legacy-upg .ck-lud{font-size:10px;color:var(--text-muted)}\n\
.ck-legacy-upg .ck-lub{font-size:10px;color:var(--ctp-green);font-weight:600}\n\
/* Ascension upgrades */\n\
.ck-asc-upg{display:flex;align-items:center;gap:10px;padding:10px 12px;margin-bottom:6px;border-radius:10px;border:1px solid rgba(0,188,212,0.15);background:rgba(0,188,212,0.05);cursor:pointer;transition:all .2s}\n\
.ck-asc-upg:hover:not(.locked):not(.bought){border-color:rgba(0,188,212,0.6);background:rgba(0,188,212,0.1);transform:translateX(3px)}\n\
.ck-asc-upg.locked{opacity:.35;cursor:not-allowed}\n\
.ck-asc-upg.bought{border-color:var(--ctp-green);opacity:.6;cursor:default}\n\
.ck-asc-upg .ck-aui{font-size:22px;min-width:32px;text-align:center}\n\
.ck-asc-upg .ck-auu{font-size:12px;font-weight:700;color:rgba(0,188,212,1)}\n\
.ck-asc-upg .ck-aud{font-size:10px;color:var(--text-muted)}\n\
.ck-asc-upg .ck-aub{font-size:10px;color:var(--ctp-green);font-weight:600}\n\
.ck-asc-upg .ck-auc{font-size:11px;color:rgba(0,188,212,1);font-weight:600;margin-top:2px}\n\
/* Wild pokemon counter */\n\
.ck-shiny-counter{display:inline-flex;align-items:center;gap:4px}\n\
/* Eggs panel */\n\
.ck-eggs{background:var(--surface);border:1px solid rgba(250,179,135,0.3);border-radius:10px;padding:10px 14px;margin-top:10px;text-align:center}\n\
.ck-eggs .ck-bank-title{color:var(--ctp-peach)}\n\
.ck-eggs .ck-bank-row strong{color:var(--ctp-peach)}\n\
";
var styleEl = document.createElement('style');
styleEl.textContent = css;
document.head.appendChild(styleEl);

// ==================== GAME DATA ====================
var EXTRA_BUILDINGS = [
  {id:'elite4',name:'Elite Four Arena',icon:'\uD83C\uDFC6',desc:'Champions battling for prize coins.',baseCost:1e12,pps:10000},
  {id:'league',name:'Pokemon League',icon:'\uD83C\uDFDB\uFE0F',desc:'The ultimate coin-generating stadium.',baseCost:5e13,pps:55000},
  {id:'mewtwo_lab',name:'Mewtwo Clone Lab',icon:'\uD83D\uDD2E',desc:'Cloning Mewtwo for infinite coin power.',baseCost:1e15,pps:350000},
  {id:'eternatus',name:'Eternatus Core',icon:'\uD83D\uDC32',desc:'The Darkest Day fuels endless coin output.',baseCost:1e17,pps:2000000},
  {id:'cosmog',name:'Cosmog Nursery',icon:'\uD83E\uDE90',desc:'Raises the legendary creator of all coins.',baseCost:1e19,pps:12000000}
];

var CLICK_STREAK_NAMES = ['','Single','Double','Triple','Quad','Penta','Hexa','Hepta','Octa','Nona','Deca'];

function newExtraBuildings(){
  var a=[];
  var i;
  for(i=0;i<EXTRA_BUILDINGS.length;i++) a.push(0);
  return a;
}

var WILD_POKEMON = [
  {name:'Pikachu',icon:'\u26A1',coins:50},
  {name:'Eevee',icon:'\uD83D\uDC36',coins:75},
  {name:'Charmander',icon:'\uD83D\uDD25',coins:100},
  {name:'Squirtle',icon:'\uD83C\uDF0A',coins:80},
  {name:'Bulbasaur',icon:'\uD83C\uDF3F',coins:85},
  {name:'Jigglypuff',icon:'\uD83C\uDFB5',coins:60},
  {name:'Snorlax',icon:'\uD83D\uDCA4',coins:200},
  {name:'Psyduck',icon:'\uD83E\uDDFF',coins:90},
  {name:'Mew',icon:'\uD83C\uDF1F',coins:500},
  {name:'Ditto',icon:'\uD83D\uDD00',coins:150}
];

var PARADE_POKEMON = ['\u26A1','\uD83D\uDC36','\uD83D\uDD25','\uD83C\uDF0A','\uD83C\uDF3F','\uD83C\uDFB5','\uD83D\uDCA4','\uD83E\uDDFF','\uD83C\uDF1F','\uD83D\uDD00','\uD83D\uDC31','\uD83E\uDD8A','\uD83D\uDC3B','\uD83D\uDC3C','\uD83E\uDDA8'];

var EXTRA_CLICK_UPGRADES = [
  {id:'ec_diamond',name:'Diamond Pokeball',icon:'\uD83D\uDC8E',desc:'Click power x50.',cost:2e6,mult:50,req:1000000},
  {id:'ec_master',name:'Master Click',icon:'\uD83C\uDFF3\uFE0F',desc:'Click power x100.',cost:2e7,mult:100,req:10000000},
  {id:'ec_hyper',name:'Hyper Click',icon:'\u26A1',desc:'Click power x250.',cost:2e8,mult:250,req:100000000},
  {id:'ec_ultra',name:'Ultra Click',icon:'\uD83D\uDD2E',desc:'Click power x500.',cost:2e9,mult:500,req:1000000000},
  {id:'ec_omega',name:'Omega Click',icon:'\uD83C\uDF1F',desc:'Click power x1000.',cost:2e10,mult:1000,req:10000000000}
];

var EXTRA_BUILDING_UPGRADES = [];
var BLD_NAMES = ['Caterpie Colony','Pikachu Farm','Poke Gear Factory','Slowpoke Dojo','Alakazam Lab','Mewtwo Chamber','Dragonite Nest','Rayquaza Orbital','Arceus Dimension','Mega Rayquaza'];
var BLD_IDS = ['caterpie','pikachu','pokegear','slowpoke','alakazam','mewtwo','dragonite','rayquaza','arceus','megaRay'];
var BLD_BASE_COSTS = [15,100,1100,12000,130000,1400000,20000000,330000000,5100000000,75000000000];
var BLD_COST_MULTS = [1,10,100,1000,1e4,1e5,1e6,1e7,1e8,1e9];
var ii;
for(ii=0;ii<10;ii++){
  EXTRA_BUILDING_UPGRADES.push({
    id:BLD_IDS[ii]+'_mega',bid:BLD_IDS[ii],name:BLD_NAMES[ii]+' Mega',icon:'\uD83D\uDCA0',
    desc:BLD_NAMES[ii]+' output x5.',cost:Math.floor(BLD_BASE_COSTS[ii]*1000*BLD_COST_MULTS[ii]),
    req:25,mult:5
  });
  EXTRA_BUILDING_UPGRADES.push({
    id:BLD_IDS[ii]+'_giga',bid:BLD_IDS[ii],name:BLD_NAMES[ii]+' Giga',icon:'\uD83D\uDCA0\uD83D\uDCA0',
    desc:BLD_NAMES[ii]+' output x10.',cost:Math.floor(BLD_BASE_COSTS[ii]*100000*BLD_COST_MULTS[ii]),
    req:50,mult:10
  });
}

var PRESTIGE_UPGRADES = [
  {id:'pu_fastclick',name:'Turbo Pokeball',icon:'\uD83C\uDFCE\uFE0F',desc:'Click power x3 (persists prestige)',cost:5,effect:'clickMult',val:3},
  {id:'pu_interest',name:'PokeBank Pro',icon:'\uD83C\uDFE6',desc:'PokeBank interest rate doubled',cost:10,effect:'bankRate',val:2},
  {id:'pu_wild',name:'Safari Zone',icon:'\uD83C\uDF34',desc:'Wild Pokemon appear 2x as often',cost:20,effect:'wildRate',val:2},
  {id:'pu_shiny',name:'Shiny Charm',icon:'\u2728',desc:'Shiny Pokemon 3x more likely',cost:30,effect:'shinyRate',val:3},
  {id:'pu_streak',name:'Combo Master',icon:'\uD83D\uDD25',desc:'Click streak decays 50% slower',cost:15,effect:'streakDecay',val:0.5},
  {id:'pu_golden',name:'Golden Magnet',icon:'\uD83E\uDD47',desc:'Golden Pokeballs appear 2x as often',cost:25,effect:'goldenRate',val:2},
  {id:'pu_multi',name:'Mega Multiplier',icon:'\uD83D\uDCA0',desc:'All production x2',cost:50,effect:'globalMult',val:2},
  {id:'pu_lucky',name:'Lucky Star',icon:'\uD83C\uDF20',desc:'Lucky golden effect gives 2x coins',cost:40,effect:'luckyMult',val:2},
  {id:'pu_timewarp',name:'Time Warp',icon:'\u23F1\uFE0F',desc:'PPS x3 for 60s (one-time activation)',cost:60,effect:'timeWarp',val:3},
  {id:'pu_clickstorm',name:'Click Storm',icon:'\u26A1',desc:'Click power x5 for 30s (one-time)',cost:45,effect:'clickStorm',val:5},
  {id:'pu_egg',name:'Lucky Egg',icon:'\uD83E\uDD5A',desc:'Eggs hatch 2x faster with bigger rewards',cost:35,effect:'eggRate',val:2}
];

var LEGACY_UPGRADES = [
  {id:'lu_ancient',name:'Ancient Knowledge',icon:'\uD83D\uDCD6',desc:'All production x2',cost:0,reqLevel:1,mult:2},
  {id:'lu_capsule',name:'Time Capsule',icon:'\u23F0',desc:'All production x2',cost:0,reqLevel:3,mult:2},
  {id:'lu_eternal',name:'Eternal Power',icon:'\u2B50',desc:'All production x2',cost:0,reqLevel:5,mult:2},
  {id:'lu_cosmic',name:'Cosmic Force',icon:'\uD83C\uDF0C',desc:'All production x2',cost:0,reqLevel:7,mult:2},
  {id:'lu_infinity',name:'Infinity',icon:'\u221E',desc:'All production x5',cost:0,reqLevel:10,mult:5}
];

var ASCENSION_UPGRADES = [
  {id:'au_singularity',name:'Singularity',icon:'\uD83D\uDD35',desc:'Production x3',cost:1,mult:3},
  {id:'au_bigbang',name:'Big Bang',icon:'\uD83C\uDF08',desc:'Production x5',cost:2,mult:5},
  {id:'au_eternity',name:'Eternity',icon:'\uD83C\uDF1F',desc:'Production x10',cost:3,mult:10}
];

var LEGACY_THRESHOLDS = [0,1e9,1e10,1e11,1e12,1e13,1e14,1e15,1e16,1e17,1e18];

// ==================== EXTENDED STATE ====================
var XS = {
  bank:0, streak:0, streakTimer:0, lastClickTime:0,
  shinyCount:0, shinyClicks:0,
  wildCaught:0, wildSpawned:0,
  extraBuildings:newExtraBuildings(),
  prestigeUpgs:[false,false,false,false,false,false,false,false,false,false],
  extraClickUpgs:[false,false,false,false,false],
  extraBuildingUpgs:[],
  legacyUpgs:[false,false,false,false,false],
  ascensionUpgs:[false,false,false],
  totalInterestEarned:0,
  lifetimeEarned:0,
  legacyLevel:0,
  ascensionLevel:0,
  ascensionCount:0,
  stats:{bestStreak:0,totalCoinsFromClicks:0,totalCoinsFromBuildings:0}
};

var wildSpawnTimer = null;
var wildEl = null;
var timeWarpActive = false;
var timeWarpTimer = 0;
var clickStormActive = false;
var clickStormTimer = 0;
var eggBoostActive = false;
var eggBoostTimer = 0;
var eggBoostMult = 4;

// ==================== HELPERS ====================
function api(){ return window.ckAPI; }
function G(){ return api().G(); }
function fmt(n){ return api().fmt(n); }
function fmtTime(s){ return api().fmtTime(s); }
function totalPPS(){ return api().totalPPS(); }
function clickPow(){ return api().clickPow(); }
function getBUILDINGS(){ return api().BUILDINGS; }

function extraBPS(i){
  var base = EXTRA_BUILDINGS[i].pps;
  var owned = XS.extraBuildings[i];
  var mult = getExtraMult();
  return base * mult * owned;
}
function extraTotalPPS(){
  var t = 0;
  var i;
  for(i=0;i<EXTRA_BUILDINGS.length;i++) t += extraBPS(i);
  return t;
}
// Set extra income on API — includes extra buildings + legacy/ascension bonus on base buildings
window.ckAPI.extraIncome = function(dt){
  var extra = extraTotalPPS() * dt;
  var basePPS = api().totalPPS();
  var bonusMult = getLegacyMult() * getAscensionMult() * getAscensionUpgMult();
  if(bonusMult > 1 && basePPS > 0){
    extra += basePPS * (bonusMult - 1) * dt;
  }
  return extra;
};
function extraBCost(i){
  return Math.floor(EXTRA_BUILDINGS[i].baseCost * Math.pow(1.15, XS.extraBuildings[i]));
}

function getExtraMult(){
  var m = 1;
  if(hasPrestigeUpg('pu_multi')) m *= 2;
  m *= getLegacyMult();
  m *= getAscensionMult();
  m *= getAscensionUpgMult();
  return m;
}

function hasPrestigeUpg(id){
  var i;
  for(i=0;i<PRESTIGE_UPGRADES.length;i++){
    if(PRESTIGE_UPGRADES[i].id===id && XS.prestigeUpgs[i]) return true;
  }
  return false;
}
function getPrestigeUpgVal(effect){
  var v = 1;
  var i;
  for(i=0;i<PRESTIGE_UPGRADES.length;i++){
    if(PRESTIGE_UPGRADES[i].effect===effect && XS.prestigeUpgs[i]) v *= PRESTIGE_UPGRADES[i].val;
  }
  return v;
}

function getLegacyMult(){
  var m = 1 + XS.legacyLevel * 0.5;
  var i;
  for(i=0;i<LEGACY_UPGRADES.length;i++){
    if(XS.legacyUpgs[i]) m *= LEGACY_UPGRADES[i].mult;
  }
  return m;
}
function getAscensionMult(){
  return 1 + XS.ascensionLevel * 1.0;
}
function getAscensionUpgMult(){
  var m = 1;
  var i;
  for(i=0;i<ASCENSION_UPGRADES.length;i++){
    if(XS.ascensionUpgs[i]) m *= ASCENSION_UPGRADES[i].mult;
  }
  return m;
}

function computeLegacyLevel(){
  var le = XS.lifetimeEarned;
  var i;
  for(i=LEGACY_THRESHOLDS.length-1;i>=1;i--){
    if(le >= LEGACY_THRESHOLDS[i]) return i;
  }
  return 0;
}

function computeAscensionLevel(){
  if(XS.lifetimeEarned < 1e12) return 0;
  return Math.floor(Math.sqrt(XS.lifetimeEarned / 1e12));
}

function countArr(arr){
  var c = 0;
  var i;
  for(i=0;i<arr.length;i++) if(arr[i]) c++;
  return c;
}

// ==================== POKEBANK ====================
function bankDeposit(amt){
  var g = G();
  var actual = Math.min(amt, g.coins);
  if(actual <= 0) return;
  g.coins -= actual;
  XS.bank += actual;
  api().notify('Deposited '+fmt(actual)+' coins into PokeBank!');
}
function bankWithdraw(amt){
  var actual = Math.min(amt, XS.bank);
  if(actual <= 0) return;
  XS.bank -= actual;
  G().coins += actual;
  api().notify('Withdrew '+fmt(actual)+' coins from PokeBank!');
}
function bankDepositAll(){ bankDeposit(G().coins); }
function bankWithdrawAll(){ bankWithdraw(XS.bank); }
function bankInterest(dt){
  if(XS.bank <= 0) return;
  var rate = 0.01 * getPrestigeUpgVal('bankRate');
  var interest = XS.bank * rate * (dt / 10);
  XS.bank += interest;
  XS.totalInterestEarned += interest;
  G().totalEarned += interest;
}

// ==================== CLICK STREAKS ====================
function updateStreak(pow, e){
  var now = Date.now();
  var decayRate = getPrestigeUpgVal('streakDecay');
  var timeout = 2000 * decayRate;
  if(now - XS.lastClickTime < timeout){
    XS.streak = Math.min(XS.streak + 1, 10);
  } else {
    XS.streak = 1;
  }
  XS.streakTimer = 2;
  XS.lastClickTime = now;
  if(XS.streak > XS.stats.bestStreak) XS.stats.bestStreak = XS.streak;
  var streakEl = document.getElementById('ckStreak');
  if(streakEl){
    if(XS.streak >= 2){
      streakEl.textContent = CLICK_STREAK_NAMES[XS.streak] + ' x' + XS.streak;
      streakEl.classList.add('active');
    } else {
      streakEl.classList.remove('active');
    }
  }
}

// ==================== SHINY POKEMON ====================
function checkShiny(){
  var rate = 0.001 * getPrestigeUpgVal('shinyRate');
  if(Math.random() < rate){
    XS.shinyClicks++;
    XS.shinyCount++;
    api().notify('\u2728 SHINY POKEMON! \u2728 Click bonus x10!','golden');
    api().addNews('\u2728 A Shiny Pokemon appeared! \u2728');
    var flash = document.createElement('div');
    flash.className = 'ck-shiny-flash';
    document.body.appendChild(flash);
    setTimeout(function(){ if(flash.parentNode) flash.remove(); }, 600);
    return true;
  }
  return false;
}

// ==================== WILD POKEMON ====================
function spawnWild(){
  if(wildEl) return;
  var wrap = document.getElementById('ckGoldenWrap');
  if(!wrap) return;
  var pkmn = WILD_POKEMON[Math.floor(Math.random() * WILD_POKEMON.length)];
  var el = document.createElement('div');
  el.className = 'ck-wild';
  el.textContent = pkmn.icon;
  el.title = 'Wild ' + pkmn.name + '! Click to catch!';
  var py = 150 + Math.random() * (window.innerHeight - 300);
  el.style.top = py + 'px';
  el.onclick = function(){ catchWild(pkmn); };
  wrap.appendChild(el);
  wildEl = el;
  XS.wildSpawned++;
  api().notify('A wild ' + pkmn.name + ' appeared! Click it!');
  api().addNews('Wild ' + pkmn.name + ' spotted!');
  setTimeout(function(){
    if(wildEl === el){ wildEl = null; el.style.opacity = '0'; setTimeout(function(){ if(el.parentNode) el.remove(); }, 300); }
  }, 4000);
}
function catchWild(pkmn){
  if(!wildEl) return;
  var el = wildEl;
  wildEl = null;
  el.style.transform = 'scale(1.5)';
  el.style.opacity = '0';
  setTimeout(function(){ if(el.parentNode) el.remove(); }, 300);
  var mult = G().prestigeMult * getExtraMult();
  var coins = Math.floor(pkmn.coins * mult * (1 + XS.wildCaught * 0.1));
  G().coins += coins;
  G().totalEarned += coins;
  XS.wildCaught++;
  api().notify('Caught ' + pkmn.name + '! +' + fmt(coins) + ' coins!');
  api().addNews('Caught wild ' + pkmn.name + '! +' + fmt(coins) + ' coins!');
  api().saveGame();
}
function scheduleWild(){
  var base = 45000 + Math.random() * 45000;
  var rate = getPrestigeUpgVal('wildRate');
  var delay = base / rate;
  wildSpawnTimer = setTimeout(function(){
    spawnWild();
    scheduleWild();
  }, delay);
}

// ==================== EGG HATCHING ====================
var EGG_POKEMON = [
  {name:'Pichu',icon:'\uD83D\uDC3F',mult:1},
  {name:'Igglybuff',icon:'\uD83D\uDC76',mult:1.2},
  {name:'Cleffa',icon:'\u2B50',mult:1.4},
  {name:'Togepi',icon:'\uD83E\uDD14',mult:1.6},
  {name:'Smoochum',icon:'\uD83D\uDC5D',mult:1.8},
  {name:'Elekid',icon:'\u26A1',mult:2},
  {name:'Magby',icon:'\uD83D\uDD25',mult:2.2},
  {name:'Riolu',icon:'\uD83D\uDC36',mult:2.5},
  {name:'Mime Jr.',icon:'\uD83C\uDFA9',mult:2.8},
  {name:'Happiny',icon:'\u2764\uFE0F',mult:3}
];
var EGG_INCUBATE_MS = 60000;
var EGG_MAX = 5;

function eggRateMult(){ return getPrestigeUpgVal('eggRate'); }
function addEgg(){
  var g=G();
  if(!g.eggs)g.eggs=[];
  if(g.eggs.length>=EGG_MAX)return false;
  var inc = EGG_INCUBATE_MS / eggRateMult();
  var now=Date.now();
  g.eggs.push({name:'Egg',icon:'\uD83E\uDD5A',start:now,hatchAt:now+inc});
  return true;
}
function checkEggDrops(){
  var rate = 0.004 * eggRateMult();
  if(Math.random()<rate)addEgg();
}
function hatchEggs(){
  var g=G();
  if(!g.eggs||!g.eggs.length)return;
  var now=Date.now();
  var hatched=[];
  for(var i=g.eggs.length-1;i>=0;i--){
    var e=g.eggs[i];
    if(now>=e.hatchAt){
      g.eggs.splice(i,1);
      hatched.push(e);
    }
  }
  hatched.forEach(function(e){
    g.eggHatched=(g.eggHatched||0)+1;
    var pkmn=EGG_POKEMON[Math.floor(Math.random()*EGG_POKEMON.length)];
    var pow=clickPow();
    var amt=Math.floor(pow*pkmn.mult*(10+Math.random()*40))*eggRateMult();
    g.coins+=amt;
    g.totalEarned+=amt;
    trackEarnedExt(amt);
    api().notify('\uD83E\uDD5A '+pkmn.name+' hatched! +'+fmt(amt)+' coins!','lucky');
    api().addNews('\uD83E\uDD5A '+pkmn.name+' hatched! +'+fmt(amt)+' coins!');
    if(Math.random()<0.2){
      eggBoostActive=true;
      eggBoostTimer=20;
      eggBoostMult=4;
      api().notify('\u2728 Lucky Egg! Click power x4 for 20 seconds!','golden');
      api().addNews('\u2728 Lucky Egg boost activated!');
    }
  });
}
function trackEarnedExt(amt){
  var g=G();
  if(!g.recentEarns)g.recentEarns=[];
  var now=Date.now();
  g.recentEarns.push({t:now,a:amt});
  while(g.recentEarns.length>0&&g.recentEarns[0].t<now-60000)g.recentEarns.shift();
}

// ==================== MILK BACKGROUND & PARADE ====================
function updateMilk(){
  var panel = document.getElementById('ckPanel');
  if(!panel) return;
  var milk = panel.querySelector('.ck-milk');
  if(!milk){
    milk = document.createElement('div');
    milk.className = 'ck-milk';
    panel.style.position = 'relative';
    panel.appendChild(milk);
  }
  milk.innerHTML = '';
  var g = G();
  var achs = g.achievements || [];
  var achCount = achs.length;
  var count = Math.min(Math.floor(achCount / 3), 12);
  var i;
  for(i = 0; i < count; i++){
    var p = document.createElement('div');
    p.className = 'ck-milk-pkmn';
    p.textContent = PARADE_POKEMON[i % PARADE_POKEMON.length];
    p.style.animationDuration = (15 + Math.random() * 20) + 's';
    p.style.animationDelay = (-Math.random() * 20) + 's';
    p.style.bottom = (Math.random() * 40) + 'px';
    p.style.fontSize = (20 + Math.random() * 14) + 'px';
    milk.appendChild(p);
  }
}

// ==================== PURCHASE FUNCTIONS ====================
window.ckBuyExtra = function(i, qty){
  qty = qty || 1;
  var g = G();
  var bought = 0;
  for(var k=0;k<qty;k++){
    var cost = extraBCost(i);
    if(g.coins < cost) break;
    g.coins -= cost;
    XS.extraBuildings[i]++;
    bought++;
  }
  if(bought>0){ api().renderPanel(); api().saveGame(); }
};

window.ckBuyPrestigeUpg = function(i){
  if(XS.prestigeUpgs[i]) return;
  var u = PRESTIGE_UPGRADES[i];
  var g = G();
  if(g.prestigeStars < u.cost) return;
  g.prestigeStars -= u.cost;
  XS.prestigeUpgs[i] = true;
  if(u.effect === 'timeWarp'){
    timeWarpActive = true;
    timeWarpTimer = 60;
    api().notify('Time Warp activated! PPS x3 for 60 seconds!','golden');
    api().addNews('Time Warp activated! x3 production!');
  }
  if(u.effect === 'clickStorm'){
    clickStormActive = true;
    clickStormTimer = 30;
    api().notify('Click Storm activated! Click x5 for 30 seconds!','golden');
    api().addNews('Click Storm activated! x5 clicks!');
  }
  api().renderPanel();
  api().saveGame();
  api().notify('Prestige upgrade: ' + u.name + ' unlocked!');
};

window.ckBuyExtraClickUpg = function(i){
  if(XS.extraClickUpgs[i]) return;
  var u = EXTRA_CLICK_UPGRADES[i];
  var g = G();
  if(g.coins < u.cost) return;
  if(g.totalClicks < u.req) return;
  g.coins -= u.cost;
  XS.extraClickUpgs[i] = true;
  api().renderPanel();
  api().saveGame();
  api().notify('Click upgrade: ' + u.name + ' unlocked!');
};

window.ckBuyExtraBuildingUpg = function(i){
  if(XS.extraBuildingUpgs[i]) return;
  var u = EXTRA_BUILDING_UPGRADES[i];
  var g = G();
  if(g.coins < u.cost) return;
  var BUILDINGS = getBUILDINGS();
  var bIdx = -1;
  var k;
  for(k=0;k<BUILDINGS.length;k++){
    if(BUILDINGS[k].id===u.bid){ bIdx=k; break; }
  }
  if(bIdx<0 || g.buildings[bIdx] < u.req) return;
  g.coins -= u.cost;
  XS.extraBuildingUpgs[i] = true;
  api().renderPanel();
  api().saveGame();
  api().notify('Building upgrade: ' + u.name + ' unlocked!');
};

window.ckBuyLegacyUpg = function(i){
  if(XS.legacyUpgs[i]) return;
  var u = LEGACY_UPGRADES[i];
  if(XS.legacyLevel < u.reqLevel) return;
  XS.legacyUpgs[i] = true;
  api().renderPanel();
  api().saveGame();
  api().notify('Legacy upgrade: ' + u.name + ' unlocked!');
};

window.ckBuyAscensionUpg = function(i){
  if(XS.ascensionUpgs[i]) return;
  var u = ASCENSION_UPGRADES[i];
  if(XS.ascensionLevel < u.cost) return;
  XS.ascensionUpgs[i] = true;
  api().renderPanel();
  api().saveGame();
  api().notify('Ascension upgrade: ' + u.name + ' unlocked!');
};

window.ckAscend = function(){
  var g = G();
  var newAscLevel = computeAscensionLevel();
  if(newAscLevel <= 0 && XS.ascensionCount === 0){
    api().notify('You need at least 1T lifetime earned to ascend!');
    return;
  }
  if(g.prestigeStars < 1000 && XS.ascensionCount === 0){
    api().notify('You need at least 1000 prestige stars to ascend for the first time!');
    return;
  }
  var confirmMsg = 'Ascension will RESET everything:\n';
  confirmMsg += '- Coins, buildings, upgrades\n';
  confirmMsg += '- Prestige stars, prestige count\n\n';
  confirmMsg += 'You will gain Ascension Level ' + newAscLevel + '\n';
  confirmMsg += 'Each level gives +100% production multiplier.\n\n';
  confirmMsg += 'Continue?';
  if(!confirm(confirmMsg)) return;
  XS.ascensionCount++;
  XS.ascensionLevel = newAscLevel;
  g.coins = 0;
  g.totalClicks = 0;
  g.totalEarned = 0;
  g.buildings = new Array(getBUILDINGS().length).fill(0);
  g.upgradeBought = new Array(g.upgradeBought.length).fill(false);
  g.prestigeStars = 0;
  g.prestigeCount = 0;
  g.frenzyMult = 1;
  g.clickFrenzyMult = 1;
  g.frenzyTimer = 0;
  g.clickFrenzyTimer = 0;
  g.recentEarns = [];
  XS.extraBuildings = newExtraBuildings();
  XS.prestigeUpgs = [];
  var pi;
  for(pi=0;pi<PRESTIGE_UPGRADES.length;pi++) XS.prestigeUpgs.push(false);
  XS.extraClickUpgs = [];
  var ci;
  for(ci=0;ci<EXTRA_CLICK_UPGRADES.length;ci++) XS.extraClickUpgs.push(false);
  XS.extraBuildingUpgs = [];
  var bi;
  for(bi=0;bi<EXTRA_BUILDING_UPGRADES.length;bi++) XS.extraBuildingUpgs.push(false);
  XS.bank = 0;
  XS.streak = 0;
  XS.streakTimer = 0;
  XS.lastClickTime = 0;
  timeWarpActive = false;
  timeWarpTimer = 0;
  clickStormActive = false;
  clickStormTimer = 0;
  eggBoostActive = false;
  eggBoostTimer = 0;
  eggBoostMult = 4;
  g.prestigeMult = 1;
  api().notify('ASCENDED! Level ' + XS.ascensionLevel + ' reached! x' + getAscensionMult().toFixed(0) + ' global multiplier!','golden');
  api().addNews('Ascension! Ascension Level ' + XS.ascensionLevel + '!');
  api().saveGame();
  api().renderPanel();
};

// ==================== OPTIONS ====================
window.ckToggleParticles = function(){
  api().toggleConfig('particles');
  api().renderPanel();
};
window.ckToggleSparkles = function(){
  api().toggleConfig('sparkles');
  api().renderPanel();
};
window.ckToggleNotifs = function(){
  api().toggleConfig('notifs');
  api().renderPanel();
};
window.ckExportSave = function(){
  var data = localStorage.getItem('pokeClickerV2');
  if(data){
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(data).then(function(){
        api().notify('Save data copied to clipboard!');
      }).catch(function(){
        api().notify('Failed to copy to clipboard.');
      });
    } else {
      api().notify('Clipboard not available.');
    }
  }
};
window.ckImportSave = function(){
  var input = prompt('Paste your save data below:');
  if(input && input.length > 10){
    try{
      JSON.parse(input);
      localStorage.setItem('pokeClickerV2', input);
      api().notify('Save imported! Reloading...');
      setTimeout(function(){ location.reload(); }, 500);
    }catch(e){
      api().notify('Invalid save data!');
    }
  }
};
window.ckResetGame = function(){
  if(confirm('Are you sure you want to reset ALL progress?\nThis cannot be undone!')){
    localStorage.removeItem('pokeClickerV2');
    location.reload();
  }
};

// ==================== TAB MANAGEMENT ====================
var _origCkTab = window.ckTab;
window.ckTab = function(name, btn){
  if(name === 'stats' || name === 'options'){
    var panel = document.getElementById('ckPanel');
    if(!panel) return;
    var tabs = document.querySelectorAll('.ck-tab');
    var ti;
    for(ti=0;ti<tabs.length;ti++) tabs[ti].classList.remove('active');
    if(btn) btn.classList.add('active');
    if(name === 'stats') renderStatsTab(panel);
    else if(name === 'options') renderOptionsTab(panel);
    return;
  }
  if(_origCkTab) _origCkTab(name, btn);
};

// ==================== RENDERING ====================
function renderExtraBuildings(html){
  var BUILDINGS = getBUILDINGS();
  var i;
  var total = totalPPS() + extraTotalPPS() * getExtraMult();
  html += '<div class="ck-section-title">Elite Buildings</div>';
  for(i = 0; i < EXTRA_BUILDINGS.length; i++){
    var b = EXTRA_BUILDINGS[i];
    var cost = extraBCost(i);
    var g = G();
    var canBuy = g.coins >= cost;
    var owned = XS.extraBuildings[i];
    var contrib = extraBPS(i) * getExtraMult();
    var pct = total>0?Math.min(100,(contrib/total)*100):0;
    html += '<div class="ck-bld'+(canBuy?'':' locked')+'" onclick="ckBuyExtra('+i+')">';
    html += '<div class="ck-bi">'+b.icon+'</div>';
    html += '<div class="ck-binfo">';
    html += '<div class="ck-bn">'+b.name+'</div>';
    html += '<div class="ck-bd">'+b.desc+'</div>';
    html += '<div class="ck-bm">';
    html += '<span class="ck-bc">'+fmt(cost)+' coins</span>';
    html += '<span class="ck-bo">Owned: '+owned+'</span>';
    if(contrib > 0) html += '<span class="ck-bp">+'+fmt(contrib)+'/s</span>';
    html += '</div>';
    html += '<div class="ck-bbar"><div class="ck-bbar-fill" style="width:'+Math.min(pct,100)+'%"></div></div>';
    html += '</div>';
    html += '<div class="ck-bulk">';
    html += '<div class="ck-bulk-row">';
    html += '<button class="ck-bulk-btn" onclick="event.stopPropagation();ckBuyExtra('+i+',10)">×10</button>';
    html += '<button class="ck-bulk-btn buy100" onclick="event.stopPropagation();ckBuyExtra('+i+',100)">×100</button>';
    html += '<button class="ck-bulk-btn max" onclick="event.stopPropagation();ckBuyExtra('+i+',999999)">MAX</button>';
    html += '</div></div>';
    html += '</div>';
  }
  return html;
}

function renderClickUpgradesExtra(html){
  var i;
  html += '<div class="ck-section-title">Advanced Click Upgrades</div>';
  for(i = 0; i < EXTRA_CLICK_UPGRADES.length; i++){
    var u = EXTRA_CLICK_UPGRADES[i];
    var owned = XS.extraClickUpgs[i];
    var g = G();
    var reqMet = g.totalClicks >= u.req;
    var canBuy = g.coins >= u.cost && reqMet && !owned;
    var cls = 'ck-upg';
    if(owned) cls += ' bought';
    else if(!canBuy) cls += ' locked';
    html += '<div class="'+cls+'" onclick="ckBuyExtraClickUpg('+i+')">';
    html += '<div class="ck-ui">'+u.icon+'</div>';
    html += '<div style="flex:1">';
    html += '<div class="ck-uu">'+u.name+'</div>';
    html += '<div class="ck-ud">'+u.desc+'</div>';
    if(owned) html += '<div class="ck-ub">Purchased!</div>';
    else if(!reqMet) html += '<div class="ck-ur">Requires '+fmt(u.req)+' clicks</div>';
    else html += '<div class="ck-uc">'+fmt(u.cost)+' coins</div>';
    html += '</div></div>';
  }
  return html;
}

function renderBuildingUpgradesExtra(html){
  var BUILDINGS = getBUILDINGS();
  var i;
  html += '<div class="ck-section-title">Mega & Giga Building Upgrades</div>';
  for(i = 0; i < EXTRA_BUILDING_UPGRADES.length; i++){
    var u = EXTRA_BUILDING_UPGRADES[i];
    var owned = XS.extraBuildingUpgs[i];
    var g = G();
    var bIdx = -1;
    var k;
    for(k=0;k<BUILDINGS.length;k++){
      if(BUILDINGS[k].id===u.bid){ bIdx=k; break; }
    }
    var reqMet = bIdx>=0 && g.buildings[bIdx]>=u.req;
    var canBuy = g.coins>=u.cost && reqMet && !owned;
    var cls = 'ck-upg';
    if(owned) cls += ' bought';
    else if(!canBuy) cls += ' locked';
    html += '<div class="'+cls+'" onclick="ckBuyExtraBuildingUpg('+i+')">';
    html += '<div class="ck-ui">'+u.icon+'</div>';
    html += '<div style="flex:1">';
    html += '<div class="ck-uu">'+u.name+'</div>';
    html += '<div class="ck-ud">'+u.desc+'</div>';
    if(owned) html += '<div class="ck-ub">Purchased!</div>';
    else if(!reqMet) html += '<div class="ck-ur">Requires '+u.req+' '+(bIdx>=0?BUILDINGS[bIdx].name:'building')+'</div>';
    else html += '<div class="ck-uc">'+fmt(u.cost)+' coins</div>';
    html += '</div></div>';
  }
  return html;
}

function renderPrestigeUpgradesExtra(html){
  var i;
  html += '<div class="ck-section-title">Prestige Upgrades</div>';
  html += '<div style="font-size:11px;color:var(--text-muted);margin-bottom:8px;padding:0 4px">Spend Shiny Stars. These persist through prestige.</div>';
  for(i = 0; i < PRESTIGE_UPGRADES.length; i++){
    var u = PRESTIGE_UPGRADES[i];
    var owned = XS.prestigeUpgs[i];
    var g = G();
    var canBuy = g.prestigeStars >= u.cost && !owned;
    var cls = 'ck-prestige-upg';
    if(owned) cls += ' bought';
    else if(!canBuy) cls += ' locked';
    html += '<div class="'+cls+'" onclick="ckBuyPrestigeUpg('+i+')">';
    html += '<div class="ck-pui">'+u.icon+'</div>';
    html += '<div style="flex:1">';
    html += '<div class="ck-puu">'+u.name+'</div>';
    html += '<div class="ck-pud">'+u.desc+'</div>';
    if(owned) html += '<div class="ck-pub">Unlocked!</div>';
    else html += '<div class="ck-puc">'+u.cost+' Shiny Stars</div>';
    html += '</div></div>';
  }
  return html;
}

function renderLegacyUpgrades(html){
  var i;
  html += '<div class="ck-section-title">Legacy Upgrades</div>';
  html += '<div style="font-size:11px;color:var(--text-muted);margin-bottom:8px;padding:0 4px">Unlocked automatically based on Legacy Level.</div>';
  for(i = 0; i < LEGACY_UPGRADES.length; i++){
    var u = LEGACY_UPGRADES[i];
    var owned = XS.legacyUpgs[i];
    var levelMet = XS.legacyLevel >= u.reqLevel;
    var cls = 'ck-legacy-upg';
    if(owned) cls += ' bought';
    else if(!levelMet) cls += ' locked';
    html += '<div class="'+cls+'" onclick="ckBuyLegacyUpg('+i+')">';
    html += '<div class="ck-lui">'+u.icon+'</div>';
    html += '<div style="flex:1">';
    html += '<div class="ck-luu">'+u.name+'</div>';
    html += '<div class="ck-lud">'+u.desc+'</div>';
    if(owned) html += '<div class="ck-lub">Unlocked!</div>';
    else if(!levelMet) html += '<div class="ck-ur">Requires Legacy Level '+u.reqLevel+'</div>';
    else html += '<div class="ck-lub">Available! Click to unlock</div>';
    html += '</div></div>';
  }
  return html;
}

function renderAscensionUpgrades(html){
  var i;
  html += '<div class="ck-section-title">Ascension Upgrades</div>';
  html += '<div style="font-size:11px;color:var(--text-muted);margin-bottom:8px;padding:0 4px">Spend Ascension Levels. These persist through ascension.</div>';
  for(i = 0; i < ASCENSION_UPGRADES.length; i++){
    var u = ASCENSION_UPGRADES[i];
    var owned = XS.ascensionUpgs[i];
    var canBuy = XS.ascensionLevel >= u.cost && !owned;
    var cls = 'ck-asc-upg';
    if(owned) cls += ' bought';
    else if(!canBuy) cls += ' locked';
    html += '<div class="'+cls+'" onclick="ckBuyAscensionUpg('+i+')">';
    html += '<div class="ck-aui">'+u.icon+'</div>';
    html += '<div style="flex:1">';
    html += '<div class="ck-auu">'+u.name+'</div>';
    html += '<div class="ck-aud">'+u.desc+'</div>';
    if(owned) html += '<div class="ck-aub">Unlocked!</div>';
    else html += '<div class="ck-auc">'+u.cost+' Ascension Level'+(u.cost>1?'s':'')+'</div>';
    html += '</div></div>';
  }
  return html;
}

// ==================== STATS TAB ====================
function renderStatsTab(panel){
  var g = G();
  g.timePlayed = (Date.now() - g.startTime) / 1000;
  var totalBldOwned = 0;
  var i;
  for(i=0;i<g.buildings.length;i++) totalBldOwned += g.buildings[i];
  var totalExtraBldOwned = 0;
  for(i=0;i<XS.extraBuildings.length;i++) totalExtraBldOwned += XS.extraBuildings[i];

  var rows = [
    ['Total Clicks', fmt(g.totalClicks)],
    ['Total Earned', fmt(g.totalEarned)],
    ['Coins/sec', fmt(totalPPS() + extraTotalPPS() * getExtraMult())],
    ['Coins/click', fmt(clickPow())],
    ['Buildings Owned', (totalBldOwned + totalExtraBldOwned).toString()],
    ['Upgrades Bought', (countArr(XS.prestigeUpgs) + countArr(XS.extraClickUpgs) + countArr(XS.extraBuildingUpgs)).toString()],
    ['Shiny Pokemon caught', XS.shinyCount.toString()],
    ['Shiny clicks (bonus)', XS.shinyClicks.toString()],
    ['Wild Pokemon spawned', XS.wildSpawned.toString()],
    ['Wild Pokemon caught', XS.wildCaught.toString()],
    ['Golden Pokeballs clicked', g.goldenClicked.toString()],
    ['Prestige count', g.prestigeCount.toString()],
    ['Prestige stars', g.prestigeStars.toString()],
    ['Prestige multiplier', 'x' + g.prestigeMult.toFixed(2)],
    ['Best click streak', XS.stats.bestStreak.toString()],
    ['Eggs hatched', (g.eggHatched||0).toString()],
    ['PokeBank balance', fmt(XS.bank)],
    ['Total interest earned', fmt(XS.totalInterestEarned)],
    ['Legacy level', XS.legacyLevel.toString()],
    ['Legacy multiplier', 'x' + getLegacyMult().toFixed(0)],
    ['Ascension level', XS.ascensionLevel.toString()],
    ['Ascension multiplier', 'x' + getAscensionMult().toFixed(0)],
    ['Time played', fmtTime(g.timePlayed)],
    ['Highest coins/sec ever', fmt(g.highestPPS)],
    ['Achievements', g.achievements.length.toString()]
  ];

  var html = '<div class="ck-stats-grid">';
  for(i=0;i<rows.length;i++){
    html += '<div class="ck-sr"><span class="sl">'+rows[i][0]+'</span><span class="sv">'+rows[i][1]+'</span></div>';
  }
  html += '</div>';
  panel.innerHTML = html;
}

// ==================== OPTIONS TAB ====================
function renderOptionsTab(panel){
  var cfg = api().CFG;
  var html = '<div class="ck-options">';
  html += '<div class="ck-opt-row">';
  html += '<div><div class="ck-opt-label">Particles</div><div class="ck-opt-desc">Click particle effects</div></div>';
  html += '<label class="ck-opt-toggle"><input type="checkbox" '+(cfg.particles?'checked':'')+' onchange="ckToggleParticles()"><span class="ck-opt-slider"></span></label>';
  html += '</div>';
  html += '<div class="ck-opt-row">';
  html += '<div><div class="ck-opt-label">Sparkles</div><div class="ck-opt-desc">Click sparkle effects</div></div>';
  html += '<label class="ck-opt-toggle"><input type="checkbox" '+(cfg.sparkles?'checked':'')+' onchange="ckToggleSparkles()"><span class="ck-opt-slider"></span></label>';
  html += '</div>';
  html += '<div class="ck-opt-row">';
  html += '<div><div class="ck-opt-label">Notifications</div><div class="ck-opt-desc">Popup notifications</div></div>';
  html += '<label class="ck-opt-toggle"><input type="checkbox" '+(cfg.notifs?'checked':'')+' onchange="ckToggleNotifs()"><span class="ck-opt-slider"></span></label>';
  html += '</div>';
  html += '<div class="ck-opt-row">';
  html += '<div><div class="ck-opt-label">Export Save</div><div class="ck-opt-desc">Copy save data to clipboard</div></div>';
  html += '<button class="ck-opt-btn" onclick="ckExportSave()">Export</button>';
  html += '</div>';
  html += '<div class="ck-opt-row">';
  html += '<div><div class="ck-opt-label">Import Save</div><div class="ck-opt-desc">Paste save data from clipboard</div></div>';
  html += '<button class="ck-opt-btn" onclick="ckImportSave()">Import</button>';
  html += '</div>';
  html += '<div class="ck-opt-row">';
  html += '<div><div class="ck-opt-label">Reset Game</div><div class="ck-opt-desc">Delete all progress permanently</div></div>';
  html += '<button class="ck-opt-btn danger" onclick="ckResetGame()">Reset</button>';
  html += '</div>';
  html += '<div class="ck-opt-info">Game saves automatically every 5s</div>';
  html += '</div>';
  panel.innerHTML = html;
}

// ==================== LEFT PANEL EXTRA UI ====================
function updateLeftPanel(){
  var left = document.querySelector('.ck-left');
  if(!left) return;

  var ball = document.getElementById('ckPokeball');
  if(ball){
    var streakEl = document.getElementById('ckStreak');
    if(!streakEl){
      streakEl = document.createElement('div');
      streakEl.id = 'ckStreak';
      streakEl.className = 'ck-streak';
      ball.appendChild(streakEl);
    }
  }

  // Legacy panel
  var legacyEl = left.querySelector('.ck-legacy');
  if(!legacyEl){
    legacyEl = document.createElement('div');
    legacyEl.className = 'ck-legacy';
    var after = left.querySelector('.ck-prestige-bar');
    if(after && after.nextSibling) left.insertBefore(legacyEl, after.nextSibling);
    else left.appendChild(legacyEl);
  }
  var nextLevel = XS.legacyLevel < 10 ? LEGACY_THRESHOLDS[XS.legacyLevel + 1] : null;
  var progress = 0;
  var progressText = '';
  if(XS.legacyLevel >= 10){
    progress = 100;
    progressText = 'Max Level!';
  } else if(nextLevel !== null){
    var prevThresh = LEGACY_THRESHOLDS[XS.legacyLevel];
    progress = Math.min(100, ((XS.lifetimeEarned - prevThresh) / (nextLevel - prevThresh)) * 100);
    progressText = fmt(XS.lifetimeEarned) + ' / ' + fmt(nextLevel) + ' lifetime earned';
  } else {
    progress = 100;
    progressText = 'Max Level!';
  }
  legacyEl.innerHTML = '<div class="ck-legacy-title">Legacy</div>'
    + '<div class="ck-legacy-level">Level ' + XS.legacyLevel + '</div>'
    + '<div class="ck-legacy-mult">Multiplier: x' + getLegacyMult().toFixed(0) + '</div>'
    + '<div class="ck-legacy-bar"><div class="ck-legacy-bar-fill" style="width:' + progress + '%"></div></div>'
    + '<div class="ck-legacy-progress">' + progressText + '</div>';

  // Ascension panel
  var ascEl = left.querySelector('.ck-ascension');
  if(!ascEl){
    ascEl = document.createElement('div');
    ascEl.className = 'ck-ascension';
    if(legacyEl && legacyEl.nextSibling) left.insertBefore(ascEl, legacyEl.nextSibling);
    else left.appendChild(ascEl);
  }
  var showAsc = XS.ascensionCount > 0 || computeAscensionLevel() > 0;
  if(showAsc || XS.prestigeStars >= 1000){
    ascEl.style.display = '';
    ascEl.innerHTML = '<div class="ck-asc-title">Ascension</div>'
      + '<div class="ck-asc-level">Level ' + XS.ascensionLevel + '</div>'
      + '<div class="ck-asc-mult">Multiplier: x' + getAscensionMult().toFixed(0) + ' | Count: ' + XS.ascensionCount + '</div>'
      + '<button class="ck-asc-btn" onclick="ckAscend()">Ascend</button>';
  } else {
    ascEl.style.display = 'none';
  }

  // PokeBank
  var bankEl = left.querySelector('.ck-bank');
  if(!bankEl){
    bankEl = document.createElement('div');
    bankEl.className = 'ck-bank';
    var afterBank = left.querySelector('.ck-ascension') || left.querySelector('.ck-legacy') || left.querySelector('.ck-prestige-bar');
    if(afterBank && afterBank.nextSibling) left.insertBefore(bankEl, afterBank.nextSibling);
    else left.appendChild(bankEl);
  }
  var rate = (1 * getPrestigeUpgVal('bankRate'));
  bankEl.innerHTML = '<div class="ck-bank-title">PokeBank</div>'
    + '<div class="ck-bank-row"><span>Stored:</span> <strong>'+fmt(XS.bank)+'</strong></div>'
    + '<div class="ck-bank-row"><span>Interest:</span> <strong>'+rate.toFixed(0)+'%/10s</strong></div>'
    + '<div class="ck-bank-btns">'
    + '<button class="ck-bank-btn deposit" onclick="ckBankDeposit()">Deposit All</button>'
    + '<button class="ck-bank-btn withdraw" onclick="ckBankWithdraw()">Withdraw All</button>'
    + '</div>';

  // Eggs panel
  var g=G();
  var eggsEl = left.querySelector('.ck-eggs');
  if(!eggsEl){
    eggsEl = document.createElement('div');
    eggsEl.className = 'ck-eggs';
    var afterEggs = left.querySelector('.ck-bank') || left.querySelector('.ck-ascension') || left.querySelector('.ck-legacy');
    if(afterEggs && afterEggs.nextSibling) left.insertBefore(eggsEl, afterEggs.nextSibling);
    else left.appendChild(eggsEl);
  }
  var eggs = g.eggs || [];
  var eggHtml = '<div class="ck-bank-title">\uD83E\uDD5A Eggs</div>';
  if(eggBoostActive){
    eggHtml += '<div class="ck-bank-row"><strong style="color:var(--ctp-red)">\u2728 Lucky Egg x'+eggBoostMult+' '+Math.ceil(eggBoostTimer)+'s</strong></div>';
  }
  if(eggs.length===0){
    eggHtml += '<div class="ck-bank-row"><span style="color:var(--text-muted)">No eggs. Click / catch goldens to find some!</span></div>';
  }else{
    eggs.forEach(function(e,idx){
      var span = e.hatchAt - (e.start||(e.hatchAt - EGG_INCUBATE_MS/eggRateMult()));
      var pct = span>0?Math.min(100,(Date.now()-e.start)/span*100):100;
      if(pct<0)pct=0;
      eggHtml += '<div class="ck-bank-row" style="flex-direction:column;align-items:stretch;gap:3px">'
        + '<div style="display:flex;justify-content:space-between;align-items:center">'
        + '<span>'+(e.icon||'\uD83E\uDD5A')+' Egg #'+(idx+1)+'</span>'
        + '<span style="font-family:monospace">'+Math.ceil((e.hatchAt-Date.now())/1000)+'s</span>'
        + '</div>'
        + '<div class="ck-bbar" style="width:100%"><div class="ck-bbar-fill" style="width:'+pct+'%"></div></div>'
        + '</div>';
    });
  }
  eggHtml += '<div class="ck-bank-row"><span style="font-size:10px;color:var(--text-muted)">Hatched: '+ (g.eggHatched||0) +'</span></div>';
  eggsEl.innerHTML = eggHtml;
}

// ==================== ADD TABS ====================
function addExtraTabs(){
  var tabsContainer = document.querySelector('.ck-tabs');
  if(!tabsContainer) return;
  var existing = tabsContainer.querySelectorAll('.ck-tab');
  var hasStats = false;
  var hasOptions = false;
  var i;
  for(i=0;i<existing.length;i++){
    var oc = existing[i].getAttribute('onclick') || '';
    if(oc.indexOf("'stats'") !== -1) hasStats = true;
    if(oc.indexOf("'options'") !== -1) hasOptions = true;
  }
  if(!hasStats){
    var statsBtn = document.createElement('button');
    statsBtn.className = 'ck-tab';
    statsBtn.setAttribute('onclick', "ckTab('stats',this)");
    statsBtn.textContent = 'Stats';
    tabsContainer.appendChild(statsBtn);
  }
  if(!hasOptions){
    var optsBtn = document.createElement('button');
    optsBtn.className = 'ck-tab';
    optsBtn.setAttribute('onclick', "ckTab('options',this)");
    optsBtn.textContent = 'Options';
    tabsContainer.appendChild(optsBtn);
  }
}

// ==================== HOOKS ====================

// Tick hook
api().onTick.push(function(dt){
  hatchEggs();
  bankInterest(dt);
  if(XS.streakTimer > 0){
    XS.streakTimer -= dt;
    if(XS.streakTimer <= 0){
      XS.streak = 0;
      var se = document.getElementById('ckStreak');
      if(se) se.classList.remove('active');
    }
  }
  if(timeWarpActive){
    timeWarpTimer -= dt;
    if(timeWarpTimer <= 0){
      timeWarpActive = false;
      timeWarpTimer = 0;
      api().notify('Time Warp ended!');
    }
  }
  if(clickStormActive){
    clickStormTimer -= dt;
    if(clickStormTimer <= 0){
      clickStormActive = false;
      clickStormTimer = 0;
      api().notify('Click Storm ended!');
    }
  }
  if(eggBoostActive){
    eggBoostTimer -= dt;
    if(eggBoostTimer <= 0){
      eggBoostActive = false;
      eggBoostTimer = 0;
      eggBoostMult = 4;
      api().notify('Lucky Egg boost ended!');
    }
  }
  var newLegacy = computeLegacyLevel();
  if(newLegacy > XS.legacyLevel){
    XS.legacyLevel = newLegacy;
    api().notify('Legacy Level Up! Now Level ' + XS.legacyLevel + '!','golden');
    api().addNews('Legacy Level Up! Level ' + XS.legacyLevel + '!');
  }
  var li;
  for(li=0;li<LEGACY_UPGRADES.length;li++){
    if(!XS.legacyUpgs[li] && XS.legacyLevel >= LEGACY_UPGRADES[li].reqLevel){
      XS.legacyUpgs[li] = true;
      api().notify('Legacy: ' + LEGACY_UPGRADES[li].name + ' auto-unlocked!');
      api().addNews('Legacy: ' + LEGACY_UPGRADES[li].name + ' unlocked!');
    }
  }
  var blds = document.querySelectorAll('.ck-bld');
  var g = G();
  var bArray = api().BUILDINGS;
  var ei;
  for(ei = 0; ei < EXTRA_BUILDINGS.length; ei++){
    var idx = bArray.length + ei;
    if(idx >= blds.length) break;
    var cost = extraBCost(ei);
    var canBuy = g.coins >= cost;
    if(canBuy) blds[idx].classList.remove('locked');
    else blds[idx].classList.add('locked');
    var costEl = blds[idx].querySelector('.ck-bc');
    if(costEl) costEl.textContent = fmt(cost)+' coins';
    var ownedEl = blds[idx].querySelector('.ck-bo');
    if(ownedEl) ownedEl.textContent = 'Owned: '+XS.extraBuildings[ei];
    var ppEl = blds[idx].querySelector('.ck-bp');
    var contrib = extraBPS(ei) * getExtraMult();
    if(ppEl){ if(contrib>0) ppEl.textContent='+'+fmt(contrib)+'/s'; }
  }
  updateLeftPanel();
});

// Click hook
api().onClick.push(function(pow, e){
  if(timeWarpActive) pow *= getPrestigeUpgVal('timeWarp');
  if(clickStormActive) pow *= getPrestigeUpgVal('clickStorm');
  if(eggBoostActive) pow *= eggBoostMult;
  var wasShiny = checkShiny();
  if(wasShiny){
    G().coins += pow * 9;
    G().totalEarned += pow * 9;
  }
  checkEggDrops();
  updateStreak(pow, e);
  XS.stats.totalCoinsFromClicks += pow;
});

// Golden hook: guaranteed egg drop
api().onGolden.push(function(){
  if(addEgg()){
    api().notify('\uD83E\uDD5A Found an Egg! It will hatch soon!');
    api().addNews('\uD83E\uDD5A Found an Egg!');
  }
});

// Prestige hook
api().onPrestige.push(function(gained){
  XS.extraBuildings = newExtraBuildings();
  XS.bank = 0;
  XS.streak = 0;
  XS.streakTimer = 0;
  XS.extraClickUpgs = [];
  var eci;
  for(eci=0;eci<EXTRA_CLICK_UPGRADES.length;eci++) XS.extraClickUpgs.push(false);
  XS.extraBuildingUpgs = [];
  var ebi;
  for(ebi=0;ebi<EXTRA_BUILDING_UPGRADES.length;ebi++) XS.extraBuildingUpgs.push(false);
  timeWarpActive = false;
  timeWarpTimer = 0;
  clickStormActive = false;
  clickStormTimer = 0;
  eggBoostActive = false;
  eggBoostTimer = 0;
  eggBoostMult = 4;
});

// Panel render hook
api().onPanelRender.push(function(){
  addExtraTabs();
  updateMilk();
  var tab = api().getTab();
  var panel = document.getElementById('ckPanel');
  if(!panel) return;
  if(tab === 'buildings'){
    var bh = renderExtraBuildings('');
    if(bh.trim().length) panel.innerHTML += bh;
  } else if(tab === 'upgrades'){
    var uh = renderClickUpgradesExtra('');
    uh += renderBuildingUpgradesExtra('');
    uh += renderPrestigeUpgradesExtra('');
    uh += renderLegacyUpgrades('');
    uh += renderAscensionUpgrades('');
    panel.innerHTML += uh;
  }
});

// Load hook
api().onLoad.push(function(){
  try{
    var raw = localStorage.getItem('pokeClickerV2');
    if(raw){
      var d = JSON.parse(raw);
      if(d.xs){
        XS.bank = d.xs.bank || 0;
        XS.shinyCount = d.xs.sc || d.xs.shinyCount || 0;
        XS.shinyClicks = d.xs.sk || d.xs.shinyClicks || 0;
        XS.wildCaught = d.xs.wc || d.xs.wildCaught || 0;
        XS.wildSpawned = d.xs.ws || d.xs.wildSpawned || 0;
        XS.extraBuildings = d.xs.eb || d.xs.extraBuildings || newExtraBuildings();
        XS.prestigeUpgs = d.xs.pu || d.xs.prestigeUpgs || [];
        XS.totalInterestEarned = d.xs.tie || d.xs.totalInterestEarned || 0;
        XS.lifetimeEarned = d.xs.le || d.xs.lifetimeEarned || 0;
        XS.legacyLevel = d.xs.ll || d.xs.legacyLevel || 0;
        XS.ascensionLevel = d.xs.al || d.xs.ascensionLevel || 0;
        XS.ascensionCount = d.xs.ac || d.xs.ascensionCount || 0;
        XS.ascensionUpgs = d.xs.ascensionUpgs || [];
        XS.extraClickUpgs = d.xs.extraClickUpgs || [];
        XS.extraBuildingUpgs = d.xs.extraBuildingUpgs || [];
        XS.legacyUpgs = d.xs.legacyUpgs || [];
        if(d.xs.stats) XS.stats = d.xs.stats;
      }
    }
  }catch(e){}
  while(XS.extraBuildings.length < EXTRA_BUILDINGS.length) XS.extraBuildings.push(0);
  while(XS.prestigeUpgs.length < PRESTIGE_UPGRADES.length) XS.prestigeUpgs.push(false);
  while(XS.extraClickUpgs.length < EXTRA_CLICK_UPGRADES.length) XS.extraClickUpgs.push(false);
  while(XS.extraBuildingUpgs.length < EXTRA_BUILDING_UPGRADES.length) XS.extraBuildingUpgs.push(false);
  while(XS.ascensionUpgs.length < ASCENSION_UPGRADES.length) XS.ascensionUpgs.push(false);
  while(XS.legacyUpgs.length < LEGACY_UPGRADES.length) XS.legacyUpgs.push(false);
  XS.legacyLevel = computeLegacyLevel();
});

// Save hook
api().onSave.push(function(data){
  data.xs = {
    bank: XS.bank,
    sc: XS.shinyCount, sk: XS.shinyClicks,
    wc: XS.wildCaught, ws: XS.wildSpawned,
    eb: XS.extraBuildings, pu: XS.prestigeUpgs,
    tie: XS.totalInterestEarned,
    le: XS.lifetimeEarned,
    ll: XS.legacyLevel,
    al: XS.ascensionLevel, ac: XS.ascensionCount,
    ascensionUpgs: XS.ascensionUpgs,
    extraClickUpgs: XS.extraClickUpgs,
    extraBuildingUpgs: XS.extraBuildingUpgs,
    legacyUpgs: XS.legacyUpgs,
    stats: XS.stats
  };
});

// ==================== GLOBAL EXPORTS ====================
window.ckBankDeposit = function(){ bankDepositAll(); };
window.ckBankWithdraw = function(){ bankWithdrawAll(); };

// ==================== LIFETIME EARNED TRACKING ====================
var _lastTotalEarned = 0;
api().onTick.push(function(dt){
  var g = G();
  var diff = g.totalEarned - _lastTotalEarned;
  if(diff > 0){
    XS.lifetimeEarned += diff;
  }
  _lastTotalEarned = g.totalEarned;
});

// ==================== INIT ====================
var initExtra = function(){
  if(!window.ckAPI || !window.ckAPI.G()) { setTimeout(initExtra, 200); return; }
  var g = G();
  if(!g) { setTimeout(initExtra, 200); return; }
  try{
    var raw = localStorage.getItem('pokeClickerV2');
    if(raw){
      var d = JSON.parse(raw);
      if(d.xs){
        XS.bank = d.xs.bank || 0;
        XS.shinyCount = d.xs.sc || d.xs.shinyCount || 0;
        XS.shinyClicks = d.xs.sk || d.xs.shinyClicks || 0;
        XS.wildCaught = d.xs.wc || d.xs.wildCaught || 0;
        XS.wildSpawned = d.xs.ws || d.xs.wildSpawned || 0;
        XS.extraBuildings = d.xs.eb || d.xs.extraBuildings || newExtraBuildings();
        XS.prestigeUpgs = d.xs.pu || d.xs.prestigeUpgs || [];
        XS.totalInterestEarned = d.xs.tie || d.xs.totalInterestEarned || 0;
        XS.lifetimeEarned = d.xs.le || d.xs.lifetimeEarned || 0;
        XS.legacyLevel = d.xs.ll || d.xs.legacyLevel || 0;
        XS.ascensionLevel = d.xs.al || d.xs.ascensionLevel || 0;
        XS.ascensionCount = d.xs.ac || d.xs.ascensionCount || 0;
        XS.ascensionUpgs = d.xs.ascensionUpgs || [];
        XS.extraClickUpgs = d.xs.extraClickUpgs || [];
        XS.extraBuildingUpgs = d.xs.extraBuildingUpgs || [];
        XS.legacyUpgs = d.xs.legacyUpgs || [];
        if(d.xs.stats) XS.stats = d.xs.stats;
      }
    }
  }catch(e){}
  while(XS.extraBuildings.length < EXTRA_BUILDINGS.length) XS.extraBuildings.push(0);
  while(XS.prestigeUpgs.length < PRESTIGE_UPGRADES.length) XS.prestigeUpgs.push(false);
  while(XS.extraClickUpgs.length < EXTRA_CLICK_UPGRADES.length) XS.extraClickUpgs.push(false);
  while(XS.extraBuildingUpgs.length < EXTRA_BUILDING_UPGRADES.length) XS.extraBuildingUpgs.push(false);
  while(XS.ascensionUpgs.length < ASCENSION_UPGRADES.length) XS.ascensionUpgs.push(false);
  while(XS.legacyUpgs.length < LEGACY_UPGRADES.length) XS.legacyUpgs.push(false);
  XS.legacyLevel = computeLegacyLevel();
  _lastTotalEarned = g.totalEarned || 0;
  scheduleWild();
  updateMilk();
  addExtraTabs();
  updateLeftPanel();
};
initExtra();

})();
