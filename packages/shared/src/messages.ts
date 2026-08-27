/**
 * Every user-facing Armenian string, centralized so API validation errors and web/mobile
 * inline errors render byte-identical text. Ported verbatim from
 * reference/mrk_prototype_1.jsx wherever the prototype had a string.
 *
 * NOTE: the source prototype and technical brief consistently spell "day" as "oր" (Latin
 * "o") rather than "օր" (Armenian Օ) throughout — kept verbatim here since it's used
 * identically hundreds of times across both source documents; flagged to the product owner
 * rather than silently "corrected" in a legal-adjacent document.
 *
 * Two spots in the prototype ("2,5-ամյա uzman ժամկետ", "uzarko {n} oր", "ընթացիկ/uzarko
 * արձակուրդից") contained garbled placeholder text ("uzman"/"uzarko" are not Armenian or
 * English words) — those are cleaned up to plain Armenian below rather than propagated,
 * since they read as an editing artifact rather than deliberate wording.
 */

import { MIN_CHUNK_DAYS } from "./constants.js";
import type { RequestType } from "./types.js";

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  VACATION: "Ամենամյա արձակուրդ",
  UNPAID: "Անվճար արձակուրդ",
  SICK: "Հիվանդության թերթիկ",
  DAYOFF: "Ազատ oր",
};

export const PRIORITY_LABELS = {
  under18: "Մինչև 18 տարեկան",
  parentOrPregnant: "Հղի / մինչև 14 տ. երեխայի ծնող",
  teacher: "Մանկավարժ (միայն ամառ)",
  caregiver: "Հիվանդ/հաշմանդամ անձի խնամող",
  violenceVictim: "Բռնության/ոտնձգության զոհ",
} as const;

export const validationMessages = {
  invalidDates: "Խնդրում ենք ընտրել վավեր ամսաթվեր (ավարտը չի կարող լինել սկզբից առաջ)։",
  startInPast: "Հայտ-դիմումի սկիզբը չի կարող լինել անցյալում։",
  overlap: "Այս ժամանակահատվածն արդեն համընկնում է Ձեր մեկ այլ հայտ-դիմումի հետ։",
  noticeTooShort:
    "Ամենամյա արձակուրդի հայտ-դիմումը պետք է ուղարկվի սկզբից առնվազն 5 oր առաջ (հոդված 169-ի վճարման ժամկետը պահպանելու համար)։",
  processingWindowTooShort:
    "Ձեր նշած ամսաթվերի դեպքում ՄՌԿ մասնագետին ու հաշվապահին կմնա 2-ից քիչ աշխատանքային oր՝ հրամանը կազմելու և վճարումն ավարտելու համար (հոդված 169-ի՝ սկզբից 3 oր առաջ վճարման ժամկետը հաշվի առնելով)։ Խնդրում ենք ուղարկել հայտ-դիմումը մի քանի oր ավելի շուտ։",
  chunkRuleViolation: (remainingAfter: number) =>
    `Այս հայտ-դիմումից հետո Ձեր ընթացիկ աշխատանքային տարվա մնացորդը կդառնա ${remainingAfter} oր (10 oրից պակաս կամ հավասար)։ Օրենքով (հոդված 163) մասնակի արձակուրդի դեպքում գոնե մեկ հատված պետք է կազմի առնվազն ${MIN_CHUNK_DAYS} աշխատանքային oր, հետևաբար այս մնացորդով դա այլևս հնարավոր չի լինի ապահովել։ Մեծացրեք հայտ-դիմումի oրերի քանակը, կամ դիմեք ՄՌԿ մասնագետին։`,
  rejectionNoteRequired: "Մերժման դեպքում հիմնավորումը պարտադիր է։",
  recallRequestedEndMustPrecedeOriginalEnd: "Վաղաժամկետ վերադարձի ամսաթիվը պետք է լինի սկզբնական ավարտից առաջ։",
} as const;

