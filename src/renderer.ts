import {
	App,
	MarkdownPostProcessorContext,
	MarkdownRenderer,
	Component,
	Notice,
} from "obsidian";
import { parseQuizBlock } from "./parse";
import type { Quiz } from "./schemas";

type RenderArgs = {
	app: App;
	component: Component;
	source: string;
	el: HTMLElement;
	ctx: MarkdownPostProcessorContext;
};

export async function renderQuiz({ app, component, source, el, ctx }: RenderArgs) {
	el.empty();

	let quiz: Quiz;
	try {
		quiz = parseQuizBlock(source);
	} catch (e) {
		const pre = el.createEl("pre", { cls: "quiz-block-error" });
		pre.textContent = String(e);
		return;
	}

	const section = ctx.getSectionInfo(el);
	const stableId =
		quiz.id ??
		[
			ctx.sourcePath ?? "unknown",
			section?.lineStart ?? "na",
			section?.lineEnd ?? "na",
			quiz.type,
		].join("|");

	const container = el.createDiv({ cls: "quiz-block" });
	container.dataset.quizId = stableId;

	const titleEl = container.createDiv({ cls: "quiz-title" });
	await renderInlineMarkdown(app, component, quiz.content, titleEl, ctx.sourcePath);

	if (quiz.type === "choice") {
		await renderChoiceQuiz({
			app,
			component,
			quiz,
			container,
			ctx,
			rerender: () => renderQuiz({ app, component, source, el, ctx }),
		});
		return;
	}

	const form = container.createEl("form", { cls: "quiz-form" });
	const groupName = `quiz-${hashToSafeName(stableId)}`;

	type Row = {
		id: string;
		input: HTMLInputElement;
		control: HTMLDivElement;
		feedbackEl: HTMLDivElement;
		correct: boolean;
		feedbackText?: string;
	};

	const rows: Row[] = [];
	let checked = false;

	for (const opt of quiz.options) {
		const rowWrap = form.createDiv({ cls: "quiz-option" });

		const label = rowWrap.createEl("label", { cls: "quiz-option-label" });

		// radio control + hidden input
		const mountControl = quiz.type === "checkbox" ? mountCheckbox : mountRadio;
		const { control, input } = mountControl(label, groupName, opt.id ?? opt.content);
		setRadioState(control, input, "unanswered");

		const textHost = label.createSpan({ cls: "quiz-option-text" });
		await renderInlineMarkdown(app, component, opt.content, textHost, ctx.sourcePath);

		const feedbackEl = rowWrap.createDiv({ cls: "quiz-option-feedback" });

		const row: Row = {
			id: opt.id ?? opt.content,
			input,
			control,
			feedbackEl,
			correct: opt.correct,
			feedbackText: opt.feedback,
		};
		rows.push(row);

		// Keep visuals in sync with selection BEFORE check
		input.addEventListener("change", () => {
			if (checked) return;
			for (const r of rows) {
				setRadioState(
					r.control,
					r.input,
					r.input.checked ? "unanswered_selected" : "unanswered"
				);
			}
		});
	}

	const actions = container.createDiv({ cls: "quiz-actions" });

	const checkBtn = actions.createEl("button", {
		text: "Check",
		cls: "quiz-check",
		attr: { type: "button" },
	});

	const resetBtn = actions.createEl("button", {
		text: "↻",
		cls: "quiz-reset is-hidden",
		attr: { type: "button", "aria-label": "Reset quiz", title: "Reset quiz" },
	});


	const clearState = () => {
		checked = false;

		for (const r of rows) {
			r.input.disabled = false;
			r.input.checked = false;

			setRadioState(r.control, r.input, "unanswered");

			r.feedbackEl.empty();
			r.feedbackEl.removeClass("is-correct", "is-wrong");
		}

		checkBtn.removeClass("is-hidden");
		resetBtn.addClass("is-hidden");
	};

	const showFeedback = async (row: Row, isCorrect: boolean) => {
		row.feedbackEl.empty();
		row.feedbackEl.toggleClass("is-correct", isCorrect);
		row.feedbackEl.toggleClass("is-wrong", !isCorrect);

		const text = row.feedbackText ?? "";
		if (!text.trim()) return;

		await MarkdownRenderer.render(app, text, row.feedbackEl, ctx.sourcePath, component);
		unwrapSingleParagraph(row.feedbackEl);
	};

	checkBtn.addEventListener("click", () => void onCheckClick().catch(console.error));

	async function onCheckClick() {
		const selectedRows = rows.filter((r) => r.input.checked);
		if (selectedRows.length === 0) return;

		checked = true;

		// disable inputs
		for (const r of rows) {
			r.input.disabled = true;
			r.feedbackEl.empty();
			r.feedbackEl.removeClass("is-correct", "is-wrong");
		}

		if (quiz.type === "radio") {
			const selected = selectedRows?.[0];

			for (const r of rows) {
				if (r.id === selected?.id && r.correct) setRadioState(r.control, r.input, "correct_selected");
				else if (r.id === selected?.id && !r.correct) setRadioState(r.control, r.input, "wrong_selected");
				else if (r.correct) setRadioState(r.control, r.input, "correct_not_selected");
				else setRadioState(r.control, r.input, "disabled_unselected");
			}

			if (selected) await showFeedback(selected, selected?.correct);

			const correctRow = rows.find((r) => r.correct);
			if (correctRow && correctRow !== selected) await showFeedback(correctRow, true);
		} else {
			// checkbox quiz (multi-select)
			for (const r of rows) {
				if (r.correct && r.input.checked) setRadioState(r.control, r.input, "correct_selected");
				else if (r.correct && !r.input.checked) setRadioState(r.control, r.input, "correct_not_selected");
				else if (!r.correct && r.input.checked) setRadioState(r.control, r.input, "wrong_selected");
				else setRadioState(r.control, r.input, "disabled_unselected");
			}

			// Feedback: for anything selected, and all correct answers
			for (const r of rows) {
				if (r.input.checked || r.correct) {
					await showFeedback(r, r.correct);
				}
			}
		}

		checkBtn.addClass("is-hidden");
		resetBtn.removeClass("is-hidden");
	}

	resetBtn.addEventListener("click", () => clearState());
}

