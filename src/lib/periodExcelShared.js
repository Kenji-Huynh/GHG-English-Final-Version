/** Sheet names & column headers — must match export / import / template */

import { COMPANIES } from './companies.js'

export const EXCEL_SHEET = {
  overview: 'Overview',
  office: 'Office S1-S2',
  trip: 'Business Trips S3.6',
  commute: 'Commute S3.7',
}

/** Single Option column — matches Lark & web dropdown */
export const EXCEL_COL_COMPANY = 'Company'

export const EXCEL_OFFICE_HEADERS = [
  'Equipment',
  EXCEL_COL_COMPANY,
  'Emission Source',
  'Scope',
  'Unit',
  'Volume',
  'EF (kg CO₂e/unit)',
  'EF Reference',
  'Total GHG (tonnes CO₂e)',
]

export const EXCEL_TRIP_HEADERS = [
  'Full Name',
  'Emp ID',
  EXCEL_COL_COMPANY,
  'Department',
  'Trip Name',
  'Purpose',
  'From',
  'To',
  'Departure Date',
  'Return Date',
  'CO₂ flight (kg)',
  'CO₂ ground (kg)',
  'CO₂ accommodation (kg)',
  'Total (kg CO₂e)',
]

export const EXCEL_COMMUTE_HEADERS = [
  'Full Name',
  'Emp ID',
  EXCEL_COL_COMPANY,
  'Department',
  'Vehicle',
  'EF (kg/km)',
  'One-way km',
  'Working days / month',
  'WFH (days/month)',
  'Carpool (people)',
  'CO₂e (kg)',
]

/** Max rows with formulas (template / SUM) */
export const EXCEL_FORMULA_LAST_ROW = 200

/** Column A label in Overview sheet — default company on import */
export const EXCEL_OVERVIEW_COMPANY_LABEL = 'Company (period default)'
/** @deprecated legacy file */
export const EXCEL_OVERVIEW_COMPANY_LABEL_LEGACY = 'Company name / entity'
export const EXCEL_OVERVIEW_LOCATION_LABEL = 'Location / Facility'

/** List for Data Validation dropdown in Excel */
export const EXCEL_COMPANY_LIST = [...COMPANIES]

/** Excel formula: "ECS,LEONG LEE,..." */
export const EXCEL_COMPANY_LIST_FORMULA = `"${EXCEL_COMPANY_LIST.join(',')}"`

/** Optional columns when importing older Excel files (no Company / EF column yet) */
export const EXCEL_OPTIONAL_COLUMNS = [EXCEL_COL_COMPANY, 'EF (kg/km)']

/** Export file before Company column was added */
export const EXCEL_OFFICE_HEADERS_LEGACY = [
  'Equipment',
  'Emission Source',
  'Scope',
  'Unit',
  'Volume',
  'EF (kg CO₂e/unit)',
  'EF Reference',
  'Total GHG (tonnes CO₂e)',
]

export const EXCEL_TRIP_HEADERS_LEGACY = [
  'Full Name',
  'Emp ID',
  'Department',
  'Trip Name',
  'Purpose',
  'From',
  'To',
  'Departure Date',
  'Return Date',
  'CO₂ flight (kg)',
  'CO₂ ground (kg)',
  'CO₂ accommodation (kg)',
  'Total (kg CO₂e)',
]

export const EXCEL_COMMUTE_HEADERS_LEGACY = [
  'Full Name',
  'Emp ID',
  'Department',
  'Vehicle',
  'One-way km',
  'Working days / month',
  'WFH (days/month)',
  'Carpool (people)',
  'CO₂e (kg)',
]