export const notifications = {
  newRequestForDirector: (employeeName: string, typeLabel: string, days: number) =>
    `${employeeName}՝ նոր հայտ-դիմում (${typeLabel}, ${days} oր) սպասում է հաստատման։`,
  approvedForEmployee: (startHY: string, endHY: string) =>
    `Ձեր հայտ-դիմումը (${startHY}–${endHY}) հաստատվել է տնօրենի կողմից։ Ձեր մնացորդը թարմացվել է։`,
  rejectedForEmployee: (startHY: string, endHY: string, note: string) =>
    `Ձեր հայտ-դիմումը (${startHY}–${endHY}) մերժվել է. «${note}»`,
  orderPendingForHR: (employeeName: string) => `${employeeName}՝ հաստատված հայտ-դիմումը սպասում է հրամանի կազմման։`,
  orderSignedForEmployee: (orderNumber: string, email: string) =>
    `Հրաման ${orderNumber} ստորագրված է և ուղարկված Ձեր էլ. փոստին (${email})՝ PDF տարբերակով։`,
  orderSignedForHR: (orderNumber: string, employeeName: string, hrEmail: string) =>
    `Հրաման ${orderNumber} ուղարկվել է ${employeeName}-ին և ձեր էլ. փոստին (${hrEmail})։`,
  reminderForHR: (employeeName: string, daysRemaining: number) =>
    `${employeeName}՝ 2,5 տարի է՝ չի ուղարկել արձակուրդի հայտ-դիմում (մնացած ${daysRemaining} oր)։`,
  reminderForEmployee: (daysRemaining: number) =>
    `Հիշեցում. Ձեր արձակուրդի հայտ-դիմումի ներկայացման ժամկետը մոտենում է (մնացած ${daysRemaining} oր)։`,
  hrScheduledForEmployee: (startHY: string, days: number) =>
    `ՄՌԿ մասնագետը Ձեզ համար նշանակել է արձակուրդ՝ ${startHY}-ից, ${days} oր (հոդված 164.10)։`,
  hrScheduledForHR: (employeeName: string) => `${employeeName}-ի արձակուրդը նշանակված է, սպասում է հրամանի կազմման։`,
  recallRequestedForEmployee: (newEndHY: string) =>
    `ՄՌԿ-ն խնդրում է Ձեր համաձայնությունը արձակուրդից ${newEndHY}-ից վաղաժամկետ վերադառնալու համար։`,
  recallAcceptedForHR: (employeeName: string) => `${employeeName}-ն համաձայնվել է վաղաժամկետ վերադառնալ։ Կարող եք կազմել հրամանը։`,
  recallDeclinedForHR: (employeeName: string) => `${employeeName}-ը մերժել է վաղաժամկետ վերադարձի հայտ-դիմումը։`,
  recallFinalizedForEmployee: (delta: number) => `Հետկանչման հրամանը կազմված է. Ձեր մնացորդին վերադարձվել է ${delta} oր։`,
  balanceManuallyAdjusted: (next: number) => `Ձեր արձակուրդային մնացորդը ձեռքով ուղղվել է ${next} oրի (ՄՌԿ մասնագետի կողմից)։`,
  documentPendingEmployeeSignature: (title: string) => `«${title}» փաստաթուղթը սպասում է Ձեր ստորագրությանը։`,
  documentPendingDirectorSignature: (title: string, employeeName: string) =>
    `${employeeName}-ի ստորագրած «${title}» փաստաթուղթը սպասում է Ձեր ստորագրությանը։`,
  documentCompletedForEmployee: (title: string) => `«${title}» փաստաթուղթը ստորագրված է երկու կողմից և ավարտված է։`,
  documentCompletedForHR: (title: string, employeeName: string) =>
    `${employeeName}-ի «${title}» փաստաթուղթը ստորագրված է երկու կողմից և ավելացվել է Փաստաթղթերի գրադարան։`,
} as const;

export const historySteps = {
  submitted: "Հայտ-դիմումն ուղարկվել է",
  cancelledByEmployee: "Հայտ-դիմումը հետ է կանչվել աշխատողի կողմից",
  approvedByDirector: "Հաստատված է տնօրենի կողմից",
  rejectedByDirector: "Մերժված է տնօրենի կողմից",
  orderCreated: (orderNumber: string) => `Հրաման ${orderNumber} կազմված է`,
  orderSigned: (orderNumber: string, directorName: string) =>
    `Հրամանը ստորագրված է տնoրենի կողմից (${directorName}) և ուղարկված է PDF-ով էլ. փոստով`,
  hrScheduled: "Արձակուրդը նշանակվել է ՄՌԿ մասնագետի նախաձեռնությամբ (հոդված 164.10)",
  recallRequested: "ՄՌԿ մասնագետը հայտ-դիմում է ուղարկել վաղաժամկետ վերադարձի մասին",
  recallAccepted: "Աշխատողը համաձայնվել է վաղաժամկետ վերադարձին",
  recallDeclined: "Աշխատողը մերժել է վաղաժամկետ վերադարձի հայտ-դիմումը",
  recallOrderCreated: (orderNumber: string) => `Հետկանչման հրաման ${orderNumber} կազմված է. արձակուրդը կրճատված է`,
} as const;

export const ui = {
  reminderPanelTitle: "2,5-ամյա ժամկետ (հոդված 164.10)",
  reminderPanelBody:
    "Այս աշխատողները 2,5 տարի է՝ չեն ուղարկել արձակուրդի հայտ-դիմում։ Կարող եք ինքնուրույն նշանակել արձակուրդը՝ առանց աշխատողի հայտ-դիմումի։",
  recallSectionTitle: "Հետկանչել ընթացիկ/գալիք արձակուրդից",
} as const;
