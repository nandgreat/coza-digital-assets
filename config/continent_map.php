<?php
/**
 * ==========================================================================================
 * COZA Analytics Dashboard — Carto Vector Map Metadata & Global Country/Continent Dictionary
 * ==========================================================================================
 *
 *  Provides a unified dataset containing ISO Alpha-2 codes, geographical centroids
 * (latitude/longitude), continent classifications, and currency symbols designed
 * for vector map rendering, Leaflet/MapLibre canvas integration, and spatial analytics.
 *
 * @file      continent_map.php
 * @package   COZA Analytics Dashboard
 * @author    Leonard @WittyInventions
 * @version   3.0.0
 * @license   MIT
 * @description
 *   Provides a unified dataset containing ISO Alpha-2 codes, geographical centroids
 *   (latitude/longitude), continent classifications, and currency symbols designed
 *   for vector map rendering, Leaflet/MapLibre canvas integration, and spatial analytics.
 * 
* =========================================================================================
 */

declare(strict_types=1);

// Prevent direct script execution if required outside of API context
if (!defined('ABSPATH') && !defined('ENTRY_POINT') && basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'] ?? '')) {
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
}

/**
 * Unified Carto Spatial Country Registry
 *
 * Contains every sovereign state and major dependent territory.
 * Data includes ISO2, continent, centroid coordinates, currency code and symbol.
 *
 * @var array<string, array{
 *     iso2: string,
 *     continent: string,
 *     lat: float,
 *     lng: float,
 *     currency: string,
 *     symbol: string
 * }>
 */
