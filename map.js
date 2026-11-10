// 地图模块
let map = null;
let currentLocationMarker = null;
let baseMapLayers = [];
let satelliteLayer = null;
let mainMapLabelsLayer = null;
let isSatelliteMap = false;
let isMainMap3D = false;
let isMainMapRotationEnabled = false;
let areMainMapLabelsEnabled = false;
let merchantBaseMapLayers = [];
let merchantSatelliteLayer = null;
let isMerchantSatelliteMap = false;
let isMerchantMap3D = false;
let markers = [];
let textMarkers = [];
let photoMarkers = [];
let entranceIconMarkers = [];
let mainMapZones = [];
let mainMapZoneOverlays = [];
let mainMapZoneLabels = [];
let mainMapDrawingShape = null;
let mainMapRectanglePoints = [];
let mainMapRectanglePreview = null;
let mainMapRouteMode = 'riding';
let mainMapRouteSelecting = null;
let mainMapRouteOrigin = null;
let mainMapRouteDestination = null;
let mainMapRouteUsesCurrentLocation = false;
let mainMapDefaultNavigationApp = 'amap';
let mainMapRoutePlanner = null;
let mainMapRouteSearchVersion = 0;
let mainMapRouteLocationWatchId = null;
let mainMapRouteLocationWatchVersion = 0;
let mainMapRouteRefreshTimer = null;
let mainMapRouteLastRefreshOrigin = null;
let pendingMainMapRectanglePath = null;
let pendingMainMapShapeType = null;
let mainMapZoneSaveInProgress = false;
let mainMapAddMode = false;
let activeMarkCategory = 'customer';
let currentMainMapZoneId = null;
let mainMapZoneUpdateInProgress = false;
let markerPhotoUrls = [];
let currentLatLng = null;
let editingMarkId = null; // 非 null 时表示正在编辑已有标注
let merchantMap = null;
let merchantMarkers = [];
let merchantMarkerPhotoUrls = [];
let merchantMarkerElements = new Map();
let merchantMarkersById = new Map();
let zoneAggregateMarkers = new Map();
let zoneNameMarkers = [];
let merchantMapHiddenMarkIds = new Set();
let merchantLayoutFrame = null;
let activeMerchantZoneId = null;
let merchantAddZoneId = null;
let merchantAddFromActiveMode = false;
let currentMerchantZone = null;
let currentZoneCell = null;
let merchantActionTarget = null;
let placeLabelMarkers = [];
let merchantPlaceLabels = [];
let pendingPlaceLabelPosition = null;
let editingPlaceLabelId = null;
let zones = [];
let zoneMapOverlays = [];
let zoneDrawingType = null;
let zoneDrawingPoints = [];
let zoneDrawingOverlay = null;
let pendingZonePath = null;
let pendingZoneShapeType = null;
let zoneSaveInProgress = false;
let merchantPhotoPreviewUrls = { add: null, detail: null };
let newMerchantPhoto = null;
let currentMerchantPhoto = null;
let merchantMarksLoadVersion = 0;
let currentMerchantDetailMark = null;
let currentMerchantRating = 0;
let pendingMerchantPosition = null;
let newMerchantRating = 0;
let merchantAddMode = false;
let placeLabelAddMode = false;
let visibleMerchants = [];
let merchantCatalogue = [];
let selectedMerchant = null;
let merchantSortMode = 'popular';
let favoriteMerchantIds = new Set();
let guiYangRegionTree = null;
let guiYangRegionStack = [];
let guiYangRegionRequest = null;
let markRegionGeocoderPromise = null;
const markRegionCache = new Map();
const MAIN_MAP_DEFAULT_NAVIGATION_STORAGE_KEY = 'rider-assistant-default-navigation-app';
const MAIN_MAP_NAVIGATION_APPS = ['amap', 'baidu', 'tencent'];
const TEXT_MARK_MIN_ZOOM = 15;
const MAIN_MAP_TEXT_HIDE_VIEW_HEIGHT_METERS = 2000;
const MERCHANT_MARKER_MAX_VIEW_HEIGHT_METERS = 2000;
const MERCHANT_AGGREGATE_MAX_VIEW_HEIGHT_METERS = 4000;
const ZONE_OVERLAY_MAX_VIEW_HEIGHT_METERS = 1000;
const PHOTO_MARK_HIDE_VIEW_HEIGHT_METERS = 4000;
const ENTRANCE_ICON_HIDE_VIEW_HEIGHT_METERS = 800;
const MAIN_MAP_ZONE_HIDE_VIEW_HEIGHT_METERS = 1400;
const MERCHANT_ZOOM_STEPS_METERS = [1, 400, 800, 1200, 2500, 4000];
const MERCHANT_CARD_WIDTH = 88;
const MERCHANT_CARD_HEIGHT = 46;
const MERCHANT_CARD_GAP = 10;
const MERCHANT_REGION_CARD_LIMIT = 24;
const PLACE_LABEL_LEVELS = ['province', 'district', 'street', 'community', 'building', 'floor'];
const PLACE_LABEL_STYLES = {
    province: { minHeight: 4000, maxHeight: Infinity, fontSize: '8px', fontWeight: '800' },
    district: { minHeight: 2000, maxHeight: 4000, fontSize: '8px', fontWeight: '700' },
    street: { minHeight: 800, maxHeight: 2000, fontSize: '8px', fontWeight: '600' },
    community: { minHeight: 0, maxHeight: 800, fontSize: '8px', fontWeight: '600' },
    building: { minHeight: 0, maxHeight: 800, fontSize: '8px', fontWeight: '500' },
    floor: { minHeight: 0, maxHeight: 800, fontSize: '8px', fontWeight: '500' }
};
const entranceIcons = {
    entrance: { image: 'assets/images/kaipingmu-rukou.png', label: '入口' },
    exit: { image: 'assets/images/kaipingmu-palou.svg', label: '出口' },
    basementEntrance: { image: 'assets/images/kaipingmu-basement-parking.png', label: '地库入口' },
    vehicleStop: { image: 'assets/images/kaipingmu-vehicle-parking.png', label: '车辆可停靠' },
    elevator: { image: 'assets/images/kaipingmu-dianti.svg', label: '电梯' },
    stairs: { image: 'assets/images/kaipingmu-image.png', label: '楼梯' },
    toilet: { image: 'assets/images/kaipingmu-cesuo.png', label: '厕所' }
};

function getMarkRegionGeocoder() {
    if (markRegionGeocoderPromise) return markRegionGeocoderPromise;
    if (typeof AMap === 'undefined') {
        return Promise.reject(new Error('地图 SDK 未加载，无法获取标注所属区域'));
    }
    markRegionGeocoderPromise = new Promise((resolve, reject) => {
        AMap.plugin('AMap.Geocoder', () => {
            if (!AMap.Geocoder) {
                markRegionGeocoderPromise = null;
                reject(new Error('高德地图地址解析服务不可用'));
                return;
            }
            resolve(new AMap.Geocoder({ extensions: 'all' }));
        });
    });
    return markRegionGeocoderPromise;
}

async function getMarkRegion(mark) {
    if (!Number.isFinite(Number(mark.lat)) || !Number.isFinite(Number(mark.lng))) {
        throw new Error(`标注“${mark.name || '(未命名)'}”缺少有效坐标`);
    }
    const cacheKey = `${Number(mark.lat).toFixed(6)},${Number(mark.lng).toFixed(6)}`;
    if (markRegionCache.has(cacheKey)) return markRegionCache.get(cacheKey);
    const regionPromise = getMarkRegionGeocoder().then((geocoder) => new Promise((resolve, reject) => {
        geocoder.getAddress([mark.lng, mark.lat], (status, result) => {
            const regeocode = result?.regeocode;
            if (status !== 'complete' || !regeocode) {
                reject(new Error(result?.info || '无法解析标注坐标所属区域'));
                return;
            }
            const address = regeocode.addressComponent || {};
            const township = typeof address.township === 'string' ? address.township : address.township?.name;
            const community = regeocode.aois?.[0]?.name
                || address.neighborhood?.name
                || address.building?.name
                || '未识别小区';
            resolve({
                township: township || address.district || '未识别镇/街道',
                community
            });
        });
    }));
    markRegionCache.set(cacheKey, regionPromise);
    try {
        return await regionPromise;
    } catch (error) {
        markRegionCache.delete(cacheKey);
        throw error;
    }
}

function pointIsInsideZone(position, zone) {
    const [longitude, latitude] = position;
    const points = zone.path.slice(0, -1);
    let inside = false;
    for (let index = 0, previous = points.length - 1; index < points.length; previous = index, index += 1) {
        const [currentLongitude, currentLatitude] = points[index];
        const [previousLongitude, previousLatitude] = points[previous];
        const cross = (longitude - currentLongitude) * (previousLatitude - currentLatitude)
            - (latitude - currentLatitude) * (previousLongitude - currentLongitude);
        const onSegment = Math.abs(cross) <= 1e-10
            && longitude >= Math.min(currentLongitude, previousLongitude) - 1e-10
            && longitude <= Math.max(currentLongitude, previousLongitude) + 1e-10
            && latitude >= Math.min(currentLatitude, previousLatitude) - 1e-10
            && latitude <= Math.max(currentLatitude, previousLatitude) + 1e-10;
        if (onSegment) return true;
        const intersects = ((currentLatitude > latitude) !== (previousLatitude > latitude))
            && longitude < ((previousLongitude - currentLongitude) * (latitude - currentLatitude))
                / (previousLatitude - currentLatitude) + currentLongitude;
        if (intersects) inside = !inside;
    }
    return inside;
}

function updateMapHeightIndicator() {
    if (!map) return;
    let south;
    let north;
    try {
        const bounds = map.getBounds();
        if (!bounds) return;
        south = bounds.getSouthWest().getLat();
        north = bounds.getNorthEast().getLat();
    } catch (error) {
        return;
    }
    if (!Number.isFinite(south) || !Number.isFinite(north)) return;
    const viewHeightMeters = Math.abs(north - south) * Math.PI / 180 * 6371008.8;
    const formatMeters = (meters) => `${Math.round(meters).toLocaleString('zh-CN')} 米`;

    document.getElementById('mapHeightValue').textContent = formatMeters(viewHeightMeters);
    document.getElementById('mapHideHeightValue').textContent =
        formatMeters(MAIN_MAP_TEXT_HIDE_VIEW_HEIGHT_METERS);
    const showTextMarkers = viewHeightMeters <= MAIN_MAP_TEXT_HIDE_VIEW_HEIGHT_METERS;
    textMarkers.forEach((marker) => {
        if (showTextMarkers) marker.show();
        else marker.hide();
    });
    const showPhotoMarkers = viewHeightMeters < PHOTO_MARK_HIDE_VIEW_HEIGHT_METERS;
    photoMarkers.forEach((marker) => {
        if (showPhotoMarkers) marker.show();
        else marker.hide();
    });
    const showEntranceIcons = viewHeightMeters <= ENTRANCE_ICON_HIDE_VIEW_HEIGHT_METERS;
    entranceIconMarkers.forEach((marker) => {
        if (showEntranceIcons) marker.show();
        else marker.hide();
    });
    const showMainMapZones = viewHeightMeters <= MAIN_MAP_ZONE_HIDE_VIEW_HEIGHT_METERS;
    [...mainMapZoneOverlays, ...mainMapZoneLabels].forEach((overlay) => {
        if (showMainMapZones) overlay.show();
        else overlay.hide();
    });
}

