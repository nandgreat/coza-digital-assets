/**
 * ============================================================
 * GeoMap Component – COZA Analytics Dashboard (v7.0)
 * ============================================================
 *
 * Geographic user location breakdown visualizer with multi-tier spatial drilldown:
 * 1. Global Level: Displays fetched countries with activity markers and heatmaps.
 * 2. State / Region Level: Clicking a country pin drills down to display only fetched
 *    states/regions where downloads occurred within that selected country.
 *    (Map View) Clicking a country pin opens that country's map in a fullscreen modal so the
 *    state -> city drilldowns have room to breathe. Closing the modal returns to the global map.
 * 3. City / County / Area Level: Clicking a state pin drills down to display only fetched
 *    cities/counties/areas where downloads occurred within that selected state/region.
 *
 * FEATURES & CAPABILITIES:
 * - Multi-tier spatial navigation (Country -> State/Region -> City/County/Area) with breadcrumbs.
 * - Dynamic MapLibre GL vector tiles & Carto map styles.
 * - Zoom-responsive COZA Gold-to-Purple activity markers and heatmaps.
 * - Distinct GeoJSON polygon highlight for selected active countries using Stage 1 exact matching.
 * - Interactive hover tooltips (`onmouseover`) with country flags, download stats, and tier metrics.
 * - Sanitized CSV export handling multi-tiered location records.
 * ============================================================
 */

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { createPortal } from 'react-dom';
import {
    Globe,
    Move,
    ChevronDown,
    ChevronUp,
    Search,
    Download,
    X,
    ArrowLeft,
    MapPin,
    Building2,
    LayoutGrid,
    Map as MapIcon,
    Flame,
    Layers,
    ZoomIn,
    ZoomOut,
    RotateCcw,
} from 'lucide-react';
import { MapContainer, CircleMarker, Popup, Tooltip, GeoJSON, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * Dynamic loader for leaflet.heat plugin.
 *
 * @returns {Promise<boolean>}
 */
let heatPluginPromise = null;

function loadHeatPlugin() {
    if (typeof L.heatLayer === 'function') {
        return Promise.resolve(true);
    }

    if (!heatPluginPromise) {
        if (typeof window !== 'undefined') {
            window.L = window.L || L;
        }

        heatPluginPromise = import('leaflet.heat')
            .then((mod) => {
                if (typeof L.heatLayer === 'function') {
                    return true;
                }

                const HeatLayerClass = mod?.default ?? mod;

                if (typeof HeatLayerClass === 'function') {
                    L.HeatLayer = HeatLayerClass;
                    L.heatLayer = (latlngs, options) => new L.HeatLayer(latlngs, options);
                }

                return typeof L.heatLayer === 'function';
            })
            .catch((error) => {
                console.error('[GeoMap] Failed to load leaflet.heat plugin:', error);
                heatPluginPromise = null;
                return false;
            });
    }

    return heatPluginPromise;
}

// MapLibre GL Styles & Leaflet Integration Plugin
import 'maplibre-gl/dist/maplibre-gl.css';
import '@maplibre/maplibre-gl-leaflet';

/**
 * CARTO Vector GL Style JSON Endpoints.
 *
 * @type {Readonly<{voyager: string, darkMatter: string, positron: string}>}
 */
const VECTOR_TILE_STYLES = Object.freeze({
    voyager: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
    darkMatter: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    positron: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
});

/**
 * Common country-name aliases.
 *
 * @type {Readonly<Record<string, string[]>>}
 */
const COUNTRY_NAME_ALIASES = Object.freeze({
    'United States': ['United States of America', 'USA', 'US'],
    'United States of America': ['United States', 'USA', 'US'],
    'United Kingdom': ['UK', 'Great Britain'],
    'United Republic of Tanzania': ['Tanzania'],
    Tanzania: ['United Republic of Tanzania'],
    'Democratic Republic of the Congo': ['DR Congo', 'Congo - Kinshasa'],
    'Republic of the Congo': ['Congo - Brazzaville'],
    'Czech Republic': ['Czechia'],
    Czechia: ['Czech Republic'],
    Myanmar: ['Myanmar (Burma)'],
    'Myanmar (Burma)': ['Myanmar'],
    Swaziland: ['Eswatini'],
    Eswatini: ['Swaziland'],
    Macedonia: ['North Macedonia'],
    'North Macedonia': ['Macedonia'],
    'Republic of Serbia': ['Serbia'],
    Türkiye: ['Turkey', 'Turkiye'],
    Turkey: ['Türkiye', 'Turkiye'],
    Turkiye: ['Türkiye', 'Turkey'],
    'United Arab Emirates': ['UAE', 'Emirates'],
    UAE: ['United Arab Emirates', 'Emirates'],
    Emirates: ['United Arab Emirates', 'UAE'],
});

/**
 * ISO-2 fallback dictionary for commonly returned countries.
 *
 * @type {Readonly<Record<string, string>>}
 */
const COMMON_COUNTRY_ISO2 = Object.freeze({
    Afghanistan: 'af',
    Australia: 'au',
    Austria: 'at',
    Belgium: 'be',
    Benin: 'bj',
    Brazil: 'br',
    Canada: 'ca',
    China: 'cn',
    Denmark: 'dk',
    Egypt: 'eg',
    Finland: 'fi',
    France: 'fr',
    Germany: 'de',
    Ghana: 'gh',
    Greece: 'gr',
    India: 'in',
    Indonesia: 'id',
    Ireland: 'ie',
    Israel: 'il',
    Italy: 'it',
    Japan: 'jp',
    Kenya: 'ke',
    Kuwait: 'kw',
    Lithuania: 'lt',
    Martinique: 'mq',
    Mexico: 'mx',
    Netherlands: 'nl',
    Nigeria: 'ng',
    Norway: 'no',
    Pakistan: 'pk',
    Poland: 'pl',
    Portugal: 'pt',
    Qatar: 'qa',
    Russia: 'ru',
    Rwanda: 'rw',
    'Saudi Arabia': 'sa',
    Singapore: 'sg',
    'South Africa': 'za',
    'South Korea': 'kr',
    Spain: 'es',
    Sweden: 'se',
    Switzerland: 'ch',
    Tanzania: 'tz',
    Thailand: 'th',
    Turkey: 'tr',
    Türkiye: 'tr',
    'United Arab Emirates': 'ae',
    UAE: 'ae',
    Uganda: 'ug',
    Ukraine: 'ua',
    'United Kingdom': 'gb',
    'United States': 'us',
    'United States of America': 'us',
    Zambia: 'zm',
    Zimbabwe: 'zw',
});

/**
 * Sanitizes input text against CSV Formula Injection vulnerabilities.
 *
 * @param {any} input - Raw cell input value.
 * @returns {string} Sanitized string safe for CSV formatting.
 */
const sanitizeCsvCell = (input) => {
    if (input === null || input === undefined) return '""';
    const str = String(input);
    const sanitized = str.replace(/"/g, '""');
    if (/^[=+\-@\t\r]/.test(str)) {
        return `"'${sanitized}`;
    }
    return `"${sanitized}"`;
};

/**
 * Resolves an entry from the Carto metadata registry.
 *
 * @param {Object} registry - Country metadata registry.
 * @param {string} countryName - Country name to resolve.
 * @returns {Object|null} Matched metadata object or null.
 */
const resolveRegistryEntry = (registry, countryName) => {
    if (!registry || !countryName || typeof registry !== 'object') return null;

    if (registry[countryName]) return registry[countryName];

    const normalized = countryName.trim().toLowerCase();
    const directKey = Object.keys(registry).find(
        (key) => key.trim().toLowerCase() === normalized,
    );

    if (directKey) return registry[directKey];

    const aliases = COUNTRY_NAME_ALIASES[countryName] || [];

    for (const alias of aliases) {
        if (registry[alias]) return registry[alias];

        const aliasKey = Object.keys(registry).find(
            (key) => key.trim().toLowerCase() === alias.trim().toLowerCase(),
        );

        if (aliasKey) return registry[aliasKey];
    }

    return null;
};

/**
 * Normalizes an ISO-2 value.
 *
 * @param {any} value - Candidate ISO code.
 * @returns {string|null} Lowercase ISO-2 code or null.
 */
const normalizeIso2 = (value) => {
    const normalized = String(value ?? '').trim().toLowerCase();
    return /^[a-z]{2}$/.test(normalized) && normalized !== 'un' ? normalized : null;
};

/**
 * Resolves an ISO-2 code for a country.
 *
 * @param {string} countryName - Country name.
 * @param {string|null} providedCode - Explicit source ISO code.
 * @param {Object} registry - Carto metadata registry.
 * @returns {string|null} ISO-2 code.
 */
const resolveIso2 = (countryName, providedCode, registry) => {
    const direct = normalizeIso2(providedCode);
    if (direct) return direct;

    const registryEntry = resolveRegistryEntry(registry, countryName);
    const registryCode = normalizeIso2(
        registryEntry?.iso2 ?? registryEntry?.countryCode ?? registryEntry?.code,
    );

    if (registryCode) return registryCode;

    const dictionaryCode = normalizeIso2(COMMON_COUNTRY_ISO2[countryName]);
    if (dictionaryCode) return dictionaryCode;

    const aliases = COUNTRY_NAME_ALIASES[countryName] || [];

    for (const alias of aliases) {
        const aliasCode = normalizeIso2(COMMON_COUNTRY_ISO2[alias]);
        if (aliasCode) return aliasCode;
    }

    for (const alias of aliases) {
        const aliasEntry = resolveRegistryEntry(registry, alias);
        if (aliasEntry) {
            const aliasRegistryCode = normalizeIso2(
                aliasEntry?.iso2 ?? aliasEntry?.countryCode ?? aliasEntry?.code,
            );
            if (aliasRegistryCode) return aliasRegistryCode;
        }
    }

    return null;
};

/**
 * MapLibre GL Vector Tile Component.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.styleUrl] - Vector style URL.
 * @returns {null}
 */
function MapLibreVectorLayer({ styleUrl = VECTOR_TILE_STYLES.voyager }) {
    const map = useMap();

    useEffect(() => {
        if (!map || typeof L.maplibreGL !== 'function') return undefined;

        const vectorLayer = L.maplibreGL({
            style: styleUrl,
            attribution: {},
            maxTileCacheSize: 250,
            transformRequest: (url, resourceType) => {
                if (['Tile', 'Style', 'Source', 'Glyphs', 'Sprite'].includes(resourceType)) {
                    return { url, cache: 'force-cache' };
                }
                return { url };
            },
        });

        vectorLayer.addTo(map);

        return () => {
            map.removeLayer(vectorLayer);
        };
    }, [map, styleUrl]);

    return null;
}

MapLibreVectorLayer.propTypes = {
    styleUrl: PropTypes.string,
};

/**
 * Heatmap Layer Component with zoom-responsive scaling and COZA Gold-to-Purple gradient.
 *
 * @component
 * @param {Object} props
 * @param {Array<[number, number, number]>} [props.points=[]] - [lat, lng, intensity].
 * @param {Object} [props.options={}] - Heatmap options.
 * @param {number} [props.zoom=2] - Current map zoom level.
 * @returns {null}
 */
function HeatmapLayer({ points = [], options = {}, zoom = 2 }) {
    const map = useMap();
    const [pluginReady, setPluginReady] = useState(() => typeof L.heatLayer === 'function');

    useEffect(() => {
        if (pluginReady) return undefined;

        let cancelled = false;

        loadHeatPlugin().then((ready) => {
            if (!cancelled) setPluginReady(ready);
        });

        return () => {
            cancelled = true;
        };
    }, [pluginReady]);

    const responsiveRadius = useMemo(() => {
        if (options.radius) return options.radius;
        return Math.min(Math.max(12, Math.round(14 + (zoom - 2) * 2.2)), 30);
    }, [zoom, options.radius]);

    const responsiveBlur = useMemo(() => {
        if (options.blur) return options.blur;
        return Math.min(Math.max(8, Math.round(10 + (zoom - 2) * 1.5)), 20);
    }, [zoom, options.blur]);

    const cozaGradient = useMemo(() => {
        return options.gradient ?? {
            0.15: '#fff9e8', // Soft Gold tint
            0.35: '#ffd052', // COZA Gold (low activity)
            0.55: '#c09cff', // Soft Amethyst Purple (medium activity)
            0.75: '#8b5cf6', // COZA Royal Purple (high activity)
            1.00: '#461b91', // Deep COZA Purple (very high activity)
        };
    }, [options.gradient]);

    useEffect(() => {
        // BUG FIX #1: this guard was inverted (`=== 'function'`), so the layer was
        // never created once the plugin had loaded. Bail out only while it is missing.
        if (!map || !pluginReady || typeof L.heatLayer !== 'function' || !points.length) return undefined;

        const heatLayer = L.heatLayer(points, {
            radius: responsiveRadius,
            blur: responsiveBlur,
            // BUG FIX #2: leaflet.heat divides every point's intensity by
            // 2^(maxZoom - currentZoom). With maxZoom 18 at zoom 2 that is 1/4096,
            // i.e. an invisible heatmap. A maxZoom of 0 keeps the scale at 1 so the
            // heat looks the same at every zoom level.
            maxZoom: options.maxZoom ?? 0,
            max: options.max ?? 1.0,
            minOpacity: options.minOpacity ?? 0.45,
            gradient: cozaGradient,
        });

        heatLayer.addTo(map);

        return () => {
            map.removeLayer(heatLayer);
        };
    }, [
        map,
        pluginReady,
        points,
        responsiveRadius,
        responsiveBlur,
        options.maxZoom,
        options.max,
        options.minOpacity,
        cozaGradient,
    ]);

    return null;
}

HeatmapLayer.propTypes = {
    points: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)),
    options: PropTypes.object,
    zoom: PropTypes.number,
};

