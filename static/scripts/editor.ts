declare var CodeMirror: any;

import Split from 'split.js'
import init, { lint, format } from '../../pkg/pest_site.js';
import {initShareButton} from "./shareButton";

let loaded = false;

const outputDom = document.querySelector<HTMLTextAreaElement>(".editor-output")!;
const formatBtn = document.querySelector<HTMLButtonElement>("#formatBtn")!;

let windowHeight = window.innerHeight;
var current_data = null;

CodeMirror.defineSimpleMode("pest", {
  start: [
    { regex: /"/, token: "string", next: "string" },
    { regex: /'(?:[^'\\]|\\(?:[nrt0'"]|x[\da-fA-F]{2}|u\{[\da-fA-F]{6}\}))'/, token: "string" },
    { regex: /\/\/.*/, token: "comment" },
    { regex: /\d+/, token: "number" },
    { regex: /[~|*+?&!]|(\.\.)/, token: "operator" },
    { regex: /[a-zA-Z_]\w*/, token: "variable" },
    { regex: /=/, next: "mod" }
  ],
  mod: [
    { regex: /\{/, next: "start" },
    { regex: /[_@!$]/, token: "operator-2" },
  ],
  string: [
    { regex: /"/, token: "string", next: "start" },
    { regex: /(?:[^\\"]|\\(?:.|$))*/, token: "string" }
  ],
  meta: {
    dontIndentStates: ["comment"],
    lineComment: "//"
  }
});

CodeMirror.registerHelper("lint", "pest", function (text) {
  if (loaded) {
    var doc = CodeMirror.Doc(text);
    var errors = lint(text);
    var mapped: { message: string, from: number, to: number }[] = [];

    for (var i = 0; i < errors.length; i++) {
      var from = doc.clipPos(eval("CodeMirror.Pos" + errors[i].get("from")));
      var to = doc.clipPos(eval("CodeMirror.Pos" + errors[i].get("to")));

      if (from.line === to.line && from.ch === to.ch) {
        to.ch += 1;
        to = doc.clipPos(to);
      }

      if (from.line === to.line && from.ch === to.ch) {
        from.ch -= 1;
        from = doc.clipPos(from);
      }

      mapped.push({
        message: errors[i].get("message"),
        from: from,
        to: to
      });
    }

    return mapped;
  } else {
    return [];
  }
});

var grammar = document.getElementsByClassName("editor-grammar")[0];
var myCodeMirror = CodeMirror.fromTextArea(grammar, {
  mode: "pest",
  lint: "pest",
  theme: "pest",
  placeholder: "Grammar",
});

initShareButton({myCodeMirror});


global.set_current_data = function() {
  if (current_data) {
    const select = document.querySelector<HTMLSelectElement>(".editor-input-select")!;

    for (var i = 0; i < select.options.length; i++) {
      if (select.options[i].value === current_data["rule"]) {
        select.selectedIndex = i;
        var event = new Event('change');
        select.dispatchEvent(event);
        break;
      }
    }

    var input = document.querySelector<HTMLTextAreaElement>(".editor-input-text")!;
    input.value = current_data["input"];

    current_data = null;
  }
}

function doFormat() {
  if (!loaded || !myCodeMirror) {
    return
  }

  let grammar = myCodeMirror.getValue();
  let formatted = format(grammar);
  myCodeMirror.setValue(formatted);
}

let sizes = JSON.parse(localStorage.getItem('split-sizes') ?? "[33, 33, 33]");
if (!Array.isArray(sizes) || sizes.length !== 3) {
  console.warn("Invalid split sizes", sizes);
  sizes = [33, 33, 33];
}

function wideMode() {
  myCodeMirror.setSize(null, outputDom.clientHeight);
  Split(['.CodeMirror', '.editor-input', '.output-wrapper'], {
    sizes,
    onDragEnd: function (_sizes) {
      sizes = _sizes;
      localStorage.setItem('split-sizes', JSON.stringify(sizes))
    },
  })
  window.scrollTo(0, document.body.scrollHeight);
}

// whne the document loads, enable wide mode
wideMode();

formatBtn.onclick = doFormat;

init().then(() => loaded = true);