$global_country_registry = [
    // --- AFRICA ---
    'Algeria' => ['iso2' => 'DZ', 'continent' => 'Africa', 'lat' => 28.0339, 'lng' => 1.6596, 'currency' => 'DZD', 'symbol' => 'دج'],
    'Angola' => ['iso2' => 'AO', 'continent' => 'Africa', 'lat' => -11.2027, 'lng' => 17.8739, 'currency' => 'AOA', 'symbol' => 'Kz'],
    'Benin' => ['iso2' => 'BJ', 'continent' => 'Africa', 'lat' => 9.3077, 'lng' => 2.3158, 'currency' => 'XOF', 'symbol' => 'CFA'],
    'Botswana' => ['iso2' => 'BW', 'continent' => 'Africa', 'lat' => -22.3285, 'lng' => 24.6849, 'currency' => 'BWP', 'symbol' => 'P'],
    'Burkina Faso' => ['iso2' => 'BF', 'continent' => 'Africa', 'lat' => 12.2383, 'lng' => -1.5616, 'currency' => 'XOF', 'symbol' => 'CFA'],
    'Burundi' => ['iso2' => 'BI', 'continent' => 'Africa', 'lat' => -3.3731, 'lng' => 29.9189, 'currency' => 'BIF', 'symbol' => 'FBu'],
    'Cameroon' => ['iso2' => 'CM', 'continent' => 'Africa', 'lat' => 7.3697, 'lng' => 12.3547, 'currency' => 'XAF', 'symbol' => 'FCFA'],
    'Cape Verde' => ['iso2' => 'CV', 'continent' => 'Africa', 'lat' => 16.5388, 'lng' => -23.0418, 'currency' => 'CVE', 'symbol' => 'Esc'],
    'Central African Republic' => ['iso2' => 'CF', 'continent' => 'Africa', 'lat' => 6.6111, 'lng' => 20.9394, 'currency' => 'XAF', 'symbol' => 'FCFA'],
    'Chad' => ['iso2' => 'TD', 'continent' => 'Africa', 'lat' => 15.4542, 'lng' => 18.7322, 'currency' => 'XAF', 'symbol' => 'FCFA'],
    'Comoros' => ['iso2' => 'KM', 'continent' => 'Africa', 'lat' => -11.6455, 'lng' => 43.3333, 'currency' => 'KMF', 'symbol' => 'CF'],
    'Congo (Brazzaville)' => ['iso2' => 'CG', 'continent' => 'Africa', 'lat' => -0.228, 'lng' => 15.8277, 'currency' => 'XAF', 'symbol' => 'FCFA'],
    'Congo (Kinshasa)' => ['iso2' => 'CD', 'continent' => 'Africa', 'lat' => -4.0383, 'lng' => 21.7587, 'currency' => 'CDF', 'symbol' => 'FC'],
    "Côte d'Ivoire" => ['iso2' => 'CI', 'continent' => 'Africa', 'lat' => 7.54, 'lng' => -5.5471, 'currency' => 'XOF', 'symbol' => 'CFA'],
    'Djibouti' => ['iso2' => 'DJ', 'continent' => 'Africa', 'lat' => 11.8251, 'lng' => 42.5903, 'currency' => 'DJF', 'symbol' => 'Fdj'],
    'Egypt' => ['iso2' => 'EG', 'continent' => 'Africa', 'lat' => 26.8206, 'lng' => 30.8025, 'currency' => 'EGP', 'symbol' => 'E£'],
    'Equatorial Guinea' => ['iso2' => 'GQ', 'continent' => 'Africa', 'lat' => 1.6508, 'lng' => 10.2679, 'currency' => 'XAF', 'symbol' => 'FCFA'],
    'Eritrea' => ['iso2' => 'ER', 'continent' => 'Africa', 'lat' => 15.1794, 'lng' => 39.7823, 'currency' => 'ERN', 'symbol' => 'Nfk'],
    'Eswatini' => ['iso2' => 'SZ', 'continent' => 'Africa', 'lat' => -26.5225, 'lng' => 31.4659, 'currency' => 'SZL', 'symbol' => 'E'],
    'Ethiopia' => ['iso2' => 'ET', 'continent' => 'Africa', 'lat' => 9.145, 'lng' => 40.4897, 'currency' => 'ETB', 'symbol' => 'Br'],
    'Gabon' => ['iso2' => 'GA', 'continent' => 'Africa', 'lat' => -0.8037, 'lng' => 11.6094, 'currency' => 'XAF', 'symbol' => 'FCFA'],
    'Gambia' => ['iso2' => 'GM', 'continent' => 'Africa', 'lat' => 13.4432, 'lng' => -15.3101, 'currency' => 'GMD', 'symbol' => 'D'],
    'Ghana' => ['iso2' => 'GH', 'continent' => 'Africa', 'lat' => 7.9465, 'lng' => -1.0232, 'currency' => 'GHS', 'symbol' => 'GH₵'],
    'Guinea' => ['iso2' => 'GN', 'continent' => 'Africa', 'lat' => 9.9456, 'lng' => -9.6966, 'currency' => 'GNF', 'symbol' => 'FG'],
    'Guinea-Bissau' => ['iso2' => 'GW', 'continent' => 'Africa', 'lat' => 11.8037, 'lng' => -15.1804, 'currency' => 'XOF', 'symbol' => 'CFA'],
    'Ivory Coast' => ['iso2' => 'CI', 'continent' => 'Africa', 'lat' => 7.54, 'lng' => -5.5471, 'currency' => 'XOF', 'symbol' => 'CFA'], // alias
    'Kenya' => ['iso2' => 'KE', 'continent' => 'Africa', 'lat' => -1.286389, 'lng' => 36.817223, 'currency' => 'KES', 'symbol' => 'KSh'],
    'Lesotho' => ['iso2' => 'LS', 'continent' => 'Africa', 'lat' => -29.61, 'lng' => 28.2336, 'currency' => 'LSL', 'symbol' => 'M'],
    'Liberia' => ['iso2' => 'LR', 'continent' => 'Africa', 'lat' => 6.4281, 'lng' => -9.4295, 'currency' => 'LRD', 'symbol' => '$'],
    'Libya' => ['iso2' => 'LY', 'continent' => 'Africa', 'lat' => 26.3351, 'lng' => 17.2283, 'currency' => 'LYD', 'symbol' => 'LD'],
    'Madagascar' => ['iso2' => 'MG', 'continent' => 'Africa', 'lat' => -18.7669, 'lng' => 46.8691, 'currency' => 'MGA', 'symbol' => 'Ar'],
    'Malawi' => ['iso2' => 'MW', 'continent' => 'Africa', 'lat' => -13.2543, 'lng' => 34.3015, 'currency' => 'MWK', 'symbol' => 'MK'],
    'Mali' => ['iso2' => 'ML', 'continent' => 'Africa', 'lat' => 17.5707, 'lng' => -3.9962, 'currency' => 'XOF', 'symbol' => 'CFA'],
    'Mauritania' => ['iso2' => 'MR', 'continent' => 'Africa', 'lat' => 21.0079, 'lng' => -10.9408, 'currency' => 'MRU', 'symbol' => 'UM'],
    'Mauritius' => ['iso2' => 'MU', 'continent' => 'Africa', 'lat' => -20.3484, 'lng' => 57.5522, 'currency' => 'MUR', 'symbol' => '₨'],
    'Morocco' => ['iso2' => 'MA', 'continent' => 'Africa', 'lat' => 31.7917, 'lng' => -7.0926, 'currency' => 'MAD', 'symbol' => 'DH'],
    'Mozambique' => ['iso2' => 'MZ', 'continent' => 'Africa', 'lat' => -18.6657, 'lng' => 35.5296, 'currency' => 'MZN', 'symbol' => 'MT'],
    'Namibia' => ['iso2' => 'NA', 'continent' => 'Africa', 'lat' => -22.9576, 'lng' => 18.4904, 'currency' => 'NAD', 'symbol' => 'N$'],
    'Niger' => ['iso2' => 'NE', 'continent' => 'Africa', 'lat' => 17.6078, 'lng' => 8.0817, 'currency' => 'XOF', 'symbol' => 'CFA'],
    'Nigeria' => ['iso2' => 'NG', 'continent' => 'Africa', 'lat' => 9.082, 'lng' => 8.6753, 'currency' => 'NGN', 'symbol' => '₦'],
    'Rwanda' => ['iso2' => 'RW', 'continent' => 'Africa', 'lat' => -1.9403, 'lng' => 29.8739, 'currency' => 'RWF', 'symbol' => 'RF'],
    'São Tomé and Príncipe' => ['iso2' => 'ST', 'continent' => 'Africa', 'lat' => 0.1864, 'lng' => 6.6131, 'currency' => 'STN', 'symbol' => 'Db'],
    'Senegal' => ['iso2' => 'SN', 'continent' => 'Africa', 'lat' => 14.4974, 'lng' => -14.4524, 'currency' => 'XOF', 'symbol' => 'CFA'],
    'Seychelles' => ['iso2' => 'SC', 'continent' => 'Africa', 'lat' => -4.6796, 'lng' => 55.492, 'currency' => 'SCR', 'symbol' => '₨'],
    'Sierra Leone' => ['iso2' => 'SL', 'continent' => 'Africa', 'lat' => 8.4606, 'lng' => -11.7799, 'currency' => 'SLL', 'symbol' => 'Le'],
    'Somalia' => ['iso2' => 'SO', 'continent' => 'Africa', 'lat' => 5.1521, 'lng' => 46.1996, 'currency' => 'SOS', 'symbol' => 'Sh'],
    'South Africa' => ['iso2' => 'ZA', 'continent' => 'Africa', 'lat' => -30.5595, 'lng' => 22.9375, 'currency' => 'ZAR', 'symbol' => 'R'],
    'South Sudan' => ['iso2' => 'SS', 'continent' => 'Africa', 'lat' => 6.877, 'lng' => 31.307, 'currency' => 'SSP', 'symbol' => '£'],
    'Sudan' => ['iso2' => 'SD', 'continent' => 'Africa', 'lat' => 12.8628, 'lng' => 30.2176, 'currency' => 'SDG', 'symbol' => '£'],
    'Tanzania' => ['iso2' => 'TZ', 'continent' => 'Africa', 'lat' => -6.369, 'lng' => 34.8888, 'currency' => 'TZS', 'symbol' => 'TSh'],
    'Togo' => ['iso2' => 'TG', 'continent' => 'Africa', 'lat' => 8.6195, 'lng' => 0.8248, 'currency' => 'XOF', 'symbol' => 'CFA'],
    'Tunisia' => ['iso2' => 'TN', 'continent' => 'Africa', 'lat' => 33.8869, 'lng' => 9.5375, 'currency' => 'TND', 'symbol' => 'DT'],
    'Uganda' => ['iso2' => 'UG', 'continent' => 'Africa', 'lat' => 1.3733, 'lng' => 32.2903, 'currency' => 'UGX', 'symbol' => 'USh'],
    'Zambia' => ['iso2' => 'ZM', 'continent' => 'Africa', 'lat' => -13.1339, 'lng' => 27.8493, 'currency' => 'ZMW', 'symbol' => 'ZK'],
    'Zimbabwe' => ['iso2' => 'ZW', 'continent' => 'Africa', 'lat' => -19.0154, 'lng' => 29.1549, 'currency' => 'ZWL', 'symbol' => '$'],

    // --- ASIA ---
    'Afghanistan' => ['iso2' => 'AF', 'continent' => 'Asia', 'lat' => 33.9391, 'lng' => 67.71, 'currency' => 'AFN', 'symbol' => '؋'],
    'Armenia' => ['iso2' => 'AM', 'continent' => 'Asia', 'lat' => 40.0691, 'lng' => 45.0382, 'currency' => 'AMD', 'symbol' => '֏'],
    'Azerbaijan' => ['iso2' => 'AZ', 'continent' => 'Asia', 'lat' => 40.1431, 'lng' => 47.5769, 'currency' => 'AZN', 'symbol' => '₼'],
    'Bahrain' => ['iso2' => 'BH', 'continent' => 'Asia', 'lat' => 26.0667, 'lng' => 50.5577, 'currency' => 'BHD', 'symbol' => '.د.ب'],
    'Bangladesh' => ['iso2' => 'BD', 'continent' => 'Asia', 'lat' => 23.685, 'lng' => 90.3563, 'currency' => 'BDT', 'symbol' => '৳'],
    'Bhutan' => ['iso2' => 'BT', 'continent' => 'Asia', 'lat' => 27.5142, 'lng' => 90.4336, 'currency' => 'BTN', 'symbol' => 'Nu'],
    'Brunei' => ['iso2' => 'BN', 'continent' => 'Asia', 'lat' => 4.5353, 'lng' => 114.7277, 'currency' => 'BND', 'symbol' => 'B$'],
    'Cambodia' => ['iso2' => 'KH', 'continent' => 'Asia', 'lat' => 12.5657, 'lng' => 104.991, 'currency' => 'KHR', 'symbol' => '៛'],
    'China' => ['iso2' => 'CN', 'continent' => 'Asia', 'lat' => 35.8617, 'lng' => 104.1954, 'currency' => 'CNY', 'symbol' => '¥'],
    'Cyprus' => ['iso2' => 'CY', 'continent' => 'Asia', 'lat' => 35.1264, 'lng' => 33.4299, 'currency' => 'EUR', 'symbol' => '€'],
    'Georgia' => ['iso2' => 'GE', 'continent' => 'Asia', 'lat' => 42.3154, 'lng' => 43.3569, 'currency' => 'GEL', 'symbol' => 'ლ'],
    'India' => ['iso2' => 'IN', 'continent' => 'Asia', 'lat' => 20.5937, 'lng' => 78.9629, 'currency' => 'INR', 'symbol' => '₹'],
    'Indonesia' => ['iso2' => 'ID', 'continent' => 'Asia', 'lat' => -0.7893, 'lng' => 113.9213, 'currency' => 'IDR', 'symbol' => 'Rp'],
    'Iran' => ['iso2' => 'IR', 'continent' => 'Asia', 'lat' => 32.4279, 'lng' => 53.688, 'currency' => 'IRR', 'symbol' => '﷼'],
    'Iraq' => ['iso2' => 'IQ', 'continent' => 'Asia', 'lat' => 33.2232, 'lng' => 43.6793, 'currency' => 'IQD', 'symbol' => 'ع.د'],
    'Israel' => ['iso2' => 'IL', 'continent' => 'Asia', 'lat' => 31.0461, 'lng' => 34.8516, 'currency' => 'ILS', 'symbol' => '₪'],
    'Japan' => ['iso2' => 'JP', 'continent' => 'Asia', 'lat' => 36.2048, 'lng' => 138.2529, 'currency' => 'JPY', 'symbol' => '¥'],
    'Jordan' => ['iso2' => 'JO', 'continent' => 'Asia', 'lat' => 30.5852, 'lng' => 36.2384, 'currency' => 'JOD', 'symbol' => 'JD'],
    'Kazakhstan' => ['iso2' => 'KZ', 'continent' => 'Asia', 'lat' => 48.0196, 'lng' => 66.9237, 'currency' => 'KZT', 'symbol' => '₸'],
    'Kuwait' => ['iso2' => 'KW', 'continent' => 'Asia', 'lat' => 29.3117, 'lng' => 47.4818, 'currency' => 'KWD', 'symbol' => 'KD'],
    'Kyrgyzstan' => ['iso2' => 'KG', 'continent' => 'Asia', 'lat' => 41.2044, 'lng' => 74.7661, 'currency' => 'KGS', 'symbol' => 'som'],
    'Laos' => ['iso2' => 'LA', 'continent' => 'Asia', 'lat' => 19.8563, 'lng' => 102.4955, 'currency' => 'LAK', 'symbol' => '₭'],
    'Lebanon' => ['iso2' => 'LB', 'continent' => 'Asia', 'lat' => 33.8547, 'lng' => 35.8623, 'currency' => 'LBP', 'symbol' => '£'],
    'Malaysia' => ['iso2' => 'MY', 'continent' => 'Asia', 'lat' => 4.2105, 'lng' => 101.9758, 'currency' => 'MYR', 'symbol' => 'RM'],
    'Maldives' => ['iso2' => 'MV', 'continent' => 'Asia', 'lat' => 3.2028, 'lng' => 73.2207, 'currency' => 'MVR', 'symbol' => 'Rf'],
    'Mongolia' => ['iso2' => 'MN', 'continent' => 'Asia', 'lat' => 46.8625, 'lng' => 103.8467, 'currency' => 'MNT', 'symbol' => '₮'],
    'Myanmar' => ['iso2' => 'MM', 'continent' => 'Asia', 'lat' => 21.9162, 'lng' => 95.956, 'currency' => 'MMK', 'symbol' => 'K'],
    'Nepal' => ['iso2' => 'NP', 'continent' => 'Asia', 'lat' => 28.3949, 'lng' => 84.124, 'currency' => 'NPR', 'symbol' => '₨'],
    'North Korea' => ['iso2' => 'KP', 'continent' => 'Asia', 'lat' => 40.3399, 'lng' => 127.5101, 'currency' => 'KPW', 'symbol' => '₩'],
    'Oman' => ['iso2' => 'OM', 'continent' => 'Asia', 'lat' => 21.4735, 'lng' => 55.9754, 'currency' => 'OMR', 'symbol' => 'ر.ع.'],
    'Pakistan' => ['iso2' => 'PK', 'continent' => 'Asia', 'lat' => 30.3753, 'lng' => 69.3451, 'currency' => 'PKR', 'symbol' => '₨'],
    'Palestine' => ['iso2' => 'PS', 'continent' => 'Asia', 'lat' => 31.9522, 'lng' => 35.2332, 'currency' => 'ILS', 'symbol' => '₪'],
    'Philippines' => ['iso2' => 'PH', 'continent' => 'Asia', 'lat' => 12.8797, 'lng' => 121.774, 'currency' => 'PHP', 'symbol' => '₱'],
    'Qatar' => ['iso2' => 'QA', 'continent' => 'Asia', 'lat' => 25.3548, 'lng' => 51.1839, 'currency' => 'QAR', 'symbol' => 'ر.ق'],
    'Saudi Arabia' => ['iso2' => 'SA', 'continent' => 'Asia', 'lat' => 23.8859, 'lng' => 45.0792, 'currency' => 'SAR', 'symbol' => 'ر.س'],
    'Singapore' => ['iso2' => 'SG', 'continent' => 'Asia', 'lat' => 1.3521, 'lng' => 103.8198, 'currency' => 'SGD', 'symbol' => 'S$'],
    'South Korea' => ['iso2' => 'KR', 'continent' => 'Asia', 'lat' => 35.9078, 'lng' => 127.7669, 'currency' => 'KRW', 'symbol' => '₩'],
    'Sri Lanka' => ['iso2' => 'LK', 'continent' => 'Asia', 'lat' => 7.8731, 'lng' => 80.7718, 'currency' => 'LKR', 'symbol' => 'Rs'],
    'Syria' => ['iso2' => 'SY', 'continent' => 'Asia', 'lat' => 34.8021, 'lng' => 38.9968, 'currency' => 'SYP', 'symbol' => '£S'],
    'Taiwan' => ['iso2' => 'TW', 'continent' => 'Asia', 'lat' => 23.6978, 'lng' => 120.9605, 'currency' => 'TWD', 'symbol' => 'NT$'],
    'Tajikistan' => ['iso2' => 'TJ', 'continent' => 'Asia', 'lat' => 38.861, 'lng' => 71.2761, 'currency' => 'TJS', 'symbol' => 'SM'],
    'Thailand' => ['iso2' => 'TH', 'continent' => 'Asia', 'lat' => 15.87, 'lng' => 100.9925, 'currency' => 'THB', 'symbol' => '฿'],
    'Timor-Leste' => ['iso2' => 'TL', 'continent' => 'Asia', 'lat' => -8.8742, 'lng' => 125.7275, 'currency' => 'USD', 'symbol' => '$'],
    'Turkey' => ['iso2' => 'TR', 'continent' => 'Asia', 'lat' => 38.9637, 'lng' => 35.2433, 'currency' => 'TRY', 'symbol' => '₺'],
    'Türkiye' => ['iso2' => 'TR', 'continent' => 'Asia', 'lat' => 38.9637, 'lng' => 35.2433, 'currency' => 'TRY', 'symbol' => '₺'], // alias
    'Turkmenistan' => ['iso2' => 'TM', 'continent' => 'Asia', 'lat' => 38.9697, 'lng' => 59.5563, 'currency' => 'TMT', 'symbol' => 'm'],
    'United Arab Emirates' => ['iso2' => 'AE', 'continent' => 'Asia', 'lat' => 23.4241, 'lng' => 53.8478, 'currency' => 'AED', 'symbol' => 'د.إ'],
    'UAE' => ['iso2' => 'AE', 'continent' => 'Asia', 'lat' => 23.4241, 'lng' => 53.8478, 'currency' => 'AED', 'symbol' => 'د.إ'], // alias
    'Uzbekistan' => ['iso2' => 'UZ', 'continent' => 'Asia', 'lat' => 41.3775, 'lng' => 64.5853, 'currency' => 'UZS', 'symbol' => 'so‘m'],
    'Vietnam' => ['iso2' => 'VN', 'continent' => 'Asia', 'lat' => 14.0583, 'lng' => 108.2772, 'currency' => 'VND', 'symbol' => '₫'],
    'Yemen' => ['iso2' => 'YE', 'continent' => 'Asia', 'lat' => 15.5527, 'lng' => 48.5164, 'currency' => 'YER', 'symbol' => '﷼'],

    // --- EUROPE ---
    'Albania' => ['iso2' => 'AL', 'continent' => 'Europe', 'lat' => 41.1533, 'lng' => 20.1683, 'currency' => 'ALL', 'symbol' => 'L'],
    'Andorra' => ['iso2' => 'AD', 'continent' => 'Europe', 'lat' => 42.5462, 'lng' => 1.6016, 'currency' => 'EUR', 'symbol' => '€'],
    'Austria' => ['iso2' => 'AT', 'continent' => 'Europe', 'lat' => 47.5162, 'lng' => 14.5501, 'currency' => 'EUR', 'symbol' => '€'],
    'Belarus' => ['iso2' => 'BY', 'continent' => 'Europe', 'lat' => 53.7098, 'lng' => 27.9534, 'currency' => 'BYN', 'symbol' => 'Br'],
    'Belgium' => ['iso2' => 'BE', 'continent' => 'Europe', 'lat' => 50.5039, 'lng' => 4.4699, 'currency' => 'EUR', 'symbol' => '€'],
    'Bosnia and Herzegovina' => ['iso2' => 'BA', 'continent' => 'Europe', 'lat' => 43.9159, 'lng' => 17.6791, 'currency' => 'BAM', 'symbol' => 'KM'],
    'Bulgaria' => ['iso2' => 'BG', 'continent' => 'Europe', 'lat' => 42.7339, 'lng' => 25.4858, 'currency' => 'BGN', 'symbol' => 'лв'],
    'Croatia' => ['iso2' => 'HR', 'continent' => 'Europe', 'lat' => 45.1, 'lng' => 15.2, 'currency' => 'HRK', 'symbol' => 'kn'],
    'Czech Republic' => ['iso2' => 'CZ', 'continent' => 'Europe', 'lat' => 49.8175, 'lng' => 15.473, 'currency' => 'CZK', 'symbol' => 'Kč'],
    'Denmark' => ['iso2' => 'DK', 'continent' => 'Europe', 'lat' => 56.2639, 'lng' => 9.5018, 'currency' => 'DKK', 'symbol' => 'kr'],
    'Estonia' => ['iso2' => 'EE', 'continent' => 'Europe', 'lat' => 58.5953, 'lng' => 25.0136, 'currency' => 'EUR', 'symbol' => '€'],
    'Finland' => ['iso2' => 'FI', 'continent' => 'Europe', 'lat' => 61.9241, 'lng' => 25.7482, 'currency' => 'EUR', 'symbol' => '€'],
    'France' => ['iso2' => 'FR', 'continent' => 'Europe', 'lat' => 46.2276, 'lng' => 2.2137, 'currency' => 'EUR', 'symbol' => '€'],
    'Germany' => ['iso2' => 'DE', 'continent' => 'Europe', 'lat' => 51.1657, 'lng' => 10.4515, 'currency' => 'EUR', 'symbol' => '€'],
    'Greece' => ['iso2' => 'GR', 'continent' => 'Europe', 'lat' => 39.0742, 'lng' => 21.8243, 'currency' => 'EUR', 'symbol' => '€'],
    'Hungary' => ['iso2' => 'HU', 'continent' => 'Europe', 'lat' => 47.1625, 'lng' => 19.5033, 'currency' => 'HUF', 'symbol' => 'Ft'],
    'Iceland' => ['iso2' => 'IS', 'continent' => 'Europe', 'lat' => 64.9631, 'lng' => -19.0208, 'currency' => 'ISK', 'symbol' => 'kr'],
    'Ireland' => ['iso2' => 'IE', 'continent' => 'Europe', 'lat' => 53.4129, 'lng' => -8.2439, 'currency' => 'EUR', 'symbol' => '€'],
    'Italy' => ['iso2' => 'IT', 'continent' => 'Europe', 'lat' => 41.8719, 'lng' => 12.5674, 'currency' => 'EUR', 'symbol' => '€'],
    'Kosovo' => ['iso2' => 'XK', 'continent' => 'Europe', 'lat' => 42.6026, 'lng' => 20.903, 'currency' => 'EUR', 'symbol' => '€'],
    'Latvia' => ['iso2' => 'LV', 'continent' => 'Europe', 'lat' => 56.8796, 'lng' => 24.6032, 'currency' => 'EUR', 'symbol' => '€'],
    'Liechtenstein' => ['iso2' => 'LI', 'continent' => 'Europe', 'lat' => 47.166, 'lng' => 9.5554, 'currency' => 'CHF', 'symbol' => 'CHF'],
    'Lithuania' => ['iso2' => 'LT', 'continent' => 'Europe', 'lat' => 55.1694, 'lng' => 23.8813, 'currency' => 'EUR', 'symbol' => '€'],
    'Luxembourg' => ['iso2' => 'LU', 'continent' => 'Europe', 'lat' => 49.8153, 'lng' => 6.1296, 'currency' => 'EUR', 'symbol' => '€'],
    'Malta' => ['iso2' => 'MT', 'continent' => 'Europe', 'lat' => 35.9375, 'lng' => 14.3754, 'currency' => 'EUR', 'symbol' => '€'],
    'Moldova' => ['iso2' => 'MD', 'continent' => 'Europe', 'lat' => 47.4116, 'lng' => 28.3699, 'currency' => 'MDL', 'symbol' => 'L'],
    'Monaco' => ['iso2' => 'MC', 'continent' => 'Europe', 'lat' => 43.7384, 'lng' => 7.4246, 'currency' => 'EUR', 'symbol' => '€'],
    'Montenegro' => ['iso2' => 'ME', 'continent' => 'Europe', 'lat' => 42.7087, 'lng' => 19.3744, 'currency' => 'EUR', 'symbol' => '€'],
    'Netherlands' => ['iso2' => 'NL', 'continent' => 'Europe', 'lat' => 52.1326, 'lng' => 5.2913, 'currency' => 'EUR', 'symbol' => '€'],
    'North Macedonia' => ['iso2' => 'MK', 'continent' => 'Europe', 'lat' => 41.6086, 'lng' => 21.7453, 'currency' => 'MKD', 'symbol' => 'ден'],
    'Norway' => ['iso2' => 'NO', 'continent' => 'Europe', 'lat' => 60.472, 'lng' => 8.4689, 'currency' => 'NOK', 'symbol' => 'kr'],
    'Poland' => ['iso2' => 'PL', 'continent' => 'Europe', 'lat' => 51.9194, 'lng' => 19.1451, 'currency' => 'PLN', 'symbol' => 'zł'],
    'Portugal' => ['iso2' => 'PT', 'continent' => 'Europe', 'lat' => 39.3999, 'lng' => -8.2245, 'currency' => 'EUR', 'symbol' => '€'],
    'Romania' => ['iso2' => 'RO', 'continent' => 'Europe', 'lat' => 45.9432, 'lng' => 24.9668, 'currency' => 'RON', 'symbol' => 'lei'],
    'Russia' => ['iso2' => 'RU', 'continent' => 'Europe', 'lat' => 61.524, 'lng' => 105.3188, 'currency' => 'RUB', 'symbol' => '₽'],
    'San Marino' => ['iso2' => 'SM', 'continent' => 'Europe', 'lat' => 43.9424, 'lng' => 12.4578, 'currency' => 'EUR', 'symbol' => '€'],
    'Serbia' => ['iso2' => 'RS', 'continent' => 'Europe', 'lat' => 44.0165, 'lng' => 21.0059, 'currency' => 'RSD', 'symbol' => 'дин'],
    'Slovakia' => ['iso2' => 'SK', 'continent' => 'Europe', 'lat' => 48.669, 'lng' => 19.699, 'currency' => 'EUR', 'symbol' => '€'],
    'Slovenia' => ['iso2' => 'SI', 'continent' => 'Europe', 'lat' => 46.1512, 'lng' => 14.9955, 'currency' => 'EUR', 'symbol' => '€'],
    'Spain' => ['iso2' => 'ES', 'continent' => 'Europe', 'lat' => 40.4637, 'lng' => -3.7492, 'currency' => 'EUR', 'symbol' => '€'],
    'Sweden' => ['iso2' => 'SE', 'continent' => 'Europe', 'lat' => 60.1282, 'lng' => 18.6435, 'currency' => 'SEK', 'symbol' => 'kr'],
    'Switzerland' => ['iso2' => 'CH', 'continent' => 'Europe', 'lat' => 46.8182, 'lng' => 8.2275, 'currency' => 'CHF', 'symbol' => 'CHF'],
    'Ukraine' => ['iso2' => 'UA', 'continent' => 'Europe', 'lat' => 48.3794, 'lng' => 31.1656, 'currency' => 'UAH', 'symbol' => '₴'],
    'United Kingdom' => ['iso2' => 'GB', 'continent' => 'Europe', 'lat' => 55.3781, 'lng' => -3.436, 'currency' => 'GBP', 'symbol' => '£'],
    'UK' => ['iso2' => 'GB', 'continent' => 'Europe', 'lat' => 55.3781, 'lng' => -3.436, 'currency' => 'GBP', 'symbol' => '£'], // alias
    'Vatican City' => ['iso2' => 'VA', 'continent' => 'Europe', 'lat' => 41.9029, 'lng' => 12.4534, 'currency' => 'EUR', 'symbol' => '€'],

    // --- NORTH AMERICA ---
    'Antigua and Barbuda' => ['iso2' => 'AG', 'continent' => 'North America', 'lat' => 17.0608, 'lng' => -61.7964, 'currency' => 'XCD', 'symbol' => '$'],
    'Bahamas' => ['iso2' => 'BS', 'continent' => 'North America', 'lat' => 25.0343, 'lng' => -77.3963, 'currency' => 'BSD', 'symbol' => '$'],
    'Barbados' => ['iso2' => 'BB', 'continent' => 'North America', 'lat' => 13.1939, 'lng' => -59.5432, 'currency' => 'BBD', 'symbol' => '$'],
    'Belize' => ['iso2' => 'BZ', 'continent' => 'North America', 'lat' => 17.1899, 'lng' => -88.4976, 'currency' => 'BZD', 'symbol' => '$'],
    'Canada' => ['iso2' => 'CA', 'continent' => 'North America', 'lat' => 56.1304, 'lng' => -106.3468, 'currency' => 'CAD', 'symbol' => 'C$'],
    'Costa Rica' => ['iso2' => 'CR', 'continent' => 'North America', 'lat' => 9.7489, 'lng' => -83.7534, 'currency' => 'CRC', 'symbol' => '₡'],
    'Cuba' => ['iso2' => 'CU', 'continent' => 'North America', 'lat' => 21.5218, 'lng' => -77.7812, 'currency' => 'CUP', 'symbol' => '$'],
    'Dominica' => ['iso2' => 'DM', 'continent' => 'North America', 'lat' => 15.4145, 'lng' => -61.3709, 'currency' => 'XCD', 'symbol' => '$'],
    'Dominican Republic' => ['iso2' => 'DO', 'continent' => 'North America', 'lat' => 18.7357, 'lng' => -70.1627, 'currency' => 'DOP', 'symbol' => 'RD$'],
    'El Salvador' => ['iso2' => 'SV', 'continent' => 'North America', 'lat' => 13.7942, 'lng' => -88.8965, 'currency' => 'USD', 'symbol' => '$'],
    'Grenada' => ['iso2' => 'GD', 'continent' => 'North America', 'lat' => 12.1165, 'lng' => -61.679, 'currency' => 'XCD', 'symbol' => '$'],
    'Guatemala' => ['iso2' => 'GT', 'continent' => 'North America', 'lat' => 15.7835, 'lng' => -90.2308, 'currency' => 'GTQ', 'symbol' => 'Q'],
    'Haiti' => ['iso2' => 'HT', 'continent' => 'North America', 'lat' => 18.9712, 'lng' => -72.2852, 'currency' => 'HTG', 'symbol' => 'G'],
    'Honduras' => ['iso2' => 'HN', 'continent' => 'North America', 'lat' => 15.2, 'lng' => -86.2419, 'currency' => 'HNL', 'symbol' => 'L'],
    'Jamaica' => ['iso2' => 'JM', 'continent' => 'North America', 'lat' => 18.1096, 'lng' => -77.2975, 'currency' => 'JMD', 'symbol' => '$'],
    'Mexico' => ['iso2' => 'MX', 'continent' => 'North America', 'lat' => 23.6345, 'lng' => -102.5528, 'currency' => 'MXN', 'symbol' => '$'],
    'Nicaragua' => ['iso2' => 'NI', 'continent' => 'North America', 'lat' => 12.8654, 'lng' => -85.2072, 'currency' => 'NIO', 'symbol' => 'C$'],
    'Panama' => ['iso2' => 'PA', 'continent' => 'North America', 'lat' => 8.538, 'lng' => -80.7821, 'currency' => 'PAB', 'symbol' => 'B/.'],
    'Saint Kitts and Nevis' => ['iso2' => 'KN', 'continent' => 'North America', 'lat' => 17.3578, 'lng' => -62.783, 'currency' => 'XCD', 'symbol' => '$'],
    'Saint Lucia' => ['iso2' => 'LC', 'continent' => 'North America', 'lat' => 13.9094, 'lng' => -60.9789, 'currency' => 'XCD', 'symbol' => '$'],
    'Saint Vincent and the Grenadines' => ['iso2' => 'VC', 'continent' => 'North America', 'lat' => 12.9843, 'lng' => -61.2872, 'currency' => 'XCD', 'symbol' => '$'],
    'Trinidad and Tobago' => ['iso2' => 'TT', 'continent' => 'North America', 'lat' => 10.6918, 'lng' => -61.2225, 'currency' => 'TTD', 'symbol' => '$'],
    'United States' => ['iso2' => 'US', 'continent' => 'North America', 'lat' => 37.0902, 'lng' => -95.7129, 'currency' => 'USD', 'symbol' => '$'],
    'USA' => ['iso2' => 'US', 'continent' => 'North America', 'lat' => 37.0902, 'lng' => -95.7129, 'currency' => 'USD', 'symbol' => '$'], // alias
    'US' => ['iso2' => 'US', 'continent' => 'North America', 'lat' => 37.0902, 'lng' => -95.7129, 'currency' => 'USD', 'symbol' => '$'], // alias
    'Greenland' => ['iso2' => 'GL', 'continent' => 'North America', 'lat' => 71.7069, 'lng' => -42.6043, 'currency' => 'DKK', 'symbol' => 'kr'],
    'Puerto Rico' => ['iso2' => 'PR', 'continent' => 'North America', 'lat' => 18.2208, 'lng' => -66.5901, 'currency' => 'USD', 'symbol' => '$'],
    'Martinique' => ['iso2' => 'MQ', 'continent' => 'North America', 'lat' => 14.6415, 'lng' => -61.0242, 'currency' => 'EUR', 'symbol' => '€'],
    'Guadeloupe' => ['iso2' => 'GP', 'continent' => 'North America', 'lat' => 16.265, 'lng' => -61.551, 'currency' => 'EUR', 'symbol' => '€'],

    // --- SOUTH AMERICA ---
    'Argentina' => ['iso2' => 'AR', 'continent' => 'South America', 'lat' => -38.4161, 'lng' => -63.6167, 'currency' => 'ARS', 'symbol' => '$'],
    'Bolivia' => ['iso2' => 'BO', 'continent' => 'South America', 'lat' => -16.2902, 'lng' => -63.5887, 'currency' => 'BOB', 'symbol' => 'Bs'],
    'Brazil' => ['iso2' => 'BR', 'continent' => 'South America', 'lat' => -14.235, 'lng' => -51.9253, 'currency' => 'BRL', 'symbol' => 'R$'],
    'Chile' => ['iso2' => 'CL', 'continent' => 'South America', 'lat' => -35.6751, 'lng' => -71.543, 'currency' => 'CLP', 'symbol' => '$'],
    'Colombia' => ['iso2' => 'CO', 'continent' => 'South America', 'lat' => 4.5709, 'lng' => -74.2973, 'currency' => 'COP', 'symbol' => '$'],
    'Ecuador' => ['iso2' => 'EC', 'continent' => 'South America', 'lat' => -1.8312, 'lng' => -78.1834, 'currency' => 'USD', 'symbol' => '$'],
    'Guyana' => ['iso2' => 'GY', 'continent' => 'South America', 'lat' => 4.8604, 'lng' => -58.9302, 'currency' => 'GYD', 'symbol' => '$'],
    'Paraguay' => ['iso2' => 'PY', 'continent' => 'South America', 'lat' => -23.4425, 'lng' => -58.4438, 'currency' => 'PYG', 'symbol' => '₲'],
    'Peru' => ['iso2' => 'PE', 'continent' => 'South America', 'lat' => -9.1899, 'lng' => -75.0152, 'currency' => 'PEN', 'symbol' => 'S/'],
    'Suriname' => ['iso2' => 'SR', 'continent' => 'South America', 'lat' => 3.9193, 'lng' => -56.0278, 'currency' => 'SRD', 'symbol' => '$'],
    'Uruguay' => ['iso2' => 'UY', 'continent' => 'South America', 'lat' => -32.5228, 'lng' => -55.7658, 'currency' => 'UYU', 'symbol' => '$U'],
    'Venezuela' => ['iso2' => 'VE', 'continent' => 'South America', 'lat' => 6.4238, 'lng' => -66.5897, 'currency' => 'VES', 'symbol' => 'Bs'],

    // --- OCEANIA ---
    'Australia' => ['iso2' => 'AU', 'continent' => 'Oceania', 'lat' => -25.2744, 'lng' => 133.7751, 'currency' => 'AUD', 'symbol' => 'A$'],
    'Fiji' => ['iso2' => 'FJ', 'continent' => 'Oceania', 'lat' => -17.7134, 'lng' => 178.065, 'currency' => 'FJD', 'symbol' => '$'],
    'Kiribati' => ['iso2' => 'KI', 'continent' => 'Oceania', 'lat' => -3.3704, 'lng' => -168.734, 'currency' => 'AUD', 'symbol' => 'A$'],
    'Marshall Islands' => ['iso2' => 'MH', 'continent' => 'Oceania', 'lat' => 7.1315, 'lng' => 171.1845, 'currency' => 'USD', 'symbol' => '$'],
    'Micronesia' => ['iso2' => 'FM', 'continent' => 'Oceania', 'lat' => 7.4256, 'lng' => 150.5508, 'currency' => 'USD', 'symbol' => '$'],
    'Nauru' => ['iso2' => 'NR', 'continent' => 'Oceania', 'lat' => -0.5228, 'lng' => 166.9315, 'currency' => 'AUD', 'symbol' => 'A$'],
    'New Zealand' => ['iso2' => 'NZ', 'continent' => 'Oceania', 'lat' => -40.9006, 'lng' => 174.886, 'currency' => 'NZD', 'symbol' => 'NZ$'],
    'Palau' => ['iso2' => 'PW', 'continent' => 'Oceania', 'lat' => 7.515, 'lng' => 134.5825, 'currency' => 'USD', 'symbol' => '$'],
    'Papua New Guinea' => ['iso2' => 'PG', 'continent' => 'Oceania', 'lat' => -6.314, 'lng' => 143.9555, 'currency' => 'PGK', 'symbol' => 'K'],
    'Samoa' => ['iso2' => 'WS', 'continent' => 'Oceania', 'lat' => -13.759, 'lng' => -172.1046, 'currency' => 'WST', 'symbol' => 'T'],
    'Solomon Islands' => ['iso2' => 'SB', 'continent' => 'Oceania', 'lat' => -9.6457, 'lng' => 160.1562, 'currency' => 'SBD', 'symbol' => '$'],
    'Tonga' => ['iso2' => 'TO', 'continent' => 'Oceania', 'lat' => -21.179, 'lng' => -175.1982, 'currency' => 'TOP', 'symbol' => 'T$'],
    'Tuvalu' => ['iso2' => 'TV', 'continent' => 'Oceania', 'lat' => -7.1095, 'lng' => 177.6493, 'currency' => 'AUD', 'symbol' => 'A$'],
    'Vanuatu' => ['iso2' => 'VU', 'continent' => 'Oceania', 'lat' => -15.3767, 'lng' => 166.9592, 'currency' => 'VUV', 'symbol' => 'VT'],

    // Other territories (French departments, etc.)
    'French Guiana' => ['iso2' => 'GF', 'continent' => 'South America', 'lat' => 4.9224, 'lng' => -53.0004, 'currency' => 'EUR', 'symbol' => '€'],
    'Réunion' => ['iso2' => 'RE', 'continent' => 'Africa', 'lat' => -21.1151, 'lng' => 55.5364, 'currency' => 'EUR', 'symbol' => '€'],
    'Mayotte' => ['iso2' => 'YT', 'continent' => 'Africa', 'lat' => -12.8275, 'lng' => 45.1662, 'currency' => 'EUR', 'symbol' => '€'],
];