/**
 * Controller component to update map viewport.
 *
 * @component
 * @param {Object} props
 * @param {[number, number]} props.center - Center coordinate.
 * @param {number} props.zoom - Zoom level.
 * @returns {null}
 */
function MapViewController({ center, zoom, focusPoints = [] }) {
    const map = useMap();
    const lastKey = React.useRef(null);

    const lat = center?.[0];
    const lng = center?.[1];
    // Located regions (country level) or cities (region level) returned for the current drilldown.
    const pointsKey = focusPoints.length ? focusPoints.map((pt) => pt.join(',')).join(';') : '';

    useEffect(() => {
        if (pointsKey) {
            const key = `p:${pointsKey}`;

            if (lastKey.current !== key) {
                lastKey.current = key;

                // Frame exactly the places that were returned, so their pins are on screen
                // instead of only zooming to the country's centre.
                if (focusPoints.length === 1) {
                    map.setView(focusPoints[0], Math.max(zoom, 7), { animate: true });
                } else {
                    map.fitBounds(L.latLngBounds(focusPoints), { padding: [56, 56], maxZoom: 9, animate: true });
                }
            } else if (map.getZoom() !== zoom) {
                map.setZoom(zoom, { animate: true });
            }

            return;
        }

        if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return;

        // Re-centre only when the target location actually changes (drilldown / reset).
        // A plain zoom change must keep wherever the user has panned to.
        const key = `c:${lat},${lng}`;

        if (lastKey.current !== key) {
            lastKey.current = key;
            map.setView([Number(lat), Number(lng)], zoom, { animate: true });
        } else if (map.getZoom() !== zoom) {
            map.setZoom(zoom, { animate: true });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lat, lng, zoom, pointsKey, map]);

    return null;
}

MapViewController.propTypes = {
    center: PropTypes.arrayOf(PropTypes.number).isRequired,
    zoom: PropTypes.number.isRequired,
};

/**
 * Sub-component to sync Leaflet map zoom changes with parent state for responsive marker sizing.
 *
 * @component
 * @param {Object} props
 * @param {function(number):void} props.onZoomChange - Callback fired on zoom change.
 * @returns {null}
 */
function ZoomTracker({ onZoomChange }) {
    const map = useMapEvents({
        zoomend(e) {
            onZoomChange(e.target.getZoom());
        },
    });

    useEffect(() => {
        if (map) {
            onZoomChange(map.getZoom());
        }
    }, [map, onZoomChange]);

    return null;
}

ZoomTracker.propTypes = {
    onZoomChange: PropTypes.func.isRequired,
};

/**
 * Custom Map Zoom & Navigation Controls Component.
 *
 * @component
 * @param {Object} props
 * @param {function():void} props.onZoomIn - Zoom in callback.
 * @param {function():void} props.onZoomOut - Zoom out callback.
 * @param {function():void} props.onReset - Reset zoom callback.
 * @returns {JSX.Element}
 */
function CustomMapControls({ onZoomIn, onZoomOut, onReset, resetLabel = 'Reset Global View' }) {
    return (
        <div className="absolute top-3 right-3 z-400 flex flex-col gap-1 rounded-lg border border-coza-purple-100 bg-white/90 p-1 shadow-md backdrop-blur-md dark:border-coza-purple-500/20 dark:bg-gray-900/90">
            <button
                type="button"
                onClick={onZoomIn}
                className="flex size-7 items-center justify-center rounded-md text-gray-700 hover:bg-coza-purple-50 hover:text-coza-purple-600 dark:text-gray-200 dark:hover:bg-coza-purple-500/20 dark:hover:text-coza-purple-300"
                title="Zoom In"
                aria-label="Zoom In"
            >
                <ZoomIn className="size-4" />
            </button>
            <button
                type="button"
                onClick={onZoomOut}
                className="flex size-7 items-center justify-center rounded-md text-gray-700 hover:bg-coza-purple-50 hover:text-coza-purple-600 dark:text-gray-200 dark:hover:bg-coza-purple-500/20 dark:hover:text-coza-purple-300"
                title="Zoom Out"
                aria-label="Zoom Out"
            >
                <ZoomOut className="size-4" />
            </button>
            <button
                type="button"
                onClick={onReset}
                className="flex size-7 items-center justify-center rounded-md text-gray-700 hover:bg-coza-purple-50 hover:text-coza-purple-600 dark:text-gray-200 dark:hover:bg-coza-purple-500/20 dark:hover:text-coza-purple-300"
                title={resetLabel}
                aria-label={resetLabel}
            >
                <RotateCcw className="size-3.5" />
            </button>
        </div>
    );
}

CustomMapControls.propTypes = {
    onZoomIn: PropTypes.func.isRequired,
    onZoomOut: PropTypes.func.isRequired,
    onReset: PropTypes.func.isRequired,
    resetLabel: PropTypes.string,
};

/**
 * Returns the visual tier and style for a location's fetched activity count.
 *
 * @param {number} value - Location user/download count.
 * @param {number} maxValue - Maximum count in current dataset scope.
 * @param {number} [zoom=2] - Current map zoom level.
 * @param {boolean} [isSelected=false] - Whether this item is currently selected.
 * @returns {{fillColor: string, color: string, fillOpacity: number, radius: number, weight: number}}
 */
const getCountryMarkerStyle = (value, maxValue, zoom = 2, isSelected = false) => {
    const ratio = maxValue > 0 ? Math.max(0, Math.min(1, value / maxValue)) : 0;

    let baseRadius = 3.5;
    if (ratio >= 0.75) baseRadius = 6;
    else if (ratio >= 0.50) baseRadius = 5;
    else if (ratio >= 0.25) baseRadius = 4.5;
    else baseRadius = 3.5;

    const zoomScale = 1 + Math.max(0, zoom - 2) * 0.22;
    const responsiveRadius = Math.min(Math.round(baseRadius * zoomScale), 14);

    let fillColor = '#ffd052';
    let color = '#d4941c';

    if (ratio >= 0.75) {
        fillColor = '#6828d9';
        color = '#461b91';
    } else if (ratio >= 0.50) {
        fillColor = '#8b5cf6';
        color = '#6828d9';
    } else if (ratio >= 0.25) {
        fillColor = '#c09cff';
        color = '#8b5cf6';
    }

    if (isSelected) {
        return {
            fillColor: '#a875ff',
            color: '#e9ad2c',
            fillOpacity: 0.95,
            radius: Math.min(responsiveRadius + 3, 16),
            weight: 3,
        };
    }

    return {
        fillColor,
        color,
        fillOpacity: 0.85,
        radius: responsiveRadius,
        weight: 1.5,
    };
};

/**
 * Returns a human-readable marker tier label.
 *
 * @param {number} value - User/download count.
 * @param {number} maxValue - Maximum count in scope.
 * @returns {string} Tier label.
 */
const getCountryMarkerTier = (value, maxValue) => {
    const ratio = maxValue > 0 ? value / maxValue : 0;

    if (ratio >= 0.75) return 'Very high';
    if (ratio >= 0.50) return 'High';
    if (ratio >= 0.25) return 'Medium';
    return 'Low';
};

/**
 * Resolves latitude and longitude coordinates from diverse input formats.
 *
 * @param {Object|null} entry - Raw location object or registry entry.
 * @returns {{lat: number|null, lng: number|null}}
 */
const resolveLatLng = (entry) => {
    if (!entry || typeof entry !== 'object') return { lat: null, lng: null };

    const toFinite = (value) => (Number.isFinite(Number(value)) ? Number(value) : null);

    let lat = toFinite(entry.lat ?? entry.latitude ?? entry.y);
    let lng = toFinite(entry.lng ?? entry.long ?? entry.lon ?? entry.longitude ?? entry.x);

    if ((lat === null || lng === null) && entry.coordinates) {
        const coords = entry.coordinates;

        if (Array.isArray(coords) && coords.length === 2) {
            lat = lat ?? toFinite(coords[0]);
            lng = lng ?? toFinite(coords[1]);
        } else if (typeof coords === 'object') {
            lat = lat ?? toFinite(coords.lat ?? coords.latitude ?? coords.y);
            lng = lng ?? toFinite(coords.lng ?? coords.longitude ?? coords.x);
        }
    }

    if ((lat === null || lng === null) && Array.isArray(entry.latlng) && entry.latlng.length === 2) {
        lat = lat ?? toFinite(entry.latlng[0]);
        lng = lng ?? toFinite(entry.latlng[1]);
    }

    if ((lat === null || lng === null) && Array.isArray(entry.center) && entry.center.length === 2) {
        lat = lat ?? toFinite(entry.center[0]);
        lng = lng ?? toFinite(entry.center[1]);
    }

    return { lat, lng };
};

/**
 * Normalizes raw location records into a structured 3-tier hierarchy:
 * Country -> States/Regions -> Cities/Counties/Areas.
 *
 * @param {Array<Object>|Object} data - Raw dataset.
 * @param {Object} cartoRegistry - Metadata registry.
 * @returns {Array<Object>} Normalized country records with nested states and cities.
 */
const pickUsers = (o) => Number(o?.users ?? o?.activeUsers ?? o?.downloads ?? o?.eventCount ?? 0) || 0;

/** Real download count when the record carries BOTH users and downloads; otherwise null. */
const pickDownloads = (o) => (
    o && (o.users !== undefined || o.activeUsers !== undefined) && (o.downloads !== undefined || o.eventCount !== undefined)
        ? Number(o.downloads ?? o.eventCount ?? 0) || 0
        : null
);

const finiteOrNull = (value) => (value !== null && value !== undefined && Number.isFinite(Number(value)) ? Number(value) : null);

/** Weighted centroid of located children, or null. */
const centroidOf = (children) => {
    const located = children.filter((c) => c.lat !== null && c.lng !== null);
    if (!located.length) return { lat: null, lng: null };
    const weight = located.reduce((sum, c) => sum + Math.max(c.users, 1), 0);

    return {
        lat: located.reduce((sum, c) => sum + c.lat * Math.max(c.users, 1), 0) / weight,
        lng: located.reduce((sum, c) => sum + c.lng * Math.max(c.users, 1), 0) / weight,
    };
};

const normalizeLocationData = (data, cartoRegistry) => {
    if (!data) return [];

    let rawList = [];

    if (Array.isArray(data)) {
        rawList = data;
    } else if (typeof data === 'object') {
        rawList = Object.entries(data).map(([countryKey, value]) => {
            if (typeof value === 'object' && value !== null) {
                return { country: countryKey, ...value };
            }
            return { country: countryKey, users: Number(value || 0) };
        });
    }

    const normalized = rawList.map((item) => {
        const country = item.country || item.name || 'Unknown';
        const rawCode = item.countryCode || item.code || null;
        const rawLat = item.lat ?? item.latitude ?? null;
        const rawLng = item.lng ?? item.longitude ?? item.long ?? null;
        const registryEntry = resolveRegistryEntry(cartoRegistry, country);
        const code = resolveIso2(country, rawCode, cartoRegistry);
        const registryLatLng = resolveLatLng(registryEntry);

        const countryLat = rawLat !== null && rawLat !== undefined && Number.isFinite(Number(rawLat))
            ? Number(rawLat)
            : registryLatLng.lat;

        const countryLng = rawLng !== null && rawLng !== undefined && Number.isFinite(Number(rawLng))
            ? Number(rawLng)
            : registryLatLng.lng;

        const countryUsers = pickUsers(item);
        const countryDownloads = pickDownloads(item);

        // Process states / regions
        const rawStates = Array.isArray(item.states)
            ? item.states
            : Array.isArray(item.regions)
                ? item.regions
                : [];

        const rawCities = Array.isArray(item.cities)
            ? item.cities
            : Array.isArray(item.counties)
                ? item.counties
                : Array.isArray(item.areas)
                    ? item.areas
                    : [];

        let states = [];

        if (rawStates.length > 0) {
            states = rawStates.map((stateItem) => {
                const stateName = stateItem.state || stateItem.region || stateItem.name || 'Unknown Region';
                // Own coordinates only: a region/city without a resolved location must NOT be
                // drawn on top of the country centroid (it would look like a country pin).
                const stateOwnLat = finiteOrNull(stateItem.lat ?? stateItem.latitude);
                const stateOwnLng = finiteOrNull(stateItem.lng ?? stateItem.longitude ?? stateItem.long);
                const stateUsers = pickUsers(stateItem);
                const stateDownloads = pickDownloads(stateItem);

                const stateRawCities = Array.isArray(stateItem.cities)
                    ? stateItem.cities
                    : Array.isArray(stateItem.counties)
                        ? stateItem.counties
                        : Array.isArray(stateItem.areas)
                            ? stateItem.areas
                            : [];

                const cities = stateRawCities
                    .map((cityItem) => ({
                        name: cityItem.city || cityItem.county || cityItem.area || cityItem.name || 'Unknown Area',
                        users: pickUsers(cityItem),
                        downloads: pickDownloads(cityItem),
                        lat: finiteOrNull(cityItem.lat ?? cityItem.latitude),
                        lng: finiteOrNull(cityItem.lng ?? cityItem.longitude ?? cityItem.long),
                        stateName,
                        countryName: country,
                    }))
                    .sort((a, b) => b.users - a.users);

                const stateCentroid = centroidOf(cities);

                return {
                    name: stateName,
                    users: stateUsers || cities.reduce((sum, c) => sum + c.users, 0),
                    downloads: stateDownloads,
                    cityCount: finiteOrNull(stateItem.cityCount) ?? undefined,
                    lat: stateOwnLat ?? stateCentroid.lat,
                    lng: stateOwnLng ?? stateCentroid.lng,
                    countryName: country,
                    cities,
                };
            });
        } else if (rawCities.length > 0) {
            // Group direct cities by state or region attribute if provided
            const groupedByState = {};

            rawCities.forEach((cityItem) => {
                const stateName = cityItem.state || cityItem.region || cityItem.province || 'General Region';
                if (!groupedByState[stateName]) {
                    groupedByState[stateName] = [];
                }
                groupedByState[stateName].push(cityItem);
            });

            states = Object.entries(groupedByState).map(([stateName, cityList]) => {
                const cities = cityList
                    .map((cityItem) => ({
                        name: cityItem.city || cityItem.county || cityItem.area || cityItem.name || 'Unknown Area',
                        users: pickUsers(cityItem),
                        downloads: pickDownloads(cityItem),
                        lat: finiteOrNull(cityItem.lat ?? cityItem.latitude),
                        lng: finiteOrNull(cityItem.lng ?? cityItem.longitude ?? cityItem.long),
                        stateName,
                        countryName: country,
                    }))
                    .sort((a, b) => b.users - a.users);

                const totalStateUsers = cities.reduce((sum, c) => sum + c.users, 0);
                const stateCentroid = centroidOf(cities);

                return {
                    name: stateName,
                    users: totalStateUsers,
                    downloads: null,
                    lat: stateCentroid.lat,
                    lng: stateCentroid.lng,
                    countryName: country,
                    cities,
                };
            });
        }

        states.sort((a, b) => b.users - a.users);

        const calculatedTotalUsers = states.reduce((sum, s) => sum + s.users, 0);
        const finalUsers = countryUsers || calculatedTotalUsers;

        return {
            country,
            code,
            lat: Number.isFinite(Number(countryLat)) ? Number(countryLat) : null,
            lng: Number.isFinite(Number(countryLng)) ? Number(countryLng) : null,
            users: finalUsers,
            downloads: countryDownloads,
            regionCount: finiteOrNull(item.regionCount) ?? undefined,
            cityCount: finiteOrNull(item.cityCount) ?? undefined,
            percentage: Number(item.percentage ?? 0) || 0,
            states,
        };
    });

    return normalized.sort((a, b) => b.users - a.users);
};

/**
 * Flag image component.
 *
 * @component
 * @param {Object} props
 * @param {string|null} props.code - ISO-2 code.
 * @param {string} props.country - Country name.
 * @param {string} [props.className] - Sizing class.
 * @returns {JSX.Element}
 */
function CountryFlag({ code, country, className = 'h-4 w-6' }) {
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        setFailed(false);
    }, [code]);

    if (!code || failed) {
        return (
            <span
                className="inline-flex h-4 min-w-6 items-center justify-center rounded border border-gray-200 bg-gray-50 px-1 text-[9px] font-bold uppercase text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                title={country}
                aria-label={`${country} flag unavailable`}
            >
                {code ? code.toUpperCase() : '—'}
            </span>
        );
    }

    return (
        <img
            src={`https://flagcdn.com/w20/${code}.png`}
            alt={`${country} flag`}
            className={`${className} rounded object-cover shadow-xs`}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
        />
    );
}

