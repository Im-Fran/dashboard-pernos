import { useState, useMemo } from 'react';
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
import { Clock, Activity, BarChart3, LineChart as LineChartIcon, Radar as RadarIcon, CalendarDays, X } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';

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

  const renderChart = () => {
    if (!chartData.length) {
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          No hay datos disponibles para el rango seleccionado
        </div>
      );
    }

    switch (chartType) {
      case 'lines':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line type="monotone" dataKey="accel_x" stroke="#8884d8" name="Accel X" strokeWidth={2} />
              <Line type="monotone" dataKey="accel_y" stroke="#82ca9d" name="Accel Y" strokeWidth={2} />
              <Line type="monotone" dataKey="accel_z" stroke="#ffc658" name="Accel Z" strokeWidth={2} />
              <Line type="monotone" dataKey="gyro_x" stroke="#ff7300" name="Gyro X" strokeWidth={2} />
              <Line type="monotone" dataKey="gyro_y" stroke="#00ff00" name="Gyro Y" strokeWidth={2} />
              <Line type="monotone" dataKey="gyro_z" stroke="#ff0000" name="Gyro Z" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area type="monotone" dataKey="accel_magnitude" stackId="1" stroke="#8884d8" fill="#8884d8" name="Magnitud Acelerómetro" />
              <Area type="monotone" dataKey="gyro_magnitude" stackId="2" stroke="#82ca9d" fill="#82ca9d" name="Magnitud Giroscopio" />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'bars':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="accel_x" fill="#8884d8" name="Accel X" />
              <Bar dataKey="accel_y" fill="#82ca9d" name="Accel Y" />
              <Bar dataKey="accel_z" fill="#ffc658" name="Accel Z" />
              <Bar dataKey="gyro_x" fill="#ff7300" name="Gyro X" />
              <Bar dataKey="gyro_y" fill="#00ff00" name="Gyro Y" />
              <Bar dataKey="gyro_z" fill="#ff0000" name="Gyro Z" />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'radar':
        return (
          <ResponsiveContainer width="100%" height={400}>
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
        );

      case 'radial':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" data={radialData}>
              <RadialBar dataKey="value" cornerRadius={10} fill="#8884d8" />
              <Legend />
              <Tooltip content={<CustomTooltip />} />
            </RadialBarChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
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
        return 'Se muestran los datos de cada sensor en formato "crudo". Cada línea representa un eje del acelerómetro (X, Y, Z) y giroscopio (X, Y, Z), permitiendo analizar el comportamiento individual de cada componente a lo largo del tiempo.';
      case 'area':
        return 'Se visualizan las magnitudes totales de aceleración |a| y giroscopio |ω|. Útil para detectar eventos de movimiento, vibraciones o cambios significativos en la actividad del dispositivo sin el ruido de los componentes individuales.';
      case 'bars':
        return 'Se comparan los promedios recientes de cada eje (X, Y, Z) tanto del acelerómetro como del giroscopio. Ideal para analizar la distribución de fuerzas y identificar qué ejes tienen mayor actividad en el período seleccionado.';
      case 'radar':
        return 'Se muestra un snapshot instantáneo de los valores absolutos de la última lectura disponible. Permite visualizar todos los ejes X, Y, Z simultáneamente en un formato polar, útil para entender la orientación y patrones de movimiento actuales.';
      case 'radial':
        return 'Se visualiza la intensidad actual mediante las magnitudes normalizadas de aceleración y giroscopio. Este gráfico es ideal para monitorear el nivel general de actividad del dispositivo de forma rápida y visual.';
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
          <Badge variant="outline">
            {filteredData.length} lecturas
          </Badge>
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
        </div>

        {renderChart()}
      </CardContent>
    </Card>
  );
};
