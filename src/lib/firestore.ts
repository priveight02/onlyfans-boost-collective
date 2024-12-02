import { db } from './firebase';
import { 
  collection,
  addDoc,
  getDocs,
  query,
  where,
  DocumentData
} from 'firebase/firestore';

// Models collection operations
export const addModel = async (modelData: DocumentData) => {
  try {
    const docRef = await addDoc(collection(db, 'models'), modelData);
    console.log('Model added with ID:', docRef.id);
    return docRef;
  } catch (error) {
    console.error('Error adding model:', error);
    throw error;
  }
};

export const getModels = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'models'));
    console.log('Retrieved models:', querySnapshot.size);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting models:', error);
    throw error;
  }
};

// Applications collection operations
export const submitApplication = async (applicationData: DocumentData) => {
  try {
    const docRef = await addDoc(collection(db, 'applications'), applicationData);
    console.log('Application submitted with ID:', docRef.id);
    return docRef;
  } catch (error) {
    console.error('Error submitting application:', error);
    throw error;
  }
};

export const getApplications = async (userId: string) => {
  try {
    const q = query(collection(db, 'applications'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    console.log('Retrieved applications:', querySnapshot.size);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting applications:', error);
    throw error;
  }
};