CountryFlag.propTypes = {
    code: PropTypes.string,
    country: PropTypes.string.isRequired,
    className: PropTypes.string,
};

/**
 * "N downloads · M users" line; falls back to users only when the dataset has no download counts.
 */
const formatStats = (users, downloads) => (
    downloads === null || downloads === undefined
        ? `${Number(users || 0).toLocaleString()} users`
        : `${Number(downloads).toLocaleString()} downloads · ${Number(users || 0).toLocaleString()} users`
);

/**
 * Compact stat row for the tooltip: coloured dot + label on the left, value on the right.
 * `tone` picks the colour so each metric is recognisable at a glance.
 */
const TONES = {
    region: { dot: 'bg-coza-purple-500', value: 'text-coza-purple-700 dark:text-coza-purple-300' },
    city: { dot: 'bg-coza-gold-500', value: 'text-coza-gold-700 dark:text-coza-gold-300' },
    users: { dot: 'bg-coza-emerald-500', value: 'text-coza-emerald-700 dark:text-coza-emerald-300' },
    downloads: { dot: 'bg-sky-500', value: 'text-sky-700 dark:text-sky-300' },
    share: { dot: 'bg-gray-400', value: 'text-gray-600 dark:text-gray-300' },
};

function StatRow({ tone, label, value }) {
    const t = TONES[tone] ?? TONES.share;

    return (
        <div className="flex items-center justify-between gap-5 text-[11px] leading-5">
            <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                <span className={`size-2 rounded-full ${t.dot}`} />
                {label}
            </span>
            <span className={`font-semibold tabular-nums ${t.value}`}>{value}</span>
        </div>
    );
}

