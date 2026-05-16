import { useEffect, useState, type FormEvent } from 'react';
import { createEmployeeSignupRecords, createSeedState } from './data';
import type {
  AppState,
  AuditEntry,
  EmployeeProfile,
  GoalItem,
  GoalSheet,
  GoalStatus,
  PerformanceDirection,
  Role,
  SheetStatus,
  UomType,
} from './types';
import {
  calculateProgress,
  createAuditEntry,
  directionLabel,
  formatDate,
  formatDateTime,
  getQuarterCode,
  getQuarterLabel,
  isoNow,
  statusTone,
  summarizeProgress,
  toCsv,
  toDateInputValue,
  uid,
  validateSheet,
} from './utils';

const STORAGE_KEY = 'atomquest.goal.portal.state.v1';

const thrustAreas = ['Revenue Growth', 'Operational Excellence', 'Service Quality', 'Risk & Safety', 'Shared KPI'];
const uomOptions: UomType[] = ['Numeric', 'Percent', 'Timeline', 'Zero'];
const directionOptions: PerformanceDirection[] = ['Min', 'Max'];
const goalStatuses: GoalStatus[] = ['Not Started', 'On Track', 'Completed'];

function loadState(): AppState {
  if (typeof window === 'undefined') return createSeedState();

  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (!saved) return createSeedState();

  try {
    const seed = createSeedState();
    const parsed = JSON.parse(saved) as Partial<AppState> & { users?: Array<Partial<AppState['users'][number]>>; employees?: Array<Partial<EmployeeProfile>> };
    const users = (parsed.users?.length ? parsed.users : seed.users).map((user) => {
      const seedUser = seed.users.find((item) => item.id === user.id) ?? seed.users.find((item) => item.role === user.role && item.name === user.name);
      return {
        ...(seedUser ?? {}),
        ...user,
        email: user.email ?? seedUser?.email ?? '',
        password: user.password ?? seedUser?.password ?? '',
        employeeCode: user.employeeCode ?? seedUser?.employeeCode,
      } as AppState['users'][number];
    });
    const employees = (parsed.employees?.length ? parsed.employees : seed.employees).map((employee) => ({
      ...employee,
      managerId: employee.managerId === 'mgr-maya' ? 'user-maya' : employee.managerId ?? 'user-maya',
    })) as EmployeeProfile[];

    return {
      ...seed,
      ...parsed,
      users,
      employees,
      activeUserId: null,
    } as AppState;
  } catch {
    return createSeedState();
  }
}

function goalTemplate(): GoalItem {
  return {
    id: uid('goal'),
    thrustArea: thrustAreas[0],
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

function sheetForEmployee(state: AppState, employeeId: string): GoalSheet {
  const found = state.goalSheets.find((sheet) => sheet.employeeId === employeeId);
  if (found) return found;

  return {
    id: uid('sheet'),
    employeeId,
    cycleYear: 2026,
    status: 'Draft',
    goals: [goalTemplate()],
    checkIns: [],
  };
}

function roleLabel(role: Role): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function nameFromEmail(email: string): string {
  return email
    .split('@')[0]
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function slugFromEmail(email: string): string {
  return email.split('@')[0].replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
}

function AuthScreen({
  onSignIn,
  onSignUp,
}: {
  onSignIn: (email: string, password: string) => string | void;
  onSignUp: (name: string, dob: string, email: string, password: string, managerEmployeeCode: string) => string | void;
}) {
  const [mode, setMode] = useState<'signup' | 'employee-signin' | 'manager-login'>('signup');
  const [signinEmail, setSigninEmail] = useState('');
  const [signinPassword, setSigninPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupDob, setSignupDob] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupManagerCode, setSignupManagerCode] = useState('1301');
  const [notice, setNotice] = useState('Create a new employee account or sign in to your existing account. Managers can use the manager login.');
  const [authError, setAuthError] = useState('');

  function submitSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = onSignIn(signinEmail.trim(), signinPassword);
    if (message) {
      setAuthError(message);
      setNotice('');
      return;
    }
    setAuthError('');
    setNotice('');
  }

  function submitSignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = onSignUp(signupName.trim(), signupDob, signupEmail.trim(), signupPassword, signupManagerCode.trim());
    if (message) {
      setAuthError(message);
      setNotice('');
      return;
    }
    setMode('employee-signin');
    setSigninEmail(signupEmail.trim());
    setSigninPassword(signupPassword);
    setSignupName('');
    setSignupDob('');
    setSignupEmail('');
    setSignupPassword('');
    setAuthError('');
    setNotice('Account created successfully. Please sign in with the new employee credentials.');
  }

  return (
    <div className="auth-shell">
      <section className="auth-card panel">
        <div className="auth-header">
          <p className="eyebrow">Atomquest Goal Portal</p>
          <h1>Authentication</h1>
          <p>
            Create a new employee account, sign in as an employee, or access the manager login.
          </p>
        </div>

        <div className="auth-tabs">
          <button className={`auth-tab ${mode === 'signup' ? 'active' : ''}`} onClick={() => setMode('signup')} type="button">
            Employee sign up
          </button>
          <button className={`auth-tab ${mode === 'employee-signin' ? 'active' : ''}`} onClick={() => setMode('employee-signin')} type="button">
            Employee sign in
          </button>
          <button className={`auth-tab ${mode === 'manager-login' ? 'active' : ''}`} onClick={() => setMode('manager-login')} type="button">
            Manager login
          </button>
        </div>

        {notice ? <div className="banner success">{notice}</div> : null}
        {authError ? <div className="banner danger">{authError}</div> : null}

        {mode === 'signup' ? (
          <form className="auth-form stack" onSubmit={submitSignUp}>
            <label className="field-label" htmlFor="signup-name">Employee Name</label>
            <input id="signup-name" className="input" type="text" value={signupName} onChange={(event) => setSignupName(event.target.value)} placeholder="John Doe" />

            <label className="field-label" htmlFor="signup-dob">Date of Birth</label>
            <input id="signup-dob" className="input" type="date" value={signupDob} onChange={(event) => setSignupDob(event.target.value)} />

            <label className="field-label" htmlFor="signup-email">Employee email</label>
            <input id="signup-email" className="input" type="email" value={signupEmail} onChange={(event) => setSignupEmail(event.target.value)} placeholder="employee@example.com" />

            <label className="field-label" htmlFor="signup-password">Set password</label>
            <input id="signup-password" className="input" type="password" value={signupPassword} onChange={(event) => setSignupPassword(event.target.value)} placeholder="Create a password" />

            <label className="field-label" htmlFor="signup-manager">Manager employee ID</label>
            <input id="signup-manager" className="input" value={signupManagerCode} onChange={(event) => setSignupManagerCode(event.target.value)} placeholder="1301" />

            <button className="button primary" type="submit">Create employee account</button>
            <div className="hint">Example manager: email sk.39648215@gmail.com, employee ID 1301</div>
          </form>
        ) : mode === 'employee-signin' ? (
          <form className="auth-form stack" onSubmit={submitSignIn}>
            <label className="field-label" htmlFor="signin-email">Email</label>
            <input id="signin-email" className="input" type="email" value={signinEmail} onChange={(event) => setSigninEmail(event.target.value)} placeholder="employee@example.com" />

            <label className="field-label" htmlFor="signin-password">Password</label>
            <input id="signin-password" className="input" type="password" value={signinPassword} onChange={(event) => setSigninPassword(event.target.value)} placeholder="Your password" />

            <button className="button primary" type="submit">Sign in</button>
          </form>
        ) : (
          <form className="auth-form stack" onSubmit={submitSignIn}>
            <label className="field-label" htmlFor="manager-email">Manager email</label>
            <input id="manager-email" className="input" type="email" value={signinEmail} onChange={(event) => setSigninEmail(event.target.value)} placeholder="manager@example.com" />

            <label className="field-label" htmlFor="manager-password">Password</label>
            <input id="manager-password" className="input" type="password" value={signinPassword} onChange={(event) => setSigninPassword(event.target.value)} placeholder="Your password" />

            <button className="button primary" type="submit">Manager login</button>
            <div className="hint">Example: sk.39648215@gmail.com | Sachin1301</div>
          </form>
        )}
      </section>
    </div>
  );
}

