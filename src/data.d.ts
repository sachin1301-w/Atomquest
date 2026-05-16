import type { AppState, EmployeeProfile, GoalSheet, UserProfile } from './types';
export declare function createSeedState(): AppState;
export declare function createEmployeeSignupRecords(params: {
    name: string;
    dob: string;
    email: string;
    password: string;
    managerId: string;
    cycleYear?: number;
}): {
    user: UserProfile;
    employee: EmployeeProfile;
    goalSheet: GoalSheet;
};
