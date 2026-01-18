import { Plugin } from "obsidian";
import { checkboxSnippet, choiceSnippet, noodleSnippet, radioSnippet, textSnippet } from "./snippets";
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
			id: "quiz-block-insert-radio",
			name: "Insert radio",
			editorCallback: (editor) => {
				editor.replaceRange(radioSnippet, editor.getCursor());
			},
		});

		this.addCommand({
			id: "quiz-block-insert-checkbox",
			name: "Insert checkbox",
			editorCallback: (editor) => {
				editor.replaceRange(checkboxSnippet, editor.getCursor());
			},
		});

		this.addCommand({
			id: "quiz-block-insert-text",
			name: "Insert text",
			editorCallback: (editor) => {
				editor.replaceRange(textSnippet, editor.getCursor());
			},
		});

		this.addCommand({
			id: "quiz-block-insert-choice",
			name: "Insert choice",
			editorCallback: (editor) => {
				editor.replaceRange(choiceSnippet, editor.getCursor());
			},
		});

		this.addCommand({
			id: "quiz-block-insert-noodle",
			name: "Insert noodle",
			editorCallback: (editor) => {
				editor.replaceRange(noodleSnippet, editor.getCursor());
			},
		});
	}
}
