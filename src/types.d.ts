export type Role = 'employee' | 'manager' | 'admin';
export type UomType = 'Numeric' | 'Percent' | 'Timeline' | 'Zero';
export type PerformanceDirection = 'Min' | 'Max';
export type GoalStatus = 'Not Started' | 'On Track' | 'Completed';
export type SheetStatus = 'Draft' | 'Submitted' | 'Returned' | 'Approved' | 'Locked';
export interface UserProfile {
    id: string;
    name: string;
    email: string;
    password: string;
    dob?: string;
    role: Role;
    employeeCode?: string;
}
export interface EmployeeProfile {
    id: string;
    name: string;
    title: string;
    department: string;
    managerId: string;
}
export interface GoalItem {
    id: string;
    thrustArea: string;
    title: string;
    description: string;
    uom: UomType;
    direction: PerformanceDirection;
    target: string;
    targetDate?: string;
    weightage: number;
    actual?: string;
    actualDate?: string;
    status: GoalStatus;
    sharedGroupId?: string;
    sharedReadOnly?: boolean;
}
export interface CheckInRecord {
    id: string;
    quarter: string;
    comment: string;
    updatedAt: string;
    updatedBy: string;
}
export interface GoalSheet {
    id: string;
    employeeId: string;
    cycleYear: number;
    status: SheetStatus;
    submittedAt?: string;
    approvedAt?: string;
    returnedAt?: string;
    lockedAt?: string;
    unlockReason?: string;
    goals: GoalItem[];
    checkIns: CheckInRecord[];
}
export interface AuditEntry {
    id: string;
    timestamp: string;
    actor: string;
    role: Role;
    action: string;
    entityType: 'goal' | 'sheet' | 'check-in' | 'report';
    entityId: string;
    before?: string;
    after?: string;
    note?: string;
}
export interface AppState {
    users: UserProfile[];
    employees: EmployeeProfile[];
    activeUserId: string | null;
    selectedEmployeeId: string;
    simulationDate: string;
    goalSheets: GoalSheet[];
    auditTrail: AuditEntry[];
    sharedGoalCounter: number;
}
