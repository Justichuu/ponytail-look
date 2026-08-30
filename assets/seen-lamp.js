/* Fail-closed seen lamp. End of page, not first twitch.
   iPhone: window.scroll often stays 0; measure every scroller and
   visualViewport; recheck on touchend. Slack covers chrome and bounce. */
(function () {
  var PHI = (1 + Math.sqrt(5)) / 2;
  var SQRT5 = Math.sqrt(5);
  var TWO = Math.round(Math.pow(PHI, 3) / SQRT5);
  var VIEW_SLACK = Math.round(Math.pow(PHI, 6) / SQRT5);
  var FILTH = Math.floor(Math.pow(PHI, 4));
  var END_SLACK = VIEW_SLACK * FILTH * TWO;
  var DWELL_MS = Math.ceil(PHI * PHI * PHI) * 1000;

  function $(id) { return document.getElementById(id); }

  function canScroll(m) {
    return m.height > m.view + VIEW_SLACK;
  }

  function atBottom(m) {
    if (!canScroll(m)) return true;
    return m.top + m.view >= m.height - END_SLACK;
  }

  function isRoot(el) {
    return el === document.documentElement || el === document.body || el === document.scrollingElement;
  }

  function read(el) {
    var vv = window.visualViewport;
    if (isRoot(el)) {
      return {
        top: window.scrollY || window.pageYOffset || el.scrollTop || 0,
        view: (vv && vv.height) ? vv.height : window.innerHeight,
        height: Math.max(
          el.scrollHeight,
          document.documentElement.scrollHeight,
          document.body ? document.body.scrollHeight : 0
        )
      };
    }
    return { top: el.scrollTop, view: el.clientHeight, height: el.scrollHeight };
  }

  function isScrollBox(el) {
    if (!el || el.nodeType !== 1) return false;
    var st = window.getComputedStyle(el);
    var oy = st.overflowY;
    if (oy !== 'auto' && oy !== 'scroll' && oy !== 'overlay') return false;
    return el.scrollHeight > el.clientHeight + VIEW_SLACK;
  }

  function findScrollers() {
    var out = [];
    function add(el) {
      if (el && out.indexOf(el) < 0) out.push(el);
    }
    add(document.scrollingElement);
    add(document.documentElement);
    add(document.body);
    var named = document.querySelectorAll('main, .wrap, [role="main"], .letter');
    for (var i = 0; i < named.length; i++) add(named[i]);
    var all = document.querySelectorAll('body *');
    for (var j = 0; j < all.length && j < 400; j++) {
      if (isScrollBox(all[j])) add(all[j]);
    }
    return out;
  }

  function endState() {
    var list = findScrollers();
    var scrollable = [];
    for (var i = 0; i < list.length; i++) {
      if (canScroll(read(list[i]))) scrollable.push(list[i]);
    }
    if (!scrollable.length) return { short: true, bottom: true };
    for (var k = 0; k < scrollable.length; k++) {
      if (atBottom(read(scrollable[k]))) return { short: false, bottom: true };
    }
    return { short: false, bottom: false };
  }

  function hashDelayOff() {
    return /delay=off/i.test(String(location.hash || ''));
  }

  function mount() {
    if ($('seen-lamp')) return;
    var box = document.createElement('aside');
    box.id = 'seen-lamp';
    box.className = 'seen-lamp';
    box.setAttribute('role', 'status');
    box.setAttribute('aria-live', 'polite');
    box.innerHTML =
      '<button type="button" id="seen-lamp-btn" class="seen-lamp-btn" aria-pressed="false">' +
        '<span class="seen-lamp-dot" aria-hidden="true"></span>' +
        '<span class="seen-lamp-word">Lamp</span>' +
      '</button>' +
      '<p class="seen-lamp-why" id="seen-lamp-why"></p>' +
      '<label class="seen-lamp-delay"><input type="checkbox" id="seen-lamp-delay-off"> Delay off</label>';
    document.body.appendChild(box);

    var started = Date.now();
    var tapped = false;
    var tappedAt = 0;
    var delayOff = hashDelayOff();
    var delayBox = $('seen-lamp-delay-off');
    if (delayBox) delayBox.checked = delayOff;

    function lit(now) {
      var end = endState();
      var wait = delayOff || (now - started) >= DWELL_MS;
      var hold = delayOff || !tapped || (now - tappedAt) >= DWELL_MS;
      var on = end.bottom && wait && tapped && hold;
      return { on: on, end: end, wait: wait, hold: hold };
    }

    function why(s) {
      if (!s.end.bottom) {
        return 'Not seen. Scroll to the bottom of the page. The lamp waits for the end, not the first twitch.';
      }
      if (!s.wait) return 'At the end. Waiting. Turn delay off if you do not want this pause.';
      if (!tapped) return 'At the end. Tap the lamp. That tap is a second delay unless delay is off.';
      if (!s.hold) return 'Tapped. Holding. This second delay can be turned off.';
      return 'Seen. You reached the bottom and confirmed.';
    }

    function paint() {
      var s = lit(Date.now());
      var btn = $('seen-lamp-btn');
      var text = $('seen-lamp-why');
      box.setAttribute('data-on', s.on ? 'true' : 'false');
      box.setAttribute('data-bottom', s.end.bottom ? 'true' : 'false');
      if (btn) {
        btn.setAttribute('aria-pressed', s.on ? 'true' : 'false');
        btn.setAttribute('aria-label', s.on ? 'Seen' : 'Not seen. ' + why(s));
      }
      if (text) text.textContent = why(s);
    }

    function tap() {
      var s = lit(Date.now());
      if (!s.end.bottom) {
        paint();
        return;
      }
      tapped = true;
      tappedAt = Date.now();
      paint();
    }

    if (delayBox) {
      delayBox.addEventListener('change', function () {
        delayOff = delayBox.checked;
        paint();
      });
    }
    $('seen-lamp-btn').addEventListener('click', tap);

    var nodes = findScrollers();
    function onMove() { paint(); }
    window.addEventListener('scroll', onMove, { passive: true, capture: true });
    document.addEventListener('scroll', onMove, { passive: true, capture: true });
    window.addEventListener('touchend', onMove, { passive: true });
    window.addEventListener('scrollend', onMove);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('scroll', onMove);
      window.visualViewport.addEventListener('resize', onMove);
    }
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].addEventListener('scroll', onMove, { passive: true });
    }
    window.setInterval(paint, 400);
    paint();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
