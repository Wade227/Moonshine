import React, { useEffect, useRef } from 'react';

const MetricsOverview = ({ tokens }) => {
  const velocityChartRef = useRef(null);
  const distributionChartRef = useRef(null);
  const growthChartRef = useRef(null);
  
  useEffect(() => {
    if (tokens.length === 0) return;
    
    // Clear previous charts
    if (velocityChartRef.current?.chart) {
      velocityChartRef.current.chart.destroy();
    }
    if (distributionChartRef.current?.chart) {
      distributionChartRef.current.chart.destroy();
    }
    if (growthChartRef.current?.chart) {
      growthChartRef.current.chart.destroy();
    }
    
    // Top 5 tokens by velocity
    const topVelocityTokens = [...tokens]
      .sort((a, b) => b.velocity - a.velocity)
      .slice(0, 5);
      
    const velocityCtx = velocityChartRef.current.getContext('2d');
    velocityChartRef.current.chart = new Chart(velocityCtx, {
      type: 'bar',
      data: {
        labels: topVelocityTokens.map(t => t.symbol),
        datasets: [{
          label: 'Token Velocity',
          data: topVelocityTokens.map(t => t.velocity),
          backgroundColor: 'rgba(75, 192, 192, 0.7)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: 'Top Token Velocity',
            color: 'white'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: 'rgba(255, 255, 255, 0.7)'
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            }
          },
          x: {
            ticks: {
              color: 'rgba(255, 255, 255, 0.7)'
            },
            grid: {
              display: false
            }
          }
        }
      }
    });
    
    // Whale distribution chart
    const topWhaleTokens = [...tokens]
      .sort((a, b) => b.whaleConcentration - a.whaleConcentration)
      .slice(0, 5);
      
    const distributionCtx = distributionChartRef.current.getContext('2d');
    distributionChartRef.current.chart = new Chart(distributionCtx, {
      type: 'pie',
      data: {
        labels: topWhaleTokens.map(t => t.symbol),
        datasets: [{
          data: topWhaleTokens.map(t => t.whaleConcentration),
          backgroundColor: [
            'rgba(255, 159, 64, 0.7)',
            'rgba(255, 99, 132, 0.7)',
            'rgba(54, 162, 235, 0.7)',
            'rgba(255, 206, 86, 0.7)',
            'rgba(75, 192, 192, 0.7)'
          ],
          borderColor: 'rgba(255, 255, 255, 0.7)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: 'white'
            }
          },
          title: {
            display: true,
            text: 'Whale Concentration',
            color: 'white'
          }
        }
      }
    });
    
    // Growth chart
    const topGrowthTokens = [...tokens]
      .sort((a, b) => b.growthRate - a.growthRate)
      .slice(0, 5);
      
    const growthCtx = growthChartRef.current.getContext('2d');
    growthChartRef.current.chart = new Chart(growthCtx, {
      type: 'line',
      data: {
        labels: topGrowthTokens.map(t => t.symbol),
        datasets: [{
          label: 'Growth Rate (%)',
          data: topGrowthTokens.map(t => t.growthRate),
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          borderColor: 'rgba(255, 206, 86, 1)',
          borderWidth: 2,
          tension: 0.2,
          pointBackgroundColor: 'rgba(255, 206, 86, 1)'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: 'Network Growth Rate',
            color: 'white'
          }
        },
        scales: {
          y: {
            ticks: {
              color: 'rgba(255, 255, 255, 0.7)'
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            }
          },
          x: {
            ticks: {
              color: 'rgba(255, 255, 255, 0.7)'
            },
            grid: {
              display: false
            }
          }
        }
      }
    });
    
  }, [tokens]);
  
  return (
    <>
      <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-4">
        <h3 className="text-lg font-semibold mb-4">Token Velocity</h3>
        <canvas ref={velocityChartRef} height="200"></canvas>
      </div>
      
      <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-4">
        <h3 className="text-lg font-semibold mb-4">Holder Distribution</h3>
        <canvas ref={distributionChartRef} height="180"></canvas>
      </div>
      
      <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-4">
        <h3 className="text-lg font-semibold mb-4">Network Growth</h3>
        <canvas ref={growthChartRef} height="200"></canvas>
      </div>
    </>
  );
};

export default MetricsOverview;

