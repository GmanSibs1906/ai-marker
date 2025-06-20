import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL
} from 'firebase/storage';
import { db, storage } from './firebase';
import { 
  ClassDetails, 
  BatchJob, 
  MarkingResult,
  DashboardStats,
  ClassSummary 
} from './types';

// Class Management
export async function createClass(classData: Omit<ClassDetails, 'id' | 'createdAt' | 'updatedAt'>): Promise<ClassDetails> {
  const docRef = await addDoc(collection(db, 'classes'), {
    ...classData,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  
  return {
    id: docRef.id,
    ...classData,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function getClasses(): Promise<ClassDetails[]> {
  const querySnapshot = await getDocs(
    query(collection(db, 'classes'), orderBy('createdAt', 'desc'))
  );
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt.toDate(),
    updatedAt: doc.data().updatedAt.toDate(),
  })) as ClassDetails[];
}

export async function updateClass(classId: string, updates: Partial<ClassDetails>): Promise<void> {
  const classRef = doc(db, 'classes', classId);
  await updateDoc(classRef, {
    ...updates,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteClass(classId: string): Promise<void> {
  await deleteDoc(doc(db, 'classes', classId));
}

// Batch Job Management
export async function createBatchJob(batchData: Omit<BatchJob, 'id' | 'createdAt'>): Promise<BatchJob> {
  const docRef = await addDoc(collection(db, 'batchJobs'), {
    ...batchData,
    createdAt: Timestamp.now(),
  });
  
  return {
    id: docRef.id,
    ...batchData,
    createdAt: new Date(),
  };
}

export async function updateBatchJob(batchId: string, updates: Partial<BatchJob>): Promise<void> {
  const batchRef = doc(db, 'batchJobs', batchId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = { ...updates };
  
  if (updates.completedAt) {
    updateData.completedAt = Timestamp.now();
  }
  
  await updateDoc(batchRef, updateData);
}

export async function getBatchJobsByClass(classId: string): Promise<BatchJob[]> {
  const querySnapshot = await getDocs(
    query(
      collection(db, 'batchJobs'),
      where('classId', '==', classId),
      orderBy('createdAt', 'desc')
    )
  );
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt.toDate(),
    completedAt: doc.data().completedAt?.toDate(),
  })) as BatchJob[];
}

// Marking Results Storage
export async function saveMarkingResult(result: MarkingResult): Promise<void> {
  await addDoc(collection(db, 'markingResults'), {
    ...result,
    createdAt: Timestamp.now(),
  });
}

export async function getMarkingResultsByClass(classId: string): Promise<MarkingResult[]> {
  const querySnapshot = await getDocs(
    query(
      collection(db, 'markingResults'),
      where('classId', '==', classId),
      orderBy('createdAt', 'desc')
    )
  );
  
  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      studentName: data.studentName,
      assignmentTitle: data.assignmentTitle,
      markingContent: data.markingContent,
      originalFileName: data.originalFileName,
      markedFileName: data.markedFileName,
      totalMarks: data.totalMarks,
      percentage: data.percentage,
      subject: data.subject,
      classId: data.classId,
      createdAt: data.createdAt.toDate(),
    } as MarkingResult;
  });
}

// File Storage
export async function uploadMarkedDocument(
  file: Blob, 
  fileName: string, 
  classId: string
): Promise<string> {
  const storageRef = ref(storage, `marked-documents/${classId}/${fileName}`);
  const snapshot = await uploadBytes(storageRef, file);
  return await getDownloadURL(snapshot.ref);
}

export async function uploadBatchZip(
  zipFile: Blob, 
  batchId: string
): Promise<string> {
  const storageRef = ref(storage, `batch-downloads/${batchId}.zip`);
  const snapshot = await uploadBytes(storageRef, zipFile);
  return await getDownloadURL(snapshot.ref);
}

// Dashboard Analytics
export async function getDashboardStats(): Promise<DashboardStats> {
  const [classesSnapshot, batchJobsSnapshot, markingResultsSnapshot] = await Promise.all([
    getDocs(collection(db, 'classes')),
    getDocs(query(collection(db, 'batchJobs'), where('status', '==', 'pending'))),
    getDocs(collection(db, 'markingResults')),
  ]);
  
  return {
    totalClasses: classesSnapshot.size,
    totalDocuments: markingResultsSnapshot.size,
    documentsMarked: markingResultsSnapshot.size,
    pendingJobs: batchJobsSnapshot.size,
  };
}

export async function getClassSummaries(): Promise<ClassSummary[]> {
  const classes = await getClasses();
  
  const summaries = await Promise.all(
    classes.map(async (classItem) => {
      const [batchJobs, markingResults] = await Promise.all([
        getBatchJobsByClass(classItem.id),
        getMarkingResultsByClass(classItem.id),
      ]);
      
      const documentCount = batchJobs.reduce((sum, job) => sum + job.totalFiles, 0);
      const markedCount = markingResults.length;
      const lastActivity = batchJobs.length > 0 
        ? batchJobs[0].createdAt 
        : classItem.createdAt;
      
      return {
        ...classItem,
        documentCount,
        markedCount,
        lastActivity,
      };
    })
  );
  
  return summaries;
} 