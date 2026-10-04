export async function requestPersistentStorage(
  storage: StorageManager | undefined = navigator.storage
): Promise<boolean> {
  if (!storage?.persist) {
    return false;
  }

  if (await storage.persisted()) {
    return true;
  }

  return storage.persist();
}

