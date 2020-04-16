//pseudo-interface only not to forget implement methods in naib classes
//псевдо-интерфейс только чтобы не забыть заимплементить методы в базовых классах
class CacheInterface {

	delete() {
		console.log('Метод detele не описан');
	}

	//удаляем кэш с просроченным сроком годности?
	deleteOverdueCache() {
		console.log('Метод deleteOverdueCache не описан');
	}

	has() {
		console.log('Метод has не описан');
	}

	get() {
		console.log('Метод get не описан');
	}

	add() {
		console.log('Метод add не описан');
	}
}

const cacheLivingTimeHours = 24;
const cacheLivingTimeMs = cacheLivingTimeHours * 60 * 60 * 1000;

class MapCache extends CacheInterface {
	constructor(cacheAliveTime) {
		super();
		this.cacheAliveTime = cacheAliveTime || cacheLivingTimeMs;
		this.cache = new Map();
	}

	delete(uuid) {
		this.cache.delete(uuid);
	}

	//удаляем кэш с просроченным сроком годности?
	deleteOverdueCache() {
		const cache = this.cache;
		for (let key of cache.keys()) {
			const data = cache.get(key);
			const {cacheEndLiveTime} = data;
			const currentTime = Date.now();
			if (cacheEndLiveTime < currentTime) {
				cache.delete(key);
			}
		}
		this.cache = cache;
	}

	has(uuid) {
		return this.cache.has(uuid);
	}

	get(uuid) {
		const data = this.cache.get(uuid);
		const res = data.data;
		this.deleteOverdueCache();
		return res;
	}

	add(uuid, data) {
		const addingData = {data, date: Date.now(), cacheEndLiveTime: Date.now() + this.cacheAliveTime};
		this.cache.set(uuid, addingData)
	}
}

class LocalCache extends CacheInterface {
	constructor(cacheName, cacheAliveTime) {
		super();
		this.cacheAliveTime = cacheAliveTime || cacheLivingTimeMs;
		this.cacheName = cacheName;
		const cache = localStorage.getItem(cacheName);
		if (!cache) {
			localStorage.setItem(cacheName, JSON.stringify({}))
		}
	}

	has(uuid) {
		this.deleteOverdueCache();
		const cache = this.getCache();
		return !!cache[uuid]
	}

	get(uuid) {
		try {
			const cache = this.getCache();
			const current = cache[uuid];
			const {data} = current;
			// this.deleteOverdueCache();
			return data
		}
			//если localStorage пепеполнен выкинет ошибку. в этом слуае очистить кэш
			//if localStorage will crowd it'll throw error. In this case i'll clean all cache
		catch (e) {
			this.setEmptyCache();
			return false;
		}
	}

	add(uuid, data) {
		try {
			const cache = this.getCache();
			const addingData = {data, date: Date.now(), cacheEndLiveTime: Date.now() + this.cacheAliveTime};
			cache[uuid] = addingData;
			this.setCache(cache);
		} catch (e) {
			//если localStorage переполнен - очищаю
			//clean all cache if localStorage memory crowded
			this.setEmptyCache()
		}
	}

	getCache = () => {
		const data = JSON.parse(localStorage.getItem(this.cacheName));
		console.log('getCache: ', data);
		return data ? data : {};
	};
	setCache = (newCache) => {
		const cache = JSON.stringify(newCache);
		localStorage.setItem(this.cacheName, cache)
	};

	//удаляем кэш с просроченным сроком годности?
	//del overdued cache
	deleteOverdueCache() {
		const cache = this.getCache();
		const keys = Object.keys(cache);
		const newCache = keys.reduce((acc, item) => {
			const current = cache[item];
			const {cacheEndLiveTime} = current;
			const newItem = {[item]: cache[item]};
			return cacheEndLiveTime < Date.now() ? acc : {...acc, ...newItem};
		}, {});
		this.setCache(newCache);
	}

	setEmptyCache() {
		this.setCache({})
	}
}

const localCache = new LocalCache('localCache');
const checkInCache = (uuid) => localCache.has(uuid);
const getFromCache = (uuid) => localCache.get(uuid);
const addCache = (data, uuid) => localCache.add(uuid, data);

const loadWithCache = async (reqFunc, uuid) => {
	const isInCache = checkInCache(uuid);
	if (isInCache) {
		const dataFromCache = getFromCache(uuid);
		// если localStorage переполнен - будет ошибка и сюда придет false. При этом кэш будет очищен
		//if localStorage crowd there will bean error and in this place we'll have false. In this case cache'll be cleaned
		if (dataFromCache) return dataFromCache;
	}
	const dataFromServer = await reqFunc();
	!isInCache && dataFromServer && dataFromServer.status === 200 && addCache(dataFromServer, uuid);
	return dataFromServer
};

export default {
	loadWithCache,
	getFromCache,
}