/**
 * UN M49 Regional Numeric Mapping for MapLibre/Google Regional Scopes
 *
 * @var array<string, string>
 */
$continent_iso_map = [
    'Africa'        => '002',
    'Asia'          => '142',
    'Europe'        => '150',
    'North America' => '021',
    'South America' => '005',
    'Oceania'       => '009'
];

/**
 * Optimized Backward-Compatible Export Lookups
 */
$continent_map = [];
$country_iso_map = [];
$country_currency_map = [];
$currency_symbol_map = [];

foreach ($global_country_registry as $name => $meta) {
    $continent_map[$name] = $meta['continent'];
    $country_iso_map[$name] = $meta['iso2'];
    $country_currency_map[$meta['iso2']] = $meta['currency'];
    $currency_symbol_map[$meta['currency']] = $meta['symbol'];
}

$continents = array_values(array_unique($continent_map));
asort($continents);

// Output JSON Payload when accessed directly via API HTTP request
if (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'] ?? '')) {
    echo json_encode([
        'status' => 'success',
        'data' => $global_country_registry,
        'continents' => array_values($continents),
        'region_codes' => $continent_iso_map
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * BUG FIX: this file previously had no top-level `return`, so it only ever
 * worked when hit directly as an HTTP endpoint (the branch above). When
 * Laravel's config loader pulls in `config/continent_map.php` — as
 * `AnalyticsController::index()` does via `config('continent_map')` to
 * build the `cartoRegistry` Inertia prop — it does the equivalent of
 * `$value = require $path;`. Without an explicit `return`, a successful
 * `require` yields PHP's default value of `1` (an int), not this file's
 * data. `config('continent_map')` was therefore resolving to `1`, so every
 * `cartoRegistry[country]` lookup in GeoMap.jsx's `resolveRegistryEntry()`
 * silently failed — Grid view still worked (it only needs the country
 * names/flags already present in the `geo()` payload itself), but every
 * CircleMarker on "View Map" was dropped by the `Number.isFinite` lat/lng
 * guard, since it could never resolve real coordinates.
 *
 * Returning `$global_country_registry` here — keyed by country name, each
 * entry carrying `iso2`/`continent`/`lat`/`lng`/`currency`/`symbol` — gives
 * `config('continent_map')` the exact shape `resolveRegistryEntry()` and
 * `resolveIso2()` already expect.
 */
return $global_country_registry;
