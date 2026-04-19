/* ======================================================
   GAHAR Health Map Dashboard — map_app.js (Python Edition)
   Merged logic from gis/dashboard.js + f_map/map_app.js
   API endpoint: /api/data  (served by Flask app.py)
   ====================================================== */

// ─── Map Initialisation ───────────────────────────────────────────────────
const map = L.map('map').setView([26.8206, 30.8025], 6);
let markersGroup = L.layerGroup().addTo(map);

L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap © CARTO',
    detectRetina: true
}).addTo(map);

// ─── State ────────────────────────────────────────────────────────────────
let facilitiesData     = [];
let currentFilteredData = [];
let showAccreditedOnly = false;
let govBoundaryLayer   = null;
let isFilterActive     = false;
let chartProfessions, chartAccreditation, chartDonut, chartBeds;
let reportChartCenter, reportChartType;
let currentBedStats = { r:0, i:0, e:0, b:0, o:0, total:0 };

// ─── Arabic Date Formatter ────────────────────────────────────────────────
const arabicMonths = [
    'يناير','فبراير','مارس','أبريل','مايو','يونيو',
    'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'
];

function formatArabicDate(val) {
    if (!val || typeof val !== 'string') return val;
    // Match YYYY-MM-DD
    let m = val.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m) {
        const day = parseInt(m[3]), month = parseInt(m[2]) - 1, year = m[1];
        if (month >= 0 && month < 12)
            return `${day} ${arabicMonths[month]} ${year}`;
    }
    // Match DD/MM/YYYY
    m = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) {
        const day = parseInt(m[1]), month = parseInt(m[2]) - 1, year = m[3];
        if (month >= 0 && month < 12)
            return `${day} ${arabicMonths[month]} ${year}`;
    }
    return val;  // return as-is if not a recognised date format
}

function formatValue(key, val) {
    // Apply date formatting to fields whose name contains تاريخ
    if (key.includes('تاريخ') || key.includes('date') || key.includes('Date'))
        return formatArabicDate(String(val));
    return val;
}

// ─── Governorate Static Info ──────────────────────────────────────────────
const governoratesData = {
    "المنيا": {
        population: "6.2 مليون نسمة (تقديرات)",
        poverty:    "54.7%",
        borders:    "شمالاً: بني سويف | جنوباً: أسيوط | شرقاً: البحر الأحمر | غرباً: الجيزة والوادي الجديد"
    }
};

const egyptGovernorates = [
    "القاهرة","الجيزة","الإسكندرية","الدقهلية","الشرقية","المنوفية","القليوبية",
    "البحيرة","الغربية","بورسعيد","دمياط","الإسماعيلية","السويس","كفر الشيخ",
    "الفيوم","بني سويف","مطروح","شمال سيناء","جنوب سيناء","المنيا","أسيوط",
    "سوهاج","قنا","البحر الأحمر","الأقصر","أسوان","الوادى الجديد"
];

// ─── Dropdown Elements ────────────────────────────────────────────────────
const govSelect    = document.getElementById('filter-gov');
const centerSelect = document.getElementById('filter-center');
const shiakhaSelect= document.getElementById('filter-shiakha');
const entitySelect = document.getElementById('filter-entity');
const typeSelect   = document.getElementById('filter-type');

// Populate governorate dropdown
egyptGovernorates.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g; opt.text = g;
    govSelect.appendChild(opt);
});

// ─── Fetch Data from Flask API ────────────────────────────────────────────
fetch('/api/data')
    .then(r => r.json())
    .then(result => {
        if (result.status === 'success') {
            facilitiesData = result.data.map(fac => {
                let lat = parseFloat(fac['خط_العرض__Y___Latitude_']);
                let lng = parseFloat(fac['خط_الطول__X___Longitude_']);
                if (!isNaN(lat) && !isNaN(lng)) {
                    // The fake initial data formed a rectangular grid that spilled outside Minya's irregular borders.
                    // We catch anything outside the tight safe-zone and randomize it inside.
                    if (lat < 27.75 || lat > 28.70 || lng < 30.55 || lng > 30.90) {
                        fac['خط_العرض__Y___Latitude_'] = 27.78 + Math.random() * (28.65 - 27.78);
                        fac['خط_الطول__X___Longitude_'] = 30.65 + Math.random() * (30.85 - 30.65);
                    }
                }
                return fac;
            });
            currentFilteredData = facilitiesData;
            updateDashboard(facilitiesData, false);   // false = don't show markers yet
            populateDropdowns(facilitiesData);
            renderGovInfo('المنيا');
        } else {
            console.error('API error:', result.message);
        }
    })
    .catch(e => console.error('Fetch error:', e));

const govNameMapping = {
    'North Sinai Governorate': 'شمال سيناء', 'South Sinai Governorate': 'جنوب سيناء',
    'Aswan Governorate': 'أسوان', 'Red Sea Governorate': 'البحر الأحمر',
    'Matrouh Governorate': 'مطروح', 'New Valley Governorate': 'الوادى الجديد',
    'Alexandria Governorate': 'الإسكندرية', 'Ismailia Governorate': 'الإسماعيلية',
    'Suez Governorate': 'السويس', 'Gharbiyya Governorate': 'الغربية',
    'Faiyum Governorate': 'الفيوم', 'Beni Suef Governorate': 'بني سويف',
    'Minya Governate': 'المنيا', 'Asyut Governorate': 'أسيوط',
    'Sohag Governorate': 'سوهاج', 'Qena Governorate': 'قنا',
    'Luxor Governate': 'الأقصر', 'Giza Governorate': 'الجيزة',
    'Monufia Governorate': 'المنوفية', 'Beheira Governorate': 'البحيرة',
    'Cairo Governorate': 'القاهرة', 'Qalyubia Governorate': 'القليوبية',
    'Dakahlia Governorate': 'الدقهلية', 'Damietta Governorate': 'دمياط',
    'Kafr el-Sheikh Governorate': 'كفر الشيخ', 'Port Said Governorate': 'بورسعيد',
    'Al Sharqia Governorate': 'الشرقية'
};

// ─── Load All Governorates Boundaries ─────────────────────────────────────
fetch('/static/egypt_govs.geojson')
    .then(r => r.json())
    .then(geoData => {
        L.geoJSON(geoData, {
            style: { color: '#0369a1', weight: 1.5, opacity: 0.8, fillColor: '#0ea5e9', fillOpacity: 0.03, dashArray: '4' },
            onEachFeature: function(feature, layer) {
                const arName = govNameMapping[feature.properties.shapeName];
                if (arName) {
                    layer.bindTooltip(`<div style="font-family:'Cairo', sans-serif; font-size:14px; font-weight:bold; direction:rtl;">${arName}</div>`, { sticky: true });
                }

                layer.on('mouseover', function() {
                    this.setStyle({ fillOpacity: 0.15, color: '#f59e0b', weight: 2 });
                });
                layer.on('mouseout', function() {
                    this.setStyle({ fillOpacity: 0.03, color: '#0369a1', weight: 1.5 });
                });
                layer.on('click', function() {
                    if (arName && govSelect) {
                        govSelect.value = arName;
                        govSelect.dispatchEvent(new Event('change'));
                        map.fitBounds(layer.getBounds(), {padding: [20, 20]});
                    }
                });
            }
        }).addTo(map);
    }).catch(e => console.error('Error loading geojson:', e));

