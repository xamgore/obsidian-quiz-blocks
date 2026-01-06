import yaml from "js-yaml";
import { QuizSchema, type Quiz } from "./schemas";

export function parseQuizBlock(source: string): Quiz {
	const raw = source.trim();
	if (!raw) throw new Error("Empty quiz block.");

	let parsed: unknown;
	try {
		parsed = yaml.load(raw, { schema: yaml.JSON_SCHEMA });
	} catch (e) {
		throw new Error(`Failed to parse quiz block as YAML.\n${String(e)}`);
	}

	return QuizSchema.parse(parsed);
}
