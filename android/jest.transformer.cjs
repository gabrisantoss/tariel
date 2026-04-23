const path = require("path");
const { transformSync } = require("@babel/core");

function requireFromNodeModules(relativePath) {
  return require(path.join(__dirname, "node_modules", relativePath));
}

const ts = requireFromNodeModules("typescript");
const transformFlowStripTypes = requireFromNodeModules(
  "@babel/plugin-transform-flow-strip-types/lib/index.js",
);
const hermesParser = requireFromNodeModules(
  "babel-plugin-syntax-hermes-parser/dist/index.js",
);
const transformFlowEnums = requireFromNodeModules(
  "babel-plugin-transform-flow-enums/index.js",
);

function isReactNativeJestFile(filename) {
  return /node_modules[/\\]react-native[/\\]jest[/\\].+\.js$/.test(filename);
}

function isReactNativeFlowSupportFile(filename) {
  return (
    /node_modules[/\\]react-native[/\\].+\.js$/.test(filename) ||
    /node_modules[/\\]@react-native[/\\].+\.js$/.test(filename)
  );
}

function buildFlowStripPlugins(filename) {
  const plugins = [];
  if (isReactNativeFlowSupportFile(filename)) {
    plugins.push(
      [
        hermesParser,
        {
          parseLangTypes: "flow",
          reactRuntimeTarget: "19",
        },
      ],
      transformFlowEnums,
      transformFlowStripTypes,
    );
  }

  return plugins;
}

function transpileWithTypeScript(src, filename) {
  const isJsxLike =
    filename.endsWith(".tsx") ||
    filename.endsWith(".jsx") ||
    filename.endsWith(".js");
  return ts.transpileModule(src, {
    compilerOptions: {
      allowJs: true,
      esModuleInterop: true,
      jsx: isJsxLike ? ts.JsxEmit.ReactJSX : ts.JsxEmit.Preserve,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: filename,
    reportDiagnostics: false,
  }).outputText;
}

function isTestFile(filename) {
  return /\.test\.[jt]sx?$/.test(filename);
}

function hoistJestMocks(src) {
  const callNames = [
    "jest.mock(",
    "jest.unmock(",
    "jest.enableAutomock(",
    "jest.disableAutomock(",
    "jest.deepUnmock(",
  ];
  const blocks = [];
  let cursor = 0;
  let output = "";

  while (cursor < src.length) {
    const nextIndexes = callNames
      .map((name) => ({ name, index: src.indexOf(name, cursor) }))
      .filter((entry) => entry.index !== -1)
      .sort((left, right) => left.index - right.index);

    if (!nextIndexes.length) {
      output += src.slice(cursor);
      break;
    }

    const { index } = nextIndexes[0];
    output += src.slice(cursor, index);

    let position = index;
    let depth = 0;
    let inString = false;
    let stringQuote = "";
    let escaped = false;
    let inLineComment = false;
    let inBlockComment = false;

    for (; position < src.length; position += 1) {
      const char = src[position];
      const nextChar = src[position + 1];

      if (inLineComment) {
        if (char === "\n") {
          inLineComment = false;
        }
        continue;
      }

      if (inBlockComment) {
        if (char === "*" && nextChar === "/") {
          inBlockComment = false;
          position += 1;
        }
        continue;
      }

      if (inString) {
        if (escaped) {
          escaped = false;
          continue;
        }
        if (char === "\\") {
          escaped = true;
          continue;
        }
        if (char === stringQuote) {
          inString = false;
          stringQuote = "";
        }
        continue;
      }

      if (char === "/" && nextChar === "/") {
        inLineComment = true;
        position += 1;
        continue;
      }

      if (char === "/" && nextChar === "*") {
        inBlockComment = true;
        position += 1;
        continue;
      }

      if (char === "'" || char === '"' || char === "`") {
        inString = true;
        stringQuote = char;
        continue;
      }

      if (char === "(") {
        depth += 1;
        continue;
      }

      if (char === ")") {
        depth -= 1;
        if (depth === 0) {
          position += 1;
          while (position < src.length && /\s/.test(src[position])) {
            position += 1;
          }
          if (src[position] === ";") {
            position += 1;
          }
          while (position < src.length && /\s/.test(src[position])) {
            position += 1;
          }
          blocks.push(src.slice(index, position).trimEnd());
          cursor = position;
          break;
        }
      }
    }

    if (cursor < index) {
      output += src.slice(index);
      break;
    }
  }

  if (!blocks.length) {
    return src;
  }

  return `${blocks.join("\n")}\n${output.trimStart()}`;
}

module.exports = {
  process(src, filename) {
    const flowPlugins = buildFlowStripPlugins(filename);
    const normalizedSource = flowPlugins.length
      ? transformSync(src, {
          babelrc: false,
          configFile: false,
          filename,
          plugins: flowPlugins,
          sourceMaps: false,
          sourceType: "unambiguous",
        }).code
      : src;

    const transpiledCode = transpileWithTypeScript(
      normalizedSource || src,
      filename,
    );
    const hoistedCode = isTestFile(filename)
      ? hoistJestMocks(transpiledCode)
      : transpiledCode;

    return {
      code: hoistedCode || transpiledCode,
      map: null,
    };
  },
};
