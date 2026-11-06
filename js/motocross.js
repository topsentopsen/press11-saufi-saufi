/* Motocross-Fahrer: reine Positionsformel, kein Zustand. Vier Fahrer auf der Ovalpiste. */
(function (g) {
  'use strict';
  var Saufi = g.Saufi = g.Saufi || {};
  var K = 16;
  var NUMMERN = [7, 11, 23, 69];
  var FARBEN = ['#ff4fa0', '#4fe6ff', '#ffe066', '#7dff8a'];
  // Basis-ω, Wackelamplitude, Frequenz, Phasenoffset, Spur ρ, Drift
  var PARAM = [
    { w0: 0.630, A: 1.0, g: 0.07, phi: 0.0, start: 1.2, rho: 0.72, drift: 0.005 },
    { w0: 0.632, A: 1.1, g: 0.09, phi: Math.PI / 2, start: 0.8, rho: 0.78, drift: -0.005 },
    { w0: 0.634, A: 1.2, g: 0.11, phi: Math.PI, start: 0.4, rho: 0.84, drift: 0.005 },
    { w0: 0.636, A: 1.3, g: 0.13, phi: Math.PI * 1.5, start: 0, rho: 0.90, drift: -0.005 }
  ];
  var HUEGEL = [{ x: 30, y: 33 }, { x: 36, y: 35 }, { x: 32, y: 42 }];
  var CX = 32.5 * K, CY = 37.5 * K;
  function ursprung() { return ((Saufi.Karte && Saufi.Karte.RAND) || 0) * K; }

  function theta(p, t) {
    return p.start + p.w0 * t + p.A * Math.sin(p.g * t + p.phi);   // Startversatz plus langsames Tempo-Schwanken: Positionen wechseln immer wieder
  }
  function rhoVon(p, t) {
    return p.rho + p.drift * Math.sin(0.37 * t + p.phi);
  }
  function hoeheBei(x, y) {
    var maxH = 0, o = ursprung();
    for (var i = 0; i < HUEGEL.length; i++) {
      var hx = (HUEGEL[i].x + 0.5) * K + o, hy = (HUEGEL[i].y + 0.5) * K + o;
      var d = Math.hypot(x - hx, y - hy);
      if (d < 18) maxH = Math.max(maxH, 5 * (1 - d / 18));
    }
    return maxH;
  }

  function stand(t) {
    t = +t || 0;
    var o = ursprung();
    var raw = PARAM.map(function (p, i) {
      var th = theta(p, t), rho = rhoVon(p, t);
      var x = CX + o + rho * 5.2 * K * Math.cos(th);
      var y = CY + o + rho * 5.8 * K * Math.sin(th);
      // Tangente: Ableitung von θ (nahezu ω0, Wackelanteil klein)
      var dth = p.w0 + p.A * p.g * Math.cos(p.g * t + p.phi);
      var winkel = Math.atan2(rho * 5.8 * K * Math.cos(th) * dth, -rho * 5.2 * K * Math.sin(th) * dth);
      return {
        id: 'mx' + i, nr: NUMMERN[i], x: x, y: y, winkel: winkel, theta: th,
        fortschritt: ((th % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2),
        hoehe: hoeheBei(x, y), farbe: FARBEN[i], omega: p.w0
      };
    });
    var sorted = raw.slice().sort(function (a, b) { return b.theta - a.theta; });
    sorted.forEach(function (b, platz) { b.platz = platz + 1; });
    return raw;
  }

  Saufi.Motocross = { stand: stand, NUMMERN: NUMMERN, PARAM: PARAM };
})(globalThis);
