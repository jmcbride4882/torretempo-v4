import { Request, Response, NextFunction, RequestHandler } from 'express';

const DEFAULT_START = 7;
const DEFAULT_END = 22;

function parseHour(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (Number.isFinite(parsed)) {
    return parsed;
  }
  return fallback;
}

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

function isWithinWorkHours(date: Date, startHour: number, endHour: number): boolean {
  const hour = date.getHours();
  if (startHour === endHour) {
    return true;
  }
  if (startHour < endHour) {
    return hour >= startHour && hour < endHour;
  }
  return hour >= startHour || hour < endHour;
}

export const rightToDisconnect: RequestHandler = (
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startHour = parseHour(
    process.env.RIGHT_TO_DISCONNECT_START_HOUR || process.env.WORK_HOURS_START,
    DEFAULT_START
  );
  const endHour = parseHour(
    process.env.RIGHT_TO_DISCONNECT_END_HOUR || process.env.WORK_HOURS_END,
    DEFAULT_END
  );

  const now = new Date();
  if (!isWithinWorkHours(now, startHour, endHour)) {
    res.status(403).json({
      error: `Right to Disconnect: swap requests can only be created between ${formatHour(
        startHour
      )} and ${formatHour(endHour)}`,
      code: 'RIGHT_TO_DISCONNECT',
      allowed_hours: {
        start: startHour,
        end: endHour,
      },
    });
    return;
  }

  next();
};
