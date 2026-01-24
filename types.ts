
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
  classId: string;
  date: string;
  text: string;
  category: string;
  status: TaskStatus;
  materials: { name: string; url: string }[];
}

export interface AttendanceRecord {
  id: string;
  classId: string;
  studentId: string;
  date: string;
  status: AttendanceStatus;
  reason?: string;
  performanceComment: string;
  testScore?: string;
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
