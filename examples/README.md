# What we added

Ponytail already folds a date picker to `<input type="date">`.
That fold from JSX is the bug. This folder is the pile, then the look,
then the mate.

`overbuilt-picker.jsx` is the usual dump: provider, timezone, flatpickr,
a second calendar, range "for later". Hard to fold if you treat it as
the product.

`date.html` is the fold. One native control.

You do not get the fold by reading the JSX. Test the gate:

```
npm run try
```

Five questions in English. Shipping from the file is no. A glance is
no. A library is no. The built-in date box is yes. Then open
`date.html` in a browser.