function mountRadio(label: HTMLLabelElement, groupName: string, value: string) {
	const control = label.createDiv({
		cls: "radio radio_view_default quiz-form-choice__control",
	});

	const hidden = control.createSpan({ cls: "visually-hidden" });
	const input = hidden.createEl("input", {
		type: "radio",
		attr: { name: groupName, value, "aria-checked": "false" },
	});

	// icon host
	control.createDiv({ cls: "radio__icon-host" });

	return { control, input };
}

type RadioState =
	| "unanswered"
	| "unanswered_selected"
	| "correct_selected"
	| "correct_not_selected"
	| "wrong_selected"
	| "disabled_unselected";

function setRadioState(
	control: HTMLDivElement,
	input: HTMLInputElement,
	state: RadioState
) {
	control.removeClass(
		"radio_disabled",
		"radio_checked",
		"radio_view_default",
		"radio_view_outline",
		"quiz-radio--correct",
		"quiz-radio--wrong"
	);

	control.addClass("radio");

	const iconHost = control.querySelector(".radio__icon-host");
	if (iconHost) iconHost.empty();

	const set = (opts: {
		disabled: boolean;
		pseudoChecked: boolean;
		view: "default" | "outline";
		kind?: "correct" | "wrong";
		icon: "none" | "tick" | "minus" | "close";
	}) => {
		control.addClass(opts.view === "default" ? "radio_view_default" : "radio_view_outline");
		if (opts.disabled) control.addClass("radio_disabled");
		if (opts.pseudoChecked) control.addClass("radio_checked");
		if (opts.kind === "correct") control.addClass("quiz-radio--correct");
		if (opts.kind === "wrong") control.addClass("quiz-radio--wrong");

		input.disabled = opts.disabled;
		input.setAttr("aria-checked", opts.pseudoChecked ? "true" : "false");

		if (iconHost && opts.icon !== "none") {
			iconHost.appendChild(makeRadioIcon(opts.icon));
		}
	};

	switch (state) {
		case "unanswered":
			set({ disabled: false, pseudoChecked: false, view: "default", icon: "none" });
			break;

		case "unanswered_selected":
			set({ disabled: false, pseudoChecked: true, view: "default", icon: "tick" });
			break;

		case "correct_selected":
			set({
				disabled: true,
				pseudoChecked: true,
				view: "default",
				kind: "correct",
				icon: "tick",
			});
			break;

		case "correct_not_selected":
			set({
				disabled: true,
				pseudoChecked: true,
				view: "outline",
				kind: "correct",
				icon: "minus",
			});
			break;

		case "wrong_selected":
			set({
				disabled: true,
				pseudoChecked: true,
				view: "default",
				kind: "wrong",
				icon: "close",
			});
			break;

		case "disabled_unselected":
			set({ disabled: true, pseudoChecked: false, view: "default", icon: "none" });
			break;
	}
}

