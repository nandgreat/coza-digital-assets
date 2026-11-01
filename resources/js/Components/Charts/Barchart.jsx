import React, { useRef, useEffect } from 'react';
import Chart from 'chart.js/auto';

export default function BarChart({ labels, data, label = 'Downloads' }) {
    const canvasRef = useRef(null);
    const chartRef = useRef(null);

    useEffect(() => {
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            chartRef.current = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label,
                        data,
                        backgroundColor: ['#7C3AED', '#A78BFA', '#D4AF37', '#FCD34D'],
                        borderRadius: 6,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(124,58,237,0.1)' } },
                        x: { grid: { display: false } }
                    }
                }
            });
        }
        return () => chartRef.current?.destroy();
    }, [labels, data]);

    return <canvas ref={canvasRef} />;
}