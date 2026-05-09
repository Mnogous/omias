import dayjs, { type Dayjs } from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

export const DATE_FORMAT = 'DD-MM-YYYY';
export const DATE_FORMAT_API = 'YYYY-MM-DD';

export function formatDate(value: string | Date | Dayjs | null | undefined): string {
  if (!value) return '—';
  const d = dayjs(value);
  return d.isValid() ? d.format(DATE_FORMAT) : '—';
}

export function formatDateTime(value: string | Date | Dayjs | null | undefined): string {
  if (!value) return '—';
  const d = dayjs(value);
  return d.isValid() ? d.format(`${DATE_FORMAT} HH:mm`) : '—';
}

export function toApiDate(value: Dayjs | null | undefined): string | null {
  return value && value.isValid() ? value.format(DATE_FORMAT_API) : null;
}
