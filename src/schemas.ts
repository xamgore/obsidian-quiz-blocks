import { z } from "zod";

export const nullToUndefined = <T extends z.ZodType>(schema: T) =>
	z.preprocess((v) => (v === null ? undefined : v), schema.optional());

export const QuizSectionSchema = z.object({
	id: nullToUndefined(z.string()),
	color: nullToUndefined(z.string()).optional(),

})

export const QuizOptionSchema = z.preprocess((input) => {
	if (typeof input !== "object" || input === null) return input;

	const obj = input as Record<string, unknown>;
	const content = obj.content ?? obj.text ?? obj.answer ?? obj.option;

	return { ...obj, content };
}, z.object({
	id: nullToUndefined(z.string()),
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
	content: nullToUndefined(z.string()).default(""),
	correct_option: z.string({ error: "correct_option is required for choice questions" }),
	feedback: nullToUndefined(z.string()).optional(),
}));

/* quiz types */

const QuizRadioSchema = z.object({
	id: z.string().optional(),
	type: z.literal("radio"),
	content: z.string().default(""),
	options: z.array(QuizOptionSchema),
});

const QuizCheckboxSchema = z.object({
	id: z.string().optional(),
	type: z.literal("checkbox"),
	content: z.string().default(""),
	options: z.array(QuizOptionSchema),
});

const QuizChoiceSchema = z
	.object({
		id: z.string().optional(),
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
			if (!ids.has(q.correct_option)) {
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
