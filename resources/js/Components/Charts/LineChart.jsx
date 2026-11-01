import React, { useRef, useEffect } from 'react';
import Chart from 'chart.js/auto';

export default function LineChart({ labels, data, label = 'Downloads', showFill = true }) {
    const canvasRef = useRef(null);
    const chartRef = useRef(null);

    useEffect(() => {
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            chartRef.current = new Chart(ctx, {
                type: 'line',
                data: {
                    labels,
                    datasets: [{
                        label,
                        data,
                        borderColor: '#7C3AED', // purple-600
                        backgroundColor: showFill ? 'rgba(124,58,237,0.1)' : 'transparent',
                        fill: showFill,
                        tension: 0.4,
                        pointBackgroundColor: '#D4AF37', // gold
                        pointBorderColor: '#FFFFFF',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 7,
                        borderWidth: 2,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false,
                        },
                        tooltip: {
                            backgroundColor: 'rgba(255,255,255,0.8)',
                            titleColor: '#4C1D95',
                            bodyColor: '#4C1D95',
                            borderColor: 'rgba(124,58,237,0.3)',
                            borderWidth: 1,
                            cornerRadius: 12,
                            padding: 12,
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(124,58,237,0.08)',
                            },
                            ticks: {
                                color: '#4C1D95',
                            }
                        },
                        x: {
                            grid: {
                                display: false,
                            },
                            ticks: {
                                color: '#6D28D9',
                                maxRotation: 45,
                                autoSkip: true,
                                maxTicksLimit: 15,
                            }
                        }
                    },
                    interaction: {
                        intersect: false,
                        mode: 'index',
                    },
                }
            });
        }
        return () => chartRef.current?.destroy();
    }, [labels, data, label, showFill]);

    return <canvas ref={canvasRef} />;
}