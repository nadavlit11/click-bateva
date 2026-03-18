export type TaskPriority = 'high' | 'medium' | 'low'

export interface CrmContact {
  id: string
  name: string
  businessName: string
  nameInMap?: string
  phone: string
  phone2?: string
  email: string
  createdBy: string
  createdByEmail: string
  createdAt: unknown
  updatedAt: unknown
}

export interface ActivityLogEntry {
  id: string
  text: string
  createdBy: string
  createdByEmail: string
  createdAt: unknown
  updatedAt?: unknown
}

export interface CrmAttachment {
  id: string
  name: string
  url: string
  contentType: string
  size: number
  emailSubject?: string
  uploadedBy: string
  uploadedByEmail: string
  createdAt: unknown
}

export interface CrmTask {
  id: string
  contactId: string
  contactName: string
  contactBusinessName: string
  contactPhone: string
  title: string
  description: string
  date: unknown
  color: string
  priority: TaskPriority
  assigneeUid: string
  assigneeEmail: string
  followers: string[]
  createdBy: string
  createdByEmail: string
  completed: boolean
  createdAt: unknown
  updatedAt: unknown
}
