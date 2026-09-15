// Employment types a job post can be — kept short and closed rather than
// free text, so the directory can filter by them.
export const EMPLOYMENT_TYPES = [
  { id: 'full_time', label: 'Full-time' },
  { id: 'part_time', label: 'Part-time' },
  { id: 'contract', label: 'Contract' },
  { id: 'seasonal', label: 'Seasonal' },
  { id: 'volunteer', label: 'Volunteer' },
];

export const employmentLabel = (id) => EMPLOYMENT_TYPES.find((t) => t.id === id)?.label || 'Full-time';