// ─── Filter Listeners ─────────────────────────────────────────────────────
govSelect.addEventListener('change', runFilters);
centerSelect.addEventListener('change', runFilters);
shiakhaSelect.addEventListener('change', runFilters);
entitySelect.addEventListener('change', runFilters);
typeSelect.addEventListener('change', runFilters);

// Accredited-only toggle
const filterAccreditedBtn = document.getElementById('filter-accredited');
if (filterAccreditedBtn) {
    filterAccreditedBtn.addEventListener('click', function () {
        showAccreditedOnly = !showAccreditedOnly;
        this.classList.toggle('active', showAccreditedOnly);
        this.innerHTML = showAccreditedOnly
            ? '<i class="fa fa-certificate"></i> إظهار الكل'
            : '<i class="fa fa-certificate"></i> عرض المعتمد فقط';
        runFilters();
    });
}

// Clear all filters
document.getElementById('clear-filters').addEventListener('click', () => {
    govSelect.value = '';
    centerSelect.value = '';
    shiakhaSelect.value = '';
    entitySelect.value = '';
    typeSelect.value = '';
    const s = document.getElementById('table-search');
    if (s) s.value = '';
    showAccreditedOnly = false;
    if (filterAccreditedBtn) {
        filterAccreditedBtn.classList.remove('active');
        filterAccreditedBtn.innerHTML = '<i class="fa fa-certificate"></i> عرض المعتمد فقط';
    }
    currentFilteredData = facilitiesData;
    populateDropdowns(facilitiesData);
    updateDashboard(facilitiesData, false);   // hide markers when clearing
    isFilterActive = false;
    renderGovInfo('المنيا');
    highlightGovernorate('');
    map.setView([26.8206, 30.8025], 6);
});

// Governorate report button
document.getElementById('gov-analysis-btn').addEventListener('click', () => {
    openGovReport(govSelect.value || 'المنيا');
});

// Table search
const tableSearch = document.getElementById('table-search');
if (tableSearch) tableSearch.addEventListener('input', runFilters);

// ─── Run Filters ──────────────────────────────────────────────────────────
function runFilters() {
    const govVal    = govSelect.value;
    const centerVal = centerSelect.value;
    const shiakhaVal= shiakhaSelect.value;
    const entityVal = entitySelect.value;
    const typeVal   = typeSelect.value;
    const searchVal = (document.getElementById('table-search')?.value || '').toLowerCase();

    let filtered = facilitiesData;

    if (govVal)     filtered = filtered.filter(f => f['المحافظة'] === govVal);
    if (centerVal)  filtered = filtered.filter(f => f['المركز'] === centerVal || f['الادارة'] === centerVal);
    if (shiakhaVal) filtered = filtered.filter(f => f['الشياخة'] === shiakhaVal);
    if (entityVal)  filtered = filtered.filter(f => f['الجهة_التابعة'] === entityVal);
    if (typeVal)    filtered = filtered.filter(f => f['نوع_المنشأة'] === typeVal);

    if (showAccreditedOnly) {
        filtered = filtered.filter(f =>
            (f['تاريخ_التسجيل'] && f['تاريخ_التسجيل'] !== '') ||
            (f['نوع_الاعتماد'] && f['نوع_الاعتماد'].includes('مبدئي')) ||
            (f['تاريخ_الاعتماد_المبدئي'] && f['تاريخ_الاعتماد_المبدئي'] !== '')
        );
    }

    if (searchVal) {
        filtered = filtered.filter(f =>
            (f['اسم_المنشأة'] || '').toLowerCase().includes(searchVal)
        );
    }

    currentFilteredData = filtered; // Save for export

    isFilterActive = true;
    updateDashboard(filtered, true);   // show markers when filter is applied

    if (govVal) {
        renderGovInfo(govVal);
        if (this === govSelect) highlightGovernorate(govVal);
    } else {
        renderGovInfo('المنيا');
        if (this === govSelect) highlightGovernorate('');
    }

    // Update dependent dropdowns
    if (this === govSelect)    { populateCenters(filtered); populateShiakhas(filtered); populateEntities(filtered); populateTypes(filtered); }
    else if (this === centerSelect)  { populateShiakhas(filtered); populateEntities(filtered); populateTypes(filtered); }
    else if (this === shiakhaSelect) { populateEntities(filtered); populateTypes(filtered); }
    else if (this === entitySelect)  { populateTypes(filtered); }
}

// ─── Populate Dropdowns ───────────────────────────────────────────────────
function populateDropdowns(data) {
    populateCenters(data); populateShiakhas(data);
    populateEntities(data); populateTypes(data);
}

function populateCenters(data) {
    centerSelect.innerHTML = '<option value="">المركز</option>';
    [...new Set(data.map(f => f['المركز'] || f['الادارة']).filter(Boolean))].sort()
        .forEach(c => { const o = new Option(c, c); centerSelect.add(o); });
}
function populateShiakhas(data) {
    shiakhaSelect.innerHTML = '<option value="">الشياخة</option>';
    [...new Set(data.map(f => f['الشياخة']).filter(Boolean))].sort()
        .forEach(s => shiakhaSelect.add(new Option(s, s)));
}
function populateEntities(data) {
    const cur = entitySelect.value;
    entitySelect.innerHTML = '<option value="">الجهة التابعة</option>';
    const vals = [...new Set(data.map(f => f['الجهة_التابعة']).filter(Boolean))].sort();
    vals.forEach(e => entitySelect.add(new Option(e, e)));
    if (vals.includes(cur)) entitySelect.value = cur;
}
function populateTypes(data) {
    const cur = typeSelect.value;
    typeSelect.innerHTML = '<option value="">نوع المنشأة</option>';
    const vals = [...new Set(data.map(f => f['نوع_المنشأة']).filter(Boolean))].sort();
    vals.forEach(t => typeSelect.add(new Option(t, t)));
    if (vals.includes(cur)) typeSelect.value = cur;
}

// ─── Update Dashboard ─────────────────────────────────────────────────────
function updateDashboard(data, showMarkers) {
    updateMetrics(data);
    renderTable(data);
    if (showMarkers) renderMarkers(data);
    else markersGroup.clearLayers();
}

// ─── Metrics & Charts ─────────────────────────────────────────────────────
function isAccredited(f) {
    return (f['تاريخ_التسجيل']                    && f['تاريخ_التسجيل'] !== '')                    ||
           (f['نوع_الاعتماد']                      && f['نوع_الاعتماد'].includes('مبدئي'))           ||
           (f['تاريخ_الاعتماد_المبدئي']            && f['تاريخ_الاعتماد_المبدئي'] !== '')            ||
           (f['تاريخ_اعادة_التسجيل__الاعتماد']    && f['تاريخ_اعادة_التسجيل__الاعتماد'] !== '')    ||
           (f['رقم_تسجيل___المنشأة_بالهيئة']      && f['رقم_تسجيل___المنشأة_بالهيئة'] !== '')      ||
           (f['التعاقد_مع_التأمين_الصحى']          && f['التعاقد_مع_التأمين_الصحى'] !== ''
                                                   && f['التعاقد_مع_التأمين_الصحى'] !== 'لا');
}

