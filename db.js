// IndexedDB 数据库封装
const DB_NAME = 'RiderAssistantDB';
const DB_VERSION = 3;

const DB = {
    db: null,

    runTransaction(storeNames, mode, queueRequests) {
        return new Promise((resolve, reject) => {
            if (!DB.db) {
                reject(new Error('数据库尚未初始化'));
                return;
            }

            let tx;
            try {
                tx = DB.db.transaction(storeNames, mode);
            } catch (error) {
                reject(error);
                return;
            }

            let result;
            tx.oncomplete = () => resolve(result);
            tx.onerror = () => reject(tx.error || new Error('数据库事务失败'));
            tx.onabort = () => reject(tx.error || new Error('数据库事务已中止'));

            try {
                queueRequests(tx, (value) => { result = value; });
            } catch (error) {
                tx.abort();
                reject(error);
            }
        });
    },

    init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                // 等级记录表
                if (!db.objectStoreNames.contains('levels')) {
                    const levelStore = db.createObjectStore('levels', { keyPath: 'date' });
                    levelStore.createIndex('date', 'date', { unique: true });
                }
                // 跑单记录表
                if (!db.objectStoreNames.contains('records')) {
                    const recordStore = db.createObjectStore('records', { keyPath: 'date' });
                    recordStore.createIndex('date', 'date', { unique: true });
                }
                // 地图标注表
                if (!db.objectStoreNames.contains('marks')) {
                    const markStore = db.createObjectStore('marks', { keyPath: 'id', autoIncrement: true });
                    markStore.createIndex('lat', 'lat', { unique: false });
                    markStore.createIndex('lng', 'lng', { unique: false });
                }
                if (!db.objectStoreNames.contains('placeLabels')) {
                    const placeLabelStore = db.createObjectStore('placeLabels', { keyPath: 'id', autoIncrement: true });
                    placeLabelStore.createIndex('level', 'level', { unique: false });
                    placeLabelStore.createIndex('lat', 'lat', { unique: false });
                    placeLabelStore.createIndex('lng', 'lng', { unique: false });
                }
                if (!db.objectStoreNames.contains('zones')) {
                    const zoneStore = db.createObjectStore('zones', { keyPath: 'id', autoIncrement: true });
                    zoneStore.createIndex('name', 'name', { unique: false });
                }
            };

            request.onsuccess = (e) => {
                const database = e.target.result;
                DB.db = database;
                database.onversionchange = () => {
                    database.close();
                    if (DB.db === database) DB.db = null;
                };
                resolve(database);
            };

            request.onerror = (e) => reject(e.target.error);
        });
    },

    // 通用增删改查
    add(storeName, data) {
        return DB.runTransaction(storeName, 'readwrite', (tx, setResult) => {
            const store = tx.objectStore(storeName);
            const req = store.add(data);
            req.onsuccess = () => setResult(req.result);
        });
    },

    put(storeName, data) {
        return DB.runTransaction(storeName, 'readwrite', (tx, setResult) => {
            const store = tx.objectStore(storeName);
            const req = store.put(data);
            req.onsuccess = () => setResult(req.result);
        });
    },

    getAll(storeName) {
        return DB.runTransaction(storeName, 'readonly', (tx, setResult) => {
            const store = tx.objectStore(storeName);
            const req = store.getAll();
            req.onsuccess = () => setResult(req.result);
        });
    },

    get(storeName, key) {
        return DB.runTransaction(storeName, 'readonly', (tx, setResult) => {
            const store = tx.objectStore(storeName);
            const req = store.get(key);
            req.onsuccess = () => setResult(req.result);
        });
    },

    delete(storeName, key) {
        return DB.runTransaction(storeName, 'readwrite', (tx) => {
            const store = tx.objectStore(storeName);
            store.delete(key);
        });
    },

    clear(storeName) {
        return DB.runTransaction(storeName, 'readwrite', (tx) => {
            const store = tx.objectStore(storeName);
            store.clear();
        });
    },

    replaceAll(data) {
        const storeNames = ['levels', 'records', 'marks', 'placeLabels', 'zones'];
        return DB.runTransaction(storeNames, 'readwrite', (tx) => {
            storeNames.forEach((storeName) => {
                const store = tx.objectStore(storeName);
                store.clear();
                (data[storeName] || []).forEach((item) => store.put(item));
            });
        });
    },

    mergeImport(data) {
        const storeNames = ['levels', 'records', 'marks', 'placeLabels', 'zones'];
        return DB.runTransaction(storeNames, 'readwrite', (tx) => {
            const stores = Object.fromEntries(storeNames.map((name) => [name, tx.objectStore(name)]));
            const existing = {};
            let pendingReads = storeNames.length;
            const importData = () => {
                (data.levels || []).forEach((item) => stores.levels.put(item));
                (data.records || []).forEach((item) => stores.records.put(item));

                const coordinateKey = (item) => JSON.stringify([Number(item.lat), Number(item.lng)]);
                const zoneKey = (zone) => JSON.stringify([
                    zone.mapScope || 'merchant-map',
                    zone.shapeType,
                    zone.path
                ]);
                const withoutId = (item) => {
                    const { id, ...itemWithoutId } = item;
                    return itemWithoutId;
                };
                const importedZoneIds = new Map();
                const zoneIdsByShape = new Map();
                existing.zones.forEach((zone) => {
                    const key = zoneKey(zone);
                    if (!zoneIdsByShape.has(key)) zoneIdsByShape.set(key, zone.id);
                });

                const importZones = (index) => {
                    const zones = data.zones || [];
                    if (index >= zones.length) {
                        importPlaceLabels(0);
                        return;
                    }
                    const zone = zones[index];
                    const key = zoneKey(zone);
                    const existingId = zoneIdsByShape.get(key);
                    const request = existingId === undefined
                        ? stores.zones.add(withoutId(zone))
                        : stores.zones.put({ ...zone, id: existingId });
                    request.onsuccess = () => {
                        const localId = existingId === undefined ? request.result : existingId;
                        importedZoneIds.set(zone.id, localId);
                        zoneIdsByShape.set(key, localId);
                        importZones(index + 1);
                    };
                };

                const importPlaceLabels = (index) => {
                    const labels = data.placeLabels || [];
                    if (index >= labels.length) {
                        importMarks(0, new Map(existing.marks.map((mark) => [
                            coordinateKey(mark),
                            mark.id
                        ])));
                        return;
                    }
                    const label = labels[index];
                    const existingId = existing.placeLabelsByCoordinate.get(coordinateKey(label));
                    const request = existingId === undefined
                        ? stores.placeLabels.add(withoutId(label))
                        : stores.placeLabels.put({ ...label, id: existingId });
                    request.onsuccess = () => {
                        if (existingId === undefined) {
                            existing.placeLabelsByCoordinate.set(coordinateKey(label), request.result);
                        }
                        importPlaceLabels(index + 1);
                    };
                };

                const remapZoneReferences = (mark) => {
                    const remapIds = (ids) => (Array.isArray(ids) ? ids : [])
                        .map((id) => importedZoneIds.get(id))
                        .filter((id) => id !== undefined);
                    return {
                        ...mark,
                        ...(Array.isArray(mark.zoneIds) ? { zoneIds: remapIds(mark.zoneIds) } : {}),
                        ...(Array.isArray(mark.excludedZoneIds)
                            ? { excludedZoneIds: remapIds(mark.excludedZoneIds) }
                            : {})
                    };
                };

                const importMarks = (index, markIdsByCoordinate) => {
                    const marks = data.marks || [];
                    if (index >= marks.length) return;
                    const mark = remapZoneReferences(marks[index]);
                    const key = coordinateKey(mark);
                    const existingId = markIdsByCoordinate.get(key);
                    const request = existingId === undefined
                        ? stores.marks.add(withoutId(mark))
                        : stores.marks.put({ ...mark, id: existingId });
                    request.onsuccess = () => {
                        markIdsByCoordinate.set(key, existingId === undefined ? request.result : existingId);
                        importMarks(index + 1, markIdsByCoordinate);
                    };
                };

                importZones(0);
            };

            existing.placeLabelsByCoordinate = new Map();
            storeNames.forEach((storeName) => {
                const request = stores[storeName].getAll();
                request.onsuccess = () => {
                    existing[storeName] = request.result;
                    if (storeName === 'placeLabels') {
                        request.result.forEach((label) => {
                            const key = JSON.stringify([Number(label.lat), Number(label.lng)]);
                            if (!existing.placeLabelsByCoordinate.has(key)) {
                                existing.placeLabelsByCoordinate.set(key, label.id);
                            }
                        });
                    }
                    pendingReads -= 1;
                    if (pendingReads === 0) importData();
                };
            });
        });
    },

    clearAll() {
        const storeNames = ['levels', 'records', 'marks', 'placeLabels', 'zones'];
        return DB.runTransaction(storeNames, 'readwrite', (tx) => {
            storeNames.forEach((storeName) => tx.objectStore(storeName).clear());
        });
    },

    // 查询存储空间
    getStorageUsage() {
        if (navigator.storage && navigator.storage.estimate) {
            return navigator.storage.estimate().then(estimate => {
                const used = (estimate.usage / 1024 / 1024).toFixed(2);
                const quota = estimate.quota ? (estimate.quota / 1024 / 1024).toFixed(2) : '未知';
                return `已用 ${used} MB / 配额 ${quota} MB`;
            });
        }
        return Promise.resolve('无法获取');
    }
};