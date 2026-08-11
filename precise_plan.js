function calcPreciseDapt(age, crCl, hb, wbc, priorBleed) {
  // Примерная номограмма (баллы)
  var ptsAge = Math.max(0, Math.min(19, (age - 50) / 40 * 19));
  var ptsCr = Math.max(0, Math.min(25, (100 - crCl) / 100 * 25));
  var ptsHb = Math.max(0, Math.min(15, (12 - hb) / 2 * 15));
  var ptsWbc = Math.max(0, Math.min(15, (wbc - 5) / 15 * 15));
  var ptsBleed = priorBleed ? 26 : 0;
  var total = ptsAge + ptsCr + ptsHb + ptsWbc + ptsBleed;
  return { score: Math.round(total), risk: total >= 25 ? 'high' : total >= 17 ? 'moderate' : 'low' };
}
