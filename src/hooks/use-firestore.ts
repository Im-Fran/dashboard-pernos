import { useState, useEffect, useContext, createContext, useMemo, useCallback, useRef } from 'react';
import { useFirestore } from '@/components/providers/firestore-provider';
import { DocumentData, QueryConstraint } from 'firebase/firestore';

// Cache simple para evitar lecturas innecesarias
const queryCache = new Map<string, { data: DocumentData[], timestamp: number }>();
const CACHE_DURATION = 30000; // 30 segundos

// Helper para crear una key única para el cache basada en la consulta
const createCacheKey = (collectionName: string, constraints: QueryConstraint[] = []) => {
  const constraintString = constraints.map(c => JSON.stringify(c)).join('|');
  return `${collectionName}:${constraintString}`;
};

export interface FirestoreContextType {
  // Database instance
  db: Firestore;

  // Collection operations
  getCollection: (collectionName: string) => CollectionReference;
  getDocuments: (collectionName: string, constraints?: QueryConstraint[]) => Promise<DocumentData[]>;

  // Document operations
  getDocument: (collectionName: string, docId: string) => Promise<DocumentData | null>;
  addDocument: (collectionName: string, data: DocumentData) => Promise<string>;
  updateDocument: (collectionName: string, docId: string, data: Partial<DocumentData>) => Promise<void>;
  deleteDocument: (collectionName: string, docId: string) => Promise<void>;

  // Real-time subscriptions
  subscribeToCollection: (
    collectionName: string,
    callback: (data: DocumentData[]) => void,
    constraints?: QueryConstraint[]
  ) => Unsubscribe;
  subscribeToDocument: (
    collectionName: string,
    docId: string,
    callback: (data: DocumentData | null) => void
  ) => Unsubscribe;

  // Query helpers
  createQuery: (collectionName: string, constraints: QueryConstraint[]) => Promise<DocumentData[]>;
  whereQuery: (field: string, operator: WhereFilterOp, value: unknown) => QueryConstraint;
  orderByQuery: (field: string, direction?: 'asc' | 'desc') => QueryConstraint;
  limitQuery: (limitValue: number) => QueryConstraint;
}

export const FirestoreContext = createContext<FirestoreContextType | undefined>(undefined);

// Hook personalizado para usar el contexto
export const useFirestore = () => {
  const context = useContext(FirestoreContext);
  if (context === undefined) {
    throw new Error('useFirestore debe ser usado dentro de un FirestoreProvider');
  }
  return context;
};

// Hook para obtener una colección con estado reactivo y cache
export const useCollection = (collectionName: string, constraints: QueryConstraint[] = []) => {
  const [data, setData] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getDocuments } = useFirestore();

  // Usar useRef para evitar que constraints cause re-renders infinitos
  const constraintsRef = useRef(constraints);
  const prevConstraintsRef = useRef<string>('');

  // Memoizar la key del cache para evitar recálculos innecesarios
  const cacheKey = useMemo(() => {
    const currentConstraintsStr = JSON.stringify(constraints);
    if (currentConstraintsStr !== prevConstraintsRef.current) {
      constraintsRef.current = constraints;
      prevConstraintsRef.current = currentConstraintsStr;
    }
    return createCacheKey(collectionName, constraintsRef.current);
  }, [collectionName, JSON.stringify(constraints)]);

  // Función memoizada para obtener datos
  const fetchData = useCallback(async (useCache = true) => {
    try {
      setError(null);

      // Verificar cache primero si useCache es true
      if (useCache) {
        const cached = queryCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
          setData(cached.data);
          setLoading(false);
          return;
        }
      }

      setLoading(true);
      const documents = await getDocuments(collectionName, constraintsRef.current);

      // Actualizar cache
      queryCache.set(cacheKey, {
        data: documents,
        timestamp: Date.now()
      });

      setData(documents);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [collectionName, getDocuments, cacheKey]);

  // Effect que solo se ejecuta cuando cambia la cacheKey
  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  // Función para refrescar datos sin cache
  const refetch = useCallback(() => {
    return fetchData(false);
  }, [fetchData]);

  // Función para limpiar cache
  const clearCache = useCallback(() => {
    queryCache.delete(cacheKey);
  }, [cacheKey]);

  return { data, loading, error, refetch, clearCache };
};

