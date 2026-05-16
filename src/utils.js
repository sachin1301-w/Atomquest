export function uid(prefix) {
    return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}
export function isoNow() {
    return new Date().toISOString();
}
export function parseDate(value) {
    return new Date(`${value}T00:00:00`);
}
export function formatDate(value) {
    if (!value)
        return 'Pending';
    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(parseDate(value));
}
export function formatDateTime(value) {
    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
}
export function toDateInputValue(value) {
    if (!value)
        return '';
    return value.slice(0, 10);
}
export function clampNumber(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
export function getQuarterLabel(date) {
    const month = date.getMonth();
    if (month >= 4 && month <= 5)
        return 'Goal Setting';
    if (month >= 6 && month <= 8)
        return 'Q1 Check-in';
    if (month >= 9 && month <= 11)
        return 'Q2 Check-in';
    if (month >= 0 && month <= 1)
        return 'Q3 Check-in';
    return 'Q4 / Annual';
}
export function getQuarterCode(date) {
    const month = date.getMonth();
    if (month >= 6 && month <= 8)
        return 'Q1';
    if (month >= 9 && month <= 11)
        return 'Q2';
    if (month >= 0 && month <= 1)
        return 'Q3';
    if (month >= 2 && month <= 3)
        return 'Q4';
    return 'Goal';
}
export function calculateProgress(goal) {
    if (goal.uom === 'Zero') {
        const actual = Number(goal.actual ?? '1');
        return actual === 0 ? 100 : 0;
    }
    if (goal.uom === 'Timeline') {
        if (!goal.targetDate)
            return 0;
        if (!goal.actualDate)
            return goal.status === 'Completed' ? 0 : 25;
        return parseDate(goal.actualDate) <= parseDate(goal.targetDate) ? 100 : 0;
    }
    const target = Number(goal.target);
    const actual = Number(goal.actual ?? '0');
    if (!Number.isFinite(target) || target <= 0)
        return 0;
    if (!Number.isFinite(actual) || actual < 0)
        return 0;
    const raw = goal.direction === 'Max' ? (target / Math.max(actual, 0.0001)) * 100 : (actual / target) * 100;
    return clampNumber(Math.round(raw), 0, 100);
}
export function validateSheet(goals) {
    const errors = [];
    const totalWeight = goals.reduce((sum, goal) => sum + Number(goal.weightage || 0), 0);
    if (goals.length === 0) {
        errors.push('Add at least one goal before submission.');
    }
    if (goals.length > 8) {
        errors.push('Maximum of 8 goals is allowed per employee.');
    }
    if (goals.some((goal) => goal.weightage < 10)) {
        errors.push('Each goal needs a minimum weightage of 10%.');
    }
    if (Math.round(totalWeight) !== 100) {
        errors.push(`Total weightage must equal 100%. Current total is ${Math.round(totalWeight)}%.`);
    }
    goals.forEach((goal, index) => {
        if (!goal.title.trim())
            errors.push(`Goal ${index + 1} needs a title.`);
        if (!goal.thrustArea.trim())
            errors.push(`Goal ${index + 1} needs a thrust area.`);
        if ((goal.uom === 'Numeric' || goal.uom === 'Percent') && !goal.target.trim()) {
            errors.push(`Goal ${index + 1} needs a target value.`);
        }
        if (goal.uom === 'Timeline' && !goal.targetDate) {
            errors.push(`Goal ${index + 1} needs a deadline.`);
        }
    });
    return Array.from(new Set(errors));
}
export function createAuditEntry(entry) {
    return {
        ...entry,
        id: uid('audit'),
        timestamp: isoNow(),
    };
}
export function summarizeProgress(goals) {
    const counts = goals.reduce((acc, goal) => {
        if (goal.status === 'Completed')
            acc.completed += 1;
        if (goal.status === 'On Track')
            acc.onTrack += 1;
        if (goal.status === 'Not Started')
            acc.notStarted += 1;
        acc.totalScore += calculateProgress(goal);
        return acc;
    }, { completed: 0, onTrack: 0, notStarted: 0, totalScore: 0 });
    return {
        completed: counts.completed,
        onTrack: counts.onTrack,
        notStarted: counts.notStarted,
        average: goals.length ? Math.round(counts.totalScore / goals.length) : 0,
    };
}
export function toCsv(rows) {
    if (rows.length === 0)
        return '';
    const headers = Object.keys(rows[0]);
    const quoted = (value) => {
        const text = value === undefined || value === null ? '' : String(value);
        return `"${text.split('"').join('""')}"`;
    };
    return [headers.join(','), ...rows.map((row) => headers.map((header) => quoted(row[header])).join(','))].join('\n');
}
export function statusTone(status) {
    switch (status) {
        case 'Completed':
        case 'Approved':
        case 'Locked':
            return 'success';
        case 'On Track':
        case 'Submitted':
            return 'warning';
        case 'Returned':
            return 'danger';
        default:
            return 'neutral';
    }
}
export function directionLabel(direction) {
    return direction === 'Max' ? 'Lower is better' : 'Higher is better';
}
export function uomLabel(uom) {
    return uom;
}
