/**
 * ============================================================
 * FilterBar Component – COZA Analytics Dashboard
 * ============================================================
 *
 * TailAdmin-styled analytics filter control panel. The component
 * preserves the existing hook contract and filter semantics while
 * replacing only the presentation layer.
 *
 * BRAND: date-input focus rings use the COZA royal-purple accent. The
 * "Quick Preset" buttons carry a stronger brand treatment than plain
 * borders — the active preset uses the signature `coza-gradient`
 * (purple → gold) with a matching purple glow, while inactive presets
 * get a soft gold-glow border on hover so the whole row still feels
 * premium even before a selection is made.
 *
 * BRAND REVAMP (v2.1): the Service Type / Program selects now use the
 * shared `.coza-select-standout` utility (see analyticsDashboard.css
 * §"15. FORM CONTROLS") — a gradient-tinted surface with a gold-to-purple
 * border and a custom chevron — so this row is the most visually
 * prominent control cluster on the filter bar in both light and dark
 * mode, rather than blending into the plain gray field style used
 * elsewhere.
 *
 * BUG FIX (v2.2): the two date-range inputs were also using
 * `.coza-select-standout`, which applies `appearance-none` — correct
 * for `<select>` (it hides the native dropdown arrow so a custom chevron
 * can be used) but actively breaks `<input type="date">`, hiding its
 * native calendar icon and disabling the click-to-open picker entirely
 * in Chromium-based browsers. They now use the dedicated
 * `.coza-date-input` utility instead, which keeps the identical visual
 * branding without `appearance-none`, restoring the calendar icon and
 * picker interaction in both themes.
 * ============================================================
 */

import React from 'react';
import { Calendar, Filter, Layers, Briefcase } from 'lucide-react';
import { DATE_PRESETS, getDatePresetRange } from '@/utils/dateHelpers';

/**
 * FilterBar Component
 *
 * @component
 * @param {Object} props
 * @param {string} props.startDate - Active ISO start date string (YYYY-MM-DD)
 * @param {string} props.endDate - Active ISO end date string (YYYY-MM-DD)
 * @param {Function} props.onStartDateChange - Handler for start date modifications
 * @param {Function} props.onEndDateChange - Handler for end date modifications
 * @param {string} [props.activePreset='custom'] - Currently active preset key
 * @param {Function} [props.onSelectPreset] - Handler when a preset button is clicked
 * @param {string} props.serviceType - Selected service type filter value
 * @param {Function} props.onServiceTypeChange - Handler for service type updates
 * @param {string} props.program - Selected program filter value
 * @param {Function} props.onProgramChange - Handler for program updates
 * @param {{serviceTypes: string[], programs: string[]}} props.filterOptions - Available dropdown options
 * @returns {JSX.Element}
 */
export default function FilterBar({
    startDate,
    endDate,
    onStartDateChange,
    onEndDateChange,
    activePreset = 'custom',
    onSelectPreset,
    serviceType,
    onServiceTypeChange,
    program,
    onProgramChange,
    filterOptions = { serviceTypes: [], programs: [] },
}) {
    /**
     * Handles a preset selection through the existing dashboard action.
     * Falls back to the original date helper only for backwards compatibility.
     *
     * @param {string} presetKey - Preset identifier.
     * @returns {void}
     */
    const handlePresetClick = (presetKey) => {
        if (onSelectPreset) {
            onSelectPreset(presetKey);
            return;
        }

        const range = getDatePresetRange(presetKey);
        onStartDateChange(range.startDate);
        onEndDateChange(range.endDate);
    };

    return (
        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03] sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-white/95">
                        Analytics Filters
                    </h2>
                    {/*<p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        Refine the reporting window and dimensions without changing the analytics backend.
                    </p> */}
                </div>

                <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 dark:bg-white/5 dark:text-gray-400">
                    <Filter className="size-3.5" />
                    Live query filters
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
                <div className="md:col-span-6">
                    <label htmlFor="dateStart" className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-gray-700 dark:text-gray-400">
                        <Calendar className="size-3.5 text-coza-purple-600 dark:text-coza-gold-400" />
                        Date Range
                    </label>
                        
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                        <input
                            type="date"
                            id="dateStart"
                            name="dateStart"
                            value={startDate}
                            onChange={(event) => onStartDateChange(event.target.value)}
                            className="coza-date-input h-10 w-full px-3 text-sm font-medium"
                        />

                        <span className="text-center text-xs font-semibold text-coza-purple-700 dark:text-coza-gold-400">to</span>

                        <input
                            type="date"
                            id="dateEnd"
                            name="dateEnd"
                            value={endDate}
                            onChange={(event) => onEndDateChange(event.target.value)}
                            className="coza-date-input h-10 w-full px-3 text-sm font-medium"
                        />
                    </div>
                </div>

                <div className="md:col-span-3">
                    <label htmlFor="serviceType" className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-gray-700 dark:text-gray-400">
                        <Briefcase className="size-3.5 text-coza-purple-600 dark:text-coza-gold-400" />
                        Service Type
                    </label>
                    <select
                        id="serviceType"
                        name="serviceType"
                        value={serviceType}
                        onChange={(event) => onServiceTypeChange(event.target.value)}
                        className="coza-select-standout h-10 w-full px-3 text-sm font-medium"
                    >
                        <option value="">All Services</option>
                        {filterOptions.serviceTypes.map((service) => (
                            <option key={service} value={service}>{service}</option>
                        ))}
                    </select>
                </div>

                <div className="md:col-span-3">
                    <label htmlFor="program" className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-gray-700 dark:text-gray-400">
                        <Layers className="size-3.5 text-coza-purple-600 dark:text-coza-gold-400" />
                        Program
                    </label>
                    <select
                        id="program"
                        name="program"
                        value={program}
                        onChange={(event) => onProgramChange(event.target.value)}
                        className="coza-select-standout h-10 w-full px-3 text-sm font-medium"
                    >
                        <option value="">All Programs</option>
                        {filterOptions.programs.map((item) => (
                            <option key={item} value={item}>{item}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="mt-5 border-t border-gray-100 pt-4 dark:border-gray-800">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.12em] text-gray-700 dark:text-gray-400">
                        Quick Presets
                    </span>

                    <div className="flex flex-wrap gap-2">
                        {DATE_PRESETS.map((preset) => {
                            const active = activePreset === preset.key;

                            return (
                                <button
                                    key={preset.key}
                                    type="button"
                                    onClick={() => handlePresetClick(preset.key)}
                                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition duration-300 ${
                                        active
                                            // Active preset: the COZA signature purple -> gold
                                            // gradient (mirrors `coza-gradient` in
                                            // analyticsDashboard.css) so the selected range is
                                            // unmistakably the "premium" / current choice.
                                            ? 'coza-gradient coza-purple-glow border-transparent text-white shadow-sm'
                                            // Inactive presets: a soft gold-glow border invites
                                            // the eye without competing with the active pill.
                                            : 'border-coza-gold-500/60 bg-white text-gray-700/60 shadow-sm hover:border-coza-gold-700 hover:bg-coza-gold-50 hover:text-coza-gold-700 hover:coza-gold-glow dark:border-coza-gold-500/25 dark:bg-transparent dark:text-gray-300 dark:shadow-none dark:hover:bg-coza-gold-500/10 dark:hover:text-coza-gold-300'
                                    }`}
                                >
                                    {preset.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}
