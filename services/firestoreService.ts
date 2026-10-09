import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import type { Quote, Part, Printer, Filament, Order, GeneralSettings, AppData } from '../types';

/**
 * Sanitizes document IDs for Firestore compliance.
 */
export function sanitizeDocId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_.-]/g, '_');
}

/**
 * Subscribes to real-time changes for a user's remote Firestore data across all collections.
 * Returns an unsubscribe function.
 */
export function subscribeToUserData(
  userId: string,
  callbacks: {
    onQuotes: (quotes: Quote[]) => void;
    onParts: (parts: Part[]) => void;
    onPrinters: (printers: Printer[]) => void;
    onFilaments: (filaments: Filament[]) => void;
    onOrders: (orders: Order[]) => void;
    onSettings: (settings: GeneralSettings) => void;
    onError?: (error: unknown) => void;
  }
): () => void {
  const unsubs: (() => void)[] = [];

  // Quotes listener
  try {
    const quotesQuery = query(collection(db, 'quotes'), where('ownerId', '==', userId));
    const unsubQuotes = onSnapshot(
      quotesQuery,
      (snapshot) => {
        const quotes: Quote[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          const { ownerId: _ownerId, ...rest } = data;
          quotes.push(rest as Quote);
        });
        quotes.sort((a, b) => b.jobNumber - a.jobNumber);
        callbacks.onQuotes(quotes);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.GET, 'quotes');
        } catch (err) {
          if (callbacks.onError) callbacks.onError(err);
        }
      }
    );
    unsubs.push(unsubQuotes);
  } catch (err) {
    if (callbacks.onError) callbacks.onError(err);
  }

  // Parts listener
  try {
    const partsQuery = query(collection(db, 'parts'), where('ownerId', '==', userId));
    const unsubParts = onSnapshot(
      partsQuery,
      (snapshot) => {
        const parts: Part[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          const { ownerId: _ownerId, ...rest } = data;
          parts.push(rest as Part);
        });
        callbacks.onParts(parts);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.GET, 'parts');
        } catch (err) {
          if (callbacks.onError) callbacks.onError(err);
        }
      }
    );
    unsubs.push(unsubParts);
  } catch (err) {
    if (callbacks.onError) callbacks.onError(err);
  }

  // Printers listener
  try {
    const printersQuery = query(collection(db, 'printers'), where('ownerId', '==', userId));
    const unsubPrinters = onSnapshot(
      printersQuery,
      (snapshot) => {
        const printers: Printer[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          const { ownerId: _ownerId, ...rest } = data;
          printers.push(rest as Printer);
        });
        callbacks.onPrinters(printers);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.GET, 'printers');
        } catch (err) {
          if (callbacks.onError) callbacks.onError(err);
        }
      }
    );
    unsubs.push(unsubPrinters);
  } catch (err) {
    if (callbacks.onError) callbacks.onError(err);
  }

  // Filaments listener
  try {
    const filamentsQuery = query(collection(db, 'filaments'), where('ownerId', '==', userId));
    const unsubFilaments = onSnapshot(
      filamentsQuery,
      (snapshot) => {
        const filaments: Filament[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          const { ownerId: _ownerId, ...rest } = data;
          filaments.push(rest as Filament);
        });
        callbacks.onFilaments(filaments);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.GET, 'filaments');
        } catch (err) {
          if (callbacks.onError) callbacks.onError(err);
        }
      }
    );
    unsubs.push(unsubFilaments);
  } catch (err) {
    if (callbacks.onError) callbacks.onError(err);
  }

  // Orders listener
  try {
    const ordersQuery = query(collection(db, 'orders'), where('ownerId', '==', userId));
    const unsubOrders = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const orders: Order[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          const { ownerId: _ownerId, ...rest } = data;
          orders.push(rest as Order);
        });
        orders.sort((a, b) => b.orderNumber - a.orderNumber);
        callbacks.onOrders(orders);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.GET, 'orders');
        } catch (err) {
          if (callbacks.onError) callbacks.onError(err);
        }
      }
    );
    unsubs.push(unsubOrders);
  } catch (err) {
    if (callbacks.onError) callbacks.onError(err);
  }

  // Settings listener
  try {
    const unsubSettings = onSnapshot(
      doc(db, 'user_settings', userId),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && data.settings) {
            callbacks.onSettings(data.settings as GeneralSettings);
          }
        }
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.GET, `user_settings/${userId}`);
        } catch (err) {
          if (callbacks.onError) callbacks.onError(err);
        }
      }
    );
    unsubs.push(unsubSettings);
  } catch (err) {
    if (callbacks.onError) callbacks.onError(err);
  }

  return () => {
    unsubs.forEach((unsub) => {
      try {
        unsub();
      } catch (e) {
        console.error('Error unsubscribing:', e);
      }
    });
  };
}

/**
 * Saves a quote to remote Firestore.
 */