const MapModule = {
    init() {
        this.getDefaultNavigationApp();
        document.querySelectorAll('input[name="defaultNavigationApp"]').forEach((input) => {
            input.checked = input.value === mainMapDefaultNavigationApp;
        });
        if (typeof AMap === 'undefined') {
            document.getElementById('mapContainer').innerHTML =
                '<p style="padding:20px;color:#666;">地图 SDK 加载失败。请检查网络连接，并确认 Untitled-1.html 中的高德 Key、安全密钥和域名白名单配置正确；修改后刷新页面。其他功能不受影响。</p>';
            return;
        }

        map = new AMap.Map('mapContainer', {
            zoom: 15,
            center: [106.63, 26.65], // 贵阳默认中心
            viewMode: '3D',
            pitch: 0,
            skyColor: '#ffffff',
            mapStyle: 'amap://styles/normal',
            rotateEnable: false,
            features: ['bg', 'road', 'building']
        });
        const mainMapLayers = map.getLayers();
        mainMapLabelsLayer = mainMapLayers.find((layer) =>
            layer.CLASS_NAME && layer.CLASS_NAME.includes('LabelsLayer')) || null;
        baseMapLayers = mainMapLayers
            .filter((layer) => !layer.CLASS_NAME || !layer.CLASS_NAME.includes('LabelsLayer'));
        satelliteLayer = new AMap.TileLayer.Satellite();
        document.getElementById('mapTypeToggleBtn').addEventListener('click', () => {
            this.toggleMapType();
        });
        document.getElementById('map3dToggleBtn').addEventListener('click', () => {
            this.toggleMainMap3D();
        });
        document.getElementById('mainMapRotationToggleBtn').addEventListener('click', () => {
            this.toggleMainMapRotation();
        });
        document.getElementById('mainMapLabelsToggleBtn').addEventListener('click', () => {
            this.toggleMainMapLabels();
        });
        document.getElementById('mainMapRouteToggleBtn').addEventListener('click', () => {
            this.toggleMainMapRoutePanel();
        });
        document.getElementById('mainMapRouteCloseBtn').addEventListener('click', () => {
            this.closeMainMapRoutePanel();
        });
        document.querySelectorAll('[data-main-route-mode]').forEach((button) => {
            button.addEventListener('click', () => this.setMainMapRouteMode(button.dataset.mainRouteMode));
        });
        document.getElementById('mainMapRouteOriginBtn').addEventListener('click', () => {
            this.selectMainMapRoutePoint('origin');
        });
        document.getElementById('mainMapRouteDestinationBtn').addEventListener('click', () => {
            this.selectMainMapRoutePoint('destination');
        });
        document.getElementById('mainMapRouteCurrentBtn').addEventListener('click', () => {
            this.setMainMapRouteOriginToCurrentLocation();
        });
        document.getElementById('mainMapRoutePlanBtn').addEventListener('click', () => {
            this.planMainMapRoute();
        });
        document.getElementById('mainMapRouteClearBtn').addEventListener('click', () => {
            this.clearMainMapRoute();
        });
        map.on('complete', () => {
            map.resize();
            updateMapHeightIndicator();
        });
        map.on('zoomend', updateMapHeightIndicator);
        map.on('moveend', updateMapHeightIndicator);
        map.on('resize', updateMapHeightIndicator);
        map.on('pitchend', () => this.applyMainMapFeatures());

        // 点击地图 -> 弹出新增标注表单
        map.on('click', (e) => {
            if (mainMapRouteSelecting) {
                this.setMainMapRoutePoint(mainMapRouteSelecting, e.lnglat);
                return;
            }
            if (mainMapDrawingShape) {
                this.addMainMapRectanglePoint(e.lnglat);
                return;
            }
            if (!mainMapAddMode) return;
            this.openMainMapMarkForm(e.lnglat);
        });

    },

    async groupMarksByRegion(marks) {
        const groups = new Map();
        let nextIndex = 0;
        const workerCount = Math.min(3, marks.length);
        await Promise.all(Array.from({ length: workerCount }, async () => {
            while (nextIndex < marks.length) {
                const index = nextIndex;
                nextIndex += 1;
                const mark = marks[index];
                const region = await getMarkRegion(mark);
                let townGroup = groups.get(region.township);
                if (!townGroup) {
                    townGroup = {
                        name: region.township,
                        customers: 0,
                        merchants: 0,
                        communities: new Map()
                    };
                    groups.set(region.township, townGroup);
                }
                const category = mark.category === 'merchant' ? 'merchants' : 'customers';
                townGroup[category] += 1;
                let communityGroup = townGroup.communities.get(region.community);
                if (!communityGroup) {
                    communityGroup = { name: region.community, customers: 0, merchants: 0 };
                    townGroup.communities.set(region.community, communityGroup);
                }
                communityGroup[category] += 1;
            }
        }));
        return [...groups.values()]
            .sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'))
            .map((town) => ({
                ...town,
                communities: [...town.communities.values()]
                    .sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'))
            }));
    },

    toggleMapType() {
        if (!map || !satelliteLayer) return;

        isSatelliteMap = !isSatelliteMap;
        if (!isSatelliteMap) map.setLayers(baseMapLayers);
        this.applyMainMapFeatures();

        const button = document.getElementById('mapTypeToggleBtn');
        button.setAttribute('aria-pressed', String(isSatelliteMap));
        button.setAttribute('aria-label', isSatelliteMap ? '切换到普通地图' : '切换到卫星地图');
        button.querySelector('span').textContent = isSatelliteMap ? '普通' : '卫星';
    },

    toggleMainMap3D() {
        if (!map) return;
        isMainMap3D = !isMainMap3D;
        map.setPitch(isMainMap3D ? 50 : 0);
        this.applyMainMapFeatures();
        const button = document.getElementById('map3dToggleBtn');
        button.setAttribute('aria-pressed', String(isMainMap3D));
        button.setAttribute('aria-label', isMainMap3D ? '切换到2D视图' : '切换到3D视图');
        button.querySelector('span').textContent = isMainMap3D ? '2D' : '3D';
    },

    toggleMainMapRotation() {
        if (!map) return;
        isMainMapRotationEnabled = !isMainMapRotationEnabled;
        map.setStatus({ rotateEnable: isMainMapRotationEnabled });
        const button = document.getElementById('mainMapRotationToggleBtn');
        const label = isMainMapRotationEnabled ? '关闭地图旋转' : '开启地图旋转';
        button.setAttribute('aria-pressed', String(isMainMapRotationEnabled));
        button.setAttribute('aria-label', label);
        button.title = label;
    },

    toggleMainMapLabels() {
        if (!map) return;
        areMainMapLabelsEnabled = !areMainMapLabelsEnabled;
        this.applyMainMapFeatures();
        const button = document.getElementById('mainMapLabelsToggleBtn');
        button.setAttribute('aria-pressed', String(areMainMapLabelsEnabled));
        button.setAttribute(
            'aria-label',
            areMainMapLabelsEnabled ? '关闭高德地图兴趣点标注' : '开启高德地图兴趣点标注'
        );
    },

    applyMainMapFeatures() {
        if (!map) return;
        map.setFeatures(areMainMapLabelsEnabled
            ? ['bg', 'road', 'building', 'point']
            : ['bg', 'road', 'building']);
        if (isSatelliteMap && satelliteLayer) {
            const satelliteLayers = [
                satelliteLayer,
                ...(areMainMapLabelsEnabled && mainMapLabelsLayer ? [mainMapLabelsLayer] : [])
            ];
            const currentLayers = map.getLayers();
            if (currentLayers.length !== satelliteLayers.length
                || currentLayers.some((layer, index) => layer !== satelliteLayers[index])) {
                map.setLayers(satelliteLayers);
            }
        }
    },

    toggleMainMapRoutePanel() {
        const panel = document.getElementById('mainMapRoutePanel');
        if (panel.hidden) {
            if (mainMapDrawingShape) this.cancelMainMapRectangleDrawing();
            if (mainMapAddMode) {
                mainMapAddMode = false;
                const addMarkButton = document.getElementById('addMarkBtn');
                addMarkButton.classList.remove('is-active');
                addMarkButton.setAttribute('aria-pressed', 'false');
                addMarkButton.setAttribute('aria-label', '开启新增标注');
                addMarkButton.title = '开启后点击地图添加标注';
                mainMapZoneLabels.forEach((marker) => {
                    const label = marker.getContent();
                    label.setAttribute('aria-label', `管理地图区域：${label.textContent}`);
                    label.title = `点击管理地图区域“${label.textContent}”`;
                });
            }
            panel.hidden = false;
            document.getElementById('mainMapRouteToggleBtn').setAttribute('aria-expanded', 'true');
            this.updateMainMapRoutePanel();
            return;
        }
        this.closeMainMapRoutePanel();
    },

    closeMainMapRoutePanel() {
        document.getElementById('mainMapRoutePanel').hidden = true;
        document.getElementById('mainMapRouteToggleBtn').setAttribute('aria-expanded', 'false');
        mainMapRouteSelecting = null;
        this.updateMainMapRoutePanel();
    },

    stopMainMapRouteLocationTracking() {
        mainMapRouteLocationWatchVersion += 1;
        if (mainMapRouteLocationWatchId !== null && navigator.geolocation) {
            navigator.geolocation.clearWatch(mainMapRouteLocationWatchId);
            mainMapRouteLocationWatchId = null;
        }
        if (mainMapRouteRefreshTimer !== null) {
            clearTimeout(mainMapRouteRefreshTimer);
            mainMapRouteRefreshTimer = null;
        }
        mainMapRouteLastRefreshOrigin = null;
    },

    setMainMapRouteMode(mode) {
        if (!['riding', 'driving'].includes(mode)) return;
        if (mainMapRouteMode === mode) return;
        mainMapRouteMode = mode;
        mainMapRouteSearchVersion += 1;
        if (mainMapRoutePlanner) {
            mainMapRoutePlanner.clear();
            mainMapRoutePlanner = null;
        }
        document.querySelectorAll('[data-main-route-mode]').forEach((button) => {
            button.setAttribute('aria-pressed', String(button.dataset.mainRouteMode === mode));
        });
        this.updateMainMapRoutePanel();
        document.getElementById('mainMapRouteStatus').textContent =
            mode === 'riding' ? '已切换为骑行规划。' : '已切换为驾车规划。';
    },

    selectMainMapRoutePoint(pointType) {
        mainMapRouteSelecting = mainMapRouteSelecting === pointType ? null : pointType;
        this.updateMainMapRoutePanel();
        if (mainMapRouteSelecting) {
            document.getElementById('mainMapRouteStatus').textContent =
                pointType === 'origin' ? '请点击地图选择起点。' : '请点击地图选择终点。';
        } else {
            document.getElementById('mainMapRouteStatus').textContent = '已取消地图选点。';
        }
    },

    setMainMapRoutePoint(pointType, position) {
        const longitude = Number(typeof position.getLng === 'function' ? position.getLng() : position.lng);
        const latitude = Number(typeof position.getLat === 'function' ? position.getLat() : position.lat);
        if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
            document.getElementById('mainMapRouteStatus').textContent = '无法读取所选位置，请重新点击地图。';
            return;
        }
        if (mainMapRoutePlanner) {
            mainMapRoutePlanner.clear();
            mainMapRoutePlanner = null;
        }
        mainMapRouteSearchVersion += 1;
        const point = [longitude, latitude];
        if (pointType === 'origin') {
            this.stopMainMapRouteLocationTracking();
            mainMapRouteUsesCurrentLocation = false;
            mainMapRouteOrigin = point;
        } else mainMapRouteDestination = point;
        mainMapRouteSelecting = null;
        this.updateMainMapRoutePanel();
        document.getElementById('mainMapRouteStatus').textContent =
            mainMapRouteOrigin && mainMapRouteDestination
                ? '起点和终点已就绪，可以开始规划。'
                : '位置已设置，请继续选择另一个位置。';
    },

    setMainMapRouteOriginToCurrentLocation() {
        if (!map) return;
        const status = document.getElementById('mainMapRouteStatus');
        status.textContent = '正在获取当前位置…';
        map.plugin('AMap.Geolocation', () => {
            if (!AMap.Geolocation) {
                status.textContent = '定位服务不可用，请在地图上手动选择起点。';
                return;
            }
            const geolocation = new AMap.Geolocation({ enableHighAccuracy: true, timeout: 10000 });
            geolocation.getCurrentPosition((resultStatus, result) => {
                if (resultStatus !== 'complete' || !result.position) {
                    status.textContent = '定位失败，请检查浏览器定位权限，或在地图上手动选择起点。';
                    return;
                }
                this.setMainMapRoutePoint('origin', result.position);
                mainMapRouteUsesCurrentLocation = true;
                map.setZoomAndCenter(16, result.position);
            });
        });
    },

    startMainMapRouteLocationTracking() {
        if (mainMapRouteLocationWatchId !== null) return;
        if (!navigator.geolocation) {
            document.getElementById('mainMapRouteStatus').textContent =
                '浏览器不支持持续定位，路线将使用当前起点。';
            return;
        }

        const watchVersion = ++mainMapRouteLocationWatchVersion;
        mainMapRouteLocationWatchId = navigator.geolocation.watchPosition((position) => {
            if (watchVersion !== mainMapRouteLocationWatchVersion || !mainMapRouteUsesCurrentLocation) return;
            const gpsPosition = [position.coords.longitude, position.coords.latitude];
            AMap.convertFrom(gpsPosition, 'gps', (convertStatus, result) => {
                if (watchVersion !== mainMapRouteLocationWatchVersion
                    || !mainMapRouteUsesCurrentLocation) return;
                if (convertStatus !== 'complete' || result?.info !== 'ok' || !result.locations?.length) {
                    document.getElementById('mainMapRouteStatus').textContent =
                        '当前位置坐标转换失败，正在等待下一次定位。';
                    return;
                }

                const converted = result.locations[0];
                const origin = [
                    Number(typeof converted.getLng === 'function' ? converted.getLng() : converted.lng),
                    Number(typeof converted.getLat === 'function' ? converted.getLat() : converted.lat)
                ];
                if (!origin.every(Number.isFinite)) return;
                mainMapRouteOrigin = origin;
                this.updateCurrentLocationMarker(converted);
                map.setCenter(converted);
                this.updateMainMapRoutePanel();

                const refreshOrigin = mainMapRouteLastRefreshOrigin;
                if (!refreshOrigin || this.getRoutePointDistance(refreshOrigin, origin) >= 30) {
                    this.scheduleMainMapRouteRefresh();
                }
            }, {
                enableHighAccuracy: true,
                maximumAge: 3000,
                timeout: 15000
            });
        }, (error) => {
            if (watchVersion !== mainMapRouteLocationWatchVersion) return;
            const status = error.code === error.PERMISSION_DENIED
                ? '持续定位被拒绝，请在浏览器中允许定位。'
                : '持续定位暂时不可用，路线将保留最后一次起点。';
            document.getElementById('mainMapRouteStatus').textContent = status;
        }, {
            enableHighAccuracy: true,
            maximumAge: 3000,
            timeout: 15000
        });
    },

    getRoutePointDistance(first, second) {
        const radians = (degrees) => degrees * Math.PI / 180;
        const latitudeDelta = radians(second[1] - first[1]);
        const longitudeDelta = radians(second[0] - first[0]);
        const value = Math.sin(latitudeDelta / 2) ** 2
            + Math.cos(radians(first[1])) * Math.cos(radians(second[1]))
            * Math.sin(longitudeDelta / 2) ** 2;
        return 6371000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
    },

    scheduleMainMapRouteRefresh() {
        if (mainMapRouteRefreshTimer !== null) return;
        mainMapRouteRefreshTimer = setTimeout(() => {
            mainMapRouteRefreshTimer = null;
            if (!mainMapRouteUsesCurrentLocation || !mainMapRouteDestination) return;
            mainMapRouteLastRefreshOrigin = mainMapRouteOrigin;
            this.planMainMapRoute(true);
        }, 5000);
    },

    updateMainMapRoutePanel() {
        const originButton = document.getElementById('mainMapRouteOriginBtn');
        const destinationButton = document.getElementById('mainMapRouteDestinationBtn');
        const formatPoint = (point) => point
            ? `${point[0].toFixed(5)}, ${point[1].toFixed(5)}`
            : null;
        originButton.textContent = formatPoint(mainMapRouteOrigin) || '在地图上选起点';
        destinationButton.textContent = formatPoint(mainMapRouteDestination) || '在地图上选终点';
        originButton.setAttribute('aria-pressed', String(mainMapRouteSelecting === 'origin'));
        destinationButton.setAttribute('aria-pressed', String(mainMapRouteSelecting === 'destination'));
        document.getElementById('mainMapRoutePlanBtn').disabled =
            !mainMapRouteOrigin || !mainMapRouteDestination;
    },

    planMainMapRoute(isLocationRefresh = false) {
        if (!map || !mainMapRouteOrigin || !mainMapRouteDestination) return;
        if (!isLocationRefresh) {
            const navigationUrl = this.getMainMapNavigationUrl();
            if (!navigationUrl) {
                document.getElementById('mainMapRouteStatus').textContent = '无法生成导航路线，请检查起点和终点。';
                return;
            }
            this.stopMainMapRouteLocationTracking();
            document.getElementById('mainMapRouteStatus').textContent = '正在打开默认导航软件…';
            window.location.href = navigationUrl;
            return;
        }
        const routeMode = mainMapRouteMode;
        const searchVersion = ++mainMapRouteSearchVersion;
        const status = document.getElementById('mainMapRouteStatus');
        status.textContent = '正在查询路线…';
        const pluginName = routeMode === 'riding' ? 'AMap.Riding' : 'AMap.Driving';
        map.plugin(pluginName, () => {
            if (searchVersion !== mainMapRouteSearchVersion) return;
            const Planner = routeMode === 'riding' ? AMap.Riding : AMap.Driving;
            if (!Planner) {
                status.textContent = '路线规划服务加载失败，请检查网络后重试。';
                return;
            }
            if (mainMapRoutePlanner) mainMapRoutePlanner.clear();
            mainMapRoutePlanner = new Planner({ map });
            mainMapRoutePlanner.search(mainMapRouteOrigin, mainMapRouteDestination, (resultStatus, result) => {
                if (searchVersion !== mainMapRouteSearchVersion) return;
                if (resultStatus !== 'complete' || !result?.routes?.length) {
                    status.textContent = result?.info || '没有找到可用路线，请调整起点或终点后重试。';
                    return;
                }
                const route = result.routes[0];
                const distance = Number(route.distance);
                const duration = Number(route.time);
                const distanceText = Number.isFinite(distance)
                    ? distance >= 1000 ? `${(distance / 1000).toFixed(1)} 公里` : `${Math.round(distance)} 米`
                    : '';
                const durationText = Number.isFinite(duration)
                    ? `预计 ${Math.ceil(duration / 60)} 分钟`
                    : '';
                const modeText = routeMode === 'riding' ? '骑行' : '驾车';
                status.textContent = `${mainMapRouteUsesCurrentLocation ? '实时跟踪中 · ' : ''}${modeText}路线${distanceText ? `：${distanceText}` : ''}${durationText ? `，${durationText}` : ''}`;
            });
        });
    },

    getDefaultNavigationApp() {
        try {
            const savedApp = localStorage.getItem(MAIN_MAP_DEFAULT_NAVIGATION_STORAGE_KEY);
            if (MAIN_MAP_NAVIGATION_APPS.includes(savedApp)) mainMapDefaultNavigationApp = savedApp;
        } catch (error) {
            console.warn('无法读取默认导航设置：', error);
        }
        return mainMapDefaultNavigationApp;
    },

    setDefaultNavigationApp(app) {
        if (!MAIN_MAP_NAVIGATION_APPS.includes(app)) return false;
        mainMapDefaultNavigationApp = app;
        try {
            localStorage.setItem(MAIN_MAP_DEFAULT_NAVIGATION_STORAGE_KEY, app);
        } catch (error) {
            console.warn('无法保存默认导航设置：', error);
            return false;
        }
        return true;
    },

    getMainMapNavigationUrl() {
        if (!mainMapRouteOrigin || !mainMapRouteDestination) return null;
        const [originLongitude, originLatitude] = mainMapRouteOrigin.map(Number);
        const [destinationLongitude, destinationLatitude] = mainMapRouteDestination.map(Number);
        if (![originLongitude, originLatitude, destinationLongitude, destinationLatitude].every(Number.isFinite)) {
            return null;
        }
        const destinationName = '路线终点';
        const encodedDestinationName = encodeURIComponent(destinationName);
        const originName = '路线起点';
        const encodedOriginName = encodeURIComponent(originName);

        if (mainMapDefaultNavigationApp === 'baidu') {
            const origin = `latlng:${originLatitude},${originLongitude}|name:${originName}`;
            const destination = `latlng:${destinationLatitude},${destinationLongitude}|name:${destinationName}`;
            const mode = mainMapRouteMode === 'riding' ? 'riding' : 'driving';
            return `baidumap://map/direction?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&mode=${mode}&coord_type=gcj02`;
        }

        if (mainMapDefaultNavigationApp === 'tencent') {
            const mode = mainMapRouteMode === 'riding' ? 'bike' : 'drive';
            return `qqmap://map/routeplan?type=${mode}&from=${encodedOriginName}&fromcoord=${originLatitude},${originLongitude}&to=${encodedDestinationName}&tocoord=${destinationLatitude},${destinationLongitude}&coord_type=1`;
        }

        const mode = mainMapRouteMode === 'riding' ? 3 : 0;
        return `amapuri://route/plan/?sid=&slat=${originLatitude}&slon=${originLongitude}&sname=${encodedOriginName}&did=&dlat=${destinationLatitude}&dlon=${destinationLongitude}&dname=${encodedDestinationName}&dev=0&t=${mode}`;
    },

    clearMainMapRoute() {
        this.stopMainMapRouteLocationTracking();
        mainMapRouteUsesCurrentLocation = false;
        mainMapRouteSearchVersion += 1;
        if (mainMapRoutePlanner) {
            mainMapRoutePlanner.clear();
            mainMapRoutePlanner = null;
        }
        mainMapRouteOrigin = null;
        mainMapRouteDestination = null;
        mainMapRouteSelecting = null;
        this.updateMainMapRoutePanel();
        document.getElementById('mainMapRouteStatus').textContent = '路线已清除，请重新选择起点和终点。';
    },

    updateCurrentLocationMarker(position) {
        if (!currentLocationMarker) {
            const markerContent = document.createElement('span');
            markerContent.className = 'current-location-marker';
            markerContent.setAttribute('aria-label', '当前位置');
            const markerIcon = document.createElement('img');
            markerIcon.className = 'current-location-marker-icon';
            markerIcon.src = 'assets/images/assets-id-dibiao.svg';
            markerIcon.alt = '';
            markerContent.appendChild(markerIcon);
            currentLocationMarker = new AMap.Marker({
                position,
                content: markerContent,
                offset: new AMap.Pixel(-16, -16),
                anchor: 'center',
                clickable: false,
                zIndex: 200
            });
            map.add(currentLocationMarker);
            return;
        }
        currentLocationMarker.setPosition(position);
    },

    zoomIn() {
        if (!map) return;
        map.setZoom(Math.min(map.getZoom() + 1, map.getZooms()[1]));
    },

    zoomOut() {
        if (!map) return;
        map.setZoom(Math.max(map.getZoom() - 1, map.getZooms()[0]));
    },

    toggleMainMapAddMode() {
        mainMapAddMode = !mainMapAddMode;
        const button = document.getElementById('addMarkBtn');
        button.classList.toggle('is-active', mainMapAddMode);
        button.setAttribute('aria-pressed', String(mainMapAddMode));
        button.setAttribute('aria-label', mainMapAddMode
            ? '关闭新增标注'
            : '开启新增标注');
        button.title = mainMapAddMode
            ? '新增标注已开启，点击地图选择位置；再次点击关闭'
            : '开启后点击地图添加标注';
        mainMapZoneLabels.forEach((marker) => {
            const label = marker.getContent();
            label.setAttribute('aria-label', mainMapAddMode
                ? `在${label.textContent}区域添加标注`
                : `管理地图区域：${label.textContent}`);
            label.title = mainMapAddMode
                ? `点击此处在“${label.textContent}”区域添加标注`
                : `点击管理地图区域“${label.textContent}”`;
        });
    },

    openMainMapMarkForm(position) {
        currentLatLng = position;
        editingMarkId = null;
        showAddMarkForm('新增标注');
    },

    loadMainMapZones() {
        if (!map) return Promise.resolve();
        return DB.getAll('zones').then((items) => {
            mainMapZones = items.filter((zone) => zone.mapScope === 'main-map'
                && ['rectangle', 'polygon'].includes(zone.shapeType)
                && Array.isArray(zone.path)
                && zone.path.length >= 4);
            this.renderMainMapZones();
        }).catch((error) => {
            alert(`读取地图矩形区域失败：${error.message || error}`);
        });
    },

    renderMainMapZones() {
        if (!map) return;
        if (mainMapZoneOverlays.length) map.remove(mainMapZoneOverlays);
        if (mainMapZoneLabels.length) map.remove(mainMapZoneLabels);

        mainMapZoneOverlays = mainMapZones.map((zone) => {
            const noCycling = zone.accessStatus === 'no-cycling';
            const overlay = new AMap.Polygon({
                path: zone.path,
                strokeColor: noCycling ? '#d93025' : '#178a70',
                strokeWeight: 2,
                strokeOpacity: 0.5,
                strokeStyle: 'dashed',
                strokeDasharray: [3, 6],
                fillColor: noCycling ? '#ef5350' : '#20a957',
                fillOpacity: noCycling ? 0.2 : 0.1,
                zIndex: 35
            });
            overlay.on('click', (event) => {
                event.stopPropagation?.();
                if (mainMapDrawingShape) {
                    this.addMainMapRectanglePoint(event.lnglat);
                    return;
                }
                if (mainMapAddMode) this.openMainMapMarkForm(event.lnglat);
            });
            return overlay;
        });

        mainMapZoneLabels = mainMapZones.map((zone) => {
            const label = document.createElement('button');
            label.type = 'button';
            label.className = 'main-map-zone-label';
            label.textContent = zone.name;
            label.setAttribute('aria-label', mainMapAddMode
                ? `在${zone.name}区域添加标注`
                : `管理地图区域：${zone.name}`);
            label.title = mainMapAddMode
                ? `点击此处在“${zone.name}”区域添加标注`
                : `点击管理地图区域“${zone.name}”`;
            label.addEventListener('click', async (event) => {
                event.stopPropagation();
                if (mainMapAddMode) {
                    this.openMainMapMarkForm(labelMarker.getPosition());
                    return;
                }
                this.openMainMapZoneManager(zone.id);
            });
            const corners = zone.path.slice(0, -1);
            const center = corners.reduce((sum, [longitude, latitude]) => ({
                lng: sum.lng + longitude / corners.length,
                lat: sum.lat + latitude / corners.length
            }), { lng: 0, lat: 0 });
            const labelMarker = new AMap.Marker({
                content: label,
                position: [center.lng, center.lat],
                anchor: 'center',
                offset: new AMap.Pixel(0, 0),
                zIndex: 80
            });
            return labelMarker;
        });
        if (mainMapZoneOverlays.length) map.add(mainMapZoneOverlays);
        if (mainMapZoneLabels.length) map.add(mainMapZoneLabels);
        updateMapHeightIndicator();
    },

    startMainMapRectangleDrawing(shapeType = 'rectangle') {
        if (!map) return;
        if (!['rectangle', 'polygon'].includes(shapeType)) return;
        mainMapDrawingShape = shapeType;
        mainMapRectanglePoints = [];
        if (mainMapRectanglePreview) map.remove(mainMapRectanglePreview);
        mainMapRectanglePreview = null;
        document.getElementById('mainMapRectangleStartBtn').hidden = true;
        document.getElementById('mainMapPolygonStartBtn').hidden = true;
        document.getElementById('mainMapRectangleHint').textContent = shapeType === 'polygon'
            ? '点击地图添加顶点，最多 10 个点'
            : '依次点击矩形的两个角点';
        document.getElementById('mainMapRectangleHint').hidden = false;
        document.getElementById('mainMapRectangleFinishBtn').hidden = false;
        document.getElementById('mainMapRectangleFinishBtn').disabled = shapeType === 'rectangle';
        document.getElementById('mainMapRectangleCancelBtn').hidden = false;
    },

    addMainMapRectanglePoint(position) {
        if (!mainMapDrawingShape) return;
        const maxPoints = mainMapDrawingShape === 'polygon' ? 10 : 2;
        if (mainMapRectanglePoints.length >= maxPoints) return;
        mainMapRectanglePoints.push([position.getLng(), position.getLat()]);
        if (mainMapRectanglePreview) map.remove(mainMapRectanglePreview);
        if (mainMapDrawingShape === 'polygon') {
            document.getElementById('mainMapRectangleHint').textContent =
                `已选 ${mainMapRectanglePoints.length}/10 个点${mainMapRectanglePoints.length === 10 ? '（已达上限）' : ''}`;
        }
        if (mainMapDrawingShape === 'rectangle' && mainMapRectanglePoints.length === 1) {
            mainMapRectanglePreview = new AMap.Marker({
                position: mainMapRectanglePoints[0],
                content: '<span class="zone-draw-point"></span>',
                offset: new AMap.Pixel(-6, -6)
            });
            map.add(mainMapRectanglePreview);
            return;
        }
        const path = mainMapDrawingShape === 'rectangle'
            ? this.createRectanglePath(mainMapRectanglePoints)
            : mainMapRectanglePoints;
        const previewStyle = {
            path,
            strokeColor: '#e47a36',
            strokeWeight: 2,
            strokeStyle: 'dashed',
            strokeDasharray: [4, 3],
            fillColor: '#f3aa62',
            fillOpacity: 0.12
        };
        mainMapRectanglePreview = mainMapDrawingShape === 'polygon' && path.length < 3
            ? new AMap.Polyline(previewStyle)
            : new AMap.Polygon(previewStyle);
        map.add(mainMapRectanglePreview);
        document.getElementById('mainMapRectangleFinishBtn').disabled =
            mainMapDrawingShape === 'polygon' ? path.length < 3 : false;
    },

    finishMainMapRectangleDrawing() {
        if (!mainMapDrawingShape) return;
        if (mainMapDrawingShape === 'rectangle') {
            if (mainMapRectanglePoints.length !== 2) return;
            const [[lng1, lat1], [lng2, lat2]] = mainMapRectanglePoints;
            if (lng1 === lng2 || lat1 === lat2) {
                alert('矩形的两个角点不能重合或位于同一条边线上');
                return;
            }
            pendingMainMapRectanglePath = this.createRectanglePath(mainMapRectanglePoints);
        } else {
            if (mainMapRectanglePoints.length < 3) return;
            const distinctPoints = new Set(mainMapRectanglePoints.map((point) => point.join(',')));
            if (distinctPoints.size < 3) {
                alert('多边形至少需要三个不重复的顶点');
                return;
            }
            pendingMainMapRectanglePath = [...mainMapRectanglePoints, mainMapRectanglePoints[0]];
        }
        pendingMainMapShapeType = mainMapDrawingShape;
        this.cancelMainMapRectangleDrawing();
        document.getElementById('mainMapZoneNameInput').value = '';
        document.getElementById('mainMapZoneNameDialog').classList.remove('hidden');
        document.getElementById('mainMapZoneNameInput').focus();
    },

    cancelMainMapRectangleDrawing() {
        mainMapDrawingShape = null;
        mainMapRectanglePoints = [];
        if (mainMapRectanglePreview && map) map.remove(mainMapRectanglePreview);
        mainMapRectanglePreview = null;
        document.getElementById('mainMapRectangleStartBtn').hidden = false;
        document.getElementById('mainMapPolygonStartBtn').hidden = false;
        document.getElementById('mainMapRectangleHint').hidden = true;
        document.getElementById('mainMapRectangleFinishBtn').hidden = true;
        document.getElementById('mainMapRectangleFinishBtn').disabled = true;
        document.getElementById('mainMapRectangleCancelBtn').hidden = true;
    },

    closeMainMapZoneNameDialog() {
        document.getElementById('mainMapZoneNameDialog').classList.add('hidden');
        pendingMainMapRectanglePath = null;
        pendingMainMapShapeType = null;
    },

    async saveMainMapRectangle(name) {
        const cleanName = name.trim();
        if (mainMapZoneSaveInProgress) return;
        if (!pendingMainMapRectanglePath || !cleanName) {
            alert('请输入矩形区域名称');
            return;
        }
        mainMapZoneSaveInProgress = true;
        try {
            await DB.add('zones', {
                name: cleanName,
                shapeType: pendingMainMapShapeType,
                path: pendingMainMapRectanglePath,
                mapScope: 'main-map',
                accessStatus: 'basement-access'
            });
            this.closeMainMapZoneNameDialog();
            await this.loadMainMapZones();
        } catch (error) {
            alert(`保存地图矩形区域失败：${error.message || error}`);
        } finally {
            mainMapZoneSaveInProgress = false;
        }
    },

    openMainMapZoneManager(zoneId) {
        const zone = mainMapZones.find((item) => item.id === zoneId);
        if (!zone) return;
        currentMainMapZoneId = zone.id;
        document.getElementById('mainMapZoneManagerName').value = zone.name || '';
        const status = zone.accessStatus === 'no-cycling' ? 'no-cycling' : 'basement-access';
        document.querySelectorAll('input[name="mainMapZoneStatus"]').forEach((input) => {
            input.checked = input.value === status;
        });
        document.getElementById('mainMapZoneManagerStatus').textContent = '';
        document.getElementById('mainMapZoneManagerDialog').classList.remove('hidden');
        document.getElementById('mainMapZoneManagerName').focus();
    },

    closeMainMapZoneManager() {
        document.getElementById('mainMapZoneManagerDialog').classList.add('hidden');
        currentMainMapZoneId = null;
        mainMapZoneUpdateInProgress = false;
    },

    async saveMainMapZoneName(name) {
        const zone = mainMapZones.find((item) => item.id === currentMainMapZoneId);
        const cleanName = name.trim();
        if (!zone || mainMapZoneUpdateInProgress) return;
        if (!cleanName) {
            alert('请输入区域名称');
            return;
        }
        const updated = { ...zone, name: cleanName };
        mainMapZoneUpdateInProgress = true;
        try {
            await DB.put('zones', updated);
            await this.loadMainMapZones();
            this.closeMainMapZoneManager();
        } catch (error) {
            alert(`修改区域名称失败：${error.message || error}`);
        } finally {
            mainMapZoneUpdateInProgress = false;
        }
    },

    async setMainMapZoneStatus(status) {
        const zone = mainMapZones.find((item) => item.id === currentMainMapZoneId);
        if (!zone || !['basement-access', 'no-cycling'].includes(status)
            || mainMapZoneUpdateInProgress) return;
        const updated = { ...zone, accessStatus: status };
        mainMapZoneUpdateInProgress = true;
        document.querySelectorAll('input[name="mainMapZoneStatus"]').forEach((input) => {
            input.disabled = true;
        });
        try {
            await DB.put('zones', updated);
            await this.loadMainMapZones();
            document.getElementById('mainMapZoneManagerStatus').textContent = '状态已立即保存';
        } catch (error) {
            const previousStatus = zone.accessStatus === 'no-cycling'
                ? 'no-cycling'
                : 'basement-access';
            document.querySelectorAll('input[name="mainMapZoneStatus"]').forEach((input) => {
                input.checked = input.value === previousStatus;
            });
            alert(`保存区域状态失败：${error.message || error}`);
        } finally {
            mainMapZoneUpdateInProgress = false;
            document.querySelectorAll('input[name="mainMapZoneStatus"]').forEach((input) => {
                input.disabled = false;
            });
        }
    },

    async deleteMainMapZone() {
        const zone = mainMapZones.find((item) => item.id === currentMainMapZoneId);
        if (!zone || mainMapZoneUpdateInProgress) return;
        if (!confirm(`确定删除区域“${zone.name}”吗？`)) return;
        mainMapZoneUpdateInProgress = true;
        try {
            await DB.delete('zones', zone.id);
            this.closeMainMapZoneManager();
            await this.loadMainMapZones();
        } catch (error) {
            alert(`删除区域失败：${error.message || error}`);
        } finally {
            mainMapZoneUpdateInProgress = false;
        }
    },

    initMerchants() {
        if (typeof AMap === 'undefined') {
            document.getElementById('merchantMapContainer').innerHTML =
                '<p style="padding:20px;color:#666;">商家地图加载失败，请检查网络和高德地图 Key 配置。</p>';
            return;
        }
        if (merchantMap) return;

        merchantMap = new AMap.Map('merchantMapContainer', {
            zoom: 11,
            center: [106.6282, 26.6467],
            viewMode: '3D',
            pitch: 0,
            skyColor: '#ffffff',
            mapStyle: 'amap://styles/normal',
            features: ['bg', 'road', 'building']
        });
        merchantMap.on('zoomend', () => {
            this.updateMerchantMarkerVisibility();
            this.updateMerchantZoomLabel();
            this.scheduleMerchantLayout();
        });
        merchantMap.on('complete', () => {
            this.updateMerchantZoomLabel();
            this.scheduleMerchantLayout();
        });
        merchantMap.on('moveend', () => {
            this.updateMerchantZoomLabel();
            this.scheduleMerchantLayout();
        });
        merchantMap.on('resize', () => {
            this.updateMerchantZoomLabel();
            this.scheduleMerchantLayout();
        });
        merchantMap.on('click', (event) => {
            this.closeMerchantActionMenu();
            this.selectMerchant(null);
            if (merchantMapHiddenMarkIds.size) {
                merchantMapHiddenMarkIds.clear();
                this.scheduleMerchantLayout();
            }
            if (merchantAddMode) this.openMerchantAddForm(event.lnglat);
            else if (placeLabelAddMode) this.openPlaceLabelForm(event.lnglat);
            else if (zoneDrawingType) this.addZoneDrawingPoint(event.lnglat);
            else if (activeMerchantZoneId !== null) {
                activeMerchantZoneId = null;
                this.scheduleMerchantLayout();
            }
        });
        merchantBaseMapLayers = merchantMap.getLayers()
            .filter((layer) => !layer.CLASS_NAME || !layer.CLASS_NAME.includes('LabelsLayer'));
        merchantSatelliteLayer = new AMap.TileLayer.Satellite();
        document.getElementById('merchantMapTypeToggleBtn').addEventListener('click', () => {
            this.toggleMerchantMapType();
        });
        document.getElementById('merchantMap3dToggleBtn').addEventListener('click', () => {
            this.toggleMerchantMap3D();
        });
        merchantCatalogue = [];
        visibleMerchants = [...merchantCatalogue].sort((a, b) => b.orders - a.orders);
        this.renderMerchantMarkers();
        if (DB.db) {
            this.loadMerchantMarks();
            this.loadPlaceLabels();
            this.loadZones();
        }
    },

    updateMerchantMarkerVisibility() {
        if (!merchantMap) return;
        const viewHeight = this.getMerchantViewHeight();
        const shouldShowMarkers = viewHeight === null
            ? merchantMap.getZoom() >= TEXT_MARK_MIN_ZOOM
                && merchantMap.getZoom() < merchantMap.getZooms()[1]
            : viewHeight > 0 && viewHeight <= MERCHANT_MARKER_MAX_VIEW_HEIGHT_METERS;
        merchantMarkers.forEach((marker) => {
            if (shouldShowMarkers) marker.show();
            else marker.hide();
        });
        this.scheduleMerchantLayout();
    },

    getMerchantViewHeight() {
        const bounds = merchantMap?.getBounds();
        if (!bounds) return null;
        const south = bounds.getSouthWest().getLat();
        const north = bounds.getNorthEast().getLat();
        return Math.abs(north - south) * Math.PI / 180 * 6371008.8;
    },

    updateMerchantZoomLabel() {
        const viewHeight = this.getMerchantViewHeight();
        if (viewHeight === null) return;
        this.updatePlaceLabelVisibility(viewHeight);
        this.updateZoneOverlayVisibility(viewHeight);
        const maxStep = MERCHANT_ZOOM_STEPS_METERS[MERCHANT_ZOOM_STEPS_METERS.length - 1];
        if (viewHeight > maxStep * 1.03) {
            document.getElementById('merchantZoomLevel').textContent = '>4000m';
            return;
        }
        if (viewHeight < MERCHANT_ZOOM_STEPS_METERS[1] * 0.97) {
            document.getElementById('merchantZoomLevel').textContent = '1m';
            return;
        }
        const nearestStep = MERCHANT_ZOOM_STEPS_METERS.reduce((nearest, step) =>
            Math.abs(Math.log(viewHeight / step)) < Math.abs(Math.log(viewHeight / nearest))
                ? step
                : nearest, MERCHANT_ZOOM_STEPS_METERS[0]);
        document.getElementById('merchantZoomLevel').textContent = `≈${nearestStep}m`;
    },

    updateZoneOverlayVisibility(viewHeight = this.getMerchantViewHeight()) {
        if (viewHeight === null) return;
        const shouldShow = viewHeight <= ZONE_OVERLAY_MAX_VIEW_HEIGHT_METERS;
        zoneMapOverlays.forEach((overlay) => {
            if (shouldShow) overlay.show();
            else overlay.hide();
        });
        zoneNameMarkers.forEach((marker) => {
            if (shouldShow) marker.show();
            else marker.hide();
        });
        this.scheduleMerchantLayout();
    },

    stepMerchantZoom(direction) {
        if (!merchantMap) return;
        const viewHeight = this.getMerchantViewHeight();
        if (!viewHeight || !Number.isFinite(viewHeight)) return;

        const lastStepIndex = MERCHANT_ZOOM_STEPS_METERS.length - 1;
        let targetIndex;
        if (viewHeight > MERCHANT_ZOOM_STEPS_METERS[lastStepIndex] * 1.03) {
            if (direction > 0) return;
            targetIndex = lastStepIndex;
        } else if (viewHeight < MERCHANT_ZOOM_STEPS_METERS[1] * 0.97) {
            if (direction < 0) return;
            targetIndex = 1;
        } else {
            const nearestIndex = MERCHANT_ZOOM_STEPS_METERS.reduce((nearest, step, index, steps) =>
                Math.abs(Math.log(viewHeight / step)) < Math.abs(Math.log(viewHeight / steps[nearest]))
                    ? index
                    : nearest, 0);
            targetIndex = Math.max(0, Math.min(lastStepIndex, nearestIndex + direction));
        }
        const targetHeight = MERCHANT_ZOOM_STEPS_METERS[targetIndex];
        const currentZoom = merchantMap.getZoom();
        const zoomDelta = Math.log2(viewHeight / targetHeight);
        const zoomRange = merchantMap.getZooms();
        const targetZoom = Math.max(zoomRange[0], Math.min(zoomRange[1], currentZoom + zoomDelta));
        merchantMap.setZoom(targetZoom, true);
        this.updateMerchantMarkerVisibility();
        this.updateMerchantZoomLabel();
    },

    toggleMerchantMapType() {
        if (!merchantMap || !merchantSatelliteLayer) return;

        isMerchantSatelliteMap = !isMerchantSatelliteMap;
        merchantMap.setLayers(isMerchantSatelliteMap ? [merchantSatelliteLayer] : merchantBaseMapLayers);
        if (isMerchantSatelliteMap) {
            merchantMap.getLayers()
                .filter((layer) => layer.CLASS_NAME && layer.CLASS_NAME.includes('LabelsLayer'))
                .forEach((layer) => merchantMap.removeLayer(layer));
        }

        const button = document.getElementById('merchantMapTypeToggleBtn');
        button.setAttribute('aria-pressed', String(isMerchantSatelliteMap));
        button.setAttribute('aria-label', isMerchantSatelliteMap ? '切换到普通地图' : '切换到卫星地图');
        button.querySelector('span').textContent = isMerchantSatelliteMap ? '普通' : '卫星';
    },

    toggleMerchantMap3D() {
        if (!merchantMap) return;
        isMerchantMap3D = !isMerchantMap3D;
        merchantMap.setPitch(isMerchantMap3D ? 50 : 0);
        const button = document.getElementById('merchantMap3dToggleBtn');
        button.setAttribute('aria-pressed', String(isMerchantMap3D));
        button.setAttribute('aria-label', isMerchantMap3D ? '切换到2D视图' : '切换到3D视图');
        button.querySelector('span').textContent = isMerchantMap3D ? '2D' : '3D';
    },

    loadMerchantMarks() {
        if (!merchantMap) return;
        const loadVersion = ++merchantMarksLoadVersion;
        return DB.getAll('marks').then((marks) => {
            if (loadVersion !== merchantMarksLoadVersion) return;
            const merchantMarks = marks.filter((mark) => mark.category === 'merchant');
            if (!merchantMarks.length) {
                merchantCatalogue = [];
                document.getElementById('merchantMapHint').textContent = '暂无商家标注；开启下方添加开关后点击地图添加';
            } else {
                merchantCatalogue = merchantMarks.map((mark) => ({
                    id: `mark-${mark.id}`,
                    markId: mark.id,
                    name: mark.name || '(未命名商家)',
                    position: [mark.lng, mark.lat],
                    distance: '',
                    orders: 0,
                    available: null,
                    total: null,
                    price: null,
                    vipPrice: null,
                    badges: ['商家标注'],
                    note: mark.note || '',
                    rating: Number(mark.rating) || 0,
                    photo: mark.photo instanceof Blob ? mark.photo : null,
                    zoneIds: Array.isArray(mark.zoneIds) ? mark.zoneIds : [],
                    excludedZoneIds: Array.isArray(mark.excludedZoneIds) ? mark.excludedZoneIds : [],
                    isSavedMark: true
                }));
                document.getElementById('merchantMapHint').textContent = '点击商家图标查看详情；开启下方添加开关后可添加商家';
            }
            const previousId = selectedMerchant?.id;
            visibleMerchants = [...merchantCatalogue].sort((a, b) => b.orders - a.orders);
            this.renderMerchantMarkers();
            if (previousId) {
                this.selectMerchant(visibleMerchants.find((merchant) => merchant.id === previousId) || null);
            }
        }).catch((error) => {
            alert(`读取商家标注失败：${error.message}`);
        });
    },

    toggleMerchantAddMode(enabled = null) {
        merchantAddMode = enabled === null ? !merchantAddMode : Boolean(enabled);
        if (merchantAddMode) this.setPlaceLabelAddMode(false);
        if (merchantAddMode) this.cancelZoneDrawing();
        if (!merchantAddMode) {
            merchantAddZoneId = null;
            merchantAddFromActiveMode = false;
        }
        const button = document.getElementById('merchantAddModeBtn');
        button.classList.toggle('is-enabled', merchantAddMode);
        button.setAttribute('aria-pressed', String(merchantAddMode));
        button.setAttribute('aria-label', merchantAddMode
            ? '商家添加已开启，点击地图可添加商家'
            : '商家添加已关闭，点击地图不会添加商家');
        document.getElementById('merchantAddModeLabel').textContent =
            `添加商家：${merchantAddMode ? '开启' : '关闭'}`;
    },

    setPlaceLabelAddMode(enabled) {
        placeLabelAddMode = enabled;
        const button = document.getElementById('placeLabelModeBtn');
        button.classList.toggle('is-enabled', placeLabelAddMode);
        button.setAttribute('aria-pressed', String(placeLabelAddMode));
        button.setAttribute('aria-label', placeLabelAddMode
            ? '地名添加已开启，点击地图可添加地名'
            : '地名添加已关闭，点击地图不会添加地名');
        document.getElementById('placeLabelModeLabel').textContent =
            `添加地名：${placeLabelAddMode ? '开启' : '关闭'}`;
    },

    togglePlaceLabelAddMode() {
        const enabled = !placeLabelAddMode;
        if (enabled && merchantAddMode) this.toggleMerchantAddMode();
        if (enabled) this.cancelZoneDrawing();
        this.setPlaceLabelAddMode(enabled);
    },

    openPlaceLabelForm(position) {
        if (!position) return;
        editingPlaceLabelId = null;
        document.getElementById('placeLabelTitle').textContent = '新增地名';
        document.querySelector('#placeLabelForm button[type="submit"]').textContent = '保存地名';
        document.getElementById('placeLabelDelete').hidden = true;
        pendingPlaceLabelPosition = { lat: position.getLat(), lng: position.getLng() };
        document.getElementById('placeLabelLocation').textContent =
            `已选择地图位置 · ${pendingPlaceLabelPosition.lat.toFixed(6)}, ${pendingPlaceLabelPosition.lng.toFixed(6)}`;
        document.getElementById('placeLabelName').value = '';
        document.getElementById('placeLabelDialog').classList.remove('hidden');
        document.getElementById('placeLabelName').focus();
    },

    editPlaceLabel(labelId) {
        const label = merchantPlaceLabels.find((item) => item.id === labelId);
        if (!label) return;
        editingPlaceLabelId = label.id;
        pendingPlaceLabelPosition = { lat: label.lat, lng: label.lng };
        document.getElementById('placeLabelTitle').textContent = '编辑地名';
        document.querySelector('#placeLabelForm button[type="submit"]').textContent = '保存修改';
        document.getElementById('placeLabelDelete').hidden = false;
        document.getElementById('placeLabelLocation').textContent =
            `已选择地图位置 · ${label.lat.toFixed(6)}, ${label.lng.toFixed(6)}`;
        document.getElementById('placeLabelName').value = label.name;
        document.getElementById('placeLabelLevel').value = label.level;
        const levelOption = document.querySelector(`#placeLabelLevelOptions [data-place-level="${label.level}"]`);
        document.getElementById('placeLabelLevelValue').textContent = levelOption?.textContent || label.level;
        document.querySelectorAll('#placeLabelLevelOptions [role="option"]').forEach((option) => {
            option.setAttribute('aria-selected', String(option.dataset.placeLevel === label.level));
        });
        document.getElementById('placeLabelLevelOptions').classList.add('hidden');
        document.getElementById('placeLabelLevelButton').setAttribute('aria-expanded', 'false');
        document.getElementById('placeLabelDialog').classList.remove('hidden');
        document.getElementById('placeLabelName').focus();
    },

    closePlaceLabelForm() {
        document.getElementById('placeLabelDialog').classList.add('hidden');
        pendingPlaceLabelPosition = null;
        editingPlaceLabelId = null;
        this.setPlaceLabelAddMode(false);
    },

    async savePlaceLabel(name, level) {
        if (!pendingPlaceLabelPosition || !PLACE_LABEL_LEVELS.includes(level)) {
            alert('地名位置或层级无效，请重新选择地图位置');
            return;
        }
        const label = {
            name: name.trim(),
            level,
            lat: pendingPlaceLabelPosition.lat,
            lng: pendingPlaceLabelPosition.lng
        };
        if (!label.name) {
            alert('请输入地名');
            return;
        }
        try {
            if (editingPlaceLabelId !== null) {
                label.id = editingPlaceLabelId;
                await DB.put('placeLabels', label);
            } else {
                await DB.add('placeLabels', label);
            }
            this.closePlaceLabelForm();
            await this.loadPlaceLabels();
        } catch (error) {
            alert(`保存地名${editingPlaceLabelId !== null ? '修改' : ''}失败：${error.message || error}`);
        }
    },

    async deletePlaceLabel() {
        if (editingPlaceLabelId === null) return;
        if (!confirm('确定删除这个地名标注吗？')) return;
        try {
            await DB.delete('placeLabels', editingPlaceLabelId);
            this.closePlaceLabelForm();
            await this.loadPlaceLabels();
        } catch (error) {
            alert(`删除地名失败：${error.message || error}`);
        }
    },

    loadPlaceLabels() {
        if (!merchantMap) return Promise.resolve();
        return DB.getAll('placeLabels').then((labels) => {
            merchantPlaceLabels = labels.filter((label) =>
                PLACE_LABEL_LEVELS.includes(label.level)
                && typeof label.name === 'string'
                && Number.isFinite(label.lat)
                && Number.isFinite(label.lng));
            this.renderPlaceLabels();
            this.updateMerchantZoomLabel();
        }).catch((error) => {
            alert(`读取地名标签失败：${error.message || error}`);
        });
    },

    renderPlaceLabels() {
        if (!merchantMap) return;
        if (placeLabelMarkers.length) merchantMap.remove(placeLabelMarkers);
        placeLabelMarkers = merchantPlaceLabels.map((label) => {
            const style = PLACE_LABEL_STYLES[label.level];
            const marker = new AMap.Text({
                text: label.name,
                position: [label.lng, label.lat],
                anchor: 'center',
                cursor: 'pointer',
                clickable: true,
                zIndex: 90,
                style: {
                    'background-color': 'rgba(255,255,255,0.9)',
                    'border': '1px solid rgba(45,74,57,0.22)',
                    'border-radius': '5px',
                    'box-shadow': '0 1px 4px rgba(30,45,37,0.16)',
                    'color': label.level === 'province' ? '#173f35' : '#344b3e',
                    'cursor': 'pointer',
                    'font-size': style.fontSize,
                    'font-weight': style.fontWeight,
                    'line-height': '1.35',
                    'padding': '3px 7px',
                    'text-shadow': '0 1px 1px rgba(255,255,255,0.8)'
                }
            });
            marker.__placeLabelLevel = label.level;
            marker.on('click', (event) => {
                event.stopPropagation?.();
                if (placeLabelAddMode) {
                    this.openPlaceLabelForm(marker.getPosition());
                    return;
                }
                if (merchantAddMode) return;
                this.editPlaceLabel(label.id);
            });
            return marker;
        });
        merchantMap.add(placeLabelMarkers);
        this.updatePlaceLabelVisibility(this.getMerchantViewHeight());
    },

    updatePlaceLabelVisibility(viewHeight) {
        if (!Number.isFinite(viewHeight)) {
            placeLabelMarkers.forEach((marker) => marker.hide());
            return;
        }
        placeLabelMarkers.forEach((marker) => {
            const style = PLACE_LABEL_STYLES[marker.__placeLabelLevel];
            const visible = viewHeight > style.minHeight && viewHeight <= style.maxHeight;
            if (visible) marker.show();
            else marker.hide();
        });
    },

    startZoneDrawing(type) {
        if (!['polygon', 'rectangle'].includes(type)) return;
        this.setPlaceLabelAddMode(false);
        if (merchantAddMode) this.toggleMerchantAddMode();
        this.cancelZoneDrawing();
        zoneDrawingType = type;
        const hint = document.getElementById('zoneDrawHint');
        hint.hidden = false;
        hint.textContent = type === 'polygon'
            ? '多边形：点击地图逐点绘制，最多 15 个点；至少 3 个点后点“完成绘制”。'
            : '矩形：在地图上依次点击两个对角点，再点“完成绘制”。';
        document.getElementById('finishZoneDrawBtn').disabled = true;
        document.querySelectorAll('.zone-draw-controls [data-drawing="active"]').forEach((button) => {
            button.removeAttribute('data-drawing');
        });
        document.getElementById(type === 'polygon' ? 'drawPolygonBtn' : 'drawRectangleBtn')
            .setAttribute('data-drawing', 'active');
    },

    addZoneDrawingPoint(lnglat) {
        if (!zoneDrawingType) return;
        if (zoneDrawingType === 'rectangle' && zoneDrawingPoints.length >= 2) {
            document.getElementById('zoneDrawHint').textContent = '矩形只需两个对角点，点击“完成绘制”保存。';
            return;
        }
        if (zoneDrawingType === 'polygon' && zoneDrawingPoints.length >= 15) {
            document.getElementById('zoneDrawHint').textContent = '多边形最多 15 个点，点击“完成绘制”闭合区域。';
            return;
        }
        zoneDrawingPoints.push([lnglat.getLng(), lnglat.getLat()]);
        this.renderZoneDrawingPreview();
        const minimumPoints = zoneDrawingType === 'polygon' ? 3 : 2;
        document.getElementById('finishZoneDrawBtn').disabled = zoneDrawingPoints.length < minimumPoints;
        document.getElementById('zoneDrawHint').textContent = zoneDrawingType === 'polygon'
            ? `多边形已添加 ${zoneDrawingPoints.length}/15 个点${zoneDrawingPoints.length >= 3 ? '，可完成绘制' : '，至少需要 3 个点'}。`
            : `矩形已选择 ${zoneDrawingPoints.length}/2 个对角点。`;
    },

    renderZoneDrawingPreview() {
        if (zoneDrawingOverlay) {
            merchantMap.remove(zoneDrawingOverlay);
            zoneDrawingOverlay = null;
        }
        if (!zoneDrawingPoints.length) return;
        let path = zoneDrawingPoints;
        if (zoneDrawingPoints.length === 1) {
            zoneDrawingOverlay = new AMap.Marker({
                position: zoneDrawingPoints[0],
                content: '<span class="zone-draw-point"></span>',
                offset: new AMap.Pixel(-6, -6)
            });
            merchantMap.add(zoneDrawingOverlay);
            return;
        }
        if (zoneDrawingType === 'rectangle' && zoneDrawingPoints.length === 2) {
            path = this.createRectanglePath(zoneDrawingPoints);
        } else if (zoneDrawingType === 'polygon' && zoneDrawingPoints.length < 3) {
            zoneDrawingOverlay = new AMap.Polyline({
                path,
                strokeColor: '#e47a36',
                strokeWeight: 2,
                strokeStyle: 'dashed',
                strokeDasharray: [4, 3]
            });
            merchantMap.add(zoneDrawingOverlay);
            return;
        }
        zoneDrawingOverlay = new AMap.Polygon({
            path,
            strokeColor: '#e47a36',
            strokeWeight: 2,
            strokeStyle: 'dashed',
            strokeDasharray: [4, 3],
            fillColor: '#f3aa62',
            fillOpacity: 0.12
        });
        merchantMap.add(zoneDrawingOverlay);
    },

    createRectanglePath(points) {
        const [[lng1, lat1], [lng2, lat2]] = points;
        return [
            [lng1, lat1],
            [lng2, lat1],
            [lng2, lat2],
            [lng1, lat2],
            [lng1, lat1]
        ];
    },

    finishZoneDrawing() {
        if (!zoneDrawingType) return;
        const minimumPoints = zoneDrawingType === 'polygon' ? 3 : 2;
        if (zoneDrawingPoints.length < minimumPoints) return;
        pendingZonePath = zoneDrawingType === 'rectangle'
            ? this.createRectanglePath(zoneDrawingPoints)
            : [...zoneDrawingPoints, zoneDrawingPoints[0]];
        const distinctPoints = new Set(pendingZonePath.slice(0, -1).map((point) => point.join(',')));
        const area = pendingZonePath.slice(0, -1).reduce((sum, point, index, points) => {
            const next = points[(index + 1) % points.length];
            return sum + point[0] * next[1] - next[0] * point[1];
        }, 0);
        if (distinctPoints.size < 3 || Math.abs(area) < 1e-10) {
            alert('区域至少需要三个不重复且不共线的点');
            pendingZonePath = null;
            return;
        }
        pendingZoneShapeType = zoneDrawingType;
        this.cancelZoneDrawing();
        document.getElementById('zoneNameInput').value = '';
        document.getElementById('zoneNameDialog').classList.remove('hidden');
        document.getElementById('zoneNameInput').focus();
    },

    cancelZoneDrawing() {
        zoneDrawingType = null;
        zoneDrawingPoints = [];
        document.getElementById('finishZoneDrawBtn').disabled = true;
        document.getElementById('zoneDrawHint').hidden = true;
        document.querySelectorAll('.zone-draw-controls [data-drawing="active"]').forEach((button) => {
            button.removeAttribute('data-drawing');
        });
        if (zoneDrawingOverlay && merchantMap) merchantMap.remove(zoneDrawingOverlay);
        zoneDrawingOverlay = null;
    },

    closeZoneNameDialog() {
        document.getElementById('zoneNameDialog').classList.add('hidden');
        pendingZonePath = null;
        pendingZoneShapeType = null;
    },

    async saveNewZone(name) {
        const cleanName = name.trim();
        if (zoneSaveInProgress) return;
        if (!pendingZonePath || !cleanName) {
            alert('请输入小区区域名称后再完成');
            return;
        }
        zoneSaveInProgress = true;
        const zone = {
            name: cleanName,
            shapeType: pendingZoneShapeType,
            path: pendingZonePath,
            rows: 1,
            columns: 1,
            cells: []
        };
        try {
            const id = await DB.add('zones', zone);
            this.closeZoneNameDialog();
            await this.loadZones();
            const newZone = zones.find((item) => item.id === id);
            if (newZone) this.openMerchantZone(newZone.id);
            document.dispatchEvent(new CustomEvent('zone-data-changed'));
        } catch (error) {
            alert(`保存小区区域失败：${error.message || error}`);
        } finally {
            zoneSaveInProgress = false;
        }
    },

    loadZones() {
        if (!merchantMap) return Promise.resolve();
        return DB.getAll('zones').then((items) => {
            zones = items.filter((zone) =>
                zone.mapScope !== 'main-map'
                && typeof zone.name === 'string'
                && ['polygon', 'rectangle'].includes(zone.shapeType)
                && Array.isArray(zone.path)
                && zone.path.length >= 4);
            if (!zones.some((zone) => zone.id === activeMerchantZoneId)) activeMerchantZoneId = null;
            this.renderZones();
            this.scheduleMerchantLayout();
            document.dispatchEvent(new CustomEvent('zone-data-changed'));
        }).catch((error) => {
            alert(`读取小区区域失败：${error.message || error}`);
        });
    },

    renderZones() {
        if (!merchantMap) return;
        if (zoneMapOverlays.length) merchantMap.remove(zoneMapOverlays);
        if (zoneNameMarkers.length) merchantMap.remove(zoneNameMarkers);
        zoneNameMarkers = [];
        zoneMapOverlays = zones.map((zone) => {
            const polygon = new AMap.Polygon({
                path: zone.path,
                strokeColor: '#178a70',
                strokeWeight: 1,
                strokeOpacity: 1,
                strokeStyle: 'dashed',
                strokeDasharray: [5, 15],
                fillColor: '#68bd8c',
                fillOpacity: 0,
                zIndex: 40
            });
            polygon.__zoneId = zone.id;
            polygon.on('click', (event) => {
                event.stopPropagation?.();
                if (merchantAddMode && event.lnglat) {
                    merchantAddZoneId = zone.id;
                    merchantAddFromActiveMode = true;
                    this.openMerchantAddForm(event.lnglat);
                } else if (placeLabelAddMode && event.lnglat) {
                    this.openPlaceLabelForm(event.lnglat);
                } else {
                    this.selectMerchantZone(zone.id);
                }
            });
            return polygon;
        });
        zoneNameMarkers = zones.map((zone) => {
            const label = document.createElement('button');
            label.type = 'button';
            label.className = 'merchant-zone-name-label';
            label.textContent = zone.name;
            label.setAttribute('aria-label', `编辑或删除区域：${zone.name}`);
            label.title = `编辑或删除区域“${zone.name}”`;
            const path = zone.path.slice(0, -1);
            const center = path.reduce((sum, [longitude, latitude]) => ({
                longitude: sum.longitude + longitude / path.length,
                latitude: sum.latitude + latitude / path.length
            }), { longitude: 0, latitude: 0 });
            let marker;
            label.addEventListener('click', (event) => {
                event.stopPropagation();
                if (placeLabelAddMode) {
                    this.openPlaceLabelForm(marker.getPosition());
                } else if (merchantAddMode) {
                    merchantAddZoneId = zone.id;
                    merchantAddFromActiveMode = true;
                    this.openMerchantAddForm(marker.getPosition());
                } else {
                    this.openMerchantGrid(zone.id);
                }
            });
            marker = new AMap.Marker({
                content: label,
                position: [center.longitude, center.latitude],
                anchor: 'center',
                offset: new AMap.Pixel(0, 0),
                zIndex: 80
            });
            marker.__zoneId = zone.id;
            return marker;
        });
        if (zoneMapOverlays.length) merchantMap.add(zoneMapOverlays);
        if (zoneNameMarkers.length) merchantMap.add(zoneNameMarkers);
        this.updateZoneOverlayVisibility();
    },

    selectMerchantZone(zoneId) {
        if (!zones.some((zone) => zone.id === zoneId)) return;
        activeMerchantZoneId = zoneId;
        this.closeMerchantActionMenu();
        const zone = zones.find((item) => item.id === zoneId);
        const polygon = zoneMapOverlays.find((overlay) => overlay.__zoneId === zoneId);
        if (polygon && zone) {
            const container = merchantMap.getContainer();
            const points = zone.path.slice(0, -1).map((point) =>
                merchantMap.lngLatToContainer(new AMap.LngLat(point[0], point[1])));
            const width = Math.max(...points.map((point) => point.x)) - Math.min(...points.map((point) => point.x));
            const height = Math.max(...points.map((point) => point.y)) - Math.min(...points.map((point) => point.y));
            if (width < container.clientWidth * 0.75 || height < container.clientHeight * 0.75) {
                merchantMap.setFitView([polygon], false, [100, 100, 100, 100], 20);
            }
        }
        this.scheduleMerchantLayout();
    },

    async focusZone(id) {
        if (!merchantMap) return;
        try {
            const zone = await DB.get('zones', id);
            if (!zone) {
                alert('该小区区域不存在或已删除');
                return;
            }
            await this.loadZones();
            const polygon = zoneMapOverlays.find((overlay) => overlay.__zoneId === id);
            if (!polygon) throw new Error('区域边界未能加载');
            merchantMap.setFitView([polygon], false, [72, 48, 72, 48], 20);
            this.updateMerchantMarkerVisibility();
        } catch (error) {
            alert(`定位小区区域失败：${error.message || error}`);
        }
    },

    scheduleMerchantLayout() {
        if (!merchantMap || merchantLayoutFrame !== null) return;
        merchantLayoutFrame = requestAnimationFrame(() => {
            merchantLayoutFrame = null;
            this.layoutMerchantMarkers();
        });
    },

    getMerchantZoneId(merchant) {
        const excludedZoneIds = merchant.excludedZoneIds || [];
        return zones.find((zone) => !excludedZoneIds.includes(zone.id)
            && pointIsInsideZone(merchant.position, zone))?.id ?? null;
    },

    getZonePerimeterSlots(zone, merchantCount) {
        const points = zone.path.slice(0, -1).map((point) =>
            merchantMap.lngLatToContainer(new AMap.LngLat(point[0], point[1])));
        if (points.length < 3) return [];
        const centroid = points.reduce((sum, point) => ({ x: sum.x + point.x / points.length, y: sum.y + point.y / points.length }), { x: 0, y: 0 });
        const active = zone.id === activeMerchantZoneId;
        const cardWidth = MERCHANT_CARD_WIDTH;
        const cardHeight = MERCHANT_CARD_HEIGHT;
        const cornerMargin = Math.max(cardWidth, cardHeight) / 2 + 8;
        const edges = points.map((start, index) => {
            const end = points[(index + 1) % points.length];
            const dx = end.x - start.x;
            const dy = end.y - start.y;
            const length = Math.hypot(dx, dy);
            const horizontal = Math.abs(dx) >= Math.abs(dy);
            const extent = horizontal ? cardWidth : cardHeight;
            const normalExtent = horizontal ? cardHeight : cardWidth;
            const normalSpace = horizontal
                ? Math.abs(centroid.y - (start.y + end.y) / 2) * 2
                : Math.abs(centroid.x - (start.x + end.x) / 2) * 2;
            const capacity = normalSpace < normalExtent + MERCHANT_CARD_GAP * 2
                ? 0
                : Math.max(0, Math.floor((length - cornerMargin * 2 + MERCHANT_CARD_GAP) / (extent + MERCHANT_CARD_GAP)));
            return { start, end, dx, dy, length, horizontal, extent, capacity };
        }).filter((edge) => edge.capacity > 0);
        if (!edges.length) return [];
        const top = edges.filter((edge) => edge.horizontal).sort((a, b) =>
            (a.start.y + a.end.y) - (b.start.y + b.end.y));
        const bottom = [...top].reverse();
        const left = edges.filter((edge) => !edge.horizontal).sort((a, b) =>
            (a.start.x + a.end.x) - (b.start.x + b.end.x));
        const right = [...left].reverse();
        const perimeter = [...top.slice(0, 1), ...right.slice(0, 1), ...bottom.slice(0, 1), ...left.slice(0, 1)];
        const available = [];
        perimeter.forEach((edge) => {
            const positions = Math.min(edge.capacity, merchantCount + 1);
            const occupiedLength = positions * edge.extent + Math.max(0, positions - 1) * MERCHANT_CARD_GAP;
            const firstCenterDistance = (edge.length - occupiedLength) / 2 + edge.extent / 2;
            for (let index = 0; index < positions; index += 1) {
                const distance = firstCenterDistance + index * (edge.extent + MERCHANT_CARD_GAP);
                const ratio = Math.max(0, Math.min(1, distance / edge.length));
                const x = edge.start.x + edge.dx * ratio;
                const y = edge.start.y + edge.dy * ratio;
                let nx = -edge.dy / edge.length;
                let ny = edge.dx / edge.length;
                if ((centroid.x - x) * nx + (centroid.y - y) * ny < 0) {
                    nx *= -1;
                    ny *= -1;
                }
                const inset = (edge.horizontal ? cardHeight : cardWidth) / 2 + 4;
                available.push({ x: x + nx * inset, y: y + ny * inset });
            }
        });
        return available;
    },

    layoutMerchantMarkers() {
        if (!merchantMap) return;
        const viewportHeight = this.getMerchantViewHeight();
        const markerRangeAllows = viewportHeight === null
            ? merchantMap.getZoom() >= TEXT_MARK_MIN_ZOOM
                && merchantMap.getZoom() < merchantMap.getZooms()[1]
            : viewportHeight > 0 && viewportHeight <= MERCHANT_MARKER_MAX_VIEW_HEIGHT_METERS;
        const shouldAggregateMerchants = viewportHeight !== null
            && viewportHeight > ZONE_OVERLAY_MAX_VIEW_HEIGHT_METERS
            && viewportHeight <= MERCHANT_AGGREGATE_MAX_VIEW_HEIGHT_METERS;
        const showRegions = viewportHeight !== null && viewportHeight <= ZONE_OVERLAY_MAX_VIEW_HEIGHT_METERS;
        const mapBounds = merchantMap.getContainer().getBoundingClientRect();
        const grouped = new Map();
        merchantMarkers.forEach((marker) => {
            const merchant = marker.__merchant;
            marker.setPosition(merchant.position);
            marker.__zoneId = null;
            marker.__isAggregated = false;
            marker.hide();
            if (shouldAggregateMerchants) {
                const zoneId = this.getMerchantZoneId(merchant);
                if (zoneId !== null) {
                    marker.__zoneId = zoneId;
                    if (!grouped.has(zoneId)) grouped.set(zoneId, []);
                    grouped.get(zoneId).push(marker);
                    return;
                }
            }
            marker.__zoneId = null;
            if (merchantMapHiddenMarkIds.has(merchant.markId)) return;
            if (markerRangeAllows) marker.show();
        });

        zones.forEach((zone) => {
            let aggregate = zoneAggregateMarkers.get(zone.id);
            if (!aggregate) {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'merchant-zone-aggregate';
                button.addEventListener('click', (event) => {
                    event.stopPropagation();
                    this.openMerchantZone(zone.id);
                });
                aggregate = new AMap.Marker({
                    content: button,
                    position: [zone.path[0][0], zone.path[0][1]],
                    anchor: 'center',
                    offset: new AMap.Pixel(0, 0),
                    zIndex: 150
                });
                aggregate.__zoneId = zone.id;
                zoneAggregateMarkers.set(zone.id, aggregate);
                merchantMap.add(aggregate);
            }
            aggregate.hide();
            if (!shouldAggregateMerchants) return;
            const members = grouped.get(zone.id) || [];
            const container = merchantMap.getContainer();
            const corners = zone.path.slice(0, -1).map((point) =>
                merchantMap.lngLatToContainer(new AMap.LngLat(point[0], point[1])));
            const zoneIsOnScreen = corners.some((point) => point.x >= 0 && point.x <= container.clientWidth
                && point.y >= 0 && point.y <= container.clientHeight);
            if (!members.length || !zoneIsOnScreen) return;

            members.sort((first, second) => {
                if (first.__merchant.id === selectedMerchant?.id) return -1;
                if (second.__merchant.id === selectedMerchant?.id) return 1;
                return (Number(second.__merchant.rating) || 0) - (Number(first.__merchant.rating) || 0)
                    || first.__merchant.name.localeCompare(second.__merchant.name, 'zh-CN');
            });
            const slots = this.getZonePerimeterSlots(zone, members.length);
            const tooMany = members.length > Math.min(slots.length, MERCHANT_REGION_CARD_LIMIT);
            const visibleCount = Math.min(
                members.length,
                MERCHANT_REGION_CARD_LIMIT,
                Math.max(0, slots.length - (tooMany ? 1 : 0))
            );
            let actualVisibleCount = 0;
            members.forEach((marker, index) => {
                if (!markerRangeAllows || index >= visibleCount
                    || merchantMapHiddenMarkIds.has(marker.__merchant.markId)) {
                    marker.__isAggregated = true;
                    return;
                }
                const point = slots[index];
                const pageX = mapBounds.left + point.x;
                const pageY = mapBounds.top + point.y;
                const inViewport = pageX >= mapBounds.left + MERCHANT_CARD_WIDTH / 2
                    && pageX <= mapBounds.right - MERCHANT_CARD_WIDTH / 2
                    && pageY >= mapBounds.top + MERCHANT_CARD_HEIGHT / 2
                    && pageY <= mapBounds.bottom - MERCHANT_CARD_HEIGHT / 2;
                if (!inViewport) {
                    marker.__isAggregated = true;
                    return;
                }
                marker.setPosition(merchantMap.containerToLngLat(new AMap.Pixel(point.x, point.y)));
                marker.setOffset(new AMap.Pixel(0, 0));
                marker.show();
                actualVisibleCount += 1;
            });
            const overflowCount = members.length - actualVisibleCount;
            if (overflowCount > 0) {
                const aggregateSlot = slots[visibleCount] || (() => {
                    const center = corners.reduce((sum, point) => ({ x: sum.x + point.x / corners.length, y: sum.y + point.y / corners.length }), { x: 0, y: 0 });
                    return center;
                })();
                if (aggregateSlot.x < 40 || aggregateSlot.x > container.clientWidth - 40
                    || aggregateSlot.y < 22 || aggregateSlot.y > container.clientHeight - 22) return;
                const button = aggregate.getContent();
                button.textContent = `＋ ${overflowCount}家`;
                button.setAttribute('aria-label', `查看区域内另外${overflowCount}家商家`);
                aggregate.setPosition(merchantMap.containerToLngLat(new AMap.Pixel(aggregateSlot.x, aggregateSlot.y)));
                aggregate.show();
            } else if (members.length) {
                const center = corners.reduce((sum, point) => ({ x: sum.x + point.x / corners.length, y: sum.y + point.y / corners.length }), { x: 0, y: 0 });
                if (center.x < 40 || center.x > container.clientWidth - 40
                    || center.y < 22 || center.y > container.clientHeight - 22) return;
                const button = aggregate.getContent();
                button.textContent = `${members.length}家商家`;
                button.setAttribute('aria-label', `管理区域内${members.length}家商家`);
                aggregate.setPosition(merchantMap.containerToLngLat(new AMap.Pixel(center.x, center.y)));
                aggregate.show();
            }
        });
        zoneAggregateMarkers.forEach((marker, zoneId) => {
            if (!zones.some((zone) => zone.id === zoneId)) {
                merchantMap.remove(marker);
                zoneAggregateMarkers.delete(zoneId);
            }
        });
    },

    openMerchantActionMenu(merchant, marker) {
        const menu = document.getElementById('merchantMapActionMenu');
        merchantActionTarget = merchant;
        const zoneId = marker.__zoneId ?? this.getMerchantZoneId(merchant);
        menu.dataset.zoneId = zoneId === null ? '' : String(zoneId);
        document.getElementById('merchantMapActionTitle').textContent = merchant.name || '(未命名商家)';
        menu.querySelector('[data-action="remove-zone"]').hidden = zoneId === null;
        menu.classList.remove('hidden');
    },

    closeMerchantActionMenu() {
        const menu = document.getElementById('merchantMapActionMenu');
        if (menu) menu.classList.add('hidden');
        merchantActionTarget = null;
    },

    async performMerchantMapAction(action) {
        const merchant = merchantActionTarget;
        this.closeMerchantActionMenu();
        if (!merchant) return;
        if (action === 'details') {
            merchantMapHiddenMarkIds.add(merchant.markId);
            this.selectMerchant(null);
            this.scheduleMerchantLayout();
            const mark = await DB.get('marks', merchant.markId);
            if (mark) this.openMerchantDetail(mark);
            return;
        }
        if (action === 'locate') {
            merchantMapHiddenMarkIds.delete(merchant.markId);
            await this.focusMerchantMark(merchant.markId);
            this.selectMerchant(null);
            this.scheduleMerchantLayout();
            return;
        }
        if (action === 'remove-zone') {
            const zoneId = Number(document.getElementById('merchantMapActionMenu').dataset.zoneId);
            const mark = await DB.get('marks', merchant.markId);
            if (!mark || !zones.some((zone) => zone.id === zoneId)) return;
            mark.zoneIds = (mark.zoneIds || []).filter((id) => id !== zoneId);
            mark.excludedZoneIds = [...new Set([...(mark.excludedZoneIds || []), zoneId])];
            try {
                await DB.put('marks', mark);
                await this.loadMerchantMarks();
                await this.refreshMerchantZoneList();
            } catch (error) {
                alert(`从区域移除商家失败：${error.message || error}`);
            }
            return;
        }
        if (action === 'delete') {
            if (!confirm(`确定永久删除商家“${merchant.name}”吗？`)) return;
            try {
                await DB.delete('marks', merchant.markId);
                if (selectedMerchant?.id === merchant.id) this.selectMerchant(null);
                await this.loadMerchantMarks();
                await this.refreshMerchantZoneList();
            } catch (error) {
                alert(`删除商家失败：${error.message || error}`);
            }
        }
    },

    async openMerchantZone(zoneId) {
        try {
            const zone = await DB.get('zones', zoneId);
            if (!zone) {
                alert('该小区区域不存在或已删除');
                return;
            }
            currentMerchantZone = zone;
            activeMerchantZoneId = zoneId;
            this.scheduleMerchantLayout();
            document.getElementById('merchantZoneTitle').textContent = zone.name;
            document.getElementById('merchantZoneSearch').value = '';
            document.getElementById('merchantZoneDialog').classList.remove('hidden');
            await this.refreshMerchantZoneList();
        } catch (error) {
            alert(`打开区域商家列表失败：${error.message || error}`);
        }
    },

    async refreshMerchantZoneList() {
        const zone = currentMerchantZone;
        if (!zone) return;
        try {
            const marks = (await DB.getAll('marks')).filter((mark) => mark.category === 'merchant');
            if (currentMerchantZone?.id !== zone.id) return;
            const query = document.getElementById('merchantZoneSearch').value.trim().toLocaleLowerCase();
            const zoneId = zone.id;
            const members = marks.filter((mark) => {
                return !(mark.excludedZoneIds || []).includes(zoneId)
                    && pointIsInsideZone([mark.lng, mark.lat], zone);
            })
                .filter((mark) => !query || (mark.name || '').toLocaleLowerCase().includes(query));
            this.renderMerchantZoneList(members.map((mark) => ({ mark, member: true })));
            const addButton = document.getElementById('merchantZoneAddMap');
            addButton.textContent = '＋ 在地图添加商家';
            addButton.disabled = false;
        } catch (error) {
            alert(`读取区域商家失败：${error.message || error}`);
        }
    },

    renderMerchantZoneList(entries) {
        const list = document.getElementById('merchantZoneList');
        list.replaceChildren();
        if (!entries.length) {
            const empty = document.createElement('p');
            empty.className = 'merchant-zone-empty';
            empty.textContent = '没有匹配的商家标注';
            list.appendChild(empty);
            return;
        }
        entries.forEach(({ mark, member }) => {
            const row = document.createElement('article');
            row.className = 'merchant-zone-row';
            const name = document.createElement('strong');
            name.textContent = mark.name || '(未命名商家)';
            const actions = document.createElement('div');
            actions.className = 'merchant-zone-row-actions';
            const addAction = (label, action, className = '') => {
                const button = document.createElement('button');
                button.type = 'button';
                button.textContent = label;
                button.className = className;
                button.addEventListener('click', () => this.performMerchantZoneListAction(action, mark, member));
                actions.appendChild(button);
            };
            addAction('详情', 'details');
            addAction('定位', 'locate');
            if (member) addAction('移出区域', 'remove-zone');
            addAction('删除', 'delete', 'is-danger');
            row.append(name, actions);
            list.appendChild(row);
        });
    },

    async performMerchantZoneListAction(action, mark, member) {
        if (action === 'details') {
            this.openMerchantDetail(mark);
            return;
        }
        if (action === 'locate') {
            await this.focusMerchantMark(mark.id);
            return;
        }
        if (action === 'remove-zone') {
            const zoneId = currentMerchantZone.id;
            const updated = { ...mark };
            updated.zoneIds = (mark.zoneIds || []).filter((id) => id !== zoneId);
            updated.excludedZoneIds = [...new Set([...(mark.excludedZoneIds || []), zoneId])];
            try {
                await DB.put('marks', updated);
                await this.loadMerchantMarks();
                await this.refreshMerchantZoneList();
            } catch (error) {
                alert(`更新区域商家关联失败：${error.message || error}`);
            }
            return;
        }
        if (action === 'delete') {
            if (!confirm(`确定永久删除商家“${mark.name || '(未命名商家)'}”吗？`)) return;
            try {
                await DB.delete('marks', mark.id);
                await this.loadMerchantMarks();
                await this.refreshMerchantZoneList();
            } catch (error) {
                alert(`删除商家失败：${error.message || error}`);
            }
        }
    },

    closeMerchantZone() {
        document.getElementById('merchantZoneDialog').classList.add('hidden');
        currentMerchantZone = null;
    },

    getCurrentMerchantZoneId() {
        return currentMerchantZone?.id ?? null;
    },

    startMerchantAddForZone() {
        if (!currentMerchantZone) return;
        merchantAddZoneId = currentMerchantZone.id;
        const zoneName = currentMerchantZone.name;
        this.closeMerchantZone();
        this.toggleMerchantAddMode(true);
        document.getElementById('merchantMapHint').textContent = `请在“${zoneName}”区域内点击地图选择商家位置`;
        document.getElementById('merchantMapHint').classList.remove('hidden');
    },

    closeMerchantGrid() {
        document.getElementById('merchantGridDialog').classList.add('hidden');
    },

    openMerchantGrid(zoneId) {
        DB.get('zones', zoneId).then((zone) => {
            if (!zone) {
                alert('该小区区域不存在或已删除');
                return;
            }
            currentMerchantZone = zone;
            document.getElementById('zoneGridTitle').textContent = zone.name;
            document.getElementById('zoneRenameInput').value = zone.name;
            this.renderMerchantGrid();
            document.getElementById('merchantGridDialog').classList.remove('hidden');
        }).catch((error) => alert(`读取区域网格失败：${error.message || error}`));
    },

    renderMerchantGrid() {
        if (!currentMerchantZone) return;
        const zone = currentMerchantZone;
        const rows = Math.max(1, Math.min(5, Number(zone.rows) || 1));
        const columns = Math.max(1, Math.min(15, Number(zone.columns) || 1));
        const cells = Array.isArray(zone.cells) ? zone.cells : [];
        const grid = document.getElementById('zoneMerchantGrid');
        grid.style.setProperty('--zone-columns', String(columns));
        grid.style.setProperty('--zone-rows', String(rows));
        grid.replaceChildren();
        const layerNames = ['第一层', '第二层', '第三层', '第四层', '第五层'];
        for (let row = 0; row < rows; row += 1) {
            const layer = document.createElement('span');
            layer.className = 'zone-grid-layer';
            layer.textContent = layerNames[row];
            layer.style.gridRow = String(row + 1);
            layer.style.gridColumn = '1';
            grid.appendChild(layer);
            for (let column = 0; column < columns; column += 1) {
                const cell = cells.find((item) => item.row === row && item.column === column);
                const button = document.createElement('button');
                button.type = 'button';
                button.className = `zone-merchant-cell${cell?.name ? ' has-merchant' : ''}`;
                button.dataset.row = String(row);
                button.dataset.column = String(column);
                button.style.gridRow = String(row + 1);
                button.style.gridColumn = String(column + 2);
                button.textContent = cell?.name || '+';
                button.addEventListener('click', () => this.editMerchantGridCell(row, column));
                grid.appendChild(button);
            }
        }
        document.getElementById('addZoneColumnBtn').disabled = columns >= 15;
        document.getElementById('addZoneRowBtn').disabled = rows >= 5;
    },

    async editMerchantGridCell(row, column) {
        if (!currentMerchantZone) return;
        const cell = (currentMerchantZone.cells || []).find((item) => item.row === row && item.column === column);
        const name = prompt(cell?.name ? '编辑商家名称（留空可移除）' : '添加商家名称', cell?.name || '');
        if (name === null) return;
        const cells = (currentMerchantZone.cells || []).filter((item) => item.row !== row || item.column !== column);
        if (name.trim()) cells.push({ row, column, name: name.trim().slice(0, 50) });
        await this.saveMerchantGrid({ ...currentMerchantZone, cells });
    },

    async saveMerchantGrid(updatedZone) {
        try {
            await DB.put('zones', updatedZone);
            currentMerchantZone = updatedZone;
            this.renderMerchantGrid();
            await this.loadZones();
            document.dispatchEvent(new CustomEvent('zone-data-changed'));
        } catch (error) {
            alert(`保存区域网格失败：${error.message || error}`);
        }
    },

    async changeMerchantGridSize(key, delta, max) {
        if (!currentMerchantZone) return;
        const next = Math.max(1, Math.min(max, (Number(currentMerchantZone[key]) || 1) + delta));
        await this.saveMerchantGrid({ ...currentMerchantZone, [key]: next });
    },

    async renameMerchantZone(name) {
        if (!currentMerchantZone) return;
        const cleanName = name.trim();
        if (!cleanName) {
            alert('区域名称不能为空');
            return;
        }
        try {
            const updated = { ...currentMerchantZone, name: cleanName };
            await DB.put('zones', updated);
            currentMerchantZone = updated;
            document.getElementById('zoneGridTitle').textContent = cleanName;
            document.getElementById('merchantZoneTitle').textContent = cleanName;
            await this.loadZones();
            document.dispatchEvent(new CustomEvent('zone-data-changed'));
        } catch (error) {
            alert(`修改区域名称失败：${error.message || error}`);
        }
    },

    async deleteMerchantZone() {
        if (!currentMerchantZone || !confirm(`确定删除区域“${currentMerchantZone.name}”吗？商家标注会保留。`)) return;
        try {
            await DB.delete('zones', currentMerchantZone.id);
            document.getElementById('merchantGridDialog').classList.add('hidden');
            currentMerchantZone = null;
            await this.loadZones();
            document.dispatchEvent(new CustomEvent('zone-data-changed'));
        } catch (error) {
            alert(`删除小区区域失败：${error.message || error}`);
        }
    },

    renderMerchantMarkers() {
        if (!merchantMap) return;
        if (merchantMarkers.length) merchantMap.remove(merchantMarkers);
        zoneAggregateMarkers.forEach((marker) => merchantMap.remove(marker));
        zoneAggregateMarkers.clear();
        merchantMarkerPhotoUrls.forEach((url) => URL.revokeObjectURL(url));
        merchantMarkerPhotoUrls = [];
        merchantMarkerElements.clear();
        merchantMarkersById.clear();
        merchantMarkers = visibleMerchants.map((merchant) => {
            const content = document.createElement('div');
            content.className = `merchant-map-marker${merchant.isSavedMark ? ' saved-merchant-marker' : ''}${selectedMerchant?.id === merchant.id ? ' is-selected' : ''}`;
            const photo = document.createElement('button');
            photo.type = 'button';
            photo.className = 'merchant-marker-photo';
            photo.setAttribute('aria-label', merchant.isSavedMark ? merchant.name : `${merchant.name}，${merchant.orders} 单`);
            if (merchant.photo instanceof Blob) {
                const photoUrl = URL.createObjectURL(merchant.photo);
                merchantMarkerPhotoUrls.push(photoUrl);
                const frame = document.createElement('span');
                frame.className = 'merchant-marker-photo-frame';
                const image = document.createElement('img');
                image.src = photoUrl;
                image.alt = '';
                image.addEventListener('error', () => {
                    image.replaceWith(this.createMerchantMarkerPlaceholder());
                }, { once: true });
                frame.appendChild(image);
                photo.appendChild(frame);
            } else {
                photo.appendChild(this.createMerchantMarkerPlaceholder());
            }
            content.appendChild(photo);
            const caption = document.createElement('span');
            caption.className = 'merchant-marker-name';
            caption.textContent = merchant.name;
            content.appendChild(caption);
            if (merchant.isSavedMark) {
                const menu = document.createElement('span');
                menu.className = 'merchant-marker-menu-icon';
                menu.setAttribute('aria-hidden', 'true');
                menu.textContent = '⋯';
                content.appendChild(menu);
            } else {
                const count = document.createElement('span');
                count.className = 'merchant-marker-orders';
                count.textContent = String(merchant.orders);
                content.appendChild(count);
            }
            photo.addEventListener('click', (event) => {
                event.stopPropagation();
                this.selectMerchant(null);
                const actionMenu = document.getElementById('merchantMapActionMenu');
                if (!actionMenu.classList.contains('hidden')) {
                    this.closeMerchantActionMenu();
                    return;
                }
                this.openMerchantActionMenu(merchant, marker);
            });
            merchantMarkerElements.set(merchant.id, content);
            const marker = new AMap.Marker({
                position: merchant.position,
                content,
                anchor: 'center',
                offset: new AMap.Pixel(0, 0),
                zooms: [TEXT_MARK_MIN_ZOOM, 20],
                zIndex: selectedMerchant?.id === merchant.id ? 120 : 100
            });
            marker.__merchant = merchant;
            marker.__basePosition = merchant.position;
            marker.__zoneId = null;
            merchantMarkersById.set(merchant.id, marker);
            return marker;
        });
        merchantMap.add(merchantMarkers);
        this.updateMerchantMarkerVisibility();
        this.scheduleMerchantLayout();
    },

    createMerchantMarkerPlaceholder() {
        const placeholder = document.createElement('span');
        placeholder.className = 'merchant-marker-photo-placeholder';
        placeholder.setAttribute('aria-hidden', 'true');
        placeholder.textContent = '🏪';
        return placeholder;
    },

    searchMerchants(keyword) {
        const query = keyword.trim();
        visibleMerchants = merchantCatalogue.filter((merchant) => merchant.name.includes(query) || (merchant.note || '').includes(query));
        this.sortMerchants(merchantSortMode);
    },

    openMerchantAddForm(position) {
        if (!position) return;
        if (merchantAddZoneId !== null) {
            const zone = zones.find((item) => item.id === merchantAddZoneId);
            if (zone && !pointIsInsideZone([position.getLng(), position.getLat()], zone)) {
                alert('请在所选区域边界内选择商家位置');
                return;
            }
        }
        pendingMerchantPosition = { lat: position.getLat(), lng: position.getLng() };
        newMerchantRating = 0;
        document.getElementById('merchantAddName').value = '';
        document.getElementById('merchantAddNote').value = '';
        document.getElementById('merchantAddNoteCount').textContent = '0';
        document.getElementById('merchantAddPhotoCapture').value = '';
        document.getElementById('merchantAddPhotoGallery').value = '';
        newMerchantPhoto = null;
        this.updateMerchantPhotoPreview('add', null);
        const zone = zones.find((item) => item.id === merchantAddZoneId);
        document.getElementById('merchantAddLocation').textContent =
            `${zone ? `区域：${zone.name} · ` : ''}已选择地图位置 · ${pendingMerchantPosition.lat.toFixed(6)}, ${pendingMerchantPosition.lng.toFixed(6)}`;
        this.updateNewMerchantRatingDisplay();
        document.getElementById('merchantAddDialog').classList.remove('hidden');
        document.getElementById('merchantAddName').focus();
    },

    closeMerchantAddForm() {
        const wasRegionAdd = merchantAddZoneId !== null;
        const keepAddMode = merchantAddFromActiveMode;
        document.getElementById('merchantAddDialog').classList.add('hidden');
        document.getElementById('merchantAddPhotoCapture').value = '';
        document.getElementById('merchantAddPhotoGallery').value = '';
        newMerchantPhoto = null;
        this.updateMerchantPhotoPreview('add', null);
        pendingMerchantPosition = null;
        merchantAddZoneId = null;
        merchantAddFromActiveMode = false;
        if (wasRegionAdd && merchantAddMode && !keepAddMode) this.toggleMerchantAddMode(false);
        if (wasRegionAdd) document.getElementById('merchantMapHint').classList.add('hidden');
    },

    setNewMerchantPhoto(file) {
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            alert('请选择图片文件');
            document.getElementById('merchantAddPhotoCapture').value = '';
            document.getElementById('merchantAddPhotoGallery').value = '';
            return;
        }
        if (file.size > 15 * 1024 * 1024) {
            alert('商家图片不能超过 15 MB');
            document.getElementById('merchantAddPhotoCapture').value = '';
            document.getElementById('merchantAddPhotoGallery').value = '';
            return;
        }
        newMerchantPhoto = file;
        this.updateMerchantPhotoPreview('add', file);
    },

    setCurrentMerchantPhoto(file) {
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            alert('请选择图片文件');
            document.getElementById('merchantDetailPhoto').value = '';
            return;
        }
        if (file.size > 15 * 1024 * 1024) {
            alert('商家图片不能超过 15 MB');
            document.getElementById('merchantDetailPhoto').value = '';
            return;
        }
        currentMerchantPhoto = file;
        this.updateMerchantPhotoPreview('detail', file);
    },

    updateMerchantPhotoPreview(kind, photo) {
        if (merchantPhotoPreviewUrls[kind]) {
            URL.revokeObjectURL(merchantPhotoPreviewUrls[kind]);
            merchantPhotoPreviewUrls[kind] = null;
        }
        const prefix = kind === 'add' ? 'merchantAdd' : 'merchantDetail';
        const wrap = document.getElementById(`${prefix}PhotoPreviewWrap`);
        const image = document.getElementById(`${prefix}PhotoPreview`);
        if (!(photo instanceof Blob)) {
            image.removeAttribute('src');
            wrap.hidden = true;
            return;
        }
        const url = URL.createObjectURL(photo);
        merchantPhotoPreviewUrls[kind] = url;
        image.src = url;
        wrap.hidden = false;
    },

    removeMerchantPhoto(kind) {
        if (kind === 'add') {
            newMerchantPhoto = null;
            document.getElementById('merchantAddPhotoCapture').value = '';
            document.getElementById('merchantAddPhotoGallery').value = '';
        } else {
            currentMerchantPhoto = null;
            document.getElementById('merchantDetailPhoto').value = '';
        }
        this.updateMerchantPhotoPreview(kind, null);
    },

    setNewMerchantRating(rating) {
        newMerchantRating = Math.max(1, Math.min(5, Number(rating) || 1));
        this.updateNewMerchantRatingDisplay();
    },

    updateNewMerchantRatingDisplay() {
        document.querySelectorAll('#merchantAddStars [data-rating]').forEach((button) => {
            const selected = Number(button.dataset.rating) <= newMerchantRating;
            button.classList.toggle('is-selected', selected);
            button.setAttribute('aria-pressed', String(selected));
        });
        document.getElementById('merchantAddRatingValue').textContent = newMerchantRating
            ? `${newMerchantRating} / 5 分`
            : '未评分';
    },

    async saveNewMerchant(name, note) {
        if (!pendingMerchantPosition) {
            alert('请先点击地图选择商家位置');
            return;
        }
        const merchantMark = {
            name: name.trim(),
            note: note.trim().slice(0, 50),
            category: 'merchant',
            type: 'pin',
            rating: newMerchantRating,
            photo: newMerchantPhoto,
            lat: pendingMerchantPosition.lat,
            lng: pendingMerchantPosition.lng,
            ...(merchantAddZoneId !== null ? { zoneIds: [merchantAddZoneId] } : {})
        };

        try {
            const markId = await DB.add('marks', merchantMark);
            this.closeMerchantAddForm();
            await this.loadMerchantMarks();
            const merchant = merchantCatalogue.find((item) => item.markId === markId);
            if (merchant) {
                this.selectMerchant(merchant);
                merchantMap.setZoomAndCenter(17, merchant.position, true);
                this.updateMerchantMarkerVisibility();
            }
            document.dispatchEvent(new CustomEvent('merchant-detail-saved'));
        } catch (error) {
            alert(`保存商家失败：${error.message}`);
        }
    },

    searchMerchantMarks(keyword) {
        const query = keyword.trim();
        const results = document.getElementById('merchantSearchResults');
        results.replaceChildren();

        if (!query) {
            results.hidden = true;
            return;
        }

        DB.getAll('marks').then((marks) => {
            if (document.getElementById('merchantSearchInput').value.trim() !== query) return;

            const matches = marks.filter((mark) => mark.category === 'merchant'
                && (mark.name || '').includes(query));
            if (!matches.length) {
                const empty = document.createElement('p');
                empty.className = 'merchant-search-empty';
                empty.textContent = '标注管理的商家列表中没有匹配结果';
                results.replaceChildren(empty);
                results.hidden = false;
                return;
            }

            matches.forEach((mark) => {
                const card = document.createElement('button');
                card.type = 'button';
                card.className = 'merchant-search-result';
                card.setAttribute('role', 'listitem');
                card.textContent = mark.name || '(未命名商家)';
                card.addEventListener('click', () => {
                    this.closeMerchantSearchResults();
                    this.openMerchantDetail(mark);
                });
                results.appendChild(card);
            });
            results.hidden = false;
        }).catch((error) => {
            alert(`搜索商家标注失败：${error.message}`);
        });
    },

    closeMerchantSearchResults() {
        document.getElementById('merchantSearchResults').hidden = true;
    },

    openMerchantDetail(mark) {
        if (!mark || mark.category !== 'merchant') return;
        this.selectMerchant(null);
        currentMerchantDetailMark = mark;
        currentMerchantRating = Math.max(0, Math.min(5, Number(mark.rating) || 0));
        currentMerchantPhoto = mark.photo instanceof Blob ? mark.photo : null;
        document.getElementById('merchantDetailPhoto').value = '';
        this.updateMerchantPhotoPreview('detail', currentMerchantPhoto);
        document.getElementById('merchantFullDetailName').textContent = mark.name || '(未命名商家)';
        document.getElementById('merchantFullDetailNote').value = (mark.note || '').slice(0, 50);
        document.getElementById('merchantNoteCount').textContent = String(document.getElementById('merchantFullDetailNote').value.length);
        this.updateMerchantRatingDisplay();
        document.getElementById('merchantFullDetail').hidden = false;
        document.getElementById('merchantFullDetailClose').focus();
    },

    closeMerchantDetail() {
        const markId = currentMerchantDetailMark?.id;
        document.getElementById('merchantFullDetail').hidden = true;
        currentMerchantDetailMark = null;
        currentMerchantPhoto = null;
        document.getElementById('merchantDetailPhoto').value = '';
        this.updateMerchantPhotoPreview('detail', null);
        if (markId !== undefined && merchantMapHiddenMarkIds.delete(markId)) this.scheduleMerchantLayout();
    },

    getCurrentMerchantDetailMarkId() {
        return currentMerchantDetailMark?.id ?? null;
    },

    async focusMerchantMark(markId) {
        if (!markId) return;
        if (!merchantMap) this.initMerchants();
        if (!merchantMap) return;

        const searchInput = document.getElementById('merchantSearchInput');
        searchInput.value = '';
        await this.loadMerchantMarks();
        this.resizeMerchants();
        visibleMerchants = [...merchantCatalogue];
        this.sortMerchants(merchantSortMode);
        const merchant = merchantCatalogue.find((item) => item.markId === markId);
        if (!merchant) {
            alert('商家地图中没有找到这个标注，请刷新商家标注后重试。');
            return;
        }
        this.selectMerchant(merchant);
        this.focusSelectedMerchant();
        this.updateMerchantMarkerVisibility();
    },

    setMerchantRating(rating) {
        currentMerchantRating = Math.max(1, Math.min(5, Number(rating) || 1));
        this.updateMerchantRatingDisplay();
    },

    updateMerchantRatingDisplay() {
        document.querySelectorAll('#merchantRatingStars [data-rating]').forEach((button) => {
            const selected = Number(button.dataset.rating) <= currentMerchantRating;
            button.classList.toggle('is-selected', selected);
            button.setAttribute('aria-pressed', String(selected));
        });
        document.getElementById('merchantRatingValue').textContent = currentMerchantRating
            ? `${currentMerchantRating} / 5 分`
            : '未评分';
    },

    async saveMerchantDetail() {
        if (!currentMerchantDetailMark) return;
        const mark = {
            ...currentMerchantDetailMark,
            rating: currentMerchantRating,
            photo: currentMerchantPhoto,
            note: document.getElementById('merchantFullDetailNote').value.trim().slice(0, 50)
        };

        try {
            await DB.put('marks', mark);
            currentMerchantDetailMark = mark;
            const merchant = merchantCatalogue.find((item) => item.markId === mark.id);
            if (merchant) {
                merchant.note = mark.note;
                merchant.rating = mark.rating;
                merchant.photo = mark.photo;
            }
            await this.loadMerchantMarks();
            document.dispatchEvent(new CustomEvent('merchant-detail-saved'));
            this.closeMerchantDetail();
        } catch (error) {
            alert(`保存商家详情失败：${error.message}`);
        }
    },

    sortMerchants(mode) {
        merchantSortMode = mode;
        visibleMerchants.sort((a, b) => mode === 'price'
            ? (Number(a.price) || Number.POSITIVE_INFINITY) - (Number(b.price) || Number.POSITIVE_INFINITY) || b.orders - a.orders
            : b.orders - a.orders);
        this.renderMerchantMarkers();
        if (selectedMerchant && !visibleMerchants.some((merchant) => merchant.id === selectedMerchant.id)) {
            this.selectMerchant(null);
        }
    },

    selectMerchant(merchant) {
        selectedMerchant = merchant;
        merchantMarkerElements.forEach((element, id) => {
            element.classList.toggle('is-selected', Boolean(merchant && id === merchant.id));
        });
        document.getElementById('merchantDetailCard').hidden = !merchant;
        const name = document.getElementById('merchantName');
        const favoriteButton = document.getElementById('merchantFavoriteBtn');
        if (!merchant) {
            name.textContent = '没有找到商家';
            document.getElementById('merchantDistance').textContent = '';
            document.querySelector('#merchantCardRating .merchant-card-stars').replaceChildren();
            document.querySelector('#merchantCardRating .merchant-card-rating-value').textContent = '暂无评分';
            document.getElementById('merchantBadges').replaceChildren();
            document.getElementById('merchantAvailability').textContent = '试试其他搜索关键词';
            document.getElementById('merchantPrice').textContent = '';
            document.getElementById('merchantVipPrice').textContent = '';
            document.getElementById('merchantPrice').parentElement.hidden = false;
            favoriteButton.textContent = '☆';
            favoriteButton.classList.remove('is-favorite');
            favoriteButton.setAttribute('aria-pressed', 'false');
            favoriteButton.disabled = true;
            document.getElementById('merchantNavigateBtn').disabled = true;
            document.getElementById('merchantNavigateBtn').textContent = '➤ 导航去';
            return;
        }
        name.textContent = merchant.name;
        document.getElementById('merchantDistance').textContent = merchant.distance ? `（${merchant.distance}）` : '';
        const rating = Math.max(0, Math.min(5, Math.round(Number(merchant.rating) || 0)));
        const stars = document.querySelector('#merchantCardRating .merchant-card-stars');
        stars.replaceChildren(...Array.from({ length: 5 }, (_, index) => {
            const star = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            star.setAttribute('viewBox', '0 0 24 24');
            star.setAttribute('focusable', 'false');
            if (index < rating) star.setAttribute('class', 'is-filled');
            const shape = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            shape.setAttribute('d', 'M12 2.5 14.9 8.6 21.7 9.5 16.8 14.2 18 21 12 17.7 6 21 7.2 14.2 2.3 9.5 9.1 8.6Z');
            star.appendChild(shape);
            return star;
        }));
        document.querySelector('#merchantCardRating .merchant-card-rating-value').textContent =
            rating ? `${rating}.0 / 5 分` : '暂无评分';
        const badges = document.getElementById('merchantBadges');
        badges.replaceChildren(...merchant.badges.map((label, index) => {
            const badge = document.createElement('span');
            badge.className = `merchant-badge${index === 0 ? ' featured' : ''}`;
            badge.textContent = label;
            return badge;
        }));
        document.getElementById('merchantAvailability').textContent = merchant.isSavedMark
            ? (merchant.note || '商家标注，可在标注管理中查看完整资料')
            : `余 ${merchant.available} / ${merchant.total} 个位置`;
        const priceBlock = document.getElementById('merchantPrice').parentElement;
        priceBlock.hidden = merchant.isSavedMark;
        const detailCard = document.getElementById('merchantDetailCard');
        detailCard.classList.toggle('is-location-only', merchant.isSavedMark);
        document.querySelector('.merchant-card-footer').classList.toggle('is-location-only', merchant.isSavedMark);
        document.getElementById('merchantPrice').textContent = merchant.price ? `¥${merchant.price}/度` : '';
        document.getElementById('merchantVipPrice').textContent = merchant.vipPrice ? `VIP ¥${merchant.vipPrice}` : '';
        const isFavorite = favoriteMerchantIds.has(merchant.id);
        favoriteButton.disabled = false;
        document.getElementById('merchantNavigateBtn').disabled = false;
        document.getElementById('merchantNavigateBtn').textContent = merchant.isSavedMark ? '定位商家' : '➤ 导航去';
        favoriteButton.textContent = isFavorite ? '★' : '☆';
        favoriteButton.classList.toggle('is-favorite', isFavorite);
        favoriteButton.setAttribute('aria-pressed', String(isFavorite));
    },

    toggleMerchantFavorite() {
        if (!selectedMerchant) return;
        if (favoriteMerchantIds.has(selectedMerchant.id)) favoriteMerchantIds.delete(selectedMerchant.id);
        else favoriteMerchantIds.add(selectedMerchant.id);
        this.selectMerchant(selectedMerchant);
    },

    focusSelectedMerchant() {
        if (!merchantMap || !selectedMerchant) return;
        if (selectedMerchant.isSavedMark) {
            merchantMap.setZoomAndCenter(20, selectedMerchant.position, true);
            return;
        }
        merchantMap.setZoomAndCenter(17, selectedMerchant.position);
    },

    locateMerchants() {
        if (!merchantMap) return;
        merchantMap.plugin('AMap.Geolocation', () => {
            const geolocation = new AMap.Geolocation({ enableHighAccuracy: true, timeout: 10000 });
            geolocation.getCurrentPosition((status, result) => {
                if (status === 'complete' && result.position) {
                    merchantMap.setZoomAndCenter(16, result.position);
                } else {
                    alert('定位失败，请检查浏览器定位权限');
                }
            });
        });
    },

    resizeMerchants() {
        if (!merchantMap) this.initMerchants();
        if (!merchantMap) return;

        merchantMap.resize();
        this.updateMerchantZoomLabel();
    },

    openGuiyangRegionPicker() {
        const picker = document.getElementById('merchantRegionPicker');
        picker.classList.remove('hidden');
        document.getElementById('merchantRegionStatus').textContent = '正在读取贵阳市行政区和街道…';
        this.loadGuiyangRegionTree()
            .then((city) => {
                guiYangRegionStack = [city];
                this.renderGuiyangRegions();
            })
            .catch((error) => {
                document.getElementById('merchantRegionStatus').textContent = `地区列表加载失败：${error.message}`;
            });
    },

    loadGuiyangRegionTree() {
        if (guiYangRegionTree) return Promise.resolve(guiYangRegionTree);
        if (guiYangRegionRequest) return guiYangRegionRequest;
        if (!merchantMap) return Promise.reject(new Error('商家地图尚未初始化'));

        guiYangRegionRequest = new Promise((resolve, reject) => {
            merchantMap.plugin('AMap.DistrictSearch', () => {
                const search = new AMap.DistrictSearch({
                    level: 'city',
                    subdistrict: 3,
                    extensions: 'base'
                });
                search.search('贵阳市', (status, result) => {
                    if (status !== 'complete') {
                        guiYangRegionRequest = null;
                        reject(new Error(result?.info || '高德地图行政区查询失败'));
                        return;
                    }
                    const city = result.districtList?.find((district) => district.name === '贵阳市');
                    if (!city) {
                        guiYangRegionRequest = null;
                        reject(new Error('行政区数据中没有找到贵阳市'));
                        return;
                    }
                    guiYangRegionTree = city;
                    resolve(city);
                });
            });
        });
        return guiYangRegionRequest;
    },

    renderGuiyangRegions() {
        const list = document.getElementById('merchantRegionList');
        const path = document.getElementById('merchantRegionPath');
        const backButton = document.getElementById('merchantRegionBack');
        const current = guiYangRegionStack[guiYangRegionStack.length - 1];
        const children = current.districtList || [];
        path.textContent = guiYangRegionStack.map((region) => region.name).join(' / ');
        backButton.disabled = guiYangRegionStack.length <= 1;
        document.getElementById('merchantRegionStatus').textContent = children.length
            ? `选择${guiYangRegionStack.length === 1 ? '区县' : '街道、乡镇或社区'}，可点“定位”直接前往当前区域`
            : '可定位到当前行政区域中心';

        if (!children.length) {
            list.replaceChildren();
            return;
        }
        list.replaceChildren(...children.map((region, index) => {
            const row = document.createElement('div');
            row.className = 'merchant-region-row';
            const openButton = document.createElement('button');
            openButton.type = 'button';
            openButton.className = 'merchant-region-open';
            openButton.dataset.regionAction = region.districtList?.length ? 'open' : 'locate';
            openButton.dataset.regionIndex = String(index);
            openButton.textContent = region.name;
            if (region.districtList?.length) {
                const arrow = document.createElement('span');
                arrow.className = 'merchant-region-arrow';
                arrow.textContent = '›';
                openButton.appendChild(arrow);
            }
            const locateButton = document.createElement('button');
            locateButton.type = 'button';
            locateButton.className = 'merchant-region-locate';
            locateButton.dataset.regionAction = 'locate';
            locateButton.dataset.regionIndex = String(index);
            locateButton.textContent = '定位';
            row.append(openButton, locateButton);
            return row;
        }));
    },

    getGuiyangRegion(index) {
        const current = guiYangRegionStack[guiYangRegionStack.length - 1];
        return current?.districtList?.[index] || null;
    },

    openGuiyangRegion(region) {
        if (!region.districtList?.length) {
            this.locateGuiyangRegion(region);
            return;
        }
        guiYangRegionStack.push(region);
        this.renderGuiyangRegions();
    },

    backGuiyangRegion() {
        if (guiYangRegionStack.length <= 1) return;
        guiYangRegionStack.pop();
        this.renderGuiyangRegions();
    },

    closeGuiyangRegionPicker() {
        document.getElementById('merchantRegionPicker').classList.add('hidden');
    },

    locateGuiyangRegion(region) {
        if (!merchantMap || !region.center) {
            document.getElementById('merchantRegionStatus').textContent = '该区域暂时没有可用的定位坐标';
            return;
        }
        merchantMap.setZoomAndCenter(region.level === 'street' ? 15 : 12, region.center, true);
        const names = [...guiYangRegionStack.slice(1), region].map((item) => item.name);
        const cityButton = document.getElementById('merchantCityBtn');
        const selectedRegionName = names[names.length - 1];
        cityButton.querySelector('.merchant-city-name').textContent = selectedRegionName;
        cityButton.setAttribute('aria-label', `当前区域：贵阳市${names.join('')}`);
        document.getElementById('merchantRegionPicker').classList.add('hidden');
    },

    // 定位到当前位置
    locate() {
        if (!map) return;
        map.plugin('AMap.Geolocation', () => {
            const geolocation = new AMap.Geolocation({
                enableHighAccuracy: true,
                timeout: 10000
            });
            geolocation.getCurrentPosition((status, result) => {
                if (status === 'complete' && result.position) {
                    this.updateCurrentLocationMarker(result.position);
                    map.setZoomAndCenter(16, result.position);
                } else {
                    alert('定位失败，请检查浏览器定位权限');
                }
            });
        });
    },

    // 在当前地图中心新增标注
    addMarkAtCenter() {
        if (!map) return;
        currentLatLng = map.getCenter();
        editingMarkId = null;
        showAddMarkForm('新增标注');
    },

    editMark(id) {
        DB.get('marks', id).then((mark) => {
            if (!mark) return;
            editingMarkId = id;
            currentLatLng = { lat: mark.lat, lng: mark.lng };
            showAddMarkForm('编辑标注');
        }).catch((error) => {
            alert(`读取标注失败：${error.message}`);
        });
    },

    // 重新加载所有标注到地图
    loadMarks() {
        if (!map) return;
        DB.getAll('marks').then((marks) => {
            // 清掉旧 marker
            map.remove(markers);
            markers = [];
            textMarkers = [];
            photoMarkers = [];
            entranceIconMarkers = [];
            markerPhotoUrls.forEach((url) => URL.revokeObjectURL(url));
            markerPhotoUrls = [];
            marks.filter((mark) => mark.category !== 'merchant').forEach((mark) => {
                let marker;
                if (mark.type === 'icon') {
                    const icon = entranceIcons[mark.iconKey] || entranceIcons.entrance;
                    const content = document.createElement('div');
                    content.className = 'map-entrance-icon-marker';
                    const badge = document.createElement('span');
                    badge.className = 'map-entrance-icon-badge';
                    badge.classList.toggle('is-accessible', mark.floorAccessStatus === 'can-enter');
                    badge.classList.toggle('is-restricted', mark.floorAccessStatus === 'restricted-access');
                    if (icon.image) {
                        const image = document.createElement('img');
                        image.src = icon.image;
                        image.alt = '';
                        badge.appendChild(image);
                    } else {
                        badge.textContent = icon.glyph;
                    }
                    const label = document.createElement('small');
                    label.textContent = icon.label;
                    label.classList.toggle('is-accessible', mark.floorAccessStatus === 'can-enter');
                    label.classList.toggle('is-restricted', mark.floorAccessStatus === 'restricted-access');
                    content.append(badge, label);
                    marker = new AMap.Marker({
                        position: [mark.lng, mark.lat],
                        title: mark.name,
                        content,
                        anchor: 'center',
                        offset: new AMap.Pixel(0, 0)
                    });
                    entranceIconMarkers.push(marker);
                } else if (mark.type === 'text') {
                    const content = document.createElement('div');
                    content.className = 'map-text-marker';
                    content.classList.toggle('is-accessible', mark.floorAccessStatus === 'can-enter');
                    content.classList.toggle('is-restricted', mark.floorAccessStatus === 'restricted-access');
                    const label = document.createElement('span');
                    label.className = 'map-text-marker-label';
                    label.textContent = mark.name;
                    content.appendChild(label);
                    const orderCount = Array.isArray(mark.orderRecords) ? mark.orderRecords.length : 0;
                    if (orderCount > 0) {
                        const count = document.createElement('span');
                        count.className = 'map-text-marker-orders';
                        count.textContent = `+${orderCount}`;
                        content.appendChild(count);
                    }
                    marker = new AMap.Marker({
                        position: [mark.lng, mark.lat],
                        title: mark.name,
                        content,
                        anchor: 'center',
                        offset: new AMap.Pixel(0, 0),
                        zooms: [2, 20],
                    });
                    textMarkers.push(marker);
                } else {
                    const content = document.createElement('div');
                    content.className = 'map-pin-marker';
                    const badge = document.createElement('span');
                    badge.className = 'map-pin-badge';
                    if (mark.photo instanceof Blob) {
                        const photoUrl = URL.createObjectURL(mark.photo);
                        markerPhotoUrls.push(photoUrl);
                        const image = document.createElement('img');
                        image.src = photoUrl;
                        image.alt = '';
                        badge.appendChild(image);
                        badge.classList.add('has-photo');
                    } else {
                        const pin = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                        pin.setAttribute('viewBox', '0 0 24 24');
                        pin.setAttribute('aria-hidden', 'true');
                        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                        path.setAttribute('d', 'M12 22s8-7.2 8-13a8 8 0 1 0-16 0c0 5.8 8 13 8 13Z');
                        const center = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                        center.setAttribute('cx', '12');
                        center.setAttribute('cy', '9');
                        center.setAttribute('r', '2.5');
                        pin.append(path, center);
                        badge.appendChild(pin);
                    }
                    const label = document.createElement('small');
                    label.textContent = mark.name || '(未命名)';
                    label.classList.toggle('is-accessible', mark.floorAccessStatus === 'can-enter');
                    label.classList.toggle('is-restricted', mark.floorAccessStatus === 'restricted-access');
                    badge.classList.toggle('is-accessible', mark.floorAccessStatus === 'can-enter');
                    badge.classList.toggle('is-restricted', mark.floorAccessStatus === 'restricted-access');
                    content.append(badge, label);
                    marker = new AMap.Marker({
                        position: [mark.lng, mark.lat],
                        title: mark.name,
                        content,
                        offset: new AMap.Pixel(-72, -16)
                    });
                    if (mark.photo instanceof Blob) photoMarkers.push(marker);
                }
                marker.on('click', () => showMarkPopup(mark));
                markers.push(marker);
            });
            map.add(markers);
            updateMapHeightIndicator();
        }).catch((error) => {
            alert(`读取地图标注失败：${error.message || error}`);
        });
    },

    // 切回地图页时修正尺寸
    resize() {
        if (map) {
            map.resize();
            updateMapHeightIndicator();
        }
    },

    async openMarkDetail(markId) {
        const mark = await DB.get('marks', markId);
        if (!mark) throw new Error('该标注已不存在');
        editingMarkId = mark.id;
        document.getElementById('markDetailTitle').textContent = mark.name || '(未命名)';
        document.getElementById('markDetailNote').textContent = mark.note || '暂无备注';
        const latitude = Number(mark.lat);
        const longitude = Number(mark.lng);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            throw new Error('该标注没有有效的导航坐标');
        }
        const encodedName = encodeURIComponent(mark.name || '标注位置');
        const navigationLink = document.getElementById('markDetailNavigate');
        const userAgent = navigator.userAgent;
        const isAppleMobile = /iPhone|iPad|iPod/i.test(userAgent)
            || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        if (isAppleMobile) {
            navigationLink.href = `https://maps.apple.com/?daddr=${latitude},${longitude}&dirflg=d&q=${encodedName}`;
        } else if (/Android/i.test(userAgent)) {
            navigationLink.href = `geo:0,0?q=${latitude},${longitude}(${encodedName})`;
        } else {
            navigationLink.href = `https://uri.amap.com/navigation?to=${longitude},${latitude},${encodedName}&mode=car&coordinate=gaode&callnative=0`;
        }
        document.querySelectorAll('input[name="markFloorAccess"]').forEach((input) => {
            input.checked = input.value === mark.floorAccessStatus;
        });
        const list = document.getElementById('markOrderHistoryList');
        list.replaceChildren();
        const records = Array.isArray(mark.orderRecords) ? [...mark.orderRecords] : [];
        records.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
        if (!records.length) {
            const empty = document.createElement('p');
            empty.className = 'mark-order-history-empty';
            empty.textContent = '暂无完单记录';
            list.appendChild(empty);
        } else {
            records.forEach((record) => {
                const row = document.createElement('article');
                row.className = 'mark-order-history-row';
                const details = document.createElement('div');
                details.className = 'mark-order-history-details';
                const room = document.createElement('strong');
                room.textContent = record.room;
                const date = document.createElement('small');
                date.textContent = new Date(record.createdAt).toLocaleString('zh-CN');
                details.append(room, date);
                const remove = document.createElement('button');
                remove.type = 'button';
                remove.className = 'mark-order-remove';
                remove.dataset.orderRecordId = record.id;
                remove.setAttribute('aria-label', `删除完单记录：${record.room}`);
                remove.title = '删除完单记录';
                remove.textContent = '×';
                row.append(details, remove);
                list.appendChild(row);
            });
        }
        document.getElementById('markOrderForm').hidden = true;
        document.getElementById('markOrderAddToggle').setAttribute('aria-expanded', 'false');
        document.getElementById('markPopup').classList.remove('show');
        document.getElementById('markPopup').classList.add('hidden');
        const dialog = document.getElementById('markDetailDialog');
        dialog.classList.remove('hidden');
        requestAnimationFrame(() => dialog.classList.add('show'));
    },

    async saveMarkFloorAccess(status) {
        if (!['can-enter', 'restricted-access'].includes(status) || editingMarkId === null) return;
        const mark = await DB.get('marks', editingMarkId);
        if (!mark) throw new Error('该标注已不存在');
        mark.floorAccessStatus = status;
        await DB.put('marks', mark);
        this.loadMarks();
    },

    async addMarkOrderRecord(room) {
        if (editingMarkId === null) throw new Error('未选择地图标注');
        const mark = await DB.get('marks', editingMarkId);
        if (!mark) throw new Error('该标注已不存在');
        const createdAt = new Date().toISOString();
        const record = {
            id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            room: room.trim(),
            createdAt
        };
        mark.orderRecords = [...(Array.isArray(mark.orderRecords) ? mark.orderRecords : []), record];
        await DB.put('marks', mark);
        this.loadMarks();
        await this.openMarkDetail(mark.id);
    },

    async deleteMarkOrderRecord(recordId) {
        if (editingMarkId === null) return;
        const mark = await DB.get('marks', editingMarkId);
        if (!mark) throw new Error('该标注已不存在');
        mark.orderRecords = (Array.isArray(mark.orderRecords) ? mark.orderRecords : [])
            .filter((record) => record.id !== recordId);
        await DB.put('marks', mark);
        this.loadMarks();
        await this.openMarkDetail(mark.id);
    },

    async deleteCurrentMainMapMark() {
        if (editingMarkId === null) return;
        if (!confirm('删除该标注及其完单记录？')) return;
        await DB.delete('marks', editingMarkId);
        editingMarkId = null;
        hidePopups();
        this.loadMarks();
        this.loadMerchantMarks();
        if (document.getElementById('page-marks').classList.contains('active')) {
            renderMarksList(document.getElementById('markSearch').value);
        }
    },

    closeMarkDetail() {
        const dialog = document.getElementById('markDetailDialog');
        dialog.classList.remove('show');
        dialog.classList.add('hidden');
        const popup = document.getElementById('markPopup');
        popup.classList.remove('hidden');
        popup.classList.add('show');
    }
};

