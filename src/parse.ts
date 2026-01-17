import { parse } from "yaml";
import { type Quiz, QuizSchema } from "./schemas";

export function parseQuizBlock(source: string): Quiz {
	const raw = source.trim();
	if (!raw) throw new Error("Empty quiz block.");

	let parsed: unknown;
	try {
		parsed = parse(raw, { schema: 'core', logLevel: 'error', stringKeys: true });
	} catch (e) {
		throw new Error(`Failed to parse quiz block as YAML.\n${String(e)}`);
	}

	return QuizSchema.parse(parsed);
}
