import test from 'node:test';
import assert from 'node:assert/strict';
import { MovieFactory, SeriesFactory, MediaFactorySelector } from '../dist/src/core/factory.js';
import { Movie, Series } from '../dist/src/core/models.js';
import { NewestFirstStrategy, PersonalRatingStrategy, TitleAZStrategy, WatchlistSorter } from '../dist/src/core/strategy.js';
import { WatchlistStore } from '../dist/src/core/watchlist.js';
import { StatisticsObserver, ActivityLogObserver } from '../dist/src/core/observer.js';
import { TmdbCatalogAdapter, RawTmdbClient } from '../dist/src/services/tmdb-adapter.js';

const movie = (id=1, title='Interstellar') => ({ id, kind:'movie', title, overview:'Deneme', releaseDate:'2014-11-05', posterPath:null, backdropPath:null, voteAverage:8.6, genreIds:[878] });
const series = (id=2,title='Dark')=>({ ...movie(id,title), kind:'tv', releaseDate:'2017-12-01' });
const memoryStorage = ()=>{
  const map=new Map();
  return { getItem:k=>map.get(k)??null, setItem:(k,v)=>map.set(k,v) };
};

test('Factory Method: film ürünü doğru somut alt sınıftır',()=>{
  const result=new MovieFactory().create(movie());
  assert.ok(result instanceof Movie);
  assert.equal(result.getTypeLabel(),'Film');
});
test('Factory Method: dizi ürünü ve koruma koşulu',()=>{
  const result=new SeriesFactory().create(series());
  assert.ok(result instanceof Series);
  assert.equal(result.getDateLabel(),'İlk yayın');
  assert.throws(()=>new MovieFactory().create(series()));
  assert.throws(()=>new SeriesFactory().create({...series(),title:''}));
});
test('Factory Method: seçici iki somut üreticiyi kullanır',()=>{
  const selector=new MediaFactorySelector(new MovieFactory(),new SeriesFactory());
  assert.ok(selector.create(movie()) instanceof Movie);
  assert.ok(selector.create(series()) instanceof Series);
});
test('Strategy: çalışma anında strateji değişikliği ve girdi korunur',()=>{
  const originals=[
    {media:movie(1,'Zeta'),addedAt:'2026-01-01T00:00:00Z',status:'planned',personalRating:3},
    {media:series(2,'Alfa'),addedAt:'2026-01-03T00:00:00Z',status:'completed',personalRating:10}];
  const sorter=new WatchlistSorter(new NewestFirstStrategy());
  assert.deepEqual(sorter.sort(originals).map(x=>x.media.title),['Alfa','Zeta']);
  sorter.setStrategy(new TitleAZStrategy());
  assert.deepEqual(sorter.sort(originals).map(x=>x.media.title),['Alfa','Zeta']);
  sorter.setStrategy(new PersonalRatingStrategy());
  assert.equal(sorter.sort(originals)[0].personalRating,10);
  assert.equal(originals[0].media.title,'Zeta');
});
test('Observer: bir değişiklik iki gözlemciye bildirilir',()=>{
  const store=new WatchlistStore(memoryStorage());
  const stats=new StatisticsObserver();
  const log=new ActivityLogObserver();
  store.attach(stats);store.attach(log);
  assert.equal(store.add(movie()),true);
  assert.equal(stats.getStats().total,1);
  assert.match(log.getEntries()[0].message,/Interstellar/);
  store.setStatus('movie:1','completed');
  assert.equal(stats.getStats().completed,1);
  assert.equal(log.getEntries().length,2);
  store.detach(log);
  store.remove('movie:1');
  assert.equal(stats.getStats().total,0);
  assert.equal(log.getEntries().length,2);
});
test('Watchlist: aynı yapım iki kez eklenemez, puan aralık kontrolü',()=>{
  const store=new WatchlistStore(memoryStorage());
  assert.equal(store.add(movie()),true);
  assert.equal(store.add(movie()),false);
  assert.equal(store.setRating('movie:1',11),false);
  assert.equal(store.setRating('movie:1',8),true);
  assert.equal(store.getByKey('movie:1').personalRating,8);
});
test('Watchlist: kayıt, yeniden yüklemede yerel depodan gelir',()=>{
  const storage=memoryStorage();
  const original=new WatchlistStore(storage);
  original.add(series());
  const restored=new WatchlistStore(storage);
  assert.equal(restored.getItems().length,1);
  assert.equal(restored.getItems()[0].media.title,'Dark');
});
test('Adapter: film title ve dizi name alanını ortak title alanına çevirir',async()=>{
  const fakeClient={
    searchMulti:async()=>({results:[
      {id:1,media_type:'movie',title:'Interstellar',release_date:'2014-11-05',vote_average:8.6},
      {id:2,media_type:'tv',name:'Dark',first_air_date:'2017-12-01',vote_average:8.4},
      {id:3,media_type:'person',name:'Oyuncu'}]}),
    credits:async()=>({cast:[{name:'Oyuncu 1'},{name:'Oyuncu 2'}]}),
    mode:async()=> 'demo'
  };
  const adapter=new TmdbCatalogAdapter(fakeClient);
  const results=await adapter.search('d');
  assert.equal(results.length,2);
  assert.equal(results[0].title,'Interstellar');
  assert.equal(results[1].title,'Dark');
  assert.equal(results[1].releaseDate,'2017-12-01');
  assert.deepEqual(await adapter.getCast('tv',2),['Oyuncu 1','Oyuncu 2']);
  assert.equal(await adapter.getMode(),'demo');
});
test('RawTmdbClient: sınıf uygulamada gerçekten ayrılmıştır',()=>{
  assert.equal(typeof RawTmdbClient.prototype.searchMulti,'function');
  assert.equal(typeof RawTmdbClient.prototype.credits,'function');
});
