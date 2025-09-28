# Proveedor Firestore - Documentación de Uso

## Configuración

### 1. Variables de Entorno
Crea un archivo `.env` en la raíz del proyecto con tu configuración de Firebase:

```env
VITE_FIREBASE_API_KEY=tu_api_key_aqui
VITE_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu_proyecto_id
VITE_FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
VITE_FIREBASE_APP_ID=tu_app_id
```

### 2. Provider ya está integrado
El `FirestoreProvider` ya está integrado en tu `layout.tsx`, por lo que está disponible en toda la aplicación.

## Uso Básico

### Hook principal: useFirestore()
```tsx
import { useFirestore } from '@/components/providers/firestore-provider';

const MyComponent = () => {
  const { addDocument, getDocuments, updateDocument, deleteDocument } = useFirestore();
  
  // Usar las funciones...
};
```

### Hooks personalizados más convenientes:

#### 1. useCollection - Para obtener colecciones
```tsx
import { useCollection } from '@/hooks/use-firestore';

const SensorsList = () => {
  const { data: sensors, loading, error } = useCollection('sensors');
  
  if (loading) return <div>Cargando...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      {sensors.map(sensor => (
        <div key={sensor.id}>{sensor.name}</div>
      ))}
    </div>
  );
};
```

#### 2. useRealtimeCollection - Para datos en tiempo real
```tsx
import { useRealtimeCollection } from '@/hooks/use-firestore';

const RealtimeSensors = () => {
  const { data: sensors, loading } = useRealtimeCollection('sensors');
  
  // Los datos se actualizan automáticamente cuando cambian en Firestore
  return (
    <div>
      {sensors.map(sensor => (
        <div key={sensor.id}>{sensor.name}: {sensor.value}</div>
      ))}
    </div>
  );
};
```

#### 3. useFirestoreOperations - Para operaciones CRUD
```tsx
import { useFirestoreOperations } from '@/hooks/use-firestore';

const AddSensorForm = () => {
  const { add, loading, error } = useFirestoreOperations();
  
  const handleSubmit = async (data) => {
    try {
      const docId = await add('sensors', {
        name: data.name,
        value: data.value,
        location: data.location
      });
      console.log('Sensor agregado con ID:', docId);
    } catch (error) {
      console.error('Error:', error);
    }
  };
  
  // ... resto del componente
};
```

## Operaciones Avanzadas

### Consultas con filtros
```tsx
import { useFirestore } from '@/components/providers/firestore-provider';

const FilteredSensors = () => {
  const { whereQuery, orderByQuery, createQuery } = useFirestore();
  const [sensors, setSensors] = useState([]);
  
  useEffect(() => {
    const fetchFilteredData = async () => {
      const constraints = [
        whereQuery('status', '==', 'active'),
        whereQuery('value', '>', 50),
        orderByQuery('createdAt', 'desc')
      ];
      
      const data = await createQuery('sensors', constraints);
      setSensors(data);
    };
    
    fetchFilteredData();
  }, []);
  
  // ... resto del componente
};
```

### Suscripciones en tiempo real con filtros
```tsx
import { useRealtimeCollection } from '@/hooks/use-firestore';
import { useFirestore } from '@/components/providers/firestore-provider';

const ActiveSensors = () => {
  const { whereQuery } = useFirestore();
  
  const constraints = [
    whereQuery('status', '==', 'active')
  ];
  
  const { data: activeSensors } = useRealtimeCollection('sensors', constraints);
  
  return (
    <div>
      <h2>Sensores Activos ({activeSensors.length})</h2>
      {activeSensors.map(sensor => (
        <div key={sensor.id}>{sensor.name}</div>
      ))}
    </div>
  );
};
```

## Funciones Disponibles

### Operaciones de Documentos
- `addDocument(collection, data)` - Agregar documento
- `getDocument(collection, docId)` - Obtener documento específico
- `updateDocument(collection, docId, data)` - Actualizar documento
- `deleteDocument(collection, docId)` - Eliminar documento

### Operaciones de Colecciones
- `getDocuments(collection, constraints?)` - Obtener múltiples documentos
- `getCollection(collection)` - Obtener referencia de colección

### Suscripciones en Tiempo Real
- `subscribeToCollection(collection, callback, constraints?)` - Suscribirse a colección
- `subscribeToDocument(collection, docId, callback)` - Suscribirse a documento

### Helpers de Consulta
- `whereQuery(field, operator, value)` - Crear filtro where
- `orderByQuery(field, direction?)` - Crear ordenamiento
- `limitQuery(number)` - Limitar resultados

## Ejemplo Completo

Ver `src/components/firestore-example.tsx` para un ejemplo completo de cómo usar el sistema.

## Notas Importantes

1. **Timestamp automático**: Todos los documentos incluyen automáticamente `createdAt` y `updatedAt`
2. **Manejo de errores**: Todos los hooks incluyen estados de error y loading
3. **Tipos**: Usa `DocumentData` para documentos genéricos o define tus propios tipos
4. **Limpieza**: Las suscripciones se limpian automáticamente al desmontar componentes
