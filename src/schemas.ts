import { z } from "zod";

export const nullToUndefined = <T extends z.ZodType>(schema: T) =>
	z.preprocess((v) => (v === null ? undefined : v), schema.optional());

const optionalIdSchema = z.preprocess((v) => {
	if (v === undefined || v === null) return undefined;
	return typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' ? String(v) : v;
}, z.string().min(1).optional());

export const QuizSectionSchema = z.object({
	id: optionalIdSchema,
	color: nullToUndefined(z.string()).optional(),

})

export const QuizOptionSchema = z.preprocess((input) => {
	if (typeof input !== "object" || input === null) return input;

	const obj = input as Record<string, unknown>;
	const content = obj.content ?? obj.text ?? obj.answer ?? obj.option;
	const id = obj.id ?? content ?? undefined;

	return { ...obj, id, content };
}, z.object({
	id: optionalIdSchema,
	correct: nullToUndefined(z.boolean()).default(false),
	content: nullToUndefined(z.string()).default(""),
	feedback: nullToUndefined(z.string()).optional(),
}));

export const QuizChoiceQuestionSchema = z.preprocess((input) => {
	if (typeof input !== "object" || input === null) return input;

	const obj = input as Record<string, unknown>;
	const content = obj.content ?? obj.text ?? obj.question;
	const correct_option =
		obj.correct_option ?? obj.correctOption ?? obj.correct ?? obj.correctId ?? obj.correct_option_id;

	return { ...obj, content, correct_option };
}, z.object({
	id: optionalIdSchema,
	content: nullToUndefined(z.string()).default(""),
	correct_option: optionalIdSchema,
	feedback: nullToUndefined(z.string()).optional(),
}));

/* quiz types */

const QuizRadioSchema = z.object({
	id: optionalIdSchema,
	type: z.literal("radio"),
	content: z.string().default(""),
	options: z.array(QuizOptionSchema),
});

const QuizCheckboxSchema = z.object({
	id: optionalIdSchema,
	type: z.literal("checkbox"),
	content: z.string().default(""),
	options: z.array(QuizOptionSchema),
});

const QuizChoiceSchema = z
	.object({
		id: optionalIdSchema,
		type: z.literal("choice"),
		content: z.string().default(""),
		options: z.array(QuizOptionSchema),
		questions: z.array(QuizChoiceQuestionSchema),
	})
	.superRefine((quiz, ctx) => {
		// Choice quizzes require ids for option lookup.
		const ids = new Set<string>();
		quiz.options.forEach((opt, i) => {
			if (!opt.id) {
				ctx.addIssue({
					code: 'custom',
					message: `options[${i}].id is required for choice quizzes`,
					path: ["options", i, "id"],
				});
				return;
			}

			if (ids.has(opt.id)) {
				ctx.addIssue({
					code: 'custom',
					message: `Duplicate option id: ${opt.id}`,
					path: ["options", i, "id"],
				});
			}
			ids.add(opt.id);
		});

		quiz.questions.forEach((q, i) => {
			if (q.correct_option && !ids.has(q.correct_option)) {
				ctx.addIssue({
					code: 'custom',
					message: `questions[${i}].correct_option references unknown option id: ${q.correct_option}`,
					path: ["questions", i, "correct_option"],
				});
			}
		});
	});

export const QuizSchema = z.preprocess((input) => {
	if (typeof input !== "object" || input === null) return input;

	const obj = input as Record<string, unknown>;
	const content = obj.content ?? obj.text ?? obj.question;

	return { ...obj, content };
}, z.discriminatedUnion("type", [QuizRadioSchema, QuizCheckboxSchema, QuizChoiceSchema]));

export type QuizOption = z.infer<typeof QuizOptionSchema>;
export type QuizChoiceQuestion = z.infer<typeof QuizChoiceQuestionSchema>;
export type Quiz = z.infer<typeof QuizSchema>;
