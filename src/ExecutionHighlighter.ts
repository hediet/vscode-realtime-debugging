import {
	Uri,
	window,
	TextEditor,
	Range,
	TextEditorDecorationType,
} from "vscode";

export class ExecutionHighlighter {
	private readonly highlighter = new Highlighter();

	highlight(uri: Uri, line: number): void {
		for (const editor of window.visibleTextEditors) {
			if (editor.document.uri.toString() !== uri.toString()) {
				continue;
			}
			const range = editor.document.lineAt(line).range;
			this.highlighter.highlight(editor, range);
		}
	}
}

export class Highlighter {
	private lastHighlight: Highlight | undefined;

	highlight(editor: TextEditor, range: Range): void {
		if (this.lastHighlight) {
			this.lastHighlight.deprecate();
		}
		this.lastHighlight = new Highlight(editor, range, () => {});
	}
}

class Highlight {
	private type: TextEditorDecorationType | undefined;

	constructor(
		private readonly textEditor: TextEditor,
		private readonly range: Range,
		onHide: () => void
	) {
		this.type = window.createTextEditorDecorationType({
			backgroundColor: "orange",
		});
		textEditor.setDecorations(this.type, [range]);

		setTimeout(() => {
			this.dispose();
			onHide();
		}, 1000);
	}

	deprecate() {
		if (this.type) {
			this.type.dispose();
			this.type = window.createTextEditorDecorationType({
				backgroundColor: "yellow",
			});
			this.textEditor.setDecorations(this.type, [this.range]);
		}
	}

	dispose() {
		if (this.type) {
			this.type.dispose();
		}
		this.type = undefined;
	}
}
