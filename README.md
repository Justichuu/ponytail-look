# Ponytail, with a look at the page

[DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail)
is a "be lazy" coding skill. One ladder, seven steps. Step 4 says: do not
install a date-picker library. Use `<input type="date">`.

That step is a guess if you only read the source file. This checkout is
the same skill with one extra rule: on a real UI, reading JSX is not
looking. Open the page. Scroll to the end. Then ship the built-in control.
Do not install both skills.

## The one command a person can read

```
npm run try
```

It walks through the date-picker example in English. Shipping from the
file is no. A glance is no. A library is no. The built-in date box is
yes. Then open `examples/date.html` in a browser and tap it.

`examples/overbuilt-picker.jsx` is the usual dump. `examples/date.html`
is what you ship. You do not get the second file by reading the first.

```
npm test
npm run verify
```

Those are for changing the pack. The test names are internals. Skip them
unless you are editing this repo.

MIT. Not a second ladder. Not their measured cost or line-count numbers.
The rule was never fewest tokens. Non-coding requests: do not use.