// Hook para obtener un documento específico con cache
export const useDocument = (collectionName: string, docId: string | null) => {
  const [data, setData] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getDocument } = useFirestore();

  const cacheKey = useMemo(() =>
    docId ? `${collectionName}:doc:${docId}` : null,
    [collectionName, docId]
  );

  const fetchData = useCallback(async (useCache = true) => {
    if (!docId || !cacheKey) {
      setData(null);
      setLoading(false);
      return;
    }

    try {
      setError(null);

      // Verificar cache
      if (useCache) {
        const cached = queryCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
          setData(cached.data[0] || null);
          setLoading(false);
          return;
        }
      }

      setLoading(true);
      const document = await getDocument(collectionName, docId);

      // Actualizar cache
      if (document) {
        queryCache.set(cacheKey, {
          data: [document],
          timestamp: Date.now()
        });
      }

      setData(document);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [collectionName, docId, getDocument, cacheKey]);

  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  const refetch = useCallback(() => {
    return fetchData(false);
  }, [fetchData]);

  return { data, loading, error, refetch };
};

// Hook para suscripción en tiempo real a una colección (optimizado)
export const useRealtimeCollection = (collectionName: string, constraints: QueryConstraint[] = []) => {
  const [data, setData] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { subscribeToCollection } = useFirestore();

  // Usar useRef para evitar re-suscripciones innecesarias
  const constraintsRef = useRef(constraints);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const constraintsStr = useMemo(() =>
    JSON.stringify(constraints),
    [constraints]
  );

  useEffect(() => {
    // Solo actualizar constraints si realmente cambiaron
    const newConstraintsStr = JSON.stringify(constraints);
    if (newConstraintsStr !== JSON.stringify(constraintsRef.current)) {
      constraintsRef.current = constraints;
    }
  }, [constraints]);

  useEffect(() => {
    setLoading(true);
    setError(null);

    // Cancelar suscripción anterior si existe
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    const unsubscribe = subscribeToCollection(
      collectionName,
      (documents) => {
        setData(documents);
        setLoading(false);
      },
      constraintsRef.current
    );

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [collectionName, subscribeToCollection, constraintsStr]);

  return { data, loading, error };
};

// Hook para suscripción en tiempo real a un documento (optimizado)
export const useRealtimeDocument = (collectionName: string, docId: string | null) => {
  const [data, setData] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { subscribeToDocument } = useFirestore();
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!docId) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Cancelar suscripción anterior si existe
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    const unsubscribe = subscribeToDocument(
      collectionName,
      docId,
      (document) => {
        setData(document);
        setLoading(false);
      }
    );

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [collectionName, docId, subscribeToDocument]);

  return { data, loading, error };
};

// Hook para operaciones CRUD con estado de loading
export const useFirestoreOperations = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addDocument, updateDocument, deleteDocument } = useFirestore();

  const add = useCallback(async (collectionName: string, data: DocumentData) => {
    try {
      setLoading(true);
      setError(null);
      const result = await addDocument(collectionName, data);

      // Limpiar cache relacionado cuando se agrega un documento
      const keysToDelete: string[] = [];
      queryCache.forEach((_, key) => {
        if (key.startsWith(collectionName)) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach(key => queryCache.delete(key));

      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agregar documento');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [addDocument]);

  const update = useCallback(async (collectionName: string, docId: string, data: Partial<DocumentData>) => {
    try {
      setLoading(true);
      setError(null);
      await updateDocument(collectionName, docId, data);

      // Limpiar cache relacionado cuando se actualiza un documento
      const keysToDelete: string[] = [];
      queryCache.forEach((_, key) => {
        if (key.startsWith(collectionName)) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach(key => queryCache.delete(key));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar documento');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [updateDocument]);

  const remove = useCallback(async (collectionName: string, docId: string) => {
    try {
      setLoading(true);
      setError(null);
      await deleteDocument(collectionName, docId);

      // Limpiar cache relacionado cuando se elimina un documento
      const keysToDelete: string[] = [];
      queryCache.forEach((_, key) => {
        if (key.startsWith(collectionName)) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach(key => queryCache.delete(key));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar documento');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [deleteDocument]);

  return { add, update, remove, loading, error };
};

// Hook para limpiar todo el cache
export const useClearCache = () => {
  return useCallback(() => {
    queryCache.clear();
  }, []);
};
