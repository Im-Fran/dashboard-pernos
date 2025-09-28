import { useParams } from "react-router";
import { useDocument, useCollection, useFirestore } from "@/hooks/use-firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Activity, Hash, Database } from "lucide-react";
import type { Device } from "@/types/models/device";
import { SensorCharts, type SensorReading } from "./components/sensor-charts";

export const DevicePage = () => {
  const { id } = useParams<{ id: string }>();
  const { orderByQuery, limitQuery } = useFirestore();

  const { data: device, loading, error } = useDocument('devices', id!);

  // Obtener la última lectura del dispositivo
  const { data: readings, loading: readingsLoading } = useCollection(`devices/${id}/readings`, [
    orderByQuery('ts', 'desc'),
    limitQuery(1)
  ]);

  // Obtener más lecturas para los gráficos (últimas 1000 lecturas)
  const { data: chartReadings, loading: chartReadingsLoading } = useCollection(`devices/${id}/readings`, [
    orderByQuery('ts', 'desc'),
    limitQuery(1000)
  ]);

  // Función para convertir datos de Firestore a SensorReading
  const convertToSensorReadings = (firestoreData: unknown[]): SensorReading[] => {
    if (!firestoreData?.length) return [];

    return firestoreData.filter((item): item is Record<string, unknown> => {
      return item !== null &&
        typeof item === 'object' &&
        'avg' in item &&
        'last' in item &&
        'ts' in item &&
        'id' in item;
    }).filter(item => {
      const avg = item.avg as Record<string, unknown>;
      const last = item.last as Record<string, unknown>;
      return avg &&
        typeof avg === 'object' &&
        'accel' in avg &&
        'gyro' in avg &&
        last &&
        typeof last === 'object' &&
        'accel' in last &&
        'gyro' in last;
    }).map(item => ({
      id: (item.id as string) || '',
      ts: item.ts as { toDate?: () => Date } | Date | number,
      count: (item.count as number) || 0,
      last: {
        accel: {
          x: ((item.last as Record<string, unknown>).accel as Record<string, number>).x || 0,
          y: ((item.last as Record<string, unknown>).accel as Record<string, number>).y || 0,
          z: ((item.last as Record<string, unknown>).accel as Record<string, number>).z || 0,
        },
        gyro: {
          x: ((item.last as Record<string, unknown>).gyro as Record<string, number>).x || 0,
          y: ((item.last as Record<string, unknown>).gyro as Record<string, number>).y || 0,
          z: ((item.last as Record<string, unknown>).gyro as Record<string, number>).z || 0,
        },
        ts_local: ((item.last as Record<string, unknown>).ts_local as number) || 0,
      },
      avg: {
        accel: {
          x: ((item.avg as Record<string, unknown>).accel as Record<string, number>).x || 0,
          y: ((item.avg as Record<string, unknown>).accel as Record<string, number>).y || 0,
          z: ((item.avg as Record<string, unknown>).accel as Record<string, number>).z || 0,
        },
        gyro: {
          x: ((item.avg as Record<string, unknown>).gyro as Record<string, number>).x || 0,
          y: ((item.avg as Record<string, unknown>).gyro as Record<string, number>).y || 0,
          z: ((item.avg as Record<string, unknown>).gyro as Record<string, number>).z || 0,
        },
      },
    }));
  };

  const lastReading = readings?.[0];
  const lastActiveTime = lastReading?.ts?.toDate?.() || (device as Device)?.lastActive;

  if (loading || readingsLoading || chartReadingsLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="bg-gray-200 rounded-xl h-64 w-full"></div>
        </div>
      </div>
    );
  }

  if (error || !device) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800">
              {error ? `Error al cargar el dispositivo: ${error}` : 'Dispositivo no encontrado'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const deviceData = device as Device;

  // Calcular el estado basado en la última lectura
  const getDeviceStatus = (lastActive: Date | undefined) => {
    if (!lastActive) return { status: 'Desconectado', variant: 'destructive' as const, color: 'bg-red-500' };

    const now = new Date();
    const timeDiff = now.getTime() - new Date(lastActive).getTime();
    const minutesDiff = timeDiff / (1000 * 60);

    if (minutesDiff < 3) return { status: 'Activo', variant: 'default' as const, color: 'bg-green-500' };
    if (minutesDiff < 30) return { status: 'Inactivo', variant: 'secondary' as const, color: 'bg-yellow-500' };
    return { status: 'Desconectado', variant: 'destructive' as const, color: 'bg-red-500' };
  };

  const statusInfo = getDeviceStatus(lastActiveTime);

  // Formatear la fecha de última actividad
  const formatLastActive = (date: Date | undefined) => {
    if (!date) return 'Nunca';
    const deviceDate = new Date(date);
    return deviceDate.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Detalles del Dispositivo</h1>
        <p className="text-muted-foreground">Información detallada del dispositivo seleccionado</p>
      </div>

      <Card className="w-full">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${statusInfo.color}`}></div>
              {deviceData.name}
            </CardTitle>
            <Badge variant={statusInfo.variant}>
              {statusInfo.status}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

            {/* Estado Calculado */}
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Estado</p>
                <p className="text-lg font-semibold">{statusInfo.status}</p>
              </div>
            </div>

            {/* Última Actividad */}
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <CalendarDays className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Última Actividad</p>
                <p className="text-lg font-semibold">{formatLastActive(lastActiveTime)}</p>
              </div>
            </div>

            {/* ID del Dispositivo */}
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Hash className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">ID</p>
                <p className="text-sm font-semibold font-mono break-all">{deviceData.id}</p>
              </div>
            </div>

            {/* Última Lectura Disponible */}
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Database className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Lectura Disponible</p>
                <p className="text-lg font-semibold">
                  {lastReading ? 'Sí' : 'No'}
                </p>
              </div>
            </div>

          </div>

          {/* Gráficos de Sensores */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Gráficos de Sensores</h2>
            <SensorCharts
              readings={convertToSensorReadings(chartReadings || [])}
              loading={chartReadingsLoading}
            />
          </div>

        </CardContent>
      </Card>
    </div>
  );
};
