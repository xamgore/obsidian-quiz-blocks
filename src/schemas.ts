import { z } from "zod";

export const nullToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
	z.preprocess((v) => (v === null ? undefined : v), schema.optional());

export const QuizSectionSchema = z.object({
	id: nullToUndefined(z.string()),
	color: nullToUndefined(z.string()).optional(),

})

export const QuizOptionSchema = z.preprocess((input) => {
	if (typeof input !== "object" || input === null) return input;

	const obj = input as Record<string, unknown>;
	const content = obj.content ?? obj.text ?? obj.answer ?? obj.option;

	// return a normalized copy
	return { ...obj, content };
}, z.object({
	id: nullToUndefined(z.string()),
	correct: nullToUndefined(z.boolean()).default(false),
	content: nullToUndefined(z.string()).default(""),
	feedback: nullToUndefined(z.string()).optional(),
}));

export const QuizSchema = z.preprocess((input) => {
	if (typeof input !== "object" || input === null) return input;

	const obj = input as Record<string, unknown>;
	const content = obj.content ?? obj.text ?? obj.question;

	// return a normalized copy
	return { ...obj, content };
}, z.object({
	id: z.string().optional(),
	type: z.enum(["radio", "checkbox"], {
		error: (iss) =>
			iss.input === undefined
				? "type field is required"
				: "type must be one of: radio, checkbox",
	}),
	content: z.string().default(""),
	options: z.array(QuizOptionSchema),
}));

export type QuizOption = z.infer<typeof QuizOptionSchema>;
export type Quiz = z.infer<typeof QuizSchema>;