const count = (n) => Number(n || 0).toLocaleString();

/** Total regions / cities for a record, preferring the backend's pre-cap totals. */
const regionTotal = (country) => country.regionCount ?? country.states.length;
const cityTotal = (node, isCountry) => (
    node.cityCount ?? (isCountry ? node.states.reduce((sum, st) => sum + st.cities.length, 0) : node.cities.length)
);

/**
 * Hover tooltip shared by every pin / heat target.
 *
 * Shows a grouped, colour-coded SUMMARY instead of listing places:
 *   country -> total regions, total cities, users, downloads
 *   region  -> total cities, users, downloads, share of country
 *   city    -> users, downloads, share of region
 * The header always names where the downloads happened.
 *
 * @component
 * @param {Object} props
 * @param {'country'|'region'|'city'} props.level
 * @param {Object} props.node - Country, region or city record.
 * @param {Object|null} [props.country] - Parent country (region / city levels).
 * @param {Object|null} [props.region] - Parent region (city level).
 * @param {number} [props.maxUsers=1] - Max in scope (activity tier, country level).
 * @param {boolean} [props.clickHint=false] - Append the "click to drill down" hint.
 * @returns {JSX.Element}
 */
function GeoTooltip({ level, node, country = null, region = null, maxUsers = 1, clickHint = false }) {
    const flagCountry = level === 'country' ? node : country;
    const parent = level === 'city' ? region : level === 'region' ? country : null;
    const share = parent && parent.users > 0 ? `${((node.users / parent.users) * 100).toFixed(1)}%` : null;
    const hasDownloads = node.downloads !== null && node.downloads !== undefined;
    const drillable = clickHint && (level === 'country' ? node.states.length > 0 : level === 'region' && node.cities.length > 0);

    return (
        <Tooltip direction="top" offset={[0, -6]} opacity={0.97}>
            <div className="min-w-44">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-900 dark:text-white">
                    <CountryFlag code={flagCountry?.code} country={flagCountry?.country ?? ''} />
                    <span className="truncate">{level === 'country' ? node.country : node.name}</span>
                </div>
                <div className="mb-1.5 text-[10px] text-gray-400">
                    {level === 'city' && `City in ${region.name}, ${country.country}`}
                    {level === 'region' && `Region in ${country.country}`}
                    {level === 'country' && `${getCountryMarkerTier(node.users, maxUsers)} activity`}
                </div>

                <div className="space-y-0.5 border-t border-gray-200/70 pt-1.5 dark:border-white/10">
                    {level === 'country' && <StatRow tone="region" label="Regions" value={count(regionTotal(node))} />}
                    {level !== 'city' && <StatRow tone="city" label="Cities" value={count(cityTotal(node, level === 'country'))} />}
                    <StatRow tone="users" label="Users" value={count(node.users)} />
                    {hasDownloads && <StatRow tone="downloads" label="Downloads" value={count(node.downloads)} />}
                    {share && <StatRow tone="share" label={`Share of ${level === 'city' ? 'region' : 'country'}`} value={share} />}
                </div>

                {drillable && <div className="mt-1.5 text-[10px] text-gray-400">Click pin to drill down</div>}
            </div>
        </Tooltip>
    );
}

/**
 * GeoMap Main Component with Multi-Tier Spatial Drilldown.
 *
 * @component
 * @param {Object} props
 * @param {Array<Object>|Object} [props.data=[]] - Location records.
 * @param {string} [props.title='User Locations by Country'] - Title.
 * @param {number} [props.initialLimit=6] - Initial card limit.
 * @param {Object} [props.cartoRegistry={}] - Metadata registry.
 * @returns {React.JSX.Element}
 */
