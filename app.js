// 应用主逻辑：页面切换、各功能页的事件绑定
(function () {
    const $ = (id) => document.getElementById(id);
    const getLocalDateString = (date = new Date()) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    const markPhotoObjectUrls = new Set();
    let selectedMarkPhoto = null;
    let markPhotoPreviewUrl = null;
    let photoViewerObjectUrl = null;
    let markCategoryFilter = 'customer';
    let markRegionRenderVersion = 0;

    function setMarkPhotoPreview(photo) {
        selectedMarkPhoto = photo;
        const preview = $('markPhotoPreview');
        const previewWrap = $('markPhotoPreviewWrap');
        if (markPhotoPreviewUrl) URL.revokeObjectURL(markPhotoPreviewUrl);
        markPhotoPreviewUrl = null;
        if (!photo) {
            preview.removeAttribute('src');
            previewWrap.classList.add('hidden');
            return;
        }
        markPhotoPreviewUrl = URL.createObjectURL(photo);
        preview.src = markPhotoPreviewUrl;
        previewWrap.classList.remove('hidden');
    }

    window.setMarkPhotoPreview = setMarkPhotoPreview;

    function openPhotoViewer(src, ownedObjectUrl = null) {
        if (photoViewerObjectUrl) URL.revokeObjectURL(photoViewerObjectUrl);
        photoViewerObjectUrl = ownedObjectUrl;
        $('photoViewerImage').src = src;
        $('photoViewer').classList.remove('hidden');
        $('photoViewer').setAttribute('aria-hidden', 'false');
    }

    window.openMarkPhotoViewer = (photo) => {
        if (!(photo instanceof Blob)) throw new Error('标注照片不可用');
        const objectUrl = URL.createObjectURL(photo);
        openPhotoViewer(objectUrl, objectUrl);
    };

    function closePhotoViewer() {
        $('photoViewer').classList.add('hidden');
        $('photoViewer').setAttribute('aria-hidden', 'true');
        $('photoViewerImage').removeAttribute('src');
        if (photoViewerObjectUrl) URL.revokeObjectURL(photoViewerObjectUrl);
        photoViewerObjectUrl = null;
    }

    $('markPhotoPreview').addEventListener('click', () => {
        if (markPhotoPreviewUrl) openPhotoViewer(markPhotoPreviewUrl);
    });
    $('markPhotoPreview').addEventListener('keydown', (event) => {
        if ((event.key === 'Enter' || event.key === ' ') && markPhotoPreviewUrl) {
            event.preventDefault();
            openPhotoViewer(markPhotoPreviewUrl);
        }
    });

    $('photoViewer').addEventListener('click', (event) => {
        if (event.target === $('photoViewer') || event.target === $('photoViewerClose')) closePhotoViewer();
    });
    $('photoViewerClose').addEventListener('click', closePhotoViewer);
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !$('photoViewer').classList.contains('hidden')) closePhotoViewer();
    });

    function handleMarkPhotoChange(event) {
        const input = event.currentTarget;
        const photo = input.files[0];
        if (photo && !photo.type.startsWith('image/')) {
            alert('请选择图片文件');
            input.value = '';
            return;
        }
        if (photo && photo.size > 15 * 1024 * 1024) {
            alert('图片不能超过 15 MB');
            input.value = '';
            return;
        }
        if (!photo) return;
        const otherInput = input.id === 'markPhoto' ? $('markPhotoGallery') : $('markPhoto');
        otherInput.value = '';
        setMarkPhotoPreview(photo);
    }

    $('markPhoto').addEventListener('change', handleMarkPhotoChange);
    $('markPhotoGallery').addEventListener('change', handleMarkPhotoChange);

    $('markPhotoCapture').addEventListener('click', () => $('markPhoto').click());
    $('markPhotoGalleryBtn').addEventListener('click', () => $('markPhotoGallery').click());

    $('markPhotoRemove').addEventListener('click', () => {
        $('markPhoto').value = '';
        $('markPhotoGallery').value = '';
        setMarkPhotoPreview(null);
    });

    const safetyHintLayer = $('safetyHintLayer');
    if (safetyHintLayer) {
        const safetyHintImage = safetyHintLayer.querySelector('.safety-hint-image');
        const safetyHintFallback = 'assets/images/assets-id-ScreenShot_2026-10-02_181613_608.png';
        const safetyHintImages = [
            'assets/images/safety-hint-1.jpg',
            'assets/images/safety-hint-2.png',
            'assets/images/safety-hint-3.png',
            'assets/images/safety-hint-4.png',
            'assets/images/safety-hint-10.jpg'
        ];
        if (safetyHintImage) {
            safetyHintImage.onerror = () => {
                safetyHintImage.onerror = null;
                safetyHintImage.src = safetyHintFallback;
            };
            safetyHintImage.src = safetyHintImages[Math.floor(Math.random() * safetyHintImages.length)];
        }
        requestAnimationFrame(() => {
            safetyHintLayer.classList.add('is-open');
            safetyHintLayer.setAttribute('aria-hidden', 'false');
        });
        const dismissSafetyHint = () => {
            if (!safetyHintLayer.classList.contains('is-open')) return;
            if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
            safetyHintLayer.classList.remove('is-open');
            safetyHintLayer.setAttribute('aria-hidden', 'true');
        };
        $('safetyHintDismiss').addEventListener('click', dismissSafetyHint);
    }

    // ---------- 页面切换 ----------
    const pages = ['map', 'merchants', 'level', 'records', 'marks', 'settings'];

    function switchPage(name) {
        pages.forEach((p) => {
            const el = $('page-' + p);
            if (el) el.classList.toggle('active', p === name);
        });
        document.querySelectorAll('.nav-item').forEach((a) => {
            a.classList.toggle('active', a.dataset.page === name);
        });
        if (name === 'map') MapModule.resize();
        if (name === 'merchants') MapModule.resizeMerchants();
        if (name === 'level') renderLevelChart();
        if (name === 'records') renderRecords();
        if (name === 'marks') renderMarksList('');
        if (name === 'settings') refreshStorageInfo();
    }

    document.querySelectorAll('.nav-item').forEach((a) => {
        a.addEventListener('click', (e) => {
            e.preventDefault();
            const enteringMarks = a.dataset.page === 'marks' && !$('page-marks').classList.contains('active');
            switchPage(a.dataset.page);
            if (enteringMarks) history.pushState({ riderPage: 'marks' }, '', location.href);
            closeDrawer();
        });
    });

    // ---------- 抽屉菜单 ----------
    function openDrawer() {
        $('drawer').classList.add('open');
        $('drawerMask').classList.add('show');
    }
    function closeDrawer() {
        $('drawer').classList.remove('open');
        $('drawerMask').classList.remove('show');
    }

    window.addEventListener('popstate', () => {
        if (!$('page-marks').classList.contains('active')) return;
        if ($('drawer').classList.contains('open')) {
            closeDrawer();
            return;
        }
        openDrawer();
        history.pushState({ riderPage: 'marks-drawer' }, '', location.href);
    });

    $('menuBtn').addEventListener('click', openDrawer);
    $('drawerMask').addEventListener('click', closeDrawer);
    $('mapLocateBtn').addEventListener('click', () => MapModule.locate());
    $('addMarkBtn').addEventListener('click', () => MapModule.toggleMainMapAddMode());
    $('mapZoomInBtn').addEventListener('click', () => MapModule.zoomIn());
    $('mapZoomOutBtn').addEventListener('click', () => MapModule.zoomOut());
    $('mainMapRectangleStartBtn').addEventListener('click', () => MapModule.startMainMapRectangleDrawing());
    $('mainMapPolygonStartBtn').addEventListener('click', () => MapModule.startMainMapRectangleDrawing('polygon'));
    $('mainMapRectangleFinishBtn').addEventListener('click', () => MapModule.finishMainMapRectangleDrawing());
    $('mainMapRectangleCancelBtn').addEventListener('click', () => MapModule.cancelMainMapRectangleDrawing());
    $('mainMapZoneNameClose').addEventListener('click', () => MapModule.closeMainMapZoneNameDialog());
    $('mainMapZoneNameCancel').addEventListener('click', () => MapModule.closeMainMapZoneNameDialog());
    $('mainMapZoneNameDialog').addEventListener('click', (event) => {
        if (event.target === $('mainMapZoneNameDialog')) MapModule.closeMainMapZoneNameDialog();
    });
    $('mainMapZoneNameForm').addEventListener('submit', (event) => {
        event.preventDefault();
        MapModule.saveMainMapRectangle($('mainMapZoneNameInput').value);
    });
    $('mainMapZoneManagerClose').addEventListener('click', () => MapModule.closeMainMapZoneManager());
    $('mainMapZoneManagerDialog').addEventListener('click', (event) => {
        if (event.target === $('mainMapZoneManagerDialog')) MapModule.closeMainMapZoneManager();
    });
    $('mainMapZoneManagerSave').addEventListener('click', () => {
        MapModule.saveMainMapZoneName($('mainMapZoneManagerName').value);
    });
    $('mainMapZoneDeleteBtn').addEventListener('click', () => MapModule.deleteMainMapZone());
    document.querySelectorAll('input[name="mainMapZoneStatus"]').forEach((input) => {
        input.addEventListener('change', (event) => MapModule.setMainMapZoneStatus(event.target.value));
    });
    $('merchantSearchInput').addEventListener('input', (event) => {
        MapModule.searchMerchants(event.target.value);
        MapModule.searchMerchantMarks(event.target.value);
    });
    document.addEventListener('click', (event) => {
        if (!event.target.closest('.merchant-search-bar') && !event.target.closest('#merchantSearchResults')) {
            MapModule.closeMerchantSearchResults();
        }
    });
    $('merchantCityBtn').addEventListener('click', () => MapModule.openGuiyangRegionPicker());
    $('merchantAddModeBtn').addEventListener('click', () => MapModule.toggleMerchantAddMode());
    $('placeLabelModeBtn').addEventListener('click', () => MapModule.togglePlaceLabelAddMode());
    $('placeLabelClose').addEventListener('click', () => MapModule.closePlaceLabelForm());
    $('placeLabelCancel').addEventListener('click', () => MapModule.closePlaceLabelForm());
    $('placeLabelDelete').addEventListener('click', () => MapModule.deletePlaceLabel());
    $('placeLabelDialog').addEventListener('click', (event) => {
        if (event.target === $('placeLabelDialog')) MapModule.closePlaceLabelForm();
    });
    $('placeLabelForm').addEventListener('submit', (event) => {
        event.preventDefault();
        MapModule.savePlaceLabel($('placeLabelName').value, $('placeLabelLevel').value);
    });
    $('drawPolygonBtn').addEventListener('click', () => MapModule.startZoneDrawing('polygon'));
    $('drawRectangleBtn').addEventListener('click', () => MapModule.startZoneDrawing('rectangle'));
    $('finishZoneDrawBtn').addEventListener('click', () => MapModule.finishZoneDrawing());
    $('cancelZoneDrawBtn').addEventListener('click', () => MapModule.cancelZoneDrawing());
    $('zoneNameClose').addEventListener('click', () => MapModule.saveNewZone($('zoneNameInput').value));
    $('zoneNameCancel').addEventListener('click', () => MapModule.closeZoneNameDialog());
    $('zoneNameDialog').addEventListener('click', (event) => {
        if (event.target === $('zoneNameDialog')) MapModule.saveNewZone($('zoneNameInput').value);
    });
    $('zoneNameForm').addEventListener('submit', (event) => {
        event.preventDefault();
        MapModule.saveNewZone($('zoneNameInput').value);
    });
    $('merchantZoneClose').addEventListener('click', () => MapModule.closeMerchantZone());
    $('merchantZoneSearch').addEventListener('input', () => MapModule.refreshMerchantZoneList());
    $('merchantZoneAddMap').addEventListener('click', () => MapModule.startMerchantAddForZone());
    $('merchantZoneManageGrid').addEventListener('click', () => {
        if (MapModule.getCurrentMerchantZoneId) MapModule.openMerchantGrid(MapModule.getCurrentMerchantZoneId());
    });
    $('merchantMapActionMenu').addEventListener('click', (event) => {
        const button = event.target.closest('[data-action]');
        if (button) MapModule.performMerchantMapAction(button.dataset.action);
    });
    $('merchantGridClose').addEventListener('click', () => MapModule.closeMerchantGrid());
    $('zoneRenameSave').addEventListener('click', () => MapModule.renameMerchantZone($('zoneRenameInput').value));
    $('zoneDeleteBtn').addEventListener('click', () => MapModule.deleteMerchantZone());
    $('addZoneColumnBtn').addEventListener('click', () => MapModule.changeMerchantGridSize('columns', 1, 15));
    $('addZoneRowBtn').addEventListener('click', () => MapModule.changeMerchantGridSize('rows', 1, 5));
    $('placeLabelLevelButton').addEventListener('click', () => {
        const options = $('placeLabelLevelOptions');
        const isOpen = options.classList.toggle('hidden') === false;
        $('placeLabelLevelButton').setAttribute('aria-expanded', String(isOpen));
    });
    $('placeLabelLevelOptions').addEventListener('click', (event) => {
        const option = event.target.closest('[data-place-level]');
        if (!option) return;
        $('placeLabelLevel').value = option.dataset.placeLevel;
        $('placeLabelLevelValue').textContent = option.textContent;
        $('placeLabelLevelOptions').querySelectorAll('[role="option"]').forEach((item) => {
            item.setAttribute('aria-selected', String(item === option));
        });
        $('placeLabelLevelOptions').classList.add('hidden');
        $('placeLabelLevelButton').setAttribute('aria-expanded', 'false');
    });
    $('merchantRegionBack').addEventListener('click', () => MapModule.backGuiyangRegion());
    $('merchantRegionClose').addEventListener('click', () => MapModule.closeGuiyangRegionPicker());
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            if (!$('markDetailDialog').classList.contains('hidden')) MapModule.closeMarkDetail();
            MapModule.closeMerchantDetail();
            MapModule.closeGuiyangRegionPicker();
            MapModule.closeMerchantAddForm();
            MapModule.closePlaceLabelForm();
            MapModule.closeZoneNameDialog();
            MapModule.cancelZoneDrawing();
            MapModule.closeMerchantZone();
            MapModule.closeMerchantActionMenu();
            $('merchantGridDialog').classList.add('hidden');
            MapModule.cancelMainMapRectangleDrawing();
            MapModule.closeMainMapZoneNameDialog();
            MapModule.closeMainMapZoneManager();
        }
    });
    $('merchantAddClose').addEventListener('click', () => MapModule.closeMerchantAddForm());
    $('merchantAddCancel').addEventListener('click', () => MapModule.closeMerchantAddForm());
    $('merchantAddDialog').addEventListener('click', (event) => {
        if (event.target === $('merchantAddDialog')) MapModule.closeMerchantAddForm();
    });
    $('merchantAddNote').addEventListener('input', (event) => {
        $('merchantAddNoteCount').textContent = String(event.target.value.length);
    });
    $('merchantAddPhotoCaptureBtn').addEventListener('click', () => $('merchantAddPhotoCapture').click());
    $('merchantAddPhotoGalleryBtn').addEventListener('click', () => $('merchantAddPhotoGallery').click());
    $('merchantAddPhotoCapture').addEventListener('change', (event) => {
        MapModule.setNewMerchantPhoto(event.target.files[0]);
    });
    $('merchantAddPhotoGallery').addEventListener('change', (event) => {
        MapModule.setNewMerchantPhoto(event.target.files[0]);
    });
    $('merchantAddPhotoRemove').addEventListener('click', () => MapModule.removeMerchantPhoto('add'));
    $('merchantAddStars').addEventListener('click', (event) => {
        const button = event.target.closest('[data-rating]');
        if (button) MapModule.setNewMerchantRating(button.dataset.rating);
    });
    $('merchantAddForm').addEventListener('submit', (event) => {
        event.preventDefault();
        MapModule.saveNewMerchant($('merchantAddName').value, $('merchantAddNote').value);
    });
    $('merchantFullDetailClose').addEventListener('click', () => MapModule.closeMerchantDetail());
    $('merchantFullDetailView').addEventListener('click', () => {
        const merchantMarkId = MapModule.getCurrentMerchantDetailMarkId();
        if (merchantMarkId === null) return;
        MapModule.closeMerchantDetail();
        switchPage('merchants');
        requestAnimationFrame(() => MapModule.focusMerchantMark(merchantMarkId));
    });
    $('merchantFullDetailSave').addEventListener('click', () => MapModule.saveMerchantDetail());
    $('merchantDetailPhotoBtn').addEventListener('click', () => $('merchantDetailPhoto').click());
    $('merchantDetailPhoto').addEventListener('change', (event) => {
        MapModule.setCurrentMerchantPhoto(event.target.files[0]);
    });
    $('merchantDetailPhotoView').addEventListener('click', () => {
        const image = $('merchantDetailPhotoPreview');
        if (image.src) openPhotoViewer(image.src);
    });
    $('merchantDetailPhotoRemove').addEventListener('click', () => MapModule.removeMerchantPhoto('detail'));
    $('merchantFullDetailNote').addEventListener('input', (event) => {
        $('merchantNoteCount').textContent = String(event.target.value.length);
    });
    $('merchantRatingStars').addEventListener('click', (event) => {
        const button = event.target.closest('[data-rating]');
        if (button) MapModule.setMerchantRating(button.dataset.rating);
    });
    document.addEventListener('merchant-detail-saved', () => {
        if ($('page-marks').classList.contains('active')) renderMarksList($('markSearch').value);
    });
    $('merchantRegionList').addEventListener('click', (event) => {
        const button = event.target.closest('[data-region-action]');
        if (!button) return;
        const region = MapModule.getGuiyangRegion(Number(button.dataset.regionIndex));
        if (!region) return;
        if (button.dataset.regionAction === 'open') MapModule.openGuiyangRegion(region);
        else MapModule.locateGuiyangRegion(region);
    });
    $('merchantSortBtn').addEventListener('click', () => {
        const menu = $('merchantSortMenu');
        const isOpen = menu.classList.toggle('hidden') === false;
        $('merchantSortBtn').setAttribute('aria-expanded', String(isOpen));
    });
    $('merchantSortMenu').addEventListener('click', (event) => {
        const button = event.target.closest('[data-merchant-sort]');
        if (!button) return;
        MapModule.sortMerchants(button.dataset.merchantSort);
        $('merchantSortMenu').classList.add('hidden');
        $('merchantSortBtn').setAttribute('aria-expanded', 'false');
    });
    $('merchantLocateBtn').addEventListener('click', () => MapModule.locateMerchants());
    $('merchantMapToolsExpandBtn').addEventListener('click', () => {
        $('merchantMapTools').classList.remove('is-collapsed');
        $('merchantMapToolsExpandBtn').classList.add('hidden');
        $('merchantMapToolsExpandBtn').setAttribute('aria-expanded', 'true');
    });
    $('merchantMapToolsCollapseBtn').addEventListener('click', () => {
        $('merchantMapTools').classList.add('is-collapsed');
        $('merchantMapToolsExpandBtn').classList.remove('hidden');
        $('merchantMapToolsExpandBtn').setAttribute('aria-expanded', 'false');
    });
    $('merchantZoomInBtn').addEventListener('click', (event) => {
        event.stopPropagation();
        MapModule.stepMerchantZoom(-1);
    });
    $('merchantZoomOutBtn').addEventListener('click', (event) => {
        event.stopPropagation();
        MapModule.stepMerchantZoom(1);
    });
    $('merchantFavoriteBtn').addEventListener('click', () => MapModule.toggleMerchantFavorite());
    $('merchantNavigateBtn').addEventListener('click', () => MapModule.focusSelectedMerchant());

    // ---------- 等级录入 ----------
    function calcLevel(total) {
        if (total <= 70) return '青铜';
        if (total <= 90) return '白银';
        if (total <= 100) return '黄金';
        if (total <= 110) return '砖石';
        if (total <= 120) return '王者';
        return '最强王者';
    }

    function updateCurrentLevelPreview() {
        const scoreIds = ['activeScore', 'serviceScore', 'contributeScore', 'safeScore'];
        const hasScore = scoreIds.some((id) => $(id).value !== '');
        const total = scoreIds.reduce((sum, id) => sum + (Number($(id).value) || 0), 0);
        const rank = total <= 160 ? calcLevel(total) : '';
        $('levelCurrentScore').innerHTML = `${total}<small> / 160</small>`;
        $('levelCurrentRank').textContent = total > 160
            ? '超过最高分'
            : hasScore ? rank : '填写分数后显示';
        document.querySelectorAll('[data-level-tier]').forEach((tier) => {
            tier.classList.toggle('is-current', hasScore && tier.dataset.levelTier === rank);
        });
        $('levelCurrentScore').classList.toggle('is-over-limit', total > 160);
    }

    ['activeScore', 'serviceScore', 'contributeScore', 'safeScore'].forEach((id) => {
        $(id).addEventListener('input', updateCurrentLevelPreview);
    });
    updateCurrentLevelPreview();

    $('saveLevel').addEventListener('click', async () => {
        const date = $('levelDate').value;
        if (!date) return alert('请选择日期');
        const scores = ['activeScore', 'serviceScore', 'contributeScore', 'safeScore']
            .map((id) => Number($(id).value) || 0);
        if (scores.some((score) => !Number.isInteger(score) || score < 0)) {
            return alert('各项分数必须是 0 或以上的整数');
        }
        const total = scores.reduce((sum, score) => sum + score, 0);
        if (total > 160) return alert('综合总分不能超过 160 分');
        const data = {
            date,
            active: scores[0],
            service: scores[1],
            contribute: scores[2],
            safe: scores[3]
        };
        data.total = total;
        data.level = calcLevel(data.total);
        try {
            await DB.put('levels', data);
            const box = $('levelResult');
            box.classList.remove('hidden');
            const tiers = [
                { name: '青铜', range: '0–70' },
                { name: '白银', range: '71–90' },
                { name: '黄金', range: '91–100' },
                { name: '砖石', range: '101–110' },
                { name: '王者', range: '111–120' },
                { name: '最强王者', range: '121–160' }
            ];
            box.innerHTML = `
                <div class="level-result-date">${date} · 成长记录已保存</div>
                <div class="level-result-main">
                    <div class="level-current-image">
                        <img src="assets/images/assets-dengji-wz-g6.png" alt="当前等级徽章">
                    </div>
                    <div class="level-result-summary">
                        <div class="level-result-score"><span>综合总分</span><strong>${data.total}<small> / 160</small></strong></div>
                        <div class="level-result-badge"><span>当前等级 · 段位</span><b>${data.level}</b></div>
                    </div>
                </div>
                <div class="level-tier-list" aria-label="段位分数范围">${tiers.map(({ name, range }) => `
                    <span class="${name === data.level ? 'is-current' : ''}">${name}<small>${range} 分</small></span>
                `).join('')}</div>
                <div class="level-result-footer"><span>活跃 ${data.active}</span><span>服务 ${data.service}</span><span>贡献 ${data.contribute}</span><span>安全 ${data.safe}</span></div>`;
            renderLevelChart();
        } catch (err) {
            alert('保存失败：' + err);
        }
    });

    function renderLevelChart() {
        DB.getAll('levels').then((list) => {
            list.sort((a, b) => a.date.localeCompare(b.date));
            const box = $('levelChart');
            const recent = list.slice(-2).reverse();
            const dimensions = [
                { key: 'active', label: '活跃分' },
                { key: 'service', label: '服务分' },
                { key: 'contribute', label: '贡献分' },
                { key: 'safe', label: '安全分' }
            ];
            const heading = `
                <div class="level-radar-heading">
                    <h3>等级多维对比</h3>
                    <span>最近 ${Math.min(list.length, 2)} 次记录 · 四项指标</span>
                </div>`;
            if (!list.length) {
                box.innerHTML = `${heading}<p class="level-radar-empty">暂无等级记录，保存后显示四项指标对比</p>`;
                return;
            }
            const maxDimensionScore = Math.max(
                ...recent.flatMap((record) => dimensions.map(({ key }) => Number(record[key]) || 0)),
                100
            );
            const scaleMax = Math.ceil(maxDimensionScore / 25) * 25;
            const center = { x: 180, y: 158 };
            const radius = 98;
            const angles = dimensions.map((_, index) => -Math.PI / 2 + index * Math.PI / 2);
            const getPoint = (angle, value) => {
                const distance = radius * Math.max(0, Math.min(value, 1));
                return {
                    x: center.x + Math.cos(angle) * distance,
                    y: center.y + Math.sin(angle) * distance
                };
            };
            const polygonPoints = (values) => values.map((value, index) => {
                const point = getPoint(angles[index], value / scaleMax);
                return `${point.x},${point.y}`;
            }).join(' ');
            const grid = Array.from({ length: 12 }, (_, index) => {
                const ratio = (index + 1) / 12;
                const scaleLabel = (index + 1) % 3 === 0
                    ? `<text class="level-radar-scale" x="${center.x + 5}" y="${center.y - radius * ratio - 3}">${Math.round(scaleMax * ratio)}</text>`
                    : '';
                return `
                <circle class="level-radar-grid" cx="${center.x}" cy="${center.y}" r="${radius * ratio}" />
                ${scaleLabel}
            `;
            }).join('');
            const axes = angles.map((angle) => {
                const point = getPoint(angle, 1);
                return `<line class="level-radar-axis" x1="${center.x}" y1="${center.y}" x2="${point.x}" y2="${point.y}" />`;
            }).join('');
            const labelPositions = [
                { x: center.x, y: 26, anchor: 'middle' },
                { x: 304, y: center.y + 4, anchor: 'start' },
                { x: center.x, y: 303, anchor: 'middle' },
                { x: 56, y: center.y + 4, anchor: 'end' }
            ];
            const labels = dimensions.map(({ label }, index) => `
                <text class="level-radar-label" x="${labelPositions[index].x}" y="${labelPositions[index].y}" text-anchor="${labelPositions[index].anchor}">${label}</text>
            `).join('');
            const series = recent.map((record, index) => {
                const values = dimensions.map(({ key }) => Number(record[key]) || 0);
                const date = record.date;
                const markers = values.map((value, dimensionIndex) => {
                    const point = getPoint(angles[dimensionIndex], value / scaleMax);
                    return `<circle class="level-radar-point" cx="${point.x}" cy="${point.y}" r="3.5"><title>${date} ${dimensions[dimensionIndex].label}：${value}</title></circle>`;
                }).join('');
                return `<g class="level-radar-series ${index === 0 ? 'is-latest' : 'is-previous'}">
                    <polygon points="${polygonPoints(values)}" />
                    ${markers}
                </g>`;
            }).join('');
            const legend = recent.map((record, index) => `
                <span class="level-radar-legend-item ${index === 0 ? 'is-latest' : 'is-previous'}">
                    <i aria-hidden="true"></i>${index === 0 ? '最近' : '上次'} · ${record.date}
                </span>
            `).join('');
            const tableRows = dimensions.map(({ key, label }) => `
                <tr><th scope="row">${label}</th>${recent.map((record) => `<td>${Number(record[key]) || 0}</td>`).join('')}</tr>
            `).join('');
            const tableHeaders = recent.map((record, index) => `
                <th scope="col">${index === 0 ? '最近' : '上次'}<br>${record.date.slice(5).replace('-', '/')}</th>
            `).join('');

            box.innerHTML = `${heading}
                <div class="level-radar-legend">${legend}</div>
                <svg class="level-radar-svg" viewBox="0 0 360 320" role="img" aria-label="最近 ${recent.length} 次等级记录的活跃分、服务分、贡献分、安全分雷达对比图">
                    ${grid}
                    ${axes}
                    ${series}
                    ${labels}
                </svg>
                <table class="level-radar-table">
                    <thead><tr><th scope="col">指标</th>${tableHeaders}</tr></thead>
                    <tbody>${tableRows}</tbody>
                </table>`;
        }).catch((error) => alert(`读取等级记录失败：${error.message || error}`));
    }

    // ---------- 跑单记录 ----------
    $('saveRecord').addEventListener('click', async () => {
        const date = $('recordDate').value;
        if (!date) return alert('请选择日期');
        const count = Number($('orderCount').value) || 0;
        const income = Number($('orderIncome').value) || 0;
        const hours = Number($('onlineHours').value) || 0;
        if (!Number.isInteger(count) || count < 0) {
            return alert('完成单量必须是 0 或以上的整数');
        }
        if (![income, hours].every(Number.isFinite) || income < 0 || hours < 0) {
            return alert('收入和在线时长必须是 0 或以上的有效数字');
        }
        const data = {
            date,
            count,
            income,
            hours
        };
        try {
            await DB.put('records', data);
            renderRecords();
            $('orderCount').value = '';
            $('orderIncome').value = '';
            $('onlineHours').value = '';
        } catch (err) {
            alert('保存失败：' + err);
        }
    });

    function renderRecords() {
        DB.getAll('records').then((list) => {
            renderRecordTrend(list);
            list.sort((a, b) => b.date.localeCompare(a.date));
            const box = $('recordList');
            if (!list.length) {
                box.innerHTML = '<p style="color:#999;font-size:13px;">暂无跑单记录。</p>';
                return;
            }
            box.innerHTML = list
                .map(
                    (r) => `<div class="record-history-card">
                        <div class="record-history-date">
                            <strong>${r.date.slice(8, 10)}</strong>
                            <span>${r.date.slice(0, 7).replace('-', ' / ')}</span>
                        </div>
                        <div class="record-history-stats">
                            <span><strong>${r.count}</strong> 单</span>
                            <span><strong>¥${r.income.toFixed(2)}</strong></span>
                            <span><strong>${r.hours}</strong> 小时</span>
                            <small>单均 ${(r.count ? r.income / r.count : 0).toFixed(2)} 元 · 时薪 ${(r.hours ? r.income / r.hours : 0).toFixed(2)} 元</small>
                        </div>
                        <button class="record-delete-btn" type="button" data-del-record="${r.date}" aria-label="删除 ${r.date} 跑单记录">×</button>
                    </div>`
                )
                .join('');
            box.querySelectorAll('[data-del-record]').forEach((btn) => {
                btn.addEventListener('click', async () => {
                    if (!confirm('删除这条记录？')) return;
                    try {
                        await DB.delete('records', btn.dataset.delRecord);
                        renderRecords();
                    } catch (error) {
                        alert(`删除跑单记录失败：${error.message || error}`);
                    }
                });
            });
        }).catch((error) => alert(`读取跑单记录失败：${error.message || error}`));
    }

    function renderRecordTrend(records) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const days = Array.from({ length: 7 }, (_, index) => {
            const date = new Date(today);
            date.setDate(today.getDate() - 6 + index);
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return {
                key: `${date.getFullYear()}-${month}-${day}`,
                label: `${Number(month)}/${Number(day)}`
            };
        });
        const recordsByDate = new Map(records.map((record) => [record.date, record]));
        const values = days.map(({ key, label }) => {
            const record = recordsByDate.get(key);
            return {
                label,
                count: Number(record?.count) || 0,
                income: Number(record?.income) || 0
            };
        });
        const maxCount = Math.max(...values.map((value) => value.count), 1);
        const maxIncome = Math.max(...values.map((value) => value.income), 1);
        const box = $('recordTrend');

        box.innerHTML = `
            <div class="record-trend-heading">
                <h3>近 7 天跑单趋势</h3>
                <div class="record-trend-legend">
                    <span><i class="record-trend-key orders"></i>单量</span>
                    <span><i class="record-trend-key income"></i>收入</span>
                </div>
            </div>
            <div class="record-trend-grid">
                ${values.map((value) => {
                    const countHeight = Math.round((value.count / maxCount) * 100);
                    const incomeHeight = Math.round((value.income / maxIncome) * 100);
                    return `
                        <div class="record-trend-day">
                            <div class="record-trend-bars" role="img" aria-label="${value.label}：${value.count} 单，收入 ${value.income.toFixed(2)} 元">
                                <span class="record-trend-bar orders" style="height:${countHeight}%"></span>
                                <span class="record-trend-bar income" style="height:${incomeHeight}%"></span>
                            </div>
                            <span class="record-trend-date">${value.label}</span>
                            <span>${value.count} 单</span>
                            <span>¥${value.income.toFixed(0)}</span>
                        </div>`;
                }).join('')}
            </div>`;
    }

    // ---------- 标注管理 ----------
    function escapeHTML(value) {
        return String(value).replace(/[&<>"']/g, (character) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[character]);
    }

    function renderMarksList(keyword) {
        if (markCategoryFilter === 'zones') {
            DB.getAll('zones').then((zones) => {
                $('zoneMarkCount').textContent = String(zones.length);
                const query = keyword.trim();
                const filteredZones = query
                    ? zones.filter((zone) => zone.name.includes(query))
                    : zones;
                $('marksList').innerHTML = filteredZones.length
                    ? filteredZones.map((zone) => `
                        <div class="list-item zone-list-item">
                            <span class="mark-category-chip">小区区域</span>
                            <span class="zone-list-name">${escapeHTML(zone.name)}</span>
                            <div class="item-desc">${zone.shapeType === 'rectangle' ? '矩形' : '多边形'} · ${zone.cells?.filter((cell) => cell.name).length || 0} 个商家</div>
                            <div class="item-actions"><button type="button" data-manage-zone="${zone.id}">管理商家</button><button type="button" data-focus-zone="${zone.id}">点击查看</button><button class="del" type="button" data-delete-zone="${zone.id}">删除</button></div>
                        </div>`).join('')
                    : '<p class="mark-list-empty">暂无小区区域，请在商家标注管理中绘制并命名。</p>';
                $('marksList').querySelectorAll('[data-manage-zone]').forEach((button) => {
                    button.addEventListener('click', () => MapModule.openMerchantZone(Number(button.dataset.manageZone)));
                });
                $('marksList').querySelectorAll('[data-focus-zone]').forEach((button) => {
                    button.addEventListener('click', () => {
                        const zoneId = Number(button.dataset.focusZone);
                        switchPage('merchants');
                        closeDrawer();
                        requestAnimationFrame(() => MapModule.focusZone(zoneId));
                    });
                });
                $('marksList').querySelectorAll('[data-delete-zone]').forEach((button) => {
                    button.addEventListener('click', async () => {
                        if (!confirm('确定删除这个小区区域及其商家网格吗？')) return;
                    try {
                        await DB.delete('zones', Number(button.dataset.deleteZone));
                        await MapModule.loadZones();
                        renderMarksList($('markSearch').value);
                    } catch (error) {
                        alert(`删除小区区域失败：${error.message || error}`);
                    }
                });
                });
            }).catch((error) => alert(`读取小区区域失败：${error.message || error}`));
            return;
        }
        if (markCategoryFilter === 'regionStats') {
            const renderVersion = ++markRegionRenderVersion;
            const box = $('marksList');
            box.innerHTML = '<p class="mark-list-empty">正在查询标注所属镇/街道和小区…</p>';
            DB.getAll('marks').then(async (list) => {
                const query = keyword.trim();
                const filteredMarks = query
                    ? list.filter((mark) => (mark.name || '').includes(query) || (mark.note || '').includes(query))
                    : list;
                const groups = await MapModule.groupMarksByRegion(filteredMarks);
                if (renderVersion !== markRegionRenderVersion) return;
                if (!groups.length) {
                    box.innerHTML = '<p class="mark-list-empty">暂无可统计的顾客或商家标注。</p>';
                    return;
                }
                box.innerHTML = groups.map((town) => `
                    <section class="mark-region-group">
                        <div class="mark-region-heading">
                            <span>${escapeHTML(town.name)}</span>
                            <span class="mark-region-counts">顾客 ${town.customers} · 商家 ${town.merchants}</span>
                        </div>
                        ${town.communities.map((community) => `
                            <div class="mark-community-group">
                                <div class="mark-community-heading">
                                    <span>${escapeHTML(community.name)}</span>
                                    <span class="mark-community-counts">顾客 ${community.customers} · 商家 ${community.merchants}</span>
                                </div>
                            </div>`).join('')}
                    </section>`).join('');
            }).catch((error) => {
                if (renderVersion !== markRegionRenderVersion) return;
                box.innerHTML = `<p class="mark-list-empty">区域统计加载失败：${escapeHTML(error.message || error)}<br><button id="retryMarkRegionStats" type="button">重试</button></p>`;
                $('retryMarkRegionStats').addEventListener('click', () => renderMarksList($('markSearch').value));
            });
            return;
        }
        DB.getAll('marks').then((list) => {
            const kw = keyword.trim();
            const customerCount = list.filter((mark) => !mark.category || mark.category === 'customer').length;
            const merchantCount = list.filter((mark) => mark.category === 'merchant').length;
            $('customerMarkCount').textContent = String(customerCount);
            $('merchantMarkCount').textContent = String(merchantCount);
            DB.getAll('zones').then((zones) => {
                $('zoneMarkCount').textContent = String(zones.length);
            }).catch((error) => alert(`读取小区区域失败：${error.message || error}`));
            const categoryMarks = list.filter((mark) => (mark.category || 'customer') === markCategoryFilter);
            const filtered = kw ? categoryMarks.filter((m) => (m.name || '').includes(kw) || (m.note || '').includes(kw)) : categoryMarks;
            const box = $('marksList');
            markPhotoObjectUrls.forEach((url) => URL.revokeObjectURL(url));
            markPhotoObjectUrls.clear();
            if (!filtered.length) {
                const categoryName = markCategoryFilter === 'merchant' ? '商家' : '顾客';
                box.innerHTML = `<p class="mark-list-empty">暂无${categoryName}标注。去地图页添加${categoryName}位置即可。</p>`;
                return;
            }
            box.innerHTML = filtered
                .map(
                    (m) => {
                        const merchantRating = Math.max(0, Math.min(5, Number(m.rating) || 0));
                        const merchantStars = markCategoryFilter === 'merchant'
                            ? `<div class="merchant-mark-rating" role="img" aria-label="商家评分：${merchantRating} / 5 分">
                                ${Array.from({ length: 5 }, (_, index) => `<span class="merchant-mark-star${index < merchantRating ? ' is-selected' : ''}">★</span>`).join('')}
                                <small>${merchantRating ? `${merchantRating} / 5` : '未评分'}</small>
                            </div>`
                            : '';
                        return `<div class="list-item${m.photo ? ' has-photo' : ''}${markCategoryFilter === 'merchant' ? ' is-merchant-mark' : ''}"${markCategoryFilter === 'merchant' ? ` data-merchant-detail="${m.id}"` : ''}>
                        <span class="mark-category-chip">${markCategoryFilter === 'merchant' ? '商家' : '顾客'}</span>
                        <div class="item-title">${m.name || '(未命名)'}</div>
                        ${merchantStars}
                        <div class="item-desc">${m.note || '无备注'}　(${Number(m.lat).toFixed(5)}, ${Number(m.lng).toFixed(5)})</div>
                        ${m.photo ? `<button class="mark-photo-button" type="button" data-view-mark-photo="${m.id}" aria-label="查看标注照片"><img alt="标注照片缩略图"></button>` : ''}
                        <div class="item-actions">
                            <button data-edit-mark="${m.id}">详细</button>
                            <button class="del" data-del-mark="${m.id}">删除</button>
                        </div>
                    </div>`;
                    }
                )
                .join('');
            filtered.forEach((mark) => {
                if (!mark.photo) return;
                const button = box.querySelector(`[data-view-mark-photo="${mark.id}"]`);
                const photoUrl = URL.createObjectURL(mark.photo);
                markPhotoObjectUrls.add(photoUrl);
                button.querySelector('img').src = photoUrl;
                button.addEventListener('click', () => openPhotoViewer(photoUrl));
            });
            box.querySelectorAll('[data-del-mark]').forEach((btn) => {
                btn.addEventListener('click', async () => {
                    if (!confirm('删除这条标注？')) return;
                    try {
                        await DB.delete('marks', Number(btn.dataset.delMark));
                        renderMarksList($('markSearch').value);
                        MapModule.loadMarks();
                        MapModule.loadMerchantMarks();
                    } catch (error) {
                        alert(`删除地图标注失败：${error.message || error}`);
                    }
                });
            });
            box.querySelectorAll('[data-edit-mark]').forEach((btn) => {
                btn.addEventListener('click', () => {
                    const mark = filtered.find((item) => item.id === Number(btn.dataset.editMark));
                    if (mark?.category === 'merchant') MapModule.openMerchantDetail(mark);
                    else MapModule.editMark(Number(btn.dataset.editMark));
                });
            });
            box.querySelectorAll('[data-merchant-detail]').forEach((card) => {
                card.addEventListener('click', (event) => {
                    if (event.target.closest('button')) return;
                    const mark = filtered.find((item) => item.id === Number(card.dataset.merchantDetail));
                    if (mark) MapModule.openMerchantDetail(mark);
                });
            });
        }).catch((error) => alert(`读取地图标注失败：${error.message || error}`));
    }

    $('markSearch').addEventListener('input', (e) => renderMarksList(e.target.value));
    document.addEventListener('zone-data-changed', () => {
        if (markCategoryFilter === 'zones' && $('page-marks').classList.contains('active')) {
            renderMarksList($('markSearch').value);
        }
    });
    document.querySelectorAll('[data-mark-category]').forEach((tab) => {
        tab.addEventListener('click', () => {
            markCategoryFilter = tab.dataset.markCategory;
            document.querySelectorAll('[data-mark-category]').forEach((item) => {
                const isActive = item === tab;
                item.classList.toggle('active', isActive);
                item.setAttribute('aria-selected', String(isActive));
            });
            renderMarksList($('markSearch').value);
        });
    });

    // ---------- 地图弹窗：保存/取消/编辑/删除 ----------
    document.querySelectorAll('input[name="markType"]').forEach((input) => {
        input.addEventListener('change', () => {
            window.updateMarkStyleFields();
            if (input.value === 'icon' && input.checked) window.fillMarkNameForSelectedIcon();
        });
    });
    document.querySelectorAll('input[name="markIcon"]').forEach((input) => {
        input.addEventListener('change', () => window.fillMarkNameForSelectedIcon());
    });

    $('markSave').addEventListener('click', async () => {
        if (editingMarkId === null && currentLatLng === null) {
            return alert('请先在地图上点击选择位置');
        }
        const name = $('markName').value.trim();
        const note = $('markNote').value.trim();
        const photo = selectedMarkPhoto;
        const type = document.querySelector('input[name="markType"]:checked').value;
        const iconKey = document.querySelector('input[name="markIcon"]:checked').value;
        if (!name) return alert('请填写名称');
        try {
            if (editingMarkId !== null) {
                const mark = await DB.get('marks', editingMarkId);
                if (!mark) throw new Error('该标注已不存在，请刷新后重试');
                const category = mark.category === 'merchant' ? 'merchant' : 'customer';
                mark.name = name;
                mark.note = note;
                mark.type = type;
                if (type === 'icon' && category === 'customer') mark.iconKey = iconKey;
                else delete mark.iconKey;
                if (photo) mark.photo = photo;
                else delete mark.photo;
                await DB.put('marks', mark);
                editingMarkId = null;
            } else {
                await DB.add('marks', {
                    name,
                    note,
                    category: 'customer',
                    type,
                    ...(type === 'icon' ? { iconKey } : {}),
                    lat: currentLatLng.lat,
                    lng: currentLatLng.lng,
                    ...(photo ? { photo } : {})
                });
            }
        } catch (error) {
            alert(`保存地图标注失败：${error.message || error}`);
            return;
        }
        $('markPhoto').value = '';
        $('markPhotoGallery').value = '';
        setMarkPhotoPreview(null);
        hidePopups();
        MapModule.loadMarks();
        MapModule.loadMerchantMarks();
        if ($('page-marks').classList.contains('active')) renderMarksList($('markSearch').value);
    });

    $('markCancel').addEventListener('click', () => {
        editingMarkId = null;
        $('markPhoto').value = '';
        $('markPhotoGallery').value = '';
        setMarkPhotoPreview(null);
        hidePopups();
    });
    $('markFormClose').addEventListener('click', () => $('markCancel').click());

    $('popupClose').addEventListener('click', hidePopups);
    $('popupDetail').addEventListener('click', async () => {
        if (editingMarkId === null) return hidePopups();
        try {
            await MapModule.openMarkDetail(editingMarkId);
        } catch (error) {
            alert(`读取标注详情失败：${error.message || error}`);
        }
    });
    $('markDetailClose').addEventListener('click', () => MapModule.closeMarkDetail());
    $('markOrderAddToggle').addEventListener('click', () => {
        const form = $('markOrderForm');
        form.hidden = !form.hidden;
        $('markOrderAddToggle').setAttribute('aria-expanded', String(!form.hidden));
        if (!form.hidden) $('markOrderRoom').focus();
    });
    $('markOrderForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const room = $('markOrderRoom').value.trim();
        if (!room) return;
        try {
            await MapModule.addMarkOrderRecord(room);
            $('markOrderRoom').value = '';
        } catch (error) {
            alert(`保存完单记录失败：${error.message || error}`);
        }
    });
    $('markOrderHistoryList').addEventListener('click', async (event) => {
        const button = event.target.closest('[data-order-record-id]');
        if (!button) return;
        try {
            await MapModule.deleteMarkOrderRecord(button.dataset.orderRecordId);
        } catch (error) {
            alert(`删除完单记录失败：${error.message || error}`);
        }
    });
    $('markDetailDelete').addEventListener('click', async () => {
        try {
            await MapModule.deleteCurrentMainMapMark();
        } catch (error) {
            alert(`删除标注失败：${error.message || error}`);
        }
    });
    $('markDetailDialog').addEventListener('click', (event) => {
        if (event.target === $('markDetailDialog')) MapModule.closeMarkDetail();
    });
    document.querySelectorAll('input[name="markFloorAccess"]').forEach((input) => {
        input.addEventListener('change', async () => {
            try {
                await MapModule.saveMarkFloorAccess(input.value);
            } catch (error) {
                alert(`保存楼层状态失败：${error.message || error}`);
            }
        });
    });
    $('popupViewPhoto').addEventListener('click', async () => {
        if (editingMarkId === null) return;
        try {
            const mark = await DB.get('marks', editingMarkId);
            if (!mark?.photo) throw new Error('该标注没有可查看的现场照片');
            window.openMarkPhotoViewer(mark.photo);
        } catch (error) {
            alert(`打开现场照片失败：${error.message || error}`);
        }
    });

    $('popupEdit').addEventListener('click', () => {
        hidePopups();
        showAddMarkForm('编辑标注');
    });

    // ---------- 设置 ----------
    function refreshStorageInfo() {
        DB.getStorageUsage().then((text) => {
            $('storageInfo').textContent = text;
        }).catch((error) => {
            $('storageInfo').textContent = '读取失败';
            alert(`读取存储空间失败：${error.message || error}`);
        });
    }

    function dataUrlToBlob(dataUrl) {
        const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/]*={0,2})$/.exec(dataUrl);
        if (!match) throw new Error('备份中的照片格式无效');
        try {
            const binary = atob(match[2]);
            const bytes = new Uint8Array(binary.length);
            for (let index = 0; index < binary.length; index += 1) {
                bytes[index] = binary.charCodeAt(index);
            }
            return new Blob([bytes], { type: match[1] });
        } catch (error) {
            throw new Error(`备份中的照片无法解码：${error.message || error}`);
        }
    }

    async function prepareBackupForExport() {
        const data = {
            levels: await DB.getAll('levels'),
            records: await DB.getAll('records'),
            marks: await DB.getAll('marks'),
            placeLabels: await DB.getAll('placeLabels'),
            zones: await DB.getAll('zones')
        };
        const photoFiles = [];
        const manifestPhotos = [];
        data.marks = await Promise.all(data.marks.map(async (mark) => {
            if (mark.photo === undefined || mark.photo === null) return mark;
            let photo = mark.photo;
            if (typeof photo === 'string') photo = dataUrlToBlob(photo);
            if (!(photo instanceof Blob) || !/^image\/[a-zA-Z0-9.+-]+$/.test(photo.type)) {
                throw new Error(`标注 ${mark.id} 的照片无法读取，已停止导出以避免丢失照片`);
            }
            const extension = photo.type.slice(6).replace(/\+/g, '-').toLowerCase();
            const path = `photos/${mark.id}.${extension}`;
            const bytes = new Uint8Array(await photo.arrayBuffer());
            const checksum = BackupZip.crc32(bytes);
            photoFiles.push({ name: path, bytes });
            manifestPhotos.push({
                markId: mark.id,
                path,
                mimeType: photo.type,
                size: bytes.length,
                checksum
            });
            const { photo: removedPhoto, ...markWithoutPhoto } = mark;
            return { ...markWithoutPhoto, photoPath: path };
        }));
        const backup = {
            format: 'rider-assistant-backup',
            version: 3,
            exportedAt: new Date().toISOString(),
            data
        };
        const manifest = {
            format: 'rider-assistant-photo-manifest',
            version: 1,
            photos: manifestPhotos
        };
        return {
            entries: [
                { name: 'data.json', bytes: new TextEncoder().encode(JSON.stringify(backup)) },
                { name: 'photo-manifest.json', bytes: new TextEncoder().encode(JSON.stringify(manifest)) },
                ...photoFiles
            ]
        };
    }

    function validateBackup(backup) {
        if (!backup || backup.format !== 'rider-assistant-backup' || ![1, 2, 3].includes(backup.version)
            || !backup.data || !['levels', 'records', 'marks'].every((key) => Array.isArray(backup.data[key]))
            || (backup.version >= 2 && !Array.isArray(backup.data.placeLabels))
            || (backup.version >= 3 && !Array.isArray(backup.data.zones))) {
            throw new Error('备份文件格式不正确或版本不受支持');
        }
        const { levels, records, marks } = backup.data;
        const placeLabels = backup.data.placeLabels || [];
        const zones = backup.data.zones || [];
        const uniqueValues = (items, key) => new Set(items.map((item) => item?.[key])).size === items.length;
        if (!uniqueValues(levels, 'date') || !uniqueValues(records, 'date')
            || !uniqueValues(marks, 'id') || !uniqueValues(placeLabels, 'id') || !uniqueValues(zones, 'id')) {
            throw new Error('备份中存在重复的数据记录');
        }
        if (levels.some((item) => !item || typeof item.date !== 'string')
            || records.some((item) => !item || typeof item.date !== 'string')
            || marks.some((item) => !item || !Number.isFinite(item.id)
                || !Number.isFinite(item.lat) || !Number.isFinite(item.lng)
                || typeof item.name !== 'string')
            || placeLabels.some((item) => !item || !Number.isFinite(item.id)
                || !Number.isFinite(item.lat) || !Number.isFinite(item.lng)
                || typeof item.name !== 'string'
                || !['province', 'district', 'street', 'community', 'building', 'floor'].includes(item.level))
            || zones.some((item) => !item || !Number.isFinite(item.id)
                || typeof item.name !== 'string'
                || !['polygon', 'rectangle'].includes(item.shapeType)
                || !Array.isArray(item.path) || item.path.length < 3
                || !item.path.every((point) => Array.isArray(point) && point.length === 2
                    && point.every(Number.isFinite))
                || (item.mapScope !== 'main-map'
                    && (!Number.isInteger(item.rows) || item.rows < 1 || item.rows > 5
                        || !Number.isInteger(item.columns) || item.columns < 1 || item.columns > 15
                        || !Array.isArray(item.cells)
                        || !item.cells.every((cell) => cell && Number.isInteger(cell.row)
                            && cell.row >= 0 && cell.row < item.rows
                            && Number.isInteger(cell.column) && cell.column >= 0
                            && cell.column < item.columns
                            && typeof cell.name === 'string'))))) {
            throw new Error('备份中存在无效的数据记录');
        }
        const importedMarks = marks.map((mark) => {
            if (typeof mark.photo === 'string') return { ...mark, photo: dataUrlToBlob(mark.photo) };
            if (mark.photo === undefined || mark.photo === null || mark.photo instanceof Blob) return mark;
            throw new Error('备份中的照片数据无效');
        });
        return {
            data: { levels, records, marks: importedMarks, placeLabels, zones }
        };
    }

    async function readBackupFile(file) {
        const firstBytes = new Uint8Array(await file.slice(0, 4).arrayBuffer());
        const isZip = firstBytes[0] === 0x50 && firstBytes[1] === 0x4b
            && [0x03, 0x05, 0x07].includes(firstBytes[2]);
        if (!isZip) {
            const backup = JSON.parse(await file.text());
            if (backup?.data?.marks?.some((mark) => mark && Object.hasOwn(mark, 'photoPath'))) {
                throw new Error('此备份包含独立照片文件，请选择完整 ZIP 文件导入');
            }
            return validateBackup(backup);
        }

        let entries = await BackupZip.read(file);
        if (!entries.has('data.json')) {
            const paths = [...entries.keys()];
            const root = paths.length ? paths[0].split('/')[0] : '';
            const rootPrefix = `${root}/`;
            if (root && paths.every((path) => path.startsWith(rootPrefix))) {
                entries = new Map(paths.map((path) => [path.slice(rootPrefix.length), entries.get(path)]));
            }
        }
        const dataBytes = entries.get('data.json');
        const manifestBytes = entries.get('photo-manifest.json');
        if (!dataBytes || !manifestBytes) throw new Error('ZIP 备份缺少业务数据或照片清单');
        let backup;
        let manifest;
        try {
            backup = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(dataBytes));
            manifest = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(manifestBytes));
        } catch (error) {
            throw new Error(`ZIP 备份中的 JSON 文件无效：${error.message || error}`);
        }
        if (!manifest || manifest.format !== 'rider-assistant-photo-manifest'
            || manifest.version !== 1 || !Array.isArray(manifest.photos)) {
            throw new Error('ZIP 备份中的照片关联清单无效');
        }
        const { data } = validateBackup(backup);
        const referencedPhotos = new Map();
        data.marks.forEach((mark) => {
            if (mark.photoPath === undefined) return;
            if (typeof mark.photoPath !== 'string' || mark.photo !== undefined) {
                throw new Error(`标注 ${mark.id} 的照片关联信息无效`);
            }
            referencedPhotos.set(mark.id, mark.photoPath);
        });
        const restoredPhotos = new Map();
        const photoPaths = new Set();
        manifest.photos.forEach((photo) => {
            if (!photo || !Number.isFinite(photo.markId) || typeof photo.path !== 'string'
                || !new RegExp(`^photos/${photo.markId}\\.[a-z0-9-]+$`).test(photo.path)
                || !/^image\/[a-zA-Z0-9.+-]+$/.test(photo.mimeType)
                || !Number.isInteger(photo.size) || photo.size < 0
                || !Number.isInteger(photo.checksum) || photo.checksum < 0 || photo.checksum > 0xffffffff
                || photoPaths.has(photo.path) || referencedPhotos.get(photo.markId) !== photo.path) {
                throw new Error('ZIP 备份中的照片清单与标注记录不匹配');
            }
            const bytes = entries.get(photo.path);
            if (!bytes || bytes.length !== photo.size || BackupZip.crc32(bytes) !== photo.checksum) {
                throw new Error(`ZIP 备份中的照片缺失或校验失败：${photo.path}`);
            }
            photoPaths.add(photo.path);
            restoredPhotos.set(photo.markId, new Blob([bytes], { type: photo.mimeType }));
        });
        if (restoredPhotos.size !== referencedPhotos.size
            || entries.size !== 2 + photoPaths.size
            || [...entries.keys()].some((path) => path !== 'data.json'
                && path !== 'photo-manifest.json' && !photoPaths.has(path))) {
            throw new Error('ZIP 备份照片不完整或包含未关联文件');
        }
        data.marks = data.marks.map((mark) => {
            const photo = restoredPhotos.get(mark.id);
            if (!photo) return mark;
            const { photoPath, ...markWithoutPhotoPath } = mark;
            return { ...markWithoutPhotoPath, photo };
        });
        return { data };
    }

    function closeExportNameDialog() {
        $('exportNameDialog').classList.add('hidden');
        $('exportNameError').hidden = true;
    }

    $('exportData').addEventListener('click', () => {
        $('exportNameInput').value = `骑手助手备份-${getLocalDateString()}`;
        $('exportNameError').hidden = true;
        $('exportNameDialog').classList.remove('hidden');
        $('exportNameInput').focus();
        $('exportNameInput').select();
    });
    $('exportNameClose').addEventListener('click', closeExportNameDialog);
    $('exportNameCancel').addEventListener('click', closeExportNameDialog);
    $('exportNameDialog').addEventListener('click', (event) => {
        if (event.target === $('exportNameDialog')) closeExportNameDialog();
    });
    $('exportNameInput').addEventListener('input', () => {
        $('exportNameError').hidden = true;
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !$('exportNameDialog').classList.contains('hidden')) {
            closeExportNameDialog();
        }
    });
    $('exportNameForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const name = $('exportNameInput').value.trim();
        const invalidFilenameCharacters = /[<>:"/\\|?*\u0000-\u001F]/;
        const windowsReservedName = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;
        const error = !name
            ? '请输入文件名。'
            : invalidFilenameCharacters.test(name)
                ? '文件名不能包含 \\ / : * ? " < > | 等字符。'
                : /[. ]$/.test(name)
                    ? '文件名不能以空格或句点结尾。'
                    : windowsReservedName.test(name)
                        ? '该名称是系统保留名称，请换一个文件名。'
                        : '';
        if (error) {
            $('exportNameError').textContent = error;
            $('exportNameError').hidden = false;
            $('exportNameInput').focus();
            return;
        }

        const status = $('dataBackupStatus');
        status.textContent = '正在准备备份…';
        $('exportNameDialog').classList.add('hidden');
        try {
            const backup = await prepareBackupForExport();
            const file = BackupZip.create(backup.entries);
            const url = URL.createObjectURL(file);
            const link = document.createElement('a');
            link.href = url;
            const filename = name.replace(/\.zip$/i, '');
            link.download = `${filename}.zip`;
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            status.textContent = `数据已导出：${link.download}`;
        } catch (error) {
            status.textContent = '导出失败。';
            alert(`导出数据失败：${error.message || error}`);
        }
    });

    $('importDataBtn').addEventListener('click', () => $('importDataFile').click());
    $('importDataFile').addEventListener('change', async (event) => {
        const input = event.currentTarget;
        const files = Array.from(input.files);
        if (!files.length) return;
        const status = $('dataBackupStatus');
        try {
            const data = { levels: [], records: [], marks: [], placeLabels: [], zones: [] };
            for (const file of files) {
                const backup = await readBackupFile(file);
                Object.keys(data).forEach((key) => data[key].push(...backup.data[key]));
            }
            if (!confirm('导入会合并所选备份与本地数据；同日期的数据、同经纬度的标注/地名标签，以及相同边界的区域会被后导入的数据覆盖，其他本地数据保留。确定继续吗？')) {
                return;
            }
            await DB.mergeImport(data);
            refreshStorageInfo();
            MapModule.loadMarks();
            MapModule.loadMerchantMarks();
            MapModule.loadPlaceLabels();
            MapModule.loadZones();
            MapModule.loadMainMapZones();
            renderLevelChart();
            renderRecords();
            status.textContent = `已合并导入 ${files.length} 份备份。`;
            alert(`已合并导入 ${files.length} 份备份。`);
        } catch (error) {
            status.textContent = '导入失败。';
            alert(`导入数据失败：${error.message || error}`);
        } finally {
            input.value = '';
        }
    });

    $('clearData').addEventListener('click', async () => {
        if (!confirm('确定清空所有数据？此操作不可恢复！')) return;
        if (!confirm('再次确认：等级、跑单记录、地图标注、地名标签和小区区域都会删除。')) return;
        try {
            await DB.clearAll();
            refreshStorageInfo();
            MapModule.loadMarks();
            MapModule.loadMerchantMarks();
            MapModule.loadPlaceLabels();
            await MapModule.loadZones();
            await MapModule.loadMainMapZones();
            renderLevelChart();
            renderRecords();
            alert('已清空。');
        } catch (error) {
            alert(`清空数据失败：${error.message || error}`);
        }
    });

    $('exitProgramBtn').addEventListener('click', () => {
        if (!confirm('确定要退出程序吗？')) return;

        window.close();
        setTimeout(() => {
            if (!window.closed) {
                alert('浏览器不允许网页关闭此窗口，请手动关闭。');
            }
        }, 300);
    });

    document.querySelectorAll('input[name="defaultNavigationApp"]').forEach((input) => {
        input.checked = input.value === MapModule.getDefaultNavigationApp();
        input.addEventListener('change', () => {
            if (!input.checked) return;
            const saved = MapModule.setDefaultNavigationApp(input.value);
            if (!saved) alert('无法保存默认导航设置，请检查浏览器存储权限。');
        });
    });

    // ---------- 启动 ----------
    MapModule.init();
    DB.init()
        .then(() => {
            MapModule.loadMarks();
            MapModule.loadMerchantMarks();
            MapModule.loadPlaceLabels();
            MapModule.loadMainMapZones();
            const today = getLocalDateString();
            $('levelDate').value = today;
            $('recordDate').value = today;
        })
        .catch((err) => alert('数据库初始化失败：' + err));
})();
