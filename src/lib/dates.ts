import dayjs from "dayjs";

export function monthKey(date = new Date().toISOString()): string {
  return dayjs(date).format("YYYY-MM");
}

export function monthLabel(key: string): string {
  return dayjs(`${key}-01`).format("MMMM YYYY");
}

export function dateLabel(dateIso: string): string {
  return dayjs(dateIso).format("DD MMM YYYY");
}

export function timeLabel(dateIso: string): string {
  return dayjs(dateIso).format("HH:mm");
}

export function currencyLabel(amount: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(amount);
}