export default function GeoMap({
    data = [],
    title = 'User Locations by Country',
    initialLimit = 6,
    cartoRegistry = {},
}) {
    const [selectedCountry, setSelectedCountry] = useState(null);
    const [selectedState, setSelectedState] = useState(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [viewMode, setViewMode] = useState('grid');
    const [spatialLayerMode, setSpatialLayerMode] = useState('pins');
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [mapZoom, setMapZoom] = useState(2);
    const [worldGeoJson, setWorldGeoJson] = useState(null);
    const [isMapModalOpen, setIsMapModalOpen] = useState(false);

    useEffect(() => {
        const checkDarkMode = () => {
            setIsDarkMode(document.documentElement.classList.contains('dark'));
        };

        checkDarkMode();

        const observer = new MutationObserver(checkDarkMode);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class'],
        });

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        let isMounted = true;
        fetch('https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_110m_admin_0_countries.geojson')
            .then((res) => {
                if (res.ok) return res.json();
                throw new Error('Failed to load map boundary data');
            })
            .then((geoData) => {
                if (isMounted) setWorldGeoJson(geoData);
            })
            .catch((error) => {
                console.warn('[GeoMap] Dynamic country GeoJSON fetch fallback:', error);
            });

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        const handler = setTimeout(() => setDebouncedQuery(searchQuery), 300);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    const formattedData = useMemo(
        () => normalizeLocationData(data, cartoRegistry),
        [data, cartoRegistry],
    );

    const totalUsers = useMemo(
        () => formattedData.reduce((total, item) => total + item.users, 0),
        [formattedData],
    );

    const maxUsers = useMemo(
        () => Math.max(...formattedData.map((item) => item.users || 0), 1),
        [formattedData],
    );

    // Filtered lists across the 3 spatial levels
    const filteredData = useMemo(() => {
        if (!debouncedQuery.trim()) return formattedData;

        const query = debouncedQuery.toLowerCase().trim();

        return formattedData.filter((item) => {
            const matchesCountry =
                item.country.toLowerCase().includes(query) ||
                (item.code && item.code.toLowerCase().includes(query));

            const matchesState = item.states.some(
                (st) =>
                    st.name.toLowerCase().includes(query) ||
                    st.cities.some((c) => c.name.toLowerCase().includes(query)),
            );

            return matchesCountry || matchesState;
        });
    }, [formattedData, debouncedQuery]);

    const filteredStates = useMemo(() => {
        if (!selectedCountry) return [];
        if (!debouncedQuery.trim()) return selectedCountry.states;

        const query = debouncedQuery.toLowerCase().trim();
        return selectedCountry.states.filter((st) => {
            const matchesState = st.name.toLowerCase().includes(query);
            const matchesCity = st.cities.some((c) => c.name.toLowerCase().includes(query));
            return matchesState || matchesCity;
        });
    }, [selectedCountry, debouncedQuery]);

    const filteredCities = useMemo(() => {
        if (!selectedState) return [];
        if (!debouncedQuery.trim()) return selectedState.cities;

        const query = debouncedQuery.toLowerCase().trim();
        return selectedState.cities.filter((city) =>
            city.name.toLowerCase().includes(query),
        );
    }, [selectedState, debouncedQuery]);

    // Leaflet throws on a marker without a finite position, and that error takes the whole
    // widget down. Anything not located yet stays in the grid but is never handed to the map.
    const hasCoords = (node) =>
        node && node.lat !== null && node.lng !== null
        && Number.isFinite(Number(node.lat)) && Number.isFinite(Number(node.lng));
    const mappableCountries = useMemo(() => filteredData.filter(hasCoords), [filteredData]);
    const mappableStates = useMemo(() => filteredStates.filter(hasCoords), [filteredStates]);
    const mappableCities = useMemo(() => filteredCities.filter(hasCoords), [filteredCities]);

    const maxStateUsers = useMemo(() => {
        if (!selectedCountry || !selectedCountry.states.length) return 1;
        return Math.max(...selectedCountry.states.map((st) => st.users || 0), 1);
    }, [selectedCountry]);

    const maxCityUsers = useMemo(() => {
        if (!selectedState || !selectedState.cities.length) return 1;
        return Math.max(...selectedState.cities.map((c) => c.users || 0), 1);
    }, [selectedState]);

    const displayedData = useMemo(() => {
        if (debouncedQuery.trim() || isExpanded) return filteredData;
        return filteredData.slice(0, initialLimit);
    }, [filteredData, debouncedQuery, isExpanded, initialLimit]);

    // Active heatmap points based on drilldown tier
    const heatmapPoints = useMemo(() => {
        let activePoints = [];
        let maxUserValue = 1;

        if (selectedState) {
            activePoints = filteredCities;
            maxUserValue = maxCityUsers;
        } else if (selectedCountry) {
            activePoints = filteredStates;
            maxUserValue = maxStateUsers;
        } else {
            activePoints = formattedData;
            maxUserValue = maxUsers;
        }

        if (!activePoints.length) return [];

        return activePoints
            .map((item) => {
                // Region / city tiers use their own coordinates only (no country fallback).
                const lat = item.lat;
                const lng = item.lng;

                if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
                    return null;
                }

                const intensity = Math.max(
                    0.15,
                    Math.min(1.0, (item.users || 0) / maxUserValue),
                );

                return [Number(lat), Number(lng), intensity];
            })
            .filter(Boolean);
    }, [
        selectedCountry,
        selectedState,
        filteredCities,
        filteredStates,
        formattedData,
        maxCityUsers,
        maxStateUsers,
        maxUsers,
    ]);

    /**
     * Resolves distinct polygon feature boundary for selected country.
     * Stage 1 exact check prevents false partial matches (e.g., Nigeria vs Niger).
     */
    const selectedCountryGeoJson = useMemo(() => {
        if (!selectedCountry) return null;

        const registryEntry = resolveRegistryEntry(cartoRegistry, selectedCountry.country);
        if (registryEntry?.geoJSON || registryEntry?.geometry) {
            return registryEntry.geoJSON ?? { type: 'Feature', geometry: registryEntry.geometry };
        }

        if (!worldGeoJson || !Array.isArray(worldGeoJson.features)) return null;

        const code = (selectedCountry.code || '').toLowerCase();
        const name = (selectedCountry.country || '').toLowerCase();
        const aliases = (COUNTRY_NAME_ALIASES[selectedCountry.country] || []).map((a) => a.toLowerCase());

        // Stage 1: Strict Exact Matching
        let matchingFeature = worldGeoJson.features.find((feat) => {
            const props = feat.properties || {};
            const featIso2 = (
                props.iso_a2 ||
                props.ISO_A2 ||
                props.iso_a2_eh ||
                props.ISO_A2_EH ||
                props.wb_a2 ||
                props.WB_A2 ||
                props.postal ||
                ''
            ).toLowerCase();
            const featName = (
                props.name ||
                props.NAME ||
                props.admin ||
                props.ADMIN ||
                props.name_long ||
                ''
            ).toLowerCase();

            if (code && code !== '-99' && featIso2 === code) return true;
            if (name && featName === name) return true;
            if (aliases.some((alias) => featName === alias)) return true;

            return false;
        });

        // Stage 2: Substring Fallback
        if (!matchingFeature) {
            matchingFeature = worldGeoJson.features.find((feat) => {
                const props = feat.properties || {};
                const featName = (
                    props.name ||
                    props.NAME ||
                    props.admin ||
                    props.ADMIN ||
                    props.name_long ||
                    ''
                ).toLowerCase();

                if (!name || !featName) return false;

                return (
                    featName.includes(name) ||
                    (name.length <= featName.length && name.includes(featName))
                );
            });
        }

        if (matchingFeature) {
            return {
                type: 'FeatureCollection',
                features: [matchingFeature],
            };
        }

        return null;
    }, [selectedCountry, worldGeoJson, cartoRegistry]);

    // Places GA4 returned for the current drilldown, split into pinned / not pinned.
    // Pins and heat are drawn ONLY for these (never for places GA4 did not return).
    const scopeNodes = useMemo(
        () => (selectedState ? selectedState.cities : selectedCountry ? selectedCountry.states : []),
        [selectedCountry, selectedState],
    );
    const unpinnedNodes = useMemo(() => scopeNodes.filter((node) => !hasCoords(node)), [scopeNodes]);
    const unplottedCount = unpinnedNodes.length;
    const focusPoints = useMemo(
        () => scopeNodes.filter(hasCoords).map((node) => [Number(node.lat), Number(node.lng)]),
        [scopeNodes],
    );

    const handleExportCsv = useCallback(() => {
        if (!formattedData.length) return;

        const headers = [
            'Rank',
            'Country',
            'ISO Code',
            'State / Region',
            'City / Area',
            'Latitude',
            'Longitude',
            'Downloads / Active Users',
            'Country % Share',
        ];

        const rows = [];
        let rank = 1;

        formattedData.forEach((country) => {
            const countryPercent = totalUsers > 0
                ? ((country.users / totalUsers) * 100).toFixed(1)
                : country.percentage;

            if (country.states.length > 0) {
                country.states.forEach((state) => {
                    if (state.cities.length > 0) {
                        state.cities.forEach((city) => {
                            rows.push([
                                rank++,
                                sanitizeCsvCell(country.country),
                                sanitizeCsvCell(country.code ? country.code.toUpperCase() : 'N/A'),
                                sanitizeCsvCell(state.name),
                                sanitizeCsvCell(city.name),
                                city.lat ?? 'N/A',
                                city.lng ?? 'N/A',
                                city.users,
                                sanitizeCsvCell(`${countryPercent}%`),
                            ].join(','));
                        });
                    } else {
                        rows.push([
                            rank++,
                            sanitizeCsvCell(country.country),
                            sanitizeCsvCell(country.code ? country.code.toUpperCase() : 'N/A'),
                            sanitizeCsvCell(state.name),
                            sanitizeCsvCell('N/A'),
                            state.lat ?? 'N/A',
                            state.lng ?? 'N/A',
                            state.users,
                            sanitizeCsvCell(`${countryPercent}%`),
                        ].join(','));
                    }
                });
            } else {
                rows.push([
                    rank++,
                    sanitizeCsvCell(country.country),
                    sanitizeCsvCell(country.code ? country.code.toUpperCase() : 'N/A'),
                    sanitizeCsvCell('N/A'),
                    sanitizeCsvCell('N/A'),
                    country.lat ?? 'N/A',
                    country.lng ?? 'N/A',
                    country.users,
                    sanitizeCsvCell(`${countryPercent}%`),
                ].join(','));
            }
        });

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = `geographic_user_downloads_breakdown_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, [formattedData, totalUsers]);

    // Opens the fullscreen country map (Map View country pin click).
    const openCountryModal = useCallback((country) => {
        setSearchQuery('');
        setDebouncedQuery('');
        setSelectedCountry(country);
        setSelectedState(null);
        setMapZoom(5);
        setIsMapModalOpen(true);
    }, []);

    // Closes the modal and returns the inline map to the global view.
    const closeCountryModal = useCallback(() => {
        setIsMapModalOpen(false);
        setSelectedState(null);
        setSelectedCountry(null);
        setMapZoom(2);
    }, []);

    // Esc closes the modal; page scroll is locked while it is open.
    useEffect(() => {
        if (!isMapModalOpen) return undefined;

        const onKeyDown = (event) => {
            if (event.key === 'Escape') closeCountryModal();
        };
        const previousOverflow = document.body.style.overflow;

        document.addEventListener('keydown', onKeyDown);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = previousOverflow;
        };
    }, [isMapModalOpen, closeCountryModal]);

    const layerToggle = (
        <div className="coza-toggle-group">
            {[
                ['pins', MapPin, 'Pins'],
                ['heatmap', Flame, 'Heatmap'],
                ['hybrid', Layers, 'Both'],
            ].map(([mode, Icon, label]) => (
                <button
                    key={mode}
                    type="button"
                    onClick={() => setSpatialLayerMode(mode)}
                    className={`coza-toggle-btn ${spatialLayerMode === mode ? 'coza-toggle-btn-active' : ''}`}
                >
                    <Icon className="size-3.5" />
                    <span className="hidden sm:inline">{label}</span>
                </button>
            ))}
        </div>
    );

    /**
     * Renders the map canvas. The same canvas is used inline (global view) and inside the
     * fullscreen country modal, so layers, pins, heatmap, tooltips and legend stay identical.
     */
    const renderMap = (inModal = false) => (
        <div
        className={
            inModal
                ? 'relative h-full w-full overflow-hidden'
                : 'relative h-105 w-full overflow-hidden rounded-xl border border-coza-purple-100 dark:border-coza-purple-500/20'
        }
    >
            <MapContainer
                center={
                    selectedState && Number.isFinite(Number(selectedState.lat))
                        ? [selectedState.lat, selectedState.lng]
                        : selectedCountry && Number.isFinite(Number(selectedCountry.lat))
                            ? [selectedCountry.lat, selectedCountry.lng]
                            : [20, 0]
                }
                zoom={mapZoom}
                minZoom={2}
                maxZoom={12}
                scrollWheelZoom={true}
                zoomControl={false}
                className="h-full w-full z-0"
            >
                <ZoomTracker onZoomChange={setMapZoom} />
                <MapViewController
                    center={
                        selectedState && Number.isFinite(Number(selectedState.lat))
                            ? [selectedState.lat, selectedState.lng]
                            : selectedCountry && Number.isFinite(Number(selectedCountry.lat))
                                ? [selectedCountry.lat, selectedCountry.lng]
                                : [20, 0]
                    }
                    zoom={mapZoom}
                    focusPoints={focusPoints}
                />

                {/* MapLibre Vector Tiles */}
                <MapLibreVectorLayer
                    styleUrl={isDarkMode ? VECTOR_TILE_STYLES.darkMatter : VECTOR_TILE_STYLES.voyager}
                />

                {/* Distinctly highlighted country polygon outline when zoomed in */}
                {selectedCountryGeoJson && (
                    <GeoJSON
                        key={`selected-country-polygon-${selectedCountry.code || selectedCountry.country}`}
                        data={selectedCountryGeoJson}
                        style={{
                            fillColor: '#8b5cf6',
                            fillOpacity: 0.38,
                            color: '#e9ad2c',
                            weight: 2.5,
                            opacity: 0.95,
                        }}
                    />
                )}

                {/* Heatmap Layer */}
                {(spatialLayerMode === 'heatmap' || spatialLayerMode === 'hybrid') && (
                    <HeatmapLayer points={heatmapPoints} zoom={mapZoom} />
                )}

                {/* Heatmap Tooltip Targets (`onmouseover` & click interactions) */}
                {spatialLayerMode === 'heatmap' && (
                    selectedState
                        ? mappableCities.map((city, idx) => {
                              if (!Number.isFinite(Number(city.lat)) || !Number.isFinite(Number(city.lng))) return null;

                              return (
                                  <CircleMarker
                                      key={`heatmap-city-hit-${city.name}-${idx}`}
                                      center={[city.lat, city.lng]}
                                      radius={14}
                                      pathOptions={{ fillColor: 'transparent', color: 'transparent', fillOpacity: 0, opacity: 0, weight: 0 }}
                                  >
                                      <GeoTooltip level="city" node={city} country={selectedCountry} region={selectedState} />
                                  </CircleMarker>
                              );
                          })
                        : selectedCountry
                            ? mappableStates.map((st, idx) => {
                                  if (!Number.isFinite(Number(st.lat)) || !Number.isFinite(Number(st.lng))) return null;

                                  return (
                                      <CircleMarker
                                          key={`heatmap-state-hit-${st.name}-${idx}`}
                                          center={[st.lat, st.lng]}
                                          radius={16}
                                          pathOptions={{ fillColor: 'transparent', color: 'transparent', fillOpacity: 0, opacity: 0, weight: 0 }}
                                          eventHandlers={{
                                              click: () => {
                                                  setSelectedState(st);
                                                  setMapZoom(8);
                                              },
                                          }}
                                      >
                                          <GeoTooltip level="region" node={st} country={selectedCountry} />
                                      </CircleMarker>
                                  );
                              })
                            : mappableCountries.map((item, idx) => {
                                  if (!Number.isFinite(Number(item.lat)) || !Number.isFinite(Number(item.lng))) return null;

                                  return (
                                      <CircleMarker
                                          key={`heatmap-country-hit-${item.country}-${idx}`}
                                          center={[item.lat, item.lng]}
                                          radius={18}
                                          pathOptions={{ fillColor: 'transparent', color: 'transparent', fillOpacity: 0, opacity: 0, weight: 0 }}
                                          eventHandlers={{
                                              click: () => openCountryModal(item),
                                          }}
                                      >
                                          <GeoTooltip level="country" node={item} maxUsers={maxUsers} />
                                      </CircleMarker>
                                  );
                              })
                )}

                {/* Interactive Marker Pins Layer for Spatial Drilldown */}
                {(spatialLayerMode === 'pins' || spatialLayerMode === 'hybrid') && (
                    selectedState
                        ? /* Tier 3: Display ONLY fetched cities/areas where downloads occurred in selected state */
                          mappableCities.map((city, idx) => {
                              const markerStyle = getCountryMarkerStyle(city.users, maxCityUsers, mapZoom, false);

                              if (!Number.isFinite(Number(city.lat)) || !Number.isFinite(Number(city.lng))) return null;

                              return (
                                  <CircleMarker
                                      key={`city-pin-${city.name}-${idx}`}
                                      center={[city.lat, city.lng]}
                                      radius={markerStyle.radius}
                                      pathOptions={{
                                          fillColor: markerStyle.fillColor,
                                          color: markerStyle.color,
                                          fillOpacity: markerStyle.fillOpacity,
                                          weight: markerStyle.weight,
                                      }}
                                  >
                                      {/* Hover Tooltip with complete drilldown details */}
                                      <GeoTooltip level="city" node={city} country={selectedCountry} region={selectedState} />

                                      <Popup>
                                          <div className="p-1 text-xs">
                                              <div className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-white mb-1">
                                                  <Building2 className="size-3.5 text-coza-purple-600" />
                                                  <span>{city.name}</span>
                                              </div>
                                              <p className="text-gray-600 dark:text-gray-300 mb-1">
                                                  {formatStats(city.users, city.downloads)}
                                              </p>
                                              <p className="text-[10px] text-gray-400">
                                                  Region: {selectedState.name}, {selectedCountry.country}
                                              </p>
                                          </div>
                                      </Popup>
                                  </CircleMarker>
                              );
                          })
                        : selectedCountry
                            ? /* Tier 2: Display ONLY fetched states/regions where downloads occurred in selected country */
                              mappableStates.map((st, idx) => {
                                  const markerStyle = getCountryMarkerStyle(st.users, maxStateUsers, mapZoom, false);

                                  if (!Number.isFinite(Number(st.lat)) || !Number.isFinite(Number(st.lng))) return null;

                                  return (
                                      <CircleMarker
                                          key={`state-pin-${st.name}-${idx}`}
                                          center={[st.lat, st.lng]}
                                          radius={markerStyle.radius}
                                          pathOptions={{
                                              fillColor: markerStyle.fillColor,
                                              color: markerStyle.color,
                                              fillOpacity: markerStyle.fillOpacity,
                                              weight: markerStyle.weight,
                                          }}
                                          eventHandlers={{
                                              click: () => {
                                                  setSelectedState(st);
                                                  setMapZoom(8);
                                              },
                                          }}
                                      >
                                          {/* Hover Tooltip with state/region drilldown details */}
                                          <GeoTooltip level="region" node={st} country={selectedCountry} clickHint />

                                          <Popup>
                                              <div className="p-1 text-xs">
                                                  <div className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-white mb-1">
                                                      <MapPin className="size-3.5 text-coza-purple-600" />
                                                      <span>{st.name}</span>
                                                  </div>
                                                  <p className="text-gray-600 dark:text-gray-300 mb-2">
                                                      {formatStats(st.users, st.downloads)} across {st.cities.length} city areas
                                                  </p>
                                                  <button
                                                      type="button"
                                                      onClick={() => {
                                                          setSelectedState(st);
                                                          setMapZoom(8);
                                                      }}
                                                      className="w-full rounded-md bg-coza-purple-600 px-2 py-1 text-center font-medium text-white shadow-xs hover:bg-coza-purple-700"
                                                  >
                                                      View Cities & Areas
                                                  </button>
                                              </div>
                                          </Popup>
                                      </CircleMarker>
                                  );
                              })
                            : /* Tier 1: Global View - Display fetched countries */
                              mappableCountries.map((item, idx) => {
                                  const isSelected = selectedCountry?.country === item.country;
                                  const markerStyle = getCountryMarkerStyle(item.users, maxUsers, mapZoom, isSelected);

                                  if (!Number.isFinite(Number(item.lat)) || !Number.isFinite(Number(item.lng))) return null;

                                  return (
                                      <CircleMarker
                                          key={`country-pin-${item.country}-${idx}`}
                                          center={[item.lat, item.lng]}
                                          radius={markerStyle.radius}
                                          pathOptions={{
                                              fillColor: markerStyle.fillColor,
                                              color: markerStyle.color,
                                              fillOpacity: markerStyle.fillOpacity,
                                              weight: markerStyle.weight,
                                          }}
                                          eventHandlers={{
                                              click: () => openCountryModal(item),
                                          }}
                                      >
                                          {/* Hover Tooltip with country drilldown details */}
                                          <GeoTooltip level="country" node={item} maxUsers={maxUsers} clickHint />

                                          <Popup>
                                              <div className="p-1 text-xs">
                                                  <div className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-white mb-1">
                                                      <CountryFlag code={item.code} country={item.country} />
                                                      <span>{item.country}</span>
                                                  </div>
                                                  <p className="text-gray-600 dark:text-gray-300 mb-2">
                                                      {formatStats(item.users, item.downloads)}
                                                  </p>
                                                  <button
                                                      type="button"
                                                      onClick={() => openCountryModal(item)}
                                                      className="w-full rounded-md bg-coza-purple-600 px-2 py-1 text-center font-medium text-white shadow-xs hover:bg-coza-purple-700"
                                                  >
                                                      View States & Regions
                                                  </button>
                                              </div>
                                          </Popup>
                                      </CircleMarker>
                                  );
                              })
                )}
            </MapContainer>

            {/* Custom Floating Zoom Controls */}
            <CustomMapControls
                onZoomIn={() => setMapZoom((prev) => Math.min(prev + 1, 12))}
                onZoomOut={() => setMapZoom((prev) => Math.max(prev - 1, 2))}
                onReset={
                    inModal
                        ? () => {
                              setSelectedState(null);
                              setMapZoom(5);
                          }
                        : () => {
                              setSelectedCountry(null);
                              setSelectedState(null);
                              setMapZoom(2);
                          }
                }
                resetLabel={inModal ? 'Reset Country View' : 'Reset Global View'}
            />

            {/* Map Activity Legend */}
            <div className="coza-geo-panel absolute bottom-3 left-3 z-400 flex flex-col gap-1.5 text-[11px]">
                <span className="font-semibold text-gray-900 dark:text-white">Download Intensity</span>
                {selectedCountry && scopeNodes.length === 0 && (
                    <span className="max-w-60 text-[10px] text-gray-500 dark:text-gray-400">
                        {selectedState
                            ? 'No city-level data was returned for this region.'
                            : 'No region-level data was returned for this country.'}
                    </span>
                )}
                {unplottedCount > 0 && (
                    <div className="flex max-w-64 flex-col gap-1">
                        <span className="text-[10px] text-gray-500 dark:text-gray-400">
                            Returned, but no map position yet ({unplottedCount}):
                        </span>
                        <div className="flex max-h-20 flex-wrap gap-1 overflow-y-auto">
                            {unpinnedNodes.map((node, idx) => (
                                <button
                                    key={`${node.name}-${idx}`}
                                    type="button"
                                    disabled={Boolean(selectedState)}
                                    onClick={() => {
                                        if (selectedState) return;
                                        setSelectedState(node);
                                        setMapZoom(8);
                                    }}
                                    title={formatStats(node.users, node.downloads)}
                                    className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                                        selectedState
                                            ? 'cursor-default border-coza-gold-400/50 bg-coza-gold-50 text-coza-gold-700 dark:bg-coza-gold-500/10 dark:text-coza-gold-300'
                                            : 'border-coza-purple-300/60 bg-coza-purple-50 text-coza-purple-700 hover:bg-coza-purple-100 dark:border-coza-purple-500/30 dark:bg-coza-purple-500/10 dark:text-coza-purple-300'
                                    }`}
                                >
                                    {node.name} · {node.users.toLocaleString()}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                <div className="flex items-center gap-1.5">
                    <span className="text-gray-500 dark:text-gray-400">Low</span>
                    <div className="coza-map-legend-gradient h-2 w-24 rounded-full" />
                    <span className="text-gray-500 dark:text-gray-400">High</span>
                </div>
            </div>
        </div>
    );

    return (
        <section className="analytics-card flex w-full flex-col justify-between p-4 sm:p-5">
            {/* Header and toolbar */}
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                    <div className="mb-0 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                        <Globe className="size-5 text-coza-gold-600 dark:text-coza-gold-400" />
                        <span>{title}</span>
                    </div>

                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {selectedState
                            ? `City/County download breakdown for ${selectedState.name}, ${selectedCountry?.country}`
                            : selectedCountry
                                ? `State/Region download breakdown for ${selectedCountry.country}`
                                : 'Geographic download distribution across global territories.'}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* View mode switcher */}
                    <div className="coza-toggle-group">
                        <button
                            type="button"
                            onClick={() => setViewMode('grid')}
                            className={`coza-toggle-btn ${viewMode === 'grid' ? 'coza-toggle-btn-active' : ''}`}
                        >
                            <LayoutGrid className="size-3.5" />
                            <span>Grid View</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setViewMode('map')}
                            className={`coza-toggle-btn ${viewMode === 'map' ? 'coza-toggle-btn-active' : ''}`}
                        >
                            <MapIcon className="size-3.5" />
                            <span>Map View</span>
                        </button>
                    </div>

                    {/* Map layer selector */}
                    {viewMode === 'map' && (
                        <div className="coza-toggle-group">
                            {[
                                ['pins', MapPin, 'Pins'],
                                ['heatmap', Flame, 'Heatmap'],
                                ['hybrid', Layers, 'Both'],
                            ].map(([mode, Icon, label]) => (
                                <button
                                    key={mode}
                                    type="button"
                                    onClick={() => setSpatialLayerMode(mode)}
                                    className={`coza-toggle-btn ${spatialLayerMode === mode ? 'coza-toggle-btn-active' : ''}`}
                                >
                                    <Icon className="size-3.5" />
                                    <span className="hidden sm:inline">{label}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Search input */}
                    <div className="relative w-full sm:w-48">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-coza-purple-400 dark:text-coza-purple-300/70" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            placeholder={
                                selectedState
                                    ? 'Filter cities...'
                                    : selectedCountry
                                        ? 'Filter states...'
                                        : 'Filter locations...'
                            }
                            className="coza-geo-search-input"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-coza-purple-500 dark:hover:text-coza-purple-300"
                                aria-label="Clear location search"
                            >
                                <X className="size-3.5" />
                            </button>
                        )}
                    </div>

                    {/* CSV export */}
                    <button
                        type="button"
                        onClick={handleExportCsv}
                        disabled={!formattedData.length}
                        className="coza-geo-export-btn"
                    >
                        <Download className="size-3.5 text-coza-gold-600 dark:text-coza-gold-400" />
                        <span>Export CSV</span>
                    </button>
                </div>
            </div>

            {/* Drilldown Navigation Breadcrumbs */}
            {selectedCountry && !isMapModalOpen && (
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-coza-purple-100 bg-coza-purple-50 p-2.5 dark:border-coza-purple-500/20 dark:bg-coza-purple-500/10">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedCountry(null);
                                setSelectedState(null);
                                setMapZoom(2);
                            }}
                            className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-semibold text-coza-purple-600 shadow-xs hover:bg-coza-purple-50 dark:bg-gray-800 dark:text-coza-purple-300 dark:hover:bg-gray-700"
                        >
                            <ArrowLeft className="size-3.5" />
                            <span>Global View</span>
                        </button>

                        <span className="text-gray-300 dark:text-gray-600">/</span>

                        <button
                            type="button"
                            onClick={() => {
                                setSelectedState(null);
                                setMapZoom(5);
                            }}
                            className={`flex items-center gap-1.5 font-medium text-xs ${selectedState ? 'hover:underline text-coza-purple-600 dark:text-coza-purple-400' : 'text-gray-900 dark:text-white font-semibold'}`}
                        >
                            <CountryFlag code={selectedCountry.code} country={selectedCountry.country} />
                            <span>{selectedCountry.country}</span>
                        </button>

                        {selectedState && (
                            <>
                                <span className="text-gray-300 dark:text-gray-600">/</span>
                                <div className="flex items-center gap-1.5 font-semibold text-xs text-gray-900 dark:text-white">
                                    <MapPin className="size-3.5 text-coza-purple-500" />
                                    <span>{selectedState.name}</span>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                        <span className="text-gray-500 dark:text-gray-400">
                            Downloads/Users:{' '}
                            <strong className="font-semibold text-gray-900 dark:text-white">
                                {(selectedState ? selectedState.users : selectedCountry.users).toLocaleString()}
                            </strong>
                        </span>

                        <button
                            type="button"
                            onClick={() => {
                                if (selectedState) {
                                    setSelectedState(null);
                                    setMapZoom(5);
                                } else {
                                    setSelectedCountry(null);
                                    setMapZoom(2);
                                }
                            }}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            aria-label="Clear spatial selection"
                        >
                            <X className="size-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Grid / Card View Mode */}
            {viewMode === 'grid' ? (
                <>
                    {selectedState ? (
                        /* Tier 3: Cities in Selected State */
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {filteredCities.map((city, idx) => (
                                <div key={`${city.name}-${idx}`} className="coza-country-card">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="flex size-8 items-center justify-center rounded-lg bg-coza-purple-50 text-coza-purple-600 dark:bg-coza-purple-500/20 dark:text-coza-purple-300">
                                            <Building2 className="size-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="truncate text-xs font-semibold text-gray-900 dark:text-white">
                                                {city.name}
                                            </h4>
                                            <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                                {formatStats(city.users, city.downloads)}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-bold text-coza-purple-600 dark:text-coza-purple-400">
                                        {selectedState.users > 0
                                            ? `${((city.users / selectedState.users) * 100).toFixed(1)}%`
                                            : '0%'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : selectedCountry ? (
                        /* Tier 2: States/Regions in Selected Country */
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {filteredStates.map((st, idx) => {
                                const markerStyle = getCountryMarkerStyle(st.users, maxStateUsers, mapZoom, false);

                                return (
                                    <div
                                        key={`${st.name}-${idx}`}
                                        onClick={() => {
                                            setSelectedState(st);
                                            setMapZoom(8);
                                        }}
                                        className="coza-country-card cursor-pointer hover:border-coza-purple-300 dark:hover:border-coza-purple-500"
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                setSelectedState(st);
                                                setMapZoom(8);
                                            }
                                        }}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="flex size-8 items-center justify-center rounded-lg bg-coza-purple-50 text-coza-purple-600 dark:bg-coza-purple-500/20 dark:text-coza-purple-300">
                                                <MapPin className="size-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="truncate text-xs font-semibold text-gray-900 dark:text-white">
                                                    {st.name}
                                                </h4>
                                                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                                    {formatStats(st.users, st.downloads)} • {st.cities.length} cities
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="inline-block size-2.5 rounded-full"
                                                style={{ backgroundColor: markerStyle.fillColor }}
                                                title={`Activity tier: ${getCountryMarkerTier(st.users, maxStateUsers)}`}
                                            />
                                            <span className="text-xs font-bold text-coza-purple-600 dark:text-coza-purple-400">
                                                {selectedCountry.users > 0
                                                    ? `${((st.users / selectedCountry.users) * 100).toFixed(1)}%`
                                                    : '0%'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        /* Tier 1: Global Countries */
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {displayedData.map((item, idx) => {
                                const percent = totalUsers > 0
                                    ? ((item.users / totalUsers) * 100).toFixed(1)
                                    : item.percentage;
                                const markerStyle = getCountryMarkerStyle(item.users, maxUsers, mapZoom, selectedCountry?.country === item.country);

                                return (
                                    <div
                                        key={`${item.country}-${idx}`}
                                        onClick={() => {
                                            setSelectedCountry(item);
                                            setSelectedState(null);
                                            setMapZoom(5);
                                        }}
                                        className="coza-country-card cursor-pointer"
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                setSelectedCountry(item);
                                                setSelectedState(null);
                                                setMapZoom(5);
                                            }
                                        }}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <CountryFlag code={item.code} country={item.country} className="h-5 w-7" />
                                            <div className="min-w-0">
                                                <h4 className="truncate text-xs font-semibold text-gray-900 dark:text-white">
                                                    {item.country}
                                                </h4>
                                                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                                    {formatStats(item.users, item.downloads)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="inline-block size-2.5 rounded-full"
                                                style={{ backgroundColor: markerStyle.fillColor }}
                                                title={`Activity tier: ${getCountryMarkerTier(item.users, maxUsers)}`}
                                            />
                                            <span className="text-xs font-bold text-coza-purple-600 dark:text-coza-purple-400">
                                                {percent}%
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {!selectedCountry && !debouncedQuery.trim() && filteredData.length > initialLimit && (
                        <div className="mt-4 flex justify-center">
                            <button
                                type="button"
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="analytics-btn-load-more"
                            >
                                <span>{isExpanded ? 'Collapse List' : `Show All (${filteredData.length})`}</span>
                            </button>
                        </div>
                    )}
                </>
            ) : isMapModalOpen ? (
                /* Keep the card height while the fullscreen country map is open (avoids a 2nd WebGL map). */
                <div className="h-105 w-full rounded-xl border border-coza-purple-100 bg-coza-purple-50/40 dark:border-coza-purple-500/20 dark:bg-coza-purple-500/5" />
            ) : (
                renderMap(false)
            )}

            {/* Fullscreen country map modal (opened from a country pin in Map View) */}
            {isMapModalOpen && selectedCountry && typeof document !== 'undefined' && createPortal(
                <div
                    className="fixed inset-0 z-[9999] flex flex-col bg-white dark:bg-gray-900"
                    role="dialog"
                    aria-modal="true"
                    aria-label={`${selectedCountry.country} map`}
                >
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-coza-purple-100 bg-white px-4 py-3 dark:border-coza-purple-500/20 dark:bg-gray-900">
                        <div className="flex min-w-0 items-center gap-2 text-sm">
                            <button
                                type="button"
                                onClick={selectedState ? () => { setSelectedState(null); setMapZoom(5); } : undefined}
                                disabled={!selectedState}
                                className={`flex items-center gap-2 font-semibold ${selectedState ? 'text-coza-purple-600 hover:underline dark:text-coza-purple-400' : 'cursor-default text-gray-900 dark:text-white'}`}
                            >
                                <CountryFlag code={selectedCountry.code} country={selectedCountry.country} className="h-5 w-7" />
                                <span className="truncate">{selectedCountry.country}</span>
                            </button>

                            {selectedState && (
                                <>
                                    <span className="text-gray-300 dark:text-gray-600">/</span>
                                    <span className="flex items-center gap-1.5 truncate font-semibold text-gray-900 dark:text-white">
                                        <MapPin className="size-3.5 text-coza-purple-500" />
                                        {selectedState.name}
                                    </span>
                                </>
                            )}

                            <span className="ml-2 hidden text-xs text-gray-500 dark:text-gray-400 sm:inline">
                                Downloads/Users:{' '}
                                <strong className="font-semibold text-gray-900 dark:text-white">
                                    {(selectedState ? selectedState.users : selectedCountry.users).toLocaleString()}
                                </strong>
                            </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {layerToggle}

                            <div className="relative w-full sm:w-48">
                                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-coza-purple-400 dark:text-coza-purple-300/70" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(event) => setSearchQuery(event.target.value)}
                                    placeholder={selectedState ? 'Filter cities...' : 'Filter states...'}
                                    className="coza-geo-search-input"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-coza-purple-500 dark:hover:text-coza-purple-300"
                                        aria-label="Clear location search"
                                    >
                                        <X className="size-3.5" />
                                    </button>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={closeCountryModal}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-coza-purple-100 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 shadow-xs hover:bg-coza-purple-50 hover:text-coza-purple-600 dark:border-coza-purple-500/20 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-coza-purple-500/20"
                                aria-label="Close map"
                            >
                                <X className="size-4" />
                                <span>Close</span>
                            </button>
                        </div>
                    </div>

                    <div className="relative min-h-0 flex-1">{renderMap(true)}</div>
                </div>,
                document.body,
            )}
        </section>
    );
}

GeoMap.propTypes = {
    data: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.object), PropTypes.object]),
    title: PropTypes.string,
    initialLimit: PropTypes.number,
    cartoRegistry: PropTypes.object,
};