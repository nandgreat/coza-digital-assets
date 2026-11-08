import React, { useRef, useEffect } from 'react';
import Chart from 'chart.js/auto';

export default function DoughnutChart({ labels, data, label = 'Downloads' }) {
    const canvasRef = useRef(null);
    const chartRef = useRef(null);

    useEffect(() => {
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            chartRef.current = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels,
                    datasets: [{
                        label,
                        data,
                        backgroundColor: [
                            '#a2713a', // coza-purple-600
                            '#c39656', // coza-purple-400
                            '#D4AF37', // gold
                            '#FCD34D', // amber-300
                            '#d3aa75', // coza-purple-300
                            '#FBBF24', // amber-400
                        ],
                        borderColor: 'rgba(255,255,255,0.4)',
                        borderWidth: 2,
                        hoverOffset: 8,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                usePointStyle: true,
                                pointStyle: 'circle',
                                padding: 20,
                                color: '#543923', // coza-purple-900
                                font: { size: 12 },
                            }
                        }
                    },
                    cutout: '70%',
                }
            });
        }
        return () => chartRef.current?.destroy();
    }, [labels, data, label]);

    return <canvas ref={canvasRef} />;
}