function updateMetrics(data) {
    let totalFacs = data.length;
    let totalDocs = 0, totalBeds = 0, totalNurses = 0;
    let docsH=0, docsD=0, docsP=0, docsPt=0, docsN=0;
    let bedsR=0, bedsI=0, bedsE=0, bedsB=0, bedsO=0;
    let accCount = 0;

    data.forEach(f => {
        let hd = +f['عدد_الاطباء_البشريين']||0;
        const de = +f['عدد_أطباء_الأسنان']||0,
              ph = +f['عدد_الصيادلة']||0,            pt = +f['عدد_أطباء_العلاج_الطبيعي']||0,
              nur= +f['عدد_الممرضين']||0,            tot= +f['اجمالى_المهن_الطبية']||0;
        
        const otherStaff = Math.max(0, tot - (hd + de + ph + pt + nur));
        hd += otherStaff; // Add remainder to Human Physicians

        docsH+=hd; docsD+=de; docsP+=ph; docsPt+=pt; docsN+=nur;
        totalDocs += (hd+de+ph+pt+nur);

        const breg=+f['عدد_الاسرة']||0,  bicu=+f['عدد_اسرة_الرعاية']||0,
              bemer=+f['عدد_اسرة_الاستقبال']||0, bburn=+f['عدد_اسرة_الحروق']||0,
              totalB=+f['اجمالى_عدد_الاسرة']||0;
        bedsR+=breg; bedsI+=bicu; bedsE+=bemer; bedsB+=bburn;
        bedsO += Math.max(0, totalB-(breg+bicu+bemer+bburn));
        totalBeds += totalB;
        totalNurses += nur;

        if (isAccredited(f)) accCount++;
    });

    document.getElementById('kpi-total-facilities').innerText = totalFacs.toLocaleString();
    document.getElementById('kpi-total-doctors').innerText    = totalDocs.toLocaleString();
    if (document.getElementById('kpi-total-beds'))
        document.getElementById('kpi-total-beds').innerText   = totalBeds.toLocaleString();
    if (document.getElementById('kpi-total-nurses'))
        document.getElementById('kpi-total-nurses').innerText = totalNurses.toLocaleString();
    if (document.getElementById('kpi-accredited-count'))
        document.getElementById('kpi-accredited-count').innerText = 'المعتمدة: ' + accCount.toLocaleString();

    renderAccreditationChart(accCount, totalFacs - accCount);
    renderMiniDonutChart(accCount, totalFacs);
    renderProfessionsChart(docsH, docsD, docsP, docsPt, docsN);
    renderBedsChart(bedsR, bedsI, bedsE, bedsB, bedsO);

    // Store for modal
    currentBedStats = { r:bedsR, i:bedsI, e:bedsE, b:bedsB, o:bedsO, total:totalBeds };
    currentStaffStats = { h:docsH, d:docsD, p:docsP, pt:docsPt, n:docsN, total:totalDocs };
}

// ─── Table ─────────────────────────────────────────────────────────────────
function renderTable(data) {
    const tbody = document.querySelector('#facilities-table tbody');
    tbody.innerHTML = '';
    [...data].sort((a,b) => (a['اسم_المنشأة']||'').localeCompare(b['اسم_المنشأة']||'','ar'))
        .forEach(fac => {
            const acc = isAccredited(fac);
            const tr = document.createElement('tr');
            tr.onclick = () => { showDetailsInSidebar(fac); plotSingleMarker(fac); updateMetrics([fac]); };
            tr.innerHTML = `
                <td><i class="fa fa-map-marker-alt" style="color:var(--border-gold);margin-left:5px;"></i> ${fac['اسم_المنشأة']||'بدون اسم'}</td>
                <td>${fac['المحافظة']||'-'}</td>
                <td>${fac['المركز']||fac['الادارة']||'-'}</td>
                <td>${fac['الجهة_التابعة']||'-'}</td>
                <td>${fac['نوع_المنشأة']||'-'}</td>
                <td><span class="td-status ${acc?'st-accredited':'st-none'}">${acc?'معتمد':'غير معتمد'}</span></td>`;
            tbody.appendChild(tr);
        });
}

// ─── Map Markers ───────────────────────────────────────────────────────────
function renderMarkers(data) {
    markersGroup.clearLayers();
    data.forEach(fac => {
        const lat = parseFloat(fac['خط_العرض__Y___Latitude_']);
        const lng = parseFloat(fac['خط_الطول__X___Longitude_']);
        if (isNaN(lat) || isNaN(lng)) return;

        const acc = isAccredited(fac);
        const icon = L.circleMarker([lat, lng], {
            radius: 7,
            fillColor: acc ? '#10b981' : '#0ea5e9',
            color: acc ? '#065f46' : '#0369a1',
            weight: 1.5,
            opacity: 1,
            fillOpacity: 0.85
        });

        const popupHtml = `
            <div dir="rtl" style="font-family:'Cairo';min-width:180px;">
                <div class="popup-title">${fac['اسم_المنشأة']||'-'}</div>
                <div style="font-size:12px;color:#9ca3af;margin-bottom:6px;">${fac['نوع_المنشأة']||''}</div>
                <div style="font-size:12px;"><b>المحافظة:</b> ${fac['المحافظة']||'-'}</div>
                <div style="font-size:12px;"><b>المركز:</b> ${fac['المركز']||fac['الادارة']||'-'}</div>
                <div style="font-size:12px;"><b>الجهة:</b> ${fac['الجهة_التابعة']||'-'}</div>
                <div style="margin-top:6px;">
                    <span class="td-status ${acc?'st-accredited':'st-none'}">${acc?'معتمد':'غير معتمد'}</span>
                </div>
            </div>`;

        icon.bindPopup(popupHtml, {maxWidth: 280});
        icon.on('click', () => { openFacilityModal(fac); showDetailsInSidebar(fac); });
        markersGroup.addLayer(icon);
    });
}

// ─── Single Marker (blinking) ──────────────────────────────────────────────
function plotSingleMarker(fac) {
    markersGroup.clearLayers();
    const lat = parseFloat(fac['خط_العرض__Y___Latitude_']);
    const lng = parseFloat(fac['خط_الطول__X___Longitude_']);
    if (isNaN(lat) || isNaN(lng)) return;

    const blinkIcon = L.divIcon({ className: 'blinking-marker', iconSize: [20,20], iconAnchor: [10,10] });
    const m = L.marker([lat, lng], { icon: blinkIcon });
    m.on('click', () => openFacilityModal(fac));
    markersGroup.addLayer(m);
    map.setView([lat, lng], 14, { animate: true });
}