function App() {
  const [state, setState] = useState<AppState>(loadState);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const authenticatedUser = state.users.find((user) => user.id === state.activeUserId) ?? null;
  const currentUser = authenticatedUser ?? state.users[0];
  const isAuthenticated = Boolean(authenticatedUser);
  const activeUser = currentUser;
  const currentRole = activeUser.role;
  const activeDate = new Date(`${state.simulationDate}T00:00:00`);
  const quarterLabel = getQuarterLabel(activeDate);
  const quarterCode = getQuarterCode(activeDate);
  const goalSettingWindowOpen = activeDate.getMonth() >= 4 && activeDate.getMonth() <= 5;
  const canEditCurrentWindow = quarterLabel !== 'Goal Setting';

  const teamEmployees = currentRole === 'manager' ? state.employees.filter((employee) => employee.managerId === activeUser.id) : [];
  const currentEmployee =
    currentRole === 'manager'
      ? teamEmployees.find((employee) => employee.id === state.selectedEmployeeId) ?? teamEmployees[0] ?? state.employees[0]
      : state.employees.find((employee) => employee.id === state.selectedEmployeeId) ?? state.employees[0];
  const currentSheet = sheetForEmployee(state, currentEmployee.id);

  const sheetSummary = summarizeProgress(currentSheet.goals);
  const completionRows = teamEmployees.map((employee) => {
    const sheet = sheetForEmployee(state, employee.id);
    const hasCheckIn = sheet.checkIns.some((entry) => entry.quarter === quarterLabel);
    return {
      employee: employee.name,
      sheetStatus: sheet.status,
      checkIn: hasCheckIn ? 'Completed' : 'Pending',
      average: summarizeProgress(sheet.goals).average,
    };
  });

  const reportRows = state.goalSheets.flatMap((sheet) => {
    const employee = state.employees.find((item) => item.id === sheet.employeeId);
    return sheet.goals.map((goal) => ({
      employee: employee?.name ?? 'Unknown',
      department: employee?.department ?? 'Unknown',
      sheetStatus: sheet.status,
      goal: goal.title,
      thrustArea: goal.thrustArea,
      uom: goal.uom,
      direction: goal.direction,
      target: goal.target,
      actual: goal.actual ?? '',
      weightage: goal.weightage,
      status: goal.status,
      progress: calculateProgress(goal),
    }));
  });

  function setCurrentUser(nextUserId: string) {
    const nextUser = state.users.find((user) => user.id === nextUserId);
    if (!nextUser) return;

    const fallbackEmployeeId =
      nextUser.role === 'employee'
        ? state.employees.find((employee) => employee.id === nextUser.employeeCode)?.id ?? state.employees[0].id
        : nextUser.role === 'manager'
          ? state.employees.find((employee) => employee.managerId === nextUser.id)?.id ?? state.employees[0].id
          : state.employees[0].id;

    setState((prev) => ({
      ...prev,
      activeUserId: nextUserId,
      selectedEmployeeId: fallbackEmployeeId,
    }));
    setError('');
    setMessage(`${nextUser.name} profile loaded.`);
  }

  function signOut() {
    setState((prev) => ({ ...prev, activeUserId: null }));
    setMessage('Signed out.');
    setError('');
  }

  function updateSelectedEmployee(employeeId: string) {
    setState((prev) => ({ ...prev, selectedEmployeeId: employeeId }));
  }

  function writeAudit(entry: Omit<AuditEntry, 'id' | 'timestamp'>) {
    setState((prev) => ({
      ...prev,
      auditTrail: [createAuditEntry(entry), ...prev.auditTrail].slice(0, 50),
    }));
  }

  function replaceSheet(nextSheet: GoalSheet, shouldAudit = false, note?: string) {
    const previousSheet = state.goalSheets.find((sheet) => sheet.id === nextSheet.id);
    setState((prev) => ({
      ...prev,
      goalSheets: prev.goalSheets.map((sheet) => (sheet.id === nextSheet.id ? nextSheet : sheet)),
    }));

    if (shouldAudit && previousSheet) {
      writeAudit({
        actor: activeUser.name,
        role: currentRole,
        action: 'updated goal sheet',
        entityType: 'sheet',
        entityId: nextSheet.id,
        before: JSON.stringify(previousSheet),
        after: JSON.stringify(nextSheet),
        note,
      });
    }
  }

  function syncSharedGoals(sharedGroupId: string, updater: (goal: GoalItem) => GoalItem) {
    setState((prev) => {
      const nextGoalSheets = prev.goalSheets.map((sheet) => {
        let changed = false;
        const nextGoals = sheet.goals.map((goal) => {
          if (goal.sharedGroupId !== sharedGroupId) return goal;
          changed = true;
          return updater(goal);
        });

        return changed ? { ...sheet, goals: nextGoals } : sheet;
      });

      return { ...prev, goalSheets: nextGoalSheets };
    });

    writeAudit({
      actor: activeUser.name,
      role: currentRole,
      action: 'synced shared goal update',
      entityType: 'goal',
      entityId: sharedGroupId,
      note: 'Shared KPI propagated to all linked goal sheets.',
    });
  }

  function updateGoal(employeeId: string, goalId: string, field: keyof GoalItem, value: string | number | boolean) {
    const sheet = sheetForEmployee(state, employeeId);
    const isLocked = ['Approved', 'Locked'].includes(sheet.status);
    if (isLocked && currentRole !== 'admin') {
      setError('Goal sheet is locked. Ask Admin to unlock it first.');
      return;
    }

    const nextGoals = sheet.goals.map((goal) => {
      if (goal.id !== goalId) return goal;
      return { ...goal, [field]: value } as GoalItem;
    });

    const nextSheet = { ...sheet, goals: nextGoals };
    replaceSheet(nextSheet, isLocked, 'Inline goal edit');

    const changedGoal = nextGoals.find((goal) => goal.id === goalId);
    if (changedGoal?.sharedGroupId && (field === 'actual' || field === 'actualDate' || field === 'status')) {
      syncSharedGoals(changedGoal.sharedGroupId, (goal) => ({ ...goal, [field]: value } as GoalItem));
    }
  }

  function addGoalRow(employeeId: string) {
    const sheet = sheetForEmployee(state, employeeId);
    if (sheet.goals.length >= 8) {
      setError('Maximum of 8 goals reached.');
      return;
    }

    replaceSheet({ ...sheet, goals: [...sheet.goals, goalTemplate()] });
  }

  function removeGoalRow(employeeId: string, goalId: string) {
    const sheet = sheetForEmployee(state, employeeId);
    replaceSheet({ ...sheet, goals: sheet.goals.filter((goal) => goal.id !== goalId) });
  }

  function saveDraft() {
    const sheet = sheetForEmployee(state, currentEmployee.id);
    replaceSheet({ ...sheet, status: 'Draft' });
    setError('');
    setMessage('Draft saved locally.');
  }

  function submitGoals() {
    const sheet = sheetForEmployee(state, currentEmployee.id);
    const validationErrors = validateSheet(sheet.goals);

    if (validationErrors.length > 0) {
      setError(validationErrors.join(' '));
      return;
    }

    const nextSheet = {
      ...sheet,
      status: 'Submitted' as SheetStatus,
      submittedAt: isoNow(),
      returnedAt: undefined,
    };

    replaceSheet(nextSheet, true, 'Submitted for manager approval.');
    writeAudit({
      actor: activeUser.name,
      role: currentRole,
      action: 'submitted goal sheet',
      entityType: 'sheet',
      entityId: nextSheet.id,
      after: JSON.stringify(nextSheet),
    });
    setError('');
    setMessage('Goals submitted to the manager for approval.');
  }

  function returnForRework(sheetId: string) {
    const sheet = state.goalSheets.find((item) => item.id === sheetId);
    if (!sheet) return;

    const nextSheet = { ...sheet, status: 'Returned' as SheetStatus, returnedAt: isoNow() };
    replaceSheet(nextSheet, true, 'Returned by manager for rework.');
    setMessage('Goals returned to the employee for rework.');
  }

  function approveSheet(sheetId: string) {
    const sheet = state.goalSheets.find((item) => item.id === sheetId);
    if (!sheet) return;

    const nextSheet = {
      ...sheet,
      status: 'Approved' as SheetStatus,
      approvedAt: isoNow(),
      lockedAt: isoNow(),
    };

    replaceSheet(nextSheet, true, 'Approved and locked by manager.');
    writeAudit({
      actor: activeUser.name,
      role: currentRole,
      action: 'approved goal sheet',
      entityType: 'sheet',
      entityId: nextSheet.id,
      after: JSON.stringify(nextSheet),
    });
    setMessage('Goal sheet approved and locked.');
  }

  function unlockSheet(sheetId: string) {
    const sheet = state.goalSheets.find((item) => item.id === sheetId);
    if (!sheet) return;

    const nextSheet = { ...sheet, status: 'Returned' as SheetStatus, lockedAt: undefined, unlockReason: 'Unblocked by Admin' };
    replaceSheet(nextSheet, true, 'Admin unlocked the sheet.');
    writeAudit({
      actor: activeUser.name,
      role: currentRole,
      action: 'unlocked goal sheet',
      entityType: 'sheet',
      entityId: nextSheet.id,
      after: JSON.stringify(nextSheet),
      note: 'Admin intervention for post-lock edits.',
    });
    setMessage('Sheet unlocked for rework.');
  }

  function updateCheckInComment(employeeId: string, comment: string) {
    const sheet = sheetForEmployee(state, employeeId);
    const quarter = quarterLabel;
    const existing = sheet.checkIns.find((record) => record.quarter === quarter);
    const nextCheckIn = {
      id: existing?.id ?? uid('checkin'),
      quarter,
      comment,
      updatedAt: isoNow(),
      updatedBy: activeUser.name,
    };

    const nextSheet = existing
      ? { ...sheet, checkIns: sheet.checkIns.map((record) => (record.quarter === quarter ? nextCheckIn : record)) }
      : { ...sheet, checkIns: [...sheet.checkIns, nextCheckIn] };

    replaceSheet(nextSheet, true, 'Check-in comment captured.');
    writeAudit({
      actor: activeUser.name,
      role: currentRole,
      action: existing ? 'updated check-in comment' : 'added check-in comment',
      entityType: 'check-in',
      entityId: nextCheckIn.id,
      after: JSON.stringify(nextCheckIn),
    });
    setMessage('Check-in comment saved.');
  }

  function updateQuarterlyActual(employeeId: string, goalId: string, actual: string, actualDate: string, status: GoalStatus) {
    if (!canEditCurrentWindow) {
      setError('Achievement capture is closed for the selected date. Adjust the simulation date from Admin.');
      return;
    }

    updateGoal(employeeId, goalId, 'actual', actual);
    updateGoal(employeeId, goalId, 'actualDate', actualDate);
    updateGoal(employeeId, goalId, 'status', status);
  }

  function pushSharedKpi(formData: FormData) {
    const title = String(formData.get('shared-title') ?? '').trim();
    const target = String(formData.get('shared-target') ?? '').trim();
    const weightage = Number(formData.get('shared-weightage') ?? '20');
    const direction = String(formData.get('shared-direction') ?? 'Min') as PerformanceDirection;
    const uom = String(formData.get('shared-uom') ?? 'Percent') as UomType;
    const employeeIds = Array.from(formData.getAll('shared-employees')).map(String);

    if (!title || !target || employeeIds.length === 0) {
      setError('Provide a title, target, and at least one recipient.');
      return;
    }

    const sharedGroupId = `shared-${state.sharedGoalCounter}`;
    const sharedGoal: GoalItem = {
      id: uid('goal'),
      thrustArea: 'Shared KPI',
      title,
      description: 'Departmental KPI pushed by Admin or Manager.',
      uom,
      direction,
      target,
      weightage,
      status: 'Not Started',
      actual: '',
      sharedGroupId,
      sharedReadOnly: true,
    };

    const nextSheets = state.goalSheets.map((sheet) => {
      if (!employeeIds.includes(sheet.employeeId)) return sheet;
      if (sheet.goals.length >= 8) return sheet;
      return { ...sheet, goals: [...sheet.goals.filter((goal) => goal.sharedGroupId !== sharedGroupId), sharedGoal] };
    });

    setState((prev) => ({
      ...prev,
      sharedGoalCounter: prev.sharedGoalCounter + 1,
      goalSheets: nextSheets,
    }));

    writeAudit({
      actor: activeUser.name,
      role: currentRole,
      action: 'pushed shared KPI',
      entityType: 'goal',
      entityId: sharedGroupId,
      after: JSON.stringify(sharedGoal),
      note: `Recipients: ${employeeIds.join(', ')}`,
    });
    setError('');
    setMessage('Shared KPI pushed to selected employees.');
  }

  function exportReportCsv() {
    const csv = toCsv(reportRows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `atomquest-achievement-report-${state.simulationDate}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);

    writeAudit({
      actor: activeUser.name,
      role: currentRole,
      action: 'exported achievement report',
      entityType: 'report',
      entityId: state.simulationDate,
      note: 'CSV export generated from current dashboard data.',
    });
    setMessage('CSV export started.');
  }

  const approvalErrors = validateSheet(currentSheet.goals);
  const activeWindowText = `${quarterLabel} (${quarterCode})`;

  if (!isAuthenticated) {
    return (
      <AuthScreen
        onSignIn={(email, password) => {
          const matchedUser = state.users.find((user) => user.email.toLowerCase() === email.toLowerCase() && user.password === password);
          if (!matchedUser) return 'Invalid email or password.';

          const selectedEmployeeId =
            matchedUser.role === 'employee'
              ? state.employees.find((employee) => employee.id === matchedUser.employeeCode)?.id ?? state.selectedEmployeeId
              : matchedUser.role === 'manager'
                ? state.employees.find((employee) => employee.managerId === matchedUser.id)?.id ?? state.selectedEmployeeId
                : state.selectedEmployeeId;

          setState((prev) => ({
            ...prev,
            activeUserId: matchedUser.id,
            selectedEmployeeId,
          }));
          setError('');
          setMessage(`Signed in as ${matchedUser.name}.`);
          return '';
        }}
        onSignUp={(name, dob, email, password, managerEmployeeCode) => {
          if (!name || !dob || !email || !password || !managerEmployeeCode) return 'Fill in all employee sign-up fields.';
          if (state.users.some((user) => user.email.toLowerCase() === email.toLowerCase())) return 'This email is already registered.';

          const managerUser = state.users.find((user) => user.role === 'manager' && user.employeeCode === managerEmployeeCode);
          if (!managerUser) return 'Manager employee ID is not valid.';

          const { user: newUser, employee: newEmployee, goalSheet: newSheet } = createEmployeeSignupRecords({
            name,
            dob,
            email,
            password,
            managerId: managerUser.id,
            cycleYear: 2026,
          });

          setState((prev) => ({
            ...prev,
            users: [...prev.users, newUser],
            employees: [...prev.employees, newEmployee],
            goalSheets: [...prev.goalSheets, newSheet],
            selectedEmployeeId: newEmployee.id,
          }));

          setError('');
          setMessage('Employee account created. Please sign in with the new credentials.');
          return '';
        }}
      />
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Atomquest Hackathon 1.0</p>
          <h1>Goal Setting & Tracking Portal</h1>
          <p className="sidebar-copy">
            Employee goals, manager approvals, quarterly check-ins, shared KPI sync, reporting, and audit.
          </p>
        </div>

        {currentRole === 'manager' && (
          <div className="panel stack">
            <label className="field-label" htmlFor="user-switch">
              Active role
            </label>
            <select id="user-switch" className="input" value={currentUser.id} onChange={(event) => setCurrentUser(event.target.value)}>
              {state.users.map((user) => (
                <option key={user.id} value={user.id}>
                  {roleLabel(user.role)} - {user.name}
                </option>
              ))}
            </select>

            <label className="field-label" htmlFor="date-switch">
              Simulation date
            </label>
            <input
              id="date-switch"
              className="input"
              type="date"
              value={state.simulationDate}
              onChange={(event) => setState((prev) => ({ ...prev, simulationDate: event.target.value }))}
            />

            <div className="status-pill">Current window: {activeWindowText}</div>
            <div className="muted">Active user: {activeUser.name}</div>
          </div>
        )}

        <div className="panel stack">
          <div className="metric-row">
            <div>
              <div className="metric-value">{state.goalSheets.length}</div>
              <div className="metric-label">Goal sheets</div>
            </div>
            <div>
              <div className="metric-value">{state.auditTrail.length}</div>
              <div className="metric-label">Audit events</div>
            </div>
          </div>
          <div className="metric-row">
            <div>
              <div className="metric-value">{reportRows.length}</div>
              <div className="metric-label">Goals in report</div>
            </div>
            <div>
              <div className="metric-value">{teamEmployees.length}</div>
              <div className="metric-label">Team members</div>
            </div>
          </div>
        </div>

        <div className="panel stack">
          <h3>Quick Actions</h3>
          <button className="button secondary" onClick={() => exportReportCsv()}>
            Export achievement CSV
          </button>
          <button className="button secondary" onClick={() => setState(createSeedState())}>
            Reset demo data
          </button>
          <button className="button secondary" onClick={signOut}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="content">
        <header className="hero panel">
          <div>
            <p className="eyebrow">{roleLabel(currentRole)} workspace</p>
            <h2>{currentRole === 'employee' ? `Hi ${activeUser.name}` : activeUser.name}</h2>
            <p>
              The portal is aligned to the {activeWindowText} window and persists changes locally for the demo.
            </p>
            <div className="hero-actions">
              <button className="button secondary" onClick={signOut} type="button">
                Sign out
              </button>
            </div>
          </div>
          <div className="hero-grid">
            <div>
              <span>Employee</span>
              <strong>{state.employees.find((employee) => employee.id === currentEmployee.id)?.name ?? 'Select employee'}</strong>
            </div>
            <div>
              <span>Sheet status</span>
              <strong>{currentSheet.status}</strong>
            </div>
            <div>
              <span>Avg progress</span>
              <strong>{sheetSummary.average}%</strong>
            </div>
            <div>
              <span>Window open</span>
              <strong>Yes</strong>
            </div>
          </div>
        </header>

        {(message || error) && <div className={`banner ${error ? 'danger' : 'success'}`}>{error || message}</div>}

        <section className="panel stack">
          <div className="section-header">
            <div>
              <p className="eyebrow">Cycle overview</p>
              <h3>Quarterly state and validation</h3>
            </div>
            <div className={`status-pill ${statusTone(currentSheet.status)}`}>{currentSheet.status}</div>
          </div>
          <div className="cards-grid four">
            <div className="stat-card">
              <span>Completed goals</span>
              <strong>{sheetSummary.completed}</strong>
            </div>
            <div className="stat-card">
              <span>On track</span>
              <strong>{sheetSummary.onTrack}</strong>
            </div>
            <div className="stat-card">
              <span>Not started</span>
              <strong>{sheetSummary.notStarted}</strong>
            </div>
            <div className="stat-card">
              <span>Validation</span>
              <strong>{approvalErrors.length === 0 ? 'Ready' : 'Review'}</strong>
            </div>
          </div>
          <div className="notice-list">
            {approvalErrors.length > 0 ? approvalErrors.map((item) => <div key={item}>- {item}</div>) : <div>- Goal sheet satisfies the BRD weightage rules.</div>}
          </div>
        </section>

        {currentRole === 'employee' && (
          <EmployeePanel
            state={state}
            currentEmployee={currentEmployee}
            currentSheet={currentSheet}
            quarterLabel={quarterLabel}
            goalSettingWindowOpen={goalSettingWindowOpen}
            canEditCurrentWindow={canEditCurrentWindow}
            setSelectedEmployee={updateSelectedEmployee}
            updateGoal={updateGoal}
            addGoalRow={addGoalRow}
            removeGoalRow={removeGoalRow}
            saveDraft={saveDraft}
            submitGoals={submitGoals}
            updateQuarterlyActual={updateQuarterlyActual}
            updateCheckInComment={updateCheckInComment}
          />
        )}

        {currentRole === 'manager' && (
          <ManagerPanel
            state={state}
            teamEmployees={teamEmployees}
            currentEmployee={currentEmployee}
            currentSheet={currentSheet}
            quarterLabel={quarterLabel}
            updateSelectedEmployee={updateSelectedEmployee}
            updateGoal={updateGoal}
            approveSheet={approveSheet}
            returnForRework={returnForRework}
            updateCheckInComment={updateCheckInComment}
          />
        )}

        {currentRole === 'admin' && (
          <AdminPanel
            state={state}
            currentSheet={currentSheet}
            currentEmployee={currentEmployee}
            quarterLabel={quarterLabel}
            teamEmployees={teamEmployees}
            completionRows={completionRows}
            reportRows={reportRows}
            updateSelectedEmployee={updateSelectedEmployee}
            pushSharedKpi={pushSharedKpi}
            unlockSheet={unlockSheet}
            exportReportCsv={exportReportCsv}
          />
        )}

        <section className="panel stack">
          <div className="section-header">
            <div>
              <p className="eyebrow">Audit trail</p>
              <h3>Change history after lock</h3>
            </div>
            <div className="muted">Captured entries are kept locally in the browser.</div>
          </div>
          <div className="audit-list">
            {state.auditTrail.length === 0 ? (
              <div className="empty">No audit entries yet.</div>
            ) : (
              state.auditTrail.map((entry) => (
                <div className="audit-item" key={entry.id}>
                  <div>
                    <strong>{entry.action}</strong>
                    <span>
                      {entry.actor} - {entry.role}
                    </span>
                  </div>
                  <div>
                    <span>{formatDateTime(entry.timestamp)}</span>
                    {entry.note ? <span>{entry.note}</span> : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

type EmployeePanelProps = {
  state: AppState;
  currentEmployee: EmployeeProfile;
  currentSheet: GoalSheet;
  quarterLabel: string;
  goalSettingWindowOpen: boolean;
  canEditCurrentWindow: boolean;
  setSelectedEmployee: (employeeId: string) => void;
  updateGoal: (employeeId: string, goalId: string, field: keyof GoalItem, value: string | number | boolean) => void;
  addGoalRow: (employeeId: string) => void;
  removeGoalRow: (employeeId: string, goalId: string) => void;
  saveDraft: () => void;
  submitGoals: () => void;
  updateQuarterlyActual: (employeeId: string, goalId: string, actual: string, actualDate: string, status: GoalStatus) => void;
  updateCheckInComment: (employeeId: string, comment: string) => void;
};

type ManagerPanelProps = {
  state: AppState;
  teamEmployees: EmployeeProfile[];
  currentEmployee: EmployeeProfile;
  currentSheet: GoalSheet;
  quarterLabel: string;
  updateSelectedEmployee: (employeeId: string) => void;
  updateGoal: (employeeId: string, goalId: string, field: keyof GoalItem, value: string | number | boolean) => void;
  approveSheet: (sheetId: string) => void;
  returnForRework: (sheetId: string) => void;
  updateCheckInComment: (employeeId: string, comment: string) => void;
};

type AdminPanelProps = {
  state: AppState;
  currentSheet: GoalSheet;
  currentEmployee: EmployeeProfile;
  quarterLabel: string;
  teamEmployees: EmployeeProfile[];
  completionRows: Array<{ employee: string; sheetStatus: string; checkIn: string; average: number }>;
  reportRows: Array<Record<string, string | number | undefined>>;
  updateSelectedEmployee: (employeeId: string) => void;
  pushSharedKpi: (formData: FormData) => void;
  unlockSheet: (sheetId: string) => void;
  exportReportCsv: () => void;
};

function GoalTable({
  goals,
  employeeId,
  updateGoal,
  removeGoalRow,
  readOnly,
  allowRemove = true,
}: {
  goals: GoalItem[];
  employeeId: string;
  updateGoal: (employeeId: string, goalId: string, field: keyof GoalItem, value: string | number | boolean) => void;
  removeGoalRow: (employeeId: string, goalId: string) => void;
  readOnly?: boolean;
  allowRemove?: boolean;
}) {
  return (
    <div className="goal-table">
      {goals.map((goal) => (
        <div className="goal-row" key={goal.id}>
          <input
            className="input"
            value={goal.thrustArea}
            disabled={readOnly || goal.sharedReadOnly}
            onChange={(event) => updateGoal(employeeId, goal.id, 'thrustArea', event.target.value)}
            placeholder="Thrust area"
          />
          <input
            className="input"
            value={goal.title}
            disabled={readOnly || goal.sharedReadOnly}
            onChange={(event) => updateGoal(employeeId, goal.id, 'title', event.target.value)}
            placeholder="Goal title"
          />
          <textarea
            className="input textarea"
            value={goal.description}
            disabled={readOnly || goal.sharedReadOnly}
            onChange={(event) => updateGoal(employeeId, goal.id, 'description', event.target.value)}
            placeholder="Goal description"
          />
          <div className="row-two">
            <select
              className="input"
              value={goal.uom}
              disabled={readOnly || goal.sharedReadOnly}
              onChange={(event) => updateGoal(employeeId, goal.id, 'uom', event.target.value)}
            >
              <option value="Numeric">Numeric</option>
              <option value="Percent">%</option>
              <option value="Timeline">Timeline</option>
              <option value="Zero">Zero</option>
            </select>
            <select
              className="input"
              value={goal.direction}
              disabled={readOnly || goal.sharedReadOnly || goal.uom === 'Timeline' || goal.uom === 'Zero'}
              onChange={(event) => updateGoal(employeeId, goal.id, 'direction', event.target.value)}
            >
              {directionOptions.map((direction) => (
                <option key={direction} value={direction}>
                  {directionLabel(direction)}
                </option>
              ))}
            </select>
          </div>
          <div className="row-two">
            <input
              className="input"
              value={goal.target}
              disabled={readOnly || goal.sharedReadOnly}
              onChange={(event) => updateGoal(employeeId, goal.id, 'target', event.target.value)}
              placeholder="Target"
            />
            <input
              className="input"
              type="number"
              value={goal.weightage}
              disabled={readOnly}
              min={10}
              max={100}
              onChange={(event) => updateGoal(employeeId, goal.id, 'weightage', Number(event.target.value))}
              placeholder="Weightage"
            />
          </div>
          <div className="row-two">
            <input
              className="input"
              value={goal.actual ?? ''}
              disabled={readOnly && goal.status !== 'Not Started'}
              onChange={(event) => updateGoal(employeeId, goal.id, 'actual', event.target.value)}
              placeholder="Actual"
            />
            <input
              className="input"
              type="date"
              value={toDateInputValue(goal.targetDate)}
              disabled={readOnly || goal.uom !== 'Timeline'}
              onChange={(event) => updateGoal(employeeId, goal.id, 'targetDate', event.target.value)}
              placeholder="Target date"
            />
          </div>
          <div className="row-two">
            <input
              className="input"
              type="date"
              value={toDateInputValue(goal.actualDate)}
              disabled={readOnly || goal.uom !== 'Timeline'}
              onChange={(event) => updateGoal(employeeId, goal.id, 'actualDate', event.target.value)}
              placeholder="Actual date"
            />
            <select
              className="input"
              value={goal.status}
              disabled={readOnly && goal.status !== 'Not Started'}
              onChange={(event) => updateGoal(employeeId, goal.id, 'status', event.target.value)}
            >
              {goalStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div className="goal-footer">
            <span>Progress: {calculateProgress(goal)}%</span>
            <span>{goal.sharedReadOnly ? 'Shared KPI' : 'Local goal'}</span>
            {!readOnly && allowRemove && !goal.sharedReadOnly ? (
              <button className="button ghost" onClick={() => removeGoalRow(employeeId, goal.id)}>
                Remove
              </button>
            ) : (
              <span>{directionLabel(goal.direction)}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmployeePanel({
  state,
  currentEmployee,
  currentSheet,
  quarterLabel,
  goalSettingWindowOpen,
  canEditCurrentWindow,
  setSelectedEmployee,
  updateGoal,
  addGoalRow,
  removeGoalRow,
  saveDraft,
  submitGoals,
  updateQuarterlyActual,
  updateCheckInComment,
}: EmployeePanelProps) {
  const canEditSheet = (currentSheet.status === 'Draft' || currentSheet.status === 'Returned') && goalSettingWindowOpen;
  const checkInComment = currentSheet.checkIns.find((record) => record.quarter === quarterLabel)?.comment ?? '';

  return (
    <section className="panel stack">
      <div className="section-header">
        <div>
          <p className="eyebrow">Employee journey</p>
          <h3>Draft, submit, and update quarterly achievement</h3>
        </div>
        <select className="input narrow" value={currentEmployee.id} onChange={(event) => setSelectedEmployee(event.target.value)}>
          {state.employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.name}
            </option>
          ))}
        </select>
      </div>

      <div className="cards-grid three">
        <div className="stat-card">
          <span>Goals allowed</span>
          <strong>{currentSheet.goals.length}/8</strong>
        </div>
        <div className="stat-card">
          <span>Total weightage</span>
          <strong>{currentSheet.goals.reduce((sum, goal) => sum + goal.weightage, 0)}%</strong>
        </div>
        <div className="stat-card">
          <span>Quarter status</span>
          <strong>{quarterLabel}</strong>
        </div>
      </div>

      <GoalTable
        goals={currentSheet.goals}
        employeeId={currentEmployee.id}
        updateGoal={updateGoal}
        removeGoalRow={removeGoalRow}
        readOnly={!canEditSheet}
      />

      <div className="button-row">
        <button className="button secondary" onClick={saveDraft} disabled={!canEditSheet}>
          Save draft
        </button>
        <button className="button primary" onClick={submitGoals} disabled={!canEditSheet}>
          Submit for approval
        </button>
        <button className="button secondary" onClick={() => addGoalRow(currentEmployee.id)} disabled={!canEditSheet}>
          Add goal
        </button>
      </div>

      <div className="split-grid">
        <div>
          <div className="section-header">
            <div>
              <p className="eyebrow">Quarterly check-in</p>
              <h4>{quarterLabel}</h4>
            </div>
            <div className={`status-pill ${canEditCurrentWindow ? 'success' : 'neutral'}`}>
              {canEditCurrentWindow ? 'Window open' : 'Window closed'}
            </div>
          </div>
          <div className="checkin-grid">
            {currentSheet.goals.map((goal) => (
              <div className="checkin-card" key={goal.id}>
                <strong>{goal.title || 'Untitled goal'}</strong>
                <div className="muted">Planned target: {goal.target || goal.targetDate || 'Pending'}</div>
                <div className="muted">Achievement score: {calculateProgress(goal)}%</div>
                <div className="row-two">
                  <input
                    className="input"
                    value={goal.actual ?? ''}
                    onChange={(event) => updateQuarterlyActual(currentEmployee.id, goal.id, event.target.value, goal.actualDate ?? '', goal.status)}
                    disabled={!canEditCurrentWindow}
                    placeholder="Actual achievement"
                  />
                  <select
                    className="input"
                    value={goal.status}
                    onChange={(event) => updateQuarterlyActual(currentEmployee.id, goal.id, goal.actual ?? '', goal.actualDate ?? '', event.target.value as GoalStatus)}
                    disabled={!canEditCurrentWindow}
                  >
                    {goalStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  className="input"
                  type="date"
                  value={toDateInputValue(goal.actualDate)}
                  onChange={(event) => updateQuarterlyActual(currentEmployee.id, goal.id, goal.actual ?? '', event.target.value, goal.status)}
                  disabled={!canEditCurrentWindow || goal.uom !== 'Timeline'}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="panel nested">
          <div className="section-header">
            <div>
              <p className="eyebrow">Employee note</p>
              <h4>Quarter comment</h4>
            </div>
          </div>
          <textarea
            className="input textarea tall"
            value={checkInComment}
            onChange={(event) => updateCheckInComment(currentEmployee.id, event.target.value)}
            placeholder="Summarize your quarter update here"
          />
          <div className="muted">Employee comments are shared with the manager during the quarterly check-in discussion.</div>
          <div className="checkin-history">
            {currentSheet.checkIns.length === 0 ? (
              <div className="empty">No check-ins captured yet.</div>
            ) : (
              currentSheet.checkIns.map((record) => (
                <div className="checkin-history-item" key={record.id}>
                  <strong>{record.quarter}</strong>
                  <span>{record.comment}</span>
                  <span>
                    Updated by {record.updatedBy} on {formatDateTime(record.updatedAt)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ManagerPanel({
  state,
  teamEmployees,
  currentEmployee,
  currentSheet,
  quarterLabel,
  updateSelectedEmployee,
  updateGoal,
  approveSheet,
  returnForRework,
  updateCheckInComment,
}: ManagerPanelProps) {
  const checkInComment = currentSheet.checkIns.find((record) => record.quarter === quarterLabel)?.comment ?? '';
  const sheetSummary = summarizeProgress(currentSheet.goals);

  return (
    <section className="panel stack">
      <div className="section-header">
        <div>
          <p className="eyebrow">Manager journey</p>
          <h3>Review, edit inline, approve, or return goals</h3>
        </div>
        <select className="input narrow" value={currentEmployee.id} onChange={(event) => updateSelectedEmployee(event.target.value)}>
          {teamEmployees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.name}
            </option>
          ))}
        </select>
      </div>

      <div className="cards-grid three">
        {teamEmployees.map((employee) => {
          const sheet = state.goalSheets.find((item) => item.employeeId === employee.id) ?? currentSheet;
          return (
            <button key={employee.id} className="stat-card button-card" onClick={() => updateSelectedEmployee(employee.id)}>
              <span>{employee.name}</span>
              <strong>{sheet.status}</strong>
              <small>{summarizeProgress(sheet.goals).average}% average score</small>
            </button>
          );
        })}
      </div>

      <div className="panel nested progress-report">
        <div className="section-header">
          <div>
            <p className="eyebrow">Employee Progress Report</p>
            <h3>{currentEmployee.name}</h3>
          </div>
          <div className={`status-pill ${statusTone(currentSheet.status)}`}>{currentSheet.status}</div>
        </div>
        <div className="cards-grid four">
          <div className="stat-card">
            <span>Total Goals</span>
            <strong>{currentSheet.goals.length}</strong>
          </div>
          <div className="stat-card">
            <span>Completed</span>
            <strong>{sheetSummary.completed}</strong>
          </div>
          <div className="stat-card">
            <span>On Track</span>
            <strong>{sheetSummary.onTrack}</strong>
          </div>
          <div className="stat-card">
            <span>Average Progress</span>
            <strong>{sheetSummary.average}%</strong>
          </div>
        </div>
        <div className="progress-details">
          <div className="detail-row">
            <span>Department</span>
            <strong>{currentEmployee.department}</strong>
          </div>
          <div className="detail-row">
            <span>Title</span>
            <strong>{currentEmployee.title}</strong>
          </div>
          <div className="detail-row">
            <span>Sheet Submitted</span>
            <strong>{currentSheet.submittedAt ? 'Yes' : 'No'}</strong>
          </div>
          <div className="detail-row">
            <span>Approved Date</span>
            <strong>
              {currentSheet.approvedAt?.trim() 
                ? formatDate(currentSheet.approvedAt.split('T')[0]) 
                : 'Pending'}
            </strong>
          </div>
        </div>
      </div>

      <GoalTable
        goals={currentSheet.goals}
        employeeId={currentEmployee.id}
        updateGoal={updateGoal}
        removeGoalRow={() => undefined}
        readOnly={currentSheet.status === 'Approved' || currentSheet.status === 'Locked'}
        allowRemove={false}
      />

      <div className="button-row">
        <button className="button secondary" onClick={() => returnForRework(currentSheet.id)}>
          Return for rework
        </button>
        <button className="button primary" onClick={() => approveSheet(currentSheet.id)}>
          Approve and lock
        </button>
      </div>

      <div className="split-grid">
        <div className="panel nested">
          <div className="section-header">
            <div>
              <p className="eyebrow">Manager check-in</p>
              <h4>Planned vs. actual</h4>
            </div>
          </div>
          <div className="checkin-grid">
            {currentSheet.goals.map((goal) => (
              <div className="checkin-card" key={goal.id}>
                <strong>{goal.title || 'Untitled goal'}</strong>
                <div className="muted">Planned target: {goal.target || goal.targetDate || 'Pending'}</div>
                <div className="muted">Actual: {goal.actual || 'Not captured'}</div>
                <div className="muted">Score: {calculateProgress(goal)}%</div>
                <div className="muted">Status: {goal.status}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel nested">
          <div className="section-header">
            <div>
              <p className="eyebrow">Check-in comment</p>
              <h4>Structured feedback</h4>
            </div>
          </div>
          <textarea
            className="input textarea tall"
            value={checkInComment}
            onChange={(event) => updateCheckInComment(currentEmployee.id, event.target.value)}
            placeholder="Write the quarterly discussion note"
          />
          <div className="muted">Manager notes are attached to the active quarter and available to HR for governance.</div>
          <div className="manager-roster">
            {teamEmployees.map((employee) => {
              const sheet = state.goalSheets.find((item) => item.employeeId === employee.id);
              return (
                <div className="manager-roster-item" key={employee.id}>
                  <strong>{employee.name}</strong>
                  <span>{employee.title}</span>
                  <span>{sheet?.checkIns.some((record) => record.quarter === quarterLabel) ? 'Check-in complete' : 'Awaiting check-in'}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function AdminPanel({
  state,
  currentSheet,
  currentEmployee,
  teamEmployees,
  completionRows,
  reportRows,
  updateSelectedEmployee,
  pushSharedKpi,
  unlockSheet,
  exportReportCsv,
}: AdminPanelProps) {
  const selectedRecipients = teamEmployees.map((employee) => employee.id);

  return (
    <section className="panel stack">
      <div className="section-header">
        <div>
          <p className="eyebrow">Admin / HR journey</p>
          <h3>Cycle controls, shared KPIs, reporting, and unlock actions</h3>
        </div>
        <div className="button-row compact">
          <button className="button secondary" onClick={exportReportCsv}>
            Export report
          </button>
          <button className="button secondary" onClick={() => unlockSheet(currentSheet.id)}>
            Unlock selected sheet
          </button>
        </div>
      </div>

      <div className="cards-grid three">
        <div className="stat-card">
          <span>Active cycle year</span>
          <strong>{state.goalSheets[0]?.cycleYear ?? 2026}</strong>
        </div>
        <div className="stat-card">
          <span>Selected employee</span>
          <strong>{currentEmployee.name}</strong>
        </div>
        <div className="stat-card">
          <span>Report rows</span>
          <strong>{reportRows.length}</strong>
        </div>
      </div>

      <div className="split-grid">
        <form
          className="panel nested"
          onSubmit={(event) => {
            event.preventDefault();
            pushSharedKpi(new FormData(event.currentTarget));
          }}
        >
          <div className="section-header">
            <div>
              <p className="eyebrow">Shared goals</p>
              <h4>Push a departmental KPI</h4>
            </div>
          </div>
          <input className="input" name="shared-title" placeholder="Shared KPI title" defaultValue="Quarterly compliance audit completion" />
          <textarea className="input textarea" name="shared-description" placeholder="Optional context" defaultValue="Shared KPI pushed across multiple employees." />
          <div className="row-two">
            <select className="input" name="shared-uom" defaultValue="Percent">
              {uomOptions.map((uom) => (
                <option key={uom} value={uom}>
                  {uom}
                </option>
              ))}
            </select>
            <select className="input" name="shared-direction" defaultValue="Min">
              {directionOptions.map((direction) => (
                <option key={direction} value={direction}>
                  {directionLabel(direction)}
                </option>
              ))}
            </select>
          </div>
          <div className="row-two">
            <input className="input" name="shared-target" placeholder="Target value" defaultValue="95" />
            <input className="input" type="number" name="shared-weightage" min={10} max={100} defaultValue={25} />
          </div>
          <div className="recipient-grid">
            {teamEmployees.map((employee) => (
              <label key={employee.id} className="recipient-pill">
                <input type="checkbox" name="shared-employees" value={employee.id} defaultChecked={selectedRecipients.includes(employee.id)} />
                <span>{employee.name}</span>
              </label>
            ))}
          </div>
          <button className="button primary" type="submit">
            Push shared KPI
          </button>
        </form>

        <div className="panel nested">
          <div className="section-header">
            <div>
              <p className="eyebrow">Completion dashboard</p>
              <h4>Quarterly status by employee</h4>
            </div>
          </div>
          <div className="completion-list">
            {completionRows.map((row) => (
              <div className="completion-row" key={row.employee}>
                <strong>{row.employee}</strong>
                <span>{row.sheetStatus}</span>
                <span>Check-in: {row.checkIn}</span>
                <span>{row.average}% average</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel nested">
        <div className="section-header">
          <div>
            <p className="eyebrow">Governance</p>
            <h4>Employee roster and selected sheet actions</h4>
          </div>
        </div>
        <div className="employee-grid">
          {state.employees.map((employee) => {
            const sheet = state.goalSheets.find((item) => item.employeeId === employee.id);
            return (
              <button key={employee.id} className="employee-card button-card" onClick={() => updateSelectedEmployee(employee.id)}>
                <strong>{employee.name}</strong>
                <span>{employee.title}</span>
                <span>{sheet?.status ?? 'Draft'}</span>
              </button>
            );
          })}
        </div>
        <div className="muted">Admin controls the cycle date, resolves exceptions, and can unlock a locked sheet for rework.</div>
      </div>

      <div className="panel nested">
        <div className="section-header">
          <div>
            <p className="eyebrow">Report sample</p>
            <h4>Planned target vs actual achievement</h4>
          </div>
        </div>
        <div className="report-table">
          <div className="report-head">
            <span>Employee</span>
            <span>Goal</span>
            <span>Target</span>
            <span>Actual</span>
            <span>Progress</span>
          </div>
          {reportRows.slice(0, 8).map((row, index) => (
            <div className="report-row" key={`${String(row.employee)}-${index}`}>
              <span>{row.employee}</span>
              <span>{row.goal}</span>
              <span>{row.target}</span>
              <span>{row.actual}</span>
              <span>{row.progress}%</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default App;