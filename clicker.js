/* ============================================================
   PokeClicker - Complete Cookie Clicker-style idle game
   Standalone JS - injects styles and manages all game logic
   ============================================================ */
(function(){
'use strict';

var css = "\n\
/* PokeClicker Layout */\n\
#gameClicker{position:relative;min-height:calc(100vh - 120px)}\n\
.ck-wrap{display:flex;gap:16px;max-width:1300px;margin:0 auto;padding:16px 20px;align-items:flex-start}\n\
.ck-left{flex:0 0 340px;display:flex;flex-direction:column;align-items:center;position:sticky;top:100px}\n\
.ck-stats-bar{display:flex;gap:16px;font-size:12px;color:var(--text-dim);margin-bottom:12px;font-weight:600;flex-wrap:wrap;justify-content:center}\n\
.ck-stats-bar span{color:var(--ctp-yellow);white-space:nowrap}\n\
.ck-pokeball-wrap{cursor:pointer;user-select:none;transition:transform .08s;position:relative}\n\
.ck-pokeball-wrap:active{transform:scale(.9)}\n\
.ck-pokeball{width:180px;height:180px;filter:drop-shadow(0 0 20px rgba(255,50,50,0.4));animation:ckFloat 3s ease-in-out infinite}\n\
@keyframes ckFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}\n\
.ck-pokeball svg{width:100%;height:100%}\n\
.ck-click-mult{position:absolute;top:-10px;right:-10px;background:var(--ctp-yellow);color:#1a1a1a;font-size:11px;font-weight:800;padding:2px 8px;border-radius:10px;pointer-events:none}\n\
.ck-display{font-size:48px;color:var(--ctp-yellow);text-shadow:2px 2px rgba(0,0,0,.3);margin-top:12px;font-weight:800;font-family:monospace}\n\
.ck-sub{font-size:13px;color:var(--text-muted);margin-top:4px}\n\
.ck-prestige-bar{display:flex;align-items:center;gap:10px;margin-top:12px;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:8px 14px;font-size:12px;color:var(--text-dim);flex-wrap:wrap;justify-content:center}\n\
.ck-btn{padding:6px 14px;border-radius:8px;border:1px solid var(--border);background:var(--surface-hover);color:var(--text);font-size:12px;font-weight:600;cursor:pointer;transition:.2s}\n\
.ck-btn:hover{background:var(--surface-raise);border-color:var(--text-muted)}\n\
.ck-btn-prestige{border-color:rgba(247,201,72,0.4);color:var(--ctp-yellow);background:rgba(247,201,72,0.1)}\n\
.ck-btn-prestige:hover{background:rgba(247,201,72,0.2)}\n\
/* Tabs & Panel */\n\
.ck-mid{flex:1;min-width:0}\n\
.ck-tabs{display:flex;gap:4px;margin-bottom:10px}\n\
.ck-tab{padding:8px 16px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text-dim);font-size:12px;font-weight:600;cursor:pointer;transition:.2s}\n\
.ck-tab:hover{background:var(--surface-hover);color:var(--text)}\n\
.ck-tab.active{background:var(--ctp-yellow);color:#1a1a1a;border-color:var(--ctp-yellow)}\n\
.ck-panel{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:12px;max-height:calc(100vh - 220px);overflow-y:auto;scrollbar-width:thin;scrollbar-color:var(--text-muted) transparent}\n\
.ck-panel::-webkit-scrollbar{width:5px}\n\
.ck-panel::-webkit-scrollbar-thumb{background:var(--text-muted);border-radius:3px}\n\
/* Building items */\n\
.ck-bld{display:flex;align-items:center;gap:12px;padding:10px 12px;margin-bottom:6px;border-radius:10px;border:1px solid var(--border-light,rgba(205,214,244,0.06));background:var(--bg-mid,#1e1e2e);cursor:pointer;transition:all .2s}\n\
.ck-bld:hover:not(.locked){border-color:var(--ctp-yellow);background:var(--surface-hover);transform:translateX(3px)}\n\
.ck-bld.locked{opacity:.45;cursor:not-allowed}\n\
.ck-bld .ck-bi{font-size:28px;min-width:40px;text-align:center;filter:drop-shadow(0 2px 4px rgba(0,0,0,.3))}\n\
.ck-bld .ck-binfo{flex:1;min-width:0}\n\
.ck-bld .ck-bn{font-size:13px;font-weight:700;color:var(--text)}\n\
.ck-bld .ck-bd{font-size:10px;color:var(--text-muted);line-height:1.3}\n\
.ck-bld .ck-bm{display:flex;gap:8px;margin-top:3px;font-size:11px}\n\
.ck-bld .ck-bc{color:var(--ctp-yellow);font-weight:600}\n\
.ck-bld .ck-bo{color:var(--text-dim)}\n\
.ck-bld .ck-bp{color:var(--ctp-green);font-weight:600}\n\
.ck-bld .ck-bbar{width:100%;height:3px;background:var(--surface-hover);border-radius:2px;margin-top:4px;overflow:hidden}\n\
.ck-bld .ck-bbar-fill{height:100%;background:var(--ctp-green);border-radius:2px;transition:width .3s}\n\
/* Upgrade items */\n\
.ck-upg{display:flex;align-items:center;gap:10px;padding:10px 12px;margin-bottom:6px;border-radius:10px;border:1px solid var(--border-light,rgba(205,214,244,0.06));background:var(--bg-mid,#1e1e2e);cursor:pointer;transition:all .2s}\n\
.ck-upg:hover:not(.locked):not(.bought){border-color:var(--ctp-blue);background:var(--surface-hover);transform:translateX(3px)}\n\
.ck-upg.locked{opacity:.35;cursor:not-allowed}\n\
.ck-upg.bought{border-color:var(--ctp-green);opacity:.6;cursor:default}\n\
.ck-upg .ck-ui{font-size:22px;min-width:32px;text-align:center}\n\
.ck-upg .ck-uu{font-size:12px;font-weight:700;color:var(--text)}\n\
.ck-upg .ck-ud{font-size:10px;color:var(--text-muted)}\n\
.ck-upg .ck-uc{font-size:11px;color:var(--ctp-yellow);font-weight:600;margin-top:2px}\n\
.ck-upg .ck-ur{font-size:10px;color:var(--text-muted);font-style:italic}\n\
.ck-upg .ck-ub{font-size:10px;color:var(--ctp-green);font-weight:600}\n\
/* Achievement items */\n\
.ck-ach{display:flex;align-items:center;gap:10px;padding:8px 12px;margin-bottom:4px;border-radius:8px;border:1px solid var(--border-light,rgba(205,214,244,0.06));background:var(--bg-mid,#1e1e2e);transition:.2s}\n\
.ck-ach.done{border-color:var(--ctp-green);background:rgba(166,227,161,0.08)}\n\
.ck-ach .ck-ai{font-size:20px;min-width:28px;text-align:center}\n\
.ck-ach .ck-an{font-size:12px;font-weight:700;color:var(--text-dim)}\n\
.ck-ach.done .ck-an{color:var(--ctp-green)}\n\
.ck-ach .ck-ad{font-size:10px;color:var(--text-muted)}\n\
/* Click particles */\n\
.ck-particle{position:fixed;pointer-events:none;font-size:16px;font-weight:800;color:var(--ctp-yellow);text-shadow:0 1px 4px rgba(0,0,0,.5);z-index:9999;animation:ckPartFloat 1s ease-out forwards}\n\
@keyframes ckPartFloat{0%{opacity:1;transform:translateY(0) scale(1)}100%{opacity:0;transform:translateY(-70px) scale(1.4)}}\n\
.ck-sparkle{position:fixed;width:5px;height:5px;border-radius:50%;pointer-events:none;z-index:9999;animation:ckSparkle .5s ease-out forwards}\n\
@keyframes ckSparkle{0%{opacity:1;transform:scale(1) translate(0,0)}100%{opacity:0;transform:scale(0) translate(var(--tx),var(--ty))}}\n\
.ck-shake{animation:ckShake .12s ease}\n\
@keyframes ckShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}\n\
/* Golden Pokeball */\n\
.ck-golden{position:fixed;width:56px;height:56px;cursor:pointer;z-index:9999;animation:ckGoldenBob 1.5s ease-in-out infinite,ckGoldenFadeIn .4s ease;filter:drop-shadow(0 0 16px rgba(255,215,0,0.6));transition:transform .1s}\n\
.ck-golden:hover{transform:scale(1.2) !important}\n\
.ck-golden svg{width:100%;height:100%}\n\
@keyframes ckGoldenBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}\n\
@keyframes ckGoldenFadeIn{from{opacity:0;transform:scale(.3)}to{opacity:1;transform:scale(1)}}\n\
/* Notifications */\n\
.ck-notif{position:fixed;top:20px;right:20px;background:var(--surface-raise);border:1px solid var(--ctp-yellow);border-radius:10px;padding:12px 18px;font-size:13px;font-weight:600;color:var(--text);z-index:10000;animation:ckNotifIn .3s ease,ckNotifOut .3s ease 2.7s forwards;box-shadow:0 4px 24px rgba(0,0,0,.4);max-width:300px}\n\
@keyframes ckNotifIn{from{transform:translateX(120px);opacity:0}to{transform:translateX(0);opacity:1}}\n\
@keyframes ckNotifOut{from{opacity:1}to{opacity:0;pointer-events:none}}\n\
.ck-notif.golden{border-color:var(--ctp-yellow);background:rgba(247,201,72,0.15)}\n\
.ck-notif.frenzy{border-color:var(--ctp-red);background:rgba(243,139,168,0.15)}\n\
.ck-notif.lucky{border-color:var(--ctp-green);background:rgba(166,227,161,0.15)}\n\
/* Stats overlay */\n\
.ck-stats-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);z-index:10001;display:none;align-items:center;justify-content:center;padding:20px}\n\
.ck-stats-overlay.active{display:flex}\n\
.ck-stats-modal{background:linear-gradient(145deg,var(--bg-mid),var(--bg-end,#181825));border-radius:16px;max-width:480px;width:100%;max-height:80vh;overflow-y:auto;padding:24px;border:1px solid var(--border);box-shadow:0 24px 80px rgba(0,0,0,0.6)}\n\
.ck-stats-modal h3{font-size:18px;font-weight:800;margin-bottom:16px;text-align:center;color:var(--text)}\n\
.ck-sr{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border-light,rgba(205,214,244,0.06));font-size:13px}\n\
.ck-sr .sl{color:var(--text-dim)}\n\
.ck-sr .sv{color:var(--text);font-weight:700;font-family:monospace}\n\
/* News ticker */\n\
.ck-right{flex:0 0 260px;position:sticky;top:100px}\n\
.ck-news{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:12px;max-height:calc(100vh - 200px);overflow-y:auto;font-size:12px;color:var(--text-dim)}\n\
.ck-news h4{font-size:13px;font-weight:700;color:var(--text);margin-bottom:8px;text-align:center;border-bottom:1px solid var(--border);padding-bottom:6px}\n\
.ck-ni{padding:6px 0;border-bottom:1px solid var(--border-light,rgba(205,214,244,0.06));line-height:1.4;font-size:11px}\n\
.ck-ni:last-child{border-bottom:none}\n\
.ck-ni .tm{color:var(--text-muted);font-size:10px}\n\
.ck-section-title{font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin:10px 0 6px;padding:0 4px}\n\
/* Bulk buy buttons */\n\
.ck-bulk{display:flex;gap:3px;flex-shrink:0;flex-direction:column;align-items:stretch}\n\
.ck-bulk-row{display:flex;gap:3px}\n\
.ck-bulk-btn{padding:2px 8px;border-radius:6px;border:1px solid var(--border);background:var(--surface-hover);color:var(--text-dim);font-size:10px;font-weight:700;cursor:pointer;transition:.15s}\n\
.ck-bulk-btn:hover{background:var(--surface-raise);color:var(--ctp-yellow);border-color:var(--ctp-yellow)}\n\
.ck-bulk-btn.buy10{border-color:rgba(137,180,250,0.4);color:var(--ctp-blue)}\n\
.ck-bulk-btn.buy100{border-color:rgba(203,139,250,0.4);color:var(--ctp-mauve)}\n\
.ck-bulk-btn.max{border-color:rgba(166,227,161,0.4);color:var(--ctp-green)}\n\
/* Pokeball frenzy / click-frenzy glow */\n\
.ck-pokeball-wrap.frenzy .ck-pokeball{filter:drop-shadow(0 0 30px rgba(243,139,168,0.8));animation:ckFloat 3s ease-in-out infinite,ckFrenzyPulse .5s ease infinite alternate}\n\
.ck-pokeball-wrap.clickfrenzy .ck-pokeball{filter:drop-shadow(0 0 30px rgba(137,180,250,0.8));animation:ckFloat 3s ease-in-out infinite,ckFrenzyPulse .5s ease infinite alternate}\n\
@keyframes ckFrenzyPulse{0%{transform:scale(1)}100%{transform:scale(1.06)}}\n\
.ck-frenzy-chip{position:absolute;top:-6px;left:-6px;background:linear-gradient(135deg,var(--ctp-red),var(--ctp-pink));color:#fff;font-size:10px;font-weight:800;padding:3px 8px;border-radius:10px;pointer-events:none;animation:ckPop .3s ease both;box-shadow:0 2px 10px rgba(243,139,168,0.5)}\n\
.ck-clickfrenzy-chip{position:absolute;top:-6px;left:-6px;background:linear-gradient(135deg,var(--ctp-blue),var(--ctp-sapphire,#89b4fa));color:#fff;font-size:10px;font-weight:800;padding:3px 8px;border-radius:10px;pointer-events:none;animation:ckPop .3s ease both;box-shadow:0 2px 10px rgba(137,180,250,0.5)}\n\
@keyframes ckPop{0%{transform:scale(0)}70%{transform:scale(1.15)}100%{transform:scale(1)}}\n\
/* Coin display pop */\n\
.ck-display.pop{animation:ckCoinPop .18s ease}\n\
@keyframes ckCoinPop{0%{transform:scale(1)}50%{transform:scale(1.12)}100%{transform:scale(1)}}\n\
.ck-space-hint{font-size:10px;color:var(--text-muted);margin-top:6px;opacity:.7}\n\
@media(max-width:900px){.ck-wrap{flex-direction:column;align-items:stretch}.ck-left{flex:none;position:static}.ck-right{flex:none;position:static}.ck-pokeball{width:140px;height:140px}.ck-display{font-size:36px}}\n\
";

var styleEl = document.createElement('style');
styleEl.textContent = css;
document.head.appendChild(styleEl);

// ==================== GAME DATA ====================
var BUILDINGS = [
  {id:'caterpie',name:'Caterpie Colony',icon:'\uD83D\uDC1B',desc:'Tiny Caterpie generate coins passively.',baseCost:15,pps:0.1},
  {id:'pikachu',name:'Pikachu Farm',icon:'\u26A1',desc:'Pikachu generate electricity - and coins!',baseCost:100,pps:1},
  {id:'pokegear',name:'Poke Gear Factory',icon:'\u2699\uFE0F',desc:'Mass-produced Poke Gear devices.',baseCost:1100,pps:8},
  {id:'slowpoke',name:'Slowpoke Dojo',icon:'\uD83E\uDD9C',desc:'Slow but steady training dojo.',baseCost:12000,pps:47},
  {id:'alakazam',name:'Alakazam Lab',icon:'\uD83E\uDDE0',desc:'Psychic-powered research laboratory.',baseCost:130000,pps:260},
  {id:'mewtwo',name:'Mewtwo Chamber',icon:'\uD83D\uDD2E',desc:'Cloned psychic energy generation.',baseCost:1400000,pps:1400},
  {id:'dragonite',name:'Dragonite Nest',icon:'\uD83D\uDC09',desc:'Dragon-type passive income.',baseCost:20000000,pps:7800},
  {id:'rayquaza',name:'Rayquaza Orbital',icon:'\uD83D\uDEF8',desc:'Orbital station harnessing Dragon energy.',baseCost:330000000,pps:44000},
  {id:'arceus',name:'Arceus Dimension',icon:'\uD83C\uDF0C',desc:'Divine pocket dimension coin press.',baseCost:5100000000,pps:260000},
  {id:'megaRay',name:'Mega Rayquaza',icon:'\uD83D\uDC51',desc:'The ultimate mega-evolved coin engine.',baseCost:75000000000,pps:1600000}
];

var CLICK_UPGRADES = [
  {id:'rb',name:'Reinforced Pokeball',icon:'\uD83D\uDD34',desc:'Doubles click power.',cost:100,mult:2,req:10},
  {id:'gb',name:'Great Ball',icon:'\uD83D\uDD35',desc:'Triples click power.',cost:500,mult:3,req:100},
  {id:'ub',name:'Ultra Ball',icon:'\uD83D\uDFE1',desc:'5x click power.',cost:5000,mult:5,req:1000},
  {id:'mb',name:'Master Ball',icon:'\uD83D\uDFE3',desc:'10x click power.',cost:50000,mult:10,req:10000},
  {id:'pb',name:'Premier Ball',icon:'\u26AA',desc:'25x click power.',cost:500000,mult:25,req:100000}
];

var BUILDING_UPGRADES = [];
BUILDINGS.forEach(function(b,i){
  var costMult = Math.pow(10, i);
  BUILDING_UPGRADES.push({
    id:b.id+'_1',bid:b.id,name:b.name+' Boost',icon:'\u2B06\uFE0F',
    desc:b.name+' output doubled.',cost:Math.floor(b.baseCost*10*costMult),
    req:1,mult:2
  });
  BUILDING_UPGRADES.push({
    id:b.id+'_2',bid:b.id,name:b.name+' Omega',icon:'\u2B06\uFE0F\u2B06\uFE0F',
    desc:b.name+' output doubled again.',cost:Math.floor(b.baseCost*100*costMult),
    req:10,mult:2
  });
});

var ALL_UPGRADES = CLICK_UPGRADES.concat(BUILDING_UPGRADES);

var ACHIEVEMENTS = [
  {id:'click_1',icon:'\uD83C\uDFAF',name:'First Click',desc:'Click the Pokeball once',check:function(s){return s.totalClicks>=1}},
  {id:'click_100',icon:'\uD83D\uDCAF',name:'Century Clicker',desc:'Click 100 times',check:function(s){return s.totalClicks>=100}},
  {id:'click_1k',icon:'\uD83D\uDD25',name:'Click Frenzy',desc:'Click 1,000 times',check:function(s){return s.totalClicks>=1000}},
  {id:'click_10k',icon:'\uD83D\uDCA5',name:'Click Maniac',desc:'Click 10,000 times',check:function(s){return s.totalClicks>=10000}},
  {id:'click_100k',icon:'\u26A1',name:'Click Legend',desc:'Click 100,000 times',check:function(s){return s.totalClicks>=100000}},
  {id:'click_1m',icon:'\uD83D\uDC51',name:'Click God',desc:'Click 1,000,000 times',check:function(s){return s.totalClicks>=1000000}},
  {id:'coin_100',icon:'\uD83E\uDE99',name:'Pocket Change',desc:'Earn 100 coins total',check:function(s){return s.totalEarned>=100}},
  {id:'coin_10k',icon:'\uD83D\uDCB0',name:'Money Bags',desc:'Earn 10,000 coins total',check:function(s){return s.totalEarned>=10000}},
  {id:'coin_1m',icon:'\uD83D\uDC8E',name:'Millionaire',desc:'Earn 1,000,000 coins total',check:function(s){return s.totalEarned>=1000000}},
  {id:'coin_1b',icon:'\uD83C\uDFE6',name:'Billionaire',desc:'Earn 1B coins total',check:function(s){return s.totalEarned>=1e9}},
  {id:'coin_1t',icon:'\uD83C\uDFF0',name:'Trillionaire',desc:'Earn 1T coins total',check:function(s){return s.totalEarned>=1e12}},
  {id:'bld_1',icon:'\uD83C\uDFEA',name:'First Purchase',desc:'Own 1 of any building',check:function(s){return s.buildings.some(function(b){return b>0})}},
  {id:'bld_10',icon:'\uD83C\uDFD8\uFE0F',name:'Growing Empire',desc:'Own 10 of any building',check:function(s){return s.buildings.some(function(b){return b>=10})}},
  {id:'bld_50',icon:'\uD83C\uDF06',name:'City Builder',desc:'Own 50 of any building',check:function(s){return s.buildings.some(function(b){return b>=50})}},
  {id:'bld_100',icon:'\uD83C\uDDFF',name:'Metropolis',desc:'Own 100 of any building',check:function(s){return s.buildings.some(function(b){return b>=100})}},
  {id:'bld_200',icon:'\uD83C\uDF10',name:'Global Empire',desc:'Own 200 of any building',check:function(s){return s.buildings.some(function(b){return b>=200})}},
  {id:'bld_all',icon:'\uD83D\uDDFA\uFE0F',name:'Diversified',desc:'Own 1 of each building',check:function(s){return s.buildings.every(function(b){return b>0})}},
  {id:'upg_1',icon:'\uD83D\uDED2',name:'First Upgrade',desc:'Buy 1 upgrade',check:function(s){return s.upgradesBought>=1}},
  {id:'upg_5',icon:'\uD83D\uDCE6',name:'Upgrade Collector',desc:'Buy 5 upgrades',check:function(s){return s.upgradesBought>=5}},
  {id:'upg_10',icon:'\uD83C\uDF81',name:'Upgrade Hoarder',desc:'Buy 10 upgrades',check:function(s){return s.upgradesBought>=10}},
  {id:'upg_20',icon:'\uD83C\uDFC6',name:'Upgrade Master',desc:'Buy 20 upgrades',check:function(s){return s.upgradesBought>=20}},
  {id:'golden_1',icon:'\u2728',name:'Lucky Find',desc:'Click 1 golden pokeball',check:function(s){return s.goldenClicked>=1}},
  {id:'golden_10',icon:'\uD83C\uDF1F',name:'Golden Hunter',desc:'Click 10 golden pokeballs',check:function(s){return s.goldenClicked>=10}},
  {id:'golden_50',icon:'\uD83D\uDCAB',name:'Golden Master',desc:'Click 50 golden pokeballs',check:function(s){return s.goldenClicked>=50}},
  {id:'prestige_1',icon:'\uD83D\uDD04',name:'Born Again',desc:'Prestige once',check:function(s){return s.prestigeCount>=1}},
  {id:'prestige_5',icon:'\u267B\uFE0F',name:'Serial Restarter',desc:'Prestige 5 times',check:function(s){return s.prestigeCount>=5}},
  {id:'prestige_10',icon:'\uD83C\uDF00',name:'Prestige Lord',desc:'Prestige 10 times',check:function(s){return s.prestigeCount>=10}},
  {id:'stars_10',icon:'\u2B50',name:'Star Collector',desc:'Earn 10 Shiny Stars',check:function(s){return s.prestigeStars>=10}},
  {id:'stars_100',icon:'\uD83C\uDF1F',name:'Star Hoarder',desc:'Earn 100 Shiny Stars',check:function(s){return s.prestigeStars>=100}},
  {id:'stars_1000',icon:'\uD83D\uDC8E',name:'Star Legend',desc:'Earn 1,000 Shiny Stars',check:function(s){return s.prestigeStars>=1000}},
  {id:'speed_1m',icon:'\u23F1\uFE0F',name:'Speed Runner',desc:'Earn 1M coins in under 10 min',check:function(s){return s.totalEarned>=1e6&&s.timePlayed<600}},
  {id:'egg_1',icon:'\uD83E\uDD5A',name:'First Hatch',desc:'Hatch 1 egg',check:function(s){return s.eggHatched>=1}},
  {id:'egg_10',icon:'\uD83D\uDC23',name:'Egg Farmer',desc:'Hatch 10 eggs',check:function(s){return s.eggHatched>=10}},
  {id:'egg_50',icon:'\uD83D\uDC24',name:'Chicken Whisperer',desc:'Hatch 50 eggs',check:function(s){return s.eggHatched>=50}}
];

var NEWS = [
  'A wild Caterpie appeared in the colony!',
  'Professor Oak reports: Pikachus are more productive than ever',
  'Team Rocket was spotted stealing Pokeballs near the Dojo!',
  'Slowpoke just realized it earned coins 3 minutes ago...',
  'Alakazam used Psychic on the coin vault - doubled output!',
  'Breaking: Mewtwo escaped the chamber. Coins everywhere!',
  'Dragonite taught Caterpie to fly. Productivity up 200%!',
  'Rayquaza was seen orbiting the factory. Nobody knows why.',
  'Arceus created 10,000 coins from nothing. Typical deity stuff.',
  'Mega Rayquaza wants a raise. Management is considering it.',
  'Magikarp flopped onto the pokeball. Click power unaffected.',
  'Diglett tunneling beneath the coin vault - coins spilling out!',
  'A shiny was spotted in the farm! (It was a Pikachu with a hat)',
  'Professor Elm confirms: more buildings = more coins.',
  'Jigglypuff sang to the coins. They all fell asleep.',
  'Chansey used Egg Bomb on the coin stash. Lucky coins!',
  'Machamp carried 5 buildings at once. Impressive.',
  'Pikachu used Thunderbolt. Electric bill went up. Worth it.',
  'Abra teleported all coins... to the other room. Crisis averted.',
  'Snorlax blocked the Dojo entrance. Productivity: -50%.',
  'Lapras ferry service now available for coin transportation.',
  'Mr. Mime opened a coin sorting branch. +10% efficiency.',
  'Voltorb rolled into the factory. Everybody ducked.',
  'Eevee evolved into coins. Wait, that is not how it works.',
  'Togepi hatched from a golden egg! Coins scattered!',
  'Deoxys speed form broke the coin counter. Again.',
  'Bidoof chewed power cables. Pikachu farms offline briefly.',
  'Garchomp used Dragon Rush through the coin pile!',
  'Rotom possessed the coin counter. Numbers everywhere.',
  'Celebi traveled back and pre-earned your coins. Thanks!'
];

// ==================== GAME STATE ====================
var G = {};
var SAVE_KEY = 'pokeClickerV2';
var currentTab = 'buildings';
var goldenEl = null;
var goldenTimer = null;
var goldenTimeout = null;
var goldenSpawnTimer = null;
var gameLoop = null;
var saveInterval = null;
var newsInterval = null;
var newsIdx = 0;
var panelDirty = true;
var initialized = false;

function newState() {
  return {
    coins:0,totalClicks:0,totalEarned:0,
    buildings:new Array(BUILDINGS.length).fill(0),
    upgradeBought:new Array(ALL_UPGRADES.length).fill(false),
    achievements:[],
    prestigeStars:0,prestigeCount:0,
    goldenClicked:0,
    startTime:Date.now(),timePlayed:0,
    highestPPS:0,
    frenzyTimer:0,clickFrenzyTimer:0,
    frenzyMult:1,clickFrenzyMult:1,
    prestigeMult:1,
    recentEarns:[],
    eggHatched:0,eggs:[]
  };
}

// ==================== HELPERS ====================
function fmt(n){
  if(n>=1e15)return(n/1e15).toFixed(2)+'Q';
  if(n>=1e12)return(n/1e12).toFixed(2)+'T';
  if(n>=1e9)return(n/1e9).toFixed(2)+'B';
  if(n>=1e6)return(n/1e6).toFixed(2)+'M';
  if(n>=1e3)return(n/1e3).toFixed(1)+'K';
  return Math.floor(n).toLocaleString();
}
function fmtTime(s){
  if(s<60)return Math.floor(s)+'s';
  if(s<3600)return Math.floor(s/60)+'m '+Math.floor(s%60)+'s';
  return Math.floor(s/3600)+'h '+Math.floor((s%3600)/60)+'m';
}
function bCost(i){return Math.floor(BUILDINGS[i].baseCost*Math.pow(1.15,G.buildings[i]))}
function bPPS(i){
  var base=BUILDINGS[i].pps;
  var mult=1;
  for(var j=0;j<BUILDING_UPGRADES.length;j++){
    if(BUILDING_UPGRADES[j].bid===BUILDINGS[i].id&&G.upgradeBought[CLICK_UPGRADES.length+j])mult*=BUILDING_UPGRADES[j].mult;
  }
  return base*mult*G.buildings[i];
}
function totalPPS(){
  var t=0;
  for(var i=0;i<BUILDINGS.length;i++)t+=bPPS(i);
  return t*G.prestigeMult*G.frenzyMult;
}
function clickPow(){
  var m=1;
  for(var i=0;i<CLICK_UPGRADES.length;i++){
    if(G.upgradeBought[i])m=CLICK_UPGRADES[i].mult;
  }
  return m*G.prestigeMult*G.clickFrenzyMult;
}
function prestigeMult(){return 1+G.prestigeStars*0.02}
function prestigeStarsPreview(){
  if(G.totalEarned<1e6)return 0;
  return Math.floor(Math.pow(G.totalEarned/1e6,0.5));
}
function upgradesBought(){
  var c=0;
  for(var i=0;i<G.upgradeBought.length;i++)if(G.upgradeBought[i])c++;
  return c;
}

// ==================== SAVE / LOAD ====================
function saveGame(){
  try{
    var data={
      c:G.coins,tc:G.totalClicks,te:G.totalEarned,
      b:G.buildings,u:G.upgradeBought,a:G.achievements,
      ps:G.prestigeStars,pc:G.prestigeCount,gc:G.goldenClicked,
      st:G.startTime,tp:G.timePlayed,hp:G.highestPPS,
      eh:G.eggHatched,eggs:G.eggs
    };
    if(window.ckAPI&&window.ckAPI.onSave)for(var i=0;i<window.ckAPI.onSave.length;i++)window.ckAPI.onSave[i](data);
    localStorage.setItem(SAVE_KEY,JSON.stringify(data));
  }catch(e){}
}
function loadGame(){
  G=newState();
  try{
    var raw=localStorage.getItem(SAVE_KEY);
    if(!raw)return;
    var d=JSON.parse(raw);
    G.coins=d.c||0;G.totalClicks=d.tc||0;G.totalEarned=d.te||0;
    G.buildings=d.b||new Array(BUILDINGS.length).fill(0);
    G.upgradeBought=d.u||new Array(ALL_UPGRADES.length).fill(false);
    G.achievements=d.a||[];
    G.prestigeStars=d.ps||0;G.prestigeCount=d.pc||0;
    G.goldenClicked=d.gc||0;
    G.startTime=d.st||Date.now();G.timePlayed=d.tp||0;G.highestPPS=d.hp||0;
    G.eggHatched=d.eh||0;G.eggs=d.eggs||[];
    while(G.buildings.length<BUILDINGS.length)G.buildings.push(0);
    while(G.upgradeBought.length<ALL_UPGRADES.length)G.upgradeBought.push(false);
  }catch(e){}
  G.prestigeMult=prestigeMult();
  if(window.ckAPI&&window.ckAPI.onLoad)for(var i=0;i<window.ckAPI.onLoad.length;i++)window.ckAPI.onLoad[i]();
}

// ==================== NOTIFICATIONS ====================
function notify(text,cls){
  if(!CFG.notifs)return;
  var n=document.createElement('div');
  n.className='ck-notif'+(cls?' '+cls:'');
  n.textContent=text;
  document.body.appendChild(n);
  setTimeout(function(){if(n.parentNode)n.remove()},3200);
}

// ==================== CONFIG ====================
var CFG={particles:true,notifs:true,sparkles:true};
// ==================== CLICK HANDLING ====================
var lastClickTime=0;var activeParticles=0;var MAX_PARTICLES=25;var lastUIUpdate=0;
function doClick(e){
  var now=Date.now();
  if(now-lastClickTime<30)return;
  lastClickTime=now;
  var pow=clickPow();
  G.coins+=pow;G.totalClicks++;G.totalEarned+=pow;
  trackEarned(pow);
  if(CFG.particles&&activeParticles<MAX_PARTICLES)spawnParticle(e.clientX,e.clientY,pow);
  if(CFG.sparkles)spawnSparkles(e.clientX,e.clientY);
  var ball=document.getElementById('ckPokeball');
  if(ball){ball.classList.remove('ck-shake');void ball.offsetWidth;ball.classList.add('ck-shake')}
  // Update UI at most every 100ms (same as tick) to stay responsive
  if(now-lastUIUpdate>=100){lastUIUpdate=now;updateUI();checkAchievements()}
  if(window.ckAPI&&window.ckAPI.onClick)for(var i=0;i<window.ckAPI.onClick.length;i++)window.ckAPI.onClick[i](pow,e);
}
function spawnParticle(x,y,val){
  activeParticles++;
  var el=document.createElement('div');
  el.className='ck-particle';
  el.textContent='+'+(val>=1000?fmt(val):Math.floor(val));
  el.style.left=x+'px';el.style.top=(y-20)+'px';
  document.body.appendChild(el);
  setTimeout(function(){if(el.parentNode)el.remove();activeParticles--},800);
}
function spawnSparkles(x,y){
  var colors=['#ffd700','#ff6b6b','#48dbfb','#ff9ff3','#a6e3a1'];
  for(var i=0;i<4;i++){ // 4 instead of 6
    var s=document.createElement('div');
    s.className='ck-sparkle';
    var a=Math.PI*2*i/4;var dist=20+Math.random()*30;
    s.style.left=x+'px';s.style.top=y+'px';
    s.style.setProperty('--tx',Math.cos(a)*dist+'px');
    s.style.setProperty('--ty',Math.sin(a)*dist+'px');
    s.style.background=colors[i%colors.length];
    document.body.appendChild(s);
    setTimeout((function(el){return function(){if(el.parentNode)el.remove()}})(s),500);
  }
}

// ==================== BUILDING PURCHASE ====================
function buyBuilding(i, qty){
  qty=qty||1;
  var bought=0;
  for(var k=0;k<qty;k++){
    var cost=bCost(i);
    if(G.coins<cost)break;
    G.coins-=cost;
    G.buildings[i]++;
    bought++;
  }
  if(bought>0){panelDirty=true;updateUI();saveGame()}
}
function buyUpgrade(i){
  if(G.upgradeBought[i])return;
  var u=ALL_UPGRADES[i];
  if(G.coins<u.cost)return;
  if(i<CLICK_UPGRADES.length){
    if(G.totalClicks<u.req)return;
  }else{
    var bIdx=-1;
    for(var k=0;k<BUILDINGS.length;k++){if(BUILDINGS[k].id===u.bid){bIdx=k;break}}
    if(bIdx<0||G.buildings[bIdx]<u.req)return;
  }
  G.coins-=u.cost;
  G.upgradeBought[i]=true;
  G.prestigeMult=prestigeMult();
  panelDirty=true;
  updateUI();
  saveGame();
}

// ==================== GOLDEN POKEBALL ====================
function spawnGolden(){
  if(goldenEl)return;
  var wrap=document.getElementById('ckGoldenWrap');
  if(!wrap)return;
  var el=document.createElement('div');
  el.className='ck-golden';
  el.innerHTML='<svg viewBox="0 0 200 200"><defs><linearGradient id="gRG" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" style="stop-color:#ffd700"/><stop offset="100%" style="stop-color:#ff8c00"/></linearGradient><radialGradient id="gSH" cx="35%" cy="35%"><stop offset="0%" style="stop-color:rgba(255,255,255,0.5)"/><stop offset="100%" style="stop-color:rgba(255,255,255,0)"/></radialGradient></defs><circle cx="100" cy="100" r="95" fill="url(#gRG)" stroke="#b8860b" stroke-width="5"/><rect x="0" y="92" width="200" height="16" fill="#b8860b"/><circle cx="100" cy="100" r="28" fill="#fff8dc" stroke="#b8860b" stroke-width="4"/><circle cx="100" cy="100" r="18" fill="#ffd700" stroke="#b8860b" stroke-width="3"/><circle cx="100" cy="100" r="10" fill="#fff8dc"/><circle cx="100" cy="100" r="95" fill="url(#gSH)"/></svg>';
  var px=60+Math.random()*(window.innerWidth-120);
  var py=100+Math.random()*(window.innerHeight-200);
  el.style.left=px+'px';el.style.top=py+'px';
  el.onclick=function(){collectGolden()};
  wrap.appendChild(el);
  goldenEl=el;
  notify('A Golden Pokeball appeared! Click it!','golden');
  addNews('A Golden Pokeball appeared!');
  goldenTimeout=setTimeout(function(){removeGolden()},10000);
}
function collectGolden(){
  if(!goldenEl)return;
  clearTimeout(goldenTimeout);
  var el=goldenEl;
  goldenEl=null;
  el.style.animation='ckGoldenFadeIn .3s ease reverse forwards';
  setTimeout(function(){if(el.parentNode)el.remove()},300);
  G.goldenClicked++;
  var roll=Math.random();
  if(roll<0.35){
    var amt=G.totalEarned*0.15;
    G.coins+=amt;G.totalEarned+=amt;trackEarned(amt);
    notify('Coins! +'+fmt(amt)+' coins!','lucky');
    addNews('Golden Pokeball: Coins! +'+fmt(amt));
  }else if(roll<0.65){
    G.frenzyMult=7;G.frenzyTimer=77;
    notify('Frenzy! x7 production for 77 seconds!','golden');
    addNews('Golden Pokeball: Frenzy activated! x7 production!');
  }else if(roll<0.85){
    G.clickFrenzyMult=77;G.clickFrenzyTimer=13;
    notify('Click Frenzy! x77 clicks for 13 seconds!','frenzy');
    addNews('Golden Pokeball: Click Frenzy! x77 clicks!');
  }else{
    var amt=G.totalEarned*0.15;
    G.coins+=amt;G.totalEarned+=amt;trackEarned(amt);
    notify('Lucky! +'+fmt(amt)+' coins!','lucky');
    addNews('Golden Pokeball: Lucky! +'+fmt(amt));
  }
  checkAchievements();
  updateUI();
  saveGame();
  if(window.ckAPI&&window.ckAPI.onGolden)for(var i=0;i<window.ckAPI.onGolden.length;i++)window.ckAPI.onGolden[i]();
}
function removeGolden(){
  if(!goldenEl)return;
  var el=goldenEl;
  goldenEl=null;
  el.style.animation='ckGoldenFadeIn .3s ease reverse forwards';
  setTimeout(function(){if(el.parentNode)el.remove()},300);
}
function scheduleGolden(){
  var delay=60000+Math.random()*120000;
  goldenSpawnTimer=setTimeout(function(){
    spawnGolden();
    scheduleGolden();
  },delay);
}

// ==================== RECENT EARNINGS TRACKING ====================
function trackEarned(amt){
  var now=Date.now();
  G.recentEarns.push({t:now,a:amt});
  while(G.recentEarns.length>0&&G.recentEarns[0].t<now-60000)G.recentEarns.shift();
}
function earnedLast60s(){
  var now=Date.now();var t=0;
  for(var i=0;i<G.recentEarns.length;i++){
    if(G.recentEarns[i].t>=now-60000)t+=G.recentEarns[i].a;
  }
  return t;
}

// ==================== PRESTIGE ====================
function ckPrestige(){
  if(G.totalEarned<1e6){notify('Need at least 1M total earned to prestige!');return}
  var newStars=prestigeStarsPreview();
  var gained=newStars-G.prestigeStars;
  if(gained<=0){notify('No new Shiny Stars to gain!');return}
  if(!confirm('Prestige will reset coins, buildings, and upgrades.\nYou will gain '+gained+' Shiny Stars (total: '+newStars+').\nEach Shiny Star gives +2% production.\n\nContinue?'))return;
  G.prestigeStars=newStars;
  G.prestigeCount++;
  G.prestigeMult=prestigeMult();
  G.coins=0;G.totalClicks=0;G.totalEarned=0;
  G.buildings=new Array(BUILDINGS.length).fill(0);
  G.upgradeBought=new Array(ALL_UPGRADES.length).fill(false);
  G.frenzyMult=1;G.clickFrenzyMult=1;
  G.frenzyTimer=0;G.clickFrenzyTimer=0;
  G.recentEarns=[];
  notify('Prestige! +'+gained+' Shiny Stars! Multiplier: x'+G.prestigeMult.toFixed(2),'golden');
  addNews('Prestige! Gained '+gained+' Shiny Stars!');
  checkAchievements();
  panelDirty=true;
  updateUI();
  saveGame();
  if(window.ckAPI&&window.ckAPI.onPrestige)for(var i=0;i<window.ckAPI.onPrestige.length;i++)window.ckAPI.onPrestige[i](gained);
}

// ==================== ACHIEVEMENTS ====================
function checkAchievements(){
  var state={
    totalClicks:G.totalClicks,totalEarned:G.totalEarned,
    buildings:G.buildings,upgradesBought:upgradesBought(),
    goldenClicked:G.goldenClicked,prestigeCount:G.prestigeCount,
    prestigeStars:G.prestigeStars,timePlayed:G.timePlayed,
    eggHatched:G.eggHatched||0
  };
  ACHIEVEMENTS.forEach(function(a){
    if(G.achievements.indexOf(a.id)===-1&&a.check(state)){
      G.achievements.push(a.id);
      notify('Achievement: '+a.name+'!','lucky');
      addNews('Achievement unlocked: '+a.name+'!');
    }
  });
}

// ==================== NEWS ====================
function addNews(msg){
  var el=document.getElementById('ckNews');
  if(!el)return;
  var list=el.querySelector('.ck-news-list');
  if(!list)return;
  var item=document.createElement('div');
  item.className='ck-ni';
  var now=new Date();
  var ts=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
  item.innerHTML='<span class="tm">'+ts+'</span> '+msg;
  list.insertBefore(item,list.firstChild);
  while(list.children.length>30)list.removeChild(list.lastChild);
}
function cycleNews(){
  newsIdx=(newsIdx+1)%NEWS.length;
  addNews(NEWS[newsIdx]);
}

// ==================== UI RENDERING ====================
var lastDisplayStr='';
function updateUI(){
  var el=function(id){return document.getElementById(id)};
  if(!el('ckCoins'))return;
  el('ckCoins').textContent=fmt(G.coins);
  var dispStr=fmt(G.coins);
  var disp=el('ckDisplay');
  if(disp){
    if(dispStr!==lastDisplayStr&&lastDisplayStr!==''){disp.classList.remove('pop');void disp.offsetWidth;disp.classList.add('pop')}
    lastDisplayStr=dispStr;
    disp.textContent=dispStr;
  }
  el('ckPerClick').textContent=fmt(clickPow());
  el('ckPPS').textContent=fmt(totalPPS());

  // Frenzy / click-frenzy glow on pokeball
  var wrap=el('ckPokeball');
  if(wrap){
    wrap.classList.toggle('frenzy',G.frenzyTimer>0);
    wrap.classList.toggle('clickfrenzy',G.clickFrenzyTimer>0);
    var fchip=wrap.querySelector('.ck-frenzy-chip');
    if(G.frenzyTimer>0){
      if(!fchip){fchip=document.createElement('div');fchip.className='ck-frenzy-chip';wrap.appendChild(fchip)}
      fchip.textContent='\uD83D\uDD25 x'+G.frenzyMult+' '+Math.ceil(G.frenzyTimer)+'s';
    }else if(fchip){fchip.remove()}
    var cfchip=wrap.querySelector('.ck-clickfrenzy-chip');
    if(G.clickFrenzyTimer>0){
      if(!cfchip){cfchip=document.createElement('div');cfchip.className='ck-clickfrenzy-chip';wrap.appendChild(cfchip)}
      cfchip.textContent='\u26A1 x'+G.clickFrenzyMult+' '+Math.ceil(G.clickFrenzyTimer)+'s';
    }else if(cfchip){cfchip.remove()}
  }

  // Click multiplier label
  var mult=Math.round(clickPow());
  var ml=el('ckMultLabel');
  if(ml){
    if(mult>1){ml.style.display='';ml.textContent='\u00D7'+mult}
    else ml.style.display='none';
  }

  // Shiny stars
  var sw=el('ckShinyWrap'),sc=el('ckShiny');
  if(sw&&sc){
    if(G.prestigeStars>0){sw.style.display='';sc.textContent=G.prestigeStars}
    else sw.style.display='none';
  }

  // Prestige bar
  var pb=el('ckPrestigeBar');
  if(pb){
    if(G.totalEarned>=1e6||G.prestigeStars>0){
      pb.style.display='';
      el('ckPrestigeStars').textContent=G.prestigeStars;
      el('ckPrestigeMult').textContent=G.prestigeMult.toFixed(2);
    }else{
      pb.style.display='none';
    }
  }

  // Track highest PPS
  var pps=totalPPS();
  if(pps>G.highestPPS)G.highestPPS=pps;

  if(panelDirty){
    panelDirty=false;
    renderPanel();
  }else{
    // Lightweight update: toggle locked state and costs on existing elements
    var blds=document.querySelectorAll('.ck-bld');
    for(var i=0;i<blds.length&&i<BUILDINGS.length;i++){
      var cost=bCost(i);
      var canBuy=G.coins>=cost;
      if(canBuy)blds[i].classList.remove('locked');
      else blds[i].classList.add('locked');
      var costEl=blds[i].querySelector('.ck-bc');
      if(costEl)costEl.textContent=fmt(cost)+' coins';
      var ownedEl=blds[i].querySelector('.ck-bo');
      if(ownedEl)ownedEl.textContent='Owned: '+G.buildings[i];
      var ppEl=blds[i].querySelector('.ck-bp');
      var contrib=bPPS(i)*G.prestigeMult*G.frenzyMult;
      if(ppEl){if(contrib>0)ppEl.textContent='+'+fmt(contrib)+'/s'}
      else if(contrib>0){
        var bm=blds[i].querySelector('.ck-bm');
        if(bm){var sp=document.createElement('span');sp.className='ck-bp';sp.textContent='+'+fmt(contrib)+'/s';bm.appendChild(sp)}
      }
    }
    var upgs=document.querySelectorAll('.ck-upg');
    for(var i=0;i<upgs.length&&i<ALL_UPGRADES.length;i++){
      if(upgs[i].classList.contains('bought'))continue;
      var canBuy=G.coins>=ALL_UPGRADES[i].cost;
      if(i<CLICK_UPGRADES.length){if(G.totalClicks<ALL_UPGRADES[i].req)canBuy=false}
      else{var bIdx=-1;for(var k=0;k<BUILDINGS.length;k++){if(BUILDINGS[k].id===ALL_UPGRADES[i].bid){bIdx=k;break}}
        if(bIdx<0||G.buildings[bIdx]<ALL_UPGRADES[i].req)canBuy=false}
      if(canBuy)upgs[i].classList.remove('locked');
      else upgs[i].classList.add('locked');
    }
  }
}
function renderPanel(){
  var panel=document.getElementById('ckPanel');
  if(!panel)return;
  if(currentTab==='buildings')renderBuildings(panel);
  else if(currentTab==='upgrades')renderUpgrades(panel);
  else if(currentTab==='achievements')renderAchievements(panel);
  if(window.ckAPI&&window.ckAPI.onPanelRender)for(var i=0;i<window.ckAPI.onPanelRender.length;i++)window.ckAPI.onPanelRender[i]();
}
function renderBuildings(panel){
  var html='';
  var pps=totalPPS();
  for(var i=0;i<BUILDINGS.length;i++){
    var b=BUILDINGS[i];
    var cost=bCost(i);
    var canBuy=G.coins>=cost;
    var owned=G.buildings[i];
    var contrib=bPPS(i)*G.prestigeMult*G.frenzyMult;
    var pct=pps>0?Math.min(100,(contrib/pps)*100):0;
    html+='<div class="ck-bld'+(canBuy?'':' locked')+'" onclick="window.ckBuyB('+i+')">';
    html+='<div class="ck-bi">'+b.icon+'</div>';
    html+='<div class="ck-binfo">';
    html+='<div class="ck-bn">'+b.name+'</div>';
    html+='<div class="ck-bd">'+b.desc+'</div>';
    html+='<div class="ck-bm">';
    html+='<span class="ck-bc">'+fmt(cost)+' coins</span>';
    html+='<span class="ck-bo">Owned: '+owned+'</span>';
    if(contrib>0)html+='<span class="ck-bp">+'+fmt(contrib)+'/s</span>';
    html+='</div>';
    html+='<div class="ck-bbar"><div class="ck-bbar-fill" style="width:'+Math.min(pct,100)+'%"></div></div>';
    html+='</div>';
    html+='<div class="ck-bulk">';
    html+='<div class="ck-bulk-row">';
    html+='<button class="ck-bulk-btn" onclick="event.stopPropagation();window.ckBuyB('+i+',10)">×10</button>';
    html+='<button class="ck-bulk-btn buy100" onclick="event.stopPropagation();window.ckBuyB('+i+',100)">×100</button>';
    html+='<button class="ck-bulk-btn max" onclick="event.stopPropagation();window.ckBuyB('+i+',999999)">MAX</button>';
    html+='</div></div>';
    html+='</div>';
  }
  panel.innerHTML=html;
}
function renderUpgrades(panel){
  var html='';
  var clickIdx=0;
  // Click upgrades section
  html+='<div class="ck-section-title">Click Upgrades</div>';
  for(var i=0;i<CLICK_UPGRADES.length;i++){
    var u=CLICK_UPGRADES[i];
    var gIdx=CLICK_UPGRADES.length+i; // not used, use i directly for upgradeBought
    var owned=G.upgradeBought[i];
    var reqMet=G.totalClicks>=u.req;
    var canBuy=G.coins>=u.cost&&reqMet&&!owned;
    var cls='ck-upg';
    if(owned)cls+=' bought';
    else if(!canBuy)cls+=' locked';
    html+='<div class="'+cls+'" onclick="window.ckBuyU('+i+')">';
    html+='<div class="ck-ui">'+u.icon+'</div>';
    html+='<div style="flex:1">';
    html+='<div class="ck-uu">'+u.name+'</div>';
    html+='<div class="ck-ud">'+u.desc+'</div>';
    if(owned){html+='<div class="ck-ub">Purchased!</div>'}
    else if(!reqMet){html+='<div class="ck-ur">Requires '+fmt(u.req)+' clicks</div>'}
    else{html+='<div class="ck-uc">'+fmt(u.cost)+' coins</div>'}
    html+='</div></div>';
  }
  // Building upgrades section
  html+='<div class="ck-section-title">Building Upgrades</div>';
  for(var i=0;i<BUILDING_UPGRADES.length;i++){
    var u=BUILDING_UPGRADES[i];
    var gIdx=CLICK_UPGRADES.length+i;
    var owned=G.upgradeBought[gIdx];
    var bIdx=BUILDINGS.findIndex(function(b){return b.id===u.bid});
    var reqMet=bIdx>=0&&G.buildings[bIdx]>=u.req;
    var canBuy=G.coins>=u.cost&&reqMet&&!owned;
    var cls='ck-upg';
    if(owned)cls+=' bought';
    else if(!canBuy)cls+=' locked';
    html+='<div class="'+cls+'" onclick="window.ckBuyU('+gIdx+')">';
    html+='<div class="ck-ui">'+u.icon+'</div>';
    html+='<div style="flex:1">';
    html+='<div class="ck-uu">'+u.name+'</div>';
    html+='<div class="ck-ud">'+u.desc+'</div>';
    if(owned){html+='<div class="ck-ub">Purchased!</div>'}
    else if(!reqMet){html+='<div class="ck-ur">Requires '+u.req+' '+BUILDINGS[bIdx>=0?bIdx:0].name+'</div>'}
    else{html+='<div class="ck-uc">'+fmt(u.cost)+' coins</div>'}
    html+='</div></div>';
  }
  panel.innerHTML=html;
}
function renderAchievements(panel){
  var html='';
  var unlocked=G.achievements.length;
  html+='<div style="text-align:center;font-size:12px;color:var(--text-dim);margin-bottom:8px">'+unlocked+' / '+ACHIEVEMENTS.length+' unlocked</div>';
  for(var i=0;i<ACHIEVEMENTS.length;i++){
    var a=ACHIEVEMENTS[i];
    var done=G.achievements.indexOf(a.id)!==-1;
    html+='<div class="ck-ach'+(done?' done':'')+'">';
    html+='<div class="ck-ai">'+(done?a.icon:'\u2753')+'</div>';
    html+='<div><div class="ck-an">'+a.name+'</div>';
    html+='<div class="ck-ad">'+a.desc+'</div></div></div>';
  }
  panel.innerHTML=html;
}
function renderStats(){
  var el=document.getElementById('ckStatsContent');
  if(!el)return;
  G.timePlayed=(Date.now()-G.startTime)/1000;
  var rows=[
    ['Total Clicks',fmt(G.totalClicks)],
    ['Total Earned',fmt(G.totalEarned)],
    ['Current Coins',fmt(G.coins)],
    ['Buildings Owned',G.buildings.reduce(function(a,b){return a+b},0).toString()],
    ['Upgrades Bought',upgradesBought().toString()+'/'+ALL_UPGRADES.length],
    ['Click Power',fmt(clickPow())],
    ['Coins Per Second',fmt(totalPPS())],
    ['Highest PPS',fmt(G.highestPPS)],
    ['Golden Pokeballs',G.goldenClicked.toString()],
    ['Prestige Count',G.prestigeCount.toString()],
    ['Shiny Stars',G.prestigeStars.toString()],
    ['Prestige Multiplier','x'+G.prestigeMult.toFixed(2)],
    ['Time Played',fmtTime(G.timePlayed)],
    ['Achievements',G.achievements.length+'/'+ACHIEVEMENTS.length]
  ];
  el.innerHTML=rows.map(function(r){
    return '<div class="ck-sr"><span class="sl">'+r[0]+'</span><span class="sv">'+r[1]+'</span></div>';
  }).join('');
}

// ==================== STATS OVERLAY ====================
function ckToggleStats(){
  var el=document.getElementById('ckStatsOverlay');
  if(!el)return;
  if(el.classList.contains('active')){el.classList.remove('active')}
  else{renderStats();el.classList.add('active')}
}

// ==================== TAB SWITCHING ====================
function ckTab(name,btn){
  currentTab=name;
  var tabs=document.querySelectorAll('.ck-tab');
  for(var i=0;i<tabs.length;i++)tabs[i].classList.remove('active');
  if(btn)btn.classList.add('active');
  renderPanel();
}

// ==================== GLOBAL EXPORTS ====================
window.ckBuyB=function(i,qty){buyBuilding(i,qty)};
window.ckBuyU=function(i){buyUpgrade(i)};
window.ckPrestige=ckPrestige;
window.ckToggleStats=ckToggleStats;
window.ckTab=ckTab;
// Extension API
window.ckAPI={
  G:function(){return G},
  fmt:fmt,fmtTime:fmtTime,
  bCost:bCost,bPPS:bPPS,totalPPS:totalPPS,clickPow:clickPow,
  notify:notify,addNews:addNews,
  saveGame:saveGame,
  renderPanel:function(){panelDirty=true;renderPanel()},
  getTab:function(){return currentTab},
  BUILDINGS:BUILDINGS,
  CFG:CFG,
  toggleConfig:function(k){CFG[k]=!CFG[k]},
  resetGame:function(){localStorage.removeItem(SAVE_KEY);location.reload()},
  extraIncome:function(dt){return extraTotalPPS()*dt;},
  onTick:[],onLoad:[],onSave:[],onPrestige:[],onGolden:[],onClick:[],onPanelRender:[]
};

// ==================== GAME LOOP ====================
function tick(){
  var dt=0.1;
  // PPS income
  var pps=totalPPS();
  if(pps>0){
    var earned=pps*dt;
    G.coins+=earned;G.totalEarned+=earned;
    trackEarned(earned);
  }
  // Frenzy timers
  if(G.frenzyTimer>0){
    G.frenzyTimer-=dt;
    if(G.frenzyTimer<=0){G.frenzyTimer=0;G.frenzyMult=1;notify('Frenzy ended!')}
  }
  if(G.clickFrenzyTimer>0){
    G.clickFrenzyTimer-=dt;
    if(G.clickFrenzyTimer<=0){G.clickFrenzyTimer=0;G.clickFrenzyMult=1;notify('Click Frenzy ended!')}
  }
  // Time played
  G.timePlayed=(Date.now()-G.startTime)/1000;
  checkAchievements();
  updateUI();
  // Extension hooks
  if(window.ckAPI&&window.ckAPI.onTick)for(var i=0;i<window.ckAPI.onTick.length;i++)window.ckAPI.onTick[i](dt);
  // Extra income from extension buildings (added after main tick)
  if(window.ckAPI&&window.ckAPI.extraIncome){
    var extra=window.ckAPI.extraIncome(dt);
    if(extra>0){G.coins+=extra;G.totalEarned+=extra;trackEarned(extra)}
  }
}

// ==================== INIT ====================
function initClicker(){
  if(initialized)return;
  initialized=true;
  loadGame();
  var ball=document.getElementById('ckPokeball');
  if(ball){
    ball.addEventListener('click',doClick);
    ball.addEventListener('touchstart',function(e){
      e.preventDefault();
      var t=e.touches[0];
      doClick({clientX:t.clientX,clientY:t.clientY});
    },{passive:false});
    // Spacebar to click
    var hint=ball.querySelector('.ck-space-hint');
    if(!hint&&ball.parentNode){
      hint=document.createElement('div');
      hint.className='ck-space-hint';
      hint.textContent='press SPACE to click';
      ball.parentNode.appendChild(hint);
    }
  }
  document.addEventListener('keydown',function(e){
    if(e.code!=='Space'&&e.key!==' ')return;
    var tag=(document.activeElement&&document.activeElement.tagName)||'';
    if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||document.activeElement&&document.activeElement.isContentEditable)return;
    var gc=document.getElementById('gameClicker');
    if(!gc||gc.style.display==='none')return;
    e.preventDefault();
    var r=ball?ball.getBoundingClientRect():null;
    doClick({clientX:r?r.left+r.width/2:window.innerWidth/2,clientY:r?r.top+r.height/2:window.innerHeight/2});
  });
  updateUI();
  renderPanel();

  // Set up right panel news
  var rp=document.getElementById('ckRightPanel');
  if(rp){
    rp.style.display='';
    var news=document.getElementById('ckNews');
    if(news){
      news.innerHTML='<h4>\uD83D\uDCF0 News</h4><div class="ck-news-list"></div>';
      addNews('Welcome to PokeClicker! Click the Pokeball to earn coins!');
      addNews('Buy buildings to earn coins passively!');
    }
  }

  // Set up initial tab state
  var tabs=document.querySelectorAll('.ck-tab');
  if(tabs.length>0)tabs[0].classList.add('active');

  // Game loop - 10 ticks per second
  gameLoop=setInterval(tick,100);
  // Auto save every 5 seconds
  saveInterval=setInterval(saveGame,5000);
  // News cycle every 15 seconds
  newsInterval=setInterval(cycleNews,15000);
  // Golden pokeball spawning
  scheduleGolden();

  // Save on page unload
  window.addEventListener('beforeunload',saveGame);
}

window.initClicker=initClicker;

// Auto-initialize if clicker page is already visible
if(document.getElementById('gameClicker')&&document.getElementById('gameClicker').style.display!=='none'){
  initClicker();
}

})();
