// =====================================================================
// Internationalization — English / Arabic / French (spec #45)
// RTL support for Arabic. Strings live in dictionaries below.
// =====================================================================

export type Locale = 'en' | 'ar' | 'fr'

export const LOCALES: Locale[] = ['en', 'ar', 'fr']
export const LOCALE_LABELS: Record<Locale, string> = { en: 'English', ar: 'العربية', fr: 'Français' }
export const RTL_LOCALES: Locale[] = ['ar']

type Dict = Record<string, string>

const en: Dict = {
  'nav.dashboard': 'Dashboard',
  'nav.patients': 'Patients',
  'nav.appointments': 'Appointments',
  'nav.calendar': 'Calendar',
  'nav.queue': 'Queue',
  'nav.doctors': 'Doctors',
  'nav.staff': 'Staff',
  'nav.services': 'Services',
  'nav.visits': 'Visits',
  'nav.prescriptions': 'Prescriptions',
  'nav.invoices': 'Invoices',
  'nav.payments': 'Payments',
  'nav.reports': 'Reports',
  'nav.audit': 'Audit Logs',
  'nav.settings': 'Settings',
  'nav.documents': 'Documents',
  'nav.labResults': 'Lab Results',
  'nav.followUps': 'Follow-ups',
  'nav.branches': 'Branches',
  'nav.waitingRoom': 'Waiting Room',
  'nav.onlineBooking': 'Online Booking',
  'nav.patientPortal': 'Patient Portal',
  'action.newPatient': 'New Patient',
  'action.newAppointment': 'New Appointment',
  'action.newInvoice': 'New Invoice',
  'action.checkIn': 'Check In',
  'action.callNext': 'Call Next',
  'action.save': 'Save',
  'action.cancel': 'Cancel',
  'action.edit': 'Edit',
  'action.delete': 'Delete',
  'action.print': 'Print',
  'action.search': 'Search',
  'action.logout': 'Logout',
  'label.today': 'Today',
  'label.revenue': 'Revenue',
  'label.waiting': 'Waiting',
  'label.completed': 'Completed',
  'label.cancelled': 'Cancelled',
  'label.outstanding': 'Outstanding',
  'label.totalPatients': 'Total Patients',
}

const ar: Dict = {
  'nav.dashboard': 'لوحة التحكم',
  'nav.patients': 'المرضى',
  'nav.appointments': 'المواعيد',
  'nav.calendar': 'التقويم',
  'nav.queue': 'قائمة الانتظار',
  'nav.doctors': 'الأطباء',
  'nav.staff': 'الموظفون',
  'nav.services': 'الخدمات',
  'nav.visits': 'الزيارات',
  'nav.prescriptions': 'الوصفات الطبية',
  'nav.invoices': 'الفواتير',
  'nav.payments': 'المدفوعات',
  'nav.reports': 'التقارير',
  'nav.audit': 'سجل التدقيق',
  'nav.settings': 'الإعدادات',
  'nav.documents': 'المستندات',
  'nav.labResults': 'نتائج المختبر',
  'nav.followUps': 'المتابعات',
  'nav.branches': 'الفروع',
  'nav.waitingRoom': 'غرفة الانتظار',
  'nav.onlineBooking': 'الحجز الإلكتروني',
  'nav.patientPortal': 'بوابة المريض',
  'action.newPatient': 'مريض جديد',
  'action.newAppointment': 'موعد جديد',
  'action.newInvoice': 'فاتورة جديدة',
  'action.checkIn': 'تسجيل الوصول',
  'action.callNext': 'استدعاء التالي',
  'action.save': 'حفظ',
  'action.cancel': 'إلغاء',
  'action.edit': 'تعديل',
  'action.delete': 'حذف',
  'action.print': 'طباعة',
  'action.search': 'بحث',
  'action.logout': 'تسجيل الخروج',
  'label.today': 'اليوم',
  'label.revenue': 'الإيرادات',
  'label.waiting': 'في الانتظار',
  'label.completed': 'مكتمل',
  'label.cancelled': 'ملغي',
  'label.outstanding': 'مستحق',
  'label.totalPatients': 'إجمالي المرضى',
}

const fr: Dict = {
  'nav.dashboard': 'Tableau de bord',
  'nav.patients': 'Patients',
  'nav.appointments': 'Rendez-vous',
  'nav.calendar': 'Calendrier',
  'nav.queue': 'File d\'attente',
  'nav.doctors': 'Médecins',
  'nav.staff': 'Personnel',
  'nav.services': 'Services',
  'nav.visits': 'Visites',
  'nav.prescriptions': 'Ordonnances',
  'nav.invoices': 'Factures',
  'nav.payments': 'Paiements',
  'nav.reports': 'Rapports',
  'nav.audit': 'Journal d\'audit',
  'nav.settings': 'Paramètres',
  'nav.documents': 'Documents',
  'nav.labResults': 'Résultats de laboratoire',
  'nav.followUps': 'Suivis',
  'nav.branches': 'Branches',
  'nav.waitingRoom': 'Salle d\'attente',
  'nav.onlineBooking': 'Réservation en ligne',
  'nav.patientPortal': 'Portail patient',
  'action.newPatient': 'Nouveau patient',
  'action.newAppointment': 'Nouveau rendez-vous',
  'action.newInvoice': 'Nouvelle facture',
  'action.checkIn': 'Enregistrer',
  'action.callNext': 'Suivant',
  'action.save': 'Enregistrer',
  'action.cancel': 'Annuler',
  'action.edit': 'Modifier',
  'action.delete': 'Supprimer',
  'action.print': 'Imprimer',
  'action.search': 'Rechercher',
  'action.logout': 'Déconnexion',
  'label.today': 'Aujourd\'hui',
  'label.revenue': 'Revenu',
  'label.waiting': 'En attente',
  'label.completed': 'Terminé',
  'label.cancelled': 'Annulé',
  'label.outstanding': 'En attente',
  'label.totalPatients': 'Total patients',
}

const DICTS: Record<Locale, Dict> = { en, ar, fr }

export function translate(key: string, locale: Locale = 'en'): string {
  return DICTS[locale]?.[key] ?? DICTS.en[key] ?? key
}

export function isRTL(locale: Locale): boolean {
  return RTL_LOCALES.includes(locale)
}
