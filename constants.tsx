
import { UserStatus, Role, LessonCategory } from './types';

export const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const INITIAL_SETTINGS = {
  themeColor: 'blue',
  absentReasons: ['Sick', 'Trip', 'Family Emergency', 'Personal Matter'],
  lessonCategories: Object.values(LessonCategory),
  taskCategories: ['Administrative', 'Preparation', 'Marking', 'Meeting'],
  holidays: [
    { id: 'h1', date: '2025-01-01', description: "New Year's Day" },
    { id: 'h2', date: '2025-12-25', description: "Christmas Day" }
  ]
};

export const MOCK_STUDENTS = [
  { id: 's1', name: 'Alice Smith', age: 10, standard: '4A', status: UserStatus.ACTIVE, role: 'STUDENT' as Role, username: 'alice' },
  { id: 's2', name: 'Bob Jones', age: 11, standard: '5B', status: UserStatus.ACTIVE, role: 'STUDENT' as Role, username: 'bob' },
  { id: 's3', name: 'Charlie Brown', age: 10, standard: '4A', status: UserStatus.ACTIVE, role: 'STUDENT' as Role, username: 'charlie' },
];

export const MOCK_TEACHERS = [
  { id: 't1', name: 'Ms. Johnson', status: UserStatus.ACTIVE, role: 'TEACHER' as Role, username: 'johnson' },
];
