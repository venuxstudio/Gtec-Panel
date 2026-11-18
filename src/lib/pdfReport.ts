import { format, parseISO } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { calculateDurationMetrics, formatReadableDate } from './duration';
import { AttendanceRecord, BRANCHES, Course, Student } from '../types';

function addFooterPageNumbers(
  doc: jsPDF,
  trainerName: string,
  trainerDesignation: string
) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const trainerText = trainerDesignation
    ? `Trainer: ${trainerName} (${trainerDesignation}) · G-TEC Trainer Panel`
    : `Trainer: ${trainerName} · G-TEC Trainer Panel`;

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, pageHeight - 13, pageWidth - 14, pageHeight - 13);
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(trainerText, 14, pageHeight - 7.5);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, pageHeight - 7.5, {
      align: 'right',
    });
  }
}

function getStudentSoftwareRows(student: Student, courses: Course[]) {
  const c1 = courses.find((c) => c.id === student.course1Id);
  const c2 = student.course2Id
    ? courses.find((c) => c.id === student.course2Id)
    : undefined;

  return [
    ...(c1?.softwares || []).map((sw) => ({
      key: `c1:${sw.shortName}`,
      courseShort: student.course1Short,
      shortName: sw.shortName,
      fullName: sw.fullName,
      completed: student.completedSoftwares.includes(`c1:${sw.shortName}`),
    })),
    ...(c2?.softwares || []).map((sw) => ({
      key: `c2:${sw.shortName}`,
      courseShort: student.course2Short,
      shortName: sw.shortName,
      fullName: sw.fullName,
      completed: student.completedSoftwares.includes(`c2:${sw.shortName}`),
    })),
  ];
}

function getAttendanceStats(records: AttendanceRecord[]) {
  const present = records.filter((r) => r.status === 'present').length;
  const late = records.filter((r) => r.status === 'late').length;
  const absent = records.filter((r) => r.status === 'absent').length;
  const excused = records.filter((r) => r.status === 'excused').length;
  const total = records.length;
  const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
  return { present, late, absent, excused, total, rate };
}