function updateMarkStyleFields() {
    const selectedType = document.querySelector('input[name="markType"]:checked');
    const iconTypeOption = document.getElementById('markIconTypeOption');
    const iconOptions = document.getElementById('markIconOptions');
    const canUseIconStyle = activeMarkCategory === 'customer';
    iconTypeOption.hidden = !canUseIconStyle;
    if (!canUseIconStyle && selectedType?.value === 'icon') {
        document.querySelector('input[name="markType"][value="text"]').checked = true;
    }
    iconOptions.hidden = !canUseIconStyle
        || document.querySelector('input[name="markType"]:checked')?.value !== 'icon';
}

window.updateMarkStyleFields = updateMarkStyleFields;

window.fillMarkNameForSelectedIcon = function () {
    const selectedIcon = document.querySelector('input[name="markIcon"]:checked');
    const icon = selectedIcon ? entranceIcons[selectedIcon.value] : null;
    if (icon) document.getElementById('markName').value = icon.label;
};

// 显示新增/编辑标注表单
function showAddMarkForm(title) {
    document.getElementById('popupTitle').textContent = '';
    document.getElementById('markName').value = '';
    document.getElementById('markNote').value = '';
    document.getElementById('markPhoto').value = '';
    document.getElementById('markPhotoGallery').value = '';
    activeMarkCategory = 'customer';
    document.querySelector('input[name="markType"][value="text"]').checked = true;
    document.querySelector('input[name="markIcon"][value="entrance"]').checked = true;
    window.setMarkPhotoPreview(null);
    updateMarkStyleFields();
    if (editingMarkId !== null) {
        DB.get('marks', editingMarkId).then((mark) => {
            if (mark) {
                document.getElementById('markName').value = mark.name || '';
                document.getElementById('markNote').value = mark.note || '';
                activeMarkCategory = mark.category === 'merchant' ? 'merchant' : 'customer';
                const markType = ['text', 'icon'].includes(mark.type) ? mark.type : 'pin';
                document.querySelector(`input[name="markType"][value="${markType}"]`).checked = true;
                const iconKey = entranceIcons[mark.iconKey] ? mark.iconKey : 'entrance';
                document.querySelector(`input[name="markIcon"][value="${iconKey}"]`).checked = true;
                window.setMarkPhotoPreview(mark.photo || null);
                updateMarkStyleFields();
            }
        });
    }
    document.getElementById('addMarkTitle').textContent = title || '新增标注';
    const form = document.getElementById('addMarkForm');
    form.classList.remove('hidden');
    form.classList.add('show');
}

// 显示标注详情弹窗
function showMarkPopup(mark) {
    editingMarkId = mark.id;
    document.getElementById('popupTitle').textContent = mark.name || '(未命名)';
    document.getElementById('popupDesc').textContent = mark.note || '（无备注）';
    const viewPhotoButton = document.getElementById('popupViewPhoto');
    const hasPinPhoto = mark.type !== 'text' && mark.type !== 'icon' && mark.photo instanceof Blob;
    viewPhotoButton.hidden = !hasPinPhoto;
    document.querySelector('#markPopup .popup-content').classList.toggle('has-view-photo', hasPinPhoto);
    const popup = document.getElementById('markPopup');
    popup.classList.remove('hidden');
    popup.classList.add('show');
}

function hidePopups() {
    ['markPopup', 'addMarkForm'].forEach((id) => {
        const el = document.getElementById(id);
        el.classList.add('hidden');
        el.classList.remove('show');
    });
    const detailDialog = document.getElementById('markDetailDialog');
    detailDialog.classList.add('hidden');
    detailDialog.classList.remove('show');
}
