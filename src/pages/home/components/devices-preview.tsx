import {useCollection} from "@/hooks/use-firestore.ts";
import { DeviceCard } from "./devices-preview/device-card";
import type { Device } from "@/types/models/device";
import {Link} from "react-router";

export const DevicesPreview = () => {

  const { data, loading, error } = useCollection('devices');

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Dispositivos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 rounded-xl h-48 min-h-[12rem]"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Dispositivos</h2>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error al cargar dispositivos: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Dispositivos</h2>
      {data && data.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {data.map((device) => (
            <Link to={`/dispositivos/${device.id}`}>
              <DeviceCard key={device.id} device={device as Device} />
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No se encontraron dispositivos</p>
        </div>
      )}
    </div>
  );
}