export interface QuickShareMessageOptions {
  studentName?: string;
  courseName?: string;
  materials?: string[];
}

export function generateQuickShareMessage(options: QuickShareMessageOptions): string {
  const name = options.studentName?.trim() || '[Student Name]';
  const course = options.courseName?.trim() || '[Course Name]';

  return `Hello ${name},

Thank you for contacting Excel Computers.

We've shared the requested information for our ${course} course.

If you have any questions regarding the course, fees, batch timings, or admissions, please feel free to contact us. Our team will be happy to assist you.

Regards,
Excel Computers
Kolhapur`;
}
