const TYPES=['normal','fire','water','electric','grass','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy']
const GEN_LIMITS=[0,151,251,386,493,649,721,809,905,1025]
let allPokemon=[],filteredPokemon=[],pokemonCache={},cardsCache={},loadedCount=0,currentTab='home',allMoves=[],allAbilities=[],moveCache={},abilityCache={}
const PAGE_SIZE=9999
async function init(){
  switchTab('home')
  const res=await fetch('https://pokeapi.co/api/v2/pokemon?limit=100000&offset=0')
  const data=await res.json()
  allPokemon=data.results.map(p=>{
    const match=p.url.match(/\/(\d+)\/$/);return{...p,id:match?parseInt(match[1]):0}
  })
  const sel=document.getElementById('typeFilter')
  TYPES.forEach(t=>{const o=document.createElement('option');o.value=t;o.textContent=t.charAt(0).toUpperCase()+t.slice(1);sel.appendChild(o)})
  filterPokemon()
  document.getElementById('loading').style.display='none'
  document.getElementById('grid').style.display='grid'
  batchLoadTypes()
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
        const res=await fetch('https://pokeapi.co/api/v2/pokemon/'+p.id)
        const data=await res.json()
        p.types=data.types.map(t=>t.type.name)
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
  document.getElementById('detailContent').innerHTML='<div class="loading" style="padding:60px"><div class="spinner"></div></div>'
  document.getElementById('detailModal').classList.add('active')
  document.body.style.overflow='hidden'
  const p=pokemonCache[id]
  if(p){renderDetail(p);rvAdd('pokemon',id,p.name,'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'+id+'.png');return}
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
    renderDetail(pokemonCache[id])
    rvAdd('pokemon',id,data.name,'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'+id+'.png')
  }catch(e){
    document.getElementById('detailContent').innerHTML='<div style="padding:40px;text-align:center;color:rgba(255,255,255,0.5)">Failed to load Pokemon data</div>'
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
      (p.genus?'<div style="font-size:13px;color:rgba(255,255,255,0.4);margin-bottom:8px">'+p.genus+'</div>':'')+
      '<div class="types">'+types.map(t=>'<span class="type-badge type-'+t+'">'+t+'</span>').join('')+'</div>'+
    '</div>'+
    '<div class="modal-body">'+
      '<div class="stats-section">'+
        '<h3>Base Stats <span style="font-weight:400;font-size:12px;color:rgba(255,255,255,0.3)">(Total: '+total+')</span></h3>'+
        stats.map(s=>'<div class="stat-row"><div class="stat-label">'+(l[s.name]||s.name)+'</div><div class="stat-bar-bg"><div class="stat-bar stat-'+s.name+'" style="width:'+Math.min((s.value/255)*100,100)+'%"></div></div><div class="stat-value">'+s.value+'</div></div>').join('')+
      '</div>'+
      '<div class="info-grid">'+
        '<div class="info-item"><div class="label">Height</div><div class="value">'+(p.height/10).toFixed(1)+' m</div></div>'+
        '<div class="info-item"><div class="label">Weight</div><div class="value">'+(p.weight/10).toFixed(1)+' kg</div></div>'+
        '<div class="info-item"><div class="label">Base XP</div><div class="value">'+(p.base_experience||'N/A')+'</div></div>'+
        (p.evolutions&&p.evolutions.length?'<div class="info-item"><div class="label">Evolutions</div><div class="value">'+p.evolutions.map(e=>e.charAt(0).toUpperCase()+e.slice(1)).join(' → ')+'</div></div>':'')+
      '</div>'+
      '<div>'+
        '<h3 style="font-size:16px;font-weight:700;margin-bottom:10px;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:1px">Abilities</h3>'+
        '<div class="abilities-list">'+p.abilities.map(a=>'<span class="ability-tag">'+a.ability.name.replace('-',' ')+(a.is_hidden?'<span class="hidden-ability">(H)</span>':'')+'</span>').join('')+'</div>'+
      '</div>'+
      (p.moves&&p.moves.length?'<div style="margin-top:12px">'+
        '<h3 style="font-size:14px;font-weight:700;margin-bottom:8px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:.5px">Moves <span style="font-weight:400;font-size:11px;color:rgba(255,255,255,0.2)">('+[...new Set(p.moves.map(m=>m.move.name))].length+')</span></h3>'+
        '<div class="abilities-list" style="max-height:220px;overflow-y:auto">'+[...new Set(p.moves.map(m=>m.move.name))].sort().map(m=>'<span class="ability-tag">'+m.replace(/-/g,' ')+'</span>').join('')+'</div>'+
      '</div>':'')+
      '<div class="cards-section">'+
        '<h3>Pokemon Cards &amp; Prices</h3>'+
        '<div id="cardsGrid" class="cards-grid"></div>'+
      '</div>'+
      '<div class="cards-section" id="ownedCardsSection" style="margin-top:12px">'+
        '<h3>Your Cards <span style="font-weight:400;font-size:12px;color:rgba(255,255,255,0.3)">(collection)</span></h3>'+
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
  if(!owned.length){grid.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:16px;color:rgba(255,255,255,0.2);font-size:13px">You don\'t own any '+pokemonName+' cards yet. <span style="color:rgba(255,255,255,0.3);cursor:pointer" onclick="switchTab(\'sets\')">Browse Card Sets →</span></div>';return}
  grid.innerHTML=owned.map(([id,c])=>{
    const priceStr=c.price?'$'+(c.price*c.qty).toFixed(2):''
    return '<div class="card-item" style="cursor:default">'+
      (c.img?'<img src="'+c.img+'" alt="'+c.name+'" loading="lazy" onerror="this.style.display=\'none\'">':'<div style="height:100px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.03);font-size:24px">🃏</div>')+
      '<div class="card-info">'+
        '<div class="card-set">'+(c.setName||'')+'</div>'+
        '<div class="card-name">'+c.name+'</div>'+
        (priceStr?'<div class="card-price" style="color:#4caf50">'+priceStr+'</div>':'')+
        '<div style="font-size:11px;color:rgba(255,255,255,0.3)">×'+c.qty+'</div>'+
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
  currentTab=tab
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
  document.querySelector('.search-container').style.display=tab==='home'||tab==='sets'||tab==='games'||tab==='leaderboard'||tab==='battle'||tab==='operator'||tab==='collection'?'none':'block'
  document.getElementById('pokeFilters').style.display=tab==='pokemon'?'flex':'none'
  document.getElementById('attackFilters').style.display=tab==='attacks'?'flex':'none'
  document.getElementById('abilityFilters').style.display=tab==='abilities'?'flex':'none'
  const inp=document.getElementById('searchInput')
  if(tab==='pokemon')inp.placeholder='Search Pokemon...'
  else if(tab==='attacks')inp.placeholder='Search moves...'
  else if(tab==='abilities')inp.placeholder='Search abilities...'
  inp.value=''
  if(tab==='sets'&&!allSets.length)loadSets()
  if(tab==='attacks'&&!allMoves.length)loadMoves()
  if(tab==='abilities'&&!allAbilities.length)loadAbilities()
  if(tab==='pokemon')filterPokemon()
  if(tab==='attacks')filterMoves()
  if(tab==='abilities')filterAbilities()
  if(tab==='games')selectGame(currentGame||'wordle')
  if(tab==='leaderboard')renderLeaderboard()
  if(tab==='battle')initBattle()
  if(tab==='collection')renderCollection()
}

async function loadSets(){
  document.getElementById('setsContent').innerHTML='<div class="set-loading"><div class="spinner"></div><div>Loading sets...</div></div>'
  try{
    const res=await fetch('https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master/sets/en.json')
    allSets=await res.json()
    renderSets()
  }catch(e){
    document.getElementById('setsContent').innerHTML='<div class="set-loading">Failed to load sets</div>'
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
  try{
    const res=await fetch('https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master/cards/en/'+setId+'.json')
    const cards=await res.json()
    setCardsCache[setId]=cards
    renderSetDetail(cards)
    rvAdd('card',setId,(allSets.find(s=>s.id===setId)?.name||setId),'')
  }catch(e){
    document.getElementById('setDetailContent').innerHTML='<div style="padding:40px;text-align:center;color:rgba(255,255,255,0.5)">Failed to load set cards</div>'
  }
}

function renderSetDetail(cards){
  const set=allSets.find(s=>s.id===cards[0]?.id?.split('-')[0])
  window._setCards=cards
  window._setTotal=set?.printedTotal||0
  document.getElementById('setDetailContent').innerHTML=
    '<div class="modal-header">'+
      '<div class="poke-name">'+(set?.name||'Set Cards')+'</div>'+
      (set?'<div style="font-size:13px;color:rgba(255,255,255,0.4)">'+(set.series||'')+' · '+set.printedTotal+' cards · Released '+set.releaseDate.split('/').reverse().join('/')+'</div>':'')+
    '</div>'+
    '<div class="set-cards-grid">'+
    cards.map((c,i)=>{
      const types=(c.types||[]).map(t=>'<span class="type-badge type-'+t.toLowerCase()+'">'+t+'</span>').join('')
      return '<div class="set-card-item" onclick="openCardPrices('+i+')">'+
        '<img src="'+((c.images?.small||c.images?.large)||'')+'" alt="'+c.name+'" loading="lazy" onerror="this.outerHTML=\'<div style=\'width:100%;aspect-ratio:2.5/3.5;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.03);padding:6px;font-size:11px;color:rgba(255,255,255,0.2);text-align:center\' class=\'set-card-item\'>'+c.name+'</div>\'">'+
        '<div class="sc-info">'+
          '<div class="sc-name">'+c.name+(c.rarity?' <span style="color:rgba(255,255,255,0.3);font-weight:400">('+c.rarity+')</span>':'')+'</div>'+
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
    '<div style="background:rgba(255,255,255,0.04);border-radius:8px;padding:8px 10px;margin-bottom:6px;border:1px solid rgba(255,255,255,0.06)">'+
      '<div style="font-size:13px;font-weight:600">'+a.name+'</div>'+
      (a.damage?'<div style="font-size:12px;color:#ff6b35;font-weight:600">'+a.damage+' damage</div>':'')+
      (a.text?'<div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:2px">'+a.text+'</div>':'')+
    '</div>'
  ).join('')
  const abilities=(c.abilities||[]).map(a=>
    '<div style="background:rgba(255,255,255,0.04);border-radius:8px;padding:8px 10px;margin-bottom:6px;border:1px solid rgba(255,255,255,0.06)">'+
      '<div style="font-size:12px;color:#f7c948;font-weight:600">Ability: '+a.name+'</div>'+
      (a.text?'<div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:2px">'+a.text+'</div>':'')+
    '</div>'
  ).join('')
  const hp=c.hp?'<div class="info-item"><div class="label">HP</div><div class="value" style="color:#ff6b6b">'+c.hp+'</div></div>':''
  const evo=c.evolvesFrom?'<div class="info-item"><div class="label">Evolves From</div><div class="value">'+c.evolvesFrom+'</div></div>':''
  const weak=(c.weaknesses||[]).map(w=>w.type+(w.value?' '+w.value:'')).join(', ')
  const resist=(c.resistances||[]).map(r=>r.type+(r.value?' '+r.value:'')).join(', ')
  const retreat=c.retreatCost?.length||'—'
  const typesHtml=types?'<div style="margin:6px 0 12px">'+types+'</div>':''
  const old=document.getElementById('cardPriceDetail')
  if(old)old.remove()
  const div=document.createElement('div')
  div.id='cardPriceDetail'
  div.style.cssText='border-top:1px solid rgba(255,255,255,0.08);margin-top:12px'
  div.innerHTML=
    '<div class="modal-header" style="padding:16px 24px 8px;text-align:left;background:none">'+
      '<div style="display:flex;gap:16px;align-items:start">'+
        (c.images?.small||c.images?.large?'<img src="'+(c.images.small||c.images.large)+'" alt="'+c.name+'" style="width:80px;height:112px;object-fit:contain;border-radius:6px;background:rgba(255,255,255,0.03);padding:4px;flex-shrink:0">':'')+
        '<div>'+
          '<div class="poke-name" style="font-size:18px;margin:0">'+c.name+'</div>'+
          (c.set?.name?'<div style="font-size:11px;color:rgba(255,255,255,0.4)">'+c.set.name+(c.rarity?' · '+c.rarity:'')+(c.id?' · #'+c.id:'')+'</div>':'')+
          (c.supertype?'<div style="font-size:11px;color:rgba(255,255,255,0.3);margin-top:2px">'+c.supertype+(c.subtypes?.length?' ('+c.subtypes.join(', ')+')':'')+'</div>':'')+
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
      (abilities?'<div style="margin-bottom:10px"><h3 style="font-size:13px;font-weight:700;margin-bottom:6px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:.5px">Abilities</h3>'+abilities+'</div>':'')+
      (attacks?'<div style="margin-bottom:12px"><h3 style="font-size:13px;font-weight:700;margin-bottom:6px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:.5px">Attacks</h3>'+attacks+'</div>':'')+
      '<div class="fallback-box" style="border:none;background:rgba(255,255,255,0.03);padding:12px;margin:0">'+
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
  try{
    const res=await fetch('https://pokeapi.co/api/v2/move?limit=100000')
    const data=await res.json()
    allMoves=data.results.map(m=>{
      const match=m.url.match(/\/(\d+)\/$/);return{...m,id:match?parseInt(match[1]):0}
    })
    const sel=document.getElementById('moveTypeFilter')
    TYPES.forEach(t=>{const o=document.createElement('option');o.value=t;o.textContent=t.charAt(0).toUpperCase()+t.slice(1);sel.appendChild(o)})
    filterMoves()
    document.getElementById('movesLoading').style.display='none'
    document.getElementById('movesGrid').style.display='grid'
    batchLoadMoveTypes()
  }catch(e){
    document.getElementById('movesLoading').innerHTML='<div style="color:rgba(255,255,255,0.5)">Failed to load moves</div>'
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
    grid.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:40px;color:rgba(255,255,255,0.4)">No moves found</div>'
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
        const res=await fetch('https://pokeapi.co/api/v2/move/'+m.id)
        const data=await res.json()
        m.type=data.type?.name||''
        m.damageClass=data.damage_class?.name||''
        m.pp=data.pp||null
        m.power=data.power||null
        m.accuracy=data.accuracy||null
        m.generation=data.generation?.name||''
        m.effectEntry=data.effect_entries?.find(e=>e.language.name==='en')||null
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
  try{
    const res=await fetch('https://pokeapi.co/api/v2/move/'+id)
    const data=await res.json()
    moveCache[id]=data
    renderMoveDetail(data)
    rvAdd('move',id,data.name,'')
  }catch(e){
    document.getElementById('moveDetailContent').innerHTML='<div style="padding:40px;text-align:center;color:rgba(255,255,255,0.5)">Failed to load move data</div>'
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
      (gen?'<div style="font-size:12px;color:rgba(255,255,255,0.3);margin-top:6px">'+gen+'</div>':'')+
    '</div>'+
    '<div class="modal-body">'+
      '<div class="info-grid">'+
        (m.power!=null?'<div class="info-item"><div class="label">Power</div><div class="value" style="color:#ff6b35;font-size:18px">'+(m.power||'—')+'</div></div>':'')+
        (m.accuracy!=null?'<div class="info-item"><div class="label">Accuracy</div><div class="value">'+(m.accuracy!=null?m.accuracy:'—')+'</div></div>':'')+
        (m.pp!=null?'<div class="info-item"><div class="label">PP</div><div class="value">'+m.pp+'</div></div>':'')+
        (m.priority?'<div class="info-item"><div class="label">Priority</div><div class="value">'+(m.priority>0?'+':'')+m.priority+'</div></div>':'')+
        (m.contest_type?.name?'<div class="info-item"><div class="label">Contest</div><div class="value">'+m.contest_type.name+'</div></div>':'')+
      '</div>'+
      (eff?'<div style="margin-bottom:16px"><h3 style="font-size:14px;font-weight:700;margin-bottom:6px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:.5px">Effect</h3><p style="font-size:14px;line-height:1.6;color:rgba(255,255,255,0.8)">'+eff+'</p></div>':'')+
      (flavor?'<div><h3 style="font-size:14px;font-weight:700;margin-bottom:6px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:.5px">Description</h3><p style="font-size:13px;line-height:1.5;color:rgba(255,255,255,0.5)">'+flavor+'</p></div>':'')+
      (m.learned_by_pokemon&&m.learned_by_pokemon.length?'<div style="margin-top:16px"><h3 style="font-size:14px;font-weight:700;margin-bottom:8px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:.5px">Learned by <span style="font-weight:400;font-size:11px;color:rgba(255,255,255,0.2)">('+m.learned_by_pokemon.length+' Pokémon)</span></h3><div class="abilities-list" style="max-height:220px;overflow-y:auto">'+m.learned_by_pokemon.map(p=>'<span class="ability-tag">'+((p.name||p.pokemon?.name||'').replace(/-/g,' '))+'</span>').join('')+'</div></div>':'')+
    '</div>'
}

function closeMoveDetail(){document.getElementById('moveDetailModal').classList.remove('active');document.body.style.overflow=''}

async function loadAbilities(){
  document.getElementById('abilitiesLoading').style.display='flex'
  document.getElementById('abilitiesGrid').style.display='none'
  try{
    const res=await fetch('https://pokeapi.co/api/v2/ability?limit=100000')
    const data=await res.json()
    allAbilities=data.results.map(a=>{
      const match=a.url.match(/\/(\d+)\/$/);return{...a,id:match?parseInt(match[1]):0}
    })
    filterAbilities()
    document.getElementById('abilitiesLoading').style.display='none'
    document.getElementById('abilitiesGrid').style.display='grid'
    batchLoadAbilityData()
  }catch(e){
    document.getElementById('abilitiesLoading').innerHTML='<div style="color:rgba(255,255,255,0.5)">Failed to load abilities</div>'
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
    grid.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:40px;color:rgba(255,255,255,0.4)">No abilities found</div>'
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
        const res=await fetch('https://pokeapi.co/api/v2/ability/'+a.id)
        const data=await res.json()
        a.generation=data.generation?.name||''
        a.effectEntry=data.effect_entries?.find(e=>e.language.name==='en')||null
        a.flavorText=data.flavor_text_entries?.find(e=>e.language.name==='en')?.flavor_text||''
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
  try{
    const res=await fetch('https://pokeapi.co/api/v2/ability/'+id)
    const data=await res.json()
    abilityCache[id]=data
    renderAbilityDetail(data)
    rvAdd('ability',id,data.name,'')
  }catch(e){
    document.getElementById('abilityDetailContent').innerHTML='<div style="padding:40px;text-align:center;color:rgba(255,255,255,0.5)">Failed to load ability data</div>'
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
      (gen?'<div style="font-size:12px;color:rgba(255,255,255,0.3);margin-top:4px">'+gen+'</div>':'')+
    '</div>'+
    '<div class="modal-body">'+
      (eff?'<div style="margin-bottom:16px"><h3 style="font-size:14px;font-weight:700;margin-bottom:6px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:.5px">Effect</h3><p style="font-size:14px;line-height:1.6;color:rgba(255,255,255,0.8)">'+eff+'</p></div>':'')+
      (flavor?'<div style="margin-bottom:16px"><h3 style="font-size:14px;font-weight:700;margin-bottom:6px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:.5px">Description</h3><p style="font-size:13px;line-height:1.5;color:rgba(255,255,255,0.5)">'+flavor+'</p></div>':'')+
      (pkmn.length?'<div><h3 style="font-size:14px;font-weight:700;margin-bottom:8px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:.5px">Pokemon with this ability</h3><div class="abilities-list">'+pkmn.map(p=>'<span class="ability-tag">'+p+'</span>').join('')+'</div></div>':'')+
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
    document.getElementById('wgStatus').innerHTML='<div style="color:#4caf50;font-size:20px;font-weight:800">✓ '+(wgTarget.charAt(0).toUpperCase()+wgTarget.slice(1))+'! '+wgGuesses.length+'/6</div><button class="wg-btn" onclick="newWg()" style="margin-top:12px">New Game</button>'
    inp.disabled=true
  }else if(wgGuesses.length>=6){
    wgOver=true;updateStats('wg',{win:false,guesses:6})
    document.getElementById('wgStatus').innerHTML='<div style="color:rgba(255,255,255,0.6);font-size:18px;font-weight:700">'+wgTarget.charAt(0).toUpperCase()+wgTarget.slice(1)+'</div><button class="wg-btn" onclick="newWg()" style="margin-top:12px">New Game</button>'
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
function selectGame(name){
  currentGame=name
  document.querySelectorAll('.gs-btn').forEach(b=>b.classList.toggle('active',b.dataset.game===name))
  ;['wordle','whosthat','typespeed','memory','speedrun','typequiz','numberroll'].forEach(g=>{
    document.getElementById('game'+g.charAt(0).toUpperCase()+g.slice(1)).style.display=g===name?'block':'none'
  })
  // Reset state so game re-initializes fresh each visit
  if(name==='wordle'){wgStarted=false;initWordle()}
  if(name==='whosthat'){mg1={id:0,score:0,tries:0};initMg1()}
  if(name==='typespeed'){mg2={id:0,streak:0,score:0};initMg2()}
  if(name==='memory'){mg3={cards:[],flipped:[],matched:0,moves:0,locked:false};initMg3()}
  if(name==='speedrun'){mg4={time:30,score:0,names:[],active:false,interval:null};initMg4()}
  if(name==='typequiz'){mg5={score:0,total:0,used:[],answer:1};initMg5()}
  if(name==='numberroll'){nrStarted=false;initNr()}
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
    '<h2>🔍 Who\'s That Pokémon?</h2><div class="sub">Guess the Gen 1 Pokémon — <span id="mg1Try">5</span> tries left</div>'+
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
function mg2New(){
  mg2.id=Math.floor(Math.random()*151)+1
  document.getElementById('mg2Content').innerHTML=
    '<h2>⚡ Type Speed</h2><div class="sub">Click the primary type of the Pokémon shown</div>'+
    '<div id="mg2Pkmn"></div><div class="mg2-types" id="mg2Types"></div>'+
    '<div class="mg2-streak">Streak: <span id="mg2Str">'+mg2.streak+'</span> · Score: <span id="mg2Sc">'+mg2.score+'</span></div><div id="mg2Res"></div>'
  const p=allPokemon.find(p=>p.id===mg2.id)
  if(!p)return mg2New()
  document.getElementById('mg2Pkmn').innerHTML='<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/'+mg2.id+'.png" class="mg2-pkmn-img">'
  const types=['normal','fire','water','electric','grass','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy']
  document.getElementById('mg2Types').innerHTML=types.map(t=>'<button class="type-badge type-'+t+'" onclick="mg2Guess(\''+t+'\')">'+t+'</button>').join('')
}
function mg2Guess(t){
  const btns=document.querySelectorAll('#mg2Types button')
  btns.forEach(b=>b.disabled=true)
  const p=allPokemon.find(p=>p.id===mg2.id)
  if(!p)return
  if(p.types[0]===t){mg2.streak++;mg2.score+=10+mg2.streak*2;updateStats('mg2',{score:mg2.score,streak:mg2.streak});document.getElementById('mg2Res').innerHTML='<div class="mg-correct">✓ '+cap(p.name)+' — '+t+'!</div>'}
  else{mg2.streak=0;updateStats('mg2',{score:mg2.score,streak:0});document.getElementById('mg2Res').innerHTML='<div class="mg-wrong">✗ '+cap(p.name)+' is '+p.types[0]+'</div>';btns.forEach(b=>b.style.opacity='.3');document.querySelector('#mg2Types .type-'+p.types[0]).style.opacity='1'}
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
    '<h2>🧠 Memory Match</h2><div class="sub">Match the Pokémon pairs!</div>'+
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
    if(mg3.cards[a]===mg3.cards[b]){mg3.matched++;document.getElementById('mg3Mt').textContent=mg3.matched;document.getElementById('mg3c'+a).classList.add('matched');document.getElementById('mg3c'+b).classList.add('matched');mg3.flipped=[];mg3.locked=false;if(mg3.matched===8){updateStats('mg3',{moves:mg3.moves});document.getElementById('mg3Res').innerHTML='<div class="mg-correct">🎉 All matched in '+mg3.moves+' moves!</div><button onclick="mg3New()" class="b-btn b-btn-primary">New Game</button>'}}
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
    '<h2>🏃 Speedrun</h2><div class="sub">Name as many Pokémon as you can in 30 seconds!</div>'+
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
  document.getElementById('mg4Timer').innerHTML+=('<br><span style="font-size:16px;color:#f7c948;font-weight:700">Caught '+mg4.score+' Pokémon!</span>')
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
    '<h2>❓ Type Quiz</h2><div class="sub">Is the move super effective?</div>'+
    '<div class="mg5-q"><span class="type-badge type-'+at+'">'+at+'</span> <span class="arrow">→</span> <span class="type-badge type-'+dt+'">'+dt+'</span></div>'+
    '<div class="mg5-options">'+
      '<button class="eff2" onclick="mg5Answer(2)">⚡ Super Effective</button>'+
      '<button class="eff05" onclick="mg5Answer(0.5)">🛡️ Not Very Effective</button>'+
      '<button class="eff0" onclick="mg5Answer(0)">❌ No Effect</button>'+
    '</div>'+
    '<div class="mg-score">Score: <span id="mg5Sc">'+mg5.score+'</span>/'+mg5.total+'</div><div id="mg5Res"></div>'
}
function mg5Answer(a){
  document.querySelectorAll('.mg5-options button').forEach(b=>b.disabled=true)
  const correct=a===mg5.answer
  if(correct)mg5.score++
  updateStats('mg5',{correct:correct})
  document.getElementById('mg5Sc').textContent=mg5.score
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
  normal:[{n:'Tackle',p:40,t:'normal',pp:35},{n:'Quick Attack',p:40,t:'normal',pp:30},{n:'Body Slam',p:85,t:'normal',pp:15},{n:'Hyper Beam',p:150,t:'normal',pp:5},{n:'Slash',p:70,t:'normal',pp:20},{n:'Headbutt',p:70,t:'normal',pp:15}],
  fire:[{n:'Ember',p:40,t:'fire',pp:25},{n:'Fire Punch',p:75,t:'fire',pp:15},{n:'Flamethrower',p:90,t:'fire',pp:15},{n:'Fire Blast',p:110,t:'fire',pp:5},{n:'Flame Wheel',p:60,t:'fire',pp:25}],
  water:[{n:'Water Gun',p:40,t:'water',pp:25},{n:'Waterfall',p:80,t:'water',pp:15},{n:'Hydro Pump',p:110,t:'water',pp:5},{n:'Bubble Beam',p:65,t:'water',pp:20},{n:'Surf',p:90,t:'water',pp:15}],
  electric:[{n:'Thunder Shock',p:40,t:'electric',pp:30},{n:'Spark',p:65,t:'electric',pp:20},{n:'Thunderbolt',p:90,t:'electric',pp:15},{n:'Thunder',p:110,t:'electric',pp:10},{n:'Zap Cannon',p:120,t:'electric',pp:5}],
  grass:[{n:'Vine Whip',p:45,t:'grass',pp:25},{n:'Razor Leaf',p:55,t:'grass',pp:25},{n:'Solar Beam',p:120,t:'grass',pp:10},{n:'Seed Bomb',p:80,t:'grass',pp:15},{n:'Leaf Blade',p:90,t:'grass',pp:15}],
  ice:[{n:'Ice Shard',p:40,t:'ice',pp:30},{n:'Ice Beam',p:90,t:'ice',pp:10},{n:'Blizzard',p:110,t:'ice',pp:5},{n:'Icy Wind',p:55,t:'ice',pp:15},{n:'Aurora Beam',p:65,t:'ice',pp:20}],
  fighting:[{n:'Rock Smash',p:40,t:'fighting',pp:15},{n:'Brick Break',p:75,t:'fighting',pp:15},{n:'Close Combat',p:120,t:'fighting',pp:5},{n:'Low Kick',p:50,t:'fighting',pp:20},{n:'Cross Chop',p:100,t:'fighting',pp:5}],
  poison:[{n:'Poison Sting',p:15,t:'poison',pp:35},{n:'Sludge',p:65,t:'poison',pp:20},{n:'Sludge Bomb',p:90,t:'poison',pp:10},{n:'Poison Jab',p:80,t:'poison',pp:20},{n:'Gunk Shot',p:120,t:'poison',pp:5}],
  ground:[{n:'Mud-Slap',p:20,t:'ground',pp:10},{n:'Dig',p:80,t:'ground',pp:10},{n:'Earthquake',p:100,t:'ground',pp:10},{n:'Bone Club',p:65,t:'ground',pp:20},{n:'Sand Tomb',p:35,t:'ground',pp:15}],
  flying:[{n:'Peck',p:35,t:'flying',pp:35},{n:'Wing Attack',p:60,t:'flying',pp:35},{n:'Fly',p:90,t:'flying',pp:15},{n:'Drill Peck',p:80,t:'flying',pp:20},{n:'Aerial Ace',p:60,t:'flying',pp:20}],
  psychic:[{n:'Confusion',p:50,t:'psychic',pp:25},{n:'Psybeam',p:65,t:'psychic',pp:20},{n:'Psychic',p:90,t:'psychic',pp:10},{n:'Psyshock',p:80,t:'psychic',pp:10},{n:'Future Sight',p:120,t:'psychic',pp:5}],
  bug:[{n:'Fury Cutter',p:40,t:'bug',pp:20},{n:'Bug Bite',p:60,t:'bug',pp:20},{n:'X-Scissor',p:80,t:'bug',pp:15},{n:'Megahorn',p:120,t:'bug',pp:10},{n:'Signal Beam',p:75,t:'bug',pp:15}],
  rock:[{n:'Rock Throw',p:50,t:'rock',pp:15},{n:'Rock Tomb',p:60,t:'rock',pp:15},{n:'Stone Edge',p:100,t:'rock',pp:5},{n:'Rock Slide',p:75,t:'rock',pp:10},{n:'Power Gem',p:80,t:'rock',pp:20}],
  ghost:[{n:'Lick',p:30,t:'ghost',pp:30},{n:'Shadow Claw',p:70,t:'ghost',pp:15},{n:'Shadow Ball',p:80,t:'ghost',pp:15},{n:'Night Shade',p:60,t:'ghost',pp:15},{n:'Phantom Force',p:90,t:'ghost',pp:10}],
  dragon:[{n:'Dragon Breath',p:60,t:'dragon',pp:20},{n:'Dragon Claw',p:80,t:'dragon',pp:15},{n:'Dragon Pulse',p:85,t:'dragon',pp:10},{n:'Dragon Rush',p:100,t:'dragon',pp:10},{n:'Outrage',p:120,t:'dragon',pp:5}],
  dark:[{n:'Bite',p:60,t:'dark',pp:25},{n:'Faint Attack',p:60,t:'dark',pp:20},{n:'Crunch',p:80,t:'dark',pp:15},{n:'Dark Pulse',p:80,t:'dark',pp:15},{n:'Night Slash',p:70,t:'dark',pp:15}],
  steel:[{n:'Metal Claw',p:50,t:'steel',pp:35},{n:'Iron Head',p:80,t:'steel',pp:15},{n:'Flash Cannon',p:80,t:'steel',pp:10},{n:'Iron Tail',p:100,t:'steel',pp:15},{n:'Bullet Punch',p:40,t:'steel',pp:30}],
  fairy:[{n:'Fairy Wind',p:40,t:'fairy',pp:30},{n:'Draining Kiss',p:50,t:'fairy',pp:10},{n:'Moonblast',p:95,t:'fairy',pp:15},{n:'Play Rough',p:90,t:'fairy',pp:10},{n:'Dazzling Gleam',p:80,t:'fairy',pp:10}]
}
const TRAINERS=[
  {title:'Youngster',name:'Joey',class:'BUG CATCHER',icon:'🧢',lvl:6,types:['bug','normal'],rewards:{xp:80,sd:40}},
  {title:'Lass',name:'Sally',class:'LASS',icon:'🎀',lvl:8,types:['normal','fairy'],rewards:{xp:100,sd:50}},
  {title:'Hiker',name:'Dan',class:'HIKER',icon:'⛰️',lvl:10,types:['rock','ground'],rewards:{xp:130,sd:65}},
  {title:'Fisherman',name:'Will',class:'FISHERMAN',icon:'🎣',lvl:12,types:['water'],rewards:{xp:160,sd:80}},
  {title:'Picnicker',name:'Liz',class:'PICNICKER',icon:'🧺',lvl:14,types:['grass','normal'],rewards:{xp:190,sd:95}},
  {title:'Ace Trainer',name:'Mike',class:'ACE TRAINER',icon:'⭐',lvl:16,types:['fighting','psychic'],rewards:{xp:230,sd:115}},
  {title:'Black Belt',name:'Lee',class:'BLACK BELT',icon:'🥋',lvl:18,types:['fighting','rock'],rewards:{xp:270,sd:135}},
  {title:'Channeler',name:'Grace',class:'CHANNELER',icon:'🔮',lvl:20,types:['ghost','psychic'],rewards:{xp:310,sd:155}},
  {title:'Gentleman',name:'Cliff',class:'GENTLEMAN',icon:'🎩',lvl:22,types:['normal','steel','dragon'],rewards:{xp:360,sd:180}},
  {title:'Gym Leader',name:'Brock',class:'GYM LEADER',icon:'🏅',lvl:25,types:['rock','steel','ground'],rewards:{xp:500,sd:250}},
  {title:'Elite Four',name:'Lance',class:'ELITE FOUR',icon:'👑',lvl:28,types:['dragon','flying'],rewards:{xp:700,sd:350}},
  {title:'Champion',name:'Red',class:'CHAMPION',icon:'🏆',lvl:32,types:['fire','water','grass','electric','psychic'],rewards:{xp:1000,sd:500}}
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
  wildMode:false,catchActive:false,crPct:80,crDir:-1,crInt:null}

function si(id){return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/'+id+'.png'}
function cap(s){return s.charAt(0).toUpperCase()+s.slice(1)}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
function calcS(base,lvl,iv){return Math.floor((2*base+iv)*lvl/100)+5}
function calcH(base,lvl,iv){return (Math.floor((2*base+iv)*lvl/100)+lvl+10)*2}
function calcCp(p){return Math.floor((p.stats.attack+p.stats.defense+p.stats.hp)*p.level/5/p.maxHp*200+10)}
function imgTag(id,size){return '<img src="'+si(id)+'" alt="" style="width:'+size+';height:'+size+';object-fit:contain" onerror="this.src=\'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'+id+'.png\'">'}
function getEff(mt,dt){let m=1;dt.forEach(t=>{if(CEFF[mt]&&CEFF[mt][t]!==undefined)m*=CEFF[mt][t]});return m}
function showCh(id){const m={chStarter:'chStarter',chHub:'chHub',chBattle:'chBattle',chSwitch:'chSwitch',chParty:'chParty',chResults:'chResults',chWildCatch:'chWildCatch'};Object.keys(m).forEach(k=>document.getElementById(m[k]).style.display=k===id?'block':'none')}
function rand(a,b){return a+Math.random()*(b-a)}

async function fetchPkmn(id){
  const r=await fetch('https://pokeapi.co/api/v2/pokemon/'+id)
  const d=await r.json()
  return{id:d.id,name:d.name,types:d.types.map(t=>t.type.name),stats:{hp:d.stats[0].base_stat,attack:d.stats[1].base_stat,defense:d.stats[2].base_stat,spAttack:d.stats[3].base_stat,spDefense:d.stats[4].base_stat,speed:d.stats[5].base_stat}}
}
function makePkmn(d,lvl){
  const iv=Object.fromEntries(Object.keys(d.stats).map(k=>[k,Math.floor(Math.random()*32)]))
  const mh=calcH(d.stats.hp,lvl,iv.hp)
  const moves=getChMoves(d.types)
  return{id:d.id,name:d.name,types:d.types,level:lvl,xp:0,xpNext:lvl*80,baseStats:d.stats,iv,moves,status:null,
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
  const t=TRAINERS[Math.min(ch.trainerIdx,TRAINERS.length-1)]
  const rank=t?t.class:'CHAMPION'
  const candyAmt=ch.candy[p.name]||0
  document.getElementById('chHubContent').innerHTML=
    '<div class="hub-header"><h2>Pokémon Champions</h2><div style="color:rgba(255,255,255,0.4);font-size:13px;margin-top:4px">Defeat trainers to climb the ranks!</div></div>'+
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
      '<span>🏆 Rank: '+rank+'</span>'+
      '<span>🔥 Streak: '+ch.winStreak+'</span>'+
      '<span>💰 '+ch.stardust+' SD</span>'+
      '<span>🍬 '+candyAmt+' Candy</span>'+
      '<span>🔴 '+ch.pokeballs+' Balls</span>'+
    '</div>'+
    '<div class="hub-actions">'+
      '<button class="b-btn b-btn-primary" onclick="chStartTrainerBattle()">⚔️ Battle Trainer</button>'+
      '<button class="b-btn b-btn-secondary" onclick="chWildEncounter()">🌿 Find Wild Pokémon</button>'+
      '<button class="b-btn b-btn-secondary" onclick="chShowParty()">👥 Party</button>'+
      '<button class="b-btn b-btn-secondary" onclick="chHealAll()">💚 Heal All</button>'+
    '</div>'
}

async function chCreateTrainerTeam(t){
  const ids=[],chosen=new Set,attempted=new Set
  let tries=0
  while(ids.length<3&&tries<300){
    tries++
    const id=randomPkmnId()
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
  if(ch.team.every(p=>p.currentHp<=0)){document.getElementById('chHubContent').querySelector('.hub-header').innerHTML+='<div style="color:#f44336;margin-top:8px">All fainted! Heal first.</div>';return}
  const t=TRAINERS[Math.min(ch.trainerIdx,TRAINERS.length-1)]
  document.getElementById('chHubContent').innerHTML+='<div style="text-align:center;margin-top:12px"><div class="spinner" style="width:24px;height:24px;margin:0 auto"></div></div>'
  const team=await chCreateTrainerTeam(t)
  ch.battle={opponent:t,oppTeam:team,oppIdx:0,playerIdx:0,logs:[]}
  ch.battle.playerMoves=ch.team.map(p=>p.moves.map(m=>({...m,pp:m.pp})))
  ch.wildMode=false
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
  if(ch.team.length>=1000){document.getElementById('chHubContent').querySelector('.hub-header').innerHTML+='<div style="color:#f7c948;margin-top:8px">Team full! Can\'t catch more.</div>';return}
  if(ch.team.every(p=>p.currentHp<=0)){document.getElementById('chHubContent').querySelector('.hub-header').innerHTML+='<div style="color:#f44336;margin-top:8px">All fainted! Heal first.</div>';return}
  const id=randomPkmnId()
  const d=await fetchPkmn(id)
  const lvl=Math.max(1,Math.min(20,Math.floor(rand(1,6)+ch.team[0].level-2)))
  const pkmn=makePkmn(d,lvl)
  ch.battle={opponent:{title:'Wild',name:cap(pkmn.name),class:'WILD',icon:'🌿',rewards:{xp:lvl*15+20,sd:30+lvl*3}},oppTeam:[pkmn],oppIdx:0,playerIdx:0,logs:[]}
  ch.battle.playerMoves=ch.team.map(p=>p.moves.map(m=>({...m,pp:m.pp})))
  ch.wildMode=true
  chStartBattle()
}
function chStartBattle(){
  showCh('chBattle')
  ch.battle.oppIdx=0;ch.battle.playerIdx=0;ch.phase='select';ch.selectedMove=-1;ch.turnActive=false
  chRenderBattle()
  const t=ch.battle.opponent
  const splash=document.getElementById('chSplash')
  splash.className='ch-splash ch-trainer-splash active'
  splash.innerHTML='<div class="trainer-avatar">'+t.icon+'</div><div class="trainer-class">'+t.class+'</div><div class="splash-title">'+(ch.wildMode?'Wild '+t.name:t.title+' '+t.name)+'</div><div class="splash-sub">'+(ch.wildMode?'A wild Pokémon appeared!':t.class+' wants to battle!')+'</div>'+
    '<div style="display:flex;gap:6px;margin-top:4px">'+ch.battle.oppTeam.map(p=>imgTag(p.id,'48px')).join('')+'</div>'+
    '<div style="margin-top:12px"><span class="b-btn b-btn-primary" onclick="chCloseSplash()">Battle!</span></div>'
}
function chCloseSplash(){
  const splash=document.getElementById('chSplash')
  splash.classList.remove('active')
  splash.innerHTML=''
  chLog('Go, '+cap(ch.team[0].name)+'!')
}
function chRenderBattle(){
  const t=ch.battle.opponent,p=chGetPlayer(),e=chGetEnemy()
  document.getElementById('chOppName').textContent=ch.wildMode?'Wild '+cap(e.name):t.title+' '+t.name
  document.getElementById('chOppTitle').textContent=ch.wildMode?'Lv.'+e.level:t.class+' (Lv.'+e.level+')'
  document.getElementById('chPlayerName').textContent='You'
  document.getElementById('chPlayerRank').textContent='Streak: '+ch.winStreak
  chRenderTeamMinis('chOppTeamMini',ch.battle.oppTeam,ch.battle.oppIdx)
  chRenderTeamMinis('chPlayerTeamMini',ch.team,ch.battle.playerIdx)
  chRenderPokemon('chOppSlot',e,true)
  chRenderPokemon('chPlayerSlot',p,false)
  chRenderMoves(p)
}
function chRenderTeamMinis(id,team,activeIdx){
  document.getElementById(id).innerHTML=team.map((p,i)=>{
    const f=p.currentHp<=0?'<div class="faint-x">✕</div>':''
    const a=i===activeIdx?'active':''
    return '<div class="mini-slot '+a+'">'+imgTag(p.id,'28px')+f+'</div>'
  }).join('')
}
function chRenderPokemon(slotId,pkmn,isEnemy){
  const hpPct=Math.max(0,pkmn.currentHp/pkmn.maxHp*100)
  const slot=document.getElementById(slotId)
  slot.querySelector('.sprite').src=si(pkmn.id)
  slot.querySelector('.sprite').onerror=function(){this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'+pkmn.id+'.png'}
  slot.querySelector('.cp-badge').textContent='CP '+calcCp(pkmn)+' · Lv.'+pkmn.level
  slot.querySelector('.ch-hp-fill').style.width=hpPct+'%'
  const hpFill=slot.querySelector('.ch-hp-fill')
  hpFill.className='ch-hp-fill'+(hpPct<25?' low':hpPct<50?' mid':'')
  slot.querySelector('#ch'+(isEnemy?'Opp':'Player')+'HpText').textContent='HP '+pkmn.currentHp+'/'+pkmn.maxHp
  const statusEl=slot.querySelector('#ch'+(isEnemy?'Opp':'Player')+'Status')
  if(pkmn.status){
    const labels={brn:'BRN',par:'PAR',psn:'PSN',slp:'SLP'}
    statusEl.innerHTML='<span class="ch-status-badge '+pkmn.status+'">'+labels[pkmn.status]+'</span>'
  }else statusEl.innerHTML=''
}
function chRenderMoves(pkmn){
  const moves=pkmn.moves
  const grid=document.getElementById('chMoveGrid')
  grid.innerHTML=moves.map((m,i)=>{
    const eff=getEff(m.t,(chGetEnemy()?.types||[]))
    const sel=i===ch.selectedMove?'selected':''
    const cls='ch-move-btn '+sel+(m.pp<=0?' disabled':'')
    return '<div class="'+cls+'" onclick="chSelectMove('+i+')">'+
      '<div class="mn">'+m.n.split(' ')[0]+'</div>'+
      '<div class="mm"><span class="type-tag type-'+m.t+'">'+m.t.substring(0,3)+'</span> '+(eff>1?'⚡':'')+' '+m.p+'pwr</div>'+
      '<div class="pp">PP '+m.pp+'</div>'+
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
  // Player action
  const pd=chCalcDmg(p,e,pm)
  if(pd.dmg>0)e.currentHp=Math.max(0,e.currentHp-pd.dmg)
  // Apply status from player move
  chTryStatus(p,e,pm.t)
  // AI action
  const am=chAIMove()
  const ad=chCalcDmg(e,p,am)
  if(ad.dmg>0)p.currentHp=Math.max(0,p.currentHp-ad.dmg)
  chTryStatus(e,p,am.t)
  // Show results
  let log='<span class="highlight">'+cap(p.name)+'</span> used <span class="dmg">'+pm.n+'</span>!'
  if(pd.eff>1)log+=' <span style="color:#4caf50">⚡Super effective!</span>'
  if(pd.crit)log+=' <span style="color:#f7c948">💥Crit!</span>'
  if(ad.dmg>0)log+='<br><span class="highlight">'+cap(e.name)+'</span> used <span class="dmg">'+am.n+'</span>!'
  else if(ad.dmg===0)log+='<br><span class="highlight">'+cap(e.name)+"'s</span> attack missed!"
  if(!ch.wildMode&&p.currentHp>0&&e.currentHp>0)log+='<br><span style="color:rgba(255,255,255,0.3);font-size:11px">Select your next move</span>'
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
  const atk=attacker.stats.attack,defS=defender.stats.defense
  const level=attacker.level
  const base=Math.floor(((2*level/5+2)*move.p*atk/defS/20+2)*stab*eff)
  const crit=Math.random()<0.0625
  const dmg=Math.max(1,Math.floor(base*(crit?1.5:1)*rand(0.85,1)))
  return{dmg,eff,crit}
}
function chAIMove(){
  const e=chGetEnemy(),p=chGetPlayer()
  if(!e||e.currentHp<=0)return{...CMOVE_POOL.normal[0],pp:1}
  const valid=e.moves.filter(m=>m.pp>0)
  if(!valid.length)return{...CMOVE_POOL.normal[0],pp:1}
  const superEff=valid.filter(m=>getEff(m.t,p.types)>1)
  if(superEff.length)return superEff[Math.floor(Math.random()*superEff.length)]
  return valid[Math.floor(Math.random()*valid.length)]
}
function chTryStatus(attacker,defender,moveType){
  const status=TYPE_STATUS[moveType]
  if(!status||defender.currentHp<=0||defender.status)return
  if(Math.random()<STATUS_CHANCE[status]||0){
    defender.status=status
    const labels={brn:'burned! 🔥',par:'paralyzed! ⚡',psn:'poisoned! ☠️',slp:'put to sleep! 💤'}
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
        n.currentHp=n.maxHp;n.status=null
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
  chLog('Go, '+cap(ch.team[i].name)+'!')
  showCh('chBattle')
  chRenderBattle()
  ch.turnActive=false
}
function chCancelSwitch(){
  const next=ch.team.findIndex((p,i)=>i<3&&i!==ch.battle.playerIdx&&p.currentHp>0)
  if(next<0){chEndBattle(false);return}
  ch.battle.playerIdx=next;ch.phase='select';ch.selectedMove=-1
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
  if(result.crit){const c=document.getElementById('chBattleBg');if(c){c.classList.remove('ch-shake');void c.offsetWidth;c.classList.add('ch-shake')}}
}
async function chEndBattle(win){
  ch.turnActive=true
  const t=ch.battle.opponent
  if(win){
    ch.totalWins++;ch.winStreak++
    if(ch.winStreak>ch.maxStreak)ch.maxStreak=ch.winStreak
    const p=chGetPlayer()
    const xpGain=t.rewards.xp+(ch.winStreak>1?Math.floor(ch.winStreak*20):0)
    const sdGain=t.rewards.sd+Math.floor(ch.winStreak*10)
    ch.stardust+=sdGain
    document.getElementById('chResTitle').textContent='🏆 Victory!'
    document.getElementById('chResSub').textContent='Defeated '+t.title+' '+t.name+'!'
    document.getElementById('chResReward').innerHTML='+'+xpGain+' XP · +'+sdGain+' Stardust'
    document.getElementById('chResExtra').innerHTML='🔥 Streak: '+ch.winStreak+' | 🏅 Total: '+ch.totalWins+' wins'
    document.getElementById('chResBtn').textContent='Continue'
    // Apply XP & check evolution
    for(const p of ch.team){
      p.xp+=xpGain
      while(p.xp>=p.xpNext){
        p.xp-=p.xpNext;p.level++;p.xpNext=p.level*80
        Object.keys(p.stats).forEach(k=>p.stats[k]=calcS(p.baseStats[k],p.level,p.iv[k]))
        p.maxHp=calcH(p.baseStats.hp,p.level,p.iv.hp)
        p.currentHp=Math.min(p.currentHp,p.maxHp)
        const evolved=await chTryEvolve(p)
        if(evolved)document.getElementById('chResExtra').innerHTML+='<br><span style="color:#4caf50">✨ '+cap(p.name)+' evolved!</span>'
      }
    }
    // Move to next trainer occasionally
    if(ch.winStreak>=3&&ch.trainerIdx<TRAINERS.length-1){ch.trainerIdx++;ch.winStreak=0;document.getElementById('chResExtra').innerHTML+='<br><span style="color:#f7c948">⭐ Rank up! Next: '+TRAINERS[Math.min(ch.trainerIdx,TRAINERS.length-1)].class+'</span>'}
  }else{
    document.getElementById('chResTitle').textContent='💔 Defeated'
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
        const evolved=await chTryEvolve(p)
        if(evolved)document.getElementById('chResExtra').innerHTML+='<br><span style="color:#4caf50">✨ '+cap(p.name)+' evolved!</span>'
      }
    }
    ch.winStreak=0
  }
  chSave();chSaveStats()
  showCh('chResults')
}

function chAfterBattle(){
  if(ch.wildMode){
    const e=ch.battle.oppTeam[0]
    document.getElementById('chResBtn').disabled=true
    const w=e
    if(ch.team.length<1000&&ch.pokeballs>0){
      showCh('chWildCatch')
      document.getElementById('chWildImg').src=si(w.id);document.getElementById('chWildImg').onerror=function(){this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'+w.id+'.png'}
      document.getElementById('chWildName').textContent='Wild '+cap(w.name)
      document.getElementById('chWildInfo').textContent='Lv.'+w.level+' · CP '+calcCp(w)
      document.getElementById('chCatchLabel').textContent='Catch it?'
      ch.catchActive=true;ch.crPct=80;ch.crDir=-1
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
  if(Math.random()*100<rate){
    document.getElementById('chCatchLabel').innerHTML='Gotcha! '+cap(w.name)+' was caught! <span style="color:#f7c948">'+q+'!</span>'
    w.currentHp=w.maxHp;w.status=null
    if(ch.team.length<1000){ch.team.push(w)
      const c=ch.candy[w.name]||0;ch.candy[w.name]=c+3+Math.floor(Math.random()*3)
    }
    chSave()
    setTimeout(()=>{ch.battle={};document.getElementById('chResBtn').disabled=false;showCh('chHub');chShowHub()},1500)
  }else{
    document.getElementById('chCatchLabel').innerHTML='Oh no! Broke free! <span style="color:#4caf50">'+q+' throw</span>'
    setTimeout(()=>{ch.catchActive=true;if(ch.pokeballs>0){document.getElementById('chCatchLabel').textContent='Try again! Balls: '+ch.pokeballs;ch.crPct=80;ch.crDir=-1;if(ch.crInt){clearInterval(ch.crInt)}ch.crInt=setInterval(()=>{if(!ch.catchActive){clearInterval(ch.crInt);return}ch.crPct+=ch.crDir*1.5;if(ch.crPct<=15)ch.crDir=1;if(ch.crPct>=85)ch.crDir=-1;const i=document.getElementById('chCatchRingInner');i.style.width=ch.crPct+'%';i.style.height=ch.crPct+'%';i.style.borderColor=ch.crPct<30?'#4caf50':ch.crPct<55?'#f7c948':'#f44336'},20)}else{document.getElementById('chCatchLabel').textContent='No balls left!';setTimeout(()=>{ch.battle={};document.getElementById('chResBtn').disabled=false;showCh('chHub');chShowHub()},1000)}},1000)
  }
}
function chRunFromCatch(){ch.catchActive=false;if(ch.crInt){clearInterval(ch.crInt);ch.crInt=null}ch.battle={};document.getElementById('chResBtn').disabled=false;showCh('chHub');chShowHub()}

async function chTryEvolve(p){
  const evo=EVOLVE_MAP[p.id]
  if(!evo||p.level<evo.level||EVO_BRANCH[p.id])return false
  try{
    const d=await fetchPkmn(evo.to)
    p.id=d.id;p.name=d.name;p.types=d.types;p.baseStats=d.stats
    Object.keys(p.stats).forEach(k=>p.stats[k]=calcS(d.stats[k],p.level,p.iv[k]))
    p.maxHp=calcH(d.stats.hp,p.level,p.iv.hp)
    p.currentHp=Math.min(p.currentHp,p.maxHp)
    p.moves=getChMoves(d.types)
    return true
  }catch(e){return false}
}
function chRun(){if(ch.wildMode){chEndBattle(false)}else{chLog('Can\'t run from trainer battles!')}}
function chSwitchMode(){if(ch.phase==='select'&&!ch.turnActive){chShowSwitch()}else{chLog('Wait your turn!')}}
function chShowParty(){
  showCh('chParty')
  document.getElementById('chPartyList').innerHTML=ch.team.map((p,i)=>{
    const hpPct=Math.max(0,p.currentHp/p.maxHp*100),xpPct=Math.min(100,p.xp/p.xpNext*100),f=p.currentHp<=0?'fainted':''
    const candyAmt=ch.candy[p.name]||0
    return '<div class="party-card '+f+'">'+imgTag(p.id,'52px')+
      '<div class="pi"><div class="pn">'+cap(p.name)+(i===ch.battle.playerIdx&&ch.phase!=='idle'?' <span class="active-tag">[OUT]</span>':'')+'</div>'+
      '<div class="pm">CP '+calcCp(p)+' · Lv.'+p.level+(p.status?' · <span class="ch-status-badge '+p.status+'">'+p.status.toUpperCase()+'</span>':'')+'</div>'+
      '<div class="bar-row"><div class="bar-bg"><div class="bar-fill" style="width:'+hpPct+'%;background:linear-gradient(90deg,#4caf50,#8bc34a)"></div></div><span style="font-size:10px">'+p.currentHp+'/'+p.maxHp+'</span></div>'+
      '<div class="bar-row"><div class="bar-bg"><div class="bar-fill" style="width:'+xpPct+'%;background:linear-gradient(90deg,#2196f3,#03a9f4)"></div></div><span style="font-size:10px">XP '+p.xp+'/'+p.xpNext+'</span></div>'+
      '<div style="font-size:10px;color:rgba(255,255,255,0.4);margin-top:2px">🍬 '+candyAmt+(candyAmt>0?' <span style="color:#f7c948;cursor:pointer" onclick="event.stopPropagation();chPowerUp('+i+')">[Power Up]</span>':'')+(i>0&&p.currentHp>0?' · <span style="color:#6390f0;cursor:pointer" onclick="event.stopPropagation();chSetLead('+i+')">[Set Lead]</span>':'')+'</div>'+
    '</div></div>'
  }).join('')
}
function chPowerUp(i){
  const p=ch.team[i],c=ch.candy[p.name]||0
  const cost=Math.floor(p.level*80)
  if(c<1||ch.stardust<cost){document.getElementById('chPartyList').innerHTML+='<div style="color:#f44336;text-align:center;margin-top:8px">Need '+cost+' stardust & 1 candy</div>';return}
  ch.candy[p.name]=c-1;ch.stardust-=cost
  p.level++;Object.keys(p.stats).forEach(k=>p.stats[k]=calcS(p.baseStats[k],p.level,p.iv[k]))
  p.maxHp=calcH(p.baseStats.hp,p.level,p.iv.hp);p.currentHp=p.maxHp
  p.xpNext=p.level*80
  chSave()
  chShowParty();document.getElementById('chPartyList').innerHTML+='<div style="color:#f7c948;text-align:center;margin-top:8px">'+cap(p.name)+' powered up! CP: '+calcCp(p)+'</div>'
}
function chSetLead(i){
  if(i<=0||i>=ch.team.length)return
  const p=ch.team.splice(i,1)[0]
  ch.team.unshift(p)
  chSave()
  chShowParty()
  document.getElementById('chPartyList').innerHTML+='<div style="color:#6390f0;text-align:center;margin-top:8px">⭐ '+cap(p.name)+' is now your lead!</div>'
}
function chBackField(){if(Object.keys(ch.battle).length){showCh('chBattle');chRenderBattle()}else{chShowHub()}}
function chHealAll(){ch.team.forEach(p=>{p.currentHp=p.maxHp;p.status=null});chShowHub();chSave()}

// ===== SAVE / LOAD =====
let chCanSave=true
const SAVE_KEY='pokeChampSave'
function chSave(){
  if(!chCanSave)return
  try{
    const data={team:ch.team,trainerIdx:ch.trainerIdx,winStreak:ch.winStreak,maxStreak:ch.maxStreak,totalWins:ch.totalWins,stardust:ch.stardust,candy:ch.candy,pokeballs:ch.pokeballs}
    localStorage.setItem(SAVE_KEY,JSON.stringify(data))
  }catch(e){}
}
function chLoad(){
  try{
    const raw=localStorage.getItem(SAVE_KEY)
    if(!raw)return false
    const data=JSON.parse(raw)
    ch.team=data.team||[]
    ch.trainerIdx=data.trainerIdx||0
    ch.winStreak=data.winStreak||0
    ch.maxStreak=data.maxStreak||0
    ch.totalWins=data.totalWins||0
    ch.stardust=data.stardust||500
    ch.candy=data.candy||{}
    ch.pokeballs=data.pokeballs||5
    return ch.team.length>0
  }catch(e){return false}
}
function chDeleteSave(){localStorage.removeItem(SAVE_KEY)}

// ===== NUMBER ROLL (RNGdle-style) =====
let nrState={ep:0,rolls:0,badgeCount:0,badges:{},collection:new Set(),lastBadges:[],pastRolls:[],lastEpGain:0,lastBaseEp:0}
let nrStarted=false
const NR_BADGES=[
  // === DIGIT PRESENCE (8) ===
  {id:'has1',name:'Ones',desc:'Contains digit 1',rarity:'Common',ep:500,emoji:'1️⃣',check:n=>/1/.test(n+'')},
  {id:'has2',name:'Twos',desc:'Contains digit 2',rarity:'Common',ep:500,emoji:'2️⃣',check:n=>/2/.test(n+'')},
  {id:'has3',name:'Threes',desc:'Contains digit 3',rarity:'Common',ep:500,emoji:'3️⃣',check:n=>/3/.test(n+'')},
  {id:'has4',name:'Fours',desc:'Contains digit 4',rarity:'Common',ep:500,emoji:'4️⃣',check:n=>/4/.test(n+'')},
  {id:'has5',name:'Fives',desc:'Contains digit 5',rarity:'Common',ep:500,emoji:'5️⃣',check:n=>/5/.test(n+'')},
  {id:'has6',name:'Sixes',desc:'Contains digit 6',rarity:'Common',ep:500,emoji:'6️⃣',check:n=>/6/.test(n+'')},
  {id:'has8',name:'Eights',desc:'Contains digit 8',rarity:'Common',ep:500,emoji:'8️⃣',check:n=>/8/.test(n+'')},
  {id:'has9',name:'Nines',desc:'Contains digit 9',rarity:'Common',ep:500,emoji:'9️⃣',check:n=>/9/.test(n+'')},
  // === ESSENTIAL (24) ===
  {id:'has7',name:'Lucky 7',desc:'Contains digit 7',rarity:'Common',ep:500,emoji:'7️⃣',check:n=>/7/.test(n+'')},
  {id:'has0',name:'Zero',desc:'Contains digit 0',rarity:'Common',ep:500,emoji:'0️⃣',check:n=>/0/.test(n+'')},
  {id:'even',name:'Even Steven',desc:'Number is even',rarity:'Common',ep:500,emoji:'✌️',check:n=>n%2===0},
  {id:'odd',name:'Oddball',desc:'Number is odd',rarity:'Common',ep:500,emoji:'🥚',check:n=>n%2===1},
  {id:'double',name:'Double Up',desc:'Adjacent repeated digit',rarity:'Common',ep:500,emoji:'🔁',check:n=>/(\d)\1/.test(n+'')},
  {id:'has69',name:'Nice',desc:'Contains 69',rarity:'Uncommon',ep:2000,emoji:'😏',check:n=>/69/.test(n+'')},
  {id:'has420',name:'Blaze It',desc:'Contains 420',rarity:'Uncommon',ep:2000,emoji:'🔥',check:n=>/420/.test(n+'')},
  {id:'sum7',name:'Sum of 7',desc:'Digits add up to 7',rarity:'Uncommon',ep:2000,emoji:'7️⃣',check:n=>{const s=n+'';let t=0;for(let i=0;i<s.length;i++)t+=+s[i];return t===7}},
  {id:'under100',name:'Small Fry',desc:'Under 100',rarity:'Uncommon',ep:2000,emoji:'🐟',check:n=>n<100},
  {id:'has777',name:'Jackpot',desc:'Contains 777',rarity:'Rare',ep:10000,emoji:'🎰',check:n=>/777/.test(n+'')},
  {id:'has1337',name:'Elite',desc:'Contains 1337',rarity:'Rare',ep:10000,emoji:'💻',check:n=>/1337/.test(n+'')},
  {id:'palindrome',name:'Palindrome',desc:'Same forwards & backwards',rarity:'Rare',ep:10000,emoji:'🔄',check:n=>{const s=n+'';return s===s.split('').reverse().join('')}},
  {id:'prime',name:'Prime',desc:'Number is prime',rarity:'Rare',ep:10000,emoji:'🔢',check:n=>{if(n<2)return false;for(let i=2;i*i<=n;i++)if(n%i===0)return false;return true}},
  {id:'square',name:'Perfect Square',desc:'Number is a perfect square',rarity:'Rare',ep:10000,emoji:'■',check:n=>{const r=Math.round(Math.sqrt(n));return r*r===n}},
  {id:'power2',name:'Power of Two',desc:'Number is a power of 2',rarity:'Rare',ep:10000,emoji:'💪',check:n=>n>0&&(n&n-1)===0},
  {id:'allsame',name:'All Same',desc:'All digits identical',rarity:'Epic',ep:50000,emoji:'🃏',check:n=>/^(\d)\1+$/.test(n+'')},
  {id:'ascending',name:'Ascending',desc:'Strictly increasing digits',rarity:'Epic',ep:50000,emoji:'📈',check:n=>{const s=n+'';for(let i=1;i<s.length;i++)if(+s[i]<=+s[i-1])return false;return s.length>1}},
  {id:'descending',name:'Descending',desc:'Strictly decreasing digits',rarity:'Epic',ep:50000,emoji:'📉',check:n=>{const s=n+'';for(let i=1;i<s.length;i++)if(+s[i]>=+s[i-1])return false;return s.length>1}},
  {id:'fibonacci',name:'Fibonacci',desc:'In Fibonacci sequence',rarity:'Epic',ep:50000,emoji:'🌀',check:n=>{if(n<2)return true;let a=0,b=1;while(b<n)[a,b]=[b,a+b];return b===n}},
  {id:'exact69',name:'Exact 69',desc:'Exactly 69',rarity:'Epic',ep:50000,emoji:'💯',check:n=>n===69},
  {id:'exact420',name:'Exact 420',desc:'Exactly 420',rarity:'Epic',ep:50000,emoji:'🌿',check:n=>n===420},
  {id:'exact666',name:'Beast',desc:'Exactly 666',rarity:'Epic',ep:50000,emoji:'😈',check:n=>n===666},
  {id:'exact1337',name:'Leet',desc:'Exactly 1337',rarity:'Epic',ep:50000,emoji:'🖥️',check:n=>n===1337},
  {id:'sixofakind',name:'Six of a Kind',desc:'000000–999999',rarity:'Mythic',ep:350000,emoji:'👑',check:n=>/^(\d)\1{5}$/.test(n.toString().padStart(6,'0'))},
  // === NUMBER LENGTH (5) ===
  {id:'len1',name:'Single Digit',desc:'0–9',rarity:'Epic',ep:50000,emoji:'1️⃣',check:n=>n<10},
  {id:'len2',name:'Two Digits',desc:'10–99',rarity:'Rare',ep:10000,emoji:'🔢',check:n=>n>9&&n<100},
  {id:'len3',name:'Three Digits',desc:'100–999',rarity:'Uncommon',ep:2000,emoji:'🔢',check:n=>n>99&&n<1000},
  {id:'len4',name:'Four Digits',desc:'1,000–9,999',rarity:'Common',ep:500,emoji:'🔢',check:n=>n>999&&n<10000},
  {id:'len5',name:'Five Digits',desc:'10,000–99,999',rarity:'Common',ep:500,emoji:'🔢',check:n=>n>9999&&n<100000},
  // === FIRST DIGIT (9) ===
  {id:'fst1',name:'Starts with 1',desc:'First digit is 1',rarity:'Common',ep:500,emoji:'🥇',check:n=>/^1/.test(n+'')},
  {id:'fst2',name:'Starts with 2',desc:'First digit is 2',rarity:'Common',ep:500,emoji:'🥇',check:n=>/^2/.test(n+'')},
  {id:'fst3',name:'Starts with 3',desc:'First digit is 3',rarity:'Common',ep:500,emoji:'🥇',check:n=>/^3/.test(n+'')},
  {id:'fst4',name:'Starts with 4',desc:'First digit is 4',rarity:'Common',ep:500,emoji:'🥇',check:n=>/^4/.test(n+'')},
  {id:'fst5',name:'Starts with 5',desc:'First digit is 5',rarity:'Common',ep:500,emoji:'🥇',check:n=>/^5/.test(n+'')},
  {id:'fst6',name:'Starts with 6',desc:'First digit is 6',rarity:'Common',ep:500,emoji:'🥇',check:n=>/^6/.test(n+'')},
  {id:'fst7',name:'Starts with 7',desc:'First digit is 7',rarity:'Common',ep:500,emoji:'🥇',check:n=>/^7/.test(n+'')},
  {id:'fst8',name:'Starts with 8',desc:'First digit is 8',rarity:'Common',ep:500,emoji:'🥇',check:n=>/^8/.test(n+'')},
  {id:'fst9',name:'Starts with 9',desc:'First digit is 9',rarity:'Common',ep:500,emoji:'🥇',check:n=>/^9/.test(n+'')},
  // === LAST DIGIT (10) ===
  {id:'lst0',name:'Ends with 0',desc:'Last digit is 0',rarity:'Common',ep:500,emoji:'0️⃣',check:n=>n%10===0},
  {id:'lst1',name:'Ends with 1',desc:'Last digit is 1',rarity:'Common',ep:500,emoji:'1️⃣',check:n=>n%10===1},
  {id:'lst2',name:'Ends with 2',desc:'Last digit is 2',rarity:'Common',ep:500,emoji:'2️⃣',check:n=>n%10===2},
  {id:'lst3',name:'Ends with 3',desc:'Last digit is 3',rarity:'Common',ep:500,emoji:'3️⃣',check:n=>n%10===3},
  {id:'lst4',name:'Ends with 4',desc:'Last digit is 4',rarity:'Common',ep:500,emoji:'4️⃣',check:n=>n%10===4},
  {id:'lst5',name:'Ends with 5',desc:'Last digit is 5',rarity:'Common',ep:500,emoji:'5️⃣',check:n=>n%10===5},
  {id:'lst6',name:'Ends with 6',desc:'Last digit is 6',rarity:'Common',ep:500,emoji:'6️⃣',check:n=>n%10===6},
  {id:'lst7',name:'Ends with 7',desc:'Last digit is 7',rarity:'Common',ep:500,emoji:'7️⃣',check:n=>n%10===7},
  {id:'lst8',name:'Ends with 8',desc:'Last digit is 8',rarity:'Common',ep:500,emoji:'8️⃣',check:n=>n%10===8},
  {id:'lst9',name:'Ends with 9',desc:'Last digit is 9',rarity:'Common',ep:500,emoji:'9️⃣',check:n=>n%10===9},
  // === ASCENDING PAIRS (9) ===
  {id:'pr01',name:'0-1 Pair',desc:'Contains 01',rarity:'Uncommon',ep:2000,emoji:'📈',check:n=>/01/.test(n+'')},
  {id:'pr12',name:'1-2 Pair',desc:'Contains 12',rarity:'Uncommon',ep:2000,emoji:'📈',check:n=>/12/.test(n+'')},
  {id:'pr23',name:'2-3 Pair',desc:'Contains 23',rarity:'Uncommon',ep:2000,emoji:'📈',check:n=>/23/.test(n+'')},
  {id:'pr34',name:'3-4 Pair',desc:'Contains 34',rarity:'Uncommon',ep:2000,emoji:'📈',check:n=>/34/.test(n+'')},
  {id:'pr45',name:'4-5 Pair',desc:'Contains 45',rarity:'Uncommon',ep:2000,emoji:'📈',check:n=>/45/.test(n+'')},
  {id:'pr56',name:'5-6 Pair',desc:'Contains 56',rarity:'Uncommon',ep:2000,emoji:'📈',check:n=>/56/.test(n+'')},
  {id:'pr67',name:'6-7 Pair',desc:'Contains 67',rarity:'Uncommon',ep:2000,emoji:'📈',check:n=>/67/.test(n+'')},
  {id:'pr78',name:'7-8 Pair',desc:'Contains 78',rarity:'Uncommon',ep:2000,emoji:'📈',check:n=>/78/.test(n+'')},
  {id:'pr89',name:'8-9 Pair',desc:'Contains 89',rarity:'Uncommon',ep:2000,emoji:'📈',check:n=>/89/.test(n+'')},
  // === DESCENDING PAIRS (9) ===
  {id:'pr10',name:'1-0 Pair',desc:'Contains 10',rarity:'Uncommon',ep:2000,emoji:'📉',check:n=>/10/.test(n+'')},
  {id:'pr21',name:'2-1 Pair',desc:'Contains 21',rarity:'Uncommon',ep:2000,emoji:'📉',check:n=>/21/.test(n+'')},
  {id:'pr32',name:'3-2 Pair',desc:'Contains 32',rarity:'Uncommon',ep:2000,emoji:'📉',check:n=>/32/.test(n+'')},
  {id:'pr43',name:'4-3 Pair',desc:'Contains 43',rarity:'Uncommon',ep:2000,emoji:'📉',check:n=>/43/.test(n+'')},
  {id:'pr54',name:'5-4 Pair',desc:'Contains 54',rarity:'Uncommon',ep:2000,emoji:'📉',check:n=>/54/.test(n+'')},
  {id:'pr65',name:'6-5 Pair',desc:'Contains 65',rarity:'Uncommon',ep:2000,emoji:'📉',check:n=>/65/.test(n+'')},
  {id:'pr76',name:'7-6 Pair',desc:'Contains 76',rarity:'Uncommon',ep:2000,emoji:'📉',check:n=>/76/.test(n+'')},
  {id:'pr87',name:'8-7 Pair',desc:'Contains 87',rarity:'Uncommon',ep:2000,emoji:'📉',check:n=>/87/.test(n+'')},
  {id:'pr98',name:'9-8 Pair',desc:'Contains 98',rarity:'Uncommon',ep:2000,emoji:'📉',check:n=>/98/.test(n+'')},
  // === THREE CONSECUTIVE (14) ===
  {id:'tr123',name:'1-2-3',desc:'Contains 123',rarity:'Rare',ep:10000,emoji:'📈',check:n=>/123/.test(n+'')},
  {id:'tr234',name:'2-3-4',desc:'Contains 234',rarity:'Rare',ep:10000,emoji:'📈',check:n=>/234/.test(n+'')},
  {id:'tr345',name:'3-4-5',desc:'Contains 345',rarity:'Rare',ep:10000,emoji:'📈',check:n=>/345/.test(n+'')},
  {id:'tr456',name:'4-5-6',desc:'Contains 456',rarity:'Rare',ep:10000,emoji:'📈',check:n=>/456/.test(n+'')},
  {id:'tr567',name:'5-6-7',desc:'Contains 567',rarity:'Rare',ep:10000,emoji:'📈',check:n=>/567/.test(n+'')},
  {id:'tr678',name:'6-7-8',desc:'Contains 678',rarity:'Rare',ep:10000,emoji:'📈',check:n=>/678/.test(n+'')},
  {id:'tr789',name:'7-8-9',desc:'Contains 789',rarity:'Rare',ep:10000,emoji:'📈',check:n=>/789/.test(n+'')},
  {id:'tr321',name:'3-2-1',desc:'Contains 321',rarity:'Rare',ep:10000,emoji:'📉',check:n=>/321/.test(n+'')},
  {id:'tr432',name:'4-3-2',desc:'Contains 432',rarity:'Rare',ep:10000,emoji:'📉',check:n=>/432/.test(n+'')},
  {id:'tr543',name:'5-4-3',desc:'Contains 543',rarity:'Rare',ep:10000,emoji:'📉',check:n=>/543/.test(n+'')},
  {id:'tr654',name:'6-5-4',desc:'Contains 654',rarity:'Rare',ep:10000,emoji:'📉',check:n=>/654/.test(n+'')},
  {id:'tr765',name:'7-6-5',desc:'Contains 765',rarity:'Rare',ep:10000,emoji:'📉',check:n=>/765/.test(n+'')},
  {id:'tr876',name:'8-7-6',desc:'Contains 876',rarity:'Rare',ep:10000,emoji:'📉',check:n=>/876/.test(n+'')},
  {id:'tr987',name:'9-8-7',desc:'Contains 987',rarity:'Rare',ep:10000,emoji:'📉',check:n=>/987/.test(n+'')},
  // === FOUR CONSECUTIVE (12) ===
  {id:'qr1234',name:'1-2-3-4',desc:'Contains 1234',rarity:'Rare',ep:10000,emoji:'📈',check:n=>/1234/.test(n+'')},
  {id:'qr2345',name:'2-3-4-5',desc:'Contains 2345',rarity:'Rare',ep:10000,emoji:'📈',check:n=>/2345/.test(n+'')},
  {id:'qr3456',name:'3-4-5-6',desc:'Contains 3456',rarity:'Rare',ep:10000,emoji:'📈',check:n=>/3456/.test(n+'')},
  {id:'qr4567',name:'4-5-6-7',desc:'Contains 4567',rarity:'Rare',ep:10000,emoji:'📈',check:n=>/4567/.test(n+'')},
  {id:'qr5678',name:'5-6-7-8',desc:'Contains 5678',rarity:'Rare',ep:10000,emoji:'📈',check:n=>/5678/.test(n+'')},
  {id:'qr6789',name:'6-7-8-9',desc:'Contains 6789',rarity:'Rare',ep:10000,emoji:'📈',check:n=>/6789/.test(n+'')},
  {id:'qr4321',name:'4-3-2-1',desc:'Contains 4321',rarity:'Rare',ep:10000,emoji:'📉',check:n=>/4321/.test(n+'')},
  {id:'qr5432',name:'5-4-3-2',desc:'Contains 5432',rarity:'Rare',ep:10000,emoji:'📉',check:n=>/5432/.test(n+'')},
  {id:'qr6543',name:'6-5-4-3',desc:'Contains 6543',rarity:'Rare',ep:10000,emoji:'📉',check:n=>/6543/.test(n+'')},
  {id:'qr7654',name:'7-6-5-4',desc:'Contains 7654',rarity:'Rare',ep:10000,emoji:'📉',check:n=>/7654/.test(n+'')},
  {id:'qr8765',name:'8-7-6-5',desc:'Contains 8765',rarity:'Rare',ep:10000,emoji:'📉',check:n=>/8765/.test(n+'')},
  {id:'qr9876',name:'9-8-7-6',desc:'Contains 9876',rarity:'Rare',ep:10000,emoji:'📉',check:n=>/9876/.test(n+'')},
  // === FIVE CONSECUTIVE (10) ===
  {id:'qv12345',name:'1-2-3-4-5',desc:'Contains 12345',rarity:'Epic',ep:50000,emoji:'📈',check:n=>/12345/.test(n+'')},
  {id:'qv23456',name:'2-3-4-5-6',desc:'Contains 23456',rarity:'Epic',ep:50000,emoji:'📈',check:n=>/23456/.test(n+'')},
  {id:'qv34567',name:'3-4-5-6-7',desc:'Contains 34567',rarity:'Epic',ep:50000,emoji:'📈',check:n=>/34567/.test(n+'')},
  {id:'qv45678',name:'4-5-6-7-8',desc:'Contains 45678',rarity:'Epic',ep:50000,emoji:'📈',check:n=>/45678/.test(n+'')},
  {id:'qv56789',name:'5-6-7-8-9',desc:'Contains 56789',rarity:'Epic',ep:50000,emoji:'📈',check:n=>/56789/.test(n+'')},
  {id:'qv54321',name:'5-4-3-2-1',desc:'Contains 54321',rarity:'Epic',ep:50000,emoji:'📉',check:n=>/54321/.test(n+'')},
  {id:'qv65432',name:'6-5-4-3-2',desc:'Contains 65432',rarity:'Epic',ep:50000,emoji:'📉',check:n=>/65432/.test(n+'')},
  {id:'qv76543',name:'7-6-5-4-3',desc:'Contains 76543',rarity:'Epic',ep:50000,emoji:'📉',check:n=>/76543/.test(n+'')},
  {id:'qv87654',name:'8-7-6-5-4',desc:'Contains 87654',rarity:'Epic',ep:50000,emoji:'📉',check:n=>/87654/.test(n+'')},
  {id:'qv98765',name:'9-8-7-6-5',desc:'Contains 98765',rarity:'Epic',ep:50000,emoji:'📉',check:n=>/98765/.test(n+'')},
  // === SIX CONSECUTIVE (8) ===
  {id:'sx123456',name:'1-2-3-4-5-6',desc:'Contains 123456',rarity:'Epic',ep:50000,emoji:'📈',check:n=>/123456/.test(n+'')},
  {id:'sx234567',name:'2-3-4-5-6-7',desc:'Contains 234567',rarity:'Epic',ep:50000,emoji:'📈',check:n=>/234567/.test(n+'')},
  {id:'sx345678',name:'3-4-5-6-7-8',desc:'Contains 345678',rarity:'Epic',ep:50000,emoji:'📈',check:n=>/345678/.test(n+'')},
  {id:'sx456789',name:'4-5-6-7-8-9',desc:'Contains 456789',rarity:'Epic',ep:50000,emoji:'📈',check:n=>/456789/.test(n+'')},
  {id:'sx654321',name:'6-5-4-3-2-1',desc:'Contains 654321',rarity:'Epic',ep:50000,emoji:'📉',check:n=>/654321/.test(n+'')},
  {id:'sx765432',name:'7-6-5-4-3-2',desc:'Contains 765432',rarity:'Epic',ep:50000,emoji:'📉',check:n=>/765432/.test(n+'')},
  {id:'sx876543',name:'8-7-6-5-4-3',desc:'Contains 876543',rarity:'Epic',ep:50000,emoji:'📉',check:n=>/876543/.test(n+'')},
  {id:'sx987654',name:'9-8-7-6-5-4',desc:'Contains 987654',rarity:'Epic',ep:50000,emoji:'📉',check:n=>/987654/.test(n+'')},
  // === DIVISIBILITY (22) ===
  {id:'dv3',name:'Divisible by 3',desc:'Number is divisible by 3',rarity:'Common',ep:500,emoji:'3️⃣',check:n=>n%3===0},
  {id:'dv4',name:'Divisible by 4',desc:'Number is divisible by 4',rarity:'Common',ep:500,emoji:'4️⃣',check:n=>n%4===0},
  {id:'dv5',name:'Divisible by 5',desc:'Number is divisible by 5',rarity:'Common',ep:500,emoji:'5️⃣',check:n=>n%5===0},
  {id:'dv6',name:'Divisible by 6',desc:'Number is divisible by 6',rarity:'Common',ep:500,emoji:'6️⃣',check:n=>n%6===0},
  {id:'dv7',name:'Divisible by 7',desc:'Number is divisible by 7',rarity:'Uncommon',ep:2000,emoji:'7️⃣',check:n=>n%7===0},
  {id:'dv8',name:'Divisible by 8',desc:'Number is divisible by 8',rarity:'Uncommon',ep:2000,emoji:'8️⃣',check:n=>n%8===0},
  {id:'dv9',name:'Divisible by 9',desc:'Number is divisible by 9',rarity:'Uncommon',ep:2000,emoji:'9️⃣',check:n=>n%9===0},
  {id:'dv10',name:'Divisible by 10',desc:'Number is divisible by 10',rarity:'Common',ep:500,emoji:'🔟',check:n=>n%10===0},
  {id:'dv11',name:'Divisible by 11',desc:'Number is divisible by 11',rarity:'Uncommon',ep:2000,emoji:'1️⃣1️⃣',check:n=>n%11===0},
  {id:'dv12',name:'Divisible by 12',desc:'Number is divisible by 12',rarity:'Uncommon',ep:2000,emoji:'1️⃣2️⃣',check:n=>n%12===0},
  {id:'dv13',name:'Divisible by 13',desc:'Number is divisible by 13',rarity:'Uncommon',ep:2000,emoji:'1️⃣3️⃣',check:n=>n%13===0},
  {id:'dv14',name:'Divisible by 14',desc:'Number is divisible by 14',rarity:'Uncommon',ep:2000,emoji:'1️⃣4️⃣',check:n=>n%14===0},
  {id:'dv15',name:'Divisible by 15',desc:'Number is divisible by 15',rarity:'Uncommon',ep:2000,emoji:'1️⃣5️⃣',check:n=>n%15===0},
  {id:'dv16',name:'Divisible by 16',desc:'Number is divisible by 16',rarity:'Rare',ep:10000,emoji:'1️⃣6️⃣',check:n=>n%16===0},
  {id:'dv17',name:'Divisible by 17',desc:'Number is divisible by 17',rarity:'Rare',ep:10000,emoji:'1️⃣7️⃣',check:n=>n%17===0},
  {id:'dv18',name:'Divisible by 18',desc:'Number is divisible by 18',rarity:'Rare',ep:10000,emoji:'1️⃣8️⃣',check:n=>n%18===0},
  {id:'dv19',name:'Divisible by 19',desc:'Number is divisible by 19',rarity:'Rare',ep:10000,emoji:'1️⃣9️⃣',check:n=>n%19===0},
  {id:'dv20',name:'Divisible by 20',desc:'Number is divisible by 20',rarity:'Rare',ep:10000,emoji:'2️⃣0️⃣',check:n=>n%20===0},
  {id:'dv25',name:'Divisible by 25',desc:'Number is divisible by 25',rarity:'Rare',ep:10000,emoji:'2️⃣5️⃣',check:n=>n%25===0},
  {id:'dv50',name:'Divisible by 50',desc:'Number is divisible by 50',rarity:'Rare',ep:10000,emoji:'5️⃣0️⃣',check:n=>n%50===0},
  {id:'dv100',name:'Divisible by 100',desc:'Number is divisible by 100',rarity:'Rare',ep:10000,emoji:'💯',check:n=>n%100===0},
  {id:'dv1000',name:'Divisible by 1000',desc:'Number is divisible by 1000',rarity:'Epic',ep:50000,emoji:'💎',check:n=>n%1000===0},
  // === SUM RANGES (7) ===
  {id:'sm1_5',name:'Tiny Sum',desc:'Digit sum 1–5',rarity:'Common',ep:500,emoji:'⬇️',check:n=>{const s=n+'';let t=0;for(let i=0;i<s.length;i++)t+=+s[i];return t>0&&t<6}},
  {id:'sm6_10',name:'Small Sum',desc:'Digit sum 6–10',rarity:'Common',ep:500,emoji:'🔽',check:n=>{const s=n+'';let t=0;for(let i=0;i<s.length;i++)t+=+s[i];return t>5&&t<11}},
  {id:'sm11_15',name:'Medium Sum',desc:'Digit sum 11–15',rarity:'Common',ep:500,emoji:'⏸️',check:n=>{const s=n+'';let t=0;for(let i=0;i<s.length;i++)t+=+s[i];return t>10&&t<16}},
  {id:'sm16_20',name:'Large Sum',desc:'Digit sum 16–20',rarity:'Common',ep:500,emoji:'🔼',check:n=>{const s=n+'';let t=0;for(let i=0;i<s.length;i++)t+=+s[i];return t>15&&t<21}},
  {id:'sm21_25',name:'Big Sum',desc:'Digit sum 21–25',rarity:'Uncommon',ep:2000,emoji:'⬆️',check:n=>{const s=n+'';let t=0;for(let i=0;i<s.length;i++)t+=+s[i];return t>20&&t<26}},
  {id:'sm26_30',name:'Huge Sum',desc:'Digit sum 26–30',rarity:'Uncommon',ep:2000,emoji:'🚀',check:n=>{const s=n+'';let t=0;for(let i=0;i<s.length;i++)t+=+s[i];return t>25&&t<31}},
  {id:'sm31_54',name:'Max Sum',desc:'Digit sum 31–54',rarity:'Rare',ep:10000,emoji:'💥',check:n=>{const s=n+'';let t=0;for(let i=0;i<s.length;i++)t+=+s[i];return t>30}},
  // === EXACT NUMBERS (25) ===
  {id:'ex7',name:'Exactly Seven',desc:'Number is exactly 7',rarity:'Epic',ep:50000,emoji:'7️⃣',check:n=>n===7},
  {id:'ex42',name:'Answer to Life',desc:'Number is exactly 42',rarity:'Epic',ep:50000,emoji:'🌌',check:n=>n===42},
  {id:'ex99',name:'99 Problems',desc:'Number is exactly 99',rarity:'Epic',ep:50000,emoji:'🎵',check:n=>n===99},
  {id:'ex100',name:'Century',desc:'Number is exactly 100',rarity:'Epic',ep:50000,emoji:'🏆',check:n=>n===100},
  {id:'ex111',name:'Triple Ones',desc:'Number is exactly 111',rarity:'Epic',ep:50000,emoji:'🥇',check:n=>n===111},
  {id:'ex123',name:'1-2-3',desc:'Number is exactly 123',rarity:'Epic',ep:50000,emoji:'🔢',check:n=>n===123},
  {id:'ex222',name:'Triple Twos',desc:'Number is exactly 222',rarity:'Epic',ep:50000,emoji:'2️⃣',check:n=>n===222},
  {id:'ex333',name:'Triple Threes',desc:'Number is exactly 333',rarity:'Epic',ep:50000,emoji:'3️⃣',check:n=>n===333},
  {id:'ex444',name:'Triple Fours',desc:'Number is exactly 444',rarity:'Epic',ep:50000,emoji:'4️⃣',check:n=>n===444},
  {id:'ex555',name:'Triple Fives',desc:'Number is exactly 555',rarity:'Epic',ep:50000,emoji:'5️⃣',check:n=>n===555},
  {id:'ex777',name:'Triple Sevens',desc:'Number is exactly 777',rarity:'Epic',ep:50000,emoji:'🎰',check:n=>n===777},
  {id:'ex888',name:'Triple Eights',desc:'Number is exactly 888',rarity:'Epic',ep:50000,emoji:'8️⃣',check:n=>n===888},
  {id:'ex999',name:'Triple Nines',desc:'Number is exactly 999',rarity:'Epic',ep:50000,emoji:'9️⃣',check:n=>n===999},
  {id:'ex1000',name:'Grand',desc:'Number is exactly 1000',rarity:'Epic',ep:50000,emoji:'💵',check:n=>n===1000},
  {id:'ex1111',name:'Four Ones',desc:'Number is exactly 1111',rarity:'Epic',ep:50000,emoji:'1️⃣',check:n=>n===1111},
  {id:'ex1234',name:'Staircase',desc:'Number is exactly 1234',rarity:'Epic',ep:50000,emoji:'🪜',check:n=>n===1234},
  {id:'ex4321',name:'Reverse Staircase',desc:'Number is exactly 4321',rarity:'Epic',ep:50000,emoji:'🪜',check:n=>n===4321},
  {id:'ex7777',name:'Four Sevens',desc:'Number is exactly 7777',rarity:'Epic',ep:50000,emoji:'🎰',check:n=>n===7777},
  {id:'ex9999',name:'Four Nines',desc:'Number is exactly 9999',rarity:'Epic',ep:50000,emoji:'9️⃣',check:n=>n===9999},
  {id:'ex10000',name:'Ten Grand',desc:'Number is exactly 10000',rarity:'Epic',ep:50000,emoji:'💎',check:n=>n===10000},
  {id:'ex12345',name:'Full Staircase',desc:'Number is exactly 12345',rarity:'Epic',ep:50000,emoji:'🪜',check:n=>n===12345},
  {id:'ex54321',name:'Reverse Full',desc:'Number is exactly 54321',rarity:'Epic',ep:50000,emoji:'🪜',check:n=>n===54321},
  {id:'ex100000',name:'Hundred Grand',desc:'Number is exactly 100000',rarity:'Epic',ep:50000,emoji:'💰',check:n=>n===100000},
  {id:'ex404',name:'Not Found',desc:'Number is exactly 404',rarity:'Epic',ep:50000,emoji:'🌐',check:n=>n===404},
  {id:'ex911',name:'Emergency',desc:'Number is exactly 911',rarity:'Epic',ep:50000,emoji:'🚨',check:n=>n===911},
  // === MATH PROPERTIES (20) ===
  {id:'cube',name:'Perfect Cube',desc:'Number is a perfect cube',rarity:'Rare',ep:10000,emoji:'🧊',check:n=>{const r=Math.round(Math.cbrt(n));return r*r*r===n}},
  {id:'triangular',name:'Triangular',desc:'Number is triangular (n(n+1)/2)',rarity:'Rare',ep:10000,emoji:'🔺',check:n=>{const d=Math.sqrt(8*n+1);return d===Math.floor(d)}},
  {id:'factorial',name:'Factorial',desc:'Number is a factorial (1,2,6,24,120,...)',rarity:'Epic',ep:50000,emoji:'❗',check:n=>{if(n<1)return n===1;let f=1;for(let i=2;f<n;i++)f*=i;return f===n}},
  {id:'harshad',name:'Harshad',desc:'Divisible by sum of its digits',rarity:'Uncommon',ep:2000,emoji:'🪷',check:n=>{const s=n+'';let t=0;for(let i=0;i<s.length;i++)t+=+s[i];return t>0&&n%t===0}},
  {id:'pow3',name:'Power of 3',desc:'Number is a power of 3',rarity:'Rare',ep:10000,emoji:'3️⃣',check:n=>{if(n<1)return false;while(n%3===0)n/=3;return n===1}},
  {id:'pow5',name:'Power of 5',desc:'Number is a power of 5',rarity:'Rare',ep:10000,emoji:'5️⃣',check:n=>{if(n<1)return false;while(n%5===0)n/=5;return n===1}},
  {id:'pow7',name:'Power of 7',desc:'Number is a power of 7',rarity:'Rare',ep:10000,emoji:'7️⃣',check:n=>{if(n<1)return false;while(n%7===0)n/=7;return n===1}},
  {id:'pow10',name:'Power of 10',desc:'Number is a power of 10',rarity:'Epic',ep:50000,emoji:'🔟',check:n=>{const s=n+'';return /^10*$/.test(s)}},
  {id:'mersenne',name:'Mersenne',desc:'One less than a power of 2 (2ⁿ–1)',rarity:'Rare',ep:10000,emoji:'📐',check:n=>{if(n<1)return false;return (n&(n+1))===0}},
  {id:'repunit',name:'Repunit',desc:'Number is all 1s (1, 11, 111, ...)',rarity:'Epic',ep:50000,emoji:'1️⃣',check:n=>/^1+$/.test(n+'')},
  {id:'evil',name:'Evil Number',desc:'Binary has an even number of 1s',rarity:'Uncommon',ep:2000,emoji:'😈',check:n=>{let c=0;const s=n.toString(2);for(let i=0;i<s.length;i++)if(s[i]==='1')c++;return c%2===0&&n>0}},
  {id:'odious',name:'Odious Number',desc:'Binary has an odd number of 1s',rarity:'Uncommon',ep:2000,emoji:'👹',check:n=>{let c=0;const s=n.toString(2);for(let i=0;i<s.length;i++)if(s[i]==='1')c++;return c%2===1}},
  {id:'binarypal',name:'Binary Palindrome',desc:'Binary representation is a palindrome',rarity:'Rare',ep:10000,emoji:'🔄',check:n=>{const b=n.toString(2);return b===b.split('').reverse().join('')&&n>0}},
  {id:'automorphic',name:'Automorphic',desc:'Square ends with the number itself',rarity:'Rare',ep:10000,emoji:'🪞',check:n=>{const sq=n*n+'';return sq.endsWith(n+'')}},
  {id:'abundant',name:'Abundant',desc:'Sum of proper divisors > number',rarity:'Rare',ep:10000,emoji:'📤',check:n=>{if(n<2)return false;let s=1;for(let i=2;i*i<=n;i++){if(n%i===0){s+=i;if(i*i!==n)s+=n/i}}return s>n}},
  {id:'deficient',name:'Deficient',desc:'Sum of proper divisors < number',rarity:'Common',ep:500,emoji:'📥',check:n=>{if(n<2)return n===1;let s=1;for(let i=2;i*i<=n;i++){if(n%i===0){s+=i;if(i*i!==n)s+=n/i}}return s<n}},
  {id:'semiprime',name:'Semiprime',desc:'Product of exactly two primes',rarity:'Rare',ep:10000,emoji:'🔬',check:n=>{if(n<4)return false;let c=0;for(let i=2;i*i<=n&&c<3;i++){while(n%i===0){n/=i;c++}}if(n>1)c++;return c===2}},
  {id:'perfectnum',name:'Perfect Number',desc:'Sum of proper divisors equals the number',rarity:'Mythic',ep:350000,emoji:'✨',check:n=>{if(n<2)return false;let s=1;for(let i=2;i*i<=n;i++){if(n%i===0){s+=i;if(i*i!==n)s+=n/i}}return s===n}},
  {id:'smith',name:'Smith Number',desc:'Digit sum equals prime factor digit sum',rarity:'Epic',ep:50000,emoji:'🔧',check:n=>{function ds(x){return (x+'').split('').reduce((a,b)=>a+ +b,0)}if(n<2||/^1+$/.test(n+''))return false;let t=n,f=0,fs=0;for(let i=2;i*i<=t;i++){while(t%i===0){fs+=ds(i);t/=i;f++}}if(t>1){fs+=ds(t);f++}return f>1&&ds(n)===fs}},
  // === POKEMON REFERENCES (15) ===
  {id:'p25',name:'Pika Sighting',desc:'Contains 25',rarity:'Uncommon',ep:2000,emoji:'⚡',check:n=>/25/.test(n+'')},
  {id:'p150',name:'Mewtwo Sighting',desc:'Contains 150',rarity:'Uncommon',ep:2000,emoji:'🧬',check:n=>/150/.test(n+'')},
  {id:'p151',name:'Mew Sighting',desc:'Contains 151',rarity:'Uncommon',ep:2000,emoji:'🩷',check:n=>/151/.test(n+'')},
  {id:'p248',name:'Tyranitar',desc:'Contains 248',rarity:'Rare',ep:10000,emoji:'🦖',check:n=>/248/.test(n+'')},
  {id:'p373',name:'Salamence',desc:'Contains 373',rarity:'Rare',ep:10000,emoji:'🐉',check:n=>/373/.test(n+'')},
  {id:'p384',name:'Rayquaza',desc:'Contains 384',rarity:'Rare',ep:10000,emoji:'🌌',check:n=>/384/.test(n+'')},
  {id:'p448',name:'Lucario',desc:'Contains 448',rarity:'Rare',ep:10000,emoji:'🐕',check:n=>/448/.test(n+'')},
  {id:'p658',name:'Greninja',desc:'Contains 658',rarity:'Rare',ep:10000,emoji:'🐸',check:n=>/658/.test(n+'')},
  {id:'p700',name:'Sylveon',desc:'Contains 700',rarity:'Rare',ep:10000,emoji:'🎀',check:n=>/700/.test(n+'')},
  {id:'p778',name:'Mimikyu',desc:'Contains 778',rarity:'Rare',ep:10000,emoji:'👻',check:n=>/778/.test(n+'')},
  {id:'p887',name:'Dragapult',desc:'Contains 887',rarity:'Epic',ep:50000,emoji:'🐉',check:n=>/887/.test(n+'')},
  {id:'p1008',name:'Miraidon',desc:'Contains 1008',rarity:'Epic',ep:50000,emoji:'⚡',check:n=>/1008/.test(n+'')},
  // === PATTERN BADGES (16) ===
  {id:'ababa',name:'A-B-A-B-A',desc:'5-digit alternating pattern (e.g. 12121)',rarity:'Rare',ep:10000,emoji:'🔁',check:n=>{const s=n+'';return s.length===5&&s[0]===s[2]&&s[2]===s[4]&&s[1]===s[3]&&s[0]!==s[1]}},
  {id:'ababab',name:'A-B-A-B-A-B',desc:'6-digit alternating pattern (e.g. 121212)',rarity:'Rare',ep:10000,emoji:'🔁',check:n=>{const s=n+'';return s.length===6&&s[0]===s[2]&&s[2]===s[4]&&s[1]===s[3]&&s[3]===s[5]&&s[0]!==s[1]}},
  {id:'aabbaa',name:'A-A-B-B-A-A',desc:'6-digit pattern (e.g. 112211)',rarity:'Epic',ep:50000,emoji:'🔂',check:n=>{const s=n+'';return s.length===6&&s[0]===s[1]&&s[1]===s[4]&&s[4]===s[5]&&s[2]===s[3]&&s[0]!==s[2]}},
  {id:'abcabc',name:'A-B-C-A-B-C',desc:'6-digit pattern (e.g. 123123)',rarity:'Epic',ep:50000,emoji:'🔃',check:n=>{const s=n+'';return s.length===6&&s[0]===s[3]&&s[1]===s[4]&&s[2]===s[5]&&s[0]!==s[1]&&s[1]!==s[2]}},
  {id:'aabbcc',name:'A-A-B-B-C-C',desc:'6-digit pattern (e.g. 112233)',rarity:'Epic',ep:50000,emoji:'🔲',check:n=>{const s=n+'';return s.length===6&&s[0]===s[1]&&s[2]===s[3]&&s[4]===s[5]&&s[0]!==s[2]&&s[2]!==s[4]}},
  {id:'aabbb',name:'A-A-B-B-B',desc:'5-digit pattern (e.g. 11777)',rarity:'Rare',ep:10000,emoji:'🔳',check:n=>{const s=n+'';return s.length===5&&s[0]===s[1]&&s[2]===s[3]&&s[3]===s[4]}},
  {id:'aaabbb',name:'A-A-A-B-B-B',desc:'6-digit pattern (e.g. 111777)',rarity:'Epic',ep:50000,emoji:'🔲',check:n=>{const s=n+'';return s.length===6&&s[0]===s[1]&&s[1]===s[2]&&s[3]===s[4]&&s[4]===s[5]&&s[0]!==s[3]}},
  {id:'abcddcba',name:'Mirror Pairs',desc:'6-digit palindrome-like (e.g. 123321)',rarity:'Epic',ep:50000,emoji:'🪞',check:n=>{const s=n+'';return s.length===6&&s[0]===s[5]&&s[1]===s[4]&&s[2]===s[3]}},
  {id:'fiveofakind',name:'Five of a Kind',desc:'5 identical digits (e.g. 77770)',rarity:'Epic',ep:50000,emoji:'🃏',check:n=>{const s=n+'';for(let d=0;d<10;d++){const r=new RegExp('^'+d+'{5}|'+d+'{5}$');if(r.test(s))return true}return false}},
  {id:'fourconsec',name:'Four Repeat',desc:'Four consecutive identical digits',rarity:'Rare',ep:10000,emoji:'4️⃣',check:n=>/(\d)\1{3}/.test(n+'')},
  // === RANGE & BOUNDARY (14) ===
  {id:'under10',name:'Under 10',desc:'Number is 0–9',rarity:'Epic',ep:50000,emoji:'⬇️',check:n=>n<10},
  {id:'under50',name:'Under 50',desc:'Number is 0–49',rarity:'Rare',ep:10000,emoji:'⬇️',check:n=>n<50},
  {id:'under500',name:'Under 500',desc:'Number is 0–499',rarity:'Uncommon',ep:2000,emoji:'⬇️',check:n=>n<500},
  {id:'under5000',name:'Under 5K',desc:'Number is 0–4,999',rarity:'Common',ep:500,emoji:'⬇️',check:n=>n<5000},
  {id:'over900k',name:'Over 900K',desc:'Number is over 900,000',rarity:'Uncommon',ep:2000,emoji:'💪',check:n=>n>900000},
  {id:'over990k',name:'Over 990K',desc:'Number is over 990,000',rarity:'Rare',ep:10000,emoji:'📈',check:n=>n>990000},
  {id:'over999k',name:'Over 999K',desc:'Number is over 999,000',rarity:'Rare',ep:10000,emoji:'🔥',check:n=>n>999000},
  {id:'inthemiddle',name:'500K Club',desc:'Number is 500,000–599,999',rarity:'Common',ep:500,emoji:'🎯',check:n=>n>499999&&n<600000},
  {id:'round100',name:'Round 100',desc:'Multiple of 100',rarity:'Uncommon',ep:2000,emoji:'💯',check:n=>n%100===0},
  {id:'round1000',name:'Round 1000',desc:'Multiple of 1000',rarity:'Rare',ep:10000,emoji:'💎',check:n=>n%1000===0},
  {id:'round10000',name:'Round 10000',desc:'Multiple of 10000',rarity:'Epic',ep:50000,emoji:'👑',check:n=>n%10000===0},
  // === MEME & CULTURE (12) ===
  {id:'exact88',name:'88',desc:'Exactly 88',rarity:'Epic',ep:50000,emoji:'🎱',check:n=>n===88},
  {id:'exact101',name:'101',desc:'Exactly 101 (Dalmatians)',rarity:'Epic',ep:50000,emoji:'🐕',check:n=>n===101},
  {id:'exact200',name:'200',desc:'Exactly 200',rarity:'Epic',ep:50000,emoji:'2️⃣',check:n=>n===200},
  {id:'exact300',name:'300',desc:'Exactly 300 (Spartans)',rarity:'Epic',ep:50000,emoji:'⚔️',check:n=>n===300},
  {id:'exact500',name:'500',desc:'Exactly 500',rarity:'Epic',ep:50000,emoji:'5️⃣',check:n=>n===500},
  {id:'exact616',name:'616',desc:'Exactly 616 (alternate beast)',rarity:'Epic',ep:50000,emoji:'😈',check:n=>n===616},
  {id:'exact800',name:'800',desc:'Exactly 800',rarity:'Epic',ep:50000,emoji:'8️⃣',check:n=>n===800},
  {id:'exact867',name:'5309',desc:'Exactly 867 (Jenny)',rarity:'Epic',ep:50000,emoji:'📞',check:n=>n===867},
  {id:'exact1331',name:'1331',desc:'Exactly 1331 (11³)',rarity:'Epic',ep:50000,emoji:'📐',check:n=>n===1331},
  {id:'exact1729',name:'1729',desc:'Exactly 1729 (Ramanujan)',rarity:'Epic',ep:50000,emoji:'🧮',check:n=>n===1729},
  {id:'exact8008',name:'8008',desc:'Exactly 8008 (BOOB)',rarity:'Epic',ep:50000,emoji:'🫣',check:n=>n===8008},
  {id:'exact86753',name:'867-5309',desc:'Exactly 86753 (Jenny)',rarity:'Epic',ep:50000,emoji:'🎵',check:n=>n===86753},
  // === ADDITIONAL DIGIT PATTERNS (14) ===
  {id:'noeven',name:'No Even Digits',desc:'All digits are odd (0 evens)',rarity:'Uncommon',ep:2000,emoji:'🟧',check:n=>/^[13579]+$/.test(n+'')},
  {id:'noodd',name:'No Odd Digits',desc:'All digits are even (0 odds)',rarity:'Uncommon',ep:2000,emoji:'🟩',check:n=>/^[02468]+$/.test(n+'')},
  {id:'only01',name:'Binary Digits',desc:'Only digits 0 and 1',rarity:'Rare',ep:10000,emoji:'💻',check:n=>/^[01]+$/.test(n+'')},
  {id:'only012',name:'Ternary Digits',desc:'Only digits 0, 1, 2',rarity:'Uncommon',ep:2000,emoji:'🔢',check:n=>/^[012]+$/.test(n+'')},
  {id:'only89',name:'High Digits',desc:'Only digits 8 and 9',rarity:'Epic',ep:50000,emoji:'📈',check:n=>/^[89]+$/.test(n+'')},
  {id:'nostraight',name:'No Straight',desc:'No consecutive digits (e.g. 13579)',rarity:'Common',ep:500,emoji:'🔀',check:n=>{const s=n+'';for(let i=1;i<s.length;i++)if(Math.abs(+s[i]- +s[i-1])===1)return false;return true}},
  {id:'gap2',name:'Gap of 2',desc:'Each digit differs by 2 (e.g. 13579)',rarity:'Rare',ep:10000,emoji:'📏',check:n=>{const s=n+'';for(let i=1;i<s.length;i++)if(Math.abs(+s[i]- +s[i-1])!==2)return false;return s.length>1}},
  {id:'combo',name:'Combo Breaker',desc:'No repeated digits',rarity:'Uncommon',ep:2000,emoji:'🚫',check:n=>{const s=n+'';for(let i=0;i<s.length;i++)for(let j=i+1;j<s.length;j++)if(s[i]===s[j])return false;return true}},
  {id:'twopair',name:'Two Pairs',desc:'Two different repeated digits (e.g. 11234)',rarity:'Rare',ep:10000,emoji:'🃏',check:n=>{const s=n+'';const c={};for(let i=0;i<s.length;i++)c[s[i]]=(c[s[i]]||0)+1;return Object.values(c).filter(x=>x>1).length>=2}},
  {id:'fullhouse',name:'Full House',desc:'Three of one digit, two of another',rarity:'Epic',ep:50000,emoji:'🏠',check:n=>{const s=n+'';const c={};for(let i=0;i<s.length;i++)c[s[i]]=(c[s[i]]||0)+1;const v=Object.values(c);return v.includes(3)&&v.includes(2)}},
  {id:'firstlast',name:'Bookends',desc:'First and last digit match',rarity:'Common',ep:500,emoji:'📚',check:n=>{const s=n+'';return s.length>1&&s[0]===s[s.length-1]}},
  {id:'rising',name:'Rising Tide',desc:'Each digit >= previous',rarity:'Uncommon',ep:2000,emoji:'📈',check:n=>{const s=n+'';for(let i=1;i<s.length;i++)if(+s[i]<+s[i-1])return false;return s.length>1}},
  {id:'falling',name:'Falling Star',desc:'Each digit <= previous',rarity:'Uncommon',ep:2000,emoji:'📉',check:n=>{const s=n+'';for(let i=1;i<s.length;i++)if(+s[i]>+s[i-1])return false;return s.length>1}},
  {id:'pyramid',name:'Pyramid',desc:'Digits go up then down (e.g. 12321)',rarity:'Epic',ep:50000,emoji:'🔺',check:n=>{const s=n+'';let i=0;while(i<s.length-1&&+s[i]<+s[i+1])i++;while(i<s.length-1&&+s[i]>+s[i+1])i++;return i===s.length-1&&s.length>2}},
  // === CONSTANTS (25) ===
  {id:'c314159',name:'Pi',desc:'Contains 314159 (π)',rarity:'Mythic',ep:350000,emoji:'🥧',check:n=>/314159/.test(n+'')},
  {id:'c141592',name:'Pi II',desc:'Contains 141592',rarity:'Epic',ep:50000,emoji:'🥧',check:n=>/141592/.test(n+'')},
  {id:'c271828',name:'Euler',desc:'Contains 271828 (e)',rarity:'Mythic',ep:350000,emoji:'📐',check:n=>/271828/.test(n+'')},
  {id:'c718281',name:'Euler II',desc:'Contains 718281',rarity:'Epic',ep:50000,emoji:'📐',check:n=>/718281/.test(n+'')},
  {id:'c141421',name:'Root 2',desc:'Contains 141421 (√2)',rarity:'Epic',ep:50000,emoji:'√',check:n=>/141421/.test(n+'')},
  {id:'c414213',name:'Root 2 II',desc:'Contains 414213',rarity:'Rare',ep:10000,emoji:'√',check:n=>/414213/.test(n+'')},
  {id:'c161803',name:'Golden Ratio',desc:'Contains 161803 (φ)',rarity:'Epic',ep:50000,emoji:'✨',check:n=>/161803/.test(n+'')},
  {id:'c618033',name:'Golden Ratio II',desc:'Contains 618033',rarity:'Epic',ep:50000,emoji:'✨',check:n=>/618033/.test(n+'')},
  {id:'c299792',name:'Light Speed',desc:'Contains 299792 (c)',rarity:'Mythic',ep:350000,emoji:'⚡',check:n=>/299792/.test(n+'')},
  {id:'c662607',name:'Planck',desc:'Contains 662607',rarity:'Epic',ep:50000,emoji:'🔬',check:n=>/662607/.test(n+'')},
  {id:'c602214',name:'Avogadro',desc:'Contains 602214',rarity:'Epic',ep:50000,emoji:'🧪',check:n=>/602214/.test(n+'')},
  {id:'c693147',name:'ln 2',desc:'Contains 693147',rarity:'Rare',ep:10000,emoji:'📊',check:n=>/693147/.test(n+'')},
  {id:'c230258',name:'ln 10',desc:'Contains 230258',rarity:'Rare',ep:10000,emoji:'📊',check:n=>/230258/.test(n+'')},
  {id:'c577215',name:'Euler-Mascheroni',desc:'Contains 577215 (γ)',rarity:'Epic',ep:50000,emoji:'γ',check:n=>/577215/.test(n+'')},
  {id:'c732050',name:'Root 3',desc:'Contains 732050 (√3)',rarity:'Rare',ep:10000,emoji:'√',check:n=>/732050/.test(n+'')},
  {id:'c236067',name:'Root 5',desc:'Contains 236067 (√5)',rarity:'Rare',ep:10000,emoji:'√',check:n=>/236067/.test(n+'')},
  {id:'c986960',name:'Pi Squared',desc:'Contains 986960 (π²)',rarity:'Rare',ep:10000,emoji:'■',check:n=>/986960/.test(n+'')},
  {id:'c628318',name:'Tau',desc:'Contains 628318 (τ)',rarity:'Epic',ep:50000,emoji:'🔄',check:n=>/628318/.test(n+'')},
  {id:'c466920',name:'Feigenbaum',desc:'Contains 466920 (δ)',rarity:'Epic',ep:50000,emoji:'🌿',check:n=>/466920/.test(n+'')},
  {id:'c182818',name:'Euler III',desc:'Contains 182818',rarity:'Rare',ep:10000,emoji:'📐',check:n=>/182818/.test(n+'')},
  {id:'c213562',name:'Root 2 III',desc:'Contains 213562',rarity:'Rare',ep:10000,emoji:'√',check:n=>/213562/.test(n+'')},
  {id:'c159265',name:'Pi III',desc:'Contains 159265',rarity:'Epic',ep:50000,emoji:'🥧',check:n=>/159265/.test(n+'')},
  {id:'c592653',name:'Pi IV',desc:'Contains 592653',rarity:'Rare',ep:10000,emoji:'🥧',check:n=>/592653/.test(n+'')},
  {id:'c828182',name:'Euler IV',desc:'Contains 828182',rarity:'Rare',ep:10000,emoji:'📐',check:n=>/828182/.test(n+'')},
  {id:'c180339',name:'Golden III',desc:'Contains 180339',rarity:'Rare',ep:10000,emoji:'✨',check:n=>/180339/.test(n+'')},
  // === HISTORICAL YEARS (20) ===
  {id:'y1066',name:'1066',desc:'Contains 1066',rarity:'Uncommon',ep:2000,emoji:'📅',check:n=>/1066/.test(n+'')},
  {id:'y1492',name:'1492',desc:'Contains 1492',rarity:'Uncommon',ep:2000,emoji:'📅',check:n=>/1492/.test(n+'')},
  {id:'y1776',name:'1776',desc:'Contains 1776',rarity:'Uncommon',ep:2000,emoji:'📅',check:n=>/1776/.test(n+'')},
  {id:'y1789',name:'1789',desc:'Contains 1789',rarity:'Uncommon',ep:2000,emoji:'📅',check:n=>/1789/.test(n+'')},
  {id:'y1812',name:'1812',desc:'Contains 1812',rarity:'Uncommon',ep:2000,emoji:'📅',check:n=>/1812/.test(n+'')},
  {id:'y1865',name:'1865',desc:'Contains 1865',rarity:'Uncommon',ep:2000,emoji:'📅',check:n=>/1865/.test(n+'')},
  {id:'y1918',name:'1918',desc:'Contains 1918',rarity:'Uncommon',ep:2000,emoji:'📅',check:n=>/1918/.test(n+'')},
  {id:'y1929',name:'1929',desc:'Contains 1929',rarity:'Uncommon',ep:2000,emoji:'📅',check:n=>/1929/.test(n+'')},
  {id:'y1945',name:'1945',desc:'Contains 1945',rarity:'Uncommon',ep:2000,emoji:'📅',check:n=>/1945/.test(n+'')},
  {id:'y1969',name:'1969',desc:'Contains 1969',rarity:'Uncommon',ep:2000,emoji:'📅',check:n=>/1969/.test(n+'')},
  {id:'y1977',name:'1977',desc:'Contains 1977',rarity:'Uncommon',ep:2000,emoji:'📅',check:n=>/1977/.test(n+'')},
  {id:'y1984',name:'1984',desc:'Contains 1984',rarity:'Uncommon',ep:2000,emoji:'📅',check:n=>/1984/.test(n+'')},
  {id:'y1999',name:'1999',desc:'Contains 1999',rarity:'Uncommon',ep:2000,emoji:'📅',check:n=>/1999/.test(n+'')},
  {id:'y2001',name:'2001',desc:'Contains 2001',rarity:'Uncommon',ep:2000,emoji:'📅',check:n=>/2001/.test(n+'')},
  {id:'y2020',name:'2020',desc:'Contains 2020',rarity:'Uncommon',ep:2000,emoji:'📅',check:n=>/2020/.test(n+'')},
  {id:'y1770',name:'1770',desc:'Contains 1770',rarity:'Uncommon',ep:2000,emoji:'📅',check:n=>/1770/.test(n+'')},
  {id:'y1863',name:'1863',desc:'Contains 1863',rarity:'Uncommon',ep:2000,emoji:'📅',check:n=>/1863/.test(n+'')},
  {id:'y1941',name:'1941',desc:'Contains 1941',rarity:'Uncommon',ep:2000,emoji:'📅',check:n=>/1941/.test(n+'')},
  {id:'y1989',name:'1989',desc:'Contains 1989',rarity:'Uncommon',ep:2000,emoji:'📅',check:n=>/1989/.test(n+'')},
  {id:'y2012',name:'2012',desc:'Contains 2012',rarity:'Uncommon',ep:2000,emoji:'📅',check:n=>/2012/.test(n+'')},
  // === FAMOUS REFERENCES (20) ===
  {id:'r90210',name:'90210',desc:'Contains 90210',rarity:'Rare',ep:10000,emoji:'🔢',check:n=>/90210/.test(n+'')},
  {id:'r86753',name:'Jenny',desc:'Contains 86753',rarity:'Rare',ep:10000,emoji:'🔢',check:n=>/86753/.test(n+'')},
  {id:'r80085',name:'80085',desc:'Contains 80085',rarity:'Rare',ep:10000,emoji:'🔢',check:n=>/80085/.test(n+'')},
  {id:'r1134',name:'1134',desc:'Contains 1134',rarity:'Rare',ep:10000,emoji:'🔢',check:n=>/1134/.test(n+'')},
  {id:'r501',name:'501',desc:'Contains 501',rarity:'Rare',ep:10000,emoji:'🔢',check:n=>/501/.test(n+'')},
  {id:'r911',name:'911',desc:'Contains 911',rarity:'Rare',ep:10000,emoji:'🔢',check:n=>/911/.test(n+'')},
  {id:'r711',name:'711',desc:'Contains 711',rarity:'Rare',ep:10000,emoji:'🔢',check:n=>/711/.test(n+'')},
  {id:'r1313',name:'1313',desc:'Contains 1313',rarity:'Rare',ep:10000,emoji:'🔢',check:n=>/1313/.test(n+'')},
  {id:'r212',name:'212',desc:'Contains 212',rarity:'Rare',ep:10000,emoji:'🔢',check:n=>/212/.test(n+'')},
  {id:'r305',name:'305',desc:'Contains 305',rarity:'Rare',ep:10000,emoji:'🔢',check:n=>/305/.test(n+'')},
  {id:'r808',name:'808',desc:'Contains 808',rarity:'Rare',ep:10000,emoji:'🔢',check:n=>/808/.test(n+'')},
  {id:'r303',name:'303',desc:'Contains 303',rarity:'Rare',ep:10000,emoji:'🔢',check:n=>/303/.test(n+'')},
  {id:'r360',name:'360',desc:'Contains 360',rarity:'Rare',ep:10000,emoji:'🔢',check:n=>/360/.test(n+'')},
  {id:'r42069',name:'42069',desc:'Contains 42069',rarity:'Rare',ep:10000,emoji:'🔢',check:n=>/42069/.test(n+'')},
  {id:'r66666',name:'66666',desc:'Contains 66666',rarity:'Rare',ep:10000,emoji:'🔢',check:n=>/66666/.test(n+'')},
  {id:'r77777',name:'77777',desc:'Contains 77777',rarity:'Rare',ep:10000,emoji:'🔢',check:n=>/77777/.test(n+'')},
  {id:'r88888',name:'88888',desc:'Contains 88888',rarity:'Rare',ep:10000,emoji:'🔢',check:n=>/88888/.test(n+'')},
  {id:'r99999',name:'99999',desc:'Contains 99999',rarity:'Rare',ep:10000,emoji:'🔢',check:n=>/99999/.test(n+'')},
  {id:'r11111',name:'11111',desc:'Contains 11111',rarity:'Rare',ep:10000,emoji:'🔢',check:n=>/11111/.test(n+'')},
  {id:'r786',name:'786',desc:'Contains 786',rarity:'Rare',ep:10000,emoji:'🔢',check:n=>/786/.test(n+'')},
  // === MORE EXACT NUMBERS (20) ===
  {id:'ex8',name:'Exactly 8',desc:'Number is 8',rarity:'Epic',ep:50000,emoji:'🎯',check:n=>n===8},
  {id:'ex10',name:'Exactly 10',desc:'Number is 10',rarity:'Epic',ep:50000,emoji:'🎯',check:n=>n===10},
  {id:'ex12',name:'Exactly 12',desc:'Number is 12',rarity:'Epic',ep:50000,emoji:'🎯',check:n=>n===12},
  {id:'ex20',name:'Exactly 20',desc:'Number is 20',rarity:'Epic',ep:50000,emoji:'🎯',check:n=>n===20},
  {id:'ex21',name:'Exactly 21',desc:'Number is 21',rarity:'Epic',ep:50000,emoji:'🎯',check:n=>n===21},
  {id:'ex50',name:'Exactly 50',desc:'Number is 50',rarity:'Epic',ep:50000,emoji:'🎯',check:n=>n===50},
  {id:'ex77',name:'Exactly 77',desc:'Number is 77',rarity:'Epic',ep:50000,emoji:'🎯',check:n=>n===77},
  {id:'ex108',name:'Exactly 108',desc:'Number is 108',rarity:'Epic',ep:50000,emoji:'🎯',check:n=>n===108},
  {id:'ex200',name:'Exactly 200',desc:'Number is 200',rarity:'Epic',ep:50000,emoji:'🎯',check:n=>n===200},
  {id:'ex500',name:'Exactly 500',desc:'Number is 500',rarity:'Epic',ep:50000,emoji:'🎯',check:n=>n===500},
  {id:'ex11111',name:'Five Ones',desc:'Number is 11111',rarity:'Epic',ep:50000,emoji:'🎯',check:n=>n===11111},
  {id:'ex22222',name:'Five Twos',desc:'Number is 22222',rarity:'Epic',ep:50000,emoji:'🎯',check:n=>n===22222},
  {id:'ex33333',name:'Five Threes',desc:'Number is 33333',rarity:'Epic',ep:50000,emoji:'🎯',check:n=>n===33333},
  {id:'ex44444',name:'Five Fours',desc:'Number is 44444',rarity:'Epic',ep:50000,emoji:'🎯',check:n=>n===44444},
  {id:'ex55555',name:'Five Fives',desc:'Number is 55555',rarity:'Epic',ep:50000,emoji:'🎯',check:n=>n===55555},
  {id:'ex66666',name:'Five Sixes',desc:'Number is 66666',rarity:'Epic',ep:50000,emoji:'🎯',check:n=>n===66666},
  {id:'ex77777',name:'Five Sevens',desc:'Number is 77777',rarity:'Epic',ep:50000,emoji:'🎯',check:n=>n===77777},
  {id:'ex88888',name:'Five Eights',desc:'Number is 88888',rarity:'Epic',ep:50000,emoji:'🎯',check:n=>n===88888},
  {id:'ex99999',name:'Five Nines',desc:'Number is 99999',rarity:'Epic',ep:50000,emoji:'🎯',check:n=>n===99999},
  {id:'ex80808',name:'Exactly 80808',desc:'Number is 80808',rarity:'Epic',ep:50000,emoji:'🎯',check:n=>n===80808},
  // === MORE MATH (15) ===
  {id:'mh_happy',name:'Happy',desc:'Sum of squares of digits reaches 1',rarity:'Uncommon',ep:2000,emoji:'😊',check:n=>{const s=new Set();while(n!==1&&!s.has(n)){s.add(n);n=n.toString().split('').reduce((a,b)=>a+ +b*+b,0)}return n===1}},
  {id:'mh_emirp',name:'Emirp',desc:'Prime reversed is a different prime',rarity:'Epic',ep:50000,emoji:'🔄',check:n=>{function p(x){if(x<2)return false;for(let i=2;i*i<=x;i++)if(x%i===0)return false;return true}const r=+(n+'').split('').reverse().join('');return p(n)&&r!==n&&p(r)}},
  {id:'mh_sophie',name:'Sophie Germain',desc:'Prime where 2p+1 is also prime',rarity:'Epic',ep:50000,emoji:'🌱',check:n=>{function p(x){if(x<2)return false;for(let i=2;i*i<=x;i++)if(x%i===0)return false;return true}return p(n)&&p(2*n+1)}},
  {id:'mh_zeroless',name:'Zero-Free',desc:'No digit 0 in the number',rarity:'Common',ep:500,emoji:'0️⃣',check:n=>!/0/.test(n+'')},
  {id:'mh_oneless',name:'One-Free',desc:'No digit 1 in the number',rarity:'Common',ep:500,emoji:'1️⃣',check:n=>!/1/.test(n+'')},
  {id:'mh_ninefree',name:'Nine-Free',desc:'No digit 9 in the number',rarity:'Common',ep:500,emoji:'9️⃣',check:n=>!/9/.test(n+'')},
  {id:'mh_digsumprime',name:'Prime Digit Sum',desc:'Sum of digits is prime',rarity:'Uncommon',ep:2000,emoji:'🔢',check:n=>{let s=0;for(const c of n+'')s+=+c;if(s<2)return false;for(let i=2;i*i<=s;i++)if(s%i===0)return false;return true}},
  {id:'mh_digproduct',name:'High Product',desc:'Product of digits > 1000',rarity:'Rare',ep:10000,emoji:'✖️',check:n=>{let p=1;for(const c of n+'')p*=+c;return p>1000}},
  {id:'mh_digprod0',name:'Zero Product',desc:'Product of digits is 0',rarity:'Common',ep:500,emoji:'0️⃣',check:n=>{const s=n+'';return s.includes('0')}},
  {id:'mh_sumpal',name:'Sum Palindrome',desc:'Sum of digits is a palindrome',rarity:'Uncommon',ep:2000,emoji:'🔄',check:n=>{const s=n+'';let t=0;for(let i=0;i<s.length;i++)t+=+s[i];const ts=t+'';return ts===ts.split('').reverse().join('')}},
  {id:'mh_balprime',name:'Balanced Prime',desc:'Prime with equal prime neighbors',rarity:'Epic',ep:50000,emoji:'⚖️',check:n=>{function p(x){if(x<2)return false;for(let i=2;i*i<=x;i++)if(x%i===0)return false;return true}return p(n)&&p(n-6)&&p(n+6)}},
  {id:'mh_woodall',name:'Woodall',desc:'n = k*2^k-1 form',rarity:'Epic',ep:50000,emoji:'🌳',check:n=>{for(let k=1;k<20;k++)if(k*Math.pow(2,k)-1===n)return true;return false}},
  {id:'mh_cullen',name:'Cullen',desc:'n = k*2^k+1 form',rarity:'Epic',ep:50000,emoji:'🔮',check:n=>{for(let k=1;k<20;k++)if(k*Math.pow(2,k)+1===n)return true;return false}},
  {id:'mh_digitalroot9',name:'Digital Root 9',desc:'Sum of digits until single digit = 9',rarity:'Uncommon',ep:2000,emoji:'9️⃣',check:n=>{while(n>9){let s=0;for(const c of n+'')s+=+c;n=s}return n===9}},
  {id:'mh_digitalroot3',name:'Digital Root 3',desc:'Sum of digits until single digit = 3',rarity:'Uncommon',ep:2000,emoji:'3️⃣',check:n=>{while(n>9){let s=0;for(const c of n+'')s+=+c;n=s}return n===3}},
  // === MORE DIGIT PATTERNS (20) ===
  {id:'dp_pal3in',name:'3-Pal Inside',desc:'Contains a 3-digit palindrome',rarity:'Uncommon',ep:2000,emoji:'🔄',check:n=>/(.)(.)\1/.test(n+'')},
  {id:'dp_pal4in',name:'4-Pal Inside',desc:'Contains a 4-digit palindrome',rarity:'Rare',ep:10000,emoji:'🔄',check:n=>/(.)(.)\2\1/.test(n+'')},
  {id:'dp_con3ev',name:'3 Evens Run',desc:'3 consecutive even digits',rarity:'Uncommon',ep:2000,emoji:'💎',check:n=>/[02468]{3}/.test(n+'')},
  {id:'dp_con3od',name:'3 Odds Run',desc:'3 consecutive odd digits',rarity:'Uncommon',ep:2000,emoji:'💎',check:n=>/[13579]{3}/.test(n+'')},
  {id:'dp_ladder',name:'Ladder',desc:'Digits alternate up-down-up',rarity:'Epic',ep:50000,emoji:'🪜',check:n=>{const s=n+'';for(let i=2;i<s.length;i++){const a=s[i-2],b=s[i-1],c=s[i];if(!(a<b&&b>c||a>b&&b<c)){if(i>2)return false}}return s.length>2}},
  {id:'dp_rep3',name:'Triple Repeat',desc:'3 same digits anywhere',rarity:'Uncommon',ep:2000,emoji:'3️⃣',check:n=>/(.)\1\1/.test(n+'')},
  {id:'dp_alow',name:'Low Life',desc:'All digits 0-3',rarity:'Uncommon',ep:2000,emoji:'🔽',check:n=>/^[0-3]+$/.test(n+'')},
  {id:'dp_amid',name:'Mid Range',desc:'All digits 3-6',rarity:'Common',ep:500,emoji:'🔵',check:n=>/^[3-6]+$/.test(n+'')},
  {id:'dp_ahi',name:'High Roller',desc:'All digits 7-9',rarity:'Rare',ep:10000,emoji:'🔼',check:n=>/^[7-9]+$/.test(n+'')},
  {id:'dp_bal',name:'Balanced',desc:'First 3 sum = last 3 sum',rarity:'Uncommon',ep:2000,emoji:'⚖️',check:n=>{const s=(n+'').padStart(6,'0');let a=0,b=0;for(let i=0;i<3;i++)a+=+s[i];for(let i=3;i<6;i++)b+=+s[i];return a===b}},
  {id:'dp_extreme',name:'Extreme Ends',desc:'First & last digit differ by 5+',rarity:'Uncommon',ep:2000,emoji:'🌡️',check:n=>{const s=n+'';return s.length>1&&Math.abs(+s[0]- +s[s.length-1])>=5}},
  {id:'dp_capped',name:'Capped',desc:'Both ends same, middle different',rarity:'Rare',ep:10000,emoji:'🎩',check:n=>{const s=n+'';return s.length>2&&s[0]===s[s.length-1]&&s[0]!==s[1]&&s[0]!==s[s.length-2]}},
  {id:'dp_zigzag',name:'Zigzag',desc:'Contains peak-valley pattern',rarity:'Rare',ep:10000,emoji:'〰️',check:n=>{const s=n+'';return [...s].slice(0,-2).some((_,i)=>+s[i]<+s[i+1]&&+s[i+1]>+s[i+2])}},
  {id:'dp_inc2',name:'+2 Steps',desc:'Contains adjacent digits differing by 2',rarity:'Uncommon',ep:2000,emoji:'📈',check:n=>{const s=n+'';return [...s].slice(0,-1).some((_,i)=>+s[i+1]- +s[i]===2)}},
  {id:'dp_dec2',name:'-2 Steps',desc:'Contains adjacent digits differing by -2',rarity:'Uncommon',ep:2000,emoji:'📉',check:n=>{const s=n+'';return [...s].slice(0,-1).some((_,i)=>+s[i]- +s[i+1]===2)}},
  {id:'dp_center',name:'Center Mass',desc:'Middle digit is average of ends',rarity:'Rare',ep:10000,emoji:'🎯',check:n=>{const s=n+'';return s.length>2&&(+s[0]+ +s[s.length-1])/2===+s[Math.floor(s.length/2)]}},
  {id:'dp_leapfrog',name:'Leapfrog',desc:'Same digit every 2 positions (x.x.x)',rarity:'Epic',ep:50000,emoji:'🐸',check:n=>{const s=n+'';for(let i=0;i<s.length-2;i++)for(let g=1;g<3;g++)if(i+2*g<s.length&&s[i]===s[i+g]&&s[i+g]===s[i+2*g])return true;return false}},
  {id:'dp_bookend',name:'Bookends',desc:'First 2 = last 2 reversed',rarity:'Epic',ep:50000,emoji:'📚',check:n=>{const s=n+'';return s.length>3&&s[0]===s[s.length-1]&&s[1]===s[s.length-2]}},
  {id:'dp_wave',name:'Wave',desc:'Digits go high-low-high-low',rarity:'Epic',ep:50000,emoji:'🌊',check:n=>{const s=n+'';if(s.length<4)return false;for(let i=0;i<s.length-1;i++){if(i%2===0&&+s[i]<=+s[i+1])return false;if(i%2===1&&+s[i]>=+s[i+1])return false}return true}},
  {id:'dp_mirror',name:'Mirror Half',desc:'First 3 mirror last 3 (abc-cba)',rarity:'Epic',ep:50000,emoji:'🪞',check:n=>{const s=n+'';return s.length===6&&s[0]===s[5]&&s[1]===s[4]&&s[2]===s[3]}},
  // === MORE DIVISIBILITY (10) ===
  {id:'dv21',name:'Divisible by 21',desc:'Multiple of 21',rarity:'Uncommon',ep:2000,emoji:'2️⃣1️⃣',check:n=>n%21===0},
  {id:'dv22',name:'Divisible by 22',desc:'Multiple of 22',rarity:'Uncommon',ep:2000,emoji:'2️⃣2️⃣',check:n=>n%22===0},
  {id:'dv23',name:'Divisible by 23',desc:'Multiple of 23',rarity:'Uncommon',ep:2000,emoji:'2️⃣3️⃣',check:n=>n%23===0},
  {id:'dv24',name:'Divisible by 24',desc:'Multiple of 24',rarity:'Uncommon',ep:2000,emoji:'2️⃣4️⃣',check:n=>n%24===0},
  {id:'dv26',name:'Divisible by 26',desc:'Multiple of 26',rarity:'Rare',ep:10000,emoji:'2️⃣6️⃣',check:n=>n%26===0},
  {id:'dv27',name:'Divisible by 27',desc:'Multiple of 27',rarity:'Rare',ep:10000,emoji:'2️⃣7️⃣',check:n=>n%27===0},
  {id:'dv28',name:'Divisible by 28',desc:'Multiple of 28',rarity:'Rare',ep:10000,emoji:'2️⃣8️⃣',check:n=>n%28===0},
  {id:'dv30',name:'Divisible by 30',desc:'Multiple of 30',rarity:'Uncommon',ep:2000,emoji:'3️⃣0️⃣',check:n=>n%30===0},
  {id:'dv32',name:'Divisible by 32',desc:'Multiple of 32',rarity:'Rare',ep:10000,emoji:'3️⃣2️⃣',check:n=>n%32===0},
  {id:'dv36',name:'Divisible by 36',desc:'Multiple of 36',rarity:'Uncommon',ep:2000,emoji:'3️⃣6️⃣',check:n=>n%36===0},
  // === MORE RANGES (10) ===
  {id:'rg_under1',name:'Under 1',desc:'Number is 0',rarity:'Mythic',ep:350000,emoji:'⬇️',check:n=>n===0},
  {id:'rg_over100',name:'Over 100',desc:'Number is over 100',rarity:'Common',ep:500,emoji:'⬆️',check:n=>n>100},
  {id:'rg_over1000',name:'Over 1000',desc:'Number is over 1,000',rarity:'Common',ep:500,emoji:'⬆️',check:n=>n>1000},
  {id:'rg_over10000',name:'Over 10K',desc:'Number is over 10,000',rarity:'Common',ep:500,emoji:'⬆️',check:n=>n>10000},
  {id:'rg_over100000',name:'Over 100K',desc:'Number is over 100,000',rarity:'Uncommon',ep:2000,emoji:'⬆️',check:n=>n>100000},
  {id:'rg_over500000',name:'Over 500K',desc:'Number is over 500,000',rarity:'Uncommon',ep:2000,emoji:'⬆️',check:n=>n>500000},
  {id:'rg_under50000',name:'Under 50K',desc:'Number is under 50,000',rarity:'Common',ep:500,emoji:'⬇️',check:n=>n<50000},
  {id:'rg_99900',name:'Near Max',desc:'Number is over 999,000',rarity:'Epic',ep:50000,emoji:'🔥',check:n=>n>999000},
  {id:'rg_555000',name:'Mid Range',desc:'Number is 500,000-599,999',rarity:'Common',ep:500,emoji:'🎯',check:n=>n>=500000&&n<600000},
  {id:'rg_100to999',name:'Three Digit Range',desc:'Number is 100-999',rarity:'Uncommon',ep:2000,emoji:'🔢',check:n=>n>99&&n<1000},
  // === SEQUENCE CONTAINS (15) ===
  {id:'sq_2468',name:'Even Steps',desc:'Contains 2468',rarity:'Rare',ep:10000,emoji:'📈',check:n=>/2468/.test(n+'')},
  {id:'sq_1357',name:'Odd Steps',desc:'Contains 1357',rarity:'Rare',ep:10000,emoji:'📉',check:n=>/1357/.test(n+'')},
  {id:'sq_12321',name:'Mini Pyramid',desc:'Contains 12321',rarity:'Epic',ep:50000,emoji:'🔺',check:n=>/12321/.test(n+'')},
  {id:'sq_111222',name:'One-Two',desc:'Contains 111222',rarity:'Epic',ep:50000,emoji:'🔲',check:n=>/111222/.test(n+'')},
  {id:'sq_121212',name:'Triple Alt',desc:'Contains 121212',rarity:'Epic',ep:50000,emoji:'🔁',check:n=>/121212/.test(n+'')},
  {id:'sq_112233',name:'Pair Steps',desc:'Contains 112233',rarity:'Epic',ep:50000,emoji:'🔲',check:n=>/112233/.test(n+'')},
  {id:'sq_123123',name:'Double Trip',desc:'Contains 123123',rarity:'Epic',ep:50000,emoji:'🔃',check:n=>/123123/.test(n+'')},
  {id:'sq_101010',name:'Tron',desc:'Contains 101010',rarity:'Epic',ep:50000,emoji:'💻',check:n=>/101010/.test(n+'')},
  {id:'sq_110110',name:'Binary Pair',desc:'Contains 110110',rarity:'Epic',ep:50000,emoji:'💻',check:n=>/110110/.test(n+'')},
  {id:'sq_6969',name:'Double Nice',desc:'Contains 6969',rarity:'Rare',ep:10000,emoji:'😏',check:n=>/6969/.test(n+'')},
  {id:'sq_13337',name:'Elite Plus',desc:'Contains 13337',rarity:'Epic',ep:50000,emoji:'💻',check:n=>/13337/.test(n+'')},
  {id:'sq_2580',name:'ATM PIN',desc:'Contains 2580',rarity:'Rare',ep:10000,emoji:'🏧',check:n=>/2580/.test(n+'')},
  {id:'sq_11235',name:'Fib Start',desc:'Contains 11235',rarity:'Rare',ep:10000,emoji:'🌀',check:n=>/11235/.test(n+'')},
  {id:'sq_235711',name:'Prime Run',desc:'Contains 2357',rarity:'Rare',ep:10000,emoji:'🔢',check:n=>/2357/.test(n+'')},
  {id:'sq_97531',name:'Odd Descend',desc:'Contains 97531',rarity:'Epic',ep:50000,emoji:'📉',check:n=>/97531/.test(n+'')},
  // === NEAR MISSES (10) ===
  {id:'nr_69',name:'Near 69',desc:'Within 1 of 69',rarity:'Uncommon',ep:2000,emoji:'😏',check:n=>Math.abs(n-69)<=1},
  {id:'nr_100',name:'Near 100',desc:'Within 1 of 100',rarity:'Uncommon',ep:2000,emoji:'💯',check:n=>Math.abs(n-100)<=1},
  {id:'nr_420',name:'Near 420',desc:'Within 1 of 420',rarity:'Uncommon',ep:2000,emoji:'🔥',check:n=>Math.abs(n-420)<=1},
  {id:'nr_666',name:'Near 666',desc:'Within 1 of 666',rarity:'Uncommon',ep:2000,emoji:'😈',check:n=>Math.abs(n-666)<=1},
  {id:'nr_777',name:'Near 777',desc:'Within 1 of 777',rarity:'Uncommon',ep:2000,emoji:'🎰',check:n=>Math.abs(n-777)<=1},
  {id:'nr_1000',name:'Near 1000',desc:'Within 1 of 1000',rarity:'Uncommon',ep:2000,emoji:'💎',check:n=>Math.abs(n-1000)<=1},
  {id:'nr_1337',name:'Near 1337',desc:'Within 1 of 1337',rarity:'Uncommon',ep:2000,emoji:'💻',check:n=>Math.abs(n-1337)<=1},
  {id:'nr_10000',name:'Near 10K',desc:'Within 1 of 10000',rarity:'Rare',ep:10000,emoji:'💰',check:n=>Math.abs(n-10000)<=1},
  {id:'nr_99999',name:'Near Max 5',desc:'Within 1 of 99999',rarity:'Rare',ep:10000,emoji:'9️⃣',check:n=>Math.abs(n-99999)<=1},
  {id:'nr_500000',name:'Near Half Mil',desc:'Within 1 of 500000',rarity:'Rare',ep:10000,emoji:'🎯',check:n=>Math.abs(n-500000)<=1},
  // === BINARY & MORE (15) ===
  {id:'bn_alt01',name:'Binary Alt',desc:'Binary has alternating 0s and 1s',rarity:'Epic',ep:50000,emoji:'💻',check:n=>{const b=n.toString(2);return /^(10)+1?$|^(01)+0?$/.test(b)}},
  {id:'bn_repunit',name:'Binary Repunit',desc:'Binary is all 1s (111...)',rarity:'Epic',ep:50000,emoji:'1️⃣',check:n=>{const b=n.toString(2);return /^1+$/.test(b)}},
  {id:'bn_palbin',name:'Binary Palindrome',desc:'Binary reads same backwards',rarity:'Rare',ep:10000,emoji:'🔄',check:n=>{const b=n.toString(2);return b===b.split('').reverse().join('')&&n>1}},
  {id:'bn_minweight',name:'Light Binary',desc:'Binary has only 1-3 ones',rarity:'Uncommon',ep:2000,emoji:'⬆️',check:n=>{const b=n.toString(2);let c=0;for(let i=0;i<b.length;i++)if(b[i]==='1')c++;return c>0&&c<4}},
  {id:'bn_heavy',name:'Heavy Binary',desc:'Binary has 10+ ones',rarity:'Rare',ep:10000,emoji:'⬇️',check:n=>{const b=n.toString(2);let c=0;for(let i=0;i<b.length;i++)if(b[i]==='1')c++;return c>9}},
  {id:'bn_square',name:'Binary Square',desc:'Binary length is perfect square',rarity:'Rare',ep:10000,emoji:'■',check:n=>{const l=n.toString(2).length;const r=Math.round(Math.sqrt(l));return r*r===l}},
  {id:'mp_pow6',name:'Power of 6',desc:'Number is 6^n',rarity:'Epic',ep:50000,emoji:'6️⃣',check:n=>{if(n<1)return false;while(n%6===0)n/=6;return n===1}},
  {id:'mp_pow11',name:'Power of 11',desc:'Number is 11^n',rarity:'Epic',ep:50000,emoji:'1️⃣1️⃣',check:n=>{if(n<1)return false;while(n%11===0)n/=11;return n===1}},
  {id:'mp_mul111',name:'Multiple of 111',desc:'Divisible by 111',rarity:'Rare',ep:10000,emoji:'1️⃣',check:n=>n%111===0},
  {id:'mp_mul1001',name:'Multiple of 1001',desc:'Divisible by 1001',rarity:'Rare',ep:10000,emoji:'💎',check:n=>n%1001===0},
  {id:'mp_mul11111',name:'Multiple of 11111',desc:'Divisible by 11111',rarity:'Epic',ep:50000,emoji:'1️⃣',check:n=>n%11111===0},
  {id:'mp_allunique5',name:'Unique 5',desc:'5-digit number with all different digits',rarity:'Rare',ep:10000,emoji:'🃏',check:n=>{const s=n+'';return s.length===5&&new Set(s.split('')).size===5}},
  {id:'mp_allunique6',name:'Unique 6',desc:'6-digit number with all different digits',rarity:'Epic',ep:50000,emoji:'🃏',check:n=>{const s=n+'';return s.length===6&&new Set(s.split('')).size===6}},
  {id:'mp_repdigitnear',name:'Near Repdigit',desc:'5 identical digits out of 6',rarity:'Epic',ep:50000,emoji:'🃏',check:n=>{const s=n+'';const c={};for(let i=0;i<s.length;i++)c[s[i]]=(c[s[i]]||0)+1;return Object.values(c).some(v=>v>4)}},
  {id:'mp_sameness',name:'Same Difference',desc:'First 2 = last 2',rarity:'Rare',ep:10000,emoji:'🔁',check:n=>{const s=n+'';return s.length>3&&s.slice(0,2)===s.slice(-2)}},
  // === SPECIAL (20) ===
  {id:'sp_birthday',name:'Birthday',desc:'Number matches MM/DD (e.g. 1225)',rarity:'Uncommon',ep:2000,emoji:'🎂',check:n=>{const s=(n+'').padStart(6,'0');const m=+s.slice(0,2);const d=+s.slice(2,4);return m>0&&m<13&&d>0&&d<32}},
  {id:'sp_computer',name:'Computer',desc:'Contains 8008 or 1337',rarity:'Rare',ep:10000,emoji:'💻',check:n=>/8008|1337/.test(n+'')},
  {id:'sp_mirrorpair',name:'Mirror Pair',desc:'First 3 digits reversed = last 3',rarity:'Epic',ep:50000,emoji:'🪞',check:n=>{const s=n+'';return s.length===6&&s.slice(0,3)===s.slice(3).split('').reverse().join('')}},
  {id:'sp_allcons',name:'All Consonants',desc:'No even digits (13579 only)',rarity:'Uncommon',ep:2000,emoji:'🔤',check:n=>/^[13579]+$/.test(n+'')},
  {id:'sp_allvowel',name:'All Vowels',desc:'Only even digits (02468 only)',rarity:'Uncommon',ep:2000,emoji:'🔤',check:n=>/^[02468]+$/.test(n+'')},
  {id:'sp_twin',name:'Twin Digits',desc:'Contains twin like 11 22 33',rarity:'Common',ep:500,emoji:'👯',check:n=>/(\d)\1\s*(\d)\2/.test(n+'')},
  {id:'sp_doubledouble',name:'Double Double',desc:'Two different doubles (e.g. 1122)',rarity:'Uncommon',ep:2000,emoji:'🔁',check:n=>{const s=n+'';const c={};for(let i=0;i<s.length-1;i++)if(s[i]===s[i+1])c[s[i]]=true;return Object.keys(c).length>1}},
  {id:'sp_king',name:'King\'s Number',desc:'All digits are 0 or 2 or 4',rarity:'Common',ep:500,emoji:'👑',check:n=>/^[024]+$/.test(n+'')},
  {id:'sp_queen',name:'Queen\'s Number',desc:'All digits are 1 or 3 or 5',rarity:'Common',ep:500,emoji:'👸',check:n=>/^[135]+$/.test(n+'')},
  {id:'sp_joker',name:'Joker Number',desc:'Contains 3 different doubles',rarity:'Epic',ep:50000,emoji:'🃏',check:n=>{const s=n+'';const seen=new Set();for(let i=0;i<s.length-1;i++)if(s[i]===s[i+1])seen.add(s[i]);return seen.size>2}},
  {id:'sp_century',name:'Century',desc:'Ends with 00',rarity:'Common',ep:500,emoji:'💯',check:n=>n%100===0},
  {id:'sp_millennium',name:'Millennium',desc:'Ends with 000',rarity:'Uncommon',ep:2000,emoji:'💎',check:n=>n%1000===0},
  {id:'sp_stairs',name:'Stairs',desc:'Digits go +1+2+3 pattern',rarity:'Rare',ep:10000,emoji:'🪜',check:n=>{const s=n+'';for(let i=1;i<s.length;i++)if(+s[i]!==+s[i-1]+i)return false;return s.length>1}},
  {id:'sp_doublestairs',name:'Double Stairs',desc:'Digits go +2+4+6 pattern',rarity:'Epic',ep:50000,emoji:'🪜',check:n=>{const s=n+'';for(let i=1;i<s.length;i++)if(+s[i]!==+s[i-1]+i*2)return false;return s.length>1}},
  {id:'sp_sawtooth',name:'Sawtooth',desc:'Digits go up-0-up-0 pattern',rarity:'Epic',ep:50000,emoji:'〰️',check:n=>{const s=n+'';const p=[];for(let i=0;i<s.length;i++)p.push(+s[i]);for(let i=2;i<p.length;i+=2)if(p[i]<=p[i-2])return false;return p.length>2}},
  {id:'sp_tetris',name:'Tetris',desc:'Contains 4 consecutive same digits',rarity:'Rare',ep:10000,emoji:'🧱',check:n=>/(\d)\1\1\1/.test(n+'')},
  {id:'sp_straightflush',name:'Straight Flush',desc:'5 consecutive ascending or descending',rarity:'Epic',ep:50000,emoji:'♠️',check:n=>{const s=n+'';let up=true,down=true;for(let i=1;i<s.length;i++){if(+s[i]!==+s[i-1]+1)up=false;if(+s[i]!==+s[i-1]-1)down=false}return up||down}},
  {id:'sp_identity',name:'Identity',desc:'Number equals its reverse',rarity:'Rare',ep:10000,emoji:'🪪',check:n=>{const s=n+'';return s===s.split('').reverse().join('')}},
  {id:'sp_incremental',name:'Incremental',desc:'Each digit is previous+2',rarity:'Rare',ep:10000,emoji:'📈',check:n=>{const s=n+'';for(let i=1;i<s.length;i++)if(+s[i]!==+s[i-1]+2)return false;return s.length>1}},
  {id:'sp_decremental',name:'Decremental',desc:'Each digit is previous-2',rarity:'Rare',ep:10000,emoji:'📉',check:n=>{const s=n+'';for(let i=1;i<s.length;i++)if(+s[i]!==+s[i-1]-2)return false;return s.length>1}},

// === AUTO-GENERATED COMMON BADGES (300) ===
// === STARTS WITH (90) ===
{id:'sw10',name:'Starts 10',desc:'First 2 digits are 10',rarity:'Common',ep:500,emoji:'🔟',check:n=>/^10/.test(n+'')},
{id:'sw11',name:'Starts 11',desc:'First 2 digits are 11',rarity:'Common',ep:500,emoji:'1️⃣1️⃣',check:n=>/^11/.test(n+'')},
{id:'sw12',name:'Starts 12',desc:'First 2 digits are 12',rarity:'Common',ep:500,emoji:'1️⃣2️⃣',check:n=>/^12/.test(n+'')},
{id:'sw13',name:'Starts 13',desc:'First 2 digits are 13',rarity:'Common',ep:500,emoji:'1️⃣3️⃣',check:n=>/^13/.test(n+'')},
{id:'sw14',name:'Starts 14',desc:'First 2 digits are 14',rarity:'Common',ep:500,emoji:'1️⃣4️⃣',check:n=>/^14/.test(n+'')},
{id:'sw15',name:'Starts 15',desc:'First 2 digits are 15',rarity:'Common',ep:500,emoji:'1️⃣5️⃣',check:n=>/^15/.test(n+'')},
{id:'sw16',name:'Starts 16',desc:'First 2 digits are 16',rarity:'Common',ep:500,emoji:'1️⃣6️⃣',check:n=>/^16/.test(n+'')},
{id:'sw17',name:'Starts 17',desc:'First 2 digits are 17',rarity:'Common',ep:500,emoji:'1️⃣7️⃣',check:n=>/^17/.test(n+'')},
{id:'sw18',name:'Starts 18',desc:'First 2 digits are 18',rarity:'Common',ep:500,emoji:'1️⃣8️⃣',check:n=>/^18/.test(n+'')},
{id:'sw19',name:'Starts 19',desc:'First 2 digits are 19',rarity:'Common',ep:500,emoji:'1️⃣9️⃣',check:n=>/^19/.test(n+'')},
{id:'sw20',name:'Starts 20',desc:'First 2 digits are 20',rarity:'Common',ep:500,emoji:'2️⃣0️⃣',check:n=>/^20/.test(n+'')},
{id:'sw21',name:'Starts 21',desc:'First 2 digits are 21',rarity:'Common',ep:500,emoji:'2️⃣1️⃣',check:n=>/^21/.test(n+'')},
{id:'sw22',name:'Starts 22',desc:'First 2 digits are 22',rarity:'Common',ep:500,emoji:'2️⃣2️⃣',check:n=>/^22/.test(n+'')},
{id:'sw23',name:'Starts 23',desc:'First 2 digits are 23',rarity:'Common',ep:500,emoji:'2️⃣3️⃣',check:n=>/^23/.test(n+'')},
{id:'sw24',name:'Starts 24',desc:'First 2 digits are 24',rarity:'Common',ep:500,emoji:'2️⃣4️⃣',check:n=>/^24/.test(n+'')},
{id:'sw25',name:'Starts 25',desc:'First 2 digits are 25',rarity:'Common',ep:500,emoji:'2️⃣5️⃣',check:n=>/^25/.test(n+'')},
{id:'sw26',name:'Starts 26',desc:'First 2 digits are 26',rarity:'Common',ep:500,emoji:'2️⃣6️⃣',check:n=>/^26/.test(n+'')},
{id:'sw27',name:'Starts 27',desc:'First 2 digits are 27',rarity:'Common',ep:500,emoji:'2️⃣7️⃣',check:n=>/^27/.test(n+'')},
{id:'sw28',name:'Starts 28',desc:'First 2 digits are 28',rarity:'Common',ep:500,emoji:'2️⃣8️⃣',check:n=>/^28/.test(n+'')},
{id:'sw29',name:'Starts 29',desc:'First 2 digits are 29',rarity:'Common',ep:500,emoji:'2️⃣9️⃣',check:n=>/^29/.test(n+'')},
{id:'sw30',name:'Starts 30',desc:'First 2 digits are 30',rarity:'Common',ep:500,emoji:'3️⃣0️⃣',check:n=>/^30/.test(n+'')},
{id:'sw31',name:'Starts 31',desc:'First 2 digits are 31',rarity:'Common',ep:500,emoji:'3️⃣1️⃣',check:n=>/^31/.test(n+'')},
{id:'sw32',name:'Starts 32',desc:'First 2 digits are 32',rarity:'Common',ep:500,emoji:'3️⃣2️⃣',check:n=>/^32/.test(n+'')},
{id:'sw33',name:'Starts 33',desc:'First 2 digits are 33',rarity:'Common',ep:500,emoji:'3️⃣3️⃣',check:n=>/^33/.test(n+'')},
{id:'sw34',name:'Starts 34',desc:'First 2 digits are 34',rarity:'Common',ep:500,emoji:'3️⃣4️⃣',check:n=>/^34/.test(n+'')},
{id:'sw35',name:'Starts 35',desc:'First 2 digits are 35',rarity:'Common',ep:500,emoji:'3️⃣5️⃣',check:n=>/^35/.test(n+'')},
{id:'sw36',name:'Starts 36',desc:'First 2 digits are 36',rarity:'Common',ep:500,emoji:'3️⃣6️⃣',check:n=>/^36/.test(n+'')},
{id:'sw37',name:'Starts 37',desc:'First 2 digits are 37',rarity:'Common',ep:500,emoji:'3️⃣7️⃣',check:n=>/^37/.test(n+'')},
{id:'sw38',name:'Starts 38',desc:'First 2 digits are 38',rarity:'Common',ep:500,emoji:'3️⃣8️⃣',check:n=>/^38/.test(n+'')},
{id:'sw39',name:'Starts 39',desc:'First 2 digits are 39',rarity:'Common',ep:500,emoji:'3️⃣9️⃣',check:n=>/^39/.test(n+'')},
{id:'sw40',name:'Starts 40',desc:'First 2 digits are 40',rarity:'Common',ep:500,emoji:'4️⃣0️⃣',check:n=>/^40/.test(n+'')},
{id:'sw41',name:'Starts 41',desc:'First 2 digits are 41',rarity:'Common',ep:500,emoji:'4️⃣1️⃣',check:n=>/^41/.test(n+'')},
{id:'sw42',name:'Starts 42',desc:'First 2 digits are 42',rarity:'Common',ep:500,emoji:'4️⃣2️⃣',check:n=>/^42/.test(n+'')},
{id:'sw43',name:'Starts 43',desc:'First 2 digits are 43',rarity:'Common',ep:500,emoji:'4️⃣3️⃣',check:n=>/^43/.test(n+'')},
{id:'sw44',name:'Starts 44',desc:'First 2 digits are 44',rarity:'Common',ep:500,emoji:'4️⃣4️⃣',check:n=>/^44/.test(n+'')},
{id:'sw45',name:'Starts 45',desc:'First 2 digits are 45',rarity:'Common',ep:500,emoji:'4️⃣5️⃣',check:n=>/^45/.test(n+'')},
{id:'sw46',name:'Starts 46',desc:'First 2 digits are 46',rarity:'Common',ep:500,emoji:'4️⃣6️⃣',check:n=>/^46/.test(n+'')},
{id:'sw47',name:'Starts 47',desc:'First 2 digits are 47',rarity:'Common',ep:500,emoji:'4️⃣7️⃣',check:n=>/^47/.test(n+'')},
{id:'sw48',name:'Starts 48',desc:'First 2 digits are 48',rarity:'Common',ep:500,emoji:'4️⃣8️⃣',check:n=>/^48/.test(n+'')},
{id:'sw49',name:'Starts 49',desc:'First 2 digits are 49',rarity:'Common',ep:500,emoji:'4️⃣9️⃣',check:n=>/^49/.test(n+'')},
{id:'sw50',name:'Starts 50',desc:'First 2 digits are 50',rarity:'Common',ep:500,emoji:'5️⃣0️⃣',check:n=>/^50/.test(n+'')},
{id:'sw51',name:'Starts 51',desc:'First 2 digits are 51',rarity:'Common',ep:500,emoji:'5️⃣1️⃣',check:n=>/^51/.test(n+'')},
{id:'sw52',name:'Starts 52',desc:'First 2 digits are 52',rarity:'Common',ep:500,emoji:'5️⃣2️⃣',check:n=>/^52/.test(n+'')},
{id:'sw53',name:'Starts 53',desc:'First 2 digits are 53',rarity:'Common',ep:500,emoji:'5️⃣3️⃣',check:n=>/^53/.test(n+'')},
{id:'sw54',name:'Starts 54',desc:'First 2 digits are 54',rarity:'Common',ep:500,emoji:'5️⃣4️⃣',check:n=>/^54/.test(n+'')},
{id:'sw55',name:'Starts 55',desc:'First 2 digits are 55',rarity:'Common',ep:500,emoji:'5️⃣5️⃣',check:n=>/^55/.test(n+'')},
{id:'sw56',name:'Starts 56',desc:'First 2 digits are 56',rarity:'Common',ep:500,emoji:'5️⃣6️⃣',check:n=>/^56/.test(n+'')},
{id:'sw57',name:'Starts 57',desc:'First 2 digits are 57',rarity:'Common',ep:500,emoji:'5️⃣7️⃣',check:n=>/^57/.test(n+'')},
{id:'sw58',name:'Starts 58',desc:'First 2 digits are 58',rarity:'Common',ep:500,emoji:'5️⃣8️⃣',check:n=>/^58/.test(n+'')},
{id:'sw59',name:'Starts 59',desc:'First 2 digits are 59',rarity:'Common',ep:500,emoji:'5️⃣9️⃣',check:n=>/^59/.test(n+'')},
{id:'sw60',name:'Starts 60',desc:'First 2 digits are 60',rarity:'Common',ep:500,emoji:'6️⃣0️⃣',check:n=>/^60/.test(n+'')},
{id:'sw61',name:'Starts 61',desc:'First 2 digits are 61',rarity:'Common',ep:500,emoji:'6️⃣1️⃣',check:n=>/^61/.test(n+'')},
{id:'sw62',name:'Starts 62',desc:'First 2 digits are 62',rarity:'Common',ep:500,emoji:'6️⃣2️⃣',check:n=>/^62/.test(n+'')},
{id:'sw63',name:'Starts 63',desc:'First 2 digits are 63',rarity:'Common',ep:500,emoji:'6️⃣3️⃣',check:n=>/^63/.test(n+'')},
{id:'sw64',name:'Starts 64',desc:'First 2 digits are 64',rarity:'Common',ep:500,emoji:'6️⃣4️⃣',check:n=>/^64/.test(n+'')},
{id:'sw65',name:'Starts 65',desc:'First 2 digits are 65',rarity:'Common',ep:500,emoji:'6️⃣5️⃣',check:n=>/^65/.test(n+'')},
{id:'sw66',name:'Starts 66',desc:'First 2 digits are 66',rarity:'Common',ep:500,emoji:'6️⃣6️⃣',check:n=>/^66/.test(n+'')},
{id:'sw67',name:'Starts 67',desc:'First 2 digits are 67',rarity:'Common',ep:500,emoji:'6️⃣7️⃣',check:n=>/^67/.test(n+'')},
{id:'sw68',name:'Starts 68',desc:'First 2 digits are 68',rarity:'Common',ep:500,emoji:'6️⃣8️⃣',check:n=>/^68/.test(n+'')},
{id:'sw69',name:'Starts 69',desc:'First 2 digits are 69',rarity:'Common',ep:500,emoji:'6️⃣9️⃣',check:n=>/^69/.test(n+'')},
{id:'sw70',name:'Starts 70',desc:'First 2 digits are 70',rarity:'Common',ep:500,emoji:'7️⃣0️⃣',check:n=>/^70/.test(n+'')},
{id:'sw71',name:'Starts 71',desc:'First 2 digits are 71',rarity:'Common',ep:500,emoji:'7️⃣1️⃣',check:n=>/^71/.test(n+'')},
{id:'sw72',name:'Starts 72',desc:'First 2 digits are 72',rarity:'Common',ep:500,emoji:'7️⃣2️⃣',check:n=>/^72/.test(n+'')},
{id:'sw73',name:'Starts 73',desc:'First 2 digits are 73',rarity:'Common',ep:500,emoji:'7️⃣3️⃣',check:n=>/^73/.test(n+'')},
{id:'sw74',name:'Starts 74',desc:'First 2 digits are 74',rarity:'Common',ep:500,emoji:'7️⃣4️⃣',check:n=>/^74/.test(n+'')},
{id:'sw75',name:'Starts 75',desc:'First 2 digits are 75',rarity:'Common',ep:500,emoji:'7️⃣5️⃣',check:n=>/^75/.test(n+'')},
{id:'sw76',name:'Starts 76',desc:'First 2 digits are 76',rarity:'Common',ep:500,emoji:'7️⃣6️⃣',check:n=>/^76/.test(n+'')},
{id:'sw77',name:'Starts 77',desc:'First 2 digits are 77',rarity:'Common',ep:500,emoji:'7️⃣7️⃣',check:n=>/^77/.test(n+'')},
{id:'sw78',name:'Starts 78',desc:'First 2 digits are 78',rarity:'Common',ep:500,emoji:'7️⃣8️⃣',check:n=>/^78/.test(n+'')},
{id:'sw79',name:'Starts 79',desc:'First 2 digits are 79',rarity:'Common',ep:500,emoji:'7️⃣9️⃣',check:n=>/^79/.test(n+'')},
{id:'sw80',name:'Starts 80',desc:'First 2 digits are 80',rarity:'Common',ep:500,emoji:'8️⃣0️⃣',check:n=>/^80/.test(n+'')},
{id:'sw81',name:'Starts 81',desc:'First 2 digits are 81',rarity:'Common',ep:500,emoji:'8️⃣1️⃣',check:n=>/^81/.test(n+'')},
{id:'sw82',name:'Starts 82',desc:'First 2 digits are 82',rarity:'Common',ep:500,emoji:'8️⃣2️⃣',check:n=>/^82/.test(n+'')},
{id:'sw83',name:'Starts 83',desc:'First 2 digits are 83',rarity:'Common',ep:500,emoji:'8️⃣3️⃣',check:n=>/^83/.test(n+'')},
{id:'sw84',name:'Starts 84',desc:'First 2 digits are 84',rarity:'Common',ep:500,emoji:'8️⃣4️⃣',check:n=>/^84/.test(n+'')},
{id:'sw85',name:'Starts 85',desc:'First 2 digits are 85',rarity:'Common',ep:500,emoji:'8️⃣5️⃣',check:n=>/^85/.test(n+'')},
{id:'sw86',name:'Starts 86',desc:'First 2 digits are 86',rarity:'Common',ep:500,emoji:'8️⃣6️⃣',check:n=>/^86/.test(n+'')},
{id:'sw87',name:'Starts 87',desc:'First 2 digits are 87',rarity:'Common',ep:500,emoji:'8️⃣7️⃣',check:n=>/^87/.test(n+'')},
{id:'sw88',name:'Starts 88',desc:'First 2 digits are 88',rarity:'Common',ep:500,emoji:'8️⃣8️⃣',check:n=>/^88/.test(n+'')},
{id:'sw89',name:'Starts 89',desc:'First 2 digits are 89',rarity:'Common',ep:500,emoji:'8️⃣9️⃣',check:n=>/^89/.test(n+'')},
{id:'sw90',name:'Starts 90',desc:'First 2 digits are 90',rarity:'Common',ep:500,emoji:'9️⃣0️⃣',check:n=>/^90/.test(n+'')},
{id:'sw91',name:'Starts 91',desc:'First 2 digits are 91',rarity:'Common',ep:500,emoji:'9️⃣1️⃣',check:n=>/^91/.test(n+'')},
{id:'sw92',name:'Starts 92',desc:'First 2 digits are 92',rarity:'Common',ep:500,emoji:'9️⃣2️⃣',check:n=>/^92/.test(n+'')},
{id:'sw93',name:'Starts 93',desc:'First 2 digits are 93',rarity:'Common',ep:500,emoji:'9️⃣3️⃣',check:n=>/^93/.test(n+'')},
{id:'sw94',name:'Starts 94',desc:'First 2 digits are 94',rarity:'Common',ep:500,emoji:'9️⃣4️⃣',check:n=>/^94/.test(n+'')},
{id:'sw95',name:'Starts 95',desc:'First 2 digits are 95',rarity:'Common',ep:500,emoji:'9️⃣5️⃣',check:n=>/^95/.test(n+'')},
{id:'sw96',name:'Starts 96',desc:'First 2 digits are 96',rarity:'Common',ep:500,emoji:'9️⃣6️⃣',check:n=>/^96/.test(n+'')},
{id:'sw97',name:'Starts 97',desc:'First 2 digits are 97',rarity:'Common',ep:500,emoji:'9️⃣7️⃣',check:n=>/^97/.test(n+'')},
{id:'sw98',name:'Starts 98',desc:'First 2 digits are 98',rarity:'Common',ep:500,emoji:'9️⃣8️⃣',check:n=>/^98/.test(n+'')},
{id:'sw99',name:'Starts 99',desc:'First 2 digits are 99',rarity:'Common',ep:500,emoji:'9️⃣9️⃣',check:n=>/^99/.test(n+'')},
// === ENDS WITH (90) ===
{id:'ew10',name:'Ends 10',desc:'Last 2 digits are 10',rarity:'Common',ep:500,emoji:'0️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='10'}},
{id:'ew11',name:'Ends 11',desc:'Last 2 digits are 11',rarity:'Common',ep:500,emoji:'1️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='11'}},
{id:'ew12',name:'Ends 12',desc:'Last 2 digits are 12',rarity:'Common',ep:500,emoji:'2️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='12'}},
{id:'ew13',name:'Ends 13',desc:'Last 2 digits are 13',rarity:'Common',ep:500,emoji:'3️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='13'}},
{id:'ew14',name:'Ends 14',desc:'Last 2 digits are 14',rarity:'Common',ep:500,emoji:'4️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='14'}},
{id:'ew15',name:'Ends 15',desc:'Last 2 digits are 15',rarity:'Common',ep:500,emoji:'5️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='15'}},
{id:'ew16',name:'Ends 16',desc:'Last 2 digits are 16',rarity:'Common',ep:500,emoji:'6️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='16'}},
{id:'ew17',name:'Ends 17',desc:'Last 2 digits are 17',rarity:'Common',ep:500,emoji:'7️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='17'}},
{id:'ew18',name:'Ends 18',desc:'Last 2 digits are 18',rarity:'Common',ep:500,emoji:'8️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='18'}},
{id:'ew19',name:'Ends 19',desc:'Last 2 digits are 19',rarity:'Common',ep:500,emoji:'9️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='19'}},
{id:'ew20',name:'Ends 20',desc:'Last 2 digits are 20',rarity:'Common',ep:500,emoji:'0️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='20'}},
{id:'ew21',name:'Ends 21',desc:'Last 2 digits are 21',rarity:'Common',ep:500,emoji:'1️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='21'}},
{id:'ew22',name:'Ends 22',desc:'Last 2 digits are 22',rarity:'Common',ep:500,emoji:'2️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='22'}},
{id:'ew23',name:'Ends 23',desc:'Last 2 digits are 23',rarity:'Common',ep:500,emoji:'3️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='23'}},
{id:'ew24',name:'Ends 24',desc:'Last 2 digits are 24',rarity:'Common',ep:500,emoji:'4️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='24'}},
{id:'ew25',name:'Ends 25',desc:'Last 2 digits are 25',rarity:'Common',ep:500,emoji:'5️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='25'}},
{id:'ew26',name:'Ends 26',desc:'Last 2 digits are 26',rarity:'Common',ep:500,emoji:'6️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='26'}},
{id:'ew27',name:'Ends 27',desc:'Last 2 digits are 27',rarity:'Common',ep:500,emoji:'7️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='27'}},
{id:'ew28',name:'Ends 28',desc:'Last 2 digits are 28',rarity:'Common',ep:500,emoji:'8️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='28'}},
{id:'ew29',name:'Ends 29',desc:'Last 2 digits are 29',rarity:'Common',ep:500,emoji:'9️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='29'}},
{id:'ew30',name:'Ends 30',desc:'Last 2 digits are 30',rarity:'Common',ep:500,emoji:'0️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='30'}},
{id:'ew31',name:'Ends 31',desc:'Last 2 digits are 31',rarity:'Common',ep:500,emoji:'1️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='31'}},
{id:'ew32',name:'Ends 32',desc:'Last 2 digits are 32',rarity:'Common',ep:500,emoji:'2️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='32'}},
{id:'ew33',name:'Ends 33',desc:'Last 2 digits are 33',rarity:'Common',ep:500,emoji:'3️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='33'}},
{id:'ew34',name:'Ends 34',desc:'Last 2 digits are 34',rarity:'Common',ep:500,emoji:'4️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='34'}},
{id:'ew35',name:'Ends 35',desc:'Last 2 digits are 35',rarity:'Common',ep:500,emoji:'5️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='35'}},
{id:'ew36',name:'Ends 36',desc:'Last 2 digits are 36',rarity:'Common',ep:500,emoji:'6️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='36'}},
{id:'ew37',name:'Ends 37',desc:'Last 2 digits are 37',rarity:'Common',ep:500,emoji:'7️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='37'}},
{id:'ew38',name:'Ends 38',desc:'Last 2 digits are 38',rarity:'Common',ep:500,emoji:'8️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='38'}},
{id:'ew39',name:'Ends 39',desc:'Last 2 digits are 39',rarity:'Common',ep:500,emoji:'9️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='39'}},
{id:'ew40',name:'Ends 40',desc:'Last 2 digits are 40',rarity:'Common',ep:500,emoji:'0️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='40'}},
{id:'ew41',name:'Ends 41',desc:'Last 2 digits are 41',rarity:'Common',ep:500,emoji:'1️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='41'}},
{id:'ew42',name:'Ends 42',desc:'Last 2 digits are 42',rarity:'Common',ep:500,emoji:'2️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='42'}},
{id:'ew43',name:'Ends 43',desc:'Last 2 digits are 43',rarity:'Common',ep:500,emoji:'3️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='43'}},
{id:'ew44',name:'Ends 44',desc:'Last 2 digits are 44',rarity:'Common',ep:500,emoji:'4️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='44'}},
{id:'ew45',name:'Ends 45',desc:'Last 2 digits are 45',rarity:'Common',ep:500,emoji:'5️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='45'}},
{id:'ew46',name:'Ends 46',desc:'Last 2 digits are 46',rarity:'Common',ep:500,emoji:'6️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='46'}},
{id:'ew47',name:'Ends 47',desc:'Last 2 digits are 47',rarity:'Common',ep:500,emoji:'7️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='47'}},
{id:'ew48',name:'Ends 48',desc:'Last 2 digits are 48',rarity:'Common',ep:500,emoji:'8️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='48'}},
{id:'ew49',name:'Ends 49',desc:'Last 2 digits are 49',rarity:'Common',ep:500,emoji:'9️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='49'}},
{id:'ew50',name:'Ends 50',desc:'Last 2 digits are 50',rarity:'Common',ep:500,emoji:'0️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='50'}},
{id:'ew51',name:'Ends 51',desc:'Last 2 digits are 51',rarity:'Common',ep:500,emoji:'1️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='51'}},
{id:'ew52',name:'Ends 52',desc:'Last 2 digits are 52',rarity:'Common',ep:500,emoji:'2️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='52'}},
{id:'ew53',name:'Ends 53',desc:'Last 2 digits are 53',rarity:'Common',ep:500,emoji:'3️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='53'}},
{id:'ew54',name:'Ends 54',desc:'Last 2 digits are 54',rarity:'Common',ep:500,emoji:'4️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='54'}},
{id:'ew55',name:'Ends 55',desc:'Last 2 digits are 55',rarity:'Common',ep:500,emoji:'5️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='55'}},
{id:'ew56',name:'Ends 56',desc:'Last 2 digits are 56',rarity:'Common',ep:500,emoji:'6️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='56'}},
{id:'ew57',name:'Ends 57',desc:'Last 2 digits are 57',rarity:'Common',ep:500,emoji:'7️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='57'}},
{id:'ew58',name:'Ends 58',desc:'Last 2 digits are 58',rarity:'Common',ep:500,emoji:'8️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='58'}},
{id:'ew59',name:'Ends 59',desc:'Last 2 digits are 59',rarity:'Common',ep:500,emoji:'9️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='59'}},
{id:'ew60',name:'Ends 60',desc:'Last 2 digits are 60',rarity:'Common',ep:500,emoji:'0️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='60'}},
{id:'ew61',name:'Ends 61',desc:'Last 2 digits are 61',rarity:'Common',ep:500,emoji:'1️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='61'}},
{id:'ew62',name:'Ends 62',desc:'Last 2 digits are 62',rarity:'Common',ep:500,emoji:'2️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='62'}},
{id:'ew63',name:'Ends 63',desc:'Last 2 digits are 63',rarity:'Common',ep:500,emoji:'3️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='63'}},
{id:'ew64',name:'Ends 64',desc:'Last 2 digits are 64',rarity:'Common',ep:500,emoji:'4️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='64'}},
{id:'ew65',name:'Ends 65',desc:'Last 2 digits are 65',rarity:'Common',ep:500,emoji:'5️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='65'}},
{id:'ew66',name:'Ends 66',desc:'Last 2 digits are 66',rarity:'Common',ep:500,emoji:'6️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='66'}},
{id:'ew67',name:'Ends 67',desc:'Last 2 digits are 67',rarity:'Common',ep:500,emoji:'7️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='67'}},
{id:'ew68',name:'Ends 68',desc:'Last 2 digits are 68',rarity:'Common',ep:500,emoji:'8️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='68'}},
{id:'ew69',name:'Ends 69',desc:'Last 2 digits are 69',rarity:'Common',ep:500,emoji:'9️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='69'}},
{id:'ew70',name:'Ends 70',desc:'Last 2 digits are 70',rarity:'Common',ep:500,emoji:'0️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='70'}},
{id:'ew71',name:'Ends 71',desc:'Last 2 digits are 71',rarity:'Common',ep:500,emoji:'1️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='71'}},
{id:'ew72',name:'Ends 72',desc:'Last 2 digits are 72',rarity:'Common',ep:500,emoji:'2️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='72'}},
{id:'ew73',name:'Ends 73',desc:'Last 2 digits are 73',rarity:'Common',ep:500,emoji:'3️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='73'}},
{id:'ew74',name:'Ends 74',desc:'Last 2 digits are 74',rarity:'Common',ep:500,emoji:'4️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='74'}},
{id:'ew75',name:'Ends 75',desc:'Last 2 digits are 75',rarity:'Common',ep:500,emoji:'5️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='75'}},
{id:'ew76',name:'Ends 76',desc:'Last 2 digits are 76',rarity:'Common',ep:500,emoji:'6️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='76'}},
{id:'ew77',name:'Ends 77',desc:'Last 2 digits are 77',rarity:'Common',ep:500,emoji:'7️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='77'}},
{id:'ew78',name:'Ends 78',desc:'Last 2 digits are 78',rarity:'Common',ep:500,emoji:'8️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='78'}},
{id:'ew79',name:'Ends 79',desc:'Last 2 digits are 79',rarity:'Common',ep:500,emoji:'9️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='79'}},
{id:'ew80',name:'Ends 80',desc:'Last 2 digits are 80',rarity:'Common',ep:500,emoji:'0️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='80'}},
{id:'ew81',name:'Ends 81',desc:'Last 2 digits are 81',rarity:'Common',ep:500,emoji:'1️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='81'}},
{id:'ew82',name:'Ends 82',desc:'Last 2 digits are 82',rarity:'Common',ep:500,emoji:'2️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='82'}},
{id:'ew83',name:'Ends 83',desc:'Last 2 digits are 83',rarity:'Common',ep:500,emoji:'3️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='83'}},
{id:'ew84',name:'Ends 84',desc:'Last 2 digits are 84',rarity:'Common',ep:500,emoji:'4️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='84'}},
{id:'ew85',name:'Ends 85',desc:'Last 2 digits are 85',rarity:'Common',ep:500,emoji:'5️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='85'}},
{id:'ew86',name:'Ends 86',desc:'Last 2 digits are 86',rarity:'Common',ep:500,emoji:'6️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='86'}},
{id:'ew87',name:'Ends 87',desc:'Last 2 digits are 87',rarity:'Common',ep:500,emoji:'7️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='87'}},
{id:'ew88',name:'Ends 88',desc:'Last 2 digits are 88',rarity:'Common',ep:500,emoji:'8️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='88'}},
{id:'ew89',name:'Ends 89',desc:'Last 2 digits are 89',rarity:'Common',ep:500,emoji:'9️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='89'}},
{id:'ew90',name:'Ends 90',desc:'Last 2 digits are 90',rarity:'Common',ep:500,emoji:'0️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='90'}},
{id:'ew91',name:'Ends 91',desc:'Last 2 digits are 91',rarity:'Common',ep:500,emoji:'1️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='91'}},
{id:'ew92',name:'Ends 92',desc:'Last 2 digits are 92',rarity:'Common',ep:500,emoji:'2️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='92'}},
{id:'ew93',name:'Ends 93',desc:'Last 2 digits are 93',rarity:'Common',ep:500,emoji:'3️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='93'}},
{id:'ew94',name:'Ends 94',desc:'Last 2 digits are 94',rarity:'Common',ep:500,emoji:'4️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='94'}},
{id:'ew95',name:'Ends 95',desc:'Last 2 digits are 95',rarity:'Common',ep:500,emoji:'5️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='95'}},
{id:'ew96',name:'Ends 96',desc:'Last 2 digits are 96',rarity:'Common',ep:500,emoji:'6️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='96'}},
{id:'ew97',name:'Ends 97',desc:'Last 2 digits are 97',rarity:'Common',ep:500,emoji:'7️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='97'}},
{id:'ew98',name:'Ends 98',desc:'Last 2 digits are 98',rarity:'Common',ep:500,emoji:'8️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='98'}},
{id:'ew99',name:'Ends 99',desc:'Last 2 digits are 99',rarity:'Common',ep:500,emoji:'9️⃣',check:n=>{const s=n+'';return s.length>=2&&s.slice(-2)==='99'}},
{id:'has3x0',name:'Three 0s',desc:'Contains three 0s in a row',rarity:'Uncommon',ep:2000,emoji:'0️⃣',check:n=>new RegExp('0{3}').test(n+'')},
{id:'has3x1',name:'Three 1s',desc:'Contains three 1s in a row',rarity:'Uncommon',ep:2000,emoji:'1️⃣',check:n=>new RegExp('1{3}').test(n+'')},
{id:'has3x2',name:'Three 2s',desc:'Contains three 2s in a row',rarity:'Uncommon',ep:2000,emoji:'2️⃣',check:n=>new RegExp('2{3}').test(n+'')},
{id:'has3x3',name:'Three 3s',desc:'Contains three 3s in a row',rarity:'Uncommon',ep:2000,emoji:'3️⃣',check:n=>new RegExp('3{3}').test(n+'')},
{id:'has3x4',name:'Three 4s',desc:'Contains three 4s in a row',rarity:'Uncommon',ep:2000,emoji:'4️⃣',check:n=>new RegExp('4{3}').test(n+'')},
{id:'has3x5',name:'Three 5s',desc:'Contains three 5s in a row',rarity:'Uncommon',ep:2000,emoji:'5️⃣',check:n=>new RegExp('5{3}').test(n+'')},
{id:'has3x6',name:'Three 6s',desc:'Contains three 6s in a row',rarity:'Uncommon',ep:2000,emoji:'6️⃣',check:n=>new RegExp('6{3}').test(n+'')},
{id:'has3x7',name:'Three 7s',desc:'Contains three 7s in a row',rarity:'Uncommon',ep:2000,emoji:'7️⃣',check:n=>new RegExp('7{3}').test(n+'')},
{id:'has3x8',name:'Three 8s',desc:'Contains three 8s in a row',rarity:'Uncommon',ep:2000,emoji:'8️⃣',check:n=>new RegExp('8{3}').test(n+'')},
{id:'has3x9',name:'Three 9s',desc:'Contains three 9s in a row',rarity:'Uncommon',ep:2000,emoji:'9️⃣',check:n=>new RegExp('9{3}').test(n+'')},
{id:'has2x0',name:'Two 0s',desc:'Contains two 0s in a row',rarity:'Common',ep:500,emoji:'0️⃣',check:n=>new RegExp('0{2}').test(n+'')},
{id:'has2x1',name:'Two 1s',desc:'Contains two 1s in a row',rarity:'Common',ep:500,emoji:'1️⃣',check:n=>new RegExp('1{2}').test(n+'')},
{id:'has2x2',name:'Two 2s',desc:'Contains two 2s in a row',rarity:'Common',ep:500,emoji:'2️⃣',check:n=>new RegExp('2{2}').test(n+'')},
{id:'has2x3',name:'Two 3s',desc:'Contains two 3s in a row',rarity:'Common',ep:500,emoji:'3️⃣',check:n=>new RegExp('3{2}').test(n+'')},
{id:'has2x4',name:'Two 4s',desc:'Contains two 4s in a row',rarity:'Common',ep:500,emoji:'4️⃣',check:n=>new RegExp('4{2}').test(n+'')},
{id:'has2x5',name:'Two 5s',desc:'Contains two 5s in a row',rarity:'Common',ep:500,emoji:'5️⃣',check:n=>new RegExp('5{2}').test(n+'')},
{id:'has2x6',name:'Two 6s',desc:'Contains two 6s in a row',rarity:'Common',ep:500,emoji:'6️⃣',check:n=>new RegExp('6{2}').test(n+'')},
{id:'has2x7',name:'Two 7s',desc:'Contains two 7s in a row',rarity:'Common',ep:500,emoji:'7️⃣',check:n=>new RegExp('7{2}').test(n+'')},
{id:'has2x8',name:'Two 8s',desc:'Contains two 8s in a row',rarity:'Common',ep:500,emoji:'8️⃣',check:n=>new RegExp('8{2}').test(n+'')},
{id:'has2x9',name:'Two 9s',desc:'Contains two 9s in a row',rarity:'Common',ep:500,emoji:'9️⃣',check:n=>new RegExp('9{2}').test(n+'')},
{id:'dc02',name:'Two 0s anywhere',desc:'Contains digit 0 at least twice',rarity:'Common',ep:500,emoji:'2️⃣',check:n=>{const s=n+'';let c=0;for(let i=0;i<s.length;i++)if(s[i]==='0')c++;return c>=2}},
{id:'dc03',name:'Three 0s anywhere',desc:'Contains digit 0 at least 3 times',rarity:'Uncommon',ep:2000,emoji:'3️⃣',check:n=>{const s=n+'';let c=0;for(let i=0;i<s.length;i++)if(s[i]==='0')c++;return c>=3}},
{id:'dc04',name:'Four 0s anywhere',desc:'Contains digit 0 at least 4 times',rarity:'Rare',ep:10000,emoji:'4️⃣',check:n=>{const s=n+'';let c=0;for(let i=0;i<s.length;i++)if(s[i]==='0')c++;return c>=4}},
{id:'dc12',name:'Two 1s anywhere',desc:'Contains digit 1 at least twice',rarity:'Common',ep:500,emoji:'2️⃣',check:n=>{const s=n+'';let c=0;for(let i=0;i<s.length;i++)if(s[i]==='1')c++;return c>=2}},
{id:'dc13',name:'Three 1s anywhere',desc:'Contains digit 1 at least 3 times',rarity:'Uncommon',ep:2000,emoji:'3️⃣',check:n=>{const s=n+'';let c=0;for(let i=0;i<s.length;i++)if(s[i]==='1')c++;return c>=3}},
{id:'dc14',name:'Four 1s anywhere',desc:'Contains digit 1 at least 4 times',rarity:'Rare',ep:10000,emoji:'4️⃣',check:n=>{const s=n+'';let c=0;for(let i=0;i<s.length;i++)if(s[i]==='1')c++;return c>=4}},
{id:'dc22',name:'Two 2s anywhere',desc:'Contains digit 2 at least twice',rarity:'Common',ep:500,emoji:'2️⃣',check:n=>{const s=n+'';let c=0;for(let i=0;i<s.length;i++)if(s[i]==='2')c++;return c>=2}},
{id:'dc23',name:'Three 2s anywhere',desc:'Contains digit 2 at least 3 times',rarity:'Uncommon',ep:2000,emoji:'3️⃣',check:n=>{const s=n+'';let c=0;for(let i=0;i<s.length;i++)if(s[i]==='2')c++;return c>=3}},
{id:'dc24',name:'Four 2s anywhere',desc:'Contains digit 2 at least 4 times',rarity:'Rare',ep:10000,emoji:'4️⃣',check:n=>{const s=n+'';let c=0;for(let i=0;i<s.length;i++)if(s[i]==='2')c++;return c>=4}},
{id:'dc32',name:'Two 3s anywhere',desc:'Contains digit 3 at least twice',rarity:'Common',ep:500,emoji:'2️⃣',check:n=>{const s=n+'';let c=0;for(let i=0;i<s.length;i++)if(s[i]==='3')c++;return c>=2}},
{id:'dc33',name:'Three 3s anywhere',desc:'Contains digit 3 at least 3 times',rarity:'Uncommon',ep:2000,emoji:'3️⃣',check:n=>{const s=n+'';let c=0;for(let i=0;i<s.length;i++)if(s[i]==='3')c++;return c>=3}},
{id:'dc34',name:'Four 3s anywhere',desc:'Contains digit 3 at least 4 times',rarity:'Rare',ep:10000,emoji:'4️⃣',check:n=>{const s=n+'';let c=0;for(let i=0;i<s.length;i++)if(s[i]==='3')c++;return c>=4}},
{id:'dc42',name:'Two 4s anywhere',desc:'Contains digit 4 at least twice',rarity:'Common',ep:500,emoji:'2️⃣',check:n=>{const s=n+'';let c=0;for(let i=0;i<s.length;i++)if(s[i]==='4')c++;return c>=2}},
{id:'dc43',name:'Three 4s anywhere',desc:'Contains digit 4 at least 3 times',rarity:'Uncommon',ep:2000,emoji:'3️⃣',check:n=>{const s=n+'';let c=0;for(let i=0;i<s.length;i++)if(s[i]==='4')c++;return c>=3}},
{id:'dc44',name:'Four 4s anywhere',desc:'Contains digit 4 at least 4 times',rarity:'Rare',ep:10000,emoji:'4️⃣',check:n=>{const s=n+'';let c=0;for(let i=0;i<s.length;i++)if(s[i]==='4')c++;return c>=4}},
{id:'dc52',name:'Two 5s anywhere',desc:'Contains digit 5 at least twice',rarity:'Common',ep:500,emoji:'2️⃣',check:n=>{const s=n+'';let c=0;for(let i=0;i<s.length;i++)if(s[i]==='5')c++;return c>=2}},
{id:'dc53',name:'Three 5s anywhere',desc:'Contains digit 5 at least 3 times',rarity:'Uncommon',ep:2000,emoji:'3️⃣',check:n=>{const s=n+'';let c=0;for(let i=0;i<s.length;i++)if(s[i]==='5')c++;return c>=3}},
{id:'dc54',name:'Four 5s anywhere',desc:'Contains digit 5 at least 4 times',rarity:'Rare',ep:10000,emoji:'4️⃣',check:n=>{const s=n+'';let c=0;for(let i=0;i<s.length;i++)if(s[i]==='5')c++;return c>=4}},
{id:'dc62',name:'Two 6s anywhere',desc:'Contains digit 6 at least twice',rarity:'Common',ep:500,emoji:'2️⃣',check:n=>{const s=n+'';let c=0;for(let i=0;i<s.length;i++)if(s[i]==='6')c++;return c>=2}},
{id:'dc63',name:'Three 6s anywhere',desc:'Contains digit 6 at least 3 times',rarity:'Uncommon',ep:2000,emoji:'3️⃣',check:n=>{const s=n+'';let c=0;for(let i=0;i<s.length;i++)if(s[i]==='6')c++;return c>=3}},
{id:'dc64',name:'Four 6s anywhere',desc:'Contains digit 6 at least 4 times',rarity:'Rare',ep:10000,emoji:'4️⃣',check:n=>{const s=n+'';let c=0;for(let i=0;i<s.length;i++)if(s[i]==='6')c++;return c>=4}},
{id:'dc72',name:'Two 7s anywhere',desc:'Contains digit 7 at least twice',rarity:'Common',ep:500,emoji:'2️⃣',check:n=>{const s=n+'';let c=0;for(let i=0;i<s.length;i++)if(s[i]==='7')c++;return c>=2}},
{id:'dc73',name:'Three 7s anywhere',desc:'Contains digit 7 at least 3 times',rarity:'Uncommon',ep:2000,emoji:'3️⃣',check:n=>{const s=n+'';let c=0;for(let i=0;i<s.length;i++)if(s[i]==='7')c++;return c>=3}},
{id:'dc74',name:'Four 7s anywhere',desc:'Contains digit 7 at least 4 times',rarity:'Rare',ep:10000,emoji:'4️⃣',check:n=>{const s=n+'';let c=0;for(let i=0;i<s.length;i++)if(s[i]==='7')c++;return c>=4}},
{id:'dc82',name:'Two 8s anywhere',desc:'Contains digit 8 at least twice',rarity:'Common',ep:500,emoji:'2️⃣',check:n=>{const s=n+'';let c=0;for(let i=0;i<s.length;i++)if(s[i]==='8')c++;return c>=2}},
{id:'dc83',name:'Three 8s anywhere',desc:'Contains digit 8 at least 3 times',rarity:'Uncommon',ep:2000,emoji:'3️⃣',check:n=>{const s=n+'';let c=0;for(let i=0;i<s.length;i++)if(s[i]==='8')c++;return c>=3}},
{id:'dc84',name:'Four 8s anywhere',desc:'Contains digit 8 at least 4 times',rarity:'Rare',ep:10000,emoji:'4️⃣',check:n=>{const s=n+'';let c=0;for(let i=0;i<s.length;i++)if(s[i]==='8')c++;return c>=4}},
{id:'dc92',name:'Two 9s anywhere',desc:'Contains digit 9 at least twice',rarity:'Common',ep:500,emoji:'2️⃣',check:n=>{const s=n+'';let c=0;for(let i=0;i<s.length;i++)if(s[i]==='9')c++;return c>=2}},
{id:'dc93',name:'Three 9s anywhere',desc:'Contains digit 9 at least 3 times',rarity:'Uncommon',ep:2000,emoji:'3️⃣',check:n=>{const s=n+'';let c=0;for(let i=0;i<s.length;i++)if(s[i]==='9')c++;return c>=3}},
{id:'dc94',name:'Four 9s anywhere',desc:'Contains digit 9 at least 4 times',rarity:'Rare',ep:10000,emoji:'4️⃣',check:n=>{const s=n+'';let c=0;for(let i=0;i<s.length;i++)if(s[i]==='9')c++;return c>=4}},
{id:'se2',name:'Sum 2',desc:'Digit sum equals 2',rarity:'Common',ep:500,emoji:'2️⃣',check:n=>{let t=0;const x=n+'';for(let i=0;i<x.length;i++)t+=+x[i];return t===2}},
{id:'se3',name:'Sum 3',desc:'Digit sum equals 3',rarity:'Common',ep:500,emoji:'3️⃣',check:n=>{let t=0;const x=n+'';for(let i=0;i<x.length;i++)t+=+x[i];return t===3}},
{id:'se4',name:'Sum 4',desc:'Digit sum equals 4',rarity:'Common',ep:500,emoji:'4️⃣',check:n=>{let t=0;const x=n+'';for(let i=0;i<x.length;i++)t+=+x[i];return t===4}},
{id:'se5',name:'Sum 5',desc:'Digit sum equals 5',rarity:'Common',ep:500,emoji:'5️⃣',check:n=>{let t=0;const x=n+'';for(let i=0;i<x.length;i++)t+=+x[i];return t===5}},
{id:'se6',name:'Sum 6',desc:'Digit sum equals 6',rarity:'Common',ep:500,emoji:'6️⃣',check:n=>{let t=0;const x=n+'';for(let i=0;i<x.length;i++)t+=+x[i];return t===6}},
{id:'se7',name:'Sum 7',desc:'Digit sum equals 7',rarity:'Common',ep:500,emoji:'7️⃣',check:n=>{let t=0;const x=n+'';for(let i=0;i<x.length;i++)t+=+x[i];return t===7}},
{id:'se8',name:'Sum 8',desc:'Digit sum equals 8',rarity:'Common',ep:500,emoji:'8️⃣',check:n=>{let t=0;const x=n+'';for(let i=0;i<x.length;i++)t+=+x[i];return t===8}},
{id:'se9',name:'Sum 9',desc:'Digit sum equals 9',rarity:'Common',ep:500,emoji:'9️⃣',check:n=>{let t=0;const x=n+'';for(let i=0;i<x.length;i++)t+=+x[i];return t===9}},
{id:'se10',name:'Sum 10',desc:'Digit sum equals 10',rarity:'Common',ep:500,emoji:'🔢',check:n=>{let t=0;const x=n+'';for(let i=0;i<x.length;i++)t+=+x[i];return t===10}},
{id:'se11',name:'Sum 11',desc:'Digit sum equals 11',rarity:'Common',ep:500,emoji:'🔢',check:n=>{let t=0;const x=n+'';for(let i=0;i<x.length;i++)t+=+x[i];return t===11}},
{id:'se12',name:'Sum 12',desc:'Digit sum equals 12',rarity:'Common',ep:500,emoji:'🔢',check:n=>{let t=0;const x=n+'';for(let i=0;i<x.length;i++)t+=+x[i];return t===12}},
{id:'se13',name:'Sum 13',desc:'Digit sum equals 13',rarity:'Common',ep:500,emoji:'🔢',check:n=>{let t=0;const x=n+'';for(let i=0;i<x.length;i++)t+=+x[i];return t===13}},
{id:'se14',name:'Sum 14',desc:'Digit sum equals 14',rarity:'Common',ep:500,emoji:'🔢',check:n=>{let t=0;const x=n+'';for(let i=0;i<x.length;i++)t+=+x[i];return t===14}},
{id:'se15',name:'Sum 15',desc:'Digit sum equals 15',rarity:'Common',ep:500,emoji:'🔢',check:n=>{let t=0;const x=n+'';for(let i=0;i<x.length;i++)t+=+x[i];return t===15}},
{id:'se16',name:'Sum 16',desc:'Digit sum equals 16',rarity:'Common',ep:500,emoji:'🔢',check:n=>{let t=0;const x=n+'';for(let i=0;i<x.length;i++)t+=+x[i];return t===16}},
{id:'se17',name:'Sum 17',desc:'Digit sum equals 17',rarity:'Common',ep:500,emoji:'🔢',check:n=>{let t=0;const x=n+'';for(let i=0;i<x.length;i++)t+=+x[i];return t===17}},
{id:'se18',name:'Sum 18',desc:'Digit sum equals 18',rarity:'Common',ep:500,emoji:'🔢',check:n=>{let t=0;const x=n+'';for(let i=0;i<x.length;i++)t+=+x[i];return t===18}},
{id:'se19',name:'Sum 19',desc:'Digit sum equals 19',rarity:'Common',ep:500,emoji:'🔢',check:n=>{let t=0;const x=n+'';for(let i=0;i<x.length;i++)t+=+x[i];return t===19}},
{id:'se20',name:'Sum 20',desc:'Digit sum equals 20',rarity:'Common',ep:500,emoji:'🔢',check:n=>{let t=0;const x=n+'';for(let i=0;i<x.length;i++)t+=+x[i];return t===20}},

// === ULTRA RARE (30) ===
{id:'ur_0',name:'Zilch',desc:'Exactly 0',rarity:'Mythic',ep:350000,emoji:'🫥',check:n=>n===0},
{id:'ur_999999',name:'Maximum',desc:'Exactly 999999',rarity:'Mythic',ep:350000,emoji:'💯',check:n=>n===999999},
{id:'ur_123456',name:'Perfect Staircase',desc:'Exactly 123456',rarity:'Mythic',ep:350000,emoji:'🪜',check:n=>n===123456},
{id:'ur_654321',name:'Perfect Reverse',desc:'Exactly 654321',rarity:'Mythic',ep:350000,emoji:'🪜',check:n=>n===654321},
{id:'ur_111111',name:'All Ones',desc:'Exactly 111111',rarity:'Mythic',ep:350000,emoji:'1️⃣',check:n=>n===111111},
{id:'ur_222222',name:'All Twos',desc:'Exactly 222222',rarity:'Mythic',ep:350000,emoji:'2️⃣',check:n=>n===222222},
{id:'ur_333333',name:'All Threes',desc:'Exactly 333333',rarity:'Mythic',ep:350000,emoji:'3️⃣',check:n=>n===333333},
{id:'ur_444444',name:'All Fours',desc:'Exactly 444444',rarity:'Mythic',ep:350000,emoji:'4️⃣',check:n=>n===444444},
{id:'ur_555555',name:'All Fives',desc:'Exactly 555555',rarity:'Mythic',ep:350000,emoji:'5️⃣',check:n=>n===555555},
{id:'ur_666666',name:'All Sixes',desc:'Exactly 666666',rarity:'Mythic',ep:350000,emoji:'6️⃣',check:n=>n===666666},
{id:'ur_777777',name:'All Sevens',desc:'Exactly 777777',rarity:'Godly',ep:500000,emoji:'7️⃣',check:n=>n===777777},
{id:'ur_888888',name:'All Eights',desc:'Exactly 888888',rarity:'Godly',ep:500000,emoji:'8️⃣',check:n=>n===888888},
{id:'ur_9nines',name:'All Nines',desc:'Exactly 999999',rarity:'Godly',ep:500000,emoji:'9️⃣',check:n=>n===999999},
{id:'ur_007',name:'Golden 007',desc:'Exactly 7',rarity:'Mythic',ep:350000,emoji:'🔫',check:n=>n===7},
{id:'ur_123321',name:'Mirror Staircase',desc:'Exactly 123321',rarity:'Mythic',ep:350000,emoji:'🪞',check:n=>n===123321},
{id:'ur_121212',name:'Clockwork',desc:'Exactly 121212',rarity:'Legendary',ep:200000,emoji:'🕐',check:n=>n===121212},
{id:'ur_101010',name:'Binary Clock',desc:'Exactly 101010',rarity:'Legendary',ep:200000,emoji:'💻',check:n=>n===101010},
{id:'ur_112358',name:'Fibonacci Sequence',desc:'Contains 112358',rarity:'Legendary',ep:200000,emoji:'🌀',check:n=>/112358/.test(n+'')},
{id:'ur_235711',name:'Primes',desc:'Contains 235711',rarity:'Legendary',ep:200000,emoji:'🔢',check:n=>/235711/.test(n+'')},
{id:'ur_1984',name:'Orwell',desc:'Exactly 1984',rarity:'Legendary',ep:200000,emoji:'📖',check:n=>n===1984},
{id:'ur_2001',name:'Odyssey',desc:'Exactly 2001',rarity:'Legendary',ep:200000,emoji:'🚀',check:n=>n===2001},
{id:'ur_8675309',name:'Jenny Full',desc:'Contains 8675309',rarity:'Godly',ep:500000,emoji:'📞',check:n=>/8675309/.test(n+'')},
{id:'ur_42',name:'Deep Thought',desc:'Exactly 42',rarity:'Mythic',ep:350000,emoji:'🌌',check:n=>n===42},
{id:'ur_80085',name:'Boobs',desc:'Contains 80085',rarity:'Mythic',ep:350000,emoji:'🫣',check:n=>/80085/.test(n+'')},
{id:'ur_69',name:'Nice',desc:'Contains 69',rarity:'Mythic',ep:350000,emoji:'😏',check:n=>/69/.test(n+'')},
{id:'ur_sum42',name:'Sum of Everything',desc:'Digit sum equals 42',rarity:'Legendary',ep:200000,emoji:'🌌',check:n=>{let t=0;const x=n+'';for(let i=0;i<x.length;i++)t+=+x[i];return t===42}},
{id:'ur_sumpi',name:'Pi Sum',desc:'Digit sum equals 15 (π digits)',rarity:'Rare',ep:10000,emoji:'🥧',check:n=>{let t=0;const x=n+'';for(let i=0;i<x.length;i++)t+=+x[i];return t===15}},
{id:'ur_primepal',name:'Prime Palindrome',desc:'Number is both prime and palindrome',rarity:'Epic',ep:50000,emoji:'🔄',check:n=>{const s=n+'';if(s!==s.split('').reverse().join('')||n<2)return false;for(let i=2;i*i<=n;i++)if(n%i===0)return false;return true}},
{id:'ur_powerpal',name:'Power Palindrome',desc:'Palindrome and a perfect square',rarity:'Epic',ep:50000,emoji:'🔲',check:n=>{const s=n+'';if(s!==s.split('').reverse().join(''))return false;const r=Math.round(Math.sqrt(n));return r*r===n}},
{id:'ur_godly',name:'Godly Roll',desc:'Contains your badge collection count',rarity:'Godly',ep:500000,emoji:'👑',check:n=>new RegExp(nrState.badgeCount+'').test(n+'')},

]
for(let i=NR_BADGES.length-1;i>=0;i--)if(NR_BADGES[i]==null)NR_BADGES.splice(i,1)
const nrLookup=new Map()
NR_BADGES.forEach(b=>{if(b&&b.id)nrLookup.set(b.id,b)})

function initNr(){
  if(nrStarted)return
  nrStarted=true
  const key='nr_'+getUsername()
  try{
    const d=JSON.parse(localStorage.getItem(key))
    if(d){nrState.ep=d.ep||0;nrState.rolls=d.rolls||0;nrState.badgeCount=d.badgeCount||0;nrState.badges=d.badges||{};nrState.collection=new Set(d.collection||[]);nrState.lastNumber=d.lastNumber;nrState.lastBadges=d.lastBadges||[];nrState.pastRolls=d.pastRolls||[];nrState.lastEpGain=d.lastEpGain||0;nrState.lastBaseEp=d.lastBaseEp||0}
  }catch(e){}
  renderNr()
  nrUpdateButton()
}
function saveNr(){
  try{localStorage.setItem('nr_'+getUsername(),JSON.stringify({ep:nrState.ep,rolls:nrState.rolls,badgeCount:nrState.badgeCount,badges:nrState.badges,collection:[...nrState.collection],lastNumber:nrState.lastNumber,lastBadges:nrState.lastBadges,pastRolls:nrState.pastRolls,lastEpGain:nrState.lastEpGain,lastBaseEp:nrState.lastBaseEp}))}catch(e){}
}
function getRollRarity(ep){
  if(ep<=0)return {label:'',color:'',emoji:''}
  if(ep<3000)return {label:'Common',color:'rgba(255,255,255,0.5)',emoji:'⬜'}
  if(ep<10000)return {label:'Uncommon',color:'#4fc3f7',emoji:'🟦'}
  if(ep<50000)return {label:'Rare',color:'#ab47bc',emoji:'🟣'}
  if(ep<150000)return {label:'Epic',color:'#ff6f00',emoji:'🟠'}
  if(ep<300000)return {label:'Legendary',color:'#ffd700',emoji:'🌟'}
  if(ep<500000)return {label:'Mythic',color:'#ff1744',emoji:'🔥'}
  return {label:'Godly',color:'#ff00ff',emoji:'👑'}
}
function renderNr(){
  const n=nrState.lastNumber
  const c=nrState.lastBadges||[]
  const rr=getRollRarity(nrState.lastEpGain)
  let html='<div class="nr-header"><h2>🎲 Number Roll</h2><p style="font-size:13px;color:rgba(255,255,255,0.45);font-style:italic;margin-top:-4px">because why not</p></div>'
  html+='<div class="nr-roll-area"><button class="nr-roll-btn" id="nrRollBtn" onclick="rollNr()">🎲 Roll!</button>'
  html+='<div class="nr-number" id="nrNumber">'+(n!==undefined?n.toLocaleString():'—')+'</div>'
  html+='<div class="nr-ep-display">'+(rr.emoji?rr.emoji+' ':'')+'<span id="nrEpGain">'+(nrState.lastEpGain||0)+'</span> EP'+(rr.label?' <span style="color:'+rr.color+';font-weight:700;font-size:12px">'+rr.label+'</span>':'')+'</div>'
  html+='<div class="nr-roll-count">Rolls: <span id="nrRollCount">'+nrState.rolls+'</span> · Total EP: <span id="nrTotalEp">'+nrState.ep+'</span> · Badges: <span id="nrBadgeCount">'+nrState.badgeCount+'</span>/'+NR_BADGES.length+'</div>'
  html+='</div>'
  if(c.length){
    html+='<div class="nr-badges-title">🏅 Badges Earned</div><div class="nr-badge-grid" id="nrBadgeGrid">'
    c.forEach((b,i)=>{
      const bg=nrLookup.get(b)
      if(!bg)return
      const isNew=nrState.newBadges&&nrState.newBadges.has(b)
      html+='<div class="nr-badge '+bg.rarity.toLowerCase()+(isNew?' nr-new-badge':'')+'" style="animation-delay:'+(i*80)+'ms" onclick="nrBadgeDetail(\''+b+'\')" title="Click for details">'+bg.emoji+' '+bg.name+' ['+bg.ep+'EP]</div>'
    })
    html+='</div>'
  }
  html+='<div class="nr-action-row"><button class="nr-collection-toggle" onclick="toggleNrCollection()">📚 View Collection ('+nrState.badgeCount+'/'+NR_BADGES.length+')</button>'
  html+='<button class="nr-past-btn" onclick="nrShowPastRolls()">📜 Past Rolls ('+nrState.pastRolls.length+')</button></div>'
  html+='<div class="nr-collection" id="nrCollection"><h3>Badge Collection</h3><div class="nr-col-grid">'
  ;[...NR_BADGES].sort((a,b)=>a.ep-b.ep).forEach(b=>{
    const owned=nrState.collection.has(b.id)
    html+='<div class="nr-col-badge'+(owned?' unlocked '+b.rarity.toLowerCase():'')+'" onclick="nrBadgeDetail(\''+b.id+'\')" title="Click for details">'+b.emoji+' '+b.name+(owned?' ✓':'')+'</div>'
  })
  html+='</div></div>'
  document.getElementById('nrContent').innerHTML=html
}
function toggleNrCollection(){
  const el=document.getElementById('nrCollection')
  if(el)el.classList.toggle('open')
}
function nrUpdateButton(){
  const btn=document.querySelector('.gs-btn[data-game="numberroll"]')
  if(btn){
    if(nrState.lastNumber!==undefined)btn.textContent='🎲 '+nrState.lastNumber.toLocaleString()
    else btn.textContent='🎲 Number Roll'
  }
  const hdr=document.getElementById('nrHeaderDisplay')
  if(hdr){
    if(nrState.lastNumber!==undefined)hdr.textContent='🎲 '+nrState.lastNumber.toLocaleString()
    else hdr.textContent='🎲 ?'
  }
}
function nrBadgeDetail(id){
  const bg=nrLookup.get(id)
  if(!bg)return
  const owned=nrState.collection.has(id)
  const count=nrState.badges[id]||0
  const existing=document.getElementById('nrBadgeModal')
  if(existing)existing.remove()
  const modal=document.createElement('div')
  modal.id='nrBadgeModal'
  modal.style.cssText='position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:1000'
  modal.onclick=function(e){if(e.target===this)this.remove()}
  modal.innerHTML='<div style="background:#1a1a2e;border:1px solid rgba(255,255,255,0.12);border-radius:16px;padding:30px;max-width:360px;width:90%;text-align:center">'+
    '<div style="font-size:40px;margin-bottom:10px">'+bg.emoji+'</div>'+
    '<h3 style="font-size:20px;font-weight:800;margin-bottom:6px;color:#fff">'+bg.name+'</h3>'+
    '<p style="color:rgba(255,255,255,0.6);font-size:14px;margin-bottom:12px">'+bg.desc+'</p>'+
    '<div style="display:flex;gap:8px;justify-content:center;margin-bottom:12px">'+
      '<span style="padding:4px 12px;border-radius:12px;font-size:12px;font-weight:600;background:rgba(255,255,255,0.08);color:#888;border:1px solid rgba(255,255,255,0.06)">'+bg.rarity+'</span>'+
      '<span style="padding:4px 12px;border-radius:12px;font-size:12px;font-weight:600;background:rgba(255,255,255,0.08);color:#888;border:1px solid rgba(255,255,255,0.06)">'+bg.ep+' EP</span>'+
    '</div>'+
    '<div style="color:'+(owned?'rgba(76,175,80,0.8)':'rgba(255,255,255,0.3)')+';font-size:13px;font-weight:600;margin-bottom:16px">'+
      (owned?'✅ Unlocked! (×'+count+')':'❌ Not yet unlocked')+
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
    m.innerHTML='<div style="background:#1a1a2e;border:1px solid rgba(255,255,255,0.12);border-radius:16px;padding:30px;max-width:360px;width:90%;text-align:center">'+
      '<h3 style="font-size:20px;font-weight:800;margin-bottom:6px;color:#fff">📜 Past Rolls</h3>'+
      '<p style="color:rgba(255,255,255,0.4);font-size:14px">No rolls yet. Click 🎲 Roll to start!</p>'+
      '<button onclick="this.closest(\'#nrPastModal\').remove()" style="margin-top:16px;padding:8px 24px;border:none;border-radius:10px;background:linear-gradient(135deg,#ff6b35,#f7c948);color:#1a1a1a;font-weight:700;font-size:13px;cursor:pointer">Close</button></div>'
    document.body.appendChild(m)
    return
  }
  let sortMode='date'
  let expanded={}
  function getBadgeCount(r){return Array.isArray(r.badges)?r.badges.length:r.badges||0}
  function rowHtml(r,idx){
    const bc=getBadgeCount(r)
    const epStr=r.ep>0?'<span style="color:#4caf50;font-weight:700">+'+r.ep+'EP</span>'+(r.mult?' <span style="color:rgba(255,255,255,0.25);font-size:11px">(base '+r.base+' ×'+r.mult.toFixed(1)+')</span>':''):'<span style="color:rgba(255,255,255,0.3)">0EP</span>'
    const uid='pr_'+idx
    const open=expanded[uid]
    const badges=r.badgeNames&&r.badgeNames.length?r.badgeNames.map(b=>'<span title="'+b.name+' ['+b.ep+'EP] · '+b.rarity+'" style="font-size:16px;cursor:pointer" onclick="nrBadgeDetail(\''+b.id+'\')">'+b.emoji+'</span>').join(''):'<span style="color:rgba(255,255,255,0.2);font-size:12px">-</span>'
    return '<div style="padding:6px 10px;border-radius:6px;background:'+(idx%2===0?'rgba(255,255,255,0.04)':'transparent')+';cursor:pointer" onclick="nrToggleRoll(\''+uid+'\',this)">'+
      '<div style="display:flex;justify-content:space-between;align-items:center">'+
      '<span><span class="pr_arr" style="color:rgba(255,255,255,0.3);margin-right:6px;font-size:10px">'+(open?'▼':'▶')+'</span><span style="color:#f7c948;font-weight:700;font-family:monospace">'+(idx+1)+'. '+r.n.toLocaleString()+'</span></span>'+
      '<span>'+epStr+' <span style="color:rgba(255,255,255,0.5)">'+bc+'</span></span></div>'+
      '<div class="pr_bdgs" style="display:'+(open?'flex':'none')+';flex-wrap:wrap;gap:4px;margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.06)">'+badges+'</div></div>'
  }
  function buildList(){
    let sorted=[...rolls]
    if(sortMode==='ep')sorted.sort((a,b)=>(b.ep||0)-(a.ep||0))
    else if(sortMode==='badges')sorted.sort((a,b)=>getBadgeCount(b)-getBadgeCount(a))
    expanded={}
    return sorted.map((r,i)=>rowHtml(r,i)).join('')
  }
  function sortBy(mode){sortMode=mode;var c=document.getElementById('nrPastContent');if(c)c.innerHTML=buildList();var sb=document.getElementById('nrSortBar');if(sb)sb.querySelectorAll('span').forEach(function(el,i){var keys=['date','ep','badges'];el.style.background=keys[i]===mode?'rgba(247,201,72,0.2)':'rgba(255,255,255,0.06)';el.style.color=keys[i]===mode?'#f7c948':'rgba(255,255,255,0.4)';el.style.borderColor=keys[i]===mode?'rgba(247,201,72,0.3)':'rgba(255,255,255,0.08)'})}
  window.nrToggleRoll=function(uid,el){var b=el.querySelector('.pr_bdgs');var a=el.querySelector('.pr_arr');if(b&&a){var now=b.style.display;b.style.display=now==='flex'?'none':'flex';a.textContent=now==='flex'?'▶':'▼'}}
  window.nrSortPastRolls=sortBy
  const modal=document.createElement('div')
  modal.id='nrPastModal'
  modal.style.cssText='position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:1000'
  modal.onclick=function(e){if(e.target===this){this.remove();delete window.nrToggleRoll;delete window.nrSortPastRolls}}
  modal.innerHTML='<div style="background:#1a1a2e;border:1px solid rgba(255,255,255,0.12);border-radius:16px;padding:20px 24px;max-width:440px;width:90%;max-height:75vh;display:flex;flex-direction:column">'+
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-shrink:0">'+
      '<h3 style="font-size:18px;font-weight:800;color:#fff;margin:0">📜 Past Rolls</h3>'+
      '<span style="color:rgba(255,255,255,0.3);font-size:12px">'+rolls.length+' total</span></div>'+
    '<div id="nrSortBar" style="display:flex;gap:6px;margin-bottom:10px;flex-shrink:0">'+
      ['Date','EP','Badges'].map(function(l,i){var k=['date','ep','badges'][i];return '<span style="padding:4px 12px;border-radius:10px;font-size:12px;font-weight:600;cursor:pointer;background:rgba(255,255,255,0.06);color:rgba(255,255,255,0.4);border:1px solid rgba(255,255,255,0.08)" onclick="nrSortPastRolls(\''+k+'\')">'+l+' ▼</span>'}).join('')+
    '</div>'+
    '<div style="overflow-y:auto;flex:1;min-height:0" id="nrPastContent">'+buildList()+'</div>'+
    '<button onclick="this.closest(\'#nrPastModal\').remove();delete window.nrToggleRoll;delete window.nrSortPastRolls" style="margin-top:12px;padding:8px 24px;border:none;border-radius:10px;background:linear-gradient(135deg,#ff6b35,#f7c948);color:#1a1a1a;font-weight:700;font-size:13px;cursor:pointer;flex-shrink:0">Close</button></div>'
  document.body.appendChild(modal)
}
function rollNr(){
  const btn=document.getElementById('nrRollBtn')
  if(btn)btn.disabled=true
  const epEl=document.getElementById('nrEpGain')
  const numEl=document.getElementById('nrNumber')
  const n=Math.floor(Math.random()*1000000)
  let frame=0
  const perDigit=8
  const total=6*perDigit
  const s=n.toString().padStart(6,'0')
  const iv=setInterval(()=>{
    frame++
    const rolling=Math.min(Math.floor(frame/perDigit),6)
    let d=''
    for(let i=0;i<6;i++){
      if(i<rolling)d+=s[i]
      else if(i===rolling)d+=Math.floor(Math.random()*10)
      else d+='&nbsp;'
    }
    if(numEl)numEl.innerHTML=d
    if(frame>=total){
      clearInterval(iv)
      if(numEl)numEl.textContent=n.toLocaleString()
      try{
        const earned=[]
        nrState.newBadges=new Set()
        if(!NR_BADGES||!NR_BADGES.length){
          console.error('NR_BADGES not available',typeof NR_BADGES)
        }else{
          for(let i=0;i<NR_BADGES.length;i++){const b=NR_BADGES[i];if(!b)continue;try{if(b.check(n))earned.push(b.id)}catch(e){console.warn('Badge check error',b.id,e)}}
        }
        nrState.lastNumber=n
        nrState.lastBadges=earned
        let epGain=0
        earned.forEach(id=>{
          const bg=nrLookup.get(id)
          if(!bg)return
          epGain+=bg.ep
          if(!nrState.collection.has(id)){
            nrState.collection.add(id)
            nrState.badgeCount++
            nrState.newBadges.add(id)
          }
          nrState.badges[id]=(nrState.badges[id]||0)+1
        })
        const totalEp=epGain
        nrState.lastEpGain=totalEp
        nrState.lastBaseEp=epGain
        nrState.ep+=totalEp
        nrState.rolls++
        nrState.pastRolls.unshift({n:n,ep:totalEp,base:epGain,badges:earned,badgeNames:earned.map(id=>{const b=nrLookup.get(id);return b?{id:b.id,emoji:b.emoji,name:b.name,ep:b.ep,rarity:b.rarity}:{id:id,emoji:'?',name:id,ep:0,rarity:''}}).filter(Boolean)})
        if(nrState.pastRolls.length>100)nrState.pastRolls.length=100
        saveNr()
        renderNr()
        nrUpdateButton()
        updateStats('mg6',{ep:nrState.ep,rolls:nrState.rolls,badgeCount:nrState.badgeCount})
        renderLeaderboard()
      }catch(e){console.error('Roll error',e)}
      if(btn)btn.disabled=false
    }
  },70)
}

// ===== USERNAME =====
const USER_KEY='pokeUser'
function getUsername(){return localStorage.getItem(USER_KEY)||'Guest'}
function setUsername(){
  const cur=getUsername()
  const name=prompt('Enter your username:',cur==='Guest'?'':cur)
  if(name&&name.trim()){
    chSaveStats()
    if(name.trim()!==cur){
      localStorage.setItem(USER_KEY,name.trim())
      document.getElementById('userDisplay').textContent='👤 '+name.trim()
      chDeleteSave()
      ch={team:[],starterData:[],trainerIdx:0,winStreak:0,maxStreak:0,totalWins:0,stardust:500,candy:{},pokeballs:5,battle:{},turnActive:false,selectedMove:-1,phase:'idle',wildMode:false,catchActive:false,crPct:80,crDir:-1,crInt:null}
      if(currentTab==='battle')initBattle()
    }
    updateOperatorTab()
    rvRender()
    renderCollection()
  }
}
function loadUsername(){
  document.getElementById('userDisplay').textContent='👤 '+getUsername()
  updateOperatorTab()
  rvRender()
  renderCollection()
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
    document.getElementById('lbContent').innerHTML='<h2>🏆 Leaderboard</h2><div class="lb-empty">No stats yet. Play some games and set a username!</div>'
    return
  }
  entries.sort((a,b)=>{
    const score=s=>{
      const c=s.champ||{},w=s.wg||{},m1=s.mg1||{},m2=s.mg2||{},m3=s.mg3||{},m4=s.mg4||{},m5=s.mg5||{},m6=s.mg6||{}
      return (c.wins||0)*100+(c.maxStreak||0)*50+(c.stardust||0)+(m1.best||0)*20+(m2.best||0)*10+(m4.best||0)*5+(w.wins||0)*30+(m3.best===999?0:(100-m3.best)*5)+(m5.best||0)*3+(m6.ep||0)
    }
    return score(b[1])-score(a[1])
  })
  let html='<h2>🏆 Leaderboard</h2><div style="overflow-x:auto"><table class="lb-table"><tr><th>#</th><th>Player</th><th>🏆 Champ</th><th>🎯 Wordle</th><th>🔍 Who\'s That</th><th>⚡ Type Speed</th><th>🧠 Memory</th><th>🏃 Speedrun</th><th>❓ Type Quiz</th><th>🎲 RNG</th></tr>'
  entries.forEach(([u,s],i)=>{
    const cls=u===me?' lb-me':''
    const c=s.champ||{},w=s.wg||{},m1=s.mg1||{},m2=s.mg2||{},m3=s.mg3||{},m4=s.mg4||{},m5=s.mg5||{},m6=s.mg6||{}
    const wgBest=w.best===99?'-':w.best+'/6'
    const memBest=m3.best===999?'-':m3.best+' moves'
    html+='<tr class="'+cls+'"><td class="lb-rank">#'+(i+1)+'</td><td>'+(u===me?'⭐ ':'')+u+'</td>'+
      '<td>'+c.wins+'w · '+c.maxStreak+' streak</td>'+
      '<td>'+wgBest+' · '+w.wins+'/ '+w.games+'</td>'+
      '<td>'+m1.best+'</td><td>'+m2.best+'</td><td>'+memBest+'</td><td>'+m4.best+'</td><td>'+m5.best+'/'+m5.total+'</td><td>'+(m6.ep||0)+'EP · '+(m6.badgeCount||0)+'</td></tr>'
  })
  html+='</table></div><div style="text-align:center;margin-top:12px;color:rgba(255,255,255,0.3);font-size:11px">⭐ = you · Stats saved locally per username</div>'
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
  document.getElementById('opResult').textContent='✅ Leaderboard data wiped!'
  renderLeaderboard()
}
function opWipeAll(){
  if(!confirm('This will delete EVERYTHING (all localStorage). Are you sure?'))return
  if(!confirm('Last chance! All progress, stats, saves, and settings will be gone.'))return
  localStorage.clear()
  _statsCache=null
  nrState={ep:0,rolls:0,badgeCount:0,badges:{},collection:new Set(),lastBadges:[],pastRolls:[],lastEpGain:0,lastBaseEp:0}
  document.getElementById('opResult').textContent='💀 All localStorage wiped! Reloading...'
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
  m.innerHTML='<div style="background:#1a1a2e;border-radius:12px;padding:24px;width:340px;max-width:90vw;box-shadow:0 8px 32px rgba(0,0,0,0.5)">'+
    '<h3 style="margin:0 0 4px;font-size:16px;color:#fff">'+name+'</h3>'+
    '<div style="font-size:12px;color:rgba(255,255,255,0.3);margin-bottom:16px">'+(setName||'')+'</div>'+
    '<label style="display:block;font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:4px">Price</label>'+
    '<div style="display:flex;gap:6px;margin-bottom:4px;align-items:center">'+
    '<input id="pcAddPrice" type="number" step="0.01" min="0" value="'+(bp||'')+'" placeholder="0.00" style="flex:1;padding:8px;border-radius:6px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:#fff;font-size:14px;font-weight:600;outline:none;box-sizing:border-box" data-set="'+sN+'">'+
    '<button id="pcPriceBtn" onclick="pcLookupPrice()" style="padding:8px 10px;border-radius:6px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.5);cursor:pointer;font-size:11px;white-space:nowrap">🔍 PriceCharting</button>'+
    '</div>'+
    '<div id="pcPriceResult" style="font-size:11px;color:rgba(255,255,255,0.3);margin-bottom:12px;min-height:15px"></div>'+
    '<label style="display:block;font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:4px">Quantity</label>'+
    '<input id="pcAddQty" type="number" min="1" value="1" style="width:100%;padding:8px;border-radius:6px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:#fff;font-size:13px;outline:none;margin-bottom:12px;box-sizing:border-box">'+
    '<label style="display:block;font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:4px">Grade</label>'+
    '<select id="pcAddGrade" style="width:100%;padding:8px;border-radius:6px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:#fff;font-size:13px;outline:none;margin-bottom:12px;box-sizing:border-box">'+
    grades.map(function(g){return '<option value="'+g+'"'+(g==='Raw'?' selected':'')+'>'+g+'</option>'}).join('')+'</select>'+
    '<label style="display:block;font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:4px">Variant</label>'+
    '<input id="pcAddVariant" list="pcVariantList" value="Normal" placeholder="e.g. Holo, Reverse Holo" style="width:100%;padding:8px;border-radius:6px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:#fff;font-size:13px;outline:none;margin-bottom:16px;box-sizing:border-box">'+
    '<datalist id="pcVariantList">'+variants.map(function(v){return '<option value="'+v+'">'}).join('')+'</datalist>'+
    '<div style="display:flex;gap:8px">'+
    '<button onclick="this.closest(\'#pcAddModal\').remove()" style="flex:1;padding:8px;border-radius:6px;border:1px solid rgba(255,255,255,0.1);background:transparent;color:rgba(255,255,255,0.6);cursor:pointer;font-size:13px">Cancel</button>'+
    '<button onclick="pcAddCard(\''+id+'\',\''+name.replace(/'/g,"\\'")+'\',\''+sN+'\',parseFloat(document.getElementById(\'pcAddPrice\').value)||0,\''+img+'\',document.getElementById(\'pcAddGrade\').value,document.getElementById(\'pcAddVariant\').value,parseInt(document.getElementById(\'pcAddQty\').value)||1);document.getElementById(\'pcAddModal\').remove();renderCollection()" style="flex:1;padding:8px;border-radius:6px;border:none;background:#4caf50;color:#fff;cursor:pointer;font-size:13px;font-weight:600">Add</button>'+
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
  const el=document.getElementById('colContent')
  if(!el)return
  const search=(document.getElementById('colSearch')?.value||'').toLowerCase()
  const d=pcGetAll()
  const entries=Object.entries(d).filter(([key,c])=>!search||c.name.toLowerCase().includes(search)||key.includes(search))
  let totalVal=0,totalCards=0
  entries.forEach(([key,c])=>{totalVal+=(c.price||0)*c.qty;totalCards+=c.qty})
  const st=document.getElementById('colStats')
  if(st)st.innerHTML='<span class="col-stat">Cards: <span>'+totalCards+'</span></span><span class="col-stat">Value: <span>$'+totalVal.toFixed(2)+'</span></span>'
  if(!entries.length){
    el.innerHTML='<div class="col-empty">'+(search?'No cards match "'+search+'"':'Your collection is empty. Browse Card Sets and add cards!')+'</div>'
    return
  }
    el.innerHTML='<div class="col-grid">'+entries.map(([key,c])=>{
    const priceStr=c.price?'<div class="col-card-price">$'+(c.price*c.qty).toFixed(2)+'</div>':''
    const gv=c.grade||c.variant?' <span style="font-size:10px;color:rgba(255,255,255,0.3)">'+(c.grade||'')+(c.grade&&c.variant?' · ':'')+(c.variant||'')+'</span>':''
    return '<div class="col-card" onclick="pcShowCard(\''+key.replace(/'/g,"\\'")+'\')">'+
      (c.img?'<img src="'+c.img+'" alt="'+c.name+'" loading="lazy">':'<div style="width:50px;height:70px;border-radius:4px;background:rgba(255,255,255,0.03);flex-shrink:0"></div>')+
      '<div class="col-card-info">'+
        '<div class="col-card-name">'+c.name+gv+'</div>'+
        '<div class="col-card-set">'+(c.setName||'')+'</div>'+
        priceStr+
        '<div class="col-card-qty">×'+c.qty+''+(c.added?' · added '+new Date(c.added).toLocaleDateString():'')+'</div>'+
      '</div>'+
      '<button class="col-card-del" onclick="pcRemoveCard(\''+key.replace(/'/g,"\\'")+'\')" title="Remove">✕</button>'+
    '</div>'
  }).join('')+'</div>'
}

// ===== PRICE HISTORY & CHART =====
function phKey(){return 'ph_'+getUsername()}
function phGetAll(){try{return JSON.parse(localStorage.getItem(phKey())||'{}')}catch(e){return {}}}
function phSave(d){try{localStorage.setItem(phKey(),JSON.stringify(d))}catch(e){}}
let _pcAutoTimer=null
let _pcAutoCache={}
function pcAutocomplete(q){
  const el=document.getElementById('colAutocomplete')
  if(!el)return
  if(!q.trim()){el.style.display='none';return}
  if(_pcAutoTimer)clearTimeout(_pcAutoTimer)
  _pcAutoTimer=setTimeout(async()=>{
    const key=q.trim().toLowerCase()
    if(_pcAutoCache[key]){renderPcAuto(_pcAutoCache[key]);return}
    let cards=[]
    try{
      let query
      const numOnly=key.match(/^(\d{1,4})(?:\/\d+)?$/)
      const numAndName=key.match(/^(\d{1,4})(?:\/\d+)?\s+(.+)$/)
      if(numOnly) query='number:'+numOnly[1]
      else if(numAndName) query='number:'+numAndName[1]+' name:*'+encodeURIComponent(numAndName[2])+'*'
      else query='name:*'+encodeURIComponent(key)+'*'
      const res=await fetch('https://api.pokemontcg.io/v2/cards?q='+query+'&orderBy=set.releaseDate&pageSize=50')
      if(res.ok){
        const data=await res.json()
        cards=data.data||[]
      }
    }catch(e){}
    if(!cards.length){
      try{
        let params='pageSize=50'
        if(/^\d+$/.test(key)) params+='&setCode='+key
        else params+='&name='+encodeURIComponent(key)
        const res=await fetch('https://api.pokemontcg.io/v1/cards?'+params)
        if(res.ok){
          const data=await res.json()
          cards=(data.cards||[]).map(c=>({
            id:c.id,name:c.name,set:c.set||{name:c.setName||''},
            images:{small:c.imageUrl||c.imageUrlHiRes||''},
            cardmarket:c.cardmarket,tcgplayer:c.tcgplayer
          }))
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
    _pcAutoCache[key]=cards
    renderPcAuto(cards)
  },300)
}
function renderPcAuto(cards){
  const el=document.getElementById('colAutocomplete')
  if(!el)return
  if(!cards.length){el.innerHTML='<div style="padding:12px;color:rgba(255,255,255,0.3);font-size:13px">No cards found</div>';el.style.display='block';return}
  el.style.maxHeight='360px'
  el.innerHTML=cards.map(c=>{
    const price=c.cardmarket?.prices?.averageSellPrice||c.tcgplayer?.prices?.normal?.market
    const inCol=pcGetCard(c.id)
    return '<div style="display:flex;gap:10px;align-items:center;padding:8px 12px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.04);transition:.1s" '+
      'onmouseenter="this.style.background=\'rgba(255,255,255,0.06)\'" onmouseleave="this.style.background=\'transparent\'" '+
      'onclick="pcShowAddModal(\''+c.id+'\',\''+c.name.replace(/'/g,"\\'")+'\',\''+(c.set?.name||'').replace(/'/g,"\\'")+'\','+(price||0)+',\''+((c.images?.small||'')||'')+'\');document.getElementById(\'colAddSearch\').value=\'\';document.getElementById(\'colAutocomplete\').style.display=\'none\'">'+
      (c.images?.small?'<img src="'+c.images.small+'" style="width:44px;height:62px;border-radius:4px;object-fit:contain;flex-shrink:0;background:rgba(255,255,255,0.03)">':'<div style="width:44px;height:62px;border-radius:4px;background:rgba(255,255,255,0.03);flex-shrink:0"></div>')+
      '<div style="flex:1;min-width:0">'+
        '<div style="font-size:13px;font-weight:600;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+c.name+'</div>'+
        '<div style="font-size:11px;color:rgba(255,255,255,0.35)">'+(c.set?.name||'')+(price?' <span style="color:#4caf50">$'+price.toFixed(2)+'</span>':'')+'</div>'+
      '</div>'+
      (inCol?'<span style="font-size:11px;color:rgba(255,255,255,0.3);white-space:nowrap">✓×'+inCol.qty+'</span>':'<span style="font-size:11px;color:#4caf50;font-weight:600;white-space:nowrap">+ Add</span>')+
    '</div>'
  }).join('')
  el.style.display='block'
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
      return '<line x1="'+pad+'" y1="'+y+'" x2="'+(w-pad)+'" y2="'+y+'" stroke="rgba(255,255,255,0.06)" stroke-width="1"/><text x="'+(pad-4)+'" y="'+(y+3)+'" text-anchor="end" fill="rgba(255,255,255,0.2)" font-size="8">$'+val+'</text>'
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
      '<div style="font-size:11px;color:rgba(255,255,255,0.3);margin-top:2px">From $'+prices[0].toFixed(2)+' to $'+lastP.toFixed(2)+' <span style="color:'+changeClr+';font-weight:600">('+changeStr+')</span></div></div>'
  } else if(hist.length===1){
    chartHtml='<div style="margin-top:12px;text-align:center;color:rgba(255,255,255,0.3);font-size:12px">📊 Price recorded once — $'+hist[0].p.toFixed(2)+' <span style="font-size:10px;color:rgba(255,255,255,0.2)">('+new Date(hist[0].t).toLocaleDateString()+')</span></div>'
  } else {
    chartHtml='<div style="margin-top:12px;text-align:center;color:rgba(255,255,255,0.2);font-size:12px">📊 No price data yet. Prices are recorded when you add or view cards.</div>'
  }
  modal.innerHTML='<div style="background:#1a1a2e;border:1px solid rgba(255,255,255,0.12);border-radius:16px;padding:24px;max-width:400px;width:90%;text-align:center">'+
    (c.img?'<img src="'+c.img+'" alt="'+c.name+'" style="width:80px;height:112px;object-fit:contain;border-radius:6px;background:rgba(255,255,255,0.03);padding:4px;margin-bottom:8px">':'')+
    '<h3 style="font-size:18px;font-weight:800;margin:0;color:#fff">'+c.name+'</h3>'+
    '<div style="font-size:12px;color:rgba(255,255,255,0.4);margin-bottom:4px">'+(c.setName||'')+'</div>'+
    (c.grade||c.variant?'<div style="font-size:11px;color:rgba(255,255,255,0.3);margin-bottom:8px">'+(c.grade||'')+(c.grade&&c.variant?' · ':'')+(c.variant||'')+'</div>':'')+
    '<div style="display:flex;gap:16px;justify-content:center;margin-bottom:8px">'+
      '<div><div style="font-size:11px;color:rgba(255,255,255,0.3)">Price</div><div style="font-size:16px;font-weight:700;color:#4caf50">'+price+'</div></div>'+
      '<div><div style="font-size:11px;color:rgba(255,255,255,0.3)">Qty</div><div style="font-size:16px;font-weight:700;color:#f7c948">×'+c.qty+'</div></div>'+
      '<div><div style="font-size:11px;color:rgba(255,255,255,0.3)">Total</div><div style="font-size:16px;font-weight:700;color:#4caf50">'+totalVal+'</div></div>'+
    '</div>'+
    (c.added?'<div style="font-size:11px;color:rgba(255,255,255,0.2);margin-bottom:8px">Added '+new Date(c.added).toLocaleDateString()+'</div>':'')+
    chartHtml+
    '<div style="display:flex;gap:8px;justify-content:center;margin-top:12px">'+
      '<button onclick="pcRemoveCard(\''+id+'\');this.closest(\'#pcCardModal\').remove()" style="padding:8px 20px;border:none;border-radius:10px;background:rgba(255,50,50,0.15);color:#ff5252;font-weight:600;font-size:12px;cursor:pointer">Remove from Collection</button>'+
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
  const icons={pokemon:'⚔️',card:'🃏',move:'⚡',ability:'✨'}
  if(!arr.length){bar.innerHTML='<span style="color:rgba(255,255,255,0.2);font-size:11px;white-space:nowrap">Recently Viewed</span>';return}
  bar.innerHTML='<span style="color:rgba(255,255,255,0.2);font-size:11px;white-space:nowrap;flex-shrink:0">Recently Viewed</span>'+
    arr.slice(0,12).map(r=>{
      const img=r.img?'<img src="'+r.img+'" alt="">':'<span style="font-size:14px">'+(icons[r.type]||'')+'</span>'
      return '<span class="rv-item" onclick="rvClick({type:\''+r.type+'\',id:\''+r.id+'\'})" title="'+r.name+'">'+img+'<span>'+r.name+'</span></span>'
    }).join('')+
    '<span style="color:rgba(255,255,255,0.15);font-size:10px;cursor:pointer;flex-shrink:0;margin-left:auto" onclick="rvSave([]);rvRender()">✕ clear</span>'
}

// Theme toggle
function toggleTheme(){
  document.body.classList.toggle('light')
  const isLight=document.body.classList.contains('light')
  localStorage.setItem('pokeTheme',isLight?'light':'dark')
  document.getElementById('themeToggle').textContent=isLight?'☀️':'🌙'
}
const savedTheme=localStorage.getItem('pokeTheme')
if(savedTheme==='light'){document.body.classList.add('light');document.getElementById('themeToggle').textContent='☀️'}

// Init username on load
loadUsername()
updateOperatorTab()
init()
