import { useState, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  RadialBarChart,
  RadialBar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Clock, Activity, BarChart3, LineChart as LineChartIcon, Radar as RadarIcon, CalendarDays, X, ZoomIn, Download, Camera } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import html2canvas from 'html2canvas-pro';

// Componente personalizado de tooltip que se adapta al tema
interface TooltipPayload {
  name: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border rounded-lg shadow-lg p-3 dark:bg-gray-800 dark:border-gray-600">
        <p className="text-foreground font-medium mb-2">{`Tiempo: ${label}`}</p>
        {payload.map((entry, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {`${entry.name}: ${entry.value.toFixed(3)}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export interface SensorReading {
  id: string;
  ts: { toDate?: () => Date } | Date | number; // Firestore Timestamp or Date
  count: number;
  last: {
    accel: { x: number; y: number; z: number };
    gyro: { x: number; y: number; z: number };
    ts_local: number;
  };
  avg: {
    accel: { x: number; y: number; z: number };
    gyro: { x: number; y: number; z: number };
  };
}

interface SensorChartsProps {
  readings: SensorReading[];
  loading?: boolean;
}

type TimeRange = '30d' | '14d' | '7d' | '5d' | '3d' | '2d' | '24h' | '12h' | '1h' | '30m' | '15m' | '5m' | '1m' | 'range';
type ChartType = 'lines' | 'area' | 'bars' | 'radar' | 'radial';

const TIME_RANGES = [
  { value: '30d' as TimeRange, label: '30 días', minutes: 30 * 24 * 60 },
  { value: '14d' as TimeRange, label: '14 días', minutes: 14 * 24 * 60 },
  { value: '7d' as TimeRange, label: '7 días', minutes: 7 * 24 * 60 },
  { value: '5d' as TimeRange, label: '5 días', minutes: 5 * 24 * 60 },
  { value: '3d' as TimeRange, label: '3 días', minutes: 3 * 24 * 60 },
  { value: '2d' as TimeRange, label: '2 días', minutes: 2 * 24 * 60 },
  { value: '24h' as TimeRange, label: '24 horas', minutes: 24 * 60 },
  { value: '12h' as TimeRange, label: '12 horas', minutes: 12 * 60 },
  { value: '1h' as TimeRange, label: '1 hora', minutes: 60 },
  { value: '30m' as TimeRange, label: '30 minutos', minutes: 30 },
  { value: '15m' as TimeRange, label: '15 minutos', minutes: 15 },
  { value: '5m' as TimeRange, label: '5 minutos', minutes: 5 },
  { value: '1m' as TimeRange, label: '1 minuto', minutes: 1 },
  { value: 'range' as TimeRange, label: 'Rango', minutes: 0 },
];

const CHART_TYPES = [
  { value: 'lines' as ChartType, label: 'Líneas', icon: LineChartIcon },
  { value: 'area' as ChartType, label: 'Área', icon: Activity },
  { value: 'bars' as ChartType, label: 'Barras', icon: BarChart3 },
  { value: 'radar' as ChartType, label: 'Radar', icon: RadarIcon },
  { value: 'radial' as ChartType, label: 'Radial', icon: Clock },
];

export const SensorCharts = ({ readings, loading = false }: SensorChartsProps) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('5d');
  const [chartType, setChartType] = useState<ChartType>('lines');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isExporting, setIsExporting] = useState(false);

  // Referencias para los contenedores de gráficos
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const accelerometerRef = useRef<HTMLDivElement>(null);
  const gyroscopeRef = useRef<HTMLDivElement>(null);

  // Función auxiliar para convertir timestamps a Date
  const toDate = (timestamp: { toDate?: () => Date } | Date | number): Date => {
    if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    if (timestamp instanceof Date) {
      return timestamp;
    }
    if (typeof timestamp === 'number') {
      return new Date(timestamp);
    }
    // Fallback para casos inesperados
    return new Date();
  };

  // Filtrar datos por rango de tiempo o fechas personalizadas
  const filteredData = useMemo(() => {
    if (!readings?.length) return [];

    if (timeRange === 'range' && dateRange?.from && dateRange?.to) {
      // Filtrar por rango de fechas personalizado
      const startTime = new Date(dateRange.from);
      startTime.setHours(0, 0, 0, 0); // Inicio del día
      const endTime = new Date(dateRange.to);
      endTime.setHours(23, 59, 59, 999); // Final del día

      return readings
        .filter(reading => {
          const readingTime = toDate(reading.ts);
          return readingTime >= startTime && readingTime <= endTime;
        })
        .sort((a, b) => {
          const timeA = toDate(a.ts);
          const timeB = toDate(b.ts);
          return timeA.getTime() - timeB.getTime();
        });
    } else {
      // Filtrar por rango de tiempo predefinido
      const now = new Date();
      const rangeMinutes = TIME_RANGES.find(r => r.value === timeRange)?.minutes || 60;
      const cutoffTime = new Date(now.getTime() - rangeMinutes * 60 * 1000);

      return readings
        .filter(reading => {
          const readingTime = toDate(reading.ts);
          return readingTime >= cutoffTime;
        })
        .sort((a, b) => {
          const timeA = toDate(a.ts);
          const timeB = toDate(b.ts);
          return timeA.getTime() - timeB.getTime();
        });
    }
  }, [readings, timeRange, dateRange]);

  // Transformar datos para los gráficos
  const chartData = useMemo(() => {
    return filteredData.map(reading => {
      const timestamp = toDate(reading.ts);
      const time = timestamp.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        ...(timeRange.includes('m') ? { second: '2-digit' } : {})
      });

      // Calcular magnitudes
      const accelMagnitude = Math.sqrt(
        Math.pow(reading.avg.accel.x, 2) +
        Math.pow(reading.avg.accel.y, 2) +
        Math.pow(reading.avg.accel.z, 2)
      );
      const gyroMagnitude = Math.sqrt(
        Math.pow(reading.avg.gyro.x, 2) +
        Math.pow(reading.avg.gyro.y, 2) +
        Math.pow(reading.avg.gyro.z, 2)
      );

      return {
        time,
        timestamp: timestamp.getTime(),
        // Acelerómetro
        accel_x: reading.avg.accel.x,
        accel_y: reading.avg.accel.y,
        accel_z: reading.avg.accel.z,
        accel_magnitude: accelMagnitude,
        // Giroscopio
        gyro_x: reading.avg.gyro.x,
        gyro_y: reading.avg.gyro.y,
        gyro_z: reading.avg.gyro.z,
        gyro_magnitude: gyroMagnitude,
      };
    });
  }, [filteredData, timeRange]);

  // Datos para gráfico radar (última lectura)
  const radarData = useMemo(() => {
    if (!filteredData.length) return [];
    const latest = filteredData[filteredData.length - 1];
    return [
      { axis: 'Accel X', accel: Math.abs(latest.avg.accel.x), gyro: Math.abs(latest.avg.gyro.x) },
      { axis: 'Accel Y', accel: Math.abs(latest.avg.accel.y), gyro: Math.abs(latest.avg.gyro.y) },
      { axis: 'Accel Z', accel: Math.abs(latest.avg.accel.z), gyro: Math.abs(latest.avg.gyro.z) },
    ];
  }, [filteredData]);

  // Datos para gráfico radial (magnitudes actuales)
  const radialData = useMemo(() => {
    if (!chartData.length) return [];
    const latest = chartData[chartData.length - 1];
    return [
      { name: 'Acelerómetro', value: latest.accel_magnitude, fill: '#8884d8' },
      { name: 'Giroscopio', value: latest.gyro_magnitude, fill: '#82ca9d' },
    ];
  }, [chartData]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Datos de Sensores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="bg-gray-200 rounded h-64 w-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calcular ancho dinámico basado en el número de datos para scroll horizontal
  const getChartWidth = () => {
    const dataPoints = chartData.length;
    const minWidth = 800; // Ancho mínimo para gráficos
    const maxWidth = 3000; // Ancho máximo para evitar gráficos demasiado anchos

    // Para gráficos de radar y radial, usar ancho fijo
    if (chartType === 'radar' || chartType === 'radial') {
      return minWidth;
    }

    // Calcular ancho basado en los puntos de datos (más datos = más ancho)
    return Math.max(minWidth, Math.min(maxWidth, dataPoints * 8));
  };

  const chartWidth = getChartWidth();
  const needsScroll = chartWidth > 800; // Mostrar scroll si el ancho es mayor a 800px

  // Función para exportar un elemento específico como imagen
  const exportElementAsImage = async (element: HTMLElement, filename: string) => {
    try {
      setIsExporting(true);

      // Detectar tema actual
      const isDarkMode = document.documentElement.classList.contains('dark');
      const backgroundColor = isDarkMode ? '#1f2937' : '#ffffff'; // gray-800 para oscuro, blanco para claro

      // Guardar estilos originales
      const originalOverflow = element.style.overflow;
      const originalWidth = element.style.width;
      const originalMaxWidth = element.style.maxWidth;

      // Encontrar todos los contenedores scrolleables dentro del elemento
      const scrollContainers = element.querySelectorAll('[style*="overflow-x-auto"]') as NodeListOf<HTMLElement>;
      const originalScrollStyles: { element: HTMLElement; overflow: string; width: string }[] = [];

      // Temporalmente ajustar estilos para capturar todo el contenido
      element.style.overflow = 'visible';
      element.style.width = 'fit-content';
      element.style.maxWidth = 'none';

      // Ajustar contenedores scrolleables
      scrollContainers.forEach(container => {
        originalScrollStyles.push({
          element: container,
          overflow: container.style.overflow,
          width: container.style.width
        });
        container.style.overflow = 'visible';
        container.style.width = 'fit-content';
      });

      // Esperar un momento para que se apliquen los cambios
      await new Promise(resolve => setTimeout(resolve, 100));

      // Configuración optimizada para html2canvas
      const canvas = await html2canvas(element, {
        backgroundColor,
        scale: 1.5, // Resolución optimizada
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: element.scrollWidth,
        height: element.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        ignoreElements: (el) => {
          // Ignorar scrollbars y elementos que puedan causar problemas
          return el.tagName === 'SCROLLBAR' ||
                 el.classList.contains('scrollbar') ||
                 (el as HTMLElement).style.position === 'fixed';
        }
      });

      // Restaurar estilos originales
      element.style.overflow = originalOverflow;
      element.style.width = originalWidth;
      element.style.maxWidth = originalMaxWidth;

      scrollContainers.forEach((container, index) => {
        const original = originalScrollStyles[index];
        container.style.overflow = original.overflow;
        container.style.width = original.width;
      });

      // Convertir canvas a blob y descargar
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      }, 'image/png');
    } catch (error) {
      console.error('Error al exportar imagen:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Función para generar nombre de archivo con timestamp
  const generateFilename = (type: string) => {
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 19).replace(/[:.]/g, '-');
    const rangeLabel = timeRange === 'range'
      ? `rango-${dateRange?.from ? format(dateRange.from, 'dd-MM-yyyy', { locale: es }) : 'custom'}`
      : TIME_RANGES.find(r => r.value === timeRange)?.label.replace(/\s/g, '-') || timeRange;

    return `sensores-${type}-${chartType}-${rangeLabel}-${timestamp}.png`;
  };

  // Exportar todos los gráficos
  const exportAllCharts = () => {
    if (chartContainerRef.current) {
      exportElementAsImage(chartContainerRef.current, generateFilename('completo'));
    }
  };

  // Exportar solo el gráfico del acelerómetro
  const exportAccelerometer = () => {
    if (accelerometerRef.current) {
      exportElementAsImage(accelerometerRef.current, generateFilename('acelerometro'));
    }
  };

  // Exportar solo el gráfico del giroscopio
  const exportGyroscope = () => {
    if (gyroscopeRef.current) {
      exportElementAsImage(gyroscopeRef.current, generateFilename('giroscopio'));
    }
  };

  const renderChart = () => {
    if (!chartData.length) {
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          No hay datos disponibles para el rango seleccionado
        </div>
      );
    }

    const chartHeight = 350; // Reducido para acomodar dos gráficos

    const renderAccelerometerChart = () => {
      switch (chartType) {
        case 'lines':
          return (
            <div
              className={`${needsScroll ? 'overflow-x-auto' : ''} w-full`}
              style={{
                minWidth: '100%',
                ...(needsScroll && {
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(155, 155, 155, 0.5) transparent'
                })
              }}
            >
              <div style={{ width: chartWidth, height: chartHeight }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="time"
                      interval={Math.max(0, Math.floor(chartData.length / 10))}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="accel_x" stroke="#8884d8" name="Accel X" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="accel_y" stroke="#82ca9d" name="Accel Y" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="accel_z" stroke="#ffc658" name="Accel Z" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          );

        case 'area':
          return (
            <div
              className={`${needsScroll ? 'overflow-x-auto' : ''} w-full`}
              style={{
                minWidth: '100%',
                ...(needsScroll && {
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(155, 155, 155, 0.5) transparent'
                })
              }}
            >
              <div style={{ width: chartWidth, height: chartHeight }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="time"
                      interval={Math.max(0, Math.floor(chartData.length / 10))}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area type="monotone" dataKey="accel_magnitude" stroke="#8884d8" fill="#8884d8" name="Magnitud Acelerómetro" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          );

        case 'bars':
          return (
            <div
              className={`${needsScroll ? 'overflow-x-auto' : ''} w-full`}
              style={{
                minWidth: '100%',
                ...(needsScroll && {
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(155, 155, 155, 0.5) transparent'
                })
              }}
            >
              <div style={{ width: chartWidth, height: chartHeight }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="time"
                      interval={Math.max(0, Math.floor(chartData.length / 8))}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="accel_x" fill="#8884d8" name="Accel X" />
                    <Bar dataKey="accel_y" fill="#82ca9d" name="Accel Y" />
                    <Bar dataKey="accel_z" fill="#ffc658" name="Accel Z" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          );

        default:
          return null;
      }
    };

    const renderGyroscopeChart = () => {
      switch (chartType) {
        case 'lines':
          return (
            <div
              className={`${needsScroll ? 'overflow-x-auto' : ''} w-full`}
              style={{
                minWidth: '100%',
                ...(needsScroll && {
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(155, 155, 155, 0.5) transparent'
                })
              }}
            >
              <div style={{ width: chartWidth, height: chartHeight }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="time"
                      interval={Math.max(0, Math.floor(chartData.length / 10))}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="gyro_x" stroke="#ff7300" name="Gyro X" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="gyro_y" stroke="#00ff00" name="Gyro Y" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="gyro_z" stroke="#ff0000" name="Gyro Z" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          );

        case 'area':
          return (
            <div
              className={`${needsScroll ? 'overflow-x-auto' : ''} w-full`}
              style={{
                minWidth: '100%',
                ...(needsScroll && {
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(155, 155, 155, 0.5) transparent'
                })
              }}
            >
              <div style={{ width: chartWidth, height: chartHeight }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="time"
                      interval={Math.max(0, Math.floor(chartData.length / 10))}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area type="monotone" dataKey="gyro_magnitude" stroke="#82ca9d" fill="#82ca9d" name="Magnitud Giroscopio" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          );

        case 'bars':
          return (
            <div
              className={`${needsScroll ? 'overflow-x-auto' : ''} w-full`}
              style={{
                minWidth: '100%',
                ...(needsScroll && {
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(155, 155, 155, 0.5) transparent'
                })
              }}
            >
              <div style={{ width: chartWidth, height: chartHeight }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="time"
                      interval={Math.max(0, Math.floor(chartData.length / 8))}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="gyro_x" fill="#ff7300" name="Gyro X" />
                    <Bar dataKey="gyro_y" fill="#00ff00" name="Gyro Y" />
                    <Bar dataKey="gyro_z" fill="#ff0000" name="Gyro Z" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          );

        default:
          return null;
      }
    };

    // Para gráficos de radar y radial, mantener el comportamiento original con ambos sensores
    if (chartType === 'radar') {
      return (
        <div ref={chartContainerRef} className="w-full flex justify-center">
          <div style={{ width: Math.min(chartWidth, 600), height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="axis" />
                <PolarRadiusAxis />
                <Radar name="Acelerómetro" dataKey="accel" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                <Radar name="Giroscopio" dataKey="gyro" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
                <Legend />
                <Tooltip content={<CustomTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      );
    }

    if (chartType === 'radial') {
      return (
        <div ref={chartContainerRef} className="w-full flex justify-center">
          <div style={{ width: Math.min(chartWidth, 600), height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" data={radialData}>
                <RadialBar dataKey="value" cornerRadius={10} fill="#8884d8" />
                <Legend />
                <Tooltip content={<CustomTooltip />} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
        </div>
      );
    }

    // Para gráficos de líneas, área y barras, mostrar dos gráficos separados
    return (
      <div ref={chartContainerRef} className="space-y-6">
        {/* Gráfico del Acelerómetro */}
        <div ref={accelerometerRef}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              Acelerómetro
              <Badge variant="outline" className="text-xs">
                m/s²
              </Badge>
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={exportAccelerometer}
              disabled={isExporting}
              className="flex items-center gap-1"
            >
              <Camera className="h-4 w-4" />
              Exportar
            </Button>
          </div>
          {renderAccelerometerChart()}
        </div>

        {/* Gráfico del Giroscopio */}
        <div ref={gyroscopeRef}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-600" />
              Giroscopio
              <Badge variant="outline" className="text-xs">
                rad/s
              </Badge>
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={exportGyroscope}
              disabled={isExporting}
              className="flex items-center gap-1"
            >
              <Camera className="h-4 w-4" />
              Exportar
            </Button>
          </div>
          {renderGyroscopeChart()}
        </div>
      </div>
    );
  };

  // Función para limpiar el rango de fechas
  const clearDateRange = () => {
    setDateRange(undefined);
    setTimeRange('5d'); // Volver al rango por defecto
  };

  // Manejar el cambio de rango de tiempo
  const handleTimeRangeChange = (value: TimeRange) => {
    setTimeRange(value);
    if (value !== 'range') {
      setDateRange(undefined); // Limpiar el rango de fechas si no es "range"
    }
  };

  // Función para obtener la descripción del tipo de gráfico actual
  const getChartDescription = (type: ChartType): string => {
    switch (type) {
      case 'lines':
        return 'Se muestran los datos de cada sensor por separado en formato "crudo". En el primer gráfico se visualizan los tres ejes del acelerómetro (X, Y, Z) y en el segundo gráfico los tres ejes del giroscopio (X, Y, Z), permitiendo un análisis más claro de cada sensor individualmente.';
      case 'area':
        return 'Se visualizan las magnitudes totales por separado: la magnitud de aceleración |a| en el primer gráfico y la magnitud del giroscopio |ω| en el segundo. Esta separación facilita la detección de eventos específicos de movimiento o rotación sin interferencias visuales entre sensores.';
      case 'bars':
        return 'Se comparan los promedios recientes de cada eje por sensor. El primer gráfico muestra los ejes X, Y, Z del acelerómetro y el segundo los del giroscopio. Ideal para analizar la distribución de fuerzas y rotaciones por separado e identificar patrones específicos de cada sensor.';
      case 'radar':
        return 'Se muestra un snapshot instantáneo de los valores absolutos de la última lectura disponible. Permite visualizar todos los ejes X, Y, Z de ambos sensores simultáneamente en un formato polar, útil para entender la orientación y patrones de movimiento actuales de forma comparativa.';
      case 'radial':
        return 'Se visualiza la intensidad actual mediante las magnitudes normalizadas de aceleración y giroscopio. Este gráfico es ideal para monitorear el nivel general de actividad del dispositivo de forma rápida y visual, comparando ambos sensores en un solo vistazo.';
      default:
        return '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Datos de Sensores
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {filteredData.length} lecturas
            </Badge>
            {needsScroll && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <ZoomIn className="h-3 w-3" />
                Scrolleable
              </Badge>
            )}
            {/* Botón de exportar todos los gráficos */}
            <Button
              variant="default"
              size="sm"
              onClick={exportAllCharts}
              disabled={isExporting || !chartData.length}
              className="flex items-center gap-1"
            >
              <Download className="h-4 w-4" />
              {isExporting ? 'Exportando...' : 'Exportar Todo'}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mt-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <Select value={timeRange} onValueChange={handleTimeRangeChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_RANGES.map(range => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <Select value={chartType} onValueChange={(value: ChartType) => setChartType(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHART_TYPES.map(type => {
                  const Icon = type.icon;
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Selector de rango de fechas - solo visible cuando timeRange es 'range' */}
          {timeRange === 'range' && (
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="min-w-[260px] justify-start text-left font-normal">
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y", { locale: es })} -{" "}
                          {format(dateRange.to, "LLL dd, y", { locale: es })}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y", { locale: es })
                      )
                    ) : (
                      <span>Seleccionar rango de fechas</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                    locale={es}
                  />
                </PopoverContent>
              </Popover>

              {/* Botón para limpiar el rango de fechas */}
              {dateRange?.from && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={clearDateRange}
                  className="h-9 w-9"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Descripción del gráfico */}
        <div className="mb-4 p-3 bg-muted/50 rounded-lg border-l-4 border-primary">
          <p className="text-sm text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Información:</span> {getChartDescription(chartType)}
          </p>
          {needsScroll && (
            <p className="text-xs text-muted-foreground mt-2">
              💡 <span className="font-medium">Tip:</span> Desliza horizontalmente para ver todos los datos en dispositivos móviles.
            </p>
          )}
          {chartData.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              📸 <span className="font-medium">Exportación:</span> Usa el botón "Exportar Todo" para descargar todos los gráficos, o los botones individuales de cada sensor.
            </p>
          )}
        </div>

        {renderChart()}
      </CardContent>
    </Card>
  );
};
