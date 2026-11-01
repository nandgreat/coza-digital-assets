import React from 'react';

export default function StatsCard({ 
    title, 
    value, 
    icon, 
    change, 
    changeType, 
    subtitle, 
    accentColor = 'gold' 
}) {
    // Modernized color map: Soft tinted gradient backgrounds matching the icon color
    const themeStyles = {
        gold: {
            bg: 'bg-linear-to-br from-[#f5a623]/15 to-[#141a33]/80',
            border: 'border-[#f5a623]/20',
            iconBg: 'bg-[#f5a623]/20',
            iconText: 'text-[#f5a623]',
            glow: 'bg-[#f5a623]'
        },
        blue: {
            bg: 'bg-linear-to-br from-[#3b82f6]/15 to-[#141a33]/80',
            border: 'border-[#3b82f6]/20',
            iconBg: 'bg-[#3b82f6]/20',
            iconText: 'text-[#3b82f6]',
            glow: 'bg-[#3b82f6]'
        },
        purple: {
            bg: 'bg-linear-to-br from-[#8b5cf6]/15 to-[#141a33]/80',
            border: 'border-[#8b5cf6]/20',
            iconBg: 'bg-[#8b5cf6]/20',
            iconText: 'text-[#8b5cf6]',
            glow: 'bg-[#8b5cf6]'
        },
        cyan: {
            bg: 'bg-linear-to-br from-[#06b6d4]/15 to-[#141a33]/80',
            border: 'border-[#06b6d4]/20',
            iconBg: 'bg-[#06b6d4]/20',
            iconText: 'text-[#06b6d4]',
            glow: 'bg-[#06b6d4]'
        }
    };

    const currentTheme = themeStyles[accentColor] || themeStyles.gold;

    return (
        <div className={`${currentTheme.bg} border ${currentTheme.border} backdrop-blur-xl rounded-2xl p-5 sm:p-6 lg:p-7 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group`}>
            {/* Ambient corner glow */}
            <div className={`absolute -right-8 -top-8 w-32 h-32 rounded-full blur-3xl opacity-20 ${currentTheme.glow} group-hover:opacity-40 transition-opacity duration-500`}></div>
            
            <div className="flex justify-between items-start relative z-10 h-full">
                <div className="flex flex-col justify-between h-full">
                    <div>
                        <h3 className="text-xs sm:text-sm font-semibold text-[#8892b0] uppercase tracking-wider mb-2">
                            {title}
                        </h3>
                        <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight">
                            {value}
                        </div>
                    </div>
                    
                    <div className="mt-4 flex flex-col gap-1">
                        {change && (
                            <div className={`text-xs sm:text-sm font-medium flex items-center gap-1 ${changeType === 'positive' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {changeType === 'positive' ? '↑' : '↓'} {change}
                            </div>
                        )}
                        {subtitle && (
                            <div className="text-xs sm:text-sm text-[#8892b0]">
                                {subtitle}
                            </div>
                        )}
                    </div>
                </div>
                
                <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center shrink-0 ${currentTheme.iconBg} ${currentTheme.iconText} shadow-inner`}>
                    {icon}
                </div>
            </div>
        </div>
    );
}