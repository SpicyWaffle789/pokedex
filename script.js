const TYPES=['normal','fire','water','electric','grass','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy']
const GEN_LIMITS=[0,151,251,386,493,649,721,809,905,1025]
let allPokemon=[],filteredPokemon=[],pokemonCache={},cardsCache={},loadedCount=0,currentTab='home',allMoves=[],allAbilities=[],moveCache={},abilityCache={}
const PAGE_SIZE=9999
function updateOfflineIndicator(){const el=document.getElementById('offlineIndicator');if(el)el.style.display=navigator.onLine?'none':'inline-block'}
window.addEventListener('online',updateOfflineIndicator)
window.addEventListener('offline',updateOfflineIndicator)
document.addEventListener('DOMContentLoaded',updateOfflineIndicator)
async function init(){
  switchTab('home')
  const cached=localStorage.getItem('pokeAllPokemonList')
  if(cached){
    try{allPokemon=JSON.parse(cached)}catch(e){}
  }
  if(!allPokemon.length&&typeof OFFLINE_POKEMON!=='undefined'){
    allPokemon=OFFLINE_POKEMON.map(p=>({name:p.name,id:p.id,url:''}))
  }
  if(!allPokemon.length){
    try{
      const res=await fetch('https://pokeapi.co/api/v2/pokemon?limit=100000&offset=0')
      const data=await res.json()
      allPokemon=data.results.map(p=>{
        const match=p.url.match(/\/(\d+)\/$/);return{...p,id:match?parseInt(match[1]):0}
      })
      localStorage.setItem('pokeAllPokemonList',JSON.stringify(allPokemon))
    }catch(e){
      document.getElementById('loading').innerHTML='<div style="color:var(--text-dim);font-size:14px;padding:20px"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-alert-triangle"/></svg> Offline — no cached data available.</div>'
      return
    }
  }else{
    try{localStorage.setItem('pokeAllPokemonList',JSON.stringify(allPokemon))}catch(e){}
  }
  const sel=document.getElementById('typeFilter')
  TYPES.forEach(t=>{const o=document.createElement('option');o.value=t;o.textContent=t.charAt(0).toUpperCase()+t.slice(1);sel.appendChild(o)})
  filterPokemon()
  document.getElementById('loading').style.display='none'
  document.getElementById('grid').style.display='grid'
  if(typeof OFFLINE_POKEMON!=='undefined'){
    OFFLINE_POKEMON.forEach(op=>{
      const card=document.querySelector('.pokemon-card[data-id="'+op.id+'"]')
      if(card&&!card.querySelector('.types')){
        const div=document.createElement('div');div.className='types'
        op.types.forEach(t=>{const s=document.createElement('span');s.className='type-badge type-'+t;s.textContent=t;div.appendChild(s)})
        card.appendChild(div)
      }
    })
  }else{
    batchLoadTypes()
  }
  preCacheOfflineData()
  renderPotd()
}
const POTD_DESCS=['A mysterious Pokémon with a unique aura today.','Today\'s chosen one spreads joy everywhere.','This little one is ready for adventure!','A powerful friend watches over you today.','Stars align for this special Pokémon.','Today\'s champion in the making!','A rare sighting on this fine day.','The universe picks this one just for you.','Legendary potential in this daily pick.','Destiny smiles upon today\'s Pokémon.']
function renderPotd(){
  const today=new Date()
  const seed=today.getFullYear()*10000+(today.getMonth()+1)*100+today.getDate()
  const id=(seed*2654435761>>>0)%1025+1
  const container=document.getElementById('potdContainer')
  if(!container)return
  const sprite='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'+id+'.png'
  const desc=POTD_DESCS[id%POTD_DESCS.length]
  const typeColors={normal:'#A8A878',fire:'#F08030',water:'#6890F0',electric:'#F8D030',grass:'#78C850',ice:'#98D8D8',fighting:'#C03028',poison:'#A040A0',ground:'#E0C068',flying:'#A890F0',psychic:'#F85888',bug:'#A8B820',rock:'#B8A038',ghost:'#705898',dragon:'#7038F8',dark:'#705848',steel:'#B8B8D0',fairy:'#EE99AC'}
  container.innerHTML='<div class="potd" onclick="openDetail('+id+')"><img class="potd-sprite" src="'+sprite+'" alt="Pokemon #'+id+'" onerror="this.style.display=\'none\'"><div class="potd-info"><div class="potd-label">Pokemon of the Day</div><div class="potd-name" id="potdName">Loading...</div><div class="potd-types" id="potdTypes"></div><div class="potd-desc">'+desc+'</div></div><div class="potd-arrow"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-chevron-right"/></svg></div></div>'
  fetch('https://pokeapi.co/api/v2/pokemon/'+id).then(r=>r.json()).then(d=>{
    const nameEl=document.getElementById('potdName')
    if(nameEl)nameEl.textContent=d.name.charAt(0).toUpperCase()+d.name.slice(1)
    const typesEl=document.getElementById('potdTypes')
    if(typesEl){
      typesEl.innerHTML=''
      d.types.forEach(t=>{
        const s=document.createElement('span')
        s.className='potd-type'
        s.style.background=typeColors[t.type.name]||'#68A090'
        s.textContent=t.type.name
        typesEl.appendChild(s)
      })
    }
  }).catch(e=>{})
}

async function preCacheOfflineData(){
  if(!localStorage.getItem('pokeTcgSets')){
    if(typeof OFFLINE_SETS!=='undefined'&&OFFLINE_SETS.length){
      allSets=OFFLINE_SETS
      try{localStorage.setItem('pokeTcgSets',JSON.stringify(allSets))}catch(e){}
    }else{
      try{
        const sRes=await fetch('https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master/sets/en.json')
        allSets=await sRes.json()
        localStorage.setItem('pokeTcgSets',JSON.stringify(allSets))
      }catch(e){}
    }
  }else{
    try{allSets=JSON.parse(localStorage.getItem('pokeTcgSets'))}catch(e){}
  }
  if(!localStorage.getItem('pokeAllMovesList')){
    if(typeof OFFLINE_MOVES!=='undefined'&&OFFLINE_MOVES.length){
      allMoves=OFFLINE_MOVES
      try{localStorage.setItem('pokeAllMovesList',JSON.stringify(allMoves))}catch(e){}
    }else{
      try{
        const res=await fetch('https://pokeapi.co/api/v2/move?limit=100000')
        const data=await res.json()
        allMoves=data.results.map(m=>{const match=m.url.match(/\/(\d+)\/$/);return{...m,id:match?parseInt(match[1]):0}})
        localStorage.setItem('pokeAllMovesList',JSON.stringify(allMoves))
      }catch(e){}
    }
  }else{
    try{allMoves=JSON.parse(localStorage.getItem('pokeAllMovesList'))}catch(e){}
  }
  if(!localStorage.getItem('pokeAllAbilitiesList')){
    if(typeof OFFLINE_ABILITIES!=='undefined'&&OFFLINE_ABILITIES.length){
      allAbilities=OFFLINE_ABILITIES
      try{localStorage.setItem('pokeAllAbilitiesList',JSON.stringify(allAbilities))}catch(e){}
    }else{
      try{
        const res=await fetch('https://pokeapi.co/api/v2/ability?limit=100000')
        const data=await res.json()
        allAbilities=data.results.map(a=>{const match=a.url.match(/\/(\d+)\/$/);return{...a,id:match?parseInt(match[1]):0}})
        localStorage.setItem('pokeAllAbilitiesList',JSON.stringify(allAbilities))
      }catch(e){}
    }
  }else{
    try{allAbilities=JSON.parse(localStorage.getItem('pokeAllAbilitiesList'))}catch(e){}
  }
}

function filterPokemon(){
  const q=document.getElementById('searchInput').value.toLowerCase().trim()
  const type=document.getElementById('typeFilter').value.toLowerCase()
  const gen=parseInt(document.getElementById('genFilter').value)||0
  const startId=gen>0?GEN_LIMITS[gen-1]+1:0,endId=gen>0?GEN_LIMITS[gen]:Infinity
  filteredPokemon=allPokemon.filter(p=>{
    if(p.id<startId||p.id>endId)return false
    if(q&&!p.name.includes(q)&&!p.id.toString().includes(q))return false
    if(type&&p.types&&!p.types.includes(type))return false
    return true
  })
  loadedCount=0;document.getElementById('grid').innerHTML='';loadMore()
}

function loadMore(){
  const end=Math.min(loadedCount+PAGE_SIZE,filteredPokemon.length)
  const batch=filteredPokemon.slice(loadedCount,end)
  const grid=document.getElementById('grid')
  batch.forEach(p=>{
    const card=document.createElement('div')
    card.className='pokemon-card';card.dataset.id=p.id;card.dataset.type=p.types?.[0]||''
    card.innerHTML='<span class="id-badge">#'+String(p.id).padStart(4,'0')+'</span>'+
      '<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'+p.id+'.png" alt="'+p.name+'" loading="lazy" onerror="this.outerHTML=\'<div class=\\\'img-placeholder\\\'><span>\'+this.alt.charAt(0).toUpperCase()+\'</span></div>\'">'+
      '<div class="name">'+p.name+'</div>'
    card.onclick=()=>openDetail(p.id)
    grid.appendChild(card)
  })
  loadedCount=end
}

async function batchLoadTypes(){
  for(let i=0;i<allPokemon.length;i+=50){
    const batch=allPokemon.slice(i,i+50)
    await Promise.allSettled(batch.map(async p=>{
      try{
        const cacheKey='pokeTypes_'+p.id
        const cached=localStorage.getItem(cacheKey)
        if(cached){
          p.types=JSON.parse(cached)
          const card=document.querySelector('.pokemon-card[data-id="'+p.id+'"]')
          if(card&&!card.querySelector('.types')){
            const div=document.createElement('div');div.className='types'
            p.types.forEach(t=>{const s=document.createElement('span');s.className='type-badge type-'+t;s.textContent=t;div.appendChild(s)})
            card.appendChild(div)
          }
          return
        }
        const res=await fetch('https://pokeapi.co/api/v2/pokemon/'+p.id)
        const data=await res.json()
        p.types=data.types.map(t=>t.type.name)
        try{localStorage.setItem(cacheKey,JSON.stringify(p.types))}catch(e){}
        const card=document.querySelector('.pokemon-card[data-id="'+p.id+'"]')
        if(!card)return
        const div=document.createElement('div');div.className='types'
        p.types.forEach(t=>{const s=document.createElement('span');s.className='type-badge type-'+t;s.textContent=t;div.appendChild(s)})
        card.appendChild(div)
      }catch(e){}
    }))
  }
}

async function openDetail(id){
  // achCheck removed: only game activities trigger achievements
  document.getElementById('detailContent').innerHTML='<div class="loading" style="padding:60px"><div class="spinner"></div></div>'
  document.getElementById('detailModal').classList.add('active')
  document.body.style.overflow='hidden'
  const p=pokemonCache[id]
  if(p){renderDetail(p);rvAdd('pokemon',id,p.name,'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'+id+'.png');return}
  const cacheKey='pokeDetail_'+id
  const cached=localStorage.getItem(cacheKey)
  if(cached){
    try{pokemonCache[id]=JSON.parse(cached);renderDetail(pokemonCache[id]);rvAdd('pokemon',id,pokemonCache[id].name,'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'+id+'.png');return}catch(e){}
  }
  try{
    const res=await fetch('https://pokeapi.co/api/v2/pokemon/'+id)
    const data=await res.json()
    let genus='',evos=[]
    try{
      const sr=await fetch('https://pokeapi.co/api/v2/pokemon-species/'+id)
      if(sr.ok){
        const species=await sr.json()
        genus=(species.genera.find(g=>g.language.name==='en')||{}).genus||''
        const cr=await fetch(species.evolution_chain?.url||'')
        const chainData=cr.ok?await cr.json():null
        if(chainData){let e=[],c=chainData.chain;while(c){if(c.species)e.push(c.species.name);c=c.evolves_to?.[0]||null}evos=e}
      }
    }catch(e){}
    pokemonCache[id]={...data,genus,evolutions:evos}
    try{localStorage.setItem(cacheKey,JSON.stringify(pokemonCache[id]))}catch(e){}
    renderDetail(pokemonCache[id])
    rvAdd('pokemon',id,data.name,'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'+id+'.png')
  }catch(e){
    if(cached){try{pokemonCache[id]=JSON.parse(cached);renderDetail(pokemonCache[id]);return}catch(e2){}}
    document.getElementById('detailContent').innerHTML='<div style="padding:40px;text-align:center;color:var(--text-dim)">Failed to load Pokemon data</div>'
  }
}

function renderDetail(p){
  const padId=String(p.id).padStart(4,'0')
  const stats=p.stats.map(s=>({name:s.stat.name,value:s.base_stat}))
  const total=stats.reduce((a,s)=>a+s.value,0)
  const l={hp:'HP',attack:'ATK',defense:'DEF','special-attack':'SPA','special-defense':'SPD',speed:'SPE'}
  const types=p.types.map(t=>t.type.name)
  document.getElementById('detailContent').innerHTML=
    '<div class="modal-header">'+
      '<div class="poke-id">#'+padId+'</div>'+
      '<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'+p.id+'.png" alt="'+p.name+'" onerror="this.outerHTML=\'<div class=\\\'detail-placeholder\\\'><span>\'+this.alt.charAt(0).toUpperCase()+\'</span></div>\'">'+
      '<div class="poke-name">'+p.name+'</div>'+
      (p.genus?'<div style="font-size:13px;color:var(--text-dim);margin-bottom:8px">'+p.genus+'</div>':'')+
      '<div class="types">'+types.map(t=>'<span class="type-badge type-'+t+'">'+t+'</span>').join('')+'</div>'+
    '</div>'+
    '<div class="modal-body">'+
      '<div class="stats-section">'+
        '<h3>Base Stats <span style="font-weight:400;font-size:12px;color:var(--text-muted)">(Total: '+total+')</span></h3>'+
        stats.map(s=>'<div class="stat-row"><div class="stat-label">'+(l[s.name]||s.name)+'</div><div class="stat-bar-bg"><div class="stat-bar stat-'+s.name+'" style="width:'+Math.min((s.value/255)*100,100)+'%"></div></div><div class="stat-value">'+s.value+'</div></div>').join('')+
      '</div>'+
      '<div class="info-grid">'+
        '<div class="info-item"><div class="label">Height</div><div class="value">'+(p.height/10).toFixed(1)+' m</div></div>'+
        '<div class="info-item"><div class="label">Weight</div><div class="value">'+(p.weight/10).toFixed(1)+' kg</div></div>'+
        '<div class="info-item"><div class="label">Base XP</div><div class="value">'+(p.base_experience||'N/A')+'</div></div>'+
        (p.evolutions&&p.evolutions.length?'<div class="info-item"><div class="label">Evolutions</div><div class="value">'+p.evolutions.map(e=>e.charAt(0).toUpperCase()+e.slice(1)).join(' → ')+'</div></div>':'')+
      '</div>'+
      '<div>'+
        '<h3 style="font-size:16px;font-weight:700;margin-bottom:10px;color:var(--text);text-transform:uppercase;letter-spacing:1px">Abilities</h3>'+
        '<div class="abilities-list">'+p.abilities.map(a=>'<span class="ability-tag">'+a.ability.name.replace('-',' ')+(a.is_hidden?'<span class="hidden-ability">(H)</span>':'')+'</span>').join('')+'</div>'+
      '</div>'+
      (p.moves&&p.moves.length?'<div style="margin-top:12px">'+
        '<h3 style="font-size:14px;font-weight:700;margin-bottom:8px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px">Moves <span style="font-weight:400;font-size:11px;color:var(--text-muted)">('+[...new Set(p.moves.map(m=>m.move.name))].length+')</span></h3>'+
        '<div class="abilities-list" style="max-height:220px;overflow-y:auto">'+[...new Set(p.moves.map(m=>m.move.name))].sort().map(m=>'<span class="ability-tag">'+m.replace(/-/g,' ')+'</span>').join('')+'</div>'+
      '</div>':'')+
      '<div class="cards-section">'+
        '<h3>Pokemon Cards &amp; Prices</h3>'+
        '<div id="cardsGrid" class="cards-grid"></div>'+
      '</div>'+
      '<div class="cards-section" id="ownedCardsSection" style="margin-top:12px">'+
        '<h3>Your Cards <span style="font-weight:400;font-size:12px;color:var(--text-muted)">(collection)</span></h3>'+
        '<div id="ownedCardsGrid" class="cards-grid" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr))"></div>'+
      '</div>'+
    '</div>'
  loadCards(p.name,p.id)
  renderOwnedCards(p.name)
}
function renderOwnedCards(pokemonName){
  const grid=document.getElementById('ownedCardsGrid')
  if(!grid)return
  const nameLower=pokemonName.toLowerCase()
  const d=pcGetAll()
  const owned=Object.entries(d).filter(([id,c])=>c.name.toLowerCase().includes(nameLower))
  if(!owned.length){grid.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:16px;color:var(--text-muted);font-size:13px">You don\'t own any '+pokemonName+' cards yet. <span style="color:var(--text-muted);cursor:pointer" onclick="switchTab(\'sets\')">Browse Card Sets →</span></div>';return}
  grid.innerHTML=owned.map(([id,c])=>{
    const priceStr=c.price?'$'+(c.price*c.qty).toFixed(2):''
    return '<div class="card-item" style="cursor:default">'+
      (c.img?'<img src="'+c.img+'" alt="'+c.name+'" loading="lazy" onerror="this.style.display=\'none\'">':'<div style="height:100px;display:flex;align-items:center;justify-content:center;background:var(--surface);font-size:24px">🃏</div>')+
      '<div class="card-info">'+
        '<div class="card-set">'+(c.setName||'')+'</div>'+
        '<div class="card-name">'+c.name+'</div>'+
        (priceStr?'<div class="card-price" style="color:var(--ctp-green)">'+priceStr+'</div>':'')+
        '<div style="font-size:11px;color:var(--text-muted)">×'+c.qty+'</div>'+
      '</div>'+
    '</div>'
  }).join('')
}

async function loadCards(name,id){
  const grid=document.getElementById('cardsGrid')
  if(!grid)return
  renderFallback(name,grid)
  if(cardsCache[id])return
  try{
    const res=await fetch('https://api.pokemontcg.io/v2/cards?q=name:'+encodeURIComponent(name)+'&orderBy=set.releaseDate&pageSize=20')
    if(!res.ok)throw new Error('API Error')
    const data=await res.json()
    const cards=data.data||[]
    cardsCache[id]=cards
    if(cards.length)renderCards(cards,grid,name)
  }catch(e){}
}

function renderFallback(name,grid){
  const pc='https://www.pricecharting.com/search-products?q='+encodeURIComponent(name+' pokemon card')+'&type=prices'
  const tcg='https://www.tcgplayer.com/search/all/product?q='+encodeURIComponent(name+' pokemon')
  const ebay='https://www.ebay.com/sch/i.html?_nkw='+encodeURIComponent(name+' pokemon card')
  grid.innerHTML='<div class="fallback-box">'+
    '<p>View '+name+' card prices on these marketplaces:</p>'+
    '<div class="btn-group">'+
      '<a href="'+pc+'" target="_blank" class="btn btn-pc">PriceCharting ↗</a>'+
      '<a href="'+tcg+'" target="_blank" class="btn btn-tcg">TCGPlayer ↗</a>'+
      '<a href="'+ebay+'" target="_blank" class="btn btn-ebay">eBay ↗</a>'+
    '</div>'+
  '</div>'
}

function renderCards(cards,grid,name){
  renderFallback(name,grid)
  grid.innerHTML=cards.map(c=>{
    const price=c.cardmarket?.prices?.averageSellPrice||c.tcgplayer?.prices?.normal?.market
    const priceHtml=price?'$'+price.toFixed(2):'<span class="no-price">Check PriceCharting</span>'
    const img=c.images?.small||''
  const num=c.number?' '+c.number+'/'+window._setTotal:''
    const q=encodeURIComponent(c.name+num+' '+(c.set?.name||'')+' pokemon card')
    const cid=c.id||c.name+'_'+Date.now()
    const inCol=pcGetCard(cid)
    return '<div class="card-item'+(inCol?' in-collection':'')+'" data-cid="'+cid+'">'+
      '<img src="'+img+'" alt="'+c.name+'" loading="lazy" onerror="this.style.display=\'none\'">'+
      '<div class="card-info">'+
        '<div class="card-set">'+(c.set?.name||'')+'</div>'+
        '<div class="card-name">'+c.name+(c.rarity?' ('+c.rarity+')':'')+'</div>'+
        '<div class="card-price">'+priceHtml+'</div>'+
        '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">'+
          (inCol?'<span class="col-add-btn owned">✓ Owned ×'+inCol.qty+'</span>'
                :'<span class="col-add-btn" onclick="pcAddCard(\''+cid+'\',\''+c.name.replace(/'/g,"\\'")+'\',\''+(c.set?.name||'').replace(/'/g,"\\'")+'\','+(price||0)+',\''+img+'\');this.outerHTML=\'<span class=\\\'col-add-btn owned\\\'>✓ Owned ×1</span>\'">+ Add</span>')+
          '<a href="https://www.pricecharting.com/search-products?q='+q+'&type=prices" target="_blank" class="pc-link">PriceCharting ↗</a>'+
        '</div>'+
      '</div>'+
    '</div>'
  }).join('')+'<div style="grid-column:1/-1">'+grid.querySelector('.fallback-box').outerHTML+'</div>'
  window._lastCards=cards
}

function closeDetail(){document.getElementById('detailModal').classList.remove('active');document.body.style.overflow=''}
function closeSetDetail(){document.getElementById('setDetailModal').classList.remove('active');document.body.style.overflow=''}
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){closeDetail();closeSetDetail();closeMoveDetail();closeAbilityDetail()}
})

let allSets=[],setCardsCache={}

function switchTab(tab){
  const gameNames=['wordle','whosthat','typespeed','memory','speedrun','typequiz','numberroll','achievements','clicker']
  if(gameNames.includes(tab)){currentTab='games';currentGame=tab;setTimeout(()=>selectGame(tab),10)}
  else currentTab=tab
  tab=currentTab
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'))
  const tabEl=document.querySelector('.tab[data-tab="'+tab+'"]')
  if(tabEl)tabEl.classList.add('active')
  document.getElementById('homePage').style.display=tab==='home'?'block':'none'
  document.getElementById('pokePage').style.display=tab==='pokemon'?'block':'none'
  document.getElementById('setsPage').style.display=tab==='sets'?'block':'none'
  document.getElementById('attackPage').style.display=tab==='attacks'?'block':'none'
  document.getElementById('abilityPage').style.display=tab==='abilities'?'block':'none'
  document.getElementById('gamesPage').style.display=tab==='games'?'block':'none'
  document.getElementById('leaderboardPage').style.display=tab==='leaderboard'?'block':'none'
  document.getElementById('battlePage').style.display=tab==='battle'?'block':'none'
  document.getElementById('operatorPage').style.display=tab==='operator'?'block':'none'
  document.getElementById('collectionPage').style.display=tab==='collection'?'block':'none'
  document.getElementById('aboutPage').style.display=tab==='about'?'block':'none'
  document.getElementById('wallpaperPage').style.display=tab==='wallpaper'?'block':'none'
  document.getElementById('toolsPage').style.display=tab==='tools'?'block':'none'
  document.querySelector('.search-container').style.display=tab==='home'||tab==='sets'||tab==='games'||tab==='leaderboard'||tab==='battle'||tab==='operator'||tab==='collection'||tab==='about'||tab==='wallpaper'?'none':'block'
  document.getElementById('pokeFilters').style.display=tab==='pokemon'?'flex':'none'
  document.getElementById('attackFilters').style.display=tab==='attacks'?'flex':'none'
  document.getElementById('abilityFilters').style.display=tab==='abilities'?'flex':'none'
  const inp=document.getElementById('searchInput')
  if(tab==='pokemon')inp.placeholder='Search Pokemon...'
  else if(tab==='attacks')inp.placeholder='Search moves...'
  else if(tab==='abilities')inp.placeholder='Search abilities...'
  inp.value=''
  if(tab==='sets'){
    if(allSets.length)renderSets()
    else loadSets()
  }
  if(tab==='attacks'){
    if(allMoves.length){
      const sel=document.getElementById('moveTypeFilter')
      if(sel.options.length<=1)TYPES.forEach(t=>{const o=document.createElement('option');o.value=t;o.textContent=t.charAt(0).toUpperCase()+t.slice(1);sel.appendChild(o)})
      document.getElementById('movesLoading').style.display='none'
      document.getElementById('movesGrid').style.display='grid'
      filterMoves()
    }else loadMoves()
  }
  if(tab==='abilities'){
    if(allAbilities.length){
      document.getElementById('abilitiesLoading').style.display='none'
      document.getElementById('abilitiesGrid').style.display='grid'
      filterAbilities()
    }else loadAbilities()
  }
  if(tab==='pokemon')filterPokemon()
  if(tab==='games')selectGame(currentGame||'wordle')
  if(tab==='leaderboard')renderLeaderboard()
  if(tab==='battle')initBattle()
  if(tab==='tools')selectTool(currentTool||'teambuilder')
  if(tab==='collection')renderCollection()
}

async function loadSets(){
  document.getElementById('setsContent').innerHTML='<div class="set-loading"><div class="spinner"></div><div>Loading sets...</div></div>'
  const cached=localStorage.getItem('pokeTcgSets')
  if(cached){
    try{
      allSets=JSON.parse(cached)
      renderSets()
      return
    }catch(e){}
  }
  try{
    const res=await fetch('https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master/sets/en.json')
    allSets=await res.json()
    try{localStorage.setItem('pokeTcgSets',JSON.stringify(allSets))}catch(e){}
    renderSets()
  }catch(e){
    document.getElementById('setsContent').innerHTML='<div class="set-loading">Failed to load sets — go online once to cache</div>'
  }
}

function renderSets(){
  const series={}
  allSets.forEach(s=>{
    const key=s.series||'Other'
    if(!series[key])series[key]=[]
    series[key].push(s)
  })
  let html=''
  Object.entries(series).forEach(([name,sets])=>{
    html+='<div class="series-group"><h2>'+name+'</h2><div class="sets-grid">'
    sets.forEach(s=>{
      const year=s.releaseDate?s.releaseDate.split('/')[0]:''
      const fallback=s.name.charAt(0)+s.name.charAt(s.name.length-1)
      html+='<div class="set-card" onclick="openSet(\''+s.id+'\')">'+
        '<div class="set-logo"><img src="'+(s.images?.logo||'')+'" alt="'+s.name+'" onerror="this.outerHTML=\''+fallback+'\'" style="max-width:100%;max-height:100%;object-fit:contain"></div>'+
        '<div class="set-name">'+s.name+'</div>'+
        '<div class="set-series">'+name+'</div>'+
        '<div class="set-meta">'+(year?year+' · ':'')+s.printedTotal+' cards</div>'+
        '</div>'
    })
    html+='</div></div>'
  })
  document.getElementById('setsContent').innerHTML=html
}

async function openSet(setId){
  document.getElementById('setDetailContent').innerHTML='<div class="set-loading"><div class="spinner" style="width:32px;height:32px"></div><div>Loading cards...</div></div>'
  document.getElementById('setDetailModal').classList.add('active')
  document.body.style.overflow='hidden'
  if(setCardsCache[setId]){renderSetDetail(setCardsCache[setId]);rvAdd('card',setId,(allSets.find(s=>s.id===setId)?.name||setId),'');return}
  const cacheKey='pokeSetCards_'+setId
  const cached=localStorage.getItem(cacheKey)
  if(cached){
    try{const cards=JSON.parse(cached);setCardsCache[setId]=cards;renderSetDetail(cards);rvAdd('card',setId,(allSets.find(s=>s.id===setId)?.name||setId),'');return}catch(e){}
  }
  try{
    const res=await fetch('https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master/cards/en/'+setId+'.json')
    const cards=await res.json()
    setCardsCache[setId]=cards
    try{localStorage.setItem(cacheKey,JSON.stringify(cards))}catch(e){}
    renderSetDetail(cards)
    rvAdd('card',setId,(allSets.find(s=>s.id===setId)?.name||setId),'')
  }catch(e){
    if(cached){try{const cards=JSON.parse(cached);setCardsCache[setId]=cards;renderSetDetail(cards);return}catch(e2){}}
    document.getElementById('setDetailContent').innerHTML='<div style="padding:40px;text-align:center;color:var(--text-dim)">Failed to load set cards</div>'
  }
}

function renderSetDetail(cards){
  const set=allSets.find(s=>s.id===cards[0]?.id?.split('-')[0])
  window._setCards=cards
  window._setTotal=set?.printedTotal||0
  document.getElementById('setDetailContent').innerHTML=
    '<div class="modal-header">'+
      '<div class="poke-name">'+(set?.name||'Set Cards')+'</div>'+
      (set?'<div style="font-size:13px;color:var(--text-dim)">'+(set.series||'')+' · '+set.printedTotal+' cards · Released '+set.releaseDate.split('/').reverse().join('/')+'</div>':'')+
    '</div>'+
    '<div class="set-cards-grid">'+
    cards.map((c,i)=>{
      const types=(c.types||[]).map(t=>'<span class="type-badge type-'+t.toLowerCase()+'">'+t+'</span>').join('')
      return '<div class="set-card-item" onclick="openCardPrices('+i+')">'+
        '<img src="'+((c.images?.small||c.images?.large)||'')+'" alt="'+c.name+'" loading="lazy" onerror="this.outerHTML=\'<div style=\'width:100%;aspect-ratio:2.5/3.5;display:flex;align-items:center;justify-content:center;background:var(--surface);padding:6px;font-size:11px;color:var(--text-muted);text-align:center\' class=\'set-card-item\'>'+c.name+'</div>\'">'+
        '<div class="sc-info">'+
          '<div class="sc-name">'+c.name+(c.rarity?' <span style="color:var(--text-muted);font-weight:400">('+c.rarity+')</span>':'')+'</div>'+
          (c.supertype? '<div class="sc-meta">'+c.supertype+(c.hp?' · '+c.hp+' HP':'')+'</div>':'')+
          (types?'<div style="margin-top:4px">'+types+'</div>':'')+
        '</div>'+
      '</div>'
    }).join('')+
    '</div>'
}

function openCardPrices(idx){
  const cards=window._setCards
  if(!cards||!cards[idx])return
  const c=cards[idx]
  const price=c.cardmarket?.prices?.averageSellPrice||c.tcgplayer?.prices?.normal?.market
  if(price>0)phRecordPrice(c.id,price)
    const num=c.number?' '+c.number+'/'+(c.set?.printedTotal||''):''
  const setName=(c.set?.name||'')
  const q=encodeURIComponent(c.name+num+' '+setName+' pokemon card')
  const qe=encodeURIComponent(c.name+num+' pokemon')
  const types=(c.types||[]).map(t=>'<span class="type-badge type-'+t.toLowerCase()+'">'+t+'</span>').join('')
  const attacks=(c.attacks||[]).map(a=>
    '<div style="background:var(--surface);border-radius:8px;padding:8px 10px;margin-bottom:6px;border:1px solid var(--border-light)">'+
      '<div style="font-size:13px;font-weight:600">'+a.name+'</div>'+
      (a.damage?'<div style="font-size:12px;color:var(--ctp-peach);font-weight:600">'+a.damage+' damage</div>':'')+
      (a.text?'<div style="font-size:11px;color:var(--text-dim);margin-top:2px">'+a.text+'</div>':'')+
    '</div>'
  ).join('')
  const abilities=(c.abilities||[]).map(a=>
    '<div style="background:var(--surface);border-radius:8px;padding:8px 10px;margin-bottom:6px;border:1px solid var(--border-light)">'+
      '<div style="font-size:12px;color:var(--ctp-yellow);font-weight:600">Ability: '+a.name+'</div>'+
      (a.text?'<div style="font-size:11px;color:var(--text-dim);margin-top:2px">'+a.text+'</div>':'')+
    '</div>'
  ).join('')
  const hp=c.hp?'<div class="info-item"><div class="label">HP</div><div class="value" style="color:var(--ctp-red)">'+c.hp+'</div></div>':''
  const evo=c.evolvesFrom?'<div class="info-item"><div class="label">Evolves From</div><div class="value">'+c.evolvesFrom+'</div></div>':''
  const weak=(c.weaknesses||[]).map(w=>w.type+(w.value?' '+w.value:'')).join(', ')
  const resist=(c.resistances||[]).map(r=>r.type+(r.value?' '+r.value:'')).join(', ')
  const retreat=c.retreatCost?.length||'—'
  const typesHtml=types?'<div style="margin:6px 0 12px">'+types+'</div>':''
  const old=document.getElementById('cardPriceDetail')
  if(old)old.remove()
  const div=document.createElement('div')
  div.id='cardPriceDetail'
  div.style.cssText='border-top:1px solid var(--border-light);margin-top:12px'
  div.innerHTML=
    '<div class="modal-header" style="padding:16px 24px 8px;text-align:left;background:none">'+
      '<div style="display:flex;gap:16px;align-items:start">'+
        (c.images?.small||c.images?.large?'<img src="'+(c.images.small||c.images.large)+'" alt="'+c.name+'" style="width:80px;height:112px;object-fit:contain;border-radius:6px;background:var(--surface);padding:4px;flex-shrink:0">':'')+
        '<div>'+
          '<div class="poke-name" style="font-size:18px;margin:0">'+c.name+'</div>'+
          (c.set?.name?'<div style="font-size:11px;color:var(--text-dim)">'+c.set.name+(c.rarity?' · '+c.rarity:'')+(c.id?' · #'+c.id:'')+'</div>':'')+
          (c.supertype?'<div style="font-size:11px;color:var(--text-muted);margin-top:2px">'+c.supertype+(c.subtypes?.length?' ('+c.subtypes.join(', ')+')':'')+'</div>':'')+
          typesHtml+
        '</div>'+
      '</div>'+
    '</div>'+
    '<div style="padding:0 24px 16px">'+
      '<div class="info-grid" style="margin-bottom:12px">'+
        hp+evo+
        (weak?'<div class="info-item"><div class="label">Weakness</div><div class="value">'+weak+'</div></div>':'')+
        (resist?'<div class="info-item"><div class="label">Resistance</div><div class="value">'+resist+'</div></div>':'')+
        '<div class="info-item"><div class="label">Retreat</div><div class="value">'+retreat+'</div></div>'+
      '</div>'+
      (abilities?'<div style="margin-bottom:10px"><h3 style="font-size:13px;font-weight:700;margin-bottom:6px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px">Abilities</h3>'+abilities+'</div>':'')+
      (attacks?'<div style="margin-bottom:12px"><h3 style="font-size:13px;font-weight:700;margin-bottom:6px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px">Attacks</h3>'+attacks+'</div>':'')+
      '<div class="fallback-box" style="border:none;background:var(--surface);padding:12px;margin:0">'+
        '<p style="margin-bottom:10px;font-size:13px">View prices on:</p>'+
        '<div class="btn-group" style="margin-bottom:8px">'+
          '<a href="https://www.pricecharting.com/search-products?q='+q+'&type=prices" target="_blank" class="btn btn-pc">PriceCharting ↗</a>'+
          '<a href="https://www.tcgplayer.com/search/all/product?q='+qe+'" target="_blank" class="btn btn-tcg">TCGPlayer ↗</a>'+
          '<a href="https://www.ebay.com/sch/i.html?_nkw='+q+'" target="_blank" class="btn btn-ebay">eBay ↗</a>'+
        '</div>'+
        (pcGetCard(c.id)?'<span class="col-add-btn owned">✓ Owned ×'+pcGetCard(c.id).qty+'</span>'
          :'<span class="col-add-btn" onclick="pcAddCard(\''+c.id+'\',\''+c.name.replace(/'/g,"\\'")+'\',\''+(c.set?.name||'').replace(/'/g,"\\'")+'\','+(price||0)+',\''+((c.images?.small||c.images?.large)||'')+'\');this.className=\'col-add-btn owned\';this.textContent=\'✓ Owned ×1\'">+ Add to Collection</span>')+
      '</div>'+
    '</div>'
  document.getElementById('setDetailContent').appendChild(div)
  div.scrollIntoView({behavior:'smooth'})
}

function filterCurrent(){
  if(currentTab==='pokemon')filterPokemon()
  else if(currentTab==='attacks')filterMoves()
  else if(currentTab==='abilities')filterAbilities()
}

async function loadMoves(){
  document.getElementById('movesLoading').style.display='flex'
  document.getElementById('movesGrid').style.display='none'
  const sel=document.getElementById('moveTypeFilter')
  if(sel.options.length<=1)TYPES.forEach(t=>{const o=document.createElement('option');o.value=t;o.textContent=t.charAt(0).toUpperCase()+t.slice(1);sel.appendChild(o)})
  if(!allMoves.length&&typeof OFFLINE_MOVES!=='undefined'){
    allMoves=OFFLINE_MOVES.map(m=>({name:m.name,id:m.id,url:''}))
    allMoves.forEach(m=>{
      const od=OFFLINE_MOVES.find(o=>o.id===m.id)
      if(od){m.type=od.type;m.damageClass=od.damageClass;m.pp=od.pp;m.power=od.power;m.accuracy=od.accuracy;m.generation=od.generation;m.effectEntry=od.effectEntry}
    })
  }
  const cached=localStorage.getItem('pokeAllMovesList')
  if(cached){
    try{
      allMoves=JSON.parse(cached)
      allMoves.forEach(m=>{
        try{
          const d=JSON.parse(localStorage.getItem('pokeMoveDetail_'+m.id)||'null')
          if(d){m.type=d.type;m.damageClass=d.damageClass;m.pp=d.pp;m.power=d.power;m.accuracy=d.accuracy;m.generation=d.generation;m.effectEntry=d.effectEntry}
        }catch(e){}
      })
      filterMoves()
      document.getElementById('movesLoading').style.display='none'
      document.getElementById('movesGrid').style.display='grid'
      batchLoadMoveTypes()
      return
    }catch(e){}
  }
  try{
    const res=await fetch('https://pokeapi.co/api/v2/move?limit=100000')
    const data=await res.json()
    allMoves=data.results.map(m=>{
      const match=m.url.match(/\/(\d+)\/$/);return{...m,id:match?parseInt(match[1]):0}
    })
    try{localStorage.setItem('pokeAllMovesList',JSON.stringify(allMoves))}catch(e){}
    filterMoves()
    document.getElementById('movesLoading').style.display='none'
    document.getElementById('movesGrid').style.display='grid'
    batchLoadMoveTypes()
  }catch(e){
    document.getElementById('movesLoading').innerHTML='<div style="color:var(--text-dim)">Failed to load moves — go online once to cache</div>'
  }
}

function filterMoves(){
  const q=document.getElementById('searchInput').value.toLowerCase().trim()
  const type=document.getElementById('moveTypeFilter').value.toLowerCase()
  const dc=document.getElementById('moveDcFilter').value.toLowerCase()
  const gen=document.getElementById('moveGenFilter').value.toLowerCase()
  const filtered=allMoves.filter(m=>{
    if(q&&!m.name.toLowerCase().includes(q)&&!m.id.toString().includes(q))return false
    if(type&&m.type!==type)return false
    if(dc&&m.damageClass!==dc)return false
    if(gen&&m.generation!==gen)return false
    return true
  })
  renderMoves(filtered)
}

function renderMoves(moves){
  const grid=document.getElementById('movesGrid')
  if(!moves.length){
    grid.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-dim)">No moves found</div>'
    return
  }
  grid.innerHTML=moves.map(m=>{
    const typeHtml=m.type?'<span class="type-badge type-'+m.type+'">'+m.type+'</span>':''
    const dcHtml=m.damageClass?'<span class="dc-'+m.damageClass+'">'+m.damageClass+'</span>':''
    const ppHtml=m.pp!=null?'PP '+m.pp:''
    return '<div class="move-card" onclick="openMoveDetail('+m.id+')">'+
      '<div class="move-name">'+m.name.replace(/-/g,' ')+'</div>'+
      '<div class="move-info">'+typeHtml+dcHtml+'</div>'+
      (ppHtml?'<div class="move-pp">'+ppHtml+'</div>':'')+
    '</div>'
  }).join('')
}

async function batchLoadMoveTypes(){
  for(let i=0;i<allMoves.length;i+=50){
    const batch=allMoves.slice(i,i+50)
    await Promise.allSettled(batch.map(async m=>{
      try{
        const cacheKey='pokeMoveDetail_'+m.id
        const cached=localStorage.getItem(cacheKey)
        if(cached){
          const d=JSON.parse(cached)
          m.type=d.type;m.damageClass=d.damageClass;m.pp=d.pp;m.power=d.power;m.accuracy=d.accuracy;m.generation=d.generation;m.effectEntry=d.effectEntry
          return
        }
        if(typeof OFFLINE_MOVES!=='undefined'){
          const od=OFFLINE_MOVES.find(o=>o.id===m.id)
          if(od){m.type=od.type;m.damageClass=od.damageClass;m.pp=od.pp;m.power=od.power;m.accuracy=od.accuracy;m.generation=od.generation;m.effectEntry=od.effectEntry;return}
        }
        const res=await fetch('https://pokeapi.co/api/v2/move/'+m.id)
        const data=await res.json()
        m.type=data.type?.name||''
        m.damageClass=data.damage_class?.name||''
        m.pp=data.pp||null
        m.power=data.power||null
        m.accuracy=data.accuracy||null
        m.generation=data.generation?.name||''
        m.effectEntry=data.effect_entries?.find(e=>e.language.name==='en')||null
        try{localStorage.setItem(cacheKey,JSON.stringify({type:m.type,damageClass:m.damageClass,pp:m.pp,power:m.power,accuracy:m.accuracy,generation:m.generation,effectEntry:m.effectEntry}))}catch(e){}
      }catch(e){}
    }))
    filterMoves()
  }
}

async function openMoveDetail(id){
  document.getElementById('moveDetailContent').innerHTML='<div class="loading" style="padding:60px"><div class="spinner"></div></div>'
  document.getElementById('moveDetailModal').classList.add('active')
  document.body.style.overflow='hidden'
  if(moveCache[id]){renderMoveDetail(moveCache[id]);rvAdd('move',id,moveCache[id].name,'');return}
  const cacheKey='pokeMoveFull_'+id
  const cached=localStorage.getItem(cacheKey)
  if(cached){try{moveCache[id]=JSON.parse(cached);renderMoveDetail(moveCache[id]);rvAdd('move',id,moveCache[id].name,'');return}catch(e){}}
  try{
    const res=await fetch('https://pokeapi.co/api/v2/move/'+id)
    const data=await res.json()
    moveCache[id]=data
    try{localStorage.setItem(cacheKey,JSON.stringify(data))}catch(e){}
    renderMoveDetail(data)
    rvAdd('move',id,data.name,'')
  }catch(e){
    if(cached){try{moveCache[id]=JSON.parse(cached);renderMoveDetail(moveCache[id]);return}catch(e2){}}
    document.getElementById('moveDetailContent').innerHTML='<div style="padding:40px;text-align:center;color:var(--text-dim)">Failed to load move data</div>'
  }
}

function renderMoveDetail(m){
  const type=m.type?.name||''
  const dc=m.damage_class?.name||''
  const gen=m.generation?.name?.replace('generation-','Gen ').toUpperCase()||''
  const eff=m.effect_entries?.find(e=>e.language.name==='en')?.short_effect||m.effect_entries?.find(e=>e.language.name==='en')?.effect||''
  const flavor=m.flavor_text_entries?.find(e=>e.language.name==='en')?.flavor_text||''
  document.getElementById('moveDetailContent').innerHTML=
    '<div class="modal-header">'+
      '<div class="poke-name" style="font-size:26px;text-transform:capitalize">'+m.name.replace(/-/g,' ')+'</div>'+
      (type?'<div class="types" style="margin-top:6px"><span class="type-badge type-'+type+'">'+type+'</span>'+(dc?'<span class="dc-'+dc+'" style="font-size:13px;padding:4px 16px;border-radius:20px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-left:6px">'+dc+'</span>':'')+'</div>':'')+
      (gen?'<div style="font-size:12px;color:var(--text-muted);margin-top:6px">'+gen+'</div>':'')+
    '</div>'+
    '<div class="modal-body">'+
      '<div class="info-grid">'+
        (m.power!=null?'<div class="info-item"><div class="label">Power</div><div class="value" style="color:var(--ctp-peach);font-size:18px">'+(m.power||'—')+'</div></div>':'')+
        (m.accuracy!=null?'<div class="info-item"><div class="label">Accuracy</div><div class="value">'+(m.accuracy!=null?m.accuracy:'—')+'</div></div>':'')+
        (m.pp!=null?'<div class="info-item"><div class="label">PP</div><div class="value">'+m.pp+'</div></div>':'')+
        (m.priority?'<div class="info-item"><div class="label">Priority</div><div class="value">'+(m.priority>0?'+':'')+m.priority+'</div></div>':'')+
        (m.contest_type?.name?'<div class="info-item"><div class="label">Contest</div><div class="value">'+m.contest_type.name+'</div></div>':'')+
      '</div>'+
      (eff?'<div style="margin-bottom:16px"><h3 style="font-size:14px;font-weight:700;margin-bottom:6px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px">Effect</h3><p style="font-size:14px;line-height:1.6;color:var(--text)">'+eff+'</p></div>':'')+
      (flavor?'<div><h3 style="font-size:14px;font-weight:700;margin-bottom:6px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px">Description</h3><p style="font-size:13px;line-height:1.5;color:var(--text-dim)">'+flavor+'</p></div>':'')+
      (m.learned_by_pokemon&&m.learned_by_pokemon.length?'<div style="margin-top:16px"><h3 style="font-size:14px;font-weight:700;margin-bottom:8px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px">Learned by <span style="font-weight:400;font-size:11px;color:var(--text-muted)">('+m.learned_by_pokemon.length+' Pokémon)</span></h3><div class="abilities-list" style="max-height:220px;overflow-y:auto">'+m.learned_by_pokemon.map(p=>'<span class="ability-tag">'+((p.name||p.pokemon?.name||'').replace(/-/g,' '))+'</span>').join('')+'</div></div>':'')+
    '</div>'
}

function closeMoveDetail(){document.getElementById('moveDetailModal').classList.remove('active');document.body.style.overflow=''}

async function loadAbilities(){
  document.getElementById('abilitiesLoading').style.display='flex'
  document.getElementById('abilitiesGrid').style.display='none'
  if(!allAbilities.length&&typeof OFFLINE_ABILITIES!=='undefined'){
    allAbilities=OFFLINE_ABILITIES.map(a=>({name:a.name,id:a.id,url:''}))
    allAbilities.forEach(a=>{
      const od=OFFLINE_ABILITIES.find(o=>o.id===a.id)
      if(od){a.generation=od.generation;a.effectEntry=od.effectEntry;a.flavorText=od.flavorText}
    })
  }
  const cached=localStorage.getItem('pokeAllAbilitiesList')
  if(cached){
    try{
      allAbilities=JSON.parse(cached)
      filterAbilities()
      document.getElementById('abilitiesLoading').style.display='none'
      document.getElementById('abilitiesGrid').style.display='grid'
      batchLoadAbilityData()
      return
    }catch(e){}
  }
  try{
    const res=await fetch('https://pokeapi.co/api/v2/ability?limit=100000')
    const data=await res.json()
    allAbilities=data.results.map(a=>{
      const match=a.url.match(/\/(\d+)\/$/);return{...a,id:match?parseInt(match[1]):0}
    })
    try{localStorage.setItem('pokeAllAbilitiesList',JSON.stringify(allAbilities))}catch(e){}
    filterAbilities()
    document.getElementById('abilitiesLoading').style.display='none'
    document.getElementById('abilitiesGrid').style.display='grid'
    batchLoadAbilityData()
  }catch(e){
    document.getElementById('abilitiesLoading').innerHTML='<div style="color:var(--text-dim)">Failed to load abilities — go online once to cache</div>'
  }
}

function filterAbilities(){
  const q=document.getElementById('searchInput').value.toLowerCase().trim()
  const gen=document.getElementById('abilityGenFilter').value.toLowerCase()
  const filtered=allAbilities.filter(a=>{
    if(q&&!a.name.toLowerCase().includes(q)&&!a.id.toString().includes(q))return false
    if(gen&&a.generation!==gen)return false
    return true
  })
  renderAbilities(filtered)
}

function renderAbilities(abilities){
  const grid=document.getElementById('abilitiesGrid')
  if(!abilities.length){
    grid.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-dim)">No abilities found</div>'
    return
  }
  grid.innerHTML=abilities.map(a=>{
    const genLabel=a.generation?.replace('generation-','Gen ').toUpperCase()||''
    return '<div class="ability-card" onclick="openAbilityDetail('+a.id+')">'+
      '<div class="ability-name">'+a.name.replace(/-/g,' ')+'</div>'+
      (genLabel?'<div class="ability-gen">'+genLabel+'</div>':'')+
    '</div>'
  }).join('')
}

async function batchLoadAbilityData(){
  for(let i=0;i<allAbilities.length;i+=50){
    const batch=allAbilities.slice(i,i+50)
    await Promise.allSettled(batch.map(async a=>{
      try{
        const cacheKey='pokeAbilDetail_'+a.id
        const cached=localStorage.getItem(cacheKey)
        if(cached){
          const d=JSON.parse(cached)
          a.generation=d.generation;a.effectEntry=d.effectEntry;a.flavorText=d.flavorText
          return
        }
        if(typeof OFFLINE_ABILITIES!=='undefined'){
          const od=OFFLINE_ABILITIES.find(o=>o.id===a.id)
          if(od){a.generation=od.generation;a.effectEntry=od.effectEntry;a.flavorText=od.flavorText;return}
        }
        const res=await fetch('https://pokeapi.co/api/v2/ability/'+a.id)
        const data=await res.json()
        a.generation=data.generation?.name||''
        a.effectEntry=data.effect_entries?.find(e=>e.language.name==='en')||null
        a.flavorText=data.flavor_text_entries?.find(e=>e.language.name==='en')?.flavor_text||''
        try{localStorage.setItem(cacheKey,JSON.stringify({generation:a.generation,effectEntry:a.effectEntry,flavorText:a.flavorText}))}catch(e){}
      }catch(e){}
    }))
    filterAbilities()
  }
}

async function openAbilityDetail(id){
  document.getElementById('abilityDetailContent').innerHTML='<div class="loading" style="padding:60px"><div class="spinner"></div></div>'
  document.getElementById('abilityDetailModal').classList.add('active')
  document.body.style.overflow='hidden'
  if(abilityCache[id]){renderAbilityDetail(abilityCache[id]);rvAdd('ability',id,abilityCache[id].name,'');return}
  const cacheKey='pokeAbilFull_'+id
  const cached=localStorage.getItem(cacheKey)
  if(cached){try{abilityCache[id]=JSON.parse(cached);renderAbilityDetail(abilityCache[id]);rvAdd('ability',id,abilityCache[id].name,'');return}catch(e){}}
  try{
    const res=await fetch('https://pokeapi.co/api/v2/ability/'+id)
    const data=await res.json()
    abilityCache[id]=data
    try{localStorage.setItem(cacheKey,JSON.stringify(data))}catch(e){}
    renderAbilityDetail(data)
    rvAdd('ability',id,data.name,'')
  }catch(e){
    if(cached){try{abilityCache[id]=JSON.parse(cached);renderAbilityDetail(abilityCache[id]);return}catch(e2){}}
    document.getElementById('abilityDetailContent').innerHTML='<div style="padding:40px;text-align:center;color:var(--text-dim)">Failed to load ability data</div>'
  }
}

function renderAbilityDetail(a){
  const gen=a.generation?.name?.replace('generation-','Gen ').toUpperCase()||''
  const eff=a.effect_entries?.find(e=>e.language.name==='en')?.short_effect||a.effect_entries?.find(e=>e.language.name==='en')?.effect||''
  const flavor=a.flavor_text_entries?.find(e=>e.language.name==='en')?.flavor_text||''
  const pkmn=(a.pokemon||[]).map(p=>p.pokemon?.name?.replace(/-/g,' ')).filter(Boolean)
  document.getElementById('abilityDetailContent').innerHTML=
    '<div class="modal-header">'+
      '<div class="poke-name" style="font-size:26px;text-transform:capitalize">'+a.name.replace(/-/g,' ')+'</div>'+
      (gen?'<div style="font-size:12px;color:var(--text-muted);margin-top:4px">'+gen+'</div>':'')+
    '</div>'+
    '<div class="modal-body">'+
      (eff?'<div style="margin-bottom:16px"><h3 style="font-size:14px;font-weight:700;margin-bottom:6px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px">Effect</h3><p style="font-size:14px;line-height:1.6;color:var(--text)">'+eff+'</p></div>':
        flavor?'<div style="margin-bottom:16px"><h3 style="font-size:14px;font-weight:700;margin-bottom:6px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px">Description</h3><p style="font-size:13px;line-height:1.5;color:var(--text-dim)">'+flavor+'</p></div>':
        '<div style="margin-bottom:16px;padding:16px;background:var(--surface);border-radius:10px;border:1px solid var(--border);text-align:center"><p style="font-size:13px;color:var(--text-dim)">No description available for this ability.</p></div>')+
      (pkmn.length?'<div><h3 style="font-size:14px;font-weight:700;margin-bottom:8px;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px">Pokemon with this ability</h3><div class="abilities-list">'+pkmn.map(p=>'<span class="ability-tag">'+p+'</span>').join('')+'</div></div>':'')+
    '</div>'
}

function closeAbilityDetail(){document.getElementById('abilityDetailModal').classList.remove('active');document.body.style.overflow=''}

let wgTarget='',wgGuesses=[],wgOver=false,wgStarted=false,wgSixLetter=[]

function initWordle(){
  if(wgStarted)return
  wgStarted=true
  wgSixLetter=allPokemon.filter(p=>p.name.length===6).map(p=>p.name)
  const dl=document.getElementById('wgDatalist')
  wgSixLetter.forEach(n=>{const o=document.createElement('option');o.value=n;dl.appendChild(o)})
  newWg()
}

function newWg(){
  wgTarget=wgSixLetter[Math.floor(Math.random()*wgSixLetter.length)]
  wgGuesses=[];wgOver=false
  document.getElementById('wgGrid').innerHTML=''
  document.getElementById('wgStatus').innerHTML=''
  const inp=document.getElementById('wgInput');inp.value='';inp.disabled=false;inp.focus()
  renderWg()
}

function submitWg(){
  if(wgOver)return
  const inp=document.getElementById('wgInput')
  const word=inp.value.trim().toLowerCase()
  if(word.length!==6){shake(inp);return}
  if(!wgSixLetter.includes(word)){shake(inp);return}
  if(wgGuesses.some(g=>g.word===word)){shake(inp);return}
  const colors=getWgColors(word)
  wgGuesses.push({word,colors})
  inp.value=''
  renderWg()
  if(word===wgTarget){
    wgOver=true;updateStats('wg',{win:true,guesses:wgGuesses.length})
    document.getElementById('wgStatus').innerHTML='<div style="color:var(--ctp-green);font-size:20px;font-weight:800">✓ '+(wgTarget.charAt(0).toUpperCase()+wgTarget.slice(1))+'! '+wgGuesses.length+'/6</div><button class="wg-btn" onclick="newWg()" style="margin-top:12px">New Game</button>'
    inp.disabled=true
    dailyCheckProgress('wordle3',1)
  }else if(wgGuesses.length>=6){
    wgOver=true;updateStats('wg',{win:false,guesses:6})
    document.getElementById('wgStatus').innerHTML='<div style="color:var(--text-dim);font-size:18px;font-weight:700">'+wgTarget.charAt(0).toUpperCase()+wgTarget.slice(1)+'</div><button class="wg-btn" onclick="newWg()" style="margin-top:12px">New Game</button>'
    inp.disabled=true
  }
}
function shake(el){el.style.borderColor='#f44336';setTimeout(()=>el.style.borderColor='',500)}

function getWgColors(guess){
  const colors=Array(6).fill('absent')
  const t=wgTarget.split(''),g=guess.split('')
  for(let i=0;i<6;i++)if(g[i]===t[i]){colors[i]='correct';t[i]=null;g[i]=null}
  for(let i=0;i<6;i++)if(g[i]!==null){const idx=t.indexOf(g[i]);if(idx!==-1){colors[i]='present';t[idx]=null}}
  return colors
}

function renderWg(){
  const grid=document.getElementById('wgGrid')
  let html=''
  for(let r=0;r<6;r++){
    html+='<div class="wg-row">'
    for(let c=0;c<6;c++){
      if(r<wgGuesses.length){
        const g=wgGuesses[r]
        html+='<div class="wg-cell wg-'+g.colors[c]+'" style="animation-delay:'+(c*0.1)+'s">'+g.word[c]+'</div>'
      }else if(r===wgGuesses.length){
        html+='<div class="wg-cell wg-empty"></div>'
      }else{
        html+='<div class="wg-cell wg-empty"></div>'
      }
    }
    html+='</div>'
  }
  grid.innerHTML=html
}

let currentGame='wordle'
let currentTool='teambuilder'
function selectTool(name){
  currentTool=name
  document.querySelectorAll('#toolSelector .gs-btn').forEach(b=>b.classList.toggle('active',b.dataset.tool===name))
  ;['teambuilder','typecalc','compare','simulator','movetutor','dmgcalc','coverage','teamcard','evotree'].forEach(t=>{
    const id='tool'+t.charAt(0).toUpperCase()+t.slice(1)
    const el=document.getElementById(id)
    if(el)el.style.display=t===name?'block':'none'
  })
  if(name==='teambuilder')initTeamBuilder()
  if(name==='typecalc')initTypeCalc()
  if(name==='compare')initCompare()
  if(name==='simulator')initSimulator()
  if(name==='movetutor')initMoveTutor()
  if(name==='dmgcalc')initDmgCalc()
  if(name==='coverage')initCoverage()
  if(name==='teamcard'){initTeamCard();tcInjectArtToggle()}
  if(name==='evotree')initEvoTree()
}
function selectGame(name){
  currentGame=name
  document.querySelectorAll('.gs-btn').forEach(b=>b.classList.toggle('active',b.dataset.game===name))
  ;  ['wordle','whosthat','typespeed','memory','speedrun','typequiz','numberroll','achievements','clicker'].forEach(g=>{
    const id='game'+g.charAt(0).toUpperCase()+g.slice(1)
    const el=document.getElementById(id)
    if(el)el.style.display=g===name?'block':'none'
  })
  if(name==='wordle'){wgStarted=false;initWordle()}
  if(name==='whosthat'){mg1={id:0,score:0,tries:0};initMg1()}
  if(name==='typespeed'){mg2={id:0,streak:0,score:0};initMg2()}
  if(name==='memory'){mg3={cards:[],flipped:[],matched:0,moves:0,locked:false};initMg3()}
  if(name==='speedrun'){mg4={time:30,score:0,names:[],active:false,interval:null};initMg4()}
  if(name==='typequiz'){mg5={score:0,total:0,used:[],answer:1};initMg5()}
  if(name==='numberroll'){nrStarted=false;initNr()}
  if(name==='achievements')initAchievements()
  if(name==='clicker')initClicker()
}

// ===== TEAM BUILDER =====
let tbTeam=[null,null,null,null,null,null]
let tbSearch=''

function initTeamBuilder(){
  const el=document.getElementById('tbContent')
  el.innerHTML=
    '<h2 style="text-align:center;margin-bottom:4px"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-tool"/></svg>️ Team Builder</h2>'+
    '<p style="text-align:center;color:var(--text-dim);font-size:12px;margin-bottom:16px">Build a team of up to 6 Pokémon and analyze type coverage</p>'+
    '<div style="display:flex;gap:8px;margin-bottom:16px;justify-content:center;flex-wrap:wrap">'+
      '<input type="text" id="tbSearch" placeholder="Search Pokémon..." autocomplete="off" style="padding:10px 16px;border-radius:12px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-size:14px;width:260px;outline:none" oninput="tbSearchPokemon(this.value)" onkeydown="if(event.key===\'Enter\')tbPickFirst()">'+
      '<datalist id="tbDatalist"></datalist>'+
    '</div>'+
    '<div id="tbSlots" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;max-width:600px;margin:0 auto 16px"></div>'+
    '<div id="tbCoverage" style="max-width:700px;margin:0 auto"></div>'+
    '<div id="tbStats" style="max-width:700px;margin:16px auto 0"></div>'
  tbRenderSlots()
}

function tbSearchPokemon(q){
  tbSearch=q
  const dl=document.getElementById('tbDatalist')
  if(!dl||q.length<2)return
  const matches=allPokemon.filter(p=>p.name.includes(q.toLowerCase())).slice(0,15)
  dl.innerHTML=matches.map(p=>'<option value="'+p.name+'">').join('')
}

function tbPickFirst(){
  const inp=document.getElementById('tbSearch')
  if(!inp)return
  const q=inp.value.toLowerCase()
  const p=allPokemon.find(x=>x.name===q)
  if(p)tbAddPokemon(p.id)
}

function tbAddPokemon(id){
  const slot=tbTeam.indexOf(null)
  if(slot===-1)return
  const p=allPokemon.find(x=>x.id===id)
  if(!p)return
  if(tbTeam.some(x=>x&&x.id===id))return
  tbTeam[slot]={id:p.id,name:p.name,types:p.types}
  tbRenderSlots()
  tbAnalyze()
}

function tbRemovePokemon(slot){
  tbTeam[slot]=null
  tbRenderSlots()
  tbAnalyze()
}

function tbRenderSlots(){
  const el=document.getElementById('tbSlots')
  if(!el)return
  el.innerHTML=tbTeam.map((p,i)=>{
    if(!p)return '<div style="background:var(--surface);border:2px dashed var(--border);border-radius:14px;min-height:120px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:12px;cursor:pointer" onclick="document.getElementById(\'tbSearch\').focus()">+ Add Pokémon</div>'
    return '<div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:12px;text-align:center;position:relative;cursor:pointer" onclick="tbRemovePokemon('+i+')">'+
      '<div style="position:absolute;top:4px;right:8px;font-size:16px;color:var(--text-muted);cursor:pointer" title="Remove">✕</div>'+
      '<img src="'+si(p.id)+'" style="width:64px;height:64px;object-fit:contain" onerror="this.style.display=\'none\'">'+
      '<div style="font-size:13px;font-weight:600;text-transform:capitalize;margin-top:4px">'+p.name+'</div>'+
      '<div style="display:flex;gap:3px;justify-content:center;margin-top:4px">'+p.types.map(t=>'<span class="type-badge type-'+t+'" style="font-size:9px;padding:1px 6px">'+t+'</span>').join('')+'</div>'+
    '</div>'
  }).join('')
}

function tbAnalyze(){
  const team=tbTeam.filter(Boolean)
  if(!team.length){
    document.getElementById('tbCoverage').innerHTML='<p style="text-align:center;color:var(--text-muted);font-size:13px">Add Pokémon to see type coverage analysis</p>'
    document.getElementById('tbStats').innerHTML=''
    return
  }
  // Type coverage analysis
  const allTypes=['normal','fire','water','electric','grass','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy']
  const coverage={};const weakTo={};const resistFrom={}
  allTypes.forEach(t=>{coverage[t]=0;weakTo[t]=0;resistFrom[t]=0})
  team.forEach(p=>{
    p.types.forEach(atk=>{
      if(CEFF[atk])allTypes.forEach(def=>{
        const m=CEFF[atk][def]||1
        if(m>1)coverage[def]+=m-1
        if(m>1)coverage[def]+=m-1
      })
    })
  })
  // Calculate weaknesses and resistances for the team
  team.forEach(p=>{
    allTypes.forEach(atk=>{
      let mult=1
      p.types.forEach(def=>{if(CEFF[atk]&&CEFF[atk][def]!==undefined)mult*=CEFF[atk][def]})
      if(mult>1)weakTo[atk]+=mult-1
      if(mult<1)resistFrom[atk]+=(1-mult)
    })
  })
  const offSorted=allTypes.slice().sort((a,b)=>coverage[b]-coverage[a])
  const defSorted=allTypes.slice().sort((a,b)=>weakTo[b]-weakTo[a])
  const resSorted=allTypes.slice().sort((a,b)=>resistFrom[b]-resistFrom[a])
  document.getElementById('tbCoverage').innerHTML=
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'+
      '<div style="background:var(--surface);border-radius:12px;padding:14px;border:1px solid var(--border)">'+
        '<h3 style="font-size:13px;font-weight:700;margin-bottom:10px;color:var(--ctp-green)"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-swords"/></svg> Offensive Coverage</h3>'+
        offSorted.filter(t=>coverage[t]>0).map(t=>'<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px"><span class="type-badge type-'+t+'" style="font-size:9px;padding:1px 6px;min-width:50px">'+t+'</span><div style="flex:1;height:6px;background:var(--surface-hover);border-radius:3px;overflow:hidden"><div style="height:100%;width:'+Math.min(100,coverage[t]*25)+'%;background:#4caf50;border-radius:3px"></div></div><span style="font-size:10px;color:var(--text-dim);min-width:20px">'+coverage[t].toFixed(1)+'</span></div>').join('')+
        (offSorted.every(t=>coverage[t]===0)?'<p style="color:var(--text-muted);font-size:11px">No type advantages</p>':'')+
      '</div>'+
      '<div style="background:var(--surface);border-radius:12px;padding:14px;border:1px solid var(--border)">'+
        '<h3 style="font-size:13px;font-weight:700;margin-bottom:10px;color:var(--ctp-red)"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-shield"/></svg> Defensive Weaknesses</h3>'+
        defSorted.filter(t=>weakTo[t]>0).map(t=>'<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px"><span class="type-badge type-'+t+'" style="font-size:9px;padding:1px 6px;min-width:50px">'+t+'</span><div style="flex:1;height:6px;background:var(--surface-hover);border-radius:3px;overflow:hidden"><div style="height:100%;width:'+Math.min(100,weakTo[t]*25)+'%;background:#f44336;border-radius:3px"></div></div><span style="font-size:10px;color:var(--text-dim);min-width:20px">'+weakTo[t].toFixed(1)+'</span></div>').join('')+
        '<h3 style="font-size:13px;font-weight:700;margin:12px 0 10px;color:var(--ctp-sapphire)"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-shield"/></svg> Resistances</h3>'+
        resSorted.filter(t=>resistFrom[t]>0).slice(0,9).map(t=>'<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px"><span class="type-badge type-'+t+'" style="font-size:9px;padding:1px 6px;min-width:50px">'+t+'</span><div style="flex:1;height:6px;background:var(--surface-hover);border-radius:3px;overflow:hidden"><div style="height:100%;width:'+Math.min(100,resistFrom[t]*25)+'%;background:#2196f3;border-radius:3px"></div></div><span style="font-size:10px;color:var(--text-dim);min-width:20px">'+resistFrom[t].toFixed(1)+'</span></div>').join('')+
      '</div>'+
    '</div>'
  // Team stats summary
  const statNames=['hp','attack','defense','spAttack','spDefense','speed']
  const statColors=['#ff6b6b','#f0932b','#f7d794','#74b9ff','#81ecec','#a29bfe']
  const statLabels=['HP','ATK','DEF','SPA','SPD','SPE']
  document.getElementById('tbStats').innerHTML=
    '<div style="background:var(--surface);border-radius:12px;padding:14px;border:1px solid var(--border);margin-top:12px">'+
      '<h3 style="font-size:13px;font-weight:700;margin-bottom:10px"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-bar-chart"/></svg> Team Stats Comparison</h3>'+
      '<div style="display:grid;grid-template-columns:'+statNames.length+'fr;gap:8px">'+
        statNames.map((s,i)=>{
          const vals=team.map(p=>p.baseStats&&p.baseStats[s]?p.baseStats[s]:0)
          const max=Math.max(...vals,100)
          return '<div style="text-align:center"><div style="font-size:10px;font-weight:600;color:var(--text-dim);margin-bottom:4px">'+statLabels[i]+'</div>'+
            team.map((p,j)=>'<div style="display:flex;align-items:center;gap:4px;margin-bottom:2px"><div style="flex:1;height:5px;background:var(--surface-hover);border-radius:3px;overflow:hidden"><div style="height:100%;width:'+Math.min(100,vals[j]/max*100)+'%;background:'+statColors[i]+';border-radius:3px"></div></div><span style="font-size:9px;color:var(--text-muted);min-width:20px">'+vals[j]+'</span></div>').join('')+
          '</div>'
        }).join('')+
      '</div>'+
    '</div>'
}

// ===== TYPE CALCULATOR =====
let tcAtk='fire';let tcDef1='grass';let tcDef2=''

function initTypeCalc(){
  const allTypes=['normal','fire','water','electric','grass','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy']
  const el=document.getElementById('tcContent')
  el.innerHTML=
    '<h2 style="text-align:center;margin-bottom:4px"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-calculator"/></svg> Type Calculator</h2>'+
    '<p style="text-align:center;color:var(--text-dim);font-size:12px;margin-bottom:20px">Check type effectiveness for any matchup</p>'+
    '<div style="display:flex;gap:16px;justify-content:center;align-items:flex-start;flex-wrap:wrap;margin-bottom:20px">'+
      '<div style="text-align:center">'+
        '<div style="font-size:12px;font-weight:600;color:var(--text-dim);margin-bottom:8px">ATTACKING</div>'+
        '<select id="tcAtkSel" onchange="tcAtk=this.value;tcCalc()" style="padding:10px 16px;border-radius:12px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-size:14px;font-weight:600;cursor:pointer;min-width:120px">'+
          allTypes.map(t=>'<option value="'+t+'"'+(t===tcAtk?' selected':'')+'>'+t.charAt(0).toUpperCase()+t.slice(1)+'</option>').join('')+
        '</select>'+
      '</div>'+
      '<div style="font-size:24px;color:var(--text-dim);padding-top:30px">→</div>'+
      '<div style="text-align:center">'+
        '<div style="font-size:12px;font-weight:600;color:var(--text-dim);margin-bottom:8px">DEFENDING</div>'+
        '<select id="tcDef1Sel" onchange="tcDef1=this.value;tcCalc()" style="padding:10px 16px;border-radius:12px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-size:14px;font-weight:600;cursor:pointer;min-width:120px">'+
          allTypes.map(t=>'<option value="'+t+'"'+(t===tcDef1?' selected':'')+'>'+t.charAt(0).toUpperCase()+t.slice(1)+'</option>').join('')+
        '</select>'+
        '<div style="font-size:11px;color:var(--text-muted);margin-top:6px">+ optional 2nd type</div>'+
        '<select id="tcDef2Sel" onchange="tcDef2=this.value;tcCalc()" style="margin-top:4px;padding:10px 16px;border-radius:12px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-size:14px;cursor:pointer;min-width:120px">'+
          '<option value="">None</option>'+
          allTypes.map(t=>'<option value="'+t+'"'+(t===tcDef2?' selected':'')+'>'+t.charAt(0).toUpperCase()+t.slice(1)+'</option>').join('')+
        '</select>'+
      '</div>'+
    '</div>'+
    '<div id="tcResult" style="text-align:center;margin-bottom:24px"></div>'+
    '<div id="tcChart" style="max-width:700px;margin:0 auto"></div>'
  tcCalc()
}

function tcCalc(){
  let mult=1
  const def=[tcDef1]
  if(tcDef2&&tcDef2!==tcDef1)def.push(tcDef2)
  def.forEach(d=>{if(CEFF[tcAtk]&&CEFF[tcAtk][d]!==undefined)mult*=CEFF[tcAtk][d]})
  const effLabel=mult>1?'Super Effective':mult===1?'Normal':mult>0?'Not Very Effective':'No Effect'
  const effColor=mult>1?'#4caf50':mult===1?'#f7c948':mult>0?'#ff9800':'#f44336'
  const emoji=mult>1?'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-zap"/></svg>':mult===1?'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-circle"/></svg>':mult>0?'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-droplet"/></svg>':'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-x-circle"/></svg>'
  document.getElementById('tcResult').innerHTML=
    '<div style="background:var(--surface);border-radius:16px;padding:20px;border:2px solid '+effColor+';display:inline-block;min-width:200px">'+
      '<div style="font-size:36px;margin-bottom:4px">'+emoji+'</div>'+
      '<div style="font-size:28px;font-weight:800;color:'+effColor+'">'+mult+'x</div>'+
      '<div style="font-size:14px;font-weight:600;color:var(--text)">'+effLabel+'</div>'+
      '<div style="font-size:12px;color:var(--text-dim);margin-top:4px">'+cap(tcAtk)+' → '+def.map(cap).join('/')+'</div>'+
    '</div>'
  // Full chart: what beats this attacking type, what it beats, etc.
  const allTypes=['normal','fire','water','electric','grass','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy']
  const supereffective=[];const notvery=[];const noeffect=[];const weakto=[];const resist=[]
  allTypes.forEach(t=>{
    let m=1
    def.forEach(d=>{if(CEFF[t]&&CEFF[t][d]!==undefined)m*=CEFF[t][d]})
    if(m>1)supereffective.push({type:t,mult:m})
    if(m<1&&m>0)notvery.push({type:t,mult:m})
    if(m===0)noeffect.push({type:t})
    // Check if defending type is weak/resistant to attack type
    if(CEFF[tcAtk]&&CEFF[tcAtk][t]!==undefined){
      if(CEFF[tcAtk][t]>1)weakto.push({type:t,mult:CEFF[tcAtk][t]})
      if(CEFF[tcAtk][t]<1)resist.push({type:t,mult:CEFF[tcAtk][t]})
    }
  })
  document.getElementById('tcChart').innerHTML=
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;max-width:100%;overflow:hidden">'+
      '<div style="background:var(--surface);border-radius:12px;padding:14px;border:1px solid var(--border);min-width:0">'+
        '<h3 style="font-size:13px;font-weight:700;margin-bottom:10px;color:var(--ctp-green)"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-swords"/></svg> '+cap(tcAtk)+' is Super Effective Against</h3>'+
        (weakto.length?'<div style="display:flex;flex-wrap:wrap;gap:4px">'+weakto.map(w=>'<div style="display:inline-flex;align-items:center;gap:4px;padding:3px 6px;background:rgba(76,175,80,0.1);border-radius:4px;border:1px solid rgba(76,175,80,0.2)"><span class="type-badge type-'+w.type+'" style="font-size:10px;padding:2px 6px">'+w.type+'</span><span style="font-size:10px;color:var(--ctp-green);font-weight:700">'+w.mult+'x</span></div>').join('')+'</div>':'<p style="color:var(--text-muted);font-size:11px">None</p>')+
      '</div>'+
      '<div style="background:var(--surface);border-radius:12px;padding:14px;border:1px solid var(--border);min-width:0">'+
        '<h3 style="font-size:13px;font-weight:700;margin-bottom:10px;color:var(--ctp-red)"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-shield"/></svg> '+cap(tcAtk)+' is Not Very Effective Against</h3>'+
        (resist.length?'<div style="display:flex;flex-wrap:wrap;gap:4px">'+resist.map(r=>'<div style="display:inline-flex;align-items:center;gap:4px;padding:3px 6px;background:rgba(244,67,54,0.1);border-radius:4px;border:1px solid rgba(244,67,54,0.2)"><span class="type-badge type-'+r.type+'" style="font-size:10px;padding:2px 6px">'+r.type+'</span><span style="font-size:10px;color:var(--ctp-peach);font-weight:700">'+r.mult+'x</span></div>').join('')+'</div>':'<p style="color:var(--text-muted);font-size:11px">None</p>')+
      '</div>'+
      '<div style="background:var(--surface);border-radius:12px;padding:14px;border:1px solid var(--border);min-width:0">'+
        '<h3 style="font-size:13px;font-weight:700;margin-bottom:10px;color:var(--ctp-sapphire)">Incoming: Deals '+mult+'x to '+def.map(cap).join('/')+'</h3>'+
        (supereffective.length?'<div style="font-size:11px;color:var(--text-dim);margin-bottom:4px">These hit YOU for extra:</div><div style="display:flex;flex-wrap:wrap;gap:3px">'+supereffective.map(s=>'<span class="type-badge type-'+s.type+'" style="font-size:9px;padding:2px 6px">'+s.type+'</span>').join('')+'</div>':'')+
        (notvery.length?'<div style="font-size:11px;color:var(--text-dim);margin:6px 0 4px">These are resisted:</div><div style="display:flex;flex-wrap:wrap;gap:3px">'+notvery.map(n=>'<span class="type-badge type-'+n.type+'" style="font-size:9px;padding:2px 6px">'+n.type+'</span>').join('')+'</div>':'')+
        (noeffect.length?'<div style="font-size:11px;color:var(--text-dim);margin:6px 0 4px">No effect:</div><div style="display:flex;flex-wrap:wrap;gap:3px">'+noeffect.map(n=>'<span class="type-badge type-'+n.type+'" style="font-size:9px;padding:2px 6px">'+n.type+'</span>').join('')+'</div>':'')+
      '</div>'+
      '<div style="background:var(--surface);border-radius:12px;padding:14px;border:1px solid var(--border);min-width:0">'+
        '<h3 style="font-size:13px;font-weight:700;margin-bottom:10px;color:var(--ctp-yellow)">Full Effectiveness Chart</h3>'+
        '<div style="display:flex;flex-wrap:wrap;gap:6px">'+
        allTypes.map(t=>{
          let fullMult=1;def.forEach(d=>{if(CEFF[t]&&CEFF[t][d]!==undefined)fullMult*=CEFF[t][d]})
          const c=fullMult>1?'#4caf50':fullMult===1?'var(--text-dim)':fullMult>0?'#ff9800':'#f44336'
          return '<div style="display:inline-flex;align-items:center;gap:4px;padding:4px 8px;background:var(--surface);border-radius:6px;border:1px solid var(--border-light)"><span class="type-badge type-'+t+'" style="font-size:10px;padding:2px 8px">'+t+'</span><span style="font-size:11px;color:'+c+';font-weight:700">'+fullMult+'x</span></div>'
        }).join('')+
        '</div>'
      '</div>'+
    '</div>'
}

// ===== MINIGAME 1: Who's That Pokémon? =====
let mg1={id:0,score:0,tries:0}
function initMg1(){if(mg1.id)return;mg1New()}
const GEN1_IDS=[...Array(151)].map((_,i)=>i+1)
function mg1New(){
  mg1.id=GEN1_IDS[Math.random()*GEN1_IDS.length|0];mg1.tries=0
  const p=allPokemon.find(p=>p.id===mg1.id)
  if(!p)return mg1New()
  document.getElementById('mg1Content').innerHTML=
    '<h2><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-search"/></svg> Who\'s That Pokémon?</h2><div class="sub">Guess the Gen 1 Pokémon — <span id="mg1Try">5</span> tries left</div>'+
    '<div class="mg1-silhouette" id="mg1Sil"><img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'+mg1.id+'.png"></div>'+
    '<div class="mg1-input-row"><input id="mg1Inp" placeholder="Type Pokémon name..." autocomplete="off" onkeydown="if(event.key==\'Enter\')mg1Guess()"><button onclick="mg1Guess()">Guess</button></div>'+
    '<div id="mg1Res"></div><div class="mg-score">Score: <span id="mg1Sc">'+mg1.score+'</span></div>'
  document.getElementById('mg1Inp').focus()
}
function mg1Guess(){
  const inp=document.getElementById('mg1Inp'),w=inp.value.trim().toLowerCase()
  if(!w)return
  const t=allPokemon.find(p=>p.id===mg1.id)
  if(!t)return
  if(w===t.name){
    document.getElementById('mg1Sil').classList.add('revealed')
    mg1.score+=10;updateStats('mg1',{score:mg1.score})
    document.getElementById('mg1Sc').textContent=mg1.score
    document.getElementById('mg1Res').innerHTML='<div class="mg-correct">✓ '+cap(t.name)+'!</div><button onclick="mg1New()" class="b-btn b-btn-primary">Next</button>'
    inp.disabled=true
  }else{
    mg1.tries++;const left=5-mg1.tries
    document.getElementById('mg1Try').textContent=left
    if(left<=0){
      document.getElementById('mg1Sil').classList.add('revealed')
      document.getElementById('mg1Res').innerHTML='<div class="mg-wrong">✗ Out of tries! It was '+cap(t.name)+'</div><button onclick="mg1New()" class="b-btn b-btn-primary">Next</button>'
      inp.disabled=true
    }else{
      document.getElementById('mg1Res').innerHTML='<div class="mg-wrong">✗ '+left+' tries left</div>'
      inp.value='';inp.focus()
    }
  }
}

// ===== MINIGAME 2: Type Speed =====
let mg2={id:0,streak:0,score:0}
function initMg2(){if(mg2.id)return;mg2New()}
async function mg2LoadTypes(id){
  const p=allPokemon.find(x=>x.id===id)
  if(p&&p.types&&p.types.length)return p.types
  const cacheKey='pokeTypes_'+id
  const cached=localStorage.getItem(cacheKey)
  if(cached){
    const types=JSON.parse(cached)
    if(p)p.types=types
    return types
  }
  try{
    const res=await fetch('https://pokeapi.co/api/v2/pokemon/'+id)
    const data=await res.json()
    const types=data.types.map(t=>t.type.name)
    if(p)p.types=types
    try{localStorage.setItem(cacheKey,JSON.stringify(types))}catch(e){}
    return types
  }catch(e){return['normal']}
}
async function mg2New(){
  mg2.id=Math.floor(Math.random()*151)+1
  document.getElementById('mg2Content').innerHTML=
    '<h2><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-zap"/></svg> Type Speed</h2><div class="sub">Click the primary type of the Pokémon shown</div>'+
    '<div id="mg2Pkmn"></div><div class="mg2-types" id="mg2Types"></div>'+
    '<div class="mg2-streak">Streak: <span id="mg2Str">'+mg2.streak+'</span> · Score: <span id="mg2Sc">'+mg2.score+'</span></div><div id="mg2Res"></div>'
  const p=allPokemon.find(p=>p.id===mg2.id)
  if(!p)return mg2New()
  document.getElementById('mg2Pkmn').innerHTML='<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/'+mg2.id+'.png" class="mg2-pkmn-img">'
  await mg2LoadTypes(mg2.id)
  const types=['normal','fire','water','electric','grass','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy']
  document.getElementById('mg2Types').innerHTML=types.map(t=>'<button class="type-badge type-'+t+'" onclick="mg2Guess(\''+t+'\')">'+t+'</button>').join('')
}
async function mg2Guess(t){
  const btns=document.querySelectorAll('#mg2Types button')
  btns.forEach(b=>b.disabled=true)
  const p=allPokemon.find(p=>p.id===mg2.id)
  if(!p)return
  const ptypes=await mg2LoadTypes(mg2.id)
  if(ptypes[0]===t){mg2.streak++;mg2.score+=10+mg2.streak*2;updateStats('mg2',{score:mg2.score,streak:mg2.streak});document.getElementById('mg2Res').innerHTML='<div class="mg-correct">✓ '+cap(p.name)+' — '+t+'!</div>'}
  else{mg2.streak=0;updateStats('mg2',{score:mg2.score,streak:0});document.getElementById('mg2Res').innerHTML='<div class="mg-wrong">✗ '+cap(p.name)+' is '+ptypes[0]+'</div>';btns.forEach(b=>b.style.opacity='.3');document.querySelector('#mg2Types .type-'+ptypes[0]).style.opacity='1'}
  document.getElementById('mg2Str').textContent=mg2.streak
  document.getElementById('mg2Sc').textContent=mg2.score
  document.getElementById('mg2Res').innerHTML+='<br><button onclick="mg2New()" class="b-btn b-btn-primary">Next</button>'
}

// ===== MINIGAME 3: Memory Match =====
let mg3={cards:[],flipped:[],matched:0,moves:0,locked:false}
function initMg3(){if(mg3.cards.length)return;mg3New()}
function mg3New(){
  mg3.cards=[];mg3.flipped=[];mg3.matched=0;mg3.moves=0;mg3.locked=false
  const ids=[...Array(8)].map(()=>Math.floor(Math.random()*151)+1)
  const pairs=[].concat(...ids.map((_,i)=>[i,i]))
  for(let i=pairs.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[pairs[i],pairs[j]]=[pairs[j],pairs[i]]}
  mg3.cards=pairs
  document.getElementById('mg3Content').innerHTML=
    '<h2><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-brain"/></svg> Memory Match</h2><div class="sub">Match the Pokémon pairs!</div>'+
    '<div class="mg3-stats"><span>Moves: <span id="mg3Mv">0</span></span><span>Matched: <span id="mg3Mt">0</span>/8</span></div>'+
    '<div class="mg3-grid" id="mg3Grid"></div><div id="mg3Res"></div>'
  const grid=document.getElementById('mg3Grid')
  grid.innerHTML=mg3.cards.map((c,i)=>'<div class="mg3-card" id="mg3c'+i+'" onclick="mg3Flip('+i+')"><div class="mg3-card-inner"><div class="mg3-card-front">?</div><div class="mg3-card-back">'+imgTag(ids[c],'48px')+'</div></div></div>').join('')
}
function mg3Flip(i){
  if(mg3.locked||mg3.flipped.length>=2||mg3.flipped.includes(i)||document.getElementById('mg3c'+i).classList.contains('matched'))return
  mg3.flipped.push(i)
  document.getElementById('mg3c'+i).classList.add('flipped')
  if(mg3.flipped.length===2){
    mg3.locked=true;mg3.moves++
    document.getElementById('mg3Mv').textContent=mg3.moves
    const [a,b]=mg3.flipped
    if(mg3.cards[a]===mg3.cards[b]){mg3.matched++;document.getElementById('mg3Mt').textContent=mg3.matched;document.getElementById('mg3c'+a).classList.add('matched');document.getElementById('mg3c'+b).classList.add('matched');mg3.flipped=[];mg3.locked=false;if(mg3.matched===8){updateStats('mg3',{moves:mg3.moves});document.getElementById('mg3Res').innerHTML='<div class="mg-correct"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-star"/></svg> All matched in '+mg3.moves+' moves!</div><button onclick="mg3New()" class="b-btn b-btn-primary">New Game</button>'}}
    else setTimeout(()=>{document.getElementById('mg3c'+a).classList.remove('flipped');document.getElementById('mg3c'+b).classList.remove('flipped');mg3.flipped=[];mg3.locked=false},600)
  }
}

// ===== MINIGAME 4: Speedrun =====
let mg4={time:30,score:0,names:[],active:false,interval:null}
function initMg4(){if(mg4.names.length)return;mg4New()}
function mg4New(){
  mg4.time=30;mg4.score=0;mg4.names=[];mg4.active=false
  if(mg4.interval){clearInterval(mg4.interval);mg4.interval=null}
  document.getElementById('mg4Content').innerHTML=
    '<h2><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-clock"/></svg> Speedrun</h2><div class="sub">Name as many Pokémon as you can in 30 seconds!</div>'+
    '<div class="mg4-timer" id="mg4Timer">30</div>'+
    '<div class="mg1-input-row"><input id="mg4Inp" placeholder="Type Pokémon name..." autocomplete="off" onkeydown="if(event.key==\'Enter\'&&mg4.active)mg4Catch()"><button onclick="mg4Start()" id="mg4StartBtn">▶ Start</button></div>'+
    '<div class="mg-score">Caught: <span id="mg4Sc">0</span></div><div id="mg4List" class="mg4-list"></div>'
}
function mg4Start(){
  mg4.active=true;mg4.names=[];mg4.score=0;mg4.time=30
  document.getElementById('mg4Sc').textContent='0'
  document.getElementById('mg4List').innerHTML=''
  document.getElementById('mg4StartBtn').textContent='Playing...'
  document.getElementById('mg4StartBtn').disabled=true
  document.getElementById('mg4Timer').textContent='30'
  document.getElementById('mg4Timer').classList.remove('urgent')
  document.getElementById('mg4Inp').value='';document.getElementById('mg4Inp').focus()
  mg4.interval=setInterval(()=>{mg4.time--;document.getElementById('mg4Timer').textContent=mg4.time;if(mg4.time<=5)document.getElementById('mg4Timer').classList.add('urgent');if(mg4.time<=0)mg4End()},1000)
}
function mg4Catch(){
  const inp=document.getElementById('mg4Inp'),w=inp.value.trim().toLowerCase()
  if(!w||mg4.names.includes(w)){inp.value='';return}
  const p=allPokemon.find(p=>p.name===w)
  if(!p){inp.value='';return}
  mg4.names.push(w);mg4.score++
  document.getElementById('mg4Sc').textContent=mg4.score
  document.getElementById('mg4List').innerHTML+=imgTag(p.id,'24px')+' <div style="display:inline;text-transform:capitalize">'+p.name+'</div><br>'
  inp.value='';inp.focus()
}
function mg4End(){
  clearInterval(mg4.interval);mg4.interval=null;mg4.active=false
  document.getElementById('mg4StartBtn').textContent='▶ Play Again'
  document.getElementById('mg4StartBtn').disabled=false
  document.getElementById('mg4Inp').disabled=true
  updateStats('mg4',{count:mg4.score})
  document.getElementById('mg4Timer').innerHTML+=('<br><span style="font-size:16px;color:var(--ctp-yellow);font-weight:700">Caught '+mg4.score+' Pokémon!</span>')
}

// ===== MINIGAME 5: Type Quiz =====
let mg5={score:0,total:0,used:[],answer:1}
const TYPES_LIST=['normal','fire','water','electric','grass','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy']
function initMg5(){if(mg5.used.length)return;mg5New()}
function mg5New(){
  mg5.used=mg5.used||[]
  let at=null,dt=null
  while(!at||!dt||at===dt||mg5.used.includes(at+'-'+dt)){
    at=TYPES_LIST[Math.random()*TYPES_LIST.length|0]
    dt=TYPES_LIST[Math.random()*TYPES_LIST.length|0]
  }
  mg5.used.push(at+'-'+dt)
  mg5.answer=CEFF[at]&&CEFF[at][dt]!==undefined?CEFF[at][dt]:1
  mg5.total++
  document.getElementById('mg5Content').innerHTML=
    '<h2><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-help-circle"/></svg> Type Quiz</h2><div class="sub">Is the move super effective?</div>'+
    '<div class="mg5-q"><span class="type-badge type-'+at+'">'+at+'</span> <span class="arrow">→</span> <span class="type-badge type-'+dt+'">'+dt+'</span></div>'+
    '<div class="mg5-options">'+
      '<button class="eff2" onclick="mg5Answer(2)"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-zap"/></svg> Super Effective</button>'+
      '<button class="eff05" onclick="mg5Answer(0.5)"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-shield"/></svg> Not Very Effective</button>'+
      '<button class="eff0" onclick="mg5Answer(0)"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-x-circle"/></svg> No Effect</button>'+
    '</div>'+
    '<div class="mg-score">Score: <span id="mg5Sc">'+mg5.score+'</span>/'+mg5.total+'</div><div id="mg5Res"></div>'
}
function mg5Answer(a){
  document.querySelectorAll('.mg5-options button').forEach(b=>b.disabled=true)
  const correct=a===mg5.answer
  if(correct)mg5.score++
  updateStats('mg5',{correct:correct})
  document.getElementById('mg5Sc').textContent=mg5.score
  if(mg5.score>=3)dailyCheckProgress('typequiz3',1)
  const effLabels={2:'Super Effective (×2)',0.5:'Not Very Effective (×0.5)',0:'No Effect (×0)',1:'Normal (×1)'}
  document.getElementById('mg5Res').innerHTML=(correct?'<div class="mg-correct">✓ Correct!</div>':'<div class="mg-wrong">✗ Wrong — '+effLabels[mg5.answer]+'</div>')+'<button onclick="mg5New()" class="b-btn b-btn-primary">Next</button>'
}

// ===== POKEMON CHAMPIONS BATTLE SYSTEM =====
const CEFF={
  normal:{rock:.5,ghost:0,steel:.5},fire:{fire:.5,water:.5,grass:2,ice:2,bug:2,rock:.5,dragon:.5,steel:2},
  water:{fire:2,water:.5,grass:.5,ground:2,rock:2,dragon:.5},electric:{water:2,electric:.5,grass:.5,ground:0,flying:2,dragon:.5},
  grass:{fire:.5,water:2,grass:.5,poison:.5,ground:2,flying:.5,bug:.5,rock:2,dragon:.5,steel:.5},
  ice:{fire:.5,water:.5,grass:2,ice:.5,ground:2,flying:2,dragon:2,steel:.5},
  fighting:{normal:2,ice:2,poison:.5,flying:.5,psychic:.5,bug:.5,rock:2,ghost:0,dark:2,steel:2,fairy:.5},
  poison:{grass:2,poison:.5,ground:.5,rock:.5,ghost:.5,steel:0,fairy:2},
  ground:{fire:2,grass:.5,electric:2,flying:0,bug:.5,rock:2,poison:2,steel:2},
  flying:{grass:2,electric:.5,fighting:2,bug:2,rock:.5,steel:.5},
  psychic:{fighting:2,poison:2,psychic:.5,steel:.5,dark:0},
  bug:{fire:.5,grass:2,fighting:.5,poison:.5,flying:.5,psychic:2,ghost:.5,dark:2,steel:.5,fairy:.5},
  rock:{fire:2,ice:2,fighting:.5,ground:.5,flying:2,bug:2,steel:.5},
  ghost:{normal:0,psychic:2,ghost:2,dark:.5},
  dragon:{fire:.5,water:.5,electric:.5,grass:.5,ice:2,dragon:2,steel:.5,fairy:0},
  dark:{fighting:.5,psychic:2,ghost:2,dark:.5,fairy:.5},
  steel:{fire:.5,water:.5,electric:.5,ice:2,rock:2,steel:.5,fairy:2},
  fairy:{fire:.5,fighting:2,poison:.5,dragon:2,dark:2,steel:.5}
}
const CMOVE_POOL={
  normal:[{n:'Tackle',p:40,t:'normal',pp:35,e:1},{n:'Quick Attack',p:40,t:'normal',pp:30,e:1},{n:'Body Slam',p:85,t:'normal',pp:15,e:3},{n:'Hyper Beam',p:150,t:'normal',pp:5,e:4},{n:'Slash',p:70,t:'normal',pp:20,e:2},{n:'Headbutt',p:70,t:'normal',pp:15,e:2}],
  fire:[{n:'Ember',p:40,t:'fire',pp:25,e:1},{n:'Fire Punch',p:75,t:'fire',pp:15,e:2},{n:'Flamethrower',p:90,t:'fire',pp:15,e:3},{n:'Fire Blast',p:110,t:'fire',pp:5,e:4},{n:'Flame Wheel',p:60,t:'fire',pp:25,e:2}],
  water:[{n:'Water Gun',p:40,t:'water',pp:25,e:1},{n:'Waterfall',p:80,t:'water',pp:15,e:3},{n:'Hydro Pump',p:110,t:'water',pp:5,e:4},{n:'Bubble Beam',p:65,t:'water',pp:20,e:2},{n:'Surf',p:90,t:'water',pp:15,e:3}],
  electric:[{n:'Thunder Shock',p:40,t:'electric',pp:30,e:1},{n:'Spark',p:65,t:'electric',pp:20,e:2},{n:'Thunderbolt',p:90,t:'electric',pp:15,e:3},{n:'Thunder',p:110,t:'electric',pp:10,e:4},{n:'Zap Cannon',p:120,t:'electric',pp:5,e:4}],
  grass:[{n:'Vine Whip',p:45,t:'grass',pp:25,e:1},{n:'Razor Leaf',p:55,t:'grass',pp:25,e:2},{n:'Solar Beam',p:120,t:'grass',pp:10,e:4},{n:'Seed Bomb',p:80,t:'grass',pp:15,e:3},{n:'Leaf Blade',p:90,t:'grass',pp:15,e:3}],
  ice:[{n:'Ice Shard',p:40,t:'ice',pp:30,e:1},{n:'Ice Beam',p:90,t:'ice',pp:10,e:3},{n:'Blizzard',p:110,t:'ice',pp:5,e:4},{n:'Icy Wind',p:55,t:'ice',pp:15,e:2},{n:'Aurora Beam',p:65,t:'ice',pp:20,e:2}],
  fighting:[{n:'Rock Smash',p:40,t:'fighting',pp:15,e:1},{n:'Brick Break',p:75,t:'fighting',pp:15,e:2},{n:'Close Combat',p:120,t:'fighting',pp:5,e:4},{n:'Low Kick',p:50,t:'fighting',pp:20,e:1},{n:'Cross Chop',p:100,t:'fighting',pp:5,e:4}],
  poison:[{n:'Poison Sting',p:15,t:'poison',pp:35,e:1},{n:'Sludge',p:65,t:'poison',pp:20,e:2},{n:'Sludge Bomb',p:90,t:'poison',pp:10,e:3},{n:'Poison Jab',p:80,t:'poison',pp:20,e:3},{n:'Gunk Shot',p:120,t:'poison',pp:5,e:4}],
  ground:[{n:'Mud-Slap',p:20,t:'ground',pp:10,e:1},{n:'Dig',p:80,t:'ground',pp:10,e:3},{n:'Earthquake',p:100,t:'ground',pp:10,e:4},{n:'Bone Club',p:65,t:'ground',pp:20,e:2},{n:'Sand Tomb',p:35,t:'ground',pp:15,e:1}],
  flying:[{n:'Peck',p:35,t:'flying',pp:35,e:1},{n:'Wing Attack',p:60,t:'flying',pp:35,e:2},{n:'Fly',p:90,t:'flying',pp:15,e:3},{n:'Drill Peck',p:80,t:'flying',pp:20,e:3},{n:'Aerial Ace',p:60,t:'flying',pp:20,e:2}],
  psychic:[{n:'Confusion',p:50,t:'psychic',pp:25,e:1},{n:'Psybeam',p:65,t:'psychic',pp:20,e:2},{n:'Psychic',p:90,t:'psychic',pp:10,e:3},{n:'Psyshock',p:80,t:'psychic',pp:10,e:3},{n:'Future Sight',p:120,t:'psychic',pp:5,e:4}],
  bug:[{n:'Fury Cutter',p:40,t:'bug',pp:20,e:1},{n:'Bug Bite',p:60,t:'bug',pp:20,e:2},{n:'X-Scissor',p:80,t:'bug',pp:15,e:3},{n:'Megahorn',p:120,t:'bug',pp:10,e:4},{n:'Signal Beam',p:75,t:'bug',pp:15,e:2}],
  rock:[{n:'Rock Throw',p:50,t:'rock',pp:15,e:1},{n:'Rock Tomb',p:60,t:'rock',pp:15,e:2},{n:'Stone Edge',p:100,t:'rock',pp:5,e:4},{n:'Rock Slide',p:75,t:'rock',pp:10,e:2},{n:'Power Gem',p:80,t:'rock',pp:20,e:3}],
  ghost:[{n:'Lick',p:30,t:'ghost',pp:30,e:1},{n:'Shadow Claw',p:70,t:'ghost',pp:15,e:2},{n:'Shadow Ball',p:80,t:'ghost',pp:15,e:3},{n:'Night Shade',p:60,t:'ghost',pp:15,e:2},{n:'Phantom Force',p:90,t:'ghost',pp:10,e:3}],
  dragon:[{n:'Dragon Breath',p:60,t:'dragon',pp:20,e:2},{n:'Dragon Claw',p:80,t:'dragon',pp:15,e:3},{n:'Dragon Pulse',p:85,t:'dragon',pp:10,e:3},{n:'Dragon Rush',p:100,t:'dragon',pp:10,e:4},{n:'Outrage',p:120,t:'dragon',pp:5,e:4}],
  dark:[{n:'Bite',p:60,t:'dark',pp:25,e:2},{n:'Faint Attack',p:60,t:'dark',pp:20,e:2},{n:'Crunch',p:80,t:'dark',pp:15,e:3},{n:'Dark Pulse',p:80,t:'dark',pp:15,e:3},{n:'Night Slash',p:70,t:'dark',pp:15,e:2}],
  steel:[{n:'Metal Claw',p:50,t:'steel',pp:35,e:1},{n:'Iron Head',p:80,t:'steel',pp:15,e:3},{n:'Flash Cannon',p:80,t:'steel',pp:10,e:3},{n:'Iron Tail',p:100,t:'steel',pp:15,e:4},{n:'Bullet Punch',p:40,t:'steel',pp:30,e:1}],
  fairy:[{n:'Fairy Wind',p:40,t:'fairy',pp:30,e:1},{n:'Draining Kiss',p:50,t:'fairy',pp:10,e:1},{n:'Moonblast',p:95,t:'fairy',pp:15,e:3},{n:'Play Rough',p:90,t:'fairy',pp:10,e:3},{n:'Dazzling Gleam',p:80,t:'fairy',pp:10,e:3}]
}
const TRAINERS=[
  {title:'Youngster',name:'Joey',class:'BUG CATCHER',icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-tag"/></svg>',lvl:6,types:['bug','normal'],rewards:{xp:80,sd:40}},
  {title:'Lass',name:'Sally',class:'LASS',icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-sparkles"/></svg>',lvl:8,types:['normal','fairy'],rewards:{xp:100,sd:50}},
  {title:'Hiker',name:'Dan',class:'HIKER',icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-mountain"/></svg>️',lvl:10,types:['rock','ground'],rewards:{xp:130,sd:65}},
  {title:'Fisherman',name:'Will',class:'FISHERMAN',icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-target"/></svg>',lvl:12,types:['water'],rewards:{xp:160,sd:80}},
  {title:'Picnicker',name:'Liz',class:'PICNICKER',icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-package"/></svg>',lvl:14,types:['grass','normal'],rewards:{xp:190,sd:95}},
  {title:'Ace Trainer',name:'Mike',class:'ACE TRAINER',icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-star"/></svg>',lvl:16,types:['fighting','psychic'],rewards:{xp:230,sd:115}},
  {title:'Black Belt',name:'Lee',class:'BLACK BELT',icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-swords"/></svg>',lvl:18,types:['fighting','rock'],rewards:{xp:270,sd:135}},
  {title:'Channeler',name:'Grace',class:'CHANNELER',icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-crystal"/></svg>',lvl:20,types:['ghost','psychic'],rewards:{xp:310,sd:155}},
  {title:'Gentleman',name:'Cliff',class:'GENTLEMAN',icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-crown"/></svg>',lvl:22,types:['normal','steel','dragon'],rewards:{xp:360,sd:180}},
  {title:'Gym Leader',name:'Brock',class:'GYM LEADER',icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-medal"/></svg>',lvl:25,types:['rock','steel','ground'],rewards:{xp:500,sd:250}},
  {title:'Elite Four',name:'Lance',class:'ELITE FOUR',icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-crown"/></svg>',lvl:28,types:['dragon','flying'],rewards:{xp:700,sd:350}},
  {title:'Champion',name:'Red',class:'CHAMPION',icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-trophy"/></svg>',lvl:32,types:['fire','water','grass','electric','psychic'],rewards:{xp:1000,sd:500}}
]

// ===== TIME TRAVEL: TWO ERAS =====
const ERAS={
  medieval:{
    name:'Medieval Era',icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-swords"/></svg>',desc:'Ancient lands with primal Pokémon and tribal warriors',
    bg:'linear-gradient(135deg,#2d1810,#1a0f0a)',
    trainers:[
      {title:'Tribal Scout',name:'Ashara',class:'SCOUT',icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-target"/></svg>',lvl:5,types:['normal','bug'],rewards:{xp:90,sd:45},era:'medieval'},
      {title:'Stone Keeper',name:'Grak',class:'STONEKEEPER',icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-mountain"/></svg>',lvl:8,types:['rock','ground'],rewards:{xp:120,sd:60},era:'medieval'},
      {title:'Bog Witch',name:'Mirella',class:'WITCH',icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-crystal"/></svg>',lvl:11,types:['poison','grass'],rewards:{xp:160,sd:80},era:'medieval'},
      {title:'Frost Warden',name:'Ulf',class:'WARDEN',icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-snowflake"/></svg>',lvl:14,types:['ice','water'],rewards:{xp:200,sd:100},era:'medieval'},
      {title:'Flame Druid',name:'Pyrus',class:'DRUID',icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-fire"/></svg>',lvl:17,types:['fire','grass'],rewards:{xp:250,sd:125},era:'medieval'},
      {title:'Storm Shaman',name:'Voltar',class:'SHAMAN',icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-zap"/></svg>',lvl:20,types:['electric','flying'],rewards:{xp:300,sd:150},era:'medieval'},
      {title:'Shadow Monk',name:'Nyx',class:'MONK',icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-moon"/></svg>',lvl:23,types:['dark','ghost'],rewards:{xp:360,sd:180},era:'medieval'},
      {title:'Dragon Sage',name:'Drakov',class:'SAGE',icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-dragon"/></svg>',lvl:26,types:['dragon','fire'],rewards:{xp:450,sd:225},era:'medieval'},
      {title:'Steel Paladin',name:'Ferrum',class:'PALADIN',icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-shield"/></svg>',lvl:29,types:['steel','fighting'],rewards:{xp:550,sd:275},era:'medieval'},
      {title:'Elder Chief',name:'Tharok',class:'CHIEF',icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-crown"/></svg>',lvl:32,types:['dragon','ground','rock'],rewards:{xp:700,sd:350},era:'medieval'},
      {title:'Ancient Guardian',name:'Primus',class:'GUARDIAN',icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-mountain"/></svg>',lvl:35,types:['rock','steel','ice'],rewards:{xp:900,sd:450},era:'medieval'},
      {title:'Warlord King',name:'Ragnar',class:'WARLORD',icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-swords"/></svg>',lvl:38,types:['fighting','dragon','dark'],rewards:{xp:1200,sd:600},era:'medieval'}
    ],
    wildRange:[1,151],
    weather:'clear'
  },
  cyberpunk:{
    name:'Cyberpunk Era',icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-zap"/></svg>',desc:'Neon-lit future with cybernetically enhanced Pokémon',
    bg:'linear-gradient(135deg,#0a0020,#150030)',
    trainers:[
      {title:'Netrunner',name:'Glitch',class:'HACKER',icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-calculator"/></svg>',lvl:5,types:['electric','psychic'],rewards:{xp:90,sd:45},era:'cyberpunk'},
      {title:'Chrome Brawler',name:'Tera',class:'BRAWLER',icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-swords"/></svg>',lvl:8,types:['steel','fighting'],rewards:{xp:120,sd:60},era:'cyberpunk'},
      {title:'Neon Rogue',name:'Pixel',class:'ROGUE',icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-swords"/></svg>',lvl:11,types:['dark','poison'],rewards:{xp:160,sd:80},era:'cyberpunk'},
      {title:'Data Mage',name:'Cypher',class:'MAGE',icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-crystal"/></svg>',lvl:14,types:['psychic','fairy'],rewards:{xp:200,sd:100},era:'cyberpunk'},
      {title:'Bio Engineer',name:'Helix',class:'ENGINEER',icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-sparkles"/></svg>',lvl:17,types:['grass','poison'],rewards:{xp:250,sd:125},era:'cyberpunk'},
      {title:'Cryo Specialist',name:'Frostbyte',class:'SPECIALIST',icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-snowflake"/></svg>',lvl:20,types:['ice','water'],rewards:{xp:300,sd:150},era:'cyberpunk'},
      {title:'Flame Hacker',name:'Blaze',class:'HACKER',icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-fire"/></svg>',lvl:23,types:['fire','electric'],rewards:{xp:360,sd:180},era:'cyberpunk'},
      {title:'Dragon Cyborg',name:'Nexus',class:'CYBORG',icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-dragon"/></svg>',lvl:26,types:['dragon','steel'],rewards:{xp:450,sd:225},era:'cyberpunk'},
      {title:'Void Walker',name:'Spectre',class:'WALKER',icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-skull"/></svg>',lvl:29,types:['ghost','dark'],rewards:{xp:550,sd:275},era:'cyberpunk'},
      {title:'System Admin',name:'Admin',class:'ADMIN',icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-zap"/></svg>',lvl:32,types:['steel','electric','psychic'],rewards:{xp:700,sd:350},era:'cyberpunk'},
      {title:'AI Overlord',name:'AICON',class:'OVERLORD',icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-zap"/></svg>',lvl:35,types:['steel','psychic','dragon'],rewards:{xp:900,sd:450},era:'cyberpunk'},
      {title:'Singularity',name:'Omega',class:'SINGULARITY',icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-star"/></svg>',lvl:38,types:['psychic','dragon','fairy'],rewards:{xp:1200,sd:600},era:'cyberpunk'}
    ],
    wildRange:[152,1010],
    weather:'rain'
  }
}

// ===== WEATHER SYSTEM =====
const WEATHER_TYPES={
  clear:{name:'Clear',icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-sun-large"/></svg>',boost:{fire:1.3,grass:1.2},weaken:{water:0.8},status:null},
  rain:{name:'Rain',icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-cloud-rain"/></svg>',boost:{water:1.3,electric:1.2},weaken:{fire:0.7,grass:0.8},status:null},
  sun:{name:'Harsh Sun',icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-sun-hot"/></svg>',boost:{fire:1.5,grass:1.3},weaken:{water:0.5},status:'brn'},
  sandstorm:{name:'Sandstorm',icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-tornado"/></svg>',boost:{rock:1.3,ground:1.2,steel:1.1},weaken:{bug:0.8},status:null},
  snow:{name:'Hail',icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-cloud-snow"/></svg>',boost:{ice:1.4},weaken:{grass:0.8},status:null},
  fog:{name:'Fog',icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-cloud-fog"/></svg>',boost:{ghost:1.3,dark:1.2},weaken:{psychic:0.7},status:null}
}

// ===== ANCIENT & FUTURE FORMS =====
const ALT_FORMS={
  ancient:{
    25:{id:26,name:'raichu-ancient',types:['electric','ground'],stats:{hp:60,attack:90,defense:55,spAttack:65,spDefense:65,speed:110},desc:'Primal Raichu with ground powers'},
    39:{id:40,name:'wigglytuff-ancient',types:['normal','fairy'],stats:{hp:140,attack:70,defense:45,spAttack:75,spDefense:50,speed:45},desc:'Ancient Wigglytuff with ancient fairy magic'},
    133:{id:134,name:'vaporeon-ancient',types:['water','ice'],stats:{hp:130,attack:65,defense:60,spAttack:110,spDefense:95,speed:65},desc:'Frozen Vaporeon from the ice age'},
    143:{id:144,name:'snorlax-ancient',types:['normal','rock'],stats:{hp:200,attack:110,defense:85,spAttack:65,spDefense:110,speed:20},desc:'Stone-age Snorlax, harder than granite'}
  },
  future:{
    25:{id:26,name:'raichu-future',types:['electric','psychic'],stats:{hp:55,attack:60,defense:50,spAttack:120,spDefense:80,speed:130},desc:'Cybernetic Raichu with psychic circuits'},
    39:{id:40,name:'wigglytuff-future',types:['normal','fairy'],stats:{hp:120,attack:55,defense:60,spAttack:110,spDefense:85,speed:70},desc:'Nano-enhanced Wigglytuff'},
    133:{id:134,name:'vaporeon-future',types:['water','steel'],stats:{hp:115,attack:60,defense:95,spAttack:100,spDefense:100,speed:75},desc:'Mechanical Vaporeon'},
    143:{id:144,name:'snorlax-future',types:['normal','steel'],stats:{hp:180,attack:100,defense:110,spAttack:80,spDefense:90,speed:30},desc:'Cyber Snorlax with titanium armor'}
  }
}

// ===== FUSION EVOLUTION =====
const FUSION_PAIRS=[
  {a:1,b:4,name:'Bulbizarre',types:['grass','fire'],stats:{hp:80,attack:95,defense:75,spAttack:90,spDefense:70,speed:70},icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-leaf"/></svg><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-fire"/></svg>'},
  {a:4,b:7,name:'Squirtmander',types:['fire','water'],stats:{hp:80,attack:85,defense:80,spAttack:95,spDefense:75,speed:70},icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-fire"/></svg><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-droplet"/></svg>'},
  {a:1,b:7,name:'Ivyrtle',types:['grass','water'],stats:{hp:85,attack:75,defense:85,spAttack:90,spDefense:85,speed:65},icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-leaf"/></svg><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-droplet"/></svg>'},
  {a:25,b:133,name:'Vapichu',types:['electric','water'],stats:{hp:90,attack:80,defense:65,spAttack:110,spDefense:80,speed:95},icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-zap"/></svg><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-droplet"/></svg>'},
  {a:35,b:122,name:'Clefablette',types:['fairy','psychic'],stats:{hp:95,attack:55,defense:75,spAttack:120,spDefense:100,speed:80},icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-sparkles"/></svg><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-crystal"/></svg>'},
  {a:44,b:69,name:'Weepinchel',types:['grass','poison'],stats:{hp:90,attack:100,defense:70,spAttack:85,spDefense:65,speed:65},icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-leaf"/></svg><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-skull"/></svg>'},
  {a:56,b:96,name:'Mandrowzee',types:['fighting','psychic'],stats:{hp:85,attack:100,defense:60,spAttack:90,spDefense:80,speed:85},icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-swords"/></svg><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-crystal"/></svg>'},
  {a:74,b:95,name:'Geodactyl',types:['rock','ground'],stats:{hp:90,attack:105,defense:110,spAttack:50,spDefense:55,speed:55},icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-mountain"/></svg><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-mountain"/></svg>️'}
]

// ===== FIELD RESEARCH TASKS =====
const FIELD_TASKS=[
  {id:'first_win',name:'First Victory',desc:'Win your first battle',reward:{xp:80,sd:40},check:(s)=>s.wins>=1},
  {id:'catch_5',name:'Catcher',desc:'Catch 5 Pokémon total',reward:{xp:100,sd:50},check:(s)=>s.catches>=5},
  {id:'super_eff',name:'Type Expert',desc:'Win a battle with a super-effective move',reward:{xp:120,sd:60},check:(s)=>s.superEffWins>=1},
  {id:'streak_3',name:'Hot Streak',desc:'Win 3 battles in a row',reward:{xp:150,sd:75},check:(s)=>s.maxStreak>=3},
  {id:'catch_15',name:'Pokédex Filler',desc:'Catch 15 Pokémon total',reward:{xp:180,sd:90},check:(s)=>s.catches>=15},
  {id:'evolve_1',name:'Evolution Starter',desc:'Evolve a Pokémon for the first time',reward:{xp:200,sd:100},check:(s)=>s.evolutions>=1},
  {id:'weather_win',name:'Weather Warrior',desc:'Win a battle while weather is active',reward:{xp:160,sd:80},check:(s)=>s.weatherWins>=1},
  {id:'catch_type_3',name:'Type Collector',desc:'Catch Pokémon of 3 different types',reward:{xp:200,sd:100},check:(s)=>s.uniqueTypes>=3},
  {id:'streak_5',name:'On Fire',desc:'Win 5 battles in a row',reward:{xp:250,sd:125},check:(s)=>s.maxStreak>=5},
  {id:'catch_rare',name:'Rare Finder',desc:'Catch a Pokémon with base stats over 500',reward:{xp:250,sd:125},check:(s)=>s.caughtRare>=1},
  {id:'win_10',name:'Veteran',desc:'Win 10 battles total',reward:{xp:300,sd:150},check:(s)=>s.wins>=10},
  {id:'catch_30',name:'Collector',desc:'Catch 30 Pokémon total',reward:{xp:300,sd:150},check:(s)=>s.catches>=30},
  {id:'evolve_3',name:'Evolution Expert',desc:'Evolve 3 Pokémon total',reward:{xp:350,sd:175},check:(s)=>s.evolutions>=3},
  {id:'catch_type_8',name:'Type Master',desc:'Catch Pokémon of 8 different types',reward:{xp:350,sd:175},check:(s)=>s.uniqueTypes>=8},
  {id:'streak_10',name:'Unstoppable',desc:'Win 10 battles in a row',reward:{xp:400,sd:200},check:(s)=>s.maxStreak>=10},
  {id:'legendary',name:'Legendary Hunter',desc:'Catch a Legendary Pokémon (ID > 143)',reward:{xp:500,sd:250},check:(s)=>s.caughtLegendary>=1},
  {id:'win_25',name:'Champion',desc:'Win 25 battles total',reward:{xp:500,sd:250},check:(s)=>s.wins>=25},
  {id:'catch_50',name:'Master Collector',desc:'Catch 50 Pokémon total',reward:{xp:500,sd:250},check:(s)=>s.catches>=50},
  {id:'evolve_5',name:'Evolution Master',desc:'Evolve 5 Pokémon total',reward:{xp:400,sd:200},check:(s)=>s.evolutions>=5},
  {id:'catch_type_15',name:'Type Encyclopedia',desc:'Catch Pokémon of 15 different types',reward:{xp:600,sd:300},check:(s)=>s.uniqueTypes>=15}
]
const STARTER_IDS=[1,4,7]
const STATUS_PARALYZE='par',STATUS_BURN='brn',STATUS_POISON='psn',STATUS_SLEEP='slp'
const STATUS_CHANCE={par:0.1,brn:0.1,psn:0.15,slp:0.1}
const TYPE_STATUS={
  fire:STATUS_BURN,electric:STATUS_PARALYZE,poison:STATUS_POISON,grass:STATUS_POISON,
  bug:STATUS_POISON,psychic:STATUS_SLEEP,ghost:STATUS_SLEEP,dark:STATUS_SLEEP,
  ice:STATUS_PARALYZE,fighting:STATUS_PARALYZE
}

// Evolution map: id -> {to:id, level} for Gen 1
const EVOLVE_MAP={
  1:{to:2,level:16},2:{to:3,level:32},
  4:{to:5,level:16},5:{to:6,level:36},
  7:{to:8,level:16},8:{to:9,level:36},
  10:{to:11,level:7},11:{to:12,level:10},
  13:{to:14,level:7},14:{to:15,level:10},
  16:{to:17,level:18},17:{to:18,level:36},
  19:{to:20,level:20},
  21:{to:22,level:20},
  23:{to:24,level:22},
  25:{to:26,level:22},
  27:{to:28,level:22},
  29:{to:30,level:16},30:{to:31,level:36},
  32:{to:33,level:16},33:{to:34,level:36},
  35:{to:36,level:22},
  37:{to:38,level:22},
  39:{to:40,level:22},
  41:{to:42,level:22},
  43:{to:44,level:21},44:{to:45,level:36},
  46:{to:47,level:24},
  48:{to:49,level:31},
  50:{to:51,level:26},
  52:{to:53,level:28},
  54:{to:55,level:33},
  56:{to:57,level:28},
  58:{to:59,level:22},
  60:{to:61,level:25},61:{to:62,level:36},
  63:{to:64,level:16},64:{to:65,level:36},
  66:{to:67,level:28},67:{to:68,level:36},
  69:{to:70,level:21},70:{to:71,level:36},
  72:{to:73,level:30},
  74:{to:75,level:25},75:{to:76,level:36},
  77:{to:78,level:40},
  79:{to:80,level:37},
  81:{to:82,level:30},
  84:{to:85,level:31},
  86:{to:87,level:34},
  88:{to:89,level:38},
  90:{to:91,level:22},
  92:{to:93,level:25},93:{to:94,level:36},
  96:{to:97,level:26},
  98:{to:99,level:28},
  100:{to:101,level:30},
  102:{to:103,level:22},
  104:{to:105,level:28},
  109:{to:110,level:35},
  111:{to:112,level:42},
  116:{to:117,level:32},
  118:{to:119,level:33},
  120:{to:121,level:22},
  129:{to:130,level:20},
  133:{to:134,level:22},
  138:{to:139,level:40},
  140:{to:141,level:40},
  147:{to:148,level:30},148:{to:149,level:55}
}
const EVO_BRANCH={134:1,135:1,136:1} // Eevee evolutions flags

let ch={team:[],starterData:[],trainerIdx:0,winStreak:0,maxStreak:0,totalWins:0,
  stardust:500,candy:{},pokeballs:5,
  battle:{},turnActive:false,selectedMove:-1,phase:'idle',
  wildMode:false,catchActive:false,crPct:80,crDir:-1,crInt:null,
  era:'medieval',weather:'clear',weatherTurns:0,
  fusion:null,fusionTimer:0,
  researchComplete:[],
  wildBehavior:'normal',
  researchStats:{wins:0,catches:0,superEffWins:0,maxStreak:0,evolutions:0,weatherWins:0,uniqueTypes:0,caughtRare:0,caughtLegendary:0,caughtTypeSet:[]}}

function si(id){return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/'+id+'.png'}
function cap(s){return s.charAt(0).toUpperCase()+s.slice(1)}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
function calcS(base,lvl,iv){return Math.floor((2*base+iv)*lvl/100)+5}
function calcH(base,lvl,iv){return (Math.floor((2*base+iv)*lvl/100)+lvl+10)*2}
function calcCp(p){return Math.floor((p.stats.attack+p.stats.defense+p.stats.hp)*p.level/5/p.maxHp*200+10)}
function imgTag(id,size){return '<img src="'+si(id)+'" alt="" style="width:'+size+';height:'+size+';object-fit:contain" onerror="this.onerror=null;this.src=\'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'+id+'.png\'">'}
function getEff(mt,dt){let m=1;dt.forEach(t=>{if(CEFF[mt]&&CEFF[mt][t]!==undefined)m*=CEFF[mt][t]});return m}
function showCh(id){const m={chStarter:'chStarter',chHub:'chHub',chBattle:'chBattle',chSwitch:'chSwitch',chParty:'chParty',chResults:'chResults',chWildCatch:'chWildCatch'};Object.keys(m).forEach(k=>document.getElementById(m[k]).style.display=k===id?'block':'none')}
function rand(a,b){return a+Math.random()*(b-a)}

async function fetchPkmn(id){
  const cacheKey='pokeData_'+id
  const cached=localStorage.getItem(cacheKey)
  if(cached){
    try{return JSON.parse(cached)}catch(e){}
  }
  if(typeof OFFLINE_POKEMON!=='undefined'){
    const op=OFFLINE_POKEMON.find(p=>p.id===id)
    if(op){
      const result={id:op.id,name:op.name,types:op.types,stats:op.stats}
      try{localStorage.setItem(cacheKey,JSON.stringify(result))}catch(e){}
      return result
    }
  }
  try{
    const r=await fetch('https://pokeapi.co/api/v2/pokemon/'+id)
    const d=await r.json()
    const result={id:d.id,name:d.name,types:d.types.map(t=>t.type.name),stats:{hp:d.stats[0].base_stat,attack:d.stats[1].base_stat,defense:d.stats[2].base_stat,spAttack:d.stats[3].base_stat,spDefense:d.stats[4].base_stat,speed:d.stats[5].base_stat}}
    try{localStorage.setItem(cacheKey,JSON.stringify(result))}catch(e){}
    return result
  }catch(e){
    if(cached)try{return JSON.parse(cached)}catch(e2){}
    throw e
  }
}
function makePkmn(d,lvl){
  const iv=Object.fromEntries(Object.keys(d.stats).map(k=>[k,Math.floor(Math.random()*32)]))
  const mh=calcH(d.stats.hp,lvl,iv.hp)
  const moves=getChMoves(d.types)
  return{id:d.id,name:d.name,types:d.types,level:lvl,xp:0,xpNext:lvl*80,baseStats:d.stats,iv,moves,status:null,energy:{},
    stats:Object.fromEntries(Object.keys(d.stats).map(k=>[k,calcS(d.stats[k],lvl,iv[k])])),maxHp:mh,currentHp:mh}
}
function getChMoves(types){
  const pool=[],used=new Set
  types.forEach(t=>{(CMOVE_POOL[t]||CMOVE_POOL.normal).forEach(m=>{if(!used.has(m.n)&&pool.length<5){used.add(m.n);pool.push({...m,pp:m.pp})}})})
  while(pool.length<4){const m=CMOVE_POOL.normal[Math.floor(Math.random()*CMOVE_POOL.normal.length)];if(!used.has(m.n)){used.add(m.n);pool.push({...m,pp:m.pp})}}
  return pool.slice(0,4)
}

function initBattle(){
  if(ch.team.length)return
  if(chLoad()){
    chShowHub()
    return
  }
  showCh('chStarter')
  const grid=document.getElementById('chStarterOptions')
  grid.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:40px"><div class="spinner" style="width:32px;height:32px;margin:0 auto"></div></div>'
  Promise.all(STARTER_IDS.map(id=>fetchPkmn(id))).then(cards=>{
    ch.starterData=cards
    grid.innerHTML=cards.map(d=>'<div class="b-start-card" onclick="chSelectStarter('+d.id+')">'+
      imgTag(d.id,'80px')+'<div class="name">'+d.name+'</div><div class="types">'+d.types.map(t=>'<span class="type-badge type-'+t+'">'+t+'</span>').join('')+'</div></div>').join('')
  })
}
function chSelectStarter(id){
  const d=ch.starterData.find(p=>p.id===id)
  const p=makePkmn(d,5);p.xp=0;p.xpNext=400
  ch.team=[p];ch.pokeballs=5;ch.stardust=500;ch.candy={}
  ch.trainerIdx=0;ch.winStreak=0;ch.maxStreak=0;ch.totalWins=0
  chDeleteSave();chSave()
  chShowHub()
}
function chShowHub(){
  showCh('chHub')
  const p=ch.team[0],hpPct=Math.max(0,p.currentHp/p.maxHp*100),xpPct=Math.min(100,p.xp/p.xpNext*100)
  const trainers=ERAS[ch.era].trainers
  const t=trainers[Math.min(ch.trainerIdx,trainers.length-1)]
  const rank=t?t.class:'CHAMPION'
  const candyAmt=ch.candy[p.name]||0
  const w=WEATHER_TYPES[ch.weather]||WEATHER_TYPES.clear
  const activeTask=FIELD_TASKS.find(t=>!ch.researchComplete.includes(t.id))||FIELD_TASKS[0]
  const fusionInfo=ch.fusion?ch.fusion:null
  document.getElementById('chHubContent').innerHTML=
    '<div class="hub-header"><h2>Pokémon Champions</h2>'+
      '<div style="display:flex;gap:8px;margin-top:8px;justify-content:center;flex-wrap:wrap">'+
        '<button class="b-btn '+(ch.era==='medieval'?'b-btn-primary':'b-btn-secondary')+'" onclick="chSetEra(\'medieval\')" style="font-size:12px;padding:6px 14px"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-swords"/></svg> Medieval</button>'+
        '<button class="b-btn '+(ch.era==='cyberpunk'?'b-btn-primary':'b-btn-secondary')+'" onclick="chSetEra(\'cyberpunk\')" style="font-size:12px;padding:6px 14px"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-zap"/></svg> Cyberpunk</button>'+
      '</div>'+
      '<div style="color:var(--text-dim);font-size:12px;margin-top:4px">'+ERAS[ch.era].desc+'</div>'+
    '</div>'+
    '<div style="display:flex;gap:8px;margin:8px 0;justify-content:center;flex-wrap:wrap;grid-column:1/-1">'+
      '<div style="background:var(--surface);padding:6px 12px;border-radius:8px;border:1px solid var(--border);font-size:11px">'+w.icon+' '+w.name+(ch.weatherTurns>0?' ('+ch.weatherTurns+' turns)':'')+'</div>'+
      (fusionInfo?'<div style="background:rgba(247,201,72,0.15);padding:6px 12px;border-radius:8px;border:1px solid rgba(247,201,72,0.3);font-size:11px;color:var(--ctp-yellow)">'+fusionInfo.icon+' Fused: '+fusionInfo.name+'</div>':'')+
      '<div style="background:var(--surface);padding:6px 12px;border-radius:8px;border:1px solid var(--border);font-size:11px"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-list"/></svg> '+activeTask.name+'</div>'+
    '</div>'+
    '<div class="hub-pokemon">'+imgTag(p.id,'110px')+
      '<div class="h-name">'+cap(p.name)+'</div>'+
      '<div class="h-cp">CP '+calcCp(p)+' · Lv.'+p.level+'</div>'+
      '<div class="b-bar-text">HP: '+p.currentHp+'/'+p.maxHp+'</div>'+
      '<div class="b-bar-bg"><div class="b-bar-fill b-bar-hp" style="width:'+hpPct+'%"></div></div>'+
      '<div class="b-bar-text">XP: '+p.xp+'/'+p.xpNext+'</div>'+
      '<div class="b-bar-bg"><div class="b-bar-fill b-bar-xp" style="width:'+xpPct+'%"></div></div>'+
      '<div style="display:flex;gap:4px;margin-top:6px">'+p.types.map(t=>'<span class="type-badge type-'+t+'">'+t+'</span>').join('')+'</div>'+
    '</div>'+
    '<div class="hub-stats">'+
      '<span><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-trophy"/></svg> Rank: '+rank+'</span>'+
      '<span><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-fire"/></svg> Streak: '+ch.winStreak+'</span>'+
      '<span><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-star"/></svg> '+ch.stardust+' SD</span>'+
      '<span><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-diamond"/></svg> '+candyAmt+' Candy</span>'+
      '<span><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-pokeball"/></svg> '+ch.pokeballs+' Balls</span>'+
    '</div>'+
    '<div class="hub-actions">'+
      '<button class="b-btn b-btn-primary" onclick="chStartTrainerBattle()"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-swords"/></svg> Battle Gym Leader</button>'+
      '<button class="b-btn b-btn-secondary" onclick="chWildEncounter()"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-leaf"/></svg> Find Wild Pokémon</button>'+
      '<button class="b-btn b-btn-secondary" onclick="chShowParty()"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-user"/></svg> Party</button>'+
      '<button class="b-btn b-btn-secondary" onclick="chShowFusion()"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-crystal"/></svg> Fusion Lab</button>'+
      '<button class="b-btn b-btn-secondary" onclick="chShowResearch()"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-list"/></svg> Field Research</button>'+
      '<button class="b-btn b-btn-secondary" onclick="chShowTrainerShop()"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-credit-card"/></svg> Shop</button>'+
      '<button class="b-btn b-btn-secondary" onclick="chShowBooster()"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-package"/></svg> Booster</button>'+
      '<button class="b-btn b-btn-secondary" onclick="chShowDaily()"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-star"/></svg> Daily</button>'+
      '<button class="b-btn b-btn-secondary" onclick="chHealAll()"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-heart"/></svg> Heal All</button>'+
    '</div>'
}
function chSetEra(era){
  ch.era=era;ch.trainerIdx=0;ch.winStreak=0
  ch.weather=ERAS[era].weather;ch.weatherTurns=0
  chSave();chShowHub()
}
function chShowFusion(){
  const el=document.getElementById('chHubContent')
  el.innerHTML='<div class="hub-header"><h2><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-crystal"/></svg> Fusion Lab</h2><p style="color:var(--text-dim);font-size:12px">Merge two Pokémon into a powerful hybrid!</p></div>'+
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;margin:12px 0">'+
    FUSION_PAIRS.map((f,i)=>{
      const pa=allPokemon.find(p=>p.id===f.a),pb=allPokemon.find(p=>p.id===f.b)
      const hasA=ch.team.some(p=>p.id===f.a),hasB=ch.team.some(p=>p.id===f.b)
      return '<div style="background:var(--surface);border:1px solid '+(hasA&&hasB?'#f7c948':'var(--border)')+';border-radius:12px;padding:12px;text-align:center;opacity:'+(hasA&&hasB?1:0.5)+'">'+
        '<div style="font-size:20px">'+f.icon+'</div>'+
        '<div style="font-size:13px;font-weight:700;margin:4px 0">'+f.name+'</div>'+
        '<div style="display:flex;gap:3px;justify-content:center">'+f.types.map(t=>'<span class="type-badge type-'+t+'" style="font-size:9px">'+t+'</span>').join('')+'</div>'+
        '<div style="font-size:10px;color:var(--text-dim);margin-top:4px">'+(pa?cap(pa.name):'?')+' + '+(pb?cap(pb.name):'?')+'</div>'+
        (hasA&&hasB?'<button class="b-btn b-btn-primary" style="font-size:11px;padding:4px 10px;margin-top:6px" onclick="chDoFusion('+i+')">FUSE!</button>':
          '<div style="font-size:10px;color:var(--text-muted);margin-top:6px">Need both Pokémon</div>')+
      '</div>'
    }).join('')+
    '</div>'+
    '<div style="text-align:center;margin-top:12px"><button class="b-btn b-btn-secondary" onclick="chShowHub()">← Back</button></div>'
}
function chDoFusion(idx){
  const f=FUSION_PAIRS[idx]
  const iA=ch.team.findIndex(p=>p.id===f.a),iB=ch.team.findIndex(p=>p.id===f.b)
  if(iA===-1||iB===-1)return
  const pA=ch.team[iA],pB=ch.team[iB]
  ch.fusion={name:f.name,types:f.types,stats:f.stats,icon:f.icon,baseA:pA.id,baseB:pB.id,
    level:Math.max(pA.level,pB.level),currentHp:0}
  const totalHp=f.stats.hp+Math.floor(Math.max(pA.level,pB.level)*1.5)
  ch.fusion.currentHp=totalHp;ch.fusion.maxHp=totalHp
  ch.fusion.stats=Object.fromEntries(Object.keys(f.stats).map(k=>[k,calcS(f.stats[k],ch.fusion.level,15)]))
  ch.fusion.maxHp=calcH(f.stats.hp,ch.fusion.level,15)
  ch.fusion.currentHp=ch.fusion.maxHp
  ch.fusion.moves=getChMoves(f.types)
  ch.fusion.iv=Object.fromEntries(Object.keys(f.stats).map(k=>[k,15]))
  ch.fusion.baseStats=f.stats;ch.fusion.xp=0;ch.fusion.xpNext=ch.fusion.level*80
  ch.fusion.id=1000+idx;ch.fusion.name=f.name.toLowerCase().replace(/\s/g,'-')
  chSave();chShowHub()
  document.getElementById('chHubContent').innerHTML+='<div style="text-align:center;color:var(--ctp-yellow);font-size:14px;font-weight:700;margin-top:12px"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-sparkles"/></svg> '+f.name+' fused! Check your party!</div>'
}
function chShowResearch(){
  const el=document.getElementById('chHubContent')
  const rs=ch.researchStats
  el.innerHTML='<div class="hub-header"><h2><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-list"/></svg> Field Research</h2><p style="color:var(--text-dim);font-size:12px">Complete tasks in order to earn rewards!</p></div>'+
    '<div style="display:grid;gap:8px;margin:12px 0">'+
    FIELD_TASKS.map((t,i)=>{
      const done=ch.researchComplete.includes(t.id)
      const next=!done&&FIELD_TASKS.filter(tt=>!ch.researchComplete.includes(tt.id))[0]?.id===t.id
      const locked=!done&&!next
      const progress=getResearchProgress(t.id,rs)
      return '<div class="ch-research-task '+(done?'done':'')+'" style="'+(locked?'opacity:0.4':'')+(next?'border-color:var(--ctp-yellow);box-shadow:0 0 12px rgba(247,201,72,0.15)':'')+'">'+
        '<div class="ri">'+(done?'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-check"/></svg>':next?'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-list"/></svg>':'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-lock"/></svg>')+'</div>'+
        '<div class="rd"><div class="rn">#'+(i+1)+' '+t.name+'</div><div class="rdesc">'+t.desc+'</div>'+
        (next&&!done?'<div style="margin-top:4px"><div class="b-bar-bg" style="height:4px"><div class="b-bar-fill b-bar-xp" style="width:'+progress.pct+'%"></div></div><div style="font-size:9px;color:var(--text-muted);margin-top:2px">'+progress.label+'</div></div>':'')+
        '</div>'+
        '<div class="rr">'+(done?'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-check"/></svg>':t.reward.xp+'XP +'+t.reward.sd+'SD')+'</div>'+
      '</div>'
    }).join('')+
    '</div>'+
    '<div style="text-align:center;margin-top:12px"><button class="b-btn b-btn-secondary" onclick="chShowHub()">← Back</button></div>'
}
function getResearchProgress(taskId,rs){
  switch(taskId){
    case'first_win':return{pct:Math.min(100,rs.wins/1*100),label:rs.wins+'/1 wins'}
    case'catch_5':return{pct:Math.min(100,rs.catches/5*100),label:rs.catches+'/5 catches'}
    case'super_eff':return{pct:Math.min(100,rs.superEffWins/1*100),label:rs.superEffWins+'/1 super-effective wins'}
    case'streak_3':return{pct:Math.min(100,rs.maxStreak/3*100),label:rs.maxStreak+'/3 max streak'}
    case'catch_15':return{pct:Math.min(100,rs.catches/15*100),label:rs.catches+'/15 catches'}
    case'evolve_1':return{pct:Math.min(100,rs.evolutions/1*100),label:rs.evolutions+'/1 evolutions'}
    case'weather_win':return{pct:Math.min(100,rs.weatherWins/1*100),label:rs.weatherWins+'/1 weather wins'}
    case'catch_type_3':return{pct:Math.min(100,rs.uniqueTypes/3*100),label:rs.uniqueTypes+'/3 unique types'}
    case'streak_5':return{pct:Math.min(100,rs.maxStreak/5*100),label:rs.maxStreak+'/5 max streak'}
    case'catch_rare':return{pct:Math.min(100,rs.caughtRare/1*100),label:rs.caughtRare+'/1 rare caught'}
    case'win_10':return{pct:Math.min(100,rs.wins/10*100),label:rs.wins+'/10 wins'}
    case'catch_30':return{pct:Math.min(100,rs.catches/30*100),label:rs.catches+'/30 catches'}
    case'evolve_3':return{pct:Math.min(100,rs.evolutions/3*100),label:rs.evolutions+'/3 evolutions'}
    case'catch_type_8':return{pct:Math.min(100,rs.uniqueTypes/8*100),label:rs.uniqueTypes+'/8 unique types'}
    case'streak_10':return{pct:Math.min(100,rs.maxStreak/10*100),label:rs.maxStreak+'/10 max streak'}
    case'legendary':return{pct:Math.min(100,rs.caughtLegendary/1*100),label:rs.caughtLegendary+'/1 legendary caught'}
    case'win_25':return{pct:Math.min(100,rs.wins/25*100),label:rs.wins+'/25 wins'}
    case'catch_50':return{pct:Math.min(100,rs.catches/50*100),label:rs.catches+'/50 catches'}
    case'evolve_5':return{pct:Math.min(100,rs.evolutions/5*100),label:rs.evolutions+'/5 evolutions'}
    case'catch_type_15':return{pct:Math.min(100,rs.uniqueTypes/15*100),label:rs.uniqueTypes+'/15 unique types'}
    default:return{pct:0,label:'???'}
  }
}

// ===== BATTLE HUB: TRAINER SHOP =====
function chShowTrainerShop(){
  const el=document.getElementById('chHubContent')
  loadCustom()
  el.innerHTML='<div class="hub-header"><h2><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-credit-card"/></svg> Trainer Shop</h2><p style="color:var(--text-dim);font-size:12px">Spend stardust to customize your trainer!</p></div>'+
    '<div style="text-align:center;margin-bottom:12px;color:var(--ctp-yellow);font-weight:700;font-size:14px"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-star"/></svg> Stardust: '+ch.stardust+'</div>'+
    '<div style="display:grid;gap:12px">'+
    chTsRenderSection('Avatars',SHOP_AVATARS,'avatar')+
    chTsRenderSection('Badges',SHOP_BADGES,'badge')+
    chTsRenderSection('Backgrounds',SHOP_BACKGROUNDS,'bg')+
    '</div>'+
    '<div style="text-align:center;margin-top:12px"><button class="b-btn b-btn-secondary" onclick="chShowHub()">← Back</button></div>'
}
function chTsRenderSection(title,items,type){
  return '<div><h3 style="font-size:16px;margin-bottom:8px;color:var(--text)">'+title+'</h3><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px">'+
    items.map(item=>{
      const owned=chCustom.unlocked.includes(item.id)
      const active=(type==='avatar'&&chCustom.avatar===item.id)||(type==='badge'&&chCustom.badge===item.id)||(type==='bg'&&chCustom.bg===item.id)
      return '<div style="background:var(--surface);border:1px solid '+(active?'#f7c948':owned?'#4caf50':'var(--border)')+';border-radius:10px;padding:10px;text-align:center;cursor:pointer;opacity:'+(owned||ch.stardust>=item.cost?1:0.5)+'" onclick="chTsBuy(\''+item.id+'\',\''+type+'\','+item.cost+')">'+
        '<div style="font-size:22px">'+item.icon+'</div>'+
        '<div style="font-size:10px;font-weight:600;margin:4px 0">'+item.name+'</div>'+
        '<div style="font-size:9px;color:var(--text-dim)">'+item.desc+'</div>'+
        '<div style="font-size:10px;margin-top:4px;color:'+(owned?'#4caf50':'#f7c948')+'">'+(owned?(active?'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-check"/></svg> ACTIVE':'OWNED'):item.cost+' SD')+'</div>'+
      '</div>'
    }).join('')+'</div></div>'
}
function chTsBuy(id,type,cost){
  if(chCustom.unlocked.includes(id)){
    if(type==='avatar')chCustom.avatar=id
    else if(type==='badge')chCustom.badge=chCustom.badge===id?null:id
    else if(type==='bg')chCustom.bg=chCustom.bg===id?null:id
    saveCustom();chShowTrainerShop();return
  }
  if(ch.stardust<cost)return
  ch.stardust-=cost;chCustom.unlocked.push(id)
  if(type==='avatar')chCustom.avatar=id
  else if(type==='badge')chCustom.badge=id
  else if(type==='bg')chCustom.bg=id
  chSave();saveCustom();chShowTrainerShop()
}

// ===== BATTLE HUB: BOOSTER PACKS =====
function chShowBooster(){
  bpOpenedCards=[]
  const el=document.getElementById('chHubContent')
  el.innerHTML='<div class="hub-header"><h2><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-package"/></svg> TCG Booster Packs</h2><p style="color:var(--text-dim);font-size:12px">Open real TCG booster packs with actual card images!</p></div>'+
    '<div style="text-align:center;margin-bottom:12px;color:var(--ctp-yellow);font-weight:700;font-size:14px"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-star"/></svg> Stardust: '+ch.stardust+'</div>'+
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:6px;margin-bottom:12px">'+
    PACK_TYPES.map(p=>'<div style="background:var(--surface);border:1px solid '+(bpSelectedPack===p.id?'#f7c948':'var(--border)')+';border-radius:10px;padding:10px;text-align:center;cursor:pointer" onclick="chBpSelectPack(\''+p.id+'\')">'+
      '<div style="font-size:20px">'+p.icon+'</div>'+
      '<div style="font-size:10px;font-weight:600;margin:2px 0">'+p.name+'</div>'+
      '<div style="font-size:9px;color:var(--text-dim)">'+p.desc+'</div>'+
      '<div style="font-size:10px;color:var(--ctp-yellow);margin-top:2px">'+p.cost+' SD</div>'+
    '</div>').join('')+'</div>'+
    '<div id="chBpSetPicker" style="margin-bottom:8px"></div>'+
    '<div style="text-align:center;margin-bottom:8px"><button class="b-btn b-btn-primary" style="font-size:13px;padding:10px 28px" onclick="chBpOpenPack()"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-package"/></svg> Open Pack ('+BOOSTER_COST+' SD)</button></div>'+
    '<div id="chBpResult"></div>'+
    '<div id="chBpOpened" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:6px"></div>'+
    '<div style="text-align:center;margin-top:12px"><button class="b-btn b-btn-secondary" onclick="chShowHub()">← Back</button></div>'
  chBpRenderSetPicker()
}
function chBpSelectPack(id){
  bpSelectedPack=id
  const pack=PACK_TYPES.find(p=>p.id===id)
  if(pack&&pack.sets)bpSelectedSet=pack.sets[Math.floor(Math.random()*pack.sets.length)]
  else bpSelectedSet=null
  chShowBooster()
}
function chBpRenderSetPicker(){
  const el=document.getElementById('chBpSetPicker')
  if(!el)return
  if(bpSelectedPack!=='random'){
    el.innerHTML='<div style="text-align:center;color:var(--text-dim);font-size:11px">Pack: <b>'+PACK_TYPES.find(p=>p.id===bpSelectedPack)?.name+'</b></div>'
    return
  }
  if(!allSets.length){el.innerHTML='<div style="text-align:center;color:var(--text-dim);font-size:11px">Loading sets...</div>';loadSetsForBooster();return}
  const recentSets=allSets.filter(s=>s.total&&s.total>10).slice(-15).reverse()
  el.innerHTML='<div style="font-size:11px;font-weight:600;margin-bottom:4px">Choose a Set:</div>'+
    '<div style="display:flex;gap:3px;flex-wrap:wrap">'+recentSets.map(s=>'<button style="padding:3px 6px;border-radius:5px;border:1px solid '+(bpSelectedSet===s.id?'#f7c948':'var(--border)')+';background:'+(bpSelectedSet===s.id?'rgba(247,201,72,0.15)':'var(--surface)')+';color:var(--text);font-size:9px;cursor:pointer" onclick="bpSelectedSet=\''+s.id+'\';chBpRenderSetPicker()">'+s.name+'</button>').join('')+'</div>'
}
async function chBpOpenPack(){
  const pack=PACK_TYPES.find(p=>p.id===bpSelectedPack)
  const cost=pack?pack.cost:BOOSTER_COST
  if(ch.stardust<cost)return
  ch.stardust-=cost;chSave()
  const el=document.getElementById('chBpResult')
  const openedEl=document.getElementById('chBpOpened')
  openedEl.innerHTML=''
  el.innerHTML='<div style="text-align:center;padding:16px"><div class="spinner" style="width:24px;height:24px;margin:0 auto"></div><div style="font-size:12px;color:var(--text-dim);margin-top:8px">Fetching cards from TCG API...</div></div>'
  let cards=[]
  const setId=bpSelectedSet||(pack?.sets?pack.sets[Math.floor(Math.random()*pack.sets.length)]:null)
  if(setId)cards=await bpFetchSetCards(setId)
  else cards=await bpFetchRandomCards(250)
  if(!cards.length){
    el.innerHTML='<div style="text-align:center;color:var(--ctp-red);padding:12px">Failed to fetch cards. Try again!</div>'
    ch.stardust+=cost;chSave();return
  }
  const packCards=bpDistributeRarity(cards)
  el.innerHTML='<div style="text-align:center;padding:8px"><div style="font-size:14px;font-weight:700;color:var(--ctp-yellow)"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-package"/></svg> Pack Opened!</div><div style="font-size:11px;color:var(--text-dim)">'+packCards.length+' cards</div></div>'
  bpOpenedCards=packCards
  chBpRenderOpened()
  const sdStats=document.querySelector('.hub-stats')
  if(sdStats){const m=sdStats.innerHTML.match(/ico-star/);if(m)sdStats.innerHTML=sdStats.innerHTML.replace(/<svg[^>]*ico-star[^>]*>[^<]*<\/svg>\s*\d+/, '<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-star"/></svg> '+ch.stardust)}
}
function chBpRenderOpened(){
  const el=document.getElementById('chBpOpened')
  if(!el||!bpOpenedCards.length)return
  el.innerHTML=bpOpenedCards.map((c,i)=>{
    const r=(c.rarity||'Common').toLowerCase()
    const isUltra=r.includes('secret')||r.includes('ultra')||r.includes('hyper')||r.includes('rainbow')||r.includes('gold')
    const isRare=r.includes('rare')||r.includes('holo')
    const borderCol=isUltra?'#f7c948':isRare?'#6390f0':r.includes('uncommon')?'#4caf50':'var(--border)'
    const glow=isUltra?'box-shadow:0 0 16px rgba(247,201,72,0.4)':isRare?'box-shadow:0 0 10px rgba(99,144,240,0.3)':''
    const img=c.images?.small||''
    const pokeId=parseInt((c.id||'').replace(/[^0-9]/g,'').substring(0,3))||1
    return '<div style="background:var(--surface);border:2px solid '+borderCol+';border-radius:8px;overflow:hidden;animation:bpCardReveal 0.3s ease '+(i*0.06)+'s both;'+glow+'">'+
      '<div style="position:relative;background:linear-gradient(135deg,var(--surface),var(--surface));padding:8px;text-align:center">'+
        (img?'<img src="'+img+'" alt="'+c.name+'" style="max-width:100%;max-height:180px;border-radius:6px" loading="lazy" onerror="this.onerror=null;this.src=\''+si(pokeId)+'\';this.style.maxHeight=\'100px\';this.style.imageRendering=\'pixelated\'">':
          '<img src="'+si(pokeId)+'" alt="'+c.name+'" style="height:80px;image-rendering:pixelated">')+
      '</div>'+
      '<div style="padding:4px 6px;border-top:1px solid '+borderCol+'">'+
        '<div style="font-size:9px;font-weight:600">'+c.name+'</div>'+
        '<div style="font-size:7px;color:'+(isUltra?'#f7c948':isRare?'#6390f0':'var(--text-muted)')+'">'+(c.rarity||'Common')+'</div>'+
        '<div style="font-size:7px;color:var(--text-muted)">'+(c.set?.name||'')+' #'+(c.number||'?')+'</div>'+
      '</div></div>'
  }).join('')+
  '<div style="grid-column:1/-1;text-align:center;margin-top:4px"><button class="b-btn b-btn-secondary" style="font-size:11px;padding:6px 14px" onclick="chBpAddAll()"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-check"/></svg> Add All to My Cards</button></div>'
}
function chBpAddAll(){
  bpOpenedCards.forEach(c=>{
    const cid=c.id||c.name+'_'+Date.now()+'_'+Math.random()
    pcAddCard(cid,c.name,c.set?.name||'',0,c.images?.small||'')
  })
  const el=document.getElementById('chBpOpened')
  if(el)el.innerHTML+='<div style="grid-column:1/-1;text-align:center;padding:8px;color:var(--ctp-green);font-weight:700;font-size:12px"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-check"/></svg> All '+bpOpenedCards.length+' cards added!</div>'
}

// ===== BATTLE HUB: DAILY ENCOUNTER =====
function chShowDaily(){
  const el=document.getElementById('chHubContent')
  const last=localStorage.getItem('pokeDailyDate')
  const now=new Date()
  const today=now.toISOString().split('T')[0]
  const claimed=last===today
  const nextDaily=new Date(now);nextDaily.setHours(24,0,0,0)
  const msLeft=nextDaily-now
  const hLeft=Math.floor(msLeft/3600000)
  const mLeft=Math.floor((msLeft%3600000)/60000)
  el.innerHTML='<div class="hub-header"><h2><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-star"/></svg> Daily Wild Encounter</h2><p style="color:var(--text-dim);font-size:12px">A rare Pokémon appears once every 24 hours! 15% chance of Shiny!</p></div>'+
    '<div id="chDailyContent" style="text-align:center">'+(claimed?
      '<div style="padding:20px"><div style="font-size:40px;margin-bottom:8px"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-check"/></svg></div><div style="font-weight:700;font-size:16px">Claimed today!</div><div style="color:var(--text-dim);font-size:12px;margin-top:6px">Next encounter in '+hLeft+'h '+mLeft+'m</div></div>':
      '<div><button class="b-btn b-btn-primary" style="font-size:16px;padding:14px 40px" onclick="chDailyClaim()"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-star"/></svg> Claim Encounter</button></div>')+'</div>'+
    '<div style="text-align:center;margin-top:12px"><button class="b-btn b-btn-secondary" onclick="chShowHub()">← Back</button></div>'
}
async function chDailyClaim(){
  const now=new Date()
  localStorage.setItem('pokeDailyDate',now.toISOString().split('T')[0])
  const isShiny=Math.random()<0.15
  const id=isShiny?SHINY_IDS[Math.floor(Math.random()*SHINY_IDS.length)]:randomPkmnId()
  const d=await fetchPkmn(id)
  const lvl=Math.max(10,Math.floor(rand(15,30)))
  const pkmn=makePkmn(d,lvl)
  if(isShiny)pkmn.shiny=true
  const el=document.getElementById('chDailyContent')
  el.innerHTML='<div style="padding:16px;background:var(--surface);border-radius:16px;border:2px solid '+(isShiny?'#f7c948':'#4caf50')+';animation:dwReveal 0.5s ease">'+
    (isShiny?'<div style="font-size:11px;color:var(--ctp-yellow);font-weight:700;letter-spacing:2px"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-sparkles"/></svg> SHINY <svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-sparkles"/></svg></div>':'<div style="font-size:11px;color:var(--ctp-green);font-weight:700">RARE ENCOUNTER</div>')+
    '<img src="'+si(id)+'" width="120" height="120" style="image-rendering:pixelated;filter:drop-shadow(0 0 '+(isShiny?'20px rgba(247,201,72,0.6)':'10px rgba(76,175,80,0.3)')+')">'+
    '<div style="font-size:18px;font-weight:700;text-transform:capitalize;margin:8px 0">'+cap(pkmn.name)+'</div>'+
    '<div style="font-size:12px;color:var(--text-dim)">Lv.'+lvl+' · CP '+calcCp(pkmn)+'</div>'+
    '<div style="display:flex;gap:4px;justify-content:center;margin:6px 0">'+pkmn.types.map(t=>'<span class="type-badge type-'+t+'">'+t+'</span>').join('')+'</div>'+
    '<div style="margin-top:12px"><button class="b-btn b-btn-primary" onclick="chDailyBattle('+id+','+lvl+','+isShiny+')"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-swords"/></svg> Battle & Catch!</button></div>'+
  '</div>'
}
function chDailyBattle(id,lvl,isShiny){
  if(ch.team.length===0||ch.team.every(p=>p.currentHp<=0)){alert('No Pokémon to battle!');return}
  const d=allPokemon.find(p=>p.id===id)||{id,name:'unknown',types:['normal']}
  const pkmn=makePkmn(d,lvl)
  if(isShiny)pkmn.shiny=true
  ch.battle={opponent:{title:'Daily',name:cap(pkmn.name),class:'DAILY',icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-star"/></svg>',rewards:{xp:lvl*20+50,sd:50+lvl*5}},oppTeam:[pkmn],oppIdx:0,playerIdx:0,logs:[]}
  ch.battle.playerMoves=ch.team.map(p=>p.moves.map(m=>({...m,pp:m.pp})))
  ch.wildMode=true;ch.wildBehavior='normal'
  chStartBattle()
}

async function chCreateTrainerTeam(t){
  const ids=[],chosen=new Set,attempted=new Set
  const range=ERAS[ch.era]?ERAS[ch.era].wildRange:[1,1010]
  let tries=0
  while(ids.length<3&&tries<300){
    tries++
    const id=range[0]+Math.floor(Math.random()*(range[1]-range[0]+1))
    if(chosen.has(id)||attempted.has(id))continue
    attempted.add(id)
    try{
      const d=await fetchPkmn(id)
      if(t.types.some(tt=>d.types.includes(tt))){
        chosen.add(id);ids.push({d,lvl:t.lvl+Math.floor(Math.random()*4-2)})
      }
    }catch(e){}
  }
  if(ids.length<3){
    for(let i=0;i<MAX_POKEMON&&ids.length<3;i++){
      const id=i+1
      if(chosen.has(id))continue
      chosen.add(id)
      const d=await fetchPkmn(id)
      ids.push({d,lvl:t.lvl+Math.floor(Math.random()*4-2)})
    }
  }
  return ids.map(({d,lvl})=>makePkmn(d,lvl))
}
async function chStartTrainerBattle(){
  if(ch.team.every(p=>p.currentHp<=0)){document.getElementById('chHubContent').querySelector('.hub-header').innerHTML+='<div style="color:var(--ctp-red);margin-top:8px">All fainted! Heal first.</div>';return}
  const trainers=ERAS[ch.era].trainers
  const t=trainers[Math.min(ch.trainerIdx,trainers.length-1)]
  document.getElementById('chHubContent').innerHTML+='<div style="text-align:center;margin-top:12px"><div class="spinner" style="width:24px;height:24px;margin:0 auto"></div></div>'
  const team=await chCreateTrainerTeam(t)
  ch.battle={opponent:t,oppTeam:team,oppIdx:0,playerIdx:0,logs:[]}
  ch.battle.playerMoves=ch.team.map(p=>p.moves.map(m=>({...m,pp:m.pp})))
  ch.wildMode=false
  // Random weather on battle start
  const wkeys=Object.keys(WEATHER_TYPES)
  if(Math.random()<0.4){ch.weather=wkeys[Math.floor(Math.random()*wkeys.length)];ch.weatherTurns=Math.floor(rand(3,6))}
  chStartBattle()
}
const MAX_POKEMON=1010
const GENERATION_RANGES=[[1,151],[152,251],[252,386],[387,493],[494,649],[650,721],[722,809],[810,905],[906,1010]]
function randomPkmnId(){
  const gen=Math.floor(Math.random()*GENERATION_RANGES.length)
  const [min,max]=GENERATION_RANGES[gen]
  return min+Math.floor(Math.random()*(max-min+1))
}
async function chWildEncounter(){
  if(ch.team.length>=1000){document.getElementById('chHubContent').querySelector('.hub-header').innerHTML+='<div style="color:var(--ctp-yellow);margin-top:8px">Team full! Can\'t catch more.</div>';return}
  if(ch.team.every(p=>p.currentHp<=0)){document.getElementById('chHubContent').querySelector('.hub-header').innerHTML+='<div style="color:var(--ctp-red);margin-top:8px">All fainted! Heal first.</div>';return}
  // Era-specific wild range
  const [min,max]=ERAS[ch.era].wildRange
  const id=min+Math.floor(Math.random()*(max-min+1))
  const d=await fetchPkmn(id)
  const lvl=Math.max(1,Math.min(20,Math.floor(rand(1,6)+ch.team[0].level-2)))
  const pkmn=makePkmn(d,lvl)
  // Wild behavior
  const behaviors=['normal','aggressive','timid','stalking']
  const bWeights=[0.4,0.25,0.2,0.15]
  let r=Math.random(),cum=0,wildB='normal'
  for(let i=0;i<behaviors.length;i++){cum+=bWeights[i];if(r<cum){wildB=behaviors[i];break}}
  const bLabels={normal:'A wild',aggressive:'An aggressive',timid:'A timid',stalking:'A stalking'}
  const bIcons={normal:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-leaf"/></svg>',aggressive:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-swords"/></svg>',timid:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-heart"/></svg>',stalking:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-eye"/></svg>'}
  ch.battle={opponent:{title:'Wild',name:cap(pkmn.name),class:'WILD '+wildB.toUpperCase(),icon:bIcons[wildB],rewards:{xp:lvl*15+20,sd:30+lvl*3}},oppTeam:[pkmn],oppIdx:0,playerIdx:0,logs:[]}
  ch.battle.playerMoves=ch.team.map(p=>p.moves.map(m=>({...m,pp:m.pp})))
  ch.wildMode=true;ch.wildBehavior=wildB
  // Stalking: enemy gets first strike
  if(wildB==='stalking')ch.battle.enemyFirst=true
  chStartBattle()
}
function chStartBattle(){
  showCh('chBattle')
  ch.battle.oppIdx=0;ch.battle.playerIdx=0;ch.phase='select';ch.selectedMove=-1;ch.turnActive=false
  ch.team.forEach(p=>{p.energy={}})
  ch.battle.oppTeam.forEach(p=>{p.energy={};p.currentHp=p.maxHp})
  chGainEnergy(ch.team[0]);chGainEnergy(ch.battle.oppTeam[0])
  chRenderBattle()
  const t=ch.battle.opponent
  const w=WEATHER_TYPES[ch.weather]||WEATHER_TYPES.clear
  const bLabels={normal:'',aggressive:' (Aggressive)',timid:' (Timid)',stalking:' (Stalking - strikes first!)'}
  const bDesc={normal:'',aggressive:'It\'s hostile!',timid:'It might flee...',stalking:'It\'s watching you carefully...'}
  const splash=document.getElementById('chSplash')
  splash.className='ch-splash ch-trainer-splash active'
  splash.innerHTML='<div class="trainer-avatar">'+t.icon+'</div><div class="trainer-class">'+t.class+'</div><div class="splash-title">'+(ch.wildMode?'Wild '+t.name:t.title+' '+t.name)+'</div><div class="splash-sub">'+(ch.wildMode?bLabels[ch.wildBehavior]+(t.name?' '+t.name:'')+' appeared!':t.class+' wants to battle!')+'</div>'+
    (ch.wildMode&&bDesc[ch.wildBehavior]?'<div style="color:var(--ctp-yellow);font-size:12px;margin-top:4px">'+bDesc[ch.wildBehavior]+'</div>':'')+
    '<div style="font-size:11px;margin-top:4px">'+w.icon+' Weather: '+w.name+(ch.weatherTurns>0?' ('+ch.weatherTurns+' turns)':'')+'</div>'+
    '<div style="display:flex;gap:6px;margin-top:4px">'+ch.battle.oppTeam.map(p=>imgTag(p.id,'48px')).join('')+'</div>'+
    '<div style="margin-top:12px"><span class="b-btn b-btn-primary" onclick="chCloseSplash()">Battle!</span></div>'
}
function chCloseSplash(){
  const splash=document.getElementById('chSplash')
  splash.classList.remove('active')
  splash.innerHTML=''
  const w=WEATHER_TYPES[ch.weather]||WEATHER_TYPES.clear
  if(ch.weather!=='clear')chLog(w.icon+' '+w.name+' is active!')
  else chLog('Go, '+cap(ch.team[0].name)+'!')
}
function chRenderBattle(){
  const t=ch.battle.opponent,p=chGetPlayer(),e=chGetEnemy()
  const w=WEATHER_TYPES[ch.weather]||WEATHER_TYPES.clear
  document.getElementById('chOppName').textContent=ch.wildMode?'Wild '+cap(e.name):t.title+' '+t.name
  document.getElementById('chOppTitle').innerHTML=ch.wildMode?'Lv.'+e.level+' · '+w.icon+' '+w.name:t.class+' (Lv.'+e.level+') · '+w.icon+' '+w.name
  document.getElementById('chPlayerName').textContent='You'
  document.getElementById('chPlayerRank').textContent='Streak: '+ch.winStreak
  chRenderTeamMinis('chOppTeamMini',ch.battle.oppTeam,ch.battle.oppIdx)
  chRenderTeamMinis('chPlayerTeamMini',ch.team,ch.battle.playerIdx)
  chRenderPokemon('chOppSlot',e,true)
  chRenderPokemon('chPlayerSlot',p,false)
  chRenderMoves(p)
  // Apply era class to battle bg
  const bg=document.getElementById('chBattleBg')
  if(bg){bg.className='ch-bg era-'+ch.era
    // Add weather overlay
    const oldOverlay=bg.querySelector('.ch-weather-overlay')
    if(oldOverlay)oldOverlay.remove()
    if(ch.weather!=='clear'){
      const ov=document.createElement('div')
      ov.className='ch-weather-overlay ch-weather-'+ch.weather
      bg.appendChild(ov)
    }
    // Update weather badge
    const wb=document.getElementById('chWeatherBadge')
    if(wb){
      const w=WEATHER_TYPES[ch.weather]||WEATHER_TYPES.clear
      if(ch.weather!=='clear'){wb.innerHTML=w.icon+' '+w.name+(ch.weatherTurns>0?' · '+ch.weatherTurns+'t':'');wb.style.display='flex'}
      else{wb.style.display='none'}
    }
  }
}
function chRenderTeamMinis(id,team,activeIdx){
  document.getElementById(id).innerHTML=team.map((p,i)=>{
    const f=p.currentHp<=0?'<div class="faint-x">✕</div>':''
    const a=i===activeIdx?'active':''
    const sid=(p.id>=1000&&ch.fusion)?ch.fusion.baseA:p.id
    return '<div class="mini-slot '+a+'">'+imgTag(sid,'28px')+f+'</div>'
  }).join('')
}
function chRenderPokemon(slotId,pkmn,isEnemy){
  const hpPct=Math.max(0,pkmn.currentHp/pkmn.maxHp*100)
  const slot=document.getElementById(slotId)
  // Fusion sprites: use base A sprite
  const spriteId=(pkmn.id>=1000&&ch.fusion)?ch.fusion.baseA:pkmn.id
  const sprite=slot.querySelector('.sprite')
  if(hasAnimated(spriteId)){sprite.src=animatedSprite(spriteId);sprite.onerror=function(){this.src=si(spriteId)}}
  else{sprite.src=si(spriteId);sprite.onerror=function(){this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'+spriteId+'.png'}}
  slot.querySelector('.cp-badge').textContent=(pkmn.id>=1000&&ch.fusion?'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-crystal"/></svg> '+ch.fusion.name+' · ':'')+calcCp(pkmn)+' · Lv.'+pkmn.level
  slot.querySelector('.ch-hp-fill').style.width=hpPct+'%'
  const hpFill=slot.querySelector('.ch-hp-fill')
  hpFill.className='ch-hp-fill'+(hpPct<25?' low':hpPct<50?' mid':'')
  slot.querySelector('#ch'+(isEnemy?'Opp':'Player')+'HpText').textContent='HP '+pkmn.currentHp+'/'+pkmn.maxHp
  const statusEl=slot.querySelector('#ch'+(isEnemy?'Opp':'Player')+'Status')
  // Status badge + sprite glow
  if(pkmn.status){
    const labels={brn:'BRN',par:'PAR',psn:'PSN',slp:'SLP'}
    statusEl.innerHTML='<span class="ch-status-badge '+pkmn.status+'">'+labels[pkmn.status]+'</span>'
    slot.className='ch-pkmn-slot sprite-'+pkmn.status+(isEnemy?' opponent':' player')
  }else{
    statusEl.innerHTML=''
    slot.className='ch-pkmn-slot'+(isEnemy?' opponent':' player')
  }
  // Wild behavior reveal class
  if(isEnemy&&ch.wildMode&&ch.wildBehavior!=='normal'){
    slot.classList.add('ch-wild-reveal',ch.wildBehavior)
  }
  // Energy display
  const energyEl=slot.querySelector('#ch'+(isEnemy?'Opp':'Player')+'Energy')
  if(energyEl){
    const total=chTotalEnergy(pkmn)
    const entries=Object.entries(pkmn.energy).filter(([,v])=>v>0)
    energyEl.innerHTML=entries.map(([t,v])=>Array.from({length:v},()=>'<span class="e-dot filled" style="border-color:var(--ctp-yellow);background:var(--ctp-yellow);color:var(--ctp-base);font-size:7px;width:12px;height:12px">'+t.substring(0,1).toUpperCase()+'</span>').join('')).join('')+(total<ENERGY_MAX?'<span class="e-dot" style="opacity:0.3"></span>'.repeat(ENERGY_MAX-total):'')
  }
}
const ENERGY_MAX=5
function chGainEnergy(pkmn){
  const totalEnergy=Object.values(pkmn.energy).reduce((a,b)=>a+b,0)
  if(totalEnergy>=ENERGY_MAX)return false
  const t=pkmn.types[0]||'normal'
  pkmn.energy[t]=(pkmn.energy[t]||0)+1
  return true
}
function chTotalEnergy(pkmn){return Object.values(pkmn.energy).reduce((a,b)=>a+b,0)}
function chCanUseMove(pkmn,move){
  const needed=move.e||0
  let have=0
  if(pkmn.energy[move.t]>=needed)return true
  have=pkmn.energy[move.t]||0
  const needMore=needed-have
  const otherEnergy=Object.entries(pkmn.energy).filter(([k])=>k!==move.t).reduce((a,[,v])=>a+v,0)
  return otherEnergy>=needMore
}
function chSpendEnergy(pkmn,move){
  const needed=move.e||0
  let remaining=needed
  if(pkmn.energy[move.t]>=remaining){pkmn.energy[move.t]-=remaining;return}
  remaining-=pkmn.energy[move.t]||0;pkmn.energy[move.t]=0
  for(const k of Object.keys(pkmn.energy)){
    if(k===move.t)continue
    if(pkmn.energy[k]>=remaining){pkmn.energy[k]-=remaining;remaining=0;break}
    remaining-=pkmn.energy[k];pkmn.energy[k]=0
    if(remaining<=0)break
  }
}
function chRenderMoves(pkmn){
  const moves=pkmn.moves
  const grid=document.getElementById('chMoveGrid')
  grid.innerHTML=moves.map((m,i)=>{
    const eff=getEff(m.t,(chGetEnemy()?.types||[]))
    const sel=i===ch.selectedMove?'selected':''
    const noEnergy=!chCanUseMove(pkmn,m)
    const disabled=m.pp<=0||noEnergy
    const cls='ch-move-btn type-'+m.t+' '+sel+(disabled?' disabled':'')
    const have=pkmn.energy[m.t]||0
    const dots=Array.from({length:m.e||0},(_,j)=>j<have?'<span class="e-dot filled">'+m.t.substring(0,1).toUpperCase()+'</span>':'<span class="e-dot"></span>').join('')
    return '<div class="'+cls+'" onclick="chSelectMove('+i+')">'+
      '<div class="mn">'+m.n.split(' ')[0]+'</div>'+
      '<div class="mm"><span class="type-tag type-'+m.t+'">'+m.t.substring(0,3)+'</span> '+(eff>1?'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-zap"/></svg>':eff<1?'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-x-circle"/></svg>':'')+' '+m.p+'pwr</div>'+
      '<div class="energy-cost">'+dots+'</div>'+
    '</div>'
  }).join('')
}
function chGetPlayer(){return ch.team[ch.battle.playerIdx]}
function chGetEnemy(){return ch.battle.oppTeam[ch.battle.oppIdx]}
function chLog(msg){document.getElementById('chLog').innerHTML=msg}
function chLogAppend(msg){document.getElementById('chLog').innerHTML+='<br>'+msg}

function chSelectMove(idx){
  if(ch.phase!=='select'||ch.turnActive)return
  const p=chGetPlayer()
  if(!p||p.currentHp<=0||p.moves[idx].pp<=0)return
  if(!chCanUseMove(p,p.moves[idx]))return
  ch.selectedMove=idx
  chRenderMoves(p)
  chCommitTurn()
}
function chCommitTurn(){
  if(ch.selectedMove<0)return
  ch.turnActive=true;ch.phase='executing'
  const p=chGetPlayer(),e=chGetEnemy()
  const pm=p.moves[ch.selectedMove]
  pm.pp--
  chGainEnergy(p);chGainEnergy(e)
  chSpendEnergy(p,pm)
  let pd,ad,am
  // Stalking: enemy attacks first
  if(ch.wildBehavior==='stalking'&&ch.battle.enemyFirst){
    am=chAIMove()
    chSpendEnergy(e,am)
    ad=chCalcDmg(e,p,am)
    if(ad.dmg>0)p.currentHp=Math.max(0,p.currentHp-ad.dmg)
    chTryStatus(e,p,am.t)
    pd=chCalcDmg(p,e,pm)
    if(pd.dmg>0)e.currentHp=Math.max(0,e.currentHp-pd.dmg)
    chTryStatus(p,e,pm.t)
    ch.battle.enemyFirst=false
  }else{
    pd=chCalcDmg(p,e,pm)
    if(pd.dmg>0)e.currentHp=Math.max(0,e.currentHp-pd.dmg)
    chTryStatus(p,e,pm.t)
    am=chAIMove()
    chSpendEnergy(e,am)
    ad=chCalcDmg(e,p,am)
    if(ad.dmg>0)p.currentHp=Math.max(0,p.currentHp-ad.dmg)
    chTryStatus(e,p,am.t)
  }
  // Track super-effective hit for research
  if(pd.eff>1)ch.battle.lastSuperEff=true
  // Weather tick
  if(ch.weatherTurns>0){ch.weatherTurns--;if(ch.weatherTurns<=0){ch.weather='clear';ch.weatherTurns=0}}
  // Update weather badge
  const wb2=document.getElementById('chWeatherBadge')
  if(wb2){const w2=WEATHER_TYPES[ch.weather]||WEATHER_TYPES.clear
    if(ch.weather!=='clear'){wb2.innerHTML=w2.icon+' '+w2.name+(ch.weatherTurns>0?' · '+ch.weatherTurns+'t':'');wb2.style.display='flex'}
    else{wb2.style.display='none'}
  }
  // Show results
  let log='<span class="highlight">'+cap(p.name)+'</span> used <span class="dmg">'+pm.n+'</span>!'
  if(pd.eff>1)log+=' <span style="color:var(--ctp-green)"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-zap"/></svg>Super effective!</span>'
  if(pd.crit)log+=' <span style="color:var(--ctp-yellow)"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-zap"/></svg>Crit!</span>'
  if(ad.dmg>0)log+='<br><span class="highlight">'+cap(e.name)+'</span> used <span class="dmg">'+am.n+'</span>!'
  else if(ad.dmg===0)log+='<br><span class="highlight">'+cap(e.name)+"'s</span> attack missed!"
  if(ch.weatherTurns>0)log+='<br><span style="color:var(--text-muted);font-size:11px">'+WEATHER_TYPES[ch.weather].icon+' '+WEATHER_TYPES[ch.weather].name+' ('+ch.weatherTurns+' turns left)</span>'
  const pTotal=chTotalEnergy(p)
  log+='<br><span style="color:var(--ctp-yellow);font-size:10px">Energy: '+pTotal+'/'+ENERGY_MAX+'</span>'
  if(!ch.wildMode&&p.currentHp>0&&e.currentHp>0)log+='<br><span style="color:var(--text-muted);font-size:11px">Select your next move</span>'
  chLog(log)
  // Effects
  chHitEffect(document.getElementById('chOppSlot').querySelector('.sprite'),pd)
  chHitEffect(document.getElementById('chPlayerSlot').querySelector('.sprite'),ad)
  setTimeout(()=>{
    chRenderBattle()
    if(e.currentHp<=0&&p.currentHp<=0){p.currentHp=1;chFaint('enemy')}
    else if(e.currentHp<=0)chFaint('enemy')
    else if(p.currentHp<=0)chFaint('player')
    else{ch.turnActive=false;ch.phase='select';ch.selectedMove=-1;chRenderMoves(chGetPlayer())}
  },500)
}
function chCalcDmg(attacker,defender,move){
  const eff=getEff(move.t,defender.types)
  if(eff===0)return{dmg:0,eff:0,crit:false}
  const stab=attacker.types.includes(move.t)?1.5:1
  const w=WEATHER_TYPES[ch.weather]||WEATHER_TYPES.clear
  const wBoost=(w.boost||{})[move.t]||1
  const wWeaken=(w.weaken||{})[move.t]||1
  const isSpecial=['fire','water','grass','electric','ice','psychic','dragon','dark','fairy','ghost','poison'].includes(move.t)
  const atk=isSpecial?attacker.stats.spAttack:attacker.stats.attack
  const def=isSpecial?defender.stats.spDefense:defender.stats.defense
  const level=attacker.level
  const base=Math.floor(((2*level/5+2)*move.p*atk/def/50+2)*stab*eff*wBoost*wWeaken)
  const crit=Math.random()<0.0625
  const dmg=Math.max(1,Math.floor(base*(crit?1.5:1)*rand(0.85,1)))
  return{dmg,eff,crit}
}
function chAIMove(){
  const e=chGetEnemy(),p=chGetPlayer()
  if(!e||e.currentHp<=0)return{...CMOVE_POOL.normal[0],pp:1,e:1}
  const valid=e.moves.filter(m=>m.pp>0&&chCanUseMove(e,m))
  if(!valid.length)return{...CMOVE_POOL.normal[0],pp:1,e:1}
  const superEff=valid.filter(m=>getEff(m.t,p.types)>1)
  if(superEff.length)return superEff[Math.floor(Math.random()*superEff.length)]
  return valid[Math.floor(Math.random()*valid.length)]
}
function chTryStatus(attacker,defender,moveType){
  const status=TYPE_STATUS[moveType]
  if(!status||defender.currentHp<=0||defender.status)return
  if(Math.random()<STATUS_CHANCE[status]||0){
    defender.status=status
    const labels={brn:'burned! <svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-fire"/></svg>',par:'paralyzed! <svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-zap"/></svg>',psn:'poisoned! <svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-skull"/></svg>',slp:'put to sleep! <svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-moon-status"/></svg>'}
    chLogAppend('<span class="status">'+cap(defender.name)+' was '+labels[status]+'</span>')
  }
}
function chFaint(side){
  if(side==='enemy'){
    const e=chGetEnemy()
    chLogAppend('<span class="highlight">'+cap(e.name)+'</span> fainted!')
    ch.battle.oppIdx++
    if(ch.battle.oppIdx<ch.battle.oppTeam.length){
      setTimeout(()=>{
        const n=chGetEnemy()
        n.currentHp=n.maxHp;n.status=null;n.energy={}
        chGainEnergy(n)
        chLog('Go! '+cap(n.name)+' was sent out!')
        chRenderBattle()
        chRenderMoves(chGetPlayer())
        ch.turnActive=false;ch.phase='select';ch.selectedMove=-1
      },800)
    }else chEndBattle(true)
  }else{
    chLogAppend('<span class="highlight">'+cap(chGetPlayer().name)+'</span> fainted!')
    const next=ch.team.findIndex((p,i)=>i<3&&i!==ch.battle.playerIdx&&p.currentHp>0)
    if(next>=0){ch.phase='switch';chShowSwitch();chLog('Choose your next Pokémon!')}
    else chEndBattle(false)
  }
}
function chShowSwitch(){
  showCh('chSwitch')
  document.getElementById('chSwitchGrid').innerHTML=ch.team.slice(0,3).map((p,i)=>{
    const hpPct=Math.max(0,p.currentHp/p.maxHp*100)
    const f=p.currentHp<=0?'fainted':''
    const cur=i===ch.battle.playerIdx?'current':''
    return '<div class="ch-switch-card '+f+' '+cur+'" onclick="chDoSwitch('+i+')">'+
      imgTag(p.id,'56px')+'<div class="sn">'+cap(p.name)+'</div><div class="shp">HP '+p.currentHp+'/'+p.maxHp+'</div>'+
      '<div class="b-bar-bg"><div class="b-bar-fill b-bar-hp" style="width:'+hpPct+'%"></div></div>'+
    '</div>'
  }).join('')
}
function chDoSwitch(i){
  if(ch.team[i].currentHp<=0)return
  if(i===ch.battle.playerIdx){ch.phase='select';showCh('chBattle');chRenderBattle();ch.turnActive=false;return}
  ch.battle.playerIdx=i
  ch.phase='select';ch.selectedMove=-1
  chGainEnergy(ch.team[i])
  chLog('Go, '+cap(ch.team[i].name)+'!')
  showCh('chBattle')
  chRenderBattle()
  ch.turnActive=false
}
function chCancelSwitch(){
  const next=ch.team.findIndex((p,i)=>i<3&&i!==ch.battle.playerIdx&&p.currentHp>0)
  if(next<0){chEndBattle(false);return}
  ch.battle.playerIdx=next;ch.phase='select';ch.selectedMove=-1
  chGainEnergy(ch.team[next])
  showCh('chBattle')
  chRenderBattle()
  ch.turnActive=false
}

function chHitEffect(img,result){
  if(!img)return
  if(result.dmg>0){
    img.classList.remove('ch-hit-anim','ch-hit-opp-anim','ch-shake')
    void img.offsetWidth
    img.classList.add(result.eff>1?'ch-shake':'ch-hit-anim')
  }
  if(result.crit){
    const c=document.getElementById('chBattleBg')
    if(c){c.classList.remove('ch-shake');void c.offsetWidth;c.classList.add('ch-shake')}
    // Critical hit flash overlay
    const flash=document.createElement('div')
    flash.className='ch-crit-flash'
    const arena=document.querySelector('.ch-arena')
    if(arena){arena.appendChild(flash);setTimeout(()=>flash.remove(),400)}
  }
}
async function chEndBattle(win){
  ch.turnActive=true
  const t=ch.battle.opponent
  try{
  if(win){
    ch.totalWins++;ch.winStreak++
    if(ch.winStreak>ch.maxStreak)ch.maxStreak=ch.winStreak
    const xpGain=t.rewards.xp+(ch.winStreak>1?Math.floor(ch.winStreak*20):0)
    const sdGain=t.rewards.sd+Math.floor(ch.winStreak*10)
    ch.stardust+=sdGain
    document.getElementById('chResTitle').innerHTML='<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-trophy"/></svg> Victory!'
    document.getElementById('chResSub').textContent='Defeated '+t.title+' '+t.name+'!'
    document.getElementById('chResReward').innerHTML='+'+xpGain+' XP · +'+sdGain+' Stardust'
    document.getElementById('chResExtra').innerHTML='Streak: '+ch.winStreak+' | Total: '+ch.totalWins+' wins'
    document.getElementById('chResBtn').textContent='Continue'
    for(const p of ch.team){
      p.xp+=xpGain
      while(p.xp>=p.xpNext){
        p.xp-=p.xpNext;p.level++;p.xpNext=p.level*80
        Object.keys(p.stats).forEach(k=>p.stats[k]=calcS(p.baseStats[k],p.level,p.iv[k]))
        p.maxHp=calcH(p.baseStats.hp,p.level,p.iv.hp)
        p.currentHp=Math.min(p.currentHp,p.maxHp)
      }
    }
    try{achCheck('battle_win');achCheck('streak_'+ch.winStreak)}catch(e){}
    try{dailyCheckProgress('beat3',1);if(ch.winStreak>=2)dailyCheckProgress('streak2',1)}catch(e){}
    try{
      const rs=ch.researchStats
      rs.wins=ch.totalWins;rs.maxStreak=ch.maxStreak
      if(ch.weather!=='clear')rs.weatherWins++
      if(ch.battle.lastSuperEff)rs.superEffWins++
      ch.battle.lastSuperEff=false
      const nextTask=FIELD_TASKS.find(f=>!ch.researchComplete.includes(f.id))
      if(nextTask&&nextTask.check(rs)){
        ch.researchComplete.push(nextTask.id)
        ch.stardust+=nextTask.reward.sd
        document.getElementById('chResExtra').innerHTML+='<br><span style="color:var(--ctp-green)">Research Complete: '+nextTask.name+'! +'+nextTask.reward.sd+'SD</span>'
      }
    }catch(e){}
    try{for(const p of ch.team){if(p.xp>=p.xpNext){const evolved=await chTryEvolve(p)
      if(evolved)document.getElementById('chResExtra').innerHTML+='<br><span style="color:var(--ctp-green)">'+cap(p.name)+' evolved!</span>'}}}catch(e){}
    const trainers=ERAS[ch.era].trainers
    if(ch.winStreak>=3&&ch.trainerIdx<trainers.length-1){ch.trainerIdx++;ch.winStreak=0;document.getElementById('chResExtra').innerHTML+='<br><span style="color:var(--ctp-yellow)">Rank up! Next: '+trainers[Math.min(ch.trainerIdx,trainers.length-1)].class+'</span>'}
  }else{
    document.getElementById('chResTitle').innerHTML='<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-x-circle"/></svg> Defeated'
    document.getElementById('chResSub').textContent='Lost to '+t.title+' '+t.name+'!'
    document.getElementById('chResReward').innerHTML='+'+Math.floor(t.rewards.xp/2)+' XP (participation)'
    document.getElementById('chResExtra').innerHTML='Streak reset. Keep training!'
    document.getElementById('chResBtn').textContent='Back to Hub'
    for(const p of ch.team){
      const xp=Math.floor(t.rewards.xp/2);p.xp+=xp
      while(p.xp>=p.xpNext){
        p.xp-=p.xpNext;p.level++;p.xpNext=p.level*80
        Object.keys(p.stats).forEach(k=>p.stats[k]=calcS(p.baseStats[k],p.level,p.iv[k]))
        p.maxHp=calcH(p.baseStats.hp,p.level,p.iv.hp)
        p.currentHp=Math.min(p.currentHp,p.maxHp)
      }
    }
    ch.winStreak=0
  }
  }catch(e){console.error('chEndBattle error:',e)}
  chSave();chSaveStats()
  showCh('chResults')
  ch.turnActive=false
}

function chAfterBattle(){
  if(ch.wildMode){
    const e=ch.battle.oppTeam[0]
    document.getElementById('chResBtn').disabled=true
    const w=e
    // Aggressive: harder to catch, timid: easier
    const catchBonus=ch.wildBehavior==='timid'?15:ch.wildBehavior==='aggressive'?-15:ch.wildBehavior==='stalking'?-10:0
    if(ch.team.length<1000&&ch.pokeballs>0){
      showCh('chWildCatch')
      document.getElementById('chWildImg').src=si(w.id);document.getElementById('chWildImg').onerror=function(){this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'+w.id+'.png'}
      document.getElementById('chWildName').textContent='Wild '+cap(w.name)
      document.getElementById('chWildInfo').textContent='Lv.'+w.level+' · CP '+calcCp(w)+' · '+{normal:'Normal',aggressive:'Aggressive (harder to catch!)',timid:'Timid (easier!)',stalking:'Stalking (careful!)'}[ch.wildBehavior]
      document.getElementById('chCatchLabel').textContent='Catch it?'
      ch.catchActive=true;ch.crPct=80+catchBonus;ch.crDir=-1
      const ringWrap=document.querySelector('.b-catch-ring-wrap')
      if(ringWrap)ringWrap.className='b-catch-ring-wrap'
      if(ch.crInt)clearInterval(ch.crInt)
      ch.crInt=setInterval(()=>{
        if(!ch.catchActive){clearInterval(ch.crInt);return}
        ch.crPct+=ch.crDir*1.5
        if(ch.crPct<=15)ch.crDir=1
        if(ch.crPct>=85)ch.crDir=-1
        const inner=document.getElementById('chCatchRingInner')
        inner.style.width=ch.crPct+'%';inner.style.height=ch.crPct+'%'
        inner.style.borderColor=ch.crPct<30?'#4caf50':ch.crPct<55?'#f7c948':'#f44336'
      },20)
    }else{ch.battle={};showCh('chHub');chShowHub()}
    return
  }
  ch.battle={};chShowHub()
}

function chThrowBall(){
  if(!ch.catchActive||ch.pokeballs<=0)return
  ch.catchActive=false;if(ch.crInt){clearInterval(ch.crInt);ch.crInt=null}
  const w=ch.battle.oppTeam[0]
  const q=ch.crPct<30?'Excellent':ch.crPct<55?'Great':'Nice'
  const qMult=q==='Excellent'?2:q==='Great'?1.5:1.2
  ch.pokeballs--
  const rate=Math.min(90,Math.floor(30*qMult))
  // Throwing animation
  const ringWrap=document.querySelector('.b-catch-ring-wrap')
  if(ringWrap){ringWrap.className='b-catch-ring-wrap throwing'}
  setTimeout(()=>{
    if(ringWrap){ringWrap.className='b-catch-ring-wrap shake'}
    setTimeout(()=>{
      if(Math.random()*100<rate){
        // Caught! Sparkle effect
        if(ringWrap){ringWrap.className='b-catch-ring-wrap sparkle'}
        const img=document.getElementById('chWildImg')
        if(img)img.classList.add('caught')
        document.getElementById('chCatchLabel').innerHTML='Gotcha! '+cap(w.name)+' was caught! <span style="color:var(--ctp-yellow)">'+q+'!</span>'
        w.currentHp=w.maxHp;w.status=null
        if(ch.team.length<1000){ch.team.push(w)
          const c=ch.candy[w.name]||0;ch.candy[w.name]=c+3+Math.floor(Math.random()*3)
          // Track catch research stats
          ch.researchStats.catches++
          w.types.forEach(t=>{if(!ch.researchStats.caughtTypeSet.includes(t))ch.researchStats.caughtTypeSet.push(t)})
          ch.researchStats.uniqueTypes=ch.researchStats.caughtTypeSet.length
          const totalBs=Object.values(w.baseStats||{}).reduce((a,b)=>a+b,0)
          if(totalBs>500)ch.researchStats.caughtRare++
          if(w.id>143)ch.researchStats.caughtLegendary++
        }
        chSave()
        dailyCheckProgress('catch1',1)
        setTimeout(()=>{ch.battle={};document.getElementById('chResBtn').disabled=false;showCh('chHub');chShowHub()},1500)
      }else{
        // Broke free
        if(ringWrap){ringWrap.className='b-catch-ring-wrap'}
        const img=document.getElementById('chWildImg')
        if(img)img.classList.add('flee')
        setTimeout(()=>{if(img)img.classList.remove('flee')},600)
        document.getElementById('chCatchLabel').innerHTML='Oh no! Broke free! <span style="color:var(--ctp-green)">'+q+' throw</span>'
        setTimeout(()=>{ch.catchActive=true;if(ch.pokeballs>0){document.getElementById('chCatchLabel').textContent='Try again! Balls: '+ch.pokeballs;ch.crPct=80;ch.crDir=-1;if(ch.crInt){clearInterval(ch.crInt)}ch.crInt=setInterval(()=>{if(!ch.catchActive){clearInterval(ch.crInt);return}ch.crPct+=ch.crDir*1.5;if(ch.crPct<=15)ch.crDir=1;if(ch.crPct>=85)ch.crDir=-1;const i=document.getElementById('chCatchRingInner');i.style.width=ch.crPct+'%';i.style.height=ch.crPct+'%';i.style.borderColor=ch.crPct<30?'#4caf50':ch.crPct<55?'#f7c948':'#f44336'},20)}else{document.getElementById('chCatchLabel').textContent='No balls left!';setTimeout(()=>{ch.battle={};document.getElementById('chResBtn').disabled=false;showCh('chHub');chShowHub()},1000)}},1000)
      }
    },500)
  },300)
}
function chRunFromCatch(){ch.catchActive=false;if(ch.crInt){clearInterval(ch.crInt);ch.crInt=null}ch.battle={};document.getElementById('chResBtn').disabled=false;showCh('chHub');chShowHub()}

async function chTryEvolve(p){
  const evo=EVOLVE_MAP[p.id]
  if(!evo||p.level<evo.level||EVO_BRANCH[p.id])return false
  try{
    const d=await fetchPkmn(evo.to)
    // Evolution flash overlay
    const overlay=document.getElementById('chEvoOverlay')
    const evoPkmn=document.getElementById('chEvoPkmn')
    const evoName=document.getElementById('chEvoName')
    const evoMsg=document.getElementById('chEvoMsg')
    if(overlay&&evoPkmn){
      evoPkmn.innerHTML=imgTag(p.id,'160px')
      evoName.textContent=cap(p.name)+' is evolving...'
      evoMsg.textContent=''
      overlay.classList.add('active')
      await new Promise(r=>setTimeout(r,2000))
      evoPkmn.innerHTML=imgTag(d.id,'160px')
      evoName.textContent=cap(p.name)+' evolved into '+cap(d.name)+'!'
      evoMsg.textContent='<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-sparkles"/></svg> What a transformation!'
      await new Promise(r=>setTimeout(r,2000))
      overlay.classList.remove('active')
    }
    p.id=d.id;p.name=d.name;p.types=d.types;p.baseStats=d.stats
    Object.keys(p.stats).forEach(k=>p.stats[k]=calcS(d.stats[k],p.level,p.iv[k]))
    p.maxHp=calcH(d.stats.hp,p.level,p.iv.hp)
    p.currentHp=Math.min(p.currentHp,p.maxHp)
    p.moves=getChMoves(d.types)
    ch.researchStats.evolutions++
    return true
  }catch(e){return false}
}
function chRun(){if(ch.wildMode){chEndBattle(false)}else{chLog('Can\'t run from trainer battles!')}}
function chSwitchMode(){if(ch.phase==='select'&&!ch.turnActive){chShowSwitch()}else{chLog('Wait your turn!')}}
function chShowParty(){
  showCh('chParty')
  let fusionHtml=''
  if(ch.fusion){
    const f=ch.fusion
    const hpPct=Math.max(0,f.currentHp/f.maxHp*100)
    fusionHtml='<div class="party-card" style="border-color:var(--ctp-yellow)">'+imgTag(f.baseA,'52px')+
      '<div class="pi"><div class="pn" style="color:var(--ctp-yellow)">'+f.icon+' '+cap(f.name)+' [FUSED]</div>'+
      '<div class="pm">CP '+calcCp(f)+' · Lv.'+f.level+'</div>'+
      '<div class="bar-row"><div class="bar-bg"><div class="bar-fill" style="width:'+hpPct+'%;background:linear-gradient(90deg,#f7c948,#ff9800)"></div></div><span style="font-size:10px;font-weight:700;color:var(--text);text-shadow:0 1px 3px rgba(0,0,0,.6)">'+f.currentHp+'/'+f.maxHp+'</span></div>'+
      '<div style="display:flex;gap:3px;margin-top:4px">'+f.types.map(t=>'<span class="type-badge type-'+t+'">'+t+'</span>').join('')+'</div>'+
    '</div></div>'
  }
  document.getElementById('chPartyList').innerHTML=fusionHtml+ch.team.map((p,i)=>{
    const hpPct=Math.max(0,p.currentHp/p.maxHp*100),xpPct=Math.min(100,p.xp/p.xpNext*100),f=p.currentHp<=0?'fainted':''
    const candyAmt=ch.candy[p.name]||0
    const sid=(p.id>=1000&&ch.fusion)?ch.fusion.baseA:p.id
    return '<div class="party-card '+f+'">'+imgTag(sid,'52px')+
      '<div class="pi"><div class="pn">'+cap(p.name)+(i===ch.battle.playerIdx&&ch.phase!=='idle'?' <span class="active-tag">[OUT]</span>':'')+'</div>'+
      '<div class="pm">CP '+calcCp(p)+' · Lv.'+p.level+(p.status?' · <span class="ch-status-badge '+p.status+'">'+p.status.toUpperCase()+'</span>':'')+'</div>'+
      '<div class="bar-row"><div class="bar-bg"><div class="bar-fill" style="width:'+hpPct+'%;background:linear-gradient(90deg,#4caf50,#8bc34a)"></div></div><span style="font-size:10px;font-weight:700;color:var(--text);text-shadow:0 1px 3px rgba(0,0,0,.6)">'+p.currentHp+'/'+p.maxHp+'</span></div>'+
      '<div class="bar-row"><div class="bar-bg"><div class="bar-fill" style="width:'+xpPct+'%;background:linear-gradient(90deg,#2196f3,#03a9f4)"></div></div><span style="font-size:10px;font-weight:700;color:var(--text);text-shadow:0 1px 3px rgba(0,0,0,.6)">XP '+p.xp+'/'+p.xpNext+'</span></div>'+
      '<div style="font-size:10px;color:var(--text-dim);margin-top:2px"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-diamond"/></svg> '+candyAmt+(candyAmt>0?' <span style="color:var(--ctp-yellow);cursor:pointer" onclick="event.stopPropagation();chPowerUp('+i+')">[Power Up]</span>':'')+(i>0&&p.currentHp>0?' · <span style="color:var(--ctp-blue);cursor:pointer" onclick="event.stopPropagation();chSetLead('+i+')">[Set Lead]</span>':'')+'</div>'+
    '</div></div>'
  }).join('')
}
function chPowerUp(i){
  const p=ch.team[i],c=ch.candy[p.name]||0
  const cost=Math.floor(p.level*80)
  if(c<1||ch.stardust<cost){document.getElementById('chPartyList').innerHTML+='<div style="color:var(--ctp-red);text-align:center;margin-top:8px">Need '+cost+' stardust & 1 candy</div>';return}
  ch.candy[p.name]=c-1;ch.stardust-=cost
  p.level++;Object.keys(p.stats).forEach(k=>p.stats[k]=calcS(p.baseStats[k],p.level,p.iv[k]))
  p.maxHp=calcH(p.baseStats.hp,p.level,p.iv.hp);p.currentHp=p.maxHp
  p.xpNext=p.level*80
  chSave()
  chShowParty();document.getElementById('chPartyList').innerHTML+='<div style="color:var(--ctp-yellow);text-align:center;margin-top:8px">'+cap(p.name)+' powered up! CP: '+calcCp(p)+'</div>'
}
function chSetLead(i){
  if(i<=0||i>=ch.team.length)return
  const p=ch.team.splice(i,1)[0]
  ch.team.unshift(p)
  chSave()
  chShowParty()
  document.getElementById('chPartyList').innerHTML+='<div style="color:var(--ctp-blue);text-align:center;margin-top:8px"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-star"/></svg> '+cap(p.name)+' is now your lead!</div>'
}
function chBackField(){if(Object.keys(ch.battle).length){showCh('chBattle');chRenderBattle()}else{chShowHub()}}
function chHealAll(){ch.team.forEach(p=>{p.currentHp=p.maxHp;p.status=null});chShowHub();chSave()}

// ===== SAVE / LOAD =====
let chCanSave=true
const SAVE_KEY='pokeChampSave'
function chSave(){
  if(!chCanSave)return
  try{
    const data={team:ch.team,trainerIdx:ch.trainerIdx,winStreak:ch.winStreak,maxStreak:ch.maxStreak,totalWins:ch.totalWins,stardust:ch.stardust,candy:ch.candy,pokeballs:ch.pokeballs,era:ch.era,weather:ch.weather,weatherTurns:ch.weatherTurns,fusion:ch.fusion,researchComplete:ch.researchComplete,researchStats:ch.researchStats}
    localStorage.setItem(SAVE_KEY,JSON.stringify(data))
  }catch(e){}
}
function chLoad(){
  try{
    const raw=localStorage.getItem(SAVE_KEY)
    if(!raw)return false
    const data=JSON.parse(raw)
    ch.team=data.team||[]
    ch.team.forEach(p=>{if(!p.energy)p.energy={}})
    ch.trainerIdx=data.trainerIdx||0
    ch.winStreak=data.winStreak||0
    ch.maxStreak=data.maxStreak||0
    ch.totalWins=data.totalWins||0
    ch.stardust=data.stardust||500
    ch.candy=data.candy||{}
    ch.pokeballs=data.pokeballs||5
    ch.era=data.era||'medieval'
    ch.weather=data.weather||'clear'
    ch.weatherTurns=data.weatherTurns||0
    ch.fusion=data.fusion||null
    ch.researchComplete=data.researchComplete||[]
    ch.researchStats=data.researchStats||{wins:0,catches:0,superEffWins:0,maxStreak:0,evolutions:0,weatherWins:0,uniqueTypes:0,caughtRare:0,caughtLegendary:0,caughtTypeSet:[]}
    return ch.team.length>0
  }catch(e){return false}
}
function chDeleteSave(){localStorage.removeItem(SAVE_KEY)}

// ===== NUMBER ROLL (RNGdle) =====
let nrState={ep:0,rolls:0,badgeCount:0,badges:{},collection:new Set(),lastResult:null,pastRolls:[],lastEpGain:0,bestEp:0,streak:0,lastRollDate:null,rarityCounts:{trash:0,common:0,uncommon:0,rare:0,epic:0,anomaly:0,mythic:0}}
let nrStarted=false
function getMillisUntilUTCMidnight(){
  const now=new Date()
  const next=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()+1,0,0,0,0))
  return next.getTime()-now.getTime()
}
function nrIsToday(dateStr){
  if(!dateStr)return false
  const d=new Date(dateStr)
  return d.getUTCFullYear()===new Date().getUTCFullYear()&&d.getUTCMonth()===new Date().getUTCMonth()&&d.getUTCDate()===new Date().getUTCDate()
}
function nrFormatCountdown(ms){
  const s=Math.max(0,Math.floor(ms/1000))
  const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),ss=s%60
  return h+'h '+m+'m '+ss+'s'
}
function nrRarityEmoji(r){
  return {trash:'🗑️',common:'⬜',uncommon:'🟩',rare:'🟦',epic:'🟪',anomaly:'🟧',mythic:'🟥'}[r]||'⬜'
}
function nrCardRarity(score){
  const R=window.RNGDLE
  return R.getCardTierFromPercentile(R.getPercentileForScore(score))
}

function initNr(){
  if(nrStarted)return
  nrStarted=true
  const R=window.RNGDLE
  const key='nr_'+getUsername()
  try{
    const d=JSON.parse(localStorage.getItem(key))
    if(d){
      nrState.ep=d.ep||0
      nrState.rolls=d.rolls||0
      nrState.badgeCount=d.badgeCount||0
      nrState.badges=d.badges||{}
      nrState.collection=new Set((d.collection||[]).filter(id=>R.RNGDLE_BADGE_MAP.has(id)))
      nrState.lastResult=d.lastResult||null
      nrState.pastRolls=d.pastRolls||[]
      nrState.lastEpGain=d.lastEpGain||0
      nrState.bestEp=d.bestEp||0
      nrState.streak=d.streak||0
      nrState.lastRollDate=d.lastRollDate||null
      nrState.rarityCounts=d.rarityCounts||{trash:0,common:0,uncommon:0,rare:0,epic:0,anomaly:0,mythic:0}
      if(!nrState.bestEp&&nrState.pastRolls.length)nrState.bestEp=Math.max(...nrState.pastRolls.map(r=>r.ep||0))
    }
  }catch(e){}
  renderNr()
  nrUpdateButton()
}
function saveNr(){
  try{localStorage.setItem('nr_'+getUsername(),JSON.stringify({ep:nrState.ep,rolls:nrState.rolls,badgeCount:nrState.badgeCount,badges:nrState.badges,collection:[...nrState.collection],lastResult:nrState.lastResult,pastRolls:nrState.pastRolls,lastEpGain:nrState.lastEpGain,bestEp:nrState.bestEp,streak:nrState.streak,lastRollDate:nrState.lastRollDate,rarityCounts:nrState.rarityCounts}))}catch(e){}
}

function nrRenderBadgeCard(b,idx,isNewSet){
  const R=window.RNGDLE
  const tier=R.getBadgeTierFromEp(b.score)
  const newPill=(isNewSet&&isNewSet.has(b.id))
  const isScoring=b.isScoring!==false
  let hl=''
  try{
    const c=R.getBadgeContributors(b.id,nrState.lastResult?nrState.lastResult.number:0)
    const s=String(nrState.lastResult?nrState.lastResult.number:'')
    const digits=s.split('')
    const mark={}
    if(c){
      if(c.type==='whole'){for(let i=0;i<digits.length;i++)mark[i]=true}
      else if(c.type==='range'){for(let i=c.start;i<c.end&&i<digits.length;i++)mark[i]=true}
      else if(c.type==='indices'){for(const i of c.indices||[])mark[i]=true}
    }
    hl=digits.map((ch,i)=>'<span class="nr-hl-digit'+(mark[i]?' on':'')+'">'+ch+'</span>').join('')
  }catch(e){}
  return '<div class="nr-badge-card nr-badge-'+tier+(isScoring?' scoring':'')+'" style="animation-delay:'+(0.15+idx*0.07)+'s">'+
    '<div class="nr-badge-card-emoji">'+b.emoji+'</div>'+
    '<div class="nr-badge-card-body">'+
      '<div class="nr-badge-card-title">'+b.label+(newPill?' <span class="nr-badge-new">NEW</span>':'')+'</div>'+
      '<div class="nr-badge-card-pills">'+
        '<span class="nr-badge-rarity-pill '+tier+'">'+tier.toUpperCase()+'</span>'+
        (isScoring?'<span class="nr-badge-ep-pill">+'+b.score.toLocaleString()+' EP</span>':'<span class="nr-badge-ep-pill muted">not scored</span>')+
      '</div>'+
      '<div class="nr-badge-card-desc">'+b.description+'</div>'+
      '<div class="nr-hl-row">'+hl+'</div>'+
    '</div>'+
  '</div>'
}

function renderNr(){
  const R=window.RNGDLE
  const r=nrState.lastResult
  const rolledToday=nrIsToday(nrState.lastRollDate)
  const totalBadges=R.RNGDLE_BADGES.length
  let html='<div class="nr-wrap rngdle">'
  html+='<div class="nr-big-number" id="nrNumber">'+(r?'<span class="nr-num-final">'+r.number.toLocaleString()+'</span>':'<span class="nr-num-placeholder">? ? ? ? ? ?</span>')+'</div>'
  html+='<div class="nr-subtitle">One roll per day. One number. What will yours be?</div>'
  if(rolledToday){
    html+='<button class="nr-generate-btn rolled" id="nrRollBtn" disabled><span class="nr-btn-label">COME BACK TOMORROW</span><span class="nr-btn-countdown" id="nrCountdown">'+nrFormatCountdown(getMillisUntilUTCMidnight())+'</span></button>'
  }else{
    html+='<button class="nr-generate-btn" id="nrRollBtn" onclick="rollNr()"><span class="nr-btn-label">GENERATE</span></button>'
  }
  if(r){
    const pct=(typeof r.percentile==='number')?r.percentile:R.getPercentileForScore(r.totalScore)
    const cr=r.rarity||nrCardRarity(r.totalScore)
    const topPct=(100-pct)
    html+='<div class="nr-result-card nr-rarity-'+cr+'">'
    html+='<div class="nr-result-number nr-rarity-'+cr+'">'+r.number.toLocaleString()+'</div>'
    html+='<div class="nr-rarity-pill-row"><span class="nr-rarity-pill '+cr+'">'+nrRarityEmoji(cr)+' '+cr.toUpperCase()+'</span><span class="nr-top-pill">TOP '+(topPct<0.01?'0.00':topPct.toFixed(2))+'%</span></div>'
    html+='<div class="nr-ep-pill">+'+r.totalScore.toLocaleString()+' EP</div>'
    html+='<div class="nr-lifetime-ep" id="nrLifetimeEp">Lifetime EP: '+nrState.ep.toLocaleString()+'</div>'
    if(r.badges&&r.badges.length){
      html+='<div class="nr-badges-title">Badges</div>'
      html+='<div class="nr-badge-cards" id="nrBadgeCards">'+r.badges.map((b,i)=>nrRenderBadgeCard(b,i,nrState._newSet)).join('')+'</div>'
    }else{
      html+='<div class="nr-badges-title">No badges on this roll</div>'
    }
    html+='<div class="nr-action-row">'
    html+='<button class="nr-share-btn" onclick="nrShareRoll()">📋 Share Roll</button>'
    html+='<button class="nr-action-btn" onclick="toggleNrCollection()">Collection ('+nrState.badgeCount+'/'+totalBadges+')</button>'
    html+='<button class="nr-action-btn" onclick="nrShowPastRolls()">History ('+nrState.pastRolls.length+')</button>'
    html+='</div>'
    html+='<div class="nr-next-roll">Next roll in <span id="nrCountdown2">'+nrFormatCountdown(getMillisUntilUTCMidnight())+'</span></div>'
    html+='</div>'
  }else{
    html+='<div class="nr-action-row">'
    html+='<button class="nr-action-btn" onclick="toggleNrCollection()">Collection ('+nrState.badgeCount+'/'+totalBadges+')</button>'
    html+='<button class="nr-action-btn" onclick="nrShowPastRolls()">History ('+nrState.pastRolls.length+')</button>'
    html+='</div>'
  }
  if(nrState.streak>1)html+='<div class="nr-streak-line">☀ '+nrState.streak+' day streak!</div>'
  html+='<div class="nr-stats-row"><span>Rolls: '+nrState.rolls.toLocaleString()+'</span><span>Badges: '+nrState.badgeCount+'/'+totalBadges+'</span><span>Best: '+nrState.bestEp.toLocaleString()+' EP</span></div>'
  html+='<div class="nr-collection" id="nrCollection"><h3>Badge Collection</h3><div class="nr-col-grid">'
  ;[...R.RNGDLE_BADGES].sort((a,b)=>a.score-b.score).forEach(b=>{
    const owned=nrState.collection.has(b.id)
    const tier=R.getBadgeTierFromEp(b.score)
    html+='<div class="nr-col-badge'+(owned?' unlocked '+tier:'')+'" onclick="nrBadgeDetail(\''+b.id+'\')" title="'+b.label+' — '+b.score.toLocaleString()+' EP">'+b.emoji+' '+b.label+(owned?' ✓':'')+'</div>'
  })
  html+='</div></div>'
  html+='<div id="lbContainer"></div>'
  html+='</div>'
  document.getElementById('nrContent').innerHTML=html
  lbFetch().then(()=>{const c=document.getElementById('lbContainer');if(c)c.innerHTML=lbRender()})
  if(rolledToday){
    nrStartCountdown()
  }
}
function nrStartCountdown(){
  const upd=()=>{
    const ms=getMillisUntilUTCMidnight()
    const txt=nrFormatCountdown(ms)
    const a=document.getElementById('nrCountdown')
    const b=document.getElementById('nrCountdown2')
    if(a)a.textContent=txt
    if(b)b.textContent=txt
    if(ms<=0){renderNr()}
  }
  upd()
  if(window._nrCdTimer)clearInterval(window._nrCdTimer)
  window._nrCdTimer=setInterval(upd,1000)
}
function toggleNrCollection(){
  const el=document.getElementById('nrCollection')
  if(el)el.classList.toggle('open')
}
function nrShareRoll(){
  const r=nrState.lastResult
  if(!r)return
  const R=window.RNGDLE
  const pct=(typeof r.percentile==='number')?r.percentile:R.getPercentileForScore(r.totalScore)
  const cr=r.rarity||nrCardRarity(r.totalScore)
  const topPct=(100-pct)
  const scoring=r.badges?r.badges.filter(b=>b.isScoring!==false):[]
  const emojis=scoring.map(b=>b.emoji).join('')
  const text='🎲 '+r.number.toLocaleString()+'\n'+cr.toUpperCase()+' · TOP '+topPct.toFixed(2)+'% · '+r.totalScore.toLocaleString()+' EP\n'+emojis+'\n'+scoring.length+' badges · #'+nrState.rolls+' roll\n\n🎲 Number Roll'
  if(navigator.clipboard){navigator.clipboard.writeText(text).then(()=>{const btn=document.querySelector('.nr-share-btn');if(btn){btn.textContent='✅ Copied!';setTimeout(()=>{btn.innerHTML='📋 Share Roll'},1500)}})}
}
function nrUpdateButton(){
  const btn=document.querySelector('.gs-btn[data-game="numberroll"]')
  if(btn){
    if(nrState.lastResult)btn.textContent='🎲 '+nrState.lastResult.number.toLocaleString()
    else btn.textContent='🎲 Number Roll'
  }
  const hdr=document.getElementById('nrHeaderDisplay')
  if(hdr){
    if(nrState.lastResult)hdr.textContent='🎲 '+nrState.lastResult.number.toLocaleString()
    else hdr.textContent='🎲 ?'
  }
  const hdrep=document.getElementById('nrHeaderEp')
  if(hdrep)hdrep.textContent=nrState.ep.toLocaleString()
}
function nrBadgeDetail(id){
  const R=window.RNGDLE
  const bg=R.RNGDLE_BADGE_MAP.get(id)
  if(!bg)return
  const owned=nrState.collection.has(id)
  const count=nrState.badges[id]||0
  const tier=R.getBadgeTierFromEp(bg.score)
  const existing=document.getElementById('nrBadgeModal')
  if(existing)existing.remove()
  const modal=document.createElement('div')
  modal.id='nrBadgeModal'
  modal.style.cssText='position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:1000'
  modal.onclick=function(e){if(e.target===this)this.remove()}
  modal.innerHTML='<div style="background:var(--bg-mid);border:1px solid var(--border);border-radius:16px;padding:30px;max-width:360px;width:90%;text-align:center">'+
    '<div style="font-size:40px;margin-bottom:10px">'+bg.emoji+'</div>'+
    '<h3 style="font-size:20px;font-weight:800;margin-bottom:6px;color:var(--text)">'+bg.label+'</h3>'+
    '<p style="color:var(--text-dim);font-size:14px;margin-bottom:12px">'+bg.description+'</p>'+
    '<div style="display:flex;gap:8px;justify-content:center;margin-bottom:12px">'+
      '<span style="padding:4px 12px;border-radius:12px;font-size:12px;font-weight:600;background:var(--surface);color:var(--text-muted);border:1px solid var(--border-light)">'+tier.toUpperCase()+'</span>'+
      '<span style="padding:4px 12px;border-radius:12px;font-size:12px;font-weight:600;background:var(--surface);color:var(--text-muted);border:1px solid var(--border-light)">'+bg.score.toLocaleString()+' EP</span>'+
    '</div>'+
    '<div style="color:'+(owned?'var(--ctp-green)':'var(--text-muted)')+';font-size:13px;font-weight:600;margin-bottom:16px">'+
      (owned?'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-check"/></svg> Unlocked! (×'+count+')':'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-x-circle"/></svg> Not yet unlocked')+
    '</div>'+
    '<button onclick="this.closest(\'#nrBadgeModal\').remove()" style="padding:8px 24px;border:none;border-radius:10px;background:linear-gradient(135deg,#ff6b35,#f7c948);color:#1a1a1a;font-weight:700;font-size:13px;cursor:pointer">Close</button>'+
  '</div>'
  document.body.appendChild(modal)
}
function nrShowPastRolls(){
  const existing=document.getElementById('nrPastModal')
  if(existing)existing.remove()
  const rolls=nrState.pastRolls
  if(!rolls.length){
    const m=document.createElement('div')
    m.id='nrPastModal'
    m.style.cssText='position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:1000'
    m.onclick=function(e){if(e.target===this)this.remove()}
    m.innerHTML='<div style="background:var(--bg-mid);border:1px solid var(--border);border-radius:16px;padding:30px;max-width:360px;width:90%;text-align:center">'+
      '<h3 style="font-size:20px;font-weight:800;margin-bottom:6px;color:var(--text)"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-clipboard"/></svg> Past Rolls</h3>'+
      '<p style="color:var(--text-dim);font-size:14px">No rolls yet. Click 🎲 Roll to start!</p>'+
      '<button onclick="this.closest(\'#nrPastModal\').remove()" style="margin-top:16px;padding:8px 24px;border:none;border-radius:10px;background:linear-gradient(135deg,#ff6b35,#f7c948);color:#1a1a1a;font-weight:700;font-size:13px;cursor:pointer">Close</button></div>'
    document.body.appendChild(m)
    return
  }
  let sortMode='date'
  let expanded={}
  function getBadgeCount(r){return Array.isArray(r.badges)?r.badges.length:(r.badges||0)}
  function rowHtml(r,idx){
    const bc=getBadgeCount(r)
    const cr=r.rarity?r.rarity:nrCardRarity(r.ep||0)
    const epStr=r.ep>0?'<span style="color:var(--ctp-green);font-weight:700">+'+r.ep.toLocaleString()+'EP</span>':'<span style="color:var(--text-muted)">0EP</span>'
    const uid='pr_'+idx
    const open=expanded[uid]
    const badges=r.badgeNames&&r.badgeNames.length?r.badgeNames.map(b=>'<span title="'+b.label+' ['+b.score.toLocaleString()+'EP] · '+(b.tier||'').toUpperCase()+'" style="font-size:16px;cursor:pointer" onclick="nrBadgeDetail(\''+b.id+'\')">'+b.emoji+'</span>').join(''):'<span style="color:var(--text-muted);font-size:12px">-</span>'
    return '<div style="padding:6px 10px;border-radius:6px;background:'+(idx%2===0?'var(--surface)':'transparent')+';cursor:pointer" onclick="nrToggleRoll(\''+uid+'\',this)">'+
      '<div style="display:flex;justify-content:space-between;align-items:center">'+
      '<span><span class="pr_arr" style="color:var(--text-muted);margin-right:6px;font-size:10px">'+(open?'▼':'▶')+'</span><span style="color:var(--ctp-yellow);font-weight:700;font-family:monospace">'+(idx+1)+'. '+r.n.toLocaleString()+'</span></span>'+
      '<span>'+epStr+' <span style="color:var(--text-dim)">'+bc+'</span> <span style="color:var(--text-muted);font-size:10px;text-transform:uppercase">'+cr+'</span></span></div>'+
      '<div class="pr_bdgs" style="display:'+(open?'flex':'none')+';flex-wrap:wrap;gap:4px;margin-top:6px;padding-top:6px;border-top:1px solid var(--border-light)">'+badges+'</div></div>'
  }
  function buildList(){
    let sorted=[...rolls]
    if(sortMode==='ep')sorted.sort((a,b)=>(b.ep||0)-(a.ep||0))
    else if(sortMode==='badges')sorted.sort((a,b)=>getBadgeCount(b)-getBadgeCount(a))
    expanded={}
    return sorted.map((r,i)=>rowHtml(r,i)).join('')
  }
  function sortBy(mode){sortMode=mode;var c=document.getElementById('nrPastContent');if(c)c.innerHTML=buildList();var sb=document.getElementById('nrSortBar');if(sb)sb.querySelectorAll('span').forEach(function(el,i){var keys=['date','ep','badges'];el.style.background=keys[i]===mode?'rgba(247,201,72,0.2)':'var(--surface-hover)';el.style.color=keys[i]===mode?'var(--ctp-yellow)':'var(--text-dim)';el.style.borderColor=keys[i]===mode?'rgba(247,201,72,0.3)':'var(--border-light)'})}
  window.nrToggleRoll=function(uid,el){var b=el.querySelector('.pr_bdgs');var a=el.querySelector('.pr_arr');if(b&&a){var now=b.style.display;b.style.display=now==='flex'?'none':'flex';a.textContent=now==='flex'?'▶':'▼'}}
  window.nrSortPastRolls=sortBy
  const modal=document.createElement('div')
  modal.id='nrPastModal'
  modal.style.cssText='position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:1000'
  modal.onclick=function(e){if(e.target===this){this.remove();delete window.nrToggleRoll;delete window.nrSortPastRolls}}
  modal.innerHTML='<div style="background:var(--bg-mid);border:1px solid var(--border);border-radius:16px;padding:20px 24px;max-width:440px;width:90%;max-height:75vh;display:flex;flex-direction:column">'+
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-shrink:0">'+
      '<h3 style="font-size:18px;font-weight:800;color:var(--text);margin:0"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-clipboard"/></svg> Past Rolls</h3>'+
      '<span style="color:var(--text-muted);font-size:12px">'+rolls.length+' total</span></div>'+
    '<div id="nrSortBar" style="display:flex;gap:6px;margin-bottom:10px;flex-shrink:0">'+
      ['Date','EP','Badges'].map(function(l,i){var k=['date','ep','badges'][i];return '<span style="padding:4px 12px;border-radius:10px;font-size:12px;font-weight:600;cursor:pointer;background:var(--surface-hover);color:var(--text-dim);border:1px solid var(--border-light)" onclick="nrSortPastRolls(\''+k+'\')">'+l+' ▼</span>'}).join('')+
    '</div>'+
    '<div style="overflow-y:auto;flex:1;min-height:0" id="nrPastContent">'+buildList()+'</div>'+
    '<button onclick="this.closest(\'#nrPastModal\').remove();delete window.nrToggleRoll;delete window.nrSortPastRolls" style="margin-top:12px;padding:8px 24px;border:none;border-radius:10px;background:linear-gradient(135deg,#ff6b35,#f7c948);color:#1a1a1a;font-weight:700;font-size:13px;cursor:pointer;flex-shrink:0">Close</button></div>'
  document.body.appendChild(modal)
}

function nrRevealNumber(target){
  const el=document.getElementById('nrNumber')
  if(!el)return Promise.resolve()
  const digits=String(target).split('')
  const d=digits.length
  el.innerHTML=''
  const spans=[]
  for(let i=0;i<d;i++){
    const sp=document.createElement('span')
    sp.className='nr-digit-slot'+(i===0?' first':'')
    sp.textContent='?'
    el.appendChild(sp)
    spans.push(sp)
  }
  return new Promise(res=>{
    let idx=0
    const iv=setInterval(()=>{
      if(idx<d){
        spans[idx].textContent=digits[idx]
        spans[idx].classList.add('revealed')
        idx++
      }else{
        clearInterval(iv)
        el.classList.add('done')
        res()
      }
    },260)
  })
}

function rollNr(){
  const R=window.RNGDLE
  const today=new Date()
  if(nrIsToday(nrState.lastRollDate)){
    const btn=document.getElementById('nrRollBtn')
    if(btn){btn.disabled=true}
    return
  }
  const btn=document.getElementById('nrRollBtn')
  if(btn){btn.disabled=true;const lbl=btn.querySelector('.nr-btn-label');if(lbl)lbl.textContent='PROCESSING…'}
  const n=R.rollRandomNumber()
  nrRevealNumber(n).then(()=>{
    try{
      const composed=R.composeRollResult(n,nrState.collection)
      composed.percentile=R.getPercentileForScore(composed.totalScore)
      composed.rarity=nrCardRarity(composed.totalScore)
      const scoringIds=new Set(composed.badges.filter(b=>b.isScoring).map(b=>b.id))
      nrState._newSet=new Set()
      composed.badges.forEach(b=>{
        if(!nrState.collection.has(b.id)){nrState.collection.add(b.id);nrState.badgeCount++;nrState._newSet.add(b.id)}
        nrState.badges[b.id]=(nrState.badges[b.id]||0)+1
      })
      const epGain=composed.totalScore
      const prevEp=nrState.ep
      nrState.lastResult=composed
      nrState.lastEpGain=epGain
      nrState.ep+=epGain
      nrState.rolls++
      if(epGain>nrState.bestEp)nrState.bestEp=epGain
      const cr=nrCardRarity(epGain)
      nrState.rarityCounts[cr]=(nrState.rarityCounts[cr]||0)+1
      const todayStr=new Date().toISOString()
      if(nrState.lastRollDate){
        const last=new Date(nrState.lastRollDate)
        const y=new Date(Date.now()-86400000)
        const sameDay=d=>d.getUTCFullYear()===y.getUTCFullYear()&&d.getUTCMonth()===y.getUTCMonth()&&d.getUTCDate()===y.getUTCDate()
        if(sameDay(last))nrState.streak++
        else if(!nrIsToday(nrState.lastRollDate))nrState.streak=1
      }else{nrState.streak=1}
      nrState.lastRollDate=todayStr
      nrState.pastRolls.unshift({n:n,ep:epGain,rarity:cr,pct:composed.percentile,badges:composed.badges.filter(b=>b.isScoring).length,badgeNames:composed.badges.map(b=>({id:b.id,emoji:b.emoji,label:b.label,score:b.score,tier:R.getBadgeTierFromEp(b.score)}))})
      if(nrState.pastRolls.length>100)nrState.pastRolls.length=100
      saveNr()
      renderNr()
      nrUpdateButton()
      updateStats('mg6',{ep:nrState.ep,rolls:nrState.rolls,badgeCount:nrState.badgeCount})
      renderLeaderboard()
      dailyCheckProgress('roll1',1)
      lbSubmit(epGain).then(s=>{
        const c=document.getElementById('lbContainer');if(c)c.innerHTML=lbRender()
        if(s==='full'){const el=document.querySelector('.nr-result-card');if(el){const m=document.createElement('div');m.style.cssText='margin-top:8px;font-size:12px;color:var(--text-muted)';m.textContent='Leaderboard full — top 20 all-time only';el.appendChild(m)}}
      })
    }catch(e){
      console.error('Roll error',e)
      const el=document.getElementById('nrNumber')
      if(el)el.textContent=n.toLocaleString()
    }
  })
}

// ===== USERNAME =====
const USER_KEY='pokeUser'
function getUsername(){return localStorage.getItem(USER_KEY)||'Guest'}
function setUsername(){
  const cur=getUsername()
  const name=prompt('Enter your username:',cur==='Guest'?'':cur)
  if(name&&name.trim()){
    if(name.trim()!==cur){
      localStorage.setItem(USER_KEY,name.trim())
      document.getElementById('userDisplay').innerHTML='<svg class="ico" width="1em" height="1em" viewBox="-1 -1 26 26"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> '+name.trim()
    }
    updateOperatorTab()
    rvRender()
    renderCollection()
  }
}
function loadUsername(){
  document.getElementById('userDisplay').innerHTML='<svg class="ico" width="1em" height="1em" viewBox="-1 -1 26 26"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> '+getUsername()
  updateOperatorTab()
  rvRender()
  renderCollection()
}

// ===== WORLD LEADERBOARD (ScoreDrop, zero auth) =====
// Create your free leaderboard at https://leaderboard-game.vercel.app/
// Then paste your API key below:
const LB_KEY='zshcbttjk8'
let lbCache=null
function lbPlayerId(){
  const u=getUsername();let h=0
  for(let i=0;i<u.length;i++){h=((h<<5)-h)+u.charCodeAt(i);h|=0}
  return 'pk_'+Math.abs(h).toString(36)
}

async function lbFetch(){
  if(LB_KEY==='YOUR_SCOREDROP_API_KEY')return lbCache||[]
  try{
    const r=await fetch('https://leaderboard-game.vercel.app/api/top?key='+LB_KEY+'&limit=20')
    if(!r.ok)return lbCache||[]
    const d=await r.json()
    if(d.scores)lbCache=d.scores.map(s=>({user:s.player,score:s.score}))
    return lbCache||[]
  }catch(e){return lbCache||[]}
}

async function lbSubmit(score){
  if(LB_KEY==='YOUR_SCOREDROP_API_KEY')return 'no_key'
  const user=getUsername()
  if(user==='Guest')return 'no_user'
  try{
    const url='https://leaderboard-game.vercel.app/api/add?key='+LB_KEY+'&player_id='+encodeURIComponent(lbPlayerId())+'&player='+encodeURIComponent(user)+'&score='+score
    const r=await fetch(url)
    if(!r.ok)return 'full'
    await lbFetch()
    return 'ok'
  }catch(e){return 'error'}
}

function lbRender(){
  const data=lbCache||[]
  const configured=LB_KEY!=='YOUR_SCOREDROP_API_KEY'
  let html='<div class="lb-panel"><div class="lb-title"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-trophy"/></svg> World Leaderboard</div>'
  if(!configured){
    html+='<div class="lb-footer" style="padding:12px">Set LB_KEY in script.js to enable</div></div>'
    return html
  }
  if(!data.length){
    html+='<div class="lb-footer">No scores yet. Roll to be first!</div></div>'
    return html
  }
  html+='<div class="lb-list">'
  data.slice(0,20).forEach((e,i)=>{
    const medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':(i+1)
    const isMe=e.user===getUsername()?' me':''
    html+='<div class="lb-row'+isMe+'"><span class="lb-rank">'+medal+'</span><span class="lb-user">'+e.user+'</span><span class="lb-score">'+e.score.toLocaleString()+'</span></div>'
  })
  html+='</div>'
  html+='<div class="lb-footer">'+data.length+' players · Updated live</div>'
  html+='</div>'
  return html
}

// ===== STATS & LEADERBOARD =====
const STATS_KEY='pokeStats'
let _statsCache=null
function getStats(){if(_statsCache)return _statsCache;try{_statsCache=JSON.parse(localStorage.getItem(STATS_KEY)||'{}');return _statsCache}catch(e){return {}}}
function saveStats(){try{localStorage.setItem(STATS_KEY,JSON.stringify(_statsCache))}catch(e){}}
function loadStatsObj(u){
  const all=getStats()
  const def={champ:{wins:0,streak:0,maxStreak:0,stardust:0,rank:0},wg:{best:99,games:0,wins:0},mg1:{best:0},mg2:{best:0,streak:0},mg3:{best:999},mg4:{best:0},mg5:{best:0,total:0},mg6:{ep:0,rolls:0,badgeCount:0}}
  all[u]=all[u]||JSON.parse(JSON.stringify(def))
  return all[u]
}
function chSaveStats(){
  _statsCache=null
  const u=getUsername()
  if(u==='Guest')return
  const s=loadStatsObj(u)
  if(ch.totalWins>s.champ.wins)s.champ.wins=ch.totalWins
  if(ch.maxStreak>s.champ.maxStreak)s.champ.maxStreak=ch.maxStreak
  if(ch.stardust>s.champ.stardust)s.champ.stardust=ch.stardust
  if(ch.trainerIdx>s.champ.rank)s.champ.rank=ch.trainerIdx
  s.champ.streak=ch.winStreak
  saveStats()
}
function updateStats(game,data){
  _statsCache=null
  const u=getUsername()
  if(u==='Guest')return
  const s=loadStatsObj(u)
  if(game==='wg'){s.wg.games++;if(data.win){s.wg.wins++;if(data.guesses<s.wg.best)s.wg.best=data.guesses}}
  if(game==='mg1'&&data.score>s.mg1.best)s.mg1.best=data.score
  if(game==='mg2'){if(data.score>s.mg2.best)s.mg2.best=data.score;if(data.streak>s.mg2.streak)s.mg2.streak=data.streak}
  if(game==='mg3'&&data.moves<s.mg3.best)s.mg3.best=data.moves
  if(game==='mg4'&&data.count>s.mg4.best)s.mg4.best=data.count
  if(game==='mg5'){s.mg5.total++;if(data.correct)s.mg5.best++}
  if(game==='mg6'){s.mg6.ep=data.ep;s.mg6.rolls=data.rolls;s.mg6.badgeCount=data.badgeCount}
  saveStats()
}
function renderLeaderboard(){
  const all=getStats()
  const entries=Object.entries(all).filter(([u])=>u!=='Guest')
  const me=getUsername()
  if(!entries.length){
    document.getElementById('lbContent').innerHTML='<h2><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-trophy"/></svg> Leaderboard</h2><div class="lb-empty">No stats yet. Play some games and set a username!</div>'
    return
  }
  entries.sort((a,b)=>{
    const score=s=>{
      const c=s.champ||{},w=s.wg||{},m1=s.mg1||{},m2=s.mg2||{},m3=s.mg3||{},m4=s.mg4||{},m5=s.mg5||{},m6=s.mg6||{}
      return (c.wins||0)*100+(c.maxStreak||0)*50+(c.stardust||0)+(m1.best||0)*20+(m2.best||0)*10+(m4.best||0)*5+(w.wins||0)*30+(m3.best===999?0:(100-m3.best)*5)+(m5.best||0)*3+(m6.ep||0)
    }
    return score(b[1])-score(a[1])
  })
  let html='<h2><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-trophy"/></svg> Leaderboard</h2><div style="overflow-x:auto"><table class="lb-table"><tr><th>#</th><th>Player</th><th><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-trophy"/></svg> Champ</th><th><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-target"/></svg> Wordle</th><th><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-search"/></svg> Who\'s That</th><th><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-zap"/></svg> Type Speed</th><th><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-brain"/></svg> Memory</th><th><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-clock"/></svg> Speedrun</th><th><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-help-circle"/></svg> Type Quiz</th><th>⚅ RNG</th></tr>'
  entries.forEach(([u,s],i)=>{
    const cls=u===me?' lb-me':''
    const c=s.champ||{},w=s.wg||{},m1=s.mg1||{},m2=s.mg2||{},m3=s.mg3||{},m4=s.mg4||{},m5=s.mg5||{},m6=s.mg6||{}
    const wgBest=w.best===99?'-':w.best+'/6'
    const memBest=m3.best===999?'-':m3.best+' moves'
    html+='<tr class="'+cls+'"><td class="lb-rank">#'+(i+1)+'</td><td>'+(u===me?'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-star"/></svg> ':'')+u+'</td>'+
      '<td>'+c.wins+'w · '+c.maxStreak+' streak</td>'+
      '<td>'+wgBest+' · '+w.wins+'/ '+w.games+'</td>'+
      '<td>'+m1.best+'</td><td>'+m2.best+'</td><td>'+memBest+'</td><td>'+m4.best+'</td><td>'+m5.best+'/'+m5.total+'</td><td>'+(m6.ep||0)+'EP · '+(m6.badgeCount||0)+'</td></tr>'
  })
  html+='</table></div><div style="text-align:center;margin-top:12px;color:var(--text-muted);font-size:11px"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-star"/></svg> = you · Stats saved locally per username</div>'
  document.getElementById('lbContent').innerHTML=html
}
function updateOperatorTab(){
  const el=document.getElementById('operatorTab')
  if(el)el.style.display=getUsername()==='sayopensesame'?'':'none'
}
function opWipeLeaderboard(){
  if(!confirm('Wipe all leaderboard data for all users?'))return
  localStorage.removeItem('pokeStats')
  _statsCache=null
  document.getElementById('opResult').textContent='<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-check"/></svg> Leaderboard data wiped!'
  renderLeaderboard()
}
function opCacheStatus(){
  let total=0;const counts={pokemon:0,moves:0,abilities:0,tcg:0,other:0}
  for(let i=0;i<localStorage.length;i++){
    const k=localStorage.key(i);const v=localStorage.getItem(k);total+=k.length+v.length
    if(k.startsWith('pokeData_')||k.startsWith('pokeDetail_')||k.startsWith('pokeTypes_'))counts.pokemon++
    else if(k.startsWith('pokeMove'))counts.moves++
    else if(k.startsWith('pokeAbil'))counts.abilities++
    else if(k.startsWith('pokeTcg')||k.startsWith('pokeSet'))counts.tcg++
    else counts.other++
  }
  const mb=(total/1024/1024).toFixed(2)
  document.getElementById('opResult').innerHTML=
    '<div style="text-align:left;background:var(--surface);padding:16px;border-radius:12px;border:1px solid var(--border);margin-top:12px">'+
      '<div style="font-size:14px;font-weight:700;margin-bottom:8px"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-package"/></svg> Cache Status</div>'+
      '<div style="font-size:13px;color:var(--text-dim)">Total size: <b>'+mb+' MB</b> / ~5 MB limit</div>'+
      '<div style="font-size:12px;color:var(--text-dim);margin-top:6px">Pokémon cached: <b>'+counts.pokemon+'</b></div>'+
      '<div style="font-size:12px;color:var(--text-dim)">Moves cached: <b>'+counts.moves+'</b></div>'+
      '<div style="font-size:12px;color:var(--text-dim)">Abilities cached: <b>'+counts.abilities+'</b></div>'+
      '<div style="font-size:12px;color:var(--text-dim)">TCG data cached: <b>'+counts.tcg+'</b></div>'+
      '<div style="font-size:12px;color:var(--text-dim)">Other cached: <b>'+counts.other+'</b></div>'+
    '</div>'
}
function opClearApiCache(){
  if(!confirm('Clear all cached API data? (Pokemon, moves, abilities, TCG)'))return
  const keys=[]
  for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k.startsWith('pokeData_')||k.startsWith('pokeDetail_')||k.startsWith('pokeTypes_')||k.startsWith('pokeMove')||k.startsWith('pokeAbil')||k.startsWith('pokeTcg')||k.startsWith('pokeSet')||k.startsWith('pokeAllPokemonList')||k.startsWith('pokeAllMovesList')||k.startsWith('pokeAllAbilitiesList'))keys.push(k)}
  keys.forEach(k=>localStorage.removeItem(k))
  if('caches' in window)caches.delete('pokedex-v1')
  document.getElementById('opResult').textContent='<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-check"/></svg> API cache cleared! ('+keys.length+' entries removed)'
}
function opWipeAll(){
  if(!confirm('This will delete EVERYTHING (all localStorage). Are you sure?'))return
  if(!confirm('Last chance! All progress, stats, saves, and settings will be gone.'))return
  localStorage.clear()
  _statsCache=null
  nrState={ep:0,rolls:0,badgeCount:0,badges:{},collection:new Set(),lastResult:null,pastRolls:[],lastEpGain:0,bestEp:0,streak:0,lastRollDate:null,rarityCounts:{trash:0,common:0,uncommon:0,rare:0,epic:0,anomaly:0,mythic:0}}
  document.getElementById('opResult').textContent='<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-alert-triangle"/></svg> All localStorage wiped! Reloading...'
  setTimeout(()=>location.reload(),1500)
}

// ===== CARD COLLECTION =====
function pcKey(){return 'pc_'+getUsername()}
function pcGetCard(id){
  try{
    const d=JSON.parse(localStorage.getItem(pcKey())||'{}')
    const keys=Object.keys(d).filter(k=>k===id||k.startsWith(id+'||'))
    if(!keys.length)return null
    const totalQty=keys.reduce((s,k)=>s+(d[k].qty||0),0)
    const first=d[keys[0]]
    return {...first,qty:totalQty}
  }catch(e){return null}
}
function pcGetAll(){try{return JSON.parse(localStorage.getItem(pcKey())||'{}')}catch(e){return {}}}
function pcSave(d){try{localStorage.setItem(pcKey(),JSON.stringify(d))}catch(e){}}
function pcAddCard(id,name,setName,price,img,grade,variant,qty){
  if(getUsername()==='Guest'){alert('Set a username first!');return}
  const d=pcGetAll()
  const hasG=grade&&grade!=='Raw'&&grade!==undefined
  const hasV=variant&&variant!=='Normal'&&variant!==undefined
  const key=hasG||hasV?id+'||'+(grade||'Raw')+'||'+(variant||'Normal'):id
  if(d[key]){d[key].qty+=(qty||1);d[key].price=price}else{
    d[key]={qty:qty||1,name,setName,price,img,added:Date.now(),grade:grade||undefined,variant:variant||undefined}
  }
  pcSave(d)
  if(price>0)phRecordPrice(id,price)
  renderCollection()
}
function pcShowAddModal(id,name,setName,price,img){
  if(getUsername()==='Guest'){alert('Set a username first!');return}
  const ex=document.getElementById('pcAddModal')
  if(ex)ex.remove()
  const m=document.createElement('div')
  m.id='pcAddModal'
  m.style.cssText='position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center'
  const grades=['Raw','PSA 1','PSA 2','PSA 3','PSA 4','PSA 5','PSA 6','PSA 7','PSA 8','PSA 9','PSA 10','CGC 9','CGC 10','BGS 9','BGS 10']
  const variants=['Normal','Holo','Reverse Holo','First Edition','Unlimited','Promo','Staff']
  const sN=(setName||'').replace(/'/g,"\\'")
  const bp=price||0
  m.innerHTML='<div style="background:var(--bg-mid);border-radius:12px;padding:24px;width:340px;max-width:90vw;box-shadow:0 8px 32px rgba(0,0,0,0.5)">'+
    '<h3 style="margin:0 0 4px;font-size:16px;color:var(--text)">'+name+'</h3>'+
    '<div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">'+(setName||'')+'</div>'+
    '<label style="display:block;font-size:12px;color:var(--text-dim);margin-bottom:4px">Price</label>'+
    '<div style="display:flex;gap:6px;margin-bottom:4px;align-items:center">'+
    '<input id="pcAddPrice" type="number" step="0.01" min="0" value="'+(bp||'')+'" placeholder="0.00" style="flex:1;padding:8px;border-radius:6px;border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:14px;font-weight:600;outline:none;box-sizing:border-box" data-set="'+sN+'">'+
    '<button id="pcPriceBtn" onclick="pcLookupPrice()" style="padding:8px 10px;border-radius:6px;border:1px solid var(--border);background:var(--surface);color:var(--text-dim);cursor:pointer;font-size:11px;white-space:nowrap"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-search"/></svg> PriceCharting</button>'+
    '</div>'+
    '<div id="pcPriceResult" style="font-size:11px;color:var(--text-muted);margin-bottom:12px;min-height:15px"></div>'+
    '<label style="display:block;font-size:12px;color:var(--text-dim);margin-bottom:4px">Quantity</label>'+
    '<input id="pcAddQty" type="number" min="1" value="1" style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:13px;outline:none;margin-bottom:12px;box-sizing:border-box">'+
    '<label style="display:block;font-size:12px;color:var(--text-dim);margin-bottom:4px">Grade</label>'+
    '<select id="pcAddGrade" style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:13px;outline:none;margin-bottom:12px;box-sizing:border-box">'+
    grades.map(function(g){return '<option value="'+g+'"'+(g==='Raw'?' selected':'')+'>'+g+'</option>'}).join('')+'</select>'+
    '<label style="display:block;font-size:12px;color:var(--text-dim);margin-bottom:4px">Variant</label>'+
    '<input id="pcAddVariant" list="pcVariantList" value="Normal" placeholder="e.g. Holo, Reverse Holo" style="width:100%;padding:8px;border-radius:6px;border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:13px;outline:none;margin-bottom:16px;box-sizing:border-box">'+
    '<datalist id="pcVariantList">'+variants.map(function(v){return '<option value="'+v+'">'}).join('')+'</datalist>'+
    '<div style="display:flex;gap:8px">'+
    '<button onclick="this.closest(\'#pcAddModal\').remove()" style="flex:1;padding:8px;border-radius:6px;border:1px solid var(--border);background:transparent;color:var(--text-dim);cursor:pointer;font-size:13px">Cancel</button>'+
    '<button onclick="pcAddCard(\''+id+'\',\''+name.replace(/'/g,"\\'")+'\',\''+sN+'\',parseFloat(document.getElementById(\'pcAddPrice\').value)||0,\''+img+'\',document.getElementById(\'pcAddGrade\').value,document.getElementById(\'pcAddVariant\').value,parseInt(document.getElementById(\'pcAddQty\').value)||1);document.getElementById(\'pcAddModal\').remove();renderCollection()" style="flex:1;padding:8px;border-radius:6px;border:none;background:#4caf50;color:var(--text);cursor:pointer;font-size:13px;font-weight:600">Add</button>'+
    '</div></div>'
  document.body.appendChild(m)
}
function pcLookupPrice(){
  const grade=document.getElementById('pcAddGrade').value
  const result=document.getElementById('pcPriceResult')
  const input=document.getElementById('pcAddPrice')
  if(!result||!input)return
  const name=document.querySelector('#pcAddModal h3')?.textContent||''
  const setName=input.dataset.set||''
  const q=encodeURIComponent((name+' '+setName).replace(/[^a-zA-Z0-9 ]/g,'').trim())
  result.textContent='Searching...'
  fetch('https://www.pricecharting.com/search-products?q='+q+'&format=json&type=prices')
    .then(r=>r.ok?r.json():Promise.reject())
    .then(data=>{
      const products=data.products||data||[]
      let found=null
      const gradeKey=grade.toLowerCase().replace(' ','')
      if(Array.isArray(products)){
        found=products.find(p=>{
          const pn=(p.product_name||p.name||'').toLowerCase()
          const pc=(p.console_name||'').toLowerCase()
          return (pn.includes(gradeKey)||pc.includes(gradeKey))&&(pn.includes('pokemon')||pc.includes('pokemon'))
        })||products[0]
      }
      if(found){
        const p=parseFloat(found.loose_price||found.used_price||found.price||0)
        if(p>0){
          input.value=p.toFixed(2)
          result.textContent='$'+p.toFixed(2)+' from PriceCharting for '+grade
          return
        }
      }
      result.textContent='Price not found on PriceCharting — opened search page'
      window.open('https://www.pricecharting.com/search-products?q='+q+'&type=prices','_blank')
    })
    .catch(()=>{
      result.textContent='Opened PriceCharting in new tab — find the '+grade+' price and type it in'
      window.open('https://www.pricecharting.com/search-products?q='+q+'&type=prices','_blank')
    })
}
function pcRemoveCard(id){
  const d=pcGetAll()
  delete d[id]
  pcSave(d)
  renderCollection()
}
function pcUpdatePrice(id,price){
  const d=pcGetAll()
  if(d[id])d[id].price=price
  pcSave(d)
}
function renderCollection(){
  wlRender()
  const el=document.getElementById('colContent')
  if(!el)return
  const search=(document.getElementById('colSearch')?.value||'').toLowerCase()
  const sortBy=(document.getElementById('colSortBy')?.value||'name')
  const filterSet=(document.getElementById('colFilterSet')?.value||'')
  const d=pcGetAll()
  let entries=Object.entries(d).filter(([key,c])=>{
    if(search&&!c.name.toLowerCase().includes(search)&&!(c.setName||'').toLowerCase().includes(search)&&!key.toLowerCase().includes(search))return false
    if(filterSet&&c.setName!==filterSet)return false
    return true
  })
  const sets=new Set()
  Object.values(d).forEach(c=>{if(c.setName)sets.add(c.setName)})
  const setSel=document.getElementById('colFilterSet')
  if(setSel){
    const cur=setSel.value
    setSel.innerHTML='<option value="">All Sets ('+Object.keys(d).length+')</option>'+[...sets].sort().map(s=>'<option value="'+s.replace(/"/g,'&quot;')+'"'+(s===cur?' selected':'')+'>'+s+'</option>').join('')
  }
  entries.sort(([ka,a],[kb,b])=>{
    switch(sortBy){
      case 'name':return(a.name||'').localeCompare(b.name||'')
      case 'name-desc':return(b.name||'').localeCompare(a.name||'')
      case 'price':return(a.price||0)-(b.price||0)
      case 'price-desc':return(b.price||0)-(a.price||0)
      case 'qty':return(a.qty||0)-(b.qty||0)
      case 'qty-desc':return(b.qty||0)-(a.qty||0)
      case 'newest':return(b.added||0)-(a.added||0)
      case 'oldest':return(a.added||0)-(b.added||0)
      default:return 0
    }
  })
  let totalVal=0,totalCards=0,totalUnique=entries.length
  entries.forEach(([key,c])=>{totalVal+=(c.price||0)*c.qty;totalCards+=c.qty})
  const st=document.getElementById('colStats')
  if(st)st.innerHTML='<span style="font-size:13px;font-weight:700;color:var(--text)">'+totalUnique+' unique · '+totalCards+' cards · <span style="color:var(--ctp-green)">$'+totalVal.toFixed(2)+'</span></span>'
  if(!entries.length){
    el.innerHTML='<div class="col-empty">'+(search||filterSet?'No cards match your filters':'Search for a card above to start your collection!')+'</div>'
    return
  }
  el.innerHTML='<div class="col-grid">'+entries.map(([key,c])=>{
    const priceStr=c.price?'<div style="font-size:13px;font-weight:700;color:var(--ctp-green)">$'+(c.price*c.qty).toFixed(2)+'</div>':''
    const gv=c.grade||c.variant?'<div style="font-size:10px;color:var(--text-muted)">'+(c.grade||'')+(c.grade&&c.variant?' · ':'')+(c.variant||'')+'</div>':''
    return '<div class="col-card" onclick="pcShowCard(\''+key.replace(/'/g,"\\'")+'\')">'+
      (c.img?'<img src="'+c.img+'" alt="'+c.name+'" loading="lazy">':'<div style="width:50px;height:70px;border-radius:4px;background:var(--surface);flex-shrink:0"></div>')+
      '<div class="col-card-info">'+
        '<div class="col-card-name">'+c.name+' '+wlBtn(key.replace(/'/g,"\\'"),c.name,c.setName,(c.price*c.qty).toFixed(2))+'</div>'+
        '<div class="col-card-set">'+(c.setName||'Unknown Set')+'</div>'+
        gv+priceStr+
        '<div class="col-card-qty" style="display:flex;align-items:center;gap:6px;margin-top:4px">'+
          '<button onclick="event.stopPropagation();pcChangeQty(\''+key.replace(/'/g,"\\'")+'\',-1)" style="width:22px;height:22px;border-radius:50%;border:1px solid var(--border);background:var(--surface);color:var(--text);cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center">−</button>'+
          '<span style="font-size:12px;font-weight:600;min-width:20px;text-align:center">×'+c.qty+'</span>'+
          '<button onclick="event.stopPropagation();pcChangeQty(\''+key.replace(/'/g,"\\'")+'\',1)" style="width:22px;height:22px;border-radius:50%;border:1px solid var(--border);background:var(--surface);color:var(--text);cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center">+</button>'+
          '<button onclick="event.stopPropagation();pcRemoveCard(\''+key.replace(/'/g,"\\'")+'\')" style="margin-left:auto;width:22px;height:22px;border-radius:50%;border:1px solid rgba(255,50,50,0.3);background:rgba(255,50,50,0.1);color:var(--ctp-red);cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center" title="Remove">✕</button>'+
        '</div>'+
      '</div>'+
    '</div>'
  }).join('')+'</div>'
}
function pcChangeQty(key,delta){
  const d=pcGetAll()
  if(d[key]){
    d[key].qty=Math.max(1,(d[key].qty||1)+delta)
    pcSave(d)
    renderCollection()
  }
}

// ===== PRICE HISTORY & CHART =====
function phKey(){return 'ph_'+getUsername()}
function phGetAll(){try{return JSON.parse(localStorage.getItem(phKey())||'{}')}catch(e){return {}}}
function phSave(d){try{localStorage.setItem(phKey(),JSON.stringify(d))}catch(e){}}
let _pcAutoTimer=null
let _pcAutoCache={}
let _pcViewAll=false
function pcAutocomplete(q){
  const el=document.getElementById('colAutocomplete')
  if(!el)return
  if(!q.trim()){el.style.display='none';_pcViewAll=false;return}
  if(_pcAutoTimer)clearTimeout(_pcAutoTimer)
  _pcAutoTimer=setTimeout(async()=>{
    const key=q.trim().toLowerCase()
    const ck=(_pcViewAll?'v:':'')+key
    if(_pcAutoCache[ck]){renderPcAuto(_pcAutoCache[ck]);return}
    el.innerHTML='<div style="padding:10px 14px;color:var(--text-muted);font-size:13px">Searching...</div>'
    el.style.display='block'
    let cards=[]
    try{
      const query='name:'+key
      const res=await fetch('https://api.pokemontcg.io/v2/cards?q='+encodeURIComponent(query)+'&orderBy=set.releaseDate&pageSize='+(_pcViewAll?200:50))
      if(res.ok){
        const data=await res.json()
        cards=(data.data||[]).slice(0,_pcViewAll?200:50)
      }
    }catch(e){}
    if(!cards.length){
      try{
        const res=await fetch('https://api.pokemontcg.io/v1/cards?name='+encodeURIComponent(key)+'&pageSize='+(_pcViewAll?200:50))
        if(res.ok){
          const data=await res.json()
          cards=(data.cards||[]).map(c=>({
            id:c.id,name:c.name,set:c.set||{name:c.setName||''},
            images:{small:c.imageUrl||c.imageUrlHiRes||''},
            cardmarket:c.cardmarket,tcgplayer:c.tcgplayer
          })).slice(0,_pcViewAll?200:50)
        }
      }catch(e){}
    }
    if(!cards.length){
      const all=[]
      Object.keys(cardsCache).forEach(sid=>{(cardsCache[sid]||[]).forEach(c=>{
        if(c.name&&c.name.toLowerCase().includes(key)&&!all.find(x=>x.id===c.id)) all.push(c)
      })})
      cards=all.slice(0,50)
    }
    _pcAutoCache[ck]=cards
    renderPcAuto(cards)
  },150)
}
function renderPcAuto(cards){
  const el=document.getElementById('colAutocomplete')
  if(!el)return
  if(!cards.length){el.innerHTML='<div style="padding:10px 14px;color:var(--text-muted);font-size:13px">No cards found</div>';el.style.display='block';return}
  if(!_pcViewAll){
    const grouped={}
    cards.forEach(c=>{
      const name=c.name
      if(!grouped[name])grouped[name]={name,cards:[]}
      grouped[name].cards.push(c)
    })
    const groups=Object.values(grouped).slice(0,20)
    el.innerHTML=groups.map(g=>{
      const count=g.cards.length
      const inCol=g.cards.some(c=>pcGetCard(c.id))
      const rep=g.cards[0]
      const dex=rep.nationalPokedexNumbers?.[0]||rep.id.split('-')[0]||''
      const img=rep.images?.small||''
      return '<div style="padding:10px 14px;cursor:pointer;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--border-light);transition:background .1s" '+
        'onmouseenter="this.style.background=\'var(--surface-hover)\'" onmouseleave="this.style.background=\'\'" '+
        'onclick="pcViewAllCards(\''+g.name.replace(/'/g,"\\'")+'\')">'+
        (img?'<img src="'+img+'" style="width:44px;height:62px;border-radius:4px;object-fit:contain;flex-shrink:0;background:var(--surface-hover)">':'')+
        '<span style="flex:1;font-size:14px;font-weight:600;color:var(--text)">#'+dex+' '+g.name+'</span>'+
        '<span style="font-size:12px;color:var(--text-muted)">'+count+' card'+(count>1?'s':'')+(inCol?' · owned':'')+'</span>'+
      '</div>'
    }).join('')
  }else{
    el.innerHTML='<div style="padding:8px 14px;font-size:12px;color:var(--text-muted);border-bottom:1px solid var(--border-light);cursor:pointer" onmouseenter="this.style.background=\'var(--surface-hover)\'" onmouseleave="this.style.background=\'\'" onclick="pcBackToGroups()">← Back to groups</div>'+
    cards.map(c=>{
      const price=c.cardmarket?.prices?.averageSellPrice||c.tcgplayer?.prices?.normal?.market||c.tcgplayer?.prices?.holofoil?.market
      const inCol=pcGetCard(c.id)
      const dex=c.nationalPokedexNumbers?.[0]||c.id.split('-')[0]||''
      const img=c.images?.small||''
      const setNum=c.number||''
      return '<div style="padding:8px 14px;cursor:pointer;display:flex;align-items:center;gap:12px;border-bottom:1px solid var(--border-light);transition:background .1s" '+
        'onmouseenter="this.style.background=\'var(--surface-hover)\'" onmouseleave="this.style.background=\'\'" '+
        'onclick="pcShowAddModal(\''+c.id+'\',\''+c.name.replace(/'/g,"\\'")+'\',\''+(c.set?.name||'').replace(/'/g,"\\'")+'\','+(price||0)+',\''+img+'\');document.getElementById(\'colAutocomplete\').style.display=\'none\'">'+
        (img?'<img src="'+img+'" style="width:44px;height:62px;border-radius:4px;object-fit:contain;flex-shrink:0;background:var(--surface-hover)">':'<div style="width:44px;height:62px;border-radius:4px;background:var(--surface-hover);flex-shrink:0"></div>')+
        '<div style="flex:1;min-width:0">'+
          '<div style="font-size:13px;font-weight:600;color:var(--text)">#'+dex+' '+c.name+'</div>'+
          '<div style="font-size:11px;color:var(--text-muted)">'+(c.set?.name||'')+(setNum?' · #'+setNum:'')+'</div>'+
        '</div>'+
        (inCol?'<span style="font-size:11px;color:var(--text-muted)">×'+inCol.qty+'</span>':
          (price?'<span style="font-size:11px;color:var(--ctp-green)">$'+Number(price).toFixed(2)+'</span>':
          '<span style="font-size:11px;color:var(--ctp-green)">+ Add</span>'))+
      '</div>'
    }).join('')
  }
  el.style.display='block'
}
function pcViewAllCards(name){
  _pcViewAll=true
  const inp=document.getElementById('colAddSearch')
  if(inp)inp.value=name
  _pcAutoCache={}
  pcAutocomplete(name)
}
function pcBackToGroups(){
  _pcViewAll=false
  const inp=document.getElementById('colAddSearch')
  if(inp)pcAutocomplete(inp.value)
}
document.addEventListener('click',function(e){const ac=document.getElementById('colAutocomplete');if(ac&&!e.target.closest('#colAddSearch')&&!e.target.closest('#colAutocomplete'))ac.style.display='none'})
function phRecordPrice(id,price){
  const d=phGetAll()
  if(!d[id])d[id]=[]
  d[id].push({p:price,t:Date.now()})
  if(d[id].length>50)d[id]=d[id].slice(-50)
  phSave(d)
}
function phGetHistory(id){const d=phGetAll();return d[id]||[]}
function pcShowCard(storageKey){
  const existing=document.getElementById('pcCardModal')
  if(existing)existing.remove()
  const d=pcGetAll()
  const c=d[storageKey]
  if(!c)return
  const id=storageKey.split('||')[0]
  const hist=phGetHistory(id)
  const modal=document.createElement('div')
  modal.id='pcCardModal'
  modal.style.cssText='position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:1000'
  modal.onclick=function(e){if(e.target===this)this.remove()}
  const price=c.price?'$'+c.price.toFixed(2):'Unknown'
  const totalVal=c.price?'$'+(c.price*c.qty).toFixed(2):'—'
  let chartHtml=''
  if(hist.length>1){
    const prices=hist.map(x=>x.p)
    const dates=hist.map(x=>new Date(x.t).toLocaleDateString())
    const minP=Math.min(...prices),maxP=Math.max(...prices)
    const range=maxP-minP||1
    const w=320,h=120,pad=10
    const xs=prices.map((p,i)=>pad+(w-pad*2)*i/(prices.length-1))
    const ys=prices.map(p=>pad+h-pad*2-(p-minP)/range*(h-pad*2))
    const line=xs.map((x,i)=>x+','+ys[i]).join(' ')
    const fill=xs.map((x,i)=>x+','+ys[i]).join(' ')+' '+xs[xs.length-1]+','+(h-pad)+' '+xs[0]+','+(h-pad)
    const gridLines=[0,0.25,0.5,0.75,1].map(f=>{
      const y=pad+(h-pad*2)*(1-f)
      const val=(minP+range*f).toFixed(2)
      return '<line x1="'+pad+'" y1="'+y+'" x2="'+(w-pad)+'" y2="'+y+'" stroke="var(--border-light)" stroke-width="1"/><text x="'+(pad-4)+'" y="'+(y+3)+'" text-anchor="end" fill="var(--text-muted)" font-size="8">$'+val+'</text>'
    }).join('')
    const lastP=prices[prices.length-1]
    const change=lastP-prices[0]
    const changeStr=(change>=0?'+':'')+change.toFixed(2)
    const changeClr=change>=0?'#4caf50':'#ff5252'
    chartHtml='<div style="margin-top:12px;text-align:center">'+
      '<svg width="'+w+'" height="'+(h+20)+'" style="background:rgba(0,0,0,0.2);border-radius:8px;padding:4px">'+
      '<rect x="0" y="0" width="'+w+'" height="'+(h+20)+'" fill="none"/>'+
      gridLines+
      '<polygon points="'+fill+'" fill="rgba(76,175,80,0.08)"/>'+
      '<polyline points="'+line+'" fill="none" stroke="rgba(76,175,80,0.8)" stroke-width="2" stroke-linejoin="round"/>'+
      xs.map((x,i)=>'<circle cx="'+x+'" cy="'+ys[i]+'" r="2" fill="'+(i===xs.length-1?'#f7c948':'rgba(76,175,80,0.6)')+'"/>').join('')+
      '</svg>'+
      '<div style="font-size:11px;color:var(--text-muted);margin-top:2px">From $'+prices[0].toFixed(2)+' to $'+lastP.toFixed(2)+' <span style="color:'+changeClr+';font-weight:600">('+changeStr+')</span></div></div>'
  } else if(hist.length===1){
    chartHtml='<div style="margin-top:12px;text-align:center;color:var(--text-muted);font-size:12px"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-bar-chart"/></svg> Price recorded once — $'+hist[0].p.toFixed(2)+' <span style="font-size:10px;color:var(--text-muted)">('+new Date(hist[0].t).toLocaleDateString()+')</span></div>'
  } else {
    chartHtml='<div style="margin-top:12px;text-align:center;color:var(--text-muted);font-size:12px"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-bar-chart"/></svg> No price data yet. Prices are recorded when you add or view cards.</div>'
  }
  modal.innerHTML='<div style="background:var(--bg-mid);border:1px solid var(--border);border-radius:16px;padding:24px;max-width:400px;width:90%;text-align:center">'+
    (c.img?'<img src="'+c.img+'" alt="'+c.name+'" style="width:80px;height:112px;object-fit:contain;border-radius:6px;background:var(--surface);padding:4px;margin-bottom:8px">':'')+
    '<h3 style="font-size:18px;font-weight:800;margin:0;color:var(--text)">'+c.name+'</h3>'+
    '<div style="font-size:12px;color:var(--text-dim);margin-bottom:4px">'+(c.setName||'')+'</div>'+
    (c.grade||c.variant?'<div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">'+(c.grade||'')+(c.grade&&c.variant?' · ':'')+(c.variant||'')+'</div>':'')+
    '<div style="display:flex;gap:16px;justify-content:center;margin-bottom:8px">'+
      '<div><div style="font-size:11px;color:var(--text-muted)">Price</div><div style="font-size:16px;font-weight:700;color:var(--ctp-green)">'+price+'</div></div>'+
      '<div><div style="font-size:11px;color:var(--text-muted)">Qty</div><div style="font-size:16px;font-weight:700;color:var(--ctp-yellow)">×'+c.qty+'</div></div>'+
      '<div><div style="font-size:11px;color:var(--text-muted)">Total</div><div style="font-size:16px;font-weight:700;color:var(--ctp-green)">'+totalVal+'</div></div>'+
    '</div>'+
    (c.added?'<div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">Added '+new Date(c.added).toLocaleDateString()+'</div>':'')+
    chartHtml+
    '<div style="display:flex;gap:8px;justify-content:center;margin-top:12px">'+
      '<button onclick="pcRemoveCard(\''+id+'\');this.closest(\'#pcCardModal\').remove()" style="padding:8px 20px;border:none;border-radius:10px;background:rgba(255,50,50,0.15);color:var(--ctp-red);font-weight:600;font-size:12px;cursor:pointer">Remove from Collection</button>'+
      '<button onclick="this.closest(\'#pcCardModal\').remove()" style="padding:8px 20px;border:none;border-radius:10px;background:linear-gradient(135deg,#ff6b35,#f7c948);color:#1a1a1a;font-weight:700;font-size:12px;cursor:pointer">Close</button>'+
    '</div></div>'
  document.body.appendChild(modal)
}

// ===== RECENTLY VIEWED =====
function rvKey(){return 'rv_'+getUsername()}
function rvGet(){try{return JSON.parse(localStorage.getItem(rvKey())||'[]')}catch(e){return []}}
function rvSave(arr){try{localStorage.setItem(rvKey(),JSON.stringify(arr))}catch(e){}}
function rvAdd(type,id,name,img){
  const arr=rvGet().filter(r=>!(r.type===type&&r.id===id))
  arr.unshift({type,id,name,img,time:Date.now()})
  if(arr.length>20)arr.length=20
  rvSave(arr)
  rvRender()
}
function rvClick(item){
  if(item.type==='card'){switchTab('sets');if(item.id)setTimeout(()=>{const s=allSets.find(x=>x.id===item.id);if(s)openSet(s.id)},150)}
  else if(item.type==='pokemon'){switchTab('pokemon');openDetail(parseInt(item.id))}
  else if(item.type==='move'){switchTab('attacks');openMoveDetail(parseInt(item.id))}
  else if(item.type==='ability'){switchTab('abilities');openAbilityDetail(parseInt(item.id))}
}
function rvRender(){
  const bar=document.getElementById('rvBar')
  if(!bar)return
  const arr=rvGet()
  const icons={pokemon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-swords"/></svg>',card:'🃏',move:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-zap"/></svg>',ability:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-sparkles"/></svg>'}
  if(!arr.length){bar.innerHTML='<span style="color:var(--text-muted);font-size:11px;white-space:nowrap">Recently Viewed</span>';return}
  bar.innerHTML='<span style="color:var(--text-muted);font-size:11px;white-space:nowrap;flex-shrink:0">Recently Viewed</span>'+
    arr.slice(0,12).map(r=>{
      const img=r.img?'<img src="'+r.img+'" alt="">':'<span style="font-size:14px">'+(icons[r.type]||'')+'</span>'
      return '<span class="rv-item" onclick="rvClick({type:\''+r.type+'\',id:\''+r.id+'\'})" title="'+r.name+'">'+img+'<span>'+r.name+'</span></span>'
    }).join('')+
    '<span style="color:var(--text-muted);font-size:10px;cursor:pointer;flex-shrink:0;margin-left:auto" onclick="rvSave([]);rvRender()">✕ clear</span>'
}

// Theme toggle
function toggleTheme(){
  document.body.classList.toggle('light')
  const isLight=document.body.classList.contains('light')
  localStorage.setItem('pokeTheme',isLight?'light':'dark')
  document.getElementById('themeToggle').innerHTML=isLight?'<svg class="ico" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>':'<svg class="ico" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'
  document.querySelector('meta[name="theme-color"]').setAttribute('content',isLight?'#eff1f5':'#1e1e2e')
}
const savedTheme=localStorage.getItem('pokeTheme')
if(savedTheme==='light'){document.body.classList.add('light');document.getElementById('themeToggle').innerHTML='<svg class="ico" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';document.querySelector('meta[name="theme-color"]').setAttribute('content','#eff1f5')}

// ===== CANVAS TEAM CARD GENERATOR =====
let tcTeam=[]
function initTeamCard(){
  tcTeam=[]
  tcRenderSlots()
  document.getElementById('tcCanvas').style.display='none'
  document.getElementById('tcDownload').style.display='none'
  tcInjectArtToggle()
}
function tcPickSearchPokemon(q){
  if(!q||q.length<2)return
  const matches=allPokemon.filter(p=>p.name.includes(q.toLowerCase())).slice(0,8)
  const dd=document.getElementById('tcPickDD')
  if(!dd)return
  if(!matches.length){dd.style.display='none';return}
  dd.style.display='block'
  dd.innerHTML=matches.map(p=>'<div style="padding:6px 10px;cursor:pointer;font-size:12px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px" onmousedown="tcAddPokemon('+p.id+');document.getElementById(\'tcPickDD\').style.display=\'none\';document.getElementById(\'tcPickSearch\').value=\'\'">'+imgTag(p.id,'28px')+' <span>'+cap(p.name)+'</span></div>').join('')
}
function tcAddPokemon(id){
  if(tcTeam.length>=6)return
  const p=allPokemon.find(x=>x.id===id)
  if(!p||tcTeam.some(x=>x.id===id))return
  tcTeam.push({id:p.id,name:cap(p.name),types:p.types})
  tcRenderSlots()
  const dd=document.getElementById('tcPickDD');if(dd)dd.innerHTML=''
}
function tcRemoveFromTeam(idx){tcTeam.splice(idx,1);tcRenderSlots()}
function tcRenderSlots(){
  const el=document.getElementById('tcPickGrid')
  const slots=tcTeam.map((p,i)=>'<div style="width:80px;text-align:center;cursor:pointer;position:relative" onclick="tcRemoveFromTeam('+i+')">'+imgTag(p.id,'60px')+'<div style="font-size:10px;text-transform:capitalize">'+cap(p.name)+'</div><div style="position:absolute;top:-4px;right:-4px;width:16px;height:16px;background:#f44336;border-radius:50%;color:var(--text);font-size:10px;display:flex;align-items:center;justify-content:center;cursor:pointer">&times;</div></div>').join('')
  const empty=Array(Math.max(0,6-tcTeam.length)).fill('<div style="width:80px;height:80px;border:2px dashed var(--border);border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:20px">+</div>').join('')
  el.innerHTML=slots+empty+
    '<div style="width:100%;position:relative;margin-top:8px">'+
    '<input type="text" id="tcPickSearch" placeholder="Search to add..." autocomplete="off" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:13px" oninput="tcPickSearchPokemon(this.value)">'+
    '<div id="tcPickDD" style="display:none;position:absolute;left:0;right:0;background:var(--surface);border:1px solid var(--border);border-radius:8px;max-height:150px;overflow-y:auto;z-index:10"></div>'+
    '</div>'
}
function tcGenerate(){
  if(tcTeam.length<1){alert('Add at least 1 Pokémon!');return}
  const canvas=document.getElementById('tcCanvas')
  canvas.style.display='block'
  document.getElementById('tcDownload').style.display='block'
  const ctx=canvas.getContext('2d')
  const W=600,H=380
  const bg=document.getElementById('tcBgSelect').value
  const bgColors={fire:['#3d1a0a','#5c2a0a'],water:['#0a1a3d','#0a2a5c'],grass:['#0a3d1a','#0a5c2a'],electric:['#3d3a0a','#5c5a0a'],psychic:['#3d0a3d','#5c0a5c'],dragon:['#1a0a3d','#2a0a5c'],retro:['#0f380f','#306230'],cyberpunk:['#0a0014','#1a0033'],noir:['#0d0d0d','#1a1a1a']}
  const [c1,c2]=bgColors[bg]||bgColors.fire
  const grad=ctx.createLinearGradient(0,0,W,H)
  grad.addColorStop(0,c1);grad.addColorStop(1,c2)
  ctx.fillStyle=grad;ctx.fillRect(0,0,W,H)
  ctx.fillStyle='rgba(255,255,255,0.03)'
  for(let i=0;i<50;i++){ctx.beginPath();ctx.arc(Math.random()*W,Math.random()*H,Math.random()*30+5,0,Math.PI*2);ctx.fill()}
  ctx.strokeStyle='rgba(247,201,72,0.3)';ctx.lineWidth=2;ctx.strokeRect(10,10,W-20,H-20)
  ctx.strokeStyle='rgba(247,201,72,0.1)';ctx.lineWidth=1;ctx.strokeRect(16,16,W-32,H-32)
  const name=document.getElementById('tcNameInput').value||'Trainer'
  ctx.fillStyle='#f7c948';ctx.font='bold 24px system-ui,sans-serif';ctx.textAlign='center'
  ctx.fillText('\u2726 '+name+"'s Team \u2726",W/2,46)
  ctx.fillStyle='rgba(255,255,255,0.4)';ctx.font='11px system-ui,sans-serif'
  ctx.fillText('POK\u00c9MON CHAMPIONS',W/2,64)
  const count=tcTeam.length
  const slotW=Math.min(120,Math.floor((W-60)/count)-10)
  const slotH=160
  const totalW=count*slotW+(count-1)*10
  const startX=(W-totalW)/2
  const slotY=80
  const typeColors={fire:'#f44336',water:'#2196f3',grass:'#4caf50',electric:'#ffeb3b',ice:'#03a9f4',fighting:'#e91e63',poison:'#9c27b0',ground:'#795548',flying:'#03a9f4',psychic:'#e91e63',bug:'#8bc34a',rock:'#795548',ghost:'#673ab7',dragon:'#3f51b5',dark:'#424242',steel:'#607d8b',fairy:'#e91e63',normal:'#9e9e9e'}
  const loaded=new Array(count).fill(false)
  tcTeam.forEach((p,i)=>{
    const x=startX+i*(slotW+10)
    ctx.fillStyle='rgba(255,255,255,0.05)';ctx.strokeStyle='rgba(247,201,72,0.25)';ctx.lineWidth=1
    ctx.beginPath();ctx.roundRect(x,slotY,slotW,slotH,10);ctx.fill();ctx.stroke()
    const imgSize=Math.min(80,slotW-20)
    const img=new Image();img.crossOrigin='anonymous'
    const idx=i
    img.onload=()=>{ctx.imageSmoothingEnabled=false;ctx.drawImage(img,x+(slotW-imgSize)/2,slotY+10,imgSize,imgSize);loaded[idx]=true}
    img.src=tcGetSprite(p.id)
    const displayName=cap(p.name)
    ctx.fillStyle='#fff';ctx.font='bold 12px system-ui,sans-serif';ctx.textAlign='center'
    ctx.fillText(displayName,x+slotW/2,slotY+imgSize+28)
    p.types.forEach((t,ti)=>{
      const badgeW=36,badgeH=16
      const totalBadgeW=p.types.length*badgeW+(p.types.length-1)*4
      const bx=x+(slotW-totalBadgeW)/2+ti*(badgeW+4)
      const by=slotY+slotH-28
      ctx.fillStyle=typeColors[t]||'#999'
      ctx.beginPath();ctx.roundRect(bx,by,badgeW,badgeH,4);ctx.fill()
      ctx.fillStyle='#fff';ctx.font='bold 9px system-ui,sans-serif'
      ctx.fillText(t.substring(0,3).toUpperCase(),bx+badgeW/2,by+11)
    })
  })
  const footerY=H-30
  ctx.fillStyle='rgba(255,255,255,0.2)';ctx.font='10px system-ui,sans-serif';ctx.textAlign='center'
  ctx.fillText('Generated with Pok\u00e9dex App \u00b7 '+new Date().toLocaleDateString(),W/2,footerY)
}
function tcDownload(){
  const canvas=document.getElementById('tcCanvas')
  const link=document.createElement('a')
  link.download='pokemon-team-card.png'
  link.href=canvas.toDataURL('image/png')
  link.click()
}

// ===== TRAINER CUSTOMISATION SHOP =====
const SHOP_AVATARS=[
  {id:'av_red',name:'Red Classic',cost:200,icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-user"/></svg>',desc:'The original champion'},
  {id:'av_blue',name:'Blue Rival',cost:200,icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-user"/></svg>',desc:'Your fierce rival'},
  {id:'av_leaf',name:'Leaf Green',cost:200,icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-user"/></svg>',desc:'Kanto heroine'},
  {id:'av_lance',name:'Dragon Master',cost:400,icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-crystal"/></svg>',desc:'Elite Four champion'},
  {id:'av_cynthia',name:'Sinnoh Queen',cost:500,icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-crown"/></svg>',desc:'Unbeatable elegance'},
  {id:'av_n',name:'Nature Prince',cost:400,icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-crown"/></svg>',desc:'King of Unova'},
  {id:'av_prof',name:'Professor',cost:600,icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-user"/></svg>‍<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-crystal"/></svg>',desc:'Pokémon researcher'},
  {id:'av_villain',name:'Team Leader',cost:800,icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-swords"/></svg>',desc:'Mysterious villain'}
]
const SHOP_BADGES=[
  {id:'bd_fire',name:'Fire Badge',cost:150,icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-fire"/></svg>',desc:'Earned through flame'},
  {id:'bd_water',name:'Water Badge',cost:150,icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-droplet"/></svg>',desc:'Master of tides'},
  {id:'bd_thunder',name:'Thunder Badge',cost:150,icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-zap"/></svg>',desc:'Electric victory'},
  {id:'bd_dragon',name:'Dragon Badge',cost:300,icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-dragon"/></svg>',desc:'Dragon tamer'},
  {id:'bd_legend',name:'Legendary Badge',cost:500,icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-crown"/></svg>',desc:'Conquered legends'},
  {id:'bd_streak',name:'Streak Badge',cost:250,icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-fire"/></svg>',desc:'10+ win streak'}
]
const SHOP_BACKGROUNDS=[
  {id:'bg_volcano',name:'Volcano',cost:300,icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-volcano"/></svg>',desc:'Fiery battle arena',colors:['#3d0a0a','#5c1a0a']},
  {id:'bg_ocean',name:'Deep Ocean',cost:300,icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-waves"/></svg>',desc:'Underwater depths',colors:['#0a0a3d','#0a1a5c']},
  {id:'bg_space',name:'Cosmic',cost:400,icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-globe"/></svg>',desc:'Star-filled cosmos',colors:['#0a0020','#1a0040']},
  {id:'bg_forest',name:'Ancient Forest',cost:300,icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-tree"/></svg>',desc:'Mystical woodland',colors:['#0a3d0a','#1a5c0a']},
  {id:'bg_neon',name:'Neon City',cost:500,icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-building"/></svg>',desc:'Cyberpunk skyline',colors:['#1a0030','#300050']}
]
let chCustom=null
function loadCustom(){
  try{chCustom=JSON.parse(localStorage.getItem('pokeCustom'))}catch(e){}
  if(!chCustom)chCustom={avatar:'av_red',badge:null,bg:null,unlocked:[]}
}
function saveCustom(){localStorage.setItem('pokeCustom',JSON.stringify(chCustom))}
loadCustom()
function initTrainerShop(){
  const el=document.getElementById('tsContent')
  el.innerHTML='<h2 style="text-align:center;margin-bottom:4px"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-credit-card"/></svg> Trainer Shop</h2>'+
    '<p style="text-align:center;color:var(--text-dim);font-size:12px;margin-bottom:4px">Customize your trainer with stardust from battles!</p>'+
    '<div style="text-align:center;margin-bottom:12px;color:var(--ctp-yellow);font-weight:700"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-star"/></svg> Stardust: '+ch.stardust+'</div>'+
    '<div style="display:grid;gap:16px">'+tsRenderSection('Avatars',SHOP_AVATARS,'avatar')+tsRenderSection('Badges',SHOP_BADGES,'badge')+tsRenderSection('Backgrounds',SHOP_BACKGROUNDS,'bg')+'</div>'
}
function tsRenderSection(title,items,type){
  return '<div><h3 style="font-size:14px;margin-bottom:6px;color:var(--text)">'+title+'</h3><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:6px">'+
    items.map(item=>{
      const owned=chCustom.unlocked.includes(item.id)
      const active=(type==='avatar'&&chCustom.avatar===item.id)||(type==='badge'&&chCustom.badge===item.id)||(type==='bg'&&chCustom.bg===item.id)
      return '<div style="background:var(--surface);border:1px solid '+(active?'#f7c948':owned?'#4caf50':'var(--border)')+';border-radius:10px;padding:10px;text-align:center;cursor:pointer;opacity:'+(owned||ch.stardust>=item.cost?1:0.5)+';position:relative;z-index:1" onclick="tsBuyOrEquip(\''+item.id+'\',\''+type+'\','+item.cost+')">'+
        '<div style="font-size:24px">'+item.icon+'</div>'+
        '<div style="font-size:11px;font-weight:700;margin:4px 0;color:var(--text)">'+item.name+'</div>'+
        '<div style="font-size:9px;color:var(--text-dim)">'+item.desc+'</div>'+
        '<div style="font-size:10px;margin-top:4px;font-weight:600;color:'+(owned?'#4caf50':'#f7c948')+'">'+(owned?(active?'✓ ACTIVE':'OWNED'):item.cost+' SD')+'</div>'+
      '</div>'
    }).join('')+'</div></div>'
}
function tsBuyOrEquip(id,type,cost){
  if(chCustom.unlocked.includes(id)){
    if(type==='avatar')chCustom.avatar=id
    else if(type==='badge')chCustom.badge=chCustom.badge===id?null:id
    else if(type==='bg')chCustom.bg=chCustom.bg===id?null:id
    saveCustom();initTrainerShop();return
  }
  if(ch.stardust<cost){return}
  ch.stardust-=cost;chCustom.unlocked.push(id)
  if(type==='avatar')chCustom.avatar=id
  else if(type==='badge')chCustom.badge=id
  else if(type==='bg')chCustom.bg=id
  chSave();saveCustom();initTrainerShop()
}

// ===== TCG BOOSTER PACK OPENER =====
const BOOSTER_COST=300
const PACK_TYPES=[
  {id:'random',name:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-package"/></svg> Random Pack',desc:'Pick any set below',cost:BOOSTER_COST,icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-package"/></svg>'},
  {id:'classic',name:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-package"/></svg> Classic Series',desc:'Base Set through Team Rocket',cost:BOOSTER_COST,icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-package"/></svg>',sets:['base1','base2','base3','base4','base5','dp1','dp2','gym1','gym2']},
  {id:'modern',name:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-zap"/></svg> Modern Era',desc:'Sword & Shield & Scarlet & Violet',cost:BOOSTER_COST,icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-zap"/></svg>',sets:['sv1','sv2','sv3','sv4','sv5','sv6','swsh1','swsh2','swsh3','swsh4','swsh5','swsh6','swsh7','swsh8','swsh9']},
  {id:'legendary',name:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-crown"/></svg> Legendary Collection',desc:'Promos, Gold Stars & Secret Rares',cost:500,icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-crown"/></svg>',sets:['pop1','pop2','pop3','pop4','pop5','pop6','pop7','pop8','pop9','pop10']},
  {id:'japanese',name:'🇯🇵 Japanese Sets',desc:'Original Japanese printings',cost:BOOSTER_COST,icon:'🇯🇵',sets:['jp','jpex','jpm']}
]
let bpSelectedPack='random'
let bpSelectedSet=null
let bpCardsCache={}
let bpOpenedCards=[]
let bpBattlePokemon=[]
let bpBattleAdded=false

async function initBoosterPack(){
  bpOpenedCards=[];bpBattlePokemon=[];bpBattleAdded=false
  const el=document.getElementById('bpContent')
  el.innerHTML='<h2 style="text-align:center;margin-bottom:4px"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-package"/></svg> TCG Booster Packs</h2>'+
    '<p style="text-align:center;color:var(--text-dim);font-size:12px;margin-bottom:4px">Open real TCG booster packs with actual card images!</p>'+
    '<div style="text-align:center;margin-bottom:12px;color:var(--ctp-yellow);font-weight:700"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-star"/></svg> Stardust: '+ch.stardust+'</div>'+
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:6px;margin-bottom:12px">'+
    PACK_TYPES.map(p=>'<div style="background:var(--surface);border:1px solid '+(bpSelectedPack===p.id?'#f7c948':'var(--border)')+';border-radius:10px;padding:10px;text-align:center;cursor:pointer" onclick="bpSelectPack(\''+p.id+'\')">'+
      '<div style="font-size:22px">'+p.icon+'</div>'+
      '<div style="font-size:11px;font-weight:600;margin:4px 0">'+p.name+'</div>'+
      '<div style="font-size:9px;color:var(--text-dim)">'+p.desc+'</div>'+
      '<div style="font-size:10px;color:var(--ctp-yellow);margin-top:4px">'+p.cost+' SD</div>'+
    '</div>').join('')+'</div>'+
    '<div id="bpSetPicker" style="margin-bottom:12px"></div>'+
    '<div style="text-align:center;margin-bottom:12px"><button class="b-btn b-btn-primary" style="font-size:14px;padding:12px 32px" onclick="bpOpenPack()" '+(ch.stardust<BOOSTER_COST?'disabled style="opacity:0.5"':'')+'><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-package"/></svg> Open Pack ('+BOOSTER_COST+' SD)</button></div>'+
    '<div id="bpResult" style="margin-bottom:12px"></div>'+
    '<div id="bpOpened" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px"></div>'+
    '<div id="bpBattlePokemon" style="margin-top:16px"></div>'
  bpRenderSetPicker()
}
function bpSelectPack(id){
  bpSelectedPack=id
  const pack=PACK_TYPES.find(p=>p.id===id)
  if(pack&&pack.sets){
    bpSelectedSet=pack.sets[Math.floor(Math.random()*pack.sets.length)]
  }else{
    bpSelectedSet=null
  }
  initBoosterPack()
}
function bpRenderSetPicker(){
  const el=document.getElementById('bpSetPicker')
  if(!el)return
  if(bpSelectedPack!=='random'){
    el.innerHTML='<div style="text-align:center;color:var(--text-dim);font-size:11px">Pack type: <b>'+PACK_TYPES.find(p=>p.id===bpSelectedPack)?.name+'</b></div>'
    return
  }
  if(!allSets.length){
    el.innerHTML='<div style="text-align:center;color:var(--text-dim);font-size:11px">Loading sets...</div>'
    loadSetsForBooster()
    return
  }
  const recentSets=allSets.filter(s=>s.total&&s.total>10).slice(-20).reverse()
  el.innerHTML='<div style="font-size:12px;font-weight:600;margin-bottom:6px">Choose a Set:</div>'+
    '<div style="display:flex;gap:4px;flex-wrap:wrap">'+recentSets.map(s=>'<button style="padding:4px 8px;border-radius:6px;border:1px solid '+(bpSelectedSet===s.id?'#f7c948':'var(--border)')+';background:'+(bpSelectedSet===s.id?'rgba(247,201,72,0.15)':'var(--surface)')+';color:var(--text);font-size:10px;cursor:pointer" onclick="bpSelectedSet=\''+s.id+'\';bpRenderSetPicker()">'+s.name+'</button>').join('')+'</div>'
}
async function loadSetsForBooster(){
  const cached=localStorage.getItem('pokeTcgSets')
  if(cached){try{allSets=JSON.parse(cached);bpRenderSetPicker();return}catch(e){}}
  try{
    const res=await fetch('https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master/sets/en.json')
    allSets=await res.json()
    try{localStorage.setItem('pokeTcgSets',JSON.stringify(allSets))}catch(e){}
    bpRenderSetPicker()
  }catch(e){
    if(allSets.length){bpRenderSetPicker();return}
    const el=document.getElementById('chBpSetPicker')||document.getElementById('bpSetPicker')
    if(el)el.innerHTML='<div style="text-align:center;color:var(--ctp-red);font-size:11px">Failed to load sets</div>'
  }
}
async function bpOpenPack(){
  if(ch.stardust<BOOSTER_COST)return
  const pack=PACK_TYPES.find(p=>p.id===bpSelectedPack)
  const cost=pack?pack.cost:BOOSTER_COST
  if(ch.stardust<cost)return
  ch.stardust-=cost;chSave()
  const el=document.getElementById('bpResult')
  const openedEl=document.getElementById('bpOpened')
  openedEl.innerHTML=''
  el.innerHTML='<div style="text-align:center;padding:20px"><div class="spinner" style="width:24px;height:24px;margin:0 auto"></div><div style="font-size:12px;color:var(--text-dim);margin-top:8px">Fetching cards from TCG API...</div></div>'
  let cards=[]
  const setId=bpSelectedSet||(pack?.sets?pack.sets[Math.floor(Math.random()*pack.sets.length)]:null)
  if(setId){
    cards=await bpFetchSetCards(setId)
  }else{
    cards=await bpFetchRandomCards(20)
  }
  if(!cards.length){
    el.innerHTML='<div style="text-align:center;color:var(--ctp-red);padding:12px">Failed to fetch cards. Try again!</div>'
    ch.stardust+=cost;chSave()
    return
  }
  const packCards=bpDistributeRarity(cards)
  el.innerHTML='<div style="text-align:center;padding:8px"><div style="font-size:14px;font-weight:700;color:var(--ctp-yellow)"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-package"/></svg> Pack Opened!</div><div style="font-size:11px;color:var(--text-dim)">'+packCards.length+' cards · '+packCards.filter(c=>c.rarity?.includes('Secret')||c.rarity?.includes('Ultra')).length+' special rare'+(packCards.filter(c=>c.rarity?.includes('Secret')||c.rarity?.includes('Ultra')).length!==1?'s':'')+'</div></div>'
  bpOpenedCards=packCards
  bpRenderOpenedCards()
  bpBattlePokemon=[];bpBattleAdded=false
  bpFetchBattlePokemon(packCards)
  const st=document.getElementById('chHubContent')
  if(st){
    const sdEl=st.querySelector('.hub-stats')
    if(sdEl)sdEl.innerHTML=sdEl.innerHTML.replace(/<svg[^>]*ico-star[^>]*>[^<]*<\/svg>\s*\d+/, '<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-star"/></svg> '+ch.stardust)
  }
}
async function bpFetchSetCards(setId){
  try{
    if(!allSets.length){
      const cachedSets=localStorage.getItem('pokeTcgSets')
      if(cachedSets){try{allSets=JSON.parse(cachedSets)}catch(e){}}
    }
    if(!allSets.length){
      const sRes=await fetch('https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master/sets/en.json')
      allSets=await sRes.json()
      try{localStorage.setItem('pokeTcgSets',JSON.stringify(allSets))}catch(e){}
    }
    const setInfo=allSets.find(s=>s.id===setId)
    const cacheKey='pokeTcgCards_'+setId
    const cached=localStorage.getItem(cacheKey)
    if(cached){
      try{const cards=JSON.parse(cached);return cards.filter(c=>c.images&&c.rarity).map(c=>({...c,set:setInfo?{id:setId,name:setInfo.name}:{id:setId,name:setId}}))}catch(e){}
    }
    const res=await fetch('https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master/cards/en/'+setId+'.json')
    if(!res.ok)throw new Error()
    const cards=await res.json()
    try{localStorage.setItem(cacheKey,JSON.stringify(cards))}catch(e){}
    return cards.filter(c=>c.images&&c.rarity).map(c=>({...c,set:setInfo?{id:setId,name:setInfo.name}:{id:setId,name:setId}}))
  }catch(e){return[]}
}
async function bpFetchRandomCards(count){
  try{
    if(!allSets.length){
      const cachedSets=localStorage.getItem('pokeTcgSets')
      if(cachedSets){try{allSets=JSON.parse(cachedSets)}catch(e){}}
    }
    if(!allSets.length){
      const sRes=await fetch('https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master/sets/en.json')
      allSets=await sRes.json()
      try{localStorage.setItem('pokeTcgSets',JSON.stringify(allSets))}catch(e){}
    }
    const playable=allSets.filter(s=>s.total&&s.total>20)
    const picks=[]
    const used=new Set()
    for(let i=0;i<5;i++){
      let s
      do{s=playable[Math.floor(Math.random()*playable.length)]}while(used.has(s?.id)&&used.size<playable.length)
      if(!s)continue
      used.add(s.id)
      const cards=await bpFetchSetCards(s.id)
      if(cards.length)picks.push(...cards)
    }
    return picks.slice(0,Math.max(count,picks.length))
  }catch(e){return[]}
}
function bpDistributeRarity(allCards){
  const rarityBuckets={common:[],uncommon:[],rare:[],ultra:[]}
  allCards.forEach(c=>{
    const r=(c.rarity||'').toLowerCase()
    if(r.includes('secret')||r.includes('ultra')||r.includes('hyper')||r.includes('rainbow')||r.includes('gold'))rarityBuckets.ultra.push(c)
    else if(r.includes('rare')||r.includes('holo'))rarityBuckets.rare.push(c)
    else if(r.includes('uncommon'))rarityBuckets.uncommon.push(c)
    else rarityBuckets.common.push(c)
  })
  const pick=(arr,n)=>{const shuffled=[...arr].sort(()=>Math.random()-0.5);return shuffled.slice(0,Math.min(n,arr.length))}
  const pack=[]
  pack.push(...pick(rarityBuckets.common,6))
  pack.push(...pick(rarityBuckets.uncommon,3))
  if(rarityBuckets.rare.length)pack.push(...pick(rarityBuckets.rare,1))
  else if(rarityBuckets.ultra.length)pack.push(...pick(rarityBuckets.ultra,1))
  while(pack.length<10&&allCards.length){
    const remaining=allCards.filter(c=>!pack.includes(c))
    if(!remaining.length)break
    pack.push(remaining[Math.floor(Math.random()*remaining.length)])
  }
  return pack.slice(0,10)
}
function bpRenderOpenedCards(){
  const el=document.getElementById('bpOpened')
  if(!el||!bpOpenedCards.length)return
  el.innerHTML=bpOpenedCards.map((c,i)=>{
    const r=(c.rarity||'Common').toLowerCase()
    const isUltra=r.includes('secret')||r.includes('ultra')||r.includes('hyper')||r.includes('rainbow')||r.includes('gold')
    const isRare=r.includes('rare')||r.includes('holo')
    const borderCol=isUltra?'#f7c948':isRare?'#6390f0':r.includes('uncommon')?'#4caf50':'var(--border)'
    const glow=isUltra?'box-shadow:0 0 20px rgba(247,201,72,0.4)':isRare?'box-shadow:0 0 12px rgba(99,144,240,0.3)':''
    const img=c.images?.small||c.images?.large||''
    return '<div style="background:var(--surface);border:2px solid '+borderCol+';border-radius:10px;overflow:hidden;animation:bpCardReveal 0.4s ease '+(i*0.08)+'s both;'+glow+'">'+
      (img?'<img src="'+img+'" alt="'+c.name+'" style="width:100%;display:block;image-rendering:auto" loading="lazy">':
        '<div style="height:200px;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:11px">No Image</div>')+
      '<div style="padding:6px;text-align:center;border-top:1px solid '+borderCol+'">'+
        '<div style="font-size:10px;font-weight:600;text-transform:capitalize">'+c.name+'</div>'+
        '<div style="font-size:8px;color:'+(isUltra?'#f7c948':isRare?'#6390f0':'var(--text-muted)')+'">'+(c.rarity||'Common')+'</div>'+
        '<div style="font-size:7px;color:var(--text-muted)">'+(c.set?.name||'')+' #'+(c.number||'?')+'</div>'+
      '</div>'+
    '</div>'
  }).join('')
}
function bpAddAllToCollection(){
  bpOpenedCards.forEach(c=>{
    const cid=c.id||c.name+'_'+Date.now()+'_'+Math.random()
    pcAddCard(cid,c.name,c.set?.name||'',0,c.images?.small||'')
  })
  const el=document.getElementById('bpOpened')
  if(el)el.innerHTML+='<div style="grid-column:1/-1;text-align:center;padding:8px;color:var(--ctp-green);font-weight:700"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-check"/></svg> All '+bpOpenedCards.length+' cards added to My Cards!</div>'
}
async function bpFetchBattlePokemon(cards){
  const el=document.getElementById('bpBattlePokemon')
  if(!el)return
  el.innerHTML='<div style="text-align:center;padding:12px"><div class="spinner" style="width:20px;height:20px;margin:0 auto"></div><div style="font-size:11px;color:var(--text-dim);margin-top:6px">Summoning battle Pokémon...</div></div>'
  const names=cards.map(c=>{
    let n=c.name.toLowerCase().replace(/[-\s]+/g,'')
      .replace(/ex$|gx$|v$|vmax$|vstar$|prime$|lv\.x$|legend$|level up$|break$|mega$/,'')
      .replace(/\s*[-–]\s*.*/,'').trim()
    return n
  }).filter(n=>n.length>0)
  let picked=null
  for(let attempt=0;attempt<20&&!picked;attempt++){
    const nm=names[attempt<names.length?attempt:Math.floor(Math.random()*names.length)]
    const match=allPokemon.find(p=>p.name===nm)
    if(!match)continue
    try{
      const d=await fetchPkmn(match.id)
      const lvl=Math.max(5,Math.min(25,Math.floor(Math.random()*15)+5))
      picked=makePkmn(d,lvl)
    }catch(e){}
  }
  if(!picked){
    try{const id=Math.floor(Math.random()*151)+1;const d=await fetchPkmn(id);picked=makePkmn(d,Math.floor(Math.random()*15)+5)}catch(e){}
  }
  bpBattlePokemon=picked?[picked]:[]
  el.innerHTML=
    '<div style="background:var(--surface);border-radius:12px;padding:14px;border:1px solid rgba(247,201,72,0.3)">'+
      '<div style="text-align:center;margin-bottom:10px"><div style="font-size:14px;font-weight:700;color:var(--ctp-yellow)"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-swords"/></svg> Battle Pokémon</div><div style="font-size:11px;color:var(--text-dim)">These Pokémon are ready to join your team!</div></div>'+
      '<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:14px">'+
        picked.map((p,i)=>{
          const hpPct=Math.round(p.currentHp/p.maxHp*100)
          return '<div style="background:var(--surface);border-radius:10px;padding:12px;border:1px solid var(--border);text-align:center;min-width:130px;animation:bpCardReveal 0.4s ease '+(i*0.15)+'s both;position:relative;z-index:1">'+
            '<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'+p.id+'.png" style="width:72px;height:72px;image-rendering:pixelated">'+
            '<div style="font-size:12px;font-weight:700;margin-top:4px;text-transform:capitalize;color:var(--text)">'+p.name+'</div>'+
            '<div style="font-size:10px;color:var(--text-dim)">Lv.'+p.level+'</div>'+
            '<div style="display:flex;gap:3px;justify-content:center;margin-top:3px">'+p.types.map(t=>'<span class="type-badge type-'+t+'" style="font-size:8px;padding:1px 5px">'+t+'</span>').join('')+'</div>'+
            '<div style="margin-top:4px;height:5px;background:var(--border);border-radius:3px;overflow:hidden"><div style="height:100%;width:'+hpPct+'%;background:'+(hpPct>50?'#4caf50':hpPct>25?'#ff9800':'#f44336')+';border-radius:3px"></div></div>'+
            '<div style="font-size:8px;color:var(--text);font-weight:600;margin-top:2px">HP '+p.currentHp+'/'+p.maxHp+'</div>'+
          '</div>'
        }).join('')+
      '</div>'+
      '<div style="text-align:center"><button class="b-btn b-btn-primary" style="font-size:13px;padding:10px 24px'+(bpBattleAdded?';opacity:0.5':'')+'" onclick="bpAddBattlePokemon()"'+(bpBattleAdded?' disabled':'')+'>'+(bpBattleAdded?'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-check"/></svg> Added to Team':'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-plus"/></svg> Add to Team')+'</button></div>'+
    '</div>'
  chSave()
}
function bpAddBattlePokemon(){
  if(bpBattleAdded||!bpBattlePokemon.length)return
  bpBattlePokemon.forEach(p=>{
    if(ch.team.length<1000)ch.team.push(p)
    const cid='bp_pkmn_'+p.id+'_'+Date.now()+'_'+Math.random()
    const img='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'+p.id+'.png'
    pcAddCard(cid,p.name.charAt(0).toUpperCase()+p.name.slice(1),'Booster Pack',0,img)
  })
  bpBattleAdded=true
  const el=document.getElementById('bpBattlePokemon')
  if(el){
    const btn=el.querySelector('.b-btn')
    if(btn){btn.textContent='<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-check"/></svg> Added to Team';btn.disabled=true;btn.style.opacity='0.5'}
  }
  chSave()
  const st=document.getElementById('chHubContent')
  if(st){
    const sdEl=st.querySelector('.hub-stats')
    if(sdEl)sdEl.innerHTML=sdEl.innerHTML.replace(/<svg[^>]*ico-swords[^>]*>[^<]*<\/svg>\s*\d+/, '<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-swords"/></svg> '+ch.team.length)
  }
}

// ===== DAILY WILD ENCOUNTER =====
const SHINY_IDS=[25,6,150,131,143,448,384,491,643,644,718,800,888,892,1007,1008]
function initDailyEncounter(){
  const el=document.getElementById('dwContent')
  const last=localStorage.getItem('pokeDailyDate')
  const now=new Date()
  const today=now.toISOString().split('T')[0]
  const claimed=last===today
  const hoursLeft=claimed?Math.ceil((24-((now-new Date(last))/3600000%24))) :0
  el.innerHTML='<h2 style="text-align:center;margin-bottom:4px"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-star"/></svg> Daily Wild Encounter</h2>'+
    '<p style="text-align:center;color:var(--text-dim);font-size:12px;margin-bottom:8px">A rare Pokémon appears once every 24 hours!</p>'+
    '<div id="dwContent2" style="text-align:center">'+(claimed?
      '<div style="padding:20px"><div style="font-size:40px;margin-bottom:8px"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-check"/></svg></div><div style="font-weight:700">Already claimed today!</div><div style="color:var(--text-dim);font-size:12px;margin-top:4px">Come back in ~'+hoursLeft+'h</div></div>':
      '<div><button class="b-btn b-btn-primary" style="font-size:16px;padding:14px 40px" onclick="dwClaim()"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-star"/></svg> Claim Encounter</button></div>')+'</div>'
}
async function dwClaim(){
  const now=new Date()
  localStorage.setItem('pokeDailyDate',now.toISOString().split('T')[0])
  const isShiny=Math.random()<0.15
  const shinyPool=SHINY_IDS
  const id=isShiny?shinyPool[Math.floor(Math.random()*shinyPool.length)]:randomPkmnId()
  const d=await fetchPkmn(id)
  const lvl=Math.max(10,Math.floor(rand(15,30)))
  const pkmn=makePkmn(d,lvl)
  if(isShiny)pkmn.shiny=true
  const el=document.getElementById('dwContent2')
  el.innerHTML='<div style="padding:16px;background:var(--surface);border-radius:16px;border:2px solid '+(isShiny?'#f7c948':'#4caf50')+';text-align:center;animation:dwReveal 0.5s ease">'+
    (isShiny?'<div style="font-size:11px;color:var(--ctp-yellow);font-weight:700;letter-spacing:2px"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-sparkles"/></svg> SHINY <svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-sparkles"/></svg></div>':'<div style="font-size:11px;color:var(--ctp-green);font-weight:700">RARE ENCOUNTER</div>')+
    '<img src="'+si(id)+'" width="120" height="120" style="image-rendering:pixelated;filter:drop-shadow(0 0 '+(isShiny?'20px rgba(247,201,72,0.6)':'10px rgba(76,175,80,0.3)')+')">'+
    '<div style="font-size:18px;font-weight:700;text-transform:capitalize;margin:8px 0">'+cap(pkmn.name)+'</div>'+
    '<div style="font-size:12px;color:var(--text-dim)">Lv.'+lvl+' · CP '+calcCp(pkmn)+'</div>'+
    '<div style="display:flex;gap:4px;justify-content:center;margin:6px 0">'+pkmn.types.map(t=>'<span class="type-badge type-'+t+'">'+t+'</span>').join('')+'</div>'+
    '<div style="margin-top:12px"><button class="b-btn b-btn-primary" onclick="dwBattle('+id+','+lvl+','+isShiny+')"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-swords"/></svg> Battle & Catch!</button></div>'+
  '</div>'
}
function dwBattle(id,lvl,isShiny){
  if(ch.team.length===0||ch.team.every(p=>p.currentHp<=0)){alert('No Pokémon to battle!');return}
  const d=allPokemon.find(p=>p.id===id)||{id,name:'unknown',types:['normal']}
  const pkmn=makePkmn(d,lvl)
  if(isShiny)pkmn.shiny=true
  ch.battle={opponent:{title:'Daily',name:cap(pkmn.name),class:'DAILY',icon:'<svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-star"/></svg>',rewards:{xp:lvl*20+50,sd:50+lvl*5}},oppTeam:[pkmn],oppIdx:0,playerIdx:0,logs:[]}
  ch.battle.playerMoves=ch.team.map(p=>p.moves.map(m=>({...m,pp:m.pp})))
  ch.wildMode=true;ch.wildBehavior='normal'
  switchTab('battle')
  setTimeout(()=>chStartBattle(),100)
}

// ===== WALLPAPER GENERATOR =====
let wpSelectedId=null,wpSelectedName='',wpImg=null
function wpSetColor(c){
  document.getElementById('wpColorPick').value=c
  document.querySelectorAll('.wp-color-swatch').forEach(s=>s.classList.toggle('active',s.dataset.c===c))
}
function wpSearchPokemon(q){
  const el=document.getElementById('wpSearchResults')
  if(!q||q.length<2){el.style.display='none';return}
  const lc=q.toLowerCase().replace(/[-\s]+/g,'')
  const matches=allPokemon.filter(p=>p.name.includes(lc)).slice(0,8)
  if(!matches.length){el.style.display='none';return}
  el.innerHTML=matches.map(p=>'<div onclick="wpPick('+p.id+',\''+p.name+'\')"><img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'+p.id+'.png"><span style="text-transform:capitalize">'+p.name+'</span></div>').join('')
  el.style.display='block'
}
function wpPick(id,name){
  wpSelectedId=id;wpSelectedName=name
  document.getElementById('wpSearch').value=name
  document.getElementById('wpSearchResults').style.display='none'
  document.getElementById('wpSelected').style.display='block'
  document.getElementById('wpSelectedImg').src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'+id+'.png'
  document.getElementById('wpSelectedName').textContent=name
}
function wpClear(){
  wpSelectedId=null;wpSelectedName='';wpImg=null
  document.getElementById('wpSearch').value=''
  document.getElementById('wpSelected').style.display='none'
  document.getElementById('wpCanvas').style.display='none'
  document.getElementById('wpPlaceholder').style.display='block'
  document.getElementById('wpDownloadArea').style.display='none'
}
function wpGetSpriteUrl(id,style){
  const base='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon'
  if(style==='official')return base+'/other/official-artwork/'+id+'.png'
  if(style==='shiny')return base+'/shiny/'+id+'.png'
  if(style==='dream')return base+'/other/dream-world/'+id+'.svg'
  if(style==='home')return base+'/other/home/'+id+'.png'
  return base+'/'+id+'.png'
}
function wpDrawScene(ctx,W,H,scene){
  function rng(seed){let s=seed;return()=>{s=(s*16807+0)%2147483647;return(s-1)/2147483646}}
  const r=rng(42)
  if(scene==='forest'){
    const sky=ctx.createLinearGradient(0,0,0,H*0.6);sky.addColorStop(0,'#0a2818');sky.addColorStop(0.5,'#1a4a2e');sky.addColorStop(1,'#2d5a3f');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H*0.6)
    for(let i=0;i<3;i++){const mx=r()*W;const my=r()*H*0.3;const mr=r()*40+20;const mg=ctx.createRadialGradient(mx,my,0,mx,my,mr);mg.addColorStop(0,'rgba(120,200,120,0.04)');mg.addColorStop(1,'transparent');ctx.fillStyle=mg;ctx.fillRect(mx-mr,my-mr,mr*2,mr*2)}
    const gnd=ctx.createLinearGradient(0,H*0.55,0,H);gnd.addColorStop(0,'#1a3a1a');gnd.addColorStop(0.5,'#142a14');gnd.addColorStop(1,'#0d1f0d');ctx.fillStyle=gnd;ctx.fillRect(0,H*0.55,W,H*0.45)
    for(let i=0;i<150;i++){ctx.fillStyle='rgba(0,'+Math.floor(100+r()*60)+',0,0.12)';ctx.beginPath();ctx.arc(r()*W,H*0.55+r()*H*0.4,r()*5+1,0,Math.PI*2);ctx.fill()}
    for(let i=0;i<12;i++){const tx=r()*W;const th=H*0.22+r()*H*0.22;const tw=W*0.06+r()*W*0.04;ctx.fillStyle='#2a1a0a';ctx.fillRect(tx-tw*0.12,H*0.6-th*0.1,tw*0.24,th*0.38);ctx.beginPath();ctx.moveTo(tx-tw,H*0.6-th*0.1);ctx.lineTo(tx,H*0.6-th);ctx.lineTo(tx+tw,H*0.6-th*0.1);ctx.fillStyle='rgba(20,'+Math.floor(80+r()*40)+',20,0.85)';ctx.fill();for(let j=0;j<8;j++){const lx=tx+Math.cos(r()*Math.PI*2)*tw*0.6;const ly=H*0.6-th*0.3-r()*th*0.5;const ll=r()*tw*0.3+tw*0.1;const la=r()*Math.PI*0.6-Math.PI*0.3;ctx.beginPath();ctx.ellipse(lx,ly,ll,ll*0.35,la,0,Math.PI*2);ctx.fillStyle='rgba(25,'+Math.floor(100+r()*50)+',25,'+(0.3+r()*0.3)+')';ctx.fill()}}
    for(let i=0;i<8;i++){const fx=r()*W;const fy=r()*H*0.5+H*0.1;ctx.beginPath();ctx.arc(fx,fy,r()*1.5+0.5,0,Math.PI*2);ctx.fillStyle='rgba(255,220,100,'+(0.15+r()*0.2)+')';ctx.fill();ctx.beginPath();ctx.arc(fx,fy,r()*6+2,0,Math.PI*2);ctx.fillStyle='rgba(255,220,100,0.02)';ctx.fill()}
    for(let i=0;i<30;i++){const fx=r()*W;const fy=r()*H*0.55;ctx.beginPath();ctx.arc(fx,fy,r()*3+1,0,Math.PI*2);ctx.fillStyle='rgba(180,60,60,'+(0.2+r()*0.3)+')';ctx.fill()}
  }else if(scene==='cave'){
    const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#06060c');bg.addColorStop(0.3,'#0c0c18');bg.addColorStop(0.6,'#121220');bg.addColorStop(1,'#181828');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H)
    for(let i=0;i<400;i++){const x=r()*W;const y=r()*H;const sz=r()*25+3;ctx.fillStyle='rgba(30,'+Math.floor(25+r()*20)+',40,'+(0.15+r()*0.25)+')';ctx.fillRect(x,y,sz,r()*15+2)}
    for(let i=0;i<20;i++){const x=r()*W;const y=r()*H*0.8;const w=r()*40+10;const h=r()*25+5;ctx.fillStyle='rgba(20,'+Math.floor(18+r()*12)+',28,'+(0.2+r()*0.2)+')';ctx.fillRect(x,y,w,h)}
    const stalH=H*0.08;for(let i=0;i<18;i++){const x=r()*W;const sW=r()*W*0.05+W*0.01;const sH=stalH+r()*stalH*1.2;ctx.beginPath();ctx.moveTo(x-sW,0);ctx.lineTo(x-sW*0.05,0+sH*0.3);ctx.lineTo(x,0+sH);ctx.lineTo(x+sW*0.05,0+sH*0.3);ctx.lineTo(x+sW,0);ctx.fillStyle='rgba(18,18,30,0.9)';ctx.fill();if(r()>0.6){ctx.beginPath();ctx.arc(x,0+sH,r()*2+1,0,Math.PI*2);ctx.fillStyle='rgba(180,220,255,'+(0.15+r()*0.15)+')';ctx.fill()}}
    const stalBH=H*0.06;for(let i=0;i<12;i++){const x=r()*W;const sW=r()*W*0.04+W*0.008;const sH=stalBH+r()*stalBH;ctx.beginPath();ctx.moveTo(x-sW,H);ctx.lineTo(x,H-sH);ctx.lineTo(x+sW,H);ctx.fillStyle='rgba(15,15,25,0.85)';ctx.fill()}
    const gnd=ctx.createLinearGradient(0,H*0.82,0,H);gnd.addColorStop(0,'#141420');gnd.addColorStop(0.5,'#101018');gnd.addColorStop(1,'#080810');ctx.fillStyle=gnd;ctx.fillRect(0,H*0.82,W,H*0.18)
    for(let i=0;i<12;i++){ctx.beginPath();ctx.arc(r()*W,H*0.35+r()*H*0.45,r()*5+1.5,0,Math.PI*2);ctx.fillStyle='rgba(160,130,255,'+(0.12+r()*0.18)+')';ctx.fill();ctx.beginPath();ctx.arc(r()*W,H*0.35+r()*H*0.45,r()*16+5,0,Math.PI*2);ctx.fillStyle='rgba(160,130,255,0.025)';ctx.fill()}
    for(let i=0;i<6;i++){ctx.beginPath();ctx.arc(r()*W,H*0.4+r()*H*0.35,r()*3+1,0,Math.PI*2);ctx.fillStyle='rgba(100,200,180,'+(0.06+r()*0.1)+')';ctx.fill();ctx.beginPath();ctx.arc(r()*W,H*0.4+r()*H*0.35,r()*10+3,0,Math.PI*2);ctx.fillStyle='rgba(100,200,180,0.015)';ctx.fill()}
    for(let i=0;i<5;i++){const px=r()*W;const py=H*0.85+r()*H*0.1;for(let j=0;j<3;j++){ctx.beginPath();ctx.arc(px+r()*15-7,py+r()*10-5,r()*4+1,0,Math.PI*2);ctx.fillStyle='rgba(100,150,200,'+(0.03+r()*0.05)+')';ctx.fill()}}
  }else if(scene==='beach'){
    const sky=ctx.createLinearGradient(0,0,0,H*0.55);sky.addColorStop(0,'#1060a0');sky.addColorStop(0.4,'#3098d0');sky.addColorStop(0.7,'#60b8e0');sky.addColorStop(1,'#e8c868');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H*0.55)
    ctx.beginPath();ctx.arc(W*0.8,H*0.1,W*0.055,0,Math.PI*2);ctx.fillStyle='#fff0a0';ctx.fill();ctx.beginPath();ctx.arc(W*0.8,H*0.1,W*0.085,0,Math.PI*2);ctx.fillStyle='rgba(255,240,160,0.15)';ctx.fill();ctx.beginPath();ctx.arc(W*0.8,H*0.1,W*0.14,0,Math.PI*2);ctx.fillStyle='rgba(255,240,160,0.04)';ctx.fill()
    for(let i=0;i<8;i++){const cx=r()*W;const cy=r()*H*0.3;const cr=r()*30+15;ctx.beginPath();ctx.arc(cx,cy,cr,0,Math.PI*2);ctx.fillStyle='rgba(255,255,255,'+(0.03+r()*0.04)+')';ctx.fill()}
    const sea=ctx.createLinearGradient(0,H*0.48,0,H*0.72);sea.addColorStop(0,'#1888c0');sea.addColorStop(0.4,'#2098d0');sea.addColorStop(0.8,'#40b0d8');sea.addColorStop(1,'#60c8e0');ctx.fillStyle=sea;ctx.fillRect(0,H*0.48,W,H*0.24)
    for(let i=0;i<8;i++){ctx.strokeStyle='rgba(255,255,255,'+(0.06+i*0.018)+')';ctx.lineWidth=1.2;ctx.beginPath();for(let x=0;x<W;x+=3){const y=H*0.5+i*H*0.022+Math.sin(x*0.007+i*1.3)*5+Math.sin(x*0.015+i*0.8)*2;x===0?ctx.moveTo(x,y):ctx.lineTo(x,y)}ctx.stroke()}
    for(let i=0;i<3;i++){const sx=W*0.1+r()*W*0.3;ctx.beginPath();ctx.moveTo(sx,H*0.52);ctx.bezierCurveTo(sx+W*0.05,H*0.5,sx+W*0.08,H*0.52,sx+W*0.12,H*0.51);ctx.strokeStyle='rgba(255,255,255,0.06)';ctx.lineWidth=0.8;ctx.stroke()}
    const sand=ctx.createLinearGradient(0,H*0.68,0,H);sand.addColorStop(0,'#e8c868');sand.addColorStop(0.3,'#e0c060');sand.addColorStop(0.7,'#d8b050');sand.addColorStop(1,'#d0a040');ctx.fillStyle=sand;ctx.fillRect(0,H*0.68,W,H*0.32)
    for(let i=0;i<8;i++){ctx.beginPath();ctx.moveTo(0,H*0.68+i*H*0.015);ctx.bezierCurveTo(W*0.3,H*0.675+i*H*0.015,W*0.6,H*0.685+i*H*0.015,W,H*0.678+i*H*0.015);ctx.strokeStyle='rgba(200,170,80,'+(0.08+i*0.02)+')';ctx.lineWidth=1;ctx.stroke()}
    for(let i=0;i<180;i++){ctx.fillStyle='rgba(210,180,90,'+(0.06+r()*0.12)+')';ctx.beginPath();ctx.arc(r()*W,H*0.7+r()*H*0.28,r()*2.5,0,Math.PI*2);ctx.fill()}
    for(let i=0;i<5;i++){const fx=W*0.6+r()*W*0.35;const fy=H*0.72+r()*H*0.15;for(let j=0;j<4;j++){ctx.beginPath();ctx.arc(fx+r()*12-6,fy+r()*10-5,r()*3+1,0,Math.PI*2);ctx.fillStyle='rgba(180,140,60,'+(0.06+r()*0.08)+')';ctx.fill()}}
    for(let i=0;i<3;i++){const sx=W*0.7+r()*W*0.25;const sy=H*0.78+r()*H*0.08;ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(sx+2,sy-12);ctx.strokeStyle='rgba(60,100,40,0.12)';ctx.lineWidth=1;ctx.stroke();ctx.beginPath();ctx.arc(sx+2,sy-14,r()*4+2,0,Math.PI*2);ctx.fillStyle='rgba(60,120,50,'+(0.06+r()*0.08)+')';ctx.fill()}
  }else if(scene==='mountain'){
    const sky=ctx.createLinearGradient(0,0,0,H*0.6);sky.addColorStop(0,'#1a3050');sky.addColorStop(1,'#4a7090');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H*0.6)
    ctx.beginPath();ctx.arc(W*0.85,H*0.1,W*0.04,0,Math.PI*2);ctx.fillStyle='rgba(255,240,200,0.8)';ctx.fill()
    const peaks=[[0.15,0.55,0.35],[0.35,0.5,0.4],[0.6,0.45,0.45],[0.8,0.5,0.35]]
    peaks.forEach(([px,ph,pw])=>{ctx.beginPath();ctx.moveTo((px-pw)*W,H);ctx.lineTo(px*W,H*(1-ph));ctx.lineTo((px+pw)*W,H);ctx.fillStyle='#3a4a5a';ctx.fill()
    ctx.beginPath();ctx.moveTo((px-pw*0.3)*W,H*(1-ph*0.5));ctx.lineTo(px*W,H*(1-ph));ctx.lineTo((px+pw*0.3)*W,H*(1-ph*0.5));ctx.fillStyle='rgba(220,230,240,0.6)';ctx.fill()})
    const gnd=ctx.createLinearGradient(0,H*0.75,0,H);gnd.addColorStop(0,'#3a5a3a');gnd.addColorStop(1,'#1a3020');ctx.fillStyle=gnd;ctx.fillRect(0,H*0.75,W,H*0.25)
  }else if(scene==='volcano'){
    const sky=ctx.createLinearGradient(0,0,0,H*0.6);sky.addColorStop(0,'#0a0505');sky.addColorStop(0.4,'#1a0a0a');sky.addColorStop(1,'#4a1510');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H*0.6)
    for(let i=0;i<60;i++){const px=r()*W;const py=r()*H*0.5;ctx.beginPath();ctx.arc(px,py,r()*3+0.5,0,Math.PI*2);ctx.fillStyle='rgba(255,100,50,'+(0.02+r()*0.04)+')';ctx.fill()}
    ctx.beginPath();ctx.moveTo(W*0.15,H);ctx.lineTo(W*0.25,H*0.35);ctx.lineTo(W*0.38,H*0.2);ctx.lineTo(W*0.45,H*0.28);ctx.lineTo(W*0.48,H*0.26);ctx.lineTo(W*0.52,H*0.26);ctx.lineTo(W*0.55,H*0.28);ctx.lineTo(W*0.62,H*0.2);ctx.lineTo(W*0.75,H*0.35);ctx.lineTo(W*0.85,H);ctx.fillStyle='#2a1515';ctx.fill()
    for(let i=0;i<4;i++){const px=W*0.3+i*W*0.12;const pw=W*0.08;ctx.beginPath();ctx.moveTo(px-pw,H);ctx.lineTo(px,H*0.35+r()*H*0.1);ctx.lineTo(px+pw,H);ctx.fillStyle='rgba(40,20,20,0.6)';ctx.fill()}
    ctx.beginPath();ctx.moveTo(W*0.43,H*0.28);ctx.lineTo(W*0.48,H*0.26);ctx.lineTo(W*0.52,H*0.26);ctx.lineTo(W*0.57,H*0.28);ctx.fillStyle='#ff6030';ctx.fill()
    const glow=ctx.createRadialGradient(W*0.5,H*0.24,0,W*0.5,H*0.24,W*0.15);glow.addColorStop(0,'rgba(255,100,30,0.2)');glow.addColorStop(0.5,'rgba(255,60,10,0.05)');glow.addColorStop(1,'transparent');ctx.fillStyle=glow;ctx.fillRect(0,0,W,H)
    for(let i=0;i<80;i++){const fx=W*0.46+r()*W*0.08;const fy=H*0.26-r()*H*0.2;const fs=r()*6+1;ctx.beginPath();ctx.arc(fx,fy,fs,0,Math.PI*2);ctx.fillStyle='rgba(255,'+Math.floor(50+r()*120)+',0,'+(0.25+r()*0.45)+')';ctx.fill()}
    for(let i=0;i<30;i++){const sx=W*0.3+r()*W*0.4;const sy=H*0.05+r()*H*0.2;ctx.beginPath();ctx.arc(sx,sy,r()*2+0.5,0,Math.PI*2);ctx.fillStyle='rgba(255,200,80,'+(0.1+r()*0.15)+')';ctx.fill()}
    const lava=ctx.createLinearGradient(0,H*0.75,0,H);lava.addColorStop(0,'#2a1515');lava.addColorStop(0.3,'#4a1a10');lava.addColorStop(0.6,'#6a2010');lava.addColorStop(1,'#1a0a0a');ctx.fillStyle=lava;ctx.fillRect(0,H*0.75,W,H*0.25)
    for(let i=0;i<20;i++){const lx=r()*W;const ly=H*0.8+r()*H*0.18;ctx.beginPath();ctx.arc(lx,ly,r()*3+1,0,Math.PI*2);ctx.fillStyle='rgba(255,80,20,'+(0.08+r()*0.12)+')';ctx.fill()}
    for(let i=0;i<3;i++){const rx=W*0.2+r()*W*0.6;const ry=H*0.82+r()*H*0.1;ctx.beginPath();ctx.moveTo(rx,ry);ctx.bezierCurveTo(rx+W*0.03,ry-H*0.02,rx+W*0.06,ry+H*0.01,rx+W*0.08,ry);ctx.strokeStyle='rgba(255,120,30,'+(0.06+r()*0.08)+')';ctx.lineWidth=1.5;ctx.stroke()}
  }else if(scene==='space'){
    ctx.fillStyle='#030308';ctx.fillRect(0,0,W,H)
    for(let i=0;i<500;i++){const sx=r()*W;const sy=r()*H;const sz=r()*2+0.3;const bright=0.2+r()*0.8;ctx.fillStyle='rgba(255,255,255,'+bright+')';ctx.beginPath();ctx.arc(sx,sy,sz,0,Math.PI*2);ctx.fill();if(sz>1.5){ctx.beginPath();ctx.arc(sx,sy,sz+1,0,Math.PI*2);ctx.fillStyle='rgba(200,220,255,0.05)';ctx.fill()}}
    for(let i=0;i<5;i++){const sx=r()*W;const sy=r()*H;ctx.beginPath();ctx.moveTo(sx-3,sy);ctx.lineTo(sx+3,sy);ctx.moveTo(sx,sy-3);ctx.lineTo(sx,sy+3);ctx.strokeStyle='rgba(255,255,255,'+(0.15+r()*0.2)+')';ctx.lineWidth=0.5;ctx.stroke()}
    const neb=ctx.createRadialGradient(W*0.3,H*0.4,0,W*0.3,H*0.4,W*0.35);neb.addColorStop(0,'rgba(100,50,180,0.18)');neb.addColorStop(0.3,'rgba(80,60,200,0.1)');neb.addColorStop(0.6,'rgba(50,100,200,0.05)');neb.addColorStop(1,'transparent');ctx.fillStyle=neb;ctx.fillRect(0,0,W,H)
    const neb2=ctx.createRadialGradient(W*0.75,H*0.25,0,W*0.75,H*0.25,W*0.2);neb2.addColorStop(0,'rgba(200,50,100,0.12)');neb2.addColorStop(0.5,'rgba(180,80,150,0.05)');neb2.addColorStop(1,'transparent');ctx.fillStyle=neb2;ctx.fillRect(0,0,W,H)
    const neb3=ctx.createRadialGradient(W*0.2,H*0.8,0,W*0.2,H*0.8,W*0.18);neb3.addColorStop(0,'rgba(50,150,180,0.08)');neb3.addColorStop(1,'transparent');ctx.fillStyle=neb3;ctx.fillRect(0,0,W,H)
    for(let i=0;i<300;i++){const gx=r()*W;const gy=r()*H;const gs=r()*40+10;ctx.beginPath();ctx.arc(gx,gy,gs,0,Math.PI*2);ctx.fillStyle='rgba(255,255,255,'+(0.002+r()*0.004)+')';ctx.fill()}
    const planetX=W*0.15+r()*W*0.7;const planetY=H*0.15+r()*H*0.7;const planetR=r()*20+8;const pg=ctx.createRadialGradient(planetX-planetR*0.3,planetY-planetR*0.3,0,planetX,planetY,planetR);pg.addColorStop(0,'rgba(180,140,200,0.3)');pg.addColorStop(0.7,'rgba(100,60,140,0.15)');pg.addColorStop(1,'transparent');ctx.fillStyle=pg;ctx.beginPath();ctx.arc(planetX,planetY,planetR,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(planetX,planetY,planetR*0.7,0,Math.PI*2);ctx.fillStyle='rgba(140,100,180,0.08)';ctx.fill()
  }else if(scene==='aurora'){
    const sky=ctx.createLinearGradient(0,0,0,H*0.7);sky.addColorStop(0,'#050520');sky.addColorStop(1,'#101040');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H)
    for(let i=0;i<300;i++){ctx.fillStyle='rgba(255,255,255,'+(0.2+r()*0.6)+')';ctx.beginPath();ctx.arc(r()*W,r()*H*0.5,r()*1.5+0.3,0,Math.PI*2);ctx.fill()}
    for(let i=0;i<8;i++){ctx.beginPath();ctx.moveTo(0,H*0.1+r()*H*0.2);ctx.bezierCurveTo(W*0.25,H*0.05+r()*H*0.15,W*0.5,H*0.1+r()*H*0.25,W,H*0.05+r()*H*0.2);ctx.strokeStyle='rgba('+Math.floor(r()*80)+','+Math.floor(180+r()*75)+','+Math.floor(100+r()*100)+','+(0.06+r()*0.08)+')';ctx.lineWidth=H*0.06+r()*H*0.04;ctx.stroke()}
    const gnd=ctx.createLinearGradient(0,H*0.85,0,H);gnd.addColorStop(0,'#0a0a20');gnd.addColorStop(1,'#050510');ctx.fillStyle=gnd;ctx.fillRect(0,H*0.85,W,H*0.15)
  }else if(scene==='city'){
    const sky=ctx.createLinearGradient(0,0,0,H*0.5);sky.addColorStop(0,'#050510');sky.addColorStop(0.5,'#0a0a1a');sky.addColorStop(1,'#151530');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H*0.5)
    for(let i=0;i<8;i++){ctx.fillStyle='rgba(255,255,255,'+(0.1+r()*0.25)+')';ctx.beginPath();ctx.arc(r()*W,r()*H*0.35,r()*1+0.5,0,Math.PI*2);ctx.fill()}
    const moonX=W*0.8;const moonG=ctx.createRadialGradient(moonX,H*0.1,0,moonX,H*0.1,W*0.04);moonG.addColorStop(0,'rgba(200,210,230,0.15)');moonG.addColorStop(1,'transparent');ctx.fillStyle=moonG;ctx.fillRect(moonX-W*0.04,H*0.06,W*0.08,W*0.08)
    ctx.beginPath();ctx.arc(moonX,H*0.1,W*0.015,0,Math.PI*2);ctx.fillStyle='rgba(200,210,230,0.25)';ctx.fill()
    const buildings=[];let bx=0;while(bx<W){const bw=W*0.03+r()*W*0.07;const bh=H*0.15+r()*H*0.35;const style=Math.floor(r()*3);buildings.push([bx,bw,bh,style]);bx+=bw+r()*W*0.003}
    buildings.forEach(([x,w,h,s])=>{const c=Math.floor(12+r()*20);const gc=s===0?'rgb('+c+','+c+','+(c+8)+')':s===1?'rgb('+(c+5)+','+c+','+(c+12)+')':'rgb('+c+','+(c+3)+','+(c+6)+')';ctx.fillStyle=gc;ctx.fillRect(x,H*0.5-h,w,h)
    if(s===2){ctx.fillStyle='rgba('+(c+15)+','+(c+10)+','+(c+20)+',0.3)';ctx.fillRect(x,H*0.5-h,w,3)}
    const winRows=Math.floor(h/14);for(let wy=0;wy<winRows;wy++){const wy2=H*0.5-h+8+wy*14;for(let wx=x+3;wx<x+w-3;wx+=7){if(r()>0.25){const wc=r()>0.7?'rgba(255,220,120,':'rgba(180,200,255,';ctx.fillStyle=wc+(0.1+r()*0.4)+')';ctx.fillRect(wx,wy2,3,5)}}}
    if(w>W*0.04&&r()>0.5){ctx.fillStyle='rgba(255,60,40,0.15)';ctx.beginPath();ctx.arc(x+w/2,H*0.5-h+5,2,0,Math.PI*2);ctx.fill()}})
    const gnd=ctx.createLinearGradient(0,H*0.5,0,H);gnd.addColorStop(0,'#12121e');gnd.addColorStop(0.5,'#0e0e18');gnd.addColorStop(1,'#080810');ctx.fillStyle=gnd;ctx.fillRect(0,H*0.5,W,H*0.5)
    ctx.fillStyle='rgba(80,80,100,0.2)';ctx.fillRect(0,H*0.5,W,2)
    for(let i=0;i<W;i+=W*0.08){ctx.fillStyle='rgba(60,60,80,0.08)';ctx.fillRect(i,H*0.5+8,2,H*0.48)}
    for(let i=0;i<W;i+=W*0.15){ctx.fillStyle='rgba(80,80,100,0.06)';ctx.fillRect(0,H*0.5+H*0.24+i*0.01,W,1)}
  }else if(scene==='ocean'){
    const sky=ctx.createLinearGradient(0,0,0,H*0.32);sky.addColorStop(0,'#061a3a');sky.addColorStop(0.5,'#104878');sky.addColorStop(1,'#2890c8');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H*0.32)
    ctx.beginPath();ctx.arc(W*0.82,H*0.1,W*0.035,0,Math.PI*2);ctx.fillStyle='rgba(255,240,180,0.7)';ctx.fill();ctx.beginPath();ctx.arc(W*0.82,H*0.1,W*0.055,0,Math.PI*2);ctx.fillStyle='rgba(255,240,180,0.1)';ctx.fill()
    for(let i=0;i<12;i++){const cx=r()*W;const cy=r()*H*0.25;ctx.beginPath();ctx.arc(cx,cy,r()*15+5,0,Math.PI*2);ctx.fillStyle='rgba(255,255,255,'+(0.01+r()*0.02)+')';ctx.fill()}
    const sea=ctx.createLinearGradient(0,H*0.28,0,H);sea.addColorStop(0,'#1888c0');sea.addColorStop(0.15,'#1068a0');sea.addColorStop(0.35,'#0c5088');sea.addColorStop(0.55,'#083868');sea.addColorStop(0.8,'#052848');sea.addColorStop(1,'#021020');ctx.fillStyle=sea;ctx.fillRect(0,H*0.28,W,H*0.72)
    for(let i=0;i<8;i++){ctx.strokeStyle='rgba(180,230,255,'+(0.06+i*0.015)+')';ctx.lineWidth=1.2;ctx.beginPath();for(let x=0;x<W;x+=3){const y=H*0.30+i*H*0.018+Math.sin(x*0.005+i*1.8)*8+Math.sin(x*0.012+i*0.7)*3;x===0?ctx.moveTo(x,y):ctx.lineTo(x,y)}ctx.stroke()}
    for(let i=0;i<5;i++){const lx=W*0.1+r()*W*0.8;const ly=H*0.28;ctx.beginPath();ctx.moveTo(lx,ly);ctx.lineTo(lx+r()*W*0.15-W*0.075,ly+H*0.35+r()*H*0.15);ctx.strokeStyle='rgba(80,180,220,'+(0.04+r()*0.06)+')';ctx.lineWidth=r()*3+1;ctx.stroke()}
    const plants=[[0.05,0.12],[0.15,0.18],[0.28,0.08],[0.42,0.15],[0.55,0.1],[0.7,0.14],[0.82,0.11],[0.92,0.16]]
    plants.forEach(([px,ph])=>{const baseX=px*W;const baseY=H;for(let s=0;s<3;s++){ctx.beginPath();ctx.moveTo(baseX+s*6-6,baseY);const cp1x=baseX+Math.sin(r()*2)*20+s*6-6;const cp1y=baseY-H*ph*0.6;const cp2x=baseX+Math.sin(r()*3)*15+s*6-6;const cp2y=baseY-H*ph;ctx.bezierCurveTo(cp1x,cp1y,cp2x,cp2y,baseX+Math.sin(r()*4)*10+s*6-6,baseY-H*ph-r()*10);ctx.strokeStyle='rgba(20,'+Math.floor(100+r()*60)+',40,'+(0.4+r()*0.3)+')';ctx.lineWidth=2+s*0.5;ctx.stroke()}})
    for(let i=0;i<15;i++){const rx=r()*W;const ry=H*0.7+r()*H*0.28;ctx.beginPath();ctx.arc(rx,ry,r()*12+3,0,Math.PI*2);ctx.fillStyle='rgba(30,80,60,'+(0.15+r()*0.2)+')';ctx.fill();for(let j=0;j<4;j++){ctx.beginPath();ctx.arc(rx+r()*10-5,ry+r()*8-4,r()*3+1,0,Math.PI*2);ctx.fillStyle='rgba(40,100,70,'+(0.1+r()*0.15)+')';ctx.fill()}}
    for(let i=0;i<6;i++){const fx=r()*W;const fy=H*0.35+r()*H*0.35;const fs=r()*8+4;ctx.beginPath();ctx.moveTo(fx,fy);ctx.lineTo(fx+fs,fy-fs*0.3);ctx.lineTo(fx+fs*1.3,fy);ctx.lineTo(fx+fs,fy+fs*0.3);ctx.closePath();ctx.fillStyle='rgba('+Math.floor(150+r()*100)+','+Math.floor(150+r()*100)+','+Math.floor(200+r()*55)+','+(0.06+r()*0.08)+')';ctx.fill()}
    for(let i=0;i<40;i++){const bx=r()*W;const by=H*0.5+r()*H*0.45;const bs=r()*2+0.8;ctx.beginPath();ctx.arc(bx,by,bs,0,Math.PI*2);ctx.fillStyle='rgba(150,220,255,'+(0.08+r()*0.12)+')';ctx.fill();ctx.beginPath();ctx.arc(bx,by,bs*1.8,0,Math.PI*2);ctx.fillStyle='rgba(150,220,255,0.02)';ctx.fill()}
    for(let i=0;i<20;i++){const jx=r()*W;const jy=H*0.3+r()*H*0.3;const js=r()*4+2;ctx.beginPath();ctx.ellipse(jx,jy,js,js*0.6,r()*Math.PI,0,Math.PI*2);ctx.fillStyle='rgba(200,120,180,'+(0.03+r()*0.04)+')';ctx.fill()}
    for(let i=0;i<3;i++){const rx=W*0.2+r()*W*0.6;const ry=H*0.6+r()*H*0.2;for(let j=0;j<5;j++){ctx.beginPath();ctx.arc(rx+r()*12-6,ry+r()*10-5,r()*6+2,0,Math.PI*2);ctx.fillStyle='rgba(255,180,50,'+(0.02+r()*0.03)+')';ctx.fill()}}
  }else if(scene==='desert'){
    const sky=ctx.createLinearGradient(0,0,0,H*0.5);sky.addColorStop(0,'#806030');sky.addColorStop(0.4,'#c09050');sky.addColorStop(1,'#e8c878');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H*0.5)
    ctx.beginPath();ctx.arc(W*0.75,H*0.12,W*0.04,0,Math.PI*2);ctx.fillStyle='#fff8d0';ctx.fill();ctx.beginPath();ctx.arc(W*0.75,H*0.12,W*0.07,0,Math.PI*2);ctx.fillStyle='rgba(255,248,208,0.2)';ctx.fill();ctx.beginPath();ctx.arc(W*0.75,H*0.12,W*0.12,0,Math.PI*2);ctx.fillStyle='rgba(255,232,144,0.05)';ctx.fill()
    for(let i=0;i<20;i++){const hx=r()*W;const hy=r()*H*0.45;ctx.beginPath();ctx.arc(hx,hy,r()*1.5+0.3,0,Math.PI*2);ctx.fillStyle='rgba(255,255,255,'+(0.04+r()*0.06)+')';ctx.fill()}
    const dunes=ctx.createLinearGradient(0,H*0.45,0,H);dunes.addColorStop(0,'#d4a040');dunes.addColorStop(0.3,'#c89838');dunes.addColorStop(0.6,'#c08830');dunes.addColorStop(1,'#a07020');ctx.fillStyle=dunes;ctx.fillRect(0,H*0.45,W,H*0.55)
    for(let i=0;i<8;i++){ctx.beginPath();ctx.moveTo(0,H*0.48+i*H*0.03);ctx.bezierCurveTo(W*0.2,H*0.44+i*H*0.04+Math.sin(i)*8,W*0.5,H*0.5+i*H*0.035,W,H*0.47+i*H*0.04);ctx.strokeStyle='rgba(200,160,80,'+(0.06+i*0.02)+')';ctx.lineWidth=2;ctx.stroke()}
    for(let i=0;i<4;i++){const bx=W*0.1+r()*W*0.8;const bh=H*0.03+r()*H*0.06;const bw=W*0.04+r()*W*0.03;ctx.beginPath();ctx.moveTo(bx-bw,H*0.55+r()*H*0.15);ctx.lineTo(bx-bw*0.3,H*0.55+r()*H*0.15-bh);ctx.lineTo(bx+bw*0.3,H*0.55+r()*H*0.15-bh*0.8);ctx.lineTo(bx+bw,H*0.55+r()*H*0.15);ctx.fillStyle='rgba(80,60,30,'+(0.15+r()*0.2)+')';ctx.fill()}
    for(let i=0;i<200;i++){ctx.fillStyle='rgba(180,140,60,'+(0.05+r()*0.1)+')';ctx.beginPath();ctx.arc(r()*W,H*0.5+r()*H*0.45,r()*2,0,Math.PI*2);ctx.fill()}
    for(let i=0;i<3;i++){const sx=W*0.2+r()*W*0.6;ctx.beginPath();ctx.moveTo(sx,H*0.5+r()*H*0.15);ctx.lineTo(sx+r()*W*0.02-r()*W*0.01,H*0.5+r()*H*0.15+r()*H*0.08);ctx.strokeStyle='rgba(160,120,50,0.1)';ctx.lineWidth=0.5;ctx.stroke()}
  }else if(scene==='night'){
    ctx.fillStyle='#030310';ctx.fillRect(0,0,W,H)
    for(let i=0;i=600;i++){const sz=r()*2+0.2;const bright=0.15+r()*0.85;ctx.fillStyle='rgba(255,255,255,'+bright+')';ctx.beginPath();ctx.arc(r()*W,r()*H*0.72,sz,0,Math.PI*2);ctx.fill();if(sz>1.8&&r()>0.7){ctx.beginPath();ctx.moveTo(r()*W-sz*2,r()*H*0.72);ctx.lineTo(r()*W+sz*2,r()*H*0.72);ctx.strokeStyle='rgba(255,255,255,0.08)';ctx.lineWidth=0.3;ctx.stroke()}}
    for(let i=0;i<3;i++){const sx=r()*W;const sy=r()*H*0.6;ctx.beginPath();ctx.arc(sx,sy,r()*4+1,0,Math.PI*2);ctx.fillStyle='rgba(100,150,255,'+(0.02+r()*0.03)+')';ctx.fill()}
    ctx.beginPath();ctx.arc(W*0.8,H*0.12,W*0.08,0,Math.PI*2);const moonG=ctx.createRadialGradient(W*0.8,H*0.12,0,W*0.8,H*0.12,W*0.14);moonG.addColorStop(0,'rgba(240,232,208,0.4)');moonG.addColorStop(0.3,'rgba(240,232,208,0.15)');moonG.addColorStop(0.6,'rgba(200,200,220,0.03)');moonG.addColorStop(1,'transparent');ctx.fillStyle=moonG;ctx.fill()
    ctx.beginPath();ctx.arc(W*0.8,H*0.12,W*0.04,0,Math.PI*2);const moonFace=ctx.createRadialGradient(W*0.79,H*0.11,0,W*0.8,H*0.12,W*0.04);moonFace.addColorStop(0,'#f5ecd0');moonFace.addColorStop(1,'#e0d8b8');ctx.fillStyle=moonFace;ctx.fill()
    ctx.beginPath();ctx.arc(W*0.785,H*0.115,W*0.008,0,Math.PI*2);ctx.fillStyle='rgba(200,190,160,0.3)';ctx.fill();ctx.beginPath();ctx.arc(W*0.81,H*0.125,W*0.006,0,Math.PI*2);ctx.fillStyle='rgba(200,190,160,0.2)';ctx.fill()
    for(let i=0;i<15;i++){const sx=W*0.8+(r()-0.5)*W*0.3;const sy=H*0.12+(r()-0.5)*H*0.1;const ss=r()*8+3;ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(sx+ss*0.3,sy+ss*0.15);ctx.lineTo(sx+ss,sy+ss*0.15);ctx.lineTo(sx+ss*0.4,sy+ss*0.35);ctx.lineTo(sx+ss*0.6,sy+ss*0.6);ctx.lineTo(sx,sy+ss*0.45);ctx.fillStyle='rgba(240,232,208,'+(0.02+r()*0.04)+')';ctx.fill()}
    const gnd=ctx.createLinearGradient(0,H*0.75,0,H);gnd.addColorStop(0,'#080815');gnd.addColorStop(0.5,'#050510');gnd.addColorStop(1,'#030308');ctx.fillStyle=gnd;ctx.fillRect(0,H*0.75,W,H*0.25)
    for(let i=0;i<6;i++){const tx=r()*W;ctx.beginPath();ctx.moveTo(tx,H*0.78+r()*H*0.05);ctx.lineTo(tx-8,H*0.65+r()*H*0.08);ctx.lineTo(tx,H*0.68+r()*H*0.05);ctx.lineTo(tx+8,H*0.65+r()*H*0.08);ctx.closePath();ctx.fillStyle='rgba(10,10,25,0.8)';ctx.fill()}
  }else if(scene==='storm'){
    const sky=ctx.createLinearGradient(0,0,0,H*0.6);sky.addColorStop(0,'#050508');sky.addColorStop(0.3,'#0a0a15');sky.addColorStop(0.6,'#151520');sky.addColorStop(1,'#202030');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H*0.6)
    for(let i=0;i<6;i++){const cx=r()*W;const cy=r()*H*0.4;const cr=r()*60+30;const cg=ctx.createRadialGradient(cx,cy,0,cx,cy,cr);cg.addColorStop(0,'rgba(60,60,100,'+(0.03+r()*0.04)+')');cg.addColorStop(1,'transparent');ctx.fillStyle=cg;ctx.fillRect(cx-cr,cy-cr,cr*2,cr*2)}
    ctx.fillStyle='#101018';ctx.fillRect(0,H*0.55,W,H*0.45)
    for(let i=0;i<4;i++){const lx=W*0.15+r()*W*0.7;const ly=H*0.15+r()*H*0.15;ctx.beginPath();ctx.moveTo(lx,ly);ctx.lineTo(lx+r()*15-7,ly+r()*20);ctx.lineTo(lx+r()*10-5,ly+r()*20);ctx.lineTo(lx+r()*20-10,ly+r()*50);ctx.strokeStyle='rgba(200,200,255,'+(0.15+r()*0.2)+')';ctx.lineWidth=1.5;ctx.stroke();ctx.beginPath();ctx.arc(lx+r()*10-5,ly+r()*20,r()*15+5,0,Math.PI*2);ctx.fillStyle='rgba(180,180,255,'+(0.03+r()*0.04)+')';ctx.fill()}
    for(let i=0;i<2;i++){const lx=W*0.3+r()*W*0.4;ctx.beginPath();ctx.moveTo(lx,H*0.3);ctx.lineTo(lx+r()*30-15,H*0.3+r()*50);ctx.strokeStyle='rgba(180,180,220,0.04)';ctx.lineWidth=r()*30+10;ctx.stroke()}
    for(let i=0;i<300;i++){const rx=r()*W;ctx.beginPath();ctx.moveTo(rx,H*0.6);ctx.lineTo(rx-r()*2,H*0.6+r()*H*0.03);ctx.strokeStyle='rgba(150,160,200,'+(0.02+r()*0.04)+')';ctx.lineWidth=0.5;ctx.stroke()}
  }else if(scene==='cherry'){
    const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#1a0a15');sky.addColorStop(0.5,'#2a1525');sky.addColorStop(1,'#1a1020');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H)
    for(let i=0;i<6;i++){const tx=r()*W;const ty=H*0.3+r()*H*0.3;ctx.beginPath();ctx.moveTo(tx,H);ctx.lineTo(tx-3,ty+H*0.1);ctx.lineTo(tx+3,ty+H*0.1);ctx.strokeStyle='#2a1a10';ctx.lineWidth=4;ctx.stroke()
    for(let j=0;j<30;j++){const px=tx+r()*W*0.2-W*0.1;const py=ty+r()*H*0.15;const ps=r()*6+3;ctx.beginPath();ctx.arc(px,py,ps,0,Math.PI*2);ctx.fillStyle='rgba(255,'+Math.floor(140+r()*80)+','+Math.floor(160+r()*60)+','+(0.25+r()*0.35)+')';ctx.fill()}}
    for(let i=0;i<100;i++){const px=r()*W;const py=r()*H;ctx.beginPath();ctx.arc(px,py,r()*3+1,0,Math.PI*2);ctx.fillStyle='rgba(255,'+Math.floor(150+r()*60)+','+(170+r()*40)+','+(0.1+r()*0.2)+')';ctx.fill()}
    const gnd=ctx.createLinearGradient(0,H*0.8,0,H);gnd.addColorStop(0,'#1a1020');gnd.addColorStop(1,'#0a0810');ctx.fillStyle=gnd;ctx.fillRect(0,H*0.8,W,H*0.2)
  }else if(scene==='tundra'){
    const sky=ctx.createLinearGradient(0,0,0,H*0.5);sky.addColorStop(0,'#3050a0');sky.addColorStop(0.5,'#5080c0');sky.addColorStop(1,'#80a8d0');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H*0.5)
    for(let i=0;i<15;i++){const cx=r()*W;const cy=r()*H*0.4;const cr=r()*50+20;const cg=ctx.createRadialGradient(cx,cy,0,cx,cy,cr);cg.addColorStop(0,'rgba(200,220,240,'+(0.02+r()*0.03)+')');cg.addColorStop(1,'transparent');ctx.fillStyle=cg;ctx.fillRect(cx-cr,cy-cr,cr*2,cr*2)}
    ctx.beginPath();ctx.arc(W*0.2,H*0.12,W*0.03,0,Math.PI*2);ctx.fillStyle='rgba(255,250,240,0.6)';ctx.fill();ctx.beginPath();ctx.arc(W*0.2,H*0.12,W*0.05,0,Math.PI*2);ctx.fillStyle='rgba(255,250,240,0.08)';ctx.fill()
    const gnd=ctx.createLinearGradient(0,H*0.45,0,H);gnd.addColorStop(0,'#d8e0e8');gnd.addColorStop(0.2,'#c8d0e0');gnd.addColorStop(0.5,'#b0bcd0');gnd.addColorStop(0.8,'#98a8c0');gnd.addColorStop(1,'#8098b0');ctx.fillStyle=gnd;ctx.fillRect(0,H*0.45,W,H*0.55)
    for(let i=0;i<8;i++){ctx.beginPath();ctx.moveTo(0,H*0.48+i*H*0.025);ctx.bezierCurveTo(W*0.25,H*0.46+i*H*0.028,W*0.5,H*0.5+i*H*0.022,W,H*0.47+i*H*0.026);ctx.strokeStyle='rgba(255,255,255,'+(0.04+i*0.015)+')';ctx.lineWidth=1.5;ctx.stroke()}
    for(let i=0;i<8;i++){const px=W*0.1+r()*W*0.8;const ph=H*0.06+r()*H*0.12;const pw=W*0.03+r()*W*0.04;ctx.beginPath();ctx.moveTo(px-pw,H*0.5+r()*H*0.1);ctx.lineTo(px,H*0.5+r()*H*0.1-ph);ctx.lineTo(px+pw,H*0.5+r()*H*0.1);ctx.fillStyle='rgba(180,195,215,0.4)';ctx.fill()
    ctx.beginPath();ctx.moveTo(px-pw*0.3,H*0.5+r()*H*0.1-ph*0.4);ctx.lineTo(px,H*0.5+r()*H*0.1-ph);ctx.lineTo(px+pw*0.3,H*0.5+r()*H*0.1-ph*0.4);ctx.fillStyle='rgba(230,240,250,0.35)';ctx.fill()}
    for(let i=0;i<300;i++){ctx.fillStyle='rgba(255,255,255,'+(0.08+r()*0.15)+')';ctx.beginPath();ctx.arc(r()*W,r()*H,r()*2+0.3,0,Math.PI*2);ctx.fill()}
    for(let i=0;i<4;i++){const tx=r()*W;ctx.beginPath();ctx.moveTo(tx,H*0.6+r()*H*0.1);ctx.lineTo(tx-10,H*0.45+r()*H*0.08);ctx.lineTo(tx+3,H*0.47+r()*H*0.08);ctx.lineTo(tx+10,H*0.45+r()*H*0.08);ctx.closePath();ctx.fillStyle='rgba(20,40,20,0.3)';ctx.fill()}
    for(let i=0;i<2;i++){const ix=W*0.3+r()*W*0.4;const iy=H*0.7+r()*H*0.15;ctx.beginPath();ctx.moveTo(ix,iy);ctx.lineTo(ix+4,iy-15);ctx.lineTo(ix+8,iy);ctx.strokeStyle='rgba(140,170,200,0.15)';ctx.lineWidth=1;ctx.stroke()}
  }
}
function wpGenerate(){
  if(!wpSelectedId){alert('Select a Pokémon first!');return}
  const res=document.getElementById('wpResolution').value.split('x').map(Number)
  const W=res[0],H=res[1]
  const canvas=document.getElementById('wpCanvas')
  canvas.width=W;canvas.height=H
  const ctx=canvas.getContext('2d')
  const bg=document.getElementById('wpColorPick').value
  const style=document.getElementById('wpBgStyle').value
  const layout=document.getElementById('wpLayout').value
  const sprite=document.getElementById('wpSprite').value
  const text=document.getElementById('wpText').value
  const textSize=document.getElementById('wpTextSize').value
  const textPos=document.getElementById('wpTextPos').value
  function hexToRgb(h){const r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16);return{r,g,b}}
  const rgb=hexToRgb(bg)
  if(style.startsWith('scene_')){
    wpDrawScene(ctx,W,H,style.replace('scene_',''))
  }else if(style==='gradient'){
    const grd=ctx.createLinearGradient(0,0,W,H)
    grd.addColorStop(0,bg)
    grd.addColorStop(1,'rgb('+Math.min(255,rgb.r+40)+','+Math.min(255,rgb.g+40)+','+Math.min(255,rgb.b+60)+')')
    ctx.fillStyle=grd
  }else if(style==='radial'){
    const grd=ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,Math.max(W,H)*0.7)
    grd.addColorStop(0,'rgb('+Math.min(255,rgb.r+50)+','+Math.min(255,rgb.g+50)+','+Math.min(255,rgb.b+70)+')')
    grd.addColorStop(1,bg)
    ctx.fillStyle=grd
  }else if(style==='neon'){
    ctx.fillStyle=bg
    const grd=ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,W*0.5)
    grd.addColorStop(0,'rgba(0,200,255,0.15)')
    grd.addColorStop(0.5,'rgba(255,0,200,0.08)')
    grd.addColorStop(1,'transparent')
    ctx.fillRect(0,0,W,H)
    ctx.fillStyle=grd
  }else if(style==='pattern'){
    ctx.fillStyle=bg
    ctx.fillRect(0,0,W,H)
    ctx.fillStyle='rgba(255,255,255,0.03)'
    for(let y=0;y<H;y+=60)for(let x=0;x<W;x+=60){ctx.beginPath();ctx.arc(x+30,y+30,4,0,Math.PI*2);ctx.fill()}
  }else if(style==='dark'){
    ctx.fillStyle=bg
  }else{
    ctx.fillStyle=bg
  }
  if(!style.startsWith('scene_'))ctx.fillRect(0,0,W,H)
  const img=new Image()
  img.crossOrigin='anonymous'
  img.onload=function(){
    let sx,sy,sw,sh
    const aspect=img.width/img.height
    const advSize=+(document.getElementById('wpSize').value||100)/100
    const advRot=+(document.getElementById('wpRotation').value||0)
    const advOp=+(document.getElementById('wpOpacity').value||100)/100
    const advFlip=document.getElementById('wpFlip').checked
    const advShadow=document.getElementById('wpShadow').checked
    const advBri=+(document.getElementById('wpBrightness').value||100)
    const advVig=+(document.getElementById('wpVignette').value||0)/100
    const advGrain=+(document.getElementById('wpGrain').value||0)/100
    const advBorder=document.getElementById('wpBorder').value||'none'
    const advTint=document.getElementById('wpTint').value
    const advFont=document.getElementById('wpFont').value||'sans'
    const fontMap={sans:'"Segoe UI",system-ui,sans-serif',serif:'Georgia,Times,serif',mono:'"Courier New",monospace',pixel:'"Courier New",monospace'}
    if(layout==='center'){
      const maxH=H*0.65;const maxW=W*0.6
      if(aspect>maxW/maxH){sw=maxW;sh=sw/aspect}else{sh=maxH;sw=sh*aspect}
      sw*=advSize;sh*=advSize
      sx=(W-sw)/2;sy=(H-sh)/2
      if(text&&textPos==='top')sy=H*0.22-sh/2
      if(text&&textPos==='bottom')sy=H*0.15
      ctx.save()
      ctx.globalAlpha=advOp
      ctx.translate(sx+sw/2,sy+sh/2)
      ctx.rotate(advRot*Math.PI/180)
      if(advFlip)ctx.scale(-1,1)
      if(advShadow){ctx.shadowColor='rgba(0,0,0,0.6)';ctx.shadowBlur=20;ctx.shadowOffsetX=8;ctx.shadowOffsetY=8}
      if(advBri!==100)ctx.filter='brightness('+advBri/100+')'
      ctx.drawImage(img,-sw/2,-sh/2,sw,sh)
      ctx.restore()
      if(style==='neon'){ctx.save();ctx.globalAlpha=advOp*0.6;ctx.translate(sx+sw/2,sy+sh/2);ctx.rotate(advRot*Math.PI/180);if(advFlip)ctx.scale(-1,1);ctx.shadowColor='rgba(0,200,255,0.6)';ctx.shadowBlur=60;ctx.filter='brightness('+advBri/100+')';ctx.drawImage(img,-sw/2,-sh/2,sw,sh);ctx.restore()}
    }else if(layout==='bottom'){
      sw=img.width;sh=img.height
      const scale=Math.min(W*0.5/sw,H*0.5/sh)*advSize
      sw*=scale;sh*=scale
      sx=(W-sw)/2;sy=H-sh-H*0.08
      ctx.save();ctx.globalAlpha=advOp;ctx.translate(sx+sw/2,sy+sh/2);ctx.rotate(advRot*Math.PI/180);if(advFlip)ctx.scale(-1,1);if(advShadow){ctx.shadowColor='rgba(0,0,0,0.6)';ctx.shadowBlur=20;ctx.shadowOffsetX=8;ctx.shadowOffsetY=8}if(advBri!==100)ctx.filter='brightness('+advBri/100+')';ctx.drawImage(img,-sw/2,-sh/2,sw,sh);ctx.restore()
    }else if(layout==='corner'){
      sw=img.width;sh=img.height
      const scale=Math.min(W*0.35/sw,H*0.35/sh)*advSize
      sw*=scale;sh*=scale
      sx=W-sw-W*0.05;sy=H-sh-H*0.05
      ctx.save();ctx.globalAlpha=advOp;ctx.translate(sx+sw/2,sy+sh/2);ctx.rotate(advRot*Math.PI/180);if(advFlip)ctx.scale(-1,1);if(advShadow){ctx.shadowColor='rgba(0,0,0,0.6)';ctx.shadowBlur=20;ctx.shadowOffsetX=8;ctx.shadowOffsetY=8}if(advBri!==100)ctx.filter='brightness('+advBri/100+')';ctx.drawImage(img,-sw/2,-sh/2,sw,sh);ctx.restore()
    }else if(layout==='tiled'){
      const tileW=Math.min(160,W/5);const tileH=tileW*(img.height/img.width)
      ctx.save();ctx.globalAlpha=0.15*advOp;if(advBri!==100)ctx.filter='brightness('+advBri/100+')'
      for(let y=-tileH;y<H+tileH;y+=tileH*1.5){for(let x=0;x<W;x+=tileW*1.3){const ox=x+((y/tileH)%2===0?0:tileW*0.65);ctx.drawImage(img,ox,y,tileW,tileH)}}
      ctx.restore()
      const big=Math.min(W*0.4,H*0.5)*advSize;const bh=big*(img.height/img.width)
      ctx.save();ctx.globalAlpha=advOp;ctx.translate(W/2,H/2);ctx.rotate(advRot*Math.PI/180);if(advFlip)ctx.scale(-1,1);if(advShadow){ctx.shadowColor='rgba(0,0,0,0.6)';ctx.shadowBlur=20;ctx.shadowOffsetX=8;ctx.shadowOffsetY=8}if(advBri!==100)ctx.filter='brightness('+advBri/100+')';ctx.drawImage(img,-big/2,-bh/2,big,bh);ctx.restore()
    }else if(layout==='silhouette'){
      const silW=W*0.9;const silH=silW*(img.height/img.width)
      ctx.save();ctx.globalAlpha=0.08*advOp;ctx.drawImage(img,(W-silW)/2,(H-silH)/2,silW,silH);ctx.restore()
      const fW=W*0.35*advSize;const fH=fW*(img.height/img.width)
      ctx.save();ctx.globalAlpha=advOp;ctx.translate(W/2,H/2);ctx.rotate(advRot*Math.PI/180);if(advFlip)ctx.scale(-1,1);if(advShadow){ctx.shadowColor='rgba(0,0,0,0.6)';ctx.shadowBlur=20;ctx.shadowOffsetX=8;ctx.shadowOffsetY=8}if(advBri!==100)ctx.filter='brightness('+advBri/100+')';ctx.drawImage(img,-fW/2,-fH/2,fW,fH);ctx.restore()
    }
    if(advGrain>0){ctx.save();ctx.globalAlpha=advGrain*0.4;const id=ctx.createImageData(W,H);for(let i=0;i<id.data.length;i+=4){const n=Math.random()*255;id.data[i]=n;id.data[i+1]=n;id.data[i+2]=n;id.data[i+3]=255}ctx.putImageData(id,0,0);ctx.restore()}
    if(advVig>0){ctx.save();const grd=ctx.createRadialGradient(W/2,H/2,W*0.2,W/2,H/2,W*0.75);grd.addColorStop(0,'transparent');grd.addColorStop(1,'rgba(0,0,0,'+advVig+')');ctx.fillStyle=grd;ctx.fillRect(0,0,W,H);ctx.restore()}
    if(advTint&&advTint!=='#000000'){ctx.save();ctx.globalAlpha=0.12;ctx.fillStyle=advTint;ctx.fillRect(0,0,W,H);ctx.restore()}
    if(advBorder!=='none'){ctx.save();ctx.strokeStyle='rgba(255,255,255,0.8)';ctx.fillStyle='rgba(255,255,255,0.8)';if(advBorder==='thin'){ctx.lineWidth=4;ctx.strokeRect(2,2,W-4,H-4)}else if(advBorder==='thick'){ctx.lineWidth=12;ctx.strokeRect(6,6,W-12,H-12)}else if(advBorder==='rounded'){ctx.lineWidth=6;const r=20;if(ctx.roundRect){ctx.beginPath();ctx.roundRect(3,3,W-6,H-6,r);ctx.stroke()}else{ctx.strokeRect(3,3,W-6,H-6)}}else if(advBorder==='polaroid'){const fw=16,fb=50;ctx.fillStyle='rgba(255,255,255,0.95)';ctx.fillRect(0,0,W,H);ctx.clearRect(fw,fw,W-fw*2,H-fw-fb);ctx.fillStyle='rgba(245,245,245,1)';ctx.fillRect(0,H-fw-fb,W,fb)}ctx.restore()}
    if(text){
      const sizeMap={small:Math.round(W*0.025),medium:Math.round(W*0.04),large:Math.round(W*0.06),huge:Math.round(W*0.09)}
      const fontSize=sizeMap[textSize]||sizeMap.medium
      ctx.font='bold '+fontSize+'px '+fontMap[advFont]
      ctx.textAlign='center'
      ctx.fillStyle='rgba(0,0,0,0.5)'
      const ty=textPos==='top'?fontSize+H*0.06:H-H*0.04
      ctx.fillText(text,W/2+2,ty+2)
      ctx.fillStyle='#fff'
      ctx.fillText(text,W/2,ty)
    }
    if(style==='dark'){
      const grd=ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,W*0.7)
      grd.addColorStop(0,'transparent')
      grd.addColorStop(1,'rgba(0,0,0,0.4)')
      ctx.fillStyle=grd
      ctx.fillRect(0,0,W,H)
    }
    document.getElementById('wpCanvas').style.display='block'
    document.getElementById('wpPlaceholder').style.display='none'
    document.getElementById('wpDownloadArea').style.display='block'
    document.getElementById('wpResInfo').textContent=W+'×'+H+' px'
  }
  img.onerror=function(){
    const fb='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'+wpSelectedId+'.png'
    if(img.src!==fb){img.src=fb}else{alert('Failed to load sprite.')}
  }
  img.src=wpGetSpriteUrl(wpSelectedId,sprite)
}
function wpDownload(){
  const canvas=document.getElementById('wpCanvas')
  const link=document.createElement('a')
  link.download='pokemon_wallpaper_'+(wpSelectedName||'custom')+'.png'
  link.href=canvas.toDataURL('image/png')
  link.click()
}

// ===== POKEMON COMPARE =====
let cmpA=null,cmpB=null
function initCompare(){
  const el=document.getElementById('cmpContent')
  el.innerHTML='<h2 style="text-align:center;margin-bottom:4px"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-shuffle"/></svg> Pokémon Compare</h2>'+
    '<p style="text-align:center;color:var(--text-dim);font-size:12px;margin-bottom:16px">Pick two Pokémon to compare stats side by side</p>'+
    '<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:16px">'+
      '<div style="text-align:center"><input type="text" id="cmpSearchA" placeholder="Pokémon A" autocomplete="off" style="padding:10px 16px;border-radius:12px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-size:14px;width:200px;text-align:center" oninput="cmpSearch(this.value,\'A\')"><div id="cmpResultA"></div></div>'+
      '<div style="text-align:center;font-size:24px;font-weight:800;color:var(--text-muted);align-self:center">VS</div>'+
      '<div style="text-align:center"><input type="text" id="cmpSearchB" placeholder="Pokémon B" autocomplete="off" style="padding:10px 16px;border-radius:12px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-size:14px;width:200px;text-align:center" oninput="cmpSearch(this.value,\'B\')"><div id="cmpResultB"></div></div>'+
    '</div><div id="cmpOutput"></div>'
}
function cmpSearch(q,side){
  if(!q||q.length<2)return
  const matches=allPokemon.filter(p=>p.name.includes(q.toLowerCase())).slice(0,8)
  const el=document.getElementById('cmpResult'+side)
  el.innerHTML=matches.map(p=>'<div style="padding:6px 12px;cursor:pointer;border-radius:8px;background:var(--surface);margin-top:4px;font-size:13px;border:1px solid var(--border-light)" onclick="cmpPick('+p.id+',\''+side+'\')">'+p.name+' #'+p.id+'</div>').join('')
}
async function cmpPick(id,side){
  const el=document.getElementById('cmpResult'+side)
  el.innerHTML='<div class="spinner" style="width:24px;height:24px;margin:8px auto"></div>'
  try{
    const d=await fetchPkmn(id)
    if(side==='A')cmpA=d;else cmpB=d
    el.innerHTML='<div style="padding:6px;font-size:13px;color:var(--ctp-green)">'+d.name+' ✓</div>'
    if(cmpA&&cmpB)cmpRender()
  }catch(e){el.innerHTML='<div style="padding:6px;font-size:12px;color:var(--ctp-red)">Error</div>'}
}
function cmpRender(){
  if(!cmpA||!cmpB)return
  const stats=['hp','attack','defense','spAttack','spDefense','speed']
  const labels=['HP','ATK','DEF','SPA','SPD','SPE']
  const colors=['#f38ba8','#fab387','#f9e2af','#89b4fa','#cba6f7','#a6e3a1']
  let html='<div style="display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap;justify-content:center">'
  ;[cmpA,cmpB].forEach((p,i)=>{
    html+='<div style="flex:1;min-width:250px;max-width:320px;background:var(--surface);border-radius:14px;padding:16px;border:1px solid var(--border);text-align:center">'+
      '<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'+p.id+'.png" width="96" height="96" style="image-rendering:pixelated;margin-bottom:8px" alt="'+p.name+'">'+
      '<h3 style="margin:0 0 4px">'+p.name.charAt(0).toUpperCase()+p.name.slice(1)+' <span style="color:var(--text-muted);font-size:14px">#'+p.id+'</span></h3>'+
      '<div style="margin-bottom:8px">'+p.types.map(t=>'<span style="display:inline-block;padding:2px 10px;border-radius:8px;font-size:11px;font-weight:700;margin:0 2px;background:var(--type-'+t+',var(--surface-hover));color:var(--text)">'+t+'</span>').join('')+'</div>'
    stats.forEach((s,si)=>{
      const v=p.stats[s]||0
      const v2=(i===0?cmpB:cmpA)?.stats[s]||0
      const win=v>v2?'color:var(--ctp-green)':v<v2?'color:var(--ctp-red)':'color:var(--text-dim)'
      html+='<div style="display:flex;align-items:center;gap:6px;margin:4px 0;font-size:12px"><span style="width:32px;font-weight:700;color:var(--text-dim)">'+labels[si]+'</span><div style="flex:1;height:8px;background:var(--surface-hover);border-radius:4px;overflow:hidden"><div style="width:'+Math.min(v/255*100,100)+'%;height:100%;background:'+colors[si]+';border-radius:4px"></div></div><span style="width:28px;text-align:right;font-weight:700;'+win+'">'+v+'</span></div>'
    })
    const total=stats.reduce((s,k)=>s+(p.stats[k]||0),0)
    html+='<div style="margin-top:8px;font-size:13px;font-weight:700;color:var(--ctp-yellow)">Total: '+total+'</div></div>'
  })
  html+='</div>'
  document.getElementById('cmpOutput').innerHTML=html
}

// ===== BATTLE SIMULATOR =====
let simTeamA=[],simTeamB=[],simLog=[],simRunning=false
function initSimulator(){
  const el=document.getElementById('simContent')
  el.innerHTML='<h2 style="text-align:center;margin-bottom:4px"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-swords"/></svg> Battle Simulator</h2>'+
    '<p style="text-align:center;color:var(--text-dim);font-size:12px;margin-bottom:12px">Build two teams and watch them battle!</p>'+
    '<div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-bottom:12px">'+
      '<div style="flex:1;min-width:250px"><div style="font-size:13px;font-weight:700;color:var(--ctp-red);margin-bottom:6px">Team A</div><div id="simSlotsA" style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px"></div>'+
        '<input type="text" id="simSearchA" placeholder="Add Pokémon..." autocomplete="off" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-size:13px" oninput="simSearch(this.value,\'A\')"><div id="simDropA"></div></div>'+
      '<div style="flex:1;min-width:250px"><div style="font-size:13px;font-weight:700;color:var(--ctp-blue);margin-bottom:6px">Team B</div><div id="simSlotsB" style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px"></div>'+
        '<input type="text" id="simSearchB" placeholder="Add Pokémon..." autocomplete="off" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-size:13px" oninput="simSearch(this.value,\'B\')"><div id="simDropB"></div></div>'+
    '</div>'+
    '<div style="text-align:center;margin-bottom:12px"><button class="b-btn b-btn-primary" onclick="simBattle()">⚔ Battle!</button> <button class="b-btn b-btn-secondary" onclick="simRandom()">⚅ Random Teams</button> <button class="b-btn b-btn-secondary sim-sprite-mode" onclick="simSetAnimated(!simAnimated)" style="font-size:12px">'+(simAnimated?'☐ Animated':'☆ Static')+'</button></div>'+
    '<div id="simLog" style="background:var(--surface);border:1px solid var(--border-light);border-radius:12px;padding:12px 16px;max-height:400px;overflow-y:auto;font-size:13px;line-height:1.8"></div>'
  simRenderSlots()
}
function simSearch(q,team){
  if(!q||q.length<1)return
  const matches=allPokemon.filter(p=>p.name.includes(q.toLowerCase())).slice(0,6)
  const el=document.getElementById('simDrop'+team)
  el.innerHTML=matches.map(p=>'<div style="padding:4px 10px;cursor:pointer;border-radius:6px;background:var(--surface);margin-top:2px;font-size:12px;border:1px solid var(--border-light)" onclick="simAdd('+p.id+',\''+team+'\')">'+p.name+'</div>').join('')
}
function simAdd(id,team){
  const arr=team==='A'?simTeamA:simTeamB
  if(arr.length>=6)return
  const p=allPokemon.find(x=>x.id===id)
  if(p&&!arr.find(x=>x.id===id))arr.push({id:p.id,name:p.name})
  simRenderSlots()
}
function simRemove(id,team){
  const arr=team==='A'?simTeamA:simTeamB
  const i=arr.findIndex(x=>x.id===id)
  if(i>=0)arr.splice(i,1)
  simRenderSlots()
}
function simRenderSlots(){
  ;['A','B'].forEach(team=>{
    const arr=team==='A'?simTeamA:simTeamB
    const el=document.getElementById('simSlots'+team)
    el.innerHTML=arr.map(p=>'<div style="padding:4px 8px;border-radius:6px;background:var(--surface);border:1px solid var(--border);font-size:11px;display:flex;align-items:center;gap:4px"><img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'+p.id+'.png" width="20" height="20" style="image-rendering:pixelated">'+p.name+'<span style="cursor:pointer;color:var(--ctp-red);margin-left:2px" onclick="simRemove('+p.id+',\''+team+'\')">×</span></div>').join('')
  })
}
function simRandom(){
  simTeamA=[];simTeamB=[]
  const shuffled=[...allPokemon].sort(()=>Math.random()-0.5)
  for(let i=0;i<6;i++){simTeamA.push({id:shuffled[i].id,name:shuffled[i].name});simTeamB.push({id:shuffled[i+6].id,name:shuffled[i+6].name})}
  simRenderSlots()
}
async function simBattle(){
  if(!simTeamA.length||!simTeamB.length){document.getElementById('simLog').innerHTML='<div style="color:var(--ctp-red)">Add Pokémon to both teams!</div>';return}
  const log=document.getElementById('simLog')
  log.innerHTML='<div style="color:var(--ctp-yellow)">Loading teams...</div>'
  const loadTeam=async arr=>{const d=[];for(const p of arr){try{const data=await fetchPkmn(p.id);d.push({...data,hp:data.stats.hp,maxHp:data.stats.hp,moves:getChMoves(data.types)})}catch(e){}}return d}
  const teamA=await loadTeam(simTeamA)
  const teamB=await loadTeam(simTeamB)
  if(!teamA.length||!teamB.length){log.innerHTML='<div style="color:var(--ctp-red)">Failed to load teams</div>';return}
  let html='<div style="display:flex;gap:16px;justify-content:center;margin-bottom:12px;flex-wrap:wrap"><div style="font-size:12px;color:var(--ctp-blue)">Team A: '+teamA.map(p=>{const sp=simAnimated&&hasAnimated(p.id)?'<img src="'+animatedSprite(p.id)+'" width="20" height="20" class="sprite-animated" style="vertical-align:middle;margin-right:2px">':'';return sp+p.name+' ('+p.types.join('/')+')'}).join(', ')+'</div><div style="font-size:12px;color:var(--ctp-red)">Team B: '+teamB.map(p=>{const sp=simAnimated&&hasAnimated(p.id)?'<img src="'+animatedSprite(p.id)+'" width="20" height="20" class="sprite-animated" style="vertical-align:middle;margin-right:2px">':'';return sp+p.name+' ('+p.types.join('/')+')'}).join(', ')+'</div></div>'
  let aIdx=0,bIdx=0,turn=0
  const pickMove=p=>{const valid=p.moves.filter(m=>m.pp>0);if(!valid.length)return{n:'Struggle',t:'normal',p:50,c:'physical',pp:99};return valid[Math.floor(Math.random()*valid.length)]}
  const calcDmg=(attacker,defender,move)=>{
    const isSpecial=move.c==='special'
    const atkStat=isSpecial?attacker.stats.spAttack:attacker.stats.attack
    const defStat=isSpecial?defender.stats.spDefense:defender.stats.defense
    const stab=attacker.types.includes(move.t)?1.5:1
    const eff=getEffectiveness(move.t,defender.types)
    const power=move.p||40
    return Math.max(1,Math.floor((((atkStat*2/50+2)*power*stab*eff)/(defStat/2+2))*(0.85+Math.random()*0.15)))
  }
  while(aIdx<teamA.length&&bIdx<teamB.length&&turn<200){
    turn++
    const a=teamA[aIdx],b=teamB[bIdx]
    const aFirst=a.stats.speed>=b.stats.speed||(a.stats.speed===b.stats.speed&&Math.random()<0.5)
    const order=aFirst?[[a,b,'a','b']]:[[b,a,'b','a']]
    if(aFirst)order.push([b,a,'b','a']);else order.push([a,b,'a','b'])
    for(const[atk,def,aTeam,dTeam] of order){
      if(atk.hp<=0||def.hp<=0)continue
      const move=pickMove(atk)
      if(move.pp<99)move.pp--
      const dmg=calcDmg(atk,def,move)
      const eff=getEffectiveness(move.t,def.types)
      def.hp-=dmg
      const color=aTeam==='a'?'var(--ctp-blue)':'var(--ctp-red)'
      const effStr=eff>1?' <span style="color:var(--ctp-green)">SE</span>':eff<1?' <span style="color:var(--ctp-red)">NVE</span>':''
      const atkSprite=simAnimated&&hasAnimated(atk.id)?'<img src="'+animatedSprite(atk.id)+'" width="16" height="16" class="sprite-animated" style="vertical-align:middle;margin-right:2px">':''
      const defSprite=simAnimated&&hasAnimated(def.id)?'<img src="'+animatedSprite(def.id)+'" width="16" height="16" class="sprite-animated" style="vertical-align:middle;margin-right:2px">':''
      html+='<div style="color:'+color+';font-size:12px">'+atkSprite+atk.name+' used <span style="color:var(--type-'+move.t+')">'+move.n+'</span> → '+defSprite+def.name+' for '+dmg+' dmg'+effStr+'</div>'
      if(def.hp<=0){
        def.hp=0
        if(dTeam==='b')bIdx++;else aIdx++
        const nextList=dTeam==='b'?teamB:teamA
        const nextIdx=dTeam==='b'?bIdx:aIdx
        html+='<div style="color:var(--ctp-red);font-weight:700;font-size:13px">'+def.name+' fainted! '+(nextIdx<nextList.length?'Go '+nextList[nextIdx].name+'!':'Team '+(dTeam==='b'?'A':'B')+' wins!')+'</div>'
      }
    }
    if(turn%5===0||aIdx>=teamA.length||bIdx>=teamB.length){
      const aS=aIdx<teamA.length?'<span style="color:var(--ctp-blue)">'+a.name+'</span> '+Math.max(0,a.hp)+'/'+a.maxHp:''
      const bS=bIdx<teamB.length?'<span style="color:var(--ctp-red)">'+b.name+'</span> '+Math.max(0,b.hp)+'/'+b.maxHp:''
      html+='<div style="color:var(--text-dim);font-size:11px;border-top:1px dashed var(--border);margin:2px 0;padding-top:2px">Turn '+turn+' — '+aS+' vs '+bS+'</div>'
    }
  }
  const winner=aIdx<teamA.length?'Team A':'Team B'
  html+='<div style="font-weight:700;font-size:16px;margin-top:12px;color:var(--ctp-yellow)">♔ '+winner+' wins in '+turn+' turns!</div>'
  html+='<div style="margin-top:8px;font-size:12px;color:var(--ctp-blue)">Team A — '+teamA.map(p=>p.name+': '+Math.max(0,p.hp)+'/'+p.maxHp).join(', ')+'</div>'
  html+='<div style="font-size:12px;color:var(--ctp-red)">Team B — '+teamB.map(p=>p.name+': '+Math.max(0,p.hp)+'/'+p.maxHp).join(', ')+'</div>'
  log.innerHTML=html
  log.scrollTop=log.scrollHeight
  achCheck('simulator')
  dailyCheckProgress('sim5',1)
}

// ===== MOVE TUTOR =====
let mtMoveList=null
let mtCache={}
async function initMoveTutor(){
  const el=document.getElementById('mtContent')
  el.innerHTML='<h2 style="text-align:center;margin-bottom:4px"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-search"/></svg> Move Tutor</h2>'+
    '<p style="text-align:center;color:var(--text-dim);font-size:12px;margin-bottom:12px">Find which Pokémon learn a specific move</p>'+
    '<div style="text-align:center;margin-bottom:12px;position:relative"><input type="text" id="mtSearch" placeholder="Search move name..." autocomplete="off" style="padding:10px 16px;border-radius:12px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-size:14px;width:300px;text-align:center" oninput="mtSearchMove(this.value)" onfocus="mtSearchMove(this.value)" onblur="setTimeout(()=>{const d=document.getElementById(\'mtDrop\');if(d)d.style.display=\'none\'},200)"><div id="mtDrop" style="position:absolute;left:50%;transform:translateX(-50%);width:300px;max-height:200px;overflow-y:auto;background:var(--surface);border:1px solid var(--border);border-radius:8px;display:none;z-index:10;margin-top:4px"></div></div>'+
    '<div id="mtResults" style="text-align:center;color:var(--text-dim);font-size:13px">Type a move name to search</div>'
  if(!mtMoveList){
    try{const d=await fetch('https://pokeapi.co/api/v2/move?limit=1000').then(r=>r.json());mtMoveList=d.results||[]}catch(e){mtMoveList=[]}
  }
}
let mtSearchTimer=null
function mtSearchMove(q){
  clearTimeout(mtSearchTimer)
  const drop=document.getElementById('mtDrop')
  if(!q||q.length<1||!mtMoveList){if(drop)drop.style.display='none';return}
  mtSearchTimer=setTimeout(()=>{
    const ql=q.toLowerCase().replace(/\s+/g,'-')
    const matches=mtMoveList.filter(m=>m.name.startsWith(ql)).slice(0,20)
    if(!matches.length){drop.style.display='none';return}
    drop.innerHTML=matches.map(m=>'<div style="padding:6px 12px;cursor:pointer;font-size:12px;border-bottom:1px solid var(--border-light)" onmousedown="mtPickMove(\''+m.name+'\')">'+m.name.replace(/-/g,' ')+'</div>').join('')
    drop.style.display='block'
  },150)
}
async function mtPickMove(name){
  const drop=document.getElementById('mtDrop');if(drop)drop.style.display='none'
  const input=document.getElementById('mtSearch');if(input)input.value=name.replace(/-/g,' ')
  const el=document.getElementById('mtResults')
  el.innerHTML='<div class="spinner" style="width:24px;height:24px;margin:8px auto"></div>'
  const cacheKey=name
  if(mtCache[cacheKey]){mtRender(name.replace(/-/g,' '),mtCache[cacheKey]);return}
  try{
    const d=await fetch('https://pokeapi.co/api/v2/move/'+name).then(r=>r.json())
    const pokemon=d.learned_by_pokemon||[]
    mtCache[cacheKey]=pokemon
    mtRender(name.replace(/-/g,' '),pokemon)
  }catch(e){el.innerHTML='<div style="color:var(--ctp-red)">Error loading move data</div>'}
}
function mtRender(q,pokemon){
  const el=document.getElementById('mtResults')
  if(!pokemon.length){el.innerHTML='<div style="color:var(--text-dim)">No Pokémon found</div>';return}
  el.innerHTML='<div style="font-size:13px;font-weight:700;color:var(--ctp-yellow);margin-bottom:8px">'+q.charAt(0).toUpperCase()+q.slice(1)+' — '+pokemon.length+' Pokémon</div>'+
    '<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center">'+pokemon.slice(0,50).map(p=>'<div style="display:flex;align-items:center;gap:4px;padding:4px 8px;border-radius:8px;background:var(--surface);border:1px solid var(--border-light);font-size:12px;cursor:pointer" onclick="fetchAndShowPkmn('+p.url.split('/').filter(Number).pop()+')"><img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'+p.url.split('/').filter(Number).pop()+'.png" width="20" height="20" style="image-rendering:pixelated">'+p.name+'</div>').join('')+'</div>'
}

// ===== DAMAGE CALCULATOR =====
let dmgAtk=null,dmgDef=null
const TYPE_CHART={normal:{rock:0.5,ghost:0,steel:0.5},fire:{fire:0.5,water:0.5,grass:2,ice:2,bug:2,rock:0.5,dragon:0.5,steel:2},water:{fire:2,water:0.5,grass:0.5,ground:2,rock:2,dragon:0.5},electric:{water:2,electric:0.5,grass:0.5,ground:0,flying:2,dragon:0.5},grass:{fire:0.5,water:2,grass:0.5,poison:0.5,ground:2,flying:0.5,bug:0.5,rock:2,dragon:0.5,steel:0.5},ice:{fire:0.5,water:0.5,grass:2,ice:0.5,ground:2,flying:2,dragon:2,steel:0.5},fighting:{normal:2,ice:2,poison:0.5,flying:0.5,psychic:0.5,bug:0.5,rock:2,ghost:0,dragon:0,steel:2,fairy:0.5},poison:{grass:2,poison:0.5,ground:0.5,rock:0.5,ghost:0.5,steel:0,fairy:2},ground:{fire:2,electric:2,grass:0.5,poison:2,flying:0,bug:0.5,rock:2,steel:2},flying:{electric:0.5,grass:2,fighting:2,bug:2,rock:0.5,steel:0.5},psychic:{fighting:2,poison:2,psychic:0.5,steel:0.5,dark:0},bug:{fire:0.5,grass:2,fighting:0.5,poison:0.5,flying:0.5,psychic:2,ghost:0.5,dragon:0.5,steel:0.5,fairy:0.5},rock:{fire:2,ice:2,fighting:0.5,ground:0.5,flying:2,bug:2,steel:0.5},ghost:{normal:0,psychic:2,ghost:2,dark:0.5,steel:0.5},dragon:{dragon:2,steel:0.5,fairy:0},dark:{fighting:0.5,psychic:2,ghost:2,dark:0.5,fairy:0.5},steel:{fire:0.5,water:0.5,electric:0.5,ice:2,rock:2,steel:0.5,fairy:2},fairy:{fire:0.5,poison:0.5,dragon:2,fighting:2,dark:2,steel:0.5}}
function getEffectiveness(moveType,defTypes){let m=1;defTypes.forEach(t=>{if(TYPE_CHART[moveType]&&TYPE_CHART[moveType][t]!==undefined)m*=TYPE_CHART[moveType][t]});return m}
function initDmgCalc(){
  const el=document.getElementById('dmgContent')
  el.innerHTML='<h2 style="text-align:center;margin-bottom:4px"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-zap"/></svg> Damage Calculator</h2>'+
    '<p style="text-align:center;color:var(--text-dim);font-size:12px;margin-bottom:12px">Calculate move damage between two Pokémon</p>'+
    '<div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-bottom:12px">'+
      '<div style="text-align:center"><div style="font-size:12px;font-weight:700;color:var(--ctp-red);margin-bottom:4px">Attacker</div><input type="text" id="dmgAtkSearch" placeholder="Attacker" autocomplete="off" style="padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-size:13px;width:180px;text-align:center" oninput="dmgSearch(this.value,\'atk\')"><div id="dmgAtkDrop"></div><div id="dmgAtkInfo"></div></div>'+
      '<div style="text-align:center"><div style="font-size:12px;font-weight:700;color:var(--ctp-blue);margin-bottom:4px">Defender</div><input type="text" id="dmgDefSearch" placeholder="Defender" autocomplete="off" style="padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-size:13px;width:180px;text-align:center" oninput="dmgSearch(this.value,\'def\')"><div id="dmgDefDrop"></div><div id="dmgDefInfo"></div></div>'+
    '</div>'+
    '<div style="text-align:center;margin-bottom:12px"><select id="dmgType" style="padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-size:13px">'+TYPES_LIST.map(t=>'<option value="'+t+'">'+t+'</option>').join('')+'</select> <select id="dmgCat" style="padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-size:13px"><option value="physical">Physical</option><option value="special">Special</option></select> <button class="b-btn b-btn-primary" onclick="dmgCalc()" style="padding:8px 20px">Calculate</button></div>'+
    '<div id="dmgResult" style="text-align:center"></div>'+
    '<div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center"><div id="ivAtkSliders" style="flex:1;min-width:280px;max-width:400px"></div><div id="ivDefSliders" style="flex:1;min-width:280px;max-width:400px"></div></div>'
}
function dmgSearch(q,side){
  if(!q||q.length<1)return
  const matches=allPokemon.filter(p=>p.name.includes(q.toLowerCase())).slice(0,6)
  const el=document.getElementById('dmg'+(side==='atk'?'Atk':'Def')+'Drop')
  el.innerHTML=matches.map(p=>'<div style="padding:4px 10px;cursor:pointer;border-radius:6px;background:var(--surface);margin-top:2px;font-size:12px;border:1px solid var(--border-light)" onclick="dmgPick('+p.id+',\''+side+'\')">'+p.name+'</div>').join('')
}
async function dmgPick(id,side){
  const el=document.getElementById('dmg'+(side==='atk'?'Atk':'Def')+'Drop')
  el.innerHTML=''
  try{
    const d=await fetchPkmn(id)
    if(side==='atk')dmgAtk=d;else dmgDef=d
    const info=document.getElementById('dmg'+(side==='atk'?'Atk':'Def')+'Info')
    info.innerHTML='<div style="margin-top:4px"><img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'+d.id+'.png" width="48" height="48" style="image-rendering:pixelated"><div style="font-size:12px;font-weight:700">'+d.name+'</div><div style="font-size:11px;color:var(--text-dim)">'+d.types.join('/')+'</div></div>'
    const sliderEl=document.getElementById(side==='atk'?'ivAtkSliders':'ivDefSliders')
    if(sliderEl)sliderEl.innerHTML=ivRenderSliders(side)
  }catch(e){}
}
function dmgCalc(){
  if(!dmgAtk||!dmgDef){document.getElementById('dmgResult').innerHTML='<div style="color:var(--ctp-red)">Pick both Pokémon!</div>';return}
  const moveType=document.getElementById('dmgType').value
  const cat=document.getElementById('dmgCat').value
  const atkStat=cat==='physical'?dmgAtk.stats.attack:dmgAtk.stats.spAttack
  const defStat=cat==='physical'?dmgDef.stats.defense:dmgDef.stats.spDefense
  const stab=dmgAtk.types.includes(moveType)?1.5:1
  const eff=getEffectiveness(moveType,dmgDef.types)
  const baseDmg=Math.max(1,Math.floor(((atkStat*2/50+2)*80*stab*eff)/defStat/50+2))
  const minDmg=Math.max(1,Math.floor(baseDmg*0.85))
  const maxDmg=Math.floor(baseDmg*1.15)
  const pct=Math.floor(baseDmg/dmgDef.stats.hp*100)
  let effText=''
  if(eff>1)effText='<span style="color:var(--ctp-green)">Super Effective! ('+eff+'x)</span>'
  else if(eff<1)effText='<span style="color:var(--ctp-red)">Not Very Effective ('+eff+'x)</span>'
  else effText='<span style="color:var(--text-dim)">Normal (1x)</span>'
  const ko=pct>=100?'<div style="font-size:18px;font-weight:800;color:var(--ctp-yellow);margin-top:8px">✦ OHKO!</div>':pct>=50?'<div style="font-size:14px;font-weight:700;color:var(--ctp-peach);margin-top:4px">2HKO</div>':''
  document.getElementById('dmgResult').innerHTML=
    '<div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px;max-width:400px;margin:0 auto;text-align:center">'+
      '<div style="font-size:13px;color:var(--text-dim);margin-bottom:8px">'+dmgAtk.name+' → '+dmgDef.name+'</div>'+
      '<div style="font-size:11px;margin-bottom:8px">Type: <span style="color:var(--type-'+moveType+')">'+moveType+'</span> · '+cat+' · STAB: '+stab+'x</div>'+
      '<div style="font-size:11px;margin-bottom:8px">'+effText+'</div>'+
      '<div style="font-size:28px;font-weight:800;color:var(--ctp-yellow)">'+baseDmg+'</div>'+
      '<div style="font-size:12px;color:var(--text-dim)">Damage range: '+minDmg+' – '+maxDmg+' ('+pct+'% HP)</div>'+
      ko+'</div>'
}

// ===== ACHIEVEMENTS =====
const ACHIEVEMENTS=[
  {id:'first_pokemon',name:'First Steps',desc:'View your first Pokémon',icon:'♧',check:s=>s.pokemonViewed>=1},
  {id:'view_10',name:'Curious',desc:'View 10 Pokémon',icon:'📖',check:s=>s.pokemonViewed>=10},
  {id:'view_50',name:'Pokédex Scholar',desc:'View 50 Pokémon',icon:'📚',check:s=>s.pokemonViewed>=50},
  {id:'view_100',name:'Professor',desc:'View 100 Pokémon',icon:'🎓',check:s=>s.pokemonViewed>=100},
  {id:'first_battle',name:'Battle Ready',desc:'Win your first battle',icon:'⚔',check:s=>s.battlesWon>=1},
  {id:'win_10',name:'Veteran',desc:'Win 10 battles',icon:'🏅',check:s=>s.battlesWon>=10},
  {id:'win_50',name:'Champion',desc:'Win 50 battles',icon:'♔',check:s=>s.battlesWon>=50},
  {id:'streak_5',name:'Hot Streak',desc:'5 win streak in champion mode',icon:'☀',check:s=>s.maxStreak>=5},
  {id:'streak_10',name:'Unstoppable',desc:'10 win streak',icon:'☆',check:s=>s.maxStreak>=10},
  {id:'first_card',name:'Collector',desc:'Add your first card to collection',icon:'🃏',check:s=>s.cardsCollected>=1},
  {id:'cards_10',name:'Hoarder',desc:'Collect 10 cards',icon:'☊',check:s=>s.cardsCollected>=10},
  {id:'cards_50',name:'Set Builder',desc:'Collect 50 cards',icon:'🏗️',check:s=>s.cardsCollected>=50},
  {id:'wordle_win',name:'Wordsmith',desc:'Win a Wordle game',icon:'📝',check:s=>s.gamesWon.wordle>=1},
  {id:'whosthat_win',name:'Guess Master',desc:'Win Who\'s That Pokémon',icon:'❓',check:s=>s.gamesWon.whosthat>=1},
  {id:'memory_win',name:'Memory King',desc:'Win Memory Match',icon:'🧠',check:s=>s.gamesWon.memory>=1},
  {id:'roll_10',name:'Gambler',desc:'Roll the dice 10 times',icon:'⚅',check:s=>s.rolls>=10},
  {id:'roll_100',name:'Addicted',desc:'Roll 100 times',icon:'⚅',check:s=>s.rolls>=100},
  {id:'ep_1000',name:'EP Farmer',desc:'Earn 1000 EP',icon:'☆',check:s=>s.totalEp>=1000},
  {id:'sim_win',name:'Strategist',desc:'Win a battle simulator',icon:'🤖',check:s=>s.simWins>=1},
  {id:'compare_use',name:'Analyst',desc:'Use the compare tool',icon:'⚖️',check:s=>s.compares>=1},
  {id:'dmg_use',name:'Mathematician',desc:'Use the damage calculator',icon:'🧮',check:s=>s.dmgCalcs>=1},
  {id:'all_gens',name:'Generation Expert',desc:'View Pokémon from all 9 generations',icon:'🌈',check:s=>s.gensViewed>=9},
  {id:'shiny_find',name:'Shiny Hunter',desc:'Find a shiny Pokémon',icon:'★',check:s=>s.shiniesFound>=1},
  {id:'daily_3',name:'Daily Devotion',desc:'Play 3 daily encounters',icon:'📅',check:s=>s.dailies>=3},
]
let achState=JSON.parse(localStorage.getItem('pokeAch')||'{}')
function achSave(){localStorage.setItem('pokeAch',JSON.stringify(achState))}
function achCheck(action){
  const s=getAchStats()
  if(action==='view_pokemon')s.pokemonViewed++
  if(action==='battle_win')s.battlesWon++
  if(action==='card_add')s.cardsCollected++
  if(action==='wordle_win')s.gamesWon.wordle=(s.gamesWon.wordle||0)+1
  if(action==='whosthat_win')s.gamesWon.whosthat=(s.gamesWon.whosthat||0)+1
  if(action==='memory_win')s.gamesWon.memory=(s.gamesWon.memory||0)+1
  if(action==='sim_win')s.simWins=(s.simWins||0)+1
  if(action==='compare')s.compares=(s.compares||0)+1
  if(action==='dmgcalc')s.dmgCalcs=(s.dmgCalcs||0)+1
  if(action==='daily')s.dailies=(s.dailies||0)+1
  localStorage.setItem('pokeAchStats',JSON.stringify(s))
  ACHIEVEMENTS.forEach(a=>{
    if(!achState[a.id]&&a.check(s)){achState[a.id]=Date.now();achSave();showAchToast(a)}
  })
}
function getAchStats(){
  try{return JSON.parse(localStorage.getItem('pokeAchStats')||'{}')}catch(e){}
  return {pokemonViewed:0,battlesWon:0,cardsCollected:0,gamesWon:{},rolls:0,totalEp:0,maxStreak:0,simWins:0,compares:0,dmgCalcs:0,gensViewed:0,shiniesFound:0,dailies:0,
    get battlesWon(){try{const c=JSON.parse(localStorage.getItem('chSave')||'{}');return c.totalWins||0}catch(e){return 0}},
    get maxStreak(){try{const c=JSON.parse(localStorage.getItem('chSave')||'{}');return c.maxStreak||0}catch(e){return 0}}
  }
}
function showAchToast(a){
  const t=document.createElement('div')
  t.style.cssText='position:fixed;bottom:20px;right:20px;padding:12px 20px;border-radius:12px;background:linear-gradient(135deg,var(--ctp-yellow),var(--ctp-peach));color:#1a1a2e;font-weight:700;font-size:14px;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.4);animation:achSlide .5s ease'
  t.innerHTML=a.icon+' Achievement: '+a.name+'!'
  document.body.appendChild(t)
  setTimeout(()=>t.remove(),3000)
}
function initAchievements(){
  const el=document.getElementById('achContent')
  const stats=getAchStats()
  const unlocked=ACHIEVEMENTS.filter(a=>achState[a.id])
  const total=ACHIEVEMENTS.length
  let html='<h2 style="text-align:center;margin-bottom:4px"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-award"/></svg> Achievements</h2>'+
    '<p style="text-align:center;color:var(--text-dim);font-size:12px;margin-bottom:4px">'+unlocked.length+'/'+total+' unlocked</p>'+
    '<div style="width:100%;height:8px;background:var(--surface-hover);border-radius:4px;overflow:hidden;margin-bottom:16px"><div style="width:'+unlocked.length/total*100+'%;height:100%;background:linear-gradient(90deg,var(--ctp-yellow),var(--ctp-peach));border-radius:4px"></div></div>'+
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px">'
  ACHIEVEMENTS.forEach(a=>{
    const got=!!achState[a.id]
    const date=got?new Date(achState[a.id]).toLocaleDateString():''
    html+='<div style="padding:12px;border-radius:12px;border:1px solid '+(got?'var(--ctp-yellow)':'var(--border-light)')+';background:'+(got?'rgba(247,201,72,0.08)':'var(--surface)')+';opacity:'+(got?1:0.5)+'">'+
      '<div style="font-size:24px;margin-bottom:4px">'+a.icon+'</div>'+
      '<div style="font-size:13px;font-weight:700;color:'+(got?'var(--ctp-yellow)':'var(--text-dim)')+'">'+a.name+'</div>'+
      '<div style="font-size:11px;color:var(--text-muted)">'+a.desc+'</div>'+
      (got?'<div style="font-size:10px;color:var(--text-muted);margin-top:4px">'+date+'</div>':'')+
    '</div>'
  })
  html+='</div>'
  el.innerHTML=html
}

// ===== HOME CARDS FOR NEW FEATURES =====
const _homeCardCompare=document.querySelector('.card-sets')
if(_homeCardCompare){
  const grid=document.querySelector('.home-grid')
  if(grid){
    const cards=[
      {cls:'card-compare',tab:'tools',game:'compare',img:'131',name:'Compare',desc:'Compare two Pokémon stats side by side'},
      {cls:'card-simulator',tab:'tools',game:'simulator',img:'94',name:'Simulator',desc:'Build teams and auto-battle!'},
      {cls:'card-movetutor',tab:'tools',game:'movetutor',img:'122',name:'Move Tutor',desc:'Find which Pokémon learn any move'},
      {cls:'card-dmgcalc',tab:'tools',game:'dmgcalc',img:'68',name:'Dmg Calculator',desc:'Calculate type-effective damage'},
    ]
    cards.forEach(c=>{
      const d=document.createElement('div')
      d.className='home-card '+c.cls
      d.onclick=function(){switchTab(c.tab);setTimeout(()=>{if(c.tab==='tools')selectTool(c.game);else selectGame(c.game)},50)}
      d.innerHTML='<div class="icon"><img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'+c.img+'.png" alt="'+c.name+'" width="48" height="48" style="image-rendering:pixelated;filter:drop-shadow(0 2px 8px rgba(247,201,72,0.3))"></div><h3>'+c.name+'</h3><p>'+c.desc+'</p><div class="arrow">→</div>'
      grid.appendChild(d)
    })
  }
}

// PokéClicker moved to clicker.js

// Init username on load
loadUsername()
updateOperatorTab()
init()

// ===== 1. INTERACTIVE TYPE COVERAGE MATRIX =====
function initCoverage(){
  const allTypes=['normal','fire','water','electric','grass','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy']
  const el=document.getElementById('covContent')
  el.innerHTML='<h2 style="text-align:center;margin-bottom:4px"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-grid"/></svg> Type Coverage Matrix</h2>'+
    '<p style="text-align:center;color:var(--text-dim);font-size:12px;margin-bottom:12px">Add your team to see offensive coverage and defensive weaknesses at a glance</p>'+
    '<div style="display:flex;gap:6px;margin-bottom:12px;justify-content:center;flex-wrap:wrap"><input type="text" id="covSearch" placeholder="Add Pokémon..." autocomplete="off" style="padding:8px 14px;border-radius:10px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-size:13px;width:240px" oninput="covSearchPk(this.value)" onkeydown="if(event.key===\'Enter\')covAddFirst()"><datalist id="covDatalist"></datalist></div>'+
    '<div id="covTeam" style="display:flex;gap:6px;justify-content:center;margin-bottom:16px;flex-wrap:wrap"></div>'+
    '<div id="covGrid" style="overflow-x:auto"></div>'+
    '<div id="covSummary" style="max-width:700px;margin:16px auto 0"></div>'
  covRenderTeam()
}
let covTeam=[]
function covSearchPk(q){
  const dl=document.getElementById('covDatalist');if(!dl||q.length<2)return
  dl.innerHTML=allPokemon.filter(p=>p.name.includes(q.toLowerCase())).slice(0,10).map(p=>'<option value="'+p.name+'">').join('')
}
function covAddFirst(){
  const inp=document.getElementById('covSearch');if(!inp)return
  const p=allPokemon.find(x=>x.name===inp.value.toLowerCase())
  if(p)covAdd(p.id)
}
function covAdd(id){
  if(covTeam.length>=6||covTeam.some(p=>p.id===id))return
  const p=allPokemon.find(x=>x.id===id);if(!p)return
  covTeam.push({id:p.id,name:p.name,types:p.types});covRenderTeam();covRenderMatrix()
}
function covRemove(i){covTeam.splice(i,1);covRenderTeam();covRenderMatrix()}
function covRenderTeam(){
  const el=document.getElementById('covTeam');if(!el)return
  el.innerHTML=covTeam.length?covTeam.map((p,i)=>'<div style="display:flex;align-items:center;gap:4px;background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:4px 8px;font-size:12px"><img src="'+si(p.id)+'" width="24" height="24" style="image-rendering:pixelated"><span style="text-transform:capitalize">'+p.name+'</span><span style="cursor:pointer;color:var(--text-muted);margin-left:4px" onclick="covRemove('+i+')">✕</span></div>').join(''):'<span style="color:var(--text-muted);font-size:12px">Add up to 6 Pokémon</span>'
}
function covRenderMatrix(){
  const allTypes=['normal','fire','water','electric','grass','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy']
  const el=document.getElementById('covGrid');if(!el||!covTeam.length){if(el)el.innerHTML='';covRenderSummary();return}
  let html='<div style="display:inline-block;min-width:100%"><table style="border-collapse:collapse;font-size:10px;margin:0 auto"><tr><th style="padding:4px 6px;color:var(--text-dim)">ATK↓ DEF→</th>'
  allTypes.forEach(t=>{html+='<th style="padding:3px 4px;font-size:9px;font-weight:700" class="type-badge type-'+t+'">'+t.slice(0,3)+'</th>'})
  html+='<th style="padding:4px 6px;color:var(--ctp-yellow);font-weight:700">OFF</th></tr>'
  const offCoverage={};allTypes.forEach(t=>offCoverage[t]=0)
  covTeam.forEach(p=>{
    p.types.forEach(atk=>{
      allTypes.forEach(def=>{
        const m=getEffectiveness(atk,[def])
        if(m>1)offCoverage[def]+=m-1
      })
    })
  })
  allTypes.forEach(atk=>{
    html+='<tr><td style="padding:3px 6px;font-weight:700" class="type-badge type-'+atk+'">'+atk.slice(0,3)+'</td>'
    allTypes.forEach(def=>{
      const m=getEffectiveness(atk,[def])
      let bg='var(--surface)',fg='var(--text-dim)',txt='1'
      if(m>1){bg='rgba(76,175,80,0.3)';fg='var(--ctp-green)';txt=m+'x'}
      else if(m<1){bg='rgba(244,67,54,0.2)';fg='var(--ctp-red)';txt=m+'x'}
      else if(m===0){bg='rgba(0,0,0,0.15)';fg='var(--text-muted)';txt='0'}
      html+='<td style="padding:2px 4px;text-align:center;background:'+bg+';color:'+fg+';font-weight:600;font-size:9px;border:1px solid var(--border-light)">'+txt+'</td>'
    })
    const teamCov=covTeam.filter(p=>p.types.includes(atk)).length
    html+='<td style="padding:2px 4px;text-align:center;font-weight:700;color:'+(teamCov>0?'var(--ctp-green)':'var(--text-muted)')+'">'+teamCov+'</td></tr>'
  })
  html+='<tr><td style="padding:3px 6px;font-weight:700;color:var(--ctp-yellow)">DEF</td>'
  allTypes.forEach(def=>{
    let totalMult=0
    covTeam.forEach(p=>{
      let m=1;p.types.forEach(t=>{m*=getEffectiveness(def,[t])})
      if(m>1)totalMult+=m-1
    })
    let bg='var(--surface)',fg='var(--text-dim)',txt=''
    if(totalMult>=2){bg='rgba(244,67,54,0.35)';fg='var(--ctp-red)';txt='⚠'}
    else if(totalMult>=1){bg='rgba(255,152,0,0.2)';fg='var(--ctp-peach)';txt='△'}
    else if(totalMult===0){bg='rgba(76,175,80,0.15)';fg='var(--ctp-green)';txt='✓'}
    else{bg='rgba(76,175,80,0.25)';fg='var(--ctp-green)';txt='✓'}
    html+='<td style="padding:2px 4px;text-align:center;background:'+bg+';color:'+fg+';font-weight:700;font-size:9px;border:1px solid var(--border-light)">'+txt+'</td>'
  })
  html+='<td style="padding:2px 4px"></td></tr></table></div>'
  el.innerHTML=html
  covRenderSummary()
}
function covRenderSummary(){
  const allTypes=['normal','fire','water','electric','grass','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy']
  const el=document.getElementById('covSummary');if(!el)return
  if(!covTeam.length){el.innerHTML='';return}
  const weak=[],resist=[],immune=[],offense=[]
  allTypes.forEach(def=>{
    let totalMult=0
    covTeam.forEach(p=>{let m=1;p.types.forEach(t=>{m*=getEffectiveness(def,[t])});if(m>1)totalMult+=m-1})
    if(totalMult>=2)weak.push({type:def,severity:'danger'})
    else if(totalMult>=1)weak.push({type:def,severity:'warning'})
  })
  allTypes.forEach(atk=>{
    let has=covTeam.some(p=>p.types.includes(atk))
    let se=covTeam.some(p=>p.types.some(pt=>getEffectiveness(pt,[atk])>=2))
    if(!has&&!se)offense.push(atk)
  })
  const typeColors={normal:'#A8A77A',fire:'#EE8130',water:'#6390F0',electric:'#F7D02C',grass:'#7AC74C',ice:'#96D9D6',fighting:'#C22E28',poison:'#A33EA1',ground:'#E2BF65',flying:'#A98FF3',psychic:'#F95587',bug:'#A6B91A',rock:'#B6A136',ghost:'#735797',dragon:'#6F35FC',dark:'#705746',steel:'#B7B7CE',fairy:'#D685AD'}
  let html='<div style="display:flex;gap:16px;flex-wrap:wrap;justify-content:center">'
  if(weak.length){html+='<div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:12px;min-width:200px"><h4 style="font-size:12px;font-weight:700;color:var(--ctp-red);margin-bottom:8px">⚠ Weak To</h4><div style="display:flex;flex-wrap:wrap;gap:4px">'+weak.map(w=>'<span style="padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700;color:#fff;background:'+(typeColors[w.type]||'gray')+'">'+w.type+'</span>').join('')+'</div></div>'}
  if(offense.length){html+='<div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:12px;min-width:200px"><h4 style="font-size:12px;font-weight:700;color:var(--ctp-peach);margin-bottom:8px">🔇 No Coverage</h4><div style="display:flex;flex-wrap:wrap;gap:4px">'+offense.map(t=>'<span style="padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700;color:#fff;background:'+(typeColors[t]||'gray')+'">'+t+'</span>').join('')+'</div></div>'}
  html+='</div>'
  el.innerHTML=html
}

// ===== 2. IV/EV CALCULATOR (enhances Dmg Calc) =====
let ivEvs={atk:{iv:31,ev:0},def:{iv:31,ev:0},spa:{iv:31,ev:0},spd:{iv:31,ev:0},spe:{iv:31,ev:0},hp:{iv:31,ev:0}}
function ivCalcStat(base,iv,ev,level,isHp){
  if(isHp)return Math.floor(((2*base+iv+Math.floor(ev/4))*level/100)+level+10)
  return Math.floor(((2*base+iv+Math.floor(ev/4))*level/100)+5)
}
function ivRenderSliders(side){
  const stats=[{k:'hp',l:'HP'},{k:'atk',l:'ATK'},{k:'def',l:'DEF'},{k:'spa',l:'SPA'},{k:'spd',l:'SPD'},{k:'spe',l:'SPE'}]
  const pkmn=side==='atk'?dmgAtk:dmgDef
  if(!pkmn)return ''
  const key=side
  return '<div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:10px;margin-top:8px">'+
    '<div style="font-size:11px;font-weight:700;color:var(--ctp-mauve);margin-bottom:6px">IV/EV Tuning — '+pkmn.name+'</div>'+
    stats.map(s=>{
      const base=Object.values(pkmn.stats)[stats.indexOf(s)]||50
      const evData=ivEvs[s.k]||{iv:31,ev:0}
      const newStat=ivCalcStat(base,evData.iv,evData.ev,50,s.k==='hp')
      const origStat=ivCalcStat(base,31,0,50,s.k==='hp')
      const diff=newStat-origStat
      const diffStr=diff>0?'<span style="color:var(--ctp-green)">+'+diff+'</span>':diff<0?'<span style="color:var(--ctp-red)">'+diff+'</span>':''
      return '<div style="display:grid;grid-template-columns:40px 36px 1fr 36px 36px 50px;align-items:center;gap:4px;margin-bottom:3px;font-size:10px">'+
        '<span style="font-weight:700;color:var(--text-dim)">'+s.l+'</span>'+
        '<span style="font-family:monospace;color:var(--ctp-blue)">IV:'+evData.iv+'</span>'+
        '<input type="range" min="0" max="31" value="'+evData.iv+'" style="height:4px;accent-color:var(--ctp-blue)" oninput="ivSet(\''+key+'\',\''+s.k+'\',\'iv\',this.value);ivRefresh('+side+')">'+
        '<span style="font-family:monospace;color:var(--ctp-peach)">EV:'+evData.ev+'</span>'+
        '<input type="range" min="0" max="252" step="4" value="'+evData.ev+'" style="height:4px;accent-color:var(--ctp-peach)" oninput="ivSet(\''+key+'\',\''+s.k+'\',\'ev\',this.value);ivRefresh('+side+')">'+
        '<span style="font-weight:700">'+newStat+' '+diffStr+'</span></div>'
    }).join('')+
    '</div>'
}
function ivSet(side,stat,field,val){const k=side==='atk'?'atk':'def';if(!ivEvs[k])ivEvs[k]={};if(!ivEvs[k][stat])ivEvs[k][stat]={iv:31,ev:0};ivEvs[k][stat][field]=parseInt(val)}
function ivRefresh(side){}
function ivInjectIntoDmgCalc(){
  setTimeout(()=>{
    const atkInfo=document.getElementById('dmgAtkInfo');const defInfo=document.getElementById('dmgAtkInfo')
    const ivAtkEl=document.getElementById('ivAtkSliders');const ivDefEl=document.getElementById('ivDefSliders')
    if(ivAtkEl)ivAtkEl.innerHTML=dmgAtk?ivRenderSliders('atk'):''
    if(ivDefEl)ivDefEl.innerHTML=dmgDef?ivRenderSliders('def'):''
  },50)
}

// ===== 3. MOVE POOL FILTER BY TYPING =====
let mpfMoveList=null
let mpfCache={}
async function mpfInit(){
  if(!mpfMoveList){try{const d=await fetch('https://pokeapi.co/api/v2/move?limit=1000').then(r=>r.json());mpfMoveList=d.results||[]}catch(e){mpfMoveList=[]}}
}
async function mpfSearchPokemon(id){
  const el=document.getElementById('mtResults');if(!el)return
  el.innerHTML='<div class="spinner" style="width:24px;height:24px;margin:8px auto"></div>'
  await mpfInit()
  if(mpfCache['p'+id]){mpfRenderMoves(id,mpfCache['p'+id]);return}
  try{
    const d=await fetch('https://pokeapi.co/api/v2/pokemon/'+id).then(r=>r.json())
    const moves=(d.moves||[]).map(m=>({name:m.move.name,url:m.move.url,method:m.version_group_details.map(v=>v.move_learn_method.name)}))
    mpfCache['p'+id]=moves
    mpfRenderMoves(id,moves)
  }catch(e){el.innerHTML='<div style="color:var(--ctp-red)">Error loading moves</div>'}
}
function mpfRenderMoves(id,moves){
  const el=document.getElementById('mtResults');if(!el)return
  const methods=['level-up','machine','egg','tutor']
  const methodLabels={'level-up':'Level Up','machine':'TM/HM','egg':'Egg','tutor':'Tutor'}
  const methodColors={'level-up':'var(--ctp-blue)','machine':'var(--ctp-green)','egg':'var(--ctp-pink)','tutor':'var(--ctp-mauve)'}
  let html='<div style="display:flex;gap:4px;margin-bottom:8px;justify-content:center;flex-wrap:wrap">'
  methods.forEach(m=>{
    const count=moves.filter(mv=>mv.method.includes(m)).length
    html+='<button class="mpf-filter-btn" data-method="'+m+'" onclick="mpfFilter(\''+m+'\')" style="padding:4px 10px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:var(--text);font-size:11px;cursor:pointer">'+methodLabels[m]+' ('+count+')</button>'
  })
  html+='</div><div id="mpfMoveList" style="max-height:300px;overflow-y:auto;text-align:left">'
  html+=mpfBuildList(moves,'')
  html+='</div>'
  el.innerHTML=html
}
function mpfBuildList(moves,filter){
  const filtered=filter?moves.filter(m=>m.method.includes(filter)):moves
  const methodLabels={'level-up':'Lv','machine':'TM','egg':'Egg','tutor':'Tut'}
  const methodColors={'level-up':'var(--ctp-blue)','machine':'var(--ctp-green)','egg':'var(--ctp-pink)','tutor':'var(--ctp-mauve)'}
  return filtered.map(m=>{
    const primary=m.method[0]||'level-up'
    return '<div style="display:flex;align-items:center;gap:6px;padding:4px 8px;border-radius:6px;font-size:12px;border-bottom:1px solid var(--border-light)">'+
      '<span style="padding:1px 5px;border-radius:4px;font-size:9px;font-weight:700;color:#fff;background:'+(methodColors[primary]||'gray')+'">'+methodLabels[primary]+'</span>'+
      '<span style="text-transform:capitalize">'+m.name.replace(/-/g,' ')+'</span>'+
      '<span style="font-size:9px;color:var(--text-muted);margin-left:auto">'+m.method.map(x=>methodLabels[x]||x).join(', ')+'</span></div>'
  }).join('')
}
function mpfFilter(method){
  document.querySelectorAll('.mpf-filter-btn').forEach(b=>b.style.borderColor=b.dataset.method===method?'var(--ctp-mauve)':'var(--border)')
  const cached=Object.values(mpfCache).find(v=>Array.isArray(v))
  if(cached){const el=document.getElementById('mpfMoveList');if(el)el.innerHTML=mpfBuildList(cached,method)}
}

// ===== 4. DYNAMIC CARD ART VARIANTS =====
let tcArtStyle='official'
function tcSetArt(style){
  tcArtStyle=style
  document.querySelectorAll('.tc-art-btn').forEach(b=>b.style.borderColor=b.dataset.style===style?'var(--ctp-yellow)':'var(--border)')
  tcGenerate()
}
function tcGetSprite(id){
  switch(tcArtStyle){
    case 'shiny':return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/'+id+'.png'
    case 'pixel':return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/'+id+'.gif'
    case 'official':default:return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/'+id+'.png'
  }
}
function tcInjectArtToggle(){
  const container=document.getElementById('tcArtToggle')
  if(!container)return
  const styles=[{k:'official',l:'Official Art'},{k:'pixel',l:'Pixel'},{k:'shiny',l:'Shiny'}]
  container.innerHTML='<div style="display:flex;gap:4px;justify-content:center;margin-bottom:8px">'+styles.map(s=>
    '<button class="tc-art-btn" data-style="'+s.k+'" onclick="tcSetArt(\''+s.k+'\')" style="padding:4px 10px;border-radius:8px;border:1px solid '+(tcArtStyle===s.k?'var(--ctp-yellow)':'var(--border)')+';background:var(--surface);color:var(--text);font-size:11px;cursor:pointer">'+s.l+'</button>'
  ).join('')+'</div>'
}

// ===== 5. CUSTOM TEAM THEMES =====
const TC_THEMES={
  fire:{name:'Fire',bg1:'#ff6b35',bg2:'#d63031',accent:'#ffd700'},
  water:{name:'Water',bg1:'#0984e3',bg2:'#0652DD',accent:'#74b9ff'},
  grass:{name:'Grass',bg1:'#00b894',bg2:'#00cec9',accent:'#55efc4'},
  electric:{name:'Electric',bg1:'#fdcb6e',bg2:'#e17055',accent:'#ffeaa7'},
  psychic:{name:'Psychic',bg1:'#a29bfe',bg2:'#6c5ce7',accent:'#dfe6e9'},
  dragon:{name:'Dragon',bg1:'#6c5ce7',bg2:'#2d3436',accent:'#a29bfe'},
  retro:{name:'Retro GB',bg1:'#0f380f',bg2:'#306230',accent:'#8bac0f',text:'#9bbc0f',font:'monospace'},
  cyberpunk:{name:'Cyberpunk',bg1:'#0a0a0a',bg2:'#1a0033',accent:'#ff00ff',text:'#00ffff',glow:true},
  noir:{name:'Noir',bg1:'#1a1a1a',bg2:'#2d2d2d',accent:'#808080',text:'#e0e0e0',vignette:true}
}
function tcSetTheme(theme){
  tcTheme=theme;tcGenerate()
}

// ===== 6. ANIMATED SPRITE SUPPORT =====
function animatedSprite(id){
  return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/'+id+'.gif'
}
function hasAnimated(id){return id<=649}
function simSetAnimated(on){
  document.querySelectorAll('.sim-sprite-mode').forEach(b=>b.style.borderColor=on?'var(--ctp-green)':'var(--border)')
  simAnimated=on
}
let simAnimated=false

// ===== 7. EVOLUTION SIMULATOR/VIEWER =====
const EVO_CHAINS_CACHE={}
async function initEvoTree(){
  const el=document.getElementById('evoContent')
  el.innerHTML='<h2 style="text-align:center;margin-bottom:4px"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-git-branch"/></svg> Evolution Viewer</h2>'+
    '<p style="text-align:center;color:var(--text-dim);font-size:12px;margin-bottom:12px">See how any Pokémon evolves — method, level, item, and more</p>'+
    '<div style="text-align:center;margin-bottom:12px"><input type="text" id="evoSearch" placeholder="Search Pokémon..." autocomplete="off" style="padding:8px 14px;border-radius:10px;border:1px solid var(--border);background:var(--input-bg);color:var(--text);font-size:13px;width:260px" oninput="evoSearchPk(this.value)" onkeydown="if(event.key===\'Enter\')evoPickFirst()"><datalist id="evoDatalist"></datalist></div>'+
    '<div id="evoResult" style="text-align:center;color:var(--text-dim);font-size:13px">Select a Pokémon to view its evolution chain</div>'
}
function evoSearchPk(q){
  const dl=document.getElementById('evoDatalist');if(!dl||q.length<2)return
  dl.innerHTML=allPokemon.filter(p=>p.name.includes(q.toLowerCase())).slice(0,10).map(p=>'<option value="'+p.name+'">').join('')
}
function evoPickFirst(){
  const inp=document.getElementById('evoSearch');if(!inp)return
  const p=allPokemon.find(x=>x.name===inp.value.toLowerCase())
  if(p)evoLoadChain(p.id)
}
async function evoLoadChain(id){
  const el=document.getElementById('evoResult')
  el.innerHTML='<div class="spinner" style="width:24px;height:24px;margin:8px auto"></div>'
  try{
    const d=await fetch('https://pokeapi.co/api/v2/pokemon/'+id).then(r=>r.json())
    const species=await fetch(d.species.url).then(r=>r.json())
    const chainUrl=species.evolution_chain?.url
    if(!chainUrl){el.innerHTML='<div style="color:var(--text-dim)">This Pokémon does not evolve</div>';return}
    const chain=await fetch(chainUrl).then(r=>r.json())
    evoRenderChain(chain)
  }catch(e){el.innerHTML='<div style="color:var(--ctp-red)">Error loading evolution data</div>'}
}
function evoRenderChain(chain){
  const el=document.getElementById('evoResult')
  function getPkmnId(url){return parseInt(url.split('/').filter(Number).pop())}
  function renderNode(node,depth=0){
    const id=getPkmnId(node.species.url)
    const name=node.species.name
    const methods=node.evolution_details||[]
    let methodStr=''
    if(methods.length){
      const m=methods[methods.length-1]
      const parts=[]
      if(m.min_level)parts.push('Lv.'+m.min_level)
      if(m.item)parts.push(m.item.name.replace(/-/g,' '))
      if(m.trigger)parts.push(m.trigger.name.replace(/-/g,' '))
      if(m.min_happiness)parts.push('Friendship ≥'+m.min_happiness)
      if(m.held_item)parts.push('Hold: '+m.held_item.name.replace(/-/g,' '))
      if(m.time_of_day)parts.push(m.time_of_day)
      if(m.location)parts.push(m.location.name.replace(/-/g,' '))
      if(m.needs_overworld_rain)parts.push('Rain')
      if(m.party_species)parts.push('Party: '+m.party_species.name)
      methodStr=parts.join(' · ')
    }
    let html='<div style="display:inline-flex;flex-direction:column;align-items:center;min-width:100px;margin:4px">'+
      (methodStr?'<div style="font-size:9px;color:var(--ctp-peach);margin-bottom:4px;max-width:120px;text-align:center;line-height:1.3">'+methodStr+'</div>':'')+
      '<div style="background:var(--surface);border:2px solid var(--border);border-radius:14px;padding:8px 12px;text-align:center;cursor:pointer" onclick="openDetail('+id+')">'+
      '<img src="'+si(id)+'" width="56" height="56" style="image-rendering:pixelated" onerror="this.style.display=\'none\'">'+
      '<div style="font-size:11px;font-weight:700;text-transform:capitalize;margin-top:2px">'+name+'</div></div></div>'
    if(node.evolves_to&&node.evolves_to.length){
      html+='<div style="display:flex;align-items:center;gap:4px"><div style="font-size:18px;color:var(--text-muted)">→</div><div style="display:flex;gap:8px">'+node.evolves_to.map(e=>renderNode(e,depth+1)).join('')+'</div></div>'
    }
    return html
  }
  el.innerHTML='<div style="overflow-x:auto;padding:16px"><div style="display:inline-flex;align-items:center">'+renderNode(chain.chain)+'</div></div>'
}

// ===== 8. DAILY CHALLENGES =====
const DAILY_KEY='pokeDaily'
function getDailySeed(){
  const d=new Date();return d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate()
}
function getDailyState(){
  try{return JSON.parse(localStorage.getItem(DAILY_KEY)||'{}')}catch(e){return {}}
}
function saveDailyState(s){try{localStorage.setItem(DAILY_KEY,JSON.stringify(s))}catch(e){}}
const DAILY_CHALLENGES=[
  {id:'beat3',name:'Triple Threat',desc:'Win 3 Champions battles',icon:'⚔',reward:150,check:s=>(s.battleWins||0)>=3},
  {id:'streak2',name:'Hot Streak',desc:'Get a 2-win streak in Champions',icon:'☀',reward:100,check:s=>(s.maxStreak||0)>=2},
  {id:'catch1',name:'Gotta Catch One',desc:'Catch a wild Pokémon',icon:'☗',reward:75,check:s=>(s.caught||0)>=1},
  {id:'view10',name:'Curious Researcher',desc:'View 10 Pokémon details',icon:'📖',reward:50,check:s=>(s.viewed||0)>=10},
  {id:'sim5',name:'Sim Commander',desc:'Run 5 simulator battles',icon:'☷',reward:120,check:s=>(s.sims||0)>=5},
  {id:'roll1',name:'Lucky Roll',desc:'Complete 1 Number Roll',icon:'⚅',reward:60,check:s=>(s.rolls||0)>=1},
  {id:'team',name:'Team Builder',desc:'Build a team in Team Builder',icon:'🏗️',reward:40,check:s=>(s.teamBuilt||0)>=1},
  {id:'evo',name:'Evolution Watcher',desc:'View an evolution chain',icon:'🧬',reward:30,check:s=>(s.evoViewed||0)>=1},
  {id:'typequiz3',name:'Type Expert',desc:'Score 3+ in Type Quiz',icon:'🧪',reward:80,check:s=>(s.quizBest||0)>=3},
  {id:'wordle3',name:'Word Master',desc:'Solve Wordle in 3 or fewer',icon:'📝',reward:200,check:s=>(s.wgBest<=3&&s.wgBest>0)}
]
function initDailyChallenges(){
  const seed=getDailySeed()
  const state=getDailyState()
  const today=state.seed===seed?state:{seed,challenges:{},completed:[],earned:0}
  const el=document.getElementById('battleDaily')
  const todayChallenges=DAILY_CHALLENGES.slice(0,3)
  let html='<div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px;margin-bottom:16px">'
  html+='<h3 style="text-align:center;margin-bottom:4px;font-size:15px"><svg class="ico" width="1em" height="1em"><use href="icons.svg#ico-calendar"/></svg> Daily Challenges</h3>'
  html+='<p style="text-align:center;color:var(--text-dim);font-size:11px;margin-bottom:4px">Complete tasks for bonus Stardust! Resets at midnight</p>'
  html+='<div style="text-align:center;font-size:11px;color:var(--text-muted);margin-bottom:10px">'+today.completed.length+'/'+todayChallenges.length+' completed today</div>'
  todayChallenges.forEach(ch=>{
    const done=today.completed.includes(ch.id)
    const progress=today.challenges[ch.id]||0
    const target=parseInt(ch.desc.match(/\d+/)?.[0]||'1')
    const pct=Math.min(100,Math.round(progress/target*100))
    html+='<div style="background:var(--bg-mid,var(--surface-hover));border:1px solid '+(done?'var(--ctp-green)':'var(--border)')+';border-radius:10px;padding:10px 12px;margin-bottom:6px;'+(done?'opacity:0.65':'')+'">' +
      '<div style="display:flex;align-items:center;gap:8px">'+
        '<span style="font-size:20px">'+ch.icon+'</span>'+
        '<div style="flex:1"><div style="font-size:12px;font-weight:700;color:'+(done?'var(--ctp-green)':'var(--text)')+'">'+ch.name+(done?' ✓':'')+'</div>'+
          '<div style="font-size:10px;color:var(--text-dim)">'+ch.desc+'</div>'+
          '<div style="margin-top:3px;height:5px;background:var(--surface-hover);border-radius:3px;overflow:hidden"><div style="height:100%;width:'+pct+'%;background:'+(done?'var(--ctp-green)':'var(--ctp-yellow)')+';border-radius:3px"></div></div>'+
        '</div>'+
        '<div style="font-size:11px;font-weight:700;color:var(--ctp-yellow);white-space:nowrap">+'+ch.reward+' SD</div>'+
      '</div></div>'
  })
  html+='<div style="text-align:center;margin-top:8px;font-size:12px;font-weight:700;color:var(--ctp-yellow)">Today: +'+today.earned+' Stardust</div></div>'
  el.innerHTML=html
  saveDailyState(today)
}
function dailyCheckProgress(key,inc){
  const seed=getDailySeed();const state=getDailyState()
  if(state.seed!==seed)return
  DAILY_CHALLENGES.forEach(ch=>{
    if(state.completed.includes(ch.id))return
    if(!state.challenges)state.challenges={}
    if(key===ch.id){state.challenges[key]=(state.challenges[key]||0)+inc}
  })
  DAILY_CHALLENGES.forEach(ch=>{
    if(state.completed.includes(ch.id))return
    if(!state.challenges)state.challenges={}
    const target=parseInt(ch.desc.match(/\d+/)?.[0]||'1')
    if((state.challenges[ch.id]||0)>=target){
      state.completed.push(ch.id);state.earned=(state.earned||0)+ch.reward
      chRewardStardust(ch.reward)
    }
  })
  saveDailyState(state)
}

// ===== 9. COLLECTION EXPORT/IMPORT =====
function pcExport(){
  const data={cards:{},wallpapers:{},stats:{},username:getUsername()}
  try{
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i)
      if(k.startsWith('pc_'))data.cards[k]=localStorage.getItem(k)
      if(k.startsWith('wp_'))data.wallpapers[k]=localStorage.getItem(k)
      if(k==='pokeStats')data.stats[k]=localStorage.getItem(k)
      if(k==='pokeChampSave')data.saves={...data.saves,[k]:localStorage.getItem(k)}
      if(k==='nrState')data.saves={...data.saves,[k]:localStorage.getItem(k)}
    }
  }catch(e){}
  const json=JSON.stringify(data)
  const b64=btoa(unescape(encodeURIComponent(json)))
  const el=document.getElementById('pcExportData')
  const area=document.getElementById('pcImportArea')
  if(el){el.value=b64;el.style.display='block';el.select()}
  if(area){area.style.display='block'}
  if(navigator.clipboard){navigator.clipboard.writeText(b64).catch(()=>{})}
}
function pcImport(){
  const area=document.getElementById('pcImportArea')
  const val=area?area.value.trim():''
  if(!val){alert('Paste export data into the import box first!');return}
  try{
    const json=decodeURIComponent(escape(atob(val)))
    const data=JSON.parse(json)
    let count=0
    if(data.cards)Object.entries(data.cards).forEach(([k,v])=>{localStorage.setItem(k,v);count++})
    if(data.wallpapers)Object.entries(data.wallpapers).forEach(([k,v])=>{localStorage.setItem(k,v);count++})
    if(data.stats)Object.entries(data.stats).forEach(([k,v])=>{localStorage.setItem(k,v);count++})
    if(data.saves)Object.entries(data.saves).forEach(([k,v])=>{localStorage.setItem(k,v);count++})
    renderCollection()
    alert('Imported '+count+' items successfully!')
  }catch(e){alert('Invalid import data — make sure you pasted the full export string')}
}

// ===== 10. WISHLIST & PRICING ALERTS =====
const WL_KEY='pokeWishlist'
function wlGet(){try{return JSON.parse(localStorage.getItem(WL_KEY)||'[]')}catch(e){return[]}}
function wlSave(d){try{localStorage.setItem(WL_KEY,JSON.stringify(d))}catch(e){}}
function wlToggle(cardId,name,set,price){
  let list=wlGet()
  const idx=list.findIndex(w=>w.cardId===cardId)
  if(idx>=0){list.splice(idx,1)}else{list.push({cardId,name,set,price:price||'N/A',added:Date.now()})}
  wlSave(list);wlRender()
}
function wlRender(){
  const el=document.getElementById('wlList');if(!el)return
  const list=wlGet()
  if(!list.length){el.innerHTML='<div style="text-align:center;color:var(--text-muted);font-size:12px;padding:16px">Your wishlist is empty. Browse cards and tap the ♡ to add!</div>';return}
  el.innerHTML=list.map(w=>'<div style="display:flex;align-items:center;gap:8px;padding:8px;background:var(--surface);border:1px solid var(--border);border-radius:8px;margin-bottom:6px">'+
    '<div style="flex:1"><div style="font-size:12px;font-weight:700">'+w.name+'</div><div style="font-size:10px;color:var(--text-dim)">'+(w.set||'')+'</div></div>'+
    '<div style="font-size:11px;color:var(--ctp-yellow)">'+(w.price||'—')+'</div>'+
    '<span style="cursor:pointer;color:var(--ctp-red);font-size:14px" onclick="wlToggle(\''+w.cardId+'\')">✕</span></div>').join('')
}
function wlBtn(cardId,name,set,price){
  const list=wlGet();const has=list.some(w=>w.cardId===cardId)
  return '<span style="cursor:pointer;font-size:14px;color:'+(has?'var(--ctp-red)':'var(--text-muted)')+'" onclick="wlToggle(\''+cardId+'\',\''+name.replace(/'/g,"\\'")+'\',\''+(set||'').replace(/'/g,"\\'")+'\',\''+(price||'').replace(/'/g,"\\'")+'\')" title="'+(has?'Remove from wishlist':'Add to wishlist')+'">'+(has?'♥':'♡')+'</span>'
}

