import { Plugin } from "obsidian";
import { checkboxSnippet, choiceSnippet, radioSnippet } from "./snippets";
import { renderQuiz } from "./renderer";

export default class QuizBlocksPlugin extends Plugin {
	onload() {
		this.registerMarkdownCodeBlockProcessor("quiz", async (source, el, ctx) => {
			await renderQuiz({
				app: this.app,
				component: this,
				source,
				el,
				ctx,
			});
		});

		this.addCommand({
			id: "insert-quiz-block-radio",
			name: "Insert quiz (radio)",
			editorCallback: (editor) => {
				editor.replaceRange(radioSnippet, editor.getCursor());
			},
		});

		this.addCommand({
			id: "insert-quiz-block-checkbox",
			name: "Insert quiz (checkbox)",
			editorCallback: (editor) => {
				editor.replaceRange(checkboxSnippet, editor.getCursor());
			},
		});

		this.addCommand({
			id: "insert-quiz-block-choice",
			name: "Insert quiz (choice)",
			editorCallback: (editor) => {
				editor.replaceRange(choiceSnippet, editor.getCursor());
			},
		});
	}
}
