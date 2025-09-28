import type { ReactNode, FC } from 'react';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  QueryConstraint,
  onSnapshot,
  type DocumentData,
  type WhereFilterOp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {FirestoreContext, type FirestoreContextType} from "@/hooks/use-firestore.ts";

interface FirestoreProviderProps {
  children: ReactNode;
}

export const FirestoreProvider: FC<FirestoreProviderProps> = ({ children }) => {
  // Collection operations
  const getCollection = (collectionName: string) => {
    return collection(db, collectionName);
  };

  const getDocuments = async (collectionName: string, constraints: QueryConstraint[] = []) => {
    try {
      const collectionRef = collection(db, collectionName);
      const q = constraints.length > 0 ? query(collectionRef, ...constraints) : collectionRef;
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error(`Error getting documents from ${collectionName}:`, error);
      throw error;
    }
  };

  // Document operations
  const getDocument = async (collectionName: string, docId: string) => {
    try {
      const docRef = doc(db, collectionName, docId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      } else {
        return null;
      }
    } catch (error) {
      console.error(`Error getting document ${docId} from ${collectionName}:`, error);
      throw error;
    }
  };

  const addDocument = async (collectionName: string, data: DocumentData) => {
    try {
      const collectionRef = collection(db, collectionName);
      const docRef = await addDoc(collectionRef, {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      return docRef.id;
    } catch (error) {
      console.error(`Error adding document to ${collectionName}:`, error);
      throw error;
    }
  };

  const updateDocument = async (collectionName: string, docId: string, data: Partial<DocumentData>) => {
    try {
      const docRef = doc(db, collectionName, docId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error(`Error updating document ${docId} in ${collectionName}:`, error);
      throw error;
    }
  };

  const deleteDocument = async (collectionName: string, docId: string) => {
    try {
      const docRef = doc(db, collectionName, docId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error(`Error deleting document ${docId} from ${collectionName}:`, error);
      throw error;
    }
  };

  // Real-time subscriptions
  const subscribeToCollection = (
    collectionName: string,
    callback: (data: DocumentData[]) => void,
    constraints: QueryConstraint[] = []
  ) => {
    const collectionRef = collection(db, collectionName);
    const q = constraints.length > 0 ? query(collectionRef, ...constraints) : collectionRef;

    return onSnapshot(q, (querySnapshot) => {
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(data);
    }, (error) => {
      console.error(`Error in subscription to ${collectionName}:`, error);
    });
  };

  const subscribeToDocument = (
    collectionName: string,
    docId: string,
    callback: (data: DocumentData | null) => void
  ) => {
    const docRef = doc(db, collectionName, docId);

    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        callback({
          id: docSnap.id,
          ...docSnap.data()
        });
      } else {
        callback(null);
      }
    }, (error) => {
      console.error(`Error in subscription to document ${docId} in ${collectionName}:`, error);
    });
  };

  // Query helpers
  const createQuery = async (collectionName: string, constraints: QueryConstraint[]) => {
    return getDocuments(collectionName, constraints);
  };

  const whereQuery = (field: string, operator: WhereFilterOp, value: unknown) => {
    return where(field, operator, value);
  };

  const orderByQuery = (field: string, direction: 'asc' | 'desc' = 'asc') => {
    return orderBy(field, direction);
  };

  const limitQuery = (limitValue: number) => {
    return limit(limitValue);
  };

  const contextValue: FirestoreContextType = {
    db,
    getCollection,
    getDocuments,
    getDocument,
    addDocument,
    updateDocument,
    deleteDocument,
    subscribeToCollection,
    subscribeToDocument,
    createQuery,
    whereQuery,
    orderByQuery,
    limitQuery,
  };

  return (
    <FirestoreContext.Provider value={contextValue}>
      {children}
    </FirestoreContext.Provider>
  );
};

export default FirestoreProvider;
