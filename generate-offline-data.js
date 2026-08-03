#!/usr/bin/env node
// Run: node generate-offline-data.js
// Outputs: offline-data.js (add to your pokemon folder)

const https = require('https');
const http = require('http');
const fs = require('fs');

function fetch(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetch(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function main() {
  console.log('Fetching Pokemon list...');
  const pokeRaw = JSON.parse(await fetch('https://pokeapi.co/api/v2/pokemon?limit=1025&offset=0'));
  const pokemonList = pokeRaw.results.map((p, i) => ({
    id: i + 1,
    name: p.name
  }));
  console.log(`  Got ${pokemonList.length} Pokemon`);

  console.log('Fetching Pokemon types & stats (this takes a few minutes)...');
  const pokemonData = [];
  const BATCH = 20;
  for (let i = 0; i < pokemonList.length; i += BATCH) {
    const batch = pokemonList.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(async p => {
      try {
        const d = JSON.parse(await fetch(`https://pokeapi.co/api/v2/pokemon/${p.id}`));
        return {
          id: d.id,
          name: d.name,
          types: d.types.map(t => t.type.name),
          stats: {
            hp: d.stats[0].base_stat,
            attack: d.stats[1].base_stat,
            defense: d.stats[2].base_stat,
            spAttack: d.stats[3].base_stat,
            spDefense: d.stats[4].base_stat,
            speed: d.stats[5].base_stat
          }
        };
      } catch (e) { return null; }
    }));
    results.forEach(r => { if (r) pokemonData.push(r); });
    process.stdout.write(`\r  ${pokemonData.length}/${pokemonList.length} Pokemon fetched`);
  }
  console.log('\n  Done!');

  console.log('Fetching moves list...');
  const movesRaw = JSON.parse(await fetch('https://pokeapi.co/api/v2/move?limit=1000'));
  const movesList = movesRaw.results.map(m => {
    const match = m.url.match(/\/(\d+)\/$/);
    return { id: match ? parseInt(match[1]) : 0, name: m.name };
  });
  console.log(`  Got ${movesList.length} moves`);

  console.log('Fetching move details...');
  const movesData = [];
  for (let i = 0; i < movesList.length; i += BATCH) {
    const batch = movesList.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(async m => {
      try {
        const d = JSON.parse(await fetch(`https://pokeapi.co/api/v2/move/${m.id}`));
        return {
          id: d.id,
          name: d.name,
          type: d.type?.name || '',
          damageClass: d.damage_class?.name || '',
          power: d.power || null,
          accuracy: d.accuracy || null,
          pp: d.pp || null,
          generation: d.generation?.name || '',
          effectEntry: d.effect_entries?.find(e => e.language.name === 'en') || null
        };
      } catch (e) { return null; }
    }));
    results.forEach(r => { if (r) movesData.push(r); });
    process.stdout.write(`\r  ${movesData.length}/${movesList.length} moves fetched`);
  }
  console.log('\n  Done!');

  console.log('Fetching abilities list...');
  const abilRaw = JSON.parse(await fetch('https://pokeapi.co/api/v2/ability?limit=1000'));
  const abilList = abilRaw.results.map(a => {
    const match = a.url.match(/\/(\d+)\/$/);
    return { id: match ? parseInt(match[1]) : 0, name: a.name };
  });
  console.log(`  Got ${abilList.length} abilities`);

  console.log('Fetching ability details...');
  const abilData = [];
  for (let i = 0; i < abilList.length; i += BATCH) {
    const batch = abilList.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(async a => {
      try {
        const d = JSON.parse(await fetch(`https://pokeapi.co/api/v2/ability/${a.id}`));
        return {
          id: d.id,
          name: d.name,
          generation: d.generation?.name || '',
          effectEntry: d.effect_entries?.find(e => e.language.name === 'en') || null,
          flavorText: d.flavor_text_entries?.find(e => e.language.name === 'en')?.flavor_text || ''
        };
      } catch (e) { return null; }
    }));
    results.forEach(r => { if (r) abilData.push(r); });
    process.stdout.write(`\r  ${abilData.length}/${abilList.length} abilities fetched`);
  }
  console.log('\n  Done!');

  console.log('Fetching TCG sets...');
  let tcgSets = [];
  try {
    tcgSets = JSON.parse(await fetch('https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master/sets/en.json'));
    console.log(`  Got ${tcgSets.length} sets`);
  } catch (e) {
    console.log('  Failed to fetch TCG sets, continuing without them');
  }

  const output = `// Auto-generated offline data — run "node generate-offline-data.js" to regenerate
const OFFLINE_POKEMON=${JSON.stringify(pokemonData)};
const OFFLINE_MOVES=${JSON.stringify(movesData)};
const OFFLINE_ABILITIES=${JSON.stringify(abilData)};
const OFFLINE_SETS=${JSON.stringify(tcgSets)};
console.log('Offline data loaded: '+OFFLINE_POKEMON.length+' pokemon, '+OFFLINE_MOVES.length+' moves, '+OFFLINE_ABILITIES.length+' abilities, '+OFFLINE_SETS.length+' sets');
`;

  fs.writeFileSync('offline-data.js', output);
  console.log(`\nWrote offline-data.js (${(Buffer.byteLength(output) / 1024 / 1024).toFixed(1)} MB)`);
}

main().catch(e => { console.error(e); process.exit(1); });
