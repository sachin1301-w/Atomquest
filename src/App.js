import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { createEmployeeSignupRecords, createSeedState } from './data';
import { calculateProgress, createAuditEntry, directionLabel, formatDate, formatDateTime, getQuarterCode, getQuarterLabel, isoNow, statusTone, summarizeProgress, toCsv, toDateInputValue, uid, validateSheet, } from './utils';
const STORAGE_KEY = 'atomquest.goal.portal.state.v1';
const thrustAreas = ['Revenue Growth', 'Operational Excellence', 'Service Quality', 'Risk & Safety', 'Shared KPI'];
const uomOptions = ['Numeric', 'Percent', 'Timeline', 'Zero'];
const directionOptions = ['Min', 'Max'];
const goalStatuses = ['Not Started', 'On Track', 'Completed'];
function loadState() {
    if (typeof window === 'undefined')
        return createSeedState();
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved)
        return createSeedState();
    try {
        const seed = createSeedState();
        const parsed = JSON.parse(saved);
        const users = (parsed.users?.length ? parsed.users : seed.users).map((user) => {
            const seedUser = seed.users.find((item) => item.id === user.id) ?? seed.users.find((item) => item.role === user.role && item.name === user.name);
            return {
                ...(seedUser ?? {}),
                ...user,
                email: user.email ?? seedUser?.email ?? '',
                password: user.password ?? seedUser?.password ?? '',
                employeeCode: user.employeeCode ?? seedUser?.employeeCode,
            };
        });
        const employees = (parsed.employees?.length ? parsed.employees : seed.employees).map((employee) => ({
            ...employee,
            managerId: employee.managerId === 'mgr-maya' ? 'user-maya' : employee.managerId ?? 'user-maya',
        }));
        return {
            ...seed,
            ...parsed,
            users,
            employees,
            activeUserId: null,
        };
    }
    catch {
        return createSeedState();
    }
}
function goalTemplate() {
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
function sheetForEmployee(state, employeeId) {
    const found = state.goalSheets.find((sheet) => sheet.employeeId === employeeId);
    if (found)
        return found;
    return {
        id: uid('sheet'),
        employeeId,
        cycleYear: 2026,
        status: 'Draft',
        goals: [goalTemplate()],
        checkIns: [],
    };
}
function roleLabel(role) {
    return role.charAt(0).toUpperCase() + role.slice(1);
}
function nameFromEmail(email) {
    return email
        .split('@')[0]
        .replace(/[._-]+/g, ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase());
}
function slugFromEmail(email) {
    return email.split('@')[0].replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
}
function AuthScreen({ onSignIn, onSignUp, }) {
    const [mode, setMode] = useState('signup');
    const [signinEmail, setSigninEmail] = useState('');
    const [signinPassword, setSigninPassword] = useState('');
    const [signupName, setSignupName] = useState('');
    const [signupDob, setSignupDob] = useState('');
    const [signupEmail, setSignupEmail] = useState('');
    const [signupPassword, setSignupPassword] = useState('');
    const [signupManagerCode, setSignupManagerCode] = useState('1301');
    const [notice, setNotice] = useState('Create a new employee account or sign in to your existing account. Managers can use the manager login.');
    const [authError, setAuthError] = useState('');
    function submitSignIn(event) {
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
    function submitSignUp(event) {
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
    return (_jsx("div", { className: "auth-shell", children: _jsxs("section", { className: "auth-card panel", children: [_jsxs("div", { className: "auth-header", children: [_jsx("p", { className: "eyebrow", children: "Atomquest Goal Portal" }), _jsx("h1", { children: "Authentication" }), _jsx("p", { children: "Create a new employee account, sign in as an employee, or access the manager login." })] }), _jsxs("div", { className: "auth-tabs", children: [_jsx("button", { className: `auth-tab ${mode === 'signup' ? 'active' : ''}`, onClick: () => setMode('signup'), type: "button", children: "Employee sign up" }), _jsx("button", { className: `auth-tab ${mode === 'employee-signin' ? 'active' : ''}`, onClick: () => setMode('employee-signin'), type: "button", children: "Employee sign in" }), _jsx("button", { className: `auth-tab ${mode === 'manager-login' ? 'active' : ''}`, onClick: () => setMode('manager-login'), type: "button", children: "Manager login" })] }), notice ? _jsx("div", { className: "banner success", children: notice }) : null, authError ? _jsx("div", { className: "banner danger", children: authError }) : null, mode === 'signup' ? (_jsxs("form", { className: "auth-form stack", onSubmit: submitSignUp, children: [_jsx("label", { className: "field-label", htmlFor: "signup-name", children: "Employee Name" }), _jsx("input", { id: "signup-name", className: "input", type: "text", value: signupName, onChange: (event) => setSignupName(event.target.value), placeholder: "John Doe" }), _jsx("label", { className: "field-label", htmlFor: "signup-dob", children: "Date of Birth" }), _jsx("input", { id: "signup-dob", className: "input", type: "date", value: signupDob, onChange: (event) => setSignupDob(event.target.value) }), _jsx("label", { className: "field-label", htmlFor: "signup-email", children: "Employee email" }), _jsx("input", { id: "signup-email", className: "input", type: "email", value: signupEmail, onChange: (event) => setSignupEmail(event.target.value), placeholder: "employee@example.com" }), _jsx("label", { className: "field-label", htmlFor: "signup-password", children: "Set password" }), _jsx("input", { id: "signup-password", className: "input", type: "password", value: signupPassword, onChange: (event) => setSignupPassword(event.target.value), placeholder: "Create a password" }), _jsx("label", { className: "field-label", htmlFor: "signup-manager", children: "Manager employee ID" }), _jsx("input", { id: "signup-manager", className: "input", value: signupManagerCode, onChange: (event) => setSignupManagerCode(event.target.value), placeholder: "1301" }), _jsx("button", { className: "button primary", type: "submit", children: "Create employee account" }), _jsx("div", { className: "hint", children: "Example manager: email sk.39648215@gmail.com, employee ID 1301" })] })) : mode === 'employee-signin' ? (_jsxs("form", { className: "auth-form stack", onSubmit: submitSignIn, children: [_jsx("label", { className: "field-label", htmlFor: "signin-email", children: "Email" }), _jsx("input", { id: "signin-email", className: "input", type: "email", value: signinEmail, onChange: (event) => setSigninEmail(event.target.value), placeholder: "employee@example.com" }), _jsx("label", { className: "field-label", htmlFor: "signin-password", children: "Password" }), _jsx("input", { id: "signin-password", className: "input", type: "password", value: signinPassword, onChange: (event) => setSigninPassword(event.target.value), placeholder: "Your password" }), _jsx("button", { className: "button primary", type: "submit", children: "Sign in" })] })) : (_jsxs("form", { className: "auth-form stack", onSubmit: submitSignIn, children: [_jsx("label", { className: "field-label", htmlFor: "manager-email", children: "Manager email" }), _jsx("input", { id: "manager-email", className: "input", type: "email", value: signinEmail, onChange: (event) => setSigninEmail(event.target.value), placeholder: "manager@example.com" }), _jsx("label", { className: "field-label", htmlFor: "manager-password", children: "Password" }), _jsx("input", { id: "manager-password", className: "input", type: "password", value: signinPassword, onChange: (event) => setSigninPassword(event.target.value), placeholder: "Your password" }), _jsx("button", { className: "button primary", type: "submit", children: "Manager login" }), _jsx("div", { className: "hint", children: "Example: sk.39648215@gmail.com | Sachin1301" })] }))] }) }));
}
function App() {
    const [state, setState] = useState(loadState);
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
    const currentEmployee = currentRole === 'manager'
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
    function setCurrentUser(nextUserId) {
        const nextUser = state.users.find((user) => user.id === nextUserId);
        if (!nextUser)
            return;
        const fallbackEmployeeId = nextUser.role === 'employee'
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
    function updateSelectedEmployee(employeeId) {
        setState((prev) => ({ ...prev, selectedEmployeeId: employeeId }));
    }
    function writeAudit(entry) {
        setState((prev) => ({
            ...prev,
            auditTrail: [createAuditEntry(entry), ...prev.auditTrail].slice(0, 50),
        }));
    }
    function replaceSheet(nextSheet, shouldAudit = false, note) {
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
    function syncSharedGoals(sharedGroupId, updater) {
        setState((prev) => {
            const nextGoalSheets = prev.goalSheets.map((sheet) => {
                let changed = false;
                const nextGoals = sheet.goals.map((goal) => {
                    if (goal.sharedGroupId !== sharedGroupId)
                        return goal;
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
    function updateGoal(employeeId, goalId, field, value) {
        const sheet = sheetForEmployee(state, employeeId);
        const isLocked = ['Approved', 'Locked'].includes(sheet.status);
        if (isLocked && currentRole !== 'admin') {
            setError('Goal sheet is locked. Ask Admin to unlock it first.');
            return;
        }
        const nextGoals = sheet.goals.map((goal) => {
            if (goal.id !== goalId)
                return goal;
            return { ...goal, [field]: value };
        });
        const nextSheet = { ...sheet, goals: nextGoals };
        replaceSheet(nextSheet, isLocked, 'Inline goal edit');
        const changedGoal = nextGoals.find((goal) => goal.id === goalId);
        if (changedGoal?.sharedGroupId && (field === 'actual' || field === 'actualDate' || field === 'status')) {
            syncSharedGoals(changedGoal.sharedGroupId, (goal) => ({ ...goal, [field]: value }));
        }
    }
    function addGoalRow(employeeId) {
        const sheet = sheetForEmployee(state, employeeId);
        if (sheet.goals.length >= 8) {
            setError('Maximum of 8 goals reached.');
            return;
        }
        replaceSheet({ ...sheet, goals: [...sheet.goals, goalTemplate()] });
    }
    function removeGoalRow(employeeId, goalId) {
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
            status: 'Submitted',
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
    function returnForRework(sheetId) {
        const sheet = state.goalSheets.find((item) => item.id === sheetId);
        if (!sheet)
            return;
        const nextSheet = { ...sheet, status: 'Returned', returnedAt: isoNow() };
        replaceSheet(nextSheet, true, 'Returned by manager for rework.');
        setMessage('Goals returned to the employee for rework.');
    }
    function approveSheet(sheetId) {
        const sheet = state.goalSheets.find((item) => item.id === sheetId);
        if (!sheet)
            return;
        const nextSheet = {
            ...sheet,
            status: 'Approved',
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
    function unlockSheet(sheetId) {
        const sheet = state.goalSheets.find((item) => item.id === sheetId);
        if (!sheet)
            return;
        const nextSheet = { ...sheet, status: 'Returned', lockedAt: undefined, unlockReason: 'Unblocked by Admin' };
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
    function updateCheckInComment(employeeId, comment) {
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
    function updateQuarterlyActual(employeeId, goalId, actual, actualDate, status) {
        if (!canEditCurrentWindow) {
            setError('Achievement capture is closed for the selected date. Adjust the simulation date from Admin.');
            return;
        }
        updateGoal(employeeId, goalId, 'actual', actual);
        updateGoal(employeeId, goalId, 'actualDate', actualDate);
        updateGoal(employeeId, goalId, 'status', status);
    }
    function pushSharedKpi(formData) {
        const title = String(formData.get('shared-title') ?? '').trim();
        const target = String(formData.get('shared-target') ?? '').trim();
        const weightage = Number(formData.get('shared-weightage') ?? '20');
        const direction = String(formData.get('shared-direction') ?? 'Min');
        const uom = String(formData.get('shared-uom') ?? 'Percent');
        const employeeIds = Array.from(formData.getAll('shared-employees')).map(String);
        if (!title || !target || employeeIds.length === 0) {
            setError('Provide a title, target, and at least one recipient.');
            return;
        }
        const sharedGroupId = `shared-${state.sharedGoalCounter}`;
        const sharedGoal = {
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
            if (!employeeIds.includes(sheet.employeeId))
                return sheet;
            if (sheet.goals.length >= 8)
                return sheet;
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
        return (_jsx(AuthScreen, { onSignIn: (email, password) => {
                const matchedUser = state.users.find((user) => user.email.toLowerCase() === email.toLowerCase() && user.password === password);
                if (!matchedUser)
                    return 'Invalid email or password.';
                const selectedEmployeeId = matchedUser.role === 'employee'
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
            }, onSignUp: (name, dob, email, password, managerEmployeeCode) => {
                if (!name || !dob || !email || !password || !managerEmployeeCode)
                    return 'Fill in all employee sign-up fields.';
                if (state.users.some((user) => user.email.toLowerCase() === email.toLowerCase()))
                    return 'This email is already registered.';
                const managerUser = state.users.find((user) => user.role === 'manager' && user.employeeCode === managerEmployeeCode);
                if (!managerUser)
                    return 'Manager employee ID is not valid.';
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
            } }));
    }
    return (_jsxs("div", { className: "app-shell", children: [_jsxs("aside", { className: "sidebar", children: [_jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "Atomquest Hackathon 1.0" }), _jsx("h1", { children: "Goal Setting & Tracking Portal" }), _jsx("p", { className: "sidebar-copy", children: "Employee goals, manager approvals, quarterly check-ins, shared KPI sync, reporting, and audit." })] }), currentRole === 'manager' && (_jsxs("div", { className: "panel stack", children: [_jsx("label", { className: "field-label", htmlFor: "user-switch", children: "Active role" }), _jsx("select", { id: "user-switch", className: "input", value: currentUser.id, onChange: (event) => setCurrentUser(event.target.value), children: state.users.map((user) => (_jsxs("option", { value: user.id, children: [roleLabel(user.role), " - ", user.name] }, user.id))) }), _jsx("label", { className: "field-label", htmlFor: "date-switch", children: "Simulation date" }), _jsx("input", { id: "date-switch", className: "input", type: "date", value: state.simulationDate, onChange: (event) => setState((prev) => ({ ...prev, simulationDate: event.target.value })) }), _jsxs("div", { className: "status-pill", children: ["Current window: ", activeWindowText] }), _jsxs("div", { className: "muted", children: ["Active user: ", activeUser.name] })] })), _jsxs("div", { className: "panel stack", children: [_jsxs("div", { className: "metric-row", children: [_jsxs("div", { children: [_jsx("div", { className: "metric-value", children: state.goalSheets.length }), _jsx("div", { className: "metric-label", children: "Goal sheets" })] }), _jsxs("div", { children: [_jsx("div", { className: "metric-value", children: state.auditTrail.length }), _jsx("div", { className: "metric-label", children: "Audit events" })] })] }), _jsxs("div", { className: "metric-row", children: [_jsxs("div", { children: [_jsx("div", { className: "metric-value", children: reportRows.length }), _jsx("div", { className: "metric-label", children: "Goals in report" })] }), _jsxs("div", { children: [_jsx("div", { className: "metric-value", children: teamEmployees.length }), _jsx("div", { className: "metric-label", children: "Team members" })] })] })] }), _jsxs("div", { className: "panel stack", children: [_jsx("h3", { children: "Quick Actions" }), _jsx("button", { className: "button secondary", onClick: () => exportReportCsv(), children: "Export achievement CSV" }), _jsx("button", { className: "button secondary", onClick: () => setState(createSeedState()), children: "Reset demo data" }), _jsx("button", { className: "button secondary", onClick: signOut, children: "Sign out" })] })] }), _jsxs("main", { className: "content", children: [_jsxs("header", { className: "hero panel", children: [_jsxs("div", { children: [_jsxs("p", { className: "eyebrow", children: [roleLabel(currentRole), " workspace"] }), _jsx("h2", { children: currentRole === 'employee' ? `Hi ${activeUser.name}` : activeUser.name }), _jsxs("p", { children: ["The portal is aligned to the ", activeWindowText, " window and persists changes locally for the demo."] }), _jsx("div", { className: "hero-actions", children: _jsx("button", { className: "button secondary", onClick: signOut, type: "button", children: "Sign out" }) })] }), _jsxs("div", { className: "hero-grid", children: [_jsxs("div", { children: [_jsx("span", { children: "Employee" }), _jsx("strong", { children: state.employees.find((employee) => employee.id === currentEmployee.id)?.name ?? 'Select employee' })] }), _jsxs("div", { children: [_jsx("span", { children: "Sheet status" }), _jsx("strong", { children: currentSheet.status })] }), _jsxs("div", { children: [_jsx("span", { children: "Avg progress" }), _jsxs("strong", { children: [sheetSummary.average, "%"] })] }), _jsxs("div", { children: [_jsx("span", { children: "Window open" }), _jsx("strong", { children: "Yes" })] })] })] }), (message || error) && _jsx("div", { className: `banner ${error ? 'danger' : 'success'}`, children: error || message }), _jsxs("section", { className: "panel stack", children: [_jsxs("div", { className: "section-header", children: [_jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "Cycle overview" }), _jsx("h3", { children: "Quarterly state and validation" })] }), _jsx("div", { className: `status-pill ${statusTone(currentSheet.status)}`, children: currentSheet.status })] }), _jsxs("div", { className: "cards-grid four", children: [_jsxs("div", { className: "stat-card", children: [_jsx("span", { children: "Completed goals" }), _jsx("strong", { children: sheetSummary.completed })] }), _jsxs("div", { className: "stat-card", children: [_jsx("span", { children: "On track" }), _jsx("strong", { children: sheetSummary.onTrack })] }), _jsxs("div", { className: "stat-card", children: [_jsx("span", { children: "Not started" }), _jsx("strong", { children: sheetSummary.notStarted })] }), _jsxs("div", { className: "stat-card", children: [_jsx("span", { children: "Validation" }), _jsx("strong", { children: approvalErrors.length === 0 ? 'Ready' : 'Review' })] })] }), _jsx("div", { className: "notice-list", children: approvalErrors.length > 0 ? approvalErrors.map((item) => _jsxs("div", { children: ["- ", item] }, item)) : _jsx("div", { children: "- Goal sheet satisfies the BRD weightage rules." }) })] }), currentRole === 'employee' && (_jsx(EmployeePanel, { state: state, currentEmployee: currentEmployee, currentSheet: currentSheet, quarterLabel: quarterLabel, goalSettingWindowOpen: goalSettingWindowOpen, canEditCurrentWindow: canEditCurrentWindow, setSelectedEmployee: updateSelectedEmployee, updateGoal: updateGoal, addGoalRow: addGoalRow, removeGoalRow: removeGoalRow, saveDraft: saveDraft, submitGoals: submitGoals, updateQuarterlyActual: updateQuarterlyActual, updateCheckInComment: updateCheckInComment })), currentRole === 'manager' && (_jsx(ManagerPanel, { state: state, teamEmployees: teamEmployees, currentEmployee: currentEmployee, currentSheet: currentSheet, quarterLabel: quarterLabel, updateSelectedEmployee: updateSelectedEmployee, updateGoal: updateGoal, approveSheet: approveSheet, returnForRework: returnForRework, updateCheckInComment: updateCheckInComment })), currentRole === 'admin' && (_jsx(AdminPanel, { state: state, currentSheet: currentSheet, currentEmployee: currentEmployee, quarterLabel: quarterLabel, teamEmployees: teamEmployees, completionRows: completionRows, reportRows: reportRows, updateSelectedEmployee: updateSelectedEmployee, pushSharedKpi: pushSharedKpi, unlockSheet: unlockSheet, exportReportCsv: exportReportCsv })), _jsxs("section", { className: "panel stack", children: [_jsxs("div", { className: "section-header", children: [_jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "Audit trail" }), _jsx("h3", { children: "Change history after lock" })] }), _jsx("div", { className: "muted", children: "Captured entries are kept locally in the browser." })] }), _jsx("div", { className: "audit-list", children: state.auditTrail.length === 0 ? (_jsx("div", { className: "empty", children: "No audit entries yet." })) : (state.auditTrail.map((entry) => (_jsxs("div", { className: "audit-item", children: [_jsxs("div", { children: [_jsx("strong", { children: entry.action }), _jsxs("span", { children: [entry.actor, " - ", entry.role] })] }), _jsxs("div", { children: [_jsx("span", { children: formatDateTime(entry.timestamp) }), entry.note ? _jsx("span", { children: entry.note }) : null] })] }, entry.id)))) })] })] })] }));
}
function GoalTable({ goals, employeeId, updateGoal, removeGoalRow, readOnly, allowRemove = true, }) {
    return (_jsx("div", { className: "goal-table", children: goals.map((goal) => (_jsxs("div", { className: "goal-row", children: [_jsx("input", { className: "input", value: goal.thrustArea, disabled: readOnly || goal.sharedReadOnly, onChange: (event) => updateGoal(employeeId, goal.id, 'thrustArea', event.target.value), placeholder: "Thrust area" }), _jsx("input", { className: "input", value: goal.title, disabled: readOnly || goal.sharedReadOnly, onChange: (event) => updateGoal(employeeId, goal.id, 'title', event.target.value), placeholder: "Goal title" }), _jsx("textarea", { className: "input textarea", value: goal.description, disabled: readOnly || goal.sharedReadOnly, onChange: (event) => updateGoal(employeeId, goal.id, 'description', event.target.value), placeholder: "Goal description" }), _jsxs("div", { className: "row-two", children: [_jsxs("select", { className: "input", value: goal.uom, disabled: readOnly || goal.sharedReadOnly, onChange: (event) => updateGoal(employeeId, goal.id, 'uom', event.target.value), children: [_jsx("option", { value: "Numeric", children: "Numeric" }), _jsx("option", { value: "Percent", children: "%" }), _jsx("option", { value: "Timeline", children: "Timeline" }), _jsx("option", { value: "Zero", children: "Zero" })] }), _jsx("select", { className: "input", value: goal.direction, disabled: readOnly || goal.sharedReadOnly || goal.uom === 'Timeline' || goal.uom === 'Zero', onChange: (event) => updateGoal(employeeId, goal.id, 'direction', event.target.value), children: directionOptions.map((direction) => (_jsx("option", { value: direction, children: directionLabel(direction) }, direction))) })] }), _jsxs("div", { className: "row-two", children: [_jsx("input", { className: "input", value: goal.target, disabled: readOnly || goal.sharedReadOnly, onChange: (event) => updateGoal(employeeId, goal.id, 'target', event.target.value), placeholder: "Target" }), _jsx("input", { className: "input", type: "number", value: goal.weightage, disabled: readOnly, min: 10, max: 100, onChange: (event) => updateGoal(employeeId, goal.id, 'weightage', Number(event.target.value)), placeholder: "Weightage" })] }), _jsxs("div", { className: "row-two", children: [_jsx("input", { className: "input", value: goal.actual ?? '', disabled: readOnly && goal.status !== 'Not Started', onChange: (event) => updateGoal(employeeId, goal.id, 'actual', event.target.value), placeholder: "Actual" }), _jsx("input", { className: "input", type: "date", value: toDateInputValue(goal.targetDate), disabled: readOnly || goal.uom !== 'Timeline', onChange: (event) => updateGoal(employeeId, goal.id, 'targetDate', event.target.value), placeholder: "Target date" })] }), _jsxs("div", { className: "row-two", children: [_jsx("input", { className: "input", type: "date", value: toDateInputValue(goal.actualDate), disabled: readOnly || goal.uom !== 'Timeline', onChange: (event) => updateGoal(employeeId, goal.id, 'actualDate', event.target.value), placeholder: "Actual date" }), _jsx("select", { className: "input", value: goal.status, disabled: readOnly && goal.status !== 'Not Started', onChange: (event) => updateGoal(employeeId, goal.id, 'status', event.target.value), children: goalStatuses.map((status) => (_jsx("option", { value: status, children: status }, status))) })] }), _jsxs("div", { className: "goal-footer", children: [_jsxs("span", { children: ["Progress: ", calculateProgress(goal), "%"] }), _jsx("span", { children: goal.sharedReadOnly ? 'Shared KPI' : 'Local goal' }), !readOnly && allowRemove && !goal.sharedReadOnly ? (_jsx("button", { className: "button ghost", onClick: () => removeGoalRow(employeeId, goal.id), children: "Remove" })) : (_jsx("span", { children: directionLabel(goal.direction) }))] })] }, goal.id))) }));
}
function EmployeePanel({ state, currentEmployee, currentSheet, quarterLabel, goalSettingWindowOpen, canEditCurrentWindow, setSelectedEmployee, updateGoal, addGoalRow, removeGoalRow, saveDraft, submitGoals, updateQuarterlyActual, updateCheckInComment, }) {
    const canEditSheet = (currentSheet.status === 'Draft' || currentSheet.status === 'Returned') && goalSettingWindowOpen;
    const checkInComment = currentSheet.checkIns.find((record) => record.quarter === quarterLabel)?.comment ?? '';
    return (_jsxs("section", { className: "panel stack", children: [_jsxs("div", { className: "section-header", children: [_jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "Employee journey" }), _jsx("h3", { children: "Draft, submit, and update quarterly achievement" })] }), _jsx("select", { className: "input narrow", value: currentEmployee.id, onChange: (event) => setSelectedEmployee(event.target.value), children: state.employees.map((employee) => (_jsx("option", { value: employee.id, children: employee.name }, employee.id))) })] }), _jsxs("div", { className: "cards-grid three", children: [_jsxs("div", { className: "stat-card", children: [_jsx("span", { children: "Goals allowed" }), _jsxs("strong", { children: [currentSheet.goals.length, "/8"] })] }), _jsxs("div", { className: "stat-card", children: [_jsx("span", { children: "Total weightage" }), _jsxs("strong", { children: [currentSheet.goals.reduce((sum, goal) => sum + goal.weightage, 0), "%"] })] }), _jsxs("div", { className: "stat-card", children: [_jsx("span", { children: "Quarter status" }), _jsx("strong", { children: quarterLabel })] })] }), _jsx(GoalTable, { goals: currentSheet.goals, employeeId: currentEmployee.id, updateGoal: updateGoal, removeGoalRow: removeGoalRow, readOnly: !canEditSheet }), _jsxs("div", { className: "button-row", children: [_jsx("button", { className: "button secondary", onClick: saveDraft, disabled: !canEditSheet, children: "Save draft" }), _jsx("button", { className: "button primary", onClick: submitGoals, disabled: !canEditSheet, children: "Submit for approval" }), _jsx("button", { className: "button secondary", onClick: () => addGoalRow(currentEmployee.id), disabled: !canEditSheet, children: "Add goal" })] }), _jsxs("div", { className: "split-grid", children: [_jsxs("div", { children: [_jsxs("div", { className: "section-header", children: [_jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "Quarterly check-in" }), _jsx("h4", { children: quarterLabel })] }), _jsx("div", { className: `status-pill ${canEditCurrentWindow ? 'success' : 'neutral'}`, children: canEditCurrentWindow ? 'Window open' : 'Window closed' })] }), _jsx("div", { className: "checkin-grid", children: currentSheet.goals.map((goal) => (_jsxs("div", { className: "checkin-card", children: [_jsx("strong", { children: goal.title || 'Untitled goal' }), _jsxs("div", { className: "muted", children: ["Planned target: ", goal.target || goal.targetDate || 'Pending'] }), _jsxs("div", { className: "muted", children: ["Achievement score: ", calculateProgress(goal), "%"] }), _jsxs("div", { className: "row-two", children: [_jsx("input", { className: "input", value: goal.actual ?? '', onChange: (event) => updateQuarterlyActual(currentEmployee.id, goal.id, event.target.value, goal.actualDate ?? '', goal.status), disabled: !canEditCurrentWindow, placeholder: "Actual achievement" }), _jsx("select", { className: "input", value: goal.status, onChange: (event) => updateQuarterlyActual(currentEmployee.id, goal.id, goal.actual ?? '', goal.actualDate ?? '', event.target.value), disabled: !canEditCurrentWindow, children: goalStatuses.map((status) => (_jsx("option", { value: status, children: status }, status))) })] }), _jsx("input", { className: "input", type: "date", value: toDateInputValue(goal.actualDate), onChange: (event) => updateQuarterlyActual(currentEmployee.id, goal.id, goal.actual ?? '', event.target.value, goal.status), disabled: !canEditCurrentWindow || goal.uom !== 'Timeline' })] }, goal.id))) })] }), _jsxs("div", { className: "panel nested", children: [_jsx("div", { className: "section-header", children: _jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "Employee note" }), _jsx("h4", { children: "Quarter comment" })] }) }), _jsx("textarea", { className: "input textarea tall", value: checkInComment, onChange: (event) => updateCheckInComment(currentEmployee.id, event.target.value), placeholder: "Summarize your quarter update here" }), _jsx("div", { className: "muted", children: "Employee comments are shared with the manager during the quarterly check-in discussion." }), _jsx("div", { className: "checkin-history", children: currentSheet.checkIns.length === 0 ? (_jsx("div", { className: "empty", children: "No check-ins captured yet." })) : (currentSheet.checkIns.map((record) => (_jsxs("div", { className: "checkin-history-item", children: [_jsx("strong", { children: record.quarter }), _jsx("span", { children: record.comment }), _jsxs("span", { children: ["Updated by ", record.updatedBy, " on ", formatDateTime(record.updatedAt)] })] }, record.id)))) })] })] })] }));
}
function ManagerPanel({ state, teamEmployees, currentEmployee, currentSheet, quarterLabel, updateSelectedEmployee, updateGoal, approveSheet, returnForRework, updateCheckInComment, }) {
    const checkInComment = currentSheet.checkIns.find((record) => record.quarter === quarterLabel)?.comment ?? '';
    const sheetSummary = summarizeProgress(currentSheet.goals);
    return (_jsxs("section", { className: "panel stack", children: [_jsxs("div", { className: "section-header", children: [_jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "Manager journey" }), _jsx("h3", { children: "Review, edit inline, approve, or return goals" })] }), _jsx("select", { className: "input narrow", value: currentEmployee.id, onChange: (event) => updateSelectedEmployee(event.target.value), children: teamEmployees.map((employee) => (_jsx("option", { value: employee.id, children: employee.name }, employee.id))) })] }), _jsx("div", { className: "cards-grid three", children: teamEmployees.map((employee) => {
                    const sheet = state.goalSheets.find((item) => item.employeeId === employee.id) ?? currentSheet;
                    return (_jsxs("button", { className: "stat-card button-card", onClick: () => updateSelectedEmployee(employee.id), children: [_jsx("span", { children: employee.name }), _jsx("strong", { children: sheet.status }), _jsxs("small", { children: [summarizeProgress(sheet.goals).average, "% average score"] })] }, employee.id));
                }) }), _jsxs("div", { className: "panel nested progress-report", children: [_jsxs("div", { className: "section-header", children: [_jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "Employee Progress Report" }), _jsx("h3", { children: currentEmployee.name })] }), _jsx("div", { className: `status-pill ${statusTone(currentSheet.status)}`, children: currentSheet.status })] }), _jsxs("div", { className: "cards-grid four", children: [_jsxs("div", { className: "stat-card", children: [_jsx("span", { children: "Total Goals" }), _jsx("strong", { children: currentSheet.goals.length })] }), _jsxs("div", { className: "stat-card", children: [_jsx("span", { children: "Completed" }), _jsx("strong", { children: sheetSummary.completed })] }), _jsxs("div", { className: "stat-card", children: [_jsx("span", { children: "On Track" }), _jsx("strong", { children: sheetSummary.onTrack })] }), _jsxs("div", { className: "stat-card", children: [_jsx("span", { children: "Average Progress" }), _jsxs("strong", { children: [sheetSummary.average, "%"] })] })] }), _jsxs("div", { className: "progress-details", children: [_jsxs("div", { className: "detail-row", children: [_jsx("span", { children: "Department" }), _jsx("strong", { children: currentEmployee.department })] }), _jsxs("div", { className: "detail-row", children: [_jsx("span", { children: "Title" }), _jsx("strong", { children: currentEmployee.title })] }), _jsxs("div", { className: "detail-row", children: [_jsx("span", { children: "Sheet Submitted" }), _jsx("strong", { children: currentSheet.submittedAt ? 'Yes' : 'No' })] }), _jsxs("div", { className: "detail-row", children: [_jsx("span", { children: "Approved Date" }), _jsx("strong", { children: currentSheet.approvedAt?.trim()
                                            ? formatDate(currentSheet.approvedAt.split('T')[0])
                                            : 'Pending' })] })] })] }), _jsx(GoalTable, { goals: currentSheet.goals, employeeId: currentEmployee.id, updateGoal: updateGoal, removeGoalRow: () => undefined, readOnly: currentSheet.status === 'Approved' || currentSheet.status === 'Locked', allowRemove: false }), _jsxs("div", { className: "button-row", children: [_jsx("button", { className: "button secondary", onClick: () => returnForRework(currentSheet.id), children: "Return for rework" }), _jsx("button", { className: "button primary", onClick: () => approveSheet(currentSheet.id), children: "Approve and lock" })] }), _jsxs("div", { className: "split-grid", children: [_jsxs("div", { className: "panel nested", children: [_jsx("div", { className: "section-header", children: _jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "Manager check-in" }), _jsx("h4", { children: "Planned vs. actual" })] }) }), _jsx("div", { className: "checkin-grid", children: currentSheet.goals.map((goal) => (_jsxs("div", { className: "checkin-card", children: [_jsx("strong", { children: goal.title || 'Untitled goal' }), _jsxs("div", { className: "muted", children: ["Planned target: ", goal.target || goal.targetDate || 'Pending'] }), _jsxs("div", { className: "muted", children: ["Actual: ", goal.actual || 'Not captured'] }), _jsxs("div", { className: "muted", children: ["Score: ", calculateProgress(goal), "%"] }), _jsxs("div", { className: "muted", children: ["Status: ", goal.status] })] }, goal.id))) })] }), _jsxs("div", { className: "panel nested", children: [_jsx("div", { className: "section-header", children: _jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "Check-in comment" }), _jsx("h4", { children: "Structured feedback" })] }) }), _jsx("textarea", { className: "input textarea tall", value: checkInComment, onChange: (event) => updateCheckInComment(currentEmployee.id, event.target.value), placeholder: "Write the quarterly discussion note" }), _jsx("div", { className: "muted", children: "Manager notes are attached to the active quarter and available to HR for governance." }), _jsx("div", { className: "manager-roster", children: teamEmployees.map((employee) => {
                                    const sheet = state.goalSheets.find((item) => item.employeeId === employee.id);
                                    return (_jsxs("div", { className: "manager-roster-item", children: [_jsx("strong", { children: employee.name }), _jsx("span", { children: employee.title }), _jsx("span", { children: sheet?.checkIns.some((record) => record.quarter === quarterLabel) ? 'Check-in complete' : 'Awaiting check-in' })] }, employee.id));
                                }) })] })] })] }));
}
function AdminPanel({ state, currentSheet, currentEmployee, teamEmployees, completionRows, reportRows, updateSelectedEmployee, pushSharedKpi, unlockSheet, exportReportCsv, }) {
    const selectedRecipients = teamEmployees.map((employee) => employee.id);
    return (_jsxs("section", { className: "panel stack", children: [_jsxs("div", { className: "section-header", children: [_jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "Admin / HR journey" }), _jsx("h3", { children: "Cycle controls, shared KPIs, reporting, and unlock actions" })] }), _jsxs("div", { className: "button-row compact", children: [_jsx("button", { className: "button secondary", onClick: exportReportCsv, children: "Export report" }), _jsx("button", { className: "button secondary", onClick: () => unlockSheet(currentSheet.id), children: "Unlock selected sheet" })] })] }), _jsxs("div", { className: "cards-grid three", children: [_jsxs("div", { className: "stat-card", children: [_jsx("span", { children: "Active cycle year" }), _jsx("strong", { children: state.goalSheets[0]?.cycleYear ?? 2026 })] }), _jsxs("div", { className: "stat-card", children: [_jsx("span", { children: "Selected employee" }), _jsx("strong", { children: currentEmployee.name })] }), _jsxs("div", { className: "stat-card", children: [_jsx("span", { children: "Report rows" }), _jsx("strong", { children: reportRows.length })] })] }), _jsxs("div", { className: "split-grid", children: [_jsxs("form", { className: "panel nested", onSubmit: (event) => {
                            event.preventDefault();
                            pushSharedKpi(new FormData(event.currentTarget));
                        }, children: [_jsx("div", { className: "section-header", children: _jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "Shared goals" }), _jsx("h4", { children: "Push a departmental KPI" })] }) }), _jsx("input", { className: "input", name: "shared-title", placeholder: "Shared KPI title", defaultValue: "Quarterly compliance audit completion" }), _jsx("textarea", { className: "input textarea", name: "shared-description", placeholder: "Optional context", defaultValue: "Shared KPI pushed across multiple employees." }), _jsxs("div", { className: "row-two", children: [_jsx("select", { className: "input", name: "shared-uom", defaultValue: "Percent", children: uomOptions.map((uom) => (_jsx("option", { value: uom, children: uom }, uom))) }), _jsx("select", { className: "input", name: "shared-direction", defaultValue: "Min", children: directionOptions.map((direction) => (_jsx("option", { value: direction, children: directionLabel(direction) }, direction))) })] }), _jsxs("div", { className: "row-two", children: [_jsx("input", { className: "input", name: "shared-target", placeholder: "Target value", defaultValue: "95" }), _jsx("input", { className: "input", type: "number", name: "shared-weightage", min: 10, max: 100, defaultValue: 25 })] }), _jsx("div", { className: "recipient-grid", children: teamEmployees.map((employee) => (_jsxs("label", { className: "recipient-pill", children: [_jsx("input", { type: "checkbox", name: "shared-employees", value: employee.id, defaultChecked: selectedRecipients.includes(employee.id) }), _jsx("span", { children: employee.name })] }, employee.id))) }), _jsx("button", { className: "button primary", type: "submit", children: "Push shared KPI" })] }), _jsxs("div", { className: "panel nested", children: [_jsx("div", { className: "section-header", children: _jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "Completion dashboard" }), _jsx("h4", { children: "Quarterly status by employee" })] }) }), _jsx("div", { className: "completion-list", children: completionRows.map((row) => (_jsxs("div", { className: "completion-row", children: [_jsx("strong", { children: row.employee }), _jsx("span", { children: row.sheetStatus }), _jsxs("span", { children: ["Check-in: ", row.checkIn] }), _jsxs("span", { children: [row.average, "% average"] })] }, row.employee))) })] })] }), _jsxs("div", { className: "panel nested", children: [_jsx("div", { className: "section-header", children: _jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "Governance" }), _jsx("h4", { children: "Employee roster and selected sheet actions" })] }) }), _jsx("div", { className: "employee-grid", children: state.employees.map((employee) => {
                            const sheet = state.goalSheets.find((item) => item.employeeId === employee.id);
                            return (_jsxs("button", { className: "employee-card button-card", onClick: () => updateSelectedEmployee(employee.id), children: [_jsx("strong", { children: employee.name }), _jsx("span", { children: employee.title }), _jsx("span", { children: sheet?.status ?? 'Draft' })] }, employee.id));
                        }) }), _jsx("div", { className: "muted", children: "Admin controls the cycle date, resolves exceptions, and can unlock a locked sheet for rework." })] }), _jsxs("div", { className: "panel nested", children: [_jsx("div", { className: "section-header", children: _jsxs("div", { children: [_jsx("p", { className: "eyebrow", children: "Report sample" }), _jsx("h4", { children: "Planned target vs actual achievement" })] }) }), _jsxs("div", { className: "report-table", children: [_jsxs("div", { className: "report-head", children: [_jsx("span", { children: "Employee" }), _jsx("span", { children: "Goal" }), _jsx("span", { children: "Target" }), _jsx("span", { children: "Actual" }), _jsx("span", { children: "Progress" })] }), reportRows.slice(0, 8).map((row, index) => (_jsxs("div", { className: "report-row", children: [_jsx("span", { children: row.employee }), _jsx("span", { children: row.goal }), _jsx("span", { children: row.target }), _jsx("span", { children: row.actual }), _jsxs("span", { children: [row.progress, "%"] })] }, `${String(row.employee)}-${index}`)))] })] })] }));
}
export default App;
