export interface AppointmentDetails {
  patientName: string;
  phone: string;
  date: string;
  time: string;
  doctorName: string;
  branchName: string;
}

export function generateWhatsAppLink(template: string, details: AppointmentDetails): string {
  const text = template
    .replace(/\[PatientName\]/g, details.patientName)
    .replace(/\[Date\]/g, details.date)
    .replace(/\[Time\]/g, details.time)
    .replace(/\[DoctorName\]/g, details.doctorName)
    .replace(/\[BranchName\]/g, details.branchName);

  // Clean the phone number (strip spaces, ensure country code 20 for Egypt)
  let cleanPhone = details.phone.replace(/\D/g, '');
  if (cleanPhone.startsWith('01')) {
    cleanPhone = '20' + cleanPhone; // Prefix with Egypt country code
  } else if (cleanPhone.startsWith('1')) {
    cleanPhone = '20' + cleanPhone;
  }

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

export const DEFAULT_WHATSAPP_TEMPLATE = 
  `مرحباً يا [PatientName]، بنفكرك بميعاد حجوزاتك في عيادتنا ([BranchName]) يوم [Date] الساعة [Time] مع دكتور [DoctorName]. شرفنا في الميعاد.`;