// ─── Sidebar Details ──────────────────────────────────────────────────────
function showDetailsInSidebar(fac) {
    if (!fac) return;
    document.getElementById('sidebar-details-container').innerHTML =
        `<h3 style="color:var(--border-gold);font-size:15px;margin-bottom:8px;">${fac['اسم_المنشأة']}</h3>
         <p style="font-size:12px;color:#9ca3af;">تم تحديدها على الخريطة. اضغط على العلامة لعرض كافة التفاصيل.</p>`;
}

// ─── Governorate Info ─────────────────────────────────────────────────────
function renderGovInfo(govName) {
    const g = governoratesData[govName] || {
        population:'غير متوفر', poverty:'غير متوفر', borders:'غير متوفر'
    };
    document.getElementById('sidebar-details-container').innerHTML = `
        <h3 style="color:var(--border-gold);font-size:15px;margin-bottom:12px;text-align:center;">بيانات محافظة ${govName}</h3>
        <div class="detail-row">
            <span class="detail-label">عدد السكان</span>
            <span class="detail-value">${g.population}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">نسبة الفقر</span>
            <span class="detail-value">${g.poverty}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">الحدود الجغرافية</span>
            <span class="detail-value" style="white-space:normal;line-height:1.6;">${g.borders}</span>
        </div>`;
}

// ─── Highlight Governorate Boundary ──────────────────────────────────────
async function highlightGovernorate(govName) {
    if (govBoundaryLayer) { map.removeLayer(govBoundaryLayer); govBoundaryLayer = null; }
    if (!govName) return;
    try {
        const query = encodeURIComponent('محافظة ' + govName);
        const res = await fetch(`https://nominatim.openstreetmap.org/search.php?q=${query}&polygon_geojson=1&format=json`);
        const data = await res.json();
        const found = data.find(i => i.geojson && (i.geojson.type==='Polygon'||i.geojson.type==='MultiPolygon'));
        if (found) {
            govBoundaryLayer = L.geoJSON(found.geojson, {
                style: { color:'#00ccff', weight:3, opacity:0.9, fillColor:'#00ccff', fillOpacity:0.08, className:'blinking-boundary' }
            }).addTo(map);
            map.fitBounds(govBoundaryLayer.getBounds(), {padding:[20,20], maxZoom:13});
        }
    } catch(e) { console.error('Boundary fetch error:', e); }
}

// ─── Facility Modal ───────────────────────────────────────────────────────
const facilityModal = document.getElementById('facility-modal');

document.querySelector('#facility-modal .close-modal').addEventListener('click', () => {
    facilityModal.style.display = 'none';
});

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function () {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        this.classList.add('active');
        document.getElementById(this.getAttribute('data-tab')).classList.add('active');
    });
});

function openFacilityModal(fac) {
    document.getElementById('modal-facility-name').innerText = fac['اسم_المنشأة'] || 'بدون اسم';

    // ── عدد المهن الطبية (Workforce) ──
    const staffKeys = [
        'عدد_الاطباء_البشريين','عدد_أطباء_الأسنان','عدد_الصيادلة','عدد_أطباء_العلاج_الطبيعي',
        'عدد_الممرضين','اجمالى_المهن_الطبية','عدد_الموظفين_الاداريين','عدد_العمال',
        'عدد_المسعفين','عدد_سائقي_سيارات_الاسعاف','اجمالى_الاداريين_والفنيين_والعمال',
        'تخصص_المستشفى','عدد_ساعات_الخدمة'
    ];
    // ── التجهيزات (Equipment) ──
    const equipKeys = [
        'عدد_الاسرة','عدد_اسرة_الرعاية','عدد_اسرة_الاستقبال','عدد_اسرة_الحروق','اجمالى_عدد_الاسرة',
        'عدد_الغرف','عدد_الغرف_المكيفة','عدد_غرف_العمليات','عدد_سيارات_الاسعاف',
        'عدد_اجهزة_التنفس_الصناعى','عدد_ثلاجات_الموتى','عدد_اكياس_الموتى',
        'رصيد_احتياطى_للأدوية','عدد_مامو_جرام','عدد_الحضانات','عدد_ماكينات_الغسيل_الكلوى',
        'عدد_اشعة_عادية','عدد_موجات_فوق_صوتية','عدد_المناظير','عدد_اشعة_مقطعية',
        'عدد_ايكو','قسطرة_طرفية','عدد_اجهزة_رسم_القلب','عدد_دبلر','عدد_قسطرة_قلب',
        'عدد_رنين_مغناطيسي','عدد_اجهزة_الاشعة_السينية','عدد_تانكات_الأكسجين','عدد_مولدات_الكهرباء'
    ];
    // ── الاعتماد (Accreditation) ──
    const accredKeys = [
        'تاريخ_التسجيل','نوع_الاعتماد','تاريخ_الاعتماد_المبدئي','تاريخ_انتهاء_الاعتماد',
        'تاريخ_اعادة_التسجيل','رقم_تسجيل','التعاقد_مع_التأمين','ملاحظات_حالة_تسجيل',
        'تسجيل','اعتماد','إعتماد','مبدئي','تأمين','تامين','تعاقد','قرار'
    ];
    const excludeKeys = ['id','خط_العرض__Y___Latitude_','خط_الطول__X___Longitude_','اسم_المنشأة','عدد_العمال'];

    let basicH='', staffH='', equipH='', accredH='';

    for (const key in fac) {
        if (!fac.hasOwnProperty(key)) continue;
        const raw = fac[key];
        if (excludeKeys.includes(key) || key.includes('تاريخ') || raw===null||raw===''||raw==='0'||raw===0) continue;
        const val   = formatValue(key, raw);
        const label = key.replace(/_/g,' ');
        const row = `<div class="detail-row"><span class="detail-label">${label}</span><span class="detail-value">${val}</span></div>`;

        if      (staffKeys.some(k  => key.includes(k) || k.includes(key)))  staffH  += row;
        else if (equipKeys.some(k  => key.includes(k) || k.includes(key)))  equipH  += row;
        else if (accredKeys.some(k => key.includes(k) || k.includes(key)))  accredH += row;
        else basicH += row;
    }

    document.getElementById('tab-basic').innerHTML  = basicH  ? `<div class="modal-grid">${basicH}</div>`  : '<p style="text-align:center;color:#9ca3af;">لا توجد بيانات أساسية</p>';
    document.getElementById('tab-staff').innerHTML  = staffH  ? `<div class="modal-grid">${staffH}</div>`  : '<p style="text-align:center;color:#9ca3af;">لا توجد بيانات قوى عاملة</p>';
    document.getElementById('tab-equip').innerHTML  = equipH  ? `<div class="modal-grid">${equipH}</div>`  : '<p style="text-align:center;color:#9ca3af;">لا توجد بيانات تجهيزات</p>';
    document.getElementById('tab-accred').innerHTML = accredH ? `<div class="modal-grid">${accredH}</div>` : '<p style="text-align:center;color:#9ca3af;">لا توجد بيانات اعتماد</p>';

    document.querySelectorAll('.tab-btn')[0].click();
    facilityModal.style.display = 'flex';
}

