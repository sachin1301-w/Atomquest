import type { AppState, EmployeeProfile, GoalItem, GoalSheet, UserProfile } from './types';
import { uid } from './utils';

const employees: EmployeeProfile[] = [
  {
    id: 'emp-alice',
    name: 'Alice Chen',
    title: 'Operations Analyst',
    department: 'Operations',
    managerId: 'user-maya',
  },
  {
    id: 'emp-ben',
    name: 'Ben Carter',
    title: 'Sales Specialist',
    department: 'Sales',
    managerId: 'user-maya',
  },
  {
    id: 'emp-divya',
    name: 'Divya Nair',
    title: 'Process Lead',
    department: 'Operations',
    managerId: 'user-maya',
  },
];

const users: UserProfile[] = [
  {
    id: 'user-alice',
    name: 'Alice Chen',
    email: 'alice.chen@atomquest.local',
    password: 'Alice@1301',
    role: 'employee',
    employeeCode: '1302',
  },
  {
    id: 'user-maya',
    name: 'Maya Patel',
    email: 'sk.39648215@gmail.com',
    password: 'Sachin1301',
    role: 'manager',
    employeeCode: '1301',
  },
  {
    id: 'user-nora',
    name: 'Nora Hughes',
    email: 'nora.hughes@atomquest.local',
    password: 'Nora@1301',
    role: 'admin',
    employeeCode: '9001',
  },
];

function sharedGoal(groupId: string, target: string, weightage: number): GoalItem {
  return {
    id: uid('goal'),
    thrustArea: 'Shared KPI',
    title: 'Department compliance audit completion',
    description: 'Quarterly compliance evidence collection for the shared dashboard.',
    uom: 'Percent',
    direction: 'Min',
    target,
    weightage,
    actual: '0',
    status: 'On Track',
    sharedGroupId: groupId,
    sharedReadOnly: true,
  };
}

function goal(
  title: string,
  thrustArea: string,
  description: string,
  uom: GoalItem['uom'],
  direction: GoalItem['direction'],
  target: string,
  weightage: number,
  status: GoalItem['status'],
  extra?: Partial<GoalItem>,
): GoalItem {
  return {
    id: uid('goal'),
    title,
    thrustArea,
    description,
    uom,
    direction,
    target,
    weightage,
    status,
    actual: extra?.actual ?? '',
    actualDate: extra?.actualDate,
    targetDate: extra?.targetDate,
    sharedGroupId: extra?.sharedGroupId,
    sharedReadOnly: extra?.sharedReadOnly ?? false,
  };
}

const sharedGroupId = 'shared-kpi-ops-2026';

const goalSheets: GoalSheet[] = [
  {
    id: 'sheet-alice',
    employeeId: 'emp-alice',
    cycleYear: 2026,
    status: 'Draft',
    goals: [
      goal('Reduce support rework', 'Service Quality', 'Improve first-pass resolution rate for recurring requests.', 'Percent', 'Max', '8', 40, 'On Track', {
        actual: '12',
      }),
      goal('Onboard automation tracker', 'Operational Excellence', 'Create a dashboard that tracks onboarding bottlenecks.', 'Numeric', 'Min', '4', 35, 'Not Started', {
        actual: '1',
      }),
      sharedGoal(sharedGroupId, '95', 25),
    ],
    checkIns: [],
  },
  {
    id: 'sheet-ben',
    employeeId: 'emp-ben',
    cycleYear: 2026,
    status: 'Submitted',
    submittedAt: '2026-05-08T09:15:00.000Z',
    goals: [
      goal('Pipeline hygiene', 'Sales Growth', 'Keep lead stages current in CRM.', 'Percent', 'Min', '92', 35, 'On Track', { actual: '87' }),
      goal('Client follow-up SLA', 'Customer Success', 'Respond to high-priority accounts within the SLA window.', 'Timeline', 'Min', '', 35, 'Completed', {
        targetDate: '2026-09-30',
        actualDate: '2026-09-24',
      }),
      sharedGoal(sharedGroupId, '95', 30),
    ],
    checkIns: [
      {
        id: uid('checkin'),
        quarter: 'Q1 Check-in',
        comment: 'Pipeline hygiene improved after weekly reviews; SLA adherence is stable.',
        updatedAt: '2026-07-14T11:30:00.000Z',
        updatedBy: 'Maya Patel',
      },
    ],
  },
  {
    id: 'sheet-divya',
    employeeId: 'emp-divya',
    cycleYear: 2026,
    status: 'Approved',
    approvedAt: '2026-05-10T13:40:00.000Z',
    lockedAt: '2026-05-10T13:40:00.000Z',
    goals: [
      goal('Process standardization', 'Operational Excellence', 'Publish standard work for recurring handoffs.', 'Numeric', 'Min', '6', 50, 'Completed', {
        actual: '6',
        actualDate: '2026-07-02',
      }),
      goal('Incident-free period', 'Risk & Safety', 'Maintain zero avoidable incidents during the cycle.', 'Zero', 'Min', '0', 25, 'Completed', {
        actual: '0',
        actualDate: '2026-08-05',
      }),
      sharedGoal(sharedGroupId, '95', 25),
    ],
    checkIns: [
      {
        id: uid('checkin'),
        quarter: 'Q1 Check-in',
        comment: 'Documentation cadence is strong; keep focus on cross-team adoption.',
        updatedAt: '2026-07-18T10:05:00.000Z',
        updatedBy: 'Maya Patel',
      },
    ],
  },
];

export function createSeedState(): AppState {
  return {
    users,
    employees,
    activeUserId: null,
    selectedEmployeeId: 'emp-alice',
    simulationDate: '2026-05-16',
    goalSheets,
    auditTrail: [],
    sharedGoalCounter: 1,
  };
}

function slugFromEmail(email: string): string {
  return email.split('@')[0].replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
}

function createBlankGoal(): GoalItem {
  return {
    id: uid('goal'),
    thrustArea: 'Revenue Growth',
    title: '',
    description: '',
    uom: 'Percent',
    direction: 'Min',
    target: '',
    weightage: 10,
    status: 'Not Started',
    actual: '',
  };
}

export function createEmployeeSignupRecords(params: {
  name: string;
  dob: string;
  email: string;
  password: string;
  managerId: string;
  cycleYear?: number;
}): { user: UserProfile; employee: EmployeeProfile; goalSheet: GoalSheet } {
  const slug = slugFromEmail(params.email);
  const employeeId = `emp-${slug}-${Math.random().toString(36).slice(2, 6)}`;

  const user: UserProfile = {
    id: `user-${slug}-${Math.random().toString(36).slice(2, 6)}`,
    name: params.name,
    email: params.email,
    password: params.password,
    dob: params.dob,
    role: 'employee',
    employeeCode: employeeId,
  };

  const employee: EmployeeProfile = {
    id: employeeId,
    name: params.name,
    title: 'Employee',
    department: 'General',
    managerId: params.managerId,
  };

  const goalSheet: GoalSheet = {
    id: `sheet-${slug}-${Math.random().toString(36).slice(2, 6)}`,
    employeeId,
    cycleYear: params.cycleYear ?? 2026,
    status: 'Draft',
    goals: [createBlankGoal()],
    checkIns: [],
  };

  return { user, employee, goalSheet };
}