const CACHE_NAME='pokedex-v1'
const STATIC_ASSETS=['/','index.html','style.css','script.js']
const POKE_API='pokeapi.co'
const SPRITE_HOST='raw.githubusercontent.com'
const TCG_IMG_HOST='images.pokemontcg.io'
const TCG_DATA_HOST='raw.githubusercontent.com'

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(STATIC_ASSETS)).then(()=>self.skipWaiting()))
})

self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))
})

self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url)
  const host=url.hostname

  // Static assets: cache first
  if(STATIC_ASSETS.some(a=>url.pathname.endsWith(a))){
    e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{
      const c=res.clone();caches.open(CACHE_NAME).then(cache=>cache.put(e.request,c));return res
    })))
    return
  }

  // Pokemon sprites: cache first, network fallback
  if(host===SPRITE_HOST){
    e.respondWith(caches.match(e.request).then(r=>{
      if(r)return r
      return fetch(e.request).then(res=>{
        if(res.ok){const c=res.clone();caches.open(CACHE_NAME).then(cache=>cache.put(e.request,c))}
        return res
      }).catch(()=>new Response('',{status:408,statusText:'Offline'}))
    }))
    return
  }

  // TCG card images: cache first, network fallback
  if(host===TCG_IMG_HOST){
    e.respondWith(caches.match(e.request).then(r=>{
      if(r)return r
      return fetch(e.request).then(res=>{
        if(res.ok){const c=res.clone();caches.open(CACHE_NAME).then(cache=>cache.put(e.request,c))}
        return res
      }).catch(()=>new Response('',{status:408,statusText:'Offline'}))
    }))
    return
  }

  // PokeAPI data: network first, cache fallback
  if(host===POKE_API){
    e.respondWith(fetch(e.request).then(res=>{
      const c=res.clone();caches.open(CACHE_NAME).then(cache=>cache.put(e.request,c));return res
    }).catch(()=>caches.match(e.request).then(r=>r||new Response(JSON.stringify({error:'offline'}),{headers:{'Content-Type':'application/json'}}))))
    return
  }

  // TCG data from GitHub: network first, cache fallback
  if(host===TCG_DATA_HOST&&url.pathname.includes('pokemon-tcg-data')){
    e.respondWith(fetch(e.request).then(res=>{
      const c=res.clone();caches.open(CACHE_NAME).then(cache=>cache.put(e.request,c));return res
    }).catch(()=>caches.match(e.request).then(r=>r||new Response(JSON.stringify([]),{headers:{'Content-Type':'application/json'}}))))
    return
  }

  // Everything else: network first, cache fallback
  e.respondWith(fetch(e.request).then(res=>{
    if(res.ok){const c=res.clone();caches.open(CACHE_NAME).then(cache=>cache.put(e.request,c))}
    return res
  }).catch(()=>caches.match(e.request)))
})