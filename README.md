# IntEE

Your translations are your types.

## Why IntEE?

Most i18n libraries took a wrong turn somewhere.

They made you register namespaces, configure plugins, wrap your app in providers, learn their own interpolation syntax, and maintain separate type declaration files just to get autocompletion. Some solved the type safety problem by generating code. Others asked you to learn a new DSL. All of them grew complex enough to need a migration guide.

The root mistake was treating i18n as infrastructure — something to install, configure, and manage — rather than what it actually is: **loading the right data for the user's locale**.

IntEE does exactly that and nothing more. Your translations are plain objects. The match logic is a single function call. Types flow automatically because your data *is* the type. Lazy loading is opt-in per language, not a build-time concern. There's no runtime format string parser because you don't need one — template literals exist.

The result is an API small enough to read in five minutes and powerful enough to handle real apps. No config. No codegen. No magic. Just the right abstraction.

## Installation

```bash
npm install @nmnmcc/intee
# or
yarn add @nmnmcc/intee
```

React integration requires React ≥ 18 as a peer dependency.

## Usage

### Core

Define your languages and call `match` with the user's preferred locales:

```ts
import { match } from "@nmnmcc/intee"

const en = {
  tag: "en-US",
  data: {
    greeting: "Hello",
    farewell: "Goodbye",
  },
}

const zh = {
  tag: "zh-CN",
  // Lazy-loaded data — can be a sync or async function
  data: () => import("./languages/zh-CN").then(m => m.default),
}

// First language is the fallback
const result = await match(navigator.languages, en, zh)
console.log(result.greeting)
```

`match` returns a `DataPromise<T, D>` — a `Promise<D>` with `.tag` (the matched locale tag) and `.fallback` (synchronous access to the first language's data) properties.

### React

```tsx
import { createTranslation } from "@nmnmcc/intee/react"

const en = {
  tag: "en-US",
  data: { greeting: "Hello" },
}

const zh = {
  tag: "zh-CN",
  data: () => import("./languages/zh-CN").then(m => m.default),
}

const { useTranslation } = createTranslation(en, zh)

function App() {
  const [t, tag] = useTranslation() // uses navigator.languages by default
  return <h1 lang={tag}>{t.greeting}</h1>
}
```

`useTranslation` accepts an optional `tags` array to override the detected locales. It returns `[data, tag]` — rendering immediately with the fallback data and updating once the matched language loads.

## API

### `match(tags, ...languages)`

| Parameter   | Type         | Description                                    |
|-------------|--------------|------------------------------------------------|
| `tags`      | `string[]`   | BCP 47 locale tags in preference order         |
| `languages` | `Languages`  | Language definitions; first is the fallback    |

Returns `DataPromise<T, D>` — a `Promise<D>` with `.tag: T` (the matched locale) and `.fallback: D` (the first language's data, synchronously available) properties.

### `createTranslation(...languages)`

Returns `{ useTranslation(tags?: string[]): readonly [D, T] }`.

### Types

```ts
type Data = { [K in string]: string | Function | Data }

interface Language<T extends string, D extends Data> {
  readonly tag: T
  readonly data: D | (() => D) | (() => Promise<D>)
}
```

## License

MIT
