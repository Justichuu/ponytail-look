# Date picker example

Ponytail already says a date picker is `<input type="date">`.
Guessing that from a JSX dump is the bug. This folder is the dump, then
the spectacles, then the four-line file you actually ship.

`overbuilt-picker.jsx` is the usual paste: provider, timezone, a picker
library, a second calendar, range "for later". Easy to treat as the
product if you never open the page.

`date.html` is the product. One native control.

You do not get there by reading the JSX. Walk through it:

```
npm run try
```

Then open `date.html` in a browser and tap the box.