function makeRadioIcon(kind: "tick" | "minus" | "close") {
	const svgNS = "http://www.w3.org/2000/svg";
	const svg = document.createElementNS(svgNS, "svg");
	svg.setAttribute("class", "radio__icon");
	svg.setAttribute("width", "24");
	svg.setAttribute("height", "24");
	svg.setAttribute("viewBox", "0 0 24 24");
	svg.setAttribute("fill", "none");
	svg.setAttribute("aria-hidden", "true");

	if (kind === "tick") {
		const path = document.createElementNS(svgNS, "path");
		path.setAttribute("d", "M8.554 12.26l2.642 2.381 4.817-4.763");
		path.setAttribute("stroke", "currentColor");
		path.setAttribute("stroke-width", "2");
		path.setAttribute("stroke-miterlimit", "16");
		path.setAttribute("stroke-linecap", "round");
		svg.appendChild(path);
		return svg;
	}

	if (kind === "minus") {
		const rect = document.createElementNS(svgNS, "rect");
		rect.setAttribute("x", "6");
		rect.setAttribute("y", "11");
		rect.setAttribute("width", "12");
		rect.setAttribute("height", "2");
		rect.setAttribute("rx", "1");
		rect.setAttribute("fill", "currentColor");
		svg.appendChild(rect);
		return svg;
	}

	const path = document.createElementNS(svgNS, "path");
	path.setAttribute(
		"d",
		"M12.071 13.485L9.95 15.607a1 1 0 01-1.414-1.415l2.12-2.12-2.12-2.122A1 1 0 019.95 8.536l2.121 2.12 2.121-2.12a1 1 0 111.415 1.414l-2.122 2.121 2.122 2.121a1 1 0 01-1.415 1.415l-2.12-2.122z"
	);
	path.setAttribute("fill", "currentColor");
	svg.appendChild(path);
	return svg;
}

function mountCheckbox(label: HTMLLabelElement, groupName: string, value: string) {
	// Reuse the existing radio styling; CSS changes only the shape
	const control = label.createDiv({
		cls: "radio radio_view_default quiz-form-choice__control checkbox",
	});

	const hidden = control.createSpan({ cls: "visually-hidden" });
	const input = hidden.createEl("input", {
		type: "checkbox",
		attr: { name: groupName, value, "aria-checked": "false" },
	});

	control.createDiv({ cls: "radio__icon-host" });

	return { control, input };
}

type RenderChoiceArgs = {
	app: App;
	component: Component;
	quiz: Extract<Quiz, { type: "choice" }>;
	container: HTMLElement;
	ctx: MarkdownPostProcessorContext;
	rerender: () => Promise<void>;
};

