
export type Role = 'ADMIN' | 'TEACHER' | 'STUDENT';

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  RESIGNED = 'RESIGNED'
}

export enum TaskStatus {
  HAVENT_START = 'HAVENT_START',
  DOING = 'DOING',
  COMPLETE = 'COMPLETE'
}

export enum LessonCategory {
  TEACHING = 'Teaching',
  EXERCISE = 'Doing Exercise',
  TEST = 'Test',
  GAME = 'Game'
}

export enum AttendanceStatus {
  PRESENT = 'Present',
  ABSENT = 'Absent',
  LATE = 'Late'
}

export interface User {
  id: string;
  name: string;
  username: string;
  password?: string;
  role: Role;
  status: UserStatus;
  age?: number;
  standard?: string;
  avatar_url?: string;
}

export interface Class {
  id: string;
  name: string;
  themeColor: string;
  classDay: string; // e.g., 'Thursday'
  classTime: string;
  teacherId: string;
  enrolledStudentIds: string[];
  order?: number;
}

export interface LessonPlan {
  id: string;
  classId?: string;
  class_id?: string;
  date: string;
  topic?: string;
  text?: string;
  category: string;
  status: TaskStatus;
  materials: { name: string; url: string }[];
}

export interface AttendanceRecord {
  id: string;
  classId?: string;
  class_id?: string;
  studentId?: string;
  student_id?: string;
  date: string;
  status: AttendanceStatus | string;
  reason?: string;
  performanceComment?: string;
  performance_comment?: string;
  testScore?: number | null;
  test_score?: number | null;
}

export interface ExamResult {
  id: string;
  classId: string;
  studentId: string;
  examName: string;
  score: number;
}

export interface Task {
  id: string;
  name: string;
  dueDate: string;
  category: string;
  status: TaskStatus;
}

export interface Holiday {
  id: string;
  date: string;
  description: string;
}

export interface SystemSettings {
  themeColor: string;
  absentReasons: string[];
  lessonCategories: string[];
  taskCategories: string[];
  holidays: Holiday[];
  workingDays: string[];
  startHour: number;
  endHour: number;
}

export interface Announcement {
  id: string;
  title: string;
  content?: string;
  image_url?: string;
  target_standard?: string;
  target_student_ids?: string[];
  is_global: boolean;
  published_by: string;
  created_at: string;
}

export interface CommunityPost {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  category: 'NEWS' | 'EVENT' | 'COMMUNITY';
  status: 'PENDING' | 'APPROVED';
  author_id: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  student_id: string;
  description?: string;
  amount: number;
  balance?: number;
  currency: string;
  status: 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE';
  due_date?: string;
  date?: string;
  created_at: string;
}

export interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  method: 'CASH' | 'BANK_TRANSFER';
  paid_at: string;
}

export interface InvitationCode {
  id?: string;
  code: string;
  target_name?: string;
  target_standard?: string;
  standard?: string;
  used_by?: string;
  status?: 'ACTIVE' | 'USED' | 'EXPIRED';
  is_active?: boolean;
}

export interface FeedbackTemplate {
  id: string;
  type: 'TEACHING' | 'EXERCISE' | 'TEST';
  en: string;
  ms: string;
  zh: string;
}