export async function saveQuoteToRemote(userId: string, quote: Quote): Promise<void> {
  const cleanId = sanitizeDocId(quote.id);
  const path = `quotes/${cleanId}`;
  try {
    const payload = {
      ...quote,
      id: cleanId,
      ownerId: userId,
    };
    await setDoc(doc(db, 'quotes', cleanId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Deletes a quote from remote Firestore.
 */
export async function deleteQuoteFromRemote(userId: string, quoteId: string): Promise<void> {
  const cleanId = sanitizeDocId(quoteId);
  const path = `quotes/${cleanId}`;
  try {
    await deleteDoc(doc(db, 'quotes', cleanId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Saves a part to remote Firestore.
 */
export async function savePartToRemote(userId: string, part: Part): Promise<void> {
  const cleanId = sanitizeDocId(part.id);
  const path = `parts/${cleanId}`;
  try {
    const payload = {
      ...part,
      id: cleanId,
      ownerId: userId,
    };
    await setDoc(doc(db, 'parts', cleanId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Deletes a part from remote Firestore.
 */
export async function deletePartFromRemote(userId: string, partId: string): Promise<void> {
  const cleanId = sanitizeDocId(partId);
  const path = `parts/${cleanId}`;
  try {
    await deleteDoc(doc(db, 'parts', cleanId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Saves a printer to remote Firestore.
 */
export async function savePrinterToRemote(userId: string, printer: Printer): Promise<void> {
  const cleanId = sanitizeDocId(printer.id);
  const path = `printers/${cleanId}`;
  try {
    const payload = {
      ...printer,
      id: cleanId,
      ownerId: userId,
    };
    await setDoc(doc(db, 'printers', cleanId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Deletes a printer from remote Firestore.
 */
export async function deletePrinterFromRemote(userId: string, printerId: string): Promise<void> {
  const cleanId = sanitizeDocId(printerId);
  const path = `printers/${cleanId}`;
  try {
    await deleteDoc(doc(db, 'printers', cleanId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Saves a filament to remote Firestore.
 */
export async function saveFilamentToRemote(userId: string, filament: Filament): Promise<void> {
  const cleanId = sanitizeDocId(filament.id);
  const path = `filaments/${cleanId}`;
  try {
    const payload = {
      ...filament,
      id: cleanId,
      ownerId: userId,
    };
    await setDoc(doc(db, 'filaments', cleanId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Deletes a filament from remote Firestore.
 */
export async function deleteFilamentFromRemote(userId: string, filamentId: string): Promise<void> {
  const cleanId = sanitizeDocId(filamentId);
  const path = `filaments/${cleanId}`;
  try {
    await deleteDoc(doc(db, 'filaments', cleanId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Saves an order to remote Firestore.
 */
export async function saveOrderToRemote(userId: string, order: Order): Promise<void> {
  const cleanId = sanitizeDocId(order.id);
  const path = `orders/${cleanId}`;
  try {
    const payload = {
      ...order,
      id: cleanId,
      ownerId: userId,
    };
    await setDoc(doc(db, 'orders', cleanId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Deletes an order from remote Firestore.
 */
export async function deleteOrderFromRemote(userId: string, orderId: string): Promise<void> {
  const cleanId = sanitizeDocId(orderId);
  const path = `orders/${cleanId}`;
  try {
    await deleteDoc(doc(db, 'orders', cleanId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Saves general workshop settings to remote Firestore.
 */
export async function saveSettingsToRemote(userId: string, settings: GeneralSettings): Promise<void> {
  const path = `user_settings/${userId}`;
  try {
    await setDoc(doc(db, 'user_settings', userId), {
      id: userId,
      ownerId: userId,
      settings,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Saves or updates user profile in Firestore.
 */
export async function saveUserProfile(user: { uid: string; email?: string | null; displayName?: string | null; photoURL?: string | null }): Promise<void> {
  const path = `users/${user.uid}`;
  try {
    await setDoc(
      doc(db, 'users', user.uid),
      {
        id: user.uid,
        email: user.email || 'user@example.com',
        displayName: user.displayName || 'Maker',
        photoURL: user.photoURL || '',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Uploads all existing local items to Firestore.
 */
export async function syncAllLocalDataToRemote(userId: string, localData: AppData): Promise<void> {
  // Filaments
  for (const f of localData.filaments) {
    await saveFilamentToRemote(userId, f);
  }
  // Printers
  for (const p of localData.printers) {
    await savePrinterToRemote(userId, p);
  }
  // Parts
  for (const part of localData.parts) {
    await savePartToRemote(userId, part);
  }
  // Quotes
  for (const q of localData.quotes) {
    await saveQuoteToRemote(userId, q);
  }
  // Orders
  for (const o of localData.orders) {
    await saveOrderToRemote(userId, o);
  }
  // Settings
  await saveSettingsToRemote(userId, localData.generalSettings);
}