async function renderChoiceQuiz(
	{
		app,
		component,
		quiz,
		container,
		ctx,
		rerender,
	}: RenderChoiceArgs
): Promise<void> {
	const questionsHost = container.createDiv({ cls: "quiz-choice" });

	// Precompute plain-text labels for <option> (since <option> can't host rich HTML).
	const optionLabel = new Map<string, string>();
	for (const opt of quiz.options) {
		const id = opt.id ?? opt.content;
		if (!id) continue;
		optionLabel.set(
			id,
			(await markdownToPlainText(app, component, opt.content, ctx.sourcePath)) || id
		);
	}

	type QRow = {
		select: HTMLSelectElement;
		resultHost: HTMLDivElement;
		correctOption?: string;
		feedbackText?: string;
	};

	const rows: QRow[] = [];

	for (const q of quiz.questions) {
		const qWrap = questionsHost.createDiv({ cls: "quiz-choice-question" });

		const qText = qWrap.createDiv({ cls: "quiz-choice-question-text" });
		await renderInlineMarkdown(app, component, q.content, qText, ctx.sourcePath);

		const select = qWrap.createEl("select", {
			cls: "quiz-choice-select",
			attr: { "aria-label": "Select an answer" },
		});
		select.createEl("option", { text: "...", value: "" });

		for (const opt of quiz.options) {
			const id = opt.id ?? opt.content;
			if (!id) continue;
			select.createEl("option", {
				value: id,
				text: optionLabel.get(id) ?? id,
			});
		}

		// On each select change: remove ... variant and update the button
		select.addEventListener("change", () => {
			// If user picked something, remove the placeholder "..." from THIS select.
			if (select.value) {
				const placeholder = select.querySelector('option[value=""]');
				placeholder?.remove();
			}
			updateCheckState();
		});

		const resultHost = qWrap.createDiv({ cls: "quiz-choice-result" });
		rows.push({
			select,
			resultHost,
			correctOption: q.correct_option,
			feedbackText: q.feedback,
		});
	}

	const actions = container.createDiv({ cls: "quiz-actions" });

	const checkBtn = actions.createEl("button", {
		text: "Check",
		cls: "quiz-check",
		attr: { type: "button" },
	});

	const resetBtn = actions.createEl("button", {
		text: "↻",
		cls: "quiz-reset is-hidden",
		attr: { type: "button", "aria-label": "Reset quiz", title: "Reset quiz" },
	});

	function updateCheckState() {
		const left = rows.reduce((acc, r) => acc + (r.select.value ? 0 : 1), 0);
		checkBtn.disabled = left !== 0;
		checkBtn.setText(left === 0 ? "Check" : `Check (${left} questions left)`);
	}

	updateCheckState(); // check button is disabled on start.

	checkBtn.addEventListener("click", () => void onCheckClick().catch(console.error));

	async function onCheckClick() {
		// All questions must be answered.
		const left = rows.filter((r) => !r.select.value).length;
		if (rows.some((r) => !r.select.value)) {
			new Notice(`${left} questions left.`);
			return;
		}

		for (const r of rows) {
			const selectedId = r.select.value;
			const isCorrect = selectedId === r.correctOption && typeof r.correctOption !== 'undefined';
			const selectedOpt = quiz.options.find((o) => (o.id ?? o.content) === selectedId);

			// consume answer: remove select, replace with answer block + feedback
			r.select.remove();
			r.resultHost.empty();

			const answer = r.resultHost.createDiv({ cls: "quiz-choice-answer" });
			answer.toggleClass("is-correct", isCorrect);
			answer.toggleClass("is-wrong", !isCorrect);

			if (selectedOpt) {
				await renderInlineMarkdown(app, component, selectedOpt.content, answer, ctx.sourcePath);
			} else {
				answer.setText(selectedId);
			}

			const fbText = r.feedbackText ?? "";
			if (fbText.trim()) {
				const fb = r.resultHost.createDiv({ cls: "quiz-choice-feedback" });
				fb.toggleClass("is-correct", isCorrect);
				fb.toggleClass("is-wrong", !isCorrect);
				await MarkdownRenderer.render(app, fbText, fb, ctx.sourcePath, component);
				unwrapSingleParagraph(fb);
			}
		}

		checkBtn.addClass("is-hidden");
		resetBtn.removeClass("is-hidden");
	}

	resetBtn.addEventListener("click", () => void rerender());
}

async function renderInlineMarkdown(
	app: App,
	component: Component,
	markdown: string,
	host: HTMLElement,
	sourcePath: string
) {
	const tmp = document.createElement("div");
	await MarkdownRenderer.render(app, markdown, tmp, sourcePath, component);

	if (tmp.childElementCount === 1 && tmp.firstElementChild?.tagName === "P") {
		const p = tmp.firstElementChild as HTMLParagraphElement;
		while (p.firstChild) host.appendChild(p.firstChild);
	} else {
		while (tmp.firstChild) host.appendChild(tmp.firstChild);
	}
}

async function markdownToPlainText(
	app: App,
	component: Component,
	markdown: string,
	sourcePath: string
) {
	// const tmp = document.createElement("div");
	// await MarkdownRenderer.render(app, markdown, tmp, sourcePath, component);
	// return (tmp.textContent ?? "").replace(/\s+/g, " ").trim();
	const tmp = document.createElement("div");
	await MarkdownRenderer.render(app, markdown, tmp, sourcePath, component);
	const content = (tmp.textContent ?? "").replace(/\s+/g, " ").trim();
	tmp.remove();
	return content;
}

function unwrapSingleParagraph(host: HTMLElement) {
	if (host.childElementCount === 1 && host.firstElementChild?.tagName === "P") {
		const p = host.firstElementChild as HTMLParagraphElement;
		const frag = document.createDocumentFragment();
		while (p.firstChild) frag.appendChild(p.firstChild);
		host.empty();
		host.appendChild(frag);
	}
}

function hashToSafeName(s: string) {
	let h = 2166136261;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return (h >>> 0).toString(16);
}
