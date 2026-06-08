export const EMISSION_SOURCES = [
  { label: 'Diesel (generator)', scope: 1, unit: 'liters', ef: 2.68, ref: 'DEFRA 2023' },
  { label: 'Petrol (motor vehicles)', scope: 1, unit: 'liters', ef: 2.31, ref: 'DEFRA 2023' },
  { label: 'LPG Gas (cooking/boiler)', scope: 1, unit: 'kg', ef: 2.98, ref: 'IPCC AR6' },
  { label: 'CNG Gas', scope: 1, unit: 'm³', ef: 2.02, ref: 'IPCC AR6' },
  { label: 'Coal', scope: 1, unit: 'kg', ef: 2.42, ref: 'IPCC AR6' },
  { label: 'Grid electricity (Vietnam)', scope: 2, unit: 'kWh', ef: 0.4937, ref: 'MONRE VN 2022' },
  { label: 'Purchased steam', scope: 2, unit: 'GJ', ef: 66.3, ref: 'GHG Protocol' },
  { label: 'R-22 (refrigerant leakage)', scope: 1, unit: 'kg', ef: 1810, ref: 'IPCC AR6 GWP100' },
  { label: 'R-410A (refrigerant leakage)', scope: 1, unit: 'kg', ef: 2088, ref: 'IPCC AR6 GWP100' },
  { label: 'Custom entry', scope: 1, unit: '—', ef: 0, ref: '' },
]

export const DEPT_OPTIONS = [
  'Sales & Business Development',
  'Operations & Production',
  'Finance & Accounting',
  'Human Resources',
  'Information Technology',
  'Marketing',
  'Executive Management',
  'Other',
]

export const PURPOSE_OPTIONS = [
  'Client meeting / negotiation',
  'Conference / seminar',
  'Internal training',
  'Project inspection',
  'Other',
]

/** kg CO₂e per km for ground travel on business trip */
export const EMP_GROUND = [
  { value: 0.041, label: 'Train (EF 0.041)' },
  { value: 0.027, label: 'Coach / bus (EF 0.027)' },
  { value: 0.192, label: 'Petrol sedan (EF 0.192)' },
  { value: 0.245, label: 'SUV / 7-seater (EF 0.245)' },
  { value: 0.05, label: 'Electric vehicle (EF 0.050)' },
  { value: 0.074, label: 'Motorbike (EF 0.074)' },
  { value: 0, label: 'None' },
]

export const HOTEL_OPTIONS = [
  { value: 10, label: 'Company guesthouse (10 kg/night)' },
  { value: 12, label: 'Hostel / budget stay (12 kg/night)' },
  { value: 20, label: '3-star hotel (20 kg/night)' },
  { value: 28, label: '4-star hotel (28 kg/night)' },
  { value: 38, label: '5-star hotel (38 kg/night)' },
]

export const CABIN_OPTIONS = [
  { value: 0.133, label: 'Economy' },
  { value: 0.2, label: 'Prem. Economy' },
  { value: 0.266, label: 'Business' },
  { value: 0.532, label: 'First' },
]

export const COMMUTE_VEHICLES = [
  { value: 0.0, label: 'Walking / cycling (0)' },
  { value: 0.074, label: 'Petrol motorbike (0.074)' },
  { value: 0.05, label: 'Electric motorbike (0.050)' },
  { value: 0.192, label: 'Personal petrol car (0.192)' },
  { value: 0.05, label: 'Electric car (0.050)' },
  { value: 0.027, label: 'Bus (0.027)' },
  { value: 0.041, label: 'Metro / light rail (0.041)' },
  { value: 0.192, label: 'Taxi / Ride-hail (0.192)' },
]

export const UNIT_OPTIONS = ['liters', 'kg', 'm³', 'kWh', 'GJ', 'tonnes', '—']

/** Transport / costs on a business trip (excluding flights) */
export const TRIP_TRANSPORT_TYPES = [
  { value: 'fuel', label: 'Fuel refill (liters × count)' },
  { value: 'car', label: 'Car / vehicle (km × EF)' },
  { value: 'grab', label: 'Ride-hail / Taxi' },
  { value: 'train', label: 'Train / coach' },
  { value: 'ground', label: 'Other (km × EF)' },
]