export function exportStudentPdfReport(params: {
  student: Student;
  courses: Course[];
  attendanceRecords: AttendanceRecord[];
  trainerName: string;
  trainerDesignation: string;
  branchSchedule?: string;
}) {
  const {
    student,
    courses,
    attendanceRecords,
    trainerName,
    trainerDesignation,
    branchSchedule,
  } = params;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const branchInfo = BRANCHES[student.branch];
  const resolvedSchedule = branchSchedule?.trim() || branchInfo.scheduleLabel;
  const metrics = calculateDurationMetrics(
    student.joiningDate,
    student.totalDurationDays,
    student.status
  );
  const swRows = getStudentSoftwareRows(student, courses);
  const completedSwCount = swRows.filter((s) => s.completed).length;
  const attStats = getAttendanceStats(attendanceRecords);

  // Header Banner
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('G-TEC Trainer Panel', 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(167, 243, 208);
  doc.text('Student Attendance & Course Progress Report', 14, 19);

  doc.setTextColor(203, 213, 225);
  doc.setFontSize(8.5);
  doc.text(
    `Generated: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`,
    pageWidth - 14,
    12,
    { align: 'right' }
  );
  doc.text(
    `${branchInfo.name} (${resolvedSchedule})`,
    pageWidth - 14,
    19,
    { align: 'right' }
  );

  // Section 1: Student & Course Summary
  let cursorY = 36;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('1. Student & Enrollment Details', 14, cursorY);

  const courseDisplay = student.course2Id
    ? `${student.course1Short} (${student.course1Full}) + ${student.course2Short} (${student.course2Full})`
    : `${student.course1Short} — ${student.course1Full}`;

  autoTable(doc, {
    startY: cursorY + 3,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2.6, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 38, fillColor: [248, 250, 252] },
      1: { cellWidth: 53 },
      2: { fontStyle: 'bold', cellWidth: 38, fillColor: [248, 250, 252] },
      3: { cellWidth: 53 },
    },
    body: [
      ['Student Name', student.name, 'Reg. No.', student.regNo || '—'],
      ['Branch', `${branchInfo.name} (${resolvedSchedule})`, 'Contact', student.contact],
      ['Date of Joining', formatReadableDate(student.joiningDate), 'Est. End Date', formatReadableDate(metrics.endDateStr)],
      ['Exam Date', student.examDate ? formatReadableDate(student.examDate) : 'Not scheduled', 'Status', student.status === 'completed' ? 'Completed' : 'Ongoing'],
      ['Duration Progress', `${metrics.daysLeft}d left · ${metrics.progressPct}% (${metrics.statusLabel})`, 'Trainer', trainerName],
      [
        'Enrolled Course(s)',
        { content: courseDisplay, colSpan: 3 },
      ],
    ],
  });

  cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // Section 2: Software Modules Progress
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `2. Software Modules (${completedSwCount}/${swRows.length} Completed)`,
    14,
    cursorY
  );

  autoTable(doc, {
    startY: cursorY + 3,
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 8.5 },
    styles: { fontSize: 8.5, cellPadding: 2.4, textColor: [30, 41, 59] },
    head: [['#', 'Short Code', 'Software Name', 'Course', 'Status']],
    body:
      swRows.length > 0
        ? swRows.map((sw, idx) => [
            String(idx + 1),
            sw.shortName,
            sw.fullName,
            sw.courseShort,
            sw.completed ? 'Completed' : 'Active',
          ])
        : [['—', '—', 'No software modules linked to this course', '—', '—']],
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 4) {
        const val = String(data.cell.raw);
        if (val === 'Completed') {
          data.cell.styles.textColor = [185, 28, 28];
          data.cell.styles.fontStyle = 'bold';
        } else if (val === 'Active') {
          data.cell.styles.textColor = [21, 128, 61];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  if (cursorY > 235) {
    doc.addPage();
    cursorY = 18;
  }

  // Section 3: Attendance Summary & Log
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('3. Attendance Summary & Daily Log', 14, cursorY);

  autoTable(doc, {
    startY: cursorY + 3,
    theme: 'grid',
    styles: { fontSize: 8.5, halign: 'center', cellPadding: 2.5 },
    headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
    head: [['Attendance Rate', 'Total Marked', 'Present', 'Late', 'Absent', 'Excused']],
    body: [
      [
        `${attStats.rate}%`,
        String(attStats.total),
        String(attStats.present),
        String(attStats.late),
        String(attStats.absent),
        String(attStats.excused),
      ],
    ],
  });

  cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;

  const sortedAttendance = [...attendanceRecords].sort((a, b) =>
    b.date.localeCompare(a.date)
  );

  autoTable(doc, {
    startY: cursorY,
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 8.5 },
    styles: { fontSize: 8.5, cellPadding: 2.3, textColor: [30, 41, 59] },
    head: [['Date', 'Day', 'Status', 'Remark']],
    body:
      sortedAttendance.length > 0
        ? sortedAttendance.map((rec) => {
            let dayName = '';
            try {
              dayName = format(parseISO(rec.date), 'EEE');
            } catch {
              dayName = '';
            }
            return [
              rec.date,
              dayName,
              rec.status.charAt(0).toUpperCase() + rec.status.slice(1),
              rec.remark || '—',
            ];
          })
        : [['—', '—', 'No attendance records logged', '—']],
  });

  if (student.notes && student.notes.trim().length > 0) {
    let notesY =
      (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    if (notesY > 265) {
      doc.addPage();
      notesY = 18;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text('4. Trainer Remarks', 14, notesY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    const wrapped = doc.splitTextToSize(student.notes.trim(), pageWidth - 28);
    doc.text(wrapped, 14, notesY + 5);
  }

  addFooterPageNumbers(doc, trainerName, trainerDesignation);

  const safeName =
    student.name.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'Student';
  const todaySlug = format(new Date(), 'yyyy-MM-dd');
  doc.save(`GTEC_Report_${safeName}_${todaySlug}.pdf`);
}

export function exportBatchPdfReport(params: {
  title: string;
  subtitle: string;
  filePrefix: string;
  students: Student[];
  courses: Course[];
  attendanceByStudentId: Record<string, AttendanceRecord[]>;
  trainerName: string;
  trainerDesignation: string;
}) {
  const {
    title,
    subtitle,
    filePrefix,
    students,
    courses,
    attendanceByStudentId,
    trainerName,
    trainerDesignation,
  } = params;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Banner
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 26, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(`G-TEC Trainer Panel — ${title}`, 14, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(167, 243, 208);
  doc.text(subtitle, 14, 18.5);

  doc.setTextColor(203, 213, 225);
  doc.setFontSize(8.5);
  doc.text(
    `Generated: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`,
    pageWidth - 14,
    11,
    { align: 'right' }
  );
  doc.text(
    `Records Included: ${students.length}`,
    pageWidth - 14,
    18.5,
    { align: 'right' }
  );

  const ongoingCount = students.filter((s) => s.status === 'ongoing').length;
  const completedCount = students.filter((s) => s.status === 'completed').length;
  const examScheduledCount = students.filter((s) => Boolean(s.examDate)).length;

  autoTable(doc, {
    startY: 32,
    theme: 'grid',
    styles: { fontSize: 8.5, halign: 'center', cellPadding: 2.2 },
    headStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
    head: [['Total Students', 'Ongoing', 'Completed', 'Exams Scheduled']],
    body: [
      [
        String(students.length),
        String(ongoingCount),
        String(completedCount),
        String(examScheduledCount),
      ],
    ],
  });

  const startTableY =
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;

  autoTable(doc, {
    startY: startTableY,
    theme: 'striped',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 8.3 },
    styles: { fontSize: 8, cellPadding: 2.2, textColor: [30, 41, 59] },
    head: [
      [
        '#',
        'Reg. No.',
        'Student Name',
        'Branch',
        'Course(s)',
        'Contact',
        'Joined',
        'Exam Date',
        'Course Progress',
        'Softwares',
        'Attendance',
      ],
    ],
    body:
      students.length > 0
        ? students.map((student, index) => {
            const metrics = calculateDurationMetrics(
              student.joiningDate,
              student.totalDurationDays,
              student.status
            );
            const swRows = getStudentSoftwareRows(student, courses);
            const swDone = swRows.filter((s) => s.completed).length;
            const records = attendanceByStudentId[student.id] || [];
            const att = getAttendanceStats(records);

            return [
              String(index + 1),
              student.regNo || '—',
              student.name,
              student.branch,
              student.course2Short
                ? `${student.course1Short} + ${student.course2Short}`
                : student.course1Short,
              student.contact,
              student.joiningDate,
              student.examDate || '—',
              `${metrics.daysLeft}d left (${metrics.progressPct}%)`,
              swRows.length > 0 ? `${swDone}/${swRows.length} done` : '—',
              att.total > 0 ? `${att.rate}% (${att.present + att.late}/${att.total})` : 'No logs',
            ];
          })
        : [['—', '—', 'No student records match the current selection', '', '', '', '', '', '', '', '']],
  });

  addFooterPageNumbers(doc, trainerName, trainerDesignation);

  const todaySlug = format(new Date(), 'yyyy-MM-dd');
  doc.save(`${filePrefix}_${todaySlug}.pdf`);
}
