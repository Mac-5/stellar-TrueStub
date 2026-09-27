import { db } from '../config/firebase';
import { ListingAlert, CreateListingAlertInput } from '../types/listing-alert';

const COLLECTION = 'listingAlerts';

/**
 * Create a listing alert for the given (already authenticated) user.
 * The userId must be derived from a verified Firebase ID token by the caller.
 */
export async function createListingAlert(
  userId: string,
  input: CreateListingAlertInput
): Promise<ListingAlert> {
  const now = new Date().toISOString();
  const ref = db.collection(COLLECTION).doc();

  const alert: ListingAlert = {
    id: ref.id,
    userId,
    ...input,
    createdAt: now,
    updatedAt: now,
  };

  await ref.set(alert);
  return alert;
}

/**
 * List alerts belonging to the authenticated user only.
 */
export async function getListingAlerts(userId: string): Promise<ListingAlert[]> {
  const snapshot = await db
    .collection(COLLECTION)
    .where('userId', '==', userId)
    .get();

  return snapshot.docs.map((doc) => doc.data() as ListingAlert);
}

/**
 * Delete an alert, but only if it belongs to the authenticated user.
 * Returns true when a matching alert was deleted, false otherwise.
 */
export async function deleteListingAlert(
  userId: string,
  alertId: string
): Promise<boolean> {
  const ref = db.collection(COLLECTION).doc(alertId);
  const doc = await ref.get();

  if (!doc.exists) {
    return false;
  }

  const alert = doc.data() as ListingAlert;
  if (alert.userId !== userId) {
    return false;
  }

  await ref.delete();
  return true;
}
