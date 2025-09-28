import type {Device} from "@/types/models/device";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useCollection } from "@/hooks/use-firestore";
import { useFirestore } from "@/hooks/use-firestore";

export type DeviceCardProps = {
  device: Device;
}

export const DeviceCard = ({ device } : DeviceCardProps) => {
  const { orderByQuery, limitQuery } = useFirestore();

  // Obtener la última lectura del dispositivo
  const { data: readings, loading } = useCollection(`devices/${device.id}/readings`, [
    orderByQuery('ts', 'desc'),
    limitQuery(1)
  ]);

  const lastReading = readings?.[0];
  const lastActiveTime = lastReading?.ts?.toDate?.() || device.lastActive;

  // Calcular el estado del dispositivo basado en la última lectura
  const getDeviceStatus = (): 'online' | 'offline' => {
    if (!lastActiveTime) return 'offline';

    const now = new Date();
    const diffInMinutes = (now.getTime() - lastActiveTime.getTime()) / (1000 * 60);

    return diffInMinutes <= 3 ? 'online' : 'offline';
  };

  const deviceStatus = getDeviceStatus();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-600 bg-green-100';
      case 'offline': return 'text-gray-600 bg-gray-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatLastActive = (date: Date | undefined) => {
    if (!date) return 'Nunca';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `Hace ${minutes} min`;
    if (hours < 24) return `Hace ${hours} h`;
    return `Hace ${days} días`;
  };

  return (
    <Card className="hover:shadow-md transition-shadow h-48 min-h-[12rem] flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg truncate pr-2">{device.name}</CardTitle>
          <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(deviceStatus)}`}>
            {deviceStatus === 'online' ? 'En línea' : 'Desconectado'}
          </span>
        </div>
        <CardDescription className="text-sm">
          Última actividad: {formatLastActive(lastActiveTime)}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between">
        <div className="space-y-2">
          <div className="flex justify-start items-center text-sm">
            <span className="text-muted-foreground">ID:</span>
            <span className="font-mono text-xs truncate ml-1">{device.id}</span>
          </div>
          {loading && (
            <div className="text-sm text-muted-foreground animate-pulse">
              Cargando datos del sensor...
            </div>
          )}
          {lastReading && !loading && (
            <div className="text-sm">
              <span className="text-green-600">✓ Última lectura disponible</span>
            </div>
          )}
          {!lastReading && !loading && (
            <div className="text-sm">
              <span className="text-gray-500">Sin lecturas recientes</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}