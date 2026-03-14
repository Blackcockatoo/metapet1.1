'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trash2, Plus, RefreshCw, ClipboardList, ListOrdered, Compass, Activity } from 'lucide-react';
import { useEducationStore, deriveStudentDNA, explainRecommendedMode, rankDnaModes } from '@/lib/education';
import type { DnaMode, FocusArea } from '@/lib/education';
import { DNA_MODE_LABELS, FOCUS_AREA_LABELS } from '@/lib/education';
import { EducationQueuePanel } from '@/components/EducationQueuePanel';
import { StudentDNACard } from '@/components/StudentDNACard';
import { useQuota } from '@/lib/pricing/hooks';
import { UpgradePrompt } from '@/components/UpgradePrompt';

type Student = {
  id: string;
  alias: string;
  addedAt: number;
};

type Assignment = {
  id: string;
  title: string;
  focus: string;
  targetMinutes: number;
  createdAt: number;
  dnaMode?: DnaMode;
  standardsRef?: string;
};

type ProgressStatus = 'not-started' | 'in-progress' | 'complete';

type ProgressMap = Record<string, Record<string, ProgressStatus>>;

type AggregatedAnalytics = {
  totalStudents: number;
  totalAssignments: number;
  completionRate: number;
  assignments: Array<{
    id: string;
    title: string;
    completeCount: number;
    inProgressCount: number;
    notStartedCount: number;
  }>;
  updatedAt: number;
};

type GroupingPreset = 'pairs' | 'triads' | 'support-circles';

type BulkQueueRecord = {
  mode: Exclude<DnaMode, null>;
  queuedAt: number;
  batchLabel: string;
};

const ROSTER_STORAGE_KEY = 'metapet-classroom-roster';
const ASSIGNMENT_STORAGE_KEY = 'metapet-classroom-assignments';
const PROGRESS_STORAGE_KEY = 'metapet-classroom-progress';
const ANALYTICS_STORAGE_KEY = 'metapet-classroom-analytics';
const BULK_QUEUE_STORAGE_KEY = 'metapet-classroom-bulk-queued-lessons';

const DEFAULT_STATUS: ProgressStatus = 'not-started';

const sanitizeAlias = (value: string) => value.trim().slice(0, 32);
const sanitizeTitle = (value: string) => value.trim().slice(0, 60);
const sanitizeFocus = (value: string) => value.trim().slice(0, 40);
const sanitizeFileSegment = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9-_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

const safeParse = <T,>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.warn('Failed to parse classroom data:', error);
    return fallback;
  }
};

const createId = () => crypto.randomUUID();

