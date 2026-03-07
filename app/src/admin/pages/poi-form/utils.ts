import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../../../lib/firebase.ts'

export async function uploadFile(file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? ''
  const path = `poi-media/${crypto.randomUUID()}.${ext}`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file)
  return getDownloadURL(storageRef)
}
