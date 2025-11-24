export interface WellnessCheckInDto {
  moodLevel?: string | null;
  reminderEnabled?: boolean;
  weekdayStartTimeUtc?: string | null;
  weekdayEndTimeUtc?: string | null;
  weekendStartTimeUtc?: string | null;
  weekendEndTimeUtc?: string | null;
  timezoneId?: string | null;
}

export interface TaskSuggestion {
  task: string;
  frequency?: string;
  duration?: string;
  notes?: string;
  priority?: string;
  suggestedTime?: string;
}

export interface BrainDumpResponse {
  userProfile: {
    name: string;
    currentState: string;
    emoji: string;
  };
  keyThemes: string[];
  aiSummary: string;
  suggestedActivities: TaskSuggestion[];
  insights?: string[];
  patterns?: string[];
  brainDumpEntryId?: string;
  personalizedMessage?: string;
}

export interface AddTaskResult {
  message: string;
  taskId: string;
  task: {
    title: string;
    description: string;
    category: number;
    date: string;
    time: string;
    durationMinutes: number;
    repeatType: number;
    sourceBrainDumpEntryId?: string;
  };
}

export interface TaskItem {
  id: string;
  title: string;
  description?: string | null;
  category: number;
  otherCategoryName?: string | null;
  date: string;
  time: string;
  durationMinutes: number;
  reminderEnabled: boolean;
  repeatType: number;
  status: number;
  createdBySuggestionEngine: boolean;
  isApproved: boolean;
}