export function ClassroomManager() {
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [progress, setProgress] = useState<ProgressMap>({});
  const [newAlias, setNewAlias] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newFocus, setNewFocus] = useState('Mindfulness');
  const [newTargetMinutes, setNewTargetMinutes] = useState(10);
  const [newDnaMode, setNewDnaMode] = useState<DnaMode>(null);
  const [newStandardsRef, setNewStandardsRef] = useState('');
  const [showQueue, setShowQueue] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState<string | null>(null);
  const [selectedAssignmentModeFilter, setSelectedAssignmentModeFilter] = useState<Exclude<DnaMode, null> | null>(null);
  const [selectedGroupingPreset, setSelectedGroupingPreset] = useState<GroupingPreset>('pairs');
  const [bulkQueuedLessons, setBulkQueuedLessons] = useState<Record<string, BulkQueueRecord>>({});
  const [groupExportMessage, setGroupExportMessage] = useState<string | null>(null);
  const [teacherNotesMessage, setTeacherNotesMessage] = useState<string | null>(null);
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);
  const [showTeacherNotesPreview, setShowTeacherNotesPreview] = useState(false);
  const [exportClassName, setExportClassName] = useState('Classroom');
  const [pendingExportExtension, setPendingExportExtension] = useState<'txt' | 'md'>('txt');

  const addLessonToQueue = useEducationStore((s) => s.addLesson);
  const lessonProgress = useEducationStore((s) => s.lessonProgress);
  const queue = useEducationStore((s) => s.queue);
  const studentQuota = useQuota('students', students.length);
  const assignmentQuota = useQuota('assignments', assignments.length);

  useEffect(() => {
    setStudents(safeParse<Student[]>(window.localStorage.getItem(ROSTER_STORAGE_KEY), []));
    setAssignments(safeParse<Assignment[]>(window.localStorage.getItem(ASSIGNMENT_STORAGE_KEY), []));
    setProgress(safeParse<ProgressMap>(window.localStorage.getItem(PROGRESS_STORAGE_KEY), {}));
    setBulkQueuedLessons(safeParse<Record<string, BulkQueueRecord>>(window.localStorage.getItem(BULK_QUEUE_STORAGE_KEY), {}));
  }, []);

  useEffect(() => {
    window.localStorage.setItem(ROSTER_STORAGE_KEY, JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    window.localStorage.setItem(ASSIGNMENT_STORAGE_KEY, JSON.stringify(assignments));
  }, [assignments]);

  useEffect(() => {
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
  }, [progress]);

  useEffect(() => {
    window.localStorage.setItem(BULK_QUEUE_STORAGE_KEY, JSON.stringify(bulkQueuedLessons));
  }, [bulkQueuedLessons]);

  const analytics = useMemo<AggregatedAnalytics>(() => {
    const assignmentAnalytics = assignments.map(assignment => {
      const assignmentProgress = progress[assignment.id] ?? {};
      let completeCount = 0;
      let inProgressCount = 0;
      let notStartedCount = 0;
      students.forEach(student => {
        const status = assignmentProgress[student.id] ?? DEFAULT_STATUS;
        if (status === 'complete') completeCount += 1;
        if (status === 'in-progress') inProgressCount += 1;
        if (status === 'not-started') notStartedCount += 1;
      });
      return {
        id: assignment.id,
        title: assignment.title,
        completeCount,
        inProgressCount,
        notStartedCount,
      };
    });

    const totalStudents = students.length;
    const totalAssignments = assignments.length;
    const totalCells = totalStudents * totalAssignments;
    const totalComplete = assignmentAnalytics.reduce((sum, entry) => sum + entry.completeCount, 0);
    const completionRate = totalCells === 0 ? 0 : totalComplete / totalCells;

    return {
      totalStudents,
      totalAssignments,
      completionRate,
      assignments: assignmentAnalytics,
      updatedAt: Date.now(),
    };
  }, [assignments, progress, students]);

  const dnaModesByLessonId = useMemo(() => {
    const dnaModes: Record<string, DnaMode> = {};
    for (const lesson of queue) {
      dnaModes[lesson.id] = lesson.dnaMode;
    }
    return dnaModes;
  }, [queue]);

  const rosterDnaProfiles = useMemo(() => {
    return students
      .map((student) => {
        const studentProgress = lessonProgress.filter((p) => p.studentAlias === student.alias);
        if (studentProgress.length === 0) return null;
        return {
          student,
          profile: deriveStudentDNA(student.alias, studentProgress, dnaModesByLessonId),
          progress: studentProgress,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  }, [students, lessonProgress, dnaModesByLessonId]);

  const rosterDnaSummary = useMemo(() => {
    const modeCounts: Record<Exclude<DnaMode, null>, number> = {
      spiral: 0,
      mandala: 0,
      particles: 0,
      sound: 0,
      journey: 0,
    };

    let totalInteractions = 0;
    let totalReflectionDepth = 0;

    for (const entry of rosterDnaProfiles) {
      const topMode = rankDnaModes(entry.profile, 1)[0];
      if (topMode && topMode.affinity > 0) {
        modeCounts[topMode.mode] += 1;
      }
      totalInteractions += entry.progress.reduce((sum, item) => sum + item.dnaInteractions, 0);
      totalReflectionDepth += entry.profile.reflectionDepth;
    }

    const dominantModes = Object.entries(modeCounts)
      .filter(([, count]) => count > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3) as [Exclude<DnaMode, null>, number][];

    return {
      profileCount: rosterDnaProfiles.length,
      totalInteractions,
      averageReflectionDepth: rosterDnaProfiles.length === 0 ? 0 : totalReflectionDepth / rosterDnaProfiles.length,
      dominantModes,
    };
  }, [rosterDnaProfiles]);

  const groupingSuggestions = useMemo(() => {
    if (rosterDnaProfiles.length < 2) return [] as string[];

    const byReflection = [...rosterDnaProfiles].sort((a, b) => b.profile.reflectionDepth - a.profile.reflectionDepth);
    const byPattern = [...rosterDnaProfiles].sort((a, b) => {
      const aTop = rankDnaModes(a.profile, 1)[0]?.affinity ?? 0;
      const bTop = rankDnaModes(b.profile, 1)[0]?.affinity ?? 0;
      return bTop - aTop;
    });
    const byDiscovery = [...rosterDnaProfiles].sort((a, b) => b.profile.discoveryCount - a.profile.discoveryCount);

    const suggestions: string[] = [];
    if (byReflection[0] && byPattern[0] && byReflection[0].student.id !== byPattern[0].student.id) {
      suggestions.push(`Pair ${byReflection[0].student.alias} for reflection talk with ${byPattern[0].student.alias} for strong pattern confidence.`);
    }
    if (byDiscovery[0] && byReflection[byReflection.length - 1] && byDiscovery[0].student.id !== byReflection[byReflection.length - 1].student.id) {
      suggestions.push(`Use ${byDiscovery[0].student.alias} as an exploration partner for ${byReflection[byReflection.length - 1].student.alias} to model active noticing before reflection.`);
    }

    return suggestions.slice(0, 2);
  }, [rosterDnaProfiles]);

  const groupingPlans = useMemo<Record<GroupingPreset, string[]>>(() => {
    if (rosterDnaProfiles.length < 2) {
      return { pairs: [], triads: [], 'support-circles': [] };
    }

    const byReflection = [...rosterDnaProfiles].sort((a, b) => b.profile.reflectionDepth - a.profile.reflectionDepth);
    const byDiscovery = [...rosterDnaProfiles].sort((a, b) => b.profile.discoveryCount - a.profile.discoveryCount);
    const byPattern = [...rosterDnaProfiles].sort((a, b) => {
      const aTop = rankDnaModes(a.profile, 1)[0]?.affinity ?? 0;
      const bTop = rankDnaModes(b.profile, 1)[0]?.affinity ?? 0;
      return bTop - aTop;
    });

    const uniqueAliases = (entries: typeof rosterDnaProfiles) => [...new Set(entries.map((entry) => entry.student.alias))];

    const pairA = [byReflection[0], byPattern[0]].filter(Boolean);
    const pairB = [byDiscovery[0], byReflection[byReflection.length - 1]].filter(Boolean);

    const triad = uniqueAliases([
      byReflection[0],
      byPattern.find((entry) => entry.student.id !== byReflection[0]?.student.id) ?? byPattern[0],
      byDiscovery.find((entry) => ![byReflection[0]?.student.id, byPattern[0]?.student.id].includes(entry.student.id)) ?? byDiscovery[0],
    ].filter(Boolean) as typeof rosterDnaProfiles).slice(0, 3);

    const supportCircle = uniqueAliases([
      byReflection[0],
      byDiscovery[0],
      byPattern[0],
      byReflection[byReflection.length - 1],
    ].filter(Boolean) as typeof rosterDnaProfiles).slice(0, 4);

    return {
      pairs: [
        uniqueAliases(pairA as typeof rosterDnaProfiles).length >= 2
          ? `${uniqueAliases(pairA as typeof rosterDnaProfiles).join(' + ')} - reflection lead paired with pattern lead.`
          : '',
        uniqueAliases(pairB as typeof rosterDnaProfiles).length >= 2
          ? `${uniqueAliases(pairB as typeof rosterDnaProfiles).join(' + ')} - active explorer paired with a learner who benefits from guided reflection.`
          : '',
      ].filter(Boolean),
      triads: triad.length >= 3
        ? [`${triad.join(' + ')} - triad balances reflection, pattern recognition, and discovery momentum.`]
        : [],
      'support-circles': supportCircle.length >= 3
        ? [`${supportCircle.join(' + ')} - support circle mixes confident explorers with a learner who needs more reflection scaffolding.`]
        : [],
    };
  }, [rosterDnaProfiles]);

  const filteredAssignments = useMemo(() => {
    if (!selectedAssignmentModeFilter) return assignments;
    return assignments.filter((assignment) => assignment.dnaMode === selectedAssignmentModeFilter);
  }, [assignments, selectedAssignmentModeFilter]);

  const bulkQueuedEntries = useMemo(() => {
    return Object.entries(bulkQueuedLessons)
      .filter(([title]) => queue.some((lesson) => lesson.title === title))
      .sort(([, a], [, b]) => b.queuedAt - a.queuedAt);
  }, [bulkQueuedLessons, queue]);

  const bulkQueuedBatches = useMemo(() => {
    const grouped = new Map<string, { record: BulkQueueRecord; titles: string[] }>();

    bulkQueuedEntries.forEach(([title, record]) => {
      const key = `${record.batchLabel}-${record.queuedAt}-${record.mode}`;
      const existing = grouped.get(key);
      if (existing) {
        existing.titles.push(title);
      } else {
        grouped.set(key, { record, titles: [title] });
      }
    });

    return [...grouped.values()].sort((a, b) => b.record.queuedAt - a.record.queuedAt);
  }, [bulkQueuedEntries]);

  const groupingExportText = useMemo(() => {
    const plans = groupingPlans[selectedGroupingPreset];
    if (plans.length === 0) return '';

    const title = selectedGroupingPreset === 'pairs'
      ? 'Pairs'
      : selectedGroupingPreset === 'triads'
        ? 'Triads'
        : 'Support circles';

    return [`${title} plan`, ...plans.map((plan, index) => `${index + 1}. ${plan}`)].join('\n');
  }, [groupingPlans, selectedGroupingPreset]);

  const teacherNotesExportText = useMemo(() => {
    const dominantModeLines = rosterDnaSummary.dominantModes.length === 0
      ? ['- No dominant class mode yet.']
      : rosterDnaSummary.dominantModes.map(([mode, count]) => `- ${DNA_MODE_LABELS[mode]}: ${count} learner${count === 1 ? '' : 's'}`);

    const groupLines = Object.entries(groupingPlans).flatMap(([preset, plans]) => {
      if (plans.length === 0) return [];
      const label = preset === 'pairs' ? 'Pairs' : preset === 'triads' ? 'Triads' : 'Support circles';
      return [`${label}:`, ...plans.map((plan, index) => `${index + 1}. ${plan}`)];
    });

    const queueLines = bulkQueuedBatches.length === 0
      ? ['- No recent dominant-mode bulk queue actions.']
      : bulkQueuedBatches.map(({ record, titles }) => `- ${record.batchLabel} (${DNA_MODE_LABELS[record.mode]}): ${titles.join(', ')}`);

    return [
      'Teacher notes',
      '',
      'Dominant modes',
      ...dominantModeLines,
      '',
      'Group plans',
      ...(groupLines.length > 0 ? groupLines : ['- No group plans available yet.']),
      '',
      'Queue recommendations',
      ...queueLines,
    ].join('\n');
  }, [bulkQueuedBatches, groupingPlans, rosterDnaSummary.dominantModes]);

  const exportFileName = useMemo(() => {
    const classSegment = sanitizeFileSegment(exportClassName) || 'classroom';
    const dateSegment = new Date().toISOString().slice(0, 10);
    return `${classSegment}-${dateSegment}-teacher-notes.${pendingExportExtension}`;
  }, [exportClassName, pendingExportExtension]);

  useEffect(() => {
    window.localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(analytics));
  }, [analytics]);

  const queueAssignment = (assignment: Assignment) => {
    const focusMap: Record<string, FocusArea> = {
      Mindfulness: 'reflection',
      'Pattern Recognition': 'pattern-recognition',
      'Sound Exploration': 'sound-exploration',
      Collaboration: 'collaboration',
    };

    addLessonToQueue({
      title: assignment.title,
      description: `${assignment.focus} activity`,
      focusArea: focusMap[assignment.focus] ?? 'reflection',
      dnaMode: assignment.dnaMode ?? null,
      targetMinutes: assignment.targetMinutes,
      standardsRef: assignment.standardsRef ? [assignment.standardsRef] : [],
      prePrompt: null,
      postPrompt: null,
    });
  };

  const markBulkQueuedLessons = (items: Assignment[], mode: Exclude<DnaMode, null>) => {
    if (items.length === 0) return;
    const queuedAt = Date.now();
    const batchLabel = `Batch ${new Date(queuedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    setBulkQueuedLessons((prev) => {
      const next = { ...prev };
      items.forEach((item) => {
        next[item.title] = { mode, queuedAt, batchLabel };
      });
      return next;
    });
  };

  const queueAssignmentsForMode = (mode: Exclude<DnaMode, null>) => {
    const matches = assignments
      .filter((assignment) => assignment.dnaMode === mode)
      .filter((assignment) => !queue.some((lesson) => lesson.title === assignment.title));

    matches.forEach(queueAssignment);
    markBulkQueuedLessons(matches, mode);
  };

  const handleCopyGroupingPlan = async () => {
    if (!groupingExportText) return;
    try {
      await navigator.clipboard.writeText(groupingExportText);
      setGroupExportMessage('Grouping plan copied for your lesson notes.');
    } catch {
      setGroupExportMessage('Could not copy automatically. Select the plan text manually.');
    }
  };

  const handleCopyTeacherNotes = async () => {
    try {
      await navigator.clipboard.writeText(teacherNotesExportText);
      setTeacherNotesMessage('Teacher notes copied for your lesson plan.');
    } catch {
      setTeacherNotesMessage('Could not copy automatically. Select the notes manually.');
    }
  };

  const downloadTeacherNotes = (extension: 'txt' | 'md') => {
    const blob = new Blob([teacherNotesExportText], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    const classSegment = sanitizeFileSegment(exportClassName) || 'classroom';
    const dateSegment = new Date().toISOString().slice(0, 10);
    link.download = `${classSegment}-${dateSegment}-teacher-notes.${extension}`;
    window.document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    setDownloadMessage(`Teacher notes downloaded as .${extension}.`);
    setShowTeacherNotesPreview(false);
  };

  const openTeacherNotesPreview = (extension: 'txt' | 'md') => {
    setPendingExportExtension(extension);
    setShowTeacherNotesPreview(true);
  };

  const renameBulkQueueBatch = (target: BulkQueueRecord, nextLabel: string) => {
    const trimmed = nextLabel.trim();
    if (!trimmed) return;

    setBulkQueuedLessons((prev) => {
      const next = { ...prev };
      Object.entries(next).forEach(([title, record]) => {
        if (
          record.mode === target.mode &&
          record.queuedAt === target.queuedAt &&
          record.batchLabel === target.batchLabel
        ) {
          next[title] = { ...record, batchLabel: trimmed };
        }
      });
      return next;
    });
  };

  const handleAddStudent = () => {
    const alias = sanitizeAlias(newAlias);
    if (!alias) return;
    if (studentQuota.atLimit) {
      setUpgradeMessage("You've reached the Free plan limit of 25 students in this class. Upgrade to Pro for unlimited students.");
      return;
    }
    const student: Student = {
      id: createId(),
      alias,
      addedAt: Date.now(),
    };
    setStudents(prev => [...prev, student]);
    setProgress(prev => {
      const updated = { ...prev };
      assignments.forEach(assignment => {
        updated[assignment.id] = {
          ...updated[assignment.id],
          [student.id]: DEFAULT_STATUS,
        };
      });
      return updated;
    });
    setNewAlias('');
  };

  const handleRemoveStudent = (studentId: string) => {
    setStudents(prev => prev.filter(student => student.id !== studentId));
    setProgress(prev => {
      const updated: ProgressMap = {};
      Object.entries(prev).forEach(([assignmentId, assignmentProgress]) => {
        const { [studentId]: _removed, ...rest } = assignmentProgress;
        updated[assignmentId] = rest;
      });
      return updated;
    });
  };

  const handleAddAssignment = () => {
    const title = sanitizeTitle(newTitle);
    if (!title) return;
    if (assignmentQuota.atLimit) {
      setUpgradeMessage("You've reached the Free plan limit of 10 assignments. Upgrade to Pro for unlimited assignments.");
      return;
    }
    const assignment: Assignment = {
      id: createId(),
      title,
      focus: sanitizeFocus(newFocus) || 'Mindfulness',
      targetMinutes: Math.max(1, Number(newTargetMinutes) || 1),
      createdAt: Date.now(),
      dnaMode: newDnaMode,
      standardsRef: newStandardsRef.trim() || undefined,
    };
    setAssignments(prev => [...prev, assignment]);
    setProgress(prev => {
      const updated = { ...prev };
      updated[assignment.id] = students.reduce<Record<string, ProgressStatus>>((acc, student) => {
        acc[student.id] = DEFAULT_STATUS;
        return acc;
      }, {});
      return updated;
    });
    setNewTitle('');
  };

  const handleRemoveAssignment = (assignmentId: string) => {
    setAssignments(prev => prev.filter(assignment => assignment.id !== assignmentId));
    setProgress(prev => {
      const { [assignmentId]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const updateStatus = (assignmentId: string, studentId: string, status: ProgressStatus) => {
    setProgress(prev => ({
      ...prev,
      [assignmentId]: {
        ...prev[assignmentId],
        [studentId]: status,
      },
    }));
  };

  const resetProgress = () => {
    if (!window.confirm('Reset all classroom progress?')) return;
    setProgress(prev => {
      const updated: ProgressMap = {};
      Object.keys(prev).forEach(assignmentId => {
        updated[assignmentId] = students.reduce<Record<string, ProgressStatus>>((acc, student) => {
          acc[student.id] = DEFAULT_STATUS;
          return acc;
        }, {});
      });
      return updated;
    });
  };

  const resetClassroom = () => {
    if (!window.confirm('Clear the roster, assignments, and progress?')) return;
    setStudents([]);
    setAssignments([]);
    setProgress({});
  };

  const resetAnalytics = () => {
    if (!window.confirm('Clear aggregated analytics?')) return;
    window.localStorage.removeItem(ANALYTICS_STORAGE_KEY);
  };

  return (
    <div className="space-y-6">
      {upgradeMessage && <UpgradePrompt message={upgradeMessage} />}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
            <ClipboardList className="h-4 w-4 text-cyan-300" />
            Class roster
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-wide text-zinc-500" htmlFor="classroom-alias">
              Learner alias
            </label>
            <div className="flex gap-2">
              <input
                id="classroom-alias"
                value={newAlias}
                onChange={event => setNewAlias(event.target.value)}
                placeholder="e.g., Bluebird 4"
                className="flex-1 rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              />
              <Button
                type="button"
                onClick={handleAddStudent}
                className="h-10 px-4 bg-cyan-500/90 hover:bg-cyan-500 text-slate-950"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-zinc-500">
              Use classroom-friendly aliases only (no full names or student IDs).
            </p>
          </div>
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {students.length === 0 ? (
              <p className="text-xs text-zinc-500">No learners yet. Add aliases to build the roster.</p>
            ) : (
              students.map(student => {
                const dnaEntry = rosterDnaProfiles.find((entry) => entry.student.id === student.id);
                const dnaProfile = dnaEntry?.profile ?? null;
                const modeReason = dnaProfile ? explainRecommendedMode(dnaProfile) : null;
                const topMode = dnaProfile ? rankDnaModes(dnaProfile, 1)[0] : null;
                return (
                  <div
                    key={student.id}
                    className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-zinc-100">{student.alias}</p>
                        <p className="text-[11px] text-zinc-500">Joined {new Date(student.addedAt).toLocaleDateString()}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-rose-400 hover:bg-rose-500/10"
                        onClick={() => handleRemoveStudent(student.id)}
                        aria-label={`Remove ${student.alias}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {dnaProfile && (
                      <>
                        <StudentDNACard profile={dnaProfile} compact />
                        {topMode && topMode.affinity > 0 && (
                          <p className="text-[11px] text-cyan-200/85">
                            Best next fit: {DNA_MODE_LABELS[topMode.mode]}. {modeReason}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
            <ClipboardList className="h-4 w-4 text-emerald-300" />
            Activity assignments
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wide text-zinc-500" htmlFor="classroom-assignment">
              Activity title
            </label>
            <input
              id="classroom-assignment"
              value={newTitle}
              onChange={event => setNewTitle(event.target.value)}
              placeholder="e.g., 5-minute breathing ritual"
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs uppercase tracking-wide text-zinc-500" htmlFor="classroom-focus">
                  Focus area
                </label>
                <input
                  id="classroom-focus"
                  value={newFocus}
                  onChange={event => setNewFocus(event.target.value)}
                  placeholder="Mindfulness"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-zinc-500" htmlFor="classroom-minutes">
                  Target minutes
                </label>
                <input
                  id="classroom-minutes"
                  type="number"
                  min={1}
                  value={newTargetMinutes}
                  onChange={event => setNewTargetMinutes(Number(event.target.value))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs uppercase tracking-wide text-zinc-500" htmlFor="classroom-dna-mode">
                  DNA mode
                </label>
                <select
                  id="classroom-dna-mode"
                  value={newDnaMode ?? ''}
                  onChange={event => setNewDnaMode(event.target.value === '' ? null : event.target.value as DnaMode)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  <option value="">None</option>
                  {(Object.entries(DNA_MODE_LABELS) as [string, string][]).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-zinc-500" htmlFor="classroom-standards">
                  Standards (opt.)
                </label>
                <input
                  id="classroom-standards"
                  value={newStandardsRef}
                  onChange={event => setNewStandardsRef(event.target.value)}
                  placeholder="e.g., NGSS:MS-ETS1-1"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
            </div>
            <Button
              type="button"
              onClick={handleAddAssignment}
              className="w-full h-10 bg-emerald-500/90 hover:bg-emerald-500 text-slate-950"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add assignment
            </Button>
          </div>
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {selectedAssignmentModeFilter && (
              <div className="flex items-center justify-between rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-3 py-2">
                <p className="text-xs text-cyan-100">
                  Filtering assignments by {DNA_MODE_LABELS[selectedAssignmentModeFilter]}.
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-7 px-2 text-xs text-cyan-200 hover:bg-cyan-500/10"
                  onClick={() => setSelectedAssignmentModeFilter(null)}
                >
                  Clear
                </Button>
              </div>
            )}
            {filteredAssignments.length === 0 ? (
              <p className="text-xs text-zinc-500">
                {selectedAssignmentModeFilter ? 'No assignments match this DNA mode yet.' : 'Assignments appear here once created.'}
              </p>
            ) : (
              filteredAssignments.map(assignment => {
                const inQueue = queue.some(l => l.title === assignment.title);
                const bulkQueued = bulkQueuedLessons[assignment.title];
                return (
                  <div
                    key={assignment.id}
                    className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-sm space-y-1"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-zinc-100">{assignment.title}</p>
                        <p className="text-xs text-zinc-500">
                          {assignment.focus} · {assignment.targetMinutes} min
                          {assignment.dnaMode && ` · ${DNA_MODE_LABELS[assignment.dnaMode]}`}
                        </p>
                        {assignment.standardsRef && (
                          <p className="text-[10px] text-emerald-400/70 mt-0.5">{assignment.standardsRef}</p>
                        )}
                        {bulkQueued && inQueue && (
                          <p className="text-[10px] text-cyan-300/85 mt-0.5">
                            Bulk queued via {DNA_MODE_LABELS[bulkQueued.mode]} in {bulkQueued.batchLabel} at {new Date(bulkQueued.queuedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          className={`h-8 px-2 text-xs ${inQueue ? 'text-emerald-400' : 'text-cyan-400 hover:bg-cyan-500/10'}`}
                          onClick={() => {
                            if (!inQueue) queueAssignment(assignment);
                          }}
                          disabled={inQueue}
                          aria-label={inQueue ? 'Already in queue' : 'Add to queue'}
                        >
                          <ListOrdered className="h-3.5 w-3.5 mr-1" />
                          {inQueue ? 'Queued' : 'Queue'}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-rose-400 hover:bg-rose-500/10"
                          onClick={() => handleRemoveAssignment(assignment.id)}
                          aria-label={`Remove ${assignment.title}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-200">Roster-wide Digital DNA utility</h3>
            <p className="text-xs text-zinc-500">Use learning-pattern signals to plan groups, sequencing, and next activities.</p>
          </div>
          <Compass className="h-5 w-5 text-cyan-300" />
        </div>

        {rosterDnaSummary.profileCount === 0 ? (
          <p className="text-xs text-zinc-500">Roster-wide DNA planning appears after learners complete Digital DNA activity time.</p>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-3 text-sm">
              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                <p className="text-xs text-zinc-500">Profiles available</p>
                <p className="text-lg font-semibold text-zinc-100">{rosterDnaSummary.profileCount}</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                <p className="text-xs text-zinc-500">Total interactions</p>
                <p className="text-lg font-semibold text-zinc-100">{rosterDnaSummary.totalInteractions}</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                <p className="text-xs text-zinc-500">Avg. reflection depth</p>
                <p className="text-lg font-semibold text-zinc-100">{Math.round(rosterDnaSummary.averageReflectionDepth * 100)}%</p>
              </div>
            </div>

            <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 space-y-3">
              <div className="flex items-center gap-2 text-cyan-200">
                <Activity className="h-4 w-4" />
                <p className="text-sm font-semibold">Dominant class modes</p>
              </div>
              {rosterDnaSummary.dominantModes.length === 0 ? (
                <p className="text-xs text-zinc-500">No dominant mode yet. Learners need more Digital DNA time.</p>
              ) : (
                <div className="space-y-2">
                  {rosterDnaSummary.dominantModes.map(([mode, count]) => (
                    <div key={mode} className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-zinc-100">{DNA_MODE_LABELS[mode]}</p>
                          <p className="text-xs text-zinc-400">{count} learner{count === 1 ? '' : 's'} currently lean toward this mode.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="h-8 border-slate-700 text-xs"
                            onClick={() => setSelectedAssignmentModeFilter((current) => current === mode ? null : mode)}
                          >
                            {selectedAssignmentModeFilter === mode ? 'Clear filter' : 'Filter assignments'}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-8 border-cyan-500/40 text-cyan-200 text-xs hover:bg-cyan-500/10"
                            onClick={() => queueAssignmentsForMode(mode)}
                          >
                            Queue matching
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {groupingSuggestions.length > 0 && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 space-y-2">
                <p className="text-sm font-semibold text-amber-200">Suggested pairings</p>
                {groupingSuggestions.map((suggestion) => (
                  <p key={suggestion} className="text-xs text-amber-100/85">{suggestion}</p>
                ))}
              </div>
            )}

            <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-violet-200">Group presets</p>
                <div className="flex flex-wrap gap-2">
                  {(['pairs', 'triads', 'support-circles'] as GroupingPreset[]).map((preset) => (
                    <Button
                      key={preset}
                      type="button"
                      variant="outline"
                      className={`h-8 text-xs ${selectedGroupingPreset === preset ? 'border-violet-400 text-violet-100 bg-violet-500/10' : 'border-slate-700'}`}
                      onClick={() => setSelectedGroupingPreset(preset)}
                    >
                      {preset === 'pairs' ? 'Pairs' : preset === 'triads' ? 'Triads' : 'Support circles'}
                    </Button>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 border-violet-400/40 text-violet-100 text-xs hover:bg-violet-500/10"
                    onClick={handleCopyGroupingPlan}
                    disabled={!groupingExportText}
                  >
                    Create groups text
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 border-cyan-400/40 text-cyan-100 text-xs hover:bg-cyan-500/10"
                    onClick={handleCopyTeacherNotes}
                  >
                    Copy all teacher notes
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 border-emerald-400/40 text-emerald-100 text-xs hover:bg-emerald-500/10"
                    onClick={() => openTeacherNotesPreview('txt')}
                  >
                    Download .txt
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 border-emerald-400/40 text-emerald-100 text-xs hover:bg-emerald-500/10"
                    onClick={() => openTeacherNotesPreview('md')}
                  >
                    Download .md
                  </Button>
                </div>
              </div>
              {groupingPlans[selectedGroupingPreset].length === 0 ? (
                <p className="text-xs text-zinc-500">More learner DNA activity is needed before this grouping preset can be suggested.</p>
              ) : (
                <div className="space-y-2">
                  {groupingPlans[selectedGroupingPreset].map((plan) => (
                    <p key={plan} className="text-xs text-violet-100/85">{plan}</p>
                  ))}
                  <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-[11px] text-violet-100/75 whitespace-pre-wrap">
                    {groupingExportText || 'No group export available yet.'}
                  </pre>
                  {groupExportMessage && (
                    <p className="text-[11px] text-violet-200/85">{groupExportMessage}</p>
                  )}
                  {teacherNotesMessage && (
                    <p className="text-[11px] text-cyan-200/85">{teacherNotesMessage}</p>
                  )}
                  {downloadMessage && (
                    <p className="text-[11px] text-emerald-200/85">{downloadMessage}</p>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-200">Progress tracking</h3>
            <p className="text-xs text-zinc-500">Track progress without storing personal identifiers.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="border-slate-700"
            onClick={resetProgress}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset progress
          </Button>
        </div>
        {assignments.length === 0 ? (
          <p className="text-xs text-zinc-500">Create assignments to start tracking progress.</p>
        ) : (
          <div className="space-y-4">
            {assignments.map(assignment => (
              <div key={assignment.id} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">{assignment.title}</p>
                    <p className="text-xs text-zinc-500">
                      {assignment.focus} · {assignment.targetMinutes} min
                    </p>
                  </div>
                  <div className="text-xs text-zinc-400">
                    {analytics.assignments.find(item => item.id === assignment.id)?.completeCount ?? 0} / {students.length} complete
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {students.length === 0 ? (
                    <p className="text-xs text-zinc-500">Add learners to capture progress.</p>
                  ) : (
                    students.map(student => (
                      <div key={student.id} className="flex items-center justify-between gap-2">
                        <span className="text-sm text-zinc-200">{student.alias}</span>
                        <select
                          value={progress[assignment.id]?.[student.id] ?? DEFAULT_STATUS}
                          onChange={event => updateStatus(assignment.id, student.id, event.target.value as ProgressStatus)}
                          className="rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                        >
                          <option value="not-started">Not started</option>
                          <option value="in-progress">In progress</option>
                          <option value="complete">Complete</option>
                        </select>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Education Queue */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
            <ListOrdered className="h-4 w-4 text-amber-300" />
            Lesson Queue
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-slate-700 text-xs"
            onClick={() => setShowQueue(!showQueue)}
          >
            {showQueue ? 'Hide' : 'Show'} Queue ({queue.length})
          </Button>
        </div>
        {bulkQueuedBatches.length > 0 && (
          <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 space-y-2">
            <p className="text-xs font-semibold text-cyan-200">Bulk-added queue items</p>
            {bulkQueuedBatches.map(({ record, titles }) => (
              <div key={`${record.batchLabel}-${record.queuedAt}-${record.mode}`} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={record.batchLabel}
                    onChange={(event) => renameBulkQueueBatch(record, event.target.value)}
                    className="min-w-[12rem] rounded-md border border-slate-700 bg-slate-950/70 px-2 py-1 text-xs text-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    aria-label="Rename bulk queue batch"
                  />
                  <p className="text-xs font-medium text-cyan-100">
                    {DNA_MODE_LABELS[record.mode]} - {new Date(record.queuedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </p>
                </div>
                <p className="text-xs text-cyan-100/80">{titles.join(', ')}</p>
              </div>
            ))}
          </div>
        )}
        {showQueue && <EducationQueuePanel mode="teacher" />}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-zinc-200">Aggregated analytics</h3>
          <p className="text-xs text-zinc-500">
            Analytics are stored as anonymized totals (no names or IDs).
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              <p className="text-xs text-zinc-500">Learners</p>
              <p className="text-lg font-semibold text-zinc-100">{analytics.totalStudents}</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              <p className="text-xs text-zinc-500">Assignments</p>
              <p className="text-lg font-semibold text-zinc-100">{analytics.totalAssignments}</p>
            </div>
            <div className="col-span-2 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              <p className="text-xs text-zinc-500">Completion rate</p>
              <p className="text-lg font-semibold text-zinc-100">{Math.round(analytics.completionRate * 100)}%</p>
            </div>
          </div>
          <div className="space-y-2">
            {analytics.assignments.length === 0 ? (
              <p className="text-xs text-zinc-500">Analytics will appear after adding assignments.</p>
            ) : (
              analytics.assignments.map(entry => (
                <div key={entry.id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                  <p className="text-sm font-medium text-zinc-100">{entry.title}</p>
                  <p className="text-xs text-zinc-500">
                    {entry.completeCount} complete · {entry.inProgressCount} in progress · {entry.notStartedCount} not started
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-zinc-200">Reset controls</h3>
          <p className="text-xs text-zinc-500">
            Reset data locally if you are sharing a device or closing out a term.
          </p>
          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              className="w-full border-slate-700"
              onClick={resetProgress}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset progress only
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full border-slate-700"
              onClick={resetAnalytics}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Clear aggregated analytics
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full border-rose-500 text-rose-300 hover:bg-rose-500/10"
              onClick={resetClassroom}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Reset classroom data
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={showTeacherNotesPreview} onOpenChange={setShowTeacherNotesPreview}>
        <DialogContent className="max-w-3xl border-emerald-500/30 bg-slate-950/95 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-emerald-100">Teacher Notes Preview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wide text-zinc-500" htmlFor="teacher-notes-class-name">
                  Class name for filename
                </label>
                <input
                  id="teacher-notes-class-name"
                  value={exportClassName}
                  onChange={(event) => setExportClassName(event.target.value)}
                  placeholder="e.g., homeroom-a"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-zinc-300">
                {exportFileName}
              </div>
            </div>
            <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-[12px] text-zinc-100 whitespace-pre-wrap">
              {teacherNotesExportText}
            </pre>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-slate-700"
                onClick={() => setShowTeacherNotesPreview(false)}
              >
                Close
              </Button>
              <Button
                type="button"
                className="bg-emerald-500/90 hover:bg-emerald-500 text-slate-950"
                onClick={() => downloadTeacherNotes(pendingExportExtension)}
              >
                Download .{pendingExportExtension}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