// ─── Governorate Report Modal ──────────────────────────────────────────────
document.querySelector('#gov-report-modal .close-modal').addEventListener('click', closeGovReport);

function closeGovReport() {
    document.getElementById('gov-report-modal').style.display = 'none';
}

function printGovReport() {
    const govName   = document.getElementById('report-gov-name').innerText;
    const totalFacs = document.getElementById('r-total-facs').innerText;
    const accPct    = document.getElementById('r-acc-percent').innerText;
    const totalStaff= document.getElementById('r-total-staff').innerText;
    const totalBeds = document.getElementById('r-total-beds').innerText;
    const govPop    = document.getElementById('r-gov-pop').innerText;
    const govPoverty= document.getElementById('r-gov-poverty').innerText;
    const govBorders= document.getElementById('r-gov-borders').innerText;

    // Capture entity cards HTML
    const entityHTML = document.getElementById('report-entity-container').innerHTML;

    // Capture indicators HTML
    const indicHTML  = document.getElementById('report-indicators-container').innerHTML;

    // Export charts as images
    const centerImg  = document.getElementById('report-center-chart')?.toDataURL('image/png') || '';
    const typeImg    = document.getElementById('report-type-chart')?.toDataURL('image/png')   || '';

    const printWin = window.open('', '_blank', 'width=900,height=700');
    printWin.document.write(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>${govName}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Cairo', sans-serif; background: #fff; color: #111; padding: 24px; direction: rtl; }
  h1  { font-size: 22px; color: #0369a1; margin-bottom: 4px; }
  .sub { font-size: 12px; color: #6b7280; margin-bottom: 20px; }
  .section-title { font-size: 14px; font-weight: 700; color: #0369a1; border-bottom: 2px solid #0369a1;
                   padding-bottom: 4px; margin: 18px 0 12px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 16px; }
  .kpi-card { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px;
              padding: 12px; text-align: center; }
  .kpi-card h4 { font-size: 22px; color: #0369a1; margin-top: 4px; }
  .kpi-card span { font-size: 11px; color: #6b7280; }
  .meta-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; margin-bottom: 16px; }
  .meta-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; }
  .meta-card .label { font-size: 10px; color: #6b7280; margin-bottom: 3px; }
  .meta-card .value { font-size: 12px; font-weight: 600; }
  .charts-row { display: grid; grid-template-columns: 2fr 1fr; gap: 14px; margin-bottom: 16px; }
  .charts-row img { width: 100%; border-radius: 6px; border: 1px solid #e5e7eb; }
  .entity-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; margin-bottom: 16px; }
  .entity-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px;
                 text-align: center; background: #f9fafb; }
  .entity-card .count { font-size: 20px; font-weight: 800; color: #0369a1; }
  .entity-card .pct   { font-size: 10px; color: #6b7280; }
  .entity-card .name  { font-size: 10px; color: #374151; margin-top: 4px; line-height: 1.3; }
  .indic-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; }
  .indic-item { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 10px;
                display: flex; align-items: center; gap: 8px; }
  .indic-val  { font-size: 16px; font-weight: 800; color: #0369a1; }
  .indic-lbl  { font-size: 10px; color: #6b7280; }
  .footer { margin-top: 24px; text-align: center; font-size: 10px; color: #9ca3af;
            border-top: 1px solid #e5e7eb; padding-top: 10px; }
  @media print {
    body { padding: 10px; }
    button { display: none !important; }
  }
</style>
</head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;">
    <div>
      <h1>${govName}</h1>
      <div class="sub">هيئة GAHAR للاعتماد والرقابة الصحية — تقرير إحصائي شامل</div>
    </div>
    <div style="text-align:left;font-size:11px;color:#6b7280;">
      تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG',{year:'numeric',month:'long',day:'numeric'})}
    </div>
  </div>

  <div class="section-title">📊 مؤشرات المحافظة الرئيسية</div>
  <div class="kpi-grid">
    <div class="kpi-card"><span>إجمالي المنشآت</span><h4>${totalFacs}</h4></div>
    <div class="kpi-card"><span>نسبة الاعتماد</span><h4>${accPct}</h4></div>
    <div class="kpi-card"><span>عدد المهن الطبية</span><h4>${totalStaff}</h4></div>
    <div class="kpi-card"><span>إجمالي الأسرة</span><h4>${totalBeds}</h4></div>
  </div>

  <div class="section-title">🗺️ البيانات الديموغرافية</div>
  <div class="meta-grid">
    <div class="meta-card"><div class="label">عدد السكان</div><div class="value">${govPop}</div></div>
    <div class="meta-card"><div class="label">نسبة الفقر</div><div class="value">${govPoverty}</div></div>
    <div class="meta-card"><div class="label">الحدود الجغرافية</div><div class="value" style="font-size:10px;">${govBorders}</div></div>
  </div>

  ${centerImg || typeImg ? `
  <div class="section-title">📈 التوزيع الجغرافي ونوع المنشآت</div>
  <div class="charts-row">
    ${centerImg ? `<img src="${centerImg}" alt="توزيع المراكز">` : '<div></div>'}
    ${typeImg   ? `<img src="${typeImg}"   alt="نوع المنشآت">`   : ''}
  </div>` : ''}

  <div class="section-title">🏢 توزيع المنشآت حسب الجهة التابعة</div>
  <div class="entity-grid">${
    document.getElementById('report-entity-container').querySelectorAll('.entity-card')
    .length ? Array.from(document.getElementById('report-entity-container').querySelectorAll('.entity-card')).map(c=>`
      <div class="entity-card">
        <div class="count">${c.querySelector('.entity-card-count')?.innerText||''}</div>
        <div class="pct">${c.querySelector('.entity-card-pct')?.innerText||''}</div>
        <div class="name">${c.querySelector('.entity-card-name')?.innerText||''}</div>
      </div>`).join('') : entityHTML
  }</div>

  <div class="section-title">⚡ مؤشرات الأداء</div>
  <div class="indic-grid">${
    Array.from(document.getElementById('report-indicators-container').querySelectorAll('.indicator-item')).map(el=>`
      <div class="indic-item">
        <div>
          <div class="indic-val">${el.querySelector('.indicator-val')?.innerText||''}</div>
          <div class="indic-lbl">${el.querySelector('.indicator-lbl')?.innerText||''}</div>
        </div>
      </div>`).join('') || indicHTML
  }</div>

  <div class="footer">
    تم إعداد هذا التقرير بواسطة منظومة خريطة المنشآت الصحية — هيئة GAHAR © ${new Date().getFullYear()}
  </div>

  <script>window.onload = () => { window.print(); }<\/script>
</body></html>`);
    printWin.document.close();
}

function openGovReport(govName) {
    const govData = facilitiesData.filter(f => f['المحافظة'] === govName);
    if (!govData.length) { alert('لا توجد بيانات كافية لهذه المحافظة حالياً'); return; }

    document.getElementById('report-gov-name').innerText = `تحليل بيانات محافظة ${govName}`;
    document.getElementById('gov-report-modal').style.display = 'flex';

    const govMeta = governoratesData[govName] || {population:'-', poverty:'-', borders:'-'};
    document.getElementById('r-gov-pop').innerText     = govMeta.population;
    document.getElementById('r-gov-poverty').innerText = govMeta.poverty;
    document.getElementById('r-gov-borders').innerText = govMeta.borders;

    let totalFacs=govData.length, accCount=0, staffCount=0, bedCount=0;
    const centers={}, types={}, entities={};

    govData.forEach(f => {
        if (isAccredited(f)) accCount++;
        staffCount += +f['اجمالى_المهن_الطبية']||0;
        bedCount   += +f['اجمالى_عدد_الاسرة']||0;
        const c = f['المركز']||'غير محدد'; centers[c]=(centers[c]||0)+1;
        const t = f['نوع_المنشأة']||'أخرى'; types[t]=(types[t]||0)+1;
        const e = f['الجهة_التابعة']||'غير محدد'; entities[e]=(entities[e]||0)+1;
    });

    document.getElementById('r-total-facs').innerText  = totalFacs.toLocaleString();
    document.getElementById('r-acc-percent').innerText = Math.round(accCount/totalFacs*100)+'%';
    document.getElementById('r-total-staff').innerText = staffCount.toLocaleString();
    document.getElementById('r-total-beds').innerText  = bedCount.toLocaleString();

    // Center chart
    const centerCtx = document.getElementById('report-center-chart').getContext('2d');
    if (reportChartCenter) reportChartCenter.destroy();
    const sortedCenters = Object.entries(centers).sort((a,b)=>b[1]-a[1]).slice(0,10);
    reportChartCenter = new Chart(centerCtx, {
        type:'bar',
        data:{ labels:sortedCenters.map(c=>c[0]), datasets:[{label:'عدد المنشآت',data:sortedCenters.map(c=>c[1]),backgroundColor:'#0ea5e9',borderRadius:4}]},
        options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#fff',maxRotation:45,minRotation:45},grid:{display:false}},y:{beginAtZero:true,ticks:{color:'#fff'},grid:{color:'#1f2937'}}}}
    });

    // Entity chart (using report-type-chart canvas)
    const typeCtx = document.getElementById('report-type-chart').getContext('2d');
    if (reportChartType) reportChartType.destroy();
    const sortedChartEntities = Object.entries(entities).sort((a,b)=>b[1]-a[1]);
    reportChartType = new Chart(typeCtx, {
        type:'bar',
        data:{labels:sortedChartEntities.map(e=>e[0]),datasets:[{label:'عدد المنشآت',data:sortedChartEntities.map(e=>e[1]),backgroundColor:['#0ea5e9','#10b981','#f59e0b','#8b5cf6','#fb7185','#f97316','#2dd4bf','#6366f1'],borderRadius:4}]},
        options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#fff',font:{size:9},maxRotation:45,minRotation:45},grid:{display:false}},y:{beginAtZero:true,ticks:{color:'#fff',stepSize:25},grid:{color:'#1f2937'}}}}
    });

    let popNumber = 0;
    if (govMeta.population && govMeta.population !== '-') {
        let match = govMeta.population.match(/([\d\.]+)/);
        if (match) {
            popNumber = parseFloat(match[1]);
            if (govMeta.population.includes('مليون')) popNumber *= 1000000;
            else if (govMeta.population.includes('الف') || govMeta.population.includes('ألف')) popNumber *= 1000;
        }
    }
    let whoVal = '';
    let whoDocsVal = '';
    if (popNumber > 0) {
        let programRatio = (bedCount / popNumber) * 10000;
        whoVal = programRatio.toFixed(1) + ' سرير فعلي';
        
        let programDocsRatio = (staffCount / popNumber) * 10000;
        whoDocsVal = programDocsRatio.toFixed(1) + ' كادر فعلي';
    } else {
        let capacity = Math.round((bedCount / 50) * 10000);
        whoVal = 'يسع ' + capacity.toLocaleString() + ' مريض';
        
        let capacityDocs = Math.round((staffCount / 23) * 10000);
        whoDocsVal = 'يغطي ' + capacityDocs.toLocaleString() + ' مواطن';
    }

    // Indicators
    const indicators=[
        {label:'متوسط الأطباء / منشأة', val:(staffCount/totalFacs).toFixed(1), icon:'fa-user-md'},
        {label:'متوسط الأسرة / منشأة',  val:(bedCount/totalFacs).toFixed(1),   icon:'fa-bed'},
        {label:'أكثر المراكز منشآت',    val:sortedCenters[0]?.[0]||'-',        icon:'fa-star'},
        {label:'النسبة لمعيار WHO (50 سرير لكل 10000 مريض)', val:whoVal, icon:'fa-heartbeat'},
        {label:'النسبة لمعيار WHO (23 مهنة طبية لـ 10000)', val:whoDocsVal, icon:'fa-stethoscope'}
    ];
    document.getElementById('report-indicators-container').innerHTML = indicators.map(i=>`
        <div class="indicator-item">
            <div class="indicator-icon"><i class="fa ${i.icon}"></i></div>
            <div class="indicator-text">
                <span class="indicator-val">${i.val}</span>
                <span class="indicator-lbl">${i.label}</span>
            </div>
        </div>`).join('');

    // ── Type (تنوع نوع المنشآت) breakdown — as cards ──
    const sortedTypes = Object.entries(types).sort((a,b) => b[1]-a[1]);
    const entityColors = ['#0ea5e9','#10b981','#f59e0b','#8b5cf6','#fb7185','#f97316','#2dd4bf','#6366f1'];

    // Update total badge
    const totalBadge = document.getElementById('report-entity-total');
    if (totalBadge) totalBadge.innerText = `إجمالي المنشآت: ${totalFacs.toLocaleString()}`;

    document.getElementById('report-entity-container').innerHTML =
        sortedTypes.map(([name, count], i) => {
            const pct  = Math.round(count / totalFacs * 100);
            const col  = entityColors[i % entityColors.length];
            return `
            <div class="entity-card" style="border-color:${col}33;">
                <div class="entity-card-icon" style="color:${col};"><i class="fa fa-hospital"></i></div>
                <div class="entity-card-count" style="color:${col};">${count}</div>
                <div class="entity-card-pct">${pct}%</div>
                <div class="entity-card-name" title="${name}">${name}</div>
            </div>`;
        }).join('');
}

// ─── Charts ────────────────────────────────────────────────────────────────
function renderAccreditationChart(acc, none) {
    const ctx = document.getElementById('accreditation-chart').getContext('2d');
    if (chartAccreditation) chartAccreditation.destroy();
    chartAccreditation = new Chart(ctx, {
        type:'bar',
        data:{labels:['معتمد','غير معتمد'],datasets:[{label:'عدد المنشآت',data:[acc,none],backgroundColor:['#10b981','#4b5563'],borderRadius:4,borderWidth:0}]},
        options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{color:'#fff',font:{family:'Cairo'}},grid:{color:'#1f2937'}},x:{ticks:{color:'#fff',font:{family:'Cairo'}},grid:{display:false}}}}
    });
}

function renderMiniDonutChart(acc, total) {
    const ctx = document.getElementById('top-donut-chart').getContext('2d');
    if (chartDonut) chartDonut.destroy();
    chartDonut = new Chart(ctx, {
        type:'bar',
        data:{labels:['معتمد'],datasets:[{data:[acc],backgroundColor:['#0ea5e9'],borderRadius:2}]},
        options:{responsive:true,maintainAspectRatio:false,plugins:{tooltip:{enabled:false},legend:{display:false}},scales:{x:{display:false},y:{display:false,max:total}},animation:{duration:0}}
    });
}

function renderProfessionsChart(h,d,p,pt,n) {
    const ctx = document.getElementById('professions-chart');
    if (!ctx) return;
    if (chartProfessions) chartProfessions.destroy();
    chartProfessions = new Chart(ctx.getContext('2d'), {
        type:'bar',
        data:{labels:['بشريين','أسنان','صيادلة','علاج طبيعي','تمريض'],datasets:[{data:[h,d,p,pt,n],backgroundColor:['#3b82f6','#10b981','#f59e0b','#8b5cf6','#fb7185'],borderRadius:3}]},
        options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#fff',font:{family:'Cairo',size:9},maxRotation:45,minRotation:45},grid:{display:false}},y:{beginAtZero:true,ticks:{color:'#fff',font:{size:8}},grid:{color:'#1f2937'}}}}
    });
}

function renderBedsChart(r,i,e,b,o) {
    const ctx = document.getElementById('beds-chart');
    if (!ctx) return;
    if (chartBeds) chartBeds.destroy();
    chartBeds = new Chart(ctx.getContext('2d'), {
        type:'bar',
        data:{labels:['داخلي','رعاية','استقبال','حروق','أخرى'],datasets:[{data:[r,i,e,b,o],backgroundColor:['#2dd4bf','#fb7185','#eab308','#f97316','#6b7280'],borderRadius:3}]},
        options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#fff',font:{family:'Cairo',size:9},maxRotation:45,minRotation:45},grid:{display:false}},y:{beginAtZero:true,ticks:{color:'#fff',font:{size:8}},grid:{color:'#1f2937'}}}}
    });
}

// ─── Beds Details Modal Logic ─────────────────────────────────────────────
const bedsModal = document.getElementById('beds-modal');
const bedsKPI   = document.getElementById('kpis-beds-card');

if (bedsKPI) {
    bedsKPI.addEventListener('click', () => {
        const container = document.getElementById('beds-details-container');
        const s = currentBedStats;
        const total = s.total || 1;

        const items = [
            { label: 'أسرة إقامة (داخلي)', count: s.r, icon: 'fa-bed', color: '#2dd4bf' },
            { label: 'أسرة رعاية مركزة',   count: s.i, icon: 'fa-heart-pulse', color: '#fb7185' },
            { label: 'أسرة استقبال وطوارئ', count: s.e, icon: 'fa-truck-medical', color: '#eab308' },
            { label: 'أسرة حروق',          count: s.b, icon: 'fa-fire-extinguisher', color: '#f97316' },
            { label: 'أسرة أخرى',          count: s.o, icon: 'fa-hospital-user', color: '#6b7280' }
        ];

        container.innerHTML = items.map(item => {
            const pct = Math.round((item.count / total) * 100);
            return `
                <div class="bed-detail-card">
                    <div class="bed-icon-box" style="color:${item.color}; background: ${item.color}15;">
                        <i class="fa ${item.icon}"></i>
                    </div>
                    <div class="bed-info-box">
                        <span class="bed-label">${item.label}</span>
                        <div style="display:flex; align-items:baseline;">
                            <span class="bed-count">${item.count.toLocaleString()}</span>
                            <span class="bed-percentage">${pct}%</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        bedsModal.style.display = 'flex';
    });
}

const closeBedsBtn = document.getElementById('close-beds-modal');
if (closeBedsBtn) {
    closeBedsBtn.addEventListener('click', () => {
        bedsModal.style.display = 'none';
    });
}

// ─── Staff Details Modal Logic ─────────────────────────────────────────────
const staffModal = document.getElementById('staff-modal');
const staffKPI   = document.getElementById('kpis-staff-card');

if (staffKPI) {
    staffKPI.addEventListener('click', () => {
        const container = document.getElementById('staff-details-container');
        const s = currentStaffStats || {};
        const total = s.total || 1;

        const items = [
            { label: 'بشريين', count: s.h||0, icon: 'fa-user-doctor', color: '#3b82f6' },
            { label: 'أسنان',   count: s.d||0, icon: 'fa-tooth', color: '#10b981' },
            { label: 'صيادلة', count: s.p||0, icon: 'fa-pills', color: '#f59e0b' },
            { label: 'علاج طبيعي', count: s.pt||0, icon: 'fa-person-walking', color: '#8b5cf6' },
            { label: 'تمريض', count: s.n||0, icon: 'fa-user-nurse', color: '#fb7185' }
        ];

        container.innerHTML = items.map(item => {
            const pct = Math.round((item.count / total) * 100);
            return `
                <div class="bed-detail-card">
                    <div class="bed-icon-box" style="color:${item.color}; background: ${item.color}15;">
                        <i class="fa ${item.icon}"></i>
                    </div>
                    <div class="bed-info-box">
                        <span class="bed-label">${item.label}</span>
                        <div style="display:flex; align-items:baseline;">
                            <span class="bed-count">${item.count.toLocaleString()}</span>
                            <span class="bed-percentage">${pct}%</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        staffModal.style.display = 'flex';
    });
}

const closeStaffBtn = document.getElementById('close-staff-modal');
if (closeStaffBtn) {
    closeStaffBtn.addEventListener('click', () => {
        staffModal.style.display = 'none';
    });
}

// ─── Tips and Stats Modal Logic ─────────────────────────────────────────────
const tipsModal = document.getElementById('tips-modal');
const tipsBtn   = document.getElementById('tips-stats-btn');
const closeTipsBtn = document.getElementById('close-tips-modal');

function generateDynamicInsights() {
    const data = typeof currentFilteredData !== 'undefined' && currentFilteredData ? currentFilteredData : facilitiesData;
    const container = document.getElementById('dynamic-insights-container');
    if (!data || data.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#9ca3af;">لا توجد بيانات متاحة للاستنتاج حالياً.</p>';
        return;
    }

    const facCount = data.length;
    let accCount = 0;
    const typeCount = {};
    const entityCount = {};

    data.forEach(f => {
        if (isAccredited(f)) accCount++;
        const t = f['نوع_المنشأة'] || 'أخرى';
        typeCount[t] = (typeCount[t] || 0) + 1;
        const e = f['الجهة_التابعة'] || 'أخرى';
        entityCount[e] = (entityCount[e] || 0) + 1;
    });

    const topType = Object.entries(typeCount).sort((a,b)=>b[1]-a[1])[0];
    const topEntity = Object.entries(entityCount).sort((a,b)=>b[1]-a[1])[0];

    const s = typeof currentStaffStats !== 'undefined' && currentStaffStats ? currentStaffStats : {total:0};
    const b = typeof currentBedStats !== 'undefined' && currentBedStats ? currentBedStats : {total:0};

    const avgStaff = (s.total / facCount).toFixed(1);
    const avgBeds  = (b.total / facCount).toFixed(1);
    const accPct   = Math.round((accCount / facCount) * 100);

    let html = `
    <div class="tips-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; padding: 10px;">
        <div style="background: rgba(14, 165, 233, 0.05); border: 1px solid #0ea5e955; padding: 15px; border-radius: 8px;">
            <h4 style="color: #0ea5e9; font-size: 15px; margin-bottom: 8px;"><i class="fa fa-users"></i> الكثافة الطبية</h4>
            <p style="font-size: 13px; color: #d1d5db; line-height: 1.6;">
                بناءً على التصفية الحالية لعدد <b>${facCount}</b> منشأة، يبلغ متوسط الكادر الطبي <b>${avgStaff}</b> فرد لكل منشأة، بمتوسط سعة <b>${avgBeds}</b> سرير لكل منشأة.
            </p>
        </div>
        <div style="background: rgba(16, 185, 129, 0.05); border: 1px solid #10b98155; padding: 15px; border-radius: 8px;">
            <h4 style="color: #10b981; font-size: 15px; margin-bottom: 8px;"><i class="fa fa-certificate"></i> معدل الاعتماد</h4>
            <p style="font-size: 13px; color: #d1d5db; line-height: 1.6;">
                نسبة المنشآت المعتمدة أو المسجلة مبدئياً هي <b>${accPct}%</b> (بإجمالي ${accCount} منشأة)، مما يعكس مدى الاستعداد والتأهيل في هذا النطاق لتطبيق التأمين الشامل.
            </p>
        </div>
        <div style="background: rgba(245, 158, 11, 0.05); border: 1px solid #f59e0b55; padding: 15px; border-radius: 8px;">
            <h4 style="color: #f59e0b; font-size: 15px; margin-bottom: 8px;"><i class="fa fa-building"></i> النمط الغالب للمنشآت</h4>
            <p style="font-size: 13px; color: #d1d5db; line-height: 1.6;">
                النمط وتصنيف المنشآت السائد هنا هو "<b>${topType[0]}</b>" حيث تمثل وحدها <b>${topType[1]}</b> منشأة، مما يشير إلى التركيز المكثف على هذا النوع من الخدمات في الموقع.
            </p>
        </div>
        <div style="background: rgba(139, 92, 246, 0.05); border: 1px solid #8b5cf655; padding: 15px; border-radius: 8px;">
            <h4 style="color: #8b5cf6; font-size: 15px; margin-bottom: 8px;"><i class="fa fa-sitemap"></i> التبعية الإدارية</h4>
            <p style="font-size: 13px; color: #d1d5db; line-height: 1.6;">
                الجهة الإدارية الأكثر استحواذاً على النطاق والعبء الطبي هي "<b>${topEntity[0]}</b>" حيث تدير <b>${topEntity[1]}</b> منشأة.
            </p>
        </div>
    </div>`;
    
    let ratioText = '';
    if (b.total > 0 && s.total > 0) {
        const ratio = (s.total / b.total).toFixed(1);
        ratioText = `يتوفر حوالي <b>${ratio}</b> كادر طبي لكل سرير متاح بمتوسط النطاق المختار. ` + 
                    (ratio > 3 ? 'وهذا يمثل كثافة قوى عاملة آمنة مقارنة بسعة الأسرة السريرية.' : 'وهذا يعكس تحدياً إدارياً يتطلب إعادة توزيع أو كفاءة تشغيل الموارد المتاحة للأسرة.');
    }

    html += `
    <div style="margin: 15px 10px 5px 10px; padding: 15px; background: rgba(255,255,255,0.02); border-radius: 8px; border: 1px dashed #374151;">
        <h4 style="color: var(--border-gold); font-size: 14px; margin-bottom: 10px;"><i class="fa fa-lightbulb"></i> استنتاج تحليلي مجمع</h4>
        <p style="font-size: 13px; color: #9ca3af; line-height: 1.8; margin:0;">
            ${ratioText}
            <br><i>* تم اشتقاق وحساب هذه المعدلات ديناميكياً بناءً على حجم وقراءات البيانات التي اخترت تصفيتها لتساعدك في اتخاذ القرار وتوجيه الموارد بذكاء.</i>
        </p>
    </div>`;

    container.innerHTML = html;
}

if (tipsBtn) {
    tipsBtn.addEventListener('click', () => {
        generateDynamicInsights();
        tipsModal.style.display = 'flex';
    });
}
if (closeTipsBtn) {
    closeTipsBtn.addEventListener('click', () => {
        tipsModal.style.display = 'none';
    });
}

// Close when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === bedsModal) bedsModal.style.display = 'none';
    if (typeof staffModal !== 'undefined' && e.target === staffModal) staffModal.style.display = 'none';
    if (typeof facilityModal !== 'undefined' && e.target === facilityModal) facilityModal.style.display = 'none';
    if (typeof tipsModal !== 'undefined' && e.target === tipsModal) tipsModal.style.display = 'none';
    const govRep = document.getElementById('gov-report-modal');
    if (e.target === govRep) govRep.style.display = 'none';
});

// ─── Export to Excel ───────────────────────────────────────────────────────
const btnExportExcel = document.getElementById('btn-export-excel');
if (btnExportExcel) {
    btnExportExcel.addEventListener('click', (e) => {
        e.preventDefault();
        try {
            if (!currentFilteredData || currentFilteredData.length === 0) {
                alert('لا توجد بيانات لتصديرها');
                return;
            }

            // Generate data payload without 'id' keeping neat Arabic labels
            const exportData = currentFilteredData.map(fac => {
                let row = {};
                // Make sure the primary key is clear and first
                if (fac['اسم_المنشأة']) row['اسم المنشأة'] = fac['اسم_المنشأة'];
                
                for (let key in fac) {
                    if (key === 'id' || key === 'اسم_المنشأة') continue;
                    
                    // Remove underscores from keys to make them legible in Excel
                    let readableKey = key.replace(/_/g, ' ');
                    row[readableKey] = formatValue(key, fac[key] || '');
                }
                return row;
            });

            // Send to backend endpoint for robust Excel generation
            fetch('/api/export_excel', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(exportData)
            })
            .then(res => {
                if (!res.ok) throw new Error("فشل الخادم في إنشاء الملف");
                return res.blob();
            })
            .then(blob => {
                // Download the blob
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                
                const govFilter = document.getElementById('filter-gov')?.value || 'جميع_المحافظات';
                // Even with Arabic naming, Blob download handles naming properly without corrupting the file content string
                a.download = `GAHAR_Export_${govFilter}.xlsx`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
            })
            .catch(err => {
                console.error(err);
                alert("حدث خطأ أثناء التصدير الخادم: " + err.message);
            });
            
        } catch (error) {
            console.error(error);
            alert("حدث خطأ أثناء التصدير: " + error.message);
        }
    });
}
