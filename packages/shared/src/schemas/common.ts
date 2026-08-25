import { z } from "zod";

/** Plain calendar date, "YYYY-MM-DD" — the wire format for every date field in the system. */
export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ամսաթիվը պետք է լինի YYYY-MM-DD ձևաչափով։");
